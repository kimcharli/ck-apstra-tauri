/**
 * Provisioning Entry Service
 * 
 * Handles transformation between current NetworkConfigRow structure 
 * and new ProvisioningEntry structure with input/fetched field pairs
 */

import { NetworkConfigRow } from '../types/networkConfig';
import { 
  ProvisioningEntry, 
  ProvisioningEntryCollection, 
  FieldComparison, 
  EntryComparison, 
  ProvisioningAnalysis 
} from '../types/provisioningEntry';

export class ProvisioningEntryService {
  
  /**
   * Transform current NetworkConfigRow data to ProvisioningEntry collection
   */
  static fromNetworkConfigRows(rows: NetworkConfigRow[]): ProvisioningEntryCollection {
    const entries = new Map<string, ProvisioningEntry>();
    
    rows.forEach(row => {
      if (!row.switch_label || !row.switch_ifname) {
        console.warn('Skipping row with missing switch_label or switch_ifname:', row);
        return;
      }
      
      const connectionKey = `${row.switch_label}-${row.switch_ifname}`;
      
      // Check if entry already exists (shouldn't happen with current data, but defensive)
      if (entries.has(connectionKey)) {
        console.warn(`Duplicate connection key detected: ${connectionKey}`);
        return;
      }
      
      const entry: ProvisioningEntry = {
        connectionKey,
        switchName: row.switch_label,
        switchInterface: row.switch_ifname,
        
        server: {
          name_input: row.server_label,
          interface_input: row.server_ifname,
        },
        
        network: {
          speed_input: row.link_speed,
          external_input: row.is_external,
        },
        
        lag: {
          name_input: row.link_group_ifname,
          mode_input: row.link_group_lag_mode,
        },
        
        connectivity: {
          templates_input: row.link_group_ct_names,
        },
        
        tags: {
          server_input: row.server_tags,
          link_input: row.link_tags,
          switch_input: row.switch_tags,
        },
        
        metadata: {
          blueprint: row.blueprint,
          comment: row.comment,
          source: 'xlsx',
          lastUpdated: new Date(),
        }
      };
      
      entries.set(connectionKey, entry);
    });
    
    return entries;
  }
  
  /**
   * Merge API data into existing ProvisioningEntry collection
   */
  static mergeApiData(
    entries: ProvisioningEntryCollection, 
    apiDataMap: Map<string, any>
  ): ProvisioningEntryCollection {
    const updatedEntries = new Map(entries);
    
    // Update existing entries with API data
    entries.forEach((entry, connectionKey) => {
      const apiData = apiDataMap.get(connectionKey);
      if (apiData) {
        const updatedEntry = this.populateApiFields(entry, apiData);
        updatedEntry.metadata.source = 'both';
        updatedEntry.metadata.lastUpdated = new Date();
        updatedEntries.set(connectionKey, updatedEntry);
      }
    });
    
    // Add API-only entries (connections not in Excel)
    apiDataMap.forEach((apiData, connectionKey) => {
      if (!entries.has(connectionKey)) {
        const apiOnlyEntry = this.createApiOnlyEntry(connectionKey, apiData);
        updatedEntries.set(connectionKey, apiOnlyEntry);
      }
    });
    
    return updatedEntries;
  }
  
  /**
   * Populate fetched fields from API data
   */
  private static populateApiFields(entry: ProvisioningEntry, apiData: any): ProvisioningEntry {
    const updatedEntry = { ...entry };
    
    // Server information from API
    updatedEntry.server = {
      ...updatedEntry.server,
      name_fetched: apiData.server?.label || apiData.server?.hostname,
      interface_fetched: apiData.server_intf?.if_name || apiData.intf2?.if_name,
    };
    
    // Network configuration from API
    const apiSpeedRaw = apiData.link1?.speed || '';
    const normalizedApiSpeed = this.normalizeSpeed(apiSpeedRaw);
    
    updatedEntry.network = {
      ...updatedEntry.network,
      speed_fetched: normalizedApiSpeed,
      external_fetched: apiData.is_external || false,
    };
    
    // LAG configuration from API
    updatedEntry.lag = {
      ...updatedEntry.lag,
      name_fetched: apiData.ae1?.if_name || apiData.ae_interface?.name,
      mode_fetched: apiData.evpn1?.lag_mode || apiData.lag_mode,
    };
    
    // Connectivity templates from API
    const apiCtNames = apiData.ct_names || apiData.CT?.label || '';
    updatedEntry.connectivity = {
      ...updatedEntry.connectivity,
      templates_fetched: apiCtNames,
    };
    
    // Store raw API data for advanced operations
    updatedEntry.rawApiData = apiData;
    
    return updatedEntry;
  }
  
