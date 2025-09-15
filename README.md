# Auto-Complete Search Tool

A full-stack web application that provides Google-style autocomplete functionality with real-time search suggestions using advanced data structures (Trie with frequency counters and heap-based ranking).

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Performance](#performance)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Features

### Core Functionality
- **Real-time Search Suggestions**: Sub-100ms response times with debounced input
- **Frequency-based Ranking**: Popular suggestions appear first based on usage patterns
- **Large Dataset Support**: Efficiently handles 10,000+ entries with optimized Trie structure
- **Typo Tolerance**: Optional fuzzy matching using Levenshtein distance algorithm
- **Persistent Storage**: MongoDB integration for data backup and recovery

### Educational Features
- **Trie Visualization**: Interactive D3.js visualization showing data structure behavior
- **Real-time Path Highlighting**: Visual representation of search path through Trie nodes
- **Performance Metrics**: Time complexity analysis and memory usage statistics
- **Algorithm Explanation**: Educational content about Trie operations and efficiency

### Technical Features
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Caching Layer**: Redis-compatible caching for improved performance
- **Analytics**: Search usage tracking and performance monitoring
- **Error Handling**: Comprehensive error management with user-friendly messages
- **Security**: Input validation, rate limiting, and CORS protection

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with middleware for compression, CORS, and security
- **Database**: MongoDB for data persistence and analytics
- **Validation**: Express-validator for input sanitization
- **Testing**: Jest with Supertest for API testing
- **Development**: Nodemon for hot reload, ESLint and Prettier for code quality

### Frontend
- **Framework**: React 18 with hooks and functional components
- **Styling**: Tailwind CSS for responsive design
- **HTTP Client**: Axios for API communication with interceptors
- **Visualization**: D3.js for interactive Trie structure rendering
- **Routing**: React Router for client-side navigation
- **Testing**: Vitest with React Testing Library
- **Build Tool**: Vite for fast development and optimized builds

### Data Structures
- **Trie (Prefix Tree)**: Custom implementation with frequency counters
- **Max Heap**: Priority queue for efficient top-K suggestion retrieval
- **Levenshtein Distance**: Algorithm for typo tolerance and fuzzy matching

## Project Structure

```
autocomplete-search-tool/
├── backend/                    # Node.js/Express API server
│   ├── src/
│   │   ├── config/            # Environment and database configuration
│   │   ├── data-structures/   # Trie, Heap, and TrieNode implementations
│   │   ├── middleware/        # Express middleware (performance, validation)
│   │   ├── routes/           # API route handlers (search, trie, health)
│   │   ├── services/         # Business logic (dataset loading, persistence)
│   │   ├── utils/            # Utility functions and helpers
│   │   └── server.js         # Main server entry point
│   ├── scripts/              # Seed scripts and utilities
│   ├── tests/                # Unit and integration tests
│   └── docs/                 # API documentation
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/       # React components (SearchInput, Visualization)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API service layer
│   │   ├── utils/           # Frontend utilities
│   │   └── App.jsx          # Main application component
│   ├── dist/                # Production build output
│   └── tests/               # Frontend tests
├── data/                     # Sample datasets (cities, products, movies)
├── e2e/                      # End-to-end tests with Playwright
├── load-tests/               # Performance and load testing scripts
├── scripts/                  # Build and deployment scripts
├── logs/                     # Application logs
└── docs/                     # Additional documentation
```

## Quick Start

### Prerequisites
- Node.js 18 or higher
- MongoDB 5.0 or higher (local or cloud instance)
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd autocomplete-search-tool
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### 3. Environment Setup
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp .env.development .env

# Edit configuration files with your settings
# See Configuration section for details
```

### 4. Start Services
```bash
# Start MongoDB (if running locally)
mongod

# Start backend server (from root directory)
npm run dev:backend

# Start frontend development server (in new terminal)
npm run dev:frontend
```

### 5. Load Sample Data
```bash
# Load sample datasets
npm run seed

# Or load specific dataset
npm run seed:cities
npm run seed:products
```

### 6. Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api/docs

## Installation

### Development Environment

1. **System Requirements**
   ```bash
   node --version  # Should be 18.0.0 or higher
   npm --version   # Should be 8.0.0 or higher
   ```

2. **MongoDB Setup**
   
   **Local Installation:**
   ```bash
   # macOS with Homebrew
   brew tap mongodb/brew
   brew install mongodb-community
   brew services start mongodb-community
   
   # Ubuntu/Debian
   sudo apt-get install mongodb
   sudo systemctl start mongodb
   
   # Windows
   # Download from https://www.mongodb.com/try/download/community
   ```
   
   **Cloud Setup (MongoDB Atlas):**
   - Create account at https://cloud.mongodb.com
   - Create cluster and get connection string
   - Update `MONGODB_URI` in environment configuration

3. **Project Setup**
   ```bash
   # Clone and install
   git clone <repository-url>
   cd autocomplete-search-tool
   npm run install:all
   
   # Verify installation
   npm run health:check
   ```

### Production Environment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production setup instructions.

## Configuration

### Environment Variables

Create `.env` files in the root directory and backend directory:

**Root `.env`:**
```env
NODE_ENV=development
LOG_LEVEL=info
```

**Backend `.env`:**
```env
# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/autocomplete_search
MONGODB_DB_NAME=autocomplete_search

# Performance Configuration
CACHE_TTL=300
MAX_SEARCH_RESULTS=20
TRIE_BACKUP_INTERVAL=3600

# Security Configuration
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000

# Typo Tolerance Configuration
TYPO_MAX_EDIT_DISTANCE=2
TYPO_MIN_WORD_LENGTH=3
TYPO_SIMILARITY_THRESHOLD=0.6
```

### Dataset Configuration

Configure which datasets to load in `backend/scripts/seed.js`:

```javascript
const DATASET_CONFIG = {
  cities: {
    file: '../data/worldcities.csv',
    enabled: true,
    initialFrequency: 1
  },
  products: {
    file: '../data/flipkart_com-ecommerce_sample.csv',
    enabled: true,
    initialFrequency: 1
  },
  movies: {
    file: '../data/Movie.tsv',
    enabled: false,
    initialFrequency: 1
  }
};
```

## Usage

### Basic Search

1. **Start typing** in the search box
2. **View suggestions** that appear in real-time
3. **Navigate** with arrow keys or mouse
4. **Select** suggestion with Enter key or click

### Advanced Features

#### Typo Tolerance
```javascript
// Enable typo tolerance in API requests
fetch('/api/search?query=tokio&typoTolerance=true')
```

#### Frequency Tracking
```javascript
// Increment word frequency when selected
fetch('/api/search/increment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ word: 'tokyo', increment: 1 })
});
```

#### Trie Visualization
1. Navigate to **Visualization** tab
2. Type in search box to see **real-time path highlighting**
3. Explore **node relationships** and **frequency data**
4. View **time complexity** information

### Command Line Interface

```bash
# Seed specific datasets
npm run seed:cities          # Load world cities
npm run seed:products        # Load product data
npm run seed:movies          # Load movie data
npm run seed:mixed           # Load all datasets

