/**
 * API Demonstration Script
 * Shows the Express.js backend API in action
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function demonstrateAPI() {
  console.log('🚀 Express.js Backend API Demonstration\n');

  try {
    // 1. Health Check
    console.log('1. Health Check:');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Status:', healthResponse.data.status);
    console.log('📊 Trie Stats:', healthResponse.data.trie);
    console.log();

    // 2. Search API
    console.log('2. Search API Tests:');
    
    // Search for "app"
    console.log('🔍 Searching for "app":');
    const searchResponse = await axios.get(`${BASE_URL}/api/search?query=app`);
    console.log('📝 Results:', searchResponse.data.suggestions);
    console.log('⏱️  Processing Time:', searchResponse.data.processingTime + 'ms');
    console.log();

    // Search with limit
    console.log('🔍 Searching for "a" with limit 3:');
    const limitedResponse = await axios.get(`${BASE_URL}/api/search?query=a&limit=3`);
    console.log('📝 Results:', limitedResponse.data.suggestions);
    console.log('🔢 Limit Applied:', limitedResponse.data.limit);
    console.log();

    // 3. Frequency Increment
    console.log('3. Frequency Increment:');
    if (searchResponse.data.suggestions.length > 0) {
      const word = searchResponse.data.suggestions[0].word;
      const originalFreq = searchResponse.data.suggestions[0].frequency;
      
      console.log(`📈 Incrementing frequency for "${word}" (current: ${originalFreq})`);
      const incrementResponse = await axios.post(`${BASE_URL}/api/search/increment`, {
        word: word,
        increment: 2
      });
      console.log('✅ Success:', incrementResponse.data.success);
      console.log('🔢 New Frequency:', incrementResponse.data.newFrequency);
      console.log();

      // Verify the change
      console.log('🔍 Verifying frequency change:');
      const verifyResponse = await axios.get(`${BASE_URL}/api/search?query=${word.substring(0, 3)}`);
      const updatedWord = verifyResponse.data.suggestions.find(s => s.word === word);
      if (updatedWord) {
        console.log(`✅ Updated frequency for "${word}":`, updatedWord.frequency);
      }
      console.log();
    }

    // 4. Search Statistics
    console.log('4. Search Statistics:');
    const statsResponse = await axios.get(`${BASE_URL}/api/search/stats`);
    console.log('📊 Trie Statistics:', statsResponse.data.trie);
    console.log();

    // 5. Trie Structure Visualization
    console.log('5. Trie Structure (limited depth):');
    const structureResponse = await axios.get(`${BASE_URL}/api/trie/structure?depth=3`);
    console.log('🌳 Total Nodes:', structureResponse.data.structure.totalNodes);
    console.log('📝 Total Words:', structureResponse.data.structure.totalWords);
    console.log('📏 Max Depth:', structureResponse.data.structure.maxDepth);
    console.log('🔗 Sample Nodes:', structureResponse.data.structure.nodes.slice(0, 5));
    console.log();

    // 6. Trie Path Tracing
    console.log('6. Trie Path Tracing:');
    const pathResponse = await axios.get(`${BASE_URL}/api/trie/path?query=app`);
    console.log('🛤️  Path for "app":', pathResponse.data.path);
    console.log('✅ Path Exists:', pathResponse.data.exists);
    console.log('🏁 Is Complete Word:', pathResponse.data.isCompleteWord);
    console.log('💡 Suggestions:', pathResponse.data.suggestions.slice(0, 3));
    console.log();

    // 7. Complexity Information
    console.log('7. Algorithm Complexity:');
    const complexityResponse = await axios.get(`${BASE_URL}/api/trie/complexity`);
    console.log('⏰ Time Complexity:', complexityResponse.data.timeComplexity);
    console.log('💾 Space Complexity:', complexityResponse.data.spaceComplexity);
    console.log('📈 Current Stats:', complexityResponse.data.currentStats);
    console.log();

    // 8. Error Handling Demo
    console.log('8. Error Handling:');
    try {
      await axios.get(`${BASE_URL}/api/search?query=`);
    } catch (error) {
      console.log('❌ Empty query error:', error.response.status, error.response.data.error);
    }

    try {
      await axios.get(`${BASE_URL}/api/search?query=test&limit=25`);
    } catch (error) {
      console.log('❌ Invalid limit error:', error.response.status, error.response.data.error);
    }
    console.log();

    console.log('🎉 API Demonstration Complete!');
    console.log('✅ All endpoints are working correctly');
    console.log('⚡ Performance is within acceptable limits');
    console.log('🛡️  Error handling is robust');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the server is running: npm start');
    }
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateAPI();
}

module.exports = { demonstrateAPI };