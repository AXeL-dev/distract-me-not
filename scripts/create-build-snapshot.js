/**
 * This script creates a backup of the current build directory as a snapshot.
 * It allows us to easily restore a working state if changes break functionality.
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

// Date-based snapshot name
const date = new Date();
const formattedDate = date.toISOString()
  .replace(/:/g, '-')
  .replace(/\..+/, '');
const snapshotName = `dmn-build-snapshot-${formattedDate}.zip`;

// Paths
const BUILD_DIR = path.join(__dirname, '../build');
const SNAPSHOTS_DIR = path.join(__dirname, '../snapshots');
const SNAPSHOT_PATH = path.join(SNAPSHOTS_DIR, snapshotName);

// Ensure snapshots directory exists
if (!fs.existsSync(SNAPSHOTS_DIR)) {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  console.log(`Created snapshots directory at: ${SNAPSHOTS_DIR}`);
}

// Create a backup of the build directory
console.log(`Creating snapshot of build directory at: ${SNAPSHOT_PATH}`);

// Create a file to stream archive data to
const output = fs.createWriteStream(SNAPSHOT_PATH);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

// Listen for archive warnings
archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn('Warning:', err);
  } else {
    throw err;
  }
});

// Listen for archive errors
archive.on('error', function(err) {
  throw err;
});

// Pipe archive data to the output file
archive.pipe(output);

// Append files from build directory
archive.directory(BUILD_DIR, false);

// Finalize the archive
archive.finalize().then(() => {
  console.log(`✅ Snapshot successfully created: ${snapshotName}`);
  console.log(`   Full path: ${SNAPSHOT_PATH}`);
  console.log(`   Size: ${Math.round(archive.pointer() / 1024)} KB`);
}).catch(err => {
  console.error('❌ Failed to create snapshot:', err);
});

// Event listener for when archive is closed
output.on('close', function() {
  // Copy the snapshot to be the latest.zip as well for convenience
  const latestPath = path.join(SNAPSHOTS_DIR, 'dmn-build-latest.zip');
  fs.copyFileSync(SNAPSHOT_PATH, latestPath);
  console.log(`✓ Also saved as latest snapshot at: ${latestPath}`);
  
  // Also record manifest version in a log file
  try {
    const manifestPath = path.join(BUILD_DIR, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const version = manifest.version;
    
    const logPath = path.join(SNAPSHOTS_DIR, 'snapshots-log.txt');
    const logEntry = `${formattedDate}: Version ${version} - ${snapshotName}\n`;
    
    fs.appendFileSync(logPath, logEntry);
    console.log(`✓ Snapshot logged (version: ${version})`);
  } catch (err) {
    console.error('❌ Failed to log snapshot info:', err);
  }
});
