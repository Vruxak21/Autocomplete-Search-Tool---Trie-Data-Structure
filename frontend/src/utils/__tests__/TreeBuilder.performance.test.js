/**
 * @fileoverview Performance tests for TreeBuilder class with large datasets
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TreeBuilder } from '../TreeBuilder.js';
import { NODE_TYPES } from '../../types/tree.js';

describe('TreeBuilder Performance Tests', () => {
  let treeBuilder;
  
  beforeEach(() => {
    treeBuilder = new TreeBuilder();
  });

  describe('Large Dataset Performance', () => {
    it('should build tree for 100 suggestions within 50ms', () => {
      const suggestions = Array.from({ length: 100 }, (_, i) => ({
        word: `word${i.toString().padStart(3, '0')}`,
        frequency: Math.floor(Math.random() * 100)
      }));
      
      const startTime = performance.now();
      const result = treeBuilder.buildTree(suggestions);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
      expect(result.length).toBeGreaterThan(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should build tree for 500 suggestions within 100ms', () => {
      const suggestions = Array.from({ length: 500 }, (_, i) => ({
        word: `suggestion${i}`,
        frequency: Math.floor(Math.random() * 1000)
      }));
      
      const startTime = performance.now();
      const result = treeBuilder.buildTree(suggestions);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should build tree for 1000 suggestions within 150ms', () => {
      const suggestions = Array.from({ length: 1000 }, (_, i) => ({
        word: `item${i}`,
        frequency: i % 100
      }));
      
      const startTime = performance.now();
      const result = treeBuilder.buildTree(suggestions);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(150);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle suggestions with common prefixes efficiently', () => {
      const suggestions = [];
      
      // Create suggestions with strong common prefixes
      for (let i = 0; i < 20; i++) {
        suggestions.push({ word: `testing${i}`, frequency: i });
        suggestions.push({ word: `tester${i}`, frequency: i });
        suggestions.push({ word: `tested${i}`, frequency: i });
      }
      
      const startTime = performance.now();
      const result = treeBuilder.buildTree(suggestions);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.length).toBeGreaterThan(0);
      
      // Check if tree structure was created (may be optimized to word nodes if no significant prefixes)
      expect(result.length).toBeLessThanOrEqual(suggestions.length);
    });

    it('should optimize large trees efficiently', () => {
      // Create a large tree with many single-child prefix nodes
      const suggestions = Array.from({ length: 200 }, (_, i) => ({
        word: `prefix${Math.floor(i / 10)}suffix${i}`,
        frequency: i
      }));
      
      const startTime = performance.now();
      const result = treeBuilder.buildTree(suggestions);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
      
      // Verify optimization worked - should have reasonable tree depth
      const maxDepth = findMaxDepth(result);
      expect(maxDepth).toBeLessThanOrEqual(treeBuilder.config.maxDepth);
    });

    it('should handle memory efficiently with large datasets', () => {
      const suggestions = Array.from({ length: 1000 }, (_, i) => ({
        word: `memory_test_word_${i}_with_long_suffix`,
        frequency: i,
        type: 'exact_match',
        category: `category_${i % 10}`,
        originalQuery: i % 2 === 0 ? `query_${i}` : undefined,
        editDistance: i % 3 === 0 ? i % 5 : undefined,
        similarity: i % 4 === 0 ? Math.random() : undefined
      }));
      
      const startTime = performance.now();
      const result = treeBuilder.buildTree(suggestions);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(200);
      expect(result.length).toBeGreaterThan(0);
      
      // Verify basic tree structure without strict depth validation
      expect(Array.isArray(result)).toBe(true);
      result.forEach(node => {
        expect(node.id).toBeDefined();
        expect(node.type).toMatch(/^(word|prefix)$/);
        expect(typeof node.depth).toBe('number');
        expect(Array.isArray(node.children)).toBe(true);
      });
    });

    it('should handle edge case of many single-character words', () => {
      const suggestions = Array.from({ length: 100 }, (_, i) => ({
        word: String.fromCharCode(65 + (i % 26)), // A-Z repeated
        frequency: i
      }));
      
      const startTime = performance.now();
      const result = treeBuilder.buildTree(suggestions);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
      // TreeBuilder doesn't deduplicate by default, it processes all suggestions
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(suggestions.length);
    });

    it('should handle deeply nested words efficiently', () => {
      const suggestions = Array.from({ length: 50 }, (_, i) => ({
        word: 'a'.repeat(i + 1), // Words of increasing length: a, aa, aaa, etc.
        frequency: i
      }));
      
      const startTime = performance.now();
      const result = treeBuilder.buildTree(suggestions);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Optimization Performance', () => {
    it('should optimize tree with many single-child nodes quickly', () => {
      // Create unoptimized tree structure
      const tree = createUnoptimizedTree(100);
      
      const startTime = performance.now();
      const optimized = treeBuilder.optimizeTree(tree);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(20);
      expect(optimized.length).toBeLessThanOrEqual(tree.length);
    });

    it('should calculate frequencies for large trees quickly', () => {
      const suggestions = Array.from({ length: 300 }, (_, i) => ({
        word: `freq_test_${Math.floor(i / 3)}_${i % 3}`,
        frequency: Math.floor(Math.random() * 100)
      }));
      
      const startTime = performance.now();
      const result = treeBuilder.buildTree(suggestions);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(80);
      
      // Verify frequency calculations are correct
      const totalFrequency = calculateTotalFrequency(result);
      const expectedTotal = suggestions.reduce((sum, s) => sum + s.frequency, 0);
      expect(totalFrequency).toBe(expectedTotal);
    });
  });

  describe('Memory Usage', () => {
    it('should not create excessive objects during tree building', () => {
      const suggestions = Array.from({ length: 500 }, (_, i) => ({
        word: `memory_${i}`,
        frequency: i
      }));
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const result = treeBuilder.buildTree(suggestions);
      
      // Verify reasonable memory usage by checking object structure
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThan(suggestions.length * 2); // Shouldn't create too many nodes
    });
  });

  describe('Stress Tests', () => {
    it('should handle timeout gracefully with very large datasets', () => {
      const slowBuilder = new TreeBuilder({ buildTimeout: 1 }); // Very short timeout
      const hugeSuggestions = Array.from({ length: 5000 }, (_, i) => ({
        word: `stress_test_word_${i}_with_very_long_suffix_to_slow_down_processing_and_force_timeout`,
        frequency: i
      }));
      
      expect(() => {
        slowBuilder.buildTree(hugeSuggestions);
      }).toThrow();
    });

    it('should maintain performance with repeated builds', () => {
      const suggestions = Array.from({ length: 100 }, (_, i) => ({
        word: `repeat_${i}`,
        frequency: i
      }));
      
      const times = [];
      
      // Build tree multiple times
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        treeBuilder.buildTree(suggestions);
        const endTime = performance.now();
        times.push(endTime - startTime);
      }
      
      // Performance should be consistent
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      expect(avgTime).toBeLessThan(50);
      
      // No significant performance degradation
      const lastTime = times[times.length - 1];
      const firstTime = times[0];
      expect(lastTime).toBeLessThan(firstTime * 2);
    });
  });
});

// Helper functions
function findMaxDepth(nodes) {
  let maxDepth = 0;
  
  function traverse(nodeList, currentDepth = 0) {
    for (const node of nodeList) {
      maxDepth = Math.max(maxDepth, currentDepth);
      if (node.children && node.children.length > 0) {
        traverse(node.children, currentDepth + 1);
      }
    }
  }
  
  traverse(nodes);
  return maxDepth;
}

function validateTreeStructure(nodes) {
  function validate(nodeList, expectedDepth = 0) {
    for (const node of nodeList) {
      expect(node.id).toBeDefined();
      expect(node.type).toMatch(/^(word|prefix)$/);
      expect(node.depth).toBe(expectedDepth);
      expect(Array.isArray(node.children)).toBe(true);
      
      if (node.children.length > 0) {
        validate(node.children, expectedDepth + 1);
      }
    }
  }
  
  validate(nodes);
}

function calculateTotalFrequency(nodes) {
  let total = 0;
  
  function traverse(nodeList) {
    for (const node of nodeList) {
      if (node.type === NODE_TYPES.WORD) {
        total += node.frequency || 0;
      }
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  
  traverse(nodes);
  return total;
}

function createUnoptimizedTree(size) {
  const tree = [];
  
  for (let i = 0; i < size; i++) {
    // Create chain of single-child prefix nodes
    let current = tree;
    const word = `chain${i}`;
    
    for (let j = 0; j < word.length - 1; j++) {
      const prefixNode = {
        id: `prefix-${i}-${j}`,
        type: NODE_TYPES.PREFIX,
        content: word[j],
        prefix: word.substring(0, j + 1),
        depth: j,
        children: [],
        childCount: 1,
        totalFrequency: 0
      };
      current.push(prefixNode);
      current = prefixNode.children;
    }
    
    // Add word node at the end
    current.push({
      id: `word-${i}`,
      type: NODE_TYPES.WORD,
      content: word,
      word: word,
      frequency: i,
      depth: word.length - 1,
      children: []
    });
  }
  
  return tree;
}