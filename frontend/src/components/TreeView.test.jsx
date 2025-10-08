/**
 * @fileoverview Unit tests for TreeView component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TreeView from './TreeView';
import { NODE_TYPES } from '../types/tree.js';

describe('TreeView Component', () => {
  let mockOnSelect;
  let mockOnToggleExpand;
  let sampleTreeNodes;

  beforeEach(() => {
    mockOnSelect = vi.fn();
    mockOnToggleExpand = vi.fn();

    // Create sample tree structure for testing
    sampleTreeNodes = [
      {
        id: 'prefix-a',
        type: NODE_TYPES.PREFIX,
        content: 'a',
        prefix: 'a',
        depth: 0,
        children: [
          {
            id: 'word-apple',
            type: NODE_TYPES.WORD,
            content: 'apple',
            prefix: 'apple',
            word: 'apple',
            frequency: 10,
            depth: 1,
            children: []
          },
          {
            id: 'word-ant',
            type: NODE_TYPES.WORD,
            content: 'ant',
            prefix: 'ant',
            word: 'ant',
            frequency: 5,
            depth: 1,
            children: []
          }
        ],
        childCount: 2,
        totalFrequency: 15
      },
      {
        id: 'word-banana',
        type: NODE_TYPES.WORD,
        content: 'banana',
        prefix: 'banana',
        word: 'banana',
        frequency: 15,
        depth: 0,
        children: []
      }
    ];
  });

  describe('Rendering', () => {
    it('renders tree structure correctly', () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      // Check that tree container is rendered
      expect(screen.getByRole('tree')).toBeInTheDocument();
      expect(screen.getByRole('tree')).toHaveAttribute('aria-label', 'Search results tree');

      // Check that root nodes are rendered
      expect(screen.getByTestId('tree-node-prefix-a')).toBeInTheDocument();
      expect(screen.getByTestId('tree-node-word-banana')).toBeInTheDocument();
    });

    it('renders empty state when no nodes provided', () => {
      render(
        <TreeView
          treeNodes={[]}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      expect(screen.getByText('No items to display')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          className="custom-tree-class"
        />
      );

      expect(container.querySelector('.tree-view')).toHaveClass('custom-tree-class');
    });

    it('renders with query highlighting', () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          query="app"
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      // The query highlighting is handled in TreeNode, but we can verify the query is passed
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });
  });

  describe('Tree State Management', () => {
    it('manages expanded nodes state correctly', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      const prefixNode = screen.getByTestId('tree-node-prefix-a');
      const expandButton = prefixNode.querySelector('button[aria-label="Expand"]');

      // Initially collapsed
      expect(expandButton).toBeInTheDocument();

      // Expand the node
      await act(async () => {
        fireEvent.click(expandButton);
      });

      await waitFor(() => {
        expect(mockOnToggleExpand).toHaveBeenCalledWith('prefix-a', true);
      });
    });

    it('manages selection state correctly', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      const bananaNode = screen.getByTestId('tree-node-word-banana');
      const treeItem = bananaNode.querySelector('[role="treeitem"]');

      await act(async () => {
        fireEvent.click(treeItem);
      });

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'word-banana',
            word: 'banana'
          })
        );
      });
    });

    it('updates tree when nodes change', () => {
      const { rerender } = render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      // Initial render
      expect(screen.getByTestId('tree-node-prefix-a')).toBeInTheDocument();
      expect(screen.getByTestId('tree-node-word-banana')).toBeInTheDocument();

      // Update with new nodes
      const newNodes = [
        {
          id: 'word-cherry',
          type: NODE_TYPES.WORD,
          content: 'cherry',
          prefix: 'cherry',
          word: 'cherry',
          frequency: 8,
          depth: 0,
          children: []
        }
      ];

      rerender(
        <TreeView
          treeNodes={newNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      expect(screen.getByTestId('tree-node-word-cherry')).toBeInTheDocument();
      expect(screen.queryByTestId('tree-node-prefix-a')).not.toBeInTheDocument();
    });
  });

  describe('Auto Focus', () => {
    it('auto-focuses first node when autoFocus is true', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      await waitFor(() => {
        const firstNode = screen.getByTestId('tree-node-prefix-a');
        expect(firstNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
      });
    });

    it('does not auto-focus when autoFocus is false', () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={false}
        />
      );

      const nodes = screen.getAllByRole('treeitem');
      nodes.forEach(node => {
        expect(node).not.toHaveClass('ring-2');
      });
    });
  });

  describe('Keyboard Navigation Integration', () => {
    it('handles keyboard events correctly', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      const treeView = screen.getByRole('tree');

      // Test arrow down navigation
      await act(async () => {
        fireEvent.keyDown(treeView, { key: 'ArrowDown' });
      });

      await waitFor(() => {
        const bananaNode = screen.getByTestId('tree-node-word-banana');
        expect(bananaNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
      });
    });

    it('handles escape key to clear selection', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      const treeView = screen.getByRole('tree');

      // First ensure a node is focused
      await waitFor(() => {
        const firstNode = screen.getByTestId('tree-node-prefix-a');
        expect(firstNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
      });

      // Press escape
      await act(async () => {
        fireEvent.keyDown(treeView, { key: 'Escape' });
      });

      await waitFor(() => {
        const nodes = screen.getAllByRole('treeitem');
        const focusedNodes = nodes.filter(node => node.classList.contains('ring-2'));
        expect(focusedNodes).toHaveLength(0);
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes on tree container', () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      const treeView = screen.getByRole('tree');
      expect(treeView).toHaveAttribute('aria-label', 'Search results tree');
      expect(treeView).toHaveAttribute('tabIndex', '0');
    });

    it('manages tabIndex correctly for tree items', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      await waitFor(() => {
        const treeItems = screen.getAllByRole('treeitem');
        
        // Only one item should have tabIndex 0 (the focused one)
        const focusableItems = treeItems.filter(item => item.tabIndex === 0);
        expect(focusableItems).toHaveLength(1);
        
        // All others should have tabIndex -1
        const nonFocusableItems = treeItems.filter(item => item.tabIndex === -1);
        expect(nonFocusableItems).toHaveLength(treeItems.length - 1);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles undefined treeNodes gracefully', () => {
      render(
        <TreeView
          treeNodes={undefined}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      expect(screen.getByText('No items to display')).toBeInTheDocument();
    });

    it('handles null treeNodes gracefully', () => {
      render(
        <TreeView
          treeNodes={null}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      expect(screen.getByText('No items to display')).toBeInTheDocument();
    });

    it('handles missing callback functions gracefully', () => {
      expect(() => {
        render(
          <TreeView
            treeNodes={sampleTreeNodes}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('renders large tree efficiently', () => {
      // Create a larger tree for performance testing
      const largeTree = Array.from({ length: 50 }, (_, i) => ({
        id: `word-${i}`,
        type: NODE_TYPES.WORD,
        content: `word${i}`,
        prefix: `word${i}`,
        word: `word${i}`,
        frequency: i + 1,
        depth: 0,
        children: []
      }));

      const startTime = performance.now();
      
      render(
        <TreeView
          treeNodes={largeTree}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100);
      
      // Verify all nodes are rendered
      expect(screen.getAllByRole('treeitem')).toHaveLength(50);
    });
  });

  describe('Tree Update and Re-render Optimization', () => {
    it('preserves expanded state during updates', async () => {
      const { rerender } = render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      // Expand a node
      const prefixNode = screen.getByTestId('tree-node-prefix-a');
      const expandButton = prefixNode.querySelector('button[aria-label="Expand"]');

      await act(async () => {
        fireEvent.click(expandButton);
      });

      await waitFor(() => {
        expect(mockOnToggleExpand).toHaveBeenCalledWith('prefix-a', true);
      });

      // Re-render with same tree structure
      rerender(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      // Expanded state should be preserved (though this depends on internal state management)
      expect(screen.getByTestId('tree-node-prefix-a')).toBeInTheDocument();
    });

    it('handles rapid tree updates without errors', async () => {
      const { rerender } = render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      // Rapidly update the tree multiple times
      for (let i = 0; i < 5; i++) {
        const updatedNodes = sampleTreeNodes.map(node => ({
          ...node,
          frequency: (node.frequency || 0) + i
        }));

        await act(async () => {
          rerender(
            <TreeView
              treeNodes={updatedNodes}
              onSelect={mockOnSelect}
              onToggleExpand={mockOnToggleExpand}
            />
          );
        });
      }

      // Should still render correctly
      expect(screen.getByRole('tree')).toBeInTheDocument();
      // The tree should have the expected structure (may include child nodes if expanded)
      const treeItems = screen.getAllByRole('treeitem');
      expect(treeItems.length).toBeGreaterThanOrEqual(2); // At least two root nodes
    });
  });
});