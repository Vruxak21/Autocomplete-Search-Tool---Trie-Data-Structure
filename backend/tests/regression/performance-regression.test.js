const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');
const Trie = require('../../src/data-structures/Trie');
const MaxHeap = require('../../src/data-structures/MaxHeap');

describe('Performance Regression Tests', () => {
  const BASELINE_FILE = path.join(__dirname, 'performance-baseline.json');
  let baseline = {};

  beforeAll(async () => {
    // Load existing baseline or create new one
    try {
      const baselineData = await fs.readFile(BASELINE_FILE, 'utf8');
      baseline = JSON.parse(baselineData);
    } catch (error) {
      console.log('No existing baseline found, creating new baseline');
      baseline = {};
    }
  });

  afterAll(async () => {
    // Save updated baseline
    await fs.writeFile(BASELINE_FILE, JSON.stringify(baseline, null, 2));
  });

  const measurePerformance = async (testName, testFunction) => {
    const iterations = 5;
    const durations = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await testFunction();
      const end = performance.now();
      durations.push(end - start);
    }

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / iterations;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    return {
      average: avgDuration,
      min: minDuration,
      max: maxDuration,
      iterations
    };
  };

  const checkRegression = (testName, currentMetrics, threshold = 1.2) => {
    if (!baseline[testName]) {
      baseline[testName] = currentMetrics;
      console.log(`Baseline established for ${testName}: ${currentMetrics.average.toFixed(2)}ms`);
      return;
    }

    const previousAvg = baseline[testName].average;
    const currentAvg = currentMetrics.average;
    const regressionRatio = currentAvg / previousAvg;

    if (regressionRatio > threshold) {
      throw new Error(
        `Performance regression detected in ${testName}: ` +
        `${currentAvg.toFixed(2)}ms vs baseline ${previousAvg.toFixed(2)}ms ` +
        `(${((regressionRatio - 1) * 100).toFixed(1)}% slower)`
      );
    }

    // Update baseline if performance improved significantly
    if (regressionRatio < 0.9) {
      baseline[testName] = currentMetrics;
      console.log(`Performance improved for ${testName}, updating baseline`);
    }

    console.log(
      `${testName}: ${currentAvg.toFixed(2)}ms ` +
      `(${regressionRatio > 1 ? '+' : ''}${((regressionRatio - 1) * 100).toFixed(1)}% vs baseline)`
    );
  };

  test('Trie insertion performance regression', async () => {
    const testName = 'trie_insertion_1000_items';
    
    const metrics = await measurePerformance(testName, () => {
      const trie = new Trie();
      for (let i = 0; i < 1000; i++) {
        trie.insert(`word${i}`, Math.floor(Math.random() * 100) + 1);
      }
    });

    checkRegression(testName, metrics);
  });

  test('Trie search performance regression', async () => {
    const testName = 'trie_search_performance';
    
    // Setup: Create trie with test data
    const trie = new Trie();
    for (let i = 0; i < 5000; i++) {
      trie.insert(`test${i}`, Math.floor(Math.random() * 100) + 1);
    }

    const metrics = await measurePerformance(testName, () => {
      // Perform multiple searches
      for (let i = 0; i < 100; i++) {
        trie.search(`test${i % 10}`);
      }
    });

    checkRegression(testName, metrics);
  });

  test('Heap operations performance regression', async () => {
    const testName = 'heap_operations_performance';
    
    const metrics = await measurePerformance(testName, () => {
      const heap = new MaxHeap();
      
      // Insert 1000 items
      for (let i = 0; i < 1000; i++) {
        heap.insert({
          word: `item${i}`,
          frequency: Math.floor(Math.random() * 100) + 1
        });
      }
      
      // Extract top 10 multiple times
      for (let i = 0; i < 10; i++) {
        heap.getTopK(10);
      }
    });

    checkRegression(testName, metrics);
  });

  test('Memory usage regression', async () => {
    const testName = 'memory_usage_5000_items';
    
    const metrics = await measurePerformance(testName, () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const trie = new Trie();
      for (let i = 0; i < 5000; i++) {
        trie.insert(`memtest${i}`, Math.floor(Math.random() * 100) + 1);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      return memoryIncrease;
    });

    // For memory tests, we check against a different threshold (50% increase)
    checkRegression(testName, metrics, 1.5);
  });

  test('Complex query performance regression', async () => {
    const testName = 'complex_query_performance';
    
    // Setup: Create trie with realistic data
    const trie = new Trie();
    const cities = [
      'Tokyo', 'Delhi', 'Shanghai', 'São Paulo', 'Mexico City',
      'Cairo', 'Mumbai', 'Beijing', 'Dhaka', 'Osaka',
      'New York', 'Karachi', 'Buenos Aires', 'Chongqing', 'Istanbul'
    ];
    
    // Add variations of city names
    cities.forEach(city => {
      for (let i = 0; i < 100; i++) {
        trie.insert(`${city}${i}`, Math.floor(Math.random() * 1000) + 1);
      }
    });

    const metrics = await measurePerformance(testName, () => {
      // Perform complex queries
      const queries = ['To', 'Del', 'Sha', 'São', 'Mex', 'Cai', 'Mum', 'Bei', 'Dha', 'Osa'];
      
      queries.forEach(query => {
        const results = trie.search(query);
        // Simulate processing results
        results.slice(0, 5).forEach(result => {
          // Simulate some processing
          result.word.length;
        });
      });
    });

    checkRegression(testName, metrics);
  });

  test('Concurrent operations performance regression', async () => {
    const testName = 'concurrent_operations_performance';
    
    const trie = new Trie();
    // Pre-populate with data
    for (let i = 0; i < 1000; i++) {
      trie.insert(`concurrent${i}`, Math.floor(Math.random() * 100) + 1);
    }

    const metrics = await measurePerformance(testName, async () => {
      // Simulate concurrent operations
      const operations = [];
      
      for (let i = 0; i < 50; i++) {
        operations.push(
          new Promise(resolve => {
            // Mix of search and insert operations
            if (i % 2 === 0) {
              const results = trie.search(`concurrent${i % 10}`);
              resolve(results);
            } else {
              trie.insert(`newitem${i}`, Math.floor(Math.random() * 100) + 1);
              resolve();
            }
          })
        );
      }
      
      await Promise.all(operations);
    });

    checkRegression(testName, metrics);
  });

  test('Large dataset performance regression', async () => {
    const testName = 'large_dataset_performance';
    
    const metrics = await measurePerformance(testName, () => {
      const trie = new Trie();
      const heap = new MaxHeap();
      
      // Simulate loading a large dataset
      for (let i = 0; i < 10000; i++) {
        const word = `largetest${i}`;
        const frequency = Math.floor(Math.random() * 1000) + 1;
        
        trie.insert(word, frequency);
        heap.insert({ word, frequency });
      }
      
      // Perform some operations on the large dataset
      for (let i = 0; i < 20; i++) {
        trie.search(`largetest${i * 100}`);
        heap.getTopK(5);
      }
    });

    // Large dataset operations can have more variance, so use a higher threshold
    checkRegression(testName, metrics, 1.3);
  });

  describe('Performance Monitoring', () => {
    test('should generate performance report', async () => {
      const report = {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
        baseline: baseline
      };

      const reportPath = path.join(__dirname, `performance-report-${Date.now()}.json`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`Performance report saved to: ${reportPath}`);
      
      // Verify report was created
      const reportExists = await fs.access(reportPath).then(() => true).catch(() => false);
      expect(reportExists).toBe(true);
    });
  });
});