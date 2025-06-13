/**
 * This script fixes a specific syntax error in the service worker file
 * that occurs during the Chrome build process
 */

const fs = require('fs');
const path = require('path');

const SERVICE_WORKER_PATH = path.join(__dirname, '../build/service-worker.js');

console.log('Fixing service worker syntax errors...');

try {
  // Read the current service worker content
  let content = fs.readFileSync(SERVICE_WORKER_PATH, 'utf8');
  
  // Check if the syntax error is present
  if (content.includes("}).catch(localError => {")) {
    // Find the problematic section and fix it
    const fixedContent = content.replace(
      /chrome\.storage\.local\.set\(\{ mode \}\)\.then\(\(\) => \{[\s\n]*logInfo\('Mode saved to local storage \(fallback\)'\);[\s\n]*\}\)\.catch\(localError => \{[\s\n]*(\s*)return true;[\s\n]*\}/g, 
      `chrome.storage.local.set({ mode }).then(() => {
      logInfo('Mode saved to local storage (fallback)');
    }).catch(localError => {
      logError('Failed to save mode to local storage:', localError);
    });
  });
  
  return true;
}`
    );
    
    // Write the fixed content back
    fs.writeFileSync(SERVICE_WORKER_PATH, fixedContent, 'utf8');
    console.log('✓ Fixed syntax error in service worker');
  } else {
    console.log('✓ No syntax errors found in service worker');
  }
} catch (error) {
  console.error('❌ Error fixing service worker:', error);
  process.exit(1);
}

console.log('✅ Service worker syntax check completed');
