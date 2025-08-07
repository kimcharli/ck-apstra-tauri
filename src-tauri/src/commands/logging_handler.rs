use tauri::command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub category: String,
    pub action: String,
    pub details: Option<serde_json::Value>,
    pub session_id: Option<String>,
}

#[command]
pub async fn send_backend_log(
    level: String,
    category: String, 
    action: String,
    details: Option<serde_json::Value>
) -> Result<(), String> {
    // This command allows backend to send logs to frontend
    // The actual implementation would need to emit an event to the frontend
    // For now, just log to Rust console
    match level.as_str() {
        "error" => log::error!("[{}] {}: {}", category, action, serde_json::to_string(&details).unwrap_or_default()),
        "warn" => log::warn!("[{}] {}: {}", category, action, serde_json::to_string(&details).unwrap_or_default()),
        "info" => log::info!("[{}] {}: {}", category, action, serde_json::to_string(&details).unwrap_or_default()),
        "debug" => log::debug!("[{}] {}: {}", category, action, serde_json::to_string(&details).unwrap_or_default()),
        _ => log::info!("[{}] {}: {}", category, action, serde_json::to_string(&details).unwrap_or_default()),
    }
    Ok(())
}