# Enhanced Conversion Map System

**Single Source of Truth** for the Enhanced Conversion Map architecture, implementation, and usage patterns.

## Overview

The Enhanced Conversion Map system provides a comprehensive, configurable mapping and transformation engine for Excel-to-internal field conversion. It replaces simple header mapping with a robust system supporting field definitions, transformations, validation, and API data extraction.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                Enhanced Conversion Map                      │
├─────────────────────────────────────────────────────────────┤
│  JSON Configuration                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Field           │  │ Transformation  │  │ UI Config   │ │
│  │ Definitions     │  │ Rules           │  │ Metadata    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Rust Backend Services                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Enhanced        │  │ Transformation  │  │ Enhanced    │ │
│  │ Conversion      │  │ Engine          │  │ Conversion  │ │
│  │ Service         │  │                 │  │ Handler     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Integration Points                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Excel Parser    │  │ API Extraction  │  │ Table       │ │
│  │ Integration     │  │ Service         │  │ Generation  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Core Files

- **Configuration**: `data/default_enhanced_conversion_map.json`
- **Query Templates**: `data/queries/` directory with individual `.gql` files
- **Models**: `src-tauri/src/models/enhanced_conversion_map.rs`
- **Service**: `src-tauri/src/services/enhanced_conversion_service.rs`
- **Transformation Engine**: `src-tauri/src/services/transformation_engine.rs`
- **Commands**: `src-tauri/src/commands/enhanced_conversion_handler.rs`

## JSON Configuration Specification

### Root Structure

```json
{
  "version": "1.0.0",
  "header_row": 2,
  "created_at": "2024-01-15T00:00:00Z",
  "updated_at": "2024-01-15T00:00:00Z",
  "field_definitions": { /* Field definitions */ },
  "transformation_rules": { /* Transformation rules */ }
}
```

### Field Definition Structure

```json
"field_name": {
  "display_name": "Display\\nName",
  "description": "Human-readable description",
  "data_type": "string|boolean|number",
  "is_required": true|false,
  "is_key_field": true|false,
  "xlsx_mappings": [
    {
      "pattern": "Excel Header Pattern",
      "mapping_type": "exact|partial|regex|fuzzy",
      "priority": 100,
      "case_sensitive": false
    }
  ],
  "api_mappings": [
    {
      "primary_path": "$.json.path",
      "fallback_paths": ["$.fallback.path"],
      "transformation": "transformation_name"
    }
  ],
  "validation_rules": {
    "min_length": 1,
    "max_length": 255,
    "pattern": "regex_pattern",
    "allowed_values": ["value1", "value2"]
  },
  "ui_config": {
    "column_width": 120,
    "sortable": true,
    "filterable": true,
    "hidden": false
  },
  "transformations": ["transformation_name"]
}
```

### Transformation Rule Structure

**CRITICAL**: Uses tagged enum format to prevent deserialization issues.

```json
"transformation_name": {
  "name": "Human Readable Name",
  "description": "What this transformation does",
  "rule_type": "dynamic",
  "conditions": {
    "input_type": "numeric_port",
    "has_speed_data": true
  },
  "logic": {
    "type": "function|template|value_map|pipeline",
    "name": "function_name"            // For function type
    "template": "template_string"      // For template type
    "mappings": { "from": "to" }       // For value_map type
    "steps": [ /* pipeline steps */ ] // For pipeline type
  },
  "priority": 100
}
```

## Implementation Details

### Critical Design Patterns

#### 1. Tagged Enum Serialization

