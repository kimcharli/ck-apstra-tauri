# Data Processing Documentation

## Data Processing Pipeline

- Excel (.xlsx) file upload with temporary storage
- Sheet selection interface after upload
- Header mapping for network configuration fields (blueprint, server_label, is_external, etc.)
- Row validation with duplicate detection (skip rows with same switch + switch_ifname)
- Sortable table display with filtering capabilities
- Automatic cleanup of temporary files after processing

## Dynamic Conversion Map Architecture

**CRITICAL FEATURE**: The application supports fully dynamic, customer-configurable conversion maps without requiring code changes or recompilation.

### Architecture Overview

**Three-Tier Fallback System**:
1. **User-provided conversion map** (highest priority) - Runtime JSON configuration
2. **Default conversion map** from `data/default_conversion_map.json`
3. **Built-in fallback logic** with common field variations (lowest priority)

### Customer Configuration Workflow

**JSON Configuration Format**:
```json
{
    "header_row": 2,
    "mappings": {
        "Switch Name": "switch_label",
        "Port": "switch_ifname", 
        "Host Name": "server_label",
        "Slot/Port": "server_ifname",
        "Custom Field": "target_field"
    }
}
```

**File Locations**:
- **Default**: `data/default_conversion_map.json` (embedded in application)
- **User Custom**: App data directory `/conversion_maps/user_conversion_map.json`
- **Project Specific**: Any file path via `ConversionService::load_conversion_map_from_file()`

### Technical Implementation

**Runtime Conversion Map Loading** (`src-tauri/src/commands/data_parser.rs`):
```rust
pub async fn parse_excel_sheet(
    file_path: String, 
    sheet_name: String, 
    conversion_map: Option<ConversionMap>  // Dynamic conversion map input
) -> Result<Vec<NetworkConfigRow>, String>
```

**Intelligent Header Matching** (`create_conversion_field_mapping`):
- **Specificity Priority**: Longer header matches processed first (`"Slot/Port"` before `"Slot"`)
- **Normalization**: Case-insensitive, whitespace-normalized, line break handling (`\r\n`)
- **Exact + Partial Matching**: Supports both precise matches and flexible partial matching
- **Conflict Prevention**: Already-mapped fields protected from less-specific overwrites

### Two-Phase Field Mapping Algorithm

**CRITICAL**: The field mapping algorithm uses a two-phase approach to ensure exact matches take absolute priority over partial matches:

**Phase 1 - Exact Match Priority**: Process ALL headers for exact matches first
- Normalized comparison (case-insensitive, whitespace-normalized, line break handling)
- Each conversion map entry checked against all headers
- Once exact match found, field is locked and won't be overwritten

**Phase 2 - Partial Match Fallback**: Only process headers not mapped in Phase 1
- Contains-based matching for flexibility
- Longer conversion map entries processed first for specificity
- Only maps to fields not already claimed in Phase 1

**Regression Prevention**: This prevents issues like "Port" column being incorrectly mapped to "Trunk/Access Port" column due to partial matching. The exact match "Port" → `switch_ifname` will always take priority over partial matches.

## Excel Merged Cell Handling

**CRITICAL IMPLEMENTATION**: The application includes intelligent merged cell detection specifically designed for network configuration data patterns.

**CALAMINE 0.30.0 UPGRADE**: Now provides full Excel merged region metadata support with methods:
- `load_merged_regions()`: Loads merged region data from Excel file
- `merged_regions()`: Returns all merged regions across worksheets
- `merged_regions_by_sheet(name)`: Returns merged regions for specific sheet

**ARCHITECTURE EVOLUTION**:
- **Previous (0.22)**: Heuristic-based selective processing due to API limitations
- **Current (0.30.0)**: Access to 1,100+ actual merged regions in test Excel files
- **Future**: Universal processing using Excel's metadata (now technically possible)

**Key Design Decisions**:
- **Vertical-Only Propagation**: Only propagates values vertically (down rows) to avoid false positives from horizontal propagation
- **Server Name Focus**: Primarily designed to handle server names that span multiple rows in merged cells
- **Conservative Approach**: Avoids complex horizontal merge detection that could introduce errors in network data

