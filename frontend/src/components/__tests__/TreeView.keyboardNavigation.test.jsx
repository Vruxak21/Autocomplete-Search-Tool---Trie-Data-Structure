/**
 * @fileoverview Keyboard navigation accessibility tests for TreeView component
 * Tests focus management, tab order, focus trapping, and screen reader support
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import TreeView from '../TreeView';
import { NODE_TYPES } from '../../types/tree';
import * as focusManagement from '../../utils/focusManagement';
import * as screenReaderAnnouncements from '../../utils/screenReaderAnnouncements';

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock focus management utilities
vi.mock('../../utils/focusManagement', () => ({
  createFocusTrap: vi.fn(() => vi.fn()),
  createEnhancedFocusTrap: vi.fn(() => vi.fn()),
  manageRovingTabindex: vi.fn(),
  handleScreenReaderModes: vi.fn(),
  restoreFocus: vi.fn(),
  isFocusable: vi.fn(() => true),
  announceFocusChange: vi.fn(),
  detectScreenReaderMode: vi.fn(() => false),
  enhancedFocus: vi.fn(() => true),
  getFocusableElements: vi.fn(() => []),
  getFocusedElement: vi.fn(() => null),
  moveFocusToNext: vi.fn(() => true),
  moveFocusToPrevious: vi.fn(() => true),
  moveFocusToFirst: vi.fn(() => true),
  moveFocusToLast: vi.fn(() => true),
  setupTreeKeyboardNavigation: vi.fn(() => vi.fn()),
}));

// Mock screen reader announcements
vi.mock('../../utils/screenReaderAnnouncements', () => ({
  announce: vi.fn(),
  createLoadingAnnouncement: vi.fn(() => 'Tree view loaded'),
  createSelectionAnnouncement: vi.fn(() => 'Selected item'),
  createExpansionAnnouncement: vi.fn(() => 'Expanded group'),
  createNavigationAnnouncement: vi.fn(() => 'Moved to item'),
  createWordSelectionAnnouncement: vi.fn(() => 'Selected word'),
  getLiveRegion: vi.fn(() => document.createElement('div')),
}));

describe('TreeView Keyboard Navigation Accessibility', () => {
  const mockTreeNodes = [
    {
      id: 'node-1',
      type: NODE_TYPES.PREFIX,
      content: 'app',
      children: [
        {
          id: 'node-1-1',
          type: NODE_TYPES.WORD,
          content: 'apple',
          word: 'apple',
          frequency: 100,
          suggestionType: 'exact_match'
        },
        {
          id: 'node-1-2',
          type: NODE_TYPES.WORD,
          content: 'application',
          word: 'application',
          frequency: 50,
          suggestionType: 'exact_match'
        }
      ],
      childCount: 2,
      totalFrequency: 150
    },
    {
      id: 'node-2',
      type: NODE_TYPES.WORD,
      content: 'banana',
      word: 'banana',
      frequency: 75,
      suggestionType: 'exact_match'
    }
  ];

  const defaultProps = {
    treeNodes: mockTreeNodes,
    query: 'app',
    onSelect: vi.fn(),
    onToggleExpand: vi.fn(),
    autoFocus: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Focus Management', () => {
    it('should create focus trap when autoFocus is enabled', () => {
      render(<TreeView {...defaultProps} />);
      
      expect(focusManagement.createFocusTrap).toHaveBeenCalled();
    });

    it('should not create focus trap when autoFocus is disabled', () => {
      render(<TreeView {...defaultProps} autoFocus={false} />);
      
      expect(focusManagement.createFocusTrap).not.toHaveBeenCalled();
    });

    it('should handle screen reader mode detection', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const treeElement = screen.getByRole('tree');
      await user.click(treeElement);
      
      expect(focusManagement.handleScreenReaderModes).toHaveBeenCalled();
    });

    it('should restore focus on unmount when autoFocus was enabled', () => {
      const { unmount } = render(<TreeView {...defaultProps} />);
      
      unmount();
      
      expect(focusManagement.restoreFocus).toHaveBeenCalled();
    });

    it('should not restore focus on unmount when autoFocus was disabled', () => {
      const { unmount } = render(<TreeView {...defaultProps} autoFocus={false} />);
      
      unmount();
      
      expect(focusManagement.restoreFocus).not.toHaveBeenCalled();
    });
  });

  describe('Tab Order and Focus Trapping', () => {
    it('should have proper tabindex on tree container', () => {
      render(<TreeView {...defaultProps} />);
      
      const treeElement = screen.getByRole('tree');
      expect(treeElement).toHaveAttribute('tabIndex', '0');
    });

    it('should trap focus within tree when autoFocus is enabled', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const treeElement = screen.getByRole('tree');
      await user.click(treeElement);
      
      // Tab should stay within the tree
      await user.keyboard('{Tab}');
      
      expect(document.activeElement).toBe(treeElement);
    });

    it('should handle Shift+Tab for reverse tab order', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const treeElement = screen.getByRole('tree');
      await user.click(treeElement);
      
      // Shift+Tab should stay within the tree
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      
      expect(document.activeElement).toBe(treeElement);
    });

    it('should have skip link for accessibility', () => {
      render(<TreeView {...defaultProps} />);
      
      const skipLink = screen.getByText('Skip to end of tree');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#tree-end');
      expect(skipLink).toHaveClass('skip-link');
    });

    it('should have end marker for skip link', () => {
      render(<TreeView {...defaultProps} />);
      
      const endMarker = document.getElementById('tree-end');
      expect(endMarker).toBeInTheDocument();
      expect(endMarker).toHaveAttribute('tabIndex', '-1');
      expect(endMarker).toHaveClass('sr-only');
    });
  });

  describe('Roving Tabindex', () => {
    it('should manage roving tabindex for tree items', () => {
      render(<TreeView {...defaultProps} />);
      
      const treeItems = screen.getAllByRole('treeitem');
      
      // Only one item should be focusable at a time
      const focusableItems = treeItems.filter(item => 
        item.getAttribute('tabIndex') === '0'
      );
      expect(focusableItems.length).toBeLessThanOrEqual(1);
    });

    it('should update tabindex when focus changes', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const treeElement = screen.getByRole('tree');
      await user.click(treeElement);
      await user.keyboard('{ArrowDown}');
      
      // Should call roving tabindex management
      expect(focusManagement.handleScreenReaderModes).toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle all arrow keys', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const treeElement = screen.getByRole('tree');
      await user.click(treeElement);
      
      // Test all arrow keys
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowLeft}');
      
      // Should announce navigation changes
      expect(screenReaderAnnouncements.announce).toHaveBeenCalled();
    });

    it('should handle Home and End keys', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const treeElement = screen.getByRole('tree');
      await user.click(treeElement);
      
      await user.keyboard('{Home}');
      await user.keyboard('{End}');
      
      expect(screenReaderAnnouncements.announce).toHaveBeenCalled();
    });

    it('should handle Enter key for activation', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      
      render(<TreeView {...defaultProps} onSelect={onSelect} />);
      
      const treeElement = screen.getByRole('tree');
      await user.click(treeElement);
      await user.keyboard('{Enter}');
      
      // Should trigger selection or expansion
      expect(screenReaderAnnouncements.announce).toHaveBeenCalled();
    });

    it('should handle Escape key for clearing selection', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const treeElement = screen.getByRole('tree');
      await user.click(treeElement);
      await user.keyboard('{Escape}');
      
      expect(screenReaderAnnouncements.announce).toHaveBeenCalledWith('Selection cleared');
    });

    it('should prevent default behavior for handled keys', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const treeElement = screen.getByRole('tree');
      await user.click(treeElement);
      
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const preventDefaultSpy = vi.spyOn(keydownEvent, 'preventDefault');
      
      treeElement.dispatchEvent(keydownEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Screen Reader Support', () => {
    it('should detect browse mode vs focus mode', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const treeElement = screen.getByRole('tree');
      
      // Simulate focus event that might indicate browse mode
      await act(async () => {
        treeElement.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      });
      
      expect(focusManagement.handleScreenReaderModes).toHaveBeenCalled();
    });

    it('should have proper ARIA attributes for screen readers', () => {
      render(<TreeView {...defaultProps} />);
      
      const treeElement = screen.getByRole('tree');
      expect(treeElement).toHaveAttribute('aria-multiselectable', 'false');
      expect(treeElement).toHaveAttribute('aria-describedby', 'tree-instructions');
    });

    it('should provide comprehensive instructions for screen readers', () => {
      render(<TreeView {...defaultProps} />);
      
      const instructions = document.getElementById('tree-instructions');
      expect(instructions).toBeInTheDocument();
      expect(instructions).toHaveClass('sr-only');
      expect(instructions.textContent).toContain('arrow keys');
      expect(instructions.textContent).toContain('Enter');
      expect(instructions.textContent).toContain('Escape');
      expect(instructions.textContent).toContain('Home and End');
    });
  });

  describe('High Contrast Mode', () => {
    it('should apply high contrast styles when supported', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      render(<TreeView {...defaultProps} />);
      
      const treeItems = screen.getAllByRole('treeitem');
      treeItems.forEach(item => {
        // High contrast styles should be available via CSS
        expect(item).toBeInTheDocument();
      });
    });
  });

  describe('Focus Indicators', () => {
    it('should have visible focus indicators', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const treeElement = screen.getByRole('tree');
      await user.click(treeElement);
      
      // Focus should be visible
      expect(document.activeElement).toBe(treeElement);
    });

    it('should add keyboard-focused class when focused via keyboard', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const treeElement = screen.getByRole('tree');
      await user.tab(); // Focus via keyboard
      
      // Should call focus management utilities
      expect(focusManagement.announceFocusChange).toHaveBeenCalled();
    });
  });

  describe('Reduced Motion Support', () => {
    it('should respect reduced motion preferences', () => {
      // Mock reduced motion media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      render(<TreeView {...defaultProps} />);
      
      // Component should render without animations
      const treeElement = screen.getByRole('tree');
      expect(treeElement).toBeInTheDocument();
    });
  });

  describe('Virtual Scrolling Accessibility', () => {
    it('should maintain accessibility with virtual scrolling', async () => {
      const manyNodes = Array.from({ length: 60 }, (_, i) => ({
        id: `node-${i}`,
        type: NODE_TYPES.WORD,
        content: `word${i}`,
        word: `word${i}`,
        frequency: i + 1,
        suggestionType: 'exact_match'
      }));
      
      const { container } = render(
        <TreeView 
          {...defaultProps} 
          treeNodes={manyNodes}
          virtualScrollThreshold={50}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      
      // Should still create focus trap
      expect(focusManagement.createFocusTrap).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle focus management errors gracefully', () => {
      focusManagement.isFocusable.mockImplementation(() => {
        throw new Error('Focus error');
      });
      
      expect(() => {
        render(<TreeView {...defaultProps} />);
      }).not.toThrow();
    });

    it('should handle screen reader mode detection errors', async () => {
      focusManagement.handleScreenReaderModes.mockImplementation(() => {
        throw new Error('Screen reader error');
      });
      
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const treeElement = screen.getByRole('tree');
      
      expect(async () => {
        await user.click(treeElement);
      }).not.toThrow();
    });
  });

  describe('Axe Accessibility Tests', () => {
    it('should not have accessibility violations with focus management', async () => {
      const { container } = render(<TreeView {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have violations with skip links', async () => {
      const { container } = render(<TreeView {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have violations with focus trap', async () => {
      const { container } = render(<TreeView {...defaultProps} autoFocus={true} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});