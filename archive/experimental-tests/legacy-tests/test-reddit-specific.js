// Test script for the specific Reddit.com use case with the updated pattern matching
// This script verifies patterns like "reddit.com" and "reddit.com/r/news/*"

// Import the wildcardToRegExp function with our latest improvements
function wildcardToRegExp(pattern) {
  // First, normalize pattern to lowercase for case-insensitive matching
  pattern = pattern.toLowerCase().trim();
  
  // Special case: empty pattern
  if (!pattern) {
    return new RegExp("^$", 'i');
  }
  
  // Domain-only patterns (like "example.com")
  if (!pattern.includes('://') && !pattern.includes('/')) {
    // First, escape any regex special characters
    const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    const regexPattern = escaped.replace(/\*/g, '.*');
    
    // Special case for *.domain.com to match subdomains but not the base domain
    if (pattern.startsWith('*.')) {
      const domainPart = regexPattern.substring(2); // Remove *. prefix
      return new RegExp(`^(?:[^.]+\\.)+${domainPart}(?:\\/.*)?$`, 'i');
    }
    
    // For domain-only patterns, match the exact domain or any subdomain
    // This also matches full URLs with this domain
    return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${regexPattern}(?:\\/.*)?$`, 'i');
  }

  // Domain with wildcard path (like "example.com/*")
  const domainWithWildcardPath = /^((?:https?:\/\/)?[^\/]+)\/\*$/i;
  const domainPathMatch = pattern.match(domainWithWildcardPath);
  
  if (domainPathMatch) {
    // Extract just the domain part
    const domainPart = domainPathMatch[1];
    
    // Escape special characters in domain
    const escapedDomain = domainPart.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    
    // Create a regex that matches the domain with any non-empty path
    // This pattern matches URLs with this domain and any path component
    // It purposely does NOT match just the domain root with or without trailing slash
    return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${escapedDomain}\\/(?!$).+`, 'i');
  }

  // Domain with specific path pattern (like "example.com/path/*")
  if (pattern.includes('/*')) {
    // Split into domain+path and wildcard parts
    const parts = pattern.split('/*');
    if (parts.length > 0) {
      const base = parts[0].replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      // This should match both the exact path and anything under it
      // For example: reddit.com/r/news/* should match both /r/news and /r/news/anything
      return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${base}(?:\\/.*)?$`, 'i');
    }
  }
  
  // For other patterns, do standard conversion
  const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  const regexPattern = escaped.replace(/\*/g, '.*');
  
  if (!pattern.includes('://')) {
    return new RegExp(`^(?:https?:\\/\\/)?${regexPattern}`, 'i');
  } else {
    return new RegExp(`^${regexPattern}`, 'i');
  }
}

// Helper function to get the path from a URL
function getPath(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname;
  } catch (e) {
    return null;
  }
}

// Helper function to get the domain from a URL
function getDomain(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (e) {
    return null;
  }
}

// Simulates the URL blocking logic
function checkUrlShouldBeBlocked(url, allowList = [], denyList = []) {
  const domain = getDomain(url);
  const path = getPath(url);
  
  console.log(`\nChecking URL: ${url}`);
  console.log(`Domain: ${domain}, Path: ${path}`);
  
  // 1. Check for specific path patterns in allow list (highest priority)
  for (const pattern of allowList) {
    if (pattern.includes('/') && pattern.includes('*')) {
      const regex = wildcardToRegExp(pattern);
      console.log(`Testing specific allow pattern: ${pattern}, regex: ${regex}`);
      
      if (regex.test(url)) {
        console.log(`URL matches specific allow path: ${pattern}`);
        return { blocked: false, reason: `Allow List specific path: ${pattern}` };
      }
    }
  }
  
  // 2. Check for path wildcard patterns in deny list (second priority)
  if (path && path !== '/') {
    for (const pattern of denyList) {
      if (pattern.endsWith('/*')) {
        const regex = wildcardToRegExp(pattern);
        console.log(`Testing deny pattern: ${pattern}, regex: ${regex}`);
        
        if (regex.test(url)) {
          console.log(`URL with path matches deny wildcard: ${pattern}`);
          return { blocked: true, reason: `Deny List path pattern: ${pattern}` };
        }
      }
    }
  }
  
  // 3. Check domain-only patterns in allow list
  for (const pattern of allowList) {
    if (!pattern.includes('/')) {
      const regex = wildcardToRegExp(pattern);
      console.log(`Testing domain allow pattern: ${pattern}, regex: ${regex}`);
      
      if (regex.test(url)) {
        console.log(`URL matches domain allow pattern: ${pattern}`);
        return { blocked: false, reason: `Allow List domain: ${pattern}` };
      }
    }
  }
  
  // 4. Check any remaining deny list patterns
  for (const pattern of denyList) {
    const regex = wildcardToRegExp(pattern);
    if (regex.test(url)) {
      console.log(`URL matches deny pattern: ${pattern}`);
      return { blocked: true, reason: `Deny List pattern: ${pattern}` };
    }
  }
  
  console.log(`No patterns matched, allowing by default`);
  return { blocked: false, reason: `No matching rules` };
}

// Test function for pattern matching
function testUrlPattern(url, pattern) {
  const regex = wildcardToRegExp(pattern);
  const matches = regex.test(url);
  
  console.log(`Testing URL: ${url}`);
  console.log(`Against pattern: ${pattern}`);
  console.log(`Regex: ${regex}`);
  console.log(`Result: ${matches ? 'MATCH' : 'NO MATCH'}\n`);
  
  return matches;
}

// Main test for Reddit use case
function testRedditUseCase() {
  console.log("=== TESTING REDDIT PATTERN SCENARIO ===");
  
  const allowList = ["reddit.com", "reddit.com/r/news/*"];
  const denyList = ["reddit.com/*"];
  
  console.log(`Allow list: ${JSON.stringify(allowList)}`);
  console.log(`Deny list: ${JSON.stringify(denyList)}`);
  console.log("\n-----------------");
  
  // Test specific pattern matching
  console.log("\n=== Testing specific path pattern: reddit.com/r/news/* ===");
  testUrlPattern("https://www.reddit.com/r/news", "reddit.com/r/news/*");
  testUrlPattern("https://old.reddit.com/r/news/", "reddit.com/r/news/*");
  testUrlPattern("https://www.reddit.com/r/news/comments/123", "reddit.com/r/news/*");
  testUrlPattern("https://www.reddit.com/r/videos", "reddit.com/r/news/*");
  
  console.log("\n=== Testing domain wildcard path: reddit.com/* ===");
  testUrlPattern("https://www.reddit.com", "reddit.com/*");
  testUrlPattern("https://www.reddit.com/", "reddit.com/*");
  testUrlPattern("https://old.reddit.com/r/all", "reddit.com/*");
  
  console.log("\n=== Testing full Reddit use case ===");
  // Test root domain (should be allowed)
  let result = checkUrlShouldBeBlocked("https://www.reddit.com", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  result = checkUrlShouldBeBlocked("https://old.reddit.com", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  result = checkUrlShouldBeBlocked("https://www.reddit.com/", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  // Test general subpaths (should be blocked)
  result = checkUrlShouldBeBlocked("https://www.reddit.com/r/all", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  result = checkUrlShouldBeBlocked("https://old.reddit.com/r/redheads", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  // Test allowed news subpaths (should be allowed)
  result = checkUrlShouldBeBlocked("https://www.reddit.com/r/news", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  result = checkUrlShouldBeBlocked("https://old.reddit.com/r/news/", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  result = checkUrlShouldBeBlocked("https://www.reddit.com/r/news/comments/123", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
}

// Run the test
testRedditUseCase();
