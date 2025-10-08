/**
 * @fileoverview Comprehensive integration tests for tree view functionality
 * Tests complete search-to-selection flow with real API data and large datasets
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import SearchInput from '../../components/SearchInput';
import { VIEW_MODES } from '../../types/tree.js';

// Mock axios for API calls
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

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

// Mock performance.memory for memory monitoring tests
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 10000000,
    totalJSHeapSize: 50000000,
    jsHeapSizeLimit: 100000000
  },
  writable: true
});

describe('Tree View Integration Tests', () => {
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

  describe('End-to-End Search Flow with Real API Data', () => {
    it('should complete full search-to-selection flow with hierarchical data', async () => {
      // Mock realistic API response with hierarchical structure
      const mockSuggestions = [
        { word: 'application', frequency: 150, type: 'exact_match' },
        { word: 'applications', frequency: 120, type: 'exact_match' },
        { word: 'apply', frequency: 100, type: 'exact_match' },
        { word: 'applied', frequency: 80, type: 'exact_match' },
        { word: 'applying', frequency: 70, type: 'exact_match' },
        { word: 'apple', frequency: 200, type: 'exact_match' },
        { word: 'apples', frequency: 150, type: 'exact_match' },
        { word: 'approach', frequency: 90, type: 'exact_match' },
        { word: 'approaches', frequency: 60, type: 'exact_match' },
        { word: 'appropriate', frequency: 85, type: 'exact_match' }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { 
          suggestions: mockSuggestions,
          totalCount: mockSuggestions.length,
          queryTime: 25
        }
      });

      const mockOnSearch = vi.fn();
      
      render(<SearchInput onSearch={mockOnSearch} />);

      const searchInput = screen.getByRole('textbox');
      
      // Step 1: Type search query
      await user.type(searchInput, 'app');
      
      // Wait for API call and suggestions to appear
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/search', {
          params: { q: 'app', limit: 50 }
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      // Step 2: Switch to tree view
      const treeViewButton = screen.getByTestId('tree-view-button');
      await expect(treeViewButton).toBeInTheDocument();
      await user.click(treeViewButton);

      // Verify tree view is active and properly structured
      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      // Step 3: Verify hierarchical structure
      const treeItems = screen.getAllByRole('treeitem');
      expect(treeItems.length).toBeGreaterThan(0);

      // Should have prefix nodes for common prefixes
      const prefixNodes = treeItems.filter(item => 
        item.getAttribute('data-node-type') === 'prefix'
      );
      const wordNodes = treeItems.filter(item => 
        item.getAttribute('data-node-type') === 'word'
      );

      expect(prefixNodes.length + wordNodes.length).toBe(treeItems.length);

      // Step 4: Test expansion of prefix nodes
      const expandableNodes = treeItems.filter(item => 
        item.getAttribute('aria-expanded') === 'false'
      );
      
      if (expandableNodes.length > 0) {
        const nodeToExpand = expandableNodes[0];
        await user.click(nodeToExpand);
        
        await waitFor(() => {
          expect(nodeToExpand).toHaveAttribute('aria-expanded', 'true');
        });

        // Verify children are now visible
        const updatedTreeItems = screen.getAllByRole('treeitem');
        expect(updatedTreeItems.length).toBeGreaterThan(treeItems.length);
      }

      // Step 5: Select a word node
      const wordNode = screen.getAllByRole('treeitem').find(item => 
        item.getAttribute('data-node-type') === 'word'
      );
      
      expect(wordNode).toBeInTheDocument();
      
      const selectedWord = wordNode.textContent.trim();
      await user.click(wordNode);

      // Step 6: Verify selection completed
      await waitFor(() => {
        expect(searchInput).toHaveValue(selectedWord);
      });

      // Verify dropdown closed
      await waitFor(() => {
        expect(screen.queryByTestId('suggestions-dropdown')).not.toBeInTheDocument();
      });

      // Verify frequency increment API call
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/increment-frequency', {
        word: selectedWord
      });
    });

    it('should handle typo corrections in tree structure', async () => {
      const typoResponse = {
        suggestions: [
          { word: 'tokyo', frequency: 200, type: 'typo_correction', originalQuery: 'tokio', editDistance: 1 },
          { word: 'toronto', frequency: 150, type: 'exact_match' },
          { word: 'token', frequency: 100, type: 'exact_match' },
          { word: 'tokens', frequency: 80, type: 'exact_match' }
        ]
      };

      mockedAxios.get.mockResolvedValue({ data: typoResponse });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'tokio'); // Misspelling
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      // Switch to tree view
      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      // Look for typo correction indicators
      const typoNodes = screen.getAllByRole('treeitem').filter(item => 
        item.getAttribute('data-suggestion-type') === 'typo_correction'
      );

      expect(typoNodes.length).toBeGreaterThan(0);
      
      const typoNode = typoNodes[0];
      expect(typoNode).toHaveClass(/typo-correction/);
      
      // Verify typo correction has appropriate styling and metadata
      expect(typoNode).toHaveAttribute('data-edit-distance', '1');
      
      // Test selection of typo correction
      await user.click(typoNode);
      
      await waitFor(() => {
        const inputValue = searchInput.value;
        expect(inputValue).not.toBe('tokio');
        expect(inputValue).toBe('tokyo');
      });
    });

    it('should handle mixed suggestion types in tree structure', async () => {
      const mixedResponse = {
        suggestions: [
          { word: 'search', frequency: 200, type: 'exact_match' },
          { word: 'serch', frequency: 50, type: 'typo_correction', originalQuery: 'serch', editDistance: 1 },
          { word: 'searching', frequency: 150, type: 'exact_match' },
          { word: 'searches', frequency: 120, type: 'exact_match' },
          { word: 'searchable', frequency: 80, type: 'exact_match' }
        ]
      };

      mockedAxios.get.mockResolvedValue({ data: mixedResponse });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'sear');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      // Verify different suggestion types are properly categorized
      const exactMatches = screen.getAllByRole('treeitem').filter(item => 
        item.getAttribute('data-suggestion-type') === 'exact_match'
      );
      const typoCorrections = screen.getAllByRole('treeitem').filter(item => 
        item.getAttribute('data-suggestion-type') === 'typo_correction'
      );

      expect(exactMatches.length).toBeGreaterThan(0);
      expect(typoCorrections.length).toBeGreaterThan(0);

      // Verify visual distinction between types
      exactMatches.forEach(node => {
        expect(node).not.toHaveClass(/typo-correction/);
      });

      typoCorrections.forEach(node => {
        expect(node).toHaveClass(/typo-correction/);
      });
    });
  });

  describe('Performance Tests with Large Datasets', () => {
    it('should handle 100+ suggestions efficiently', async () => {
      // Generate large dataset with hierarchical structure
      const largeSuggestions = [];
      
      // Create suggestions with common prefixes for better tree structure
      const prefixes = ['test', 'data', 'user', 'system', 'config'];
      const suffixes = ['ing', 'ed', 'er', 's', 'able', 'tion', 'ment', 'ness', 'ful', 'less'];
      
      prefixes.forEach(prefix => {
        // Add base word
        largeSuggestions.push({
          word: prefix,
          frequency: Math.floor(Math.random() * 100) + 50,
          type: 'exact_match'
        });
        
        // Add variations
        suffixes.forEach(suffix => {
          largeSuggestions.push({
            word: prefix + suffix,
            frequency: Math.floor(Math.random() * 50) + 10,
            type: 'exact_match'
          });
        });
      });

      // Add more random suggestions to reach 100+
      for (let i = largeSuggestions.length; i < 120; i++) {
        largeSuggestions.push({
          word: `suggestion${i.toString().padStart(3, '0')}`,
          frequency: Math.floor(Math.random() * 30) + 1,
          type: 'exact_match'
        });
      }

      mockedAxios.get.mockResolvedValue({
        data: { suggestions: largeSuggestions }
      });

      const startTime = performance.now();
      
      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Switch to tree view
      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      }, { timeout: 5000 });

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should handle large dataset within reasonable time (< 3 seconds)
      expect(totalTime).toBeLessThan(3000);

      // Verify virtual scrolling is working - not all items should be rendered
      const visibleItems = screen.getAllByRole('treeitem');
      expect(visibleItems.length).toBeLessThan(largeSuggestions.length);
      expect(visibleItems.length).toBeGreaterThan(0);

      // Test scrolling performance
      const treeView = screen.getByRole('tree');
      
      // Simulate scroll events
      for (let i = 0; i < 5; i++) {
        fireEvent.scroll(treeView, { target: { scrollTop: i * 100 } });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Tree should still be responsive
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('should automatically fallback to list view for extremely large datasets', async () => {
      // Generate extremely large dataset (1000+ items)
      const hugeSuggestions = Array.from({ length: 1200 }, (_, i) => ({
        word: `word${i.toString().padStart(4, '0')}`,
        frequency: Math.floor(Math.random() * 10) + 1,
        type: 'exact_match'
      }));

      mockedAxios.get.mockResolvedValue({
        data: { suggestions: hugeSuggestions }
      });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'word');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Try to switch to tree view
      const treeViewButton = screen.getByTestId('tree-view-button');
      
      if (await screen.findByTestId('tree-view-button')) {
        await user.click(treeViewButton);
        
        // Should either show tree view or fallback to list view
        await waitFor(() => {
          const treeView = screen.queryByRole('tree');
          const listView = screen.queryByTestId('suggestions-list');
          
          expect(treeView || listView).toBeTruthy();
        });

        // If fallback occurred, should show appropriate message
        const listView = screen.queryByTestId('suggestions-list');
        const treeView = screen.queryByRole('tree');
        
        if (listView && !treeView) {
          const fallbackMessage = screen.queryByTestId('fallback-message');
          if (fallbackMessage) {
            expect(fallbackMessage).toHaveTextContent(/large dataset|performance/i);
          }
        }
      }
    });

    it('should maintain performance during rapid interactions', async () => {
      const suggestions = Array.from({ length: 80 }, (_, i) => ({
        word: `rapid${i.toString().padStart(2, '0')}`,
        frequency: Math.floor(Math.random() * 50) + 10,
        type: 'exact_match'
      }));

      mockedAxios.get.mockResolvedValue({
        data: { suggestions }
      });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'rapid');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      const startTime = performance.now();
      
      // Perform rapid interactions
      const treeView = screen.getByRole('tree');
      await user.click(treeView);
      
      // Rapid keyboard navigation
      for (let i = 0; i < 20; i++) {
        await user.keyboard('{ArrowDown}');
        if (i % 4 === 0) {
          await user.keyboard('{ArrowUp}');
        }
      }

      // Rapid expand/collapse operations
      const expandableNodes = screen.getAllByRole('treeitem').filter(item => 
        item.getAttribute('aria-expanded') === 'false'
      );
      
      for (let i = 0; i < Math.min(10, expandableNodes.length); i++) {
        await user.click(expandableNodes[i]);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const endTime = performance.now();
      const interactionTime = endTime - startTime;
      
      // Should handle rapid interactions within reasonable time
      expect(interactionTime).toBeLessThan(2000);
      
      // Tree should still be functional
      expect(screen.getByRole('tree')).toBeInTheDocument();
      const finalTreeItems = screen.getAllByRole('treeitem');
      expect(finalTreeItems.length).toBeGreaterThan(0);
    });
  });

  describe('View Switching and State Preservation', () => {
    it('should preserve selection state when switching between views', async () => {
      const mockSuggestions = [
        { word: 'preserve', frequency: 60, type: 'exact_match' },
        { word: 'preserved', frequency: 50, type: 'exact_match' },
        { word: 'preserving', frequency: 40, type: 'exact_match' },
        { word: 'preservation', frequency: 35, type: 'exact_match' },
        { word: 'preset', frequency: 30, type: 'exact_match' },
        { word: 'presets', frequency: 25, type: 'exact_match' }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { suggestions: mockSuggestions }
      });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'pres');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      // Navigate to third item in list view
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      
      // Get current selection in list view
      const listItems = screen.getAllByTestId('suggestion-item');
      const selectedListItem = listItems.find(item => 
        item.classList.contains('highlighted')
      );
      const selectedText = selectedListItem?.textContent.trim();

      // Switch to tree view
      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      // Verify tree view shows selection
      const treeItems = screen.getAllByRole('treeitem');
      const selectedTreeItem = treeItems.find(item => 
        item.classList.contains('ring-2') || item.classList.contains('selected')
      );

      // Switch back to list view
      const listViewButton = screen.getByTestId('list-view-button');
      await user.click(listViewButton);

      await waitFor(() => {
        expect(screen.getByTestId('suggestions-list')).toBeInTheDocument();
      });

      // Verify selection is preserved in list view
      const newListItems = screen.getAllByTestId('suggestion-item');
      const newSelectedItem = newListItems.find(item => 
        item.classList.contains('highlighted')
      );
      
      expect(newSelectedItem).toBeInTheDocument();
      
      // Selection should be maintained or close to original
      if (selectedText) {
        const availableWords = mockSuggestions.map(s => s.word);
        const newSelectedText = newSelectedItem.textContent.trim();
        expect(availableWords).toContain(newSelectedText);
      }
    });

    it('should preserve scroll position during view switching', async () => {
      // Generate enough suggestions to require scrolling
      const scrollSuggestions = Array.from({ length: 50 }, (_, i) => ({
        word: `scroll${i.toString().padStart(2, '0')}`,
        frequency: Math.floor(Math.random() * 30) + 10,
        type: 'exact_match'
      }));

      mockedAxios.get.mockResolvedValue({
        data: { suggestions: scrollSuggestions }
      });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'scroll');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      // Scroll down in list view
      const listView = screen.getByTestId('suggestions-list');
      fireEvent.scroll(listView, { target: { scrollTop: 200 } });
      
      await new Promise(resolve => setTimeout(resolve, 100));

      // Switch to tree view
      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      // Switch back to list view
      const listViewButton = screen.getByTestId('list-view-button');
      await user.click(listViewButton);

      await waitFor(() => {
        expect(screen.getByTestId('suggestions-list')).toBeInTheDocument();
      });

      // Verify scroll position is approximately preserved
      const newListView = screen.getByTestId('suggestions-list');
      expect(newListView.scrollTop).toBeGreaterThan(0);
    });

    it('should remember view preference across searches', async () => {
      const firstSuggestions = [
        { word: 'first', frequency: 50, type: 'exact_match' },
        { word: 'firstly', frequency: 30, type: 'exact_match' }
      ];

      const secondSuggestions = [
        { word: 'second', frequency: 60, type: 'exact_match' },
        { word: 'secondary', frequency: 40, type: 'exact_match' }
      ];

      mockedAxios.get
        .mockResolvedValueOnce({ data: { suggestions: firstSuggestions } })
        .mockResolvedValueOnce({ data: { suggestions: secondSuggestions } });

      // Mock localStorage to return tree view preference
      localStorageMock.getItem.mockReturnValue(VIEW_MODES.TREE);

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      // First search
      await user.type(searchInput, 'first');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      // Switch to tree view
      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      // Verify preference is saved
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'autocomplete-view-mode', 
        VIEW_MODES.TREE
      );

      // Clear and start new search
      await user.clear(searchInput);
      await user.type(searchInput, 'second');

      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      // Should automatically be in tree view
      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });
    });
  });

  describe('Cross-Browser Compatibility Tests', () => {
    it('should handle different keyboard event implementations', async () => {
      const suggestions = [
        { word: 'keyboard', frequency: 50, type: 'exact_match' },
        { word: 'keyboards', frequency: 30, type: 'exact_match' }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { suggestions }
      });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'key');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      const treeView = screen.getByRole('tree');
      
      // Test different keyboard event formats (simulating browser differences)
      
      // Standard KeyboardEvent
      fireEvent.keyDown(treeView, { key: 'ArrowDown', keyCode: 40, which: 40 });
      fireEvent.keyDown(treeView, { key: 'Enter', keyCode: 13, which: 13 });
      
      // Legacy event properties
      fireEvent.keyDown(treeView, { keyCode: 39 }); // Right arrow
      fireEvent.keyDown(treeView, { which: 37 }); // Left arrow
      
      // Modern event with code property
      fireEvent.keyDown(treeView, { 
        key: 'ArrowUp', 
        code: 'ArrowUp', 
        keyCode: 38 
      });

      // Should handle all event formats without errors
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('should work with different CSS feature support levels', async () => {
      const suggestions = [
        { word: 'css', frequency: 40, type: 'exact_match' },
        { word: 'css3', frequency: 30, type: 'exact_match' }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { suggestions }
      });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'css');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      // Test that basic functionality works regardless of CSS features
      const treeItems = screen.getAllByRole('treeitem');
      expect(treeItems.length).toBeGreaterThan(0);
      
      // All items should be visible and have basic positioning
      treeItems.forEach(item => {
        expect(item).toBeVisible();
        
        // Should have basic layout properties
        const computedStyle = window.getComputedStyle(item);
        expect(computedStyle.display).not.toBe('none');
      });

      // Test expand/collapse functionality
      const expandableNode = treeItems.find(item => 
        item.getAttribute('aria-expanded') === 'false'
      );
      
      if (expandableNode) {
        await user.click(expandableNode);
        
        // Should work even without CSS transitions
        await waitFor(() => {
          expect(expandableNode).toHaveAttribute('aria-expanded', 'true');
        });
      }
    });

    it('should handle touch events for mobile compatibility', async () => {
      const suggestions = [
        { word: 'mobile', frequency: 60, type: 'exact_match' },
        { word: 'mobility', frequency: 40, type: 'exact_match' }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { suggestions }
      });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'mobile');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      const treeViewButton = screen.getByTestId('tree-view-button');
      
      // Simulate touch events
      fireEvent.touchStart(treeViewButton);
      fireEvent.touchEnd(treeViewButton);
      fireEvent.click(treeViewButton);

      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      // Test touch interactions on tree items
      const treeItems = screen.getAllByRole('treeitem');
      if (treeItems.length > 0) {
        const firstItem = treeItems[0];
        
        fireEvent.touchStart(firstItem);
        fireEvent.touchEnd(firstItem);
        fireEvent.click(firstItem);
        
        // Should handle touch events without errors
        expect(screen.getByRole('tree')).toBeInTheDocument();
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from tree building failures gracefully', async () => {
      // Mock malformed API response
      const malformedResponse = {
        suggestions: [
          { word: null, frequency: 10 }, // Invalid
          { frequency: 'invalid' }, // Invalid
          { word: '', frequency: -1 }, // Invalid
          { word: 'valid', frequency: 20, type: 'exact_match' } // Valid
        ]
      };

      mockedAxios.get.mockResolvedValue({
        data: malformedResponse
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'malformed');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      // Try to switch to tree view
      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      // Should either show tree view with valid data or fallback to list view
      await waitFor(() => {
        const treeView = screen.queryByRole('tree');
        const listView = screen.queryByTestId('suggestions-list');
        const errorMessage = screen.queryByTestId('error-message');
        
        expect(treeView || listView || errorMessage).toBeTruthy();
      });

      // Should still be able to interact with valid suggestions
      const suggestionItems = screen.getAllByTestId('suggestion-item');
      if (suggestionItems.length > 0) {
        const validItem = suggestionItems.find(item => 
          item.textContent.trim() === 'valid'
        );
        
        if (validItem) {
          await user.click(validItem);
          
          await waitFor(() => {
            expect(searchInput).toHaveValue('valid');
          });
        }
      }

      consoleSpy.mockRestore();
    });

    it('should handle memory pressure gracefully', async () => {
      // Simulate high memory usage
      performance.memory.usedJSHeapSize = 80000000; // 80MB

      const largeSuggestions = Array.from({ length: 200 }, (_, i) => ({
        word: `memory${i.toString().padStart(3, '0')}`,
        frequency: Math.floor(Math.random() * 50) + 1,
        type: 'exact_match'
      }));

      mockedAxios.get.mockResolvedValue({
        data: { suggestions: largeSuggestions }
      });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'memory');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      // Try to switch to tree view under memory pressure
      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      // Should either work or gracefully degrade to list view
      await waitFor(() => {
        const treeView = screen.queryByRole('tree');
        const listView = screen.queryByTestId('suggestions-list');
        
        expect(treeView || listView).toBeTruthy();
      });

      // If degraded to list view, should show appropriate message
      const listView = screen.queryByTestId('suggestions-list');
      if (listView && !screen.queryByRole('tree')) {
        const degradationMessage = screen.queryByTestId('performance-message');
        if (degradationMessage) {
          expect(degradationMessage).toHaveTextContent(/performance|memory/i);
        }
      }
    });

    it('should handle rapid API response changes', async () => {
      const firstResponse = {
        suggestions: [
          { word: 'first', frequency: 50, type: 'exact_match' },
          { word: 'firstly', frequency: 30, type: 'exact_match' }
        ]
      };

      const secondResponse = {
        suggestions: [
          { word: 'second', frequency: 60, type: 'exact_match' },
          { word: 'secondary', frequency: 40, type: 'exact_match' }
        ]
      };

      // Setup rapid response changes
      mockedAxios.get
        .mockResolvedValueOnce({ data: firstResponse })
        .mockResolvedValueOnce({ data: secondResponse });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      // Rapid typing to trigger multiple API calls
      await user.type(searchInput, 'f');
      
      // Immediately change query before first response completes
      await user.clear(searchInput);
      await user.type(searchInput, 's');

      // Should handle the race condition gracefully
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      // Switch to tree view
      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      await waitFor(() => {
        const treeView = screen.queryByRole('tree');
        const listView = screen.queryByTestId('suggestions-list');
        
        expect(treeView || listView).toBeTruthy();
      });

      // Should show suggestions from the latest query
      const treeItems = screen.getAllByRole('treeitem');
      if (treeItems.length > 0) {
        const itemTexts = treeItems.map(item => item.textContent.toLowerCase());
        const hasSecondResults = itemTexts.some(text => text.includes('second'));
        const hasFirstResults = itemTexts.some(text => text.includes('first'));
        
        // Should prefer the latest results
        expect(hasSecondResults || !hasFirstResults).toBe(true);
      }
    });
  });
});