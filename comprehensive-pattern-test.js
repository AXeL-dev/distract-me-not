/**
 * Comprehensive Pattern Matching Test Suite for Distract Me Not Extension
 * 
 * This file contains all test cases for pattern matching, including:
 * - Basic domain patterns
 * - Domain with path patterns
 * - Subdomain wildcards
 * - Path wildcards
 * - Reddit specific tests
 * - Other specific cases like redgifs
 * - URL normalization and case sensitivity
 * - Trailing slash handling
 * - Allowlist/denylist precedence
 */

// Load the service worker patterns implementation
const fs = require('fs');
eval(fs.readFileSync('./public/service-worker-patterns.js', 'utf8'));

// Test function for pattern matching - now uses service worker implementation
function testPatternMatch(url, pattern, expectedMatch = true) {
  try {
    // Use the service worker's matchesPattern function
    const isMatch = matchesPattern(pattern, url);
    const result = isMatch === expectedMatch ? "✓ PASS" : "✗ FAIL";
    
    console.log(`Testing URL: "${url}" against pattern: "${pattern}"`);
    console.log(`Result: ${isMatch ? 'MATCH' : 'NO MATCH'} - ${result}`);
    console.log('---');
    
    return isMatch === expectedMatch;
  } catch (e) {
    console.log(`Testing URL: "${url}" against pattern: "${pattern}"`);
    console.log(`ERROR: Failed to test pattern - ${e.message}`);
    console.log(`Result: ERROR - ✗ FAIL`);
    console.log('---');
    return false;
  }
}

// Test function for allow/deny list logic - now uses service worker implementation
function testAllowDenyLogic(testName, url, allowList, denyList, expectedBlocked) {
  console.log(`\n==== TEST CASE: ${testName} ====`);
  console.log(`URL: ${url}`);
  console.log(`Allow List: ${JSON.stringify(allowList)}`);
  console.log(`Deny List: ${JSON.stringify(denyList)}`);
  
  // Use the service worker's checkUrlShouldBeBlocked function
  const blocked = checkUrlShouldBeBlocked(url, allowList, denyList);
  const result = { blocked: blocked };
  const passed = result.blocked === expectedBlocked;
  
  console.log(`Expected: ${expectedBlocked ? 'BLOCKED' : 'ALLOWED'}`);
  console.log(`Actual: ${result.blocked ? 'BLOCKED' : 'ALLOWED'}`);
  console.log(`Result: ${passed ? '✓ PASS' : '✗ FAIL'}`);
  console.log('---');
  
  return passed;
}

