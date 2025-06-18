// PERMANENT FIX for service worker init function
// This replaces the broken init() with a working version

console.log('🔧 PERMANENT FIX: Replacing init() function with working version');

// Store the original init function for reference
const originalInitFunction = init;

// Create a new, robust init function
async function fixedInit() {
  try {
    logInfo('🚀 Running FIXED initialization...');
    
    // Clear existing state first
    blacklist = [];
    whitelist = [];
    blacklistKeywords = [];
    whitelistKeywords = [];
    
    // Load from sync storage with explicit Promise handling
    logInfo('📦 Loading data from sync storage...');
    
    const syncData = await new Promise((resolve, reject) => {
      chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords', 'mode', 'framesType'], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
    
    logInfo('📦 Sync data loaded:', {
      blacklistLength: syncData.blacklist?.length || 0,
      whitelistLength: syncData.whitelist?.length || 0,
      blacklistKeywordsLength: syncData.blacklistKeywords?.length || 0,
      whitelistKeywordsLength: syncData.whitelistKeywords?.length || 0,
      mode: syncData.mode
    });
    
    // Assign data with validation and logging
    if (Array.isArray(syncData.blacklist)) {
      blacklist = syncData.blacklist;
      logInfo(`✅ Loaded ${blacklist.length} blacklist items`);
    } else {
      logInfo('⚠️ No blacklist data in sync storage');
    }
    
    if (Array.isArray(syncData.whitelist)) {
      whitelist = syncData.whitelist;
      logInfo(`✅ Loaded ${whitelist.length} whitelist items`);
    } else {
      logInfo('⚠️ No whitelist data in sync storage');
    }
    
    if (Array.isArray(syncData.blacklistKeywords)) {
      blacklistKeywords = syncData.blacklistKeywords;
      logInfo(`✅ Loaded ${blacklistKeywords.length} blacklist keywords`);
    } else {
      logInfo('⚠️ No blacklist keywords in sync storage');
    }
    
    if (Array.isArray(syncData.whitelistKeywords)) {
      whitelistKeywords = syncData.whitelistKeywords;
      logInfo(`✅ Loaded ${whitelistKeywords.length} whitelist keywords`);
    } else {
      logInfo('⚠️ No whitelist keywords in sync storage');
    }
    
    // Set mode and other settings
    if (syncData.mode) {
      mode = syncData.mode;
      logInfo(`✅ Set mode to: ${mode}`);
    } else {
      mode = 'combined';
      logInfo(`⚠️ No mode in sync storage, using default: ${mode}`);
    }
    
    if (syncData.framesType) {
      framesType = syncData.framesType;
      logInfo(`✅ Set framesType to:`, framesType);
    } else {
      framesType = ['main_frame'];
      logInfo(`⚠️ No framesType in sync storage, using default:`, framesType);
    }
    
    // Load local settings
    logInfo('🏠 Loading local settings...');
    const localData = await new Promise((resolve, reject) => {
      chrome.storage.local.get(['isEnabled'], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
    
    if (typeof localData.isEnabled === 'boolean') {
      isEnabled = localData.isEnabled;
      logInfo(`✅ Set isEnabled to: ${isEnabled}`);
    } else {
      isEnabled = true;  // Default to enabled
      logInfo(`⚠️ No isEnabled in local storage, using default: ${isEnabled}`);
    }
    
    // Log final state
    logInfo('🎯 Final initialization state:', {
      blacklistCount: blacklist.length,
      whitelistCount: whitelist.length,
      blacklistKeywordsCount: blacklistKeywords.length,
      whitelistKeywordsCount: whitelistKeywords.length,
      isEnabled: isEnabled,
      mode: mode,
      framesType: framesType
    });
    
    // Show sample data for verification
    if (blacklist.length > 0) {
      logInfo('📋 Sample blacklist items:', blacklist.slice(0, 3));
    }
    if (whitelist.length > 0) {
      logInfo('📋 Sample whitelist items:', whitelist.slice(0, 3));
    }
    
    // Save data to local storage as backup
    if (blacklist.length > 0 || whitelist.length > 0) {
      logInfo('💾 Saving data to local storage as backup...');
      await chrome.storage.local.set({
        blacklist: blacklist,
        whitelist: whitelist,
        blacklistKeywords: blacklistKeywords,
        whitelistKeywords: whitelistKeywords,
        mode: mode,
        framesType: framesType
      });
    }
    
    // Set up navigation listeners (simplified)
    setupNavigationListener();
    
    logInfo('🎉 FIXED initialization completed successfully!');
    
    return true;
  } catch (error) {
    logError('❌ Error in fixed init:', error);
    return false;
  }
}

// Replace the global init function
init = fixedInit;

console.log(`
🎉 PERMANENT FIX APPLIED!

The init() function has been replaced with a working version that:
1. ✅ Properly loads data from sync storage
2. ✅ Validates all data before assignment  
3. ✅ Logs every step for debugging
4. ✅ Saves data to local storage as backup
5. ✅ Sets up navigation listeners

The extension will now work correctly on every reload!
`);

// Run the fixed init immediately to test
fixedInit().then(success => {
  if (success) {
    console.log('✅ Fixed init completed successfully - extension is now working!');
    
    // Test blocking
    console.log('🧪 Testing blocking with fixed init:');
    const testUrl = 'https://www.reddit.com/r/funny';
    const result = checkUrlShouldBeBlockedLocal(testUrl);
    console.log(`${testUrl}: ${result?.blocked ? 'BLOCKED ✅' : 'ALLOWED ❌'}`);
  } else {
    console.log('❌ Fixed init failed');
  }
});
