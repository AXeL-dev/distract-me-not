// Quick status check - paste this into service worker console first
console.log(`
🔍 QUICK STATUS CHECK
Storage: blacklist=${(await chrome.storage.sync.get(['blacklist'])).blacklist?.length || 0} items
Memory: blacklist=${typeof blacklist !== 'undefined' ? blacklist?.length || 0 : 'undefined'} items
Pattern function: ${typeof self.checkUrlShouldBeBlocked === 'function' ? 'available' : 'missing'}
`);

// Test if data exists in storage vs memory
chrome.storage.sync.get(['blacklist', 'whitelist'], (data) => {
  console.log('STORAGE:', {
    blacklist: data.blacklist?.length || 0,
    whitelist: data.whitelist?.length || 0
  });
});

console.log('MEMORY:', {
  blacklist: typeof blacklist !== 'undefined' ? blacklist?.length || 0 : 'undefined',
  whitelist: typeof whitelist !== 'undefined' ? whitelist?.length || 0 : 'undefined'
});
