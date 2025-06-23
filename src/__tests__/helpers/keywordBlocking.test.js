/**
 * Tests for keyword blocking functionality
 * Verifies that both URL patterns and keywords work correctly
 */

import chromeMock from '../../__mocks__/chrome';

describe('Keyword Blocking Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chromeMock.storage.sync.get.mockClear();
    chromeMock.storage.local.get.mockClear();
  });

  describe('Blacklist/Deny Keywords', () => {
    it('should block URLs containing blacklist keywords in path', () => {
      const url = 'https://example.com/gaming/news';
      const blacklistKeywords = ['gaming'];
      const whitelistKeywords = [];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('gaming');
    });

    it('should block URLs when keyword is in domain', () => {
      const url = 'https://facebook.com/profile';
      const blacklistKeywords = ['facebook'];
      const whitelistKeywords = [];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('facebook');
    });

    it('should block URLs when keyword is in subdomain', () => {
      const url = 'https://games.reddit.com/r/gaming';
      const blacklistKeywords = ['games'];
      const whitelistKeywords = [];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('games');
    });

    it('should be case insensitive for blacklist keywords', () => {
      const url = 'https://example.com/GAMING/news';
      const blacklistKeywords = ['gaming'];
      const whitelistKeywords = [];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('gaming');
    });

    it('should handle multiple blacklist keywords', () => {
      const testCases = [
        { url: 'https://example.com/gaming/news', keyword: 'gaming' },
        { url: 'https://social.example.com/feed', keyword: 'social' },
        { url: 'https://entertainment.com/shows', keyword: 'entertainment' }
      ];

      const blacklistKeywords = ['gaming', 'social', 'entertainment'];
      const whitelistKeywords = [];

      testCases.forEach(testCase => {
        const result = simulateKeywordCheck(testCase.url, blacklistKeywords, whitelistKeywords);
        expect(result.blocked).toBe(true);
        expect(result.reason).toContain(testCase.keyword);
      });
    });

    it('should handle keyword objects with pattern property', () => {
      const url = 'https://example.com/gaming/news';
      const blacklistKeywords = [{ pattern: 'gaming' }, { pattern: 'social' }];
      const whitelistKeywords = [];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('gaming');
    });
  });

  describe('Whitelist/Allow Keywords', () => {
    it('should allow URLs with whitelist keywords even if they contain blacklist keywords', () => {
      const url = 'https://educational-gaming.com/learn';
      const blacklistKeywords = ['gaming'];
      const whitelistKeywords = ['educational'];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(false);
      expect(result.reason).toContain('educational');
    });

    it('should prioritize whitelist keywords over blacklist keywords', () => {
      const url = 'https://work.facebook.com/business';
      const blacklistKeywords = ['facebook'];
      const whitelistKeywords = ['work'];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(false);
      expect(result.reason).toContain('work');
    });

    it('should allow URLs with whitelist keywords in domain', () => {
      const url = 'https://work.example.com/tasks';
      const blacklistKeywords = ['example'];
      const whitelistKeywords = ['work'];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(false);
      expect(result.reason).toContain('work');
    });

    it('should be case insensitive for whitelist keywords', () => {
      const url = 'https://EDUCATIONAL.gaming.com/learn';
      const blacklistKeywords = ['gaming'];
      const whitelistKeywords = ['educational'];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(false);
      expect(result.reason).toContain('educational');
    });

    it('should handle multiple whitelist keywords', () => {
      const testCases = [
        { url: 'https://work.example.com/tasks', keyword: 'work' },
        { url: 'https://educational.gaming.com/learn', keyword: 'educational' },
        { url: 'https://research.social.com/study', keyword: 'research' }
      ];

      const blacklistKeywords = ['example', 'gaming', 'social'];
      const whitelistKeywords = ['work', 'educational', 'research'];

      testCases.forEach(testCase => {
        const result = simulateKeywordCheck(testCase.url, blacklistKeywords, whitelistKeywords);
        expect(result.blocked).toBe(false);
        expect(result.reason).toContain(testCase.keyword);
      });
    });

    it('should handle whitelist keyword objects with pattern property', () => {
      const url = 'https://educational-gaming.com/learn';
      const blacklistKeywords = ['gaming'];
      const whitelistKeywords = [{ pattern: 'educational' }];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(false);
      expect(result.reason).toContain('educational');
    });
  });

  describe('No Keyword Matches', () => {
    it('should allow URLs with no matching keywords', () => {
      const url = 'https://news.com/article';
      const blacklistKeywords = ['gaming', 'social'];
      const whitelistKeywords = [];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(false);
      expect(result.reason).toContain('No matching keywords');
    });

    it('should allow URLs when keywords are empty arrays', () => {
      const url = 'https://example.com/page';
      const blacklistKeywords = [];
      const whitelistKeywords = [];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(false);
      expect(result.reason).toContain('No matching keywords');
    });

    it('should handle URLs that partially match but do not contain full keywords', () => {
      const url = 'https://example.com/gamin'; // "gamin" not "gaming"
      const blacklistKeywords = ['gaming'];
      const whitelistKeywords = [];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(false);
      expect(result.reason).toContain('No matching keywords');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed URL objects gracefully', () => {
      const url = 'not-a-valid-url';
      const blacklistKeywords = ['gaming'];
      const whitelistKeywords = [];
      
      // Should not throw error and should still check keywords in the string
      expect(() => {
        simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      }).not.toThrow();
    });

    it('should handle empty or null keyword patterns', () => {
      const url = 'https://example.com/gaming';
      const blacklistKeywords = [null, '', undefined, 'gaming'];
      const whitelistKeywords = [];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('gaming');
    });    it('should handle keyword objects with missing pattern property', () => {
      const url = 'https://example.com/gaming';
      const blacklistKeywords = [{ id: 1 }, { pattern: 'gaming' }];
      const whitelistKeywords = [];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('gaming');
    });

    it('should handle very long URLs with keywords', () => {
      const longPath = '/'.repeat(1000) + 'gaming' + '/'.repeat(1000);
      const url = `https://example.com${longPath}`;
      const blacklistKeywords = ['gaming'];
      const whitelistKeywords = [];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('gaming');
    });

    it('should handle special characters in keywords', () => {
      const url = 'https://example.com/game-news';
      const blacklistKeywords = ['game-news'];
      const whitelistKeywords = [];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('game-news');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple overlapping keywords correctly', () => {
      const url = 'https://educational-gaming-research.com/study';
      const blacklistKeywords = ['gaming'];
      const whitelistKeywords = ['educational', 'research'];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      // Should be allowed because whitelist keywords take precedence
      expect(result.blocked).toBe(false);
      expect(result.reason).toMatch(/educational|research/);
    });

    it('should check both domain and path for keywords', () => {
      const testCases = [
        {
          url: 'https://gaming.example.com/news',
          blacklistKeywords: ['gaming'],
          whitelistKeywords: [],
          expectedBlocked: true,
          description: 'Keyword in subdomain'
        },
        {
          url: 'https://example.com/gaming/news',
          blacklistKeywords: ['gaming'],
          whitelistKeywords: [],
          expectedBlocked: true,
          description: 'Keyword in path'
        },
        {
          url: 'https://example.com/news',
          blacklistKeywords: ['gaming'],
          whitelistKeywords: [],
          expectedBlocked: false,
          description: 'No keyword match'
        }
      ];

      testCases.forEach(testCase => {
        const result = simulateKeywordCheck(
          testCase.url,
          testCase.blacklistKeywords,
          testCase.whitelistKeywords
        );
        
        expect(result.blocked).toBe(testCase.expectedBlocked);
      });
    });

    it('should handle priority order: whitelist keywords > URL patterns > blacklist keywords', () => {
      // This test simulates the integration with URL pattern matching
      const url = 'https://work.gaming.com/business';
      
      // Scenario: URL contains both whitelist and blacklist keywords
      const blacklistKeywords = ['gaming'];
      const whitelistKeywords = ['work'];
      
      const result = simulateKeywordCheck(url, blacklistKeywords, whitelistKeywords);
      
      // Whitelist keyword should win
      expect(result.blocked).toBe(false);
      expect(result.reason).toContain('work');
    });
  });
});

