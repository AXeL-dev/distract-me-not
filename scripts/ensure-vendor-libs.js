/**
 * This script ensures that required vendor libraries are correctly copied to the build directory
 * This helps prevent ERR_FILE_NOT_FOUND errors in Chrome
 */

const fs = require('fs');
const path = require('path');

// Check if we're building for a specific browser
const args = process.argv.slice(2);
const isChromeBuild = args.includes('--browser=chrome');

// Source paths
const WEBEXT_POLYFILL_SRC = path.join(
  __dirname,
  '../node_modules/webextension-polyfill/dist/browser-polyfill.min.js'
);

const BCRYPT_SRC = path.join(
  __dirname,
  '../node_modules/bcryptjs/dist/bcrypt.min.js'
);

// Destination paths
const BUILD_DIR = path.join(__dirname, '../build');
const JS_DIR = path.join(BUILD_DIR, 'static/js');

// Ensure directories exist
if (!fs.existsSync(JS_DIR)) {
  console.log('Creating directory:', JS_DIR);
  fs.mkdirSync(JS_DIR, { recursive: true });
}

// Helper function to copy a file to multiple destinations
function copyFileToMultipleDestinations(srcPath, filename, destinations) {
  try {
    if (fs.existsSync(srcPath)) {
      console.log(`Copying ${filename} to multiple destinations...`);
      
      destinations.forEach(destDir => {
        const destPath = path.join(destDir, filename);
        fs.copyFileSync(srcPath, destPath);
        console.log(`✓ Copied to ${destPath}`);
      });
      
      console.log(`✓ ${filename} copied successfully to all destinations`);
    } else {
      console.error(`❌ Source file not found: ${srcPath}`);
    }
  } catch (error) {
    console.error(`❌ Error copying ${filename}:`, error.message);
  }
}

// For Chrome, we don't need to modify the service worker here
// The generate-chrome-service-worker.js script handles this
function inlineLibrariesForChrome() {
  if (!isChromeBuild) {
    return;
  }
  
  console.log('Chrome build detected - skipping service worker modification');
  console.log('The generate-chrome-service-worker.js script should have already created an optimized service worker');
}

// Copy webextension-polyfill to all possible locations it might be referenced from
copyFileToMultipleDestinations(
  WEBEXT_POLYFILL_SRC,
  'browser-polyfill.min.js',
  [JS_DIR, BUILD_DIR, path.join(BUILD_DIR, 'static')]
);

// Copy bcryptjs to all possible locations it might be referenced from
copyFileToMultipleDestinations(
  BCRYPT_SRC, 
  'bcrypt.min.js',
  [JS_DIR, BUILD_DIR, path.join(BUILD_DIR, 'static')]
);

// For Chrome builds, also inline the libraries directly into service-worker.js
inlineLibrariesForChrome();

console.log('Vendor libraries processing complete');
