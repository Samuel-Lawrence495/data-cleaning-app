import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_REPLACE_MISSING_URL = 'http://localhost:8000/data_cleaning_app/dataframe/ops/replace-missing-rows/';

function ReplaceMissingValuesForm({ columns, onOperationComplete, onError, mainIsLoading }) {
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [fillStrategy] = useState('mean'); // For now, only 'mean' is implemented on backend
    // const [fillConstantValue, setFillConstantValue] = useState(''); // For 'constant' strategy later
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset selected columns if the available columns change (e.g., after a column drop)
    useEffect(() => {
        setSelectedColumns([]);
    }, [columns]);

    const handleColumnToggle = (columnName) => {
        setSelectedColumns(prevSelected =>
            prevSelected.includes(columnName)
                ? prevSelected.filter(col => col !== columnName)
                : [...prevSelected, columnName]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedColumns.length === 0) {
            if (onError) onError("Please select at least one column to fill missing values.");
            return;
        }
        if (!fillStrategy) { // Should not happen with current setup but good for future
            if (onError) onError("Please select a fill strategy.");
            return;
        }

        setIsProcessing(true);
        if (onError) onError('');

        const payload = {
            fill_strategy: fillStrategy,
            columns_to_fill: selectedColumns,
        };

        // if (fillStrategy === 'constant') {
        //     payload.fill_value = fillConstantValue;
        // }

        try {
            console.log("ReplaceMissingValuesForm: Applying replace missing:", payload);
            const response = await axios.post(API_REPLACE_MISSING_URL, payload, { withCredentials: true });
            console.log("ReplaceMissingValuesForm: Operation successful", response.data);
            if (onOperationComplete) {
                onOperationComplete(response.data);
            }
        } catch (err) {
            console.error("ReplaceMissingValuesForm: Error during operation:", err);
            const errorMessage = err.response?.data?.error || "Failed to replace missing values.";
            if (onError) onError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!columns || columns.length === 0) {
        return <p>No columns available to process missing values.</p>;
    }

    return (
        <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', marginTop: '10px' }}>
            <h4>Replace Missing Values</h4>
            <div style={{ marginBottom: '10px' }}>
                <p>Select columns to fill NaNs using their respective means (for numeric columns):</p>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', padding: '5px' }}>
                    {columns.map(col => (
                        <div key={col}>
                            <input
                                type="checkbox"
                                id={`col-check-${col}`}
                                value={col}
                                checked={selectedColumns.includes(col)}
                                onChange={() => handleColumnToggle(col)}
                                disabled={mainIsLoading || isProcessing}
                            />
                            <label htmlFor={`col-check-${col}`} style={{ marginLeft: '5px' }}>{col}</label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Strategy selection - currently hardcoded to 'mean' as only one implemented
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="fill-strategy" style={{ marginRight: '5px' }}>Strategy:</label>
                <select id="fill-strategy" value={fillStrategy} onChange={(e) => setFillStrategy(e.target.value)} disabled>
                    <option value="mean">Mean</option>
                    // <option value="median">Median</option>
                    // <option value="mode">Mode</option>
                    // <option value="constant">Constant Value</option>
                </select>
            </div>
            {fillStrategy === 'constant' && (
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="fill-constant-value" style={{ marginRight: '5px' }}>Fill Value:</label>
                    <input
                        type="text"
                        id="fill-constant-value"
                        value={fillConstantValue}
                        onChange={(e) => setFillConstantValue(e.target.value)}
                        disabled={mainIsLoading || isProcessing}
                    />
                </div>
            )}
            */}
            <button type="submit" disabled={mainIsLoading || isProcessing || selectedColumns.length === 0}>
                {isProcessing ? 'Applying...' : 'Apply Mean Imputation'}
            </button>
        </form>
    );
}

export default ReplaceMissingValuesForm;