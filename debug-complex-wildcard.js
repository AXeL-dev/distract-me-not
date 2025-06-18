/**
 * Special test for complex wildcards
 */
const patternMatcher = require('./pattern-matcher');

// Test the specific failing case
const url = "https://subdomain.example.com/a/b/c/d";
const pattern = "*.example.com/a/*/d";

// Test direct pattern matching
console.log(`Testing if pattern "${pattern}" matches URL "${url}"`);
const regexObj = patternMatcher.wildcardToRegExp(pattern);
console.log(`Generated regex: ${regexObj}`);
const matches = patternMatcher.matchesPattern(pattern, url);
console.log(`Direct match result: ${matches}`);

// Try a simpler pattern that should work
const simplePattern = "*.example.com/a/*/d";
const simpleUrl = "https://sub.example.com/a/b/d";
console.log(`\nTesting if pattern "${simplePattern}" matches URL "${simpleUrl}"`);
const simpleRegexObj = patternMatcher.wildcardToRegExp(simplePattern);
console.log(`Generated regex: ${simpleRegexObj}`);
const simpleMatches = patternMatcher.matchesPattern(simplePattern, simpleUrl);
console.log(`Direct match result: ${simpleMatches}`);

// Testing block function directly
const shouldBlock = patternMatcher.checkUrlShouldBeBlocked(url, [pattern], []);
console.log(`\nShould block result: ${shouldBlock}`);

// Other variations
const variations = [
  "https://sub.example.com/a/b/d",
  "https://sub.example.com/a/b/c/d",
  "https://sub.example.com/a/d"
];

console.log("\nTesting variations:");
variations.forEach(testUrl => {
  const result = patternMatcher.matchesPattern(pattern, testUrl);
  console.log(`Pattern: ${pattern}, URL: ${testUrl}, Match: ${result}`);
});
