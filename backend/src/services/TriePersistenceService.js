const mongoDBService = require('./MongoDBService');
const Trie = require('../data-structures/Trie');
const TrieNode = require('../data-structures/TrieNode');

/**
 * Service for persisting Trie data to MongoDB and restoring it
 * Handles serialization, backup, and restore operations
 */
class TriePersistenceService {
  constructor() {
    this.COLLECTIONS = {
      TRIE_NODES: 'trie_nodes',
      TRIE_METADATA: 'trie_metadata'
    };
  }

  /**
   * Exports Trie data to MongoDB for persistence
   * @param {Trie} trie - Trie instance to backup
   * @param {string} version - Version identifier for this backup
   * @returns {Promise<Object>} Backup result with statistics
   */
  async exportTrieToMongoDB(trie, version = null) {
    try {
      if (!trie || !(trie instanceof Trie)) {
        throw new Error('Valid Trie instance is required');
      }

      const startTime = Date.now();
      const backupVersion = version || `backup_${Date.now()}`;
      
      console.log(`Starting Trie backup to MongoDB (version: ${backupVersion})...`);

      // Clear existing data for this version
      await this.clearBackupVersion(backupVersion);

      // Serialize Trie to node documents
      const serializedNodes = this.serializeTrie(trie, backupVersion);
      
      if (serializedNodes.length === 0 || (serializedNodes.length === 1 && trie.getWordCount() === 0)) {
        throw new Error('No nodes to backup - Trie appears to be empty');
      }

      // Insert nodes in batches for better performance
      const batchSize = 1000;
      const nodesCollection = mongoDBService.getCollection(this.COLLECTIONS.TRIE_NODES);
      let insertedCount = 0;

      for (let i = 0; i < serializedNodes.length; i += batchSize) {
        const batch = serializedNodes.slice(i, i + batchSize);
        const result = await nodesCollection.insertMany(batch, { ordered: false });
        insertedCount += result.insertedCount;
      }

      // Save metadata
      const metadata = {
        version: backupVersion,
        nodeCount: insertedCount,
        wordCount: trie.getWordCount(),
        trieStats: trie.getStats(),
        createdAt: new Date(),
        backupDuration: Date.now() - startTime
      };

      const metadataCollection = mongoDBService.getCollection(this.COLLECTIONS.TRIE_METADATA);
      await metadataCollection.insertOne(metadata);

      console.log(`Trie backup completed: ${insertedCount} nodes saved in ${metadata.backupDuration}ms`);

      return {
        success: true,
        version: backupVersion,
        nodesBackedUp: insertedCount,
        wordsBackedUp: trie.getWordCount(),
        backupDuration: metadata.backupDuration,
        metadata
      };

    } catch (error) {
      console.error('Error exporting Trie to MongoDB:', error);
      throw new Error(`Failed to backup Trie: ${error.message}`);
    }
  }

  /**
   * Restores Trie data from MongoDB
   * @param {string} version - Version to restore (null for latest)
   * @returns {Promise<Trie>} Restored Trie instance
   */
  async restoreTrieFromMongoDB(version = null) {
    try {
      const startTime = Date.now();
      
      console.log(`Starting Trie restore from MongoDB${version ? ` (version: ${version})` : ' (latest version)'}...`);

      // Get backup metadata
      const metadata = await this.getBackupMetadata(version);
      if (!metadata) {
        throw new Error(version ? `Backup version '${version}' not found` : 'No backups found');
      }

      console.log(`Restoring backup from ${metadata.createdAt} with ${metadata.nodeCount} nodes`);

      // Fetch all nodes for this version
      const nodesCollection = mongoDBService.getCollection(this.COLLECTIONS.TRIE_NODES);
      const nodes = await nodesCollection.find({ version: metadata.version }).toArray();

      if (nodes.length === 0) {
        throw new Error(`No nodes found for backup version: ${metadata.version}`);
      }

      // Deserialize nodes back to Trie
      const trie = this.deserializeTrie(nodes);
      
      const restoreDuration = Date.now() - startTime;
      console.log(`Trie restore completed: ${nodes.length} nodes restored in ${restoreDuration}ms`);

      return {
        trie,
        metadata: {
          ...metadata,
          restoreDuration,
          nodesRestored: nodes.length
        }
      };

    } catch (error) {
      console.error('Error restoring Trie from MongoDB:', error);
      throw new Error(`Failed to restore Trie: ${error.message}`);
    }
  }

  /**
   * Serializes Trie structure to MongoDB document format
   * @param {Trie} trie - Trie to serialize
   * @param {string} version - Backup version
   * @returns {Array<Object>} Array of serialized node documents
   */
  serializeTrie(trie, version) {
    const nodes = [];
    const nodeIdMap = new Map(); // Map nodes to unique IDs
    let nodeIdCounter = 0;

    // Generate unique ID for a node
    const getNodeId = (node) => {
      if (!nodeIdMap.has(node)) {
        nodeIdMap.set(node, `${version}_node_${nodeIdCounter++}`);
      }
      return nodeIdMap.get(node);
    };

    // Recursive function to serialize nodes
    const serializeNode = (node, parentId = null, character = null) => {
      const nodeId = getNodeId(node);
      
      // Create node document
      const nodeDoc = {
        nodeId,
        version,
        character,
        parentId,
        isEndOfWord: node.isEndOfWord,
        frequency: node.frequency || 0,
        word: node.word || null,
        children: [],
        createdAt: new Date()
      };

      // Process children
      for (const [char, childNode] of node.children) {
        const childId = getNodeId(childNode);
        nodeDoc.children.push({
          character: char,
          nodeId: childId
        });
        
        // Recursively serialize child
        serializeNode(childNode, nodeId, char);
      }

      nodes.push(nodeDoc);
    };

    // Start serialization from root
    serializeNode(trie.root);
    
    return nodes;
  }

