import React, { useState } from 'react';
import axios from 'axios';

const API_UPLOAD_URL = 'http://localhost:8000/data_cleaning_app/dataframe/';

function FileUploader({ onDataLoaded, onError, setIsLoading, isLoading }) { // Props from HomePage
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        // If a new file is selected, clear any previous error messages in HomePage
        if (onError) onError('');
        // Also, clear any previously loaded data in HomePage if a new file is chosen
        // This could be done by onDataLoaded(null) or a dedicated clearData function
        if (onDataLoaded) onDataLoaded(null);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            if (onError) onError('Please select a file first.');
            return;
        }

        if (setIsLoading) setIsLoading(true);
        if (onError) onError(''); // Clear previous errors before new attempt

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await axios.post(API_UPLOAD_URL, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log('FileUploader: Upload successful, response.data:', response.data);
            if (onDataLoaded) {
                console.log('FileUploader: Calling onDataLoaded with:', response.data);
                onDataLoaded(response.data); // Pass the data up to HomePage
            }
        } catch (err) {
            console.error('FileUploader: Upload error:', err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.error || 'An error occurred during upload. Please check the file and try again.';
            if (onError) onError(errorMessage);
            if (onDataLoaded) onDataLoaded(null); // Clear any potentially stale data on error
        } finally {
            if (setIsLoading) setIsLoading(false);
        }
    };

    return (
        <div>
            {/* The h2 can stay or be moved to HomePage */}
            {/* <h2>Upload XLSX File</h2>  */}
            <input type="file" accept=".xlsx,.csv" onChange={handleFileChange} />
            <button onClick={handleUpload} disabled={isLoading || !selectedFile}>
                {/* Let HomePage handle the main loading text if desired, or keep it simple here */}
                {isLoading ? 'Uploading...' : 'Upload and Process'}
            </button>

            {/*
              The preview table should NOT be rendered here anymore.
              HomePage will render it using DropColumn (which also handles preview)
              once sheetData is set in HomePage's state.
            */}
        </div>
    );
}

export default FileUploader;