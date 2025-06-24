// Import our pattern matcher implementation first, before everything else
importScripts('service-worker-patterns.js');

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

// The wildcardToRegExp, matchesPattern, and checkUrlShouldBeBlocked functions
// are now defined in service-worker-patterns.js
