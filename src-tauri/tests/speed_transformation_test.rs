use ck_apstra_tauri::services::enhanced_conversion_service::EnhancedConversionService;
use std::collections::HashMap;

#[test]
fn test_link_speed_transformation_from_enhanced_conversion() {
    // Load the default enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    let service = EnhancedConversionService::new();
    
    // Test data that simulates Excel input with various speed formats
    let test_cases = vec![
        ("25GB", "25G"),      // GB to G conversion
        ("100GB", "100G"),    // Large GB to G conversion
        ("10G", "10G"),       // Already normalized, should stay same
        ("1000M", "1000M"),   // Megabit, should stay same
        ("25 Gbps", "25G"),   // Gbps format to G
        ("10 GB", "10G"),     // GB with space
        ("", ""),             // Empty should stay empty
        ("40G", "40G"),       // Already normalized
    ];
    
    for (input_speed, expected_speed) in test_cases {
        // Create field data with link_speed field
        let mut field_data = HashMap::new();
        field_data.insert("link_speed".to_string(), input_speed.to_string());
        field_data.insert("switch_label".to_string(), "test-switch".to_string());
        
        // Apply field transformations using the enhanced conversion system
        let result = service.apply_field_transformations(&field_data, &enhanced_map)
            .expect(&format!("Should apply transformations for input: '{}'", input_speed));
        
        // Check that link_speed was transformed correctly
        let transformed_speed = result.get("link_speed")
            .expect("Transformed data should contain link_speed");
        
        assert_eq!(transformed_speed, expected_speed, 
                   "Speed transformation failed: '{}' -> '{}', expected '{}'", 
                   input_speed, transformed_speed, expected_speed);
        
        println!("✅ Speed transformation: '{}' -> '{}'", input_speed, transformed_speed);
    }
}

#[test]
fn test_verify_link_speed_field_has_transformation() {
    // Load the default enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    // Verify that the link_speed field has the normalize_speed transformation
    let link_speed_field = enhanced_map.field_definitions.get("link_speed")
        .expect("link_speed field should exist in default conversion map");
    
    let transformations = link_speed_field.transformations.as_ref()
        .expect("link_speed field should have transformations defined");
    
    assert!(transformations.contains(&"normalize_speed".to_string()), 
            "link_speed field should have 'normalize_speed' transformation. Current transformations: {:?}", 
            transformations);
    
    // Verify transformation rule exists in the map
    let normalize_speed_rule = enhanced_map.transformation_rules.get("normalize_speed")
        .expect("normalize_speed transformation rule should exist");
    
    assert_eq!(normalize_speed_rule.name, "Normalize Speed");
    println!("✅ link_speed field has normalize_speed transformation configured correctly");
}

#[test]
fn test_end_to_end_speed_transformation() {
    // Test the complete flow: Excel headers -> field mapping -> transformation
    let service = EnhancedConversionService::new();
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    // Simulate Excel headers that would map to link_speed
    let excel_headers = vec!["Speed".to_string()];
    
    // Convert headers using enhanced mapping
    let conversion_result = service.convert_headers_with_enhanced_map(&excel_headers, &enhanced_map)
        .expect("Should convert headers successfully");
    
    // Verify that "Speed" maps to "link_speed"
    let mapped_field = conversion_result.converted_headers.get("Speed")
        .expect("Speed header should map to a field");
    assert_eq!(mapped_field, "link_speed", "Speed header should map to link_speed field");
    
    // Create field data as would be done during Excel processing
    let mut field_data = HashMap::new();
    field_data.insert("link_speed".to_string(), "25GB".to_string());
    
    // Apply transformations
    let transformed_data = service.apply_field_transformations(&field_data, &enhanced_map)
        .expect("Should apply transformations");
    
    let final_speed = transformed_data.get("link_speed")
        .expect("Should have transformed link_speed");
    
    assert_eq!(final_speed, "25G", "Complete flow should transform 25GB to 25G");
    println!("✅ End-to-end test: Excel 'Speed: 25GB' -> transformed 'link_speed: 25G'");
}