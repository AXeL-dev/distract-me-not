// Let's override the checkUrlShouldBeBlocked function in the comprehensive test
// to use our service worker version and see what happens

const fs = require('fs');

// First load the original comprehensive test
let comprehensiveTestCode = fs.readFileSync('./comprehensive-pattern-test.js', 'utf8');

// Load the service worker patterns first
eval(fs.readFileSync('./public/service-worker-patterns.js', 'utf8'));

// Save the service worker version of checkUrlShouldBeBlocked  
const serviceWorkerCheckUrlShouldBeBlocked = checkUrlShouldBeBlocked;

// Override the function in the comprehensive test to use our service worker version
// but keep the return format expected by the test
const originalFunction = `function checkUrlShouldBeBlocked(url, allowList, denyList) {
  console.log(\`\\nChecking URL: \${url}\`);
  const { hostname, parsedPath } = parseURL(url);`;

const newFunction = `function checkUrlShouldBeBlocked(url, allowList, denyList) {
  // Use the service worker version but return the expected format
  const blocked = serviceWorkerCheckUrlShouldBeBlocked(url, allowList, denyList);
  return { blocked: blocked, reason: blocked ? 'Service worker blocked' : 'Service worker allowed' };`;

// Replace the function definition
comprehensiveTestCode = comprehensiveTestCode.replace(originalFunction, newFunction);

// Add our service worker function at the top
const modifiedCode = `// Service worker functions loaded first
const serviceWorkerCheckUrlShouldBeBlocked = ${serviceWorkerCheckUrlShouldBeBlocked.toString()};

${comprehensiveTestCode}`;

// Save and run the modified test
fs.writeFileSync('./test-modified-comprehensive.js', modifiedCode);

console.log('Created modified comprehensive test that uses service worker logic');
console.log('Run it with: node test-modified-comprehensive.js');
