/**
 * @fileoverview Memory optimization utilities for tree view components
 * Implements garbage collection hints and memory leak prevention
 */

/**
 * Memory usage optimizer and leak detector
 */
export class MemoryOptimizer {
  constructor() {
    this.memorySnapshots = [];
    this.leakDetectionThreshold = 10 * 1024 * 1024; // 10MB
    this.cleanupCallbacks = new Set();
    this.objectPools = new Map();
    this.weakRefs = new Set();
    
    this.startMemoryMonitoring();
  }

  /**
   * Starts continuous memory monitoring
   * @private
   */
  startMemoryMonitoring() {
    if (performance.memory) {
      setInterval(() => {
        this.takeMemorySnapshot();
        this.detectMemoryLeaks();
      }, 10000); // Every 10 seconds
    }
  }

  /**
   * Takes a memory snapshot
   * @private
   */
  takeMemorySnapshot() {
    if (!performance.memory) return;

    const snapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    };

    this.memorySnapshots.push(snapshot);

    // Keep only last 20 snapshots
    if (this.memorySnapshots.length > 20) {
      this.memorySnapshots = this.memorySnapshots.slice(-20);
    }
  }

  /**
   * Detects potential memory leaks
   * @private
   */
  detectMemoryLeaks() {
    if (this.memorySnapshots.length < 5) return;

    const recent = this.memorySnapshots.slice(-5);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];

    const memoryGrowth = newest.usedJSHeapSize - oldest.usedJSHeapSize;
    const timeSpan = newest.timestamp - oldest.timestamp;

    if (memoryGrowth > this.leakDetectionThreshold) {
      const growthRate = memoryGrowth / (timeSpan / 1000); // bytes per second
      
      console.warn('Potential memory leak detected:', {
        growth: `${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`,
        timeSpan: `${(timeSpan / 1000).toFixed(1)}s`,
        growthRate: `${(growthRate / 1024).toFixed(2)}KB/s`
      });

      this.triggerCleanup();
    }
  }

  /**
   * Optimizes tree node objects for memory efficiency
   * @param {Array} treeNodes - Array of tree nodes
   * @returns {Array} Optimized tree nodes
   */
  optimizeTreeNodes(treeNodes) {
    return treeNodes.map(node => this.optimizeTreeNode(node));
  }

  /**
   * Optimizes a single tree node
   * @private
   * @param {Object} node - Tree node
   * @returns {Object} Optimized node
   */
  optimizeTreeNode(node) {
    // Use object pooling for frequently created nodes
    const optimizedNode = this.getPooledObject('treeNode');
    
    // Copy only essential properties
    optimizedNode.id = node.id;
    optimizedNode.word = node.word;
    optimizedNode.frequency = node.frequency;
    optimizedNode.type = node.type;
    optimizedNode.level = node.level;
    optimizedNode.expanded = node.expanded || false;
    
    // Use WeakMap for children to prevent circular references
    if (node.children && node.children.length > 0) {
      optimizedNode.children = node.children.map(child => this.optimizeTreeNode(child));
    }

    return optimizedNode;
  }

  /**
   * Gets an object from the pool or creates a new one
   * @private
   * @param {string} type - Object type
   * @returns {Object} Pooled object
   */
  getPooledObject(type) {
    if (!this.objectPools.has(type)) {
      this.objectPools.set(type, []);
    }

    const pool = this.objectPools.get(type);
    
    if (pool.length > 0) {
      const obj = pool.pop();
      // Reset object properties
      Object.keys(obj).forEach(key => {
        delete obj[key];
      });
      return obj;
    }

    return {};
  }

  /**
   * Returns an object to the pool
   * @param {string} type - Object type
   * @param {Object} obj - Object to return
   */
  returnToPool(type, obj) {
    if (!this.objectPools.has(type)) {
      this.objectPools.set(type, []);
    }

    const pool = this.objectPools.get(type);
    
    // Limit pool size to prevent memory bloat
    if (pool.length < 100) {
      pool.push(obj);
    }
  }

  /**
   * Creates weak references for large objects
   * @param {Object} obj - Object to create weak reference for
   * @returns {WeakRef} Weak reference
   */
  createWeakRef(obj) {
    if (typeof WeakRef !== 'undefined') {
      const weakRef = new WeakRef(obj);
      this.weakRefs.add(weakRef);
      return weakRef;
    }
    
    // Fallback for environments without WeakRef
    return { deref: () => obj };
  }

  /**
   * Cleans up weak references
   * @private
   */
  cleanupWeakRefs() {
    const toRemove = [];
    
    for (const weakRef of this.weakRefs) {
      if (weakRef.deref() === undefined) {
        toRemove.push(weakRef);
      }
    }
    
    toRemove.forEach(ref => this.weakRefs.delete(ref));
  }

  /**
   * Optimizes event listeners to prevent memory leaks
   * @param {Element} element - DOM element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   * @returns {Function} Cleanup function
   */
  addOptimizedEventListener(element, event, handler, options = {}) {
    // Use AbortController for easy cleanup
    const controller = new AbortController();
    const optimizedOptions = {
      ...options,
      signal: controller.signal
    };

    element.addEventListener(event, handler, optimizedOptions);

    const cleanup = () => {
      controller.abort();
    };

    this.cleanupCallbacks.add(cleanup);
    return cleanup;
  }

  /**
   * Optimizes DOM node creation and management
   * @param {string} tagName - Tag name
   * @param {Object} attributes - Attributes
   * @param {Array} children - Child elements
   * @returns {Element} Optimized DOM element
   */
  createOptimizedElement(tagName, attributes = {}, children = []) {
    const element = document.createElement(tagName);
    
    // Set attributes efficiently
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, value);
      } else {
        element[key] = value;
      }
    });

    // Append children using document fragment for efficiency
    if (children.length > 0) {
      const fragment = document.createDocumentFragment();
      children.forEach(child => {
        if (typeof child === 'string') {
          fragment.appendChild(document.createTextNode(child));
        } else {
          fragment.appendChild(child);
        }
      });
      element.appendChild(fragment);
    }

    return element;
  }

  /**
   * Debounces function calls to reduce memory pressure
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  createMemoryEfficientDebounce(func, delay) {
    let timeoutId;
    let lastArgs;
    
    const debouncedFunc = (...args) => {
      lastArgs = args;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        func.apply(this, lastArgs);
        lastArgs = null; // Clear reference
        timeoutId = null;
      }, delay);
    };

    // Add cleanup method
    debouncedFunc.cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastArgs = null;
    };

    this.cleanupCallbacks.add(debouncedFunc.cleanup);
    return debouncedFunc;
  }

  /**
   * Creates a memory-efficient virtual list renderer
   * @param {Array} items - Items to render
   * @param {Function} renderItem - Item render function
   * @param {Object} options - Rendering options
   * @returns {Object} Virtual list renderer
   */
  createVirtualListRenderer(items, renderItem, options = {}) {
    const {
      itemHeight = 40,
      containerHeight = 400,
      overscan = 5
    } = options;

    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const totalHeight = items.length * itemHeight;

    return {
      getVisibleItems: (scrollTop) => {
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(
          startIndex + visibleCount + overscan,
          items.length
        );

        const visibleItems = [];
        for (let i = Math.max(0, startIndex - overscan); i < endIndex; i++) {
          if (items[i]) {
            visibleItems.push({
              index: i,
              item: items[i],
              top: i * itemHeight,
              height: itemHeight
            });
          }
        }

        return visibleItems;
      },
      
      totalHeight,
      
      cleanup: () => {
        // Cleanup any cached rendered items
        items.length = 0;
      }
    };
  }

  /**
   * Triggers cleanup of all registered cleanup callbacks
   */
  triggerCleanup() {
    console.log('Triggering memory cleanup...');
    
    // Execute all cleanup callbacks
    this.cleanupCallbacks.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });

    // Clean up weak references
    this.cleanupWeakRefs();

    // Clear object pools if they're getting too large
    this.objectPools.forEach((pool, type) => {
      if (pool.length > 50) {
        pool.length = 25; // Keep only half
        console.log(`Trimmed object pool for ${type}`);
      }
    });

    // Suggest garbage collection if available
    if (window.gc) {
      window.gc();
    }

    // Force garbage collection hint
    if (performance.memory) {
      const beforeCleanup = performance.memory.usedJSHeapSize;
      
      setTimeout(() => {
        const afterCleanup = performance.memory.usedJSHeapSize;
        const freed = beforeCleanup - afterCleanup;
        
        if (freed > 0) {
          console.log(`Memory cleanup freed ${(freed / 1024 / 1024).toFixed(2)}MB`);
        }
      }, 1000);
    }
  }

  /**
   * Registers a cleanup callback
   * @param {Function} callback - Cleanup callback
   */
  registerCleanup(callback) {
    this.cleanupCallbacks.add(callback);
  }

  /**
   * Unregisters a cleanup callback
   * @param {Function} callback - Cleanup callback
   */
  unregisterCleanup(callback) {
    this.cleanupCallbacks.delete(callback);
  }

  /**
   * Gets memory usage statistics
   * @returns {Object} Memory statistics
   */
  getMemoryStats() {
    const stats = {
      snapshots: this.memorySnapshots.length,
      objectPools: Object.fromEntries(
        Array.from(this.objectPools.entries()).map(([type, pool]) => [type, pool.length])
      ),
      weakRefs: this.weakRefs.size,
      cleanupCallbacks: this.cleanupCallbacks.size
    };

    if (performance.memory) {
      stats.current = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }

    if (this.memorySnapshots.length > 1) {
      const oldest = this.memorySnapshots[0];
      const newest = this.memorySnapshots[this.memorySnapshots.length - 1];
      
      stats.growth = {
        absolute: newest.usedJSHeapSize - oldest.usedJSHeapSize,
        percentage: ((newest.usedJSHeapSize / oldest.usedJSHeapSize - 1) * 100).toFixed(2)
      };
    }

    return stats;
  }

  /**
   * Cleanup method to be called when component unmounts
   */
  destroy() {
    this.triggerCleanup();
    this.memorySnapshots.length = 0;
    this.objectPools.clear();
    this.weakRefs.clear();
    this.cleanupCallbacks.clear();
  }
}

