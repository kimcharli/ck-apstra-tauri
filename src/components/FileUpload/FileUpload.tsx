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

      // Process the Excel file and get sheet names  
      const sheets = await invoke<string[]>('upload_excel_file', { filePath });
      
      if (onSheetsLoaded) {
        onSheetsLoaded(sheets, filePath);
      }

    } catch (error) {
      console.error('FileUpload failed:', error);
      setError(error as string);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="file-upload-compact">
      <button onClick={handleFileSelect} disabled={isLoading} className="file-select-btn">
        {isLoading ? 'Processing...' : 'Choose File'}
      </button>
      
      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;