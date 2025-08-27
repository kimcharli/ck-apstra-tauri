import React, { useState, useMemo, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { NetworkConfigRow, ApstraConfig } from '../../types';
import { Table } from '../common/Table/Table';
import { useTable } from '../../hooks/useTable';
import { renderApstraSystemButtonWithLookup } from '../../utils/apstraLinkHelpers';
import { getBlueprintIdByLabel } from '../../utils/blueprintMapping';
import { apstraApiService } from '../../services/ApstraApiService';
import './ProvisioningTable.css';

// Enhanced conversion map types
interface FieldDefinition {
  display_name: string;
  description: string;
  data_type: string;
  is_required: boolean;
  is_key_field: boolean;
  ui_config: {
    column_width: number;
    sortable: boolean;
    filterable: boolean;
    hidden: boolean;
  };
}

interface EnhancedConversionMap {
  version: string;
  header_row: number;
  field_definitions: Record<string, FieldDefinition>;
}

// Column definition for the table
interface TableColumn {
  key: keyof NetworkConfigRow;
  header: string;
  width: string;
  sortable: boolean;
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

interface ProvisioningTableProps {
  data: NetworkConfigRow[];
  isLoading: boolean;
  onProvision: (selectedRows: NetworkConfigRow[]) => void;
  onDataUpdate?: (updatedData: NetworkConfigRow[]) => void;
  apstraConfig?: ApstraConfig | null;
}

const ProvisioningTable: React.FC<ProvisioningTableProps> = ({
  data,
  isLoading,
  onProvision,
  onDataUpdate,
  apstraConfig
}) => {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [filterText, setFilterText] = useState('');
  const [conversionMap, setConversionMap] = useState<EnhancedConversionMap | null>(null);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [comparisonSummary, setComparisonSummary] = useState<ComparisonSummary | null>(null);
  const [isComparingData, setIsComparingData] = useState(false);
  const [showComparisonResults, setShowComparisonResults] = useState(false);
  const [groupByServer, setGroupByServer] = useState(true);
  const [apiDataMap, setApiDataMap] = useState<Map<string, any>>(new Map());

  // Load the enhanced conversion map on component mount
  useEffect(() => {
    const loadConversionMap = async () => {
      try {
        const map = await invoke<EnhancedConversionMap>('load_enhanced_conversion_map', {
          filePath: null // Load default conversion map
        });
        setConversionMap(map);
      } catch (error) {
        console.error('Failed to load conversion map:', error);
        // Fall back to the hard-coded columns if conversion map fails
        setConversionMap(null);
      }
    };
    loadConversionMap();
  }, []);

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

  // Generate columns dynamically from conversion map or fallback to hard-coded
  const columns: TableColumn[] = useMemo(() => {
    if (conversionMap) {
      // Generate columns from conversion map field_definitions
      const fieldOrder = [
        'switch_label', 'switch_ifname', 'server_label', 'server_ifname',
        'link_speed', 'is_external', 'link_group_ifname', 'link_group_lag_mode',
        'link_group_ct_names', 'server_tags', 'link_tags', 'comment'
      ];
      
      return fieldOrder
        .map(fieldKey => {
          const fieldDef = conversionMap.field_definitions[fieldKey];
          if (fieldDef && !fieldDef.ui_config.hidden) {
            return {
              key: fieldKey as keyof NetworkConfigRow,
              header: fieldDef.display_name,
              width: `${fieldDef.ui_config.column_width}px`,
              sortable: fieldDef.ui_config.sortable
            };
          }
          return null;
        })
        .filter((col): col is TableColumn => col !== null);
    } else {
      // Fallback to hard-coded columns if conversion map is not available
      return [
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
    }
  }, [conversionMap]);

  // Special LAG/Bond Name processing logic - MUST be defined before filteredAndSortedData useMemo
  const processLagBondNames = React.useCallback((tableData: NetworkConfigRow[]): NetworkConfigRow[] => {
    let nextLagNumber = 900; // Starting LAG number for auto-generation
    const processedData = [...tableData];
    
    // Group connections that need LAG assignment (empty LAG name but lacp_active mode)
    const lagGroups = new Map<string, NetworkConfigRow[]>();
    
    processedData.forEach((row, index) => {
      // Check if this connection needs LAG name auto-generation
      const needsLagName = !row.link_group_ifname && row.link_group_lag_mode === 'lacp_active';
      
      if (needsLagName) {
        // Create a LAG group key based on server only
        // All interfaces from the same server should share the same LAG regardless of switches
        const lagGroupKey = `${row.server_label}`;
        
        if (!lagGroups.has(lagGroupKey)) {
          lagGroups.set(lagGroupKey, []);
        }
        lagGroups.get(lagGroupKey)?.push({ ...row, __originalIndex: index } as any);
      }
    });
    
    // Assign the SAME LAG name to ALL connections in each group
    lagGroups.forEach((connections, lagGroupKey) => {
      const lagName = `ae${nextLagNumber}`;
      nextLagNumber++;
      
      console.log(`🔗 Auto-generating LAG name "${lagName}" for ${connections.length} connections in group: ${lagGroupKey}`);
      console.log(`   Interfaces: ${connections.map(c => `${c.switch_ifname}↔${c.server_ifname}`).join(', ')}`);
      
      // Apply the SAME LAG name to ALL connections in this group
      connections.forEach(conn => {
        const originalIndex = (conn as any).__originalIndex;
        if (originalIndex !== undefined) {
          processedData[originalIndex] = {
            ...processedData[originalIndex],
            link_group_ifname: lagName
          };
        }
      });
    });
    
    return processedData;
  }, []);

  const filteredData = useMemo(() => {
    // First, process LAG/Bond Names (auto-generate for lacp_active connections without LAG names)
    let processedData = processLagBondNames(data);
    
    let filtered = processedData;

    // Apply text filter
    if (filterText) {
      const searchText = filterText.toLowerCase();
      filtered = processedData.filter(row => 
        Object.values(row).some(value => 
          value?.toString().toLowerCase().includes(searchText)
        )
      );
    }

    return filtered;
  }, [data, filterText, processLagBondNames]);

  const { sortedData, sortKey, sortOrder, handleSort } = useTable({
    initialData: filteredData,
  });

  const groupedData = useMemo(() => {
    if (groupByServer) {
      return groupConnectionsByServer(sortedData);
    }
    return sortedData;
  }, [sortedData, groupByServer]);

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
    if (selectedRows.size === groupedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(groupedData.map((_, index) => index)));
    }
  };

  const handleProvision = () => {
    const rowsToProvision = groupedData.filter((_, index) => selectedRows.has(index));
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
      

      // Query Apstra using connectivity-templates-query only (comprehensive query with CT data)
      const connectivityResponse = await apstraApiService.queryConnectivity(blueprintId, uniqueSwitchLabels);

      console.log(`🔍 API Response: ${connectivityResponse.count} connectivity results with CT data`);

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

  // Synchronize LAG names from API data to Excel data
  const synchronizeLagNamesFromApi = (tableData: NetworkConfigRow[], apiDataMap: Map<string, any>): NetworkConfigRow[] => {
    const updatedData = [...tableData];
    
    // Group Excel connections by server to identify potential LAG groups
    const serverLagGroups = new Map<string, NetworkConfigRow[]>();
    
    updatedData.forEach((row, index) => {
      if (row.server_label) {
        if (!serverLagGroups.has(row.server_label)) {
          serverLagGroups.set(row.server_label, []);
        }
        serverLagGroups.get(row.server_label)?.push({ ...row, __index: index } as any);
      }
    });
    
    // For each server group, check if we should synchronize LAG names from API
    serverLagGroups.forEach((lagConnections, serverLabel) => {
      // Find API LAG names for connections that have API data
      const apiLagNames = new Set<string>();
      let hasApiLagData = false;
      
      lagConnections.forEach(row => {
        const connectionKey = `${row.switch_label}-${row.switch_ifname}`;
        const apiData = apiDataMap.get(connectionKey);
        
        if (apiData) {
          // Extract API LAG name from various possible paths
          const apiLagName = apiData.ae1?.if_name || apiData.ae_interface?.name || '';
          if (apiLagName) {
            apiLagNames.add(apiLagName);
            hasApiLagData = true;
          }
        }
      });
      
      // Always update individual connections with their specific API LAG names
      if (hasApiLagData) {
        if (apiLagNames.size === 1) {
          console.log(`✅ Server ${serverLabel} has consistent API LAG name: "${Array.from(apiLagNames)[0]}" (MATCH)`);
        } else {
          console.log(`❌ Server ${serverLabel} has inconsistent API LAG names: ${Array.from(apiLagNames).join(', ')} (MISMATCH)`);
        }
        
        // Update each connection with its specific API LAG name
        lagConnections.forEach(row => {
          const connectionKey = `${row.switch_label}-${row.switch_ifname}`;
          const apiData = apiDataMap.get(connectionKey);
          const apiLagName = apiData?.ae1?.if_name || apiData?.ae_interface?.name || '';
          
          if (apiLagName) {
            const originalIndex = (row as any).__index;
            if (originalIndex !== undefined) {
              const oldLagName = updatedData[originalIndex].link_group_ifname;
              updatedData[originalIndex] = {
                ...updatedData[originalIndex],
                link_group_ifname: apiLagName
              };
              console.log(`  🔄 ${row.switch_ifname}: "${oldLagName}" → "${apiLagName}"`);
            }
          }
        });
      }
    });
    
    return updatedData;
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
      
      // CRITICAL FIX: More robust interface name extraction to prevent key collisions
      // The fallback logic was causing different interfaces to get the same connection key
      
      // Prioritize switch_intf for switch interface extraction
      let switchInterface = item.switch_intf?.if_name;
      
      // CRITICAL: Handle both connectivity query and connectivity-templates query
      // The templates query uses ae1.if_name -> intf1.if_name structure
      if (!switchInterface && item.intf1?.if_name) {
        // Additional validation: check if intf1 looks like a switch interface (e.g., et-0/0/X)
        const intf1Name = item.intf1.if_name;
        const serverIntf = item.server_intf?.if_name || item.intf2?.if_name;
        
        // Only use intf1 as switch interface if it's clearly different from server interface
        // OR if this is from connectivity-templates query (indicated by presence of ae1)
        if (item.ae1 || !serverIntf || intf1Name !== serverIntf) {
          switchInterface = intf1Name;
        }
      }
      
      // Server interface extraction with similar validation
      let serverInterface = item.server_intf?.if_name;  
      if (!serverInterface && item.intf2?.if_name) {
        const intf2Name = item.intf2.if_name;
        // Only use intf2 if it's different from the switch interface we extracted
        if (!switchInterface || intf2Name !== switchInterface) {
          serverInterface = intf2Name;
        }
      }
      
      // DEBUG: Identify interface extraction patterns that might cause key collision
      if (switchName && (item.switch_intf?.if_name !== item.intf1?.if_name)) {
        console.log(`🔍 Interface extraction mismatch for ${switchName}:`, {
          switch_intf_if_name: item.switch_intf?.if_name,
          intf1_if_name: item.intf1?.if_name,
          using_switch_interface: switchInterface,
          potential_key_collision: !item.switch_intf?.if_name && item.intf1?.if_name
        });
      }
      
      
      
      // CRITICAL: Only create connection key if we have both switchName and a VALID switchInterface
      // Also ensure the switchInterface looks like a valid interface name
      if (switchName && switchInterface && switchInterface.trim().length > 0) {
        // Use switch_label + switch_ifname as key - keep original format for Excel matching
        const connectionKey = `${switchName}-${switchInterface}`;
        
        // DEBUG: Log connection key generation (reduced verbosity after query fix)
        if (item.ct_names || item.CT?.label) {
          console.log(`🔑 Connection key "${connectionKey}" with CT data:`, {
            ct_data: item.ct_names || item.CT?.label,
            used_fallback: !item.switch_intf?.if_name && item.intf1?.if_name
          });
        }
        
        // Enhanced debugging for AE interface and CT data association
        if (item.ae1?.if_name || item.ct_names || item.CT) {
          console.log(`📊 Processing API chunk for ${connectionKey}:`, {
            switchInterface: switchInterface,
            ae1_if_name: item.ae1?.if_name,
            ct_names: item.ct_names, 
            CT_label: item.CT?.label,
            server: serverName,
            switch: switchName
          });
        }
        
        // Specific debugging for the problem case - USE ERROR LEVEL TO MAKE IT VISIBLE
        if (switchName === 'CRL01P24L09' && switchInterface === 'et-0/0/45') {
          console.error(`🎯🚨 PROBLEM CASE - CRL01P24L09 et-0/0/45:`, {
            connectionKey: connectionKey,
            ct_names: item.ct_names,
            CT_label: item.CT?.label,
            expected: 'VN-2065-tagged',
            ae1_if_name: item.ae1?.if_name,
            has_ct_data: !!(item.ct_names || item.CT)
          });
        }
        
        // Also debug any VN-2064-tagged or VN-2065-tagged CT assignments - USE ERROR LEVEL
        if (item.ct_names && (item.ct_names.includes('VN-2064-tagged') || item.ct_names.includes('VN-2065-tagged'))) {
          console.error(`🏷️🚨 VN TAG ASSIGNMENT:`, {
            ct_names: item.ct_names,
            switch: switchName,
            interface: switchInterface,
            connectionKey: connectionKey,
            server: serverName
          });
        }
        
        // Check if this connection already exists in our map
        const existingData = apiConnectionsMap.get(connectionKey);
        
        if (existingData) {
          // CRITICAL FIX: Handle CT data collection BEFORE creating merged object
          // The connectivity-templates-query returns multiple results with CT.label for same connection
          const existingCTs = existingData.rawData?.ct_names || existingData.rawData?.CT?.label || '';
          const newCTs = item.ct_names || item.CT?.label || '';
          
          // Enhanced debug logging for specific connection
          if (connectionKey.includes('CRL01P24L09-et-0/0/45')) {
            console.log(`🔍 CT MERGING DEBUG - ${connectionKey}:`, {
              switchName: switchName,
              switchInterface: switchInterface,
              serverName: serverName,
              existingCTs: existingCTs,
              newCTs: newCTs,
              item_ct_names: item.ct_names,
              item_CT_label: item.CT?.label,
              existing_rawData_ct_names: existingData.rawData?.ct_names,
              existing_rawData_CT_label: existingData.rawData?.CT?.label,
              full_item: item,
              full_existing: existingData.rawData
            });
          }
          
          let mergedCtNames = '';
          if (newCTs && existingCTs) {
            // Both exist - merge and deduplicate
            const existingList = existingCTs.split(',').map((ct: string) => ct.trim()).filter((ct: string) => ct);
            const newList = newCTs.split(',').map((ct: string) => ct.trim()).filter((ct: string) => ct);
            const combinedList = [...new Set([...existingList, ...newList])];
            mergedCtNames = combinedList.join(',');
            
            console.log(`📋 CT data merged for ${connectionKey}:`, {
              switch: switchName,
              interface: switchInterface,
              existing: existingCTs,
              new: newCTs,
              result: mergedCtNames
            });
          } else if (newCTs && !existingCTs) {
            // Use new CT if existing is empty
            mergedCtNames = newCTs;
            console.log(`📋 New CT data for ${connectionKey}:`, {
              switch: switchName,
              interface: switchInterface,
              ct_data: mergedCtNames
            });
          } else if (existingCTs && !newCTs) {
            // Keep existing CT if new is empty
            mergedCtNames = existingCTs;
          }

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
            intf2: existingData.rawData?.intf2 || item.intf2,
            // Ensure LAG/aggregation fields are preserved from both chunks
            ae1: existingData.rawData?.ae1 || item.ae1,
            evpn1: existingData.rawData?.evpn1 || item.evpn1,
            // Use merged CT data instead of simple OR operation
            ct_names: mergedCtNames,
            ae_interface: existingData.rawData?.ae_interface || item.ae_interface
          };
          
          // If this chunk has speed data and the existing doesn't, use it
          if (item.link1?.speed && !existingData.rawData?.link1?.speed) {
            mergedRawData.link1 = { ...mergedRawData.link1, speed: item.link1.speed };
          }
          
          // If this chunk has LAG/Bond Name data and the existing doesn't, use it
          if (item.ae1?.if_name && !existingData.rawData?.ae1?.if_name) {
            mergedRawData.ae1 = { ...mergedRawData.ae1, if_name: item.ae1.if_name };
          }
          
          // If this chunk has LAG mode data and the existing doesn't, use it  
          if (item.evpn1?.lag_mode && !existingData.rawData?.evpn1?.lag_mode) {
            mergedRawData.evpn1 = { ...mergedRawData.evpn1, lag_mode: item.evpn1.lag_mode };
          }
          
          // Preserve CT object structure if available
          if (item.CT && !existingData.rawData?.CT) {
            mergedRawData.CT = item.CT;
          }
          
          // IMPORTANT: Handle updated connectivity templates query structure
          // The new query uses ae1 and intf1 for CT data extraction
          if (!mergedRawData.ae1 && item.ae1) {
            mergedRawData.ae1 = item.ae1;
          }
          if (!mergedRawData.intf1 && item.intf1) {
            mergedRawData.intf1 = item.intf1;
          }
          
          console.log(`🔗 Merging API data chunks for ${connectionKey}:`, {
            switchInterface: switchInterface,
            existing_ct_names: existingData.rawData?.ct_names,
            existing_CT_label: existingData.rawData?.CT?.label,
            new_ct_names: item.ct_names,
            new_CT_label: item.CT?.label,
            merged_ct_names: mergedRawData.ct_names,
            merged_CT_label: mergedRawData.CT?.label,
            existing_ae1: existingData.rawData?.ae1?.if_name,
            new_ae1: item.ae1?.if_name
          });
          
          // Specific debugging for the problem case during merging - USE ERROR LEVEL
          if (switchName === 'CRL01P24L09' && switchInterface === 'et-0/0/45') {
            console.error(`🚨💥 MERGING PROBLEM CASE - CRL01P24L09 et-0/0/45:`, {
              before_merge_ct: existingData.rawData?.ct_names,
              before_merge_CT: existingData.rawData?.CT?.label,
              new_chunk_ct: item.ct_names,
              new_chunk_CT: item.CT?.label,
              will_merge_ct_names: !!(item.ct_names && !existingData.rawData?.ct_names),
              will_merge_CT: !!(item.CT && !existingData.rawData?.CT),
              after_merge_ct: mergedRawData.ct_names,
              after_merge_CT: mergedRawData.CT?.label,
              expected: 'VN-2065-tagged',
              actual_will_be: mergedRawData.ct_names || mergedRawData.CT?.label,
              is_correct: (mergedRawData.ct_names || mergedRawData.CT?.label) === 'VN-2065-tagged'
            });
          }
          
          apiConnectionsMap.set(connectionKey, {
            switchName,
            serverName,
            switchInterface: switchInterface || existingData.switchInterface,
            serverInterface: serverInterface || existingData.serverInterface,
            rawData: mergedRawData
          });
        } else {
          // First time seeing this connection - ensure CT data is properly stored
          const ctData = item.ct_names || item.CT?.label || '';
          
          // Enhanced debug logging for specific connection
          if (connectionKey.includes('CRL01P24L09-et-0/0/45')) {
            console.log(`🔍 FIRST TIME DEBUG - ${connectionKey}:`, {
              switchName: switchName,
              switchInterface: switchInterface,
              serverName: serverName,
              item_ct_names: item.ct_names,
              item_CT_label: item.CT?.label,
              extracted_ct_data: ctData,
              full_item: item
            });
          }
          
          // Log initial AE/CT data with proper CT extraction
          if (item.ae1?.if_name || ctData) {
            console.log(`🆕 First time processing connection ${connectionKey}:`, {
              switch: switchName,
              interface: switchInterface,
              switchInterface: switchInterface,
              ae1_if_name: item.ae1?.if_name,
              ct_names: item.ct_names,
              CT_label: item.CT?.label,
              extracted_ct_data: ctData
            });
          }
          
          // Store the raw data with properly extracted CT information
          const rawData = {
            ...item,
            // Ensure ct_names is available from either source
            ct_names: ctData || item.ct_names
          };
          
          apiConnectionsMap.set(connectionKey, {
            switchName,
            serverName,
            switchInterface,
            serverInterface,
            rawData
          });
        }
      } else {
        // Log when we skip API chunks due to invalid interface extraction
        if (switchName) {
          console.warn(`⚠️ Skipping API chunk due to invalid interface extraction:`, {
            switchName: switchName,
            serverName: serverName,
            extracted_switch_interface: switchInterface,
            switch_intf_if_name: item.switch_intf?.if_name,
            intf1_if_name: item.intf1?.if_name,
            intf2_if_name: item.intf2?.if_name,
            server_intf_if_name: item.server_intf?.if_name,
            ct_data: item.ct_names || item.CT?.label || 'none',
            reason: !switchName ? 'missing_switch_name' : !switchInterface ? 'missing_switch_interface' : 'validation_failed'
          });
        }
      }
    });

    // Create a set of existing table connections for duplicate prevention
    const existingConnections = new Set<string>();
    tableData.forEach(row => {
      if (row.switch_label && row.switch_ifname) {
        const connectionKey = `${row.switch_label}-${row.switch_ifname}`;
        existingConnections.add(connectionKey);
      }
    });

    // Check each table row against API data
    tableData.forEach((row) => {
      const switchName = row.switch_label;
      const serverName = row.server_label;
      const switchInterface = row.switch_ifname;
      const serverInterface = row.server_ifname;
      
      // Debug the specific problem row to see what it contains
      if (switchName === 'CRL01P24L09' && switchInterface === 'et-0/0/45') {
        console.error(`🔍 PROVISIONING TABLE ROW - CRL01P24L09 et-0/0/45:`, {
          switch_label: row.switch_label,
          switch_ifname: row.switch_ifname,
          server_label: row.server_label,
          current_ct_names: row.link_group_ct_names,
          should_be: 'VN-2065-tagged',
          showing_instead: row.link_group_ct_names
        });
      }

      if (!switchName || !serverName) {
        results.push({
          status: 'missing',
          tableRow: row,
          message: 'Incomplete data - missing switch or server name'
        });
        return;
      }

      // Try to find matching connection in API data using interface-level key
      const connectionKey = `${switchName}-${switchInterface || ''}`;
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
        results.push({
          status: 'match',
          tableRow: row,
          apiData: apiData,
          fieldMatches: {}, // Will be filled in after LAG group validation
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
        const apiLagMode = apiData.rawData?.evpn1?.lag_mode || apiData.rawData?.lag_mode || '';
        const apiCtNames = apiData.rawData?.ct_names || apiData.rawData?.CT?.label || '';
        const apiLagIfname = apiData.rawData?.ae1?.if_name || apiData.rawData?.ae_interface?.name || '';
        
        const newRow: NetworkConfigRow = {
          blueprint: 'DH4-Colo2', // Use the same blueprint we queried
          switch_label: apiData.switchName,
          switch_ifname: apiData.switchInterface || '',
          server_label: apiData.serverName,
          server_ifname: apiData.serverInterface || '',
          link_speed: apiSpeed, // Populate from merged API data
          link_group_lag_mode: apiLagMode,
          link_group_ct_names: apiCtNames,
          link_group_ifname: apiLagIfname, // Populate from merged API data
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
      
      // Debug the specific problem connection in final API data map
      if (connectionKey.includes('CRL01P24L09') && connectionKey.includes('et-0/0/45')) {
        console.error(`🗃️ FINAL API DATA MAP - CRL01P24L09 et-0/0/45:`, {
          connectionKey: connectionKey,
          stored_ct_names: connectionData.rawData?.ct_names,
          stored_CT_label: connectionData.rawData?.CT?.label,
          stored_ae1: connectionData.rawData?.ae1?.if_name,
          full_stored_data: connectionData.rawData
        });
      }
    });
    
    // Also capture the original connection data from earlier processing for extra safety
    results.forEach(result => {
      if (result.status === 'match' && result.tableRow && result.apiData) {
        const row = result.tableRow;
        const connectionKey = `${row.switch_label}-${row.switch_ifname}`;
        
        // Debug the specific problem case in results processing - USE ERROR LEVEL
        if (connectionKey.includes('CRL01P24L09') && connectionKey.includes('et-0/0/45')) {
          console.error(`📋 RESULTS PROCESSING - CRL01P24L09 et-0/0/45:`, {
            connectionKey: connectionKey,
            result_apiData_ct_names: result.apiData?.ct_names,
            result_apiData_rawData_ct_names: result.apiData?.rawData?.ct_names,
            result_apiData_CT_label: result.apiData?.CT?.label,
            result_apiData_rawData_CT_label: result.apiData?.rawData?.CT?.label,
            what_will_be_stored: (result.apiData.rawData || result.apiData),
            stored_ct_data: {
              ct_names: (result.apiData.rawData || result.apiData)?.ct_names,
              CT_label: (result.apiData.rawData || result.apiData)?.CT?.label,
              rawData_ct_names: (result.apiData.rawData || result.apiData)?.rawData?.ct_names,
              rawData_CT_label: (result.apiData.rawData || result.apiData)?.rawData?.CT?.label
            }
          });
        }
        
        finalApiDataMap.set(connectionKey, result.apiData.rawData || result.apiData);
      }
    });

    // Now combine original data with new rows and group by server
    const combinedData = [...tableData, ...newRows];
    
    // Synchronize LAG names from API data to Excel data
    const lagSynchronizedData = synchronizeLagNamesFromApi(combinedData, finalApiDataMap);
    const groupedData = groupConnectionsByServer(lagSynchronizedData);

    // Perform LAG group validation for connections with LAG names
    const lagGroupValidation = validateLagGroupConsistency(lagSynchronizedData, finalApiDataMap);

    // Update field matches for all results with LAG group validation
    results.forEach(result => {
      if (result.status === 'match' && result.tableRow && result.apiData) {
        const fieldMatches = compareFields(result.tableRow, result.apiData, lagGroupValidation);
        result.fieldMatches = fieldMatches;
      }
    });

    return {
      comparisonResults: results,
      newRowsAdded: newRows.length,
      updatedData: groupedData,
      apiDataMap: finalApiDataMap
    };
  };


  // LAG group comparison logic for API validation
  const validateLagGroupConsistency = (excelConnections: NetworkConfigRow[], apiDataMap: Map<string, any>): Map<string, boolean> => {
    const lagValidationResults = new Map<string, boolean>();
    
    // Group Excel connections by LAG name
    const excelLagGroups = new Map<string, NetworkConfigRow[]>();
    excelConnections.forEach(row => {
      if (row.link_group_ifname) {
        if (!excelLagGroups.has(row.link_group_ifname)) {
          excelLagGroups.set(row.link_group_ifname, []);
        }
        excelLagGroups.get(row.link_group_ifname)?.push(row);
      }
    });
    
    // Validate each LAG group against API data
    excelLagGroups.forEach((lagConnections, lagName) => {
      const apiLagNames = new Set<string>();
      let allConnectionsHaveApiData = true;
      
      lagConnections.forEach(row => {
        const connectionKey = `${row.switch_label}-${row.switch_ifname}`;
        const apiData = apiDataMap.get(connectionKey);
        
        if (apiData) {
          const apiLagIfname = apiData.ae1?.if_name || apiData.rawData?.ae1?.if_name || apiData.ae_interface?.name || apiData.rawData?.ae_interface?.name || '';
          if (apiLagIfname) {
            apiLagNames.add(apiLagIfname);
          }
        } else {
          allConnectionsHaveApiData = false;
        }
      });
      
      // LAG group matches if:
      // 1. All connections in the Excel LAG group have API data
      // 2. All API connections in the group have the same LAG name
      // 3. The API LAG name matches across all connections in the group
      const lagGroupMatches = allConnectionsHaveApiData && apiLagNames.size === 1;
      
      lagConnections.forEach(row => {
        const connectionKey = `${row.switch_label}-${row.switch_ifname}`;
        lagValidationResults.set(connectionKey, lagGroupMatches);
      });
      
      if (!lagGroupMatches) {
        console.log(`🚨 LAG group "${lagName}" validation failed:`, {
          excelConnections: lagConnections.length,
          apiLagNames: Array.from(apiLagNames),
          allHaveApiData: allConnectionsHaveApiData
        });
      }
    });
    
    return lagValidationResults;
  };

  // Unified field comparison function - single source of truth for all field matching logic
  const compareFields = (row: NetworkConfigRow, apiData: any, lagGroupValidation?: Map<string, boolean>): {
    server_label: boolean;
    server_ifname: boolean;
    link_speed: boolean;
    link_group_lag_mode: boolean;
    link_group_ct_names: boolean;
    link_group_ifname: boolean;
    is_external: boolean;
  } => {
    if (!apiData) {
      return {
        server_label: false,
        server_ifname: false,
        link_speed: false,
        link_group_lag_mode: false,
        link_group_ct_names: false,
        link_group_ifname: false,
        is_external: false
      };
    }

    // Extract API values with proper fallback paths
    const apiServerInterface = apiData.server_intf?.if_name || apiData.intf2?.if_name || apiData.serverInterface || '';
    const apiSpeedRaw = apiData.link1?.speed || apiData.rawData?.link1?.speed || '';
    const apiLagMode = apiData.evpn1?.lag_mode || apiData.rawData?.evpn1?.lag_mode || apiData.lag_mode || apiData.rawData?.lag_mode || '';
    const apiCtNames = apiData.ct_names || apiData.rawData?.ct_names || apiData.CT?.label || apiData.rawData?.CT?.label || '';
    const apiLagIfname = apiData.ae1?.if_name || apiData.rawData?.ae1?.if_name || apiData.ae_interface?.name || apiData.rawData?.ae_interface?.name || '';
    const apiExternal = apiData.is_external || apiData.rawData?.is_external || false;

    // CT comparison with proper comma-separated list handling
    const excelCTs = (row.link_group_ct_names || '').split(',').map((ct: string) => ct.trim()).filter((ct: string) => ct).sort();
    const apiCTsList = (apiCtNames || '').split(',').map((ct: string) => ct.trim()).filter((ct: string) => ct).sort();
    const ctNamesMatch = JSON.stringify(excelCTs) === JSON.stringify(apiCTsList);

    // Debug the specific problem case during field comparison
    if (row.switch_label === 'CRL01P24L09' && row.switch_ifname === 'et-0/0/45') {
      console.error(`🔍 FIELD COMPARISON - CRL01P24L09 et-0/0/45:`, {
        table_ct_names: row.link_group_ct_names,
        api_ct_names: apiCtNames,
        excel_cts_parsed: excelCTs,
        api_cts_parsed: apiCTsList,
        api_data_paths: {
          ct_names: apiData.ct_names,
          rawData_ct_names: apiData.rawData?.ct_names,
          CT_label: apiData.CT?.label,
          rawData_CT_label: apiData.rawData?.CT?.label
        },
        will_match: ctNamesMatch,
        full_api_data: apiData
      });
    }

    // Normalize speeds for comparison
    const tableSpeedNormalized = normalizeSpeed(row.link_speed || '');
    const apiSpeedNormalized = normalizeSpeed(apiSpeedRaw);

    // LAG/Bond Name comparison uses group validation logic
    let lagIfnameMatches = false;
    if (lagGroupValidation && row.link_group_ifname) {
      // Use group validation results for LAG name matching
      const connectionKey = `${row.switch_label}-${row.switch_ifname}`;
      lagIfnameMatches = lagGroupValidation.get(connectionKey) || false;
    } else {
      // Fallback to simple field comparison for non-LAG connections
      lagIfnameMatches = (row.link_group_ifname || '') === apiLagIfname;
    }

    return {
      server_label: true, // Server exists in API data if we have apiData
      server_ifname: (row.server_ifname || '') === apiServerInterface,
      link_speed: tableSpeedNormalized === apiSpeedNormalized,
      link_group_lag_mode: (row.link_group_lag_mode || '') === apiLagMode,
      link_group_ct_names: ctNamesMatch,
      link_group_ifname: lagIfnameMatches,
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
    if (!row.switch_label || !row.switch_ifname) return null;
    
    const connectionKey = `${row.switch_label}-${row.switch_ifname}`;
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

  // Generate enhanced tooltips showing Apstra comparison data
  const getEnhancedTooltip = (value: any, columnKey: string, row: NetworkConfigRow): string => {
    const formattedValue = formatCellValue(value, columnKey);
    const apiData = getServerApiData(row);
    const hasApiDataAvailable = apiDataMap.size > 0;

    // Handle special cases first
    if (row?.comment === 'Only in Blueprint') {
      return `Found only in Apstra Blueprint: ${formattedValue}`;
    }

    if (!hasApiDataAvailable) {
      return `Excel value: ${formattedValue} (API not fetched yet)`;
    }

    if (!apiData) {
      return `Excel value: ${formattedValue} (not found in Apstra Blueprint)`;
    }

    // Get API value for comparison
    let apiValue: any;
    switch (columnKey) {
      case 'server_ifname':
        apiValue = apiData.server_intf?.if_name || apiData.intf2?.if_name || '';
        break;
      case 'link_speed':
        const apiSpeedRaw = apiData.link1?.speed || '';
        apiValue = apiSpeedRaw ? (apiSpeedRaw.match(/[GM]$/) ? apiSpeedRaw : `${apiSpeedRaw} Gbps`) : '';
        break;
      case 'link_group_lag_mode':
        apiValue = apiData.evpn1?.lag_mode || apiData.lag_mode || '';
        break;
      case 'link_group_ct_names':
        apiValue = apiData.ct_names || apiData.CT?.label || '';
        break;
      case 'link_group_ifname':
        apiValue = apiData.ae1?.if_name || apiData.ae_interface?.name || '';
        break;
      case 'is_external':
        const apiExternal = apiData.is_external || false;
        apiValue = apiExternal === true ? 'Yes' : apiExternal === false ? 'No' : '';
        break;
      default:
        apiValue = '';
    }

    const apiFormatted = formatCellValue(apiValue, columnKey);
    const matches = formattedValue === apiFormatted;

    if (matches) {
      return `Excel: ${formattedValue} ✓ (matches Apstra)`;
    } else {
      return `Excel: ${formattedValue}\nApstra: ${apiFormatted || 'N/A'}\n⚠️ Values differ`;
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

  const tableColumns = useMemo(() => {
    return [
      {
        key: 'select',
        header: (
          <input
            type="checkbox"
            checked={selectedRows.size === groupedData.length && groupedData.length > 0}
            onChange={handleSelectAll}
            title="Select all visible rows"
          />
        ),
        render: (row: any, index: number) => (
          <input
            type="checkbox"
            checked={selectedRows.has(index)}
            onChange={() => handleRowSelect(index)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      ...columns.map((column) => ({
        key: column.key,
        header: (
          <div className="header-content">
            {column.header.split('\n').map((line, index) => (
              <div key={index}>{line}</div>
            ))}
            {column.sortable && sortKey === column.key && (
              <span className="sort-indicator">
                {sortOrder === 'asc' ? ' ▲' : ' ▼'}
              </span>
            )}
          </div>
        ),
        render: (row: NetworkConfigRow) => (
          <div
            className={getCellClass(
              row[column.key as keyof NetworkConfigRow],
              column.key,
              row
            )}
            title={getEnhancedTooltip(
              row[column.key as keyof NetworkConfigRow],
              column.key,
              row
            )}
          >
            {renderCellContent(row, column.key)}
          </div>
        ),
      })),
    ];
  }, [columns, selectedRows, groupedData, sortKey, sortOrder]);

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
            Showing {groupedData.length} of {data.length} rows
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
        <Table
          data={groupedData}
          columns={tableColumns}
          onSort={handleSort}
          sortKey={sortKey}
          sortOrder={sortOrder}
        />
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
            <li>Switches: {new Set(groupedData.filter((_, i) => selectedRows.has(i)).map(r => r.switch_label).filter(Boolean)).size}</li>
            <li>Servers: {new Set(groupedData.filter((_, i) => selectedRows.has(i)).map(r => r.server_label).filter(Boolean)).size}</li>
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
