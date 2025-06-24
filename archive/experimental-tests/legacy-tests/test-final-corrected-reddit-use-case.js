// Final test script for the Reddit use case with corrected logic
// This validates the exact scenario we're trying to implement

// Function to convert a wildcard pattern to a regular expression
function wildcardToRegExp(pattern) {
  // Normalize pattern to lowercase for case-insensitive matching
  pattern = pattern.toLowerCase().trim();
  
  // Special case: empty pattern
  if (!pattern) {
    return new RegExp("^$", 'i');
  }
  
  // Domain-only patterns (like "example.com")
  if (!pattern.includes('://') && !pattern.includes('/')) {
    // Escape special characters
    const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    const regexPattern = escaped.replace(/\*/g, '.*');
    
    // Special case for *.domain.com to match subdomains but not the base domain
    if (pattern.startsWith('*.')) {
      const domainPart = regexPattern.substring(2); // Remove *. prefix
      return new RegExp(`^(?:[^.]+\\.)+${domainPart}(?:\\/.*)?$`, 'i');
    }
    
    // For domain-only patterns (example.com), match the exact domain or any subdomain
    return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${regexPattern}(?:\\/.*)?$`, 'i');
  }

  // Domain with wildcard path (example.com/*)
  const domainWithWildcardPath = /^((?:https?:\/\/)?[^\/]+)\/\*$/i;
  const domainPathMatch = pattern.match(domainWithWildcardPath);
  
  if (domainPathMatch) {
    const domainPart = domainPathMatch[1];
    const escapedDomain = domainPart.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    
    // Match domain with any non-empty path
    // This specifically does NOT match the domain root
    return new RegExp(`^(?:https?:\\/\\/)?(?:www\\.)?${escapedDomain}\\/(?!$).+`, 'i');
  }

  // Domain with specific path pattern (example.com/path/*)
  if (pattern.includes('/*')) {
    const parts = pattern.split('/*');
    if (parts.length > 0) {
      const base = parts[0].replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`^(?:https?:\\/\\/)?(?:www\\.)?${base}\\/.*`, 'i');
    }
  }
  
  // For other patterns with path or protocol, do standard conversion
  const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  const regexPattern = escaped.replace(/\*/g, '.*');
  
  // Make protocol optional if not specified
  if (!pattern.includes('://')) {
    return new RegExp(`^(?:https?:\\/\\/)?${regexPattern}`, 'i');
  } else {
    return new RegExp(`^${regexPattern}`, 'i');
  }
}

// Function to get domain from URL
function getDomainFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.toLowerCase();
  } catch (e) {
    return null;
  }
}

// Function to get path from URL
function getPathFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname;
  } catch (e) {
    return null;
  }
}

// Improved function to simulate the service worker's URL blocking logic
function checkUrlShouldBeBlocked(url, allowList = [], denyList = []) {
  console.log(`\nChecking URL: ${url}`);
  
  // Parse URL for hostname matching
  let hostname = getDomainFromUrl(url);
  let path = getPathFromUrl(url);
  
  if (hostname) {
    console.log(`Hostname: ${hostname}, Path: ${path}`);
  } else {
    console.log(`Could not parse URL`);
  }
  
  // First check if this URL has a specific path allowed
  for (const pattern of allowList) {
    if (pattern.includes('/') && pattern.includes('*')) {
      const regex = wildcardToRegExp(pattern);
      console.log(`Testing against allow pattern: ${pattern}, regex: ${regex}`);
      if (regex.test(url)) {
        console.log(`URL matches specific path allow pattern: ${pattern}`);
        return { blocked: false, reason: `Allow List specific path: ${pattern}` };
      }
    }
  }
  
  // If URL has a path, check if it matches any wildcard path deny pattern
  if (path && path !== '/') {
    for (const pattern of denyList) {
      // Check specifically for patterns like domain/* that block all paths
      if (pattern.endsWith('/*') && !pattern.includes('/*/')) {
        const regex = wildcardToRegExp(pattern);
        console.log(`Testing against deny pattern: ${pattern}, regex: ${regex}`);
        if (regex.test(url)) {
          console.log(`URL with path matches deny list path pattern: ${pattern}`);
          return { blocked: true, reason: `Deny List pattern: ${pattern} (blocks all paths)` };
        }
      }
    }
  }
  
  // Check for domain-only patterns in the allow list
  for (const pattern of allowList) {
    if (!pattern.includes('/')) {
      const regex = wildcardToRegExp(pattern);
      console.log(`Testing against domain allow pattern: ${pattern}, regex: ${regex}`);
      if (regex.test(url) || (hostname && regex.test(hostname))) {
        // Root domain or domain only pattern matched
        console.log(`URL matches domain-only allow list pattern: ${pattern}`);
        
        // If this is just the root domain without a path or with only '/', always allow
        if (!path || path === '/') {
          return { blocked: false, reason: `Allow List pattern: ${pattern} (root domain)` };
        }
      }
    }
  }
  
  // Check remaining patterns in the deny list
  for (const pattern of denyList) {
    const regex = wildcardToRegExp(pattern);
    console.log(`Testing against general deny pattern: ${pattern}, regex: ${regex}`);
    if (regex.test(url)) {
      console.log(`URL matches deny list pattern: ${pattern}`);
      return { blocked: true, reason: `Deny List pattern: ${pattern}` };
    }
  }
  
  // If no pattern matched, allow the URL by default
  console.log(`No matching patterns, allowing URL by default`);
  return { blocked: false, reason: "URL allowed by default (no matching rules)" };
}

// Test the Reddit use case specifically
function testRedditUseCase() {
  console.log("=== TESTING REDDIT USE CASE ===");
  
  const allowList = ["reddit.com", "reddit.com/r/news/*"];
  const denyList = ["reddit.com/*"];
  
  console.log(`Allow list: ${JSON.stringify(allowList)}`);
  console.log(`Deny list: ${JSON.stringify(denyList)}`);
  console.log("\n-----------------");
  
  // Test root domain (should be allowed)
  let result = checkUrlShouldBeBlocked("https://www.reddit.com", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  result = checkUrlShouldBeBlocked("https://old.reddit.com", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  // Test subpaths (should be blocked except for /r/news/*)
  result = checkUrlShouldBeBlocked("https://www.reddit.com/r/all", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  result = checkUrlShouldBeBlocked("https://old.reddit.com/r/redheads", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  // Test allowed subpaths
  result = checkUrlShouldBeBlocked("https://www.reddit.com/r/news", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  result = checkUrlShouldBeBlocked("https://old.reddit.com/r/news/comments/123", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
}

// Run the test
testRedditUseCase();
