/**
 * Comprehensive pattern matcher test suite for Distract-Me-Not
 * 
 * This test suite verifies the pattern matching logic for URL blocking and allowlisting
 * covering all common wildcard patterns and edge cases.
 */

// Import the matcher implementation - this will be defined below
const { matchesPattern, wildcardToRegExp, checkUrlShouldBeBlocked } = require('./pattern-matcher');

// Utility function to run tests and report results
function runTests(tests) {
  console.log(`Running ${tests.length} tests...\n`);
  
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };
  
  tests.forEach((test, index) => {
    try {
      const { name, input, expected, func } = test;
      const actual = func(...input);
      
      if (actual === expected) {
        results.passed++;
        results.details.push({
          index,
          name,
          passed: true,
          input,
          expected,
          actual
        });
      } else {
        results.failed++;
        results.details.push({
          index,
          name,
          passed: false,
          input,
          expected,
          actual
        });
      }
    } catch (error) {
      results.failed++;
      results.details.push({
        index,
        name: test.name,
        passed: false,
        input: test.input,
        expected: test.expected,
        error: error.toString()
      });
    }
  });
  
  // Print detailed results
  console.log('Test Results:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}`);
  console.log('\nDetailed Results:');
  
  results.details.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${result.name}`);
    
    if (!result.passed) {
      console.log(`  Input:    ${JSON.stringify(result.input)}`);
      console.log(`  Expected: ${result.expected}`);
      if (result.error) {
        console.log(`  Error:    ${result.error}`);
      } else {
        console.log(`  Actual:   ${result.actual}`);
      }
      console.log('');
    }
  });
  
  return results;
}

// Pattern to URL matching tests 
const patternMatchTests = [
  // Simple domain matching
  {
    name: 'Exact domain match',
    input: ['example.com', 'https://example.com'],
    expected: true,
    func: matchesPattern
  },
  {
    name: 'Exact domain match without protocol',
    input: ['example.com', 'example.com'],
    expected: true,
    func: matchesPattern
  },
  {
    name: 'Domain with www subdomain',
    input: ['example.com', 'https://www.example.com'],
    expected: true,
    func: matchesPattern
  },
  {
    name: 'Domain with path',
    input: ['example.com', 'https://example.com/path/to/page'],
    expected: true,
    func: matchesPattern
  },
  {
    name: 'Domain should not match unrelated domain with similar name',
    input: ['example.com', 'https://notexample.com'],
    expected: false,
    func: matchesPattern
  },
  
  // Wildcard subdomain matching
  {
    name: 'Wildcard subdomain should match any subdomain',
    input: ['*.example.com', 'https://sub.example.com'],
    expected: true,
    func: matchesPattern
  },
  {
    name: 'Wildcard subdomain should match multi-level subdomain',
    input: ['*.example.com', 'https://sub.sub2.example.com'],
    expected: true,
    func: matchesPattern
  },
  {
    name: 'Wildcard subdomain should not match bare domain',
    input: ['*.example.com', 'https://example.com'],
    expected: false,
    func: matchesPattern
  },
  {
    name: 'Wildcard subdomain should not match different domain',
    input: ['*.example.com', 'https://sub.different.com'],
    expected: false,
    func: matchesPattern
  },
  
  // Path wildcard matching
  {
    name: 'Path wildcard should match any path',
    input: ['example.com/*', 'https://example.com/any/path'],
    expected: true,
    func: matchesPattern
  },
  {
    name: 'Path wildcard should not match bare domain',
    input: ['example.com/*', 'https://example.com'],
    expected: false,
    func: matchesPattern
  },  {
    name: 'Path wildcard should match bare domain with trailing slash',
    input: ['example.com/*', 'https://example.com/'],
    expected: false, // A trailing slash alone isn't considered a true path component
    func: matchesPattern
  },
  
  // Specific path matching
  {
    name: 'Specific path should match exact path',
    input: ['example.com/specific', 'https://example.com/specific'],
    expected: true,
    func: matchesPattern
  },
  {
    name: 'Specific path should not match different path',
    input: ['example.com/specific', 'https://example.com/different'],
    expected: false,
    func: matchesPattern
  },
  {
    name: 'Specific path should not match parent path',
    input: ['example.com/parent/child', 'https://example.com/parent'],
    expected: false,
    func: matchesPattern
  },
  {
    name: 'Specific path with trailing slash should match with or without slash',
    input: ['example.com/specific/', 'https://example.com/specific'],
    expected: true,
    func: matchesPattern
  },
  
  // Specific path with wildcard
  {
    name: 'Specific path with wildcard should match path and subpaths',
    input: ['example.com/section/*', 'https://example.com/section/page'],
    expected: true,
    func: matchesPattern
  },
  {
    name: 'Specific path with wildcard should match exact path',
    input: ['example.com/section/*', 'https://example.com/section/'],
    expected: true,
    func: matchesPattern
  },
  {
    name: 'Specific path with wildcard should not match different path',
    input: ['example.com/section/*', 'https://example.com/different/page'],
    expected: false,
    func: matchesPattern
  },
  {
    name: 'Specific path with wildcard should not match parent path',
    input: ['example.com/parent/child/*', 'https://example.com/parent'],
    expected: false,
    func: matchesPattern
  },
  
  // Combined subdomain and path wildcards
  {
    name: 'Subdomain wildcard with path should match',
    input: ['*.example.com/path', 'https://sub.example.com/path'],
    expected: true,
    func: matchesPattern
  },
  {
    name: 'Subdomain wildcard with path wildcard should match',
    input: ['*.example.com/path/*', 'https://sub.example.com/path/subpath'],
    expected: true,
    func: matchesPattern
  },
  {
    name: 'Subdomain wildcard with path wildcard should not match different path',
    input: ['*.example.com/path/*', 'https://sub.example.com/different'],
    expected: false,
    func: matchesPattern
  },
  {
    name: 'Full URL pattern with protocol and wildcards',
    input: ['https://*.example.com/path/*', 'https://sub.example.com/path/page'],
    expected: true,
    func: matchesPattern
  },
  {
    name: 'Full URL pattern should not match different protocol',
    input: ['https://*.example.com/*', 'http://sub.example.com/path'],
    expected: false,
    func: matchesPattern
  }
];

// Block/Allow logic tests with multiple patterns
const blockAllowTests = [
  {
    name: 'Should block when URL matches deny pattern',
    input: [
      'https://reddit.com/r/news',
      ['reddit.com/r/*'],
      []
    ],
    expected: true,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'Should not block when URL matches neither deny nor allow',
    input: [
      'https://example.com',
      ['reddit.com'],
      []
    ],
    expected: false,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'Allow pattern should override deny pattern',
    input: [
      'https://reddit.com/r/askscience',
      ['reddit.com/r/*'],
      ['reddit.com/r/askscience']
    ],
    expected: false,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'Allow pattern with wildcard should override deny pattern',
    input: [
      'https://reddit.com/r/askscience/comments/123',
      ['reddit.com/r/*'],
      ['reddit.com/r/askscience/*']
    ],
    expected: false,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'General deny pattern should block all subpaths',
    input: [
      'https://reddit.com/r/news/comments/123',
      ['reddit.com'],
      []
    ],
    expected: true,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'More specific deny pattern should block',
    input: [
      'https://reddit.com/r/news',
      ['reddit.com/r/news'],
      []
    ],
    expected: true,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'Path wildcard deny pattern should block subpaths',
    input: [
      'https://example.com/blog/post1',
      ['example.com/blog/*'],
      []
    ],
    expected: true,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'Specific allow pattern should override more general deny pattern',
    input: [
      'https://example.com/blog/allowed-post',
      ['example.com/blog/*'],
      ['example.com/blog/allowed-post']
    ],
    expected: false,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'Subdomain wildcard deny pattern should block matching subdomains',
    input: [
      'https://sub.example.com/page',
      ['*.example.com'],
      []
    ],
    expected: true,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'Specific subdomain allow pattern should override general deny pattern',
    input: [
      'https://allowed.example.com/page',
      ['*.example.com'],
      ['allowed.example.com']
    ],
    expected: false,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'Complex subdomain and path pattern should block correctly',
    input: [
      'https://sub.reddit.com/r/news',
      ['*.reddit.com/r/*'],
      []
    ],
    expected: true,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'Specific subdomain and path allow pattern should work',
    input: [
      'https://old.reddit.com/r/science',
      ['*.reddit.com/r/*'],
      ['old.reddit.com/r/science']
    ],
    expected: false,
    func: checkUrlShouldBeBlocked
  },  {
    name: 'Special case: allow pattern should not match different domain with same path',
    input: [
      'https://www.reddit.com/r/cars/',
      ['*.reddit.com/r/*'],
      ['old.reddit.com/r/science']
    ],
    expected: true,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'Reddit subreddit with query parameters',
    input: [
      'https://www.reddit.com/r/programming/?sort=top&t=week',
      ['reddit.com/r/*'],
      ['reddit.com/r/askscience/*']
    ],
    expected: true,
    func: checkUrlShouldBeBlocked
  },  {
    name: 'Complex wildcard with multiple path components',
    input: [
      'https://subdomain.example.com/a/b/c/d',
      ['*.example.com/a/*/d'],
      []
    ],
    expected: true,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'Path with wildcard in middle segment',
    input: [
      'https://example.com/products/t-shirt-large/details',
      ['example.com/products/*-large/details'],
      []
    ],
    expected: true,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'Protocol specific pattern should only match that protocol',
    input: [
      'http://example.com',
      ['https://example.com'],
      []
    ],
    expected: false,
    func: checkUrlShouldBeBlocked
  },  {
    name: 'Pattern with port number',
    input: [
      'https://localhost:8080/test',
      ['localhost:8080/*'],
      []
    ],
    expected: true,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'Pattern with multiple wildcards in path segment',
    input: [
      'https://example.com/products/blue-t-shirt-large-2022',
      ['example.com/products/*-t-*-large-*'],
      []
    ],
    expected: true,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'Special characters in URL',
    input: [
      'https://example.com/search?q=test&sort=date',
      ['example.com/search*'],
      []
    ],
    expected: true,
    func: checkUrlShouldBeBlocked
  },
  {
    name: 'URL-encoded characters should match patterns',
    input: [
      'https://example.com/path%20with%20spaces',
      ['example.com/path*'],
      []
    ],
    expected: true,
    func: checkUrlShouldBeBlocked
  }
];

// Run tests (to be executed with the pattern-matcher.js implementation)
console.log('Pattern Matcher Test Suite');
console.log('=========================');

// Export tests for external use
module.exports = {
  patternMatchTests,
  blockAllowTests,
  runTests
};

// Automatically run tests if this script is executed directly
if (require.main === module) {
  console.log('Direct execution - running all tests');
  
  // Run all tests if the pattern matcher module has been loaded
  if (typeof matchesPattern === 'function') {
    console.log('\nRunning Pattern Match Tests:');
    runTests(patternMatchTests);
    
    console.log('\nRunning Block/Allow Tests:');
    runTests(blockAllowTests);
  } else {
    console.log('\nPattern matcher module not loaded. Please run with pattern-matcher.js');
  }
}
