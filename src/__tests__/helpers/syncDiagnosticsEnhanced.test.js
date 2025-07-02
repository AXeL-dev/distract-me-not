/**
 * Enhanced Sync Diagnostics Test Suite
 * Tests the enhanced sync diagnostics functionality with status tracking
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock chrome.storage API
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
    mockChromeStorage.local.set = jest.fn();
    mockChromeStorage.local.remove = jest.fn();
    mockChromeStorage.local.clear = jest.fn();
    mockChromeStorage.local.getBytesInUse = jest.fn();

    // Sync storage mocks
    mockChromeStorage.sync.get.mockImplementation((keys) => {
      if (keys === null) {
        return Promise.resolve({ ...mockChromeStorage.sync.data });
      }
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockChromeStorage.sync.data[keys] });
      }
      if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          if (mockChromeStorage.sync.data[key] !== undefined) {
            result[key] = mockChromeStorage.sync.data[key];
          }
        });
        return Promise.resolve(result);
      }
      return Promise.resolve({ ...mockChromeStorage.sync.data });ity with status tracking
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock chrome.storage API
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

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0'
  },
  writable: true
});

// Mock debug and logInfo
global.debug = {
  error: jest.fn(),
  log: jest.fn()
};
global.logInfo = jest.fn();

// Import modules after setting up mocks
import { diagnostics, syncStatusTracker } from '../../helpers/syncDiagnostics.js';

describe('Enhanced Sync Diagnostics', () => {
  beforeEach(() => {
    // Reset mock data
    mockChromeStorage.sync.data = {};
    mockChromeStorage.local.data = {};
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup mock implementations
    setupMockImplementations();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function setupMockImplementations() {
    // Sync storage mocks
    mockChromeStorage.sync.get.mockImplementation((keys) => {
      if (keys === null) {
        return Promise.resolve({ ...mockChromeStorage.sync.data });
      }
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockChromeStorage.sync.data[keys] });
      }
      if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          if (mockChromeStorage.sync.data[key] !== undefined) {
            result[key] = mockChromeStorage.sync.data[key];
          }
        });
        return Promise.resolve(result);
      }
      return Promise.resolve({ ...mockChromeStorage.sync.data });
    });
    
    mockChromeStorage.sync.set.mockImplementation((data) => {
      Object.assign(mockChromeStorage.sync.data, data);
      return Promise.resolve();
    });
    
    mockChromeStorage.sync.clear.mockImplementation(() => {
      mockChromeStorage.sync.data = {};
      return Promise.resolve();
    });
    
    mockChromeStorage.sync.getBytesInUse.mockImplementation(() => {
      return Promise.resolve(JSON.stringify(mockChromeStorage.sync.data).length);
    });

    // Local storage mocks
    mockChromeStorage.local.get.mockImplementation((keys) => {
      if (keys === null) {
        return Promise.resolve({ ...mockChromeStorage.local.data });
      }
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockChromeStorage.local.data[keys] });
      }
      if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          if (mockChromeStorage.local.data[key] !== undefined) {
            result[key] = mockChromeStorage.local.data[key];
          }
        });
        return Promise.resolve(result);
      }
      return Promise.resolve({ ...mockChromeStorage.local.data });
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
    
    mockChromeStorage.local.getBytesInUse.mockImplementation(() => {
      return Promise.resolve(JSON.stringify(mockChromeStorage.local.data).length);
    });
  }

  describe('Enhanced checkSyncStatus', () => {
    test('should include sync status history in results', async () => {
      // Set up sync status history
      const syncStatus = {
        lastSuccessfulSync: '2023-12-01T10:00:00.000Z',
        lastSyncOperation: 'save',
        consecutiveErrors: 0,
        syncHealth: 'good',
        recentErrors: []
      };
      mockChromeStorage.local.data.syncStatus = syncStatus;

      const results = await diagnostics.checkSyncStatus();

      expect(results.syncStatusHistory).toEqual(syncStatus);
      expect(results.syncAvailable).toBe(true);
      expect(results.browser).toContain('Chrome');
    });

    test('should handle missing sync status gracefully', async () => {
      const results = await diagnostics.checkSyncStatus();

      expect(results.syncStatusHistory).toEqual({
        lastSuccessfulSync: null,
        lastSyncAttempt: null,
        lastSyncError: null,
        lastSyncOperation: null,
        recentErrors: [],
        consecutiveErrors: 0,
        syncHealth: 'unknown'
      });
    });

    test('should detect syncable settings correctly', async () => {
      mockChromeStorage.sync.data = {
        mode: 'blacklist',
        blacklist: ['test.com'],
        action: 'redirect',
        schedule: { isEnabled: false }
      };

      const results = await diagnostics.checkSyncStatus();

      expect(results.syncableSettingsFound).toContain('mode');
      expect(results.syncableSettingsFound).toContain('blacklist');
      expect(results.syncableSettingsFound).toContain('action');
      expect(results.syncableSettingsFound).toContain('schedule');
    });

    test('should identify missing settings', async () => {
      mockChromeStorage.sync.data = {
        mode: 'blacklist'
        // Missing other expected settings
      };

      const results = await diagnostics.checkSyncStatus();

      expect(results.missingSettings).toContain('blacklist');
      expect(results.missingSettings).toContain('whitelist');
      expect(results.missingSettings).toContain('action');
    });
  });

  describe('Enhanced diagnoseProblems', () => {
    test('should detect sync health issues from status history', async () => {
      // Set up poor sync health
      mockChromeStorage.local.data.syncStatus = {
        consecutiveErrors: 4,
        syncHealth: 'poor',
        recentErrors: [
          { message: 'Error 1', timestamp: '2023-12-01T09:00:00.000Z' },
          { message: 'Error 2', timestamp: '2023-12-01T09:05:00.000Z' },
          { message: 'Error 3', timestamp: '2023-12-01T09:10:00.000Z' },
          { message: 'Error 4', timestamp: '2023-12-01T09:15:00.000Z' }
        ]
      };

      const diagnosis = await diagnostics.diagnoseProblems();

      expect(diagnosis.problems.length).toBeGreaterThan(0);
      expect(diagnosis.problems.some(p => p.includes('consecutive') || p.includes('poor'))).toBe(true);
      expect(diagnosis.overallHealth).toBe('poor');
    });

    test('should detect quota issues', async () => {
      // Mock high storage usage
      mockChromeStorage.sync.getBytesInUse.mockResolvedValueOnce(95000); // Close to 100KB limit

      const diagnosis = await diagnostics.diagnoseProblems();

      expect(diagnosis.problems.some(p => p.includes('quota') || p.includes('storage'))).toBe(true);
      expect(diagnosis.suggestions.some(s => s.includes('removing') || s.includes('reducing'))).toBe(true);
    });

    test('should detect large arrays', async () => {
      mockChromeStorage.sync.data = {
        blacklist: new Array(150).fill('example.com'),
        whitelist: new Array(80).fill('allowed.com')
      };

      const diagnosis = await diagnostics.diagnoseProblems();

      expect(diagnosis.problems.some(p => p.includes('Large blacklist'))).toBe(true);
      expect(diagnosis.suggestions.some(s => s.includes('organizing') || s.includes('removing'))).toBe(true);
    });

    test('should detect missing timestamps', async () => {
      mockChromeStorage.sync.data = {
        blacklist: ['test.com'],
        whitelist: ['allowed.com']
        // Missing timestamp fields
      };

      const diagnosis = await diagnostics.diagnoseProblems();

      expect(diagnosis.problems.some(p => p.includes('timestamps'))).toBe(true);
      expect(diagnosis.suggestions.some(s => s.includes('Timestamps'))).toBe(true);
    });

    test('should return healthy status when no issues found', async () => {
      mockChromeStorage.sync.data = {
        mode: 'blacklist',
        blacklist: ['test.com'],
        whitelist: ['allowed.com'],
        blacklistLastModifiedDate: Date.now(),
        whitelistLastModifiedDate: Date.now(),
        blacklistKeywordsLastModifiedDate: Date.now(),
        whitelistKeywordsLastModifiedDate: Date.now()
      };
      
      // Ensure good sync status
      mockChromeStorage.local.data.syncStatus = {
        consecutiveErrors: 0,
        syncHealth: 'good',
        recentErrors: []
      };

      const diagnosis = await diagnostics.diagnoseProblems();

      expect(diagnosis.problemCount).toBe(0);
      expect(diagnosis.overallHealth).toBe('good');
    });
  });

  describe('Enhanced testSync', () => {
    test('should test sync functionality with detailed steps', async () => {
      const result = await diagnostics.testSync();

      expect(result.testId).toBeTruthy();
      expect(result.startTime).toBeTruthy();
      expect(result.endTime).toBeTruthy();
      expect(result.success).toBe(true);
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.steps).toContain('✅ Successfully wrote to sync storage');
      expect(result.steps).toContain('✅ Successfully read from sync storage');
      expect(result.steps).toContain('✅ Data integrity verified');
    });

    test('should handle sync test failures gracefully', async () => {
      // Mock sync failure
      mockChromeStorage.sync.set.mockRejectedValueOnce(new Error('Sync write failed'));

      const result = await diagnostics.testSync();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toBe('Sync write failed');
      expect(result.steps.some(step => step.includes('❌'))).toBe(true);
    });

    test('should clean up test data even on failure', async () => {
      // Mock failure after write
      mockChromeStorage.sync.get.mockRejectedValueOnce(new Error('Read failed'));

      const result = await diagnostics.testSync();

      expect(result.success).toBe(false);
      expect(result.steps.some(step => step.includes('Cleanup completed'))).toBe(true);
      expect(mockChromeStorage.sync.remove).toHaveBeenCalled();
    });
  });

  describe('forceSyncAllData', () => {
    test('should sync all local data to cloud', async () => {
      // Set up local data
      mockChromeStorage.local.data = {
        mode: 'blacklist',
        blacklist: ['local-site.com'],
        action: 'redirect',
        isEnabled: true, // Should be excluded (local-only)
        password: { hash: 'secret' } // Should be excluded (local-only)
      };

      const result = await diagnostics.forceSyncAllData();

      expect(result.success).toBe(true);
      expect(result.syncedKeys).toContain('mode');
      expect(result.syncedKeys).toContain('blacklist');
      expect(result.syncedKeys).toContain('action');
      expect(result.syncedKeys).not.toContain('isEnabled');
      expect(result.syncedKeys).not.toContain('password');
      expect(result.timestamp).toBeTruthy();
    });

    test('should handle force sync errors', async () => {
      mockChromeStorage.sync.set.mockRejectedValueOnce(new Error('Force sync failed'));

      const result = await diagnostics.forceSyncAllData();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Force sync failed');
    });
  });

  describe('Storage Integration', () => {
    test('should work with real storage operations', async () => {
      // Test the full flow: status tracking + diagnostics
      
      // 1. Record sync success
      await syncStatusTracker.recordSyncSuccess('integration-test');
      
      // 2. Add some sync data
      mockChromeStorage.sync.data = {
        mode: 'blacklist',
        blacklist: ['integration-test.com']
      };
      
      // 3. Run diagnostics
      const results = await diagnostics.checkSyncStatus();
      
      expect(results.syncStatusHistory.lastSuccessfulSync).toBeTruthy();
      expect(results.syncStatusHistory.lastSyncOperation).toBe('integration-test');
      expect(results.syncableSettingsFound).toContain('mode');
      expect(results.syncableSettingsFound).toContain('blacklist');
    });

    test('should handle concurrent diagnostics and status updates', async () => {
      // Simulate concurrent operations
      const promises = [
        diagnostics.checkSyncStatus(),
        syncStatusTracker.recordSyncSuccess('concurrent-1'),
        diagnostics.testSync(),
        syncStatusTracker.recordSyncError(new Error('concurrent error'), 'concurrent-2')
      ];

      const results = await Promise.all(promises);

      // All operations should complete without throwing
      expect(results).toHaveLength(4);
      expect(results[0].syncAvailable).toBe(true); // checkSyncStatus result
      expect(results[1].syncHealth).toBe('good'); // recordSyncSuccess result
      expect(results[2].success).toBe(true); // testSync result
      expect(results[3].consecutiveErrors).toBe(1); // recordSyncError result
    });
  });

  describe('Error Handling', () => {
    test('should handle storage API unavailability', async () => {
      // Mock chrome.storage being undefined
      const originalChrome = global.chrome;
      global.chrome = {};

      const results = await diagnostics.checkSyncStatus();

      expect(results.syncAvailable).toBe(false);
      expect(results.errors.length).toBeGreaterThan(0);

      // Restore chrome
      global.chrome = originalChrome;
    });

    test('should handle partial storage failures', async () => {
      // Mock sync storage failure but local storage working
      mockChromeStorage.sync.get.mockRejectedValueOnce(new Error('Sync storage error'));

      const results = await diagnostics.checkSyncStatus();

      expect(results.errors.some(e => e.message === 'Sync storage error')).toBe(true);
      expect(results.syncAvailable).toBe(true); // Still available, just had an error
    });
  });
});
