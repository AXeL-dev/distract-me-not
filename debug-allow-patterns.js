// Debug pattern matching for allow patterns
const fs = require('fs');

// Load the service worker functions
const serviceWorkerCode = fs.readFileSync('./public/service-worker-patterns.js', 'utf8');

// Execute the code to define the functions
eval(serviceWorkerCode);

console.log('=== DEBUG ALLOW PATTERN MATCHING ===\n');

// Test specific failing allow patterns
const tests = [
  {
    pattern: 'reddit.com/r/askscience/*',
    url: 'https://reddit.com/r/askscience',
    expected: true
  },
  {
    pattern: 'reddit.com/r/askscience/*',
    url: 'https://reddit.com/r/askscience/',
    expected: true
  },
  {
    pattern: 'reddit.com/r/askscience/*',
    url: 'https://reddit.com/r/askscience/comments/123',
    expected: true
  },
  {
    pattern: 'twitter.com/NASA/*',
    url: 'https://twitter.com/NASA',
    expected: true
  },
  {
    pattern: 'twitter.com/NASA/*',
    url: 'https://twitter.com/NASA/',
    expected: true
  },
  {
    pattern: 'twitter.com/NASA/*',
    url: 'https://twitter.com/NASA/status/123',
    expected: true
  }
];

tests.forEach((test, i) => {
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
    subreddit: patternParsed.subreddit
  });
  
  // Test pattern matching step by step
  const domainMatch = domainMatches(urlParsed.hostname, patternParsed);
  console.log(`Domain match: ${domainMatch}`);
  
  if (domainMatch) {
    const pathMatch = pathMatches(urlParsed.path, patternParsed.path, patternParsed, urlParsed);
    console.log(`Path match: ${pathMatch}`);
  }
  
  // Test overall pattern matching
  const result = matchesPattern(test.pattern, test.url);
  console.log(`Overall result: ${result ? 'MATCH' : 'NO MATCH'}`);
  console.log(`Test result: ${result === test.expected ? '✓ PASS' : '✗ FAIL'}`);
});
