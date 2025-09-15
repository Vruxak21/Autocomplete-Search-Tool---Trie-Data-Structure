/**
 * Environment Configuration Manager
 * Centralized configuration management with validation and defaults
 */

const path = require('path');
const fs = require('fs');

/**
 * Configuration schema with validation rules
 */
const CONFIG_SCHEMA = {
  // Server Configuration
  NODE_ENV: {
    type: 'string',
    default: 'development',
    enum: ['development', 'production', 'test'],
    required: false
  },
  PORT: {
    type: 'number',
    default: 3001,
    min: 1,
    max: 65535,
    required: false
  },
  HOST: {
    type: 'string',
    default: '0.0.0.0',
    required: false
  },

  // Database Configuration
  MONGODB_URI: {
    type: 'string',
    default: null,
    required: false,
    description: 'MongoDB connection URI'
  },
  MONGODB_DB_NAME: {
    type: 'string',
    default: 'autocomplete-search',
    required: false
  },

  // Application Configuration
  MAX_SUGGESTIONS: {
    type: 'number',
    default: 5,
    min: 1,
    max: 20,
    required: false
  },
  SEARCH_TIMEOUT_MS: {
    type: 'number',
    default: 100,
    min: 10,
    max: 5000,
    required: false
  },
  TRIE_BACKUP_INTERVAL_MS: {
    type: 'number',
    default: 300000, // 5 minutes
    min: 60000,      // 1 minute
    max: 3600000,    // 1 hour
    required: false
  },

  // Frontend Configuration
  FRONTEND_URL: {
    type: 'string',
    default: 'http://localhost:3000',
    required: false
  },

  // Cache Configuration
  CACHE_MAX_SIZE: {
    type: 'number',
    default: 1000,
    min: 100,
    max: 10000,
    required: false
  },
  CACHE_TTL: {
    type: 'number',
    default: 300000, // 5 minutes
    min: 60000,      // 1 minute
    max: 3600000,    // 1 hour
    required: false
  },

  // Performance Configuration
  REQUEST_TIMEOUT_MS: {
    type: 'number',
    default: 30000,
    min: 1000,
    max: 120000,
    required: false
  },
  MAX_REQUEST_SIZE: {
    type: 'string',
    default: '10mb',
    required: false
  },

  // Security Configuration
  CORS_ORIGIN: {
    type: 'string',
    default: null,
    required: false
  },
  RATE_LIMIT_WINDOW_MS: {
    type: 'number',
    default: 900000, // 15 minutes
    min: 60000,
    max: 3600000,
    required: false
  },
  RATE_LIMIT_MAX_REQUESTS: {
    type: 'number',
    default: 100,
    min: 10,
    max: 1000,
    required: false
  },

  // Logging Configuration
  LOG_LEVEL: {
    type: 'string',
    default: 'info',
    enum: ['error', 'warn', 'info', 'debug'],
    required: false
  },
  LOG_FORMAT: {
    type: 'string',
    default: 'combined',
    enum: ['combined', 'common', 'dev', 'short', 'tiny'],
    required: false
  }
};

/**
 * Environment configuration manager
 */
class EnvironmentConfig {
  constructor() {
    this.config = {};
    this.validationErrors = [];
    this.loaded = false;
  }

  /**
   * Load and validate configuration
   * @param {Object} customEnv - Custom environment variables (for testing)
   * @returns {Object} Validated configuration
   */
  load(customEnv = null) {
    const env = customEnv || process.env;
    
    console.log('[CONFIG] Loading environment configuration...');
    
    // Load .env file if it exists
    this.loadDotEnv();
    
    // Process each configuration key
    for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
      try {
        const value = this.processConfigValue(key, env[key], schema);
        this.config[key] = value;
      } catch (error) {
        this.validationErrors.push({
          key,
          error: error.message,
          value: env[key]
        });
      }
    }

    // Check for validation errors
    if (this.validationErrors.length > 0) {
      console.error('[CONFIG] Configuration validation errors:');
      this.validationErrors.forEach(error => {
        console.error(`  ${error.key}: ${error.error} (value: ${error.value})`);
      });
      
      if (this.hasRequiredErrors()) {
        throw new Error('Required configuration values are missing or invalid');
      }
    }

    // Log configuration summary
    this.logConfigSummary();
    
