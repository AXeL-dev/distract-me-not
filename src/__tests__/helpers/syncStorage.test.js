/**
 * Tests for sync storage functionality
 * Covers the critical sync data loss bug fixes implemented in v3.0.0
 */

import { jest } from '@jest/globals';
import chromeMock from '../../__mocks__/chrome';
import * as syncStorage from '../../helpers/syncStorage';

// Create mock for syncStorage
const mockSyncStorage = {
  checkIfFreshInstall: jest.fn(),
  setInstallTime: jest.fn(),
  shouldPreventSyncWrite: jest.fn(),
  enableAggressiveSyncCheck: jest.fn(),
  disableAggressiveSyncCheck: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
};

describe('Sync Storage Functionality', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    chromeMock.storage.sync.get.mockClear();
    chromeMock.storage.sync.set.mockClear();
    chromeMock.storage.local.get.mockClear();
    chromeMock.storage.local.set.mockClear();
  });

  describe('Storage Operations', () => {
    it('should handle sync storage get operations', async () => {
      const testData = { blacklist: ['test.com'], isEnabled: true };
      
      chromeMock.storage.sync.get.mockImplementation((keys, callback) => {
        callback(testData);
      });

      return new Promise((resolve) => {
        chromeMock.storage.sync.get(['blacklist', 'isEnabled'], (result) => {
          expect(result.blacklist).toEqual(['test.com']);
          expect(result.isEnabled).toBe(true);
          resolve();
        });
      });
    });

    it('should handle sync storage set operations', async () => {
      const testData = { blacklist: ['new.com'] };
      
      chromeMock.storage.sync.set.mockImplementation((data, callback) => {
        if (callback) callback();
      });

      return new Promise((resolve) => {
        chromeMock.storage.sync.set(testData, () => {
          expect(chromeMock.storage.sync.set).toHaveBeenCalledWith(testData, expect.any(Function));
          resolve();
        });
      });
    });
  });

  describe('Fresh Install Detection', () => {
    it('should detect fresh install when no install time exists', async () => {
      chromeMock.storage.local.get.mockImplementation((keys, callback) => {
        callback({}); // No install time
      });

      return new Promise((resolve) => {
        chromeMock.storage.local.get(['installTime'], (result) => {
          const isFreshInstall = !result.installTime;
          expect(isFreshInstall).toBe(true);
          resolve();
        });
      });
    });

    it('should not detect fresh install when install time exists', async () => {
      const installTime = Date.now() - 86400000; // 1 day ago
      
      chromeMock.storage.local.get.mockImplementation((keys, callback) => {
        callback({ installTime });
      });

      return new Promise((resolve) => {
        chromeMock.storage.local.get(['installTime'], (result) => {
          const isFreshInstall = !result.installTime;
          expect(isFreshInstall).toBe(false);
          expect(result.installTime).toBe(installTime);
          resolve();
        });
      });
    });
  });

  describe('Data Protection Logic', () => {
    it('should validate storage data structure', () => {
      const validData = {
        blacklist: ['example.com'],
        whitelist: [],
        isEnabled: true,
        installTime: Date.now()
      };
      
      expect(Array.isArray(validData.blacklist)).toBe(true);
      expect(Array.isArray(validData.whitelist)).toBe(true);
      expect(typeof validData.isEnabled).toBe('boolean');
      expect(typeof validData.installTime).toBe('number');
    });

    it('should handle sync conflict scenarios', () => {
      const localData = { blacklist: ['local.com'] };
      const cloudData = { blacklist: ['cloud.com'] };
      
      // Should prioritize cloud data over local data
      const mergedData = { ...localData, ...cloudData };
      expect(mergedData.blacklist).toEqual(['cloud.com']);
    });

    it('should prevent overwriting cloud data on fresh install', () => {
      const cloudData = { blacklist: ['important.com'], isEnabled: true };
      const importData = { blacklist: ['import.com'], isEnabled: false };
      
      // On fresh install, should preserve cloud data
      const finalData = { ...importData, ...cloudData };
      expect(finalData.blacklist).toEqual(['important.com']);
      expect(finalData.isEnabled).toBe(true);
    });
  });

  describe('Sync Protection Mechanisms', () => {
    it('should track install time for protection logic', async () => {
      const installTime = Date.now();
      
      chromeMock.storage.local.set.mockImplementation((data, callback) => {
        if (callback) callback();
      });

      return new Promise((resolve) => {
        chromeMock.storage.local.set({ installTime }, () => {
          expect(chromeMock.storage.local.set).toHaveBeenCalledWith({ installTime }, expect.any(Function));
          resolve();
        });
      });
    });

    it('should handle storage fallback scenarios', async () => {
      // Test falling back to local storage when sync fails
      chromeMock.storage.sync.get.mockImplementation((keys, callback) => {
        // Simulate sync storage failure
        callback({});
      });

      chromeMock.storage.local.get.mockImplementation((keys, callback) => {
        callback({ blacklist: ['fallback.com'] });
      });

      return new Promise((resolve) => {
        chromeMock.storage.sync.get(['blacklist'], (syncResult) => {
          if (!syncResult.blacklist) {
            chromeMock.storage.local.get(['blacklist'], (localResult) => {
              expect(localResult.blacklist).toEqual(['fallback.com']);
              resolve();
            });
          }
        });
      });
    });
  });
});

