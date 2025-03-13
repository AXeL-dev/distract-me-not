/**
 * Distract-Me-Not Service Worker
 * 
 * This service worker provides URL blocking functionality through three main mechanisms:
 * 1. webNavigation API - Captures address bar navigations
 * 2. tabs.onUpdated - Captures page loads and in-page navigations
 * 3. (When available) webRequest API - Extra coverage for link clicks
 * 
 * URLs are matched against blacklist/whitelist patterns using regex-converted wildcards.
 * URLs that should be blocked are redirected to a blocking page.
 */

// Enhanced service worker with core blocking functionality

console.log('Enhanced service worker starting...');

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

// Basic state
let isEnabled = false;
let mode = 'blacklist'; // Default mode: blacklist
let blacklist = [];
let whitelist = [];
let blacklistKeywords = [];
let whitelistKeywords = [];
let timerSettings = defaultTimerSettings;

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
    
    // Get settings from storage
    // Note: We're still using chrome.storage.local directly here because we don't have
    // access to the syncStorage helper in the service worker. The sync functionality
    // will be handled by the UI components that save settings.
    const items = await chrome.storage.sync.get({
      blacklist: [],
      whitelist: [],
      blacklistKeywords: [],
      whitelistKeywords: [],
      mode: mode
    }).catch(error => {
      logError('Error retrieving from sync storage, falling back to local:', error);
      return chrome.storage.local.get({
        blacklist: [],
        whitelist: [],
        blacklistKeywords: [],
        whitelistKeywords: [],
        mode: mode
      });
    });
    
    // Local-only settings
    const localItems = await chrome.storage.local.get({
      isEnabled: isEnabled
    });
    
    // Update local state
    blacklist = items.blacklist;
    whitelist = items.whitelist;
    blacklistKeywords = items.blacklistKeywords;
    whitelistKeywords = items.whitelistKeywords;
    isEnabled = localItems.isEnabled;
    mode = items.mode;
    
    logInfo('Extension configuration:', {
      mode,
      isEnabled,
      blacklistCount: blacklist.length,
      whitelistCount: whitelist.length,
      blacklistKeywordsCount: blacklistKeywords.length,
      whitelistKeywordsCount: whitelistKeywords.length
    });
    
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
    return false;
  }
  
  // Normalize the URL for consistency
  const normalizedUrl = normalizeUrl(url);
  
  // First check our blocked URLs cache for quick rejection
  if (blockedUrls.has(url) || blockedUrls.has(normalizedUrl)) {
    logInfo(`URL found in blocked cache - blocking: ${url} [${source}]`);
    redirectToBlockedPage(tabId, url);
    return true; // Signal to cancel the request if applicable
  }

  // Only proceed if extension is enabled
  if (!isEnabled) {
    logInfo(`Extension disabled, allowing: ${url} [${source}]`);
    return false;
  }
  
  // Check if URL should be blocked
  const shouldBlock = checkUrlShouldBeBlocked(normalizedUrl);
  
  if (shouldBlock) {
    // Add both original and normalized URLs to blocked cache
    blockedUrls.add(url);
    blockedUrls.add(normalizedUrl);
    
    // Block the navigation by redirecting to the blocked page
    logInfo(`BLOCKING navigation to: ${url} [${source}]`);
    redirectToBlockedPage(tabId, url);
    return true; // Signal to cancel the request if applicable
  } else {
    logInfo(`ALLOWING navigation to: ${url} [${source}]`);
    return false;
  }
}

