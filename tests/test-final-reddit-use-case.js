// Final test script for the Reddit use case
// This validates the exact scenario we're trying to implement

// Function to convert a wildcard pattern to a regular expression
function wildcardToRegExp(pattern) {
  // Normalize pattern to lowercase for case-insensitive matching
  pattern = pattern.toLowerCase().trim();
  
  // Special case: empty pattern
  if (!pattern) {
    return new RegExp("^$", 'i');
  }
  
  // Domain-only patterns (like "example.com")
  if (!pattern.includes('://') && !pattern.includes('/')) {
    // Escape special characters
    const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    const regexPattern = escaped.replace(/\*/g, '.*');
    
    // Special case for *.domain.com to match subdomains but not the base domain
    if (pattern.startsWith('*.')) {
      const domainPart = regexPattern.substring(2); // Remove *. prefix
      return new RegExp(`^(?:[^.]+\\.)+${domainPart}(?:\\/.*)?$`, 'i');
    }
    
    // For domain-only patterns (example.com), match the exact domain or any subdomain
    return new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${regexPattern}(?:\\/.*)?$`, 'i');
  }

  // Domain with wildcard path (example.com/*)
  const domainWithWildcardPath = /^((?:https?:\/\/)?[^\/]+)\/\*$/i;
  const domainPathMatch = pattern.match(domainWithWildcardPath);
  
  if (domainPathMatch) {
    const domainPart = domainPathMatch[1];
    const escapedDomain = domainPart.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    
    // Match domain with any non-empty path
    // This specifically does NOT match the domain root
    return new RegExp(`^(?:https?:\\/\\/)?(?:www\\.)?${escapedDomain}\\/(?!$).+`, 'i');
  }

  // Domain with specific path pattern (example.com/path/*)
  if (pattern.includes('/*')) {
    const parts = pattern.split('/*');
    if (parts.length > 0) {
      const base = parts[0].replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`^(?:https?:\\/\\/)?(?:www\\.)?${base}\\/.*`, 'i');
    }
  }
  
  // For other patterns with path or protocol, do standard conversion
  const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  const regexPattern = escaped.replace(/\*/g, '.*');
  
  // Make protocol optional if not specified
  if (!pattern.includes('://')) {
    return new RegExp(`^(?:https?:\\/\\/)?${regexPattern}`, 'i');
  } else {
    return new RegExp(`^${regexPattern}`, 'i');
  }
}

// Improved function to simulate the service worker's URL blocking logic
function checkUrlShouldBeBlocked(url, allowList = [], denyList = []) {
  console.log(`\nChecking URL: ${url}`);
  
  // Parse URL for hostname matching
  let hostname = "";
  let path = "";
  
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname.toLowerCase();
    path = parsedUrl.pathname;
    console.log(`Hostname: ${hostname}, Path: ${path}`);
  } catch (e) {
    console.log(`URL parsing failed: ${e.message}`);
  }
  
  // Step 1: Check if URL is in allow list
  for (const pattern of allowList) {
    try {
      // Check for specific path allowlist patterns first (highest priority)
      if (pattern.includes('/') && !pattern.endsWith('/*')) {
        const regex = wildcardToRegExp(pattern);
        if (regex.test(url)) {
          console.log(`URL matches specific allow list pattern: ${pattern}`);
          return { blocked: false, reason: `Allow List pattern: ${pattern}` };
        }
      }
    } catch (e) {
      console.log(`Error checking allow pattern: ${e.message}`);
    }
  }
  
  // Step 2: Check for path patterns in the allow list
  let pathWhitelisted = false;
  let pathWhitelistedBy = null;
  
  for (const pattern of allowList) {
    try {
      if (pattern.includes('/*')) {
        const regex = wildcardToRegExp(pattern);
        if (regex.test(url)) {
          console.log(`URL matches path allow list pattern: ${pattern}`);
          pathWhitelisted = true;
          pathWhitelistedBy = `Allow List pattern: ${pattern}`;
          break;
        }
      }
    } catch (e) {
      console.log(`Error checking path allow pattern: ${e.message}`);
    }
  }
  
  // Step 3: Check for generic path patterns in the deny list
  for (const pattern of denyList) {
    try {
      // Look specifically for patterns like "example.com/*"
      if (pattern.endsWith('/*') && !pattern.includes('/*/')) {
        const regex = wildcardToRegExp(pattern);
        
        // Only match if the URL has a non-empty path
        if (regex.test(url) && path && path !== '/') {
          console.log(`URL with path matches deny list pattern: ${pattern}`);
          
          // If we have a specific path allowlist, honor it
          if (pathWhitelisted) {
            console.log(`But URL is specifically allowed by: ${pathWhitelistedBy}`);
            return { blocked: false, reason: pathWhitelistedBy };
          }
          
          return { blocked: true, reason: `Deny List pattern: ${pattern}` };
        }
      }
    } catch (e) {
      console.log(`Error checking deny pattern: ${e.message}`);
    }
  }
  
  // Step 4: Check for domain-only patterns in the allow list
  for (const pattern of allowList) {
    try {
      if (!pattern.includes('/')) {
        const regex = wildcardToRegExp(pattern);
        if (regex.test(url) || (hostname && regex.test(hostname))) {
          console.log(`URL matches domain-only allow list pattern: ${pattern}`);
          return { blocked: false, reason: `Allow List pattern: ${pattern}` };
        }
      }
    } catch (e) {
      console.log(`Error checking domain-only allow pattern: ${e.message}`);
    }
  }
  
  // Step 5: Check remaining patterns in the deny list
  for (const pattern of denyList) {
    try {
      const regex = wildcardToRegExp(pattern);
      if (regex.test(url) || (hostname && regex.test(hostname))) {
        console.log(`URL matches deny list pattern: ${pattern}`);
        return { blocked: true, reason: `Deny List pattern: ${pattern}` };
      }
    } catch (e) {
      console.log(`Error checking deny pattern: ${e.message}`);
    }
  }
  
  // If no pattern matched, allow the URL by default
  console.log(`No matching patterns, allowing URL by default`);
  return { blocked: false, reason: "URL allowed by default (no matching rules)" };
}

// Test the Reddit use case specifically
function testRedditUseCase() {
  console.log("=== TESTING REDDIT USE CASE ===");
  
  const allowList = ["reddit.com", "reddit.com/r/news/*"];
  const denyList = ["reddit.com/*"];
  
  console.log(`Allow list: ${JSON.stringify(allowList)}`);
  console.log(`Deny list: ${JSON.stringify(denyList)}`);
  console.log("\n-----------------");
  
  // Test root domain (should be allowed)
  let result = checkUrlShouldBeBlocked("https://www.reddit.com", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  result = checkUrlShouldBeBlocked("https://old.reddit.com", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  // Test subpaths (should be blocked except for /r/news/*)
  result = checkUrlShouldBeBlocked("https://www.reddit.com/r/all", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  result = checkUrlShouldBeBlocked("https://old.reddit.com/r/redheads", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  // Test allowed subpaths
  result = checkUrlShouldBeBlocked("https://www.reddit.com/r/news", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  
  result = checkUrlShouldBeBlocked("https://old.reddit.com/r/news/comments/123", allowList, denyList);
  console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
}

// Run the test
testRedditUseCase();
