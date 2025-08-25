use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedConversionMap {
    pub version: String,
    pub header_row: Option<u32>,
    pub field_definitions: HashMap<String, FieldDefinition>,
    pub transformation_rules: HashMap<String, TransformationRule>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDefinition {
    pub display_name: String,
    pub description: String,
    pub data_type: DataType,
    pub is_required: bool,
    pub is_key_field: bool,
    pub xlsx_mappings: Vec<XlsxMapping>,
    pub api_mappings: Vec<ApiMapping>,
    pub validation_rules: ValidationRules,
    pub ui_config: Option<UiConfig>,
    pub transformations: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XlsxMapping {
    pub pattern: String,
    pub mapping_type: MappingType,
    pub priority: u32,
    pub case_sensitive: bool,
    pub transform: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MappingType {
    Exact,
    Partial,
    Regex,
    Fuzzy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiMapping {
    pub primary_path: String,
    pub fallback_paths: Vec<String>,
    pub transformation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DataType {
    String,
    Number,
    Boolean,
    Array,
    Json,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationRules {
    pub min_length: Option<usize>,
    pub max_length: Option<usize>,
    pub pattern: Option<String>,
    pub allowed_values: Option<Vec<String>>,
    pub numeric_range: Option<NumericRange>,
    pub custom_validators: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NumericRange {
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub step: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiConfig {
    pub column_width: u32,
    pub sortable: bool,
    pub filterable: bool,
    pub hidden: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransformationRule {
    pub name: String,
    pub description: String,
    pub rule_type: TransformationType,
    pub conditions: Option<HashMap<String, serde_json::Value>>,
    pub logic: TransformationLogic,
    pub priority: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TransformationType {
    ValueMapping,
    Template,
    Function,
    Pipeline,
    Static,
    Dynamic,
    Conditional,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TransformationLogic {
    #[serde(rename = "value_map")]
    ValueMap { mappings: HashMap<String, String> },
    #[serde(rename = "template")]
    Template { template: String },
    #[serde(rename = "function")]
    Function { name: String },
    #[serde(rename = "pipeline")]
    Pipeline { steps: Vec<TransformationStep> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransformationStep {
    pub step_type: String,
    pub parameters: HashMap<String, serde_json::Value>,
}

// Result structures for enhanced conversion operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeaderConversionResult {
    pub converted_headers: HashMap<String, String>,
    pub applied_transformations: HashMap<String, String>,
    pub validation_errors: Vec<ValidationError>,
    pub mapping_confidence: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
    pub severity: ErrorSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum ErrorSeverity {
    Error,
    Warning,
    Info,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationError>,
    pub field_summary: HashMap<String, FieldValidationSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldValidationSummary {
    pub is_valid: bool,
    pub error_count: u32,
    pub warning_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiExtractionResult {
    pub extracted_data: HashMap<String, serde_json::Value>,
    pub extraction_errors: Vec<ExtractionError>,
    pub success_count: u32,
    pub total_fields: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionError {
    pub field: String,
    pub message: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableColumnDefinition {
    pub field_name: String,
    pub display_name: String,
    pub data_type: String,
    pub width: u32,
    pub sortable: bool,
    pub filterable: bool,
    pub hidden: bool,
    pub required: bool,
}

impl Default for EnhancedConversionMap {
    fn default() -> Self {
        Self::new()
    }
}

impl EnhancedConversionMap {
    pub fn new() -> Self {
        Self {
            version: "1.0.0".to_string(),
            header_row: Some(2),
            field_definitions: HashMap::new(),
            transformation_rules: HashMap::new(),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        }
    }

    pub fn get_field_definition(&self, field_name: &str) -> Option<&FieldDefinition> {
        self.field_definitions.get(field_name)
    }

    pub fn get_transformation_rule(&self, rule_name: &str) -> Option<&TransformationRule> {
        self.transformation_rules.get(rule_name)
    }
}