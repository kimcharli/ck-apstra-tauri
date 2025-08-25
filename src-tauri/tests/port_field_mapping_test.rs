use ck_apstra_tauri::commands::data_parser::parse_excel_sheet;
use ck_apstra_tauri::services::enhanced_conversion_service::EnhancedConversionService;
use std::path::Path;

#[tokio::test]
async fn test_port_field_mapping_regression() {
    // This test ensures that the "Port" column (containing values like "2") 
    // maps correctly to switch_ifname, not the "Trunk/Access Port" column
    // (containing values like "Access")
    
    let test_file = Path::new("../tests/fixtures/original-0729.xlsx");
    if !test_file.exists() {
        panic!("Test file not found: {:?}", test_file);
    }

    // Use default enhanced conversion map which has "Port" -> "switch_ifname"
    let conversion_map = EnhancedConversionService::load_default_enhanced_conversion_map().ok();
    
    let result = parse_excel_sheet(
        test_file.to_string_lossy().to_string(),
        "4187-11".to_string(),
        conversion_map
    ).await;

    match result {
        Ok(parsed_data) => {
            // Filter for rows with actual data
            let data_rows: Vec<_> = parsed_data.iter()
                .filter(|row| row.switch_label.is_some() && row.switch_ifname.is_some())
                .collect();
            
            assert!(!data_rows.is_empty(), "Should have parsed some data rows");
            
            // Debug output to see what data we actually have
            println!("📊 Parsed {} data rows", data_rows.len());
            for (i, row) in data_rows.iter().take(5).enumerate() {
                println!("  Row {}: switch_label={:?}, switch_ifname={:?}, server_label={:?}", 
                    i, row.switch_label, row.switch_ifname, row.server_label);
            }
            
            // Check that NO rows have "Access" in switch_ifname (regression check)
            let access_rows: Vec<_> = data_rows.iter()
                .filter(|row| {
                    let empty_string = "".to_string();
                    let switch_ifname = row.switch_ifname.as_ref().unwrap_or(&empty_string);
                    switch_ifname == "Access" || switch_ifname.contains("Access")
                })
                .collect();
                
            assert_eq!(access_rows.len(), 0, 
                "❌ REGRESSION: Found {} rows with 'Access' in switch_ifname, but switch_ifname should contain port numbers like '2', not 'Access'", 
                access_rows.len());
            
            // Check that we have rows with transformed port numbers (correct mapping + transformation)
            // Port "2" with 25G speed should become "et-0/0/2" (>10G = et-)
            let transformed_port_rows: Vec<_> = data_rows.iter()
                .filter(|row| {
                    let empty_string = "".to_string();
                    let switch_ifname = row.switch_ifname.as_ref().unwrap_or(&empty_string);
                    switch_ifname.ends_with("-0/0/2")  // Could be et-0/0/2, xe-0/0/2, or ge-0/0/2
                })
                .collect();
                
            assert!(transformed_port_rows.len() > 0, 
                "✅ Should find rows with transformed interface names like 'et-0/0/2' from the Port column");
            
            println!("✅ Port field mapping test passed: {} rows with correct transformed interfaces, 0 rows with incorrect 'Access' values", 
                transformed_port_rows.len());
        }
        Err(e) => {
            panic!("Failed to parse Excel file: {}", e);
        }
    }
}