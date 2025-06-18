/**
 * Test case sensitivity with improved implementation
 */

// Import our improved function
const { wildcardToRegExp } = require('./improved-wildcardToRegExp-fixed');

// Test URLs
const urls = [
  "https://iptorrents.com",
  "https://iptorrents.com/t",
  "https://www.iptorrents.com/t",
  "http://IPtorrents.com/t",
  "https://IPTORRENTS.COM/t"
];

// Test patterns
const patterns = [
  "iptorrents.com",
  "IPTorrents.com",
  "IPTORRENTS.COM"
];

console.log("=== TESTING CASE SENSITIVITY IN IMPROVED IMPLEMENTATION ===\n");

// Test each pattern against each URL
console.log("=== URL MATCHING TEST ===");
urls.forEach(url => {
  console.log(`\nTesting URL: ${url}`);
  patterns.forEach(pattern => {
    const regex = wildcardToRegExp(pattern);
    const isMatch = regex.test(url);
    console.log(`Pattern: '${pattern}' => ${isMatch ? 'MATCH' : 'NO MATCH'}`);
  });
});

// Test direct hostname matching
console.log("\n=== HOSTNAME EXTRACTION AND DIRECT COMPARISON TEST ===");
urls.forEach(url => {
  console.log(`\nURL: ${url}`);
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    console.log(`Extracted hostname: ${hostname}`);
    
    patterns.forEach(pattern => {
      const patternLower = pattern.toLowerCase().trim();
      const directMatch = hostname === patternLower || hostname.endsWith('.' + patternLower);
      console.log(`Direct comparison with pattern '${pattern}' => ${directMatch ? 'MATCH' : 'NO MATCH'}`);
    });
  } catch (e) {
    console.log(`URL parsing failed: ${e.message}`);
  }
});

// Test a complete matching implementation
function checkShouldBlock(url, patterns) {
  // Extract hostname for direct comparison
  let hostname = "";
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname.toLowerCase();
  } catch (e) {
    console.log(`URL parsing failed: ${e.message}`);
  }
  
  // Test each pattern
  for (const pattern of patterns) {
    // Direct hostname comparison (most reliable)
    if (hostname) {
      const patternLower = pattern.toLowerCase().trim();
      if (hostname === patternLower || hostname.endsWith('.' + patternLower)) {
        return { blocked: true, reason: `Direct hostname match with pattern: ${pattern}` };
      }
    }
    
    // Regex-based comparison (less reliable but more flexible)
    const regexPattern = wildcardToRegExp(pattern);
    if (regexPattern.test(url)) {
      return { blocked: true, reason: `Regex match with pattern: ${pattern}` };
    }
  }
  
  return { blocked: false, reason: "No matching pattern" };
}

console.log("\n=== COMPLETE DOMAIN BLOCKING CHECK TEST ===");
urls.forEach(url => {
  console.log(`\nURL: ${url}`);
  const result = checkShouldBlock(url, patterns);
  console.log(`Result: ${result.blocked ? 'BLOCKED' : 'ALLOWED'}, Reason: ${result.reason}`);
});

console.log("\n=== END TESTING ===");
