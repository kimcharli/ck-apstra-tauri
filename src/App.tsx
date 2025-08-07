import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { ConversionMap, ApstraConfig } from './types';
import ConversionMapManager from './components/ConversionMapManager/ConversionMapManager';
import ApstraConfigManager from './components/ApstraConfigManager/ApstraConfigManager';
import ProvisioningPage from './components/ProvisioningPage/ProvisioningPage';
import ToolsPage from './components/ToolsPage/ToolsPage';
import { AuthProvider } from './contexts/AuthContext';
import { useAuthStatus } from './hooks/useAuthStatus';
import { logger } from './services/LoggingService';
import './App.css';

// Main App Content Component (inside AuthProvider)
function AppContent() {
  const { isAuthenticated } = useAuthStatus();
  
  // Configuration states
  const [conversionMap, setConversionMap] = useState<ConversionMap | null>(null);
  const [apstraConfig, setApstraConfig] = useState<ApstraConfig | null>(null);
  
  // UI state management
  const [showConversionManager, setShowConversionManager] = useState(false);
  const [showApstraConfigManager, setShowApstraConfigManager] = useState(false);
  const [showProvisioningPage, setShowProvisioningPage] = useState(false);
  const [showToolsPage, setShowToolsPage] = useState(false);
  
  // Connection status state
  const [isConnectionAlive, setIsConnectionAlive] = useState<boolean | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Initialize logging
  useEffect(() => {
    logger.logInfo('SYSTEM', 'Application started', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    // Log app configuration on load
    return () => {
      logger.logInfo('SYSTEM', 'Application closing');
    };
  }, []);

  const testTauriConnection = async () => {
    if (isTestingConnection) return;
    
    logger.logButtonClick('Tauri Connection Test', 'App Header', { currentStatus: isConnectionAlive });
    setIsTestingConnection(true);
    try {
      await invoke<string>('greet', { name: 'Connection Test' });
      setIsConnectionAlive(true);
      logger.logInfo('SYSTEM', 'Main app Tauri connection test successful');
    } catch (error: any) {
      console.error('Tauri connection test failed:', error);
      setIsConnectionAlive(false);
      logger.logError('SYSTEM', 'Main app Tauri connection test failed', { error: error.toString() });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleConversionMapChange = (newMap: ConversionMap) => {
    const oldMap = conversionMap;
    setConversionMap(newMap);
    logger.logDataChange('ConversionMap', 'updated', oldMap, newMap);
    logger.logInfo('DATA_CHANGE', 'Conversion map updated in main app', { 
      mappingCount: Object.keys(newMap.mappings || {}).length,
      headerRow: newMap.header_row 
    });
    console.log('App: Conversion map updated:', newMap);
  };

  const handleApstraConfigChange = (newConfig: ApstraConfig) => {
    const oldConfig = apstraConfig;
    setApstraConfig(newConfig);
    logger.logDataChange('ApstraConfig', 'updated', oldConfig ? { ...oldConfig, password: '[REDACTED]' } : null, { ...newConfig, password: '[REDACTED]' });
    logger.logInfo('DATA_CHANGE', 'Apstra config updated in main app', { 
      host: newConfig.host,
      port: newConfig.port,
      blueprint: newConfig.blueprint_name 
    });
    console.log('App: Apstra config updated:', newConfig);
  };

  const handleNavigation = (page: 'home' | 'apstra-connection' | 'conversion-map' | 'provisioning' | 'tools') => {
    const currentPage = showApstraConfigManager ? 'apstra-connection' 
      : showConversionManager ? 'conversion-map'
      : showProvisioningPage ? 'provisioning'
      : showToolsPage ? 'tools'
      : 'home';
      
    logger.logNavigation(currentPage, page, 'main_navigation');
    logger.logWorkflowStep('Main Navigation', 0, `Navigate to ${page}`, { from: currentPage, to: page });
    
    // Close all pages
    setShowConversionManager(false);
    setShowApstraConfigManager(false);
    setShowProvisioningPage(false);
    setShowToolsPage(false);

    // Open the requested page
    switch (page) {
      case 'apstra-connection':
        setShowApstraConfigManager(true);
        logger.logWorkflowStart('Apstra Connection Configuration', { timestamp: new Date().toISOString() });
        break;
      case 'conversion-map':
        setShowConversionManager(true);
        logger.logWorkflowStart('Conversion Map Management', { timestamp: new Date().toISOString() });
        break;
      case 'provisioning':
        setShowProvisioningPage(true);
        logger.logWorkflowStart('Network Provisioning', { 
          timestamp: new Date().toISOString(),
          hasConversionMap: !!conversionMap,
          hasApstraConfig: !!apstraConfig
        });
        break;
      case 'tools':
        setShowToolsPage(true);
        logger.logWorkflowStart('Apstra Tools', { timestamp: new Date().toISOString() });
        break;
      case 'home':
        logger.logWorkflowStart('Dashboard View', { timestamp: new Date().toISOString() });
        // All pages already closed above
        break;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Apstra Provisioning Tool</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={() => {
                logger.logButtonClick('1. Apstra Connection', 'Main Header');
                setShowApstraConfigManager(true);
                logger.logWorkflowStart('Apstra Connection Configuration', { trigger: 'header_button' });
              }}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: isAuthenticated ? '#28a745' : '#dc3545',
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                animation: isAuthenticated ? 'none' : 'uncomfortable-pulse 2s infinite',
                transition: 'all 0.3s ease'
              }}
            >
              1. Apstra Connection
            </button>
            <button 
              onClick={() => {
                logger.logButtonClick('2. Conversion Map', 'Main Header');
                setShowConversionManager(true);
                logger.logWorkflowStart('Conversion Map Management', { trigger: 'header_button' });
              }}
              style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              2. Conversion Map
            </button>
            <button 
              onClick={() => {
                logger.logButtonClick('3. Provisioning', 'Main Header');
                setShowProvisioningPage(true);
                logger.logWorkflowStart('Network Provisioning', { trigger: 'header_button', hasConversionMap: !!conversionMap, hasApstraConfig: !!apstraConfig });
              }}
              style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
              3. Provisioning
            </button>
            <button 
              onClick={() => {
                logger.logButtonClick('4. Tools', 'Main Header');
                setShowToolsPage(true);
                logger.logWorkflowStart('Apstra Tools', { trigger: 'header_button' });
              }}
              style={{ padding: '10px 20px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
              4. Tools
            </button>
            
            {/* Tauri Connection Status Button */}
            <button
              onClick={testTauriConnection}
              disabled={isTestingConnection}
              title={isConnectionAlive === null ? 'Test Tauri Connection' : isConnectionAlive ? 'Tauri Connected' : 'Tauri Disconnected'}
              className={isConnectionAlive === true ? 'connection-alive' : isTestingConnection ? 'connection-testing' : ''}
              style={{
                padding: '8px',
                border: 'none',
                borderRadius: '50%',
                cursor: isTestingConnection ? 'not-allowed' : 'pointer',
                backgroundColor: isTestingConnection ? '#ffc107' : isConnectionAlive === null ? '#6c757d' : isConnectionAlive ? '#28a745' : '#dc3545',
                color: 'white',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                transition: 'all 0.3s',
                boxShadow: isConnectionAlive === true ? '0 0 10px rgba(40, 167, 69, 0.5)' : isConnectionAlive === false ? '0 0 10px rgba(220, 53, 69, 0.5)' : 'none'
              }}
            >
              {isTestingConnection ? '⟳' : isConnectionAlive === null ? '?' : isConnectionAlive ? '●' : '●'}
            </button>
          </div>
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
              onClick={() => {
                logger.logButtonClick('Apstra Connection Card', 'Main Dashboard');
                setShowApstraConfigManager(true);
                logger.logWorkflowStart('Apstra Connection Configuration', { trigger: 'dashboard_card' });
              }}
              style={{ 
                backgroundColor: 'white', 
                padding: '20px', 
                borderRadius: '8px', 
                border: `2px solid ${isAuthenticated ? '#28a745' : '#dc3545'}`, 
                minWidth: '200px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                animation: isAuthenticated ? 'none' : 'uncomfortable-pulse 2s infinite'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isAuthenticated ? '#f8fff9' : '#fff8f8';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              <h3 style={{ color: isAuthenticated ? '#28a745' : '#dc3545', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                1. Apstra Connection
                <span style={{ fontSize: '1.2rem' }}>→</span>
              </h3>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>Set up connection to your Apstra controller and blueprint</p>
            </div>
            <div 
              onClick={() => {
                logger.logButtonClick('Conversion Map Card', 'Main Dashboard');
                setShowConversionManager(true);
                logger.logWorkflowStart('Conversion Map Management', { trigger: 'dashboard_card' });
              }}
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
              onClick={() => {
                logger.logButtonClick('Provisioning Card', 'Main Dashboard');
                setShowProvisioningPage(true);
                logger.logWorkflowStart('Network Provisioning', { trigger: 'dashboard_card', hasConversionMap: !!conversionMap, hasApstraConfig: !!apstraConfig });
              }}
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
            <div 
              onClick={() => {
                logger.logButtonClick('Tools Card', 'Main Dashboard');
                setShowToolsPage(true);
                logger.logWorkflowStart('Apstra Tools', { trigger: 'dashboard_card' });
              }}
              style={{ 
                backgroundColor: 'white', 
                padding: '20px', 
                borderRadius: '8px', 
                border: '2px solid #6f42c1', 
                minWidth: '200px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fdfbff';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              <h3 style={{ color: '#6f42c1', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                4. Tools
                <span style={{ fontSize: '1.2rem' }}>→</span>
              </h3>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>Search systems, IP addresses, and manage blueprints</p>
            </div>
          </div>
        </section>
      </main>
      
      <ConversionMapManager
        isVisible={showConversionManager}
        onClose={() => setShowConversionManager(false)}
        onNavigate={handleNavigation}
        onConversionMapChange={handleConversionMapChange}
      />
      
      <ApstraConfigManager
        isVisible={showApstraConfigManager}
        onClose={() => setShowApstraConfigManager(false)}
        onNavigate={handleNavigation}
        onConfigChange={handleApstraConfigChange}
        currentConfig={apstraConfig}
      />
      
      <ProvisioningPage
        isVisible={showProvisioningPage}
        onClose={() => setShowProvisioningPage(false)}
        onNavigate={handleNavigation}
        conversionMap={conversionMap}
        apstraConfig={apstraConfig}
      />
      
      <ToolsPage
        isVisible={showToolsPage}
        onClose={() => setShowToolsPage(false)}
        onNavigate={handleNavigation}
      />
      </div>
  );
}

// Main App Component
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;