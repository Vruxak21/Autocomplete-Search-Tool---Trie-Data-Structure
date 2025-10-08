import { NODE_TYPES } from '../types/tree.js';

/**
 * Utility functions for generating tooltip content for tree nodes
 */

/**
 * Generate tooltip content for a tree node
 * @param {Object} node - The tree node
 * @param {string} query - The current search query
 * @returns {Object} Tooltip content object
 */
export const generateNodeTooltipContent = (node, query = '') => {
  if (!node) return null;

  const content = {
    title: '',
    items: [],
    description: ''
  };

  if (node.type === NODE_TYPES.WORD) {
    // Word node tooltip
    content.title = node.word || node.content;
    
    // Add frequency information
    if (node.frequency !== undefined) {
      content.items.push({
        label: 'Search frequency',
        value: `${node.frequency} times`
      });
    }

    // Add suggestion type information
    if (node.suggestionType) {
      const typeLabels = {
        'exact_match': 'Exact match',
        'typo_correction': 'Typo correction'
      };
      content.items.push({
        label: 'Match type',
        value: typeLabels[node.suggestionType] || node.suggestionType
      });
    }

    // Add edit distance for typo corrections
    if (node.editDistance !== undefined && node.editDistance > 0) {
      content.items.push({
        label: 'Edit distance',
        value: node.editDistance
      });
    }

    // Add similarity score
    if (node.similarity !== undefined) {
      content.items.push({
        label: 'Similarity',
        value: `${Math.round(node.similarity * 100)}%`
      });
    }

    // Add original query for typo corrections
    if (node.originalQuery && node.originalQuery !== node.word) {
      content.items.push({
        label: 'Original query',
        value: node.originalQuery
      });
    }

    // Add word length
    if (node.word) {
      content.items.push({
        label: 'Length',
        value: `${node.word.length} characters`
      });
    }

    // Generate description based on node properties
    if (node.suggestionType === 'typo_correction') {
      content.description = 'This is a suggested correction for your search term.';
    } else if (node.frequency && node.frequency >= 100) {
      content.description = 'This is a very popular search term.';
    } else if (node.frequency && node.frequency >= 50) {
      content.description = 'This is a popular search term.';
    } else {
      content.description = 'Click to select this search term.';
    }

  } else if (node.type === NODE_TYPES.PREFIX) {
    // Prefix node tooltip
    content.title = `"${node.content}" group`;
    
    // Add child count
    if (node.childCount !== undefined) {
      content.items.push({
        label: 'Items in group',
        value: node.childCount
      });
    }

    // Add total frequency
    if (node.totalFrequency !== undefined) {
      content.items.push({
        label: 'Total searches',
        value: node.totalFrequency
      });
    }

    // Add average frequency if we have both values
    if (node.totalFrequency !== undefined && node.childCount !== undefined && node.childCount > 0) {
      const avgFrequency = Math.round(node.totalFrequency / node.childCount);
      content.items.push({
        label: 'Average frequency',
        value: `${avgFrequency} per item`
      });
    }

    // Add prefix length
    content.items.push({
      label: 'Prefix length',
      value: `${node.content.length} characters`
    });

    // Add depth information
    if (node.depth !== undefined) {
      content.items.push({
        label: 'Tree depth',
        value: `Level ${node.depth + 1}`
      });
    }

    // Generate description
    if (node.isExpanded) {
      content.description = 'Click to collapse this group and hide its items.';
    } else {
      content.description = 'Click to expand this group and show its items.';
    }
  }

  // Add relationship information if available
  if (node.parent) {
    content.items.push({
      label: 'Parent group',
      value: node.parent.content || 'Root'
    });
  }

  // Add query match information
  if (query && node.content && node.content.toLowerCase().includes(query.toLowerCase())) {
    const matchIndex = node.content.toLowerCase().indexOf(query.toLowerCase());
    content.items.push({
      label: 'Query match',
      value: `Position ${matchIndex + 1}`
    });
  }

  return content;
};

/**
 * Generate simple text tooltip for basic cases
 * @param {Object} node - The tree node
 * @returns {string} Simple tooltip text
 */
export const generateSimpleTooltip = (node) => {
  if (!node) return '';

  if (node.type === NODE_TYPES.WORD) {
    let tooltip = node.word || node.content;
    if (node.frequency) {
      tooltip += ` (${node.frequency} searches)`;
    }
    if (node.suggestionType === 'typo_correction') {
      tooltip += ' - Suggested correction';
    }
    return tooltip;
  } else if (node.type === NODE_TYPES.PREFIX) {
    let tooltip = `Group: ${node.content}`;
    if (node.childCount) {
      tooltip += ` (${node.childCount} items)`;
    }
    return tooltip;
  }

  return node.content || '';
};

