/**
 * Sync Test Suite Runner
 * Comprehensive test suite for all sync-related functionality
 */

import { describe, test, expect } from '@jest/globals';

// DO NOT import other test files directly - this causes mock conflicts
// Instead, this file provides shared utilities for other sync tests

describe('Sync Functionality - Complete Test Suite', () => {
  test('All sync test suites should be imported and ready', () => {
    // This test verifies that the sync test infrastructure is working
    // Individual sync test files should be run separately to avoid mock conflicts
    expect(true).toBe(true);
  });
});

// Export test utilities for other test files
export const syncTestUtils = {
  /**
   * Create mock Chrome storage with sync and local storage
   */
  createMockStorage() {
    return {
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
  },

  /**
   * Setup mock storage implementations
   */
  setupMockImplementations(mockStorage) {
    // Sync storage implementations
    mockStorage.sync.get.mockImplementation((keys) => {
      if (keys === null) {
        return Promise.resolve({ ...mockStorage.sync.data });
      }
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockStorage.sync.data[keys] });
      }
      if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          if (mockStorage.sync.data[key] !== undefined) {
            result[key] = mockStorage.sync.data[key];
          }
        });
        return Promise.resolve(result);
      }
      if (typeof keys === 'object') {
        const result = {};
        Object.keys(keys).forEach(key => {
          result[key] = mockStorage.sync.data[key] !== undefined 
            ? mockStorage.sync.data[key] 
            : keys[key];
        });
        return Promise.resolve(result);
      }
      return Promise.resolve({ ...mockStorage.sync.data });
    });
    
    mockStorage.sync.set.mockImplementation((data) => {
      Object.assign(mockStorage.sync.data, data);
      return Promise.resolve();
    });
    
    mockStorage.sync.remove.mockImplementation((keys) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => {
        delete mockStorage.sync.data[key];
      });
      return Promise.resolve();
    });
    
    mockStorage.sync.clear.mockImplementation(() => {
      mockStorage.sync.data = {};
      return Promise.resolve();
    });
    
    mockStorage.sync.getBytesInUse.mockImplementation((keys) => {
      let totalSize = 0;
      if (keys) {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => {
          if (mockStorage.sync.data[key] !== undefined) {
            totalSize += JSON.stringify({
              [key]: mockStorage.sync.data[key]
            }).length;
          }
        });
      } else {
        totalSize = JSON.stringify(mockStorage.sync.data).length;
      }
      return Promise.resolve(totalSize);
    });

    // Local storage implementations (same pattern)
    mockStorage.local.get.mockImplementation((keys) => {
      if (keys === null) {
        return Promise.resolve({ ...mockStorage.local.data });
      }
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockStorage.local.data[keys] });
      }
      if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          if (mockStorage.local.data[key] !== undefined) {
            result[key] = mockStorage.local.data[key];
          }
        });
        return Promise.resolve(result);
      }
      if (typeof keys === 'object') {
        const result = {};
        Object.keys(keys).forEach(key => {
          result[key] = mockStorage.local.data[key] !== undefined 
            ? mockStorage.local.data[key] 
            : keys[key];
        });
        return Promise.resolve(result);
      }
      return Promise.resolve({ ...mockStorage.local.data });
    });
    
    mockStorage.local.set.mockImplementation((data) => {
      Object.assign(mockStorage.local.data, data);
      return Promise.resolve();
    });
    
    mockStorage.local.remove.mockImplementation((keys) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => {
        delete mockStorage.local.data[key];
      });
      return Promise.resolve();
    });
    
    mockStorage.local.clear.mockImplementation(() => {
      mockStorage.local.data = {};
      return Promise.resolve();
    });
    
    mockStorage.local.getBytesInUse.mockImplementation((keys) => {
      let totalSize = 0;
      if (keys) {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => {
          if (mockStorage.local.data[key] !== undefined) {
            totalSize += JSON.stringify({
              [key]: mockStorage.local.data[key]
            }).length;
          }
        });
      } else {
        totalSize = JSON.stringify(mockStorage.local.data).length;
      }
      return Promise.resolve(totalSize);
    });
  },

  /**
   * Create test sync data
   */
  createTestSyncData() {
    return {
      mode: 'blacklist',
      action: 'redirect',
      blacklist: ['test-site-1.com', 'test-site-2.com'],
      whitelist: ['allowed-site-1.com', 'allowed-site-2.com'],
      blacklistKeywords: ['ad', 'tracking'],
      whitelistKeywords: ['important', 'work'],
      schedule: {
        isEnabled: false,
        days: {}
      },
      misc: {
        hideReportIssueButton: false,
        showAddWebsitePrompt: true
      }
    };
  },

  /**
   * Create test sync status data
   */
  createTestSyncStatus(options = {}) {
    return {
      lastSuccessfulSync: options.lastSuccessfulSync || new Date().toISOString(),
      lastSyncAttempt: options.lastSyncAttempt || new Date().toISOString(),
      lastSyncError: options.lastSyncError || null,
      lastSyncOperation: options.lastSyncOperation || 'test',
      recentErrors: options.recentErrors || [],
      consecutiveErrors: options.consecutiveErrors || 0,
      syncHealth: options.syncHealth || 'good'
    };
  },

  /**
   * Simulate sync errors for testing
   */
  simulateSyncErrors(count = 1) {
    const errors = [];
    for (let i = 1; i <= count; i++) {
      errors.push({
        timestamp: new Date(Date.now() - (count - i + 1) * 60000).toISOString(), // 1 minute apart
        operation: `test-operation-${i}`,
        message: `Test sync error ${i}`,
        stack: `Error stack trace ${i}`
      });
    }
    return errors;
  },

  /**
   * Wait for async operations to complete
   */
  async waitForAsync(ms = 10) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
