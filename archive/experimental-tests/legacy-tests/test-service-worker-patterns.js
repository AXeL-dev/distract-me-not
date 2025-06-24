// Test script to verify the updated service worker pattern matching
// This script simulates the pattern matching behavior that the service worker would use

// Import the wildcardToRegExp function from the service worker
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
      // This will match sub.example.com but not notexample.com
      return new RegExp(`(?:^|\\.)(?:[^.]+\\.)*${domainPart}$`, 'i');
    }
    
    // For domain-only patterns, make it match the exact domain or as a subdomain
    // e.g., "example.com" matches "example.com" and "sub.example.com" but not "notexample.com"
    return new RegExp(`(?:^|\\.)(?:.*\\.)?${regexPattern}$`, 'i');
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
    
    // Create a regex that matches the domain and anything after the slash
    // This pattern will match any URL that has the specified domain AND a path component
    // It purposely does NOT match just the domain root without a trailing slash
    // e.g. "example.com/*" matches "example.com/anything" but NOT just "example.com"
    return new RegExp(`^(?:https?:\/\/)?${escapedDomain}\/[^/].+$`, 'i');
  }
  
  // Case 2: Domain with specific path pattern
  // Like https://www.example.com/path/* or example.com/path/to/*
  if (pattern.includes('/*')) {
    // Split into domain+path and wildcard parts
    const parts = pattern.split('/*');
    if (parts.length > 0) {
      const base = parts[0].replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      // Allow for protocol in URL
      return new RegExp(`^(?:https?:\/\/)?${base}\/.*$`, 'i');
    }
  }
  
  // Case 3: Special wildcard subdomain with specific path
  // Like *.example.com/path/*
  if (pattern.startsWith('*.') && pattern.includes('/')) {
    const domainEnd = pattern.indexOf('/');
    const domainPart = pattern.substring(2, domainEnd); // Remove *. prefix and get domain
    const pathPart = pattern.substring(domainEnd);
    
    const escapedDomain = domainPart.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    const escapedPath = pathPart.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*');
    
    return new RegExp(`^(?:https?:\/\/)?(?:[^\/]+\\.)?${escapedDomain}${escapedPath}$`, 'i');
  }
  
  // Case 4: Exact URL pattern (no wildcards)
  // Handle cases like "https://example.com" vs "https://example.com/"
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
      // Optionally match anything after the trailing slash and make protocol optional
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

