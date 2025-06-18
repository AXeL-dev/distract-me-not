// ROBUST STORAGE LOADING FIX
// This provides a bulletproof way to load storage data

console.log('🔧 APPLYING ROBUST STORAGE LOADING FIX');

// Create a robust storage loading function
async function robustStorageLoad() {
  logInfo('🚀 Starting robust storage load...');
  
  try {
    // Method 1: Try sync storage with Promise wrapper
    logInfo('📦 Attempting sync storage load (Method 1)...');
    
    const syncResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Storage operation timed out'));
      }, 5000);
      
      chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords', 'mode'], (result) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
    
    logInfo('✅ Sync storage successful:', {
      blacklistLength: syncResult?.blacklist?.length || 0,
      whitelistLength: syncResult?.whitelist?.length || 0,
      blacklistType: typeof syncResult?.blacklist,
      whitelistType: typeof syncResult?.whitelist
    });
    
    // Assign sync data if available
    if (Array.isArray(syncResult.blacklist)) {
      blacklist = syncResult.blacklist;
      logInfo(`✅ Loaded ${blacklist.length} blacklist items from sync`);
    }
    
    if (Array.isArray(syncResult.whitelist)) {
      whitelist = syncResult.whitelist;
      logInfo(`✅ Loaded ${whitelist.length} whitelist items from sync`);
    }
    
    if (Array.isArray(syncResult.blacklistKeywords)) {
      blacklistKeywords = syncResult.blacklistKeywords;
      logInfo(`✅ Loaded ${blacklistKeywords.length} blacklist keywords from sync`);
    }
    
    if (Array.isArray(syncResult.whitelistKeywords)) {
      whitelistKeywords = syncResult.whitelistKeywords;
      logInfo(`✅ Loaded ${whitelistKeywords.length} whitelist keywords from sync`);
    }
    
    if (syncResult.mode) {
      mode = syncResult.mode;
      logInfo(`✅ Set mode to: ${mode}`);
    }
    
    // If we got data from sync, we're done
    if (blacklist.length > 0 || whitelist.length > 0) {
      logInfo('🎉 Robust storage load completed successfully via sync storage');
      return true;
    }
    
    logInfo('⚠️ No data in sync storage, trying local storage...');
    
  } catch (syncError) {
    logError('❌ Sync storage failed:', syncError);
    logInfo('🔄 Falling back to local storage...');
  }
  
  try {
    // Method 2: Try local storage as fallback
    logInfo('🏠 Attempting local storage load (Method 2)...');
    
    const localResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Local storage operation timed out'));
      }, 5000);
      
      chrome.storage.local.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords', 'mode'], (result) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
    
    logInfo('✅ Local storage result:', {
      blacklistLength: localResult?.blacklist?.length || 0,
      whitelistLength: localResult?.whitelist?.length || 0
    });
    
    // Assign local data if available
    if (Array.isArray(localResult.blacklist)) {
      blacklist = localResult.blacklist;
      logInfo(`✅ Loaded ${blacklist.length} blacklist items from local`);
    }
    
    if (Array.isArray(localResult.whitelist)) {
      whitelist = localResult.whitelist;
      logInfo(`✅ Loaded ${whitelist.length} whitelist items from local`);
    }
    
    if (Array.isArray(localResult.blacklistKeywords)) {
      blacklistKeywords = localResult.blacklistKeywords;
    }
    
    if (Array.isArray(localResult.whitelistKeywords)) {
      whitelistKeywords = localResult.whitelistKeywords;
    }
    
    if (localResult.mode) {
      mode = localResult.mode;
    }
    
    if (blacklist.length > 0 || whitelist.length > 0) {
      logInfo('🎉 Robust storage load completed successfully via local storage');
      return true;
    }
    
  } catch (localError) {
    logError('❌ Local storage also failed:', localError);
  }
  
  // Method 3: Use defaults
  logInfo('⚠️ Using safe defaults - no data found in either storage');
  blacklist = [];
  whitelist = [];
  blacklistKeywords = [];
  whitelistKeywords = [];
  mode = 'combined';
  isEnabled = true;
  
  return false;
}

// Override the init function to use robust loading
const originalInit = init;
init = async function() {
  try {
    logInfo('🚀 Starting ROBUST initialization...');
    
    // Use robust storage loading
    const loadSuccess = await robustStorageLoad();
    
    // Load local settings
    try {
      const localSettings = await new Promise((resolve, reject) => {
        chrome.storage.local.get(['isEnabled'], (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        });
      });
      
      if (typeof localSettings.isEnabled === 'boolean') {
        isEnabled = localSettings.isEnabled;
      }
    } catch (localError) {
      logWarning('Could not load local settings:', localError);
    }
    
    // Log final state
    logInfo('🎯 Final robust initialization state:', {
      blacklistCount: blacklist.length,
      whitelistCount: whitelist.length,
      blacklistKeywordsCount: blacklistKeywords.length,
      whitelistKeywordsCount: whitelistKeywords.length,
      isEnabled: isEnabled,
      mode: mode
    });
    
    // Show sample data for verification
    if (blacklist.length > 0) {
      logInfo('📋 Sample blacklist items:', blacklist.slice(0, 3));
    }
    if (whitelist.length > 0) {
      logInfo('📋 Sample whitelist items:', whitelist.slice(0, 3));
    }
    
    // Set up navigation listeners
    setupNavigationListener();
    
    // Check all open tabs against the current rules
    if (isEnabled) {
      logInfo('Checking all open tabs against blocking rules');
      checkAllTabs();
    }
    
    // Set up periodic sync checking
    setupPeriodicSyncCheck();
    
    logInfo('🎉 ROBUST initialization completed successfully');
    
  } catch (error) {
    logError('❌ Error in robust initialization:', error);
  }
};

console.log(`
🎉 ROBUST STORAGE LOADING FIX APPLIED!

The init() function has been replaced with a bulletproof version that:
1. ✅ Tries sync storage with timeout protection
2. ✅ Falls back to local storage if sync fails  
3. ✅ Uses safe defaults if both fail
4. ✅ Has comprehensive error handling and logging
5. ✅ Provides detailed feedback at every step

Run the new init() to test: init()
`);

// Run the robust init immediately
init();
