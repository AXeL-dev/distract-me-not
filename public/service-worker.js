/**
 * Distract-Me-Not Service Worker
 * 
 * This service worker provides URL blocking functionality through three main mechanisms:
 * 1. webNavigation API - Captures address bar navigations
 * 2. tabs.onUpdated - Captures page loads and in-page navigations
 * 3. (When available) webRequest API - Extra coverage for link clicks
 * 
 * URLs are matched against deny list/allow list patterns using regex-converted wildcards.
 * URLs that should be blocked are redirected to a blocking page.
 */

// Import pattern matcher first
importScripts('service-worker-patterns.js');

// Verify the pattern matcher functions are available
console.log('Verifying pattern matcher functions:');
console.log('- wildcardToRegExp available:', typeof wildcardToRegExp === 'function');
console.log('- matchesPattern available:', typeof matchesPattern === 'function');
console.log('- self.matchesPattern available:', typeof self.matchesPattern === 'function');

// Import sync logging utility - this comment will be removed in Chrome builds
// @ts-ignore
importScripts('service-worker-sync-logging.js');

// Try to load required libraries - this will be replaced with inlined code in Chrome builds
try {
  importScripts('browser-polyfill.min.js');
  importScripts('bcrypt.min.js');
  console.log('Successfully imported browser-polyfill and bcrypt libraries');
} catch (e) {
  console.error('Failed to import libraries:', e);
  console.log('This is normal for Chrome builds where the libraries are inlined');
}

// Enhanced service worker with core blocking functionality

console.log('Enhanced service worker starting...');

// The wildcardToRegExp function is defined in service-worker-patterns.js
// This main service worker will use the imported implementation

// Import necessary constants for the basic functionality
const defaultTimerRuntime = {
  duration: 0,
  endDate: 0,
  remainingDuration: 0
};

const defaultTimerSettings = {
  isEnabled: false,
  defaultValue: '00:30',
  allowStoppingTimer: true,
  allowUsingTimerWithoutPassword: true,
  displayNotificationOnComplete: true,
  runtime: defaultTimerRuntime
};

// Add default framesType definition
const defaultFramesType = ['main_frame'];
const defaultMode = 'combined'; // Use 'combined' mode to match UI default
const defaultIsEnabled = false;

// Add global flag for installation status
let isInitialInstall = false; // Will be set to true on first install

// Basic state
let isEnabled = defaultIsEnabled;
let mode = defaultMode;
let blacklist = []; // denylist (legacy name kept for backward compatibility)
let whitelist = []; // allowlist (legacy name kept for backward compatibility)
let blacklistKeywords = []; // denylist keywords
let whitelistKeywords = []; // allowlist keywords
let timerSettings = defaultTimerSettings;
let framesType = defaultFramesType;

// Constants for declarativeNetRequest
const MAX_RULES = 5000; // Chrome has a limit of 5000 dynamic rules
const BASE_RULE_ID = 1000; // Starting rule ID
let currentRules = [];

// Storage keys configuration
const syncSettings = ['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords', 'mode', 'framesType', 'message', 'redirectUrl', 'schedule'];
const localSettings = ['isEnabled', 'enableLogs', 'timer'];

// Enhanced logging functionality
function logInfo(message, data) {
  console.log(`[DMN INFO] ${message}`, data || '');
}

function logWarning(message, data) {
  console.warn(`[DMN WARNING] ${message}`, data || '');
}

function logError(message, error) {
  console.error(`[DMN ERROR] ${message}`, error || '');
}

// Stub periodic sync checker so init() can always call it
function setupPeriodicSyncCheck() {
  // No-op for periodic sync
}

// Fallback: ensure checkAllTabs exists before any registration
if (typeof checkAllTabs !== 'function') {
  function checkAllTabs() {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.url && tab.url.startsWith('http')) {
          handleUrl(tab.url, tab.id, 'checkAllTabs');
        }
      }
    });
  }
}

// Enhanced initialization that checks all tabs - function defined later in file

// Helper to check if rules seem to have come from default initialization
function isLikelyFreshInstall() {
  // Check if we have any user-defined rules yet
  const hasNoRules = 
    blacklist.length === 0 && 
    whitelist.length === 0 &&
    blacklistKeywords.length === 0 &&
    whitelistKeywords.length === 0;
  
  // Only true for first run after installation
  return isInitialInstall && hasNoRules;
}

/**
 * Force pull the latest data from sync storage and update local storage and memory
 * This is especially important for fresh installs
 */
async function forcePullFromSyncStorage() {
  try {
    logInfo('Force-pulling data from sync storage');
    
    // Extra diagnostics if available
    if (typeof self.diagnoseSyncStatus === 'function') {
      await self.diagnoseSyncStatus();
    }
      // Define the default values for sync settings 
    const syncDefaults = {
      blacklist: [],
      whitelist: [],
      blacklistKeywords: [],
      whitelistKeywords: [],
      mode: defaultMode,
      framesType: defaultFramesType,
      message: '', 
      redirectUrl: '',
      schedule: { isEnabled: false, days: {} }
    };
    
    // Use the global syncSettings array for the storage.get() call
    const syncKeys = syncSettings;
    
    // Get sync data - use getBytesInUse first to check if there's any data
    let bytesInUse = 0;
    try {
      bytesInUse = await new Promise((resolve) => {
        chrome.storage.sync.getBytesInUse(null, (bytes) => {
          resolve(bytes || 0);
        });
      });
      
      logInfo(`Sync storage contains ${bytesInUse} bytes of data`);
    } catch (bytesError) {
      logError('Error checking sync storage size:', bytesError);
    }
    
    logInfo('Requesting data from sync storage...');
    const syncData = await chrome.storage.sync.get(syncSettings);
    
    // Validate sync data
    const hasValidRules = 
      (Array.isArray(syncData.blacklist) && syncData.blacklist.length > 0) || 
      (Array.isArray(syncData.whitelist) && syncData.whitelist.length > 0);
    
    logInfo(`Sync data received - blacklist: ${syncData.blacklist?.length || 0}, whitelist: ${syncData.whitelist?.length || 0}`);
    
    // If we have valid rules in sync, overwrite local data
    if (hasValidRules) {
      logInfo('Valid rules found in sync storage, updating local data');
      
      // Create safe versions of the data with defaults
      const safeData = {
        blacklist: Array.isArray(syncData.blacklist) ? syncData.blacklist : [],
        whitelist: Array.isArray(syncData.whitelist) ? syncData.whitelist : [],
        blacklistKeywords: Array.isArray(syncData.blacklistKeywords) ? syncData.blacklistKeywords : [],
        whitelistKeywords: Array.isArray(syncData.whitelistKeywords) ? syncData.whitelistKeywords : [],
        mode: syncData.mode || defaultMode,
        framesType: syncData.framesType || defaultFramesType
      };
      
      // Update local storage
      await chrome.storage.local.set(safeData);
      
      // Update in-memory variables
      blacklist = safeData.blacklist;
      whitelist = safeData.whitelist;
      blacklistKeywords = safeData.blacklistKeywords;
      whitelistKeywords = safeData.whitelistKeywords;
      mode = safeData.mode;
      framesType = safeData.framesType;
      
      // Update rules and clear cache
      setupBlockingRules();
      blockedUrls.clear();
      
      // Check all tabs with the new rules
      if (isEnabled) {
        checkAllTabs();
      }
      
      // Log success
      logInfo('Successfully updated local storage and memory with sync data');
      return true;
    } else {
      // Troubleshooting info
      if (bytesInUse > 0 && !hasValidRules) {
        logWarning('SYNC ANOMALY: Sync storage reports data exists, but no valid rules were returned');
        
        // Try a more explicit request for blacklist and whitelist directly
        try {
          const directSyncData = await chrome.storage.sync.get(['blacklist', 'whitelist']);
          logInfo('Direct sync query results:', {
            hasBlacklist: !!directSyncData.blacklist,
            blacklistLength: Array.isArray(directSyncData.blacklist) ? directSyncData.blacklist.length : 'not array',
            hasWhitelist: !!directSyncData.whitelist,
            whitelistLength: Array.isArray(directSyncData.whitelist) ? directSyncData.whitelist.length : 'not array'
          });
        } catch (directError) {
          logError('Error in direct sync query:', directError);
        }
      } else {
        logInfo('No valid rules found in sync storage, keeping current data');
      }
      return false;
    }
  } catch (error) {
    logError('Error force-pulling from sync storage:', error);
    return false;
  }
}

