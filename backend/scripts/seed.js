#!/usr/bin/env node

/**
 * Database Seed Script
 * Initializes database with sample data and sets up collections
 */

const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Import services
const { DatasetLoader } = require('../src/services');
const mongoDBService = require('../src/services/MongoDBService');
const TriePersistenceService = require('../src/services/TriePersistenceService');
const { config } = require('../src/config/environment');

/**
 * Seed configuration options
 */
const SEED_OPTIONS = {
  datasets: ['cities', 'products', 'movies', 'sample', 'mixed'],
  force: false,
  backup: true,
  validate: true,
  cleanup: false,
  reset: false,
  progress: true,
  duplicateDetection: true
};

/**
 * Sample data for testing
 */
const SAMPLE_DATA = [
  { word: 'apple', frequency: 100 },
  { word: 'application', frequency: 85 },
  { word: 'apply', frequency: 70 },
  { word: 'appreciate', frequency: 60 },
  { word: 'approach', frequency: 55 },
  { word: 'banana', frequency: 90 },
  { word: 'band', frequency: 75 },
  { word: 'bandana', frequency: 40 },
  { word: 'bank', frequency: 95 },
  { word: 'banner', frequency: 50 },
  { word: 'cat', frequency: 80 },
  { word: 'car', frequency: 120 },
  { word: 'card', frequency: 110 },
  { word: 'care', frequency: 85 },
  { word: 'career', frequency: 70 },
  { word: 'dog', frequency: 75 },
  { word: 'door', frequency: 65 },
  { word: 'down', frequency: 90 },
  { word: 'download', frequency: 85 },
  { word: 'dragon', frequency: 45 },
  { word: 'elephant', frequency: 35 },
  { word: 'email', frequency: 100 },
  { word: 'emergency', frequency: 60 },
  { word: 'energy', frequency: 70 },
  { word: 'engine', frequency: 80 },
  { word: 'fire', frequency: 65 },
  { word: 'fish', frequency: 55 },
  { word: 'flower', frequency: 50 },
  { word: 'food', frequency: 95 },
  { word: 'forest', frequency: 45 },
  { word: 'game', frequency: 85 },
  { word: 'garden', frequency: 60 },
  { word: 'glass', frequency: 55 },
  { word: 'green', frequency: 70 },
  { word: 'guitar', frequency: 40 },
  { word: 'house', frequency: 90 },
  { word: 'human', frequency: 75 },
  { word: 'ice', frequency: 50 },
  { word: 'internet', frequency: 95 },
  { word: 'island', frequency: 45 },
  { word: 'java', frequency: 80 },
  { word: 'javascript', frequency: 85 },
  { word: 'jungle', frequency: 35 },
  { word: 'keyboard', frequency: 60 },
  { word: 'knowledge', frequency: 70 },
  { word: 'laptop', frequency: 75 },
  { word: 'library', frequency: 65 },
  { word: 'light', frequency: 80 },
  { word: 'love', frequency: 90 },
  { word: 'machine', frequency: 70 },
  { word: 'magic', frequency: 55 },
  { word: 'mountain', frequency: 60 },
  { word: 'music', frequency: 85 },
  { word: 'nature', frequency: 65 },
  { word: 'network', frequency: 75 },
  { word: 'ocean', frequency: 55 },
  { word: 'orange', frequency: 60 },
  { word: 'paper', frequency: 65 },
  { word: 'phone', frequency: 95 },
  { word: 'picture', frequency: 70 },
  { word: 'planet', frequency: 50 },
  { word: 'python', frequency: 80 },
  { word: 'question', frequency: 75 },
  { word: 'rainbow', frequency: 45 },
  { word: 'river', frequency: 55 },
  { word: 'robot', frequency: 60 },
  { word: 'science', frequency: 70 },
  { word: 'search', frequency: 90 },
  { word: 'space', frequency: 65 },
  { word: 'star', frequency: 70 },
  { word: 'technology', frequency: 85 },
  { word: 'tree', frequency: 60 },
  { word: 'universe', frequency: 55 },
  { word: 'water', frequency: 80 },
  { word: 'world', frequency: 95 },
  { word: 'yellow', frequency: 50 },
  { word: 'zebra', frequency: 30 }
];

