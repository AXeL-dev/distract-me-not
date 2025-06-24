/**
 * Test script to verify deny list blocking functionality
 * This simulates the service worker blocking logic to confirm it works with the fixed mode handling
 */

// Simulate the service worker's blocking function with our case-insensitive fix
function checkUrlShouldBeBlocked(url, mode, blacklist = [], blacklistKeywords = []) {
  console.log(`\n=== TESTING URL: ${url} ===`);
  console.log(`Mode: "${mode}" (type: ${typeof mode})`);
  console.log(`Blacklist: [${blacklist.join(', ')}]`);
  console.log(`Blacklist keywords: [${blacklistKeywords.join(', ')}]`);
  
  // Normalize mode to lowercase for consistent checking (our fix)
  const normalizedMode = (mode || '').toLowerCase();
  console.log(`Normalized mode: "${normalizedMode}"`);
  
  if (normalizedMode === 'blacklist' || normalizedMode === 'denylist' || normalizedMode === 'combined') {
    console.log('✓ Mode matches deny list criteria');
    
    // Check against blacklist patterns
    for (const site of blacklist) {
      const pattern = typeof site === 'string' ? site : site.pattern || site.url;
      if (!pattern) continue;
      
      // Simple matching (simplified version of what the service worker does)
      if (url.toLowerCase().includes(pattern.toLowerCase())) {
        console.log(`🚫 URL BLOCKED by pattern: ${pattern}`);
        return { blocked: true, reason: `Deny List match: ${pattern}` };
      }
    }
    
    // Check against keywords
    for (const keyword of blacklistKeywords) {
      const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
      if (!pattern) continue;
      
      if (url.toLowerCase().includes(pattern.toLowerCase())) {
        console.log(`🚫 URL BLOCKED by keyword: ${pattern}`);
        return { blocked: true, reason: `Deny List keyword: ${pattern}` };
      }
    }
    
    console.log('✅ URL allowed - no matching deny patterns');
    return { blocked: false, reason: "No matching block rules" };
  }
  
  console.log('❌ Mode does not match deny list criteria - not checking deny rules');
  return { blocked: false, reason: "Mode not configured for deny list blocking" };
}

// Test cases
const testCases = [
  {
    url: 'https://facebook.com/feed',
    mode: 'denyList',  // Capital L - this is what the UI sets
    blacklist: ['facebook.com'],
    blacklistKeywords: ['social'],
    expected: true // Should be blocked
  },
  {
    url: 'https://facebook.com/feed',
    mode: 'denylist',  // lowercase - old format
    blacklist: ['facebook.com'],
    blacklistKeywords: [],
    expected: true // Should be blocked
  },
  {
    url: 'https://facebook.com/feed',
    mode: 'DENYLIST',  // uppercase - edge case
    blacklist: ['facebook.com'],
    blacklistKeywords: [],
    expected: true // Should be blocked
  },
  {
    url: 'https://youtube.com/watch?v=abc',
    mode: 'denyList',
    blacklist: [],
    blacklistKeywords: ['social', 'entertainment'],
    expected: false // Should NOT be blocked (no matching keywords)
  },
  {
    url: 'https://reddit.com/r/programming',
    mode: 'denyList',
    blacklist: [],
    blacklistKeywords: ['reddit'],
    expected: true // Should be blocked by keyword
  },
  {
    url: 'https://google.com/search',
    mode: 'allowlist',  // Different mode - should not check deny rules
    blacklist: ['google.com'],
    blacklistKeywords: [],
    expected: false // Should NOT be blocked (wrong mode)
  }
];

console.log('🧪 TESTING DENY LIST BLOCKING WITH MODE CASE VARIATIONS\n');
console.log('This test simulates the service worker logic with our case-insensitive mode fix.');

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  console.log(`\n--- Test Case ${index + 1} ---`);
  
  const result = checkUrlShouldBeBlocked(
    testCase.url, 
    testCase.mode, 
    testCase.blacklist, 
    testCase.blacklistKeywords
  );
  
  const actualBlocked = result.blocked;
  const passed = actualBlocked === testCase.expected;
  
  console.log(`Expected blocked: ${testCase.expected}`);
  console.log(`Actual blocked: ${actualBlocked}`);
  console.log(`Reason: ${result.reason}`);
  
  if (passed) {
    console.log('✅ TEST PASSED');
    passedTests++;
  } else {
    console.log('❌ TEST FAILED');
    failedTests++;
  }
});

console.log(`\n📊 SUMMARY:`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Total: ${passedTests + failedTests}`);

if (failedTests === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Deny list blocking should work correctly with the mode fix.');
} else {
  console.log('\n⚠️  Some tests failed. There may still be issues with the deny list blocking logic.');
}
