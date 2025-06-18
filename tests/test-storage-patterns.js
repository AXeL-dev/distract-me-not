// Test script to verify storage access patterns work correctly
// Run this in the service worker console

console.log('=== TESTING STORAGE ACCESS PATTERNS ===');

async function testStoragePatterns() {
  try {
    console.log('1. Testing async/await pattern...');
    
    // Test async/await (the old way that was failing)
    try {
      const asyncResult = await chrome.storage.sync.get(['blacklist', 'whitelist']);
      console.log('async/await result:', {
        keys: Object.keys(asyncResult || {}),
        blacklistLength: asyncResult?.blacklist?.length || 0,
        whitelistLength: asyncResult?.whitelist?.length || 0
      });
    } catch (error) {
      console.error('async/await failed:', error);
    }
    
    console.log('2. Testing callback pattern...');
    
    // Test callback pattern (the new way)
    const callbackResult = await new Promise((resolve, reject) => {
      chrome.storage.sync.get(['blacklist', 'whitelist'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Storage error'));
        } else {
          resolve(result || {});
        }
      });
    });
    
    console.log('callback pattern result:', {
      keys: Object.keys(callbackResult || {}),
      blacklistLength: callbackResult?.blacklist?.length || 0,
      whitelistLength: callbackResult?.whitelist?.length || 0
    });
    
    console.log('3. Testing direct callback (no Promise wrapper)...');
    
    // Test direct callback
    chrome.storage.sync.get(['blacklist', 'whitelist'], (directResult) => {
      console.log('direct callback result:', {
        keys: Object.keys(directResult || {}),
        blacklistLength: directResult?.blacklist?.length || 0,
        whitelistLength: directResult?.whitelist?.length || 0
      });
    });
    
    console.log('4. Testing with null (get all)...');
    
    const allResult = await new Promise((resolve, reject) => {
      chrome.storage.sync.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Storage error'));
        } else {
          resolve(result || {});
        }
      });
    });
    
    console.log('get all result:', {
      keys: Object.keys(allResult || {}),
      blacklistLength: allResult?.blacklist?.length || 0,
      whitelistLength: allResult?.whitelist?.length || 0
    });
    
    console.log('=== STORAGE PATTERN TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Storage pattern test failed:', error);
  }
}

// Run the test
testStoragePatterns();
