import React, { useState } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import FileUploader from '../components/FileUploader';
import DropColumn from '../components/DropColumn';
import DropMissingRowsButton from '../components/DropMissing'; 
import FilterRowsForm from '../components/FilterRowsForm';
import ReplaceMissingValuesForm from '../components/ReplaceMissing';

const API_DATAFRAME_BASE_URL = 'http://localhost:8000/data_cleaning_app/dataframe/';
const API_DOWNLOAD_CSV_URL = `${API_DATAFRAME_BASE_URL}download/csv/`;
const API_DOWNLOAD_XLSX_URL = `${API_DATAFRAME_BASE_URL}download/xlsx/`;

function HomePage() {
    const [sheetData, setSheetData] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); // For upload
    const [isDownloading, setIsDownloading] = useState(false); // For download
    const [isProcessingOperation, setIsProcessingOperation] = useState(false);


    const handleDataLoaded = (data) => {
        console.log("HomePage: handleDataLoaded called with data:", data);
        if (data && data.filename && data.headers && Array.isArray(data.headers)) {
            setSheetData(data);
            setError('');
        } else if (data === null) {
            setSheetData(null);
            setError('');
        } else {
            console.error("HomePage: Invalid data structure received from FileUploader:", data);
            setError('Failed to load data or data format is incorrect from server.');
            setSheetData(null);
        }
    };

    const handleOperationComplete = (updatedData) => {
        console.log("HomePage: Operation complete, received updated data:", updatedData);
        if (updatedData && updatedData.filename && updatedData.headers) {
             setSheetData(updatedData);
             setError('');
        } else {
             console.error("HomePage: Invalid data structure after operation:", updatedData);
             handleError("Received invalid data from server after operation.");
        }
    };

    const handleError = (errorMessage) => {
        console.error("HomePage: handleError called with message:", errorMessage);
        if (errorMessage) {
            setError(errorMessage);
        } else {
            setError('');
        }
    };

    const handleDownloadFile = async (format) => {
         if (!sheetData || !sheetData.filename) {
             handleError("No data available to download. Please upload and process a file first.");
             return;
         }
         setIsDownloading(true);
         handleError('');

         let downloadUrl = '';
         if (format === 'csv') {
             downloadUrl = API_DOWNLOAD_CSV_URL;
         } else if (format === 'xlsx') {
             downloadUrl = API_DOWNLOAD_XLSX_URL;
         } else {
             handleError("Invalid download format specified.");
             setIsDownloading(false);
             return;
         }

         try {
             const response = await axios.get(downloadUrl, {
                 responseType: 'blob',
                 withCredentials: true,
             });

             let downloadFilename = `${sheetData.filename.split('.')[0]}_cleaned.${format}`;
             const contentDisposition = response.headers['content-disposition'];
             if (contentDisposition) {
                 const filenameMatch = contentDisposition.match(/filename="?(.+[^"])"?/i);
                 if (filenameMatch && filenameMatch.length > 1) {
                     downloadFilename = filenameMatch[1];
                 }
             }
             saveAs(response.data, downloadFilename);

         } catch (err) {
             console.error(`HomePage: Error downloading ${format} file from ${downloadUrl}:`, err);
             let errorMessage = `Failed to download ${format} file.`;
             if (err.response && err.response.data) {
                 if (err.response.data instanceof Blob && err.response.data.type.includes('application/json')) {
                     try {
                         const errorJsonText = await err.response.data.text();
                         const errorJson = JSON.parse(errorJsonText);
                         errorMessage = errorJson.error || errorJson.detail || errorMessage;
                     } catch (parseError) { /* ignore */ }
                 } else if (err.response.data.error) {
                     errorMessage = err.response.data.error;
                 } else if (err.response.data.detail) {
                     errorMessage = err.response.data.detail;
                 }
             }
             handleError(errorMessage);
         } finally {
             setIsDownloading(false);
         }
    };

    console.log("HomePage rendering - sheetData:", sheetData, "isLoading:", isLoading, "isDownloading:", isDownloading, "error:", error, "isProcessingOperation:", isProcessingOperation);


    return (
        <div className="homepage-layout" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <header style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1>My Awesome Data Cleaner</h1>
            </header>
            <main>
                <section className="upload-section" style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
                    <h2>1. Upload Your Data File</h2>
                    <FileUploader
                        apiUploadUrl={API_DATAFRAME_BASE_URL}
                        onDataLoaded={handleDataLoaded}
                        onError={handleError}
                        setIsLoading={setIsLoading} // Pass the general setIsLoading
                        isLoading={isLoading}
                    />
                </section>

                {isLoading && <p style={{ color: 'blue', textAlign: 'center' }}>Processing Upload...</p>}
                {isDownloading && <p style={{ color: 'blue', textAlign: 'center' }}>Preparing Download...</p>}
                {isProcessingOperation && <p style={{ color: 'blue', textAlign: 'center' }}>Performing data operation...</p>}
                {error && <p style={{ color: 'red', textAlign: 'center', fontWeight: 'bold' }}>Error: {error}</p>}

                {sheetData && sheetData.filename && (
                    <div className="actions-and-edit-container">
                        <section className="actions-section" style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
                            <h2>2. Actions on Current Data</h2>
                            <div className="download-buttons" style={{ marginBottom: '20px' }}>
                                <h4>Download Cleaned File:</h4>
                                <button onClick={() => handleDownloadFile('csv')} disabled={isDownloading || isLoading || isProcessingOperation} style={{ marginRight: '10px' }}>Download CSV</button>
                                <button onClick={() => handleDownloadFile('xlsx')} disabled={isDownloading || isLoading || isProcessingOperation}>Download XLSX</button>
                            </div>

                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #ccc' }}>
                                <h4>Handle Missing Data:</h4>
                                <DropMissingRowsButton
                                    currentSheetData={sheetData}
                                    onOperationComplete={handleOperationComplete} // Use the generic handler
                                    onError={handleError}
                                    mainIsLoading={isLoading || isDownloading || isProcessingOperation} // Pass a combined loading state
                                />
                                                        {/* New Replace Missing Values Section */}
                        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #ccc' }}>
                            {/* This section itself could be a component later if it gets many forms */}
                            <ReplaceMissingValuesForm
                                columns={sheetData.headers || []}
                                onOperationComplete={handleOperationComplete} // Reusing generic handler
                                onError={handleError}
                                mainIsLoading={isLoading || isDownloading || isProcessingOperation}
                            />
                        </div>
                            </div>
                            {/* Row filtering */}
                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #ccc' }}>
                            <h4>Filter Data:</h4>
                            <FilterRowsForm
                                columns={sheetData.headers || []} // Pass available columns
                                onOperationComplete={handleOperationComplete}
                                onError={handleError}
                                mainIsLoading={isLoading || isDownloading || isProcessingOperation}
                            />
                        </div>
                        </section>

                        {sheetData.headers && sheetData.headers.length > 0 ? (
                            <section className='edit-section' style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                                <h2>Edit Columns</h2>
                                <DropColumn
                                    initialData={sheetData}
                                    onDataUpdated={handleOperationComplete} // Use the generic handler
                                    onError={handleError}
                                    apiBaseUrl={API_DATAFRAME_BASE_URL}
                                />
                            </section>
                        ) : (
                            <p>The uploaded file ("{sheetData.filename}") appears to have no columns to edit.</p>
                        )}
                    </div>
                )}

                {!isLoading && !isDownloading && !isProcessingOperation && !error && !sheetData && (
                    <p style={{ marginTop: '20px', textAlign: 'center', fontStyle: 'italic' }}>
                        Upload a file (.csv or .xlsx) to begin cleaning and downloading.
                    </p>
                )}
            </main>
            <footer style={{ textAlign: 'center', marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <p>© {new Date().getFullYear()} My App</p>
            </footer>
        </div>
    );
}
export default HomePage;