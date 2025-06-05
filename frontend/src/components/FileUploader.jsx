import React, { useState } from 'react';
import axios from 'axios';

const API_UPLOAD_URL = 'http://localhost:8000/data_cleaning_app/dataframe/';

function FileUploader({ onDataLoaded, onError, setIsLoading, isLoading }) { // Props from HomePage
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        if (onError) onError('');
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
                withCredentials: true,
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
            {/* <h2>Upload XLSX File</h2>  */}
            <input type="file" accept=".xlsx,.csv" onChange={handleFileChange} />
            <button onClick={handleUpload} disabled={isLoading || !selectedFile}>
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