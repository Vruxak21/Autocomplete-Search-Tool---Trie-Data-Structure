/**
 * Health Check Routes
 * Comprehensive health monitoring endpoints for application status
 */

const express = require('express');
const mongoDBService = require('../services/MongoDBService');

const router = express.Router();

/**
 * Basic health check endpoint
 * Returns simple OK status for load balancers
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'autocomplete-search-api'
  });
});

/**
 * Detailed health check endpoint
 * Returns comprehensive system status
 */
router.get('/detailed', async (req, res) => {
  const startTime = Date.now();
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'autocomplete-search-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };

  try {
    // Check Trie status
    const trie = req.app.locals.trie;
    if (trie) {
      const trieStats = trie.getStats();
      healthCheck.checks.trie = {
        status: 'healthy',
        wordCount: trieStats.wordCount,
        nodeCount: trieStats.nodeCount,
        memoryUsage: trieStats.memoryUsage || 'N/A'
      };
    } else {
      healthCheck.checks.trie = {
        status: 'unhealthy',
        error: 'Trie not initialized'
      };
      healthCheck.status = 'DEGRADED';
    }

    // Check MongoDB status
    try {
      const mongoHealth = await mongoDBService.healthCheck();
      healthCheck.checks.mongodb = mongoHealth;
      
      if (mongoHealth.status !== 'healthy' && mongoHealth.status !== 'disconnected') {
        healthCheck.status = 'DEGRADED';
      }
    } catch (error) {
      healthCheck.checks.mongodb = {
        status: 'error',
        error: error.message
      };
      healthCheck.status = 'DEGRADED';
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    healthCheck.checks.memory = {
      status: 'healthy',
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    };

    // Check performance monitor
    const performanceMonitor = req.app.locals.performanceMonitor;
    if (performanceMonitor) {
      const perfStats = performanceMonitor.getStats();
      healthCheck.checks.performance = {
        status: 'healthy',
        totalRequests: perfStats.totalRequests,
        averageResponseTime: `${perfStats.averageResponseTime}ms`,
        errorRate: `${perfStats.errorRate}%`
      };
    }

    // Check cache service
    const cacheService = req.app.locals.cacheService;
    if (cacheService) {
      const cacheStats = cacheService.getStats();
      healthCheck.checks.cache = {
        status: 'healthy',
        size: cacheStats.size,
        hitRate: `${cacheStats.hitRate}%`,
        maxSize: cacheStats.maxSize
      };
    }

    // Calculate response time
    healthCheck.responseTime = `${Date.now() - startTime}ms`;

    // Determine overall status
    const unhealthyChecks = Object.values(healthCheck.checks)
      .filter(check => check.status === 'unhealthy' || check.status === 'error');
    
    if (unhealthyChecks.length > 0) {
      healthCheck.status = unhealthyChecks.length === Object.keys(healthCheck.checks).length 
        ? 'UNHEALTHY' 
        : 'DEGRADED';
    }

    const statusCode = healthCheck.status === 'OK' ? 200 : 
                      healthCheck.status === 'DEGRADED' ? 200 : 503;

    res.status(statusCode).json(healthCheck);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});

/**
 * Readiness probe endpoint
 * Checks if application is ready to serve traffic
 */
router.get('/ready', async (req, res) => {
  try {
    const trie = req.app.locals.trie;
    
    if (!trie) {
      return res.status(503).json({
        status: 'NOT_READY',
        message: 'Trie not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const trieStats = trie.getStats();
    if (trieStats.wordCount === 0) {
      return res.status(503).json({
        status: 'NOT_READY',
        message: 'No data loaded in Trie',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      status: 'READY',
      message: 'Application ready to serve traffic',
      timestamp: new Date().toISOString(),
      wordCount: trieStats.wordCount
    });

  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness probe endpoint
 * Checks if application is alive (basic functionality)
 */
router.get('/live', (req, res) => {
  try {
    // Basic liveness check - if we can respond, we're alive
    res.status(200).json({
      status: 'ALIVE',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid
    });
  } catch (error) {
    res.status(503).json({
      status: 'DEAD',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Startup probe endpoint
 * Checks if application has completed startup
 */
router.get('/startup', (req, res) => {
  try {
    const trie = req.app.locals.trie;
    const datasetLoader = req.app.locals.datasetLoader;
    
    const isStarted = trie && datasetLoader;
    
    if (isStarted) {
      res.status(200).json({
        status: 'STARTED',
        message: 'Application startup completed',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'STARTING',
        message: 'Application still starting up',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'STARTUP_FAILED',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Database health check endpoint
 */
router.get('/database', async (req, res) => {
  try {
    const mongoHealth = await mongoDBService.healthCheck();
    
    const statusCode = mongoHealth.status === 'healthy' ? 200 : 
                      mongoHealth.status === 'disconnected' ? 200 : 503;
    
    res.status(statusCode).json(mongoHealth);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * System metrics endpoint
 */
router.get('/metrics', (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    // Add Trie metrics if available
    const trie = req.app.locals.trie;
    if (trie) {
      metrics.trie = trie.getStats();
    }

    // Add performance metrics if available
    const performanceMonitor = req.app.locals.performanceMonitor;
    if (performanceMonitor) {
      metrics.performance = performanceMonitor.getStats();
    }

    // Add cache metrics if available
    const cacheService = req.app.locals.cacheService;
    if (cacheService) {
      metrics.cache = cacheService.getStats();
    }

    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;