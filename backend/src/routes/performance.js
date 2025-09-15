/**
 * Performance monitoring API routes
 * Provides endpoints for performance metrics, cache statistics, and system health
 */

const express = require('express');
const router = express.Router();
const { query, body, validationResult } = require('express-validator');

/**
 * Get comprehensive performance metrics
 * GET /api/performance/metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const performanceMonitor = req.app.locals.performanceMonitor;
    const cacheService = req.app.locals.cacheService;
    
    if (!performanceMonitor) {
      return res.status(503).json({
        error: 'Performance monitoring not available',
        message: 'Performance monitor not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const metrics = performanceMonitor.getMetrics();
    
    // Add cache metrics if available
    if (cacheService) {
      metrics.cache = cacheService.getStats();
    }
    
    // Add Trie-specific metrics if available
    const trie = req.app.locals.trie;
    if (trie && typeof trie.getStats === 'function') {
      metrics.trieStats = trie.getStats();
    }

    res.json(metrics);

  } catch (error) {
    console.error('Performance metrics error:', error);
    
    res.status(500).json({
      error: 'Failed to retrieve performance metrics',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Metrics unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get cache statistics and configuration
 * GET /api/performance/cache
 */
router.get('/cache', (req, res) => {
  try {
    const cacheService = req.app.locals.cacheService;
    
    if (!cacheService) {
      return res.status(503).json({
        error: 'Cache service not available',
        message: 'Cache service not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const stats = cacheService.getStats();
    const contents = cacheService.getContents(20); // Get top 20 entries
    const popularQueries = cacheService.getPopularQueries(10);

    res.json({
      stats,
      recentEntries: contents,
      popularQueries,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cache metrics error:', error);
    
    res.status(500).json({
      error: 'Failed to retrieve cache metrics',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Cache metrics unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Update cache configuration
 * PUT /api/performance/cache/config
 */
router.put('/cache/config', [
  body('maxSize')
    .optional()
    .isInt({ min: 100, max: 10000 })
    .withMessage('maxSize must be between 100 and 10000'),
  
  body('ttl')
    .optional()
    .isInt({ min: 60000, max: 3600000 }) // 1 minute to 1 hour
    .withMessage('ttl must be between 60000ms (1 min) and 3600000ms (1 hour)')
], (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid cache configuration',
        details: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const cacheService = req.app.locals.cacheService;
    
    if (!cacheService) {
      return res.status(503).json({
        error: 'Cache service not available',
        message: 'Cache service not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const configUpdate = cacheService.updateConfig(req.body);

    res.json({
      message: 'Cache configuration updated successfully',
      ...configUpdate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cache config update error:', error);
    
    res.status(500).json({
      error: 'Failed to update cache configuration',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Config update failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Clear cache entries
 * DELETE /api/performance/cache
 */
router.delete('/cache', [
  query('pattern')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Pattern must be between 1 and 50 characters')
], (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid cache clear request',
        details: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const cacheService = req.app.locals.cacheService;
    
    if (!cacheService) {
      return res.status(503).json({
        error: 'Cache service not available',
        message: 'Cache service not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const { pattern } = req.query;
    let clearedCount;

    if (pattern) {
      clearedCount = cacheService.invalidate(pattern);
      res.json({
        message: `Cache entries matching pattern "${pattern}" cleared`,
        clearedCount,
        pattern,
        timestamp: new Date().toISOString()
      });
    } else {
      clearedCount = cacheService.clear();
      res.json({
        message: 'All cache entries cleared',
        clearedCount,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Cache clear error:', error);
    
    res.status(500).json({
      error: 'Failed to clear cache',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Cache clear failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get system health status
 * GET /api/performance/health
 */
router.get('/health', (req, res) => {
  try {
    const performanceMonitor = req.app.locals.performanceMonitor;
    const cacheService = req.app.locals.cacheService;
    const trie = req.app.locals.trie;
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        performanceMonitor: {
          status: performanceMonitor ? 'available' : 'unavailable',
          initialized: !!performanceMonitor
        },
        cache: {
          status: cacheService ? 'available' : 'unavailable',
          initialized: !!cacheService,
          ...(cacheService && {
            size: cacheService.cache?.size || 0,
            hitRate: cacheService.getStats().hitRate
          })
        },
        trie: {
          status: trie ? 'available' : 'unavailable',
          initialized: !!trie,
          ...(trie && typeof trie.getStats === 'function' && {
            wordCount: trie.getStats().wordCount,
            nodeCount: trie.getStats().nodeCount
          })
        }
      }
    };

    // Check for any critical issues
    if (performanceMonitor) {
      const metrics = performanceMonitor.getMetrics();
      
      // Check memory usage
      const memoryUsageMB = metrics.memory.current.heapUsed / 1024 / 1024;
      if (memoryUsageMB > 500) { // More than 500MB
        health.status = 'warning';
        health.warnings = health.warnings || [];
        health.warnings.push(`High memory usage: ${memoryUsageMB.toFixed(2)}MB`);
      }
      
      // Check response times
      if (metrics.requests.responseTimePercentiles?.p95 > 1000) { // More than 1 second
        health.status = 'warning';
        health.warnings = health.warnings || [];
        health.warnings.push(`High response times: P95 = ${metrics.requests.responseTimePercentiles.p95.toFixed(2)}ms`);
      }
      
      // Check error rate
      const totalRequests = metrics.requests.total;
      const errorRequests = Object.entries(metrics.requests.statusCodes || {})
        .filter(([code]) => code.startsWith('4') || code.startsWith('5'))
        .reduce((sum, [, count]) => sum + count, 0);
      
      const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
      if (errorRate > 5) { // More than 5% error rate
        health.status = 'warning';
        health.warnings = health.warnings || [];
        health.warnings.push(`High error rate: ${errorRate.toFixed(2)}%`);
      }
    }

    // Set appropriate HTTP status
    const httpStatus = health.status === 'healthy' ? 200 : 
                      health.status === 'warning' ? 200 : 503;

    res.status(httpStatus).json(health);

  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Health check unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Reset performance metrics
 * POST /api/performance/reset
 */
router.post('/reset', (req, res) => {
  try {
    const performanceMonitor = req.app.locals.performanceMonitor;
    
    if (!performanceMonitor) {
      return res.status(503).json({
        error: 'Performance monitoring not available',
        message: 'Performance monitor not initialized',
        timestamp: new Date().toISOString()
      });
    }

    performanceMonitor.reset();

    res.json({
      message: 'Performance metrics reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Performance reset error:', error);
    
    res.status(500).json({
      error: 'Failed to reset performance metrics',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Reset failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get performance alerts and warnings
 * GET /api/performance/alerts
 */
router.get('/alerts', (req, res) => {
  try {
    const performanceMonitor = req.app.locals.performanceMonitor;
    
    if (!performanceMonitor) {
      return res.status(503).json({
        error: 'Performance monitoring not available',
        message: 'Performance monitor not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const metrics = performanceMonitor.getMetrics();
    const alerts = [];

    // Memory alerts
    const memoryUsageMB = metrics.memory.current.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 500) {
      alerts.push({
        type: 'warning',
        category: 'memory',
        message: `High memory usage: ${memoryUsageMB.toFixed(2)}MB`,
        threshold: '500MB',
        current: `${memoryUsageMB.toFixed(2)}MB`,
        timestamp: new Date().toISOString()
      });
    }

    // Response time alerts
    if (metrics.requests.responseTimePercentiles?.p95 > 100) {
      alerts.push({
        type: metrics.requests.responseTimePercentiles.p95 > 500 ? 'error' : 'warning',
        category: 'response_time',
        message: `High response times detected`,
        threshold: '100ms (P95)',
        current: `${metrics.requests.responseTimePercentiles.p95.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });
    }

    // Error rate alerts
    const totalRequests = metrics.requests.total;
    if (totalRequests > 0) {
      const errorRequests = Object.entries(metrics.requests.statusCodes || {})
        .filter(([code]) => code.startsWith('4') || code.startsWith('5'))
        .reduce((sum, [, count]) => sum + count, 0);
      
      const errorRate = (errorRequests / totalRequests) * 100;
      if (errorRate > 5) {
        alerts.push({
          type: errorRate > 20 ? 'error' : 'warning',
          category: 'error_rate',
          message: `High error rate detected`,
          threshold: '5%',
          current: `${errorRate.toFixed(2)}%`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Trie operation alerts
    if (metrics.trie.operationStats) {
      Object.entries(metrics.trie.operationStats).forEach(([operation, stats]) => {
        if (stats.avgTime > 50) {
          alerts.push({
            type: stats.avgTime > 100 ? 'error' : 'warning',
            category: 'trie_performance',
            message: `Slow ${operation} operations detected`,
            threshold: '50ms (avg)',
            current: `${stats.avgTime.toFixed(2)}ms`,
            timestamp: new Date().toISOString()
          });
        }
      });
    }

    res.json({
      alerts,
      alertCount: alerts.length,
      severity: {
        error: alerts.filter(a => a.type === 'error').length,
        warning: alerts.filter(a => a.type === 'warning').length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Performance alerts error:', error);
    
    res.status(500).json({
      error: 'Failed to retrieve performance alerts',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Alerts unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;