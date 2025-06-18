// Debug specificity scoring
const fs = require('fs');

// Load the service worker functions
const serviceWorkerCode = fs.readFileSync('./public/service-worker-patterns.js', 'utf8');

// Execute the code to define the functions
eval(serviceWorkerCode);

console.log('=== DEBUG SPECIFICITY SCORING ===\n');

// Test cases that are failing - specificity issues
const testCases = [
  {
    url: 'https://reddit.com/r/askscience',
    allowPatterns: ['reddit.com/r/askscience/*'],
    denyPatterns: ['reddit.com'],
    expected: false // should NOT be blocked
  },
  {
    url: 'https://reddit.com/r/askscience',
    allowPatterns: ['reddit.com/r/askscience/*'],
    denyPatterns: ['reddit.com/r/*'],
    expected: false // should NOT be blocked
  },
  {
    url: 'https://www.reddit.com/r/programming',
    allowPatterns: ['reddit.com/r/programming/*', 'reddit.com/r/science/*', 'reddit.com/r/askscience/*'],
    denyPatterns: ['reddit.com'],
    expected: false // should NOT be blocked
  },
  {
    url: 'https://twitter.com/NASA',
    allowPatterns: ['twitter.com/NASA/*', 'facebook.com/groups/workgroup/*', 'linkedin.com/*'],
    denyPatterns: ['twitter.com', 'facebook.com', 'instagram.com'],
    expected: false // should NOT be blocked
  }
];

testCases.forEach((test, i) => {
  console.log(`\n--- Test ${i + 1}: ${test.url} ---`);
  console.log('Allow patterns:', test.allowPatterns);
  console.log('Deny patterns:', test.denyPatterns);
  console.log('Expected blocked:', test.expected);
  
  // Calculate specificity for each pattern
  console.log('\nAllow Pattern Specificities:');
  test.allowPatterns.forEach(pattern => {
    const parsed = parseUrlOrPattern(pattern);
    const specificity = calculateSpecificity(parsed);
    const matches = matchesPattern(pattern, test.url);
    console.log(`  ${pattern}: ${specificity} (matches: ${matches})`);
  });
  
  console.log('\nDeny Pattern Specificities:');
  test.denyPatterns.forEach(pattern => {
    const parsed = parseUrlOrPattern(pattern);
    const specificity = calculateSpecificity(parsed);
    const matches = matchesPattern(pattern, test.url);
    console.log(`  ${pattern}: ${specificity} (matches: ${matches})`);
  });
  
  // Test overall result
  const blocked = checkUrlShouldBeBlocked(test.url, test.allowPatterns, test.denyPatterns);
  console.log(`\nActual blocked: ${blocked}`);
  console.log(`Test result: ${blocked === test.expected ? '✓ PASS' : '✗ FAIL'}`);
});
