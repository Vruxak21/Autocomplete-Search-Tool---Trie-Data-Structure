/**
 * Performance Monitoring Middleware
 * Tracks response times, memory usage, and request metrics
 */

const os = require('os');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byEndpoint: new Map(),
        byStatus: new Map(),
        responseTimeHistogram: []
      },
      memory: {
        samples: [],
        maxSamples: 100
      },
      trie: {
        operationTimes: [],
        maxSamples: 1000
      }
    };
    
    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  /**
   * Express middleware for request/response monitoring
   */
  middleware() {
    return (req, res, next) => {
      const startTime = process.hrtime.bigint();
      const startMemory = process.memoryUsage();
      
      // Track request start
      this.metrics.requests.total++;
      
      // Override res.end to capture response metrics
      const originalEnd = res.end;
      res.end = (...args) => {
        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        
        // Calculate response time in milliseconds
        const responseTime = Number(endTime - startTime) / 1000000;
        
        // Track metrics
        this.recordRequest({
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime,
          memoryDelta: {
            rss: endMemory.rss - startMemory.rss,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal
          },
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        });
        
        // Add performance headers
        res.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
        res.set('X-Memory-Usage', `${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
        
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }

  /**
   * Record request metrics
   */
  recordRequest(metrics) {
    const { path, statusCode, responseTime } = metrics;
    
    // Track by endpoint
    const endpointKey = `${metrics.method} ${path}`;
    if (!this.metrics.requests.byEndpoint.has(endpointKey)) {
      this.metrics.requests.byEndpoint.set(endpointKey, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0
      });
    }
    
    const endpointStats = this.metrics.requests.byEndpoint.get(endpointKey);
    endpointStats.count++;
    endpointStats.totalTime += responseTime;
    endpointStats.avgTime = endpointStats.totalTime / endpointStats.count;
    endpointStats.minTime = Math.min(endpointStats.minTime, responseTime);
    endpointStats.maxTime = Math.max(endpointStats.maxTime, responseTime);
    
    if (statusCode >= 400) {
      endpointStats.errors++;
    }
    
    // Track by status code
    if (!this.metrics.requests.byStatus.has(statusCode)) {
      this.metrics.requests.byStatus.set(statusCode, 0);
    }
    this.metrics.requests.byStatus.set(statusCode, 
      this.metrics.requests.byStatus.get(statusCode) + 1);
    
    // Add to response time histogram (keep last 1000 requests)
    this.metrics.requests.responseTimeHistogram.push({
      responseTime,
      timestamp: metrics.timestamp,
      endpoint: endpointKey,
      statusCode
    });
    
    if (this.metrics.requests.responseTimeHistogram.length > 1000) {
      this.metrics.requests.responseTimeHistogram.shift();
    }
    
    // Log slow requests (>100ms)
    if (responseTime > 100) {
      console.warn(`Slow request detected: ${endpointKey} - ${responseTime.toFixed(2)}ms`);
    }
  }

  /**
   * Record Trie operation performance
   */
  recordTrieOperation(operation, duration, metadata = {}) {
    const record = {
      operation,
      duration,
      timestamp: new Date(),
      ...metadata
    };
    
    this.metrics.trie.operationTimes.push(record);
    
    // Keep only last 1000 operations
    if (this.metrics.trie.operationTimes.length > this.metrics.trie.maxSamples) {
      this.metrics.trie.operationTimes.shift();
    }
    
    // Log slow Trie operations (>50ms)
    if (duration > 50) {
      console.warn(`Slow Trie operation: ${operation} - ${duration.toFixed(2)}ms`, metadata);
    }
  }

  /**
   * Start periodic memory monitoring
   */
  startMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const systemMem = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      };
      
      const sample = {
        timestamp: new Date(),
        process: {
          rss: memUsage.rss,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers
        },
        system: systemMem,
        cpu: os.loadavg()
      };
      
      this.metrics.memory.samples.push(sample);
      
      // Keep only last 100 samples
      if (this.metrics.memory.samples.length > this.metrics.memory.maxSamples) {
        this.metrics.memory.samples.shift();
      }
      
      // Check for memory leaks (heap growth over time)
      if (this.metrics.memory.samples.length >= 10) {
        const recent = this.metrics.memory.samples.slice(-10);
        const oldestHeap = recent[0].process.heapUsed;
        const newestHeap = recent[recent.length - 1].process.heapUsed;
        const growth = newestHeap - oldestHeap;
        
        // Alert if heap grew by more than 50MB in last 10 samples
        if (growth > 50 * 1024 * 1024) {
          console.warn(`Potential memory leak detected: heap grew by ${(growth / 1024 / 1024).toFixed(2)}MB`);
        }
      }
      
    }, 5000); // Sample every 5 seconds
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    const currentMemory = process.memoryUsage();
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      uptime: os.uptime(),
      nodeVersion: process.version
    };
    
    // Calculate percentiles for response times
    const responseTimes = this.metrics.requests.responseTimeHistogram
      .map(r => r.responseTime)
      .sort((a, b) => a - b);
    
    const percentiles = {};
    if (responseTimes.length > 0) {
      percentiles.p50 = this.calculatePercentile(responseTimes, 50);
      percentiles.p90 = this.calculatePercentile(responseTimes, 90);
      percentiles.p95 = this.calculatePercentile(responseTimes, 95);
      percentiles.p99 = this.calculatePercentile(responseTimes, 99);
    }
    
    return {
      requests: {
        total: this.metrics.requests.total,
        endpoints: Object.fromEntries(this.metrics.requests.byEndpoint),
        statusCodes: Object.fromEntries(this.metrics.requests.byStatus),
        responseTimePercentiles: percentiles,
        recentRequests: this.metrics.requests.responseTimeHistogram.slice(-20)
      },
      memory: {
        current: currentMemory,
        samples: this.metrics.memory.samples.slice(-20), // Last 20 samples
        trend: this.calculateMemoryTrend()
      },
      trie: {
        recentOperations: this.metrics.trie.operationTimes.slice(-20),
        operationStats: this.calculateTrieOperationStats()
      },
      system: systemInfo,
      timestamp: new Date()
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  calculatePercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Calculate memory usage trend
   */
  calculateMemoryTrend() {
    if (this.metrics.memory.samples.length < 2) {
      return { trend: 'stable', change: 0 };
    }
    
    const recent = this.metrics.memory.samples.slice(-10);
    const oldest = recent[0].process.heapUsed;
    const newest = recent[recent.length - 1].process.heapUsed;
    const change = newest - oldest;
    const changePercent = (change / oldest) * 100;
    
    let trend = 'stable';
    if (changePercent > 10) trend = 'increasing';
    else if (changePercent < -10) trend = 'decreasing';
    
    return {
      trend,
      change: change / 1024 / 1024, // MB
      changePercent: changePercent.toFixed(2)
    };
  }

  /**
   * Calculate Trie operation statistics
   */
  calculateTrieOperationStats() {
    if (this.metrics.trie.operationTimes.length === 0) {
      return {};
    }
    
    const operations = {};
    
    for (const record of this.metrics.trie.operationTimes) {
      if (!operations[record.operation]) {
        operations[record.operation] = {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          minTime: Infinity,
          maxTime: 0
        };
      }
      
      const op = operations[record.operation];
      op.count++;
      op.totalTime += record.duration;
      op.avgTime = op.totalTime / op.count;
      op.minTime = Math.min(op.minTime, record.duration);
      op.maxTime = Math.max(op.maxTime, record.duration);
    }
    
    return operations;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        byEndpoint: new Map(),
        byStatus: new Map(),
        responseTimeHistogram: []
      },
      memory: {
        samples: [],
        maxSamples: 100
      },
      trie: {
        operationTimes: [],
        maxSamples: 1000
      }
    };
  }
}

module.exports = PerformanceMonitor;