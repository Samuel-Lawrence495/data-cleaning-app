// src/pages/HomePage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import FileUploader from '../components/FileUploader';
import DropColumn from '../components/DropColumn';

const API_DATAFRAME_BASE_URL = 'http://localhost:8000/data_cleaning_app/dataframe/';
// Specific URLs for download
const API_DOWNLOAD_CSV_URL = 'http://localhost:8000/data_cleaning_app/dataframe/download/csv/';
const API_DOWNLOAD_XLSX_URL = 'http://localhost:8000/data_cleaning_app/dataframe/download/xlsx/';


function HomePage() {
    const [sheetData, setSheetData] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

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

    const handleDataUpdated = (updatedData) => {
        console.log("HomePage: Data updated by DropColumn:", updatedData);
        setSheetData(updatedData);
        setError('');
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

        console.log(`HomePage: Requesting download from URL: ${downloadUrl}`);

        try {
            const response = await axios.get(downloadUrl, { // No query parameters needed here
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
            console.log(`HomePage: Attempting to save file as: ${downloadFilename}`);
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

    // The JSX for download buttons remains the same as it calls handleDownloadFile('csv') or handleDownloadFile('xlsx')
    return (
        <div className="homepage-layout" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <header style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1>My Awesome Data Cleaner</h1>
            </header>
            <main>
                <section className="upload-section" style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
                    <h2>1. Upload Your Data File</h2>
                    <FileUploader
                        // Pass the base URL for uploads
                        apiUploadUrl={API_DATAFRAME_BASE_URL} // Assuming FileUploader needs this
                        onDataLoaded={handleDataLoaded}
                        onError={handleError}
                        setIsLoading={setIsLoading}
                        isLoading={isLoading}
                    />
                </section>

                {isLoading && <p style={{ color: 'blue', textAlign: 'center' }}>Processing Upload...</p>}
                {isDownloading && <p style={{ color: 'blue', textAlign: 'center' }}>Preparing Download...</p>}
                {error && <p style={{ color: 'red', textAlign: 'center', fontWeight: 'bold' }}>Error: {error}</p>}

                {sheetData && sheetData.filename && (
                    <div className="actions-and-edit-container">
                        <section className="actions-section" style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
                            <h2>2. Actions on Current Data</h2>
                            <div className="download-buttons" style={{ marginBottom: '20px' }}>
                                <h4>Download Cleaned File:</h4>
                                <button
                                    onClick={() => handleDownloadFile('csv')}
                                    disabled={isDownloading || isLoading}
                                    style={{ marginRight: '10px', padding: '10px 15px', cursor: 'pointer' }}
                                >
                                    {isDownloading ? 'Downloading CSV...' : 'Download as CSV'}
                                </button>
                                <button
                                    onClick={() => handleDownloadFile('xlsx')}
                                    disabled={isDownloading || isLoading}
                                    style={{ padding: '10px 15px', cursor: 'pointer' }}
                                >
                                    {isDownloading ? 'Downloading XLSX...' : 'Download as XLSX'}
                                </button>
                            </div>

                            {sheetData.headers && sheetData.headers.length > 0 ? (
                                <DropColumn
                                    initialData={sheetData}
                                    onDataUpdated={handleDataUpdated}
                                    onError={handleError}
                                    // Pass the base URL for edits if DropColumn needs it
                                    apiBaseUrl={API_DATAFRAME_BASE_URL}
                                />
                            ) : (
                                <p>The uploaded file ("{sheetData.filename}") appears to have no columns to edit.</p>
                            )}
                        </section>
                    </div>
                )}

                {!isLoading && !isDownloading && !error && !sheetData && (
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