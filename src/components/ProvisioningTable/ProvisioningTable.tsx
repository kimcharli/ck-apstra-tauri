import React, { useState, useMemo } from 'react';
import { NetworkConfigRow, ApstraConfig } from '../../types';
import { renderApstraSystemButtonWithLookup } from '../../utils/apstraLinkHelpers';
import { getBlueprintIdByLabel } from '../../utils/blueprintMapping';
import { apstraApiService } from '../../services/ApstraApiService';
import './ProvisioningTable.css';

interface ProvisioningTableProps {
  data: NetworkConfigRow[];
  isLoading: boolean;
  onProvision: (selectedRows: NetworkConfigRow[]) => void;
  onDataUpdate?: (updatedData: NetworkConfigRow[]) => void;
  apstraConfig?: ApstraConfig | null;
}

// Interface for comparison results
interface ComparisonResult {
  status: 'match' | 'missing' | 'extra';
  tableRow?: NetworkConfigRow;
  apiData?: any;
  message: string;
  fieldMatches?: {
    server_ifname?: boolean;
    link_speed?: boolean;
    link_group_lag_mode?: boolean;
    link_group_ct_names?: boolean;
    is_external?: boolean;
  };
}

// Interface for comparison summary
interface ComparisonSummary {
  matches: number;
  missing: number;
  extra: number;
  newRowsAdded: number;
}