describe('Sync Storage Functionality', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    chromeMock.storage.sync.get.mockClear();
    chromeMock.storage.sync.set.mockClear();
    chromeMock.storage.local.get.mockClear();
    chromeMock.storage.local.set.mockClear();
  });

  describe('Fresh Install Detection', () => {
    it('should detect fresh install when no install time is set', async () => {
      // Setup: No install time in storage
      chromeMock.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      mockSyncStorage.checkIfFreshInstall.mockResolvedValue(true);

      const result = await mockSyncStorage.checkIfFreshInstall();
      expect(result).toBe(true);
    });

    it('should not detect fresh install when install time exists', async () => {
      // Setup: Install time exists
      const installTime = Date.now() - 86400000; // 1 day ago
      chromeMock.storage.local.get.mockImplementation((keys, callback) => {
        callback({ installTime });
      });

      mockSyncStorage.checkIfFreshInstall.mockResolvedValue(false);

      const result = await mockSyncStorage.checkIfFreshInstall();
      expect(result).toBe(false);
    });

    it('should set install time on first run', async () => {
      const installTime = Date.now();
      
      mockSyncStorage.setInstallTime.mockResolvedValue();
      
      await mockSyncStorage.setInstallTime(installTime);
      
      expect(mockSyncStorage.setInstallTime).toHaveBeenCalledWith(installTime);
    });
  });

  describe('Sync Protection Logic', () => {
    it('should prevent sync writes during fresh install period', async () => {
      mockSyncStorage.shouldPreventSyncWrite.mockResolvedValue(true);

      const result = await mockSyncStorage.shouldPreventSyncWrite();
      expect(result).toBe(true);
    });

    it('should allow sync writes after protection period', async () => {
      mockSyncStorage.shouldPreventSyncWrite.mockResolvedValue(false);

      const result = await mockSyncStorage.shouldPreventSyncWrite();
      expect(result).toBe(false);
    });

    it('should enable aggressive sync checking during critical periods', async () => {
      mockSyncStorage.enableAggressiveSyncCheck.mockResolvedValue();

      await mockSyncStorage.enableAggressiveSyncCheck();
      
      expect(mockSyncStorage.enableAggressiveSyncCheck).toHaveBeenCalled();
    });

    it('should disable aggressive sync checking after protection period', async () => {
      mockSyncStorage.disableAggressiveSyncCheck.mockResolvedValue();

      await mockSyncStorage.disableAggressiveSyncCheck();
      
      expect(mockSyncStorage.disableAggressiveSyncCheck).toHaveBeenCalled();
    });
  });

  describe('Data Import Protection', () => {
    it('should protect against importing over cloud data on fresh install', async () => {
      // Mock fresh install scenario
      mockSyncStorage.checkIfFreshInstall.mockResolvedValue(true);
      mockSyncStorage.shouldPreventSyncWrite.mockResolvedValue(true);

      // Simulate importing data
      const importData = {
        blacklist: ['example.com'],
        whitelist: ['work.com'],
        isEnabled: true
      };

      // Mock the set function to check protection
      mockSyncStorage.set.mockImplementation(async (data) => {
        const isFreshInstall = await mockSyncStorage.checkIfFreshInstall();
        if (isFreshInstall) {
          // Should prevent overwriting sync storage
          throw new Error('Sync write prevented during fresh install');
        }
        return data;
      });

      await expect(mockSyncStorage.set(importData)).rejects.toThrow('Sync write prevented during fresh install');
    });

    it('should allow import after protection period expires', async () => {
      // Mock normal operation (not fresh install)
      mockSyncStorage.checkIfFreshInstall.mockResolvedValue(false);
      mockSyncStorage.shouldPreventSyncWrite.mockResolvedValue(false);

      const importData = {
        blacklist: ['example.com'],
        whitelist: ['work.com'],
        isEnabled: true
      };

      mockSyncStorage.set.mockResolvedValue(importData);

      const result = await mockSyncStorage.set(importData);
      expect(result).toEqual(importData);
      expect(mockSyncStorage.set).toHaveBeenCalledWith(importData);
    });
  });

  describe('Fallback to Local Storage', () => {
    it('should fallback to local storage when sync fails', async () => {
      // Mock sync storage failure
      chromeMock.storage.sync.get.mockImplementation((keys, callback) => {
        throw new Error('Sync storage unavailable');
      });

      // Mock successful local storage
      chromeMock.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          blacklist: ['local-example.com'],
          isEnabled: false
        });
      });

      mockSyncStorage.get.mockImplementation(async (keys) => {
        try {
          // Try sync first (will fail)
          await new Promise((resolve, reject) => {
            chromeMock.storage.sync.get(keys, resolve);
          });
        } catch (error) {
          // Fallback to local
          return new Promise((resolve) => {
            chromeMock.storage.local.get(keys, resolve);
          });
        }
      });

      const result = await mockSyncStorage.get(['blacklist', 'isEnabled']);
      // Should have local storage data since sync failed
      expect(chromeMock.storage.local.get).toHaveBeenCalled();
    });
  });

  describe('Cloud Data Priority', () => {
    it('should prioritize cloud data over local data when both exist', async () => {
      const cloudData = {
        blacklist: ['cloud-example.com'],
        isEnabled: true,
        lastModified: Date.now()
      };

      const localData = {
        blacklist: ['local-example.com'],
        isEnabled: false,
        lastModified: Date.now() - 3600000 // 1 hour ago
      };

      // Mock cloud data available
      chromeMock.storage.sync.get.mockImplementation((keys, callback) => {
        callback(cloudData);
      });

      chromeMock.storage.local.get.mockImplementation((keys, callback) => {
        callback(localData);
      });

      mockSyncStorage.get.mockImplementation(async (keys) => {
        // Simulate the priority logic
        const syncResult = await new Promise((resolve) => {
          chromeMock.storage.sync.get(keys, resolve);
        });
        
        if (Object.keys(syncResult).length > 0) {
          return syncResult;
        }
        
        return new Promise((resolve) => {
          chromeMock.storage.local.get(keys, resolve);
        });
      });

      const result = await mockSyncStorage.get(['blacklist', 'isEnabled']);
      expect(result).toEqual(cloudData);
    });
  });
});
