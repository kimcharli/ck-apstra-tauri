use crate::models::enhanced_conversion_map::{
    EnhancedConversionMap, FieldDefinition, MappingType,
    HeaderConversionResult, ValidationResult, ValidationError, ErrorSeverity,
    ApiExtractionResult, ExtractionError, TableColumnDefinition, FieldValidationSummary
};
use crate::services::transformation_engine::TransformationEngine;
use std::collections::HashMap;
use std::path::Path;
use serde_json::Value;

pub struct EnhancedConversionService {
    transformation_engine: TransformationEngine,
}

impl Default for EnhancedConversionService {
    fn default() -> Self {
        Self::new()
    }
}

impl EnhancedConversionService {
    pub fn new() -> Self {
        Self {
            transformation_engine: TransformationEngine::new(),
        }
    }

    pub fn load_default_enhanced_conversion_map() -> Result<EnhancedConversionMap, String> {
        let enhanced_map_content = include_str!("../../../data/default_enhanced_conversion_map.json");
        
        let enhanced_map: EnhancedConversionMap = serde_json::from_str(enhanced_map_content)
            .map_err(|e| format!("Failed to parse default enhanced conversion map: {}", e))?;

        log::info!("Loaded default enhanced conversion map with {} field definitions", 
                   enhanced_map.field_definitions.len());
        
        Ok(enhanced_map)
    }

    pub fn load_enhanced_conversion_map_from_file(file_path: &str) -> Result<EnhancedConversionMap, String> {
        let path = Path::new(file_path);
        if !path.exists() {
            return Err(format!("Enhanced conversion map file not found: {}", file_path));
        }

        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("Failed to read enhanced conversion map file: {}", e))?;

        let enhanced_map: EnhancedConversionMap = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse enhanced conversion map: {}", e))?;

        log::info!("Loaded enhanced conversion map from {} with {} field definitions", 
                   file_path, enhanced_map.field_definitions.len());

