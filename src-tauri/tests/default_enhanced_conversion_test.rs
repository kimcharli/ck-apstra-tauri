use std::time::Instant;
use ck_apstra_tauri::domains::conversion::services::enhanced_conversion_service::EnhancedConversionService;

#[test]
fn test_default_enhanced_conversion_map_loading() {
    println!("Testing default enhanced conversion map loading performance...");
    
    // Test the actual service method that loads default data
    let start_time = Instant::now();
    
    let result = EnhancedConversionService::load_default_enhanced_conversion_map();
    
    let elapsed_time = start_time.elapsed();
    
    println!("Loading time: {:?}", elapsed_time);
    println!("Loading time in milliseconds: {}", elapsed_time.as_millis());
    
    // Verify the map loaded successfully
    assert!(result.is_ok(), "Default enhanced conversion map should load successfully: {:?}", result.err());
    
    // Verify performance requirement: less than 3 seconds (3000ms)
    assert!(elapsed_time.as_millis() < 3000, 
        "Enhanced conversion map loading took {}ms, which exceeds the 3000ms requirement", 
        elapsed_time.as_millis()
    );
    
    // Verify the map has expected content from default data
    let map = result.unwrap();
    
    // Check basic structure
    assert_eq!(map.version, "1.0.0", "Map should have correct version");
    assert_eq!(map.header_row, Some(2), "Map should have header row 2");
    assert!(!map.field_definitions.is_empty(), "Map should have field definitions");
    assert!(!map.transformation_rules.is_empty(), "Map should have transformation rules");
    
    // Check specific field definitions from default data
    assert!(map.field_definitions.contains_key("server_label"), "Should contain server_label field");
    assert!(map.field_definitions.contains_key("switch_label"), "Should contain switch_label field");
    assert!(map.field_definitions.contains_key("switch_ifname"), "Should contain switch_ifname field");
    
    // Check field definition structure for server_label
    let server_field = map.field_definitions.get("server_label").unwrap();
    assert_eq!(server_field.display_name, "Server Name");
    assert!(matches!(server_field.data_type, ck_apstra_tauri::models::enhanced_conversion_map::DataType::String));
    assert!(server_field.is_required);
    
    // Check transformation rules
    assert!(map.transformation_rules.contains_key("normalize_speed"), "Should contain normalize_speed transformation");
    assert!(map.transformation_rules.contains_key("boolean_conversion"), "Should contain boolean_conversion transformation");
    
    println!("✅ Default enhanced conversion map loaded successfully in {}ms", elapsed_time.as_millis());
    
    // Performance feedback
    if elapsed_time.as_millis() < 100 {
        println!("🚀 Excellent! Loading completed in under 100ms ({} ms)", elapsed_time.as_millis());
    } else if elapsed_time.as_millis() < 1000 {
        println!("✅ Very good! Loading completed in under 1 second ({} ms)", elapsed_time.as_millis());
    } else if elapsed_time.as_millis() < 3000 {
        println!("✅ Good! Loading completed within acceptable 3-second limit ({} ms)", elapsed_time.as_millis());
    }
    
    // Verify field count
    println!("Field definitions loaded: {}", map.field_definitions.len());
    println!("Transformation rules loaded: {}", map.transformation_rules.len());
}

#[test] 
fn test_repeated_default_map_loading() {
    println!("Testing repeated default conversion map loading...");
    
    let mut total_time = 0u128;
    let iterations = 5;
    
    for i in 1..=iterations {
        let start = Instant::now();
        let result = EnhancedConversionService::load_default_enhanced_conversion_map();
        let duration = start.elapsed();
        
        total_time += duration.as_millis();
        println!("Load {}: {}ms", i, duration.as_millis());
        
        assert!(result.is_ok(), "Load {} should succeed: {:?}", i, result.err());
        assert!(duration.as_millis() < 3000, "Load {} took {}ms, exceeding 3000ms limit", i, duration.as_millis());
    }
    
    let average_time = total_time / iterations as u128;
    println!("Average loading time: {}ms", average_time);
    
    if average_time < 100 {
        println!("🚀 Excellent average performance: under 100ms");
    } else if average_time < 1000 {
        println!("✅ Very good average performance: under 1 second");
    } else if average_time < 3000 {
        println!("✅ Good average performance: within 3-second limit");
    } else {
        println!("❌ Poor average performance: exceeds 3-second limit");
    }
    
    println!("✅ All repeated loadings completed successfully");
}

#[test]
fn test_data_type_serialization() {
    println!("Testing data type serialization from default data...");
    
    let result = EnhancedConversionService::load_default_enhanced_conversion_map();
    assert!(result.is_ok(), "Should load successfully");
    
    let map = result.unwrap();
    
    // Test that all enum values deserialize correctly (this was the bug)
    for (field_name, field_def) in &map.field_definitions {
        println!("Field '{}': data_type = {:?}", field_name, field_def.data_type);
        
        // Verify data type is one of the expected enum values
        match field_def.data_type {
            ck_apstra_tauri::models::enhanced_conversion_map::DataType::String |
            ck_apstra_tauri::models::enhanced_conversion_map::DataType::Number |
            ck_apstra_tauri::models::enhanced_conversion_map::DataType::Boolean |
            ck_apstra_tauri::models::enhanced_conversion_map::DataType::Array |
            ck_apstra_tauri::models::enhanced_conversion_map::DataType::Json => {
                // Valid data type
            }
        }
        
        // Test xlsx mappings enum values
        for mapping in &field_def.xlsx_mappings {
            println!("  Mapping '{}': type = {:?}", mapping.pattern, mapping.mapping_type);
            match mapping.mapping_type {
                ck_apstra_tauri::models::enhanced_conversion_map::MappingType::Exact |
                ck_apstra_tauri::models::enhanced_conversion_map::MappingType::Partial |
                ck_apstra_tauri::models::enhanced_conversion_map::MappingType::Regex |
                ck_apstra_tauri::models::enhanced_conversion_map::MappingType::Fuzzy => {
                    // Valid mapping type
                }
            }
        }
    }
    
    println!("✅ All data types and mappings deserialized correctly");
}