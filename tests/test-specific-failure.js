// Test the specific failing case using the actual service worker functions
const fs = require('fs');

// Load the service worker patterns
eval(fs.readFileSync('./public/service-worker-patterns.js', 'utf8'));

console.log('=== TESTING THE SPECIFIC FAILING CASE ===');

const url = 'https://www.reddit.com/r/cars/';
const allowList = ['https://*.reddit.com/r/hoggit/*'];
const denyList = ['reddit.com/r/*'];

console.log(`URL: ${url}`);
console.log(`Allow List: ${JSON.stringify(allowList)}`);
console.log(`Deny List: ${JSON.stringify(denyList)}`);

console.log('\n=== INDIVIDUAL PATTERN MATCHING TESTS ===');

// Test the allow pattern matching
const allowPattern = allowList[0];
console.log(`\n1. Testing allow pattern: ${allowPattern}`);
const allowMatches = matchesPattern(allowPattern, url);
console.log(`Allow pattern matches: ${allowMatches}`);

// Test the deny pattern matching
const denyPattern = denyList[0];
console.log(`\n2. Testing deny pattern: ${denyPattern}`);
const denyMatches = matchesPattern(denyPattern, url);
console.log(`Deny pattern matches: ${denyMatches}`);

// Test the overall decision
console.log(`\n3. Testing overall block decision:`);
const shouldBlock = checkUrlShouldBeBlocked(url, allowList, denyList);
console.log(`Should be blocked: ${shouldBlock}`);

console.log('\n=== EXPECTED RESULT ===');
console.log('Expected: Should be BLOCKED (true) because allow pattern is for hoggit subreddit, but URL is for cars subreddit');
console.log(`Actual: ${shouldBlock ? 'BLOCKED' : 'ALLOWED'}`);
console.log(`Test ${shouldBlock ? 'PASSES' : 'FAILS'}`);
