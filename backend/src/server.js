const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// Import configuration and utilities
const { config } = require('./config/environment');
const gracefulShutdown = require('./utils/gracefulShutdown');
const { ApplicationBootstrap } = require('../scripts/bootstrap');

// Import services
const CacheService = require('./services/CacheService');
const PerformanceMonitor = require('./middleware/performanceMonitoring');

// Import routes
const { searchRoutes, trieRoutes } = require('./routes');
const performanceRoutes = require('./routes/performance');
const healthRoutes = require('./routes/health');

const app = express();

/**
 * Application startup and initialization
 */
async function startApplication() {
  try {
    console.log('[SERVER] Starting application...');
    
    // Load and validate configuration
    const appConfig = config.load();
    console.log('[SERVER] Configuration loaded successfully');

    // Initialize services
    const performanceMonitor = new PerformanceMonitor();
    const cacheService = new CacheService({
      maxSize: appConfig.CACHE_MAX_SIZE,
      ttl: appConfig.CACHE_TTL
    });

    // Store services in app locals for route access
    app.locals.performanceMonitor = performanceMonitor;
    app.locals.cacheService = cacheService;
    app.locals.config = appConfig;

    // Configure middleware
    app.use(helmet({
      contentSecurityPolicy: appConfig.NODE_ENV === 'production' ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      } : false,
      hsts: appConfig.NODE_ENV === 'production' ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      } : false
    }));
    
    app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));
    
    app.use(cors({
      origin: appConfig.CORS_ORIGIN || appConfig.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      maxAge: 86400 // 24 hours
    }));
    
    app.use(express.json({ 
      limit: appConfig.MAX_REQUEST_SIZE,
      strict: true
    }));
    app.use(express.urlencoded({ 
      extended: true, 
      limit: appConfig.MAX_REQUEST_SIZE,
      parameterLimit: 100
    }));

    // Performance monitoring middleware
    app.use(performanceMonitor.middleware());

    // Bootstrap application (load datasets, initialize Trie, etc.)
    console.log('[SERVER] Running application bootstrap...');
    const bootstrap = new ApplicationBootstrap();
    const bootstrapResult = await bootstrap.bootstrap();

    if (!bootstrapResult.success) {
      throw new Error(`Bootstrap failed: ${bootstrapResult.error}`);
    }

    // Store bootstrap results in app locals
    app.locals.trie = bootstrapResult.trie;
    app.locals.datasetLoader = bootstrapResult.datasetLoader;
    app.locals.mongoConnected = bootstrapResult.mongoConnected;
    app.locals.bootstrapSummary = bootstrapResult.summary;

    console.log('[SERVER] Application bootstrap completed successfully');
    return appConfig;

  } catch (error) {
    console.error('[SERVER] Failed to start application:', error.message);
    throw error;
  }
}

/**
 * Configure routes
 */
function configureRoutes() {
  // Health check routes (must be first for load balancers)
  app.use('/health', healthRoutes);
  
  // Serve static files in production
  if (app.locals.config.NODE_ENV === 'production') {
    const staticPath = path.join(__dirname, '../../frontend/dist');
    if (require('fs').existsSync(staticPath)) {
      app.use(express.static(staticPath, {
        maxAge: '1y',
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        }
      }));
      console.log('[SERVER] Serving static files from:', staticPath);
    }
  }
  
  // API routes
  app.use('/api', searchRoutes);
  app.use('/api/trie', trieRoutes);
  app.use('/api/performance', performanceRoutes);

  // Error handling middleware
  app.use((err, req, res, _next) => {
    console.error('[SERVER] Request error:', err.stack);
    
    const isDevelopment = app.locals.config?.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
      error: 'Something went wrong!',
      message: isDevelopment ? err.message : 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    });
  });

  // 404 handler - serve index.html for client-side routing in production
  app.use('*', (req, res) => {
    if (app.locals.config.NODE_ENV === 'production' && !req.originalUrl.startsWith('/api')) {
      const indexPath = path.join(__dirname, '../../frontend/dist/index.html');
      if (require('fs').existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    
    res.status(404).json({ 
      error: 'Route not found',
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  });
}

/**
 * Start the HTTP server
 */
async function startServer(appConfig) {
  return new Promise((resolve, reject) => {
    const server = app.listen(appConfig.PORT, appConfig.HOST, (error) => {
      if (error) {
        reject(error);
        return;
      }

      console.log(`[SERVER] Server running on ${appConfig.HOST}:${appConfig.PORT}`);
      console.log(`[SERVER] Environment: ${appConfig.NODE_ENV}`);
      console.log(`[SERVER] Health check: http://localhost:${appConfig.PORT}/health`);
      console.log(`[SERVER] Search API: http://localhost:${appConfig.PORT}/api/search?query=<your-query>`);
      console.log(`[SERVER] Trie structure: http://localhost:${appConfig.PORT}/api/trie/structure`);
      
      resolve(server);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[SERVER] Port ${appConfig.PORT} is already in use`);
      } else {
        console.error('[SERVER] Server error:', error);
      }
      reject(error);
    });
  });
}

/**
 * Main application entry point
 */
async function main() {
  let server = null;
  
  try {
    // Start application
    const appConfig = await startApplication();
    
    // Configure routes
    configureRoutes();
    
    // Start HTTP server
    server = await startServer(appConfig);
    
    // Setup graceful shutdown
    gracefulShutdown.registerServer(server);
    gracefulShutdown.init();
    
    // Register cleanup resources
    gracefulShutdown.registerResource('cache', async () => {
      const cacheService = app.locals.cacheService;
      if (cacheService && typeof cacheService.clear === 'function') {
        cacheService.clear();
        console.log('[SHUTDOWN] Cache cleared');
      }
    }, 50);

    gracefulShutdown.registerResource('performance-monitor', async () => {
      const performanceMonitor = app.locals.performanceMonitor;
      if (performanceMonitor && typeof performanceMonitor.stop === 'function') {
        performanceMonitor.stop();
        console.log('[SHUTDOWN] Performance monitor stopped');
      }
    }, 60);

    console.log('[SERVER] Application started successfully');
    
  } catch (error) {
    console.error('[SERVER] Failed to start application:', error.message);
    
    if (server) {
      server.close();
    }
    
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main().catch(error => {
    console.error('[SERVER] Unhandled error during startup:', error);
    process.exit(1);
  });
}

module.exports = app;
