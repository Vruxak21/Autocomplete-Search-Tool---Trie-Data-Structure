const { MongoClient } = require('mongodb');

/**
 * MongoDB service for managing database connections and operations
 * Provides connection pooling, error handling, and graceful shutdown
 */
class MongoDBService {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
    this.connectionOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      retryReads: true
    };
  }

  /**
   * Establishes connection to MongoDB with connection pooling
   * @param {string} uri - MongoDB connection URI
   * @param {string} dbName - Database name
   * @returns {Promise<void>}
   */
  async connect(uri = process.env.MONGODB_URI, dbName = process.env.MONGODB_DB_NAME) {
    try {
      if (this.isConnected) {
        console.log('MongoDB already connected');
        return;
      }

      if (!uri) {
        throw new Error('MongoDB URI is required');
      }

      if (!dbName) {
        throw new Error('Database name is required');
      }

      console.log('Connecting to MongoDB...');
      this.client = new MongoClient(uri, this.connectionOptions);
      
      await this.client.connect();
      this.db = this.client.db(dbName);
      this.isConnected = true;

      // Test the connection
      await this.db.admin().ping();
      console.log(`Successfully connected to MongoDB database: ${dbName}`);

      // Set up event listeners
      this.client.on('error', (error) => {
        console.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('MongoDB connection closed');
        this.isConnected = false;
      });

    } catch (error) {
      this.isConnected = false;
      throw new Error(`Failed to connect to MongoDB: ${error.message}`);
    }
  }

  /**
   * Closes the MongoDB connection gracefully
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.close();
        console.log('MongoDB connection closed successfully');
      }
      this.client = null;
      this.db = null;
      this.isConnected = false;
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }

  /**
   * Gets the database instance
   * @returns {Db} MongoDB database instance
   * @throws {Error} If not connected
   */
  getDatabase() {
    if (!this.isConnected || !this.db) {
      throw new Error('Not connected to MongoDB');
    }
    return this.db;
  }

  /**
   * Gets a collection from the database
   * @param {string} collectionName - Name of the collection
   * @returns {Collection} MongoDB collection instance
   */
  getCollection(collectionName) {
    const db = this.getDatabase();
    return db.collection(collectionName);
  }

  /**
   * Checks if the service is connected to MongoDB
   * @returns {boolean} Connection status
   */
  isConnectedToMongoDB() {
    return this.isConnected && this.client && this.db;
  }

  /**
   * Performs a health check on the MongoDB connection
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck() {
    try {
      if (!this.isConnectedToMongoDB()) {
        return {
          status: 'disconnected',
          message: 'Not connected to MongoDB',
          timestamp: new Date().toISOString()
        };
      }

      // Ping the database
      const startTime = Date.now();
      await this.db.admin().ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        database: this.db.databaseName
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Creates indexes for better query performance
   * @returns {Promise<void>}
   */
  async createIndexes() {
    try {
      const db = this.getDatabase();

      // Create indexes for trie_nodes collection
      const trieNodesCollection = db.collection('trie_nodes');
      await trieNodesCollection.createIndex({ nodeId: 1 }, { unique: true });
      await trieNodesCollection.createIndex({ parentId: 1 });
      await trieNodesCollection.createIndex({ character: 1 });
      await trieNodesCollection.createIndex({ isEndOfWord: 1 });

      // Create indexes for search_analytics collection
      const analyticsCollection = db.collection('search_analytics');
      await analyticsCollection.createIndex({ timestamp: -1 });
      await analyticsCollection.createIndex({ query: 1 });
      await analyticsCollection.createIndex({ userSession: 1 });
      await analyticsCollection.createIndex({ responseTime: 1 });

      // Create indexes for trie_metadata collection
      const metadataCollection = db.collection('trie_metadata');
      await metadataCollection.createIndex({ version: 1 }, { unique: true });
      await metadataCollection.createIndex({ createdAt: -1 });

      console.log('MongoDB indexes created successfully');
    } catch (error) {
      console.error('Error creating MongoDB indexes:', error);
      throw error;
    }
  }

  /**
   * Gets database statistics
   * @returns {Promise<Object>} Database statistics
   */
  async getStats() {
    try {
      const db = this.getDatabase();
      const stats = await db.stats();
      
      return {
        database: db.databaseName,
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        objects: stats.objects
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const mongoDBService = new MongoDBService();

// Export both the instance and the class
module.exports = mongoDBService;
module.exports.MongoDBService = MongoDBService;