// Simple test script to verify subreddit blocking functionality

// Test the final fixed wildcardToRegExp function
const pattern = 'https://*.redgifs.com/*';
try {
  console.log(`Testing pattern: ${pattern}`);
  const regex = wildcardToRegExp(pattern);
  console.log(`Resulting regex: ${regex}`);
  
  // Test some URLs
  const urls = [
    'https://www.redgifs.com/watch/123',
    'https://api.redgifs.com/image/xyz',
    'http://redgifs.com/something' // This should NOT match due to protocol
  ];
  
  for (const url of urls) {
    console.log(`${url} => ${regex.test(url) ? 'MATCH' : 'NO MATCH'}`);
  }
} catch(e) {
  console.error("Error testing pattern:", e);
}

// Test exact URL with trailing slash
try {
  const sitePattern = 'https://www.reddit.com/';
  console.log(`\nTesting exact site with trailing slash: ${sitePattern}`);
  const regex = wildcardToRegExp(sitePattern);
  console.log(`Resulting regex: ${regex}`);
  
  const urls = [
    'https://www.reddit.com',    // Should match
    'https://www.reddit.com/',   // Should match
    'https://www.reddit.com/r',  // Should NOT match
    'https://www.reddit.com/r/'  // Should NOT match
  ];
  
  for (const url of urls) {
    console.log(`${url} => ${regex.test(url) ? 'MATCH' : 'NO MATCH'}`);
  }
} catch(e) {
  console.error("Error testing pattern:", e);
}

// Test subreddit blocking
try {
  const pattern = 'reddit.com/r/*';
  console.log(`\nTesting subreddit pattern: ${pattern}`);
  const regex = wildcardToRegExp(pattern);
  console.log(`Resulting regex: ${regex}`);
  
  const urls = [
    'https://www.reddit.com',        // Should NOT match
    'https://www.reddit.com/r',      // Should NOT match (no trailing slash)
    'https://www.reddit.com/r/',     // Should match
    'https://www.reddit.com/r/aww',  // Should match
    'https://reddit.com/r/news'      // Should match
  ];
  
  for (const url of urls) {
    console.log(`${url} => ${regex.test(url) ? 'MATCH' : 'NO MATCH'}`);
  }
} catch(e) {
  console.error("Error testing pattern:", e);
}

// Implementation of the wildcardToRegExp function
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
        const withoutSlash = escaped.substring(0, escaped.length-1);
        return new RegExp(`^${withoutSlash}\\/?$`, 'i');
      } else {
        const withoutSlash = escaped.substring(0, escaped.length-1);
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
