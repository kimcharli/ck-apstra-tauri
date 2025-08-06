import React, { useState } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';
import './FileUpload.module.css';

interface FileUploadProps {
  onSheetsLoaded?: (sheets: string[], filePath: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onSheetsLoaded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleFileSelect = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Open file dialog
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Excel Files',
          extensions: ['xlsx']
        }]
      });

      if (!selected || Array.isArray(selected)) {
        setIsLoading(false);
        return;
      }

      const filePath = selected as string;
      setSelectedFile(filePath);

      // Process the Excel file and get sheet names
      const sheets = await invoke<string[]>('upload_excel_file', { filePath });
      
      console.log('Sheets loaded:', sheets);
      
      if (onSheetsLoaded) {
        onSheetsLoaded(sheets, filePath);
      }

    } catch (error) {
      console.error('Failed to process Excel file:', error);
      setError(error as string);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="file-upload">
      <h2>Upload Excel File</h2>
      <div className="upload-zone">
        {selectedFile ? (
          <div>
            <p>Selected: {selectedFile.split('/').pop()}</p>
            <button onClick={handleFileSelect} disabled={isLoading}>
              Select Different File
            </button>
          </div>
        ) : (
          <div>
            <p>Click to select your .xlsx file</p>
            <button onClick={handleFileSelect} disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Browse Files'}
            </button>
          </div>
        )}
        
        {error && (
          <div style={{ color: 'red', marginTop: '1rem' }}>
            <p>Error: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;