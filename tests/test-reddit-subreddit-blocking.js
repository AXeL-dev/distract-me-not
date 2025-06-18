// Test Reddit Subreddit Blocking Pattern

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

// Define wildcardToRegExp function
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
    return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${escapedDomain}\\/(?!$).+`, 'i');
  }
  
  // Case 2: Domain with specific path pattern
  // Like https://www.example.com/path/* or example.com/path/to/*
  if (pattern.includes('/*')) {
    // Split into domain+path and wildcard parts
    const parts = pattern.split('/*');
    if (parts.length > 0) {
      const base = parts[0].replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      
      // For patterns ending with "/*" (like reddit.com/r/*), we need to match 
      // exactly that path or any subpaths (like /r/cars, /r/news, etc.)
      if (pattern.endsWith('/*')) {
        const lastSlashPos = base.lastIndexOf('/');
        if (lastSlashPos !== -1) {
          // Extract domain and path parts
          const domainPart = base.substring(0, lastSlashPos);
          const pathPart = base.substring(lastSlashPos);
          
          // Match URLs with this domain + specific path + anything after
          return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${domainPart}${pathPart}\\/.*`, 'i');
        }
      }
      
      return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${base}(?:\\/.*)?$`, 'i');
    }
  }
  
  // Default case
  const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  const regexPattern = escaped.replace(/\*/g, '.*');
  
  // Make protocol optional if not specified
  if (pattern.includes('://')) {
    return new RegExp(`^${regexPattern}$`, 'i');
  } else {
    return new RegExp(`^(?:https?:\\/\\/)?${regexPattern}$`, 'i');
  }
}

// Check if URL should be blocked based on patterns
function checkUrlShouldBeBlocked(url, allowList, denyList) {
  console.log(`\nChecking URL: ${url}`);
  console.log(`Domain: ${getDomain(url)}, Path: ${getPath(url)}`);
  
  // STEP 1: Check for specific path patterns in allow list first
  for (const pattern of allowList) {
    if (pattern.includes('/') && pattern.includes('*')) {
      const regex = wildcardToRegExp(pattern);
      console.log(`Testing specific allow path pattern: ${pattern}, regex: ${regex}`);
      
      if (regex.test(url)) {
        console.log(`URL matches specific allow path pattern: ${pattern}`);
        return { blocked: false, reason: `Allow List specific path: ${pattern}` };
      }
    }
  }
  
  // STEP 2: Check for path wildcard patterns in deny list
  const parsedPath = getPath(url);
  if (parsedPath && parsedPath !== '/') {
    for (const pattern of denyList) {
      if (pattern.includes('/*')) {
        const regex = wildcardToRegExp(pattern);
        console.log(`Testing deny path pattern: ${pattern}, regex: ${regex}`);
        
        if (regex.test(url)) {
          console.log(`URL with path matches deny wildcard path: ${pattern}`);
          return { blocked: true, reason: `Deny List pattern: ${pattern} (blocks matching paths)` };
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

// Test the Reddit subreddit blocking scenario
console.log("=== TESTING REDDIT SUBREDDIT BLOCKING ===");

const allowList = ["reddit.com", "reddit.com/r/news/*"];
const denyList = ["https://www.reddit.com/r/*"];

console.log(`Allow list: ${JSON.stringify(allowList)}`);
console.log(`Deny list: ${JSON.stringify(denyList)}`);
console.log("\n-----------------");

// Test cases
const testUrls = [
  "https://www.reddit.com",             // Should be allowed (root domain)
  "https://old.reddit.com",             // Should be allowed (root domain)
  "https://www.reddit.com/",            // Should be allowed (root domain with slash)
  "https://www.reddit.com/r/cars",      // Should be blocked (matches reddit.com/r/*)
  "https://www.reddit.com/r/cars/",     // Should be blocked (matches reddit.com/r/*)
  "https://old.reddit.com/r/popular",   // Should be blocked (matches reddit.com/r/*)
  "https://www.reddit.com/r/news",      // Should be allowed (specific path allowed)
  "https://old.reddit.com/r/news/",     // Should be allowed (specific path allowed)
  "https://www.reddit.com/r/news/comments/123" // Should be allowed (specific path allowed)
];

// Run tests
testUrls.forEach(url => {
  const result = checkUrlShouldBeBlocked(url, allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
});

// Test with the actual pattern you're using
console.log("=== TESTING YOUR CURRENT PATTERN ===");

const yourAllowList = [];
const yourDenyList = ["https://www.reddit.com/r/*"];

console.log(`Allow list: ${JSON.stringify(yourAllowList)}`);
console.log(`Deny list: ${JSON.stringify(yourDenyList)}`);
console.log("\n-----------------");

// Test cases for your pattern
const yourTestUrls = [
  "https://www.reddit.com",             // Should be allowed (root domain)
  "https://www.reddit.com/",            // Should be allowed (root domain with slash)
  "https://www.reddit.com/r/cars",      // Should be blocked (matches reddit.com/r/*)
  "https://www.reddit.com/r/cars/",     // Should be blocked (matches reddit.com/r/*)
  "https://www.reddit.com/r/cars/comments/abc123/some_post" // Should be blocked (matches reddit.com/r/*)
];

// Run tests with your pattern
yourTestUrls.forEach(url => {
  const result = checkUrlShouldBeBlocked(url, yourAllowList, yourDenyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
});

console.log("=== END TESTING ===");
