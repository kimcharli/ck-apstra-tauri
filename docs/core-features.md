# Core Features Specification

## Core Features Overview

This document outlines the implemented core features of the Apstra Network Configuration Tool, including Excel processing, API integration, and comprehensive tooling capabilities.

## 4.1 Excel File Processing

### File Upload System
- **Input**: Excel (.xlsx) files via drag-and-drop or file picker
- **Temporary Storage**: Secure temporary file storage with automatic cleanup
- **File Validation**: MIME type checking, file size limits
- **Error Handling**: Clear feedback for invalid files

### Sheet Selection Interface
- Display list of available sheets after successful upload
- Sheet preview functionality
- Selection persistence until processing completion

### Data Parsing Engine

**Excel Parsing Pipeline**:
- Excel (.xlsx) file upload with temporary storage
- Sheet selection interface after upload
- Header mapping for network configuration fields (blueprint, server_label, is_external, etc.)
- Row validation with duplicate detection (skip rows with same switch + switch_ifname)
- Sortable table display with filtering capabilities
- Automatic cleanup of temporary files after processing

**Required Column Headers**:
  ```
  - Switch (switch_label)
  - Switch Interface (switch_ifname)
  - Server (server_label)
  - Server Interface (server_ifname)
  - Switch Tags
  - Link Tags
  - CTs (link_group_ct_names)
  - AE (link_group_ifname)
  - LAG Mode (link_group_lag_mode)
  - Speed (link_speed)
  - External (is_external)
  - Server Tags
  ```

**Two-Phase Field Mapping Algorithm**:

**CRITICAL**: The field mapping algorithm uses a two-phase approach to ensure exact matches take absolute priority over partial matches:

- **Phase 1 - Exact Match Priority**: Process ALL headers for exact matches first
  - Normalized comparison (case-insensitive, whitespace-normalized, line break handling)
  - Each conversion map entry checked against all headers
  - Once exact match found, field is locked and won't be overwritten

- **Phase 2 - Partial Match Fallback**: Only process headers not mapped in Phase 1
  - Contains-based matching for flexibility
  - Longer conversion map entries processed first for specificity
  - Only maps to fields not already claimed in Phase 1

**Regression Prevention**: This prevents issues like "Port" column being incorrectly mapped to "Trunk/Access Port" column due to partial matching. The exact match "Port" → `switch_ifname` will always take priority over partial matches.

### Enhanced Conversion Mapping System

**CRITICAL FEATURE**: The application uses a comprehensive Enhanced Conversion Map system for dynamic field mapping, transformations, and validation.

**📖 Complete Documentation**: See **[Enhanced Conversion Map System](enhanced-conversion-map.md)** for comprehensive specification, implementation details, and usage patterns.

**Key Capabilities**:
- **Dynamic Field Mapping**: Excel headers → internal fields with priority-based matching
- **Built-in Transformations**: Speed normalization ("25GB" → "25G"), interface name generation
- **Validation Rules**: Field-specific validation with custom patterns and constraints
- **UI Configuration**: Column widths, sorting, filtering controlled via conversion map
- **API Integration**: Automatic data extraction from Apstra API responses

### Data Validation Rules
- **Conversion-Based Mapping**: Use conversion maps to translate Excel headers to internal field names
- **Fallback Logic**: Default header matching when no conversion map is configured
- **Required Fields**: Only process rows with essential network information (switch_label, switch_ifname)
- **Duplicate Detection**: Skip rows with identical switch + switch_ifname combinations
- **Data Type Validation**: Validate field formats and constraints based on target field types
- **Error Aggregation**: Collect and report all validation issues with specific row/column context

### Speed Normalization System

**CRITICAL**: Prevents "25G Gbps" display issues through two-part normalization:

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

### Switch Interface Naming Convention

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

### Excel Merged Cell Handling

**CRITICAL IMPLEMENTATION**: The application includes intelligent merged cell detection specifically designed for network configuration data patterns.

**Key Design Decisions**:
- **Vertical-Only Propagation**: Only propagates values vertically (down rows) to avoid false positives from horizontal propagation
- **Server Name Focus**: Primarily designed to handle server names that span multiple rows in merged cells
- **Conservative Approach**: Avoids complex horizontal merge detection that could introduce errors in network data

**SELECTIVE COLUMN PROCESSING**:
```rust
let merge_enabled_columns: std::collections::HashSet<&str> = [
    "CTs",              // Connectivity Templates - USER CONFIRMED: merged cells
    "link_group_ct_names", // Internal field name for CTs  
    "Host Name",        // Server names - EVIDENCE: merged cells detected
    "server_label",     // Internal field name for Host Name
].iter().cloned().collect();
```

