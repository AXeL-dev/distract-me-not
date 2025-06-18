/**
 * Missing handler functions for service worker
 * This contains the core navigation handler functions that the simplified service worker is missing
 */

// Navigation handler implementations
let blockedUrls = new Set(); // Cache of blocked URLs

// Add more comprehensive navigation capture with proper feature detection
function setupNavigationListener() {
  try {
    // Remove any existing listeners first to avoid duplicates
    chrome.webNavigation.onBeforeNavigate.removeListener(navigationHandler);
    chrome.tabs.onUpdated.removeListener(tabsUpdatedHandler);
    
    // Only try to remove webRequest listener if API exists
    if (chrome.webRequest) {
      chrome.webRequest.onBeforeRequest.removeListener(webRequestHandler);
    }
  } catch (e) {
    // Ignore if any don't exist
    console.log('[DMN INFO] Error removing existing listeners (can be ignored):', e);
  }
  
  // Add our navigation handlers
  // 1. Primary navigation listener - catches direct address bar navigations
  chrome.webNavigation.onBeforeNavigate.addListener(navigationHandler);
  console.log('[DMN INFO] Added webNavigation.onBeforeNavigate listener');
  
  // 2. Tabs updated listener - catches some navigation that might be missed
  chrome.tabs.onUpdated.addListener(tabsUpdatedHandler);
  console.log('[DMN INFO] Added tabs.onUpdated listener');
  
  // 3. Web request listener - only if available
  if (chrome.webRequest) {
    try {
      // Try with blocking option first (works in Firefox)
      chrome.webRequest.onBeforeRequest.addListener(
        webRequestHandler,
        { urls: ["<all_urls>"], types: ["main_frame"] },
        ["blocking"]
      );
      console.log('[DMN INFO] Added blocking webRequest.onBeforeRequest listener');
    } catch (e) {
      console.error('[DMN ERROR] Unable to add blocking webRequest listener:', e);
      try {
        // Fall back to non-blocking (doesn't prevent navigation but can redirect)
        chrome.webRequest.onBeforeRequest.addListener(
          webRequestHandler,
          { urls: ["<all_urls>"], types: ["main_frame"] }
        );
        console.log('[DMN INFO] Added non-blocking webRequest.onBeforeRequest listener');
      } catch (err) {
        console.error('[DMN ERROR] Unable to add any webRequest listener:', err);
      }
    }
  } else {
    console.log('[DMN INFO] webRequest API not available in this browser/context');
  }
  
  console.log('[DMN INFO] Navigation listeners setup complete');

  // Set up storage change listener (important for syncing across devices)
  setupStorageChangeListener();
}

// Set up a listener for storage changes to detect when settings are updated on other devices
function setupStorageChangeListener() {
  try {
    // Remove existing listener if any to avoid duplicates
    chrome.storage.onChanged.removeListener(handleStorageChanges);
    
    // Add the listener
    chrome.storage.onChanged.addListener(handleStorageChanges);
    console.log('[DMN INFO] Added storage change listener for cross-device syncing');
  } catch (error) {
    console.error('[DMN ERROR] Failed to setup storage change listener:', error);
  }
}

// Handler for storage changes
function handleStorageChanges(changes, areaName) {
  console.log(`[DMN INFO] Storage changes detected in ${areaName}:`, changes);
  
  // Only process sync changes
  if (areaName !== 'sync') {
    return;
  }
  
  let shouldUpdateRules = false;
  
  // Process changes in deny list (blacklist)
  if (changes.blacklist) {
    console.log('[DMN INFO] Deny list updated from sync storage:', changes.blacklist.newValue);
    blacklist = changes.blacklist.newValue || [];
    shouldUpdateRules = true;
  }
  
  // Process changes in allow list (whitelist)
  if (changes.whitelist) {
    console.log('[DMN INFO] Allow list updated from sync storage:', changes.whitelist.newValue);
    whitelist = changes.whitelist.newValue || [];
    shouldUpdateRules = true;
  }
  
  // Process changes in deny list keywords
  if (changes.blacklistKeywords) {
    console.log('[DMN INFO] Deny list keywords updated from sync storage:', changes.blacklistKeywords.newValue);
    blacklistKeywords = changes.blacklistKeywords.newValue || [];
    shouldUpdateRules = true;
  }
  
  // Process changes in allow list keywords
  if (changes.whitelistKeywords) {
    console.log('[DMN INFO] Allow list keywords updated from sync storage:', changes.whitelistKeywords.newValue);
    whitelistKeywords = changes.whitelistKeywords.newValue || [];
    shouldUpdateRules = true;
  }
  
  // Process changes in filtering mode
  if (changes.mode) {
    console.log('[DMN INFO] Mode updated from sync storage:', changes.mode.newValue);
    mode = changes.mode.newValue || defaultMode;
    shouldUpdateRules = true;
  }
  
  // Process changes in frame types
  if (changes.framesType) {
    console.log('[DMN INFO] Frame types updated from sync storage:', changes.framesType.newValue);
    framesType = changes.framesType.newValue || defaultFramesType;
    shouldUpdateRules = true;
  }
  
  if (shouldUpdateRules) {
    setupBlockingRules();
    blockedUrls.clear();
    console.log('[DMN INFO] Rules updated from sync storage changes');
    
    // Check all open tabs with our new rules
    if (isEnabled) {
      checkAllTabs();
    }
  }
}

