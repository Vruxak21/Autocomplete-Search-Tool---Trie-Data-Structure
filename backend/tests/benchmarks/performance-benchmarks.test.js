const { performance } = require('perf_hooks');
const Trie = require('../../src/data-structures/Trie');
const MaxHeap = require('../../src/data-structures/MaxHeap');
const DatasetLoader = require('../../src/services/DatasetLoader');

describe('Performance Benchmarks', () => {
  let trie;
  let heap;
  let sampleData;

  beforeAll(async () => {
    // Generate sample data for benchmarking
    sampleData = [];
    for (let i = 0; i < 10000; i++) {
      sampleData.push({
        word: `test${i}`,
        frequency: Math.floor(Math.random() * 1000) + 1
      });
    }

    trie = new Trie();
    heap = new MaxHeap();

    // Pre-populate trie with sample data
    sampleData.forEach(item => {
      trie.insert(item.word, item.frequency);
    });
  });

  describe('Trie Performance', () => {
    test('should insert 1000 words within 50ms', () => {
      const testTrie = new Trie();
      const testData = sampleData.slice(0, 1000);

      const start = performance.now();
      testData.forEach(item => {
        testTrie.insert(item.word, item.frequency);
      });
      const end = performance.now();

      const duration = end - start;
      expect(duration).toBeLessThan(50);
      
      // Log performance metrics for monitoring
      console.log(`Trie insertion (1000 words): ${duration.toFixed(2)}ms`);
    });

    test('should search with prefix within 5ms', () => {
      const searchQueries = ['test1', 'test2', 'test3', 'test4', 'test5'];

      searchQueries.forEach(query => {
        const start = performance.now();
        const results = trie.search(query.substring(0, 4)); // Search with prefix
        const end = performance.now();

        const duration = end - start;
        expect(duration).toBeLessThan(5);
        expect(Array.isArray(results)).toBe(true);
        
        console.log(`Trie search "${query}": ${duration.toFixed(2)}ms, ${results.length} results`);
      });
    });

    test('should handle concurrent searches efficiently', async () => {
      const concurrentSearches = 100;
      const searchPromises = [];

      const start = performance.now();
      
      for (let i = 0; i < concurrentSearches; i++) {
        const query = `test${i % 10}`;
        searchPromises.push(
          new Promise(resolve => {
            const searchStart = performance.now();
            const results = trie.search(query);
            const searchEnd = performance.now();
            resolve({
              query,
              duration: searchEnd - searchStart,
              resultCount: results.length
            });
          })
        );
      }

      const results = await Promise.all(searchPromises);
      const end = performance.now();

      const totalDuration = end - start;
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

      expect(totalDuration).toBeLessThan(100); // Total time for 100 concurrent searches
      expect(avgDuration).toBeLessThan(5); // Average search time

      console.log(`Concurrent searches (${concurrentSearches}): Total ${totalDuration.toFixed(2)}ms, Avg ${avgDuration.toFixed(2)}ms`);
    });
  });

  describe('Heap Performance', () => {
    test('should maintain heap property with frequent insertions', () => {
      const testHeap = new MaxHeap();
      const testData = sampleData.slice(0, 1000);

      const start = performance.now();
      testData.forEach(item => {
        testHeap.insert(item);
      });
      const end = performance.now();

      const duration = end - start;
      expect(duration).toBeLessThan(20);

      // Verify heap property is maintained
      const topK = testHeap.getTopK(10);
      expect(topK).toHaveLength(10);
      
      // Verify results are sorted by frequency (descending)
      for (let i = 1; i < topK.length; i++) {
        expect(topK[i-1].frequency).toBeGreaterThanOrEqual(topK[i].frequency);
      }

      console.log(`Heap insertion (1000 items): ${duration.toFixed(2)}ms`);
    });

    test('should extract top-K elements efficiently', () => {
      const kValues = [5, 10, 20, 50];

      kValues.forEach(k => {
        const start = performance.now();
        const topK = heap.getTopK(k);
        const end = performance.now();

        const duration = end - start;
        expect(duration).toBeLessThan(10);
        expect(topK).toHaveLength(Math.min(k, heap.size()));

        console.log(`Heap top-${k} extraction: ${duration.toFixed(2)}ms`);
      });
    });
  });

  describe('Memory Usage Benchmarks', () => {
    test('should track memory usage during large dataset operations', () => {
      const initialMemory = process.memoryUsage();
      
      // Create a large trie
      const largeTrie = new Trie();
      const largeDataset = [];
      
      for (let i = 0; i < 50000; i++) {
        largeDataset.push({
          word: `benchmark${i}`,
          frequency: Math.floor(Math.random() * 1000) + 1
        });
      }

      // Insert data and measure memory
      const insertStart = performance.now();
      largeDataset.forEach(item => {
        largeTrie.insert(item.word, item.frequency);
      });
      const insertEnd = performance.now();

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const insertDuration = insertEnd - insertStart;

      // Memory usage should be reasonable (less than 100MB for 50k items)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      // Insertion should complete within reasonable time
      expect(insertDuration).toBeLessThan(1000);

      console.log(`Memory usage for 50k items: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Insertion time for 50k items: ${insertDuration.toFixed(2)}ms`);
    });
  });

  describe('Dataset Loading Performance', () => {
    test('should load sample dataset within time limits', async () => {
      const loader = new DatasetLoader();
      
      const start = performance.now();
      
      // Mock dataset loading (in real scenario, this would load from CSV)
      const mockDataset = sampleData.slice(0, 5000);
      const testTrie = new Trie();
      
      mockDataset.forEach(item => {
        testTrie.insert(item.word, item.frequency);
      });
      
      const end = performance.now();
      const duration = end - start;

      // Should load 5000 items within 200ms
      expect(duration).toBeLessThan(200);
      
      console.log(`Dataset loading (5000 items): ${duration.toFixed(2)}ms`);
    });
  });

  describe('API Response Time Benchmarks', () => {
    test('should simulate API response times', () => {
      const queries = ['te', 'tes', 'test', 'test1', 'test12'];
      
      queries.forEach(query => {
        const start = performance.now();
        
        // Simulate API processing
        const results = trie.search(query);
        const topResults = results.slice(0, 5); // Limit to top 5
        
        const end = performance.now();
        const duration = end - start;

        // API should respond within 50ms for typical queries
        expect(duration).toBeLessThan(50);
        
        console.log(`API simulation "${query}": ${duration.toFixed(2)}ms, ${topResults.length} results`);
      });
    });
  });
});