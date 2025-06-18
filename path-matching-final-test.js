/**
 * Distract-Me-Not Final Pattern Matching Test
 * 
 * This file tests the final version of pattern matching logic, focusing 
 * specifically on the subdomain + path matching issues that were previously failing.
 */

// Helper function to parse URLs for testing
function parseURL(url) {
  let hostname = "";
  let parsedPath = "";
  
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname.toLowerCase();
    parsedPath = parsedUrl.pathname;
    console.log(`URL parsed: hostname=${hostname}, path=${parsedPath}`);
  } catch (e) {
    console.log(`URL parsing failed, will use full URL: ${e.message}`);
  }
  
  return { hostname, parsedPath };
}

// Fixed version of wildcardToRegExp
function wildcardToRegExp(pattern) {
  // First, normalize pattern to lowercase for case-insensitive matching
  pattern = pattern.toLowerCase().trim();
  
  // Special case: empty pattern
  if (!pattern) {
    return new RegExp("^$", 'i');
  }

  // Special handling for patterns like https://*.domain.com/* which have both subdomain wildcards and path wildcards
  if (pattern.includes('://*.') && pattern.includes('/')) {
    try {
      // Extract protocol and domain parts
      const parts = pattern.split('://');
      const protocol = parts[0]; // e.g. "https"
      const domainAndPath = parts[1]; // e.g. "*.redgifs.com/*"
      
      // Extract domain without wildcard and path
      const domainPathSplit = domainAndPath.indexOf('/');
      const wildcardDomain = domainAndPath.substring(0, domainPathSplit); // e.g. "*.redgifs.com"
      const pathPart = domainAndPath.substring(domainPathSplit); // e.g. "/*" or "/r/hoggit/*"
      
      if (wildcardDomain.startsWith('*.')) {
        const domain = wildcardDomain.substring(2); // e.g. "redgifs.com"
        const escapedDomain = domain.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
        
        // For paths with wildcards, be more specific about the path matching
        if (pathPart.includes('*')) {
          // Extract the path before the wildcard
          const pathBeforeWildcard = pathPart.split('*')[0];
          const escapedPathBase = pathBeforeWildcard.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
          
          // Make sure we match the EXACT path prefix before wildcards
          // For example, https://*.reddit.com/r/hoggit/* should match only /r/hoggit/* paths
          if (pathPart !== '/*') {
            // This will match ONLY if the path starts with the exact path prefix
            return new RegExp(`^(?:${protocol}:\\/\\/)?(?:[^.\\/]+\\.)+${escapedDomain}${escapedPathBase}.*$`, 'i');
          } else {
            // Generic path wildcard - match any path on subdomain
            return new RegExp(`^(?:${protocol}:\\/\\/)?(?:[^.\\/]+\\.)+${escapedDomain}\\/.*$`, 'i');  
          }
        } else {
          // For exact paths without wildcards
          const escapedPath = pathPart.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
          return new RegExp(`^(?:${protocol}:\\/\\/)?(?:[^.\\/]+\\.)+${escapedDomain}${escapedPath}$`, 'i');
        }
      }
      
      // Fallback for other cases
      const escapedPattern = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
                               .replace(/\*/g, '.*');
      return new RegExp(`^${escapedPattern}$`, 'i');
    } catch (e) {
      console.error('Error processing complex pattern:', pattern, e);
      // Fallback to a simple pattern
      const escapedPattern = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
                               .replace(/\*/g, '.*');
      return new RegExp(`^${escapedPattern}$`, 'i');
    }
  }
  
  // Other cases remain the same as in the service worker...
  // (simplified for this test)
  
  // Standard pattern with wildcards
  const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  const regexPattern = escaped.replace(/\*/g, '.*');
  
  // Make protocol optional if not specified
  if (pattern.includes('://')) {
    return new RegExp(`^${regexPattern}$`, 'i');
  } else {
    return new RegExp(`^(?:https?:\/\/)?${regexPattern}$`, 'i');
  }
}