  /**
   * Create entry for API-only connections
   */
  private static createApiOnlyEntry(connectionKey: string, apiData: any): ProvisioningEntry {
    const [switchName, switchInterface] = connectionKey.split('-');
    
    return {
      connectionKey,
      switchName: switchName || '',
      switchInterface: switchInterface || '',
      
      server: {
        name_fetched: apiData.server?.label || apiData.server?.hostname,
        interface_fetched: apiData.server_intf?.if_name || apiData.intf2?.if_name,
      },
      
      network: {
        speed_fetched: this.normalizeSpeed(apiData.link1?.speed || ''),
        external_fetched: apiData.is_external || false,
      },
      
      lag: {
        name_fetched: apiData.ae1?.if_name || apiData.ae_interface?.name,
        mode_fetched: apiData.evpn1?.lag_mode || apiData.lag_mode,
      },
      
      connectivity: {
        templates_fetched: apiData.ct_names || apiData.CT?.label || '',
      },
      
      tags: {},
      
      metadata: {
        comment: 'Only in Blueprint',
        source: 'api',
        lastUpdated: new Date(),
      },
      
      rawApiData: apiData,
    };
  }
  
  /**
   * Compare input vs fetched fields for all entries
   */
  static analyzeProvisioning(entries: ProvisioningEntryCollection): ProvisioningAnalysis {
    const entryComparisons: EntryComparison[] = [];
    let completeMatches = 0;
    let partialMatches = 0;
    let inputOnlyEntries = 0;
    let fetchedOnlyEntries = 0;
    
    entries.forEach((entry) => {
      const comparison = this.compareEntry(entry);
      entryComparisons.push(comparison);
      
      switch (comparison.overallStatus) {
        case 'complete_match':
          completeMatches++;
          break;
        case 'partial_match':
          partialMatches++;
          break;
        case 'input_only':
          inputOnlyEntries++;
          break;
        case 'fetched_only':
          fetchedOnlyEntries++;
          break;
      }
    });
    
    return {
      totalEntries: entries.size,
      completeMatches,
      partialMatches,
      inputOnlyEntries,
      fetchedOnlyEntries,
      entryComparisons,
    };
  }
  
  /**
   * Compare input vs fetched fields for a single entry
   */
  private static compareEntry(entry: ProvisioningEntry): EntryComparison {
    const fieldComparisons: FieldComparison[] = [];
    
    // Compare server fields
    fieldComparisons.push(this.compareField('server_name', entry.server.name_input, entry.server.name_fetched));
    fieldComparisons.push(this.compareField('server_interface', entry.server.interface_input, entry.server.interface_fetched));
    
    // Compare network fields
    fieldComparisons.push(this.compareField('speed', entry.network.speed_input, entry.network.speed_fetched));
    fieldComparisons.push(this.compareField('external', entry.network.external_input, entry.network.external_fetched));
    
    // Compare LAG fields
    fieldComparisons.push(this.compareField('lag_name', entry.lag.name_input, entry.lag.name_fetched));
    fieldComparisons.push(this.compareField('lag_mode', entry.lag.mode_input, entry.lag.mode_fetched));
    
    // Compare connectivity templates with special handling for comma-separated lists
    fieldComparisons.push(this.compareCtField(entry.connectivity.templates_input, entry.connectivity.templates_fetched));
    
    // Calculate match score and overall status
    const validComparisons = fieldComparisons.filter(fc => fc.status !== 'both_missing');
    const matchingFields = fieldComparisons.filter(fc => fc.matches).length;
    const matchScore = validComparisons.length > 0 ? (matchingFields / validComparisons.length) * 100 : 0;
    
    let overallStatus: EntryComparison['overallStatus'];
    if (entry.metadata.source === 'xlsx') {
      overallStatus = 'input_only';
    } else if (entry.metadata.source === 'api') {
      overallStatus = 'fetched_only';
    } else if (matchScore === 100) {
      overallStatus = 'complete_match';
    } else if (matchScore > 0) {
      overallStatus = 'partial_match';
    } else {
      overallStatus = 'no_match';
    }
    
    return {
      connectionKey: entry.connectionKey,
      entry,
      fieldComparisons,
      overallStatus,
      matchScore,
    };
  }
  