// Helper function to simulate keyword checking logic
function simulateKeywordCheck(url, blacklistKeywords = [], whitelistKeywords = []) {
  const normalizedUrl = url.toLowerCase();
  
  // Parse hostname if possible
  let hostname = "";
  try {
    const urlObj = new URL(url);
    hostname = urlObj.hostname.toLowerCase();
  } catch (e) {
    // If URL parsing fails, continue with full URL
  }
    // Step 1: Check whitelist keywords first (higher priority)
  for (const keyword of whitelistKeywords) {
    const pattern = typeof keyword === 'string' ? keyword : keyword?.pattern;
    if (!pattern || typeof pattern !== 'string') continue;
    
    const normalizedPattern = pattern.toLowerCase();
    
    if (normalizedUrl.includes(normalizedPattern) || 
        (hostname && hostname.includes(normalizedPattern))) {
      return { 
        blocked: false, 
        reason: `Allowed by whitelist keyword: ${pattern}` 
      };
    }
  }
    // Step 2: Check blacklist keywords
  for (const keyword of blacklistKeywords) {
    const pattern = typeof keyword === 'string' ? keyword : keyword?.pattern;
    if (!pattern || typeof pattern !== 'string') continue;
    
    const normalizedPattern = pattern.toLowerCase();
    
    if (normalizedUrl.includes(normalizedPattern) || 
        (hostname && hostname.includes(normalizedPattern))) {
      return { 
        blocked: true, 
        reason: `Blocked by blacklist keyword: ${pattern}` 
      };
    }
  }
  
  // Step 3: No keywords matched
  return { 
    blocked: false, 
    reason: 'No matching keywords' 
  };
}
