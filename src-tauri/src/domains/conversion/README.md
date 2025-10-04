# Conversion Domain - Backend

The backend conversion domain provides robust data transformation and mapping services for the Apstra Network Configuration Tool.

## Overview

This domain handles:

- **Enhanced Conversion Maps**: Advanced field mapping with multiple matching strategies
- **Transformation Engine**: Flexible data transformation pipeline system
- **Field Validation**: Comprehensive data validation with custom rules
- **API Integration**: Extract and transform data from various API responses

## Architecture

### Services

#### EnhancedConversionService

Main service providing conversion functionality:

```rust
pub struct EnhancedConversionService {
    transformation_engine: TransformationEngine,
}
```

**Key Methods:**
- `load_default_enhanced_conversion_map()` - Load built-in conversion map
- `load_enhanced_conversion_map_from_file()` - Load from custom file
- `convert_headers_with_enhanced_map()` - Convert Excel headers to field names
- `apply_field_transformations()` - Transform data using rules
- `validate_field_values()` - Validate data against field definitions
- `extract_api_data()` - Extract data from API responses using JSONPath

#### TransformationEngine

Handles data transformation rules and custom functions:

```rust
pub struct TransformationEngine {
    functions: HashMap<String, TransformationFunction>,
}
```

**Built-in Transformations:**
- `generate_interface_name` - Create network interface names
- `normalize_speed` - Standardize speed values (25GB → 25G)
- `lag_mode_conversion` - Convert boolean/text to LAG modes
- `trim_whitespace` - Remove extra whitespace
- `to_uppercase/to_lowercase` - Case conversion

### Commands

Tauri commands for frontend integration:

- `load_enhanced_conversion_map` - Load conversion maps
- `save_enhanced_conversion_map` - Save conversion maps
- `convert_headers_enhanced` - Convert Excel headers
- `apply_field_transformations` - Apply transformation rules
- `validate_field_values` - Validate field data
- `create_default_field_definition` - Create new field definitions

### Models

Key data structures (defined in `src/models/enhanced_conversion_map.rs`):

- `EnhancedConversionMap` - Complete conversion configuration
- `FieldDefinition` - Individual field configuration
- `TransformationRule` - Data transformation rules
- `ValidationRules` - Field validation configuration

## Mapping Strategies

### Excel Header Matching

1. **Exact Match**
   ```rust
   XlsxMapping {
       pattern: "Server Name".to_string(),
       mapping_type: MappingType::Exact,
       case_sensitive: false,
       priority: 100,
   }
   ```

2. **Partial Match**
   ```rust
   XlsxMapping {
       pattern: "Server".to_string(),
       mapping_type: MappingType::Partial,
       case_sensitive: false,
       priority: 80,
   }
   ```

3. **Regex Match**
   ```rust
   XlsxMapping {
       pattern: r"Server\s*Name".to_string(),
       mapping_type: MappingType::Regex,
       case_sensitive: false,
       priority: 90,
   }
   ```

4. **Fuzzy Match**
   ```rust
   XlsxMapping {
       pattern: "Server Name".to_string(),
       mapping_type: MappingType::Fuzzy,
       case_sensitive: false,
       priority: 60,
   }
   ```

### Whitespace Normalization

The system automatically normalizes whitespace in Excel headers:
- Converts `\r\n`, `\n`, `\t` to single spaces
- Trims leading/trailing whitespace
- Collapses multiple spaces to single space

This ensures consistent matching regardless of Excel formatting.

## Transformation System

### Transformation Types

1. **Value Mapping**
   ```rust
   TransformationLogic::ValueMap {
       mappings: {
           "25GB" => "25G",
           "10GB" => "10G",
       }
   }
   ```

2. **Template-based**
   ```rust
   TransformationLogic::Template {
       template: "et-0/0/{input}"
   }
   ```

3. **Function-based**
   ```rust
   TransformationLogic::Function {
       name: "generate_interface_name"
   }
   ```

4. **Pipeline**
   ```rust
   TransformationLogic::Pipeline {
       steps: vec![
           TransformationStep {
               step_type: "function",
               parameters: {"name": "normalize_speed"}
           },
           TransformationStep {
               step_type: "template", 
               parameters: {"template": "{input} normalized"}
           }
       ]
   }
   ```

### Custom Transformations

Add custom transformation functions:

```rust
let mut engine = TransformationEngine::new();
engine.register_custom_function(
    "my_transform".to_string(),
    |input: &str, context: Option<&HashMap<String, String>>| {
        Ok(format!("transformed_{}", input))
    }
);
```

### Conditional Transformations

Apply transformations only when conditions are met:

```rust
TransformationRule {
    conditions: Some({
        "input_type": "numeric_port",
        "has_speed_data": true,
        "min_length": 1
    }),
    logic: TransformationLogic::Function {
        name: "generate_interface_name"
    }
}
```

## Validation System

### Field Validation Rules

```rust
ValidationRules {
    min_length: Some(1),
    max_length: Some(50),
    pattern: Some(r"^[a-zA-Z0-9_-]+$"),
    allowed_values: Some(vec!["active", "inactive"]),
    numeric_range: Some(NumericRange {
        min: Some(1.0),
        max: Some(100.0)
    })
}
```

