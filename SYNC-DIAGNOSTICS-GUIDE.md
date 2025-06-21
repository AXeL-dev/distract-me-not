# Sync Diagnostics and Testing Guide

This guide explains how to use the comprehensive sync diagnostics and testing features added to Distract Me Not.

## Overview

The extension now includes robust sync diagnostics to help identify and resolve sync issues, including:

- ✅ Sync functionality testing
- 🔍 Problem diagnosis  
- 🔄 Force sync operations
- 📊 Sync status monitoring
- 🧪 Manual testing tools

## Accessing Sync Diagnostics

### Via Extension Settings

1. Open the Distract Me Not extension settings
2. Navigate to the **"Diagnostic"** tab
3. Use the available sync diagnostic tools:

#### Available Tools:

- **Run Diagnosis** - Scans for common sync problems
- **Test Sync** - Tests read/write operations to sync storage
- **Force Sync All Data** - Pushes all local data to sync storage
- **Clear Sync Storage** - Removes all synced data (use with caution)
- **Refresh Rules from Cloud** - Pulls latest sync data

### Via Browser Console

For advanced debugging, you can access sync diagnostics programmatically:

```javascript
// Import sync diagnostics
const diagnostics = await import('./src/helpers/syncDiagnostics.js');

// Check sync status
const status = await diagnostics.checkSyncStatus();
console.log('Sync Status:', status);

// Run sync test
const testResults = await diagnostics.testSync();
console.log('Test Results:', testResults);

// Diagnose problems
const problems = await diagnostics.diagnoseProblems();
console.log('Problems:', problems);
```

### Using the Sync Test Page

1. Open `sync-test.html` in your browser
2. Make sure you're in an extension context
3. Use the interactive testing tools

## Common Sync Issues and Solutions

### Issue: New Installation Not Syncing

**Symptoms:**
- Fresh install doesn't receive synced data
- Settings appear reset on new devices

**Diagnosis:**
- Run "Test Sync" to verify sync connectivity
- Check if fresh install logic is blocking sync

**Solutions:**
- Use "Force Sync All Data" to bypass fresh install protection
- Check sync status and ensure sync is enabled in browser

### Issue: Deleted Entries Reappearing

**Symptoms:**
- Removed websites reappear in lists
- Settings revert to previous values

**Diagnosis:**
- Check for conflicting data between devices
- Look for timestamp issues in sync data

**Solutions:**
- Clear sync storage and re-sync from one device
- Use "Force Sync All Data" from the primary device

### Issue: Sync Storage Quota Exceeded

**Symptoms:**
- Sync operations failing
- Data not saving to sync

**Diagnosis:**
- Run diagnosis to check quota usage
- Look for oversized data items

**Solutions:**
- Clear old/unnecessary sync data
- Optimize data structure to reduce size

## Understanding Sync Diagnostics Results

### Sync Status Check Results

```javascript
{
  syncAvailable: true,          // Chrome sync API available
  browser: "Chrome 120.0...",   // Browser information
  bytesInUse: 15420,           // Current sync storage usage
  maxBytes: 102400,            // Sync storage limit
  usagePercentage: "15.06%"    // Percentage of quota used
}
```

### Sync Test Results

```javascript
{
  success: true,               // Test passed/failed
  duration: "145ms",          // Test execution time
  testData: {...},            // Data that was written
  retrievedData: {...},       // Data that was read back
  dataIntegrity: "PASS"       // Data integrity check
}
```

### Problem Diagnosis Results

```javascript
{
  problems: [                 // List of detected issues
    "High quota usage: 85%",
    "Found 3 oversized items"
  ],
  recommendations: [          // Suggested fixes
    "Consider cleaning up old data",
    "Split large items into chunks"
  ],
  stats: {                   // Detailed statistics
    bytesInUse: 87040,
    itemCount: 156,
    largeItems: 3
  }
}
```

## Best Practices for Sync

### Data Organization
- Keep individual sync items under 8KB
- Use meaningful key names with prefixes
- Avoid storing temporary or device-specific data in sync

### Conflict Resolution
- Use timestamps for conflict resolution
- Implement merge strategies for list data
- Consider user preferences for conflict handling

### Performance
- Batch sync operations when possible
- Avoid frequent small writes
- Monitor quota usage regularly

## Troubleshooting Steps

### Step 1: Basic Connectivity
1. Run "Check Sync Status" to verify sync is available
2. Ensure Chrome sync is enabled in browser settings
3. Check internet connectivity

### Step 2: Data Integrity
1. Run "Test Sync" to verify read/write operations
2. Check for data corruption or formatting issues
3. Verify data size limits

### Step 3: Conflict Resolution
1. Identify conflicting data between devices
2. Use "Clear Sync Storage" if data is severely corrupted
3. Re-sync from a known good device using "Force Sync All Data"

### Step 4: Advanced Diagnosis
1. Use browser developer tools to inspect sync storage
2. Check for extension conflicts
3. Review sync event logs in service worker

## Monitoring Sync Health

### Regular Checks
- Monitor quota usage (should stay below 80%)
- Check for failed sync operations
- Verify data consistency across devices

### Automated Monitoring
The extension can automatically monitor sync health:

```javascript
// Start monitoring sync changes
diagnostics.startMonitoring();

// Stop monitoring
diagnostics.stopMonitoring();
```

## Developer Notes

### Sync Data Structure
```javascript
// Syncable settings
{
  mode: "blacklist",
  blacklist: ["site1.com", "site2.com"],
  whitelist: ["allowedsite.com"],
  action: "redirect",
  // ... other syncable settings
}

// Local-only settings (not synced)
{
  installId: "unique-id",
  lastSyncCheck: timestamp,
  _private_data: "...",
  // ... other local settings
}
```

### Adding New Sync Diagnostics

To add new diagnostic checks:

1. Add method to `src/helpers/syncDiagnostics.js`
2. Update UI in `src/components/Settings/index.jsx`
3. Add translation keys if needed
4. Update this documentation

### Testing Changes

Always test sync changes across multiple scenarios:
- Fresh installations
- Existing installations with data
- Multiple devices with conflicts
- Quota limit edge cases
- Network interruption scenarios

## Support

If sync issues persist:

1. Check the [FAQ](https://github.com/AXeL-dev/distract-me-not/wiki/FAQ)
2. Review [sync troubleshooting](./SYNC-TROUBLESHOOTING.md)
3. Report issues with diagnostic results included