// Fixed checkSpecificPathMatch function to correctly handle path matching
function checkSpecificPathMatch(url, pattern) {
  try {
    const { hostname, parsedPath } = parseURL(url);
    const regex = wildcardToRegExp(pattern);
    
    console.log(`Testing specific path match for "${url}" against pattern: "${pattern}" (${regex})`);
    
    // Extract the domain part from the pattern for strict checking
    let patternDomain = '';
    let patternPath = '';
    let isSubdomainPattern = false;
    
    try {
      if (pattern.includes('://*.')) {
        // Protocol with wildcard subdomain
        const parts = pattern.split('://');
        const domainAndPath = parts[1];
        const domainPathSplit = domainAndPath.indexOf('/');
        const wildcardDomain = domainAndPath.substring(0, domainPathSplit);
        patternDomain = wildcardDomain.substring(2); // Remove *.
        patternPath = domainAndPath.substring(domainPathSplit);
        isSubdomainPattern = true;
      } 
      else if (pattern.startsWith('*.')) {
        // No protocol, but with wildcard subdomain
        const domainPathSplit = pattern.indexOf('/');
        if (domainPathSplit > -1) {
          patternDomain = pattern.substring(2, domainPathSplit);
          patternPath = pattern.substring(domainPathSplit);
        } else {
          patternDomain = pattern.substring(2);
          patternPath = '';
        }
        isSubdomainPattern = true;
      }
      else if (pattern.includes('://')) {
        // Protocol without wildcard
        const dummyPattern = pattern.replace(/\*/g, 'dummy');
        const parsedPattern = new URL(dummyPattern);
        patternDomain = parsedPattern.hostname.toLowerCase();
        patternPath = parsedPattern.pathname;
      } 
      else if (pattern.includes('/')) {
        // No protocol but has a path
        patternDomain = pattern.split('/')[0].toLowerCase();
        patternPath = '/' + pattern.split('/').slice(1).join('/');
      } 
      else {
        // Just a domain
        patternDomain = pattern.toLowerCase();
      }
      
      console.log(`Pattern domain: "${patternDomain}", Pattern path: "${patternPath}", Is subdomain pattern: ${isSubdomainPattern}`);
    } catch (e) {
      console.error('Error extracting domain from pattern:', e);
      return false;
    }
    
    // Domain matching logic
    let domainMatches = false;
    
    if (isSubdomainPattern) {
      // For subdomain patterns like *.reddit.com, require an actual subdomain
      // hostname must end with the domain part and have at least one subdomain component
      domainMatches = hostname.endsWith('.' + patternDomain) && 
                      hostname !== patternDomain;
      
      console.log(`Subdomain check: ${hostname} against ${patternDomain}, matches: ${domainMatches}`);
    } else {
      // For regular domains, match exact or with subdomains
      domainMatches = hostname === patternDomain || 
                     hostname.endsWith('.' + patternDomain);
      
      console.log(`Domain check: ${hostname} against ${patternDomain}, matches: ${domainMatches}`);
    }
    
    // If domain doesn't match, no need to check paths
    if (!domainMatches) {
      console.log(`Domain doesn't match, returning false`);
      return false;
    }
    
    // For path matching with wildcards
    if (patternPath && patternPath.includes('*')) {
      // Get the base path before the wildcard
      const pathBase = patternPath.split('*')[0];
      
      // Check if URL path matches the specific pattern path prefix
      let pathMatches = false;
      
      if (parsedPath) {
        // For patterns like "reddit.com/r/askscience/*"
        // Check if the path starts with the specific pattern path or is exactly the pattern path
        
        // For patterns like "https://*.reddit.com/r/hoggit/*" we need more precise path matching
        if (pattern.endsWith('/*')) {
          // If the pattern ends with /* (e.g., reddit.com/r/askscience/*),
          // extract the path component before the /* and check if URL path starts with it
          const pathWithoutWildcard = pathBase;  // Already split above
          
          // Check for exact match or if URL path starts with the pattern path
          // Need to handle trailing slashes properly
          const normalizedURLPath = parsedPath.endsWith('/') ? parsedPath : parsedPath + '/';
          const normalizedPatternPath = pathWithoutWildcard.endsWith('/') ? 
                                       pathWithoutWildcard : pathWithoutWildcard + '/';
          
          // A match occurs if:
          // 1. The URL path is exactly the path pattern without the wildcard
          // 2. The URL path is exactly the path pattern with an added trailing slash
          // 3. The URL path starts with the path pattern + '/'
          pathMatches = parsedPath === pathWithoutWildcard ||
                       normalizedURLPath.startsWith(normalizedPatternPath);
          
          console.log(`Path check for wildcard pattern: URL=${parsedPath}, Pattern base=${pathWithoutWildcard}, Matches=${pathMatches}`);
          console.log(`Normalized comparison: URL=${normalizedURLPath}, Pattern=${normalizedPatternPath}`);
        } else {
          // For other patterns, be more flexible with trailing slashes
          pathMatches = parsedPath === pathBase || 
                        parsedPath === (pathBase.endsWith('/') ? pathBase : pathBase + '/') || 
                        parsedPath.startsWith(pathBase.endsWith('/') ? pathBase : pathBase + '/');
        }
        
        console.log(`Path check: ${parsedPath} against base ${pathBase}, matches: ${pathMatches}`);
      }
      
      // Return true only if both domain and path match
      const result = domainMatches && pathMatches;
      console.log(`Final specific path match result: ${result} (domain: ${domainMatches}, path: ${pathMatches})`);
      return result;
    } else if (patternPath) {
      // Exact path matching without wildcards
      const pathMatches = parsedPath === patternPath || 
                         (patternPath.endsWith('/') ? parsedPath === patternPath.slice(0, -1) : 
                          parsedPath === patternPath + '/');
      
      console.log(`Exact path check: ${parsedPath} against ${patternPath}, matches: ${pathMatches}`);
      
      // Return true only if both domain and path match
      return domainMatches && pathMatches;
    }
    
    // If we have only a domain pattern, just check domain
    console.log(`Domain-only pattern, returning domain match: ${domainMatches}`);
    return domainMatches;
  } catch (e) {
    console.error(`Error in checkSpecificPathMatch for pattern ${pattern}: ${e.message}`);
    return false;
  }
}

