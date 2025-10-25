// Enterprise Caching System
const NodeCache = require('node-cache');

class EnterpriseCache {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 30, // 30 seconds default TTL
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false,
      maxKeys: 1000
    });
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  // Get value from cache
  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return null;
  }

  // Set value in cache
  set(key, value, ttl = null) {
    const success = ttl ? this.cache.set(key, value, ttl) : this.cache.set(key, value);
    if (success) {
      this.stats.sets++;
    }
    return success;
  }

  // Delete value from cache
  del(key) {
    const success = this.cache.del(key);
    if (success) {
      this.stats.deletes++;
    }
    return success;
  }

  // Clear all cache
  flush() {
    this.cache.flushAll();
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  // Get cache statistics
  getStats() {
    const keys = this.cache.keys();
    return {
      ...this.stats,
      totalKeys: keys.length,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  // Get all keys
  keys() {
    return this.cache.keys();
  }

  // Check if key exists
  has(key) {
    return this.cache.has(key);
  }
}

// Create singleton instances for different data types
const marketCache = new EnterpriseCache();
const signalsCache = new EnterpriseCache();
const tokenCache = new EnterpriseCache();
const portfolioCache = new EnterpriseCache();

module.exports = {
  marketCache,
  signalsCache,
  tokenCache,
  portfolioCache,
  EnterpriseCache
};
