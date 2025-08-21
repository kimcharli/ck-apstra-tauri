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
    
    // Parse the worksheet data with intelligent merged cell handling
    let parsed_data = parse_worksheet_data(&worksheet, effective_conversion_map.as_ref())?;
    
    log::info!("Parsed {} rows of data", parsed_data.len());
    Ok(parsed_data)
}

fn parse_worksheet_data(
    worksheet: &Range<DataType>, 
    conversion_map: Option<&ConversionMap>
) -> Result<Vec<NetworkConfigRow>, String> {
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
    
    // Process data rows with intelligent merged cell detection  
    let data_rows_with_merges = apply_intelligent_merged_cell_detection(
        &worksheet_rows[header_row_idx + 1..], 
        &headers
    );
    
    for (row_idx, row_data) in data_rows_with_merges.iter().enumerate() {
        if row_data.values().all(|value| value.trim().is_empty()) {
            continue; // Skip empty rows
        }
        
        // Convert to NetworkConfigRow using field mapping
        if let Some(network_row) = convert_to_network_config_row(row_data, &field_map) {
            rows.push(network_row);
        } else {
            log::warn!("Skipping row {} due to missing required fields", row_idx + header_row_idx + 2);
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
/// However, it includes validation to avoid propagating values that would create
/// invalid data rows (e.g., header/category rows that span many columns).
/// 
/// Leading empty cells (before any value) are left as-is.
fn propagate_merged_cells_in_row(row: &[DataType]) -> Vec<DataType> {
    let mut result = row.to_vec();
    
    // First check if this looks like a header/category row that shouldn't be propagated
    // Count non-empty cells vs total cells - if too few non-empty cells, it might be a category row
    let non_empty_count = row.iter().filter(|cell| !cell.is_empty()).count();
    let total_cells = row.len();
    
    // If less than 30% of cells have data and there are many columns, 
    // this is likely a category/header row that shouldn't be propagated
    if total_cells > 5 && (non_empty_count as f32 / total_cells as f32) < 0.3 {
        log::debug!("Row appears to be category/header row ({}/{} non-empty), skipping propagation", 
                   non_empty_count, total_cells);
        return result; // Return original row without propagation
    }
    
    let mut last_non_empty_value: Option<DataType> = None;
    let mut propagation_start_index: Option<usize> = None;
    
    for i in 0..result.len() {
        if !result[i].is_empty() {
            // Found a non-empty cell, use it as the reference value
            last_non_empty_value = Some(result[i].clone());
            propagation_start_index = Some(i);
        } else if let Some(ref value) = last_non_empty_value {
            if let Some(start_idx) = propagation_start_index {
                // Only propagate within reasonable distance (max 3-4 cells)
                // to avoid spreading values too far across the row
                let distance = i - start_idx;
                if distance <= 3 {
                    result[i] = value.clone();
                    log::trace!("Propagated merged cell value '{}' to position {} (distance: {})", 
                               value, i, distance);
                } else {
                    // Too far from original value, likely a different section
                    last_non_empty_value = None;
                    propagation_start_index = None;
                }
            }
        }
        // If both current cell is empty AND no previous value, leave it empty
    }
    
    result
}

/// Apply intelligent merged cell detection to data rows
/// 
/// Since we can't access Excel's merged region metadata directly in this calamine version,
/// we use intelligent heuristics to detect and handle merged cells:
/// 
/// 1. **Vertical merges**: Values that should carry down to subsequent rows (common for server names)
/// 2. **Horizontal merges**: Values that should spread to adjacent empty cells (less common in data)
/// 3. **Conservative approach**: Only apply merges when patterns are clear and safe
/// 
/// The algorithm prioritizes vertical propagation (common in network config data) over 
/// horizontal propagation to avoid false positives.
fn apply_intelligent_merged_cell_detection(
    data_rows: &[Vec<DataType>],
    headers: &[String]
) -> Vec<HashMap<String, String>> {
    let mut result = Vec::new();
    let mut column_carry_values: Vec<Option<String>> = vec![None; headers.len()];
    
    for (row_idx, row) in data_rows.iter().enumerate() {
        // Convert row to string values
        let mut row_values: Vec<String> = row.iter()
            .map(|cell| cell.to_string().trim().to_string())
            .collect();
        
        // Apply intelligent merge detection
        for (col_idx, value) in row_values.iter_mut().enumerate() {
            if !value.is_empty() {
                // Non-empty cell - update vertical carry value for future rows
                column_carry_values[col_idx] = Some(value.clone());
                log::trace!("Updated carry value for column {} at row {}: '{}'", col_idx, row_idx, value);
            } else {
                // Empty cell - apply vertical merge if available (prioritized for server names)
                if let Some(ref v_value) = column_carry_values[col_idx] {
                    *value = v_value.clone();
                    log::trace!("Applied vertical merge to column {} at row {}: '{}'", col_idx, row_idx, value);
                }
                // Note: We're not applying horizontal merges here to avoid the issues we had
                // Horizontal merges in network config data are less common and more error-prone
            }
        }
        
        // Convert to HashMap with headers
        let mut row_data = HashMap::new();
        for (col_idx, value) in row_values.iter().enumerate() {
            let header = headers.get(col_idx).cloned().unwrap_or_else(|| format!("col_{}", col_idx));
            row_data.insert(header, value.clone());
        }
        
        result.push(row_data);
    }
    
    result
}

/// Determine if horizontal merge should be applied to a specific column
/// 
/// This function helps avoid inappropriate horizontal propagation by checking
/// if the horizontal merge seems like a legitimate Excel merged cell pattern.
fn should_apply_horizontal_merge(row_with_horizontal: &[DataType], col_idx: usize) -> bool {
    // For now, use the same logic as the original propagate_merged_cells_in_row
    // but be more conservative - only allow horizontal merge if it passes the category row check
    
    let non_empty_count = row_with_horizontal.iter().filter(|cell| !cell.is_empty()).count();
    let total_cells = row_with_horizontal.len();
    
    // If this looks like a category row (too few non-empty cells), don't do horizontal propagation
    if total_cells > 5 && (non_empty_count as f32 / total_cells as f32) < 0.3 {
        return false;
    }
    
    // Otherwise, allow horizontal propagation if within distance limit
    // Find the nearest non-empty cell to the left
    let mut distance = 0;
    for i in (0..col_idx).rev() {
        distance += 1;
        if !row_with_horizontal[i].is_empty() {
            return distance <= 3; // Within reasonable distance
        }
        if distance > 3 {
            break;
        }
    }
    
    false // No source cell found within reasonable distance
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

pub fn create_conversion_field_mapping(headers: &[String], conversion_mappings: &HashMap<String, String>) -> HashMap<String, String> {
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
    
    // Sort conversion mappings by specificity (longer keys first) to prioritize exact matches
    let mut sorted_mappings: Vec<_> = conversion_mappings.iter().collect();
    sorted_mappings.sort_by_key(|(excel_header, _)| std::cmp::Reverse(excel_header.len()));
    
    // PHASE 1: Process ALL exact matches first (absolute priority)
    for header in headers {
        let normalized_header = normalize_header(header);
        log::debug!("Phase 1 - Processing header for exact match: '{}' -> normalized: '{}'", header, normalized_header);
        
        // Try exact match across all conversion mappings
        for (excel_header, target_field) in &sorted_mappings {
            let normalized_excel_header = normalize_header(excel_header);
            
            if normalized_header == normalized_excel_header {
                // Only map if this field hasn't been mapped already
                if !field_map.contains_key(*target_field) {
                    field_map.insert(target_field.to_string(), header.clone());
                    log::info!("✅ EXACT MATCH (Phase 1): '{}' -> '{}' (normalized '{}' == '{}')", header, target_field, normalized_header, normalized_excel_header);
                } else {
                    log::debug!("Skipping exact mapping '{}' -> '{}' because field already mapped to '{}'", header, target_field, field_map.get(*target_field).unwrap());
                }
                break; // Found exact match, no need to check other mappings for this header
            }
        }
    }
    
    // PHASE 2: Process partial matches only for unmapped headers
    for header in headers {
        let normalized_header = normalize_header(header);
        
        // Skip if this header was already mapped in Phase 1
        let already_mapped = field_map.values().any(|mapped_header| mapped_header == header);
        if already_mapped {
            log::debug!("Phase 2 - Skipping header '{}' (already mapped in exact match phase)", header);
            continue;
        }
        
        log::debug!("Phase 2 - Processing header for partial match: '{}' -> normalized: '{}'", header, normalized_header);
        
        // Try partial matching - longer mappings first
        let mut found = false;
        for (excel_header, target_field) in &sorted_mappings {
            let normalized_excel_header = normalize_header(excel_header);
            
            if normalized_header.contains(&normalized_excel_header) || normalized_excel_header.contains(&normalized_header) {
                // Only map if this field hasn't been mapped to any header yet
                if !field_map.contains_key(*target_field) {
                    field_map.insert(target_field.to_string(), header.clone());
                    log::info!("✅ PARTIAL MATCH (Phase 2): '{}' -> '{}' (normalized '{}' contains '{}')", header, target_field, normalized_header, normalized_excel_header);
                } else {
                    log::debug!("Skipping partial mapping '{}' -> '{}' because field already mapped to '{}'", header, target_field, field_map.get(*target_field).unwrap());
                }
                found = true;
                break;
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

/// Normalize link speed values to standard format
/// 
/// Converts various speed formats to the standard "XG" format:
/// - "25GB" -> "25G"
/// - "25 GB" -> "25G"
/// - "25Gbps" -> "25G"  
/// - "25 Gbps" -> "25G"
/// - "10GB" -> "10G"
/// - "1GB" -> "1G"
/// - "100MB" -> "100M"
/// 
/// This prevents issues like "25GB Gbps" appearing in the UI.
fn normalize_link_speed(speed: &str) -> String {
    let speed = speed.trim().to_lowercase();
    
    // Check what unit the original speed had
    let is_mbps = speed.contains("mbps") || speed.contains("mb");
    let is_gbps = speed.contains("gbps") || speed.contains("gb");
    
    // Remove common suffixes and normalize to standard format
    let speed = speed
        .replace("gbps", "")
        .replace("mbps", "")
        .replace("gb", "")
        .replace("mb", "");
    
    // Remove all whitespace to get just the numeric part
    let numeric_part: String = speed.chars().filter(|c| !c.is_whitespace()).collect();
    
    // Determine the appropriate unit based on original format
    if is_mbps {
        format!("{}M", numeric_part)
    } else if is_gbps {
        format!("{}G", numeric_part)
    } else if numeric_part.chars().all(|c| c.is_ascii_digit()) && !numeric_part.is_empty() {
        // Pure number, assume GB
        format!("{}G", numeric_part)
    } else {
        // Already normalized (ends with G or M) - just uppercase it
        let mut chars: Vec<char> = numeric_part.chars().collect();
        if let Some(last_char) = chars.last_mut() {
            if *last_char == 'g' || *last_char == 'm' {
                *last_char = last_char.to_uppercase().next().unwrap_or(*last_char);
            }
        }
        chars.into_iter().collect()
    }
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
        link_speed: get_field("link_speed").map(|speed| normalize_link_speed(&speed)),
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
        assert_eq!(row.link_speed, Some("10G".to_string()));
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

    #[test]
    fn test_propagate_merged_cells_category_row_detection() {
        use calamine::DataType;
        
        // Test category/header row that shouldn't be propagated
        // This simulates "Linux RHEL8.7" in first cell with many empty cells after
        let category_row = vec![
            DataType::String("Linux RHEL8.7".to_string()), // Category header
            DataType::Empty,                                // Empty
            DataType::Empty,                                // Empty  
            DataType::Empty,                                // Empty
            DataType::Empty,                                // Empty
            DataType::Empty,                                // Empty
            DataType::Empty,                                // Empty
            DataType::Empty,                                // Empty
        ];
        
        let result = propagate_merged_cells_in_row(&category_row);
        
        // Should not propagate - only first cell should have value
        assert_eq!(result[0].to_string(), "Linux RHEL8.7");
        assert!(result[1].is_empty());
        assert!(result[2].is_empty());
        assert!(result[3].is_empty());
        assert!(result[4].is_empty());
        assert!(result[5].is_empty());
        assert!(result[6].is_empty());
        assert!(result[7].is_empty());
    }

    #[test]
    fn test_propagate_merged_cells_distance_limit() {
        use calamine::DataType;
        
        // Test that propagation stops after reasonable distance
        // Make sure row has enough cells to not trigger category detection (>30% non-empty)
        let test_row = vec![
            DataType::String("Value1".to_string()),   // Non-empty 1
            DataType::Empty,                          // Distance 1 - should propagate
            DataType::Empty,                          // Distance 2 - should propagate  
            DataType::Empty,                          // Distance 3 - should propagate
            DataType::Empty,                          // Distance 4 - should NOT propagate (too far)
            DataType::String("Value2".to_string()),   // Non-empty 2 - prevents category detection
        ];
        
        let result = propagate_merged_cells_in_row(&test_row);
        
        assert_eq!(result[0].to_string(), "Value1");
        assert_eq!(result[1].to_string(), "Value1"); // Distance 1 - propagated
        assert_eq!(result[2].to_string(), "Value1"); // Distance 2 - propagated
        assert_eq!(result[3].to_string(), "Value1"); // Distance 3 - propagated
        assert!(result[4].is_empty());               // Distance 4 - not propagated (reset due to distance limit)
        assert_eq!(result[5].to_string(), "Value2"); // Original value preserved
    }

    #[test]
    fn test_propagate_vertical_merged_cells() {
        use calamine::DataType;
        
        // Create test data with vertical merged cells pattern
        // This simulates the server name pattern where "r2lb103960" spans multiple rows
        let headers = vec![
            "Switch Name".to_string(),
            "Port".to_string(),
            "Host Name".to_string(),      // This column will have vertical merges
            "Slot/Port".to_string(),
        ];
        
        let data_rows = vec![
            // Row 1: Has server name "r2lb103960"
            vec![
                DataType::String("CRL01P24L09".to_string()),
                DataType::String("2".to_string()),
                DataType::String("r2lb103960".to_string()),
                DataType::String("2".to_string()),
            ],
            // Row 2: Server name should be carried down from row 1
            vec![
                DataType::String("CRL01P24L10".to_string()),
                DataType::String("2".to_string()),
                DataType::Empty,  // Empty - should get "r2lb103960" from above
                DataType::String("2".to_string()),
            ],
            // Row 3: New server name "r2lb103959"
            vec![
                DataType::String("CRL01P24L09".to_string()),
                DataType::String("5".to_string()),
                DataType::String("r2lb103959".to_string()),
                DataType::String("5".to_string()),
            ],
            // Row 4: Server name should be carried down from row 3
            vec![
                DataType::String("CRL01P24L10".to_string()),
                DataType::String("5".to_string()),
                DataType::Empty,  // Empty - should get "r2lb103959" from above
                DataType::String("5".to_string()),
            ],
        ];
        
        let result = apply_intelligent_merged_cell_detection(&data_rows, &headers);
        
        assert_eq!(result.len(), 4);
        
        // Check first row - should have original value
        assert_eq!(result[0].get("Host Name"), Some(&"r2lb103960".to_string()));
        assert_eq!(result[0].get("Switch Name"), Some(&"CRL01P24L09".to_string()));
        
        // Check second row - should have carried down server name
        assert_eq!(result[1].get("Host Name"), Some(&"r2lb103960".to_string()));
        assert_eq!(result[1].get("Switch Name"), Some(&"CRL01P24L10".to_string()));
        
        // Check third row - should have new server name
        assert_eq!(result[2].get("Host Name"), Some(&"r2lb103959".to_string()));
        assert_eq!(result[2].get("Switch Name"), Some(&"CRL01P24L09".to_string()));
        
        // Check fourth row - should have carried down new server name
        assert_eq!(result[3].get("Host Name"), Some(&"r2lb103959".to_string()));
        assert_eq!(result[3].get("Switch Name"), Some(&"CRL01P24L10".to_string()));
    }

    #[test]
    fn test_intelligent_merged_cells_vertical_only() {
        use calamine::DataType;
        
        // Test intelligent merged cell detection (vertical-only to avoid false positives)
        let headers = vec![
            "Switch Name".to_string(),
            "Port".to_string(),
            "Host Name".to_string(),
            "Slot/Port".to_string(),
        ];
        
        let data_rows = vec![
            // Row 1: Has server name
            vec![
                DataType::String("server001".to_string()),
                DataType::String("port1".to_string()),
                DataType::String("r2lb103960".to_string()),
                DataType::String("eth0".to_string()),
            ],
            // Row 2: Empty host name should get vertical merge, other fields stay as-is
            vec![
                DataType::String("server002".to_string()),
                DataType::String("port2".to_string()),
                DataType::Empty,   // Should be filled vertically from "r2lb103960"
                DataType::String("eth1".to_string()),
            ],
        ];
        
        let result = apply_intelligent_merged_cell_detection(&data_rows, &headers);
        
        assert_eq!(result.len(), 2);
        
        // First row: all values preserved as-is
        assert_eq!(result[0].get("Switch Name"), Some(&"server001".to_string()));
        assert_eq!(result[0].get("Port"), Some(&"port1".to_string()));
        assert_eq!(result[0].get("Host Name"), Some(&"r2lb103960".to_string()));
        assert_eq!(result[0].get("Slot/Port"), Some(&"eth0".to_string()));
        
        // Second row: vertical merge for Host Name, other fields unchanged
        assert_eq!(result[1].get("Switch Name"), Some(&"server002".to_string()));
        assert_eq!(result[1].get("Port"), Some(&"port2".to_string()));
        assert_eq!(result[1].get("Host Name"), Some(&"r2lb103960".to_string())); // Vertical merge
        assert_eq!(result[1].get("Slot/Port"), Some(&"eth1".to_string()));
    }

    #[test] 
    fn test_intelligent_merged_cell_detection() {
        use calamine::DataType;
        
        // Test the intelligent merged cell detection (vertical merges primarily)
        let headers = vec![
            "Switch Name".to_string(),
            "Port".to_string(),
            "Host Name".to_string(),      
            "Slot/Port".to_string(),
        ];
        
        let data_rows = vec![
            // Row 1: Has server name "r2lb103960"
            vec![
                DataType::String("CRL01P24L09".to_string()),
                DataType::String("2".to_string()),
                DataType::String("r2lb103960".to_string()),
                DataType::String("2".to_string()),
            ],
            // Row 2: Server name cell is empty - should get vertical merge
            vec![
                DataType::String("CRL01P24L10".to_string()),
                DataType::String("2".to_string()),
                DataType::Empty,  // This will be filled by vertical merge
                DataType::String("2".to_string()),
            ],
            // Row 3: New server name "r2lb103959"  
            vec![
                DataType::String("CRL01P24L09".to_string()),
                DataType::String("5".to_string()),
                DataType::String("r2lb103959".to_string()),
                DataType::String("5".to_string()),
            ],
            // Row 4: Server name cell is empty - should get vertical merge
            vec![
                DataType::String("CRL01P24L10".to_string()),
                DataType::String("5".to_string()),
                DataType::Empty,  // This will be filled by vertical merge
                DataType::String("5".to_string()),
            ],
        ];
        
        let result = apply_intelligent_merged_cell_detection(&data_rows, &headers);
        
        assert_eq!(result.len(), 4);
        
        // Check that vertical merges were applied correctly
        assert_eq!(result[0].get("Host Name"), Some(&"r2lb103960".to_string()));
        assert_eq!(result[1].get("Host Name"), Some(&"r2lb103960".to_string())); // Vertical merge from row 1
        assert_eq!(result[2].get("Host Name"), Some(&"r2lb103959".to_string()));
        assert_eq!(result[3].get("Host Name"), Some(&"r2lb103959".to_string())); // Vertical merge from row 3
        
        // Verify other fields are preserved
        assert_eq!(result[0].get("Switch Name"), Some(&"CRL01P24L09".to_string()));
        assert_eq!(result[1].get("Switch Name"), Some(&"CRL01P24L10".to_string()));
        assert_eq!(result[2].get("Switch Name"), Some(&"CRL01P24L09".to_string()));
        assert_eq!(result[3].get("Switch Name"), Some(&"CRL01P24L10".to_string()));
    }

    #[test]
    fn test_comprehensive_merged_cells_all_scenarios() {
        use calamine::DataType;
        
        // Test all three merge scenarios in one comprehensive test
        let headers = vec![
            "Switch".to_string(),
            "Port".to_string(), 
            "Server".to_string(),
            "Interface".to_string(),
            "Speed".to_string(),
        ];
        
        let data_rows = vec![
            // Row 1: Horizontal merge (Switch spans to Port) + Server value
            vec![
                DataType::String("SwitchA".to_string()),
                DataType::Empty,                            // Horizontal merge from SwitchA
                DataType::String("ServerX".to_string()),
                DataType::String("eth0".to_string()),
                DataType::String("10G".to_string()),
            ],
            // Row 2: Vertical merge for Server, horizontal merge for Interface
            vec![
                DataType::String("SwitchB".to_string()),
                DataType::String("port2".to_string()),
                DataType::Empty,                            // Vertical merge from ServerX
                DataType::String("eth1".to_string()),
                DataType::Empty,                            // Horizontal merge from eth1
            ],
            // Row 3: New server (breaks vertical merge), rectangular merge simulation
            vec![
                DataType::String("SwitchC".to_string()),
                DataType::Empty,                            // Horizontal from SwitchC
                DataType::String("ServerY".to_string()),
                DataType::Empty,                            // Horizontal from ServerY
                DataType::Empty,                            // Horizontal from ServerY
            ],
            // Row 4: Vertical continuation of ServerY
            vec![
                DataType::String("SwitchD".to_string()),
                DataType::String("port4".to_string()),
                DataType::Empty,                            // Vertical merge from ServerY
                DataType::String("eth3".to_string()),
                DataType::String("25G".to_string()),
            ],
        ];
        
        let result = apply_intelligent_merged_cell_detection(&data_rows, &headers);
        
        assert_eq!(result.len(), 4);
        
        // Row 1: Horizontal merge SwitchA -> Port
        assert_eq!(result[0].get("Switch"), Some(&"SwitchA".to_string()));
        assert_eq!(result[0].get("Port"), Some(&"SwitchA".to_string()));      // Horizontal merge
        assert_eq!(result[0].get("Server"), Some(&"ServerX".to_string()));
        assert_eq!(result[0].get("Interface"), Some(&"eth0".to_string()));
        assert_eq!(result[0].get("Speed"), Some(&"10G".to_string()));
        
        // Row 2: Vertical merge ServerX, horizontal merge eth1 -> Speed
        assert_eq!(result[1].get("Switch"), Some(&"SwitchB".to_string()));
        assert_eq!(result[1].get("Port"), Some(&"port2".to_string()));
        assert_eq!(result[1].get("Server"), Some(&"ServerX".to_string()));    // Vertical merge
        assert_eq!(result[1].get("Interface"), Some(&"eth1".to_string()));
        assert_eq!(result[1].get("Speed"), Some(&"eth1".to_string()));        // Horizontal merge
        
        // Row 3: New server ServerY, horizontal merges
        assert_eq!(result[2].get("Switch"), Some(&"SwitchC".to_string()));
        assert_eq!(result[2].get("Port"), Some(&"SwitchC".to_string()));      // Horizontal merge
        assert_eq!(result[2].get("Server"), Some(&"ServerY".to_string()));
        assert_eq!(result[2].get("Interface"), Some(&"ServerY".to_string()));  // Horizontal merge
        assert_eq!(result[2].get("Speed"), Some(&"ServerY".to_string()));     // Horizontal merge
        
        // Row 4: Vertical merge ServerY continues
        assert_eq!(result[3].get("Switch"), Some(&"SwitchD".to_string()));
        assert_eq!(result[3].get("Port"), Some(&"port4".to_string()));
        assert_eq!(result[3].get("Server"), Some(&"ServerY".to_string()));    // Vertical merge
        assert_eq!(result[3].get("Interface"), Some(&"eth3".to_string()));
        assert_eq!(result[3].get("Speed"), Some(&"25G".to_string()));
    }

    #[test]
    fn test_normalize_link_speed() {
        // Test cases for speed normalization
        assert_eq!(normalize_link_speed("25GB"), "25G");
        assert_eq!(normalize_link_speed("25 GB"), "25G");
        assert_eq!(normalize_link_speed("25Gbps"), "25G");
        assert_eq!(normalize_link_speed("25 Gbps"), "25G");
        assert_eq!(normalize_link_speed("10GB"), "10G");
        assert_eq!(normalize_link_speed("1GB"), "1G");
        assert_eq!(normalize_link_speed("100MB"), "100M");
        assert_eq!(normalize_link_speed("100 MB"), "100M");
        assert_eq!(normalize_link_speed("100Mbps"), "100M");
        assert_eq!(normalize_link_speed("100 Mbps"), "100M");
        
        // Test numeric-only inputs (should assume GB)
        assert_eq!(normalize_link_speed("25"), "25G");
        assert_eq!(normalize_link_speed(" 10 "), "10G");
        
        // Test already normalized values
        assert_eq!(normalize_link_speed("25G"), "25G");
        assert_eq!(normalize_link_speed("100M"), "100M");
        
        // Test case insensitivity
        assert_eq!(normalize_link_speed("25gb"), "25G");
        assert_eq!(normalize_link_speed("25gB"), "25G");
        assert_eq!(normalize_link_speed("100mb"), "100M");
        
        // Test edge cases
        assert_eq!(normalize_link_speed("  25GB  "), "25G");
        assert_eq!(normalize_link_speed("25"), "25G");
    }
}