async function init() {
  try {
    logInfo('Initializing service worker...');
    
    // If this is a fresh install, don't load from sync storage yet - let the sync check handle it
    if (isInitialInstall) {
      logInfo('Fresh install detected in init() - skipping sync storage read to avoid overwriting cloud data');
      
      // Use defaults for now - the sync check will update these if cloud data exists
      blacklist = [];
      whitelist = [];
      blacklistKeywords = [];
      whitelistKeywords = [];
      mode = defaultMode;
      framesType = defaultFramesType;
      
      logInfo('Using defaults during fresh install, sync check will load cloud data if available');
      setupBlockingRules();
      logInfo('Service worker initialization complete (fresh install mode)');
      return;
    }
    
      // Try to get synced settings first
    try {
      // Define the default values for sync settings 
      const syncDefaults = {
        blacklist: [],
        whitelist: [],
        blacklistKeywords: [],
        whitelistKeywords: [],
        mode: defaultMode,
        framesType: defaultFramesType,
        message: '', 
        redirectUrl: '',
        schedule: { isEnabled: false, days: {} }
      };
      
      // Use the global syncSettings array for the storage.get() call
      const syncKeys = syncSettings;
        // Log that we're attempting to read from sync storage
      if (typeof self.syncDebug !== 'undefined') {
        self.syncDebug.log('Initializing service worker: Attempting to read from sync storage', {
          keys: syncSettings
        });
      }      // Get the actual stored data using callback pattern (more reliable than async/await)
      logInfo('Reading from sync storage...');
      const items = await new Promise((resolve, reject) => {
        chrome.storage.sync.get(syncSettings, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Storage error'));
          } else {
            resolve(result || {});
          }
        });
      });
      
      // Check if storage read was successful
      if (!items || typeof items !== 'object') {
        throw new Error('Storage read returned null/undefined or invalid type');
      }
      
      logInfo('Raw sync storage result:', {
        blacklistExists: 'blacklist' in items,
        whitelistExists: 'whitelist' in items,
        blacklistLength: items.blacklist?.length || 0,
        whitelistLength: items.whitelist?.length || 0,
        blacklistType: typeof items.blacklist,
        whitelistType: typeof items.whitelist,
        allKeys: Object.keys(items)
      });
      
      // Log the retrieved settings for debugging
      if (typeof self.syncDebug !== 'undefined') {
        self.syncDebug.log('Successfully loaded settings from sync storage', {
          keys: items ? Object.keys(items) : [],
          denyListCount: items.blacklist ? items.blacklist.length : 0,
          allowListCount: items.whitelist ? items.whitelist.length : 0,
          denyListKeywordsCount: items.blacklistKeywords ? items.blacklistKeywords.length : 0,
          allowListKeywordsCount: items.whitelistKeywords ? items.whitelistKeywords.length : 0
        });
      }
      
      // Directly assign values with proper validation and fallbacks
      blacklist = Array.isArray(items.blacklist) ? items.blacklist : [];
      whitelist = Array.isArray(items.whitelist) ? items.whitelist : [];
      blacklistKeywords = Array.isArray(items.blacklistKeywords) ? items.blacklistKeywords : [];
      whitelistKeywords = Array.isArray(items.whitelistKeywords) ? items.whitelistKeywords : [];
      mode = items.mode || defaultMode;
      framesType = Array.isArray(items.framesType) ? items.framesType : defaultFramesType;
      
      // Log assignment results
      logInfo('Assignment results:', {
        blacklistCount: blacklist.length,
        whitelistCount: whitelist.length,
        blacklistKeywordsCount: blacklistKeywords.length,
        whitelistKeywordsCount: whitelistKeywords.length,
        mode: mode
      });
      
      // Log some information about the deny list
      logInfo(`Loaded deny list with ${blacklist.length} entries.`);
      
      // Show sample data for debugging
      if (blacklist.length > 0) {
        logInfo('Sample blacklist items:', blacklist.slice(0, 3));
      }
      if (whitelist.length > 0) {
        logInfo('Sample whitelist items:', whitelist.slice(0, 3));
      }
      
      // IMPORTANT: For a fresh install, ALWAYS save sync data to local storage
      // This ensures we have rules locally even if writing to sync fails later
      if (isInitialInstall || blacklist.length > 0 || whitelist.length > 0) {
        logInfo('Saving sync settings to local storage (for data preservation)');
        await chrome.storage.local.set({
          blacklist: blacklist,
          whitelist: whitelist,
          blacklistKeywords: blacklistKeywords,
          whitelistKeywords: whitelistKeywords,
          mode: mode,
          framesType: framesType
        });
      }
    } catch (error) {
      logError('Error retrieving from sync storage, falling back to local:', error);
      
      if (typeof self.syncDebug !== 'undefined') {
        self.syncDebug.error('Failed to load settings from sync storage', error);
      }
      
      // Fall back to local storage for sync settings
      try {
        if (typeof self.syncDebug !== 'undefined') {
          self.syncDebug.log('Falling back to local storage for sync settings');
        }        const localItems = await new Promise((resolve, reject) => {
          chrome.storage.local.get(syncSettings, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message || 'Local storage error'));
            } else {
              resolve(result || {});
            }
          });
        });
        logInfo('Retrieved sync settings from local storage fallback', localItems);
        
        // Update state with local fallback values
        blacklist = Array.isArray(localItems.blacklist) ? localItems.blacklist : [];
        whitelist = Array.isArray(localItems.whitelist) ? localItems.whitelist : [];
        blacklistKeywords = Array.isArray(localItems.blacklistKeywords) ? localItems.blacklistKeywords : [];
        whitelistKeywords = Array.isArray(localItems.whitelistKeywords) ? localItems.whitelistKeywords : [];
        mode = localItems.mode || defaultMode;
        framesType = Array.isArray(localItems.framesType) ? localItems.framesType : defaultFramesType;
      } catch (localError) {
        logError('Error retrieving from local storage fallback, using defaults:', localError);
        
        // Use safe defaults if everything fails
        blacklist = [];
        whitelist = [];
        blacklistKeywords = [];
        whitelistKeywords = [];
        mode = defaultMode;
        framesType = defaultFramesType;
      }
    }
      // Always get local settings from local storage
    try {
      const localItems = await new Promise((resolve, reject) => {
        chrome.storage.local.get(localSettings, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Local settings storage error'));
          } else {
            resolve(result || {});
          }
        });
      });
      logInfo('Retrieved local settings', localItems);
      
      // Update local state
      isEnabled = localItems.isEnabled ?? defaultIsEnabled;
      timerSettings = { ...defaultTimerSettings, ...localItems.timer };
      enableLogs = localItems.enableLogs ?? false;
    } catch (error) {
      logError('Error retrieving local settings, using defaults:', error);
    }
    
    // Log details of blacklist and whitelist for debugging
    logInfo('Blacklist items:', blacklist.slice(0, 10)); // Show first 10 items
    logInfo('Blacklist keywords:', blacklistKeywords);
    
    // Log whitelist details too
    logInfo('WHITELIST RULES:');
    whitelist.forEach((item, index) => {
      const pattern = typeof item === 'string' ? item : item.pattern || item.url;
      logInfo(`Whitelist #${index}: ${pattern}`);
    });
    logInfo('Whitelist keywords:', whitelistKeywords);
    
    // Setup navigation listener for URL blocking
    setupNavigationListener();
    
    // Check all open tabs against the current rules
    if (isEnabled) {
      logInfo('Checking all open tabs against blocking rules');
      checkAllTabs();
    }
    
    // Set up periodic sync checking
    setupPeriodicSyncCheck();

    logInfo('Service worker initialized successfully');
  } catch (error) {
    logError('Error initializing service worker:', error);
  }
}

// Keep the clearPasswordProtection function as a utility, but don't call it automatically
async function clearPasswordProtection() {
  logInfo('EMERGENCY: Clearing password protection settings');
  try {
    // Get the current password settings
    const { password } = await chrome.storage.local.get({ password: {} });
    
    // Create a clean password settings object
    const cleanPasswordSettings = {
      isEnabled: false,
      hash: '',
      allowActivationWithoutPassword: true,
      allowAddingWebsitesWithoutPassword: true,
      blockAccessToExtensionsPage: false
    };
    
    // Update storage with clean password settings
    await chrome.storage.local.set({ 
      password: cleanPasswordSettings 
    });
    
    logInfo('Password protection has been disabled');
    return true;
  } catch (error) {
    logError('Failed to clear password protection:', error);
    return false;
  }
}

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
    logInfo('Error removing existing listeners (can be ignored):', e);
  }
  
  // Add our navigation handlers
  // 1. Primary navigation listener - catches direct address bar navigations
  chrome.webNavigation.onBeforeNavigate.addListener(navigationHandler);
  logInfo('Added webNavigation.onBeforeNavigate listener');
  
  // 2. Tabs updated listener - catches some navigation that might be missed
  chrome.tabs.onUpdated.addListener(tabsUpdatedHandler);
  logInfo('Added tabs.onUpdated listener');
  
  // 3. Web request listener - only if available
  if (chrome.webRequest) {
    try {
      // Try with blocking option first (works in Firefox)
      chrome.webRequest.onBeforeRequest.addListener(
        webRequestHandler,
        { urls: ["<all_urls>"], types: ["main_frame"] },
        ["blocking"]
      );
      logInfo('Added blocking webRequest.onBeforeRequest listener');
    } catch (e) {
      logError('Unable to add blocking webRequest listener:', e);
      try {
        // Fall back to non-blocking (doesn't prevent navigation but can redirect)
        chrome.webRequest.onBeforeRequest.addListener(
          webRequestHandler,
          { urls: ["<all_urls>"], types: ["main_frame"] }
        );
        logInfo('Added non-blocking webRequest.onBeforeRequest listener');
      } catch (err) {
        logError('Unable to add any webRequest listener:', err);
      }
    }
  } else {
    logInfo('webRequest API not available in this browser/context');
  }
  
  logInfo('Navigation listeners setup complete');

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
    logInfo('Added storage change listener for cross-device syncing');
  } catch (error) {
    logError('Failed to setup storage change listener:', error);
  }
}

// Handler for storage changes
function handleStorageChanges(changes, areaName) {
  logInfo(`Storage changes detected in ${areaName}:`, changes);
  
  // Only process sync changes
  if (areaName !== 'sync') {
    return;
  }
  
  let shouldUpdateRules = false;
  
  // Process changes in deny list (blacklist)
  if (changes.blacklist) {
    logInfo('Deny list updated from sync storage:', changes.blacklist.newValue);
    blacklist = changes.blacklist.newValue || [];
    shouldUpdateRules = true;
  }
  
  // Process changes in allow list (whitelist)
  if (changes.whitelist) {
    logInfo('Allow list updated from sync storage:', changes.whitelist.newValue);
    whitelist = changes.whitelist.newValue || [];
    shouldUpdateRules = true;
  }
  
  // Process changes in deny list keywords
  if (changes.blacklistKeywords) {
    logInfo('Deny list keywords updated from sync storage:', changes.blacklistKeywords.newValue);
    blacklistKeywords = changes.blacklistKeywords.newValue || [];
    shouldUpdateRules = true;
  }
  
  // Process changes in allow list keywords
  if (changes.whitelistKeywords) {
    logInfo('Allow list keywords updated from sync storage:', changes.whitelistKeywords.newValue);
    whitelistKeywords = changes.whitelistKeywords.newValue || [];
    shouldUpdateRules = true;
  }
  
  // Process changes in mode
  if (changes.mode) {
    logInfo('Mode updated from sync storage:', changes.mode.newValue);
    mode = changes.mode.newValue || defaultMode;
    shouldUpdateRules = true;
  }
  
  // Process changes in framesType
  if (changes.framesType) {
    logInfo('Frames type updated from sync storage:', changes.framesType.newValue);
    framesType = changes.framesType.newValue || defaultFramesType;
    shouldUpdateRules = true;
  }
    // Update the blocking rules if necessary
  if (shouldUpdateRules) {
    logInfo('Settings changed on another device, updating blocking rules');
    setupBlockingRules();
    
    // Clear the blocked URLs cache
    blockedUrls.clear();
    
    // Check all open tabs against the updated rules
    if (isEnabled) {
      logInfo('Re-evaluating all open tabs with new rules from sync');
      checkAllTabs();
    }
  }
}

