// Debug script to check what happens when we call the navigation to reddit
// This will help us understand why the patterns aren't matching

console.log('=== DEBUG SERVICE WORKER PATTERN MATCHING ===\n');

// Simulate the exact scenario from your console logs
const testUrl = 'https://www.reddit.com/r/cars/';

// Test the pattern against your reddit.com/* rule
const testPatterns = [
  'reddit.com/*',
  'reddit.com',
  '*.reddit.com/*',
  'www.reddit.com/*'
];

// Load our pattern matching
const fs = require('fs');
const serviceWorkerCode = fs.readFileSync('./public/service-worker-patterns.js', 'utf8');
eval(serviceWorkerCode);

console.log('Testing URL:', testUrl);
console.log('Testing against patterns:');

testPatterns.forEach((pattern, i) => {
  console.log(`\n--- Pattern ${i + 1}: "${pattern}" ---`);
  
  // Test individual pattern matching
  const matches = matchesPattern(pattern, testUrl);
  console.log(`matchesPattern result: ${matches}`);
  
  // Test the full allow/deny logic
  const allowPatterns = [];
  const denyPatterns = [pattern];
  
  const shouldBlock = checkUrlShouldBeBlocked(testUrl, allowPatterns, denyPatterns);
  console.log(`checkUrlShouldBeBlocked result: ${shouldBlock ? 'BLOCK' : 'ALLOW'}`);
  
  // Parse both to see the components
  const urlParsed = parseUrlOrPattern(testUrl);
  const patternParsed = parseUrlOrPattern(pattern);
  
  console.log('URL parsed:', {
    hostname: urlParsed.hostname,
    path: urlParsed.path,
    subreddit: urlParsed.subreddit
  });
  
  console.log('Pattern parsed:', {
    hostname: patternParsed.hostname,
    path: patternParsed.path,
    subreddit: patternParsed.subreddit,
    isSubdomainWildcard: patternParsed.isSubdomainWildcard
  });
});

// Test what your service worker would actually call
console.log('\n=== TESTING WHAT SERVICE WORKER CALLS ===');
console.log('URL:', testUrl);

// Simulate different possible blacklist contents
const possibleBlacklists = [
  ['reddit.com/*'],
  ['reddit.com'],
  [{ pattern: 'reddit.com/*' }],
  [{ url: 'reddit.com/*' }],
  ['*.reddit.com/*']
];

possibleBlacklists.forEach((blacklist, i) => {
  console.log(`\n--- Blacklist ${i + 1}: ${JSON.stringify(blacklist)} ---`);
  
  // Convert like the service worker does
  const allowPatterns = [];
  const denyPatterns = blacklist.map(site => typeof site === 'string' ? site : site.pattern || site.url).filter(Boolean);
  
  console.log('Converted deny patterns:', denyPatterns);
  
  const shouldBlock = checkUrlShouldBeBlocked(testUrl, allowPatterns, denyPatterns);
  console.log(`Result: ${shouldBlock ? 'BLOCK' : 'ALLOW'}`);
});
