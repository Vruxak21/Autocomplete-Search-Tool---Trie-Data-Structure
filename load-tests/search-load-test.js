import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% of requests must complete below 100ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
    errors: ['rate<0.1'],             // Custom error rate must be below 10%
  },
};

const BASE_URL = 'http://localhost:3001';

// Sample search queries to simulate realistic usage
const searchQueries = [
  'tok', 'new', 'lon', 'par', 'ber', 'mad', 'rom', 'ams', 'vie', 'pra',
  'war', 'bud', 'ath', 'lis', 'dub', 'cop', 'sto', 'hel', 'osl', 'ric'
];

export default function () {
  // Select a random search query
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  
  // Make search request
  const response = http.get(`${BASE_URL}/api/search?query=${query}&limit=5`);
  
  // Check response
  const result = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
    'has suggestions': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.suggestions);
      } catch (e) {
        return false;
      }
    },
    'suggestions have required fields': (r) => {
      try {
        const body = JSON.parse(r.body);
        if (!Array.isArray(body.suggestions) || body.suggestions.length === 0) {
          return true; // Empty results are valid
        }
        return body.suggestions.every(s => 
          typeof s.word === 'string' && 
          typeof s.frequency === 'number'
        );
      } catch (e) {
        return false;
      }
    },
  });

  // Record errors
  errorRate.add(!result);

  // Simulate user think time
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}