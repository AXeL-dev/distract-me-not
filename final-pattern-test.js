// Final comprehensive test for the Distract-Me-Not pattern matching
// Copy the complete implementation of wildcardToRegExp from service-worker.js

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
      const escapeSlashRegex = /\\\//g;
      
      if (pattern.includes('://')) {
        // Replace escape sequences for slashes with proper ones and add optional trailing slash
        const fixedEscaped = escaped.replace(escapeSlashRegex, '\\/');
        // Remove the trailing escaped slash and make it optional
        const withoutSlash = fixedEscaped.slice(0, -2);
        return new RegExp(`^${withoutSlash}\\/?$`, 'i');
      } else {
        // Replace escape sequences for slashes with proper ones and add optional trailing slash
        const fixedEscaped = escaped.replace(escapeSlashRegex, '\\/');  
        // Remove the trailing escaped slash and make it optional
        const withoutSlash = fixedEscaped.slice(0, -2);
        return new RegExp(`^(?:https?:\\/\\/)?${withoutSlash}\\/?$`, 'i');
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

// Test function for a specific pattern and set of URLs
function testPattern(pattern, testUrls) {
  console.log(`\n=== Testing pattern: "${pattern}" ===`);
  
  try {
    const regex = wildcardToRegExp(pattern);
    console.log(`RegEx: ${regex}`);
    
    for (const url of testUrls) {
      const isMatch = regex.test(url);
      console.log(`${url.padEnd(40)} => ${isMatch ? 'MATCH' : 'NO MATCH'}`);
    }
  } catch (e) {
    console.error(`Error testing pattern "${pattern}":`, e);
  }
}

// Simulate checkUrlShouldBeBlocked for a real-world test case
function testUrlBlocking(url, allowList, denyList) {
  console.log(`\n===== Testing URL blocking for: ${url} =====`);
  console.log(`Allow list: ${JSON.stringify(allowList)}`);
  console.log(`Deny list: ${JSON.stringify(denyList)}`);
  
  // Step 1: Check specific path allow patterns
  for (const pattern of allowList) {
    if (pattern.includes('/') && pattern.includes('*')) {
      const regex = wildcardToRegExp(pattern);
      if (regex.test(url)) {
        console.log(`URL matched specific allow path pattern: ${pattern}`);
        console.log(`RESULT: ALLOWED by pattern ${pattern}`);
        return;
      }
    }
  }
  
  // Step 2: Check path wildcard deny patterns
  let hostname = '';
  let parsedPath = '';
  
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname;
    parsedPath = parsedUrl.pathname;
    
    if (parsedPath && parsedPath !== '/') {
      for (const pattern of denyList) {
        if (pattern.includes('/*')) {
          const regex = wildcardToRegExp(pattern);
          if (regex.test(url)) {
            console.log(`URL matched deny path pattern: ${pattern}`);
            console.log(`RESULT: BLOCKED by pattern ${pattern}`);
            return;
          }
        }
      }
    }
  } catch (e) {
    console.log(`Error parsing URL: ${e.message}`);
  }
  
  // Step 3: Check domain-only allow patterns
  for (const pattern of allowList) {
    if (!(pattern.includes('/') && pattern.includes('*'))) {
      const regex = wildcardToRegExp(pattern);
      if (regex.test(url)) {
        console.log(`URL matched domain/exact allow pattern: ${pattern}`);
        console.log(`RESULT: ALLOWED by pattern ${pattern}`);
        return;
      }
    }
  }
  
  // Step 4: Check remaining deny patterns
  for (const pattern of denyList) {
    if (!(pattern.endsWith('/*') && !pattern.includes('/*/'))) {
      const regex = wildcardToRegExp(pattern);
      if (regex.test(url)) {
        console.log(`URL matched deny pattern: ${pattern}`);
        console.log(`RESULT: BLOCKED by pattern ${pattern}`);
        return;
      }
    }
  }
  
  console.log(`RESULT: ALLOWED by default (no matching rules)`);
}

// Run individual pattern tests
console.log("\n***** PATTERN MATCHING TESTS *****");

// Test exact domain patterns
const exactDomainUrls = [
  'https://www.reddit.com', 
  'https://www.reddit.com/',
  'https://www.reddit.com/r', 
  'http://reddit.com'
];
testPattern('https://www.reddit.com', exactDomainUrls);
testPattern('https://www.reddit.com/', exactDomainUrls);
testPattern('reddit.com', exactDomainUrls);

// Test wildcard domain patterns
const wildcardDomainUrls = [
  'https://www.reddit.com',
  'https://old.reddit.com',
  'https://something.reddit.com',
  'https://notreddit.com'
];
testPattern('*.reddit.com', wildcardDomainUrls);

// Test domain with wildcard path
const wildcardPathUrls = [
  'https://www.reddit.com',
  'https://www.reddit.com/',
  'https://www.reddit.com/r',
  'https://www.reddit.com/r/',
  'https://www.reddit.com/r/all'
];
testPattern('reddit.com/*', wildcardPathUrls);

// Test specific path with wildcard
const specificPathUrls = [
  'https://www.reddit.com/r',
  'https://www.reddit.com/r/',
  'https://www.reddit.com/r/news',
  'https://www.reddit.com/r/news/comments/123',
  'https://www.reddit.com/user/someone',
  'https://old.reddit.com/r/news'
];
testPattern('reddit.com/r/*', specificPathUrls);
testPattern('https://www.reddit.com/r/news/*', specificPathUrls);

// Test complex subdomain + path pattern
const redgifsUrls = [
  'https://www.redgifs.com/watch/123',
  'https://api.redgifs.com/image/xyz',
  'https://redgifs.com/something',
  'http://www.redgifs.com/view'
];
testPattern('https://*.redgifs.com/*', redgifsUrls);

// Run full blocking tests
console.log("\n***** FULL BLOCKING LOGIC TESTS *****");

// Test case 1: Block all of reddit except homepage and specific subreddits
const redditAllowList = [
  'https://www.reddit.com',
  'https://www.reddit.com/',
  'https://www.reddit.com/r/programming/*',
  'https://www.reddit.com/r/news/*'
];
const redditDenyList = ['reddit.com/r/*'];

testUrlBlocking('https://www.reddit.com', redditAllowList, redditDenyList); // Should allow (exact match)
testUrlBlocking('https://www.reddit.com/', redditAllowList, redditDenyList); // Should allow (exact match)
testUrlBlocking('https://www.reddit.com/r/all', redditAllowList, redditDenyList); // Should block (general deny)
testUrlBlocking('https://www.reddit.com/r/programming', redditAllowList, redditDenyList); // Should block 
testUrlBlocking('https://www.reddit.com/r/programming/comments/123', redditAllowList, redditDenyList); // Should allow (specific allow)

// Test case 2: Block specific wildcard domains (redgifs)
const redgifsAllowList = [];
const redgifsDenyList = ['https://*.redgifs.com/*'];

testUrlBlocking('https://example.redgifs.com/view/something', redgifsAllowList, redgifsDenyList); // Should block
testUrlBlocking('http://www.redgifs.com/test', redgifsAllowList, redgifsDenyList); // Should allow (http != https)
