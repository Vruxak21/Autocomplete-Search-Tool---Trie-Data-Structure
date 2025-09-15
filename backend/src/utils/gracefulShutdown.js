/**
 * Graceful Shutdown Handler
 * Manages clean application shutdown with proper resource cleanup
 */

const mongoDBService = require('../services/MongoDBService');

/**
 * Graceful shutdown manager
 */
class GracefulShutdown {
  constructor() {
    this.isShuttingDown = false;
    this.shutdownTimeout = 10000; // 10 seconds
    this.resources = new Map();
    this.server = null;
  }

  /**
   * Register a resource for cleanup during shutdown
   * @param {string} name - Resource name
   * @param {Function} cleanupFn - Cleanup function
   * @param {number} priority - Cleanup priority (lower = earlier)
   */
  registerResource(name, cleanupFn, priority = 100) {
    this.resources.set(name, {
      cleanup: cleanupFn,
      priority,
      name
    });
    console.log(`[SHUTDOWN] Registered resource: ${name} (priority: ${priority})`);
  }

  /**
   * Register the HTTP server for graceful shutdown
   * @param {Server} server - Express/HTTP server instance
   */
  registerServer(server) {
    this.server = server;
    console.log('[SHUTDOWN] Registered HTTP server');
  }

  /**
   * Initialize shutdown handlers for various signals
   */
  init() {
    // Handle different shutdown signals
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        console.log(`[SHUTDOWN] Received ${signal}, initiating graceful shutdown...`);
        this.shutdown(signal);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[SHUTDOWN] Uncaught Exception:', error);
      this.shutdown('uncaughtException', 1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[SHUTDOWN] Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown('unhandledRejection', 1);
    });

    console.log('[SHUTDOWN] Graceful shutdown handlers initialized');
  }

  /**
   * Perform graceful shutdown
   * @param {string} signal - Signal that triggered shutdown
   * @param {number} exitCode - Exit code (default: 0)
   */
  async shutdown(signal = 'manual', exitCode = 0) {
    if (this.isShuttingDown) {
      console.log('[SHUTDOWN] Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    const startTime = Date.now();
    
    console.log(`[SHUTDOWN] Starting graceful shutdown (signal: ${signal})`);

    try {
      // Set a timeout for the entire shutdown process
      const shutdownPromise = this.performShutdown();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Shutdown timeout after ${this.shutdownTimeout}ms`));
        }, this.shutdownTimeout);
      });

      await Promise.race([shutdownPromise, timeoutPromise]);
      
      const duration = Date.now() - startTime;
      console.log(`[SHUTDOWN] Graceful shutdown completed in ${duration}ms`);
      
    } catch (error) {
      console.error('[SHUTDOWN] Error during shutdown:', error.message);
      exitCode = 1;
    }

    console.log(`[SHUTDOWN] Exiting with code ${exitCode}`);
    process.exit(exitCode);
  }

  /**
   * Perform the actual shutdown steps
   */
  async performShutdown() {
    const shutdownSteps = [];

    // Step 1: Stop accepting new connections
    if (this.server) {
      shutdownSteps.push({
        name: 'http-server',
        priority: 10,
        cleanup: () => this.shutdownServer()
      });
    }

    // Step 2: Add registered resources
    for (const resource of this.resources.values()) {
      shutdownSteps.push(resource);
    }

    // Step 3: Close database connections
    shutdownSteps.push({
      name: 'mongodb',
      priority: 90,
      cleanup: () => this.shutdownMongoDB()
    });

    // Sort by priority (lower priority = earlier execution)
    shutdownSteps.sort((a, b) => a.priority - b.priority);

    // Execute shutdown steps
    for (const step of shutdownSteps) {
      try {
        console.log(`[SHUTDOWN] Cleaning up: ${step.name}`);
        const startTime = Date.now();
        
        await Promise.resolve(step.cleanup());
        
        const duration = Date.now() - startTime;
        console.log(`[SHUTDOWN] ✓ ${step.name} cleaned up in ${duration}ms`);
        
      } catch (error) {
        console.error(`[SHUTDOWN] ✗ Error cleaning up ${step.name}:`, error.message);
      }
    }
  }

  /**
   * Shutdown HTTP server
   */
  async shutdownServer() {
    if (!this.server) return;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server shutdown timeout'));
      }, 5000);

      this.server.close((error) => {
        clearTimeout(timeout);
        if (error) {
          reject(error);
        } else {
          console.log('[SHUTDOWN] HTTP server closed');
          resolve();
        }
      });
    });
  }

  /**
   * Shutdown MongoDB connection
   */
  async shutdownMongoDB() {
    try {
      if (mongoDBService.isConnectedToMongoDB()) {
        await mongoDBService.disconnect();
        console.log('[SHUTDOWN] MongoDB connection closed');
      }
    } catch (error) {
      console.error('[SHUTDOWN] Error closing MongoDB connection:', error.message);
      throw error;
    }
  }

  /**
   * Force shutdown after timeout
   */
  forceShutdown() {
    console.log('[SHUTDOWN] Force shutdown initiated');
    process.exit(1);
  }
}

// Create singleton instance
const gracefulShutdown = new GracefulShutdown();

module.exports = gracefulShutdown;