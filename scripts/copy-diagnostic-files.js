/**
 * This script copies all diagnostic files to the build directory.
 * It's used as part of the build process to ensure that diagnostic tools
 * are available in the built extension.
 */

const fs = require('fs');
const path = require('path');

// Paths
const BUILD_DIR = path.join(__dirname, '../build');
const PROJECT_ROOT = path.join(__dirname, '..');

// List of diagnostic files to copy with their source directories
// Path is relative to project root
const diagnosticFiles = [  { file: 'sync-diagnostics.html', source: '' },
  { file: 'sync-diagnostics-debug.html', source: '' },
  { file: 'sync-diagnostics-debug.js', source: '' },
  { file: 'browser-polyfill-debug.js', source: '' },
  { file: 'sync-status.html', source: '' },
  { file: 'test-sync-rules.js', source: '' },
  { file: 'run-sync-test.js', source: 'public' },
  { file: 'service-worker-sync-logging.js', source: 'public' },
  { file: 'service-worker-helpers.js', source: 'public' },
  { file: 'communication-test.html', source: '' },
  { file: 'simple-test.html', source: '' }
];

// Ensure build directory exists
if (!fs.existsSync(BUILD_DIR)) {
  console.error('❌ Error: Build directory does not exist. Run build first.');
  process.exit(1);
}

console.log('Copying diagnostic files to build directory...');

let missingFiles = [];
let copiedFiles = [];

for (const item of diagnosticFiles) {
  const file = item.file;
  const sourcePath = item.source 
    ? path.join(PROJECT_ROOT, item.source, file) 
    : path.join(PROJECT_ROOT, file);
  const destPath = path.join(BUILD_DIR, file);
  
  // Check if source file exists before copying
  if (fs.existsSync(sourcePath)) {
    try {
      fs.copyFileSync(sourcePath, destPath);
      copiedFiles.push(file);
      console.log(`✓ Copied ${file} from ${item.source || 'root'} directory`);
    } catch (copyError) {
      console.error(`❌ Error copying ${file}:`, copyError.message);
    }
  } else {
    missingFiles.push(file);
    console.warn(`⚠️ Warning: Source file ${file} not found at ${sourcePath}, skipping`);
  }
}

if (copiedFiles.length > 0) {
  console.log(`✅ Successfully copied ${copiedFiles.length} diagnostic files`);
}

if (missingFiles.length > 0) {
  console.warn(`⚠️ Warning: ${missingFiles.length} diagnostic files were not found: ${missingFiles.join(', ')}`);
}
