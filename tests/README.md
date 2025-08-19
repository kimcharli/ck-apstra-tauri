# Test Suite Documentation

This directory contains comprehensive test cases for the Excel conversion functionality and conversion map system.

## Test Structure

### Unit Tests (Rust)
Located in: `src-tauri/src/commands/data_parser.rs` (bottom of file)

**Coverage:**
- Header mapping logic (exact match, normalized matching, field variations)
- Data conversion from Excel to `NetworkConfigRow`
- Boolean field parsing (true/false, yes/no, 1/0, etc.)
- Empty value handling (empty strings, whitespace-only values)
- Priority matching (longer headers preferred over shorter ones)
- Required field validation

**Key Test Cases:**
- `test_create_conversion_field_mapping_exact_match()` - Tests exact header matching
- `test_create_conversion_field_mapping_normalized_headers()` - Tests case-insensitive and whitespace normalization
- `test_create_field_mapping_with_variations()` - Tests fallback field variations
- `test_convert_to_network_config_row_valid()` - Tests complete row conversion
- `test_convert_to_network_config_row_missing_required_fields()` - Tests required field validation
- `test_boolean_field_parsing()` - Tests all boolean value formats
- `test_header_priority_matching()` - Tests that "Slot/Port" is preferred over "Slot"

### Integration Tests (Rust)
Located in: `tests/integration/excel_conversion_test.rs`

**Coverage:**
- Real Excel file parsing using `original-0729.xlsx` fixture
- Multiple sheet processing (4187-11, 4187-12)
- Default conversion map vs field variations
- Data validation pipeline
- Header normalization with line breaks
- Empty/whitespace value handling
- Blueprint field requirement (must always be None)

**Key Test Cases:**
- `test_parse_excel_with_real_fixture()` - Tests parsing actual Excel sheets
- `test_field_mapping_with_variations()` - Tests field variations fallback
- `test_data_validation()` - Tests validation pipeline
- `test_header_normalization()` - Tests handling of headers with `\r\n`
- `test_empty_and_whitespace_handling()` - Tests empty value filtering
- `test_blueprint_always_none()` - Tests blueprint requirement

### UI Integration Tests (TypeScript)
Located in: `tests/integration/conversion_map_ui_test.ts`

**Coverage:**
- ConversionMapManager component functionality
- Dropdown field mapping display
- Adding/removing mappings
- Save/load operations
- Field label consistency
- Blueprint mapping prevention

**Key Test Cases:**
- `should load and display conversion mappings correctly` - Tests UI loading
- `should handle adding new mappings` - Tests mapping addition
- `should save user conversion map with correct structure` - Tests save functionality
- `should validate field mapping consistency` - Tests UI shows correct labels instead of "switch"
- `should display correct field labels in dropdowns` - Tests availableFields array

## Test Fixtures

### Excel File
- **File**: `tests/fixtures/original-0729.xlsx`
- **Purpose**: Real Excel file with actual network configuration data
- **Sheets**: Contains multiple sheets including 4187-11 and 4187-12
- **Headers**: Includes "Host Name", "Slot/Port", "Switch Name", "Port", etc.

## Running Tests

### All Tests
```bash
# Frontend tests
npm run test

# Rust unit tests
npm run test:rust

# Rust integration tests  
npm run test:integration

# All tests
npm run test && npm run test:rust
```

### Specific Test Categories
```bash
# Run only unit tests
cd src-tauri && cargo test test_

# Run only integration tests
cd src-tauri && cargo test --test excel_conversion_test

# Run UI tests with watch mode
npm run test -- --watch

# Run tests with UI
npm run test:ui
```

### Debug Mode
```bash
# Rust tests with output
cd src-tauri && cargo test -- --nocapture

# Frontend tests with debug info
npm run test -- --reporter=verbose
```

## Test Requirements Validation

### Excel Conversion Requirements
- ✅ "Host Name" header maps to `server_label` field
- ✅ "Slot/Port" header maps to `server_ifname` field  
- ✅ Blueprint field is always `None` (not read from Excel)
- ✅ Empty values are filtered out (converted to `None`)
- ✅ Header normalization handles `\r\n` line breaks
- ✅ Priority matching prefers longer headers ("Slot/Port" over "Slot")
- ✅ Field variations provide fallback mapping when conversion map fails
- ✅ Boolean values support multiple formats (true/false, yes/no, 1/0, y/n)

### UI Requirements
- ✅ Conversion map shows actual field labels instead of "switch" for all mappings
- ✅ Dropdown options use proper field labels ("Server Name/Host Name", "Server Interface/Slot/Port")
- ✅ New mappings can be added via UI
- ✅ Mappings can be saved and loaded
- ✅ Blueprint mapping is not available as an option

### Integration Requirements  
- ✅ Real Excel files can be parsed successfully
- ✅ Multiple sheets can be processed
- ✅ Server name and interface data is properly extracted from sheets 4187-11 and 4187-12
- ✅ Validation pipeline processes data without errors
- ✅ Field mapping changes are reflected in parsing results

## Known Test Data Patterns

Based on the original-0729.xlsx fixture:
- Sheets 4187-11 and 4187-12 contain the primary test data
- Headers include variations with line breaks (`Speed\n(GB)`, `LACP\nNeeded`)
- Some cells may be empty or contain only whitespace
- Server data (Host Name, Slot/Port) should be present in test sheets

## Continuous Integration

The test suite is designed to:
1. Validate all conversion mapping logic
2. Ensure UI displays correct field mappings
3. Test real-world Excel file processing
4. Verify data integrity throughout the pipeline
5. Prevent regressions in field mapping behavior

## Troubleshooting Tests

### Integration Test Failures
If integration tests fail due to missing fixture:
```bash
# Copy the Excel fixture manually
cp ~/Downloads/original-0729.xlsx tests/fixtures/
```

### UI Test Failures
Common issues:
- Tauri API mocking: Ensure `mockInvoke` is properly configured
- Component rendering: Check that all props are provided
- Async operations: Use `waitFor()` for async state updates

### Rust Test Failures
Common issues:
- Module visibility: Ensure test modules can access internal functions
- File paths: Integration tests use relative paths from `src-tauri` directory
- Logging: Use `RUST_LOG=debug cargo test` for detailed output