# Technical Specification: Apstra Network Configuration Tool

## 1. Project Overview

### Purpose
A Tauri-based desktop application for processing Excel spreadsheets containing network configuration data and performing automated actions on Apstra network infrastructure.

### Goals
- Streamline network configuration data processing workflows
- Provide intuitive Excel-to-network-action pipeline
- Ensure data validation and error handling throughout the process
- Support real-time progress tracking and comprehensive reporting
- Provide comprehensive logging and post-mortem analysis capabilities
- Enable direct integration with Apstra REST API for system search and management

### Scope
Phase-based development of a cross-platform desktop application with web technologies frontend and Rust backend for robust file processing and system integration.

## 2. System Architecture

### Technology Stack
- **Frontend**: React/Vue.js with TypeScript
- **Backend**: Rust with Tauri framework
- **File Processing**: Rust-based Excel parsing with `calamine` or `xlsxwriter`
- **UI Framework**: Modern CSS framework (Tailwind CSS recommended)
- **Build System**: Vite for frontend, Cargo for Rust backend

### Architecture Decisions

#### 2.1 Tauri Framework Rationale
- Cross-platform desktop deployment
- Secure file system access
- Performance benefits of Rust backend
- Small application bundle size
- Web frontend flexibility

#### 2.2 Data Flow Architecture
```
Excel Upload → Temp Storage → Sheet Selection → Data Parsing → Validation → Table Display → Action Selection → Processing → Results
```

#### 2.3 Two-Phase Processing Pattern
Based on lessons from related projects, the system implements a proven two-phase approach:

**Phase 1: Data Validation & Review**
- Upload and temporary storage
- Sheet selection and header mapping
- Data parsing with field normalization
- Validation and duplicate detection
- Interactive table display for user review

**Phase 2: Action Execution**
- User-triggered processing of validated data
- Real-time progress tracking
- Granular error handling
- Results aggregation and reporting

This separation prevents processing failures and provides user control over when actions are executed.

## 3. Project Structure

```
ck-apstra-tauri/
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs              # Tauri app entry point
│   │   ├── lib.rs               # Library exports
│   │   ├── commands/            # Tauri command handlers
│   │   │   ├── mod.rs
│   │   │   ├── file_handler.rs  # Excel upload/processing
│   │   │   ├── data_parser.rs   # Sheet parsing & validation
│   │   │   └── action_processor.rs # Network actions
│   │   ├── services/            # Business logic
│   │   │   ├── mod.rs
│   │   │   ├── excel_service.rs # Excel file operations
│   │   │   ├── validation_service.rs # Data validation
│   │   │   └── network_service.rs # Network configuration actions
│   │   ├── models/              # Data structures
│   │   │   ├── mod.rs
│   │   │   ├── network_config.rs # Network data models
│   │   │   └── processing_result.rs # Results & errors
│   │   └── utils/               # Utilities
│   │       ├── mod.rs
│   │       └── file_utils.rs    # Temp file management
│   ├── Cargo.toml
│   ├── tauri.conf.json          # Tauri configuration
│   └── build.rs                 # Build script
│
├── src/                         # Frontend (React/Vue)
│   ├── main.tsx                 # App entry point
│   ├── App.tsx                  # Main app component
│   ├── components/              # React components
│   │   ├── FileUpload/
│   │   ├── SheetSelector/
│   │   ├── DataTable/
│   │   ├── ActionPanel/
│   │   ├── ProgressTracker/
│   │   └── common/              # Shared components
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # Frontend services
│   ├── types/                   # TypeScript definitions
│   ├── utils/                   # Frontend utilities
│   └── styles/                  # Global styles
│
├── tests/                       # Integration tests
├── docs/                        # Documentation
├── SPECIFICATION.md             # This document
├── CLAUDE.md                   # Claude Code instructions
└── README.md                   # Project documentation
```

## 4. Core Features Specification

### 4.1 Excel File Processing

