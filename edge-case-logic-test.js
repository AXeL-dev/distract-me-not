/**
 * Test for the specific edge case that was failing in the comprehensive test
 * 
 * This test isolates and focuses on the specific edge case where a subdomain wildcard allow pattern
 * for one subreddit (e.g. *.reddit.com/r/hoggit/*) should NOT allow a different subreddit
 * (e.g. www.reddit.com/r/cars/) even when a general deny pattern (reddit.com/r/*) is present.
 */

// Create a simplified mock environment to test the logic
const mockCheckUrlShouldBeBlocked = (url, allowList, denyList) => {
  console.log(`\nChecking URL: ${url}`);
  console.log(`Allow List: ${JSON.stringify(allowList)}`);
  console.log(`Deny List: ${JSON.stringify(denyList)}`);
  
  // Parse the URL components
  const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
  const hostname = urlObj.hostname.toLowerCase();
  const path = urlObj.pathname.toLowerCase();
  
  // Check if the URL has a subreddit path
  const subredditMatch = path.match(/\/r\/([^\/]+)/);
  const urlSubreddit = subredditMatch ? subredditMatch[1] : null;
  
  if (urlSubreddit) {
    console.log(`URL contains subreddit: ${urlSubreddit}`);
    
    // Check if any allow pattern specifies a different subreddit
    let hasSubredditAllowPatterns = false;
    let matchesSpecificSubreddit = false;
    
    for (const pattern of allowList) {
      const patternSubredditMatch = pattern.match(/\/r\/([^\/\*]+)/);
      
      if (patternSubredditMatch) {
        const patternSubreddit = patternSubredditMatch[1].toLowerCase();
        hasSubredditAllowPatterns = true;
        
        console.log(`Allow pattern contains subreddit: ${patternSubreddit}`);
        
        // Check if this subreddit matches the URL subreddit
        if (patternSubreddit === urlSubreddit) {
          matchesSpecificSubreddit = true;
          console.log(`✓ URL subreddit matches allow pattern subreddit`);
          
          // Only allow if the domain part also matches
          if (pattern.includes('://*.')) {
            // Extract the base domain from the pattern (after *.)
            const patternDomain = pattern.split('://*.')[1].split('/')[0];
            if (hostname.endsWith(`.${patternDomain}`) || hostname === patternDomain) {
              console.log(`✓ URL domain matches allow pattern domain`);
              return false; // ALLOW
            } 
          } else if (pattern.includes(urlObj.host) || 
                    (pattern.includes(urlObj.hostname.split('.').slice(-2).join('.')))) {
            return false; // ALLOW
          }
        }
      }
    }
    
    // If we have subreddit-specific allow patterns but none match this URL's subreddit
    if (hasSubredditAllowPatterns && !matchesSpecificSubreddit) {
      // Check if there's a deny pattern for general subreddits (like reddit.com/r/*)
      for (const denyPattern of denyList) {
        if (denyPattern.includes('/r/*')) {
          // No matching allow subreddit + a general deny subreddit rule = block
          console.log(`✗ URL has a subreddit but doesn't match any specific allowed subreddits`);
          console.log(`✗ Found deny pattern for subreddits: ${denyPattern}`);
          return true; // BLOCK
        }
      }
    }
  }
  
  // Fallback to default - no specific subreddit rule matched
  return false;
};

const testCase = {
  name: "Specific allow pattern should not allow different domain with same path",
  url: "https://www.reddit.com/r/cars/",
  allow: ["https://*.reddit.com/r/hoggit/*"],
  deny: ["reddit.com/r/*"],
  expected: "BLOCKED"
};

// Run the test
console.log("=== TESTING LOGICAL FIX FOR EDGE CASE ===");
console.log(`Test case: ${testCase.name}`);

// Check if URL should be blocked
const shouldBlock = mockCheckUrlShouldBeBlocked(testCase.url, testCase.allow, testCase.deny);
console.log(`\nResult: ${shouldBlock ? 'BLOCKED' : 'ALLOWED'}`);
console.log(`Expected: ${testCase.expected}`);
console.log(`Test ${shouldBlock ? 'PASSED ✓' : 'FAILED ✗'}`);

// Test the working case too
const workingCase = {
  name: "Correct domain and path should be allowed",
  url: "https://www.reddit.com/r/hoggit/comments",
  allow: ["https://*.reddit.com/r/hoggit/*"],
  deny: ["reddit.com/r/*"],
  expected: "ALLOWED"
};

console.log("\n=== TESTING WORKING CASE ===");
console.log(`Test case: ${workingCase.name}`);

// Check if URL should be blocked
const shouldAllow = !mockCheckUrlShouldBeBlocked(workingCase.url, workingCase.allow, workingCase.deny);
console.log(`\nResult: ${shouldAllow ? 'ALLOWED' : 'BLOCKED'}`);
console.log(`Expected: ${workingCase.expected}`);
console.log(`Test ${shouldAllow ? 'PASSED ✓' : 'FAILED ✗'}`);
