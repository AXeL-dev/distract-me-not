// Simple debugging tool to check what's in extension storage
// This will help us understand why patterns aren't being loaded

console.log('=== STORAGE DEBUGGING TOOL ===\n');

// This should be run in the extension's DevTools console
// Go to chrome://extensions/, find Distract-Me-Not, click "service worker" or "background page"

function debugStorage() {
  console.log('=== CHECKING STORAGE CONTENTS ===');
  
  // Check sync storage
  chrome.storage.sync.get(null, (syncData) => {
    console.log('SYNC STORAGE:', syncData);
    console.log('Sync blacklist length:', syncData.blacklist?.length || 0);
    console.log('Sync whitelist length:', syncData.whitelist?.length || 0);
    console.log('Sync blacklist contents:', syncData.blacklist);
    console.log('Sync whitelist contents:', syncData.whitelist);
    console.log('Sync mode:', syncData.mode);
  });
  
  // Check local storage
  chrome.storage.local.get(null, (localData) => {
    console.log('LOCAL STORAGE:', localData);
    console.log('Local blacklist length:', localData.blacklist?.length || 0);
    console.log('Local whitelist length:', localData.whitelist?.length || 0);
    console.log('Local blacklist contents:', localData.blacklist);
    console.log('Local whitelist contents:', localData.whitelist);
    console.log('Local mode:', localData.mode);
    console.log('Local isEnabled:', localData.isEnabled);
  });
  
  // Check in-memory variables
  console.log('IN-MEMORY VARIABLES:');
  console.log('blacklist:', typeof blacklist !== 'undefined' ? blacklist : 'undefined');
  console.log('whitelist:', typeof whitelist !== 'undefined' ? whitelist : 'undefined');
  console.log('mode:', typeof mode !== 'undefined' ? mode : 'undefined');
  console.log('isEnabled:', typeof isEnabled !== 'undefined' ? isEnabled : 'undefined');
}

// Run the debug function
debugStorage();

// Also test the pattern matching directly
function testPatternMatching() {
  console.log('\n=== TESTING PATTERN MATCHING ===');
  
  const testUrl = 'https://www.reddit.com/r/cars/';
  const testPatterns = ['reddit.com/*', 'reddit.com'];
  
  console.log('Testing URL:', testUrl);
  
  testPatterns.forEach(pattern => {
    console.log(`\nTesting pattern: "${pattern}"`);
    
    if (typeof self.matchesPattern === 'function') {
      const matches = self.matchesPattern(pattern, testUrl);
      console.log(`self.matchesPattern result: ${matches}`);
    } else {
      console.log('self.matchesPattern not available');
    }
    
    if (typeof self.checkUrlShouldBeBlocked === 'function') {
      const shouldBlock = self.checkUrlShouldBeBlocked(testUrl, [], [pattern]);
      console.log(`self.checkUrlShouldBeBlocked result: ${shouldBlock ? 'BLOCK' : 'ALLOW'}`);
    } else {
      console.log('self.checkUrlShouldBeBlocked not available');
    }
  });
}

testPatternMatching();

console.log('\n=== MANUAL INSTRUCTIONS ===');
console.log('1. Copy this entire script');
console.log('2. Go to chrome://extensions/');
console.log('3. Find "Distract-Me-Not" extension');
console.log('4. Click "service worker" link');
console.log('5. Paste this script in the console and press Enter');
console.log('6. Share the output with the developer');
