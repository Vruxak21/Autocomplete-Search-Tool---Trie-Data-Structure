/**
 * @fileoverview Integration tests for TreeView keyboard navigation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TreeView from '../TreeView';
import { NODE_TYPES } from '../../types/tree.js';

describe('TreeView Keyboard Navigation Integration', () => {
  let mockOnSelect;
  let mockOnToggleExpand;
  let sampleTreeNodes;
  let user;

  beforeEach(() => {
    mockOnSelect = vi.fn();
    mockOnToggleExpand = vi.fn();
    user = userEvent.setup();

    // Create sample tree structure
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
            children: [],
            parent: null // Will be set in real implementation
          },
          {
            id: 'word-ant',
            type: NODE_TYPES.WORD,
            content: 'ant',
            prefix: 'ant',
            word: 'ant',
            frequency: 5,
            depth: 1,
            children: [],
            parent: null
          }
        ]
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
      },
      {
        id: 'prefix-c',
        type: NODE_TYPES.PREFIX,
        content: 'c',
        prefix: 'c',
        depth: 0,
        children: [
          {
            id: 'word-cat',
            type: NODE_TYPES.WORD,
            content: 'cat',
            prefix: 'cat',
            word: 'cat',
            frequency: 20,
            depth: 1,
            children: [],
            parent: null
          }
        ]
      }
    ];
  });

  describe('Basic Navigation', () => {
    it('should navigate down with arrow key', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      const treeView = screen.getByRole('tree');
      
      // First node should be focused initially
      await waitFor(() => {
        const firstNode = screen.getByTestId('tree-node-prefix-a');
        expect(firstNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
      });

      // Navigate down
      await user.keyboard('{ArrowDown}');
      
      // Should move to next node (banana)
      const bananaNode = screen.getByTestId('tree-node-word-banana');
      expect(bananaNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
    });

    it('should navigate up with arrow key', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      const treeView = screen.getByRole('tree');
      
      // Navigate down twice to get to third node
      await user.keyboard('{ArrowDown}{ArrowDown}');
      
      // Navigate back up
      await user.keyboard('{ArrowUp}');
      
      // Should be back to banana node
      const bananaNode = screen.getByTestId('tree-node-word-banana');
      expect(bananaNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
    });

    it('should wrap around when navigating past end', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      // Navigate to last node
      await user.keyboard('{ArrowDown}{ArrowDown}');
      
      // Navigate past end - should wrap to first
      await user.keyboard('{ArrowDown}');
      
      const firstNode = screen.getByTestId('tree-node-prefix-a');
      expect(firstNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
    });
  });

  describe('Expansion and Collapse', () => {
    it('should expand node with right arrow key', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      // Focus on prefix-a node
      const prefixANode = screen.getByTestId('tree-node-prefix-a');
      
      // Expand with right arrow
      await user.keyboard('{ArrowRight}');
      
      await waitFor(() => {
        expect(mockOnToggleExpand).toHaveBeenCalledWith('prefix-a', true);
      });
    });

    it('should collapse expanded node with left arrow key', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      // First expand the node
      await user.keyboard('{ArrowRight}');
      
      await waitFor(() => {
        expect(mockOnToggleExpand).toHaveBeenCalledWith('prefix-a', true);
      });

      // Then collapse it
      await user.keyboard('{ArrowLeft}');
      
      await waitFor(() => {
        expect(mockOnToggleExpand).toHaveBeenCalledWith('prefix-a', false);
      });
    });

    it('should navigate to first child when expanding with right arrow', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      // Expand prefix-a
      await user.keyboard('{ArrowRight}');
      
      await waitFor(() => {
        expect(mockOnToggleExpand).toHaveBeenCalledWith('prefix-a', true);
      });

      // Press right arrow again to move to first child
      await user.keyboard('{ArrowRight}');
      
      // Should now be on apple node
      await waitFor(() => {
        const appleNode = screen.getByTestId('tree-node-word-apple');
        expect(appleNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
      });
    });

    it('should navigate to parent with left arrow on leaf node', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      // Expand prefix-a and navigate to child
      await user.keyboard('{ArrowRight}{ArrowRight}');
      
      // Verify we're on the apple node
      await waitFor(() => {
        const appleNode = screen.getByTestId('tree-node-word-apple');
        expect(appleNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
      });
      
      // Navigate back to parent with left arrow
      await user.keyboard('{ArrowLeft}');
      
      await waitFor(() => {
        const prefixANode = screen.getByTestId('tree-node-prefix-a');
        expect(prefixANode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
      });
    });
  });

  describe('Selection with Enter Key', () => {
    it('should select word node with Enter key', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      // Navigate to banana word node
      await user.keyboard('{ArrowDown}');
      
      // Select with Enter
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'word-banana',
            word: 'banana'
          })
        );
      });
    });

    it('should toggle expansion of prefix node with Enter key', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      // Focus on prefix-a node and press Enter
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockOnToggleExpand).toHaveBeenCalledWith('prefix-a', true);
      });

      // Press Enter again to collapse
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockOnToggleExpand).toHaveBeenCalledWith('prefix-a', false);
      });
    });
  });

  describe('Home and End Keys', () => {
    it('should navigate to first node with Home key', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      // Navigate to last node first
      await user.keyboard('{ArrowDown}{ArrowDown}');
      
      // Press Home to go to first
      await user.keyboard('{Home}');
      
      const firstNode = screen.getByTestId('tree-node-prefix-a');
      expect(firstNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
    });

    it('should navigate to last node with End key', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      // Press End to go to last
      await user.keyboard('{End}');
      
      const lastNode = screen.getByTestId('tree-node-prefix-c');
      expect(lastNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
    });
  });

  describe('Escape Key', () => {
    it('should clear selection with Escape key', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      // Navigate to a node first
      await user.keyboard('{ArrowDown}');
      
      // Verify a node is focused
      await waitFor(() => {
        const bananaNode = screen.getByTestId('tree-node-word-banana');
        expect(bananaNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
      });
      
      // Press Escape to clear selection
      await user.keyboard('{Escape}');
      
      // Wait for the focus to be cleared
      await waitFor(() => {
        const nodes = screen.getAllByRole('treeitem');
        const focusedNodes = nodes.filter(node => node.classList.contains('ring-2'));
        expect(focusedNodes).toHaveLength(0);
      });
    });
  });

  describe('Mouse and Keyboard Interaction', () => {
    it('should handle mouse click and then keyboard navigation', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      // Click on banana node
      const bananaNode = screen.getByTestId('tree-node-word-banana');
      await user.click(bananaNode.querySelector('[role="treeitem"]'));
      
      // Should be focused and selected
      expect(bananaNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
      
      // Navigate with keyboard
      await user.keyboard('{ArrowDown}');
      
      // Should move to next node
      const nextNode = screen.getByTestId('tree-node-prefix-c');
      expect(nextNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
    });

    it('should handle expand icon click and keyboard navigation', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      // Click expand icon on prefix-a
      const prefixANode = screen.getByTestId('tree-node-prefix-a');
      const expandButton = prefixANode.querySelector('button[aria-label="Expand"]');
      await user.click(expandButton);
      
      await waitFor(() => {
        expect(mockOnToggleExpand).toHaveBeenCalledWith('prefix-a', true);
      });

      // Focus the tree and navigate
      const treeView = screen.getByRole('tree');
      treeView.focus();
      await user.keyboard('{ArrowDown}');
      
      // Should navigate through expanded tree
      await waitFor(() => {
        const appleNode = screen.getByTestId('tree-node-word-apple');
        expect(appleNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
      });
    });
  });

  describe('Focus Management', () => {
    it('should auto-focus first node when autoFocus is true', async () => {
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

    it('should not auto-focus when autoFocus is false', () => {
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

    it('should maintain focus during tree updates', async () => {
      const { rerender } = render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      // Navigate to second node
      await user.keyboard('{ArrowDown}');
      
      const bananaNode = screen.getByTestId('tree-node-word-banana');
      expect(bananaNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');

      // Update tree with same structure
      rerender(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      // Focus should be maintained
      expect(bananaNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      const treeView = screen.getByRole('tree');
      expect(treeView).toHaveAttribute('aria-label', 'Search results tree');

      const treeItems = screen.getAllByRole('treeitem');
      treeItems.forEach((item, index) => {
        expect(item).toHaveAttribute('aria-level');
        expect(item).toHaveAttribute('aria-selected');
      });
    });

    it('should have proper tabIndex management', async () => {
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
        
        // Only focused item should have tabIndex 0
        const focusedItems = treeItems.filter(item => item.tabIndex === 0);
        expect(focusedItems).toHaveLength(1);
        
        // All other items should have tabIndex -1
        const unfocusedItems = treeItems.filter(item => item.tabIndex === -1);
        expect(unfocusedItems).toHaveLength(treeItems.length - 1);
      });
    });

    it('should announce node information with aria-label', () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      const bananaNode = screen.getByTestId('tree-node-word-banana');
      const treeItem = bananaNode.querySelector('[role="treeitem"]');
      
      expect(treeItem).toHaveAttribute('aria-label', 'Word: banana, 15 searches');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tree gracefully', () => {
      render(
        <TreeView
          treeNodes={[]}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      expect(screen.getByText('No items to display')).toBeInTheDocument();
    });

    it('should handle single node tree', async () => {
      const singleNodeTree = [sampleTreeNodes[1]]; // Just banana
      
      render(
        <TreeView
          treeNodes={singleNodeTree}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      // Should focus the single node
      await waitFor(() => {
        const bananaNode = screen.getByTestId('tree-node-word-banana');
        expect(bananaNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
      });

      // Navigation should wrap to same node
      await user.keyboard('{ArrowDown}');
      
      const bananaNode = screen.getByTestId('tree-node-word-banana');
      expect(bananaNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
    });

    it('should handle rapid key presses', async () => {
      render(
        <TreeView
          treeNodes={sampleTreeNodes}
          onSelect={mockOnSelect}
          onToggleExpand={mockOnToggleExpand}
          autoFocus={true}
        />
      );

      // Rapid navigation
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}{ArrowDown}');
      
      // Should end up on the correct node
      const lastNode = screen.getByTestId('tree-node-prefix-c');
      expect(lastNode.querySelector('[role="treeitem"]')).toHaveClass('ring-2');
    });
  });
});