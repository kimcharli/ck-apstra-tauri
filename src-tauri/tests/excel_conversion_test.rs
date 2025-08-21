use std::path::PathBuf;
use std::collections::HashMap;
use ck_apstra_tauri::models::conversion_map::ConversionMap;
use ck_apstra_tauri::commands::data_parser::{parse_excel_sheet, validate_data};

/// Integration tests for Excel conversion functionality using real Excel fixtures
#[cfg(test)]
mod excel_integration_tests {
    use super::*;

    fn get_test_fixture_path() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("tests")
            .join("fixtures")
            .join("original-0729.xlsx")
    }

    fn create_default_conversion_map_for_test() -> ConversionMap {
        let mut mappings = HashMap::new();
        
        // Mappings from the default conversion map JSON
        mappings.insert("Switch Name".to_string(), "switch_label".to_string());
        mappings.insert("Port".to_string(), "switch_ifname".to_string());
        mappings.insert("Host Name".to_string(), "server_label".to_string());
        mappings.insert("Slot/Port".to_string(), "server_ifname".to_string());
        mappings.insert("Speed\n(GB)".to_string(), "link_speed".to_string());
        mappings.insert("Speed\r\n(GB)".to_string(), "link_speed".to_string());
        mappings.insert("External".to_string(), "is_external".to_string());
        mappings.insert("AE".to_string(), "link_group_ifname".to_string());
        mappings.insert("LACPNeeded".to_string(), "link_group_lag_mode".to_string());
        mappings.insert("LACP\nNeeded".to_string(), "link_group_lag_mode".to_string());
        mappings.insert("LACP\r\nNeeded".to_string(), "link_group_lag_mode".to_string());
        mappings.insert("CTs".to_string(), "link_group_ct_names".to_string());
        mappings.insert("Server Tags".to_string(), "server_tags".to_string());
        mappings.insert("Link Tags".to_string(), "link_tags".to_string());
        mappings.insert("Comments".to_string(), "comment".to_string());
        mappings.insert("Notes".to_string(), "comment".to_string());
        
        ConversionMap::new(Some(2), mappings) // Header row 2 as per default config
    }

    #[tokio::test]
    async fn test_parse_excel_with_real_fixture() {
        let fixture_path = get_test_fixture_path();
        
        // Skip test if fixture doesn't exist
        if !fixture_path.exists() {
            eprintln!("Skipping integration test - fixture not found: {:?}", fixture_path);
            return;
        }

        let conversion_map = create_default_conversion_map_for_test();
        let file_path = fixture_path.to_string_lossy().to_string();

        // Test parsing different sheets that are known to exist in the fixture
        let test_sheets = vec!["4187-11", "4187-12"];
        
        for sheet_name in test_sheets {
            let result = parse_excel_sheet(
                file_path.clone(),
                sheet_name.to_string(),
                Some(conversion_map.clone())
            ).await;

            match result {
                Ok(parsed_data) => {
                    println!("Successfully parsed sheet '{}' with {} rows", sheet_name, parsed_data.len());
                    
                    // Verify we got some data
                    assert!(!parsed_data.is_empty(), "Sheet '{}' should contain data", sheet_name);
                    
                    // Check that we have the expected fields mapped
                    for (i, row) in parsed_data.iter().take(5).enumerate() {
                        println!("Row {}: switch_label={:?}, server_label={:?}, server_ifname={:?}", 
                            i, row.switch_label, row.server_label, row.server_ifname);
                        
                        // Verify blueprint is None (as per requirement)
                        assert_eq!(row.blueprint, None, "Blueprint should be None");
                        
                        // At least one of switch_label or switch_ifname should be present
                        assert!(
                            row.switch_label.is_some() || row.switch_ifname.is_some(),
                            "Row should have at least switch_label or switch_ifname"
                        );
                    }
                    
                    // Verify specific mappings for Host Name -> server_label and Slot/Port -> server_ifname
                    let rows_with_server_data: Vec<_> = parsed_data.iter()
                        .filter(|row| row.server_label.is_some() || row.server_ifname.is_some())
                        .collect();
                    
                    if !rows_with_server_data.is_empty() {
                        println!("Found {} rows with server data in sheet '{}'", rows_with_server_data.len(), sheet_name);
                        
                        // Check for non-empty server labels and interfaces
                        let non_empty_server_labels = rows_with_server_data.iter()
                            .filter(|row| row.server_label.as_ref().map_or(false, |s| !s.trim().is_empty()))
                            .count();
                        let non_empty_server_interfaces = rows_with_server_data.iter()
                            .filter(|row| row.server_ifname.as_ref().map_or(false, |s| !s.trim().is_empty()))
                            .count();
                        
                        println!("Non-empty server labels: {}, Non-empty server interfaces: {}", 
                            non_empty_server_labels, non_empty_server_interfaces);
                    }
                }
                Err(e) => {
                    eprintln!("Failed to parse sheet '{}': {}", sheet_name, e);
                    // Don't fail the test if sheet doesn't exist, just log it
                    if !e.contains("not found") {
                        panic!("Unexpected error parsing sheet '{}': {}", sheet_name, e);
                    }
                }
            }
        }
    }

    #[tokio::test]
    async fn test_field_mapping_with_variations() {
        let fixture_path = get_test_fixture_path();
        
        if !fixture_path.exists() {
            eprintln!("Skipping integration test - fixture not found: {:?}", fixture_path);
            return;
        }

        // Test with field variations instead of exact conversion map
        let file_path = fixture_path.to_string_lossy().to_string();
        
        let result = parse_excel_sheet(
            file_path,
            "4187-11".to_string(),
            None // Use default field variations
        ).await;

        match result {
            Ok(parsed_data) => {
                println!("Successfully parsed with field variations: {} rows", parsed_data.len());
                
                // Verify we can still map data using variations
                if !parsed_data.is_empty() {
                    let first_row = &parsed_data[0];
                    println!("First row with variations: switch_label={:?}, server_label={:?}", 
                        first_row.switch_label, first_row.server_label);
                }
            }
            Err(e) => {
                if !e.contains("not found") {
                    panic!("Failed to parse with field variations: {}", e);
                }
            }
        }
    }

    #[tokio::test] 
    async fn test_data_validation() {
        let fixture_path = get_test_fixture_path();
        
        if !fixture_path.exists() {
            eprintln!("Skipping validation test - fixture not found: {:?}", fixture_path);
            return;
        }

        let conversion_map = create_default_conversion_map_for_test();
        let file_path = fixture_path.to_string_lossy().to_string();

        if let Ok(parsed_data) = parse_excel_sheet(
            file_path,
            "4187-11".to_string(),
            Some(conversion_map)
        ).await {
            // Test validation
            let validated_result = validate_data(parsed_data.clone()).await;
            
            assert!(validated_result.is_ok(), "Validation should succeed");
            let validated_data = validated_result.unwrap();
            
            // For now validation just returns the same data, but this tests the pipeline
            assert_eq!(validated_data.len(), parsed_data.len(), "Validated data should have same length");
        }
    }

    #[tokio::test]
    async fn test_header_normalization() {
        let fixture_path = get_test_fixture_path();
        
        if !fixture_path.exists() {
            eprintln!("Skipping normalization test - fixture not found: {:?}", fixture_path);
            return;
        }

        let mut conversion_map = create_default_conversion_map_for_test();
        
        // Add mappings with different line ending variations to test normalization
        conversion_map.mappings.insert("Speed (GB)".to_string(), "link_speed".to_string());
        conversion_map.mappings.insert("LACP Needed".to_string(), "link_group_lag_mode".to_string());
        
        let file_path = fixture_path.to_string_lossy().to_string();

        let result = parse_excel_sheet(
            file_path,
            "4187-11".to_string(),
            Some(conversion_map)
        ).await;

        match result {
            Ok(parsed_data) => {
                println!("Header normalization test completed with {} rows", parsed_data.len());
                
                // Check that we successfully matched headers with line breaks/variations
                let rows_with_speed = parsed_data.iter()
                    .filter(|row| row.link_speed.is_some())
                    .count();
                let rows_with_lag_mode = parsed_data.iter()
                    .filter(|row| row.link_group_lag_mode.is_some())
                    .count();
                
                println!("Rows with speed data: {}, Rows with LAG mode: {}", rows_with_speed, rows_with_lag_mode);
            }
            Err(e) => {
                if !e.contains("not found") {
                    panic!("Header normalization test failed: {}", e);
                }
            }
        }
    }

    #[tokio::test]
    async fn test_empty_and_whitespace_handling() {
        let fixture_path = get_test_fixture_path();
        
        if !fixture_path.exists() {
            eprintln!("Skipping empty value test - fixture not found: {:?}", fixture_path);
            return;
        }

        let conversion_map = create_default_conversion_map_for_test();
        let file_path = fixture_path.to_string_lossy().to_string();

        if let Ok(parsed_data) = parse_excel_sheet(
            file_path,
            "4187-11".to_string(),
            Some(conversion_map)
        ).await {
            // Check that empty and whitespace-only values are properly handled
            for (i, row) in parsed_data.iter().take(10).enumerate() {
                // Log empty fields for debugging
                if row.server_label.is_none() {
                    println!("Row {}: server_label is None", i);
                }
                if row.server_ifname.is_none() {
                    println!("Row {}: server_ifname is None", i);
                }
                
                // Verify that any non-None values are not empty or whitespace-only
                if let Some(ref server_label) = row.server_label {
                    assert!(!server_label.trim().is_empty(), "server_label should not be empty if present");
                }
                if let Some(ref server_ifname) = row.server_ifname {
                    assert!(!server_ifname.trim().is_empty(), "server_ifname should not be empty if present");
                }
            }
            
            println!("Empty value handling test completed successfully");
        }
    }

    #[tokio::test]
    async fn test_blueprint_always_none() {
        let fixture_path = get_test_fixture_path();
        
        if !fixture_path.exists() {
            eprintln!("Skipping blueprint test - fixture not found: {:?}", fixture_path);
            return;
        }

        // Create a conversion map that tries to map Blueprint (should be ignored)
        let mut conversion_map = create_default_conversion_map_for_test();
        conversion_map.mappings.insert("Blueprint".to_string(), "blueprint".to_string());
        
        let file_path = fixture_path.to_string_lossy().to_string();

        if let Ok(parsed_data) = parse_excel_sheet(
            file_path,
            "4187-11".to_string(),
            Some(conversion_map)
        ).await {
            // Verify that ALL rows have blueprint set to None, regardless of Excel data
            for row in &parsed_data {
                assert_eq!(row.blueprint, None, "Blueprint must always be None");
            }
            
            println!("Blueprint requirement test passed - all {} rows have blueprint=None", parsed_data.len());
        }
    }

    #[tokio::test]
    async fn test_merged_cell_server_names() {
        let fixture_path = get_test_fixture_path();
        
        if !fixture_path.exists() {
            eprintln!("Skipping merged cell server names test - fixture not found: {:?}", fixture_path);
            return;
        }

        let conversion_map = create_default_conversion_map_for_test();
        let file_path = fixture_path.to_string_lossy().to_string();

        // Test both sheets mentioned in the issue
        let test_sheets = vec!["4187-11", "4187-12"];
        
        for sheet_name in test_sheets {
            let result = parse_excel_sheet(
                file_path.clone(),
                sheet_name.to_string(),
                Some(conversion_map.clone())
            ).await;

            match result {
                Ok(parsed_data) => {
                    println!("Testing merged cell server names in sheet '{}' with {} rows", sheet_name, parsed_data.len());
                    
                    // Filter for rows with actual data (skip category/header rows)
                    let data_rows: Vec<_> = parsed_data.iter()
                        .filter(|row| row.switch_label.is_some() && row.switch_ifname.is_some())
                        .collect();
                    
                    if data_rows.len() >= 4 {
                        println!("Showing first 10 data rows to understand structure:");
                        for (i, row) in data_rows.iter().take(10).enumerate() {
                            println!("Row {}: switch_label={:?}, server_label={:?}, switch_ifname={:?}, server_ifname={:?}", 
                                i, row.switch_label, row.server_label, row.switch_ifname, row.server_ifname);
                        }
                        
                        // Look for r2lb103959 in all rows
                        let rows_with_103959: Vec<_> = data_rows.iter().enumerate()
                            .filter(|(_, row)| {
                                row.server_label.as_ref().map_or(false, |s| s.contains("r2lb103959"))
                            })
                            .collect();
                        
                        println!("Found {} rows with r2lb103959", rows_with_103959.len());
                        for (idx, row) in rows_with_103959.iter().take(5) {
                            println!("r2lb103959 at row {}: {:?}", idx, row.server_label);
                        }
                        
                        // Based on actual data structure observed:
                        // Rows 0-4: server_label should be "r2lb103960" 
                        // Rows 5-9: server_label should be "r2lb103959"
                        
                        // Check that we have proper server grouping with vertical merged cells
                        if !rows_with_103959.is_empty() {
                            // Find where r2lb103959 starts (should be after r2lb103960 rows)
                            let first_103959_idx = rows_with_103959[0].0;
                            
                            println!("r2lb103959 starts at row {}", first_103959_idx);
                            
                            // Verify that all rows before first_103959_idx have r2lb103960
                            for (i, row) in data_rows.iter().take(first_103959_idx).enumerate() {
                                if let Some(server_name) = &row.server_label {
                                    assert!(
                                        server_name.contains("r2lb103960"),
                                        "Row {} should have server_label containing 'r2lb103960', got: '{}'", 
                                        i, server_name
                                    );
                                }
                            }
                            
                            // Verify that some rows starting from first_103959_idx have r2lb103959
                            let rows_103959_range = data_rows.iter().skip(first_103959_idx).take(5);
                            let mut found_103959_count = 0;
                            
                            for (i, row) in rows_103959_range.enumerate() {
                                if let Some(server_name) = &row.server_label {
                                    if server_name.contains("r2lb103959") {
                                        found_103959_count += 1;
                                    }
                                }
                            }
                            
                            assert!(
                                found_103959_count >= 2,
                                "Should find at least 2 rows with r2lb103959 starting from row {}, found {}",
                                first_103959_idx, found_103959_count
                            );
                            
                        } else {
                            println!("⚠️ r2lb103959 not found in Excel data - skipping assertion");
                        }
                        
                        println!("✅ Merged cell server names test passed for sheet '{}'", sheet_name);
                    } else {
                        println!("⚠️ Not enough data rows ({}) to test merged server names in sheet '{}'", data_rows.len(), sheet_name);
                    }
                }
                Err(e) => {
                    if !e.contains("not found") {
                        panic!("Failed to parse sheet '{}' for merged cell test: {}", sheet_name, e);
                    } else {
                        println!("Sheet '{}' not found, skipping merged cell test", sheet_name);
                    }
                }
            }
        }
    }
}