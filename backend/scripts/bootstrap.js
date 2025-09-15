#!/usr/bin/env node

/**
 * Application Bootstrap Script
 * Handles application initialization, dataset loading, and startup configuration
 */

const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Import services
const { DatasetLoader } = require('../src/services');
const mongoDBService = require('../src/services/MongoDBService');
const TriePersistenceService = require('../src/services/TriePersistenceService');

/**
 * Bootstrap configuration
 */
const BOOTSTRAP_CONFIG = {
  datasets: {
    cities: {
      filename: 'worldcities.csv',
      type: 'cities',
      priority: 1
    },
    products: {
      filename: 'flipkart_com-ecommerce_sample.csv', 
      type: 'products',
      priority: 2
    },
    movies: {
      filename: 'Movie.tsv',
      type: 'movies',
      priority: 3
    }
  },
  performance: {
    maxInitTime: 30000, // 30 seconds max initialization time
    logInterval: 1000,  // Log progress every second
  },
  fallback: {
    sampleData: [
      { word: 'apple', frequency: 10 },
      { word: 'application', frequency: 8 },
      { word: 'apply', frequency: 6 },
      { word: 'banana', frequency: 5 },
      { word: 'band', frequency: 4 },
      { word: 'bandana', frequency: 3 },
      { word: 'cat', frequency: 7 },
      { word: 'car', frequency: 9 },
      { word: 'card', frequency: 6 },
      { word: 'care', frequency: 8 }
    ]
  }
};

/**
 * Performance logger for startup monitoring
 */
class StartupLogger {
  constructor() {
    this.startTime = Date.now();
    this.phases = new Map();
    this.currentPhase = null;
  }

  startPhase(phaseName) {
    if (this.currentPhase) {
      this.endPhase();
    }
    this.currentPhase = phaseName;
    this.phases.set(phaseName, {
      startTime: Date.now(),
      endTime: null,
      duration: null,
      status: 'running'
    });
    console.log(`[BOOTSTRAP] Starting phase: ${phaseName}`);
  }

  endPhase(status = 'completed') {
    if (!this.currentPhase) return;
    
    const phase = this.phases.get(this.currentPhase);
    phase.endTime = Date.now();
    phase.duration = phase.endTime - phase.startTime;
    phase.status = status;
    
    console.log(`[BOOTSTRAP] Phase ${this.currentPhase} ${status} in ${phase.duration}ms`);
    this.currentPhase = null;
  }

  logError(phase, error) {
    console.error(`[BOOTSTRAP] Error in ${phase}:`, error.message);
    if (this.phases.has(phase)) {
      this.phases.get(phase).error = error.message;
      this.phases.get(phase).status = 'failed';
    }
  }

  getSummary() {
    const totalTime = Date.now() - this.startTime;
    const summary = {
      totalTime,
      phases: Object.fromEntries(this.phases),
      success: Array.from(this.phases.values()).every(p => p.status === 'completed')
    };
    return summary;
  }

  logSummary() {
    const summary = this.getSummary();
    console.log('\n[BOOTSTRAP] Startup Summary:');
    console.log(`Total time: ${summary.totalTime}ms`);
    console.log(`Success: ${summary.success}`);
    
    for (const [phase, data] of Object.entries(summary.phases)) {
      const status = data.status === 'completed' ? '✓' : 
                    data.status === 'failed' ? '✗' : '⏳';
      console.log(`  ${status} ${phase}: ${data.duration || 'N/A'}ms`);
      if (data.error) {
        console.log(`    Error: ${data.error}`);
      }
    }
  }
}

/**
 * Environment configuration validator
 */
class ConfigValidator {
  static validate() {
    const requiredEnvVars = [
      'NODE_ENV',
      'PORT'
    ];

    const optionalEnvVars = [
      'MONGODB_URI',
      'MONGODB_DB_NAME',
      'MAX_SUGGESTIONS',
      'SEARCH_TIMEOUT_MS',
      'TRIE_BACKUP_INTERVAL_MS'
    ];

    const config = {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: parseInt(process.env.PORT) || 3001,
      MONGODB_URI: process.env.MONGODB_URI,
      MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'autocomplete-search',
      MAX_SUGGESTIONS: parseInt(process.env.MAX_SUGGESTIONS) || 5,
      SEARCH_TIMEOUT_MS: parseInt(process.env.SEARCH_TIMEOUT_MS) || 100,
      TRIE_BACKUP_INTERVAL_MS: parseInt(process.env.TRIE_BACKUP_INTERVAL_MS) || 300000
    };

    // Validate required variables
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
      console.warn(`[CONFIG] Missing environment variables: ${missing.join(', ')}`);
    }