// Update the existing navigation handler to use the central handler
function navigationHandler(details) {
  if (details.frameId === 0) { // Only block main frame navigations
    logInfo(`Navigation attempt to: ${details.url} [webNavigation.onBeforeNavigate]`);
    handleUrl(details.url, details.tabId, 'webNavigation.onBeforeNavigate');
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
function redirectToBlockedPage(tabId, url) {
  const indexUrl = chrome.runtime.getURL('index.html');
  chrome.tabs.update(tabId, {
    url: `${indexUrl}#/blocked?url=${encodeURIComponent(url)}`
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
  // If not enabled, don't block anything
  if (!isEnabled) {
    return false;
  }

  logInfo(`Checking URL against rules: ${url}`);
  
  // Step 1: Check if URL is whitelisted (should override blacklist)
  let isWhitelisted = false;
  
  // Check site patterns in whitelist
  for (const site of whitelist) {
    try {
      const pattern = typeof site === 'string' ? site : site.pattern || site.url;
      if (!pattern) continue;
      
      const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$$/g, ''));
      if (regexPattern.test(url)) {
        logInfo(`URL MATCHED whitelist pattern: ${pattern} - allowing access`);
        isWhitelisted = true;
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
        
        // For keywords, do a case-insensitive includes check
        if (url.toLowerCase().includes(pattern.toLowerCase())) {
          logInfo(`URL MATCHED whitelist keyword: ${pattern} - allowing access`);
          isWhitelisted = true;
          break;
        }
      } catch (e) {
        logError('Error checking whitelist keyword:', e);
      }
    }
  }
  
  // If URL is explicitly whitelisted, allow regardless of mode or blacklist
  if (isWhitelisted && (mode === 'whitelist' || mode === 'combined')) {
    return false;
  }
  
  // Step 2: In whitelist mode, block everything not whitelisted
  if (mode === 'whitelist') {
    logInfo(`URL not in whitelist: ${url} - blocking access`);
    return !isWhitelisted; // Block if not whitelisted
  }
  
  // Step 3: In blacklist or combined modes, check against blacklist
  if (mode === 'blacklist' || mode === 'combined') {
    // Check site patterns in blacklist
    for (const site of blacklist) {
      try {
        const pattern = typeof site === 'string' ? site : site.pattern || site.url;
        if (!pattern) continue;
        
        // Use improved regex pattern matching for wildcards
        const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$$/g, ''));
        if (regexPattern.test(url)) {
          // Block only if not already whitelisted
          if (mode === 'combined' && isWhitelisted) {
            logInfo(`URL MATCHED blacklist pattern: ${pattern} - but whitelisted, allowing access`);
            return false;
          }
          logInfo(`URL MATCHED blacklist pattern: ${pattern} - blocking access`);
          return true; // Block - URL is blacklisted
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
        
        // Case-insensitive keyword check
        if (url.toLowerCase().includes(pattern.toLowerCase())) {
          // Block only if not already whitelisted
          if (mode === 'combined' && isWhitelisted) {
            logInfo(`URL MATCHED blacklist keyword: ${pattern} - but whitelisted, allowing access`);
            return false;
          }
          logInfo(`URL MATCHED blacklist keyword: ${pattern} - blocking access`);
          return true; // Block - URL contains blacklisted keyword
        }
      } catch (e) {
        logError('Error checking blacklist keyword:', e);
      }
    }
  }
  
  // If we reach here, allow the URL
  logInfo(`URL didn't match any blocking rules: ${url} - allowing access`);
  return false;
}

// Function to get detailed diagnostic information about URL matching
function checkUrlShouldBeBlockedWithDetails(url) {
  const results = {
    url: url,
    mode: mode,
    isEnabled: isEnabled,
    whitelistMatches: [],
    blacklistMatches: [],
    whitelistKeywordMatches: [],
    blacklistKeywordMatches: [],
    regexConversions: [],
    finalDecision: null
  };
  
  // If not enabled, don't block anything
  if (!isEnabled) {
    results.finalDecision = 'ALLOWED - Extension disabled';
    return results;
  }
  
  // Check whitelist in combined or whitelist modes
  if (mode === 'whitelist' || mode === 'combined') {
    // Check site patterns in whitelist
    for (const site of whitelist) {
      try {
        const pattern = typeof site === 'string' ? site : site.pattern || site.url;
        if (!pattern) continue;
        
        const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$$/g, ''));
        results.regexConversions.push({
          original: pattern,
          regex: regexPattern.toString()
        });
        
        const isMatch = regexPattern.test(url);
        if (isMatch) {
          results.whitelistMatches.push(pattern);
          if (mode === 'whitelist' || mode === 'combined') {
            results.finalDecision = `ALLOWED - URL matched whitelist pattern: ${pattern}`;
            return results;
          }
        }
      } catch (e) {
        results.errors = results.errors || [];
        results.errors.push(`Error checking whitelist pattern: ${e.message}`);
      }
    }
    
    // Check keywords in whitelist
    for (const keyword of whitelistKeywords) {
      try {
        const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
        if (!pattern) continue;
        
        const isMatch = url.toLowerCase().includes(pattern.toLowerCase());
        if (isMatch) {
          results.whitelistKeywordMatches.push(pattern);
          if (mode === 'whitelist' || mode === 'combined') {
            results.finalDecision = `ALLOWED - URL matched whitelist keyword: ${pattern}`;
            return results;
          }
        }
      } catch (e) {
        results.errors = results.errors || [];
        results.errors.push(`Error checking whitelist keyword: ${e.message}`);
      }
    }
    
    // If we're in whitelist mode and didn't match any whitelist item, block the URL
    if (mode === 'whitelist') {
      results.finalDecision = 'BLOCKED - URL not in whitelist';
      return results;
    }
  }
  
  // Next, check blacklist in blacklist or combined modes
  if (mode === 'blacklist' || mode === 'combined') {
    // Check site patterns in blacklist
    for (const site of blacklist) {
      try {
        const pattern = typeof site === 'string' ? site : site.pattern || site.url;
        if (!pattern) continue;
        
        const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$$/g, ''));
        results.regexConversions.push({
          original: pattern,
          regex: regexPattern.toString()
        });
        
        const isMatch = regexPattern.test(url);
        if (isMatch) {
          results.blacklistMatches.push(pattern);
          results.finalDecision = `BLOCKED - URL matched blacklist pattern: ${pattern}`;
          return results;
        }
      } catch (e) {
        results.errors = results.errors || [];
        results.errors.push(`Error checking blacklist pattern: ${e.message}`);
      }
    }
    
    // Check keywords in blacklist
    for (const keyword of blacklistKeywords) {
      try {
        const pattern = typeof keyword === 'string' ? keyword : keyword.pattern || keyword;
        if (!pattern) continue;
        
        const lowercaseUrl = url.toLowerCase();
        const lowercasePattern = pattern.toLowerCase();
        const isMatch = lowercaseUrl.includes(lowercasePattern);
        if (isMatch) {
          results.blacklistKeywordMatches.push({
            pattern,
            matchIndex: lowercaseUrl.indexOf(lowercasePattern),
            urlFragment: url.substring(
              Math.max(0, lowercaseUrl.indexOf(lowercasePattern) - 10),
              Math.min(url.length, lowercaseUrl.indexOf(lowercasePattern) + pattern.length + 10)
            )
          });
          results.finalDecision = `BLOCKED - URL matched blacklist keyword: ${pattern}`;
          return results;
        }
      } catch (e) {
        results.errors = results.errors || [];
        results.errors.push(`Error checking blacklist keyword: ${e.message}`);
      }
    }
  }
  
  // If we reach here, allow the URL
  results.finalDecision = `ALLOWED - URL didn't match any blocking rules`;
  return results;
}

