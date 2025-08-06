use tauri::command;
use crate::models::network_config::NetworkConfigRow;
use crate::models::conversion_map::ConversionMap;
use calamine::{Reader, Xlsx, open_workbook, Range, DataType};
use std::collections::HashMap;

#[command]
pub async fn parse_excel_sheet(file_path: String, sheet_name: String, conversion_map: Option<ConversionMap>) -> Result<Vec<NetworkConfigRow>, String> {
    log::info!("Parsing sheet '{}' from file: {}", sheet_name, file_path);
    
    // Use provided conversion map or load default
    let effective_conversion_map = if let Some(map) = conversion_map {
        Some(map)
    } else {
        match crate::services::conversion_service::ConversionService::load_default_conversion_map() {
            Ok(default_map) => {
                log::info!("Using default conversion map");
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
        .map(|cell| cell.to_string().trim().to_lowercase())
        .collect();
    
    log::info!("Found headers: {:?}", headers);
    
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
                (header, cell.to_string().trim().to_string())
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
    
    // Define possible header variations for each field
    let header_variations = vec![
        ("blueprint", vec!["blueprint", "bp", "blueprint_name"]),
        ("server_label", vec!["server_label", "server", "server_name", "hostname"]),
        ("switch_label", vec!["switch_label", "switch", "switch_name", "device"]),
        ("switch_ifname", vec!["switch_ifname", "switch_interface", "switch_port", "port", "interface"]),
        ("server_ifname", vec!["server_ifname", "server_interface", "server_port", "nic"]),
        ("is_external", vec!["is_external", "external", "ext"]),
        ("server_tags", vec!["server_tags", "tags"]),
        ("link_group_ifname", vec!["link_group_ifname", "lag_name", "bond_name"]),
        ("link_group_lag_mode", vec!["link_group_lag_mode", "lag_mode", "bond_mode", "mode"]),
        ("link_group_ct_names", vec!["link_group_ct_names", "ct", "connectivity_template"]),
        ("link_group_tags", vec!["link_group_tags", "link_tags"]),
        ("link_speed", vec!["link_speed", "speed", "bandwidth"]),
        ("link_tags", vec!["link_tags", "tags"]),
        ("comment", vec!["comment", "comments", "description", "notes"]),
    ];
    
    for (field_name, variations) in header_variations {
        for header in headers {
            for variation in &variations {
                if header.contains(variation) || variation.contains(header) {
                    field_map.insert(field_name.to_string(), header.clone());
                    break;
                }
            }
        }
    }
    
    log::info!("Field mapping: {:?}", field_map);
    field_map
}

fn create_conversion_field_mapping(headers: &[String], conversion_mappings: &HashMap<String, String>) -> HashMap<String, String> {
    let mut field_map = HashMap::new();
    
    // Use conversion map to map Excel headers to target fields
    for header in headers {
        // Try exact match first
        if let Some(target_field) = conversion_mappings.get(header) {
            field_map.insert(target_field.clone(), header.clone());
        } else {
            // Try case-insensitive match
            for (excel_header, target_field) in conversion_mappings {
                if header.to_lowercase() == excel_header.to_lowercase() {
                    field_map.insert(target_field.clone(), header.clone());
                    break;
                }
            }
        }
    }
    
    log::info!("Conversion field mapping: {:?}", field_map);
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
            log::debug!("Field '{}' not found or empty. Field map: {:?}", field_name, field_map.get(field_name));
        }
        result
    };
    
    // Check if we have minimum required fields (switch_label and switch_ifname)
    let switch_label = get_field("switch_label");
    let switch_ifname = get_field("switch_ifname");
    
    log::debug!("Processing row - switch_label: {:?}, switch_ifname: {:?}", switch_label, switch_ifname);
    
    if switch_label.is_none() && switch_ifname.is_none() {
        log::debug!("Skipping row due to missing required fields");
        return None; // Skip rows without essential network info
    }
    
    Some(NetworkConfigRow {
        blueprint: get_field("blueprint"),
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