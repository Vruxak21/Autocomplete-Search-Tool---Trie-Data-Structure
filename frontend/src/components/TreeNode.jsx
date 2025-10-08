/**
 * @fileoverview TreeNode component for rendering individual nodes in a tree structure
 * 
 * This component provides a fully accessible tree node with support for:
 * - Expand/collapse functionality for parent nodes
 * - Keyboard navigation and focus management
 * - Screen reader compatibility with ARIA attributes
 * - Visual indicators for node types and states
 * - Tooltips with additional metadata
 * - Smooth animations and transitions
 * - Frequency-based visual prominence
 * 
 * @author Tree Visualization Team
 * @since 1.0.0
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { NODE_TYPES } from '../types/tree.js';
import { debounceAnimation, globalTransitionManager } from '../utils/debouncedAnimations.js';
import { globalEnhancedTransitionManager, shouldDisableAnimations, AnimationUtils } from '../utils/enhancedAnimations.js';
import { isFocusable, announceFocusChange, enhancedFocus, detectScreenReaderMode } from '../utils/focusManagement.js';
import { generateNodeTooltipContent, getOptimalTooltipPosition, shouldDisableTooltip } from '../utils/tooltipContent.js';
import Tooltip from './Tooltip.jsx';
import './TreeNode.css';

/**
 * ExpandIcon component for showing expand/collapse state of tree nodes
 * 
 * @component
 * @example
 * <ExpandIcon
 *   isExpanded={true}
 *   hasChildren={true}
 *   onClick={() => toggleExpand()}
 *   nodeId="node-123"
 * />
 */
/**
 * @param {Object} props - Component props
 * @param {boolean} props.isExpanded - Whether the node is currently expanded
 * @param {boolean} props.hasChildren - Whether the node has child nodes
 * @param {Function} props.onClick - Callback fired when the expand icon is clicked
 * @param {string} props.nodeId - Unique identifier for the node
 */
