# Excel Domain

The Excel domain handles all Excel file processing functionality, including file upload, sheet parsing, and data extraction.

## Overview

This domain provides the core functionality for processing Excel files (.xlsx) in the Apstra Network Configuration Tool. It handles file validation, sheet enumeration, and data parsing with support for merged cells and various data formats.

## Architecture

### Commands

- **file_handler.rs**: Handles Excel file upload and validation
  - `upload_excel_file`: Validates and processes Excel files, returns sheet names
  - `cleanup_temp_file`: Cleans up temporary files after processing

- **data_parser.rs**: Handles Excel sheet parsing and data extraction
  - `parse_excel_sheet`: Parses specific Excel sheets into NetworkConfigRow format
  - Supports enhanced conversion mapping for flexible header handling
  - Handles merged cells and various Excel data formats

### Services

- **ExcelProcessingService**: Core service for Excel operations
  - Provides high-level interface for Excel processing
  - Handles sheet enumeration and data parsing
  - Designed for extensibility and testing

### Models

- **ExcelFile**: Represents an Excel file with its sheets
- **ExcelSheet**: Represents a single worksheet with data
- **ExcelRow**: Represents a row of Excel data
- **ExcelCell**: Represents a single cell with position information
- **ExcelValidationResult**: Results of Excel data validation
- **ExcelProcessingOptions**: Configuration options for processing

## API Reference

### Commands (Tauri Interface)

#### upload_excel_file

```rust
#[command]
pub async fn upload_excel_file(file_path: String) -> Result<Vec<String>, String>
```

Validates and processes an Excel file, returning the list of available sheet names.

**Parameters:**
- `file_path`: Path to the Excel file (.xlsx)

**Returns:**
- `Ok(Vec<String>)`: List of sheet names in the Excel file
- `Err(String)`: Error message if file is invalid or cannot be processed

**Example:**
```rust
let sheets = upload_excel_file("/path/to/file.xlsx".to_string()).await?;
println!("Available sheets: {:?}", sheets);
```

#### parse_excel_sheet

```rust
#[command]
pub async fn parse_excel_sheet(
    file_path: String, 
    sheet_name: String, 
    enhanced_conversion_map: Option<EnhancedConversionMap>
) -> Result<Vec<NetworkConfigRow>, String>
```

Parses a specific Excel sheet into structured network configuration data.

**Parameters:**
- `file_path`: Path to the Excel file
- `sheet_name`: Name of the sheet to parse
- `enhanced_conversion_map`: Optional conversion map for header mapping

**Returns:**
- `Ok(Vec<NetworkConfigRow>)`: Parsed network configuration data
- `Err(String)`: Error message if parsing fails

**Features:**
- Automatic header detection and mapping
- Merged cell handling for complex Excel layouts
- Data validation and type conversion
- Support for various Excel data formats

### Services

#### ExcelProcessingService

```rust
impl ExcelProcessingService {
    pub fn new() -> Self
    pub fn get_sheet_names(&self, file_path: &str) -> Result<Vec<String>, String>
    pub fn parse_sheet(&self, file_path: &str, sheet_name: &str) -> Result<Vec<NetworkConfigRow>, String>
}
```

High-level service interface for Excel processing operations.

## Data Flow

1. **File Upload**: User selects Excel file through frontend
2. **Validation**: Backend validates file exists and has .xlsx extension
3. **Sheet Enumeration**: Extract list of available sheets from Excel file
4. **Sheet Selection**: User selects specific sheet to process
5. **Header Detection**: Identify header row and extract column names
6. **Header Mapping**: Map Excel headers to internal field names using conversion map
7. **Data Parsing**: Extract and convert data rows to NetworkConfigRow format
8. **Validation**: Validate parsed data and filter invalid rows
9. **Return Results**: Send structured data back to frontend

## Excel Processing Features

### Merged Cell Handling

The Excel domain includes sophisticated merged cell detection and processing:

- **Selective Detection**: Only applies merge detection to columns that actually use merged cells
- **Vertical Merging**: Handles cells merged vertically (common in connectivity templates)
- **Horizontal Merging**: Handles cells merged horizontally (common in headers)
- **Validation**: Prevents invalid merge propagation that could corrupt data

### Header Mapping

Flexible header mapping system supports:

- **Case-insensitive matching**: Headers match regardless of case
- **Whitespace normalization**: Handles extra spaces and line breaks
- **Multiple naming conventions**: Supports various Excel header formats
- **Custom mappings**: User-defined header to field mappings

### Data Validation

Built-in validation ensures data quality:

- **Required field validation**: Ensures critical fields are present
- **Data type validation**: Converts and validates data types
- **Empty row filtering**: Automatically skips empty rows
- **Duplicate detection**: Identifies and handles duplicate entries

## Testing

The Excel domain includes comprehensive tests:

- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test complete Excel processing workflows
- **Performance Tests**: Ensure processing speed meets requirements
- **Error Handling Tests**: Verify proper error handling and recovery

### Running Tests

```bash
# Run all Excel domain tests
cargo test excel

# Run specific test
cargo test test_upload_excel_file_basic

# Run with output
cargo test excel -- --nocapture
```

## Error Handling

The Excel domain uses structured error handling:

- **File Errors**: File not found, invalid format, permission issues
- **Parsing Errors**: Invalid Excel structure, corrupted data
- **Validation Errors**: Missing required fields, invalid data types
- **System Errors**: Memory issues, disk space problems

All errors are returned as descriptive strings that can be displayed to users.

## Performance Considerations

- **Streaming Processing**: Large Excel files are processed in chunks
- **Memory Management**: Efficient memory usage for large datasets
- **Caching**: Sheet metadata is cached to avoid repeated parsing
- **Lazy Loading**: Data is loaded only when needed

## Dependencies

- **calamine**: Excel file reading and parsing
- **serde**: Data serialization and deserialization
- **tokio**: Async runtime for file operations
- **log**: Logging and debugging

## Future Enhancements

- **Excel Writing**: Support for generating Excel files
- **Format Support**: Support for .xls (older Excel format)
- **Advanced Validation**: More sophisticated data validation rules
- **Batch Processing**: Process multiple Excel files simultaneously
- **Template System**: Predefined Excel templates for common use cases