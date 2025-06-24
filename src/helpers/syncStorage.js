/**
 * Enhanced storage helper that supports syncing settings across devices
 * with intelligent fallbacks to local storage when needed.
 */

import { debug, isDevEnv, logInfo } from './debug';

// Settings that should be stored in local storage only (everything else syncs)
const localOnlySettings = [
  // Extension state (typically device-specific)
  'isEnabled',
  'enableOnBrowserStartup',
  
  // Security settings
  'password',
  
  // Session-specific features
  'timer',
  'logs',
  'logsLength',
  'enableLogs',
  'enableTimer'
];

// Helper to determine if a setting should use local storage
const shouldUseLocalStorage = (key) => {
  return localOnlySettings.includes(key) || 
         // Also check if the key is a property of a local-only object
         localOnlySettings.some(localKey => key.startsWith(`${localKey}.`));
};

// Helper to check if this is likely a fresh install
const checkIfFreshInstall = async () => {
  try {    // Get the current blacklist and whitelist from local storage
    const data = await chrome.storage.local.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords']);
    
    // If all lists are empty or don't exist, this might be a fresh install
    const hasNoRules = 
      (!data?.blacklist || data.blacklist.length === 0) &&
      (!data?.whitelist || data.whitelist.length === 0) &&
      (!data?.blacklistKeywords || data.blacklistKeywords.length === 0) &&
      (!data?.whitelistKeywords || data.whitelistKeywords.length === 0);
      // Also check if this was recently installed (within last 5 minutes)
    const installTime = await chrome.storage.local.get(['installTime']);
    const isRecentInstall = installTime?.installTime && (Date.now() - installTime.installTime) < 5 * 60 * 1000;
    
    return hasNoRules && isRecentInstall;
  } catch (error) {
    debug.error('Error checking fresh install state:', error);
    return false; // Assume not fresh install on error
  }
};

