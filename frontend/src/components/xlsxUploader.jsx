import React, { useState } from 'react';
import axios from 'axios'; 

// Django API endpoint
const API_UPLOAD_URL = 'http://localhost:8000/data_cleaning_app/upload-xlsx/'; 

function XLSXUploader() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [sheetData, setSheetData] = useState(null); // To store { headers: [], rows: [] }
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setSheetData(null); // Reset previous data
        setError('');
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Please select a file first.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSheetData(null);

        const formData = new FormData();
        formData.append('file', selectedFile); // 'file' must match the key Django expects

        try {
            const response = await axios.post(API_UPLOAD_URL, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log('Upload successful:', response.data);
            setSheetData({
                headers: response.data.headers,
                rows: response.data.rows,
                filename: response.data.filename
            });
        } catch (err) {
            console.error('Upload error:', err.response ? err.response.data : err.message);
            setError(err.response?.data?.error || 'An error occurred during upload.');
            setSheetData(null);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h2>Upload XLSX File</h2>
            <input type="file" accept=".xlsx" onChange={handleFileChange} />
            <button onClick={handleUpload} disabled={isLoading || !selectedFile}>
                {isLoading ? 'Uploading...' : 'Upload and View Preview'}
            </button>

            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            {sheetData && (
                <div style={{ marginTop: '20px' }}>
                    <h3>Preview: {sheetData.filename}</h3>
                    <table border="1" style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                            <tr>
                                {sheetData.headers.map((header, index) => (
                                    <th key={index} style={{ padding: '8px', textAlign: 'left' }}>{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sheetData.rows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {row.map((cell, cellIndex) => (
                                        <td key={cellIndex} style={{ padding: '8px' }}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sheetData.rows.length === 0 && <p>No data rows to display in preview (or file might be empty).</p>}
                </div>
            )}
        </div>
    );
}

export default XLSXUploader;