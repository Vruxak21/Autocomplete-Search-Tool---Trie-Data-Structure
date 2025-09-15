/**
 * Demonstration of MaxHeap-based ranking system for autocomplete suggestions
 * This example shows how the heap efficiently ranks search results by frequency
 */

const { Trie, MaxHeap } = require('../src/data-structures');

console.log('🔥 MaxHeap-based Ranking System Demo\n');

// Create a new Trie and populate it with sample data
const trie = new Trie();

const sampleData = [
  { word: 'javascript', frequency: 25 },
  { word: 'java', frequency: 30 },
  { word: 'python', frequency: 28 },
  { word: 'programming', frequency: 15 },
  { word: 'program', frequency: 20 },
  { word: 'project', frequency: 12 },
  { word: 'process', frequency: 18 },
  { word: 'product', frequency: 22 },
  { word: 'production', frequency: 8 },
  { word: 'professional', frequency: 5 }
];

console.log('📊 Inserting sample data into Trie:');
sampleData.forEach(({ word, frequency }) => {
  trie.insert(word, frequency);
  console.log(`  - ${word}: ${frequency} searches`);
});

console.log('\n🔍 Testing search with heap-based ranking:\n');

// Test different search queries
const testQueries = [
  { query: 'java', limit: 3 },
  { query: 'pro', limit: 5 },
  { query: 'p', limit: 4 }
];

testQueries.forEach(({ query, limit }) => {
  console.log(`Query: "${query}" (top ${limit} results)`);
  const results = trie.search(query, limit);
  
  if (results.length === 0) {
    console.log('  No results found\n');
    return;
  }
  
  results.forEach((result, index) => {
    console.log(`  ${index + 1}. ${result.word} (${result.frequency} searches)`);
  });
  console.log('');
});

// Demonstrate MaxHeap static method
console.log('🏆 Direct MaxHeap usage for ranking:');
const items = [
  { word: 'apple', frequency: 15 },
  { word: 'application', frequency: 8 },
  { word: 'apply', frequency: 12 },
  { word: 'approach', frequency: 20 },
  { word: 'appropriate', frequency: 3 }
];

console.log('\nOriginal items:');
items.forEach(item => {
  console.log(`  - ${item.word}: ${item.frequency}`);
});

const top3 = MaxHeap.getTopKFromArray(items, 3);
console.log('\nTop 3 using MaxHeap.getTopKFromArray():');
top3.forEach((item, index) => {
  console.log(`  ${index + 1}. ${item.word} (${item.frequency})`);
});

// Demonstrate frequency updates affecting rankings
console.log('\n📈 Demonstrating frequency updates:');
console.log('Before update - "pro" search results:');
let proResults = trie.search('pro', 3);
proResults.forEach((result, index) => {
  console.log(`  ${index + 1}. ${result.word} (${result.frequency})`);
});

// Increment frequency of 'project'
trie.incrementFrequency('project', 15); // 12 -> 27
console.log('\nAfter incrementing "project" frequency by 15:');
proResults = trie.search('pro', 3);
proResults.forEach((result, index) => {
  console.log(`  ${index + 1}. ${result.word} (${result.frequency})`);
});

// Performance demonstration
console.log('\n⚡ Performance demonstration:');
const startTime = Date.now();

// Insert 1000 random words
for (let i = 0; i < 1000; i++) {
  const word = `word${i}`;
  const frequency = Math.floor(Math.random() * 100) + 1;
  trie.insert(word, frequency);
}

const insertTime = Date.now() - startTime;

// Perform search
const searchStart = Date.now();
const searchResults = trie.search('word', 10);
const searchTime = Date.now() - searchStart;

console.log(`Inserted 1000 words in ${insertTime}ms`);
console.log(`Search for "word" (top 10) completed in ${searchTime}ms`);
console.log(`Found ${searchResults.length} results, top result: ${searchResults[0]?.word} (${searchResults[0]?.frequency})`);

console.log('\n✅ Demo completed successfully!');