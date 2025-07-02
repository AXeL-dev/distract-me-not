/**
 * Chrome Extension API Mock for Testing
 * Provides mock implementations for the chrome.* APIs used in the extension
 */

const mockStorage = {
  local: new Map(),
  sync: new Map(),
};

const createStorageArea = (area) => ({
  get: jest.fn((keys, callback) => {
    const result = {};
    const keyArray = Array.isArray(keys) ? keys : [keys];
    
    keyArray.forEach(key => {
      if (area.has(key)) {
        result[key] = area.get(key);
      }
    });
    
    if (callback) {
      callback(result);
    }
    return Promise.resolve(result);
  }),
  
  set: jest.fn((items, callback) => {
    Object.entries(items).forEach(([key, value]) => {
      area.set(key, value);
    });
    
    if (callback) {
      callback();
    }
    return Promise.resolve();
  }),
  
  remove: jest.fn((keys, callback) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    keyArray.forEach(key => area.delete(key));
    
    if (callback) {
      callback();
    }
    return Promise.resolve();
  }),
  
  clear: jest.fn((callback) => {
    area.clear();
    if (callback) {
      callback();
    }
    return Promise.resolve();
  })
});

const chrome = {
  storage: {
    local: createStorageArea(mockStorage.local),
    sync: createStorageArea(mockStorage.sync),
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(() => false)
    }
  },
  
  runtime: {
    id: 'test-extension-id',
    getManifest: jest.fn(() => ({
      version: '3.0.0',
      name: 'Distract Me Not Test'
    })),
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(() => false)
    },
    onInstalled: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(() => false)
    },
    lastError: null
  },
  
  tabs: {
    query: jest.fn((queryInfo, callback) => {
      const tabs = [{ id: 1, url: 'https://example.com', active: true }];
      if (callback) callback(tabs);
      return Promise.resolve(tabs);
    }),
    update: jest.fn((tabId, updateProperties, callback) => {
      const tab = { id: tabId, ...updateProperties };
      if (callback) callback(tab);
      return Promise.resolve(tab);
    }),
    create: jest.fn((createProperties, callback) => {
      const tab = { id: Date.now(), ...createProperties };
      if (callback) callback(tab);
      return Promise.resolve(tab);
    }),
    remove: jest.fn((tabIds, callback) => {
      if (callback) callback();
      return Promise.resolve();
    })
  },
  
  alarms: {
    create: jest.fn(),
    clear: jest.fn((name, callback) => {
      if (callback) callback(true);
      return Promise.resolve(true);
    }),
    clearAll: jest.fn((callback) => {
      if (callback) callback(true);
      return Promise.resolve(true);
    }),
    get: jest.fn((name, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    }),
    getAll: jest.fn((callback) => {
      if (callback) callback([]);
      return Promise.resolve([]);
    }),
    onAlarm: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(() => false)
    }
  },
  
  i18n: {
    getMessage: jest.fn((messageName, substitutions) => {
      // Mock implementation for i18n messages
      const messages = {
        appName: 'Distract Me Not',
        status: 'Status',
        mode: 'Mode',
        blacklist: 'denyList',
        whitelist: 'allowList',
        schedule: 'Schedule',
        defaultBlockingMessage: 'defaultBlockingMessage',
        blockedDueTo: 'blockedDueTo',
        noSpecificReason: 'noSpecificReason'
      };
      return messages[messageName] || messageName;
    })
  },
  
  permissions: {
    contains: jest.fn((permissions, callback) => {
      if (callback) callback(true);
      return Promise.resolve(true);
    }),
    request: jest.fn((permissions, callback) => {
      if (callback) callback(true);
      return Promise.resolve(true);
    })
  },
  
  // Mock for webNavigation API
  webNavigation: {
    onBeforeNavigate: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(() => false)
    },
    onCompleted: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(() => false)
    }
  },
  
  // Mock for declarativeNetRequest API (MV3)
  declarativeNetRequest: {
    updateDynamicRules: jest.fn((options, callback) => {
      if (callback) callback();
      return Promise.resolve();
    }),
    getDynamicRules: jest.fn((callback) => {
      if (callback) callback([]);
      return Promise.resolve([]);
    })
  }
};

// Export the mock
export default chrome;

// Also set it globally for components that access chrome directly
global.chrome = chrome;
