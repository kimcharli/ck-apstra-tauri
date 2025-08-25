# Temporary Requirements: Conversion Map Augmentation

## Overview

Enhanced conversion mapping system to provide comprehensive field management with internal variable names, translation rules, and API data field mapping for improved maintainability and flexibility.

## Current State Analysis

### Existing Conversion Map Structure
```json
{
    "header_row": 2,
    "mappings": {
        "Switch Name": "switch_label",
        "Port": "switch_ifname",
        "Host Name": "server_label",
        "Slot/Port": "server_ifname"
    }
}
```

### Current Flow
```
XLSX Header → Internal Field Name → Provisioning Table Header → API Field Path
"Switch Name" → "switch_label" → "Switch\nName" → item.switch?.label
```

## Proposed Enhanced Structure

### New Conversion Map Schema
```json
{
    "header_row": 2,
    "field_definitions": {
        "switch_label": {
            "internal_name": "switch_label",
            "display_name": "Switch\nName",
            "description": "Network switch identifier",
            "xlsx_mappings": [
                {
                    "pattern": "Switch Name",
                    "type": "exact",
                    "priority": 1
                },
                {
                    "pattern": "Switch",
                    "type": "partial",
                    "priority": 2
                },
                {
                    "pattern": "switch.*name",
                    "type": "regex",
                    "priority": 3
                }
            ],
            "api_mapping": {
                "primary": "switch?.label",
                "fallback": "switch?.hostname",
                "validation": "required"
            },
            "data_type": "string",
            "validation_rules": {
                "min_length": 1,
                "max_length": 50,
                "pattern": "^[A-Za-z0-9_-]+$"
            }
        },
        "switch_ifname": {
            "internal_name": "switch_ifname",
            "display_name": "Switch\nInterface",
            "description": "Switch port/interface identifier",
            "xlsx_mappings": [
                {
                    "pattern": "Port",
                    "type": "exact",
                    "priority": 1,
                    "transform": "interface_name_generation"
                },
                {
                    "pattern": "Switch Interface",
                    "type": "exact",
                    "priority": 1
                },
                {
                    "pattern": "Interface",
                    "type": "partial",
                    "priority": 2
                }
            ],
            "api_mapping": {
                "primary": "switch_intf?.if_name",
                "fallback": "intf1?.if_name",
                "validation": "required"
            },
            "data_type": "string",
            "transformations": [
                {
                    "name": "interface_name_generation",
                    "description": "Generate interface names based on speed and port number",
                    "conditions": {
                        "input_type": "numeric_port",
                        "has_speed_data": true
                    },
                    "logic": "speed_based_interface_naming"
                }
            ]
        }
    },
    "transformation_rules": {
        "speed_based_interface_naming": {
            "description": "Generate et-/xe-/ge- interface names based on link speed",
            "logic": {
                ">10G": "et-0/0/{port}",
                "=10G": "xe-0/0/{port}",
                "<10G": "ge-0/0/{port}"
            }
        },
        "speed_normalization": {
            "description": "Normalize speed formats for consistent comparison",
            "patterns": {
                "GB|gb|Gbps|gbps": "G",
                "MB|mb|Mbps|mbps": "M",
                "numeric_only": "G"
            }
        }
    }
}
```

## Enhanced System Components

### 1. Field Definition Registry

**Purpose**: Centralized field metadata management

**Structure**:
```typescript
interface FieldDefinition {
    internal_name: string;
    display_name: string;
    description: string;
    xlsx_mappings: XlsxMapping[];
    api_mapping: ApiMapping;
    data_type: 'string' | 'number' | 'boolean' | 'array';
    validation_rules?: ValidationRules;
    transformations?: Transformation[];
}

interface XlsxMapping {
    pattern: string;
    type: 'exact' | 'partial' | 'regex';
    priority: number;
    transform?: string; // Reference to transformation rule
}

interface ApiMapping {
    primary: string; // JSONPath-like accessor
    fallback?: string;
    validation: 'required' | 'optional';
}
```

### 2. Translation Rule Engine

**Purpose**: Handle complex field transformations

**Capabilities**:
- Conditional transformations based on data context
- Speed-based interface name generation
- Data normalization and validation
- Custom transformation logic

### 3. Enhanced Conversion Service

