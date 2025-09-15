/**
 * Performance tests for autocomplete search functionality
 * Validates sub-100ms response times and system performance
 */

const request = require('supertest');
const app = require('../src/server');
const { Trie } = require('../src/data-structures');
const PerformanceMonitor = require('../src/middleware/performanceMonitoring');
const CacheService = require('../src/services/CacheService');

describe('Performance Tests', () => {
  let server;
  let performanceMonitor;
  let cacheService;

  beforeAll(async () => {
    // Initialize performance monitoring and caching for tests
    performanceMonitor = new PerformanceMonitor();
    cacheService = new CacheService({ maxSize: 100, ttl: 60000 });
    
    // Set up test app with performance monitoring
    app.locals.performanceMonitor = performanceMonitor;
    app.locals.cacheService = cacheService;
    
    // Create test Trie with sample data
    const trie = new Trie();
    trie.setPerformanceMonitor(performanceMonitor);
    
    // Add test data for performance testing
    const testWords = [
      'apple', 'application', 'apply', 'appreciate', 'approach',
      'banana', 'band', 'bandana', 'bank', 'banner',
      'cat', 'car', 'card', 'care', 'career',
      'dog', 'door', 'down', 'download', 'document',
      'elephant', 'email', 'empty', 'end', 'engine'
    ];
    
    testWords.forEach((word, index) => {
      trie.insert(word, Math.floor(Math.random() * 100) + 1);
    });
    
    app.locals.trie = trie;
    
    // Start server for testing
    server = app.listen(0); // Use random available port
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    // Reset performance metrics before each test
    performanceMonitor.reset();
    cacheService.clear();
  });

  describe('Search API Performance', () => {
    test('should respond within 100ms for typical queries', async () => {
      const queries = ['app', 'ban', 'car', 'do', 'e'];
      
      for (const query of queries) {
        const start = Date.now();
        const response = await request(app)
          .get(`/api/search?query=${query}`)
          .expect(200);
        
        const duration = Date.now() - start;
        
        expect(duration).toBeLessThan(100);
        expect(response.body.suggestions).toBeDefined();
        expect(response.body.processingTime).toBeDefined();
        expect(response.body.processingTime).toBeLessThan(100);
      }
    });

    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 50;
      const query = 'app';
      
      const promises = Array(concurrentRequests).fill().map(() => {
        const start = Date.now();
        return request(app)
          .get(`/api/search?query=${query}`)
          .expect(200)
          .then(response => ({
            duration: Date.now() - start,
            processingTime: response.body.processingTime
          }));
      });
      
      const results = await Promise.all(promises);
      
      // Check that all requests completed within reasonable time
      results.forEach(result => {
        expect(result.duration).toBeLessThan(200); // Allow more time for concurrent requests
        expect(result.processingTime).toBeLessThan(100);
      });
      
      // Check average response time
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      expect(avgDuration).toBeLessThan(150);
    });

    test('should benefit from caching on repeated queries', async () => {
      const query = 'app';
      
      // First request (not cached)
      const firstResponse = await request(app)
        .get(`/api/search?query=${query}`)
        .expect(200);
      
      expect(firstResponse.body.cached).toBeFalsy();
      const firstProcessingTime = firstResponse.body.processingTime;
      
      // Second request (should be cached)
      const secondResponse = await request(app)
        .get(`/api/search?query=${query}`)
        .expect(200);
      
      expect(secondResponse.body.cached).toBeTruthy();
      const secondProcessingTime = secondResponse.body.processingTime;
      
      // Cached response should be faster
      expect(secondProcessingTime).toBeLessThan(firstProcessingTime);
      expect(secondProcessingTime).toBeLessThan(50); // Cached responses should be very fast
    });

    test('should maintain performance with different query lengths', async () => {
      const queries = ['a', 'ap', 'app', 'appl', 'apple'];
      
      for (const query of queries) {
        const response = await request(app)
          .get(`/api/search?query=${query}`)
          .expect(200);
        
        expect(response.body.processingTime).toBeLessThan(100);
        expect(response.body.suggestions).toBeDefined();
      }
    });
  });

  describe('Trie Operation Performance', () => {
    test('should perform insert operations efficiently', () => {
      const trie = new Trie();
      trie.setPerformanceMonitor(performanceMonitor);
      
      const words = Array(1000).fill().map((_, i) => `word${i}`);
      
      const start = process.hrtime.bigint();
      words.forEach(word => trie.insert(word, Math.floor(Math.random() * 100)));
      const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
      
      expect(duration).toBeLessThan(1000); // Should insert 1000 words in less than 1 second
      
      // Check individual operation performance from monitor
      const metrics = performanceMonitor.getMetrics();
      if (metrics.trie.operationStats.insert) {
        expect(metrics.trie.operationStats.insert.avgTime).toBeLessThan(10);
      }
    });

    test('should perform search operations efficiently', () => {
      const trie = app.locals.trie;
      const queries = ['a', 'ap', 'app', 'b', 'ba', 'ban', 'c', 'ca', 'car'];
      
      queries.forEach(query => {
        const start = process.hrtime.bigint();
        const results = trie.search(query, 5);
        const duration = Number(process.hrtime.bigint() - start) / 1000000;
        
        expect(duration).toBeLessThan(50); // Individual search should be very fast
        expect(Array.isArray(results)).toBeTruthy();
      });
    });

    test('should perform frequency increment operations efficiently', () => {
      const trie = app.locals.trie;
      const words = ['apple', 'application', 'banana', 'car', 'cat'];
      
      words.forEach(word => {
        const start = process.hrtime.bigint();
        const success = trie.incrementFrequency(word, 1);
        const duration = Number(process.hrtime.bigint() - start) / 1000000;
        
        expect(duration).toBeLessThan(10);
        expect(success).toBeTruthy();
      });
    });
  });

  describe('Memory Performance', () => {
    test('should not have significant memory leaks during operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get(`/api/search?query=app`)
          .expect(200);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('should track memory usage in performance monitor', () => {
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.memory).toBeDefined();
      expect(metrics.memory.current).toBeDefined();
      expect(metrics.memory.current.heapUsed).toBeGreaterThan(0);
      expect(metrics.memory.current.heapTotal).toBeGreaterThan(0);
      expect(metrics.memory.current.rss).toBeGreaterThan(0);
    });
  });

  describe('Cache Performance', () => {
    test('should improve response times with caching', async () => {
      const query = 'test';
      
      // Measure uncached request
      const start1 = Date.now();
      await request(app)
        .get(`/api/search?query=${query}`)
        .expect(200);
      const uncachedTime = Date.now() - start1;
      
      // Measure cached request
      const start2 = Date.now();
      const cachedResponse = await request(app)
        .get(`/api/search?query=${query}`)
        .expect(200);
      const cachedTime = Date.now() - start2;
      
      expect(cachedResponse.body.cached).toBeTruthy();
      expect(cachedTime).toBeLessThan(uncachedTime);
    });

    test('should maintain cache statistics', () => {
      const stats = cacheService.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.size).toBeDefined();
      expect(stats.hitRate).toBeDefined();
      expect(stats.missRate).toBeDefined();
      expect(stats.hits).toBeDefined();
      expect(stats.misses).toBeDefined();
    });

    test('should handle cache eviction properly', () => {
      const smallCache = new CacheService({ maxSize: 3, ttl: 60000 });
      
      // Fill cache beyond capacity
      smallCache.set('query1', 5, false, { suggestions: [] });
      smallCache.set('query2', 5, false, { suggestions: [] });
      smallCache.set('query3', 5, false, { suggestions: [] });
      smallCache.set('query4', 5, false, { suggestions: [] }); // Should trigger eviction
      
      expect(smallCache.cache.size).toBeLessThanOrEqual(3);
      
      const stats = smallCache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitoring API', () => {
    test('should provide comprehensive performance metrics', async () => {
      // Generate some activity first
      await request(app)
        .get('/api/search?query=test')
        .expect(200);
      
      const response = await request(app)
        .get('/api/performance/metrics')
        .expect(200);
      
      expect(response.body.requests).toBeDefined();
      expect(response.body.memory).toBeDefined();
      expect(response.body.system).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      
      // Check request metrics
      expect(response.body.requests.total).toBeGreaterThan(0);
      expect(response.body.requests.endpoints).toBeDefined();
      
      // Check memory metrics
      expect(response.body.memory.current).toBeDefined();
      expect(response.body.memory.current.heapUsed).toBeGreaterThan(0);
    });

    test('should provide cache metrics', async () => {
      const response = await request(app)
        .get('/api/performance/cache')
        .expect(200);
      
      expect(response.body.stats).toBeDefined();
      expect(response.body.recentEntries).toBeDefined();
      expect(response.body.popularQueries).toBeDefined();
    });

    test('should provide health status', async () => {
      const response = await request(app)
        .get('/api/performance/health')
        .expect(200);
      
      expect(response.body.status).toBeDefined();
      expect(response.body.services).toBeDefined();
      expect(response.body.services.performanceMonitor).toBeDefined();
      expect(response.body.services.cache).toBeDefined();
      expect(response.body.services.trie).toBeDefined();
    });
  });

  describe('Load Testing', () => {
    test('should handle sustained load', async () => {
      const duration = 5000; // 5 seconds
      const requestInterval = 100; // Request every 100ms
      const startTime = Date.now();
      const requests = [];
      
      while (Date.now() - startTime < duration) {
        const promise = request(app)
          .get('/api/search?query=load')
          .expect(200)
          .then(response => ({
            processingTime: response.body.processingTime,
            timestamp: Date.now()
          }));
        
        requests.push(promise);
        
        // Wait before next request
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }
      
      const results = await Promise.all(requests);
      
      // Check that all requests completed successfully
      expect(results.length).toBeGreaterThan(10);
      
      // Check average response time
      const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
      expect(avgProcessingTime).toBeLessThan(100);
      
      // Check that response times didn't degrade significantly over time
      const firstHalf = results.slice(0, Math.floor(results.length / 2));
      const secondHalf = results.slice(Math.floor(results.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.processingTime, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.processingTime, 0) / secondHalf.length;
      
      // Second half shouldn't be more than 50% slower than first half
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);
    });
  });
});

// Helper function to generate test data
function generateTestData(count) {
  const words = [];
  const prefixes = ['app', 'ban', 'car', 'dog', 'ele', 'fun', 'gra', 'hel', 'ice', 'joy'];
  const suffixes = ['le', 'ana', 'eer', 'ment', 'tion', 'ing', 'ed', 'er', 'est', 'ly'];
  
  for (let i = 0; i < count; i++) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const word = prefix + suffix + i;
    words.push(word);
  }
  
  return words;
}