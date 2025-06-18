/**
 * Distract-Me-Not Service Worker Helper
 * 
 * This file contains the URL pattern matching logic for the Distract-Me-Not service worker.
 * It implements a path-first matching strategy that handles domain wildcards and specific paths.
 */

/**
 * Parse a URL or pattern string into component parts for easier matching
 * 
 * @param {string} urlOrPattern - The URL or pattern string to parse
 * @returns {Object} - The parsed components of the URL/pattern
 */
function parseUrlOrPattern(urlOrPattern) {
  try {
    // Normalize: trim whitespace and convert to lowercase
    const normalized = urlOrPattern.trim().toLowerCase();
    
    // Component parts to extract
    let protocol = '';
    let hostname = '';
    let path = '';
    let isSubdomainWildcard = false;
    let baseDomain = '';
    let domainParts = [];
    
    // Extract protocol if present
    let remaining = normalized;
    if (normalized.includes('://')) {
      const parts = normalized.split('://', 2);
      protocol = parts[0];
      remaining = parts[1];
    }
    
    // Split hostname and path
    const slashIndex = remaining.indexOf('/');
    if (slashIndex !== -1) {
      hostname = remaining.substring(0, slashIndex);
      path = remaining.substring(slashIndex);
    } else {
      hostname = remaining;
      path = '';
    }
    
    // Extract domain parts for more precise matching
    domainParts = hostname.split('.').filter(p => p !== '');
    
    // Check if this is a subdomain wildcard pattern
    if (hostname.startsWith('*.')) {
      isSubdomainWildcard = true;
      baseDomain = hostname.substring(2); // Remove the *. prefix
    } else {
      baseDomain = hostname;
    }
    
    // For actual URLs, try to use URL API for better parsing
    let urlObj = null;
    try {
      // Try to construct a URL object if this looks like a URL
      if (protocol || (!isSubdomainWildcard && !normalized.includes('*'))) {
        const urlToConstruct = protocol 
          ? normalized 
          : (normalized.startsWith('//') ? `http:${normalized}` : `http://${normalized}`);
        urlObj = new URL(urlToConstruct);
      }
    } catch (e) {
      // If URL construction fails, continue with our manual parsing
      // This is expected for wildcard patterns
    }
    
    // Detect and mark pattern specificities for better matching decisions
    const hasSpecificSubdomain = !isSubdomainWildcard && domainParts.length > 2;
    const hasSpecificPath = path && path !== '/' && path !== '/*';
    const hasSpecificSubreddit = extractSubreddit(path) !== null;
    
    return {
      original: urlOrPattern,
      normalized,
      protocol,
      hostname,
      path,
      isSubdomainWildcard,
      baseDomain,
      domainParts,
      urlObj,
      
      // Specificity markers to help with matching precedence
      hasSpecificSubdomain,
      hasSpecificPath,
      hasSpecificSubreddit,
      
      // For paths with /r/ pattern (subreddit or similar)
      subreddit: extractSubreddit(path)
    };
  } catch (error) {
    console.error(`Error parsing URL/pattern: ${urlOrPattern}`, error);
    return {
      original: urlOrPattern,
      normalized: urlOrPattern.toLowerCase(),
      protocol: '',
      hostname: '',
      path: '',
      isSubdomainWildcard: false,
      baseDomain: '',
      domainParts: [],
      hasSpecificSubdomain: false,
      hasSpecificPath: false,
      hasSpecificSubreddit: false,
      subreddit: null
    };
  }
}

/**
 * Extract subreddit name from a path if present
 * 
 * @param {string} path - Path to extract from
 * @returns {string|null} - Extracted subreddit name or null
 */
