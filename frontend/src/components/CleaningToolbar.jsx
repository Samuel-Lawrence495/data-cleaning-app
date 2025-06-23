import React, { useState } from 'react';
import DropMissingRowsButton from './DropMissing'; // Assuming this is now just a button
import FilterRowsForm from './FilterRowsForm'; // Your existing filter form
import ReplaceMissingValuesForm from './ReplaceMissing'; // Your existing impute form

// You'll pass API URLs or handler functions from HomePage
// For simplicity, let's assume HomePage handles the API calls via callbacks

function CleaningToolbar({
    sheetData,
    onDropMissingRows, // Callback from HomePage: async (strategy) => { ... }
    onFilterRows,      // Callback from HomePage: async (filterPayload) => { ... }
    onReplaceMissing,  // Callback from HomePage: async (imputePayload) => { ... }
    onDownloadFile,    // Callback from HomePage: async (format) => { ... }
    onToggleTableEditMode, // Callback to toggle 'X' buttons on table: () => void
    isTableInEditMode,     // Prop to show current edit state of table
    mainIsLoading,       // Combined loading state from HomePage
    onError,             // Central error handler from HomePage
    onOperationComplete, // Central data update handler from HomePage
}) {
    const [showFilterForm, setShowFilterForm] = useState(false);
    const [showImputeForm, setShowImputeForm] = useState(false);

    const handleFilterSubmit = async (filterPayload) => {
        if (onFilterRows) { // Assuming onFilterRows is the actual API call handler from HomePage
            await onFilterRows(filterPayload); // It should call onOperationComplete internally
        }
        setShowFilterForm(false); // Close form after submission
    };

    const handleImputeSubmit = async (imputePayload) => {
        if (onReplaceMissing) {
            await onReplaceMissing(imputePayload);
        }
        setShowImputeForm(false);
    };


    if (!sheetData || !sheetData.filename) {
        return <div style={toolbarStyle.container}><p>Upload a file to enable cleaning options.</p></div>;
    }

    return (
        <div style={toolbarStyle.container}>
            <div style={toolbarStyle.group}>
                <span style={toolbarStyle.groupLabel}>File:</span>
                <button onClick={() => onDownloadFile('csv')} disabled={mainIsLoading} style={toolbarStyle.button}>Download CSV</button>
                <button onClick={() => onDownloadFile('xlsx')} disabled={mainIsLoading} style={toolbarStyle.button}>Download XLSX</button>
            </div>

            <div style={toolbarStyle.group}>
                <span style={toolbarStyle.groupLabel}>Edit Table:</span>
                {sheetData.headers && sheetData.headers.length > 0 && (
                     <button onClick={onToggleTableEditMode} disabled={mainIsLoading} style={toolbarStyle.button}>
                        {isTableInEditMode ? 'View Mode (Hide X)' : 'Edit Columns (Show X)'}
                    </button>
                )}
            </div>


            <div style={toolbarStyle.group}>
                <span style={toolbarStyle.groupLabel}>Missing Values:</span>
                {/* Using the DropMissingRowsButton component as an example of how it might be integrated */}
                <DropMissingRowsButton // This component already has its own API call logic
                    currentSheetData={sheetData}
                    onOperationComplete={onOperationComplete} // HomePage's handler
                    onError={onError}
                    mainIsLoading={mainIsLoading}
                />
                <button onClick={() => setShowImputeForm(!showImputeForm)} disabled={mainIsLoading} style={toolbarStyle.button}>
                    {showImputeForm ? 'Hide Impute Form' : 'Impute Missing'}
                </button>
            </div>

            <div style={toolbarStyle.group}>
                <span style={toolbarStyle.groupLabel}>Filter:</span>
                <button onClick={() => setShowFilterForm(!showFilterForm)} disabled={mainIsLoading} style={toolbarStyle.button}>
                    {showFilterForm ? 'Hide Filter Form' : 'Filter Rows'}
                </button>
            </div>

            {/* Conditionally rendered forms */}
            {showImputeForm && (
                <div style={toolbarStyle.formContainer}>
                    <ReplaceMissingValuesForm
                        columns={sheetData.headers || []}
                        onOperationComplete={onOperationComplete} // Pass HomePage's handler
                        onError={onError}
                        mainIsLoading={mainIsLoading}
                    />
                </div>
            )}

            {showFilterForm && (
                <div style={toolbarStyle.formContainer}>
                    <FilterRowsForm
                        columns={sheetData.headers || []}
                        onOperationComplete={onOperationComplete} // Pass HomePage's handler
                        onError={onError}
                        mainIsLoading={mainIsLoading}
                    />
                </div>
            )}
            {/* Add more groups and buttons for other operations */}
        </div>
    );
}

// Basic styles for the toolbar
const toolbarStyle = {
    container: {
        display: 'flex',
        flexWrap: 'wrap', // Allow items to wrap to next line
        alignItems: 'flex-start', // Align items at the start of each line
        gap: '20px', // Space between groups
        padding: '15px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        marginBottom: '20px',
        backgroundColor: '#f9f9f9',
    },
    group: {
        display: 'flex',
        flexDirection: 'column', // Stack label and buttons vertically
        alignItems: 'flex-start', // Align buttons to the left
        gap: '8px', // Space between items in a group
    },
    groupLabel: {
        fontWeight: 'bold',
        marginBottom: '5px',
        fontSize: '0.9em',
    },
    button: {
        padding: '8px 12px',
        cursor: 'pointer',
        border: '1px solid #ddd',
        backgroundColor: 'white',
        borderRadius: '4px',
    },
    formContainer: {
        width: '100%', // Make forms take full width if they appear
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px dashed #eee',
    }
};

export default CleaningToolbar;