**SELECTIVE COLUMN PROCESSING**:
Due to calamine library limitations (no merged region API), the system uses selective processing:

```rust
let merge_enabled_columns: std::collections::HashSet<&str> = [
    "CTs",              // Connectivity Templates - USER CONFIRMED: merged cells
    "link_group_ct_names", // Internal field name for CTs  
    "Host Name",        // Server names - EVIDENCE: merged cells detected
    "server_label",     // Internal field name for Host Name
].iter().cloned().collect();
```

**IMPLEMENTATION ROADMAP**:

1. ✅ **Library Upgrade Complete**: Upgraded to calamine 0.30.0 with merged region API support
2. 🚧 **Metadata Integration**: Currently reading Excel merge data (1,100+ regions detected in test files)
3. 🔄 **Universal Processing**: Replace selective heuristic approach with metadata-based universal processing
4. 🔄 **Performance Optimization**: Process only regions that affect visible data rows

**CURRENT STATUS**: 
- **Working**: Selective heuristic processing (server names and CTs)
- **Available**: Complete Excel merged region metadata via calamine 0.30.0 API
- **Next**: Replace heuristics with universal metadata-based processing

## Speed Normalization System

**CRITICAL**: Prevents "25G Gbps" display issues through two-part normalization:

**Backend Data Normalization** (`src-tauri/src/commands/data_parser.rs:571-600`):
```rust
fn normalize_link_speed(speed: &str) -> String {
    // Converts Excel formats to clean units:
    // "25GB" -> "25G"
    // "100MB" -> "100M" 
    // "25 Gbps" -> "25G"
    // "10" -> "10G" (raw numbers assume GB)
}
```

**Frontend Display Logic** (`src/components/ProvisioningTable/ProvisioningTable.tsx:111-116`):
```typescript
case 'link_speed':
  // Don't add Gbps if the value already has a unit (G, M, etc.)
  if (value && typeof value === 'string' && /[GM]$/.test(value)) {
    return value;  // Return "25G" as-is
  }
  return value ? `${value} Gbps` : '';  // Legacy: "10" -> "10 Gbps"
```

## Switch Interface Naming Convention

**CRITICAL**: Automatic interface name generation based on speed and port number for network provisioning.

**Speed-Based Interface Prefixes**:
```
> 10G  → "et-" (Ethernet, 25G, 40G, 100G, etc.)
= 10G  → "xe-" (10 Gigabit Ethernet) 
< 10G  → "ge-" (Gigabit Ethernet, 1G, etc.)
```

**Interface Format**: `{prefix}-0/0/{port_number}`

**Examples**:
- Port "2" + Speed "25G" → `"et-0/0/2"`
- Port "5" + Speed "10G" → `"xe-0/0/5"`  
- Port "1" + Speed "1G" → `"ge-0/0/1"`

## Field Naming Consistency

**CRITICAL**: Consistent field naming prevents integration failures:

- **Raw Input Processing**: Field mapping occurs ONLY during sheet selection stage
- **Normalized Internal Names**: After sheet selection, use consistent internal field names:
  - `blueprint`, `server_label`, `switch_label`, `switch_ifname`, `server_ifname`
  - `link_speed`, `link_group_lag_mode`, `link_group_ct_names`
  - `server_tags`, `switch_tags`, `link_tags`
- **UI Display Names**: Frontend components may use display-friendly names for presentation
- **Service Integration**: All backend services expect normalized field names consistently

**Rule**: Never mix field naming conventions within a single service or data flow.

## Required Fields Validation

**CRITICAL**: Provisioning table must only show rows with both switch name and interface defined.

**Problem**: Excel files often contain rows with incomplete data (missing switch name OR interface). These incomplete rows cannot be provisioned and should be filtered out.

**Solution** (`src-tauri/src/commands/data_parser.rs:642`):
```rust
// BOTH fields required - use OR to filter out incomplete rows
if switch_label.is_none() || raw_switch_ifname.is_none() {
    log::debug!("Skipping row due to missing required switch fields");
    return None; // Skip rows without essential network info  
}
```