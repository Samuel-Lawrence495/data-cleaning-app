import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_ENCODE_URL = 'http://localhost:8000/data_cleaning_app/dataframe/ops/encode/';

function EncodingForm({ columns, onOperationComplete, onError, mainIsLoading }) {
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [encodingStrategy, setEncodingStrategy] = useState('label'); // Default strategy
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset selected columns if the available columns change
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
            if (onError) onError("Please select at least one column to encode.");
            return;
        }

        setIsProcessing(true);
        if (onError) onError('');

        const payload = {
            encoding_strategy: encodingStrategy,
            columns_to_encode: selectedColumns,
        };

        try {
            console.log("EncodingForm: Applying encoding:", payload);
            const response = await axios.post(API_ENCODE_URL, payload, { withCredentials: true });
            console.log("EncodingForm: Operation successful", response.data);
            if (onOperationComplete) {
                onOperationComplete(response.data);
            }
        } catch (err) {
            console.error("EncodingForm: Error during operation:", err);
            const errorMessage = err.response?.data?.error || "Failed to encode columns.";
            if (onError) onError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!columns || columns.length === 0) {
        return <p>No columns available to encode.</p>;
    }

    return (
        <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', marginTop:'10px' }}>
            <h4>Encode Categorical Columns</h4>
            <div style={{ marginBottom: '10px' }}>
                <p>Select columns to apply encoding to:</p>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', padding: '5px' }}>
                    {columns.map(col => (
                        <div key={col}>
                            <input
                                type="checkbox"
                                id={`col-check-encode-${col}`}
                                value={col}
                                checked={selectedColumns.includes(col)}
                                onChange={() => handleColumnToggle(col)}
                                disabled={mainIsLoading || isProcessing}
                            />
                            <label htmlFor={`col-check-encode-${col}`} style={{ marginLeft: '5px' }}>{col}</label>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <p>Choose encoding strategy:</p>
                <div>
                    <input
                        type="radio"
                        id="label-encoding"
                        name="encoding-strategy"
                        value="label"
                        checked={encodingStrategy === 'label'}
                        onChange={(e) => setEncodingStrategy(e.target.value)}
                        disabled={mainIsLoading || isProcessing}
                    />
                    <label htmlFor="label-encoding" style={{ marginLeft: '5px' }}>Label Encoding (converts categories to numbers, e.g., 0, 1, 2...)</label>
                </div>
                <div>
                    <input
                        type="radio"
                        id="one-hot-encoding"
                        name="encoding-strategy"
                        value="one-hot"
                        checked={encodingStrategy === 'one-hot'}
                        onChange={(e) => setEncodingStrategy(e.target.value)}
                        disabled={mainIsLoading || isProcessing}
                    />
                    <label htmlFor="one-hot-encoding" style={{ marginLeft: '5px' }}>One-Hot Encoding (creates new binary [0/1] columns for each category)</label>
                </div>
            </div>

            <button type="submit" disabled={mainIsLoading || isProcessing || selectedColumns.length === 0}>
                {isProcessing ? 'Encoding...' : 'Apply Encoding'}
            </button>
        </form>
    );
}

export default EncodingForm;