console.log(`
🎯 COMPREHENSIVE SERVICE WORKER DEBUGGING GUIDE

Copy and paste this ENTIRE script into the Extension's Service Worker Console:

1. Go to chrome://extensions/
2. Find "Distract-Me-Not" extension
3. Click "service worker" link  
4. Paste this script and press Enter

This will test all aspects of the service worker initialization and pattern matching.
`);

// Copy this entire script into the Service Worker Console
// =======================================================

// Debug function 1: Check what storage actually contains
async function debugStorage() {
  console.log('=== STORAGE DEBUG ===');
  
  // Use Promise wrapper to handle storage properly
  const syncData = await new Promise((resolve) => {
    chrome.storage.sync.get(null, (result) => {
      resolve(result);
    });
  });
  
  const localData = await new Promise((resolve) => {
    chrome.storage.local.get(null, (result) => {
      resolve(result);
    });
  });
  
  console.log('SYNC STORAGE:', syncData);
  console.log('SYNC STORAGE keys:', Object.keys(syncData || {}));
  console.log('LOCAL STORAGE:', localData);
  console.log('LOCAL STORAGE keys:', Object.keys(localData || {}));
  
  console.log('Sync blacklist:', syncData?.blacklist?.slice(0, 3));
  console.log('Sync whitelist:', syncData?.whitelist?.slice(0, 3));
  console.log('Sync blacklist length:', syncData?.blacklist?.length || 0);
  console.log('Sync whitelist length:', syncData?.whitelist?.length || 0);
  
  return { syncData, localData };
}

// Debug function 2: Check current in-memory variables
function debugMemory() {
  console.log('=== MEMORY DEBUG ===');
  console.log('blacklist:', typeof blacklist, blacklist?.length, blacklist?.slice(0, 3));
  console.log('whitelist:', typeof whitelist, whitelist?.length, whitelist?.slice(0, 3));
  console.log('blacklistKeywords:', typeof blacklistKeywords, blacklistKeywords?.length);
  console.log('whitelistKeywords:', typeof whitelistKeywords, whitelistKeywords?.length);
  console.log('isEnabled:', isEnabled);
  console.log('mode:', mode);
}

// Debug function 3: Test pattern function directly
function testPatternFunction() {
  console.log('=== PATTERN FUNCTION DEBUG ===');
  
  if (typeof self.checkUrlShouldBeBlocked !== 'function') {
    console.error('Pattern function not available!');
    return false;
  }
  
  const testUrl = 'https://reddit.com/r/funny';
  const testBlacklist = ['reddit.com/*', 'facebook.com'];
  const testWhitelist = ['reddit.com/r/allowed'];
  
  console.log('Testing with:', { testUrl, testBlacklist, testWhitelist });
  
  const result = self.checkUrlShouldBeBlocked(testUrl, testWhitelist, testBlacklist);
  console.log('Pattern function result:', result);
  
  return result;
}

// Debug function 4: Force manual storage load
async function forceLoadStorage() {
  console.log('=== FORCING STORAGE LOAD ===');
  
  try {
    // Use Promise wrapper for storage
    const items = await new Promise((resolve) => {
      chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords', 'mode'], (result) => {
        resolve(result);
      });
    });
    
    console.log('Loaded from storage:', items);
    console.log('Storage keys:', Object.keys(items || {}));
    
    // Manually assign to global variables
    if (Array.isArray(items.blacklist)) {
      blacklist = items.blacklist;
      console.log('Assigned blacklist:', blacklist.length, 'items');
    } else {
      console.log('No blacklist in storage or not an array:', typeof items.blacklist, items.blacklist?.length);
    }
    
    if (Array.isArray(items.whitelist)) {
      whitelist = items.whitelist;
      console.log('Assigned whitelist:', whitelist.length, 'items');
    } else {
      console.log('No whitelist in storage or not an array:', typeof items.whitelist, items.whitelist?.length);
    }
    
    if (Array.isArray(items.blacklistKeywords)) {
      blacklistKeywords = items.blacklistKeywords;
      console.log('Assigned blacklistKeywords:', blacklistKeywords.length, 'items');
    }
    
    if (Array.isArray(items.whitelistKeywords)) {
      whitelistKeywords = items.whitelistKeywords;
      console.log('Assigned whitelistKeywords:', whitelistKeywords.length, 'items');
    }
    
    if (items.mode) {
      mode = items.mode;
      console.log('Assigned mode:', mode);
    }
    
    console.log('Manual load complete');
    debugMemory();
    
    return true;
  } catch (error) {
    console.error('Error loading storage:', error);
    return false;
  }
}

// Debug function 5: Test actual blocking
function testBlocking() {
  console.log('=== BLOCKING TEST ===');
  
  const testUrls = [
    'https://reddit.com/',
    'https://reddit.com/r/funny',
    'https://www.reddit.com/r/programming',
    'https://facebook.com/',
    'https://youtube.com/'
  ];
  
  testUrls.forEach(url => {
    try {
      const result = checkUrlShouldBeBlockedLocal(url);
      console.log(`${url}: ${result?.blocked ? 'BLOCKED' : 'ALLOWED'} (${result?.reason || 'no reason'})`);
    } catch (error) {
      console.error(`Error testing ${url}:`, error);
    }
  });
}

// Run comprehensive test
async function runFullTest() {
  console.log('🚀 STARTING COMPREHENSIVE TEST');
  
  console.log('\n1. Storage contents:');
  const storage = await debugStorage();
  
  console.log('\n2. Current memory state:');
  debugMemory();
  
  console.log('\n3. Pattern function test:');
  const patternTest = testPatternFunction();
  
  console.log('\n4. Force loading storage:');
  const loadSuccess = await forceLoadStorage();
  
  console.log('\n5. Testing blocking after manual load:');
  testBlocking();
  
  console.log('\n📊 SUMMARY:');
  const hasStorage = (storage.syncData.blacklist?.length || 0) > 0;
  const hasMemory = (blacklist?.length || 0) > 0;
  
  console.log(`Storage has data: ${hasStorage ? '✅ YES' : '❌ NO'}`);
  console.log(`Memory has data: ${hasMemory ? '✅ YES' : '❌ NO'}`);
  console.log(`Pattern function works: ${patternTest ? '✅ YES' : '❌ NO'}`);
  console.log(`Manual load works: ${loadSuccess ? '✅ YES' : '❌ NO'}`);
  
  if (hasStorage && !hasMemory) {
    console.log('\n⚠️ DIAGNOSIS: Storage has data but service worker memory is empty');
    console.log('This means the init() function is not loading data properly on startup');
  } else if (hasStorage && hasMemory) {
    console.log('\n✅ DIAGNOSIS: Everything is working correctly!');
  }
  
  return {
    hasStorage,
    hasMemory,
    patternTest,
    loadSuccess
  };
}

// Make functions available globally for manual testing
self.debugStorage = debugStorage;
self.debugMemory = debugMemory;
self.testPatternFunction = testPatternFunction;
self.forceLoadStorage = forceLoadStorage;
self.testBlocking = testBlocking;
self.runFullTest = runFullTest;

console.log(`
🎮 AVAILABLE FUNCTIONS:
- runFullTest() - Run comprehensive test
- debugStorage() - Check storage contents  
- debugMemory() - Check in-memory variables
- testPatternFunction() - Test pattern matching
- forceLoadStorage() - Manually load from storage
- testBlocking() - Test URL blocking

Run runFullTest() to start comprehensive testing.
`);

// Auto-run the full test
runFullTest();
