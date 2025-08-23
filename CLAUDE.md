# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tauri-based web application for processing Excel spreadsheets containing network configuration data. The application allows users to upload Excel files, select sheets, validate and visualize data, and perform automated actions on the network configuration data.

## Architecture

The project follows a Tauri architecture pattern with:
- **Frontend**: React with TypeScript for the user interface
- **Backend**: Rust-based Tauri backend for file processing and system interactions
- **Core Features**: Excel parsing, data validation, interactive table display, **Apstra API integration** with session management
- **API Integration**: Direct REST API communication with Apstra controllers for real-time search and management
- **State Management**: Session-based authentication with secure credential handling
- **URL Generation**: Dynamic Apstra web interface URL generation for seamless navigation

## Key Requirements

### Data Processing Pipeline
- Excel (.xlsx) file upload with temporary storage
- Sheet selection interface after upload
- Header mapping for network configuration fields (blueprint, server_label, is_external, etc.)
- Row validation with duplicate detection (skip rows with same switch + switch_ifname)
- Sortable table display with filtering capabilities
- Automatic cleanup of temporary files after processing

### Native Application Distribution
The application can be built as native desktop applications:
- **macOS**: `.app` bundle and `.dmg` installer
- **Windows**: `.exe` and `.msi` installers (requires Windows build environment)
- **Linux**: `.deb`, `.rpm`, and `.AppImage` packages (requires Linux build environment)

**Build Commands**:
```bash
# Build for current platform
npm run tauri build

# Cross-platform builds require platform-specific environments
# Use GitHub Actions for automated multi-platform builds
```

**Output Location**: `src-tauri/target/release/bundle/`

### Conversion Mapping System
The application uses a flexible conversion mapping system to translate Excel headers to internal field names:

**Default Mappings** (from embedded JSON):
- "Switch Name" → switch_label
- "Port" → switch_ifname  
- "Host Name" → server_label
- "Slot/Port" → server_ifname
- "Speed (GB)" → link_speed
- "LACPNeeded" → link_group_lag_mode
- "CTs" → link_group_ct_names
- "AE" → link_group_ifname
- "External" → is_external
- And more...

**User Customization**:
- Access conversion manager through "Manage Conversion Map" button
- Load/save custom mapping configurations
- Import/export mapping files for sharing
- Real-time preview of header mappings

**Internal Field Names**:
- blueprint, server_label, switch_label, switch_ifname, server_ifname
- link_speed, link_group_lag_mode, link_group_ct_names, link_group_ifname
- is_external, server_tags, switch_tags, link_tags, comment

### Action Processing
- Support for multiple action types (e.g., import-generic-system)
- Real-time progress tracking and status updates
- Comprehensive error handling and user feedback
- Action history tracking

### Apstra API Integration
- **Session Management**: Secure authentication with session tokens and automatic refresh
- **Live Search Capabilities**: Real-time system and IP address search across blueprints
- **Blueprint Operations**: Leafs and Dump operations with direct API integration
- **URL Generation**: Dynamic generation of Apstra web interface URLs for seamless navigation
- **Error Handling**: Comprehensive API error handling with user-friendly feedback
- **State Persistence**: Client-side state management for API sessions and configurations

## Development Commands

