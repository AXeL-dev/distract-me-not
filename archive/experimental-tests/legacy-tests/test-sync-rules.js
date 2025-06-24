/**
 * Test Script for Verifying Cross-Device Synchronization
 * 
 * This script performs a series of tests to verify that rule synchronization
 * is working correctly across devices. It simulates changes to sync storage
 * and verifies that the service worker correctly processes these changes.
 */

// Mock console logging for cleaner output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && message.includes('[DMN')) {
    originalConsoleLog(...args);
  }
};

console.error = (...args) => {
  originalConsoleError(...args);
};

// Function to simulate changes from another device
async function simulateSyncChanges() {
  console.log('=== TESTING SYNC FUNCTIONALITY ===');
  
  try {    // 1. Get current rules to check against later
    console.log('1. Getting current rule state...');
    // Using 'blacklist' as the storage key for backward compatibility, but referring to it as 'deny list'
    const initialDenyList = await chrome.storage.sync.get('blacklist');
    console.log(`Initial deny list has ${initialDenyList.blacklist ? initialDenyList.blacklist.length : 0} entries`);
    
    // 2. Add a test site to the deny list in sync storage
    console.log('2. Adding test site to deny list in sync storage...');
    const testSite = 'sync-test-' + Date.now() + '.example.com';
    
    // Get current deny list (using legacy storage key 'blacklist')
    const currentDenyList = initialDenyList.blacklist || [];
    const newDenyList = [...currentDenyList, testSite];
    
    // Update sync storage directly (simulating change from another device)
    await chrome.storage.sync.set({ blacklist: newDenyList });
    console.log(`Added test site "${testSite}" to deny list`);
    
    // 3. Wait a moment for the storage change event to be processed
    console.log('3. Waiting for storage change event to be processed...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. Test if the site is blocked (should call the service worker)
    console.log('4. Testing if site is blocked by service worker...');
    
    // This requires manual verification in the service worker logs
    console.log(`To verify: Check if "${testSite}" appears in the service worker's storage change handler log`);
    console.log('Look for: "Deny list updated from sync storage:" log entry');
    
    // 5. Check the in-memory lists via messaging API
    console.log('5. Checking in-memory lists via messaging API...');
    
    // Send a message to the service worker to check its state
    chrome.runtime.sendMessage({ message: 'getCurrentSettings' }, response => {
      if (response && response.response) {
        const settings = response.response;
        const inMemoryDenyList = settings.blacklist || [];
        const isDenied = inMemoryDenyList.includes(testSite);
        
        console.log(`In-memory deny list contains ${inMemoryDenyList.length} entries`);
        console.log(`Test site "${testSite}" ${isDenied ? 'IS' : 'IS NOT'} in the in-memory deny list`);
        
        if (isDenied) {
          console.log('✅ SUCCESS: Sync change was properly detected and processed by the service worker');
        } else {
          console.log('❌ FAILURE: Sync change was NOT detected by the service worker');
          console.log('Possible issues:');
          console.log('- Storage change listener might not be set up correctly');
          console.log('- Service worker might not be updating in-memory lists');
        }
      } else {
        console.log('❌ ERROR: Failed to get service worker settings');
      }
      
      // 6. Clean up by removing the test entry
      console.log('6. Cleaning up test data...');
      chrome.storage.sync.get('blacklist').then(result => {
        const cleanList = (result.blacklist || []).filter(site => site !== testSite);
        chrome.storage.sync.set({ blacklist: cleanList }).then(() => {
          console.log(`Removed test site "${testSite}" from deny list`);
          console.log('=== SYNC TEST COMPLETE ===');
        });
      });
    });
  } catch (error) {
    console.error('Error during sync test:', error);
  }
}

// Run the test
simulateSyncChanges();
