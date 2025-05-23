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
            if (onError) onError(err.response?.data?.error || 'Error dropping column.');
        } finally {
            setIsLoadingAction(false);
        }
    };

    if (!data || !data.headers) { 
        return <p>No data loaded to edit or view.</p>;
    }

    return (
        <div style={{ marginTop: '20px' }}>
            <h3>
                {isEditMode ? 'Editing: ' : 'Preview: '}
                {data.filename}
                <small style={{ marginLeft: '10px' }}>
                    (Displaying {data.preview_rows_shown} of {data.total_rows_in_file} total rows)
                </small>
            </h3>
            {data.headers && data.headers.length > 0 && (
                 <button onClick={toggleEditMode} disabled={isLoadingAction} style={{ marginBottom: '10px' }}>
                    {isEditMode ? 'Cancel Edit / View Mode' : 'Edit Data'}
                </button>
            )}
             <table border="1" style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                <thead>
                    <tr>
                        {data.headers.map((header, index) => (
                            <th key={index} style={{ padding: '8px', textAlign: 'left', position: 'relative' }}>
                                {isEditMode && (
                                    <button
                                        onClick={() => handleDropColumn(header)}
                                        disabled={isLoadingAction}
                                        title={`Drop column: ${header}`}
                                        style={{
                                            position: 'absolute', top: '-15px', left: '50%',
                                            transform: 'translateX(-50%)', background: 'red', color: 'white',
                                            border: 'none', borderRadius: '50%', width: '20px', height: '20px',
                                            lineHeight: '18px', cursor: 'pointer', padding: '0', fontSize: '12px', zIndex: 1,
                                        }}
                                    >X</button>
                                )}
                                <span style={{ display: 'block', paddingTop: isEditMode ? '10px' : '0' }}>{header}</span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <td key={cellIndex} style={{ padding: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.rows.length === 0 && data.headers.length > 0 && <p>No data rows to display in preview.</p>}
            {data.headers.length === 0 && <p>All columns have been removed or the file is empty.</p>}
        </div>
    );
}
export default DropColumn;