        Ok(enhanced_map)
    }

    pub fn save_enhanced_conversion_map(&self, enhanced_map: &EnhancedConversionMap, file_path: &str) -> Result<(), String> {
        let json = serde_json::to_string_pretty(enhanced_map)
            .map_err(|e| format!("Failed to serialize enhanced conversion map: {}", e))?;

        std::fs::write(file_path, json)
            .map_err(|e| format!("Failed to write enhanced conversion map to {}: {}", file_path, e))?;

        log::info!("Saved enhanced conversion map to {}", file_path);
        Ok(())
    }

    pub fn convert_headers_with_enhanced_map(
        &self, 
        excel_headers: &[String], 
        enhanced_map: &EnhancedConversionMap
    ) -> Result<HeaderConversionResult, String> {
        let mut converted_headers = HashMap::new();
        let mut applied_transformations = HashMap::new();
        let mut validation_errors = Vec::new();
        let mut mapping_confidence = HashMap::new();

        for excel_header in excel_headers {
            if let Some((field_name, confidence)) = self.find_best_field_match(excel_header, enhanced_map) {
                converted_headers.insert(excel_header.clone(), field_name.clone());
                mapping_confidence.insert(excel_header.clone(), confidence);

                // Apply transformations if any
                if let Some(field_def) = enhanced_map.field_definitions.get(&field_name) {
                    if let Some(transformations) = &field_def.transformations {
                        applied_transformations.insert(excel_header.clone(), transformations.join(", "));
                    }
                }
            } else {
                validation_errors.push(ValidationError {
                    field: excel_header.clone(),
                    message: format!("No field mapping found for header: {}", excel_header),
                    severity: ErrorSeverity::Warning,
                });
            }
        }

        Ok(HeaderConversionResult {
            converted_headers,
            applied_transformations,
            validation_errors,
            mapping_confidence,
        })
    }

    fn find_best_field_match(&self, excel_header: &str, enhanced_map: &EnhancedConversionMap) -> Option<(String, f64)> {
        let mut best_match = None;
        let mut best_confidence = 0.0;

        for (field_name, field_def) in &enhanced_map.field_definitions {
            for xlsx_mapping in &field_def.xlsx_mappings {
                let confidence = match &xlsx_mapping.mapping_type {
                    MappingType::Exact => {
                        let pattern = if xlsx_mapping.case_sensitive {
                            &xlsx_mapping.pattern
                        } else {
                            &xlsx_mapping.pattern.to_lowercase()
                        };
                        let header = if xlsx_mapping.case_sensitive {
                            excel_header
                        } else {
                            &excel_header.to_lowercase()
                        };
                        if pattern == header { 1.0 } else { 0.0 }
                    },
                    MappingType::Partial => {
                        let pattern = if xlsx_mapping.case_sensitive {
                            &xlsx_mapping.pattern
                        } else {
                            &xlsx_mapping.pattern.to_lowercase()
                        };
                        let header = if xlsx_mapping.case_sensitive {
                            excel_header
                        } else {
                            &excel_header.to_lowercase()
                        };
                        if header.contains(pattern) { 0.8 } else { 0.0 }
                    },
                    MappingType::Regex => {
                        if let Ok(regex) = regex::Regex::new(&xlsx_mapping.pattern) {
                            if regex.is_match(excel_header) { 0.9 } else { 0.0 }
                        } else {
                            0.0
                        }
                    },
                    MappingType::Fuzzy => {
                        self.calculate_fuzzy_confidence(&xlsx_mapping.pattern, excel_header)
                    }
                };

                if confidence > best_confidence {
                    best_confidence = confidence;
                    best_match = Some(field_name.clone());
                }
            }
        }

        best_match.map(|field| (field, best_confidence))
    }

    fn calculate_fuzzy_confidence(&self, pattern: &str, text: &str) -> f64 {
        let max_len = pattern.len().max(text.len());
        if max_len == 0 { return 1.0; }
        
        let distance = self.levenshtein_distance(pattern, text);
        1.0 - (distance as f64 / max_len as f64)
    }

    fn levenshtein_distance(&self, s1: &str, s2: &str) -> usize {
        let len1 = s1.len();
        let len2 = s2.len();
        let mut matrix = vec![vec![0; len2 + 1]; len1 + 1];

        for (i, row) in matrix.iter_mut().enumerate().take(len1 + 1) {
            row[0] = i;
        }
        for j in 0..=len2 {
            matrix[0][j] = j;
        }

        for i in 1..=len1 {
            for j in 1..=len2 {
                let cost = if s1.chars().nth(i - 1) == s2.chars().nth(j - 1) { 0 } else { 1 };
                matrix[i][j] = (matrix[i - 1][j] + 1)
                    .min(matrix[i][j - 1] + 1)
                    .min(matrix[i - 1][j - 1] + cost);
            }
        }

        matrix[len1][len2]
    }

    pub fn apply_field_transformations(
        &self,
        field_data: &HashMap<String, String>,
        enhanced_map: &EnhancedConversionMap,
    ) -> Result<HashMap<String, String>, String> {
        let mut transformed_data = HashMap::new();

        for (field_name, value) in field_data {
            let mut transformed_value = value.clone();

            if let Some(field_def) = enhanced_map.field_definitions.get(field_name) {
                if let Some(transformations) = &field_def.transformations {
                    for transformation_name in transformations {
                        if let Some(rule) = enhanced_map.transformation_rules.get(transformation_name) {
                            log::debug!("Applying transformation '{}' to field '{}' with value '{}', context: {:?}", 
                                       transformation_name, field_name, transformed_value, field_data);
                            match self.transformation_engine.apply_transformation(rule, &transformed_value, Some(field_data)) {
                                Ok(new_value) => {
                                    log::debug!("Transformation '{}' result: '{}' -> '{}'", transformation_name, transformed_value, new_value);
                                    transformed_value = new_value;
                                },
                                Err(e) => log::warn!("Transformation {} failed for field {}: {}", transformation_name, field_name, e),
                            }
                        } else {
                            log::warn!("Transformation rule '{}' not found for field '{}'", transformation_name, field_name);
                        }
                    }
                }
            }

            transformed_data.insert(field_name.clone(), transformed_value);
        }

        Ok(transformed_data)
    }

    pub fn validate_field_values(
        &self,
        field_data: &HashMap<String, String>,
        enhanced_map: &EnhancedConversionMap,
    ) -> Result<ValidationResult, String> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        let mut field_summary = HashMap::new();

        for (field_name, value) in field_data {
            let mut field_errors = 0;
            let mut field_warnings = 0;

            if let Some(field_def) = enhanced_map.field_definitions.get(field_name) {
                // Check required fields
                if field_def.is_required && value.trim().is_empty() {
                    errors.push(ValidationError {
                        field: field_name.clone(),
                        message: "Required field cannot be empty".to_string(),
                        severity: ErrorSeverity::Error,
                    });
                    field_errors += 1;
                }

                // Apply validation rules
                let validation_rules = &field_def.validation_rules;
                if let Some(min_len) = validation_rules.min_length {
                    if value.len() < min_len {
                        errors.push(ValidationError {
                            field: field_name.clone(),
                            message: format!("Value too short, minimum length is {}", min_len),
                            severity: ErrorSeverity::Error,
                        });
                        field_errors += 1;
                    }
                }

                if let Some(max_len) = validation_rules.max_length {
                    if value.len() > max_len {
                        errors.push(ValidationError {
                            field: field_name.clone(),
                            message: format!("Value too long, maximum length is {}", max_len),
                            severity: ErrorSeverity::Error,
                        });
                        field_errors += 1;
                    }
                }

                if let Some(pattern) = &validation_rules.pattern {
                    if let Ok(regex) = regex::Regex::new(pattern) {
                        if !regex.is_match(value) {
                            errors.push(ValidationError {
                                field: field_name.clone(),
                                message: format!("Value does not match required pattern: {}", pattern),
                                severity: ErrorSeverity::Error,
                            });
                            field_errors += 1;
                        }
                    }
                }

                if let Some(allowed_values) = &validation_rules.allowed_values {
                    if !allowed_values.contains(value) {
                        warnings.push(ValidationError {
                            field: field_name.clone(),
                            message: format!("Value '{}' not in allowed values: {:?}", value, allowed_values),
                            severity: ErrorSeverity::Warning,
                        });
                        field_warnings += 1;
                    }
                }
            }

            field_summary.insert(field_name.clone(), FieldValidationSummary {
                is_valid: field_errors == 0,
                error_count: field_errors,
                warning_count: field_warnings,
            });
        }

        Ok(ValidationResult {
            is_valid: errors.is_empty(),
            errors,
            warnings,
            field_summary,
        })
    }

    pub fn extract_api_data(
        &self,
        api_response: &Value,
        enhanced_map: &EnhancedConversionMap,
    ) -> Result<ApiExtractionResult, String> {
        let mut extracted_data = HashMap::new();
        let mut extraction_errors = Vec::new();
        let mut success_count = 0;

        for (field_name, field_def) in &enhanced_map.field_definitions {
            let mut extracted = false;

            for api_mapping in &field_def.api_mappings {
                // Try primary path first
                if let Some(value) = self.extract_json_path(&api_mapping.primary_path, api_response) {
                    extracted_data.insert(field_name.clone(), value);
                    success_count += 1;
                    extracted = true;
                    break;
                }

                // Try fallback paths
                for fallback_path in &api_mapping.fallback_paths {
                    if let Some(value) = self.extract_json_path(fallback_path, api_response) {
                        extracted_data.insert(field_name.clone(), value);
                        success_count += 1;
                        extracted = true;
                        break;
                    }
                }

                if extracted {
                    break;
                }
            }

            if !extracted && !field_def.api_mappings.is_empty() {
                extraction_errors.push(ExtractionError {
                    field: field_name.clone(),
                    message: "Failed to extract value from API response".to_string(),
                    path: field_def.api_mappings.first()
                        .map(|m| m.primary_path.clone())
                        .unwrap_or_default(),
                });
            }
        }

        Ok(ApiExtractionResult {
            extracted_data,
            extraction_errors,
            success_count,
            total_fields: enhanced_map.field_definitions.len() as u32,
        })
    }

    fn extract_json_path(&self, path: &str, data: &Value) -> Option<Value> {
        // Simple JSONPath-like extraction
        // For now, just extract simple dot-notation paths
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = data;

        for part in parts {
            if part.is_empty() { continue; }
            
            if part.starts_with('$') {
                continue; // Skip root indicator
            }

            if let Some(clean_part) = part.strip_suffix("?") {
                // Optional path, return None if not found
                if let Some(value) = current.get(clean_part) {
                    current = value;
                } else {
                    return None;
                }
            } else if let Some(clean_part) = part.strip_suffix("[*]") {
                // Array extraction
                if let Some(array) = current.get(clean_part).and_then(|v| v.as_array()) {
                    // Return first non-null value for simplicity
                    for item in array {
                        if !item.is_null() {
                            current = item;
                            break;
                        }
                    }
                } else {
                    return None;
                }
            } else if let Some(value) = current.get(part) {
                current = value;
            } else {
                return None;
            }
        }

        Some(current.clone())
    }

    pub fn generate_table_columns(
        &self,
        enhanced_map: &EnhancedConversionMap,
        _context: Option<&str>,
    ) -> Result<Vec<TableColumnDefinition>, String> {
        let mut columns = Vec::new();

        // Define preferred column order
        let preferred_order = vec![
            "blueprint", "server_label", "switch_label", "switch_ifname", "server_ifname",
            "link_speed", "link_group_lag_mode", "link_group_ct_names", "link_group_ifname",
            "is_external", "server_tags", "switch_tags", "link_tags", "comment"
        ];

        // Add columns in preferred order
        for field_name in &preferred_order {
            if let Some(field_def) = enhanced_map.field_definitions.get(*field_name) {
                columns.push(TableColumnDefinition {
                    field_name: field_name.to_string(),
                    display_name: field_def.display_name.clone(),
                    data_type: format!("{:?}", field_def.data_type),
                    width: field_def.ui_config.as_ref().map(|ui| ui.column_width).unwrap_or(120),
                    sortable: field_def.ui_config.as_ref().map(|ui| ui.sortable).unwrap_or(true),
                    filterable: field_def.ui_config.as_ref().map(|ui| ui.filterable).unwrap_or(true),
                    hidden: field_def.ui_config.as_ref().map(|ui| ui.hidden).unwrap_or(false),
                    required: field_def.is_required,
                });
            }
        }

        // Add any remaining fields not in the preferred order
        for (field_name, field_def) in &enhanced_map.field_definitions {
            if !preferred_order.contains(&field_name.as_str()) {
                columns.push(TableColumnDefinition {
                    field_name: field_name.clone(),
                    display_name: field_def.display_name.clone(),
                    data_type: format!("{:?}", field_def.data_type),
                    width: field_def.ui_config.as_ref().map(|ui| ui.column_width).unwrap_or(120),
                    sortable: field_def.ui_config.as_ref().map(|ui| ui.sortable).unwrap_or(true),
                    filterable: field_def.ui_config.as_ref().map(|ui| ui.filterable).unwrap_or(true),
                    hidden: field_def.ui_config.as_ref().map(|ui| ui.hidden).unwrap_or(false),
                    required: field_def.is_required,
                });
            }
        }

        Ok(columns)
    }

    pub fn migrate_simple_to_enhanced_map(
        &self,
        simple_mappings: &HashMap<String, String>,
        header_row: Option<u32>,
    ) -> Result<EnhancedConversionMap, String> {
        let mut enhanced_map = EnhancedConversionMap {
            version: "1.0.0".to_string(),
            header_row,
            field_definitions: HashMap::new(),
            transformation_rules: HashMap::new(),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        };

        // Create basic field definitions from simple mappings
        for (excel_header, internal_name) in simple_mappings {
            let field_def = self.create_default_field_definition(internal_name, excel_header)?;
            enhanced_map.field_definitions.insert(internal_name.clone(), field_def);
        }

        Ok(enhanced_map)
    }

    pub fn validate_enhanced_conversion_map(&self, enhanced_map: &EnhancedConversionMap) -> Result<ValidationResult, String> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Validate field definitions
        for (field_name, field_def) in &enhanced_map.field_definitions {
            if field_def.xlsx_mappings.is_empty() {
                warnings.push(ValidationError {
                    field: field_name.clone(),
                    message: "Field has no Excel mappings defined".to_string(),
                    severity: ErrorSeverity::Warning,
                });
            }

            if field_def.display_name.is_empty() {
                errors.push(ValidationError {
                    field: field_name.clone(),
                    message: "Field display name cannot be empty".to_string(),
                    severity: ErrorSeverity::Error,
                });
            }
        }

        // Validate transformation rules
        for (rule_name, rule) in &enhanced_map.transformation_rules {
            if let Err(e) = self.transformation_engine.validate_transformation_rule(rule) {
                errors.push(ValidationError {
                    field: rule_name.clone(),
                    message: format!("Invalid transformation rule: {}", e),
                    severity: ErrorSeverity::Error,
                });
            }
        }

        let mut field_summary = HashMap::new();
        for field_name in enhanced_map.field_definitions.keys() {
            field_summary.insert(field_name.clone(), FieldValidationSummary {
                is_valid: true,
                error_count: 0,
                warning_count: 0,
            });
        }

        Ok(ValidationResult {
            is_valid: errors.is_empty(),
            errors,
            warnings,
            field_summary,
        })
    }

    pub fn create_default_field_definition(&self, field_name: &str, display_name: &str) -> Result<FieldDefinition, String> {
        Ok(FieldDefinition {
            display_name: display_name.to_string(),
            description: format!("Field definition for {}", field_name),
            data_type: crate::models::enhanced_conversion_map::DataType::String,
            is_required: false,
            is_key_field: false,
            xlsx_mappings: vec![crate::models::enhanced_conversion_map::XlsxMapping {
                pattern: display_name.to_string(),
                mapping_type: MappingType::Exact,
                priority: 100,
                case_sensitive: false,
                transform: None,
            }],
            api_mappings: vec![],
            validation_rules: crate::models::enhanced_conversion_map::ValidationRules {
                min_length: None,
                max_length: None,
                pattern: None,
                allowed_values: None,
                numeric_range: None,
                custom_validators: None,
            },
            ui_config: Some(crate::models::enhanced_conversion_map::UiConfig {
                column_width: 120,
                sortable: true,
                filterable: true,
                hidden: false,
            }),
            transformations: None,
        })
    }
}