- `npm run tauri:dev` - Start development server
- `npm run tauri:build` - Build application for production
- `cargo test` - Run Rust backend tests (from src-tauri directory)
- `npm test` - Run frontend tests with Vitest
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:rust` - Run Rust backend tests
- `npm run test:integration` - Run integration tests
- `npm run dev` - Start frontend development server only
- `RUST_LOG=debug npm run tauri:dev` - Start with debug logging
- `npm run lint` - TypeScript type checking
- `npm run lint:rust` - Rust code linting with Clippy

## Security Considerations

- Secure file upload handling with validation
- Temporary file cleanup after processing
- Input validation for all user data
- Error handling without exposing sensitive information
- **Session-based authentication**: Secure credential storage and session token management
- **API Security**: Proper authentication headers and error handling for Apstra API calls
- **State Management**: Secure handling of authentication state and sensitive configuration data
- **URL Generation**: Safe construction of Apstra web interface URLs with parameter validation

## Debugging and Troubleshooting

### Common Issues and Solutions

**Excel Data Not Displaying**:
- Check debug logs with `RUST_LOG=debug npm run tauri:dev`
- Verify conversion map is loading: Look for "Using default conversion map with X mappings"
- Ensure JSON structure matches expected format in `data/default_conversion_map.json`
- Headers with line breaks (`\r\n`) are normalized during matching

**Conversion Map Issues**:
- JSON parsing supports both flat and nested "mappings" structure
- Headers are matched case-insensitively with normalization
- Debug logs show exact header bytes and field mappings created
- Default conversion map embedded from `data/default_conversion_map.json`

**Build Issues**:
- Ensure Tauri dependencies are installed: `cargo install tauri-cli`
- Check for missing icon files in `src-tauri/icons/`
- Verify all required npm dependencies are installed

**API Integration Issues**:
- Verify Apstra session authentication: Check for `401 Unauthorized` responses
- Test API connectivity: Use debug logs to trace API call failures
- Session timeout handling: Implement automatic re-authentication on session expiry
- MCP server integration: Ensure proper MCP server configuration for Apstra API calls

**Merged Cell Issues**:
- **Missing Server Names**: If server names don't appear in parsed data, verify that `apply_intelligent_merged_cell_detection` is being called in `parse_worksheet_data`
- **Incorrect Server Grouping**: Check debug logs for "column_carry_values" to see vertical propagation patterns
- **Server Names Appearing in Wrong Rows**: Verify that Excel file has proper vertical merged cells (server names should appear in first row of each group)
- **Empty Server Labels**: Ensure the "Host Name" or equivalent column is properly mapped in conversion map
- **Testing Merged Cell Logic**: Run `cargo test test_merged_cell_server_names` to verify with fixture file
- **Performance Issues**: If parsing is slow with large Excel files, merged cell detection runs in O(n*m) time - consider data size limits
- **Excel Compatibility**: Algorithm works with Excel merged cells that appear as empty DataType::Empty in calamine - verify Excel file structure if issues persist

### Debug Logging
- Use `RUST_LOG=debug` for detailed backend logs
- Check browser console for frontend errors
- Header parsing shows exact byte representations for troubleshooting encoding issues

## Implementation Phases

1. **Phase 1**: Basic infrastructure, file upload, data parsing, table display
2. **Phase 2**: Sheet selection, temporary storage, validation, action processing
3. **Phase 3**: Advanced visualization, multiple actions, export capabilities
4. **Phase 4**: UI/UX polish, testing, deployment preparation

## File Processing Logic

- Only process rows with all required fields from header mapping
- Skip rows missing required fields without error
- Skip duplicate rows (same switch + switch_ifname combination)
- Delete temporary uploaded files after sheet processing (success or failure)
- Provide user-friendly feedback for missing or malformed data

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

**Built-in Field Variations Support**:
```rust
// Automatic support for common header variations
"server_label" -> ["server", "server_name", "hostname", "host name", "host_name"]
"server_ifname" -> ["server_interface", "nic", "slot", "slot/port", "slot port"]
"switch_label" -> ["switch", "switch_name", "device"]
```

### Customer Benefits

**✅ Zero-Code Configuration**:
- Pure JSON-based mapping updates
- Runtime loading and immediate effect
- No application recompilation or deployment required

**✅ Robust Compatibility**:
- Handles case differences, whitespace variations, Excel line breaks
- Backward compatibility with existing conversion maps
- Graceful fallback for unmapped fields

**✅ Production-Ready Management**:
- File-based storage and version control friendly
- App data directory integration for user persistence
- Comprehensive error handling and logging

### Usage Examples

**Frontend Integration**:
```typescript
const customMap = {
    header_row: 1,
    mappings: {
        "Network Device": "switch_label",
        "Port ID": "switch_ifname",
        "Connected Host": "server_label"
    }
};

