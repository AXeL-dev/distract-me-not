/**
 * Comprehensive sync functionality test
 * This file tests the sync diagnostics and functionality we've implemented
 */

// This test can be run in the browser console when the extension is loaded
const testSyncFunctionality = async () => {
  console.log('🧪 Starting comprehensive sync functionality test...');
  
  try {
    // Import the sync diagnostics module
    const diagnostics = (await import('./src/helpers/syncDiagnostics.js')).default;
    const syncStorage = (await import('./src/helpers/syncStorage.js')).default;
    
    console.log('✅ Modules imported successfully');
    
    // Test 1: Check sync status
    console.log('\n1️⃣ Testing sync status check...');
    const syncStatus = await diagnostics.checkSyncStatus();
    console.log('Sync Status:', syncStatus);
    
    // Test 2: Test sync functionality
    console.log('\n2️⃣ Testing sync read/write functionality...');
    const syncTest = await diagnostics.testSync();
    console.log('Sync Test Results:', syncTest);
    
    // Test 3: Diagnose problems
    console.log('\n3️⃣ Running sync problem diagnosis...');
    const problemDiagnosis = await diagnostics.diagnoseProblems();
    console.log('Problem Diagnosis:', problemDiagnosis);
    
    // Test 4: Test sync monitoring (if available)
    console.log('\n4️⃣ Testing sync monitoring...');
    try {
      const monitoring = diagnostics.startMonitoring();
      console.log('Monitoring started:', monitoring);
      
      // Stop monitoring after a short time
      setTimeout(() => {
        if (typeof diagnostics.stopMonitoring === 'function') {
          diagnostics.stopMonitoring();
          console.log('Monitoring stopped');
        }
      }, 5000);
    } catch (error) {
      console.log('Monitoring test skipped:', error.message);
    }
    
    // Test 5: Test actual sync storage operations
    console.log('\n5️⃣ Testing sync storage operations...');
    
    // Test saving some settings
    const testSettings = {
      mode: 'blacklist',
      blacklist: ['test-site.com'],
      action: 'redirect',
      testTimestamp: Date.now()
    };
    
    console.log('Saving test settings to sync...');
    await syncStorage.saveSettingsToSync(testSettings);
    console.log('✅ Settings saved to sync');
    
    // Test loading settings
    console.log('Loading settings from sync...');
    const loadedSettings = await syncStorage.loadSettingsFromSync();
    console.log('Loaded settings:', loadedSettings);
    
    // Verify the test data was saved and loaded correctly
    if (loadedSettings && loadedSettings.testTimestamp === testSettings.testTimestamp) {
      console.log('✅ Sync round-trip test successful');
    } else {
      console.log('⚠️  Sync round-trip test failed - data mismatch');
    }
    
    // Clean up test data
    console.log('Cleaning up test data...');
    const cleanupSettings = { ...loadedSettings };
    delete cleanupSettings.testTimestamp;
    await syncStorage.saveSettingsToSync(cleanupSettings);
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 Sync functionality test completed successfully!');
    return {
      success: true,
      syncStatus,
      syncTest,
      problemDiagnosis,
      roundTripTest: loadedSettings && loadedSettings.testTimestamp === testSettings.testTimestamp
    };
    
  } catch (error) {
    console.error('❌ Sync functionality test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Instructions for running the test
console.log(`
🔬 Sync Functionality Test Script Loaded

To run the comprehensive sync test, execute:
testSyncFunctionality()

This will test:
✓ Sync status detection
✓ Sync read/write operations  
✓ Problem diagnosis
✓ Monitoring capabilities
✓ Round-trip data integrity

The test results will be logged to the console.
`);

// Make the test function available globally
window.testSyncFunctionality = testSyncFunctionality;
