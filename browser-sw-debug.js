// Direct service worker memory state test (run this in browser console)
console.log('🔍 Testing Service Worker Memory State');

// Test function to check current memory state
async function checkServiceWorkerMemory() {
  try {
    console.log('📨 Sending getCurrentMemoryState message...');
    
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ message: 'getCurrentMemoryState' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
    
    console.log('📊 Current Service Worker Memory State:');
    console.log('  Response:', response);
    
    if (response && response.response) {
      const state = response.response;
      console.log(`  Blacklist: ${state.blacklistCount} items`);
      console.log(`  Whitelist: ${state.whitelistCount} items`);
      console.log(`  Blacklist Keywords: ${state.blacklistKeywordsCount} items`);
      console.log(`  Whitelist Keywords: ${state.whitelistKeywordsCount} items`);
      console.log(`  Is Enabled: ${state.isEnabled}`);
      console.log(`  Mode: ${state.mode}`);
      
      if (state.firstBlacklistItems?.length > 0) {
        console.log('  First blacklist items:', state.firstBlacklistItems);
      }
      if (state.firstWhitelistItems?.length > 0) {
        console.log('  First whitelist items:', state.firstWhitelistItems);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking service worker memory:', error);
  }
}

// Test function to force reinitialize
async function forceReinitialize() {
  try {
    console.log('🔄 Forcing service worker reinitialization...');
    
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ message: 'reinitialize' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
    
    console.log('✅ Reinitialize response:', response);
    
    // Wait a moment then check memory state again
    setTimeout(checkServiceWorkerMemory, 1000);
    
  } catch (error) {
    console.error('❌ Error reinitializing service worker:', error);
  }
}

// Test function to check storage directly
async function checkStorage() {
  try {
    console.log('📦 Checking Storage Directly:');
    
    const syncData = await new Promise((resolve) => {
      chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords'], resolve);
    });
    
    const localData = await new Promise((resolve) => {
      chrome.storage.local.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords'], resolve);
    });
    
    console.log('📡 Sync Storage:');
    console.log(`  Blacklist: ${syncData.blacklist?.length || 0} items`);
    console.log(`  Whitelist: ${syncData.whitelist?.length || 0} items`);
    console.log(`  Blacklist Keywords: ${syncData.blacklistKeywords?.length || 0} items`);
    console.log(`  Whitelist Keywords: ${syncData.whitelistKeywords?.length || 0} items`);
    
    console.log('🏠 Local Storage:');
    console.log(`  Blacklist: ${localData.blacklist?.length || 0} items`);
    console.log(`  Whitelist: ${localData.whitelist?.length || 0} items`);
    console.log(`  Blacklist Keywords: ${localData.blacklistKeywords?.length || 0} items`);
    console.log(`  Whitelist Keywords: ${localData.whitelistKeywords?.length || 0} items`);
    
    // Show first few items
    if (syncData.blacklist?.length > 0) {
      console.log('🚫 First sync blacklist items:', syncData.blacklist.slice(0, 5));
    }
    if (syncData.whitelist?.length > 0) {
      console.log('✅ First sync whitelist items:', syncData.whitelist.slice(0, 5));
    }
    
  } catch (error) {
    console.error('❌ Error checking storage:', error);
  }
}

// Test URL blocking with current storage data
async function testUrlBlocking() {
  try {
    console.log('🧪 Testing URL Blocking with Current Storage Data:');
    
    // Get current storage data
    const syncData = await new Promise((resolve) => {
      chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords'], resolve);
    });
    
    const testUrls = [
      'https://reddit.com/',
      'https://reddit.com/r/funny',
      'https://www.reddit.com/r/programming',
      'https://old.reddit.com/r/javascript'
    ];
    
    for (const url of testUrls) {
      try {
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            message: 'testUrl',
            url: url,
            blacklist: syncData.blacklist || [],
            whitelist: syncData.whitelist || [],
            blacklistKeywords: syncData.blacklistKeywords || [],
            whitelistKeywords: syncData.whitelistKeywords || []
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        });
        
        console.log(`  ${url}: ${response?.response?.result || 'No response'}`);
        
      } catch (error) {
        console.error(`  ${url}: Error -`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing URL blocking:', error);
  }
}

// Run initial checks
console.log('🎮 Available functions:');
console.log('  checkServiceWorkerMemory() - Check current memory state');
console.log('  forceReinitialize() - Force service worker reinit');
console.log('  checkStorage() - Check storage directly');
console.log('  testUrlBlocking() - Test URL blocking with current data');

// Make functions available globally
window.checkServiceWorkerMemory = checkServiceWorkerMemory;
window.forceReinitialize = forceReinitialize;
window.checkStorage = checkStorage;
window.testUrlBlocking = testUrlBlocking;

// Run initial check
checkServiceWorkerMemory();
checkStorage();
