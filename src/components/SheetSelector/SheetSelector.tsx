import React from 'react';
import './SheetSelector.module.css';

const SheetSelector: React.FC = () => {
  return (
    <div className="sheet-selector">
      <h2>Select Sheet</h2>
      <div className="sheet-list">
        <p>Upload a file to see available sheets</p>
      </div>
    </div>
  );
};

export default SheetSelector;