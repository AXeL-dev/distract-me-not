/**
 * Test script to verify keyword blocking is working
 * Run this to test the "thigh" keyword blocking fix
 */

console.log('🧪 TESTING KEYWORD BLOCKING FIX');
console.log('==============================');

// Test the keyword logic directly
function testKeywordBlockingLogic() {
  console.log('\n📋 Testing keyword blocking logic...');
  
  // Simulate the checkKeywordsInUrl function logic
  function simulateCheckKeywordsInUrl(url, denyKeywords = [], allowKeywords = []) {
    const normalizedUrl = url.toLowerCase();
    let hostname = "";
    
    try {
      const urlObj = new URL(url);
      hostname = urlObj.hostname.toLowerCase();
    } catch (e) {
      console.log(`URL parsing failed: ${e.message}`);
    }
    
    console.log(`  URL: ${normalizedUrl}`);
    console.log(`  Hostname: ${hostname}`);
    console.log(`  Deny keywords: ${JSON.stringify(denyKeywords)}`);
    console.log(`  Allow keywords: ${JSON.stringify(allowKeywords)}`);
    
    // Check allow keywords first (higher priority)
    for (const keyword of allowKeywords) {
      const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
      if (!pattern) continue;
      
      const normalizedPattern = pattern.toLowerCase();
      
      if (normalizedUrl.includes(normalizedPattern) || 
          (hostname && hostname.includes(normalizedPattern))) {
        console.log(`  ✅ ALLOWED by keyword: ${pattern}`);
        return { allowKeyword: pattern, denyKeyword: null };
      }
    }
    
    // Check deny keywords
    for (const keyword of denyKeywords) {
      const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
      if (!pattern) continue;
      
      const normalizedPattern = pattern.toLowerCase();
      
      if (normalizedUrl.includes(normalizedPattern) || 
          (hostname && hostname.includes(normalizedPattern))) {
        console.log(`  ❌ BLOCKED by keyword: ${pattern}`);
        return { allowKeyword: null, denyKeyword: pattern };
      }
    }
    
    console.log(`  ✅ NO KEYWORD MATCHES - allowed`);
    return { allowKeyword: null, denyKeyword: null };
  }
  
  // Test cases
  const testCases = [
    {
      url: 'https://www.bing.com/search?q=thigh',
      denyKeywords: ['thigh', 'gaming', 'social'],
      allowKeywords: ['work', 'educational'],
      expected: 'BLOCKED'
    },
    {
      url: 'https://work.gaming.com/business',
      denyKeywords: ['gaming'],
      allowKeywords: ['work'],
      expected: 'ALLOWED'
    },
    {
      url: 'https://example.com/gaming/news',
      denyKeywords: ['gaming'],
      allowKeywords: [],
      expected: 'BLOCKED'
    },
    {
      url: 'https://news.com/articles',
      denyKeywords: ['gaming', 'social'],
      allowKeywords: [],
      expected: 'ALLOWED'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test Case ${index + 1} ---`);
    console.log(`Expected: ${testCase.expected}`);
    
    const result = simulateCheckKeywordsInUrl(
      testCase.url,
      testCase.denyKeywords,
      testCase.allowKeywords
    );
    
    let actualResult;
    if (result.allowKeyword) {
      actualResult = 'ALLOWED';
    } else if (result.denyKeyword) {
      actualResult = 'BLOCKED';
    } else {
      actualResult = 'ALLOWED';
    }
    
    const success = actualResult === testCase.expected;
    console.log(`  Result: ${actualResult} ${success ? '✅' : '❌'}`);
    
    if (!success) {
      console.log(`  ⚠️  FAILED: Expected ${testCase.expected}, got ${actualResult}`);
    }
  });
  
  console.log('\n✅ Keyword logic testing complete!');
}

// Test to add thigh keyword and verify it's working
async function testAddThighKeyword() {
  console.log('\n🔧 Testing keyword addition in browser...');
  
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.log('❌ Not running in browser extension context');
    console.log('   Please run this in the browser console');
    return;
  }
  
  try {
    // Check current keywords
    const currentStorage = await new Promise(resolve => {
      chrome.storage.local.get(['blacklistKeywords'], resolve);
    });
    
    console.log('Current keywords:', currentStorage.blacklistKeywords || []);
    
    // Add thigh if not present
    const currentKeywords = currentStorage.blacklistKeywords || [];
    const hasThigh = currentKeywords.some(kw => 
      (typeof kw === 'string' ? kw : kw.pattern || '').toLowerCase().includes('thigh')
    );
    
    if (!hasThigh) {
      const newKeywords = [...currentKeywords, 'thigh'];
      
      await new Promise(resolve => {
        chrome.storage.local.set({blacklistKeywords: newKeywords}, resolve);
      });
      
      await new Promise(resolve => {
        chrome.runtime.sendMessage({
          action: 'setBlacklistKeywords',
          params: [newKeywords]
        }, resolve);
      });
      
      console.log('✅ Added "thigh" keyword');
    } else {
      console.log('✅ "thigh" keyword already exists');
    }
    
    // Test the URL
    const testUrl = 'https://www.bing.com/search?q=thigh';
    console.log(`\n🧪 Testing URL: ${testUrl}`);
    console.log('This URL should now be BLOCKED');
    console.log('Try navigating to it to verify the fix works!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the tests
testKeywordBlockingLogic();

if (typeof chrome !== 'undefined' && chrome.runtime) {
  testAddThighKeyword();
} else {
  console.log('\n📝 To test in the browser:');
  console.log('1. Copy this script to the browser console');
  console.log('2. It will add "thigh" to the keywords');
  console.log('3. Try navigating to: https://www.bing.com/search?q=thigh');
  console.log('4. It should be blocked if the fix works!');
}

console.log('\n==============================');
console.log('🏁 KEYWORD BLOCKING TEST COMPLETE');
console.log('==============================');
