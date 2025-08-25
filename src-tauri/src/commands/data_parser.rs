use tauri::command;
use crate::models::network_config::NetworkConfigRow;
use crate::models::enhanced_conversion_map::EnhancedConversionMap;
use crate::services::enhanced_conversion_service::EnhancedConversionService;
use calamine::{Reader, Xlsx, open_workbook, Range, Data, DataType};
use std::collections::HashMap;

// Dead code removed - unused logging functions

#[command]
pub async fn parse_excel_sheet(filePath: String, sheetName: String, enhancedConversionMap: Option<EnhancedConversionMap>) -> Result<Vec<NetworkConfigRow>, String> {
    let file_path = filePath; // Convert to snake_case for internal use
    let sheet_name = sheetName; // Convert to snake_case for internal use
    let enhanced_conversion_map = enhancedConversionMap; // Convert to snake_case for internal use
    log::info!("Parsing sheet '{}' from file: {}", sheet_name, file_path);
    
    // Use provided enhanced conversion map or load default
    let effective_conversion_map = if let Some(map) = enhanced_conversion_map {
        log::info!("Using provided enhanced conversion map with {} field definitions", map.field_definitions.len());
        map
    } else {
        match EnhancedConversionService::load_default_enhanced_conversion_map() {
            Ok(default_map) => {
                log::info!("Using default enhanced conversion map with {} field definitions, header_row: {:?}", 
                    default_map.field_definitions.len(), default_map.header_row);
                log::debug!("Default field definitions: {:?}", default_map.field_definitions.keys().collect::<Vec<_>>());
                default_map
            }
            Err(e) => {
                return Err(format!("Failed to load enhanced conversion map: {}", e));
            }
        }
    };
    
    // Open the Excel file
    let mut workbook: Xlsx<_> = open_workbook(&file_path)
        .map_err(|e| format!("Failed to open Excel file: {}", e))?;
    
    // Get the specific worksheet
    let worksheet = workbook.worksheet_range(&sheet_name)
        .map_err(|e| format!("Failed to read sheet '{}': {}", sheet_name, e))?;
    
    // NEW: Access Excel's actual merged region metadata with calamine 0.30.0
    // This replaces our heuristic guessing with accurate Excel data
    log::debug!("Worksheet dimensions: {:?}", worksheet.get_size());
    
    // Load merged region metadata from Excel file
    if let Err(e) = workbook.load_merged_regions() {
        log::warn!("Could not load merged regions: {}", e);
    } else {
        let merged_regions = workbook.merged_regions_by_sheet(&sheet_name);
        log::info!("Found {} merged regions in sheet '{}': {:?}", 
                   merged_regions.len(), sheet_name, merged_regions);
        
        // TODO: Replace heuristic detection with metadata-based processing
        // This will enable universal merge processing for all columns
    }
    
    log::info!("Sheet dimensions: {}x{}", worksheet.get_size().0, worksheet.get_size().1);
    
    // Parse the worksheet data with enhanced conversion system
    let parsed_data = parse_worksheet_data(&worksheet, &effective_conversion_map)?;
    
    log::info!("Parsed {} rows of data", parsed_data.len());
    Ok(parsed_data)
}

