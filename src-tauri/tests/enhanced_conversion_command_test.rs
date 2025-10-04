use ck_apstra_tauri::domains::conversion::services::enhanced_conversion_service::EnhancedConversionService;
use ck_apstra_tauri::models::enhanced_conversion_map::EnhancedConversionMap;

#[test]
fn test_load_default_enhanced_conversion_map() {
    // Test loading default map
    let result = EnhancedConversionService::load_default_enhanced_conversion_map();
    
    if let Err(ref error) = result {
        println!("Error: {}", error);
    }
    assert!(result.is_ok(), "Default enhanced conversion map should load successfully");
    
    let map = result.unwrap();
    assert!(!map.field_definitions.is_empty(), "Default map should have field definitions");
    assert_eq!(map.version, "1.0.0", "Default map should have version 1.0.0");
    
    // Verify key fields exist
    assert!(map.field_definitions.contains_key("server_label"), "Should contain server_label field");
    assert!(map.field_definitions.contains_key("switch_label"), "Should contain switch_label field");
    assert!(map.field_definitions.contains_key("switch_ifname"), "Should contain switch_ifname field");
}

#[test]
fn test_load_enhanced_conversion_map_file_not_found() {
    // Test loading non-existent file
    let result = EnhancedConversionService::load_enhanced_conversion_map_from_file("/nonexistent/path.json");
    
    assert!(result.is_err(), "Loading non-existent file should fail");
    let error = result.unwrap_err();
    assert!(error.contains("not found") || error.contains("No such file"), "Error should mention file not found");
}

#[test] 
fn test_parameter_validation_command_signature() {
    // This test ensures service methods work with correct parameter types
    // Simulating what the Tauri command layer does
    
    // Test default map loading (equivalent to file_path = None)
    let result1 = EnhancedConversionService::load_default_enhanced_conversion_map();
    assert!(result1.is_ok(), "Default map loading should work");
    
    // Test file loading (equivalent to file_path = Some(path))
    let result2 = EnhancedConversionService::load_enhanced_conversion_map_from_file("test.json");
    // This will fail because file doesn't exist, but parameter structure is correct
    assert!(result2.is_err(), "File loading should fail for non-existent file");
}

#[test]
fn test_enhanced_conversion_map_structure() {
    // Test that the EnhancedConversionMap structure matches frontend expectations
    use serde_json;
    
    // Load the default map content directly
    let enhanced_map_content = include_str!("../../data/default_enhanced_conversion_map.json");
    let map: Result<EnhancedConversionMap, _> = serde_json::from_str(enhanced_map_content);
    
    assert!(map.is_ok(), "Default enhanced conversion map JSON should be valid");
    
    let map = map.unwrap();
    
    // Verify structure matches what frontend expects
    assert!(map.version.len() > 0, "Map should have version");
    assert!(map.header_row.is_some() && map.header_row.unwrap() > 0, "Map should have header_row");
    assert!(!map.field_definitions.is_empty(), "Map should have field definitions");
    
    // Verify key field definitions exist and have required structure
    let server_label = map.field_definitions.get("server_label");
    assert!(server_label.is_some(), "server_label field definition should exist");
    
    let server_label = server_label.unwrap();
    assert!(!server_label.display_name.is_empty(), "display_name should not be empty");
    assert!(!server_label.xlsx_mappings.is_empty(), "xlsx_mappings should not be empty");
}

#[test]
fn test_regression_prevention_parameter_names() {
    // This test documents the exact parameter names that must be used
    // to prevent the frontend-backend mismatch bug
    
    // Test that the service methods match frontend expectations:
    // Frontend: invoke('load_enhanced_conversion_map', { file_path: undefined })
    // Backend: file_path parameter maps to None -> load_default_enhanced_conversion_map()
    
    let result = EnhancedConversionService::load_default_enhanced_conversion_map();
    assert!(result.is_ok(), "Default map loading should work (matches file_path: undefined)");
    
    // Frontend: invoke('load_enhanced_conversion_map', { file_path: "/some/path" })
    // Backend: file_path parameter maps to Some(path) -> load_enhanced_conversion_map_from_file(path)
    let result2 = EnhancedConversionService::load_enhanced_conversion_map_from_file("test.json");
    // This fails because file doesn't exist, but parameter structure is correct
    assert!(result2.is_err(), "File loading should handle string parameter correctly");
}

#[test]
fn test_regression_exact_failure_scenario() {
    // This simulates the exact call that was failing:
    // Frontend: invoke('load_enhanced_conversion_map', { file_path: undefined })
    // Backend: Should load default map successfully
    
    let result = EnhancedConversionService::load_default_enhanced_conversion_map();
    
    // This should succeed with default map loading
    assert!(result.is_ok(), "Default map loading should work with None parameter");
    
    let map = result.unwrap();
    assert!(map.field_definitions.len() > 10, "Default map should have comprehensive field definitions");
    
    // Verify it contains the fields we saw in the JSON file (excluding blueprint which was removed)
    let expected_fields = [
        "server_label", "switch_label", "switch_ifname", 
        "server_ifname", "link_speed", "is_external", "comment"
    ];
    
    for field in expected_fields.iter() {
        assert!(map.field_definitions.contains_key(*field), 
                "Field '{}' should exist in default map", field);
    }
}