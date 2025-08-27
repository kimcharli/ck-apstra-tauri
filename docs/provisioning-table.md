# Provisioning Table Documentation

Complete specification, requirements, implementation, and troubleshooting guide for the Provisioning Table component.

## Overview

The Provisioning Table is the core component that displays network configuration data from Excel files and compares it with live Apstra API data. It provides real-time validation, data merging, and visual feedback for network provisioning workflows.

## Architecture

### Component Structure
```
 Provisioning Table System
├── Legacy ProvisioningTable.tsx
│   ├── NetworkConfigRow Data Structure
│   ├── Basic API Data Merging
│   └── Single Data Source Model
└── Enhanced ProvisioningTable System (NEW)
    ├── ProvisioningEntry Data Structure
    │   ├── Input/Fetched Field Pairs
    │   ├── Connection Key Management
    │   └── Structured Metadata
    ├── Data Processing Pipeline
    │   ├── Excel Data Import → ProvisioningEntry Collection
    │   ├── API Data Fetching → Merge with Existing Entries
    │   ├── Multi-Chunk Data Merging
    │   └── Field-Level Comparison Logic
    ├── Visual Feedback System
    │   ├── Three View Modes (Input/Fetched/Comparison)
    │   ├── Multi-State Color Coding
    │   ├── Analysis Summary Display
    │   └── Interactive Table Controls
    └── Action Processing
        ├── LAG/Bond Name Auto-Generation
        ├── Group Validation Logic
        ├── Connection Discovery
        └── Comprehensive Provisioning Analysis
```

### Data Flow Architecture
```
Excel Upload → Sheet Selection → Field Mapping → Provisioning Table Display
     ↓              ↓              ↓                    ↓
Temp Storage → Header Parsing → Data Validation → Interactive Display
     ↓              ↓              ↓                    ↓
File Cleanup → Conversion Map → Network Config → API Comparison
```

## Data Management Rules

### Core Data Processing Rules

**Excel Data Processing**:
- **Required Field Validation**: Only process rows with essential network information (`switch_label`, `switch_ifname`)
- **Duplicate Detection**: Skip rows with identical `switch_label` + `switch_ifname` combinations
- **Data Type Validation**: Validate field formats and constraints based on target field types
- **Error Aggregation**: Collect and report all validation issues with specific row/column context

**Field Naming Standards**:
- **Internal Field Names** (used consistently after Excel import):
  - `blueprint`, `server_label`, `switch_label`, `switch_ifname`, `server_ifname`
  - `link_speed`, `link_group_lag_mode`, `link_group_ct_names`, `link_group_ifname`
  - `is_external`, `server_tags`, `switch_tags`, `link_tags`, `comment`
- **Rule**: Never mix field naming conventions within a single service or data flow

### Fetch & Compare Data Synchronization

**Auto-Add Missing Connections**:
- If Apstra API returns connections not present in the provisioning table, automatically add them as new rows
- Preserve existing data - never modify or remove existing table entries during API synchronization
- Use merge strategy where API data supplements table data, does not replace it

**New Row Identification**:
- Mark API-sourced rows with `comment: 'Added from API query'` for traceability
- Alert user with count of newly added connections for transparency
- Store complete API response data in `apiDataMap` for efficient field-level comparisons

**Blueprint-Only Connection Discovery**:
- **CRITICAL FEATURE**: Automatically discover and add network connections that exist in Apstra Blueprint but are missing from Excel input
- **Discovery Process**: After API query, identify connections present in Blueprint but not in Excel data
- **Automatic Addition**: Add missing connections as new rows in provisioning table
- **Visual Identification**: Mark with `comment: 'Only in Blueprint'` and blue highlighting with italic text
- **Use Case**: Captures real network topology that may not be documented in Excel spreadsheets

### Data Integrity Rules

**Interface-Level Duplicate Prevention**:
- Skip adding connections that already exist with identical `switch_label`, `server_label`, and `switch_ifname` combination
- Allow multiple rows for the same server when connected via different interfaces
- Ensure complete connectivity representation

**Multi-Interface Server Support**:
- Support servers connected to multiple switches or multiple interfaces on the same switch
- Each interface connection gets its own row in the provisioning table
- Required fields validation: Only add new rows with complete `switch_label` and `server_label`

