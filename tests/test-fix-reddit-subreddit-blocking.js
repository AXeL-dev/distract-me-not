// Test script to verify Reddit subreddit blocking functionality
// This is a standalone script that you can run in Node.js

// Copy of the updated wildcardToRegExp function
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
      // Extract the domain part
      const protocolAndDomain = pattern.split('/*')[0];
      const domainStart = protocolAndDomain.indexOf('://*.') + 4;
      const domain = protocolAndDomain.substring(domainStart);
      const escapedDomain = domain.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      
      // Match any subdomain of the domain with any path
      return new RegExp(`^(?:https?:\\/\\/)?(?:[^.\\/]+\\.)+${escapedDomain}\\/.*`, 'i');
    } catch (e) {
      console.error('Error processing complex pattern:', pattern, e);
      // Fallback to a simple pattern
      return new RegExp(pattern.replace(/\*/g, '.*'), 'i');
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

// Simplified checkUrlShouldBeBlocked function for testing
function checkUrlShouldBeBlocked(url, allowList, denyList) {
  console.log(`\n==== Testing URL: ${url} ====`);
  
  // Check against allowlist patterns first
  for (const pattern of allowList) {
    try {
      const regex = wildcardToRegExp(pattern);
      const isMatch = regex.test(url);
      console.log(`Testing allowlist pattern: ${pattern}, regex: ${regex}`);
      console.log(`Match: ${isMatch ? 'YES - URL IS ALLOWED' : 'NO'}`);
      
      if (isMatch) {
        return { blocked: false, reason: `Allowed by pattern: ${pattern}` };
      }
    } catch (e) {
      console.error(`Error testing allowlist pattern ${pattern}:`, e);
    }
  }
  
  // Then check against denylist patterns
  for (const pattern of denyList) {
    try {
      const regex = wildcardToRegExp(pattern);
      const isMatch = regex.test(url);
      console.log(`Testing denylist pattern: ${pattern}, regex: ${regex}`);
      console.log(`Match: ${isMatch ? 'YES - URL IS BLOCKED' : 'NO'}`);
      
      if (isMatch) {
        return { blocked: true, reason: `Blocked by pattern: ${pattern}` };
      }
    } catch (e) {
      console.error(`Error testing denylist pattern ${pattern}:`, e);
    }
  }
  
  return { blocked: false, reason: 'No matching rules, allowed by default' };
}

// Run test cases
function runTests() {
  console.log('===== TESTING REDDIT SUBREDDIT BLOCKING =====');
  
  // Test case: Block all of reddit except specific subreddits
  const allowList = [
    'https://www.reddit.com/',
    'https://www.reddit.com/r/programming/*',
    'https://www.reddit.com/r/news/*',
    'https://www.reddit.com/r/hoggit/*'
  ];
  
  const denyList = [
    'reddit.com/r/*'  // Block all subreddits by default
  ];
  
  console.log("ALLOW LIST:", allowList);
  console.log("DENY LIST:", denyList);
  
  // Test URLs and expected results
  const testUrls = [
    'https://www.reddit.com',                // Should be allowed by https://www.reddit.com/
    'https://www.reddit.com/',               // Should be allowed by https://www.reddit.com/
    'https://www.reddit.com/r/all',          // Should be blocked by reddit.com/r/*
    'https://www.reddit.com/r/popular',      // Should be blocked by reddit.com/r/*
    'https://www.reddit.com/r/programming',  // Should be allowed by specific subreddit pattern
    'https://www.reddit.com/r/news',         // Should be allowed by specific subreddit pattern
    'https://www.reddit.com/r/news/comments/xyz123',  // Should be allowed as it matches news/*
    'https://www.reddit.com/r/hoggit',       // Should be allowed by specific subreddit pattern
    'https://www.reddit.com/r/askreddit'     // Should be blocked by default
  ];
  
  for (const url of testUrls) {
    const result = checkUrlShouldBeBlocked(url, allowList, denyList);
    console.log(`RESULT for ${url}: ${result.blocked ? 'BLOCKED' : 'ALLOWED'}, Reason: ${result.reason}`);
  }

  // Test https://*.redgifs.com/* pattern
  console.log('\n===== TESTING HTTPS://*.REDGIFS.COM/* PATTERN =====');
  
  try {
    const redgifsPattern = 'https://*.redgifs.com/*';
    const redgifsRegex = wildcardToRegExp(redgifsPattern);
    console.log(`Pattern: ${redgifsPattern}, RegEx: ${redgifsRegex}`);
    
    const redgifsUrls = [
      'https://example.redgifs.com/view/something',
      'https://api.redgifs.com/files/test',
      'https://redgifs.com/view/file', // No subdomain
      'http://www.redgifs.com/test'    // HTTP instead of HTTPS
    ];
    
    for (const url of redgifsUrls) {
      const isMatch = redgifsRegex.test(url);
      console.log(`URL: ${url} - Match: ${isMatch ? 'YES' : 'NO'}`);
    }
  } catch (e) {
    console.error('Error testing redgifs pattern:', e);
  }
}

// Run all tests
runTests();