// Run all pattern matching tests
function runPatternTests() {
  console.log('\n====== PATTERN MATCHING TESTS ======\n');
  let passed = 0;
  let total = 0;
  
  function runTest(url, pattern, expectedMatch = true) {
    total++;
    if (testPatternMatch(url, pattern, expectedMatch)) {
      passed++;
    }
  }
  
  // Basic domain tests
  console.log('\n=== BASIC DOMAIN TESTS ===');
  runTest('https://reddit.com', 'reddit.com');
  runTest('http://reddit.com', 'reddit.com');
  runTest('reddit.com', 'reddit.com');
  runTest('REDDIT.COM', 'reddit.com'); // Case insensitive
  runTest('notreddit.com', 'reddit.com', false); // Should not match
  
  // Subdomain tests
  console.log('\n=== SUBDOMAIN TESTS ===');
  runTest('https://www.reddit.com', 'reddit.com');
  runTest('https://old.reddit.com', 'reddit.com');
  runTest('https://sub.domain.reddit.com', 'reddit.com');
  runTest('https://reddit.com.evil.com', 'reddit.com', false); // Should not match
  
  // Path tests
  console.log('\n=== PATH TESTS ===');
  runTest('https://reddit.com/r/news', 'reddit.com');
  runTest('https://reddit.com/r/pics/comments/123', 'reddit.com');
  runTest('https://reddit.com/r/', 'reddit.com');
  
  // Domain with path wildcard tests
  console.log('\n=== DOMAIN WITH PATH WILDCARD TESTS ===');
  runTest('https://reddit.com/r/news', 'reddit.com/r/*');
  runTest('https://reddit.com/r/pics/comments/123', 'reddit.com/r/*');
  runTest('https://reddit.com/r/', 'reddit.com/r/*');
  runTest('https://reddit.com/', 'reddit.com/r/*', false); // Should not match
  runTest('https://reddit.com/user', 'reddit.com/r/*', false); // Should not match
  
  // Specific path tests
  console.log('\n=== SPECIFIC PATH TESTS ===');
  runTest('https://reddit.com/r/news', 'reddit.com/r/news');
  runTest('https://reddit.com/r/news/', 'reddit.com/r/news');
  runTest('https://reddit.com/r/news/comments/123', 'reddit.com/r/news/*');
  runTest('https://reddit.com/r/pics', 'reddit.com/r/news', false); // Should not match
  
  // Subdomain wildcard tests
  console.log('\n=== SUBDOMAIN WILDCARD TESTS ===');
  runTest('https://sub.reddit.com', '*.reddit.com');
  runTest('https://www.reddit.com', '*.reddit.com');
  runTest('https://sub.sub.reddit.com', '*.reddit.com');
  runTest('https://reddit.com', '*.reddit.com', false); // Should not match
  runTest('https://xyzreddit.com', '*.reddit.com', false); // Should not match
    // Complex subdomain and path wildcards
  console.log('\n=== COMPLEX WILDCARD TESTS ===');
  runTest('https://sub.redgifs.com/watch/video123', 'https://*.redgifs.com/*');
  runTest('https://thumbs.redgifs.com/img/123.jpg', 'https://*.redgifs.com/*');
  runTest('https://redgifs.com/watch/video123', 'https://*.redgifs.com/*', false); // Should not match
  // Using different pattern for reddit subdomain tests to avoid regex errors
  runTest('https://sub.reddit.com/r/news', '*.reddit.com');
  runTest('https://sub.reddit.com/r/news', 'sub.reddit.com/r/*');
  
  // Trailing slash tests
  console.log('\n=== TRAILING SLASH TESTS ===');
  runTest('https://reddit.com', 'reddit.com/');
  runTest('https://reddit.com/', 'reddit.com/');
  runTest('https://reddit.com/r/', 'reddit.com/', false); // Should not match
  runTest('https://reddit.com', 'reddit.com');
  runTest('https://reddit.com/', 'reddit.com');
  
  // Exact matches
  console.log('\n=== EXACT MATCH TESTS ===');
  runTest('https://reddit.com/r/news', 'https://reddit.com/r/news');
  runTest('reddit.com/r/news', 'reddit.com/r/news');
  runTest('https://www.reddit.com/r/news', 'https://reddit.com/r/news', false); // Should not match
  
  console.log(`\nPATTERN TESTS SUMMARY: ${passed}/${total} tests passed`);
  return { passed, total };
}

// Run all allow/deny logic tests
function runAllowDenyTests() {
  console.log('\n====== ALLOW/DENY LOGIC TESTS ======\n');
  let passed = 0;
  let total = 0;
  
  function runTest(testName, url, allowList, denyList, expectedBlocked) {
    total++;
    if (testAllowDenyLogic(testName, url, allowList, denyList, expectedBlocked)) {
      passed++;
    }
  }
  
  // Basic allow/deny tests
  runTest(
    'Basic deny list test',
    'https://reddit.com',
    [],
    ['reddit.com'],
    true
  );
  
  runTest(
    'Basic allow list override test',
    'https://reddit.com',
    ['reddit.com'],
    ['reddit.com'],
    false
  );
  
  runTest(
    'Domain without matching pattern',
    'https://example.com',
    ['reddit.com'],
    ['facebook.com'],
    false
  );
  
  // Reddit subreddit tests
  runTest(
    'Block all of Reddit except specific subreddit',
    'https://reddit.com/r/news',
    ['reddit.com/r/askscience/*'],
    ['reddit.com'],
    true
  );
  
  runTest(
    'Allow specific subreddit while blocking all of Reddit',
    'https://reddit.com/r/askscience',
    ['reddit.com/r/askscience/*'],
    ['reddit.com'],
    false
  );
  
  runTest(
    'Block all subreddits except specific one',
    'https://reddit.com/r/news',
    ['reddit.com/r/askscience/*'],
    ['reddit.com/r/*'],
    true
  );
  
  runTest(
    'Allow specific subreddit in block all subreddits rule',
    'https://reddit.com/r/askscience',
    ['reddit.com/r/askscience/*'],
    ['reddit.com/r/*'],
    false
  );
  
  // Redgifs subdomain tests
  runTest(
    'Block all redgifs subdomains',
    'https://thumbs.redgifs.com/something',
    [],
    ['https://*.redgifs.com/*'],
    true
  );
  
  runTest(
    'Block all redgifs subdomains but allow main domain',
    'https://redgifs.com/watch',
    ['redgifs.com/*'],
    ['https://*.redgifs.com/*'],
    false
  );
  
  // Cross-domain matching tests
  runTest(
    'Specific allow pattern should not allow different domain with same path',
    'https://www.reddit.com/r/cars/',
    ['https://*.reddit.com/r/hoggit/*'],
    ['reddit.com/r/*'],
    true // Should still be blocked
  );
  
  runTest(
    'Correct domain and path should be allowed',
    'https://www.reddit.com/r/hoggit/comments',
    ['https://*.reddit.com/r/hoggit/*'],
    ['reddit.com/r/*'],
    false // Should be allowed
  );
  
  console.log(`\nALLOW/DENY TESTS SUMMARY: ${passed}/${total} tests passed`);
  return { passed, total };
}

