/**
 * Typo Tolerance Service
 * Provides fuzzy matching capabilities using Levenshtein distance algorithm
 * Integrates with Trie search for typo-corrected suggestions
 */

const levenshtein = require('damerau-levenshtein');

/**
 * Configuration for typo tolerance
 */
const DEFAULT_CONFIG = {
  maxEditDistance: 2,        // Maximum allowed edit distance
  minWordLength: 3,          // Minimum word length to apply typo correction
  maxCandidates: 100,        // Maximum candidates to evaluate for typo correction
  similarityThreshold: 0.6   // Minimum similarity score (0-1)
};

class TypoToleranceService {
  /**
   * Creates a new TypoToleranceService
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculates Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @param {number} maxDistance - Maximum distance to calculate (optimization)
   * @returns {Object} Distance information with steps, relative, and similarity
   */
  calculateDistance(str1, str2, maxDistance = this.config.maxEditDistance) {
    if (typeof str1 !== 'string' || typeof str2 !== 'string') {
      return { steps: Infinity, relative: 1, similarity: 0 };
    }

    // Early exit for identical strings (including both empty)
    if (str1 === str2) {
      return { steps: 0, relative: 0, similarity: 1 };
    }

    // Handle empty strings
    if (str1.length === 0) {
      return { 
        steps: str2.length, 
        relative: str2.length > 0 ? 1 : 0, 
        similarity: 0 
      };
    }
    if (str2.length === 0) {
      return { 
        steps: str1.length, 
        relative: str1.length > 0 ? 1 : 0, 
        similarity: 0 
      };
    }

    // Early exit if length difference exceeds max distance
    const lengthDiff = Math.abs(str1.length - str2.length);
    if (lengthDiff > maxDistance) {
      return { steps: lengthDiff, relative: lengthDiff / Math.max(str1.length, str2.length), similarity: 0 };
    }

    try {
      const result = levenshtein(str1.toLowerCase(), str2.toLowerCase());
      return {
        steps: result.steps,
        relative: result.relative,
        similarity: result.similarity
      };
    } catch (error) {
      // Fallback to simple implementation if library fails
      const distance = this.simpleLevenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
      const maxLen = Math.max(str1.length, str2.length);
      return {
        steps: distance,
        relative: distance / maxLen,
        similarity: 1 - (distance / maxLen)
      };
    }
  }

  /**
   * Simple Levenshtein distance implementation as fallback
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  simpleLevenshteinDistance(str1, str2) {
    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Finds typo-corrected suggestions for a query
   * @param {string} query - Original query with potential typos
   * @param {Trie} trie - Trie instance to search for corrections
   * @param {number} limit - Maximum number of suggestions to return
   * @returns {Array<Object>} Array of typo-corrected suggestions
   */
  findTypoCorrections(query, trie, limit = 5) {
    if (!query || typeof query !== 'string' || query.length < this.config.minWordLength) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    
    // Get all words from the Trie for comparison
    const allWords = trie.getAllWordsInTrie();
    const corrections = [];

    // Evaluate each word for potential typo correction
    for (const wordData of allWords.slice(0, this.config.maxCandidates)) {
      const distance = this.calculateDistance(normalizedQuery, wordData.word);
      
      // Check if the word qualifies as a typo correction
      if (distance.steps > 0 && 
          distance.steps <= this.config.maxEditDistance && 
          distance.similarity >= this.config.similarityThreshold) {
        
        corrections.push({
          word: wordData.word,
          frequency: wordData.frequency,
          originalQuery: query,
          editDistance: distance.steps,
          similarity: distance.similarity,
          correctionType: this.getCorrectionType(distance.steps),
          score: this.calculateCorrectionScore(wordData.frequency, distance.similarity)
        });
      }
    }

    // Sort by correction score (combination of frequency and similarity)
    corrections.sort((a, b) => b.score - a.score);
    
    return corrections.slice(0, limit);
  }

  /**
   * Determines the type of correction based on edit distance
   * @param {number} editDistance - Number of edits required
   * @returns {string} Correction type description
   */
  getCorrectionType(editDistance) {
    switch (editDistance) {
      case 1:
        return 'minor_typo';
      case 2:
        return 'moderate_typo';
      default:
        return 'major_typo';
    }
  }

  /**
   * Calculates a combined score for typo corrections
   * Balances word frequency with similarity to original query
   * @param {number} frequency - Word frequency in the dataset
   * @param {number} similarity - Similarity score (0-1)
   * @returns {number} Combined correction score
   */
  calculateCorrectionScore(frequency, similarity) {
    // Weight similarity more heavily than frequency for typo corrections
    const similarityWeight = 0.7;
    const frequencyWeight = 0.3;
    
    // Normalize frequency (assuming max frequency of 1000 for scaling)
    const normalizedFrequency = Math.min(frequency / 1000, 1);
    
    return (similarity * similarityWeight) + (normalizedFrequency * frequencyWeight);
  }

  /**
   * Combines exact matches with typo corrections
   * @param {Array} exactMatches - Exact prefix matches from Trie
   * @param {Array} typoCorrections - Typo-corrected suggestions
   * @param {number} totalLimit - Total number of suggestions to return
   * @returns {Object} Categorized suggestions with exact matches and corrections
   */
  combineResults(exactMatches, typoCorrections, totalLimit = 5) {
    const result = {
      exactMatches: exactMatches.map(match => ({
        ...match,
        type: 'exact_match'
      })),
      typoCorrections: typoCorrections.map(correction => ({
        ...correction,
        type: 'typo_correction'
      })),
      combined: []
    };

    // Prioritize exact matches, then add typo corrections
    const combined = [...result.exactMatches];
    const remainingSlots = totalLimit - combined.length;
    
    if (remainingSlots > 0) {
      combined.push(...result.typoCorrections.slice(0, remainingSlots));
    }

    result.combined = combined;
    return result;
  }

  /**
   * Main search method that combines exact matching with typo tolerance
   * @param {string} query - Search query
   * @param {Trie} trie - Trie instance
   * @param {number} limit - Maximum number of results
   * @returns {Object} Search results with exact matches and typo corrections
   */
  search(query, trie, limit = 5) {
    if (!query || !trie) {
      return {
        exactMatches: [],
        typoCorrections: [],
        combined: []
      };
    }

    // First, get exact matches using standard Trie search
    const exactMatches = trie.search(query, limit);
    
    // If we have enough exact matches, return them
    if (exactMatches.length >= limit) {
      return this.combineResults(exactMatches, [], limit);
    }

    // Find typo corrections for remaining slots
    const remainingSlots = limit - exactMatches.length;
    const typoCorrections = this.findTypoCorrections(query, trie, remainingSlots * 2); // Get more candidates
    
    return this.combineResults(exactMatches, typoCorrections, limit);
  }

  /**
   * Updates configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Gets statistics about typo tolerance performance
   * @returns {Object} Performance statistics
   */
  getStats() {
    return {
      config: this.getConfig(),
      algorithmInfo: {
        name: 'Damerau-Levenshtein Distance',
        description: 'Calculates minimum edit operations (insertions, deletions, substitutions, transpositions)',
        timeComplexity: 'O(m*n) where m and n are string lengths',
        spaceComplexity: 'O(m*n)'
      }
    };
  }
}

module.exports = TypoToleranceService;