/**
 * Memory-efficient tree node factory
 */
export class TreeNodeFactory {
  constructor() {
    this.nodePool = [];
    this.maxPoolSize = 1000;
  }

  /**
   * Creates a new tree node or reuses from pool
   * @param {Object} data - Node data
   * @returns {Object} Tree node
   */
  createNode(data) {
    let node;
    
    if (this.nodePool.length > 0) {
      node = this.nodePool.pop();
      // Reset node
      Object.keys(node).forEach(key => delete node[key]);
    } else {
      node = {};
    }

    // Set node properties
    Object.assign(node, {
      id: data.id || this.generateId(),
      word: data.word,
      frequency: data.frequency || 0,
      type: data.type || 'word',
      level: data.level || 0,
      expanded: false,
      children: []
    });

    return node;
  }

  /**
   * Returns a node to the pool
   * @param {Object} node - Node to return
   */
  returnNode(node) {
    if (this.nodePool.length < this.maxPoolSize) {
      // Clear children references to prevent memory leaks
      if (node.children) {
        node.children.forEach(child => this.returnNode(child));
        node.children.length = 0;
      }
      
      this.nodePool.push(node);
    }
  }

  /**
   * Generates a unique ID for nodes
   * @private
   * @returns {string} Unique ID
   */
  generateId() {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets pool statistics
   * @returns {Object} Pool stats
   */
  getPoolStats() {
    return {
      poolSize: this.nodePool.length,
      maxPoolSize: this.maxPoolSize,
      utilizationRate: ((this.maxPoolSize - this.nodePool.length) / this.maxPoolSize * 100).toFixed(2)
    };
  }
}

/**
 * Default memory optimizer instance
 */
export const memoryOptimizer = new MemoryOptimizer();

/**
 * Default tree node factory instance
 */
export const treeNodeFactory = new TreeNodeFactory();