    // Log configuration (without sensitive data)
    console.log('[CONFIG] Application configuration:');
    console.log(`  NODE_ENV: ${config.NODE_ENV}`);
    console.log(`  PORT: ${config.PORT}`);
    console.log(`  MONGODB_URI: ${config.MONGODB_URI ? '[SET]' : '[NOT SET]'}`);
    console.log(`  MONGODB_DB_NAME: ${config.MONGODB_DB_NAME}`);
    console.log(`  MAX_SUGGESTIONS: ${config.MAX_SUGGESTIONS}`);
    console.log(`  SEARCH_TIMEOUT_MS: ${config.SEARCH_TIMEOUT_MS}`);
    console.log(`  TRIE_BACKUP_INTERVAL_MS: ${config.TRIE_BACKUP_INTERVAL_MS}`);

    return config;
  }
}

/**
 * Dataset discovery and validation
 */
class DatasetDiscovery {
  static async discoverDatasets() {
    const datasets = [];
    const dataDir = path.resolve(__dirname, '../../data');
    const rootDir = path.resolve(__dirname, '../..');

    console.log('[DISCOVERY] Searching for datasets...');
    console.log(`  Data directory: ${dataDir}`);
    console.log(`  Root directory: ${rootDir}`);

    for (const [key, config] of Object.entries(BOOTSTRAP_CONFIG.datasets)) {
      const possiblePaths = [
        path.join(dataDir, config.filename),
        path.join(rootDir, config.filename),
        path.resolve(config.filename)
      ];

      for (const filePath of possiblePaths) {
        try {
          await fs.access(filePath);
          const stats = await fs.stat(filePath);
          datasets.push({
            key,
            type: config.type,
            filePath,
            size: stats.size,
            priority: config.priority
          });
          console.log(`  ✓ Found ${key}: ${filePath} (${stats.size} bytes)`);
          break;
        } catch (error) {
          // File doesn't exist, continue searching
        }
      }
    }

    // Sort by priority
    datasets.sort((a, b) => a.priority - b.priority);

    if (datasets.length === 0) {
      console.warn('[DISCOVERY] No datasets found, will use fallback sample data');
    } else {
      console.log(`[DISCOVERY] Found ${datasets.length} dataset(s)`);
    }

    return datasets;
  }
}

/**
 * Main bootstrap class
 */
class ApplicationBootstrap {
  constructor() {
    this.logger = new StartupLogger();
    this.config = null;
    this.datasetLoader = null;
    this.trie = null;
    this.mongoConnected = false;
  }

  /**
   * Initialize application configuration
   */
  async initializeConfig() {
    this.logger.startPhase('config-validation');
    try {
      this.config = ConfigValidator.validate();
      this.logger.endPhase();
      return this.config;
    } catch (error) {
      this.logger.logError('config-validation', error);
      this.logger.endPhase('failed');
      throw error;
    }
  }

  /**
   * Initialize MongoDB connection (optional)
   */
  async initializeDatabase() {
    this.logger.startPhase('database-connection');
    
    if (!this.config.MONGODB_URI) {
      console.log('[DATABASE] MongoDB URI not configured, skipping database connection');
      this.logger.endPhase('skipped');
      return false;
    }

    try {
      await mongoDBService.connect(this.config.MONGODB_URI, this.config.MONGODB_DB_NAME);
      await mongoDBService.createIndexes();
      this.mongoConnected = true;
      this.logger.endPhase();
      return true;
    } catch (error) {
      this.logger.logError('database-connection', error);
      console.warn('[DATABASE] Failed to connect to MongoDB, continuing without persistence');
      this.logger.endPhase('failed');
      return false;
    }
  }

