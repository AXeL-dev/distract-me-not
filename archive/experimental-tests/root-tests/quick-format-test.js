// Quick test to verify blocking reason format
// Run this in service worker console:

console.log('🧪 Testing blocking reason format...');

// Test the pattern function directly
if (typeof self.checkUrlShouldBeBlocked === 'function') {
  const result = self.checkUrlShouldBeBlocked(
    'https://reddit.com/r/funny',
    [], // no allow patterns  
    ['reddit.com/*'] // deny pattern
  );
  
  console.log('Test result:', result);
  console.log('Expected format: "pattern: reddit.com/*"');
  console.log('Actual reason:', result?.reason);
  console.log('Format correct:', result?.reason === 'pattern: reddit.com/*');
  
  // Test how UI would parse this
  if (result?.reason && result.reason.includes('pattern:')) {
    const parts = result.reason.split('pattern:');
    if (parts.length >= 2) {
      console.log('UI would show: "Deny List Pattern: ' + parts[1].trim() + '"');
    }
  }
} else {
  console.log('Pattern function not available');
}

console.log('✅ Format test complete');
