use ck_apstra_tauri::domains::excel::commands::parse_excel_sheet;
use ck_apstra_tauri::domains::conversion::services::enhanced_conversion_service::EnhancedConversionService;
use calamine::{Reader, open_workbook, Xlsx};
use std::collections::HashMap;

#[tokio::test]
async fn debug_excel_processing_pipeline() {
    println!("\n🔍 COMPREHENSIVE DEBUG: Tracing Excel processing pipeline step by step");
    
    let test_file_path = "../tests/fixtures/original-0729.xlsx";
    let sheet_name = "4187-11"; // We know this sheet has the data
    
    // Load the enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    let service = EnhancedConversionService::new();
    
    // Step 1: Get raw Excel data
    println!("\n📋 STEP 1: Reading raw Excel data...");
    let mut workbook = open_workbook::<Xlsx<_>, _>(test_file_path)
        .expect("Should open Excel file");
    
    let worksheet = workbook.worksheet_range(sheet_name)
        .expect("Should read worksheet");
    
    let worksheet_rows: Vec<Vec<calamine::Data>> = worksheet.rows().map(|row| row.to_vec()).collect();
    
    // Get headers (row 2, index 1)
    let header_row = &worksheet_rows[1];
    let headers: Vec<String> = header_row.iter().map(|cell| cell.to_string().trim().to_string()).collect();
    
    println!("📋 Headers found: {:?}", headers);
    
    // Find the LACP column
    let mut lacp_column_index = None;
    for (col_idx, header) in headers.iter().enumerate() {
        if header.to_lowercase().contains("lacp") {
            lacp_column_index = Some(col_idx);
            println!("🎯 LACP column found at index {}: '{}'", col_idx, header);
            break;
        }
    }
    
    // Step 2: Test header conversion
    println!("\n📋 STEP 2: Testing header conversion...");
    let conversion_result = service.convert_headers_with_enhanced_map(&headers, &enhanced_map)
        .expect("Should convert headers");
    
    println!("🔄 Header conversions:");
    for (excel_header, internal_field) in &conversion_result.converted_headers {
        println!("   '{}' -> '{}'", excel_header, internal_field);
    }
    
    // Check if LACP header was mapped correctly
    let lacp_header = headers.get(lacp_column_index.unwrap_or(0)).unwrap();
    let lacp_mapping = conversion_result.converted_headers.get(lacp_header);
    println!("🎯 LACP header '{}' mapped to: {:?}", lacp_header, lacp_mapping);
    
    // Step 3: Process specific rows with "Yes" values
    println!("\n📋 STEP 3: Processing rows with 'Yes' values manually...");
    
    // We know rows 7-8 (index 6-7) have "Yes" values
    for row_idx in [6, 7] {
        if let Some(data_row) = worksheet_rows.get(row_idx) {
            println!("\n🎯 Processing Excel row {} (0-based index {}):", row_idx + 1, row_idx);
            
            // Build field data HashMap
            let mut field_data = HashMap::new();
            for (col_idx, header) in headers.iter().enumerate() {
                if let Some(internal_field) = conversion_result.converted_headers.get(header) {
                    let cell_value = if col_idx < data_row.len() {
                        data_row[col_idx].to_string()
                    } else {
                        String::new()
                    };
                    field_data.insert(internal_field.clone(), cell_value.clone());
                    
                    if header.to_lowercase().contains("lacp") {
                        println!("   📥 LACP field: header='{}' -> field='{}' -> value='{}'", 
                               header, internal_field, cell_value);
                    }
                }
            }
            
            // Apply transformations
            println!("   🔄 Applying transformations...");
            match service.apply_field_transformations(&field_data, &enhanced_map) {
                Ok(transformed_data) => {
                    println!("   ✅ Transformation successful");
                    if let Some(lag_mode) = transformed_data.get("link_group_lag_mode") {
                        println!("   📤 Final LAG mode: '{}'", lag_mode);
                    } else {
                        println!("   ❌ No link_group_lag_mode in transformed data");
                        println!("   📊 Available fields: {:?}", transformed_data.keys().collect::<Vec<_>>());
                    }
                },
                Err(e) => {
                    println!("   ❌ Transformation failed: {}", e);
                }
            }
        }
    }
    
    // Step 4: Compare with actual parse_excel_sheet result
    println!("\n📋 STEP 4: Comparing with parse_excel_sheet result...");
    
    match parse_excel_sheet(
        test_file_path.to_string(),
        sheet_name.to_string(),
        Some(enhanced_map)
    ).await {
        Ok(parsed_data) => {
            println!("✅ parse_excel_sheet returned {} rows", parsed_data.len());
            
            // Check specific rows that should have "lacp_active"
            for (idx, row) in parsed_data.iter().enumerate() {
                if (idx + 1) == 5 || (idx + 1) == 6 { // Rows that should correspond to Excel rows 7-8
                    println!("🎯 Parsed row {}: LAG mode = {:?} (switch: {:?}, server: {:?})", 
                           idx + 1, row.link_group_lag_mode, row.switch_label, row.server_label);
                }
            }
        },
        Err(e) => {
            println!("❌ parse_excel_sheet failed: {}", e);
        }
    }
}