// This is a simplified test that simulates the service worker's checkUrlShouldBeBlocked function
// with our specific use case of reddit.com and reddit.com/*

// Extract domain from a URL
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}

// Extract path from a URL
function getPath(url) {
  try {
    return new URL(url).pathname;
  } catch (e) {
    return null;
  }
}

// Simulated wildcardToRegExp function
function wildcardToRegExp(pattern) {
  pattern = pattern.toLowerCase().trim();
  
  // Domain-only pattern (e.g., "reddit.com")
  if (!pattern.includes('/')) {
    const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${escaped}(?:\\/.*)?$`, 'i');
  }
  
  // Domain with wildcard path (e.g., "reddit.com/*")
  if (pattern.endsWith('/*')) {
    const domainPart = pattern.split('/*')[0];
    const escaped = domainPart.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${escaped}\\/(?!$).+`, 'i');
  }
    // Specific path pattern (e.g., "reddit.com/r/news/*")
  if (pattern.includes('/*')) {
    const parts = pattern.split('/*');
    const base = parts[0].replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    // Match both with and without trailing slash, e.g. /r/news and /r/news/
    return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${base}(?:\\/.*)?$`, 'i');
  }
  
  // Default case
  const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  return new RegExp(`^(?:https?:\\/\\/)?${escaped}`, 'i');
}

// Simplified checkUrlShouldBeBlocked function
function checkUrlShouldBeBlocked(url, allowList, denyList) {
  console.log(`\nChecking URL: ${url}`);
  console.log(`Domain: ${getDomain(url)}, Path: ${getPath(url)}`);
    // First check for specific path patterns in allow list
  for (const pattern of allowList) {
    if (pattern.includes('/') && pattern.includes('*')) {
      const regex = wildcardToRegExp(pattern);
      console.log(`Testing specific pattern: ${pattern}, regex: ${regex}`);
      
      // Check exact path match including parent path
      // E.g., reddit.com/r/news/* should match reddit.com/r/news and reddit.com/r/news/comments
      const pathBase = pattern.split('/*')[0]; 
      const path = getPath(url);
      
      if (regex.test(url) || 
          (path && (path === pathBase.split('/').slice(1).join('/') || 
                   path.startsWith(pathBase.split('/').slice(1).join('/') + '/')))) {
        console.log(`URL matches specific allow path: ${pattern}`);
        return { blocked: false, reason: `Allow List specific path: ${pattern}` };
      }
    }
  }
  
  // Then check for path-blocking patterns in deny list
  const path = getPath(url);
  if (path && path !== '/') {
    for (const pattern of denyList) {
      if (pattern.endsWith('/*')) {
        const regex = wildcardToRegExp(pattern);
        if (regex.test(url)) {
          console.log(`URL with path matches deny wildcard: ${pattern}`);
          return { blocked: true, reason: `Deny List path pattern: ${pattern}` };
        }
      }
    }
  }
  
  // Finally check for domain-only patterns
  for (const pattern of allowList) {
    if (!pattern.includes('/')) {
      const regex = wildcardToRegExp(pattern);
      if (regex.test(url)) {
        console.log(`URL matches domain allow pattern: ${pattern}`);
        return { blocked: false, reason: `Allow List domain: ${pattern}` };
      }
    }
  }
  
  return { blocked: false, reason: "Default: allowed" };
}

// Test the Reddit use case
console.log("=== TESTING REDDIT PATTERN SCENARIO ===");

const allowList = ["reddit.com", "reddit.com/r/news/*"];
const denyList = ["reddit.com/*"];

console.log(`Allow list: ${JSON.stringify(allowList)}`);
console.log(`Deny list: ${JSON.stringify(denyList)}`);
console.log("\n-----------------");

// Test cases
const testUrls = [
  "https://www.reddit.com",             // Should be allowed (root domain)
  "https://old.reddit.com",             // Should be allowed (root domain)
  "https://www.reddit.com/",            // Should be allowed (root domain with slash)
  "https://www.reddit.com/r/all",       // Should be blocked (path matches reddit.com/*)
  "https://old.reddit.com/r/redheads",  // Should be blocked (path matches reddit.com/*)
  "https://www.reddit.com/r/news",      // Should be allowed (specific path allowed)
  "https://old.reddit.com/r/news/",     // Should be allowed (specific path allowed)
  "https://www.reddit.com/r/news/comments/123" // Should be allowed (specific path allowed)
];

// Run tests
testUrls.forEach(url => {
  const result = checkUrlShouldBeBlocked(url, allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
});
