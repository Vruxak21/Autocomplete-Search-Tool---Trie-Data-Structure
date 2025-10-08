/**
 * @fileoverview Performance testing utilities for comprehensive integration tests
 */

/**
 * Performance test helper class
 */
export class PerformanceTestHelper {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      treeBuildTime: 200, // ms
      renderTime: 100, // ms
      navigationTime: 16, // ms (60fps)
      memoryIncrease: 50, // MB
      apiResponseTime: 500 // ms
    };
  }

  /**
   * Measures execution time of a function
   * @param {string} name - Metric name
   * @param {Function} fn - Function to measure
   * @returns {Promise<{result: any, duration: number}>}
   */
  async measureTime(name, fn) {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.metrics.set(name, { duration, timestamp: Date.now() });
    
    return { result, duration };
  }

  /**
   * Measures memory usage during function execution
   * @param {string} name - Metric name
   * @param {Function} fn - Function to measure
   * @returns {Promise<{result: any, memoryDelta: number}>}
   */
  async measureMemory(name, fn) {
    const initialMemory = this.getMemoryUsage();
    const result = await fn();
    const finalMemory = this.getMemoryUsage();
    const memoryDelta = finalMemory - initialMemory;
    
    this.metrics.set(`${name}_memory`, { 
      memoryDelta, 
      initialMemory, 
      finalMemory, 
      timestamp: Date.now() 
    });
    
    return { result, memoryDelta };
  }

  /**
   * Gets current memory usage
   * @returns {number} Memory usage in bytes
   */
  getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Validates performance against thresholds
   * @param {string} metricName - Name of the metric to validate
   * @param {string} thresholdKey - Key in thresholds object
   * @returns {boolean} Whether performance meets threshold
   */
  validatePerformance(metricName, thresholdKey) {
    const metric = this.metrics.get(metricName);
    const threshold = this.thresholds[thresholdKey];
    
    if (!metric || !threshold) {
      return false;
    }
    
    const value = metric.duration || metric.memoryDelta || 0;
    return value <= threshold;
  }

  /**
   * Gets all recorded metrics
   * @returns {Object} All metrics
   */
  getAllMetrics() {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Resets all metrics
   */
  reset() {
    this.metrics.clear();
  }

  /**
   * Creates a performance report
   * @returns {Object} Performance report
   */
  generateReport() {
    const report = {
      timestamp: Date.now(),
      metrics: this.getAllMetrics(),
      thresholds: this.thresholds,
      violations: []
    };

    // Check for threshold violations
    for (const [metricName, metric] of this.metrics) {
      const value = metric.duration || metric.memoryDelta || 0;
      let thresholdKey = null;
      
      if (metricName.includes('treeBuild')) thresholdKey = 'treeBuildTime';
      else if (metricName.includes('render')) thresholdKey = 'renderTime';
      else if (metricName.includes('navigation')) thresholdKey = 'navigationTime';
      else if (metricName.includes('memory')) thresholdKey = 'memoryIncrease';
      else if (metricName.includes('api')) thresholdKey = 'apiResponseTime';
      
      if (thresholdKey && value > this.thresholds[thresholdKey]) {
        report.violations.push({
          metric: metricName,
          value,
          threshold: this.thresholds[thresholdKey],
          exceeded: value - this.thresholds[thresholdKey]
        });
      }
    }

    return report;
  }
}

/**
 * Creates mock suggestions with hierarchical structure for testing
 * @param {number} count - Number of suggestions to create
 * @param {Object} options - Options for suggestion generation
 * @returns {Array} Array of mock suggestions
 */
export function createMockSuggestions(count, options = {}) {
  const {
    prefixes = ['test', 'data', 'user', 'system', 'config'],
    suffixes = ['ing', 'ed', 'er', 's', 'able', 'tion'],
    includeTypos = false,
    hierarchical = true
  } = options;

  const suggestions = [];
  
  if (hierarchical) {
    // Create hierarchical structure
    prefixes.forEach(prefix => {
      // Add base word
      suggestions.push({
        word: prefix,
        frequency: Math.floor(Math.random() * 100) + 50,
        type: 'exact_match'
      });
      
      // Add variations
      suffixes.forEach(suffix => {
        if (suggestions.length < count) {
          suggestions.push({
            word: prefix + suffix,
            frequency: Math.floor(Math.random() * 50) + 10,
            type: 'exact_match'
          });
        }
      });
    });
  }
  
  // Fill remaining with random suggestions
  while (suggestions.length < count) {
    const word = `suggestion${suggestions.length.toString().padStart(3, '0')}`;
    suggestions.push({
      word,
      frequency: Math.floor(Math.random() * 30) + 1,
      type: 'exact_match'
    });
  }
  
  // Add typo corrections if requested
  if (includeTypos && suggestions.length > 0) {
    const typoCount = Math.min(5, Math.floor(count * 0.1));
    for (let i = 0; i < typoCount; i++) {
      const originalWord = suggestions[i].word;
      const typoWord = originalWord.slice(0, -1) + 'x'; // Simple typo
      
      suggestions.push({
        word: originalWord,
        frequency: suggestions[i].frequency,
        type: 'typo_correction',
        originalQuery: typoWord,
        editDistance: 1
      });
    }
  }
  
  return suggestions.slice(0, count);
}

