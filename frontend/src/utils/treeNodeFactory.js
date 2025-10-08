/**
 * @fileoverview Factory functions and validation utilities for tree nodes
 */

import { NODE_TYPES } from '../types/tree.js';

/**
 * Factory class for creating and validating tree nodes
 */
export class TreeNodeFactory {
  /**
   * Creates a new word node
   * @param {Object} options - Node creation options
   * @param {string} options.word - The word for this node
   * @param {number} [options.frequency=0] - Search frequency
   * @param {string} [options.suggestionType='exact_match'] - Type of suggestion
   * @param {number} [options.depth=0] - Node depth in tree
   * @param {import('../types/tree.js').TreeNode|null} [options.parent=null] - Parent node
   * @param {string} [options.originalQuery] - Original query for typo corrections
   * @param {number} [options.editDistance] - Edit distance for typo corrections
   * @param {number} [options.similarity] - Similarity score (0-1)
   * @param {string} [options.category] - Category of the suggestion
   * @param {string} [options.correctionType] - Type of correction applied
   * @returns {import('../types/tree.js').TreeNode} Created word node
   */
  static createWordNode({
    word,
    frequency = 0,
    suggestionType = 'exact_match',
    depth = 0,
    parent = null,
    originalQuery,
    editDistance,
    similarity,
    category,
    correctionType
  }) {
    if (!word || typeof word !== 'string') {
      throw new Error('Word is required and must be a string');
    }

    return {
      id: this._generateNodeId('word', word),
      type: NODE_TYPES.WORD,
      content: word,
      prefix: word,
      isExpanded: false,
      isSelected: false,
      depth: Math.max(0, depth),
      children: [],
      parent,
      
      // Word-specific properties
      word,
      frequency: Math.max(0, frequency),
      suggestionType,
      originalQuery,
      editDistance: editDistance !== undefined ? Math.max(0, editDistance) : undefined,
      similarity: similarity !== undefined ? Math.max(0, Math.min(1, similarity)) : undefined,
      category,
      correctionType
    };
  }

  /**
   * Creates a new prefix node
   * @param {Object} options - Node creation options
   * @param {string} options.content - Display content (character or merged prefix)
   * @param {string} options.prefix - Full prefix path
   * @param {number} [options.depth=0] - Node depth in tree
   * @param {import('../types/tree.js').TreeNode|null} [options.parent=null] - Parent node
   * @param {number} [options.childCount=0] - Number of direct children
   * @param {number} [options.totalFrequency=0] - Sum of descendant frequencies
   * @returns {import('../types/tree.js').TreeNode} Created prefix node
   */
  static createPrefixNode({
    content,
    prefix,
    depth = 0,
    parent = null,
    childCount = 0,
    totalFrequency = 0
  }) {
    if (!content || typeof content !== 'string') {
      throw new Error('Content is required and must be a string');
    }
    
    if (!prefix || typeof prefix !== 'string') {
      throw new Error('Prefix is required and must be a string');
    }

    return {
      id: this._generateNodeId('prefix', prefix),
      type: NODE_TYPES.PREFIX,
      content,
      prefix,
      isExpanded: false,
      isSelected: false,
      depth: Math.max(0, depth),
      children: [],
      parent,
      
      // Prefix-specific properties
      childCount: Math.max(0, childCount),
      totalFrequency: Math.max(0, totalFrequency)
    };
  }

  /**
   * Creates a node from a suggestion object
   * @param {import('../types/tree.js').Suggestion} suggestion - Source suggestion
   * @param {number} [depth=0] - Node depth
   * @param {import('../types/tree.js').TreeNode|null} [parent=null] - Parent node
   * @returns {import('../types/tree.js').TreeNode} Created node
   */
  static createFromSuggestion(suggestion, depth = 0, parent = null) {
    if (!TreeNodeValidator.isValidSuggestion(suggestion)) {
      throw new Error('Invalid suggestion object');
    }

    return this.createWordNode({
      word: suggestion.word,
      frequency: suggestion.frequency,
      suggestionType: suggestion.type,
      depth,
      parent,
      originalQuery: suggestion.originalQuery,
      editDistance: suggestion.editDistance,
      similarity: suggestion.similarity,
      category: suggestion.category,
      correctionType: suggestion.correctionType
    });
  }