**CURRENT STATUS**: 
- **Working**: Selective heuristic processing (server names and CTs)
- **Available**: Complete Excel merged region metadata via calamine 0.30.0 API
- **Next**: Replace heuristics with universal metadata-based processing

### Provisioning Table

The Provisioning Table is the core component of the application. For complete documentation including data management rules, API integration, visual feedback system, and troubleshooting, see:

**📖 [Provisioning Table Documentation](provisioning-table.md)**

This dedicated document covers:
- Complete architecture and data flow
- Data management rules and synchronization logic  
- CRITICAL: Multi-chunk API data merging
- CRITICAL: LAG/Bond Name processing and validation
- Multi-state visual feedback system
- Field comparison and normalization logic
- Comprehensive troubleshooting guide

### Defensive Data Processing
**CRITICAL**: Apply defensive programming for robust Excel processing:

- **Safe Field Access**: Never assume Excel headers exist; use Option/Result patterns
- **Multi-Format Support**: Handle multiple possible header name variations for the same logical field
- **Validation-First**: Validate data structure before attempting processing
- **Graceful Degradation**: Skip malformed rows without stopping entire operation
- **Error Context**: Provide detailed error information including row numbers and field names
- **Backward Compatibility**: Support multiple Excel format versions simultaneously

### Field Naming Standards
**CRITICAL**: Consistent field naming prevents integration failures:

- **Raw Input Processing**: Field mapping (`field_0`, `field_1`, etc.) occurs ONLY during sheet selection stage
- **Normalized Internal Names**: After sheet selection, all backend services use consistent field names:
  ```
  blueprint, server_label, switch_label, switch_ifname, server_ifname
  link_speed, link_group_lag_mode, link_group_ct_names
  server_tags, switch_tags, link_tags
  ```
- **UI Display Names**: Frontend may use display-friendly names for presentation
- **Service Integration**: All backend services expect normalized field names consistently

**Rule**: Never mix field naming conventions within a single service or data flow.

## 4.2 Data Visualization

### Interactive Table Component
- **Features**:
  - Column sorting (ascending/descending)
  - Column filtering and search
  - Row selection capabilities
  - Pagination for large datasets
  - Export functionality (CSV, JSON)

### Data Status Indicators
- Visual indicators for validation status
- Error highlighting and tooltips
- Summary statistics panel
- Data quality metrics

## 4.3 Action Processing Engine

### Supported Actions
- **Primary**: `import-generic-system`
- **Extensible**: Plugin architecture for additional actions

### Progress Tracking System
- **Real-time Updates**: WebSocket or event-based progress updates
- **Granular Status**: Per-row processing status
- **Time Estimation**: ETAs based on processing speed
- **Cancellation Support**: Ability to stop processing

### Error Handling
- **Graceful Degradation**: Continue processing despite individual failures
- **Detailed Logging**: Comprehensive error logs with context
- **Recovery Options**: Retry failed operations
- **User Notifications**: Clear error messages and suggested actions

### Critical Processing Patterns
**IMPORTANT**: These patterns prevent regressions and race conditions:

- **System Readiness Verification**: Ensure systems are ready before applying configurations
- **Wait Mechanisms**: Implement proper polling for system state changes (3-second intervals, 60-second timeout)
- **Race Condition Prevention**: Never proceed with dependent operations immediately after system creation
- **Intelligent Processing**: Only process when data differs from existing state (no-op optimization)
- **Selective Operations**: Only process interfaces with actual configuration changes needed


## 4.4 Conversion Mapping Architecture

### System Design
The conversion mapping system provides flexible translation between Excel header names and internal field names, enabling the application to process diverse Excel formats without requiring users to modify their spreadsheets.

### Core Components

**Backend Services**:
- `ConversionService`: Core service for loading/saving conversion maps
- `ConversionMapHandler`: Tauri command handlers for frontend-backend communication
- Embedded default mapping from `../45738-webtool/data/conversion_map.json`
- User data directory management for persistent configurations

**Frontend Components**:
- `ConversionMapManager`: Modal interface for editing conversion mappings
- Interactive mapping table with add/remove/edit capabilities
- Real-time preview of header-to-field mappings
- File import/export functionality for sharing configurations

**Data Models**:
- `ConversionMap`: Core mapping structure with header_row and mappings HashMap
- `ConversionMapInfo`: Extended metadata for saved configurations
- `HeaderMapping`: UI state representation for conversion pairs

### Operational Flow

1. **Default Loading**: Application embeds default conversion map from related project
2. **User Customization**: Users access conversion manager through main UI button
3. **Dynamic Application**: Changes to conversion map immediately reprocess current Excel data

## 4.5 Apstra API Integration & Tools

