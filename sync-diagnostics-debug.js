// Simple debugging script for Distract Me Not extension
console.log('Diagnostics script loaded at ' + new Date().toISOString());

// Create a console log display
function addLogToDisplay(message, type = 'log') {
  const logOutput = document.getElementById('logOutput');
  if (!logOutput) {
    console.error('Log output element not found');
    return;
  }
  
  // Create log entry
  const logEntry = document.createElement('div');
  logEntry.style.borderBottom = '1px solid #333';
  logEntry.style.padding = '2px 0';
  
  // Format timestamp
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  
  // Format object or error
  let formatted = '';
  if (typeof message === 'object') {
    try {
      if (message instanceof Error) {
        formatted = message.message + "\n" + message.stack;
      } else {
        formatted = JSON.stringify(message, null, 2);
      }
    } catch (e) {
      formatted = '[Object that cannot be stringified]';
    }
  } else {
    formatted = message;
  }
  
  // Set color based on log type
  let color = '#ccc';
  switch (type) {
    case 'error': color = '#f88'; break;
    case 'warn': color = '#ff8'; break;
    case 'success': color = '#8f8'; break;
    case 'sync': color = '#8cf'; break;
  }
  
  // Add content
  logEntry.innerHTML = `<span style="color: #888">[${timestamp}]</span> <span style="color: ${color}">${formatted}</span>`;
  
  // Add to log output and scroll to bottom
  logOutput.appendChild(logEntry);
  logOutput.scrollTop = logOutput.scrollHeight;
  
  // Trim old logs if too many
  while (logOutput.children.length > 100) {
    logOutput.removeChild(logOutput.firstChild);
  }
}

// Monitor Chrome storage changes
function setupStorageChangeListener() {
  chrome.storage.onChanged.addListener((changes, area) => {
    const changesArray = [];
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
      const changeType = !oldValue ? 'added' : !newValue ? 'removed' : 'modified';
      let changeSize = '';
      
      try {
        const oldSize = oldValue ? JSON.stringify(oldValue).length : 0;
        const newSize = newValue ? JSON.stringify(newValue).length : 0;
        
        if (changeType !== 'removed') {
          changeSize = ` (${newSize} bytes)`;
          if (changeType === 'modified') {
            const sizeDiff = newSize - oldSize;
            const sign = sizeDiff > 0 ? '+' : '';
            changeSize += `, ${sign}${sizeDiff} bytes change`;
          }
        }
      } catch (e) {
        // Ignore size calculation errors
      }
      
      changesArray.push(`${key} ${changeType}${changeSize}`);
    }
    
    if (changesArray.length > 0) {
      addLogToDisplay(`${area.toUpperCase()} storage changed: ${changesArray.join(', ')}`, 'sync');
    }
  });
  addLogToDisplay('Storage change monitoring activated', 'success');
}

// Helper function to display data results
function displayStorageData(elementId, data) {
  const container = document.getElementById(elementId);
  if (!container) {
    console.error('Container not found: ' + elementId);
    return;
  }
  
  container.innerHTML = '';
  
  if (!data || Object.keys(data).length === 0) {
    container.textContent = 'No data available';
    return;
  }
  
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  ['Key', 'Type', 'Size', 'Value'].forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  
  for (const key of Object.keys(data).sort()) {
    const value = data[key];
    const type = Array.isArray(value) ? 'Array' : typeof value;
    
    // Calculate approximate size
    let size;
    try {
      size = JSON.stringify(value).length;
      size = size > 1024 ? Math.round(size / 1024) + ' KB' : size + ' bytes';
    } catch (e) {
      size = 'Unknown';
    }
    
    const row = document.createElement('tr');
    
    // Key
    const keyCell = document.createElement('td');
    keyCell.textContent = key;
    row.appendChild(keyCell);
    
    // Type
    const typeCell = document.createElement('td');
    typeCell.textContent = type;
    row.appendChild(typeCell);
    
    // Size
    const sizeCell = document.createElement('td');
    sizeCell.textContent = size;
    row.appendChild(sizeCell);
    
    // Value
    const valueCell = document.createElement('td');
    if (type === 'Array') {
      valueCell.textContent = `Array (${value.length} items)`;
      if (value.length > 0) {
        const pre = document.createElement('pre');
        pre.textContent = JSON.stringify(value.slice(0, 3), null, 2);
        if (value.length > 3) {
          pre.textContent += `\n...and ${value.length - 3} more items`;
        }
        valueCell.appendChild(pre);
      }
    } else if (type === 'object' && value !== null) {
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(value, null, 2);
      valueCell.appendChild(pre);
    } else {
      valueCell.textContent = JSON.stringify(value);
    }
    
    row.appendChild(valueCell);
    tbody.appendChild(row);
  }
  
  table.appendChild(tbody);
  container.appendChild(table);
}