  /**
   * Clones a tree node with optional property overrides
   * @param {import('../types/tree.js').TreeNode} node - Node to clone
   * @param {Object} [overrides={}] - Properties to override
   * @returns {import('../types/tree.js').TreeNode} Cloned node
   */
  static cloneNode(node, overrides = {}) {
    if (!TreeNodeValidator.isValidTreeNode(node)) {
      throw new Error('Invalid tree node');
    }

    const cloned = {
      ...node,
      children: [...node.children], // Shallow copy of children array
      ...overrides
    };

    // Generate new ID if not explicitly overridden
    if (!overrides.id) {
      cloned.id = this._generateNodeId(node.type, node.prefix || node.word);
    }

    return cloned;
  }

  /**
   * Generates a unique node ID
   * @private
   * @param {string} type - Node type
   * @param {string} identifier - Unique identifier (word or prefix)
   * @returns {string} Generated ID
   */
  static _generateNodeId(type, identifier) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${type}-${identifier}-${timestamp}-${random}`;
  }
}

/**
 * Validation utilities for tree nodes and related objects
 */
export class TreeNodeValidator {
  /**
   * Validates if an object is a valid tree node
   * @param {any} node - Object to validate
   * @returns {boolean} True if valid tree node
   */
  static isValidTreeNode(node) {
    if (!node || typeof node !== 'object') {
      return false;
    }

    const requiredProps = ['id', 'type', 'content', 'prefix', 'isExpanded', 'isSelected', 'depth', 'children'];
    
    // Check required properties
    for (const prop of requiredProps) {
      if (!(prop in node)) {
        return false;
      }
    }

    // Validate property types
    if (typeof node.id !== 'string' || node.id.length === 0) {
      return false;
    }

    if (!Object.values(NODE_TYPES).includes(node.type)) {
      return false;
    }

    if (typeof node.content !== 'string') {
      return false;
    }

    if (typeof node.prefix !== 'string') {
      return false;
    }

    if (typeof node.isExpanded !== 'boolean') {
      return false;
    }

    if (typeof node.isSelected !== 'boolean') {
      return false;
    }

    if (typeof node.depth !== 'number' || node.depth < 0) {
      return false;
    }

    if (!Array.isArray(node.children)) {
      return false;
    }

    // Validate type-specific properties
    if (node.type === NODE_TYPES.WORD) {
      if (typeof node.word !== 'string' || node.word.length === 0) {
        return false;
      }
      
      if (typeof node.frequency !== 'number' || node.frequency < 0) {
        return false;
      }
    }

    if (node.type === NODE_TYPES.PREFIX) {
      if (typeof node.childCount !== 'number' || node.childCount < 0) {
        return false;
      }
      
      if (typeof node.totalFrequency !== 'number' || node.totalFrequency < 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates if an object is a valid suggestion
   * @param {any} suggestion - Object to validate
   * @returns {boolean} True if valid suggestion
   */
  static isValidSuggestion(suggestion) {
    if (!suggestion || typeof suggestion !== 'object') {
      return false;
    }

    // Required properties
    if (typeof suggestion.word !== 'string' || suggestion.word.length === 0) {
      return false;
    }

    if (typeof suggestion.frequency !== 'number' || suggestion.frequency < 0) {
      return false;
    }

    // Optional properties validation
    if (suggestion.type && !['exact_match', 'typo_correction'].includes(suggestion.type)) {
      return false;
    }

    if (suggestion.editDistance !== undefined && 
        (typeof suggestion.editDistance !== 'number' || suggestion.editDistance < 0)) {
      return false;
    }

    if (suggestion.similarity !== undefined && 
        (typeof suggestion.similarity !== 'number' || suggestion.similarity < 0 || suggestion.similarity > 1)) {
      return false;
    }

    return true;
  }

  /**
   * Validates tree structure integrity
   * @param {import('../types/tree.js').TreeNode[]} tree - Tree to validate
   * @returns {Object} Validation result with isValid flag and errors array
   */
  static validateTreeStructure(tree) {
    const errors = [];
    const visitedIds = new Set();

    if (!Array.isArray(tree)) {
      return { isValid: false, errors: ['Tree must be an array'] };
    }

    const validateNode = (node, expectedDepth = 0, parent = null) => {
      // Validate node structure
      if (!this.isValidTreeNode(node)) {
        errors.push(`Invalid node structure at depth ${expectedDepth}`);
        return;
      }

      // Check for duplicate IDs
      if (visitedIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      } else {
        visitedIds.add(node.id);
      }

      // Validate depth consistency
      if (node.depth !== expectedDepth) {
        errors.push(`Node depth mismatch: expected ${expectedDepth}, got ${node.depth} for node ${node.id}`);
      }

      // Validate parent reference
      if (node.parent !== parent) {
        errors.push(`Parent reference mismatch for node ${node.id}`);
      }

      // Validate prefix nodes have correct child count
      if (node.type === NODE_TYPES.PREFIX && node.childCount !== node.children.length) {
        errors.push(`Child count mismatch for prefix node ${node.id}: expected ${node.children.length}, got ${node.childCount}`);
      }

      // Recursively validate children
      node.children.forEach(child => {
        validateNode(child, expectedDepth + 1, node);
      });
    };

    tree.forEach(rootNode => {
      validateNode(rootNode, 0, null);
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates view state object
   * @param {any} viewState - View state to validate
   * @returns {boolean} True if valid view state
   */
  static isValidViewState(viewState) {
    if (!viewState || typeof viewState !== 'object') {
      return false;
    }

    // Check mode
    if (!['tree', 'list'].includes(viewState.mode)) {
      return false;
    }

    // Check selectedNodeId
    if (viewState.selectedNodeId !== null && typeof viewState.selectedNodeId !== 'string') {
      return false;
    }

    // Check expandedNodes
    if (!(viewState.expandedNodes instanceof Set)) {
      return false;
    }

    // Check scrollPosition
    if (typeof viewState.scrollPosition !== 'number' || viewState.scrollPosition < 0) {
      return false;
    }

    // Check keyboardNavigation
    if (!viewState.keyboardNavigation || typeof viewState.keyboardNavigation !== 'object') {
      return false;
    }

    const { keyboardNavigation } = viewState;
    if (typeof keyboardNavigation.currentIndex !== 'number' || keyboardNavigation.currentIndex < -1) {
      return false;
    }

    if (!Array.isArray(keyboardNavigation.visibleNodes)) {
      return false;
    }

    return true;
  }
}

// Export factory methods for convenience
export const createWordNode = TreeNodeFactory.createWordNode.bind(TreeNodeFactory);
export const createPrefixNode = TreeNodeFactory.createPrefixNode.bind(TreeNodeFactory);
export const createFromSuggestion = TreeNodeFactory.createFromSuggestion.bind(TreeNodeFactory);
export const cloneNode = TreeNodeFactory.cloneNode.bind(TreeNodeFactory);

export const isValidTreeNode = TreeNodeValidator.isValidTreeNode.bind(TreeNodeValidator);
export const isValidSuggestion = TreeNodeValidator.isValidSuggestion.bind(TreeNodeValidator);
export const validateTreeStructure = TreeNodeValidator.validateTreeStructure.bind(TreeNodeValidator);
export const isValidViewState = TreeNodeValidator.isValidViewState.bind(TreeNodeValidator);