// Add an explicit testing function for known problematic URL
function testProblematicUrl(url = 'https://www.reddit.com/r/redheads/') {
  if (!ENABLE_DEEP_DEBUGGING) {
    logInfo('Debug testing disabled in production');
    return null;
  }
  
  console.log('====================================');
  console.log(`DETAILED DIAGNOSTIC FOR ${url}`);
  console.log('====================================');
  
  console.log('Current mode:', mode);
  console.log('Extension enabled:', isEnabled);
  console.log('Blacklist entries:', blacklist.length);
  console.log('Blacklist keywords:', blacklistKeywords);
  
  // Test wildcard matching
  const redditPattern = 'https://www.reddit.com/*';
  const redditRegex = wildcardToRegExp(redditPattern);
  console.log('Reddit pattern test:', {
    pattern: redditPattern,
    regex: redditRegex.toString(),
    isMatch: redditRegex.test(url)
  });
  
  // Test keyword matching
  const keywordPattern = 'redhead';
  const keywordMatch = url.toLowerCase().includes(keywordPattern.toLowerCase());
  console.log('Keyword test:', {
    keyword: keywordPattern,
    isMatch: keywordMatch,
    inUrl: url.toLowerCase(),
    indexOf: url.toLowerCase().indexOf(keywordPattern.toLowerCase())
  });
  
  // Get full detailed results
  const details = checkUrlShouldBeBlockedWithDetails(url);
  console.log('Detailed matching results:', details);
  
  // Final check
  const finalResult = checkUrlShouldBeBlocked(url);
  console.log('Final result:', finalResult ? 'BLOCKED' : 'ALLOWED');
  
  console.log('====================================');
  return details;
}

// Create a separate named function for the navigation handler
function navigationHandler(details) {
  if (details.frameId === 0) { // Only block main frame navigations
    logInfo(`Navigation attempt to: ${details.url}`);
    
    // Only check if extension is enabled
    if (!isEnabled) {
      logInfo('Extension disabled, allowing navigation');
      return;
    }
    
    // Check if URL should be blocked
    const shouldBlock = checkUrlShouldBeBlocked(details.url);
    
    if (shouldBlock) {
      // Block the navigation by redirecting to the blocked page
      logInfo(`BLOCKING navigation to: ${details.url}`);
      const indexUrl = chrome.runtime.getURL('index.html');
      chrome.tabs.update(details.tabId, {
        url: `${indexUrl}#blocked?url=${encodeURIComponent(details.url)}`
      });
    }
  }
}

// Improve the wildcardToRegExp function to handle exact matches properly

