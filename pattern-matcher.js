/**
 * Pattern Matcher for Distract-Me-Not
 * 
 * This module contains a simplified, robust implementation of URL pattern matching
 * that handles wildcard patterns for domains, subdomains and paths.
 */

/**
 * Converts a wildcard pattern to a regular expression.
 * 
 * @param {string} pattern - The wildcard pattern to convert
 * @returns {RegExp} A regular expression that matches the pattern
 */
function wildcardToRegExp(pattern) {
  // Basic input validation
  if (!pattern || typeof pattern !== 'string') {
    return new RegExp('^$'); // Match nothing for empty patterns
  }

  try {
    // Normalize pattern: trim whitespace and convert to lowercase
    pattern = pattern.trim().toLowerCase();
    
    // Split the pattern into components for easier processing
    let protocol = '';
    let domainPart = '';
    let pathPart = '';
    
    // Extract protocol if present
    if (pattern.includes('://')) {
      const protocolSplit = pattern.split('://', 2);
      protocol = protocolSplit[0];
      pattern = protocolSplit[1];
    }
    
    // Split domain and path
    const slashIndex = pattern.indexOf('/');
    if (slashIndex !== -1) {
      domainPart = pattern.substring(0, slashIndex);
      pathPart = pattern.substring(slashIndex);
    } else {
      domainPart = pattern;
      pathPart = '';
    }
    
    // Process domain part
    const hasSubdomainWildcard = domainPart.startsWith('*.');
    let domainRegex = '';
    
    if (hasSubdomainWildcard) {
      // *.example.com - match any subdomain
      const domain = domainPart.substring(2);
      const escapedDomain = escapeRegexStr(domain);
      domainRegex = `(?:[^\\/\\.]+\\.)+${escapedDomain}`;
    } else {
      // example.com - match exact domain or with any subdomain
      const escapedDomain = escapeRegexStr(domainPart);
      domainRegex = `(?:(?:[^\\/\\.]+\\.)*)?${escapedDomain}`;
    }
    
    // Process path part
    let pathRegex = '';
    
    if (pathPart === '') {
      // No path - match domain with or without any path
      pathRegex = '(?:\\/?(?:.*)?)?';
    } else if (pathPart === '/*') {
      // Simple wildcard path - match any non-empty path
      pathRegex = '\\/(?:.+)';
    } else if (pathPart === '/') {
      // Root path only - match exactly
      pathRegex = '\\/?$';
    } else if (pathPart.endsWith('/*')) {
      // Path ending with wildcard - match prefix exactly plus anything after
      const pathPrefix = pathPart.substring(0, pathPart.length - 2);
      const escapedPrefix = escapeRegexStr(pathPrefix);
      pathRegex = `${escapedPrefix}\\/(?:.*)`;
    } else if (pathPart.includes('*')) {
      // Path with wildcards in the middle - special handling needed
      
      // Special case for patterns like /a/*/d
      if (pathPart.includes('/*/')) {
        // Split by /*/ which is our special wildcard segment
        const parts = pathPart.split('/*/');
        
        // Build regex for the pattern like /a/*/d
        // This should match /a/b/d, /a/b/c/d, etc.
        pathRegex = escapeRegexStr(parts[0]) + '\\/';
        
        // Middle part is any number of path segments
        pathRegex += '(?:[^\\/]+(?:\\/[^\\/]+)*)';
        
        // Add the end part if any
        if (parts.length > 1 && parts[1]) {
          if (parts[1].startsWith('/')) {
            pathRegex += escapeRegexStr(parts[1]);
          } else {
            pathRegex += '\\/' + escapeRegexStr(parts[1]);
          }
        }      } else {        // Handle other wildcards in path
        const segments = pathPart.split('/');
        pathRegex = '';
        
        for (let i = 0; i < segments.length; i++) {
          // Add slash between segments, or at the beginning if the path starts with /
          if (i > 0 || (pathPart.startsWith('/') && segments[0] !== '')) {
            pathRegex += '\\/';
          }
          
          const segment = segments[i];
          if (segment === '*') {
            // * as entire segment matches any segment content
            pathRegex += '[^\\/]+';
          } else if (segment.includes('*')) {
            // Wildcard within segment like pro*-large or ab*cd
            // Split the segment on * and create a regex that matches anything in between
            const parts = segment.split('*');
            let segmentRegex = '';
            
            for (let j = 0; j < parts.length; j++) {
              segmentRegex += escapeRegexStr(parts[j]);
              if (j < parts.length - 1) {
                // Add wildcard between parts
                segmentRegex += '.*?'; // Non-greedy to avoid excessive matching
              }
            }
            
            pathRegex += segmentRegex;
          } else if (segment !== '') {
            // Regular segment
            pathRegex += escapeRegexStr(segment);
          }
        }
        
        // Add end of string anchor if not ending with wildcard
        if (!pathPart.endsWith('*')) {
          pathRegex += '$';
        }
      }
    } else {
      // Regular path - match exactly with optional trailing slash
      const normalizedPath = pathPart.endsWith('/') ? 
                          pathPart.substring(0, pathPart.length - 1) : 
                          pathPart;
      pathRegex = escapeRegexStr(normalizedPath) + '\\/?$';
    }
    
    // Build the complete regex
    let regexStr = '^';
    
    // Add protocol
    if (protocol) {
      // Specific protocol required
      regexStr += escapeRegexStr(protocol) + ':\\/\\/';
    } else {
      // Protocol optional
      regexStr += '(?:https?:\\/\\/)?';
    }
    
    // Add domain and path
    regexStr += domainRegex + pathRegex;
    
    // Create and return the RegExp object
    return new RegExp(regexStr, 'i');
  } catch (error) {
    console.error(`Error creating regex from pattern "${pattern}":`, error);
    // Return a safe fallback regex that won't match anything unexpected
    return new RegExp('^$');
  }
}

