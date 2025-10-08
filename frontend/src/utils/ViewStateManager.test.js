/**
 * @fileoverview Tests for ViewStateManager utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ViewStateManager } from './ViewStateManager';
import { VIEW_MODES } from '../types/tree';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('ViewStateManager', () => {
  let viewStateManager;
  let mockListener;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    viewStateManager = new ViewStateManager();
    mockListener = vi.fn();
  });

  afterEach(() => {
    viewStateManager.removeListener(mockListener);
  });

  describe('View Mode Management', () => {
    it('initializes with list view mode by default', () => {
      expect(viewStateManager.getViewMode()).toBe(VIEW_MODES.LIST);
    });

    it('loads stored view mode from localStorage', () => {
      localStorageMock.getItem.mockReturnValue(VIEW_MODES.TREE);
      const manager = new ViewStateManager();
      
      expect(manager.getViewMode()).toBe(VIEW_MODES.TREE);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('autocomplete-view-mode');
    });

    it('falls back to list view when localStorage has invalid value', () => {
      localStorageMock.getItem.mockReturnValue('invalid-mode');
      const manager = new ViewStateManager();
      
      expect(manager.getViewMode()).toBe(VIEW_MODES.LIST);
    });

    it('handles localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const manager = new ViewStateManager();
      
      expect(manager.getViewMode()).toBe(VIEW_MODES.LIST);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to read view mode preference:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('sets view mode and persists to localStorage', () => {
      viewStateManager.setViewMode(VIEW_MODES.TREE);
      
      expect(viewStateManager.getViewMode()).toBe(VIEW_MODES.TREE);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('autocomplete-view-mode', VIEW_MODES.TREE);
    });

    it('ignores invalid view modes', () => {
      const originalMode = viewStateManager.getViewMode();
      viewStateManager.setViewMode('invalid-mode');
      
      expect(viewStateManager.getViewMode()).toBe(originalMode);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('does not change mode when setting same mode', () => {
      viewStateManager.addListener(mockListener);
      const currentMode = viewStateManager.getViewMode();
      
      viewStateManager.setViewMode(currentMode);
      
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('notifies listeners when view mode changes', () => {
      viewStateManager.addListener(mockListener);
      
      viewStateManager.setViewMode(VIEW_MODES.TREE);
      
      expect(mockListener).toHaveBeenCalledWith('viewModeChanged', {
        oldMode: VIEW_MODES.LIST,
        newMode: VIEW_MODES.TREE
      });
    });

    it('handles localStorage write errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage write error');
      });
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      viewStateManager.setViewMode(VIEW_MODES.TREE);
      
      expect(viewStateManager.getViewMode()).toBe(VIEW_MODES.TREE);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to store view mode preference:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Selection State Management', () => {
    it('initializes with default selection state', () => {
      const state = viewStateManager.getSelectionState();
      
      expect(state).toEqual({
        selectedIndex: -1,
        selectedNodeId: null,
        scrollPosition: 0
      });
    });

    it('updates list selection state', () => {
      viewStateManager.addListener(mockListener);
      
      viewStateManager.updateListSelection(2, 100);
      
      const state = viewStateManager.getSelectionState();
      expect(state.selectedIndex).toBe(2);
      expect(state.scrollPosition).toBe(100);
      expect(state.selectedNodeId).toBeNull();
      
      expect(mockListener).toHaveBeenCalledWith('selectionChanged', {
        mode: VIEW_MODES.LIST,
        selectedIndex: 2,
        scrollPosition: 100
      });
    });

    it('updates tree selection state', () => {
      viewStateManager.addListener(mockListener);
      const expandedNodes = new Set(['node1', 'node2']);
      
      viewStateManager.updateTreeSelection('node3', expandedNodes, 150);
      
      const state = viewStateManager.getSelectionState();
      expect(state.selectedNodeId).toBe('node3');
      expect(state.scrollPosition).toBe(150);
      expect(state.selectedIndex).toBe(-1);
      
      const storedExpandedNodes = viewStateManager.getExpandedNodes();
      expect(storedExpandedNodes).toEqual(expandedNodes);
      
      expect(mockListener).toHaveBeenCalledWith('selectionChanged', {
        mode: VIEW_MODES.TREE,
        selectedNodeId: 'node3',
        expandedNodes: expect.any(Set),
        scrollPosition: 150
      });
    });

    it('clears opposite selection when updating', () => {
      // Set initial tree selection
      viewStateManager.updateTreeSelection('node1', new Set(['node2']));
      
      // Update list selection should clear tree selection
      viewStateManager.updateListSelection(1);
      
      const state = viewStateManager.getSelectionState();
      expect(state.selectedIndex).toBe(1);
      expect(state.selectedNodeId).toBeNull();
    });
  });

  describe('Expanded Nodes Management', () => {
    it('returns empty set initially', () => {
      const expandedNodes = viewStateManager.getExpandedNodes();
      expect(expandedNodes).toEqual(new Set());
    });

    it('returns copy of expanded nodes set', () => {
      const originalSet = new Set(['node1', 'node2']);
      viewStateManager.updateTreeSelection('node3', originalSet);
      
      const returnedSet = viewStateManager.getExpandedNodes();
      expect(returnedSet).toEqual(originalSet);
      expect(returnedSet).not.toBe(originalSet); // Should be a copy
    });
  });

  describe('Keyboard Navigation State', () => {
    it('updates keyboard navigation state', () => {
      viewStateManager.addListener(mockListener);
      const navigationState = {
        currentIndex: 5,
        visibleNodes: [{ id: 'node1' }, { id: 'node2' }]
      };
      
      viewStateManager.updateKeyboardNavigation(navigationState);
      
      expect(mockListener).toHaveBeenCalledWith('keyboardNavigationChanged', navigationState);
    });
  });

  describe('Selection Preservation', () => {
    const mockSuggestions = [
      { word: 'Tokyo', frequency: 100 },
      { word: 'Toronto', frequency: 80 },
      { word: 'Test', frequency: 50 }
    ];

    const mockTreeNodes = [
      { id: 'node1', word: 'Tokyo', type: 'word' },
      { id: 'node2', word: 'Toronto', type: 'word' },
      { id: 'node3', word: 'Test', type: 'word' }
    ];

    it('preserves selection when switching from tree to list', () => {
      viewStateManager.updateTreeSelection('node2', new Set(), 100);
      
      const preserved = viewStateManager.preserveSelectionOnViewSwitch(
        VIEW_MODES.LIST,
        mockSuggestions,
        mockTreeNodes
      );
      
      expect(preserved.selectedIndex).toBe(1); // Toronto is at index 1
      expect(preserved.scrollPosition).toBe(100);
    });

    it('preserves selection when switching from list to tree', () => {
      viewStateManager.updateListSelection(2, 150);
      
      const preserved = viewStateManager.preserveSelectionOnViewSwitch(
        VIEW_MODES.TREE,
        mockSuggestions,
        mockTreeNodes
      );
      
      expect(preserved.selectedNodeId).toBe('node3'); // Test word
      expect(preserved.scrollPosition).toBe(150);
    });

    it('handles missing node when switching to list', () => {
      viewStateManager.updateTreeSelection('nonexistent-node', new Set(), 100);
      
      const preserved = viewStateManager.preserveSelectionOnViewSwitch(
        VIEW_MODES.LIST,
        mockSuggestions,
        mockTreeNodes
      );
      
      expect(preserved.selectedIndex).toBe(0);
      expect(preserved.scrollPosition).toBe(100);
    });

    it('handles out of bounds index when switching to tree', () => {
      viewStateManager.updateListSelection(10, 150);
      
      const preserved = viewStateManager.preserveSelectionOnViewSwitch(
        VIEW_MODES.TREE,
        mockSuggestions,
        mockTreeNodes
      );
      
      expect(preserved.selectedNodeId).toBeNull();
      expect(preserved.scrollPosition).toBe(0);
    });

    it('handles empty arrays gracefully', () => {
      viewStateManager.updateListSelection(1, 100);
      
      const preserved = viewStateManager.preserveSelectionOnViewSwitch(
        VIEW_MODES.TREE,
        [],
        []
      );
      
      expect(preserved.selectedNodeId).toBeNull();
      expect(preserved.scrollPosition).toBe(0);
    });
  });

  describe('State Reset', () => {
    it('resets all state except view mode', () => {
      viewStateManager.addListener(mockListener);
      viewStateManager.setViewMode(VIEW_MODES.TREE);
      viewStateManager.updateTreeSelection('node1', new Set(['node2']), 100);
      
      viewStateManager.reset();
      
      expect(viewStateManager.getViewMode()).toBe(VIEW_MODES.TREE); // Preserved
      
      const state = viewStateManager.getSelectionState();
      expect(state.selectedIndex).toBe(-1);
      expect(state.selectedNodeId).toBeNull();
      expect(state.scrollPosition).toBe(0);
      
      expect(viewStateManager.getExpandedNodes()).toEqual(new Set());
      
      expect(mockListener).toHaveBeenCalledWith('stateReset');
    });
  });

  describe('Listener Management', () => {
    it('adds and removes listeners', () => {
      viewStateManager.addListener(mockListener);
      viewStateManager.setViewMode(VIEW_MODES.TREE);
      
      expect(mockListener).toHaveBeenCalled();
      
      mockListener.mockClear();
      viewStateManager.removeListener(mockListener);
      viewStateManager.setViewMode(VIEW_MODES.LIST);
      
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('handles listener errors gracefully', () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      viewStateManager.addListener(errorListener);
      viewStateManager.addListener(mockListener);
      
      viewStateManager.setViewMode(VIEW_MODES.TREE);
      
      expect(consoleSpy).toHaveBeenCalledWith('Error in view state listener:', expect.any(Error));
      expect(mockListener).toHaveBeenCalled(); // Other listeners should still work
      
      consoleSpy.mockRestore();
    });

    it('allows multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      viewStateManager.addListener(listener1);
      viewStateManager.addListener(listener2);
      
      viewStateManager.setViewMode(VIEW_MODES.TREE);
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });
});