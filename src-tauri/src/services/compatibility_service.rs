use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::models::enhanced_conversion_map::{
    EnhancedConversionMap, FieldDefinition, XlsxMapping, MappingType, 
    DataType, ValidationRules, UiConfig, ApiMapping
};
use crate::services::conversion_service::ConversionMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompatibilityService;

impl CompatibilityService {
    pub fn new() -> Self {
        Self
    }

    /// Detects whether a JSON configuration is a simple or enhanced conversion map
    pub fn detect_map_format(json_content: &str) -> Result<MapFormat, String> {
        // Try to parse as enhanced map first
        if let Ok(_enhanced) = serde_json::from_str::<EnhancedConversionMap>(json_content) {
            return Ok(MapFormat::Enhanced);
        }

        // Try to parse as simple map
        if let Ok(_simple) = serde_json::from_str::<ConversionMap>(json_content) {
            return Ok(MapFormat::Simple);
        }

        // Check for common simple map patterns
        if json_content.contains("\"mappings\"") && !json_content.contains("\"field_definitions\"") {
            return Ok(MapFormat::Simple);
        }

        // Check for enhanced map patterns
        if json_content.contains("\"field_definitions\"") || json_content.contains("\"transformation_rules\"") {
            return Ok(MapFormat::Enhanced);
        }

        Err("Unable to detect conversion map format".to_string())
    }

    /// Automatically converts a simple conversion map to enhanced format
    pub fn upgrade_simple_to_enhanced(simple_map: &ConversionMap) -> Result<EnhancedConversionMap, String> {
        let mut field_definitions = HashMap::new();

        // Convert simple mappings to field definitions
        for (excel_header, internal_field) in &simple_map.mappings {
            let field_def = self::create_field_definition_from_mapping(excel_header, internal_field);
            field_definitions.insert(internal_field.clone(), field_def);
        }

        let enhanced_map = EnhancedConversionMap {
            version: "1.0.0".to_string(),
            header_row: simple_map.header_row,
            field_definitions,
            transformation_rules: HashMap::new(),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        };

        Ok(enhanced_map)
    }

    /// Creates a backward-compatible simple conversion map from enhanced format
    pub fn downgrade_enhanced_to_simple(enhanced_map: &EnhancedConversionMap) -> Result<ConversionMap, String> {
        let mut mappings = HashMap::new();

        // Extract primary Excel mappings from field definitions
        for (internal_field, field_def) in &enhanced_map.field_definitions {
            // Find the first exact match mapping as the primary mapping
            if let Some(primary_mapping) = field_def.xlsx_mappings
                .iter()
                .find(|m| matches!(m.mapping_type, MappingType::Exact)) {
                mappings.insert(primary_mapping.pattern.clone(), internal_field.clone());
            } else if let Some(first_mapping) = field_def.xlsx_mappings.first() {
                // Fallback to first available mapping
                mappings.insert(first_mapping.pattern.clone(), internal_field.clone());
            }
        }

        let simple_map = ConversionMap {
            header_row: enhanced_map.header_row,
            mappings,
        };

        Ok(simple_map)
    }

    /// Merges simple and enhanced conversion maps, with enhanced taking priority
    pub fn merge_maps(simple_map: &ConversionMap, enhanced_map: &EnhancedConversionMap) -> Result<EnhancedConversionMap, String> {
        let mut merged_map = enhanced_map.clone();

        // Add fields from simple map that don't exist in enhanced map
        for (excel_header, internal_field) in &simple_map.mappings {
            if !merged_map.field_definitions.contains_key(internal_field) {
                let field_def = self::create_field_definition_from_mapping(excel_header, internal_field);
                merged_map.field_definitions.insert(internal_field.clone(), field_def);
            }
        }

        // Update timestamp
        merged_map.updated_at = Some(chrono::Utc::now().to_rfc3339());

        Ok(merged_map)
    }

