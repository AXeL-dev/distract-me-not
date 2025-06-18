/**
 * This is a simple console-based test runner for the sync functionality.
 * To use:
 * 1. Open the browser extension
 * 2. Open DevTools (F12)
 * 3. Go to the Console tab
 * 4. Copy and paste this entire file's contents into the console
 * 5. You should see test results in the console
 */

// Execute the script
fetch(chrome.runtime.getURL('test-sync-rules.js'))
  .then(response => response.text())
  .then(script => {
    console.log('Running sync test script...');
    eval(script);
  })
  .catch(error => {
    console.error('Error loading test script:', error);
  });