/**
 * Command line argument parser
 */
class ArgumentParser {
  static parse(args) {
    const options = { ...SEED_OPTIONS };
    
    for (let i = 2; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--force':
          options.force = true;
          break;
        case '--no-backup':
          options.backup = false;
          break;
        case '--no-validate':
          options.validate = false;
          break;
        case '--no-progress':
          options.progress = false;
          break;
        case '--no-duplicate-detection':
          options.duplicateDetection = false;
          break;
        case '--cleanup':
          options.cleanup = true;
          break;
        case '--reset':
          options.reset = true;
          options.force = true; // Reset implies force
          break;
        case '--datasets':
          if (i + 1 < args.length) {
            options.datasets = args[i + 1].split(',');
            i++;
          }
          break;
        case '--help':
          this.printHelp();
          process.exit(0);
          break;
        default:
          if (arg.startsWith('--')) {
            console.warn(`Unknown option: ${arg}`);
          }
      }
    }
    
    return options;
  }
  
  static printHelp() {
    console.log(`
Database Seed Script

Usage: node scripts/seed.js [options]

Options:
  --force                    Force seed even if data already exists
  --no-backup               Skip backing up existing data
  --no-validate             Skip data validation
  --no-progress             Disable progress reporting
  --no-duplicate-detection  Skip duplicate detection during seeding
  --cleanup                 Clean up temporary files and collections after seeding
  --reset                   Reset database (delete all data) before seeding
  --datasets <list>         Comma-separated list of datasets to load
                           Available: cities,products,movies,sample,mixed
  --help                   Show this help message

Dataset Options:
  cities    - World cities dataset (~47k entries)
  products  - Flipkart e-commerce products (~20k entries)
  movies    - Movie titles dataset (~85k entries)
  sample    - Small sample dataset for testing (~75 entries)
  mixed     - Combination of all available datasets

Examples:
  node scripts/seed.js
  node scripts/seed.js --force --datasets cities,sample
  node scripts/seed.js --no-backup --datasets sample
  node scripts/seed.js --reset --datasets mixed
  node scripts/seed.js --cleanup --datasets cities,products
    `);
  }
}

/**
 * Progress reporter for large dataset loading
 */
class ProgressReporter {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.startTime = Date.now();
    this.lastReportTime = Date.now();
    this.reportInterval = 2000; // Report every 2 seconds
  }

  report(current, total, operation = 'Processing') {
    if (!this.enabled) return;
    
    const now = Date.now();
    if (now - this.lastReportTime < this.reportInterval && current < total) return;
    
    const elapsed = now - this.startTime;
    const percentage = total > 0 ? ((current / total) * 100).toFixed(1) : 0;
    const rate = current > 0 ? (current / (elapsed / 1000)).toFixed(1) : 0;
    const eta = current > 0 && current < total ? 
      Math.round(((total - current) / current) * elapsed / 1000) : 0;
    
    process.stdout.write(`\r[PROGRESS] ${operation}: ${current}/${total} (${percentage}%) - ${rate} items/sec - ETA: ${eta}s`);
    
    if (current >= total) {
      console.log(); // New line when complete
    }
    
    this.lastReportTime = now;
  }

  finish(operation = 'Operation') {
    if (!this.enabled) return;
    const elapsed = Date.now() - this.startTime;
    console.log(`[PROGRESS] ${operation} completed in ${elapsed}ms`);
  }
}

/**
 * Database seeder class
 */
class DatabaseSeeder {
  constructor(options) {
    this.options = options;
    this.datasetLoader = null;
    this.trie = null;
    this.duplicateTracker = new Set();
    this.progressReporter = new ProgressReporter(options.progress);
    this.stats = {
      startTime: Date.now(),
      datasetsProcessed: 0,
      recordsLoaded: 0,
      duplicatesSkipped: 0,
      errors: [],
      validationResults: {},
      cleanupActions: []
    };
  }

