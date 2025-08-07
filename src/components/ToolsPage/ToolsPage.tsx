import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import NavigationHeader from '../NavigationHeader/NavigationHeader';
import { logger } from '../../services/LoggingService';
import { apstraApiService } from '../../services/ApstraApiService';
import { ApstraConfig } from '../../types/apstraConfig';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [blueprints] = useState<Blueprint[]>([
    { label: 'DH50-Colo1', id: '32f27ec4-c6bf-4f2e-a00a-8cd7f674f369' },
    { label: 'DH2-Colo2', id: '9818f405-40e8-4b7d-92eb-527a4f7d6246' },
    { label: 'DH15-Colo1', id: '7f468d2b-94f2-4efa-a2fd-68653db7fa89' },
    { label: 'DH4-Colo2', id: '9059ee6c-5ac2-4fee-bd65-83d429ccf850' }
  ]);

  // Check authentication and load config on component mount
  useEffect(() => {
    checkAuthenticationStatus();
    setSystemBlueprintId(blueprints[0]?.id || ''); // Default to first blueprint
  }, []);

  const checkAuthenticationStatus = async () => {
    try {
      const authStatus = await apstraApiService.checkAuthentication();
      setIsAuthenticated(authStatus);
      if (!authStatus) {
        await authenticateWithApstra();
      }
    } catch (error: any) {
      console.error('Failed to check authentication:', error);
      setIsAuthenticated(false);
    }
  };

  const authenticateWithApstra = async () => {
    setIsAuthenticating(true);
    try {
      // Load user's Apstra config
      const config = await invoke<ApstraConfig>('load_user_apstra_config');
      
      if (!config) {
        throw new Error('No Apstra configuration found. Please configure Apstra settings first.');
      }

      // Construct base URL
      const protocol = config.use_ssl !== false ? 'https' : 'http';
      const baseUrl = `${protocol}://${config.host}:${config.port}`;

      logger.logWorkflowStart('Apstra Authentication', {
        host: config.host,
        port: config.port,
        username: config.username,
        timestamp: new Date().toISOString()
      });

      // Attempt login
      await apstraApiService.login(baseUrl, config.username, config.password);
      setIsAuthenticated(true);
      
      logger.logWorkflowComplete('Apstra Authentication', {
        status: 'success',
        sessionId: apstraApiService.getSessionId()
      });

    } catch (error: any) {
      logger.logError('API_CALL', 'Apstra authentication failed', {
        error: error.toString()
      });
      console.error('Authentication failed:', error);
      setIsAuthenticated(false);
      
      // Show user-friendly error message
      alert(`Failed to connect to Apstra: ${error.message || error}. Please check your Apstra configuration.`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSystemSearch = async () => {
    if (!systemSearchValue.trim()) return;
    
    // Check if authenticated
    if (!isAuthenticated) {
      alert('Not authenticated with Apstra. Attempting to reconnect...');
      await authenticateWithApstra();
      if (!isAuthenticated) {
        return;
      }
    }

    // Determine blueprint ID to use
    let blueprintId = systemBlueprintId;
    if (systemBlueprintLabel.trim()) {
      const matchedBlueprint = blueprints.find(bp => 
        bp.label.toLowerCase().includes(systemBlueprintLabel.toLowerCase())
      );
      if (matchedBlueprint) {
        blueprintId = matchedBlueprint.id;
      } else {
        // If blueprint label provided but not found, show warning
        if (window.confirm(`Blueprint "${systemBlueprintLabel}" not found in the blueprint list. Continue with default blueprint "${blueprints[0]?.label}"?`)) {
          blueprintId = blueprints[0]?.id || '';
        } else {
          return;
        }
      }
    }

    if (!blueprintId) {
      alert('No blueprint selected. Please select a blueprint or provide a blueprint label.');
      return;
    }
    
    logger.logButtonClick('System Search', 'ToolsPage', { 
      searchValue: systemSearchValue, 
      blueprintId: blueprintId,
      blueprintLabel: systemBlueprintLabel 
    });
    logger.logWorkflowStart('System Search', {
      searchTerm: systemSearchValue,
      blueprintId: blueprintId,
      timestamp: new Date().toISOString()
    });
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      console.log('Searching for system:', systemSearchValue, 'in blueprint:', blueprintId);
      
      const response = await apstraApiService.searchSystems(blueprintId, systemSearchValue);
      
      setSearchResults(response.items || []);
      
      logger.logWorkflowComplete('System Search', {
        status: 'completed',
        searchTerm: systemSearchValue,
        blueprintId: blueprintId,
        resultsFound: response.count,
        results: response.items
      });
      
      if (response.count > 0) {
        alert(`System search completed! Found ${response.count} result(s) for "${systemSearchValue}". Check console for details.`);
        console.log('Search results:', response.items);
      } else {
        alert(`No systems found matching "${systemSearchValue}" in the selected blueprint.`);
      }
    } catch (error: any) {
      console.error('System search failed:', error);
      logger.logError('API_CALL', 'System search failed', {
        searchTerm: systemSearchValue,
        blueprintId: blueprintId,
        error: error.toString()
      });
      
      // Handle specific error cases
      if (error.message?.includes('Not authenticated')) {
        alert('Authentication expired. Please try again.');
        setIsAuthenticated(false);
        await authenticateWithApstra();
      } else if (error.message?.includes('Blueprint not found')) {
        alert(`Blueprint not found. Please check the blueprint ID: ${blueprintId}`);
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
      
      <div className="tools-content">
        {/* System Search Section */}
        <section className="search-section">
          <h2>System Search {isAuthenticated ? '✅' : '❌'}</h2>
          {isAuthenticating && (
            <div className="auth-status">
              <span>🔄 Authenticating with Apstra...</span>
            </div>
          )}
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
                disabled={isSearching || !systemSearchValue.trim() || isAuthenticating}
                className="search-button"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            {!isAuthenticated && !isAuthenticating && (
              <div className="auth-warning">
                ⚠️ Not authenticated with Apstra. Configure Apstra settings first.
              </div>
            )}
          </div>
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
        <section className="search-section">
          <h2>IP Search</h2>
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
        <section className="blueprints-section">
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