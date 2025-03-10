
/**
 * Enhanced storage helper that supports syncing settings across devices
 * with intelligent fallbacks to local storage when needed.
 */

import { debug } from './debug';

// Define which settings should never be synced (device-specific)
const LOCAL_ONLY_KEYS = [
  'isEnabled',              // Status is device-specific
  'logs',                   // Logs should be device-specific
  'logsLength',
  'enableLogs',
  'timer.runtime',          // Timer runtime state is session-specific
];

// Check if a key should be stored locally only
const isLocalOnlyKey = (key) => {
  return LOCAL_ONLY_KEYS.some(localKey => {
    // Handle both direct matches and dot notation
    return key === localKey || key.startsWith(`${localKey}.`);
  });
};

// Calculate size of serialized item in bytes
const getItemSize = (item) => {
  return new TextEncoder().encode(JSON.stringify(item)).length;
};

// Chrome sync storage item size limit (8KB)
const SYNC_ITEM_SIZE_LIMIT = 8000;

// Chrome sync storage total limit (100KB)
const SYNC_TOTAL_SIZE_LIMIT = 100000;

/**
 * Enhanced storage with sync capabilities
 */
export const syncStorage = {
  /**
   * Get items from storage (tries sync first with local fallback)
   * @param {Object} keys - Default values to get
   * @returns {Promise<Object>} Retrieved items
   */
  get: async function(keys = {}) {
    try {
      const localOnlyKeys = {};
      const syncableKeys = {};
      
      // Separate keys into local-only and syncable
      Object.entries(keys).forEach(([key, value]) => {
        if (isLocalOnlyKey(key)) {
          localOnlyKeys[key] = value;
        } else {
          syncableKeys[key] = value;
        }
      });
      
      // Get data from both storage types
      const [syncData, localData] = await Promise.all([
        Object.keys(syncableKeys).length > 0 ? 
          chrome.storage.sync.get(syncableKeys).catch(() => ({})) : {},
        chrome.storage.local.get({...localOnlyKeys, ...syncableKeys})
      ]);
      
      // Combine with local having priority for local-only keys
      // and sync having priority for syncable keys
      return {
        ...syncData,       // Sync data (for syncable keys)
        ...localData,      // Local fallbacks for any missing sync data
        ...Object.entries(localData)
          .filter(([key]) => isLocalOnlyKey(key))
          .reduce((obj, [key, val]) => ({...obj, [key]: val}), {}) // Local-only keys
      };
    } catch (error) {
      debug.error('Error retrieving from storage:', error);
      // Fallback to purely local storage in case of any error
      return chrome.storage.local.get(keys);
    }
  },

  /**
   * Set items in storage (using sync where appropriate)
   * @param {Object} items - Items to save
   * @returns {Promise<boolean>} Success status
   */
  set: async function(items = {}) {
    try {
      const syncItems = {};
      const localItems = {};
      
      // Sort items into sync vs. local storage
      for (const [key, value] of Object.entries(items)) {
        // Always store local-only keys in local storage
        if (isLocalOnlyKey(key)) {
          localItems[key] = value;
        } else {
          // Check if item is too large for sync storage
          const itemSize = getItemSize({[key]: value});
          
          if (itemSize > SYNC_ITEM_SIZE_LIMIT) {
            debug.warn(`Item '${key}' is too large for sync storage (${itemSize} bytes), storing locally`);
            localItems[key] = value;
          } else {
            // Store in sync storage
            syncItems[key] = value;
          }
        }
      }
      
      // Save to appropriate storage
      const promises = [];
      
      if (Object.keys(syncItems).length > 0) {
        promises.push(
          chrome.storage.sync.set(syncItems).catch(error => {
            debug.error('Error saving to sync storage, falling back to local:', error);
            return chrome.storage.local.set(syncItems);
          })
        );
      }
      
      if (Object.keys(localItems).length > 0) {
        promises.push(chrome.storage.local.set(localItems));
      }
      
      // Wait for all storage operations to complete
      await Promise.all(promises);
      return true;
    } catch (error) {
      debug.error('Error saving to storage:', error);
      // Try saving everything to local as a last resort
      try {
        await chrome.storage.local.set(items);
        return true;
      } catch (e) {
        debug.error('Final fallback failed:', e);
        return false;
      }
    }
  },
  
  /**
   * Remove items from both sync and local storage
   */
  remove: async function(keys) {
    try {
      await Promise.all([
        chrome.storage.sync.remove(keys),
        chrome.storage.local.remove(keys)
      ]);
      return true;
    } catch (error) {
      debug.error('Error removing from storage:', error);
      return false;
    }
  },
  
  /**
   * Check total sync storage usage
   */
  getSyncUsage: async function() {
    try {
      const syncData = await chrome.storage.sync.get(null);
      let totalSize = 0;
      let itemSizes = {};
      
      for (const [key, value] of Object.entries(syncData)) {
        const size = getItemSize({[key]: value});
        itemSizes[key] = size;
        totalSize += size;
      }
      
      return {
        totalSize,
        itemSizes,
        percentUsed: (totalSize / SYNC_TOTAL_SIZE_LIMIT) * 100
      };
    } catch (error) {
      debug.error('Error checking sync storage usage:', error);
      return { totalSize: 0, itemSizes: {}, percentUsed: 0 };
    }
  }
};

// For backward compatibility
export const storage = syncStorage;
export default syncStorage;
