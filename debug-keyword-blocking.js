/**
 * Debug script to test keyword blocking functionality
 * Checks if keywords are loaded and working properly
 */

console.log('='.repeat(50));
console.log('DEBUGGING KEYWORD BLOCKING');
console.log('='.repeat(50));

// Test function to simulate keyword blocking logic
function testKeywordBlocking() {
  console.log('\n📋 Testing Keyword Blocking Logic...\n');
  
  // Test URLs
  const testUrls = [
    'https://www.bing.com/search?q=thigh',
    'https://example.com/gaming/news',
    'https://gaming.reddit.com',
    'https://work.facebook.com',
    'https://educational.gaming.com'
  ];
  
  // Test keywords
  const testBlacklistKeywords = ['thigh', 'gaming', 'facebook'];
  const testWhitelistKeywords = ['work', 'educational'];
  
  console.log('🔍 Test Keywords:');
  console.log('  Blacklist Keywords:', testBlacklistKeywords);
  console.log('  Whitelist Keywords:', testWhitelistKeywords);
  console.log('');
  
  testUrls.forEach(url => {
    console.log(`Testing URL: ${url}`);
    
    const normalizedUrl = url.toLowerCase();
    let hostname = "";
    
    try {
      const urlObj = new URL(url);
      hostname = urlObj.hostname.toLowerCase();
      console.log(`  Hostname: ${hostname}`);
    } catch (e) {
      console.log(`  Invalid URL format`);
    }
    
    // Check whitelist keywords first (higher priority)
    let whitelistMatch = null;
    for (const keyword of testWhitelistKeywords) {
      const normalizedKeyword = keyword.toLowerCase();
      
      if (normalizedUrl.includes(normalizedKeyword) || 
          (hostname && hostname.includes(normalizedKeyword))) {
        whitelistMatch = keyword;
        break;
      }
    }
    
    if (whitelistMatch) {
      console.log(`  ✅ ALLOWED - Whitelist keyword: ${whitelistMatch}`);
      console.log('');
      return;
    }
    
    // Check blacklist keywords
    let blacklistMatch = null;
    for (const keyword of testBlacklistKeywords) {
      const normalizedKeyword = keyword.toLowerCase();
      
      if (normalizedUrl.includes(normalizedKeyword) || 
          (hostname && hostname.includes(normalizedKeyword))) {
        blacklistMatch = keyword;
        break;
      }
    }
    
    if (blacklistMatch) {
      console.log(`  ❌ BLOCKED - Blacklist keyword: ${blacklistMatch}`);
    } else {
      console.log(`  ✅ ALLOWED - No matching keywords`);
    }
    
    console.log('');
  });
}

// Test with mock service worker environment
function testServiceWorkerLogic() {
  console.log('\n🔧 Testing Service Worker Logic...\n');
  
  // Mock the service worker variables
  const mockBlacklist = ['*.instagram.com', 'twitter.com'];
  const mockWhitelist = ['*.github.com', 'chatgpt.com/*'];
  const mockBlacklistKeywords = ['thigh', 'gaming', 'social'];
  const mockWhitelistKeywords = ['work', 'educational', 'research'];
  
  function checkKeywordBlocking(url, blacklistKeywords, whitelistKeywords) {
    const normalizedUrl = url.toLowerCase();
    let hostname = "";
    
    try {
      const urlObj = new URL(url);
      hostname = urlObj.hostname.toLowerCase();
    } catch (e) {
      // Continue without hostname
    }
    
    console.log(`Checking URL: ${url}`);
    console.log(`  Normalized URL: ${normalizedUrl}`);
    console.log(`  Hostname: ${hostname}`);
    
    // Check whitelist keywords (higher priority)
    console.log('  Checking whitelist keywords...');
    for (const keyword of whitelistKeywords) {
      const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
      if (!pattern) continue;
      
      const normalizedPattern = pattern.toLowerCase();
      console.log(`    Testing keyword: "${normalizedPattern}"`);
      
      if (normalizedUrl.includes(normalizedPattern) || 
          (hostname && hostname.includes(normalizedPattern))) {
        console.log(`    ✅ MATCHED whitelist keyword: ${pattern}`);
        return { blocked: false, reason: `Whitelist keyword: ${pattern}` };
      } else {
        console.log(`    ❌ No match`);
      }
    }
    
    // Check blacklist keywords
    console.log('  Checking blacklist keywords...');
    for (const keyword of blacklistKeywords) {
      const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
      if (!pattern) continue;
      
      const normalizedPattern = pattern.toLowerCase();
      console.log(`    Testing keyword: "${normalizedPattern}"`);
      
      if (normalizedUrl.includes(normalizedPattern) || 
          (hostname && hostname.includes(normalizedPattern))) {
        console.log(`    ✅ MATCHED blacklist keyword: ${pattern}`);
        return { blocked: true, reason: `Blacklist keyword: ${pattern}` };
      } else {
        console.log(`    ❌ No match`);
      }
    }
    
    console.log('  No keyword matches found');
    return { blocked: false, reason: 'No matching keywords' };
  }
  
  // Test URLs
  const testUrls = [
    'https://www.bing.com/search?q=thigh',
    'https://example.com/gaming',
    'https://work.gaming.com'
  ];
  
  testUrls.forEach(url => {
    console.log(`\n--- Testing: ${url} ---`);
    const result = checkKeywordBlocking(url, mockBlacklistKeywords, mockWhitelistKeywords);
    console.log(`RESULT: ${result.blocked ? 'BLOCKED' : 'ALLOWED'} - ${result.reason}\n`);
  });
}

// If running in browser console (extension context)
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('🌐 Running in browser extension context...\n');
  
  // Try to get current keyword configuration
  chrome.storage.local.get(['blacklistKeywords', 'whitelistKeywords'], (result) => {
    console.log('Current Extension Keywords:');
    console.log('  Blacklist Keywords:', result.blacklistKeywords || []);
    console.log('  Whitelist Keywords:', result.whitelistKeywords || []);
    
    if (!result.blacklistKeywords || result.blacklistKeywords.length === 0) {
      console.log('⚠️  WARNING: No blacklist keywords found in storage!');
      console.log('   This could be why keyword blocking is not working.');
    }
    
    testKeywordBlocking();
    testServiceWorkerLogic();
  });
} else {
  console.log('🖥️  Running in Node.js environment...\n');
  testKeywordBlocking();
  testServiceWorkerLogic();
}

console.log('='.repeat(50));
console.log('DEBUG COMPLETE');
console.log('='.repeat(50));
