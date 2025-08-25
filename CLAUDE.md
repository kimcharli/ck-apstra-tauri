# CLAUDE.md

This file provides **essential project-specific guidance** to Claude Code when working with this Tauri-based Excel processing application for network configuration data.

## Project Identity

**Tauri-based Excel processor** for network configuration data with Apstra API integration. React TypeScript frontend + Rust backend.

## Documentation Structure

- **@docs/architecture.md** - System design patterns and build processes
- **@docs/core-features.md** - Excel processing and merge cell handling
- **@docs/development.md** - Commands, principles, and troubleshooting
- **@docs/api-integration.md** - Apstra API service documentation

## Critical Project-Specific Rules

### Excel Processing Rules (NEVER CHANGE WITHOUT TESTING)

**Two-Phase Field Mapping Algorithm** - Prevents port field regression:

```rust
// Phase 1: ALL exact matches first (absolute priority)
// Phase 2: Partial matches only for unmapped fields
```

- ❌ **NEVER** allow partial matches to override exact matches
- ✅ Test with `cargo test test_port_field_mapping_regression`

**Selective Merged Cell Detection** - Server names only:

```rust
let merge_enabled_columns = ["CTs", "link_group_ct_names", "Host Name", "server_label"];
```

- ❌ **NEVER** apply merge detection without user confirmation
- ✅ Process Excel rows as individual cells unless proven otherwise

**Required Fields Validation**:

```rust
if switch_label.is_none() || raw_switch_ifname.is_none() { return None; }
```

- ❌ **NEVER** change `||` to `&&` in required fields check
- ✅ Both switch name AND interface must be present

**Speed Normalization System**:

```rust
// Backend: "25GB" -> "25G", Frontend: don't add "Gbps" if already has unit
if /[GM]$/.test(value) { return value; }
```

- ❌ **NEVER** remove speed normalization without updating frontend
- ❌ **NEVER** change frontend regex `/[GM]$/` without testing

### Project-Specific Field Names

**Internal Field Names** (use consistently after Excel import):

- `blueprint`, `server_label`, `switch_label`, `switch_ifname`, `server_ifname`
- `link_speed`, `link_group_lag_mode`, `link_group_ct_names`, `link_group_ifname`
- `is_external`, `server_tags`, `switch_tags`, `link_tags`, `comment`

**Rule**: Never mix field naming conventions within a single service or data flow.

### Interface Naming Convention

**Speed-Based Prefixes**:

- `> 10G  → "et-"` (25G, 40G, 100G)
- `= 10G  → "xe-"` (10 Gigabit)
- `< 10G  → "ge-"` (1G)

**Format**: `{prefix}-0/0/{port_number}`

- ❌ **NEVER** apply to non-numeric ports
- ✅ Only transform simple port numbers ("2", "5", "1")

### Dynamic Conversion Map System

**Three-Tier Fallback**:

1. User-provided conversion map (runtime JSON)
2. Default from `data/default_conversion_map.json`
3. Built-in fallback logic

**JSON Format**:

```json
{
    "header_row": 2,
    "mappings": {
        "Switch Name": "switch_label",
        "Port": "switch_ifname",
        "Host Name": "server_label"
    }
}
```

**MAINTENANCE RULE**: Never hard-code field mappings. All mapping must go through conversion map system.

## Critical Library Information

**Calamine 0.30.0**: Excel processing with merged region metadata

```rust
use calamine::{Reader, Xlsx, open_workbook, Range, Data, DataType};
// NEW API: workbook.load_merged_regions(), merged_regions_by_sheet()
```

## Essential Commands

**Development**:

- `RUST_LOG=debug npm run tauri:dev` - Debug mode
- `cargo test test_port_field_mapping_regression` - Critical regression test
- `cargo test test_merged_cell_server_names` - Merged cell test

**Build**:

- `npm run tauri:build` - Production build
- Output: `src-tauri/target/release/bundle/`

## Apstra API Integration

**Key Services**:

- Backend: `src-tauri/src/commands/apstra_api_handler.rs`
- Frontend: `src/services/ApstraApiService.ts`
- URLs: `src/utils/apstraUrls.ts`

**Session Management**: Stateful authentication with automatic token refresh

**CRITICAL API Data Merging**: Apstra graph queries return same connection across multiple result chunks. Must merge chunks to preserve speed data. See **@docs/core-features.md** section "CRITICAL: Apstra API Data Merging".

- ❌ **NEVER** overwrite API result chunks without merging
- ✅ **ALWAYS** merge to preserve speed/LAG mode/CT data
- ✅ Located in `ProvisioningTable.tsx` `compareAndUpdateConnectivityData()`

## Critical File Locations

- **Excel Parser**: `src-tauri/src/commands/data_parser.rs`
- **Conversion Service**: `src-tauri/src/services/conversion_service.rs`
- **Default Map**: `data/default_conversion_map.json`
- **Test Fixtures**: `tests/fixtures/original-0729.xlsx`
- **Regression Tests**: `src-tauri/tests/port_field_mapping_test.rs`

## Recent Critical Changes (Reference Only)

**Calamine 0.30.0 Upgrade**:

- DataType → Data enum
- Added Excel merged region metadata APIs
- Fixed server name regression in selective merge detection

For detailed implementation patterns, troubleshooting, and development practices, see the modular documentation in `docs/`.

- implement test in early phase to detect blank page and the DOM error that can cause blank page
- the provisiong should render the xlsx input data when the sheet is selected. If Apstra Connection is made, the blueprint selection should be made. Otherwise, just render the xlsx input data.