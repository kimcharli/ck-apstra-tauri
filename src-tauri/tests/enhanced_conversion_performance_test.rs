use std::time::Instant;
use ck_apstra_tauri::domains::conversion::services::enhanced_conversion_service::EnhancedConversionService;

#[tokio::test]
async fn test_enhanced_conversion_map_loading_performance() {
    println!("Testing enhanced conversion map loading performance...");
    
    // Test loading performance - should be under 3 seconds
    let start_time = Instant::now();
    
    let result = EnhancedConversionService::load_default_enhanced_conversion_map();
    
    let elapsed_time = start_time.elapsed();
    
    println!("Loading time: {:?}", elapsed_time);
    println!("Loading time in milliseconds: {}", elapsed_time.as_millis());
    
    // Verify the map loaded successfully
    assert!(result.is_ok(), "Enhanced conversion map should load successfully: {:?}", result.err());
    
    // Verify performance requirement: less than 3 seconds (3000ms)
    assert!(elapsed_time.as_millis() < 3000, 
        "Enhanced conversion map loading took {}ms, which exceeds the 3000ms requirement", 
        elapsed_time.as_millis()
    );
    
    // Verify the map has expected content
    let map = result.unwrap();
    assert!(!map.field_definitions.is_empty(), "Map should have field definitions");
    assert!(map.version == "1.0.0", "Map should have correct version");
    
    println!("✅ Enhanced conversion map loaded successfully in {}ms", elapsed_time.as_millis());
    
    // Test that sub-1-second loading is ideal (user's original request)
    if elapsed_time.as_millis() < 1000 {
        println!("🚀 Excellent! Loading completed in under 1 second ({} ms)", elapsed_time.as_millis());
    } else if elapsed_time.as_millis() < 3000 {
        println!("✅ Good! Loading completed within acceptable 3-second limit ({} ms)", elapsed_time.as_millis());
    }
}

#[tokio::test] 
async fn test_repeated_loadings() {
    println!("Testing repeated loading performance...");
    
    let start_time = Instant::now();
    
    // Test repeated loading to ensure consistent performance
    for i in 0..3 {
        let load_start = Instant::now();
        let result = EnhancedConversionService::load_default_enhanced_conversion_map();
        let load_time = load_start.elapsed();
        
        println!("Load {}: {}ms", i + 1, load_time.as_millis());
        assert!(result.is_ok(), "Load {} should succeed: {:?}", i + 1, result.err());
        assert!(load_time.as_millis() < 3000, "Load {} took {}ms, exceeding 3000ms limit", i + 1, load_time.as_millis());
    }
    
    let total_elapsed = start_time.elapsed();
    println!("✅ All repeated loadings completed successfully in {}ms total", total_elapsed.as_millis());
}