// Validation Types and Utilities
// Common validation structures and helper functions

use serde::{Deserialize, Serialize};
use super::api_contracts::{NetworkConfigRow, ValidationError};

// ============================================================================
// Validation Rules and Constraints
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationRule {
    pub field: String,
    pub rule_type: ValidationRuleType,
    pub message: String,
    pub required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidationRuleType {
    Required,
    MinLength { min: usize },
    MaxLength { max: usize },
    Pattern { regex: String },
    Range { min: f64, max: f64 },
    OneOf { values: Vec<String> },
    Custom { validator: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationRuleSet {
    pub name: String,
    pub description: Option<String>,
    pub rules: Vec<ValidationRule>,
}

// ============================================================================
// Field Validation Results
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldValidationResult {
    pub field: String,
    pub value: Option<String>,
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RowValidationResult {
    pub row_index: usize,
    pub is_valid: bool,
    pub field_results: Vec<FieldValidationResult>,
    pub row_errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchValidationResult {
    pub total_rows: usize,
    pub valid_rows: usize,
    pub invalid_rows: usize,
    pub row_results: Vec<RowValidationResult>,
    pub summary_errors: Vec<String>,
}

// ============================================================================
// Data Quality Metrics
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataQualityMetrics {
    pub completeness: f64,      // Percentage of non-empty required fields
    pub consistency: f64,       // Percentage of fields following expected patterns
    pub validity: f64,          // Percentage of fields passing validation rules
    pub uniqueness: f64,        // Percentage of unique values where expected
    pub overall_score: f64,     // Weighted average of all metrics
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldQualityMetrics {
    pub field_name: String,
    pub total_values: usize,
    pub non_empty_values: usize,
    pub unique_values: usize,
    pub valid_values: usize,
    pub completeness_rate: f64,
    pub validity_rate: f64,
    pub uniqueness_rate: f64,
}

// ============================================================================
// Validation Context
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationContext {
    pub domain: String,
    pub validation_type: String,
    pub rule_set: Option<ValidationRuleSet>,
    pub strict_mode: bool,
    pub skip_warnings: bool,
    pub custom_rules: Vec<ValidationRule>,
}

impl Default for ValidationContext {
    fn default() -> Self {
        Self {
            domain: "shared".to_string(),
            validation_type: "default".to_string(),
            rule_set: None,
            strict_mode: false,
            skip_warnings: false,
            custom_rules: Vec::new(),
        }
    }
}

// ============================================================================
// Common Validation Functions
// ============================================================================

impl ValidationRule {
    pub fn required(field: &str) -> Self {
        Self {
            field: field.to_string(),
            rule_type: ValidationRuleType::Required,
            message: format!("{} is required", field),
            required: true,
        }
    }

    pub fn min_length(field: &str, min: usize) -> Self {
        Self {
            field: field.to_string(),
            rule_type: ValidationRuleType::MinLength { min },
            message: format!("{} must be at least {} characters", field, min),
            required: false,
        }
    }

    pub fn max_length(field: &str, max: usize) -> Self {
        Self {
            field: field.to_string(),
            rule_type: ValidationRuleType::MaxLength { max },
            message: format!("{} must be no more than {} characters", field, max),
            required: false,
        }
    }

    pub fn pattern(field: &str, regex: &str, message: &str) -> Self {
        Self {
            field: field.to_string(),
            rule_type: ValidationRuleType::Pattern { regex: regex.to_string() },
            message: message.to_string(),
            required: false,
        }
    }

    pub fn one_of(field: &str, values: Vec<String>) -> Self {
        Self {
            field: field.to_string(),
            rule_type: ValidationRuleType::OneOf { values: values.clone() },
            message: format!("{} must be one of: {}", field, values.join(", ")),
            required: false,
        }
    }
}

// ============================================================================
// Default Validation Rule Sets
// ============================================================================

impl ValidationRuleSet {
    pub fn network_config_basic() -> Self {
        Self {
            name: "network_config_basic".to_string(),
            description: Some("Basic validation rules for network configuration data".to_string()),
            rules: vec![
                ValidationRule::required("switch_label"),
                ValidationRule::required("switch_ifname"),
                ValidationRule::min_length("switch_label", 1),
                ValidationRule::min_length("switch_ifname", 1),
                ValidationRule::one_of("link_group_lag_mode", vec![
                    "lacp_active".to_string(),
                    "static".to_string(),
                    "none".to_string(),
                ]),
            ],
        }
    }

    pub fn network_config_strict() -> Self {
        let mut rules = Self::network_config_basic();
        rules.name = "network_config_strict".to_string();
        rules.description = Some("Strict validation rules for network configuration data".to_string());
        rules.rules.extend(vec![
            ValidationRule::required("server_label"),
            ValidationRule::required("server_ifname"),
            ValidationRule::required("blueprint"),
            ValidationRule::min_length("blueprint", 1),
        ]);
        rules
    }
}