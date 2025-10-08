/**
 * @fileoverview Screen reader announcement utilities for tree navigation
 * Provides functions to create accessible announcements for tree interactions
 */

import { NODE_TYPES } from '../types/tree.js';

/**
 * Creates a live region element for screen reader announcements
 * @returns {HTMLElement} The live region element
 */
export function createLiveRegion() {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.setAttribute('class', 'sr-only');
  liveRegion.setAttribute('id', 'tree-announcements');
  document.body.appendChild(liveRegion);
  return liveRegion;
}

/**
 * Gets or creates the live region for announcements
 * @returns {HTMLElement} The live region element
 */
export function getLiveRegion() {
  let liveRegion = document.getElementById('tree-announcements');
  if (!liveRegion) {
    liveRegion = createLiveRegion();
  }
  return liveRegion;
}

/**
 * Announces a message to screen readers
 * @param {string} message - The message to announce
 * @param {number} delay - Delay before announcement (default: 100ms)
 */
export function announce(message, delay = 100) {
  if (!message) return;
  
  const liveRegion = getLiveRegion();
  
  // Clear previous announcement
  liveRegion.textContent = '';
  
  // Announce new message after a brief delay
  setTimeout(() => {
    liveRegion.textContent = message;
  }, delay);
}

/**
 * Creates an announcement for node selection
 * @param {Object} node - The selected tree node
 * @param {number} position - Position in visible nodes
 * @param {number} total - Total visible nodes
 * @returns {string} The announcement message
 */
export function createSelectionAnnouncement(node, position, total) {
  if (!node) return '';
  
  let message = '';
  
  if (node.type === NODE_TYPES.WORD) {
    message = `Selected word: ${node.word || node.content}`;
    if (node.frequency) {
      message += `, ${node.frequency} searches`;
    }
    if (node.suggestionType === 'typo_correction') {
      message += ', suggested correction';
    }
  } else {
    message = `Selected group: ${node.content}`;
    if (node.childCount) {
      message += `, ${node.childCount} items`;
    }
    if (node.isExpanded) {
      message += ', expanded';
    } else {
      message += ', collapsed';
    }
  }
  
  message += `. Item ${position} of ${total}, level ${node.depth + 1}`;
  
  return message;
}

/**
 * Creates an announcement for node expansion
 * @param {Object} node - The expanded/collapsed node
 * @param {boolean} isExpanded - Whether the node is now expanded
 * @returns {string} The announcement message
 */
export function createExpansionAnnouncement(node, isExpanded) {
  if (!node) return '';
  
  const action = isExpanded ? 'Expanded' : 'Collapsed';
  let message = `${action} group: ${node.content}`;
  
  if (isExpanded && node.childCount) {
    message += `, showing ${node.childCount} items`;
  }
  
  return message;
}

/**
 * Creates an announcement for word selection
 * @param {Object} node - The selected word node
 * @returns {string} The announcement message
 */
export function createWordSelectionAnnouncement(node) {
  if (!node || node.type !== NODE_TYPES.WORD) return '';
  
  let message = `Selected: ${node.word || node.content}`;
  
  if (node.frequency) {
    message += `, ${node.frequency} searches`;
  }
  
  if (node.suggestionType === 'typo_correction') {
    message += ', suggested correction';
  }
  
  return message;
}

/**
 * Creates an announcement for tree navigation
 * @param {string} direction - Direction of navigation (up, down, left, right)
 * @param {Object} fromNode - Previous node
 * @param {Object} toNode - New current node
 * @returns {string} The announcement message
 */
export function createNavigationAnnouncement(direction, fromNode, toNode) {
  if (!toNode) return '';
  
  let message = '';
  
  switch (direction) {
    case 'down':
      message = 'Moved down to ';
      break;
    case 'up':
      message = 'Moved up to ';
      break;
    case 'right':
      if (fromNode && fromNode.id === toNode.id) {
        // Same node, just expanded
        return createExpansionAnnouncement(toNode, true);
      }
      message = 'Moved right to ';
      break;
    case 'left':
      if (fromNode && fromNode.id === toNode.id) {
        // Same node, just collapsed
        return createExpansionAnnouncement(toNode, false);
      }
      message = 'Moved left to ';
      break;
    default:
      message = 'Moved to ';
  }
  
  if (toNode.type === NODE_TYPES.WORD) {
    message += `word: ${toNode.word || toNode.content}`;
  } else {
    message += `group: ${toNode.content}`;
    if (toNode.isExpanded) {
      message += ', expanded';
    } else {
      message += ', collapsed';
    }
  }
  
  message += `, level ${toNode.depth + 1}`;
  
  return message;
}

/**
 * Creates an announcement for tree loading states
 * @param {string} state - Loading state (loading, loaded, error)
 * @param {number} nodeCount - Number of nodes loaded
 * @returns {string} The announcement message
 */
export function createLoadingAnnouncement(state, nodeCount = 0) {
  switch (state) {
    case 'loading':
      return 'Loading tree view...';
    case 'loaded':
      return `Tree view loaded with ${nodeCount} items`;
    case 'error':
      return 'Failed to load tree view. Falling back to list view.';
    default:
      return '';
  }
}

/**
 * Creates an announcement for view mode changes
 * @param {string} newMode - New view mode (tree, list)
 * @param {number} itemCount - Number of items in the view
 * @returns {string} The announcement message
 */
export function createViewModeAnnouncement(newMode, itemCount = 0) {
  if (newMode === 'tree') {
    return `Switched to tree view with ${itemCount} items. Use arrow keys to navigate.`;
  } else {
    return `Switched to list view with ${itemCount} items. Use arrow keys to navigate.`;
  }
}

/**
 * Cleans up the live region when no longer needed
 */
export function cleanupLiveRegion() {
  const liveRegion = document.getElementById('tree-announcements');
  if (liveRegion) {
    liveRegion.remove();
  }
}

// Default export with all functions
export default {
  createLiveRegion,
  getLiveRegion,
  announce,
  createSelectionAnnouncement,
  createExpansionAnnouncement,
  createWordSelectionAnnouncement,
  createNavigationAnnouncement,
  createLoadingAnnouncement,
  createViewModeAnnouncement,
  cleanupLiveRegion
};