// Test Service Worker Pattern Matching
// This test simulates the pattern matching logic from the service worker

// Import the wildcardToRegExp function (copy from service-worker.js)
function wildcardToRegExp(pattern) {
  // First, normalize pattern to lowercase for case-insensitive matching
  pattern = pattern.toLowerCase().trim();
  
  // Special case: empty pattern
  if (!pattern) {
    return new RegExp("^$", 'i');
  }
  
  // If it's a simple domain rule without protocol or path
  if (!pattern.includes('://') && !pattern.includes('/')) {
    // First, escape any regex special characters
    const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    
    // Replace wildcards with appropriate regex
    const regexPattern = escaped.replace(/\*/g, '.*');
    
    // Special case for *.domain.com to match subdomains
    if (pattern.startsWith('*.')) {
      const domainPart = regexPattern.substring(2); // Remove *. prefix
      // Match domain with any subdomain but ensure it's actually a subdomain
      return new RegExp(`^(?:[^.]+\\.)+${domainPart}$`, 'i');
    }
    
    // For domain-only patterns, match the domain in full URLs with or without subdomains
    return new RegExp(`^(?:https?:\\/\\/)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)*${regexPattern}(?:\\/.*)?$`, 'i');
  }
  
  // Handle URL patterns with paths
  
  // Case 1: Domain with wildcard path (most common pattern)
  // Like https://www.example.com/* or example.com/*
  const domainWithWildcardPath = /^((?:https?:\/\/)?[^\/]+)\/\*$/i;
  const domainPathMatch = pattern.match(domainWithWildcardPath);
  
  if (domainPathMatch) {
    // Extract just the domain part
    const domainPart = domainPathMatch[1];
    
    // Escape special characters in domain
    const escapedDomain = domainPart.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    
    // Create a regex that matches the domain with any non-empty path
    // Purposely does NOT match just the domain root
    return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${escapedDomain}\\/(?!$).+`, 'i');
  }
  
  // Case 2: Domain with specific path pattern
  // Like https://www.example.com/path/* or example.com/path/to/*
  if (pattern.includes('/*')) {
    // Split into domain+path and wildcard parts
    const parts = pattern.split('/*');
    if (parts.length > 0) {
      const base = parts[0].replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      
      // Should match both the exact path and anything under it
      return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${base}(?:\\/.*)?$`, 'i');
    }
  }
  
  // Case 3: Special wildcard subdomain with specific path
  if (pattern.startsWith('*.') && pattern.includes('/')) {
    const domainEnd = pattern.indexOf('/');
    const domainPart = pattern.substring(2, domainEnd); // Remove *. prefix and get domain
    const pathPart = pattern.substring(domainEnd);
    
    const escapedDomain = domainPart.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    const escapedPath = pathPart.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*');
    
    return new RegExp(`^(?:https?:\\/\\/)?(?:[^\/]+\\.)?${escapedDomain}${escapedPath}$`, 'i');
  }
  
  // Case 4: Exact URL pattern (no wildcards)
  if (!pattern.includes('*')) {
    // Exact URL without trailing slash should only match that exact URL
    const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    if (!pattern.endsWith('/')) {
      // Make protocol optional to match both with and without protocol
      if (pattern.includes('://')) {
        return new RegExp(`^${escaped}$`, 'i');
      } else {
        return new RegExp(`^(?:https?:\/\/)?${escaped}$`, 'i');
      }
    }
    // URL with trailing slash should match the exact URL or anything under that path
    else {
      if (pattern.includes('://')) {
        return new RegExp(`^${escaped}.*$`, 'i');
      } else {
        return new RegExp(`^(?:https?:\/\/)?${escaped}.*$`, 'i');
      }
    }
  }
  
  // For other patterns with a specified path or protocol, do standard wildcard conversion
  const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  const regexPattern = escaped.replace(/\*/g, '.*');
  
  // Make protocol optional if not specified
  if (pattern.includes('://')) {
    return new RegExp(`^${regexPattern}$`, 'i');
  } else {
    return new RegExp(`^(?:https?:\/\/)?${regexPattern}$`, 'i');
  }
}

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

