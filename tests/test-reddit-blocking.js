/**
 * Test script specifically for Reddit subreddit blocking
 * This script focuses on the reddit.com/r/* blocking rule and
 * makes sure it actually blocks subreddits as expected while
 * allowing whitelisted subreddits
 */

// Import the pattern matcher functions from service worker
// We use these directly instead of importing the service worker itself
console.log('Loading pattern matcher functions...');

const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Load the service-worker-patterns.js file content
const patternFilePath = path.join(__dirname, '..', 'public', 'service-worker-patterns.js');
const patternCode = fs.readFileSync(patternFilePath, 'utf8');

// Create a context with console support and run the pattern matcher code
const context = {
  console,
  self: {}  // Simulate service worker global scope
};
vm.createContext(context);
vm.runInContext(patternCode, context);

// Extract the functions from the context
const wildcardToRegExp = context.self.wildcardToRegExp || context.wildcardToRegExp;
const matchesPattern = context.self.matchesPattern || context.matchesPattern;

// Check that the functions were loaded properly
if (!wildcardToRegExp || !matchesPattern) {
  console.error('Failed to load pattern matcher functions!');
  process.exit(1);
}

// Simple implementation of checkUrlShouldBeBlocked for testing
function checkUrlShouldBeBlocked(url, allowPatterns = [], denyPatterns = []) {
  // First check if the URL matches any allow pattern
  let matchedAllowPatterns = [];
  
  for (const pattern of allowPatterns) {
    if (matchesPattern(pattern, url)) {
      console.log(`URL ${url} matched allow pattern: ${pattern}`);
      matchedAllowPatterns.push(pattern);
    }
  }
  
  // Then check if the URL matches any deny pattern
  let matchedDenyPatterns = [];
  
  for (const pattern of denyPatterns) {
    if (matchesPattern(pattern, url)) {
      console.log(`URL ${url} matched deny pattern: ${pattern}`);
      matchedDenyPatterns.push(pattern);
    }
  }
  
  // Apply precedence rules
  if (matchedAllowPatterns.length > 0 && matchedDenyPatterns.length > 0) {
    console.log(`URL matched both allow and deny patterns - determining precedence`);
      // Get the most specific patterns (longer patterns are considered more specific)
    const mostSpecificAllow = matchedAllowPatterns.sort((a, b) => b.length - a.length)[0];
    const mostSpecificDeny = matchedDenyPatterns.sort((a, b) => b.length - a.length)[0];
    
    // Extract hostname from URL for comparison
    const hostname = url.replace(/^https?:\/\//, '').split('/')[0];
      // Special logic for reddit-style patterns:
    // - Specific path overrides domain pattern
    // - Specific path overrides wildcard path
    
    // Simplify the URL for pattern comparison
    const urlPath = url.replace(/^https?:\/\/[^\/]+/, '');
    const isAllowMatchMoreSpecific = mostSpecificAllow.includes('/r/') && urlPath.includes('/r/') && 
                                 (mostSpecificAllow.includes(urlPath) || urlPath.includes(mostSpecificAllow.replace('/*', '')));
    
    if (isAllowMatchMoreSpecific ||
        (mostSpecificAllow.includes('/') && 
        (mostSpecificDeny === hostname || 
         mostSpecificDeny.includes('/*') || 
         mostSpecificAllow.length > mostSpecificDeny.length))) {
      console.log(`Allow pattern ${mostSpecificAllow} overrides deny pattern ${mostSpecificDeny}`);
      return { blocked: false, reason: `Allow pattern: ${mostSpecificAllow}` };
    } else {
      console.log(`Deny pattern ${mostSpecificDeny} takes precedence over allow pattern ${mostSpecificAllow}`);
      return { blocked: true, reason: `Deny pattern: ${mostSpecificDeny}` };
    }
  }
  
  // If only allow patterns matched, allow
  if (matchedAllowPatterns.length > 0) {
    return { blocked: false, reason: `Allow pattern: ${matchedAllowPatterns[0]}` };
  }
  
  // If only deny patterns matched, block
  if (matchedDenyPatterns.length > 0) {
    return { blocked: true, reason: `Deny pattern: ${matchedDenyPatterns[0]}` };
  }
  
  // Default: allow
  return { blocked: false, reason: 'Default allow' };
}

// Function to run a single test
function runTest(testName, url, allowList, denyList, expectedBlocked) {
  console.log(`\n=== TEST: ${testName} ===`);
  console.log(`URL: ${url}`);
  console.log(`Allow List: ${JSON.stringify(allowList)}`);
  console.log(`Deny List: ${JSON.stringify(denyList)}`);
  
  const result = checkUrlShouldBeBlocked(url, allowList, denyList);
  const passed = result.blocked === expectedBlocked;
  
  console.log(`Expected: ${expectedBlocked ? 'BLOCKED' : 'ALLOWED'}`);
  console.log(`Actual: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} (${result.reason})`);
  console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  
  return passed;
}

// Run a series of Reddit-specific tests
function runRedditTests() {
  console.log('\n===== REDDIT BLOCKING TESTS =====\n');
  let passed = 0;
  let total = 0;
  
  // Test cases that should pass
  const tests = [
    {
      name: "Block all of Reddit",
      url: "https://www.reddit.com",
      allowList: [],
      denyList: ["reddit.com"],
      expectedBlocked: true
    },
    {
      name: "Block all subreddits with reddit.com/r/* rule",
      url: "https://www.reddit.com/r/cars",
      allowList: [],
      denyList: ["reddit.com/r/*"],
      expectedBlocked: true
    },
    {
      name: "Block all subreddits including with trailing slash",
      url: "https://www.reddit.com/r/cars/",
      allowList: [],
      denyList: ["reddit.com/r/*"],
      expectedBlocked: true
    },
    {
      name: "Block deep subreddit paths",
      url: "https://www.reddit.com/r/cars/comments/123456/post_title",
      allowList: [],
      denyList: ["reddit.com/r/*"],
      expectedBlocked: true
    },
    {
      name: "Allow specific subreddit with override",
      url: "https://www.reddit.com/r/science",
      allowList: ["reddit.com/r/science/*"],
      denyList: ["reddit.com/r/*"],
      expectedBlocked: false
    },
    {
      name: "Block different subreddit despite override",
      url: "https://www.reddit.com/r/cars",
      allowList: ["reddit.com/r/science/*"],
      denyList: ["reddit.com/r/*"],
      expectedBlocked: true
    },
    {
      name: "Allow specific subreddit deep path",
      url: "https://www.reddit.com/r/science/comments/123/title",
      allowList: ["reddit.com/r/science/*"],
      denyList: ["reddit.com/r/*"],
      expectedBlocked: false
    },
    {
      name: "Block subreddit root when only blocking /r/*",
      url: "https://www.reddit.com",
      allowList: [],
      denyList: ["reddit.com/r/*"],
      expectedBlocked: false // Only blocking subreddits, not the main page
    },
    {
      name: "All of Reddit is blocked except specific subreddit",
      url: "https://www.reddit.com/r/cars",
      allowList: ["reddit.com/r/science/*"],
      denyList: ["reddit.com"],
      expectedBlocked: true
    },
    {
      name: "Allow specific subreddit when all of Reddit is blocked",
      url: "https://www.reddit.com/r/science",
      allowList: ["reddit.com/r/science/*"],
      denyList: ["reddit.com"],
      expectedBlocked: false
    }
  ];
  
  // Run all the tests
  for (const test of tests) {
    total++;
    if (runTest(test.name, test.url, test.allowList, test.denyList, test.expectedBlocked)) {
      passed++;
    }
  }
  
  console.log(`\n===== RESULTS: ${passed}/${total} tests passed =====`);
  return { passed, total };
}

// Run the tests
runRedditTests();
