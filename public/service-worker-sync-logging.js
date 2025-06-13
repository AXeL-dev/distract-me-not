/**
 * Enhanced logging for sync operations in the service worker
 * This file can be imported into the service worker to add detailed logging
 * for operations that involve Chrome's sync storage
 */

// Make functions available in the global scope for service worker
(function(global) {

const syncDebugEnabled = true;

// External interface for sync logging
global.syncDebug = {
  log: function(message, data) {
    if (syncDebugEnabled) {
      const timestamp = new Date().toISOString();
      const dataStr = data ? ` - ${JSON.stringify(data, (key, value) => {
        // Handle large arrays intelligently to avoid excessive logging
        if (Array.isArray(value) && value.length > 5) {
          return `Array[${value.length}]`;
        }
        return value;
      })}` : '';
      
      console.log(`[SYNC ${timestamp}] ${message}${dataStr}`);
      
      // If we have a broadcast channel for diagnostics page, use it
      try {
        if (typeof syncDiagnosticsChannel !== 'undefined') {
          syncDiagnosticsChannel.postMessage({
            type: 'syncLog',
            message: message,
            data: data,
            timestamp: timestamp
          });
        }
      } catch (e) {
        // Ignore broadcast errors
      }
    }
  },
  
  error: function(message, error) {
    if (syncDebugEnabled) {
      const timestamp = new Date().toISOString();
      const errorMsg = error ? ` - ${error.message || JSON.stringify(error)}` : '';
      
      console.error(`[SYNC ERROR ${timestamp}] ${message}${errorMsg}`);
      
      // If we have a broadcast channel for diagnostics page, use it
      try {
        if (typeof syncDiagnosticsChannel !== 'undefined') {
          syncDiagnosticsChannel.postMessage({
            type: 'syncError',
            message: message,
            error: error ? error.message || JSON.stringify(error) : null,
            timestamp: timestamp
          });
        }
      } catch (e) {
        // Ignore broadcast errors
      }
    }
  }
};

// Create a broadcast channel for communicating with the diagnostics page
let syncDiagnosticsChannel;
try {  syncDiagnosticsChannel = new BroadcastChannel('distract-me-not-sync-diagnostics');
  global.syncDebug.log('Broadcast channel created for sync diagnostics');
} catch (e) {
  console.warn('Failed to create broadcast channel:', e);
}

// Monitor Chrome storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    const changesArray = [];
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
      const changeType = !oldValue ? 'added' : !newValue ? 'removed' : 'modified';
      let changeInfo = {
        key,
        type: changeType
      };
      
      try {
        if (oldValue && newValue) {
          const oldStr = JSON.stringify(oldValue);
          const newStr = JSON.stringify(newValue);
          changeInfo.oldSize = oldStr.length;
          changeInfo.newSize = newStr.length;
          changeInfo.diff = newStr.length - oldStr.length;
        } else if (newValue) {
          changeInfo.newSize = JSON.stringify(newValue).length;
        } else if (oldValue) {
          changeInfo.oldSize = JSON.stringify(oldValue).length;
        }
      } catch (e) {
        // Ignore size calculation errors
      }
      
      changesArray.push(changeInfo);
    }
    
    if (changesArray.length > 0) {
      global.syncDebug.log(`Chrome ${area} storage changed`, changesArray);
    }
  }
});