  /**
   * Run the seeding process
   */
  async seed() {
    console.log('[SEED] Starting database seeding...');
    console.log('[SEED] Options:', this.options);
    
    try {
      // Load configuration
      const appConfig = config.load();
      
      // Connect to MongoDB
      await this.connectToDatabase(appConfig);
      
      // Reset database if requested
      if (this.options.reset) {
        await this.resetDatabase();
      }

      // Check if data already exists
      if (!this.options.force && !this.options.reset) {
        const hasExistingData = await this.checkExistingData();
        if (hasExistingData) {
          console.log('[SEED] Data already exists. Use --force to overwrite or --reset to clear.');
          return;
        }
      }
      
      // Backup existing data if requested
      if (this.options.backup) {
        await this.backupExistingData();
      }
      
      // Initialize Trie
      this.initializeTrie();
      
      // Load datasets
      await this.loadDatasets();
      
      // Validate data if requested
      if (this.options.validate) {
        await this.validateData();
      }
      
      // Save to database
      await this.saveToDatabase();
      
      // Cleanup if requested
      if (this.options.cleanup) {
        await this.performCleanup();
      }

      // Print summary
      this.printSummary();
      
      console.log('[SEED] Database seeding completed successfully');
      
    } catch (error) {
      console.error('[SEED] Seeding failed:', error.message);
      this.stats.errors.push(error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Connect to MongoDB
   */
  async connectToDatabase(appConfig) {
    if (!appConfig.MONGODB_URI) {
      throw new Error('MongoDB URI not configured');
    }
    
    console.log('[SEED] Connecting to MongoDB...');
    await mongoDBService.connect(appConfig.MONGODB_URI, appConfig.MONGODB_DB_NAME);
    await mongoDBService.createIndexes();
    console.log('[SEED] Connected to MongoDB');
  }

  /**
   * Reset database by dropping all collections
   */
  async resetDatabase() {
    try {
      console.log('[SEED] Resetting database...');
      const db = mongoDBService.getDatabase();
      
      // Get all collections
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      // Drop each collection
      for (const collectionName of collectionNames) {
        if (!collectionName.startsWith('system.')) {
          await db.collection(collectionName).drop();
          console.log(`[SEED] Dropped collection: ${collectionName}`);
          this.stats.cleanupActions.push(`Dropped collection: ${collectionName}`);
        }
      }
      
      // Recreate indexes
      await mongoDBService.createIndexes();
      console.log('[SEED] Database reset completed');
      
    } catch (error) {
      console.warn('[SEED] Database reset failed:', error.message);
      this.stats.errors.push(`Reset failed: ${error.message}`);
    }
  }

  /**
   * Check if data already exists
   */
  async checkExistingData() {
    try {
      const db = mongoDBService.getDatabase();
      const trieCollection = db.collection('trie_nodes');
      const count = await trieCollection.countDocuments();
      return count > 0;
    } catch (error) {
      console.warn('[SEED] Could not check existing data:', error.message);
      return false;
    }
  }

  /**
   * Backup existing data
   */
  async backupExistingData() {
    try {
      console.log('[SEED] Backing up existing data...');
      const db = mongoDBService.getDatabase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Create backup collections
      const collections = ['trie_nodes', 'search_analytics', 'trie_metadata'];
      
      for (const collectionName of collections) {
        const sourceCollection = db.collection(collectionName);
        const backupCollection = db.collection(`${collectionName}_backup_${timestamp}`);
        
        const documents = await sourceCollection.find({}).toArray();
        if (documents.length > 0) {
          await backupCollection.insertMany(documents);
          console.log(`[SEED] Backed up ${documents.length} documents from ${collectionName}`);
        }
      }
      
      console.log('[SEED] Backup completed');
    } catch (error) {
      console.warn('[SEED] Backup failed:', error.message);
    }
  }

  /**
   * Initialize Trie
   */
  initializeTrie() {
    console.log('[SEED] Initializing Trie...');
    this.datasetLoader = new DatasetLoader();
    this.trie = this.datasetLoader.getTrie();
  }

  /**
   * Load datasets
   */
  async loadDatasets() {
    console.log('[SEED] Loading datasets:', this.options.datasets);
    
    for (const datasetType of this.options.datasets) {
      try {
        await this.loadDataset(datasetType);
        this.stats.datasetsProcessed++;
      } catch (error) {
        console.error(`[SEED] Failed to load ${datasetType}:`, error.message);
        this.stats.errors.push(`${datasetType}: ${error.message}`);
      }
    }
  }

  /**
   * Load a specific dataset
   */
  async loadDataset(datasetType) {
    console.log(`[SEED] Loading ${datasetType} dataset...`);
    
    switch (datasetType) {
      case 'sample':
        await this.loadSampleData();
        break;
      case 'cities':
        await this.loadCitiesDataset();
        break;
      case 'products':
        await this.loadProductsDataset();
        break;
      case 'movies':
        await this.loadMoviesDataset();
        break;
      case 'mixed':
        await this.loadMixedDatasets();
        break;
      default:
        throw new Error(`Unknown dataset type: ${datasetType}`);
    }
  }

  /**
   * Load sample data
   */
  async loadSampleData() {
    console.log('[SEED] Loading sample data...');
    let loaded = 0;
    let duplicates = 0;
    
    this.progressReporter.report(0, SAMPLE_DATA.length, 'Loading sample data');
    
    for (let i = 0; i < SAMPLE_DATA.length; i++) {
      const item = SAMPLE_DATA[i];
      
      // Check for duplicates if enabled
      if (this.options.duplicateDetection) {
        const key = item.word.toLowerCase().trim();
        if (this.duplicateTracker.has(key)) {
          duplicates++;
          this.stats.duplicatesSkipped++;
          continue;
        }
        this.duplicateTracker.add(key);
      }
      
      this.trie.insert(item.word, item.frequency);
      loaded++;
      
      this.progressReporter.report(i + 1, SAMPLE_DATA.length, 'Loading sample data');
    }
    
    this.progressReporter.finish('Sample data loading');
    this.stats.recordsLoaded += loaded;
    console.log(`[SEED] Loaded ${loaded} sample records (${duplicates} duplicates skipped)`);
  }

  /**
   * Load cities dataset
   */
  async loadCitiesDataset() {
    const filePath = await this.findDatasetFile('worldcities.csv');
    if (!filePath) {
      throw new Error('Cities dataset file not found');
    }
    
    const result = await this.datasetLoader.loadCitiesDataset(filePath);
    this.stats.recordsLoaded += result.validRecords;
    console.log(`[SEED] Loaded ${result.validRecords} city records`);
  }

  /**
   * Load products dataset
   */
  async loadProductsDataset() {
    const filePath = await this.findDatasetFile('flipkart_com-ecommerce_sample.csv');
    if (!filePath) {
      throw new Error('Products dataset file not found');
    }
    
    const result = await this.datasetLoader.loadProductsDataset(filePath);
    this.stats.recordsLoaded += result.validRecords;
    console.log(`[SEED] Loaded ${result.validRecords} product records`);
  }

  /**
   * Load movies dataset
   */
  async loadMoviesDataset() {
    throw new Error('Movies dataset loader not implemented yet');
  }

  /**
   * Load mixed datasets (combination of all available datasets)
   */
  async loadMixedDatasets() {
    console.log('[SEED] Loading mixed datasets...');
    const availableDatasets = [];
    
    // Check which datasets are available
    const datasets = ['cities', 'products', 'movies'];
    for (const dataset of datasets) {
      try {
        const filename = dataset === 'cities' ? 'worldcities.csv' :
                        dataset === 'products' ? 'flipkart_com-ecommerce_sample.csv' :
                        'Movie.tsv';
        const filePath = await this.findDatasetFile(filename);
        if (filePath) {
          availableDatasets.push(dataset);
        }
      } catch (error) {
        console.warn(`[SEED] ${dataset} dataset not available: ${error.message}`);
      }
    }
    
    // Always include sample data
    availableDatasets.push('sample');
    
    console.log(`[SEED] Loading mixed datasets: ${availableDatasets.join(', ')}`);
    
    // Load each available dataset
    for (const dataset of availableDatasets) {
      try {
        await this.loadDataset(dataset);
      } catch (error) {
        console.error(`[SEED] Failed to load ${dataset} in mixed mode:`, error.message);
        this.stats.errors.push(`Mixed dataset ${dataset}: ${error.message}`);
      }
    }
    
    console.log(`[SEED] Mixed datasets loading completed`);
  }

  /**
   * Find dataset file in various locations
   */
  async findDatasetFile(filename) {
    const possiblePaths = [
      path.resolve(__dirname, '../../data', filename),
      path.resolve(__dirname, '../..', filename),
      path.resolve(filename)
    ];

    for (const filePath of possiblePaths) {
      try {
        await fs.access(filePath);
        return filePath;
      } catch (error) {
        // File doesn't exist, continue searching
      }
    }

    return null;
  }

  /**
   * Validate loaded data
   */
  async validateData() {
    console.log('[SEED] Validating data...');
    
    const stats = this.trie.getStats();
    const validationResults = {
      wordCount: stats.wordCount,
      nodeCount: stats.nodeCount,
      searchTests: {},
      dataIntegrity: {},
      performance: {}
    };
    
    // Basic data validation
    if (stats.wordCount === 0) {
      throw new Error('No data was loaded into Trie');
    }
    
    if (stats.nodeCount === 0) {
      throw new Error('Trie has no nodes');
    }
    
    // Test search functionality with various queries
    const testQueries = ['a', 'app', 'test', 'city', 'product', 'movie', 'xyz123'];
    console.log('[SEED] Running search validation tests...');
    
    for (const query of testQueries) {
      const startTime = Date.now();
      const results = this.trie.search(query);
      const searchTime = Date.now() - startTime;
      
      validationResults.searchTests[query] = {
        resultCount: results.length,
        searchTime: searchTime,
        hasResults: results.length > 0
      };
      
      console.log(`[SEED] Test query "${query}": ${results.length} results (${searchTime}ms)`);
    }
    
    // Data integrity checks
    validationResults.dataIntegrity.duplicateDetectionEnabled = this.options.duplicateDetection;
    validationResults.dataIntegrity.duplicatesSkipped = this.stats.duplicatesSkipped;
    validationResults.dataIntegrity.totalRecordsLoaded = this.stats.recordsLoaded;
    
    // Performance validation
    const performanceTestQuery = 'test';
    const performanceRuns = 10;
    const performanceTimes = [];
    
    for (let i = 0; i < performanceRuns; i++) {
      const startTime = Date.now();
      this.trie.search(performanceTestQuery);
      performanceTimes.push(Date.now() - startTime);
    }
    
    const avgPerformance = performanceTimes.reduce((a, b) => a + b, 0) / performanceRuns;
    const maxPerformance = Math.max(...performanceTimes);
    
    validationResults.performance = {
      averageSearchTime: avgPerformance,
      maxSearchTime: maxPerformance,
      performanceRuns: performanceRuns,
      meetsRequirement: avgPerformance < 100 // Should be under 100ms
    };
    
    console.log(`[SEED] Performance test: avg ${avgPerformance.toFixed(2)}ms, max ${maxPerformance}ms`);
    
    if (!validationResults.performance.meetsRequirement) {
      console.warn('[SEED] Warning: Average search time exceeds 100ms requirement');
    }
    
    this.stats.validationResults = validationResults;
    console.log('[SEED] Data validation completed');
  }

  /**
   * Save data to database
   */
  async saveToDatabase() {
    console.log('[SEED] Saving data to database...');
    
    const persistenceService = new TriePersistenceService();
    await persistenceService.exportTrieToMongoDB(this.trie);
    
    console.log('[SEED] Data saved to database');
  }

  /**
   * Print seeding summary
   */
  printSummary() {
    const duration = Date.now() - this.stats.startTime;
    const trieStats = this.trie.getStats();
    
    console.log('\n[SEED] Seeding Summary:');
    console.log(`  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log(`  Datasets processed: ${this.stats.datasetsProcessed}`);
    console.log(`  Records loaded: ${this.stats.recordsLoaded}`);
    console.log(`  Duplicates skipped: ${this.stats.duplicatesSkipped}`);
    console.log(`  Trie words: ${trieStats.wordCount}`);
    console.log(`  Trie nodes: ${trieStats.nodeCount}`);
    console.log(`  Errors: ${this.stats.errors.length}`);
    console.log(`  Cleanup actions: ${this.stats.cleanupActions.length}`);
    
    // Validation results summary
    if (this.stats.validationResults && Object.keys(this.stats.validationResults).length > 0) {
      const validation = this.stats.validationResults;
      console.log('\n[SEED] Validation Results:');
      console.log(`  Search tests passed: ${Object.keys(validation.searchTests).length}`);
      if (validation.performance) {
        console.log(`  Average search time: ${validation.performance.averageSearchTime.toFixed(2)}ms`);
        console.log(`  Performance requirement met: ${validation.performance.meetsRequirement ? '✓' : '✗'}`);
      }
    }
    
    // Cleanup actions
    if (this.stats.cleanupActions.length > 0) {
      console.log('\n[SEED] Cleanup Actions:');
      this.stats.cleanupActions.forEach(action => {
        console.log(`  - ${action}`);
      });
    }
    
    // Errors
    if (this.stats.errors.length > 0) {
      console.log('\n[SEED] Errors:');
      this.stats.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }
    
    // Configuration used
    console.log('\n[SEED] Configuration:');
    console.log(`  Datasets: ${this.options.datasets.join(', ')}`);
    console.log(`  Force mode: ${this.options.force}`);
    console.log(`  Backup enabled: ${this.options.backup}`);
    console.log(`  Validation enabled: ${this.options.validate}`);
    console.log(`  Progress reporting: ${this.options.progress}`);
    console.log(`  Duplicate detection: ${this.options.duplicateDetection}`);
    console.log(`  Cleanup enabled: ${this.options.cleanup}`);
    console.log(`  Reset mode: ${this.options.reset}`);
  }

  /**
   * Perform cleanup operations
   */
  async performCleanup() {
    try {
      console.log('[SEED] Performing cleanup...');
      const db = mongoDBService.getDatabase();
      
      // Clean up backup collections older than 7 days
      const collections = await db.listCollections().toArray();
      const backupCollections = collections.filter(c => c.name.includes('_backup_'));
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      for (const collection of backupCollections) {
        const match = collection.name.match(/_backup_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
        if (match) {
          const backupDate = new Date(match[1].replace(/-/g, ':').replace('T', 'T').slice(0, -3));
          if (backupDate < sevenDaysAgo) {
            await db.collection(collection.name).drop();
            console.log(`[SEED] Cleaned up old backup: ${collection.name}`);
            this.stats.cleanupActions.push(`Cleaned up old backup: ${collection.name}`);
          }
        }
      }
      
      // Clean up temporary files if any exist
      const tempDir = path.resolve(__dirname, '../temp');
      try {
        const tempFiles = await fs.readdir(tempDir);
        for (const file of tempFiles) {
          if (file.startsWith('seed_temp_')) {
            await fs.unlink(path.join(tempDir, file));
            console.log(`[SEED] Cleaned up temp file: ${file}`);
            this.stats.cleanupActions.push(`Cleaned up temp file: ${file}`);
          }
        }
      } catch (error) {
        // Temp directory doesn't exist, which is fine
      }
      
      console.log('[SEED] Cleanup completed');
      
    } catch (error) {
      console.warn('[SEED] Cleanup failed:', error.message);
      this.stats.errors.push(`Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      if (mongoDBService.isConnectedToMongoDB()) {
        await mongoDBService.disconnect();
        console.log('[SEED] Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('[SEED] Cleanup error:', error.message);
    }
  }
}

// CLI execution
if (require.main === module) {
  const options = ArgumentParser.parse(process.argv);
  const seeder = new DatabaseSeeder(options);
  
  seeder.seed()
    .then(() => {
      console.log('\n✓ Database seeding completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n✗ Database seeding failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  DatabaseSeeder,
  ArgumentParser,
  SAMPLE_DATA
};