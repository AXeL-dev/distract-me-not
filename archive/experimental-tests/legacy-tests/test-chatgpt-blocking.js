/**
 * Specific Test for ChatGPT URL Blocking
 */

// A simplified version of the service worker's checkUrlShouldBeBlocked function
function checkUrlShouldBeBlocked(url, whitelist = [], blacklist = [], mode = 'combined') {
  console.log(`Testing URL: ${url}`);
  console.log(`Whitelist: ${JSON.stringify(whitelist)}`);
  console.log(`Blacklist: ${JSON.stringify(blacklist)}`);
  
  // Check whitelist first for any matches
  for (const pattern of whitelist) {
    console.log(`Checking whitelist pattern: ${pattern}`);
    if (url.includes(pattern) || 
        url.toLowerCase().includes(pattern.toLowerCase())) {
      console.log(`URL MATCHES whitelist pattern: ${pattern}`);
      return { blocked: false, reason: `Allowed by whitelist: ${pattern}` };
    }
  }
  
  // Check blacklist if we're in blacklist or combined mode
  if (mode === 'blacklist' || mode === 'denylist' || mode === 'combined') {
    for (const pattern of blacklist) {
      console.log(`Checking blacklist pattern: ${pattern}`);
      if (url.includes(pattern) || 
          url.toLowerCase().includes(pattern.toLowerCase())) {
        console.log(`URL MATCHES blacklist pattern: ${pattern}`);
        return { blocked: true, reason: `Blocked by blacklist: ${pattern}` };
      }
    }
  }
  
  // In whitelist mode, block if not explicitly allowed
  if (mode === 'whitelist' || mode === 'allowlist') {
    return { blocked: true, reason: `Blocked by default (allowlist mode)` };
  }
  
  // Otherwise, allow the URL
  return { blocked: false, reason: `Allowed by default` };
}

// Test the ChatGPT URL
const url = 'https://chatgpt.com/c/67dc88d0-5850-800c-a4d9-e14157814125';
const whitelist = [];
const blacklist = ['chatgpt.com'];
const mode = 'combined';

const result = checkUrlShouldBeBlocked(url, whitelist, blacklist, mode);
console.log(`Result: ${JSON.stringify(result)}`);
console.log(`URL should be: ${result.blocked ? 'BLOCKED ❌' : 'ALLOWED ✅'}`);
