import { EnhancedTransitionManager, AnimationUtils } from './enhancedAnimations.js';

// Mock performance APIs
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => [])
};

describe('Enhanced Animations Performance Tests', () => {
  let transitionManager;
  let mockElements;

  beforeEach(() => {
    transitionManager = new EnhancedTransitionManager();
    
    // Create multiple mock elements for performance testing
    mockElements = Array.from({ length: 100 }, (_, i) => ({
      id: `element-${i}`,
      style: {},
      offsetHeight: 100,
      scrollHeight: 200,
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn()
      },
      setAttribute: jest.fn(),
      hasAttribute: jest.fn(() => false),
      getBoundingClientRect: () => ({
        top: 100 + i * 50,
        left: 100,
        bottom: 120 + i * 50,
        right: 200,
        width: 100,
        height: 20
      })
    }));

    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    transitionManager.cancelAllAnimations();
  });

  describe('Memory Management', () => {
    it('cleans up animations properly', async () => {
      // Start multiple animations
      const promises = mockElements.slice(0, 10).map(element =>
        transitionManager.animateExpandCollapse(element, true, { duration: 100 })
      );

      // Check that animations are tracked
      expect(transitionManager.activeAnimations.size).toBeGreaterThan(0);

      // Complete animations
      jest.advanceTimersByTime(100);
      await Promise.all(promises);

      // Check that animations are cleaned up
      expect(transitionManager.activeAnimations.size).toBe(0);
    });

    it('cancels animations without memory leaks', () => {
      // Start animations
      mockElements.slice(0, 20).forEach(element => {
        transitionManager.animateExpandCollapse(element, true, { duration: 1000 });
      });

      const initialSize = transitionManager.activeAnimations.size;
      expect(initialSize).toBe(20);

      // Cancel all animations
      transitionManager.cancelAllAnimations();

      // Verify cleanup
      expect(transitionManager.activeAnimations.size).toBe(0);
      expect(cancelAnimationFrame).toHaveBeenCalledTimes(initialSize);
    });

    it('handles rapid animation start/stop cycles', () => {
      const element = mockElements[0];

      // Rapidly start and cancel animations
      for (let i = 0; i < 50; i++) {
        transitionManager.animateExpandCollapse(element, i % 2 === 0, { duration: 100 });
        if (i % 5 === 0) {
          transitionManager.cancelAnimation(element);
        }
      }

      // Should not accumulate animations
      expect(transitionManager.activeAnimations.size).toBeLessThanOrEqual(1);
    });
  });

  describe('Performance Monitoring', () => {
    it('tracks animation performance metrics', () => {
      const metrics = transitionManager.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('totalAnimations');
      expect(metrics).toHaveProperty('averageFrameTime');
      expect(metrics).toHaveProperty('droppedFrames');
      expect(metrics).toHaveProperty('memoryUsage');
    });

    it('records frame times correctly', () => {
      const monitor = transitionManager.performanceMonitor;
      
      // Record some frame times
      monitor.recordFrameTime(10);
      monitor.recordFrameTime(20);
      monitor.recordFrameTime(30);
      
      const metrics = monitor.getMetrics();
      expect(metrics.averageFrameTime).toBe(20);
    });

    it('counts dropped frames correctly', () => {
      const monitor = transitionManager.performanceMonitor;
      
      // Record frame times (> 16.67ms are considered dropped)
      monitor.recordFrameTime(10); // Good frame
      monitor.recordFrameTime(20); // Dropped frame
      monitor.recordFrameTime(25); // Dropped frame
      
      const metrics = monitor.getMetrics();
      expect(metrics.droppedFrames).toBe(2);
    });

    it('limits frame time history', () => {
      const monitor = transitionManager.performanceMonitor;
      
      // Record more frame times than the limit
      for (let i = 0; i < 150; i++) {
        monitor.recordFrameTime(16);
      }
      
      expect(monitor.frameTimes.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Concurrent Animation Limits', () => {
    it('handles many concurrent animations efficiently', async () => {
      const startTime = performance.now();
      
      // Start many animations concurrently
      const promises = mockElements.map(element =>
        transitionManager.animateExpandCollapse(element, true, { duration: 50 })
      );

      // Complete all animations
      jest.advanceTimersByTime(50);
      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (this is a rough check)
      expect(duration).toBeLessThan(1000); // 1 second max
    });

    it('maintains performance with staggered animations', async () => {
      const elements = mockElements.slice(0, 20);
      
      const startTime = performance.now();
      
      await AnimationUtils.staggerAnimation(
        elements,
        (element) => transitionManager.animateSelection(element, { duration: 50 }),
        10 // 10ms stagger
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete efficiently
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Animation Batching', () => {
    it('batches similar animations efficiently', async () => {
      const elements = mockElements.slice(0, 10);
      
      // Start similar animations at the same time
      const promises = elements.map(element =>
        transitionManager.animateHover(element, true, { scale: 1.05 })
      );

      // All should start without significant delay
      expect(transitionManager.activeAnimations.size).toBeLessThanOrEqual(elements.length);
    });

    it('handles mixed animation types efficiently', async () => {
      const elements = mockElements.slice(0, 15);
      
      const promises = [];
      
      // Mix different animation types
      elements.forEach((element, index) => {
        if (index % 3 === 0) {
          promises.push(transitionManager.animateExpandCollapse(element, true, { duration: 100 }));
        } else if (index % 3 === 1) {
          promises.push(transitionManager.animateSelection(element, { duration: 100 }));
        } else {
          transitionManager.animateHover(element, true);
        }
      });

      jest.advanceTimersByTime(100);
      await Promise.all(promises.filter(p => p instanceof Promise));

      // Should handle mixed types without issues
      expect(transitionManager.activeAnimations.size).toBe(0);
    });
  });

  describe('Resource Cleanup', () => {
    it('cleans up event listeners and timers', () => {
      const element = mockElements[0];
      
      // Start animation
      transitionManager.animateExpandCollapse(element, true, { duration: 100 });
      
      // Cancel before completion
      transitionManager.cancelAnimation(element);
      
      // Advance time to ensure no lingering effects
      jest.advanceTimersByTime(200);
      
      expect(transitionManager.activeAnimations.has(element)).toBe(false);
    });

    it('handles element removal during animation', () => {
      const element = mockElements[0];
      
      // Start animation
      transitionManager.animateExpandCollapse(element, true, { duration: 100 });
      
      // Simulate element removal by nullifying references
      element.style = null;
      
      // Should not throw errors
      expect(() => {
        transitionManager.cancelAnimation(element);
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles null elements gracefully', async () => {
      const promises = [
        transitionManager.animateExpandCollapse(null, true),
        transitionManager.animateSelection(null),
        transitionManager.smoothScrollToElement(null)
      ];

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('handles invalid animation options', async () => {
      const element = mockElements[0];
      
      // Test with invalid duration
      const promise1 = transitionManager.animateExpandCollapse(element, true, {
        duration: -100
      });
      
      // Test with invalid easing
      const promise2 = transitionManager.animateExpandCollapse(element, true, {
        easing: 'invalid-easing'
      });

      await expect(Promise.all([promise1, promise2])).resolves.toBeDefined();
    });

    it('maintains performance under stress conditions', async () => {
      // Simulate stress conditions
      const stressElements = Array.from({ length: 500 }, (_, i) => ({
        ...mockElements[0],
        id: `stress-${i}`
      }));

      const startTime = performance.now();

      // Start many animations rapidly
      const promises = stressElements.map((element, index) => {
        if (index % 2 === 0) {
          return transitionManager.animateExpandCollapse(element, true, { duration: 10 });
        } else {
          return transitionManager.animateSelection(element, { duration: 10 });
        }
      });

      jest.advanceTimersByTime(10);
      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle stress without excessive delay
      expect(duration).toBeLessThan(2000); // 2 seconds max
      expect(transitionManager.activeAnimations.size).toBe(0);
    });
  });

  describe('Animation Quality', () => {
    it('maintains smooth frame rates', () => {
      const monitor = transitionManager.performanceMonitor;
      
      // Simulate good performance
      for (let i = 0; i < 60; i++) {
        monitor.recordFrameTime(16.67); // 60fps
      }
      
      const metrics = monitor.getMetrics();
      expect(metrics.averageFrameTime).toBeCloseTo(16.67, 1);
      expect(metrics.droppedFrames).toBe(0);
    });

    it('detects performance degradation', () => {
      const monitor = transitionManager.performanceMonitor;
      
      // Simulate poor performance
      for (let i = 0; i < 30; i++) {
        monitor.recordFrameTime(33.33); // 30fps - all dropped frames
      }
      
      const metrics = monitor.getMetrics();
      expect(metrics.droppedFrames).toBe(30);
      expect(metrics.averageFrameTime).toBeCloseTo(33.33, 1);
    });
  });
});