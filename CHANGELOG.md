# Changelog

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