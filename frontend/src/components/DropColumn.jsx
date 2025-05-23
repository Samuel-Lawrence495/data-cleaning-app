import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_DATAFRAME_URL = 'http://localhost:8000/data_cleaning_app/dataframe/';

function DropColumn({ initialData, onDataUpdated, onError }) {
    // Local state for the data being edited/viewed within this component
    const [data, setData] = useState(initialData);
    // Local state for edit mode
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoadingAction, setIsLoadingAction] = useState(false);

    useEffect(() => {
        console.log("DropColumn: initialData prop changed", initialData);
        setData(initialData);
        // When new initialData comes (e.g., after a fresh file upload),
        // should we reset edit mode? For now, let's not, to see if that's the issue.
        // If initialData becomes null (e.g. parent cleared it due to error), then exit edit mode.
        if (!initialData) {
            setIsEditMode(false);
        }
    }, [initialData]);

    const toggleEditMode = () => {
        if (data && data.headers && data.headers.length > 0) {
            setIsEditMode(prevIsEditMode => !prevIsEditMode); // Use functional update
            if (onError) onError(''); // Clear error when toggling edit mode
        } else {
            if (onError) onError("No data with columns available to edit.");
            setIsEditMode(false); // Ensure it's false if no data
        }
        console.log("DropColumn: Toggled edit mode. New state:", !isEditMode);
    };

    const handleDropColumn = async (columnName) => {
        if (!isEditMode || !data || !data.headers) { // Ensure data and headers exist
            console.log("DropColumn: Drop cancelled - not in edit mode or no data/headers.");
            return;
        }
        setIsLoadingAction(true);
        if (onError) onError('');

        console.log(`DropColumn: Attempting to drop column: "${columnName}"`);
        try {
            const response = await axios.put(API_DATAFRAME_URL,
                { column_name: columnName },
                { withCredentials: true }
            );
            console.log('DropColumn: PUT request successful, response.data:', response.data);

            // Update local data state FIRST
            setData(response.data);

            // Then inform parent
            if (onDataUpdated) {
                onDataUpdated(response.data);
            }

            // Logic to exit edit mode ONLY if all columns are gone
            if (response.data && response.data.headers && response.data.headers.length === 0) {
                console.log('DropColumn: All columns dropped, setting isEditMode to false.');
                setIsEditMode(false);
            } else {
                console.log('DropColumn: Columns remain, staying in edit mode.');
            }

        } catch (err) {
            console.error('DropColumn: PUT request failed. Error object:', err);
            if (err.response) {
                console.error('DropColumn: Backend response data:', err.response.data);
            }
            const errorMessage = err.response?.data?.error || `Error dropping column: ${columnName}. Check console.`;
            if (onError) onError(errorMessage);
        } finally {
            setIsLoadingAction(false);
        }
    };

    // Log current state before rendering
    console.log("DropColumn rendering: isEditMode:", isEditMode, "data:", data ? {filename: data.filename, headers: data.headers ? data.headers.length : 'no headers'} : 'no data');


    // Conditional rendering if no valid data is available to display as a table
    if (!data || !data.filename || !data.headers ) { // Check for filename and headers
        // If initialData was passed as null from HomePage, this will trigger.
        // Or if data was cleared.
        // This should NOT trigger if data is valid but just has 0 rows or 0 columns *after an operation*.
        // The table rendering logic below handles 0 columns/rows if data.filename still exists.
        if (initialData && initialData.filename) { // If there was an initial file, but now it's bad
             return <p>Error with data state. Try re-uploading.</p>;
        }
        return null; 
    }


    return (
        <div style={{ marginTop: '20px' }}>
            <h3>
                {isEditMode ? 'Editing: ' : 'Preview: '}
                {data.filename}
                {data.total_rows_in_file !== undefined && data.preview_rows_shown !== undefined && (
                    <small style={{ marginLeft: '10px' }}>
                        (Displaying {data.preview_rows_shown} of {data.total_rows_in_file} total rows)
                    </small>
                )}
            </h3>

            {/* Edit Data Button - only show if there are headers */}
            {data.headers && data.headers.length > 0 && (
                 <button onClick={toggleEditMode} disabled={isLoadingAction} style={{ marginBottom: '10px' }}>
                    {isEditMode ? 'Cancel Edit / View Mode' : 'Edit Data'}
                </button>
            )}

            {/* Only render table if headers exist, otherwise show message */}
            {data.headers && data.headers.length > 0 ? (
                <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #eee', paddingBottom: '10px' }}>
                    <table style={{ borderCollapse: 'collapse', minWidth: 'max-content' }}>
                        <thead>
                            <tr>
                                {data.headers.map((header, index) => (
                                    <th key={`${header}-${index}`} // More unique key
                                        style={{
                                        paddingTop: isEditMode ? '30px' : '10px',
                                        paddingBottom: '10px', paddingLeft: '12px', paddingRight: '12px',
                                        textAlign: 'left', position: 'relative', whiteSpace: 'nowrap',
                                        borderBottom: '2px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold',
                                    }}>
                                        {isEditMode && (
                                            <button
                                                onClick={() => handleDropColumn(header)}
                                                disabled={isLoadingAction}
                                                title={`Drop column: ${header}`}
                                                style={{ /* ... your X button styles ... */
                                                    position: 'absolute', top: '4px', left: '50%',
                                                    transform: 'translateX(-50%)', background: 'rgba(255,0,0,0.7)',
                                                    color: 'white', border: '1px solid rgba(200,0,0,0.8)',
                                                    borderRadius: '50%', width: '22px', height: '22px',
                                                    lineHeight: '20px', cursor: 'pointer', padding: '0',
                                                    fontSize: '14px', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                                    transition: 'background-color 0.2s ease',
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,0,0,1)'}
                                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,0,0,0.7)'}
                                            >X</button>
                                        )}
                                        <span style={{ display: 'block' }}>{header}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows && data.rows.map((row, rowIndex) => ( // Add check for data.rows
                                <tr key={rowIndex} style={{ borderBottom: '1px solid #eee' }}>
                                    {row.map((cell, cellIndex) => (
                                        <td key={`${rowIndex}-${cellIndex}`} // More unique key
                                            style={{
                                            padding: '8px 12px', whiteSpace: 'nowrap',
                                            overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px',
                                        }}>
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p style={{ marginTop: '10px' }}>No columns to display. {isEditMode ? 'All columns may have been removed.' : 'Upload a file with data.'}</p>
            )}

            {data.rows && data.rows.length === 0 && data.headers && data.headers.length > 0 && (
                <p style={{ marginTop: '10px' }}>No data rows to display in preview (file might only contain headers).</p>
            )}
        </div>
    );
}
export default DropColumn;