// Handler for chrome.tabs.onUpdated events
function tabsUpdatedHandler(tabId, changeInfo, tab) {
  // Only handle URL changes in loading phase
  if (changeInfo.status === 'loading' && changeInfo.url) {
    logInfo(`Tab updated navigation to: ${changeInfo.url} [tabs.onUpdated]`);
    
    // Process the URL through our standard handler
    handleUrl(changeInfo.url, tabId, 'tabs.onUpdated');
  }
}

// Handler for chrome.webRequest.onBeforeRequest events
// Modified to handle the case when the API doesn't support blocking
function webRequestHandler(details) {
  if (details.type === 'main_frame') {
    logInfo(`Web request to: ${details.url} [webRequest.onBeforeRequest]`);
    
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

// Centralized URL handler to ensure consistent handling
function handleUrl(url, tabId, source) {
  // Skip our own redirect pages
  const indexUrl = chrome.runtime.getURL('index.html');
  if (url.startsWith(indexUrl)) {
    logInfo(`Skipping redirect page: ${url} (source: ${source})`);
    return;
  }
  
  // Normalize the URL for consistency
  const normalizedUrl = normalizeUrl(url);
  
  // First check our blocked URLs cache for quick rejection
  if (blockedUrls.has(url) || blockedUrls.has(normalizedUrl)) {
    logInfo(`URL found in blocked cache: ${url} (source: ${source}) - blocking`);
    // Even if it's in cache, we need a reason. Let's re-check, but this might be inefficient.
    // A better approach might be to store the reason in the cache too.
    // For now, let's re-evaluate to get the reason.
    const blockDetails = checkUrlShouldBeBlockedLocal(normalizedUrl);
    redirectToBlockedPage(tabId, url, blockDetails.reason || "Cached block");
    return;
  }

  // Only proceed if extension is enabled
  if (!isEnabled) {
    logInfo(`Extension disabled, allowing URL: ${url} (source: ${source})`);
    return;
  }
    // Check if URL should be blocked
  const blockDetails = checkUrlShouldBeBlockedLocal(normalizedUrl);
  
  if (blockDetails && blockDetails.blocked) {
    const reason = blockDetails.reason || "Matched block rule";
    logInfo(`BLOCKING URL: ${normalizedUrl} (source: ${source}), Reason: ${reason}`);
    blockedUrls.add(url); // Cache original URL
    blockedUrls.add(normalizedUrl); // Cache normalized URL
    redirectToBlockedPage(tabId, url, reason);
  } else {
    const reason = blockDetails && blockDetails.reason ? blockDetails.reason : "No matching block rules";
    logInfo(`ALLOWING URL: ${normalizedUrl} (source: ${source}), Reason: ${reason}`);
  }
}

// Update the existing navigation handler to use the central handler
function navigationHandler(details) {
  if (details.frameId === 0) { // Only block main frame navigations
    logInfo(`Navigation attempt to: ${details.url} (via navigationHandler)`);

    // Only check if extension is enabled
    if (!isEnabled) {
      logInfo('Extension disabled, allowing navigation (via navigationHandler)');
      return;
    }    // Check if URL should be blocked
    const blockDetails = checkUrlShouldBeBlockedLocal(details.url); // Returns { blocked, reason }

    if (blockDetails && blockDetails.blocked) {
      // Block the navigation by redirecting to the blocked page
      const reason = blockDetails.reason || "Matched block rule";
      logInfo(`BLOCKING navigation to: ${details.url}, Reason: ${reason} (via navigationHandler)`);
      redirectToBlockedPage(details.tabId, details.url, reason); // Use redirectToBlockedPage to include reason
    } else {
      const reason = blockDetails && blockDetails.reason ? blockDetails.reason : "No matching block rules";
      logInfo(`ALLOWING navigation to: ${details.url}, Reason: ${reason} (via navigationHandler)`);
      // No action needed if not blocked
    }
  }
}
// Add enhanced diagnostic functions to troubleshoot specific URL issues

// Add enhanced debugging option
let ENABLE_DEEP_DEBUGGING = false;
function deepLog(message, data) {
  if (ENABLE_DEEP_DEBUGGING) {
    console.log(`[DMN DEBUG] ${message}`, data || '');
  }
}

// Add a consistent navigation handler to ensure URLs remain blocked

// We need to track URLs we've decided to block to prevent edge cases with redirects
let blockedUrls = new Set();

// Extract the redirect logic to a separate function
function redirectToBlockedPage(tabId, url, reason) {  const indexUrl = chrome.runtime.getURL('index.html');
  const encodedUrl = encodeURIComponent(url);
  // Safeguard: if reason is empty or falsy, provide a default.
  const effectiveReason = reason || "Unknown reason for block";
  const encodedReason = encodeURIComponent(effectiveReason);
    // Get custom message if available - use promise pattern compatible with both Chrome and Firefox
  chrome.storage.sync.get({ message: '', blockTab: { message: '' } }, function(items) {
    // Try to get the message from either location
    const messageFromRoot = items.message || '';
    const messageFromBlockTab = (items.blockTab && items.blockTab.message) || '';
    const customMessage = messageFromRoot || messageFromBlockTab || '';
    
    logInfo('Retrieved custom block message - root:', messageFromRoot);
    logInfo('Retrieved custom block message - blockTab:', messageFromBlockTab);
    logInfo('Using custom message:', customMessage);
    
    const messageParam = customMessage ? `&message=${encodeURIComponent(customMessage)}` : '';
    
    // Log the full redirect URL for debugging
    const redirectUrl = `${indexUrl}#/blocked?url=${encodedUrl}&reason=${encodedReason}${messageParam}`;
    logInfo('Redirecting to:', redirectUrl);
    
    chrome.tabs.update(tabId, { url: redirectUrl });
  });
}

// URL normalization function - general purpose without site-specific handling
function normalizeUrl(url) {
  try {
    // Try to parse the URL
    const parsedUrl = new URL(url);
    
    // General normalization could be done here if needed
    // No site-specific handling
    
    return url;
  } catch (e) {
    // If parsing fails, return the original URL
    return url;
  }
}

function checkUrlShouldBeBlockedLocal(url) {
  // Always allow internal browser pages
  if (url.startsWith('edge://') || url.startsWith('chrome://')) {
    logInfo(`Allowing internal browser page: ${url}`);
    return { blocked: false, reason: "Internal browser page" };
  }

  // If not enabled, don't block anything
  if (!isEnabled) {
    return { blocked: false, reason: "Extension disabled" };
  }
  
  logInfo(`Checking URL against rules: ${url}`);
  
  // Use the new pattern matching logic from service-worker-patterns.js
  if (self.checkUrlShouldBeBlocked && typeof self.checkUrlShouldBeBlocked === 'function') {
    // Convert our internal blacklist/whitelist to the format expected by the new function
    const allowPatterns = whitelist.map(site => typeof site === 'string' ? site : site.pattern || site.url).filter(Boolean);
    const denyPatterns = blacklist.map(site => typeof site === 'string' ? site : site.pattern || site.url).filter(Boolean);
    
    logInfo(`Checking with ${denyPatterns.length} deny patterns and ${allowPatterns.length} allow patterns`);
    logInfo(`Deny patterns: ${JSON.stringify(denyPatterns)}`);
    logInfo(`Allow patterns: ${JSON.stringify(allowPatterns)}`);
      // Call the new pattern matching function
    const result = self.checkUrlShouldBeBlocked(url, allowPatterns, denyPatterns);
    
    // The new function returns an object with detailed information
    if (result && typeof result === 'object') {
      return {
        blocked: result.blocked,
        reason: result.reason,
        matchedPattern: result.matchedPattern,
        specificity: result.specificity
      };
    } else {
      // Fallback for backward compatibility (if function returns boolean)
      if (result) {
        return { blocked: true, reason: "Matched deny pattern" };
      } else {
        return { blocked: false, reason: "No matching block rules or overridden by allow pattern" };
      }
    }
  }
  
  // Fallback to old logic if new function not available
  logWarning('New pattern matching function not available, using fallback logic');
  
  // Parse URL for hostname and path matching (for logging purposes)
  let hostname = "";
  let parsedPath = "";
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname.toLowerCase();
    parsedPath = parsedUrl.pathname;
    logInfo(`URL hostname: ${hostname}, Path: ${parsedPath}`);
  } catch (e) {
    // Not a valid URL, continue with normal checks
    logInfo(`URL parsing failed, will use full URL: ${e.message}`);
  }

  // STEP 1: Check if the URL is on the allow list using the imported pattern matching functions
  // Find all allowlist patterns that match the URL
  let matchedAllowPatterns = [];
  
  for (const site of whitelist) {
    try {
      const pattern = typeof site === 'string' ? site : site.pattern || site.url;
      if (!pattern) continue;
      
      // Explicitly use self.matchesPattern to ensure we're using the imported function
      if (self.matchesPattern && typeof self.matchesPattern === 'function' 
          ? self.matchesPattern(pattern, url)
          : pattern.toLowerCase() === url.toLowerCase() || url.toLowerCase().includes(pattern.toLowerCase())) {
        logInfo(`URL MATCHED allow list pattern: ${pattern}`);
        matchedAllowPatterns.push(pattern);
      }
    } catch (e) {
      logError('Error checking allowlist pattern:', e);
    }
  }
  
  // STEP 2: Check if the URL is on the deny list
  // Find all deny patterns that match the URL
  let matchedDenyPatterns = [];
  
  if (mode === 'blacklist' || mode === 'denylist' || mode === 'combined') {
    for (const site of blacklist) {
      try {
        const pattern = typeof site === 'string' ? site : site.pattern || site.url;
        if (!pattern) continue;
        
        // Explicitly use self.matchesPattern to ensure we're using the imported function
        if (self.matchesPattern && typeof self.matchesPattern === 'function' 
            ? self.matchesPattern(pattern, url)
            : pattern.toLowerCase() === url.toLowerCase() || url.toLowerCase().includes(pattern.toLowerCase())) {
          logInfo(`URL MATCHED deny list pattern: ${pattern}`);
          matchedDenyPatterns.push(pattern);
        }
      } catch (e) {
        logError('Error checking denylist pattern:', e);
      }
    }
    
    // Check keywords in deny list
    for (const keyword of blacklistKeywords) {
      try {
        const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
        if (!pattern) continue;
        
        const normalizedPattern = pattern.toLowerCase();
        const normalizedUrl = url.toLowerCase();
        
        if (normalizedUrl.includes(normalizedPattern) || 
            (hostname && hostname.includes(normalizedPattern))) {
          logInfo(`URL MATCHED deny list keyword: ${pattern}`);
          matchedDenyPatterns.push(pattern);
        }
      } catch (e) {
        logError('Error checking denylist keyword:', e);
      }
    }
  }
  
  // STEP 3: Apply precedence rules for matched patterns
  // If we have both allow and deny matches, determine which takes precedence
    if (matchedAllowPatterns.length > 0 && matchedDenyPatterns.length > 0) {
    logInfo(`URL matched both allowlist and denylist patterns - determining precedence`);
      // Create a function to get the specificity score of a pattern
    // Higher score means more specific pattern
    function getPatternSpecificity(pattern, url) {
      // Start with basic length - longer patterns are generally more specific
      let score = pattern.length * 2;
      
      // Extract path from URL for comparison
      let urlDomain = "";
      let urlPath = "";
      
      try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        urlDomain = urlObj.hostname;
        urlPath = urlObj.pathname;
      } catch (e) {
        // If URL parsing fails, try to extract parts manually
        const parts = url.split('/');
        if (parts.length > 0) {
          urlDomain = parts[0].replace(/^https?:\/\//, '');
          urlPath = '/' + parts.slice(1).join('/');
        }
      }
      
      // Handle Reddit and similar sites with subreddit structures
      // reddit.com/r/specific/* should get very high precedence over reddit.com or reddit.com/r/*
      const isSubreddit = /\/r\/[^\/]+/.test(pattern);
      const isGeneralSubreddit = pattern.endsWith('/r/*');
      const isDomainOnly = !pattern.includes('/');
      
      // Extract the base domain and path parts from the pattern
      let patternDomain = "";
      let patternPath = "";
      
      if (pattern.includes('://')) {
        const parts = pattern.split('/');
        patternDomain = parts[2];
        patternPath = '/' + parts.slice(3).join('/');
      } else if (pattern.includes('/')) {
        const parts = pattern.split('/');
        patternDomain = parts[0];
        patternPath = '/' + parts.slice(1).join('/');
      } else {
        patternDomain = pattern;
      }
      
      // Check for explicit path matching with the URL
      if (patternPath && urlPath) {
        // Normalize paths for comparison
        const normalizedPatternPath = patternPath.endsWith('/*') ? 
          patternPath.substring(0, patternPath.length - 2) : patternPath;
          
        // If the pattern path appears exactly in the URL path, add a significant bonus
        if (urlPath.startsWith(normalizedPatternPath)) {
          // Direct path match - this should be highly prioritized
          score += 2000;
          
          // More specific paths should get a higher score
          const patternPathDepth = (normalizedPatternPath.match(/\//g) || []).length;
          score += patternPathDepth * 200;
        }
      }
      
      if (isSubreddit && !isGeneralSubreddit) {
        // Very high precedence for specific subreddit patterns
        score += 1000;
        
        // Check if the URL is actually for this specific subreddit
        const subredditMatch = pattern.match(/\/r\/([^\/]+)/);
        if (subredditMatch && urlPath && urlPath.includes(`/r/${subredditMatch[1]}`)) {
          score += 500; // Extra bonus for matching the current URL's subreddit
        }
      }
      
      // Path depth gives more specificity
      const pathDepth = (pattern.match(/\//g) || []).length;
      score += pathDepth * 100;
      
      // Domain-only patterns are less specific
      if (isDomainOnly) {
        score -= 200;
      }
      
      // Patterns ending with wildcards are less specific
      if (pattern.endsWith('/*')) {
        score -= 50;
      }
      
      // Patterns with subdomain wildcards (*.example.com) get a penalty unless they also have specific path
      if (pattern.includes('*.') && !patternPath) {
        score -= 150;
      }
      
      // For patterns with both subdomain wildcards AND specific paths, adjust based on URL path match
      if (pattern.includes('*.') && patternPath && urlPath) {
        // Check if the pattern path is present in the URL path
        const normalizedPatternPath = patternPath.replace(/\/\*$/, ''); // Remove trailing /* if present
        
        if (!urlPath.startsWith(normalizedPatternPath)) {
          // If the URL path doesn't match the pattern path, heavily penalize this pattern
          score -= 3000; // This should ensure it doesn't override more specific path matches
        }
      }
      
      logInfo(`Pattern: ${pattern}, Score: ${score}, Domain: ${patternDomain}, Path: ${patternPath}`);
      
      return score;
    }
    
    // Get the most specific patterns based on our custom scoring
    const sortedAllowPatterns = [...matchedAllowPatterns].sort((a, b) => 
      getPatternSpecificity(b, url) - getPatternSpecificity(a, url)
    );
    const sortedDenyPatterns = [...matchedDenyPatterns].sort((a, b) => 
      getPatternSpecificity(b, url) - getPatternSpecificity(a, url)
    );
    
    const mostSpecificAllow = sortedAllowPatterns[0];
    const mostSpecificDeny = sortedDenyPatterns[0];
    
    const allowScore = getPatternSpecificity(mostSpecificAllow, url);
    const denyScore = getPatternSpecificity(mostSpecificDeny, url);
    
    logInfo(`Most specific allow pattern: ${mostSpecificAllow} (score: ${allowScore})`);
    logInfo(`Most specific deny pattern: ${mostSpecificDeny} (score: ${denyScore})`);
    
    // Determine which pattern takes precedence
    if (allowScore > denyScore) {
      logInfo(`Allow pattern ${mostSpecificAllow} overrides deny pattern ${mostSpecificDeny} - allowing access`);
      return { blocked: false, reason: `Allow List pattern: ${mostSpecificAllow} overrides deny list: ${mostSpecificDeny}` };
    } else {
      logInfo(`Deny pattern ${mostSpecificDeny} takes precedence over allow pattern ${mostSpecificAllow} - blocking access`);
      return { blocked: true, reason: `Deny List pattern: ${mostSpecificDeny}` };
    }
  }
  
  // If URL matches any allow pattern with no overriding deny pattern, allow access
  if (matchedAllowPatterns.length > 0) {
    const allowPattern = matchedAllowPatterns[0];
    logInfo(`URL only matched allow patterns - allowing access: ${allowPattern}`);
    return { blocked: false, reason: `Allow List match: ${allowPattern}` };
  }
  
  // If URL matches any deny pattern with no overriding allow pattern, block access
  if (matchedDenyPatterns.length > 0) {
    const denyPattern = matchedDenyPatterns[0];
    logInfo(`URL only matched deny patterns - blocking access: ${denyPattern}`);
    return { blocked: true, reason: `Deny List match: ${denyPattern}` };
  }
  
  // STEP 4: In allow list mode, block everything not explicitly allowed
  if (mode === 'whitelist' || mode === 'allowlist') {
    logInfo(`URL not in allow list: ${url} - blocking access (Allow List Mode)`);
    return { blocked: true, reason: "URL not on Allow List (Allow List Mode)" }; 
  }  
  
  // If we reach here, allow the URL
  logInfo(`URL didn't match any blocking rules: ${url} - allowing access`);
  return { blocked: false, reason: "URL allowed by default (no matching rules)" };
}

function checkUrlAgainstRules(url) {
  logInfo(`Checking URL against rules: ${url}`);
  const result = checkUrlShouldBeBlockedLocal(url);
  
  if (result && result.blocked) {
    logInfo(`URL should be BLOCKED: ${url} - Reason: ${result.reason || "Unknown reason"}`);
    return true;
  } else {
    const reason = result && result.reason ? result.reason : "Unknown reason";
    logInfo(`URL should be ALLOWED: ${url} - Reason: ${reason}`);
    return false;
  }
}

// Utility function for testing URL matching
function testUrlMatch(url, pattern) {
  const regex = wildcardToRegExp(pattern);
  const isMatch = regex.test(url);
  console.log(`Testing URL: ${url} against pattern: ${pattern}`);
  console.log(`Regex: ${regex}`);
  console.log(`Result: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
  
  // Try also with hostname extraction
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const hostnameMatch = regex.test(hostname);
    console.log(`Hostname: ${hostname}`);
    console.log(`Hostname match: ${hostnameMatch ? 'MATCH' : 'NO MATCH'}`);
  } catch (e) {
    console.log(`URL parsing failed: ${e.message}`);
  }
  
  return isMatch;
}

// Debug function to test domain matching
function testDomainMatching() {
  console.log("=== TESTING DOMAIN MATCHING ===");
  
  // Test with iptorrents.com
  testUrlMatch("https://iptorrents.com/t", "iptorrents.com");
  testUrlMatch("https://iptorrents.com/t?p=8#torrents", "iptorrents.com");
  testUrlMatch("https://www.iptorrents.com/t", "iptorrents.com");
  
  // Test with wildcards
  testUrlMatch("https://sub.example.com/page", "*.example.com");
  testUrlMatch("https://example.com/page", "*.example.com");
  
  // Test with uppercase/lowercase
  testUrlMatch("https://IPTORRENTS.COM/t", "iptorrents.com");
  
  console.log("=== END TESTING ===");
}

// Replace the setupBlockingRules function with a simpler version that doesn't use declarativeNetRequest
async function setupBlockingRules() {
  // We're no longer using declarativeNetRequest rules at all
  // This function is kept for backward compatibility
  
  // Just log the current configuration
  logInfo('Setting up URL blocking with navigation listener only');
  logInfo(`Mode: ${mode}, Enabled: ${isEnabled}`);
  logInfo(`Blacklist entries: ${blacklist.length}, Whitelist entries: ${whitelist.length}`);
  logInfo(`Blacklist keywords: ${blacklistKeywords.length}, Whitelist keywords: ${whitelistKeywords.length}`);
  
  // Clear any existing rules if they exist
  if (currentRules.length > 0) {
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: currentRules.map(rule => rule.id)
      });
    } catch (e) {
      // Ignore errors if the API isn't available
      logInfo('declarativeNetRequest API not used');
    }
    currentRules = [];
  }
}

// Fix checkAllTabs function to detect blocked tabs more reliably
function checkAllTabs() {
  chrome.tabs.query({}).then((tabs) => {
    if (tabs.length > 0) {
      const indexUrl = chrome.runtime.getURL('index.html');
      
      for (const tab of tabs) {
        if (isEnabled) {
          // When extension is enabled, check if each tab should be blocked
          if (tab.url && tab.url.startsWith('http')) {
            logInfo(`Checking tab on enable: ${tab.url}`);
            handleUrl(tab.url, tab.id, 'checkAllTabs');
          }
        } else {
          // When extension is disabled, unblock any blocked tabs
          // More robust detection of blocked pages - match with or without the slash
          if (tab.url && (
              tab.url.includes(`${indexUrl}#blocked?url=`) || 
              tab.url.includes(`${indexUrl}#/blocked?url=`)
            )) {
            try {
              // Extract the original URL that was blocked - handle both formats
              let hash = new URL(tab.url).hash;
              if (hash.startsWith('#/')) {
                hash = hash.substring(2); // Remove the #/ prefix
              } else if (hash.startsWith('#')) {
                hash = hash.substring(1); // Remove the # prefix
              }
              
              const originalUrl = hash.split('url=')[1]?.split('&')[0];
              
              if (originalUrl) {
                const decodedUrl = decodeURIComponent(originalUrl);
                logInfo(`Unblocking tab: ${decodedUrl}`);
                chrome.tabs.update(tab.id, { url: decodedUrl });
              } else {
                logError('Could not extract original URL from hash: ' + hash);
                chrome.tabs.reload(tab.id);
              }
            } catch (e) {
              logError('Error extracting URL from blocked page:', e);
              // If we can't extract the URL, just reload the tab
              chrome.tabs.reload(tab.id);
            }
          }
        }
      }
    }
  }).catch(error => {
    logError('Error querying tabs:', error);
  });
}

