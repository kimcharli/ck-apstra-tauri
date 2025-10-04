use ck_apstra_tauri::domains::conversion::services::enhanced_conversion_service::EnhancedConversionService;
use std::collections::HashMap;

#[test]
fn test_external_column_boolean_conversion() {
    // Load the default enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    let service = EnhancedConversionService::new();
    
    // Test various boolean representations that should work with the External column
    let test_cases = vec![
        ("Yes", "true"),
        ("No", "false"),
        ("yes", "true"),
        ("no", "false"),
        ("Y", "true"),
        ("N", "false"),
        ("1", "true"),
        ("0", "false"),
        ("true", "true"),
        ("false", "false"),
        ("TRUE", "true"),
        ("FALSE", "false"),
    ];
    
    for (input_value, expected_value) in test_cases {
        // Create field data with is_external field
        let mut field_data = HashMap::new();
        field_data.insert("is_external".to_string(), input_value.to_string());
        field_data.insert("switch_label".to_string(), "test-switch".to_string());
        field_data.insert("switch_ifname".to_string(), "et-0/0/1".to_string());
        
        // Apply field transformations using the enhanced conversion system
        let result = service.apply_field_transformations(&field_data, &enhanced_map)
            .expect(&format!("Should apply transformations for input: '{}'", input_value));
        
        // Check that is_external was transformed correctly
        let transformed_external = result.get("is_external")
            .expect("Transformed data should contain is_external");
        
        assert_eq!(transformed_external, expected_value, 
                   "External transformation failed: '{}' -> '{}', expected '{}'", 
                   input_value, transformed_external, expected_value);
        
        println!("✅ External transformation: '{}' -> '{}'", input_value, transformed_external);
    }
}

#[test]
fn test_external_column_default_false() {
    // Load the default enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    let service = EnhancedConversionService::new();
    
    // Create field data WITHOUT is_external field
    let mut field_data = HashMap::new();
    field_data.insert("switch_label".to_string(), "test-switch".to_string());
    field_data.insert("switch_ifname".to_string(), "et-0/0/1".to_string());
    field_data.insert("server_label".to_string(), "test-server".to_string());
    
    // Apply field transformations
    let result = service.apply_field_transformations(&field_data, &enhanced_map)
        .expect("Should apply transformations even without is_external field");
    
    // Check that is_external defaults to false when not present
    let external_value = result.get("is_external");
    
    // It should either be missing (to default to false) or explicitly false
    match external_value {
        None => {
            println!("✅ is_external field not present, will default to false in parser");
        }
        Some(value) => {
            // If present, it should be "false"
            assert_eq!(value, "false", "When is_external field is not in Excel, it should default to false");
            println!("✅ is_external explicitly set to false when missing from input");
        }
    }
}

#[test]  
fn test_verify_external_field_has_boolean_transformation() {
    // Load the default enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    // Verify that the is_external field has the boolean_conversion transformation
    let external_field = enhanced_map.field_definitions.get("is_external")
        .expect("is_external field should exist in default conversion map");
    
    let transformations = external_field.transformations.as_ref()
        .expect("is_external field should have transformations defined");
    
    assert!(transformations.contains(&"boolean_conversion".to_string()), 
            "is_external field should have 'boolean_conversion' transformation. Current transformations: {:?}", 
            transformations);
    
    // Verify transformation rule exists in the map
    let boolean_conversion_rule = enhanced_map.transformation_rules.get("boolean_conversion")
        .expect("boolean_conversion transformation rule should exist");
    
    assert_eq!(boolean_conversion_rule.name, "Boolean Conversion");
    println!("✅ is_external field has boolean_conversion transformation configured correctly");
}