use tauri::command;
use crate::models::{network_config::NetworkConfigRow, processing_result::ProcessingResult};

#[command]
pub async fn process_import_generic_system(data: Vec<NetworkConfigRow>) -> Result<ProcessingResult, String> {
    // TODO: Implement import-generic-system action processing
    Ok(ProcessingResult::default())
}

#[command]
pub async fn get_processing_progress(job_id: String) -> Result<f64, String> {
    // TODO: Implement progress tracking
    Ok(0.0)
}