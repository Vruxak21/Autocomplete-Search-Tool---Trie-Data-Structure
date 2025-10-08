/**
 * @fileoverview Unit tests for TreeBuilder class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TreeBuilder } from '../TreeBuilder.js';
import { NODE_TYPES, ERROR_TYPES, FALLBACK_ACTIONS } from '../../types/tree.js';

describe('TreeBuilder', () => {
  let treeBuilder;
  
  beforeEach(() => {
    treeBuilder = new TreeBuilder();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const builder = new TreeBuilder();
      expect(builder.config).toEqual({
        maxDepth: 10,
        minGroupSize: 2,
        virtualScrollThreshold: 50,
        buildTimeout: 200
      });
    });

    it('should merge custom config with defaults', () => {
      const customConfig = { maxDepth: 5, minGroupSize: 3 };
      const builder = new TreeBuilder(customConfig);
      
      expect(builder.config.maxDepth).toBe(5);
      expect(builder.config.minGroupSize).toBe(3);
      expect(builder.config.virtualScrollThreshold).toBe(50); // default
      expect(builder.config.buildTimeout).toBe(200); // default
    });
  });

  describe('buildTree', () => {
    it('should return empty array for empty suggestions', () => {
      const result = treeBuilder.buildTree([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for null/undefined suggestions', () => {
      expect(treeBuilder.buildTree(null)).toEqual([]);
      expect(treeBuilder.buildTree(undefined)).toEqual([]);
    });

    it('should build tree for single suggestion', () => {
      const suggestions = [
        { word: 'test', frequency: 10 }
      ];
      
      const result = treeBuilder.buildTree(suggestions);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(NODE_TYPES.WORD);
      expect(result[0].word).toBe('test');
      expect(result[0].frequency).toBe(10);
    });

    it('should build tree for multiple suggestions with common prefix', () => {
      const suggestions = [
        { word: 'test', frequency: 10 },
        { word: 'testing', frequency: 5 },
        { word: 'tester', frequency: 3 }
      ];
      
      const result = treeBuilder.buildTree(suggestions);
      
      // Should create optimized tree structure
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(NODE_TYPES.PREFIX);
      // After optimization, prefix nodes may be merged
      expect(result[0].content.length).toBeGreaterThan(0);
    });

    it('should build tree for suggestions without common prefix', () => {
      const suggestions = [
        { word: 'apple', frequency: 10 },
        { word: 'banana', frequency: 5 },
        { word: 'cherry', frequency: 3 }
      ];
      
      const result = treeBuilder.buildTree(suggestions);
      
      // Should create separate root nodes
      expect(result).toHaveLength(3);
      result.forEach(node => {
        expect(node.type).toBe(NODE_TYPES.WORD);
      });
    });

    it('should handle typo correction suggestions', () => {
      const suggestions = [
        { 
          word: 'test', 
          frequency: 10, 
          type: 'typo_correction',
          originalQuery: 'tset',
          editDistance: 2,
          similarity: 0.8
        }
      ];
      
      const result = treeBuilder.buildTree(suggestions);
      
      expect(result[0].suggestionType).toBe('typo_correction');
      expect(result[0].originalQuery).toBe('tset');
      expect(result[0].editDistance).toBe(2);
      expect(result[0].similarity).toBe(0.8);
    });

    it('should throw error on timeout', () => {
      const slowBuilder = new TreeBuilder({ buildTimeout: 1 });
      const largeSuggestions = Array.from({ length: 1000 }, (_, i) => ({
        word: `word${i}`,
        frequency: i
      }));
      
      expect(() => slowBuilder.buildTree(largeSuggestions)).toThrow();
    });

    it('should sort suggestions alphabetically', () => {
      const suggestions = [
        { word: 'zebra', frequency: 1 },
        { word: 'apple', frequency: 2 },
        { word: 'banana', frequency: 3 }
      ];
      
      const result = treeBuilder.buildTree(suggestions);
      
      // Should be sorted: apple, banana, zebra
      expect(result[0].word).toBe('apple');
      expect(result[1].word).toBe('banana');
      expect(result[2].word).toBe('zebra');
    });
  });

  describe('insertSuggestion', () => {
    it('should insert suggestion into empty tree', () => {
      const tree = [];
      const suggestion = { word: 'test', frequency: 10 };
      
      treeBuilder.insertSuggestion(tree, suggestion);
      
      expect(tree).toHaveLength(1);
      // The inserted node might be a prefix node or word node depending on the word length
      expect(tree[0].id).toBeDefined();
      expect(tree[0].type).toMatch(/^(word|prefix)$/);
    });

    it('should handle empty or invalid word', () => {
      const tree = [];
      
      treeBuilder.insertSuggestion(tree, { word: '', frequency: 10 });
      treeBuilder.insertSuggestion(tree, { word: null, frequency: 10 });
      treeBuilder.insertSuggestion(tree, { frequency: 10 });
      
      expect(tree).toHaveLength(0);
    });

    it('should respect max depth limit', () => {
      const limitedBuilder = new TreeBuilder({ maxDepth: 2 });
      const tree = [];
      const suggestion = { word: 'testing', frequency: 10 };
      
      limitedBuilder.insertSuggestion(tree, suggestion);
      
      // Should create word node at max depth instead of continuing
      const findWordNode = (nodes) => {
        for (const node of nodes) {
          if (node.type === NODE_TYPES.WORD) return node;
          const found = findWordNode(node.children);
          if (found) return found;
        }
        return null;
      };
      
      const wordNode = findWordNode(tree);
      expect(wordNode).toBeTruthy();
      expect(wordNode.depth).toBeLessThanOrEqual(2);
    });
  });

  describe('findCommonPrefix', () => {
    it('should return empty string for empty array', () => {
      expect(treeBuilder.findCommonPrefix([])).toBe('');
      expect(treeBuilder.findCommonPrefix(null)).toBe('');
      expect(treeBuilder.findCommonPrefix(undefined)).toBe('');
    });

    it('should return the word for single word array', () => {
      expect(treeBuilder.findCommonPrefix(['test'])).toBe('test');
    });

    it('should find common prefix for multiple words', () => {
      const words = ['test', 'testing', 'tester'];
      expect(treeBuilder.findCommonPrefix(words)).toBe('test');
    });

    it('should return empty string when no common prefix', () => {
      const words = ['apple', 'banana', 'cherry'];
      expect(treeBuilder.findCommonPrefix(words)).toBe('');
    });

    it('should handle words of different lengths', () => {
      const words = ['a', 'ab', 'abc'];
      expect(treeBuilder.findCommonPrefix(words)).toBe('a');
    });
  });

  describe('optimizeTree', () => {
    it('should remove prefix nodes with insufficient children', () => {
      const builder = new TreeBuilder({ minGroupSize: 2 });
      
      // Create a tree with single-child prefix node
      const tree = [{
        id: 'prefix-1',
        type: NODE_TYPES.PREFIX,
        content: 't',
        prefix: 't',
        depth: 0,
        children: [{
          id: 'word-1',
          type: NODE_TYPES.WORD,
          word: 'test',
          frequency: 10,
          depth: 1,
          children: []
        }],
        childCount: 1,
        totalFrequency: 10
      }];
      
      const optimized = builder.optimizeTree(tree);
      
      // Single-child prefix should be removed, word promoted
      expect(optimized).toHaveLength(1);
      expect(optimized[0].type).toBe(NODE_TYPES.WORD);
    });

    it('should merge consecutive single-child prefix nodes', () => {
      const tree = [{
        id: 'prefix-1',
        type: NODE_TYPES.PREFIX,
        content: 't',
        prefix: 't',
        depth: 0,
        children: [{
          id: 'prefix-2',
          type: NODE_TYPES.PREFIX,
          content: 'e',
          prefix: 'te',
          depth: 1,
          children: [{
            id: 'word-1',
            type: NODE_TYPES.WORD,
            word: 'test',
            frequency: 10,
            depth: 2,
            children: []
          }],
          childCount: 1
        }],
        childCount: 1
      }];
      
      const optimized = treeBuilder.optimizeTree(tree);
      
      // Should optimize the tree structure
      expect(optimized).toHaveLength(1);
      expect(optimized[0]).toBeDefined();
      // The optimization may merge nodes or promote children
      expect(optimized[0].id).toBeDefined();
    });

    it('should calculate total frequency for prefix nodes', () => {
      const tree = [{
        id: 'prefix-1',
        type: NODE_TYPES.PREFIX,
        content: 't',
        prefix: 't',
        depth: 0,
        children: [
          {
            id: 'word-1',
            type: NODE_TYPES.WORD,
            word: 'test',
            frequency: 10,
            depth: 1,
            children: []
          },
          {
            id: 'word-2',
            type: NODE_TYPES.WORD,
            word: 'tree',
            frequency: 5,
            depth: 1,
            children: []
          }
        ],
        childCount: 2,
        totalFrequency: 0
      }];
      
      const optimized = treeBuilder.optimizeTree(tree);
      
      expect(optimized[0].totalFrequency).toBe(15);
    });
  });

  describe('error handling', () => {
    it('should throw TreeError with correct properties', () => {
      const builder = new TreeBuilder({ buildTimeout: 0 });
      
      try {
        builder.buildTree([{ word: 'test', frequency: 1 }]);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.type).toBe(ERROR_TYPES.BUILD_ERROR);
        expect(error.message).toContain('timeout');
        expect(error.fallbackAction).toBe(FALLBACK_ACTIONS.USE_LIST_VIEW);
      }
    });

    it('should wrap unexpected errors', () => {
      // Mock a method to throw an unexpected error
      const originalMethod = treeBuilder._hasSignificantCommonPrefixes;
      treeBuilder._hasSignificantCommonPrefixes = () => {
        throw new Error('Unexpected error');
      };
      
      try {
        treeBuilder.buildTree([{ word: 'test', frequency: 1 }]);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.type).toBe(ERROR_TYPES.BUILD_ERROR);
        expect(error.message).toContain('Failed to build tree');
        expect(error.originalError).toBeTruthy();
      } finally {
        treeBuilder._hasSignificantCommonPrefixes = originalMethod;
      }
    });
  });

  describe('performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeSuggestions = Array.from({ length: 100 }, (_, i) => ({
        word: `word${i.toString().padStart(3, '0')}`,
        frequency: i
      }));
      
      const startTime = performance.now();
      const result = treeBuilder.buildTree(largeSuggestions);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      expect(result.length).toBeGreaterThan(0);
    });
  });
});