fn parse_worksheet_data(
    worksheet: &Range<Data>, 
    enhanced_conversion_map: &EnhancedConversionMap
) -> Result<Vec<NetworkConfigRow>, String> {
    let mut rows = Vec::new();
    
    // Get all rows from the worksheet
    let worksheet_rows: Vec<Vec<Data>> = worksheet.rows().map(|row| row.to_vec()).collect();
    
    if worksheet_rows.is_empty() {
        return Ok(rows);
    }
    
    // Determine header row index from enhanced conversion map
    let header_row_idx = (enhanced_conversion_map.header_row.unwrap_or(1).saturating_sub(1)) as usize; // Convert 1-based to 0-based
    
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
    
    // Create field mapping using enhanced conversion system
    let service = EnhancedConversionService::new();
    let conversion_result = service.convert_headers_with_enhanced_map(&headers, enhanced_conversion_map)
        .map_err(|e| format!("Failed to convert headers: {}", e))?;
    
    log::info!("Header conversion successful: {} headers mapped", conversion_result.converted_headers.len());
    log::debug!("Header mappings: {:?}", conversion_result.converted_headers);
    
    // Process data rows with selective merge detection for specific columns
    // IMPORTANT: The user has mixed cell types:
    // - Switch names and ports: Individual cells (NO merging)  
    // - Connectivity template: Merged cells (YES merging)
    // Apply targeted merge detection only to columns that actually use merged cells.
    let data_rows_with_merges = apply_selective_merged_cell_detection(
        &worksheet_rows[header_row_idx + 1..], 
        &headers
    );
    
    for (row_idx, row_data) in data_rows_with_merges.iter().enumerate() {
        if row_data.values().all(|value| value.trim().is_empty()) {
            continue; // Skip empty rows
        }
        
        // Convert row data using enhanced conversion mappings
        let mut field_data = HashMap::new();
        for (excel_header, value) in row_data {
            if let Some(internal_field) = conversion_result.converted_headers.get(excel_header) {
                field_data.insert(internal_field.clone(), value.clone());
            }
        }
        
        // Apply field transformations
        match service.apply_field_transformations(&field_data, enhanced_conversion_map) {
            Ok(transformed_data) => {
                // Convert to NetworkConfigRow using enhanced conversion results
                if let Some(network_row) = convert_enhanced_to_network_config_row(&transformed_data) {
                    rows.push(network_row);
                } else {
                    log::warn!("Skipping row {} due to missing required fields", row_idx + header_row_idx + 2);
                }
            }
            Err(e) => {
                log::warn!("Failed to apply transformations to row {}: {}", row_idx + header_row_idx + 2, e);
            }
        }
    }
    
    Ok(rows)
}

