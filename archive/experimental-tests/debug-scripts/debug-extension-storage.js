/**
 * Extension Storage Diagnostic Script
 * Run this in the browser console to check stored keywords
 */

console.log('🔍 EXTENSION STORAGE DIAGNOSTIC');
console.log('================================');

function debugExtensionStorage() {
  // Check sync storage
  console.log('\n📦 Checking Sync Storage...');
  chrome.storage.sync.get(null, (syncData) => {
    console.log('Sync Storage Contents:', syncData);
    
    console.log('\n🔑 Keyword Analysis:');
    console.log('  blacklistKeywords:', syncData.blacklistKeywords || 'NOT FOUND');
    console.log('  whitelistKeywords:', syncData.whitelistKeywords || 'NOT FOUND');
    
    if (syncData.blacklistKeywords) {
      console.log('  Blacklist Keywords Type:', typeof syncData.blacklistKeywords);
      console.log('  Blacklist Keywords Length:', syncData.blacklistKeywords.length);
      
      if (Array.isArray(syncData.blacklistKeywords)) {
        console.log('  Individual Keywords:');
        syncData.blacklistKeywords.forEach((kw, index) => {
          console.log(`    [${index}]:`, kw, '(type:', typeof kw, ')');
        });
        
        // Check if "thigh" is in the list
        const hasThigh = syncData.blacklistKeywords.some(kw => {
          const pattern = typeof kw === 'string' ? kw : kw.pattern || kw;
          return pattern && pattern.toLowerCase().includes('thigh');
        });
        console.log('  Contains "thigh":', hasThigh);
      }
    }
    
    // Check local storage too
    console.log('\n📦 Checking Local Storage...');
    chrome.storage.local.get(null, (localData) => {
      console.log('Local Storage Contents:', localData);
      
      console.log('\n🔑 Local Keyword Analysis:');
      console.log('  blacklistKeywords:', localData.blacklistKeywords || 'NOT FOUND');
      console.log('  whitelistKeywords:', localData.whitelistKeywords || 'NOT FOUND');
      
      if (localData.blacklistKeywords) {
        console.log('  Local Blacklist Keywords Type:', typeof localData.blacklistKeywords);
        console.log('  Local Blacklist Keywords Length:', localData.blacklistKeywords.length);
        
        if (Array.isArray(localData.blacklistKeywords)) {
          console.log('  Individual Local Keywords:');
          localData.blacklistKeywords.forEach((kw, index) => {
            console.log(`    [${index}]:`, kw, '(type:', typeof kw, ')');
          });
          
          // Check if "thigh" is in the list
          const hasThigh = localData.blacklistKeywords.some(kw => {
            const pattern = typeof kw === 'string' ? kw : kw.pattern || kw;
            return pattern && pattern.toLowerCase().includes('thigh');
          });
          console.log('  Local Contains "thigh":', hasThigh);
        }
      }
      
      // Test what the service worker should be seeing
      console.log('\n🔧 Service Worker Message Test...');
      
      // Get current service worker state
      chrome.runtime.sendMessage({action: 'getBlacklistKeywords'}, (response) => {
        console.log('Service Worker blacklistKeywords response:', response);
      });
      
      chrome.runtime.sendMessage({action: 'getWhitelistKeywords'}, (response) => {
        console.log('Service Worker whitelistKeywords response:', response);
      });
      
      // Check current mode
      chrome.runtime.sendMessage({action: 'getMode'}, (response) => {
        console.log('Current mode:', response);
      });
      
      console.log('\n🧪 Testing Keyword Addition...');
      
      // Try adding "thigh" to blacklist keywords if it's not there
      const currentKeywords = localData.blacklistKeywords || [];
      const hasThigh = currentKeywords.some(kw => {
        const pattern = typeof kw === 'string' ? kw : kw.pattern || kw;
        return pattern && pattern.toLowerCase().includes('thigh');
      });
      
      if (!hasThigh) {
        console.log('⚠️  "thigh" not found in keywords! Adding it for testing...');
        
        const newKeywords = [...currentKeywords, 'thigh'];
        console.log('New keywords array:', newKeywords);
        
        chrome.storage.local.set({blacklistKeywords: newKeywords}, () => {
          console.log('✅ Added "thigh" to blacklistKeywords in local storage');
          
          // Also update sync storage
          chrome.storage.sync.set({blacklistKeywords: newKeywords}, () => {
            console.log('✅ Added "thigh" to blacklistKeywords in sync storage');
            
            // Send message to service worker to update
            chrome.runtime.sendMessage({
              action: 'setBlacklistKeywords',
              params: [newKeywords]
            }, (response) => {
              console.log('✅ Sent keyword update to service worker:', response);
              
              console.log('\n🔄 Please reload the extension or restart the browser and test again!');
            });
          });
        });
      } else {
        console.log('✅ "thigh" already exists in keywords');
      }
    });
  });
}

// Check if we're in an extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  debugExtensionStorage();
} else {
  console.log('❌ This script must be run in a browser extension context');
  console.log('   Please copy and paste this into the browser console');
  console.log('   while the extension is loaded.');
}
