/**
 * @fileoverview Focus management utilities for tree navigation
 * Provides functions for managing focus, tab order, and focus trapping
 */

/**
 * Gets all focusable elements within a container
 * @param {HTMLElement} container - The container to search within
 * @returns {HTMLElement[]} Array of focusable elements
 */
export function getFocusableElements(container) {
  if (!container) return [];
  
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[role="treeitem"]:not([tabindex="-1"])',
    '[role="button"]:not([disabled])',
    '[contenteditable="true"]'
  ].join(', ');
  
  return Array.from(container.querySelectorAll(focusableSelectors))
    .filter(element => {
      // Check if element is visible and not hidden
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             element.offsetWidth > 0 && 
             element.offsetHeight > 0;
    });
}

/**
 * Gets the currently focused element within a container
 * @param {HTMLElement} container - The container to search within
 * @returns {HTMLElement|null} The focused element or null
 */
export function getFocusedElement(container) {
  if (!container) return null;
  
  const activeElement = document.activeElement;
  return container.contains(activeElement) ? activeElement : null;
}

/**
 * Moves focus to the next focusable element
 * @param {HTMLElement} container - The container to search within
 * @param {HTMLElement} currentElement - The currently focused element
 * @returns {boolean} True if focus was moved, false otherwise
 */
export function moveFocusToNext(container, currentElement) {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return false;
  
  const currentIndex = focusableElements.indexOf(currentElement);
  const nextIndex = (currentIndex + 1) % focusableElements.length;
  
  focusableElements[nextIndex].focus();
  return true;
}

/**
 * Moves focus to the previous focusable element
 * @param {HTMLElement} container - The container to search within
 * @param {HTMLElement} currentElement - The currently focused element
 * @returns {boolean} True if focus was moved, false otherwise
 */
export function moveFocusToPrevious(container, currentElement) {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return false;
  
  const currentIndex = focusableElements.indexOf(currentElement);
  const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
  
  focusableElements[prevIndex].focus();
  return true;
}

/**
 * Moves focus to the first focusable element
 * @param {HTMLElement} container - The container to search within
 * @returns {boolean} True if focus was moved, false otherwise
 */
export function moveFocusToFirst(container) {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return false;
  
  focusableElements[0].focus();
  return true;
}

/**
 * Moves focus to the last focusable element
 * @param {HTMLElement} container - The container to search within
 * @returns {boolean} True if focus was moved, false otherwise
 */
export function moveFocusToLast(container) {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return false;
  
  focusableElements[focusableElements.length - 1].focus();
  return true;
}

/**
 * Creates a focus trap within a container
 * @param {HTMLElement} container - The container to trap focus within
 * @returns {Function} Function to remove the focus trap
 */
export function createFocusTrap(container) {
  if (!container) return () => {};
  
  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      // Shift + Tab - move to previous element
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab - move to next element
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };
  
  container.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Manages roving tabindex for a group of elements
 * @param {HTMLElement[]} elements - Array of elements to manage
 * @param {number} activeIndex - Index of the currently active element
 */
export function manageRovingTabindex(elements, activeIndex = 0) {
  if (!elements || elements.length === 0) return;
  
  elements.forEach((element, index) => {
    if (index === activeIndex) {
      element.setAttribute('tabindex', '0');
      element.classList.add('keyboard-focused');
    } else {
      element.setAttribute('tabindex', '-1');
      element.classList.remove('keyboard-focused');
    }
  });
}

/**
 * Restores focus to a previously focused element
 * @param {HTMLElement} element - The element to restore focus to
 * @param {Object} options - Options for focus restoration
 * @param {boolean} options.preventScroll - Whether to prevent scrolling
 */
export function restoreFocus(element, options = {}) {
  if (!element || typeof element.focus !== 'function') return;
  
  try {
    element.focus(options);
  } catch (error) {
    console.warn('Failed to restore focus:', error);
  }
}

/**
 * Checks if an element is currently visible and focusable
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} True if the element is focusable
 */