**CRITICAL**: The `TransformationLogic` enum uses tagged serialization to prevent ambiguous deserialization:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TransformationLogic {
    #[serde(rename = "function")]
    Function { name: String },
    #[serde(rename = "template")]
    Template { template: String },
    #[serde(rename = "value_map")]
    ValueMap { mappings: HashMap<String, String> },
    #[serde(rename = "pipeline")]
    Pipeline { steps: Vec<TransformationStep> },
}
```

**JSON Format**:
```json
"logic": {
  "type": "function",
  "name": "normalize_speed"
}
```

**❌ NEVER use untagged format** - causes deserialization conflicts.

#### 2. Two-Phase Field Mapping

**Phase 1 - Exact Match Priority**: Process ALL headers for exact matches first
**Phase 2 - Partial Match Fallback**: Only process unmapped headers with partial matching

```rust
fn find_best_field_match(&self, excel_header: &str, enhanced_map: &EnhancedConversionMap) -> Option<(String, f64)> {
    // Priority: exact(1.0) > regex(0.9) > partial(0.8) > fuzzy(calculated)
}
```

#### 3. Transformation Application Pipeline

```rust
pub fn apply_field_transformations(
    &self,
    field_data: &HashMap<String, String>,
    enhanced_map: &EnhancedConversionMap,
) -> Result<HashMap<String, String>, String>
```

**Process Flow**:
1. For each field in field_data
2. Check if field definition exists in enhanced_map
3. Apply each transformation in sequence
4. Log transformation results for debugging
5. Return transformed field data

### Built-in Transformation Functions

#### Speed Normalization

**Function**: `normalize_speed`
**Purpose**: Convert various speed formats to standardized format
**Examples**:
- "25GB" → "25G"
- "100GB" → "100G"  
- "25 Gbps" → "25G"
- "10G" → "10G" (unchanged)
- "1000M" → "1000M" (unchanged)

**Implementation**: `TransformationEngine::normalize_speed_value()`

#### Interface Name Generation

**Function**: `generate_interface_name`
**Purpose**: Generate interface names based on port and speed
**Conditions**: 
- `input_type`: "numeric_port"
- `has_speed_data`: true

**Examples**:
- Port "2" + Speed "25G" → "et-0/0/2"
- Port "5" + Speed "10G" → "xe-0/0/5"
- Port "1" + Speed "1G" → "ge-0/0/1"

**Speed-to-Prefix Mapping**:
- `> 10G` → "et-" (25G, 40G, 100G)
- `= 10G` → "xe-" (10 Gigabit)
- `< 10G` → "ge-" (1G, etc.)

#### Built-in Utility Functions

- **trim_whitespace**: Remove extra whitespace
- **to_uppercase**: Convert to uppercase
- **to_lowercase**: Convert to lowercase

## Integration Points

### Excel Parser Integration

**Location**: `src-tauri/src/commands/data_parser.rs:134`

```rust
// Apply field transformations
match service.apply_field_transformations(&field_data, enhanced_conversion_map) {
    Ok(transformed_data) => {
        // Convert to NetworkConfigRow using enhanced conversion results
        if let Some(network_row) = convert_enhanced_to_network_config_row(&transformed_data) {
            rows.push(network_row);
        }
    }
}
```

### Frontend Table Generation

**Location**: `src/components/ProvisioningTable/ProvisioningTable.tsx`

```typescript
const columns: TableColumn[] = useMemo(() => {
  if (conversionMap) {
    return fieldOrder.map(fieldKey => {
      const fieldDef = conversionMap.field_definitions[fieldKey];
      if (fieldDef && !fieldDef.ui_config.hidden) {
        return {
          key: fieldKey,
          header: fieldDef.display_name,      // From conversion map!
          width: `${fieldDef.ui_config.column_width}px`,
          sortable: fieldDef.ui_config.sortable
        };
      }
    }).filter(col => col !== null);
  }
}, [conversionMap]);
```

## Default Configuration

### Standard Field Mappings

**Core Network Fields**:
- `server_label`: Server/Host Name
- `switch_label`: Switch Name  
- `switch_ifname`: Switch Interface/Port
- `server_ifname`: Server Interface/Slot-Port
- `link_speed`: Speed/Link Speed (with normalize_speed transformation)

**Advanced Network Fields**:
- `link_group_lag_mode`: LAG Mode (lacp, static, none)
- `link_group_ct_names`: Connectivity Templates/CTs
- `link_group_ifname`: AE Interface/Bond Name
- `is_external`: External flag (boolean conversion)

**Metadata Fields**:
- `server_tags`, `switch_tags`, `link_tags`: Tag fields
- `comment`: Comments/Notes

### Standard Transformations

```json
"transformation_rules": {
  "normalize_speed": {
    "logic": { "type": "function", "name": "normalize_speed" }
  },
  "generate_interface_name": {
    "conditions": { "input_type": "numeric_port", "has_speed_data": true },
    "logic": { "type": "function", "name": "generate_interface_name" }
  },
  "boolean_conversion": {
    "logic": { 
      "type": "value_map",
      "mappings": { "yes": "true", "no": "false", "1": "true", "0": "false" }
    }
  }
}
```

## Usage Patterns

### Loading Conversion Maps

```rust
// Load default embedded map
let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()?;

