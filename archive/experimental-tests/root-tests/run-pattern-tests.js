/**
 * Test runner for pattern-matcher
 */
const { patternMatchTests, blockAllowTests, runTests } = require('./pattern-matcher-tests');
const patternMatcher = require('./pattern-matcher');

console.log('Pattern Matcher Test Runner');
console.log('=========================\n');

console.log('Running Pattern Match Tests:');
const patternResults = runTests(patternMatchTests);

console.log('\nRunning Block/Allow Tests:');
const blockAllowResults = runTests(blockAllowTests);

const totalTests = patternResults.passed + patternResults.failed + 
                  blockAllowResults.passed + blockAllowResults.failed;
const totalPassed = patternResults.passed + blockAllowResults.passed;

console.log('\nSummary:');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${totalPassed} (${Math.round(totalPassed/totalTests*100)}%)`);
console.log(`Failed: ${totalTests - totalPassed}`);

// Exit with error code if any tests failed
if (patternResults.failed > 0 || blockAllowResults.failed > 0) {
  process.exit(1);
}
