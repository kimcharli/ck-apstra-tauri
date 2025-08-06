use tauri::command;
use crate::models::conversion_map::{ConversionMap, ConversionMapInfo};
use crate::services::conversion_service::ConversionService;
use std::collections::HashMap;

#[command]
pub async fn load_default_conversion_map() -> Result<ConversionMap, String> {
    log::info!("Loading default conversion map");
    ConversionService::load_default_conversion_map()
}

#[command]
pub async fn load_conversion_map_from_file(file_path: String) -> Result<ConversionMap, String> {
    log::info!("Loading conversion map from file: {}", file_path);
    ConversionService::load_conversion_map_from_file(&file_path)
}

#[command]
pub async fn save_conversion_map_to_file(conversion_map: ConversionMap, file_path: String) -> Result<(), String> {
    log::info!("Saving conversion map to file: {}", file_path);
    ConversionService::save_conversion_map_to_file(&conversion_map, &file_path)
}

#[command]
pub async fn get_user_conversion_map_path() -> Result<String, String> {
    let path = ConversionService::get_user_conversion_map_path()?;
    Ok(path.to_string_lossy().to_string())
}

#[command]
pub async fn save_user_conversion_map(conversion_map: ConversionMap) -> Result<String, String> {
    let path = ConversionService::get_user_conversion_map_path()?;
    let path_str = path.to_string_lossy().to_string();
    
    ConversionService::save_conversion_map_to_file(&conversion_map, &path_str)?;
    log::info!("User conversion map saved to: {}", path_str);
    
    Ok(path_str)
}

#[command]
pub async fn load_user_conversion_map() -> Result<ConversionMap, String> {
    let path = ConversionService::get_user_conversion_map_path()?;
    let path_str = path.to_string_lossy().to_string();
    
    if !path.exists() {
        log::info!("User conversion map doesn't exist, loading default");
        return ConversionService::load_default_conversion_map();
    }
    
    log::info!("Loading user conversion map from: {}", path_str);
    ConversionService::load_conversion_map_from_file(&path_str)
}

#[command]
pub async fn create_conversion_map_info(
    name: String, 
    description: Option<String>, 
    conversion_map: ConversionMap
) -> Result<ConversionMapInfo, String> {
    log::info!("Creating conversion map info: {}", name);
    Ok(ConversionService::create_conversion_map_info(name, description, conversion_map))
}

#[command]
pub async fn convert_headers_with_map(
    excel_headers: Vec<String>, 
    conversion_map: ConversionMap
) -> Result<HashMap<String, String>, String> {
    log::info!("Converting {} headers with conversion map", excel_headers.len());
    Ok(ConversionService::convert_headers_with_map(&excel_headers, &conversion_map))
}

#[command]
pub async fn update_conversion_mapping(
    mut conversion_map: ConversionMap,
    excel_header: String,
    target_field: String
) -> Result<ConversionMap, String> {
    log::info!("Updating conversion mapping: '{}' -> '{}'", excel_header, target_field);
    conversion_map.add_mapping(excel_header, target_field);
    Ok(conversion_map)
}

#[command]
pub async fn remove_conversion_mapping(
    mut conversion_map: ConversionMap,
    excel_header: String
) -> Result<ConversionMap, String> {
    log::info!("Removing conversion mapping for: '{}'", excel_header);
    conversion_map.remove_mapping(&excel_header);
    Ok(conversion_map)
}

#[command]
pub async fn set_header_row(
    mut conversion_map: ConversionMap,
    header_row: u32
) -> Result<ConversionMap, String> {
    log::info!("Setting header row to: {}", header_row);
    conversion_map.set_header_row(header_row);
    Ok(conversion_map)
}