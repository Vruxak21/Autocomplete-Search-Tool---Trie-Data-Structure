/**
 * Integration Tests for Application Startup and Initialization
 * Tests the complete application bootstrap process
 */

const request = require('supertest');
const { ApplicationBootstrap, ConfigValidator, DatasetDiscovery } = require('../../scripts/bootstrap');
const { EnvironmentConfig } = require('../../src/config/environment');
const gracefulShutdown = require('../../src/utils/gracefulShutdown');
const mongoDBService = require('../../src/services/MongoDBService');

describe('Application Startup Integration Tests', () => {
  let bootstrap;
  let originalEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  beforeEach(() => {
    bootstrap = new ApplicationBootstrap();
    
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3001'; // Fixed port for tests
    process.env.MONGODB_DB_NAME = 'autocomplete-search-test';
  });

  afterEach(async () => {
    // Cleanup MongoDB connection if exists
    if (mongoDBService.isConnectedToMongoDB()) {
      await mongoDBService.disconnect();
    }
  });

  describe('Configuration Management', () => {
    test('should validate and load configuration successfully', async () => {
      const config = await bootstrap.initializeConfig();
      
      expect(config).toBeDefined();
      expect(config.NODE_ENV).toBe('test');
      expect(config.PORT).toBe(3001);
      expect(config.MAX_SUGGESTIONS).toBe(5);
      expect(config.SEARCH_TIMEOUT_MS).toBe(100);
    });

    test('should handle missing optional configuration', async () => {
      delete process.env.MONGODB_URI;
      
      const config = await bootstrap.initializeConfig();
      
      expect(config).toBeDefined();
      expect(config.MONGODB_URI).toBeUndefined();
      expect(config.MONGODB_DB_NAME).toBe('autocomplete-search-test');
    });

    test('should validate configuration schema', () => {
      const testConfig = {
        NODE_ENV: 'test',
        PORT: 3001,
        MAX_SUGGESTIONS: 5
      };

      const result = EnvironmentConfig.validate(testConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid configuration values', () => {
      const testConfig = {
        NODE_ENV: 'invalid',
        PORT: -1,
        MAX_SUGGESTIONS: 0
      };

      const result = EnvironmentConfig.validate(testConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Dataset Discovery', () => {
    test('should discover available datasets', async () => {
      const datasets = await DatasetDiscovery.discoverDatasets();
      
      expect(Array.isArray(datasets)).toBe(true);
      
      // Should find at least some datasets or return empty array
      datasets.forEach(dataset => {
        expect(dataset).toHaveProperty('key');
        expect(dataset).toHaveProperty('type');
        expect(dataset).toHaveProperty('filePath');
        expect(dataset).toHaveProperty('size');
        expect(dataset).toHaveProperty('priority');
      });
    });

    test('should handle missing datasets gracefully', async () => {
      // This test should not throw even if no datasets are found
      const datasets = await DatasetDiscovery.discoverDatasets();
      expect(Array.isArray(datasets)).toBe(true);
    });
  });

  describe('Database Initialization', () => {
    test('should skip database connection when URI not provided', async () => {
      delete process.env.MONGODB_URI;
      
      await bootstrap.initializeConfig();
      const connected = await bootstrap.initializeDatabase();
      
      expect(connected).toBe(false);
      expect(mongoDBService.isConnectedToMongoDB()).toBe(false);
    });

    test('should handle database connection failure gracefully', async () => {
      process.env.MONGODB_URI = 'mongodb://invalid-host:27017/test';
      
      await bootstrap.initializeConfig();
      const connected = await bootstrap.initializeDatabase();
      
      expect(connected).toBe(false);
      expect(mongoDBService.isConnectedToMongoDB()).toBe(false);
    });

    test('should connect to database when valid URI provided', async () => {
      // Skip if no MongoDB available
      if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('invalid')) {
        return;
      }

      await bootstrap.initializeConfig();
      const connected = await bootstrap.initializeDatabase();
      
      if (connected) {
        expect(mongoDBService.isConnectedToMongoDB()).toBe(true);
        
        // Test health check
        const health = await mongoDBService.healthCheck();
        expect(health.status).toBe('healthy');
      }
    });
  });

  describe('Trie Initialization', () => {
    test('should initialize Trie with fallback data when no datasets found', async () => {
      await bootstrap.initializeConfig();
      await bootstrap.initializeDatabase();
      
      const trie = await bootstrap.initializeTrie();
      
      expect(trie).toBeDefined();
      expect(typeof trie.search).toBe('function');
      expect(typeof trie.insert).toBe('function');
      
      const stats = trie.getStats();
      expect(stats.wordCount).toBeGreaterThan(0);
      expect(stats.nodeCount).toBeGreaterThan(0);
    });

    test('should load datasets when available', async () => {
      await bootstrap.initializeConfig();
      await bootstrap.initializeDatabase();
      
      const trie = await bootstrap.initializeTrie();
      
      expect(trie).toBeDefined();
      
      // Test search functionality
      const results = trie.search('a');
      expect(Array.isArray(results)).toBe(true);
      
      // Test that we can insert and search
      trie.insert('test', 1);
      const testResults = trie.search('test');
      expect(testResults.length).toBeGreaterThan(0);
      expect(testResults[0].word).toBe('test');
    });
  });

  describe('Complete Bootstrap Process', () => {
    test('should complete full bootstrap successfully', async () => {
      const result = await bootstrap.bootstrap();
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.trie).toBeDefined();
      expect(result.datasetLoader).toBeDefined();
      expect(result.summary).toBeDefined();
      
      // Verify Trie functionality
      const trie = result.trie;
      const stats = trie.getStats();
      expect(stats.wordCount).toBeGreaterThan(0);
      
      // Test search
      const searchResults = trie.search('a');
      expect(Array.isArray(searchResults)).toBe(true);
    });

    test('should handle bootstrap timeout', async () => {
      // Mock the bootstrap process to simulate timeout
      const timeoutBootstrap = new ApplicationBootstrap();
      const originalBootstrap = timeoutBootstrap.runBootstrapSteps;
      
      timeoutBootstrap.runBootstrapSteps = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(resolve, 100); // Longer than timeout
        });
      });
      
      // Override the timeout in bootstrap config
      const originalConfig = require('../../scripts/bootstrap').BOOTSTRAP_CONFIG;
      originalConfig.performance.maxInitTime = 50; // Very short timeout
      
      const result = await timeoutBootstrap.bootstrap();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      
      // Restore
      originalConfig.performance.maxInitTime = 30000;
    }, 10000);

    test('should provide detailed bootstrap summary', async () => {
      const result = await bootstrap.bootstrap();
      
      expect(result.summary).toBeDefined();
      expect(result.summary.totalTime).toBeGreaterThan(0);
      expect(result.summary.phases).toBeDefined();
      expect(typeof result.summary.success).toBe('boolean');
      
      // Check that all phases are present
      const phases = Object.keys(result.summary.phases);
      expect(phases).toContain('config-validation');
      expect(phases).toContain('database-connection');
      expect(phases).toContain('trie-initialization');
    });
  });

  describe('Performance Monitoring', () => {
    test('should track bootstrap performance', async () => {
      const startTime = Date.now();
      const result = await bootstrap.bootstrap();
      const endTime = Date.now();
      
      expect(result.summary.totalTime).toBeGreaterThan(0);
      expect(result.summary.totalTime).toBeLessThan(endTime - startTime + 100); // Allow some margin
      
      // Check individual phase timings
      for (const [phase, data] of Object.entries(result.summary.phases)) {
        expect(data.duration).toBeGreaterThanOrEqual(0); // Allow 0 for very fast phases
        expect(['completed', 'failed', 'skipped']).toContain(data.status);
      }
    });

    test('should log performance metrics during bootstrap', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await bootstrap.bootstrap();
      
      // Should have logged performance information
      const logCalls = consoleSpy.mock.calls;
      const performanceLogs = logCalls.filter(call => 
        call[0] && call[0].includes('[BOOTSTRAP]')
      );
      
      expect(performanceLogs.length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('should handle configuration errors gracefully', async () => {
      // Mock config validation to throw error
      const originalLoad = bootstrap.initializeConfig;
      bootstrap.initializeConfig = jest.fn().mockRejectedValue(new Error('Config error'));
      
      const result = await bootstrap.bootstrap();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Config error');
      
      // Restore original method
      bootstrap.initializeConfig = originalLoad;
    });

    test('should continue with Trie initialization even if database fails', async () => {
      process.env.MONGODB_URI = 'mongodb://invalid-host:27017/test';
      
      const result = await bootstrap.bootstrap();
      
      expect(result.success).toBe(true); // Should still succeed
      expect(result.mongoConnected).toBe(false);
      expect(result.trie).toBeDefined();
    });

    test('should provide error details in summary', async () => {
      // Force an error in database connection
      process.env.MONGODB_URI = 'mongodb://invalid-host:27017/test';
      
      const result = await bootstrap.bootstrap();
      
      expect(result.summary.phases['database-connection'].status).toBe('failed');
      expect(result.summary.phases['database-connection'].error).toBeDefined();
    });
  });

  describe('Graceful Shutdown', () => {
    test('should register shutdown handlers', () => {
      const processSpy = jest.spyOn(process, 'on');
      
      gracefulShutdown.init();
      
      // Should have registered process event handlers
      expect(processSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(processSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      
      processSpy.mockRestore();
    });

    test('should handle shutdown signals', async () => {
      const shutdownSpy = jest.spyOn(gracefulShutdown, 'shutdown').mockImplementation();
      
      gracefulShutdown.init();
      
      // Simulate SIGTERM
      process.emit('SIGTERM');
      
      expect(shutdownSpy).toHaveBeenCalledWith('SIGTERM');
      
      shutdownSpy.mockRestore();
    });
  });

  describe('Health Checks', () => {
    let app;

    beforeEach(async () => {
      // Create a minimal Express app for testing
      const express = require('express');
      const healthRoutes = require('../../src/routes/health');
      
      app = express();
      app.use('/health', healthRoutes);
      
      // Mock app locals
      app.locals.trie = {
        getStats: () => ({
          wordCount: 100,
          nodeCount: 200,
          memoryUsage: '1MB'
        })
      };
      app.locals.performanceMonitor = {
        getStats: () => ({
          totalRequests: 10,
          averageResponseTime: 50,
          errorRate: 0
        })
      };
      app.locals.cacheService = {
        getStats: () => ({
          size: 5,
          hitRate: 80,
          maxSize: 1000
        })
      };
    });

    test('should respond to basic health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });

    test('should provide detailed health information', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body.checks).toBeDefined();
      expect(response.body.checks.trie).toBeDefined();
      expect(response.body.checks.memory).toBeDefined();
      expect(response.body.responseTime).toBeDefined();
    });

    test('should respond to readiness probe', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body.status).toBe('READY');
      expect(response.body.wordCount).toBe(100);
    });

    test('should respond to liveness probe', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body.status).toBe('ALIVE');
      expect(response.body.uptime).toBeDefined();
      expect(response.body.pid).toBeDefined();
    });

    test('should provide system metrics', async () => {
      const response = await request(app)
        .get('/health/metrics')
        .expect(200);

      expect(response.body.memory).toBeDefined();
      expect(response.body.cpu).toBeDefined();
      expect(response.body.process).toBeDefined();
      expect(response.body.trie).toBeDefined();
    });
  });
});