**Default Values and Inheritance**:
- New rows inherit the blueprint context from the current query
- Preserve API interface names when available, leave empty when not provided
- Apply consistent defaults for missing fields (`is_external: false`, tags: empty)

### Table Organization Rules

**Server Grouping**:
- All connections for the same server must be grouped together in the table
- No scattering - links of the same server should not be scattered throughout the table
- Maintain logical ordering to improve readability and management

**Connection Key Strategy**:
- Use `${switchName}-${switchInterface}` as unique connection identifier
- **Rationale**: Physical switch interface is the stable identifier - server names may differ between Excel input and API data
- Ensures consistent mapping between Excel data, API data, and visual representation
- Connection key must be stable across all data processing stages

## Enhanced ProvisioningEntry Data Structure (NEW)

### Overview

The Enhanced Provisioning Table introduces a **revolutionary data architecture** that maintains **separate input and fetched data** for comprehensive comparison and analysis. Each provisioning entry represents a unique switch-interface pair with structured field pairs for input (Excel) vs fetched (API) data.

### Core Data Structure

#### ProvisioningEntry Interface

```typescript
interface ProvisioningEntry {
  // Unique identifier - stable connection key
  connectionKey: string;  // "${switchName}-${switchInterface}"
  
  // Core identifiers (always from input)
  switchName: string;     // Physical switch identifier
  switchInterface: string; // Physical interface identifier
  
  // Server information - input vs fetched comparison
  server: {
    name_input?: string;      // From Excel data
    name_fetched?: string;    // From API response
    interface_input?: string; // From Excel data
    interface_fetched?: string; // From API response
  };
  
  // Network configuration - input vs fetched comparison
  network: {
    speed_input?: string;     // From Excel data
    speed_fetched?: string;   // From API response (normalized)
    external_input?: boolean; // From Excel data
    external_fetched?: boolean; // From API response
  };
  
  // LAG/Bond configuration - input vs fetched comparison
  lag: {
    name_input?: string;      // From Excel (may be auto-generated)
    name_fetched?: string;    // From API response
    mode_input?: string;      // From Excel (lacp_active, static, none)
    mode_fetched?: string;    // From API response
  };
  
  // Connectivity Templates - input vs fetched comparison
  connectivity: {
    templates_input?: string; // From Excel (comma-separated)
    templates_fetched?: string; // From API (comma-separated, merged)
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
  
  // Metadata and context
  metadata: {
    blueprint?: string;       // Blueprint context
    comment?: string;         // User comments
    source: 'xlsx' | 'api' | 'both'; // Data source indicator
    lastUpdated?: Date;       // Last modification timestamp
  };
  
  // Raw API data for advanced operations
  rawApiData?: any;          // Complete API response for debugging
}
```

#### ProvisioningEntryCollection Type

```typescript
// Main collection type - Map for O(1) connection key lookups
type ProvisioningEntryCollection = Map<string, ProvisioningEntry>;

// Key: connectionKey (switchName-switchInterface)
// Value: Complete provisioning entry with all input/fetched field pairs
```

### Data Management Patterns

#### **1. Data Initialization Pattern**
```typescript
// Transform Excel data to ProvisioningEntry collection
const entries = ProvisioningEntryService.fromNetworkConfigRows(excelData);
// Result: Collection with input fields populated, fetched fields empty
```

#### **2. API Data Merging Pattern**
```typescript
// Merge API results into existing collection
const updatedEntries = ProvisioningEntryService.mergeApiData(entries, apiDataMap);
// Result: Collection with both input and fetched fields populated
```

#### **3. Comprehensive Analysis Pattern**
```typescript
// Analyze input vs fetched data across all entries
const analysis = ProvisioningEntryService.analyzeProvisioning(entries);
// Result: Complete provisioning analysis with match statistics
```

### Field-Level Comparison System

#### FieldComparison Interface

```typescript
interface FieldComparison {
  field: string;           // Field identifier
  inputValue?: any;        // Value from Excel input
  fetchedValue?: any;      // Value from API response
  matches: boolean;        // True if values match exactly
  status: 'match' | 'mismatch' | 'input_only' | 'fetched_only' | 'both_missing';
}
```

#### Entry-Level Analysis