const result = await invoke('parse_excel_sheet', {
    filePath: 'data.xlsx',
    sheetName: 'Config',
    conversionMap: customMap  // Applied automatically
});
```

**Service Layer** (`src-tauri/src/services/conversion_service.rs`):
- `load_conversion_map_from_file()` - Load from custom file path
- `save_conversion_map_to_file()` - Save user modifications
- `get_user_conversion_map_path()` - Get standard user storage location

**MAINTENANCE RULE**: Never hard-code field mappings in parsing logic. All field mapping must go through the conversion map system to maintain customer configurability.

### Field Mapping Algorithm

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

### Excel Merged Cell Handling

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

**Technical Implementation** (`src-tauri/src/commands/data_parser.rs`):
```rust
fn apply_intelligent_merged_cell_detection(
    data_rows: &[Vec<DataType>],
    headers: &[String]
) -> Vec<HashMap<String, String>>
```

**What it handles**:
- Server names in merged cells (e.g., "r2lb103960", "r2lb103959") that span multiple equipment rows  
- Vertical cell merges where empty cells should inherit values from above
- Proper grouping of network equipment under the correct server names

**What it explicitly avoids**:
- Horizontal merged cell propagation (prevents false data associations)
- Complex rectangular merged regions (reduces parsing complexity and errors)
- Assumptions about Excel merge patterns (works with actual data, not theoretical merges)

**Testing Coverage**:
- Unit tests: `test_intelligent_merged_cell_detection()`, `test_intelligent_merged_cells_vertical_only()`
- Integration tests: `test_merged_cell_server_names()` with real Excel fixture (`tests/fixtures/original-0729.xlsx`)
- Verified with actual network configuration spreadsheets containing merged server name cells

**Performance Characteristics**:
- Single-pass algorithm with O(n*m) complexity where n=rows, m=columns
- Memory-efficient with column carry values stored in simple Vec<Option<String>>
- No external dependencies on calamine's merged region API (avoids version compatibility issues)

**Failure Scenarios Handled**:
- Empty server name cells are filled with previous non-empty value in same column
- Missing or malformed merged cell data gracefully degrades to empty values
- Server name changes (new server) correctly reset carry values for subsequent rows

**Why This Approach**:
1. **Real-world Excel patterns**: Network config spreadsheets commonly have server names spanning multiple equipment rows
2. **False positive prevention**: Horizontal merges in network data often represent different concepts than vertical server groupings
3. **Maintainability**: Simple vertical-only logic is easier to debug and extend
4. **Performance**: Efficient single-pass algorithm without complex merge region analysis
5. **Compatibility**: Works with calamine 0.22 without requiring newer API versions

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

**CRITICAL DECISION - NO HORIZONTAL MERGE DETECTION**:
After extensive testing and debugging, the decision was made to **explicitly avoid horizontal merged cell propagation**. This was a conscious architectural choice because:

- **Network Data Patterns**: In network configuration spreadsheets, horizontal empty cells often represent intentionally missing data, not merged cells
- **False Positive Prevention**: Horizontal propagation was causing incorrect data associations (e.g., copying switch names to port fields inappropriately)
- **User Feedback**: The original issue specifically mentioned that merges "can be vertical, horizontal, and both" but the actual Excel files primarily use vertical merges for server name grouping
- **Calamine API Limitations**: The calamine 0.22 version doesn't support `load_merged_regions()` API, so any merge detection must be heuristic
- **Conservative Approach**: It's better to miss some horizontal merges than to create false data associations that corrupt the network configuration data

**IMPLEMENTATION ROADMAP**:
1. ✅ **Library Upgrade Complete**: Upgraded to calamine 0.30.0 with merged region API support
2. 🚧 **Metadata Integration**: Currently reading Excel merge data (1,100+ regions detected in test files)
3. 🔄 **Universal Processing**: Replace selective heuristic approach with metadata-based universal processing
4. 🔄 **Performance Optimization**: Process only regions that affect visible data rows

**CURRENT STATUS**: 
- **Working**: Selective heuristic processing (server names and CTs)
- **Available**: Complete Excel merged region metadata via calamine 0.30.0 API
- **Next**: Replace heuristics with universal metadata-based processing

**Integration Points**:
- Called from `parse_worksheet_data()` in the main Excel parsing pipeline
- Works with existing conversion mapping system
- Preserves all non-empty cell values exactly as they appear in Excel
- Compatible with header normalization and field validation logic

## Documentation

- **SPECIFICATION.md**: Complete technical specification with architecture decisions, implementation phases, and detailed requirements
- **README.md**: Project setup and usage instructions (to be created)

## Development Principles

### DRY (Don't Repeat Yourself)
- Extract common logic into helper functions and utilities
- Avoid duplicating data transformation logic across components
- Use shared utilities for common operations like file processing and error handling
- Centralize validation rules and data mapping logic

#### Utility Function Patterns
**CRITICAL**: Implement centralized utilities to prevent code duplication:

**1. File Operation Utilities (Rust)**
```rust
// Centralized file utilities in src-tauri/src/utils/file_utils.rs
pub struct FileUtils;

