const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Trie = require('../data-structures/Trie');

/**
 * DatasetLoader service for loading and processing CSV datasets into Trie structure
 * Supports multiple dataset formats with validation and error handling
 */
class DatasetLoader {
  constructor() {
    this.trie = new Trie();
    this.loadedDatasets = new Set();
    this.stats = {
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      duplicates: 0,
      loadTime: 0
    };
  }

  /**
   * Loads worldcities.csv dataset with city name extraction
   * @param {string} filePath - Path to worldcities.csv file
   * @returns {Promise<Object>} Loading statistics
   */
  async loadCitiesDataset(filePath = 'worldcities.csv') {
    const startTime = Date.now();
    this.resetStats();

    try {
      const absolutePath = path.resolve(filePath);
      
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Cities dataset file not found: ${absolutePath}`);
      }

      const results = await this.parseCSV(absolutePath);
      
      for (const row of results) {
        this.stats.totalRecords++;
        
        try {
          const cityData = this.validateCityRecord(row);
          if (cityData) {
            // Calculate initial frequency based on population (higher population = higher frequency)
            const frequency = this.calculateCityFrequency(cityData.population);
            
            if (this.trie.contains(cityData.city)) {
              this.stats.duplicates++;
              // Update frequency if city already exists
              this.trie.incrementFrequency(cityData.city, frequency);
            } else {
              this.trie.insert(cityData.city, frequency);
              this.stats.validRecords++;
            }
          } else {
            this.stats.invalidRecords++;
          }
        } catch (error) {
          console.warn(`Error processing city record:`, error.message);
          this.stats.invalidRecords++;
        }
      }

      this.stats.loadTime = Date.now() - startTime;
      this.loadedDatasets.add('cities');
      
      return {
        dataset: 'cities',
        ...this.stats,
        message: `Successfully loaded ${this.stats.validRecords} cities from ${this.stats.totalRecords} records`
      };

    } catch (error) {
      throw new Error(`Failed to load cities dataset: ${error.message}`);
    }
  }

  /**
   * Loads Flipkart product dataset with product name extraction
   * @param {string} filePath - Path to flipkart_com-ecommerce_sample.csv file
   * @returns {Promise<Object>} Loading statistics
   */
  async loadProductsDataset(filePath = 'flipkart_com-ecommerce_sample.csv') {
    const startTime = Date.now();
    this.resetStats();

    try {
      const absolutePath = path.resolve(filePath);
      
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Products dataset file not found: ${absolutePath}`);
      }

      const results = await this.parseCSV(absolutePath);
      
      for (const row of results) {
        this.stats.totalRecords++;
        
        try {
          const productData = this.validateProductRecord(row);
          if (productData) {
            // Calculate initial frequency based on price and rating
            const frequency = this.calculateProductFrequency(productData);
            
            if (this.trie.contains(productData.name)) {
              this.stats.duplicates++;
              this.trie.incrementFrequency(productData.name, frequency);
            } else {
              this.trie.insert(productData.name, frequency);
              this.stats.validRecords++;
            }
          } else {
            this.stats.invalidRecords++;
          }
        } catch (error) {
          console.warn(`Error processing product record:`, error.message);
          this.stats.invalidRecords++;
        }
      }

      this.stats.loadTime = Date.now() - startTime;
      this.loadedDatasets.add('products');
      