```typescript
interface EntryComparison {
  connectionKey: string;           // Connection identifier
  entry: ProvisioningEntry;        // Complete entry data
  fieldComparisons: FieldComparison[]; // Individual field results
  overallStatus: 'complete_match' | 'partial_match' | 'no_match' | 'input_only' | 'fetched_only';
  matchScore: number;              // Percentage match (0-100)
}
```

### Comprehensive Provisioning Analysis

#### ProvisioningAnalysis Interface

```typescript
interface ProvisioningAnalysis {
  totalEntries: number;        // Total entries in collection
  completeMatches: number;     // Entries with 100% field matches
  partialMatches: number;      // Entries with some field matches
  inputOnlyEntries: number;    // Excel-only entries (not in API)
  fetchedOnlyEntries: number;  // API-only entries ("Blueprint Only")
  entryComparisons: EntryComparison[]; // Detailed per-entry analysis
}
```

### Three View Modes

#### **1. Input Only Mode**
- Display only Excel data (`*_input` fields)
- Clean view of planned configuration
- Useful for initial data validation

#### **2. Fetched Only Mode** 
- Display only API data (`*_fetched` fields)
- Clean view of current network state
- Useful for network discovery and validation

#### **3. Input vs Fetched Comparison Mode**
- Side-by-side display of input and fetched values
- Visual indicators for matches/mismatches
- Comprehensive comparison workflow

### Visual Feedback Enhancements

#### Source Badges
- **XLSX**: Blue badge - data from Excel input only
- **API**: Green badge - data from API response only  
- **BOTH**: Orange badge - data from both sources

#### Field-Level Color Coding
- **Green**: Input and fetched values match exactly
- **Red**: Input and fetched values differ
- **Gray**: No data available (empty fields)
- **Blue**: Special "Blueprint Only" connections

#### Enhanced Tooltips for Mismatch Analysis
- **Hover tooltips** show detailed comparison information for all data cells
- **Mismatch cells** display both Excel and Apstra values with visual indicators
- **Match confirmation** shows "✓ (matches Apstra)" for validated fields
- **Missing data** indicators show "not found in Apstra Blueprint" or "not in Excel"
- **Blueprint-only** entries show "Found only in Apstra Blueprint"
- **Dotted underline** visual cue for fields with differences (Enhanced mode only)

### Service Layer Architecture

#### ProvisioningEntryService

**Core Methods**:
- `fromNetworkConfigRows()`: Transform Excel data to ProvisioningEntry collection
- `mergeApiData()`: Merge API results with existing entries
- `analyzeProvisioning()`: Comprehensive field comparison analysis
- `toNetworkConfigRows()`: Convert back to legacy format for compatibility

**Key Features**:
- **Speed Normalization**: Consistent speed format handling
- **CT Data Merging**: Proper comma-separated list deduplication
- **Group Validation**: Advanced LAG group consistency checking
- **Backward Compatibility**: Seamless integration with existing systems

### Migration Strategy

#### Phase 1: Dual System Support
- Legacy `ProvisioningTable.tsx` remains functional
- New `EnhancedProvisioningTable.tsx` available as alternative
- Both systems share same data validation and processing backend

#### Phase 2: Gradual Migration
- Feature parity between legacy and enhanced systems
- User preference selection for table implementation
- Performance optimization and bug fixes in enhanced system

#### Phase 3: Legacy Deprecation
- Enhanced system becomes primary implementation
- Legacy system maintained for backward compatibility
- Full migration to ProvisioningEntry data structure

## CRITICAL: Multi-Chunk API Data Merging

### Fundamental Architecture Problem

Apstra's connectivity graph queries use optional sections that create multiple result entries for the same logical network connection. This is NOT a bug - it's how Apstra's graph query engine works with optional data paths.

### Real-World Example

For a single connection (switch1 → server1, port et-0/0/1), the API may return 4 separate chunks:

```javascript
// Chunk 1: Basic connection info
{
  switch: { label: "switch1" },
  server: { label: "server1" },
  switch_intf: { if_name: "et-0/0/1" },
  server_intf: { if_name: "ens8" }
}

// Chunk 2: Speed information
{
  switch: { label: "switch1" },
  server: { label: "server1" },
  link1: { speed: "25G" }
}

// Chunk 3: LAG configuration  
{
  switch: { label: "switch1" },
  server: { label: "server1" },
  ae1: { if_name: "ae0" },
  evpn1: { lag_mode: "lacp_active" }
}

// Chunk 4: Connectivity templates
{
  switch: { label: "switch1" },
  server: { label: "server1" },
  ct_names: "DC-Fabric-CT,Storage-CT"
}
```

