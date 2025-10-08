/**
 * @fileoverview Bundle size optimization utilities for tree-related code
 * Implements code splitting and lazy loading strategies
 */

/**
 * Bundle size analyzer and optimizer
 */
export class BundleOptimizer {
  constructor() {
    this.loadedModules = new Set();
    this.moduleLoadTimes = new Map();
    this.bundleSizeEstimates = new Map();
  }

  /**
   * Lazy loads tree components only when needed
   * @returns {Promise<Object>} Tree components
   */
  async loadTreeComponents() {
    const startTime = performance.now();
    
    try {
      // Dynamic import for tree components
      const [
        { TreeView },
        { TreeNode },
        { TreeBuilder },
        { VirtualScrollContainer }
      ] = await Promise.all([
        import('../components/TreeView.jsx'),
        import('../components/TreeNode.jsx'),
        import('../utils/TreeBuilder.js'),
        import('../components/VirtualScrollContainer.jsx')
      ]);

      const loadTime = performance.now() - startTime;
      this.moduleLoadTimes.set('treeComponents', loadTime);
      this.loadedModules.add('treeComponents');

      return {
        TreeView,
        TreeNode,
        TreeBuilder,
        VirtualScrollContainer,
        loadTime
      };
    } catch (error) {
      console.error('Failed to load tree components:', error);
      throw new Error('Tree components unavailable');
    }
  }

  /**
   * Lazy loads D3 visualization components
   * @returns {Promise<Object>} D3 components
   */
  async loadVisualizationComponents() {
    const startTime = performance.now();
    
    try {
      // Dynamic import for D3 and visualization components
      const [
        d3Module,
        { TrieVisualization }
      ] = await Promise.all([
        import('d3'),
        import('../components/TrieVisualization.jsx')
      ]);

      const loadTime = performance.now() - startTime;
      this.moduleLoadTimes.set('visualizationComponents', loadTime);
      this.loadedModules.add('visualizationComponents');

      return {
        d3: d3Module,
        TrieVisualization,
        loadTime
      };
    } catch (error) {
      console.error('Failed to load visualization components:', error);
      throw new Error('Visualization components unavailable');
    }
  }

  /**
   * Preloads components based on user behavior
   * @param {string} userAction - User action that suggests component need
   */
  async preloadComponents(userAction) {
    switch (userAction) {
      case 'hover_tree_button':
        // Preload tree components when user hovers over tree view button
        if (!this.loadedModules.has('treeComponents')) {
          this.loadTreeComponents().catch(() => {
            // Silent fail for preloading
          });
        }
        break;
        
      case 'navigate_to_visualization':
        // Preload visualization components when navigating to visualization tab
        if (!this.loadedModules.has('visualizationComponents')) {
          this.loadVisualizationComponents().catch(() => {
            // Silent fail for preloading
          });
        }
        break;
        
      case 'large_dataset_detected':
        // Preload virtual scrolling components for large datasets
        if (!this.loadedModules.has('virtualScrolling')) {
          this.loadVirtualScrollingComponents().catch(() => {
            // Silent fail for preloading
          });
        }
        break;
    }
  }

  /**
   * Lazy loads virtual scrolling components for large datasets
   * @returns {Promise<Object>} Virtual scrolling components
   */
  async loadVirtualScrollingComponents() {
    const startTime = performance.now();
    
    try {
      const { VirtualScrollContainer } = await import('../components/VirtualScrollContainer.jsx');

      const loadTime = performance.now() - startTime;
      this.moduleLoadTimes.set('virtualScrolling', loadTime);
      this.loadedModules.add('virtualScrolling');

      return {
        VirtualScrollContainer,
        loadTime
      };
    } catch (error) {
      console.error('Failed to load virtual scrolling components:', error);
      throw new Error('Virtual scrolling components unavailable');
    }
  }

  /**
   * Estimates bundle size impact of loading components
   * @param {string} componentSet - Set of components to estimate
   * @returns {number} Estimated size in bytes
   */
  estimateBundleSize(componentSet) {
    const estimates = {
      treeComponents: 45 * 1024, // ~45KB
      visualizationComponents: 120 * 1024, // ~120KB (includes D3)
      virtualScrolling: 15 * 1024, // ~15KB
      performanceMonitoring: 25 * 1024 // ~25KB
    };

    return estimates[componentSet] || 0;
  }

  /**
   * Gets loading performance metrics
   * @returns {Object} Loading metrics
   */
  getLoadingMetrics() {
    return {
      loadedModules: Array.from(this.loadedModules),
      loadTimes: Object.fromEntries(this.moduleLoadTimes),
      totalLoadTime: Array.from(this.moduleLoadTimes.values()).reduce((sum, time) => sum + time, 0),
      estimatedBundleSize: this.getTotalEstimatedSize()
    };
  }

  /**
   * Gets total estimated bundle size for loaded modules
   * @private
   * @returns {number} Total estimated size in bytes
   */
  getTotalEstimatedSize() {
    let totalSize = 0;
    for (const module of this.loadedModules) {
      totalSize += this.estimateBundleSize(module);
    }
    return totalSize;
  }

