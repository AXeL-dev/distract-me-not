import { syncStorage } from './syncStorage';
import { debug, isDevEnv, logInfo } from './debug';

/**
 * Settings that should sync between devices
 */
export const syncableSettings = [
  'mode',
  'action',
  'framesType',
  'blacklist',
  'whitelist',
  'blacklistKeywords',
  'whitelistKeywords',
  'message',
  'displayBlankPage',
  'displayBlockedLink',
  'redirectUrl',
  'schedule',
  'misc.hideReportIssueButton',
  'misc.showAddWebsitePrompt'
];

/**
 * Settings that should remain local to each device
 */
export const localOnlySettings = [
  'isEnabled',
  'password',
  'timer',
  'logs',
  'logsLength',
  'enableLogs',
  'enableTimer',
  'enableOnBrowserStartup'
];

export const diagnostics = {
  async checkSyncStatus() {
    const results = {
      syncAvailable: false,
      storageQuota: null,
      storageUsed: null,
      syncSettings: {},
      localSettings: {},
      syncableSettingsFound: [],
      localOnlySettingsFound: [],
      missingSettings: [],
      browser: navigator.userAgent,
      errors: []
    };

    try {
      // Check if sync storage is available
      results.syncAvailable = !!chrome?.storage?.sync;
      
      if (results.syncAvailable) {
        try {
          const syncInfo = await chrome.storage.sync.getBytesInUse(null);
          results.storageUsed = syncInfo;
  
          // Get sync quota if available
          if (chrome.storage.sync.getQuota) {
            const storageInfo = await chrome.storage.sync.getQuota();
            results.storageQuota = storageInfo || "Unknown";
          } else {
            results.storageQuota = "~100KB (API not available)";
          }
  
          // Get sync settings
          const syncSettings = await chrome.storage.sync.get(null);
          results.syncSettings = syncSettings;
          
          // Analyze what settings are present
          for (const key of syncableSettings) {
            if (key.includes('.')) {
              // Handle nested properties
              const [parent, child] = key.split('.');
              if (syncSettings[parent] && syncSettings[parent][child] !== undefined) {
                results.syncableSettingsFound.push(key);
              } else {
                results.missingSettings.push(key);
              }
            } else if (syncSettings[key] !== undefined) {
              results.syncableSettingsFound.push(key);
            } else {
              results.missingSettings.push(key);
            }
          }
        } catch (error) {
          results.errors.push({
            location: 'sync storage access',
            message: error.message,
            stack: error.stack
          });
        }
      }

      // Get local settings
      try {
        const localSettings = await chrome.storage.local.get(null);
        results.localSettings = localSettings;
        
        // Check which local-only settings exist
        for (const key of localOnlySettings) {
          if (key.includes('.')) {
            // Handle nested properties
            const [parent, child] = key.split('.');
            if (localSettings[parent] && localSettings[parent][child] !== undefined) {
              results.localOnlySettingsFound.push(key);
            }
          } else if (localSettings[key] !== undefined) {
            results.localOnlySettingsFound.push(key);
          }
        }
      } catch (error) {
        results.errors.push({
          location: 'local storage access',
          message: error.message,
          stack: error.stack
        });
      }

      return results;
    } catch (error) {
      results.errors.push({
        location: 'general operation',
        message: error.message,
        stack: error.stack
      });
      
      logInfo('Sync diagnostics error', error);
      return results;
    }
  },

  async clearSyncStorage() {
    try {
      await chrome.storage.sync.clear();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async forceSyncSettings() {
    try {
      // Get all current settings
      const allSettings = await syncStorage.get({
        // List all syncable settings with default values
        mode: 'blacklist',
        action: 'blockTab',
        framesType: ['main_frame'],
        blacklist: [],
        whitelist: [],
        blacklistKeywords: [],
        whitelistKeywords: [],
        schedule: { isEnabled: false, days: {} },
        message: '',
        displayBlankPage: false,
        displayBlockedLink: true,
        redirectUrl: '',
        misc: {
          hideReportIssueButton: false,
          showAddWebsitePrompt: false
        }
      });

      // Extract only the syncable settings
      const syncableSettingsObj = {};
      for (const key of syncableSettings) {
        if (key.includes('.')) {
          const [parent, child] = key.split('.');
          if (!syncableSettingsObj[parent]) syncableSettingsObj[parent] = {};
          if (allSettings[parent] && allSettings[parent][child] !== undefined) {
            syncableSettingsObj[parent][child] = allSettings[parent][child];
          }
        } else if (allSettings[key] !== undefined) {
          syncableSettingsObj[key] = allSettings[key];
        }
      }

      // Force save to sync storage
      await chrome.storage.sync.set(syncableSettingsObj);
      
      return { 
        success: true,
        syncedSettings: Object.keys(syncableSettingsObj)
      };
    } catch (error) {
      return { 
        success: false,
        error: error.message
      };
    }
  }
};

export const syncStatusLog = async () => {
  const status = await diagnostics.checkSyncStatus();
  console.log('===== SYNC DIAGNOSTICS =====');
  console.log('Sync available:', status.syncAvailable);
  console.log('Storage quota:', status.storageQuota);
  console.log('Storage used:', status.storageUsed);
  console.log('Browser:', status.browser);
  console.log('Synced settings:', status.syncableSettingsFound.join(', '));
  console.log('Missing syncable settings:', status.missingSettings.join(', '));
  console.log('Local settings:', status.localOnlySettingsFound.join(', '));
  
  if (status.errors.length) {
    console.log('Errors:', status.errors);
  }
  console.log('===========================');
  return status;
};

/**
 * Diagnostic tool for checking sync storage functionality
 * This file helps diagnose issues with Chrome Sync for settings
 */

// Test if chrome.storage.sync is available and working
export async function testSyncStorage() {
  const results = {
    syncAvailable: false,
    writeSuccessful: false,
    readSuccessful: false,
    dataMatched: false,
    syncError: null,
    quotaInfo: null,
    syncItems: null
  };
  
  // Check if sync is available
  if (!chrome.storage || !chrome.storage.sync) {
    results.syncError = 'chrome.storage.sync API is not available';
    return results;
  }
  
  results.syncAvailable = true;
  
  try {
    // Try to write a test value
    const testValue = { _syncTest: `test-${Date.now()}` };
    await chrome.storage.sync.set(testValue);
    results.writeSuccessful = true;
    
    // Try to read it back
    const readValue = await chrome.storage.sync.get('_syncTest');
    results.readSuccessful = true;
    
    // Check if the value matches
    if (readValue && readValue._syncTest === testValue._syncTest) {
      results.dataMatched = true;
    }
    
    // Clean up
    await chrome.storage.sync.remove('_syncTest');
    
    // Get sync storage usage information
    results.quotaInfo = await getSyncStorageInfo();
    
    // Get current sync items
    const syncItems = await chrome.storage.sync.get(null);
    results.syncItems = Object.keys(syncItems);
    
  } catch (error) {
    results.syncError = error.message || 'Unknown error in sync storage test';
  }
  
  return results;
}

// Get information about sync storage usage
async function getSyncStorageInfo() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.getBytesInUse(null, (bytesInUse) => {
        const info = {
          bytesInUse,
          percentUsed: (bytesInUse / chrome.storage.sync.QUOTA_BYTES) * 100,
          quotaBytes: chrome.storage.sync.QUOTA_BYTES,
          quotaBytesPerItem: chrome.storage.sync.QUOTA_BYTES_PER_ITEM,
          maxItems: chrome.storage.sync.MAX_ITEMS
        };
        resolve(info);
      });
    } catch (error) {
      resolve({
        error: error.message || 'Unknown error getting sync storage info'
      });
    }
  });
}

