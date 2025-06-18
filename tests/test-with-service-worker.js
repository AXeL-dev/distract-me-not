// Test using the service worker functions instead of the comprehensive test's own implementation
const fs = require('fs');

// Load the service worker patterns
eval(fs.readFileSync('./public/service-worker-patterns.js', 'utf8'));

// Override the problematic function with the service worker version
function testAllowDenyLogic(testName, url, allowList, denyList, expectedBlocked) {
  console.log(`\n==== TEST CASE: ${testName} ====`);
  console.log(`URL: ${url}`);
  console.log(`Allow List: ${JSON.stringify(allowList)}`);
  console.log(`Deny List: ${JSON.stringify(denyList)}`);
  
  // Use the service worker function directly
  const blocked = checkUrlShouldBeBlocked(url, allowList, denyList);
  const result = { blocked: blocked };
  const passed = result.blocked === expectedBlocked;
  
  console.log(`Expected: ${expectedBlocked ? 'BLOCKED' : 'ALLOWED'}`);
  console.log(`Actual: ${result.blocked ? 'BLOCKED' : 'ALLOWED'}`);
  console.log(`Result: ${passed ? '✓ PASS' : '✗ FAIL'}`);
  console.log('---');
  
  return passed;
}

console.log('=== TESTING THE FAILING CASE WITH SERVICE WORKER IMPLEMENTATION ===');

// Test the failing case
const passed = testAllowDenyLogic(
  'Specific allow pattern should not allow different domain with same path',
  'https://www.reddit.com/r/cars/',
  ['https://*.reddit.com/r/hoggit/*'],
  ['reddit.com/r/*'],
  true // Should be blocked
);

console.log(`\nTest ${passed ? 'PASSED' : 'FAILED'} with service worker implementation`);

// Test the passing case too to make sure it still works
const passed2 = testAllowDenyLogic(
  'Correct domain and path should be allowed',
  'https://www.reddit.com/r/hoggit/comments',
  ['https://*.reddit.com/r/hoggit/*'],
  ['reddit.com/r/*'],
  false // Should be allowed
);

console.log(`\nSecond test ${passed2 ? 'PASSED' : 'FAILED'} with service worker implementation`);

if (passed && passed2) {
  console.log('\n✅ BOTH TESTS PASS WITH SERVICE WORKER IMPLEMENTATION');
  console.log('The comprehensive test needs to be updated to use the service worker logic');
} else {
  console.log('\n❌ TESTS STILL FAILING - SERVICE WORKER IMPLEMENTATION NEEDS FIXING');
}