### Required Merging Algorithm

**Location**: `ProvisioningTable.tsx` lines 530-600

```typescript
// CRITICAL: Comprehensive multi-chunk merging
const mergedRawData = {
  ...existingData.rawData,
  ...item,
  // Preserve ALL critical object structures from both chunks
  link1: existingData.rawData?.link1 || item.link1,
  switch: existingData.rawData?.switch || item.switch,
  server: existingData.rawData?.server || item.server,
  switch_intf: existingData.rawData?.switch_intf || item.switch_intf,
  server_intf: existingData.rawData?.server_intf || item.server_intf,
  intf1: existingData.rawData?.intf1 || item.intf1,
  intf2: existingData.rawData?.intf2 || item.intf2,
  ae1: existingData.rawData?.ae1 || item.ae1,
  evpn1: existingData.rawData?.evpn1 || item.evpn1,
  ae_interface: existingData.rawData?.ae_interface || item.ae_interface
};

// CT Data Collection and Merging
const existingCTs = existingData.rawData?.ct_names || existingData.rawData?.CT?.label || '';
const newCTs = item.ct_names || item.CT?.label || '';

if (newCTs && existingCTs) {
  // Both exist - merge and deduplicate
  const existingList = existingCTs.split(',').map((ct: string) => ct.trim()).filter((ct: string) => ct);
  const newList = newCTs.split(',').map((ct: string) => ct.trim()).filter((ct: string) => ct);
  const combinedList = [...new Set([...existingList, ...newList])];
  mergedRawData.ct_names = combinedList.join(',');
} else if (newCTs && !existingCTs) {
  mergedRawData.ct_names = newCTs;
}
```

### Critical Data Paths

**Basic Connection**: `switch.label`, `server.label`, `switch_intf.if_name`, `server_intf.if_name`
**Speed Data**: `link1.speed` (may appear in any chunk)
**LAG/Bond Data**: `ae1.if_name` (may appear in separate chunk from basic connection)
**LAG Mode**: `evpn1.lag_mode` (may appear with or without ae1 data)
**Connectivity Templates**: `ct_names` (may appear independently)
**External Status**: `is_external` (may appear in separate chunk)

### NEVER Rules (Prevent Data Loss)

❌ **NEVER** overwrite API result chunks without merging - causes complete data loss
❌ **NEVER** assume first API result contains all connection data
❌ **NEVER** ignore subsequent chunks for the same connection key
❌ **NEVER** leave "Only in Blueprint" connections with empty critical fields
❌ **NEVER** use `apiConnectionsMap.delete()` before capturing final React state
❌ **NEVER** modify merging logic without testing with real multi-chunk API responses

### ALWAYS Rules (Ensure Complete Data)

✅ **ALWAYS** merge all API result chunks for the same connection key
✅ **ALWAYS** preserve existing data when adding new chunk data
✅ **ALWAYS** use field-level merging for partial object structures
✅ **ALWAYS** populate new provisioning table rows with complete merged API data
✅ **ALWAYS** test with API responses that have 3+ chunks per connection
✅ **ALWAYS** validate that critical fields appear correctly in the table

## CRITICAL: LAG/Bond Name Processing

### Auto-Generation Logic

**Trigger Conditions**:
- Excel cell is empty (`!row.link_group_ifname`)
- LAG Mode is "lacp_active" (`row.link_group_lag_mode === 'lacp_active'`)

**Sequential Assignment**:
```typescript
// Group connections by server-switch pair
const lagGroupKey = `${row.server_label}-${row.switch_label}`;

// Assign sequential LAG names starting from ae900
const lagName = `ae${nextLagNumber}`; // ae900, ae901, ae902, etc.
```

