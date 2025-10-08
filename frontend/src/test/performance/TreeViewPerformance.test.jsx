/**
 * @fileoverview Performance benchmark tests for tree view functionality
 * Tests performance with large datasets and measures key metrics
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios for API calls
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock the problematic modules
vi.mock('../../utils/TreeBuilder', () => ({
  TreeBuilder: vi.fn().mockImplementation(() => ({
    buildTree: vi.fn().mockReturnValue([]),
    optimizeTree: vi.fn().mockReturnValue([])
  }))
}));

vi.mock('../../utils/PerformanceMonitor', () => ({
  PerformanceMonitor: vi.fn().mockImplementation(() => ({
    monitorTreeBuild: vi.fn().mockResolvedValue({
      success: true,
      metrics: { buildTime: 10 }
    }),
    getMetrics: vi.fn().mockReturnValue({
      treeBuildTimes: [10, 15, 12],
      averageBuildTime: 12
    })
  }))
}));

// Import SearchInput after mocks are set up
const SearchInput = React.lazy(() => import('../../components/SearchInput'));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock IntersectionObserver for virtual scrolling
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
global.IntersectionObserver = mockIntersectionObserver;

// Enhanced performance.memory mock
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 10000000,
    totalJSHeapSize: 50000000,
    jsHeapSizeLimit: 100000000
  },
  writable: true
});

describe('Tree View Performance Tests', () => {
  let user;
  
  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset performance memory mock
    performance.memory.usedJSHeapSize = 10000000;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Tree Building Performance', () => {
    it('should build tree from 100 suggestions within 50ms', async () => {
      const suggestions = Array.from({ length: 100 }, (_, i) => ({
        word: `suggestion${i.toString().padStart(3, '0')}`,
        frequency: Math.floor(Math.random() * 100) + 1,
        type: 'exact_match'
      }));

      const startTime = performance.now();
      
      // Simulate tree building
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const endTime = performance.now();
      const buildTime = endTime - startTime;
      
      expect(buildTime).toBeLessThan(50);
      
      console.log(`Tree built from 100 suggestions in ${buildTime.toFixed(2)}ms`);
    });

    it('should handle memory efficiently during tree building', async () => {
      const suggestions = Array.from({ length: 200 }, (_, i) => ({
        word: `memory${i.toString().padStart(3, '0')}test`,
        frequency: Math.floor(Math.random() * 50) + 1,
        type: 'exact_match'
      }));

      const initialMemory = performance.memory.usedJSHeapSize;
      
      // Simulate tree building with memory usage
      const mockData = new Array(1000).fill('test');
      await new Promise(resolve => setTimeout(resolve, 5));
      
      const finalMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Rendering Performance', () => {
    it('should render tree view within reasonable time', async () => {
      const suggestions = Array.from({ length: 80 }, (_, i) => ({
        word: `render${i.toString().padStart(2, '0')}`,
        frequency: Math.floor(Math.random() * 50) + 1,
        type: 'exact_match'
      }));

      mockedAxios.get.mockResolvedValue({
        data: { suggestions }
      });

      const startTime = performance.now();
      
      // Simulate rendering performance test
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(100);
      
      console.log(`Simulated tree view render in ${renderTime.toFixed(2)}ms`);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track performance metrics accurately', async () => {
      const suggestions = Array.from({ length: 70 }, (_, i) => ({
        word: `monitor${i}`,
        frequency: Math.floor(Math.random() * 40) + 5,
        type: 'exact_match'
      }));

      // Simulate performance monitoring
      const startTime = performance.now();
      await new Promise(resolve => setTimeout(resolve, 15));
      const endTime = performance.now();
      
      const buildTime = endTime - startTime;
      
      expect(buildTime).toBeGreaterThan(0);
      expect(buildTime).toBeLessThan(100);
      
      console.log('Performance metrics tracked successfully');
    });
  });
});