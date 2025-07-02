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
  'enableOnBrowserStartup',
  'syncStatus'  // Track sync status locally
];

/**
 * Sync status tracking (stored locally only)
 */
export const syncStatusTracker = {
  /**
   * Record a successful sync operation
   */
  async recordSyncSuccess(operation = 'general') {
    try {
      // Check if chrome.storage.local is available
      if (!chrome?.storage?.local?.set) {
        debug.error('Chrome storage local API not available for recording sync success');
        return {
          lastSuccessfulSync: new Date().toISOString(),
          lastSyncOperation: operation,
          lastSyncAttempt: new Date().toISOString(),
          consecutiveErrors: 0,
          syncHealth: 'good'
        };
      }

      const syncStatus = await this.getSyncStatus();
      const now = new Date().toISOString();
      
      const updatedStatus = {
        ...syncStatus,
        lastSuccessfulSync: now,
        lastSyncOperation: operation,
        lastSyncAttempt: now,
        consecutiveErrors: 0,  // Reset error count on success
        syncHealth: 'good'
      };
      
      await chrome.storage.local.set({ syncStatus: updatedStatus });
      logInfo(`Sync success recorded: ${operation} at ${now}`);
      return updatedStatus;
    } catch (error) {
      debug.error('Failed to record sync success:', error);
      return {
        lastSuccessfulSync: new Date().toISOString(),
        lastSyncOperation: operation,
        lastSyncAttempt: new Date().toISOString(),
        consecutiveErrors: 0,
        syncHealth: 'good'
      };
    }
  },

  /**
   * Record a sync error
   */
  async recordSyncError(error, operation = 'general') {
    try {
      // Check if chrome.storage.local is available
      if (!chrome?.storage?.local?.set) {
        debug.error('Chrome storage local API not available for recording sync error');
        return {
          lastSyncAttempt: new Date().toISOString(),
          consecutiveErrors: 1,
          syncHealth: 'fair'
        };
      }

      const syncStatus = await this.getSyncStatus();
      const now = new Date().toISOString();
      
      // Handle different error types more robustly
      let errorMessage = 'Unknown error';
      let errorStack = undefined;
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        if (error.message) {
          errorMessage = error.message;
        } else {
          // Convert object to string for better error reporting
          errorMessage = JSON.stringify(error);
        }
        errorStack = error.stack;
      } else {
        errorMessage = String(error);
      }
      
      const errorEntry = {
        timestamp: now,
        operation,
        message: errorMessage,
        stack: errorStack
      };

      const recentErrors = (syncStatus.recentErrors || []).slice(-4); // Keep last 5 errors
      recentErrors.push(errorEntry);

      const consecutiveErrors = (syncStatus.consecutiveErrors || 0) + 1;
      
      const updatedStatus = {
        ...syncStatus,
        lastSyncAttempt: now,
        lastSyncError: errorEntry,
        recentErrors,
        consecutiveErrors,
        syncHealth: consecutiveErrors >= 3 ? 'poor' : consecutiveErrors >= 1 ? 'fair' : 'good'
      };
      
      await chrome.storage.local.set({ syncStatus: updatedStatus });
      debug.error(`Sync error recorded: ${operation}`, error);
      return updatedStatus;
    } catch (storageError) {
      debug.error('Failed to record sync error:', storageError);
      return {
        lastSyncAttempt: new Date().toISOString(),
        consecutiveErrors: 1,
        syncHealth: 'fair'
      };
    }
  },

  /**
   * Get current sync status
   */
  async getSyncStatus() {
    try {
      // Check if chrome.storage.local is available
      if (!chrome?.storage?.local?.get) {
        debug.error('Chrome storage local API not available');
        return {
          lastSuccessfulSync: null,
          lastSyncAttempt: null,
          lastSyncError: null,
          lastSyncOperation: null,
          recentErrors: [],
          consecutiveErrors: 0,
          syncHealth: 'unknown'
        };
      }

      const result = await chrome.storage.local.get('syncStatus');
      const syncStatus = result && result.syncStatus;
      return syncStatus || {
        lastSuccessfulSync: null,
        lastSyncAttempt: null,
        lastSyncError: null,
        lastSyncOperation: null,
        recentErrors: [],
        consecutiveErrors: 0,
        syncHealth: 'unknown'
      };
    } catch (error) {
      debug.error('Failed to get sync status:', error);
      return {
        lastSuccessfulSync: null,
        lastSyncAttempt: null,
        lastSyncError: null,
        lastSyncOperation: null,
        recentErrors: [],
        consecutiveErrors: 0,
        syncHealth: 'unknown'
      };
    }
  },

  /**
   * Clear sync status history
   */
  async clearSyncStatus() {
    try {
      if (chrome?.storage?.local?.remove) {
        await chrome.storage.local.remove('syncStatus');
        logInfo('Sync status history cleared');
      } else {
        debug.error('Chrome storage local API not available for clearing sync status');
      }
    } catch (error) {
      debug.error('Failed to clear sync status:', error);
    }
  }
};

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
      errors: [],
      // New sync status tracking
      syncStatusHistory: await syncStatusTracker.getSyncStatus()
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
      results.steps.push('✅ Successfully wrote to sync storage');

      // Wait a moment for potential replication
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 2: Read from sync storage
      results.steps.push('Reading test data from sync storage...');
      const readData = await chrome.storage.sync.get(testId);
      if (!readData[testId]) {
        throw new Error('Test data not found in sync storage after write');
      }
      results.steps.push('✅ Successfully read from sync storage');

      // Step 3: Verify data integrity
      results.steps.push('Verifying data integrity...');
      const written = JSON.stringify(testData);
      const read = JSON.stringify(readData[testId]);
      if (written !== read) {
        throw new Error('Data integrity check failed - written and read data do not match');
      }
      results.steps.push('✅ Data integrity verified');

      // Step 4: Test storage listener (if available)
      results.steps.push('Testing storage change listener...');
      let listenerTriggered = false;
      
      if (chrome.storage && chrome.storage.onChanged) {
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
          results.steps.push('✅ Storage change listener working correctly');
        } else {
          results.steps.push('⚠️ Storage change listener may not be working');
        }
      } else {
        results.steps.push('⚠️ Storage change listener API not available');
      }

      // Step 5: Clean up
      results.steps.push('Cleaning up test data...');
      await chrome.storage.sync.remove(testId);
      results.steps.push('✅ Test data cleaned up');

      results.success = true;
      results.steps.push('🎉 Sync test completed successfully');

    } catch (error) {
      results.errors.push(error.message);
      results.steps.push(`❌ Test failed: ${error.message}`);
      
      // Try to clean up even if test failed
      try {
        await chrome.storage.sync.remove(testId);
        results.steps.push('✅ Cleanup completed despite test failure');
      } catch (cleanupError) {
        results.errors.push(`Cleanup failed: ${cleanupError.message}`);
        results.steps.push('❌ Cleanup failed');
      }
    }

    results.endTime = new Date().toISOString();
    return results;
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
      // Check sync status history first
      const syncStatus = await syncStatusTracker.getSyncStatus();
      
      // Check for sync health issues
      if (syncStatus.consecutiveErrors >= 3) {
        problems.push(`${syncStatus.consecutiveErrors} consecutive sync errors detected`);
        suggestions.push('Check network connectivity and browser sync settings');
      }
      
      if (syncStatus.syncHealth === 'poor') {
        problems.push('Sync health is poor due to repeated failures');
        suggestions.push('Consider clearing sync storage and forcing a fresh sync');
      }
      
      if (syncStatus.recentErrors && syncStatus.recentErrors.length >= 3) {
        problems.push(`${syncStatus.recentErrors.length} recent sync errors`);
        suggestions.push('Review recent error messages for patterns');
      }
      
      // Check storage quota (only if chrome.storage.sync is available)
      if (chrome?.storage?.sync?.getBytesInUse) {
        try {
          const bytesUsed = await chrome.storage.sync.getBytesInUse(null);
          if (bytesUsed > 90000) { // Close to 100KB limit
            problems.push(`Sync storage is ${Math.round(bytesUsed/1024)}KB (near 100KB limit)`);
            suggestions.push('Consider removing old data or reducing list sizes');
          }
        } catch (quotaError) {
          debug.error('Failed to check storage quota:', quotaError);
        }
      }
      
      // Check for duplicate data (only if chrome.storage is available)
      if (chrome?.storage?.sync?.get && chrome?.storage?.local?.get) {
        try {
          const syncData = await chrome.storage.sync.get(null);
          const localData = await chrome.storage.local.get(null);
          
          if (syncData && localData) {
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
          }
        } catch (storageError) {
          debug.error('Failed to check storage data:', storageError);
        }
      }
      
    } catch (error) {
      problems.push(`Error during diagnosis: ${error.message}`);
    }
    
    // Determine overall health based on sync status and problems
    let overallHealth = 'good';
    const syncStatus = await syncStatusTracker.getSyncStatus();
    
    if (syncStatus.syncHealth === 'poor' || problems.length >= 3) {
      overallHealth = 'poor';
    } else if (syncStatus.syncHealth === 'fair' || problems.length > 0) {
      overallHealth = 'fair';
    }
    
    return {
      problemCount: problems.length,
      problems: problems,
      suggestions: suggestions,
      overallHealth: overallHealth,
      syncHealth: syncStatus.syncHealth
    };
  },

  /**
   * Clean up duplicate settings found in both local and sync storage
   * Follows Single Responsibility Principle - only handles cleanup coordination
   * 
   * @returns {Object} Results of the cleanup operation
   */
  async cleanupDuplicateSettings() {
    try {
      logInfo('Starting duplicate settings cleanup...');
      const results = await syncStorage.cleanupDuplicateSettings();
      
      if (results.success) {
        logInfo('Duplicate settings cleanup completed successfully');
      } else {
        debug.error('Duplicate settings cleanup encountered errors:', results.errors);
      }
      
      return results;
    } catch (error) {
      const errorMsg = `Failed to cleanup duplicate settings: ${error.message}`;
      debug.error(errorMsg, error);
      return {
        cleanedUp: [],
        errors: [errorMsg],
        success: false
      };
    }
  },

  /**
   * Optimize large arrays by providing recommendations
   * Follows Single Responsibility Principle - only handles optimization analysis
   * 
   * @returns {Object} Analysis and recommendations for large arrays
   */
  async optimizeLargeArrays() {
    const results = {
      analyzed: [],
      recommendations: [],
      potentialSavings: 0
    };

    try {
      const syncData = await chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords']);
      
      const arraySettings = [
        { key: 'blacklist', data: syncData.blacklist, type: 'websites' },
        { key: 'whitelist', data: syncData.whitelist, type: 'websites' },
        { key: 'blacklistKeywords', data: syncData.blacklistKeywords, type: 'keywords' },
        { key: 'whitelistKeywords', data: syncData.whitelistKeywords, type: 'keywords' }
      ];

      for (const setting of arraySettings) {
        if (Array.isArray(setting.data) && setting.data.length > 0) {
          const size = JSON.stringify(setting.data).length;
          const analysis = {
            key: setting.key,
            count: setting.data.length,
            sizeBytes: size,
            type: setting.type
          };

          // Identify potential optimizations
          if (setting.data.length > 100) {
            analysis.recommendation = 'Consider reviewing and removing unused entries';
            analysis.priority = 'high';
            results.potentialSavings += Math.floor(size * 0.3); // Estimate 30% reduction
          } else if (setting.data.length > 50) {
            analysis.recommendation = 'Monitor growth and organize entries';
            analysis.priority = 'medium';
            results.potentialSavings += Math.floor(size * 0.1); // Estimate 10% reduction
          } else {
            analysis.recommendation = 'Size is optimal';
            analysis.priority = 'low';
          }

          // Check for duplicates
          const duplicates = setting.data.filter((item, index) => 
            setting.data.indexOf(item) !== index
          );
          if (duplicates.length > 0) {
            analysis.duplicates = duplicates.length;
            analysis.recommendation += '. Remove duplicate entries.';
            results.potentialSavings += duplicates.length * 20; // Estimate bytes per duplicate
          }

          results.analyzed.push(analysis);
        }
      }

      // Generate overall recommendations
      if (results.potentialSavings > 1000) {
        results.recommendations.push('Significant storage optimization possible');
      }
      if (results.analyzed.some(a => a.duplicates > 0)) {
        results.recommendations.push('Remove duplicate entries to improve performance');
      }
      if (results.analyzed.some(a => a.count > 200)) {
        results.recommendations.push('Consider splitting large lists into categories');
      }

    } catch (error) {
      debug.error('Failed to analyze large arrays:', error);
      results.error = error.message;
    }

    return results;
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
