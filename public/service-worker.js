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

// Define the wildcardToRegExp function needed for URL pattern matching
function wildcardToRegExp(pattern) {
  // First, normalize pattern to lowercase for case-insensitive matching
  // We'll still use the 'i' flag, but this helps with pre-processing
  pattern = pattern.toLowerCase().trim();
  
  // Detect if this is likely a domain-only pattern (no protocol, no path)
  const isDomainOnly = !pattern.includes('://') && !pattern.includes('/');
  
  // Handle domain-only patterns specially
  if (isDomainOnly) {
    // First, escape any regex special characters
    const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    
    // Replace wildcards with appropriate regex
    const regexPattern = escaped.replace(/\*/g, '.*');
    
    // Special case for *.domain.com to match both domain.com and subdomains
    if (pattern.startsWith('*.')) {
      const domainPart = escaped.substring(2); // Remove *. prefix
      return new RegExp(`(^|\\.)${domainPart}$`, 'i');
    }
    
    // For domain-only patterns, make the regex match either the full domain
    // or as a subdomain suffix (e.g., "example.com" matches "example.com" and "sub.example.com")
    return new RegExp(`(^|\\.)${regexPattern}$`, 'i');
  }
  
  // For patterns with a specified path or protocol, do standard wildcard conversion
  const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  const regexPattern = escaped.replace(/\*/g, '.*');
  return new RegExp(`^${regexPattern}$`, 'i');
}

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
const defaultMode = 'denylist'; // Updated from 'blacklist'
const defaultIsEnabled = false;

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

