/**
 * This script generates a Chrome-compatible service worker
 * by copying the public service worker and ensuring it can
 * import libraries directly instead of inlining them
 */

const fs = require('fs');
const path = require('path');

// Paths
const BUILD_DIR = path.join(__dirname, '../build');
const SOURCE_SERVICE_WORKER = path.join(__dirname, '../public/service-worker.js');
const CHROME_SERVICE_WORKER = path.join(BUILD_DIR, 'service-worker.js');

console.log('Generating Chrome-compatible service worker...');

try {
  // Create build directory if it doesn't exist
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }
  
  // Read the source service worker
  let serviceWorkerContent = fs.readFileSync(SOURCE_SERVICE_WORKER, 'utf8');

  // Add a special header for Chrome
  const chromeServiceWorkerContent = `/**
 * Distract-Me-Not Chrome Service Worker
 * This service worker uses importScripts to load required libraries
 */

${serviceWorkerContent}`;

  // Write the Chrome service worker file
  fs.writeFileSync(CHROME_SERVICE_WORKER, chromeServiceWorkerContent);
  console.log('✅ Chrome service worker generated successfully');

} catch (error) {
  console.error('❌ Error generating Chrome service worker:', error);
  process.exit(1);
}
