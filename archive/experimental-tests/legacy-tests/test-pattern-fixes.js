// Test for problematic URL patterns

// First, define the wildcardToRegExp function with the fixes
function wildcardToRegExp(pattern) {
  console.log(`Testing pattern: ${pattern}`);
  
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
      const regex = new RegExp(`^(?:[^.]+\\.)+${domainPart}$`, 'i');
      console.log(`  Created regex: ${regex}`);
      return regex;
    }
    
    // For domain-only patterns, match the domain in full URLs with or without subdomains
    const regex = new RegExp(`^(?:https?:\\/\\/)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)*${regexPattern}(?:\\/.*)?$`, 'i');
    console.log(`  Created regex: ${regex}`);
    return regex;
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
    const regex = new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${escapedDomain}\\/(?!$).+`, 'i');
    console.log(`  Created regex: ${regex}`);
    return regex;
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
        
        // Only do special handling if there's a slash in the pattern before the wildcard
        if (lastSlashPos !== -1) {
          // Extract domain and path parts
          const domainPart = base.substring(0, lastSlashPos);
          const pathPart = base.substring(lastSlashPos);
          
          // Match URLs with this domain + specific path + anything after
          const regex = new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${domainPart}${pathPart}\\/.*`, 'i');
          console.log(`  Created regex: ${regex}`);
          return regex;
        }
      }
      
      // Allow for protocol and ANY subdomain in URL
      const regex = new RegExp(`^(?:https?:\\/\\/)?(?:(?:[a-z0-9-]+\\.)*)?${base}(?:\\/.*)?$`, 'i');
      console.log(`  Created regex: ${regex}`);
      return regex;
    }
  }
  
  // Case 3: Handle wildcard subdomain patterns
  // Like *.example.com/path/* or https://*.example.com/*
  if ((pattern.startsWith('*.') || pattern.includes('://*.')) && pattern.includes('/')) {
    // Handle both *.domain.com/path and https://*.domain.com/path patterns
    let domainStart = 0;
    let domainEnd = 0;
    let wildcardPos = pattern.indexOf('*.');
    
    if (wildcardPos !== -1) {
      domainStart = wildcardPos + 2; // Skip the *. part
      domainEnd = pattern.indexOf('/', domainStart);
      
      if (domainEnd === -1) {
        // No path, just wildcard domain
        const domainPart = pattern.substring(domainStart);
        const escapedDomain = domainPart.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`^(?:https?:\\/\\/)?(?:[^\/]+\\.)?${escapedDomain}(?:\\/.*)?$`, 'i');
        console.log(`  Created regex: ${regex}`);
        return regex;
      } else {
        // Has both wildcard domain and path
        const domainPart = pattern.substring(domainStart, domainEnd);
        const pathPart = pattern.substring(domainEnd);
        
        const escapedDomain = domainPart.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
        const escapedPath = pathPart.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*');
        
        const regex = new RegExp(`^(?:https?:\\/\\/)?(?:[^\/]+\\.)?${escapedDomain}${escapedPath}$`, 'i');
        console.log(`  Created regex: ${regex}`);
        return regex;
      }
    }
  }
  
  // Case 4: Exact URL pattern (no wildcards)
  // Handle cases like "https://example.com" vs "https://example.com/"
  if (!pattern.includes('*')) {
    // Exact URL without trailing slash should only match that exact URL
    const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    if (!pattern.endsWith('/')) {
      // Make protocol optional to match both with and without protocol
      if (pattern.includes('://')) {
        const regex = new RegExp(`^${escaped}$`, 'i');
        console.log(`  Created regex: ${regex}`);
        return regex;
      } else {
        const regex = new RegExp(`^(?:https?:\/\/)?${escaped}$`, 'i');
        console.log(`  Created regex: ${regex}`);
        return regex;
      }
    }
    // URL with trailing slash should match the exact URL or anything under that path
    else {
      // Optionally match anything after the trailing slash and make protocol optional
      if (pattern.includes('://')) {
        const regex = new RegExp(`^${escaped}.*$`, 'i');
        console.log(`  Created regex: ${regex}`);
        return regex;
      } else {
        const regex = new RegExp(`^(?:https?:\/\/)?${escaped}.*$`, 'i');
        console.log(`  Created regex: ${regex}`);
        return regex;
      }
    }
  }
  
  // For other patterns with a specified path or protocol, do standard wildcard conversion
  const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  const regexPattern = escaped.replace(/\*/g, '.*');
  
  // Make protocol optional if not specified
  if (pattern.includes('://')) {
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    console.log(`  Created regex: ${regex}`);
    return regex;
  } else {
    const regex = new RegExp(`^(?:https?:\/\/)?${regexPattern}$`, 'i');
    console.log(`  Created regex: ${regex}`);
    return regex;
  }
}

// Test function for URL matching
function testUrlMatch(url, pattern) {
  try {
    const regex = wildcardToRegExp(pattern);
    const isMatch = regex.test(url);
    console.log(`Testing URL: ${url} against pattern: ${pattern}`);
    console.log(`Result: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
    console.log('-------------------------------------------------');
    return isMatch;
  } catch (e) {
    console.error(`Error testing pattern ${pattern}:`, e.message);
    return false;
  }
}

// Test the problematic patterns
console.log("=== TESTING PROBLEMATIC PATTERNS ===");

// Test various Reddit patterns
testUrlMatch("https://www.reddit.com/r/hoggit", "https://www.reddit.com/r/*");
testUrlMatch("https://www.reddit.com", "https://www.reddit.com/r/*");
testUrlMatch("https://old.reddit.com/r/cars", "https://www.reddit.com/r/*"); // Should this match?

// Test the patterns that caused the regex errors
testUrlMatch("https://something.atkgirlfriends.com/video", "*.atkgirlfriends.com/*");
testUrlMatch("https://api.redgifs.com/some/path", "https://*.redgifs.com/*");

// Test trailing slash vs no trailing slash
testUrlMatch("https://www.reddit.com/r/cars", "https://www.reddit.com/r/");
testUrlMatch("https://www.reddit.com/r/cars", "https://www.reddit.com/r");

console.log("=== END TESTING ===");
