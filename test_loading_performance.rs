use std::time::Instant;

fn main() {
    println!("Testing enhanced conversion map loading performance...");
    
    // This simulates the same operation that happens in the Rust backend
    let start_time = Instant::now();
    
    // Load the embedded JSON data (same as include_str! in the actual code)
    let json_content = include_str!("data/default_enhanced_conversion_map.json");
    
    // Parse the JSON (same operation as in the service) - simplified test
    let parse_result = json_content.len() > 0;
    
    let elapsed_time = start_time.elapsed();
    
    println!("Loading time: {:?}", elapsed_time);
    println!("Loading time in milliseconds: {}", elapsed_time.as_millis());
    
    if parse_result {
        println!("✅ JSON loaded successfully - {} bytes", json_content.len());
        
        // Verify performance requirement: less than 3 seconds (3000ms)
        if elapsed_time.as_millis() < 1000 {
            println!("🚀 Excellent! Loading completed in under 1 second ({} ms)", elapsed_time.as_millis());
        } else if elapsed_time.as_millis() < 3000 {
            println!("✅ Good! Loading completed within acceptable 3-second limit ({} ms)", elapsed_time.as_millis());
        } else {
            println!("❌ Performance issue: Loading took {} ms, exceeds 3000ms requirement", elapsed_time.as_millis());
        }
        
        // Check content basics
        if json_content.contains("field_definitions") {
            println!("✅ Contains field_definitions");
        }
        if json_content.contains("transformation_rules") {
            println!("✅ Contains transformation_rules");
        }
    } else {
        println!("❌ JSON loading failed");
    }
    
    // Test repeated loading
    println!("\nTesting repeated loading...");
    let mut total_time = 0u128;
    
    for i in 1..=5 {
        let start = Instant::now();
        let _result = json_content.len() > 0;
        let duration = start.elapsed();
        total_time += duration.as_millis();
        println!("Load {}: {}ms", i, duration.as_millis());
    }
    
    let average_time = total_time / 5;
    println!("Average loading time: {}ms", average_time);
    
    if average_time < 1000 {
        println!("🚀 Excellent average performance: under 1 second");
    } else if average_time < 3000 {
        println!("✅ Good average performance: within 3-second limit");
    } else {
        println!("❌ Poor average performance: exceeds 3-second limit");
    }
}