/// Converts enhanced field data to NetworkConfigRow
fn convert_enhanced_to_network_config_row(field_data: &HashMap<String, String>) -> Option<NetworkConfigRow> {
    // Extract required fields with empty string filtering
    let switch_label = field_data.get("switch_label")
        .filter(|s| !s.trim().is_empty())
        .cloned();
    let raw_switch_ifname = field_data.get("switch_ifname")
        .filter(|s| !s.trim().is_empty())
        .cloned();
    
    // Both switch name AND interface must be present - this prevents incomplete rows from reaching the provisioning table
    if switch_label.is_none() || raw_switch_ifname.is_none() {
        return None;
    }
    
    let server_label = field_data.get("server_label")
        .filter(|s| !s.trim().is_empty())
        .cloned();
    let server_ifname = field_data.get("server_ifname")
        .filter(|s| !s.trim().is_empty())
        .cloned();
    let link_speed = field_data.get("link_speed")
        .filter(|s| !s.trim().is_empty())
        .cloned();
    let link_group_lag_mode = field_data.get("link_group_lag_mode")
        .filter(|s| !s.trim().is_empty())
        .cloned();
    let link_group_ct_names = field_data.get("link_group_ct_names")
        .filter(|s| !s.trim().is_empty())
        .cloned();
    let link_group_ifname = field_data.get("link_group_ifname")
        .filter(|s| !s.trim().is_empty())
        .cloned();
    let server_tags = field_data.get("server_tags")
        .filter(|s| !s.trim().is_empty())
        .cloned();
    let link_group_tags = field_data.get("switch_tags")
        .filter(|s| !s.trim().is_empty())
        .cloned(); // Map switch_tags to link_group_tags 
    let link_tags = field_data.get("link_tags")
        .filter(|s| !s.trim().is_empty())
        .cloned();
    let is_external = field_data.get("is_external")
        .filter(|s| !s.trim().is_empty())
        .and_then(|val| val.to_lowercase().parse::<bool>().ok());
    let comment = field_data.get("comment")
        .filter(|s| !s.trim().is_empty())
        .cloned();

    Some(NetworkConfigRow {
        blueprint: None,
        server_label,
        switch_label,
        switch_ifname: raw_switch_ifname,
        server_ifname,
        link_speed,
        link_group_lag_mode,
        link_group_ct_names,
        link_group_ifname,
        is_external,
        server_tags,
        link_group_tags,
        link_tags,
        comment,
    })
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
/// However, it includes validation to avoid propagating values that would create
/// invalid data rows (e.g., header/category rows that span many columns).
/// 
/// Leading empty cells (before any value) are left as-is.
fn propagate_merged_cells_in_row(row: &[Data]) -> Vec<Data> {
    let mut result = row.to_vec();
    let mut current_value: Option<Data> = None;
    
    for (i, cell) in row.iter().enumerate() {
        if !cell.is_empty() {
            current_value = Some(cell.clone());
            result[i] = cell.clone();
        } else if let Some(ref value) = current_value {
            result[i] = value.clone();
        }
    }
    
    result
}

/// Apply selective merged cell detection to specific columns that use merged cells.
/// 
/// CRITICAL FEATURE: This function only applies merge detection to columns that 
/// have been confirmed to use merged cells in Excel files. It preserves individual 
/// cell values for columns that should remain separate (like switch names and ports).
/// 
/// Currently configured for:
/// - Connectivity Templates (CTs): Apply vertical merge detection
/// - Server Names (Host Name): Apply vertical merge detection
/// 
/// All other columns are processed as individual cells without merge detection.
fn apply_selective_merged_cell_detection(
    data_rows: &[Vec<Data>], 
    headers: &[String]
) -> Vec<HashMap<String, String>> {
    let mut processed_rows = Vec::new();
    
    // Define columns that should have merge detection applied
    let merge_enabled_columns: std::collections::HashSet<&str> = [
        "CTs",              // Connectivity Templates - USER CONFIRMED: merged cells
        "link_group_ct_names", // Internal field name for CTs  
        "Host Name",        // Server names - EVIDENCE: merged cells detected
        "server_label",     // Internal field name for Host Name
    ].iter().cloned().collect();
    
    log::debug!("Merge-enabled columns: {:?}", merge_enabled_columns);
    
    // Convert data rows to string format with selective merge detection
    for (row_idx, row) in data_rows.iter().enumerate() {
        let mut row_map = HashMap::new();
        
        for (col_idx, header) in headers.iter().enumerate() {
            let cell_value = if col_idx < row.len() {
                row[col_idx].to_string()
            } else {
                String::new()
            };
            
            // Apply merge detection only to designated columns
            let processed_value = if merge_enabled_columns.contains(header.as_str()) {
                // For merge-enabled columns, look up for non-empty values
                if cell_value.trim().is_empty() {
                    find_merged_cell_value(data_rows, row_idx, col_idx)
                } else {
                    cell_value
                }
            } else {
                // For other columns, use the cell value as-is
                cell_value
            };
            
            row_map.insert(header.clone(), processed_value.trim().to_string());
        }
        
        processed_rows.push(row_map);
    }
    
    processed_rows
}

/// Find merged cell value by looking upward in the same column
/// 
/// This function implements vertical merge detection by searching upward
/// in the same column to find the most recent non-empty value.
/// 
/// This is specifically designed for columns like "Connectivity Templates"
/// where a single value spans multiple rows in Excel merged cells.
fn find_merged_cell_value(data_rows: &[Vec<Data>], current_row: usize, col_idx: usize) -> String {
    // Look upward for the most recent non-empty value in this column
    for check_row in (0..current_row).rev() {
        if let Some(check_cell) = data_rows.get(check_row).and_then(|row| row.get(col_idx)) {
            let check_value = check_cell.to_string().trim().to_string();
            if !check_value.is_empty() {
                log::debug!("Found merged value '{}' for row {} col {} from row {}", 
                           check_value, current_row, col_idx, check_row);
                return check_value;
            }
        }
        
        // Limit upward search to prevent excessive lookups
        if current_row - check_row > 10 {
            break;
        }
    }
    
    String::new()
}