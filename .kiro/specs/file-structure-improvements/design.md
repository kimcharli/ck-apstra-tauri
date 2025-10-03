# Design Document: File Structure Improvements

## Overview

This design addresses the structural improvements needed to create better alignment between the TypeScript frontend and Rust backend modules, focusing on domain-driven organization, consistent naming patterns, and improved maintainability.

## Architecture

### Proposed Domain-Driven Structure

#### Frontend Structure (`src/`)
```
src/
├── domains/
│   ├── excel/                    # Excel processing domain
│   │   ├── components/           # Excel-specific UI components
│   │   ├── services/            # Excel processing services
│   │   ├── types/               # Excel-related types
│   │   ├── hooks/               # Excel-specific hooks
│   │   └── utils/               # Excel utilities
│   ├── apstra/                  # Apstra integration domain
│   │   ├── components/          # Apstra UI components
│   │   ├── services/            # Apstra API services
│   │   ├── types/               # Apstra-related types
│   │   ├── hooks/               # Apstra-specific hooks
│   │   └── utils/               # Apstra utilities
│   ├── conversion/              # Data conversion domain
│   │   ├── components/          # Conversion mapping UI
│   │   ├── services/            # Conversion services
│   │   ├── types/               # Conversion types
│   │   ├── hooks/               # Conversion hooks
│   │   └── utils/               # Conversion utilities
│   ├── provisioning/            # Network provisioning domain
│   │   ├── components/          # Provisioning UI
│   │   ├── services/            # Provisioning services
│   │   ├── types/               # Provisioning types
│   │   ├── hooks/               # Provisioning hooks
│   │   └── utils/               # Provisioning utilities
│   └── shared/                  # Cross-domain shared code
│       ├── components/          # Reusable UI components
│       ├── services/            # Shared services
│       ├── types/               # Common types
│       ├── hooks/               # Shared hooks
│       └── utils/               # Common utilities
├── app/                         # Application-level code
│   ├── contexts/                # React contexts
│   ├── config/                  # App configuration
│   ├── routing/                 # Navigation and routing
│   └── layout/                  # Layout components
└── infrastructure/              # Technical infrastructure
    ├── api/                     # API client infrastructure
    ├── storage/                 # Local storage utilities
    ├── logging/                 # Logging infrastructure
    └── testing/                 # Test utilities
```

#### Backend Structure (`src-tauri/src/`)
```
src-tauri/src/
├── domains/
│   ├── excel/                   # Excel processing domain
│   │   ├── commands/            # Excel-related Tauri commands
│   │   ├── services/            # Excel processing services
│   │   ├── models/              # Excel data models
│   │   └── utils/               # Excel utilities
│   ├── apstra/                  # Apstra integration domain
│   │   ├── commands/            # Apstra API commands
│   │   ├── services/            # Apstra services
│   │   ├── models/              # Apstra data models
│   │   └── utils/               # Apstra utilities
│   ├── conversion/              # Data conversion domain
│   │   ├── commands/            # Conversion commands
│   │   ├── services/            # Conversion services
│   │   ├── models/              # Conversion models
│   │   └── utils/               # Conversion utilities
│   ├── provisioning/            # Network provisioning domain
│   │   ├── commands/            # Provisioning commands
│   │   ├── services/            # Provisioning services
│   │   ├── models/              # Provisioning models
│   │   └── utils/               # Provisioning utilities
│   └── shared/                  # Cross-domain shared code
│       ├── models/              # Common data models
│       ├── services/            # Shared services
│       └── utils/               # Common utilities
├── app/                         # Application-level code
│   ├── config/                  # App configuration
│   ├── state/                   # Application state management
│   └── events/                  # Tauri event handlers
└── infrastructure/              # Technical infrastructure
    ├── database/                # Database utilities
    ├── filesystem/              # File system utilities
    ├── network/                 # Network utilities
    ├── logging/                 # Logging infrastructure
    └── testing/                 # Test utilities
```

## Components and Interfaces

### Domain Service Interfaces

#### Excel Domain
```typescript
// Frontend: src/domains/excel/services/ExcelProcessingService.ts
export interface ExcelProcessingService {
  uploadFile(filePath: string): Promise<string[]>;
  parseSheet(filePath: string, sheetName: string): Promise<ExcelRow[]>;
  validateData(data: ExcelRow[]): Promise<ValidationResult>;
}
```