### Validation Results

```rust
ValidationResult {
    is_valid: bool,
    errors: Vec<ValidationError>,
    warnings: Vec<ValidationError>,
    field_summary: HashMap<String, FieldValidationSummary>
}
```

## API Data Extraction

Extract data from JSON API responses using JSONPath-like syntax:

```rust
ApiMapping {
    primary_path: "$.data.systems[0].hostname",
    fallback_paths: vec![
        "$.systems[0].name",
        "$.hostname"
    ]
}
```

**Supported Path Features:**
- Dot notation: `data.field`
- Array access: `data.items[0]`
- Array iteration: `data.items[*]`
- Optional paths: `data.field?`

## Performance Optimizations

### Caching Strategy

- Conversion maps are loaded once and cached
- Regex patterns are compiled and cached
- Transformation functions are pre-registered

### Batch Processing

Process multiple items efficiently:

```rust
// Process multiple headers at once
let result = service.convert_headers_with_enhanced_map(&headers, &map)?;

// Apply transformations to multiple fields
let transformed = service.apply_field_transformations(&field_data, &map)?;
```

### Memory Management

- Use `Arc<>` for shared conversion maps
- Lazy load field definitions
- Stream large datasets when possible

## Error Handling

### Error Types

```rust
#[derive(Debug, thiserror::Error)]
pub enum ConversionError {
    #[error("Field not found: {field}")]
    FieldNotFound { field: String },
    
    #[error("Transformation failed: {message}")]
    TransformationFailed { message: String },
    
    #[error("Validation error: {message}")]
    ValidationError { message: String },
}
```

### Error Recovery

- Graceful degradation for missing mappings
- Continue processing on non-critical errors
- Detailed error reporting with context

## Testing

### Unit Tests

Test individual components:

```rust
#[test]
fn test_speed_normalization() {
    assert_eq!(
        TransformationEngine::normalize_speed_value("25GB"),
        "25G"
    );
}
```

### Integration Tests

Test complete workflows:

```rust
#[tokio::test]
async fn test_excel_header_conversion() {
    let service = EnhancedConversionService::new();
    let map = service.load_default_enhanced_conversion_map()?;
    
    let result = service.convert_headers_with_enhanced_map(
        &["Server Name", "Port Number"],
        &map
    )?;
    
    assert_eq!(result.converted_headers.len(), 2);
}
```

### Performance Tests

Benchmark critical operations:

```rust
#[test]
fn benchmark_header_conversion() {
    let start = Instant::now();
    // ... conversion logic
    let duration = start.elapsed();
    assert!(duration < Duration::from_millis(100));
}
```

## Configuration

### Default Conversion Map

Located at `data/default_enhanced_conversion_map.json`:

```json
{
  "version": "1.0.0",
  "header_row": 2,
  "field_definitions": {
    "server_label": {
      "display_name": "Server Name",
      "data_type": "String",
      "is_required": true,
      "xlsx_mappings": [
        {
          "pattern": "Server Name",
          "mapping_type": "Exact",
          "priority": 100,
          "case_sensitive": false
        }
      ]
    }
  }
}
```

### Custom Maps

Create custom conversion maps for specific use cases:

1. Export default map as template
2. Modify field definitions and mappings
3. Load custom map in application

## Debugging

### Enable Debug Logging

```rust
env_logger::init();
log::set_max_level(log::LevelFilter::Debug);
```

### Trace Transformations

```rust
log::debug!(
    "Applying transformation '{}' to field '{}' with value '{}'",
    transformation_name, field_name, value
);
```

### Validation Debugging

```rust
log::debug!(
    "Evaluating conditions for input '{}' with conditions: {:?}",
    input, conditions
);
```

## Migration from Legacy System

### Simple to Enhanced Conversion

```rust
let enhanced_map = service.migrate_simple_to_enhanced_map(
    &simple_mappings,
    Some(2) // header row
)?;
```

### Backward Compatibility

The system maintains compatibility with legacy conversion maps while providing enhanced features for new implementations.

## Best Practices

1. **Field Naming**: Use consistent, descriptive field names
2. **Mapping Priority**: Set appropriate priorities for mapping rules
3. **Error Handling**: Always handle conversion errors gracefully
4. **Performance**: Cache conversion maps and avoid repeated loading
5. **Testing**: Test with real Excel files and edge cases
6. **Documentation**: Document custom transformation rules clearly

## Troubleshooting

### Common Issues

1. **Headers Not Matching**
   - Check whitespace normalization
   - Verify case sensitivity settings
   - Test with regex patterns

2. **Transformation Failures**
   - Validate input data format
   - Check transformation rule conditions
   - Review function implementations

3. **Performance Issues**
   - Reduce fuzzy matching usage
   - Optimize regex patterns
   - Use batch processing

### Debug Commands

```bash
# Run with debug logging
RUST_LOG=debug cargo test

# Test specific conversion
cargo test test_header_conversion -- --nocapture

# Benchmark performance
cargo test benchmark_ --release
```