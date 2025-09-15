# API Documentation

## Overview

The Auto-Complete Search Tool API provides endpoints for real-time search suggestions, Trie visualization, and performance monitoring. All endpoints return JSON responses and follow RESTful conventions.

**Base URL:** `http://localhost:3001/api`

**Content-Type:** `application/json`

**Rate Limiting:** 1000 requests per 15 minutes per IP address

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

## Response Format

### Success Response
```json
{
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": [ ... ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Search API

### Search Suggestions

**Endpoint:** `GET /api/search`

**Description:** Get autocomplete suggestions for a given query with optional typo tolerance.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search query (1-100 characters, alphanumeric + spaces, hyphens, underscores, apostrophes) |
| `limit` | integer | No | 5 | Maximum number of suggestions (1-20) |
| `typoTolerance` | boolean | No | false | Enable fuzzy matching for typos |

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/search?query=tok&limit=5&typoTolerance=true"
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
    },
    {
      "word": "took",
      "frequency": 45,
      "score": 42,
      "type": "typo_correction",
      "originalQuery": "tok",
      "editDistance": 1,
      "similarity": 0.85,
      "correctionType": "insertion"
    }
  ],
  "exactMatches": 2,
  "typoCorrections": 1,
  "query": "tok",
  "limit": 5,
  "typoToleranceUsed": true,
  "totalMatches": 3,
  "processingTime": 12,
  "cached": false,
  "cacheHit": false,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `suggestions` | array | Array of suggestion objects |
| `suggestions[].word` | string | The suggested word |
| `suggestions[].frequency` | integer | Usage frequency count |
| `suggestions[].score` | number | Calculated relevance score |
| `suggestions[].type` | string | "exact_match" or "typo_correction" |
| `exactMatches` | integer | Number of exact matches found |
| `typoCorrections` | integer | Number of typo corrections found |
| `query` | string | Original search query |
| `limit` | integer | Applied result limit |
| `typoToleranceUsed` | boolean | Whether typo tolerance was applied |
| `totalMatches` | integer | Total matches before limiting |
| `processingTime` | integer | Processing time in milliseconds |
| `cached` | boolean | Whether result was served from cache |
| `timestamp` | string | Response timestamp in ISO format |

**Error Responses:**

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | Invalid query parameters | Query validation failed |
| 503 | Search service unavailable | Trie not initialized |
| 500 | Internal search error | Server error during search |

### Increment Word Frequency

**Endpoint:** `POST /api/search/increment`

**Description:** Increment the frequency counter for a specific word to track usage patterns.

**Request Body:**
```json
{
  "word": "tokyo",
  "increment": 1
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `word` | string | Yes | - | Word to increment (1-100 characters) |
| `increment` | integer | No | 1 | Increment amount (1-10) |

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/search/increment" \
  -H "Content-Type: application/json" \
  -d '{"word": "tokyo", "increment": 1}'
```

**Example Response:**
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

**Error Responses:**

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | Invalid request body | Request validation failed |
| 404 | Word not found | Word doesn't exist in search index |
| 503 | Search service unavailable | Trie not initialized |

### Typo Tolerance Configuration

**Endpoint:** `GET /api/search/typo-config`

**Description:** Get current typo tolerance configuration and statistics.

**Example Response:**
```json
{
  "config": {
    "maxEditDistance": 2,
    "minWordLength": 3,
    "maxCandidates": 100,
    "similarityThreshold": 0.6
  },
  "stats": {
    "totalCorrections": 1247,
    "averageEditDistance": 1.3,
    "mostCommonCorrections": [
      { "from": "teh", "to": "the", "count": 89 },
      { "from": "recieve", "to": "receive", "count": 67 }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Endpoint:** `PUT /api/search/typo-config`

**Description:** Update typo tolerance configuration.

**Request Body:**
```json
{
  "maxEditDistance": 2,
  "minWordLength": 3,
  "maxCandidates": 100,
  "similarityThreshold": 0.6
}
```

### Search Statistics

**Endpoint:** `GET /api/search/stats`

**Description:** Get comprehensive search statistics and performance metrics.

**Example Response:**
```json
{
  "trie": {
    "wordCount": 15420,
    "nodeCount": 89234,
    "maxDepth": 12,
    "averageDepth": 6.8,
    "memoryUsage": "45.2MB",
    "compressionRatio": 0.73
  },
  "datasets": {
    "cities": { "loaded": 15493, "errors": 0, "lastUpdated": "2024-01-15T09:00:00.000Z" },
    "products": { "loaded": 8934, "errors": 2, "lastUpdated": "2024-01-15T09:00:00.000Z" }
  },
  "typoTolerance": {
    "enabled": true,
    "totalCorrections": 1247,
    "averageEditDistance": 1.3
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Trie Visualization API

### Trie Structure

**Endpoint:** `GET /api/trie/structure`

**Description:** Get Trie structure data for visualization purposes.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `depth` | integer | No | 5 | Maximum depth to traverse (1-10) |
| `prefix` | string | No | "" | Focus on specific prefix (max 50 chars) |

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/trie/structure?depth=3&prefix=to"
```

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
        "word": null,
        "depth": 0,
        "childCount": 26
      },
      {
        "id": 1,
        "character": "t",
        "prefix": "t",
        "isEndOfWord": false,
        "frequency": 0,
        "word": null,
        "depth": 1,
        "childCount": 8
      },
      {
        "id": 2,
        "character": "o",
        "prefix": "to",
        "isEndOfWord": true,
        "frequency": 45,
        "word": "to",
        "depth": 2,
        "childCount": 5
      }
    ],
    "edges": [
      {
        "from": 0,
        "to": 1,
        "character": "t"
      },
      {
        "from": 1,
        "to": 2,
        "character": "o"
      }
    ],
    "totalNodes": 1247,
    "totalWords": 892,
    "maxDepth": 8
  },
  "metadata": {
    "prefix": "to",
    "depth": 3,
    "totalNodes": 1247,
    "totalWords": 892,
    "maxDepth": 8
  },
  "trieStats": {
    "wordCount": 15420,
    "nodeCount": 89234,
    "memoryUsage": "45.2MB"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Trie Path Tracing

**Endpoint:** `GET /api/trie/path`

**Description:** Trace the path through the Trie for a specific query, useful for real-time visualization.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Query to trace path for (1-50 characters) |

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/trie/path?query=tokyo"
```

**Example Response:**
```json
{
  "query": "tokyo",
  "path": [
    {
      "character": "t",
      "prefix": "t",
      "isEndOfWord": false,
      "frequency": 0,
      "word": null
    },
    {
      "character": "o",
      "prefix": "to",
      "isEndOfWord": true,
      "frequency": 45,
      "word": "to"
    },
    {
      "character": "k",
      "prefix": "tok",
      "isEndOfWord": false,
      "frequency": 0,
      "word": null
    },
    {
      "character": "y",
      "prefix": "toky",
      "isEndOfWord": false,
      "frequency": 0,
      "word": null
    },
    {
      "character": "o",
      "prefix": "tokyo",
      "isEndOfWord": true,
      "frequency": 150,
      "word": "tokyo"
    }
  ],
  "exists": true,
  "isCompleteWord": true,
  "frequency": 150,
  "suggestions": [
    {
      "word": "tokyo",
      "frequency": 150,
      "score": 150
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Algorithm Complexity Information

**Endpoint:** `GET /api/trie/complexity`

**Description:** Get detailed information about Trie algorithm complexity and performance characteristics.

**Example Response:**
```json
{
  "timeComplexity": {
    "search": "O(L)",
    "insert": "O(L)",
    "delete": "O(L)",
    "description": "L is the length of the word/query"
  },
  "spaceComplexity": {
    "worst": "O(ALPHABET_SIZE * N * M)",
    "average": "O(N * M)",
    "description": "N is number of words, M is average word length, ALPHABET_SIZE is character set size"
  },
  "currentStats": {
    "wordCount": 15420,
    "nodeCount": 89234,
    "maxDepth": 12,
    "averageDepth": 6.8,
    "memoryEfficiency": 73.2
  },
  "advantages": [
    "Fast prefix-based searches",
    "Memory efficient for large dictionaries with common prefixes",
    "Supports autocomplete and spell-check functionality",
    "Deterministic performance regardless of dataset size"
  ],
  "disadvantages": [
    "Higher memory usage for sparse datasets",
    "Complex implementation compared to hash tables",
    "Not suitable for exact match queries only"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Health and Monitoring API

### Health Check

**Endpoint:** `GET /health`

**Description:** Check the health status of all services.

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "connected",
      "responseTime": 5,
      "collections": 3
    },
    "trie": {
      "status": "loaded",
      "wordCount": 15420,
      "memoryUsage": "45.2MB"
    },
    "cache": {
      "status": "available",
      "hitRate": 0.78,
      "size": 1247
    }
  },
  "performance": {
    "averageResponseTime": 23,
    "requestsPerSecond": 45,
    "errorRate": 0.002
  }
}
```

### Performance Metrics

**Endpoint:** `GET /api/performance`

**Description:** Get detailed performance metrics and monitoring data.

**Example Response:**
```json
{
  "responseTime": {
    "average": 23,
    "p50": 18,
    "p95": 45,
    "p99": 78
  },
  "throughput": {
    "requestsPerSecond": 45,
    "requestsPerMinute": 2700,
    "totalRequests": 162000
  },
  "errors": {
    "rate": 0.002,
    "total": 324,
    "byType": {
      "validation": 156,
      "timeout": 89,
      "server": 79
    }
  },
  "memory": {
    "heapUsed": "120.5MB",
    "heapTotal": "180.2MB",
    "external": "45.8MB",
    "rss": "245.7MB"
  },
  "cache": {
    "hitRate": 0.78,
    "missRate": 0.22,
    "size": 1247,
    "maxSize": 10000
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Error Handling

### HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid request parameters or body |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Response Format

All error responses follow this format:

```json
{
  "error": "Error category",
  "message": "Human-readable error description",
  "details": [
    {
      "field": "query",
      "message": "Query must be between 1 and 100 characters",
      "value": "",
      "code": "INVALID_LENGTH"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123456789"
}
```

### Common Error Scenarios

#### Validation Errors (400)
```json
{
  "error": "Invalid query parameters",
  "message": "Request validation failed",
  "details": [
    {
      "field": "query",
      "message": "Query contains invalid characters",
      "value": "test@#$",
      "code": "INVALID_CHARACTERS"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Rate Limiting (429)
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests from this IP address",
  "details": {
    "limit": 1000,
    "window": "15 minutes",
    "retryAfter": 300
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Service Unavailable (503)
```json
{
  "error": "Search service unavailable",
  "message": "Trie data structure not initialized",
  "details": {
    "service": "trie",
    "status": "initializing",
    "estimatedReadyTime": "2024-01-15T10:35:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage and prevent abuse.

**Default Limits:**
- 1000 requests per 15 minutes per IP address
- 100 requests per minute for search endpoints
- 20 requests per minute for structure endpoints

**Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when rate limit resets (Unix timestamp)

**Example Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1642248600
```

## Caching

The API implements intelligent caching to improve performance:

**Cache Strategy:**
- Search results cached for 5 minutes
- Trie structure cached for 1 hour
- Cache keys include query parameters for accuracy

**Cache Headers:**
- `X-Cache-Status`: HIT, MISS, or BYPASS
- `X-Cache-TTL`: Time to live in seconds

## SDK and Client Libraries

### JavaScript/Node.js
```javascript
const AutocompleteAPI = require('autocomplete-search-client');

const client = new AutocompleteAPI({
  baseURL: 'http://localhost:3001/api',
  timeout: 5000
});

// Search for suggestions
const results = await client.search('tok', { 
  limit: 5, 
  typoTolerance: true 
});

// Increment word frequency
await client.incrementFrequency('tokyo', 1);

// Get Trie structure
const structure = await client.getTrieStructure({ depth: 3 });
```

### Python
```python
from autocomplete_client import AutocompleteClient

client = AutocompleteClient(base_url='http://localhost:3001/api')

# Search for suggestions
results = client.search('tok', limit=5, typo_tolerance=True)

# Increment frequency
client.increment_frequency('tokyo', 1)

# Get statistics
stats = client.get_stats()
```

### cURL Examples

**Basic Search:**
```bash
curl -X GET "http://localhost:3001/api/search?query=tokyo&limit=5"
```

**Search with Typo Tolerance:**
```bash
curl -X GET "http://localhost:3001/api/search?query=tokio&typoTolerance=true"
```

**Increment Frequency:**
```bash
curl -X POST "http://localhost:3001/api/search/increment" \
  -H "Content-Type: application/json" \
  -d '{"word": "tokyo", "increment": 1}'
```

**Get Trie Structure:**
```bash
curl -X GET "http://localhost:3001/api/trie/structure?depth=3&prefix=to"
```

**Health Check:**
```bash
curl -X GET "http://localhost:3001/health"
```

## Changelog

### Version 1.0.0
- Initial API release
- Search suggestions with frequency ranking
- Trie visualization endpoints
- Typo tolerance support
- Performance monitoring
- Rate limiting and caching

### Version 1.1.0 (Planned)
- Authentication and user management
- Custom dataset upload
- Advanced analytics
- Webhook support
- GraphQL endpoint