```rust
// Backend: src/domains/excel/services/excel_processing_service.rs
pub trait ExcelProcessingService {
    async fn upload_file(&self, file_path: String) -> Result<Vec<String>, ExcelError>;
    async fn parse_sheet(&self, file_path: String, sheet_name: String) -> Result<Vec<ExcelRow>, ExcelError>;
    async fn validate_data(&self, data: Vec<ExcelRow>) -> Result<ValidationResult, ExcelError>;
}
```

#### Apstra Domain
```typescript
// Frontend: src/domains/apstra/services/ApstraApiService.ts
export interface ApstraApiService {
  authenticate(config: ApstraConfig): Promise<AuthResult>;
  searchSystems(query: string): Promise<SystemSearchResult[]>;
  executeQuery(query: GraphQLQuery): Promise<QueryResult>;
}
```

```rust
// Backend: src/domains/apstra/services/apstra_api_service.rs
pub trait ApstraApiService {
    async fn authenticate(&self, config: ApstraConfig) -> Result<AuthResult, ApstraError>;
    async fn search_systems(&self, query: String) -> Result<Vec<SystemSearchResult>, ApstraError>;
    async fn execute_query(&self, query: GraphQLQuery) -> Result<QueryResult, ApstraError>;
}
```

### Type Synchronization Strategy

#### Shared Type Definitions
```typescript
// Frontend: src/domains/shared/types/api-contracts.ts
export interface NetworkConfigRow {
  blueprint: string;
  server_label: string;
  switch_label: string;
  switch_ifname: string;
  // ... other fields
}
```

```rust
// Backend: src/domains/shared/models/network_config.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfigRow {
    pub blueprint: String,
    pub server_label: String,
    pub switch_label: String,
    pub switch_ifname: String,
    // ... other fields
}
```

#### Command Interface Contracts
```typescript
// Generated or manually maintained contract definitions
export interface TauriCommands {
  // Excel domain
  'excel::upload_file': (filePath: string) => Promise<string[]>;
  'excel::parse_sheet': (filePath: string, sheetName: string) => Promise<NetworkConfigRow[]>;
  
  // Apstra domain
  'apstra::authenticate': (config: ApstraConfig) => Promise<AuthResult>;
  'apstra::search_systems': (query: string) => Promise<SystemSearchResult[]>;
  
  // Conversion domain
  'conversion::convert_headers': (headers: string[], map: ConversionMap) => Promise<ConversionResult>;
}
```

## Data Models

### Domain Model Organization

#### Excel Domain Models
```rust
// src/domains/excel/models/mod.rs
pub mod excel_file;
pub mod excel_sheet;
pub mod excel_row;
pub mod validation_result;

pub use excel_file::ExcelFile;
pub use excel_sheet::ExcelSheet;
pub use excel_row::ExcelRow;
pub use validation_result::ValidationResult;
```

#### Conversion Domain Models
```rust
// src/domains/conversion/models/mod.rs
pub mod conversion_map;
pub mod field_definition;
pub mod transformation_rule;
pub mod mapping_result;

pub use conversion_map::ConversionMap;
pub use field_definition::FieldDefinition;
pub use transformation_rule::TransformationRule;
pub use mapping_result::MappingResult;
```

### Cross-Domain Model Dependencies
```rust
// src/domains/shared/models/mod.rs
pub mod network_config;
pub mod processing_result;
pub mod error_types;

// Re-export commonly used types
pub use network_config::NetworkConfigRow;
pub use processing_result::ProcessingResult;
pub use error_types::{DomainError, ValidationError};
```

## Error Handling

### Domain-Specific Error Types
```rust
// src/domains/excel/models/error.rs
#[derive(Debug, thiserror::Error)]
pub enum ExcelError {
    #[error("File not found: {path}")]
    FileNotFound { path: String },
    #[error("Invalid sheet name: {name}")]
    InvalidSheet { name: String },
    #[error("Parsing error: {message}")]
    ParseError { message: String },
}

// src/domains/apstra/models/error.rs
#[derive(Debug, thiserror::Error)]
pub enum ApstraError {
    #[error("Authentication failed: {reason}")]
    AuthenticationFailed { reason: String },
    #[error("API request failed: {status}")]
    ApiRequestFailed { status: u16 },
    #[error("Invalid configuration: {field}")]
    InvalidConfig { field: String },
}
```