// Enhanced initialization that checks all tabs
async function init() {
  try {
    logInfo('Initializing service worker...');
    
    // Settings that should sync between devices
    const syncSettings = {
      blacklist: [],
      whitelist: [],
      blacklistKeywords: [],
      whitelistKeywords: [],
      mode: mode,
      framesType: defaultFramesType,
      message: '', 
      redirectUrl: '',
      schedule: { isEnabled: false, days: {} }
    };
    
    // Settings that should remain local to this device
    const localSettings = {
      isEnabled: isEnabled,
      password: {},
      timer: defaultTimerSettings,
      enableLogs: false,
      logsLength: 100
    };
    
    // Try to get synced settings first
    try {
      const items = await chrome.storage.sync.get(syncSettings);
      logInfo('Successfully retrieved sync settings', items);
      
      // Update local state with synced values
      blacklist = items.blacklist || [];
      whitelist = items.whitelist || [];
      blacklistKeywords = items.blacklistKeywords || [];
      whitelistKeywords = items.whitelistKeywords || [];
      mode = items.mode || defaultMode;
      framesType = items.framesType || defaultFramesType;
    } catch (error) {
      logError('Error retrieving from sync storage, falling back to local:', error);
      
      // Fall back to local storage for sync settings
      try {
        const localItems = await chrome.storage.local.get(syncSettings);
        logInfo('Retrieved sync settings from local storage fallback', localItems);
        
        // Update state with local fallback values
        blacklist = localItems.blacklist || [];
        whitelist = localItems.whitelist || [];
        blacklistKeywords = localItems.blacklistKeywords || [];
        whitelistKeywords = localItems.whitelistKeywords || [];
        mode = localItems.mode || defaultMode;
        framesType = localItems.framesType || defaultFramesType;
      } catch (localError) {
        logError('Error retrieving from local storage fallback, using defaults:', localError);
      }
    }
    
    // Always get local settings from local storage
    try {
      const localItems = await chrome.storage.local.get(localSettings);
      logInfo('Retrieved local settings', localItems);
      
      // Update local state
      isEnabled = localItems.isEnabled ?? defaultIsEnabled;
      timerSettings = { ...defaultTimerSettings, ...localItems.timer };
      enableLogs = localItems.enableLogs ?? false;
    } catch (error) {
      logError('Error retrieving local settings, using defaults:', error);
    }
    
    // Log details of blacklist for debugging
    logInfo('Blacklist items:', blacklist.slice(0, 10)); // Show first 10 items
    logInfo('Blacklist keywords:', blacklistKeywords);
    
    // Setup navigation listener for URL blocking
    setupNavigationListener();
    
    // Check all open tabs against the current rules
    if (isEnabled) {
      logInfo('Checking all open tabs against blocking rules');
      checkAllTabs();
    }

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
    const blockDetails = checkUrlShouldBeBlocked(normalizedUrl);
    redirectToBlockedPage(tabId, url, blockDetails.reason || "Cached block");
    return;
  }

  // Only proceed if extension is enabled
  if (!isEnabled) {
    logInfo(`Extension disabled, allowing URL: ${url} (source: ${source})`);
    return;
  }
  
  // Check if URL should be blocked
  const blockDetails = checkUrlShouldBeBlocked(normalizedUrl);
  
  if (blockDetails.blocked) {
    logInfo(`BLOCKING URL: ${normalizedUrl} (source: ${source}), Reason: ${blockDetails.reason}`);
    blockedUrls.add(url); // Cache original URL
    blockedUrls.add(normalizedUrl); // Cache normalized URL
    redirectToBlockedPage(tabId, url, blockDetails.reason);
  } else {
    logInfo(`ALLOWING URL: ${normalizedUrl} (source: ${source}), Reason: ${blockDetails.reason}`);
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
    }

    // Check if URL should be blocked
    const blockDetails = checkUrlShouldBeBlocked(details.url); // Returns { blocked, reason }

    if (blockDetails.blocked) { // Corrected condition to check blockDetails.blocked
      // Block the navigation by redirecting to the blocked page
      logInfo(`BLOCKING navigation to: ${details.url}, Reason: ${blockDetails.reason} (via navigationHandler)`);
      redirectToBlockedPage(details.tabId, details.url, blockDetails.reason); // Use redirectToBlockedPage to include reason
    } else {
      logInfo(`ALLOWING navigation to: ${details.url}, Reason: ${blockDetails.reason} (via navigationHandler)`);
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
function redirectToBlockedPage(tabId, url, reason) {
  const indexUrl = chrome.runtime.getURL('index.html');
  const encodedUrl = encodeURIComponent(url);
  // Safeguard: if reason is empty or falsy, provide a default.
  const effectiveReason = reason || "Unknown reason for block";
  const encodedReason = encodeURIComponent(effectiveReason);
  chrome.tabs.update(tabId, {
    url: `${indexUrl}#/blocked?url=${encodedUrl}&reason=${encodedReason}`
  });
}

// Keep the URL normalization function for consistency
function normalizeUrl(url) {
  try {
    // Try to parse the URL
    const parsedUrl = new URL(url);
    
    // For reddit specifically, normalize the domain so all forms match the same pattern
    if (parsedUrl.hostname === 'reddit.com') {
      parsedUrl.hostname = 'www.reddit.com';
      return parsedUrl.toString();
    }
    
    return url;
  } catch (e) {
    // If parsing fails, return the original URL
    return url;
  }
}

// Fix checkUrlShouldBeBlocked to remove overly aggressive Reddit blocking
function checkUrlShouldBeBlocked(url) {
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
  
  // Step 1: Parse URL for hostname matching
  let hostname = "";
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname.toLowerCase();
    logInfo(`URL hostname: ${hostname}`);
  } catch (e) {
    // Not a valid URL, continue with normal checks
    logInfo(`URL parsing failed, will use full URL: ${e.message}`);
  }
    // Step 2: Check if URL is in allow list (should override deny list)
  let isWhitelisted = false; // isAllowed (kept for compatibility)
  let whitelistedBy = null; // allowedBy (kept for compatibility)
  
  // Check site patterns in allow list
  for (const site of whitelist) {
    try {
      const pattern = typeof site === 'string' ? site : site.pattern || site.url;
      if (!pattern) continue;
      
      const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$/g, ''));
      
      // Try to match both full URL and hostname (if available)
      if (regexPattern.test(url) || (hostname && regexPattern.test(hostname))) {        logInfo(`URL MATCHED allow list pattern: ${pattern} - allowing access`);
        isWhitelisted = true;
        whitelistedBy = `Allow List pattern: ${pattern}`;
        break;
      }
    } catch (e) {
      logError('Error checking whitelist pattern:', e);
    }
  }
  
  // Check keywords in whitelist
  if (!isWhitelisted) {
    for (const keyword of whitelistKeywords) {
      try {
        const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
        if (!pattern) continue;
        
        if (url.toLowerCase().includes(pattern.toLowerCase()) || 
            (hostname && hostname.toLowerCase().includes(pattern.toLowerCase()))) {
          logInfo(`URL MATCHED whitelist keyword: ${pattern} - allowing access`);
          isWhitelisted = true;
          whitelistedBy = `Whitelist keyword: ${pattern}`;
          break; 
        }
      } catch (e) {
        logError('Error checking whitelist keyword:', e);
      }
    }
  }    // If URL is explicitly in allow list, always allow regardless of mode or deny list
  if (isWhitelisted) {
    return { blocked: false, reason: whitelistedBy };
  }
  
  // Step 3: In allow list mode, block everything not in allow list
  if (mode === 'whitelist' || mode === 'allowlist') {
    logInfo(`URL not in allow list: ${url} - blocking access`);
    return { blocked: true, reason: "URL not on Allow List (Allow List Mode)" }; 
  }
  
  // Step 4: In deny list or combined modes, check against deny list
  if (mode === 'blacklist' || mode === 'denylist' || mode === 'combined') {
    // Try direct hostname match first (more reliable)
    if (hostname) {
      for (const site of blacklist) {
        try {
          const pattern = typeof site === 'string' ? site : site.pattern || site.url;
          if (!pattern) continue;
          
          const patternLower = pattern.toLowerCase().trim();
          
          // Direct domain comparison (very reliable)
          if (hostname === patternLower || hostname.endsWith('.' + patternLower)) {
            if (mode === 'combined' && isWhitelisted) {
              logInfo(`Hostname '${hostname}' directly matched blacklist domain: ${pattern}, but was whitelisted by: ${whitelistedBy} - allowing access`);
              return { blocked: false, reason: whitelistedBy };
            }
            logInfo(`Hostname '${hostname}' directly matched blacklist domain: ${pattern} - blocking access`);
            return { blocked: true, reason: `Blacklist pattern: ${pattern}` };
          }
        } catch (e) {
          logError('Error checking blacklist pattern direct match:', e);
        }
      }
    }
    
    // Check site patterns in blacklist using regex
    for (const site of blacklist) {
      try {
        const pattern = typeof site === 'string' ? site : site.pattern || site.url;
        if (!pattern) continue;
        
        const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$/g, ''));
        
        // Try to match both full URL and hostname
        if (regexPattern.test(url) || (hostname && regexPattern.test(hostname))) {
          if (mode === 'combined' && isWhitelisted) {
            logInfo(`URL MATCHED blacklist pattern: ${pattern}, but was whitelisted by: ${whitelistedBy} - allowing access`);
            return { blocked: false, reason: whitelistedBy };
          }
          logInfo(`URL MATCHED blacklist pattern: ${pattern} - blocking access`);
          return { blocked: true, reason: `Blacklist pattern: ${pattern}` };
        }
      } catch (e) {
        logError('Error checking blacklist pattern:', e);
      }
    }
    
    // Check keywords in blacklist
    for (const keyword of blacklistKeywords) {
      try {
        const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
        if (!pattern) continue;
        
        const normalizedPattern = pattern.toLowerCase();
        const normalizedUrl = url.toLowerCase();
        
        if (normalizedUrl.includes(normalizedPattern) || 
            (hostname && hostname.includes(normalizedPattern))) {
          if (mode === 'combined' && isWhitelisted) {
            logInfo(`URL MATCHED blacklist keyword: ${pattern}, but was whitelisted by: ${whitelistedBy} - allowing access`);
            return { blocked: false, reason: whitelistedBy };
          }
          logInfo(`URL MATCHED blacklist keyword: ${pattern} - blocking access`);
          return { blocked: true, reason: `Blacklist keyword: ${pattern}` };
        }
      } catch (e) {
        logError('Error checking blacklist keyword:', e);
      }
    }
  }
  
  // If we reach here, allow the URL
  logInfo(`URL didn't match any blocking rules: ${url} - allowing access`);
  return { blocked: false, reason: "URL allowed by default (no matching rules)" };
}

// Replace the checkUrlAgainstRules function with a call to our more comprehensive function
function checkUrlAgainstRules(url) {
  logInfo(`Checking URL against rules: ${url}`);
  const shouldBlock = checkUrlShouldBeBlocked(url);
  if (shouldBlock) {
    logInfo(`URL should be BLOCKED: ${url}`);
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

// Initialize on install or update
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed or updated');
  init();
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started');
  init();
});

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