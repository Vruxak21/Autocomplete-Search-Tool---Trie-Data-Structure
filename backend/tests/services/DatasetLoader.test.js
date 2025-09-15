const fs = require('fs');
const path = require('path');
const DatasetLoader = require('../../src/services/DatasetLoader');

// Mock CSV data for testing
const mockCitiesCSV = `"city","city_ascii","lat","lng","country","iso2","iso3","admin_name","capital","population","id"
"Tokyo","Tokyo","35.6870","139.7495","Japan","JP","JPN","Tōkyō","primary","37785000","1392685764"
"Jakarta","Jakarta","-6.1750","106.8275","Indonesia","ID","IDN","Jakarta","primary","33756000","1360771077"
"Delhi","Delhi","28.6100","77.2300","India","IN","IND","Delhi","admin","32226000","1356872604"
"Mumbai","Mumbai","19.0761","72.8775","India","IN","IND","Mahārāshtra","admin","24973000","1356226629"
"São Paulo","Sao Paulo","-23.5504","-46.6339","Brazil","BR","BRA","São Paulo","admin","23086000","1076532519"
"","","","","","","","","","",""
"InvalidCity","","","","","","","","","invalid_pop",""`;

const mockProductsCSV = `uniq_id,crawl_timestamp,product_url,product_name,product_category_tree,pid,retail_price,discounted_price,image,is_FK_Advantage_product,description,product_rating,overall_rating,brand,product_specifications
c2d766ca982eca8304150849735ffef9,2016-03-25 22:59:23 +0000,http://www.flipkart.com/alisha-solid-women-s-cycling-shorts/p/itmeh2ffvzetthbb?pid=SRTEH2FF9KEDEFGF,Alisha Solid Women's Cycling Shorts,"[""Clothing >> Women's Clothing""]",SRTEH2FF9KEDEFGF,999,379,"[""http://img5a.flixcart.com/image/short/u/4/a/altht-3p-21-alisha-38-original-imaeh2d5vm5zbtgg.jpeg""]",false,"Key Features",4.2,4.2,Alisha,"{""product_specification""=>[{""key""=>""Fabric"", ""value""=>""Cotton Lycra""}]}"
7f7036a6d550aaa89d34c77bd39a5e48,2016-03-25 22:59:23 +0000,http://www.flipkart.com/fabhomedecor-fabric-double-sofa-bed/p/itmeh3qgfamccfpy?pid=SBEEH3QGU7MFYJFY,FabHomeDecor Fabric Double Sofa Bed,"[""Furniture >> Living Room Furniture""]",SBEEH3QGU7MFYJFY,32157,22646,"[""http://img6a.flixcart.com/image/sofa-bed/j/f/y/fhd112-double-foam-fabhomedecor-leatherette-black-leatherette-1100x1100-imaeh3gemjjcg9ta.jpeg""]",false,"FabHomeDecor Fabric Double Sofa Bed",No rating available,No rating available,FabHomeDecor,"{""product_specification""=>[{""key""=>""Brand"", ""value""=>""FabHomeDecor""}]}"
f449ec65dcbc041b6ae5e6a32717d01b,2016-03-25 22:59:23 +0000,http://www.flipkart.com/aw-bellies/p/itmeh4grgfbkexnt?pid=SHOEH4GRSUBJGZXE,AW Bellies,"[""Footwear >> Women's Footwear""]",SHOEH4GRSUBJGZXE,999,499,"[""http://img5a.flixcart.com/image/shoe/7/z/z/red-as-454-aw-11-original-imaeebfwsdf6jdf6.jpeg""]",false,"Key Features of AW Bellies",No rating available,No rating available,AW,"{""product_specification""=>[{""key""=>""Ideal For"", ""value""=>""Women""}]}"
,,,,,,,,,,,,,,
invalid_product,,,X,,,,,,,,,,`;