/**
 * Helper function to escape special regex characters in a string
 */
function escapeRegexStr(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if a URL matches a pattern.
 * 
 * @param {string} pattern - The pattern to match against (can include wildcards)
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL matches the pattern
 */
function matchesPattern(pattern, url) {
  if (!pattern || !url) {
    return false;
  }
  
  try {
    // Normalize URL - query parameters should be ignored for matching 
    // unless explicitly included in pattern
    let normalizedUrl = url.toLowerCase();
    
    // Remove query parameters and hash unless pattern includes them
    if (!pattern.includes('?') && normalizedUrl.includes('?')) {
      normalizedUrl = normalizedUrl.split('?')[0];
    }
    
    if (!pattern.includes('#') && normalizedUrl.includes('#')) {
      normalizedUrl = normalizedUrl.split('#')[0];
    }
    
    // Special case for domain/* patterns
    if (pattern.endsWith('/*') && !pattern.includes('://') && !pattern.includes('/', 0, pattern.length - 2)) {
      // For pattern like "example.com/*"
      const domainPart = pattern.substring(0, pattern.length - 2);
      
      // URLs that are just the domain (with or without trailing slash) shouldn't match
      const domainOnly = normalizedUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (domainOnly === domainPart) {
        return false;
      }
    }
    
    const regex = wildcardToRegExp(pattern);
    return regex.test(normalizedUrl);
  } catch (error) {
    console.error(`Error matching pattern ${pattern} against URL ${url}:`, error);
    return false;
  }
}

/**
 * Determines if a URL should be blocked based on deny/allow patterns.
 * 
 * @param {string} url - The URL to check
 * @param {string[]} denyPatterns - Array of patterns to block
 * @param {string[]} allowPatterns - Array of patterns to explicitly allow
 * @returns {boolean} True if the URL should be blocked
 */
function checkUrlShouldBeBlocked(url, denyPatterns = [], allowPatterns = []) {
  // First check if the URL matches any allow pattern
  if (Array.isArray(allowPatterns)) {
    for (const pattern of allowPatterns) {
      if (matchesPattern(pattern, url)) {
        return false; // URL is explicitly allowed
      }
    }
  }
  
  // Then check if the URL matches any deny pattern
  if (Array.isArray(denyPatterns)) {
    for (const pattern of denyPatterns) {
      if (matchesPattern(pattern, url)) {
        return true; // URL should be blocked
      }
    }
  }
  
  return false; // No patterns matched, so don't block
}

module.exports = {
  wildcardToRegExp,
  matchesPattern,
  checkUrlShouldBeBlocked
};
