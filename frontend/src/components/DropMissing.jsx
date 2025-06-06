import React, { useState } from 'react';
import axios from 'axios';

const API_DROP_MISSING_URL = 'http://localhost:8000/data_cleaning_app/dataframe/ops/drop-missing-rows/';

function DropMissingRowsButton({ currentSheetData, onOperationComplete, onError, mainIsLoading }) {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAction = async () => {
        if (!currentSheetData || !currentSheetData.filename) {
            if (onError) onError("No data loaded to perform this operation.");
            return;
        }

        setIsProcessing(true);
        if (onError) onError(''); // Clear previous errors

        try {
            console.log("DropMissingRowsButton: Calling drop missing rows endpoint.");
            const response = await axios.post(
                API_DROP_MISSING_URL,
                {}, // Empty body for this specific "drop any missing" operation
                { withCredentials: true }
            );

            console.log("DropMissingRowsButton: Operation successful", response.data);
            if (onOperationComplete) {
                onOperationComplete(response.data); // Pass the updated sheetData back to parent
            }
        } catch (err) {
            console.error("DropMissingRowsButton: Error during operation:", err);
            let errorMessage = "Failed to drop missing rows.";
            if (err.response && err.response.data) {
                if (err.response.data.error) errorMessage = err.response.data.error;
                else if (err.response.data.detail) errorMessage = err.response.data.detail;
            }
            if (onError) onError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    // Disable button if there's no data, or if a main page action or this action is in progress
    const isDisabled = !currentSheetData || !currentSheetData.filename || mainIsLoading || isProcessing;

    return (
        <button
            onClick={handleAction}
            disabled={isDisabled}
            style={{ padding: '8px 12px', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
            title={!currentSheetData || !currentSheetData.filename ? "Upload a file first" : "Remove rows that contain any missing values"}
        >
            {isProcessing ? 'Processing...' : 'Drop Rows with Any Missing Values'}
        </button>
    );
}

export default DropMissingRowsButton;