  /**
   * Unloads unused components to free memory
   * @param {Array} componentsToUnload - Components to unload
   */
  unloadComponents(componentsToUnload) {
    componentsToUnload.forEach(component => {
      this.loadedModules.delete(component);
      this.moduleLoadTimes.delete(component);
    });
    
    // Suggest garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * Creates a performance-optimized component loader
   * @param {string} componentName - Name of component to load
   * @param {Function} fallback - Fallback component
   * @returns {Function} Optimized loader function
   */
  createOptimizedLoader(componentName, fallback) {
    return async () => {
      try {
        // Check if component is already loaded
        if (this.loadedModules.has(componentName)) {
          return this.getCachedComponent(componentName);
        }

        // Load component with timeout
        const loadPromise = this.loadComponent(componentName);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Component load timeout')), 5000);
        });

        const component = await Promise.race([loadPromise, timeoutPromise]);
        return component;
      } catch (error) {
        console.warn(`Failed to load ${componentName}, using fallback:`, error);
        return fallback;
      }
    };
  }

  /**
   * Loads a specific component by name
   * @private
   * @param {string} componentName - Component name
   * @returns {Promise<Object>} Component
   */
  async loadComponent(componentName) {
    switch (componentName) {
      case 'TreeView':
        const treeComponents = await this.loadTreeComponents();
        return treeComponents.TreeView;
      case 'TrieVisualization':
        const vizComponents = await this.loadVisualizationComponents();
        return vizComponents.TrieVisualization;
      case 'VirtualScrollContainer':
        const scrollComponents = await this.loadVirtualScrollingComponents();
        return scrollComponents.VirtualScrollContainer;
      default:
        throw new Error(`Unknown component: ${componentName}`);
    }
  }

  /**
   * Gets cached component if available
   * @private
   * @param {string} componentName - Component name
   * @returns {Object|null} Cached component or null
   */
  getCachedComponent(componentName) {
    // This would return cached components in a real implementation
    // For now, return null to force reload
    return null;
  }
}

/**
 * Tree component lazy loader with fallback
 */
export const TreeComponentLoader = {
  async loadTreeView() {
    try {
      const { TreeView } = await import('../components/TreeView.jsx');
      return TreeView;
    } catch (error) {
      console.error('Failed to load TreeView:', error);
      // Return a simple fallback component
      return ({ suggestions, onSelect }) => {
        return React.createElement('div', {
          className: 'fallback-tree-view',
          children: 'Tree view unavailable. Using list view.'
        });
      };
    }
  },

  async loadTreeBuilder() {
    try {
      const { TreeBuilder } = await import('../utils/TreeBuilder.js');
      return TreeBuilder;
    } catch (error) {
      console.error('Failed to load TreeBuilder:', error);
      // Return a simple fallback that just returns suggestions as-is
      return class FallbackTreeBuilder {
        buildTree(suggestions) {
          return suggestions.map(s => ({ ...s, type: 'word', level: 0 }));
        }
      };
    }
  },

  async loadVirtualScrolling() {
    try {
      const { VirtualScrollContainer } = await import('../components/VirtualScrollContainer.jsx');
      return VirtualScrollContainer;
    } catch (error) {
      console.error('Failed to load VirtualScrollContainer:', error);
      // Return a simple div fallback
      return ({ children, ...props }) => {
        return React.createElement('div', {
          ...props,
          className: `${props.className || ''} fallback-scroll-container`,
          children
        });
      };
    }
  }
};

/**
 * Bundle size monitoring utility
 */
export class BundleSizeMonitor {
  constructor() {
    this.sizeHistory = [];
    this.thresholds = {
      warning: 100 * 1024, // 100KB
      critical: 200 * 1024 // 200KB
    };
  }

  /**
   * Records bundle size measurement
   * @param {string} bundleName - Name of the bundle
   * @param {number} size - Size in bytes
   */
  recordSize(bundleName, size) {
    const record = {
      bundleName,
      size,
      timestamp: Date.now()
    };

    this.sizeHistory.push(record);

    // Keep only last 50 measurements
    if (this.sizeHistory.length > 50) {
      this.sizeHistory = this.sizeHistory.slice(-50);
    }

    this.checkThresholds(bundleName, size);
  }

  /**
   * Checks if size exceeds thresholds
   * @private
   * @param {string} bundleName - Bundle name
   * @param {number} size - Size in bytes
   */
  checkThresholds(bundleName, size) {
    if (size > this.thresholds.critical) {
      console.warn(`Bundle ${bundleName} size critical: ${(size / 1024).toFixed(1)}KB`);
    } else if (size > this.thresholds.warning) {
      console.warn(`Bundle ${bundleName} size warning: ${(size / 1024).toFixed(1)}KB`);
    }
  }

  /**
   * Gets bundle size report
   * @returns {Object} Size report
   */
  getSizeReport() {
    const totalSize = this.sizeHistory.reduce((sum, record) => sum + record.size, 0);
    const avgSize = this.sizeHistory.length > 0 ? totalSize / this.sizeHistory.length : 0;

    return {
      totalSize,
      averageSize: avgSize,
      measurements: this.sizeHistory.length,
      thresholds: this.thresholds,
      history: this.sizeHistory.slice(-10) // Last 10 measurements
    };
  }
}

/**
 * Default bundle optimizer instance
 */
export const bundleOptimizer = new BundleOptimizer();

/**
 * Default bundle size monitor instance
 */
export const bundleSizeMonitor = new BundleSizeMonitor();