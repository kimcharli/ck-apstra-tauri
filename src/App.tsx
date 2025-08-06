import React from 'react';
import FileUpload from './components/FileUpload/FileUpload';
import SheetSelector from './components/SheetSelector/SheetSelector';
import DataTable from './components/DataTable/DataTable';
import ActionPanel from './components/ActionPanel/ActionPanel';
import ProgressTracker from './components/ProgressTracker/ProgressTracker';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Apstra Network Configuration Tool</h1>
      </header>
      
      <main className="app-main">
        <section className="upload-section">
          <FileUpload />
        </section>
        
        <section className="sheet-selector-section">
          <SheetSelector />
        </section>
        
        <section className="data-section">
          <DataTable />
        </section>
        
        <section className="action-section">
          <ActionPanel />
        </section>
        
        <section className="progress-section">
          <ProgressTracker />
        </section>
      </main>
    </div>
  );
}

export default App;