// Handler for chrome.tabs.onUpdated events
function tabsUpdatedHandler(tabId, changeInfo, tab) {
  // Only handle URL changes in loading phase
  if (changeInfo.status === 'loading' && changeInfo.url) {
    console.log(`[DMN INFO] Tab updated navigation to: ${changeInfo.url} [tabs.onUpdated]`);
    
    // Process the URL through our standard handler
    handleUrl(changeInfo.url, tabId, 'tabs.onUpdated');
  }
}

// Handler for chrome.webRequest.onBeforeRequest events
// Modified to handle the case when the API doesn't support blocking
function webRequestHandler(details) {
  if (details.type === 'main_frame') {
    console.log(`[DMN INFO] Web request to: ${details.url} [webRequest.onBeforeRequest]`);
    
    // Process the URL 
    const result = handleUrl(details.url, details.tabId, 'webRequest.onBeforeRequest');
    
    // Return blocking response if function supports it (chrome.webRequest API with blocking permission)
    if (result && chrome.webRequest && chrome.webRequest.onBeforeRequest.hasListener) {
      return { cancel: true }; // Block and let our redirect handler take over
    }
  }
  
  // Don't return anything for non-blocking listeners
  // This prevents "Function returned a value that is not convertible to Dictionary" errors
  if (chrome.webRequest && chrome.webRequest.onBeforeRequest.hasListener) {
    return { cancel: false };
  }
}

function navigationHandler(details) {
  if (details.frameId === 0) { // Only block main frame navigations
    console.log(`[DMN INFO] Navigation attempt to: ${details.url} (via navigationHandler)`);

    // Only check if extension is enabled
    if (!isEnabled) {
      console.log('[DMN INFO] Extension disabled, allowing navigation (via navigationHandler)');
      return;
    }

    // Check if URL should be blocked
    const blockDetails = checkUrlShouldBeBlocked(details.url); // Returns { blocked, reason }

    if (blockDetails && blockDetails.blocked) {
      // Block the navigation by redirecting to the blocked page
      console.log(`[DMN INFO] BLOCKING navigation to: ${details.url}, Reason: ${blockDetails.reason} (via navigationHandler)`);
      redirectToBlockedPage(details.tabId, details.url, blockDetails.reason); // Use redirectToBlockedPage to include reason
    } else {
      console.log(`[DMN INFO] ALLOWING navigation to: ${details.url} (via navigationHandler)`);
      // No action needed if not blocked
    }
  }
}

// Centralized URL handler to ensure consistent handling
function handleUrl(url, tabId, source) {
  // Skip our own redirect pages
  const indexUrl = chrome.runtime.getURL('index.html');
  if (url.startsWith(indexUrl)) {
    console.log(`[DMN INFO] Skipping redirect page: ${url} (source: ${source})`);
    return false;
  }
  
  // Only proceed if extension is enabled
  if (!isEnabled) {
    console.log(`[DMN INFO] Extension disabled, allowing URL: ${url} (source: ${source})`);
    return false;
  }
  
  // Check if URL should be blocked
  const blockDetails = checkUrlShouldBeBlocked(url);
  
  if (blockDetails && blockDetails.blocked) {
    console.log(`[DMN INFO] BLOCKING URL: ${url} (source: ${source}), Reason: ${blockDetails.reason}`);
    
    // Remember this URL is blocked to speed up future checks
    blockedUrls.add(url);
    
    // Redirect to blocked page
    redirectToBlockedPage(tabId, url, blockDetails.reason);
    return true; // URL was blocked
  } else {
    console.log(`[DMN INFO] ALLOWING URL: ${url} (source: ${source})`);
    return false; // URL was allowed
  }
}