export const syncStorage = {
  /**
   * Get settings from storage, selecting sync or local as appropriate
   */
  async get(items) {
    const localItems = {};
    const syncItems = {};
    
    // Split the items into local and sync
    Object.keys(items).forEach(key => {
      if (shouldUseLocalStorage(key)) {
        localItems[key] = items[key];
      } else {
        syncItems[key] = items[key];
      }
    });
    
    const results = {};
    
    // Get sync items if any
    if (Object.keys(syncItems).length > 0) {
      try {
        logInfo('Getting from sync storage:', Object.keys(syncItems));
        const syncResults = await chrome.storage.sync.get(syncItems);
        Object.assign(results, syncResults);
      } catch (error) {
        debug.error('Failed to get from sync storage, falling back to local:', error);
        try {
          const localFallback = await chrome.storage.local.get(syncItems);
          Object.assign(results, localFallback);
        } catch (fallbackError) {
          debug.error('Failed to get from local storage fallback:', fallbackError);
        }
      }
    }
    
    // Get local items if any
    if (Object.keys(localItems).length > 0) {
      try {
        logInfo('Getting from local storage:', Object.keys(localItems));
        const localResults = await chrome.storage.local.get(localItems);
        Object.assign(results, localResults);
      } catch (error) {
        debug.error('Failed to get from local storage:', error);
      }
    }
    
    return results;
  },
    /**
   * Save settings to storage, selecting sync or local as appropriate
   */
  async set(items) {
    const localItems = {};
    const syncItems = {};
    
    // Split the items into local and sync
    Object.keys(items).forEach(key => {
      if (shouldUseLocalStorage(key)) {
        localItems[key] = items[key];
      } else {
        syncItems[key] = items[key];
      }
    });

    // Check if this might be a fresh install to avoid overwriting cloud data
    const isLikelyFreshInstall = await checkIfFreshInstall();
    
    let syncSuccess = true;
    let localSuccess = true;

    // Save sync items if any
    if (Object.keys(syncItems).length > 0) {
      try {
        // For fresh installs, avoid writing empty lists to sync storage
        if (isLikelyFreshInstall) {
          const hasEmptyLists = (
            (syncItems.blacklist && Array.isArray(syncItems.blacklist) && syncItems.blacklist.length === 0) ||
            (syncItems.whitelist && Array.isArray(syncItems.whitelist) && syncItems.whitelist.length === 0)
          );
          
          if (hasEmptyLists) {
            logInfo('Fresh install detected - skipping sync storage write for empty lists to avoid overwriting cloud data');
            // Save to local storage instead
            await chrome.storage.local.set(syncItems);
            logInfo('Saved to local storage instead during fresh install');
            return true;
          }
        }
        
        logInfo('Setting to sync storage:', Object.keys(syncItems));
        await chrome.storage.sync.set(syncItems);
        logInfo('Successfully saved to sync storage');
      } catch (error) {
        syncSuccess = false;
        debug.error('Failed to save to sync storage, falling back to local:', error);
        try {
          await chrome.storage.local.set(syncItems);
          logInfo('Successfully saved to local storage (fallback)');
        } catch (fallbackError) {
          debug.error('Failed to save to local storage fallback:', fallbackError);
        }
      }
    }
    
    // Save local items if any
    if (Object.keys(localItems).length > 0) {
      try {
        logInfo('Setting to local storage:', Object.keys(localItems));
        await chrome.storage.local.set(localItems);
        logInfo('Successfully saved to local storage');
      } catch (error) {
        localSuccess = false;
        debug.error('Failed to save to local storage:', error);
      }
    }
    
    return syncSuccess && localSuccess;
  },
  
  async remove(keys) {
    if (typeof keys === 'string') {
      keys = [keys];
    }
    
    const localKeys = [];
    const syncKeys = [];
    
    // Split the keys into local and sync
    keys.forEach(key => {
      if (shouldUseLocalStorage(key)) {
        localKeys.push(key);
      } else {
        syncKeys.push(key);
      }
    });
    
    let success = true;
    
    // Remove from sync storage
    if (syncKeys.length > 0) {
      try {
        logInfo('Removing from sync storage:', syncKeys);
        await chrome.storage.sync.remove(syncKeys);
      } catch (error) {
        success = false;
        debug.error('Failed to remove from sync storage:', error);
      }
    }
    
    // Remove from local storage
    if (localKeys.length > 0) {
      try {
        logInfo('Removing from local storage:', localKeys);
        await chrome.storage.local.remove(localKeys);
      } catch (error) {
        success = false;
        debug.error('Failed to remove from local storage:', error);
      }
    }
    
    return success;
  },

  /**
   * Clean up duplicate settings by removing them from inappropriate storage
   * Follows Single Responsibility Principle - only handles duplicate cleanup
   * Ensures each setting exists only in its designated storage location
   * 
   * @returns {Object} Results of the cleanup operation
   */
  async cleanupDuplicateSettings() {
    const results = {
      cleanedUp: [],
      errors: [],
      success: true
    };

    try {
      // Get all settings from both storages
      const [localData, syncData] = await Promise.all([
        chrome.storage.local.get(null),
        chrome.storage.sync.get(null)
      ]);

      // Find duplicates - settings that exist in both storages
      const duplicates = Object.keys(localData).filter(key => 
        syncData.hasOwnProperty(key)
      );

      for (const key of duplicates) {
        try {
          if (shouldUseLocalStorage(key)) {
            // This should be local-only, remove from sync
            await chrome.storage.sync.remove(key);
            results.cleanedUp.push(`Removed '${key}' from sync storage (should be local-only)`);
            logInfo(`Cleaned up: removed '${key}' from sync storage`);
          } else {
            // This should be synced, remove from local
            await chrome.storage.local.remove(key);
            results.cleanedUp.push(`Removed '${key}' from local storage (should be synced)`);
            logInfo(`Cleaned up: removed '${key}' from local storage`);
          }
        } catch (error) {
          const errorMsg = `Failed to clean up duplicate '${key}': ${error.message}`;
          results.errors.push(errorMsg);
          debug.error(errorMsg, error);
          results.success = false;
        }
      }

      if (results.cleanedUp.length === 0) {
        results.cleanedUp.push('No duplicate settings found - storage is clean');
      }

    } catch (error) {
      const errorMsg = `Failed to clean up duplicates: ${error.message}`;
      results.errors.push(errorMsg);
      debug.error(errorMsg, error);
      results.success = false;
    }

    return results;
  },

  /**
   * Migrate settings from one storage to another when storage strategy changes
   * Follows Single Responsibility Principle - only handles storage migration
   * 
   * @param {Array} settingsToMigrate - Array of setting keys to migrate
   * @param {string} direction - 'toSync' or 'toLocal'
   * @returns {Object} Results of the migration
   */
  async migrateSettings(settingsToMigrate, direction) {
    const results = {
      migrated: [],
      errors: [],
      success: true
    };

    const isToSync = direction === 'toSync';
    const sourceStorage = isToSync ? chrome.storage.local : chrome.storage.sync;
    const targetStorage = isToSync ? chrome.storage.sync : chrome.storage.local;

    try {
      // Get settings from source storage
      const sourceData = await sourceStorage.get(settingsToMigrate);
      const settingsFound = Object.keys(sourceData);

      if (settingsFound.length === 0) {
        results.migrated.push('No settings found to migrate');
        return results;
      }

      // Save to target storage
      await targetStorage.set(sourceData);
      
      // Remove from source storage
      await sourceStorage.remove(settingsFound);

      results.migrated = settingsFound.map(key => 
        `Migrated '${key}' ${isToSync ? 'to sync' : 'to local'} storage`
      );

      logInfo(`Successfully migrated ${settingsFound.length} settings ${direction}`);

    } catch (error) {
      const errorMsg = `Failed to migrate settings ${direction}: ${error.message}`;
      results.errors.push(errorMsg);
      debug.error(errorMsg, error);
      results.success = false;
    }

    return results;
  }
};

// For backward compatibility
export const storage = syncStorage;
export default syncStorage;
