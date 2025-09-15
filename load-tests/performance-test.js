import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics
const searchDuration = new Trend('search_duration');
const errorRate = new Rate('errors');
const searchCount = new Counter('searches');

export const options = {
  scenarios: {
    performance_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 5 },   // Warm up
        { duration: '3m', target: 25 },  // Normal load
        { duration: '2m', target: 50 },  // Peak load
        { duration: '1m', target: 0 },   // Cool down
      ],
    },
  },
  thresholds: {
    search_duration: ['p(95)<100', 'p(99)<200'], // Performance requirements
    http_req_duration: ['p(95)<100'],
    http_req_failed: ['rate<0.01'], // Less than 1% errors
    errors: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:3001';

// Performance test queries - mix of short and long queries
const performanceQueries = [
  // Short queries (should be fast)
  'a', 'b', 'c', 'd', 'e',
  // Medium queries
  'to', 'ne', 'lo', 'pa', 'be',
  // Longer queries
  'tok', 'new', 'lon', 'par', 'ber',
  // Full words
  'tokyo', 'newyork', 'london', 'paris', 'berlin',
  // Non-existent queries
  'xyz', 'qwerty', 'nonexistent'
];

export default function () {
  const query = performanceQueries[Math.floor(Math.random() * performanceQueries.length)];
  
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/api/search?query=${query}&limit=5`);
  const endTime = Date.now();
  
  // Record custom metrics
  searchDuration.add(endTime - startTime);
  searchCount.add(1);
  
  const result = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has valid structure': (r) => {
      try {
        const body = JSON.parse(r.body);
        return (
          typeof body === 'object' &&
          Array.isArray(body.suggestions) &&
          typeof body.query === 'string' &&
          typeof body.timestamp === 'number'
        );
      } catch (e) {
        return false;
      }
    },
    'suggestions are properly formatted': (r) => {
      try {
        const body = JSON.parse(r.body);
        if (body.suggestions.length === 0) return true;
        
        return body.suggestions.every(suggestion => 
          typeof suggestion.word === 'string' &&
          typeof suggestion.frequency === 'number' &&
          suggestion.frequency >= 0
        );
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!result);
  
  // Simulate realistic user behavior
  sleep(0.3 + Math.random() * 0.7); // 300-1000ms between requests
}

export function handleSummary(data) {
  console.log('Performance Test Summary:');
  console.log(`- Total searches: ${data.metrics.searches.values.count}`);
  console.log(`- Average search duration: ${data.metrics.search_duration.values.avg.toFixed(2)}ms`);
  console.log(`- 95th percentile: ${data.metrics.search_duration.values['p(95)'].toFixed(2)}ms`);
  console.log(`- 99th percentile: ${data.metrics.search_duration.values['p(99)'].toFixed(2)}ms`);
  console.log(`- Error rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%`);
  
  return {
    'performance-test-results.json': JSON.stringify(data, null, 2),
  };
}