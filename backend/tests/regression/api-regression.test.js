const request = require('supertest');
const app = require('../../src/server');

describe('API Regression Tests', () => {
  // Test data snapshots to ensure API responses remain consistent
  const expectedResponseStructure = {
    suggestions: expect.any(Array),
    query: expect.any(String),
    timestamp: expect.any(Number),
    processingTime: expect.any(Number),
    totalMatches: expect.any(Number)
  };

  test('search endpoint maintains response structure', async () => {
    const response = await request(app)
      .get('/api/search?query=tok')
      .expect(200);

    expect(response.body).toMatchObject(expectedResponseStructure);
    
    // Verify suggestions structure
    if (response.body.suggestions.length > 0) {
      response.body.suggestions.forEach(suggestion => {
        expect(suggestion).toMatchObject({
          word: expect.any(String),
          frequency: expect.any(Number),
          category: expect.any(String),
          source: expect.any(String),
          score: expect.any(Number)
        });
      });
    }
  });

  test('search endpoint performance remains consistent', async () => {
    const queries = ['a', 'to', 'tok', 'tokyo', 'new', 'newyork'];
    const results = [];

    for (const query of queries) {
      const startTime = Date.now();
      const response = await request(app)
        .get(`/api/search?query=${query}`)
        .expect(200);
      const endTime = Date.now();
      
      results.push({
        query,
        duration: endTime - startTime,
        suggestionCount: response.body.suggestions.length
      });
    }

    // All queries should complete within 100ms
    results.forEach(result => {
      expect(result.duration).toBeLessThan(100);
    });

    // Longer queries should not be significantly slower
    const shortQueryTime = results.find(r => r.query === 'a').duration;
    const longQueryTime = results.find(r => r.query === 'tokyo').duration;
    
    expect(longQueryTime / shortQueryTime).toBeLessThan(3);
  });

  test('trie structure endpoint maintains format', async () => {
    const response = await request(app)
      .get('/api/trie/structure')
      .expect(200);

    expect(response.body).toMatchObject({
      nodes: expect.any(Array),
      edges: expect.any(Array),
      metadata: expect.any(Object)
    });
  });

  test('health endpoint remains functional', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'healthy',
      timestamp: expect.any(Number),
      uptime: expect.any(Number),
      memory: expect.any(Object),
      database: expect.any(String)
    });
  });

  test('error handling remains consistent', async () => {
    // Test invalid query parameter
    const response = await request(app)
      .get('/api/search')
      .expect(400);

    expect(response.body).toMatchObject({
      error: {
        message: expect.any(String),
        code: expect.any(String),
        timestamp: expect.any(Number)
      }
    });
  });

  test('rate limiting works as expected', async () => {
    // Make many rapid requests
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(
        request(app)
          .get('/api/search?query=test')
      );
    }

    const responses = await Promise.all(promises);
    
    // Most should succeed, but some might be rate limited
    const successCount = responses.filter(r => r.status === 200).length;
    const rateLimitedCount = responses.filter(r => r.status === 429).length;
    
    expect(successCount + rateLimitedCount).toBe(50);
    expect(successCount).toBeGreaterThan(30); // At least 60% should succeed
  });

  test('concurrent requests maintain data consistency', async () => {
    const query = 'concurrent';
    const promises = [];
    
    // Make 20 concurrent requests
    for (let i = 0; i < 20; i++) {
      promises.push(
        request(app)
          .get(`/api/search?query=${query}`)
          .expect(200)
      );
    }

    const responses = await Promise.all(promises);
    
    // All responses should be identical for the same query
    const firstResponse = responses[0].body;
    responses.forEach(response => {
      expect(response.body.suggestions).toEqual(firstResponse.suggestions);
      expect(response.body.query).toBe(firstResponse.query);
    });
  });
});