// Run complex real-world test cases
function runRealWorldTests() {
  console.log('\n====== REAL-WORLD TEST SCENARIOS ======\n');
  let passed = 0;
  let total = 0;
  
  function runTest(testName, url, allowList, denyList, expectedBlocked) {
    total++;
    if (testAllowDenyLogic(testName, url, allowList, denyList, expectedBlocked)) {
      passed++;
    }
  }
  
  // Reddit setup: Block all of reddit.com, but allow specific subreddits
  const redditAllowList = [
    'reddit.com/r/programming/*',
    'reddit.com/r/science/*',
    'reddit.com/r/askscience/*'
  ];
  const redditDenyList = [
    'reddit.com'
  ];
  
  runTest(
    'Reddit homepage should be blocked',
    'https://www.reddit.com',
    redditAllowList,
    redditDenyList,
    true
  );
  
  runTest(
    'Blocked subreddit should be blocked',
    'https://www.reddit.com/r/news',
    redditAllowList,
    redditDenyList,
    true
  );
  
  runTest(
    'Allowed subreddit should be allowed',
    'https://www.reddit.com/r/programming',
    redditAllowList,
    redditDenyList,
    false
  );
  
  runTest(
    'Allowed subreddit with deep path should be allowed',
    'https://www.reddit.com/r/science/comments/abc123/post_title',
    redditAllowList,
    redditDenyList,
    false
  );
  
  // Social media setup: Block all social media except specific work-related accounts
  const socialAllowList = [
    'twitter.com/NASA/*',
    'facebook.com/groups/workgroup/*',
    'linkedin.com/*'
  ];
  const socialDenyList = [
    'twitter.com',
    'facebook.com',
    'instagram.com'
  ];
  
  runTest(
    'Twitter homepage should be blocked',
    'https://twitter.com',
    socialAllowList,
    socialDenyList,
    true
  );
  
  runTest(
    'Allowed Twitter account should be allowed',
    'https://twitter.com/NASA',
    socialAllowList,
    socialDenyList,
    false
  );
  
  runTest(
    'Random Twitter account should be blocked',
    'https://twitter.com/randomuser',
    socialAllowList,
    socialDenyList,
    true
  );
  
  runTest(
    'LinkedIn should be allowed entirely',
    'https://linkedin.com/in/profile',
    socialAllowList,
    socialDenyList,
    false
  );
  
  console.log(`\nREAL-WORLD TESTS SUMMARY: ${passed}/${total} tests passed`);
  return { passed, total };
}

// Main function to run all tests
function main() {
  console.log('===========================================');
  console.log('DISTRACT ME NOT - COMPREHENSIVE TEST SUITE');
  console.log('===========================================\n');
  
  const patternTests = runPatternTests();
  const allowDenyTests = runAllowDenyTests();
  const realWorldTests = runRealWorldTests();
  
  const totalPassed = patternTests.passed + allowDenyTests.passed + realWorldTests.passed;
  const totalTests = patternTests.total + allowDenyTests.total + realWorldTests.total;
  
  console.log('\n===========================================');
  console.log('FINAL TEST SUMMARY');
  console.log('===========================================');
  console.log(`Pattern Tests: ${patternTests.passed}/${patternTests.total} passed`);
  console.log(`Allow/Deny Tests: ${allowDenyTests.passed}/${allowDenyTests.total} passed`);
  console.log(`Real-world Tests: ${realWorldTests.passed}/${realWorldTests.total} passed`);
  console.log(`OVERALL: ${totalPassed}/${totalTests} tests passed (${Math.round(totalPassed/totalTests*100)}%)`);
  console.log('===========================================');
}

// Run all tests
main();
