/**
 * Extension ID Preservation Helper
 * 
 * This script helps generate a key for manifest.json that will result
 * in a consistent extension ID across different machines.
 * 
 * Usage:
 * 1. Run this script with Node.js
 * 2. Choose option 1 to generate a key based on a desired extension ID
 * 3. Choose option 2 to generate a random key
 * 4. Add the key to your manifest.json (in the "key" field at the top level)
 */

const crypto = require('crypto');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Generate a random extension key
 */
function generateRandomKey() {
  // Generate 16 random bytes (128 bits)
  const randomBytes = crypto.randomBytes(16);
  return randomBytes.toString('base64');
}

/**
 * Modify the manifest.json to include the generated key
 */
function updateManifest(key) {
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  
  try {
    // Read the current manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Add or update the key
    manifest.key = key;
    
    // Write back the updated manifest with pretty formatting
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log(`✅ Successfully updated manifest.json with the key.`);
  } catch (error) {
    console.error(`❌ Failed to update manifest.json: ${error.message}`);
  }
}

/**
 * Save key to a separate file for reference
 */
function saveKeyToFile(key, extensionId) {
  const keyFilePath = path.join(__dirname, '../extension-id-info.txt');
  
  const content = `Extension Key and ID Information
=============================
Generated: ${new Date().toISOString()}

Extension Key (for manifest.json):
${key}

Expected Extension ID:
${extensionId || 'Unknown - will be determined by Chrome'}

Instructions:
1. This key has been added to your manifest.json
2. When loading as an unpacked extension, Chrome will use this key to generate the extension ID
3. The same extension ID will be used on all machines with this same key
`;

  try {
    fs.writeFileSync(keyFilePath, content);
    console.log(`✅ Saved key information to ${keyFilePath}`);
  } catch (error) {
    console.error(`❌ Failed to save key information: ${error.message}`);
  }
}

/**
 * Main menu
 */
function showMenu() {
  console.log('\n============================================');
  console.log('Extension ID Preservation Tool');
  console.log('============================================');
  console.log('1. Generate a random key');
  console.log('2. Update manifest.json with key');
  console.log('3. Exit');
  console.log('============================================\n');
  
  rl.question('Select an option: ', (answer) => {
    switch (answer) {
      case '1':
        const key = generateRandomKey();
        console.log(`\nGenerated Key:\n${key}\n`);
        
        rl.question('Do you want to update manifest.json with this key? (y/n): ', (updateAnswer) => {
          if (updateAnswer.toLowerCase() === 'y') {
            updateManifest(key);
            saveKeyToFile(key);
          }
          showMenu();
        });
        break;
        
      case '2':
        rl.question('\nEnter the key to add to manifest.json: ', (key) => {
          updateManifest(key);
          saveKeyToFile(key);
          showMenu();
        });
        break;
        
      case '3':
        console.log('\nExiting...');
        rl.close();
        break;
        
      default:
        console.log('\nInvalid option, please try again.');
        showMenu();
        break;
    }
  });
}

// Start the program
console.log('Extension ID Preservation Tool');
console.log('This tool helps maintain consistent extension IDs across different machines.\n');

showMenu();
