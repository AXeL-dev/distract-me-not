import { syncStorage } from './syncStorage';
import { logInfo } from './debug';

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
  },

  /**
   * Test sync functionality by writing and reading test data
   */
  async testSync() {
    const testId = `sync_test_${Date.now()}`;
    const testData = {
      testTimestamp: new Date().toISOString(),
      testId: testId,
      testArray: ['test1', 'test2', 'test3'],
      testObject: { nested: { value: 'test' } }
    };

    const results = {
      testId: testId,
      startTime: new Date().toISOString(),
      success: false,
      steps: [],
      errors: []
    };

    try {
      // Step 1: Write to sync storage
      results.steps.push('Writing test data to sync storage...');
      await chrome.storage.sync.set({ [testId]: testData });
      results.steps.push('✓ Successfully wrote to sync storage');

      // Wait a moment for potential replication
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 2: Read from sync storage
      results.steps.push('Reading test data from sync storage...');
      const readData = await chrome.storage.sync.get(testId);
      if (!readData[testId]) {
        throw new Error('Test data not found in sync storage after write');
      }
      results.steps.push('✓ Successfully read from sync storage');

      // Step 3: Verify data integrity
      results.steps.push('Verifying data integrity...');
      if (!this.isDataIntegrityValid(testData, readData[testId])) {
        throw new Error('Data integrity check failed - written and read data do not match');
      }
      results.steps.push('✓ Data integrity verified');

      // Step 4: Test storage listener
      results.steps.push('Testing storage change listener...');
      let listenerTriggered = false;
      const testListener = (changes, areaName) => {
        if (areaName === 'sync' && changes[testId]) {
          listenerTriggered = true;
        }
      };
      
      chrome.storage.onChanged.addListener(testListener);
      await chrome.storage.sync.set({ [testId]: { ...testData, updated: true } });
      await new Promise(resolve => setTimeout(resolve, 100));
      chrome.storage.onChanged.removeListener(testListener);
      
      if (listenerTriggered) {
        results.steps.push('✓ Storage change listener working correctly');
      } else {
        results.steps.push('⚠ Storage change listener may not be working');
      }

      // Step 5: Clean up
      results.steps.push('Cleaning up test data...');
      await chrome.storage.sync.remove(testId);
      results.steps.push('✓ Test data cleaned up');

      results.success = true;
      results.steps.push('🎉 Sync test completed successfully');

    } catch (error) {
      results.errors.push(error.message);
      results.steps.push(`❌ Test failed: ${error.message}`);
      
      // Try to clean up even if test failed
      try {
        await chrome.storage.sync.remove(testId);
        results.steps.push('✓ Cleanup completed despite test failure');
      } catch (cleanupError) {
        results.errors.push(`Cleanup failed: ${cleanupError.message}`);
      }
    }

    results.endTime = new Date().toISOString();
    return results;
  },

  /**
   * Validates data integrity between written and read objects
   * Follows Single Responsibility Principle - only handles data comparison
   * Uses deep comparison instead of JSON.stringify to avoid property ordering issues
   * 
   * @param {Object} original - The original data that was written
   * @param {Object} retrieved - The data that was read back
   * @returns {boolean} True if data integrity is maintained
   */
  isDataIntegrityValid(original, retrieved) {
    return this.deepEquals(original, retrieved);
  },

  /**
   * Performs deep equality comparison of two objects
   * Follows Single Responsibility Principle - only handles deep comparison
   * Handles nested objects, arrays, and primitive values properly
   * 
   * @param {*} a - First value to compare
   * @param {*} b - Second value to compare
   * @returns {boolean} True if values are deeply equal
   */
  deepEquals(a, b) {
    if (a === b) return true;
    
    if (a == null || b == null) return a === b;
    
    if (typeof a !== typeof b) return false;
    
    if (typeof a !== 'object') return a === b;
    
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.deepEquals(a[key], b[key])) return false;
    }
    
    return true;
  },

  /**
   * Monitor storage changes for debugging
   */
  startMonitoring() {
    const changes = [];
    
    const listener = (storageChanges, areaName) => {
      const changeInfo = {
        timestamp: new Date().toISOString(),
        area: areaName,
        keys: Object.keys(storageChanges),
        changes: {}
      };
      
      // Log details for each changed key
      Object.keys(storageChanges).forEach(key => {
        changeInfo.changes[key] = {
          oldValue: storageChanges[key].oldValue,
          newValue: storageChanges[key].newValue,
          hadOldValue: storageChanges[key].oldValue !== undefined,
          hasNewValue: storageChanges[key].newValue !== undefined
        };
      });
      
      changes.push(changeInfo);
      console.log('🔄 Storage Change Detected:', changeInfo);
    };

    chrome.storage.onChanged.addListener(listener);
    
    return {
      stop: () => {
        chrome.storage.onChanged.removeListener(listener);
        return {
          totalChanges: changes.length,
          changes: changes
        };
      },
      getChanges: () => changes
    };
  },

  /**
   * Force sync all current data (bypass fresh install protection)
   */
  async forceSyncAllData() {
    try {
      // Get all current local data
      const localData = await chrome.storage.local.get(null);
      
      // Filter out local-only settings
      const syncableData = {};
      Object.keys(localData).forEach(key => {
        if (!localOnlySettings.some(setting => 
          setting === key || key.startsWith(setting + '.')
        )) {
          syncableData[key] = localData[key];
        }
      });
      
      // Add timestamp to track when this sync was forced
      syncableData._lastForcedSync = new Date().toISOString();
      
      // Write directly to sync storage (bypass syncStorage wrapper)
      await chrome.storage.sync.set(syncableData);
      
      return {
        success: true,
        syncedKeys: Object.keys(syncableData),
        timestamp: syncableData._lastForcedSync
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Check for common sync problems
   */
  async diagnoseProblems() {
    const problems = [];
    const suggestions = [];
    
    try {
      // Check storage quota
      const bytesUsed = await chrome.storage.sync.getBytesInUse(null);
      if (bytesUsed > 90000) { // Close to 100KB limit
        problems.push(`Sync storage is ${Math.round(bytesUsed/1024)}KB (near 100KB limit)`);
        suggestions.push('Consider removing old data or reducing list sizes');
      }
      
      // Check for duplicate data
      const syncData = await chrome.storage.sync.get(null);
      const localData = await chrome.storage.local.get(null);
      
      let duplicates = 0;
      Object.keys(syncData).forEach(key => {
        if (localData.hasOwnProperty(key) && !localOnlySettings.includes(key)) {
          duplicates++;
        }
      });
      
      if (duplicates > 5) {
        problems.push(`${duplicates} settings found in both local and sync storage`);
        suggestions.push('Run storage cleanup to remove duplicates');
      }
      
      // Check for missing timestamps
      const timestampKeys = [
        'blacklistLastModifiedDate',
        'whitelistLastModifiedDate', 
        'blacklistKeywordsLastModifiedDate',
        'whitelistKeywordsLastModifiedDate'
      ];
      
      const missingTimestamps = timestampKeys.filter(key => !syncData[key]);
      if (missingTimestamps.length > 0) {
        problems.push(`Missing timestamps: ${missingTimestamps.join(', ')}`);
        suggestions.push('Timestamps help resolve sync conflicts between devices');
      }
      
      // Check for very large arrays
      ['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords'].forEach(key => {
        if (syncData[key] && Array.isArray(syncData[key]) && syncData[key].length > 100) {
          problems.push(`Large ${key} (${syncData[key].length} items) may slow sync`);
          suggestions.push(`Consider organizing ${key} into categories or removing unused items`);
        }
      });
      
    } catch (error) {
      problems.push(`Error during diagnosis: ${error.message}`);
    }
    
    return {
      problemCount: problems.length,
      problems: problems,
      suggestions: suggestions,
      overallHealth: problems.length === 0 ? 'good' : problems.length < 3 ? 'fair' : 'poor'
    };
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
