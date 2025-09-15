import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestCount = new Counter('total_requests');
const spikeRecoveryTime = new Trend('spike_recovery_time');

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Normal load
    { duration: '30s', target: 10 },  // Stay at normal load
    { duration: '10s', target: 500 }, // Spike to 500 users (very sudden)
    { duration: '1m', target: 500 },  // Stay at spike level
    { duration: '10s', target: 10 },  // Drop back to normal
    { duration: '2m', target: 10 },   // Recovery period
    { duration: '10s', target: 1000 }, // Even bigger spike
    { duration: '30s', target: 1000 }, // Stay at extreme spike
    { duration: '10s', target: 10 },   // Drop back to normal
    { duration: '2m', target: 10 },    // Final recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // Allow higher response times during spikes
    http_req_failed: ['rate<0.1'],     // 10% error rate acceptable during spikes
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'http://localhost:3001';

// Queries that might cause different load patterns
const lightQueries = ['a', 'b', 'c', 'd', 'e']; // Short, likely to have many results
const mediumQueries = ['to', 'ne', 'lo', 'pa', 'be']; // Medium complexity
const heavyQueries = ['test', 'search', 'query', 'data', 'info']; // Longer, more processing

let spikeStartTime = null;
let normalLoadEstablished = false;

export default function () {
  const currentVUs = __ENV.K6_VUS || 1;
  
  // Detect spike conditions
  const isSpike = currentVUs > 100;
  const isRecovery = !isSpike && spikeStartTime !== null;
  
  if (isSpike && spikeStartTime === null) {
    spikeStartTime = Date.now();
    console.log(`Spike detected at VUs: ${currentVUs}`);
  }
  
  if (isRecovery && !normalLoadEstablished) {
    const recoveryTime = Date.now() - spikeStartTime;
    spikeRecoveryTime.add(recoveryTime);
    normalLoadEstablished = true;
    spikeStartTime = null;
    console.log(`Recovery completed in ${recoveryTime}ms`);
  }
  
  // Select query type based on load level
  let queries;
  if (isSpike) {
    // During spikes, use a mix but favor lighter queries
    const rand = Math.random();
    if (rand < 0.5) {
      queries = lightQueries;
    } else if (rand < 0.8) {
      queries = mediumQueries;
    } else {
      queries = heavyQueries;
    }
  } else {
    // Normal load - balanced mix
    const rand = Math.random();
    if (rand < 0.33) {
      queries = lightQueries;
    } else if (rand < 0.66) {
      queries = mediumQueries;
    } else {
      queries = heavyQueries;
    }
  }
  
  const query = queries[Math.floor(Math.random() * queries.length)];
  
  // Adjust request timeout based on load
  const timeout = isSpike ? '30s' : '10s';
  
  const start = Date.now();
  const response = http.get(`${BASE_URL}/api/search?query=${query}&limit=5`, {
    timeout: timeout,
    tags: { 
      load_type: isSpike ? 'spike' : 'normal',
      query_complexity: queries === lightQueries ? 'light' : 
                       queries === mediumQueries ? 'medium' : 'heavy'
    }
  });
  const end = Date.now();
  
  const duration = end - start;
  responseTime.add(duration);
  requestCount.add(1);
  
  const result = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time under threshold': (r) => {
      // More lenient thresholds during spikes
      const threshold = isSpike ? 5000 : 1000;
      return r.timings.duration < threshold;
    },
    'valid JSON response': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
    'has suggestions array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.suggestions);
      } catch (e) {
        return false;
      }
    },
    'server not overloaded': (r) => r.status !== 503 && r.status !== 502,
  });
  
  errorRate.add(!result);
  
  // Test system recovery by checking health endpoint during spikes
  if (isSpike && Math.random() < 0.1) {
    const healthResponse = http.get(`${BASE_URL}/health`, {
      timeout: '5s',
      tags: { endpoint: 'health', load_type: 'spike' }
    });
    
    check(healthResponse, {
      'health endpoint responsive': (r) => r.status === 200,
      'health response time acceptable': (r) => r.timings.duration < 2000,
    });
  }
  
  // Adjust sleep time based on load
  if (isSpike) {
    // During spikes, reduce think time to increase pressure
    sleep(Math.random() * 0.5 + 0.1); // 0.1-0.6 seconds
  } else {
    // Normal think time
    sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
  }
}

export function setup() {
  console.log('Starting spike test...');
  
  // Verify system is ready
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error('System not ready for spike test');
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const totalDuration = Date.now() - data.startTime;
  console.log(`Spike test completed in ${totalDuration}ms`);
  
  // Final health check
  const finalHealthCheck = http.get(`${BASE_URL}/health`);
  console.log(`Final health check status: ${finalHealthCheck.status}`);
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    test_type: 'spike_test',
    duration_ms: data.state.testRunDurationMs,
    metrics: {
      http_reqs: data.metrics.http_reqs,
      http_req_duration: data.metrics.http_req_duration,
      http_req_failed: data.metrics.http_req_failed,
      errors: data.metrics.errors,
      response_time: data.metrics.response_time,
      total_requests: data.metrics.total_requests,
      spike_recovery_time: data.metrics.spike_recovery_time,
      vus: data.metrics.vus,
      vus_max: data.metrics.vus_max
    },
    thresholds: data.thresholds,
    
    // Spike-specific analysis
    spike_analysis: {
      max_concurrent_users: data.metrics.vus_max.max,
      peak_response_time: data.metrics.http_req_duration.max,
      error_rate_during_spike: data.metrics.http_req_failed.rate,
      total_requests_during_test: data.metrics.http_reqs.count,
      average_recovery_time: data.metrics.spike_recovery_time ? data.metrics.spike_recovery_time.avg : null
    }
  };

  return {
    'spike-test-results.json': JSON.stringify(summary, null, 2),
    'stdout': `
Spike Test Summary:
==================
Test Duration: ${(data.state.testRunDurationMs / 1000 / 60).toFixed(2)} minutes
Total Requests: ${data.metrics.http_reqs.count}
Max Concurrent Users: ${data.metrics.vus_max.max}
Peak Response Time: ${data.metrics.http_req_duration.max.toFixed(2)}ms
Average Response Time: ${data.metrics.http_req_duration.avg.toFixed(2)}ms
95th Percentile: ${data.metrics.http_req_duration['p(95)'].toFixed(2)}ms
Error Rate: ${(data.metrics.http_req_failed.rate * 100).toFixed(2)}%
System Recovery: ${data.metrics.spike_recovery_time ? 'Measured' : 'Not measured'}

Spike Test Analysis:
- System handled ${data.metrics.vus_max.max} concurrent users
- Error rate remained ${(data.metrics.http_req_failed.rate * 100).toFixed(2)}% during spikes
- Peak response time: ${data.metrics.http_req_duration.max.toFixed(2)}ms
    `
  };
}