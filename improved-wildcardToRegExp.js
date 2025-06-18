// Enhanced wildcardToRegExp function with better domain matching
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
    
    // For domain-only patterns, make the regex much more permissive
    // This will match the domain anywhere in the hostname
    return new RegExp(regexPattern, 'i');
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
      return new RegExp(`^${escaped}(?:[^/]*)?$`, 'i');
    } else {
      // For exact patterns like "example.com/page", match only that exact URL
      const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      
      // If it looks like just a domain, make it more flexible for matching
      if (!escaped.includes('/') && !escaped.includes(':')) {
        // Match domain name anywhere
        return new RegExp(escaped, 'i');
      }
      
      return new RegExp(`^${escaped}$`, 'i');
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

// Enhanced checkUrlShouldBeBlocked function with better domain matching
function checkUrlShouldBeBlocked(url) {
  // Always allow internal browser pages
  if (url.startsWith('edge://') || url.startsWith('chrome://')) {
    logInfo(`Allowing internal browser page: ${url}`);
    return { blocked: false, reason: "Internal browser page" };
  }

  // If not enabled, don't block anything
  if (!isEnabled) {
    return { blocked: false, reason: "Extension disabled" };
  }
  
  logInfo(`Checking URL against rules: ${url}`);
  
  // Step 1: Parse URL for hostname matching
  let hostname = "";
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname.toLowerCase();
    logInfo(`URL hostname: ${hostname}`);
  } catch (e) {
    // Not a valid URL, continue with normal checks
    logInfo(`URL parsing failed, will use full URL: ${e.message}`);
  }
  
  // Step 2: Check if URL is whitelisted (should override blacklist)
  let isWhitelisted = false;
  let whitelistedBy = null; 
  
  // Check site patterns in whitelist
  for (const site of whitelist) {
    try {
      const pattern = typeof site === 'string' ? site : site.pattern || site.url;
      if (!pattern) continue;
      
      const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$$/g, ''));
      
      // Try to match both full URL and hostname (if available)
      if (regexPattern.test(url) || (hostname && regexPattern.test(hostname))) {
        logInfo(`URL MATCHED whitelist pattern: ${pattern} - allowing access`);
        isWhitelisted = true;
        whitelistedBy = `Whitelist pattern: ${pattern}`;
        break;
      }
    } catch (e) {
      logError('Error checking whitelist pattern:', e);
    }
  }
  
  // Check keywords in whitelist
  if (!isWhitelisted) {
    for (const keyword of whitelistKeywords) {
      try {
        const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
        if (!pattern) continue;
        
        if (url.toLowerCase().includes(pattern.toLowerCase()) || 
            (hostname && hostname.toLowerCase().includes(pattern.toLowerCase()))) {
          logInfo(`URL MATCHED whitelist keyword: ${pattern} - allowing access`);
          isWhitelisted = true;
          whitelistedBy = `Whitelist keyword: ${pattern}`;
          break; 
        }
      } catch (e) {
        logError('Error checking whitelist keyword:', e);
      }
    }
  }
  
  // If URL is explicitly whitelisted, allow regardless of mode or blacklist
  if (isWhitelisted && (mode === 'whitelist' || mode === 'combined')) {
    return { blocked: false, reason: whitelistedBy };
  }
  
  // Step 3: In whitelist mode, block everything not whitelisted
  if (mode === 'whitelist') {
    logInfo(`URL not in whitelist: ${url} - blocking access`);
    return { blocked: true, reason: "URL not on whitelist (Whitelist Mode)" }; 
  }
  
  // Step 4: In blacklist or combined modes, check against blacklist
  if (mode === 'blacklist' || mode === 'combined') {
    // Try direct hostname match first (more reliable)
    if (hostname) {
      for (const site of blacklist) {
        try {
          const pattern = typeof site === 'string' ? site : site.pattern || site.url;
          if (!pattern) continue;
          
          const patternLower = pattern.toLowerCase().trim();
          
          // Direct domain comparison (very reliable)
          if (hostname === patternLower || hostname.endsWith('.' + patternLower)) {
            if (mode === 'combined' && isWhitelisted) {
              logInfo(`Hostname '${hostname}' directly matched blacklist domain: ${pattern}, but was whitelisted by: ${whitelistedBy} - allowing access`);
              return { blocked: false, reason: whitelistedBy };
            }
            logInfo(`Hostname '${hostname}' directly matched blacklist domain: ${pattern} - blocking access`);
            return { blocked: true, reason: `Blacklist pattern: ${pattern}` };
          }
        } catch (e) {
          logError('Error checking blacklist pattern direct match:', e);
        }
      }
    }
    
    // Check site patterns in blacklist using regex
    for (const site of blacklist) {
      try {
        const pattern = typeof site === 'string' ? site : site.pattern || site.url;
        if (!pattern) continue;
        
        const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$$/g, ''));
        
        // Try to match both full URL and hostname
        if (regexPattern.test(url) || (hostname && regexPattern.test(hostname))) {
          if (mode === 'combined' && isWhitelisted) {
            logInfo(`URL MATCHED blacklist pattern: ${pattern}, but was whitelisted by: ${whitelistedBy} - allowing access`);
            return { blocked: false, reason: whitelistedBy };
          }
          logInfo(`URL MATCHED blacklist pattern: ${pattern} - blocking access`);
          return { blocked: true, reason: `Blacklist pattern: ${pattern}` };
        }
      } catch (e) {
        logError('Error checking blacklist pattern:', e);
      }
    }
    
    // Check keywords in blacklist
    for (const keyword of blacklistKeywords) {
      try {
        const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
        if (!pattern) continue;
        
        const normalizedPattern = pattern.toLowerCase();
        const normalizedUrl = url.toLowerCase();
        
        if (normalizedUrl.includes(normalizedPattern) || 
            (hostname && hostname.includes(normalizedPattern))) {
          if (mode === 'combined' && isWhitelisted) {
            logInfo(`URL MATCHED blacklist keyword: ${pattern}, but was whitelisted by: ${whitelistedBy} - allowing access`);
            return { blocked: false, reason: whitelistedBy };
          }
          logInfo(`URL MATCHED blacklist keyword: ${pattern} - blocking access`);
          return { blocked: true, reason: `Blacklist keyword: ${pattern}` };
        }
      } catch (e) {
        logError('Error checking blacklist keyword:', e);
      }
    }
  }
  
  // If we reach here, allow the URL
  logInfo(`URL didn't match any blocking rules: ${url} - allowing access`);
  return { blocked: false, reason: "URL allowed by default (no matching rules)" };
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
  
  return isMatch;
}

// Debug function to test domain matching
function testDomainMatching() {
  console.log("=== TESTING DOMAIN MATCHING ===");
  
  // Test with iptorrents.com
  testUrlMatch("https://iptorrents.com/t", "iptorrents.com");
  testUrlMatch("https://iptorrents.com/t?p=8#torrents", "iptorrents.com");
  testUrlMatch("https://www.iptorrents.com/t", "iptorrents.com");
  
  // Test with wildcards
  testUrlMatch("https://sub.example.com/page", "*.example.com");
  testUrlMatch("https://example.com/page", "*.example.com");
  
  // Test with uppercase/lowercase
  testUrlMatch("https://IPTORRENTS.COM/t", "iptorrents.com");
  
  console.log("=== END TESTING ===");
}
