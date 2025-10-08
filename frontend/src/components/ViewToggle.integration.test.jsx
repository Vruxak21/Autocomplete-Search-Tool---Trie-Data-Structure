/**
 * @fileoverview Integration tests for view switching scenarios
 */

import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ViewToggle from './ViewToggle';
import { ViewStateManager } from '../utils/ViewStateManager.js';
import { VIEW_MODES, ERROR_TYPES } from '../types/tree.js';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test component that integrates ViewToggle with ViewStateManager
const TestViewSwitcher = ({ 
  initialSuggestions = [],
  onViewChange = vi.fn(),
  onError = vi.fn()
}) => {
  const [viewStateManager] = useState(() => new ViewStateManager());
  const [currentMode, setCurrentMode] = useState(viewStateManager.getCurrentMode());
  const [suggestions] = useState(initialSuggestions);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    const handleStateChange = (event) => {
      if (event.type === 'MODE_CHANGED') {
        setCurrentMode(event.currentMode);
        onViewChange(event);
      } else if (event.type === 'ERROR_OCCURRED') {
        setError(event.error);
        onError(event.error);
      }
    };

    viewStateManager.addListener(handleStateChange);
    return () => viewStateManager.removeListener(handleStateChange);
  }, [viewStateManager, onViewChange, onError]);

  const handleModeChange = async (newMode) => {
    try {
      // Simulate tree building for tree mode
      if (newMode === VIEW_MODES.TREE) {
        const shouldEnable = viewStateManager.shouldEnableTreeView(suggestions);
        if (!shouldEnable) {
          throw new Error('Tree view not suitable for current data');
        }
      }

      await viewStateManager.switchMode(newMode, {
        selectedNodeId: 'test-node',
        selectedIndex: 2,
        scrollPosition: 100,
        expandedNodes: new Set(['node-1', 'node-2'])
      });
    } catch (err) {
      viewStateManager.handleTreeBuildFailure(err, { suggestions });
    }
  };

  return (
    <div>
      <ViewToggle
        currentMode={currentMode}
        onModeChange={handleModeChange}
        data-testid="view-toggle"
      />
      <div data-testid="current-mode">{currentMode}</div>
      <div data-testid="suggestions-count">{suggestions.length}</div>
      {error && (
        <div data-testid="error-message" data-error-type={error.type}>
          {error.message}
        </div>
      )}
    </div>
  );
};

