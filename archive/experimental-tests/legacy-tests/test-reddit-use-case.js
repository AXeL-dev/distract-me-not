// Test script for the Reddit use case
// This validates the exact scenario we're trying to implement

// Import the wildcardToRegExp function from the service worker
function wildcardToRegExp(pattern) {
  // First, normalize pattern to lowercase for case-insensitive matching
  pattern = pattern.toLowerCase().trim();
  
  // Special case: empty pattern
  if (!pattern) {
    return new RegExp("^$", 'i');
  }
  
  // If it's a simple domain rule without protocol or path
  if (!pattern.includes('://') && !pattern.includes('/')) {
    // First, escape any regex special characters
    const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    
    // Replace wildcards with appropriate regex
    const regexPattern = escaped.replace(/\*/g, '.*');
    
    // Special case for *.domain.com to match subdomains
    if (pattern.startsWith('*.')) {
      const domainPart = regexPattern.substring(2); // Remove *. prefix
      // Match domain with any subdomain but ensure it's actually a subdomain
      return new RegExp(`^(?:[^.]+\\.)+${domainPart}$`, 'i');
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
    
    // Create a regex that matches the domain and anything after the slash
    // But NOT match just the domain root with or without a trailing slash
    // e.g. "example.com/*" matches "example.com/anything" but NOT "example.com" or "example.com/"
    return new RegExp(`^(?:https?:\/\/)?(?:www\\.)?${escapedDomain}\\/(?!$)[^\\/].*$`, 'i');
  }
  
  // Case 2: Domain with specific path pattern
  // Like https://www.example.com/path/* or example.com/path/to/*
  if (pattern.includes('/*')) {
    // Split into domain+path and wildcard parts
    const parts = pattern.split('/*');
    if (parts.length > 0) {
      const base = parts[0].replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      // Allow for protocol and www subdomain in URL
      return new RegExp(`^(?:https?:\/\/)?(?:www\\.)?${base}\/.*$`, 'i');
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
    
    return new RegExp(`^(?:https?:\/\/)?(?:[^\/]+\\.)?${escapedDomain}${escapedPath}$`, 'i');
  }
  
  // Case 4: Exact URL pattern (no wildcards)
  // Handle cases like "https://example.com" vs "https://example.com/"
  if (!pattern.includes('*')) {
    // Exact URL without trailing slash should only match that exact URL
    const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    if (!pattern.endsWith('/')) {
      // Make protocol optional to match both with and without protocol
      if (pattern.includes('://')) {
        return new RegExp(`^${escaped}$`, 'i');
      } else {
        return new RegExp(`^(?:https?:\/\/)?${escaped}$`, 'i');
      }
    }
    // URL with trailing slash should match the exact URL or anything under that path
    else {
      // Optionally match anything after the trailing slash and make protocol optional
      if (pattern.includes('://')) {
        return new RegExp(`^${escaped}.*$`, 'i');
      } else {
        return new RegExp(`^(?:https?:\/\/)?${escaped}.*$`, 'i');
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

// Helper function to simulate checkUrlShouldBeBlocked logic
function simulateBlockCheck(url, allowList = [], denyList = []) {
  console.log(`\nSimulating block check for URL: ${url}`);
  
  // Extract hostname for domain matching
  let hostname = "";
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname.toLowerCase();
    console.log(`URL hostname: ${hostname}, path: ${parsedUrl.pathname}`);
  } catch (e) {
    console.log(`URL parsing failed: ${e.message}`);
  }
  
  // Step 1: Look for exact URL matches in the allow list (highest precedence)
  let exactWhitelisted = false;
  let exactWhitelistedBy = null;
  
  for (const pattern of allowList) {
    const regex = wildcardToRegExp(pattern);
    
    if (regex.test(url)) {
      console.log(`URL exactly matches allow list pattern: ${pattern}, regex: ${regex}`);
      
      // Check if this is a more specific pattern than just the domain
      // For reddit.com/r/news/* vs reddit.com
      if (pattern.includes('/')) {
        exactWhitelisted = true;
        exactWhitelistedBy = `Allow List specific pattern: ${pattern}`;
        console.log(`Exact path match in allow list (high priority): ${pattern}`);
        break;
      } else {
        // Remember domain-only match, but continue searching for more specific matches
        if (!exactWhitelisted) {
          exactWhitelisted = true;
          exactWhitelistedBy = `Allow List domain pattern: ${pattern}`;
        }
      }
    }
  }
  
  // Step 2: If we have a specific path allowlist match, honor it above all else
  if (exactWhitelisted && exactWhitelistedBy && exactWhitelistedBy.includes('specific pattern')) {
    console.log(`RESULT: ALLOWED by ${exactWhitelistedBy} (specific path match)`);
    return { blocked: false, reason: exactWhitelistedBy };
  }
  
  // Step 3: Check deny list patterns
  for (const pattern of denyList) {
    const regex = wildcardToRegExp(pattern);
    
    if (regex.test(url)) {
      console.log(`URL matches deny list pattern: ${pattern}, regex: ${regex}`);
      
      // If this is a specific path pattern on the deny list, it takes precedence over domain-only whitelist
      if (pattern.includes('/*') && url.includes('/')) {
        console.log(`RESULT: BLOCKED by Deny List path pattern: ${pattern} (overrides domain-only allow)`);
        return { blocked: true, reason: `Deny List pattern: ${pattern} (path match)` };
      }
    }
  }
  
  // Step 4: If we had a domain match in the allow list, honor it now
  if (exactWhitelisted) {
    console.log(`RESULT: ALLOWED by ${exactWhitelistedBy}`);
    return { blocked: false, reason: exactWhitelistedBy };
  }
  
  // Step 5: Check domain-level patterns in deny list
  for (const pattern of denyList) {
    const regex = wildcardToRegExp(pattern);
    if (regex.test(url) || (hostname && regex.test(hostname))) {
      console.log(`URL matches deny list domain pattern: ${pattern}`);
      console.log(`RESULT: BLOCKED by Deny List pattern: ${pattern}`);
      return { blocked: true, reason: `Deny List pattern: ${pattern}` };
    }
  }
  
  console.log(`RESULT: ALLOWED (no matching rules)`);
  return { blocked: false, reason: "URL allowed by default (no matching rules)" };
}

// Test the Reddit use case specifically
function testRedditUseCase() {
  console.log("\n=== TESTING REDDIT USE CASE ===");
  
  const allowList = ["reddit.com", "reddit.com/r/news/*"];
  const denyList = ["reddit.com/*"];
  
  console.log(`Allow list: ${JSON.stringify(allowList)}`);
  console.log(`Deny list: ${JSON.stringify(denyList)}`);
  console.log("\n-----------------");
  
  // Test root domain (should be allowed)
  simulateBlockCheck("https://www.reddit.com", allowList, denyList);
  simulateBlockCheck("https://old.reddit.com", allowList, denyList);
  
  // Test subpaths (should be blocked except for /r/news/*)
  simulateBlockCheck("https://www.reddit.com/r/all", allowList, denyList);
  simulateBlockCheck("https://old.reddit.com/r/redheads", allowList, denyList);
  
  // Test allowed subpaths
  simulateBlockCheck("https://www.reddit.com/r/news", allowList, denyList);
  simulateBlockCheck("https://old.reddit.com/r/news/comments/123", allowList, denyList);
}

// Run the test
testRedditUseCase();
