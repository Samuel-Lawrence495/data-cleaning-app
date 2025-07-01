// src/pages/HomePage.jsx
import React, { useState } from 'react';
import axios from 'axios'; // Keep for direct API calls if any from HomePage
import { saveAs } from 'file-saver';

import FileUploader from '../components/FileUploader';
import DropColumn from '../components/DropColumn'; // This will now be mainly for table display
import CleaningToolbar from '../components/CleaningToolbar'; // Import the new toolbar

// API URLs - these might be passed to the toolbar or used in handlers here
const API_DATAFRAME_BASE_URL = 'http://localhost:8000/data_cleaning_app/dataframe/';
const API_DOWNLOAD_CSV_URL = `${API_DATAFRAME_BASE_URL}download/csv/`;
const API_DOWNLOAD_XLSX_URL = `${API_DATAFRAME_BASE_URL}download/xlsx/`;
// URLs for operations - individual components might manage these, or HomePage can
// const API_DROP_MISSING_URL = `${API_DATAFRAME_BASE_URL}ops/drop-missing-rows/`;
// const API_FILTER_ROWS_URL = `${API_DATAFRAME_BASE_URL}ops/filter-rows/`;
// const API_REPLACE_MISSING_URL = `${API_DATAFRAME_BASE_URL}ops/replace-missing/`;


function HomePage() {
    const [sheetData, setSheetData] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);         // For upload
    const [isDownloading, setIsDownloading] = useState(false); // For download
    const [isProcessingOperation, setIsProcessingOperation] = useState(false); // For other ops
    const [isTableInEditMode, setIsTableInEditMode] = useState(false); // For DropColumn's X buttons

    const handleDataLoaded = (data) => {
        // ... (same as before)
         console.log("HomePage: handleDataLoaded called with data:", data);
         if (data && data.filename && data.headers && Array.isArray(data.headers)) {
             setSheetData(data);
             setError('');
             setIsTableInEditMode(false); // Reset table edit mode on new data
         } else if (data === null) {
             setSheetData(null);
             setError('');
             setIsTableInEditMode(false);
         } else {
             console.error("HomePage: Invalid data structure received from FileUploader:", data);
             setError('Failed to load data or data format is incorrect from server.');
             setSheetData(null);
             setIsTableInEditMode(false);
         }
    };

    const handleOperationComplete = (updatedData) => { // Generic handler for operations
        console.log("HomePage: Operation complete, received updated data:", updatedData);
        if (updatedData && updatedData.filename && updatedData.headers) {
             setSheetData(updatedData);
             setError('');
             // Decide if table edit mode should be affected by other operations
             // For now, let's keep it as is unless all columns are gone.
             if (updatedData.headers.length === 0) {
                 setIsTableInEditMode(false);
             }
        } else {
             console.error("HomePage: Invalid data structure after operation:", updatedData);
             handleError("Received invalid data from server after operation.");
        }
    };

    const handleError = (errorMessage) => {
        // ... (same as before)
         console.error("HomePage: handleError called with message:", errorMessage);
         if (errorMessage) {
             setError(errorMessage);
         } else {
             setError('');
         }
    };

    const handleDownloadFile = async (format) => {
         if (!sheetData || !sheetData.filename) {
             handleError("No data available to download.");
             return;
         }
         setIsDownloading(true);
         handleError('');
         let downloadUrl = format === 'csv' ? API_DOWNLOAD_CSV_URL : API_DOWNLOAD_XLSX_URL;
         try {
             const response = await axios.get(downloadUrl, {
                 responseType: 'blob',
                 withCredentials: true,
             });
             let downloadFilename = `${sheetData.filename.split('.')[0]}_cleaned.${format}`;
             const contentDisposition = response.headers['content-disposition'];
             if (contentDisposition) { /* ... extract filename ... */
                 const filenameMatch = contentDisposition.match(/filename="?(.+[^"])"?/i);
                 if (filenameMatch && filenameMatch.length > 1) downloadFilename = filenameMatch[1];
             }
             saveAs(response.data, downloadFilename);
         } catch (err) { /* ... error handling ... */
             handleError(`Failed to download ${format} file.`);
         } finally {
             setIsDownloading(false);
         }
    };

    const toggleTableEditMode = () => {
         if (!sheetData || !sheetData.headers || sheetData.headers.length === 0) {
             handleError("No columns to edit.");
             setIsTableInEditMode(false);
             return;
         }
        setIsTableInEditMode(prev => !prev);
    };

    // Combined loading state for disabling toolbar buttons during any major background task
    const mainIsLoading = isLoading || isDownloading || isProcessingOperation;

    return (
        <div className="homepage-layout" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <header style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h1>My Awesome Data Cleaner</h1>
            </header>
            <main>
                <section className="upload-section" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
                    <FileUploader
                        apiUploadUrl={API_DATAFRAME_BASE_URL}
                        onDataLoaded={handleDataLoaded}
                        onError={handleError}
                        setIsLoading={setIsLoading} // FileUploader controls its own upload loading
                        isLoading={isLoading}
                    />
                </section>

                {/* Loading/Error messages can be more central if needed */}
                {isLoading && <p style={{ color: 'blue', textAlign: 'center' }}>Processing Upload...</p>}
                {isDownloading && <p style={{ color: 'blue', textAlign: 'center' }}>Preparing Download...</p>}
                {isProcessingOperation && <p style={{ color: 'blue', textAlign: 'center' }}>Performing Data Operation...</p>}
                {error && <p style={{ color: 'red', textAlign: 'center', fontWeight: 'bold' }}>Error: {error}</p>}


                {/* Cleaning Toolbar - appears once data is available */}
                {sheetData && sheetData.filename && (
                    <CleaningToolbar
                        sheetData={sheetData} // Pass full sheetData or just parts needed (e.g. headers)
                        // Pass handler functions for each action type
                        // These handlers in HomePage will make the API calls
                        // OR individual components like DropMissingRowsButton make their own calls
                        // and just use onOperationComplete. The latter is often cleaner.
                        onDownloadFile={handleDownloadFile}
                        onOperationComplete={handleOperationComplete} // For components that do their own API calls
                        onError={handleError}
                        mainIsLoading={mainIsLoading} // To disable buttons during any operation
                        onToggleTableEditMode={toggleTableEditMode}
                        isTableInEditMode={isTableInEditMode}
                    />
                )}

                {/* Data Display Area */}
                {sheetData && sheetData.filename && sheetData.headers ? (
                    <section className='data-display-section' style={{ marginTop: '20px' }}>
                        {/* DropColumn now primarily displays the table and handles 'X' based on isTableInEditMode */}
                        <DropColumn
                            initialData={sheetData}
                            onDataUpdated={handleOperationComplete} // When a column is dropped
                            onError={handleError}
                            apiBaseUrl={API_DATAFRAME_BASE_URL} // For its own drop column PUT request
                            isEditMode={isTableInEditMode} // Controlled by HomePage now
                        />
                    </section>
                ) : (
                    !mainIsLoading && !error && !sheetData &&
                    <p style={{ marginTop: '20px', textAlign: 'center', fontStyle: 'italic' }}>
                        Upload a file to view and clean data.
                    </p>
                )}
            </main>
            <footer style={{ textAlign: 'center', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <p>© {new Date().getFullYear()} My App</p>
            </footer>
        </div>
    );
}
export default HomePage;