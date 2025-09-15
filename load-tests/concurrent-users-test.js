import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    concurrent_users: {
      executor: 'constant-vus',
      vus: 100, // 100 concurrent users
      duration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests under 200ms
    http_req_failed: ['rate<0.05'],   // Less than 5% errors
    errors: ['rate<0.05'],
  },
};

const BASE_URL = 'http://localhost:3001';

const searchQueries = [
  'a', 'ab', 'abc', 'to', 'tok', 'toky', 'tokyo',
  'n', 'ne', 'new', 'newy', 'newyork',
  'l', 'lo', 'lon', 'lond', 'london',
  'p', 'pa', 'par', 'pari', 'paris',
  'b', 'be', 'ber', 'berl', 'berlin'
];

export default function () {
  // Simulate realistic typing behavior
  const baseQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  
  // Make multiple requests as user types
  for (let i = 1; i <= baseQuery.length; i++) {
    const query = baseQuery.substring(0, i);
    
    const response = http.get(`${BASE_URL}/api/search?query=${query}&limit=5`);
    
    const result = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time acceptable': (r) => r.timings.duration < 200,
      'valid JSON response': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
    });

    errorRate.add(!result);
    
    // Simulate typing delay
    sleep(0.1 + Math.random() * 0.2); // 100-300ms between keystrokes
  }
  
  // Simulate user pause after completing search
  sleep(2 + Math.random() * 3); // 2-5 seconds
}

export function handleSummary(data) {
  return {
    'concurrent-users-results.json': JSON.stringify(data, null, 2),
  };
}