  /**
   * Initialize Trie and load datasets
   */
  async initializeTrie() {
    this.logger.startPhase('trie-initialization');
    
    try {
      this.datasetLoader = new DatasetLoader();
      this.trie = this.datasetLoader.getTrie();

      // Try to restore from MongoDB if connected
      if (this.mongoConnected) {
        try {
          const persistenceService = new TriePersistenceService(mongoDBService);
          const restored = await persistenceService.restoreFromMongoDB(this.trie);
          if (restored) {
            console.log('[TRIE] Successfully restored Trie from MongoDB');
            this.logger.endPhase();
            return this.trie;
          }
        } catch (error) {
          console.warn('[TRIE] Failed to restore from MongoDB:', error.message);
        }
      }

      // Load from datasets
      const datasets = await DatasetDiscovery.discoverDatasets();
      
      if (datasets.length > 0) {
        const results = await this.datasetLoader.loadMultipleDatasets(datasets);
        console.log('[TRIE] Dataset loading results:', results.totalStats);
        
        for (const result of results.datasets) {
          if (result.error) {
            console.error(`[TRIE] Failed to load ${result.dataset}:`, result.error);
          } else {
            console.log(`[TRIE] Successfully loaded ${result.dataset}: ${result.validRecords} records`);
          }
        }
      } else {
        // Load fallback sample data
        console.log('[TRIE] Loading fallback sample data...');
        for (const item of BOOTSTRAP_CONFIG.fallback.sampleData) {
          this.trie.insert(item.word, item.frequency);
        }
        console.log(`[TRIE] Loaded ${BOOTSTRAP_CONFIG.fallback.sampleData.length} sample entries`);
      }

      // Backup to MongoDB if connected
      if (this.mongoConnected) {
        try {
          const persistenceService = new TriePersistenceService(mongoDBService);
          await persistenceService.backupToMongoDB(this.trie);
          console.log('[TRIE] Successfully backed up Trie to MongoDB');
        } catch (error) {
          console.warn('[TRIE] Failed to backup to MongoDB:', error.message);
        }
      }

      this.logger.endPhase();
      return this.trie;
    } catch (error) {
      this.logger.logError('trie-initialization', error);
      this.logger.endPhase('failed');
      throw error;
    }
  }

  /**
   * Run complete bootstrap process
   */
  async bootstrap() {
    console.log('[BOOTSTRAP] Starting application bootstrap...');
    
    try {
      // Set timeout for bootstrap process
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Bootstrap timeout after ${BOOTSTRAP_CONFIG.performance.maxInitTime}ms`));
        }, BOOTSTRAP_CONFIG.performance.maxInitTime);
      });

      const bootstrapPromise = this.runBootstrapSteps();
      
      await Promise.race([bootstrapPromise, timeoutPromise]);
      
      this.logger.logSummary();
      console.log('[BOOTSTRAP] Application bootstrap completed successfully');
      
      return {
        success: true,
        config: this.config,
        trie: this.trie,
        datasetLoader: this.datasetLoader,
        mongoConnected: this.mongoConnected,
        summary: this.logger.getSummary()
      };
      
    } catch (error) {
      this.logger.logError('bootstrap', error);
      this.logger.logSummary();
      console.error('[BOOTSTRAP] Application bootstrap failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        summary: this.logger.getSummary()
      };
    }
  }

  /**
   * Execute bootstrap steps
   */
  async runBootstrapSteps() {
    await this.initializeConfig();
    await this.initializeDatabase();
    await this.initializeTrie();
  }
}

// Export for use in other modules
module.exports = {
  ApplicationBootstrap,
  ConfigValidator,
  DatasetDiscovery,
  StartupLogger,
  BOOTSTRAP_CONFIG
};

// CLI execution
if (require.main === module) {
  const bootstrap = new ApplicationBootstrap();
  bootstrap.bootstrap()
    .then(result => {
      if (result.success) {
        console.log('\n✓ Bootstrap completed successfully');
        process.exit(0);
      } else {
        console.error('\n✗ Bootstrap failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n✗ Bootstrap crashed:', error);
      process.exit(1);
    });
}