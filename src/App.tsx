import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { ConversionMap, ApstraConfig } from './types';
import ConversionMapManager from './components/ConversionMapManager/ConversionMapManager';
import ApstraConfigManager from './components/ApstraConfigManager/ApstraConfigManager';
import ProvisioningPage from './components/ProvisioningPage/ProvisioningPage';

function App() {
  const [greetMsg, setGreetMsg] = useState('');
  const [name, setName] = useState('');
  
  // Configuration states
  const [conversionMap, setConversionMap] = useState<ConversionMap | null>(null);
  const [apstraConfig, setApstraConfig] = useState<ApstraConfig | null>(null);
  
  // UI state management
  const [showConversionManager, setShowConversionManager] = useState(false);
  const [showApstraConfigManager, setShowApstraConfigManager] = useState(false);
  const [showProvisioningPage, setShowProvisioningPage] = useState(false);

  async function greet() {
    try {
      const message = await invoke<string>('greet', { name });
      setGreetMsg(message);
    } catch (error) {
      console.error('Failed to greet:', error);
      setGreetMsg('Failed to connect to Rust backend');
    }
  }

  const handleConversionMapChange = (newMap: ConversionMap) => {
    setConversionMap(newMap);
    console.log('App: Conversion map updated:', newMap);
  };

  const handleApstraConfigChange = (newConfig: ApstraConfig) => {
    setApstraConfig(newConfig);
    console.log('App: Apstra config updated:', newConfig);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Apstra Provisioning Tool</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setShowApstraConfigManager(true)}
              style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              1. Apstra Connection
            </button>
            <button 
              onClick={() => setShowConversionManager(true)}
              style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              2. Conversion Map
            </button>
            <button 
              onClick={() => setShowProvisioningPage(true)}
              style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
              3. Provisioning
            </button>
          </div>
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
        <section className="welcome-section" style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8f9fa', borderRadius: '12px', margin: '20px 0' }}>
          <h2 style={{ color: '#333', marginBottom: '20px' }}>Welcome to Apstra Provisioning Tool</h2>
          <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '30px', lineHeight: '1.6' }}>
            Streamline your network provisioning workflow with intelligent Excel processing and automated Apstra integration.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div 
              onClick={() => setShowApstraConfigManager(true)}
              style={{ 
                backgroundColor: 'white', 
                padding: '20px', 
                borderRadius: '8px', 
                border: '2px solid #28a745', 
                minWidth: '200px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fff9';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              <h3 style={{ color: '#28a745', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                1. Apstra Connection
                <span style={{ fontSize: '1.2rem' }}>→</span>
              </h3>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>Set up connection to your Apstra controller and blueprint</p>
            </div>
            <div 
              onClick={() => setShowConversionManager(true)}
              style={{ 
                backgroundColor: 'white', 
                padding: '20px', 
                borderRadius: '8px', 
                border: '2px solid #007bff', 
                minWidth: '200px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fbff';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              <h3 style={{ color: '#007bff', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                2. Conversion Map
                <span style={{ fontSize: '1.2rem' }}>→</span>
              </h3>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>Customize Excel header mapping for accurate data processing</p>
            </div>
            <div 
              onClick={() => setShowProvisioningPage(true)}
              style={{ 
                backgroundColor: 'white', 
                padding: '20px', 
                borderRadius: '8px', 
                border: '2px solid #dc3545', 
                minWidth: '200px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fffbfb';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              <h3 style={{ color: '#dc3545', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                3. Provision
                <span style={{ fontSize: '1.2rem' }}>→</span>
              </h3>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>Upload Excel files, map data, and provision network configurations</p>
            </div>
          </div>
        </section>
      </main>
      
      <ConversionMapManager
        isVisible={showConversionManager}
        onClose={() => setShowConversionManager(false)}
        onConversionMapChange={handleConversionMapChange}
      />
      
      <ApstraConfigManager
        isVisible={showApstraConfigManager}
        onClose={() => setShowApstraConfigManager(false)}
        onConfigChange={handleApstraConfigChange}
        currentConfig={apstraConfig}
      />
      
      <ProvisioningPage
        isVisible={showProvisioningPage}
        onClose={() => setShowProvisioningPage(false)}
        conversionMap={conversionMap}
        apstraConfig={apstraConfig}
      />
    </div>
  );
}

export default App;