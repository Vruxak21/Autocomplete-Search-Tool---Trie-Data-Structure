const TrieNode = require('./TrieNode');
const MaxHeap = require('./MaxHeap');

/**
 * Trie (Prefix Tree) data structure for efficient string storage and retrieval
 * Optimized for autocomplete functionality with frequency-based ranking
 */
class Trie {
  /**
   * Creates a new Trie with an empty root node
   */
  constructor() {
    this.root = new TrieNode();
    this.wordCount = 0; // Total number of words stored
    this.performanceMonitor = null; // Will be set by server
  }

  /**
   * Set performance monitor for tracking operations
   * @param {Object} monitor - Performance monitor instance
   */
  setPerformanceMonitor(monitor) {
    this.performanceMonitor = monitor;
  }

  /**
   * Record performance metrics for Trie operations
   * @param {string} operation - Operation name
   * @param {number} startTime - Start time in nanoseconds
   * @param {Object} metadata - Additional metadata
   */
  recordPerformance(operation, startTime, metadata = {}) {
    if (this.performanceMonitor) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to milliseconds
      this.performanceMonitor.recordTrieOperation(operation, duration, metadata);
    }
  }

  /**
   * Inserts a word into the Trie with optional frequency
   * Time Complexity: O(L) where L is the length of the word
   * @param {string} word - Word to insert
   * @param {number} frequency - Initial frequency count (default: 1)
   * @throws {Error} If word is empty or not a string
   */
  insert(word, frequency = 1) {
    const startTime = process.hrtime.bigint();
    
    if (!word || typeof word !== 'string') {
      throw new Error('Word must be a non-empty string');
    }

    if (frequency < 0) {
      throw new Error('Frequency must be non-negative');
    }

    const normalizedWord = word.toLowerCase().trim();
    if (normalizedWord.length === 0) {
      throw new Error('Word cannot be empty after normalization');
    }

    let currentNode = this.root;

    // Traverse/create path for each character
    for (const char of normalizedWord) {
      if (!currentNode.hasChild(char)) {
        currentNode.addChild(char);
      }
      currentNode = currentNode.getChild(char);
    }

    // Mark end of word and set metadata
    const wasNewWord = !currentNode.isEndOfWord;
    if (wasNewWord) {
      this.wordCount++;
    }
    currentNode.markAsEndOfWord(normalizedWord, frequency);

    // Record performance metrics
    this.recordPerformance('insert', startTime, {
      wordLength: normalizedWord.length,
      frequency,
      wasNewWord
    });
  }

  /**
   * Searches for words with the given prefix
   * Time Complexity: O(L + N log k) where L is prefix length, N is number of matches, k is limit
   * @param {string} prefix - Prefix to search for
   * @param {number} limit - Maximum number of results (default: 5)
   * @returns {Array<{word: string, frequency: number}>} Array of matching words with frequencies
   */
  search(prefix, limit = 5) {
    const startTime = process.hrtime.bigint();
    
    if (!prefix || typeof prefix !== 'string') {
      this.recordPerformance('search', startTime, { 
        prefixLength: 0, 
        resultCount: 0, 
        error: 'invalid_prefix' 
      });
      return [];
    }

    const normalizedPrefix = prefix.toLowerCase().trim();
    if (normalizedPrefix.length === 0) {
      this.recordPerformance('search', startTime, { 
        prefixLength: 0, 
        resultCount: 0, 
        error: 'empty_prefix' 
      });
      return [];
    }

    // Find the node representing the prefix
    let currentNode = this.root;
    for (const char of normalizedPrefix) {
      if (!currentNode.hasChild(char)) {
        this.recordPerformance('search', startTime, { 
          prefixLength: normalizedPrefix.length, 
          resultCount: 0, 
          error: 'prefix_not_found' 
        });
        return []; // Prefix not found
      }
      currentNode = currentNode.getChild(char);
    }

    // Collect all words with this prefix
    const results = [];
    this.getAllWords(currentNode, normalizedPrefix, results);

    // Use MaxHeap for efficient top-K selection
    const finalResults = MaxHeap.getTopKFromArray(results, limit);

    // Record performance metrics
    this.recordPerformance('search', startTime, {
      prefixLength: normalizedPrefix.length,
      totalMatches: results.length,
      resultCount: finalResults.length,
      limit
    });

    return finalResults;
  }

  /**
   * Recursively collects all words from a given node using DFS
   * @param {TrieNode} node - Starting node
   * @param {string} prefix - Current prefix
   * @param {Array} results - Array to collect results
   */
  getAllWords(node, prefix, results) {
    if (!node) {
      return;
    }

    // If this node represents a complete word, add it to results
    if (node.isEndOfWord) {
      results.push({
        word: node.word,
        frequency: node.frequency
      });
    }

    // Recursively search all children
    for (const [char, childNode] of node.children) {
      this.getAllWords(childNode, prefix + char, results);
    }
  }

  /**
   * Increments the frequency of a word if it exists in the Trie
   * Time Complexity: O(L) where L is the length of the word
   * @param {string} word - Word to increment frequency for
   * @param {number} increment - Amount to increment by (default: 1)
   * @returns {boolean} True if word was found and incremented, false otherwise
   */
  incrementFrequency(word, increment = 1) {
    const startTime = process.hrtime.bigint();
    
    if (!word || typeof word !== 'string') {
      this.recordPerformance('incrementFrequency', startTime, { 
        wordLength: 0, 
        success: false, 
        error: 'invalid_word' 
      });
      return false;
    }

    if (increment <= 0) {
      throw new Error('Increment must be positive');
    }

    const normalizedWord = word.toLowerCase().trim();
    if (normalizedWord.length === 0) {
      this.recordPerformance('incrementFrequency', startTime, { 
        wordLength: 0, 
        success: false, 
        error: 'empty_word' 
      });
      return false;
    }

    let currentNode = this.root;

    // Navigate to the word's end node
    for (const char of normalizedWord) {
      if (!currentNode.hasChild(char)) {
        this.recordPerformance('incrementFrequency', startTime, { 
          wordLength: normalizedWord.length, 
          success: false, 
          error: 'word_not_found' 
        });
        return false; // Word not found
      }
      currentNode = currentNode.getChild(char);
    }

    // Increment frequency if this is a complete word
    if (currentNode.isEndOfWord) {
      const oldFrequency = currentNode.frequency;
      currentNode.incrementFrequency(increment);
      
      this.recordPerformance('incrementFrequency', startTime, {
        wordLength: normalizedWord.length,
        success: true,
        increment,
        oldFrequency,
        newFrequency: currentNode.frequency
      });
      
      return true;
    }

    this.recordPerformance('incrementFrequency', startTime, { 
      wordLength: normalizedWord.length, 
      success: false, 
      error: 'not_end_of_word' 
    });
    return false;
  }

  /**
   * Checks if a word exists in the Trie
   * Time Complexity: O(L) where L is the length of the word
   * @param {string} word - Word to check
   * @returns {boolean} True if word exists
   */
  contains(word) {
    if (!word || typeof word !== 'string') {
      return false;
    }

    const normalizedWord = word.toLowerCase().trim();
    if (normalizedWord.length === 0) {
      return false;
    }

    let currentNode = this.root;

    for (const char of normalizedWord) {
      if (!currentNode.hasChild(char)) {
        return false;
      }
      currentNode = currentNode.getChild(char);
    }

    return currentNode.isEndOfWord;
  }

  /**
   * Gets the frequency of a word
   * @param {string} word - Word to get frequency for
   * @returns {number} Frequency of the word, or 0 if not found
   */
  getFrequency(word) {
    if (!word || typeof word !== 'string') {
      return 0;
    }

    const normalizedWord = word.toLowerCase().trim();
    if (normalizedWord.length === 0) {
      return 0;
    }

    let currentNode = this.root;

    for (const char of normalizedWord) {
      if (!currentNode.hasChild(char)) {
        return 0;
      }
      currentNode = currentNode.getChild(char);
    }

    return currentNode.isEndOfWord ? currentNode.frequency : 0;
  }

  /**
   * Gets the total number of words in the Trie
   * @returns {number} Total word count
   */
  getWordCount() {
    return this.wordCount;
  }

  /**
   * Gets all words in the Trie
   * @returns {Array<{word: string, frequency: number}>} All words with frequencies
   */
  getAllWordsInTrie() {
    const results = [];
    this.getAllWords(this.root, '', results);
    return results.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Clears all data from the Trie
   */
  clear() {
    this.root = new TrieNode();
    this.wordCount = 0;
  }

  /**
   * Gets statistics about the Trie structure
   * @returns {Object} Statistics including word count, node count, etc.
   */
  getStats() {
    let nodeCount = 0;
    let maxDepth = 0;

    const countNodes = (node, depth = 0) => {
      nodeCount++;
      maxDepth = Math.max(maxDepth, depth);
      
      for (const childNode of node.children.values()) {
        countNodes(childNode, depth + 1);
      }
    };

    countNodes(this.root);

    return {
      wordCount: this.wordCount,
      nodeCount,
      maxDepth,
      averageDepth: this.wordCount > 0 ? maxDepth / this.wordCount : 0
    };
  }
}

module.exports = Trie;