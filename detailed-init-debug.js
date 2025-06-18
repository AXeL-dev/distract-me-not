// DETAILED INIT DEBUG - Copy and paste into service worker console

console.log('=== DETAILED INIT DEBUGGING ===');

// First, let's test the exact storage call that init() makes
chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords', 'mode', 'framesType', 'message', 'redirectUrl', 'schedule'], (items) => {
  console.log('Raw storage result from init-style call:', items);
  console.log('Keys in items:', Object.keys(items));
  console.log('Blacklist from init-style call:', items.blacklist);
  console.log('Whitelist from init-style call:', items.whitelist);
  
  // Create the same safeItems object that init() creates
  const safeItems = {
    // Default values
    blacklist: [], 
    whitelist: [],  
    blacklistKeywords: [], 
    whitelistKeywords: [], 
    mode: 'combined',
    framesType: ['main_frame'],
    message: '',
    redirectUrl: '',
    schedule: { isEnabled: false, days: {} },
    
    // Override with any valid values from items
    ...items
  };
  
  console.log('safeItems after merge:', safeItems);
  console.log('safeItems blacklist:', safeItems.blacklist);
  console.log('safeItems whitelist:', safeItems.whitelist);
  
  // Test if the arrays are really arrays
  console.log('Is blacklist an array?', Array.isArray(safeItems.blacklist));
  console.log('Is whitelist an array?', Array.isArray(safeItems.whitelist));
  
  if (safeItems.blacklist && safeItems.blacklist.length > 0) {
    console.log('✅ Storage call in init style worked!');
  } else {
    console.log('❌ Storage call in init style failed - investigating...');
    
    // Let's try a different approach
    chrome.storage.sync.get(null, (allData) => {
      console.log('ALL storage data:', allData);
      console.log('All blacklist:', allData.blacklist);
      console.log('All whitelist:', allData.whitelist);
    });
  }
});