// Simple URL normalization function
function normalizeUrl(url) {
  // Remove trailing slash for simpler matching
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  
  // Convert to lowercase for case-insensitive matching
  return url.toLowerCase();
}

// Function to check all open tabs against current rules
function checkAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    // For each open tab, check if it should be blocked based on current rules
    for (const tab of tabs) {
      if (tab.url && tab.url.startsWith('http')) {
        // Exclude browser UI pages and other extension pages
        if (!tab.url.startsWith('chrome://') && 
            !tab.url.startsWith('chrome-extension://') && 
            !tab.url.startsWith('moz-extension://')) {
          
          console.log(`[DMN INFO] Checking tab: ${tab.id}, URL: ${tab.url}`);
          
          // Use our standard URL handler to ensure consistent behavior
          handleUrl(tab.url, tab.id, 'checkAllTabs');
        }
      }
    }
  });
}

// Function to redirect to blocked page
function redirectToBlockedPage(tabId, blockedUrl, reason) {
  // Create a URL with parameters for the blocked page
  const redirectUrl = chrome.runtime.getURL(
    `index.html?blocked=${encodeURIComponent(blockedUrl)}&reason=${encodeURIComponent(reason || 'Blocked by pattern')}`
  );
  
  console.log(`[DMN INFO] Redirecting to block page: ${redirectUrl}`);
  
  // Update the tab to our block page
  chrome.tabs.update(tabId, { url: redirectUrl });
}

// Function to check if a URL should be blocked
function checkUrlShouldBeBlocked(url) {
  if (!url) {
    return { blocked: false, reason: 'Empty URL' };
  }
  
  // Normalize URL to lowercase for case insensitivity
  url = url.toLowerCase();
  
  // Skip standard browser pages and extension pages
  if (url.startsWith('chrome://') || 
      url.startsWith('chrome-extension://') || 
      url.startsWith('moz-extension://') || 
      url.startsWith('about:') || 
      url.startsWith('edge://') || 
      url.startsWith('browser://')) {
    return { blocked: false, reason: 'Browser internal page' };
  }
  
  // Handle different filtering modes
  switch (mode) {
    case 'blacklist': // Deny list only mode
      // First check whitelist for exceptions (higher priority)
      if (isUrlInList(url, whitelist)) {
        return { blocked: false, reason: 'Explicitly allowed (on allow list)' };
      }
      
      // Then check if URL is in deny list
      if (isUrlInList(url, blacklist)) {
        return { blocked: true, reason: 'URL pattern denied (on deny list)' };
      }
      
      // Check keywords
      for (const keyword of blacklistKeywords) {
        const kwPattern = typeof keyword === 'string' ? keyword : keyword?.pattern || '';
        if (kwPattern && url.includes(kwPattern.toLowerCase())) {
          return { blocked: true, reason: `Contains denied keyword: ${kwPattern}` };
        }
      }
      
      // Nothing matched, allow by default in blacklist mode
      return { blocked: false, reason: 'Not on deny list' };
      
    case 'whitelist': // Allow list only mode
      // Check if URL is in allow list
      if (isUrlInList(url, whitelist)) {
        // In whitelist mode, explicitly check for deny patterns even for whitelisted URLs
        // This allows more granular control
        if (isUrlInList(url, blacklist)) {
          return { blocked: true, reason: 'Explicitly denied despite being on allow list' };
        }
        
        // Check if URL contains any denied keywords
        for (const keyword of blacklistKeywords) {
          const kwPattern = typeof keyword === 'string' ? keyword : keyword?.pattern || '';
          if (kwPattern && url.includes(kwPattern.toLowerCase())) {
            return { blocked: true, reason: `Contains denied keyword: ${kwPattern}` };
          }
        }
        
        // URL is explicitly allowed and not denied
        return { blocked: false, reason: 'Explicitly allowed (on allow list)' };
      }
      
      // Check if URL contains any allowed keywords
      for (const keyword of whitelistKeywords) {
        const kwPattern = typeof keyword === 'string' ? keyword : keyword?.pattern || '';
        if (kwPattern && url.includes(kwPattern.toLowerCase())) {
          return { blocked: false, reason: `Contains allowed keyword: ${kwPattern}` };
        }
      }
      
      // Nothing matched, block by default in whitelist mode
      return { blocked: true, reason: 'Not on allow list (default deny in allow-only mode)' };
      
    case 'combined': // Combined mode (default)
    default:
      // First check whitelist for exceptions (highest priority)
      if (isUrlInList(url, whitelist)) {
        return { blocked: false, reason: 'Explicitly allowed (on allow list)' };
      }
      
      // Check for allowed keywords
      for (const keyword of whitelistKeywords) {
        const kwPattern = typeof keyword === 'string' ? keyword : keyword?.pattern || '';
        if (kwPattern && url.includes(kwPattern.toLowerCase())) {
          return { blocked: false, reason: `Contains allowed keyword: ${kwPattern}` };
        }
      }
      
      // Check if URL is in deny list
      if (isUrlInList(url, blacklist)) {
        return { blocked: true, reason: 'URL pattern denied (on deny list)' };
      }
      
      // Check for denied keywords
      for (const keyword of blacklistKeywords) {
        const kwPattern = typeof keyword === 'string' ? keyword : keyword?.pattern || '';
        if (kwPattern && url.includes(kwPattern.toLowerCase())) {
          return { blocked: true, reason: `Contains denied keyword: ${kwPattern}` };
        }
      }
      
      // Nothing matched, allow by default in combined mode
      return { blocked: false, reason: 'Not matched by any rule' };
  }
}

