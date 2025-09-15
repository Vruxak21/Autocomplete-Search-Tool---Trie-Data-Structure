/**
 * API Integration Tests
 * Tests all API endpoints with various query scenarios
 */

const request = require('supertest');
const app = require('../src/server');
const { Trie } = require('../src/data-structures');

// Mock the initialization to avoid file system dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  createReadStream: jest.fn()
}));

describe('API Integration Tests', () => {
  let server;

  beforeAll(async () => {
    // Initialize app with test data
    const trie = new Trie();
    
    // Add test data
    trie.insert('apple', 10);
    trie.insert('application', 8);
    trie.insert('apply', 6);
    trie.insert('banana', 5);
    trie.insert('band', 4);
    trie.insert('bandana', 3);
    trie.insert('cat', 7);
    trie.insert('car', 9);
    trie.insert('card', 6);
    trie.insert('care', 8);
    trie.insert('test', 12);
    trie.insert('testing', 9);
    trie.insert('tester', 7);
    
    app.locals.trie = trie;
    
    // Start server for testing
    server = app.listen(0); // Use random port
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('Health Check Endpoint', () => {
    test('GET /health should return OK status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        trie: {
          initialized: true,
          wordCount: expect.any(Number),
          nodeCount: expect.any(Number)
        }
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Search API Endpoints', () => {
    describe('GET /api/search', () => {
      test('should return suggestions for valid query', async () => {
        const response = await request(app)
          .get('/api/search?query=app')
          .expect(200);

        expect(response.body).toMatchObject({
          suggestions: expect.any(Array),
          query: 'app',
          limit: 5,
          totalMatches: expect.any(Number),
          processingTime: expect.any(Number),
          timestamp: expect.any(String)
        });

        // Should return suggestions in frequency order
        expect(response.body.suggestions.length).toBeGreaterThan(0);
        expect(response.body.suggestions[0]).toMatchObject({
          word: expect.any(String),
          frequency: expect.any(Number),
          score: expect.any(Number)
        });

        // Verify ranking order (highest frequency first)
        const frequencies = response.body.suggestions.map(s => s.frequency);
        const sortedFrequencies = [...frequencies].sort((a, b) => b - a);
        expect(frequencies).toEqual(sortedFrequencies);
      });

      test('should respect limit parameter', async () => {
        const response = await request(app)
          .get('/api/search?query=test&limit=2')
          .expect(200);

        expect(response.body.suggestions.length).toBeLessThanOrEqual(2);
        expect(response.body.limit).toBe(2);
      });

      test('should return empty array for non-existent prefix', async () => {
        const response = await request(app)
          .get('/api/search?query=xyz')
          .expect(200);

        expect(response.body.suggestions).toEqual([]);
        expect(response.body.totalMatches).toBe(0);
      });

      test('should validate query parameter', async () => {
        // Empty query
        await request(app)
          .get('/api/search?query=')
          .expect(400);

        // Invalid characters
        await request(app)
          .get('/api/search?query=test@#$')
          .expect(400);

        // Too long query
        const longQuery = 'a'.repeat(101);
        await request(app)
          .get('/api/search?query=' + longQuery)
          .expect(400);
      });

      test('should validate limit parameter', async () => {
        // Invalid limit (too high)
        await request(app)
          .get('/api/search?query=test&limit=25')
          .expect(400);

        // Invalid limit (negative)
        await request(app)
          .get('/api/search?query=test&limit=-1')
          .expect(400);

        // Invalid limit (not a number)
        await request(app)
          .get('/api/search?query=test&limit=abc')
          .expect(400);
      });

      test('should handle case insensitive queries', async () => {
        const lowerResponse = await request(app)
          .get('/api/search?query=app')
          .expect(200);

        const upperResponse = await request(app)
          .get('/api/search?query=APP')
          .expect(200);

        expect(lowerResponse.body.suggestions).toEqual(upperResponse.body.suggestions);
      });

      test('should return results within performance threshold', async () => {
        const response = await request(app)
          .get('/api/search?query=test')
          .expect(200);

        expect(response.body.processingTime).toBeLessThan(100); // Should be under 100ms
      });
    });

    describe('POST /api/search/increment', () => {
      test('should increment frequency for existing word', async () => {
        const word = 'apple';
        const originalFrequency = app.locals.trie.getFrequency(word);

        const response = await request(app)
          .post('/api/search/increment')
          .send({ word, increment: 2 })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          word,
          increment: 2,
          newFrequency: originalFrequency + 2,
          message: expect.stringContaining(word)
        });

        // Verify frequency was actually updated
        expect(app.locals.trie.getFrequency(word)).toBe(originalFrequency + 2);
      });

      test('should return 404 for non-existent word', async () => {
        const response = await request(app)
          .post('/api/search/increment')
          .send({ word: 'nonexistent' })
          .expect(404);

        expect(response.body).toMatchObject({
          success: false,
          word: 'nonexistent',
          message: expect.stringContaining('not found')
        });
      });

      test('should validate request body', async () => {
        // Missing word
        await request(app)
          .post('/api/search/increment')
          .send({})
          .expect(400);

        // Invalid word
        await request(app)
          .post('/api/search/increment')
          .send({ word: 'test@#$' })
          .expect(400);

        // Invalid increment
        await request(app)
          .post('/api/search/increment')
          .send({ word: 'apple', increment: 15 })
          .expect(400);
      });

      test('should default increment to 1', async () => {
        const word = 'banana';
        const originalFrequency = app.locals.trie.getFrequency(word);

        const response = await request(app)
          .post('/api/search/increment')
          .send({ word })
          .expect(200);

        expect(response.body.increment).toBe(1);
        expect(response.body.newFrequency).toBe(originalFrequency + 1);
      });
    });

    describe('GET /api/search/stats', () => {
      test('should return search statistics', async () => {
        const response = await request(app)
          .get('/api/search/stats')
          .expect(200);

        expect(response.body).toMatchObject({
          trie: {
            wordCount: expect.any(Number),
            nodeCount: expect.any(Number),
            maxDepth: expect.any(Number),
            averageDepth: expect.any(Number)
          },
          timestamp: expect.any(String)
        });
      });
    });
  });

  describe('Trie Visualization Endpoints', () => {
    describe('GET /api/trie/structure', () => {
      test('should return Trie structure data', async () => {
        const response = await request(app)
          .get('/api/trie/structure')
          .expect(200);

        expect(response.body).toMatchObject({
          structure: {
            nodes: expect.any(Array),
            edges: expect.any(Array),
            totalNodes: expect.any(Number),
            totalWords: expect.any(Number),
            maxDepth: expect.any(Number)
          },
          metadata: {
            prefix: '',
            depth: 5,
            totalNodes: expect.any(Number),
            totalWords: expect.any(Number),
            maxDepth: expect.any(Number)
          },
          trieStats: expect.any(Object),
          timestamp: expect.any(String)
        });

        // Verify structure contains valid nodes
        expect(response.body.structure.nodes.length).toBeGreaterThan(0);
        expect(response.body.structure.nodes[0]).toMatchObject({
          id: expect.any(Number),
          character: expect.any(String),
          prefix: expect.any(String),
          isEndOfWord: expect.any(Boolean),
          frequency: expect.any(Number),
          depth: expect.any(Number),
          childCount: expect.any(Number)
        });
      });

      test('should respect depth parameter', async () => {
        const response = await request(app)
          .get('/api/trie/structure?depth=3')
          .expect(200);

        expect(response.body.metadata.depth).toBe(3);
        expect(response.body.structure.maxDepth).toBeLessThanOrEqual(3);
      });

      test('should handle prefix parameter', async () => {
        const response = await request(app)
          .get('/api/trie/structure?prefix=app')
          .expect(200);

        expect(response.body.metadata.prefix).toBe('app');
        // All nodes should have prefix starting with 'app'
        response.body.structure.nodes.forEach(node => {
          if (node.prefix) {
            expect(node.prefix.startsWith('app')).toBe(true);
          }
        });
      });

      test('should validate parameters', async () => {
        // Invalid depth
        await request(app)
          .get('/api/trie/structure?depth=15')
          .expect(400);

        // Invalid prefix
        await request(app)
          .get('/api/trie/structure?prefix=' + 'a'.repeat(51))
          .expect(400);
      });
    });

    describe('GET /api/trie/path', () => {
      test('should return path data for existing query', async () => {
        const response = await request(app)
          .get('/api/trie/path?query=app')
          .expect(200);

        expect(response.body).toMatchObject({
          query: 'app',
          path: expect.any(Array),
          exists: true,
          isCompleteWord: expect.any(Boolean),
          frequency: expect.any(Number),
          suggestions: expect.any(Array),
          timestamp: expect.any(String)
        });

        // Verify path structure
        expect(response.body.path.length).toBe(3); // 'a', 'p', 'p'
        response.body.path.forEach((pathNode, index) => {
          expect(pathNode).toMatchObject({
            character: expect.any(String),
            prefix: expect.any(String),
            isEndOfWord: expect.any(Boolean),
            frequency: expect.any(Number)
          });
        });
      });

      test('should handle non-existent query', async () => {
        const response = await request(app)
          .get('/api/trie/path?query=xyz')
          .expect(200);

        expect(response.body).toMatchObject({
          query: 'xyz',
          path: [],
          exists: false,
          isCompleteWord: false,
          frequency: 0,
          suggestions: []
        });
      });

      test('should validate query parameter', async () => {
        // Missing query
        await request(app)
          .get('/api/trie/path')
          .expect(400);

        // Invalid characters
        await request(app)
          .get('/api/trie/path?query=test@#$')
          .expect(400);

        // Too long query
        await request(app)
          .get('/api/trie/path?query=' + 'a'.repeat(51))
          .expect(400);
      });
    });

    describe('GET /api/trie/complexity', () => {
      test('should return complexity information', async () => {
        const response = await request(app)
          .get('/api/trie/complexity')
          .expect(200);

        expect(response.body).toMatchObject({
          timeComplexity: {
            search: 'O(L)',
            insert: 'O(L)',
            delete: 'O(L)',
            description: expect.any(String)
          },
          spaceComplexity: {
            worst: expect.any(String),
            average: expect.any(String),
            description: expect.any(String)
          },
          currentStats: {
            wordCount: expect.any(Number),
            nodeCount: expect.any(Number),
            maxDepth: expect.any(Number),
            averageDepth: expect.any(Number),
            memoryEfficiency: expect.any(Number)
          },
          advantages: expect.any(Array),
          disadvantages: expect.any(Array),
          timestamp: expect.any(String)
        });

        expect(response.body.advantages.length).toBeGreaterThan(0);
        expect(response.body.disadvantages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for unknown routes', async () => {
      await request(app)
        .get('/api/unknown')
        .expect(404);
    });

    test('should handle malformed JSON in POST requests', async () => {
      await request(app)
        .post('/api/search/increment')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    test('should return proper error format', async () => {
      const response = await request(app)
        .get('/api/search?query=')
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        details: expect.any(Array),
        timestamp: expect.any(String)
      });
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent requests', async () => {
      const promises = Array(10).fill().map((_, i) => 
        request(app).get(`/api/search?query=test${i % 3}`)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.processingTime).toBeLessThan(100);
      });
    });

    test('should maintain performance with various query lengths', async () => {
      const queries = ['a', 'ap', 'app', 'appl', 'apple'];
      
      for (const query of queries) {
        const response = await request(app)
          .get(`/api/search?query=${query}`)
          .expect(200);
        
        expect(response.body.processingTime).toBeLessThan(100);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty Trie gracefully', async () => {
      // Temporarily replace with empty Trie
      const originalTrie = app.locals.trie;
      app.locals.trie = new Trie();

      const response = await request(app)
        .get('/api/search?query=test')
        .expect(200);

      expect(response.body.suggestions).toEqual([]);
      expect(response.body.totalMatches).toBe(0);

      // Restore original Trie
      app.locals.trie = originalTrie;
    });

    test('should handle special characters in normalization', async () => {
      // Add word with special handling
      app.locals.trie.insert('café', 5);

      const response = await request(app)
        .get('/api/search?query=cafe')
        .expect(200);

      // Should find the word (depending on normalization implementation)
      expect(response.status).toBe(200);
    });

    test('should handle very short queries', async () => {
      const response = await request(app)
        .get('/api/search?query=a')
        .expect(200);

      expect(response.body.suggestions).toBeDefined();
      expect(Array.isArray(response.body.suggestions)).toBe(true);
    });
  });
});