// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod services;
mod utils;

use commands::*;
use std::collections::HashMap;
use std::sync::Mutex;

// Simple greeting command for testing
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    env_logger::init();
    
    // Initialize API client state
    let api_client_state: commands::apstra_api_handler::ApiClientState = 
        Mutex::new(HashMap::new());
    
    tauri::Builder::default()
        .manage(api_client_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            upload_excel_file,
            parse_excel_sheet,
            validate_data,
            process_import_generic_system,
            get_processing_progress,
            cleanup_temp_file,
            load_default_conversion_map,
            load_conversion_map_from_file,
            save_conversion_map_to_file,
            get_user_conversion_map_path,
            save_user_conversion_map,
            load_user_conversion_map,
            create_conversion_map_info,
            convert_headers_with_map,
            update_conversion_mapping,
            remove_conversion_mapping,
            set_header_row,
            load_default_apstra_config,
            load_apstra_config_from_file,
            save_apstra_config_to_file,
            save_user_apstra_config,
            load_user_apstra_config,
            test_apstra_connection,
            get_apstra_config_with_defaults,
            apstra_login,
            apstra_search_systems,
            apstra_execute_query,
            apstra_is_authenticated,
            apstra_logout,
            apstra_dump_blueprint
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}