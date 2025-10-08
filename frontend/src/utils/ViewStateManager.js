/**
 * @fileoverview ViewStateManager for handling view mode switching and state preservation
 */

import { VIEW_MODES } from '../types/tree.js';

/**
 * Manages view state and handles switching between tree and list views
 */
export class ViewStateManager {
  constructor() {
    this.state = {
      mode: this._getStoredViewMode(),
      selectedIndex: -1,
      selectedNodeId: null,
      scrollPosition: 0,
      expandedNodes: new Set(),
      keyboardNavigation: {
        currentIndex: -1,
        visibleNodes: []
      }
    };
    
    this.listeners = new Set();
  }

  /**
   * Gets the current view mode
   * @returns {string} Current view mode
   */
  getViewMode() {
    return this.state.mode;
  }

  /**
   * Sets the view mode and persists the preference
   * @param {string} mode - New view mode
   */
  setViewMode(mode) {
    if (mode !== this.state.mode && Object.values(VIEW_MODES).includes(mode)) {
      const oldMode = this.state.mode;
      this.state.mode = mode;
      
      // Persist preference
      this._storeViewMode(mode);
      
      // Notify listeners
      this._notifyListeners('viewModeChanged', { oldMode, newMode: mode });
    }
  }

  /**
   * Gets the current selection state
   * @returns {Object} Selection state
   */
  getSelectionState() {
    return {
      selectedIndex: this.state.selectedIndex,
      selectedNodeId: this.state.selectedNodeId,
      scrollPosition: this.state.scrollPosition
    };
  }

  /**
   * Updates selection state for list view
   * @param {number} selectedIndex - Selected index in list
   * @param {number} scrollPosition - Current scroll position
   */
  updateListSelection(selectedIndex, scrollPosition = 0) {
    this.state.selectedIndex = selectedIndex;
    this.state.scrollPosition = scrollPosition;
    this.state.selectedNodeId = null; // Clear tree selection
    
    this._notifyListeners('selectionChanged', {
      mode: VIEW_MODES.LIST,
      selectedIndex,
      scrollPosition
    });
  }

  /**
   * Updates selection state for tree view
   * @param {string|null} selectedNodeId - Selected node ID
   * @param {Set<string>} expandedNodes - Set of expanded node IDs
   * @param {number} scrollPosition - Current scroll position
   */
  updateTreeSelection(selectedNodeId, expandedNodes = new Set(), scrollPosition = 0) {
    this.state.selectedNodeId = selectedNodeId;
    this.state.expandedNodes = new Set(expandedNodes);
    this.state.scrollPosition = scrollPosition;
    this.state.selectedIndex = -1; // Clear list selection
    
    this._notifyListeners('selectionChanged', {
      mode: VIEW_MODES.TREE,
      selectedNodeId,
      expandedNodes: this.state.expandedNodes,
      scrollPosition
    });
  }

  /**
   * Gets expanded nodes for tree view
   * @returns {Set<string>} Set of expanded node IDs
   */
  getExpandedNodes() {
    return new Set(this.state.expandedNodes);
  }

  /**
   * Updates keyboard navigation state
   * @param {Object} navigationState - Keyboard navigation state
   */
  updateKeyboardNavigation(navigationState) {
    this.state.keyboardNavigation = { ...navigationState };
    
    this._notifyListeners('keyboardNavigationChanged', navigationState);
  }

  /**
   * Preserves current selection when switching views
   * @param {string} newMode - Target view mode
   * @param {Array} suggestions - Current suggestions array
   * @param {Array} treeNodes - Current tree nodes array
   * @returns {Object} Preserved selection state for new mode
   */
  preserveSelectionOnViewSwitch(newMode, suggestions = [], treeNodes = []) {
    const currentSelection = this.getSelectionState();
    
    if (newMode === VIEW_MODES.LIST) {
      // Switching to list view - try to find equivalent list index
      if (this.state.selectedNodeId && treeNodes.length > 0) {
        const selectedNode = this._findNodeById(treeNodes, this.state.selectedNodeId);
        if (selectedNode && selectedNode.word) {
          const listIndex = suggestions.findIndex(s => s.word === selectedNode.word);
          return {
            selectedIndex: listIndex >= 0 ? listIndex : 0,
            scrollPosition: Math.max(0, currentSelection.scrollPosition)
          };
        }
      }
      
      return {
        selectedIndex: 0,
        scrollPosition: 0
      };
    } else {
      // Switching to tree view - try to find equivalent node
      if (this.state.selectedIndex >= 0 && suggestions[this.state.selectedIndex]) {
        const selectedWord = suggestions[this.state.selectedIndex].word;
        const selectedNode = this._findNodeByWord(treeNodes, selectedWord);
        
        return {
          selectedNodeId: selectedNode ? selectedNode.id : null,
          expandedNodes: this.state.expandedNodes,
          scrollPosition: Math.max(0, currentSelection.scrollPosition)
        };
      }
      
      return {
        selectedNodeId: null,
        expandedNodes: this.state.expandedNodes,
        scrollPosition: 0
      };
    }
  }

  /**
   * Resets all state
   */
  reset() {
    this.state = {
      mode: this.state.mode, // Keep view mode preference
      selectedIndex: -1,
      selectedNodeId: null,
      scrollPosition: 0,
      expandedNodes: new Set(),
      keyboardNavigation: {
        currentIndex: -1,
        visibleNodes: []
      }
    };
    
    this._notifyListeners('stateReset');
  }

  /**
   * Adds a state change listener
   * @param {Function} listener - Listener function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Removes a state change listener
   * @param {Function} listener - Listener function
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Gets stored view mode preference from localStorage
   * @private
   * @returns {string} Stored view mode or default
   */
  _getStoredViewMode() {
    try {
      const stored = localStorage.getItem('autocomplete-view-mode');
      return Object.values(VIEW_MODES).includes(stored) ? stored : VIEW_MODES.LIST;
    } catch (error) {
      console.warn('Failed to read view mode preference:', error);
      return VIEW_MODES.LIST;
    }
  }

  /**
   * Stores view mode preference in localStorage
   * @private
   * @param {string} mode - View mode to store
   */
  _storeViewMode(mode) {
    try {
      localStorage.setItem('autocomplete-view-mode', mode);
    } catch (error) {
      console.warn('Failed to store view mode preference:', error);
    }
  }

  /**
   * Finds a tree node by ID
   * @private
   * @param {Array} nodes - Tree nodes to search
   * @param {string} nodeId - Node ID to find
   * @returns {Object|null} Found node or null
   */
  _findNodeById(nodes, nodeId) {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return node;
      }
      
      if (node.children && node.children.length > 0) {
        const found = this._findNodeById(node.children, nodeId);
        if (found) return found;
      }
    }
    
    return null;
  }

  /**
   * Finds a tree node by word
   * @private
   * @param {Array} nodes - Tree nodes to search
   * @param {string} word - Word to find
   * @returns {Object|null} Found node or null
   */
  _findNodeByWord(nodes, word) {
    for (const node of nodes) {
      if (node.word === word) {
        return node;
      }
      
      if (node.children && node.children.length > 0) {
        const found = this._findNodeByWord(node.children, word);
        if (found) return found;
      }
    }
    
    return null;
  }

  /**
   * Notifies all listeners of state changes
   * @private
   * @param {string} eventType - Type of event
   * @param {*} data - Event data
   */
  _notifyListeners(eventType, data) {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, data);
      } catch (error) {
        console.error('Error in view state listener:', error);
      }
    });
  }
}

/**
 * Default ViewStateManager instance
 */
export const defaultViewStateManager = new ViewStateManager();