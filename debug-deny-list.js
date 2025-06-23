/**
 * Debug test for deny list blocking functionality
 * This test will help identify why deny list words are not blocking
 */
console.log('=== DEBUGGING DENY LIST BLOCKING ===');

// 1. First check what's in the current lists
async function checkCurrentLists() {
  console.log('\n1. CHECKING CURRENT LISTS:');
  
  try {
    // Get data from chrome.storage (simulating the service worker)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const syncData = await chrome.storage.sync.get(['blacklist', 'whitelist', 'mode', 'isEnabled']);
      const localData = await chrome.storage.local.get(['isEnabled']);
      
      console.log('Sync storage data:', syncData);
      console.log('Local storage data:', localData);
      
      // Check what the service worker thinks it has
      if (typeof chrome.runtime !== 'undefined') {
        try {
          const blacklist = await sendMessage('getBlacklist');
          const whitelist = await sendMessage('getWhitelist');
          const mode = await sendMessage('getMode');
          const isEnabled = await sendMessage('getIsEnabled');
          
          console.log('Service worker reports:');
          console.log('- Blacklist (deny list):', blacklist);
          console.log('- Whitelist (allow list):', whitelist);
          console.log('- Mode:', mode);
          console.log('- Enabled:', isEnabled);
          
          return { blacklist, whitelist, mode, isEnabled };
        } catch (error) {
          console.error('Error getting data from service worker:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error checking current lists:', error);
  }
  
  return null;
}

// 2. Test URL blocking directly
async function testUrlBlocking() {
  console.log('\n2. TESTING URL BLOCKING:');
  
  const testUrls = [
    'https://www.reddit.com/',
    'https://reddit.com/',
    'https://www.facebook.com/',
    'https://youtube.com/',
    'https://www.youtube.com/'
  ];
  
  for (const url of testUrls) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const isBlocked = await sendMessage('testUrlMatching', [url]);
        console.log(`${url}: ${isBlocked ? 'BLOCKED ❌' : 'ALLOWED ✅'}`);
      } else {
        console.log(`${url}: Cannot test (no chrome runtime)`);
      }
    } catch (error) {
      console.error(`Error testing ${url}:`, error);
    }
  }
}

// 3. Test pattern matching
function testPatternMatching() {
  console.log('\n3. TESTING PATTERN MATCHING:');
  
  // Test the wildcardToRegExp function if available
  if (typeof wildcardToRegExp !== 'undefined') {
    const patterns = ['reddit.com', '*.reddit.com', 'reddit.com/*', 'youtube.com'];
    const testUrl = 'https://www.reddit.com/';
    
    patterns.forEach(pattern => {
      try {
        const regex = wildcardToRegExp(pattern);
        const matches = regex.test(testUrl);
        console.log(`Pattern "${pattern}" -> RegExp: ${regex} -> Matches "${testUrl}": ${matches}`);
      } catch (error) {
        console.error(`Error testing pattern "${pattern}":`, error);
      }
    });
  } else {
    console.log('wildcardToRegExp function not available');
  }
}

// 4. Check service worker blocking logic
async function testServiceWorkerBlocking() {
  console.log('\n4. TESTING SERVICE WORKER BLOCKING:');
  
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Try to call the blocking function directly
      const testUrl = 'https://www.reddit.com/';
      
      // First check if the URL should be blocked according to current rules
      const blockResult = await sendMessage('checkUrlShouldBeBlocked', testUrl);
      console.log(`Service worker blocking check for ${testUrl}:`, blockResult);
      
      // Also test with explicit lists
      const currentLists = await checkCurrentLists();
      if (currentLists) {
        console.log('Testing with current lists...');
        console.log('Would block reddit.com with current deny list:', 
          currentLists.blacklist.some(item => 
            testUrl.includes(item) || testUrl.includes(item.pattern || item)
          )
        );
      }
    }
  } catch (error) {
    console.error('Error testing service worker blocking:', error);
  }
}

// Helper function to send messages (mock if needed)
async function sendMessage(action, params) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action, params: params ? [params] : [] }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  } else {
    throw new Error('Chrome runtime not available');
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting deny list debugging...');
  
  const currentLists = await checkCurrentLists();
  await testUrlBlocking();
  testPatternMatching();
  await testServiceWorkerBlocking();
  
  console.log('\n=== DEBUGGING COMPLETE ===');
  
  // Summary
  console.log('\n=== SUMMARY ===');
  if (currentLists) {
    console.log(`Deny list has ${currentLists.blacklist?.length || 0} entries`);
    console.log(`Allow list has ${currentLists.whitelist?.length || 0} entries`);
    console.log(`Mode: ${currentLists.mode}`);
    console.log(`Enabled: ${currentLists.isEnabled}`);
    
    if (!currentLists.isEnabled) {
      console.log('❌ ISSUE FOUND: Extension is not enabled!');
    }
    
    if (currentLists.blacklist?.length === 0) {
      console.log('❌ ISSUE FOUND: Deny list is empty!');
    }
    
    if (currentLists.mode === 'allowlist' || currentLists.mode === 'whitelist') {
      console.log('⚠️  Note: Extension is in allow-list mode, deny list may not work as expected');
    }
  }
}

// Export for use in console
if (typeof window !== 'undefined') {
  window.debugDenyList = {
    runAllTests,
    checkCurrentLists,
    testUrlBlocking,
    testPatternMatching,
    testServiceWorkerBlocking
  };
  
  console.log('Debug functions available at window.debugDenyList');
  console.log('Run window.debugDenyList.runAllTests() to start debugging');
}

// Auto-run if in browser
if (typeof window !== 'undefined' && window.location) {
  runAllTests();
}
