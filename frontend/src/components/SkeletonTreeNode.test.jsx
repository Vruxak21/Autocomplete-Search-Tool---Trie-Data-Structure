import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import SkeletonTreeNode, { SkeletonTreeView, TreeLoadingState } from './SkeletonTreeNode.jsx';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('SkeletonTreeNode Component', () => {
  describe('Basic Functionality', () => {
    it('renders skeleton tree node correctly', () => {
      render(<SkeletonTreeNode />);
      expect(screen.getByTestId('skeleton-tree-node')).toBeInTheDocument();
    });

    it('applies correct depth indentation', () => {
      render(<SkeletonTreeNode depth={2} />);
      const container = screen.getByTestId('skeleton-tree-node');
      const nodeContainer = container.querySelector('.skeleton-node-container');
      expect(nodeContainer).toHaveStyle('padding-left: 48px'); // 2 * 20 + 8
    });

    it('shows children when showChildren is true', () => {
      render(<SkeletonTreeNode showChildren={true} childrenCount={2} />);
      const childrenContainer = screen.getByTestId('skeleton-tree-node').querySelector('.skeleton-children');
      expect(childrenContainer).toBeInTheDocument();
      expect(childrenContainer.children).toHaveLength(2);
    });

    it('hides children when showChildren is false', () => {
      render(<SkeletonTreeNode showChildren={false} />);
      const childrenContainer = screen.getByTestId('skeleton-tree-node').querySelector('.skeleton-children');
      expect(childrenContainer).not.toBeInTheDocument();
    });

    it('applies animation classes when animate is true', () => {
      render(<SkeletonTreeNode animate={true} />);
      const container = screen.getByTestId('skeleton-tree-node');
      expect(container).toHaveClass('skeleton-animate');
    });

    it('does not apply animation classes when animate is false', () => {
      render(<SkeletonTreeNode animate={false} />);
      const container = screen.getByTestId('skeleton-tree-node');
      expect(container).not.toHaveClass('skeleton-animate');
    });

    it('applies variant classes correctly', () => {
      render(<SkeletonTreeNode variant="compact" />);
      const container = screen.getByTestId('skeleton-tree-node');
      expect(container).toHaveClass('skeleton-compact');
    });
  });

  describe('Variants', () => {
    it('renders default variant correctly', () => {
      render(<SkeletonTreeNode variant="default" />);
      const container = screen.getByTestId('skeleton-tree-node');
      expect(container).not.toHaveClass('skeleton-compact');
      expect(container).not.toHaveClass('skeleton-detailed');
    });

    it('renders compact variant correctly', () => {
      render(<SkeletonTreeNode variant="compact" />);
      const container = screen.getByTestId('skeleton-tree-node');
      expect(container).toHaveClass('skeleton-compact');
    });

    it('renders detailed variant correctly', () => {
      render(<SkeletonTreeNode variant="detailed" />);
      const container = screen.getByTestId('skeleton-tree-node');
      expect(container).toHaveClass('skeleton-detailed');
    });
  });

  describe('Accessibility', () => {
    it('passes accessibility audit', async () => {
      const { container } = render(<SkeletonTreeNode />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper test id for testing', () => {
      render(<SkeletonTreeNode />);
      expect(screen.getByTestId('skeleton-tree-node')).toBeInTheDocument();
    });
  });
});

describe('SkeletonTreeView Component', () => {
  describe('Basic Functionality', () => {
    it('renders skeleton tree view correctly', () => {
      render(<SkeletonTreeView />);
      expect(screen.getByTestId('skeleton-tree-view')).toBeInTheDocument();
    });

    it('renders correct number of skeleton nodes', () => {
      render(<SkeletonTreeView nodeCount={3} />);
      const container = screen.getByTestId('skeleton-tree-view');
      const skeletonNodes = container.querySelectorAll('[data-testid="skeleton-tree-node"]');
      expect(skeletonNodes).toHaveLength(3);
    });

    it('renders header with skeleton elements', () => {
      render(<SkeletonTreeView />);
      const container = screen.getByTestId('skeleton-tree-view');
      const header = container.querySelector('.skeleton-tree-header');
      expect(header).toBeInTheDocument();
      expect(header.querySelector('.skeleton-header-text')).toBeInTheDocument();
      expect(header.querySelector('.skeleton-toggle')).toBeInTheDocument();
    });

    it('applies animation classes when animate is true', () => {
      render(<SkeletonTreeView animate={true} />);
      const container = screen.getByTestId('skeleton-tree-view');
      const animatedElements = container.querySelectorAll('.skeleton-pulse');
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it('does not apply animation classes when animate is false', () => {
      render(<SkeletonTreeView animate={false} />);
      const container = screen.getByTestId('skeleton-tree-view');
      const animatedElements = container.querySelectorAll('.skeleton-pulse');
      expect(animatedElements).toHaveLength(0);
    });
  });

  describe('Accessibility', () => {
    it('passes accessibility audit', async () => {
      const { container } = render(<SkeletonTreeView />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

describe('TreeLoadingState Component', () => {
  describe('Basic Functionality', () => {
    it('renders loading state correctly', () => {
      render(<TreeLoadingState />);
      expect(screen.getByTestId('tree-loading-state')).toBeInTheDocument();
    });

    it('displays custom loading message', () => {
      const message = 'Custom loading message';
      render(<TreeLoadingState message={message} />);
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it('displays default loading message when none provided', () => {
      render(<TreeLoadingState />);
      expect(screen.getByText('Building tree structure...')).toBeInTheDocument();
    });

    it('shows progress bar when progress is provided', () => {
      render(<TreeLoadingState progress={50} />);
      const progressBar = screen.getByTestId('tree-loading-state').querySelector('.progress-bar');
      expect(progressBar).toBeInTheDocument();
      
      const progressFill = progressBar.querySelector('.progress-fill');
      expect(progressFill).toHaveStyle('width: 50%');
      
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('hides progress bar when progress is null', () => {
      render(<TreeLoadingState progress={null} />);
      const progressBar = screen.getByTestId('tree-loading-state').querySelector('.progress-bar');
      expect(progressBar).not.toBeInTheDocument();
    });

    it('shows skeleton when showSkeleton is true', () => {
      render(<TreeLoadingState showSkeleton={true} />);
      expect(screen.getByTestId('skeleton-tree-view')).toBeInTheDocument();
    });

    it('hides skeleton when showSkeleton is false', () => {
      render(<TreeLoadingState showSkeleton={false} />);
      expect(screen.queryByTestId('skeleton-tree-view')).not.toBeInTheDocument();
    });

    it('applies spin animation to spinner when animate is true', () => {
      render(<TreeLoadingState animate={true} />);
      const spinner = screen.getByTestId('tree-loading-state').querySelector('.loading-spinner');
      expect(spinner).toHaveClass('spin');
    });

    it('does not apply spin animation when animate is false', () => {
      render(<TreeLoadingState animate={false} />);
      const spinner = screen.getByTestId('tree-loading-state').querySelector('.loading-spinner');
      expect(spinner).not.toHaveClass('spin');
    });
  });

  describe('Progress Handling', () => {
    it('handles progress values correctly', () => {
      const { rerender } = render(<TreeLoadingState progress={0} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
      
      rerender(<TreeLoadingState progress={100} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('clamps progress values to valid range', () => {
      const { rerender } = render(<TreeLoadingState progress={-10} />);
      const progressFill = screen.getByTestId('tree-loading-state').querySelector('.progress-fill');
      expect(progressFill).toHaveStyle('width: 0%');
      
      rerender(<TreeLoadingState progress={150} />);
      expect(progressFill).toHaveStyle('width: 100%');
    });

    it('rounds progress values for display', () => {
      render(<TreeLoadingState progress={33.7} />);
      expect(screen.getByText('34%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('passes accessibility audit', async () => {
      const { container } = render(<TreeLoadingState />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper loading message structure', () => {
      render(<TreeLoadingState message="Loading..." />);
      const loadingMessage = screen.getByTestId('tree-loading-state').querySelector('.loading-message');
      expect(loadingMessage).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty message gracefully', () => {
      render(<TreeLoadingState message="" />);
      const container = screen.getByTestId('tree-loading-state');
      expect(container).toBeInTheDocument();
    });

    it('handles undefined progress gracefully', () => {
      render(<TreeLoadingState progress={undefined} />);
      const progressBar = screen.getByTestId('tree-loading-state').querySelector('.progress-bar');
      expect(progressBar).not.toBeInTheDocument();
    });

    it('handles NaN progress gracefully', () => {
      render(<TreeLoadingState progress={NaN} />);
      const progressFill = screen.getByTestId('tree-loading-state').querySelector('.progress-fill');
      expect(progressFill).toHaveStyle('width: 0%');
    });
  });
});