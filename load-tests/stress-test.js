import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const throughput = new Rate('throughput');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 200 },  // Ramp up to 200 users (stress level)
    { duration: '5m', target: 300 },  // Ramp up to 300 users (high stress)
    { duration: '2m', target: 200 },  // Scale back down
    { duration: '2m', target: 100 },  // Continue scaling down
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% under 200ms, 99% under 500ms
    http_req_failed: ['rate<0.05'],                 // Error rate under 5%
    errors: ['rate<0.05'],
    response_time: ['p(95)<200'],
    throughput: ['rate>10'], // At least 10 requests per second
  },
};

const BASE_URL = 'http://localhost:3001';

// Extended set of realistic search queries
const searchQueries = [
  // City names
  'tok', 'new', 'lon', 'par', 'ber', 'mad', 'rom', 'ams', 'vie', 'pra',
  'war', 'bud', 'ath', 'lis', 'dub', 'cop', 'sto', 'hel', 'osl', 'ric',
  'bar', 'mil', 'mun', 'ham', 'col', 'nap', 'tur', 'val', 'sev', 'bil',
  
  // Product-like queries
  'iph', 'sam', 'app', 'goo', 'mic', 'del', 'hp', 'len', 'asu', 'ace',
  'son', 'can', 'nik', 'ado', 'int', 'amd', 'nvi', 'qua', 'bro', 'log',
  
  // Common prefixes
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'up', 'about', 'into', 'over', 'after', 'under', 'out', 'off',
  
  // Edge cases
  '', 'x', 'z', 'q', 'xyz', 'zzz', 'aaa', '123', 'test', 'search'
];

// Simulate different user behaviors
const userBehaviors = {
  quickSearcher: () => Math.random() * 0.5 + 0.2, // 0.2-0.7s think time
  normalUser: () => Math.random() * 2 + 1,        // 1-3s think time
  slowTyper: () => Math.random() * 4 + 2,         // 2-6s think time
};

export default function () {
  // Select user behavior pattern
  const behaviorKeys = Object.keys(userBehaviors);
  const behavior = userBehaviors[behaviorKeys[Math.floor(Math.random() * behaviorKeys.length)]];
  
  // Select search query
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  
  // Simulate typing behavior - multiple requests as user types
  if (query.length > 2) {
    for (let i = 1; i <= query.length; i++) {
      const partialQuery = query.substring(0, i);
      
      const start = Date.now();
      const response = http.get(`${BASE_URL}/api/search?query=${partialQuery}&limit=5`, {
        timeout: '10s',
        tags: { 
          query_type: 'partial',
          query_length: partialQuery.length.toString()
        }
      });
      const end = Date.now();
      
      const duration = end - start;
      responseTime.add(duration);
      throughput.add(1);
      
      const result = check(response, {
        'status is 200': (r) => r.status === 200,
        'response time acceptable': (r) => r.timings.duration < 1000,
        'has valid response structure': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.hasOwnProperty('suggestions') && 
                   body.hasOwnProperty('query') &&
                   Array.isArray(body.suggestions);
          } catch (e) {
            return false;
          }
        },
        'suggestions are properly formatted': (r) => {
          try {
            const body = JSON.parse(r.body);
            if (body.suggestions.length === 0) return true;
            return body.suggestions.every(s => 
              typeof s.word === 'string' && 
              typeof s.frequency === 'number' &&
              s.frequency > 0
            );
          } catch (e) {
            return false;
          }
        }
      });
      
      errorRate.add(!result);
      
      // Short delay between keystrokes (simulating typing)
      if (i < query.length) {
        sleep(0.1 + Math.random() * 0.2); // 100-300ms between keystrokes
      }
    }
  } else {
    // Single character or empty query
    const start = Date.now();
    const response = http.get(`${BASE_URL}/api/search?query=${query}&limit=5`, {
      timeout: '10s',
      tags: { 
        query_type: 'single',
        query_length: query.length.toString()
      }
    });
    const end = Date.now();
    
    const duration = end - start;
    responseTime.add(duration);
    throughput.add(1);
    
    const result = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time acceptable': (r) => r.timings.duration < 1000,
    });
    
    errorRate.add(!result);
  }
  
  // Test frequency increment endpoint occasionally
  if (Math.random() < 0.1) { // 10% of the time
    const word = `test${Math.floor(Math.random() * 100)}`;
    const incrementResponse = http.post(`${BASE_URL}/api/search/increment`, 
      JSON.stringify({ word: word }),
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: '5s',
        tags: { endpoint: 'increment' }
      }
    );
    
    check(incrementResponse, {
      'increment status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
  }
  
  // Test trie structure endpoint occasionally
  if (Math.random() < 0.05) { // 5% of the time
    const structureResponse = http.get(`${BASE_URL}/api/trie/structure?depth=3`, {
      timeout: '15s',
      tags: { endpoint: 'structure' }
    });
    
    check(structureResponse, {
      'structure status is 200': (r) => r.status === 200,
      'structure response time acceptable': (r) => r.timings.duration < 5000,
    });
  }
  
  // User think time based on behavior pattern
  sleep(behavior());
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    test_type: 'stress_test',
    metrics: {
      http_reqs: data.metrics.http_reqs,
      http_req_duration: data.metrics.http_req_duration,
      http_req_failed: data.metrics.http_req_failed,
      errors: data.metrics.errors,
      response_time: data.metrics.response_time,
      throughput: data.metrics.throughput,
      vus: data.metrics.vus,
      vus_max: data.metrics.vus_max
    },
    thresholds: data.thresholds,
    root_group: data.root_group
  };

  return {
    'stress-test-results.json': JSON.stringify(summary, null, 2),
    'stdout': `
Stress Test Summary:
===================
Total Requests: ${data.metrics.http_reqs.count}
Average Response Time: ${data.metrics.http_req_duration.avg.toFixed(2)}ms
95th Percentile: ${data.metrics.http_req_duration['p(95)'].toFixed(2)}ms
99th Percentile: ${data.metrics.http_req_duration['p(99)'].toFixed(2)}ms
Error Rate: ${(data.metrics.http_req_failed.rate * 100).toFixed(2)}%
Max VUs: ${data.metrics.vus_max.max}
    `
  };
}