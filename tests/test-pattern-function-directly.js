// Test script to verify service worker pattern function is working correctly
console.log('🧪 Testing Service Worker Pattern Function Directly');

// This script tests the pattern function independently of the service worker's internal state
async function testPatternFunctionDirectly() {
  console.log('\n1. 📦 Getting Current Storage Data...');
  
  // Get current storage data
  const syncData = await new Promise((resolve) => {
    chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords'], resolve);
  });
  
  console.log('Storage contains:');
  console.log(`  Blacklist: ${syncData.blacklist?.length || 0} items`);
  console.log(`  Whitelist: ${syncData.whitelist?.length || 0} items`);
  
  // Show sample data
  if (syncData.blacklist?.length > 0) {
    console.log('  Sample blacklist items:', syncData.blacklist.slice(0, 3));
  }
  if (syncData.whitelist?.length > 0) {
    console.log('  Sample whitelist items:', syncData.whitelist.slice(0, 3));
  }
  
  console.log('\n2. 🧪 Testing Pattern Function with Storage Data...');
  
  const testUrls = [
    'https://reddit.com/',
    'https://reddit.com/r/funny',
    'https://www.reddit.com/r/programming',
    'https://old.reddit.com/r/javascript',
    'https://www.facebook.com/',
    'https://youtube.com/watch?v=abc123'
  ];
  
  // Test each URL using the testUrl message handler (which uses pattern function)
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
  
  console.log('\n3. 🔍 Checking Service Worker Memory State...');
  
  // Check current memory state
  try {
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
      
      if (memoryState.firstBlacklistItems?.length > 0) {
        console.log('  First blacklist items:', memoryState.firstBlacklistItems);
      }
      if (memoryState.firstWhitelistItems?.length > 0) {
        console.log('  First whitelist items:', memoryState.firstWhitelistItems);
      }
    } else {
      console.log('  No memory state available');
    }
  } catch (error) {
    console.error('❌ Error checking memory state:', error);
  }
  
  console.log('\n4. 🚀 Forcing Service Worker Reinitialization...');
  
  try {
    await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ message: 'reinitialize' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
    
    console.log('✅ Reinitialization request sent');
    
    // Wait for reinitialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n5. 🔍 Checking Memory State After Reinit...');
    
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
    }
    
  } catch (error) {
    console.error('❌ Error during reinitialization:', error);
  }
  
  console.log('\n6. 🎯 Testing URL Blocking with Service Worker Memory...');
  
  // Test with service worker's current memory state
  for (const url of testUrls.slice(0, 4)) {
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
      
      const result = response?.response?.blocked ? 'BLOCKED' : 'ALLOWED';
      console.log(`  ${url}: ${result} (from service worker memory)`);
      
    } catch (error) {
      console.error(`  ${url}: Error -`, error);
    }
  }
  
  console.log('\n🎯 Test Complete!');
  
  // Summary
  const hasStorageData = (syncData.blacklist?.length || 0) > 0 || (syncData.whitelist?.length || 0) > 0;
  
  console.log('\n📊 Summary:');
  console.log(`  Storage has data: ${hasStorageData ? '✅ YES' : '❌ NO'}`);
  console.log(`  Pattern function test: Use testUrl message handler results above`);
  console.log(`  Service worker memory: Check memory state results above`);
  
  if (hasStorageData) {
    console.log('\n💡 Key Points:');
    console.log('  - testUrl messages use pattern function directly with provided data');
    console.log('  - isUrlStillBlocked messages use service worker\'s current memory state');
    console.log('  - If testUrl works but isUrlStillBlocked doesn\'t, memory loading is the issue');
  }
}

// Make function available globally
window.testPatternFunctionDirectly = testPatternFunctionDirectly;

// Run the test
testPatternFunctionDirectly();
