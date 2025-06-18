/**
 * This script restores a previous build snapshot as the current build.
 * It can restore either a specific snapshot or the most recent one.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const AdmZip = require('adm-zip');

// Constants
const BUILD_DIR = path.join(__dirname, '../build');
const SNAPSHOTS_DIR = path.join(__dirname, '../snapshots');
const LATEST_SNAPSHOT = path.join(SNAPSHOTS_DIR, 'dmn-build-latest.zip');

// Check for command-line arguments
const args = process.argv.slice(2);
let snapshotToRestore = LATEST_SNAPSHOT;

if (args.length > 0) {
  // If a specific snapshot filename was provided
  const requestedSnapshot = path.join(SNAPSHOTS_DIR, args[0]);
  if (fs.existsSync(requestedSnapshot)) {
    snapshotToRestore = requestedSnapshot;
  } else {
    console.error(`❌ Error: Snapshot file not found: ${requestedSnapshot}`);
    console.log('Available snapshots:');
    fs.readdirSync(SNAPSHOTS_DIR)
      .filter(file => file.endsWith('.zip') && file !== 'dmn-build-latest.zip')
      .forEach(file => console.log(`  - ${file}`));
    process.exit(1);
  }
}

// Make sure snapshot exists
if (!fs.existsSync(snapshotToRestore)) {
  console.error(`❌ Error: No snapshots found at ${snapshotToRestore}`);
  process.exit(1);
}

// Create a backup of the current build before restoring
const currentDate = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const buildBackupName = `build-before-restore-${currentDate}.zip`;
const buildBackupPath = path.join(SNAPSHOTS_DIR, buildBackupName);

try {
  console.log(`Creating backup of current build at: ${buildBackupPath}`);
  
  // Create a zip of the current build (if it exists)
  if (fs.existsSync(BUILD_DIR)) {
    const zip = new AdmZip();
    zip.addLocalFolder(BUILD_DIR);
    zip.writeZip(buildBackupPath);
    console.log('✓ Current build backup created successfully');
  } else {
    console.log('! No current build directory found, skipping backup');
  }
  
  // Clear the current build directory
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  
  // Extract the snapshot to the build directory
  console.log(`Restoring snapshot from: ${snapshotToRestore}`);
  const zip = new AdmZip(snapshotToRestore);
  zip.extractAllTo(BUILD_DIR, true);
  
  // Read manifest version
  const manifestPath = path.join(BUILD_DIR, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`✅ Successfully restored snapshot to build directory`);
    console.log(`   Restored extension version: ${manifest.version}`);
  } else {
    console.log(`✅ Snapshot restored, but no manifest.json found`);
  }
} catch (error) {
  console.error('❌ Error restoring snapshot:', error);
  process.exit(1);
}