// Initialize the extension info section
function initExtensionInfo() {
  try {
    console.log('Initializing extension info...');
    const extensionInfo = document.getElementById('extensionInfo');
    if (!extensionInfo) {
      console.error('Extension info container not found');
      return;
    }
    
    // Add immediate feedback
    extensionInfo.innerHTML = '<p>Loading extension information...</p>';
    
    try {
      const manifest = chrome.runtime.getManifest();
      console.log('Retrieved manifest:', manifest);
      
      const extensionId = chrome.runtime.id;
      console.log('Retrieved extension ID:', extensionId);
      
      // Always update the extension ID display
      updateExtensionIdDisplay(extensionId || 'Unknown');
      
      extensionInfo.innerHTML = `
        <p><strong>Extension ID:</strong> ${extensionId || 'Unknown'}</p>
        <p><strong>Version:</strong> ${manifest.version || 'Unknown'}</p>
        <p><strong>Manifest Version:</strong> ${manifest.manifest_version || 'Unknown'}</p>
        <p><strong>Browser:</strong> ${navigator.userAgent || 'Unknown'}</p>
        <p><strong>Page loaded at:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Script path:</strong> ${document.currentScript?.src || 'Unknown'}</p>
      `;
      
      // Try to ping service worker immediately
      console.log('Sending ping to service worker...');
      chrome.runtime.sendMessage({ message: 'ping' }, function(response) {
        console.log('Ping response:', response);
        if (chrome.runtime.lastError) {
          console.error('Error pinging service worker:', chrome.runtime.lastError);
          extensionInfo.innerHTML += `<p class="error"><strong>Service Worker Status:</strong> Unreachable (${chrome.runtime.lastError.message})</p>`;
        } else {
          extensionInfo.innerHTML += `<p class="success"><strong>Service Worker Status:</strong> Responsive</p>`;
        }
      });
    } catch (innerError) {
      console.error('Error accessing runtime APIs:', innerError);
      extensionInfo.innerHTML += `<p class="error"><strong>Runtime Error:</strong> ${innerError.message}</p>`;
      
      // Try recovery via browser.runtime for Firefox compatibility
      try {
        if (typeof browser !== 'undefined' && browser.runtime) {
          console.log('Trying browser.runtime fallback...');
          const manifestFF = browser.runtime.getManifest();
          const extensionIdFF = browser.runtime.id;
          
          extensionInfo.innerHTML += `
            <p><strong>Firefox Extension ID:</strong> ${extensionIdFF || 'Unknown'}</p>
            <p><strong>Firefox Version:</strong> ${manifestFF.version || 'Unknown'}</p>
          `;
        }
      } catch (ffError) {
        console.error('Firefox fallback failed:', ffError);
      }
    }
  } catch (error) {
    console.error('Fatal error initializing extension info:', error);
    const extensionInfo = document.getElementById('extensionInfo');
    if (extensionInfo) {
      extensionInfo.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
  }
}

// Function to get sync diagnostics from service worker
function getSyncDiagnostics() {
  try {
    addLogToDisplay('Requesting sync diagnostics...', 'log');
    
    // Listen for the response from service worker
    chrome.runtime.onMessage.addListener(function syncDiagnosticsListener(msg) {
      if (msg.type === 'syncDiagnosticsResult') {
        // Remove the listener once we get the response
        chrome.runtime.onMessage.removeListener(syncDiagnosticsListener);
        
        addLogToDisplay('Received sync diagnostics', 'success');
        console.log('Sync diagnostics result:', msg.data);
        
        // Display the results
        const extensionInfo = document.getElementById('extensionInfo');
        if (extensionInfo && msg.data) {
          extensionInfo.innerHTML = '<h3>Sync Diagnostics</h3>';
            // Update the extension ID display
          if (msg.data.extensionId) {
            updateExtensionIdDisplay(msg.data.extensionId);
          }
          
          const quotaInfo = document.createElement('div');
          quotaInfo.innerHTML = `
            <h4>Chrome Sync Storage Quota</h4>
            <p>Bytes used: ${msg.data.quota.bytesInUse} of ${msg.data.quota.bytesTotal} (${msg.data.quota.percentUsed}%)</p>
            <p>Remaining: ${msg.data.quota.remaining} bytes</p>            <h4>Settings</h4>
            <p>Extension ID: ${msg.data.extensionId}</p>
            <p>Version: ${msg.data.version}</p>
            <p>Deny list entries: ${msg.data.settings.denyListCount || msg.data.settings.blacklistCount || 0}</p>
            <p>Allow list entries: ${msg.data.settings.allowListCount || msg.data.settings.whitelistCount || 0}</p>
            <p>Deny list keywords: ${msg.data.settings.denyListKeywordsCount || msg.data.settings.blacklistKeywordsCount || 0}</p>
            <p>Allow list keywords: ${msg.data.settings.allowListKeywordsCount || msg.data.settings.whitelistKeywordsCount || 0}</p>
            <p>Mode: ${msg.data.settings.mode}</p>
            <p>Sync status: ${msg.data.syncStatus}</p>
            <p>Timestamp: ${new Date(msg.data.timestamp).toLocaleString()}</p>
          `;
          extensionInfo.appendChild(quotaInfo);
          
          // Update extension ID in the header
          const extensionIdElement = document.querySelector('#header span');
          if (extensionIdElement) {
            extensionIdElement.textContent = msg.data.extensionId;
          }
        }
      }
    });
    
    // Send the request to the service worker
    chrome.runtime.sendMessage({ message: 'getSyncDiagnostics' }, function(response) {
      if (chrome.runtime.lastError) {
        addLogToDisplay('Error: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      
      addLogToDisplay('Diagnostics request sent successfully', 'log');
    });
  } catch (error) {
    addLogToDisplay('Exception: ' + error.message, 'error');
  }
}

// Function to ensure extension ID is consistently displayed
function updateExtensionIdDisplay(extensionId) {
  try {
    console.log('Updating extension ID display with:', extensionId);
    const extensionIdDisplay = document.getElementById('extensionIdDisplay');
    if (extensionIdDisplay) {
      // Always update the prominently displayed extension ID
      extensionIdDisplay.textContent = extensionId || 'Unknown';
      console.log('Extension ID display updated to:', extensionId);
      
      // Also update page title with extension ID for easier identification
      document.title = `DMN Sync Diagnostics (ID: ${extensionId || 'Unknown'})`;
      
      // Style based on whether we got a valid ID
      if (extensionId && extensionId !== 'Unknown') {
        extensionIdDisplay.style.color = '#0078d7';
      } else {
        extensionIdDisplay.style.color = '#d70000';
      }
    } else {
      console.warn('Extension ID display element not found');
    }
  } catch (e) {
    console.error('Error updating extension ID display:', e);
  }
}

// Special function to attempt a more aggressive recovery of sync data 
// that bypasses all chrome.storage.sync wrappers and throttles
function forceRecoverFromSync() {
  addLogToDisplay('Starting AGGRESSIVE sync data recovery...', 'sync');
  
  // Chrome's storage.sync.get accepts a key list or null for all keys
  // We request all keys first to diagnose the sync state
  try {
    chrome.storage.sync.get(null, async (allSyncData) => {
      if (chrome.runtime.lastError) {
        addLogToDisplay(`Error getting all sync data: ${chrome.runtime.lastError.message}`, 'error');
        return;
      }
      
      // Check what we got
      addLogToDisplay(`Sync data has ${Object.keys(allSyncData).length} keys: ${Object.keys(allSyncData).join(', ')}`, 'sync');
      
      // Count items in lists
      const blacklistCount = Array.isArray(allSyncData.blacklist) ? allSyncData.blacklist.length : 'NOT_ARRAY';
      const whitelistCount = Array.isArray(allSyncData.whitelist) ? allSyncData.whitelist.length : 'NOT_ARRAY';
      
      addLogToDisplay(`Sync data counts - blacklist: ${blacklistCount}, whitelist: ${whitelistCount}`, 'sync');
      
      // Look for data validity issues
      if (typeof allSyncData.blacklist === 'undefined') {
        addLogToDisplay('WARNING: blacklist is undefined in sync storage', 'warn');
      } else if (!Array.isArray(allSyncData.blacklist)) {
        addLogToDisplay(`WARNING: blacklist is not an array in sync storage (type: ${typeof allSyncData.blacklist})`, 'warn');
      }
      
      if (typeof allSyncData.whitelist === 'undefined') {
        addLogToDisplay('WARNING: whitelist is undefined in sync storage', 'warn');
      } else if (!Array.isArray(allSyncData.whitelist)) {
        addLogToDisplay(`WARNING: whitelist is not an array in sync storage (type: ${typeof allSyncData.whitelist})`, 'warn');
      }
      
      if (blacklistCount === 0 && whitelistCount === 0) {
        addLogToDisplay('No rules found in sync storage - nothing to recover', 'warn');
        return;
      }
      
      // We have rules in sync - save them to local storage
      if (Array.isArray(allSyncData.blacklist) || Array.isArray(allSyncData.whitelist)) {
        addLogToDisplay('Found rules in sync storage, saving to local storage...', 'success');
        
        // Create a valid storage object
        const safeData = {
          blacklist: Array.isArray(allSyncData.blacklist) ? allSyncData.blacklist : [],
          whitelist: Array.isArray(allSyncData.whitelist) ? allSyncData.whitelist : [],
          blacklistKeywords: Array.isArray(allSyncData.blacklistKeywords) ? allSyncData.blacklistKeywords : [],
          whitelistKeywords: Array.isArray(allSyncData.whitelistKeywords) ? allSyncData.whitelistKeywords : []
        };
        
        // Show counts
        addLogToDisplay(`Saving ${safeData.blacklist.length} deny items and ${safeData.whitelist.length} allow items to local storage`, 'sync');
        
        // Save to local storage
        try {
          await chrome.storage.local.set(safeData);
          addLogToDisplay('Successfully saved sync rules to local storage', 'success');
          
          // Force the service worker to update its rules
          chrome.runtime.sendMessage({ message: 'updateRules' }, function(response) {
            if (chrome.runtime.lastError) {
              addLogToDisplay(`Error notifying service worker: ${chrome.runtime.lastError.message}`, 'error');
              return;
            }
            
            addLogToDisplay('Service worker notified to update rules', 'success');
            if (response && response.success) {
              addLogToDisplay('Service worker confirmed rule update', 'success');
            } else {
              addLogToDisplay('Service worker did not confirm rule update', 'warn');
            }
          });
        } catch (saveError) {
          addLogToDisplay(`Error saving to local storage: ${saveError.message}`, 'error');
        }
      } else {
        addLogToDisplay('Could not find valid rule arrays in sync data', 'error');
      }
    });
  } catch (error) {
    addLogToDisplay(`Error in recovery attempt: ${error.message}`, 'error');
  }
}

// Setup all event handlers
function setupAllEventHandlers() {
  console.log('Setting up event handlers');
  
  // Log button setup for debugging
  const buttons = document.querySelectorAll('button');
  console.log(`Found ${buttons.length} buttons on the page`);
  buttons.forEach(btn => console.log(`Button: ${btn.id || 'unnamed'} - ${btn.textContent.trim()}`));
  
  // Ping Service Worker button
  const pingServiceWorker = document.getElementById('pingServiceWorker');
  if (pingServiceWorker) {
    console.log('Adding event listener to ping button');
    pingServiceWorker.addEventListener('click', function() {
      console.log('Ping button clicked');
      const logOutput = document.getElementById('logOutput');
      if (logOutput) {
        logOutput.innerHTML = '<div>Sending ping to service worker...</div>';
      }
      
      try {
        chrome.runtime.sendMessage({ message: 'ping' }, function(response) {
          if (chrome.runtime.lastError) {
            console.error('Error from service worker:', chrome.runtime.lastError);
            addLogToDisplay('Error: ' + chrome.runtime.lastError.message, 'error');
            return;
          }
          
          console.log('Service worker response:', response);
          addLogToDisplay('Response: ' + JSON.stringify(response), 'success');
        });
      } catch (error) {
        console.error('Exception during ping:', error);
        addLogToDisplay('Exception: ' + error.message, 'error');
      }
    });
  } else {
    console.error('Ping Service Worker button not found');
  }
  
  // Get Current Settings button
  const getCurrentSettings = document.getElementById('getCurrentSettings');
  if (getCurrentSettings) {
    getCurrentSettings.addEventListener('click', function() {
      console.log('Get settings button clicked');
      const logOutput = document.getElementById('logOutput');
      if (logOutput) {
        logOutput.innerHTML = '<div>Requesting current settings...</div>';
      }
      
      try {
        chrome.runtime.sendMessage({ message: 'getCurrentSettings' }, function(response) {
          if (chrome.runtime.lastError) {
            console.error('Error from service worker:', chrome.runtime.lastError);
            addLogToDisplay('Error: ' + chrome.runtime.lastError.message, 'error');
            return;
          }            console.log('Settings response:', response);
          addLogToDisplay('Settings received', 'success');
          
          const currentSettings = document.getElementById('currentSettings');
          // The response is directly the settings object, not nested in response.response
          if (currentSettings && response) {
            let content = '<h3>Current Settings</h3>';
              // Format the settings nicely with sections
            const settings = response;
            content += '<pre>' + JSON.stringify(settings, null, 2) + '</pre>';
            
            // Add explanation of key settings
            content += '<h3>Key Settings Explanation</h3>';
            content += '<table>';
            content += '<tr><th>Setting</th><th>Value</th><th>Description</th></tr>';
            
            // Mode
            content += '<tr>';
            content += '<td>mode</td>';
            content += `<td>${settings.mode || 'N/A'}</td>`;
            content += '<td>Blocking mode: "blacklist" (block listed sites), "whitelist" (only allow listed sites), or "combined" (both)</td>';
            content += '</tr>';
            
            // Lists
            content += '<tr>';
            content += '<td>Deny List (blacklist)</td>';
            content += `<td>${settings.blacklist ? settings.blacklist.length : 0} items</td>`;
            content += '<td>Sites that are blocked</td>';
            content += '</tr>';
            
            content += '<tr>';
            content += '<td>Allow List (whitelist)</td>';
            content += `<td>${settings.whitelist ? settings.whitelist.length : 0} items</td>`;
            content += '<td>Sites that are allowed</td>';
            content += '</tr>';
            
            // Keywords
            content += '<tr>';
            content += '<td>Deny Keywords</td>';
            content += `<td>${settings.blacklistKeywords ? settings.blacklistKeywords.length : 0} items</td>`;
            content += '<td>Keywords that trigger blocking</td>';
            content += '</tr>';
            
            content += '<tr>';
            content += '<td>Allow Keywords</td>';
            content += `<td>${settings.whitelistKeywords ? settings.whitelistKeywords.length : 0} items</td>`;
            content += '<td>Keywords that allow sites</td>';
            content += '</tr>';
            
            // Enabled status
            content += '<tr>';
            content += '<td>Enabled</td>';
            content += `<td>${settings.isEnabled ? 'Yes' : 'No'}</td>`;            content += '<td>Whether blocking is currently active (NOT synchronized)</td>';
            content += '</tr>';            
            content += '</table>';
            
            currentSettings.innerHTML = content;
          }
        });
      } catch (error) {
        console.error('Exception during get settings:', error);
        addLogToDisplay('Exception: ' + error.message, 'error');
      }
    });
  }
  
  // Force Update Rules button
  const forceUpdateRules = document.getElementById('forceUpdateRules');
  if (forceUpdateRules) {
    forceUpdateRules.addEventListener('click', function() {
      console.log('Force update rules button clicked');
      
      try {
        chrome.runtime.sendMessage({ message: 'updateRules' }, function(response) {
          if (chrome.runtime.lastError) {
            console.error('Error from service worker:', chrome.runtime.lastError);
            addLogToDisplay('Error: ' + chrome.runtime.lastError.message, 'error');
            return;
          }
          
          console.log('Update response:', response);
          addLogToDisplay('Rules updated successfully', 'success');
        });
      } catch (error) {
        console.error('Exception during rules update:', error);
        addLogToDisplay('Exception: ' + error.message, 'error');
      }
    });
  }
    // Setup sync diagnostics button
  const getSyncDiagnosticsBtn = document.getElementById('getSyncDiagnostics');
  if (getSyncDiagnosticsBtn) {
    getSyncDiagnosticsBtn.addEventListener('click', function() {
      console.log('Get sync diagnostics button clicked');
      getSyncDiagnostics();
    });
  } else {
    console.error('Get sync diagnostics button not found');
  }
  
  // Setup storage test buttons
  const storageTestBtns = [
    'testStorageSmall',
    'testStorageMedium',
    'testStorageLarge',
    'readSyncStorage',
    'readLocalStorage'
  ];
  
  storageTestBtns.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', function() {
        console.log(`${btnId} button clicked`);
        addLogToDisplay(`Running test: ${btnId}`, 'log');
        
        switch(btnId) {
          case 'readSyncStorage':
            readSyncStorage();
            break;
          case 'readLocalStorage':
            readLocalStorage();
            break;
          case 'testStorageSmall':
            testStorage(100, 'small');
            break;
          case 'testStorageMedium':
            testStorage(500, 'medium');
            break;
          case 'testStorageLarge':
            testStorage(1000, 'large');
            break;
        }
      });
    } else {
      console.error(`Button not found: ${btnId}`);
    }
  });
  
  // Add new buttons
  const forceSyncPullBtn = document.getElementById('forceSyncPull');
  if (forceSyncPullBtn) {
    forceSyncPullBtn.addEventListener('click', function() {
      addLogToDisplay('Requesting forced sync pull from service worker...', 'sync');
      
      chrome.runtime.sendMessage({ message: 'forcePullFromSync' }, function(response) {
        if (chrome.runtime.lastError) {
          addLogToDisplay(`Error: ${chrome.runtime.lastError.message}`, 'error');
          return;
        }
        
        if (response && response.success) {
          addLogToDisplay('Sync pull successful', 'success');
          addLogToDisplay(`Pulled ${response.blacklistCount || 0} deny items and ${response.whitelistCount || 0} allow items`, 'sync');
        } else {
          addLogToDisplay('Sync pull did not return success flag', 'warn');
        }
      });
    });
  }
  
  const diagnoseSyncErrorsBtn = document.getElementById('diagnoseSyncErrors');
  if (diagnoseSyncErrorsBtn) {
    diagnoseSyncErrorsBtn.addEventListener('click', function() {
      addLogToDisplay('Requesting detailed sync diagnostics...', 'sync');
      
      chrome.runtime.sendMessage({ message: 'diagnoseSyncStatus' }, function(response) {
        if (chrome.runtime.lastError) {
          addLogToDisplay(`Error: ${chrome.runtime.lastError.message}`, 'error');
          return;
        }
        
        addLogToDisplay('Diagnostics request sent to service worker', 'success');
      });
    });
  }
  
  const forceRecoverFromSyncBtn = document.getElementById('forceRecoverFromSync');
  if (forceRecoverFromSyncBtn) {
    forceRecoverFromSyncBtn.addEventListener('click', function() {
      // Show a confirmation dialog
      if (confirm('This will attempt to recover sync data directly, bypassing Chrome\'s normal sync mechanism. Continue?')) {
        forceRecoverFromSync();
      }
    });
  }
}

