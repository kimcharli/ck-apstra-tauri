# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tauri-based web application for processing Excel spreadsheets containing network configuration data. The application allows users to upload Excel files, select sheets, validate and visualize data, and perform automated actions on the network configuration data.

## Architecture

The project follows a Tauri architecture pattern with:
- **Frontend**: Modern web framework (React/Vue.js) for the user interface
- **Backend**: Rust-based Tauri backend for file processing and system interactions
- **Core Features**: Excel parsing, data validation, interactive table display, action processing with real-time progress tracking

## Key Requirements

### Data Processing Pipeline
- Excel (.xlsx) file upload with temporary storage
- Sheet selection interface after upload
- Header mapping for network configuration fields (blueprint, server_label, is_external, etc.)
- Row validation with duplicate detection (skip rows with same switch + switch_ifname)
- Sortable table display with filtering capabilities
- Automatic cleanup of temporary files after processing

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

## Development Commands

- `npm run tauri:dev` - Start development server
- `npm run tauri:build` - Build application for production
- `cargo test` - Run Rust backend tests (from src-tauri directory)
- `npm test` - Run frontend tests
- `npm run dev` - Start frontend development server only
- `RUST_LOG=debug npm run tauri:dev` - Start with debug logging

## Security Considerations

- Secure file upload handling with validation
- Temporary file cleanup after processing
- Input validation for all user data
- Error handling without exposing sensitive information

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

## Important Notes

- Update SPECIFICATION.md whenever new decisions are added/updated
- Follow the phased development approach outlined in SPECIFICATION.md
- Maintain security best practices for file handling and temporary storage
- Document failure-prone patterns to prevent regressions
- Test both success and failure scenarios thoroughly