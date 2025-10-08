import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TreeNode, { ExpandIcon, NodeContent } from './TreeNode.jsx';
import { NODE_TYPES } from '../types/tree.js';

// Mock data for testing
const mockPrefixNode = {
  id: 'prefix-1',
  type: NODE_TYPES.PREFIX,
  content: 'test',
  prefix: 'test',
  isExpanded: false,
  isSelected: false,
  depth: 0,
  children: [
    {
      id: 'word-1',
      type: NODE_TYPES.WORD,
      content: 'testing',
      word: 'testing',
      frequency: 10,
      suggestionType: 'exact_match',
      children: [],
      depth: 1
    },
    {
      id: 'word-2',
      type: NODE_TYPES.WORD,
      content: 'tester',
      word: 'tester',
      frequency: 5,
      suggestionType: 'exact_match',
      children: [],
      depth: 1
    }
  ],
  childCount: 2,
  totalFrequency: 15
};

const mockWordNode = {
  id: 'word-1',
  type: NODE_TYPES.WORD,
  content: 'testing',
  word: 'testing',
  frequency: 10,
  suggestionType: 'exact_match',
  children: [],
  depth: 0
};

const mockTypoCorrectionNode = {
  id: 'typo-1',
  type: NODE_TYPES.WORD,
  content: 'testing',
  word: 'testing',
  frequency: 8,
  suggestionType: 'typo_correction',
  originalQuery: 'testng',
  editDistance: 1,
  similarity: 0.9,
  children: [],
  depth: 0
};

describe('ExpandIcon', () => {
  it('renders spacer when node has no children', () => {
    const { container } = render(
      <ExpandIcon isExpanded={false} hasChildren={false} onClick={vi.fn()} />
    );
    
    const spacer = container.querySelector('.w-4.h-4');
    expect(spacer).toBeInTheDocument();
    expect(spacer.tagName).toBe('DIV');
  });

  it('renders expand button when node has children', () => {
    render(
      <ExpandIcon isExpanded={false} hasChildren={true} onClick={vi.fn()} />
    );
    
    const button = screen.getByRole('button', { name: 'Expand' });
    expect(button).toBeInTheDocument();
  });

  it('shows correct aria-label based on expanded state', () => {
    const { rerender } = render(
      <ExpandIcon isExpanded={false} hasChildren={true} onClick={vi.fn()} />
    );
    
    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    
    rerender(
      <ExpandIcon isExpanded={true} hasChildren={true} onClick={vi.fn()} />
    );
    
    expect(screen.getByRole('button', { name: 'Collapse' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(
      <ExpandIcon isExpanded={false} hasChildren={true} onClick={handleClick} />
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct rotation class based on expanded state', () => {
    const { container, rerender } = render(
      <ExpandIcon isExpanded={false} hasChildren={true} onClick={vi.fn()} />
    );
    
    let svg = container.querySelector('svg');
    expect(svg).toHaveClass('rotate-0');
    
    rerender(
      <ExpandIcon isExpanded={true} hasChildren={true} onClick={vi.fn()} />
    );
    
    svg = container.querySelector('svg');
    expect(svg).toHaveClass('rotate-90');
  });
});

describe('NodeContent', () => {
  it('renders word node content correctly', () => {
    render(
      <NodeContent 
        node={mockWordNode} 
        query="test" 
        isSelected={false} 
        onSelect={vi.fn()} 
      />
    );
    
    // Text is split due to highlighting, so check for both parts
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('ing')).toBeInTheDocument();
    expect(screen.getByText('10 searches')).toBeInTheDocument();
  });

  it('renders prefix node content correctly', () => {
    render(
      <NodeContent 
        node={mockPrefixNode} 
        query="test" 
        isSelected={false} 
        onSelect={vi.fn()} 
      />
    );
    
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText('15 total')).toBeInTheDocument();
  });

  it('highlights matching text in word nodes', () => {
    render(
      <NodeContent 
        node={mockWordNode} 
        query="test" 
        isSelected={false} 
        onSelect={vi.fn()} 
      />
    );
    
    const highlighted = screen.getByText('test');
    expect(highlighted).toHaveClass('bg-yellow-200', 'font-semibold');
  });

  it('shows typo correction indicator', () => {
    render(
      <NodeContent 
        node={mockTypoCorrectionNode} 
        query="test" 
        isSelected={false} 
        onSelect={vi.fn()} 
      />
    );
    
    expect(screen.getByText('Did you mean?')).toBeInTheDocument();
  });

  it('calls onSelect when word node is clicked', () => {
    const handleSelect = vi.fn();
    const { container } = render(
      <NodeContent 
        node={mockWordNode} 
        query="test" 
        isSelected={false} 
        onSelect={handleSelect} 
      />
    );
    
    // Click on the container div since text is split
    const clickableDiv = container.querySelector('.cursor-pointer');
    fireEvent.click(clickableDiv);
    expect(handleSelect).toHaveBeenCalledWith(mockWordNode);
  });

  it('does not call onSelect when prefix node is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <NodeContent 
        node={mockPrefixNode} 
        query="test" 
        isSelected={false} 
        onSelect={handleSelect} 
      />
    );
    
    fireEvent.click(screen.getByText('test'));
    expect(handleSelect).not.toHaveBeenCalled();
  });
});

