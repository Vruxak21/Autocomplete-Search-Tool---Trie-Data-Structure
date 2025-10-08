/**
 * @fileoverview TreeView component for rendering hierarchical tree structure with keyboard navigation
 * 
 * This component provides a fully accessible tree view with support for:
 * - Keyboard navigation (arrow keys, Enter, Escape, Home/End)
 * - Screen reader compatibility with proper ARIA attributes
 * - Virtual scrolling for large datasets
 * - Expand/collapse functionality
 * - Focus management and trapping
 * - Loading states and animations
 * 
 * @author Tree Visualization Team
 * @since 1.0.0
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import TreeNode from './TreeNode';
import VirtualScrollContainer from './VirtualScrollContainer';
import { SkeletonTreeView, TreeLoadingState } from './SkeletonTreeNode';
import { KeyboardNavigationController } from '../utils/KeyboardNavigationController.js';
import { NODE_TYPES } from '../types/tree.js';
import { announce, createLoadingAnnouncement } from '../utils/screenReaderAnnouncements.js';
import { 
  createEnhancedFocusTrap, 
  manageRovingTabindex, 
  handleScreenReaderModes,
  restoreFocus,
  detectScreenReaderMode,
  enhancedFocus
} from '../utils/focusManagement.js';
import { AnimationUtils, shouldDisableAnimations } from '../utils/enhancedAnimations.js';

/**
 * TreeView component that renders a hierarchical tree structure with full keyboard navigation
 * and accessibility support. Supports both regular and virtual scrolling modes for performance.
 * 
 * @component
 * @example
 * // Basic usage
 * <TreeView
 *   treeNodes={treeData}
 *   query="search term"
 *   onSelect={(node) => console.log('Selected:', node)}
 *   onToggleExpand={(nodeId, isExpanded) => console.log('Toggled:', nodeId)}
 * />
 * 
 * @example
 * // With virtual scrolling for large datasets
 * <TreeView
 *   treeNodes={largeTreeData}
 *   virtualScrollThreshold={100}
 *   itemHeight={45}
 *   containerHeight={500}
 *   autoFocus={true}
 * />
 * 
 * @example
 * // With loading state
 * <TreeView
 *   treeNodes={[]}
 *   isLoading={true}
 *   loadingMessage="Building tree structure..."
 *   loadingProgress={0.75}
 * />
 */
/**
 * @param {Object} props - Component props
 * @param {Array<TreeNode>} [props.treeNodes=[]] - Array of tree node objects to render
 * @param {string} [props.query=''] - Current search query for highlighting
 * @param {Function} [props.onSelect] - Callback fired when a word node is selected
 * @param {Function} [props.onToggleExpand] - Callback fired when a node is expanded/collapsed
 * @param {string} [props.className=''] - Additional CSS classes to apply
 * @param {boolean} [props.autoFocus=false] - Whether to auto-focus the tree on mount
 * @param {number} [props.virtualScrollThreshold=50] - Number of nodes before enabling virtual scrolling
 * @param {number} [props.itemHeight=40] - Height of each tree item in pixels (for virtual scrolling)
 * @param {number} [props.containerHeight=400] - Height of the scroll container in pixels
 * @param {boolean} [props.isLoading=false] - Whether the tree is currently loading
 * @param {string} [props.loadingMessage='Building tree structure...'] - Message to show while loading
 * @param {number} [props.loadingProgress=null] - Loading progress (0-1) or null for indeterminate
 * @param {boolean} [props.showLoadingSkeleton=true] - Whether to show skeleton loading animation
 * @param {boolean} [props.animateEntrance=true] - Whether to animate tree nodes on entrance
 */
