use tauri::command;
use calamine::{Reader, Xlsx, open_workbook};
use std::path::Path;

#[command]
pub async fn upload_excel_file(filePath: String) -> Result<Vec<String>, String> {
    let file_path = filePath; // Convert to snake_case for internal use
    log::info!("Processing Excel file: {}", file_path);
    
    // Verify file exists and has .xlsx extension
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }
    
    if !file_path.to_lowercase().ends_with(".xlsx") {
        return Err("File must be an Excel (.xlsx) file".to_string());
    }
    
    // Open and read the Excel file
    match open_workbook::<Xlsx<_>, _>(&file_path) {
        Ok(workbook) => {
            let sheet_names: Vec<String> = workbook.sheet_names().iter().map(|s| s.to_string()).collect();
            log::info!("Found {} sheets: {:?}", sheet_names.len(), sheet_names);
            Ok(sheet_names)
        }
        Err(e) => {
            let error_msg = format!("Failed to open Excel file: {}", e);
            log::error!("{}", error_msg);
            Err(error_msg)
        }
    }
}

#[command]
pub async fn cleanup_temp_file(file_id: String) -> Result<(), String> {
    log::info!("Cleaning up temporary file: {}", file_id);
    // TODO: Implement temporary file cleanup based on file_id
    // For now, just log the cleanup request
    Ok(())
}