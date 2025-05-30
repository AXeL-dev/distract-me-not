/**
 * This script prepares the Chrome build by ensuring libraries are available
 * and properly referenced in the HTML instead of inlined
 * 
 * This script replaces the previous approach of inlining libraries
 * which didn't work with Chrome's Content Security Policy.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Check if cheerio is available, if not suggest installing it
try {
  require.resolve('cheerio');
} catch (e) {
  console.error('Error: cheerio package is required for this script.');
  console.error('Please install it using: npm install cheerio --save-dev');
  process.exit(1);
}

// Paths
const BUILD_DIR = path.join(__dirname, '../build');
const INDEX_HTML = path.join(BUILD_DIR, 'index.html');
const STATIC_JS_DIR = path.join(BUILD_DIR, 'static/js');
const BROWSER_POLYFILL_SRC = path.join(__dirname, '../node_modules/webextension-polyfill/dist/browser-polyfill.min.js');
const BCRYPT_SRC = path.join(__dirname, '../node_modules/bcryptjs/dist/bcrypt.min.js');

// Ensure static/js directory exists
if (!fs.existsSync(STATIC_JS_DIR)) {
  fs.mkdirSync(STATIC_JS_DIR, { recursive: true });
}

// Copy library files to the build directory
function copyLibraryFiles() {
  console.log('Copying library files to build directory...');
  
  // Copy browser-polyfill.min.js to static/js
  try {
    fs.copyFileSync(BROWSER_POLYFILL_SRC, path.join(STATIC_JS_DIR, 'browser-polyfill.min.js'));
    fs.copyFileSync(BROWSER_POLYFILL_SRC, path.join(BUILD_DIR, 'browser-polyfill.min.js'));
    console.log('✓ Copied browser-polyfill.min.js');
  } catch (error) {
    console.error('❌ Error copying browser-polyfill.min.js:', error.message);
    return false;
  }
  
  // Copy bcrypt.min.js to static/js
  try {
    fs.copyFileSync(BCRYPT_SRC, path.join(STATIC_JS_DIR, 'bcrypt.min.js'));
    fs.copyFileSync(BCRYPT_SRC, path.join(BUILD_DIR, 'bcrypt.min.js'));
    console.log('✓ Copied bcrypt.min.js');
  } catch (error) {
    console.error('❌ Error copying bcrypt.min.js:', error.message);
    return false;
  }
  
  return true;
}

// Update the HTML file to use script references instead of inline scripts
function updateHtmlFile() {
  console.log('Updating HTML file to use script references instead of inline scripts...');
  
  try {
    // Read the HTML file
    const htmlContent = fs.readFileSync(INDEX_HTML, 'utf8');
    
    // Load HTML into cheerio
    const $ = cheerio.load(htmlContent);
    
    // Remove any existing script tags for these libraries
    $('script').each(function() {
      const src = $(this).attr('src');
      if (
        src &&
        (
          src.includes('browser-polyfill.min.js') ||
          src.includes('bcrypt.min.js')
        )
      ) {
        $(this).remove();
      }
    });
    
    // Remove any inlined libraries
    $('script').each(function() {
      const content = $(this).html();
      if (
        content &&
        (
          content.includes('webextension-polyfill') ||
          content.includes('bcrypt.js')
        )
      ) {
        $(this).remove();
      }
    });
    
    // Add new script tags at the beginning of body
    $('body').prepend(`
      <script src="/static/js/bcrypt.min.js"></script>
      <script src="/static/js/browser-polyfill.min.js"></script>
    `);
    
    // Write the modified HTML
    fs.writeFileSync(INDEX_HTML, $.html());
    console.log('✓ Updated HTML file with script references');
    
    return true;
  } catch (error) {
    console.error('❌ Error updating HTML file:', error.message);
    return false;
  }
}

// Main execution
console.log('Preparing Chrome build...');
if (copyLibraryFiles() && updateHtmlFile()) {
  console.log('✅ Chrome build preparation completed successfully');
} else {
  console.error('❌ Chrome build preparation failed');
  process.exit(1);
}
