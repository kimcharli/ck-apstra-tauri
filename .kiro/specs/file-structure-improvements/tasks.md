# Implementation Plan: File Structure Improvements

## Task Overview

This implementation plan converts the file structure improvement design into actionable development tasks, prioritizing incremental changes that maintain system stability while improving organization and maintainability.

- [x] 1. Create domain-driven directory structure foundation
  - Create new domain directories in both frontend and backend
  - Set up module exports and index files for each domain
  - Configure build system to handle new directory structure
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.1 Create frontend domain directories
  - Create `src/domains/` with subdirectories for excel, apstra, conversion, provisioning, shared
  - Add index.ts files for each domain with proper exports
  - Update tsconfig.json paths if needed for clean imports
  - _Requirements: 1.1, 1.2_

- [x] 1.2 Create backend domain directories  
  - Create `src-tauri/src/domains/` with subdirectories for excel, apstra, conversion, provisioning, shared
  - Add mod.rs files for each domain with proper module declarations
  - Update main.rs and lib.rs to include new domain modules
  - _Requirements: 1.1, 1.2_

- [x] 1.3 Set up shared type contracts
  - Create `src/domains/shared/types/api-contracts.ts` for TypeScript definitions
  - Create `src-tauri/src/domains/shared/models/` for Rust type definitions
  - Define common interfaces that will be used across domains
  - _Requirements: 5.1, 5.2_

- [ ] 2. Migrate Excel domain to new structure
  - Move Excel-related components, services, and types to excel domain
  - Update all imports and dependencies to use new paths
  - Ensure Excel processing functionality remains intact
  - _Requirements: 1.1, 2.1, 2.2_

- [ ] 2.1 Migrate Excel frontend components and services
  - Move FileUpload, SheetSelector components to `src/domains/excel/components/`
  - Move Excel-related services to `src/domains/excel/services/`
  - Move Excel types to `src/domains/excel/types/`
  - Update all import statements throughout the codebase
  - _Requirements: 1.1, 2.1_

- [ ] 2.2 Migrate Excel backend services and commands
  - Move excel_service.rs to `src/domains/excel/services/`
  - Move file_handler.rs and data_parser.rs commands to `src/domains/excel/commands/`
  - Move Excel-related models to `src/domains/excel/models/`
  - Update command registration in main.rs
  - _Requirements: 1.1, 2.1_

- [ ] 2.3 Update Excel domain tests and documentation
  - Move Excel-related tests to domain-specific test directories
  - Create Excel domain README with API documentation
  - Update test imports and ensure all tests pass
  - _Requirements: 6.1, 6.2_

- [ ] 3. Migrate Apstra domain to new structure
  - Move Apstra-related components, services, and types to apstra domain
  - Reorganize API client and authentication logic
  - Update session management to follow domain patterns
  - _Requirements: 1.1, 2.1, 2.2_

- [ ] 3.1 Migrate Apstra frontend components and services
  - Move ApstraConfigManager, ToolsPage components to `src/domains/apstra/components/`
  - Move ApstraApiService to `src/domains/apstra/services/`
  - Move Apstra types and authentication context to `src/domains/apstra/`
  - Update all import statements and component references
  - _Requirements: 1.1, 2.1_

- [ ] 3.2 Migrate Apstra backend services and commands
  - Move apstra_api_service.rs to `src/domains/apstra/services/`
  - Move apstra_api_handler.rs and apstra_config_handler.rs to `src/domains/apstra/commands/`
  - Move Apstra models to `src/domains/apstra/models/`
  - Update command registration and service dependencies
  - _Requirements: 1.1, 2.1_

- [ ] 3.3 Update Apstra domain tests and documentation
  - Move Apstra-related tests to domain-specific directories
  - Create Apstra domain README with API integration patterns
  - Document authentication flow and session management
  - _Requirements: 6.1, 6.2_

- [ ] 4. Migrate Conversion domain to new structure
  - Move conversion mapping components and enhanced conversion system
  - Reorganize transformation engine and validation logic
  - Update conversion map management to follow domain patterns
  - _Requirements: 1.1, 2.1, 2.2_

- [ ] 4.1 Migrate Conversion frontend components and services
  - Move ConversionMapManager components to `src/domains/conversion/components/`
  - Move EnhancedConversionService to `src/domains/conversion/services/`
  - Move conversion types and hooks to `src/domains/conversion/`
  - Update all import statements and component references
  - _Requirements: 1.1, 2.1_

- [ ] 4.2 Migrate Conversion backend services and commands
  - Move enhanced_conversion_service.rs and transformation_engine.rs to `src/domains/conversion/services/`
  - Move enhanced_conversion_handler.rs to `src/domains/conversion/commands/`
  - Move conversion models to `src/domains/conversion/models/`
  - Update command registration and service dependencies
  - _Requirements: 1.1, 2.1_

- [ ] 4.3 Update Conversion domain tests and documentation
  - Move conversion-related tests to domain-specific directories
  - Create Conversion domain README with mapping system documentation
  - Document transformation rules and validation patterns
  - _Requirements: 6.1, 6.2_

