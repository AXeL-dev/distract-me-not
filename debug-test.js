// Debug test to check return value of checkUrlShouldBeBlocked
const fs = require('fs');

// Load the service worker patterns
eval(fs.readFileSync('./public/service-worker-patterns.js', 'utf8'));

console.log('=== TESTING RETURN VALUE ===');

const url = 'https://www.reddit.com/r/cars/';
const allowList = ['https://*.reddit.com/r/hoggit/*'];
const denyList = ['reddit.com/r/*'];

const result = checkUrlShouldBeBlocked(url, allowList, denyList);

console.log('Result type:', typeof result);
console.log('Result value:', result);
console.log('Result has .blocked property:', result && typeof result === 'object' && 'blocked' in result);

if (typeof result === 'object' && result !== null) {
  console.log('Result properties:', Object.keys(result));
}
