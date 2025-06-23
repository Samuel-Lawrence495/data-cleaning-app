// src/components/DropColumn.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// This component now assumes apiBaseUrl will be the endpoint for PUT requests
// to drop a column, e.g., 'http://localhost:8000/data_cleaning_app/dataframe/'
// The backend will expect { column_name: 'some_column' } in the PUT body.

function DropColumn({ initialData, onDataUpdated, onError, apiBaseUrl, isEditMode }) {
    const [data, setData] = useState(initialData);
    const [isLoadingAction, setIsLoadingAction] = useState(false); // For the PUT request loading state

    useEffect(() => {
        console.log("[DropColumn] useEffect - initialData prop received:", initialData);
        setData(initialData);
    }, [initialData]);

    const handleDropColumn = async (columnName) => {
        if (!isEditMode || !data || !apiBaseUrl) {
            console.warn("DropColumn: Drop cancelled - not in edit mode, no data, or no apiBaseUrl.");
            if(onError && !apiBaseUrl) onError("API base URL not configured for dropping columns.");
            return;
        }

        setIsLoadingAction(true);
        if (onError) onError(''); // Clear previous errors

        try {
            console.log(`[DropColumn] Attempting to drop column: "${columnName}" via PUT to ${apiBaseUrl}`);
            const response = await axios.put(
                apiBaseUrl, // The PUT request goes to the base dataframe URL
                { column_name: columnName }, // Backend expects this payload
                { withCredentials: true }
            );
            console.log('[DropColumn] PUT request successful, response.data:', response.data);
            // The local setData is good for immediate UI feedback if the parent update is slow,
            // but onDataUpdated will set the authoritative state in HomePage.
            setData(response.data);
            if (onDataUpdated) {
                onDataUpdated(response.data); // Inform HomePage
            }
        } catch (err) {
            console.error('[DropColumn] PUT request failed. Error object:', err);
            const errorMessage = err.response?.data?.error || `Error dropping column: ${columnName}. Check console.`;
            if (onError) onError(errorMessage);
        } finally {
            setIsLoadingAction(false);
        }
    };

    // Log current state before rendering
    console.log("[DropColumn] Rendering - isEditMode (prop):", isEditMode, "local data state:", data ? {filename: data.filename, headers: data.headers ? data.headers.length : 'no headers', rows: data.rows ? data.rows.length : 'no rows'} : 'no data');

    // Conditional rendering: If no valid data to display a table, show a message or nothing.
    // HomePage should ideally not render this component if sheetData is null.
    // This check is mostly for when sheetData exists but might be empty/invalid.
    if (!data || !data.filename || !data.headers) {
        if (initialData && initialData.filename) { // Means data was loaded but became invalid or empty
            return <p style={{ fontStyle: 'italic', color: '#555', marginTop: '10px' }}>File "{initialData.filename}" has no columns to display or data is unavailable.</p>;
        }
        // If even initialData was bad/null, HomePage shouldn't render this, but as a fallback:
        return null; 
    }

    return (
        <div style={{ marginTop: '10px' }}> {/* Adjusted marginTop from original '20px' if preferred */}
            <h3 style={{ marginBottom: '15px' }}>
                {isEditMode ? 'Editing Columns: ' : 'Data Preview: '}
                {data.filename}
                {/* Display row counts if available in the data object */}
                {(data.preview_rows_shown !== undefined && data.total_rows_in_file !== undefined) && (
                    <small style={{ marginLeft: '10px', fontWeight: 'normal', color: '#555' }}>
                        (Displaying {data.preview_rows_shown} of {data.total_rows_in_file} total rows)
                    </small>
                )}
            </h3>

            {/* The "Edit Data" button is now controlled by HomePage/CleaningToolbar and passes `isEditMode` as a prop */}

            {/* Only render table if there are headers */}
            {data.headers && data.headers.length > 0 ? (
                <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #ddd', borderRadius: '4px', paddingBottom: '10px' }}>
                    <table style={{
                        borderCollapse: 'collapse',
                        minWidth: 'max-content', // Allow table to be wider than container
                        width: '100%', // Make table try to fill container, but minWidth allows overflow
                    }}>
                        <thead>
                            <tr>
                                {data.headers.map((header, index) => (
                                    <th key={`${header}-${index}-${data.filename}`} // More unique key
                                        style={{
                                        paddingTop: isEditMode ? '30px' : '10px',
                                        paddingBottom: '10px',
                                        paddingLeft: '12px',
                                        paddingRight: '12px',
                                        textAlign: 'left',
                                        position: 'relative',
                                        whiteSpace: 'nowrap',
                                        borderBottom: '2px solid #ccc',
                                        backgroundColor: '#f8f9fa',
                                        fontWeight: '600',
                                    }}>
                                        {isEditMode && ( // "X" button uses the isEditMode prop
                                            <button
                                                onClick={() => handleDropColumn(header)}
                                                disabled={isLoadingAction}
                                                title={`Drop column: ${header}`}
                                                style={{
                                                    position: 'absolute', top: '4px', left: '50%',
                                                    transform: 'translateX(-50%)', background: 'rgba(220, 53, 69, 0.8)',
                                                    color: 'white', border: '1px solid rgba(200,0,0,0.7)',
                                                    borderRadius: '50%', width: '22px', height: '22px',
                                                    lineHeight: '20px', cursor: 'pointer', padding: '0',
                                                    fontSize: '14px', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                                    transition: 'background-color 0.2s ease',
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(220,53,69,1)'}
                                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(220,53,69,0.8)'}
                                            >X</button>
                                        )}
                                        <span style={{ display: 'block' }}>{header}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Check if data.rows exists and is an array before mapping */}
                            {data.rows && Array.isArray(data.rows) && data.rows.length > 0 ? (
                                data.rows.map((row, rowIndex) => (
                                    <tr key={`${data.filename}-row-${rowIndex}`} style={{ borderBottom: '1px solid #eee' }}>
                                        {/* Ensure each 'row' is also an array before mapping its cells */}
                                        {Array.isArray(row) ? (
                                            row.map((cell, cellIndex) => (
                                                <td key={`${data.filename}-row-${rowIndex}-cell-${cellIndex}`}
                                                    style={{
                                                    padding: '8px 12px', whiteSpace: 'nowrap',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px',
                                                    borderRight: cellIndex < row.length - 1 ? '1px solid #f0f0f0' : 'none',
                                                }}>
                                                    {/* Handle boolean display explicitly */}
                                                    {typeof cell === 'boolean' ? cell.toString() : (cell === null || cell === undefined ? '' : cell)}
                                                </td>
                                            ))
                                        ) : (
                                            <td colSpan={data.headers.length} style={{color: 'red', padding: '8px 12px'}}>
                                                Error: Row data at index {rowIndex} is not in the expected array format.
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={data.headers.length} style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic', color: '#777' }}>
                                        No data rows to display in this preview.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                // This message is shown if data.filename exists, but data.headers is empty or doesn't exist
                <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
                    File "{data.filename}" has no columns to display.
                    {isEditMode ? " All columns may have been removed." : " It might be an empty file or processed to have no columns."}
                </p>
            )}

            {/* This message might be redundant if the one above covers it */}
            {/* {data.rows && data.rows.length === 0 && data.headers && data.headers.length > 0 && (
                <p style={{ marginTop: '10px' }}>No data rows to display in preview (file might only contain headers).</p>
            )} */}
        </div>
    );
}

export default DropColumn;