    this.loaded = true;
    return this.config;
  }

  /**
   * Load .env file if it exists
   */
  loadDotEnv() {
    // Determine which .env file to load based on NODE_ENV
    const nodeEnv = process.env.NODE_ENV || 'development';
    const envFiles = [
      `.env.${nodeEnv}`,
      '.env'
    ];

    let loaded = false;
    for (const envFile of envFiles) {
      const envPath = path.resolve(envFile);
      if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        console.log(`[CONFIG] Loaded ${envFile} file`);
        loaded = true;
        break;
      }
    }

    if (!loaded) {
      console.log('[CONFIG] No .env file found, using system environment');
    }
  }

  /**
   * Process and validate a single configuration value
   * @param {string} key - Configuration key
   * @param {*} value - Raw value from environment
   * @param {Object} schema - Validation schema
   * @returns {*} Processed value
   */
  processConfigValue(key, value, schema) {
    // Use default if value is not provided
    if (value === undefined || value === null || value === '') {
      if (schema.required) {
        throw new Error(`Required configuration ${key} is missing`);
      }
      return schema.default;
    }

    // Type conversion and validation
    let processedValue = value;

    switch (schema.type) {
      case 'number':
        processedValue = Number(value);
        if (isNaN(processedValue)) {
          throw new Error(`${key} must be a valid number`);
        }
        if (schema.min !== undefined && processedValue < schema.min) {
          throw new Error(`${key} must be at least ${schema.min}`);
        }
        if (schema.max !== undefined && processedValue > schema.max) {
          throw new Error(`${key} must be at most ${schema.max}`);
        }
        break;

      case 'boolean':
        processedValue = value.toLowerCase() === 'true';
        break;

      case 'string':
        processedValue = String(value);
        if (schema.enum && !schema.enum.includes(processedValue)) {
          throw new Error(`${key} must be one of: ${schema.enum.join(', ')}`);
        }
        break;

      default:
        processedValue = value;
    }

    return processedValue;
  }

  /**
   * Check if there are required configuration errors
   * @returns {boolean} True if required errors exist
   */
  hasRequiredErrors() {
    return this.validationErrors.some(error => {
      const schema = CONFIG_SCHEMA[error.key];
      return schema && schema.required;
    });
  }

  /**
   * Log configuration summary
   */
  logConfigSummary() {
    console.log('[CONFIG] Configuration summary:');
    console.log(`  Environment: ${this.config.NODE_ENV}`);
    console.log(`  Server: ${this.config.HOST}:${this.config.PORT}`);
    console.log(`  MongoDB: ${this.config.MONGODB_URI ? '[CONFIGURED]' : '[NOT CONFIGURED]'}`);
    console.log(`  Frontend URL: ${this.config.FRONTEND_URL}`);
    console.log(`  Max Suggestions: ${this.config.MAX_SUGGESTIONS}`);
    console.log(`  Search Timeout: ${this.config.SEARCH_TIMEOUT_MS}ms`);
    console.log(`  Cache Size: ${this.config.CACHE_MAX_SIZE}`);
    console.log(`  Log Level: ${this.config.LOG_LEVEL}`);
    
    if (this.validationErrors.length > 0) {
      console.warn(`[CONFIG] ${this.validationErrors.length} validation warning(s)`);
    }
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key
   * @returns {*} Configuration value
   */
  get(key) {
    if (!this.loaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config[key];
  }

  /**
   * Get all configuration
   * @returns {Object} All configuration values
   */
  getAll() {
    if (!this.loaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return { ...this.config };
  }

  /**
   * Check if configuration is valid
   * @returns {boolean} True if configuration is valid
   */
  isValid() {
    return this.validationErrors.length === 0 || !this.hasRequiredErrors();
  }

  /**
   * Get validation errors
   * @returns {Array} Array of validation errors
   */
  getValidationErrors() {
    return [...this.validationErrors];
  }

  /**
   * Get configuration for specific environment
   * @param {string} environment - Environment name
   * @returns {Object} Environment-specific configuration
   */
  getEnvironmentConfig(environment) {
    const baseConfig = this.getAll();
    
    // Environment-specific overrides
    const environmentOverrides = {
      development: {
        LOG_LEVEL: 'debug',
        CORS_ORIGIN: '*'
      },
      production: {
        LOG_LEVEL: 'warn',
        NODE_ENV: 'production'
      },
      test: {
        LOG_LEVEL: 'error',
        PORT: 0, // Use random port for tests
        MONGODB_DB_NAME: 'autocomplete-search-test'
      }
    };

    return {
      ...baseConfig,
      ...(environmentOverrides[environment] || {})
    };
  }

  /**
   * Validate configuration against schema
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  static validate(config) {
    const validator = new EnvironmentConfig();
    const errors = [];

    for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
      try {
        validator.processConfigValue(key, config[key], schema);
      } catch (error) {
        errors.push({ key, error: error.message });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Create singleton instance
const environmentConfig = new EnvironmentConfig();

module.exports = {
  EnvironmentConfig,
  CONFIG_SCHEMA,
  config: environmentConfig
};