import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TreeNode from './TreeNode.jsx';
import { NODE_TYPES } from '../types/tree.js';

// Mock data for visual testing
const createMockNode = (overrides = {}) => ({
  id: 'test-node',
  type: NODE_TYPES.WORD,
  content: 'test',
  word: 'test',
  frequency: 10,
  suggestionType: 'exact_match',
  children: [],
  depth: 0,
  isExpanded: false,
  isSelected: false,
  ...overrides
});

describe('TreeNode Visual Styling', () => {
  it('applies correct CSS classes for different node types', () => {
    const prefixNode = createMockNode({
      type: NODE_TYPES.PREFIX,
      childCount: 5,
      totalFrequency: 50
    });

    const { container } = render(
      <TreeNode node={prefixNode} />
    );

    const nodeContent = container.querySelector('.text-gray-700.font-medium');
    expect(nodeContent).toBeInTheDocument();
  });

  it('applies high frequency styling for popular words', () => {
    const highFrequencyNode = createMockNode({
      frequency: 150
    });

    const { container } = render(
      <TreeNode node={highFrequencyNode} />
    );

    // Should have popular indicator
    expect(container.querySelector('.bg-green-100')).toBeInTheDocument();
    expect(container.querySelector('.text-green-800')).toBeInTheDocument();
  });

  it('applies medium frequency styling', () => {
    const mediumFrequencyNode = createMockNode({
      frequency: 75
    });

    const { container } = render(
      <TreeNode node={mediumFrequencyNode} />
    );

    // Should have semibold styling for high frequency
    expect(container.querySelector('.font-semibold')).toBeInTheDocument();
  });

  it('applies typo correction styling', () => {
    const typoCorrectionNode = createMockNode({
      suggestionType: 'typo_correction',
      originalQuery: 'tset',
      editDistance: 2,
      similarity: 0.8
    });

    const { container } = render(
      <TreeNode node={typoCorrectionNode} />
    );

    // Should have typo correction indicator
    expect(container.querySelector('.bg-yellow-100')).toBeInTheDocument();
    expect(container.querySelector('.text-yellow-800')).toBeInTheDocument();
    expect(container.textContent).toContain('Did you mean?');
  });

  it('applies correct indentation based on depth', () => {
    const deepNode = createMockNode({
      depth: 3
    });

    const { container } = render(
      <TreeNode node={deepNode} depth={3} />
    );

    const treeItem = container.querySelector('[role="treeitem"]');
    expect(treeItem).toHaveStyle('padding-left: 68px'); // 3 * 20 + 8
  });

  it('applies selected state styling', () => {
    const selectedNode = createMockNode({
      isSelected: true
    });

    const { container } = render(
      <TreeNode node={selectedNode} isSelected={true} />
    );

    const treeItem = container.querySelector('[role="treeitem"]');
    expect(treeItem).toHaveClass('bg-blue-50', 'text-blue-900', 'border-l-4', 'border-blue-500');
  });

  it('applies hover effects correctly', () => {
    const wordNode = createMockNode();

    const { container } = render(
      <TreeNode node={wordNode} />
    );

    const nodeContent = container.querySelector('.cursor-pointer');
    expect(nodeContent).toHaveClass('hover:bg-gray-50', 'hover:shadow-sm');
  });

  it('shows frequency with appropriate color coding', () => {
    const scenarios = [
      { frequency: 150, expectedClass: 'text-green-600' },
      { frequency: 75, expectedClass: 'text-blue-600' },
      { frequency: 25, expectedClass: 'text-gray-600' },
      { frequency: 5, expectedClass: 'text-gray-500' }
    ];

    scenarios.forEach(({ frequency, expectedClass }) => {
      const node = createMockNode({ frequency });
      const { container } = render(<TreeNode node={node} />);
      
      const frequencyElement = container.querySelector(`[class*="${expectedClass}"]`);
      expect(frequencyElement).toBeInTheDocument();
    });
  });

  it('applies expand icon styling correctly', () => {
    const parentNode = createMockNode({
      type: NODE_TYPES.PREFIX,
      children: [createMockNode({ id: 'child-1' })],
      childCount: 1
    });

    const { container } = render(
      <TreeNode node={parentNode} />
    );

    const expandButton = container.querySelector('button[aria-label="Expand"]');
    expect(expandButton).toHaveClass(
      'hover:text-gray-700',
      'hover:bg-gray-100',
      'focus:ring-2',
      'focus:ring-blue-500'
    );
  });

  it('applies transition classes for animations', () => {
    const node = createMockNode();

    const { container } = render(
      <TreeNode node={node} />
    );

    const treeItem = container.querySelector('[role="treeitem"]');
    expect(treeItem).toHaveClass('transition-all', 'duration-200');

    const nodeContent = container.querySelector('.cursor-pointer');
    expect(nodeContent).toHaveClass('transition-all', 'duration-150');
  });

  it('applies correct border styling for depth visualization', () => {
    const deepNode = createMockNode();

    const { container } = render(
      <TreeNode node={deepNode} depth={2} />
    );

    const treeItem = container.querySelector('[role="treeitem"]');
    expect(treeItem).toHaveClass('border-l', 'border-gray-200');
  });

  it('shows child count indicator for prefix nodes', () => {
    const prefixNode = createMockNode({
      type: NODE_TYPES.PREFIX,
      childCount: 8,
      totalFrequency: 120
    });

    const { container } = render(
      <TreeNode node={prefixNode} />
    );

    const childCountIndicator = container.querySelector('.bg-gray-100');
    expect(childCountIndicator).toBeInTheDocument();
    expect(childCountIndicator).toHaveClass('border', 'border-gray-200');
    expect(childCountIndicator.textContent).toBe('8 items');
  });

  it('applies rounded corners and shadows appropriately', () => {
    const node = createMockNode();

    const { container } = render(
      <TreeNode node={node} />
    );

    const treeItem = container.querySelector('[role="treeitem"]');
    expect(treeItem).toHaveClass('rounded-md');

    const nodeContent = container.querySelector('.cursor-pointer');
    expect(nodeContent).toHaveClass('rounded-md');
  });

  it('handles expanded state styling for children container', () => {
    const parentNode = createMockNode({
      type: NODE_TYPES.PREFIX,
      children: [createMockNode({ id: 'child-1' })],
      isExpanded: true
    });

    const { container } = render(
      <TreeNode node={parentNode} />
    );

    const childrenContainer = container.querySelector('.tree-children');
    expect(childrenContainer).toHaveClass('opacity-100', 'max-h-screen');
  });

  it('applies correct icon styling for typo corrections', () => {
    const typoCorrectionNode = createMockNode({
      suggestionType: 'typo_correction'
    });

    const { container } = render(
      <TreeNode node={typoCorrectionNode} />
    );

    const icon = container.querySelector('.bg-yellow-100 svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('w-3', 'h-3', 'mr-1');
  });

  it('applies correct icon styling for popular items', () => {
    const popularNode = createMockNode({
      frequency: 150
    });

    const { container } = render(
      <TreeNode node={popularNode} />
    );

    const popularIcon = container.querySelector('.bg-green-100 svg');
    expect(popularIcon).toBeInTheDocument();
    expect(popularIcon).toHaveClass('w-3', 'h-3', 'mr-1');
  });
});