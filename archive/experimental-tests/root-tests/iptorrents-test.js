/**
 * Test specific case matching for IPTorrents domain
 */

// Import the wildcardToRegExp function
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
      const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`${escaped}(?:[^/]*)?`, 'i');
    } else {
      const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      
      if (!escaped.includes('/') && !escaped.includes(':')) {
        return new RegExp(`(^|\\.)${escaped}$`, 'i');
      }
      
      if (escaped.indexOf('/') > 0 && !escaped.includes('://')) {
        return new RegExp(escaped, 'i');
      }
      
      return new RegExp(escaped, 'i');
    }
  }
  
  // Handle other patterns with wildcards
  let regexPattern = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  regexPattern = regexPattern.replace(/\*/g, '.*');
  
  if (pattern.includes('://')) {
    return new RegExp(`^${regexPattern}`, 'i');
  } else {
    if (!pattern.includes('/')) {
      return new RegExp(regexPattern, 'i');
    }
    return new RegExp(regexPattern, 'i');
  }
}

// Direct hostname comparison test (simulating the direct comparison in checkUrlShouldBeBlocked)
function testDirectHostnameMatch(hostname, pattern) {
  const patternLower = pattern.toLowerCase().trim();
  
  // Direct domain comparison (very reliable)
  const directMatch = hostname === patternLower || hostname.endsWith('.' + patternLower);
  console.log(`Direct hostname test: '${hostname}' against pattern: '${pattern}'`);
  console.log(`Normalized pattern: '${patternLower}'`);
  console.log(`Result: ${directMatch ? 'MATCH' : 'NO MATCH'}`);
  return directMatch;
}

// Regex-based hostname matching test
function testRegexHostnameMatch(hostname, pattern) {
  const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$$/g, ''));
  const match = regexPattern.test(hostname);
  console.log(`Regex hostname test: '${hostname}' against pattern: '${pattern}'`);
  console.log(`Regex pattern: ${regexPattern}`);
  console.log(`Result: ${match ? 'MATCH' : 'NO MATCH'}`);
  return match;
}

// Full URL match test
function testFullUrlMatch(url, pattern) {
  const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$$/g, ''));
  const match = regexPattern.test(url);
  console.log(`Full URL test: '${url}' against pattern: '${pattern}'`);
  console.log(`Regex pattern: ${regexPattern}`);
  console.log(`Result: ${match ? 'MATCH' : 'NO MATCH'}`);
  return match;
}

// Output extracted hostname from URL
function getHostnameTest(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    console.log(`URL: ${url}`);
    console.log(`Extracted hostname: ${hostname}`);
    return hostname;
  } catch (e) {
    console.log(`URL parsing failed: ${e.message}`);
    return null;
  }
}

// Run the tests
console.log("=== IPTORRENTS SPECIFIC CASE TESTING ===\n");

// Test URLs
const urls = [
  "https://iptorrents.com",
  "https://iptorrents.com/t",
  "https://iptorrents.com/t?p=8#torrents",
  "https://www.iptorrents.com/t",
  "http://IPtorrents.com/t",
  "https://IPTORRENTS.COM/t",
  "https://iptorrents.com/torrents"
];

// Test patterns
const patterns = [
  "iptorrents.com",
  "IPTorrents.com",
  "IPTORRENTS.COM",
  "*.iptorrents.com"
];

// Test hostname extraction
console.log("=== HOSTNAME EXTRACTION ===");
urls.forEach(url => {
  getHostnameTest(url);
  console.log("----------------------------");
});

// Test direct hostname matching
console.log("\n=== DIRECT HOSTNAME MATCHING ===");
urls.forEach(url => {
  const hostname = getHostnameTest(url);
  if (hostname) {
    patterns.forEach(pattern => {
      testDirectHostnameMatch(hostname, pattern);
      console.log("----------------------------");
    });
  }
});

// Test regex hostname matching
console.log("\n=== REGEX HOSTNAME MATCHING ===");
urls.forEach(url => {
  const hostname = getHostnameTest(url);
  if (hostname) {
    patterns.forEach(pattern => {
      testRegexHostnameMatch(hostname, pattern);
      console.log("----------------------------");
    });
  }
});

// Test full URL matching
console.log("\n=== FULL URL MATCHING ===");
urls.forEach(url => {
  patterns.forEach(pattern => {
    testFullUrlMatch(url, pattern);
    console.log("----------------------------");
  });
});

console.log("=== END TESTING ===");
