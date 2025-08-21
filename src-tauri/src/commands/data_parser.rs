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
    
    // Extract headers with merged cell handling
    let headers: Vec<String> = propagate_merged_cells_in_row(&worksheet_rows[header_row_idx])
        .iter()
        .map(|cell| cell.to_string().trim().to_string())
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
        
        // Propagate merged cell values for this row
        let row_with_merged_values = propagate_merged_cells_in_row(row);
        
        let row_data: HashMap<String, String> = row_with_merged_values.iter().enumerate()
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

/// Propagate merged cell values within a single row
/// 
/// In Excel, merged cells only have a value in the first cell of the merged range.
/// This function copies the value from the first non-empty cell to all subsequent 
/// empty cells until the next non-empty cell is encountered.
/// 
/// This handles the common Excel pattern where merged cells appear as:
/// ["Value1", "", "", "Value2", "", "Value3"]
/// and transforms it to:
/// ["Value1", "Value1", "Value1", "Value2", "Value2", "Value3"]
/// 
/// Leading empty cells (before any value) are left as-is.
fn propagate_merged_cells_in_row(row: &[DataType]) -> Vec<DataType> {
    let mut result = row.to_vec();
    let mut last_non_empty_value: Option<DataType> = None;
    
    for i in 0..result.len() {
        if !result[i].is_empty() {
            // Found a non-empty cell, use it as the reference value
            last_non_empty_value = Some(result[i].clone());
        } else if let Some(ref value) = last_non_empty_value {
            // Current cell is empty, but we have a previous non-empty value
            // This could be part of a merged cell range, so propagate the value
            result[i] = value.clone();
            log::trace!("Propagated merged cell value '{}' to position {}", value, i);
        }
        // If both current cell is empty AND no previous value, leave it empty
    }
    
    result
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
                .replace('\r', " ")  // Replace carriage returns with spaces
                .replace('\n', " ")  // Replace line feeds with spaces
                .split_whitespace()  // Split by any whitespace and rejoin with single spaces
                .collect::<Vec<&str>>()
                .join(" ");
            
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
            .replace('\r', " ")  // Replace carriage returns with spaces
            .replace('\n', " ")  // Replace line feeds with spaces
            .split_whitespace()  // Split by any whitespace and rejoin with single spaces
            .collect::<Vec<&str>>()
            .join(" ")
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
            .filter(|value| !value.trim().is_empty())  // Check trimmed value
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::models::conversion_map::ConversionMap;

    fn create_test_conversion_map() -> ConversionMap {
        let mut mappings = HashMap::new();
        mappings.insert("Switch Name".to_string(), "switch_label".to_string());
        mappings.insert("Port".to_string(), "switch_ifname".to_string());
        mappings.insert("Host Name".to_string(), "server_label".to_string());
        mappings.insert("Slot/Port".to_string(), "server_ifname".to_string());
        mappings.insert("Speed\n(GB)".to_string(), "link_speed".to_string());
        mappings.insert("External".to_string(), "is_external".to_string());
        
        ConversionMap::new(Some(2), mappings)
    }

    fn create_test_headers() -> Vec<String> {
        vec![
            "Switch Name".to_string(),
            "Port".to_string(), 
            "Host Name".to_string(),
            "Slot/Port".to_string(),
            "Speed\n(GB)".to_string(),
            "External".to_string(),
        ]
    }

    fn create_test_row_data() -> HashMap<String, String> {
        let mut row_data = HashMap::new();
        row_data.insert("Switch Name".to_string(), "switch01".to_string());
        row_data.insert("Port".to_string(), "xe-0/0/1".to_string());
        row_data.insert("Host Name".to_string(), "server01".to_string());
        row_data.insert("Slot/Port".to_string(), "eth0".to_string());
        row_data.insert("Speed\n(GB)".to_string(), "10".to_string());
        row_data.insert("External".to_string(), "false".to_string());
        row_data
    }

    #[test]
    fn test_create_conversion_field_mapping_exact_match() {
        let headers = create_test_headers();
        let conversion_map = create_test_conversion_map();
        
        let field_map = create_conversion_field_mapping(&headers, &conversion_map.mappings);
        
        // Verify exact matches
        assert_eq!(field_map.get("switch_label"), Some(&"Switch Name".to_string()));
        assert_eq!(field_map.get("switch_ifname"), Some(&"Port".to_string()));
        assert_eq!(field_map.get("server_label"), Some(&"Host Name".to_string()));
        assert_eq!(field_map.get("server_ifname"), Some(&"Slot/Port".to_string()));
        assert_eq!(field_map.get("link_speed"), Some(&"Speed\n(GB)".to_string()));
        assert_eq!(field_map.get("is_external"), Some(&"External".to_string()));
    }

    #[test]
    fn test_create_conversion_field_mapping_normalized_headers() {
        let headers = vec![
            "SWITCH NAME".to_string(),
            "  port  ".to_string(), 
            "Host\r\nName".to_string(), // With carriage return + line feed (more realistic)
            "slot/port".to_string(), // Different case
        ];
        
        let conversion_map = create_test_conversion_map();
        let field_map = create_conversion_field_mapping(&headers, &conversion_map.mappings);
        
        // Verify normalization works - should match after case/whitespace/line ending normalization
        assert_eq!(field_map.get("switch_label"), Some(&"SWITCH NAME".to_string()));
        assert_eq!(field_map.get("switch_ifname"), Some(&"  port  ".to_string()));
        // Host\r\nName should match "Host Name" after normalization (line endings removed)
        assert_eq!(field_map.get("server_label"), Some(&"Host\r\nName".to_string()));
        assert_eq!(field_map.get("server_ifname"), Some(&"slot/port".to_string()));
    }

    #[test]
    fn test_create_field_mapping_with_variations() {
        let headers = vec![
            "Switch".to_string(), // Should match switch_label variation
            "Interface".to_string(), // Should match switch_ifname variation
            "Server".to_string(), // Should match server_label variation
            "NIC".to_string(), // Should match server_ifname variation
        ];
        
        let field_map = create_field_mapping(&headers);
        
        // Verify field variations work
        assert_eq!(field_map.get("switch_label"), Some(&"Switch".to_string()));
        assert_eq!(field_map.get("switch_ifname"), Some(&"Interface".to_string()));
        assert_eq!(field_map.get("server_label"), Some(&"Server".to_string()));
        assert_eq!(field_map.get("server_ifname"), Some(&"NIC".to_string()));
    }

    #[test]
    fn test_convert_to_network_config_row_valid() {
        let row_data = create_test_row_data();
        let conversion_map = create_test_conversion_map();
        let field_map = create_conversion_field_mapping(&create_test_headers(), &conversion_map.mappings);
        
        let network_row = convert_to_network_config_row(&row_data, &field_map);
        
        assert!(network_row.is_some());
        let row = network_row.unwrap();
        
        assert_eq!(row.switch_label, Some("switch01".to_string()));
        assert_eq!(row.switch_ifname, Some("xe-0/0/1".to_string()));
        assert_eq!(row.server_label, Some("server01".to_string()));
        assert_eq!(row.server_ifname, Some("eth0".to_string()));
        assert_eq!(row.link_speed, Some("10".to_string()));
        assert_eq!(row.is_external, Some(false));
        assert_eq!(row.blueprint, None); // Blueprint should always be None
    }

    #[test]
    fn test_convert_to_network_config_row_missing_required_fields() {
        let mut row_data = HashMap::new();
        row_data.insert("Host Name".to_string(), "server01".to_string());
        // Missing both switch_label and switch_ifname
        
        let conversion_map = create_test_conversion_map();
        let field_map = create_conversion_field_mapping(&create_test_headers(), &conversion_map.mappings);
        
        let network_row = convert_to_network_config_row(&row_data, &field_map);
        
        assert!(network_row.is_none()); // Should be None due to missing required fields
    }

    #[test]
    fn test_convert_to_network_config_row_empty_values() {
        let mut row_data = HashMap::new();
        row_data.insert("Switch Name".to_string(), "switch01".to_string());
        row_data.insert("Port".to_string(), "xe-0/0/1".to_string());
        row_data.insert("Host Name".to_string(), "".to_string()); // Empty value
        row_data.insert("Slot/Port".to_string(), "   ".to_string()); // Whitespace only
        
        let conversion_map = create_test_conversion_map();
        let field_map = create_conversion_field_mapping(&create_test_headers(), &conversion_map.mappings);
        
        let network_row = convert_to_network_config_row(&row_data, &field_map);
        
        assert!(network_row.is_some());
        let row = network_row.unwrap();
        
        assert_eq!(row.switch_label, Some("switch01".to_string()));
        assert_eq!(row.switch_ifname, Some("xe-0/0/1".to_string()));
        assert_eq!(row.server_label, None); // Empty value should be None
        assert_eq!(row.server_ifname, None); // Whitespace-only should be None
    }

    #[test]
    fn test_boolean_field_parsing() {
        let mut row_data = HashMap::new();
        row_data.insert("Switch Name".to_string(), "switch01".to_string());
        row_data.insert("Port".to_string(), "xe-0/0/1".to_string());
        row_data.insert("External".to_string(), "true".to_string());
        
        let conversion_map = create_test_conversion_map();
        let field_map = create_conversion_field_mapping(&create_test_headers(), &conversion_map.mappings);
        
        let network_row = convert_to_network_config_row(&row_data, &field_map);
        let row = network_row.unwrap();
        assert_eq!(row.is_external, Some(true));
        
        // Test different boolean representations
        let test_cases = vec![
            ("true", Some(true)),
            ("TRUE", Some(true)),
            ("yes", Some(true)),
            ("YES", Some(true)),
            ("1", Some(true)),
            ("y", Some(true)),
            ("false", Some(false)),
            ("FALSE", Some(false)),
            ("no", Some(false)),
            ("NO", Some(false)),
            ("0", Some(false)),
            ("n", Some(false)),
            ("maybe", None),
            ("invalid", None),
        ];
        
        for (input, expected) in test_cases {
            let mut test_row_data = row_data.clone();
            test_row_data.insert("External".to_string(), input.to_string());
            
            let test_network_row = convert_to_network_config_row(&test_row_data, &field_map);
            let test_row = test_network_row.unwrap();
            assert_eq!(test_row.is_external, expected, "Failed for input: '{}'", input);
        }
    }

    #[test]
    fn test_header_priority_matching() {
        // Test that longer, more specific headers are preferred
        let headers = vec![
            "Slot".to_string(), 
            "Slot/Port".to_string(), // This should be preferred for server_ifname
        ];
        
        let field_map = create_field_mapping(&headers);
        
        // Should prefer "Slot/Port" over "Slot" for server_ifname
        assert_eq!(field_map.get("server_ifname"), Some(&"Slot/Port".to_string()));
    }

    #[test]
    fn test_normalization_function() {
        let normalize_header = |header: &str| -> String {
            header.to_lowercase()
                .replace('\r', " ")  // Replace with spaces
                .replace('\n', " ")  // Replace with spaces
                .split_whitespace()  // Split by any whitespace and rejoin with single spaces
                .collect::<Vec<&str>>()
                .join(" ")
        };
        
        // Test that these normalize to the same value
        let normalized1 = normalize_header("Host\r\nName");
        let normalized2 = normalize_header("Host Name");
        
        println!("'Host\\r\\nName' normalizes to: '{}'", normalized1);
        println!("'Host Name' normalizes to: '{}'", normalized2);
        
        assert_eq!(normalized1, normalized2, "Headers should normalize to the same value");
    }

    #[test]
    fn test_propagate_merged_cells_in_row() {
        use calamine::DataType;
        
        // Create a test row with merged cells pattern
        // "Server1", "", "", "Port1", "", "Speed1"
        // This simulates merged cells where Server1 spans 3 columns and Port1 spans 2 columns
        let test_row = vec![
            DataType::String("Server1".to_string()),  // First cell of merged range
            DataType::Empty,                           // Empty cell (part of merge)
            DataType::Empty,                           // Empty cell (part of merge)
            DataType::String("Port1".to_string()),     // Next non-empty cell
            DataType::Empty,                           // Empty cell (part of merge)
            DataType::String("Speed1".to_string()),    // Standalone cell
        ];
        
        let result = propagate_merged_cells_in_row(&test_row);
        
        // Verify that merged cell values are propagated
        assert_eq!(result[0].to_string(), "Server1");
        assert_eq!(result[1].to_string(), "Server1"); // Should be propagated
        assert_eq!(result[2].to_string(), "Server1"); // Should be propagated
        assert_eq!(result[3].to_string(), "Port1");
        assert_eq!(result[4].to_string(), "Port1");   // Should be propagated
        assert_eq!(result[5].to_string(), "Speed1");
    }

    #[test]
    fn test_propagate_merged_cells_with_leading_empty() {
        use calamine::DataType;
        
        // Test row that starts with empty cells
        let test_row = vec![
            DataType::Empty,                          // Leading empty cell
            DataType::Empty,                          // Leading empty cell
            DataType::String("Value1".to_string()),   // First non-empty
            DataType::Empty,                          // Should be propagated
            DataType::String("Value2".to_string()),   // New value
        ];
        
        let result = propagate_merged_cells_in_row(&test_row);
        
        // Leading empty cells should remain empty
        assert!(result[0].is_empty());
        assert!(result[1].is_empty());
        assert_eq!(result[2].to_string(), "Value1");
        assert_eq!(result[3].to_string(), "Value1"); // Should be propagated
        assert_eq!(result[4].to_string(), "Value2");
    }
}