// Update the checkTab function to use handleUrl directly
function checkTab(data, caller) {
  if (data && data.url) {
    handleUrl(data.url, data.tabId, caller);
  }
}

// Add a performance improvement for setIsEnabled with an immediate icon update
function setIsEnabled(value) {
  const wasEnabled = isEnabled;
  isEnabled = !!value;
  
  // Update icon immediately for better UX
  updateIcon();
  
  if (wasEnabled === isEnabled) {
    // No change, nothing to do
    return isEnabled;
  }
  
  if (!isEnabled) {
    // When disabling:
    // 1. Clear blocked URLs cache
    blockedUrls.clear();
    logInfo('Cleared blocked URLs cache due to disable');
    
    // 2. Unblock any blocked tabs
    logInfo('Unblocking any blocked tabs due to disable');
    checkAllTabs();
  } else {
    // When enabling, check all tabs against blocking rules
    logInfo('Checking all tabs against blocking rules due to enable');
    checkAllTabs();
  }
  
  chrome.storage.local.set({ isEnabled });
  logInfo(`Extension ${isEnabled ? 'enabled' : 'disabled'}`);
  return isEnabled;
}

// Update the updateIcon function for better handling
function updateIcon() {
  try {
    chrome.action.setIcon({
      path: isEnabled ? {
        16: 'icons/magnet-16.png',
        32: 'icons/magnet-32.png',
        48: 'icons/magnet-48.png',
        64: 'icons/magnet-64.png',
        128: 'icons/magnet-128.png',
      } : {
        16: 'icons/magnet-grayscale-16.png',
        32: 'icons/magnet-grayscale-32.png',
        48: 'icons/magnet-grayscale-48.png',
        64: 'icons/magnet-grayscale-64.png',
        128: 'icons/magnet-grayscale-128.png',
      }
    });
  } catch (e) {
    // Fall back to browserAction for compatibility
    try {
      chrome.browserAction.setIcon({
        path: isEnabled ? {
          16: 'icons/magnet-16.png',
          32: 'icons/magnet-32.png',
          48: 'icons/magnet-48.png',
          64: 'icons/magnet-64.png',
          128: 'icons/magnet-128.png',
        } : {
          16: 'icons/magnet-grayscale-16.png',
          32: 'icons/magnet-grayscale-32.png',
          48: 'icons/magnet-grayscale-48.png',
          64: 'icons/magnet-grayscale-64.png',
          128: 'icons/magnet-grayscale-128.png',
        }
      });
    } catch (err) {
      logError('Failed to update extension icon:', err);
    }
  }
}

