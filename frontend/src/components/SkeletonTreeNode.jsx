import React, { memo } from 'react';
import PropTypes from 'prop-types';
import './SkeletonTreeNode.css';

/**
 * Skeleton loader component for tree nodes during loading states
 */
const SkeletonTreeNode = memo(({ 
  depth = 0, 
  showChildren = false, 
  childrenCount = 3,
  animate = true,
  variant = 'default'
}) => {
  const indentationStyle = {
    paddingLeft: `${depth * 20 + 8}px`
  };

  const getSkeletonClass = () => {
    let baseClass = 'skeleton-tree-node';
    if (animate) baseClass += ' skeleton-animate';
    if (variant !== 'default') baseClass += ` skeleton-${variant}`;
    return baseClass;
  };

  const getContentSkeletonClass = () => {
    let baseClass = 'skeleton-content';
    if (animate) baseClass += ' skeleton-pulse';
    return baseClass;
  };

  return (
    <div className={getSkeletonClass()} data-testid="skeleton-tree-node">
      {/* Main node skeleton */}
      <div 
        className="skeleton-node-container"
        style={indentationStyle}
      >
        {/* Expand icon skeleton */}
        <div className="skeleton-expand-icon" />
        
        {/* Node content skeleton */}
        <div className="skeleton-node-content">
          <div className={`${getContentSkeletonClass()} skeleton-text-primary`} />
          <div className={`${getContentSkeletonClass()} skeleton-text-secondary`} />
        </div>
        
        {/* Frequency/metadata skeleton */}
        <div className={`${getContentSkeletonClass()} skeleton-metadata`} />
      </div>
      
      {/* Children skeletons */}
      {showChildren && (
        <div className="skeleton-children">
          {Array.from({ length: childrenCount }, (_, index) => (
            <SkeletonTreeNode
              key={index}
              depth={depth + 1}
              showChildren={false}
              animate={animate}
              variant={variant}
            />
          ))}
        </div>
      )}
    </div>
  );
});

SkeletonTreeNode.propTypes = {
  depth: PropTypes.number,
  showChildren: PropTypes.bool,
  childrenCount: PropTypes.number,
  animate: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'compact', 'detailed'])
};

SkeletonTreeNode.displayName = 'SkeletonTreeNode';

/**
 * Skeleton loader for the entire tree view
 */
const SkeletonTreeView = memo(({ 
  nodeCount = 5, 
  maxDepth = 2, 
  animate = true,
  variant = 'default'
}) => {
  const generateSkeletonStructure = () => {
    const nodes = [];
    
    for (let i = 0; i < nodeCount; i++) {
      const hasChildren = Math.random() > 0.5 && maxDepth > 0;
      const childrenCount = hasChildren ? Math.floor(Math.random() * 3) + 1 : 0;
      
      nodes.push(
        <SkeletonTreeNode
          key={i}
          depth={0}
          showChildren={hasChildren}
          childrenCount={childrenCount}
          animate={animate}
          variant={variant}
        />
      );
    }
    
    return nodes;
  };

  return (
    <div className="skeleton-tree-view" data-testid="skeleton-tree-view">
      <div className="skeleton-tree-header">
        <div className={`skeleton-content skeleton-header-text ${animate ? 'skeleton-pulse' : ''}`} />
        <div className={`skeleton-content skeleton-toggle ${animate ? 'skeleton-pulse' : ''}`} />
      </div>
      
      <div className="skeleton-tree-container">
        {generateSkeletonStructure()}
      </div>
    </div>
  );
});

SkeletonTreeView.propTypes = {
  nodeCount: PropTypes.number,
  maxDepth: PropTypes.number,
  animate: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'compact', 'detailed'])
};

SkeletonTreeView.displayName = 'SkeletonTreeView';

/**
 * Loading state component with skeleton and progress indicator
 */
const TreeLoadingState = memo(({ 
  message = 'Building tree structure...', 
  progress = null,
  showSkeleton = true,
  animate = true
}) => {
  return (
    <div className="tree-loading-state" data-testid="tree-loading-state">
      {/* Loading message and progress */}
      <div className="loading-header">
        <div className="loading-message">
          <div className={`loading-spinner ${animate ? 'spin' : ''}`} />
          <span className="loading-text">{message}</span>
        </div>
        
        {progress !== null && (
          <div className="loading-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        )}
      </div>
      
      {/* Skeleton tree */}
      {showSkeleton && (
        <SkeletonTreeView 
          nodeCount={4} 
          maxDepth={2} 
          animate={animate}
          variant="compact"
        />
      )}
    </div>
  );
});

TreeLoadingState.propTypes = {
  message: PropTypes.string,
  progress: PropTypes.number,
  showSkeleton: PropTypes.bool,
  animate: PropTypes.bool
};

TreeLoadingState.displayName = 'TreeLoadingState';

export default SkeletonTreeNode;
export { SkeletonTreeView, TreeLoadingState };