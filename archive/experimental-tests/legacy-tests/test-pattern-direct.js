// TEST PATTERN FUNCTION DIRECTLY - Copy into service worker console

console.log('=== TESTING PATTERN FUNCTION DIRECTLY ===');

// We know the global variables now have data: blacklist.length: 11, whitelist.length: 227
console.log('Current global variables:');
console.log('- blacklist length:', blacklist ? blacklist.length : 'undefined');
console.log('- whitelist length:', whitelist ? whitelist.length : 'undefined');

if (blacklist && blacklist.length > 0) {
  // Convert to the format expected by the pattern function
  const allowPatterns = whitelist.map(site => typeof site === 'string' ? site : site.pattern || site.url).filter(Boolean);
  const denyPatterns = blacklist.map(site => typeof site === 'string' ? site : site.pattern || site.url).filter(Boolean);
  
  console.log('Converted patterns:');
  console.log('- denyPatterns length:', denyPatterns.length);
  console.log('- allowPatterns length:', allowPatterns.length);
  console.log('- First few deny patterns:', denyPatterns.slice(0, 3));
  
  // Test the pattern function directly
  if (typeof self.checkUrlShouldBeBlocked === 'function') {
    console.log('\nTesting pattern function directly:');
    const testUrl = 'https://www.reddit.com/test';
    console.log('Test URL:', testUrl);
    
    const result = self.checkUrlShouldBeBlocked(testUrl, allowPatterns, denyPatterns);
    console.log('Direct pattern function result:', result);
    
    // Also test with a known pattern from the blacklist
    if (denyPatterns.includes('https://www.reddit.com/*')) {
      console.log('\n✅ Found reddit pattern in blacklist');
      const redditResult = self.checkUrlShouldBeBlocked('https://www.reddit.com/', allowPatterns, denyPatterns);
      console.log('Reddit homepage blocking result:', redditResult);
    } else {
      console.log('❌ Reddit pattern not found in converted deny patterns');
      console.log('Full deny patterns:', denyPatterns);
    }
  } else {
    console.log('❌ self.checkUrlShouldBeBlocked function not available');
  }
} else {
  console.log('❌ Global variables are empty - run debugInit() first');
}
