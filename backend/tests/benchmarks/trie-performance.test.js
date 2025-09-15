const Trie = require('../../src/data-structures/Trie');
const MaxHeap = require('../../src/data-structures/MaxHeap');

describe('Trie Performance Benchmarks', () => {
  let trie;
  const testWords = [];
  
  beforeAll(() => {
    // Generate test data
    const cities = [
      'Tokyo', 'Delhi', 'Shanghai', 'São Paulo', 'Mexico City',
      'Cairo', 'Mumbai', 'Beijing', 'Dhaka', 'Osaka',
      'New York', 'Karachi', 'Buenos Aires', 'Chongqing', 'Istanbul',
      'Kolkata', 'Manila', 'Lagos', 'Rio de Janeiro', 'Tianjin'
    ];
    
    // Create variations and add to test words
    cities.forEach(city => {
      testWords.push(city);
      // Add partial matches
      for (let i = 1; i < city.length; i++) {
        testWords.push(city.substring(0, i));
      }
    });
    
    trie = new Trie();
    
    // Insert all test words
    testWords.forEach((word, index) => {
      trie.insert(word, Math.floor(Math.random() * 100) + 1);
    });
  });

  test('should insert words within performance threshold', () => {
    const newTrie = new Trie();
    const startTime = process.hrtime.bigint();
    
    // Insert 1000 words
    for (let i = 0; i < 1000; i++) {
      newTrie.insert(`word${i}`, i + 1);
    }
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Should complete within 100ms
    expect(duration).toBeLessThan(100);
  });

  test('should search within performance threshold', () => {
    const queries = ['to', 'new', 'tok', 'del', 'sha'];
    const startTime = process.hrtime.bigint();
    
    // Perform 100 searches
    for (let i = 0; i < 100; i++) {
      const query = queries[i % queries.length];
      trie.search(query);
    }
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;
    
    // Should complete within 50ms for 100 searches
    expect(duration).toBeLessThan(50);
  });

  test('should maintain O(L) time complexity for search', () => {
    const shortQuery = 'to';
    const longQuery = 'tokyometropolitanarea';
    
    // Measure short query
    const shortStart = process.hrtime.bigint();
    for (let i = 0; i < 1000; i++) {
      trie.search(shortQuery);
    }
    const shortEnd = process.hrtime.bigint();
    const shortDuration = Number(shortEnd - shortStart);
    
    // Measure long query
    const longStart = process.hrtime.bigint();
    for (let i = 0; i < 1000; i++) {
      trie.search(longQuery);
    }
    const longEnd = process.hrtime.bigint();
    const longDuration = Number(longEnd - longStart);
    
    // Long query should not be significantly slower (within 3x)
    const ratio = longDuration / shortDuration;
    expect(ratio).toBeLessThan(3);
  });

  test('should handle large datasets efficiently', () => {
    const largeTrie = new Trie();
    const startTime = process.hrtime.bigint();
    
    // Insert 10,000 words
    for (let i = 0; i < 10000; i++) {
      largeTrie.insert(`city${i}`, Math.floor(Math.random() * 1000));
    }
    
    const insertEndTime = process.hrtime.bigint();
    const insertDuration = Number(insertEndTime - startTime) / 1000000;
    
    // Should insert 10k words within 1 second
    expect(insertDuration).toBeLessThan(1000);
    
    // Test search performance on large dataset
    const searchStart = process.hrtime.bigint();
    for (let i = 0; i < 100; i++) {
      largeTrie.search('city');
    }
    const searchEnd = process.hrtime.bigint();
    const searchDuration = Number(searchEnd - searchStart) / 1000000;
    
    // Should search within 100ms even with large dataset
    expect(searchDuration).toBeLessThan(100);
  });

  test('should efficiently rank suggestions with heap', () => {
    const heap = new MaxHeap();
    const suggestions = [];
    
    // Create test suggestions
    for (let i = 0; i < 1000; i++) {
      suggestions.push({
        word: `suggestion${i}`,
        frequency: Math.floor(Math.random() * 1000)
      });
    }
    
    const startTime = process.hrtime.bigint();
    
    // Add all suggestions to heap and get top 5
    suggestions.forEach(suggestion => heap.insert(suggestion));
    const topSuggestions = heap.getTopK(5);
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;
    
    // Should complete within 10ms
    expect(duration).toBeLessThan(10);
    expect(topSuggestions).toHaveLength(5);
    
    // Verify ranking order
    for (let i = 1; i < topSuggestions.length; i++) {
      expect(topSuggestions[i-1].frequency).toBeGreaterThanOrEqual(topSuggestions[i].frequency);
    }
  });

  test('should handle memory efficiently', () => {
    const memoryTrie = new Trie();
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Insert many words
    for (let i = 0; i < 5000; i++) {
      memoryTrie.insert(`memorytest${i}`, i);
    }
    
    const afterInsertMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (afterInsertMemory - initialMemory) / 1024 / 1024; // MB
    
    // Should not use excessive memory (less than 50MB for 5k words)
    expect(memoryIncrease).toBeLessThan(50);
  });
});