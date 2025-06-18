/**
 * Targeted test for the edge case using clean implementation
 * This tests the specific issue with subdomain wildcard subreddit patterns
 */

// Import the clean matcher functions
const fs = require('fs');
const vm = require('vm');

// Read the clean service-worker-patterns.js file
const patternCode = fs.readFileSync('./public/service-worker-patterns-clean.js', 'utf8');

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
  matchesPattern,
  checkUrlShouldBeBlocked
} = sandbox.self;

// Test setup - our problematic edge case
const pattern = "https://*.reddit.com/r/hoggit/*";
const url = "https://www.reddit.com/r/cars/";
const denyPattern = "reddit.com/r/*";

// Test allow patterns - allow /r/hoggit/* only
const allowPatterns = [pattern];
// Test deny patterns - deny all subreddits
const denyPatterns = [denyPattern];

// Test the clean implementation
console.log("=== TESTING CLEAN IMPLEMENTATION ===");

// 1. First, check if the pattern should match the URL directly
const patternMatch = matchesPattern(pattern, url);
console.log(`1. Direct pattern match: ${patternMatch ? 'MATCHED' : 'NOT MATCHED'}`);

// 2. Check the block decision
const shouldBlock = checkUrlShouldBeBlocked(url, allowPatterns, denyPatterns);
console.log(`2. Block decision: ${shouldBlock ? 'BLOCKED' : 'ALLOWED'}`);

// 3. Run the specific test case from the test suite
console.log("3. Running test case: 'Specific allow pattern should not allow different domain with same path'");
console.log(`   - URL: ${url}`);
console.log(`   - Allow patterns: ${JSON.stringify(allowPatterns)}`);
console.log(`   - Deny patterns: ${JSON.stringify(denyPatterns)}`);
console.log(`   - Expected: BLOCKED`);
console.log(`   - Actual: ${shouldBlock ? 'BLOCKED ✓' : 'ALLOWED ✗'}`);

// Now run the comprehensive test for this file
console.log("\n=== RUNNING TARGETED TESTS WITH CLEAN IMPLEMENTATION ===");

// Test cases that should fail matching (should return false)
const matchingShouldFailTests = [
  {
    name: "Different subreddit with subdomain wildcard",
    pattern: "https://*.reddit.com/r/hoggit/*",
    url: "https://www.reddit.com/r/cars/",
    expectedMatch: false
  },
  {
    name: "Different subreddit with exact domain",
    pattern: "https://www.reddit.com/r/hoggit/*",
    url: "https://www.reddit.com/r/cars/",
    expectedMatch: false
  },
  {
    name: "Different subreddit with domain-only pattern",
    pattern: "reddit.com/r/hoggit/*",
    url: "https://www.reddit.com/r/cars/",
    expectedMatch: false
  }
];

// Test cases that should pass matching (should return true)
const matchingShouldPassTests = [
  {
    name: "Same subreddit with subdomain wildcard",
    pattern: "https://*.reddit.com/r/hoggit/*",
    url: "https://www.reddit.com/r/hoggit/comments",
    expectedMatch: true
  },
  {
    name: "Same subreddit with exact domain",
    pattern: "https://www.reddit.com/r/hoggit/*",
    url: "https://www.reddit.com/r/hoggit/comments",
    expectedMatch: true
  }
];

// Run the matching failure tests (should NOT match)
console.log("\n--- Pattern Matching Failure Tests ---");
let passedMatchFailTests = 0;
for (const test of matchingShouldFailTests) {
  const result = matchesPattern(test.pattern, test.url);
  console.log(`Test: ${test.name}`);
  console.log(`- Pattern: ${test.pattern}`);
  console.log(`- URL: ${test.url}`);
  console.log(`- Expected: ${test.expectedMatch ? 'MATCH' : 'NO MATCH'}`);
  console.log(`- Actual: ${result ? 'MATCH ✗' : 'NO MATCH ✓'}`);
  
  if (result === test.expectedMatch) {
    passedMatchFailTests++;
  }
}

// Run the matching success tests (should match)
console.log("\n--- Pattern Matching Success Tests ---");
let passedMatchSuccessTests = 0;
for (const test of matchingShouldPassTests) {
  const result = matchesPattern(test.pattern, test.url);
  console.log(`Test: ${test.name}`);
  console.log(`- Pattern: ${test.pattern}`);
  console.log(`- URL: ${test.url}`);
  console.log(`- Expected: ${test.expectedMatch ? 'MATCH' : 'NO MATCH'}`);
  console.log(`- Actual: ${result ? 'MATCH ✓' : 'NO MATCH ✗'}`);
  
  if (result === test.expectedMatch) {
    passedMatchSuccessTests++;
  }
}

// Block/Allow test cases
const blockDecisionTests = [
  {
    name: "Block different subreddit when specific subreddit is allowed",
    url: "https://www.reddit.com/r/cars/",
    allowPatterns: ["https://*.reddit.com/r/hoggit/*"],
    denyPatterns: ["reddit.com/r/*"],
    expectedBlock: true
  },
  {
    name: "Allow matching subreddit when specific subreddit is allowed",
    url: "https://www.reddit.com/r/hoggit/comments",
    allowPatterns: ["https://*.reddit.com/r/hoggit/*"],
    denyPatterns: ["reddit.com/r/*"],
    expectedBlock: false
  },
  {
    name: "Block subreddit with global reddit.com block",
    url: "https://www.reddit.com/r/cars/",
    allowPatterns: [],
    denyPatterns: ["reddit.com"],
    expectedBlock: true
  }
];

// Run the block decision tests
console.log("\n--- Block Decision Tests ---");
let passedBlockTests = 0;
for (const test of blockDecisionTests) {
  const result = checkUrlShouldBeBlocked(test.url, test.allowPatterns, test.denyPatterns);
  console.log(`Test: ${test.name}`);
  console.log(`- URL: ${test.url}`);
  console.log(`- Allow patterns: ${JSON.stringify(test.allowPatterns)}`);
  console.log(`- Deny patterns: ${JSON.stringify(test.denyPatterns)}`);
  console.log(`- Expected: ${test.expectedBlock ? 'BLOCKED' : 'ALLOWED'}`);
  console.log(`- Actual: ${result ? 'BLOCKED' : 'ALLOWED'} ${result === test.expectedBlock ? '✓' : '✗'}`);
  
  if (result === test.expectedBlock) {
    passedBlockTests++;
  }
}

// Summary
const totalTests = matchingShouldFailTests.length + matchingShouldPassTests.length + blockDecisionTests.length;
const totalPassed = passedMatchFailTests + passedMatchSuccessTests + passedBlockTests;

console.log("\n=== TEST SUMMARY ===");
console.log(`Pattern Match Fail Tests: ${passedMatchFailTests}/${matchingShouldFailTests.length} passed`);
console.log(`Pattern Match Success Tests: ${passedMatchSuccessTests}/${matchingShouldPassTests.length} passed`);
console.log(`Block Decision Tests: ${passedBlockTests}/${blockDecisionTests.length} passed`);
console.log(`OVERALL: ${totalPassed}/${totalTests} tests passed (${Math.round(totalPassed/totalTests*100)}%)`);
