use tauri::command;
use crate::models::network_config::NetworkConfigRow;
use crate::models::conversion_map::ConversionMap;
use crate::commands::send_backend_log;
use calamine::{Reader, Xlsx, open_workbook, Range, DataType};
use std::collections::HashMap;

// Helper function to log to both Rust logging and frontend LoggingService
async fn log_debug_to_frontend(message: &str, details: Option<serde_json::Value>) {
    // Log to Rust console
    log::debug!("{}", message);
    
    // Also send to frontend logging service
    if let Err(e) = send_backend_log("debug".to_string(), "EXCEL_PARSING".to_string(), message.to_string(), details).await {
        log::warn!("Failed to send log to frontend: {}", e);
    }
}

async fn log_info_to_frontend(message: &str, details: Option<serde_json::Value>) {
    // Log to Rust console
    log::info!("{}", message);
    
    // Also send to frontend logging service
    if let Err(e) = send_backend_log("info".to_string(), "EXCEL_PARSING".to_string(), message.to_string(), details).await {
        log::warn!("Failed to send log to frontend: {}", e);
    }
}

async fn log_warn_to_frontend(message: &str, details: Option<serde_json::Value>) {
    // Log to Rust console
    log::warn!("{}", message);
    
    // Also send to frontend logging service
    if let Err(e) = send_backend_log("warn".to_string(), "EXCEL_PARSING".to_string(), message.to_string(), details).await {
        log::warn!("Failed to send log to frontend: {}", e);
    }
}

#[command]
pub async fn parse_excel_sheet(file_path: String, sheet_name: String, conversion_map: Option<ConversionMap>) -> Result<Vec<NetworkConfigRow>, String> {
    log::info!("Parsing sheet '{}' from file: {}", sheet_name, file_path);
    
    // Use provided conversion map or load default
    let effective_conversion_map = if let Some(map) = conversion_map {
        log::info!("Using provided conversion map with {} mappings", map.mappings.len());
        Some(map)
    } else {
        match crate::services::conversion_service::ConversionService::load_default_conversion_map() {
            Ok(default_map) => {
                log::info!("Using default conversion map with {} mappings, header_row: {:?}", 
                    default_map.mappings.len(), default_map.header_row);
                log::debug!("Default mappings: {:?}", default_map.mappings);
                Some(default_map)
            }
            Err(e) => {
                log::warn!("Failed to load default conversion map: {}, falling back to built-in logic", e);
                None
            }
        }
    };
    
    // Open the Excel file
    let mut workbook: Xlsx<_> = open_workbook(&file_path)
        .map_err(|e| format!("Failed to open Excel file: {}", e))?;
    
    // Get the specific worksheet
    let worksheet = workbook.worksheet_range(&sheet_name)
        .ok_or_else(|| format!("Sheet '{}' not found", sheet_name))?
        .map_err(|e| format!("Failed to read sheet '{}': {}", sheet_name, e))?;
    
    log::info!("Sheet dimensions: {}x{}", worksheet.get_size().0, worksheet.get_size().1);
    
    // Parse the worksheet data
    let parsed_data = parse_worksheet_data(&worksheet, effective_conversion_map.as_ref())?;
    
    log::info!("Parsed {} rows of data", parsed_data.len());
    Ok(parsed_data)
}

fn parse_worksheet_data(worksheet: &Range<DataType>, conversion_map: Option<&ConversionMap>) -> Result<Vec<NetworkConfigRow>, String> {
    let mut rows = Vec::new();
    
    // Get all rows from the worksheet
    let worksheet_rows: Vec<Vec<DataType>> = worksheet.rows().map(|row| row.to_vec()).collect();
    
    if worksheet_rows.is_empty() {
        return Ok(rows);
    }
    
    // Determine header row index from conversion map or find first non-empty row
    let header_row_idx = if let Some(conv_map) = conversion_map {
        (conv_map.header_row.unwrap_or(1).saturating_sub(1)) as usize // Convert 1-based to 0-based
    } else {
        worksheet_rows.iter()
            .position(|row| row.iter().any(|cell| !cell.is_empty()))
            .unwrap_or(0)
    };
    
    if header_row_idx >= worksheet_rows.len() {
        return Ok(rows);
    }
    
    // Extract headers
    let headers: Vec<String> = worksheet_rows[header_row_idx].iter()
        .map(|cell| cell.to_string().trim().to_string()) // Don't lowercase here, keep original case
        .collect();
    
    log::info!("Found headers (original case): {:?}", headers);
    log::info!("Header row index: {}", header_row_idx);
    
    // Add detailed debug logging for each header with byte representation
    for (i, header) in headers.iter().enumerate() {
        log::debug!("Header[{}]: '{}' (bytes: {:?})", i, header, header.as_bytes());
    }
    
    
    // Create field mapping using conversion map or default logic
    let field_map = if let Some(conv_map) = conversion_map {
        create_conversion_field_mapping(&headers, &conv_map.mappings)
    } else {
        create_field_mapping(&headers)
    };
    
    // Process data rows (skip header row)
    for (row_idx, row) in worksheet_rows.iter().enumerate().skip(header_row_idx + 1) {
        if row.iter().all(|cell| cell.is_empty()) {
            continue; // Skip empty rows
        }
        
        let row_data: HashMap<String, String> = row.iter().enumerate()
            .map(|(col_idx, cell)| {
                let header = headers.get(col_idx).cloned().unwrap_or_else(|| format!("col_{}", col_idx));
                let value = cell.to_string().trim().to_string();
                (header, value)
            })
            .collect();
        
        // Convert to NetworkConfigRow using field mapping
        if let Some(network_row) = convert_to_network_config_row(&row_data, &field_map) {
            rows.push(network_row);
        } else {
            log::warn!("Skipping row {} due to missing required fields", row_idx + 1);
        }
    }
    
    Ok(rows)
}

