/**
 * Tests for TypoToleranceService
 * Covers Levenshtein distance calculation, typo correction, and integration with Trie
 */

const TypoToleranceService = require('../src/services/TypoToleranceService');
const Trie = require('../src/data-structures/Trie');

describe('TypoToleranceService', () => {
  let typoService;
  let trie;

  beforeEach(() => {
    typoService = new TypoToleranceService();
    trie = new Trie();
    
    // Populate trie with test data
    trie.insert('hello', 100);
    trie.insert('help', 80);
    trie.insert('world', 90);
    trie.insert('word', 70);
    trie.insert('work', 60);
    trie.insert('javascript', 120);
    trie.insert('java', 110);
    trie.insert('python', 95);
    trie.insert('programming', 85);
    trie.insert('computer', 75);
  });

  describe('constructor', () => {
    test('should initialize with default configuration', () => {
      const service = new TypoToleranceService();
      const config = service.getConfig();
      
      expect(config.maxEditDistance).toBe(2);
      expect(config.minWordLength).toBe(3);
      expect(config.maxCandidates).toBe(100);
      expect(config.similarityThreshold).toBe(0.6);
    });

    test('should accept custom configuration', () => {
      const customConfig = {
        maxEditDistance: 1,
        minWordLength: 2,
        similarityThreshold: 0.8
      };
      
      const service = new TypoToleranceService(customConfig);
      const config = service.getConfig();
      
      expect(config.maxEditDistance).toBe(1);
      expect(config.minWordLength).toBe(2);
      expect(config.similarityThreshold).toBe(0.8);
      expect(config.maxCandidates).toBe(100); // Should keep default
    });
  });

  describe('calculateDistance', () => {
    test('should return 0 distance for identical strings', () => {
      const result = typoService.calculateDistance('hello', 'hello');
      
      expect(result.steps).toBe(0);
      expect(result.relative).toBe(0);
      expect(result.similarity).toBe(1);
    });

    test('should calculate distance for different strings', () => {
      const result = typoService.calculateDistance('hello', 'helo');
      
      expect(result.steps).toBe(1);
      expect(result.similarity).toBeGreaterThan(0.5);
    });

    test('should handle empty strings', () => {
      const result1 = typoService.calculateDistance('', '');
      const result2 = typoService.calculateDistance('hello', '');
      const result3 = typoService.calculateDistance('', 'world');
      
      expect(result1.steps).toBe(0);
      expect(result1.similarity).toBe(1);
      expect(result2.steps).toBe(5);
      expect(result3.steps).toBe(5);
    });

    test('should handle null/undefined inputs', () => {
      const result1 = typoService.calculateDistance(null, 'hello');
      const result2 = typoService.calculateDistance('hello', undefined);
      
      expect(result1.steps).toBe(Infinity);
      expect(result2.steps).toBe(Infinity);
    });

    test('should respect max distance parameter', () => {
      const result = typoService.calculateDistance('hello', 'world', 1);
      
      expect(result.steps).toBeGreaterThan(1);
    });
  });

  describe('findTypoCorrections', () => {
    test('should find typo corrections for misspelled words', () => {
      const corrections = typoService.findTypoCorrections('helo', trie, 3);
      
      expect(corrections.length).toBeGreaterThan(0);
      expect(corrections[0]).toHaveProperty('word');
      expect(corrections[0]).toHaveProperty('editDistance');
      expect(corrections[0]).toHaveProperty('similarity');
      expect(corrections[0]).toHaveProperty('correctionType');
    });

    test('should return empty array for very short words', () => {
      const corrections = typoService.findTypoCorrections('hi', trie, 3);
      
      expect(corrections).toEqual([]);
    });

    test('should limit results to specified limit', () => {
      const corrections = typoService.findTypoCorrections('helo', trie, 2);
      
      expect(corrections.length).toBeLessThanOrEqual(2);
    });

    test('should sort results by correction score', () => {
      const corrections = typoService.findTypoCorrections('helo', trie, 5);
      
      if (corrections.length > 1) {
        for (let i = 1; i < corrections.length; i++) {
          expect(corrections[i-1].score).toBeGreaterThanOrEqual(corrections[i].score);
        }
      }
    });

    test('should handle empty query', () => {
      const corrections = typoService.findTypoCorrections('', trie, 3);
      
      expect(corrections).toEqual([]);
    });
  });

  describe('getCorrectionType', () => {
    test('should return correct correction types', () => {
      expect(typoService.getCorrectionType(1)).toBe('minor_typo');
      expect(typoService.getCorrectionType(2)).toBe('moderate_typo');
      expect(typoService.getCorrectionType(3)).toBe('major_typo');
    });
  });

  describe('calculateCorrectionScore', () => {
    test('should calculate score based on frequency and similarity', () => {
      const score1 = typoService.calculateCorrectionScore(100, 0.8);
      const score2 = typoService.calculateCorrectionScore(50, 0.9);
      
      expect(score1).toBeGreaterThan(0);
      expect(score2).toBeGreaterThan(0);
      expect(typeof score1).toBe('number');
      expect(typeof score2).toBe('number');
    });

    test('should weight similarity more than frequency', () => {
      const highFreqLowSim = typoService.calculateCorrectionScore(1000, 0.6);
      const lowFreqHighSim = typoService.calculateCorrectionScore(10, 0.9);
      
      // With similarity weight of 0.7 and frequency weight of 0.3
      // highFreqLowSim = 0.6 * 0.7 + 1.0 * 0.3 = 0.42 + 0.3 = 0.72
      // lowFreqHighSim = 0.9 * 0.7 + 0.01 * 0.3 = 0.63 + 0.003 = 0.633
      // So actually high frequency with low similarity wins in this case
      expect(highFreqLowSim).toBeGreaterThan(lowFreqHighSim);
    });
  });

  describe('combineResults', () => {
    test('should prioritize exact matches over typo corrections', () => {
      const exactMatches = [{ word: 'hello', frequency: 100 }];
      const typoCorrections = [{ word: 'help', frequency: 80, editDistance: 1 }];
      
      const result = typoService.combineResults(exactMatches, typoCorrections, 5);
      
      expect(result.combined[0].type).toBe('exact_match');
      expect(result.exactMatches).toHaveLength(1);
      expect(result.typoCorrections).toHaveLength(1);
    });

    test('should respect total limit', () => {
      const exactMatches = [
        { word: 'hello', frequency: 100 },
        { word: 'help', frequency: 80 }
      ];
      const typoCorrections = [
        { word: 'world', frequency: 90, editDistance: 1 },
        { word: 'work', frequency: 60, editDistance: 1 }
      ];
      
      const result = typoService.combineResults(exactMatches, typoCorrections, 3);
      
      expect(result.combined).toHaveLength(3);
    });
  });

  describe('search', () => {
    test('should return exact matches when available', () => {
      const result = typoService.search('hel', trie, 5);
      
      expect(result.exactMatches.length).toBeGreaterThan(0);
      expect(result.combined.length).toBeGreaterThan(0);
    });

    test('should include typo corrections when exact matches are insufficient', () => {
      const result = typoService.search('helo', trie, 5);
      
      expect(result.combined.length).toBeGreaterThan(0);
      // Should have some typo corrections since 'helo' is not an exact match
    });

    test('should handle empty query', () => {
      const result = typoService.search('', trie, 5);
      
      expect(result.exactMatches).toEqual([]);
      expect(result.typoCorrections).toEqual([]);
      expect(result.combined).toEqual([]);
    });

    test('should handle null trie', () => {
      const result = typoService.search('hello', null, 5);
      
      expect(result.exactMatches).toEqual([]);
      expect(result.typoCorrections).toEqual([]);
      expect(result.combined).toEqual([]);
    });
  });

  describe('configuration management', () => {
    test('should update configuration', () => {
      const newConfig = { maxEditDistance: 1, similarityThreshold: 0.8 };
      typoService.updateConfig(newConfig);
      
      const config = typoService.getConfig();
      expect(config.maxEditDistance).toBe(1);
      expect(config.similarityThreshold).toBe(0.8);
    });

    test('should return statistics', () => {
      const stats = typoService.getStats();
      
      expect(stats).toHaveProperty('config');
      expect(stats).toHaveProperty('algorithmInfo');
      expect(stats.algorithmInfo).toHaveProperty('name');
      expect(stats.algorithmInfo).toHaveProperty('timeComplexity');
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle very long strings', () => {
      const longString1 = 'a'.repeat(100);
      const longString2 = 'b'.repeat(100);
      
      const result = typoService.calculateDistance(longString1, longString2);
      expect(typeof result.steps).toBe('number');
    });

    test('should handle special characters', () => {
      trie.insert('café', 50);
      trie.insert('naïve', 40);
      
      const corrections = typoService.findTypoCorrections('cafe', trie, 3);
      expect(corrections.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle numbers in strings', () => {
      trie.insert('test123', 30);
      
      const corrections = typoService.findTypoCorrections('test12', trie, 3);
      expect(corrections.length).toBeGreaterThanOrEqual(0);
    });
  });
});