/**
 * Generate performance-related tooltip content
 * @param {Object} node - The tree node
 * @param {Object} performanceData - Performance metrics
 * @returns {Object} Performance tooltip content
 */
export const generatePerformanceTooltip = (node, performanceData = {}) => {
  if (!node || !performanceData) return null;

  const content = {
    title: 'Performance Metrics',
    items: [],
    description: ''
  };

  // Add render time if available
  if (performanceData.renderTime) {
    content.items.push({
      label: 'Render time',
      value: `${performanceData.renderTime}ms`
    });
  }

  // Add memory usage if available
  if (performanceData.memoryUsage) {
    content.items.push({
      label: 'Memory usage',
      value: `${performanceData.memoryUsage}KB`
    });
  }

  // Add tree depth impact
  if (node.depth !== undefined) {
    const depthImpact = node.depth > 5 ? 'High' : node.depth > 2 ? 'Medium' : 'Low';
    content.items.push({
      label: 'Depth impact',
      value: depthImpact
    });
  }

  // Add child count impact for prefix nodes
  if (node.type === NODE_TYPES.PREFIX && node.childCount) {
    const childImpact = node.childCount > 20 ? 'High' : node.childCount > 10 ? 'Medium' : 'Low';
    content.items.push({
      label: 'Child impact',
      value: childImpact
    });
  }

  content.description = 'Performance metrics for this tree node.';

  return content;
};

/**
 * Generate accessibility-focused tooltip content
 * @param {Object} node - The tree node
 * @returns {Object} Accessibility tooltip content
 */
export const generateAccessibilityTooltip = (node) => {
  if (!node) return null;

  const content = {
    title: 'Accessibility Information',
    items: [],
    description: ''
  };

  // Add ARIA role information
  content.items.push({
    label: 'ARIA role',
    value: 'treeitem'
  });

  // Add expandable state for prefix nodes
  if (node.type === NODE_TYPES.PREFIX) {
    content.items.push({
      label: 'Expandable',
      value: 'Yes'
    });
    content.items.push({
      label: 'Current state',
      value: node.isExpanded ? 'Expanded' : 'Collapsed'
    });
  }

  // Add selection state
  content.items.push({
    label: 'Selectable',
    value: node.type === NODE_TYPES.WORD ? 'Yes' : 'No'
  });

  // Add keyboard shortcuts
  if (node.type === NODE_TYPES.PREFIX) {
    content.description = 'Use Enter or Right arrow to expand, Left arrow to collapse. Use Up/Down arrows to navigate.';
  } else {
    content.description = 'Use Enter to select. Use Up/Down arrows to navigate.';
  }

  return content;
};

/**
 * Determine the best tooltip position based on node position in viewport
 * @param {HTMLElement} nodeElement - The DOM element of the tree node
 * @returns {string} Optimal tooltip position
 */
export const getOptimalTooltipPosition = (nodeElement) => {
  if (!nodeElement) return 'top';

  const rect = nodeElement.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  // Calculate available space in each direction
  const spaceTop = rect.top;
  const spaceBottom = viewport.height - rect.bottom;
  const spaceLeft = rect.left;
  const spaceRight = viewport.width - rect.right;

  // Prefer top/bottom positions for better readability
  if (spaceTop > 150) {
    return 'top';
  } else if (spaceBottom > 150) {
    return 'bottom';
  } else if (spaceRight > 250) {
    return 'right';
  } else if (spaceLeft > 250) {
    return 'left';
  }

  // Fallback to position with most space
  const maxSpace = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight);
  if (maxSpace === spaceTop) return 'top';
  if (maxSpace === spaceBottom) return 'bottom';
  if (maxSpace === spaceRight) return 'right';
  return 'left';
};

/**
 * Check if tooltip should be disabled based on node state or user preferences
 * @param {Object} node - The tree node
 * @param {Object} options - User preferences and options
 * @returns {boolean} Whether tooltip should be disabled
 */
export const shouldDisableTooltip = (node, options = {}) => {
  // Disable if explicitly requested
  if (options.disableTooltips) return true;

  // Disable for nodes without meaningful content
  if (!node || (!node.content && !node.word)) return true;

  // Disable if user prefers reduced motion and tooltips might be distracting
  if (options.prefersReducedMotion && !options.forceTooltips) return true;

  // Disable on touch devices by default (can be overridden)
  if (options.isTouchDevice && !options.enableTooltipsOnTouch) return true;

  return false;
};