// Wrap chrome.storage.sync methods to add logging
const originalSyncGet = chrome.storage.sync.get;
chrome.storage.sync.get = function(keys, callback) {
  try {
    let logData;
    
    if (keys === null || keys === undefined) {
      logData = { all: true };
    } else if (typeof keys === 'string') {
      logData = { key: keys };
    } else if (Array.isArray(keys)) {
      logData = { keys: keys };
    } else if (typeof keys === 'object') {    try {
      // Make sure keys is an object before calling Object.keys
      logData = { keys: keys && typeof keys === 'object' ? Object.keys(keys) : ['null_or_undefined'] };
    } catch (e) {
      logData = { objectError: String(e) };
    }
    } else {
      logData = { unknown: String(keys) };
    }      // Add default deny list/allow list arrays if needed
    // (Using legacy storage keys 'blacklist'/'whitelist' for backward compatibility)
    if (typeof keys === 'object' && keys) {
      // No-op - we'll handle this in the service worker initialization
      // Don't modify the keys object here as it might be null or read-only
    }
    
    global.syncDebug.log('Reading from sync storage', logData);
  } catch (e) {
    console.error('Error in sync logging wrapper:', e);
  }  return originalSyncGet.call(chrome.storage.sync, keys, function(result) {
    try {
      if (chrome.runtime.lastError) {
        global.syncDebug.error('Error reading from sync storage', chrome.runtime.lastError);
      } else {
        try {          // Ensure the result is an object to avoid errors
          const resultObj = result || {};
            // Don't modify the result object directly - just safely read from it
          const resultKeys = typeof resultObj === 'object' ? Object.keys(resultObj) : [];
          
          // Safely check values for log data
          const denyListItems = Array.isArray(resultObj.blacklist) ? resultObj.blacklist.length : 0;
          const allowListItems = Array.isArray(resultObj.whitelist) ? resultObj.whitelist.length : 0;
          const denyListKeywordsItems = Array.isArray(resultObj.blacklistKeywords) ? resultObj.blacklistKeywords.length : 0;
          const allowListKeywordsItems = Array.isArray(resultObj.whitelistKeywords) ? resultObj.whitelistKeywords.length : 0;
          
          global.syncDebug.log(`Successfully read ${resultKeys.length} keys from sync storage`, { 
            keys: resultKeys,
            denyListCount: denyListItems,
            allowListCount: allowListItems,
            denyListKeywordsCount: denyListKeywordsItems,
            allowListKeywordsCount: allowListKeywordsItems
          });
        } catch (e) {
          global.syncDebug.error('Error processing sync storage result', e);
        }
      }
    } catch (outerError) {
      console.error('Error in sync log result handler:', outerError);
    }
    
    if (callback) {
      try {
        callback(result);
      } catch (callbackError) {
        console.error('Error in sync storage callback:', callbackError);
      }
    }
  });
};

const originalSyncSet = chrome.storage.sync.set;
chrome.storage.sync.set = function(items, callback) {  let keys = [];
  try {
    if (items && typeof items === 'object') {
      keys = Object.keys(items);
    } else {
      console.warn('Sync set received non-object items:', items);
    }
  } catch (e) {
    console.error('Error getting keys from items:', e);
  }  
  global.syncDebug.log('Writing to sync storage', { keys: keys });
  
  return originalSyncSet.call(chrome.storage.sync, items, function() {    if (chrome.runtime.lastError) {
      global.syncDebug.error('Error writing to sync storage', chrome.runtime.lastError);
    } else {
      global.syncDebug.log('Successfully wrote to sync storage', { 
        keys: items && typeof items === 'object' ? Object.keys(items) : [],
        itemsType: typeof items
      });
    }
    
    if (callback) {
      callback();
    }
  });
};

// Add a sync storage query function for diagnostics
global.getSyncStorageQuota = function() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.getBytesInUse(null, (bytesInUse) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        const MAX_SYNC_STORAGE = 102400; // 100 KB maximum for Chrome sync storage
        const percentUsed = (bytesInUse / MAX_SYNC_STORAGE) * 100;
        
        resolve({
          bytesInUse,
          bytesTotal: MAX_SYNC_STORAGE,
          percentUsed: percentUsed.toFixed(2),
          remaining: MAX_SYNC_STORAGE - bytesInUse
        });
      });
    } catch (e) {
      reject(e);
    }
  });
};