fn create_field_mapping(headers: &[String]) -> HashMap<String, String> {
    let mut field_map = HashMap::new();
    
    // Use default field variations if conversion map is not available
    let default_variations = ConversionMap::get_default_field_variations();
    
    // Sort headers by length (longer first) to prefer more specific matches
    let mut sorted_headers: Vec<&String> = headers.iter().collect();
    sorted_headers.sort_by_key(|h| std::cmp::Reverse(h.len()));
    
    for (field_name, variations) in default_variations {
        let mut field_matched = false;
        
        // Sort variations by length (longer first) to prefer more specific matches  
        let mut sorted_variations = variations.clone();
        sorted_variations.sort_by_key(|v| std::cmp::Reverse(v.len()));
        
        for header in &sorted_headers {
            if field_matched { break; }
            
            let header_lower = header.to_lowercase()
                .replace('\r', "")  // Remove carriage returns
                .replace('\n', "")  // Remove line feeds
                .trim().to_string();
            
            for variation in &sorted_variations {
                let variation_lower = variation.to_lowercase();
                
                // Prefer exact matches first
                if header_lower == variation_lower {
                    field_map.insert(field_name.clone(), (*header).clone());
                    log::info!("✅ EXACT FALLBACK MATCH: '{}' -> '{}' (via variation '{}')", header, field_name, variation);
                    field_matched = true;
                    break;
                } 
                // Then try partial matches, but only if no exact match found
                else if header_lower.contains(&variation_lower) || variation_lower.contains(&header_lower) {
                    // Only use partial match if we haven't found a better match already
                    if !field_map.contains_key(&field_name) {
                        field_map.insert(field_name.clone(), (*header).clone());
                        log::info!("✅ PARTIAL FALLBACK MATCH: '{}' -> '{}' (via variation '{}')", header, field_name, variation);
                    }
                }
            }
        }
    }
    
    log::info!("Fallback field mapping created {} mappings: {:?}", field_map.len(), field_map);
    field_map
}