# Reset and reload data
npm run seed:reset           # Clear and reload all data
npm run seed:cleanup         # Remove all data

# Development commands
npm run dev                  # Start both frontend and backend
npm run test                 # Run all tests
npm run test:coverage        # Run tests with coverage
npm run lint                 # Check code quality
npm run format               # Format code

# Production commands
npm run build                # Build for production
npm run start                # Start production server
npm run health               # Check service health
```

## API Documentation

### Search Endpoints

#### GET /api/search
Search for autocomplete suggestions.

**Parameters:**
- `query` (string, required): Search query (1-100 characters)
- `limit` (integer, optional): Maximum results (1-20, default: 5)
- `typoTolerance` (boolean, optional): Enable fuzzy matching (default: false)

**Example Request:**
```bash
curl "http://localhost:3001/api/search?query=tok&limit=5&typoTolerance=true"
```

**Example Response:**
```json
{
  "suggestions": [
    {
      "word": "tokyo",
      "frequency": 150,
      "score": 150,
      "type": "exact_match"
    },
    {
      "word": "token",
      "frequency": 89,
      "score": 89,
      "type": "exact_match"
    }
  ],
  "exactMatches": 2,
  "typoCorrections": 0,
  "query": "tok",
  "limit": 5,
  "typoToleranceUsed": true,
  "totalMatches": 2,
  "processingTime": 12,
  "cached": false,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### POST /api/search/increment
Increment word frequency for usage tracking.

**Request Body:**
```json
{
  "word": "tokyo",
  "increment": 1
}
```

**Response:**
```json
{
  "success": true,
  "word": "tokyo",
  "increment": 1,
  "newFrequency": 151,
  "message": "Frequency updated for \"tokyo\"",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Trie Visualization Endpoints

#### GET /api/trie/structure
Get Trie structure data for visualization.

**Parameters:**
- `depth` (integer, optional): Maximum depth to traverse (1-10, default: 5)
- `prefix` (string, optional): Focus on specific prefix (max 50 chars)

**Example Response:**
```json
{
  "structure": {
    "nodes": [
      {
        "id": 0,
        "character": "ROOT",
        "prefix": "",
        "isEndOfWord": false,
        "frequency": 0,
        "depth": 0,
        "childCount": 26
      }
    ],
    "edges": [],
    "totalNodes": 1247,
    "totalWords": 892,
    "maxDepth": 8
  },
  "metadata": {
    "prefix": "",
    "depth": 5,
    "totalNodes": 1247,
    "totalWords": 892,
    "maxDepth": 8
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /api/trie/path
Get path data for query visualization.

**Parameters:**
- `query` (string, required): Query to trace path for (1-50 characters)

### Health and Monitoring Endpoints

#### GET /health
Service health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "services": {
    "database": "connected",
    "trie": "loaded",
    "cache": "available"
  }
}
```

#### GET /api/search/stats
Get search statistics and performance metrics.

**Response:**
```json
{
  "trie": {
    "wordCount": 15420,
    "nodeCount": 89234,
    "maxDepth": 12,
    "averageDepth": 6.8,
    "memoryUsage": "45.2MB"
  },
  "datasets": {
    "cities": { "loaded": 15493, "errors": 0 },
    "products": { "loaded": 8934, "errors": 2 }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Responses

All endpoints return consistent error format:

```json
{
  "error": "Invalid query parameters",
  "message": "Query must be between 1 and 100 characters",
  "details": [
    {
      "field": "query",
      "message": "Query must be between 1 and 100 characters",
      "value": ""
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable

## Performance

### Benchmarks

**Search Performance:**
- Average response time: 15-25ms
- 95th percentile: <50ms
- 99th percentile: <100ms
- Concurrent users supported: 1000+

**Memory Usage:**
- Trie structure: ~45MB for 15,000 words
- Node.js process: ~120MB total
- MongoDB: ~50MB for analytics data

**Scalability Limits:**
- Maximum words in Trie: 100,000 (recommended)
- Maximum concurrent searches: 1,000
- Maximum query length: 100 characters
- Cache size: 10,000 entries (configurable)

### Optimization Features

1. **Caching Layer**: Frequently searched queries cached for 5 minutes
2. **Connection Pooling**: MongoDB connections reused for efficiency
3. **Compression**: Gzip compression for API responses
4. **Debounced Input**: 300ms delay prevents excessive API calls
5. **Lazy Loading**: Trie visualization loads incrementally

### Performance Monitoring

Monitor performance using built-in endpoints:

```bash
# Get current performance metrics
curl http://localhost:3001/api/search/stats

# Monitor response times
curl -w "@curl-format.txt" http://localhost:3001/api/search?query=test

# Load testing
npm run test:load
```

## Testing

### Test Suites

**Backend Tests:**
```bash
cd backend

# Unit tests
npm test

# Integration tests
npm run test:integration

# Performance tests
npm run test:performance

# Coverage report
npm run test:coverage
```

**Frontend Tests:**
```bash
cd frontend

# Component tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

**End-to-End Tests:**
```bash
cd e2e

# Install Playwright
npm install

# Run E2E tests
npm test
```

### Test Coverage

Current test coverage targets:
- Backend: >90% line coverage
- Frontend: >85% line coverage
- Integration: All API endpoints
- E2E: Critical user flows

### Performance Testing

Load testing with various scenarios:

```bash
# Concurrent user simulation
npm run test:load:concurrent

# Spike testing
npm run test:load:spike

# Stress testing
npm run test:load:stress
```

## Deployment

### Development Deployment

```bash
# Build applications
npm run build

# Start production servers
npm run start:prod

# Verify deployment
npm run health:check
```

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production deployment instructions including:

- Docker containerization
- Environment configuration
- Database setup
- Load balancer configuration
- Monitoring and logging
- Security considerations

### Docker Deployment

```bash
# Build containers
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale backend=3
```

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed
**Symptoms:** Backend fails to start, "MongoDB connection error" in logs

**Solutions:**
```bash
# Check MongoDB status
sudo systemctl status mongodb

# Restart MongoDB
sudo systemctl restart mongodb

# Verify connection string in .env
echo $MONGODB_URI

# Test connection manually
mongo $MONGODB_URI
```

#### 2. Slow Search Performance
**Symptoms:** Search responses >100ms, timeout errors

**Solutions:**
```bash
# Check Trie memory usage
curl http://localhost:3001/api/search/stats

# Clear and rebuild Trie
npm run seed:reset

# Enable caching
# Set CACHE_TTL=300 in .env

# Monitor performance
npm run test:performance
```

#### 3. Frontend Build Errors
**Symptoms:** Vite build fails, missing dependencies

**Solutions:**
```bash
# Clear node_modules and reinstall
rm -rf frontend/node_modules
cd frontend && npm install

# Clear Vite cache
rm -rf frontend/dist
rm -rf frontend/.vite

# Check Node.js version
node --version  # Should be 18+
```

#### 4. CORS Errors
**Symptoms:** API requests blocked by browser, CORS policy errors

**Solutions:**
```bash
# Update CORS_ORIGIN in backend/.env
CORS_ORIGIN=http://localhost:5173

# For production, set to your domain
CORS_ORIGIN=https://yourdomain.com

# Restart backend server
npm run dev:backend
```

#### 5. High Memory Usage
**Symptoms:** Node.js process using >500MB RAM

**Solutions:**
```bash
# Check Trie statistics
curl http://localhost:3001/api/search/stats

# Reduce dataset size
npm run seed:cleanup
npm run seed:sample  # Load smaller dataset

# Enable garbage collection logging
NODE_OPTIONS="--max-old-space-size=512" npm start
```

### Debug Mode

Enable debug logging:

```bash
# Backend debug mode
DEBUG=autocomplete:* npm run dev

# Frontend debug mode
VITE_DEBUG=true npm run dev

# Database query logging
MONGODB_LOG_LEVEL=debug npm run dev
```

### Log Analysis

Check application logs:

```bash
# Backend logs
tail -f logs/backend.log

# Error logs
tail -f logs/error.log

# Access logs
tail -f logs/access.log

# MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

### Performance Profiling

Profile application performance:

```bash
# Node.js profiling
node --prof src/server.js

# Memory heap snapshots
node --inspect src/server.js
# Open chrome://inspect in Chrome

# Load testing
npm run test:load:profile
```

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/your-repo/issues)
2. Review application logs for error details
3. Verify environment configuration
4. Test with minimal dataset
5. Create detailed issue report with:
   - Environment details (OS, Node.js version)
   - Error messages and stack traces
   - Steps to reproduce
   - Configuration files (remove sensitive data)

## Contributing

### Development Setup

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm run install:all`
4. Make changes and add tests
5. Run test suite: `npm test`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open Pull Request

### Code Standards

- **ESLint**: Follow configured linting rules
- **Prettier**: Use for code formatting
- **JSDoc**: Document all functions and classes
- **Tests**: Maintain >85% coverage
- **Commits**: Use conventional commit format

### Pull Request Process

1. Update documentation for any new features
2. Add tests for new functionality
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request review from maintainers

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Trie data structure implementation inspired by computer science literature
- D3.js community for visualization examples
- MongoDB team for excellent documentation
- React and Node.js communities for best practices