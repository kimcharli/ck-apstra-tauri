// Simple test to verify enhanced conversion system works
const { invoke } = require('@tauri-apps/api/tauri');

async function testEnhancedConversion() {
  console.log('Testing enhanced conversion system...');
  
  try {
    // Test loading default enhanced conversion map
    console.log('Loading default enhanced conversion map...');
    const map = await invoke('load_enhanced_conversion_map');
    console.log('Success! Map loaded:', map);
    
    return true;
  } catch (error) {
    console.error('Error testing enhanced conversion:', error);
    return false;
  }
}

// This would be run in a browser context with Tauri
if (typeof window !== 'undefined' && window.__TAURI__) {
  testEnhancedConversion().then(success => {
    console.log('Test completed:', success ? 'PASSED' : 'FAILED');
  });
} else {
  console.log('This test needs to run in a Tauri context');
}