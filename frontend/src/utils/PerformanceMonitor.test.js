/**
 * @fileoverview Tests for PerformanceMonitor utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor } from './PerformanceMonitor';
import { ERROR_TYPES, FALLBACK_ACTIONS } from '../types/tree';

// Mock performance.now and performance.memory
const mockPerformance = {
  now: vi.fn(),
  memory: {
    usedJSHeapSize: 10 * 1024 * 1024 // 10MB
  }
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

describe('PerformanceMonitor', () => {
  let performanceMonitor;
  let mockListener;
  let timeCounter;

  beforeEach(() => {
    timeCounter = 0;
    mockPerformance.now.mockImplementation(() => {
      timeCounter += 50; // Each call advances by 50ms
      return timeCounter;
    });
    
    performanceMonitor = new PerformanceMonitor({
      treeBuildTimeThreshold: 200,
      renderTimeThreshold: 100,
      memoryThreshold: 50 * 1024 * 1024,
      maxSuggestions: 100,
      degradationCooldown: 1000
    });
    
    mockListener = vi.fn();
  });

  afterEach(() => {
    performanceMonitor.removeListener(mockListener);
    vi.clearAllMocks();
  });

  describe('Tree Build Monitoring', () => {
    it('monitors successful tree build', async () => {
      const mockBuildFunction = vi.fn().mockResolvedValue(['node1', 'node2']);
      const suggestions = [{ word: 'test' }];

      const result = await performanceMonitor.monitorTreeBuild(mockBuildFunction, suggestions);

      expect(result.success).toBe(true);
      expect(result.result).toEqual(['node1', 'node2']);
      expect(result.metrics.buildTime).toBe(50); // Based on mock
      expect(mockBuildFunction).toHaveBeenCalled();
    });

    it('rejects when too many suggestions', async () => {
      const mockBuildFunction = vi.fn();
      const suggestions = new Array(150).fill({ word: 'test' }); // Exceeds maxSuggestions

      const result = await performanceMonitor.monitorTreeBuild(mockBuildFunction, suggestions);

      expect(result.success).toBe(false);
      expect(result.shouldDegrade).toBe(true);
      expect(result.error.type).toBe(ERROR_TYPES.BUILD_ERROR);
      expect(result.error.message).toContain('Too many suggestions');
      expect(mockBuildFunction).not.toHaveBeenCalled();
    });

    it('handles build function errors', async () => {
      const mockBuildFunction = vi.fn().mockRejectedValue(new Error('Build failed'));
      const suggestions = [{ word: 'test' }];

      const result = await performanceMonitor.monitorTreeBuild(mockBuildFunction, suggestions);

      expect(result.success).toBe(false);
      expect(result.shouldDegrade).toBe(true);
      expect(result.error.type).toBe(ERROR_TYPES.BUILD_ERROR);
      expect(result.error.originalError.message).toBe('Build failed');
    });

    it('degrades performance when build time exceeds threshold', async () => {
      // Mock slow build time
      timeCounter = 0;
      mockPerformance.now.mockImplementation(() => {
        timeCounter += 250; // Exceeds 200ms threshold
        return timeCounter;
      });

      const mockBuildFunction = vi.fn().mockResolvedValue(['node1']);
      const suggestions = [{ word: 'test' }];

      const result = await performanceMonitor.monitorTreeBuild(mockBuildFunction, suggestions);

      expect(result.success).toBe(false);
      expect(result.shouldDegrade).toBe(true);
      expect(result.error.message).toContain('took too long');
    });

    it('degrades performance when memory usage exceeds threshold', async () => {
      // Mock high memory usage
      const originalMemory = mockPerformance.memory.usedJSHeapSize;
      mockPerformance.memory.usedJSHeapSize = 100 * 1024 * 1024; // 100MB

      const mockBuildFunction = vi.fn().mockImplementation(() => {
        mockPerformance.memory.usedJSHeapSize = 200 * 1024 * 1024; // 200MB after build
        return ['node1'];
      });
      const suggestions = [{ word: 'test' }];

      const result = await performanceMonitor.monitorTreeBuild(mockBuildFunction, suggestions);

      expect(result.success).toBe(false);
      expect(result.shouldDegrade).toBe(true);

      // Restore original memory
      mockPerformance.memory.usedJSHeapSize = originalMemory;
    });

    it('notifies listeners on successful build', async () => {
      performanceMonitor.addListener(mockListener);
      const mockBuildFunction = vi.fn().mockResolvedValue(['node1']);
      const suggestions = [{ word: 'test' }];

      await performanceMonitor.monitorTreeBuild(mockBuildFunction, suggestions);

      expect(mockListener).toHaveBeenCalledWith('treeBuildSuccess', {
        buildTime: expect.any(Number),
        memoryUsed: expect.any(Number),
        suggestionsCount: 1
      });
    });

    it('notifies listeners on build error', async () => {
      performanceMonitor.addListener(mockListener);
      const mockBuildFunction = vi.fn().mockRejectedValue(new Error('Build failed'));
      const suggestions = [{ word: 'test' }];

      await performanceMonitor.monitorTreeBuild(mockBuildFunction, suggestions);

      expect(mockListener).toHaveBeenCalledWith('treeBuildError', {
        error: expect.any(Error),
        buildTime: expect.any(Number)
      });
    });
  });

  describe('Render Monitoring', () => {
    it('monitors successful render', async () => {
      const mockRenderFunction = vi.fn().mockResolvedValue('rendered');

      const result = await performanceMonitor.monitorRender(mockRenderFunction);

      expect(result.success).toBe(true);
      expect(result.result).toBe('rendered');
      expect(result.metrics.renderTime).toBe(50);
    });

    it('handles render function errors', async () => {
      const mockRenderFunction = vi.fn().mockRejectedValue(new Error('Render failed'));

      const result = await performanceMonitor.monitorRender(mockRenderFunction);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe(ERROR_TYPES.RENDER_ERROR);
      expect(result.error.originalError.message).toBe('Render failed');
    });

    it('notifies listeners on slow render', async () => {
      performanceMonitor.addListener(mockListener);
      
      // Mock slow render time
      timeCounter = 0;
      mockPerformance.now.mockImplementation(() => {
        timeCounter += 150; // Exceeds 100ms threshold
        return timeCounter;
      });

      const mockRenderFunction = vi.fn().mockResolvedValue('rendered');

      await performanceMonitor.monitorRender(mockRenderFunction);

      expect(mockListener).toHaveBeenCalledWith('slowRender', {
        renderTime: 150
      });
    });
  });

  describe('Tree View Availability', () => {
    it('allows tree view when conditions are met', () => {
      const result = performanceMonitor.checkTreeViewAvailability(50);

      expect(result.available).toBe(true);
      expect(result.reason).toContain('Performance metrics within acceptable range');
    });

    it('disallows tree view when too many suggestions', () => {
      const result = performanceMonitor.checkTreeViewAvailability(150);

      expect(result.available).toBe(false);
      expect(result.reason).toContain('Too many suggestions');
      expect(result.fallbackAction).toBe(FALLBACK_ACTIONS.USE_LIST_VIEW);
    });

    it('disallows tree view during cooldown period', async () => {
      // Trigger degradation by exceeding build time threshold
      timeCounter = 0;
      mockPerformance.now.mockImplementation(() => {
        timeCounter += 300; // Exceeds 200ms threshold
        return timeCounter;
      });

      const mockBuildFunction = vi.fn().mockResolvedValue(['node']);
      await performanceMonitor.monitorTreeBuild(mockBuildFunction, [{ word: 'test' }]);

      const result = performanceMonitor.checkTreeViewAvailability(10);

      expect(result.available).toBe(false);
      expect(result.reason).toContain('temporarily disabled');
    });

    it('disallows tree view when recent builds are slow', async () => {
      // Add multiple slow build times
      performanceMonitor.metrics.treeBuildTimes = [250, 300, 280]; // All exceed 200ms threshold

      const result = performanceMonitor.checkTreeViewAvailability(10);

      expect(result.available).toBe(false);
      expect(result.reason).toContain('Recent tree builds too slow');
    });
  });

  describe('Metrics Management', () => {
    it('returns current metrics', () => {
      performanceMonitor.metrics.treeBuildTimes = [100, 150, 200];
      performanceMonitor.metrics.renderTimes = [50, 75];
      performanceMonitor.metrics.errorCount = 2;

      const metrics = performanceMonitor.getMetrics();

      expect(metrics.treeBuildTimes).toEqual([100, 150, 200]);
      expect(metrics.renderTimes).toEqual([50, 75]);
      expect(metrics.errorCount).toBe(2);
      expect(metrics.averageBuildTime).toBe(150);
      expect(metrics.averageRenderTime).toBe(62.5);
      expect(metrics.isInCooldown).toBe(false);
    });

    it('resets metrics', () => {
      performanceMonitor.addListener(mockListener);
      performanceMonitor.metrics.treeBuildTimes = [100, 150];
      performanceMonitor.metrics.errorCount = 5;

      performanceMonitor.resetMetrics();

      expect(performanceMonitor.metrics.treeBuildTimes).toEqual([]);
      expect(performanceMonitor.metrics.errorCount).toBe(0);
      expect(mockListener).toHaveBeenCalledWith('metricsReset', undefined);
    });

    it('trims metrics arrays to prevent memory leaks', async () => {
      // Add more than 10 build times
      for (let i = 0; i < 15; i++) {
        const mockBuildFunction = vi.fn().mockResolvedValue(['node']);
        await performanceMonitor.monitorTreeBuild(mockBuildFunction, [{ word: 'test' }]);
      }

      expect(performanceMonitor.metrics.treeBuildTimes.length).toBe(10);
    });
  });

  describe('Listener Management', () => {
    it('adds and removes listeners', () => {
      performanceMonitor.addListener(mockListener);
      
      // Trigger an event
      performanceMonitor.resetMetrics();
      expect(mockListener).toHaveBeenCalled();

      mockListener.mockClear();
      performanceMonitor.removeListener(mockListener);
      
      // Trigger another event
      performanceMonitor.resetMetrics();
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('handles listener errors gracefully', () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      performanceMonitor.addListener(errorListener);
      performanceMonitor.addListener(mockListener);
      
      performanceMonitor.resetMetrics();
      
      expect(consoleSpy).toHaveBeenCalledWith('Error in performance monitor listener:', expect.any(Error));
      expect(mockListener).toHaveBeenCalled(); // Other listeners should still work
      
      consoleSpy.mockRestore();
    });
  });

  describe('Degradation and Cooldown', () => {
    it('records degradation events', async () => {
      performanceMonitor.addListener(mockListener);
      
      // Trigger degradation with slow build
      timeCounter = 0;
      mockPerformance.now.mockImplementation(() => {
        timeCounter += 300; // Exceeds threshold
        return timeCounter;
      });

      const mockBuildFunction = vi.fn().mockResolvedValue(['node']);
      await performanceMonitor.monitorTreeBuild(mockBuildFunction, [{ word: 'test' }]);

      expect(mockListener).toHaveBeenCalledWith('performanceDegradation', {
        count: 1,
        timestamp: expect.any(Number)
      });
    });

    it('enforces cooldown period', async () => {
      // Trigger degradation by exceeding build time threshold
      timeCounter = 0;
      mockPerformance.now.mockImplementation(() => {
        timeCounter += 300; // Exceeds 200ms threshold
        return timeCounter;
      });

      const mockBuildFunction = vi.fn().mockResolvedValue(['node']);
      await performanceMonitor.monitorTreeBuild(mockBuildFunction, [{ word: 'test' }]);

      // Check availability during cooldown
      const result = performanceMonitor.checkTreeViewAvailability(10);
      expect(result.available).toBe(false);

      // Check metrics show cooldown
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.isInCooldown).toBe(true);
      expect(metrics.cooldownRemaining).toBeGreaterThan(0);
    });
  });

  describe('Memory Usage Handling', () => {
    it('handles missing performance.memory gracefully', async () => {
      const originalMemory = mockPerformance.memory;
      delete mockPerformance.memory;

      const mockBuildFunction = vi.fn().mockResolvedValue(['node']);
      const result = await performanceMonitor.monitorTreeBuild(mockBuildFunction, [{ word: 'test' }]);

      expect(result.success).toBe(true);
      expect(result.metrics.memoryUsed).toBe(0);

      // Restore memory
      mockPerformance.memory = originalMemory;
    });
  });
});