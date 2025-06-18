// EMERGENCY FIX - Patch the service worker wrapper function directly

console.log('=== PATCHING SERVICE WORKER WRAPPER ===');

// Override the broken checkUrlShouldBeBlocked function with a working one
const originalCheckUrlShouldBeBlocked = checkUrlShouldBeBlocked;

function checkUrlShouldBeBlocked(url) {
  // Always allow internal browser pages
  if (url.startsWith('edge://') || url.startsWith('chrome://')) {
    console.log(`Allowing internal browser page: ${url}`);
    return { blocked: false, reason: "Internal browser page" };
  }

  // If not enabled, don't block anything
  if (!isEnabled) {
    return { blocked: false, reason: "Extension disabled" };
  }
  
  console.log(`Checking URL against rules: ${url}`);
  
  // Use the new pattern matching logic from service-worker-patterns.js
  if (self.checkUrlShouldBeBlocked && typeof self.checkUrlShouldBeBlocked === 'function') {
    // Convert our internal blacklist/whitelist to the format expected by the new function
    const allowPatterns = whitelist.map(site => typeof site === 'string' ? site : site.pattern || site.url).filter(Boolean);
    const denyPatterns = blacklist.map(site => typeof site === 'string' ? site : site.pattern || site.url).filter(Boolean);
    
    console.log(`✅ FIXED: Checking with ${denyPatterns.length} deny patterns and ${allowPatterns.length} allow patterns`);
    
    // Call the new pattern matching function
    const shouldBlock = self.checkUrlShouldBeBlocked(url, allowPatterns, denyPatterns);
    
    if (shouldBlock) {
      return { blocked: true, reason: "Matched deny pattern" };
    } else {
      return { blocked: false, reason: "No matching block rules or overridden by allow pattern" };
    }
  }
  
  // Fallback
  console.log('❌ Pattern function not available');
  return { blocked: false, reason: "Pattern function unavailable" };
}

console.log('✅ Service worker wrapper function patched!');

// Test the fix
console.log('\n=== TESTING PATCHED WRAPPER ===');
const testUrls = [
  'https://www.reddit.com/test',
  'https://www.reddit.com/',
  'https://www.reddit.com/r/programming',
  'https://www.reddit.com/r/news'
];

testUrls.forEach(url => {
  console.log(`\nTesting: ${url}`);
  const result = checkUrlShouldBeBlocked(url);
  console.log(`  Result: ${result.blocked ? 'BLOCKED' : 'ALLOWED'}`);
  console.log(`  Reason: ${result.reason}`);
});

console.log('\n🎯 NOW TEST LIVE NAVIGATION:');
console.log('1. Navigate to https://www.reddit.com/r/news');
console.log('2. It should be BLOCKED');
console.log('3. Navigate to https://www.reddit.com/r/programming');  
console.log('4. It should be ALLOWED (if you have that in your whitelist)');
console.log('5. Navigate to https://google.com');
console.log('6. It should be ALLOWED');
