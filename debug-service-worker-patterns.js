// Debug service worker patterns
console.log('=== DEBUG SERVICE WORKER PATTERNS ===');

// Test if we can access the pattern matching function
if (typeof self !== 'undefined' && self.checkUrlShouldBeBlocked) {
  console.log('✓ self.checkUrlShouldBeBlocked is available');
  
  // Test with a simple case
  const testUrl = 'https://www.reddit.com/r/cars/';
  const denyPatterns = ['reddit.com/*'];
  const allowPatterns = [];
  
  console.log('\nTesting with:');
  console.log('URL:', testUrl);
  console.log('Deny patterns:', denyPatterns);
  console.log('Allow patterns:', allowPatterns);
  
  const result = self.checkUrlShouldBeBlocked(testUrl, allowPatterns, denyPatterns);
  console.log('Result (should be blocked):', result);
  
} else {
  console.log('✗ self.checkUrlShouldBeBlocked is NOT available');
}

// Also test individual functions
console.log('\nAvailable functions:');
console.log('- parseUrlOrPattern:', typeof self.parseUrlOrPattern);
console.log('- matchesPattern:', typeof self.matchesPattern);
console.log('- checkUrlShouldBeBlocked:', typeof self.checkUrlShouldBeBlocked);
