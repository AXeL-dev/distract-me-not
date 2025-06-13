# Chrome Extension Sync Troubleshooting Guide

## Problem: Rules Not Syncing Between Machines

If you're experiencing issues with your settings and rules not syncing between machines when using the Chrome extension, this is most likely caused by **different extension IDs** on each machine.

## Why Different Extension IDs Affect Sync

Chrome's `storage.sync` API ties data to a specific extension ID and user account. When you load the extension with different IDs on different machines:

1. **Separate Storage Areas**: Each extension ID receives its own isolated storage area in Chrome's cloud sync system.

2. **No Cross-Extension Access**: Chrome doesn't allow one extension ID to access data from another ID, even if they contain identical code.

3. **Sync Boundary**: Each extension ID creates a "sync boundary" - data only syncs between instances with matching IDs.

## How to Check Your Extension ID

1. Go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Find "Distract Me Not" in the extensions list
4. The ID is shown just beneath the extension name

## Common Causes of Different Extension IDs

1. **Loading Methods**: 
   - Extensions loaded unpacked (for development) have different IDs than those installed from the Chrome Web Store
   - Extensions loaded from different directories get different IDs

2. **Different Builds**: 
   - Each time you load an unpacked extension, Chrome may generate a different ID
   - Published vs. development versions have different IDs

## Solutions

### Option 1: Use the Same Extension Source (Recommended)

**For production use:**
- Install the extension from the Chrome Web Store on all machines
- Sign in with the same Google account on all machines
- Enable Chrome sync

**For development/testing:**
- Use the provided `extension-id-helper.js` script to add a "key" to your manifest.json
- Load the extension with this key on all machines

### Option 2: Force a Consistent Extension ID

1. Run the extension ID helper script:
   ```
   node scripts/extension-id-helper.js
   ```

2. Follow the prompts to generate a key and add it to your manifest.json

3. Build the extension and load it on all machines

4. This will ensure the same extension ID is used everywhere

### Option 3: External Sync Solution

If you need to maintain different extension IDs (for example, you need both development and production versions):

- Implement a custom sync solution using a server or cloud service
- Store rules in your own database instead of using Chrome's sync storage
- Add user authentication to associate rules with specific users

## Implementation Instructions

1. **Generate a consistent key**:
   ```
   node scripts/extension-id-helper.js
   ```

2. **Choose option 1** to generate a random key and add it to manifest.json

3. **Build the extension**:
   ```
   npm run build
   ```

4. **Load the extension unpacked** on all machines from this build

5. **Verify the extension IDs match** on all machines

## Additional Diagnostics

If you continue to have sync issues even with matching extension IDs:

1. Use the sync diagnostics pages included in the extension
2. Check for storage quota limitations (Chrome has size limits for sync storage)
3. Verify sync is enabled in Chrome settings
4. Check for network connectivity issues that might prevent sync

For technical assistance, please file an issue on GitHub with your diagnostic results.
