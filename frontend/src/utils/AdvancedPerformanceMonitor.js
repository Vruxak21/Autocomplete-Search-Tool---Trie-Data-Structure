/**
 * @fileoverview Advanced performance monitoring with automatic fallback thresholds
 * and comprehensive metrics collection for tree view optimization
 */

import { VIEW_MODES, ERROR_TYPES, FALLBACK_ACTIONS } from '../types/tree';

/**
 * Performance metrics collector and analyzer
 */
export class AdvancedPerformanceMonitor {
  constructor(config = {}) {
    this.config = {
      // Performance thresholds
      treeBuildTimeThreshold: 200, // ms
      renderTimeThreshold: 100, // ms
      memoryThreshold: 50 * 1024 * 1024, // 50MB
      maxSuggestions: 1000,
      degradationCooldown: 5000, // 5 seconds
      
      // Automatic fallback thresholds
      autoFallbackThresholds: {
        consecutiveSlowBuilds: 3,
        averageBuildTimeThreshold: 150, // ms
        memoryGrowthRate: 0.2, // 20% increase
        errorRate: 0.1 // 10% error rate
      },
      
      // Bundle size monitoring
      bundleSizeThreshold: 100 * 1024, // 100KB
      
      ...config
    };
    
    this.metrics = {
      treeBuildTimes: [],
      renderTimes: [],
      memoryUsage: [],
      errorCount: 0,
      totalOperations: 0,
      degradationCount: 0,
      lastDegradation: 0,
      bundleSize: 0,
      
      // Advanced metrics
      consecutiveSlowBuilds: 0,
      memoryGrowthHistory: [],
      performanceScore: 100,
      fallbackTriggers: []
    };
    
    this.listeners = new Set();
    this.performanceObserver = null;
    this.memoryMonitorInterval = null;
    
    this.initializePerformanceObserver();
    this.startMemoryMonitoring();
  }

