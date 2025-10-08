/**
 * @fileoverview Tree data structures and interfaces for search results tree visualization
 * This file defines the core interfaces and types used throughout the tree visualization feature.
 */

/**
 * @typedef {Object} TreeNode
 * @property {string} id - Unique identifier for the tree node
 * @property {'prefix'|'word'} type - Type of node (prefix group or complete word)
 * @property {string} content - Display content for the node
 * @property {string} prefix - The prefix path to this node
 * @property {boolean} isExpanded - Whether the node is currently expanded
 * @property {boolean} isSelected - Whether the node is currently selected
 * @property {number} depth - Depth level in the tree (0-based)
 * @property {TreeNode[]} children - Array of child nodes
 * @property {TreeNode|null} parent - Reference to parent node (null for root nodes)
 * 
 * // Properties for word nodes (type === 'word')
 * @property {string} [word] - Complete word for leaf nodes
 * @property {number} [frequency] - Search frequency for the word
 * @property {'exact_match'|'typo_correction'} [suggestionType] - Type of suggestion
 * @property {string} [originalQuery] - Original query for typo corrections
 * @property {number} [editDistance] - Edit distance for typo corrections
 * @property {number} [similarity] - Similarity score (0-1) for typo corrections
 * @property {string} [category] - Category of the suggestion
 * @property {string} [correctionType] - Type of correction applied
 * 
 * // Properties for prefix nodes (type === 'prefix')
 * @property {number} [childCount] - Number of direct children
 * @property {number} [totalFrequency] - Sum of all descendant frequencies
 */

/**
 * @typedef {Object} ViewState
 * @property {'tree'|'list'} mode - Current view mode
 * @property {string|null} selectedNodeId - ID of currently selected node
 * @property {Set<string>} expandedNodes - Set of expanded node IDs
 * @property {number} scrollPosition - Current scroll position
 * @property {KeyboardNavigationState} keyboardNavigation - Keyboard navigation state
 */

/**
 * @typedef {Object} KeyboardNavigationState
 * @property {number} currentIndex - Current index in visible nodes array
 * @property {TreeNode[]} visibleNodes - Array of currently visible nodes
 */

/**
 * @typedef {Object} TreeConfig
 * @property {number} maxDepth - Maximum tree depth allowed
 * @property {number} minGroupSize - Minimum number of children to create a group
 * @property {number} virtualScrollThreshold - Number of nodes to trigger virtual scrolling
 * @property {number} buildTimeout - Maximum time (ms) allowed for tree building
 */

/**
 * @typedef {Object} TreeError
 * @property {'BUILD_ERROR'|'RENDER_ERROR'|'NAVIGATION_ERROR'} type - Type of error
 * @property {string} message - Error message
 * @property {'USE_LIST_VIEW'|'RETRY'|'SHOW_ERROR'} fallbackAction - Recommended fallback action
 * @property {Error} [originalError] - Original error object if available
 */

/**
 * @typedef {Object} Suggestion
 * @property {string} word - The suggested word
 * @property {number} frequency - Search frequency
 * @property {string} [category] - Category of the suggestion
 * @property {'exact_match'|'typo_correction'} [type] - Type of suggestion
 * @property {string} [originalQuery] - Original query for typo corrections
 * @property {number} [editDistance] - Edit distance for typo corrections
 * @property {number} [similarity] - Similarity score (0-1)
 * @property {string} [correctionType] - Type of correction applied
 */

/**
 * Default configuration for tree building and rendering
 * @type {TreeConfig}
 */
export const DEFAULT_TREE_CONFIG = {
  maxDepth: 10,
  minGroupSize: 2,
  virtualScrollThreshold: 50,
  buildTimeout: 200
};

/**
 * Tree node types enumeration
 * @readonly
 * @enum {string}
 */
export const NODE_TYPES = {
  PREFIX: 'prefix',
  WORD: 'word'
};

/**
 * View modes enumeration
 * @readonly
 * @enum {string}
 */
export const VIEW_MODES = {
  TREE: 'tree',
  LIST: 'list'
};

/**
 * Error types enumeration
 * @readonly
 * @enum {string}
 */
export const ERROR_TYPES = {
  BUILD_ERROR: 'BUILD_ERROR',
  RENDER_ERROR: 'RENDER_ERROR',
  NAVIGATION_ERROR: 'NAVIGATION_ERROR'
};

/**
 * Fallback actions enumeration
 * @readonly
 * @enum {string}
 */
export const FALLBACK_ACTIONS = {
  USE_LIST_VIEW: 'USE_LIST_VIEW',
  RETRY: 'RETRY',
  SHOW_ERROR: 'SHOW_ERROR'
};