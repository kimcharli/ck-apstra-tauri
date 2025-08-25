use crate::models::conversion_map::{ConversionMap, ConversionMapInfo};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use chrono::Utc;

pub struct ConversionService;

impl Default for ConversionService {
    fn default() -> Self {
        Self::new()
    }
}

impl ConversionService {
    pub fn new() -> Self {
        Self
    }

    pub fn load_default_conversion_map() -> Result<ConversionMap, String> {
        let default_map_content = include_str!("../../../data/default_conversion_map.json");
        
        let json_value: serde_json::Value = serde_json::from_str(default_map_content)
            .map_err(|e| format!("Failed to parse default conversion map: {}", e))?;
        
        let json_map: HashMap<String, serde_json::Value> = json_value
            .as_object()
            .ok_or_else(|| "Default conversion map is not a JSON object".to_string())?
            .clone()
            .into_iter()
            .collect();
        
        ConversionMap::from_json_map(json_map)
    }

    pub fn load_conversion_map_from_file(file_path: &str) -> Result<ConversionMap, String> {
        let path = Path::new(file_path);
        if !path.exists() {
            return Err(format!("Conversion map file does not exist: {}", file_path));
        }

        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("Failed to read conversion map file: {}", e))?;
        
        let json_value: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse conversion map JSON: {}", e))?;
        
        let json_map: HashMap<String, serde_json::Value> = json_value
            .as_object()
            .ok_or_else(|| "Conversion map is not a JSON object".to_string())?
            .clone()
            .into_iter()
            .collect();
        
        ConversionMap::from_json_map(json_map)
    }

    pub fn save_conversion_map_to_file(conversion_map: &ConversionMap, file_path: &str) -> Result<(), String> {
        let json_map = conversion_map.to_json_map();
        let json_content = serde_json::to_string_pretty(&json_map)
            .map_err(|e| format!("Failed to serialize conversion map: {}", e))?;
        
        // Ensure parent directory exists
        let path = Path::new(file_path);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }

        std::fs::write(path, json_content)
            .map_err(|e| format!("Failed to write conversion map file: {}", e))?;
        
        log::info!("Conversion map saved to: {}", file_path);
        Ok(())
    }

    pub fn get_user_conversion_map_path() -> Result<PathBuf, String> {
        let mut path = tauri::api::path::app_data_dir(&tauri::Config::default())
            .ok_or_else(|| "Failed to get app data directory".to_string())?;
        
        path.push("conversion_maps");
        std::fs::create_dir_all(&path)
            .map_err(|e| format!("Failed to create conversion maps directory: {}", e))?;
        
        path.push("user_conversion_map.json");
        Ok(path)
    }

    pub fn create_conversion_map_info(name: String, description: Option<String>, map: ConversionMap) -> ConversionMapInfo {
        let now = Utc::now().to_rfc3339();
        ConversionMapInfo {
            name,
            description,
            created_at: now.clone(),
            updated_at: now,
            map,
        }
    }

    pub fn convert_headers_with_map(excel_headers: &[String], conversion_map: &ConversionMap) -> HashMap<String, String> {
        let mut converted_headers = HashMap::new();
        
        for excel_header in excel_headers {
            if let Some(mapped_field) = conversion_map.get_mapped_field(excel_header) {
                log::debug!("Mapped '{}' -> '{}'", excel_header, mapped_field);
                converted_headers.insert(excel_header.clone(), mapped_field);
            } else {
                // Keep original header if no mapping found
                converted_headers.insert(excel_header.clone(), excel_header.clone());
                log::debug!("No mapping found for '{}', keeping original", excel_header);
            }
        }
        
        converted_headers
    }
}