/**
 * @fileoverview Tests for screen reader announcement utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NODE_TYPES } from '../../types/tree';
import {
  createLiveRegion,
  getLiveRegion,
  announce,
  createSelectionAnnouncement,
  createExpansionAnnouncement,
  createWordSelectionAnnouncement,
  createNavigationAnnouncement,
  createLoadingAnnouncement,
  createViewModeAnnouncement,
  cleanupLiveRegion
} from '../screenReaderAnnouncements';

// Mock DOM methods
Object.defineProperty(document, 'getElementById', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(document, 'createElement', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(document.body, 'appendChild', {
  value: vi.fn(),
  writable: true
});

describe('Screen Reader Announcements', () => {
  let mockLiveRegion;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock live region element
    mockLiveRegion = {
      setAttribute: vi.fn(),
      textContent: '',
      remove: vi.fn()
    };
    
    document.createElement.mockReturnValue(mockLiveRegion);
    document.getElementById.mockReturnValue(null);
  });

  afterEach(() => {
    cleanupLiveRegion();
  });

  describe('Live Region Management', () => {
    it('should create live region with proper attributes', () => {
      const liveRegion = createLiveRegion();
      
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockLiveRegion.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
      expect(mockLiveRegion.setAttribute).toHaveBeenCalledWith('aria-atomic', 'true');
      expect(mockLiveRegion.setAttribute).toHaveBeenCalledWith('class', 'sr-only');
      expect(mockLiveRegion.setAttribute).toHaveBeenCalledWith('id', 'tree-announcements');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLiveRegion);
      expect(liveRegion).toBe(mockLiveRegion);
    });

    it('should get existing live region if it exists', () => {
      document.getElementById.mockReturnValue(mockLiveRegion);
      
      const liveRegion = getLiveRegion();
      
      expect(document.getElementById).toHaveBeenCalledWith('tree-announcements');
      expect(liveRegion).toBe(mockLiveRegion);
      expect(document.createElement).not.toHaveBeenCalled();
    });

    it('should create live region if it does not exist', () => {
      document.getElementById.mockReturnValue(null);
      
      const liveRegion = getLiveRegion();
      
      expect(document.getElementById).toHaveBeenCalledWith('tree-announcements');
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(liveRegion).toBe(mockLiveRegion);
    });
  });

  describe('Announce Function', () => {
    beforeEach(() => {
      document.getElementById.mockReturnValue(mockLiveRegion);
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should announce message with default delay', () => {
      announce('Test message');
      
      expect(mockLiveRegion.textContent).toBe('');
      
      vi.advanceTimersByTime(100);
      
      expect(mockLiveRegion.textContent).toBe('Test message');
    });

    it('should announce message with custom delay', () => {
      announce('Test message', 200);
      
      expect(mockLiveRegion.textContent).toBe('');
      
      vi.advanceTimersByTime(100);
      expect(mockLiveRegion.textContent).toBe('');
      
      vi.advanceTimersByTime(100);
      expect(mockLiveRegion.textContent).toBe('Test message');
    });

    it('should clear previous announcement before new one', () => {
      mockLiveRegion.textContent = 'Previous message';
      
      announce('New message');
      
      expect(mockLiveRegion.textContent).toBe('');
      
      vi.advanceTimersByTime(100);
      
      expect(mockLiveRegion.textContent).toBe('New message');
    });

    it('should not announce empty messages', () => {
      announce('');
      announce(null);
      announce(undefined);
      
      vi.advanceTimersByTime(100);
      
      expect(mockLiveRegion.textContent).toBe('');
    });
  });

  describe('Selection Announcements', () => {
    it('should create announcement for word node', () => {
      const wordNode = {
        id: 'word-1',
        type: NODE_TYPES.WORD,
        content: 'apple',
        word: 'apple',
        frequency: 100,
        depth: 0
      };
      
      const announcement = createSelectionAnnouncement(wordNode, 1, 5);
      
      expect(announcement).toContain('Selected word: apple');
      expect(announcement).toContain('100 searches');
      expect(announcement).toContain('Item 1 of 5');
      expect(announcement).toContain('level 1');
    });

    it('should create announcement for prefix node', () => {
      const prefixNode = {
        id: 'prefix-1',
        type: NODE_TYPES.PREFIX,
        content: 'app',
        childCount: 3,
        isExpanded: true,
        depth: 1
      };
      
      const announcement = createSelectionAnnouncement(prefixNode, 2, 4);
      
      expect(announcement).toContain('Selected group: app');
      expect(announcement).toContain('3 items');
      expect(announcement).toContain('expanded');
      expect(announcement).toContain('Item 2 of 4');
      expect(announcement).toContain('level 2');
    });

    it('should indicate typo correction in announcement', () => {
      const typoNode = {
        id: 'typo-1',
        type: NODE_TYPES.WORD,
        content: 'apple',
        word: 'apple',
        frequency: 50,
        suggestionType: 'typo_correction',
        depth: 0
      };
      
      const announcement = createSelectionAnnouncement(typoNode, 1, 1);
      
      expect(announcement).toContain('suggested correction');
    });

    it('should handle collapsed prefix node', () => {
      const collapsedNode = {
        id: 'prefix-1',
        type: NODE_TYPES.PREFIX,
        content: 'app',
        childCount: 2,
        isExpanded: false,
        depth: 0
      };
      
      const announcement = createSelectionAnnouncement(collapsedNode, 1, 1);
      
      expect(announcement).toContain('collapsed');
      expect(announcement).not.toContain('expanded');
    });
  });

  describe('Expansion Announcements', () => {
    it('should create expansion announcement', () => {
      const node = {
        id: 'prefix-1',
        type: NODE_TYPES.PREFIX,
        content: 'app',
        childCount: 3
      };
      
      const announcement = createExpansionAnnouncement(node, true);
      
      expect(announcement).toContain('Expanded group: app');
      expect(announcement).toContain('showing 3 items');
    });

    it('should create collapse announcement', () => {
      const node = {
        id: 'prefix-1',
        type: NODE_TYPES.PREFIX,
        content: 'app',
        childCount: 3
      };
      
      const announcement = createExpansionAnnouncement(node, false);
      
      expect(announcement).toContain('Collapsed group: app');
      expect(announcement).not.toContain('showing');
    });

    it('should handle node without child count', () => {
      const node = {
        id: 'prefix-1',
        type: NODE_TYPES.PREFIX,
        content: 'app'
      };
      
      const announcement = createExpansionAnnouncement(node, true);
      
      expect(announcement).toBe('Expanded group: app');
    });
  });

  describe('Word Selection Announcements', () => {
    it('should create word selection announcement', () => {
      const wordNode = {
        id: 'word-1',
        type: NODE_TYPES.WORD,
        content: 'apple',
        word: 'apple',
        frequency: 100
      };
      
      const announcement = createWordSelectionAnnouncement(wordNode);
      
      expect(announcement).toContain('Selected: apple');
      expect(announcement).toContain('100 searches');
    });

    it('should handle typo correction in word selection', () => {
      const typoNode = {
        id: 'typo-1',
        type: NODE_TYPES.WORD,
        content: 'apple',
        word: 'apple',
        frequency: 50,
        suggestionType: 'typo_correction'
      };
      
      const announcement = createWordSelectionAnnouncement(typoNode);
      
      expect(announcement).toContain('suggested correction');
    });

    it('should return empty string for non-word nodes', () => {
      const prefixNode = {
        id: 'prefix-1',
        type: NODE_TYPES.PREFIX,
        content: 'app'
      };
      
      const announcement = createWordSelectionAnnouncement(prefixNode);
      
      expect(announcement).toBe('');
    });
  });

  describe('Navigation Announcements', () => {
    const fromNode = {
      id: 'from',
      type: NODE_TYPES.WORD,
      content: 'apple',
      word: 'apple',
      depth: 0
    };

    const toNode = {
      id: 'to',
      type: NODE_TYPES.WORD,
      content: 'banana',
      word: 'banana',
      depth: 0
    };

    it('should create down navigation announcement', () => {
      const announcement = createNavigationAnnouncement('down', fromNode, toNode);
      
      expect(announcement).toContain('Moved down to word: banana');
      expect(announcement).toContain('level 1');
    });

    it('should create up navigation announcement', () => {
      const announcement = createNavigationAnnouncement('up', fromNode, toNode);
      
      expect(announcement).toContain('Moved up to word: banana');
    });

    it('should create right navigation announcement', () => {
      const announcement = createNavigationAnnouncement('right', fromNode, toNode);
      
      expect(announcement).toContain('Moved right to word: banana');
    });

    it('should create left navigation announcement', () => {
      const announcement = createNavigationAnnouncement('left', fromNode, toNode);
      
      expect(announcement).toContain('Moved left to word: banana');
    });

    it('should handle expansion on same node', () => {
      const sameNode = {
        id: 'same',
        type: NODE_TYPES.PREFIX,
        content: 'app',
        childCount: 2
      };
      
      const announcement = createNavigationAnnouncement('right', sameNode, sameNode);
      
      expect(announcement).toContain('Expanded group: app');
    });

    it('should handle prefix node navigation', () => {
      const prefixNode = {
        id: 'prefix',
        type: NODE_TYPES.PREFIX,
        content: 'app',
        isExpanded: true,
        depth: 1
      };
      
      const announcement = createNavigationAnnouncement('down', fromNode, prefixNode);
      
      expect(announcement).toContain('Moved down to group: app');
      expect(announcement).toContain('expanded');
      expect(announcement).toContain('level 2');
    });
  });

  describe('Loading Announcements', () => {
    it('should create loading announcement', () => {
      const announcement = createLoadingAnnouncement('loading');
      expect(announcement).toBe('Loading tree view...');
    });

    it('should create loaded announcement', () => {
      const announcement = createLoadingAnnouncement('loaded', 25);
      expect(announcement).toBe('Tree view loaded with 25 items');
    });

    it('should create error announcement', () => {
      const announcement = createLoadingAnnouncement('error');
      expect(announcement).toBe('Failed to load tree view. Falling back to list view.');
    });

    it('should handle unknown state', () => {
      const announcement = createLoadingAnnouncement('unknown');
      expect(announcement).toBe('');
    });
  });

  describe('View Mode Announcements', () => {
    it('should create tree view announcement', () => {
      const announcement = createViewModeAnnouncement('tree', 15);
      expect(announcement).toBe('Switched to tree view with 15 items. Use arrow keys to navigate.');
    });

    it('should create list view announcement', () => {
      const announcement = createViewModeAnnouncement('list', 20);
      expect(announcement).toBe('Switched to list view with 20 items. Use arrow keys to navigate.');
    });
  });

  describe('Cleanup', () => {
    it('should remove live region on cleanup', () => {
      document.getElementById.mockReturnValue(mockLiveRegion);
      
      cleanupLiveRegion();
      
      expect(document.getElementById).toHaveBeenCalledWith('tree-announcements');
      expect(mockLiveRegion.remove).toHaveBeenCalled();
    });

    it('should handle cleanup when no live region exists', () => {
      document.getElementById.mockReturnValue(null);
      
      expect(() => cleanupLiveRegion()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null nodes gracefully', () => {
      expect(createSelectionAnnouncement(null, 1, 1)).toBe('');
      expect(createExpansionAnnouncement(null, true)).toBe('');
      expect(createWordSelectionAnnouncement(null)).toBe('');
      expect(createNavigationAnnouncement('down', null, null)).toBe('');
    });

    it('should handle nodes without required properties', () => {
      const incompleteNode = { id: 'incomplete' };
      
      const announcement = createSelectionAnnouncement(incompleteNode, 1, 1);
      expect(announcement).toContain('Item 1 of 1');
    });
  });
});