**Real-World Example**:
```
Excel Input:
Row 7: server1-switch1-et-0/0/1, LAG Mode: lacp_active, LAG Name: [empty] → ae900
Row 8: server1-switch1-et-0/0/2, LAG Mode: lacp_active, LAG Name: [empty] → ae900

API Response:
server1-switch1-et-0/0/1: ae1.if_name = "ae0"
server1-switch1-et-0/0/2: ae1.if_name = "ae0"

Result: LAG GROUP MATCH (both Excel ae900 ↔ both API ae0)
```

### Group Validation Algorithm

**Location**: `ProvisioningTable.tsx` lines 594-650

```typescript
// Group Excel connections by LAG name
const excelLagGroups = new Map<string, NetworkConfigRow[]>();

// For each LAG group, validate against API data
excelLagGroups.forEach((lagConnections, lagName) => {
  const apiLagNames = new Set<string>();
  
  lagConnections.forEach(row => {
    const apiData = apiDataMap.get(connectionKey);
    const apiLagIfname = apiData.ae1?.if_name || apiData.ae_interface?.name || '';
    if (apiLagIfname) apiLagNames.add(apiLagIfname);
  });
  
  // LAG group matches if all API connections have same LAG name
  const lagGroupMatches = allConnectionsHaveApiData && apiLagNames.size === 1;
});
```

### LAG Group Match Criteria

1. **All Excel connections** in the LAG group must have corresponding API data
2. **All API connections** in the group must have the same LAG name
3. **Consistency across group**: Group-level validation, not individual field comparison
4. **Group-level validation**: Replaces simple field comparison with sophisticated group logic

### Auto-Generation Rules

**Grouping Strategy**: Server-switch pairs get same LAG name (server1-switch1 → ae900)
**Sequential Numbering**: Each new server-switch pair gets next number (server2-switch1 → ae901)
**User Preservation**: User-provided LAG names are never overwritten with auto-generated ones
**Scope Limitation**: Only applies to lacp_active connections, not static or none modes

### NEVER Rules (Prevent LAG Processing Failures)

❌ **NEVER** use simple field comparison for LAG names with group validation enabled
❌ **NEVER** overwrite user-provided LAG names with auto-generated ones
❌ **NEVER** validate LAG groups individually instead of collectively
❌ **NEVER** assume LAG connections appear in sequential order in Excel or API
❌ **NEVER** ignore group consistency when API returns different LAG names for same Excel group
❌ **NEVER** modify LAG processing without testing with fixture rows 7-8 scenario

### ALWAYS Rules (Ensure LAG Processing Integrity)

✅ **ALWAYS** auto-generate sequential LAG names for empty lacp_active connections
✅ **ALWAYS** validate LAG groups collectively, not individually
✅ **ALWAYS** preserve user-provided LAG names in Excel input
✅ **ALWAYS** group connections by server-switch pairs for LAG assignment
✅ **ALWAYS** use group validation results for LAG field matching
✅ **ALWAYS** test with Excel connections that should have same LAG name

## Multi-State Visual Feedback System

### Visual State Categories

1. **🔘 XLSX Pending** (Light gray with left border) - Initial Excel data before API comparison
2. **🟢 Match** (Green) - Excel data matches Apstra API data
3. **🔴 Mismatch** (Red) - Excel data differs from Apstra API data
4. **🟠 Missing** (Orange) - Excel data not found in Apstra
5. **🔵 Blueprint-only** (Light blue) - Connection exists only in Apstra

### State Determination Logic

**Location**: `ProvisioningTable.tsx` lines 1000-1040

```typescript
// State determination based on API data availability
const hasApiDataAvailable = apiDataMap.size > 0; // Check if Fetch & Compare was run

if (hasApiDataAvailable && apiData) {
  // Post-comparison: Green (match) or Red (mismatch)
  const hasMatch = fieldMatches[columnKey] || false;
  baseClass += hasMatch ? ' field-match' : ' field-mismatch';
} else if (hasApiDataAvailable && !apiData) {
  // Connection missing from Apstra: Orange
  baseClass += ' field-missing';
} else {
  // Pre-comparison: Light gray pending state
  baseClass += ' field-xlsx-pending';
}
```

### CSS Color Definitions

```css
.field-xlsx-pending { background-color: #f8f9fa; border-left: 3px solid #dee2e6; }
.field-match       { background-color: #d4edda; color: #155724; }
.field-mismatch    { background-color: #f8d7da; color: #721c24; }
.field-missing     { background-color: #fff3cd; color: #856404; }
.blueprint-only    { background-color: #e7f3ff; color: #0c5460; }
```

