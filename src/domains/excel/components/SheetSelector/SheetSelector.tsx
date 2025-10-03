import React from 'react';
import './SheetSelector.module.css';

interface SheetSelectorProps {
  sheets?: string[];
  filePath?: string;
  onSheetSelect?: (sheetName: string) => void;
  selectedSheet?: string;
}

const SheetSelector: React.FC<SheetSelectorProps> = ({ 
  sheets, 
  onSheetSelect,
  selectedSheet 
}) => {
  const handleSheetClick = (sheetName: string) => {
    if (onSheetSelect) {
      onSheetSelect(sheetName);
    }
  };

  return (
    <div className="sheet-selector">
      {!sheets || sheets.length === 0 ? (
        <div className="sheet-list">
          <p>Upload a file to see available sheets</p>
        </div>
      ) : (
        <div className="sheet-list">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {sheets.map((sheetName) => (
              <button
                key={sheetName}
                onClick={() => handleSheetClick(sheetName)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: selectedSheet === sheetName ? '#007bff' : 'white',
                  color: selectedSheet === sheetName ? 'white' : 'black',
                  cursor: 'pointer'
                }}
              >
                {sheetName}
              </button>
            ))}
          </div>
          {selectedSheet && (
            <p style={{ marginTop: '1rem', color: 'green' }}>
              Selected: {selectedSheet}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SheetSelector;