// Test trailing slash pattern matching for exact URLs

function wildcardToRegExp(pattern) {
  // First, normalize pattern to lowercase for case-insensitive matching
  pattern = pattern.toLowerCase().trim();
  
  // For the purpose of this test, focus only on the exact URL with trailing slash case
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
  
  // For any other pattern, just log that it's not an exact URL pattern
  console.log("Not an exact URL pattern, skipping test.");
  return null;
}

// Test function
function testPattern(pattern) {
  console.log(`\nTesting pattern: "${pattern}"`);
  
  try {
    const regex = wildcardToRegExp(pattern);
    if (!regex) return; // Skip non-exact URL patterns
    
    console.log(`Resulting RegEx: ${regex}`);
    
    const testUrls = [
      'https://www.reddit.com',
      'https://www.reddit.com/',
      'https://www.reddit.com/r',
      'https://www.reddit.com/r/',
      'http://www.reddit.com',
      'http://www.reddit.com/'
    ];
    
    for (const url of testUrls) {
      const isMatch = regex.test(url);
      console.log(`${url} => ${isMatch ? 'MATCH' : 'NO MATCH'}`);
    }
  } catch (e) {
    console.error(`Error testing pattern "${pattern}":`, e);
  }
}

// Run tests
console.log("===== TESTING EXACT URL PATTERNS WITH TRAILING SLASH =====");
testPattern('https://www.reddit.com');
testPattern('https://www.reddit.com/');
testPattern('reddit.com');
testPattern('reddit.com/');
testPattern('https://*.reddit.com/*'); // Not an exact URL pattern