// Run specific test cases that were failing
console.log("=== TESTING SPECIFIC PATH MATCHING CASES ===");

// Test case for the failing test: "Specific allow pattern should not allow different domain with same path"
function testSpecificAllowPattern() {
  console.log("\n1. TEST: Specific allow pattern should not allow different domain with same path");
  console.log("URL: https://www.reddit.com/r/cars/");
  console.log("Pattern: https://*.reddit.com/r/hoggit/*");
  console.log("Expected: Pattern should NOT match URL");
  
  const result = checkSpecificPathMatch("https://www.reddit.com/r/cars/", "https://*.reddit.com/r/hoggit/*");
  console.log(`Result: ${result ? "MATCHED (wrong)" : "DID NOT MATCH (correct)"}`);
}

// Test case for the correct path matching
function testCorrectPathMatching() {
  console.log("\n2. TEST: Correct domain and path should be allowed");
  console.log("URL: https://www.reddit.com/r/hoggit/comments");
  console.log("Pattern: https://*.reddit.com/r/hoggit/*");
  console.log("Expected: Pattern SHOULD match URL");
  
  const result = checkSpecificPathMatch("https://www.reddit.com/r/hoggit/comments", "https://*.reddit.com/r/hoggit/*");
  console.log(`Result: ${result ? "MATCHED (correct)" : "DID NOT MATCH (wrong)"}`);
}

// Test Twitter account pattern
function testTwitterAccount() {
  console.log("\n3. TEST: Twitter account pattern matching");
  console.log("URL: https://twitter.com/NASA");
  console.log("Pattern: twitter.com/NASA/*");
  console.log("Expected: Pattern SHOULD match URL");
  
  const result = checkSpecificPathMatch("https://twitter.com/NASA", "twitter.com/NASA/*");
  console.log(`Result: ${result ? "MATCHED (correct)" : "DID NOT MATCH (wrong)"}`);
}

// Test Reddit subreddit pattern
function testRedditSubreddit() {
  console.log("\n4. TEST: Reddit subreddit pattern matching");
  console.log("URL: https://www.reddit.com/r/askscience");
  console.log("Pattern: reddit.com/r/askscience/*");
  console.log("Expected: Pattern SHOULD match URL");
  
  const result = checkSpecificPathMatch("https://www.reddit.com/r/askscience", "reddit.com/r/askscience/*");
  console.log(`Result: ${result ? "MATCHED (correct)" : "DID NOT MATCH (wrong)"}`);
}

// Run all specific tests
console.log("=== FOCUSED PATH MATCHING TEST RESULTS ===");
testSpecificAllowPattern();
testCorrectPathMatching();
testTwitterAccount();
testRedditSubreddit();
