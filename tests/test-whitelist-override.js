/**
 * Test for whitelist overriding blacklist keywords
 * 
 * This script tests if a site in the whitelist will be allowed
 * even when it contains a keyword from the blacklist.
 */

// Mock functions needed for testing
function logInfo(msg) {
  console.log(`[INFO] ${msg}`);
}

function logError(msg, err) {
  console.error(`[ERROR] ${msg}`, err);
}

// Extract the wildcardToRegExp function from the service worker
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
  
  // Handle patterns with wildcards
  const hasWildcard = pattern.includes('*');
  
  // For patterns without wildcards, we want to be more exact in matching
  if (!hasWildcard) {
    // Check if pattern is a base domain/path that should only match itself or direct children
    if (pattern.endsWith('/')) {
      const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`${escaped}(?:[^/]*)?$`, 'i');
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

// Simplified version of checkUrlShouldBeBlocked to test whitelist overriding blacklist
function testWhitelistOverride(url, whitelistPatterns, blacklistKeywords, mode = 'blacklist') {
  console.log(`\nTesting URL: ${url}`);
  console.log(`Mode: ${mode}`);
  console.log(`Whitelist: ${JSON.stringify(whitelistPatterns)}`);
  console.log(`Blacklist Keywords: ${JSON.stringify(blacklistKeywords)}`);
  
  // Parse URL for hostname matching
  let hostname = "";
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname.toLowerCase();
    console.log(`Extracted hostname: ${hostname}`);
  } catch (e) {
    console.log(`URL parsing failed, using full URL: ${e.message}`);
  }
  
  // Check if URL is whitelisted
  let isWhitelisted = false;
  let whitelistedBy = null;
  
  // Check patterns in whitelist
  for (const pattern of whitelistPatterns) {
    try {
      const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$/g, ''));
      
      // Try to match both full URL and hostname
      if (regexPattern.test(url) || (hostname && regexPattern.test(hostname))) {
        console.log(`URL MATCHED whitelist pattern: ${pattern}`);
        isWhitelisted = true;
        whitelistedBy = `Whitelist pattern: ${pattern}`;
        break;
      }
    } catch (e) {
      console.error('Error checking whitelist pattern:', e);
    }
  }
  
  // If URL is explicitly whitelisted, always allow regardless of mode or blacklist
  if (isWhitelisted) {
    console.log(`RESULT: ALLOWED - URL is whitelisted by: ${whitelistedBy}`);
    return { blocked: false, reason: whitelistedBy };
  }
  
  // Check keywords in blacklist
  for (const keyword of blacklistKeywords) {
    const normalizedUrl = url.toLowerCase();
    const normalizedKeyword = keyword.toLowerCase();
    
    if (normalizedUrl.includes(normalizedKeyword) || 
        (hostname && hostname.includes(normalizedKeyword))) {
      console.log(`URL contains blacklist keyword: ${keyword}`);
      console.log('RESULT: BLOCKED - URL contains blacklist keyword');
      return { blocked: true, reason: `Blacklist keyword: ${keyword}` };
    }
  }
  
  console.log('RESULT: ALLOWED - No matching rules');
  return { blocked: false, reason: "No matching rules" };
}

// Run tests
console.log("=== WHITELIST OVERRIDE TEST ===");

// Test 1: Site with blacklisted keyword in whitelist
const result1 = testWhitelistOverride(
  'https://fitgirl-repacks.site/game/', 
  ['fitgirl-repacks.site'], 
  ['girl']
);

// Test 2: Site with blacklisted keyword NOT in whitelist
const result2 = testWhitelistOverride(
  'https://somegirls.com/page/', 
  ['fitgirl-repacks.site'], 
  ['girl']
);

// Test 3: Site with blacklisted keyword in whitelist with different case
const result3 = testWhitelistOverride(
  'https://FITGIRL-repacks.site/game/', 
  ['fitgirl-repacks.site'], 
  ['girl']
);

// Test 4: Test in combined mode
const result4 = testWhitelistOverride(
  'https://fitgirl-repacks.site/game/', 
  ['fitgirl-repacks.site'], 
  ['girl'],
  'combined'
);

console.log("\n=== SUMMARY ===");
console.log(`Test 1: ${result1.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result1.reason}`);
console.log(`Test 2: ${result2.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result2.reason}`);
console.log(`Test 3: ${result3.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result3.reason}`);
console.log(`Test 4: ${result4.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result4.reason}`);
console.log("=== END TESTING ===");
