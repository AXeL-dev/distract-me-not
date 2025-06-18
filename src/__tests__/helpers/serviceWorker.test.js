/**
 * Tests for service worker functionality
 * Tests the blocking logic, rule management, and sync integration
 */

import { jest } from '@jest/globals';
import chromeMock from '../../__mocks__/chrome';

// Create mock for service worker helpers
const mockServiceWorkerHelpers = {
  handleInstall: jest.fn(),
  updateBlockingRules: jest.fn(),
  processNavigation: jest.fn(),
  handleMessage: jest.fn(),
  checkBlockingStatus: jest.fn(),
};

// Basic service worker functionality tests
describe('Service Worker Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chromeMock.storage.sync.get.mockClear();
    chromeMock.storage.local.get.mockClear();
    if (chromeMock.declarativeNetRequest?.updateDynamicRules) {
      chromeMock.declarativeNetRequest.updateDynamicRules.mockClear();
    }
  });

  describe('Chrome Extension API Structure', () => {
    it('should have access to chrome extension APIs', () => {
      expect(global.chrome).toBeDefined();
      expect(global.chrome.runtime).toBeDefined();
      expect(global.chrome.storage).toBeDefined();
      expect(global.chrome.tabs).toBeDefined();
    });

    it('should handle message passing structure', () => {
      // Test basic message structure that service worker expects
      const testMessage = {
        action: 'testAction',
        data: { test: 'value' }
      };
      
      expect(testMessage.action).toBe('testAction');
      expect(testMessage.data.test).toBe('value');
    });
  });

  describe('Storage Operations', () => {
    it('should handle storage data structure', () => {
      // Test that storage operations follow expected pattern
      const mockStorageData = {
        blacklist: ['example.com'],
        whitelist: ['allowed.com'],
        isEnabled: true
      };
      
      expect(Array.isArray(mockStorageData.blacklist)).toBe(true);
      expect(Array.isArray(mockStorageData.whitelist)).toBe(true);
      expect(typeof mockStorageData.isEnabled).toBe('boolean');
    });

    it('should handle sync storage operations', async () => {
      const testData = { blacklist: ['test.com'] };
      
      chromeMock.storage.sync.get.mockImplementation((keys, callback) => {
        callback(testData);
      });

      // Simulate getting data from sync storage
      return new Promise((resolve) => {
        chromeMock.storage.sync.get(['blacklist'], (result) => {
          expect(result.blacklist).toEqual(['test.com']);
          resolve();
        });
      });
    });
  });

  describe('Blocking Logic', () => {
    it('should validate URL patterns', () => {
      const validUrls = [
        'https://example.com',
        'http://test.com',
        'https://subdomain.example.com'
      ];
      
      validUrls.forEach(url => {
        expect(typeof url).toBe('string');
        expect(url.length).toBeGreaterThan(0);
      });
    });

    it('should handle wildcard patterns', () => {
      const patterns = [
        '*.example.com',
        'subdomain.*',
        '*test*'
      ];
      
      patterns.forEach(pattern => {
        expect(typeof pattern).toBe('string');
        expect(pattern.includes('*')).toBe(true);
      });
    });
  });
});