#### File Upload System
- **Input**: Excel (.xlsx) files via drag-and-drop or file picker
- **Temporary Storage**: Secure temporary file storage with automatic cleanup
- **File Validation**: MIME type checking, file size limits
- **Error Handling**: Clear feedback for invalid files

#### Sheet Selection Interface
- Display list of available sheets after successful upload
- Sheet preview functionality
- Selection persistence until processing completion

#### Data Parsing Engine
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

#### Conversion Mapping System
- **Default Conversion Map**: Ships with predefined Excel header mappings loaded from embedded JSON
- **User Customization**: Users can modify conversion mappings through dedicated UI interface
- **Flexible Loading**: Support loading conversion maps from external JSON files
- **Persistent Configuration**: Save user customizations to local configuration files
- **Header Row Configuration**: Configurable header row location (default: row 1)
- **Dynamic Updates**: Conversion map changes immediately apply to current Excel data

#### Data Validation Rules
- **Conversion-Based Mapping**: Use conversion maps to translate Excel headers to internal field names
- **Fallback Logic**: Default header matching when no conversion map is configured
- **Required Fields**: Only process rows with essential network information (switch_label, switch_ifname)
- **Duplicate Detection**: Skip rows with identical switch + switch_ifname combinations
- **Data Type Validation**: Validate field formats and constraints based on target field types
- **Error Aggregation**: Collect and report all validation issues with specific row/column context

#### Defensive Data Processing
**CRITICAL**: Apply defensive programming for robust Excel processing:

- **Safe Field Access**: Never assume Excel headers exist; use Option/Result patterns
- **Multi-Format Support**: Handle multiple possible header name variations for the same logical field
- **Validation-First**: Validate data structure before attempting processing
- **Graceful Degradation**: Skip malformed rows without stopping entire operation
- **Error Context**: Provide detailed error information including row numbers and field names
- **Backward Compatibility**: Support multiple Excel format versions simultaneously

#### Field Naming Standards
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

### 4.2 Data Visualization

#### Interactive Table Component
- **Features**:
  - Column sorting (ascending/descending)
  - Column filtering and search
  - Row selection capabilities
  - Pagination for large datasets
  - Export functionality (CSV, JSON)

#### Data Status Indicators
- Visual indicators for validation status
- Error highlighting and tooltips
- Summary statistics panel
- Data quality metrics

### 4.3 Action Processing Engine

#### Supported Actions
- **Primary**: `import-generic-system`
- **Extensible**: Plugin architecture for additional actions

#### Progress Tracking System
- **Real-time Updates**: WebSocket or event-based progress updates
- **Granular Status**: Per-row processing status
- **Time Estimation**: ETAs based on processing speed
- **Cancellation Support**: Ability to stop processing

#### Error Handling
- **Graceful Degradation**: Continue processing despite individual failures
- **Detailed Logging**: Comprehensive error logs with context
- **Recovery Options**: Retry failed operations
- **User Notifications**: Clear error messages and suggested actions

#### Critical Processing Patterns
**IMPORTANT**: These patterns prevent regressions and race conditions:

- **System Readiness Verification**: Ensure systems are ready before applying configurations
- **Wait Mechanisms**: Implement proper polling for system state changes (3-second intervals, 60-second timeout)
- **Race Condition Prevention**: Never proceed with dependent operations immediately after system creation
- **Intelligent Processing**: Only process when data differs from existing state (no-op optimization)
- **Selective Operations**: Only process interfaces with actual configuration changes needed

### 4.4 Conversion Mapping Architecture

#### System Design
The conversion mapping system provides flexible translation between Excel header names and internal field names, enabling the application to process diverse Excel formats without requiring users to modify their spreadsheets.

#### Core Components

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

#### Operational Flow

1. **Default Loading**: Application embeds default conversion map from related project
2. **User Customization**: Users access conversion manager through main UI button
3. **Dynamic Application**: Changes to conversion map immediately reprocess current Excel data
4. **Persistence**: User configurations saved to local application data directory
5. **File Exchange**: Import/export JSON files for sharing conversion configurations

