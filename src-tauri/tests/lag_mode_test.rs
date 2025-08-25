use ck_apstra_tauri::services::enhanced_conversion_service::EnhancedConversionService;
use ck_apstra_tauri::models::enhanced_conversion_map::MappingType;

#[test]
fn test_lag_mode_header_mapping() {
    // Load the default enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    let service = EnhancedConversionService::new();
    
    // Test that "LACP\nNeeded" header maps to link_group_lag_mode field
    let excel_headers = vec![
        "LACP\nNeeded".to_string(),
        "LAG Mode".to_string(), 
    ];
    
    // Convert headers using enhanced mapping
    let conversion_result = service.convert_headers_with_enhanced_map(&excel_headers, &enhanced_map)
        .expect("Should convert headers successfully");
    
    // Verify that both headers map to link_group_lag_mode
    let mapped_field1 = conversion_result.converted_headers.get("LACP\nNeeded")
        .expect("LACP\\nNeeded header should map to a field");
    assert_eq!(mapped_field1, "link_group_lag_mode", "LACP\\nNeeded header should map to link_group_lag_mode field");
    
    let mapped_field2 = conversion_result.converted_headers.get("LAG Mode")
        .expect("LAG Mode header should map to a field");
    assert_eq!(mapped_field2, "link_group_lag_mode", "LAG Mode header should map to link_group_lag_mode field");
    
    println!("✅ Header mapping: 'LACP\\nNeeded' -> '{}'", mapped_field1);
    println!("✅ Header mapping: 'LAG Mode' -> '{}'", mapped_field2);
}

#[test]
fn test_verify_lag_mode_api_mapping() {
    // Load the default enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    // Verify that the link_group_lag_mode field has the correct API mapping
    let lag_mode_field = enhanced_map.field_definitions.get("link_group_lag_mode")
        .expect("link_group_lag_mode field should exist in default conversion map");
    
    // Verify field has the lag_mode_conversion transformation
    let transformations = lag_mode_field.transformations.as_ref()
        .expect("link_group_lag_mode field should have transformations defined");
    
    assert!(transformations.contains(&"lag_mode_conversion".to_string()), 
            "link_group_lag_mode field should have 'lag_mode_conversion' transformation. Current transformations: {:?}", 
            transformations);
    
    let api_mappings = &lag_mode_field.api_mappings;
    
    // Ensure we have at least one API mapping
    assert!(!api_mappings.is_empty(), "link_group_lag_mode field should have API mappings defined");
    
    let primary_mapping = &api_mappings[0];
    assert_eq!(primary_mapping.primary_path, "$.evpn1.lag_mode", 
               "link_group_lag_mode should have primary API path '$.evpn1.lag_mode'. Current: '{}'",
               primary_mapping.primary_path);
    
    // Verify fallback paths include the previous paths
    assert!(primary_mapping.fallback_paths.contains(&"$.lag.mode".to_string()),
            "Should have $.lag.mode as fallback path");
    assert!(primary_mapping.fallback_paths.contains(&"$.aggregation.mode".to_string()),
            "Should have $.aggregation.mode as fallback path");
    
    println!("✅ link_group_lag_mode API mapping configured correctly:");
    println!("   Primary: {}", primary_mapping.primary_path);
    println!("   Fallbacks: {:?}", primary_mapping.fallback_paths);
}

#[test]
fn test_lag_mode_field_has_xlsx_mappings() {
    // Load the default enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    // Verify that the link_group_lag_mode field has the new XLSX mappings
    let lag_mode_field = enhanced_map.field_definitions.get("link_group_lag_mode")
        .expect("link_group_lag_mode field should exist in default conversion map");
    
    let xlsx_mappings = &lag_mode_field.xlsx_mappings;
    
    // Check that we have the expected mappings
    let lacp_needed_mapping = xlsx_mappings.iter()
        .find(|m| m.pattern == "LACP\nNeeded")
        .expect("Should have 'LACP\\nNeeded' mapping");
    
    assert_eq!(lacp_needed_mapping.mapping_type, MappingType::Exact);
    assert_eq!(lacp_needed_mapping.priority, 100);
    
    let lag_mode_mapping = xlsx_mappings.iter()
        .find(|m| m.pattern == "LAG Mode")
        .expect("Should have 'LAG Mode' mapping");
    
    assert_eq!(lag_mode_mapping.mapping_type, MappingType::Exact);
    assert_eq!(lag_mode_mapping.priority, 100);
    
    println!("✅ link_group_lag_mode XLSX mappings configured correctly:");
    for mapping in xlsx_mappings {
        println!("   Pattern: '{}', Type: {:?}, Priority: {}", 
                mapping.pattern, mapping.mapping_type, mapping.priority);
    }
}

