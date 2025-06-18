// Debug script to test the service worker after removing duplicate init function
console.log('=== SERVICE WORKER DEBUGGING AFTER FIX ===');

// Check if the init function exists and what it does
console.log('typeof init:', typeof init);

// Test the patterns are loaded
console.log('blacklist length:', blacklist.length);
console.log('whitelist length:', whitelist.length);

// Check sync storage directly
chrome.storage.sync.get(['blacklist', 'whitelist']).then(result => {
  console.log('Sync storage blacklist length:', result.blacklist ? result.blacklist.length : 0);
  console.log('Sync storage whitelist length:', result.whitelist ? result.whitelist.length : 0);
  
  // If storage has data but memory doesn't, we know init isn't working
  if (result.blacklist && result.blacklist.length > 0 && blacklist.length === 0) {
    console.log('PROBLEM: Storage has data but memory is empty - init function issue');
  } else if (blacklist.length > 0) {
    console.log('SUCCESS: Memory has the same data as storage');
  }
  
  // Test pattern matching with current memory state
  if (blacklist.length > 0) {
    console.log('Testing pattern matching with current blacklist...');
    const testResult = checkUrlShouldBeBlocked('https://www.reddit.com/test');
    console.log('Should reddit.com/test be blocked?', testResult);
  }
}).catch(err => console.error('Storage check failed:', err));

console.log('=== DEBUG COMPLETE ===');
