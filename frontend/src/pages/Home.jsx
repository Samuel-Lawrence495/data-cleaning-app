import React, { useState } from 'react';
import FileUploader from '../components/FileUploader'; 
import DropColumn from '../components/DropColumn';

function HomePage() {
    // State to hold the loaded sheet data
    const [sheetData, setSheetData] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Callback for FileUploader to pass up the loaded data
    const handleDataLoaded = (data) => {
        console.log("HomePage: Data loaded", data);
        setSheetData(data);
        setError(''); // Clear any previous errors
    };

    // Callback for DropColumn to pass up the updated data
    const handleDataUpdated = (updatedData) => {
        console.log("HomePage: Data updated", updatedData);
        setSheetData(updatedData);
    };

    // Callback for handling errors from child components
    const handleError = (errorMessage) => {
        console.error("HomePage: Error received", errorMessage);
        setError(errorMessage);
        setSheetData(null); // Clear data on error
    };

    return (
        <div className="homepage-layout">
            <header>
                <h1>My Awesome Data Cleaner</h1>
            </header>
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

                {/* Display loading or error messages */}
                {isLoading && <p>Loading/Processing...</p>}
                {error && <p style={{ color: 'red' }}>Error: {error}</p>}

                {/* Conditionally render DropColumn only if sheetData exists */}
                {sheetData && (
                    <section className='edit-section' style={{ marginTop: '30px' }}> {/* Corrected classname to className */}
                        <h2>Edit File</h2>
                        <DropColumn
                            initialData={sheetData}
                            onDataUpdated={handleDataUpdated}
                            onError={handleError}
                        />
                    </section>
                )}
            </main>
            <footer>
                <p>© 2025 My App</p> {/* Updated year, just for fun :) */}
            </footer>
        </div>
    );
}

export default HomePage;