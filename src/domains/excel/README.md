# Excel Domain (Frontend)

The Excel domain provides React components, services, and utilities for Excel file processing in the Apstra Network Configuration Tool frontend.

## Overview

This domain handles the user interface and client-side logic for Excel file operations, including file selection, sheet display, and data preview functionality.

## Architecture

### Components

- **FileUpload**: File selection and upload component
- **SheetSelector**: Sheet selection interface component

### Services

- **ExcelProcessingService**: Client-side Excel processing service that communicates with the backend

### Types

- **ExcelTypes**: TypeScript type definitions for Excel-related data structures

### Hooks

- **useFileUpload**: React hook for managing file upload state and operations

## Components

### FileUpload

A React component that provides file selection functionality for Excel files.

```typescript
interface FileUploadProps {
  onSheetsLoaded?: (sheets: string[], filePath: string) => void;
}
```

**Features:**
- File dialog integration using Tauri APIs
- Excel file validation (.xlsx only)
- Loading states and error handling
- Automatic sheet enumeration after file selection

**Usage:**
```typescript
import { FileUpload } from '../../domains/excel';

<FileUpload 
  onSheetsLoaded={(sheets, filePath) => {
    console.log('Loaded sheets:', sheets);
    console.log('File path:', filePath);
  }}
/>
```

### SheetSelector

A React component that displays available Excel sheets and allows selection.

```typescript
interface SheetSelectorProps {
  sheets?: string[];
  filePath?: string;
  onSheetSelect?: (sheetName: string) => void;
  selectedSheet?: string;
}
```

**Features:**
- Visual sheet selection interface
- Selected sheet highlighting
- Empty state handling
- Responsive design

**Usage:**
```typescript
import { SheetSelector } from '../../domains/excel';

<SheetSelector
  sheets={availableSheets}
  selectedSheet={currentSheet}
  onSheetSelect={(sheetName) => {
    console.log('Selected sheet:', sheetName);
  }}
/>
```

## Services

### ExcelProcessingService

Client-side service that communicates with the Tauri backend for Excel operations.

```typescript
class ExcelProcessingService {
  static async uploadFile(filePath: string): Promise<string[]>
  static async parseSheet(filePath: string, sheetName: string): Promise<NetworkConfigRow[]>
  static async validateData(data: NetworkConfigRow[]): Promise<NetworkConfigRow[]>
  static async cleanupTempFile(fileId: string): Promise<void>
}
```

**Methods:**

#### uploadFile
Uploads an Excel file and returns available sheet names.

```typescript
const sheets = await ExcelProcessingService.uploadFile('/path/to/file.xlsx');
```

#### parseSheet
Parses a specific Excel sheet into structured data.

```typescript
const data = await ExcelProcessingService.parseSheet('/path/to/file.xlsx', 'Sheet1');
```

#### validateData
Validates parsed Excel data.

```typescript
const validatedData = await ExcelProcessingService.validateData(rawData);
```

#### cleanupTempFile
Cleans up temporary files after processing.

```typescript
await ExcelProcessingService.cleanupTempFile('temp_file_id');
```

## Types

### ExcelTypes

TypeScript type definitions for Excel-related data structures.

```typescript
interface ExcelFile {
  path: string;
  sheets: string[];
}

interface ExcelSheet {
  name: string;
  data: ExcelRow[];
}

interface ExcelRow {
  [key: string]: string | number | boolean | null;
}

interface ExcelValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ExcelProcessingOptions {
  skipEmptyRows?: boolean;
  trimWhitespace?: boolean;
  headerRow?: number;
}
```

## Hooks

### useFileUpload

React hook for managing file upload state and operations.

```typescript
const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [sheets, setSheets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (filePath: string) => {
    // Upload logic
  };

  return {
    isUploading,
    sheets,
    error,
    uploadFile,
  };
};
```

**Usage:**
```typescript
import { useFileUpload } from '../../domains/excel';

const MyComponent = () => {
  const { isUploading, sheets, error, uploadFile } = useFileUpload();

  const handleFileSelect = async (filePath: string) => {
    await uploadFile(filePath);
  };

  return (
    <div>
      {isUploading && <p>Uploading...</p>}
      {error && <p>Error: {error}</p>}
      {sheets.length > 0 && <p>Found {sheets.length} sheets</p>}
    </div>
  );
};
```

## Integration with Backend

The frontend Excel domain communicates with the backend through Tauri's invoke API:

```typescript
// Upload file and get sheet names
const sheets = await invoke<string[]>('upload_excel_file', { filePath });

// Parse specific sheet
const data = await invoke<NetworkConfigRow[]>('parse_excel_sheet', { 
  filePath, 
  sheetName,
  enhancedConversionMap 
});
```

## Error Handling

The Excel domain provides comprehensive error handling:

- **File Selection Errors**: Invalid file types, file not found
- **Upload Errors**: Network issues, backend errors
- **Parsing Errors**: Invalid Excel format, corrupted data
- **Validation Errors**: Missing required data, invalid formats

All errors are displayed to users through appropriate UI feedback.

## Styling

Components use CSS Modules for styling:

- **FileUpload.module.css**: Styles for file upload component
- **SheetSelector.module.css**: Styles for sheet selector component

## Testing

The Excel domain includes comprehensive tests:

- **Component Tests**: React Testing Library tests for UI components
- **Service Tests**: Unit tests for service methods
- **Integration Tests**: End-to-end workflow tests
- **Hook Tests**: Tests for custom React hooks

### Running Tests

```bash
# Run all Excel domain tests
npm test excel

# Run specific test file
npm test FileUpload.test.tsx

# Run with coverage
npm test excel -- --coverage
```

## Usage Examples

### Complete Excel Processing Workflow

```typescript
import { FileUpload, SheetSelector, useFileUpload } from '../../domains/excel';
import { ExcelProcessingService } from '../../domains/excel';

const ExcelProcessor = () => {
  const { sheets, uploadFile } = useFileUpload();
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [data, setData] = useState<NetworkConfigRow[]>([]);

  const handleSheetsLoaded = async (loadedSheets: string[], filePath: string) => {
    // Sheets are automatically set by useFileUpload
    console.log('Sheets loaded:', loadedSheets);
  };

  const handleSheetSelect = async (sheetName: string) => {
    setSelectedSheet(sheetName);
    try {
      const parsedData = await ExcelProcessingService.parseSheet(filePath, sheetName);
      setData(parsedData);
    } catch (error) {
      console.error('Failed to parse sheet:', error);
    }
  };

  return (
    <div>
      <FileUpload onSheetsLoaded={handleSheetsLoaded} />
      
      {sheets.length > 0 && (
        <SheetSelector
          sheets={sheets}
          selectedSheet={selectedSheet}
          onSheetSelect={handleSheetSelect}
        />
      )}
      
      {data.length > 0 && (
        <div>
          <h3>Parsed Data ({data.length} rows)</h3>
          {/* Display data */}
        </div>
      )}
    </div>
  );
};
```

## Best Practices

1. **Error Handling**: Always handle errors gracefully and provide user feedback
2. **Loading States**: Show loading indicators during file operations
3. **Validation**: Validate file types and data before processing
4. **Cleanup**: Clean up temporary files after processing
5. **Performance**: Use React.memo and useMemo for expensive operations
6. **Accessibility**: Ensure components are accessible to all users

## Dependencies

- **@tauri-apps/api**: Tauri APIs for file operations
- **React**: UI framework
- **TypeScript**: Type safety and development experience

## Future Enhancements

- **Drag and Drop**: Support for drag-and-drop file upload
- **Preview**: Data preview before full processing
- **Progress Indicators**: Detailed progress for large files
- **Batch Processing**: Support for multiple file processing
- **Export**: Export processed data to various formats