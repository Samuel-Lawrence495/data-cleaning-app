import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import DropColumn from '../components/DropColumn';

function HomePage() {
    const [sheetData, setSheetData] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleDataLoaded = (data) => {
        console.log("HomePage: handleDataLoaded called with data:", data);
        // Explicitly set to null if data is falsy or lacks essential structure
        if (data && data.headers && Array.isArray(data.headers) && data.filename) {
            setSheetData(data);
            setError('');
        } else {
            console.warn("HomePage: Invalid or null data received from FileUploader. Clearing sheetData.");
            setSheetData(null);
            if (data === null && !error) { // If FileUploader explicitly cleared due to new file selection
                // Don't set an error, just clear
            } else if (!error) { // If data is just bad but no explicit error reported yet
                 setError('Failed to load data or data format is incorrect.');
            }
        }
    };

    const handleDataUpdated = (updatedData) => {
        console.log("HomePage: Data updated by DropColumn:", updatedData);
        // Assume updatedData from DropColumn is always in the correct structure if not an error
        setSheetData(updatedData);
    };

    const handleError = (errorMessage) => {
        console.error("HomePage: Error received in handleError:", errorMessage);
        if (errorMessage) { // Only set error if a message is actually provided
            setError(errorMessage);
        } else {
            setError(''); // Explicitly clear the error if errorMessage is empty/falsy
        }
    };

    console.log("HomePage rendering: sheetData:", sheetData, "isLoading:", isLoading, "error:", error);

    return (
        <div className="homepage-layout">
            <header><h1>My Awesome Data Cleaner</h1></header>
            <main>
                <section className="upload-section">
                    <h2>Upload and Preview Your Data</h2>
                    <FileUploader
                        onDataLoaded={handleDataLoaded}
                        onError={handleError}
                        setIsLoading={setIsLoading}
                        isLoading={isLoading}
                    />
                </section>

                {isLoading && <p>Loading/Processing...</p>}
                {error && <p style={{ color: 'red' }}>Error: {error}</p>}

                {/* Conditionally render DropColumn only if sheetData has a filename and headers */}
                {sheetData && sheetData.filename && sheetData.headers ? (
                    <section className='edit-section' style={{ marginTop: '30px' }}>
                        <h2>Edit File</h2>
                        <DropColumn
                            initialData={sheetData}
                            onDataUpdated={handleDataUpdated}
                            onError={handleError}
                        />
                    </section>
                ) : (
                    !isLoading && !error && <p style={{marginTop: '20px'}}>Upload a file to begin editing.</p>
                )}
            </main>
            <footer><p>© 2025 My App</p></footer>
        </div>
    );
}
export default HomePage;