function wildcardToRegExp(pattern) {
  // First, determine if this is a pattern with wildcards
  const hasWildcard = pattern.includes('*');
  
  // For patterns without wildcards, we want to be more exact in matching
  if (!hasWildcard) {
    // Check if pattern is a base domain/path that should only match itself or direct children
    if (pattern.endsWith('/')) {
      // For patterns ending with slash like "example.com/", 
      // match the exact URL or direct children path segments (but not deeper paths)
      const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`^${escaped}(?:[^/]*)?$`, 'i');
    } else {
      // For exact patterns like "example.com/page", match only that exact URL
      const escaped = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`^${escaped}$`, 'i');
    }
  }
  
  // Handle patterns with wildcards (existing functionality)
  let regexPattern = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  regexPattern = regexPattern.replace(/\*/g, '.*');
  
  // For URL patterns with protocol, anchor to the start
  if (pattern.includes('://')) {
    return new RegExp(`^${regexPattern}`, 'i');
  } else {
    return new RegExp(regexPattern, 'i');
  }
}

// Clean implementation of checkUrlShouldBeBlocked without special cases
function checkUrlShouldBeBlocked(url) {
  // If not enabled, don't block anything
  if (!isEnabled) {
    return false;
  }
  
  logInfo(`Checking URL against rules: ${url}`);
  
  // Step 1: Check if URL is whitelisted (should override blacklist)
  let isWhitelisted = false;
  
  // Check site patterns in whitelist
  for (const site of whitelist) {
    try {
      const pattern = typeof site === 'string' ? site : site.pattern || site.url;
      if (!pattern) continue;
      
      const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$$/g, ''));
      if (regexPattern.test(url)) {
        logInfo(`URL MATCHED whitelist pattern: ${pattern} - allowing access`);
        isWhitelisted = true;
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
        
        // For keywords, do a case-insensitive includes check
        if (url.toLowerCase().includes(pattern.toLowerCase())) {
          logInfo(`URL MATCHED whitelist keyword: ${pattern} - allowing access`);
          isWhitelisted = true;
          break;
        }
      } catch (e) {
        logError('Error checking whitelist keyword:', e);
      }
    }
  }
  
  // If URL is explicitly whitelisted, allow regardless of mode or blacklist
  if (isWhitelisted && (mode === 'whitelist' || mode === 'combined')) {
    return false;
  }
  
  // Step 2: In whitelist mode, block everything not whitelisted
  if (mode === 'whitelist') {
    logInfo(`URL not in whitelist: ${url} - blocking access`);
    return !isWhitelisted; // Block if not whitelisted
  }
  
  // Step 3: In blacklist or combined modes, check against blacklist
  if (mode === 'blacklist' || mode === 'combined') {
    // Check site patterns in blacklist
    for (const site of blacklist) {
      try {
        const pattern = typeof site === 'string' ? site : site.pattern || site.url;
        if (!pattern) continue;
        
        // Use improved regex pattern matching for wildcards
        const regexPattern = wildcardToRegExp(pattern.replace(/^\^|\$$/g, ''));
        if (regexPattern.test(url)) {
          // Block only if not already whitelisted
          if (mode === 'combined' && isWhitelisted) {
            logInfo(`URL MATCHED blacklist pattern: ${pattern} - but whitelisted, allowing access`);
            return false;
          }
          logInfo(`URL MATCHED blacklist pattern: ${pattern} - blocking access`);
          return true; // Block - URL is blacklisted
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
        
        // Case-insensitive keyword check
        if (url.toLowerCase().includes(pattern.toLowerCase())) {
          // Block only if not already whitelisted
          if (mode === 'combined' && isWhitelisted) {
            logInfo(`URL MATCHED blacklist keyword: ${pattern} - but whitelisted, allowing access`);
            return false;
          }
          logInfo(`URL MATCHED blacklist keyword: ${pattern} - blocking access`);
          return true; // Block - URL contains blacklisted keyword
        }
      } catch (e) {
        logError('Error checking blacklist keyword:', e);
      }
    }
  }
  
  // If we reach here, allow the URL
  logInfo(`URL didn't match any blocking rules: ${url} - allowing access`);
  return false;
}

// Replace the checkUrlAgainstRules function with a call to our more comprehensive function
function checkUrlAgainstRules(url) {
  logInfo(`Checking URL against rules: ${url}`);
  const shouldBlock = checkUrlShouldBeBlocked(url);
  if (shouldBlock) {
    logInfo(`URL should be BLOCKED: ${url}`);
  }
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
        logInfo(`Mode changed to: ${mode}`);
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
        // No need to call setupBlockingRules()
        response = true;
        break;
        
      case 'getWhitelistKeywords':
        response = whitelistKeywords;
        break;
        
      case 'setWhitelistKeywords':
        whitelistKeywords = request.params[0];
        chrome.storage.local.set({ whitelistKeywords });
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
};
