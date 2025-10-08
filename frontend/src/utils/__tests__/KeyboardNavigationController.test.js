/**
 * @fileoverview Unit tests for KeyboardNavigationController
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyboardNavigationController, createKeyboardNavigationController } from '../KeyboardNavigationController.js';
import { NODE_TYPES } from '../../types/tree.js';

describe('KeyboardNavigationController', () => {
  let controller;
  let mockCallbacks;
  let sampleTree;

  beforeEach(() => {
    mockCallbacks = {
      onSelectionChange: vi.fn(),
      onExpansionChange: vi.fn(),
      onWordSelect: vi.fn()
    };

    controller = new KeyboardNavigationController(mockCallbacks);

    // Create sample tree structure for testing
    sampleTree = [
      {
        id: 'prefix-a',
        type: NODE_TYPES.PREFIX,
        content: 'a',
        prefix: 'a',
        isExpanded: false,
        isSelected: false,
        depth: 0,
        parent: null,
        children: [
          {
            id: 'word-apple',
            type: NODE_TYPES.WORD,
            content: 'apple',
            prefix: 'apple',
            word: 'apple',
            frequency: 10,
            isExpanded: false,
            isSelected: false,
            depth: 1,
            parent: null, // Will be set properly in real implementation
            children: []
          },
          {
            id: 'word-ant',
            type: NODE_TYPES.WORD,
            content: 'ant',
            prefix: 'ant',
            word: 'ant',
            frequency: 5,
            isExpanded: false,
            isSelected: false,
            depth: 1,
            parent: null,
            children: []
          }
        ]
      },
      {
        id: 'word-banana',
        type: NODE_TYPES.WORD,
        content: 'banana',
        prefix: 'banana',
        word: 'banana',
        frequency: 15,
        isExpanded: false,
        isSelected: false,
        depth: 0,
        parent: null,
        children: []
      },
      {
        id: 'prefix-c',
        type: NODE_TYPES.PREFIX,
        content: 'c',
        prefix: 'c',
        isExpanded: false,
        isSelected: false,
        depth: 0,
        parent: null,
        children: [
          {
            id: 'word-cat',
            type: NODE_TYPES.WORD,
            content: 'cat',
            prefix: 'cat',
            word: 'cat',
            frequency: 20,
            isExpanded: false,
            isSelected: false,
            depth: 1,
            parent: null,
            children: []
          }
        ]
      }
    ];

    // Set parent references
    sampleTree[0].children[0].parent = sampleTree[0];
    sampleTree[0].children[1].parent = sampleTree[0];
    sampleTree[2].children[0].parent = sampleTree[2];
  });

  describe('Constructor and Initialization', () => {
    it('should create controller with default options', () => {
      const defaultController = new KeyboardNavigationController();
      expect(defaultController).toBeInstanceOf(KeyboardNavigationController);
      expect(defaultController.currentNodeId).toBeNull();
      expect(defaultController.currentIndex).toBe(-1);
      expect(defaultController.visibleNodes).toEqual([]);
    });

    it('should create controller with custom callbacks', () => {
      expect(controller.onSelectionChange).toBe(mockCallbacks.onSelectionChange);
      expect(controller.onExpansionChange).toBe(mockCallbacks.onExpansionChange);
      expect(controller.onWordSelect).toBe(mockCallbacks.onWordSelect);
    });

    it('should create controller using factory function', () => {
      const factoryController = createKeyboardNavigationController(mockCallbacks);
      expect(factoryController).toBeInstanceOf(KeyboardNavigationController);
    });
  });

  describe('Tree Management', () => {
    it('should update tree and calculate visible nodes', () => {
      controller.updateTree(sampleTree);
      
      expect(controller.treeNodes).toBe(sampleTree);
      expect(controller.visibleNodes).toHaveLength(3); // Only root level nodes visible initially
      expect(controller.visibleNodes[0].id).toBe('prefix-a');
      expect(controller.visibleNodes[1].id).toBe('word-banana');
      expect(controller.visibleNodes[2].id).toBe('prefix-c');
    });

    it('should update visible nodes when nodes are expanded', () => {
      const expandedNodes = new Set(['prefix-a']);
      controller.updateTree(sampleTree, expandedNodes);
      
      expect(controller.visibleNodes).toHaveLength(5); // Root nodes + children of prefix-a
      expect(controller.visibleNodes[1].id).toBe('word-apple');
      expect(controller.visibleNodes[2].id).toBe('word-ant');
    });

    it('should reset selection if current node becomes invisible', () => {
      controller.updateTree(sampleTree, new Set(['prefix-a']));
      controller.setSelection('word-apple');
      
      // Collapse the tree, making apple invisible
      controller.updateTree(sampleTree, new Set());
      
      expect(controller.currentNodeId).toBeNull();
      expect(controller.currentIndex).toBe(-1);
    });

    it('should maintain selection if current node remains visible', () => {
      controller.updateTree(sampleTree);
      controller.setSelection('word-banana');
      
      // Update tree without changing visibility of banana
      controller.updateTree(sampleTree, new Set());
      
      expect(controller.currentNodeId).toBe('word-banana');
      expect(controller.currentIndex).toBe(1);
    });
  });

  describe('Navigation - Arrow Down', () => {
    beforeEach(() => {
      controller.updateTree(sampleTree);
    });

    it('should navigate down to next node', () => {
      controller.setSelection('prefix-a');
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const handled = controller.handleKeyDown(event);
      
      expect(handled).toBe(true);
      expect(controller.getCurrentNode().id).toBe('word-banana');
      expect(mockCallbacks.onSelectionChange).toHaveBeenCalledWith('word-banana', expect.any(Object));
    });

    it('should wrap to first node when at end', () => {
      controller.setSelection('prefix-c');
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      controller.handleKeyDown(event);
      
      expect(controller.getCurrentNode().id).toBe('prefix-a');
    });

    it('should handle empty tree gracefully', () => {
      controller.updateTree([]);
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const handled = controller.handleKeyDown(event);
      
      expect(handled).toBe(false);
    });
  });

  describe('Navigation - Arrow Up', () => {
    beforeEach(() => {
      controller.updateTree(sampleTree);
    });

    it('should navigate up to previous node', () => {
      controller.setSelection('word-banana');
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      const handled = controller.handleKeyDown(event);
      
      expect(handled).toBe(true);
      expect(controller.getCurrentNode().id).toBe('prefix-a');
    });

    it('should wrap to last node when at beginning', () => {
      controller.setSelection('prefix-a');
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      controller.handleKeyDown(event);
      
      expect(controller.getCurrentNode().id).toBe('prefix-c');
    });
  });

  describe('Navigation - Arrow Right', () => {
    beforeEach(() => {
      controller.updateTree(sampleTree);
    });

    it('should expand collapsed node with children', () => {
      controller.setSelection('prefix-a');
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      const handled = controller.handleKeyDown(event);
      
      expect(handled).toBe(true);
      expect(controller.expandedNodes.has('prefix-a')).toBe(true);
      expect(mockCallbacks.onExpansionChange).toHaveBeenCalledWith('prefix-a', true);
    });

    it('should move to first child if node is already expanded', () => {
      controller.expandNode('prefix-a');
      controller.setSelection('prefix-a');
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      controller.handleKeyDown(event);
      
      expect(controller.getCurrentNode().id).toBe('word-apple');
    });

    it('should do nothing for leaf nodes', () => {
      controller.setSelection('word-banana');
      const initialIndex = controller.currentIndex;
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      controller.handleKeyDown(event);
      
      expect(controller.currentIndex).toBe(initialIndex);
    });
  });

  describe('Navigation - Arrow Left', () => {
    beforeEach(() => {
      controller.updateTree(sampleTree, new Set(['prefix-a']));
    });

    it('should collapse expanded node', () => {
      controller.setSelection('prefix-a');
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      const handled = controller.handleKeyDown(event);
      
      expect(handled).toBe(true);
      expect(controller.expandedNodes.has('prefix-a')).toBe(false);
      expect(mockCallbacks.onExpansionChange).toHaveBeenCalledWith('prefix-a', false);
    });

    it('should move to parent for leaf nodes', () => {
      controller.setSelection('word-apple');
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      controller.handleKeyDown(event);
      
      expect(controller.getCurrentNode().id).toBe('prefix-a');
    });

    it('should do nothing for root nodes without children', () => {
      controller.updateTree(sampleTree); // Collapse all
      controller.setSelection('word-banana');
      const initialIndex = controller.currentIndex;
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      controller.handleKeyDown(event);
      
      expect(controller.currentIndex).toBe(initialIndex);
    });
  });

  describe('Navigation - Enter Key', () => {
    beforeEach(() => {
      controller.updateTree(sampleTree);
    });

    it('should select word node', () => {
      controller.setSelection('word-banana');
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      const handled = controller.handleKeyDown(event);
      
      expect(handled).toBe(true);
      expect(mockCallbacks.onWordSelect).toHaveBeenCalledWith(expect.objectContaining({
        id: 'word-banana',
        word: 'banana'
      }));
    });

    it('should toggle expansion for prefix node', () => {
      controller.setSelection('prefix-a');
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      controller.handleKeyDown(event);
      
      expect(controller.expandedNodes.has('prefix-a')).toBe(true);
      expect(mockCallbacks.onExpansionChange).toHaveBeenCalledWith('prefix-a', true);
    });

    it('should collapse already expanded prefix node', () => {
      controller.expandNode('prefix-a');
      controller.setSelection('prefix-a');
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      controller.handleKeyDown(event);
      
      expect(controller.expandedNodes.has('prefix-a')).toBe(false);
    });
  });

  describe('Navigation - Escape Key', () => {
    beforeEach(() => {
      controller.updateTree(sampleTree);
    });

    it('should clear selection', () => {
      controller.setSelection('word-banana');
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      const handled = controller.handleKeyDown(event);
      
      expect(handled).toBe(true);
      expect(controller.currentNodeId).toBeNull();
      expect(controller.currentIndex).toBe(-1);
      expect(mockCallbacks.onSelectionChange).toHaveBeenCalledWith(null, null);
    });
  });

  describe('Navigation - Home/End Keys', () => {
    beforeEach(() => {
      controller.updateTree(sampleTree);
    });

    it('should navigate to first node with Home key', () => {
      controller.setSelection('prefix-c');
      
      const event = new KeyboardEvent('keydown', { key: 'Home' });
      const handled = controller.handleKeyDown(event);
      
      expect(handled).toBe(true);
      expect(controller.getCurrentNode().id).toBe('prefix-a');
      expect(controller.currentIndex).toBe(0);
    });

    it('should navigate to last node with End key', () => {
      controller.setSelection('prefix-a');
      
      const event = new KeyboardEvent('keydown', { key: 'End' });
      const handled = controller.handleKeyDown(event);
      
      expect(handled).toBe(true);
      expect(controller.getCurrentNode().id).toBe('prefix-c');
      expect(controller.currentIndex).toBe(2);
    });
  });

  describe('Node Expansion Management', () => {
    beforeEach(() => {
      controller.updateTree(sampleTree);
    });

    it('should expand node and update visible nodes', () => {
      const initialVisibleCount = controller.visibleNodes.length;
      
      controller.expandNode('prefix-a');
      
      expect(controller.expandedNodes.has('prefix-a')).toBe(true);
      expect(controller.visibleNodes.length).toBeGreaterThan(initialVisibleCount);
      expect(mockCallbacks.onExpansionChange).toHaveBeenCalledWith('prefix-a', true);
    });

    it('should collapse node and update visible nodes', () => {
      controller.expandNode('prefix-a');
      const expandedVisibleCount = controller.visibleNodes.length;
      
      controller.collapseNode('prefix-a');
      
      expect(controller.expandedNodes.has('prefix-a')).toBe(false);
      expect(controller.visibleNodes.length).toBeLessThan(expandedVisibleCount);
      expect(mockCallbacks.onExpansionChange).toHaveBeenCalledWith('prefix-a', false);
    });

    it('should toggle node expansion', () => {
      // Initially collapsed
      controller.toggleNodeExpansion('prefix-a');
      expect(controller.expandedNodes.has('prefix-a')).toBe(true);
      
      // Now expanded, should collapse
      controller.toggleNodeExpansion('prefix-a');
      expect(controller.expandedNodes.has('prefix-a')).toBe(false);
    });
  });

  describe('Selection Management', () => {
    beforeEach(() => {
      controller.updateTree(sampleTree);
    });

    it('should set selection to valid node', () => {
      controller.setSelection('word-banana');
      
      expect(controller.currentNodeId).toBe('word-banana');
      expect(controller.getCurrentNode().id).toBe('word-banana');
      expect(mockCallbacks.onSelectionChange).toHaveBeenCalledWith('word-banana', expect.any(Object));
    });

    it('should ignore invalid node selection', () => {
      controller.setSelection('invalid-node');
      
      expect(controller.currentNodeId).toBeNull();
      expect(controller.getCurrentNode()).toBeNull();
    });

    it('should return current node correctly', () => {
      controller.setSelection('word-banana');
      const currentNode = controller.getCurrentNode();
      
      expect(currentNode).toBeTruthy();
      expect(currentNode.id).toBe('word-banana');
      expect(currentNode.word).toBe('banana');
    });

    it('should return null when no selection', () => {
      expect(controller.getCurrentNode()).toBeNull();
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      controller.updateTree(sampleTree, new Set(['prefix-a']));
    });

    it('should return current index', () => {
      controller.setSelection('word-apple');
      expect(controller.getCurrentIndex()).toBe(1); // apple is second in visible nodes
    });

    it('should return visible nodes array', () => {
      const visibleNodes = controller.getVisibleNodes();
      expect(Array.isArray(visibleNodes)).toBe(true);
      expect(visibleNodes.length).toBeGreaterThan(0);
      expect(visibleNodes[0].id).toBe('prefix-a');
    });

    it('should reset controller state', () => {
      controller.setSelection('word-apple');
      controller.expandNode('prefix-c');
      
      controller.reset();
      
      expect(controller.currentNodeId).toBeNull();
      expect(controller.currentIndex).toBe(-1);
      expect(controller.visibleNodes).toEqual([]);
      expect(controller.treeNodes).toEqual([]);
      expect(controller.expandedNodes.size).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty tree gracefully', () => {
      controller.updateTree([]);
      
      expect(controller.visibleNodes).toEqual([]);
      expect(controller.getCurrentNode()).toBeNull();
      
      // Should not crash on navigation
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      expect(controller.handleKeyDown(event)).toBe(false);
    });

    it('should handle unknown key events', () => {
      controller.updateTree(sampleTree);
      
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      const handled = controller.handleKeyDown(event);
      
      expect(handled).toBe(false);
    });

    it('should handle navigation with single node', () => {
      const singleNodeTree = [sampleTree[1]]; // Just banana
      controller.updateTree(singleNodeTree);
      controller.setSelection('word-banana');
      
      // Should wrap to same node
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      controller.handleKeyDown(downEvent);
      expect(controller.getCurrentNode().id).toBe('word-banana');
      
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      controller.handleKeyDown(upEvent);
      expect(controller.getCurrentNode().id).toBe('word-banana');
    });

    it('should handle missing parent references gracefully', () => {
      const nodeWithoutParent = {
        ...sampleTree[0].children[0],
        parent: null
      };
      
      const treeWithMissingParent = [{
        ...sampleTree[0],
        children: [nodeWithoutParent]
      }];
      
      controller.updateTree(treeWithMissingParent, new Set([treeWithMissingParent[0].id]));
      controller.setSelection(nodeWithoutParent.id);
      
      // Should not crash when trying to navigate to parent
      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      expect(() => controller.handleKeyDown(leftEvent)).not.toThrow();
    });
  });

  describe('Depth-First Traversal', () => {
    it('should traverse nodes in correct depth-first order', () => {
      // Create a more complex tree structure
      const complexTree = [
        {
          id: 'a',
          type: NODE_TYPES.PREFIX,
          content: 'a',
          children: [
            {
              id: 'a1',
              type: NODE_TYPES.WORD,
              content: 'a1',
              children: []
            },
            {
              id: 'a2',
              type: NODE_TYPES.PREFIX,
              content: 'a2',
              children: [
                {
                  id: 'a2-1',
                  type: NODE_TYPES.WORD,
                  content: 'a2-1',
                  children: []
                }
              ]
            }
          ]
        },
        {
          id: 'b',
          type: NODE_TYPES.WORD,
          content: 'b',
          children: []
        }
      ];
      
      controller.updateTree(complexTree, new Set(['a', 'a2']));
      
      const expectedOrder = ['a', 'a1', 'a2', 'a2-1', 'b'];
      const actualOrder = controller.getVisibleNodes().map(node => node.id);
      
      expect(actualOrder).toEqual(expectedOrder);
    });
  });
});