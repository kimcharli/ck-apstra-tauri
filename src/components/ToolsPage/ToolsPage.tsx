import React, { useState, useEffect } from 'react';
import NavigationHeader from '../NavigationHeader/NavigationHeader';
import { logger } from '../../services/LoggingService';
import { apstraApiService } from '../../services/ApstraApiService';
import { useAuthStatus } from '../../hooks/useAuthStatus';
import './ToolsPage.css';

interface ToolsPageProps {
  isVisible: boolean;
  onClose?: () => void;
  onNavigate: (page: 'home' | 'apstra-connection' | 'conversion-map' | 'provisioning' | 'tools') => void;
}

interface Blueprint {
  label: string;
  id: string;
}

const ToolsPage: React.FC<ToolsPageProps> = ({
  isVisible,
  onNavigate
}) => {
  const [systemSearchValue, setSystemSearchValue] = useState('CHA08P22L23');
  const [systemBlueprintLabel, setSystemBlueprintLabel] = useState('');
  const [systemBlueprintId, setSystemBlueprintId] = useState('');
  const [ipSearchValue, setIpSearchValue] = useState('10.90.194.157/32');
  const [ipBlueprintLabel, setIpBlueprintLabel] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [foundSystemInfo, setFoundSystemInfo] = useState<{
    blueprintId: string;
    blueprintLabel: string;
    pod?: string;
    rack?: string;
    nodeId?: string;
    apstraUrl?: string;
  } | null>(null);
  
  // Use centralized authentication guard
  const { isAuthenticated } = useAuthStatus();
  const [blueprints] = useState<Blueprint[]>([
    { label: 'DH50-Colo1', id: '32f27ec4-c6bf-4f2e-a00a-8cd7f674f369' },
    { label: 'DH2-Colo2', id: '9818f405-40e8-4b7d-92eb-527a4f7d6246' },
    { label: 'DH15-Colo1', id: '7f468d2b-94f2-4efa-a2fd-68653db7fa89' },
    { label: 'DH4-Colo2', id: '9059ee6c-5ac2-4fee-bd65-83d429ccf850' }
  ]);

  // Set default blueprint on visibility
  useEffect(() => {
    if (isVisible) {
      setSystemBlueprintId(''); // Default to empty - 'Select Blueprint'
    }
  }, [isVisible]);


  const handleSystemSearch = async () => {
    if (!systemSearchValue.trim()) return;
    
    // Check if authenticated
    if (!isAuthenticated) {
      alert('Not authenticated with Apstra. Please go to Apstra Connection page and connect first.');
      onNavigate('apstra-connection');
      return;
    }

    logger.logButtonClick('System Search', 'ToolsPage', { 
      searchValue: systemSearchValue, 
      searchType: 'cross-blueprint'
    });
    logger.logWorkflowStart('System Search', {
      searchTerm: systemSearchValue,
      timestamp: new Date().toISOString()
    });
    
    setIsSearching(true);
    setSearchResults([]);
    setFoundSystemInfo(null);
    
    try {
      console.log('Searching for system across all blueprints:', systemSearchValue);
      
      // Search across all blueprints
      const foundSystem = await apstraApiService.searchSystemAcrossBlueprints(systemSearchValue, blueprints);
      
      if (foundSystem) {
        setSearchResults(foundSystem.response.items || []);
        
        // Extract system information for display
        const systemItem = foundSystem.response.items[0];
        const extractSystemInfo = (item: any) => {
          // Extract pod and rack information from system data
          let pod = '';
          let rack = '';
          let nodeId = '';
          
          if (item.system) {
            // Try to extract pod and rack from system properties
            pod = item.system.pod || item.pod || '';
            rack = item.system.rack || item.rack || '';
            nodeId = item.system.id || item.id || '';
          }
          
          return { pod, rack, nodeId };
        };
        
        const { pod, rack, nodeId } = extractSystemInfo(systemItem);
        
        // Get Apstra host from the current configuration
        const apstraHost = apstraApiService.getHost() || '10.85.192.59';
        const apstraUrl = nodeId ? 
          `https://${apstraHost}/#/blueprints/${foundSystem.blueprintId}/staged/physical/selection/node-preview/${nodeId}` 
          : '';
        
        const systemInfo = {
          blueprintId: foundSystem.blueprintId,
          blueprintLabel: foundSystem.blueprintLabel,
          pod,
          rack,
          nodeId,
          apstraUrl
        };
        
        setFoundSystemInfo(systemInfo);
        
        // Auto-select the found blueprint
        setSystemBlueprintId(foundSystem.blueprintId);
        setSystemBlueprintLabel(foundSystem.blueprintLabel);
        
        logger.logWorkflowComplete('System Search', {
          status: 'completed',
          searchTerm: systemSearchValue,
          blueprintId: foundSystem.blueprintId,
          blueprintLabel: foundSystem.blueprintLabel,
          resultsFound: foundSystem.response.count,
          systemInfo
        });
        
        console.log('System found in blueprint:', foundSystem.blueprintLabel);
        console.log('System info:', systemInfo);
        console.log('Search results:', foundSystem.response.items);
        
      } else {
        // System not found in any blueprint
        setFoundSystemInfo(null);
        setSystemBlueprintId('');
        
        logger.logWorkflowComplete('System Search', {
          status: 'not_found',
          searchTerm: systemSearchValue,
          searched_blueprints: blueprints.length
        });
        
        alert(`System "${systemSearchValue}" not found in any blueprint.`);
      }
    } catch (error: any) {
      console.error('System search failed:', error);
      logger.logError('API_CALL', 'System search failed', {
        searchTerm: systemSearchValue,
        error: error.toString()
      });
      
      // Handle specific error cases
      if (error.message?.includes('Not authenticated')) {
        alert('Authentication expired. Please go to Apstra Connection page and reconnect.');
        onNavigate('apstra-connection');
      } else {
        alert(`System search failed: ${error.message || error}`);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleIpSearch = async () => {
    if (!ipSearchValue.trim()) return;
    
    logger.logButtonClick('IP Search', 'ToolsPage', { 
      searchValue: ipSearchValue, 
      blueprintLabel: ipBlueprintLabel 
    });
    logger.logWorkflowStart('IP Search', {
      searchTerm: ipSearchValue,
      blueprint: ipBlueprintLabel,
      timestamp: new Date().toISOString()
    });
    
    setIsSearching(true);
    try {
      // TODO: Implement actual IP search API call
      console.log('Searching for IP:', ipSearchValue, 'in blueprint:', ipBlueprintLabel);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock search results would be handled here
      logger.logWorkflowComplete('IP Search', {
        status: 'completed',
        searchTerm: ipSearchValue,
        blueprint: ipBlueprintLabel,
        resultsFound: 'simulated'
      });
      
      alert(`IP search completed for: ${ipSearchValue}`);
    } catch (error: any) {
      console.error('IP search failed:', error);
      logger.logError('API_CALL', 'IP search failed', {
        searchTerm: ipSearchValue,
        blueprint: ipBlueprintLabel,
        error: error.toString()
      });
      alert('IP search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleBlueprintAction = (action: 'leafs' | 'dump', blueprint: Blueprint) => {
    logger.logButtonClick(`Blueprint ${action}`, 'ToolsPage', { 
      action, 
      blueprintLabel: blueprint.label, 
      blueprintId: blueprint.id 
    });
    logger.logWorkflowStart(`Blueprint ${action.toUpperCase()}`, {
      blueprint: blueprint.label,
      blueprintId: blueprint.id,
      action: action,
      timestamp: new Date().toISOString()
    });
    
    console.log(`${action} action for blueprint:`, blueprint.label, blueprint.id);
    alert(`${action.toUpperCase()} action triggered for ${blueprint.label}`);
  };

  if (!isVisible) return null;

  return (
    <div className="tools-page">
      <NavigationHeader
        currentPage="tools"
        onNavigate={onNavigate}
        title="Apstra Tools"
      />
      
      <div className={`tools-content ${!isAuthenticated ? 'not-authenticated' : ''}`}>
        {!isAuthenticated && (
          <div className="auth-required-banner">
            <div className="auth-banner-content">
              <span className="auth-warning-icon">⚠️</span>
              <div className="auth-message">
                <h3>Apstra Connection Required</h3>
                <p>Please authenticate with Apstra before using these tools.</p>
                <button 
                  className="connect-now-button"
                  onClick={() => onNavigate('apstra-connection')}
                >
                  Go to Apstra Connection
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* System Search Section */}
        <section className={`search-section ${!isAuthenticated ? 'disabled' : ''}`}>
          <h2>System Search {isAuthenticated ? '✅' : '❌'}</h2>
          <div className="search-form">
            <div className="search-inputs">
              <input
                type="text"
                value={systemSearchValue}
                onChange={(e) => setSystemSearchValue(e.target.value)}
                placeholder="Enter system name (e.g., server hostname)"
                className="search-input"
              />
              <select
                value={systemBlueprintId}
                onChange={(e) => setSystemBlueprintId(e.target.value)}
                className="search-input blueprint-select"
              >
                <option value="">Select Blueprint</option>
                {blueprints.map(bp => (
                  <option key={bp.id} value={bp.id}>
                    {bp.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={systemBlueprintLabel}
                onChange={(e) => setSystemBlueprintLabel(e.target.value)}
                placeholder="Or enter Blueprint Label"
                className="search-input blueprint-input"
              />
              <button 
                onClick={handleSystemSearch}
                disabled={isSearching || !systemSearchValue.trim()}
                className="search-button"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            {!isAuthenticated && (
              <div className="auth-warning">
                ⚠️ Not authenticated with Apstra. Configure Apstra settings first.
              </div>
            )}
          </div>
          {foundSystemInfo && (
            <div className="system-info-display">
              <h4>System Found! 🎯</h4>
              <div className="system-info-grid">
                <div className="info-item">
                  <label>Blueprint:</label>
                  <span className="info-value">{foundSystemInfo.blueprintLabel}</span>
                </div>
                {foundSystemInfo.pod && (
                  <div className="info-item">
                    <label>Pod:</label>
                    <span className="info-value">{foundSystemInfo.pod}</span>
                  </div>
                )}
                {foundSystemInfo.rack && (
                  <div className="info-item">
                    <label>Rack:</label>
                    <span className="info-value">{foundSystemInfo.rack}</span>
                  </div>
                )}
                {foundSystemInfo.apstraUrl && (
                  <div className="info-item">
                    <label>Apstra URL:</label>
                    <a 
                      href={foundSystemInfo.apstraUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="apstra-link"
                    >
                      Open in Apstra 🔗
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="search-results">
              <h4>Search Results ({searchResults.length}):</h4>
              <pre className="results-display">
                {JSON.stringify(searchResults, null, 2)}
              </pre>
            </div>
          )}
        </section>

        {/* IP Search Section */}
        <section className={`search-section ${!isAuthenticated ? 'disabled' : ''}`}>
          <h2>IP Search {isAuthenticated ? '✅' : '❌'}</h2>
          <div className="search-form">
            <div className="search-inputs">
              <input
                type="text"
                value={ipSearchValue}
                onChange={(e) => setIpSearchValue(e.target.value)}
                placeholder="Enter IP address/CIDR"
                className="search-input ip-input"
              />
              <input
                type="text"
                value={ipBlueprintLabel}
                onChange={(e) => setIpBlueprintLabel(e.target.value)}
                placeholder="Blueprint Label (Optional)"
                className="search-input blueprint-input"
              />
              <button 
                onClick={handleIpSearch}
                disabled={isSearching || !ipSearchValue.trim()}
                className="search-button"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </section>

        {/* Blueprints Table Section */}
        <section className={`blueprints-section ${!isAuthenticated ? 'disabled' : ''}`}>
          <div className="blueprints-header">
            <h3>
              <span className="blueprints-icon">📋</span>
              Blueprints: {blueprints.length}
            </h3>
          </div>
          
          <div className="blueprints-table-container">
            <table className="blueprints-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {blueprints.map((blueprint, index) => (
                  <tr key={blueprint.id} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                    <td>
                      <a href="#" className="blueprint-link">
                        {blueprint.label}
                      </a>
                    </td>
                    <td className="blueprint-id">{blueprint.id}</td>
                    <td className="blueprint-actions">
                      <button
                        onClick={() => handleBlueprintAction('leafs', blueprint)}
                        className="action-link leafs-link"
                      >
                        Leafs
                      </button>
                      <span className="action-separator">|</span>
                      <button
                        onClick={() => handleBlueprintAction('dump', blueprint)}
                        className="action-link dump-link"
                      >
                        Dump
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ToolsPage;