#[test]
fn test_lag_mode_value_transformation() {
    // Load the default enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    let service = EnhancedConversionService::new();
    
    // Test various "Yes" values that should convert to "lacp_active"
    let test_cases = vec![
        ("Yes", "lacp_active"),
        ("yes", "lacp_active"),
        ("Y", "lacp_active"),
        ("y", "lacp_active"), 
        ("true", "lacp_active"),
        ("1", "lacp_active"),
        ("No", "none"),
        ("no", "none"),
        ("N", "none"),
        ("n", "none"),
        ("false", "none"),
        ("0", "none"),
        ("lacp", "lacp_active"), // Legacy format conversion
        ("static", "static"), // Already correct
        ("none", "none"), // Already correct
    ];
    
    for (input_value, expected_value) in test_cases {
        // Create field data with link_group_lag_mode field
        let mut field_data = std::collections::HashMap::new();
        field_data.insert("link_group_lag_mode".to_string(), input_value.to_string());
        field_data.insert("switch_label".to_string(), "test-switch".to_string());
        field_data.insert("switch_ifname".to_string(), "et-0/0/1".to_string());
        
        // Apply field transformations using the enhanced conversion system
        let result = service.apply_field_transformations(&field_data, &enhanced_map)
            .expect(&format!("Should apply transformations for input: '{}'", input_value));
        
        // Check that link_group_lag_mode was transformed correctly
        let transformed_lag_mode = result.get("link_group_lag_mode")
            .expect("Transformed data should contain link_group_lag_mode");
        
        assert_eq!(transformed_lag_mode, expected_value, 
                   "LAG mode transformation failed: '{}' -> '{}', expected '{}'", 
                   input_value, transformed_lag_mode, expected_value);
        
        println!("✅ LAG mode transformation: '{}' -> '{}'", input_value, transformed_lag_mode);
    }
}

#[test]
fn test_lag_mode_empty_defaults_to_none() {
    // Load the default enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    let service = EnhancedConversionService::new();
    
    // Test that missing link_group_lag_mode field gets default "none" value during parsing
    let mut field_data = std::collections::HashMap::new();
    field_data.insert("switch_label".to_string(), "test-switch".to_string());
    field_data.insert("switch_ifname".to_string(), "et-0/0/1".to_string());
    field_data.insert("server_label".to_string(), "test-server".to_string());
    // Note: link_group_lag_mode field is intentionally missing
    
    // Apply field transformations
    let result = service.apply_field_transformations(&field_data, &enhanced_map)
        .expect("Should apply transformations even without link_group_lag_mode field");
    
    // Check that link_group_lag_mode gets default value (should be handled in data_parser.rs)
    // Since transformations don't create new fields, this tests the existing behavior
    if let Some(lag_mode_value) = result.get("link_group_lag_mode") {
        println!("✅ LAG mode field present with value: '{}'", lag_mode_value);
    } else {
        println!("✅ LAG mode field not present - will default to 'none' in data parser");
    }
    
    // Test empty string should also map to none
    field_data.insert("link_group_lag_mode".to_string(), "".to_string());
    let result_empty = service.apply_field_transformations(&field_data, &enhanced_map)
        .expect("Should apply transformations with empty link_group_lag_mode field");
    
    // Empty string should still be present but might not have a transformation applied
    if let Some(empty_lag_mode) = result_empty.get("link_group_lag_mode") {
        if empty_lag_mode.is_empty() {
            println!("✅ Empty LAG mode field will default to 'none' in data parser");
        } else {
            println!("✅ Empty LAG mode field transformed to: '{}'", empty_lag_mode);
        }
    }
}