describe('TreeNode', () => {
  let mockOnToggleExpand;
  let mockOnSelect;

  beforeEach(() => {
    mockOnToggleExpand = vi.fn();
    mockOnSelect = vi.fn();
  });

  it('renders word node correctly', () => {
    render(
      <TreeNode 
        node={mockWordNode} 
        query="test" 
        isSelected={false}
        onToggleExpand={mockOnToggleExpand}
        onSelect={mockOnSelect}
      />
    );
    
    expect(screen.getByTestId('tree-node-word-1')).toBeInTheDocument();
    // Text is split due to highlighting, so check for both parts
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('ing')).toBeInTheDocument();
    expect(screen.getByRole('treeitem')).toHaveAttribute('aria-level', '1');
  });

  it('renders prefix node with children correctly', () => {
    render(
      <TreeNode 
        node={mockPrefixNode} 
        query="" 
        isSelected={false}
        onToggleExpand={mockOnToggleExpand}
        onSelect={mockOnSelect}
      />
    );
    
    expect(screen.getByTestId('tree-node-prefix-1')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
  });

  it('applies correct indentation based on depth', () => {
    const { container } = render(
      <TreeNode 
        node={mockWordNode} 
        query="test" 
        isSelected={false}
        onToggleExpand={mockOnToggleExpand}
        onSelect={mockOnSelect}
        depth={2}
      />
    );
    
    const nodeElement = container.querySelector('[role="treeitem"]');
    expect(nodeElement).toHaveStyle('padding-left: 48px'); // 2 * 20 + 8
  });

  it('shows selected state styling', () => {
    const { container } = render(
      <TreeNode 
        node={mockWordNode} 
        query="test" 
        isSelected={true}
        onToggleExpand={mockOnToggleExpand}
        onSelect={mockOnSelect}
      />
    );
    
    const nodeElement = container.querySelector('[role="treeitem"]');
    expect(nodeElement).toHaveClass('bg-blue-50', 'text-blue-900', 'border-l-4', 'border-blue-500');
    expect(nodeElement).toHaveAttribute('tabIndex', '0');
  });

  it('expands and collapses children when expand icon is clicked', async () => {
    const { container } = render(
      <TreeNode 
        node={mockPrefixNode} 
        query="" 
        isSelected={false}
        onToggleExpand={mockOnToggleExpand}
        onSelect={mockOnSelect}
      />
    );
    
    // Initially collapsed, children container should have hidden classes
    const childrenContainer = container.querySelector('.tree-children');
    expect(childrenContainer).toHaveClass('opacity-0', 'max-h-0');
    
    // Click expand button
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
    
    // Should call onToggleExpand
    expect(mockOnToggleExpand).toHaveBeenCalledWith('prefix-1', true);
    
    // Children container should now have visible classes
    await waitFor(() => {
      expect(childrenContainer).toHaveClass('opacity-100', 'max-h-screen');
    });
    
    // Click collapse button
    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
    
    // Should call onToggleExpand again
    expect(mockOnToggleExpand).toHaveBeenCalledWith('prefix-1', false);
  });

  it('renders children with correct depth', async () => {
    // Create expanded node
    const expandedNode = { ...mockPrefixNode, isExpanded: true };
    
    const { container } = render(
      <TreeNode 
        node={expandedNode} 
        query="test" 
        isSelected={false}
        onToggleExpand={mockOnToggleExpand}
        onSelect={mockOnSelect}
        depth={1}
      />
    );
    
    await waitFor(() => {
      const childNodes = container.querySelectorAll('[aria-level="3"]');
      expect(childNodes).toHaveLength(2); // Two child nodes at depth 2 (aria-level 3)
    });
  });

  it('sets correct ARIA attributes', () => {
    const { container } = render(
      <TreeNode 
        node={mockPrefixNode} 
        query="" 
        isSelected={true}
        onToggleExpand={mockOnToggleExpand}
        onSelect={mockOnSelect}
        depth={1}
      />
    );
    
    // Get the main tree item (not the children)
    const treeItem = container.querySelector('[data-testid="tree-node-prefix-1"] > [role="treeitem"]');
    expect(treeItem).toHaveAttribute('aria-expanded', 'false');
    expect(treeItem).toHaveAttribute('aria-level', '2');
    expect(treeItem).toHaveAttribute('aria-selected', 'true');
  });

  it('does not set aria-expanded for leaf nodes', () => {
    render(
      <TreeNode 
        node={mockWordNode} 
        query="test" 
        isSelected={false}
        onToggleExpand={mockOnToggleExpand}
        onSelect={mockOnSelect}
      />
    );
    
    const treeItem = screen.getByRole('treeitem');
    expect(treeItem).not.toHaveAttribute('aria-expanded');
  });

  it('handles node selection correctly', () => {
    const { container } = render(
      <TreeNode 
        node={mockWordNode} 
        query="test" 
        isSelected={false}
        onToggleExpand={mockOnToggleExpand}
        onSelect={mockOnSelect}
      />
    );
    
    // Click on the clickable content div since text is split
    const clickableDiv = container.querySelector('.cursor-pointer');
    fireEvent.click(clickableDiv);
    expect(mockOnSelect).toHaveBeenCalledWith(mockWordNode);
  });

  it('renders typo correction nodes with proper styling', () => {
    render(
      <TreeNode 
        node={mockTypoCorrectionNode} 
        query="test" 
        isSelected={false}
        onToggleExpand={mockOnToggleExpand}
        onSelect={mockOnSelect}
      />
    );
    
    expect(screen.getByText('Did you mean?')).toBeInTheDocument();
    expect(screen.getByText('8 searches')).toBeInTheDocument();
  });
});