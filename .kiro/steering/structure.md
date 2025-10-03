# Project Structure & Organization

## Root Directory Layout

```
├── src/                    # React TypeScript frontend
├── src-tauri/             # Rust backend with Tauri
├── data/                  # Configuration files and defaults
├── docs/                  # Comprehensive documentation
├── tests/                 # Test fixtures and integration tests
├── agents/                # AI agent configurations
└── public/                # Static assets
```

## Architecture Direction: Domain-Driven Organization

**IMPORTANT**: This project is transitioning to a domain-driven architecture to improve maintainability and developer experience. See `.kiro/specs/file-structure-improvements/` for the complete migration plan.

### Target Frontend Structure (`src/`)

```
src/
├── domains/                    # Business domain organization
│   ├── excel/                  # Excel processing domain
│   │   ├── components/         # Excel-specific UI components
│   │   ├── services/          # Excel processing services
│   │   ├── types/             # Excel-related types
│   │   ├── hooks/             # Excel-specific hooks
│   │   └── utils/             # Excel utilities
│   ├── apstra/                # Apstra integration domain
│   │   ├── components/        # Apstra UI components
│   │   ├── services/          # Apstra API services
│   │   ├── types/             # Apstra-related types
│   │   ├── hooks/             # Apstra-specific hooks
│   │   └── utils/             # Apstra utilities
│   ├── conversion/            # Data conversion domain
│   │   ├── components/        # Conversion mapping UI
│   │   ├── services/          # Conversion services
│   │   ├── types/             # Conversion types
│   │   ├── hooks/             # Conversion hooks
│   │   └── utils/             # Conversion utilities
│   ├── provisioning/          # Network provisioning domain
│   │   ├── components/        # Provisioning UI
│   │   ├── services/          # Provisioning services
│   │   ├── types/             # Provisioning types
│   │   ├── hooks/             # Provisioning hooks
│   │   └── utils/             # Provisioning utilities
│   └── shared/                # Cross-domain shared code
│       ├── components/        # Reusable UI components
│       ├── services/          # Shared services
│       ├── types/             # Common types
│       ├── hooks/             # Shared hooks
│       └── utils/             # Common utilities
├── app/                       # Application-level code
│   ├── contexts/              # React contexts
│   ├── config/                # App configuration
│   ├── routing/               # Navigation and routing
│   └── layout/                # Layout components
└── infrastructure/            # Technical infrastructure
    ├── api/                   # API client infrastructure
    ├── storage/               # Local storage utilities
    ├── logging/               # Logging infrastructure
    └── testing/               # Test utilities
```

### Target Backend Structure (`src-tauri/src/`)

```
src-tauri/src/
├── domains/                   # Business domain organization
│   ├── excel/                 # Excel processing domain
│   │   ├── commands/          # Excel-related Tauri commands
│   │   ├── services/          # Excel processing services
│   │   ├── models/            # Excel data models
│   │   └── utils/             # Excel utilities
│   ├── apstra/                # Apstra integration domain
│   │   ├── commands/          # Apstra API commands
│   │   ├── services/          # Apstra services
│   │   ├── models/            # Apstra data models
│   │   └── utils/             # Apstra utilities
│   ├── conversion/            # Data conversion domain
│   │   ├── commands/          # Conversion commands
│   │   ├── services/          # Conversion services
│   │   ├── models/            # Conversion models
│   │   └── utils/             # Conversion utilities
│   ├── provisioning/          # Network provisioning domain
│   │   ├── commands/          # Provisioning commands
│   │   ├── services/          # Provisioning services
│   │   ├── models/            # Provisioning models
│   │   └── utils/             # Provisioning utilities
│   └── shared/                # Cross-domain shared code
│       ├── models/            # Common data models
│       ├── services/          # Shared services
│       └── utils/             # Common utilities
├── app/                       # Application-level code
│   ├── config/                # App configuration
│   ├── state/                 # Application state management
│   └── events/                # Tauri event handlers
└── infrastructure/            # Technical infrastructure
    ├── database/              # Database utilities
    ├── filesystem/            # File system utilities
    ├── network/               # Network utilities
    ├── logging/               # Logging infrastructure
    └── testing/               # Test utilities
```

## Current Structure (Legacy - Being Migrated)

