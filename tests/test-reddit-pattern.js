// Test script for Reddit URL pattern matching

// Copy of the wildcardToRegExp function from the service worker
function wildcardToRegExp(pattern) {
  // First, normalize pattern to lowercase for case-insensitive matching
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
  
  // For patterns with a specified path or protocol, do standard wildcard conversion
  const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  const regexPattern = escaped.replace(/\*/g, '.*');
  return new RegExp(`^${regexPattern}$`, 'i');
}

// Function to test URL matching
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
  
  return isMatch;
}

// Test various Reddit URLs against different patterns
console.log("=== TESTING REDDIT PATTERN MATCHING ===");

// Test with the pattern from the user
console.log("\nTesting with pattern: https://www.reddit.com/*");
testUrlMatch("https://www.reddit.com/", "https://www.reddit.com/*");
testUrlMatch("https://www.reddit.com/r/all", "https://www.reddit.com/*");
testUrlMatch("https://old.reddit.com/", "https://www.reddit.com/*");

// Test with domain-only pattern
console.log("\nTesting with pattern: reddit.com");
testUrlMatch("https://www.reddit.com/", "reddit.com");
testUrlMatch("https://www.reddit.com/r/all", "reddit.com");
testUrlMatch("https://old.reddit.com/", "reddit.com");

// Test with wildcard domain pattern
console.log("\nTesting with pattern: *.reddit.com");
testUrlMatch("https://www.reddit.com/", "*.reddit.com");
testUrlMatch("https://www.reddit.com/r/all", "*.reddit.com");
testUrlMatch("https://old.reddit.com/", "*.reddit.com");

// Test with both domain and path wildcards
console.log("\nTesting with pattern: *.reddit.com/*");
testUrlMatch("https://www.reddit.com/", "*.reddit.com/*");
testUrlMatch("https://www.reddit.com/r/all", "*.reddit.com/*");
testUrlMatch("https://old.reddit.com/", "*.reddit.com/*");

console.log("=== END TESTING ===");
