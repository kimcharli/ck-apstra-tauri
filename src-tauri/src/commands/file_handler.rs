use tauri::command;

#[command]
pub async fn upload_excel_file(file_path: String) -> Result<Vec<String>, String> {
    // TODO: Implement Excel file upload and return sheet names
    Ok(vec!["Sheet1".to_string(), "Sheet2".to_string()])
}

#[command]
pub async fn cleanup_temp_file(file_id: String) -> Result<(), String> {
    // TODO: Implement temporary file cleanup
    Ok(())
}