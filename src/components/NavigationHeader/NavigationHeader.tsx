import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';
import { logger } from '../../services/LoggingService';
import { useAuthStatus } from '../../hooks/useAuthStatus';
import './NavigationHeader.css';

interface NavigationHeaderProps {
  currentPage: 'home' | 'apstra-connection' | 'conversion-map' | 'provisioning' | 'tools';
  onNavigate: (page: 'home' | 'apstra-connection' | 'conversion-map' | 'provisioning' | 'tools') => void;
  title?: string;
  showBackButton?: boolean;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  currentPage,
  onNavigate,
  title,
  showBackButton = true
}) => {
  const [isConnectionAlive, setIsConnectionAlive] = useState<boolean | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isDownloadingLogs, setIsDownloadingLogs] = useState(false);
  
  // Use centralized authentication state
  const { isAuthenticated: isApstraAuthenticated } = useAuthStatus();

  const handleNavigation = (page: typeof currentPage) => {
    logger.logNavigation(currentPage, page, 'navigation_button');
    logger.logButtonClick(`Navigate to ${page}`, 'NavigationHeader', { fromPage: currentPage, toPage: page });
    onNavigate(page);
  };

  const testTauriConnection = async () => {
    if (isTestingConnection) return;
    
    logger.logButtonClick('Test Tauri Connection', 'NavigationHeader', { currentStatus: isConnectionAlive });
    setIsTestingConnection(true);
    try {
      await invoke<string>('greet', { name: 'Connection Test' });
      setIsConnectionAlive(true);
      logger.logInfo('SYSTEM', 'Tauri connection test successful');
    } catch (error: any) {
      console.error('Tauri connection test failed:', error);
      setIsConnectionAlive(false);
      logger.logError('SYSTEM', 'Tauri connection test failed', { error: error.toString() });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const downloadLogs = async () => {
    if (isDownloadingLogs) return;
    
    logger.logButtonClick('Download Logs', 'NavigationHeader', { logCount: logger.getAllLogs().length });
    setIsDownloadingLogs(true);
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const defaultFileName = `apstra-logs-${timestamp}.txt`;
      
      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'CSV Files', extensions: ['csv'] }
        ]
      });

      if (filePath) {
        let content: string;
        const extension = filePath.split('.').pop()?.toLowerCase();
        
        switch (extension) {
          case 'json':
            content = logger.exportLogsAsJson();
            break;
          case 'csv':
            content = logger.exportLogsAsCsv();
            break;
          default:
            content = logger.exportLogsAsText();
        }
        
        await writeTextFile(filePath, content);
        logger.logFileOperation('Log export', filePath, content.length, { 
          format: extension,
          logCount: logger.getAllLogs().length,
          stats: logger.getLogStats()
        });
        
        // Log exported successfully - no popup needed
      }
    } catch (error: any) {
      console.error('Failed to download logs:', error);
      logger.logError('SYSTEM', 'Log download failed', { error: error.toString() });
      alert(`Failed to export logs: ${error}`);
    } finally {
      setIsDownloadingLogs(false);
    }
  };

  return (
    <header className="navigation-header">
      <div className="nav-content">
        <div className="nav-title-section">
          {showBackButton && (
            <button 
              onClick={() => handleNavigation('home')}
              className="back-button"
              title="Back to Home"
            >
              ←
            </button>
          )}
          <h1>{title || 'Apstra Provisioning Tool'}</h1>
        </div>
        
        <div className="nav-buttons">
          <button 
            onClick={() => handleNavigation('apstra-connection')}
            className={`nav-btn ${currentPage === 'apstra-connection' ? 'active' : ''} ${isApstraAuthenticated ? 'authenticated' : ''}`}
            title={isApstraAuthenticated ? 'Connected to Apstra' : 'Not connected to Apstra'}
          >
            {isApstraAuthenticated ? '✅ 1. Apstra Connection' : '1. Apstra Connection'}
          </button>
          <button 
            onClick={() => handleNavigation('conversion-map')}
            className={`nav-btn ${currentPage === 'conversion-map' ? 'active' : ''}`}
          >
            2. Conversion Map
          </button>
          <button 
            onClick={() => handleNavigation('provisioning')}
            className={`nav-btn ${currentPage === 'provisioning' ? 'active' : ''}`}
          >
            3. Provisioning
          </button>
          <button 
            onClick={() => handleNavigation('tools')}
            className={`nav-btn ${currentPage === 'tools' ? 'active' : ''}`}
          >
            4. Tools
          </button>
          
          {/* Log Download Button */}
          <button
            onClick={downloadLogs}
            disabled={isDownloadingLogs}
            title="Download Session Logs"
            className="log-download-btn"
          >
            {isDownloadingLogs ? '⟳' : '📥'}
          </button>
          
          {/* Tauri Connection Status Button */}
          <button
            onClick={testTauriConnection}
            disabled={isTestingConnection}
            title={isConnectionAlive === null ? 'Test Tauri Connection' : isConnectionAlive ? 'Tauri Connected' : 'Tauri Disconnected'}
            className={`connection-status ${isConnectionAlive === true ? 'connection-alive' : isTestingConnection ? 'connection-testing' : ''}`}
          >
            {isTestingConnection ? '⟳' : isConnectionAlive === null ? '?' : isConnectionAlive ? '●' : '●'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default NavigationHeader;