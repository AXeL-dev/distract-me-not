// Test script to verify the improved blocking reason messages
// Run this in the service worker console after reloading the extension

console.log('🧪 Testing improved blocking reasons...');

async function testBlockingReasons() {
  console.log('=== TESTING DETAILED BLOCKING REASONS ===');
  
  // First, ensure we have some test data loaded
  await forceLoadStorage();
    console.log('\nTesting various URLs with detailed reasons (new format):');
  
  const testUrls = [
    'https://reddit.com/',
    'https://reddit.com/r/funny',
    'https://www.reddit.com/r/programming', 
    'https://facebook.com/',
    'https://facebook.com/profile',
    'https://youtube.com/',
    'https://youtube.com/watch?v=test',
    'https://twitter.com/',
    'https://allowed-site.com/' // This should be allowed
  ];
  
  testUrls.forEach(url => {
    try {
      const result = checkUrlShouldBeBlockedLocal(url);
      console.log(`\n📍 ${url}:`);
      console.log(`   Status: ${result?.blocked ? '❌ BLOCKED' : '✅ ALLOWED'}`);
      console.log(`   Reason: ${result?.reason || 'No reason provided'}`);
      if (result?.matchedPattern) {
        console.log(`   Pattern: ${result.matchedPattern}`);
      }
      if (result?.specificity) {
        console.log(`   Specificity: ${result.specificity}`);
      }
      
      // Test how the Blocked component would format this
      if (result?.reason && result.reason.includes('pattern:')) {
        const parts = result.reason.split('pattern:');
        if (parts.length >= 2) {
          console.log(`   📺 UI Display: "Deny List Pattern: ${parts[1].trim()}"`);
        }
      }
    } catch (error) {
      console.error(`Error testing ${url}:`, error);
    }
  });
  
  console.log('\n=== TESTING PATTERN FUNCTION DIRECTLY ===');
  
  // Test the pattern function directly too
  if (typeof self.checkUrlShouldBeBlocked === 'function') {
    const testResult = self.checkUrlShouldBeBlocked(
      'https://reddit.com/r/funny',
      ['reddit.com/r/allowed'], // allow patterns
      ['reddit.com/*'] // deny patterns
    );
    
    console.log('Direct pattern function test:', testResult);
  } else {
    console.log('Pattern function not available');
  }
  
  console.log('\n✅ Blocking reason test complete!');
}

// Run the test
testBlockingReasons();