### Live Search Capabilities
The application provides real-time search functionality through direct Apstra API integration:

**System Search**:
- **Query Engine**: Uses Apstra's graph query engine at `/api/blueprints/{blueprint_id}/qe`
- **Search Pattern**: `match(node('system', label='{server_name}', name='system'))`
- **Real-time Results**: Live display with result count and structured JSON output
- **Blueprint Flexibility**: Dropdown selector and text input for blueprint targeting

**IP Address Search** (Planned):
- **CIDR Support**: Search for IP addresses and CIDR ranges
- **Network Topology**: Integration with network topology visualization
- **Cross-Blueprint**: Search capabilities across multiple blueprints

### Blueprint Management Tools
**Operations Available**:
- **Leafs Operation**: Retrieve leaf switch information with comprehensive details
- **Dump Operation**: Export blueprint configuration data for analysis
- **Direct API Access**: Live connection to Apstra controllers for real-time data

**Integration Features**:
- **Session Management**: Secure authentication with automatic token refresh
- **URL Generation**: Dynamic creation of Apstra web interface URLs for seamless navigation
- **Error Handling**: Comprehensive API error management with user-friendly feedback

### Authentication Architecture
**Implementation Details**:
- **Session-Based Auth**: Secure token management with AuthToken header pattern
- **Automatic Login**: Seamless authentication using stored Apstra configuration
- **Status Indicators**: Real-time authentication status across the application
- **Secure Storage**: Credentials protected with masked logging and secure handling

### Navigation & User Experience
**Seamless Integration**:
- **Button-Style Navigation**: Consistent button patterns for external Apstra web links
- **Tooltips & Context**: Descriptive tooltips for improved user understanding
- **Visual Feedback**: Clear indicators for connection status and operation results
- **Logging Integration**: All API interactions captured in comprehensive logging system

### Future API Extensions
**Planned Enhancements**:
- **Automated Provisioning**: Direct network configuration via Apstra API
- **Batch Operations**: Multi-system search and management capabilities
- **Configuration Management**: CRUD operations for blueprint manipulation
- **Advanced Analytics**: Deep integration with Apstra's analytics capabilities
4. **Persistence**: User configurations saved to local application data directory
5. **File Exchange**: Import/export JSON files for sharing conversion configurations

### Configuration Management
- **Default Map Location**: Embedded in Rust binary from `data/default_conversion_map.json`
- **User Map Storage**: `~/.local/share/ck-apstra-tauri/user_conversion_map.json` (Linux/macOS)
- **Windows User Maps**: `%APPDATA%/ck-apstra-tauri/user_conversion_map.json`
- **Header Row Flexibility**: Configurable header row position (1-based indexing)

## 4.5 Security Requirements

### File Security
- Sandboxed file processing
- Automatic cleanup of temporary files
- Input sanitization and validation
- Path traversal protection

### Data Privacy
- No data persistence beyond session
- Secure memory handling
- Audit logging for compliance

## 4.6 Logging and Post-Mortem Analysis System

### Comprehensive Logging Service
The application includes a comprehensive logging system for complete post-mortem analysis and debugging capabilities:

**Logging Categories**:
- NAVIGATION - Page and workflow transitions
- BUTTON_CLICK - All user interactions with buttons and controls
- WORKFLOW - Step-by-step workflow progress tracking
- DATA_CHANGE - Configuration and data modifications
- API_CALL - External service communications
- ERROR - System errors and failures
- SYSTEM - Application lifecycle and system events

**Logging Levels**: INFO, WARN, ERROR, DEBUG

### Session Management
- Unique session IDs for tracking user sessions
- Session lifecycle logging (startup/shutdown)
- Cross-component session correlation

### Log Export Functionality
**Multiple Export Formats**:
- **Text Format**: Human-readable logs with timestamps and details
- **JSON Format**: Structured data for programmatic analysis
- **CSV Format**: Spreadsheet-compatible for data analysis

**Export Features**:
- Timestamped filenames (e.g., `apstra-logs-2024-01-15T14-30-25.txt`)
- File format auto-detection based on extension
- Log filtering by category, level, and time range
- Statistical summaries included in exports

### User Interface Integration
**Logging Controls in UI**:
- Real-time log level adjustment (DEBUG/INFO/WARN/ERROR)
- Log export buttons in all major workflows
- Session summary statistics display
- Visual logging status indicators

### Data Captured for Post-Mortem
- User interaction sequences and timing
- Configuration changes and their contexts
- API call success/failure rates and timing
- Workflow completion statistics
- Error patterns and recovery attempts

### Privacy and Security
- Personal information filtering in log outputs
- Secure log file handling with proper permissions
- Local-first approach with no remote data persistence
- Session-based logging with privacy-conscious data handling