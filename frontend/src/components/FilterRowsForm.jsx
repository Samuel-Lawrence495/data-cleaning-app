import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_FILTER_ROWS_URL = 'http://localhost:8000/data_cleaning_app/dataframe/ops/filter-rows/';

function FilterRowsForm({ columns, onOperationComplete, onError, mainIsLoading }) {
    const [selectedColumn, setSelectedColumn] = useState('');
    const [operator, setOperator] = useState('=='); // Default operator
    const [filterValue, setFilterValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Populate column dropdown when columns prop changes
    useEffect(() => {
        if (columns && columns.length > 0) {
            setSelectedColumn(columns[0]); // Default to first column
        } else {
            setSelectedColumn('');
        }
    }, [columns]);

    const operators = [
        { value: '==', label: 'Equals (==)' },
        { value: '!=', label: 'Not Equals (!=)' },
        { value: '>', label: 'Greater Than (>)' },
        { value: '>=', label: 'Greater Than or Equals (>=)' },
        { value: '<', label: 'Less Than (<)' },
        { value: '<=', label: 'Less Than or Equals (<=)' },
        { value: 'contains', label: 'Contains (text)' },
        { value: 'not_contains', label: 'Does Not Contain (text)' },
        // Add more operators: 'isin', 'isnull', 'notnull', etc.
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedColumn || !operator || filterValue.trim() === '') { // filterValue can be "0"
            if (onError) onError("Please select a column, operator, and enter a value to filter by.");
            return;
        }

        setIsProcessing(true);
        if (onError) onError('');

        try {
            console.log("FilterRowsForm: Applying filter:", { selectedColumn, operator, filterValue });
            const response = await axios.post(
                API_FILTER_ROWS_URL,
                {
                    column_name: selectedColumn,
                    operator: operator,
                    value: filterValue,
                },
                { withCredentials: true }
            );
            console.log("FilterRowsForm: Filter operation successful", response.data);
            if (onOperationComplete) {
                onOperationComplete(response.data);
            }
        } catch (err) {
            console.error("FilterRowsForm: Error during filter operation:", err);
            const errorMessage = err.response?.data?.error || "Failed to apply filter.";
            if (onError) onError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!columns || columns.length === 0) {
        return <p>No columns available to filter.</p>;
    }

    return (
        <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', marginTop:'10px' }}>
            <h4>Filter Rows</h4>
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="filter-column" style={{ marginRight: '5px' }}>Column:</label>
                <select
                    id="filter-column"
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    disabled={mainIsLoading || isProcessing}
                >
                    {columns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="filter-operator" style={{ marginRight: '5px' }}>Operator:</label>
                <select
                    id="filter-operator"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    disabled={mainIsLoading || isProcessing}
                >
                    {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="filter-value" style={{ marginRight: '5px' }}>Value:</label>
                <input
                    type="text" // Keep as text for now; backend handles conversion
                    id="filter-value"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="Enter filter value"
                    disabled={mainIsLoading || isProcessing}
                />
            </div>
            <button type="submit" disabled={mainIsLoading || isProcessing}>
                {isProcessing ? 'Filtering...' : 'Apply Filter'}
            </button>
        </form>
    );
}

export default FilterRowsForm;