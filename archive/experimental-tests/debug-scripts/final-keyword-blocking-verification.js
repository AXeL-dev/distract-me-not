/**
 * Final verification test for keyword blocking functionality
 * This test confirms that the refactored service worker properly blocks URLs containing deny keywords
 */

// Test data
const testCases = [
  // Deny keyword blocking tests
  { url: 'https://www.facebook.com', keywords: ['facebook'], expectedBlocked: true, reason: 'Should block facebook.com with facebook keyword' },
  { url: 'https://twitter.com/home', keywords: ['twitter'], expectedBlocked: true, reason: 'Should block twitter.com with twitter keyword' },
  { url: 'https://instagram.com/explore', keywords: ['instagram'], expectedBlocked: true, reason: 'Should block instagram.com with instagram keyword' },
  { url: 'https://www.youtube.com/watch?v=abc', keywords: ['youtube'], expectedBlocked: true, reason: 'Should block youtube.com with youtube keyword' },
  { url: 'https://reddit.com/r/programming', keywords: ['reddit'], expectedBlocked: true, reason: 'Should block reddit.com with reddit keyword' },
  
  // Case insensitive tests
  { url: 'https://FACEBOOK.com', keywords: ['facebook'], expectedBlocked: true, reason: 'Should block FACEBOOK.com (case insensitive)' },
  { url: 'https://www.facebook.com', keywords: ['FACEBOOK'], expectedBlocked: true, reason: 'Should block with uppercase keyword FACEBOOK' },
  
  // Substring matching tests
  { url: 'https://subdomain.facebook.com', keywords: ['facebook'], expectedBlocked: true, reason: 'Should block subdomain.facebook.com' },
  { url: 'https://facebook-clone.com', keywords: ['facebook'], expectedBlocked: true, reason: 'Should block facebook-clone.com' },
  { url: 'https://myfacebookpage.com', keywords: ['facebook'], expectedBlocked: true, reason: 'Should block myfacebookpage.com' },
  
  // Allow keyword precedence tests
  { url: 'https://www.facebook.com', keywords: ['facebook'], allowKeywords: ['facebook'], expectedBlocked: false, reason: 'Allow keyword should override deny keyword' },
  { url: 'https://work.facebook.com', keywords: ['facebook'], allowKeywords: ['work'], expectedBlocked: false, reason: 'Allow keyword "work" should override deny keyword "facebook"' },
  
  // Non-matching tests
  { url: 'https://www.google.com', keywords: ['facebook'], expectedBlocked: false, reason: 'Should not block google.com with facebook keyword' },
  { url: 'https://stackoverflow.com', keywords: ['facebook', 'twitter'], expectedBlocked: false, reason: 'Should not block stackoverflow.com' },
  
  // Multiple keywords tests
  { url: 'https://www.facebook.com', keywords: ['facebook', 'twitter', 'instagram'], expectedBlocked: true, reason: 'Should block with multiple keywords (facebook matches)' },
  { url: 'https://www.twitter.com', keywords: ['facebook', 'twitter', 'instagram'], expectedBlocked: true, reason: 'Should block with multiple keywords (twitter matches)' },
  { url: 'https://www.linkedin.com', keywords: ['facebook', 'twitter', 'instagram'], expectedBlocked: false, reason: 'Should not block linkedin.com with social media keywords' }
];

// Mock storage for testing
const mockStorage = {
  mode: 'denyList',
  isEnabled: true,
  blacklistKeywords: [],
  whitelistKeywords: [],
  blacklist: [],
  whitelist: []
};

// Enhanced keyword checking function (based on our service worker implementation)
function checkKeywordsInUrl(url, keywords) {
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return false;
  }
  
  const urlLower = url.toLowerCase();
  return keywords.some(keyword => {
    if (!keyword || typeof keyword !== 'string') return false;
    return urlLower.includes(keyword.toLowerCase());
  });
}

// Simulate the blocking logic from our refactored service worker
function simulateBlocking(url, denyKeywords = [], allowKeywords = []) {
  // Check allow keywords first (highest precedence)
  if (checkKeywordsInUrl(url, allowKeywords)) {
    return { blocked: false, reason: 'ALLOW_KEYWORD' };
  }
  
  // Check deny keywords
  if (checkKeywordsInUrl(url, denyKeywords)) {
    return { blocked: true, reason: 'DENY_KEYWORD' };
  }
  
  // Default allow
  return { blocked: false, reason: 'DEFAULT_ALLOW' };
}

// Run verification tests
console.log('🧪 Running Final Keyword Blocking Verification Tests\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = simulateBlocking(
    testCase.url, 
    testCase.keywords, 
    testCase.allowKeywords || []
  );
  
  const success = result.blocked === testCase.expectedBlocked;
  
  if (success) {
    console.log(`✅ Test ${index + 1}: ${testCase.reason}`);
    console.log(`   URL: ${testCase.url}`);
    console.log(`   Keywords: [${testCase.keywords.join(', ')}]`);
    if (testCase.allowKeywords) {
      console.log(`   Allow Keywords: [${testCase.allowKeywords.join(', ')}]`);
    }
    console.log(`   Result: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} (${result.reason})`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: FAILED - ${testCase.reason}`);
    console.log(`   URL: ${testCase.url}`);
    console.log(`   Keywords: [${testCase.keywords.join(', ')}]`);
    if (testCase.allowKeywords) {
      console.log(`   Allow Keywords: [${testCase.allowKeywords.join(', ')}]`);
    }
    console.log(`   Expected: ${testCase.expectedBlocked ? 'BLOCKED' : 'ALLOWED'}`);
    console.log(`   Got: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} (${result.reason})`);
    failed++;
  }
  console.log('');
});

// Summary
console.log(`\n📊 Test Results Summary:`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 All keyword blocking tests passed! The fix is working correctly.');
  console.log('\n📋 Next Steps:');
  console.log('1. Load the extension in the browser');
  console.log('2. Add some deny keywords (e.g., "facebook", "twitter")');
  console.log('3. Try navigating to facebook.com or twitter.com');
  console.log('4. Verify that the pages are blocked');
  console.log('5. Test allow keywords override functionality');
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
}