### User Experience Flow

1. **Excel Upload**: All data cells show light gray "pending" state
2. **Fetch & Compare**: Colors transition to show actual comparison results  
3. **Visual Clarity**: Users immediately see which data needs attention

### Comparable Fields

Applied to: `switch_label`, `server_label`, `switch_ifname`, `server_ifname`, `link_speed`, `link_group_lag_mode`, `link_group_ct_names`, `is_external`

## Field Comparison Logic

### Speed Normalization System

**Backend Data Normalization**:
```rust
fn normalize_link_speed(speed: &str) -> String {
    // Converts Excel formats to clean units:
    // "25GB" -> "25G"
    // "100MB" -> "100M" 
    // "25 Gbps" -> "25G"
    // "10" -> "10G" (raw numbers assume GB)
}
```

**Frontend Display Logic**:
```typescript
case 'link_speed':
  // Don't add Gbps if the value already has a unit (G, M, etc.)
  if (value && typeof value === 'string' && /[GM]$/.test(value)) {
    return value;  // Return "25G" as-is
  }
  return value ? `${value} Gbps` : '';  // Legacy: "10" -> "10 Gbps"
```

### Interface Name Generation

**Speed-Based Interface Prefixes**:
- `> 10G` → "et-" (Ethernet, 25G, 40G, 100G, etc.)
- `= 10G` → "xe-" (10 Gigabit Ethernet)
- `< 10G` → "ge-" (Gigabit Ethernet, 1G, etc.)

**Interface Format**: `{prefix}-0/0/{port_number}`

**Examples**:
- Port "2" + Speed "25G" → `"et-0/0/2"`
- Port "5" + Speed "10G" → `"xe-0/0/5"`
- Port "1" + Speed "1G" → `"ge-0/0/1"`

### CT Data Comparison

**Location**: `ProvisioningTable.tsx` lines 943-946

```typescript
// CT comparison with proper comma-separated list handling
const excelCTs = (row.link_group_ct_names || '').split(',')
  .map((ct: string) => ct.trim())
  .filter((ct: string) => ct)
  .sort();
  
const apiCTsList = (apiCtNames || '').split(',')
  .map((ct: string) => ct.trim())
  .filter((ct: string) => ct)
  .sort();
  
const ctNamesMatch = JSON.stringify(excelCTs) === JSON.stringify(apiCTsList);
```

## Common Issues & Troubleshooting

### CT Data Assignment Issues

**Symptoms**:
- Wrong CT names appearing in provisioning table
- CT data missing despite API query success
- Incorrect color coding for CT fields

**Root Cause**: CT data merging logic overwrites instead of appends
**Solution**: Use proper CT collection and deduplication logic (implemented in lines 562-581)

### LAG Processing Issues

**Symptoms**:
- LAG names not auto-generated for lacp_active connections
- LAG group validation showing mismatches when should match
- Color coding wrong for LAG/Bond Name fields

**Debugging Steps**:
1. Verify auto-generation conditions: `!row.link_group_ifname && row.link_group_lag_mode === 'lacp_active'`
2. Check API data merging preserves `ae1.if_name` data
3. Validate LAG group validation logic with fixture rows 7-8
4. Test color coding shows correct match/mismatch states

### React State Management Issues

**Symptoms**:
- Incorrect colors despite successful API matching
- Data shows as missing when API query returns matches

**Root Cause**: `apiConnectionsMap.delete()` removes data before creating final React state
**Solution**: Create final state map BEFORE any deletions

### Performance Issues

**Symptoms**:
- Slow table rendering with large datasets
- Memory issues with complex API responses

**Solutions**:
- Implement virtual scrolling for tables >1000 rows
- Use React.memo for table cell components
- Batch API data processing in chunks
- Implement data pagination

## Testing Strategy

### Critical Test Cases

**Excel Data Processing**:
```bash
cargo test test_port_field_mapping_regression  # Two-phase field mapping
cargo test test_merged_cell_server_names      # Merged cell detection
```

**LAG Processing**:
- Test fixture rows 7-8 scenario for LAG group validation
- Verify auto-generated LAG names appear correctly
- Test LAG group consistency validation

