/**
 * @fileoverview Comprehensive integration tests for complete search-to-selection flow
 * Tests the end-to-end functionality from search input to final selection
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

describe('Search to Selection Flow Integration Tests', () => {
  let user;
  
  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Complete Flow with Tree View', () => {
    it('should complete full search-to-selection flow in tree view', async () => {
      // Mock API response with tree-suitable data
      const mockSuggestions = [
        { word: 'apple', frequency: 100, type: 'exact_match' },
        { word: 'application', frequency: 80, type: 'exact_match' },
        { word: 'apply', frequency: 60, type: 'exact_match' },
        { word: 'approach', frequency: 40, type: 'exact_match' },
        { word: 'appropriate', frequency: 30, type: 'exact_match' }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { suggestions: mockSuggestions }
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
      await user.click(treeViewButton);

      // Verify tree view is active
      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      // Step 3: Navigate tree structure
      const treeItems = screen.getAllByRole('treeitem');
      expect(treeItems.length).toBeGreaterThan(0);

      // Step 4: Expand prefix node if present
      const expandableNode = treeItems.find(item => 
        item.getAttribute('aria-expanded') === 'false'
      );
      
      if (expandableNode) {
        await user.click(expandableNode);
        await waitFor(() => {
          expect(expandableNode).toHaveAttribute('aria-expanded', 'true');
        });
      }

      // Step 5: Select a word node
      const wordNode = treeItems.find(item => 
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

    it('should handle keyboard navigation in complete flow', async () => {
      const mockSuggestions = [
        { word: 'new', frequency: 50, type: 'exact_match' },
        { word: 'news', frequency: 40, type: 'exact_match' },
        { word: 'newton', frequency: 30, type: 'exact_match' },
        { word: 'network', frequency: 25, type: 'exact_match' }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { suggestions: mockSuggestions }
      });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      // Type search query
      await user.type(searchInput, 'new');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      // Switch to tree view using keyboard
      await user.keyboard('{Tab}'); // Focus view toggle
      await user.keyboard('{ArrowRight}'); // Switch to tree view
      
      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      // Navigate tree with keyboard
      const treeView = screen.getByRole('tree');
      await user.click(treeView); // Focus tree
      
      // Navigate down
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      
      // Verify navigation worked
      const focusedNodes = screen.getAllByRole('treeitem').filter(node => 
        node.classList.contains('ring-2') || node.matches(':focus')
      );
      expect(focusedNodes.length).toBe(1);

      // Select with Enter
      await user.keyboard('{Enter}');
      
      // Verify selection
      await waitFor(() => {
        expect(searchInput.value).toBeTruthy();
        expect(searchInput.value).not.toBe('new');
      });
    });

    it('should preserve selection state during view switching', async () => {
      const mockSuggestions = [
        { word: 'test', frequency: 60, type: 'exact_match' },
        { word: 'testing', frequency: 50, type: 'exact_match' },
        { word: 'tester', frequency: 40, type: 'exact_match' },
        { word: 'tests', frequency: 35, type: 'exact_match' }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { suggestions: mockSuggestions }
      });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      // Navigate to second item in list view
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      
      // Get current selection
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

      // Switch back to list view
      const listViewButton = screen.getByTestId('list-view-button');
      await user.click(listViewButton);

      await waitFor(() => {
        expect(screen.getByTestId('suggestions-list')).toBeInTheDocument();
      });

      // Verify selection is preserved (approximately)
      const newListItems = screen.getAllByTestId('suggestion-item');
      const newSelectedItem = newListItems.find(item => 
        item.classList.contains('highlighted')
      );
      
      expect(newSelectedItem).toBeInTheDocument();
      
      // Selection should be close to original (may not be exact due to tree transformation)
      if (selectedText) {
        const newSelectedText = newSelectedItem.textContent.trim();
        expect(mockSuggestions.some(s => s.word === newSelectedText)).toBe(true);
      }
    });
  });

  describe('Real API Data Integration', () => {
    it('should handle real autocomplete API responses', async () => {
      // Mock realistic API response
      const realApiResponse = {
        suggestions: [
          { word: 'tokyo', frequency: 150, type: 'exact_match' },
          { word: 'toronto', frequency: 120, type: 'exact_match' },
          { word: 'tokyo station', frequency: 80, type: 'exact_match' },
          { word: 'tokyo tower', frequency: 70, type: 'exact_match' },
          { word: 'tokyo bay', frequency: 60, type: 'exact_match' }
        ],
        totalCount: 5,
        queryTime: 15
      };

      mockedAxios.get.mockResolvedValue({ data: realApiResponse });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'tokyo');
      
      // Verify API call with correct parameters
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/search', {
          params: { q: 'tokyo', limit: 50 }
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      // Switch to tree view
      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      // Verify tree was built from real data
      const treeItems = screen.getAllByRole('treeitem');
      expect(treeItems.length).toBeGreaterThan(0);

      // Test selection with real data
      const wordNode = treeItems.find(item => 
        item.getAttribute('data-node-type') === 'word'
      );
      
      if (wordNode) {
        const wordText = wordNode.textContent.trim();
        await user.click(wordNode);
        
        await waitFor(() => {
          expect(searchInput).toHaveValue(wordText);
        });

        // Verify frequency increment call
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/increment-frequency', {
          word: wordText
        });
      }
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'error');
      
      // Wait for error handling
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });

      // Should handle error gracefully - no dropdown or error message shown
      await waitFor(() => {
        const dropdown = screen.queryByTestId('suggestions-dropdown');
        const errorMessage = screen.queryByTestId('error-message');
        
        // Either no dropdown or error message should be shown
        expect(dropdown || errorMessage).toBeTruthy();
      });

      consoleSpy.mockRestore();
    });

    it('should handle typo corrections in tree structure', async () => {
      const typoResponse = {
        suggestions: [
          { word: 'tokyo', frequency: 150, type: 'typo_correction', originalQuery: 'tokio' },
          { word: 'toronto', frequency: 120, type: 'exact_match' },
          { word: 'token', frequency: 80, type: 'exact_match' }
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

      if (typoNodes.length > 0) {
        const typoNode = typoNodes[0];
        expect(typoNode).toHaveClass(/typo-correction/);
        
        // Test selection of typo correction
        await user.click(typoNode);
        
        await waitFor(() => {
          const inputValue = searchInput.value;
          expect(inputValue).not.toBe('tokio');
          expect(inputValue).toBe('tokyo');
        });
      }
    });
  });

  describe('Performance with Large Datasets', () => {
    it('should handle 100+ suggestions efficiently', async () => {
      // Generate large dataset
      const largeSuggestions = Array.from({ length: 150 }, (_, i) => ({
        word: `suggestion${i.toString().padStart(3, '0')}`,
        frequency: Math.floor(Math.random() * 100) + 1,
        type: 'exact_match'
      }));

      mockedAxios.get.mockResolvedValue({
        data: { suggestions: largeSuggestions }
      });

      const startTime = performance.now();
      
      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'suggestion');
      
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
      
      // Should handle large dataset within reasonable time
      expect(totalTime).toBeLessThan(3000);

      // Verify virtual scrolling is working
      const visibleItems = screen.getAllByRole('treeitem');
      expect(visibleItems.length).toBeLessThan(100); // Virtual scrolling active
    });

    it('should maintain performance during rapid interactions', async () => {
      const suggestions = Array.from({ length: 50 }, (_, i) => ({
        word: `rapid${i}`,
        frequency: i + 1,
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
      for (let i = 0; i < 10; i++) {
        await user.keyboard('{ArrowDown}');
        await user.keyboard('{ArrowUp}');
      }

      // Rapid expand/collapse if available
      const expandableNodes = screen.getAllByRole('treeitem').filter(item => 
        item.getAttribute('aria-expanded') === 'false'
      );
      
      for (let i = 0; i < Math.min(5, expandableNodes.length); i++) {
        await user.click(expandableNodes[i]);
      }

      const endTime = performance.now();
      const interactionTime = endTime - startTime;
      
      // Should handle rapid interactions efficiently
      expect(interactionTime).toBeLessThan(2000);
      
      // Tree should still be functional
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });
  });

  describe('Cross-Browser Compatibility Simulation', () => {
    it('should handle different event behaviors', async () => {
      const suggestions = [
        { word: 'browser', frequency: 50, type: 'exact_match' },
        { word: 'browsing', frequency: 40, type: 'exact_match' }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { suggestions }
      });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'browser');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      // Test different event types that might vary by browser
      const treeView = screen.getByRole('tree');
      
      // Test focus events
      fireEvent.focus(treeView);
      expect(treeView).toHaveFocus();
      
      // Test keyboard events
      fireEvent.keyDown(treeView, { key: 'ArrowDown', keyCode: 40 });
      fireEvent.keyDown(treeView, { key: 'Enter', keyCode: 13 });
      
      // Test mouse events
      const treeItems = screen.getAllByRole('treeitem');
      if (treeItems.length > 0) {
        fireEvent.mouseEnter(treeItems[0]);
        fireEvent.mouseLeave(treeItems[0]);
        fireEvent.click(treeItems[0]);
      }

      // Should handle all events without errors
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('should work with different CSS feature support', async () => {
      const suggestions = [
        { word: 'css', frequency: 30, type: 'exact_match' },
        { word: 'css3', frequency: 25, type: 'exact_match' }
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

      // Verify basic layout works regardless of CSS features
      const treeItems = screen.getAllByRole('treeitem');
      expect(treeItems.length).toBeGreaterThan(0);
      
      // All items should be visible and positioned
      treeItems.forEach(item => {
        expect(item).toBeVisible();
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from tree building failures', async () => {
      // Mock malformed API response
      const malformedResponse = {
        suggestions: [
          { word: null, frequency: 10 }, // Invalid
          { frequency: 'invalid' }, // Invalid
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

      // Should either show tree view or fallback to list view
      await waitFor(() => {
        const treeView = screen.queryByRole('tree');
        const listView = screen.queryByTestId('suggestions-list');
        
        expect(treeView || listView).toBeTruthy();
      });

      // Should still be able to interact
      const suggestionItems = screen.getAllByTestId('suggestion-item');
      if (suggestionItems.length > 0) {
        await user.click(suggestionItems[0]);
        
        await waitFor(() => {
          expect(searchInput.value).toBeTruthy();
        });
      }

      consoleSpy.mockRestore();
    });

    it('should handle network interruptions gracefully', async () => {
      const suggestions = [
        { word: 'network', frequency: 40, type: 'exact_match' },
        { word: 'networking', frequency: 30, type: 'exact_match' }
      ];

      // First call succeeds
      mockedAxios.get.mockResolvedValueOnce({
        data: { suggestions }
      });

      render(<SearchInput />);

      const searchInput = screen.getByRole('textbox');
      
      await user.type(searchInput, 'network');
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-dropdown')).toBeInTheDocument();
      });

      const treeViewButton = screen.getByTestId('tree-view-button');
      await user.click(treeViewButton);

      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });

      // Simulate network failure for next search
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await user.clear(searchInput);
      await user.type(searchInput, 'interrupted');

      // Should handle network failure gracefully
      await waitFor(() => {
        // Either no dropdown or error handling
        const dropdown = screen.queryByTestId('suggestions-dropdown');
        expect(dropdown).toBeFalsy();
      });

      // Interface should remain functional
      expect(searchInput).toBeInTheDocument();
      expect(searchInput.value).toBe('interrupted');
    });
  });
});