### Current Frontend Structure
```
src/
├── components/            # Mixed component organization (legacy)
├── contexts/             # React context providers
├── hooks/                # Custom React hooks
├── services/             # API and business logic (mixed abstraction)
├── types/                # TypeScript type definitions (scattered)
└── utils/                # Helper functions (mixed domains)
```

### Current Backend Structure
```
src-tauri/src/
├── commands/             # Tauri command handlers (mixed domains)
├── services/             # Core business logic (mixed abstraction)
├── models/               # Data structures and types (no domain grouping)
└── utils/                # Utility functions
```

## Domain-Driven Architecture Principles

### Key Benefits
- **Improved Maintainability**: Related functionality co-located by business domain
- **Better Developer Experience**: Easier to find and modify related code
- **Clearer Dependencies**: Domain boundaries make dependencies explicit
- **Enhanced Testing**: Domain-specific test organization and utilities
- **Scalable Growth**: New features fit naturally into domain structure

### Domain Boundaries
- **Excel Domain**: File upload, parsing, sheet selection, data extraction
- **Apstra Domain**: API integration, authentication, system search, blueprint operations
- **Conversion Domain**: Header mapping, data transformation, validation rules
- **Provisioning Domain**: Network configuration, workflow management, data processing
- **Shared Domain**: Common types, utilities, and cross-domain functionality

### Cross-Language Consistency
- Frontend and backend mirror each other's domain organization
- Consistent naming patterns between TypeScript and Rust implementations
- Shared type contracts and API definitions
- Aligned testing strategies and documentation patterns

## Configuration & Data (`data/`)

### Default Configurations
- `default_apstra_config.json` - Apstra connection defaults
- `default_conversion_map.json` - Excel header mappings
- `default_enhanced_conversion_map.json` - Advanced mapping rules
- `queries/` - GraphQL queries for Apstra API

## Documentation Structure (`docs/`)

### Organized Documentation
- `architecture.md` - System design and data flow
- `core-features.md` - Feature specifications
- `development.md` - Setup and troubleshooting
- `api-integration.md` - Apstra API patterns
- `user/` - End-user guides and tutorials

## Testing Organization

### Test Structure
```
tests/
├── fixtures/              # Sample Excel files for testing
├── integration/           # End-to-end workflow tests
└── e2e/                  # Browser automation tests

src-tauri/tests/          # Rust unit and integration tests
src/__tests__/            # React component tests
```

## File Naming Conventions

### Frontend (TypeScript/React)
- **Components**: PascalCase directories and files (`DataTable/DataTable.tsx`)
- **Services**: PascalCase with Service suffix (`ApstraApiService.ts`)
- **Types**: PascalCase interfaces and types (`NetworkConfig.ts`)
- **Utilities**: camelCase functions (`fileHandlers.ts`)

### Backend (Rust)
- **Modules**: snake_case (`apstra_api_handler.rs`)
- **Structs**: PascalCase (`NetworkConfigRow`)
- **Functions**: snake_case (`parse_excel_sheet`)
- **Constants**: SCREAMING_SNAKE_CASE (`DEFAULT_HEADER_ROW`)

## Import/Export Patterns

### Frontend Module Exports
```typescript
// Component index files for clean imports
export { default as DataTable } from './DataTable';
export { default as FileUpload } from './FileUpload';

// Service exports with consistent naming
export { ApstraApiService } from './ApstraApiService';
export { logger } from './LoggingService';
```

### Backend Module Structure
```rust
// Clear module hierarchy
pub mod commands;
pub mod services;
pub mod models;
pub mod utils;

// Selective re-exports
pub use models::network_config::NetworkConfigRow;
pub use services::excel_service::ExcelProcessingResult;
```

## Critical File Locations

### Configuration Files
- `package.json` - Frontend dependencies and scripts
- `src-tauri/Cargo.toml` - Rust dependencies and metadata
- `tsconfig.json` - TypeScript compiler configuration
- `vite.config.ts` - Build system configuration
- `src-tauri/tauri.conf.json` - Tauri application configuration

### Entry Points
- `src/main.tsx` - React application entry
- `src-tauri/src/main.rs` - Tauri application entry
- `src/App.tsx` - Main React component with routing

This structure supports the application's core workflows while maintaining clear separation of concerns and enabling efficient development and maintenance.