#### Configuration Management
- **Default Map Location**: Embedded in Rust binary from `data/default_conversion_map.json`
- **User Map Storage**: `~/.local/share/ck-apstra-tauri/user_conversion_map.json` (Linux/macOS)
- **Windows User Maps**: `%APPDATA%/ck-apstra-tauri/user_conversion_map.json`
- **Header Row Flexibility**: Configurable header row position (1-based indexing)

### 4.5 Security Requirements

#### File Security
- Sandboxed file processing
- Automatic cleanup of temporary files
- Input sanitization and validation
- Path traversal protection

#### Data Privacy
- No data persistence beyond session
- Secure memory handling
- Audit logging for compliance

### 4.6 Logging and Post-Mortem Analysis System

#### Comprehensive Logging Service
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

#### Session Management
- Unique session IDs for tracking user sessions
- Session lifecycle logging (startup/shutdown)
- Cross-component session correlation

#### Log Export Functionality
**Multiple Export Formats**:
- **Text Format**: Human-readable logs with timestamps and details
- **JSON Format**: Structured data for programmatic analysis
- **CSV Format**: Spreadsheet-compatible for data analysis

**Export Features**:
- Timestamped filenames (e.g., `apstra-logs-2024-01-15T14-30-25.txt`)
- File format auto-detection based on extension
- Log filtering by category, level, and time range
- Statistical summaries included in exports

#### User Interface Integration
- **Log Download Button**: 📥 icon in navigation header
- **Visual Feedback**: Spinning animation during download
- **Context-Aware Logging**: Captures button location, workflow state
- **Error Correlation**: Links user actions to system responses

#### Data Captured for Post-Mortem
- Complete audit trail of user interactions
- Workflow progression with timing information
- Configuration changes with before/after values
- Error conditions with full context
- File operations and data processing results
- System performance and connection health

#### Privacy and Security
- Password redaction in configuration logs
- Session isolation for multi-user environments
- Local storage only (no remote logging)
- User-controlled export functionality

## 5. Current Implementation Status (Updated 2024-01-15)

### Completed Features
- **Phase 1-3**: All core functionality implemented and operational
- **Excel Processing**: Full Excel file upload, sheet selection, and data parsing
- **Conversion Mapping**: User-customizable field mapping with default configurations
- **Apstra Connection**: Configuration management with connection testing
- **Network Provisioning**: Complete workflow with data validation and table display
- **Tools Page**: System search, IP search, and blueprint management interfaces
- **Navigation**: Shared navigation header across all pages with workflow integration
- **Logging System**: Comprehensive post-mortem analysis with multiple export formats
- **Cross-Platform**: Native desktop applications for macOS, Windows, and Linux
- **Professional UI**: Responsive design with modern styling and user experience

### Key Architectural Decisions Implemented
- Tauri framework with React frontend and Rust backend
- Two-phase processing pattern (validation → execution)
- Modular component architecture with shared services
- Defensive programming patterns with comprehensive error handling
- Local-first approach with no remote data persistence
- Session-based logging with privacy-conscious data handling

### Current Application Workflow
1. **Apstra Connection**: Configure controller connection and blueprint settings
2. **Conversion Map**: Customize Excel header mapping for data processing
3. **Provisioning**: Upload Excel, select sheets, validate data, and execute provisioning
4. **Tools**: Search systems/IPs and manage blueprint operations

### Technical Achievements
- Intelligent Excel header mapping with line break normalization
- Real-time data validation and blueprint device matching
- Comprehensive audit logging with post-mortem analysis capabilities
- Professional branding with custom icon sets for all platforms
- Responsive design supporting desktop, tablet, and mobile interfaces
- Error recovery mechanisms with detailed user feedback

## 6. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- **Deliverables**:
  - Tauri project initialization
  - Basic UI framework setup
  - File upload component
  - Excel parsing foundation
  - Simple data display

- **Technical Tasks**:
  - Set up Tauri development environment
  - Implement file upload with drag-and-drop
  - Integrate Excel parsing library
  - Create basic table component
  - Establish Tauri command structure

