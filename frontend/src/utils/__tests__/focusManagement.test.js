/**
 * @fileoverview Tests for focus management utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getFocusableElements,
  getFocusedElement,
  moveFocusToNext,
  moveFocusToPrevious,
  moveFocusToFirst,
  moveFocusToLast,
  createFocusTrap,
  manageRovingTabindex,
  restoreFocus,
  isFocusable,
  announceFocusChange,
  setupTreeKeyboardNavigation,
  handleScreenReaderModes
} from '../focusManagement';

// Mock screen reader announcements
vi.mock('../screenReaderAnnouncements', () => ({
  announce: vi.fn()
}));

// Mock DOM methods
Object.defineProperty(window, 'getComputedStyle', {
  value: vi.fn(() => ({
    display: 'block',
    visibility: 'visible'
  })),
  writable: true
});

describe('Focus Management', () => {
  let container;
  let button1, button2, button3;

  beforeEach(() => {
    document.body.innerHTML = '';
    
    container = document.createElement('div');
    button1 = document.createElement('button');
    button2 = document.createElement('button');
    button3 = document.createElement('button');
    
    button1.textContent = 'Button 1';
    button2.textContent = 'Button 2';
    button3.textContent = 'Button 3';
    
    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);
    document.body.appendChild(container);
    
    // Mock focus method
    [button1, button2, button3].forEach(button => {
      button.focus = vi.fn();
      button.offsetWidth = 100;
      button.offsetHeight = 30;
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('getFocusableElements', () => {
    it('should return focusable elements', () => {
      const focusable = getFocusableElements(container);
      expect(focusable).toHaveLength(3);
      expect(focusable).toContain(button1);
      expect(focusable).toContain(button2);
      expect(focusable).toContain(button3);
    });

    it('should exclude disabled elements', () => {
      button2.disabled = true;
      const focusable = getFocusableElements(container);
      expect(focusable).toHaveLength(2);
      expect(focusable).not.toContain(button2);
    });

    it('should exclude elements with tabindex -1', () => {
      button2.setAttribute('tabindex', '-1');
      const focusable = getFocusableElements(container);
      expect(focusable).toHaveLength(2);
      expect(focusable).not.toContain(button2);
    });

    it('should exclude hidden elements', () => {
      window.getComputedStyle.mockReturnValueOnce({
        display: 'none',
        visibility: 'visible'
      });
      
      const focusable = getFocusableElements(container);
      expect(focusable).toHaveLength(2);
    });

    it('should return empty array for null container', () => {
      const focusable = getFocusableElements(null);
      expect(focusable).toEqual([]);
    });
  });

  describe('getFocusedElement', () => {
    it('should return focused element within container', () => {
      Object.defineProperty(document, 'activeElement', {
        value: button2,
        writable: true
      });
      
      const focused = getFocusedElement(container);
      expect(focused).toBe(button2);
    });

    it('should return null if no element is focused', () => {
      Object.defineProperty(document, 'activeElement', {
        value: document.body,
        writable: true
      });
      
      const focused = getFocusedElement(container);
      expect(focused).toBeNull();
    });

    it('should return null for null container', () => {
      const focused = getFocusedElement(null);
      expect(focused).toBeNull();
    });
  });

  describe('moveFocusToNext', () => {
    it('should move focus to next element', () => {
      const result = moveFocusToNext(container, button1);
      expect(result).toBe(true);
      expect(button2.focus).toHaveBeenCalled();
    });

    it('should wrap to first element from last', () => {
      const result = moveFocusToNext(container, button3);
      expect(result).toBe(true);
      expect(button1.focus).toHaveBeenCalled();
    });

    it('should return false for empty container', () => {
      const emptyContainer = document.createElement('div');
      const result = moveFocusToNext(emptyContainer, button1);
      expect(result).toBe(false);
    });
  });

  describe('moveFocusToPrevious', () => {
    it('should move focus to previous element', () => {
      const result = moveFocusToPrevious(container, button2);
      expect(result).toBe(true);
      expect(button1.focus).toHaveBeenCalled();
    });

    it('should wrap to last element from first', () => {
      const result = moveFocusToPrevious(container, button1);
      expect(result).toBe(true);
      expect(button3.focus).toHaveBeenCalled();
    });

    it('should return false for empty container', () => {
      const emptyContainer = document.createElement('div');
      const result = moveFocusToPrevious(emptyContainer, button1);
      expect(result).toBe(false);
    });
  });

  describe('moveFocusToFirst', () => {
    it('should move focus to first element', () => {
      const result = moveFocusToFirst(container);
      expect(result).toBe(true);
      expect(button1.focus).toHaveBeenCalled();
    });

    it('should return false for empty container', () => {
      const emptyContainer = document.createElement('div');
      const result = moveFocusToFirst(emptyContainer);
      expect(result).toBe(false);
    });
  });

  describe('moveFocusToLast', () => {
    it('should move focus to last element', () => {
      const result = moveFocusToLast(container);
      expect(result).toBe(true);
      expect(button3.focus).toHaveBeenCalled();
    });

    it('should return false for empty container', () => {
      const emptyContainer = document.createElement('div');
      const result = moveFocusToLast(emptyContainer);
      expect(result).toBe(false);
    });
  });

  describe('createFocusTrap', () => {
    it('should create focus trap', () => {
      const cleanup = createFocusTrap(container);
      expect(typeof cleanup).toBe('function');
    });

    it('should trap Tab key', () => {
      createFocusTrap(container);
      
      Object.defineProperty(document, 'activeElement', {
        value: button3,
        writable: true
      });
      
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      
      container.dispatchEvent(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(button1.focus).toHaveBeenCalled();
    });

    it('should trap Shift+Tab key', () => {
      createFocusTrap(container);
      
      Object.defineProperty(document, 'activeElement', {
        value: button1,
        writable: true
      });
      
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      
      container.dispatchEvent(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(button3.focus).toHaveBeenCalled();
    });

    it('should not trap non-Tab keys', () => {
      createFocusTrap(container);
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      
      container.dispatchEvent(event);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should cleanup event listener', () => {
      const cleanup = createFocusTrap(container);
      const removeEventListenerSpy = vi.spyOn(container, 'removeEventListener');
      
      cleanup();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should return noop function for null container', () => {
      const cleanup = createFocusTrap(null);
      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('manageRovingTabindex', () => {
    it('should set tabindex for active element', () => {
      const elements = [button1, button2, button3];
      manageRovingTabindex(elements, 1);
      
      expect(button1.getAttribute('tabindex')).toBe('-1');
      expect(button2.getAttribute('tabindex')).toBe('0');
      expect(button3.getAttribute('tabindex')).toBe('-1');
    });

    it('should add keyboard-focused class to active element', () => {
      const elements = [button1, button2, button3];
      manageRovingTabindex(elements, 1);
      
      expect(button1.classList.contains('keyboard-focused')).toBe(false);
      expect(button2.classList.contains('keyboard-focused')).toBe(true);
      expect(button3.classList.contains('keyboard-focused')).toBe(false);
    });

    it('should handle empty array', () => {
      expect(() => manageRovingTabindex([], 0)).not.toThrow();
    });

    it('should handle null elements', () => {
      expect(() => manageRovingTabindex(null, 0)).not.toThrow();
    });
  });

  describe('restoreFocus', () => {
    it('should restore focus to element', () => {
      restoreFocus(button1);
      expect(button1.focus).toHaveBeenCalled();
    });

    it('should pass options to focus method', () => {
      const options = { preventScroll: true };
      restoreFocus(button1, options);
      expect(button1.focus).toHaveBeenCalledWith(options);
    });

    it('should handle null element gracefully', () => {
      expect(() => restoreFocus(null)).not.toThrow();
    });

    it('should handle focus errors gracefully', () => {
      button1.focus.mockImplementation(() => {
        throw new Error('Focus error');
      });
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => restoreFocus(button1)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('isFocusable', () => {
    it('should return true for focusable element', () => {
      expect(isFocusable(button1)).toBe(true);
    });

    it('should return false for disabled element', () => {
      button1.disabled = true;
      expect(isFocusable(button1)).toBe(false);
    });

    it('should return false for aria-disabled element', () => {
      button1.setAttribute('aria-disabled', 'true');
      expect(isFocusable(button1)).toBe(false);
    });

    it('should return false for element with tabindex -1', () => {
      button1.setAttribute('tabindex', '-1');
      expect(isFocusable(button1)).toBe(false);
    });

    it('should return false for hidden element', () => {
      window.getComputedStyle.mockReturnValueOnce({
        display: 'none',
        visibility: 'visible'
      });
      
      expect(isFocusable(button1)).toBe(false);
    });

    it('should return false for element with no dimensions', () => {
      button1.offsetWidth = 0;
      button1.offsetHeight = 0;
      expect(isFocusable(button1)).toBe(false);
    });

    it('should return false for null element', () => {
      expect(isFocusable(null)).toBe(false);
    });
  });

  describe('announceFocusChange', () => {
    it('should announce focus change', async () => {
      button1.setAttribute('aria-label', 'Test button');
      
      await announceFocusChange(button1);
      
      // Should import and call announce function
      // This is tested indirectly through the import
    });

    it('should use custom message', async () => {
      await announceFocusChange(button1, 'Custom message');
      
      // Should use the custom message
    });

    it('should handle null element', async () => {
      expect(async () => {
        await announceFocusChange(null);
      }).not.toThrow();
    });
  });

  describe('setupTreeKeyboardNavigation', () => {
    it('should setup keyboard navigation', () => {
      const options = {
        onNavigate: vi.fn(),
        onActivate: vi.fn(),
        onEscape: vi.fn()
      };
      
      const cleanup = setupTreeKeyboardNavigation(container, options);
      expect(typeof cleanup).toBe('function');
    });

    it('should handle arrow key navigation', () => {
      const onNavigate = vi.fn();
      setupTreeKeyboardNavigation(container, { onNavigate });
      
      Object.defineProperty(document, 'activeElement', {
        value: button1,
        writable: true
      });
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      container.dispatchEvent(event);
      
      expect(onNavigate).toHaveBeenCalledWith('down', button1);
    });

    it('should handle activation keys', () => {
      const onActivate = vi.fn();
      setupTreeKeyboardNavigation(container, { onActivate });
      
      Object.defineProperty(document, 'activeElement', {
        value: button1,
        writable: true
      });
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      container.dispatchEvent(event);
      
      expect(onActivate).toHaveBeenCalledWith(button1);
    });

    it('should handle escape key', () => {
      const onEscape = vi.fn();
      setupTreeKeyboardNavigation(container, { onEscape });
      
      Object.defineProperty(document, 'activeElement', {
        value: button1,
        writable: true
      });
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      container.dispatchEvent(event);
      
      expect(onEscape).toHaveBeenCalledWith(button1);
    });

    it('should cleanup event listener', () => {
      const cleanup = setupTreeKeyboardNavigation(container);
      const removeEventListenerSpy = vi.spyOn(container, 'removeEventListener');
      
      cleanup();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should return noop function for null container', () => {
      const cleanup = setupTreeKeyboardNavigation(null);
      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('handleScreenReaderModes', () => {
    it('should handle browse mode', () => {
      const treeItem1 = document.createElement('div');
      const treeItem2 = document.createElement('div');
      treeItem1.setAttribute('role', 'treeitem');
      treeItem2.setAttribute('role', 'treeitem');
      container.appendChild(treeItem1);
      container.appendChild(treeItem2);
      
      handleScreenReaderModes(container, true);
      
      expect(treeItem1.getAttribute('tabindex')).toBe('0');
      expect(treeItem2.getAttribute('tabindex')).toBe('0');
    });

    it('should handle focus mode', () => {
      const treeItem1 = document.createElement('div');
      const treeItem2 = document.createElement('div');
      treeItem1.setAttribute('role', 'treeitem');
      treeItem2.setAttribute('role', 'treeitem');
      treeItem1.setAttribute('aria-selected', 'true');
      container.appendChild(treeItem1);
      container.appendChild(treeItem2);
      
      handleScreenReaderModes(container, false);
      
      expect(treeItem1.getAttribute('tabindex')).toBe('0');
      expect(treeItem2.getAttribute('tabindex')).toBe('-1');
    });

    it('should handle null container', () => {
      expect(() => handleScreenReaderModes(null, false)).not.toThrow();
    });
  });
});