// Load custom map from file  
let enhanced_map = EnhancedConversionService::load_enhanced_conversion_map_from_file(file_path)?;
```

### Applying Transformations

```rust
let service = EnhancedConversionService::new();
let transformed_data = service.apply_field_transformations(&field_data, &enhanced_map)?;
```

### Frontend Integration

```typescript
// Load conversion map for table columns
const conversionMap = await invoke<EnhancedConversionMap>('load_enhanced_conversion_map', { 
  filePath: undefined  // Use default map
});

// Apply transformations during data processing
const transformedData = await invoke('apply_field_transformations', {
  fieldData: rawFieldData,
  enhancedMap: conversionMap
});
```

## Testing Strategy

### Unit Tests

**Location**: `src-tauri/tests/speed_transformation_test.rs`

```rust
#[test]
fn test_link_speed_transformation_from_enhanced_conversion() {
    // Test all speed format conversions
    let test_cases = vec![
        ("25GB", "25G"), ("100GB", "100G"), ("25 Gbps", "25G"),
        ("10G", "10G"), ("1000M", "1000M"), ("", "")
    ];
    // Verify each transformation works correctly
}

#[test]
fn test_end_to_end_speed_transformation() {
    // Test complete Excel header -> field mapping -> transformation flow
}
```

### Integration Tests

**Location**: `src-tauri/tests/enhanced_conversion_command_test.rs`

- Default map loading validation
- Field definition structure verification
- Parameter validation for Tauri commands
- Regression prevention for frontend-backend parameter mismatches

## Troubleshooting

### Common Issues

#### 1. Transformation Not Applied

**Symptoms**: Values like "25GB" not converting to "25G"
**Root Cause**: JSON deserialization issue or missing transformation rule
**Solution**: 
- Verify JSON uses tagged format: `{"type": "function", "name": "normalize_speed"}`
- Check transformation rule exists in `transformation_rules` section
- Verify field has `"transformations": ["normalize_speed"]` array

#### 2. Field Not Mapped

**Symptoms**: Excel header not mapping to internal field
**Root Cause**: Missing or incorrect xlsx_mappings
**Solution**:
- Add xlsx_mapping with appropriate pattern and mapping_type
- Check priority conflicts (higher priority = processed first)
- Verify case_sensitive setting matches Excel header format

#### 3. Table Columns Not Generated

**Symptoms**: Frontend table shows hard-coded headers instead of conversion map headers
**Root Cause**: Conversion map not loaded or UI not using dynamic columns
**Solution**:
- Verify `load_enhanced_conversion_map` command succeeds
- Check `conversionMap` state in React component
- Ensure `useMemo` dependency array includes `[conversionMap]`

### Debug Logging

```rust
// Enable debug logging
RUST_LOG=debug cargo test -- --nocapture

// Check transformation application
log::debug!("Applying transformation '{}' to field '{}' with value '{}'", 
           transformation_name, field_name, transformed_value);
```

## Migration Guide

### From Simple Conversion Map

```rust
// Migrate existing simple mappings to enhanced format
let enhanced_map = service.migrate_simple_to_enhanced_map(&simple_mappings, header_row)?;
```

### Breaking Changes

**v1.0.0**: Introduction of tagged enum format
- **Required**: Update all transformation rules to use `{"type": "function", "name": "function_name"}` format
- **Impact**: Existing untagged JSON configurations will fail to deserialize
- **Migration**: Use migration service or manually update JSON structure

## Performance Considerations

### Optimization Strategies

- **Caching**: Transformation engines cached per service instance
- **Lazy Loading**: Field definitions loaded on-demand
- **Batch Processing**: Multiple field transformations processed together
- **Memory Management**: HashMap-based lookups for O(1) field access

### Scalability Limits

- **Field Definitions**: ~100 fields recommended maximum
- **Transformation Rules**: ~50 rules recommended maximum  
- **Excel Headers**: ~200 headers tested successfully
- **Memory Usage**: ~5MB per loaded conversion map

## Security Considerations

### Input Validation

- All field values validated against `validation_rules`
- Regex patterns validated during deserialization
- File path validation for custom conversion maps
- Template injection prevention in transformation templates

### Safe Defaults

- Unknown fields ignored rather than throwing errors
- Failed transformations return original values
- Missing transformation rules logged but don't halt processing
- Conservative regex timeouts prevent ReDoS attacks

---

**Reference**: This document serves as the single source of truth for Enhanced Conversion Map system. Other documentation should link to this file rather than duplicating information.