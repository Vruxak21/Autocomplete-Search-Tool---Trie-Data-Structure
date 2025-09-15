/**
 * Test script to verify typo tolerance API integration
 */

const axios = require('axios');

async function testTypoToleranceAPI() {
  console.log('🌐 Testing Typo Tolerance API Integration\n');

  const baseURL = 'http://localhost:3001/api';
  
  try {
    // Test 1: Regular search without typo tolerance
    console.log('🎯 Test 1: Regular search (typoTolerance=false)');
    const response1 = await axios.get(`${baseURL}/search`, {
      params: { query: 'helo', limit: 5, typoTolerance: false }
    });
    
    console.log('Query: "helo" (without typo tolerance)');
    console.log('Results:', response1.data.suggestions.length);
    console.log('Typo tolerance used:', response1.data.typoToleranceUsed);
    console.log('Suggestions:', response1.data.suggestions.map(s => s.word));
    console.log('');

    // Test 2: Search with typo tolerance
    console.log('🔧 Test 2: Search with typo tolerance (typoTolerance=true)');
    const response2 = await axios.get(`${baseURL}/search`, {
      params: { query: 'helo', limit: 5, typoTolerance: true }
    });
    
    console.log('Query: "helo" (with typo tolerance)');
    console.log('Results:', response2.data.suggestions.length);
    console.log('Typo tolerance used:', response2.data.typoToleranceUsed);
    console.log('Exact matches:', response2.data.exactMatches);
    console.log('Typo corrections:', response2.data.typoCorrections);
    console.log('Suggestions:', response2.data.suggestions.map(s => 
      `${s.word} (${s.type}${s.editDistance ? `, distance: ${s.editDistance}` : ''})`
    ));
    console.log('');

    // Test 3: Get typo tolerance configuration
    console.log('⚙️ Test 3: Get typo tolerance configuration');
    const configResponse = await axios.get(`${baseURL}/search/typo-config`);
    console.log('Current config:', configResponse.data.config);
    console.log('');

    // Test 4: Update typo tolerance configuration
    console.log('🔧 Test 4: Update typo tolerance configuration');
    const updateResponse = await axios.put(`${baseURL}/search/typo-config`, {
      maxEditDistance: 1,
      similarityThreshold: 0.8
    });
    console.log('Config updated:', updateResponse.data.message);
    console.log('New config:', updateResponse.data.newConfig);
    console.log('');

    // Test 5: Search with updated configuration
    console.log('🎯 Test 5: Search with updated configuration');
    const response3 = await axios.get(`${baseURL}/search`, {
      params: { query: 'helo', limit: 5, typoTolerance: true }
    });
    
    console.log('Query: "helo" (with updated config)');
    console.log('Results:', response3.data.suggestions.length);
    console.log('Suggestions:', response3.data.suggestions.map(s => 
      `${s.word} (${s.type}${s.editDistance ? `, distance: ${s.editDistance}` : ''})`
    ));

    console.log('\n✅ All API tests completed successfully!');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Server is not running. Please start the server first with: npm run dev');
    } else {
      console.error('❌ API test failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  }
}

// Run the test
testTypoToleranceAPI();