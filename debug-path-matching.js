// Debug path matching issues
const fs = require('fs');

// Load the service worker functions
const serviceWorkerCode = fs.readFileSync('./public/service-worker-patterns.js', 'utf8');

// Execute the code to define the functions
eval(serviceWorkerCode);

console.log('=== DEBUG PATH MATCHING ===\n');

// Test cases that are failing
const testCases = [
  {
    pattern: 'reddit.com/r/*',
    url: 'https://reddit.com/r/news',
    expected: true
  },
  {
    pattern: 'reddit.com/r/*',
    url: 'https://reddit.com/r/pics/comments/123',
    expected: true
  },
  {
    pattern: 'reddit.com/r/*',
    url: 'https://reddit.com/r/',
    expected: true
  },
  {
    pattern: 'reddit.com/r/news',
    url: 'https://reddit.com/r/news/',
    expected: true
  },
  {
    pattern: 'sub.reddit.com/r/*',
    url: 'https://sub.reddit.com/r/news',
    expected: true
  }
];

testCases.forEach((test, i) => {
  console.log(`\n--- Test ${i + 1} ---`);
  console.log(`Pattern: ${test.pattern}`);
  console.log(`URL: ${test.url}`);
  console.log(`Expected: ${test.expected ? 'MATCH' : 'NO MATCH'}`);
  
  // Parse both
  const urlParsed = parseUrlOrPattern(test.url);
  const patternParsed = parseUrlOrPattern(test.pattern);
  
  console.log(`URL parsed:`, {
    hostname: urlParsed.hostname,
    path: urlParsed.path,
    subreddit: urlParsed.subreddit
  });
  
  console.log(`Pattern parsed:`, {
    hostname: patternParsed.hostname,
    path: patternParsed.path,
    subreddit: patternParsed.subreddit,
    isSubdomainWildcard: patternParsed.isSubdomainWildcard
  });
  
  // Test domain matching
  const domainMatch = domainMatches(urlParsed.hostname, patternParsed);
  console.log(`Domain match: ${domainMatch}`);
  
  // Test path matching
  const pathMatch = pathMatches(urlParsed.path, patternParsed.path, patternParsed, urlParsed);
  console.log(`Path match: ${pathMatch}`);
  
  // Test overall pattern matching
  const result = matchesPattern(test.pattern, test.url);
  console.log(`Overall result: ${result ? 'MATCH' : 'NO MATCH'}`);
  console.log(`Test result: ${result === test.expected ? '✓ PASS' : '✗ FAIL'}`);
});
