import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { ApstraConfig } from './types';
import { EnhancedConversionMap } from './services/EnhancedConversionService';
import EnhancedConversionMapManager from './components/ConversionMapManager/EnhancedConversionMapManager';
import ApstraConfigManager from './components/ApstraConfigManager/ApstraConfigManager';
import ProvisioningPage from './components/ProvisioningPage/ProvisioningPage';
import ToolsPage from './components/ToolsPage/ToolsPage';
import { AuthProvider } from './contexts/AuthContext';
import { useAuthStatus } from './hooks/useAuthStatus';
import { logger } from './services/LoggingService';
import { NAVIGATION_ITEMS, getNavigationStyles, getDashboardCardStyles, getHoverStyles } from './config/navigation';
import './App.css';

// Main App Content Component (inside AuthProvider)
function AppContent() {
  const { isAuthenticated } = useAuthStatus();
  
  // Configuration states
  const [conversionMap, setConversionMap] = useState<EnhancedConversionMap | null>(null);
  const [apstraConfig, setApstraConfig] = useState<ApstraConfig | null>(null);
  
  // UI state management - Start with Apstra Connection page open
  const [showConversionManager, setShowConversionManager] = useState(false);
  const [showApstraConfigManager, setShowApstraConfigManager] = useState(true);
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
      url: window.location.href,
      startupPage: 'apstra-connection'
    });
    
    // Log that we're starting with Apstra Connection page
    logger.logWorkflowStart('Apstra Connection Configuration', { 
      trigger: 'application_startup',
      timestamp: new Date().toISOString() 
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

  const handleConversionMapChange = (newMap: EnhancedConversionMap) => {
    const oldMap = conversionMap;
    setConversionMap(newMap);
    logger.logDataChange('EnhancedConversionMap', 'updated', oldMap, newMap);
    logger.logInfo('DATA_CHANGE', 'Enhanced conversion map updated in main app', { 
      fieldDefinitionCount: Object.keys(newMap.field_definitions || {}).length,
      transformationRuleCount: Object.keys(newMap.transformation_rules || {}).length,
      headerRow: newMap.header_row,
      version: newMap.version
    });
    console.log('App: Enhanced conversion map updated:', newMap);
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
            {NAVIGATION_ITEMS.map((navItem) => {
              const handleClick = () => {
                logger.logButtonClick(navItem.label, 'Main Header');
                
                switch (navItem.id) {
                  case 'apstra-connection':
                    setShowApstraConfigManager(true);
                    logger.logWorkflowStart('Apstra Connection Configuration', { trigger: 'header_button' });
                    break;
                  case 'provisioning':
                    setShowProvisioningPage(true);
                    logger.logWorkflowStart('Network Provisioning', { trigger: 'header_button', hasConversionMap: !!conversionMap, hasApstraConfig: !!apstraConfig });
                    break;
                  case 'tools':
                    setShowToolsPage(true);
                    logger.logWorkflowStart('Apstra Tools', { trigger: 'header_button' });
                    break;
                  case 'conversion-map':
                    setShowConversionManager(true);
                    logger.logWorkflowStart('Conversion Map Management', { trigger: 'header_button' });
                    break;
                }
              };

              return (
                <button 
                  key={navItem.id}
                  onClick={handleClick}
                  style={getNavigationStyles(navItem.id, false, isAuthenticated)}
                >
                  {navItem.label}
                </button>
              );
            })}
            
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
            {NAVIGATION_ITEMS.map((navItem) => {
              const handleClick = () => {
                logger.logButtonClick(`${navItem.shortLabel} Card`, 'Main Dashboard');
                
                switch (navItem.id) {
                  case 'apstra-connection':
                    setShowApstraConfigManager(true);
                    logger.logWorkflowStart('Apstra Connection Configuration', { trigger: 'dashboard_card' });
                    break;
                  case 'provisioning':
                    setShowProvisioningPage(true);
                    logger.logWorkflowStart('Network Provisioning', { trigger: 'dashboard_card', hasConversionMap: !!conversionMap, hasApstraConfig: !!apstraConfig });
                    break;
                  case 'tools':
                    setShowToolsPage(true);
                    logger.logWorkflowStart('Apstra Tools', { trigger: 'dashboard_card' });
                    break;
                  case 'conversion-map':
                    setShowConversionManager(true);
                    logger.logWorkflowStart('Conversion Map Management', { trigger: 'dashboard_card' });
                    break;
                }
              };

              const hoverStyles = getHoverStyles(navItem.id, isAuthenticated);

              return (
                <div 
                  key={navItem.id}
                  onClick={handleClick}
                  style={getDashboardCardStyles(navItem.id, isAuthenticated)}
                  onMouseEnter={(e) => {
                    Object.assign(e.currentTarget.style, hoverStyles);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  <h3 style={{ 
                    color: navItem.id === 'apstra-connection' ? (isAuthenticated ? '#28a745' : '#dc3545') : navItem.color, 
                    marginBottom: '10px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                  }}>
                    {navItem.label}
                    <span style={{ fontSize: '1.2rem' }}>→</span>
                  </h3>
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>{navItem.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      
      <EnhancedConversionMapManager
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