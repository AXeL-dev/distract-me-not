// TRACE INIT EXECUTION - Copy and paste into service worker console

console.log('=== TRACING INIT EXECUTION ===');

// Let's patch the init function to add debug logs
const originalInit = init;
window.debugInit = async function() {
  console.log('🔍 STARTING DEBUG INIT');
  
  try {
    console.log('📍 About to call storage.sync.get...');
    
    // Make the exact same call as the patched init function should make
    const items = await new Promise((resolve) => {
      chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords', 'mode', 'framesType', 'message', 'redirectUrl', 'schedule'], resolve);
    });
    
    console.log('📍 Raw items from storage:', items);
    console.log('📍 items.blacklist length:', items.blacklist ? items.blacklist.length : 'undefined');
    console.log('📍 items.whitelist length:', items.whitelist ? items.whitelist.length : 'undefined');
    
    // Create safeItems like the real code
    const safeItems = {
      blacklist: [], 
      whitelist: [],  
      blacklistKeywords: [], 
      whitelistKeywords: [], 
      mode: 'combined',
      framesType: ['main_frame'],
      message: '',
      redirectUrl: '',
      schedule: { isEnabled: false, days: {} },
      ...items
    };
    
    console.log('📍 safeItems after merge:');
    console.log('  - blacklist length:', safeItems.blacklist ? safeItems.blacklist.length : 'undefined');
    console.log('  - whitelist length:', safeItems.whitelist ? safeItems.whitelist.length : 'undefined');
    
    // Assign to global variables like the real code
    console.log('📍 Assigning to global variables...');
    blacklist = safeItems.blacklist || [];
    whitelist = safeItems.whitelist || [];
    blacklistKeywords = safeItems.blacklistKeywords || [];
    whitelistKeywords = safeItems.whitelistKeywords || [];
    
    console.log('📍 Global variables after assignment:');
    console.log('  - blacklist length:', blacklist.length);
    console.log('  - whitelist length:', whitelist.length);
    
    if (blacklist.length > 0) {
      console.log('✅ SUCCESS: Debug init loaded patterns!');
      
      // Test pattern matching
      if (typeof checkUrlShouldBeBlocked === 'function') {
        const blocked = checkUrlShouldBeBlocked('https://www.reddit.com/test');
        console.log('  - reddit.com/test blocked?', blocked);
      }
    } else {
      console.log('❌ FAILED: Debug init did not load patterns');
    }
    
  } catch (error) {
    console.log('❌ Debug init failed:', error);
  }
};

// Call our debug version
debugInit();
