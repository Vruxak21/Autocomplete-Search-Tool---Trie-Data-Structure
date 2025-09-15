const SearchAnalyticsService = require('../../src/services/SearchAnalyticsService');
const mongoDBService = require('../../src/services/MongoDBService');

describe('SearchAnalyticsService Integration Tests', () => {
  const TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017';
  const TEST_DB = 'analytics_test_' + Date.now();
  
  let analyticsService;

  beforeAll(async () => {
    // Connect to test database
    await mongoDBService.connect(TEST_URI, TEST_DB);
    await mongoDBService.createIndexes();
    
    analyticsService = new SearchAnalyticsService();
  });

  afterAll(async () => {
    // Clean up test database and disconnect
    try {
      if (mongoDBService.isConnectedToMongoDB()) {
        const db = mongoDBService.getDatabase();
        await db.dropDatabase();
        await mongoDBService.disconnect();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  beforeEach(async () => {
    // Clear analytics collection before each test
    const collection = mongoDBService.getCollection('search_analytics');
    await collection.deleteMany({});
  });

  describe('Recording Search Data', () => {
    test('should record search query successfully', async () => {
      const searchData = {
        query: 'apple',
        responseTime: 45,
        resultCount: 5,
        userSession: 'session_123',
        selectedSuggestion: 'apple pie',
        metadata: {
          userAgent: 'test-browser',
          ipAddress: '127.0.0.1'
        }
      };

      const result = await analyticsService.recordSearch(searchData);
      
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.entry.query).toBe('apple');
      expect(result.entry.originalQuery).toBe('apple');
      expect(result.entry.responseTime).toBe(45);
      expect(result.entry.resultCount).toBe(5);
      expect(result.entry.userSession).toBe('session_123');
      expect(result.entry.selectedSuggestion).toBe('apple pie');
      expect(result.entry.hasResults).toBe(true);
      expect(result.entry.queryLength).toBe(5);
    });

    test('should normalize query to lowercase', async () => {
      const searchData = {
        query: 'APPLE',
        responseTime: 30,
        resultCount: 3,
        userSession: 'session_456'
      };

      const result = await analyticsService.recordSearch(searchData);
      
      expect(result.entry.query).toBe('apple');
      expect(result.entry.originalQuery).toBe('APPLE');
    });

    test('should handle anonymous sessions', async () => {
      const searchData = {
        query: 'banana',
        responseTime: 25,
        resultCount: 2
      };

      const result = await analyticsService.recordSearch(searchData);
      
      expect(result.entry.userSession).toBe('anonymous');
    });

    test('should validate required fields', async () => {
      await expect(
        analyticsService.recordSearch({})
      ).rejects.toThrow('Query is required and must be a string');

      await expect(
        analyticsService.recordSearch({ query: 'test' })
      ).rejects.toThrow('Response time must be a non-negative number');

      await expect(
        analyticsService.recordSearch({ 
          query: 'test', 
          responseTime: -5,
          resultCount: 3
        })
      ).rejects.toThrow('Response time must be a non-negative number');
    });
  });

  describe('Recording Suggestion Selections', () => {
    test('should record suggestion selection successfully', async () => {
      const selectionData = {
        query: 'app',
        selectedSuggestion: 'apple',
        userSession: 'session_789',
        selectionIndex: 0
      };

      const result = await analyticsService.recordSuggestionSelection(selectionData);
      
      expect(result.success).toBe(true);
      expect(result.entry.type).toBe('suggestion_selection');
      expect(result.entry.query).toBe('app');
      expect(result.entry.selectedSuggestion).toBe('apple');
      expect(result.entry.selectionIndex).toBe(0);
    });
  });

  describe('Analytics Queries', () => {
    beforeEach(async () => {
      // Insert test data
      const testData = [
        { query: 'apple', responseTime: 45, resultCount: 5, userSession: 'user1', timestamp: new Date(Date.now() - 1000 * 60 * 60) },
        { query: 'apple', responseTime: 50, resultCount: 4, userSession: 'user2', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
        { query: 'banana', responseTime: 30, resultCount: 3, userSession: 'user1', timestamp: new Date(Date.now() - 1000 * 60 * 15) },
        { query: 'cherry', responseTime: 25, resultCount: 0, userSession: 'user3', timestamp: new Date() }
      ];

      for (const data of testData) {
        await analyticsService.recordSearch(data);
      }
    });

    test('should get popular queries', async () => {
      const popular = await analyticsService.getPopularQueries({
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 2),
        endDate: new Date(),
        limit: 10
      });

      expect(popular.length).toBeGreaterThan(0);
      expect(popular[0].query).toBe('apple'); // Most popular
      expect(popular[0].count).toBe(2);
      expect(popular[0].avgResponseTime).toBe(47.5);
    });

    test('should get performance metrics', async () => {
      const metrics = await analyticsService.getPerformanceMetrics({
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 2),
        endDate: new Date()
      });

      expect(metrics.totalSearches).toBe(4);
      expect(metrics.avgResponseTime).toBe(37.5);
      expect(metrics.searchesWithResults).toBe(3);
      expect(metrics.searchesWithoutResults).toBe(1);
      expect(metrics.successRate).toBe(75);
    });

    test('should get search trends', async () => {
      const trends = await analyticsService.getSearchTrends({
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 2),
        endDate: new Date(),
        interval: 'hour'
      });

      expect(trends.length).toBeGreaterThan(0);
      expect(trends[0]).toHaveProperty('searchCount');
      expect(trends[0]).toHaveProperty('avgResponseTime');
      expect(trends[0]).toHaveProperty('uniqueQueryCount');
    });

    test('should get query analytics', async () => {
      const analytics = await analyticsService.getQueryAnalytics('apple', {
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 2),
        endDate: new Date()
      });

      expect(analytics.totalSearches).toBe(2);
      expect(analytics.avgResponseTime).toBe(47.5);
      expect(analytics.avgResultCount).toBe(4.5);
      expect(analytics.firstSearched).toBeInstanceOf(Date);
      expect(analytics.lastSearched).toBeInstanceOf(Date);
    });

    test('should handle non-existent query analytics', async () => {
      const analytics = await analyticsService.getQueryAnalytics('nonexistent');
      
      expect(analytics.totalSearches).toBe(0);
      expect(analytics.avgResponseTime).toBe(0);
      expect(analytics.avgResultCount).toBe(0);
    });
  });

  describe('Data Management', () => {
    beforeEach(async () => {
      // Insert old test data
      const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 100); // 100 days ago
      const recentDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago

      await analyticsService.recordSearch({
        query: 'old_query',
        responseTime: 100,
        resultCount: 1,
        userSession: 'old_session'
      });

      // Manually update timestamp to simulate old data
      const collection = mongoDBService.getCollection('search_analytics');
      await collection.updateOne(
        { query: 'old_query' },
        { $set: { timestamp: oldDate } }
      );

      await analyticsService.recordSearch({
        query: 'recent_query',
        responseTime: 50,
        resultCount: 2,
        userSession: 'recent_session'
      });
    });

    test('should cleanup old data', async () => {
      const result = await analyticsService.cleanupOldData(30); // Keep 30 days
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1); // Should delete the old query
      expect(result.cutoffDate).toBeInstanceOf(Date);

      // Verify recent data is still there
      const collection = mongoDBService.getCollection('search_analytics');
      const remainingCount = await collection.countDocuments();
      expect(remainingCount).toBe(1);
    });

    test('should get overall statistics', async () => {
      const stats = await analyticsService.getOverallStats();
      
      expect(stats.totalSearches).toBe(2);
      expect(stats.searchesLast24Hours).toBe(1); // Only recent query
      expect(stats.collectionName).toBe('search_analytics');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid search data', async () => {
      await expect(
        analyticsService.recordSearch({
          query: '',
          responseTime: 50,
          resultCount: 1
        })
      ).rejects.toThrow('Query is required and must be a string');

      await expect(
        analyticsService.recordSearch({
          query: 'test',
          responseTime: 'invalid',
          resultCount: 1
        })
      ).rejects.toThrow('Response time must be a non-negative number');
    });

    test('should handle invalid query analytics parameters', async () => {
      await expect(
        analyticsService.getQueryAnalytics('')
      ).rejects.toThrow('Query is required and must be a string');

      await expect(
        analyticsService.getQueryAnalytics(null)
      ).rejects.toThrow('Query is required and must be a string');
    });

    test('should handle database connection errors gracefully', async () => {
      // Disconnect from database
      await mongoDBService.disconnect();
      
      await expect(
        analyticsService.recordSearch({
          query: 'test',
          responseTime: 50,
          resultCount: 1
        })
      ).rejects.toThrow();
      
      // Reconnect for cleanup
      await mongoDBService.connect(TEST_URI, TEST_DB);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty result sets', async () => {
      const popular = await analyticsService.getPopularQueries();
      expect(popular).toEqual([]);

      const metrics = await analyticsService.getPerformanceMetrics();
      expect(metrics.totalSearches).toBe(0);
      expect(metrics.successRate).toBe(0);
    });

    test('should handle very large query strings', async () => {
      const longQuery = 'a'.repeat(1000);
      
      const result = await analyticsService.recordSearch({
        query: longQuery,
        responseTime: 100,
        resultCount: 0
      });

      expect(result.success).toBe(true);
      expect(result.entry.queryLength).toBe(1000);
    });

    test('should handle special characters in queries', async () => {
      const specialQuery = 'test@#$%^&*()';
      
      const result = await analyticsService.recordSearch({
        query: specialQuery,
        responseTime: 75,
        resultCount: 2
      });

      expect(result.success).toBe(true);
      expect(result.entry.query).toBe(specialQuery.toLowerCase());
    });
  });
});