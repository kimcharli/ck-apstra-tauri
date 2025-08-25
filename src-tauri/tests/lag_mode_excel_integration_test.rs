use ck_apstra_tauri::commands::data_parser::parse_excel_sheet;
use ck_apstra_tauri::services::enhanced_conversion_service::EnhancedConversionService;
use calamine::{Reader, open_workbook, Xlsx};

#[tokio::test]
async fn test_lag_mode_with_actual_excel_file() {
    // Load the default enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    // Try to parse the actual test fixture file
    let test_file_path = "../tests/fixtures/original-0729.xlsx";
    
    // Check if test file exists
    if !std::path::Path::new(test_file_path).exists() {
        println!("⚠️  Test fixture not found at: {}", test_file_path);
        println!("📝 Creating a simulated test instead...");
        test_lag_mode_with_simulated_data().await;
        return;
    }
    
    // First, let's see what sheets are available
    println!("🔍 Investigating Excel file structure...");
    let workbook_result = open_workbook::<Xlsx<_>, _>(test_file_path);
    let available_sheets = match &workbook_result {
        Ok(workbook) => workbook.sheet_names().to_vec(),
        Err(e) => {
            println!("❌ Failed to open Excel file: {}", e);
            vec![]
        }
    };
    
    println!("📋 Available sheets: {:?}", available_sheets);
    
    // Try different sheet names - including the discovered sheets
    let sheet_names_to_try = vec!["4187-11", "4187-12", "Sheet1", "Sheet3", "Original", "Data", "Connections", "Network"];
    let mut successful_parse = false;
    
    for sheet_name in &sheet_names_to_try {
        if available_sheets.contains(&sheet_name.to_string()) {
            println!("🔍 Trying sheet: '{}'", sheet_name);
            match parse_excel_sheet(
                test_file_path.to_string(),
                sheet_name.to_string(),
                Some(enhanced_map.clone())
            ).await {
                Ok(parsed_data) => {
                    println!("✅ Successfully parsed Excel file from sheet '{}' with {} rows", sheet_name, parsed_data.len());
                    successful_parse = true;
            
                    if parsed_data.len() > 0 {
                        // CRITICAL DEBUG: Let's examine what's actually in the Excel file
                        println!("\n🔍 DEBUGGING: Let's see raw Excel data before transformation...");
                        
                        // Parse the Excel file again to get raw data before transformation
                        if let Ok(mut workbook) = open_workbook::<Xlsx<_>, _>(test_file_path) {
                            if let Some(worksheet) = workbook.worksheet_range(sheet_name).ok() {
                                let worksheet_rows: Vec<Vec<calamine::Data>> = worksheet.rows().map(|row| row.to_vec()).collect();
                                
                                if let Some(header_row) = worksheet_rows.get(1) { // Assuming row 2 is headers (0-based = 1)
                                    println!("📋 Raw Excel headers (row 2): {:?}", header_row);
                                    
                                    // Find the LACP column
                                    for (col_idx, header_cell) in header_row.iter().enumerate() {
                                        let header_str = header_cell.to_string();
                                        if header_str.to_lowercase().contains("lacp") || header_str.to_lowercase().contains("lag") {
                                            println!("🎯 Found LACP/LAG related column at index {}: '{}'", col_idx, header_str);
                                            
                                            // Show first few data values in this column
                                            println!("📊 First 10 values in this column:");
                                            for (row_idx, data_row) in worksheet_rows.iter().skip(2).take(10).enumerate() {
                                                if let Some(cell_value) = data_row.get(col_idx) {
                                                    let cell_str = cell_value.to_string();
                                                    println!("   Row {}: '{}' (type: {:?})", row_idx + 3, cell_str, cell_value);
                                                } else {
                                                    println!("   Row {}: [empty cell]", row_idx + 3);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        // CRITICAL DEBUG: Let's trace specific rows that should have "lacp_active"
                        println!("\n🔍 DETAILED ANALYSIS: Checking specific rows with 'Yes' values...");
                        
                        // We know rows 7 and 8 (Excel row 7-8, processed as index 4-5) have "Yes" in raw data
                        for (idx, row) in parsed_data.iter().enumerate() {
                            if (idx + 1) == 5 || (idx + 1) == 6 { // Excel row 7-8 should be processed row 5-6 
                                println!("🎯 DETAILED ROW {} DEBUG:", idx + 1);
                                println!("   Switch: {:?}", row.switch_label);
                                println!("   Server: {:?}", row.server_label);  
                                println!("   LAG Mode: {:?}", row.link_group_lag_mode);
                                println!("   All fields: {:?}", row);
                            }
                        }
                        
                        // Look for rows with LAG mode data
                        let mut lag_mode_rows = 0;
                        let mut lacp_active_rows = 0;
                        let mut none_rows = 0;
                        
                        for (idx, row) in parsed_data.iter().enumerate() {
                            if let Some(lag_mode) = &row.link_group_lag_mode {
                                lag_mode_rows += 1;
                                match lag_mode.as_str() {
                                    "lacp_active" => {
                                        lacp_active_rows += 1;
                                        println!("✅ Row {}: LAG mode = 'lacp_active' (switch: {}, server: {})", 
                                            idx + 1, 
                                            row.switch_label.as_deref().unwrap_or("N/A"),
                                            row.server_label.as_deref().unwrap_or("N/A"));
                                    },
                                    "none" => {
                                        none_rows += 1;
                                        println!("📋 Row {}: LAG mode = 'none' (switch: {}, server: {})", 
                                            idx + 1,
                                            row.switch_label.as_deref().unwrap_or("N/A"),
                                            row.server_label.as_deref().unwrap_or("N/A"));
                                    },
                                    other => {
                                        println!("ℹ️  Row {}: LAG mode = '{}' (switch: {}, server: {})", 
                                            idx + 1, other,
                                            row.switch_label.as_deref().unwrap_or("N/A"),
                                            row.server_label.as_deref().unwrap_or("N/A"));
                                    }
                                }
                            }
                        }
                        
                        println!("\n📊 LAG Mode Analysis Results:");
                        println!("   Total rows with LAG mode data: {}", lag_mode_rows);
                        println!("   Rows with 'lacp_active': {}", lacp_active_rows);
                        println!("   Rows with 'none': {}", none_rows);
                        
                        if lacp_active_rows == 0 && lag_mode_rows > 0 {
                            println!("❌ ISSUE FOUND: No 'lacp_active' values found despite having LAG mode data");
                            println!("🔍 This suggests the transformation from 'Yes' to 'lacp_active' is not working");
                        }
                        
                        break; // Successfully processed, exit loop
                    } else {
                        println!("⚠️  Sheet '{}' parsed but returned 0 rows", sheet_name);
                    }
                },
                Err(e) => {
                    println!("❌ Failed to parse sheet '{}': {}", sheet_name, e);
                }
            }
        } else {
            println!("⚠️  Sheet '{}' not found in available sheets", sheet_name);
        }
    }
    
    if !successful_parse {
        println!("❌ Failed to parse any sheets in Excel file");
        println!("📝 Creating a simulated test instead...");
        test_lag_mode_with_simulated_data().await;
    }
}

async fn test_lag_mode_with_simulated_data() {
    println!("\n🧪 Testing LAG mode transformation with simulated Excel data...");
    
    // Load the enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    let service = EnhancedConversionService::new();
    
    // Simulate Excel data with LACP Needed = "Yes"
    let test_cases = vec![
        // (Description, Field Data, Expected LAG Mode)
        ("Excel 'Yes' input", "Yes", "lacp_active"),
        ("Excel 'No' input", "No", "none"),
        ("Excel empty input", "", "none"),
        ("Excel 'TRUE' input", "TRUE", "lacp_active"),
        ("Excel 'FALSE' input", "FALSE", "none"),
    ];
    
    println!("\n🔄 Testing transformation pipeline:");
    
    for (description, input_value, expected) in test_cases {
        let mut field_data = std::collections::HashMap::new();
        field_data.insert("link_group_lag_mode".to_string(), input_value.to_string());
        field_data.insert("switch_label".to_string(), "test-switch".to_string());
        field_data.insert("switch_ifname".to_string(), "et-0/0/1".to_string());
        field_data.insert("server_label".to_string(), "test-server".to_string());
        
        // Apply transformations
        match service.apply_field_transformations(&field_data, &enhanced_map) {
            Ok(result) => {
                let not_found = "NOT_FOUND".to_string();
                let actual_lag_mode = result.get("link_group_lag_mode")
                    .unwrap_or(&not_found);
                
                if actual_lag_mode == expected {
                    println!("   ✅ {}: '{}' -> '{}'", description, input_value, actual_lag_mode);
                } else {
                    println!("   ❌ {}: '{}' -> '{}' (expected '{}')", description, input_value, actual_lag_mode, expected);
                }
            },
            Err(e) => {
                println!("   ❌ {}: Transformation failed: {}", description, e);
            }
        }
    }
}

#[tokio::test]
async fn test_lag_mode_header_mapping_integration() {
    println!("\n🔍 Testing complete header mapping to transformation pipeline...");
    
    // Load the enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    let service = EnhancedConversionService::new();
    
    // Simulate Excel headers that should map to link_group_lag_mode
    let excel_headers = vec![
        "Switch".to_string(),
        "Port".to_string(),
        "Host Name".to_string(),
        "Slot/Port".to_string(),
        "LACP\nNeeded".to_string(),  // This should map to link_group_lag_mode
        "Speed".to_string(),
    ];
    
    // Convert headers using enhanced mapping
    let conversion_result = service.convert_headers_with_enhanced_map(&excel_headers, &enhanced_map)
        .expect("Should convert headers successfully");
    
    println!("📋 Header mapping results:");
    for (excel_header, internal_field) in &conversion_result.converted_headers {
        println!("   '{}' -> '{}'", excel_header, internal_field);
    }
    
    // Check if "LACP\nNeeded" maps to "link_group_lag_mode"
    let lacp_mapping = conversion_result.converted_headers.get("LACP\nNeeded");
    match lacp_mapping {
        Some(field) if field == "link_group_lag_mode" => {
            println!("✅ 'LACP\\nNeeded' correctly maps to 'link_group_lag_mode'");
        },
        Some(field) => {
            println!("❌ 'LACP\\nNeeded' incorrectly maps to '{}' instead of 'link_group_lag_mode'", field);
        },
        None => {
            println!("❌ 'LACP\\nNeeded' header not mapped at all");
        }
    }
    
    // Now simulate processing a row with "Yes" in the LACP Needed column
    let mut excel_row_data = std::collections::HashMap::new();
    excel_row_data.insert("Switch".to_string(), "sw01".to_string());
    excel_row_data.insert("Port".to_string(), "1".to_string());
    excel_row_data.insert("Host Name".to_string(), "server01".to_string());
    excel_row_data.insert("Slot/Port".to_string(), "ens1".to_string());
    excel_row_data.insert("LACP\nNeeded".to_string(), "Yes".to_string());
    excel_row_data.insert("Speed".to_string(), "25G".to_string());
    
    // Convert Excel field names to internal field names
    let mut internal_field_data = std::collections::HashMap::new();
    for (excel_header, value) in excel_row_data {
        if let Some(internal_field) = conversion_result.converted_headers.get(&excel_header) {
            internal_field_data.insert(internal_field.clone(), value);
        }
    }
    
    println!("\n🔄 Processing simulated Excel row:");
    println!("   Excel: LACP\\nNeeded = 'Yes'");
    
    // Apply transformations
    match service.apply_field_transformations(&internal_field_data, &enhanced_map) {
        Ok(result) => {
            let not_found = "NOT_FOUND".to_string();
            let lag_mode = result.get("link_group_lag_mode").unwrap_or(&not_found);
            println!("   Internal: link_group_lag_mode = '{}'", lag_mode);
            
            if lag_mode == "lacp_active" {
                println!("✅ Complete pipeline works: Excel 'Yes' -> 'lacp_active'");
            } else {
                println!("❌ Pipeline broken: Excel 'Yes' -> '{}' (expected 'lacp_active')", lag_mode);
            }
        },
        Err(e) => {
            println!("❌ Transformation failed: {}", e);
        }
    }
}