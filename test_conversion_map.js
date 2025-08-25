// Simple test script to debug conversion map loading
// Run this in the browser console when the app is running

async function testConversionMapLoading() {
  console.log('Testing enhanced conversion map loading...');
  
  try {
    const result = await window.__TAURI__.invoke('load_enhanced_conversion_map', { filePath: null });
    console.log('✅ Enhanced conversion map loaded successfully:', result);
    console.log('Field definitions count:', Object.keys(result.field_definitions).length);
    return result;
  } catch (error) {
    console.error('❌ Enhanced conversion map loading failed:', error);
    return null;
  }
}

// Test the hook method too
async function testHookLoading() {
  console.log('Testing hook-based loading...');
  
  try {
    // This tests what the hook is doing
    const EnhancedConversionService = {
      loadEnhancedConversionMap: async (filePath) => {
        return await window.__TAURI__.invoke('load_enhanced_conversion_map', { filePath });
      }
    };
    
    const result = await EnhancedConversionService.loadEnhancedConversionMap();
    console.log('✅ Hook-based loading successful:', result);
    return result;
  } catch (error) {
    console.error('❌ Hook-based loading failed:', error);
    return null;
  }
}

// Run both tests
testConversionMapLoading();
testHookLoading();