const TreeView = ({
  treeNodes = [],
  query = '',
  onSelect,
  onToggleExpand,
  className = '',
  autoFocus = false,
  virtualScrollThreshold = 50,
  itemHeight = 40,
  containerHeight = 400,
  isLoading = false,
  loadingMessage = 'Building tree structure...',
  loadingProgress = null,
  showLoadingSkeleton = true,
  animateEntrance = true
}) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const [hasUserClearedFocus, setHasUserClearedFocus] = useState(false);
  const [isScreenReaderBrowseMode, setIsScreenReaderBrowseMode] = useState(false);
  
  const treeViewRef = useRef(null);
  const navigationController = useRef(null);
  const focusTrapCleanup = useRef(null);
  const previousFocusedElement = useRef(null);

  // Initialize navigation controller
  useEffect(() => {
    navigationController.current = new KeyboardNavigationController({
      onSelectionChange: (nodeId, node) => {
        setFocusedNodeId(nodeId);
        if (node && node.type === NODE_TYPES.WORD) {
          setSelectedNodeId(nodeId);
          setHasUserClearedFocus(false);
        } else if (!nodeId) {
          // Clear selection when nodeId is null (escape key)
          setSelectedNodeId(null);
          setHasUserClearedFocus(true);
        } else {
          setHasUserClearedFocus(false);
        }
      },
      onExpansionChange: (nodeId, isExpanded) => {
        setExpandedNodes(prev => {
          const newSet = new Set(prev);
          if (isExpanded) {
            newSet.add(nodeId);
          } else {
            newSet.delete(nodeId);
          }
          return newSet;
        });
        
        if (onToggleExpand) {
          onToggleExpand(nodeId, isExpanded);
        }
      },
      onWordSelect: (node) => {
        if (onSelect) {
          onSelect(node);
        }
      }
    });

    return () => {
      if (navigationController.current) {
        navigationController.current.reset();
      }
    };
  }, [onSelect, onToggleExpand]);

  // Update navigation controller when tree changes
  useEffect(() => {
    if (navigationController.current) {
      const enhancedTreeNodes = enhanceTreeNodesWithState(treeNodes, expandedNodes, selectedNodeId, focusedNodeId);
      navigationController.current.updateTree(enhancedTreeNodes, expandedNodes);
      
      // Auto-focus first node if autoFocus is enabled and no node is currently focused
      // But only if user hasn't explicitly cleared focus with escape
      if (autoFocus && !focusedNodeId && !hasUserClearedFocus && enhancedTreeNodes.length > 0) {
        navigationController.current.setSelection(enhancedTreeNodes[0].id);
      }
      
      // Announce tree loading completion to screen readers
      if (enhancedTreeNodes.length > 0) {
        const totalNodes = flattenedNodes.length;
        const announcement = createLoadingAnnouncement('loaded', totalNodes);
        announce(announcement, 500); // Delay to avoid interrupting other announcements
      }
    }
  }, [treeNodes, expandedNodes, selectedNodeId, focusedNodeId, autoFocus, hasUserClearedFocus]);

  /**
   * Handles keyboard events for tree navigation
   * Supports arrow keys, Enter, Escape, Home, and End keys
   * 
   * @param {KeyboardEvent} event - The keyboard event
   */
  const handleKeyDown = useCallback((event) => {
    if (navigationController.current) {
      const handled = navigationController.current.handleKeyDown(event);
      if (handled) {
        event.preventDefault();
        event.stopPropagation();
        
        // Special handling for escape key - blur the tree view
        if (event.key === 'Escape' && treeViewRef.current) {
          treeViewRef.current.blur();
        }
      }
    }
  }, []);

  /**
   * Handles node selection from mouse clicks or keyboard activation
   * Updates navigation state and calls onSelect callback for word nodes
   * 
   * @param {TreeNode} node - The selected tree node
   */
  const handleNodeSelect = useCallback((node) => {
    if (navigationController.current) {
      navigationController.current.setSelection(node.id);
      
      if (node.type === NODE_TYPES.WORD && onSelect) {
        onSelect(node);
      }
    }
  }, [onSelect]);

  /**
   * Handles node expansion/collapse toggle
   * Updates navigation controller and calls onToggleExpand callback
   * 
   * @param {string} nodeId - The ID of the node to toggle
   * @param {boolean} isExpanded - Whether the node should be expanded
   */
  const handleToggleExpand = useCallback((nodeId, isExpanded) => {
    if (navigationController.current) {
      if (isExpanded) {
        navigationController.current.expandNode(nodeId);
      } else {
        navigationController.current.collapseNode(nodeId);
      }
    }
  }, []);

  /**
   * Handles keyboard events on individual tree nodes
   * Delegates to the main keyboard handler for consistent behavior
   * 
   * @param {KeyboardEvent} event - The keyboard event
   * @param {TreeNode} node - The tree node that received the event
   */
  const handleNodeKeyDown = useCallback((event, node) => {
    // Let the navigation controller handle all keyboard events
    handleKeyDown(event);
  }, [handleKeyDown]);

  // Focus management and accessibility setup
  useEffect(() => {
    if (!treeViewRef.current) return;
    
    // Store previous focused element for restoration
    if (autoFocus && document.activeElement) {
      previousFocusedElement.current = document.activeElement;
    }
    
    // Set up enhanced focus trap
    if (autoFocus) {
      focusTrapCleanup.current = createEnhancedFocusTrap(treeViewRef.current, {
        includeContainer: true,
        returnFocusOnDeactivate: true,
        allowOutsideClick: false,
        escapeDeactivates: true
      });
    }
    
    // Handle screen reader mode detection
    const handleFocusIn = (event) => {
      // Detect if screen reader is in browse mode
      const isBrowseMode = detectScreenReaderMode(event.target);
      setIsScreenReaderBrowseMode(isBrowseMode);
      
      // Update focus management based on mode
      if (event.target.getAttribute('role') === 'treeitem') {
        handleScreenReaderModes(treeViewRef.current, isBrowseMode);
      }
    };
    
    treeViewRef.current.addEventListener('focusin', handleFocusIn);
    
    // Initial focus setup
    if (autoFocus && !focusedNodeId && treeNodes && treeNodes.length > 0) {
      // Focus the tree container initially, then let keyboard navigation take over
      treeViewRef.current.focus();
    }
    
    return () => {
      if (focusTrapCleanup.current) {
        focusTrapCleanup.current();
      }
      if (treeViewRef.current) {
        treeViewRef.current.removeEventListener('focusin', handleFocusIn);
      }
    };
  }, [autoFocus, focusedNodeId, treeNodes]);
  
  /**
   * Enhances tree nodes with current UI state (selection, focus, expansion)
   * Recursively processes all nodes and their children
   * 
   * @param {Array<TreeNode>} nodes - Array of tree nodes to enhance
   * @param {Set<string>} expanded - Set of expanded node IDs
   * @param {string|null} selected - ID of the selected node
   * @param {string|null} focused - ID of the focused node
   * @returns {Array<TreeNode>} Enhanced tree nodes with state properties
   */
  const enhanceTreeNodesWithState = useCallback((nodes, expanded, selected, focused) => {
    if (!nodes || !Array.isArray(nodes)) {
      return [];
    }
    return nodes.map(node => ({
      ...node,
      isExpanded: expanded.has(node.id),
      isSelected: selected === node.id,
      isFocused: focused === node.id,
      children: node.children ? enhanceTreeNodesWithState(node.children, expanded, selected, focused) : []
    }));
  }, []);

  // Memoize enhanced tree nodes to prevent unnecessary recalculations
  const enhancedTreeNodes = useMemo(() => 
    enhanceTreeNodesWithState(treeNodes, expandedNodes, selectedNodeId, focusedNodeId),
    [treeNodes, expandedNodes, selectedNodeId, focusedNodeId, enhanceTreeNodesWithState]
  );

  // Handle screen reader mode changes
  useEffect(() => {
    if (treeViewRef.current) {
      handleScreenReaderModes(treeViewRef.current, isScreenReaderBrowseMode);
    }
  }, [isScreenReaderBrowseMode, enhancedTreeNodes]);
  
  // Cleanup focus trap on unmount
  useEffect(() => {
    return () => {
      if (focusTrapCleanup.current) {
        focusTrapCleanup.current();
      }
      // Restore focus to previous element if needed
      if (previousFocusedElement.current && autoFocus) {
        restoreFocus(previousFocusedElement.current, { preventScroll: true });
      }
    };
  }, [autoFocus]);

  // Flatten tree for virtual scrolling (only visible nodes)
  const flattenedNodes = useMemo(() => {
    const flatten = (nodes, depth = 0) => {
      const result = [];
      for (const node of nodes) {
        result.push({ ...node, depth });
        if (node.isExpanded && node.children && node.children.length > 0) {
          result.push(...flatten(node.children, depth + 1));
        }
      }
      return result;
    };
    return flatten(enhancedTreeNodes);
  }, [enhancedTreeNodes]);

  // Determine if virtual scrolling should be used
  const useVirtualScrolling = flattenedNodes.length > virtualScrollThreshold;

  /**
   * Memoized render function for individual tree nodes
   * Used by both regular and virtual scrolling modes
   * 
   * @param {TreeNode} node - The tree node to render
   * @param {number} index - The index of the node in the flattened list
   * @returns {React.ReactElement} The rendered tree node element
   */
  const renderTreeNode = useCallback((node, index) => {
    const nodeElement = (
      <TreeNode
        key={node.id}
        node={node}
        query={query}
        isSelected={node.isSelected}
        isFocused={node.isFocused}
        onToggleExpand={handleToggleExpand}
        onSelect={handleNodeSelect}
        onKeyDown={handleNodeKeyDown}
        depth={node.depth}
      />
    );

    // Add entrance animation if enabled
    if (animateEntrance && !shouldDisableAnimations()) {
      return (
        <div
          key={node.id}
          ref={(el) => {
            if (el && !el.hasAttribute('data-animated')) {
              el.setAttribute('data-animated', 'true');
              AnimationUtils.animateEntrance(el, 'up');
            }
          }}
        >
          {nodeElement}
        </div>
      );
    }

    return nodeElement;
  }, [query, handleToggleExpand, handleNodeSelect, handleNodeKeyDown, animateEntrance]);

  // Handle loading state
  if (isLoading) {
    return (
      <TreeLoadingState
        message={loadingMessage}
        progress={loadingProgress}
        showSkeleton={showLoadingSkeleton}
        animate={!shouldDisableAnimations()}
      />
    );
  }

  if (!treeNodes || treeNodes.length === 0) {
    return (
      <div className={`tree-view-empty ${className}`}>
        <div className="text-center text-gray-500 py-8">
          No items to display
        </div>
      </div>
    );
  }

  if (useVirtualScrolling) {
    return (
      <div className="focus-trap-boundary">
        {/* Skip link for screen readers */}
        <a href="#tree-end" className="skip-link">
          Skip to end of tree
        </a>
        
        <div
          ref={treeViewRef}
          className={`tree-view tree-view-virtual ${className}`}
          role="tree"
          aria-label={`Search results tree with ${flattenedNodes.length} items${query ? ` for "${query}"` : ''}`}
          aria-describedby="tree-instructions"
          aria-multiselectable="false"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          data-testid="tree-view"
        >
          <div id="tree-instructions" className="sr-only">
            Use arrow keys to navigate, Enter to select or expand/collapse, Escape to clear selection. 
            Home and End keys jump to first and last items.
          </div>
          
          <VirtualScrollContainer
            items={flattenedNodes}
            itemHeight={itemHeight}
            containerHeight={containerHeight}
            renderItem={renderTreeNode}
            className="tree-virtual-scroll"
          />
        </div>
        
        {/* End marker for skip link */}
        <div id="tree-end" tabIndex="-1" className="sr-only">
          End of tree navigation
        </div>
      </div>
    );
  }

  return (
    <div className="focus-trap-boundary">
      {/* Skip link for screen readers */}
      <a href="#tree-end" className="skip-link">
        Skip to end of tree
      </a>
      
      <div
        ref={treeViewRef}
        className={`tree-view ${className}`}
        role="tree"
        aria-label={`Search results tree with ${enhancedTreeNodes.length} root items${query ? ` for "${query}"` : ''}`}
        aria-describedby="tree-instructions"
        aria-multiselectable="false"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        data-testid="tree-view"
      >
        <div id="tree-instructions" className="sr-only">
          Use arrow keys to navigate, Enter to select or expand/collapse, Escape to clear selection. 
          Home and End keys jump to first and last items.
        </div>
        
        {enhancedTreeNodes.map((node, index) => {
          const nodeElement = (
            <TreeNode
              key={node.id}
              node={node}
              query={query}
              isSelected={node.isSelected}
              isFocused={node.isFocused}
              onToggleExpand={handleToggleExpand}
              onSelect={handleNodeSelect}
              onKeyDown={handleNodeKeyDown}
              depth={0}
              position={index + 1}
              setSize={enhancedTreeNodes.length}
            />
          );

          // Add entrance animation if enabled
          if (animateEntrance && !shouldDisableAnimations()) {
            return (
              <div
                key={node.id}
                ref={(el) => {
                  if (el && !el.hasAttribute('data-animated')) {
                    el.setAttribute('data-animated', 'true');
                    // Stagger animations for better visual effect
                    setTimeout(() => {
                      AnimationUtils.animateEntrance(el, 'up');
                    }, index * 50);
                  }
                }}
              >
                {nodeElement}
              </div>
            );
          }

          return nodeElement;
        })}
      </div>
      
      {/* End marker for skip link */}
      <div id="tree-end" tabIndex="-1" className="sr-only">
        End of tree navigation
      </div>
    </div>
  );
};

