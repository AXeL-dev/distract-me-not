/**
 * This script updates the service-worker.js file with improved pattern matching
 * for domain blocking and whitelisting, with enhanced case sensitivity handling.
 */

const fs = require('fs');
const path = require('path');

const serviceWorkerPath = path.join(__dirname, 'public', 'service-worker.js');
const buildServiceWorkerPath = path.join(__dirname, 'build', 'service-worker.js');
const improvedFunctionsPath = path.join(__dirname, 'improved-wildcardToRegExp.js');

// Read the improved functions
const improvedFunctions = fs.readFileSync(improvedFunctionsPath, 'utf8');

// Read the current service worker file
let serviceWorkerContent = fs.readFileSync(serviceWorkerPath, 'utf8');

// Find the wildcardToRegExp function
const wildcardToRegExpRegex = /function wildcardToRegExp\(pattern\)\s*\{[\s\S]+?\}/;
const checkUrlShouldBeBlockedRegex = /function checkUrlShouldBeBlocked\(url\)\s*\{[\s\S]+?(?=\/\/ Replace the checkUrlAgainstRules function)/;

// Extract the improved functions
const improvedWildcardToRegExpMatch = improvedFunctions.match(/function wildcardToRegExp\(pattern\)\s*\{[\s\S]+?\}/);
const improvedCheckUrlShouldBeBlockedMatch = improvedFunctions.match(/function checkUrlShouldBeBlocked\(url\)\s*\{[\s\S]+?(?=\/\/ Utility function for testing URL matching)/);

if (!improvedWildcardToRegExpMatch || !improvedCheckUrlShouldBeBlockedMatch) {
  console.error('Could not find the improved functions in the source file');
  process.exit(1);
}

const improvedWildcardToRegExp = improvedWildcardToRegExpMatch[0];
const improvedCheckUrlShouldBeBlocked = improvedCheckUrlShouldBeBlockedMatch[0];

// Replace the functions in the service worker file
let updatedServiceWorkerContent = serviceWorkerContent.replace(wildcardToRegExpRegex, improvedWildcardToRegExp);
updatedServiceWorkerContent = updatedServiceWorkerContent.replace(checkUrlShouldBeBlockedRegex, improvedCheckUrlShouldBeBlocked);

// Remove any special case handlers for IPTORRENTS.COM
updatedServiceWorkerContent = updatedServiceWorkerContent.replace(/\/\/ Special handling for problem domains[\s\S]+?^\s*\}/gm, '');

// Add the test utility functions at the end of the file
const testUtilityFunctions = `
// Utility function for testing URL matching
function testUrlMatch(url, pattern) {
  const regex = wildcardToRegExp(pattern);
  const isMatch = regex.test(url);
  console.log(\`Testing URL: \${url} against pattern: \${pattern}\`);
  console.log(\`Regex: \${regex}\`);
  console.log(\`Result: \${isMatch ? 'MATCH' : 'NO MATCH'}\`);
  
  // Try also with hostname extraction
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const hostnameMatch = regex.test(hostname);
    console.log(\`Hostname: \${hostname}\`);
    console.log(\`Hostname match: \${hostnameMatch ? 'MATCH' : 'NO MATCH'}\`);
  } catch (e) {
    console.log(\`URL parsing failed: \${e.message}\`);
  }
  
  return isMatch;
}

// Debug function to test domain matching
function testDomainMatching() {
  console.log("=== TESTING DOMAIN MATCHING ===");
  
  // Test with iptorrents.com
  testUrlMatch("https://iptorrents.com/t", "iptorrents.com");
  testUrlMatch("https://iptorrents.com/t?p=8#torrents", "iptorrents.com");
  testUrlMatch("https://www.iptorrents.com/t", "iptorrents.com");
  
  // Test with wildcards
  testUrlMatch("https://sub.example.com/page", "*.example.com");
  testUrlMatch("https://example.com/page", "*.example.com");
  
  // Test with uppercase/lowercase
  testUrlMatch("https://IPTORRENTS.COM/t", "iptorrents.com");
  
  console.log("=== END TESTING ===");
}`;

updatedServiceWorkerContent += testUtilityFunctions;

// Write the updated service worker file
fs.writeFileSync(serviceWorkerPath, updatedServiceWorkerContent);

console.log('Successfully updated the service worker file with improved domain pattern matching');

// Now update the build service worker if it exists
if (fs.existsSync(buildServiceWorkerPath)) {
  let buildServiceWorkerContent = fs.readFileSync(buildServiceWorkerPath, 'utf8');
  
  // Replace the functions in the build service worker file
  let updatedBuildServiceWorkerContent = buildServiceWorkerContent.replace(wildcardToRegExpRegex, improvedWildcardToRegExp);
  updatedBuildServiceWorkerContent = updatedBuildServiceWorkerContent.replace(checkUrlShouldBeBlockedRegex, improvedCheckUrlShouldBeBlocked);
  
  // Remove any special case handlers for IPTORRENTS.COM
  updatedBuildServiceWorkerContent = updatedBuildServiceWorkerContent.replace(/\/\/ Special handling for problem domains[\s\S]+?^\s*\}/gm, '');
  
  // Add the test utility functions at the end of the file
  updatedBuildServiceWorkerContent += testUtilityFunctions;
  
  // Write the updated build service worker file
  fs.writeFileSync(buildServiceWorkerPath, updatedBuildServiceWorkerContent);
  
  console.log('Successfully updated the build service worker file with improved domain pattern matching');
}
