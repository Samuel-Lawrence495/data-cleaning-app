import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_DATAFRAME_URL = 'http://localhost:8000/data_cleaning_app/dataframe/';

function DropColumn({ initialData, onDataUpdated, onError }) {
    const [data, setData] = useState(initialData);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoadingAction, setIsLoadingAction] = useState(false);

    useEffect(() => {
        setData(initialData); // Sync with prop changes
    }, [initialData]);

    const toggleEditMode = () => {
        if (data && data.headers && data.headers.length > 0) {
            setIsEditMode(!isEditMode);
        } else {
            if (onError) onError("No data to edit.");
        }
    };

    const handleDropColumn = async (columnName) => {
        if (!isEditMode || !data) return;
        setIsLoadingAction(true);
        if (onError) onError('');

        try {
            const response = await axios.put(API_DATAFRAME_URL,
                { column_name: columnName },
                { withCredentials: true } 
            );
            setData(response.data); // Update local state
            if (onDataUpdated) onDataUpdated(response.data); // Inform parent
            if (response.data.headers.length === 0) setIsEditMode(false);
        } catch (err) {
            if (onError) onError(err.response?.data?.error || `Error dropping column: ${columnName}.`);
        } finally {
            setIsLoadingAction(false);
        }
    };

    // Conditional rendering if no data is available
    if (!data || !data.headers || data.headers.length === 0 && !isEditMode) {
        if (!data || !data.filename) { // A stronger check for truly no data
             return <p>No data loaded to edit or view. Please upload a file first.</p>;
        }
        // If there's a filename, but no headers (e.g., empty file or all columns dropped)
        return (
            <div style={{ marginTop: '20px' }}>
                <h3>
                    {isEditMode ? 'Editing: ' : 'Preview: '}
                    {data.filename}
                </h3>
                {data.headers && data.headers.length === 0 && <p>All columns have been removed or the file is empty.</p>}
                {/* Still show edit button if filename exists, to potentially re-fetch or show message */}
                {data.filename && (
                     <button onClick={toggleEditMode} disabled={isLoadingAction} style={{ marginBottom: '10px' }}>
                        {isEditMode ? 'Cancel Edit / View Mode' : 'Edit Data (No Columns)'}
                    </button>
                )}
            </div>
        );
    }

    // Main return JSX for when data is present
    return (
        <div style={{ marginTop: '20px' }}>
            <h3>
                {isEditMode ? 'Editing: ' : 'Preview: '}
                {data.filename}
                <small style={{ marginLeft: '10px' }}>
                    (Displaying {data.preview_rows_shown || data.rows?.length || 0} of {data.total_rows_in_file || data.rows?.length || 0} total rows)
                </small>
            </h3>

            {/* Edit Data Button */}
            {data.headers && data.headers.length > 0 && (
                 <button onClick={toggleEditMode} disabled={isLoadingAction} style={{ marginBottom: '10px' }}>
                    {isEditMode ? 'Cancel Edit / View Mode' : 'Edit Data'}
                </button>
            )}

            {/* This is the scrollable wrapper div */}
            <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #eee', paddingBottom: '10px' /* Space for scrollbar */ }}>
                <table style={{
                    borderCollapse: 'collapse',
                    minWidth: 'max-content', // Allow table to be wider than container
                }}>
                    <thead>
                        <tr>
                            {data.headers.map((header, index) => (
                                <th key={index} style={{
                                    paddingTop: isEditMode ? '30px' : '10px', // e.g., 30px top padding in edit mode
                                    paddingBottom: '10px',
                                    paddingLeft: '12px',
                                    paddingRight: '12px',
                                    textAlign: 'left',
                                    position: 'relative', // For positioning the 'X' button
                                    whiteSpace: 'nowrap', // Prevent header text from wrapping
                                    borderBottom: '2px solid #ddd',
                                    backgroundColor: '#f9f9f9',
                                    fontWeight: 'bold',
                                }}>
                                    {isEditMode && (
                                        <button
                                            onClick={() => handleDropColumn(header)}
                                            disabled={isLoadingAction}
                                            title={`Drop column: ${header}`}
                                            style={{
                                                position: 'absolute',
                                                top: '12px', // Adjusted for better visual placement
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                background: 'rgba(255, 0, 0, 0.7)', // Slightly transparent red
                                                color: 'white',
                                                border: '1px solid rgba(200,0,0,0.8)',
                                                borderRadius: '50%',
                                                width: '22px', // Slightly larger
                                                height: '22px',
                                                lineHeight: '20px', // Adjust for 'X' centering
                                                cursor: 'pointer',
                                                padding: '0',
                                                fontSize: '14px', // Slightly larger 'X'
                                                zIndex: 10, // Ensure it's above other elements
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                                transition: 'background-color 0.2s ease',
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,0,0,1)'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,0,0,0.7)'}
                                        >
                                            X
                                        </button>
                                    )}
                                    <span style={{ display: 'block', paddingTop: isEditMode ? '15px' : '0' }}> {/* Increased paddingTop if X is visible */}
                                        {header}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} style={{ borderBottom: '1px solid #eee' }}>
                                {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} style={{
                                        padding: '8px 12px', 
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',   
                                        textOverflow: 'ellipsis',
                                        maxWidth: '300px', 
                                    }}>
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Conditional Messages */}
            {data.rows && data.rows.length === 0 && data.headers && data.headers.length > 0 && (
                <p style={{ marginTop: '10px' }}>No data rows to display in preview (file might only contain headers).</p>
            )}
        </div>
    );
}
export default DropColumn;