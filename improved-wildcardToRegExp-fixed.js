/**
 * Improved wildcardToRegExp function with stronger case insensitivity
 * 
 * This function converts wildcard patterns to regular expressions,
 * with special handling for domain-only patterns to ensure proper matching
 * regardless of case.
 */

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
  
  // For URL patterns with protocol, anchor to the start but be more permissive
  if (pattern.includes('://')) {
    // Extract domain part from URL pattern to allow matching just the domain
    try {
      const urlPattern = pattern.startsWith('http') ? pattern : `https://${pattern}`;
      const parsedUrl = new URL(urlPattern);
      const hostname = parsedUrl.hostname;
      
      // Also create a more permissive version that can match the hostname anywhere in URL
      const hostnameRegex = new RegExp(`(^|\\.)${hostname.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*')}`, 'i');
      
      // Original full URL regex
      const fullUrlRegex = new RegExp(`^${regexPattern}`, 'i');
      
      // Return a combined function that tests both
      const combinedRegex = {
        test: function(testUrl) {
          // Try to extract hostname
          try {
            const parsedTestUrl = new URL(testUrl);
            return fullUrlRegex.test(testUrl) || hostnameRegex.test(parsedTestUrl.hostname);
          } catch (e) {
            // If URL parsing fails, just use the full regex
            return fullUrlRegex.test(testUrl);
          }
        },
        toString: function() {
          return fullUrlRegex.toString() + " OR " + hostnameRegex.toString();
        }
      };
      
      return combinedRegex;
    } catch (e) {
      // If URL parsing fails, fall back to basic regex
      console.log(`Error parsing URL pattern: ${e.message}`);
      return new RegExp(`^${regexPattern}`, 'i');
    }
  } else {
    // For non-protocol patterns, improve domain matching
    if (!pattern.includes('/')) {
      // Don't anchor at the start or end for better domain matching
      return new RegExp(regexPattern, 'i');
    }
    return new RegExp(regexPattern, 'i');
  }
}

// Export the function for testing
module.exports = { wildcardToRegExp };
