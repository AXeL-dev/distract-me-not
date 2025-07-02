/**
 * Sync Status Tracker Test Suite
 * Tests the sync status tracking functionality
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock chrome.storage API
const mockChromeStorage = {
  local: {
    data: {},
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn()
  }
};

// Setup chrome mock
global.chrome = {
  storage: mockChromeStorage
};

// Mock debug functions
global.debug = {
  error: jest.fn(),
  log: jest.fn()
};

// Mock logInfo function
global.logInfo = jest.fn();

// Import modules after setting up mocks
import { syncStatusTracker } from '../../helpers/syncDiagnostics.js';

describe('Sync Status Tracker', () => {
  beforeEach(() => {
    // Reset mock data
    mockChromeStorage.local.data = {};
    
    // Setup mock implementations with correct object handling
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Recording Sync Success', () => {
    test('should record successful sync operation', async () => {
      const result = await syncStatusTracker.recordSyncSuccess('test-operation');
      
      expect(result.lastSuccessfulSync).toBeTruthy();
      expect(result.lastSyncOperation).toBe('test-operation');
      expect(result.consecutiveErrors).toBe(0);
      expect(result.syncHealth).toBe('good');
      
      // Verify it was saved to storage
      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({
        syncStatus: expect.objectContaining({
          lastSuccessfulSync: expect.any(String),
          lastSyncOperation: 'test-operation',
          consecutiveErrors: 0,
          syncHealth: 'good'
        })
      });
    });

    test('should reset consecutive errors on success', async () => {
      // Set up existing error state
      mockChromeStorage.local.data.syncStatus = {
        consecutiveErrors: 3,
        syncHealth: 'poor',
        recentErrors: [
          { message: 'Error 1', timestamp: new Date().toISOString() },
          { message: 'Error 2', timestamp: new Date().toISOString() },
          { message: 'Error 3', timestamp: new Date().toISOString() }
        ]
      };
      
      const result = await syncStatusTracker.recordSyncSuccess('recovery');
      
      expect(result.consecutiveErrors).toBe(0);
      expect(result.syncHealth).toBe('good');
      expect(result.lastSyncOperation).toBe('recovery');
    });
  });

  describe('Recording Sync Errors', () => {
    test('should record sync error with details', async () => {
      const testError = new Error('Test sync error');
      testError.stack = 'Error stack trace';
      
      const result = await syncStatusTracker.recordSyncError(testError, 'test-operation');
      
      expect(result.lastSyncError).toEqual({
        timestamp: expect.any(String),
        operation: 'test-operation',
        message: 'Test sync error',
        stack: 'Error stack trace'
      });
      expect(result.consecutiveErrors).toBe(1);
      expect(result.recentErrors).toHaveLength(1);
    });

    test('should handle string errors', async () => {
      const result = await syncStatusTracker.recordSyncError('String error message', 'test-op');
      
      expect(result.lastSyncError.message).toBe('String error message');
      expect(result.lastSyncError.operation).toBe('test-op');
      expect(result.consecutiveErrors).toBe(1);
    });

    test('should track consecutive errors and update health', async () => {
      // Record first error
      await syncStatusTracker.recordSyncError(new Error('Error 1'), 'test');
      let status = await syncStatusTracker.getSyncStatus();
      expect(status.consecutiveErrors).toBe(1);
      expect(status.syncHealth).toBe('fair');
      
      // Record second error
      await syncStatusTracker.recordSyncError(new Error('Error 2'), 'test');
      status = await syncStatusTracker.getSyncStatus();
      expect(status.consecutiveErrors).toBe(2);
      expect(status.syncHealth).toBe('fair');
      
      // Record third error
      await syncStatusTracker.recordSyncError(new Error('Error 3'), 'test');
      status = await syncStatusTracker.getSyncStatus();
      expect(status.consecutiveErrors).toBe(3);
      expect(status.syncHealth).toBe('poor');
    });

    test('should limit recent errors to 5', async () => {
      // Record 7 errors
      for (let i = 1; i <= 7; i++) {
        await syncStatusTracker.recordSyncError(new Error(`Error ${i}`), 'test');
      }
      
      const status = await syncStatusTracker.getSyncStatus();
      
      expect(status.recentErrors).toHaveLength(5);
      expect(status.recentErrors[0].message).toBe('Error 3'); // First should be Error 3 (oldest of last 5)
      expect(status.recentErrors[4].message).toBe('Error 7'); // Last should be Error 7 (newest)
    });
  });

  describe('Getting Sync Status', () => {
    test('should return default status when none exists', async () => {
      const status = await syncStatusTracker.getSyncStatus();
      
      expect(status).toEqual({
        lastSuccessfulSync: null,
        lastSyncAttempt: null,
        lastSyncError: null,
        lastSyncOperation: null,
        recentErrors: [],
        consecutiveErrors: 0,
        syncHealth: 'unknown'
      });
    });

    test('should return existing status from storage', async () => {
      const existingStatus = {
        lastSuccessfulSync: '2023-12-01T10:00:00.000Z',
        lastSyncOperation: 'load',
        consecutiveErrors: 2,
        syncHealth: 'fair',
        recentErrors: [
          { message: 'Error 1', timestamp: '2023-12-01T09:58:00.000Z' }
        ]
      };
      
      mockChromeStorage.local.data.syncStatus = existingStatus;
      
      const status = await syncStatusTracker.getSyncStatus();
      
      expect(status).toEqual(expect.objectContaining(existingStatus));
    });

    test('should handle storage errors gracefully', async () => {
      mockChromeStorage.local.get.mockRejectedValueOnce(new Error('Storage error'));
      
      const status = await syncStatusTracker.getSyncStatus();
      
      expect(status.syncHealth).toBe('unknown');
      expect(status.lastSuccessfulSync).toBeNull();
    });
  });

  describe('Clearing Sync Status', () => {
    test('should clear sync status from storage', async () => {
      // Set up existing status
      await syncStatusTracker.recordSyncSuccess('test');
      await syncStatusTracker.recordSyncError(new Error('test'), 'test');
      
      // Clear status
      await syncStatusTracker.clearSyncStatus();
      
      // Verify removal was called
      expect(mockChromeStorage.local.remove).toHaveBeenCalledWith('syncStatus');
      
      // Verify getting status returns defaults
      const status = await syncStatusTracker.getSyncStatus();
      expect(status.lastSuccessfulSync).toBeNull();
      expect(status.recentErrors).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing error details', async () => {
      const result = await syncStatusTracker.recordSyncError({}, 'test');
      
      expect(result.lastSyncError.message).toBe('{}');
      expect(result.lastSyncError.operation).toBe('test');
    });

    test('should handle undefined operation parameter', async () => {
      const result = await syncStatusTracker.recordSyncSuccess();
      
      expect(result.lastSyncOperation).toBe('general');
    });

    test('should handle concurrent status updates', async () => {
      // Simulate concurrent operations
      const promises = [
        syncStatusTracker.recordSyncSuccess('op1'),
        syncStatusTracker.recordSyncError(new Error('error1'), 'op2'),
        syncStatusTracker.recordSyncSuccess('op3')
      ];
      
      const results = await Promise.all(promises);
      
      // All operations should complete without throwing
      expect(results).toHaveLength(3);
      expect(results.every(result => result !== null)).toBe(true);
    });
  });

  describe('Integration with Storage', () => {
    test('should preserve existing sync status properties', async () => {
      // Set up initial status with custom properties
      const initialStatus = {
        lastSuccessfulSync: '2023-12-01T10:00:00.000Z',
        customProperty: 'should be preserved',
        consecutiveErrors: 1
      };
      
      mockChromeStorage.local.data.syncStatus = initialStatus;
      
      // Record new success
      const result = await syncStatusTracker.recordSyncSuccess('new-op');
      
      // Should preserve custom property while updating sync fields
      expect(result.customProperty).toBe('should be preserved');
      expect(result.lastSyncOperation).toBe('new-op');
      expect(result.consecutiveErrors).toBe(0);
    });
  });
});
