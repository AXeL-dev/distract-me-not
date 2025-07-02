// Direct console script to manually load storage data into service worker
console.log('🔧 Manual Storage Loading Test');

// This script will manually execute the storage loading logic step by step
// and show exactly what happens at each stage

async function manualStorageLoad() {
  console.log('\n1. 📦 Reading Storage Directly...');
  
  // Read sync storage
  const syncResult = await new Promise((resolve) => {
    chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords', 'mode'], resolve);
  });
  
  console.log('Raw sync storage result:', syncResult);
  console.log('Blacklist type:', typeof syncResult.blacklist, 'Length:', syncResult.blacklist?.length);
  console.log('Whitelist type:', typeof syncResult.whitelist, 'Length:', syncResult.whitelist?.length);
  console.log('First blacklist items:', syncResult.blacklist?.slice(0, 3));
  console.log('First whitelist items:', syncResult.whitelist?.slice(0, 3));
  
  console.log('\n2. 🧠 Checking Current Service Worker Memory...');
  
  const memoryState = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ message: 'getCurrentMemoryState' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
  
  console.log('Current memory state:', memoryState?.response);
  
  console.log('\n3. 🎯 Testing Pattern Function with Storage Data...');
  
  // Test the pattern function with actual storage data
  const testUrl = 'https://reddit.com/r/funny';
  
  const testResult = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      message: 'testUrl',
      url: testUrl,
      blacklist: syncResult.blacklist || [],
      whitelist: syncResult.whitelist || [],
      blacklistKeywords: syncResult.blacklistKeywords || [],
      whitelistKeywords: syncResult.whitelistKeywords || []
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
  
  console.log(`Pattern function test for ${testUrl}:`, testResult?.response);
  
  console.log('\n4. 🔄 Forcing Reinitialization...');
  
  const reinitResult = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ message: 'reinitialize' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
  
  console.log('Reinit result:', reinitResult);
  
  // Wait for init to complete
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n5. 🧠 Checking Memory After Reinit...');
  
  const newMemoryState = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ message: 'getCurrentMemoryState' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
  
  console.log('Memory state after reinit:', newMemoryState?.response);
  
  console.log('\n6. 🧪 Testing Service Worker Memory Function...');
  
  const swTestResult = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      message: 'isUrlStillBlocked',
      params: [testUrl]
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
  
  console.log(`Service worker memory test for ${testUrl}:`, swTestResult?.response);
  
  console.log('\n📊 Analysis:');
  
  const hasStorageData = (syncResult.blacklist?.length || 0) > 0 || (syncResult.whitelist?.length || 0) > 0;
  const hasMemoryDataBefore = (memoryState?.response?.blacklistCount || 0) > 0 || (memoryState?.response?.whitelistCount || 0) > 0;
  const hasMemoryDataAfter = (newMemoryState?.response?.blacklistCount || 0) > 0 || (newMemoryState?.response?.whitelistCount || 0) > 0;
  
  console.log(`Storage has data: ${hasStorageData ? '✅' : '❌'}`);
  console.log(`Memory had data before reinit: ${hasMemoryDataBefore ? '✅' : '❌'}`);
  console.log(`Memory has data after reinit: ${hasMemoryDataAfter ? '✅' : '❌'}`);
  console.log(`Pattern function works with storage data: ${testResult?.response?.result === 'BLOCKED' ? '✅' : '❌'}`);
  console.log(`Service worker memory function works: ${swTestResult?.response?.blocked ? '✅' : '❌'}`);
  
  if (hasStorageData && !hasMemoryDataAfter) {
    console.log('\n⚠️ ISSUE: Storage has data but service worker memory is still empty after reinit!');
    console.log('This indicates the init() function is not properly loading from storage.');
    
    console.log('\n🔧 Suggested fixes:');
    console.log('1. Check if the storage keys match exactly (blacklist, whitelist, etc.)');
    console.log('2. Verify the init() function is completing without errors');
    console.log('3. Check if there are multiple init() functions conflicting');
    console.log('4. Verify the service worker is using the updated code');
  } else if (hasStorageData && hasMemoryDataAfter) {
    console.log('\n✅ SUCCESS: Storage data is properly loaded into service worker memory!');
  }
}

// Make function available globally
window.manualStorageLoad = manualStorageLoad;

// Run the test
manualStorageLoad();
