# Changelog

## [2025-01-22] - Device Filtering and Query Template Migration

### Added
- **Device Filtering System**: Automatically filters out non-switch devices from provisioning table during "Fetch & Compare" operation
  - Removes switches not present in selected Apstra blueprint
  - Prevents non-switch devices (like servers) from appearing in switch columns
  - Line-by-line filtering to maintain data integrity
- **Blueprint Auto-Detection**: Intelligent blueprint detection based on switch analysis
  - Samples switches from Excel data to find best-matching blueprint
  - Consistent tie-breaking logic (count desc, name asc) for reproducible results
  - Automatic blueprint selection during sheet selection process
- **Query Template System**: Complete migration from hardcoded queries to template-based approach
  - New query templates: `system_with_topology_query.gql`, `ip_with_topology_query.gql`
  - Centralized template loading in both frontend and backend
  - Parameter substitution system for dynamic query generation

### Changed
- **Provisioning Table Filtering**: Switch filtering now occurs during API comparison rather than Excel parsing
  - Preserves all Excel data while removing non-relevant devices from display
  - Maintains original Excel row order and data integrity
  - Improved debugging with detailed filtering logs
- **Backend Query Processing**: Rust backend now uses template files instead of hardcoded queries
  - `search_systems()` method migrated to use `system_search_query.gql` template
  - Consistent template loading pattern across all services
  - Enhanced parameter substitution with proper escaping
- **Frontend API Integration**: Updated to use template-based queries for topology searches
  - `createSystemWithTopologyQuery()` and `createIPWithTopologyQuery()` now async
  - Improved error handling for template loading failures
  - Consistent query normalization across all API calls

### Fixed
- **Blueprint Detection Accuracy**: Switches now correctly assigned to proper blueprints
  - CHA08P26L03 correctly detected for DH50-Colo1 instead of DH4-Colo2
  - Improved sampling algorithm for better detection accuracy
- **Table State Management**: Fixed React component memoization for blueprint changes
  - Table columns now update properly when blueprint selection changes
  - Resolved authentication check issues (`getAuthStatus()` vs `getHost()`)
- **Data Integrity**: Eliminated issues with pre-filtering removing valid data
  - Removed problematic batch filtering that could remove all table data
  - Line-by-line filtering ensures stable table display

### Documentation
- **Query Template Audit**: Complete documentation of hardcoded query migration
  - Before/after code comparisons for all 3 migrated queries
  - Implementation benefits and considerations
  - Testing and validation procedures

### Technical Details
- **Files Modified**:
  - `src/components/ProvisioningTable/ProvisioningTable.tsx` - Device filtering logic
  - `src/components/ProvisioningPage/ProvisioningPage.tsx` - Blueprint auto-detection
  - `src/services/ApstraApiService.ts` - Template-based query methods
  - `src-tauri/src/services/apstra_api_service.rs` - Template integration
  - `src-tauri/src/commands/apstra_api_handler.rs` - Query template loading
- **Files Added**:
  - `data/queries/system_with_topology_query.gql` - System topology query template
  - `data/queries/ip_with_topology_query.gql` - IP topology query template
  - `docs/query-template-audit.md` - Migration audit documentation

### Migration Notes
- All GraphQL queries now centralized in `/data/queries/` directory
- Template parameter format uses `{parameter_name}` syntax
- Frontend and backend query loading unified under single template system
- No breaking changes to existing Excel processing or API functionality

## [Unreleased]

### Added
- **LAG Name Auto-Generation**: Implemented server-based LAG name grouping for `lacp_active` connections
  - All interfaces from the same server now share the same auto-generated LAG name (e.g., `ae900`)
  - Changed grouping key from `${server}-${switch}` to `${server}` for proper LAG bonding
  
- **LAG Name Synchronization from API**: Enhanced Fetch & Compare functionality
  - Excel LAG names are automatically updated with actual LAG names from Apstra API
  - Table always displays API LAG names after synchronization (not Excel auto-generated ones)
  - Individual connections get their specific API LAG names from `ae1.if_name` field
  
- **Enhanced Match/Mismatch Logic for LAG Names**:
  - **Match (Green)**: When all connections for the same server have the same API LAG name
  - **Mismatch (Red)**: When connections for the same server have different API LAG names
  - Visual feedback provides immediate indication of LAG configuration consistency

### Changed
- **LAG Grouping Logic**: Modified `processLagBondNames` to group by server only instead of server-switch pairs
- **API Synchronization**: Updated `compareAndUpdateConnectivityData` to include LAG name synchronization step
- **Validation Logic**: Enhanced `validateLagGroupConsistency` to work with synchronized API LAG names

### Technical Implementation
- Added `synchronizeLagNamesFromApi()` function for updating Excel data with API LAG names
- Enhanced console logging for LAG synchronization process with clear match/mismatch indicators
- Improved error handling for inconsistent API LAG data scenarios

### Examples
**Before**: 
- Excel: `ae900`, `ae900` (auto-generated for same server)
- API: `ae45`, `ae49` (different LAG names)
- Result: Mismatch, table shows original Excel names

**After**:
- Excel: `ae900`, `ae900` (auto-generated for same server)  
- API: `ae45`, `ae49` (different LAG names)
- Result: Mismatch (red), table shows `ae45`, `ae49` (API names)

**Match Case**:
- Excel: `ae900`, `ae900` (auto-generated for same server)
- API: `ae45`, `ae45` (same LAG name) 
- Result: Match (green), table shows `ae45`, `ae45` (API names)

## Previous Releases
[Previous changelog entries would go here]