// Enhanced message handler with more extension functionality
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logInfo('Message received:', request.message);
  
  try {
    let response = null;
    
    // Handle specific message types
    switch (request.message) {
      case 'getIsEnabled':
        response = isEnabled;
        break;
        
      case 'setIsEnabled':
        response = setIsEnabled(request.params[0]);
        break;
        
      case 'getMode':
        response = mode;
        break;
        
      case 'setMode':
        mode = request.params[0];
        // Use sync storage for mode
        chrome.storage.sync.set({ mode }).catch(error => {
          logError('Failed to save to sync storage, falling back to local:', error);
          chrome.storage.local.set({ mode });
        });
        // Clear the blocked URLs cache when mode changes
        blockedUrls.clear();
        logInfo(`Mode changed to: ${mode}, cleared blocked URLs cache`);
        response = true;
        break;
        
      case 'getBlacklist':
        response = blacklist;
        break;
          case 'setBlacklist':
        logInfo('Updating blacklist with entries:', 
          request.params[0] ? request.params[0].length : 0);
        blacklist = request.params[0];
        
        // Use sync storage for lists, but not on fresh install with empty lists
        // to avoid overwriting existing cloud data
        if (!isLikelyFreshInstall() || blacklist.length > 0) {
          chrome.storage.sync.set({ blacklist }).catch(error => {
            logError('Failed to save to sync storage, falling back to local:', error);
            chrome.storage.local.set({ blacklist });
          });
        } else {
          logInfo('Skipped saving empty blacklist to sync on fresh install');
          chrome.storage.local.set({ blacklist });
        }
        
        // Clear the blocked URLs cache when blacklist rules change
        blockedUrls.clear();
        logInfo('Cleared blocked URLs cache due to blacklist update');
        // No need to call setupBlockingRules()
        response = true;
        break;
        
      case 'getWhitelist':
        response = whitelist;
        break;
          case 'setWhitelist':
        logInfo('Updating whitelist with entries:', 
          request.params[0] ? request.params[0].length : 0);
        whitelist = request.params[0];
        
        // Use sync storage for lists, but not on fresh install with empty lists
        // to avoid overwriting existing cloud data
        if (!isLikelyFreshInstall() || whitelist.length > 0) {
          chrome.storage.sync.set({ whitelist }).catch(error => {
            logError('Failed to save to sync storage, falling back to local:', error);
            chrome.storage.local.set({ whitelist });
          });
        } else {
          logInfo('Skipped saving empty whitelist to sync on fresh install');
          chrome.storage.local.set({ whitelist });
        }
        
        // Clear the blocked URLs cache when whitelist rules change
        blockedUrls.clear();
        logInfo('Cleared blocked URLs cache due to whitelist update');
        // No need to call setupBlockingRules()
        response = true;
        break;
        
      case 'getBlacklistKeywords':
        response = blacklistKeywords;
        break;
        
      case 'setBlacklistKeywords':
        logInfo('Updating blacklist keywords:', request.params[0]);
        blacklistKeywords = request.params[0];
        chrome.storage.local.set({ blacklistKeywords });
        // Clear the blocked URLs cache when blacklist keywords change
        blockedUrls.clear();
        logInfo('Cleared blocked URLs cache due to blacklist keywords update');
        // No need to call setupBlockingRules()
        response = true;
        break;
        
      case 'getWhitelistKeywords':
        response = whitelistKeywords;
        break;
        
      case 'setWhitelistKeywords':
        whitelistKeywords = request.params[0];
        chrome.storage.local.set({ whitelistKeywords });
        // Clear the blocked URLs cache when whitelist keywords change
        blockedUrls.clear();
        logInfo('Cleared blocked URLs cache due to whitelist keywords update');
        // No need to call setupBlockingRules()
        response = true;
        break;
        
      case 'getTimerSettings':
        response = timerSettings;
        break;
        
      case 'setTimerSettings':
        if (request.params && request.params[0]) {
          timerSettings = { 
            ...timerSettings, 
            ...request.params[0]
          };
        }
        response = true;
        break;
        
      case 'getSchedule':
        // Return basic schedule data
        response = { 
          isEnabled: false,
          days: {} 
        };
        break;
        
      case 'getUnblockSettings':
        // Return basic unblock settings
        response = { 
          isEnabled: false,
          unblockOnceTimeout: 30,
          displayNotificationOnTimeout: true,
          autoReblockOnTimeout: false,
          requirePassword: false
        };
        break;
        
      case 'getLogsSettings':
        // Return basic logs settings
        response = {
          isEnabled: false,
          maxLength: 100
        };
        break;
        
      case 'isTimerActive':
        // Implement a simple timer check (can be enhanced later)
        response = false;
        break;
          case 'isUrlStillBlocked':
        if (request.params && request.params[0]) {
          response = checkUrlShouldBeBlockedLocal(request.params[0]);
        } else {
          response = false;
        }
        break;
        
      case 'debugUrlMatching':
        if (request.params && request.params[0]) {
          response = debugUrlMatching(request.params[0]);
        }
        break;
        
      case 'testProblematicUrl':
        response = safeDebugFunction(testProblematicUrl, request.params?.[0]);
        break;
        
      case 'testWhitelistPatternMatching':
        response = safeDebugFunction(testWhitelistPatternMatching);
        break;
        
      case 'clearBlockedCache':
        blockedUrls.clear();
        response = true;
        break;
        
      case 'testUrlMatching':        response = safeDebugFunction(testUrlMatching);
        break;            case 'ping':
        // Simple ping response for diagnostics
        logInfo('Ping received from diagnostics page');
        response = { 
          timestamp: Date.now(),
          status: 'alive',
          version: chrome.runtime.getManifest().version
        };
        break;
        
      case 'getCurrentSettings':
        // Return current settings to the requester
        logInfo('Current settings requested from diagnostics page');
        response = getCurrentSettings();
        break;
        
      case 'forceUpdateRules':
        // Force update rules and re-evaluate open tabs - useful when rules are synced from other devices
        logInfo('Force update rules request received');
        // Update blocking rules
        setupBlockingRules();
        // Clear the blocked URLs cache
        blockedUrls.clear();
        // Re-evaluate all open tabs with current rules
        if (isEnabled) {
          logInfo('Re-evaluating all open tabs with current rules');
          checkAllTabs();
        }
        response = { 
          success: true, 
          timestamp: Date.now(), 
          message: 'Rules updated and tabs re-evaluated'
        };
        break;
        
      case 'updateRules':
        // Force reload rules from sync storage and re-evaluate all tabs
        logInfo('Force reload rules from sync storage requested');
        
        // Set up an immediate response
        response = { 
          success: true, 
          message: 'Rules update from sync started' 
        };
        
        // Do the actual work asynchronously
        (async function() {
          try {
            // Explicitly get the latest sync data first
            const syncSettings = {
              blacklist: [], 
              whitelist: [], 
              blacklistKeywords: [], 
              whitelistKeywords: [],
              mode: defaultMode,
              framesType: defaultFramesType,
              message: '', 
              redirectUrl: '',
              schedule: { isEnabled: false, days: {} }
            };
              // First try sync storage for the latest data
            logInfo('Explicitly requesting latest data from sync storage');
            const syncData = await chrome.storage.sync.get(syncSettings);
            
            // Create a safe result object with defaults for all expected values
            const safeSyncData = {
              // Default values
              blacklist: [], 
              whitelist: [], 
              blacklistKeywords: [], 
              whitelistKeywords: [],
              mode: defaultMode,
              framesType: defaultFramesType,
              message: '',
              redirectUrl: '',
              schedule: { isEnabled: false, days: {} },
              
              // Override with any valid values from syncData
              ...syncData
            };
            
            // Ensure we have valid arrays for lists
            safeSyncData.blacklist = Array.isArray(safeSyncData.blacklist) ? safeSyncData.blacklist : [];
            safeSyncData.whitelist = Array.isArray(safeSyncData.whitelist) ? safeSyncData.whitelist : [];
            safeSyncData.blacklistKeywords = Array.isArray(safeSyncData.blacklistKeywords) ? safeSyncData.blacklistKeywords : [];
            safeSyncData.whitelistKeywords = Array.isArray(safeSyncData.whitelistKeywords) ? safeSyncData.whitelistKeywords : [];
            
            logInfo('Retrieved sync data:', {
              blacklistCount: safeSyncData.blacklist.length,
              whitelistCount: safeSyncData.whitelist.length
            });
            
            // Update local storage with the latest sync data
            await chrome.storage.local.set({
              blacklist: safeSyncData.blacklist,
              whitelist: safeSyncData.whitelist,
              blacklistKeywords: safeSyncData.blacklistKeywords,
              whitelistKeywords: safeSyncData.whitelistKeywords,
              mode: safeSyncData.mode,
              framesType: safeSyncData.framesType
            });
            
            // Now reinitialize everything
            await init();
            setupBlockingRules();
            blockedUrls.clear();
            
            // Re-evaluate all open tabs if enabled
            if (isEnabled) {
              logInfo('Re-evaluating all tabs with fresh rules from sync');
              checkAllTabs();
            }
              // Send a follow-up message with the results
            chrome.runtime.sendMessage({
              type: 'syncRulesUpdated',
              data: {
                success: true,
                blacklistCount: safeSyncData.blacklist.length,
                whitelistCount: safeSyncData.whitelist.length,
                timestamp: Date.now()
              }
            }).catch(() => {
              // Ignore errors if the message port is closed
            });
          } catch (error) {
            logError('Error updating rules from sync:', error);
            
            // Send error message
            chrome.runtime.sendMessage({
              type: 'syncRulesUpdateFailed',
              error: error.message
            }).catch(() => {
              // Ignore errors if the message port is closed  
            });
          }
        })();
        break;
        
      case 'forcePullFromSync':
        // Directly force pull from sync storage (more robust than updateRules)
        logInfo('Direct force pull from sync storage requested');
        
        // Set immediate response and do work asynchronously
        response = { success: true, message: 'Force pull started' };
        
        (async function() {
          try {
            // Call the force pull function and get the result
            const pullResult = await forcePullFromSyncStorage();
            
            // Send the result back to the requester
            chrome.runtime.sendMessage({
              type: 'forcePullComplete',
              data: {
                success: pullResult,
                blacklistCount: blacklist.length,
                whitelistCount: whitelist.length,
                timestamp: Date.now()
              }
            }).catch(() => {
              // Ignore errors if the message port is closed
            });
          } catch (error) {
            logError('Error force-pulling from sync:', error);
            
            // Send error message
            chrome.runtime.sendMessage({
              type: 'forcePullFailed',
              error: error.message
            }).catch(() => {
              // Ignore errors if the message port is closed
            });
          }
        })();
        break;
        
      case 'diagnoseSyncStatus':
        // Run detailed sync diagnostics
        logInfo('Detailed sync diagnostics requested');
        
        // Set immediate response
        response = { success: true, message: 'Sync diagnostics started' };
        
        // Do the work asynchronously
        (async function() {
          try {
            // Run the diagnostics if the function exists
            if (typeof self.diagnoseSyncStatus === 'function') {
              await self.diagnoseSyncStatus();
              
              // Try to get quota info for the response
              const quotaInfo = await self.getSyncStorageQuota();
              
              // Send the result back
              chrome.runtime.sendMessage({
                type: 'syncDiagnosticsComplete',
                data: {
                  quota: quotaInfo,
                  extensionId: chrome.runtime.id,
                  version: chrome.runtime.getManifest().version,
                  blacklistCount: blacklist.length,
                  whitelistCount: whitelist.length,
                  timestamp: Date.now()
                }
              }).catch(() => {
                // Ignore errors if the message port is closed
              });
            } else {
              logWarning('diagnoseSyncStatus function not available');
            }
          } catch (error) {
            logError('Error running sync diagnostics:', error);
          }
        })();
        break;
          case 'getSyncDiagnostics':
        // Get detailed sync diagnostics
        logInfo('Sync diagnostics requested');
        try {
          if (typeof self.getSyncStorageQuota === 'function') {
            self.getSyncStorageQuota().then(quotaInfo => {
              // Send the quota info back to the requester
              chrome.runtime.sendMessage({
                type: 'syncDiagnosticsResult',
                data: {
                  quota: quotaInfo,
                  extensionId: chrome.runtime.id,
                  version: chrome.runtime.getManifest().version,
                  timestamp: Date.now(),
                  syncStatus: 'active',
                  settings: {
                    blacklistCount: blacklist.length, 
                    whitelistCount: whitelist.length,
                    mode: mode
                  }
                }
              }).catch(() => {
                // Ignore errors if the message port is closed
                console.log('Failed to send sync diagnostics result - port closed');
              });
            }).catch(error => {
              console.error('Error getting sync storage quota:', error);
            });
          }
          response = { 
            success: true, 
            message: 'Sync diagnostics started',
            extensionId: chrome.runtime.id
          };
        } catch (error) {
          console.error('Error in sync diagnostics:', error);
          response = { success: false, error: error.message };        }
        break;
          // Debug handlers for real-time debugging
      case 'reinitialize':
        logInfo('Force reinitialize requested');
        // Run init asynchronously and respond immediately
        init().then(() => {
          logInfo('Service worker reinitialized successfully');
        }).catch((error) => {
          logError('Error during forced reinitialize:', error);
        });
        response = { success: true, message: 'Service worker reinitialize started' };
        break;
        
      case 'testUrl':
        if (request.url && request.blacklist && request.whitelist) {
          logInfo(`Testing URL: ${request.url}`);
          
          // Temporarily use the provided arrays for testing
          const originalBlacklist = blacklist;
          const originalWhitelist = whitelist;
          const originalBlacklistKeywords = blacklistKeywords;
          const originalWhitelistKeywords = whitelistKeywords;
          
          try {
            // Set test arrays
            blacklist = request.blacklist;
            whitelist = request.whitelist;
            blacklistKeywords = request.blacklistKeywords || [];
            whitelistKeywords = request.whitelistKeywords || [];
              // Test the URL using the pattern function
            const shouldBlock = self.checkUrlShouldBeBlocked(request.url, whitelist, blacklist);
            response = { 
              result: shouldBlock ? 'BLOCKED' : 'ALLOWED',
              url: request.url,
              blacklistCount: blacklist.length,
              whitelistCount: whitelist.length
            };
          } finally {
            // Restore original arrays
            blacklist = originalBlacklist;
            whitelist = originalWhitelist;
            blacklistKeywords = originalBlacklistKeywords;
            whitelistKeywords = originalWhitelistKeywords;
          }
        } else {
          response = { error: 'Missing required parameters: url, blacklist, whitelist' };
        }
        break;
        
      case 'getCurrentMemoryState':
        response = {
          blacklistCount: blacklist.length,
          whitelistCount: whitelist.length,
          blacklistKeywordsCount: blacklistKeywords.length,
          whitelistKeywordsCount: whitelistKeywords.length,
          isEnabled: isEnabled,
          mode: mode,
          firstBlacklistItems: blacklist.slice(0, 3),
          firstWhitelistItems: whitelist.slice(0, 3)
        };
        break;
        
      default:
        console.log('Unknown message type:', request.message);
        response = null;
        break;
    }
    
    console.log('Sending response:', response);
    sendResponse({ response });
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
  
  return true; // Keep the message channel open for async responses
});

