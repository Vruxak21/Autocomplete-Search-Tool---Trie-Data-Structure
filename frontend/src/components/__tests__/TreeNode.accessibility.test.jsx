/**
 * @fileoverview Accessibility tests for TreeNode component
 * Tests ARIA attributes, screen reader support, and keyboard navigation accessibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import TreeNode from '../TreeNode';
import { NODE_TYPES } from '../../types/tree';

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

describe('TreeNode Accessibility', () => {
  const mockWordNode = {
    id: 'word-1',
    type: NODE_TYPES.WORD,
    content: 'apple',
    word: 'apple',
    frequency: 100,
    suggestionType: 'exact_match',
    isExpanded: false,
    isSelected: false,
    isFocused: false,
    children: []
  };

  const mockPrefixNode = {
    id: 'prefix-1',
    type: NODE_TYPES.PREFIX,
    content: 'app',
    isExpanded: false,
    isSelected: false,
    isFocused: false,
    children: [
      {
        id: 'word-1-1',
        type: NODE_TYPES.WORD,
        content: 'apple',
        word: 'apple',
        frequency: 100,
        suggestionType: 'exact_match',
        isExpanded: false,
        isSelected: false,
        isFocused: false,
        children: []
      }
    ],
    childCount: 1,
    totalFrequency: 100
  };

  const mockTypoCorrectionNode = {
    id: 'typo-1',
    type: NODE_TYPES.WORD,
    content: 'apple',
    word: 'apple',
    frequency: 50,
    suggestionType: 'typo_correction',
    isExpanded: false,
    isSelected: false,
    isFocused: false,
    children: []
  };

  const defaultProps = {
    query: 'app',
    onSelect: vi.fn(),
    onToggleExpand: vi.fn(),
    onKeyDown: vi.fn(),
    depth: 0,
    position: 1,
    setSize: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('ARIA Attributes - Word Node', () => {
    it('should have proper treeitem role and attributes', () => {
      render(<TreeNode {...defaultProps} node={mockWordNode} />);
      
      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toBeInTheDocument();
      expect(treeItem).toHaveAttribute('aria-level', '1');
      expect(treeItem).toHaveAttribute('aria-setsize', '1');
      expect(treeItem).toHaveAttribute('aria-posinset', '1');
      expect(treeItem).not.toHaveAttribute('aria-expanded');
    });

    it('should have descriptive aria-label for word node', () => {
      render(<TreeNode {...defaultProps} node={mockWordNode} />);
      
      const treeItem = screen.getByRole('treeitem');
      const ariaLabel = treeItem.getAttribute('aria-label');
      expect(ariaLabel).toContain('Word: apple');
      expect(ariaLabel).toContain('100 searches');
      expect(ariaLabel).toContain('1 of 1');
      expect(ariaLabel).toContain('level 1');
    });

    it('should have aria-describedby pointing to description', () => {
      render(<TreeNode {...defaultProps} node={mockWordNode} />);
      
      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('aria-describedby');
      
      const describedBy = treeItem.getAttribute('aria-describedby');
      const description = document.getElementById(describedBy);
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('sr-only');
      expect(description).toHaveTextContent('Selectable word. Press Enter to select.');
    });

    it('should indicate typo correction in aria-label', () => {
      render(<TreeNode {...defaultProps} node={mockTypoCorrectionNode} />);
      
      const treeItem = screen.getByRole('treeitem');
      const ariaLabel = treeItem.getAttribute('aria-label');
      expect(ariaLabel).toContain('suggested correction');
    });
  });

  describe('ARIA Attributes - Prefix Node', () => {
    it('should have proper aria-expanded attribute', () => {
      render(
        <div role="tree">
          <TreeNode {...defaultProps} node={mockPrefixNode} />
        </div>
      );
      
      const prefixTreeItem = screen.getByRole('treeitem', { name: /Group: app/ });
      expect(prefixTreeItem).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update aria-expanded when expanded', () => {
      const expandedNode = { ...mockPrefixNode, isExpanded: true };
      render(
        <div role="tree">
          <TreeNode {...defaultProps} node={expandedNode} />
        </div>
      );
      
      const prefixTreeItem = screen.getByRole('treeitem', { name: /Group: app/ });
      expect(prefixTreeItem).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have descriptive aria-label for prefix node', () => {
      render(
        <div role="tree">
          <TreeNode {...defaultProps} node={mockPrefixNode} />
        </div>
      );
      
      const treeItems = screen.getAllByRole('treeitem');
      const prefixTreeItem = treeItems.find(item => 
        item.getAttribute('aria-label')?.includes('Group: app')
      );
      expect(prefixTreeItem).toBeTruthy();
      
      const ariaLabel = prefixTreeItem.getAttribute('aria-label');
      expect(ariaLabel).toContain('Group: app');
      expect(ariaLabel).toContain('1 items');
      expect(ariaLabel).toContain('100 total searches');
      expect(ariaLabel).toContain('1 of 1');
      expect(ariaLabel).toContain('level 1');
    });

    it('should have proper description for expandable node', () => {
      render(
        <div role="tree">
          <TreeNode {...defaultProps} node={mockPrefixNode} />
        </div>
      );
      
      const treeItems = screen.getAllByRole('treeitem');
      const prefixTreeItem = treeItems.find(item => 
        item.getAttribute('aria-label')?.includes('Group: app')
      );
      expect(prefixTreeItem).toBeTruthy();
      
      const describedBy = prefixTreeItem.getAttribute('aria-describedby');
      const description = document.getElementById(describedBy);
      expect(description).toHaveTextContent('Collapsed group');
      expect(description).toHaveTextContent('Press Enter or right arrow to expand');
    });
  });

  describe('Focus Management', () => {
    it('should have proper tabindex when focused', () => {
      const focusedNode = { ...mockWordNode, isFocused: true };
      render(
        <div role="tree">
          <TreeNode {...defaultProps} node={focusedNode} isFocused={true} />
        </div>
      );
      
      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('tabIndex', '0');
    });

    it('should have tabindex -1 when not focused', () => {
      render(
        <div role="tree">
          <TreeNode {...defaultProps} node={mockWordNode} />
        </div>
      );
      
      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('tabIndex', '-1');
    });

    it('should have proper aria-selected attribute', () => {
      const selectedNode = { ...mockWordNode, isSelected: true };
      render(
        <div role="tree">
          <TreeNode {...defaultProps} node={selectedNode} isSelected={true} />
        </div>
      );
      
      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Expand Icon Accessibility', () => {
    it('should have proper button attributes for expandable nodes', () => {
      render(<TreeNode {...defaultProps} node={mockPrefixNode} />);
      
      const expandButton = screen.getByRole('button', { name: /Expand group/ });
      expect(expandButton).toBeInTheDocument();
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');
      expect(expandButton).toHaveAttribute('aria-controls');
      expect(expandButton).toHaveAttribute('type', 'button');
      expect(expandButton).toHaveAttribute('tabIndex', '-1'); // Parent handles focus
    });

    it('should update button label when expanded', () => {
      const expandedNode = { ...mockPrefixNode, isExpanded: true };
      render(<TreeNode {...defaultProps} node={expandedNode} />);
      
      const collapseButton = screen.getByRole('button', { name: /Collapse group/ });
      expect(collapseButton).toBeInTheDocument();
      expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-hidden on expand icon SVG', () => {
      render(<TreeNode {...defaultProps} node={mockPrefixNode} />);
      
      const expandButton = screen.getByRole('button', { name: /Expand group/ });
      const svg = expandButton.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('should not render button for leaf nodes', () => {
      render(<TreeNode {...defaultProps} node={mockWordNode} />);
      
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
      
      // Should have spacer div with aria-hidden
      const spacer = screen.getByTestId(`tree-node-${mockWordNode.id}`)
        .querySelector('[aria-hidden="true"]');
      expect(spacer).toBeInTheDocument();
    });
  });

  describe('Child Groups', () => {
    it('should have proper group role for children container', () => {
      const expandedNode = { ...mockPrefixNode, isExpanded: true };
      render(<TreeNode {...defaultProps} node={expandedNode} />);
      
      const group = screen.getByRole('group');
      expect(group).toBeInTheDocument();
      expect(group).toHaveAttribute('aria-label', 'Children of app');
      expect(group).toHaveAttribute('id');
    });

    it('should connect expand button to children container', () => {
      const expandedNode = { ...mockPrefixNode, isExpanded: true };
      render(<TreeNode {...defaultProps} node={expandedNode} />);
      
      const expandButton = screen.getByRole('button');
      const group = screen.getByRole('group');
      
      const ariaControls = expandButton.getAttribute('aria-controls');
      const groupId = group.getAttribute('id');
      expect(ariaControls).toBe(groupId);
    });
  });

  describe('Depth and Position', () => {
    it('should reflect depth in aria-level', () => {
      render(<TreeNode {...defaultProps} node={mockWordNode} depth={2} />);
      
      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('aria-level', '3'); // depth + 1
    });

    it('should reflect position in aria-posinset', () => {
      render(<TreeNode {...defaultProps} node={mockWordNode} position={3} setSize={5} />);
      
      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('aria-posinset', '3');
      expect(treeItem).toHaveAttribute('aria-setsize', '5');
    });

    it('should include position in aria-label', () => {
      render(<TreeNode {...defaultProps} node={mockWordNode} position={2} setSize={3} />);
      
      const treeItem = screen.getByRole('treeitem');
      const ariaLabel = treeItem.getAttribute('aria-label');
      expect(ariaLabel).toContain('2 of 3');
    });
  });

  describe('Visual Indicators', () => {
    it('should show typo correction indicator', () => {
      render(<TreeNode {...defaultProps} node={mockTypoCorrectionNode} />);
      
      const indicator = screen.getByText('Did you mean?');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('text-yellow-800');
    });

    it('should show popular indicator for high frequency words', () => {
      const popularNode = { ...mockWordNode, frequency: 150 };
      render(<TreeNode {...defaultProps} node={popularNode} />);
      
      const indicator = screen.getByText('Popular');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('text-green-800');
    });

    it('should show child count for prefix nodes', () => {
      render(<TreeNode {...defaultProps} node={mockPrefixNode} />);
      
      const childCount = screen.getByText('1 items');
      expect(childCount).toBeInTheDocument();
      expect(childCount).toHaveClass('text-gray-500');
    });
  });

  describe('Keyboard Interaction', () => {
    it('should call onKeyDown when key is pressed', async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn();
      
      render(<TreeNode {...defaultProps} node={mockWordNode} onKeyDown={onKeyDown} />);
      
      const treeItem = screen.getByRole('treeitem');
      await user.click(treeItem);
      await user.keyboard('{Enter}');
      
      expect(onKeyDown).toHaveBeenCalled();
    });

    it('should prevent expand button click from bubbling', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      
      render(<TreeNode {...defaultProps} node={mockPrefixNode} onSelect={onSelect} />);
      
      const expandButton = screen.getByRole('button');
      await user.click(expandButton);
      
      // onSelect should not be called when clicking expand button
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('Axe Accessibility Tests', () => {
    it('should not have accessibility violations - word node', async () => {
      const { container } = render(
        <div role="tree">
          <TreeNode {...defaultProps} node={mockWordNode} />
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations - prefix node collapsed', async () => {
      const { container } = render(
        <div role="tree">
          <TreeNode {...defaultProps} node={mockPrefixNode} />
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations - prefix node expanded', async () => {
      const expandedNode = { ...mockPrefixNode, isExpanded: true };
      const { container } = render(
        <div role="tree">
          <TreeNode {...defaultProps} node={expandedNode} />
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations - typo correction', async () => {
      const { container } = render(
        <div role="tree">
          <TreeNode {...defaultProps} node={mockTypoCorrectionNode} />
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations - focused state', async () => {
      const focusedNode = { ...mockWordNode, isFocused: true };
      const { container } = render(
        <div role="tree">
          <TreeNode {...defaultProps} node={focusedNode} />
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations - selected state', async () => {
      const selectedNode = { ...mockWordNode, isSelected: true };
      const { container } = render(
        <div role="tree">
          <TreeNode {...defaultProps} node={selectedNode} />
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations - deep nesting', async () => {
      const deepNode = { ...mockWordNode };
      const { container } = render(
        <div role="tree">
          <TreeNode {...defaultProps} node={deepNode} depth={5} position={3} setSize={7} />
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Screen Reader Content', () => {
    it('should have screen reader only description', () => {
      render(
        <div role="tree">
          <TreeNode {...defaultProps} node={mockWordNode} />
        </div>
      );
      
      const descriptions = document.querySelectorAll('.sr-only');
      const wordDescription = Array.from(descriptions).find(desc =>
        desc.textContent.includes('Selectable word')
      );
      expect(wordDescription).toBeInTheDocument();
      expect(wordDescription).toHaveTextContent('Selectable word');
    });

    it('should have different description for expandable nodes', () => {
      render(
        <div role="tree">
          <TreeNode {...defaultProps} node={mockPrefixNode} />
        </div>
      );
      
      const descriptions = document.querySelectorAll('.sr-only');
      const expandableDescription = Array.from(descriptions).find(desc =>
        desc.textContent.includes('Collapsed group')
      );
      expect(expandableDescription).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing node properties gracefully', async () => {
      const incompleteNode = {
        id: 'incomplete',
        type: NODE_TYPES.WORD,
        content: 'test'
        // Missing other properties
      };
      
      const { container } = render(
        <div role="tree">
          <TreeNode {...defaultProps} node={incompleteNode} />
        </div>
      );
      
      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toBeInTheDocument();
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});