### Phase 2: Core Processing (Weeks 3-5)
- **Deliverables**:
  - Sheet selection interface
  - Data validation engine
  - Temporary file management
  - Progress tracking foundation
  - Error handling system

- **Technical Tasks**:
  - Implement sheet enumeration and selection
  - Build header mapping system
  - Create validation rules engine
  - Implement duplicate detection
  - Add progress tracking infrastructure

### Phase 3: Advanced Features (Weeks 6-8)
- **Deliverables**:
  - Interactive sortable table
  - Action processing engine
  - Real-time progress updates
  - Export capabilities
  - Comprehensive error reporting

- **Technical Tasks**:
  - Enhance table with sorting and filtering
  - Implement action processing pipeline
  - Add real-time progress WebSocket/events
  - Create export functionality
  - Build comprehensive error UI

### Phase 4: Polish & Testing (Weeks 9-10)
- **Deliverables**:
  - Performance optimizations
  - Comprehensive testing suite
  - Documentation completion
  - Deployment preparation

- **Technical Tasks**:
  - Performance profiling and optimization
  - E2E testing implementation
  - Documentation writing
  - Build and deployment pipeline setup

## 6. Technical Constraints

### Performance Requirements
- **File Size**: Support Excel files up to 100MB
- **Processing Speed**: Handle 10,000+ rows within 30 seconds
- **Memory Usage**: Efficient streaming for large datasets
- **Responsiveness**: UI remains responsive during processing

### Compatibility Requirements
- **Platforms**: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)
- **Excel Formats**: .xlsx files (Office 2007+)
- **Screen Resolutions**: Responsive design for 1024x768 to 4K displays

## 7. Quality Assurance

### Testing Strategy
- **Unit Tests**: Rust backend logic (90%+ coverage)
- **Integration Tests**: Frontend-backend communication
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Large file processing benchmarks
- **Security Tests**: File handling and input validation

### Code Quality Standards

#### Modularization Requirements
**CRITICAL**: Enforce strict modularization to prevent maintenance issues:

- **Maximum Function Length**: 20-25 lines recommended
- **Single Responsibility**: Each function should do ONE thing well  
- **Configuration-Driven**: Extract constants and configurations to module tops
- **Helper Functions**: Create focused, single-purpose helper functions
- **Assembly Pattern**: Main functions should read like clear step-by-step recipes

#### Code Review Standards
**Mandatory Checks During Reviews:**
- Functions over 25 lines must justify their complexity
- Any function doing multiple distinct operations must be split
- Configuration should be extracted from implementation
- Repeated patterns (3+ times) must be extracted to helpers

**Red Flags to Reject:**
- Functions with multiple `// Section:` comments (multiple responsibilities)
- Long parameter lists (poor separation of concerns)
- Nested conditionals more than 2-3 levels deep
- Copy-pasted code blocks with minor variations

#### Language-Specific Standards
- **Rust**: Clippy linting, rustfmt formatting, comprehensive error types
- **TypeScript**: ESLint + Prettier, strict type checking, component modularization
- **Documentation**: Inline documentation for all public APIs
- **Error Handling**: Graceful degradation with detailed logging

#### Testing Standards for Modular Code
- **Unit Testing**: Each helper function should be testable in isolation
- **Integration Testing**: Assembly functions tested with mocked helpers
- **Component Testing**: React components tested with clear separation of concerns
- **Configuration Testing**: Validate configuration-driven behavior separately

## 8. Success Criteria

### Functional Requirements
- ✅ Successfully upload and process Excel files up to 100MB
- ✅ Accurate sheet selection and data parsing
- ✅ Reliable data validation with duplicate detection
- ✅ Sortable, filterable data visualization
- ⏳ Real-time action processing with progress tracking (framework ready, actions pending)
- ✅ Comprehensive error handling and user feedback
- ✅ Secure temporary file management with cleanup

### Non-Functional Requirements
- ✅ Application startup time < 3 seconds
- ✅ File processing completion within acceptable time limits
- ✅ Intuitive user interface requiring minimal training
- ✅ Cross-platform compatibility
- ✅ Memory usage optimization for large datasets

