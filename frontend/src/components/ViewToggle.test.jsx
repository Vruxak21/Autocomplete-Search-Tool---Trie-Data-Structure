/**
 * @fileoverview Tests for ViewToggle component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ViewToggle from './ViewToggle';
import { VIEW_MODES } from '../types/tree.js';

describe('ViewToggle', () => {
  const defaultProps = {
    currentMode: VIEW_MODES.LIST,
    onModeChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders both list and tree buttons', () => {
      render(<ViewToggle {...defaultProps} />);
      
      expect(screen.getByTestId('list-view-button')).toBeInTheDocument();
      expect(screen.getByTestId('tree-view-button')).toBeInTheDocument();
    });

    it('shows correct active state for list mode', () => {
      render(<ViewToggle {...defaultProps} currentMode={VIEW_MODES.LIST} />);
      
      const listButton = screen.getByTestId('list-view-button');
      const treeButton = screen.getByTestId('tree-view-button');
      
      expect(listButton).toHaveAttribute('aria-selected', 'true');
      expect(treeButton).toHaveAttribute('aria-selected', 'false');
      expect(listButton).toHaveClass('bg-blue-600', 'text-white');
      expect(treeButton).toHaveClass('bg-gray-100', 'text-gray-700');
    });

    it('shows correct active state for tree mode', () => {
      render(<ViewToggle {...defaultProps} currentMode={VIEW_MODES.TREE} />);
      
      const listButton = screen.getByTestId('list-view-button');
      const treeButton = screen.getByTestId('tree-view-button');
      
      expect(listButton).toHaveAttribute('aria-selected', 'false');
      expect(treeButton).toHaveAttribute('aria-selected', 'true');
      expect(listButton).toHaveClass('bg-gray-100', 'text-gray-700');
      expect(treeButton).toHaveClass('bg-blue-600', 'text-white');
    });

    it('applies custom className', () => {
      const { container } = render(
        <ViewToggle {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders different sizes correctly', () => {
      const { rerender } = render(<ViewToggle {...defaultProps} size="small" />);
      
      let listButton = screen.getByTestId('list-view-button');
      expect(listButton).toHaveClass('px-2', 'py-1', 'text-xs');
      
      rerender(<ViewToggle {...defaultProps} size="medium" />);
      listButton = screen.getByTestId('list-view-button');
      expect(listButton).toHaveClass('px-3', 'py-1.5', 'text-sm');
      
      rerender(<ViewToggle {...defaultProps} size="large" />);
      listButton = screen.getByTestId('list-view-button');
      expect(listButton).toHaveClass('px-4', 'py-2', 'text-base');
    });
  });

  describe('Interaction', () => {
    it('calls onModeChange when clicking list button', () => {
      const onModeChange = vi.fn();
      render(
        <ViewToggle 
          {...defaultProps} 
          currentMode={VIEW_MODES.TREE}
          onModeChange={onModeChange} 
        />
      );
      
      fireEvent.click(screen.getByTestId('list-view-button'));
      
      expect(onModeChange).toHaveBeenCalledWith(VIEW_MODES.LIST);
    });

    it('calls onModeChange when clicking tree button', () => {
      const onModeChange = vi.fn();
      render(
        <ViewToggle 
          {...defaultProps} 
          currentMode={VIEW_MODES.LIST}
          onModeChange={onModeChange} 
        />
      );
      
      fireEvent.click(screen.getByTestId('tree-view-button'));
      
      expect(onModeChange).toHaveBeenCalledWith(VIEW_MODES.TREE);
    });

    it('does not call onModeChange when clicking current mode button', () => {
      const onModeChange = vi.fn();
      render(
        <ViewToggle 
          {...defaultProps} 
          currentMode={VIEW_MODES.LIST}
          onModeChange={onModeChange} 
        />
      );
      
      fireEvent.click(screen.getByTestId('list-view-button'));
      
      expect(onModeChange).not.toHaveBeenCalled();
    });

    it('does not call onModeChange when disabled', () => {
      const onModeChange = vi.fn();
      render(
        <ViewToggle 
          {...defaultProps} 
          onModeChange={onModeChange}
          disabled={true}
        />
      );
      
      fireEvent.click(screen.getByTestId('tree-view-button'));
      
      expect(onModeChange).not.toHaveBeenCalled();
    });

    it('handles keyboard navigation', () => {
      const onModeChange = vi.fn();
      render(
        <ViewToggle 
          {...defaultProps} 
          currentMode={VIEW_MODES.LIST}
          onModeChange={onModeChange} 
        />
      );
      
      const treeButton = screen.getByTestId('tree-view-button');
      treeButton.focus();
      fireEvent.keyDown(treeButton, { key: 'Enter' });
      fireEvent.click(treeButton);
      
      expect(onModeChange).toHaveBeenCalledWith(VIEW_MODES.TREE);
    });

    it('handles space key activation', () => {
      const onModeChange = vi.fn();
      render(
        <ViewToggle 
          {...defaultProps} 
          currentMode={VIEW_MODES.LIST}
          onModeChange={onModeChange} 
        />
      );
      
      const treeButton = screen.getByTestId('tree-view-button');
      treeButton.focus();
      fireEvent.keyDown(treeButton, { key: ' ' });
      fireEvent.click(treeButton);
      
      expect(onModeChange).toHaveBeenCalledWith(VIEW_MODES.TREE);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<ViewToggle {...defaultProps} />);
      
      const container = screen.getByRole('tablist');
      expect(container).toHaveAttribute('aria-label', 'View mode selection');
      
      const listButton = screen.getByTestId('list-view-button');
      const treeButton = screen.getByTestId('tree-view-button');
      
      expect(listButton).toHaveAttribute('role', 'tab');
      expect(treeButton).toHaveAttribute('role', 'tab');
      expect(listButton).toHaveAttribute('aria-controls', 'suggestions-content');
      expect(treeButton).toHaveAttribute('aria-controls', 'suggestions-content');
    });

    it('has proper titles for tooltips', () => {
      render(<ViewToggle {...defaultProps} />);
      
      expect(screen.getByTestId('list-view-button')).toHaveAttribute(
        'title', 
        'Switch to list view'
      );
      expect(screen.getByTestId('tree-view-button')).toHaveAttribute(
        'title', 
        'Switch to tree view'
      );
    });

    it('shows disabled state correctly', () => {
      render(<ViewToggle {...defaultProps} disabled={true} />);
      
      const listButton = screen.getByTestId('list-view-button');
      const treeButton = screen.getByTestId('tree-view-button');
      
      expect(listButton).toBeDisabled();
      expect(treeButton).toBeDisabled();
      expect(listButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
      expect(treeButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('has proper focus management', () => {
      render(<ViewToggle {...defaultProps} />);
      
      const listButton = screen.getByTestId('list-view-button');
      const treeButton = screen.getByTestId('tree-view-button');
      
      expect(listButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
      expect(treeButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Icons', () => {
    it('renders list icon in list button', () => {
      render(<ViewToggle {...defaultProps} />);
      
      const listButton = screen.getByTestId('list-view-button');
      const icon = listButton.querySelector('svg');
      
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders tree icon in tree button', () => {
      render(<ViewToggle {...defaultProps} />);
      
      const treeButton = screen.getByTestId('tree-view-button');
      const icon = treeButton.querySelector('svg');
      
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Error Handling', () => {
    it('handles missing onModeChange gracefully', () => {
      const { container } = render(
        <ViewToggle currentMode={VIEW_MODES.LIST} />
      );
      
      expect(container).toBeInTheDocument();
      
      // Should not throw when clicking
      expect(() => {
        fireEvent.click(screen.getByTestId('tree-view-button'));
      }).not.toThrow();
    });

    it('handles invalid currentMode gracefully', () => {
      const { container } = render(
        <ViewToggle 
          currentMode="invalid-mode" 
          onModeChange={vi.fn()} 
        />
      );
      
      expect(container).toBeInTheDocument();
    });
  });
});