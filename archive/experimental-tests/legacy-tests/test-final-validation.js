// Final validation test script for subreddit blocking functionality

// Copy the current wildcardToRegExp function
function wildcardToRegExp(pattern) {
  // First, normalize pattern to lowercase for case-insensitive matching
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
        
        // Match any subdomain of the domain with any path
        return new RegExp(`^(?:${protocol}:\\/\\/)?(?:[^.\\/]+\\.)*${escapedDomain}\\/.*`, 'i');
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
    const regexPattern = escaped.replace(/\*/g, '.*');
    
    // Special case for *.domain.com to match subdomains
    if (pattern.startsWith('*.')) {
      const domainPart = regexPattern.substring(2); // Remove *. prefix
      // Match domain with any subdomain but ensure it's actually a subdomain
      // This will match sub.example.com but not notexample.com
      return new RegExp(`^(?:[^.]+\\.)+${domainPart}$`, 'i');
    }
    
    // For domain-only patterns, match the domain in full URLs with or without subdomains
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
    // URL with trailing slash should match the exact URL including the trailing slash
    // or the URL without the trailing slash
    else {
      // For patterns like "https://www.reddit.com/" only match exactly that URL
      // with or without trailing slash, not all paths under it
      if (pattern.includes('://')) {
        // Remove trailing slash for matching
        const withoutSlash = escaped.slice(0, -1);
        return new RegExp(`^${withoutSlash}\\/?$`, 'i');
      } else {
        // Remove trailing slash for matching
        const withoutSlash = escaped.slice(0, -1);
        return new RegExp(`^(?:https?:\/\/)?${withoutSlash}\\/?$`, 'i');
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

// Simplified version of checkUrlShouldBeBlocked for testing
function checkUrlShouldBeBlocked(url, allowList, denyList) {
  console.log(`\n==== Testing URL: ${url} ====`);
  
  // STEP 1: Check for specific path patterns in allow list first (highest priority)
  for (const pattern of allowList) {
    try {
      // Check if this is a specific path pattern (contains both / and *)
      if (pattern.includes('/') && pattern.includes('*')) {
        console.log(`Testing specific path allowlist pattern: ${pattern}`);
        const regexPattern = wildcardToRegExp(pattern);
        console.log(`  RegEx: ${regexPattern}`);
        
        if (regexPattern.test(url)) {
          console.log(`  → MATCH - URL ALLOWED by specific path pattern`);
          return { blocked: false, reason: `Allow List specific path: ${pattern}` };
        } else {
          console.log(`  → NO MATCH`);
        }
      }
    } catch (e) {
      console.error('Error checking specific path allowlist pattern:', e);
    }
  }
  
  // STEP 2: Check for path wildcard patterns in deny list
  try {
    const parsedUrl = new URL(url);
    const parsedPath = parsedUrl.pathname;
    
    if (parsedPath && parsedPath !== '/') {
      for (const pattern of denyList) {
        // Check for patterns with wildcards in paths
        if (pattern.includes('/*')) {
          const regexPattern = wildcardToRegExp(pattern);
          console.log(`Testing path deny pattern: ${pattern}`);
          console.log(`  RegEx: ${regexPattern}`);
          
          if (regexPattern.test(url)) {
            console.log(`  → MATCH - URL BLOCKED by wildcard path pattern`);
            return { blocked: true, reason: `Deny List pattern: ${pattern} (blocks matching paths)` };
          } else {
            console.log(`  → NO MATCH`);
          }
        }
      }
    }
  } catch (e) {
    console.error('Error checking path:', e);
  }
  
  // STEP 3: Check domain-only patterns in allow list
  for (const pattern of allowList) {
    try {
      // Skip specific path patterns as we've already checked them
      if (pattern.includes('/') && pattern.includes('*')) {
        continue;
      }
      
      // Check if it's a domain-only pattern or exact URL
      const regexPattern = wildcardToRegExp(pattern);
      console.log(`Testing domain/exact allowlist pattern: ${pattern}`);
      console.log(`  RegEx: ${regexPattern}`);
      
      if (regexPattern.test(url)) {
        console.log(`  → MATCH - URL ALLOWED by domain/exact pattern`);
        return { blocked: false, reason: `Allow List: ${pattern}` };
      } else {
        console.log(`  → NO MATCH`);
      }
    } catch (e) {
      console.error('Error checking domain-only allowlist pattern:', e);
    }
  }
  
  // STEP 4: Check remaining patterns in deny list
  for (const pattern of denyList) {
    try {
      // Skip patterns we've already checked (domain/* patterns)
      if (pattern.endsWith('/*') && !pattern.includes('/*/')) {
        continue;
      }
      
      const regexPattern = wildcardToRegExp(pattern);
      console.log(`Testing general denylist pattern: ${pattern}`);
      console.log(`  RegEx: ${regexPattern}`);
      
      if (regexPattern.test(url)) {
        console.log(`  → MATCH - URL BLOCKED by general pattern`);
        return { blocked: true, reason: `Deny List pattern: ${pattern}` };
      } else {
        console.log(`  → NO MATCH`);
      }
    } catch (e) {
      console.error('Error checking deny list pattern:', e);
    }
  }
  
  // If we reach here, allow the URL by default
  console.log(`  → URL allowed by default (no matching rules)`);
  return { blocked: false, reason: "URL allowed by default (no matching rules)" };
}

// Run comprehensive test cases
function runTests() {
  console.log('===== FINAL VALIDATION TESTS - REDDIT SUBREDDIT BLOCKING =====');
  
  // Test case: Block all of reddit except the home page and specific subreddits
  const allowList = [
    'https://www.reddit.com',   // Just the homepage 
    'https://www.reddit.com/',  // Homepage with trailing slash
    'https://www.reddit.com/r/programming/*',
    'https://www.reddit.com/r/news/*', 
    'https://www.reddit.com/r/hoggit/*'
  ];
  
  const denyList = [
    'reddit.com/r/*'  // Block all subreddits by default
  ];
  
  console.log("ALLOW LIST:", JSON.stringify(allowList, null, 2));
  console.log("DENY LIST:", JSON.stringify(denyList, null, 2));
  console.log("\n--- Testing URLs ---");
  
  // Test URLs
  const testUrls = [
    'https://www.reddit.com',                // Should be allowed by exact match
    'https://www.reddit.com/',               // Should be allowed by exact match with trailing slash
    'https://www.reddit.com/r/all',          // Should be blocked by reddit.com/r/* pattern
    'https://www.reddit.com/r/popular',      // Should be blocked by reddit.com/r/* pattern
    'https://www.reddit.com/r/programming',  // Should match programming/* allowlist pattern
    'https://www.reddit.com/r/programming/comments/123456', // Should match programming/* allowlist pattern
    'https://www.reddit.com/r/news',         // Should match news/* allowlist pattern
    'https://www.reddit.com/r/news/comments/xyz123',  // Should match news/* allowlist pattern
    'https://www.reddit.com/r/hoggit',       // Should match hoggit/* allowlist pattern
    'https://www.reddit.com/r/askreddit',    // Should be blocked by default deny pattern
    'https://old.reddit.com/r/askreddit'     // Should be blocked by default deny pattern
  ];
  
  for (const url of testUrls) {
    const result = checkUrlShouldBeBlocked(url, allowList, denyList);
    console.log(`RESULT for ${url}: ${result.blocked ? 'BLOCKED' : 'ALLOWED'}, Reason: ${result.reason}`);
  }

  // Test https://*.redgifs.com/* pattern
  console.log('\n===== TESTING HTTPS://*.REDGIFS.COM/* PATTERN =====');
  
  const redgifsDenyList = ['https://*.redgifs.com/*'];
  const redgifsAllowList = [];
  
  const redgifsUrls = [
    'https://example.redgifs.com/view/something',
    'https://api.redgifs.com/files/test',
    'https://redgifs.com/view/file', // No subdomain
    'http://www.redgifs.com/test'    // HTTP instead of HTTPS
  ];
  
  for (const url of redgifsUrls) {
    const result = checkUrlShouldBeBlocked(url, redgifsAllowList, redgifsDenyList);
    console.log(`RESULT for ${url}: ${result.blocked ? 'BLOCKED' : 'ALLOWED'}, Reason: ${result.reason}`);
  }
}

// Run all tests
runTests();