  /**
   * Initializes Performance Observer for Web Vitals monitoring
   * @private
   */
  initializePerformanceObserver() {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        // Monitor paint metrics
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordWebVital(entry);
          }
        });
        
        this.performanceObserver.observe({ 
          entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] 
        });
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }
  }

  /**
   * Starts continuous memory monitoring
   * @private
   */
  startMemoryMonitoring() {
    if (performance.memory) {
      this.memoryMonitorInterval = setInterval(() => {
        const currentMemory = performance.memory.usedJSHeapSize;
        this.metrics.memoryUsage.push({
          timestamp: Date.now(),
          usage: currentMemory
        });
        
        // Keep only last 50 measurements
        if (this.metrics.memoryUsage.length > 50) {
          this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-50);
        }
        
        this.analyzeMemoryGrowth();
      }, 5000); // Every 5 seconds
    }
  }

  /**
   * Records Web Vitals metrics
   * @private
   * @param {PerformanceEntry} entry - Performance entry
   */
  recordWebVital(entry) {
    const metric = {
      name: entry.name,
      value: entry.value || entry.startTime,
      timestamp: Date.now()
    };
    
    this._notifyListeners('webVital', metric);
  }

  /**
   * Analyzes memory growth patterns
   * @private
   */
  analyzeMemoryGrowth() {
    if (this.metrics.memoryUsage.length < 2) return;
    
    const recent = this.metrics.memoryUsage.slice(-10);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    
    if (oldest && newest) {
      const growthRate = (newest.usage - oldest.usage) / oldest.usage;
      
      this.metrics.memoryGrowthHistory.push({
        timestamp: Date.now(),
        growthRate
      });
      
      // Keep only last 20 measurements
      if (this.metrics.memoryGrowthHistory.length > 20) {
        this.metrics.memoryGrowthHistory = this.metrics.memoryGrowthHistory.slice(-20);
      }
      
      // Check for concerning memory growth
      if (growthRate > this.config.autoFallbackThresholds.memoryGrowthRate) {
        this.triggerAutoFallback('memory_growth', {
          growthRate,
          threshold: this.config.autoFallbackThresholds.memoryGrowthRate
        });
      }
    }
  }

  /**
   * Monitors tree building performance with automatic fallback
   * @param {Function} buildFunction - Function that builds the tree
   * @param {Array} suggestions - Suggestions array
   * @returns {Promise<Object>} Result with tree nodes or fallback decision
   */
  async monitorTreeBuildWithFallback(buildFunction, suggestions) {
    const startTime = performance.now();
    const startMemory = this._getMemoryUsage();
    
    this.metrics.totalOperations++;
    
    try {
      // Check pre-build conditions
      const preCheck = this.checkPreBuildConditions(suggestions);
      if (!preCheck.allowed) {
        return {
          success: false,
          error: preCheck.error,
          shouldDegrade: true,
          fallbackReason: preCheck.reason
        };
      }

      const result = await buildFunction();
      const buildTime = performance.now() - startTime;
      const endMemory = this._getMemoryUsage();
      const memoryUsed = endMemory - startMemory;

      // Record metrics
      this.metrics.treeBuildTimes.push(buildTime);
      this._trimMetrics('treeBuildTimes');

      // Analyze performance
      const performanceAnalysis = this.analyzePerformance(buildTime, memoryUsed);
      
      if (performanceAnalysis.shouldFallback) {
        this.triggerAutoFallback('performance', performanceAnalysis);
        return {
          success: false,
          error: {
            type: ERROR_TYPES.BUILD_ERROR,
            message: performanceAnalysis.message,
            fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW
          },
          shouldDegrade: true,
          fallbackReason: performanceAnalysis.reason,
          metrics: { buildTime, memoryUsed }
        };
      }

      // Reset consecutive slow builds counter on success
      this.metrics.consecutiveSlowBuilds = 0;
      
      this._notifyListeners('treeBuildSuccess', { 
        buildTime, 
        memoryUsed, 
        suggestionsCount: suggestions.length,
        performanceScore: this.calculatePerformanceScore()
      });

      return {
        success: true,
        result,
        metrics: { buildTime, memoryUsed },
        performanceScore: this.calculatePerformanceScore()
      };

    } catch (error) {
      const buildTime = performance.now() - startTime;
      this.metrics.errorCount++;
      this.metrics.consecutiveSlowBuilds++;
      
      this._notifyListeners('treeBuildError', { error, buildTime });

      // Check error rate for auto fallback
      const errorRate = this.metrics.errorCount / this.metrics.totalOperations;
      if (errorRate > this.config.autoFallbackThresholds.errorRate) {
        this.triggerAutoFallback('error_rate', { errorRate });
      }

      return {
        success: false,
        error: {
          type: ERROR_TYPES.BUILD_ERROR,
          message: error.message || 'Tree building failed',
          fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW,
          originalError: error
        },
        shouldDegrade: true,
        fallbackReason: 'build_error',
        metrics: { buildTime }
      };
    }
  }

  /**
   * Checks conditions before attempting tree build
   * @private
   * @param {Array} suggestions - Suggestions array
   * @returns {Object} Pre-build check result
   */
  checkPreBuildConditions(suggestions) {
    // Check suggestion count
    if (suggestions.length > this.config.maxSuggestions) {
      return {
        allowed: false,
        reason: 'suggestion_count',
        error: {
          type: ERROR_TYPES.BUILD_ERROR,
          message: `Too many suggestions (${suggestions.length}). Maximum allowed: ${this.config.maxSuggestions}`,
          fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW
        }
      };
    }

    // Check cooldown period
    if (this._isInCooldown()) {
      return {
        allowed: false,
        reason: 'cooldown',
        error: {
          type: ERROR_TYPES.BUILD_ERROR,
          message: 'Tree view temporarily disabled due to performance issues',
          fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW
        }
      };
    }

    // Check consecutive slow builds
    if (this.metrics.consecutiveSlowBuilds >= this.config.autoFallbackThresholds.consecutiveSlowBuilds) {
      return {
        allowed: false,
        reason: 'consecutive_slow_builds',
        error: {
          type: ERROR_TYPES.BUILD_ERROR,
          message: 'Tree view disabled due to consecutive slow builds',
          fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW
        }
      };
    }

    return { allowed: true };
  }

  /**
   * Analyzes performance metrics to determine if fallback is needed
   * @private
   * @param {number} buildTime - Build time in milliseconds
   * @param {number} memoryUsed - Memory used in bytes
   * @returns {Object} Performance analysis result
   */
  analyzePerformance(buildTime, memoryUsed) {
    const analysis = {
      shouldFallback: false,
      reason: null,
      message: null,
      score: 100
    };

    // Check build time threshold
    if (buildTime > this.config.treeBuildTimeThreshold) {
      this.metrics.consecutiveSlowBuilds++;
      analysis.shouldFallback = true;
      analysis.reason = 'slow_build_time';
      analysis.message = `Tree building took too long (${Math.round(buildTime)}ms). Switching to list view.`;
      analysis.score -= 30;
    }

    // Check memory usage threshold
    if (memoryUsed > this.config.memoryThreshold) {
      analysis.shouldFallback = true;
      analysis.reason = 'high_memory_usage';
      analysis.message = `Tree building used too much memory (${Math.round(memoryUsed / 1024 / 1024)}MB). Switching to list view.`;
      analysis.score -= 40;
    }

    // Check average build time
    const avgBuildTime = this._getAverageMetric('treeBuildTimes');
    if (avgBuildTime > this.config.autoFallbackThresholds.averageBuildTimeThreshold) {
      analysis.shouldFallback = true;
      analysis.reason = 'average_build_time';
      analysis.message = `Average build time too high (${Math.round(avgBuildTime)}ms). Switching to list view.`;
      analysis.score -= 25;
    }

    return analysis;
  }

  /**
   * Triggers automatic fallback and records the event
   * @private
   * @param {string} trigger - Trigger type
   * @param {Object} data - Additional data
   */
  triggerAutoFallback(trigger, data) {
    const fallbackEvent = {
      trigger,
      timestamp: Date.now(),
      data,
      performanceScore: this.calculatePerformanceScore()
    };
    
    this.metrics.fallbackTriggers.push(fallbackEvent);
    this.metrics.lastDegradation = Date.now();
    this.metrics.degradationCount++;
    
    // Keep only last 10 fallback events
    if (this.metrics.fallbackTriggers.length > 10) {
      this.metrics.fallbackTriggers = this.metrics.fallbackTriggers.slice(-10);
    }
    
    this._notifyListeners('autoFallback', fallbackEvent);
  }

  /**
   * Calculates overall performance score (0-100)
   * @returns {number} Performance score
   */
  calculatePerformanceScore() {
    let score = 100;
    
    // Deduct for slow builds
    const avgBuildTime = this._getAverageMetric('treeBuildTimes');
    if (avgBuildTime > this.config.treeBuildTimeThreshold) {
      score -= Math.min(30, (avgBuildTime / this.config.treeBuildTimeThreshold - 1) * 30);
    }
    
    // Deduct for memory growth
    const recentGrowth = this.metrics.memoryGrowthHistory.slice(-5);
    if (recentGrowth.length > 0) {
      const avgGrowth = recentGrowth.reduce((sum, g) => sum + g.growthRate, 0) / recentGrowth.length;
      if (avgGrowth > 0.1) {
        score -= Math.min(25, avgGrowth * 100);
      }
    }
    
    // Deduct for errors
    const errorRate = this.metrics.errorCount / Math.max(1, this.metrics.totalOperations);
    score -= errorRate * 100;
    
    // Deduct for recent fallbacks
    const recentFallbacks = this.metrics.fallbackTriggers.filter(
      f => Date.now() - f.timestamp < 60000 // Last minute
    );
    score -= recentFallbacks.length * 10;
    
    this.metrics.performanceScore = Math.max(0, Math.round(score));
    return this.metrics.performanceScore;
  }

  /**
   * Monitors bundle size impact
   * @param {number} bundleSize - Bundle size in bytes
   */
  monitorBundleSize(bundleSize) {
    this.metrics.bundleSize = bundleSize;
    
    if (bundleSize > this.config.bundleSizeThreshold) {
      this._notifyListeners('bundleSizeWarning', {
        size: bundleSize,
        threshold: this.config.bundleSizeThreshold,
        impact: 'Tree view components may affect loading performance'
      });
    }
  }

  /**
   * Creates performance regression tests
   * @returns {Array} Array of regression test results
   */
  createRegressionTests() {
    const tests = [];
    
    // Build time regression test
    const avgBuildTime = this._getAverageMetric('treeBuildTimes');
    tests.push({
      name: 'Tree Build Time',
      current: avgBuildTime,
      threshold: this.config.treeBuildTimeThreshold,
      passed: avgBuildTime <= this.config.treeBuildTimeThreshold,
      impact: avgBuildTime > this.config.treeBuildTimeThreshold ? 'high' : 'low'
    });
    
    // Memory usage regression test
    const recentMemory = this.metrics.memoryUsage.slice(-5);
    if (recentMemory.length > 1) {
      const memoryTrend = recentMemory[recentMemory.length - 1].usage - recentMemory[0].usage;
      tests.push({
        name: 'Memory Usage Trend',
        current: memoryTrend,
        threshold: this.config.memoryThreshold,
        passed: memoryTrend <= this.config.memoryThreshold,
        impact: memoryTrend > this.config.memoryThreshold ? 'high' : 'low'
      });
    }
    
    // Error rate regression test
    const errorRate = this.metrics.errorCount / Math.max(1, this.metrics.totalOperations);
    tests.push({
      name: 'Error Rate',
      current: errorRate,
      threshold: this.config.autoFallbackThresholds.errorRate,
      passed: errorRate <= this.config.autoFallbackThresholds.errorRate,
      impact: errorRate > this.config.autoFallbackThresholds.errorRate ? 'high' : 'low'
    });
    
    return tests;
  }

  /**
   * Gets comprehensive performance report
   * @returns {Object} Performance report
   */
  getPerformanceReport() {
    const report = {
      timestamp: Date.now(),
      performanceScore: this.calculatePerformanceScore(),
      metrics: {
        ...this.metrics,
        averageBuildTime: this._getAverageMetric('treeBuildTimes'),
        averageRenderTime: this._getAverageMetric('renderTimes'),
        errorRate: this.metrics.errorCount / Math.max(1, this.metrics.totalOperations),
        memoryGrowthRate: this.getMemoryGrowthRate()
      },
      thresholds: this.config,
      regressionTests: this.createRegressionTests(),
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  /**
   * Generates performance recommendations
   * @private
   * @returns {Array} Array of recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const avgBuildTime = this._getAverageMetric('treeBuildTimes');
    const errorRate = this.metrics.errorCount / Math.max(1, this.metrics.totalOperations);
    
    if (avgBuildTime > this.config.treeBuildTimeThreshold) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Consider implementing tree node virtualization or reducing suggestion count',
        metric: 'buildTime'
      });
    }
    
    if (errorRate > 0.05) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'High error rate detected. Review tree building logic and error handling',
        metric: 'errorRate'
      });
    }
    
    if (this.metrics.bundleSize > this.config.bundleSizeThreshold) {
      recommendations.push({
        type: 'bundle',
        priority: 'medium',
        message: 'Consider code splitting or lazy loading for tree components',
        metric: 'bundleSize'
      });
    }
    
    const memoryGrowthRate = this.getMemoryGrowthRate();
    if (memoryGrowthRate > 0.15) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: 'Memory usage growing rapidly. Check for memory leaks in tree components',
        metric: 'memoryGrowth'
      });
    }
    
    return recommendations;
  }

  /**
   * Gets current memory growth rate
   * @returns {number} Memory growth rate
   */
  getMemoryGrowthRate() {
    const recent = this.metrics.memoryGrowthHistory.slice(-5);
    if (recent.length === 0) return 0;
    
    return recent.reduce((sum, g) => sum + g.growthRate, 0) / recent.length;
  }

  /**
   * Cleanup method
   */
  destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    
    this.listeners.clear();
  }

  // ... (include all the private methods from the original PerformanceMonitor)
  
  _getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  _getAverageMetric(metricName) {
    const values = this.metrics[metricName];
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  _trimMetrics(metricName) {
    const maxLength = 20;
    if (this.metrics[metricName].length > maxLength) {
      this.metrics[metricName] = this.metrics[metricName].slice(-maxLength);
    }
  }

  _isInCooldown() {
    if (this.metrics.lastDegradation === 0) return false;
    return (Date.now() - this.metrics.lastDegradation) < this.config.degradationCooldown;
  }

  _notifyListeners(eventType, data) {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, data);
      } catch (error) {
        console.error('Error in performance monitor listener:', error);
      }
    });
  }

  addListener(listener) {
    this.listeners.add(listener);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }
}

/**
 * Default advanced performance monitor instance
 */
export const advancedPerformanceMonitor = new AdvancedPerformanceMonitor();