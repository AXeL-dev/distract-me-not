// Test script for generalized URL pattern matching
// This script verifies that our pattern matching works for all sites, not just Reddit

// Updated wildcardToRegExp function with better handling of URLs
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
    
    // Special case for *.domain.com to match both domain.com and subdomains
    if (pattern.startsWith('*.')) {
      const domainPart = regexPattern.substring(2); // Remove *. prefix
      // Match domain or subdomains, handling full URLs too
      return new RegExp(`(?:https?:\/\/)?(?:.*\\.)?${domainPart}(?:\/.*)?$`, 'i');
    }
    
    // For domain-only patterns, match the domain in full URLs or as hostname
    // This allows "example.com" to match "https://example.com" and "https://example.com/any/path"
    return new RegExp(`(?:https?:\/\/)?(?:www\\.)?${regexPattern}(?:\/.*)?$`, 'i');
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
    return new RegExp(`(?:https?:\/\/)?${escapedDomain}\/[^/].+$`, 'i');
  }
    // Case 2: Domain with specific path pattern
  // Like https://www.example.com/path/* or example.com/path/to/*
  if (pattern.includes('/*')) {
    // Split into domain+path and wildcard parts
    const parts = pattern.split('/*');
    if (parts.length > 0) {
      const base = parts[0].replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      // Allow for protocol in URL
      return new RegExp(`(?:https?:\/\/)?${base}\/.*$`, 'i');
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
    
    return new RegExp(`(?:https?:\/\/)?(?:[^\/]+\\.)?${escapedDomain}${escapedPath}$`, 'i');
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
        return new RegExp(`(?:https?:\/\/)?${escaped}$`, 'i');
      }
    }
    // URL with trailing slash should match the exact URL or anything under that path
    else {
      // Optionally match anything after the trailing slash and make protocol optional
      if (pattern.includes('://')) {
        return new RegExp(`^${escaped}.*$`, 'i');
      } else {
        return new RegExp(`(?:https?:\/\/)?${escaped}.*$`, 'i');
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
    return new RegExp(`(?:https?:\/\/)?${regexPattern}$`, 'i');
  }
}

// Test function for URL matching
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

// Test various URLs against different patterns
console.log("=== TESTING GENERIC PATTERN MATCHING ===");

// Test 1: Domain-only pattern
console.log("\nTESTING DOMAIN-ONLY PATTERNS");
console.log("\nTesting with pattern: example.com");
testUrlMatch("https://example.com", "example.com");
testUrlMatch("https://example.com/", "example.com");
testUrlMatch("https://example.com/path", "example.com");
testUrlMatch("https://sub.example.com", "example.com");
testUrlMatch("https://notexample.com", "example.com");

// Test 2: Domain with wildcard pattern
console.log("\nTESTING DOMAIN WITH WILDCARD PATH");
console.log("\nTesting with pattern: example.com/*");
testUrlMatch("https://example.com", "example.com/*");
testUrlMatch("https://example.com/", "example.com/*");
testUrlMatch("https://example.com/path", "example.com/*");
testUrlMatch("https://sub.example.com", "example.com/*");
testUrlMatch("https://sub.example.com/path", "example.com/*");

// Test 3: Subdomain wildcard pattern
console.log("\nTESTING SUBDOMAIN WILDCARD");
console.log("\nTesting with pattern: *.example.com");
testUrlMatch("https://example.com", "*.example.com");
testUrlMatch("https://sub.example.com", "*.example.com");
testUrlMatch("https://sub.sub.example.com", "*.example.com");
testUrlMatch("https://notexample.com", "*.example.com");

// Test 4: Specific path whitelisting
console.log("\nTESTING SPECIFIC PATH WHITELISTING");
console.log("\nTesting with pattern: example.com/allowed/*");
testUrlMatch("https://example.com", "example.com/allowed/*");
testUrlMatch("https://example.com/allowed", "example.com/allowed/*");
testUrlMatch("https://example.com/allowed/", "example.com/allowed/*");
testUrlMatch("https://example.com/allowed/page", "example.com/allowed/*");
testUrlMatch("https://example.com/blocked", "example.com/allowed/*");

// Test 5: Social media examples
console.log("\nTESTING SOCIAL MEDIA EXAMPLES");
console.log("\nTesting with pattern: twitter.com");
testUrlMatch("https://twitter.com", "twitter.com");
testUrlMatch("https://twitter.com/username", "twitter.com");

console.log("\nTesting with pattern: twitter.com/*");
testUrlMatch("https://twitter.com", "twitter.com/*");
testUrlMatch("https://twitter.com/", "twitter.com/*");
testUrlMatch("https://twitter.com/username", "twitter.com/*");

console.log("\nTesting with pattern: facebook.com/groups/*");
testUrlMatch("https://facebook.com", "facebook.com/groups/*");
testUrlMatch("https://facebook.com/groups", "facebook.com/groups/*");
testUrlMatch("https://facebook.com/groups/", "facebook.com/groups/*");
testUrlMatch("https://facebook.com/groups/mygroup", "facebook.com/groups/*");
testUrlMatch("https://facebook.com/marketplace", "facebook.com/groups/*");

// Test 6: Mixed case examples
console.log("\nTESTING CASE INSENSITIVITY");
console.log("\nTesting with pattern: ExAmPle.Com/*");
testUrlMatch("https://example.com/path", "ExAmPle.Com/*");
testUrlMatch("https://EXAMPLE.COM/PATH", "ExAmPle.Com/*");
