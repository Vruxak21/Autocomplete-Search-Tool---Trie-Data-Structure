# Application Startup and Initialization

This document describes the application startup and initialization system implemented for the autocomplete search tool.

## Overview

The startup system provides:
- **Application Bootstrap**: Automated initialization of all application components
- **Graceful Shutdown**: Clean resource cleanup on application termination
- **Health Monitoring**: Comprehensive health check endpoints
- **Environment Configuration**: Centralized configuration management
- **Performance Logging**: Startup performance monitoring and reporting
- **Database Seeding**: Automated data initialization scripts

## Components

### 1. Application Bootstrap (`scripts/bootstrap.js`)

The bootstrap script handles the complete application initialization process:

```bash
# Run bootstrap manually
npm run bootstrap

# Or use in code
const { ApplicationBootstrap } = require('./scripts/bootstrap');
const bootstrap = new ApplicationBootstrap();
const result = await bootstrap.bootstrap();
```

**Features:**
- Automatic dataset discovery and loading
- MongoDB connection with fallback handling
- Trie initialization with performance monitoring
- Comprehensive error handling and recovery
- Detailed startup performance logging

**Phases:**
1. **Config Validation**: Load and validate environment configuration
2. **Database Connection**: Connect to MongoDB (optional)
3. **Trie Initialization**: Load datasets and build Trie structure

### 2. Graceful Shutdown (`src/utils/gracefulShutdown.js`)

Handles clean application shutdown with proper resource cleanup:

```javascript
const gracefulShutdown = require('./src/utils/gracefulShutdown');

// Register resources for cleanup
gracefulShutdown.registerResource('cache', async () => {
  cache.clear();
}, 50);

// Initialize shutdown handlers
gracefulShutdown.init();
```

**Features:**
- Signal handling (SIGTERM, SIGINT, SIGUSR2)
- Prioritized resource cleanup
- HTTP server graceful shutdown
- Database connection cleanup
- Configurable shutdown timeout

### 3. Health Check Endpoints (`src/routes/health.js`)

Comprehensive health monitoring endpoints:

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `/health` | Basic health check | Load balancer health checks |
| `/health/detailed` | Comprehensive system status | Monitoring dashboards |
| `/health/ready` | Readiness probe | Kubernetes readiness checks |
| `/health/live` | Liveness probe | Kubernetes liveness checks |
| `/health/startup` | Startup probe | Kubernetes startup checks |
| `/health/database` | Database health | Database monitoring |
| `/health/metrics` | System metrics | Performance monitoring |

### 4. Environment Configuration (`src/config/environment.js`)

Centralized configuration management with validation:

```javascript
const { config } = require('./src/config/environment');
const appConfig = config.load();
```

**Features:**
- Schema-based validation
- Type conversion and constraints
- Environment-specific overrides
- Default value handling
- Configuration summary logging

### 5. Database Seeding (`scripts/seed.js`)

Automated database initialization with sample data:

```bash
# Seed with sample data
npm run seed:sample

# Seed with all datasets
npm run seed

# Force seed (overwrite existing)
npm run seed:force

# Custom datasets
npm run seed -- --datasets cities,products
```

**Features:**
- Multiple dataset support
- Data validation and deduplication
- Backup existing data
- Progress reporting
- Error handling and recovery

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# MongoDB Configuration (Optional)
MONGODB_URI=mongodb://localhost:27017/autocomplete-search
MONGODB_DB_NAME=autocomplete-search

# Application Configuration
MAX_SUGGESTIONS=5
SEARCH_TIMEOUT_MS=100
TRIE_BACKUP_INTERVAL_MS=300000

# Cache Configuration
CACHE_MAX_SIZE=1000
CACHE_TTL=300000

# Security Configuration
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Configuration Schema

All configuration values are validated against a schema with:
- Type validation (string, number, boolean)
- Range constraints (min/max values)
- Enum validation (allowed values)
- Required field validation
- Default value assignment

## Usage

### Starting the Application

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start

# Manual bootstrap only
npm run bootstrap
```

### Health Monitoring

```bash
# Basic health check
curl http://localhost:3001/health

# Detailed health information
curl http://localhost:3001/health/detailed

# System metrics
curl http://localhost:3001/health/metrics
```

### Database Operations

```bash
# Initialize database with sample data
npm run seed:sample

# Validate configuration
npm run validate

# Check application health
npm run health
```

## Performance Monitoring

The startup system includes comprehensive performance monitoring:

### Startup Metrics
- Total bootstrap time
- Individual phase timings
- Dataset loading performance
- Memory usage tracking
- Error rate monitoring

### Health Metrics
- Response time tracking
- Memory usage monitoring
- CPU usage tracking
- Database connection status
- Cache performance metrics

## Error Handling

The startup system provides robust error handling:

### Bootstrap Errors
- Configuration validation errors
- Database connection failures
- Dataset loading errors
- Timeout handling
- Graceful degradation

### Runtime Errors
- Uncaught exception handling
- Unhandled promise rejection handling
- Graceful shutdown on errors
- Error logging and reporting

## Testing

Run the startup integration tests:

```bash
# All startup tests
npm run test:startup

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage
```

## Troubleshooting

### Common Issues

1. **Bootstrap Timeout**
   - Increase `BOOTSTRAP_CONFIG.performance.maxInitTime`
   - Check dataset file sizes
   - Monitor memory usage

2. **Database Connection Failures**
   - Verify MongoDB URI
   - Check network connectivity
   - Review connection timeout settings

3. **Dataset Loading Errors**
   - Verify dataset file paths
   - Check file permissions
   - Review dataset format

4. **Memory Issues**
   - Monitor heap usage during startup
   - Consider dataset size limits
   - Implement memory optimization

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

### Performance Profiling

Monitor startup performance:

```bash
# Enable performance logging
NODE_ENV=development npm run bootstrap

# Monitor memory usage
node --inspect scripts/bootstrap.js
```

## Production Deployment

### Docker Support

The startup system is designed for containerized deployments:

```dockerfile
# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Graceful shutdown
STOPSIGNAL SIGTERM
```

### Kubernetes Integration

Use the health endpoints for Kubernetes probes:

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5

startupProbe:
  httpGet:
    path: /health/startup
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 30
```

## Best Practices

1. **Configuration Management**
   - Use environment variables for configuration
   - Validate all configuration values
   - Provide sensible defaults
   - Document configuration options

2. **Error Handling**
   - Implement graceful degradation
   - Log errors with context
   - Provide meaningful error messages
   - Handle edge cases

3. **Performance**
   - Monitor startup times
   - Optimize dataset loading
   - Use connection pooling
   - Implement caching

4. **Monitoring**
   - Use health check endpoints
   - Monitor system metrics
   - Set up alerting
   - Track performance trends

5. **Testing**
   - Test startup scenarios
   - Validate error handling
   - Test graceful shutdown
   - Monitor test performance