/**
 * @fileoverview Unit tests for TreeNodeFactory and TreeNodeValidator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  TreeNodeFactory, 
  TreeNodeValidator,
  createWordNode,
  createPrefixNode,
  createFromSuggestion,
  cloneNode,
  isValidTreeNode,
  isValidSuggestion,
  validateTreeStructure,
  isValidViewState
} from '../treeNodeFactory.js';
import { NODE_TYPES } from '../../types/tree.js';

describe('TreeNodeFactory', () => {
  describe('createWordNode', () => {
    it('should create valid word node with required properties', () => {
      const node = TreeNodeFactory.createWordNode({
        word: 'test',
        frequency: 10
      });

      expect(node.type).toBe(NODE_TYPES.WORD);
      expect(node.word).toBe('test');
      expect(node.frequency).toBe(10);
      expect(node.content).toBe('test');
      expect(node.prefix).toBe('test');
      expect(node.isExpanded).toBe(false);
      expect(node.isSelected).toBe(false);
      expect(node.depth).toBe(0);
      expect(node.children).toEqual([]);
      expect(node.parent).toBeNull();
      expect(node.id).toMatch(/^word-test-\d+-[a-z0-9]+$/);
    });

    it('should create word node with all optional properties', () => {
      const parent = { id: 'parent' };
      const node = TreeNodeFactory.createWordNode({
        word: 'testing',
        frequency: 15,
        suggestionType: 'typo_correction',
        depth: 2,
        parent,
        originalQuery: 'testng',
        editDistance: 1,
        similarity: 0.9,
        category: 'verbs',
        correctionType: 'insertion'
      });

      expect(node.suggestionType).toBe('typo_correction');
      expect(node.depth).toBe(2);
      expect(node.parent).toBe(parent);
      expect(node.originalQuery).toBe('testng');
      expect(node.editDistance).toBe(1);
      expect(node.similarity).toBe(0.9);
      expect(node.category).toBe('verbs');
      expect(node.correctionType).toBe('insertion');
    });

    it('should handle negative values correctly', () => {
      const node = TreeNodeFactory.createWordNode({
        word: 'test',
        frequency: -5,
        depth: -2,
        editDistance: -1,
        similarity: -0.5
      });

      expect(node.frequency).toBe(0);
      expect(node.depth).toBe(0);
      expect(node.editDistance).toBe(0);
      expect(node.similarity).toBe(0);
    });

    it('should clamp similarity to 0-1 range', () => {
      const node = TreeNodeFactory.createWordNode({
        word: 'test',
        similarity: 1.5
      });

      expect(node.similarity).toBe(1);
    });

    it('should throw error for invalid word', () => {
      expect(() => TreeNodeFactory.createWordNode({ word: '' })).toThrow();
      expect(() => TreeNodeFactory.createWordNode({ word: null })).toThrow();
      expect(() => TreeNodeFactory.createWordNode({})).toThrow();
    });
  });

  describe('createPrefixNode', () => {
    it('should create valid prefix node with required properties', () => {
      const node = TreeNodeFactory.createPrefixNode({
        content: 't',
        prefix: 'te'
      });

      expect(node.type).toBe(NODE_TYPES.PREFIX);
      expect(node.content).toBe('t');
      expect(node.prefix).toBe('te');
      expect(node.isExpanded).toBe(false);
      expect(node.isSelected).toBe(false);
      expect(node.depth).toBe(0);
      expect(node.children).toEqual([]);
      expect(node.parent).toBeNull();
      expect(node.childCount).toBe(0);
      expect(node.totalFrequency).toBe(0);
      expect(node.id).toMatch(/^prefix-te-\d+-[a-z0-9]+$/);
    });

    it('should create prefix node with all optional properties', () => {
      const parent = { id: 'parent' };
      const node = TreeNodeFactory.createPrefixNode({
        content: 'test',
        prefix: 'testing',
        depth: 3,
        parent,
        childCount: 5,
        totalFrequency: 100
      });

      expect(node.depth).toBe(3);
      expect(node.parent).toBe(parent);
      expect(node.childCount).toBe(5);
      expect(node.totalFrequency).toBe(100);
    });

    it('should handle negative values correctly', () => {
      const node = TreeNodeFactory.createPrefixNode({
        content: 't',
        prefix: 'te',
        depth: -1,
        childCount: -5,
        totalFrequency: -10
      });

      expect(node.depth).toBe(0);
      expect(node.childCount).toBe(0);
      expect(node.totalFrequency).toBe(0);
    });

    it('should throw error for invalid content or prefix', () => {
      expect(() => TreeNodeFactory.createPrefixNode({ content: '', prefix: 'te' })).toThrow();
      expect(() => TreeNodeFactory.createPrefixNode({ content: 't', prefix: '' })).toThrow();
      expect(() => TreeNodeFactory.createPrefixNode({ prefix: 'te' })).toThrow();
      expect(() => TreeNodeFactory.createPrefixNode({ content: 't' })).toThrow();
    });
  });

  describe('createFromSuggestion', () => {
    it('should create word node from valid suggestion', () => {
      const suggestion = {
        word: 'test',
        frequency: 10,
        type: 'exact_match',
        category: 'nouns'
      };

      const node = TreeNodeFactory.createFromSuggestion(suggestion, 2);

      expect(node.type).toBe(NODE_TYPES.WORD);
      expect(node.word).toBe('test');
      expect(node.frequency).toBe(10);
      expect(node.suggestionType).toBe('exact_match');
      expect(node.category).toBe('nouns');
      expect(node.depth).toBe(2);
    });

    it('should throw error for invalid suggestion', () => {
      expect(() => TreeNodeFactory.createFromSuggestion({})).toThrow();
      expect(() => TreeNodeFactory.createFromSuggestion({ word: 'test' })).toThrow();
      expect(() => TreeNodeFactory.createFromSuggestion(null)).toThrow();
    });
  });

  describe('cloneNode', () => {
    it('should clone node with all properties', () => {
      const original = TreeNodeFactory.createWordNode({
        word: 'test',
        frequency: 10
      });
      original.children = [{ id: 'child1' }, { id: 'child2' }];

      const cloned = TreeNodeFactory.cloneNode(original);

      expect(cloned).not.toBe(original);
      expect(cloned.children).not.toBe(original.children);
      expect(cloned.children).toEqual(original.children);
      expect(cloned.word).toBe(original.word);
      expect(cloned.frequency).toBe(original.frequency);
      expect(cloned.id).not.toBe(original.id);
    });

    it('should apply overrides', () => {
      const original = TreeNodeFactory.createWordNode({
        word: 'test',
        frequency: 10
      });

      const cloned = TreeNodeFactory.cloneNode(original, {
        frequency: 20,
        isSelected: true,
        id: 'custom-id'
      });

      expect(cloned.frequency).toBe(20);
      expect(cloned.isSelected).toBe(true);
      expect(cloned.id).toBe('custom-id');
      expect(cloned.word).toBe('test'); // unchanged
    });

    it('should throw error for invalid node', () => {
      expect(() => TreeNodeFactory.cloneNode({})).toThrow();
      expect(() => TreeNodeFactory.cloneNode(null)).toThrow();
    });
  });
});

describe('TreeNodeValidator', () => {
  describe('isValidTreeNode', () => {
    it('should validate correct word node', () => {
      const node = TreeNodeFactory.createWordNode({
        word: 'test',
        frequency: 10
      });

      expect(TreeNodeValidator.isValidTreeNode(node)).toBe(true);
    });

    it('should validate correct prefix node', () => {
      const node = TreeNodeFactory.createPrefixNode({
        content: 't',
        prefix: 'te'
      });

      expect(TreeNodeValidator.isValidTreeNode(node)).toBe(true);
    });

    it('should reject null or non-object', () => {
      expect(TreeNodeValidator.isValidTreeNode(null)).toBe(false);
      expect(TreeNodeValidator.isValidTreeNode(undefined)).toBe(false);
      expect(TreeNodeValidator.isValidTreeNode('string')).toBe(false);
      expect(TreeNodeValidator.isValidTreeNode(123)).toBe(false);
    });

    it('should reject nodes missing required properties', () => {
      const incomplete = {
        id: 'test',
        type: NODE_TYPES.WORD,
        content: 'test'
        // missing other required properties
      };

      expect(TreeNodeValidator.isValidTreeNode(incomplete)).toBe(false);
    });

    it('should reject nodes with invalid property types', () => {
      const invalidTypes = {
        id: 123, // should be string
        type: NODE_TYPES.WORD,
        content: 'test',
        prefix: 'test',
        isExpanded: 'true', // should be boolean
        isSelected: false,
        depth: 0,
        children: []
      };

      expect(TreeNodeValidator.isValidTreeNode(invalidTypes)).toBe(false);
    });

    it('should reject word nodes without required word properties', () => {
      const invalidWord = {
        id: 'test',
        type: NODE_TYPES.WORD,
        content: 'test',
        prefix: 'test',
        isExpanded: false,
        isSelected: false,
        depth: 0,
        children: [],
        // missing word and frequency
      };

      expect(TreeNodeValidator.isValidTreeNode(invalidWord)).toBe(false);
    });

    it('should reject prefix nodes without required prefix properties', () => {
      const invalidPrefix = {
        id: 'test',
        type: NODE_TYPES.PREFIX,
        content: 'test',
        prefix: 'test',
        isExpanded: false,
        isSelected: false,
        depth: 0,
        children: [],
        // missing childCount and totalFrequency
      };

      expect(TreeNodeValidator.isValidTreeNode(invalidPrefix)).toBe(false);
    });
  });

  describe('isValidSuggestion', () => {
    it('should validate correct suggestion', () => {
      const suggestion = {
        word: 'test',
        frequency: 10,
        type: 'exact_match',
        category: 'nouns'
      };

      expect(TreeNodeValidator.isValidSuggestion(suggestion)).toBe(true);
    });

    it('should validate minimal suggestion', () => {
      const suggestion = {
        word: 'test',
        frequency: 0
      };

      expect(TreeNodeValidator.isValidSuggestion(suggestion)).toBe(true);
    });

    it('should reject null or non-object', () => {
      expect(TreeNodeValidator.isValidSuggestion(null)).toBe(false);
      expect(TreeNodeValidator.isValidSuggestion(undefined)).toBe(false);
      expect(TreeNodeValidator.isValidSuggestion('string')).toBe(false);
    });

    it('should reject suggestions without required properties', () => {
      expect(TreeNodeValidator.isValidSuggestion({})).toBe(false);
      expect(TreeNodeValidator.isValidSuggestion({ word: 'test' })).toBe(false);
      expect(TreeNodeValidator.isValidSuggestion({ frequency: 10 })).toBe(false);
    });

    it('should reject suggestions with invalid property types', () => {
      expect(TreeNodeValidator.isValidSuggestion({
        word: 123,
        frequency: 10
      })).toBe(false);

      expect(TreeNodeValidator.isValidSuggestion({
        word: 'test',
        frequency: 'ten'
      })).toBe(false);
    });

    it('should reject suggestions with invalid optional properties', () => {
      expect(TreeNodeValidator.isValidSuggestion({
        word: 'test',
        frequency: 10,
        type: 'invalid_type'
      })).toBe(false);

      expect(TreeNodeValidator.isValidSuggestion({
        word: 'test',
        frequency: 10,
        editDistance: -1
      })).toBe(false);

      expect(TreeNodeValidator.isValidSuggestion({
        word: 'test',
        frequency: 10,
        similarity: 1.5
      })).toBe(false);
    });
  });

  describe('validateTreeStructure', () => {
    it('should validate correct tree structure', () => {
      const tree = [
        TreeNodeFactory.createWordNode({ word: 'apple', frequency: 10 }),
        TreeNodeFactory.createWordNode({ word: 'banana', frequency: 5 })
      ];

      const result = TreeNodeValidator.validateTreeStructure(tree);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate tree with nested structure', () => {
      const parent = TreeNodeFactory.createPrefixNode({
        content: 't',
        prefix: 't',
        depth: 0
      });
      
      const child = TreeNodeFactory.createWordNode({
        word: 'test',
        frequency: 10,
        depth: 1,
        parent
      });
      
      parent.children = [child];
      parent.childCount = 1;

      const result = TreeNodeValidator.validateTreeStructure([parent]);
      expect(result.isValid).toBe(true);
    });

    it('should reject non-array input', () => {
      const result = TreeNodeValidator.validateTreeStructure('not an array');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tree must be an array');
    });

    it('should detect duplicate node IDs', () => {
      const node1 = TreeNodeFactory.createWordNode({ word: 'test1', frequency: 10 });
      const node2 = TreeNodeFactory.createWordNode({ word: 'test2', frequency: 5 });
      node2.id = node1.id; // Duplicate ID

      const result = TreeNodeValidator.validateTreeStructure([node1, node2]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Duplicate node ID'))).toBe(true);
    });

    it('should detect depth mismatches', () => {
      const node = TreeNodeFactory.createWordNode({ word: 'test', frequency: 10 });
      node.depth = 5; // Wrong depth for root node

      const result = TreeNodeValidator.validateTreeStructure([node]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('depth mismatch'))).toBe(true);
    });

    it('should detect parent reference mismatches', () => {
      const parent = TreeNodeFactory.createPrefixNode({
        content: 't',
        prefix: 't'
      });
      
      const child = TreeNodeFactory.createWordNode({
        word: 'test',
        frequency: 10,
        depth: 1,
        parent: { id: 'wrong-parent' } // Wrong parent reference
      });
      
      parent.children = [child];

      const result = TreeNodeValidator.validateTreeStructure([parent]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Parent reference mismatch'))).toBe(true);
    });

    it('should detect child count mismatches', () => {
      const parent = TreeNodeFactory.createPrefixNode({
        content: 't',
        prefix: 't',
        childCount: 5 // Wrong count
      });
      
      const child = TreeNodeFactory.createWordNode({
        word: 'test',
        frequency: 10,
        depth: 1,
        parent
      });
      
      parent.children = [child]; // Only 1 child, not 5

      const result = TreeNodeValidator.validateTreeStructure([parent]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Child count mismatch'))).toBe(true);
    });
  });

  describe('isValidViewState', () => {
    it('should validate correct view state', () => {
      const viewState = {
        mode: 'tree',
        selectedNodeId: 'node-123',
        expandedNodes: new Set(['node-1', 'node-2']),
        scrollPosition: 100,
        keyboardNavigation: {
          currentIndex: 2,
          visibleNodes: []
        }
      };

      expect(TreeNodeValidator.isValidViewState(viewState)).toBe(true);
    });

    it('should validate view state with null selectedNodeId', () => {
      const viewState = {
        mode: 'list',
        selectedNodeId: null,
        expandedNodes: new Set(),
        scrollPosition: 0,
        keyboardNavigation: {
          currentIndex: -1,
          visibleNodes: []
        }
      };

      expect(TreeNodeValidator.isValidViewState(viewState)).toBe(true);
    });

    it('should reject null or non-object', () => {
      expect(TreeNodeValidator.isValidViewState(null)).toBe(false);
      expect(TreeNodeValidator.isValidViewState(undefined)).toBe(false);
      expect(TreeNodeValidator.isValidViewState('string')).toBe(false);
    });

    it('should reject invalid mode', () => {
      const viewState = {
        mode: 'invalid',
        selectedNodeId: null,
        expandedNodes: new Set(),
        scrollPosition: 0,
        keyboardNavigation: {
          currentIndex: 0,
          visibleNodes: []
        }
      };

      expect(TreeNodeValidator.isValidViewState(viewState)).toBe(false);
    });

    it('should reject invalid expandedNodes type', () => {
      const viewState = {
        mode: 'tree',
        selectedNodeId: null,
        expandedNodes: [], // Should be Set
        scrollPosition: 0,
        keyboardNavigation: {
          currentIndex: 0,
          visibleNodes: []
        }
      };

      expect(TreeNodeValidator.isValidViewState(viewState)).toBe(false);
    });

    it('should reject negative scroll position', () => {
      const viewState = {
        mode: 'tree',
        selectedNodeId: null,
        expandedNodes: new Set(),
        scrollPosition: -10,
        keyboardNavigation: {
          currentIndex: 0,
          visibleNodes: []
        }
      };

      expect(TreeNodeValidator.isValidViewState(viewState)).toBe(false);
    });

    it('should reject invalid keyboard navigation', () => {
      const viewState = {
        mode: 'tree',
        selectedNodeId: null,
        expandedNodes: new Set(),
        scrollPosition: 0,
        keyboardNavigation: {
          currentIndex: -2, // Should be >= -1
          visibleNodes: 'not an array'
        }
      };

      expect(TreeNodeValidator.isValidViewState(viewState)).toBe(false);
    });
  });
});

// Test convenience exports
describe('Convenience exports', () => {
  it('should export factory methods', () => {
    expect(typeof createWordNode).toBe('function');
    expect(typeof createPrefixNode).toBe('function');
    expect(typeof createFromSuggestion).toBe('function');
    expect(typeof cloneNode).toBe('function');
  });

  it('should export validator methods', () => {
    expect(typeof isValidTreeNode).toBe('function');
    expect(typeof isValidSuggestion).toBe('function');
    expect(typeof validateTreeStructure).toBe('function');
    expect(typeof isValidViewState).toBe('function');
  });

  it('should work the same as class methods', () => {
    const node1 = createWordNode({ word: 'test', frequency: 10 });
    const node2 = TreeNodeFactory.createWordNode({ word: 'test', frequency: 10 });
    
    expect(node1.word).toBe(node2.word);
    expect(node1.type).toBe(node2.type);
    expect(isValidTreeNode(node1)).toBe(true);
  });
});