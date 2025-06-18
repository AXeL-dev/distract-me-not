// Emergency fix for service worker initialization
// Run this in the service worker console to patch the initialization

console.log('🚨 EMERGENCY SERVICE WORKER INITIALIZATION FIX');

// Override the init function to ensure proper loading
const originalInit = init;

async function patchedInit() {
  console.log('🔧 Running patched init function...');
  
  try {
    // Clear existing state first
    blacklist = [];
    whitelist = [];
    blacklistKeywords = [];
    whitelistKeywords = [];
    
    console.log('Cleared existing state');
    
    // Load sync storage with explicit logging
    console.log('Loading from sync storage...');
    const syncData = await chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords', 'mode', 'isEnabled']);
    
    console.log('Sync storage result:', {
      blacklistLength: syncData.blacklist?.length || 0,
      whitelistLength: syncData.whitelist?.length || 0,
      mode: syncData.mode,
      isEnabled: syncData.isEnabled
    });
    
    // Assign data with validation
    if (Array.isArray(syncData.blacklist)) {
      blacklist = syncData.blacklist;
      console.log(`✅ Loaded ${blacklist.length} blacklist items`);
    }
    
    if (Array.isArray(syncData.whitelist)) {
      whitelist = syncData.whitelist;
      console.log(`✅ Loaded ${whitelist.length} whitelist items`);
    }
    
    if (Array.isArray(syncData.blacklistKeywords)) {
      blacklistKeywords = syncData.blacklistKeywords;
      console.log(`✅ Loaded ${blacklistKeywords.length} blacklist keywords`);
    }
    
    if (Array.isArray(syncData.whitelistKeywords)) {
      whitelistKeywords = syncData.whitelistKeywords;
      console.log(`✅ Loaded ${whitelistKeywords.length} whitelist keywords`);
    }
    
    // Set other settings
    if (syncData.mode) {
      mode = syncData.mode;
      console.log(`✅ Set mode to: ${mode}`);
    }
    
    // Load local settings
    console.log('Loading local settings...');
    const localData = await chrome.storage.local.get(['isEnabled']);
    if (typeof localData.isEnabled === 'boolean') {
      isEnabled = localData.isEnabled;
      console.log(`✅ Set isEnabled to: ${isEnabled}`);
    }
    
    // Log final state
    console.log('Final memory state:', {
      blacklistCount: blacklist.length,
      whitelistCount: whitelist.length,
      blacklistKeywordsCount: blacklistKeywords.length,
      whitelistKeywordsCount: whitelistKeywords.length,
      isEnabled: isEnabled,
      mode: mode
    });
    
    // Show sample data
    if (blacklist.length > 0) {
      console.log('Sample blacklist items:', blacklist.slice(0, 3));
    }
    if (whitelist.length > 0) {
      console.log('Sample whitelist items:', whitelist.slice(0, 3));
    }
    
    console.log('✅ Patched init completed successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Error in patched init:', error);
    return false;
  }
}

// Replace the init function
init = patchedInit;

// Run the patched init immediately
console.log('Running patched initialization...');
patchedInit().then(success => {
  if (success) {
    console.log('🎉 Service worker initialization completed successfully!');
    
    // Test a URL to confirm it's working
    const testUrl = 'https://reddit.com/r/funny';
    try {
      const result = checkUrlShouldBeBlockedLocal(testUrl);
      console.log(`Test result for ${testUrl}: ${result?.blocked ? 'BLOCKED' : 'ALLOWED'} (${result?.reason})`);
    } catch (error) {
      console.error('Error testing URL:', error);
    }
  } else {
    console.log('❌ Patched initialization failed');
  }
});

console.log(`
🎮 Emergency patch applied!

The service worker will now:
1. Properly load data from storage on initialization
2. Log each step for debugging
3. Validate all loaded data
4. Test blocking functionality

If this works, the original init() function needs to be updated with this logic.
`);