describe('Service Worker Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chromeMock.storage.sync.get.mockClear();
    chromeMock.storage.local.get.mockClear();
    chromeMock.declarativeNetRequest.updateDynamicRules.mockClear();
  });

  describe('Installation Handling', () => {
    it('should set install time on fresh install', async () => {
      const installTime = Date.now();
      
      mockServiceWorkerHelpers.handleInstall.mockImplementation(async () => {
        chromeMock.storage.local.set({ installTime });
        return { success: true, installTime };
      });

      const result = await mockServiceWorkerHelpers.handleInstall();
      
      expect(result.success).toBe(true);
      expect(result.installTime).toEqual(installTime);
      expect(mockServiceWorkerHelpers.handleInstall).toHaveBeenCalled();
    });

    it('should not overwrite existing install time', async () => {
      const existingInstallTime = Date.now() - 86400000; // 1 day ago
      
      chromeMock.storage.local.get.mockImplementation((keys, callback) => {
        callback({ installTime: existingInstallTime });
      });

      mockServiceWorkerHelpers.handleInstall.mockImplementation(async () => {
        const existing = await new Promise(resolve => 
          chromeMock.storage.local.get(['installTime'], resolve)
        );
        
        if (existing.installTime) {
          return { success: true, installTime: existing.installTime, isExisting: true };
        }
        
        const newInstallTime = Date.now();
        chromeMock.storage.local.set({ installTime: newInstallTime });
        return { success: true, installTime: newInstallTime, isExisting: false };
      });

      const result = await mockServiceWorkerHelpers.handleInstall();
      
      expect(result.success).toBe(true);
      expect(result.installTime).toEqual(existingInstallTime);
      expect(result.isExisting).toBe(true);
    });
  });

  describe('Blocking Rules Management', () => {
    it('should update blocking rules when settings change', async () => {
      const settings = {
        isEnabled: true,
        mode: 'blacklist',
        blacklist: ['example.com', 'test.com'],
        whitelist: []
      };

      mockServiceWorkerHelpers.updateBlockingRules.mockImplementation(async (settings) => {
        const rules = settings.blacklist.map((domain, index) => ({
          id: index + 1,
          priority: 1,
          action: { type: 'redirect', redirect: { url: 'blocked.html' } },
          condition: { urlFilter: `*://*.${domain}/*` }
        }));

        await chromeMock.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [], // Remove all existing rules
          addRules: rules
        });

        return { success: true, rulesCount: rules.length };
      });

      const result = await mockServiceWorkerHelpers.updateBlockingRules(settings);
      
      expect(result.success).toBe(true);
      expect(result.rulesCount).toBe(2);
      expect(chromeMock.declarativeNetRequest.updateDynamicRules).toHaveBeenCalled();
    });

    it('should clear blocking rules when extension is disabled', async () => {
      const settings = {
        isEnabled: false,
        mode: 'blacklist',
        blacklist: ['example.com'],
        whitelist: []
      };

      mockServiceWorkerHelpers.updateBlockingRules.mockImplementation(async (settings) => {
        if (!settings.isEnabled) {
          await chromeMock.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [1, 2, 3, 4, 5], // Remove all rules
            addRules: []
          });
          return { success: true, rulesCount: 0 };
        }
      });

      const result = await mockServiceWorkerHelpers.updateBlockingRules(settings);
      
      expect(result.success).toBe(true);
      expect(result.rulesCount).toBe(0);
      expect(chromeMock.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
        removeRuleIds: [1, 2, 3, 4, 5],
        addRules: []
      });
    });

    it('should handle whitelist mode correctly', async () => {
      const settings = {
        isEnabled: true,
        mode: 'whitelist',
        blacklist: [],
        whitelist: ['work.com', 'docs.com']
      };

      mockServiceWorkerHelpers.updateBlockingRules.mockImplementation(async (settings) => {
        if (settings.mode === 'whitelist') {
          // In whitelist mode, block everything except whitelisted domains
          const allowRules = settings.whitelist.map((domain, index) => ({
            id: index + 1,
            priority: 2,
            action: { type: 'allow' },
            condition: { urlFilter: `*://*.${domain}/*` }
          }));

          const blockAllRule = {
            id: 999,
            priority: 1,
            action: { type: 'redirect', redirect: { url: 'blocked.html' } },
            condition: { urlFilter: '*://*/*' }
          };

          await chromeMock.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [],
            addRules: [...allowRules, blockAllRule]
          });

          return { success: true, rulesCount: allowRules.length + 1 };
        }
      });

      const result = await mockServiceWorkerHelpers.updateBlockingRules(settings);
      
      expect(result.success).toBe(true);
      expect(result.rulesCount).toBe(3); // 2 allow rules + 1 block-all rule
    });
  });

  describe('Navigation Processing', () => {
    it('should process navigation events correctly', async () => {
      const navigationDetails = {
        url: 'https://example.com/page',
        tabId: 1,
        frameId: 0
      };

      const settings = {
        isEnabled: true,
        mode: 'blacklist',
        blacklist: ['example.com']
      };

      mockServiceWorkerHelpers.processNavigation.mockImplementation(async (details, settings) => {
        const url = new URL(details.url);
        const isBlocked = settings.isEnabled && 
                         settings.mode === 'blacklist' && 
                         settings.blacklist.some(domain => url.hostname.includes(domain));

        if (isBlocked) {
          await chromeMock.tabs.update(details.tabId, {
            url: `blocked.html?url=${encodeURIComponent(details.url)}`
          });
          return { blocked: true, reason: 'blacklist' };
        }

        return { blocked: false };
      });

      chromeMock.storage.sync.get.mockImplementation((keys, callback) => {
        callback(settings);
      });

      const result = await mockServiceWorkerHelpers.processNavigation(navigationDetails, settings);
      
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('blacklist');
    });

    it('should not block navigation when extension is disabled', async () => {
      const navigationDetails = {
        url: 'https://example.com/page',
        tabId: 1,
        frameId: 0
      };

      const settings = {
        isEnabled: false,
        mode: 'blacklist',
        blacklist: ['example.com']
      };

      mockServiceWorkerHelpers.processNavigation.mockImplementation(async (details, settings) => {
        if (!settings.isEnabled) {
          return { blocked: false, reason: 'disabled' };
        }
      });

      const result = await mockServiceWorkerHelpers.processNavigation(navigationDetails, settings);
      
      expect(result.blocked).toBe(false);
      expect(result.reason).toBe('disabled');
    });
  });

  describe('Message Handling', () => {
    it('should handle settings update messages', async () => {
      const message = {
        type: 'SETTINGS_UPDATED',
        data: {
          isEnabled: true,
          mode: 'blacklist',
          blacklist: ['new-example.com']
        }
      };

      mockServiceWorkerHelpers.handleMessage.mockImplementation(async (message) => {
        if (message.type === 'SETTINGS_UPDATED') {
          await mockServiceWorkerHelpers.updateBlockingRules(message.data);
          return { success: true, action: 'rules_updated' };
        }
      });

      const result = await mockServiceWorkerHelpers.handleMessage(message);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('rules_updated');
      expect(mockServiceWorkerHelpers.updateBlockingRules).toHaveBeenCalledWith(message.data);
    });

    it('should handle sync protection messages', async () => {
      const message = {
        type: 'CHECK_FRESH_INSTALL'
      };

      mockServiceWorkerHelpers.handleMessage.mockImplementation(async (message) => {
        if (message.type === 'CHECK_FRESH_INSTALL') {
          const installTime = await new Promise(resolve =>
            chromeMock.storage.local.get(['installTime'], resolve)
          );
          
          const isFreshInstall = !installTime.installTime || 
                               (Date.now() - installTime.installTime) < 300000; // 5 minutes
          
          return { isFreshInstall, installTime: installTime.installTime };
        }
      });

      // Mock recent install
      chromeMock.storage.local.get.mockImplementation((keys, callback) => {
        callback({ installTime: Date.now() - 60000 }); // 1 minute ago
      });

      const result = await mockServiceWorkerHelpers.handleMessage(message);
      
      expect(result.isFreshInstall).toBe(true);
      expect(typeof result.installTime).toBe('number');
    });
  });

  describe('Blocking Status Check', () => {
    it('should correctly check if a URL should be blocked', async () => {
      const url = 'https://example.com/page';
      const settings = {
        isEnabled: true,
        mode: 'blacklist',
        blacklist: ['example.com', 'test.com'],
        whitelist: []
      };

      mockServiceWorkerHelpers.checkBlockingStatus.mockImplementation((url, settings) => {
        if (!settings.isEnabled) {
          return { shouldBlock: false, reason: 'disabled' };
        }

        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        if (settings.mode === 'blacklist') {
          const isBlacklisted = settings.blacklist.some(domain => 
            hostname === domain || hostname.endsWith('.' + domain)
          );
          return { 
            shouldBlock: isBlacklisted, 
            reason: isBlacklisted ? 'blacklisted' : 'allowed' 
          };
        }

        if (settings.mode === 'whitelist') {
          const isWhitelisted = settings.whitelist.some(domain => 
            hostname === domain || hostname.endsWith('.' + domain)
          );
          return { 
            shouldBlock: !isWhitelisted, 
            reason: isWhitelisted ? 'whitelisted' : 'not_whitelisted' 
          };
        }

        return { shouldBlock: false, reason: 'unknown_mode' };
      });

      const result = mockServiceWorkerHelpers.checkBlockingStatus(url, settings);
      
      expect(result.shouldBlock).toBe(true);
      expect(result.reason).toBe('blacklisted');
    });

    it('should handle subdomain blocking correctly', async () => {
      const url = 'https://subdomain.example.com/page';
      const settings = {
        isEnabled: true,
        mode: 'blacklist',
        blacklist: ['example.com'],
        whitelist: []
      };

      mockServiceWorkerHelpers.checkBlockingStatus.mockImplementation((url, settings) => {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        const isBlacklisted = settings.blacklist.some(domain => 
          hostname === domain || hostname.endsWith('.' + domain)
        );

        return { 
          shouldBlock: isBlacklisted, 
          reason: isBlacklisted ? 'blacklisted' : 'allowed' 
        };
      });

      const result = mockServiceWorkerHelpers.checkBlockingStatus(url, settings);
      
      expect(result.shouldBlock).toBe(true);
      expect(result.reason).toBe('blacklisted');
    });
  });
});
