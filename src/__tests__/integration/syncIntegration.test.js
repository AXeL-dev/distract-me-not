/**
 * Sync Integration Test Suite
 * Tests the sync functionality end-to-end
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock chrome.storage API (both sync and local)
const mockChromeStorage = {
  sync: {
    data: {},
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
    getBytesInUse: jest.fn(),
    MAX_ITEMS: 512,
    QUOTA_BYTES: 102400,
    QUOTA_BYTES_PER_ITEM: 8192
  },
  local: {
    data: {},
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
    getBytesInUse: jest.fn()
  },
  onChanged: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  }
};

// Setup chrome mock
global.chrome = {
  storage: mockChromeStorage,
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  }
};

// Import modules after setting up mocks
import syncStorage from '../../helpers/syncStorage.js';
import { syncStatusLog, diagnostics, syncableSettings, localOnlySettings, syncStatusTracker } from '../../helpers/syncDiagnostics.js';

describe('Sync Integration Tests', () => {
    // Function to setup mock implementations
  const setupMockImplementations = () => {
    // Reinitialize all mock functions to ensure they exist
    mockChromeStorage.sync.get = jest.fn();
    mockChromeStorage.sync.set = jest.fn();
    mockChromeStorage.sync.remove = jest.fn();
    mockChromeStorage.sync.clear = jest.fn();
    mockChromeStorage.sync.getBytesInUse = jest.fn();
    
    mockChromeStorage.local.get = jest.fn();
    mockChromeStorage.local.set = jest.fn();
    mockChromeStorage.local.remove = jest.fn();
    mockChromeStorage.local.clear = jest.fn();
    mockChromeStorage.local.getBytesInUse = jest.fn();
    
    // Setup sync storage mock implementations
    mockChromeStorage.sync.get.mockImplementation((keys) => {
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockChromeStorage.sync.data[keys] });
      } else if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          if (mockChromeStorage.sync.data[key] !== undefined) {
            result[key] = mockChromeStorage.sync.data[key];
          }
        });
        return Promise.resolve(result);
      } else if (keys && typeof keys === 'object') {
        // Handle object with default values (Chrome Storage API behavior)
        const result = {};
        Object.keys(keys).forEach(key => {
          // Return stored value if exists, otherwise return default value
          result[key] = mockChromeStorage.sync.data[key] !== undefined 
            ? mockChromeStorage.sync.data[key] 
            : keys[key];
        });
        return Promise.resolve(result);
      } else {
        return Promise.resolve({ ...mockChromeStorage.sync.data });
      }
    });
    
    mockChromeStorage.sync.set.mockImplementation((data) => {
      Object.assign(mockChromeStorage.sync.data, data);
      return Promise.resolve();
    });
    
    mockChromeStorage.sync.remove.mockImplementation((keys) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => {
        delete mockChromeStorage.sync.data[key];
      });
      return Promise.resolve();
    });
    
    mockChromeStorage.sync.clear.mockImplementation(() => {
      mockChromeStorage.sync.data = {};
      return Promise.resolve();
    });
    
    mockChromeStorage.sync.getBytesInUse.mockImplementation((keys) => {
      let totalSize = 0;
      if (keys) {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => {
          if (mockChromeStorage.sync.data[key] !== undefined) {
            totalSize += JSON.stringify({
              [key]: mockChromeStorage.sync.data[key]
            }).length;
          }
        });
      } else {
        totalSize = JSON.stringify(mockChromeStorage.sync.data).length;
      }
      return Promise.resolve(totalSize);
    });

    // Setup local storage mock implementations
    mockChromeStorage.local.get.mockImplementation((keys) => {
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockChromeStorage.local.data[keys] });
      } else if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          if (mockChromeStorage.local.data[key] !== undefined) {
            result[key] = mockChromeStorage.local.data[key];
          }
        });
        return Promise.resolve(result);
      } else if (keys && typeof keys === 'object') {
        // Handle object with default values (Chrome Storage API behavior)
        const result = {};
        Object.keys(keys).forEach(key => {
          // Return stored value if exists, otherwise return default value
          result[key] = mockChromeStorage.local.data[key] !== undefined 
            ? mockChromeStorage.local.data[key] 
            : keys[key];
        });
        return Promise.resolve(result);
      } else {
        return Promise.resolve({ ...mockChromeStorage.local.data });
      }
    });
    
    mockChromeStorage.local.set.mockImplementation((data) => {
      Object.assign(mockChromeStorage.local.data, data);
      return Promise.resolve();
    });
    
    mockChromeStorage.local.remove.mockImplementation((keys) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => {
        delete mockChromeStorage.local.data[key];
      });
      return Promise.resolve();
    });
    
    mockChromeStorage.local.clear.mockImplementation(() => {
      mockChromeStorage.local.data = {};
      return Promise.resolve();
    });
    
    mockChromeStorage.local.getBytesInUse.mockImplementation((keys) => {
      let totalSize = 0;
      if (keys) {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => {
          if (mockChromeStorage.local.data[key] !== undefined) {
            totalSize += JSON.stringify({
              [key]: mockChromeStorage.local.data[key]
            }).length;
          }
        });
      } else {
        totalSize = JSON.stringify(mockChromeStorage.local.data).length;
      }
      return Promise.resolve(totalSize);
    });
  };beforeEach(() => {
    // Reset mock data before each test
    mockChromeStorage.sync.data = {};
    mockChromeStorage.local.data = {};
    
    // Setup mock implementations
    setupMockImplementations();
  });
  afterEach(() => {
    // Reset data storage only
    mockChromeStorage.sync.data = {};
    mockChromeStorage.local.data = {};
  });
  describe('Sync Storage', () => {
    test('should save and load settings correctly', async () => {
      const testSettings = {
        mode: 'blacklist',
        blacklist: ['test-site.com', 'another-site.com'],
        action: 'redirect',
        message: 'Access denied'
      };

      await syncStorage.set(testSettings);
      const loadedSettings = await syncStorage.get(testSettings);

      expect(loadedSettings).toEqual(expect.objectContaining(testSettings));
    });

    test('should handle empty sync storage', async () => {
      const settings = await syncStorage.get({
        mode: '',
        blacklist: [],
        action: '',
        message: ''
      });
      // Since the storage is empty, we should get the default values we provided
      expect(settings.mode).toBe('');
      expect(settings.blacklist).toEqual([]);
      expect(settings.action).toBe('');
      expect(settings.message).toBe('');
    });

    test('should merge settings correctly', async () => {
      // Save initial settings
      await syncStorage.set({
        mode: 'blacklist',
        blacklist: ['site1.com']
      });

      // Save additional settings
      await syncStorage.set({
        action: 'redirect',
        whitelist: ['allowed.com']
      });

      const settings = await syncStorage.get({
        mode: '',
        blacklist: [],
        action: '',
        whitelist: []
      });
      expect(settings).toEqual({
        mode: 'blacklist',
        blacklist: ['site1.com'],        action: 'redirect',
        whitelist: ['allowed.com']
      });
    });

    test('should remove items correctly', async () => {
      // Set up test data
      await syncStorage.set({
        mode: 'blacklist',
        blacklist: ['site1.com'],
        action: 'redirect'
      });

      // Remove one item
      await syncStorage.remove('mode');

      const settings = await syncStorage.get({
        mode: '',
        blacklist: [],
        action: ''
      });

      expect(settings.mode).toBe(''); // Default value since mode was removed
      expect(settings.blacklist).toEqual(['site1.com']);
      expect(settings.action).toBe('redirect');
    });
  });

  describe('Sync Diagnostics', () => {
    test('should check sync status correctly', async () => {
      const status = await diagnostics.checkSyncStatus();
      
      expect(status).toHaveProperty('syncAvailable');
      expect(status).toHaveProperty('browser');
      expect(status.syncAvailable).toBe(true);
    });    test('should test sync functionality', async () => {
      const testResult = await diagnostics.testSync();

      expect(testResult).toHaveProperty('success');
      expect(testResult).toHaveProperty('startTime');
      expect(testResult).toHaveProperty('endTime');
      expect(testResult.success).toBe(true);
      
      // Calculate duration from start and end times
      const startTime = new Date(testResult.startTime);
      const endTime = new Date(testResult.endTime);
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThan(0);
    });    test('should diagnose problems correctly', async () => {
      // Add some test data to simulate problems
      const largeData = 'x'.repeat(10000); // Oversized item
      mockChromeStorage.sync.data.largeItem = largeData;
      
      const diagnosis = await diagnostics.diagnoseProblems();
      
      expect(diagnosis).toHaveProperty('problems');
      expect(diagnosis).toHaveProperty('suggestions');
      expect(diagnosis.problems.length).toBeGreaterThan(0);
    });

    test('should force sync all data', async () => {
      // Mock local storage with test data
      const localData = {
        mode: 'blacklist',
        blacklist: ['local-site.com'],
        action: 'block'
      };

      // Mock chrome.storage.local.get
      global.chrome.storage.local = {
        get: jest.fn().mockResolvedValue(localData)
      };      await diagnostics.forceSyncAllData();
      
      // Verify data was synced
      const syncedData = await syncStorage.get({
        mode: '',
        blacklist: [],
        action: ''
      });
      expect(syncedData).toEqual(expect.objectContaining(localData));
    });    test('should clear sync storage', async () => {
      // Add some data first
      await syncStorage.set({
        mode: 'blacklist',
        blacklist: ['test.com']
      });

      const result = await diagnostics.clearSyncStorage();
      
      expect(result.success).toBe(true);
      expect(mockChromeStorage.sync.data).toEqual({});
    });
  });

  describe('Edge Cases', () => {
    test('should handle sync storage quota limits', async () => {
      // Mock quota exceeded error
      mockChromeStorage.sync.set.mockRejectedValueOnce(
        new Error('QUOTA_BYTES quota exceeded')
      );      const largeSettings = {
        blacklist: new Array(1000).fill('very-long-domain-name.com')
      };
      const result = await syncStorage.set(largeSettings);
      expect(result).toBe(false); // Should return false on quota exceeded
    });    test('should handle network errors gracefully', async () => {
      // Mock network error
      mockChromeStorage.sync.get.mockRejectedValueOnce(
        new Error('Network error')
      );
      const result = await syncStorage.get(['blacklist']);
      
      // Should return empty object on error, but might contain syncStatus from error tracking
      expect(result.blacklist).toBeUndefined(); // The requested key should be undefined
      // Note: result might contain syncStatus due to error tracking, which is expected behavior
    });    test('should detect oversized items in diagnosis', async () => {
      // Add large blacklist to trigger large array warning
      mockChromeStorage.sync.get.mockResolvedValue({
        blacklist: new Array(150).fill('example.com') // More than 100 items
      });

      const diagnosis = await diagnostics.diagnoseProblems();
        expect(diagnosis.problems).toContainEqual(
        expect.stringMatching(/Large blacklist.*may slow sync/i)
      );
    });    test('should detect missing sync timestamp', async () => {
      // Mock data without sync timestamp
      mockChromeStorage.sync.get.mockResolvedValue({
        blacklist: ['example.com']
        // No lastSyncTime
      });

      const diagnosis = await diagnostics.diagnoseProblems();
        expect(diagnosis.problems).toContainEqual(
        expect.stringMatching(/Missing.*timestamp/i)
      );
    });
  });

  describe('Data Integrity', () => {
    test('should preserve data types during sync', async () => {
      const complexSettings = {
        mode: 'blacklist',
        enabled: true,
        timeout: 5000,
        blacklist: ['site1.com', 'site2.com'],
        config: {
          advanced: true,
          level: 3,
          features: ['blocking', 'redirecting']
        }
      };      await syncStorage.set(complexSettings);
      const loadedSettings = await syncStorage.get({
        mode: '',
        enabled: false,
        timeout: 0,
        blacklist: [],
        config: {}
      });

      expect(loadedSettings).toEqual(complexSettings);
      expect(typeof loadedSettings.enabled).toBe('boolean');
      expect(typeof loadedSettings.timeout).toBe('number');
      expect(Array.isArray(loadedSettings.blacklist)).toBe(true);
      expect(typeof loadedSettings.config).toBe('object');
    });

    test('should handle unicode and special characters', async () => {
      const unicodeSettings = {
        message: '🚫 Access denied! 禁止访问',
        blacklist: ['тест.рф', 'résumé.com', '测试.中国']
      };      await syncStorage.set(unicodeSettings);
      const loadedSettings = await syncStorage.get({
        message: '',
        blacklist: []
      });

      expect(loadedSettings).toEqual(unicodeSettings);
    });
  });

  describe('Sync Status Tracking', () => {
    test('should record successful sync operations', async () => {
      await syncStatusTracker.recordSyncSuccess('test-operation');
      
      const status = await syncStatusTracker.getSyncStatus();
      
      expect(status.lastSuccessfulSync).toBeTruthy();
      expect(status.lastSyncOperation).toBe('test-operation');
      expect(status.consecutiveErrors).toBe(0);
      expect(status.syncHealth).toBe('good');
    });

    test('should record sync errors', async () => {
      const testError = new Error('Test sync error');
      await syncStatusTracker.recordSyncError(testError, 'test-operation');
      
      const status = await syncStatusTracker.getSyncStatus();
      
      expect(status.lastSyncError).toBeTruthy();
      expect(status.lastSyncError.message).toBe('Test sync error');
      expect(status.lastSyncError.operation).toBe('test-operation');
      expect(status.consecutiveErrors).toBe(1);
      expect(status.recentErrors).toHaveLength(1);
    });

    test('should track consecutive errors and sync health', async () => {
      // Record multiple errors
      for (let i = 0; i < 3; i++) {
        await syncStatusTracker.recordSyncError(new Error(`Error ${i + 1}`), 'test');
      }
      
      const status = await syncStatusTracker.getSyncStatus();
      
      expect(status.consecutiveErrors).toBe(3);
      expect(status.syncHealth).toBe('poor');
      expect(status.recentErrors).toHaveLength(3);
    });

    test('should reset error count on successful sync', async () => {
      // Record errors first
      await syncStatusTracker.recordSyncError(new Error('Error 1'), 'test');
      await syncStatusTracker.recordSyncError(new Error('Error 2'), 'test');
      
      // Then record success
      await syncStatusTracker.recordSyncSuccess('recovery-test');
      
      const status = await syncStatusTracker.getSyncStatus();
      
      expect(status.consecutiveErrors).toBe(0);
      expect(status.syncHealth).toBe('good');
      expect(status.lastSuccessfulSync).toBeTruthy();
    });

    test('should limit recent errors to last 5', async () => {
      // Record 7 errors
      for (let i = 0; i < 7; i++) {
        await syncStatusTracker.recordSyncError(new Error(`Error ${i + 1}`), 'test');
      }
      
      const status = await syncStatusTracker.getSyncStatus();
      
      expect(status.recentErrors).toHaveLength(5); // Should keep only last 5
      expect(status.recentErrors[4].message).toBe('Error 7'); // Most recent should be last
    });

    test('should clear sync status', async () => {
      // Add some status first
      await syncStatusTracker.recordSyncSuccess('test');
      await syncStatusTracker.recordSyncError(new Error('test'), 'test');
      
      // Clear status
      await syncStatusTracker.clearSyncStatus();
      
      const status = await syncStatusTracker.getSyncStatus();
      
      expect(status.lastSuccessfulSync).toBeNull();
      expect(status.lastSyncError).toBeNull();
      expect(status.recentErrors).toHaveLength(0);
      expect(status.consecutiveErrors).toBe(0);
      expect(status.syncHealth).toBe('unknown');
    });
  });

  describe('Enhanced Sync Diagnostics', () => {
    test('should include sync status in diagnostics', async () => {
      // Record some sync activity
      await syncStatusTracker.recordSyncSuccess('test');
      
      const results = await diagnostics.checkSyncStatus();
      
      expect(results.syncStatusHistory).toBeTruthy();
      expect(results.syncStatusHistory.lastSuccessfulSync).toBeTruthy();
      expect(results.syncStatusHistory.syncHealth).toBe('good');
    });

    test('should detect sync problems with consecutive errors', async () => {
      // Create a scenario with consecutive errors
      for (let i = 0; i < 4; i++) {
        await syncStatusTracker.recordSyncError(new Error(`Error ${i + 1}`), 'test');
      }
      
      const diagnosis = await diagnostics.diagnoseProblems();
      
      expect(diagnosis.problems.length).toBeGreaterThan(0);
      expect(diagnosis.syncHealth).toBe('poor');
    });
  });
});
