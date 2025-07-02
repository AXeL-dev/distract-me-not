// Quick test to see current logging pattern
const url = 'https://www.example.com/wet-test';
const keywords = ['wet', 'test', 'example'];

console.log('=== SIMULATING KEYWORD CHECK ===');
for (const keyword of keywords) {
  const pattern = keyword.toLowerCase();
  const isMatch = url.toLowerCase().includes(pattern);
  console.log(`[DMN INFO] Testing deny keyword: "${keyword}" - ${isMatch ? 'MATCH' : 'no match'}`);
}