## 9. Future Enhancements

### Planned Extensions
- **File Format Support**: CSV, JSON input formats
- **Action Library**: Additional network configuration actions
- **Batch Processing**: Multiple file processing queues
- ✅ **API Integration**: Direct Apstra API connectivity (COMPLETED - System Search)
- **Workflow Automation**: Saved processing templates
- **Advanced Analytics**: Data trend analysis and reporting
- **User Management**: Multi-user support with role-based access
- **Cloud Integration**: Cloud storage and processing options

### Architectural Considerations for Growth
- Plugin architecture for action extensibility
- Database integration for processing history
- Microservices preparation for cloud deployment
- API-first design for future integrations

## 10. Apstra REST API Integration

### Overview
The application now includes direct integration with Apstra AOS REST API, enabling real-time system search and network infrastructure management capabilities.

### Implementation Architecture

#### Backend Services (Rust)
- **ApstraApiClient**: Core HTTP client with session-based authentication
- **Authentication Management**: Secure token handling with AuthToken header pattern
- **Query Engine Integration**: Direct access to Apstra's graph query engine at `/api/blueprints/{blueprint_id}/qe`
- **Error Handling**: Comprehensive error handling for network, authentication, and API failures

#### Frontend Services (TypeScript)
- **ApstraApiService**: TypeScript wrapper providing clean API interface
- **Authentication Flow**: Automatic authentication using stored Apstra configuration
- **Real-time Results**: Live display of search results with JSON formatting
- **Status Management**: Visual authentication and connection status indicators

### Features Implemented

#### System Search Functionality
- **Query Format**: Implements `match(node('system', label='{server_name}', name='system'))` pattern
- **Blueprint Selection**: Dropdown selector and text input for flexible blueprint targeting
- **Result Display**: Structured JSON output with result count and detailed system information
- **Error Feedback**: User-friendly error messages for authentication and network issues

#### Authentication & Session Management
- **Automatic Login**: Seamless authentication using user's stored Apstra configuration
- **Session Persistence**: Maintains authentication state throughout application session
- **Token Management**: Secure handling of AuthToken headers for API requests
- **Connection Status**: Real-time authentication status indicators in UI

#### Integration with Existing Systems
- **Logging Integration**: All API interactions logged through comprehensive logging service
- **Configuration Reuse**: Leverages existing Apstra configuration management
- **Navigation Integration**: Seamless access through Tools page navigation
- **Error Reporting**: Integrated error handling with existing notification systems

### API Endpoints Utilized
- `POST /api/aaa/login`: Authentication with username/password
- `POST /api/blueprints/{blueprint_id}/qe`: Query execution against blueprint graphs
- Authentication via AuthToken header as specified in API documentation

### Technical Implementation Details

#### Rust Backend Commands
- `apstra_login`: Session-based authentication with credential validation
- `apstra_search_systems`: System search using graph query language
- `apstra_execute_query`: Generic query execution for custom searches
- `apstra_is_authenticated`: Authentication status verification
- `apstra_logout`: Session cleanup and token invalidation

#### Security Considerations
- **Credential Protection**: Passwords masked in logs and error messages
- **SSL/TLS Support**: Configurable SSL certificate validation
- **Session Management**: Secure token storage and automatic cleanup
- **Error Sanitization**: Sensitive information filtered from user-facing errors

### Usage Workflow
1. **Authentication**: Application automatically authenticates using stored Apstra config
2. **Blueprint Selection**: User selects target blueprint from dropdown or enters label
3. **System Search**: User enters system hostname and executes search
4. **Results Display**: API response displayed with result count and detailed system data
5. **Error Handling**: Clear feedback for authentication, network, or API failures

### Future API Extensions
- **IP Address Search**: Enhanced search capabilities for IP/CIDR ranges
- **Blueprint Management**: CRUD operations for blueprint manipulation
- **Device Configuration**: Direct device configuration API integration
- **Batch Operations**: Multi-system search and management capabilities