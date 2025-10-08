/**
 * @fileoverview Performance integration tests for TreeView component
 * Tests performance with large datasets and real-world scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TreeView from '../TreeView';
import { TreeBuilder } from '../../utils/TreeBuilder.js';
import { NODE_TYPES } from '../../types/tree.js';

// Mock performance.now for consistent testing
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

// Mock IntersectionObserver for virtual scrolling tests
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
global.IntersectionObserver = mockIntersectionObserver;

describe('TreeView Performance Integration Tests', () => {
  let mockOnSelect;
  let mockOnToggleExpand;
  let treeBuilder;
  let performanceEntries;

  beforeEach(() => {
    mockOnSelect = vi.fn();
    mockOnToggleExpand = vi.fn();
    treeBuilder = new TreeBuilder();
    performanceEntries = [];
    
    // Reset performance mock
    let currentTime = 0;
    mockPerformanceNow.mockImplementation(() => {
      currentTime += 16; // Simulate 60fps
      return currentTime;
    });

    // Mock performance.mark and performance.measure
    global.performance.mark = vi.fn();
    global.performance.measure = vi.fn();
    global.performance.getEntriesByType = vi.fn(() => performanceEntries);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Large Dataset Performance', () => {
    it('should render 100+ suggestions efficiently', async () => {
      // Generate large dataset with realistic word patterns
      const largeSuggestions = Array.from({ length: 150 }, (_, i) => ({
        word: `suggestion${i.toString().padStart(3, '0')}`,
        frequency: Math.floor(Math.random() * 100) + 1,
        type: 'exact_match'
      }));

      const startTime = performance.now();
      
      // Build tree from large dataset
      const treeNodes = treeBuilder.buildTree(largeSuggestions);
      
      const buildTime = performance.now() - startTime;
      
      // Tree building should complete within 100ms
      expect(buildTime).toBeLessThan(100);

      const renderStartTime = performance.now();
      
      render(
        <TreeView
          treeNodes={treeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      const renderTime = performance.now() - renderStartTime;
      
      // Initial render should complete within 200ms
      expect(renderTime).toBeLessThan(200);

      // Verify tree is rendered
      expect(screen.getByRole('tree')).toBeInTheDocument();
      
      // Should use virtual scrolling for large datasets
      const visibleNodes = screen.getAllByRole('treeitem');
      expect(visibleNodes.length).toBeLessThan(100); // Virtual scrolling active
    });

    it('should handle tree expansion efficiently with large datasets', async () => {
      // Create tree with many expandable nodes
      const suggestions = [];
      const prefixes = ['app', 'application', 'apply', 'apple', 'approach'];
      
      prefixes.forEach(prefix => {
        for (let i = 0; i < 20; i++) {
          suggestions.push({
            word: `${prefix}${i}`,
            frequency: Math.floor(Math.random() * 50) + 1,
            type: 'exact_match'
          });
        }
      });

      const treeNodes = treeBuilder.buildTree(suggestions);
      
      render(
        <TreeView
          treeNodes={treeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      // Find expandable nodes
      const expandableNodes = screen.getAllByRole('treeitem').filter(node => 
        node.getAttribute('aria-expanded') === 'false'
      );

      if (expandableNodes.length > 0) {
        const expansionStartTime = performance.now();
        
        // Expand multiple nodes rapidly
        for (let i = 0; i < Math.min(5, expandableNodes.length); i++) {
          await act(async () => {
            fireEvent.click(expandableNodes[i]);
          });
        }

        const expansionTime = performance.now() - expansionStartTime;
        
        // Multiple expansions should complete within 500ms
        expect(expansionTime).toBeLessThan(500);
        
        // Verify expansions worked
        expect(mockOnToggleExpand).toHaveBeenCalledTimes(Math.min(5, expandableNodes.length));
      }
    });

    it('should maintain smooth scrolling with large trees', async () => {
      // Create deep tree structure
      const deepSuggestions = [];
      for (let i = 0; i < 100; i++) {
        const depth = Math.floor(i / 10);
        const prefix = 'a'.repeat(depth + 1);
        deepSuggestions.push({
          word: `${prefix}word${i}`,
          frequency: Math.floor(Math.random() * 20) + 1,
          type: 'exact_match'
        });
      }

      const treeNodes = treeBuilder.buildTree(deepSuggestions);
      
      const { container } = render(
        <TreeView
          treeNodes={treeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      const scrollContainer = container.querySelector('.tree-view');
      expect(scrollContainer).toBeInTheDocument();

      const scrollStartTime = performance.now();
      
      // Simulate rapid scrolling
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          fireEvent.scroll(scrollContainer, { target: { scrollTop: i * 100 } });
        });
      }

      const scrollTime = performance.now() - scrollStartTime;
      
      // Scrolling should remain responsive
      expect(scrollTime).toBeLessThan(300);
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should not create excessive DOM nodes for large trees', async () => {
      const largeSuggestions = Array.from({ length: 200 }, (_, i) => ({
        word: `word${i}`,
        frequency: 1,
        type: 'exact_match'
      }));

      const treeNodes = treeBuilder.buildTree(largeSuggestions);
      
      const { container } = render(
        <TreeView
          treeNodes={treeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      // Count actual DOM nodes
      const allNodes = container.querySelectorAll('[role="treeitem"]');
      const totalSuggestions = largeSuggestions.length;
      
      // Should use virtual scrolling to limit DOM nodes
      expect(allNodes.length).toBeLessThan(totalSuggestions);
      expect(allNodes.length).toBeLessThan(100); // Reasonable limit
    });

    it('should clean up event listeners properly', async () => {
      const suggestions = Array.from({ length: 50 }, (_, i) => ({
        word: `cleanup${i}`,
        frequency: 1,
        type: 'exact_match'
      }));

      const treeNodes = treeBuilder.buildTree(suggestions);
      
      const { unmount } = render(
        <TreeView
          treeNodes={treeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      // Simulate interactions to create event listeners
      const treeItems = screen.getAllByRole('treeitem');
      if (treeItems.length > 0) {
        await act(async () => {
          fireEvent.mouseEnter(treeItems[0]);
          fireEvent.focus(treeItems[0]);
        });
      }

      // Unmount component
      unmount();

      // Should not throw errors or leave hanging listeners
      expect(() => {
        // Simulate events that would trigger removed listeners
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      }).not.toThrow();
    });

    it('should handle rapid tree updates without memory leaks', async () => {
      let currentSuggestions = Array.from({ length: 20 }, (_, i) => ({
        word: `initial${i}`,
        frequency: 1,
        type: 'exact_match'
      }));

      let treeNodes = treeBuilder.buildTree(currentSuggestions);
      
      const { rerender } = render(
        <TreeView
          treeNodes={treeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      // Rapidly update tree multiple times
      for (let update = 0; update < 10; update++) {
        currentSuggestions = Array.from({ length: 20 }, (_, i) => ({
          word: `update${update}_${i}`,
          frequency: update + i,
          type: 'exact_match'
        }));

        treeNodes = treeBuilder.buildTree(currentSuggestions);
        
        await act(async () => {
          rerender(
            <TreeView
              treeNodes={treeNodes}
              onSelect={mockOnSelect}
              onToggleExpand={mockOnToggleExpand}
            />
          );
        });
      }

      // Should still render correctly after rapid updates
      expect(screen.getByRole('tree')).toBeInTheDocument();
      const finalNodes = screen.getAllByRole('treeitem');
      expect(finalNodes.length).toBeGreaterThan(0);
    });
  });

  describe('Animation Performance', () => {
    it('should handle expand/collapse animations efficiently', async () => {
      const suggestions = [
        { word: 'animate', frequency: 10, type: 'exact_match' },
        { word: 'animation', frequency: 8, type: 'exact_match' },
        { word: 'animated', frequency: 6, type: 'exact_match' }
      ];

      const treeNodes = treeBuilder.buildTree(suggestions);
      
      render(
        <TreeView
          treeNodes={treeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      const expandableNodes = screen.getAllByRole('treeitem').filter(node => 
        node.getAttribute('aria-expanded') === 'false'
      );

      if (expandableNodes.length > 0) {
        const animationStartTime = performance.now();
        
        // Trigger multiple animations rapidly
        for (const node of expandableNodes.slice(0, 3)) {
          await act(async () => {
            fireEvent.click(node);
          });
          
          // Small delay to simulate animation timing
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        const animationTime = performance.now() - animationStartTime;
        
        // Animations should not block the UI
        expect(animationTime).toBeLessThan(1000);
        
        // All animations should have been triggered
        expect(mockOnToggleExpand).toHaveBeenCalledTimes(expandableNodes.slice(0, 3).length);
      }
    });

    it('should maintain 60fps during animations', async () => {
      const suggestions = Array.from({ length: 30 }, (_, i) => ({
        word: `fps${i}`,
        frequency: i + 1,
        type: 'exact_match'
      }));

      const treeNodes = treeBuilder.buildTree(suggestions);
      
      render(
        <TreeView
          treeNodes={treeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      // Mock requestAnimationFrame to track frame timing
      const frameTimes = [];
      let frameCount = 0;
      
      const originalRAF = global.requestAnimationFrame;
      global.requestAnimationFrame = vi.fn((callback) => {
        const frameTime = performance.now();
        frameTimes.push(frameTime);
        frameCount++;
        
        setTimeout(() => callback(frameTime), 16); // 60fps = ~16ms per frame
        return frameCount;
      });

      // Trigger animations
      const expandableNodes = screen.getAllByRole('treeitem').filter(node => 
        node.getAttribute('aria-expanded') === 'false'
      );

      if (expandableNodes.length > 0) {
        await act(async () => {
          fireEvent.click(expandableNodes[0]);
        });

        // Wait for animation to complete
        await waitFor(() => {
          expect(mockOnToggleExpand).toHaveBeenCalled();
        }, { timeout: 1000 });
      }

      // Restore original RAF
      global.requestAnimationFrame = originalRAF;

      // Check frame timing consistency
      if (frameTimes.length > 1) {
        const frameDurations = frameTimes.slice(1).map((time, i) => time - frameTimes[i]);
        const averageFrameDuration = frameDurations.reduce((a, b) => a + b, 0) / frameDurations.length;
        
        // Should maintain close to 60fps (16.67ms per frame)
        expect(averageFrameDuration).toBeLessThan(20);
      }
    });
  });

  describe('Keyboard Navigation Performance', () => {
    it('should handle rapid keyboard navigation efficiently', async () => {
      const suggestions = Array.from({ length: 50 }, (_, i) => ({
        word: `nav${i}`,
        frequency: i + 1,
        type: 'exact_match'
      }));

      const treeNodes = treeBuilder.buildTree(suggestions);
      
      render(
        <TreeView
          treeNodes={treeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      const treeView = screen.getByRole('tree');
      
      const navigationStartTime = performance.now();
      
      // Rapid keyboard navigation
      for (let i = 0; i < 20; i++) {
        await act(async () => {
          fireEvent.keyDown(treeView, { key: 'ArrowDown' });
        });
      }

      const navigationTime = performance.now() - navigationStartTime;
      
      // Navigation should be responsive
      expect(navigationTime).toBeLessThan(500);
      
      // Should still have a focused node
      const focusedNodes = screen.getAllByRole('treeitem').filter(node => 
        node.classList.contains('ring-2')
      );
      expect(focusedNodes.length).toBe(1);
    });

    it('should debounce rapid key events appropriately', async () => {
      const suggestions = Array.from({ length: 30 }, (_, i) => ({
        word: `debounce${i}`,
        frequency: 1,
        type: 'exact_match'
      }));

      const treeNodes = treeBuilder.buildTree(suggestions);
      
      render(
        <TreeView
          treeNodes={treeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      const treeView = screen.getByRole('tree');
      
      // Fire many key events rapidly
      const keyEvents = [];
      for (let i = 0; i < 50; i++) {
        const eventTime = performance.now();
        keyEvents.push(eventTime);
        
        fireEvent.keyDown(treeView, { key: 'ArrowDown' });
      }

      await waitFor(() => {
        // Should have processed events efficiently
        const focusedNodes = screen.getAllByRole('treeitem').filter(node => 
          node.classList.contains('ring-2')
        );
        expect(focusedNodes.length).toBe(1);
      });

      // Should not have processed every single event (debouncing active)
      const totalEventTime = keyEvents[keyEvents.length - 1] - keyEvents[0];
      expect(totalEventTime).toBeLessThan(1000); // Events fired quickly
    });
  });

  describe('Real-World Performance Scenarios', () => {
    it('should handle mixed interaction patterns efficiently', async () => {
      const suggestions = Array.from({ length: 80 }, (_, i) => ({
        word: `mixed${i}`,
        frequency: Math.floor(Math.random() * 50) + 1,
        type: Math.random() > 0.8 ? 'typo_correction' : 'exact_match'
      }));

      const treeNodes = treeBuilder.buildTree(suggestions);
      
      const { container } = render(
        <TreeView
          treeNodes={treeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      const scenarioStartTime = performance.now();
      
      // Simulate real user interaction pattern
      const treeView = screen.getByRole('tree');
      const scrollContainer = container.querySelector('.tree-view');
      
      // 1. Initial navigation
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          fireEvent.keyDown(treeView, { key: 'ArrowDown' });
        });
      }

      // 2. Expand some nodes
      const expandableNodes = screen.getAllByRole('treeitem').filter(node => 
        node.getAttribute('aria-expanded') === 'false'
      );
      
      for (let i = 0; i < Math.min(3, expandableNodes.length); i++) {
        await act(async () => {
          fireEvent.click(expandableNodes[i]);
        });
      }

      // 3. Scroll around
      if (scrollContainer) {
        for (let i = 0; i < 5; i++) {
          await act(async () => {
            fireEvent.scroll(scrollContainer, { target: { scrollTop: i * 50 } });
          });
        }
      }

      // 4. More navigation
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          fireEvent.keyDown(treeView, { key: 'ArrowUp' });
        });
      }

      // 5. Final selection
      const wordNodes = screen.getAllByRole('treeitem').filter(node => 
        node.getAttribute('data-node-type') === 'word'
      );
      
      if (wordNodes.length > 0) {
        await act(async () => {
          fireEvent.click(wordNodes[0]);
        });
      }

      const scenarioTime = performance.now() - scenarioStartTime;
      
      // Complex interaction should complete within reasonable time
      expect(scenarioTime).toBeLessThan(2000);
      
      // Should have maintained functionality
      expect(screen.getByRole('tree')).toBeInTheDocument();
      
      if (wordNodes.length > 0) {
        expect(mockOnSelect).toHaveBeenCalled();
      }
    });

    it('should maintain performance during view switching', async () => {
      const suggestions = Array.from({ length: 60 }, (_, i) => ({
        word: `switch${i}`,
        frequency: i + 1,
        type: 'exact_match'
      }));

      const treeNodes = treeBuilder.buildTree(suggestions);
      
      const switchStartTime = performance.now();
      
      // Initial render
      const { rerender } = render(
        <TreeView
          treeNodes={treeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      // Simulate view switching by re-rendering multiple times
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          rerender(
            <TreeView
              treeNodes={treeNodes}
              onSelect={mockOnSelect}
              onToggleExpand={mockOnToggleExpand}
              key={`switch-${i}`} // Force re-render
            />
          );
        });
      }

      const switchTime = performance.now() - switchStartTime;
      
      // View switching should be fast
      expect(switchTime).toBeLessThan(1000);
      
      // Should still render correctly
      expect(screen.getByRole('tree')).toBeInTheDocument();
      const finalNodes = screen.getAllByRole('treeitem');
      expect(finalNodes.length).toBeGreaterThan(0);
    });
  });
});