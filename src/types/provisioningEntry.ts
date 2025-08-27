/**
 * New Provisioning Entry Data Structure
 * 
 * Each entry represents a unique switch-interface pair with both input (xlsx) and fetched (API) data
 * Connection Key: `${switchName}-${switchInterface}`
 */

export interface ProvisioningEntry {
  // Unique identifier
  connectionKey: string;
  
  // Core identifiers (always from input)
  switchName: string;
  switchInterface: string;
  
  // Server information - input vs fetched comparison
  server: {
    name_input?: string;      // From Excel
    name_fetched?: string;    // From API
    interface_input?: string; // From Excel
    interface_fetched?: string; // From API
  };
  
  // Network configuration - input vs fetched comparison
  network: {
    speed_input?: string;     // From Excel
    speed_fetched?: string;   // From API
    external_input?: boolean; // From Excel
    external_fetched?: boolean; // From API
  };
  
  // LAG/Bond configuration - input vs fetched comparison
  lag: {
    name_input?: string;      // From Excel (may be auto-generated)
    name_fetched?: string;    // From API
    mode_input?: string;      // From Excel (lacp_active, static, none)
    mode_fetched?: string;    // From API
  };
  
  // Connectivity Templates - input vs fetched comparison
  connectivity: {
    templates_input?: string; // From Excel (comma-separated)
    templates_fetched?: string; // From API (comma-separated)
  };
  
  // Tags - input vs fetched comparison
  tags: {
    server_input?: string;    // From Excel
    server_fetched?: string;  // From API
    link_input?: string;      // From Excel
    link_fetched?: string;    // From API
    switch_input?: string;    // From Excel
    switch_fetched?: string;  // From API
  };
  
  // Metadata
  metadata: {
    blueprint?: string;       // Blueprint context
    comment?: string;         // User comments
    source: 'xlsx' | 'api' | 'both'; // Data source indicator
    lastUpdated?: Date;       // Last modification time
  };
  
  // Raw API data for advanced operations (optional)
  rawApiData?: any;
}

/**
 * Collection of all provisioning entries
 * Key: connectionKey (switchName-switchInterface)
 * Value: ProvisioningEntry
 */
export type ProvisioningEntryCollection = Map<string, ProvisioningEntry>;

/**
 * Comparison result for each field within an entry
 */
export interface FieldComparison {
  field: string;
  inputValue?: any;
  fetchedValue?: any;
  matches: boolean;
  status: 'match' | 'mismatch' | 'input_only' | 'fetched_only' | 'both_missing';
}

/**
 * Entry-level comparison result
 */
export interface EntryComparison {
  connectionKey: string;
  entry: ProvisioningEntry;
  fieldComparisons: FieldComparison[];
  overallStatus: 'complete_match' | 'partial_match' | 'no_match' | 'input_only' | 'fetched_only';
  matchScore: number; // Percentage of fields that match
}

/**
 * Overall provisioning analysis
 */
export interface ProvisioningAnalysis {
  totalEntries: number;
  completeMatches: number;
  partialMatches: number;
  inputOnlyEntries: number;
  fetchedOnlyEntries: number;
  entryComparisons: EntryComparison[];
}