// Add a debug function to test pattern matching
function debugUrlMatching(url) {
  logInfo(`=== DEBUG MATCHING FOR URL: ${url} ===`);
  
  logInfo('Whitelist pattern matches:');
  for (const site of whitelist) {
    try {
      const pattern = typeof site === 'string' ? site : site.pattern || site.url;
      if (!pattern) continue;
      
      const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$$/g, ''));
      const isMatch = regexPattern.test(url);
      logInfo(`  Pattern: ${pattern} => ${isMatch ? 'MATCH' : 'no match'}`);
    } catch (e) {
      logError('Error debugging whitelist pattern:', e);
    }
  }
  
  logInfo('Whitelist keyword matches:');
  for (const keyword of whitelistKeywords) {
    try {
      const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
      if (!pattern) continue;
      
      const isMatch = url.toLowerCase().includes(pattern.toLowerCase());
      logInfo(`  Keyword: ${pattern} => ${isMatch ? 'MATCH' : 'no match'}`);
    } catch (e) {
      logError('Error debugging whitelist keyword:', e);
    }
  }
  
  logInfo('Blacklist pattern matches:');
  for (const site of blacklist) {
    try {
      const pattern = typeof site === 'string' ? site : site.pattern || site.url;
      if (!pattern) continue;
      
      const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$$/g, ''));
      const isMatch = regexPattern.test(url);
      logInfo(`  Pattern: ${pattern} => ${isMatch ? 'MATCH' : 'no match'}`);
    } catch (e) {
      logError('Error debugging blacklist pattern:', e);
    }
  }
  
  logInfo('Blacklist keyword matches:');
  for (const keyword of blacklistKeywords) {
    try {
      const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
      if (!pattern) continue;
      
      const isMatch = url.toLowerCase().includes(pattern.toLowerCase());
      logInfo(`  Keyword: ${pattern} => ${isMatch ? 'MATCH' : 'no match'}`);
    } catch (e) {
      logError('Error debugging blacklist keyword:', e);
    }
  }
    const result = checkUrlShouldBeBlockedLocal(url);
  logInfo(`Final result: ${result ? 'BLOCKED' : 'ALLOWED'}`);
  return result;
}