  /**
   * Compare individual field values
   */
  private static compareField(field: string, inputValue: any, fetchedValue: any): FieldComparison {
    const inputEmpty = inputValue === undefined || inputValue === null || inputValue === '';
    const fetchedEmpty = fetchedValue === undefined || fetchedValue === null || fetchedValue === '';
    
    if (inputEmpty && fetchedEmpty) {
      return { field, inputValue, fetchedValue, matches: true, status: 'both_missing' };
    } else if (inputEmpty) {
      return { field, inputValue, fetchedValue, matches: false, status: 'fetched_only' };
    } else if (fetchedEmpty) {
      return { field, inputValue, fetchedValue, matches: false, status: 'input_only' };
    } else {
      const matches = String(inputValue) === String(fetchedValue);
      return { 
        field, 
        inputValue, 
        fetchedValue, 
        matches, 
        status: matches ? 'match' : 'mismatch' 
      };
    }
  }
  
  /**
   * Compare connectivity template fields with special comma-separated list handling
   */
  private static compareCtField(inputValue?: string, fetchedValue?: string): FieldComparison {
    const inputEmpty = !inputValue || inputValue.trim() === '';
    const fetchedEmpty = !fetchedValue || fetchedValue.trim() === '';
    
    if (inputEmpty && fetchedEmpty) {
      return { field: 'connectivity_templates', inputValue, fetchedValue, matches: true, status: 'both_missing' };
    } else if (inputEmpty) {
      return { field: 'connectivity_templates', inputValue, fetchedValue, matches: false, status: 'fetched_only' };
    } else if (fetchedEmpty) {
      return { field: 'connectivity_templates', inputValue, fetchedValue, matches: false, status: 'input_only' };
    } else {
      // Normalize and compare comma-separated lists
      const inputCTs = inputValue.split(',').map(ct => ct.trim()).filter(ct => ct).sort();
      const fetchedCTs = fetchedValue.split(',').map(ct => ct.trim()).filter(ct => ct).sort();
      const matches = inputCTs.join(',') === fetchedCTs.join(',');
      
      return { 
        field: 'connectivity_templates', 
        inputValue, 
        fetchedValue, 
        matches, 
        status: matches ? 'match' : 'mismatch' 
      };
    }
  }
  
  /**
   * Convert back to NetworkConfigRow array for compatibility
   */
  static toNetworkConfigRows(entries: ProvisioningEntryCollection): NetworkConfigRow[] {
    const rows: NetworkConfigRow[] = [];
    
    entries.forEach((entry) => {
      // Use input values primarily, fallback to fetched values if input is missing
      const row: NetworkConfigRow = {
        blueprint: entry.metadata.blueprint,
        server_label: entry.server.name_input || entry.server.name_fetched,
        switch_label: entry.switchName,
        switch_ifname: entry.switchInterface,
        server_ifname: entry.server.interface_input || entry.server.interface_fetched,
        link_speed: entry.network.speed_input || entry.network.speed_fetched,
        is_external: entry.network.external_input ?? entry.network.external_fetched,
        link_group_ifname: entry.lag.name_input || entry.lag.name_fetched,
        link_group_lag_mode: entry.lag.mode_input || entry.lag.mode_fetched,
        link_group_ct_names: entry.connectivity.templates_input || entry.connectivity.templates_fetched,
        server_tags: entry.tags.server_input || entry.tags.server_fetched,
        link_tags: entry.tags.link_input || entry.tags.link_fetched,
        switch_tags: entry.tags.switch_input || entry.tags.switch_fetched,
        comment: entry.metadata.comment,
      };
      
      rows.push(row);
    });
    
    return rows;
  }
  
  /**
   * Speed normalization helper
   */
  private static normalizeSpeed(speed: string): string {
    if (!speed) return '';
    
    // Remove extra whitespace and convert to standard format
    const cleanSpeed = speed.trim();
    
    // Convert various formats to standardized format
    if (cleanSpeed.match(/^\d+GB?$/i)) {
      return cleanSpeed.replace(/GB?$/i, 'G');
    } else if (cleanSpeed.match(/^\d+MB?$/i)) {
      return cleanSpeed.replace(/MB?$/i, 'M');
    } else if (cleanSpeed.match(/^\d+\s*Gbps$/i)) {
      return cleanSpeed.replace(/\s*Gbps$/i, 'G');
    } else if (cleanSpeed.match(/^\d+\s*Mbps$/i)) {
      return cleanSpeed.replace(/\s*Mbps$/i, 'M');
    } else if (cleanSpeed.match(/^\d+$/)) {
      // Raw numbers assume GB
      return `${cleanSpeed}G`;
    }
    
    return cleanSpeed;
  }
}