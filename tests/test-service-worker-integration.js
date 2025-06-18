/**
 * Test Script for Service Worker Pattern Matching
 * 
 * This script uses the service-worker-patterns.js file to test URL matching
 * against blacklist and whitelist patterns.
 */

// First, include the pattern matcher
const fs = require('fs');
const path = require('path');

// Create a mock self object for the service worker context
const self = {};

// Read and evaluate the pattern matcher code
const patternMatcherCode = fs.readFileSync(
  path.join(__dirname, 'public', 'service-worker-patterns.js'), 
  'utf8'
);
eval(patternMatcherCode);

// Test utility function
function testUrlBlocking(url, whitelist, blacklist, mode = 'combined', expectedBlocked = null) {
  console.log(`\nTesting URL: ${url}`);
  console.log(`Mode: ${mode}`);
  console.log(`Whitelist: ${JSON.stringify(whitelist)}`);
  console.log(`Blacklist: ${JSON.stringify(blacklist)}`);
  
  // Simulate the checkUrlShouldBeBlocked function as it works in the service worker
  function checkUrlShouldBeBlocked(url) {
    // Parse URL for hostname
    let hostname = "";
    try {
      const parsedUrl = new URL(url);
      hostname = parsedUrl.hostname.toLowerCase();
    } catch (e) {
      console.log(`URL parsing failed: ${e.message}`);
    }
    
    // Check allow list first
    let hasAllowMatch = false;
    let allowPattern = '';
    
    for (const site of whitelist) {
      try {
        const pattern = typeof site === 'string' ? site : site.pattern || site.url;
        if (!pattern) continue;
        
        // Use the wildcardToRegExp and test the URL
        if (self.matchesPattern(pattern, url)) {
          console.log(`URL MATCHED allow list pattern: ${pattern}`);
          hasAllowMatch = true;
          allowPattern = pattern;
          
          // For specific path patterns, return immediately
          if (pattern.includes('/')) {
            return { blocked: false, reason: `Allow List specific path: ${pattern}` };
          }
        }
      } catch (e) {
        console.error('Error checking allowlist pattern:', e);
      }
    }
    
    // Check deny list
    if (mode === 'blacklist' || mode === 'denylist' || mode === 'combined') {
      for (const site of blacklist) {
        try {
          const pattern = typeof site === 'string' ? site : site.pattern || site.url;
          if (!pattern) continue;
          
          if (self.matchesPattern(pattern, url)) {
            // If there's an allow match, it might override this deny pattern
            if (hasAllowMatch) {
              console.log(`URL matches deny pattern ${pattern}, but is overridden by allow pattern: ${allowPattern}`);
              return { blocked: false, reason: `Allow List pattern: ${allowPattern} overrides deny list: ${pattern}` };
            }
            
            console.log(`URL MATCHED deny list pattern: ${pattern}`);
            return { blocked: true, reason: `Deny List pattern: ${pattern}` };
          }
        } catch (e) {
          console.error('Error checking denylist pattern:', e);
        }
      }
    }
    
    // Check for domain-only allow patterns if we had a match earlier
    if (hasAllowMatch) {
      return { blocked: false, reason: `Allow List domain: ${allowPattern}` };
    }
    
    // In allow list mode, block everything not explicitly allowed
    if (mode === 'whitelist' || mode === 'allowlist') {
      console.log(`URL not in allow list: ${url}`);
      return { blocked: true, reason: "URL not on Allow List (Allow List Mode)" }; 
    }
    
    // If we reach here, allow the URL
    console.log(`URL didn't match any blocking rules: ${url}`);
    return { blocked: false, reason: "URL allowed by default (no matching rules)" };
  }
  
  const result = checkUrlShouldBeBlocked(url);
  console.log(`Result: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - Reason: ${result.reason}`);
  
  if (expectedBlocked !== null) {
    const testResult = result.blocked === expectedBlocked;
    console.log(`Test ${testResult ? 'PASSED ✅' : 'FAILED ❌'}`);
    return testResult;
  }
  
  return result;
}

// Run tests
console.log("===== URL BLOCKING TESTS =====\n");

// Test 1: Simple domain blocking
testUrlBlocking(
  'https://reddit.com',
  [], 
  ['reddit.com'],
  'combined',
  true
);

// Test 2: Domain with allow override
testUrlBlocking(
  'https://reddit.com/r/askscience',
  ['reddit.com/r/askscience/*'], 
  ['reddit.com'],
  'combined',
  false
);

// Test 3: Domain with subdomains
testUrlBlocking(
  'https://www.reddit.com',
  [], 
  ['reddit.com'],
  'combined',
  true
);

// Test 4: Path-specific blocking
testUrlBlocking(
  'https://reddit.com/r/all',
  ['reddit.com/r/askscience/*'], 
  ['reddit.com/r/*'],
  'combined',
  true
);

// Test 5: Specific pattern that should be blocked
testUrlBlocking(
  'https://chatgpt.com/c/67dc88d0-5850-800c-a4d9-e14157814125',
  [], 
  ['chatgpt.com'],
  'combined',
  true
);

// If we're debugging a specific case from the user
console.log("\n===== DEBUG SPECIFIC URL =====");
testUrlBlocking(
  'https://chatgpt.com/c/67dc88d0-5850-800c-a4d9-e14157814125',
  [], 
  ['chatgpt.com'],
  'combined'
);