// Test function for URL pattern matching
function testUrlMatch(url, pattern) {
  const regex = wildcardToRegExp(pattern);
  const isMatch = regex.test(url);
  
  console.log(`Testing URL: ${url} against pattern: ${pattern}`);
  console.log(`Regex: ${regex}`);
  console.log(`Result: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
  
  // Try also with hostname extraction
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const hostnameMatch = regex.test(hostname);
    console.log(`Hostname: ${hostname}`);
    console.log(`Hostname match: ${hostnameMatch ? 'MATCH' : 'NO MATCH'}`);
  } catch (e) {
    console.log(`URL parsing failed: ${e.message}`);
  }
  
  console.log("-------------------");
  return isMatch;
}

// Run tests specifically for Reddit.com scenarios
console.log("// Helper function to simulate checkUrlShouldBeBlocked logic
function simulateBlockCheck(url, allowList = [], denyList = []) {
  console.log(`\nSimulating block check for URL: ${url}`);
  console.log(`Allow list: ${JSON.stringify(allowList)}`);
  console.log(`Deny list: ${JSON.stringify(denyList)}`);
  
  // Check if URL is in allow list
  let isWhitelisted = false;
  let whitelistedBy = null;
  
  // Check against allow list
  for (const pattern of allowList) {
    const regex = wildcardToRegExp(pattern);
    if (regex.test(url)) {
      isWhitelisted = true;
      whitelistedBy = `Allow List pattern: ${pattern}`;
      console.log(`URL matches allow list pattern: ${pattern}`);
      break;
    }
  }
  
  if (isWhitelisted) {
    console.log(`RESULT: ALLOWED by ${whitelistedBy}`);
    return { blocked: false, reason: whitelistedBy };
  }
  
  // Check against deny list
  for (const pattern of denyList) {
    const regex = wildcardToRegExp(pattern);
    if (regex.test(url)) {
      console.log(`URL matches deny list pattern: ${pattern}`);
      console.log(`RESULT: BLOCKED by Deny List pattern: ${pattern}`);
      return { blocked: true, reason: `Deny List pattern: ${pattern}` };
    }
  }
  
  console.log(`RESULT: ALLOWED (no matching rules)`);
  return { blocked: false, reason: "URL allowed by default (no matching rules)" };
}

// Test the Reddit use case specifically
function testRedditUseCase() {
  console.log("\n=== TESTING REDDIT USE CASE ===");
  
  const allowList = ["reddit.com", "reddit.com/r/news/*"];
  const denyList = ["reddit.com/*"];
  
  // Test root domain (should be allowed)
  simulateBlockCheck("https://www.reddit.com", allowList, denyList);
  simulateBlockCheck("https://old.reddit.com", allowList, denyList);
  
  // Test subpaths (should be blocked except for /r/news/*)
  simulateBlockCheck("https://www.reddit.com/r/all", allowList, denyList);
  simulateBlockCheck("https://old.reddit.com/r/redheads", allowList, denyList);
  
  // Test allowed subpaths
  simulateBlockCheck("https://www.reddit.com/r/news", allowList, denyList);
  simulateBlockCheck("https://old.reddit.com/r/news/comments/123", allowList, denyList);
}

=== TESTING REDDIT.COM PATTERN MATCHING ===");

// Test 1: Basic domain pattern
console.log("\nTesting with pattern: reddit.com");
testUrlMatch("https://www.reddit.com", "reddit.com");
testUrlMatch("https://old.reddit.com", "reddit.com");
testUrlMatch("https://www.reddit.com/", "reddit.com");
testUrlMatch("https://www.reddit.com/r/all", "reddit.com");
testUrlMatch("https://notreddit.com", "reddit.com");

// Test 2: Domain with wildcard path pattern
console.log("\nTesting with pattern: reddit.com/*");
testUrlMatch("https://www.reddit.com", "reddit.com/*");
testUrlMatch("https://old.reddit.com", "reddit.com/*");
testUrlMatch("https://www.reddit.com/", "reddit.com/*");
testUrlMatch("https://www.reddit.com/r/all", "reddit.com/*");
testUrlMatch("https://www.reddit.com/r/redheads", "reddit.com/*");

// Test 3: Specific path allowlist
console.log("\nTesting with pattern: reddit.com/r/news/*");
testUrlMatch("https://www.reddit.com", "reddit.com/r/news/*");
testUrlMatch("https://www.reddit.com/r/news", "reddit.com/r/news/*");
testUrlMatch("https://www.reddit.com/r/news/", "reddit.com/r/news/*");
testUrlMatch("https://www.reddit.com/r/news/comments/123", "reddit.com/r/news/*");
testUrlMatch("https://www.reddit.com/r/redheads", "reddit.com/r/news/*");

// Test 3: Subdomain wildcard
console.log("\nTesting with pattern: *.reddit.com");
testUrlMatch("https://www.reddit.com", "*.reddit.com");
testUrlMatch("https://old.reddit.com", "*.reddit.com");
testUrlMatch("https://new.reddit.com/r/all", "*.reddit.com");
testUrlMatch("https://reddit.com", "*.reddit.com");

// Test 4: Domain with protocol
console.log("\nTesting with pattern: https://reddit.com");
testUrlMatch("https://reddit.com", "https://reddit.com");
testUrlMatch("http://reddit.com", "https://reddit.com");
testUrlMatch("https://www.reddit.com", "https://reddit.com");

// Test 5: Full URL pattern
console.log("\nTesting with pattern: https://www.reddit.com/r/news");
testUrlMatch("https://www.reddit.com/r/news", "https://www.reddit.com/r/news");
testUrlMatch("https://www.reddit.com/r/news/", "https://www.reddit.com/r/news");
testUrlMatch("https://www.reddit.com/r/news/comments", "https://www.reddit.com/r/news");
