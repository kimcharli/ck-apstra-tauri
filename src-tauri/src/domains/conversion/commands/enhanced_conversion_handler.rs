use tauri::State;
use std::sync::Mutex;
use std::collections::HashMap;
use crate::domains::conversion::services::enhanced_conversion_service::EnhancedConversionService;
use crate::domains::conversion::services::transformation_engine::TransformationEngine;
use crate::models::enhanced_conversion_map::{
    EnhancedConversionMap, FieldDefinition, HeaderConversionResult, 
    TableColumnDefinition, ValidationResult, ApiExtractionResult
};
use serde_json::Value;

pub struct EnhancedConversionState {
    pub service: Mutex<EnhancedConversionService>,
}

impl Default for EnhancedConversionState {
    fn default() -> Self {
        Self {
            service: Mutex::new(EnhancedConversionService::new()),
        }
    }
}

#[tauri::command]
pub async fn load_enhanced_conversion_map(
    _state: State<'_, EnhancedConversionState>,
    file_path: Option<String>,
) -> Result<EnhancedConversionMap, String> {
    match file_path {
        Some(path) => EnhancedConversionService::load_enhanced_conversion_map_from_file(&path),
        None => EnhancedConversionService::load_default_enhanced_conversion_map(),
    }
}

#[tauri::command]
pub async fn save_enhanced_conversion_map(
    state: State<'_, EnhancedConversionState>,
    enhanced_map: EnhancedConversionMap,
    file_path: String,
) -> Result<(), String> {
    let service = state.service.lock()
        .map_err(|_| "Failed to acquire service lock".to_string())?;
    
    service.save_enhanced_conversion_map(&enhanced_map, &file_path)
}

#[tauri::command]
pub async fn convert_headers_enhanced(
    state: State<'_, EnhancedConversionState>,
    excel_headers: Vec<String>,
    enhanced_map: EnhancedConversionMap,
) -> Result<HeaderConversionResult, String> {
    let service = state.service.lock()
        .map_err(|_| "Failed to acquire service lock".to_string())?;
    
    service.convert_headers_with_enhanced_map(&excel_headers, &enhanced_map)
}

#[tauri::command]
pub async fn apply_field_transformations(
    state: State<'_, EnhancedConversionState>,
    field_data: HashMap<String, String>,
    enhanced_map: EnhancedConversionMap,
) -> Result<HashMap<String, String>, String> {
    let service = state.service.lock()
        .map_err(|_| "Failed to acquire service lock".to_string())?;
    
    service.apply_field_transformations(&field_data, &enhanced_map)
}

#[tauri::command]
pub async fn validate_field_values(
    state: State<'_, EnhancedConversionState>,
    field_data: HashMap<String, String>,
    enhanced_map: EnhancedConversionMap,
) -> Result<ValidationResult, String> {
    let service = state.service.lock()
        .map_err(|_| "Failed to acquire service lock".to_string())?;
    
    service.validate_field_values(&field_data, &enhanced_map)
}

#[tauri::command]
pub async fn extract_api_data(
    state: State<'_, EnhancedConversionState>,
    api_response: Value,
    enhanced_map: EnhancedConversionMap,
) -> Result<ApiExtractionResult, String> {
    let service = state.service.lock()
        .map_err(|_| "Failed to acquire service lock".to_string())?;
    
    service.extract_api_data(&api_response, &enhanced_map)
}

#[tauri::command]
pub async fn generate_table_columns(
    state: State<'_, EnhancedConversionState>,
    enhanced_map: EnhancedConversionMap,
    context: Option<String>,
) -> Result<Vec<TableColumnDefinition>, String> {
    let service = state.service.lock()
        .map_err(|_| "Failed to acquire service lock".to_string())?;
    
    service.generate_table_columns(&enhanced_map, context.as_deref())
}

#[tauri::command]
pub async fn migrate_simple_to_enhanced(
    state: State<'_, EnhancedConversionState>,
    simple_mappings: HashMap<String, String>,
    header_row: Option<u32>,
) -> Result<EnhancedConversionMap, String> {
    let service = state.service.lock()
        .map_err(|_| "Failed to acquire service lock".to_string())?;
    
    service.migrate_simple_to_enhanced_map(&simple_mappings, header_row)
}

#[tauri::command]
pub async fn get_field_definition(
    _state: State<'_, EnhancedConversionState>,
    enhanced_map: EnhancedConversionMap,
    field_name: String,
) -> Result<Option<FieldDefinition>, String> {
    Ok(enhanced_map.field_definitions.get(&field_name).cloned())
}

#[tauri::command]
pub async fn update_field_definition(
    _state: State<'_, EnhancedConversionState>,
    mut enhanced_map: EnhancedConversionMap,
    field_name: String,
    field_definition: FieldDefinition,
) -> Result<EnhancedConversionMap, String> {
    enhanced_map.field_definitions.insert(field_name, field_definition);
    enhanced_map.updated_at = Some(chrono::Utc::now().to_rfc3339());
    Ok(enhanced_map)
}

#[tauri::command]
pub async fn remove_field_definition(
    _state: State<'_, EnhancedConversionState>,
    mut enhanced_map: EnhancedConversionMap,
    field_name: String,
) -> Result<EnhancedConversionMap, String> {
    enhanced_map.field_definitions.remove(&field_name);
    enhanced_map.updated_at = Some(chrono::Utc::now().to_rfc3339());
    Ok(enhanced_map)
}

#[tauri::command]
pub async fn test_transformation_rule(
    _state: State<'_, EnhancedConversionState>,
    input_value: String,
    transformation_rule: crate::models::enhanced_conversion_map::TransformationRule,
    context: Option<HashMap<String, String>>,
) -> Result<String, String> {
    let engine = TransformationEngine::new();
    engine.apply_transformation(&transformation_rule, &input_value, context.as_ref())
}

#[tauri::command]
pub async fn validate_enhanced_conversion_map(
    state: State<'_, EnhancedConversionState>,
    enhanced_map: EnhancedConversionMap,
) -> Result<ValidationResult, String> {
    let service = state.service.lock()
        .map_err(|_| "Failed to acquire service lock".to_string())?;
    
    service.validate_enhanced_conversion_map(&enhanced_map)
}

#[tauri::command]
pub async fn get_available_transformations(
    _state: State<'_, EnhancedConversionState>,
) -> Result<Vec<String>, String> {
    Ok(vec![
        "generate_interface_name".to_string(),
        "normalize_speed".to_string(),
        "trim_whitespace".to_string(),
        "to_uppercase".to_string(),
        "to_lowercase".to_string(),
    ])
}

#[tauri::command]
pub async fn create_default_field_definition(
    state: State<'_, EnhancedConversionState>,
    field_name: String,
    display_name: String,
) -> Result<FieldDefinition, String> {
    let service = state.service.lock()
        .map_err(|_| "Failed to acquire service lock".to_string())?;
    
    service.create_default_field_definition(&field_name, &display_name)
}