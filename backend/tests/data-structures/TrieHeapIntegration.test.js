const { Trie, MaxHeap } = require('../../src/data-structures');

describe('Trie and MaxHeap Integration', () => {
  let trie;

  beforeEach(() => {
    trie = new Trie();
    
    // Insert test data with various frequencies
    const testData = [
      { word: 'apple', frequency: 15 },
      { word: 'application', frequency: 8 },
      { word: 'apply', frequency: 12 },
      { word: 'appreciate', frequency: 5 },
      { word: 'approach', frequency: 20 },
      { word: 'appropriate', frequency: 3 },
      { word: 'banana', frequency: 10 },
      { word: 'band', frequency: 7 },
      { word: 'bank', frequency: 25 },
      { word: 'basic', frequency: 18 }
    ];

    testData.forEach(({ word, frequency }) => {
      trie.insert(word, frequency);
    });
  });

  describe('search with heap-based ranking', () => {
    test('should return top suggestions ranked by frequency', () => {
      const results = trie.search('app', 3);
      
      expect(results).toHaveLength(3);
      expect(results[0].word).toBe('approach');
      expect(results[0].frequency).toBe(20);
      expect(results[1].word).toBe('apple');
      expect(results[1].frequency).toBe(15);
      expect(results[2].word).toBe('apply');
      expect(results[2].frequency).toBe(12);
    });

    test('should handle prefix with many matches', () => {
      const results = trie.search('app', 5);
      
      expect(results).toHaveLength(5);
      
      // Verify descending frequency order
      const frequencies = results.map(r => r.frequency);
      expect(frequencies).toEqual([20, 15, 12, 8, 5]);
      
      // Verify all words start with 'app'
      results.forEach(result => {
        expect(result.word.toLowerCase().startsWith('app')).toBe(true);
      });
    });

    test('should limit results correctly', () => {
      const results1 = trie.search('app', 1);
      const results2 = trie.search('app', 2);
      const results10 = trie.search('app', 10);
      
      expect(results1).toHaveLength(1);
      expect(results1[0].word).toBe('approach');
      
      expect(results2).toHaveLength(2);
      expect(results2[0].word).toBe('approach');
      expect(results2[1].word).toBe('apple');
      
      expect(results10).toHaveLength(6); // All 'app' prefixed words
    });

    test('should handle prefix with no matches', () => {
      const results = trie.search('xyz', 5);
      expect(results).toEqual([]);
    });

    test('should handle single character prefix', () => {
      const results = trie.search('b', 3);
      
      expect(results).toHaveLength(3);
      expect(results[0].word).toBe('bank');
      expect(results[0].frequency).toBe(25);
      expect(results[1].word).toBe('basic');
      expect(results[1].frequency).toBe(18);
      expect(results[2].word).toBe('banana');
      expect(results[2].frequency).toBe(10);
    });
  });

  describe('performance comparison', () => {
    beforeEach(() => {
      // Insert a larger dataset for performance testing
      const words = [];
      for (let i = 0; i < 1000; i++) {
        words.push({
          word: `test${i}`,
          frequency: Math.floor(Math.random() * 100) + 1
        });
      }
      
      words.forEach(({ word, frequency }) => {
        trie.insert(word, frequency);
      });
    });

    test('should perform efficiently with large dataset', () => {
      const startTime = Date.now();
      const results = trie.search('test', 10);
      const endTime = Date.now();
      
      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      
      // Verify results are properly ranked
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].frequency).toBeGreaterThanOrEqual(results[i].frequency);
      }
    });
  });

  describe('frequency updates and ranking', () => {
    test('should update rankings when frequencies change', () => {
      // Initial search
      let results = trie.search('app', 3);
      expect(results[0].word).toBe('approach'); // frequency: 20
      expect(results[1].word).toBe('apple'); // frequency: 15
      
      // Increment apple's frequency to make it highest
      trie.incrementFrequency('apple', 10); // Now 25
      
      // Search again
      results = trie.search('app', 3);
      expect(results[0].word).toBe('apple'); // Now highest with frequency: 25
      expect(results[0].frequency).toBe(25);
      expect(results[1].word).toBe('approach'); // Still 20
    });

    test('should handle multiple frequency updates', () => {
      // Update multiple words
      trie.incrementFrequency('application', 15); // 8 -> 23
      trie.incrementFrequency('appreciate', 20); // 5 -> 25
      
      const results = trie.search('app', 5);
      
      expect(results[0].word).toBe('appreciate');
      expect(results[0].frequency).toBe(25);
      expect(results[1].word).toBe('application');
      expect(results[1].frequency).toBe(23);
      expect(results[2].word).toBe('approach');
      expect(results[2].frequency).toBe(20);
    });
  });

  describe('edge cases with heap integration', () => {
    test('should handle words with same frequency', () => {
      // Insert words with identical frequencies
      trie.insert('same1', 10);
      trie.insert('same2', 10);
      trie.insert('same3', 10);
      
      const results = trie.search('same', 3);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.frequency).toBe(10);
        expect(result.word.startsWith('same')).toBe(true);
      });
    });

    test('should handle zero frequency words', () => {
      trie.insert('zero1', 0);
      trie.insert('zero2', 0);
      trie.insert('zero3', 5);
      
      const results = trie.search('zero', 3);
      
      expect(results).toHaveLength(3);
      expect(results[0].frequency).toBe(5); // Highest frequency first
      expect(results[1].frequency).toBe(0);
      expect(results[2].frequency).toBe(0);
    });

    test('should handle very large frequencies', () => {
      trie.insert('large1', Number.MAX_SAFE_INTEGER);
      trie.insert('large2', Number.MAX_SAFE_INTEGER - 1);
      trie.insert('large3', 1);
      
      const results = trie.search('large', 3);
      
      expect(results).toHaveLength(3);
      expect(results[0].frequency).toBe(Number.MAX_SAFE_INTEGER);
      expect(results[1].frequency).toBe(Number.MAX_SAFE_INTEGER - 1);
      expect(results[2].frequency).toBe(1);
    });
  });

  describe('MaxHeap static method integration', () => {
    test('should work with Trie search results', () => {
      // Get all words with 'app' prefix
      const allResults = [];
      const currentNode = trie.root.getChild('a').getChild('p').getChild('p');
      trie.getAllWords(currentNode, 'app', allResults);
      
      // Use MaxHeap static method to get top 3
      const top3 = MaxHeap.getTopKFromArray(allResults, 3);
      
      expect(top3).toHaveLength(3);
      expect(top3[0].frequency).toBe(20); // approach
      expect(top3[1].frequency).toBe(15); // apple
      expect(top3[2].frequency).toBe(12); // apply
      
      // Should match Trie.search results
      const trieResults = trie.search('app', 3);
      expect(top3).toEqual(trieResults);
    });
  });
});