const ExpandIcon = memo(({ isExpanded, hasChildren, onClick, nodeId }) => {
  if (!hasChildren) {
    return <div className="w-4 h-4" aria-hidden="true" />; // Spacer for alignment
  }

  /**
   * Handles click events on the expand icon
   * Prevents event bubbling to avoid triggering parent node selection
   * 
   * @param {MouseEvent} e - The click event
   */
  const handleClick = (e) => {
    e.stopPropagation(); // Prevent triggering parent click
    onClick();
  };

  return (
    <button
      className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      onClick={handleClick}
      aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
      aria-expanded={isExpanded}
      aria-controls={`children-${nodeId}`}
      type="button"
      tabIndex={-1} // Let parent handle focus
    >
      <svg
        className={`w-3 h-3 transition-transform duration-200 ease-in-out ${
          isExpanded ? 'rotate-90' : 'rotate-0'
        }`}
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
});

ExpandIcon.propTypes = {
  /** Whether the node is currently expanded */
  isExpanded: PropTypes.bool.isRequired,
  /** Whether the node has child nodes */
  hasChildren: PropTypes.bool.isRequired,
  /** Callback fired when the expand icon is clicked */
  onClick: PropTypes.func.isRequired,
  /** Unique identifier for the node */
  nodeId: PropTypes.string.isRequired,
};

/**
 * NodeContent component for displaying node text, metadata, and visual indicators
 * 
 * @component
 * @example
 * <NodeContent
 *   node={treeNode}
 *   query="search"
 *   isSelected={false}
 *   onSelect={(node) => handleSelect(node)}
 *   showTooltips={true}
 * />
 */
/**
 * @param {Object} props - Component props
 * @param {TreeNode} props.node - The tree node data to display
 * @param {string} [props.query] - Search query for highlighting matches
 * @param {boolean} props.isSelected - Whether the node is currently selected
 * @param {Function} [props.onSelect] - Callback fired when the node is selected
 * @param {boolean} [props.showTooltips=true] - Whether to show tooltips on hover
 * @param {Object} [props.tooltipOptions={}] - Configuration options for tooltips
 */
const NodeContent = memo(({ node, query, isSelected, onSelect, showTooltips = true, tooltipOptions = {} }) => {
  /**
   * Highlights matching text within the node content based on the search query
   * 
   * @param {string} text - The text to highlight
   * @param {string} searchQuery - The search query to match
   * @returns {React.ReactElement|string} The text with highlighted matches
   */
  const highlightMatch = (text, searchQuery) => {
    if (!searchQuery) return text;
    
    const index = text.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (index === -1) return text;
    
    return (
      <>
        {text.substring(0, index)}
        <span className="bg-yellow-200 font-semibold">
          {text.substring(index, index + searchQuery.length)}
        </span>
        {text.substring(index + searchQuery.length)}
      </>
    );
  };

  const handleClick = () => {
    if (node.type === NODE_TYPES.WORD && onSelect) {
      onSelect(node);
    }
  };

  const getNodeTypeClass = () => {
    const baseClass = 'transition-colors duration-150';
    
    switch (node.type) {
      case NODE_TYPES.PREFIX:
        return `${baseClass} text-gray-700 font-medium`;
      case NODE_TYPES.WORD:
        if (node.suggestionType === 'typo_correction') {
          return `${baseClass} text-blue-700 font-medium`;
        }
        // High frequency items get visual prominence
        if (node.frequency && node.frequency >= 50) {
          return `${baseClass} text-gray-900 font-semibold`;
        }
        return `${baseClass} text-gray-900`;
      default:
        return `${baseClass} text-gray-900`;
    }
  };

  const getFrequencyDisplay = () => {
    if (node.type === NODE_TYPES.WORD && node.frequency) {
      return `${node.frequency} searches`;
    }
    if (node.type === NODE_TYPES.PREFIX && node.totalFrequency) {
      return `${node.totalFrequency} total`;
    }
    return null;
  };

  const getFrequencyClass = () => {
    if (node.type === NODE_TYPES.WORD && node.frequency) {
      if (node.frequency >= 100) {
        return 'text-sm font-semibold text-green-600';
      } else if (node.frequency >= 50) {
        return 'text-sm font-medium text-blue-600';
      } else if (node.frequency >= 10) {
        return 'text-sm text-gray-600';
      }
      return 'text-sm text-gray-500';
    }
    return 'text-sm text-gray-500';
  };

  // Generate tooltip content
  const tooltipContent = showTooltips ? generateNodeTooltipContent(node, query) : null;
  const shouldShowTooltip = showTooltips && !shouldDisableTooltip(node, tooltipOptions);

  const contentElement = (
    <div
      className={`flex-1 flex items-center justify-between cursor-pointer rounded-md px-2 py-1 transition-all duration-150 ${
        node.type === NODE_TYPES.WORD 
          ? 'hover:bg-gray-50 hover:shadow-sm' 
          : 'hover:bg-gray-25'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center space-x-2">
        <span className={getNodeTypeClass()}>
          {node.type === NODE_TYPES.WORD 
            ? highlightMatch(node.word || node.content, query)
            : node.content
          }
        </span>
        
        {node.type === NODE_TYPES.PREFIX && node.childCount && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
            {node.childCount} items
          </span>
        )}
        
        {node.suggestionType === 'typo_correction' && (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 border border-yellow-200">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Did you mean?
          </span>
        )}
        
        {/* High frequency indicator */}
        {node.type === NODE_TYPES.WORD && node.frequency && node.frequency >= 100 && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 border border-green-200">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Popular
          </span>
        )}
      </div>
      
      {getFrequencyDisplay() && (
        <span className={getFrequencyClass()}>
          {getFrequencyDisplay()}
        </span>
      )}
    </div>
  );

  // Wrap with tooltip if enabled
  if (shouldShowTooltip && tooltipContent) {
    return (
      <Tooltip
        content={tooltipContent}
        position="top"
        delay={tooltipOptions.delay || 500}
        maxWidth={tooltipOptions.maxWidth || 300}
        className={tooltipOptions.className || ''}
        disabled={!shouldShowTooltip}
      >
        {contentElement}
      </Tooltip>
    );
  }

  return contentElement;
});

NodeContent.propTypes = {
  node: PropTypes.object.isRequired,
  query: PropTypes.string,
  isSelected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func,
  showTooltips: PropTypes.bool,
  tooltipOptions: PropTypes.object,
};

/**
 * TreeNode component for rendering individual nodes in a hierarchical tree structure
 * 
 * This component handles:
 * - Rendering node content with proper indentation based on depth
 * - Managing expand/collapse state for parent nodes
 * - Handling keyboard and mouse interactions
 * - Providing accessibility features with ARIA attributes
 * - Displaying visual indicators for node types and states
 * - Supporting tooltips with additional metadata
 * - Animating state changes and interactions
 * 
 * @component
 * @example
 * // Basic word node
 * <TreeNode
 *   node={{
 *     id: 'word-1',
 *     type: 'word',
 *     content: 'Tokyo',
 *     word: 'Tokyo',
 *     frequency: 150
 *   }}
 *   query="tok"
 *   onSelect={(node) => console.log('Selected:', node)}
 * />
 * 
 * @example
 * // Prefix node with children
 * <TreeNode
 *   node={{
 *     id: 'prefix-1',
 *     type: 'prefix',
 *     content: 'to',
 *     children: [...],
 *     childCount: 5,
 *     isExpanded: true
 *   }}
 *   depth={1}
 *   onToggleExpand={(nodeId, expanded) => console.log('Toggled:', nodeId)}
 * />
 * 
 * @param {Object} props - Component props
 * @param {TreeNode} props.node - The tree node data to render
 * @param {string} [props.query=''] - Current search query for highlighting
 * @param {boolean} [props.isSelected=false] - Whether the node is currently selected
 * @param {boolean} [props.isFocused=false] - Whether the node is currently focused
 * @param {Function} [props.onToggleExpand] - Callback fired when node is expanded/collapsed
 * @param {Function} [props.onSelect] - Callback fired when node is selected
 * @param {Function} [props.onKeyDown] - Callback fired on keyboard events
 * @param {number} [props.depth=0] - Nesting depth of the node (for indentation)
 * @param {number} [props.position=1] - Position within sibling nodes (for accessibility)
 * @param {number} [props.setSize=1] - Total number of sibling nodes (for accessibility)
 * @param {boolean} [props.showTooltips=true] - Whether to show tooltips on hover
 * @param {Object} [props.tooltipOptions={}] - Configuration options for tooltips
 */
const TreeNode = ({ 
  node, 
  query = '', 
  isSelected = false, 
  isFocused = false,
  onToggleExpand, 
  onSelect,
  onKeyDown,
  depth = 0,
  position = 1,
  setSize = 1,
  showTooltips = true,
  tooltipOptions = {}
}) => {
  const [localExpanded, setLocalExpanded] = useState(node.isExpanded || false);
  const nodeRef = useRef(null);
  
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = localExpanded;

  /**
   * Debounced expand/collapse handler for better performance
   * Prevents rapid toggling that could cause performance issues
   */
  const debouncedToggleExpand = useCallback(
    debounceAnimation((newExpanded) => {
      if (onToggleExpand) {
        onToggleExpand(node.id, newExpanded);
      }
    }, 100),
    [onToggleExpand, node.id]
  );

  /**
   * Handles expand/collapse toggle with smooth animations
   * Uses enhanced animations when available, falls back to instant toggle
   * 
   * @async
   */
  const handleToggleExpand = useCallback(async () => {
    if (!hasChildren) return;
    
    const newExpanded = !isExpanded;
    const childrenContainer = nodeRef.current?.querySelector(`[id="children-${node.id}"]`);
    
    // Use enhanced animations if not disabled
    if (!shouldDisableAnimations() && childrenContainer) {
      try {
        await globalEnhancedTransitionManager.animateExpandCollapse(
          childrenContainer, 
          newExpanded,
          {
            duration: 250,
            onProgress: (progress) => {
              // Optional: Update ARIA attributes during animation
              if (progress > 0.5) {
                nodeRef.current?.setAttribute('aria-expanded', newExpanded.toString());
              }
            }
          }
        );
      } catch (error) {
        console.warn('Animation failed, falling back to instant toggle:', error);
      }
    } else {
      // Fallback for disabled animations or missing container
      globalTransitionManager.startTransition(node.id, newExpanded, () => {
        // Animation complete callback
      });
    }
    
    setLocalExpanded(newExpanded);
    debouncedToggleExpand(newExpanded);
  }, [isExpanded, hasChildren, node.id, debouncedToggleExpand]);

  /**
   * Handles keyboard events on the tree node
   * Delegates to parent component's keyboard handler
   * 
   * @param {KeyboardEvent} e - The keyboard event
   */
  const handleKeyDown = useCallback((e) => {
    if (onKeyDown) {
      onKeyDown(e, node);
    }
  }, [onKeyDown, node]);

  /**
   * Handles click events on the tree node
   * Adds selection animation and calls onSelect callback
   * 
   * @async
   */
  const handleClick = useCallback(async () => {
    if (onSelect) {
      // Add selection animation if not disabled
      if (!shouldDisableAnimations() && nodeRef.current) {
        try {
          await globalEnhancedTransitionManager.animateSelection(nodeRef.current, {
            duration: 200,
            highlightColor: '#3b82f6'
          });
        } catch (error) {
          console.warn('Selection animation failed:', error);
        }
      }
      onSelect(node);
    }
  }, [onSelect, node]);

  // Enhanced focus management - focus the node when it becomes selected
  useEffect(() => {
    if (isFocused && nodeRef.current && isFocusable(nodeRef.current)) {
      // Use enhanced focus for better accessibility
      enhancedFocus(nodeRef.current, {
        preventScroll: true,
        announceChange: true,
        customMessage: getAccessibleLabel()
      });
    } else if (nodeRef.current) {
      nodeRef.current.classList.remove('keyboard-focused');
    }
  }, [isFocused]);
  
  // Handle focus events for better accessibility
  const handleFocus = useCallback((event) => {
    const element = event.currentTarget;
    element.classList.add('keyboard-focused');
    
    // Add focus animation if not disabled
    if (!shouldDisableAnimations()) {
      globalEnhancedTransitionManager.animateFocus(element, true, {
        ringColor: '#3b82f6',
        duration: 150
      });
    }
    
    // Detect screen reader mode
    const isBrowseMode = detectScreenReaderMode(element);
    if (isBrowseMode) {
      element.classList.add('browse-mode');
      element.classList.remove('focus-mode');
    } else {
      element.classList.add('focus-mode');
      element.classList.remove('browse-mode');
    }
    
    // Announce focus change with context
    announceFocusChange(element, getAccessibleLabel());
  }, []);
  
  const handleBlur = useCallback((event) => {
    const element = event.currentTarget;
    element.classList.remove('keyboard-focused', 'browse-mode', 'focus-mode');
    
    // Remove focus animation if not disabled
    if (!shouldDisableAnimations()) {
      globalEnhancedTransitionManager.animateFocus(element, false);
    }
  }, []);

  // Add hover animation handlers
  const handleMouseEnter = useCallback((event) => {
    const element = event.currentTarget;
    
    if (!shouldDisableAnimations()) {
      globalEnhancedTransitionManager.animateHover(element, true, {
        scale: 1.01,
        duration: 150
      });
    }
  }, []);

  const handleMouseLeave = useCallback((event) => {
    const element = event.currentTarget;
    
    if (!shouldDisableAnimations()) {
      globalEnhancedTransitionManager.animateHover(element, false, {
        duration: 150
      });
    }
  }, []);

  const indentationStyle = {
    paddingLeft: `${depth * 20 + 8}px`
  };

  const getNodeContainerClass = () => {
    let baseClass = 'flex items-center py-2 px-2 transition-all duration-200 rounded-md mx-1 outline-none';
    
    if (isSelected) {
      baseClass += ' bg-blue-50 text-blue-900 border-l-4 border-blue-500 shadow-sm';
    } else if (isFocused) {
      baseClass += ' bg-gray-100 border-l-4 border-gray-400 shadow-sm';
    } else {
      baseClass += ' hover:bg-gray-50 hover:shadow-sm';
    }
    
    // Add focus ring for keyboard navigation
    if (isFocused) {
      baseClass += ' ring-2 ring-blue-500 ring-opacity-50';
    }
    
    // Add depth-based styling
    if (depth > 0) {
      baseClass += ' border-l border-gray-200';
    }
    
    return baseClass;
  };

  /**
   * Generates accessible label for screen readers
   * Includes node type, content, frequency, position, and level information
   * 
   * @returns {string} The accessible label text
   */
  const getAccessibleLabel = () => {
    let label = '';
    
    if (node.type === NODE_TYPES.WORD) {
      label = `Word: ${node.word || node.content}`;
      if (node.frequency) {
        label += `, ${node.frequency} searches`;
      }
      if (node.suggestionType === 'typo_correction') {
        label += ', suggested correction';
      }
    } else {
      label = `Group: ${node.content}`;
      if (node.childCount) {
        label += `, ${node.childCount} items`;
      }
      if (node.totalFrequency) {
        label += `, ${node.totalFrequency} total searches`;
      }
    }
    
    // Add position information
    label += `, ${position} of ${setSize}`;
    
    // Add level information
    label += `, level ${depth + 1}`;
    
    return label;
  };

  /**
   * Generates accessible description for screen readers
   * Provides interaction instructions based on node type
   * 
   * @returns {string} The accessible description text
   */
  const getAccessibleDescription = () => {
    let description = '';
    
    if (hasChildren) {
      description = isExpanded ? 'Expanded group' : 'Collapsed group';
      description += '. Press Enter or right arrow to expand, left arrow to collapse.';
    } else if (node.type === NODE_TYPES.WORD) {
      description = 'Selectable word. Press Enter to select.';
    }
    
    return description;
  };

  const getChildrenContainerClass = () => {
    return `tree-children transition-all duration-300 ease-in-out ${
      isExpanded ? 'opacity-100 max-h-screen' : 'opacity-0 max-h-0 overflow-hidden'
    }`;
  };

  return (
    <div className="tree-node" data-testid={`tree-node-${node.id}`}>
      {/* Hidden description for screen readers */}
      <div id={`node-desc-${node.id}`} className="sr-only">
        {getAccessibleDescription()}
      </div>
      
      <div
        ref={nodeRef}
        className={getNodeContainerClass()}
        style={indentationStyle}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-level={depth + 1}
        aria-selected={isSelected}
        aria-setsize={setSize}
        aria-posinset={position}
        aria-label={getAccessibleLabel()}
        aria-describedby={`node-desc-${node.id}`}
        aria-current={isFocused ? 'true' : undefined}
        tabIndex={isFocused ? 0 : -1}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <ExpandIcon
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          onClick={handleToggleExpand}
          nodeId={node.id}
        />
        
        <NodeContent
          node={node}
          query={query}
          isSelected={isSelected}
          onSelect={onSelect}
          showTooltips={showTooltips}
          tooltipOptions={tooltipOptions}
        />
      </div>
      
      {hasChildren && (
        <div 
          id={`children-${node.id}`}
          className={getChildrenContainerClass()}
          role="group"
          aria-label={`Children of ${node.content}`}
        >
          {node.children.map((child, index) => (
            <TreeNode
              key={child.id}
              node={child}
              query={query}
              isSelected={child.isSelected || false}
              isFocused={child.isFocused || false}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onKeyDown={onKeyDown}
              depth={depth + 1}
              position={index + 1}
              setSize={node.children.length}
              showTooltips={showTooltips}
              tooltipOptions={tooltipOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
};

TreeNode.propTypes = {
  /** Tree node data object containing all node information */
  node: PropTypes.shape({
    /** Unique identifier for the node */
    id: PropTypes.string.isRequired,
    /** Type of node - either prefix group or word leaf */
    type: PropTypes.oneOf([NODE_TYPES.PREFIX, NODE_TYPES.WORD]).isRequired,
    /** Display content for the node */
    content: PropTypes.string.isRequired,
    /** Whether the node is currently expanded (for prefix nodes) */
    isExpanded: PropTypes.bool,
    /** Whether the node is currently selected */
    isSelected: PropTypes.bool,
    /** Whether the node is currently focused */
    isFocused: PropTypes.bool,
    /** Child nodes array (for prefix nodes) */
    children: PropTypes.array,
    /** Complete word text (for word nodes) */
    word: PropTypes.string,
    /** Usage frequency count (for word nodes) */
    frequency: PropTypes.number,
    /** Type of suggestion match */
    suggestionType: PropTypes.oneOf(['exact_match', 'typo_correction']),
    /** Number of direct child nodes (for prefix nodes) */
    childCount: PropTypes.number,
    /** Total frequency of all descendant nodes (for prefix nodes) */
    totalFrequency: PropTypes.number,
  }).isRequired,
  /** Current search query for highlighting matches */
  query: PropTypes.string,
  /** Whether the node is currently selected */
  isSelected: PropTypes.bool,
  /** Whether the node is currently focused for keyboard navigation */
  isFocused: PropTypes.bool,
  /** Callback fired when node is expanded/collapsed - receives (nodeId, isExpanded) */
  onToggleExpand: PropTypes.func,
  /** Callback fired when node is selected - receives (node) */
  onSelect: PropTypes.func,
  /** Callback fired on keyboard events - receives (event, node) */
  onKeyDown: PropTypes.func,
  /** Nesting depth of the node (0 for root level) */
  depth: PropTypes.number,
  /** Position within sibling nodes (1-based, for accessibility) */
  position: PropTypes.number,
  /** Total number of sibling nodes (for accessibility) */
  setSize: PropTypes.number,
  /** Whether to show tooltips on hover */
  showTooltips: PropTypes.bool,
  /** Configuration options for tooltip behavior and appearance */
  tooltipOptions: PropTypes.object,
};

// Memoize TreeNode to prevent unnecessary re-renders
const MemoizedTreeNode = memo(TreeNode, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.node.id === nextProps.node.id &&
    prevProps.node.isExpanded === nextProps.node.isExpanded &&
    prevProps.node.isSelected === nextProps.node.isSelected &&
    prevProps.node.isFocused === nextProps.node.isFocused &&
    prevProps.query === nextProps.query &&
    prevProps.depth === nextProps.depth &&
    prevProps.node.children?.length === nextProps.node.children?.length
  );
});

MemoizedTreeNode.displayName = 'TreeNode';

export default MemoizedTreeNode;
export { ExpandIcon, NodeContent };