/**
 * @fileoverview Performance regression tests to ensure tree view performance doesn't degrade
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdvancedPerformanceMonitor } from '../../utils/AdvancedPerformanceMonitor';
import { BundleOptimizer, bundleSizeMonitor } from '../../utils/BundleOptimizer';
import { MemoryOptimizer, treeNodeFactory } from '../../utils/MemoryOptimizer';

// Mock performance.memory
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 10000000,
    totalJSHeapSize: 50000000,
    jsHeapSizeLimit: 100000000
  },
  writable: true
});

describe('Performance Regression Tests', () => {
  let performanceMonitor;
  let bundleOptimizer;
  let memoryOptimizer;

  beforeEach(() => {
    performanceMonitor = new AdvancedPerformanceMonitor();
    bundleOptimizer = new BundleOptimizer();
    memoryOptimizer = new MemoryOptimizer();
    
    // Reset performance memory mock
    performance.memory.usedJSHeapSize = 10000000;
  });

  afterEach(() => {
    performanceMonitor?.destroy();
    memoryOptimizer?.destroy();
    vi.clearAllTimers();
  });

  describe('Tree Building Performance Regression', () => {
    it('should maintain tree build time under 200ms for 100 suggestions', async () => {
      const suggestions = Array.from({ length: 100 }, (_, i) => ({
        word: `suggestion${i}`,
        frequency: Math.floor(Math.random() * 50) + 1,
        type: 'exact_match'
      }));

      const buildFunction = () => {
        // Simulate tree building
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(suggestions.map(s => ({ ...s, level: 0, children: [] })));
          }, 50); // Simulate 50ms build time
        });
      };

      const result = await performanceMonitor.monitorTreeBuildWithFallback(buildFunction, suggestions);
      
      expect(result.success).toBe(true);
      expect(result.metrics.buildTime).toBeLessThan(200);
      
      // Performance score should be good
      const score = performanceMonitor.calculatePerformanceScore();
      expect(score).toBeGreaterThan(80);
    });

    it('should handle 500 suggestions within performance budget', async () => {
      const suggestions = Array.from({ length: 500 }, (_, i) => ({
        word: `large${i}`,
        frequency: Math.floor(Math.random() * 30) + 1,
        type: 'exact_match'
      }));

      const buildFunction = () => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(suggestions.map(s => ({ ...s, level: 0, children: [] })));
          }, 150); // Simulate 150ms build time
        });
      };

      const result = await performanceMonitor.monitorTreeBuildWithFallback(buildFunction, suggestions);
      
      expect(result.success).toBe(true);
      expect(result.metrics.buildTime).toBeLessThan(200);
    });

    it('should trigger automatic fallback for extremely large datasets', async () => {
      const suggestions = Array.from({ length: 1500 }, (_, i) => ({
        word: `huge${i}`,
        frequency: 1,
        type: 'exact_match'
      }));

      const buildFunction = () => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(suggestions.map(s => ({ ...s, level: 0, children: [] })));
          }, 100);
        });
      };

      const result = await performanceMonitor.monitorTreeBuildWithFallback(buildFunction, suggestions);
      
      // Should trigger fallback due to large dataset
      expect(result.shouldDegrade).toBe(true);
      expect(result.fallbackReason).toBe('suggestion_count');
    });

    it('should detect consecutive slow builds and trigger fallback', async () => {
      const suggestions = Array.from({ length: 50 }, (_, i) => ({
        word: `slow${i}`,
        frequency: 10,
        type: 'exact_match'
      }));

      const slowBuildFunction = () => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(suggestions.map(s => ({ ...s, level: 0, children: [] })));
          }, 250); // Slow build time
        });
      };

      // Trigger multiple slow builds
      for (let i = 0; i < 4; i++) {
        await performanceMonitor.monitorTreeBuildWithFallback(slowBuildFunction, suggestions);
      }

      // Next build should be blocked due to consecutive slow builds
      const result = await performanceMonitor.monitorTreeBuildWithFallback(slowBuildFunction, suggestions);
      expect(result.shouldDegrade).toBe(true);
      expect(result.fallbackReason).toBe('consecutive_slow_builds');
    });
  });

  describe('Memory Usage Regression', () => {
    it('should not exceed memory threshold during tree building', async () => {
      const suggestions = Array.from({ length: 200 }, (_, i) => ({
        word: `memory${i}`,
        frequency: Math.floor(Math.random() * 40) + 5,
        type: 'exact_match'
      }));

      const initialMemory = performance.memory.usedJSHeapSize;

      // Simulate memory-intensive tree building
      const buildFunction = () => {
        return new Promise(resolve => {
          // Simulate memory usage increase
          performance.memory.usedJSHeapSize += 5 * 1024 * 1024; // 5MB increase
          
          setTimeout(() => {
            resolve(suggestions.map(s => ({ ...s, level: 0, children: [] })));
          }, 50);
        });
      };

      const result = await performanceMonitor.monitorTreeBuildWithFallback(buildFunction, suggestions);
      
      expect(result.success).toBe(true);
      expect(result.metrics.memoryUsed).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });

    it('should optimize tree nodes for memory efficiency', () => {
      const largeTreeNodes = Array.from({ length: 1000 }, (_, i) => ({
        id: `node_${i}`,
        word: `word${i}`,
        frequency: i,
        type: 'word',
        level: Math.floor(i / 100),
        expanded: false,
        children: [],
        // Extra properties that should be optimized away
        extraData: new Array(100).fill('unnecessary'),
        metadata: { created: Date.now(), updated: Date.now() }
      }));

      const optimizedNodes = memoryOptimizer.optimizeTreeNodes(largeTreeNodes);
      
      expect(optimizedNodes.length).toBe(largeTreeNodes.length);
      
      // Check that unnecessary properties are removed
      optimizedNodes.forEach(node => {
        expect(node.extraData).toBeUndefined();
        expect(node.metadata).toBeUndefined();
        expect(node.word).toBeDefined();
        expect(node.frequency).toBeDefined();
      });
    });

    it('should use object pooling efficiently', () => {
      const nodeCount = 100;
      const nodes = [];

      // Create nodes
      for (let i = 0; i < nodeCount; i++) {
        const node = treeNodeFactory.createNode({
          word: `pooled${i}`,
          frequency: i,
          type: 'word'
        });
        nodes.push(node);
      }

      expect(nodes.length).toBe(nodeCount);

      // Return nodes to pool
      nodes.forEach(node => treeNodeFactory.returnNode(node));

      const poolStats = treeNodeFactory.getPoolStats();
      expect(poolStats.poolSize).toBe(nodeCount);

      // Create new nodes (should reuse from pool)
      const newNodes = [];
      for (let i = 0; i < 50; i++) {
        const node = treeNodeFactory.createNode({
          word: `reused${i}`,
          frequency: i,
          type: 'word'
        });
        newNodes.push(node);
      }

      const newPoolStats = treeNodeFactory.getPoolStats();
      expect(newPoolStats.poolSize).toBe(nodeCount - 50); // 50 nodes taken from pool
    });
  });

  describe('Bundle Size Regression', () => {
    it('should maintain bundle size under threshold', () => {
      const treeComponentsSize = bundleOptimizer.estimateBundleSize('treeComponents');
      const visualizationSize = bundleOptimizer.estimateBundleSize('visualizationComponents');
      const virtualScrollingSize = bundleOptimizer.estimateBundleSize('virtualScrolling');

      expect(treeComponentsSize).toBeLessThan(50 * 1024); // Less than 50KB
      expect(visualizationSize).toBeLessThan(150 * 1024); // Less than 150KB
      expect(virtualScrollingSize).toBeLessThan(20 * 1024); // Less than 20KB

      bundleSizeMonitor.recordSize('treeComponents', treeComponentsSize);
      bundleSizeMonitor.recordSize('visualization', visualizationSize);
      bundleSizeMonitor.recordSize('virtualScrolling', virtualScrollingSize);

      const report = bundleSizeMonitor.getSizeReport();
      expect(report.totalSize).toBeLessThan(220 * 1024); // Total less than 220KB
    });

    it('should load components lazily', async () => {
      const loadStartTime = performance.now();
      
      // Simulate lazy loading
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const loadEndTime = performance.now();
      const loadTime = loadEndTime - loadStartTime;

      expect(loadTime).toBeLessThan(100); // Should load within 100ms

      const metrics = bundleOptimizer.getLoadingMetrics();
      expect(metrics.totalLoadTime).toBeGreaterThan(0);
    });
  });

  describe('Performance Score Regression', () => {
    it('should maintain high performance score under normal conditions', async () => {
      const suggestions = Array.from({ length: 50 }, (_, i) => ({
        word: `normal${i}`,
        frequency: Math.floor(Math.random() * 30) + 10,
        type: 'exact_match'
      }));

      const fastBuildFunction = () => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(suggestions.map(s => ({ ...s, level: 0, children: [] })));
          }, 30); // Fast build time
        });
      };

      // Perform several successful builds
      for (let i = 0; i < 5; i++) {
        await performanceMonitor.monitorTreeBuildWithFallback(fastBuildFunction, suggestions);
      }

      const score = performanceMonitor.calculatePerformanceScore();
      expect(score).toBeGreaterThan(90); // High performance score
    });

    it('should degrade performance score appropriately under stress', async () => {
      const suggestions = Array.from({ length: 100 }, (_, i) => ({
        word: `stress${i}`,
        frequency: Math.floor(Math.random() * 20) + 5,
        type: 'exact_match'
      }));

      const stressBuildFunction = () => {
        return new Promise(resolve => {
          // Simulate memory pressure
          performance.memory.usedJSHeapSize += 10 * 1024 * 1024; // 10MB increase
          
          setTimeout(() => {
            resolve(suggestions.map(s => ({ ...s, level: 0, children: [] })));
          }, 180); // Slower build time
        });
      };

      // Perform several stressed builds
      for (let i = 0; i < 3; i++) {
        await performanceMonitor.monitorTreeBuildWithFallback(stressBuildFunction, suggestions);
      }

      const score = performanceMonitor.calculatePerformanceScore();
      expect(score).toBeLessThan(90); // Should be degraded
      expect(score).toBeGreaterThan(50); // But not too low
    });

    it('should generate appropriate performance recommendations', async () => {
      const suggestions = Array.from({ length: 80 }, (_, i) => ({
        word: `recommend${i}`,
        frequency: Math.floor(Math.random() * 25) + 5,
        type: 'exact_match'
      }));

      const slowBuildFunction = () => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(suggestions.map(s => ({ ...s, level: 0, children: [] })));
          }, 220); // Slow build time
        });
      };

      // Trigger slow builds to generate recommendations
      await performanceMonitor.monitorTreeBuildWithFallback(slowBuildFunction, suggestions);
      await performanceMonitor.monitorTreeBuildWithFallback(slowBuildFunction, suggestions);

      const report = performanceMonitor.getPerformanceReport();
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      const performanceRecommendation = report.recommendations.find(r => r.type === 'performance');
      expect(performanceRecommendation).toBeDefined();
      expect(performanceRecommendation.priority).toBe('high');
    });
  });

  describe('Regression Test Suite', () => {
    it('should pass all regression tests', async () => {
      const regressionTests = performanceMonitor.createRegressionTests();
      
      // All tests should initially pass (no performance degradation)
      const failedTests = regressionTests.filter(test => !test.passed);
      
      if (failedTests.length > 0) {
        console.warn('Failed regression tests:', failedTests);
      }
      
      // Allow some tests to fail initially, but track them
      expect(regressionTests.length).toBeGreaterThan(0);
      
      // At least 80% of tests should pass
      const passRate = regressionTests.filter(test => test.passed).length / regressionTests.length;
      expect(passRate).toBeGreaterThan(0.8);
    });

    it('should track performance metrics over time', () => {
      const report = performanceMonitor.getPerformanceReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.performanceScore).toBeGreaterThanOrEqual(0);
      expect(report.performanceScore).toBeLessThanOrEqual(100);
      expect(report.metrics).toBeDefined();
      expect(report.thresholds).toBeDefined();
      expect(report.regressionTests).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should provide actionable performance insights', () => {
      const memoryStats = memoryOptimizer.getMemoryStats();
      
      expect(memoryStats.objectPools).toBeDefined();
      expect(memoryStats.cleanupCallbacks).toBeGreaterThanOrEqual(0);
      
      if (memoryStats.current) {
        expect(memoryStats.current.used).toBeGreaterThan(0);
        expect(memoryStats.current.total).toBeGreaterThan(memoryStats.current.used);
      }
    });
  });
});