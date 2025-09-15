/**
 * Trie visualization API routes
 * Provides endpoints for educational visualization of Trie structure
 */

const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');

/**
 * Trie structure endpoint for visualization data
 * GET /api/trie/structure?depth=<number>&prefix=<string>
 */
router.get('/structure', [
  // Query parameter validation
  query('depth')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Depth must be between 1 and 10')
    .toInt(),
  
  query('prefix')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Prefix must be 50 characters or less')
    .matches(/^[a-zA-Z0-9\s\-_'.]*$/)
    .withMessage('Prefix contains invalid characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { depth = 5, prefix = '' } = req.query;
    
    // Get Trie instance from app locals
    const trie = req.app.locals.trie;
    
    if (!trie) {
      return res.status(503).json({
        error: 'Trie service unavailable',
        message: 'Trie data structure not initialized',
        timestamp: new Date().toISOString()
      });
    }

    // Generate Trie structure data for visualization
    const structureData = generateTrieStructure(trie, prefix, depth);
    
    res.json({
      structure: structureData,
      metadata: {
        prefix,
        depth,
        totalNodes: structureData.totalNodes,
        totalWords: structureData.totalWords,
        maxDepth: structureData.maxDepth
      },
      trieStats: trie.getStats(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Trie structure error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Trie structure unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Trie path endpoint for real-time path highlighting
 * GET /api/trie/path?query=<string>
 */
router.get('/path', [
  // Query parameter validation
  query('query')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Query must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_'.]+$/)
    .withMessage('Query contains invalid characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { query: searchQuery } = req.query;
    
    // Get Trie instance from app locals
    const trie = req.app.locals.trie;
    
    if (!trie) {
      return res.status(503).json({
        error: 'Trie service unavailable',
        message: 'Trie data structure not initialized',
        timestamp: new Date().toISOString()
      });
    }

    // Generate path data for the query
    const pathData = generateTriePath(trie, searchQuery);
    
    res.json({
      query: searchQuery,
      path: pathData.path,
      exists: pathData.exists,
      isCompleteWord: pathData.isCompleteWord,
      frequency: pathData.frequency,
      suggestions: pathData.suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Trie path error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Trie path unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Trie complexity information endpoint
 * GET /api/trie/complexity
 */
router.get('/complexity', (req, res) => {
  try {
    const trie = req.app.locals.trie;
    
    if (!trie) {
      return res.status(503).json({
        error: 'Trie service unavailable',
        message: 'Trie data structure not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const stats = trie.getStats();
    
    res.json({
      timeComplexity: {
        search: 'O(L)',
        insert: 'O(L)',
        delete: 'O(L)',
        description: 'L is the length of the word/query'
      },
      spaceComplexity: {
        worst: 'O(ALPHABET_SIZE * N * M)',
        average: 'O(N * M)',
        description: 'N is number of words, M is average word length, ALPHABET_SIZE is character set size'
      },
      currentStats: {
        wordCount: stats.wordCount,
        nodeCount: stats.nodeCount,
        maxDepth: stats.maxDepth,
        averageDepth: stats.averageDepth,
        memoryEfficiency: calculateMemoryEfficiency(stats)
      },
      advantages: [
        'Fast prefix-based searches',
        'Memory efficient for large dictionaries with common prefixes',
        'Supports autocomplete and spell-check functionality',
        'Deterministic performance regardless of dataset size'
      ],
      disadvantages: [
        'Higher memory usage for sparse datasets',
        'Complex implementation compared to hash tables',
        'Not suitable for exact match queries only'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Trie complexity error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Complexity info unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generates Trie structure data for visualization
 * @param {Trie} trie - Trie instance
 * @param {string} prefix - Optional prefix to focus on
 * @param {number} maxDepth - Maximum depth to traverse
 * @returns {Object} Structure data for visualization
 */
function generateTrieStructure(trie, prefix = '', maxDepth = 5) {
  const result = {
    nodes: [],
    edges: [],
    totalNodes: 0,
    totalWords: 0,
    maxDepth: 0
  };

  let nodeId = 0;
  const nodeMap = new Map();

  // Find starting node based on prefix
  let startNode = trie.root;
  let currentPrefix = '';
  
  if (prefix) {
    for (const char of prefix.toLowerCase()) {
      if (!startNode.hasChild(char)) {
        // Prefix doesn't exist in Trie
        return {
          ...result,
          error: `Prefix "${prefix}" not found in Trie`
        };
      }
      startNode = startNode.getChild(char);
      currentPrefix += char;
    }
  }

  // Traverse Trie structure using DFS
  function traverse(node, currentPrefix, depth, parentId = null) {
    if (depth > maxDepth) return;

    const currentNodeId = nodeId++;
    nodeMap.set(node, currentNodeId);
    result.totalNodes++;
    result.maxDepth = Math.max(result.maxDepth, depth);

    // Create node data
    const nodeData = {
      id: currentNodeId,
      character: currentPrefix.slice(-1) || 'ROOT',
      prefix: currentPrefix,
      isEndOfWord: node.isEndOfWord,
      frequency: node.frequency || 0,
      word: node.word || null,
      depth,
      childCount: node.children.size
    };

    if (node.isEndOfWord) {
      result.totalWords++;
    }

    result.nodes.push(nodeData);

    // Create edge to parent
    if (parentId !== null) {
      result.edges.push({
        from: parentId,
        to: currentNodeId,
        character: nodeData.character
      });
    }

    // Traverse children
    for (const [char, childNode] of node.children) {
      traverse(childNode, currentPrefix + char, depth + 1, currentNodeId);
    }
  }

  traverse(startNode, currentPrefix, prefix.length, null);

  return result;
}

/**
 * Generates path data for a specific query
 * @param {Trie} trie - Trie instance
 * @param {string} query - Query to trace path for
 * @returns {Object} Path data including nodes and suggestions
 */
function generateTriePath(trie, query) {
  const normalizedQuery = query.toLowerCase().trim();
  const path = [];
  let currentNode = trie.root;
  let exists = true;
  let currentPrefix = '';

  // Trace path through Trie
  for (let i = 0; i < normalizedQuery.length; i++) {
    const char = normalizedQuery[i];
    currentPrefix += char;

    if (!currentNode.hasChild(char)) {
      exists = false;
      break;
    }

    currentNode = currentNode.getChild(char);
    
    path.push({
      character: char,
      prefix: currentPrefix,
      isEndOfWord: currentNode.isEndOfWord,
      frequency: currentNode.frequency || 0,
      word: currentNode.word || null
    });
  }

  // Get suggestions from the final node if path exists
  let suggestions = [];
  if (exists && currentNode) {
    suggestions = trie.search(normalizedQuery, 5);
  }

  return {
    path,
    exists,
    isCompleteWord: exists && currentNode && currentNode.isEndOfWord,
    frequency: exists && currentNode ? (currentNode.frequency || 0) : 0,
    suggestions
  };
}

/**
 * Calculates memory efficiency metric
 * @param {Object} stats - Trie statistics
 * @returns {number} Memory efficiency percentage
 */
function calculateMemoryEfficiency(stats) {
  if (stats.wordCount === 0 || stats.nodeCount === 0) {
    return 0;
  }
  
  // Ideal case: each word would need exactly its length in nodes
  // Reality: shared prefixes reduce node count
  const idealNodes = stats.wordCount * stats.averageDepth;
  const actualNodes = stats.nodeCount;
  
  // Efficiency = how much we saved compared to ideal case
  return Math.max(0, Math.min(100, ((idealNodes - actualNodes) / idealNodes) * 100));
}

module.exports = router;