**API Data Merging**:
- Test multi-chunk API responses with 3+ chunks per connection
- Verify CT data collection and deduplication
- Test speed data preservation across chunks

**Visual State System**:
- Test all 5 color states (pending, match, mismatch, missing, blueprint-only)
- Verify state transitions after Fetch & Compare operation
- Test field-specific color application

### Integration Testing

```bash
RUST_LOG=debug npm run tauri:dev
# Test complete workflow: Upload → Parse → Display → API Compare → Visual Feedback
```

### Regression Prevention

**Before any changes**:
1. Run full test suite: `npm run test:rust && npm test`
2. Test critical user workflows manually
3. Verify no console errors or warnings
4. Test with real Excel data and API responses

## Enhanced ProvisioningEntry System Benefits

### **Key Advantages of New Architecture**

#### **✅ Clean Data Separation**
- **Input data** (xlsx) and **fetched data** (API) are completely separate throughout the entire workflow
- **No data mixing** or overwriting during comparison operations
- **Original data integrity** preserved at all times - Excel data never gets modified by API operations
- **Independent validation** of both input and fetched data sources

#### **✅ Comprehensive Field-Level Analysis**
- **Individual field comparison** with detailed match/mismatch indicators
- **Visual feedback** shows exactly which fields match, differ, or are missing
- **Match scoring** provides quantitative assessment (0-100%) of data alignment
- **Granular validation** enables targeted data correction and verification

#### **✅ Flexible Data Management** 
- **API results merged/combined** and properly associated to entries via stable connection keys
- **Multi-chunk API responses** correctly merged to single logical entries
- **Backward compatibility** maintained with existing `NetworkConfigRow` format
- **Future-proof architecture** supports additional data sources and field types

#### **✅ Enhanced User Experience**
- **Three view modes** (Input/Fetched/Comparison) for different workflow requirements
- **Analysis summary** provides instant overview of comparison statistics
- **Source badges** clearly indicate data origin (XLSX/API/BOTH)
- **Performance optimization** with O(1) connection key lookups

### **Workflow Improvements**

#### **Before (Legacy System)**
1. Upload Excel → Display table
2. Fetch API data → Overwrite/merge fields
3. Basic color coding
4. Limited comparison capabilities

#### **After (Enhanced System)**
1. Upload Excel → ProvisioningEntry collection (input fields)
2. Fetch API data → Merge into existing collection (fetched fields)
3. Comprehensive analysis → Detailed field-by-field comparison
4. Three view modes → Flexible data visualization
5. Export analysis → Detailed comparison reports

### **Development Benefits**

#### **Code Maintainability**
- **Single responsibility**: Each component handles one data source
- **Type safety**: Full TypeScript interface definitions
- **Testability**: Clear separation enables focused unit testing
- **Debugging**: Raw API data preserved for troubleshooting

#### **Scalability**
- **O(1) lookups**: Map-based collection for efficient operations
- **Memory efficiency**: Structured data organization
- **Extensibility**: Easy to add new field types or data sources
- **Performance**: Optimized comparison algorithms

### **Usage Patterns**

#### **For Network Engineers**
- **Data Validation**: Compare planned vs actual network configuration
- **Discovery Mode**: Find connections not documented in Excel
- **Audit Workflows**: Generate comprehensive comparison reports
- **Troubleshooting**: Identify configuration discrepancies

#### **For DevOps Teams**
- **Infrastructure as Code**: Validate network definitions
- **Change Management**: Track configuration differences
- **Compliance**: Ensure network matches documentation
- **Automation**: Programmatic access to comparison results

### **Migration Path**

#### **Immediate Benefits (Phase 1)**
- New projects can use enhanced system immediately
- Legacy projects continue with existing functionality
- Side-by-side comparison of both implementations

#### **Gradual Adoption (Phase 2)**
- Feature by feature migration
- User training and feedback integration
- Performance optimization based on real usage

#### **Full Integration (Phase 3)**
- Enhanced system becomes primary implementation
- Legacy system maintained for compatibility
- Complete migration to ProvisioningEntry architecture

---

**Reference**: This document serves as the single source of truth for Provisioning Table specifications, requirements, implementation, and troubleshooting. All provisioning table documentation should reference this file.