// FIXED SERVICE WORKER TEST - Uses callback syntax instead of promises

console.log('=== TESTING SERVICE WORKER AFTER FIX ===');

// Check current state
console.log('Current state:');
console.log('- blacklist length:', blacklist ? blacklist.length : 'undefined');
console.log('- whitelist length:', whitelist ? whitelist.length : 'undefined');

// Check storage using callback syntax
chrome.storage.sync.get(['blacklist', 'whitelist'], (data) => {
  console.log('Storage state:');
  console.log('- sync blacklist length:', data.blacklist ? data.blacklist.length : 0);
  console.log('- sync whitelist length:', data.whitelist ? data.whitelist.length : 0);
  
  // Test if we need to call init manually
  if (data.blacklist && data.blacklist.length > 0 && (!blacklist || blacklist.length === 0)) {
    console.log('❌ MEMORY EMPTY BUT STORAGE HAS DATA - Calling init()...');
    if (typeof init === 'function') {
      init().then(() => {
        console.log('✅ Init completed! New state:');
        console.log('- blacklist length:', blacklist ? blacklist.length : 'undefined');
        console.log('- whitelist length:', whitelist ? whitelist.length : 'undefined');
        
        // Test blocking
        if (typeof checkUrlShouldBeBlocked === 'function' && blacklist && blacklist.length > 0) {
          const blocked = checkUrlShouldBeBlocked('https://www.reddit.com/test');
          console.log('- reddit.com/test blocked?', blocked);
        }
      }).catch(err => {
        console.log('❌ Init failed:', err);
      });
    } else {
      console.log('❌ init() function not found!');
    }
  } else if (blacklist && blacklist.length > 0) {
    console.log('✅ MEMORY AND STORAGE MATCH - Testing blocking...');
    if (typeof checkUrlShouldBeBlocked === 'function') {
      const blocked = checkUrlShouldBeBlocked('https://www.reddit.com/test');
      console.log('- reddit.com/test blocked?', blocked);
    }
  } else {
    console.log('ℹ️ Both memory and storage are empty');
  }
});