  /**
   * Deserializes MongoDB documents back to Trie structure
   * @param {Array<Object>} nodeDocuments - Array of node documents from MongoDB
   * @returns {Trie} Reconstructed Trie instance
   */
  deserializeTrie(nodeDocuments) {
    const trie = new Trie();
    const nodeMap = new Map(); // Map nodeId to actual TrieNode instances
    
    // Create a map of all nodes first
    for (const doc of nodeDocuments) {
      const node = new TrieNode();
      node.isEndOfWord = doc.isEndOfWord;
      node.frequency = doc.frequency || 0;
      node.word = doc.word;
      
      nodeMap.set(doc.nodeId, {
        node,
        doc
      });
    }

    // Find root node (node with no parent)
    const rootDoc = nodeDocuments.find(doc => doc.parentId === null);
    if (!rootDoc) {
      throw new Error('Root node not found in backup data');
    }

    trie.root = nodeMap.get(rootDoc.nodeId).node;

    // Rebuild relationships
    for (const doc of nodeDocuments) {
      const { node } = nodeMap.get(doc.nodeId);
      
      // Add children
      for (const childRef of doc.children) {
        const childData = nodeMap.get(childRef.nodeId);
        if (childData) {
          node.children.set(childRef.character, childData.node);
        }
      }
    }

    // Recalculate word count
    trie.wordCount = nodeDocuments.filter(doc => doc.isEndOfWord).length;

    return trie;
  }

  /**
   * Gets backup metadata for a specific version or latest
   * @param {string} version - Backup version (null for latest)
   * @returns {Promise<Object|null>} Backup metadata or null if not found
   */
  async getBackupMetadata(version = null) {
    try {
      const metadataCollection = mongoDBService.getCollection(this.COLLECTIONS.TRIE_METADATA);
      
      let query = {};
      let sort = { createdAt: -1 };
      
      if (version) {
        query.version = version;
        sort = {};
      }

      return await metadataCollection.findOne(query, { sort });
    } catch (error) {
      console.error('Error getting backup metadata:', error);
      return null;
    }
  }

  /**
   * Lists all available backup versions
   * @returns {Promise<Array<Object>>} Array of backup metadata
   */
  async listBackupVersions() {
    try {
      const metadataCollection = mongoDBService.getCollection(this.COLLECTIONS.TRIE_METADATA);
      return await metadataCollection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
    } catch (error) {
      console.error('Error listing backup versions:', error);
      return [];
    }
  }

  /**
   * Deletes a specific backup version
   * @param {string} version - Version to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteBackupVersion(version) {
    try {
      if (!version) {
        throw new Error('Version is required');
      }

      const nodesCollection = mongoDBService.getCollection(this.COLLECTIONS.TRIE_NODES);
      const metadataCollection = mongoDBService.getCollection(this.COLLECTIONS.TRIE_METADATA);

      // Delete nodes
      const nodesResult = await nodesCollection.deleteMany({ version });
      
      // Delete metadata
      const metadataResult = await metadataCollection.deleteOne({ version });

      return {
        success: true,
        version,
        nodesDeleted: nodesResult.deletedCount,
        metadataDeleted: metadataResult.deletedCount > 0
      };
    } catch (error) {
      console.error('Error deleting backup version:', error);
      throw new Error(`Failed to delete backup: ${error.message}`);
    }
  }

  /**
   * Clears all data for a specific backup version
   * @param {string} version - Version to clear
   * @returns {Promise<void>}
   */
  async clearBackupVersion(version) {
    try {
      const nodesCollection = mongoDBService.getCollection(this.COLLECTIONS.TRIE_NODES);
      const metadataCollection = mongoDBService.getCollection(this.COLLECTIONS.TRIE_METADATA);

      await Promise.all([
        nodesCollection.deleteMany({ version }),
        metadataCollection.deleteOne({ version })
      ]);
    } catch (error) {
      console.error('Error clearing backup version:', error);
      // Don't throw here as this is often called before backup
    }
  }

  /**
   * Gets statistics about all backups
   * @returns {Promise<Object>} Backup statistics
   */
  async getBackupStats() {
    try {
      const metadataCollection = mongoDBService.getCollection(this.COLLECTIONS.TRIE_METADATA);
      const nodesCollection = mongoDBService.getCollection(this.COLLECTIONS.TRIE_NODES);

      const [metadataCount, totalNodes, latestBackup] = await Promise.all([
        metadataCollection.countDocuments(),
        nodesCollection.countDocuments(),
        metadataCollection.findOne({}, { sort: { createdAt: -1 } })
      ]);

      return {
        totalBackups: metadataCount,
        totalNodes: totalNodes,
        latestBackup: latestBackup ? {
          version: latestBackup.version,
          createdAt: latestBackup.createdAt,
          nodeCount: latestBackup.nodeCount,
          wordCount: latestBackup.wordCount
        } : null
      };
    } catch (error) {
      console.error('Error getting backup stats:', error);
      return {
        totalBackups: 0,
        totalNodes: 0,
        latestBackup: null,
        error: error.message
      };
    }
  }
}

module.exports = TriePersistenceService;