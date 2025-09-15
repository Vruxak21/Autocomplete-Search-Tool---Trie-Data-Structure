const mongoDBService = require('../src/services/MongoDBService');
const TriePersistenceService = require('../src/services/TriePersistenceService');
const SearchAnalyticsService = require('../src/services/SearchAnalyticsService');
const DatasetLoader = require('../src/services/DatasetLoader');

/**
 * Demonstration of MongoDB integration with Trie persistence and analytics
 * This example shows how to:
 * 1. Connect to MongoDB
 * 2. Load data into Trie
 * 3. Backup Trie to MongoDB
 * 4. Record search analytics
 * 5. Restore Trie from MongoDB
 * 6. Query analytics data
 */
async function mongoDBIntegrationDemo() {
  console.log('🚀 Starting MongoDB Integration Demo...\n');

  try {
    // 1. Connect to MongoDB
    console.log('1. Connecting to MongoDB...');
    await mongoDBService.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017',
      process.env.MONGODB_DB_NAME || 'autocomplete-demo'
    );
    
    // Create indexes for better performance
    await mongoDBService.createIndexes();
    console.log('✅ Connected to MongoDB and created indexes\n');

    // 2. Load sample data into Trie
    console.log('2. Loading sample data into Trie...');
    const datasetLoader = new DatasetLoader();
    
    // Add some sample data manually for demo
    const sampleData = [
      { word: 'apple', frequency: 10 },
      { word: 'application', frequency: 8 },
      { word: 'apply', frequency: 6 },
      { word: 'banana', frequency: 5 },
      { word: 'band', frequency: 3 },
      { word: 'bandana', frequency: 2 },
      { word: 'cherry', frequency: 4 },
      { word: 'chocolate', frequency: 7 }
    ];

    const trie = datasetLoader.getTrie();
    sampleData.forEach(({ word, frequency }) => {
      trie.insert(word, frequency);
    });

    console.log(`✅ Loaded ${sampleData.length} words into Trie`);
    console.log(`   Trie stats: ${JSON.stringify(trie.getStats(), null, 2)}\n`);

    // 3. Backup Trie to MongoDB
    console.log('3. Backing up Trie to MongoDB...');
    const persistenceService = new TriePersistenceService();
    const backupResult = await persistenceService.exportTrieToMongoDB(trie, 'demo_backup_v1');
    
    console.log('✅ Trie backup completed:');
    console.log(`   Version: ${backupResult.version}`);
    console.log(`   Nodes backed up: ${backupResult.nodesBackedUp}`);
    console.log(`   Words backed up: ${backupResult.wordsBackedUp}`);
    console.log(`   Backup duration: ${backupResult.backupDuration}ms\n`);

    // 4. Record some search analytics
    console.log('4. Recording search analytics...');
    const analyticsService = new SearchAnalyticsService();
    
    const searchQueries = [
      { query: 'app', responseTime: 45, resultCount: 3, userSession: 'user_1' },
      { query: 'apple', responseTime: 30, resultCount: 1, userSession: 'user_1', selectedSuggestion: 'apple' },
      { query: 'ban', responseTime: 35, resultCount: 2, userSession: 'user_2' },
      { query: 'ch', responseTime: 40, resultCount: 2, userSession: 'user_3' },
      { query: 'chocolate', responseTime: 25, resultCount: 1, userSession: 'user_3', selectedSuggestion: 'chocolate' }
    ];

    for (const searchData of searchQueries) {
      await analyticsService.recordSearch(searchData);
      if (searchData.selectedSuggestion) {
        await analyticsService.recordSuggestionSelection({
          query: searchData.query,
          selectedSuggestion: searchData.selectedSuggestion,
          userSession: searchData.userSession,
          selectionIndex: 0
        });
      }
    }

    console.log(`✅ Recorded ${searchQueries.length} search queries\n`);

    // 5. Clear Trie and restore from MongoDB
    console.log('5. Clearing Trie and restoring from MongoDB...');
    trie.clear();
    console.log(`   Trie cleared - word count: ${trie.getWordCount()}`);
    
    const restoreResult = await persistenceService.restoreTrieFromMongoDB('demo_backup_v1');
    const restoredTrie = restoreResult.trie;
    
    console.log('✅ Trie restored from MongoDB:');
    console.log(`   Nodes restored: ${restoreResult.metadata.nodesRestored}`);
    console.log(`   Word count: ${restoredTrie.getWordCount()}`);
    console.log(`   Restore duration: ${restoreResult.metadata.restoreDuration}ms\n`);

    // 6. Test search functionality with restored Trie
    console.log('6. Testing search functionality with restored Trie...');
    const searchResults = restoredTrie.search('app', 3);
    console.log('✅ Search results for "app":');
    searchResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.word} (frequency: ${result.frequency})`);
    });
    console.log();

    // 7. Query analytics data
    console.log('7. Querying analytics data...');
    
    const popularQueries = await analyticsService.getPopularQueries({ limit: 5 });
    console.log('✅ Popular queries:');
    popularQueries.forEach((query, index) => {
      console.log(`   ${index + 1}. "${query.query}" - ${query.count} searches, avg ${query.avgResponseTime}ms`);
    });
    console.log();

    const performanceMetrics = await analyticsService.getPerformanceMetrics();
    console.log('✅ Performance metrics:');
    console.log(`   Total searches: ${performanceMetrics.totalSearches}`);
    console.log(`   Average response time: ${performanceMetrics.avgResponseTime}ms`);
    console.log(`   Success rate: ${performanceMetrics.successRate}%\n`);

    // 8. List backup versions
    console.log('8. Listing backup versions...');
    const backupVersions = await persistenceService.listBackupVersions();
    console.log('✅ Available backup versions:');
    backupVersions.forEach((backup, index) => {
      console.log(`   ${index + 1}. ${backup.version} - ${backup.wordCount} words (${backup.createdAt})`);
    });
    console.log();

    // 9. Get database statistics
    console.log('9. Getting database statistics...');
    const dbStats = await mongoDBService.getStats();
    console.log('✅ Database statistics:');
    console.log(`   Database: ${dbStats.database}`);
    console.log(`   Collections: ${dbStats.collections}`);
    console.log(`   Data size: ${Math.round(dbStats.dataSize / 1024)} KB`);
    console.log(`   Storage size: ${Math.round(dbStats.storageSize / 1024)} KB\n`);

    console.log('🎉 MongoDB Integration Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error(error.stack);
  } finally {
    // Clean up - disconnect from MongoDB
    try {
      await mongoDBService.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting:', error.message);
    }
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  mongoDBIntegrationDemo();
}

module.exports = mongoDBIntegrationDemo;