// Add a testing function for pattern matching
function testWhitelistPatternMatching() {
  const testCases = [
    { 
      pattern: 'https://www.example.com/', 
      shouldMatch: ['https://www.example.com/', 'https://www.example.com/home'], 
      shouldNotMatch: ['https://www.example.com/restricted/', 'https://www.example.com/restricted/content']
    },
    { 
      pattern: 'https://www.example.com/allowed/*', 
      shouldMatch: ['https://www.example.com/allowed/', 'https://www.example.com/allowed/page/123'],
      shouldNotMatch: ['https://www.example.com/restricted/']
    },
    {
      pattern: 'https://www.example.com',
      shouldMatch: ['https://www.example.com'],
      shouldNotMatch: ['https://www.example.com/', 'https://www.example.com/anything']
    },
    {
      pattern: 'example.com', 
      shouldMatch: ['https://example.com', 'https://www.example.com', 'http://sub.example.com'],
      shouldNotMatch: ['https://notexample.com', 'https://example.company.com']
    },
    {
      pattern: '*.example.com/*', 
      shouldMatch: ['https://sub.example.com/page', 'https://www.example.com/anything'],
      shouldNotMatch: ['https://notexample.com/test']
    }
  ];
  
  console.log('===== WHITELIST PATTERN MATCHING TEST =====');
  
  testCases.forEach(testCase => {
    console.log(`\nTesting pattern: ${testCase.pattern}`);
    const regex = wildcardToRegExp(testCase.pattern);
    console.log(`Compiled regex: ${regex}`);
    
    testCase.shouldMatch.forEach(url => {
      const matches = regex.test(url);
      console.log(`${url} - ${matches ? '✓ MATCH (CORRECT)' : '✗ NO MATCH (ERROR)'}`);
    });
    
    testCase.shouldNotMatch.forEach(url => {
      const matches = regex.test(url);
      console.log(`${url} - ${!matches ? '✓ NO MATCH (CORRECT)' : '✗ MATCH (ERROR)'}`);
    });
  });
  
  console.log('\n=========================================');
}

// Add a utility function to test URL normalization and pattern matching
function testUrlMatching() {
  const urls = [
    'https://example.com/',
    'https://sub.example.com/',
    'https://example.com/path/to/page',
    'https://www.testsite.org/category/page',
    'https://subdomain.testsite.org/category/page'
  ];
    console.log('===== URL MATCHING TEST =====');
  urls.forEach(url => {
    const normalized = normalizeUrl(url);
    const isBlocked = checkUrlShouldBeBlockedLocal(normalized);
    console.log(`Original: ${url}`);
    console.log(`Normalized: ${normalized}`);
    console.log(`Blocked: ${isBlocked ? 'YES' : 'NO'}`);
    console.log('-----------');
  });
}

// Add a function to get the current settings for the UI
function getCurrentSettings() {
  return {
    isEnabled,
    mode,
    blacklist,
    whitelist,
    blacklistKeywords,
    whitelistKeywords
  };
}

// Function to test if URL patterns match correctly
function testUrlMatching(url, pattern) {
  const regex = wildcardToRegExp(pattern);
  const isMatch = regex.test(url);
  console.log(`Testing if '${url}' matches pattern '${pattern}': ${isMatch ? 'YES' : 'NO'}`);
  console.log(`Regex used: ${regex.toString()}`);
  return isMatch;
}

// Test function for problematic domains
function testProblemDomains() {
  console.log("=== DOMAIN MATCHING TEST ===");
  
  // Test IPTORRENTS.COM
  testUrlMatching("https://iptorrents.com/some/path", "iptorrents.com");
  testUrlMatching("https://www.iptorrents.com", "iptorrents.com");
  testUrlMatching("https://sub.iptorrents.com/page", "iptorrents.com");
  testUrlMatching("http://iptorrents.com", "iptorrents.com");
  testUrlMatching("https://iptorrents.comextra.com", "iptorrents.com"); // Should NOT match
  
  // Test wildcard domains
  testUrlMatching("https://test.example.com", "*.example.com");
  testUrlMatching("https://example.com", "*.example.com"); // Should NOT match
  testUrlMatching("https://a.b.example.com", "*.example.com");
  
  // Test case sensitivity
  testUrlMatching("https://IPTORRENTS.COM", "iptorrents.com");
  testUrlMatching("https://iptorrents.com", "IPTORRENTS.COM");
  
  console.log("=== TEST COMPLETE ===");
}