      return {
        dataset: 'products',
        ...this.stats,
        message: `Successfully loaded ${this.stats.validRecords} products from ${this.stats.totalRecords} records`
      };

    } catch (error) {
      throw new Error(`Failed to load products dataset: ${error.message}`);
    }
  }

  /**
   * Loads multiple datasets into the same Trie
   * @param {Array<{type: string, filePath: string}>} datasets - Array of dataset configurations
   * @returns {Promise<Object>} Combined loading statistics
   */
  async loadMultipleDatasets(datasets) {
    const startTime = Date.now();
    const results = [];
    let totalStats = {
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      duplicates: 0
    };

    for (const dataset of datasets) {
      try {
        let result;
        switch (dataset.type) {
          case 'cities':
            result = await this.loadCitiesDataset(dataset.filePath);
            break;
          case 'products':
            result = await this.loadProductsDataset(dataset.filePath);
            break;
          default:
            throw new Error(`Unknown dataset type: ${dataset.type}`);
        }
        
        results.push(result);
        totalStats.totalRecords += result.totalRecords;
        totalStats.validRecords += result.validRecords;
        totalStats.invalidRecords += result.invalidRecords;
        totalStats.duplicates += result.duplicates;
        
      } catch (error) {
        results.push({
          dataset: dataset.type,
          error: error.message,
          success: false
        });
      }
    }

    return {
      datasets: results,
      totalStats: {
        ...totalStats,
        loadTime: Date.now() - startTime
      },
      trieStats: this.trie.getStats()
    };
  }

  /**
   * Parses CSV file and returns array of records
   * @param {string} filePath - Path to CSV file
   * @returns {Promise<Array>} Array of parsed records
   */
  parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      // Create read stream with error handling
      const readStream = fs.createReadStream(filePath);
      
      readStream.on('error', (error) => {
        reject(new Error(`File read error: ${error.message}`));
      });

      const csvStream = readStream.pipe(csv({
        skipEmptyLines: true,
        skipLinesWithError: true
      }));

      csvStream.on('data', (data) => {
        results.push(data);
      });

      csvStream.on('end', () => {
        resolve(results);
      });

      csvStream.on('error', (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      });
    });
  }

  /**
   * Validates and extracts city data from CSV record
   * @param {Object} record - Raw CSV record
   * @returns {Object|null} Validated city data or null if invalid
   */
  validateCityRecord(record) {
    try {
      // Extract city name (prefer city_ascii over city for better search)
      const city = (record.city_ascii || record.city || '').trim();
      
      if (!city || city.length < 2) {
        return null; // Skip cities with very short names
      }

      // Validate population (convert to number, default to 0)
      let population = 0;
      if (record.population) {
        const parsedPop = parseInt(record.population.replace(/[^\d]/g, ''), 10);
        population = isNaN(parsedPop) ? 0 : parsedPop;
      }

      // Basic validation for required fields
      const country = (record.country || '').trim();
      if (!country) {
        return null; // Skip records without country
      }

      return {
        city: city,
        country: country,
        population: population,
        isCapital: record.capital === 'primary' || record.capital === 'admin'
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Validates and extracts product data from CSV record
   * @param {Object} record - Raw CSV record
   * @returns {Object|null} Validated product data or null if invalid
   */
  validateProductRecord(record) {
    try {
      // Extract product name
      const name = (record.product_name || '').trim();
      
      if (!name || name.length < 3) {
        return null; // Skip products with very short names
      }

      // Clean up product name (remove extra quotes, normalize)
      const cleanName = name.replace(/^["']|["']$/g, '').trim();
      
      if (cleanName.length < 3) {
        return null;
      }

      // Extract price information
      let price = 0;
      if (record.discounted_price || record.retail_price) {
        const priceStr = record.discounted_price || record.retail_price;
        const parsedPrice = parseFloat(priceStr.replace(/[^\d.]/g, ''));
        price = isNaN(parsedPrice) ? 0 : parsedPrice;
      }

      // Extract brand
      const brand = (record.brand || '').trim();

      return {
        name: cleanName,
        brand: brand,
        price: price,
        category: record.product_category_tree || '',
        hasRating: record.product_rating && record.product_rating !== 'No rating available'
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculates initial frequency for cities based on population
   * @param {number} population - City population
   * @returns {number} Calculated frequency score
   */
  calculateCityFrequency(population) {
    if (population <= 0) return 1;
    
    // Logarithmic scaling: larger cities get higher frequency
    // Population ranges: 1M+ = 10-20, 100K-1M = 5-10, <100K = 1-5
    if (population >= 1000000) {
      return Math.min(20, Math.floor(Math.log10(population)) + 10);
    } else if (population >= 100000) {
      return Math.min(10, Math.floor(Math.log10(population)) + 2);
    } else {
      return Math.max(1, Math.floor(population / 20000) + 1);
    }
  }

  /**
   * Calculates initial frequency for products based on price and other factors
   * @param {Object} productData - Product data object
   * @returns {number} Calculated frequency score
   */
  calculateProductFrequency(productData) {
    let frequency = 1;
    
    // Price-based scoring (mid-range products get higher scores)
    if (productData.price > 0) {
      if (productData.price >= 100 && productData.price <= 5000) {
        frequency += 3; // Sweet spot for most products
      } else if (productData.price >= 50 && productData.price < 100) {
        frequency += 2;
      } else if (productData.price > 5000) {
        frequency += 1; // Premium products
      }
    }
    
    // Brand bonus
    if (productData.brand && productData.brand.length > 0) {
      frequency += 1;
    }
    
    // Rating bonus
    if (productData.hasRating) {
      frequency += 2;
    }
    
    return Math.min(frequency, 10); // Cap at 10
  }

  /**
   * Gets the populated Trie instance
   * @returns {Trie} The Trie with loaded data
   */
  getTrie() {
    return this.trie;
  }

  /**
   * Gets loading statistics
   * @returns {Object} Current loading statistics
   */
  getStats() {
    return {
      ...this.stats,
      loadedDatasets: Array.from(this.loadedDatasets),
      trieStats: this.trie.getStats()
    };
  }

  /**
   * Resets loading statistics
   */
  resetStats() {
    this.stats = {
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      duplicates: 0,
      loadTime: 0
    };
  }

  /**
   * Clears all loaded data
   */
  clear() {
    this.trie.clear();
    this.loadedDatasets.clear();
    this.resetStats();
  }
}

module.exports = DatasetLoader;