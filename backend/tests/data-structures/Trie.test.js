const { Trie, TrieNode } = require('../../src/data-structures');

describe('Trie', () => {
  let trie;

  beforeEach(() => {
    trie = new Trie();
  });

  describe('constructor', () => {
    test('should create an empty Trie with root node', () => {
      expect(trie.root).toBeInstanceOf(TrieNode);
      expect(trie.getWordCount()).toBe(0);
    });
  });

  describe('insert', () => {
    test('should insert a single word', () => {
      trie.insert('hello');
      expect(trie.contains('hello')).toBe(true);
      expect(trie.getWordCount()).toBe(1);
    });

    test('should insert multiple words', () => {
      trie.insert('hello');
      trie.insert('world');
      trie.insert('help');
      
      expect(trie.contains('hello')).toBe(true);
      expect(trie.contains('world')).toBe(true);
      expect(trie.contains('help')).toBe(true);
      expect(trie.getWordCount()).toBe(3);
    });

    test('should insert word with custom frequency', () => {
      trie.insert('hello', 5);
      expect(trie.getFrequency('hello')).toBe(5);
    });

    test('should handle case insensitive insertion', () => {
      trie.insert('Hello');
      trie.insert('HELLO');
      
      expect(trie.contains('hello')).toBe(true);
      expect(trie.getWordCount()).toBe(1); // Should not create duplicate
    });

    test('should trim whitespace from words', () => {
      trie.insert('  hello  ');
      expect(trie.contains('hello')).toBe(true);
      expect(trie.contains('  hello  ')).toBe(true); // Should normalize input
    });

    test('should throw error for invalid input', () => {
      expect(() => trie.insert('')).toThrow('Word must be a non-empty string');
      expect(() => trie.insert(null)).toThrow('Word must be a non-empty string');
      expect(() => trie.insert(123)).toThrow('Word must be a non-empty string');
      expect(() => trie.insert('hello', -1)).toThrow('Frequency must be non-negative');
      expect(() => trie.insert('   ')).toThrow('Word cannot be empty after normalization');
    });

    test('should handle words with shared prefixes', () => {
      trie.insert('cat');
      trie.insert('car');
      trie.insert('card');
      trie.insert('care');
      
      expect(trie.contains('cat')).toBe(true);
      expect(trie.contains('car')).toBe(true);
      expect(trie.contains('card')).toBe(true);
      expect(trie.contains('care')).toBe(true);
      expect(trie.getWordCount()).toBe(4);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      trie.insert('apple', 10);
      trie.insert('application', 8);
      trie.insert('apply', 6);
      trie.insert('appreciate', 4);
      trie.insert('approach', 2);
      trie.insert('banana', 5);
    });

    test('should return empty array for empty prefix', () => {
      expect(trie.search('')).toEqual([]);
      expect(trie.search(null)).toEqual([]);
    });

    test('should return words matching prefix', () => {
      const results = trie.search('app');
      expect(results).toHaveLength(5);
      
      const words = results.map(r => r.word);
      expect(words).toContain('apple');
      expect(words).toContain('application');
      expect(words).toContain('apply');
      expect(words).toContain('appreciate');
      expect(words).toContain('approach');
    });

    test('should return results sorted by frequency (descending)', () => {
      const results = trie.search('app');
      expect(results[0].word).toBe('apple');
      expect(results[0].frequency).toBe(10);
      expect(results[1].word).toBe('application');
      expect(results[1].frequency).toBe(8);
      expect(results[4].word).toBe('approach');
      expect(results[4].frequency).toBe(2);
    });

    test('should respect limit parameter', () => {
      const results = trie.search('app', 3);
      expect(results).toHaveLength(3);
      expect(results[0].word).toBe('apple');
      expect(results[1].word).toBe('application');
      expect(results[2].word).toBe('apply');
    });

    test('should return empty array for non-existent prefix', () => {
      const results = trie.search('xyz');
      expect(results).toEqual([]);
    });

    test('should handle case insensitive search', () => {
      const results = trie.search('APP');
      expect(results).toHaveLength(5);
      expect(results[0].word).toBe('apple');
    });

    test('should handle exact word match', () => {
      const results = trie.search('apple');
      expect(results).toHaveLength(1);
      expect(results[0].word).toBe('apple');
      expect(results[0].frequency).toBe(10);
    });
  });

  describe('incrementFrequency', () => {
    beforeEach(() => {
      trie.insert('hello', 5);
      trie.insert('world', 3);
    });

    test('should increment frequency of existing word', () => {
      expect(trie.incrementFrequency('hello')).toBe(true);
      expect(trie.getFrequency('hello')).toBe(6);
    });

    test('should increment frequency by custom amount', () => {
      expect(trie.incrementFrequency('hello', 3)).toBe(true);
      expect(trie.getFrequency('hello')).toBe(8);
    });

    test('should return false for non-existent word', () => {
      expect(trie.incrementFrequency('nonexistent')).toBe(false);
    });

    test('should handle case insensitive increment', () => {
      expect(trie.incrementFrequency('HELLO')).toBe(true);
      expect(trie.getFrequency('hello')).toBe(6);
    });

    test('should throw error for invalid increment', () => {
      expect(() => trie.incrementFrequency('hello', 0)).toThrow('Increment must be positive');
      expect(() => trie.incrementFrequency('hello', -1)).toThrow('Increment must be positive');
    });

    test('should return false for invalid input', () => {
      expect(trie.incrementFrequency('')).toBe(false);
      expect(trie.incrementFrequency(null)).toBe(false);
    });
  });

  describe('contains', () => {
    beforeEach(() => {
      trie.insert('hello');
      trie.insert('world');
    });

    test('should return true for existing words', () => {
      expect(trie.contains('hello')).toBe(true);
      expect(trie.contains('world')).toBe(true);
    });

    test('should return false for non-existent words', () => {
      expect(trie.contains('nonexistent')).toBe(false);
      expect(trie.contains('hel')).toBe(false); // Prefix but not complete word
    });

    test('should handle case insensitive check', () => {
      expect(trie.contains('HELLO')).toBe(true);
      expect(trie.contains('Hello')).toBe(true);
    });

    test('should return false for invalid input', () => {
      expect(trie.contains('')).toBe(false);
      expect(trie.contains(null)).toBe(false);
      expect(trie.contains(123)).toBe(false);
    });
  });

  describe('getFrequency', () => {
    beforeEach(() => {
      trie.insert('hello', 5);
      trie.insert('world', 3);
    });

    test('should return correct frequency for existing words', () => {
      expect(trie.getFrequency('hello')).toBe(5);
      expect(trie.getFrequency('world')).toBe(3);
    });

    test('should return 0 for non-existent words', () => {
      expect(trie.getFrequency('nonexistent')).toBe(0);
    });

    test('should handle case insensitive lookup', () => {
      expect(trie.getFrequency('HELLO')).toBe(5);
    });

    test('should return 0 for invalid input', () => {
      expect(trie.getFrequency('')).toBe(0);
      expect(trie.getFrequency(null)).toBe(0);
    });
  });

  describe('getAllWordsInTrie', () => {
    test('should return empty array for empty trie', () => {
      expect(trie.getAllWordsInTrie()).toEqual([]);
    });

    test('should return all words sorted by frequency', () => {
      trie.insert('apple', 10);
      trie.insert('banana', 5);
      trie.insert('cherry', 15);
      
      const results = trie.getAllWordsInTrie();
      expect(results).toHaveLength(3);
      expect(results[0].word).toBe('cherry');
      expect(results[0].frequency).toBe(15);
      expect(results[1].word).toBe('apple');
      expect(results[1].frequency).toBe(10);
      expect(results[2].word).toBe('banana');
      expect(results[2].frequency).toBe(5);
    });
  });

  describe('clear', () => {
    test('should clear all data from trie', () => {
      trie.insert('hello');
      trie.insert('world');
      expect(trie.getWordCount()).toBe(2);
      
      trie.clear();
      expect(trie.getWordCount()).toBe(0);
      expect(trie.contains('hello')).toBe(false);
      expect(trie.contains('world')).toBe(false);
    });
  });

  describe('getStats', () => {
    test('should return correct stats for empty trie', () => {
      const stats = trie.getStats();
      expect(stats.wordCount).toBe(0);
      expect(stats.nodeCount).toBe(1); // Root node
      expect(stats.maxDepth).toBe(0);
    });

    test('should return correct stats for populated trie', () => {
      trie.insert('cat');
      trie.insert('car');
      trie.insert('card');
      
      const stats = trie.getStats();
      expect(stats.wordCount).toBe(3);
      expect(stats.nodeCount).toBeGreaterThan(3); // Root + internal nodes + end nodes
      expect(stats.maxDepth).toBeGreaterThan(0);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle single character words', () => {
      trie.insert('a');
      trie.insert('i');
      
      expect(trie.contains('a')).toBe(true);
      expect(trie.contains('i')).toBe(true);
      expect(trie.search('a')).toHaveLength(1);
    });

    test('should handle very long words', () => {
      const longWord = 'a'.repeat(1000);
      trie.insert(longWord);
      
      expect(trie.contains(longWord)).toBe(true);
      expect(trie.search('a')).toHaveLength(1);
    });

    test('should handle special characters', () => {
      trie.insert('hello-world');
      trie.insert('test@example.com');
      trie.insert('file.txt');
      
      expect(trie.contains('hello-world')).toBe(true);
      expect(trie.contains('test@example.com')).toBe(true);
      expect(trie.contains('file.txt')).toBe(true);
    });

    test('should handle unicode characters', () => {
      trie.insert('café');
      trie.insert('naïve');
      trie.insert('résumé');
      
      expect(trie.contains('café')).toBe(true);
      expect(trie.contains('naïve')).toBe(true);
      expect(trie.contains('résumé')).toBe(true);
    });

    test('should handle numbers in words', () => {
      trie.insert('test123');
      trie.insert('version2.0');
      
      expect(trie.contains('test123')).toBe(true);
      expect(trie.contains('version2.0')).toBe(true);
    });
  });

  describe('performance characteristics', () => {
    test('should handle large number of insertions efficiently', () => {
      const startTime = Date.now();
      
      // Insert 1000 words
      for (let i = 0; i < 1000; i++) {
        trie.insert(`word${i}`, i);
      }
      
      const insertTime = Date.now() - startTime;
      expect(insertTime).toBeLessThan(1000); // Should complete within 1 second
      expect(trie.getWordCount()).toBe(1000);
    });

    test('should handle large number of searches efficiently', () => {
      // Setup: Insert words with common prefixes
      for (let i = 0; i < 100; i++) {
        trie.insert(`test${i}`, i);
      }
      
      const startTime = Date.now();
      
      // Perform 100 searches
      for (let i = 0; i < 100; i++) {
        trie.search('test');
      }
      
      const searchTime = Date.now() - startTime;
      expect(searchTime).toBeLessThan(100); // Should complete within 100ms
    });
  });
});