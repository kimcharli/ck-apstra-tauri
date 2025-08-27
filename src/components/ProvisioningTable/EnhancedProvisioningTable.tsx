/**
 * Enhanced Provisioning Table
 * 
 * New implementation using ProvisioningEntry structure with input/fetched field pairs
 */

import React, { useState, useMemo, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { NetworkConfigRow, ApstraConfig } from '../../types';
import { 
  ProvisioningEntry, 
  ProvisioningEntryCollection, 
  ProvisioningAnalysis,
  EntryComparison 
} from '../../types/provisioningEntry';
import { ProvisioningEntryService } from '../../services/ProvisioningEntryService';
import { getBlueprintIdByLabel } from '../../utils/blueprintMapping';
import { apstraApiService } from '../../services/ApstraApiService';
import './ProvisioningTable.css';

interface EnhancedProvisioningTableProps {
  data: NetworkConfigRow[];
  isLoading: boolean;
  onProvision: (selectedRows: NetworkConfigRow[]) => void;
  onDataUpdate?: (updatedData: NetworkConfigRow[]) => void;
  apstraConfig?: ApstraConfig | null;
}

const EnhancedProvisioningTable: React.FC<EnhancedProvisioningTableProps> = ({
  data,
  isLoading,
  onProvision,
  onDataUpdate,
  apstraConfig
}) => {
  // Core state
  const [entries, setEntries] = useState<ProvisioningEntryCollection>(new Map());
  const [analysis, setAnalysis] = useState<ProvisioningAnalysis | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState('');
  const [isComparingData, setIsComparingData] = useState(false);
  const [viewMode, setViewMode] = useState<'input' | 'fetched' | 'comparison'>('input');

  // Initialize entries from NetworkConfigRow data
  useEffect(() => {
    const newEntries = ProvisioningEntryService.fromNetworkConfigRows(data);
    setEntries(newEntries);
    
    // Reset analysis when data changes
    setAnalysis(null);
    setSelectedEntries(new Set());
  }, [data]);

  // Fetch and Compare functionality
  const handleFetchAndCompare = async () => {
    if (!apstraConfig) {
      alert('Please configure Apstra connection first');
      return;
    }

    setIsComparingData(true);
    
    try {
      // Get blueprint ID
      const blueprintId = getBlueprintIdByLabel(apstraConfig.blueprint_name || '');
      if (!blueprintId) {
        throw new Error(`Blueprint not found: ${apstraConfig.blueprint_name}`);
      }

      // Get unique switch labels for optimization
      const uniqueSwitchLabels = Array.from(new Set(
        Array.from(entries.values()).map(entry => entry.switchName)
      )).filter(Boolean);

      console.log(`🔍 Fetching connectivity data for ${uniqueSwitchLabels.length} switches in blueprint ${blueprintId}`);

      // Query Apstra using connectivity-templates-query only (comprehensive query with CT data)
      const connectivityResponse = await apstraApiService.queryConnectivity(blueprintId, uniqueSwitchLabels);

      // Transform API results to our expected format
      const apiDataMap = transformApiResults(connectivityResponse.items);

      // Merge API data with existing entries
      const updatedEntries = ProvisioningEntryService.mergeApiData(entries, apiDataMap);
      
      // Analyze the updated entries
      const newAnalysis = ProvisioningEntryService.analyzeProvisioning(updatedEntries);

      setEntries(updatedEntries);
      setAnalysis(newAnalysis);

      // Convert back to NetworkConfigRow format for parent component
      if (onDataUpdate) {
        const updatedRows = ProvisioningEntryService.toNetworkConfigRows(updatedEntries);
        onDataUpdate(updatedRows);
      }

      console.log(`✅ Analysis complete:`, {
        total: newAnalysis.totalEntries,
        completeMatches: newAnalysis.completeMatches,
        partialMatches: newAnalysis.partialMatches,
        inputOnly: newAnalysis.inputOnlyEntries,
        fetchedOnly: newAnalysis.fetchedOnlyEntries
      });

    } catch (error: any) {
      console.error('Failed to fetch and compare data:', error);
      alert(`Failed to fetch data: ${error.message}`);
    } finally {
      setIsComparingData(false);
    }
  };

  // Transform API results to match our expected format
  const transformApiResults = (apiResults: any[]): Map<string, any> => {
    const apiDataMap = new Map<string, any>();
    
    // Use the same logic as the original component for API data merging
    apiResults.forEach((item) => {
      const switchName = item.switch?.label || item.switch?.hostname;
      const switchInterface = item.switch_intf?.if_name || item.intf1?.if_name;
      
      if (switchName && switchInterface) {
        const connectionKey = `${switchName}-${switchInterface}`;
        
        const existingData = apiDataMap.get(connectionKey);
        if (existingData) {
          // Merge multiple chunks for the same connection
          const mergedData = {
            ...existingData,
            ...item,
            // Preserve critical nested objects
            link1: existingData.link1 || item.link1,
            switch: existingData.switch || item.switch,
            server: existingData.server || item.server,
            switch_intf: existingData.switch_intf || item.switch_intf,
            server_intf: existingData.server_intf || item.server_intf,
            ae1: existingData.ae1 || item.ae1,
            evpn1: existingData.evpn1 || item.evpn1,
            
            // Handle CT data collection and deduplication
            ct_names: mergeCTData(existingData.ct_names, item.ct_names, existingData.CT?.label, item.CT?.label),
          };
          
          apiDataMap.set(connectionKey, mergedData);
        } else {
          apiDataMap.set(connectionKey, item);
        }
      }
    });
    
    return apiDataMap;
  };

  // Helper function to merge CT data
  const mergeCTData = (existingCTs?: string, newCTs?: string, existingCTLabel?: string, newCTLabel?: string): string => {
    const allCTs = [existingCTs, newCTs, existingCTLabel, newCTLabel]
      .filter(ct => ct && ct.trim() !== '')
      .flatMap(ct => ct!.split(',').map(c => c.trim()))
      .filter(ct => ct !== '');
    
    return [...new Set(allCTs)].join(',');
  };

  // Filter entries based on search text
  const filteredEntries = useMemo(() => {
    if (!filterText.trim()) return Array.from(entries.values());
    
    const searchText = filterText.toLowerCase();
    return Array.from(entries.values()).filter(entry => 
      entry.switchName.toLowerCase().includes(searchText) ||
      entry.switchInterface.toLowerCase().includes(searchText) ||
      (entry.server.name_input?.toLowerCase().includes(searchText)) ||
      (entry.server.name_fetched?.toLowerCase().includes(searchText))
    );
  }, [entries, filterText]);

  // Handle entry selection
  const handleEntrySelection = (connectionKey: string, selected: boolean) => {
    const newSelected = new Set(selectedEntries);
    if (selected) {
      newSelected.add(connectionKey);
    } else {
      newSelected.delete(connectionKey);
    }
    setSelectedEntries(newSelected);
  };

  // Handle provisioning
  const handleProvision = () => {
    const selectedEntryObjects = Array.from(selectedEntries)
      .map(key => entries.get(key))
      .filter((entry): entry is ProvisioningEntry => entry !== undefined);
    
    const networkConfigRows = ProvisioningEntryService.toNetworkConfigRows(
      new Map(selectedEntryObjects.map(entry => [entry.connectionKey, entry]))
    );
    
    onProvision(networkConfigRows);
  };

  // Render field with input/fetched comparison
  const renderComparisonField = (
    inputValue?: any, 
    fetchedValue?: any, 
    fieldName?: string
  ): JSX.Element => {
    const inputStr = inputValue?.toString() || '';
    const fetchedStr = fetchedValue?.toString() || '';
    const hasInput = inputStr !== '';
    const hasFetched = fetchedStr !== '';
    const matches = inputStr === fetchedStr;

    // Generate tooltip text for mismatches
    const getTooltipText = (): string => {
      if (!hasFetched) {
        return `Not found in Apstra Blueprint`;
      } else if (!hasInput) {
        return `Found in Apstra: "${fetchedStr}"`;
      } else if (!matches) {
        return `Apstra has: "${fetchedStr}" (differs from Excel: "${inputStr}")`;
      }
      return `Matches Apstra: "${fetchedStr}"`;
    };

    if (viewMode === 'input') {
      // In input mode, show tooltip for mismatches or missing data
      const needsTooltip = hasFetched && (!hasInput || !matches);
      return (
        <span 
          className={!hasInput ? 'field-empty' : (matches ? '' : 'field-has-difference')}
          title={needsTooltip ? getTooltipText() : undefined}
          style={{ cursor: needsTooltip ? 'help' : 'default' }}
        >
          {inputStr || 'N/A'}
        </span>
      );
    } else if (viewMode === 'fetched') {
      // In fetched mode, show tooltip for mismatches or missing data
      const needsTooltip = hasInput && (!hasFetched || !matches);
      return (
        <span 
          className={!hasFetched ? 'field-empty' : (matches ? '' : 'field-has-difference')}
          title={needsTooltip ? `Excel has: "${inputStr}" ${!hasFetched ? '(not found in Apstra)' : '(differs from Apstra)'}` : undefined}
          style={{ cursor: needsTooltip ? 'help' : 'default' }}
        >
          {fetchedStr || 'N/A'}
        </span>
      );
    } else {
      // Comparison mode - show detailed tooltips
      return (
        <div className="field-comparison">
          <div 
            className={`input-value ${!hasInput ? 'field-empty' : matches ? 'field-match' : 'field-mismatch'}`}
            title={hasInput ? `Excel value: "${inputStr}"${hasFetched ? (matches ? ' (matches Apstra)' : ` (Apstra has: "${fetchedStr}")`) : ' (not in Apstra)'}` : undefined}
          >
            <small>Input:</small> {inputStr || 'N/A'}
          </div>
          <div 
            className={`fetched-value ${!hasFetched ? 'field-empty' : matches ? 'field-match' : 'field-mismatch'}`}
            title={hasFetched ? `Apstra value: "${fetchedStr}"${hasInput ? (matches ? ' (matches Excel)' : ` (Excel has: "${inputStr}")`) : ' (not in Excel)'}` : undefined}
          >
            <small>Fetched:</small> {fetchedStr || 'N/A'}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="enhanced-provisioning-table">
      {/* Control Panel */}
      <div className="table-controls">
        <div className="left-controls">
          <input
            type="text"
            placeholder="Filter entries..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{ width: '300px', padding: '8px' }}
          />
          
          <div className="view-mode-selector">
            <label>View: </label>
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value as any)}
              style={{ padding: '8px' }}
            >
              <option value="input">Input Only</option>
              <option value="fetched">Fetched Only</option>
              <option value="comparison">Input vs Fetched</option>
            </select>
          </div>
        </div>
        
        <div className="right-controls">
          <button
            onClick={handleFetchAndCompare}
            disabled={isComparingData || !apstraConfig}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            {isComparingData ? 'Fetching...' : 'Fetch & Compare'}
          </button>
          
          <button
            onClick={handleProvision}
            disabled={selectedEntries.size === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Provision Selected ({selectedEntries.size})
          </button>
        </div>
      </div>

      {/* Analysis Summary */}
      {analysis && (
        <div className="analysis-summary" style={{ 
          margin: '10px 0', 
          padding: '10px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '4px',
          fontSize: '0.9rem'
        }}>
          <strong>Analysis Summary:</strong> {' '}
          <span style={{ color: '#28a745' }}>✅ {analysis.completeMatches} complete matches</span>, {' '}
          <span style={{ color: '#ffc107' }}>⚠️ {analysis.partialMatches} partial matches</span>, {' '}
          <span style={{ color: '#6c757d' }}>📄 {analysis.inputOnlyEntries} input only</span>, {' '}
          <span style={{ color: '#17a2b8' }}>🔷 {analysis.fetchedOnlyEntries} blueprint only</span>
        </div>
      )}

      {/* Table */}
      <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        <table className="provisioning-table">
          <thead>
            <tr>
              <th width="40px">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEntries(new Set(filteredEntries.map(e => e.connectionKey)));
                    } else {
                      setSelectedEntries(new Set());
                    }
                  }}
                  checked={selectedEntries.size === filteredEntries.length && filteredEntries.length > 0}
                />
              </th>
              <th width="120px">Switch Name</th>
              <th width="100px">Switch Interface</th>
              <th width={viewMode === 'comparison' ? '200px' : '120px'}>Server Name</th>
              <th width={viewMode === 'comparison' ? '200px' : '100px'}>Server Interface</th>
              <th width={viewMode === 'comparison' ? '160px' : '80px'}>Speed</th>
              <th width={viewMode === 'comparison' ? '200px' : '100px'}>LAG Name</th>
              <th width={viewMode === 'comparison' ? '160px' : '80px'}>LAG Mode</th>
              <th width={viewMode === 'comparison' ? '240px' : '120px'}>CTs</th>
              <th width="70px">External</th>
              <th width="100px">Source</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <tr key={entry.connectionKey}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedEntries.has(entry.connectionKey)}
                    onChange={(e) => handleEntrySelection(entry.connectionKey, e.target.checked)}
                  />
                </td>
                <td>{entry.switchName}</td>
                <td>{entry.switchInterface}</td>
                <td>{renderComparisonField(entry.server.name_input, entry.server.name_fetched, 'server_name')}</td>
                <td>{renderComparisonField(entry.server.interface_input, entry.server.interface_fetched, 'server_interface')}</td>
                <td>{renderComparisonField(entry.network.speed_input, entry.network.speed_fetched, 'speed')}</td>
                <td>{renderComparisonField(entry.lag.name_input, entry.lag.name_fetched, 'lag_name')}</td>
                <td>{renderComparisonField(entry.lag.mode_input, entry.lag.mode_fetched, 'lag_mode')}</td>
                <td>{renderComparisonField(entry.connectivity.templates_input, entry.connectivity.templates_fetched, 'templates')}</td>
                <td>{renderComparisonField(entry.network.external_input, entry.network.external_fetched, 'external')}</td>
                <td>
                  <span className={`source-badge source-${entry.metadata.source}`}>
                    {entry.metadata.source.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredEntries.length === 0 && !isLoading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          {filterText ? 'No entries match your filter' : 'No provisioning entries to display'}
        </div>
      )}
    </div>
  );
};

export default EnhancedProvisioningTable;