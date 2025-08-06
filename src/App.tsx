import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { NetworkConfigRow, ConversionMap } from './types';
import FileUpload from './components/FileUpload/FileUpload';
import SheetSelector from './components/SheetSelector/SheetSelector';
import DataTable from './components/DataTable/DataTable';
import ActionPanel from './components/ActionPanel/ActionPanel';
import ProgressTracker from './components/ProgressTracker/ProgressTracker';
import ConversionMapManager from './components/ConversionMapManager/ConversionMapManager';

function App() {
  const [greetMsg, setGreetMsg] = useState('');
  const [name, setName] = useState('');
  
  // Excel processing state
  const [sheets, setSheets] = useState<string[]>([]);
  const [filePath, setFilePath] = useState<string>('');
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [tableData, setTableData] = useState<NetworkConfigRow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Conversion map state
  const [conversionMap, setConversionMap] = useState<ConversionMap | null>(null);
  const [showConversionManager, setShowConversionManager] = useState(false);

  async function greet() {
    try {
      const message = await invoke('greet', { name });
      setGreetMsg(message);
    } catch (error) {
      console.error('Failed to greet:', error);
      setGreetMsg('Failed to connect to Rust backend');
    }
  }

  const handleSheetsLoaded = (loadedSheets: string[], loadedFilePath: string) => {
    setSheets(loadedSheets);
    setFilePath(loadedFilePath);
    setSelectedSheet(''); // Reset sheet selection
    setTableData([]); // Clear previous data
    console.log('App: Sheets loaded:', loadedSheets);
  };

  const handleSheetSelect = async (sheetName: string) => {
    setSelectedSheet(sheetName);
    setIsLoadingData(true);
    
    try {
      console.log('App: Parsing sheet:', sheetName, 'from file:', filePath);
      console.log('App: Using conversion map:', conversionMap);
      const parsedData = await invoke<NetworkConfigRow[]>('parse_excel_sheet', { 
        filePath, 
        sheetName,
        conversionMap: conversionMap 
      });
      
      console.log('App: Parsed data rows:', parsedData?.length || 0);
      console.log('App: First few rows:', parsedData?.slice(0, 3));
      setTableData(parsedData || []);
    } catch (error) {
      console.error('Failed to parse sheet data:', error);
      setTableData([]);
      // You could add error state handling here
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleConversionMapChange = (newMap: ConversionMap) => {
    setConversionMap(newMap);
    // Reparse current sheet if one is selected
    if (selectedSheet && filePath) {
      handleSheetSelect(selectedSheet);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Apstra Network Configuration Tool</h1>
          <button 
            onClick={() => setShowConversionManager(true)}
            style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Manage Conversion Map
          </button>
        </div>
        
        {/* Tauri Connection Test */}
        <div className="connection-test" style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <h3>Tauri Connection Test</h3>
          <div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              style={{ marginRight: '0.5rem', padding: '0.25rem' }}
            />
            <button onClick={greet} style={{ padding: '0.25rem 0.5rem' }}>
              Test Backend Connection
            </button>
          </div>
          {greetMsg && <p style={{ marginTop: '0.5rem', color: greetMsg.includes('Failed') ? 'red' : 'green' }}>{greetMsg}</p>}
        </div>
      </header>
      
      <main className="app-main">
        <section className="upload-section">
          <FileUpload onSheetsLoaded={handleSheetsLoaded} />
        </section>
        
        <section className="sheet-selector-section">
          <SheetSelector 
            sheets={sheets}
            filePath={filePath}
            selectedSheet={selectedSheet}
            onSheetSelect={handleSheetSelect}
          />
        </section>
        
        <section className="data-section">
          <DataTable data={tableData} isLoading={isLoadingData} />
        </section>
        
        <section className="action-section">
          <ActionPanel />
        </section>
        
        <section className="progress-section">
          <ProgressTracker />
        </section>
      </main>
      
      <ConversionMapManager
        isVisible={showConversionManager}
        onClose={() => setShowConversionManager(false)}
        onConversionMapChange={handleConversionMapChange}
      />
    </div>
  );
}

export default App;