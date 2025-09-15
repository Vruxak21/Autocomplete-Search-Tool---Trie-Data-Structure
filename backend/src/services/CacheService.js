/**
 * Cache Service for frequent search queries
 * Implements LRU cache with TTL support for search results
 */

class CacheService {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default TTL
    this.cache = new Map();
    this.accessOrder = new Map(); // Track access order for LRU
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      totalRequests: 0
    };
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Generate cache key from search parameters
   */
  generateKey(query, limit = 5, typoTolerance = false) {
    return `${query.toLowerCase().trim()}:${limit}:${typoTolerance}`;
  }

  /**
   * Get cached search results
   */
  get(query, limit, typoTolerance) {
    const key = this.generateKey(query, limit, typoTolerance);
    this.stats.totalRequests++;
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Update access order for LRU
    this.accessOrder.delete(key);
    this.accessOrder.set(key, Date.now());
    
    this.stats.hits++;
    return {
      ...entry.data,
      cached: true,
      cacheHit: true,
      cachedAt: entry.cachedAt
    };
  }

  /**
   * Cache search results
   */
  set(query, limit, typoTolerance, data) {
    const key = this.generateKey(query, limit, typoTolerance);
    
    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    const entry = {
      data: { ...data, cached: false, cacheHit: false },
      cachedAt: new Date(),
      expiresAt: Date.now() + this.ttl,
      accessCount: 1
    };
    
    this.cache.set(key, entry);
    this.accessOrder.set(key, Date.now());
    this.stats.sets++;
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    if (this.accessOrder.size === 0) return;
    
    // Find the oldest accessed key
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        expiredCount++;
      }
    }
    
    return expiredCount;
  }

  /**
   * Start periodic cleanup of expired entries
   */
  startCleanupInterval() {
    // Don't start cleanup interval in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    
    this.cleanupInterval = setInterval(() => {
      const expiredCount = this.clearExpired();
      if (expiredCount > 0) {
        console.log(`Cache cleanup: removed ${expiredCount} expired entries`);
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidate(pattern) {
    let invalidatedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern.toLowerCase())) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        invalidatedCount++;
      }
    }
    
    return invalidatedCount;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder.clear();
    return size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests * 100).toFixed(2)
      : 0;
    
    const missRate = this.stats.totalRequests > 0
      ? (this.stats.misses / this.stats.totalRequests * 100).toFixed(2)
      : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      missRate: `${missRate}%`,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      evictions: this.stats.evictions,
      totalRequests: this.stats.totalRequests,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage of cache
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache) {
      // Rough estimation of memory usage
      totalSize += key.length * 2; // String characters (UTF-16)
      totalSize += JSON.stringify(entry).length * 2;
    }
    
    return {
      estimated: `${(totalSize / 1024).toFixed(2)} KB`,
      entries: this.cache.size
    };
  }

  /**
   * Get cache contents for debugging
   */
  getContents(limit = 10) {
    const entries = [];
    let count = 0;
    
    for (const [key, entry] of this.cache) {
      if (count >= limit) break;
      
      entries.push({
        key,
        cachedAt: entry.cachedAt,
        expiresAt: new Date(entry.expiresAt),
        accessCount: entry.accessCount,
        dataSize: JSON.stringify(entry.data).length
      });
      
      count++;
    }
    
    return entries;
  }

  /**
   * Warm up cache with common queries
   */
  warmUp(commonQueries, searchFunction) {
    console.log(`Warming up cache with ${commonQueries.length} common queries...`);
    
    const promises = commonQueries.map(async (queryConfig) => {
      try {
        const { query, limit = 5, typoTolerance = false } = queryConfig;
        const results = await searchFunction(query, limit, typoTolerance);
        this.set(query, limit, typoTolerance, results);
      } catch (error) {
        console.warn(`Failed to warm up cache for query "${queryConfig.query}":`, error.message);
      }
    });
    
    return Promise.allSettled(promises);
  }

  /**
   * Get most popular cached queries
   */
  getPopularQueries(limit = 10) {
    const queries = [];
    
    for (const [key, entry] of this.cache) {
      const [query] = key.split(':');
      queries.push({
        query,
        accessCount: entry.accessCount,
        cachedAt: entry.cachedAt,
        lastAccess: this.accessOrder.get(key)
      });
    }
    
    return queries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig) {
    const oldConfig = {
      maxSize: this.maxSize,
      ttl: this.ttl
    };
    
    if (newConfig.maxSize !== undefined) {
      this.maxSize = newConfig.maxSize;
      
      // Evict entries if new max size is smaller
      while (this.cache.size > this.maxSize) {
        this.evictLRU();
      }
    }
    
    if (newConfig.ttl !== undefined) {
      this.ttl = newConfig.ttl;
    }
    
    return {
      oldConfig,
      newConfig: {
        maxSize: this.maxSize,
        ttl: this.ttl
      }
    };
  }
}

module.exports = CacheService;