// Simplified checkUrlShouldBeBlocked function
function checkUrlShouldBeBlocked(url, allowList, denyList) {
  console.log(`\nChecking URL: ${url}`);
  console.log(`Domain: ${getDomain(url)}, Path: ${getPath(url)}`);
  
  // STEP 1: Check for specific path patterns in allow list first
  for (const pattern of allowList) {
    if (pattern.includes('/') && pattern.includes('*')) {
      const regex = wildcardToRegExp(pattern);
      console.log(`Testing specific allow path pattern: ${pattern}, regex: ${regex}`);
      
      // Test if URL matches the pattern
      if (regex.test(url)) {
        console.log(`URL matches specific allow path pattern: ${pattern}`);
        return { blocked: false, reason: `Allow List specific path: ${pattern}` };
      }
      
      // Also check if the path is an exact match for the base path
      const parsedPath = getPath(url);
      if (parsedPath && pattern.includes('/*')) {
        const pathBase = pattern.split('/*')[0]; 
        const basePath = pathBase.split('/').slice(1).join('/');
        
        if (parsedPath === '/' + basePath || parsedPath === '/' + basePath + '/') {
          console.log(`Path ${parsedPath} exactly matches base of allow path pattern: ${pathBase}`);
          return { blocked: false, reason: `Allow List specific path: ${pattern} (base path match)` };
        }
      }
    }
  }
  
  // STEP 2: Check for path wildcard patterns in deny list
  const parsedPath = getPath(url);
  if (parsedPath && parsedPath !== '/') {
    for (const pattern of denyList) {
      if (pattern.endsWith('/*') && !pattern.includes('/*/')) {
        const regex = wildcardToRegExp(pattern);
        console.log(`Testing deny path pattern: ${pattern}, regex: ${regex}`);
        
        if (regex.test(url)) {
          console.log(`URL with path matches deny wildcard path: ${pattern}`);
          return { blocked: true, reason: `Deny List pattern: ${pattern} (blocks all paths)` };
        }
      }
    }
  }
  
  // STEP 3: Check domain-only patterns in allow list
  for (const pattern of allowList) {
    if (!pattern.includes('/')) {
      const regex = wildcardToRegExp(pattern);
      console.log(`Testing domain-only pattern: ${pattern}, regex: ${regex}`);
      
      if (regex.test(url)) {
        console.log(`URL matches domain-only allow pattern: ${pattern}`);
        return { blocked: false, reason: `Allow List domain: ${pattern}` };
      }
    }
  }
  
  // Default: Allow
  return { blocked: false, reason: "Default: allowed" };
}

// Test the Reddit use case
console.log("=== TESTING PATTERN MATCHING LOGIC ===");

const allowList = ["example.com", "example.com/r/news/*"];
const denyList = ["example.com/*"];

console.log(`Allow list: ${JSON.stringify(allowList)}`);
console.log(`Deny list: ${JSON.stringify(denyList)}`);
console.log("\n-----------------");

// Test cases
const testUrls = [
  "https://www.example.com",             // Should be allowed (root domain)
  "https://old.example.com",             // Should be allowed (root domain)
  "https://www.example.com/",            // Should be allowed (root domain with slash)
  "https://www.example.com/r/all",       // Should be blocked (path matches example.com/*)
  "https://old.example.com/r/popular",   // Should be blocked (path matches example.com/*)
  "https://www.example.com/r/news",      // Should be allowed (specific path allowed)
  "https://old.example.com/r/news/",     // Should be allowed (specific path allowed)
  "https://www.example.com/r/news/comments/123" // Should be allowed (specific path allowed)
];

// Run tests
testUrls.forEach(url => {
  const result = checkUrlShouldBeBlocked(url, allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
});

// Test with Reddit
console.log("=== TESTING REDDIT PATTERN SCENARIO ===");

const redditAllowList = ["reddit.com", "reddit.com/r/news/*"];
const redditDenyList = ["reddit.com/*"];

console.log(`Allow list: ${JSON.stringify(redditAllowList)}`);
console.log(`Deny list: ${JSON.stringify(redditDenyList)}`);
console.log("\n-----------------");

// Reddit test cases
const redditTestUrls = [
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
redditTestUrls.forEach(url => {
  const result = checkUrlShouldBeBlocked(url, redditAllowList, redditDenyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
});

console.log("=== END TESTING ===");
