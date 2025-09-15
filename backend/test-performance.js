/**
 * Simple test script to validate performance monitoring functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testPerformanceMonitoring() {
  console.log('Testing Performance Monitoring Implementation...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/performance/health`);
    console.log('✅ Health check passed');
    console.log('   Status:', healthResponse.data.status);
    console.log('   Services:', Object.keys(healthResponse.data.services));

    // Test 2: Generate some search activity
    console.log('\n2. Generating search activity...');
    const queries = ['app', 'ban', 'car', 'apple', 'banana'];
    
    for (const query of queries) {
      const response = await axios.get(`${BASE_URL}/api/search?query=${query}`);
      console.log(`   Search "${query}": ${response.data.suggestions.length} results, ${response.data.processingTime}ms`);
    }

    // Test 3: Check performance metrics
    console.log('\n3. Testing performance metrics endpoint...');
    const metricsResponse = await axios.get(`${BASE_URL}/api/performance/metrics`);
    console.log('✅ Performance metrics retrieved');
    console.log('   Total requests:', metricsResponse.data.requests.total);
    console.log('   Memory usage:', Math.round(metricsResponse.data.memory.current.heapUsed / 1024 / 1024), 'MB');
    
    if (metricsResponse.data.requests.responseTimePercentiles) {
      console.log('   P95 response time:', metricsResponse.data.requests.responseTimePercentiles.p95.toFixed(2), 'ms');
    }

    // Test 4: Cache statistics
    console.log('\n4. Testing cache metrics endpoint...');
    const cacheResponse = await axios.get(`${BASE_URL}/api/performance/cache`);
    console.log('✅ Cache metrics retrieved');
    console.log('   Cache size:', cacheResponse.data.stats.size);
    console.log('   Hit rate:', cacheResponse.data.stats.hitRate);

    // Test 5: Test caching by repeating a query
    console.log('\n5. Testing cache functionality...');
    const query = 'test';
    
    // First request (uncached)
    const start1 = Date.now();
    const firstResponse = await axios.get(`${BASE_URL}/api/search?query=${query}`);
    const firstTime = Date.now() - start1;
    
    // Second request (should be cached)
    const start2 = Date.now();
    const secondResponse = await axios.get(`${BASE_URL}/api/search?query=${query}`);
    const secondTime = Date.now() - start2;
    
    console.log(`   First request: ${firstTime}ms, cached: ${firstResponse.data.cached}`);
    console.log(`   Second request: ${secondTime}ms, cached: ${secondResponse.data.cached}`);
    
    if (secondResponse.data.cached) {
      console.log('✅ Caching is working correctly');
    } else {
      console.log('⚠️  Caching may not be working as expected');
    }

    // Test 6: Performance validation
    console.log('\n6. Performance validation...');
    const performanceQueries = ['a', 'ap', 'app', 'appl', 'apple'];
    let totalTime = 0;
    let maxTime = 0;
    
    for (const query of performanceQueries) {
      const start = Date.now();
      const response = await axios.get(`${BASE_URL}/api/search?query=${query}`);
      const duration = Date.now() - start;
      const processingTime = response.data.processingTime;
      
      totalTime += processingTime;
      maxTime = Math.max(maxTime, processingTime);
      
      console.log(`   Query "${query}": ${processingTime}ms processing, ${duration}ms total`);
    }
    
    const avgTime = totalTime / performanceQueries.length;
    console.log(`   Average processing time: ${avgTime.toFixed(2)}ms`);
    console.log(`   Max processing time: ${maxTime.toFixed(2)}ms`);
    
    if (avgTime < 100) {
      console.log('✅ Performance target met (< 100ms average)');
    } else {
      console.log('⚠️  Performance target not met (>= 100ms average)');
    }

    console.log('\n🎉 Performance monitoring test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
testPerformanceMonitoring();