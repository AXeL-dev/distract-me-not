// Updated implementation of URL blocking functions
// These use the imported pattern matcher for better reliability
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
  
  // Parse URL for hostname and path matching (for logging purposes)
  let hostname = "";
  let parsedPath = "";
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname.toLowerCase();
    parsedPath = parsedUrl.pathname;
    logInfo(`URL hostname: ${hostname}, Path: ${parsedPath}`);
  } catch (e) {
    // Not a valid URL, continue with normal checks
    logInfo(`URL parsing failed, will use full URL: ${e.message}`);
  }
  
  // STEP 1: Check for specific path patterns in allow list first (highest priority)
  // First check if the URL is on the allow list using the imported pattern matching functions
  let hasAllowMatch = false;
  let allowPattern = '';
  
  for (const site of whitelist) {
    try {
      const pattern = typeof site === 'string' ? site : site.pattern || site.url;
      if (!pattern) continue;
      
      // Use the imported matchesPattern function for all pattern matching
      if (matchesPattern(pattern, url)) {
        logInfo(`URL MATCHED allow list pattern: ${pattern} - allowing access`);
        hasAllowMatch = true;
        allowPattern = pattern;
        
        // For specific path patterns with wildcards or exact paths, return immediately
        // as they take highest precedence
        if (pattern.includes('/')) {
          return { blocked: false, reason: `Allow List specific path: ${pattern}` };
        }
        
        // Just store the domain-only match for later but don't return immediately
      }
    } catch (e) {
      logError('Error checking allowlist pattern:', e);
    }
  }
  
  // STEP 2: Check if the URL is on the deny list
  // Only check deny patterns if no specific allow pattern matched
  // or if we're in combined/denylist mode
  
  if (mode === 'blacklist' || mode === 'denylist' || mode === 'combined') {
    for (const site of blacklist) {
      try {
        const pattern = typeof site === 'string' ? site : site.pattern || site.url;
        if (!pattern) continue;
        
        // Use the imported matchesPattern function
        if (matchesPattern(pattern, url)) {
          // If there's an allow match, it might override this deny pattern
          if (hasAllowMatch) {
            logInfo(`URL matches deny pattern ${pattern}, but is overridden by allow pattern: ${allowPattern}`);
            return { blocked: false, reason: `Allow List pattern: ${allowPattern} overrides deny list: ${pattern}` };
          }
          
          logInfo(`URL MATCHED deny list pattern: ${pattern} - blocking access`);
          return { blocked: true, reason: `Deny List pattern: ${pattern}` };
        }
      } catch (e) {
        logError('Error checking denylist pattern:', e);
      }
    }
    
    // Check keywords in deny list
    for (const keyword of blacklistKeywords) {
      try {
        const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
        if (!pattern) continue;
        
        const normalizedPattern = pattern.toLowerCase();
        const normalizedUrl = url.toLowerCase();
        
        if (normalizedUrl.includes(normalizedPattern) || 
            (hostname && hostname.includes(normalizedPattern))) {
          logInfo(`URL MATCHED deny list keyword: ${pattern} - blocking access`);
          return { blocked: true, reason: `Deny List keyword: ${pattern}` };
        }
      } catch (e) {
        logError('Error checking deny list keyword:', e);
      }
    }
  }
  
  // STEP 3: Check for domain-only allow patterns if we had a match earlier
  if (hasAllowMatch) {
    return { blocked: false, reason: `Allow List domain: ${allowPattern}` };
  }
  
  // STEP 4: In allow list mode, block everything not explicitly allowed
  if (mode === 'whitelist' || mode === 'allowlist') {
    logInfo(`URL not in allow list: ${url} - blocking access (Allow List Mode)`);
    return { blocked: true, reason: "URL not on Allow List (Allow List Mode)" }; 
  }
    // If we reach here, allow the URL
  logInfo(`URL didn't match any blocking rules: ${url} - allowing access`);
  return { blocked: false, reason: "URL allowed by default (no matching rules)" };
}

// Function that checks if a URL should be blocked according to rules
function checkUrlAgainstRules(url) {
  logInfo(`Checking URL against rules: ${url}`);
  const result = checkUrlShouldBeBlocked(url);
  
  if (result.blocked) {
    logInfo(`URL should be BLOCKED: ${url} - Reason: ${result.reason}`);
    return true;
  } else {
    logInfo(`URL should be ALLOWED: ${url} - Reason: ${result.reason}`);
    return false;
  }
}

// Utility function for testing URL matching
function testUrlMatch(url, pattern) {
  console.log(`Testing URL: ${url} against pattern: ${pattern}`);
  
  // Use the imported matchesPattern function from service-worker-patterns.js
  const isMatch = matchesPattern(pattern, url);
  console.log(`Result: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
  
  // Try also with hostname extraction
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const hostnameMatch = matchesPattern(pattern, hostname);
    console.log(`Hostname: ${hostname}`);
    console.log(`Hostname match: ${hostnameMatch ? 'MATCH' : 'NO MATCH'}`);
  } catch (e) {
    console.log(`URL parsing failed: ${e.message}`);
  }
  
  return isMatch;
}
