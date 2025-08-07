import React, { useState, useEffect } from 'react';
import NavigationHeader from '../NavigationHeader/NavigationHeader';
import ApstraButton from '../ApstraButton';
import { logger } from '../../services/LoggingService';
import { apstraApiService } from '../../services/ApstraApiService';
import { useAuthStatus } from '../../hooks/useAuthStatus';
import { generateApstraUrls } from '../../utils/apstraUrls';
import { downloadJSON, generateBlueprintDumpFilename } from '../../utils/fileDownload';
import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';
import { downloadDir } from '@tauri-apps/api/path';
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
  const [ipBlueprintId, setIpBlueprintId] = useState('');
  const [ipSearchResults, setIpSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [dumpingBlueprintId, setDumpingBlueprintId] = useState<string | null>(null);
  
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
      setIpBlueprintId(''); // Default to empty - 'Select Blueprint'
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
        podId: string;
        rackId: string;
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
        
        const response = await apstraApiService.searchSystemsWithTopology(systemBlueprintId, systemSearchValue);
        
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
              podId: extractedInfo.podId,
              rackId: extractedInfo.rackId,
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
            const response = await apstraApiService.searchSystemsWithTopology(blueprint.id, systemSearchValue);
            
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
                  podId: extractedInfo.podId,
                  rackId: extractedInfo.rackId,
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
    // Extract pod, rack, and system information from graph query response
    let pod = '';
    let rack = '';
    let nodeId = '';
    let systemName = '';
    let podId = '';
    let rackId = '';
    
    // Graph query response structure: named nodes (system, pod, rack)
    if (item.system) {
      nodeId = item.system.id || '';
      systemName = item.system.hostname || item.system.label || item.system.name || '';
    }
    
    if (item.pod) {
      pod = item.pod.label || item.pod.name || '';
      podId = item.pod.id || '';
    }
    
    if (item.rack) {
      rack = item.rack.label || item.rack.name || '';
      rackId = item.rack.id || '';
    }
    
    // Fallback to direct properties if named nodes not available
    if (!pod && !rack && !nodeId) {
      pod = item.pod || '';
      rack = item.rack || '';
      nodeId = item.id || '';
      systemName = item.hostname || item.label || item.name || '';
    }
    
    return { pod, rack, nodeId, systemName, podId, rackId };
  };

  const extractIPInfo = (item: any) => {
    // Extract interface, system, pod, and rack information from graph query response
    let interfaceId = '';
    let interfaceName = '';
    let interfaceIfName = '';
    let interfaceIfType = '';
    let ipAddress = '';
    let systemName = '';
    let systemId = '';
    let pod = '';
    let rack = '';
    let podId = '';
    let rackId = '';
    
    // Graph query response structure: named nodes (intf, system, pod, rack)
    if (item.intf) {
      interfaceId = item.intf.id || '';
      interfaceName = item.intf.label || item.intf.name || '';
      interfaceIfName = item.intf.if_name || '';
      interfaceIfType = item.intf.if_type || '';
      ipAddress = item.intf.ipv4_addr || '';
    }
    
    if (item.system) {
      systemId = item.system.id || '';
      systemName = item.system.hostname || item.system.label || item.system.name || '';
    }
    
    if (item.pod) {
      pod = item.pod.label || item.pod.name || '';
      podId = item.pod.id || '';
    }
    
    if (item.rack) {
      rack = item.rack.label || item.rack.name || '';
      rackId = item.rack.id || '';
    }
    
    return { interfaceId, interfaceName, interfaceIfName, interfaceIfType, ipAddress, systemName, systemId, pod, rack, podId, rackId };
  };

  const formatInterfaceLabel = (interfaceIfName: string, interfaceIfType: string, fallbackName: string) => {
    // Create interface label from if_name and if_type
    if (interfaceIfType) {
      if (interfaceIfName) {
        return `${interfaceIfName} (${interfaceIfType})`;
      } else {
        return interfaceIfType;
      }
    }
    // Fallback to interface name or ID if if_type is not available
    return fallbackName || 'Interface';
  };

  const handleIpSearch = async () => {
    if (!ipSearchValue.trim()) return;
    
    // Check if authenticated
    if (!isAuthenticated) {
      alert('Not authenticated with Apstra. Please go to Apstra Connection page and connect first.');
      onNavigate('apstra-connection');
      return;
    }

    // Determine search strategy based on blueprint selection
    const isSpecificBlueprint = ipBlueprintId.trim() !== '';
    const searchType = isSpecificBlueprint ? 'single-blueprint' : 'cross-blueprint';

    logger.logButtonClick('IP Search', 'ToolsPage', { 
      searchValue: ipSearchValue, 
      searchType,
      blueprintId: ipBlueprintId || 'all'
    });
    logger.logWorkflowStart('IP Search', {
      searchTerm: ipSearchValue,
      searchType,
      blueprintId: ipBlueprintId,
      timestamp: new Date().toISOString()
    });
    
    setIsSearching(true);
    setIpSearchResults([]);
    
    try {
      let allResults: Array<{
        blueprintId: string;
        blueprintLabel: string;
        blueprintUrl: string;
        interfaceId: string;
        interfaceName: string;
        interfaceIfName: string;
        interfaceIfType: string;
        ipAddress: string;
        systemName: string;
        systemId: string;
        pod: string;
        rack: string;
        podId: string;
        rackId: string;
        interfaceUrl: string;
        systemUrl: string;
        searchResults: any[];
      }> = [];

      if (isSpecificBlueprint) {
        // Search in specific blueprint selected by user
        const selectedBlueprint = blueprints.find(bp => bp.id === ipBlueprintId);
        if (!selectedBlueprint) {
          alert('Selected blueprint not found. Please select a valid blueprint.');
          return;
        }

        console.log('Searching for IP in specific blueprint:', selectedBlueprint.label);
        
        const response = await apstraApiService.searchIPsWithTopology(ipBlueprintId, ipSearchValue);
        
        if (response.count > 0) {
          // Process results from this blueprint
          response.items.forEach((item: any) => {
            const extractedInfo = extractIPInfo(item);
            const apstraHost = apstraApiService.getHost() || '10.85.192.59';
            const blueprintUrl = generateApstraUrls.blueprint({ host: apstraHost, blueprintId: ipBlueprintId });
            const interfaceUrl = extractedInfo.interfaceId ? 
              generateApstraUrls.interface({ host: apstraHost, blueprintId: ipBlueprintId, nodeId: extractedInfo.interfaceId })
              : '';
            const systemUrl = extractedInfo.systemId ? 
              generateApstraUrls.system({ host: apstraHost, blueprintId: ipBlueprintId, nodeId: extractedInfo.systemId })
              : '';

            allResults.push({
              blueprintId: ipBlueprintId,
              blueprintLabel: selectedBlueprint.label,
              blueprintUrl,
              interfaceId: extractedInfo.interfaceId,
              interfaceName: extractedInfo.interfaceName,
              interfaceIfName: extractedInfo.interfaceIfName,
              interfaceIfType: extractedInfo.interfaceIfType,
              ipAddress: extractedInfo.ipAddress || ipSearchValue,
              systemName: extractedInfo.systemName,
              systemId: extractedInfo.systemId,
              pod: extractedInfo.pod,
              rack: extractedInfo.rack,
              podId: extractedInfo.podId,
              rackId: extractedInfo.rackId,
              interfaceUrl,
              systemUrl,
              searchResults: [item]
            });
          });
        }
      } else {
        // Search across all blueprints
        console.log('Searching for IP across all blueprints');
        
        for (const blueprint of blueprints) {
          try {
            const response = await apstraApiService.searchIPsWithTopology(blueprint.id, ipSearchValue);
            
            if (response.count > 0) {
              // Process results from this blueprint
              response.items.forEach((item: any) => {
                const extractedInfo = extractIPInfo(item);
                const apstraHost = apstraApiService.getHost() || '10.85.192.59';
                const blueprintUrl = generateApstraUrls.blueprint({ host: apstraHost, blueprintId: blueprint.id });
                const interfaceUrl = extractedInfo.interfaceId ? 
                  generateApstraUrls.interface({ host: apstraHost, blueprintId: blueprint.id, nodeId: extractedInfo.interfaceId })
                  : '';
                const systemUrl = extractedInfo.systemId ? 
                  generateApstraUrls.system({ host: apstraHost, blueprintId: blueprint.id, nodeId: extractedInfo.systemId })
                  : '';

                allResults.push({
                  blueprintId: blueprint.id,
                  blueprintLabel: blueprint.label,
                  blueprintUrl,
                  interfaceId: extractedInfo.interfaceId,
                  interfaceName: extractedInfo.interfaceName,
                  interfaceIfName: extractedInfo.interfaceIfName,
                  interfaceIfType: extractedInfo.interfaceIfType,
                  ipAddress: extractedInfo.ipAddress || ipSearchValue,
                  systemName: extractedInfo.systemName,
                  systemId: extractedInfo.systemId,
                  pod: extractedInfo.pod,
                  rack: extractedInfo.rack,
                  podId: extractedInfo.podId,
                  rackId: extractedInfo.rackId,
                  interfaceUrl,
                  systemUrl,
                  searchResults: [item]
                });
              });
            }
          } catch (error) {
            console.warn(`IP search failed for blueprint ${blueprint.label}:`, error);
          }
        }
      }

      // Set combined results
      setIpSearchResults(allResults);
      
      logger.logWorkflowComplete('IP Search', {
        status: allResults.length > 0 ? 'completed' : 'not_found',
        searchTerm: ipSearchValue,
        searchType,
        resultsFound: allResults.length,
        blueprintsSearched: isSpecificBlueprint ? 1 : blueprints.length
      });
      
      if (allResults.length === 0) {
        const searchScope = isSpecificBlueprint ? 'selected blueprint' : 'any blueprint';
        alert(`IP "${ipSearchValue}" not found in ${searchScope}.`);
      }
      
    } catch (error: any) {
      console.error('IP search failed:', error);
      logger.logError('API_CALL', 'IP search failed', {
        searchTerm: ipSearchValue,
        searchType,
        error: error.toString()
      });
      
      // Handle specific error cases
      if (error.message?.includes('Not authenticated')) {
        alert('Authentication expired. Please go to Apstra Connection page and reconnect.');
        onNavigate('apstra-connection');
      } else {
        alert(`IP search failed: ${error.message || error}`);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleBlueprintAction = async (action: 'leafs' | 'dump', blueprint: Blueprint) => {
    // Check if authenticated
    if (!isAuthenticated) {
      alert('Not authenticated with Apstra. Please go to Apstra Connection page and connect first.');
      onNavigate('apstra-connection');
      return;
    }

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

    if (action === 'dump') {
      try {
        setDumpingBlueprintId(blueprint.id); // Set specific blueprint as dumping
        console.log(`Dumping blueprint data for: ${blueprint.label} (${blueprint.id})`);
        
        // Call the Apstra API to dump blueprint
        const blueprintData = await apstraApiService.dumpBlueprint(blueprint.id);
        
        // Generate filename with timestamp
        const filename = generateBlueprintDumpFilename(blueprint.label);
        
        // Use Tauri's native save dialog for better desktop integration
        try {
          // Get the default downloads directory
          const downloadsPath = await downloadDir();
          const defaultPath = `${downloadsPath}${filename}`;
          
          // Show save dialog
          const filePath = await save({
            title: 'Save Blueprint Dump',
            defaultPath: defaultPath,
            filters: [{
              name: 'JSON Files',
              extensions: ['json']
            }, {
              name: 'All Files', 
              extensions: ['*']
            }]
          });
          
          if (filePath) {
            // Convert data to JSON string
            const jsonString = JSON.stringify(blueprintData, null, 2);
            
            // Write file using Tauri's file system API
            await writeTextFile(filePath, jsonString);
            
            console.log(`Blueprint dump completed: ${filePath}`);
            console.log('Downloaded data size:', JSON.stringify(blueprintData).length, 'characters');
            alert(`Blueprint dump saved successfully!\n\nFile saved to: ${filePath}`);
          } else {
            console.log('User cancelled the save dialog');
          }
        } catch (downloadError) {
          console.error('Tauri save failed, falling back to browser download:', downloadError);
          
          // Fallback to browser download method
          try {
            downloadJSON(blueprintData, filename);
            console.log(`Blueprint dump completed with fallback: ${filename}`);
            alert(`Blueprint dump completed!\n\nFile downloaded as: ${filename}`);
          } catch (fallbackError) {
            throw new Error(`Both Tauri and browser download methods failed: ${fallbackError}`);
          }
        }
        
        logger.logWorkflowComplete(`Blueprint ${action.toUpperCase()}`, {
          status: 'completed',
          blueprint: blueprint.label,
          blueprintId: blueprint.id,
          filename: filename,
          dataSize: JSON.stringify(blueprintData).length,
          method: 'real_api_call'
        });
        
        
      } catch (error: any) {
        console.error('Blueprint dump failed:', error);
        logger.logError('API_CALL', 'Blueprint dump failed', {
          blueprint: blueprint.label,
          blueprintId: blueprint.id,
          action: action,
          error: error.toString()
        });
        
        // Handle specific error cases
        if (error.message?.includes('Not authenticated')) {
          alert('Authentication expired. Please go to Apstra Connection page and reconnect.');
          onNavigate('apstra-connection');
        } else {
          alert(`Blueprint dump failed: ${error.message || error}`);
        }
      } finally {
        setDumpingBlueprintId(null); // Clear the dumping state
      }
    } else {
      // Handle other actions (leafs, etc.)
      console.log(`${action} action for blueprint:`, blueprint.label, blueprint.id);
      alert(`${action.toUpperCase()} action triggered for ${blueprint.label}`);
      
      logger.logWorkflowComplete(`Blueprint ${action.toUpperCase()}`, {
        status: 'completed',
        blueprint: blueprint.label,
        blueprintId: blueprint.id
      });
    }
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
                          <ApstraButton
                            type="blueprint"
                            label={result.blueprintLabel}
                            url={result.blueprintUrl}
                          />
                        </td>
                        <td className="pod-cell">
                          <ApstraButton
                            type="pod"
                            label={result.pod}
                            url={generateApstraUrls.pod({
                              host: apstraApiService.getHost() || '10.85.192.59',
                              blueprintId: result.blueprintId,
                              nodeId: result.podId
                            })}
                          />
                        </td>
                        <td className="rack-cell">
                          <ApstraButton
                            type="rack"
                            label={result.rack}
                            url={generateApstraUrls.rack({
                              host: apstraApiService.getHost() || '10.85.192.59',
                              blueprintId: result.blueprintId,
                              nodeId: result.rackId
                            })}
                          />
                        </td>
                        <td className="system-cell">
                          <ApstraButton
                            type="system"
                            label={result.systemName}
                            url={result.systemUrl}
                          />
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
              <select
                value={ipBlueprintId}
                onChange={(e) => setIpBlueprintId(e.target.value)}
                className="search-input blueprint-select"
              >
                <option value="">Select Blueprint</option>
                {blueprints.map(bp => (
                  <option key={bp.id} value={bp.id}>
                    {bp.label}
                  </option>
                ))}
              </select>
              <button 
                onClick={handleIpSearch}
                disabled={isSearching || !ipSearchValue.trim()}
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
          {ipSearchResults.length > 0 && (
            <div className="search-results-table">
              <h4>IP Search Results ({ipSearchResults.length})</h4>
              <div className="results-table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Blueprint</th>
                      <th>Pod</th>
                      <th>Rack</th>
                      <th>System</th>
                      <th>Interface</th>
                      <th>IP Address</th>
                      <th>Search Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipSearchResults.map((result, index) => (
                      <tr key={`${result.blueprintId}-${result.interfaceId}-${index}`}>
                        <td className="blueprint-cell">
                          <ApstraButton
                            type="blueprint"
                            label={result.blueprintLabel}
                            url={result.blueprintUrl}
                          />
                        </td>
                        <td className="pod-cell">
                          <ApstraButton
                            type="pod"
                            label={result.pod}
                            url={generateApstraUrls.pod({
                              host: apstraApiService.getHost() || '10.85.192.59',
                              blueprintId: result.blueprintId,
                              nodeId: result.podId
                            })}
                          />
                        </td>
                        <td className="rack-cell">
                          <ApstraButton
                            type="rack"
                            label={result.rack}
                            url={generateApstraUrls.rack({
                              host: apstraApiService.getHost() || '10.85.192.59',
                              blueprintId: result.blueprintId,
                              nodeId: result.rackId
                            })}
                          />
                        </td>
                        <td className="system-cell">
                          <ApstraButton
                            type="system"
                            label={result.systemName}
                            url={result.systemUrl}
                          />
                        </td>
                        <td className="interface-cell">
                          <ApstraButton
                            type="interface"
                            label={formatInterfaceLabel(
                              result.interfaceIfName,
                              result.interfaceIfType,
                              result.interfaceName || result.interfaceId
                            )}
                            url={result.interfaceUrl}
                          />
                        </td>
                        <td className="ip-address">
                          {result.ipAddress}
                        </td>
                        <td className="search-result">
                          <button 
                            className="result-details-btn"
                            onClick={() => {
                              console.log('IP search result details:', result.searchResults);
                              alert('IP search result details logged to console');
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
                    <td className="blueprint-cell">
                      <ApstraButton
                        type="blueprint"
                        label={blueprint.label}
                        url={generateApstraUrls.blueprint({
                          host: apstraApiService.getHost() || '10.85.192.59',
                          blueprintId: blueprint.id
                        })}
                      />
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
                        disabled={dumpingBlueprintId === blueprint.id}
                        title={`Download blueprint ${blueprint.label} configuration as JSON`}
                      >
                        {dumpingBlueprintId === blueprint.id ? '⏳ Dumping...' : '📁 Dump'}
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