// Helper function to check if a URL matches any pattern in a list
function isUrlInList(url, list) {
  for (const item of list) {
    try {
      const pattern = typeof item === 'string' ? item : item.pattern || '';
      if (!pattern) continue;
      
      const regex = wildcardToRegExp(pattern);
      if (regex.test(url)) {
        return true;
      }
    } catch (e) {
      console.error(`[DMN ERROR] Error checking pattern match: ${e}`);
    }
  }
  return false;
}

// Setup declarative blocking rules
function setupBlockingRules() {
  console.log('[DMN INFO] Setting up blocking rules');
  
  // Need to implement this - placeholder for now
  // This would create declarativeNetRequest rules for faster blocking
  // but it's optional and we can implement this later
  return true;
}

// Function to set up periodic sync check
function setupPeriodicSyncCheck() {
  // Check sync every 5 minutes
  const SYNC_CHECK_INTERVAL = 5 * 60 * 1000;
  
  // Initial check after 1 minute
  setTimeout(checkSyncStatus, 60 * 1000);
  
  // Then check periodically
  setInterval(checkSyncStatus, SYNC_CHECK_INTERVAL);
  
  console.log('[DMN INFO] Periodic sync check scheduled');
}

// Function to check sync status and update rules if needed
async function checkSyncStatus() {
  console.log('[DMN INFO] Performing periodic sync check');
  
  try {
    // Get current rules from sync storage
    const syncData = await chrome.storage.sync.get({
      blacklist: [],
      whitelist: [],
      blacklistKeywords: [],
      whitelistKeywords: [],
      mode: defaultMode
    });
    
    // Check if they differ from in-memory rules
    let needsUpdate = false;
    
    if (syncData.mode !== mode) {
      console.log('[DMN INFO] Mode changed in sync storage, updating');
      needsUpdate = true;
    }
    
    // Check if deny list length changed or contents changed
    if (syncData.blacklist.length !== blacklist.length) {
      console.log('[DMN INFO] Deny list length changed in sync storage, updating');
      needsUpdate = true;
    } else {
      // Check if the contents are different
      for (let i = 0; i < syncData.blacklist.length; i++) {
        if (syncData.blacklist[i] !== blacklist[i]) {
          console.log('[DMN INFO] Deny list content changed in sync storage, updating');
          needsUpdate = true;
          break;
        }
      }
    }
    
    // Similarly for allow list
    if (!needsUpdate && syncData.whitelist.length !== whitelist.length) {
      console.log('[DMN INFO] Allow list length changed in sync storage, updating');
      needsUpdate = true;
    }
    
    // Update if needed
    if (needsUpdate) {
      console.log('[DMN INFO] Updating rules from sync storage');
      
      // Update in-memory values
      blacklist = syncData.blacklist;
      whitelist = syncData.whitelist;
      blacklistKeywords = syncData.blacklistKeywords;
      whitelistKeywords = syncData.whitelistKeywords;
      mode = syncData.mode;
      
      // Update rules
      setupBlockingRules();
      
      // Clear cache
      blockedUrls.clear();
      
      // Check all open tabs with the new rules
      if (isEnabled) {
        checkAllTabs();
      }
    } else {
      console.log('[DMN INFO] No changes detected in sync storage');
    }
  } catch (error) {
    console.error('[DMN ERROR] Error checking sync status:', error);
  }
}
