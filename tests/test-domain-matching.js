/**
 * Test domain matching patterns
 * 
 * This file contains test cases for the wildcardToRegExp function
 * to verify it correctly handles domain patterns.
 */

// Import the improved wildcardToRegExp function from the service worker file
function wildcardToRegExp(pattern) {
  // First, normalize pattern to lowercase for case-insensitive matching
  // We'll still use the 'i' flag, but this helps with pre-processing
  pattern = pattern.toLowerCase().trim();
  
  // Detect if this is likely a domain-only pattern (no protocol, no path)
  const isDomainOnly = !pattern.includes('://') && !pattern.includes('/');
  
  // Handle domain-only patterns specially
  if (isDomainOnly) {
    // First, escape any regex special characters
    const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    
    // Replace wildcards with appropriate regex
    const regexPattern = escaped.replace(/\*/g, '.*');
    
    // Special case for *.domain.com to match both domain.com and subdomains
    if (pattern.startsWith('*.')) {
      const domainPart = escaped.substring(2); // Remove *. prefix
      return new RegExp(`(^|\\.)${domainPart}$`, 'i');
    }
    
    // For domain-only patterns, make the regex match either the full domain
    // or as a subdomain suffix (e.g., "example.com" matches "example.com" and "sub.example.com")
    return new RegExp(`(^|\\.)${regexPattern}$`, 'i');
  }
  
  // Handle patterns with wildcards
  const hasWildcard = pattern.includes('*');
  
  // For patterns without wildcards, we want to be more exact in matching
  if (!hasWildcard) {
    // Check if pattern is a base domain/path that should only match itself or direct children
    if (pattern.endsWith('/')) {
      // For patterns ending with slash like "example.com/", 
      // match the exact URL or direct children path segments (but not deeper paths)
      const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`${escaped}(?:[^/]*)?`, 'i');
    } else {
      // For exact patterns like "example.com/page", match the URL
      const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      
      // If it looks like just a domain, make it more flexible for matching
      if (!escaped.includes('/') && !escaped.includes(':')) {
        // Match domain name with proper domain boundaries
        return new RegExp(`(^|\\.)${escaped}$`, 'i');
      }
      
      // For paths, be more flexible in matching
      if (escaped.indexOf('/') > 0 && !escaped.includes('://')) {
        return new RegExp(escaped, 'i');
      }
      
      return new RegExp(escaped, 'i');
    }
  }
  
  // Handle other patterns with wildcards
  let regexPattern = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  regexPattern = regexPattern.replace(/\*/g, '.*');
  
  // For URL patterns with protocol, anchor to the start
  if (pattern.includes('://')) {
    return new RegExp(`^${regexPattern}`, 'i');
  } else {
    // For non-protocol patterns, improve domain matching
    if (!pattern.includes('/')) {
      // Don't anchor at the start or end for better domain matching
      return new RegExp(regexPattern, 'i');
    }
    return new RegExp(regexPattern, 'i');
  }
}

// Utility function for testing URL matching
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
  
  console.log("----------------------------");
  return isMatch;
}

// Test function to run all the cases
function runTests() {
  console.log("=== TESTING DOMAIN MATCHING ===\n");
  
  // Test with iptorrents.com
  testUrlMatch("https://iptorrents.com/t", "iptorrents.com");
  testUrlMatch("https://iptorrents.com/t?p=8#torrents", "iptorrents.com");
  testUrlMatch("https://www.iptorrents.com/t", "iptorrents.com");
  
  // Test with wildcards
  testUrlMatch("https://sub.example.com/page", "*.example.com");
  testUrlMatch("https://example.com/page", "*.example.com"); // Should match now
  
  // Test with uppercase/lowercase
  testUrlMatch("https://IPTORRENTS.COM/t", "iptorrents.com");
  
  // Test with different protocols
  testUrlMatch("http://iptorrents.com/t", "iptorrents.com");
  testUrlMatch("https://iptorrents.com/t", "http://iptorrents.com");
  testUrlMatch("https://iptorrents.com/t", "https://iptorrents.com");
  
  // Test with path matching
  testUrlMatch("https://example.com/path1/path2", "example.com/path1");
  testUrlMatch("https://example.com/path1", "example.com/path1");
  testUrlMatch("https://example.com/path1/subdir", "example.com/path1/*");
  
  // Additional tests for problematic domains
  testUrlMatch("https://facebook.com/", "facebook.com");
  testUrlMatch("https://www.facebook.com/", "facebook.com");
  testUrlMatch("https://m.facebook.com/", "facebook.com");
  
  // Testing subdomain boundaries
  testUrlMatch("https://myfacebook.com/", "facebook.com");  // Should NOT match
  testUrlMatch("https://facebook.com.malicious.com/", "facebook.com");  // Should NOT match
  
  // Test wildcard domain matching with explicit subdomains
  testUrlMatch("https://a.b.example.com/", "*.example.com");
  testUrlMatch("https://example.com/", "*.example.com");  // Should match with our improvements
  
  // Path testing
  testUrlMatch("https://example.com/path/to/page", "example.com/path");
  testUrlMatch("https://example.com/path/", "example.com/path");
  testUrlMatch("https://example.com/pathname", "example.com/path");  // Should NOT match
  
  console.log("=== END TESTING ===");
}

// Run the tests
runTests();