describe('DatasetLoader', () => {
  let datasetLoader;
  let tempDir;
  let citiesFile;
  let productsFile;

  beforeEach(() => {
    datasetLoader = new DatasetLoader();
    
    // Create temporary directory and files for testing
    tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    citiesFile = path.join(tempDir, 'test_cities.csv');
    productsFile = path.join(tempDir, 'test_products.csv');
    
    fs.writeFileSync(citiesFile, mockCitiesCSV);
    fs.writeFileSync(productsFile, mockProductsCSV);
  });

  afterEach(() => {
    // Clean up temporary files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Constructor', () => {
    test('should initialize with empty Trie and stats', () => {
      expect(datasetLoader.getTrie()).toBeDefined();
      expect(datasetLoader.getTrie().getWordCount()).toBe(0);
      expect(datasetLoader.getStats().totalRecords).toBe(0);
      expect(datasetLoader.getStats().loadedDatasets).toEqual([]);
    });
  });

  describe('loadCitiesDataset', () => {
    test('should load valid cities from CSV file', async () => {
      const result = await datasetLoader.loadCitiesDataset(citiesFile);
      
      expect(result.dataset).toBe('cities');
      expect(result.validRecords).toBe(5); // Tokyo, Jakarta, Delhi, Mumbai, São Paulo
      expect(result.invalidRecords).toBe(2); // Empty row and InvalidCity
      expect(result.totalRecords).toBe(7);
      expect(result.loadTime).toBeGreaterThan(0);
      
      // Check if cities are in Trie
      const trie = datasetLoader.getTrie();
      expect(trie.contains('tokyo')).toBe(true);
      expect(trie.contains('jakarta')).toBe(true);
      expect(trie.contains('delhi')).toBe(true);
      expect(trie.contains('mumbai')).toBe(true);
      expect(trie.contains('sao paulo')).toBe(true);
      
      // Check frequency calculation based on population
      const tokyoFreq = trie.getFrequency('tokyo');
      const mumbaiFreq = trie.getFrequency('mumbai');
      expect(tokyoFreq).toBeGreaterThanOrEqual(mumbaiFreq);
    });

    test('should handle file not found error', async () => {
      await expect(datasetLoader.loadCitiesDataset('nonexistent.csv'))
        .rejects.toThrow('Cities dataset file not found');
    });

    test('should calculate city frequencies based on population', () => {
      // Test frequency calculation
      expect(datasetLoader.calculateCityFrequency(37785000)).toBeGreaterThan(10); // Tokyo
      expect(datasetLoader.calculateCityFrequency(500000)).toBeGreaterThan(1);
      expect(datasetLoader.calculateCityFrequency(50000)).toBe(3);
      expect(datasetLoader.calculateCityFrequency(0)).toBe(1);
    });
  });

  describe('loadProductsDataset', () => {
    test('should load valid products from CSV file', async () => {
      const result = await datasetLoader.loadProductsDataset(productsFile);
      
      expect(result.dataset).toBe('products');
      expect(result.validRecords).toBe(3); // Valid products
      expect(result.invalidRecords).toBe(2); // Empty row and invalid product
      expect(result.totalRecords).toBe(5);
      expect(result.loadTime).toBeGreaterThan(0);
      
      // Check if products are in Trie
      const trie = datasetLoader.getTrie();
      expect(trie.contains('alisha solid women\'s cycling shorts')).toBe(true);
      expect(trie.contains('fabhomedecor fabric double sofa bed')).toBe(true);
      expect(trie.contains('aw bellies')).toBe(true);
    });

    test('should handle file not found error', async () => {
      await expect(datasetLoader.loadProductsDataset('nonexistent.csv'))
        .rejects.toThrow('Products dataset file not found');
    });

    test('should calculate product frequencies based on price and features', () => {
      const productData1 = { price: 1000, brand: 'TestBrand', hasRating: true };
      const productData2 = { price: 50, brand: '', hasRating: false };
      const productData3 = { price: 0, brand: 'Brand', hasRating: false };
      
      expect(datasetLoader.calculateProductFrequency(productData1)).toBeGreaterThan(
        datasetLoader.calculateProductFrequency(productData2)
      );
      expect(datasetLoader.calculateProductFrequency(productData2)).toBeGreaterThan(
        datasetLoader.calculateProductFrequency(productData3)
      );
    });
  });

  describe('loadMultipleDatasets', () => {
    test('should load multiple datasets successfully', async () => {
      const datasets = [
        { type: 'cities', filePath: citiesFile },
        { type: 'products', filePath: productsFile }
      ];
      
      const result = await datasetLoader.loadMultipleDatasets(datasets);
      
      expect(result.datasets).toHaveLength(2);
      expect(result.datasets[0].dataset).toBe('cities');
      expect(result.datasets[1].dataset).toBe('products');
      expect(result.totalStats.validRecords).toBe(8); // 5 cities + 3 products
      expect(result.totalStats.totalRecords).toBe(12); // 7 cities + 5 products
      
      // Check that both datasets are loaded in the same Trie
      const trie = datasetLoader.getTrie();
      expect(trie.contains('tokyo')).toBe(true);
      expect(trie.contains('alisha solid women\'s cycling shorts')).toBe(true);
    });

    test('should handle errors in individual datasets', async () => {
      const datasets = [
        { type: 'cities', filePath: citiesFile },
        { type: 'unknown', filePath: 'test.csv' }
      ];
      
      const result = await datasetLoader.loadMultipleDatasets(datasets);
      
      expect(result.datasets).toHaveLength(2);
      expect(result.datasets[0].dataset).toBe('cities');
      expect(result.datasets[1].error).toContain('Unknown dataset type');
      expect(result.datasets[1].success).toBe(false);
    });
  });

  describe('validateCityRecord', () => {
    test('should validate correct city records', () => {
      const validRecord = {
        city: 'Tokyo',
        city_ascii: 'Tokyo',
        country: 'Japan',
        population: '37785000',
        capital: 'primary'
      };
      
      const result = datasetLoader.validateCityRecord(validRecord);
      expect(result).toEqual({
        city: 'Tokyo',
        country: 'Japan',
        population: 37785000,
        isCapital: true
      });
    });

    test('should reject invalid city records', () => {
      const invalidRecords = [
        { city: '', country: 'Japan' }, // Empty city
        { city: 'X', country: 'Japan' }, // Too short city name
        { city: 'Tokyo', country: '' }, // Empty country
        { city: 'Tokyo' } // Missing country
      ];
      
      invalidRecords.forEach(record => {
        expect(datasetLoader.validateCityRecord(record)).toBeNull();
      });
    });

    test('should handle missing population gracefully', () => {
      const record = {
        city: 'TestCity',
        country: 'TestCountry',
        population: 'invalid'
      };
      
      const result = datasetLoader.validateCityRecord(record);
      expect(result.population).toBe(0);
    });
  });

  describe('validateProductRecord', () => {
    test('should validate correct product records', () => {
      const validRecord = {
        product_name: 'Test Product',
        brand: 'TestBrand',
        discounted_price: '999',
        product_rating: '4.5'
      };
      
      const result = datasetLoader.validateProductRecord(validRecord);
      expect(result).toEqual({
        name: 'Test Product',
        brand: 'TestBrand',
        price: 999,
        category: '',
        hasRating: true
      });
    });

    test('should reject invalid product records', () => {
      const invalidRecords = [
        { product_name: '' }, // Empty name
        { product_name: 'X' }, // Too short name
        { product_name: 'XX' }, // Still too short
        {} // Missing name
      ];
      
      invalidRecords.forEach(record => {
        expect(datasetLoader.validateProductRecord(record)).toBeNull();
      });
    });

    test('should clean product names properly', () => {
      const record = {
        product_name: '"Test Product with Quotes"',
        brand: 'TestBrand'
      };
      
      const result = datasetLoader.validateProductRecord(record);
      expect(result.name).toBe('Test Product with Quotes');
    });
  });

  describe('parseCSV', () => {
    test('should parse CSV file correctly', async () => {
      const results = await datasetLoader.parseCSV(citiesFile);
      expect(results).toHaveLength(7); // Including empty and invalid rows
      expect(results[0]).toHaveProperty('city');
      expect(results[0]).toHaveProperty('country');
    });

    test('should handle file read errors', async () => {
      await expect(datasetLoader.parseCSV('nonexistent.csv'))
        .rejects.toThrow();
    });
  });

  describe('Utility methods', () => {
    test('should get Trie instance', () => {
      const trie = datasetLoader.getTrie();
      expect(trie).toBeDefined();
      expect(typeof trie.insert).toBe('function');
    });

    test('should get and reset stats', () => {
      datasetLoader.stats.totalRecords = 10;
      datasetLoader.stats.validRecords = 8;
      
      const stats = datasetLoader.getStats();
      expect(stats.totalRecords).toBe(10);
      expect(stats.validRecords).toBe(8);
      
      datasetLoader.resetStats();
      const resetStats = datasetLoader.getStats();
      expect(resetStats.totalRecords).toBe(0);
      expect(resetStats.validRecords).toBe(0);
    });

    test('should clear all data', async () => {
      await datasetLoader.loadCitiesDataset(citiesFile);
      expect(datasetLoader.getTrie().getWordCount()).toBeGreaterThan(0);
      
      datasetLoader.clear();
      expect(datasetLoader.getTrie().getWordCount()).toBe(0);
      expect(datasetLoader.getStats().loadedDatasets).toEqual([]);
    });
  });

  describe('Error handling', () => {
    test('should handle malformed CSV gracefully', async () => {
      const malformedCSV = 'invalid,csv,content\n"unclosed quote,test,data\n';
      const malformedFile = path.join(tempDir, 'malformed.csv');
      fs.writeFileSync(malformedFile, malformedCSV);
      
      // Should not throw, but handle errors gracefully
      const result = await datasetLoader.loadCitiesDataset(malformedFile);
      expect(result.invalidRecords).toBeGreaterThan(0);
    });

    test('should handle empty CSV files', async () => {
      const emptyFile = path.join(tempDir, 'empty.csv');
      fs.writeFileSync(emptyFile, '');
      
      const result = await datasetLoader.loadCitiesDataset(emptyFile);
      expect(result.totalRecords).toBe(0);
      expect(result.validRecords).toBe(0);
    });
  });

  describe('Integration with Trie', () => {
    test('should populate Trie correctly and support search', async () => {
      await datasetLoader.loadCitiesDataset(citiesFile);
      const trie = datasetLoader.getTrie();
      
      // Test search functionality
      const tokyoResults = trie.search('tok');
      expect(tokyoResults).toHaveLength(1);
      expect(tokyoResults[0].word).toBe('tokyo');
      
      const delhiResults = trie.search('del');
      expect(delhiResults).toHaveLength(1);
      expect(delhiResults[0].word).toBe('delhi');
    });

    test('should handle duplicate entries correctly', async () => {
      // Load cities dataset twice to test duplicate handling
      await datasetLoader.loadCitiesDataset(citiesFile);
      const firstCount = datasetLoader.getTrie().getWordCount();
      
      await datasetLoader.loadCitiesDataset(citiesFile);
      const secondCount = datasetLoader.getTrie().getWordCount();
      
      // Word count should remain the same, but frequencies should increase
      expect(secondCount).toBe(firstCount);
      expect(datasetLoader.getStats().duplicates).toBeGreaterThan(0);
    });
  });
});