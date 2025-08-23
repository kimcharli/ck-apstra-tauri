# Architecture Documentation

## System Architecture

The project follows a Tauri architecture pattern with:
- **Frontend**: React with TypeScript for the user interface
- **Backend**: Rust-based Tauri backend for file processing and system interactions
- **Core Features**: Excel parsing, data validation, interactive table display, Apstra API integration with session management
- **API Integration**: Direct REST API communication with Apstra controllers for real-time search and management
- **State Management**: Session-based authentication with secure credential handling
- **URL Generation**: Dynamic Apstra web interface URL generation for seamless navigation

## Native Application Distribution

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

## Security Considerations

- Secure file upload handling with validation
- Temporary file cleanup after processing
- Input validation for all user data
- Error handling without exposing sensitive information
- **Session-based authentication**: Secure credential storage and session token management
- **API Security**: Proper authentication headers and error handling for Apstra API calls
- **State Management**: Secure handling of authentication state and sensitive configuration data
- **URL Generation**: Safe construction of Apstra web interface URLs with parameter validation