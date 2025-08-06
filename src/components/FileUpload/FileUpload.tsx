import React from 'react';
import './FileUpload.module.css';

const FileUpload: React.FC = () => {
  return (
    <div className="file-upload">
      <h2>Upload Excel File</h2>
      <div className="upload-zone">
        <p>Drag and drop your .xlsx file here or click to browse</p>
        <input type="file" accept=".xlsx" />
      </div>
    </div>
  );
};

export default FileUpload;