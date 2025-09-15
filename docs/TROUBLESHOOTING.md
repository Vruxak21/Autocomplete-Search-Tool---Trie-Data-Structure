# Troubleshooting Guide

## Table of Contents

- [Common Issues](#common-issues)
- [Installation Problems](#installation-problems)
- [Runtime Errors](#runtime-errors)
- [Performance Issues](#performance-issues)
- [Database Problems](#database-problems)
- [Frontend Issues](#frontend-issues)
- [API Errors](#api-errors)
- [Debugging Tools](#debugging-tools)
- [Log Analysis](#log-analysis)
- [Getting Help](#getting-help)

## Common Issues

### 1. Application Won't Start

#### Symptoms:
- Server fails to start
- "Port already in use" error
- "Cannot find module" errors
- Process exits immediately

#### Diagnosis:
```bash
# Check if ports are in use
netstat -tulpn | grep :3001
netstat -tulpn | grep :5173

# Check Node.js version
node --version
npm --version

# Verify dependencies
npm list --depth=0
```

#### Solutions:

**Port Already in Use:**
```bash
# Kill process using port 3001
lsof -ti:3001 | xargs kill -9

# Or use different port
PORT=3002 npm run dev
```

**Missing Dependencies:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Install specific missing modules
npm install express mongodb cors
```

**Node.js Version Issues:**
```bash
# Check required version (should be 18+)
node --version

# Update Node.js using nvm
nvm install 18
nvm use 18
```

### 2. MongoDB Connection Failed

#### Symptoms:
- "MongoNetworkError" in logs
- "ECONNREFUSED" errors
- Backend starts but database operations fail
- Timeout errors during startup

#### Diagnosis:
```bash
# Check MongoDB status
sudo systemctl status mongod

# Test connection manually
mongo mongodb://localhost:27017/autocomplete_search

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

#### Solutions:

**MongoDB Not Running:**
```bash
# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# For macOS with Homebrew
brew services start mongodb-community
```

**Connection String Issues:**
```bash
# Verify connection string in .env
echo $MONGODB_URI

# Test with different connection string
MONGODB_URI=mongodb://127.0.0.1:27017/autocomplete_search npm run dev
```

**Authentication Problems:**
```bash
# Create database user if needed
mongo admin --eval "
  db.createUser({
    user: 'autocomplete_user',
    pwd: 'your_password',
    roles: [{ role: 'readWrite', db: 'autocomplete_search' }]
  })
"

# Update connection string with credentials
MONGODB_URI=mongodb://autocomplete_user:your_password@localhost:27017/autocomplete_search
```

### 3. Search Returns No Results

#### Symptoms:
- Empty suggestions array
- "No suggestions found" message
- API returns 200 but no data
- Trie appears empty

#### Diagnosis:
```bash
# Check if data is loaded
curl http://localhost:3001/api/search/stats

# Test with known data
curl "http://localhost:3001/api/search?query=a"

# Check Trie structure
curl http://localhost:3001/api/trie/structure
```

#### Solutions:

**Data Not Loaded:**
```bash
# Load sample data
npm run seed

# Load specific dataset
npm run seed:cities
npm run seed:products

# Force reload data
npm run seed:reset
```

**Dataset File Issues:**
```bash
# Check if dataset files exist
ls -la data/

# Verify file format
head -5 data/worldcities.csv
file data/worldcities.csv
```

**Trie Initialization Problems:**
```bash
# Check server logs for initialization errors
tail -f logs/backend.log

# Restart with debug logging
DEBUG=autocomplete:* npm run dev
```

### 4. Slow Performance

#### Symptoms:
- Response times > 100ms
- Timeout errors
- High CPU usage
- Memory warnings

#### Diagnosis:
```bash
# Check performance metrics
curl http://localhost:3001/api/search/stats

# Monitor system resources
top -p $(pgrep node)
htop

# Check memory usage
node -e "console.log(process.memoryUsage())"
```

#### Solutions:

**Large Dataset Issues:**
```bash
# Use smaller dataset for testing
npm run seed:sample

# Limit search results
curl "http://localhost:3001/api/search?query=test&limit=3"

# Enable caching
# Set CACHE_TTL=300 in .env file
```

**Memory Problems:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Clear cache and restart
npm run cache:clear
npm run dev
```

**Database Performance:**
```bash
# Check MongoDB performance
mongo autocomplete_search --eval "db.stats()"

# Create indexes if needed
mongo autocomplete_search --eval "db.trie_backup.createIndex({nodeId: 1})"
```

## Installation Problems

### Node.js and npm Issues

#### Problem: npm install fails
```bash
# Clear npm cache
npm cache clean --force

# Delete lock file and node_modules
rm -rf node_modules package-lock.json

# Reinstall with verbose logging
npm install --verbose

# Use different registry if needed
npm install --registry https://registry.npmjs.org/
```

#### Problem: Permission errors on Linux/macOS
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Or use nvm to avoid permission issues
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### MongoDB Installation Issues

#### Problem: MongoDB won't install
**Ubuntu/Debian:**
```bash
# Add MongoDB repository
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
```

**macOS:**
```bash
# Install using Homebrew
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0
```

**Windows:**
```bash
# Download installer from MongoDB website
# https://www.mongodb.com/try/download/community
# Run as administrator
```

### Environment Configuration

#### Problem: Environment variables not loading
```bash
# Check if .env file exists
ls -la .env backend/.env

# Verify file format (no spaces around =)
cat .env | grep -v "^#" | grep "="

# Test environment loading
node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI)"
```

## Runtime Errors

### JavaScript Errors

#### Problem: "Cannot read property of undefined"
```javascript
// Add defensive programming
const suggestions = trie?.search(query) || [];
const results = suggestions.map(s => s?.word).filter(Boolean);

// Use optional chaining
const frequency = node?.frequency ?? 0;
```

#### Problem: Memory leaks
```javascript
// Check for event listener leaks
process.on('warning', (warning) => {
  console.warn(warning.name);
  console.warn(warning.message);
  console.warn(warning.stack);
});

// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  console.log(`Memory usage: ${Math.round(usage.heapUsed / 1024 / 1024)} MB`);
}, 30000);
```

### API Errors

#### Problem: CORS errors
```javascript
// Update CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### Problem: Request validation errors
```javascript
// Add better error handling
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON'
    });
  }
  next(error);
});
```

## Performance Issues

### High CPU Usage

#### Diagnosis:
```bash
# Profile Node.js application
node --prof src/server.js

# Generate profile report
node --prof-process isolate-*.log > profile.txt

# Use clinic.js for detailed profiling
npm install -g clinic
clinic doctor -- node src/server.js
```

#### Solutions:
```javascript
// Optimize Trie operations
class OptimizedTrie {
  search(prefix, limit = 5) {
    // Early termination for empty queries
    if (!prefix || prefix.length === 0) {
      return [];
    }
    
    // Cache frequent searches
    const cacheKey = `${prefix}:${limit}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const results = this.performSearch(prefix, limit);
    this.cache.set(cacheKey, results);
    return results;
  }
}
```

### High Memory Usage

#### Diagnosis:
```bash
# Generate heap snapshot
node --inspect src/server.js
# Open chrome://inspect in Chrome browser

# Use heapdump for analysis
npm install heapdump
node -r heapdump src/server.js
```

#### Solutions:
```javascript
// Implement object pooling
class NodePool {
  constructor() {
    this.pool = [];
  }
  
  acquire() {
    return this.pool.pop() || new TrieNode();
  }
  
  release(node) {
    node.reset();
    this.pool.push(node);
  }
}

// Use WeakMap for caching
const cache = new WeakMap();
```

### Database Performance

#### Problem: Slow queries
```javascript
// Add query optimization
db.collection.createIndex({ "nodeId": 1 });
db.collection.createIndex({ "word": 1, "frequency": -1 });

// Use aggregation pipeline for complex queries
const pipeline = [
  { $match: { prefix: new RegExp(`^${query}`) } },
  { $sort: { frequency: -1 } },
  { $limit: limit }
];
```

## Database Problems

### Connection Pool Exhaustion

#### Symptoms:
- "MongoServerSelectionError"
- "connection pool destroyed" errors
- Intermittent connection failures

#### Solutions:
```javascript
// Optimize connection pool settings
const mongoOptions = {
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true
};
```

### Data Corruption

#### Problem: Inconsistent data in Trie
```bash
# Backup current data
mongodump --db autocomplete_search --out backup/

# Verify data integrity
node scripts/verify-data-integrity.js

# Rebuild Trie from scratch
npm run seed:reset
```

### Index Issues

#### Problem: Slow database queries
```javascript
// Create necessary indexes
db.trie_backup.createIndex({ "nodeId": 1 }, { unique: true });
db.trie_backup.createIndex({ "parentId": 1 });
db.search_analytics.createIndex({ "timestamp": -1 });
db.search_analytics.createIndex({ "query": 1, "timestamp": -1 });
```

## Frontend Issues

### React Component Errors

#### Problem: Component won't render
```javascript
// Add error boundaries
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Component error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh the page.</div>;
    }
    return this.props.children;
  }
}
```

### Build Issues

#### Problem: Vite build fails
```bash
# Clear Vite cache
rm -rf node_modules/.vite
rm -rf dist

# Rebuild with verbose output
npm run build -- --debug

# Check for TypeScript errors
npx tsc --noEmit
```

### Browser Compatibility

#### Problem: Application doesn't work in older browsers
```javascript
// Add polyfills for older browsers
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Check browser support
if (!window.fetch) {
  console.error('Browser not supported. Please use a modern browser.');
}
```

## API Errors

### Rate Limiting Issues

#### Problem: 429 Too Many Requests
```bash
# Check rate limit headers
curl -I http://localhost:3001/api/search?query=test

# Adjust rate limiting
# In backend configuration:
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=2000       # 2000 requests per window
```

### Validation Errors

#### Problem: 400 Bad Request responses
```javascript
// Add better validation error handling
const { validationResult } = require('express-validator');

app.use((req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
});
```

## Debugging Tools

### Backend Debugging

#### Enable Debug Logging:
```bash
# Enable all debug logs
DEBUG=* npm run dev

# Enable specific modules
DEBUG=autocomplete:* npm run dev
DEBUG=autocomplete:trie,autocomplete:search npm run dev
```

#### Node.js Inspector:
```bash
# Start with inspector
node --inspect src/server.js

# Start with inspector and break on start
node --inspect-brk src/server.js

# Connect with Chrome DevTools
# Open chrome://inspect in Chrome
```

#### Performance Profiling:
```bash
# CPU profiling
node --prof src/server.js

# Memory profiling
node --inspect --max-old-space-size=4096 src/server.js
```

### Frontend Debugging

#### React Developer Tools:
```bash
# Install React DevTools browser extension
# Available for Chrome, Firefox, and Edge
```

#### Browser Console Debugging:
```javascript
// Add debug information to window object
if (process.env.NODE_ENV === 'development') {
  window.debugInfo = {
    searchHistory: [],
    performanceMetrics: {},
    apiCalls: []
  };
}
```

### Database Debugging

#### MongoDB Profiling:
```javascript
// Enable MongoDB profiling
db.setProfilingLevel(2);

// View slow operations
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty();

// Disable profiling
db.setProfilingLevel(0);
```

## Log Analysis

### Backend Logs

#### Log Locations:
```bash
# Application logs
tail -f logs/backend.log
tail -f logs/error.log
tail -f logs/access.log

# System logs
journalctl -u autocomplete-backend -f
```

#### Log Analysis Commands:
```bash
# Find errors in logs
grep -i error logs/backend.log | tail -20

# Count error types
grep -i error logs/backend.log | awk '{print $4}' | sort | uniq -c

# Monitor response times
grep "response_time" logs/access.log | awk '{sum+=$8; count++} END {print "Average:", sum/count "ms"}'
```

### Frontend Logs

#### Browser Console:
```javascript
// Structured logging
const logger = {
  info: (message, data) => console.log(`[INFO] ${message}`, data),
  warn: (message, data) => console.warn(`[WARN] ${message}`, data),
  error: (message, data) => console.error(`[ERROR] ${message}`, data)
};

// Performance logging
const performanceLogger = {
  logSearchTime: (query, duration) => {
    console.log(`Search "${query}" took ${duration}ms`);
  }
};
```

### Log Aggregation

#### Using ELK Stack:
```yaml
# docker-compose.yml for logging
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.15.0
    environment:
      - discovery.type=single-node
  
  logstash:
    image: docker.elastic.co/logstash/logstash:7.15.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
  
  kibana:
    image: docker.elastic.co/kibana/kibana:7.15.0
    ports:
      - "5601:5601"
```

## Getting Help

### Before Asking for Help

1. **Check this troubleshooting guide** for your specific issue
2. **Search existing issues** on GitHub or project documentation
3. **Gather diagnostic information**:
   - Error messages and stack traces
   - System information (OS, Node.js version, etc.)
   - Steps to reproduce the issue
   - Configuration files (remove sensitive data)

### Diagnostic Information Script

```bash
#!/bin/bash
# diagnostic-info.sh - Gather system information

echo "=== System Information ==="
echo "OS: $(uname -a)"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "MongoDB: $(mongo --version | head -1)"

echo -e "\n=== Application Status ==="
echo "Backend port 3001: $(lsof -ti:3001 && echo 'In use' || echo 'Available')"
echo "Frontend port 5173: $(lsof -ti:5173 && echo 'In use' || echo 'Available')"

echo -e "\n=== Memory Usage ==="
free -h

echo -e "\n=== Disk Space ==="
df -h

echo -e "\n=== Recent Errors ==="
tail -20 logs/error.log 2>/dev/null || echo "No error log found"

echo -e "\n=== Environment Variables ==="
env | grep -E "(NODE_ENV|MONGODB_URI|PORT)" | sed 's/=.*/=***/'
```

### Creating Bug Reports

Include the following information:

1. **Environment Details**:
   - Operating system and version
   - Node.js and npm versions
   - MongoDB version
   - Browser version (for frontend issues)

2. **Error Information**:
   - Complete error message
   - Stack trace
   - Log entries around the time of error

3. **Reproduction Steps**:
   - Exact steps to reproduce the issue
   - Expected behavior
   - Actual behavior

4. **Configuration**:
   - Environment variables (remove sensitive data)
   - Package.json dependencies
   - Any custom configuration

### Community Resources

- **GitHub Issues**: Check existing issues and create new ones
- **Documentation**: Review all documentation files
- **Stack Overflow**: Search for similar issues
- **Discord/Slack**: Join community channels if available

### Professional Support

For production deployments or complex issues:

1. **Performance Consulting**: Help with optimization and scaling
2. **Custom Development**: Feature additions or modifications
3. **Training**: Team training on the codebase and architecture
4. **Maintenance**: Ongoing support and updates

---

This troubleshooting guide covers the most common issues you might encounter. Keep it updated as new issues are discovered and resolved.