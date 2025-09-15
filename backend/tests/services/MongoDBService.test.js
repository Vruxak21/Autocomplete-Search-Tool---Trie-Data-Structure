const mongoDBService = require('../../src/services/MongoDBService');

describe('MongoDBService Integration Tests', () => {
  const TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017';
  const TEST_DB = 'autocomplete_test_' + Date.now();

  beforeAll(async () => {
    // Connect to test database
    await mongoDBService.connect(TEST_URI, TEST_DB);
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

  describe('Connection Management', () => {
    test('should connect to MongoDB successfully', async () => {
      expect(mongoDBService.isConnectedToMongoDB()).toBe(true);
    });

    test('should get database instance', () => {
      const db = mongoDBService.getDatabase();
      expect(db).toBeDefined();
      expect(db.databaseName).toBe(TEST_DB);
    });

    test('should get collection instance', () => {
      const collection = mongoDBService.getCollection('test_collection');
      expect(collection).toBeDefined();
      expect(collection.collectionName).toBe('test_collection');
    });

    test('should perform health check', async () => {
      const health = await mongoDBService.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.database).toBe(TEST_DB);
      expect(health.responseTime).toMatch(/\d+ms/);
    });
  });

  describe('Index Management', () => {
    test('should create indexes successfully', async () => {
      await expect(mongoDBService.createIndexes()).resolves.not.toThrow();
    });

    test('should verify indexes were created', async () => {
      const db = mongoDBService.getDatabase();
      
      // Check trie_nodes indexes
      const trieNodesIndexes = await db.collection('trie_nodes').indexes();
      const indexNames = trieNodesIndexes.map(idx => Object.keys(idx.key).join('_'));
      
      expect(indexNames).toContain('nodeId');
      expect(indexNames).toContain('parentId');
      expect(indexNames).toContain('character');
      expect(indexNames).toContain('isEndOfWord');

      // Check search_analytics indexes
      const analyticsIndexes = await db.collection('search_analytics').indexes();
      const analyticsIndexNames = analyticsIndexes.map(idx => Object.keys(idx.key).join('_'));
      
      expect(analyticsIndexNames).toContain('timestamp');
      expect(analyticsIndexNames).toContain('query');
      expect(analyticsIndexNames).toContain('userSession');
    });
  });

  describe('Database Operations', () => {
    test('should insert and retrieve documents', async () => {
      const collection = mongoDBService.getCollection('test_documents');
      
      const testDoc = {
        name: 'test',
        value: 123,
        timestamp: new Date()
      };

      const insertResult = await collection.insertOne(testDoc);
      expect(insertResult.insertedId).toBeDefined();

      const retrievedDoc = await collection.findOne({ _id: insertResult.insertedId });
      expect(retrievedDoc.name).toBe('test');
      expect(retrievedDoc.value).toBe(123);
    });

    test('should handle batch operations', async () => {
      const collection = mongoDBService.getCollection('test_batch');
      
      const docs = Array.from({ length: 100 }, (_, i) => ({
        index: i,
        value: `item_${i}`
      }));

      const insertResult = await collection.insertMany(docs);
      expect(insertResult.insertedCount).toBe(100);

      const count = await collection.countDocuments();
      expect(count).toBe(100);
    });
  });

  describe('Statistics', () => {
    test('should get database statistics', async () => {
      const stats = await mongoDBService.getStats();
      
      expect(stats).toHaveProperty('database');
      expect(stats).toHaveProperty('collections');
      expect(stats).toHaveProperty('dataSize');
      expect(stats).toHaveProperty('storageSize');
      expect(stats.database).toBe(TEST_DB);
    });
  });

  describe('Error Handling', () => {
    test('should handle connection errors gracefully', async () => {
      // Create a new instance to avoid affecting the main test instance
      const { MongoDBService } = require('../../src/services/MongoDBService');
      const invalidService = new MongoDBService();
      
      await expect(
        invalidService.connect('mongodb://invalid:27017', 'test')
      ).rejects.toThrow('Failed to connect to MongoDB');
    });

    test('should throw error when not connected', () => {
      // Create a new instance to test disconnected state
      const { MongoDBService } = require('../../src/services/MongoDBService');
      const disconnectedService = new MongoDBService();
      
      expect(() => disconnectedService.getDatabase()).toThrow('Not connected to MongoDB');
    });
  });
});

describe('MongoDBService Unit Tests', () => {
  describe('Connection Status', () => {
    test('should return false when not connected', () => {
      const { MongoDBService } = require('../../src/services/MongoDBService');
      const service = new MongoDBService();
      
      expect(service.isConnectedToMongoDB()).toBe(false);
    });
  });

  describe('Health Check Without Connection', () => {
    test('should return disconnected status when not connected', async () => {
      const { MongoDBService } = require('../../src/services/MongoDBService');
      const service = new MongoDBService();
      
      const health = await service.healthCheck();
      expect(health.status).toBe('disconnected');
      expect(health.message).toBe('Not connected to MongoDB');
    });
  });
});