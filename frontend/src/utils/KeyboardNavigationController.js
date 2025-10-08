/**
 * @fileoverview KeyboardNavigationController for managing tree traversal and keyboard navigation
 * This controller handles depth-first traversal, expand/collapse logic, and selection management
 * for the tree view component.
 */

import { NODE_TYPES } from '../types/tree.js';
import { 
  announce, 
  createSelectionAnnouncement, 
  createExpansionAnnouncement,
  createWordSelectionAnnouncement,
  createNavigationAnnouncement 
} from './screenReaderAnnouncements.js';

/**
 * Controller class for managing keyboard navigation in tree structures
 */
export class KeyboardNavigationController {
  /**
   * @param {Object} options - Configuration options
   * @param {Function} options.onSelectionChange - Callback when selection changes
   * @param {Function} options.onExpansionChange - Callback when node expansion changes
   * @param {Function} options.onWordSelect - Callback when a word node is selected
   */
  constructor(options = {}) {
    this.onSelectionChange = options.onSelectionChange || (() => {});
    this.onExpansionChange = options.onExpansionChange || (() => {});
    this.onWordSelect = options.onWordSelect || (() => {});
    
    // Navigation state
    this.currentNodeId = null;
    this.visibleNodes = [];
    this.currentIndex = -1;
    
    // Tree state
    this.treeNodes = [];
    this.expandedNodes = new Set();
  }

  /**
   * Updates the tree structure and recalculates visible nodes
   * @param {import('../types/tree.js').TreeNode[]} treeNodes - Root nodes of the tree
   * @param {Set<string>} expandedNodes - Set of expanded node IDs
   */
  updateTree(treeNodes, expandedNodes = new Set()) {
    this.treeNodes = treeNodes;
    this.expandedNodes = expandedNodes;
    this.visibleNodes = this._calculateVisibleNodes();
    
    // Reset selection if current node is no longer visible
    if (this.currentNodeId && !this._isNodeVisible(this.currentNodeId)) {
      this.currentNodeId = null;
      this.currentIndex = -1;
    } else if (this.currentNodeId) {
      // Update current index based on current node
      this.currentIndex = this.visibleNodes.findIndex(node => node.id === this.currentNodeId);
    }
  }