function extractSubreddit(path) {
  if (!path || !path.includes('/r/')) return null;
  
  const match = path.match(/\/r\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Check if a domain matches a pattern domain, handling wildcards
 * 
 * @param {string} urlDomain - The URL's domain
 * @param {Object} patternParsed - The parsed pattern
 * @returns {boolean} - Whether the domain matches
 */
function domainMatches(urlDomain, patternParsed) {
  // If the pattern has no subdomain wildcard, it should match the domain exactly
  // OR it should match as a subdomain of the pattern domain
  if (!patternParsed.isSubdomainWildcard) {
    // Direct match
    if (urlDomain === patternParsed.hostname) return true;
    
    // Subdomain match (example.com matches www.example.com)
    const domainSuffix = `.${patternParsed.hostname}`;
    return urlDomain.endsWith(domainSuffix);
  } 
  
  // If the pattern has a subdomain wildcard (*.example.com), it should match
  // any subdomain of the base domain, but NOT the base domain itself
  
  // Any subdomain of the base domain (www.reddit.com matches *.reddit.com)
  if (urlDomain.endsWith(`.${patternParsed.baseDomain}`) && urlDomain !== patternParsed.baseDomain) {
    return true;
  }
  
  return false;
}

/**
 * Check if a path matches a pattern path, handling wildcards
 * 
 * @param {string} urlPath - The URL path
 * @param {string} patternPath - The pattern path
 * @param {Object} patternParsed - The full parsed pattern object (for context)
 * @param {Object} urlParsed - The full parsed URL object (for context)
 * @returns {boolean} - Whether the path matches
 */
function pathMatches(urlPath, patternPath, patternParsed, urlParsed) {
  // Normalize paths - ensure they start with / and handle trailing slashes
  const normUrlPath = urlPath || '/';
  let normPatternPath = patternPath || '/';
  
  // Any path wildcard
  if (normPatternPath === '/*') {
    return normUrlPath !== '/'; // Any path except root
  }
  
  // Root path
  if (normPatternPath === '/') {
    return normUrlPath === '/' || normUrlPath === '';
  }
  
  // Exact match
  if (normPatternPath === normUrlPath) {
    return true;
  }
  
  // Path with trailing wildcard (e.g., /foo/*)
  if (normPatternPath.endsWith('/*')) {
    const prefix = normPatternPath.slice(0, -1); // Remove the * but keep the /
    
    // Check for subreddit paths with wildcards
    if (patternParsed && urlParsed && normPatternPath.includes('/r/')) {
      const patternSubreddit = patternParsed.subreddit;
      const urlSubreddit = urlParsed.subreddit;
      
      // If the pattern specifies a subreddit and the URL has a different subreddit,
      // this should not match regardless of the wildcard
      if (patternSubreddit && urlSubreddit && patternSubreddit !== urlSubreddit) {
        console.log(`Subreddit mismatch: pattern subreddit ${patternSubreddit} vs URL subreddit ${urlSubreddit}`);
        return false;
      }
      
      // For wildcard paths like /r/subreddit/*, check that the subreddit matches exactly
      if (normPatternPath.startsWith('/r/') && patternSubreddit) {
        if (urlSubreddit !== patternSubreddit) {
          console.log(`Subreddit path mismatch: ${patternSubreddit} vs ${urlSubreddit}`);
          return false;
        }
      }
    }
    
    return normUrlPath.startsWith(prefix);
  }
  
  // Subreddit path handling - special case for Reddit-style patterns
  if (normPatternPath.includes('/r/')) {
    const patternSubreddit = patternParsed?.subreddit || extractSubreddit(normPatternPath);
    const urlSubreddit = urlParsed?.subreddit || extractSubreddit(normUrlPath);
    
    // If pattern specifies a subreddit, it MUST match the URL's subreddit exactly
    if (patternSubreddit && urlSubreddit) {
      if (patternSubreddit !== urlSubreddit) {
        return false;
      }
      
      // If path ends with /* after subreddit, match anything in that subreddit
      if (normPatternPath.match(/\/r\/[^\/]+\/\*$/)) {
        return normUrlPath.startsWith(`/r/${urlSubreddit}/`) || normUrlPath === `/r/${urlSubreddit}`;
      }
    }
  }
  
  // Convert pattern to regex for more complex path patterns with wildcards
  try {
    const pathRegexStr = normPatternPath
      .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*?'); // Convert * to non-greedy wildcard
    
    const pathRegex = new RegExp(`^${pathRegexStr}$`, 'i');
    return pathRegex.test(normUrlPath);
  } catch (e) {
    console.error('Error in path regex matching:', e);
    return false;
  }
}

/**
 * Helper function to escape special regex characters in a string
 */
function escapeRegexStr(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculate a specificity score for a pattern
 * Higher score = more specific pattern (which should take precedence in matching)
 * 
 * @param {Object} parsedPattern - The parsed pattern object
 * @returns {number} - Specificity score
 */
function calculateSpecificity(parsedPattern) {
  let score = 0;
  
  // Domain specificity
  if (parsedPattern.isSubdomainWildcard) {
    score += 10; // Wildcard subdomain is more specific than just a base domain
  } else if (parsedPattern.hasSpecificSubdomain) {
    score += 30; // Specific subdomain is very specific
  } else {
    score += 20; // Regular domain
  }
  
  // Path specificity
  if (!parsedPattern.path || parsedPattern.path === '/') {
    score += 5; // Root path
  } else if (parsedPattern.path === '/*') {
    score += 10; // Wildcard path
  } else if (parsedPattern.hasSpecificSubreddit) {
    score += 40; // Specific subreddit path is very specific
  } else if (parsedPattern.path.includes('*')) {
    score += 20; // Path with wildcards
  } else {
    score += 30; // Exact path match
  }
  
  return score;
}

/**
 * Checks if a URL matches a pattern, implementing a path-first matching strategy
 * 
 * @param {string} pattern - The pattern to match against
 * @param {string} url - The URL to check
 * @returns {boolean} - True if the URL matches the pattern
 */
function matchesPattern(pattern, url) {
  if (!pattern || !url) return false;
  
  try {
    // Parse the URL and pattern into structured components
    const urlParsed = parseUrlOrPattern(url);
    const patternParsed = parseUrlOrPattern(pattern);
    
    // Normalize the URL - remove query parameters and hash unless pattern includes them
    if (urlParsed.urlObj) {
      if (!pattern.includes('?')) urlParsed.urlObj.search = '';
      if (!pattern.includes('#')) urlParsed.urlObj.hash = '';
    }
    
    // Extract the key components for comparison
    const urlPath = urlParsed.path;
    const patternPath = patternParsed.path;
    
    // Critical subreddit specific paths handling
    if (patternParsed.subreddit && urlParsed.subreddit) {
      // If pattern has a specific subreddit but URL has a different one, NOT a match
      if (patternParsed.subreddit !== urlParsed.subreddit) {
        return false;
      }
    }
    
    // Additional case for subreddit paths
    if (patternPath.includes('/r/') && urlPath.includes('/r/')) {
      const patternSubMatch = patternPath.match(/\/r\/([^\/]+)/);
      const urlSubMatch = urlPath.match(/\/r\/([^\/]+)/);
      
      if (patternSubMatch && urlSubMatch && 
          patternSubMatch[1].toLowerCase() !== urlSubMatch[1].toLowerCase()) {
        console.log(`Subreddit path mismatch: ${patternSubMatch[1]} vs ${urlSubMatch[1]}`);
        return false;
      }
    }
    
    // Domain matching
    const domainMatch = domainMatches(urlParsed.hostname, patternParsed);
    if (!domainMatch) {
      return false;
    }
    
    // Path matching
    if (patternPath) {
      const pathMatch = pathMatches(urlParsed.path, patternParsed.path, patternParsed, urlParsed);
      if (!pathMatch) {
        return false;
      }
    }
    
    // Protocol matching
    if (patternParsed.protocol && urlParsed.protocol) {
      if (patternParsed.protocol !== urlParsed.protocol) {
        return false;
      }
    }
    
    // If we've passed all checks, it's a match
    return true;
    
  } catch (error) {
    console.error(`Error matching pattern ${pattern} against URL ${url}:`, error);
    return false;
  }
}

/**
 * Determines if a URL should be blocked based on deny/allow patterns.
 * Uses specificity-based matching for better allow/deny precedence.
 * 
 * @param {string} url - The URL to check
 * @param {string[]} allowPatterns - Array of patterns to explicitly allow
 * @param {string[]} denyPatterns - Array of patterns to block
 * @returns {boolean} True if the URL should be blocked
 */
function checkUrlShouldBeBlocked(url, allowPatterns = [], denyPatterns = []) {
  if (!url) return false;
  
  // Parse the URL once for consistency
  const urlParsed = parseUrlOrPattern(url);
  
  // General case for subreddit paths in URLs
  if (url.includes("/r/") && urlParsed.subreddit) {
    const urlSubreddit = urlParsed.subreddit;
    
    // Track if we have any specific subreddit patterns
    let hasSubredditPatterns = false;
    
    // Check allow patterns for subreddit-specific matches
    if (Array.isArray(allowPatterns)) {
      // Track specific allow patterns for subreddits
      let matchingSubredditAllowPatterns = [];
      
      // Find all allow patterns with specific subreddit
      for (const pattern of allowPatterns) {
        const patternParsed = parseUrlOrPattern(pattern);
        
        if (patternParsed.subreddit) {
          hasSubredditPatterns = true;
          
          // If this allow pattern has the same subreddit as the URL, track it
          if (patternParsed.subreddit === urlSubreddit) {
            matchingSubredditAllowPatterns.push(pattern);
          }
        }
      }
      
      // Check for a specific case of subreddit/path blocking:
      // If there are subreddit-specific allow patterns but none match this URL,
      // AND there's a deny pattern for subreddits, block this URL
      if (hasSubredditPatterns && matchingSubredditAllowPatterns.length === 0) {
        if (Array.isArray(denyPatterns)) {
          for (const denyPattern of denyPatterns) {
            const denyPatternParsed = parseUrlOrPattern(denyPattern);
            
            // Check if there's a general deny pattern that would match subreddits
            // Either as a general subreddit pattern (/r/*) or a domain-wide block
            if (denyPattern.includes("/r/*") || !denyPatternParsed.path || denyPatternParsed.path === '/') {
              // Check if this deny pattern matches the domain part at least
              const domainMatch = domainMatches(urlParsed.hostname, denyPatternParsed);
              
              if (domainMatch) {
                console.log(`BLOCKED: URL subreddit ${urlSubreddit} doesn't match any allowed specific subreddit patterns, and domain matches deny pattern ${denyPattern}`);
                return true; // Should be blocked
              }
            }
          }
        }
      }
    }
  }
  
  // Special handling for subdomain wildcard patterns with specific paths
  // This is the key fix for the edge case test that was failing
  if (Array.isArray(allowPatterns)) {
    for (const pattern of allowPatterns) {
      // Look for patterns like "*.reddit.com/r/hoggit/*"
      if ((pattern.startsWith('*.') || pattern.includes('://*.')) && pattern.includes('/r/')) {
        const patternParsed = parseUrlOrPattern(pattern);
        
        // If this is a subdomain wildcard pattern with a specific subreddit
        if (patternParsed.isSubdomainWildcard && patternParsed.subreddit) {
          // Domain match check
          const domainMatch = domainMatches(urlParsed.hostname, patternParsed);
          
          // If the domain matches but we have different subreddits
          if (domainMatch && urlParsed.subreddit && patternParsed.subreddit !== urlParsed.subreddit) {
            // Check if we have a deny pattern for subreddits in general
            if (Array.isArray(denyPatterns)) {
              for (const denyPattern of denyPatterns) {
                if (denyPattern.includes('/r/*')) {
                  const denyPatternParsed = parseUrlOrPattern(denyPattern);
                  
                  // If domain matches the deny pattern too, this URL should be blocked
                  if (domainMatches(urlParsed.hostname, denyPatternParsed)) {
                    console.log(`BLOCKED: Subdomain matches allow pattern domain, but subreddit ${urlParsed.subreddit} doesn't match allow pattern subreddit ${patternParsed.subreddit}`);
                    return true; // Should be blocked
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Track all matches with their specificity
  const matchingAllowPatterns = [];
  const matchingDenyPatterns = [];
  
  // Find all matching allow patterns with their specificity
  if (Array.isArray(allowPatterns)) {
    for (const pattern of allowPatterns) {
      if (matchesPattern(pattern, url)) {
        const patternParsed = parseUrlOrPattern(pattern);
        const specificity = calculateSpecificity(patternParsed);
        matchingAllowPatterns.push({ pattern, specificity });
      }
    }
  }
  
  // Find all matching deny patterns with their specificity
  if (Array.isArray(denyPatterns)) {
    for (const pattern of denyPatterns) {
      if (matchesPattern(pattern, url)) {
        const patternParsed = parseUrlOrPattern(pattern);
        const specificity = calculateSpecificity(patternParsed);
        matchingDenyPatterns.push({ pattern, specificity });
      }
    }
  }
  
  // Sort patterns by specificity (higher number = more specific)
  matchingAllowPatterns.sort((a, b) => b.specificity - a.specificity);
  matchingDenyPatterns.sort((a, b) => b.specificity - a.specificity);
  
  // Log matches for debugging
  if (matchingAllowPatterns.length > 0) {
    console.log(`Found ${matchingAllowPatterns.length} matching allow patterns for ${url}:`, 
      matchingAllowPatterns.map(p => `${p.pattern} (specificity: ${p.specificity})`));
  }
  
  if (matchingDenyPatterns.length > 0) {
    console.log(`Found ${matchingDenyPatterns.length} matching deny patterns for ${url}:`, 
      matchingDenyPatterns.map(p => `${p.pattern} (specificity: ${p.specificity})`));
  }
  
  // DECISION LOGIC:
  // 1. If we have any allow patterns, check if the highest specificity allow pattern
  //    is more specific than the highest specificity deny pattern
  if (matchingAllowPatterns.length > 0) {
    const mostSpecificAllow = matchingAllowPatterns[0];
    
    if (matchingDenyPatterns.length === 0) {
      console.log(`✅ ALLOWED: URL matches allow pattern with specificity ${mostSpecificAllow.specificity}: ${mostSpecificAllow.pattern}`);
      return false; // Allow wins with no deny patterns
    }
    
    const mostSpecificDeny = matchingDenyPatterns[0];
    
    // If allow pattern is more specific or equal to the most specific deny pattern, allow wins
    if (mostSpecificAllow.specificity >= mostSpecificDeny.specificity) {
      console.log(`✅ ALLOWED: Allow pattern "${mostSpecificAllow.pattern}" (${mostSpecificAllow.specificity}) is more specific than deny pattern "${mostSpecificDeny.pattern}" (${mostSpecificDeny.specificity})`);
      return false;
    } else {
      console.log(`❌ BLOCKED: Deny pattern "${mostSpecificDeny.pattern}" (${mostSpecificDeny.specificity}) is more specific than allow pattern "${mostSpecificAllow.pattern}" (${mostSpecificAllow.specificity})`);
      return true;
    }
  }
  
  // 2. If we only have deny patterns, block
  if (matchingDenyPatterns.length > 0) {
    const mostSpecificDeny = matchingDenyPatterns[0];
    
    // Check if this is a domain-only pattern for better logging
    const parsedPattern = parseUrlOrPattern(mostSpecificDeny.pattern);
    
    if (parsedPattern.path === '' || parsedPattern.path === '/') {
      console.log(`❌ BLOCKED: Hostname ${urlParsed.hostname} directly matched deny list domain: ${mostSpecificDeny.pattern}`);
    } else {
      console.log(`❌ BLOCKED: URL matches deny path pattern: ${mostSpecificDeny.pattern}`);
    }
    
    return true;
  }
  
  // 3. No patterns matched, default to allow
  console.log(`✅ ALLOWED: URL doesn't match any patterns (default)`);
  return false;
}

// Make the functions available in the global scope for service worker imports
if (typeof self !== 'undefined') {
  // Service worker context - expose functions globally
  self.parseUrlOrPattern = parseUrlOrPattern;
  self.extractSubreddit = extractSubreddit;
  self.domainMatches = domainMatches;
  self.pathMatches = pathMatches;
  self.escapeRegexStr = escapeRegexStr;
  self.matchesPattern = matchesPattern;
  self.checkUrlShouldBeBlocked = checkUrlShouldBeBlocked;
  
  // Add logging to confirm functions are available
  console.log('Service worker pattern functions exported to global scope:');
  console.log('- parseUrlOrPattern available:', typeof self.parseUrlOrPattern === 'function');
  console.log('- matchesPattern available:', typeof self.matchesPattern === 'function');
  console.log('- checkUrlShouldBeBlocked available:', typeof self.checkUrlShouldBeBlocked === 'function');
}