const ProvisioningTable: React.FC<ProvisioningTableProps> = ({
  data,
  isLoading,
  onProvision,
  onDataUpdate,
  apstraConfig
}) => {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<keyof NetworkConfigRow | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [comparisonSummary, setComparisonSummary] = useState<ComparisonSummary | null>(null);
  const [isComparingData, setIsComparingData] = useState(false);
  const [showComparisonResults, setShowComparisonResults] = useState(false);
  const [groupByServer, setGroupByServer] = useState(true);
  const [apiDataMap, setApiDataMap] = useState<Map<string, any>>(new Map());

  // Group connections by server to avoid scattering the same server's links
  const groupConnectionsByServer = (data: NetworkConfigRow[]): NetworkConfigRow[] => {
    // Create a map to group rows by server_label
    const serverGroups = new Map<string, NetworkConfigRow[]>();
    
    data.forEach(row => {
      const serverKey = row.server_label || 'Unknown Server';
      if (!serverGroups.has(serverKey)) {
        serverGroups.set(serverKey, []);
      }
      serverGroups.get(serverKey)!.push(row);
    });

    // Sort each server group by switch_label and switch_ifname for consistent ordering
    const groupedData: NetworkConfigRow[] = [];
    
    // Sort server keys alphabetically for predictable ordering
    const sortedServerKeys = Array.from(serverGroups.keys()).sort();
    
    sortedServerKeys.forEach(serverKey => {
      const serverConnections = serverGroups.get(serverKey)!;
      
      // Sort connections within each server group
      const sortedConnections = serverConnections.sort((a, b) => {
        // First sort by switch_label
        const switchCompare = (a.switch_label || '').localeCompare(b.switch_label || '');
        if (switchCompare !== 0) return switchCompare;
        
        // Then sort by switch_ifname
        return (a.switch_ifname || '').localeCompare(b.switch_ifname || '');
      });
      
      groupedData.push(...sortedConnections);
    });

    return groupedData;
  };

  // Enhanced column definitions with better headers and formatting
  const columns = [
    { key: 'switch_label', header: 'Switch\nName', width: '120px', sortable: true },
    { key: 'switch_ifname', header: 'Switch\nInterface', width: '100px', sortable: true },
    { key: 'server_label', header: 'Server\nName', width: '120px', sortable: true },
    { key: 'server_ifname', header: 'Server\nInterface', width: '100px', sortable: true },
    { key: 'link_speed', header: 'Link\nSpeed', width: '80px', sortable: true },
    { key: 'is_external', header: 'External', width: '70px', sortable: true },
    { key: 'link_group_ifname', header: 'LAG/Bond\nName', width: '100px', sortable: true },
    { key: 'link_group_lag_mode', header: 'LAG\nMode', width: '80px', sortable: true },
    { key: 'link_group_ct_names', header: 'Connectivity\nTemplate', width: '120px', sortable: true },
    { key: 'server_tags', header: 'Server\nTags', width: '100px', sortable: false },
    { key: 'link_tags', header: 'Link\nTags', width: '100px', sortable: false },
    { key: 'comment', header: 'Comments', width: '150px', sortable: false }
  ];

  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // Apply text filter
    if (filterText) {
      const searchText = filterText.toLowerCase();
      filtered = data.filter(row => 
        Object.values(row).some(value => 
          value?.toString().toLowerCase().includes(searchText)
        )
      );
    }

    // Apply sorting or server grouping
    if (sortField && !groupByServer) {
      // When user explicitly sorts and grouping is disabled, apply normal sorting
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    } else if (groupByServer) {
      // Apply server grouping (default behavior)
      filtered = groupConnectionsByServer(filtered);
    } else {
      // No sorting or grouping, return as-is
      filtered = [...filtered];
    }

    return filtered;
  }, [data, filterText, sortField, sortDirection, groupByServer]);

  const handleSort = (field: keyof NetworkConfigRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRowSelect = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === filteredAndSortedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredAndSortedData.map((_, index) => index)));
    }
  };

  const handleProvision = () => {
    const rowsToProvision = filteredAndSortedData.filter((_, index) => selectedRows.has(index));
    onProvision(rowsToProvision);
  };

  // Helper function to normalize speed values for comparison
  const normalizeSpeed = (speed: string): string => {
    if (!speed) return '';
    // Remove common suffixes and normalize to consistent format
    return speed.replace(/\s*(Gbps|gbps|GB|gb|G|g)\s*$/i, 'G')
                .replace(/\s*(Mbps|mbps|MB|mb|M|m)\s*$/i, 'M')
                .replace(/\s+/g, '')
                .toLowerCase();
  };

  const handleFetchAndCompare = async () => {
    setIsComparingData(true);
    setComparisonResults([]);
    
    try {
      // Get Apstra host and blueprint ID
      const apstraHost = apstraApiService.getHost();
      if (!apstraHost) {
        alert('No Apstra connection available. Please configure Apstra connection first.');
        return;
      }

      const defaultBlueprintName = 'DH4-Colo2';
      const blueprintId = getBlueprintIdByLabel(defaultBlueprintName);
      if (!blueprintId) {
        alert(`Blueprint ${defaultBlueprintName} not found in mapping.`);
        return;
      }

      // Extract unique switch labels from table data for query optimization
      const uniqueSwitchLabels = [...new Set(data.map(row => row.switch_label).filter(Boolean))] as string[];
      

      // Query Apstra for connectivity data with switch label filtering for optimization
      const connectivityResponse = await apstraApiService.queryConnectivity(blueprintId, uniqueSwitchLabels);

      // Compare the API results with table data and add missing rows
      const { comparisonResults, newRowsAdded, updatedData, apiDataMap: responseApiDataMap } = compareAndUpdateConnectivityData(data, connectivityResponse.items);
      
      setComparisonResults(comparisonResults);
      setApiDataMap(responseApiDataMap);
      setComparisonSummary({
        matches: comparisonResults.filter(r => r.status === 'match').length,
        missing: comparisonResults.filter(r => r.status === 'missing').length,
        extra: comparisonResults.filter(r => r.status === 'extra').length,
        newRowsAdded
      });
      setShowComparisonResults(true);

      // Update the parent component's data if new rows were added
      if (newRowsAdded > 0 && onDataUpdate) {
        onDataUpdate(updatedData);
      }

      console.log('✅ Comparison completed:', {
        totalTableRows: data.length,
        totalApiResults: connectivityResponse.items.length,
        comparisonResults: comparisonResults.length,
        newRowsAdded
      });

    } catch (error) {
      console.error('❌ Fetch & Compare failed:', error);
      alert(`Fetch & Compare failed: ${error}`);
    } finally {
      setIsComparingData(false);
    }
  };

  const compareAndUpdateConnectivityData = (tableData: NetworkConfigRow[], apiResults: any[]): {
    comparisonResults: ComparisonResult[];
    newRowsAdded: number;
    updatedData: NetworkConfigRow[];
    apiDataMap: Map<string, any>;
  } => {
    const results: ComparisonResult[] = [];
    const newRows: NetworkConfigRow[] = [];
    
    // Create a map of API data with interface-level keys and merge multiple chunks
    const apiConnectionsMap = new Map<string, any>();
    
    apiResults.forEach((item) => {
      // Extract switch and server information from API result
      const switchName = item.switch?.label || item.switch?.hostname;
      const serverName = item.server?.label || item.server?.hostname;
      const switchInterface = item.switch_intf?.if_name || item.intf1?.if_name;
      const serverInterface = item.server_intf?.if_name || item.intf2?.if_name;
      
      if (switchName && serverName && switchInterface) {
        // Use switch_label + server_label + switch_ifname as key for duplicate detection
        const connectionKey = `${switchName}-${serverName}-${switchInterface}`;
        
        // Check if this connection already exists in our map
        const existingData = apiConnectionsMap.get(connectionKey);
        
        if (existingData) {
          // Merge the data - combine all fields from both chunks
          const mergedRawData = {
            ...existingData.rawData,
            ...item,
            // Ensure critical fields are preserved from both chunks
            link1: existingData.rawData?.link1 || item.link1,
            switch: existingData.rawData?.switch || item.switch,
            server: existingData.rawData?.server || item.server,
            switch_intf: existingData.rawData?.switch_intf || item.switch_intf,
            server_intf: existingData.rawData?.server_intf || item.server_intf,
            intf1: existingData.rawData?.intf1 || item.intf1,
            intf2: existingData.rawData?.intf2 || item.intf2
          };
          
          // If this chunk has speed data and the existing doesn't, use it
          if (item.link1?.speed && !existingData.rawData?.link1?.speed) {
            mergedRawData.link1 = { ...mergedRawData.link1, speed: item.link1.speed };
          }
          
          console.log(`🔗 Merging API data chunks for ${connectionKey}:`, {
            existing: existingData.rawData,
            new: item,
            merged: mergedRawData
          });
          
          apiConnectionsMap.set(connectionKey, {
            switchName,
            serverName,
            switchInterface: switchInterface || existingData.switchInterface,
            serverInterface: serverInterface || existingData.serverInterface,
            rawData: mergedRawData
          });
        } else {
          // First time seeing this connection
          apiConnectionsMap.set(connectionKey, {
            switchName,
            serverName,
            switchInterface,
            serverInterface,
            rawData: item
          });
        }
      }
    });

    // Create a set of existing table connections for duplicate prevention
    const existingConnections = new Set<string>();
    tableData.forEach(row => {
      if (row.switch_label && row.server_label && row.switch_ifname) {
        const connectionKey = `${row.switch_label}-${row.server_label}-${row.switch_ifname}`;
        existingConnections.add(connectionKey);
      }
    });

    // Check each table row against API data
    tableData.forEach((row) => {
      const switchName = row.switch_label;
      const serverName = row.server_label;
      const switchInterface = row.switch_ifname;
      const serverInterface = row.server_ifname;

      if (!switchName || !serverName) {
        results.push({
          status: 'missing',
          tableRow: row,
          message: 'Incomplete data - missing switch or server name'
        });
        return;
      }

      // Try to find matching connection in API data using interface-level key
      const connectionKey = `${switchName}-${serverName}-${switchInterface || ''}`;
      const apiData = apiConnectionsMap.get(connectionKey);
      
      // Log only missing connections for troubleshooting
      if (!apiData) {
        import('../../services/LoggingService').then(({ logger }) => {
          logger.logWarn('DATA_CHANGE', `No API match found for Excel connection`, {
            connectionKey,
            switchName,
            serverName,
            switchInterface
          });
        });
      }
      
      if (apiData) {
        // Found a match - use unified field comparison function
        const fieldMatches = compareFields(row, apiData);
        

        results.push({
          status: 'match',
          tableRow: row,
          apiData: apiData,
          fieldMatches: fieldMatches,
          message: `✅ Connection found: ${switchName}[${switchInterface || 'N/A'}] ↔ ${serverName}[${serverInterface || 'N/A'}]`
        });
        apiConnectionsMap.delete(connectionKey); // Remove from map so we can find extras
      } else {
        results.push({
          status: 'missing',
          tableRow: row,
          message: `❌ Connection not found in Apstra: ${switchName}[${switchInterface || 'N/A'}] ↔ ${serverName}`
        });
      }
    });

    // Any remaining items in apiConnectionsMap are extra connections not in the table
    // Add these as new rows to the provisioning table with "Only in Blueprint" marking
    apiConnectionsMap.forEach((apiData, connectionKey) => {
      // Only add if this specific connection doesn't already exist in table
      if (!existingConnections.has(connectionKey)) {
        results.push({
          status: 'extra',
          apiData: apiData,
          message: `⚠️ Extra connection in Apstra: ${apiData.switchName}[${apiData.switchInterface || 'N/A'}] ↔ ${apiData.serverName}[${apiData.serverInterface || 'N/A'}]`
        });

        // Create new row for the extra connection found in API
        // Extract speed and other data from the merged API result
        const apiSpeed = apiData.rawData?.link1?.speed || '';
        const apiLagMode = apiData.rawData?.lag_mode || '';
        const apiCtNames = apiData.rawData?.ct_names || '';
        
        const newRow: NetworkConfigRow = {
          blueprint: 'DH4-Colo2', // Use the same blueprint we queried
          switch_label: apiData.switchName,
          switch_ifname: apiData.switchInterface || '',
          server_label: apiData.serverName,
          server_ifname: apiData.serverInterface || '',
          link_speed: apiSpeed, // Populate from merged API data
          link_group_lag_mode: apiLagMode,
          link_group_ct_names: apiCtNames,
          link_group_ifname: '',
          is_external: false,
          server_tags: '',
          switch_tags: '',
          link_tags: '',
          comment: 'Only in Blueprint' // Mark as blueprint-only connection
        };
        
        newRows.push(newRow);
      }
    });

    // Store the API data map for field-level comparisons BEFORE we start deleting from apiConnectionsMap
    const finalApiDataMap = new Map<string, any>();
    
    // First, capture ALL the merged data from apiConnectionsMap before any deletions
    [...apiConnectionsMap.entries()].forEach(([connectionKey, connectionData]) => {
      finalApiDataMap.set(connectionKey, connectionData.rawData);
    });
    
    // Also capture the original connection data from earlier processing for extra safety
    results.forEach(result => {
      if (result.status === 'match' && result.tableRow && result.apiData) {
        const row = result.tableRow;
        const connectionKey = `${row.switch_label}-${row.server_label}-${row.switch_ifname}`;
        finalApiDataMap.set(connectionKey, result.apiData.rawData || result.apiData);
      }
    });

    // Now combine original data with new rows and group by server
    const combinedData = [...tableData, ...newRows];
    const groupedData = groupConnectionsByServer(combinedData);

    return {
      comparisonResults: results,
      newRowsAdded: newRows.length,
      updatedData: groupedData,
      apiDataMap: finalApiDataMap
    };
  };

  // Unified field comparison function - single source of truth for all field matching logic
  const compareFields = (row: NetworkConfigRow, apiData: any): {
    server_label: boolean;
    server_ifname: boolean;
    link_speed: boolean;
    link_group_lag_mode: boolean;
    link_group_ct_names: boolean;
    is_external: boolean;
  } => {
    if (!apiData) {
      return {
        server_label: false,
        server_ifname: false,
        link_speed: false,
        link_group_lag_mode: false,
        link_group_ct_names: false,
        is_external: false
      };
    }

    // Extract API values with proper fallback paths
    const apiServerInterface = apiData.server_intf?.if_name || apiData.intf2?.if_name || apiData.serverInterface || '';
    const apiSpeedRaw = apiData.link1?.speed || apiData.rawData?.link1?.speed || '';
    const apiLagMode = apiData.lag_mode || apiData.rawData?.lag_mode || '';
    const apiCtNames = apiData.ct_names || apiData.rawData?.ct_names || '';
    const apiExternal = apiData.is_external || apiData.rawData?.is_external || false;

    // Normalize speeds for comparison
    const tableSpeedNormalized = normalizeSpeed(row.link_speed || '');
    const apiSpeedNormalized = normalizeSpeed(apiSpeedRaw);

    return {
      server_label: true, // Server exists in API data if we have apiData
      server_ifname: (row.server_ifname || '') === apiServerInterface,
      link_speed: tableSpeedNormalized === apiSpeedNormalized,
      link_group_lag_mode: (row.link_group_lag_mode || '') === apiLagMode,
      link_group_ct_names: (row.link_group_ct_names || '') === apiCtNames,
      is_external: row.is_external === apiExternal
    };
  };

  // Helper function to check if a specific field matches API data (currently unused but kept for potential future use)
  // const hasFieldMatch = (row: NetworkConfigRow, columnKey: string): boolean => {
  //   const apiData = getServerApiData(row);
  //   const fieldMatches = compareFields(row, apiData);
  //   
  //   return fieldMatches[columnKey as keyof typeof fieldMatches] || false;
  // };

  // Helper function to get server data from API results (for rendering as button)
  const getServerApiData = (row: NetworkConfigRow): any | null => {
    if (!row.switch_label || !row.server_label || !row.switch_ifname) return null;
    
    const connectionKey = `${row.switch_label}-${row.server_label}-${row.switch_ifname}`;
    return apiDataMap.get(connectionKey) || null;
  };

  const formatCellValue = (value: any, columnKey: string): string => {
    if (value === null || value === undefined) return '';
    
    switch (columnKey) {
      case 'is_external':
        return value === true ? 'Yes' : value === false ? 'No' : '';
      case 'link_speed':
        // Don't add Gbps if the value already has a unit (G, M, etc.)
        if (value && typeof value === 'string' && /[GM]$/.test(value)) {
          return value;
        }
        return value ? `${value} Gbps` : '';
      case 'comment':
        // Add visual indicator for blueprint-only connections
        if (value === 'Only in Blueprint') {
          return '🔗 Only in Blueprint';
        }
        return value.toString();
      default:
        return value.toString();
    }
  };

  const getCellClass = (value: any, columnKey: string, row?: NetworkConfigRow): string => {
    let baseClass = 'table-cell';
    
    if (columnKey === 'is_external') {
      baseClass += value === true ? ' external-yes' : value === false ? ' external-no' : '';
    }
    
    if (!value) {
      baseClass += ' empty-cell';
    }

    // Add special styling for "Only in Blueprint" rows (takes precedence)
    if (row?.comment === 'Only in Blueprint') {
      baseClass += ' blueprint-only';
      return baseClass; // Return early to avoid other color coding
    }

    // For Excel-sourced entries, determine state based on API data availability
    if (row) {
      const apiData = getServerApiData(row);
      const hasApiDataAvailable = apiDataMap.size > 0; // Check if Fetch & Compare was run
      
      
      if (hasApiDataAvailable && apiData) {
        // We have API data to compare against - determine match/mismatch
        const fieldMatches = compareFields(row, apiData);
        const hasMatch = fieldMatches[columnKey as keyof typeof fieldMatches] || false;
        
        if (hasMatch) {
          baseClass += ' field-match'; // Green for matches
        } else {
          // Only add mismatch styling for fields that should be compared
          const comparableFields = ['server_ifname', 'link_speed', 'link_group_lag_mode', 'link_group_ct_names', 'is_external'];
          if (comparableFields.includes(columnKey)) {
            baseClass += ' field-mismatch'; // Red for mismatches
          }
        }
      } else if (hasApiDataAvailable && !apiData) {
        // API data was fetched but no match found for this connection
        // This means it's missing from Apstra
        const comparableFields = ['switch_label', 'server_label', 'switch_ifname', 'server_ifname', 'link_speed', 'link_group_lag_mode', 'link_group_ct_names', 'is_external'];
        if (comparableFields.includes(columnKey)) {
          baseClass += ' field-missing'; // Orange for missing from Apstra
        }
      } else {
        // No API data fetched yet - show initial XLSX state
        const comparableFields = ['switch_label', 'server_label', 'switch_ifname', 'server_ifname', 'link_speed', 'link_group_lag_mode', 'link_group_ct_names', 'is_external'];
        if (comparableFields.includes(columnKey) && value) {
          baseClass += ' field-xlsx-pending'; // Light gray for initial XLSX state
        }
      }
    }
    
    return baseClass;
  };

  const renderCellContent = (row: NetworkConfigRow, columnKey: string): React.ReactNode => {
    const value = row[columnKey as keyof NetworkConfigRow];
    
    // Handle switch name column as clickable link
    if (columnKey === 'switch_label' && value) {
      const switchName = formatCellValue(value, columnKey);
      
      // Use same approach as ToolsPage - check if apstraApiService has connection
      const apstraHost = apstraApiService.getHost();
      
      if (apstraHost) {
        // Use default blueprint (same as ToolsPage uses for its default)
        // This matches the dropdown selection in ProvisioningPage defaulting to 'DH4-Colo2'
        const defaultBlueprintName = 'DH4-Colo2';
        const blueprintId = getBlueprintIdByLabel(defaultBlueprintName);
        
        if (blueprintId) {
          return renderApstraSystemButtonWithLookup(
            switchName,
            blueprintId,
            defaultBlueprintName,
            `Click to open switch ${switchName} in Apstra blueprint ${defaultBlueprintName}`
          );
        } else {
          console.log('❌ Blueprint ID not found for default blueprint:', defaultBlueprintName);
        }
      } else {
        console.log('❌ No Apstra connection available. ApstraApiService host:', apstraHost);
        console.log('💡 To enable clickable switch links: Go to "1. Apstra Connection" and configure your Apstra settings');
      }
    }

    // Handle server name column as clickable link if server exists in API data
    if (columnKey === 'server_label' && value) {
      const serverName = formatCellValue(value, columnKey);
      const serverApiData = getServerApiData(row);
      
      if (serverApiData) {
        // Extract the server node ID from the API result
        const serverNodeId = serverApiData.server?.id;
        
        // Use same approach as switch names
        const apstraHost = apstraApiService.getHost();
        
        if (apstraHost) {
          const defaultBlueprintName = 'DH4-Colo2';
          const blueprintId = getBlueprintIdByLabel(defaultBlueprintName);
          
          if (blueprintId) {
            return renderApstraSystemButtonWithLookup(
              serverName,
              blueprintId,
              defaultBlueprintName,
              `Click to open server ${serverName} in Apstra blueprint ${defaultBlueprintName}`,
              serverNodeId // Pass the preknown server node ID
            );
          } else {
            console.log('❌ Blueprint ID not found for default blueprint:', defaultBlueprintName);
          }
        } else {
          console.log('❌ No Apstra connection available for server button. ApstraApiService host:', apstraHost);
        }
      }
    }
    
    // For all other columns, use the standard formatting
    return formatCellValue(value, columnKey);
  };

  if (isLoading) {
    return (
      <div className="provisioning-table-container">
        <div className="loading-message">Loading network configuration data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="provisioning-table-container">
        <div className="no-data-message">No data available. Please upload and parse an Excel file.</div>
      </div>
    );
  }

  return (
    <div className="provisioning-table-container">
      <div className="table-controls">
        <div className="table-info">
          <span className="data-count">
            Showing {filteredAndSortedData.length} of {data.length} rows
            {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
          </span>
          {apstraConfig && (
            <span className="target-info">
              Target: {apstraConfig.host} ({apstraConfig.blueprint_name})
            </span>
          )}
        </div>
        
        <div className="table-actions">
          <input
            type="text"
            placeholder="Filter data..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="filter-input"
          />
          <label className="group-toggle">
            <input
              type="checkbox"
              checked={groupByServer}
              onChange={(e) => setGroupByServer(e.target.checked)}
            />
            Group by Server
          </label>
          <button
            onClick={handleFetchAndCompare}
            disabled={isComparingData || data.length === 0}
            className="fetch-compare-button"
            title="Fetch current configuration from Apstra and compare with table data"
          >
            {isComparingData ? '🔄 Comparing...' : '🔍 Fetch & Compare'}
          </button>
          <button
            onClick={handleProvision}
            disabled={selectedRows.size === 0 || !apstraConfig}
            className="provision-button"
          >
            Provision Selected ({selectedRows.size})
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="provisioning-table">
          <thead>
            <tr>
              <th className="select-column">
                <input
                  type="checkbox"
                  checked={selectedRows.size === filteredAndSortedData.length && filteredAndSortedData.length > 0}
                  onChange={handleSelectAll}
                  title="Select all visible rows"
                />
              </th>
              {columns.map(column => (
                <th 
                  key={column.key} 
                  style={{ minWidth: column.width }}
                  className={column.sortable ? 'sortable' : ''}
                  onClick={column.sortable ? () => handleSort(column.key as keyof NetworkConfigRow) : undefined}
                >
                  <div className="header-content">
                    {column.header.split('\n').map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                    {column.sortable && sortField === column.key && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedData.map((row, index) => (
              <tr 
                key={index}
                className={selectedRows.has(index) ? 'selected' : ''}
                onClick={() => handleRowSelect(index)}
              >
                <td className="select-column">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(index)}
                    onChange={() => handleRowSelect(index)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                {columns.map(column => (
                  <td 
                    key={column.key}
                    className={getCellClass(row[column.key as keyof NetworkConfigRow], column.key, row)}
                    title={formatCellValue(row[column.key as keyof NetworkConfigRow], column.key)}
                  >
                    {renderCellContent(row, column.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Comparison Results Section */}
      {showComparisonResults && comparisonResults.length > 0 && (
        <div className="comparison-results">
          <div className="comparison-header">
            <h3>🔍 Fetch & Compare Results</h3>
            <button 
              onClick={() => setShowComparisonResults(false)}
              className="close-comparison"
              title="Close comparison results"
            >
              ✕
            </button>
          </div>
          
          <div className="comparison-summary">
            <div className="comparison-stats">
              <span className="stat match">
                ✅ Matches: {comparisonSummary?.matches || 0}
              </span>
              <span className="stat missing">
                ❌ Missing: {comparisonSummary?.missing || 0}
              </span>
              <span className="stat extra">
                ⚠️ Extra: {comparisonSummary?.extra || 0}
              </span>
              {comparisonSummary && comparisonSummary.newRowsAdded > 0 && (
                <span className="stat added">
                  ➕ Added to Table: {comparisonSummary.newRowsAdded}
                </span>
              )}
            </div>
          </div>

          <div className="comparison-details">
            <h4>Detailed Results:</h4>
            <ul className="comparison-list">
              {comparisonResults.map((result, index) => (
                <li key={index} className={`comparison-item ${result.status}`}>
                  <span className="comparison-message">{result.message}</span>
                  {result.status === 'match' && result.apiData && (
                    <div className="comparison-details-text">
                      API Interface: {result.apiData.switchInterface || 'N/A'} ↔ {result.apiData.serverInterface || 'N/A'}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="table-footer">
        <div className="provisioning-summary">
          <strong>Provisioning Summary:</strong>
          <ul>
            <li>Selected Rows: {selectedRows.size}</li>
            <li>Switches: {new Set(filteredAndSortedData.filter((_, i) => selectedRows.has(i)).map(r => r.switch_label).filter(Boolean)).size}</li>
            <li>Servers: {new Set(filteredAndSortedData.filter((_, i) => selectedRows.has(i)).map(r => r.server_label).filter(Boolean)).size}</li>
            {data.some(row => row.comment === 'Only in Blueprint') && (
              <li><span className="blueprint-legend">🔗 Blue highlighted rows: Connections found only in Blueprint (not in Excel)</span></li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProvisioningTable;