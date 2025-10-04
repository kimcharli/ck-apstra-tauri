# Conversion Domain

The Conversion domain handles data transformation and mapping between different data formats, particularly Excel headers to internal field names and data transformation rules.

## Overview

This domain provides comprehensive data conversion capabilities including:

- **Header Mapping**: Convert Excel column headers to internal field names
- **Data Transformation**: Apply transformation rules to normalize and clean data
- **Field Validation**: Validate data according to field-specific rules
- **Enhanced Conversion Maps**: Advanced mapping system with fuzzy matching, regex patterns, and transformation pipelines

## Architecture

### Frontend Components

- **ConversionMapManager**: Basic conversion map management interface
- **EnhancedConversionMapManager**: Advanced conversion map management with tabbed interface
- **EnhancedConversionTableEditor**: Table-based editor for field definitions and mappings

### Frontend Services

- **EnhancedConversionService**: Main service for interacting with the enhanced conversion system
  - Load/save conversion maps
  - Convert headers using enhanced mappings
  - Apply field transformations
  - Validate field values

### Frontend Hooks

- **useEnhancedConversion**: React hook for managing enhanced conversion state
  - Auto-loading conversion maps
  - Field operations (add, update, remove)
  - Data transformation and validation
  - Error handling and loading states

### Frontend Types

- **ConversionMap**: Basic conversion map interface
- **EnhancedConversionMap**: Advanced conversion map with field definitions and transformation rules
- **FieldDefinition**: Detailed field configuration including mappings, validation, and UI settings
- **HeaderMapping**: Simple header-to-field mapping

## Key Features

### Header Mapping Types

1. **Exact Match**: Direct string comparison (case-sensitive or insensitive)
2. **Partial Match**: Substring matching for flexible header recognition
3. **Regex Match**: Pattern-based matching for complex header formats
4. **Fuzzy Match**: Similarity-based matching using Levenshtein distance

### Data Transformations

- **Interface Name Generation**: Create network interface names based on speed and port
- **Speed Normalization**: Convert various speed formats to standardized values
- **LAG Mode Conversion**: Transform boolean/text values to LAG mode enums
- **String Operations**: Trim, case conversion, and other text transformations

### Field Validation

- **Required Fields**: Ensure critical fields are not empty
- **Length Validation**: Min/max length constraints
- **Pattern Validation**: Regex-based format validation
- **Value Lists**: Restrict values to predefined sets
- **Numeric Ranges**: Validate numeric values within bounds

## Usage Examples

### Frontend Hook Usage

```typescript
import { useEnhancedConversion } from '@/domains/conversion';

const MyComponent = () => {
  const {
    state,
    loadMap,
    addField,
    convertHeaders,
    validateData
  } = useEnhancedConversion({
    autoLoad: true,
    onSuccess: (map) => console.log('Map loaded:', map)
  });

  // Convert Excel headers
  const handleHeaderConversion = async (headers: string[]) => {
    const result = await convertHeaders(headers);
    console.log('Converted headers:', result);
  };

  // Add a new field definition
  const handleAddField = async () => {
    const fieldDef = {
      display_name: 'Server Name',
      description: 'Network server identifier',
      data_type: 'String',
      is_required: true,
      // ... other properties
    };
    
    await addField('server_label', fieldDef);
  };
};
```

### Service Usage

```typescript
import { EnhancedConversionService } from '@/domains/conversion';

// Load conversion map
const map = await EnhancedConversionService.loadEnhancedConversionMap();

// Convert headers
const result = await EnhancedConversionService.convertHeadersEnhanced(
  ['Server Name', 'Port Number'],
  map
);

// Apply transformations
const transformedData = await EnhancedConversionService.applyFieldTransformations(
  { server_port: '5' },
  map
);
```

## Configuration

### Field Definition Structure

```typescript
interface FieldDefinition {
  display_name: string;           // Human-readable field name
  description: string;            // Field description
  data_type: DataType;           // String, Number, Boolean, etc.
  is_required: boolean;          // Whether field is mandatory
  is_key_field: boolean;         // Whether field is a key identifier
  xlsx_mappings: XlsxMapping[];  // Excel header mappings
  api_mappings: ApiMapping[];    // API data path mappings
  validation_rules: ValidationRules; // Field validation configuration
  ui_config: UiConfig;           // UI display settings
}
```

### Transformation Rules

```typescript
interface TransformationRule {
  name: string;                  // Rule identifier
  description: string;           // Rule description
  rule_type: TransformationType; // Static, Dynamic, Conditional
  conditions?: object;           // When to apply the rule
  logic: TransformationLogic;    // How to transform the data
  priority: number;              // Rule execution order
}
```

## Best Practices

### Field Mapping

1. **Use Multiple Mappings**: Define multiple Excel header patterns for the same field to handle variations
2. **Prioritize Exact Matches**: Use exact matches for known headers, fuzzy matches for flexibility
3. **Case Insensitive**: Most Excel headers should use case-insensitive matching
4. **Whitespace Normalization**: The system automatically normalizes whitespace in headers

### Data Transformation

1. **Chain Transformations**: Use transformation pipelines for complex data processing
2. **Conditional Logic**: Apply transformations only when specific conditions are met
3. **Context Awareness**: Use field context for transformations that depend on other field values
4. **Error Handling**: Always handle transformation errors gracefully

### Validation

1. **Progressive Validation**: Start with basic validation, add complexity as needed
2. **User-Friendly Messages**: Provide clear error messages for validation failures
3. **Warning vs Error**: Use warnings for non-critical issues, errors for blocking problems
4. **Field Dependencies**: Consider relationships between fields in validation rules

## Testing

The conversion domain includes comprehensive tests covering:

- Header mapping accuracy and performance
- Transformation rule execution
- Field validation logic
- Error handling and edge cases
- Integration with Excel processing

Run conversion-specific tests:

```bash
# Frontend tests
npm test -- --testPathPattern=conversion

# Backend tests
cargo test conversion
```

## Migration Guide

When migrating from the legacy conversion system:

1. **Export Existing Maps**: Use the migration utility to convert simple mappings
2. **Review Field Definitions**: Enhance basic mappings with validation and UI config
3. **Test Thoroughly**: Validate that all existing Excel files process correctly
4. **Update Components**: Replace old ConversionMapManager with EnhancedConversionMapManager

## Performance Considerations

- **Caching**: Conversion maps are cached in memory for performance
- **Batch Processing**: Process multiple headers/rows together when possible
- **Lazy Loading**: Field definitions are loaded on-demand
- **Fuzzy Matching**: Use sparingly as it's computationally expensive

## Troubleshooting

### Common Issues

1. **Headers Not Matching**: Check for whitespace, case sensitivity, and special characters
2. **Transformation Failures**: Verify transformation rules and input data format
3. **Validation Errors**: Review field requirements and data types
4. **Performance Issues**: Consider reducing fuzzy matching usage

### Debug Tools

- Enable debug logging for detailed transformation traces
- Use the table editor to inspect field mappings visually
- Test individual transformation rules in isolation
- Validate conversion maps before deployment