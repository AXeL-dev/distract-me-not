/**
 * Test pattern normalization
 */

console.log('\n=== PATTERN NORMALIZATION TEST ===');
const patterns = ['iptorrents.com', 'IPTorrents.com', 'IPTORRENTS.COM'];
patterns.forEach(p => console.log(`Original: '${p}' -> Normalized: '${p.toLowerCase().trim()}'`));

// Test the functions that add patterns to blacklist
// Simulated function to add a pattern to blacklist
function addToBlacklist(pattern) {
  // Simulate what the extension is doing - is it preserving case?
  const normalizedPattern = pattern.toLowerCase().trim();
  console.log(`Adding to blacklist - Original: '${pattern}', Stored as: '${normalizedPattern}'`);
  return normalizedPattern;
}

console.log('\n=== BLACKLIST ADDITION TEST ===');
patterns.forEach(p => addToBlacklist(p));
