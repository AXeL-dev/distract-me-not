// TEST AFTER STORAGE FIX - Copy and paste into service worker console

console.log('=== TESTING AFTER STORAGE FIX ===');

// Test the storage call directly to see what we get
chrome.storage.sync.get(['blacklist', 'whitelist'], (items) => {
  console.log('Direct storage call result:', items);
  console.log('- blacklist length from storage:', items.blacklist ? items.blacklist.length : 'undefined');
  console.log('- whitelist length from storage:', items.whitelist ? items.whitelist.length : 'undefined');
  
  // Now test init
  console.log('\nCalling init() after fix...');
  init().then(() => {
    console.log('Init completed! Memory state:');
    console.log('- blacklist length:', blacklist ? blacklist.length : 'undefined');
    console.log('- whitelist length:', whitelist ? whitelist.length : 'undefined');
    
    if (blacklist && blacklist.length > 0) {
      console.log('✅ SUCCESS: Patterns loaded into memory!');
      
      // Test blocking
      if (typeof checkUrlShouldBeBlocked === 'function') {
        const blocked = checkUrlShouldBeBlocked('https://www.reddit.com/test');
        console.log('- reddit.com/test blocked?', blocked);
      }
    } else {
      console.log('❌ STILL BROKEN: Init ran but memory is still empty');
    }
  }).catch(err => {
    console.log('❌ Init failed:', err);
  });
});