  /**
   * Handles keyboard events and performs appropriate navigation actions
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {boolean} True if the event was handled, false otherwise
   */
  handleKeyDown(event) {
    if (this.visibleNodes.length === 0) {
      return false;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this._navigateDown();
        return true;
      
      case 'ArrowUp':
        event.preventDefault();
        this._navigateUp();
        return true;
      
      case 'ArrowRight':
        event.preventDefault();
        this._navigateRight();
        return true;
      
      case 'ArrowLeft':
        event.preventDefault();
        this._navigateLeft();
        return true;
      
      case 'Enter':
        event.preventDefault();
        this._handleEnter();
        return true;
      
      case 'Escape':
        event.preventDefault();
        this._handleEscape();
        return true;
      
      case 'Home':
        event.preventDefault();
        this._navigateToFirst();
        return true;
      
      case 'End':
        event.preventDefault();
        this._navigateToLast();
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Sets the current selection to a specific node
   * @param {string} nodeId - ID of the node to select
   * @param {boolean} announceSelection - Whether to announce the selection to screen readers
   */
  setSelection(nodeId, announceSelection = false) {
    const nodeIndex = this.visibleNodes.findIndex(node => node.id === nodeId);
    if (nodeIndex !== -1) {
      const previousNodeId = this.currentNodeId;
      this.currentNodeId = nodeId;
      this.currentIndex = nodeIndex;
      this.onSelectionChange(nodeId, this.visibleNodes[nodeIndex]);
      
      // Announce selection to screen readers if requested
      if (announceSelection) {
        const node = this.visibleNodes[nodeIndex];
        const announcement = createSelectionAnnouncement(
          node, 
          nodeIndex + 1, 
          this.visibleNodes.length
        );
        announce(announcement);
      }
    }
  }

  /**
   * Gets the currently selected node
   * @returns {import('../types/tree.js').TreeNode|null} Currently selected node or null
   */
  getCurrentNode() {
    if (this.currentIndex >= 0 && this.currentIndex < this.visibleNodes.length) {
      return this.visibleNodes[this.currentIndex];
    }
    return null;
  }

  /**
   * Gets the current selection index
   * @returns {number} Current selection index (-1 if no selection)
   */
  getCurrentIndex() {
    return this.currentIndex;
  }

  /**
   * Gets the array of currently visible nodes
   * @returns {import('../types/tree.js').TreeNode[]} Array of visible nodes
   */
  getVisibleNodes() {
    return [...this.visibleNodes];
  }

  /**
   * Expands a node and updates the visible nodes list
   * @param {string} nodeId - ID of the node to expand
   * @param {boolean} announceExpansion - Whether to announce the expansion to screen readers
   */
  expandNode(nodeId, announceExpansion = false) {
    const node = this._findNodeById(nodeId);
    this.expandedNodes.add(nodeId);
    this.visibleNodes = this._calculateVisibleNodes();
    this.onExpansionChange(nodeId, true);
    
    // Update current index if needed
    if (this.currentNodeId) {
      this.currentIndex = this.visibleNodes.findIndex(node => node.id === this.currentNodeId);
    }
    
    // Announce expansion to screen readers if requested
    if (announceExpansion && node) {
      const announcement = createExpansionAnnouncement(node, true);
      announce(announcement);
    }
  }

  /**
   * Collapses a node and updates the visible nodes list
   * @param {string} nodeId - ID of the node to collapse
   * @param {boolean} announceCollapse - Whether to announce the collapse to screen readers
   */
  collapseNode(nodeId, announceCollapse = false) {
    const node = this._findNodeById(nodeId);
    this.expandedNodes.delete(nodeId);
    this.visibleNodes = this._calculateVisibleNodes();
    this.onExpansionChange(nodeId, false);
    
    // Update current index if needed
    if (this.currentNodeId) {
      this.currentIndex = this.visibleNodes.findIndex(node => node.id === this.currentNodeId);
    }
    
    // Announce collapse to screen readers if requested
    if (announceCollapse && node) {
      const announcement = createExpansionAnnouncement(node, false);
      announce(announcement);
    }
  }

  /**
   * Toggles the expansion state of a node
   * @param {string} nodeId - ID of the node to toggle
   */
  toggleNodeExpansion(nodeId) {
    if (this.expandedNodes.has(nodeId)) {
      this.collapseNode(nodeId);
    } else {
      this.expandNode(nodeId);
    }
  }

  /**
   * Resets the navigation state
   */
  reset() {
    this.currentNodeId = null;
    this.currentIndex = -1;
    this.visibleNodes = [];
    this.treeNodes = [];
    this.expandedNodes.clear();
  }

  // Private methods

  /**
   * Navigates to the next visible node (depth-first traversal)
   * @private
   */
  _navigateDown() {
    if (this.visibleNodes.length === 0) return;
    
    const previousNode = this.getCurrentNode();
    const nextIndex = this.currentIndex < this.visibleNodes.length - 1 
      ? this.currentIndex + 1 
      : 0;
    
    this._setCurrentIndex(nextIndex);
    
    // Announce navigation to screen readers
    const currentNode = this.getCurrentNode();
    if (currentNode) {
      const announcement = createNavigationAnnouncement('down', previousNode, currentNode);
      announce(announcement);
    }
  }

  /**
   * Navigates to the previous visible node
   * @private
   */
  _navigateUp() {
    if (this.visibleNodes.length === 0) return;
    
    const previousNode = this.getCurrentNode();
    const prevIndex = this.currentIndex > 0 
      ? this.currentIndex - 1 
      : this.visibleNodes.length - 1;
    
    this._setCurrentIndex(prevIndex);
    
    // Announce navigation to screen readers
    const currentNode = this.getCurrentNode();
    if (currentNode) {
      const announcement = createNavigationAnnouncement('up', previousNode, currentNode);
      announce(announcement);
    }
  }

  /**
   * Handles right arrow key - expands node or moves to first child
   * @private
   */
  _navigateRight() {
    const currentNode = this.getCurrentNode();
    if (!currentNode) return;
    
    // If node has children and is collapsed, expand it
    if (currentNode.children && currentNode.children.length > 0) {
      if (!this.expandedNodes.has(currentNode.id)) {
        this.expandNode(currentNode.id, true); // Announce expansion
        return;
      }
      
      // If already expanded, move to first child
      const firstChildIndex = this.currentIndex + 1;
      if (firstChildIndex < this.visibleNodes.length) {
        const previousNode = currentNode;
        this._setCurrentIndex(firstChildIndex);
        
        // Announce navigation to screen readers
        const newCurrentNode = this.getCurrentNode();
        if (newCurrentNode) {
          const announcement = createNavigationAnnouncement('right', previousNode, newCurrentNode);
          announce(announcement);
        }
      }
    }
  }

  /**
   * Handles left arrow key - collapses node or moves to parent
   * @private
   */
  _navigateLeft() {
    const currentNode = this.getCurrentNode();
    if (!currentNode) return;
    
    // If node is expanded, collapse it
    if (currentNode.children && 
        currentNode.children.length > 0 && 
        this.expandedNodes.has(currentNode.id)) {
      this.collapseNode(currentNode.id, true); // Announce collapse
      return;
    }
    
    // If node is a leaf or collapsed, move to parent
    // Find parent in the tree structure and navigate to it
    const parentNode = this._findParentInVisibleNodes(currentNode);
    if (parentNode) {
      const parentIndex = this.visibleNodes.findIndex(node => node.id === parentNode.id);
      if (parentIndex !== -1) {
        const previousNode = currentNode;
        this._setCurrentIndex(parentIndex);
        
        // Announce navigation to screen readers
        const newCurrentNode = this.getCurrentNode();
        if (newCurrentNode) {
          const announcement = createNavigationAnnouncement('left', previousNode, newCurrentNode);
          announce(announcement);
        }
      }
    }
  }

  /**
   * Handles Enter key - selects word or toggles expansion
   * @private
   */
  _handleEnter() {
    const currentNode = this.getCurrentNode();
    if (!currentNode) return;
    
    if (currentNode.type === NODE_TYPES.WORD) {
      // Select the word
      this.onWordSelect(currentNode);
      
      // Announce word selection to screen readers
      const announcement = createWordSelectionAnnouncement(currentNode);
      announce(announcement);
    } else if (currentNode.type === NODE_TYPES.PREFIX) {
      // Toggle expansion for prefix nodes
      const wasExpanded = this.expandedNodes.has(currentNode.id);
      this.toggleNodeExpansion(currentNode.id);
      
      // Announce expansion change to screen readers
      const announcement = createExpansionAnnouncement(currentNode, !wasExpanded);
      announce(announcement);
    }
  }

  /**
   * Handles Escape key - clears selection and calls escape handler
   * @private
   */
  _handleEscape() {
    const previousNodeId = this.currentNodeId;
    this.currentNodeId = null;
    this.currentIndex = -1;
    
    // Only call selection change if there was actually a selection to clear
    if (previousNodeId) {
      this.onSelectionChange(null, null);
      
      // Announce clearing of selection to screen readers
      announce('Selection cleared');
    }
  }

  /**
   * Navigates to the first visible node
   * @private
   */
  _navigateToFirst() {
    if (this.visibleNodes.length > 0) {
      this._setCurrentIndex(0);
    }
  }

  /**
   * Navigates to the last visible node
   * @private
   */
  _navigateToLast() {
    if (this.visibleNodes.length > 0) {
      this._setCurrentIndex(this.visibleNodes.length - 1);
    }
  }

  /**
   * Sets the current index and updates selection
   * @private
   * @param {number} index - New index to set
   */
  _setCurrentIndex(index) {
    if (index >= 0 && index < this.visibleNodes.length) {
      this.currentIndex = index;
      const node = this.visibleNodes[index];
      this.currentNodeId = node.id;
      this.onSelectionChange(node.id, node);
    }
  }

  /**
   * Calculates the list of currently visible nodes using depth-first traversal
   * @private
   * @returns {import('../types/tree.js').TreeNode[]} Array of visible nodes
   */
  _calculateVisibleNodes() {
    const visible = [];
    
    const traverse = (nodes) => {
      for (const node of nodes) {
        visible.push(node);
        
        // If node is expanded and has children, traverse them
        if (this.expandedNodes.has(node.id) && node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };
    
    traverse(this.treeNodes);
    return visible;
  }

  /**
   * Checks if a node is currently visible
   * @private
   * @param {string} nodeId - ID of the node to check
   * @returns {boolean} True if the node is visible
   */
  _isNodeVisible(nodeId) {
    return this.visibleNodes.some(node => node.id === nodeId);
  }

  /**
   * Finds a node by ID in the tree structure
   * @private
   * @param {string} nodeId - ID of the node to find
   * @param {import('../types/tree.js').TreeNode[]} nodes - Nodes to search in
   * @returns {import('../types/tree.js').TreeNode|null} Found node or null
   */
  _findNodeById(nodeId, nodes = this.treeNodes) {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return node;
      }
      
      if (node.children && node.children.length > 0) {
        const found = this._findNodeById(nodeId, node.children);
        if (found) {
          return found;
        }
      }
    }
    
    return null;
  }

  /**
   * Finds the parent of a node in the visible nodes list
   * @private
   * @param {import('../types/tree.js').TreeNode} node - Node to find parent for
   * @returns {import('../types/tree.js').TreeNode|null} Parent node or null
   */
  _findParentInVisibleNodes(node) {
    // Look for a node at a lower depth that comes before this node in the visible list
    const currentIndex = this.visibleNodes.findIndex(n => n.id === node.id);
    if (currentIndex === -1) return null;
    
    const targetDepth = node.depth - 1;
    if (targetDepth < 0) return null;
    
    // Search backwards from current position for a node at the target depth
    for (let i = currentIndex - 1; i >= 0; i--) {
      const candidate = this.visibleNodes[i];
      if (candidate.depth === targetDepth) {
        return candidate;
      }
      if (candidate.depth < targetDepth) {
        // We've gone too far back
        break;
      }
    }
    
    return null;
  }
}

/**
 * Creates a new KeyboardNavigationController instance with default options
 * @param {Object} options - Configuration options
 * @returns {KeyboardNavigationController} New controller instance
 */
export function createKeyboardNavigationController(options = {}) {
  return new KeyboardNavigationController(options);
}

export default KeyboardNavigationController;