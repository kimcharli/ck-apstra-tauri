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

    // Determine search strategy based on blueprint selection
    const isSpecificBlueprint = systemBlueprintId.trim() !== '';
    const searchType = isSpecificBlueprint ? 'single-blueprint' : 'cross-blueprint';

    logger.logButtonClick('System Search', 'ToolsPage', { 
      searchValue: systemSearchValue, 
      searchType,
      blueprintId: systemBlueprintId || 'all'
    });
    logger.logWorkflowStart('System Search', {
      searchTerm: systemSearchValue,
      searchType,
      blueprintId: systemBlueprintId,
      timestamp: new Date().toISOString()
    });
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      let allResults: Array<{
        blueprintId: string;
        blueprintLabel: string;
        blueprintUrl: string;
        systemName: string;
        pod: string;
        rack: string;
        nodeId: string;
        systemUrl: string;
        searchResults: any[];
      }> = [];

      if (isSpecificBlueprint) {
        // Search in specific blueprint selected by user
        const selectedBlueprint = blueprints.find(bp => bp.id === systemBlueprintId);
        if (!selectedBlueprint) {
          alert('Selected blueprint not found. Please select a valid blueprint.');
          return;
        }

        console.log('Searching for system in specific blueprint:', selectedBlueprint.label);
        
        const response = await apstraApiService.searchSystems(systemBlueprintId, systemSearchValue);
        
        if (response.count > 0) {
          // Process results from this blueprint
          response.items.forEach((item: any) => {
            const extractedInfo = extractSystemInfo(item);
            const apstraHost = apstraApiService.getHost() || '10.85.192.59';
            const blueprintUrl = `https://${apstraHost}/#/blueprints/${systemBlueprintId}/staged`;
            const systemUrl = extractedInfo.nodeId ? 
              `https://${apstraHost}/#/blueprints/${systemBlueprintId}/staged/physical/selection/node-preview/${extractedInfo.nodeId}` 
              : '';

            allResults.push({
              blueprintId: systemBlueprintId,
              blueprintLabel: selectedBlueprint.label,
              blueprintUrl,
              systemName: extractedInfo.systemName || systemSearchValue,
              pod: extractedInfo.pod,
              rack: extractedInfo.rack,
              nodeId: extractedInfo.nodeId,
              systemUrl,
              searchResults: [item]
            });
          });
        }
      } else {
        // Search across all blueprints
        console.log('Searching for system across all blueprints');
        
        for (const blueprint of blueprints) {
          try {
            const response = await apstraApiService.searchSystems(blueprint.id, systemSearchValue);
            
            if (response.count > 0) {
              // Process results from this blueprint
              response.items.forEach((item: any) => {
                const extractedInfo = extractSystemInfo(item);
                const apstraHost = apstraApiService.getHost() || '10.85.192.59';
                const blueprintUrl = `https://${apstraHost}/#/blueprints/${blueprint.id}/staged`;
                const systemUrl = extractedInfo.nodeId ? 
                  `https://${apstraHost}/#/blueprints/${blueprint.id}/staged/physical/selection/node-preview/${extractedInfo.nodeId}` 
                  : '';

                allResults.push({
                  blueprintId: blueprint.id,
                  blueprintLabel: blueprint.label,
                  blueprintUrl,
                  systemName: extractedInfo.systemName || systemSearchValue,
                  pod: extractedInfo.pod,
                  rack: extractedInfo.rack,
                  nodeId: extractedInfo.nodeId,
                  systemUrl,
                  searchResults: [item]
                });
              });
            }
          } catch (error) {
            console.warn(`Search failed for blueprint ${blueprint.label}:`, error);
          }
        }
      }

      // Set combined results
      setSearchResults(allResults);
      
      logger.logWorkflowComplete('System Search', {
        status: allResults.length > 0 ? 'completed' : 'not_found',
        searchTerm: systemSearchValue,
        searchType,
        resultsFound: allResults.length,
        blueprintsSearched: isSpecificBlueprint ? 1 : blueprints.length
      });
      
      if (allResults.length === 0) {
        const searchScope = isSpecificBlueprint ? 'selected blueprint' : 'any blueprint';
        alert(`System "${systemSearchValue}" not found in ${searchScope}.`);
      }
      
    } catch (error: any) {
      console.error('System search failed:', error);
      logger.logError('API_CALL', 'System search failed', {
        searchTerm: systemSearchValue,
        searchType,
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

  const extractSystemInfo = (item: any) => {
    // Extract pod, rack, and system information from system data
    let pod = '';
    let rack = '';
    let nodeId = '';
    let systemName = '';
    
    if (item.system) {
      // Try to extract information from system properties
      pod = item.system.pod || item.pod || '';
      rack = item.system.rack || item.rack || '';
      nodeId = item.system.id || item.id || '';
      systemName = item.system.hostname || item.system.label || item.system.name || '';
    } else {
      // Fallback: try direct properties
      pod = item.pod || '';
      rack = item.rack || '';
      nodeId = item.id || '';
      systemName = item.hostname || item.label || item.name || '';
    }
    
    return { pod, rack, nodeId, systemName };
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
          {searchResults.length > 0 && (
            <div className="search-results-table">
              <h4>System Search Results ({searchResults.length})</h4>
              <div className="results-table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Blueprint</th>
                      <th>Pod</th>
                      <th>Rack</th>
                      <th>System</th>
                      <th>Search Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((result, index) => (
                      <tr key={`${result.blueprintId}-${result.nodeId}-${index}`}>
                        <td className="blueprint-cell">
                          <button
                            className="blueprint-btn"
                            onClick={() => window.open(result.blueprintUrl, '_blank')}
                            title={`Open blueprint ${result.blueprintLabel} in Apstra`}
                          >
                            {result.blueprintLabel}
                          </button>
                        </td>
                        <td className="pod-name">
                          {result.pod || '-'}
                        </td>
                        <td className="rack-name">
                          {result.rack || '-'}
                        </td>
                        <td className="system-cell">
                          {result.systemUrl ? (
                            <button
                              className="system-btn"
                              onClick={() => window.open(result.systemUrl, '_blank')}
                              title={`Open system ${result.systemName} in Apstra`}
                            >
                              {result.systemName}
                            </button>
                          ) : (
                            <span className="no-system">{result.systemName || '-'}</span>
                          )}
                        </td>
                        <td className="search-result">
                          <button 
                            className="result-details-btn"
                            onClick={() => {
                              console.log('Search result details:', result.searchResults);
                              alert('Search result details logged to console');
                            }}
                            title="View detailed search results"
                          >
                            📋 Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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