// Diagnose the sync status in detail and print findings
global.diagnoseSyncStatus = async function() {
  if (!syncDebugEnabled) return;
  
  try {
    global.syncDebug.log('--- SYNC DIAGNOSTICS STARTING ---');
    
    // Check extension ID
    const extensionId = chrome.runtime.id;
    const manifest = chrome.runtime.getManifest();
    const hasManifestKey = !!manifest.key;
    global.syncDebug.log(`Extension ID: ${extensionId} (Manifest key present: ${hasManifestKey})`);
    
    // Try to get total sync quota and usage
    let quotaInfo = null;
    try {
      quotaInfo = await global.getSyncStorageQuota();
      global.syncDebug.log('Sync quota info:', quotaInfo);
      
      // If sync storage is completely empty, this might indicate a permissions issue
      if (quotaInfo.bytesInUse === 0) {
        global.syncDebug.log('WARNING: Sync storage reports 0 bytes used. Possible causes:');
        global.syncDebug.log('1. This is a fresh install with no data yet');
        global.syncDebug.log('2. Chrome sync is disabled or not signed in');
        global.syncDebug.log('3. Storage permission issues');
        global.syncDebug.log('4. Chrome is still synchronizing data from the cloud');
      }
    } catch (quotaError) {
      global.syncDebug.error('Failed to get sync quota info:', quotaError);
    }
    
    // Check browser sync status (Chrome only, falls back gracefully)
    try {
      if (typeof chrome.identity === 'object' && chrome.identity && chrome.identity.getProfileUserInfo) {
        chrome.identity.getProfileUserInfo(userInfo => {
          const isSignedIn = !!userInfo.email;
          global.syncDebug.log(`Chrome user signed in: ${isSignedIn ? 'YES' : 'NO'}`);
        });
      } else {
        global.syncDebug.log('Chrome identity API not available, cannot check sign-in status');
      }
    } catch (identityError) {
      // Identity permission might not be granted
      global.syncDebug.log('Unable to check Chrome sign-in status (permission may be needed)');
    }
    
    // Get all sync data
    global.syncDebug.log('Retrieving all sync data...');    try {
      const allSyncData = await chrome.storage.sync.get(null) || {};
      const syncKeys = allSyncData && typeof allSyncData === 'object' ? Object.keys(allSyncData) : [];
      global.syncDebug.log(`Retrieved ${syncKeys.length} keys from sync storage:`, syncKeys);
      
      // Count items in lists
      const blacklistCount = Array.isArray(allSyncData.blacklist) ? allSyncData.blacklist.length : 'NOT_ARRAY';
      const whitelistCount = Array.isArray(allSyncData.whitelist) ? allSyncData.whitelist.length : 'NOT_ARRAY';
      
      global.syncDebug.log(`Sync data counts - blacklist: ${blacklistCount}, whitelist: ${whitelistCount}`);
      
      // Check data validity
      if (typeof allSyncData.blacklist === 'undefined') {
        global.syncDebug.log('WARNING: blacklist is undefined in sync storage');
      } else if (!Array.isArray(allSyncData.blacklist)) {
        global.syncDebug.log(`WARNING: blacklist is not an array in sync storage (type: ${typeof allSyncData.blacklist})`);
      }
      
      if (typeof allSyncData.whitelist === 'undefined') {
        global.syncDebug.log('WARNING: whitelist is undefined in sync storage');
      } else if (!Array.isArray(allSyncData.whitelist)) {
        global.syncDebug.log(`WARNING: whitelist is not an array in sync storage (type: ${typeof allSyncData.whitelist})`);
      }
      
      // Attempt to calculate size of each item
      if (blacklistCount !== 'NOT_ARRAY' && whitelistCount !== 'NOT_ARRAY') {
        try {
          const blacklistSize = JSON.stringify(allSyncData.blacklist).length;
          const whitelistSize = JSON.stringify(allSyncData.whitelist).length;
          global.syncDebug.log(`Blacklist size: ~${blacklistSize} bytes, Whitelist size: ~${whitelistSize} bytes`);
        } catch (sizeError) {
          global.syncDebug.error('Error calculating list sizes:', sizeError);
        }
      }
    } catch (syncGetError) {
      global.syncDebug.error('Failed to get sync data:', syncGetError);
    }
    
    // Get local data for comparison
    try {
      const localData = await chrome.storage.local.get(['blacklist', 'whitelist']);
      const localBlacklistCount = Array.isArray(localData.blacklist) ? localData.blacklist.length : 'NOT_ARRAY';
      const localWhitelistCount = Array.isArray(localData.whitelist) ? localData.whitelist.length : 'NOT_ARRAY';
      
      global.syncDebug.log(`Local data counts - blacklist: ${localBlacklistCount}, whitelist: ${localWhitelistCount}`);
    } catch (localGetError) {
      global.syncDebug.error('Failed to get local data:', localGetError);
    }
    
    // Check for manifest key (critical for sync consistency)
    try {
      const manifestData = chrome.runtime.getManifest();
      if (manifestData.key) {
        global.syncDebug.log('Manifest KEY is present - good for sync consistency across installs');
      } else {
        global.syncDebug.log('WARNING: No "key" in manifest.json - this may cause sync inconsistency across installs');
      }
    } catch (manifestError) {
      global.syncDebug.error('Error checking manifest:', manifestError);
    }
    
    global.syncDebug.log('--- SYNC DIAGNOSTICS COMPLETE ---');
  } catch (error) {
    global.syncDebug.error('Error in sync diagnostics:', error);
  }
};

// Close the IIFE that wraps the module
})(self);
