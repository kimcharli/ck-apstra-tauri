# Development Documentation

Complete guide for developing the Apstra Network Configuration Tool.

## Prerequisites & Setup

### System Requirements

**Operating System Support:**
- macOS 10.15+ (Catalina or later)
- Windows 10/11 (with WSL2 recommended for development)
- Ubuntu 18.04+ / Debian 10+ / RHEL 8+ / Fedora 35+

**Hardware Requirements:**
- 8GB RAM minimum (16GB recommended)
- 10GB free disk space
- Network connectivity for package downloads

### Required Software

#### 1. Node.js and npm
**Version Required:** Node.js 18.x or 20.x LTS

**Installation:**

**macOS:**
```bash
# Using Homebrew (recommended)
brew install node@20

# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 9.x.x or higher
```

**Windows:**
```powershell
# Using Chocolatey (recommended)
choco install nodejs-lts

# Using winget
winget install OpenJS.NodeJS.LTS

# Manual download from https://nodejs.org/
# Download and run the Windows Installer (.msi)
```

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# RHEL/CentOS/Fedora
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install nodejs npm

# Verify installation
node --version
npm --version
```

#### 2. Rust and Cargo
**Version Required:** Rust 1.70+ (latest stable recommended)

**Installation:**
```bash
# Install Rust using rustup (all platforms)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Update to latest stable
rustup update stable

# Verify installation
rustc --version  # Should show 1.70.0 or higher
cargo --version
```

#### 3. Tauri CLI
**Installation:**
```bash
# Install globally via npm (recommended)
npm install -g @tauri-apps/cli

# Or install via cargo
cargo install tauri-cli

# Verify installation
tauri --version
```

#### 4. Platform-Specific Dependencies

**macOS:**
```bash
# Xcode Command Line Tools (required for compilation)
xcode-select --install

# Additional dependencies via Homebrew
brew install pkg-config
```

**Linux (Ubuntu/Debian):**
```bash
# Required system libraries
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  pkg-config
```

**Linux (RHEL/CentOS/Fedora):**
```bash
# Required system libraries
sudo dnf groupinstall "C Development Tools and Libraries"
sudo dnf install \
  webkit2gtk4.0-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  pkg-config
```

**Windows:**
```powershell
# Visual Studio Build Tools (required)
# Download and install from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022

# Install Microsoft C++ Build Tools
# Or install Visual Studio Community with C++ development tools

# WebView2 (usually pre-installed on Windows 10/11)
# If needed, download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```

## Development Commands

### Core Development
- `npm run tauri:dev` - Start development server with hot reload
- `npm run tauri:build` - Build application for production
- `npm run dev` - Start frontend development server only (for UI development)

