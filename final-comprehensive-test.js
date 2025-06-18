// Final comprehensive test to ensure service worker loads data and blocks correctly
console.log('🎯 Final Comprehensive Service Worker Test');

async function runFullTest() {
  console.log('\n1. 📦 Checking Storage Data...');
  
  // Get current storage data
  const syncData = await new Promise((resolve) => {
    chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords'], resolve);
  });
  
  console.log('Storage contains:');
  console.log(`  Blacklist: ${syncData.blacklist?.length || 0} items`);
  console.log(`  Whitelist: ${syncData.whitelist?.length || 0} items`);
  
  if (syncData.blacklist?.length > 0) {
    console.log('  Sample blacklist items:', syncData.blacklist.slice(0, 3));
  }
  if (syncData.whitelist?.length > 0) {
    console.log('  Sample whitelist items:', syncData.whitelist.slice(0, 3));
  }
  
  console.log('\n2. 🧠 Checking Service Worker Memory...');
  
  // Check current memory state
  const memoryResponse = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ message: 'getCurrentMemoryState' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
  
  console.log('Service worker memory contains:');
  const memoryState = memoryResponse?.response;
  if (memoryState) {
    console.log(`  Blacklist: ${memoryState.blacklistCount} items`);
    console.log(`  Whitelist: ${memoryState.whitelistCount} items`);
    console.log(`  Is Enabled: ${memoryState.isEnabled}`);
    console.log(`  Mode: ${memoryState.mode}`);
  } else {
    console.log('  No memory state available');
  }
  
  console.log('\n3. 🔄 Forcing Service Worker Reinitialization...');
  
  // Force reinitialize
  await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ message: 'reinitialize' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
  
  // Wait for reinitialization
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n4. 🧠 Checking Memory After Reinitialization...');
  
  // Check memory state again
  const newMemoryResponse = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ message: 'getCurrentMemoryState' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
  
  console.log('Service worker memory after reinit:');
  const newMemoryState = newMemoryResponse?.response;
  if (newMemoryState) {
    console.log(`  Blacklist: ${newMemoryState.blacklistCount} items`);
    console.log(`  Whitelist: ${newMemoryState.whitelistCount} items`);
    console.log(`  Is Enabled: ${newMemoryState.isEnabled}`);
    console.log(`  Mode: ${newMemoryState.mode}`);
    
    if (newMemoryState.firstBlacklistItems?.length > 0) {
      console.log('  First blacklist items:', newMemoryState.firstBlacklistItems);
    }
    if (newMemoryState.firstWhitelistItems?.length > 0) {
      console.log('  First whitelist items:', newMemoryState.firstWhitelistItems);
    }
  }
  
  console.log('\n5. 🧪 Testing URL Blocking with Storage Data...');
  
  const testUrls = [
    'https://reddit.com/',
    'https://reddit.com/r/funny',
    'https://www.reddit.com/r/programming',
    'https://old.reddit.com/r/javascript',
    'https://www.facebook.com/',
    'https://youtube.com/watch?v=abc123'
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
      
      const result = response?.response?.result || 'No response';
      console.log(`  ${url}: ${result}`);
      
    } catch (error) {
      console.error(`  ${url}: Error -`, error);
    }
  }
  
  console.log('\n6. ✅ Testing Current URL Blocking (service worker memory)...');
  
  // Test with current service worker memory
  for (const url of testUrls.slice(0, 3)) {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          message: 'isUrlStillBlocked',
          params: [url]
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
      
      const result = response?.response ? 'BLOCKED' : 'ALLOWED';
      console.log(`  ${url}: ${result} (from SW memory)`);
      
    } catch (error) {
      console.error(`  ${url}: Error -`, error);
    }
  }
  
  console.log('\n🎯 Test Complete!');
  
  // Summary
  const hasStorageData = (syncData.blacklist?.length || 0) > 0 || (syncData.whitelist?.length || 0) > 0;
  const hasMemoryData = (newMemoryState?.blacklistCount || 0) > 0 || (newMemoryState?.whitelistCount || 0) > 0;
  
  console.log('\n📊 Summary:');
  console.log(`  Storage has data: ${hasStorageData ? '✅ YES' : '❌ NO'}`);
  console.log(`  Memory has data: ${hasMemoryData ? '✅ YES' : '❌ NO'}`);
  console.log(`  Data loaded correctly: ${hasStorageData && hasMemoryData ? '✅ YES' : '❌ NO'}`);
  
  if (hasStorageData && !hasMemoryData) {
    console.log('\n⚠️  ISSUE: Storage has data but service worker memory is empty!');
    console.log('   This suggests the init() function is not loading data properly.');
  } else if (hasStorageData && hasMemoryData) {
    console.log('\n✅ SUCCESS: Data is loaded correctly from storage into memory!');
  }
}

// Make function available globally
window.runFullTest = runFullTest;

// Run the test
runFullTest();