// Function to read sync storage
function readSyncStorage() {
  try {
    chrome.storage.sync.get(null, function(data) {
      if (chrome.runtime.lastError) {
        addLogToDisplay('Error reading sync storage: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      
      addLogToDisplay('Sync storage data retrieved', 'success');
      console.log('Sync storage data:', data);
      
      const extensionInfo = document.getElementById('extensionInfo');
      if (extensionInfo) {
        extensionInfo.innerHTML = '<h3>Sync Storage Data</h3>';
        displayStorageData('extensionInfo', data);
      }
    });
  } catch (error) {
    addLogToDisplay('Exception: ' + error.message, 'error');
  }
}

// Function to read local storage
function readLocalStorage() {
  try {
    chrome.storage.local.get(null, function(data) {
      if (chrome.runtime.lastError) {
        addLogToDisplay('Error reading local storage: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      
      addLogToDisplay('Local storage data retrieved', 'success');
      console.log('Local storage data:', data);
      
      const extensionInfo = document.getElementById('extensionInfo');
      if (extensionInfo) {
        extensionInfo.innerHTML = '<h3>Local Storage Data</h3>';
        displayStorageData('extensionInfo', data);
      }
    });
  } catch (error) {
    addLogToDisplay('Exception: ' + error.message, 'error');
  }
}

// Function to test storage limits
function testStorage(size, label) {
  try {
    const testKey = `test_${label}_${Date.now()}`;
    const testData = Array(size).fill().map((_, i) => `Item ${i}: ${'x'.repeat(50)}`);
    
    addLogToDisplay(`Setting ${testData.length} items (~${size * 60 / 1024} KB)...`, 'log');
    
    chrome.storage.sync.set({ [testKey]: testData }, function() {
      if (chrome.runtime.lastError) {
        addLogToDisplay('Storage error: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      
      addLogToDisplay('Data stored successfully', 'success');
      
      chrome.storage.sync.get(testKey, function(result) {
        if (chrome.runtime.lastError) {
          addLogToDisplay('Read error: ' + chrome.runtime.lastError.message, 'error');
          return;
        }
        
        if (result[testKey] && result[testKey].length === testData.length) {
          addLogToDisplay(`Test successful - stored and retrieved ${size} items`, 'success');
        } else {
          addLogToDisplay('Test failed - data mismatch', 'error');
        }
        
        // Clean up
        chrome.storage.sync.remove(testKey);
      });
    });
  } catch (error) {
    addLogToDisplay('Exception: ' + error.message, 'error');
  }
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM content loaded at ' + new Date().toISOString());
  
  // Ensure extension ID is displayed immediately
  try {
    const extensionId = chrome.runtime.id || 'Unknown';
    console.log('Extension ID on DOMContentLoaded:', extensionId);
    updateExtensionIdDisplay(extensionId);
  } catch (e) {
    console.error('Error getting extension ID on DOMContentLoaded:', e);
  }
  
  initExtensionInfo();
  setupAllEventHandlers();
  setupStorageChangeListener();
});

// Initial page setup when DOM is loaded
// This code was moved from inline script for CSP compliance
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded - Debug alert');
  
  // Make sure we get the ID immediately
  const extensionId = chrome.runtime.id || 'Unable to retrieve';
  
  // Set initial extension info
  const extensionInfoElement = document.getElementById('extensionInfo');
  if (extensionInfoElement) {
    extensionInfoElement.innerHTML = 
      '<p>JavaScript is running! ' + new Date().toISOString() + '</p><p>Extension ID: ' + extensionId + '</p>';
  }
  
  // Display extension ID prominently
  const extensionIdDisplay = document.getElementById('extensionIdDisplay');
  if (extensionIdDisplay) {
    extensionIdDisplay.textContent = extensionId;
    console.log('Extension ID set to:', extensionId);
  }
  
  // Add this ID to local storage for comparison
  try {
    localStorage.setItem('lastKnownExtensionId', extensionId);
  } catch (e) {
    console.error('Could not save extension ID to localStorage:', e);
  }
});

// Also try on window load for redundancy
window.addEventListener('load', function() {
  console.log('Window loaded at ' + new Date().toISOString());
  
  try {
    const extensionId = chrome.runtime.id || 'Unknown';
    console.log('Extension ID on window.load:', extensionId);
    updateExtensionIdDisplay(extensionId);
  } catch (e) {
    console.error('Error getting extension ID on window.load:', e);
  }
});
