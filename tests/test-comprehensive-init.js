// Comprehensive service worker initialization test
// Run this script in the browser console to verify the fixes

console.log('=== SERVICE WORKER INITIALIZATION TEST ===');

async function comprehensiveTest() {
  try {
    console.log('1. Checking if service worker variables are accessible...');
    
    // Check if critical variables exist
    const checks = {
      blacklist: typeof blacklist !== 'undefined',
      whitelist: typeof whitelist !== 'undefined',
      syncSettings: typeof syncSettings !== 'undefined',
      localSettings: typeof localSettings !== 'undefined',
      init: typeof init === 'function'
    };
    
    console.log('Variable checks:', checks);
    
    if (!checks.init) {
      console.error('CRITICAL: init function not found!');
      return false;
    }
    
    console.log('2. Testing storage access...');
    
    // Test storage read operations
    const syncData = await chrome.storage.sync.get(syncSettings);
    console.log('Sync storage data:', {
      keys: Object.keys(syncData),
      blacklistExists: 'blacklist' in syncData,
      blacklistLength: syncData.blacklist?.length || 0,
      whitelistExists: 'whitelist' in syncData,
      whitelistLength: syncData.whitelist?.length || 0
    });
    
    const localData = await chrome.storage.local.get(localSettings);
    console.log('Local storage data:', {
      keys: Object.keys(localData),
      isEnabled: localData.isEnabled,
      hasTimer: 'timer' in localData
    });
    
    console.log('3. Testing current in-memory state...');
    console.log('Current blacklist length:', blacklist?.length || 'UNDEFINED');
    console.log('Current whitelist length:', whitelist?.length || 'UNDEFINED');
    console.log('Current isEnabled:', typeof isEnabled !== 'undefined' ? isEnabled : 'UNDEFINED');
    
    console.log('4. Testing pattern matching...');
    if (typeof wildcardToRegExp === 'function') {
      const testPattern = 'reddit.com/*';
      const regex = wildcardToRegExp(testPattern);
      const testUrl = 'reddit.com/r/programming';
      const matches = regex.test(testUrl);
      console.log(`Pattern "${testPattern}" matches "${testUrl}":`, matches);
    } else {
      console.warn('wildcardToRegExp function not available');
    }
    
    console.log('5. Re-running initialization...');
    await init();
    
    console.log('6. Post-init state check...');
    console.log('Post-init blacklist length:', blacklist?.length || 'UNDEFINED');
    console.log('Post-init whitelist length:', whitelist?.length || 'UNDEFINED');
    console.log('Post-init isEnabled:', typeof isEnabled !== 'undefined' ? isEnabled : 'UNDEFINED');
    
    console.log('=== COMPREHENSIVE TEST COMPLETED SUCCESSFULLY ===');
    return true;
    
  } catch (error) {
    console.error('=== COMPREHENSIVE TEST FAILED ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
comprehensiveTest();