### Unified Error Handling
```rust
// src/domains/shared/models/error.rs
#[derive(Debug, thiserror::Error)]
pub enum DomainError {
    #[error("Excel error: {0}")]
    Excel(#[from] ExcelError),
    #[error("Apstra error: {0}")]
    Apstra(#[from] ApstraError),
    #[error("Conversion error: {0}")]
    Conversion(#[from] ConversionError),
    #[error("Provisioning error: {0}")]
    Provisioning(#[from] ProvisioningError),
}
```

## Testing Strategy

### Domain-Specific Test Organization
```
tests/
├── domains/
│   ├── excel/
│   │   ├── unit/                # Excel unit tests
│   │   ├── integration/         # Excel integration tests
│   │   └── fixtures/            # Excel test data
│   ├── apstra/
│   │   ├── unit/                # Apstra unit tests
│   │   ├── integration/         # Apstra integration tests
│   │   └── fixtures/            # Apstra test data
│   └── conversion/
│       ├── unit/                # Conversion unit tests
│       ├── integration/         # Conversion integration tests
│       └── fixtures/            # Conversion test data
├── cross-domain/
│   ├── workflows/               # End-to-end workflow tests
│   └── integration/             # Cross-domain integration tests
└── shared/
    ├── utilities/               # Shared test utilities
    └── fixtures/                # Common test data
```

### Test Utilities Organization
```typescript
// src/domains/excel/testing/excel-test-utils.ts
export const createMockExcelFile = (data: any[][]) => { /* ... */ };
export const createMockValidationResult = (errors: string[]) => { /* ... */ };

// src/domains/apstra/testing/apstra-test-utils.ts
export const createMockApstraConfig = (overrides?: Partial<ApstraConfig>) => { /* ... */ };
export const createMockApiResponse = (data: any) => { /* ... */ };
```

## Migration Strategy

### Phase 1: Create New Domain Structure (Weeks 1-2)
1. Create new domain directories in both frontend and backend
2. Set up module exports and basic structure
3. Create shared type definitions and contracts
4. Update build configuration to handle new structure

### Phase 2: Migrate Core Domains (Weeks 3-6)
1. **Excel Domain Migration**
   - Move Excel-related services, components, and types
   - Update imports and dependencies
   - Migrate tests to new structure
   
2. **Apstra Domain Migration**
   - Move Apstra-related services, components, and types
   - Update API client organization
   - Migrate authentication and session management
   
3. **Conversion Domain Migration**
   - Move conversion mapping services and components
   - Reorganize transformation logic
   - Update enhanced conversion system

### Phase 3: Migrate Remaining Domains (Weeks 7-8)
1. **Provisioning Domain Migration**
   - Move provisioning workflow components and services
   - Update data processing pipeline
   - Migrate provisioning table logic
   
2. **Shared Code Organization**
   - Identify and move shared utilities
   - Create common type definitions
   - Establish cross-domain interfaces

### Phase 4: Cleanup and Optimization (Weeks 9-10)
1. Remove old directory structure
2. Update documentation and imports
3. Optimize build configuration
4. Validate all tests pass
5. Update development tooling and scripts

## Implementation Guidelines

### Naming Conventions
- **Domains**: Use singular nouns (excel, apstra, conversion, provisioning)
- **Services**: End with "Service" (ExcelProcessingService, ApstraApiService)
- **Commands**: Use domain prefix (excel::upload_file, apstra::authenticate)
- **Types**: Use descriptive names that indicate domain (ExcelRow, ApstraConfig)

### Dependency Management
- Domains should minimize dependencies on other domains
- Cross-domain dependencies should go through shared interfaces
- Infrastructure code should be separate from domain logic
- Circular dependencies should be avoided through careful interface design

### Documentation Requirements
- Each domain should have a README explaining its purpose and structure
- Service interfaces should be documented with examples
- Migration guides should be provided for developers
- Architecture decision records should document design choices