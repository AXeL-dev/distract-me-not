/**
 * Simple test to add "thigh" keyword and verify it works
 * Run this in the browser console while the extension is active
 */

console.log('🧪 KEYWORD BLOCKING TEST');
console.log('========================');

async function testKeywordBlocking() {
  try {
    // Step 1: Check current keywords
    console.log('📋 Step 1: Checking current keywords...');
    
    const currentStorage = await new Promise(resolve => {
      chrome.storage.local.get(['blacklistKeywords', 'whitelistKeywords'], resolve);
    });
    
    console.log('Current blacklist keywords:', currentStorage.blacklistKeywords || []);
    console.log('Current whitelist keywords:', currentStorage.whitelistKeywords || []);
    
    // Step 2: Add "thigh" to blacklist keywords if not present
    console.log('\n🔧 Step 2: Adding "thigh" to blacklist keywords...');
    
    const currentBlacklistKeywords = currentStorage.blacklistKeywords || [];
    const hasThigh = currentBlacklistKeywords.some(kw => 
      (typeof kw === 'string' ? kw : kw.pattern || kw || '').toLowerCase().includes('thigh')
    );
    
    let newKeywords = currentBlacklistKeywords;
    if (!hasThigh) {
      newKeywords = [...currentBlacklistKeywords, 'thigh'];
      console.log('Adding "thigh" to keywords:', newKeywords);
      
      // Save to both storage areas
      await new Promise(resolve => {
        chrome.storage.local.set({blacklistKeywords: newKeywords}, resolve);
      });
      
      await new Promise(resolve => {
        chrome.storage.sync.set({blacklistKeywords: newKeywords}, resolve);
      });
      
      console.log('✅ Added to storage');
    } else {
      console.log('✅ "thigh" already exists in keywords');
    }
    
    // Step 3: Send to service worker
    console.log('\n📡 Step 3: Updating service worker...');
    
    const response = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        action: 'setBlacklistKeywords',
        params: [newKeywords]
      }, resolve);
    });
    
    console.log('Service worker response:', response);
    
    // Step 4: Test the blocking
    console.log('\n🧪 Step 4: Testing blocking...');
    
    const testUrl = 'https://www.bing.com/search?q=thigh';
    console.log('Testing URL:', testUrl);
    
    // Let's check if the service worker now has the keywords
    const keywordResponse = await new Promise(resolve => {
      chrome.runtime.sendMessage({action: 'getBlacklistKeywords'}, resolve);
    });
    
    console.log('Service worker blacklist keywords:', keywordResponse);
    
    // Test the blocking logic directly
    const blockingResult = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        action: 'checkUrlBlocking',
        params: [testUrl]
      }, resolve);
    });
    
    console.log('Blocking test result:', blockingResult);
    
    // Step 5: Manual verification
    console.log('\n✅ Test complete!');
    console.log('Now try navigating to:', testUrl);
    console.log('It should be blocked if keyword blocking is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testKeywordBlocking();
