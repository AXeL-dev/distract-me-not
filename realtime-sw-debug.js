// Debug script to check service worker initialization in real-time
console.log('🔍 Real-time Service Worker Storage Debug');

// Function to check current in-memory state
async function checkCurrentState() {
  console.log('\n📊 Current Service Worker State:');
  
  // Check if we can access the service worker's variables
  try {
    // Try to get the current state from the service worker context
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.active) {
      console.log('✅ Service worker is active');
      
      // Get current storage values
      const syncData = await new Promise((resolve) => {
        chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords'], resolve);
      });
      
      const localData = await new Promise((resolve) => {
        chrome.storage.local.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords'], resolve);
      });
      
      console.log('📦 Sync Storage Data:');
      console.log('  Blacklist:', syncData.blacklist?.length || 0, 'items');
      console.log('  Whitelist:', syncData.whitelist?.length || 0, 'items');
      console.log('  Blacklist Keywords:', syncData.blacklistKeywords?.length || 0, 'items');
      console.log('  Whitelist Keywords:', syncData.whitelistKeywords?.length || 0, 'items');
      
      console.log('🏠 Local Storage Data:');
      console.log('  Blacklist:', localData.blacklist?.length || 0, 'items');
      console.log('  Whitelist:', localData.whitelist?.length || 0, 'items');
      console.log('  Blacklist Keywords:', localData.blacklistKeywords?.length || 0, 'items');
      console.log('  Whitelist Keywords:', localData.whitelistKeywords?.length || 0, 'items');
      
      // Show first few items for verification
      if (syncData.blacklist?.length > 0) {
        console.log('🚫 First few sync blacklist items:', syncData.blacklist.slice(0, 5));
      }
      if (syncData.whitelist?.length > 0) {
        console.log('✅ First few sync whitelist items:', syncData.whitelist.slice(0, 5));
      }
      
    } else {
      console.log('❌ Service worker not active');
    }
  } catch (error) {
    console.error('❌ Error checking service worker state:', error);
  }
}

// Function to force service worker reinitialization
async function forceReinit() {
  console.log('\n🔄 Forcing Service Worker Reinitialization...');
  
  try {
    // Send a message to the service worker to reinitialize
    const response = await chrome.runtime.sendMessage({
      action: 'reinitialize'
    });
    console.log('📨 Reinitialize response:', response);
  } catch (error) {
    console.error('❌ Error sending reinitialize message:', error);
  }
}

// Function to test pattern matching with current data
async function testPatternMatching() {
  console.log('\n🧪 Testing Pattern Matching with Current Data...');
  
  // Get current data
  const syncData = await new Promise((resolve) => {
    chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords'], resolve);
  });
  
  // Test URLs
  const testUrls = [
    'https://reddit.com/',
    'https://reddit.com/r/funny',
    'https://www.reddit.com/r/programming',
    'https://old.reddit.com/r/javascript'
  ];
  
  console.log('🎯 Testing URLs with current storage data:');
  testUrls.forEach(url => {
    try {
      // Send message to service worker to test URL
      chrome.runtime.sendMessage({
        action: 'testUrl',
        url: url,
        blacklist: syncData.blacklist || [],
        whitelist: syncData.whitelist || [],
        blacklistKeywords: syncData.blacklistKeywords || [],
        whitelistKeywords: syncData.whitelistKeywords || []
      }, (response) => {
        console.log(`  ${url}: ${response?.result || 'No response'}`);
      });
    } catch (error) {
      console.error(`  ${url}: Error -`, error);
    }
  });
}

// Run initial check
checkCurrentState();

// Set up functions for manual testing
window.checkSWState = checkCurrentState;
window.forceReinit = forceReinit;
window.testPatternMatching = testPatternMatching;

console.log('\n🎮 Available functions:');
console.log('  checkSWState() - Check current state');
console.log('  forceReinit() - Force service worker reinit');
console.log('  testPatternMatching() - Test URLs with current data');
