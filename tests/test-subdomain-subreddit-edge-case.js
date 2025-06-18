/**
 * Targeted test for the failing edge case:
 * When we have a subdomain wildcard allow pattern for one subreddit (*.reddit.com/r/hoggit/*)
 * It should not allow a different subreddit (www.reddit.com/r/cars/)
 * 
 * This is testing the proper domain + path boundary handling
 */

// Import the matcher functions (we'll use this as a standalone test)
const fs = require('fs');
const vm = require('vm');

// Read the service-worker-patterns.js file
const patternCode = fs.readFileSync('./public/service-worker-patterns.js', 'utf8');

// Create a sandbox with console
const sandbox = {
  self: {},
  console: console
};

// Execute the code in the sandbox to get the functions
vm.createContext(sandbox);
vm.runInContext(patternCode, sandbox);

// Extract functions from sandbox
const {
  parseUrlOrPattern,
  extractSubreddit,
  domainMatches,
  pathMatches,
  matchesPattern,
  checkUrlShouldBeBlocked
} = sandbox.self;

// Test setup
const pattern = "https://*.reddit.com/r/hoggit/*";
const url = "https://www.reddit.com/r/cars/";
const denyPattern = "reddit.com/r/*";

// Run the test WITHOUT the hardcoded special case
function runMatcherTest() {
  console.log("=== TESTING SUBDOMAIN SUBREDDIT EDGE CASE ===");
  
  // Parsed components for analysis
  const urlParsed = parseUrlOrPattern(url);
  const patternParsed = parseUrlOrPattern(pattern);
  
  console.log("\nURL PARSED:");
  console.log(`- Hostname: ${urlParsed.hostname}`);
  console.log(`- Path: ${urlParsed.path}`);
  console.log(`- Subreddit: ${urlParsed.subreddit}`);
  
  console.log("\nPATTERN PARSED:");
  console.log(`- Is Subdomain Wildcard: ${patternParsed.isSubdomainWildcard}`);
  console.log(`- Base Domain: ${patternParsed.baseDomain}`);
  console.log(`- Path: ${patternParsed.path}`);
  console.log(`- Subreddit: ${patternParsed.subreddit}`);
  
  // Domain matching test
  console.log("\nDOMAIN MATCHING:");
  const domainMatch = domainMatches(urlParsed.hostname, patternParsed);
  console.log(`Domain matches: ${domainMatch}`);
  
  // Path matching test
  console.log("\nPATH MATCHING:");
  const pathMatch = pathMatches(urlParsed.path, patternParsed.path, patternParsed, urlParsed);
  console.log(`Path matches: ${pathMatch}`);
  
  // Overall pattern matching test
  console.log("\nOVERALL PATTERN MATCHING:");
  const patternMatch = matchesPattern(pattern, url);
  console.log(`Pattern matches: ${patternMatch}`);
  
  // Block decision test
  console.log("\nBLOCK DECISION TEST:");
  const shouldBlock = checkUrlShouldBeBlocked(url, [pattern], [denyPattern]);
  console.log(`URL should be blocked: ${shouldBlock}`);
  
  console.log("\n=== TEST RESULT ===");
  if (!patternMatch && shouldBlock) {
    console.log("✅ TEST PASSED: Different subreddit is correctly not matched and URL is blocked");
  } else {
    console.log("❌ TEST FAILED: Different subreddit is incorrectly matched or URL is not blocked");
  }
}

// Run the test
runMatcherTest();
