const TriePersistenceService = require('../../src/services/TriePersistenceService');
const mongoDBService = require('../../src/services/MongoDBService');
const Trie = require('../../src/data-structures/Trie');

describe('TriePersistenceService Integration Tests', () => {
  const TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017';
  const TEST_DB = 'trie_persistence_test_' + Date.now();
  
  let persistenceService;
  let testTrie;

  beforeAll(async () => {
    // Connect to test database
    await mongoDBService.connect(TEST_URI, TEST_DB);
    await mongoDBService.createIndexes();
    
    persistenceService = new TriePersistenceService();
    
    // Create test Trie with sample data
    testTrie = new Trie();
    testTrie.insert('apple', 10);
    testTrie.insert('application', 8);
    testTrie.insert('apply', 6);
    testTrie.insert('banana', 5);
    testTrie.insert('band', 3);
    testTrie.insert('bandana', 2);
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
    // Clear collections before each test
    const db = mongoDBService.getDatabase();
    await db.collection('trie_nodes').deleteMany({});
    await db.collection('trie_metadata').deleteMany({});
  });

  describe('Trie Export to MongoDB', () => {
    test('should export Trie to MongoDB successfully', async () => {
      const result = await persistenceService.exportTrieToMongoDB(testTrie, 'test_v1');
      
      expect(result.success).toBe(true);
      expect(result.version).toBe('test_v1');
      expect(result.nodesBackedUp).toBeGreaterThan(0);
      expect(result.wordsBackedUp).toBe(6);
      expect(result.backupDuration).toBeGreaterThan(0);
    });

    test('should create correct node documents in MongoDB', async () => {
      await persistenceService.exportTrieToMongoDB(testTrie, 'test_v2');
      
      const nodesCollection = mongoDBService.getCollection('trie_nodes');
      const nodes = await nodesCollection.find({ version: 'test_v2' }).toArray();
      
      expect(nodes.length).toBeGreaterThan(0);
      
      // Check root node exists
      const rootNode = nodes.find(node => node.parentId === null);
      expect(rootNode).toBeDefined();
      expect(rootNode.character).toBeNull();
      
      // Check word nodes exist
      const wordNodes = nodes.filter(node => node.isEndOfWord);
      expect(wordNodes.length).toBe(6);
      
      // Verify specific words
      const appleNode = wordNodes.find(node => node.word === 'apple');
      expect(appleNode).toBeDefined();
      expect(appleNode.frequency).toBe(10);
    });

    test('should create metadata document', async () => {
      await persistenceService.exportTrieToMongoDB(testTrie, 'test_v3');
      
      const metadataCollection = mongoDBService.getCollection('trie_metadata');
      const metadata = await metadataCollection.findOne({ version: 'test_v3' });
      
      expect(metadata).toBeDefined();
      expect(metadata.version).toBe('test_v3');
      expect(metadata.wordCount).toBe(6);
      expect(metadata.nodeCount).toBeGreaterThan(0);
      expect(metadata.createdAt).toBeInstanceOf(Date);
      expect(metadata.backupDuration).toBeGreaterThan(0);
    });

    test('should handle empty Trie', async () => {
      const emptyTrie = new Trie();
      
      await expect(
        persistenceService.exportTrieToMongoDB(emptyTrie, 'empty_v1')
      ).rejects.toThrow('No nodes to backup - Trie appears to be empty');
    });

    test('should validate input parameters', async () => {
      await expect(
        persistenceService.exportTrieToMongoDB(null)
      ).rejects.toThrow('Valid Trie instance is required');
      
      await expect(
        persistenceService.exportTrieToMongoDB('not a trie')
      ).rejects.toThrow('Valid Trie instance is required');
    });
  });

  describe('Trie Restore from MongoDB', () => {
    beforeEach(async () => {
      // Export test Trie before each restore test
      await persistenceService.exportTrieToMongoDB(testTrie, 'restore_test');
    });

    test('should restore Trie from MongoDB successfully', async () => {
      const result = await persistenceService.restoreTrieFromMongoDB('restore_test');
      
      expect(result.trie).toBeInstanceOf(Trie);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.version).toBe('restore_test');
      expect(result.metadata.restoreDuration).toBeGreaterThan(0);
    });

    test('should restore Trie with correct data', async () => {
      const result = await persistenceService.restoreTrieFromMongoDB('restore_test');
      const restoredTrie = result.trie;
      
      // Check word count
      expect(restoredTrie.getWordCount()).toBe(6);
      
      // Check specific words and frequencies
      expect(restoredTrie.contains('apple')).toBe(true);
      expect(restoredTrie.getFrequency('apple')).toBe(10);
      expect(restoredTrie.contains('application')).toBe(true);
      expect(restoredTrie.getFrequency('application')).toBe(8);
      expect(restoredTrie.contains('banana')).toBe(true);
      expect(restoredTrie.getFrequency('banana')).toBe(5);
      
      // Check search functionality
      const appleResults = restoredTrie.search('app');
      expect(appleResults.length).toBe(3);
      expect(appleResults[0].word).toBe('apple'); // Highest frequency first
    });

    test('should restore latest version when no version specified', async () => {
      // Create multiple versions
      await persistenceService.exportTrieToMongoDB(testTrie, 'v1');
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await persistenceService.exportTrieToMongoDB(testTrie, 'v2');
      
      const result = await persistenceService.restoreTrieFromMongoDB();
      expect(result.metadata.version).toBe('v2');
    });

    test('should handle non-existent version', async () => {
      await expect(
        persistenceService.restoreTrieFromMongoDB('non_existent')
      ).rejects.toThrow("Backup version 'non_existent' not found");
    });

    test('should handle no backups available', async () => {
      // Clear all data
      const db = mongoDBService.getDatabase();
      await db.collection('trie_metadata').deleteMany({});
      
      await expect(
        persistenceService.restoreTrieFromMongoDB()
      ).rejects.toThrow('No backups found');
    });
  });

  describe('Backup Management', () => {
    beforeEach(async () => {
      // Create test backups
      await persistenceService.exportTrieToMongoDB(testTrie, 'backup_1');
      await persistenceService.exportTrieToMongoDB(testTrie, 'backup_2');
    });

    test('should list backup versions', async () => {
      const versions = await persistenceService.listBackupVersions();
      
      expect(versions.length).toBeGreaterThanOrEqual(2);
      expect(versions.some(v => v.version === 'backup_1')).toBe(true);
      expect(versions.some(v => v.version === 'backup_2')).toBe(true);
      
      // Should be sorted by creation date (newest first)
      expect(versions[0].createdAt >= versions[1].createdAt).toBe(true);
    });

    test('should get backup metadata', async () => {
      const metadata = await persistenceService.getBackupMetadata('backup_1');
      
      expect(metadata).toBeDefined();
      expect(metadata.version).toBe('backup_1');
      expect(metadata.wordCount).toBe(6);
      expect(metadata.nodeCount).toBeGreaterThan(0);
    });

    test('should delete backup version', async () => {
      const result = await persistenceService.deleteBackupVersion('backup_1');
      
      expect(result.success).toBe(true);
      expect(result.version).toBe('backup_1');
      expect(result.nodesDeleted).toBeGreaterThan(0);
      expect(result.metadataDeleted).toBe(true);
      
      // Verify deletion
      const metadata = await persistenceService.getBackupMetadata('backup_1');
      expect(metadata).toBeNull();
    });

    test('should get backup statistics', async () => {
      const stats = await persistenceService.getBackupStats();
      
      expect(stats.totalBackups).toBeGreaterThanOrEqual(2);
      expect(stats.totalNodes).toBeGreaterThan(0);
      expect(stats.latestBackup).toBeDefined();
      expect(stats.latestBackup.version).toBeDefined();
    });
  });

  describe('Serialization and Deserialization', () => {
    test('should serialize Trie correctly', () => {
      const serialized = persistenceService.serializeTrie(testTrie, 'serialize_test');
      
      expect(Array.isArray(serialized)).toBe(true);
      expect(serialized.length).toBeGreaterThan(0);
      
      // Check root node
      const rootNode = serialized.find(node => node.parentId === null);
      expect(rootNode).toBeDefined();
      expect(rootNode.character).toBeNull();
      
      // Check word nodes
      const wordNodes = serialized.filter(node => node.isEndOfWord);
      expect(wordNodes.length).toBe(6);
    });

    test('should deserialize nodes correctly', () => {
      const serialized = persistenceService.serializeTrie(testTrie, 'deserialize_test');
      const deserialized = persistenceService.deserializeTrie(serialized);
      
      expect(deserialized).toBeInstanceOf(Trie);
      expect(deserialized.getWordCount()).toBe(6);
      expect(deserialized.contains('apple')).toBe(true);
      expect(deserialized.getFrequency('apple')).toBe(10);
    });

    test('should handle malformed serialized data', () => {
      const malformedData = [
        { nodeId: 'node1', version: 'test', character: 'a', children: [] }
        // Missing root node
      ];
      
      expect(() => {
        persistenceService.deserializeTrie(malformedData);
      }).toThrow('Root node not found in backup data');
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      // Disconnect from database
      await mongoDBService.disconnect();
      
      await expect(
        persistenceService.exportTrieToMongoDB(testTrie)
      ).rejects.toThrow();
      
      // Reconnect for cleanup
      await mongoDBService.connect(TEST_URI, TEST_DB);
    });

    test('should validate version parameter for deletion', async () => {
      await expect(
        persistenceService.deleteBackupVersion(null)
      ).rejects.toThrow('Version is required');
      
      await expect(
        persistenceService.deleteBackupVersion('')
      ).rejects.toThrow('Version is required');
    });
  });
});