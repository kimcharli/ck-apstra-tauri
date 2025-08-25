#!/usr/bin/env node

/**
 * DOM Rendering Test Runner
 * 
 * This script runs the ProvisioningPage DOM tests to detect blank page issues
 * that can occur during sheet selection and data processing.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 Running DOM Rendering Tests for Sheet Selection...\n');

try {
  // Run the specific DOM test file
  const result = execSync(
    'npx vitest run src/__tests__/ProvisioningPage.DOM.test.tsx --reporter=verbose',
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      encoding: 'utf8'
    }
  );
  
  console.log('\n✅ All DOM rendering tests passed!');
  console.log('✅ Sheet selection should not cause blank page issues.');
  
} catch (error) {
  console.error('\n❌ DOM rendering tests failed!');
  console.error('❌ There may be blank page issues in sheet selection.');
  console.error('\nError details:');
  console.error(error.stdout || error.message);
  
  console.log('\n🔧 Troubleshooting steps:');
  console.log('1. Check console for TypeScript compilation errors');
  console.log('2. Verify all imports are correct and components exist');
  console.log('3. Test with actual Excel file to reproduce issue');
  console.log('4. Check browser dev tools for JavaScript runtime errors');
  
  process.exit(1);
}

console.log('\n📋 Test Coverage:');
console.log('✅ Initial page structure rendering');
console.log('✅ Sheet selector display after file upload');
console.log('✅ Provisioning table rendering after sheet selection');
console.log('✅ Error handling without causing blank pages');
console.log('✅ Empty data handling');
console.log('✅ Null/undefined data handling');
console.log('✅ LAG processing integration');
console.log('✅ Data summary display');

console.log('\n🚨 If tests pass but you still see blank pages:');
console.log('1. Check for runtime TypeScript compilation errors');
console.log('2. Look for console errors in browser dev tools');
console.log('3. Verify Tauri backend is responding correctly');
console.log('4. Test with debug logging enabled: RUST_LOG=debug npm run tauri:dev');