// Initialize on install or update
chrome.runtime.onInstalled.addListener(details => {
  console.log('Extension installed or updated:', details.reason);
  
  // Set the initial install flag
  isInitialInstall = details.reason === 'install';
  
  // Store install time for fresh install detection
  if (details.reason === 'install') {
    chrome.storage.local.set({ installTime: Date.now() });
  }
  
  // Log the reason and extension ID
  logInfo(`Extension ${details.reason}: ID=${chrome.runtime.id}, initial install=${isInitialInstall}`);
  
  // Extra diagnostics
  if (typeof self.diagnoseSyncStatus === 'function') {
    self.diagnoseSyncStatus();
  }
  
  // First init
  init().then(() => {
    logInfo('Initial initialization complete, waiting for sync to stabilize...');
    
    // If it's a fresh install, we need special handling to make sure we don't overwrite cloud data
    if (isInitialInstall) {
      // Check for existing data in sync storage first before doing anything
      logInfo('Fresh install detected. Checking for existing sync data...');
      
      // Create a sync check function that's more aggressive
      const checkSyncStorage = async (attempt = 1) => {
        try {          logInfo(`Sync check attempt #${attempt} - Reading sync storage directly`);
          
          // Get all sync data using key names array (not defaults object)
          const syncData = await new Promise((resolve, reject) => {
            chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords'], (result) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message || 'Storage error'));
              } else {
                resolve(result || {});
              }
            });
          });
          
          // Ensure we have the data object before accessing properties
          if (!syncData || typeof syncData !== 'object') {
            throw new Error(`Sync storage returned invalid data: ${typeof syncData}`);
          }
          
          // Count items
          const blacklistCount = Array.isArray(syncData.blacklist) ? syncData.blacklist.length : 0;
          const whitelistCount = Array.isArray(syncData.whitelist) ? syncData.whitelist.length : 0;
          
          logInfo(`Sync data check result: ${blacklistCount} deny, ${whitelistCount} allow items`);
          
          // If we found existing data in sync storage, use it
          const hasData = (blacklistCount > 0 || whitelistCount > 0);
          if (hasData) {
            logInfo('FOUND EXISTING SYNC DATA! Updating local storage with cloud data...');
            
            // Create a safe version of the sync data
            const safeData = {
              blacklist: Array.isArray(syncData.blacklist) ? syncData.blacklist : [],
              whitelist: Array.isArray(syncData.whitelist) ? syncData.whitelist : [],
              blacklistKeywords: Array.isArray(syncData.blacklistKeywords) ? syncData.blacklistKeywords : [],
              whitelistKeywords: Array.isArray(syncData.whitelistKeywords) ? syncData.whitelistKeywords : []
            };
            
            // Update local storage with sync data
            await chrome.storage.local.set(safeData);
            
            // Update memory variables too
            blacklist = safeData.blacklist;
            whitelist = safeData.whitelist;
            blacklistKeywords = safeData.blacklistKeywords;
            whitelistKeywords = safeData.whitelistKeywords;
            
            // Update rules based on the sync data
            setupBlockingRules();
            
            logInfo('Successfully updated local state with existing sync data');
            return true;
          } 
          
          // If we didn't find data and this is not the final attempt, try again later
          if (attempt < 6) {
            logInfo(`No sync data found yet (attempt ${attempt}/6). Will try again in 10 seconds...`);
            return false;
          }
          
          // This is the final attempt and no data was found
          logInfo('Final attempt complete. No existing sync data found. Proceeding with fresh install.');
          return false;
        } catch (error) {
          logError(`Error in sync check attempt #${attempt}:`, error);
          return false;
        }
      };
      
      // Immediate check
      checkSyncStorage(1).then(foundData => {
        if (!foundData) {
          // Schedule additional sync checks with increasing delays
          // This gives Chrome sync time to retrieve cloud data
          const delaysInSeconds = [10, 20, 30, 45, 60]; // Progressive backoff
          
          delaysInSeconds.forEach((seconds, index) => {
            setTimeout(() => {
              checkSyncStorage(index + 2); // Start from attempt 2
            }, seconds * 1000);
          });
        }
      });
      
      // Clear initial install flag after 2 minutes to allow normal operation
      setTimeout(() => {
        isInitialInstall = false;
        logInfo('Initial install phase completed, now allowing sync writes if needed');
      }, 120000); // 2 minutes
    }
  });
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started');
  isInitialInstall = false; // Not a fresh install on browser startup
  init();
  
  // Start periodic sync check
  setupPeriodicSyncCheck();
});

// Set up a periodic sync check to ensure rules are up-to-date
function setupPeriodicSyncCheck() {
  // Check sync every 5 minutes
  const SYNC_CHECK_INTERVAL = 5 * 60 * 1000;
  
  // Initial check after 1 minute
  setTimeout(checkSyncStatus, 60 * 1000);
  
  // Then check periodically
  setInterval(checkSyncStatus, SYNC_CHECK_INTERVAL);
  
  logInfo('Periodic sync check scheduled');
}

// Function to check sync status and update rules if needed
async function checkSyncStatus() {
  logInfo('Performing periodic sync check');
  
  try {
    // Get current rules from sync storage using Promise-wrapped callback
    const syncData = await new Promise((resolve, reject) => {
      chrome.storage.sync.get(['blacklist', 'whitelist', 'blacklistKeywords', 'whitelistKeywords', 'mode'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Storage error'));
        } else {
          resolve(result || {});
        }
      });
    });
    
    // Ensure we have valid data before accessing properties
    if (!syncData || typeof syncData !== 'object') {
      logError('Sync data is invalid:', syncData);
      return;
    }
    
    // Check if they differ from in-memory rules
    let needsUpdate = false;
    
    if (syncData.mode !== undefined && syncData.mode !== mode) {
      logInfo('Mode changed in sync storage, updating');
      needsUpdate = true;
    }
    
    // Check if deny list length changed or contents changed
    const syncBlacklist = Array.isArray(syncData.blacklist) ? syncData.blacklist : [];
    if (syncBlacklist.length !== blacklist.length) {
      logInfo('Deny list length changed in sync storage, updating');
      needsUpdate = true;
    } else {      // Check if the contents are different
      for (let i = 0; i < syncBlacklist.length; i++) {
        if (syncBlacklist[i] !== blacklist[i]) {
          logInfo('Deny list content changed in sync storage, updating');
          needsUpdate = true;
          break;
        }
      }
    }
    
    // Similarly for allow list
    const syncWhitelist = Array.isArray(syncData.whitelist) ? syncData.whitelist : [];
    if (!needsUpdate && syncWhitelist.length !== whitelist.length) {
      logInfo('Allow list length changed in sync storage, updating');
      needsUpdate = true;
    }
    
    // Update if needed
    if (needsUpdate) {
      logInfo('Updating rules from sync storage');
      
      // Update in-memory values
      blacklist = syncBlacklist;
      whitelist = syncWhitelist;
      blacklistKeywords = Array.isArray(syncData.blacklistKeywords) ? syncData.blacklistKeywords : [];
      whitelistKeywords = Array.isArray(syncData.whitelistKeywords) ? syncData.whitelistKeywords : [];
      if (syncData.mode) {
        mode = syncData.mode;
      }
      
      // Update rules
      setupBlockingRules();
      
      // Clear cache
      blockedUrls.clear();
    } else {
      logInfo('No changes detected in sync storage');
    }
  } catch (error) {
    logError('Error checking sync status:', error);
  }
}

// Initialize immediately
init();

// Improve the extension's unload handling
chrome.runtime.onSuspend.addListener(() => {
  try {
    logInfo('Extension unloading - restoring blocked tabs');
    
    // Store original state so we don't need to change it in storage
    const originalEnabledState = isEnabled;
    
    // Set to disabled temporarily to use unblocking logic
    isEnabled = false;
    
    // Check all tabs to unblock
    chrome.tabs.query({}).then((tabs) => {
      if (tabs.length > 0) {
        const indexUrl = chrome.runtime.getURL('index.html');
        
        // Use Promise.all for better concurrency
        Promise.all(tabs.map(tab => {
          // Check if this is a blocked page
          if (tab.url && (
              tab.url.includes(`${indexUrl}#blocked?url=`) || 
              tab.url.includes(`${indexUrl}#/blocked?url=`)
            )) {
            try {
              // Extract the original URL that was blocked - handle both formats
              let hash = new URL(tab.url).hash;
              if (hash.startsWith('#/')) {
                hash = hash.substring(2); // Remove the #/ prefix
              } else if (hash.startsWith('#')) {
                hash = hash.substring(1); // Remove the # prefix
              }
              
              const originalUrl = hash.split('url=')[1]?.split('&')[0];
              
              if (originalUrl) {
                const decodedUrl = decodeURIComponent(originalUrl);
                logInfo(`Unblocking tab on unload: ${decodedUrl}`);
                return chrome.tabs.update(tab.id, { url: decodedUrl }).catch(e => {
                  logError(`Failed to unblock tab ${tab.id}:`, e);
                });
              }
            } catch (e) {
              logError('Error extracting URL from blocked page:', e);
            }
          }
          return Promise.resolve(); // Return resolved promise for tabs that don't need unblocking
        })).catch(error => {
          logError('Error during unblock process:', error);
        });
      }
    }).catch(error => {
      logError('Error querying tabs during unload:', error);
    });

    // No need to restore isEnabled state since the service worker is being unloaded
  } catch (error) {
    logError('Error during extension unload handler:', error);
  }
});

// Add a function to safely run debug functions
function safeDebugFunction(fn, ...args) {
  if (ENABLE_DEEP_DEBUGGING) {
    return fn(...args);
  }
  logInfo('Debug function skipped - debugging disabled');
  return null;
}

// Add a more robust setMode function that ensures proper sync
function setMode(newMode) {
  mode = newMode;
  
  // Try to sync first
  chrome.storage.sync.set({ mode }).then(() => {
    logInfo('Mode successfully saved to sync storage');
  }).catch(error => {
    logError('Failed to save mode to sync storage, falling back to local:', error);
    chrome.storage.local.set({ mode }).then(() => {
      logInfo('Mode saved to local storage (fallback)');
    }).catch(localError => {
      logError('Failed to save mode to local storage:', localError);
    });
  });
  
  return true;
}

// Call this function to manually test domain matching in the browser console
// testProblemDomains();

// Utility function for testing URL matching
function testUrlMatch(url, pattern) {
  const regex = wildcardToRegExp(pattern);
  const isMatch = regex.test(url);
  console.log(`Testing URL: ${url} against pattern: ${pattern}`);
  console.log(`Regex: ${regex}`);
  console.log(`Result: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
  
  // Try also with hostname extraction
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const hostnameMatch = regex.test(hostname);
    console.log(`Hostname: ${hostname}`);
    console.log(`Hostname match: ${hostnameMatch ? 'MATCH' : 'NO MATCH'}`);
  } catch (e) {
    console.log(`URL parsing failed: ${e.message}`);
  }
  
  return isMatch;
}

// Debug function to test domain matching
function testDomainMatching() {
  console.log("=== TESTING DOMAIN MATCHING ===");
  
  // Test with iptorrents.com
  testUrlMatch("https://iptorrents.com/t", "iptorrents.com");
  testUrlMatch("https://iptorrents.com/t?p=8#torrents", "iptorrents.com");
  testUrlMatch("https://www.iptorrents.com/t", "iptorrents.com");
  
  // Test with wildcards
  testUrlMatch("https://sub.example.com/page", "*.example.com");
  testUrlMatch("https://example.com/page", "*.example.com");
  
  // Test with uppercase/lowercase
  testUrlMatch("https://IPTORRENTS.COM/t", "iptorrents.com");
  
  console.log("=== END TESTING ===");
}
