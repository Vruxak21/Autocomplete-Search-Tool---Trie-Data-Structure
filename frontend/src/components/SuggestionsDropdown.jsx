import { forwardRef, useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import ListView from './ListView';
import TreeView from './TreeView';
import ViewToggle from './ViewToggle';
import TreeErrorBoundary from './TreeErrorBoundary';
import { defaultTreeBuilder } from '../utils/TreeBuilder';
import { ViewStateManager } from '../utils/ViewStateManager';
import { defaultPerformanceMonitor } from '../utils/PerformanceMonitor';
import { VIEW_MODES, DEFAULT_TREE_CONFIG, ERROR_TYPES, FALLBACK_ACTIONS } from '../types/tree';
import { announce, createViewModeAnnouncement, createLoadingAnnouncement } from '../utils/screenReaderAnnouncements';

const SuggestionsDropdown = forwardRef(({ 
  suggestions = [], 
  query = '', 
  selectedIndex = -1, 
  onSelect, 
  isVisible = false,
  className = '',
  // New props for tree functionality
  viewMode = VIEW_MODES.LIST,
  onViewModeChange,
  treeConfig = DEFAULT_TREE_CONFIG,
  showViewToggle = true
}, ref) => {
  
  // State management
  const [currentViewMode, setCurrentViewMode] = useState(viewMode);
  const [viewStateManager] = useState(() => new ViewStateManager());
  const [treeNodes, setTreeNodes] = useState([]);
  const [treeError, setTreeError] = useState(null);
  const [isTreeBuilding, setIsTreeBuilding] = useState(false);
  const [performanceMonitor] = useState(() => defaultPerformanceMonitor);
  const [retryCount, setRetryCount] = useState(0);
  const [isTreeViewDisabled, setIsTreeViewDisabled] = useState(false);

  // Initialize view mode from props or stored preference
  useEffect(() => {
    const initialMode = viewMode || viewStateManager.getViewMode();
    setCurrentViewMode(initialMode);
  }, [viewMode, viewStateManager]);

  // Check tree view availability based on performance
  const checkTreeViewAvailability = useCallback(() => {
    const availability = performanceMonitor.checkTreeViewAvailability(suggestions.length);
    setIsTreeViewDisabled(!availability.available);
    
    if (!availability.available && currentViewMode === VIEW_MODES.TREE) {
      console.warn('Tree view disabled:', availability.reason);
      handleViewModeChange(VIEW_MODES.LIST);
    }
    
    return availability;
  }, [suggestions.length, currentViewMode, performanceMonitor]);

  // Build tree when suggestions change and tree view is active
  const buildTreeNodes = useCallback(async () => {
    if (currentViewMode !== VIEW_MODES.TREE || !suggestions.length) {
      setTreeNodes([]);
      setTreeError(null);
      return;
    }

    // Check if tree view is available
    const availability = checkTreeViewAvailability();
    if (!availability.available) {
      setTreeError({
        type: ERROR_TYPES.BUILD_ERROR,
        message: availability.reason,
        fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW
      });
      return;
    }

    setIsTreeBuilding(true);
    setTreeError(null);

    try {
      // Announce tree building start to screen readers
      const loadingAnnouncement = createLoadingAnnouncement('loading');
      announce(loadingAnnouncement);
      
      // Use performance monitor to build tree
      const result = await performanceMonitor.monitorTreeBuild(async () => {
        const builder = new (defaultTreeBuilder.constructor)(treeConfig);
        return builder.buildTree(suggestions);
      }, suggestions);

      if (result.success) {
        setTreeNodes(result.result);
        setRetryCount(0); // Reset retry count on success
      } else {
        console.error('Tree building failed:', result.error);
        setTreeError(result.error);
        setTreeNodes([]);
        
        // Announce error to screen readers
        const errorAnnouncement = createLoadingAnnouncement('error');
        announce(errorAnnouncement);
        
        // Auto-fallback to list view if recommended
        if (result.shouldDegrade || result.error.fallbackAction === FALLBACK_ACTIONS.USE_LIST_VIEW) {
          setTimeout(() => handleViewModeChange(VIEW_MODES.LIST), 100);
        }
      }
    } catch (error) {
      console.error('Tree building setup failed:', error);
      const treeError = {
        type: ERROR_TYPES.BUILD_ERROR,
        message: error.message || 'Tree building setup failed',
        fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW,
        originalError: error
      };
      setTreeError(treeError);
      setTreeNodes([]);
    } finally {
      setIsTreeBuilding(false);
    }
  }, [suggestions, currentViewMode, treeConfig, performanceMonitor, checkTreeViewAvailability]);

  // Check tree view availability when suggestions change
  useEffect(() => {
    checkTreeViewAvailability();
  }, [checkTreeViewAvailability]);

  // Build tree when needed
  useEffect(() => {
    buildTreeNodes();
  }, [buildTreeNodes]);

  // Handle view mode changes
  const handleViewModeChange = useCallback((newMode) => {
    if (newMode !== currentViewMode) {
      // Check if tree view is disabled when switching to tree
      if (newMode === VIEW_MODES.TREE && isTreeViewDisabled) {
        console.warn('Cannot switch to tree view: currently disabled due to performance');
        announce('Tree view is currently disabled due to performance. Staying in list view.');
        return;
      }
      
      // Preserve selection when switching views
      const preservedState = viewStateManager.preserveSelectionOnViewSwitch(
        newMode, 
        suggestions, 
        treeNodes
      );
      
      setCurrentViewMode(newMode);
      viewStateManager.setViewMode(newMode);
      
      // Reset error state when switching views
      if (newMode === VIEW_MODES.LIST) {
        setTreeError(null);
      }
      
      // Announce view mode change to screen readers
      const itemCount = newMode === VIEW_MODES.TREE ? treeNodes.length : suggestions.length;
      const announcement = createViewModeAnnouncement(newMode, itemCount);
      announce(announcement);
      
      // Notify parent component
      if (onViewModeChange) {
        onViewModeChange(newMode, preservedState);
      }
    }
  }, [currentViewMode, viewStateManager, suggestions, treeNodes, onViewModeChange, isTreeViewDisabled]);

  // Handle selection for both views
  const handleSelect = useCallback((item) => {
    if (onSelect) {
      // Convert tree node to suggestion format if needed
      const suggestion = item.word ? {
        word: item.word,
        frequency: item.frequency || 0,
        type: item.suggestionType || 'exact_match',
        category: item.category,
        originalQuery: item.originalQuery,
        editDistance: item.editDistance,
        similarity: item.similarity,
        correctionType: item.correctionType
      } : item;
      
      onSelect(suggestion);
    }
  }, [onSelect]);

  // Handle tree node expansion
  const handleToggleExpand = useCallback((nodeId, isExpanded) => {
    const expandedNodes = viewStateManager.getExpandedNodes();
    if (isExpanded) {
      expandedNodes.add(nodeId);
    } else {
      expandedNodes.delete(nodeId);
    }
    viewStateManager.updateTreeSelection(
      viewStateManager.getSelectionState().selectedNodeId,
      expandedNodes
    );
  }, [viewStateManager]);

  // Handle error boundary errors
  const handleTreeError = useCallback((error) => {
    console.error('Tree error boundary caught error:', error);
    setTreeError(error);
    
    // Auto-fallback if recommended
    if (error.fallbackAction === FALLBACK_ACTIONS.USE_LIST_VIEW) {
      setTimeout(() => handleViewModeChange(VIEW_MODES.LIST), 100);
    }
  }, [handleViewModeChange]);

  // Handle retry attempts
  const handleRetry = useCallback((attemptCount) => {
    console.log(`Retrying tree build (attempt ${attemptCount})`);
    setRetryCount(attemptCount);
    setTreeError(null);
    
    // Rebuild tree after a short delay
    setTimeout(() => {
      buildTreeNodes();
    }, 100);
  }, [buildTreeNodes]);

  // Handle fallback to list view
  const handleFallback = useCallback((fallbackMode) => {
    console.log('Falling back to:', fallbackMode);
    handleViewModeChange(fallbackMode);
  }, [handleViewModeChange]);

  // Memoize tree view props to prevent unnecessary re-renders
  const treeViewProps = useMemo(() => ({
    treeNodes,
    query,
    onSelect: handleSelect,
    onToggleExpand: handleToggleExpand,
    className: "tree-view-container",
    autoFocus: isVisible,
    virtualScrollThreshold: treeConfig.virtualScrollThreshold || 50,
    itemHeight: 40,
    containerHeight: 320
  }), [treeNodes, query, handleSelect, handleToggleExpand, isVisible, treeConfig]);

  // Memoize list view props
  const listViewProps = useMemo(() => ({
    suggestions,
    query,
    selectedIndex,
    onSelect: handleSelect,
    className: "list-view-container"
  }), [suggestions, query, selectedIndex, handleSelect]);

  // Don't render if not visible or no suggestions
  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  // Render error state
  if (treeError && currentViewMode === VIEW_MODES.TREE) {
    return (
      <div
        ref={ref}
        className={`absolute top-full left-0 right-0 z-50 mt-1 max-h-80 rounded-lg border border-gray-200 bg-white shadow-lg ${className}`}
      >
        {showViewToggle && (
          <div className="border-b border-gray-100 p-2">
            <ViewToggle
              currentMode={currentViewMode}
              onModeChange={handleViewModeChange}
              size="small"
            />
          </div>
        )}
        <div className="p-4 text-center">
          <div className="text-red-600 mb-2">
            Failed to build tree view
          </div>
          <div className="text-sm text-gray-500 mb-3">
            {treeError.message}
          </div>
          <button
            onClick={() => handleViewModeChange(VIEW_MODES.LIST)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Switch to List View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg ${className}`}
      id="suggestions-content"
    >
      {showViewToggle && (
        <div className="border-b border-gray-100 p-2 bg-gray-50">
          <ViewToggle
            currentMode={currentViewMode}
            onModeChange={handleViewModeChange}
            disabled={isTreeBuilding || (currentViewMode === VIEW_MODES.LIST && isTreeViewDisabled)}
            size="small"
          />
          {isTreeViewDisabled && (
            <div className="mt-1 text-xs text-amber-600">
              Tree view temporarily disabled for performance
            </div>
          )}
        </div>
      )}
      
      <div className="overflow-auto max-h-72">
        {isTreeBuilding && currentViewMode === VIEW_MODES.TREE ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
            Building tree view...
            {retryCount > 0 && (
              <div className="text-xs mt-1">
                Retry attempt {retryCount}
              </div>
            )}
          </div>
        ) : currentViewMode === VIEW_MODES.TREE ? (
          <TreeErrorBoundary
            onError={handleTreeError}
            onRetry={handleRetry}
            onFallback={handleFallback}
            maxRetries={2}
            userFriendlyMessage="The tree view encountered an issue. You can try again or switch to list view."
            showErrorDetails={false}
          >
            <TreeView {...treeViewProps} />
          </TreeErrorBoundary>
        ) : (
          <ListView {...listViewProps} />
        )}
      </div>
    </div>
  );
});

SuggestionsDropdown.displayName = 'SuggestionsDropdown';

SuggestionsDropdown.propTypes = {
  suggestions: PropTypes.arrayOf(
    PropTypes.shape({
      word: PropTypes.string.isRequired,
      frequency: PropTypes.number.isRequired,
      category: PropTypes.string,
      type: PropTypes.oneOf(['exact_match', 'typo_correction']),
      originalQuery: PropTypes.string,
      editDistance: PropTypes.number,
      similarity: PropTypes.number,
      correctionType: PropTypes.string,
    })
  ),
  query: PropTypes.string,
  selectedIndex: PropTypes.number,
  onSelect: PropTypes.func,
  isVisible: PropTypes.bool,
  className: PropTypes.string,
  
  // New props for tree functionality
  viewMode: PropTypes.oneOf([VIEW_MODES.TREE, VIEW_MODES.LIST]),
  onViewModeChange: PropTypes.func,
  treeConfig: PropTypes.shape({
    maxDepth: PropTypes.number,
    minGroupSize: PropTypes.number,
    virtualScrollThreshold: PropTypes.number,
    buildTimeout: PropTypes.number,
  }),
  showViewToggle: PropTypes.bool,
};

export default SuggestionsDropdown;