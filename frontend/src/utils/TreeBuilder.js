/**
 * @fileoverview TreeBuilder service for converting flat suggestions into hierarchical tree structure
 */

import { NODE_TYPES, DEFAULT_TREE_CONFIG, ERROR_TYPES, FALLBACK_ACTIONS } from '../types/tree.js';

/**
 * Service class for building and optimizing tree structures from flat suggestion arrays
 */
export class TreeBuilder {
  /**
   * @param {import('../types/tree.js').TreeConfig} config - Configuration options
   */
  constructor(config = DEFAULT_TREE_CONFIG) {
    this.config = { ...DEFAULT_TREE_CONFIG, ...config };
  }

  /**
   * Builds a hierarchical tree structure from flat suggestions array
   * @param {import('../types/tree.js').Suggestion[]} suggestions - Array of suggestions to convert
   * @returns {import('../types/tree.js').TreeNode[]} Root nodes of the tree
   * @throws {import('../types/tree.js').TreeError} When tree building fails
   */
  buildTree(suggestions) {
    const startTime = performance.now();
    
    try {
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        return [];
      }

      // Check for timeout
      if (performance.now() - startTime > this.config.buildTimeout) {
        throw this._createError(ERROR_TYPES.BUILD_ERROR, 'Tree building timeout exceeded', FALLBACK_ACTIONS.USE_LIST_VIEW);
      }

      // Sort suggestions by word for consistent tree structure
      const sortedSuggestions = [...suggestions].sort((a, b) => a.word.localeCompare(b.word));
      
      // Check if suggestions have common prefixes to decide on tree structure
      const hasCommonPrefixes = this._hasSignificantCommonPrefixes(sortedSuggestions);
      
      // For simple cases without common prefixes, create word nodes directly
      if (!hasCommonPrefixes) {
        return sortedSuggestions.map(suggestion => 
          this._createWordNode(suggestion, 0, null)
        );
      }
      
      const root = [];
      
      for (const suggestion of sortedSuggestions) {
        this.insertSuggestion(root, suggestion);
        
        // Check timeout periodically
        if (performance.now() - startTime > this.config.buildTimeout) {
          throw this._createError(ERROR_TYPES.BUILD_ERROR, 'Tree building timeout exceeded', FALLBACK_ACTIONS.USE_LIST_VIEW);
        }
      }
      
      // Optimize the tree structure
      const optimizedTree = this.optimizeTree(root);
      
      return optimizedTree;
    } catch (error) {
      if (error.type) {
        // Re-throw TreeError
        throw error;
      }
      
      // Wrap unexpected errors
      throw this._createError(
        ERROR_TYPES.BUILD_ERROR, 
        `Failed to build tree: ${error.message}`, 
        FALLBACK_ACTIONS.USE_LIST_VIEW,
        error
      );
    }
  }

  /**
   * Inserts a suggestion into the existing tree structure
   * @param {import('../types/tree.js').TreeNode[]} tree - Root nodes array
   * @param {import('../types/tree.js').Suggestion} suggestion - Suggestion to insert
   */
  insertSuggestion(tree, suggestion) {
    if (!suggestion.word || typeof suggestion.word !== 'string') {
      return;
    }

    // Check if word already exists
    const existingNode = tree.find(node => 
      node.type === NODE_TYPES.WORD && node.word === suggestion.word
    );
    
    if (existingNode) {
      return; // Don't insert duplicates
    }

    this._insertAtDepth(tree, suggestion, 0, null);
  }

  /**
   * Recursively inserts suggestion at the specified depth
   * @private
   * @param {import('../types/tree.js').TreeNode[]} nodes - Current level nodes
   * @param {import('../types/tree.js').Suggestion} suggestion - Suggestion to insert
   * @param {number} depth - Current depth
   * @param {import('../types/tree.js').TreeNode|null} parent - Parent node
   */
  _insertAtDepth(nodes, suggestion, depth, parent) {
    const word = suggestion.word;
    
    // If we've reached the end of the word, create a word node
    if (depth >= word.length) {
      const existingNode = nodes.find(node => 
        node.type === NODE_TYPES.WORD && node.word === word
      );
      
      if (!existingNode) {
        const wordNode = this._createWordNode(suggestion, depth, parent);
        nodes.push(wordNode);
      }
      return;
    }

    // For single character words or when at max depth, create word node directly
    if (word.length === 1 || depth >= this.config.maxDepth) {
      const wordNode = this._createWordNode(suggestion, depth, parent);
      nodes.push(wordNode);
      return;
    }

    const char = word[depth];
    const prefix = word.substring(0, depth + 1);
    
    // Find existing prefix node or create new one
    let prefixNode = nodes.find(node => 
      node.type === NODE_TYPES.PREFIX && node.content === char && node.prefix === prefix
    );
    
    if (!prefixNode) {
      prefixNode = this._createPrefixNode(char, prefix, depth, parent);
      nodes.push(prefixNode);
    }
    
    // Continue insertion at next depth
    this._insertAtDepth(prefixNode.children, suggestion, depth + 1, prefixNode);
  }

  /**
   * Creates a word node from a suggestion
   * @private
   * @param {import('../types/tree.js').Suggestion} suggestion - Source suggestion
   * @param {number} depth - Node depth
   * @param {import('../types/tree.js').TreeNode|null} parent - Parent node
   * @returns {import('../types/tree.js').TreeNode} Created word node
   */
  _createWordNode(suggestion, depth, parent) {
    return {
      id: `word-${suggestion.word.replace(/[^a-zA-Z0-9-_]/g, '_')}-${Date.now()}-${Math.random().toString().replace('.', '')}`,
      type: NODE_TYPES.WORD,
      content: suggestion.word,
      prefix: suggestion.word,
      isExpanded: false,
      isSelected: false,
      depth,
      children: [],
      parent,
      
      // Word-specific properties
      word: suggestion.word,
      frequency: suggestion.frequency || 0,
      suggestionType: suggestion.type || 'exact_match',
      originalQuery: suggestion.originalQuery,
      editDistance: suggestion.editDistance,
      similarity: suggestion.similarity,
      category: suggestion.category,
      correctionType: suggestion.correctionType
    };
  }

  /**
   * Creates a prefix node
   * @private
   * @param {string} char - Character for this prefix level
   * @param {string} prefix - Full prefix path
   * @param {number} depth - Node depth
   * @param {import('../types/tree.js').TreeNode|null} parent - Parent node
   * @returns {import('../types/tree.js').TreeNode} Created prefix node
   */
  _createPrefixNode(char, prefix, depth, parent) {
    return {
      id: `prefix-${prefix.replace(/[^a-zA-Z0-9-_]/g, '_')}-${Date.now()}-${Math.random().toString().replace('.', '')}`,
      type: NODE_TYPES.PREFIX,
      content: char,
      prefix,
      isExpanded: false,
      isSelected: false,
      depth,
      children: [],
      parent,
      
      // Prefix-specific properties
      childCount: 0,
      totalFrequency: 0
    };
  }

  /**
   * Finds the longest common prefix among an array of words
   * @param {string[]} words - Array of words to analyze
   * @returns {string} Common prefix
   */
  findCommonPrefix(words) {
    if (!words || words.length === 0) return '';
    if (words.length === 1) return words[0];
    
    let prefix = '';
    const firstWord = words[0];
    
    for (let i = 0; i < firstWord.length; i++) {
      const char = firstWord[i];
      
      if (words.every(word => word[i] === char)) {
        prefix += char;
      } else {
        break;
      }
    }
    
    return prefix;
  }

  /**
   * Optimizes the tree structure by merging single-child nodes and calculating metadata
   * @param {import('../types/tree.js').TreeNode[]} tree - Tree to optimize
   * @returns {import('../types/tree.js').TreeNode[]} Optimized tree
   */
  optimizeTree(tree) {
    const optimized = [];
    
    for (const node of tree) {
      const optimizedNode = this._optimizeNode(node);
      if (optimizedNode) {
        if (Array.isArray(optimizedNode)) {
          // Node was flattened, add all children
          optimized.push(...optimizedNode);
        } else {
          optimized.push(optimizedNode);
        }
      }
    }
    
    return optimized;
  }

  /**
   * Optimizes a single node and its children
   * @private
   * @param {import('../types/tree.js').TreeNode} node - Node to optimize
   * @returns {import('../types/tree.js').TreeNode|import('../types/tree.js').TreeNode[]|null} Optimized node, array of nodes, or null if should be removed
   */
  _optimizeNode(node) {
    // Recursively optimize children first
    const optimizedChildren = [];
    for (const child of node.children) {
      const optimizedChild = this._optimizeNode(child);
      if (optimizedChild) {
        if (Array.isArray(optimizedChild)) {
          optimizedChildren.push(...optimizedChild);
        } else {
          optimizedChildren.push(optimizedChild);
        }
      }
    }
    node.children = optimizedChildren;

    // Update metadata for prefix nodes
    if (node.type === NODE_TYPES.PREFIX) {
      node.childCount = node.children.length;
      node.totalFrequency = this._calculateTotalFrequency(node);
      
      // Remove prefix nodes with insufficient children at root level
      if (node.childCount < this.config.minGroupSize && node.depth === 0) {
        // Return children to be promoted to root level
        return node.children;
      }
      
      // Merge single-child prefix nodes
      if (node.childCount === 1 && node.children[0].type === NODE_TYPES.PREFIX) {
        const child = node.children[0];
        return {
          ...child,
          content: node.content + child.content,
          prefix: child.prefix,
          parent: node.parent,
          depth: node.depth
        };
      }
    }

    return node;
  }

  /**
   * Calculates total frequency for a node and all its descendants
   * @private
   * @param {import('../types/tree.js').TreeNode} node - Node to calculate frequency for
   * @returns {number} Total frequency
   */
  _calculateTotalFrequency(node) {
    if (node.type === NODE_TYPES.WORD) {
      return node.frequency || 0;
    }
    
    return node.children.reduce((total, child) => {
      return total + this._calculateTotalFrequency(child);
    }, 0);
  }

  /**
   * Checks if suggestions have significant common prefixes worth creating a tree structure
   * @private
   * @param {import('../types/tree.js').Suggestion[]} suggestions - Suggestions to analyze
   * @returns {boolean} True if tree structure would be beneficial
   */
  _hasSignificantCommonPrefixes(suggestions) {
    if (suggestions.length < 2) return false;
    
    // Group by first character
    const groups = {};
    for (const suggestion of suggestions) {
      const firstChar = suggestion.word[0];
      if (!groups[firstChar]) groups[firstChar] = [];
      groups[firstChar].push(suggestion);
    }
    
    // Check if any group has multiple items with longer common prefixes
    for (const group of Object.values(groups)) {
      if (group.length >= this.config.minGroupSize) {
        const words = group.map(s => s.word);
        const commonPrefix = this.findCommonPrefix(words);
        if (commonPrefix.length > 1) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Creates a TreeError object
   * @private
   * @param {string} type - Error type
   * @param {string} message - Error message
   * @param {string} fallbackAction - Recommended fallback action
   * @param {Error} [originalError] - Original error
   * @returns {import('../types/tree.js').TreeError} TreeError object
   */
  _createError(type, message, fallbackAction, originalError = null) {
    return {
      type,
      message,
      fallbackAction,
      originalError
    };
  }
}

/**
 * Default TreeBuilder instance with default configuration
 */
export const defaultTreeBuilder = new TreeBuilder();