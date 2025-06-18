// Test script to verify the service worker init fix
// Run this in the browser console to test the initialization

console.log('Testing service worker initialization fix...');

// Test if syncSettings and localSettings are properly defined
console.log('syncSettings:', typeof syncSettings !== 'undefined' ? syncSettings : 'UNDEFINED');
console.log('localSettings:', typeof localSettings !== 'undefined' ? localSettings : 'UNDEFINED');

// Test storage operations
async function testStorageOperations() {
  try {
    console.log('Testing sync storage access...');
    const syncResult = await chrome.storage.sync.get(['blacklist', 'whitelist']);
    console.log('Sync storage test result:', syncResult);
    
    console.log('Testing local storage access...');
    const localResult = await chrome.storage.local.get(['isEnabled', 'timer']);
    console.log('Local storage test result:', localResult);
    
    console.log('Storage operations test PASSED');
    return true;
  } catch (error) {
    console.error('Storage operations test FAILED:', error);
    return false;
  }
}

// Test the in operator
function testInOperator() {
  try {
    const testObject = { blacklist: [], whitelist: [] };
    const hasBlacklist = 'blacklist' in testObject;
    console.log('In operator test result:', hasBlacklist);
    console.log('In operator test PASSED');
    return true;
  } catch (error) {
    console.error('In operator test FAILED:', error);
    return false;
  }
}

// Run tests
testInOperator();
testStorageOperations();

console.log('Test script completed');
