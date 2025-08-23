# Architecture Overview

Visual and technical overview of the Apstra Network Configuration Tool architecture.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Desktop Application                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   File Upload   │  │  Data Viewer    │  │ API Client  │ │
│  │   Component     │  │   Component     │  │  Component  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│           │                     │                    │      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │            Tauri IPC Bridge                             │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Backend (Rust + Tauri)                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  File Handler   │  │ Excel Processor │  │ API Service │ │
│  │                 │  │                 │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│           │                     │                    │      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              System Integration                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                External Systems                             │
├─────────────────────┬───────────────────┬───────────────────┤
│   File System       │   Apstra API      │   Network Tools   │
│   - Temp storage    │   - Authentication│   - Status checks │
│   - Excel files     │   - Blueprint ops │   - Validation    │
│   - Config files    │   - System search │   - Monitoring    │
└─────────────────────┴───────────────────┴───────────────────┘
```

## Data Flow Architecture

### Excel Processing Pipeline

```
User Action
    ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  File Upload    │ →  │ Temp Storage    │ →  │  Excel Parse    │
│  (Frontend)     │    │  (Backend)      │    │   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Sheet Display  │ ←  │ Data Structure  │ ←  │ Header Mapping  │
│  (Frontend)     │    │   (Shared)      │    │   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ User Selection  │ →  │  Validation     │ →  │ Process Data    │
│  (Frontend)     │    │   (Backend)     │    │   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Display    │ ←  │ Action Queue    │ ←  │  Data Ready     │
│  (Frontend)     │    │  (Backend)      │    │   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### API Integration Flow

```
Authentication Request
         ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Login Form     │ →  │ Session Store   │ →  │  Apstra API     │
│  (Frontend)     │    │  (Backend)      │    │ (External)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ↓                       ↑                       ↓
┌─────────────────┐              │              ┌─────────────────┐
│   API Client    │ ─────────────┘              │ Session Token   │
│  (Frontend)     │                             │  (Persistent)   │
└─────────────────┘                             └─────────────────┘
         ↓                                               ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Search Query   │ →  │ API Request     │ →  │  Live Results   │
│  (Frontend)     │    │  (Backend)      │    │  (Frontend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Component Architecture

### Frontend Components Hierarchy

```
App
├── Router
│   ├── Home
│   │   ├── FileUpload
│   │   ├── SheetSelector
│   │   └── DataViewer
│   │       ├── TableDisplay
│   │       ├── ValidationStatus
│   │       └── ActionPanel
│   ├── ApiClient
│   │   ├── LoginForm
│   │   ├── SystemSearch
│   │   └── BlueprintOperations
│   └── Settings
│       ├── ConversionManager
│       └── ConfigurationPanel
├── Shared Components
│   ├── LoadingSpinner
│   ├── ErrorBoundary
│   └── NotificationToast
└── Services
    ├── TauriApiService
    ├── ApstraApiService
    └── FileProcessingService
```

### Backend Services Architecture

```
Tauri Application
├── Commands Module
│   ├── file_operations.rs
│   ├── excel_processing.rs
│   ├── apstra_api_handler.rs
│   └── system_integration.rs
├── Services Module
│   ├── file_service.rs
│   ├── excel_service.rs
│   ├── apstra_api_service.rs
│   └── validation_service.rs
├── Models Module
│   ├── network_config.rs
│   ├── api_types.rs
│   └── processing_result.rs
└── Utils Module
    ├── file_utils.rs
    ├── conversion_utils.rs
    └── error_handling.rs
```

## Implementation Phases

1. **Phase 1**: Basic infrastructure, file upload, data parsing, table display
2. **Phase 2**: Sheet selection, temporary storage, validation, action processing
3. **Phase 3**: Advanced visualization, multiple actions, export capabilities
4. **Phase 4**: UI/UX polish, testing, deployment preparation

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

## Security Architecture

### Authentication Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Input     │ →  │   Validation    │ →  │  Secure Store   │
│  Credentials    │    │   (Frontend)    │    │   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ↓                                              ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  API Request    │ ←  │  Session Token  │ ←  │  Apstra Auth    │
│  Headers        │    │   (Memory)      │    │   (External)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Protection

- **File Security**: Temporary file storage with automatic cleanup
- **Memory Protection**: Sensitive data cleared after use
- **Network Security**: HTTPS-only API communication
- **Session Management**: Secure token storage and automatic expiry

## Performance Architecture

### Optimization Strategies

```
Performance Layer
├── Frontend Optimizations
│   ├── Component Lazy Loading
│   ├── Virtual Table Rendering
│   └── Debounced Search Input
├── Backend Optimizations
│   ├── Async File Processing
│   ├── Memory-Efficient Excel Parsing
│   └── Connection Pool Management
└── System Optimizations
    ├── Temporary File Management
    ├── Resource Cleanup
    └── Memory Usage Monitoring
```

### Scalability Considerations

- **Large File Handling**: Stream processing for files >100MB
- **Concurrent Operations**: Async processing with progress tracking
- **Memory Management**: Automatic cleanup and resource monitoring
- **Network Resilience**: Retry logic and connection management

---

*This architecture document is maintained alongside the codebase. When making significant architectural changes, update this document to reflect the current system design.*