    /// Validates that an enhanced map maintains backward compatibility
    pub fn validate_backward_compatibility(enhanced_map: &EnhancedConversionMap, required_fields: &[&str]) -> Result<CompatibilityReport, String> {
        let mut report = CompatibilityReport {
            is_compatible: true,
            missing_fields: Vec::new(),
            warnings: Vec::new(),
            suggestions: Vec::new(),
        };

        // Check for required fields
        for &required_field in required_fields {
            if !enhanced_map.field_definitions.contains_key(required_field) {
                report.is_compatible = false;
                report.missing_fields.push(required_field.to_string());
            }
        }

        // Check for complex field definitions that might not work with simple processors
        for (field_name, field_def) in &enhanced_map.field_definitions {
            // Warn about complex transformations
            if field_def.transformations.is_some() && !field_def.transformations.as_ref().unwrap().is_empty() {
                report.warnings.push(format!(
                    "Field '{}' has transformations that may not be supported by simple processors",
                    field_name
                ));
            }

            // Warn about complex validation rules
            if field_def.validation_rules.pattern.is_some() || 
               field_def.validation_rules.custom_validators.is_some() {
                report.warnings.push(format!(
                    "Field '{}' has advanced validation rules that may not be enforced in simple mode",
                    field_name
                ));
            }

            // Suggest primary mappings for fields without exact matches
            let has_exact_mapping = field_def.xlsx_mappings
                .iter()
                .any(|m| matches!(m.mapping_type, MappingType::Exact));
            
            if !has_exact_mapping && !field_def.xlsx_mappings.is_empty() {
                report.suggestions.push(format!(
                    "Field '{}' should have at least one exact mapping for better compatibility",
                    field_name
                ));
            }
        }

        Ok(report)
    }
}

