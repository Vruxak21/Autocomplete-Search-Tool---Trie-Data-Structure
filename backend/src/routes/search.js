/**
 * Search API routes
 * Handles autocomplete search functionality with query validation and ranking
 * Includes optional typo tolerance for fuzzy matching
 */

const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const TypoToleranceService = require('../services/TypoToleranceService');

/**
 * Search endpoint with query parameter validation
 * GET /api/search?query=<prefix>&limit=<number>&typoTolerance=<boolean>
 */
router.get('/search', [
  // Query parameter validation
  query('query')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Query must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_'.]+$/)
    .withMessage('Query contains invalid characters'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
    .toInt(),
  
  query('typoTolerance')
    .optional()
    .isBoolean()
    .withMessage('typoTolerance must be a boolean value')
    .toBoolean()
], async (req, res) => {
  const startTime = Date.now();
  
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

    const { query: searchQuery, limit = 5, typoTolerance = false } = req.query;
    
    // Get Trie instance from app locals (set during server initialization)
    const trie = req.app.locals.trie;
    
    if (!trie) {
      return res.status(503).json({
        error: 'Search service unavailable',
        message: 'Trie data structure not initialized',
        timestamp: new Date().toISOString()
      });
    }

    // Check cache first
    const cacheService = req.app.locals.cacheService;
    let searchResults;
    let typoToleranceUsed = false;
    let fromCache = false;

    if (cacheService) {
      const cachedResult = cacheService.get(searchQuery, limit, typoTolerance);
      if (cachedResult) {
        searchResults = cachedResult;
        fromCache = true;
      }
    }

    // Perform search if not cached
    if (!searchResults) {
      if (typoTolerance) {
        // Initialize typo tolerance service if not already available
        if (!req.app.locals.typoToleranceService) {
          req.app.locals.typoToleranceService = new TypoToleranceService();
        }
        
        const typoService = req.app.locals.typoToleranceService;
        searchResults = typoService.search(searchQuery, trie, limit);
        typoToleranceUsed = true;
      } else {
        // Standard Trie search
        const suggestions = trie.search(searchQuery, limit);
        searchResults = {
          exactMatches: suggestions.map(s => ({ ...s, type: 'exact_match' })),
          typoCorrections: [],
          combined: suggestions.map(s => ({ ...s, type: 'exact_match' }))
        };
      }

      // Cache the results
      if (cacheService && searchResults.combined.length > 0) {
        cacheService.set(searchQuery, limit, typoTolerance, searchResults);
      }
    }

    const processingTime = Date.now() - startTime;

    // Log search analytics (if analytics service is available)
    if (req.app.locals.analyticsService) {
      req.app.locals.analyticsService.logSearch({
        query: searchQuery,
        resultCount: suggestions.length,
        processingTime,
        timestamp: new Date(),
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }

    // Return successful response with categorized results
    res.json({
      suggestions: searchResults.combined.map(suggestion => ({
        word: suggestion.word,
        frequency: suggestion.frequency,
        score: suggestion.score || suggestion.frequency,
        type: suggestion.type,
        ...(suggestion.type === 'typo_correction' && {
          originalQuery: suggestion.originalQuery,
          editDistance: suggestion.editDistance,
          similarity: suggestion.similarity,
          correctionType: suggestion.correctionType
        })
      })),
      exactMatches: searchResults.exactMatches.length,
      typoCorrections: searchResults.typoCorrections.length,
      query: searchQuery,
      limit,
      typoToleranceUsed,
      totalMatches: searchResults.combined.length,
      processingTime,
      cached: fromCache,
      cacheHit: fromCache,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search error:', error);
    
    const processingTime = Date.now() - startTime;
    
    res.status(500).json({
      error: 'Internal search error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Search temporarily unavailable',
      processingTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Frequency increment endpoint for usage tracking
 * POST /api/search/increment
 */
router.post('/search/increment', [
  // Request body validation
  body('word')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Word must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_'.]+$/)
    .withMessage('Word contains invalid characters'),
  
  body('increment')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Increment must be between 1 and 10')
    .toInt()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { word, increment = 1 } = req.body;
    
    // Get Trie instance from app locals
    const trie = req.app.locals.trie;
    
    if (!trie) {
      return res.status(503).json({
        error: 'Search service unavailable',
        message: 'Trie data structure not initialized',
        timestamp: new Date().toISOString()
      });
    }

    // Increment frequency if word exists
    const success = trie.incrementFrequency(word, increment);
    
    if (success) {
      const newFrequency = trie.getFrequency(word);
      
      // Log frequency update (if analytics service is available)
      if (req.app.locals.analyticsService) {
        req.app.locals.analyticsService.logFrequencyUpdate({
          word,
          increment,
          newFrequency,
          timestamp: new Date(),
          ip: req.ip
        });
      }
      
      res.json({
        success: true,
        word,
        increment,
        newFrequency,
        message: `Frequency updated for "${word}"`,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        word,
        message: `Word "${word}" not found in search index`,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Frequency increment error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Frequency update failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Typo tolerance configuration endpoint
 * GET /api/search/typo-config - Get current configuration
 * PUT /api/search/typo-config - Update configuration
 */
router.get('/search/typo-config', (req, res) => {
  try {
    // Initialize typo tolerance service if not already available
    if (!req.app.locals.typoToleranceService) {
      req.app.locals.typoToleranceService = new TypoToleranceService();
    }
    
    const typoService = req.app.locals.typoToleranceService;
    const config = typoService.getConfig();
    const stats = typoService.getStats();

    res.json({
      config,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Typo config error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Config unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

router.put('/search/typo-config', [
  // Configuration validation
  body('maxEditDistance')
    .optional()
    .isInt({ min: 1, max: 3 })
    .withMessage('maxEditDistance must be between 1 and 3'),
  
  body('minWordLength')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('minWordLength must be between 1 and 10'),
  
  body('maxCandidates')
    .optional()
    .isInt({ min: 10, max: 1000 })
    .withMessage('maxCandidates must be between 10 and 1000'),
  
  body('similarityThreshold')
    .optional()
    .isFloat({ min: 0.1, max: 1.0 })
    .withMessage('similarityThreshold must be between 0.1 and 1.0')
], (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid configuration',
        details: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    // Initialize typo tolerance service if not already available
    if (!req.app.locals.typoToleranceService) {
      req.app.locals.typoToleranceService = new TypoToleranceService();
    }
    
    const typoService = req.app.locals.typoToleranceService;
    const oldConfig = typoService.getConfig();
    
    // Update configuration
    typoService.updateConfig(req.body);
    const newConfig = typoService.getConfig();

    res.json({
      message: 'Typo tolerance configuration updated successfully',
      oldConfig,
      newConfig,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Typo config update error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Config update failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Search statistics endpoint
 * GET /api/search/stats
 */
router.get('/search/stats', (req, res) => {
  try {
    const trie = req.app.locals.trie;
    
    if (!trie) {
      return res.status(503).json({
        error: 'Search service unavailable',
        message: 'Trie data structure not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const trieStats = trie.getStats();
    const datasetLoader = req.app.locals.datasetLoader;
    const loaderStats = datasetLoader ? datasetLoader.getStats() : null;
    
    // Include typo tolerance stats if available
    const typoService = req.app.locals.typoToleranceService;
    const typoStats = typoService ? typoService.getStats() : null;

    res.json({
      trie: trieStats,
      datasets: loaderStats,
      typoTolerance: typoStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Stats error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Stats unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;