**Backend Changes** (`src-tauri/src/services/conversion_service.rs`):
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct EnhancedConversionMap {
    pub header_row: usize,
    pub field_definitions: HashMap<String, FieldDefinition>,
    pub transformation_rules: HashMap<String, TransformationRule>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FieldDefinition {
    pub internal_name: String,
    pub display_name: String,
    pub description: String,
    pub xlsx_mappings: Vec<XlsxMapping>,
    pub api_mapping: ApiMapping,
    pub data_type: String,
    pub validation_rules: Option<ValidationRules>,
    pub transformations: Option<Vec<String>>,
}
```

### 4. Dynamic Table Header Generation

**Frontend Changes**:
```typescript
// Generate table columns from field definitions
const generateTableColumns = (fieldDefinitions: FieldDefinition[]) => {
    return fieldDefinitions.map(field => ({
        key: field.internal_name,
        header: field.display_name,
        width: calculateOptimalWidth(field),
        sortable: field.data_type !== 'array',
        description: field.description
    }));
};
```

## Implementation Requirements

### Phase 1: Enhanced Data Structure (2-3 days)

#### Backend Requirements
- [ ] **Enhanced ConversionMap struct** with field definitions
- [ ] **Field validation engine** with type checking and rules
- [ ] **Transformation rule processor** for complex data transformations
- [ ] **Backward compatibility** with existing simple mapping format
- [ ] **Migration utility** to convert existing maps to enhanced format

#### Frontend Requirements
- [ ] **Enhanced ConversionMapManager UI** with field definition editing
- [ ] **Translation rule editor** with visual rule builder
- [ ] **Field validation display** showing validation errors
- [ ] **Preview functionality** showing how fields will be processed

### Phase 2: Advanced Translation Rules (3-4 days)

#### Rule Engine Features
- [ ] **Conditional transformations** based on data context
- [ ] **Multi-field dependencies** (e.g., speed + port → interface name)
- [ ] **Data validation pipelines** with custom error messages
- [ ] **Transformation preview** showing before/after values

#### API Integration Enhancements
- [ ] **JSONPath-style API field mapping** for flexible data extraction
- [ ] **Fallback field resolution** when primary fields are missing
- [ ] **API data validation** against field definitions
- [ ] **Mapping confidence scoring** for match quality assessment

### Phase 3: Dynamic UI Generation (2-3 days)

#### Table Enhancements
- [ ] **Dynamic column generation** from field definitions
- [ ] **Context-aware tooltips** showing field descriptions
- [ ] **Validation indicators** in table cells
- [ ] **Transformation status** showing applied rules

#### Management Interface
- [ ] **Field definition CRUD operations** with live preview
- [ ] **Bulk import/export** of field definitions
- [ ] **Template system** for common field sets
- [ ] **Version control** for conversion map changes

## Data Flow Architecture

### Enhanced Processing Pipeline
```
1. XLSX Upload
   ↓
2. Field Definition Loading
   ↓
3. Multi-Pattern Header Matching
   ├── Exact matches (priority 1)
   ├── Partial matches (priority 2)  
   └── Regex matches (priority 3)
   ↓
4. Transformation Rule Application
   ├── Conditional logic evaluation
   ├── Data type conversion
   └── Validation rule checking
   ↓
5. Internal Field Population
   ↓
6. API Data Mapping
   ├── Primary field extraction
   ├── Fallback field resolution
   └── Validation against field definitions
   ↓
7. Provisioning Table Display
   └── Dynamic column generation
```

### Configuration Management
```
Default Field Definitions → User Overrides → Project-Specific Rules → Runtime Application
```

## User Experience Improvements

### Conversion Map Manager Enhancements

#### Field Definition Editor
- **Visual field builder** with drag-and-drop interface
- **Live preview** showing how Excel headers will be matched
- **Validation feedback** with specific error messages
- **Template gallery** for common network equipment types

#### Translation Rule Builder  
- **Visual rule designer** with condition/action blocks
- **Test data input** for rule validation
- **Rule dependency visualization** showing field relationships
- **Performance impact analysis** for complex rules

### Error Handling and Feedback

#### Enhanced Validation Messages
```typescript
interface ValidationResult {
    field: string;
    status: 'valid' | 'warning' | 'error';
    message: string;
    suggestions?: string[];
    affected_rows?: number[];
}
```

#### Progressive Enhancement
- **Graceful fallback** to simple mapping when enhanced features fail
- **Partial processing** continues when some fields fail validation
- **Recovery suggestions** for common mapping issues

## Migration Strategy

### Backward Compatibility
- **Automatic detection** of simple vs. enhanced conversion map format
- **Silent upgrade** of simple maps to enhanced format
- **Export capability** back to simple format for compatibility

### Deployment Phases
1. **Enhanced backend services** with dual format support
2. **Opt-in enhanced UI** while maintaining existing interface
3. **Gradual migration** of default maps to enhanced format
4. **Full rollout** with legacy format deprecation notice

## Benefits and Outcomes

### Developer Benefits
- **Single source of truth** for field definitions across the application
- **Reduced code duplication** in field handling logic
- **Better maintainability** with centralized field management
- **Easier debugging** with comprehensive field validation

### User Benefits
- **More flexible Excel format support** with intelligent header matching
- **Better error messages** with specific guidance
- **Customizable field behavior** for different data sources
- **Consistent data validation** across all import sources

### System Benefits
- **Improved data quality** through comprehensive validation
- **Better API integration** with flexible field mapping
- **Enhanced troubleshooting** with detailed field processing logs
- **Future extensibility** for additional data sources

## Technical Considerations

### Performance Impact
- **Startup time**: Enhanced validation may add 100-200ms to initialization
- **Memory usage**: Field definitions add ~50KB per conversion map
- **Processing time**: Complex rules may add 10-50ms per Excel row

### Testing Requirements
- **Unit tests** for transformation rule engine
- **Integration tests** for end-to-end field processing
- **Performance tests** with large Excel files
- **Compatibility tests** with existing conversion maps

### Documentation Updates
- **User guide** for enhanced conversion map features
- **Developer documentation** for field definition API
- **Migration guide** for existing conversion maps
- **Troubleshooting guide** for common field mapping issues

## Success Criteria

### Functionality
- [ ] **100% backward compatibility** with existing conversion maps
- [ ] **Support for complex transformation rules** (interface naming, speed normalization)
- [ ] **Comprehensive field validation** with meaningful error messages
- [ ] **Dynamic UI generation** based on field definitions

### Performance
- [ ] **<5% performance degradation** on existing workflows
- [ ] **<1 second** conversion map loading time
- [ ] **<100ms additional processing** time per Excel row

### Usability
- [ ] **Reduced user errors** in field mapping configuration
- [ ] **Improved troubleshooting** with detailed field processing logs
- [ ] **Enhanced flexibility** for different Excel formats

---

**Document Status**: Draft for Review  
**Estimated Implementation Time**: 7-10 days  
**Priority**: Medium (Enhancement)  
**Dependencies**: Current conversion mapping system  