impl FileUtils {
    pub fn download_file(data: Vec<u8>, filename: &str, mime_type: &str) -> Result<(), String> {
        // Standardized file download logic
        // Handle blob creation, temporary storage, cleanup
    }
    
    pub fn export_to_csv(data: &[NetworkConfigRow]) -> Result<Vec<u8>, String> {
        // Centralized CSV export logic
    }
    
    pub fn export_to_json(data: &[NetworkConfigRow]) -> Result<Vec<u8>, String> {
        // Centralized JSON export logic
    }
}
```

**2. API Communication Utilities (TypeScript)**
```typescript
// Centralized API utilities in src/services/api.ts
export class TauriApiService {
    static async invokeCommand<T>(
        command: string, 
        args?: Record<string, any>,
        errorContext = 'Command failed'
    ): Promise<T> {
        try {
            return await invoke(command, args);
        } catch (error) {
            console.error(`${errorContext}:`, error);
            throw new Error(`${errorContext}: ${error}`);
        }
    }
    
    static async downloadFile(data: Uint8Array, filename: string): Promise<void> {
        // Standardized file download for frontend
        const blob = new Blob([data]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
```

**3. Error Logging System**
```rust
// Backend logging utilities
pub enum LogLevel {
    Error,
    Warning,
    Info,
    Debug,
}

pub struct Logger;

impl Logger {
    pub fn log_with_context(level: LogLevel, message: &str, context: Option<&str>) {
        let context_str = context.map(|c| format!(" [{}]", c)).unwrap_or_default();
        match level {
            LogLevel::Error => log::error!("{}{}", message, context_str),
            LogLevel::Warning => log::warn!("{}{}", message, context_str),
            LogLevel::Info => log::info!("{}{}", message, context_str),
            LogLevel::Debug => log::debug!("{}{}", message, context_str),
        }
    }
}
```

```typescript
// Frontend logging utilities
export class ClientLogger {
    static async logError(message: string, error?: Error, context?: string) {
        const logEntry = {
            level: 'ERROR',
            message,
            error: error?.stack,
            context,
            timestamp: new Date().toISOString()
        };
        
        // Log to console and optionally send to backend
        console.error(logEntry);
        await TauriApiService.invokeCommand('log_client_error', { entry: logEntry });
    }
    
    static async logWarning(message: string, context?: string) {
        // Similar implementation for warnings
    }
}
```

**4. Data Processing Utilities**
```rust
// Safe data extraction utilities
pub struct DataProcessor;

impl DataProcessor {
    pub fn extract_field_safely(
        row: &HashMap<String, String>, 
        field_mappings: &[&str],
        context: &str
    ) -> Option<String> {
        for field_name in field_mappings {
            if let Some(value) = row.get(*field_name) {
                if !value.trim().is_empty() {
                    return Some(value.clone());
                }
            }
        }
        
        Logger::log_with_context(
            LogLevel::Warning, 
            &format!("Missing field in row: {:?}", field_mappings),
            Some(context)
        );
        None
    }
    
    pub fn with_error_logging<T, F>(
        operation: F,
        context: &str
    ) -> Result<T, String> 
    where 
        F: FnOnce() -> Result<T, String>
    {
        match operation() {
            Ok(result) => Ok(result),
            Err(error) => {
                Logger::log_with_context(LogLevel::Error, &error, Some(context));
                Err(error)
            }
        }
    }
}
```

### Modularization and Single Responsibility Principle

**CRITICAL: Avoid Monolithic Functions**

Based on lessons from related projects, maintain strict modularization principles:

#### Function Design Standards
- **Maximum Function Length**: 20-25 lines recommended
- **Single Responsibility**: Each function should do ONE thing well
- **Clear Purpose**: If you can't describe a function in one sentence, it's too complex

#### Required Patterns

**1. Configuration-Driven Design**
```rust
// Extract constants to module top
const NETWORK_FIELD_MAPPING: &[(&str, &str)] = &[
    ("blueprint", "Blueprint"),
    ("server_label", "Server Label"),
    ("switch_label", "Switch Label"),
];

const VALIDATION_RULES: ValidationConfig = ValidationConfig {
    required_fields: &["switch_label", "switch_ifname"],
    max_file_size: 100_000_000, // 100MB
};
```

**2. Helper Function Pattern**
```rust
// Single-purpose helpers
fn validate_required_fields(row: &NetworkConfigRow) -> ValidationResult { }
fn normalize_field_names(raw_data: &HashMap<String, String>) -> NetworkConfigRow { }
fn detect_duplicate_entries(data: &[NetworkConfigRow]) -> Vec<usize> { }

// Main function becomes assembly
fn process_excel_data(file_path: &str) -> Result<Vec<NetworkConfigRow>, ProcessingError> {
    let raw_data = parse_excel_file(file_path)?;
    let normalized_data = normalize_field_names(&raw_data)?;
    let validated_data = validate_required_fields(&normalized_data)?;
    let deduplicated_data = remove_duplicates(validated_data)?;
    Ok(deduplicated_data)
}
```

**3. Assembly Pattern for Complex Operations**
- Main functions should read like clear recipes: step 1, step 2, step 3
- Delegate complex operations to specialized helpers
- Keep the main flow understandable at a glance

#### Code Review Requirements

**Mandatory Checks:**
- Functions over 25 lines must justify their complexity
- Any function doing multiple distinct operations must be split
- Configuration should be extracted from implementation
- Repeated patterns (3+ times) must be extracted to helpers

**Red Flags to Watch For:**
- Functions with multiple `// Section:` comments (indicates multiple responsibilities)
- Long parameter lists (often indicates poor separation of concerns)
- Nested conditionals more than 2-3 levels deep
- Copy-pasted code blocks with minor variations

#### Frontend Component Standards
```tsx
// Configuration-driven React components
const UPLOAD_CONFIG = {
    acceptedTypes: ['.xlsx'],
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowMultiple: false
};

// Single-purpose helper components
function FileDropZone({ onDrop, isActive }: FileDropZoneProps) { }
function UploadProgress({ progress, fileName }: UploadProgressProps) { }
function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) { }

// Main component as assembly
function FileUpload() {
    // Clean assembly of smaller components
    return (
        <div className="file-upload-container">
            <FileDropZone onDrop={handleFileDrop} isActive={isDragActive} />
            {isUploading && <UploadProgress progress={progress} fileName={fileName} />}
            {error && <ErrorDisplay error={error} onRetry={handleRetry} />}
        </div>
    );
}
```

### Two-Phase Processing Workflow
- **Phase 1: Data Validation**: Upload, parse, validate, and display data for review
- **Phase 2: Action Execution**: Process validated data with real-time progress tracking
- This separation prevents processing failures and provides user control

### Field Naming Consistency
**CRITICAL**: Consistent field naming prevents integration failures:

- **Raw Input Processing**: Field mapping occurs ONLY during sheet selection stage
- **Normalized Internal Names**: After sheet selection, use consistent internal field names:
  - `blueprint`, `server_label`, `switch_label`, `switch_ifname`, `server_ifname`
  - `link_speed`, `link_group_lag_mode`, `link_group_ct_names`
  - `server_tags`, `switch_tags`, `link_tags`
- **UI Display Names**: Frontend components may use display-friendly names for presentation
- **Service Integration**: All backend services expect normalized field names consistently

**Rule**: Never mix field naming conventions within a single service or data flow.

### Speed Normalization System
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

**Applied During Conversion**:
```rust
link_speed: get_field("link_speed").map(|speed| normalize_link_speed(&speed)),
```

**REGRESSION PREVENTION**: 
- ✅ Backend normalizes data during Excel processing
- ✅ Frontend detects normalized units to prevent double-suffix 
- ✅ Comprehensive unit tests for all speed format variations
- ❌ **NEVER** remove speed normalization without updating frontend logic
- ❌ **NEVER** change frontend regex `/[GM]$/` without testing all speed formats

### Two-Phase Field Mapping Algorithm
**CRITICAL**: Prevents port field mapping regressions where "Port" column incorrectly maps to "Trunk/Access Port" content.

**Problem**: Partial matching processed longer headers first, causing "Trunk/Access\nPort" (containing "Access") to map to `switch_ifname` instead of "Port" column (containing "2").

**Solution** (`src-tauri/src/commands/data_parser.rs:create_conversion_field_mapping`):
```rust
// Phase 1: Process ALL exact matches first (absolute priority)
for (field_name, target_field) in conversion_map.iter() {
    if let Some(header) = headers.iter().find(|h| normalize_header(h) == normalize_header(field_name)) {
        field_mappings.insert(target_field.clone(), header.clone());
    }
}

// Phase 2: Process partial matches only for unmapped headers
for (field_name, target_field) in conversion_map.iter() {
    if !field_mappings.contains_key(target_field) {
        // Only search unmapped headers for partial matches
    }
}
```

**Regression Test** (`src-tauri/tests/port_field_mapping_test.rs`):
- ✅ Verifies "Port" column maps to `switch_ifname` correctly
- ✅ Ensures NO rows contain "Access" in `switch_ifname` 
- ✅ Validates port numbers like "2" appear in the data

**REGRESSION PREVENTION**:
- ❌ **NEVER** remove two-phase algorithm without comprehensive testing
- ❌ **NEVER** change exact match priority without regression validation
- ❌ **NEVER** allow partial matches to override exact matches

### Required Fields Validation
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

**Additional Validation** (`validate_data` function):
```rust
// Secondary filter to ensure only complete rows reach the UI
let filtered_data: Vec<NetworkConfigRow> = data.into_iter()
    .filter(|row| row.switch_label.is_some() && row.switch_ifname.is_some())
    .collect();

// Duplicate detection based on switch + interface combination
let mut seen_combinations = std::collections::HashSet::new();
for row in filtered_data {
    let key = (row.switch_label.clone(), row.switch_ifname.clone());
    if seen_combinations.insert(key.clone()) {
        deduplicated_data.push(row);
    }
}
```

### Merged Cell Detection - CRITICAL ISSUE RESOLVED
**PROBLEM**: The intelligent merged cell detection was incorrectly propagating values from previous rows to empty cells, creating duplicate entries in the provisioning table.

**USER FEEDBACK**: "The cell for switch name and switch port are not merged one. So it can not be all over the place if it is not accidently considered as merged."

**ROOT CAUSE**: `apply_intelligent_merged_cell_detection()` was designed for spreadsheets with merged cells, but user's Excel data has individual values in each cell. The algorithm was carrying forward previous values to empty cells when it shouldn't.

**UPDATED SOLUTION** (`src-tauri/src/commands/data_parser.rs:133`):
```rust
// SELECTIVE merged cell detection - only for confirmed merged columns
let data_rows_with_merges = apply_selective_merged_cell_detection(
    &worksheet_rows[header_row_idx + 1..], 
    &headers
);
```

**NEW FUNCTION** (`apply_selective_merged_cell_detection`):
```rust
fn apply_selective_merged_cell_detection(
    data_rows: &[Vec<DataType>],
    headers: &[String]
) -> Vec<HashMap<String, String>> {
    // Only apply merge detection to confirmed merged columns:
    let merge_enabled_columns = ["CTs", "link_group_ct_names"]; // User confirmed
    
    // For merge-enabled columns: apply vertical propagation
    // For all other columns: use cell values as-is (no propagation)
}
```

**USER CONFIRMATION**: "there are merged cells for connectivity template"

**TARGETED APPROACH**: Only "CTs" column gets merge detection, switch names/ports processed individually

**REGRESSION PREVENTION**:
- ❌ **NEVER** re-enable merged cell detection without user confirmation of Excel structure
- ❌ **NEVER** apply value propagation logic unless explicitly required for merged cells
- ✅ **ALWAYS** process Excel rows as individual cell values unless proven otherwise

**REGRESSION PREVENTION**:
- ❌ **NEVER** change `||` to `&&` in the required fields check
- ❌ **NEVER** allow incomplete rows to reach the provisioning table
- ✅ **ALWAYS** validate both switch name and interface are present
- ✅ Log filtered rows for debugging incomplete Excel data

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

**Speed Parsing Logic**:
```rust
fn get_speed_value(normalized_speed: &str) -> f32 {
    // Parse "25G" -> 25.0, "10G" -> 10.0, "1G" -> 1.0
    // Handle edge cases: "100M" -> 0.1, empty -> default 1G
}

fn generate_interface_name(port: &str, speed: &str) -> String {
    let speed_val = get_speed_value(speed);
    let prefix = if speed_val > 10.0 { "et" } 
                else if speed_val == 10.0 { "xe" } 
                else { "ge" };
    format!("{}-0/0/{}", prefix, port)
}
```

**BUSINESS RULES**:
- ✅ Applied ONLY when `switch_ifname` contains simple port numbers ("2", "5", "1")
- ✅ Skip transformation for complex interfaces ("xe-0/0/1", "eth0", "Port-channel1")  
- ✅ Preserve existing complex interface names as-is
- ✅ Default to "ge" (1G) when speed is missing or unparseable

**REGRESSION PREVENTION**:
- ❌ **NEVER** apply transformation to non-numeric port values
- ❌ **NEVER** override existing complex interface names 
- ❌ **NEVER** change speed thresholds without validating network requirements
- ✅ **ALWAYS** test with various speed formats (G, M, numeric, empty)

### Error Handling Patterns
- **Graceful Degradation**: Individual row failures shouldn't stop overall processing
- **Comprehensive Logging**: Detailed error logs with context for debugging
- **User-Friendly Feedback**: Clear error messages with suggested actions
- **Recovery Options**: Ability to retry failed operations where appropriate

### Defensive Programming Patterns

**CRITICAL**: Apply defensive programming principles for robust data handling:

#### 1. Safe Field Access
```rust
// Bad: Will panic if field doesn't exist
let value = row["field_name"].clone();

// Good: Safe access with Option handling
let value = row.get("field_name").cloned();

// Better: Handle multiple possible field names (Excel header variations)
let server_label = row.get("server_label")
    .or_else(|| row.get("Server Label"))
    .or_else(|| row.get("ServerLabel"))
    .cloned();
```

#### 2. Data Structure Evolution Support
```rust
// Support multiple Excel header formats for backward compatibility
const FIELD_MAPPINGS: &[(&str, &[&str])] = &[
    ("switch_label", &["switch_label", "Switch Label", "Switch", "switch"]),
    ("server_label", &["server_label", "Server Label", "Server", "server"]),
    ("switch_ifname", &["switch_ifname", "Switch Interface", "Switch Port", "Port"]),
];

fn normalize_field_names(raw_row: &HashMap<String, String>) -> Option<NetworkConfigRow> {
    let mut normalized = NetworkConfigRow::default();
    
    for (target_field, possible_names) in FIELD_MAPPINGS {
        for name in *possible_names {
            if let Some(value) = raw_row.get(*name) {
                // Set the normalized field value
                match *target_field {
                    "switch_label" => normalized.switch_label = Some(value.clone()),
                    "server_label" => normalized.server_label = Some(value.clone()),
                    // ... other fields
                    _ => {}
                }
                break;
            }
        }
    }
    
    // Validate required fields are present
    if normalized.switch_label.is_none() || normalized.switch_ifname.is_none() {
        return None;
    }
    
    Some(normalized)
}
```

#### 3. Validation-First Processing
```rust
fn process_excel_rows(rows: Vec<HashMap<String, String>>) -> ProcessingResult {
    let mut valid_rows = Vec::new();
    let mut errors = Vec::new();
    
    for (index, raw_row) in rows.iter().enumerate() {
        // Validate first, process second
        match normalize_field_names(raw_row) {
            Some(normalized_row) => {
                if validate_required_fields(&normalized_row) {
                    valid_rows.push(normalized_row);
                } else {
                    errors.push(ProcessingError {
                        row_index: index,
                        error_message: "Missing required fields".to_string(),
                        error_type: ErrorType::ValidationError,
                    });
                }
            },
            None => {
                // Skip malformed rows gracefully
                log::warn!("Skipping row {} due to missing critical fields", index);
                errors.push(ProcessingError {
                    row_index: index,
                    error_message: "Could not parse row structure".to_string(),
                    error_type: ErrorType::DataError,
                });
            }
        }
    }
    
    ProcessingResult {
        valid_rows,
        errors,
        total_processed: rows.len(),
    }
}
```

#### 4. Frontend Defensive Patterns
```tsx
// Handle undefined/null data gracefully in React components
function DataTable({ data }: { data?: NetworkConfigRow[] }) {
    // Always provide fallbacks for undefined data
    const safeData = data ?? [];
    
    return (
        <table>
            {safeData.map((row, index) => (
                <tr key={index}>
                    {/* Safe access with fallbacks */}
                    <td>{row.switch_label ?? 'N/A'}</td>
                    <td>{row.server_label ?? 'Unknown'}</td>
                    <td>{row.link_speed ?? 'Not specified'}</td>
                </tr>
            ))}
        </table>
    );
}
```

#### 5. Migration Strategy for Data Format Changes
- **Phase 1**: Add compatibility layer supporting old and new formats
- **Phase 2**: Deploy improved field mappings with validation
- **Phase 3**: Optional cleanup after sufficient transition period

**Rule**: Never break existing Excel file compatibility without a clear migration path.

#### Utility Function Best Practices

**1. Always Use Centralized Utilities**
- Never duplicate API communication logic across components
- Use TauriApiService.invokeCommand() instead of direct invoke() calls
- Use FileUtils for all file operations instead of custom implementations

**2. Provide Meaningful Error Contexts**
```rust
// Good: Specific context
DataProcessor::extract_field_safely(&row, &["switch_label"], "EXCEL_PARSING");

// Bad: Generic context
DataProcessor::extract_field_safely(&row, &["switch_label"], "operation");
```

**3. Consistent Logging Patterns**
```typescript
// Error logging with context
try {
    const result = await processData(data);
} catch (error) {
    await ClientLogger.logError('Failed to process Excel data', error, 'FILE_PROCESSING');
    throw error;
}
```

**4. Migration Benefits**
- **Consistency**: All operations use the same patterns
- **Maintainability**: Changes only need to be made in one place  
- **Debugging**: Centralized logging makes troubleshooting easier
- **Code Reduction**: Eliminates duplicate patterns across the codebase
- **Error Resilience**: Better handling of edge cases and failures

**5. Critical Data Processing Patterns**
- **Safe Field Access**: Always use optional chaining and fallbacks
- **Direct Property Access**: `row.switch_label` instead of index-based access
- **Data Validation**: Filter empty/null values before processing
- **Server Grouping**: Collect data, group by server, rebuild structures

### Async/Await Guidelines
- **When to use async**: File I/O operations, network requests, data processing
- **When to avoid**: Pure computational tasks, simple data transformations
- **Best practices**: Always await async functions, handle exceptions properly in async contexts

## Critical Implementation Patterns

**IMPORTANT**: These patterns prevent major regressions and race conditions:

### Data Processing Rules
- **Duplicate Detection**: Skip rows with identical switch + switch_ifname combination
- **Required Field Validation**: Only process rows with all required fields present
- **Data Type Validation**: Validate field formats before processing
- **Header Mapping**: Use consistent header-to-field mapping throughout the application

### File Processing Safety
- **Temporary File Management**: Create secure temporary files with automatic cleanup
- **Race Condition Prevention**: Proper sequencing of file operations
- **Memory Management**: Stream large files to prevent memory issues
- **Error Recovery**: Handle file corruption and processing interruptions gracefully

### Action Processing Workflow
- **Readiness Verification**: Ensure systems are ready before applying configurations
- **Wait Mechanisms**: Implement proper polling for system state changes
- **Batch Processing**: Group related operations for efficiency
- **Progress Tracking**: Provide granular progress updates for long-running operations

## Recent Development Patterns (2024)

### API Service Architecture
The application implements a robust API service layer with:

**Backend (`src-tauri/src/`)**: 
- `commands/apstra_api_handler.rs`: Tauri command handlers for API operations
- `services/apstra_api_service.rs`: Core API service with session management
- Global session state management with `ApiClientState`

**Frontend (`src/`)**: 
- `services/ApstraApiService.ts`: TypeScript service layer for API communication
- `utils/apstraUrls.ts`: URL generation utilities for Apstra web interface navigation
- Type-safe API interfaces with proper error handling

### Key Services and Utilities

**ApstraApiService.ts** - Centralized API communication:
```typescript
interface LoginInfo { base_url, username, password, session_id }
interface SystemSearchRequest { session_id, blueprint_id, server_name }
interface QueryResponse { items: Array<object>, count: number }
```

**apstraUrls.ts** - URL generation utilities:
```typescript
generateApstraUrls.system({ host, blueprintId, nodeId }) // System detail page
generateApstraUrls.blueprint({ host, blueprintId }) // Blueprint staged page
generateApstraUrls.interface({ host, blueprintId, nodeId }) // Interface detail page
```

### Development Best Practices
- **Session Management**: Use stateful authentication with proper session token handling
- **API Error Handling**: Implement comprehensive error handling with user-friendly messages
- **Type Safety**: Maintain type safety across frontend/backend API boundaries
- **URL Generation**: Use utility functions for consistent Apstra URL generation
- **State Management**: Leverage Tauri's state management for API client persistence

## Important Notes

- Update SPECIFICATION.md whenever new decisions are added/updated
- Follow the phased development approach outlined in SPECIFICATION.md
- Maintain security best practices for file handling and temporary storage
- **Implement proper session management** for Apstra API authentication
- **Use centralized service utilities** to prevent code duplication
- Document failure-prone patterns to prevent regressions
- Test both success and failure scenarios thoroughly, especially API integration