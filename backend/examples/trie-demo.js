/**
 * Demonstration script showing Trie data structure functionality
 * Run with: node examples/trie-demo.js
 */

const { Trie } = require('../src/data-structures');

console.log('🌳 Trie Data Structure Demo\n');

// Create a new Trie
const trie = new Trie();

// Sample data for demonstration
const sampleWords = [
  { word: 'apple', frequency: 10 },
  { word: 'application', frequency: 8 },
  { word: 'apply', frequency: 6 },
  { word: 'appreciate', frequency: 4 },
  { word: 'approach', frequency: 2 },
  { word: 'banana', frequency: 5 },
  { word: 'band', frequency: 3 },
  { word: 'bandana', frequency: 1 },
  { word: 'cat', frequency: 7 },
  { word: 'car', frequency: 9 },
  { word: 'card', frequency: 4 },
  { word: 'care', frequency: 6 }
];

console.log('📝 Inserting sample words...');
sampleWords.forEach(({ word, frequency }) => {
  trie.insert(word, frequency);
  console.log(`   ✓ Inserted "${word}" with frequency ${frequency}`);
});

console.log(`\n📊 Trie Statistics:`);
const stats = trie.getStats();
console.log(`   • Total words: ${stats.wordCount}`);
console.log(`   • Total nodes: ${stats.nodeCount}`);
console.log(`   • Maximum depth: ${stats.maxDepth}`);

console.log('\n🔍 Search Examples:');

// Search for words starting with "app"
console.log('\n   Searching for "app":');
const appResults = trie.search('app');
appResults.forEach((result, index) => {
  console.log(`   ${index + 1}. ${result.word} (frequency: ${result.frequency})`);
});

// Search for words starting with "car"
console.log('\n   Searching for "car":');
const carResults = trie.search('car');
carResults.forEach((result, index) => {
  console.log(`   ${index + 1}. ${result.word} (frequency: ${result.frequency})`);
});

// Search for words starting with "ban"
console.log('\n   Searching for "ban":');
const banResults = trie.search('ban');
banResults.forEach((result, index) => {
  console.log(`   ${index + 1}. ${result.word} (frequency: ${result.frequency})`);
});

// Demonstrate frequency increment
console.log('\n📈 Frequency Increment Demo:');
console.log(`   Current frequency of "apple": ${trie.getFrequency('apple')}`);
trie.incrementFrequency('apple', 5);
console.log(`   After incrementing by 5: ${trie.getFrequency('apple')}`);

// Show updated search results
console.log('\n   Updated search results for "app":');
const updatedResults = trie.search('app');
updatedResults.forEach((result, index) => {
  console.log(`   ${index + 1}. ${result.word} (frequency: ${result.frequency})`);
});

// Demonstrate case insensitivity
console.log('\n🔤 Case Insensitivity Demo:');
console.log(`   Searching for "APP" (uppercase):`);
const caseResults = trie.search('APP');
caseResults.forEach((result, index) => {
  console.log(`   ${index + 1}. ${result.word} (frequency: ${result.frequency})`);
});

// Performance demonstration
console.log('\n⚡ Performance Demo:');
const performanceTrie = new Trie();

console.log('   Inserting 1000 words...');
const startInsert = Date.now();
for (let i = 0; i < 1000; i++) {
  performanceTrie.insert(`word${i}`, Math.floor(Math.random() * 100));
}
const insertTime = Date.now() - startInsert;
console.log(`   ✓ Inserted 1000 words in ${insertTime}ms`);

console.log('   Performing 100 searches...');
const startSearch = Date.now();
for (let i = 0; i < 100; i++) {
  performanceTrie.search('word');
}
const searchTime = Date.now() - startSearch;
console.log(`   ✓ Performed 100 searches in ${searchTime}ms`);

console.log('\n✨ Demo completed successfully!');
console.log('\n📚 Key Features Demonstrated:');
console.log('   • O(L) insertion time complexity');
console.log('   • O(L + N) search time complexity');
console.log('   • Frequency-based ranking');
console.log('   • Case-insensitive operations');
console.log('   • Efficient prefix matching');
console.log('   • Memory-efficient storage');