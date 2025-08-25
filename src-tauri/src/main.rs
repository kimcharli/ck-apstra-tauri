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
    
    // Initialize enhanced conversion state
    let enhanced_conversion_state = commands::enhanced_conversion_handler::EnhancedConversionState::default();
    
    tauri::Builder::default()
        .manage(api_client_state)
        .manage(enhanced_conversion_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            upload_excel_file,
            parse_excel_sheet,
            process_import_generic_system,
            get_processing_progress,
            cleanup_temp_file,
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
            apstra_dump_blueprint,
            load_apstra_queries,
            send_backend_log,
            // Enhanced Conversion System Commands
            load_enhanced_conversion_map,
            save_enhanced_conversion_map,
            convert_headers_enhanced,
            apply_field_transformations,
            validate_field_values,
            extract_api_data,
            generate_table_columns,
            migrate_simple_to_enhanced,
            get_field_definition,
            update_field_definition,
            remove_field_definition,
            test_transformation_rule,
            validate_enhanced_conversion_map,
            get_available_transformations,
            create_default_field_definition
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}