/**
 * @fileoverview Performance monitoring utility for automatic degradation
 */

import { VIEW_MODES, ERROR_TYPES, FALLBACK_ACTIONS } from '../types/tree';

/**
 * Performance monitoring and automatic degradation utility
 */
export class PerformanceMonitor {
  constructor(config = {}) {
    this.config = {
      treeBuildTimeThreshold: 200, // ms
      renderTimeThreshold: 100, // ms
      memoryThreshold: 50 * 1024 * 1024, // 50MB
      maxSuggestions: 1000,
      degradationCooldown: 5000, // 5 seconds
      ...config
    };
    
    this.metrics = {
      treeBuildTimes: [],
      renderTimes: [],
      errorCount: 0,
      degradationCount: 0,
      lastDegradation: 0
    };
    
    this.listeners = new Set();
  }

  /**
   * Monitors tree building performance
   * @param {Function} buildFunction - Function that builds the tree
   * @param {Array} suggestions - Suggestions array
   * @returns {Promise<Object>} Result with tree nodes or error
   */
  async monitorTreeBuild(buildFunction, suggestions) {
    const startTime = performance.now();
    const startMemory = this._getMemoryUsage();
    
    try {
      // Check if suggestions exceed threshold
      if (suggestions.length > this.config.maxSuggestions) {
        return {
          success: false,
          error: {
            type: ERROR_TYPES.BUILD_ERROR,
            message: `Too many suggestions (${suggestions.length}). Maximum allowed: ${this.config.maxSuggestions}`,
            fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW
          },
          shouldDegrade: true
        };
      }

      // Check if we're in cooldown period
      if (this._isInCooldown()) {
        return {
          success: false,
          error: {
            type: ERROR_TYPES.BUILD_ERROR,
            message: 'Tree view temporarily disabled due to performance issues',
            fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW
          },
          shouldDegrade: true
        };
      }

      const result = await buildFunction();
      const buildTime = performance.now() - startTime;
      const endMemory = this._getMemoryUsage();
      const memoryUsed = endMemory - startMemory;

      // Record metrics
      this.metrics.treeBuildTimes.push(buildTime);
      this._trimMetrics('treeBuildTimes');

      // Check performance thresholds
      const shouldDegrade = this._shouldDegradePerformance(buildTime, memoryUsed);
      
      if (shouldDegrade) {
        this._recordDegradation();
        return {
          success: false,
          error: {
            type: ERROR_TYPES.BUILD_ERROR,
            message: `Tree building took too long (${Math.round(buildTime)}ms). Switching to list view for better performance.`,
            fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW
          },
          shouldDegrade: true,
          metrics: { buildTime, memoryUsed }
        };
      }

      this._notifyListeners('treeBuildSuccess', { buildTime, memoryUsed, suggestionsCount: suggestions.length });

      return {
        success: true,
        result,
        metrics: { buildTime, memoryUsed }
      };

    } catch (error) {
      const buildTime = performance.now() - startTime;
      this.metrics.errorCount++;
      
      this._notifyListeners('treeBuildError', { error, buildTime });

      return {
        success: false,
        error: {
          type: ERROR_TYPES.BUILD_ERROR,
          message: error.message || 'Tree building failed',
          fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW,
          originalError: error
        },
        shouldDegrade: true,
        metrics: { buildTime }
      };
    }
  }

  /**
   * Monitors rendering performance
   * @param {Function} renderFunction - Function that performs rendering
   * @returns {Promise<Object>} Result with render metrics
   */
  async monitorRender(renderFunction) {
    const startTime = performance.now();
    
    try {
      const result = await renderFunction();
      const renderTime = performance.now() - startTime;
      
      this.metrics.renderTimes.push(renderTime);
      this._trimMetrics('renderTimes');
      
      if (renderTime > this.config.renderTimeThreshold) {
        this._notifyListeners('slowRender', { renderTime });
      }
      
      return {
        success: true,
        result,
        metrics: { renderTime }
      };
      
    } catch (error) {
      const renderTime = performance.now() - startTime;
      this.metrics.errorCount++;
      
      this._notifyListeners('renderError', { error, renderTime });
      
      return {
        success: false,
        error: {
          type: ERROR_TYPES.RENDER_ERROR,
          message: error.message || 'Rendering failed',
          fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW,
          originalError: error
        },
        metrics: { renderTime }
      };
    }
  }

