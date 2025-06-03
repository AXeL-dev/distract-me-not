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
        // Use sync storage for lists
        chrome.storage.sync.set({ blacklist }).catch(error => {
          logError('Failed to save to sync storage, falling back to local:', error);
          chrome.storage.local.set({ blacklist });
        });
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
        whitelist = request.params[0];
        // Use sync storage for lists
        chrome.storage.sync.set({ whitelist }).catch(error => {
          logError('Failed to save to sync storage, falling back to local:', error);
          chrome.storage.local.set({ whitelist });
        });
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
          response = checkUrlShouldBeBlocked(request.params[0]);
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
        
      case 'testRedditNormalization':
        response = safeDebugFunction(testRedditNormalization);
        break;
        
      case 'getCurrentSettings':
        response = getCurrentSettings();
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
  
  const result = checkUrlShouldBeBlocked(url);
  logInfo(`Final result: ${result ? 'BLOCKED' : 'ALLOWED'}`);
  return result;
}

// Add a testing function specifically for whitelist pattern matching
function testWhitelistPatternMatching() {
  const testCases = [
    { 
      pattern: 'https://www.reddit.com/', 
      shouldMatch: ['https://www.reddit.com/', 'https://www.reddit.com/home'], 
      shouldNotMatch: ['https://www.reddit.com/r/redheads/', 'https://www.reddit.com/r/pics']
    },
    { 
      pattern: 'https://www.reddit.com/r/learnart/*', 
      shouldMatch: ['https://www.reddit.com/r/learnart/', 'https://www.reddit.com/r/learnart/comments/123'],
      shouldNotMatch: ['https://www.reddit.com/r/redheads/']
    },
    {
      pattern: 'https://www.reddit.com',
      shouldMatch: ['https://www.reddit.com'],
      shouldNotMatch: ['https://www.reddit.com/', 'https://www.reddit.com/r/anything']
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

// Add a utility function to manually test reddit URLs
function testRedditNormalization() {
  const urls = [
    'https://reddit.com/',
    'https://reddit.com',
    'https://www.reddit.com/',
    'https://www.reddit.com',
    'http://reddit.com/',
    'https://reddit.com/r/popular/',
    'https://www.reddit.com/r/redheads/'
  ];
  
  console.log('===== REDDIT URL NORMALIZATION TEST =====');
  urls.forEach(url => {
    const normalized = normalizeUrl(url);
    const isBlocked = checkUrlShouldBeBlocked(normalized);
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