// Check if sync is enabled for this Google account
export function checkBrowserSyncStatus() {
  if (chrome.identity) {
    try {
      chrome.identity.getProfileUserInfo((userInfo) => {
        if (userInfo && userInfo.email) {
          logInfo('User is signed in:', userInfo.email);
          return { signedIn: true, email: userInfo.email };
        } else {
          logInfo('User is not signed in to Chrome');
          return { signedIn: false };
        }
      });
    } catch (error) {
      return { error: error.message || 'Unable to check sync status' };
    }
  }
  
  return { 
    signedIn: 'unknown',
    message: 'Unable to determine sign-in status - identity API not available'
  };
}

// Utility to manually sync settings from local to sync storage
export async function forceSyncToCloud() {
  const syncItems = {
    blacklist: [],
    whitelist: [],
    blacklistKeywords: [],
    whitelistKeywords: [],
    mode: '',
    framesType: [],
    message: '',
    redirectUrl: '',
    schedule: { isEnabled: false, days: {} }
  };
  
  try {
    // Get values from local storage
    const localValues = await chrome.storage.local.get(Object.keys(syncItems));
    
    // Only include values that exist
    Object.keys(syncItems).forEach(key => {
      if (localValues[key] !== undefined) {
        syncItems[key] = localValues[key];
      }
    });
    
    // Write to sync storage
    await chrome.storage.sync.set(syncItems);
    
    return { 
      success: true, 
      message: 'Settings pushed to sync storage', 
      syncedItems: Object.keys(syncItems).filter(key => localValues[key] !== undefined)
    };
  } catch (error) {
    return { 
      success: false, 
      message: 'Failed to push settings to sync storage', 
      error: error.message 
    };
  }
}

// Get complete sync diagnostics
export async function getSyncDiagnostics() {
  const results = {
    timestamp: new Date().toISOString(),
    syncTest: await testSyncStorage(),
    syncStatus: checkBrowserSyncStatus(),
    storageComparison: await compareStorages()
  };
  
  return results;
}

// Compare what's in sync vs local storage for debugging
async function compareStorages() {
  const syncItemKeys = [
    'blacklist',
    'whitelist', 
    'blacklistKeywords',
    'whitelistKeywords',
    'mode',
    'framesType',
    'message',
    'redirectUrl',
    'schedule'
  ];
  
  const comparison = {
    mismatchedItems: [],
    missingInSync: [],
    missingInLocal: [],
    matched: []
  };
  
  try {
    const syncData = await chrome.storage.sync.get(syncItemKeys);
    const localData = await chrome.storage.local.get(syncItemKeys);
    
    syncItemKeys.forEach(key => {
      const syncValue = JSON.stringify(syncData[key]);
      const localValue = JSON.stringify(localData[key]);
      
      if (syncData[key] === undefined && localData[key] !== undefined) {
        comparison.missingInSync.push(key);
      } else if (syncData[key] !== undefined && localData[key] === undefined) {
        comparison.missingInLocal.push(key);
      } else if (syncValue !== localValue) {
        comparison.mismatchedItems.push({
          key,
          syncValue: syncData[key],
          localValue: localData[key]
        });
      } else if (syncData[key] !== undefined && localData[key] !== undefined) {
        comparison.matched.push(key);
      }
    });
    
  } catch (error) {
    comparison.error = error.message || 'Error comparing storage';
  }
  
  return comparison;
}
