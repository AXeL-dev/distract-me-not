// SIMPLE IMMEDIATE TEST - paste this into service worker console now
console.log('🔍 IMMEDIATE STATUS CHECK');

// Check sync storage with Promise wrapper
chrome.storage.sync.get(null, (syncData) => {
  console.log('📦 SYNC STORAGE RESULT:', syncData);
  console.log('📦 SYNC STORAGE KEYS:', Object.keys(syncData || {}));
  console.log('📦 Blacklist in sync:', syncData?.blacklist?.length || 0, 'items');
  console.log('📦 Whitelist in sync:', syncData?.whitelist?.length || 0, 'items');
  if (syncData?.blacklist?.length > 0) {
    console.log('📦 First sync blacklist items:', syncData.blacklist.slice(0, 3));
  }
});

// Check current memory
console.log('🧠 CURRENT MEMORY STATE:');
console.log('🧠 blacklist:', typeof blacklist, blacklist?.length || 'undefined');
console.log('🧠 whitelist:', typeof whitelist, whitelist?.length || 'undefined');
console.log('🧠 isEnabled:', isEnabled);
console.log('🧠 mode:', mode);

// Show first few memory items if they exist
if (typeof blacklist !== 'undefined' && blacklist?.length > 0) {
  console.log('🧠 First memory blacklist items:', blacklist.slice(0, 3));
}

// Test pattern function
if (typeof self.checkUrlShouldBeBlocked === 'function') {
  console.log('✅ Pattern function is available');
  const testResult = self.checkUrlShouldBeBlocked('https://reddit.com/r/funny', ['reddit.com/r/allowed'], ['reddit.com/*']);
  console.log('✅ Pattern test result (should be blocked):', testResult);
} else {
  console.log('❌ Pattern function not available');
}

console.log(`
🎯 NEXT STEPS:
1. If sync storage shows data but memory is empty: init() problem
2. If sync storage is empty: storage problem  
3. If pattern function works: core logic is fine
`);