TreeView.propTypes = {
  /** Array of tree node objects to render in hierarchical structure */
  treeNodes: PropTypes.arrayOf(
    PropTypes.shape({
      /** Unique identifier for the node */
      id: PropTypes.string.isRequired,
      /** Type of node - either prefix group or word leaf */
      type: PropTypes.oneOf([NODE_TYPES.PREFIX, NODE_TYPES.WORD]).isRequired,
      /** Display content for the node */
      content: PropTypes.string.isRequired,
      /** Child nodes (for prefix nodes) */
      children: PropTypes.array,
      /** Complete word (for word nodes) */
      word: PropTypes.string,
      /** Usage frequency (for word nodes) */
      frequency: PropTypes.number,
      /** Type of suggestion match */
      suggestionType: PropTypes.oneOf(['exact_match', 'typo_correction']),
      /** Number of child nodes (for prefix nodes) */
      childCount: PropTypes.number,
      /** Total frequency of all children (for prefix nodes) */
      totalFrequency: PropTypes.number,
    })
  ),
  /** Current search query for highlighting matches */
  query: PropTypes.string,
  /** Callback fired when a word node is selected - receives (node) */
  onSelect: PropTypes.func,
  /** Callback fired when a node is expanded/collapsed - receives (nodeId, isExpanded) */
  onToggleExpand: PropTypes.func,
  /** Additional CSS classes to apply to the tree container */
  className: PropTypes.string,
  /** Whether to automatically focus the tree on mount */
  autoFocus: PropTypes.bool,
  /** Number of nodes before enabling virtual scrolling for performance */
  virtualScrollThreshold: PropTypes.number,
  /** Height of each tree item in pixels (used for virtual scrolling) */
  itemHeight: PropTypes.number,
  /** Height of the scroll container in pixels */
  containerHeight: PropTypes.number,
  /** Whether the tree is currently loading data */
  isLoading: PropTypes.bool,
  /** Message to display while loading */
  loadingMessage: PropTypes.string,
  /** Loading progress from 0-1, or null for indeterminate progress */
  loadingProgress: PropTypes.number,
  /** Whether to show animated skeleton while loading */
  showLoadingSkeleton: PropTypes.bool,
  /** Whether to animate tree nodes on entrance */
  animateEntrance: PropTypes.bool,
};

export default TreeView;