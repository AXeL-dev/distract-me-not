/**
 * Test script for URL pattern matching and blocking in the Distract-Me-Not extension.
 * Open this file in a browser to run the tests.
 */

// Include the pattern matcher
importScripts('public/service-worker-patterns.js');

// Test URLs
const testUrls = [
  'https://www.reddit.com/',
  'https://www.reddit.com/r/cars/',
  'https://www.facebook.com/',
  'https://www.youtube.com/',
  'https://chatgpt.com/'
];

// Test patterns
const allowList = [
  'reddit.com/r/cars/*',
  'youtube.com/watch?v=abcdef'
];

const denyList = [
  'reddit.com',
  'facebook.com',
  'chatgpt.com'
];

// Run tests
console.log('=== PATTERN MATCHING TEST ===');
console.log('Testing URLs against patterns...');

testUrls.forEach(url => {
  console.log(`\nTesting URL: ${url}`);
  
  // Check allow list first
  let allowed = false;
  let allowPattern = '';
  
  console.log('Checking allow list:');
  for (const pattern of allowList) {
    const matches = matchesPattern(pattern, url);
    console.log(`  Pattern: ${pattern} - ${matches ? 'MATCH' : 'NO MATCH'}`);
    
    if (matches) {
      allowed = true;
      allowPattern = pattern;
      break;
    }
  }
  
  if (allowed) {
    console.log(`URL is explicitly allowed by pattern: ${allowPattern}`);
  } else {
    console.log('URL is not explicitly allowed, checking deny list:');
    
    let blocked = false;
    let blockPattern = '';
    
    for (const pattern of denyList) {
      const matches = matchesPattern(pattern, url);
      console.log(`  Pattern: ${pattern} - ${matches ? 'MATCH' : 'NO MATCH'}`);
      
      if (matches) {
        blocked = true;
        blockPattern = pattern;
        break;
      }
    }
    
    if (blocked) {
      console.log(`URL should be BLOCKED by pattern: ${blockPattern}`);
    } else {
      console.log('URL should be ALLOWED (no matching block patterns)');
    }
  }
  
  // Test the actual service worker function (if available)
  if (typeof checkUrlShouldBeBlocked === 'function') {
    const result = checkUrlShouldBeBlocked(url, denyList, allowList);
    console.log(`Result from checkUrlShouldBeBlocked: ${result === true ? 'BLOCKED' : 'ALLOWED'}`);
  }
});

// Test a specific custom case for reddit subreddit
console.log('\n=== SPECIFIC REDDIT SUBREDDIT TEST ===');

const redditTests = [
  { url: 'https://www.reddit.com/', expected: 'blocked' },
  { url: 'https://www.reddit.com/r/cars/', expected: 'allowed' },
  { url: 'https://www.reddit.com/r/gaming/', expected: 'blocked' },
];

redditTests.forEach(test => {
  const allowed = allowList.some(pattern => matchesPattern(pattern, test.url));
  const blocked = !allowed && denyList.some(pattern => matchesPattern(pattern, test.url));
  const result = blocked ? 'blocked' : 'allowed';
  
  console.log(`URL: ${test.url}`);
  console.log(`Expected: ${test.expected}, Actual: ${result}`);
  console.log(`Test ${result === test.expected ? 'PASSED' : 'FAILED'}\n`);
});

console.log('=== TEST COMPLETE ===');
