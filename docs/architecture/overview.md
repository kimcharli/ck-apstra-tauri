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

## Data Models

### Core Data Structures

```rust
// Network Configuration Row
NetworkConfigRow {
    blueprint: Option<String>,
    server_label: Option<String>,
    switch_label: Option<String>,
    switch_ifname: Option<String>,
    server_ifname: Option<String>,
    link_speed: Option<String>,
    link_group_lag_mode: Option<String>,
    link_group_ct_names: Option<String>,
    is_external: Option<bool>,
    // ... additional fields
}

// Processing Result
ProcessingResult {
    valid_rows: Vec<NetworkConfigRow>,
    errors: Vec<ProcessingError>,
    total_processed: usize,
    warnings: Vec<ProcessingWarning>,
}

// API Session
ApiSession {
    base_url: String,
    username: String,
    session_id: Option<String>,
    expires_at: Option<DateTime>,
    is_authenticated: bool,
}
```

### State Management

```typescript
// Frontend State Structure
interface AppState {
  // File Processing State
  uploadState: {
    isUploading: boolean;
    progress: number;
    currentFile: File | null;
  };
  
  // Excel Data State
  excelState: {
    sheets: string[];
    selectedSheet: string | null;
    headers: string[];
    data: NetworkConfigRow[];
  };
  
  // API State
  apiState: {
    isAuthenticated: boolean;
    session: ApiSession | null;
    searchResults: any[];
  };
  
  // UI State
  uiState: {
    currentTab: string;
    notifications: Notification[];
    errors: AppError[];
  };
}
```

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

## Error Handling Architecture

### Error Classification

```
Error Types
├── User Errors
│   ├── Invalid File Format
│   ├── Missing Required Fields
│   └── Invalid API Credentials
├── System Errors
│   ├── File System Access
│   ├── Network Connectivity
│   └── Resource Exhaustion
└── Application Errors
    ├── Data Processing Failures
    ├── API Integration Issues
    └── State Consistency Problems
```

### Error Recovery Patterns

- **Graceful Degradation**: Continue processing despite individual failures
- **Automatic Retry**: Network requests with exponential backoff
- **User Feedback**: Clear error messages with suggested actions
- **Recovery Options**: Ability to retry failed operations

## Deployment Architecture

### Build Process

```
Source Code
     ↓
┌─────────────────┐    ┌─────────────────┐
│  Frontend Build │    │  Backend Build  │
│  (Vite + TS)    │    │  (Cargo + Rust) │
└─────────────────┘    └─────────────────┘
         ↓                       ↓
┌─────────────────────────────────────────┐
│         Tauri Bundle Process            │
├─────────────────────────────────────────┤
│  Platform-Specific Package Generation   │
│  - macOS: .app + .dmg                   │
│  - Windows: .exe + .msi                 │
│  - Linux: .deb + .rpm + .AppImage       │
└─────────────────────────────────────────┘
         ↓
┌─────────────────┐
│  Distribution   │
│    Packages     │
└─────────────────┘
```

### Distribution Strategy

- **Native Applications**: Platform-specific installers
- **Auto-Updates**: Built-in update mechanism via Tauri
- **Configuration**: User-specific settings and preferences
- **Data Persistence**: Local storage for session and configuration data

## Integration Points

### External System Interfaces

```
Application Interfaces
├── File System
│   ├── Temporary File Storage
│   ├── Configuration Files
│   └── Export/Import Operations
├── Apstra API
│   ├── Authentication Endpoints
│   ├── Blueprint Operations
│   └── System Search Functions
└── Operating System
    ├── Native File Dialogs
    ├── System Notifications
    └── Network Access Management
```

## Future Architecture Considerations

### Extensibility Points

- **Plugin System**: Modular action processors
- **Custom Parsers**: Support for additional file formats
- **API Adapters**: Integration with other network management systems
- **Export Formats**: Additional data export options

### Scalability Roadmap

- **Multi-File Processing**: Batch processing capabilities
- **Database Integration**: Optional local data storage
- **Collaboration Features**: Multi-user configuration sharing
- **Cloud Integration**: Remote configuration storage and sync

---

*This architecture document is maintained alongside the codebase. When making significant architectural changes, update this document to reflect the current system design.*