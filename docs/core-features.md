# Core Features Specification

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
- **Required Column Headers**:
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

### Conversion Mapping System
- **Default Conversion Map**: Ships with predefined Excel header mappings loaded from embedded JSON
- **User Customization**: Users can modify conversion mappings through dedicated UI interface
- **Flexible Loading**: Support loading conversion maps from external JSON files
- **Persistent Configuration**: Save user customizations to local configuration files
- **Header Row Configuration**: Configurable header row location (default: row 1)
- **Dynamic Updates**: Conversion map changes immediately apply to current Excel data

### Data Validation Rules
- **Conversion-Based Mapping**: Use conversion maps to translate Excel headers to internal field names
- **Fallback Logic**: Default header matching when no conversion map is configured
- **Required Fields**: Only process rows with essential network information (switch_label, switch_ifname)
- **Duplicate Detection**: Skip rows with identical switch + switch_ifname combinations
- **Data Type Validation**: Validate field formats and constraints based on target field types
- **Error Aggregation**: Collect and report all validation issues with specific row/column context

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