/**
 * Simple test script to verify typo tolerance functionality
 */

const TypoToleranceService = require('./src/services/TypoToleranceService');
const Trie = require('./src/data-structures/Trie');

async function testTypoTolerance() {
  console.log('🧪 Testing Typo Tolerance Functionality\n');

  // Initialize services
  const typoService = new TypoToleranceService();
  const trie = new Trie();

  // Populate trie with test data
  console.log('📝 Populating Trie with test data...');
  const testWords = [
    { word: 'hello', frequency: 100 },
    { word: 'help', frequency: 80 },
    { word: 'world', frequency: 90 },
    { word: 'word', frequency: 70 },
    { word: 'work', frequency: 60 },
    { word: 'javascript', frequency: 120 },
    { word: 'java', frequency: 110 },
    { word: 'python', frequency: 95 },
    { word: 'programming', frequency: 85 },
    { word: 'computer', frequency: 75 }
  ];

  testWords.forEach(({ word, frequency }) => {
    trie.insert(word, frequency);
  });

  console.log(`✅ Inserted ${testWords.length} words into Trie\n`);

  // Test 1: Exact matches
  console.log('🎯 Test 1: Exact matches');
  const exactResults = typoService.search('hel', trie, 5);
  console.log('Query: "hel"');
  console.log('Exact matches:', exactResults.exactMatches.length);
  console.log('Typo corrections:', exactResults.typoCorrections.length);
  console.log('Combined results:', exactResults.combined.map(r => `${r.word} (${r.type})`));
  console.log('');

  // Test 2: Typo corrections
  console.log('🔧 Test 2: Typo corrections');
  const typoResults = typoService.search('helo', trie, 5);
  console.log('Query: "helo" (typo for "hello")');
  console.log('Exact matches:', typoResults.exactMatches.length);
  console.log('Typo corrections:', typoResults.typoCorrections.length);
  console.log('Combined results:', typoResults.combined.map(r => {
    if (r.type === 'typo_correction') {
      return `${r.word} (${r.type}, distance: ${r.editDistance}, similarity: ${(r.similarity * 100).toFixed(1)}%)`;
    }
    return `${r.word} (${r.type})`;
  }));
  console.log('');

  // Test 3: Distance calculation
  console.log('📏 Test 3: Distance calculation');
  const distances = [
    ['hello', 'hello'],
    ['hello', 'helo'],
    ['hello', 'help'],
    ['javascript', 'java'],
    ['programming', 'program']
  ];

  distances.forEach(([str1, str2]) => {
    const result = typoService.calculateDistance(str1, str2);
    console.log(`"${str1}" → "${str2}": distance=${result.steps}, similarity=${(result.similarity * 100).toFixed(1)}%`);
  });
  console.log('');

  // Test 4: Configuration
  console.log('⚙️ Test 4: Configuration');
  const config = typoService.getConfig();
  console.log('Current config:', config);
  
  // Update config
  typoService.updateConfig({ maxEditDistance: 1, similarityThreshold: 0.8 });
  const newConfig = typoService.getConfig();
  console.log('Updated config:', newConfig);
  console.log('');

  // Test 5: Edge cases
  console.log('🔍 Test 5: Edge cases');
  const edgeCases = [
    '',
    'xyz',
    'a',
    'verylongwordthatdoesnotexist'
  ];

  edgeCases.forEach(query => {
    const results = typoService.search(query, trie, 3);
    console.log(`Query: "${query}" → ${results.combined.length} results`);
  });

  console.log('\n✅ All tests completed successfully!');
}

// Run the test
testTypoTolerance().catch(console.error);