- [ ] 5. Migrate Provisioning domain to new structure
  - Move provisioning workflow components and data processing logic
  - Reorganize provisioning table and action processing
  - Update network configuration handling to follow domain patterns
  - _Requirements: 1.1, 2.1, 2.2_

- [ ] 5.1 Migrate Provisioning frontend components and services
  - Move ProvisioningPage, ProvisioningTable components to `src/domains/provisioning/components/`
  - Move provisioning services to `src/domains/provisioning/services/`
  - Move provisioning types and hooks to `src/domains/provisioning/`
  - Update all import statements and component references
  - _Requirements: 1.1, 2.1_

- [ ] 5.2 Migrate Provisioning backend services and commands
  - Move network_service.rs to `src/domains/provisioning/services/`
  - Move action_processor.rs to `src/domains/provisioning/commands/`
  - Move network configuration models to `src/domains/provisioning/models/`
  - Update command registration and service dependencies
  - _Requirements: 1.1, 2.1_

- [ ] 5.3 Update Provisioning domain tests and documentation
  - Move provisioning-related tests to domain-specific directories
  - Create Provisioning domain README with workflow documentation
  - Document data processing pipeline and validation rules
  - _Requirements: 6.1, 6.2_

- [ ] 6. Organize shared and infrastructure code
  - Move common utilities and shared services to appropriate locations
  - Create infrastructure layer for technical concerns
  - Establish clear boundaries between domains and shared code
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 6.1 Create shared domain utilities
  - Move common types to `src/domains/shared/types/`
  - Move shared utilities to `src/domains/shared/utils/`
  - Move common hooks to `src/domains/shared/hooks/`
  - Update imports to use shared utilities consistently
  - _Requirements: 8.1, 8.2_

- [ ] 6.2 Create infrastructure layer
  - Move logging services to `src/infrastructure/logging/`
  - Move API client infrastructure to `src/infrastructure/api/`
  - Move file system utilities to `src-tauri/src/infrastructure/filesystem/`
  - Separate technical infrastructure from business domains
  - _Requirements: 8.1, 8.3_

- [ ] 6.3 Update application-level organization
  - Move navigation and routing to `src/app/routing/`
  - Move React contexts to `src/app/contexts/`
  - Move global configuration to `src/app/config/`
  - Create clear separation between app-level and domain-level code
  - _Requirements: 8.1, 8.2_

- [ ] 7. Update build configuration and tooling
  - Update TypeScript path mapping for new domain structure
  - Update Rust module declarations and exports
  - Ensure all build scripts work with new directory structure
  - _Requirements: 1.4, 2.3_

- [ ] 7.1 Update TypeScript configuration
  - Update tsconfig.json with path mappings for domain imports
  - Update Vite configuration if needed for new structure
  - Ensure hot reload works correctly with new organization
  - Test that all TypeScript compilation works correctly
  - _Requirements: 1.4, 2.3_

- [ ] 7.2 Update Rust configuration
  - Update Cargo.toml if needed for new module structure
  - Ensure all mod.rs files properly export domain modules
  - Update main.rs command registration for new command locations
  - Test that all Rust compilation works correctly
  - _Requirements: 1.4, 2.3_

- [ ] 7.3 Update development tooling
  - Update test scripts to work with new directory structure
  - Update linting configuration for new organization
  - Update documentation generation if applicable
  - Ensure all npm scripts work with new structure
  - _Requirements: 1.4, 2.3_

- [ ] 8. Clean up legacy structure and validate migration
  - Remove old directory structure after confirming migration success
  - Update all documentation to reflect new organization
  - Validate that all functionality works correctly
  - _Requirements: 3.2, 3.3_

- [ ] 8.1 Remove legacy directories
  - Remove old `src/components/` directory after confirming all components migrated
  - Remove old `src/services/` directory after confirming all services migrated
  - Remove old `src-tauri/src/commands/` directory after confirming all commands migrated
  - Remove old `src-tauri/src/services/` directory after confirming all services migrated
  - _Requirements: 3.2_

- [ ] 8.2 Update documentation and README files
  - Update main README.md with new directory structure
  - Update SPECIFICATION.md to reflect new organization
  - Update steering files with new structure information
  - Create migration guide for developers
  - _Requirements: 3.3, 2.4_

- [ ] 8.3 Comprehensive testing and validation
  - Run full test suite to ensure no regressions
  - Test all major workflows (Excel upload, Apstra connection, provisioning)
  - Validate that build and deployment processes work correctly
  - Confirm that development experience is improved
  - _Requirements: 3.1, 3.4_

## Migration Notes

### Critical Dependencies

- Tasks 1.1-1.3 must be completed before any domain migration
- Domain migrations (tasks 2-5) can be done in parallel after foundation is complete
- Task 6 (shared code organization) should be done after domain migrations
- Tasks 7-8 (cleanup and validation) must be done last

### Risk Mitigation

- Each domain migration should be completed and tested before moving to the next
- Keep old structure in place until new structure is fully validated
- Maintain comprehensive test coverage throughout migration
- Document any breaking changes or required developer actions

### Success Criteria

- All existing functionality continues to work without regression
- New domain structure makes it easier to locate related functionality
- Build times and development experience are maintained or improved
- Code organization follows consistent patterns across frontend and backend
- Documentation accurately reflects new structure and provides clear guidance