### Testing
- `cargo test` - Run Rust backend tests (from src-tauri directory)
- `npm test` - Run frontend tests with Vitest
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:rust` - Run Rust backend tests
- `npm run test:integration` - Run integration tests
- `npm run test:watch` - Run tests in watch mode

### Code Quality
- `npm run lint` - TypeScript type checking
- `npm run lint:rust` - Rust code linting with Clippy
- `npm run format` - Format code with Prettier
- `cargo fmt` - Format Rust code

### Debug and Logging
- `RUST_LOG=debug npm run tauri:dev` - Start with debug logging
- `RUST_LOG=trace npm run tauri:dev` - Maximum verbosity logging
- `npm run debug:frontend` - Frontend debugging tools

## Debug Logging

- Use `RUST_LOG=debug` for detailed backend logs
- Check browser console for frontend errors
- Header parsing shows exact byte representations for troubleshooting encoding issues

## Testing Framework

### Backend Tests (Rust)

**Unit Tests**: Individual function testing
```bash
cd src-tauri
cargo test test_function_name
```

**Integration Tests**: End-to-end data processing
```bash
cargo test test_port_field_mapping_regression
cargo test test_merged_cell_server_names
```

**Debug Test Execution**:
```bash
RUST_LOG=debug cargo test test_port_regression_debug -- --nocapture
```

### Frontend Tests (TypeScript)

**Vitest Configuration**: Modern testing framework
```bash
npm test                    # Run all tests
npm run test:ui            # Interactive UI
npm run test:watch         # Watch mode
```

## Build Configuration

### Development Build
```bash
npm run tauri:dev          # Hot reload enabled
```

### Production Build
```bash
npm run tauri:build        # Optimized bundle
```

### Cross-Platform Builds
- **macOS**: `.app` bundle and `.dmg` installer
- **Windows**: `.exe` and `.msi` installers (requires Windows environment)
- **Linux**: `.deb`, `.rpm`, and `.AppImage` packages (requires Linux environment)

**Output Location**: `src-tauri/target/release/bundle/`

## Core Development Principles

### DRY (Don't Repeat Yourself)
- Extract common logic into helper functions and utilities
- Avoid duplicating data transformation logic across components
- Use shared utilities for common operations like file processing and error handling
- Centralize validation rules and data mapping logic

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

### Modularization and Single Responsibility Principle

**CRITICAL: Avoid Monolithic Functions**

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

#### 2. Validation-First Processing
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

#### 3. Frontend Defensive Patterns
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

### Async/Await Guidelines
- **When to use async**: File I/O operations, network requests, data processing
- **When to avoid**: Pure computational tasks, simple data transformations
- **Best practices**: Always await async functions, handle exceptions properly in async contexts

## Troubleshooting Common Issues

### Excel Data Not Displaying
- Check debug logs with `RUST_LOG=debug npm run tauri:dev`
- Verify conversion map is loading: Look for "Using default conversion map with X mappings"
- Ensure JSON structure matches expected format in `data/default_conversion_map.json`
- Headers with line breaks (`\r\n`) are normalized during matching

### Conversion Map Issues
- JSON parsing supports both flat and nested "mappings" structure
- Headers are matched case-insensitively with normalization
- Debug logs show exact header bytes and field mappings created
- Default conversion map embedded from `data/default_conversion_map.json`

### Build Issues
- Ensure Tauri dependencies are installed: `cargo install tauri-cli`
- Check for missing icon files in `src-tauri/icons/`
- Verify all required npm dependencies are installed

### Merged Cell Issues
- **Missing Server Names**: If server names don't appear in parsed data, verify that `apply_intelligent_merged_cell_detection` is being called in `parse_worksheet_data`
- **Incorrect Server Grouping**: Check debug logs for "column_carry_values" to see vertical propagation patterns
- **Server Names Appearing in Wrong Rows**: Verify that Excel file has proper vertical merged cells (server names should appear in first row of each group)
- **Empty Server Labels**: Ensure the "Host Name" or equivalent column is properly mapped in conversion map
- **Testing Merged Cell Logic**: Run `cargo test test_merged_cell_server_names` to verify with fixture file
- **Performance Issues**: If parsing is slow with large Excel files, merged cell detection runs in O(n*m) time - consider data size limits
- **Excel Compatibility**: Algorithm works with Excel merged cells that appear as empty DataType::Empty in calamine - verify Excel file structure if issues persist

### Provisioning Table Color Coding Issues

**CRITICAL BUG PATTERN**: Incorrect colors showing despite successful Apstra API query and connection matching.

**Symptoms**:
- Excel connections show gray "XLSX pending" or orange "field-missing" colors 
- "Fetch & Compare" reports successful matches in console logs
- Apstra API query returns correct connection data
- Connection keys are generated correctly from API results

**Root Cause**: React state management bug where `apiConnectionsMap.delete(connectionKey)` removes matched API data before creating the final `apiDataMap` for React state.

**Debugging Steps**:
1. **Enable Debug Logging**: Use 📥 log download to capture full debug output
2. **Verify API Query**: Check logs for "Generated connection key" entries showing correct API data processing
3. **Verify Excel Matching**: Look for "Match found for Excel row" entries in logs
4. **Check State Management**: If matches are found but colors are wrong, it's the React state bug

**Critical Code Location**: `src/components/ProvisioningTable/ProvisioningTable.tsx` in `compareAndUpdateConnectivityData()` function.

**The Bug**:
```typescript
// WRONG: Deletes API data before creating React state
apiConnectionsMap.delete(connectionKey); // Line causes the bug
// Later...
finalApiDataMap.set(connectionKey, connectionData.rawData); // Data already deleted!
```

**The Fix**:
```typescript
// CORRECT: Create final state map BEFORE any deletions
const finalApiDataMap = new Map<string, any>();
[...apiConnectionsMap.entries()].forEach(([key, data]) => {
  finalApiDataMap.set(key, data.rawData); // Capture ALL data first
});
// Now safe to delete for finding extras
apiConnectionsMap.delete(connectionKey);
```

**Prevention**:
- Never delete from data maps before creating final React state
- Always capture React state data before any destructive operations
- Use downloadable logs to debug state management issues
- Test color coding after any changes to data processing logic

## Regression Prevention Patterns

### Critical Implementation Patterns

**IMPORTANT**: These patterns prevent major regressions and race conditions:

#### Data Processing Rules
- **Duplicate Detection**: Skip rows with identical switch + switch_ifname combination
- **Required Field Validation**: Only process rows with all required fields present
- **Data Type Validation**: Validate field formats before processing
- **Header Mapping**: Use consistent header-to-field mapping throughout the application

#### File Processing Safety
- **Temporary File Management**: Create secure temporary files with automatic cleanup
- **Race Condition Prevention**: Proper sequencing of file operations
- **Memory Management**: Stream large files to prevent memory issues
- **Error Recovery**: Handle file corruption and processing interruptions gracefully

#### Action Processing Workflow
- **Readiness Verification**: Ensure systems are ready before applying configurations
- **Wait Mechanisms**: Implement proper polling for system state changes
- **Batch Processing**: Group related operations for efficiency
- **Progress Tracking**: Provide granular progress updates for long-running operations

### Critical Rules

**NEVER** Rules to prevent regressions:
- ❌ **NEVER** remove two-phase field mapping algorithm without comprehensive testing
- ❌ **NEVER** change exact match priority without regression validation
- ❌ **NEVER** allow partial matches to override exact matches
- ❌ **NEVER** change `||` to `&&` in required fields validation
- ❌ **NEVER** allow incomplete rows to reach the provisioning table
- ❌ **NEVER** apply interface name transformation to non-numeric port values
- ❌ **NEVER** override existing complex interface names
- ❌ **NEVER** remove speed normalization without updating frontend logic
- ❌ **NEVER** change frontend regex `/[GM]$/` without testing all speed formats
- ❌ **NEVER** delete API data from maps before creating final state maps (critical React state bug)

**ALWAYS** Rules for quality:
- ✅ **ALWAYS** validate both switch name and interface are present
- ✅ **ALWAYS** test with various speed formats (G, M, numeric, empty)
- ✅ **ALWAYS** process Excel rows as individual cell values unless proven otherwise
- ✅ **ALWAYS** use centralized utility functions to prevent code duplication
- ✅ **ALWAYS** log filtered rows for debugging incomplete Excel data

## Development Workflow

### Daily Development
1. Start with debug logging: `RUST_LOG=debug npm run tauri:dev`
2. Make changes following modular principles
3. Run relevant tests: `cargo test` and `npm test`
4. Verify no regressions with integration tests
5. Check browser console and backend logs for errors

### Before Committing
1. Run full test suite: `npm run test:rust && npm test`
2. Run linting: `npm run lint && npm run lint:rust`
3. Test critical user workflows manually
4. Verify no console errors or warnings

### Release Preparation
1. Run production build: `npm run tauri:build`
2. Test built application functionality
3. Verify all platform builds work correctly
4. Update documentation if API changes made