  /**
   * Checks if tree view should be available based on current performance metrics
   * @param {number} suggestionsCount - Number of suggestions
   * @returns {Object} Availability check result
   */
  checkTreeViewAvailability(suggestionsCount) {
    // Check suggestion count threshold
    if (suggestionsCount > this.config.maxSuggestions) {
      return {
        available: false,
        reason: `Too many suggestions (${suggestionsCount}/${this.config.maxSuggestions})`,
        fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW
      };
    }

    // Check if in cooldown period
    if (this._isInCooldown()) {
      const remainingTime = Math.ceil((this.config.degradationCooldown - (Date.now() - this.metrics.lastDegradation)) / 1000);
      return {
        available: false,
        reason: `Tree view temporarily disabled (${remainingTime}s remaining)`,
        fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW
      };
    }

    // Check recent performance
    const avgBuildTime = this._getAverageMetric('treeBuildTimes');
    if (avgBuildTime > this.config.treeBuildTimeThreshold) {
      return {
        available: false,
        reason: `Recent tree builds too slow (avg: ${Math.round(avgBuildTime)}ms)`,
        fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW
      };
    }

    return {
      available: true,
      reason: 'Performance metrics within acceptable range'
    };
  }

  /**
   * Gets current performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      averageBuildTime: this._getAverageMetric('treeBuildTimes'),
      averageRenderTime: this._getAverageMetric('renderTimes'),
      isInCooldown: this._isInCooldown(),
      cooldownRemaining: this._isInCooldown() ? 
        Math.ceil((this.config.degradationCooldown - (Date.now() - this.metrics.lastDegradation)) / 1000) : 0
    };
  }

  /**
   * Resets performance metrics
   */
  resetMetrics() {
    this.metrics = {
      treeBuildTimes: [],
      renderTimes: [],
      errorCount: 0,
      degradationCount: 0,
      lastDegradation: 0
    };
    
    this._notifyListeners('metricsReset');
  }

  /**
   * Adds a performance event listener
   * @param {Function} listener - Listener function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Removes a performance event listener
   * @param {Function} listener - Listener function
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Checks if performance degradation should occur
   * @private
   * @param {number} buildTime - Build time in milliseconds
   * @param {number} memoryUsed - Memory used in bytes
   * @returns {boolean} Whether to degrade performance
   */
  _shouldDegradePerformance(buildTime, memoryUsed) {
    // Check build time threshold
    if (buildTime > this.config.treeBuildTimeThreshold) {
      return true;
    }

    // Check memory usage threshold
    if (memoryUsed > this.config.memoryThreshold) {
      return true;
    }

    // Check if recent builds have been consistently slow
    const recentBuildTimes = this.metrics.treeBuildTimes.slice(-3);
    if (recentBuildTimes.length >= 3) {
      const avgRecentTime = recentBuildTimes.reduce((sum, time) => sum + time, 0) / recentBuildTimes.length;
      if (avgRecentTime > this.config.treeBuildTimeThreshold * 0.8) {
        return true;
      }
    }

    return false;
  }

  /**
   * Records a performance degradation event
   * @private
   */
  _recordDegradation() {
    this.metrics.degradationCount++;
    this.metrics.lastDegradation = Date.now();
    
    this._notifyListeners('performanceDegradation', {
      count: this.metrics.degradationCount,
      timestamp: this.metrics.lastDegradation
    });
  }

  /**
   * Checks if currently in cooldown period
   * @private
   * @returns {boolean} Whether in cooldown
   */
  _isInCooldown() {
    if (this.metrics.lastDegradation === 0) return false;
    return (Date.now() - this.metrics.lastDegradation) < this.config.degradationCooldown;
  }

  /**
   * Gets current memory usage (if available)
   * @private
   * @returns {number} Memory usage in bytes
   */
  _getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Calculates average for a metric array
   * @private
   * @param {string} metricName - Name of the metric
   * @returns {number} Average value
   */
  _getAverageMetric(metricName) {
    const values = this.metrics[metricName];
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /**
   * Trims metric arrays to prevent memory leaks
   * @private
   * @param {string} metricName - Name of the metric to trim
   */
  _trimMetrics(metricName) {
    const maxLength = 10;
    if (this.metrics[metricName].length > maxLength) {
      this.metrics[metricName] = this.metrics[metricName].slice(-maxLength);
    }
  }

  /**
   * Notifies all listeners of an event
   * @private
   * @param {string} eventType - Type of event
   * @param {*} data - Event data
   */
  _notifyListeners(eventType, data) {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, data);
      } catch (error) {
        console.error('Error in performance monitor listener:', error);
      }
    });
  }
}

/**
 * Default PerformanceMonitor instance
 */
export const defaultPerformanceMonitor = new PerformanceMonitor();