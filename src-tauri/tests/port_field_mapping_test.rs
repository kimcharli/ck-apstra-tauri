use ck_apstra_tauri::commands::data_parser::parse_excel_sheet;
use ck_apstra_tauri::services::conversion_service::ConversionService;
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

    // Use default conversion map which has "Port" -> "switch_ifname"
    let conversion_map = ConversionService::load_default_conversion_map().ok();
    
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
            
            // Check that we have rows with port number "2" (correct mapping)
            let port_2_rows: Vec<_> = data_rows.iter()
                .filter(|row| {
                    let empty_string = "".to_string();
                    let switch_ifname = row.switch_ifname.as_ref().unwrap_or(&empty_string);
                    switch_ifname == "2"
                })
                .collect();
                
            assert!(port_2_rows.len() > 0, 
                "✅ Should find rows with switch_ifname='2' from the Port column");
            
            println!("✅ Port field mapping test passed: {} rows with correct port numbers, 0 rows with incorrect 'Access' values", 
                port_2_rows.len());
        }
        Err(e) => {
            panic!("Failed to parse Excel file: {}", e);
        }
    }
}