describe('ViewToggle Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Basic View Switching', () => {
    it('switches from list to tree view successfully', async () => {
      const onViewChange = vi.fn();
      const suggestions = [
        { word: 'apple' },
        { word: 'application' },
        { word: 'apply' },
        { word: 'banana' }
      ];

      render(
        <TestViewSwitcher 
          initialSuggestions={suggestions}
          onViewChange={onViewChange}
        />
      );

      expect(screen.getByTestId('current-mode')).toHaveTextContent('list');

      fireEvent.click(screen.getByTestId('tree-view-button'));

      await waitFor(() => {
        expect(screen.getByTestId('current-mode')).toHaveTextContent('tree');
      });

      expect(onViewChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MODE_CHANGED',
          previousMode: VIEW_MODES.LIST,
          currentMode: VIEW_MODES.TREE,
          preservedState: expect.objectContaining({
            selectedNodeId: 'test-node',
            selectedIndex: 2,
            scrollPosition: 100
          })
        })
      );
    });

    it('switches from tree to list view successfully', async () => {
      const onViewChange = vi.fn();
      localStorageMock.getItem.mockReturnValue(VIEW_MODES.TREE);
      
      const suggestions = [
        { word: 'apple' },
        { word: 'application' },
        { word: 'apply' }
      ];

      render(
        <TestViewSwitcher 
          initialSuggestions={suggestions}
          onViewChange={onViewChange}
        />
      );

      expect(screen.getByTestId('current-mode')).toHaveTextContent('tree');

      fireEvent.click(screen.getByTestId('list-view-button'));

      await waitFor(() => {
        expect(screen.getByTestId('current-mode')).toHaveTextContent('list');
      });

      expect(onViewChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MODE_CHANGED',
          previousMode: VIEW_MODES.TREE,
          currentMode: VIEW_MODES.LIST
        })
      );
    });

    it('preserves view preference in localStorage', async () => {
      const suggestions = [
        { word: 'apple' },
        { word: 'application' }
      ];

      render(<TestViewSwitcher initialSuggestions={suggestions} />);

      fireEvent.click(screen.getByTestId('tree-view-button'));

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'autocomplete-view-preference',
          VIEW_MODES.TREE
        );
      });
    });
  });

  describe('Error Handling and Fallback', () => {
    it('falls back to list view when tree building fails', async () => {
      const onError = vi.fn();
      const suggestions = []; // Empty suggestions should cause tree build to fail

      render(
        <TestViewSwitcher 
          initialSuggestions={suggestions}
          onError={onError}
        />
      );

      expect(screen.getByTestId('current-mode')).toHaveTextContent('list');

      fireEvent.click(screen.getByTestId('tree-view-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(screen.getByTestId('current-mode')).toHaveTextContent('list');
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ERROR_TYPES.BUILD_ERROR,
          message: expect.stringContaining('Tree view not suitable')
        })
      );
    });

    it('shows error message with correct type', async () => {
      const suggestions = [{ word: 'single' }]; // Single item should fail tree view

      render(<TestViewSwitcher initialSuggestions={suggestions} />);

      fireEvent.click(screen.getByTestId('tree-view-button'));

      await waitFor(() => {
        const errorElement = screen.getByTestId('error-message');
        expect(errorElement).toHaveAttribute('data-error-type', ERROR_TYPES.BUILD_ERROR);
      });
    });

    it('handles localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const suggestions = [
        { word: 'apple' },
        { word: 'application' }
      ];

      render(<TestViewSwitcher initialSuggestions={suggestions} />);

      // Should not throw error
      expect(() => {
        fireEvent.click(screen.getByTestId('tree-view-button'));
      }).not.toThrow();

      await waitFor(() => {
        expect(screen.getByTestId('current-mode')).toHaveTextContent('tree');
      });
    });
  });

  describe('State Preservation', () => {
    it('preserves selection and scroll position during view switch', async () => {
      const onViewChange = vi.fn();
      const suggestions = [
        { word: 'apple' },
        { word: 'application' },
        { word: 'apply' }
      ];

      render(
        <TestViewSwitcher 
          initialSuggestions={suggestions}
          onViewChange={onViewChange}
        />
      );

      fireEvent.click(screen.getByTestId('tree-view-button'));

      await waitFor(() => {
        expect(onViewChange).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'MODE_CHANGED',
            previousMode: VIEW_MODES.LIST,
            currentMode: VIEW_MODES.TREE,
            preservedState: expect.objectContaining({
              selectedNodeId: 'test-node',
              selectedIndex: 2,
              scrollPosition: 100
            })
          })
        );
      });
    });

    it('maintains expanded nodes state across view switches', async () => {
      const onViewChange = vi.fn();
      const suggestions = [
        { word: 'apple' },
        { word: 'application' },
        { word: 'apply' }
      ];

      render(
        <TestViewSwitcher 
          initialSuggestions={suggestions}
          onViewChange={onViewChange}
        />
      );

      // Switch to tree view
      fireEvent.click(screen.getByTestId('tree-view-button'));

      await waitFor(() => {
        expect(screen.getByTestId('current-mode')).toHaveTextContent('tree');
      });

      // Switch back to list view
      fireEvent.click(screen.getByTestId('list-view-button'));

      await waitFor(() => {
        expect(screen.getByTestId('current-mode')).toHaveTextContent('list');
      });

      // Verify expanded nodes were preserved in both switches
      expect(onViewChange).toHaveBeenCalledTimes(2);
      onViewChange.mock.calls.forEach(call => {
        expect(call[0].preservedState.expandedNodes).toBeInstanceOf(Set);
        expect(Array.from(call[0].preservedState.expandedNodes)).toEqual(['node-1', 'node-2']);
      });
    });
  });

  describe('Data-Driven View Availability', () => {
    it('enables tree view for suitable data', () => {
      const suggestions = [
        { word: 'apple' },
        { word: 'application' },
        { word: 'apply' },
        { word: 'banana' },
        { word: 'band' }
      ];

      render(<TestViewSwitcher initialSuggestions={suggestions} />);

      const treeButton = screen.getByTestId('tree-view-button');
      expect(treeButton).not.toBeDisabled();
    });

    it('shows appropriate suggestions count', () => {
      const suggestions = [
        { word: 'apple' },
        { word: 'application' },
        { word: 'apply' }
      ];

      render(<TestViewSwitcher initialSuggestions={suggestions} />);

      expect(screen.getByTestId('suggestions-count')).toHaveTextContent('3');
    });
  });

  describe('Performance and Responsiveness', () => {
    it('switches views quickly without blocking UI', async () => {
      const suggestions = Array.from({ length: 20 }, (_, i) => ({
        word: `word${i}`
      }));

      render(<TestViewSwitcher initialSuggestions={suggestions} />);

      const startTime = performance.now();
      
      fireEvent.click(screen.getByTestId('tree-view-button'));

      await waitFor(() => {
        expect(screen.getByTestId('current-mode')).toHaveTextContent('tree');
      });

      const endTime = performance.now();
      const switchTime = endTime - startTime;

      // View switch should complete within 100ms
      expect(switchTime).toBeLessThan(100);
    });

    it('handles rapid view switching gracefully', async () => {
      const suggestions = [
        { word: 'apple' },
        { word: 'application' }
      ];

      render(<TestViewSwitcher initialSuggestions={suggestions} />);

      // Rapidly switch between views
      fireEvent.click(screen.getByTestId('tree-view-button'));
      fireEvent.click(screen.getByTestId('list-view-button'));
      fireEvent.click(screen.getByTestId('tree-view-button'));

      await waitFor(() => {
        expect(screen.getByTestId('current-mode')).toHaveTextContent('tree');
      });

      // Should end up in tree view without errors
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains proper ARIA states during view switching', async () => {
      const suggestions = [
        { word: 'apple' },
        { word: 'application' }
      ];

      render(<TestViewSwitcher initialSuggestions={suggestions} />);

      const listButton = screen.getByTestId('list-view-button');
      const treeButton = screen.getByTestId('tree-view-button');

      expect(listButton).toHaveAttribute('aria-selected', 'true');
      expect(treeButton).toHaveAttribute('aria-selected', 'false');

      fireEvent.click(treeButton);

      await waitFor(() => {
        expect(listButton).toHaveAttribute('aria-selected', 'false');
        expect(treeButton).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('provides proper focus management during view switches', async () => {
      const suggestions = [
        { word: 'apple' },
        { word: 'application' }
      ];

      render(<TestViewSwitcher initialSuggestions={suggestions} />);

      const treeButton = screen.getByTestId('tree-view-button');
      treeButton.focus();

      fireEvent.click(treeButton);

      await waitFor(() => {
        expect(screen.getByTestId('current-mode')).toHaveTextContent('tree');
      });

      // Focus should remain on the button after switching
      expect(document.activeElement).toBe(treeButton);
    });
  });
});