fn create_conversion_field_mapping(headers: &[String], conversion_mappings: &HashMap<String, String>) -> HashMap<String, String> {
    let mut field_map = HashMap::new();
    
    // Helper function to normalize headers for comparison
    let normalize_header = |header: &str| -> String {
        header.to_lowercase()
            .replace('\r', "")  // Remove carriage returns
            .replace('\n', "")  // Remove line feeds
            .trim().to_string()
    };
    
    // Use conversion map to map Excel headers to target fields
    for header in headers {
        let normalized_header = normalize_header(header);
        log::debug!("Processing header: '{}' -> normalized: '{}'", header, normalized_header);
        
        // Try exact match first (after normalization)
        let mut found = false;
        for (excel_header, target_field) in conversion_mappings {
            let normalized_excel_header = normalize_header(excel_header);
            
            log::trace!("Comparing '{}' vs '{}' (normalized)", normalized_header, normalized_excel_header);
            
            if normalized_header == normalized_excel_header {
                field_map.insert(target_field.clone(), header.clone());
                log::info!("✅ EXACT MATCH: '{}' -> '{}' (normalized '{}' == '{}')", header, target_field, normalized_header, normalized_excel_header);
                found = true;
                break;
            }
        }
        
        // If no exact match found, try partial matching
        if !found {
            for (excel_header, target_field) in conversion_mappings {
                let normalized_excel_header = normalize_header(excel_header);
                
                if normalized_header.contains(&normalized_excel_header) || normalized_excel_header.contains(&normalized_header) {
                    field_map.insert(target_field.clone(), header.clone());
                    log::info!("✅ PARTIAL MATCH: '{}' -> '{}' (normalized '{}' contains '{}')", header, target_field, normalized_header, normalized_excel_header);
                    found = true;
                    break;
                }
            }
        }
        
        if !found {
            log::warn!("❌ NO MATCH FOUND for header: '{}'", header);
        }
    }
    
    // If no mappings found using conversion map, fall back to field variations
    if field_map.is_empty() {
        log::warn!("No mappings from conversion map, falling back to field variations");
        let default_variations = ConversionMap::get_default_field_variations();
        
        // Sort headers by length (longer first) for better matching
        let mut sorted_headers: Vec<&String> = headers.iter().collect();
        sorted_headers.sort_by_key(|h| std::cmp::Reverse(h.len()));
        
        for (field_name, variations) in &default_variations {
            let mut field_matched = false;
            
            // Sort variations by length (longer first) 
            let mut sorted_variations = variations.clone();
            sorted_variations.sort_by_key(|v| std::cmp::Reverse(v.len()));
            
            for header in &sorted_headers {
                if field_matched { break; }
                
                let normalized_header = normalize_header(header);
                
                for variation in &sorted_variations {
                    let variation_lower = variation.to_lowercase();
                    
                    // Prefer exact matches first
                    if normalized_header == variation_lower {
                        field_map.insert(field_name.clone(), (*header).clone());
                        log::info!("✅ EXACT VARIATION FALLBACK: '{}' -> '{}' (via variation '{}')", header, field_name, variation);
                        field_matched = true;
                        break;
                    }
                    // Then partial matches if no exact match found
                    else if !field_map.contains_key(field_name) && 
                           (normalized_header.contains(&variation_lower) || variation_lower.contains(&normalized_header)) {
                        field_map.insert(field_name.clone(), (*header).clone());
                        log::info!("✅ PARTIAL VARIATION FALLBACK: '{}' -> '{}' (via variation '{}')", header, field_name, variation);
                    }
                }
            }
        }
    }
    
    log::info!("Conversion field mapping created {} mappings: {:?}", field_map.len(), field_map);
    if field_map.is_empty() {
        log::warn!("NO FIELD MAPPINGS CREATED! Headers: {:?}", headers);
        log::warn!("Conversion mappings available: {:?}", conversion_mappings);
    }
    field_map
}

fn convert_to_network_config_row(
    row_data: &HashMap<String, String>,
    field_map: &HashMap<String, String>
) -> Option<NetworkConfigRow> {
    let get_field = |field_name: &str| -> Option<String> {
        let result = field_map.get(field_name)
            .and_then(|header| row_data.get(header))
            .filter(|value| !value.is_empty())
            .map(|s| s.to_string());
        
        if result.is_none() {
            log::debug!("Field '{}' not found or empty. Field map entry: {:?}, Row data for header: {:?}", 
                field_name, field_map.get(field_name), 
                field_map.get(field_name).and_then(|h| row_data.get(h)));
        }
        result
    };
    
    // Check if we have minimum required fields (switch_label and switch_ifname)
    let switch_label = get_field("switch_label");
    let switch_ifname = get_field("switch_ifname");
    
    log::debug!("Processing row - switch_label: {:?}, switch_ifname: {:?}", switch_label, switch_ifname);
    log::debug!("Available row data keys: {:?}", row_data.keys().collect::<Vec<_>>());
    log::debug!("Field map for switch fields: switch_label={:?}, switch_ifname={:?}", 
        field_map.get("switch_label"), field_map.get("switch_ifname"));
    
    if switch_label.is_none() && switch_ifname.is_none() {
        log::debug!("Skipping row due to missing required switch fields");
        return None; // Skip rows without essential network info
    }
    
    Some(NetworkConfigRow {
        blueprint: None, // Blueprint is determined by application context, not Excel input
        server_label: get_field("server_label"),
        is_external: get_field("is_external").and_then(|s| {
            match s.to_lowercase().as_str() {
                "true" | "yes" | "1" | "y" => Some(true),
                "false" | "no" | "0" | "n" => Some(false),
                _ => None,
            }
        }),
        server_tags: get_field("server_tags"),
        link_group_ifname: get_field("link_group_ifname"),
        link_group_lag_mode: get_field("link_group_lag_mode"),
        link_group_ct_names: get_field("link_group_ct_names"),
        link_group_tags: get_field("link_group_tags"),
        link_speed: get_field("link_speed"),
        server_ifname: get_field("server_ifname"),
        switch_label,
        switch_ifname,
        link_tags: get_field("link_tags"),
        comment: get_field("comment"),
    })
}

#[command]
pub async fn validate_data(data: Vec<NetworkConfigRow>) -> Result<Vec<NetworkConfigRow>, String> {
    log::info!("Validating {} rows of data", data.len());
    
    // TODO: Implement duplicate detection (same switch + switch_ifname)
    // TODO: Implement additional validation rules
    
    Ok(data)
}