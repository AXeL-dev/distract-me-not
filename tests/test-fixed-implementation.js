/**
 * Test file for the fixed implementation of the pattern matcher
 * 
 * This test focuses on the specific edge case that was failing in the comprehensive test:
 * "Specific allow pattern should not allow different domain with same path"
 */

// Load the fixed pattern matcher
const fs = require('fs');
const path = require('path');

// Read the file content and evaluate it as JavaScript
const patternMatcherCode = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'service-worker-patterns.js'),
  'utf8'
);
// Create a context for the script where 'self' is defined
const scriptContext = { self: {}, console };

// Use Function constructor to evaluate the script in our context
new Function('self', 'console', patternMatcherCode)(scriptContext.self, console);

// Extract the functions we need for testing
const { parseUrlOrPattern, matchesPattern, checkUrlShouldBeBlocked } = scriptContext.self;

// Set up the test case
const testCase = {
  name: "Specific allow pattern should not allow different domain with same path",
  url: "https://www.reddit.com/r/cars/",
  allow: ["https://*.reddit.com/r/hoggit/*"],
  deny: ["reddit.com/r/*"],
  expected: "BLOCKED"
};

// Run the test
console.log("=== TESTING FIXED IMPLEMENTATION: EDGE CASE ===");
console.log(`Test case: ${testCase.name}`);
console.log(`URL: ${testCase.url}`);
console.log(`Allow List: ${JSON.stringify(testCase.allow)}`);
console.log(`Deny List: ${JSON.stringify(testCase.deny)}`);
console.log(`Expected: ${testCase.expected}`);

// Check if URL should be blocked
const shouldBlock = checkUrlShouldBeBlocked(testCase.url, testCase.allow, testCase.deny);
console.log(`Actual: ${shouldBlock ? 'BLOCKED' : 'ALLOWED'}`);
console.log(`Result: ${shouldBlock ? (testCase.expected === 'BLOCKED' ? '✓ PASS' : '✗ FAIL') : 
                                    (testCase.expected === 'ALLOWED' ? '✓ PASS' : '✗ FAIL')}`);

// Run additional test cases to ensure we didn't break anything else
const additionalTests = [
  {
    name: "Correct domain and path should be allowed",
    url: "https://www.reddit.com/r/hoggit/comments",
    allow: ["https://*.reddit.com/r/hoggit/*"],
    deny: ["reddit.com/r/*"],
    expected: "ALLOWED"
  },
  {
    name: "Block all of Reddit except specific subreddit",
    url: "https://reddit.com/r/news",
    allow: ["reddit.com/r/askscience/*"],
    deny: ["reddit.com"],
    expected: "BLOCKED"
  },
  {
    name: "Allow specific subreddit while blocking all of Reddit",
    url: "https://reddit.com/r/askscience/comments",
    allow: ["reddit.com/r/askscience/*"],
    deny: ["reddit.com"],
    expected: "ALLOWED"
  }
];

console.log("\n=== RUNNING ADDITIONAL TESTS ===");
let passCount = 0;
additionalTests.forEach((test, index) => {
  console.log(`\n${index + 1}. Test case: ${test.name}`);
  console.log(`URL: ${test.url}`);
  console.log(`Allow List: ${JSON.stringify(test.allow)}`);
  console.log(`Deny List: ${JSON.stringify(test.deny)}`);
  console.log(`Expected: ${test.expected}`);
  
  const result = checkUrlShouldBeBlocked(test.url, test.allow, test.deny);
  console.log(`Actual: ${result ? 'BLOCKED' : 'ALLOWED'}`);
  
  const passed = (result && test.expected === 'BLOCKED') || (!result && test.expected === 'ALLOWED');
  console.log(`Result: ${passed ? '✓ PASS' : '✗ FAIL'}`);
  
  if (passed) passCount++;
});

console.log(`\nSUMMARY: ${passCount + (shouldBlock ? 1 : 0)}/${additionalTests.length + 1} tests passed`);