export function isFocusable(element) {
  if (!element) return false;
  
  // Check if element is disabled
  if (element.disabled || element.getAttribute('aria-disabled') === 'true') {
    return false;
  }
  
  // Check if element has negative tabindex
  const tabindex = element.getAttribute('tabindex');
  if (tabindex === '-1') return false;
  
  // Check if element is visible
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }
  
  // Check if element has dimensions
  if (element.offsetWidth === 0 && element.offsetHeight === 0) {
    return false;
  }
  
  return true;
}

/**
 * Announces focus changes to screen readers
 * @param {HTMLElement} element - The newly focused element
 * @param {string} customMessage - Custom message to announce
 */
export function announceFocusChange(element, customMessage) {
  if (!element) return;
  
  // Use existing screen reader announcement utility
  import('./screenReaderAnnouncements.js').then(({ announce }) => {
    const message = customMessage || 
      element.getAttribute('aria-label') || 
      element.textContent || 
      'Focus moved';
    
    announce(message, 50); // Short delay to avoid interrupting navigation
  });
}

/**
 * Sets up keyboard navigation for a tree structure
 * @param {HTMLElement} treeContainer - The tree container element
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function
 */
export function setupTreeKeyboardNavigation(treeContainer, options = {}) {
  if (!treeContainer) return () => {};
  
  const {
    onNavigate = () => {},
    onActivate = () => {},
    onEscape = () => {},
    announceChanges = true
  } = options;
  
  const handleKeyDown = (event) => {
    const currentElement = document.activeElement;
    if (!treeContainer.contains(currentElement)) return;
    
    let handled = false;
    
    switch (event.key) {
      case 'ArrowDown':
        handled = true;
        onNavigate('down', currentElement);
        break;
      case 'ArrowUp':
        handled = true;
        onNavigate('up', currentElement);
        break;
      case 'ArrowRight':
        handled = true;
        onNavigate('right', currentElement);
        break;
      case 'ArrowLeft':
        handled = true;
        onNavigate('left', currentElement);
        break;
      case 'Home':
        handled = true;
        onNavigate('home', currentElement);
        break;
      case 'End':
        handled = true;
        onNavigate('end', currentElement);
        break;
      case 'Enter':
      case ' ':
        handled = true;
        onActivate(currentElement);
        break;
      case 'Escape':
        handled = true;
        onEscape(currentElement);
        break;
    }
    
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      
      if (announceChanges) {
        announceFocusChange(document.activeElement);
      }
    }
  };
  
  treeContainer.addEventListener('keydown', handleKeyDown);
  
  return () => {
    treeContainer.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Manages focus for screen reader browse vs focus modes
 * @param {HTMLElement} container - The container element
 * @param {boolean} isBrowseMode - Whether screen reader is in browse mode
 */
export function handleScreenReaderModes(container, isBrowseMode = false) {
  if (!container) return;
  
  const treeItems = container.querySelectorAll('[role="treeitem"]');
  
  if (isBrowseMode) {
    // In browse mode, make all items focusable for virtual cursor
    treeItems.forEach(item => {
      item.setAttribute('tabindex', '0');
      item.classList.add('browse-mode');
      item.classList.remove('focus-mode');
    });
  } else {
    // In focus mode, use roving tabindex
    const focusedItem = container.querySelector('[role="treeitem"][aria-selected="true"]') ||
                       container.querySelector('[role="treeitem"][aria-current="true"]') ||
                       container.querySelector('[role="treeitem"]');
    
    if (focusedItem) {
      const allItems = Array.from(treeItems);
      const focusedIndex = allItems.indexOf(focusedItem);
      manageRovingTabindex(allItems, focusedIndex);
      
      // Add focus mode classes
      allItems.forEach(item => {
        item.classList.add('focus-mode');
        item.classList.remove('browse-mode');
      });
    }
  }
}

/**
 * Detects screen reader mode based on user interaction patterns
 * @param {HTMLElement} element - The element that received focus
 * @returns {boolean} True if likely in browse mode
 */
export function detectScreenReaderMode(element) {
  if (!element) return false;
  
  // Check if focus came from virtual cursor (no focus-visible)
  const isFocusVisible = element.matches(':focus-visible');
  const hasKeyboardFocusClass = element.classList.contains('keyboard-focused');
  
  // If element is focused but not focus-visible and doesn't have keyboard focus class,
  // it's likely from virtual cursor (browse mode)
  return !isFocusVisible && !hasKeyboardFocusClass;
}

/**
 * Enhanced focus management with better screen reader support
 * @param {HTMLElement} element - Element to focus
 * @param {Object} options - Focus options
 * @param {boolean} options.preventScroll - Prevent scrolling
 * @param {boolean} options.announceChange - Whether to announce the change
 * @param {string} options.customMessage - Custom announcement message
 */
export function enhancedFocus(element, options = {}) {
  if (!element || !isFocusable(element)) return false;
  
  const { 
    preventScroll = false, 
    announceChange = true, 
    customMessage 
  } = options;
  
  try {
    // Set focus with options
    element.focus({ preventScroll });
    
    // Add visual focus indicator
    element.classList.add('keyboard-focused');
    
    // Announce change if requested
    if (announceChange) {
      announceFocusChange(element, customMessage);
    }
    
    // Remove focus indicator after a delay to avoid visual clutter
    setTimeout(() => {
      if (document.activeElement !== element) {
        element.classList.remove('keyboard-focused');
      }
    }, 100);
    
    return true;
  } catch (error) {
    console.warn('Enhanced focus failed:', error);
    return false;
  }
}

/**
 * Creates an enhanced focus trap with better accessibility support
 * @param {HTMLElement} container - The container to trap focus within
 * @param {Object} options - Configuration options
 * @returns {Function} Function to remove the focus trap
 */
export function createEnhancedFocusTrap(container, options = {}) {
  if (!container) return () => {};
  
  const {
    includeContainer = true,
    returnFocusOnDeactivate = true,
    allowOutsideClick = false,
    escapeDeactivates = true
  } = options;
  
  let previouslyFocusedElement = document.activeElement;
  
  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && escapeDeactivates) {
      event.preventDefault();
      deactivate();
      return;
    }
    
    if (event.key !== 'Tab') return;
    
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      // Shift + Tab - move to previous element
      if (document.activeElement === firstElement) {
        event.preventDefault();
        enhancedFocus(lastElement, { announceChange: true });
      }
    } else {
      // Tab - move to next element
      if (document.activeElement === lastElement) {
        event.preventDefault();
        enhancedFocus(firstElement, { announceChange: true });
      }
    }
  };
  
  const handleClick = (event) => {
    if (!allowOutsideClick && !container.contains(event.target)) {
      event.preventDefault();
      // Return focus to first focusable element
      const focusableElements = getFocusableElements(container);
      if (focusableElements.length > 0) {
        enhancedFocus(focusableElements[0]);
      }
    }
  };
  
  const deactivate = () => {
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('click', handleClick, true);
    
    if (returnFocusOnDeactivate && previouslyFocusedElement) {
      restoreFocus(previouslyFocusedElement, { preventScroll: true });
    }
  };
  
  // Activate the focus trap
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('click', handleClick, true);
  
  // Focus the first focusable element if includeContainer is true
  if (includeContainer) {
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      enhancedFocus(focusableElements[0]);
    }
  }
  
  return deactivate;
}

// Default export with all functions
export default {
  getFocusableElements,
  getFocusedElement,
  moveFocusToNext,
  moveFocusToPrevious,
  moveFocusToFirst,
  moveFocusToLast,
  createFocusTrap,
  createEnhancedFocusTrap,
  manageRovingTabindex,
  restoreFocus,
  isFocusable,
  announceFocusChange,
  setupTreeKeyboardNavigation,
  handleScreenReaderModes,
  detectScreenReaderMode,
  enhancedFocus
};