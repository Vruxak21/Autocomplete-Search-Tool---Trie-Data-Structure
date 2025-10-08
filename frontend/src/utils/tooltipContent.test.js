import {
  generateNodeTooltipContent,
  generateSimpleTooltip,
  generatePerformanceTooltip,
  generateAccessibilityTooltip,
  getOptimalTooltipPosition,
  shouldDisableTooltip
} from './tooltipContent.js';
import { NODE_TYPES } from '../types/tree.js';

describe('Tooltip Content Utilities', () => {
  describe('generateNodeTooltipContent', () => {
    it('generates content for word nodes', () => {
      const wordNode = {
        id: '1',
        type: NODE_TYPES.WORD,
        content: 'test',
        word: 'test',
        frequency: 42,
        suggestionType: 'exact_match'
      };

      const content = generateNodeTooltipContent(wordNode, 'te');

      expect(content).toEqual({
        title: 'test',
        items: [
          { label: 'Search frequency', value: '42 times' },
          { label: 'Match type', value: 'Exact match' },
          { label: 'Length', value: '4 characters' }
        ],
        description: 'Click to select this search term.'
      });
    });

    it('generates content for typo correction nodes', () => {
      const typoNode = {
        id: '1',
        type: NODE_TYPES.WORD,
        content: 'hello',
        word: 'hello',
        frequency: 15,
        suggestionType: 'typo_correction',
        editDistance: 2,
        similarity: 0.85,
        originalQuery: 'helo'
      };

      const content = generateNodeTooltipContent(typoNode);

      expect(content).toEqual({
        title: 'hello',
        items: [
          { label: 'Search frequency', value: '15 times' },
          { label: 'Match type', value: 'Typo correction' },
          { label: 'Edit distance', value: 2 },
          { label: 'Similarity', value: '85%' },
          { label: 'Original query', value: 'helo' },
          { label: 'Length', value: '5 characters' }
        ],
        description: 'This is a suggested correction for your search term.'
      });
    });

    it('generates content for prefix nodes', () => {
      const prefixNode = {
        id: '1',
        type: NODE_TYPES.PREFIX,
        content: 'test',
        childCount: 5,
        totalFrequency: 150,
        depth: 1,
        isExpanded: false
      };

      const content = generateNodeTooltipContent(prefixNode);

      expect(content).toEqual({
        title: '"test" group',
        items: [
          { label: 'Items in group', value: 5 },
          { label: 'Total searches', value: 150 },
          { label: 'Average frequency', value: '30 per item' },
          { label: 'Prefix length', value: '4 characters' },
          { label: 'Tree depth', value: 'Level 2' }
        ],
        description: 'Click to expand this group and show its items.'
      });
    });

    it('generates content for expanded prefix nodes', () => {
      const expandedPrefixNode = {
        id: '1',
        type: NODE_TYPES.PREFIX,
        content: 'test',
        childCount: 3,
        totalFrequency: 90,
        isExpanded: true
      };

      const content = generateNodeTooltipContent(expandedPrefixNode);

      expect(content.description).toBe('Click to collapse this group and hide its items.');
    });

    it('handles nodes with parent information', () => {
      const childNode = {
        id: '1',
        type: NODE_TYPES.WORD,
        content: 'testing',
        word: 'testing',
        parent: { content: 'test' }
      };

      const content = generateNodeTooltipContent(childNode);

      expect(content.items).toContainEqual({
        label: 'Parent group',
        value: 'test'
      });
    });

    it('handles query match information', () => {
      const node = {
        id: '1',
        type: NODE_TYPES.WORD,
        content: 'testing',
        word: 'testing'
      };

      const content = generateNodeTooltipContent(node, 'test');

      expect(content.items).toContainEqual({
        label: 'Query match',
        value: 'Position 1'
      });
    });

    it('returns null for invalid nodes', () => {
      expect(generateNodeTooltipContent(null)).toBeNull();
      expect(generateNodeTooltipContent(undefined)).toBeNull();
    });

    it('handles high frequency word nodes', () => {
      const highFreqNode = {
        id: '1',
        type: NODE_TYPES.WORD,
        content: 'popular',
        word: 'popular',
        frequency: 150
      };

      const content = generateNodeTooltipContent(highFreqNode);

      expect(content.description).toBe('This is a very popular search term.');
    });

    it('handles medium frequency word nodes', () => {
      const mediumFreqNode = {
        id: '1',
        type: NODE_TYPES.WORD,
        content: 'common',
        word: 'common',
        frequency: 75
      };

      const content = generateNodeTooltipContent(mediumFreqNode);

      expect(content.description).toBe('This is a popular search term.');
    });
  });

  describe('generateSimpleTooltip', () => {
    it('generates simple tooltip for word nodes', () => {
      const wordNode = {
        type: NODE_TYPES.WORD,
        word: 'test',
        frequency: 42
      };

      const tooltip = generateSimpleTooltip(wordNode);

      expect(tooltip).toBe('test (42 searches)');
    });

    it('generates simple tooltip for word nodes without frequency', () => {
      const wordNode = {
        type: NODE_TYPES.WORD,
        word: 'test'
      };

      const tooltip = generateSimpleTooltip(wordNode);

      expect(tooltip).toBe('test');
    });

    it('generates simple tooltip for typo correction nodes', () => {
      const typoNode = {
        type: NODE_TYPES.WORD,
        word: 'hello',
        frequency: 15,
        suggestionType: 'typo_correction'
      };

      const tooltip = generateSimpleTooltip(typoNode);

      expect(tooltip).toBe('hello (15 searches) - Suggested correction');
    });

    it('generates simple tooltip for prefix nodes', () => {
      const prefixNode = {
        type: NODE_TYPES.PREFIX,
        content: 'test',
        childCount: 5
      };

      const tooltip = generateSimpleTooltip(prefixNode);

      expect(tooltip).toBe('Group: test (5 items)');
    });

    it('handles nodes without content', () => {
      expect(generateSimpleTooltip(null)).toBe('');
      expect(generateSimpleTooltip({})).toBe('');
    });
  });

  describe('generatePerformanceTooltip', () => {
    it('generates performance tooltip with all metrics', () => {
      const node = {
        type: NODE_TYPES.PREFIX,
        depth: 3,
        childCount: 15
      };

      const performanceData = {
        renderTime: 25,
        memoryUsage: 128
      };

      const content = generatePerformanceTooltip(node, performanceData);

      expect(content).toEqual({
        title: 'Performance Metrics',
        items: [
          { label: 'Render time', value: '25ms' },
          { label: 'Memory usage', value: '128KB' },
          { label: 'Depth impact', value: 'Medium' },
          { label: 'Child impact', value: 'Medium' }
        ],
        description: 'Performance metrics for this tree node.'
      });
    });

    it('calculates depth impact correctly', () => {
      const deepNode = { type: NODE_TYPES.WORD, depth: 6 };
      const mediumNode = { type: NODE_TYPES.WORD, depth: 3 };
      const shallowNode = { type: NODE_TYPES.WORD, depth: 1 };

      const deepContent = generatePerformanceTooltip(deepNode, {});
      const mediumContent = generatePerformanceTooltip(mediumNode, {});
      const shallowContent = generatePerformanceTooltip(shallowNode, {});

      expect(deepContent.items.find(item => item.label === 'Depth impact').value).toBe('High');
      expect(mediumContent.items.find(item => item.label === 'Depth impact').value).toBe('Medium');
      expect(shallowContent.items.find(item => item.label === 'Depth impact').value).toBe('Low');
    });

    it('calculates child impact correctly', () => {
      const manyChildrenNode = { type: NODE_TYPES.PREFIX, childCount: 25 };
      const mediumChildrenNode = { type: NODE_TYPES.PREFIX, childCount: 15 };
      const fewChildrenNode = { type: NODE_TYPES.PREFIX, childCount: 5 };

      const manyContent = generatePerformanceTooltip(manyChildrenNode, {});
      const mediumContent = generatePerformanceTooltip(mediumChildrenNode, {});
      const fewContent = generatePerformanceTooltip(fewChildrenNode, {});

      expect(manyContent.items.find(item => item.label === 'Child impact').value).toBe('High');
      expect(mediumContent.items.find(item => item.label === 'Child impact').value).toBe('Medium');
      expect(fewContent.items.find(item => item.label === 'Child impact').value).toBe('Low');
    });

    it('returns null for invalid input', () => {
      expect(generatePerformanceTooltip(null)).toBeNull();
      expect(generatePerformanceTooltip({}, null)).toBeNull();
    });
  });

  describe('generateAccessibilityTooltip', () => {
    it('generates accessibility tooltip for word nodes', () => {
      const wordNode = {
        type: NODE_TYPES.WORD,
        word: 'test'
      };

      const content = generateAccessibilityTooltip(wordNode);

      expect(content).toEqual({
        title: 'Accessibility Information',
        items: [
          { label: 'ARIA role', value: 'treeitem' },
          { label: 'Selectable', value: 'Yes' }
        ],
        description: 'Use Enter to select. Use Up/Down arrows to navigate.'
      });
    });

    it('generates accessibility tooltip for prefix nodes', () => {
      const prefixNode = {
        type: NODE_TYPES.PREFIX,
        content: 'test',
        isExpanded: true
      };

      const content = generateAccessibilityTooltip(prefixNode);

      expect(content).toEqual({
        title: 'Accessibility Information',
        items: [
          { label: 'ARIA role', value: 'treeitem' },
          { label: 'Expandable', value: 'Yes' },
          { label: 'Current state', value: 'Expanded' },
          { label: 'Selectable', value: 'No' }
        ],
        description: 'Use Enter or Right arrow to expand, Left arrow to collapse. Use Up/Down arrows to navigate.'
      });
    });

    it('handles collapsed prefix nodes', () => {
      const collapsedNode = {
        type: NODE_TYPES.PREFIX,
        content: 'test',
        isExpanded: false
      };

      const content = generateAccessibilityTooltip(collapsedNode);

      expect(content.items.find(item => item.label === 'Current state').value).toBe('Collapsed');
    });

    it('returns null for invalid nodes', () => {
      expect(generateAccessibilityTooltip(null)).toBeNull();
    });
  });

  describe('getOptimalTooltipPosition', () => {
    beforeEach(() => {
      // Mock window dimensions
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
    });

    it('returns top position when there is enough space above', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          top: 200,
          bottom: 220,
          left: 100,
          right: 200
        })
      };

      const position = getOptimalTooltipPosition(mockElement);
      expect(position).toBe('top');
    });

    it('returns bottom position when there is not enough space above but enough below', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          top: 50,
          bottom: 70,
          left: 100,
          right: 200
        })
      };

      const position = getOptimalTooltipPosition(mockElement);
      expect(position).toBe('bottom');
    });

    it('returns right position when there is not enough vertical space but enough horizontal', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          top: 700,
          bottom: 720,
          left: 100,
          right: 200
        })
      };

      const position = getOptimalTooltipPosition(mockElement);
      expect(position).toBe('right');
    });

    it('returns left position when only left space is available', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          top: 700,
          bottom: 720,
          left: 800,
          right: 900
        })
      };

      const position = getOptimalTooltipPosition(mockElement);
      expect(position).toBe('left');
    });

    it('returns top as fallback for null element', () => {
      const position = getOptimalTooltipPosition(null);
      expect(position).toBe('top');
    });
  });

  describe('shouldDisableTooltip', () => {
    it('disables tooltip when explicitly requested', () => {
      const node = { content: 'test' };
      const options = { disableTooltips: true };

      expect(shouldDisableTooltip(node, options)).toBe(true);
    });

    it('disables tooltip for nodes without content', () => {
      expect(shouldDisableTooltip(null)).toBe(true);
      expect(shouldDisableTooltip({})).toBe(true);
      expect(shouldDisableTooltip({ content: '' })).toBe(true);
    });

    it('disables tooltip for reduced motion preference', () => {
      const node = { content: 'test' };
      const options = { prefersReducedMotion: true };

      expect(shouldDisableTooltip(node, options)).toBe(true);
    });

    it('allows tooltip for reduced motion when forced', () => {
      const node = { content: 'test' };
      const options = { prefersReducedMotion: true, forceTooltips: true };

      expect(shouldDisableTooltip(node, options)).toBe(false);
    });

    it('disables tooltip on touch devices by default', () => {
      const node = { content: 'test' };
      const options = { isTouchDevice: true };

      expect(shouldDisableTooltip(node, options)).toBe(true);
    });

    it('allows tooltip on touch devices when enabled', () => {
      const node = { content: 'test' };
      const options = { isTouchDevice: true, enableTooltipsOnTouch: true };

      expect(shouldDisableTooltip(node, options)).toBe(false);
    });

    it('enables tooltip for valid nodes with no restrictions', () => {
      const node = { content: 'test' };
      const options = {};

      expect(shouldDisableTooltip(node, options)).toBe(false);
    });
  });
});