use ck_apstra_tauri::domains::conversion::services::enhanced_conversion_service::EnhancedConversionService;
use std::collections::HashMap;

#[tokio::test]
async fn debug_lag_mode_transformation_and_conversion() {
    println!("\n🔍 DEBUG: Testing LAG mode transformation step by step");
    
    // Load the enhanced conversion map
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    let service = EnhancedConversionService::new();
    
    // Simulate Excel row data with "Yes" in LACP Needed
    let mut field_data = HashMap::new();
    field_data.insert("switch_label".to_string(), "test-switch".to_string());
    field_data.insert("switch_ifname".to_string(), "1".to_string());
    field_data.insert("server_label".to_string(), "test-server".to_string());
    field_data.insert("server_ifname".to_string(), "ens1".to_string());
    field_data.insert("link_group_lag_mode".to_string(), "Yes".to_string());
    
    println!("📥 Input field_data:");
    for (key, value) in &field_data {
        println!("   {} = '{}'", key, value);
    }
    
    // Step 1: Apply transformations
    println!("\n🔄 Step 1: Applying transformations...");
    match service.apply_field_transformations(&field_data, &enhanced_map) {
        Ok(transformed_data) => {
            println!("✅ Transformations applied successfully:");
            for (key, value) in &transformed_data {
                println!("   {} = '{}'", key, value);
            }
            
            // Check specifically what happened to link_group_lag_mode
            match transformed_data.get("link_group_lag_mode") {
                Some(value) => println!("   🎯 link_group_lag_mode = '{}'", value),
                None => println!("   ❌ link_group_lag_mode not found in transformed data"),
            }
            
            // Step 2: Test the NetworkConfigRow conversion manually
            println!("\n🔄 Step 2: Converting to NetworkConfigRow...");
            
            // Extract the lag mode value the same way the actual function does
            let link_group_lag_mode = transformed_data.get("link_group_lag_mode")
                .filter(|s| !s.trim().is_empty())
                .cloned()
                .or(Some("none".to_string()));
            
            println!("   📤 Final link_group_lag_mode value: {:?}", link_group_lag_mode);
            
            // Test the filter logic specifically
            println!("\n🔍 Step 3: Testing filter logic:");
            if let Some(raw_value) = transformed_data.get("link_group_lag_mode") {
                println!("   Raw value from transformation: '{}'", raw_value);
                println!("   Is empty after trim? {}", raw_value.trim().is_empty());
                println!("   Filter keeps it? {}", !raw_value.trim().is_empty());
                
                let filtered = Some(raw_value)
                    .filter(|s| !s.trim().is_empty())
                    .cloned();
                println!("   After filter: {:?}", filtered);
                
                let final_value = filtered.or(Some("none".to_string()));
                println!("   After .or(Some(\"none\")): {:?}", final_value);
            }
            
        },
        Err(e) => {
            println!("❌ Transformation failed: {}", e);
        }
    }
}

#[tokio::test]
async fn debug_different_lag_mode_inputs() {
    println!("\n🧪 DEBUG: Testing different LAG mode input values");
    
    let enhanced_map = EnhancedConversionService::load_default_enhanced_conversion_map()
        .expect("Should load default enhanced conversion map");
    
    let service = EnhancedConversionService::new();
    
    let test_inputs = vec!["Yes", "yes", "Y", "No", "no", "N", "", "lacp_active", "none"];
    
    for input in test_inputs {
        let mut field_data = HashMap::new();
        field_data.insert("switch_label".to_string(), "test-switch".to_string());
        field_data.insert("switch_ifname".to_string(), "1".to_string());
        field_data.insert("server_label".to_string(), "test-server".to_string());
        field_data.insert("link_group_lag_mode".to_string(), input.to_string());
        
        match service.apply_field_transformations(&field_data, &enhanced_map) {
            Ok(transformed_data) => {
                let not_found = "NOT_FOUND".to_string();
                let transformed_value = transformed_data.get("link_group_lag_mode")
                    .unwrap_or(&not_found);
                
                // Apply the same logic as the actual conversion function
                let final_value = transformed_data.get("link_group_lag_mode")
                    .filter(|s| !s.trim().is_empty())
                    .cloned()
                    .or(Some("none".to_string()));
                
                println!("   '{}' -> transformed: '{}' -> final: {:?}", 
                    input, transformed_value, final_value);
            },
            Err(e) => {
                println!("   '{}' -> ERROR: {}", input, e);
            }
        }
    }
}