/**
 * Simulates API delay for testing
 * @param {number} delay - Delay in milliseconds
 * @returns {Promise} Promise that resolves after delay
 */
export function simulateApiDelay(delay = 100) {
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Creates a mock API response with performance metadata
 * @param {Array} suggestions - Suggestions array
 * @param {Object} options - Response options
 * @returns {Object} Mock API response
 */
export function createMockApiResponse(suggestions, options = {}) {
  const {
    queryTime = Math.floor(Math.random() * 50) + 10,
    totalCount = suggestions.length,
    hasMore = false
  } = options;

  return {
    suggestions,
    totalCount,
    queryTime,
    hasMore,
    timestamp: Date.now()
  };
}

/**
 * Measures React component render performance
 * @param {Function} renderFn - Function that renders the component
 * @returns {Promise<{duration: number, result: any}>}
 */
export async function measureRenderPerformance(renderFn) {
  const startTime = performance.now();
  const result = await renderFn();
  const endTime = performance.now();
  
  return {
    duration: endTime - startTime,
    result
  };
}

/**
 * Simulates user interactions with timing
 * @param {Object} user - UserEvent instance
 * @param {Array} interactions - Array of interaction objects
 * @returns {Promise<Array>} Array of interaction timings
 */
export async function measureInteractionPerformance(user, interactions) {
  const timings = [];
  
  for (const interaction of interactions) {
    const startTime = performance.now();
    
    switch (interaction.type) {
      case 'type':
        await user.type(interaction.element, interaction.text);
        break;
      case 'click':
        await user.click(interaction.element);
        break;
      case 'keyboard':
        await user.keyboard(interaction.key);
        break;
      case 'clear':
        await user.clear(interaction.element);
        break;
      default:
        console.warn(`Unknown interaction type: ${interaction.type}`);
    }
    
    const endTime = performance.now();
    
    timings.push({
      type: interaction.type,
      duration: endTime - startTime,
      timestamp: Date.now()
    });
    
    // Add delay between interactions if specified
    if (interaction.delay) {
      await new Promise(resolve => setTimeout(resolve, interaction.delay));
    }
  }
  
  return timings;
}

/**
 * Validates accessibility attributes on tree elements
 * @param {Object} screen - Testing library screen object
 * @returns {Object} Accessibility validation results
 */
export function validateTreeAccessibility(screen) {
  const results = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    // Check for tree role
    const treeElement = screen.queryByRole('tree');
    if (!treeElement) {
      results.errors.push('Tree element missing role="tree"');
      results.valid = false;
    }

    // Check tree items
    const treeItems = screen.queryAllByRole('treeitem');
    if (treeItems.length === 0) {
      results.errors.push('No tree items found with role="treeitem"');
      results.valid = false;
    }

    // Validate ARIA attributes on tree items
    treeItems.forEach((item, index) => {
      const ariaLevel = item.getAttribute('aria-level');
      const ariaExpanded = item.getAttribute('aria-expanded');
      const ariaSetSize = item.getAttribute('aria-setsize');
      const ariaPosInSet = item.getAttribute('aria-posinset');

      if (!ariaLevel) {
        results.warnings.push(`Tree item ${index} missing aria-level`);
      }

      if (ariaExpanded !== null && !['true', 'false'].includes(ariaExpanded)) {
        results.errors.push(`Tree item ${index} has invalid aria-expanded value: ${ariaExpanded}`);
        results.valid = false;
      }

      if (ariaSetSize && isNaN(parseInt(ariaSetSize))) {
        results.errors.push(`Tree item ${index} has invalid aria-setsize value: ${ariaSetSize}`);
        results.valid = false;
      }

      if (ariaPosInSet && isNaN(parseInt(ariaPosInSet))) {
        results.errors.push(`Tree item ${index} has invalid aria-posinset value: ${ariaPosInSet}`);
        results.valid = false;
      }
    });

  } catch (error) {
    results.errors.push(`Accessibility validation error: ${error.message}`);
    results.valid = false;
  }

  return results;
}

/**
 * Default performance test helper instance
 */
export const defaultPerformanceHelper = new PerformanceTestHelper();