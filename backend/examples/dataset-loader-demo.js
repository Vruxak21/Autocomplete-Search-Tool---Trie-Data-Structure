const path = require('path');
const DatasetLoader = require('../src/services/DatasetLoader');

/**
 * Demo script showing how to use the DatasetLoader service
 * This script loads sample datasets and demonstrates search functionality
 */
async function demonstrateDatasetLoader() {
  console.log('🚀 DatasetLoader Demo Starting...\n');

  const loader = new DatasetLoader();

  try {
    // Demo 1: Load cities dataset
    console.log('📍 Loading cities dataset...');
    const citiesPath = path.resolve('../../../worldcities.csv');
    
    try {
      const citiesResult = await loader.loadCitiesDataset(citiesPath);
      console.log(`✅ Cities loaded: ${citiesResult.validRecords} valid records from ${citiesResult.totalRecords} total`);
      console.log(`⏱️  Load time: ${citiesResult.loadTime}ms`);
      console.log(`🔄 Duplicates handled: ${citiesResult.duplicates}`);
      console.log(`❌ Invalid records: ${citiesResult.invalidRecords}\n`);
    } catch (error) {
      console.log(`⚠️  Cities dataset not found at ${citiesPath}, skipping...\n`);
    }

    // Demo 2: Load products dataset
    console.log('🛍️  Loading products dataset...');
    const productsPath = path.resolve('../../../flipkart_com-ecommerce_sample.csv');
    
    try {
      const productsResult = await loader.loadProductsDataset(productsPath);
      console.log(`✅ Products loaded: ${productsResult.validRecords} valid records from ${productsResult.totalRecords} total`);
      console.log(`⏱️  Load time: ${productsResult.loadTime}ms`);
      console.log(`🔄 Duplicates handled: ${productsResult.duplicates}`);
      console.log(`❌ Invalid records: ${productsResult.invalidRecords}\n`);
    } catch (error) {
      console.log(`⚠️  Products dataset not found at ${productsPath}, skipping...\n`);
    }

    // Demo 3: Show Trie statistics
    const trie = loader.getTrie();
    const stats = trie.getStats();
    console.log('📊 Trie Statistics:');
    console.log(`   Total words: ${stats.wordCount}`);
    console.log(`   Total nodes: ${stats.nodeCount}`);
    console.log(`   Max depth: ${stats.maxDepth}`);
    console.log(`   Average depth: ${stats.averageDepth.toFixed(2)}\n`);

    // Demo 4: Search functionality
    if (stats.wordCount > 0) {
      console.log('🔍 Search Demo:');
      
      const searchQueries = ['tok', 'del', 'mum', 'new', 'san', 'ali', 'fab'];
      
      for (const query of searchQueries) {
        const results = trie.search(query, 3);
        if (results.length > 0) {
          console.log(`   "${query}" -> ${results.map(r => `${r.word} (${r.frequency})`).join(', ')}`);
        }
      }
      console.log();
    }

    // Demo 5: Frequency calculation examples
    console.log('📈 Frequency Calculation Examples:');
    console.log('   Cities by population:');
    console.log(`     37M population -> frequency ${loader.calculateCityFrequency(37000000)}`);
    console.log(`     1M population -> frequency ${loader.calculateCityFrequency(1000000)}`);
    console.log(`     100K population -> frequency ${loader.calculateCityFrequency(100000)}`);
    console.log(`     10K population -> frequency ${loader.calculateCityFrequency(10000)}`);
    
    console.log('   Products by features:');
    const product1 = { price: 1000, brand: 'TestBrand', hasRating: true };
    const product2 = { price: 50, brand: '', hasRating: false };
    console.log(`     Premium product -> frequency ${loader.calculateProductFrequency(product1)}`);
    console.log(`     Basic product -> frequency ${loader.calculateProductFrequency(product2)}\n`);

    // Demo 6: Data validation examples
    console.log('✅ Data Validation Examples:');
    
    const validCity = {
      city: 'Test City',
      city_ascii: 'Test City',
      country: 'Test Country',
      population: '1000000',
      capital: 'primary'
    };
    
    const invalidCity = {
      city: '',
      country: 'Test Country'
    };
    
    console.log(`   Valid city record: ${loader.validateCityRecord(validCity) ? 'PASS' : 'FAIL'}`);
    console.log(`   Invalid city record: ${loader.validateCityRecord(invalidCity) ? 'PASS' : 'FAIL'}`);
    
    const validProduct = {
      product_name: 'Test Product Name',
      brand: 'TestBrand',
      discounted_price: '999'
    };
    
    const invalidProduct = {
      product_name: 'X'
    };
    
    console.log(`   Valid product record: ${loader.validateProductRecord(validProduct) ? 'PASS' : 'FAIL'}`);
    console.log(`   Invalid product record: ${loader.validateProductRecord(invalidProduct) ? 'PASS' : 'FAIL'}\n`);

    console.log('🎉 DatasetLoader Demo Complete!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateDatasetLoader().catch(console.error);
}

module.exports = { demonstrateDatasetLoader };