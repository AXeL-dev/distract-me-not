// Complete end-to-end test script to verify the service worker fix
// This script will test both storage access and pattern matching in the service worker context

console.log('=== COMPLETE SERVICE WORKER TEST AFTER FIX ===');

// Step 1: Check basic service worker state
console.log('Step 1: Service Worker State Check');
console.log('- typeof init:', typeof init);
console.log('- blacklist length:', blacklist.length);
console.log('- whitelist length:', whitelist.length);

// Step 2: Check storage independently
console.log('\nStep 2: Storage Access Test');
chrome.storage.sync.get(['blacklist', 'whitelist']).then(result => {
  console.log('- Sync storage blacklist length:', result.blacklist ? result.blacklist.length : 0);
  console.log('- Sync storage whitelist length:', result.whitelist ? result.whitelist.length : 0);
  
  if (result.blacklist && result.blacklist.length > 0) {
    console.log('- Sample blacklist items:', result.blacklist.slice(0, 3));
  }
  
  // Step 3: Diagnose the issue
  console.log('\nStep 3: Issue Diagnosis');
  if (result.blacklist && result.blacklist.length > 0 && blacklist.length === 0) {
    console.log('❌ PROBLEM CONFIRMED: Storage has data but memory is empty');
    console.log('   This means init() is not loading patterns into memory variables');
    
    // Try to call init manually to see if it works
    console.log('\nStep 4: Manual Init Test');
    init().then(() => {
      console.log('Manual init() completed');
      console.log('- blacklist length after manual init:', blacklist.length);
      console.log('- whitelist length after manual init:', whitelist.length);
      
      if (blacklist.length > 0) {
        console.log('✅ SUCCESS: Manual init() loaded patterns correctly!');
        
        // Test pattern matching
        console.log('\nStep 5: Pattern Matching Test');
        const testResult = checkUrlShouldBeBlocked('https://www.reddit.com/test');
        console.log('- Should reddit.com/test be blocked?', testResult);
        
        console.log('\n✅ CONCLUSION: Service worker is working but init() was not called automatically on startup');
      } else {
        console.log('❌ PROBLEM: Even manual init() failed to load patterns');
      }
    }).catch(err => {
      console.log('❌ Manual init() failed:', err);
    });
    
  } else if (blacklist.length > 0) {
    console.log('✅ SUCCESS: Memory matches storage - service worker is working correctly');
    
    // Test pattern matching
    console.log('\nStep 4: Pattern Matching Test');
    const testResult = checkUrlShouldBeBlocked('https://www.reddit.com/test');
    console.log('- Should reddit.com/test be blocked?', testResult);
    
  } else {
    console.log('ℹ️  INFO: Both storage and memory are empty - this might be expected for a fresh install');
  }
}).catch(err => {
  console.error('❌ Storage access failed:', err);
});

console.log('\n=== TEST STARTED - CHECK CONSOLE FOR RESULTS ===');
