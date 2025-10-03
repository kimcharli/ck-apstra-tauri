use tauri::command;
use crate::domains::apstra::models::apstra_config::ApstraConfig;
use crate::services::apstra_config_service::ApstraConfigService;

#[command]
pub async fn load_default_apstra_config() -> Result<ApstraConfig, String> {
    log::info!("Loading default Apstra configuration");
    ApstraConfigService::load_default_apstra_config()
}

#[command]
pub async fn load_apstra_config_from_file(file_path: String) -> Result<ApstraConfig, String> {
    log::info!("Loading Apstra config from file: {}", file_path);
    ApstraConfigService::load_apstra_config_from_file(&file_path)
}

#[command]
pub async fn save_apstra_config_to_file(config: ApstraConfig, file_path: String) -> Result<(), String> {
    log::info!("Saving Apstra config to file: {}", file_path);
    ApstraConfigService::save_apstra_config_to_file(&config, &file_path)
}

#[command]
pub async fn save_user_apstra_config(config: ApstraConfig) -> Result<(), String> {
    log::info!("Saving user Apstra config to app data directory");
    let user_config_path = ApstraConfigService::get_user_apstra_config_path()?;
    ApstraConfigService::save_apstra_config_to_file(&config, user_config_path.to_str().unwrap())
}

#[command]
pub async fn load_user_apstra_config() -> Result<ApstraConfig, String> {
    log::info!("Loading user Apstra config from app data directory");
    let user_config_path = ApstraConfigService::get_user_apstra_config_path()?;
    ApstraConfigService::load_apstra_config_from_file(user_config_path.to_str().unwrap())
}

#[command]
pub async fn test_apstra_connection(config: ApstraConfig) -> Result<bool, String> {
    log::info!("Testing connection to Apstra controller at {}", config.get_base_url());
    ApstraConfigService::test_connection(&config)
}

#[command]
pub async fn get_apstra_config_with_defaults() -> Result<ApstraConfig, String> {
    log::info!("Loading Apstra config with user overrides");
    ApstraConfigService::get_default_config_with_user_overrides()
}