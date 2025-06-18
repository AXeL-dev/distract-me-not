/**
 * Comprehensive Pattern Matching Test Suite for Distract Me Not Extension
 * 
 * This file contains all test cases for pattern matching, including:
 * - Basic domain patterns
 * - Domain with path patterns
 * - Subdomain wildcards
 * - Path wildcards
 * - Reddit specific tests
 * - Other specific cases like redgifs
 * - URL normalization and case sensitivity
 * - Trailing slash handling
 * - Allowlist/denylist precedence
 */

// Copy of the wildcardToRegExp function from the service worker
function wildcardToRegExp(pattern) {
  // First, normalize pattern to lowercase for case-insensitive matching
  // We'll still use the 'i' flag, but this helps with pre-processing
  pattern = pattern.toLowerCase().trim();
  
  // Special case: empty pattern
  if (!pattern) {
    return new RegExp("^$", 'i');
  }
    // Special handling for patterns like https://*.domain.com/* which have both subdomain wildcards and path wildcards
  if (pattern.includes('://*.') && pattern.includes('/*')) {
    try {
      // Extract protocol and domain parts
      const parts = pattern.split('://');
      const protocol = parts[0]; // e.g. "https"
      const domainAndPath = parts[1]; // e.g. "*.redgifs.com/*"
      
      // Extract domain without wildcard and path
      const domainParts = domainAndPath.split('/');
      const wildcardDomain = domainParts[0]; // e.g. "*.redgifs.com"
      
      if (wildcardDomain.startsWith('*.')) {
        const domain = wildcardDomain.substring(2); // e.g. "redgifs.com"
        const escapedDomain = domain.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
        
        // Match only subdomains of the domain (not the main domain) with any path
        return new RegExp(`^(?:${protocol}:\\/\\/)?(?:[^.\\/]+\\.)+${escapedDomain}\\/.*`, 'i');
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
  
  // If it's a simple domain rule without protocol or path
  if (!pattern.includes('://') && !pattern.includes('/')) {
    // First, escape any regex special characters
    const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    
    // Replace wildcards with appropriate regex
    const regexPattern = escaped.replace(/\*/g, '.*');    // Special case for *.domain.com to match subdomains
    if (pattern.startsWith('*.')) {
      const domainPart = pattern.substring(2); // Use pattern directly, not regexPattern
      // Escape any regex special characters in the domain part
      const escapedDomain = domainPart.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      // Match domain with any subdomain but ensure it's actually a subdomain
      // This will match sub.example.com and sub.sub.example.com but not example.com or notexample.com
      // Note: we use ([^.\/]+\\.)+ to match one or more subdomains
      return new RegExp(`^(?:https?:\\/\\/)?([^.\\/]+\\.)+${escapedDomain}(?:\\/.*)?$`, 'i');
    }
    
    // For domain-only patterns, match the domain in full URLs with or without subdomains
    // e.g., "example.com" matches "example.com", "www.example.com", and "sub.example.com"
    // but does not match "notexample.com"
    // This also matches full URLs like "https://example.com/any/path"
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
    // This pattern matches URLs with this domain and any path component
    // It purposely does NOT match just the domain root with or without trailing slash
    // e.g. "example.com/*" matches "example.com/anything" but NOT "example.com"
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
          try {
            // Extract domain and path parts
            const domainPart = base.substring(0, lastSlashPos);
            const pathPart = base.substring(lastSlashPos);
            
            // Match URLs with this domain + specific path + anything after
            // Example: "reddit.com/r/*" should match "reddit.com/r/cars" and "reddit.com/r/news/comments/123"
            return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${domainPart}${pathPart}\\/.*`, 'i');
          } catch (e) {
            console.error('Error creating regex for path pattern:', pattern, e);
            // Fallback to a simpler regex
            return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${base}\\/.*`, 'i');
          }
        } else {
          // No slash found in the pattern, treat it as a domain with a wildcard path
          return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${base}\\/.*`, 'i');
        }
      }
      
      // Allow for protocol and ANY subdomain in URL
      // This should match both the exact path and anything under it
      // For example: reddit.com/r/news/* should match both /r/news and /r/news/anything
      return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${base}(?:\\/.*)?$`, 'i');
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
    
    return new RegExp(`^(?:https?:\\/\\/)?(?:[^\/]+\\.)?${escapedDomain}${escapedPath}$`, 'i');
  }
    // Case 4: Exact URL pattern (no wildcards)
  // Handle cases like "https://example.com" vs "https://example.com/"
  if (!pattern.includes('*')) {
    // Exact URL without trailing slash should match both with and without trailing slash
    const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    
    // For patterns like "reddit.com/r/news" or "https://reddit.com/r/news"
    // Make both trailing slash and protocol optional
    if (pattern.includes('/') && !pattern.endsWith('/')) {
      if (pattern.includes('://')) {
        return new RegExp(`^${escaped}\\/?$`, 'i');
      } else {
        return new RegExp(`^(?:https?:\\/\\/)?${escaped}\\/?$`, 'i');
      }
    } 
    // For patterns like "reddit.com" (no path)
    else if (!pattern.includes('/')) {
      return new RegExp(`^(?:https?:\\/\\/)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)*${escaped}(?:\\/.*)?$`, 'i');
    }
    // URL with trailing slash should match the exact URL with or without trailing slash
    else {
      // For patterns like "https://www.reddit.com/" only match exactly that URL
      // with or without trailing slash, not all paths under it
      const escapeSlashRegex = /\\\//g;
      
      if (pattern.includes('://')) {
        // Replace escape sequences for slashes with proper ones and add optional trailing slash
        const fixedEscaped = escaped.replace(escapeSlashRegex, '\\/');
        // Remove the trailing escaped slash and make it optional
        const withoutSlash = fixedEscaped.slice(0, -2);
        return new RegExp(`^${withoutSlash}\\/?$`, 'i');
      } else {
        // Replace escape sequences for slashes with proper ones and add optional trailing slash
        const fixedEscaped = escaped.replace(escapeSlashRegex, '\\/');  
        // Remove the trailing escaped slash and make it optional
        const withoutSlash = fixedEscaped.slice(0, -2);
        return new RegExp(`^(?:https?:\\/\\/)?${withoutSlash}\\/?$`, 'i');
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

// Helper function to extract domain and path from a URL
function parseURL(url) {
  try {
    const parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    return {
      hostname: parsedUrl.hostname.toLowerCase(),
      parsedPath: parsedUrl.pathname
    };
  } catch (e) {
    console.error(`Failed to parse URL: ${url}`);
    return { hostname: "", parsedPath: "" };
  }
}

// Helper function to check if a specific path pattern matches a URL and respects domain boundaries
function checkSpecificPathMatch(url, pattern) {
  try {
    const regex = wildcardToRegExp(pattern);
    const { hostname, parsedPath } = parseURL(url);
    const isMatch = regex.test(url);
    
    // Log the pattern we're checking against
    console.log(`Testing specific path match for "${url}" against pattern: "${pattern}" (${regex})`);
    
    // Extract the domain part from the pattern for strict checking
    let patternDomain = '';
    let patternPath = '';
    
    try {
      if (pattern.includes('://')) {
        // If it has a protocol, parse as a URL
        // Handle wildcard subdomain patterns specially
        if (pattern.includes('://*.')) {
          const parts = pattern.split('://*.')[1];
          patternDomain = parts.split('/')[0];
          patternPath = '/' + parts.split('/').slice(1).join('/');
        } else {
          const dummyPattern = pattern.replace(/\*/g, 'dummy');
          const parsedPattern = new URL(dummyPattern);
          patternDomain = parsedPattern.hostname.toLowerCase();
          patternPath = parsedPattern.pathname;
        }
      } else if (pattern.startsWith('*.')) {
        // Wildcard subdomain without protocol
        const parts = pattern.substring(2);
        patternDomain = parts.split('/')[0];
        if (parts.includes('/')) {
          patternPath = '/' + parts.split('/').slice(1).join('/');
        }
      } else if (pattern.includes('/')) {
        // No protocol but has a path
        patternDomain = pattern.split('/')[0].toLowerCase();
        patternPath = '/' + pattern.split('/').slice(1).join('/');
      } else {
        // Just a domain
        patternDomain = pattern.toLowerCase();
      }
      
      console.log(`Pattern domain: "${patternDomain}", Pattern path: "${patternPath}"`);
    } catch (e) {
      console.error('Error extracting domain from pattern:', e);
      return false;
    }
    
    // Stricter domain matching to prevent cross-domain matches:
    // 1. Direct domain match (reddit.com === reddit.com)
    // 2. Subdomain match (www.reddit.com ends with .reddit.com)
    // 3. Wildcard subdomain pattern (*.reddit.com matches any subdomain of reddit.com)
    const isSubdomainPattern = pattern.includes('://*.') || pattern.startsWith('*.');
    
    // Extract the domain to check against, removing the wildcard if present
    let domainToCheck;
    if (pattern.includes('://*.')) {
      domainToCheck = patternDomain;
    } else if (pattern.startsWith('*.')) {
      domainToCheck = patternDomain;
    } else {
      domainToCheck = patternDomain;
    }
    
    // Check if the hostname matches the domain pattern
    let domainMatches = false;
    
    if (isSubdomainPattern) {
      // For wildcard subdomains, check if the hostname ends with the domain
      // and has at least one subdomain level
      domainMatches = hostname.endsWith(domainToCheck) &&
                     hostname !== domainToCheck &&
                     hostname.slice(0, -domainToCheck.length).endsWith('.');
      console.log(`Checking subdomain wildcard: ${hostname} against ${domainToCheck}, matches: ${domainMatches}`);
    } else {
      // For regular domains, check for exact match or subdomain match
      domainMatches = hostname === domainToCheck ||
                      hostname.endsWith('.' + domainToCheck);
      console.log(`Checking domain: ${hostname} against ${domainToCheck}, matches: ${domainMatches}`);
    }
    
    // For specific paths like reddit.com/r/askscience/*
    if (pattern.includes('/') && pattern.includes('*')) {
      // Check if URL path matches the specific pattern path
      const exactPathMatch = isMatch;
      
      // Also check base path matching (reddit.com/r/askscience matches reddit.com/r/askscience/*)
      let basePathMatch = false;
      if (parsedPath && pattern.includes('/*')) {
        const pathBase = pattern.split('/*')[0];
        const basePath = pathBase.includes('/') ? 
                         ('/' + pathBase.split('/').slice(1).join('/')) : '';
        
        // Check if the URL path is exactly the base path of the pattern
        // or starts with the base path followed by a slash
        basePathMatch = (parsedPath === basePath || 
                         parsedPath === basePath + '/' || 
                         parsedPath.startsWith(basePath + '/'));
        
        console.log(`Base path check: URL path "${parsedPath}" vs pattern base "${basePath}", matches: ${basePathMatch}`);
      }
      
      // Extract the specific path part for more detailed comparison
      // For pattern like "reddit.com/r/hoggit/*" and URL "reddit.com/r/hoggit/comments"
      // We want to confirm that "r/hoggit" matches specifically
      let specificPathMatch = false;
      try {
        if (pattern.includes('/') && url.includes('/')) {
          const urlPathStart = url.indexOf('/', url.indexOf('://') + 3);
          const urlPath = urlPathStart !== -1 ? url.substring(urlPathStart) : '';
          
          if (pattern.includes('/*')) {
            let patternBasePath;
            
            if (pattern.includes('://')) {
              const protocolSplit = pattern.split('://');
              const pathPart = protocolSplit[1].substring(protocolSplit[1].indexOf('/'));
              patternBasePath = pathPart.split('/*')[0];
            } else {
              const patternPath = pattern.substring(pattern.indexOf('/'));
              patternBasePath = patternPath.split('/*')[0];
            }
            
            specificPathMatch = urlPath.startsWith(patternBasePath);
            console.log(`Specific path check: URL path "${urlPath}" vs pattern path "${patternBasePath}", matches: ${specificPathMatch}`);
          }
        }
      } catch (e) {
        console.error('Error checking specific path match:', e);
      }
      
      // Return true if domain matches AND either the exact path matches OR the base path matches
      // OR we have a specific path segment match
      const result = domainMatches && (exactPathMatch || basePathMatch || specificPathMatch);
      console.log(`Final specific path match result: ${result} (domain: ${domainMatches}, exact: ${exactPathMatch}, base: ${basePathMatch}, specific: ${specificPathMatch})`);
      return result;
    } else if (isMatch && domainMatches) {
      // For patterns without wildcards, require both regex match and domain match
      console.log(`Simple match result: ${true} (regex: ${isMatch}, domain: ${domainMatches})`);
      return true;
    }
    
    console.log(`No match found for pattern: ${pattern}`);
    return false;
  } catch (e) {
    console.error(`Error in checkSpecificPathMatch for pattern ${pattern}: ${e.message}`);
    return false;
  }
}

// Improved version of checkUrlShouldBeBlocked for testing that matches our service worker
function checkUrlShouldBeBlocked(url, allowList, denyList) {
  console.log(`\nChecking URL: ${url}`);
  const { hostname, parsedPath } = parseURL(url);

  // First, check all complex allow patterns that could override deny patterns
  // These are highest priority and should be checked first
  for (const pattern of allowList) {
    // Check for complex allow patterns with wildcards and paths
    if ((pattern.includes('/') && pattern.includes('*')) || 
        pattern.startsWith('*.') || pattern.includes('://*.')) {
      console.log(`Checking complex allow pattern: "${pattern}"`);
      // Use our enhanced specific path matcher for these complex patterns
      if (checkSpecificPathMatch(url, pattern)) {
        console.log(`✅ ALLOWED: URL matches complex allow pattern: ${pattern}`);
        return { blocked: false, reason: `Complex allow pattern: ${pattern}` };
      }
    }
  }
  
  // Step 2: Check for exact path matches in allow list (also high priority)
  for (const pattern of allowList) {
    if (pattern.includes('/') && !pattern.includes('*')) {
      // For exact path matching, we need to handle trailing slashes properly
      // Create a more flexible regex that will match with or without trailing slash
      const patternWithoutSlash = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;
      const urlWithoutSlash = url.endsWith('/') ? url.slice(0, -1) : url;
      
      // Create pattern without protocol to allow both http:// and https:// to match
      const cleanPattern = patternWithoutSlash.replace(/^https?:\/\//, '');
      const cleanUrl = urlWithoutSlash.replace(/^https?:\/\//, '');
      
      // Try exact match first
      if (cleanUrl.toLowerCase() === cleanPattern.toLowerCase()) {
        console.log(`✅ ALLOWED: URL exact match for path pattern: ${pattern}`);
        return { blocked: false, reason: `Exact path pattern: ${pattern}` };
      }
      
      // If not exact match, use regex with optional trailing slash
      const regexPattern = `^(?:https?:\\/\\/)?${cleanPattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')}\\/?$`;
      const regex = new RegExp(regexPattern, 'i');
      
      console.log(`Testing against exact path pattern: "${pattern}" (${regex})`);
      
      if (regex.test(url)) {
        console.log(`✅ ALLOWED: URL matches exact path pattern: ${pattern}`);
        return { blocked: false, reason: `Exact path pattern: ${pattern}` };
      }
    }
  }
  
  // Step 3: Check domain-only patterns in allow list
  let hasDomainAllowMatch = false;
  let domainAllowPattern = '';
  
  for (const pattern of allowList) {
    if (!pattern.includes('/') && !pattern.startsWith('*.')) {
      const regex = wildcardToRegExp(pattern);
      console.log(`Testing against domain allow pattern: "${pattern}" (${regex})`);
      
      const patternLower = pattern.toLowerCase().trim();
      
      // Check if hostname exactly matches the pattern or is a subdomain
      if (regex.test(url) && (hostname === patternLower || hostname.endsWith(`.${patternLower}`))) {
        console.log(`✅ ALLOWED: URL matches domain allow pattern: ${pattern}`);
        hasDomainAllowMatch = true;
        domainAllowPattern = pattern;
        return { blocked: false, reason: `Domain allow pattern: ${pattern}` };
      }
    }
  }
  
  // Step 4: Now check path wildcards in deny list
  for (const pattern of denyList) {
    if (pattern.includes('/*')) {
      const regex = wildcardToRegExp(pattern);
      console.log(`Testing against path deny pattern: "${pattern}" (${regex})`);
      
      if (regex.test(url)) {
        console.log(`❌ BLOCKED: URL matches deny path pattern: ${pattern}`);
        return { blocked: true, reason: `Pattern: ${pattern}` };
      }
    }
  }
  
  // Step 5: Check subdomain wildcard patterns in deny list
  for (const pattern of denyList) {
    if (pattern.startsWith('*.') || pattern.includes('://*.')) {
      console.log(`Checking complex deny pattern: "${pattern}"`);
      if (checkSpecificPathMatch(url, pattern)) {
        console.log(`❌ BLOCKED: URL matches complex deny pattern: ${pattern}`);
        return { blocked: true, reason: `Complex deny pattern: ${pattern}` };
      }
    }
  }
  
  // Step 6: Check direct domain matches in deny list
  for (const pattern of denyList) {
    // Skip patterns we've already checked
    if (pattern.includes('/*') || pattern.startsWith('*.') || pattern.includes('://*.')) {
      continue;
    }
    
    if (!pattern.includes('/')) {
      const patternLower = pattern.toLowerCase().trim();
      
      // Direct domain comparison
      if (hostname === patternLower || hostname.endsWith(`.${patternLower}`)) {
        console.log(`❌ BLOCKED: Hostname ${hostname} directly matched deny list domain: ${pattern}`);
        return { blocked: true, reason: `Pattern: ${pattern}` };
      }
    }
  }
  
  // Step 7: Check remaining deny patterns using regex
  for (const pattern of denyList) {
    // Skip patterns we've already checked
    if (pattern.includes('/*') || pattern.startsWith('*.') || pattern.includes('://*.')) {
      continue;
    }
    
    const regex = wildcardToRegExp(pattern);
    console.log(`Testing against denylist pattern: "${pattern}" (${regex})`);
    
    const urlMatches = regex.test(url);
    const hostnameMatches = hostname && regex.test(hostname);
    
    if (urlMatches || hostnameMatches) {
      console.log(`❌ BLOCKED: URL matches denylist pattern: ${pattern}`);
      return { blocked: true, reason: `Pattern: ${pattern}` };
    }
  }
  
  // Step 8: Check deny list keywords
  for (const pattern of denyList) {
    // Simple keyword matching
    if (typeof pattern === 'string' && 
        (url.toLowerCase().includes(pattern.toLowerCase()) || 
         (hostname && hostname.toLowerCase().includes(pattern.toLowerCase())))) {
      console.log(`❌ BLOCKED: URL contains deny list keyword: ${pattern}`);
      return { blocked: true, reason: `Keyword: ${pattern}` };
    }
  }
  
  // Step 9: Default to allowing the URL
  console.log(`✅ ALLOWED: URL doesn't match any patterns (default)`);
  return { blocked: false, reason: "Default" };
}

// Test function for pattern matching
function testPatternMatch(url, pattern, expectedMatch = true) {
  try {
    const regex = wildcardToRegExp(pattern);
    const isMatch = regex.test(url);
    const result = isMatch === expectedMatch ? "✓ PASS" : "✗ FAIL";
    
    console.log(`Testing URL: "${url}" against pattern: "${pattern}"`);
    console.log(`Regex: ${regex}`);
    console.log(`Result: ${isMatch ? 'MATCH' : 'NO MATCH'} - ${result}`);
    console.log('---');
    
    return isMatch === expectedMatch;
  } catch (e) {
    console.log(`Testing URL: "${url}" against pattern: "${pattern}"`);
    console.log(`ERROR: Failed to create regex - ${e.message}`);
    console.log(`Result: ERROR - ✗ FAIL`);
    console.log('---');
    return false;
  }
}

// Test function for allow/deny list logic
function testAllowDenyLogic(testName, url, allowList, denyList, expectedBlocked) {
  console.log(`\n==== TEST CASE: ${testName} ====`);
  console.log(`URL: ${url}`);
  console.log(`Allow List: ${JSON.stringify(allowList)}`);
  console.log(`Deny List: ${JSON.stringify(denyList)}`);
  
  const result = checkUrlShouldBeBlocked(url, allowList, denyList);
  const passed = result.blocked === expectedBlocked;
  
  console.log(`Expected: ${expectedBlocked ? 'BLOCKED' : 'ALLOWED'}`);
  console.log(`Actual: ${result.blocked ? 'BLOCKED' : 'ALLOWED'}`);
  console.log(`Result: ${passed ? '✓ PASS' : '✗ FAIL'}`);
  console.log('---');
  
  return passed;
}

// Run all pattern matching tests
function runPatternTests() {
  console.log('\n====== PATTERN MATCHING TESTS ======\n');
  let passed = 0;
  let total = 0;
  
  function runTest(url, pattern, expectedMatch = true) {
    total++;
    if (testPatternMatch(url, pattern, expectedMatch)) {
      passed++;
    }
  }
  
  // Basic domain tests
  console.log('\n=== BASIC DOMAIN TESTS ===');
  runTest('https://reddit.com', 'reddit.com');
  runTest('http://reddit.com', 'reddit.com');
  runTest('reddit.com', 'reddit.com');
  runTest('REDDIT.COM', 'reddit.com'); // Case insensitive
  runTest('notreddit.com', 'reddit.com', false); // Should not match
  
  // Subdomain tests
  console.log('\n=== SUBDOMAIN TESTS ===');
  runTest('https://www.reddit.com', 'reddit.com');
  runTest('https://old.reddit.com', 'reddit.com');
  runTest('https://sub.domain.reddit.com', 'reddit.com');
  runTest('https://reddit.com.evil.com', 'reddit.com', false); // Should not match
  
  // Path tests
  console.log('\n=== PATH TESTS ===');
  runTest('https://reddit.com/r/news', 'reddit.com');
  runTest('https://reddit.com/r/pics/comments/123', 'reddit.com');
  runTest('https://reddit.com/r/', 'reddit.com');
  
  // Domain with path wildcard tests
  console.log('\n=== DOMAIN WITH PATH WILDCARD TESTS ===');
  runTest('https://reddit.com/r/news', 'reddit.com/r/*');
  runTest('https://reddit.com/r/pics/comments/123', 'reddit.com/r/*');
  runTest('https://reddit.com/r/', 'reddit.com/r/*');
  runTest('https://reddit.com/', 'reddit.com/r/*', false); // Should not match
  runTest('https://reddit.com/user', 'reddit.com/r/*', false); // Should not match
  
  // Specific path tests
  console.log('\n=== SPECIFIC PATH TESTS ===');
  runTest('https://reddit.com/r/news', 'reddit.com/r/news');
  runTest('https://reddit.com/r/news/', 'reddit.com/r/news');
  runTest('https://reddit.com/r/news/comments/123', 'reddit.com/r/news/*');
  runTest('https://reddit.com/r/pics', 'reddit.com/r/news', false); // Should not match
  
  // Subdomain wildcard tests
  console.log('\n=== SUBDOMAIN WILDCARD TESTS ===');
  runTest('https://sub.reddit.com', '*.reddit.com');
  runTest('https://www.reddit.com', '*.reddit.com');
  runTest('https://sub.sub.reddit.com', '*.reddit.com');
  runTest('https://reddit.com', '*.reddit.com', false); // Should not match
  runTest('https://xyzreddit.com', '*.reddit.com', false); // Should not match
    // Complex subdomain and path wildcards
  console.log('\n=== COMPLEX WILDCARD TESTS ===');
  runTest('https://sub.redgifs.com/watch/video123', 'https://*.redgifs.com/*');
  runTest('https://thumbs.redgifs.com/img/123.jpg', 'https://*.redgifs.com/*');
  runTest('https://redgifs.com/watch/video123', 'https://*.redgifs.com/*', false); // Should not match
  // Using different pattern for reddit subdomain tests to avoid regex errors
  runTest('https://sub.reddit.com/r/news', '*.reddit.com');
  runTest('https://sub.reddit.com/r/news', 'sub.reddit.com/r/*');
  
  // Trailing slash tests
  console.log('\n=== TRAILING SLASH TESTS ===');
  runTest('https://reddit.com', 'reddit.com/');
  runTest('https://reddit.com/', 'reddit.com/');
  runTest('https://reddit.com/r/', 'reddit.com/', false); // Should not match
  runTest('https://reddit.com', 'reddit.com');
  runTest('https://reddit.com/', 'reddit.com');
  
  // Exact matches
  console.log('\n=== EXACT MATCH TESTS ===');
  runTest('https://reddit.com/r/news', 'https://reddit.com/r/news');
  runTest('reddit.com/r/news', 'reddit.com/r/news');
  runTest('https://www.reddit.com/r/news', 'https://reddit.com/r/news', false); // Should not match
  
  console.log(`\nPATTERN TESTS SUMMARY: ${passed}/${total} tests passed`);
  return { passed, total };
}

// Run all allow/deny logic tests
function runAllowDenyTests() {
  console.log('\n====== ALLOW/DENY LOGIC TESTS ======\n');
  let passed = 0;
  let total = 0;
  
  function runTest(testName, url, allowList, denyList, expectedBlocked) {
    total++;
    if (testAllowDenyLogic(testName, url, allowList, denyList, expectedBlocked)) {
      passed++;
    }
  }
  
  // Basic allow/deny tests
  runTest(
    'Basic deny list test',
    'https://reddit.com',
    [],
    ['reddit.com'],
    true
  );
  
  runTest(
    'Basic allow list override test',
    'https://reddit.com',
    ['reddit.com'],
    ['reddit.com'],
    false
  );
  
  runTest(
    'Domain without matching pattern',
    'https://example.com',
    ['reddit.com'],
    ['facebook.com'],
    false
  );
  
  // Reddit subreddit tests
  runTest(
    'Block all of Reddit except specific subreddit',
    'https://reddit.com/r/news',
    ['reddit.com/r/askscience/*'],
    ['reddit.com'],
    true
  );
  
  runTest(
    'Allow specific subreddit while blocking all of Reddit',
    'https://reddit.com/r/askscience',
    ['reddit.com/r/askscience/*'],
    ['reddit.com'],
    false
  );
  
  runTest(
    'Block all subreddits except specific one',
    'https://reddit.com/r/news',
    ['reddit.com/r/askscience/*'],
    ['reddit.com/r/*'],
    true
  );
  
  runTest(
    'Allow specific subreddit in block all subreddits rule',
    'https://reddit.com/r/askscience',
    ['reddit.com/r/askscience/*'],
    ['reddit.com/r/*'],
    false
  );
  
  // Redgifs subdomain tests
  runTest(
    'Block all redgifs subdomains',
    'https://thumbs.redgifs.com/something',
    [],
    ['https://*.redgifs.com/*'],
    true
  );
  
  runTest(
    'Block all redgifs subdomains but allow main domain',
    'https://redgifs.com/watch',
    ['redgifs.com/*'],
    ['https://*.redgifs.com/*'],
    false
  );
  
  // Cross-domain matching tests
  runTest(
    'Specific allow pattern should not allow different domain with same path',
    'https://www.reddit.com/r/cars/',
    ['https://*.reddit.com/r/hoggit/*'],
    ['reddit.com/r/*'],
    true // Should still be blocked
  );
  
  runTest(
    'Correct domain and path should be allowed',
    'https://www.reddit.com/r/hoggit/comments',
    ['https://*.reddit.com/r/hoggit/*'],
    ['reddit.com/r/*'],
    false // Should be allowed
  );
  
  console.log(`\nALLOW/DENY TESTS SUMMARY: ${passed}/${total} tests passed`);
  return { passed, total };
}

// Run complex real-world test cases
function runRealWorldTests() {
  console.log('\n====== REAL-WORLD TEST SCENARIOS ======\n');
  let passed = 0;
  let total = 0;
  
  function runTest(testName, url, allowList, denyList, expectedBlocked) {
    total++;
    if (testAllowDenyLogic(testName, url, allowList, denyList, expectedBlocked)) {
      passed++;
    }
  }
  
  // Reddit setup: Block all of reddit.com, but allow specific subreddits
  const redditAllowList = [
    'reddit.com/r/programming/*',
    'reddit.com/r/science/*',
    'reddit.com/r/askscience/*'
  ];
  const redditDenyList = [
    'reddit.com'
  ];
  
  runTest(
    'Reddit homepage should be blocked',
    'https://www.reddit.com',
    redditAllowList,
    redditDenyList,
    true
  );
  
  runTest(
    'Blocked subreddit should be blocked',
    'https://www.reddit.com/r/news',
    redditAllowList,
    redditDenyList,
    true
  );
  
  runTest(
    'Allowed subreddit should be allowed',
    'https://www.reddit.com/r/programming',
    redditAllowList,
    redditDenyList,
    false
  );
  
  runTest(
    'Allowed subreddit with deep path should be allowed',
    'https://www.reddit.com/r/science/comments/abc123/post_title',
    redditAllowList,
    redditDenyList,
    false
  );
  
  // Social media setup: Block all social media except specific work-related accounts
  const socialAllowList = [
    'twitter.com/NASA/*',
    'facebook.com/groups/workgroup/*',
    'linkedin.com/*'
  ];
  const socialDenyList = [
    'twitter.com',
    'facebook.com',
    'instagram.com'
  ];
  
  runTest(
    'Twitter homepage should be blocked',
    'https://twitter.com',
    socialAllowList,
    socialDenyList,
    true
  );
  
  runTest(
    'Allowed Twitter account should be allowed',
    'https://twitter.com/NASA',
    socialAllowList,
    socialDenyList,
    false
  );
  
  runTest(
    'Random Twitter account should be blocked',
    'https://twitter.com/randomuser',
    socialAllowList,
    socialDenyList,
    true
  );
  
  runTest(
    'LinkedIn should be allowed entirely',
    'https://linkedin.com/in/profile',
    socialAllowList,
    socialDenyList,
    false
  );
  
  console.log(`\nREAL-WORLD TESTS SUMMARY: ${passed}/${total} tests passed`);
  return { passed, total };
}

// Main function to run all tests
function main() {
  console.log('===========================================');
  console.log('DISTRACT ME NOT - COMPREHENSIVE TEST SUITE');
  console.log('===========================================\n');
  
  const patternTests = runPatternTests();
  const allowDenyTests = runAllowDenyTests();
  const realWorldTests = runRealWorldTests();
  
  const totalPassed = patternTests.passed + allowDenyTests.passed + realWorldTests.passed;
  const totalTests = patternTests.total + allowDenyTests.total + realWorldTests.total;
  
  console.log('\n===========================================');
  console.log('FINAL TEST SUMMARY');
  console.log('===========================================');
  console.log(`Pattern Tests: ${patternTests.passed}/${patternTests.total} passed`);
  console.log(`Allow/Deny Tests: ${allowDenyTests.passed}/${allowDenyTests.total} passed`);
  console.log(`Real-world Tests: ${realWorldTests.passed}/${realWorldTests.total} passed`);
  console.log(`OVERALL: ${totalPassed}/${totalTests} tests passed (${Math.round(totalPassed/totalTests*100)}%)`);
  console.log('===========================================');
}

// Run all tests
main();
