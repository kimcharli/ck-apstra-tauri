use crate::models::apstra_config::{ApstraConfig, ApstraConfigInfo};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use chrono::Utc;

pub struct ApstraConfigService;

impl ApstraConfigService {
    pub fn load_default_apstra_config() -> Result<ApstraConfig, String> {
        let default_config_content = include_str!("../../../data/default_apstra_config.json");
        
        let json_value: serde_json::Value = serde_json::from_str(default_config_content)
            .map_err(|e| format!("Failed to parse default Apstra config: {}", e))?;
        
        let json_map: HashMap<String, serde_json::Value> = json_value
            .as_object()
            .ok_or_else(|| "Default Apstra config is not a JSON object".to_string())?
            .clone()
            .into_iter()
            .collect();
        
        ApstraConfig::from_json_map(json_map)
    }

    pub fn load_apstra_config_from_file(file_path: &str) -> Result<ApstraConfig, String> {
        let path = Path::new(file_path);
        if !path.exists() {
            return Err(format!("Apstra config file does not exist: {}", file_path));
        }

        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("Failed to read Apstra config file: {}", e))?;
        
        let json_value: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse Apstra config JSON: {}", e))?;
        
        let json_map: HashMap<String, serde_json::Value> = json_value
            .as_object()
            .ok_or_else(|| "Apstra config is not a JSON object".to_string())?
            .clone()
            .into_iter()
            .collect();
        
        ApstraConfig::from_json_map(json_map)
    }

    pub fn save_apstra_config_to_file(apstra_config: &ApstraConfig, file_path: &str) -> Result<(), String> {
        let json_map = apstra_config.to_json_map();
        let json_content = serde_json::to_string_pretty(&json_map)
            .map_err(|e| format!("Failed to serialize Apstra config: {}", e))?;
        
        // Ensure parent directory exists
        let path = Path::new(file_path);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }

        std::fs::write(path, json_content)
            .map_err(|e| format!("Failed to write Apstra config file: {}", e))?;
        
        log::info!("Apstra config saved to: {}", file_path);
        Ok(())
    }

    pub fn get_user_apstra_config_path() -> Result<PathBuf, String> {
        let mut path = tauri::api::path::app_data_dir(&tauri::Config::default())
            .ok_or_else(|| "Failed to get app data directory".to_string())?;
        
        path.push("apstra_configs");
        std::fs::create_dir_all(&path)
            .map_err(|e| format!("Failed to create Apstra configs directory: {}", e))?;
        
        path.push("user_apstra_config.json");
        Ok(path)
    }

    pub fn create_apstra_config_info(name: String, description: Option<String>, config: ApstraConfig) -> ApstraConfigInfo {
        let now = Utc::now().to_rfc3339();
        ApstraConfigInfo {
            name,
            description,
            created_at: now.clone(),
            updated_at: now,
            config,
        }
    }

    pub fn test_connection(config: &ApstraConfig) -> Result<bool, String> {
        // TODO: Implement actual connection test to Apstra controller
        // For now, just validate the configuration
        config.validate().map_err(|errors| {
            format!("Configuration validation failed: {}", errors.join(", "))
        })?;
        
        log::info!("Testing connection to Apstra controller at {}", config.get_base_url());
        
        // Placeholder for actual connection test
        // In a real implementation, you would:
        // 1. Create HTTP client with proper SSL settings
        // 2. Make a test API call (e.g., GET /api/user/login)
        // 3. Return true if connection successful, false otherwise
        
        Ok(true) // Placeholder - always return success for now
    }

    pub fn get_default_config_with_user_overrides() -> Result<ApstraConfig, String> {
        // Try to load user config first, fall back to default if not found
        let user_config_path = Self::get_user_apstra_config_path()?;
        
        if user_config_path.exists() {
            match Self::load_apstra_config_from_file(user_config_path.to_str().unwrap()) {
                Ok(config) => return Ok(config),
                Err(e) => {
                    log::warn!("Failed to load user Apstra config, using default: {}", e);
                }
            }
        }
        
        Self::load_default_apstra_config()
    }
}