/// Creates a basic field definition from a simple mapping
fn create_field_definition_from_mapping(excel_header: &str, internal_field: &str) -> FieldDefinition {
    // Determine data type from field name patterns
    let data_type = match internal_field {
        field if field.contains("_count") || field.contains("_number") => DataType::Number,
        field if field.contains("is_") || field.ends_with("_enabled") => DataType::Boolean,
        field if field.contains("_tags") || field.contains("_list") => DataType::Array,
        field if field.contains("_config") || field.contains("_metadata") => DataType::Json,
        _ => DataType::String,
    };

    // Determine if field is required based on common patterns
    let is_required = match internal_field {
        "blueprint" | "server_label" | "switch_label" | "switch_ifname" => true,
        _ => false,
    };

    // Create Excel mapping
    let xlsx_mapping = XlsxMapping {
        pattern: excel_header.to_string(),
        mapping_type: MappingType::Exact,
        priority: 100, // High priority for migrated exact matches
        case_sensitive: false,
        transform: None,
    };

    // Create API mapping if it looks like a standard field
    let api_mappings = if internal_field.starts_with("server_") || 
                         internal_field.starts_with("switch_") ||
                         internal_field.starts_with("link_") {
        vec![ApiMapping {
            primary_path: format!("$.{}", internal_field),
            fallback_paths: vec![],
            transformation: None,
        }]
    } else {
        vec![]
    };

    FieldDefinition {
        display_name: excel_header.to_string(),
        description: format!("Field migrated from simple conversion map: {}", excel_header),
        data_type,
        is_required,
        is_key_field: is_required, // Key fields are typically required fields
        xlsx_mappings: vec![xlsx_mapping],
        api_mappings,
        validation_rules: ValidationRules {
            min_length: None,
            max_length: if data_type == DataType::String { Some(255) } else { None },
            pattern: None,
            allowed_values: None,
            numeric_range: None,
            custom_validators: None,
        },
        ui_config: Some(UiConfig {
            column_width: 150,
            sortable: true,
            filterable: true,
            hidden: false,
        }),
        transformations: None,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MapFormat {
    Simple,
    Enhanced,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompatibilityReport {
    pub is_compatible: bool,
    pub missing_fields: Vec<String>,
    pub warnings: Vec<String>,
    pub suggestions: Vec<String>,
}

impl Default for CompatibilityService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_detect_simple_map_format() {
        let simple_json = r#"
        {
            "header_row": 2,
            "mappings": {
                "Switch Name": "switch_label",
                "Port": "switch_ifname"
            }
        }"#;

        let format = CompatibilityService::detect_map_format(simple_json).unwrap();
        assert!(matches!(format, MapFormat::Simple));
    }

    #[test]
    fn test_detect_enhanced_map_format() {
        let enhanced_json = r#"
        {
            "version": "1.0.0",
            "header_row": 2,
            "field_definitions": {},
            "transformation_rules": {}
        }"#;

        let format = CompatibilityService::detect_map_format(enhanced_json).unwrap();
        assert!(matches!(format, MapFormat::Enhanced));
    }

    #[test]
    fn test_upgrade_simple_to_enhanced() {
        let mut mappings = HashMap::new();
        mappings.insert("Switch Name".to_string(), "switch_label".to_string());
        mappings.insert("Port".to_string(), "switch_ifname".to_string());

        let simple_map = ConversionMap {
            header_row: Some(2),
            mappings,
        };

        let enhanced = CompatibilityService::upgrade_simple_to_enhanced(&simple_map).unwrap();
        
        assert_eq!(enhanced.header_row, Some(2));
        assert!(enhanced.field_definitions.contains_key("switch_label"));
        assert!(enhanced.field_definitions.contains_key("switch_ifname"));
        
        let switch_field = &enhanced.field_definitions["switch_label"];
        assert_eq!(switch_field.display_name, "Switch Name");
        assert!(switch_field.is_required); // switch_label should be required
    }

    #[test]
    fn test_downgrade_enhanced_to_simple() {
        let mut field_definitions = HashMap::new();
        
        field_definitions.insert("switch_label".to_string(), FieldDefinition {
            display_name: "Switch Name".to_string(),
            description: "Switch identifier".to_string(),
            data_type: DataType::String,
            is_required: true,
            is_key_field: true,
            xlsx_mappings: vec![XlsxMapping {
                pattern: "Switch Name".to_string(),
                mapping_type: MappingType::Exact,
                priority: 100,
                case_sensitive: false,
                transform: None,
            }],
            api_mappings: vec![],
            validation_rules: ValidationRules {
                min_length: None,
                max_length: Some(255),
                pattern: None,
                allowed_values: None,
                numeric_range: None,
                custom_validators: None,
            },
            ui_config: None,
            transformations: None,
        });

        let enhanced_map = EnhancedConversionMap {
            version: "1.0.0".to_string(),
            header_row: Some(2),
            field_definitions,
            transformation_rules: HashMap::new(),
            created_at: None,
            updated_at: None,
        };

        let simple = CompatibilityService::downgrade_enhanced_to_simple(&enhanced_map).unwrap();
        
        assert_eq!(simple.header_row, Some(2));
        assert!(simple.mappings.contains_key("Switch Name"));
        assert_eq!(simple.mappings["Switch Name"], "switch_label");
    }

    #[test]
    fn test_validate_backward_compatibility() {
        let mut field_definitions = HashMap::new();
        field_definitions.insert("switch_label".to_string(), create_field_definition_from_mapping("Switch Name", "switch_label"));

        let enhanced_map = EnhancedConversionMap {
            version: "1.0.0".to_string(),
            header_row: Some(2),
            field_definitions,
            transformation_rules: HashMap::new(),
            created_at: None,
            updated_at: None,
        };

        let required_fields = vec!["switch_label", "server_label"];
        let report = CompatibilityService::validate_backward_compatibility(&enhanced_map, &required_fields).unwrap();
        
        assert!(!report.is_compatible); // Missing server_label
        assert_eq!(report.missing_fields.len(), 1);
        assert_eq!(report.missing_fields[0], "server_label");
    }
}