// ==============================================================================
// k6 Scenario 2: Moderate Traffic Ramp-Up
// Project: ResQGrid — Real-Time Disaster Alert & Response Platform
// Goal: Measure latency curve as traffic ramps from 10 to 60 concurrent users
// Expected Replica Count: Transitions from 2 -> 3 replicas
// ==============================================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { ENDPOINTS, COMMON_HEADERS } from './config.js';

export const options = {
  stages: [
    { duration: '1m', target: 20 }, // Step 1: Ramp to 20 VUs
    { duration: '2m', target: 40 }, // Step 2: Ramp to 40 VUs
    { duration: '2m', target: 60 }, // Step 3: Peak at 60 VUs
    { duration: '1m', target: 0 }   // Cool down
  ],
  thresholds: {
    // 95% of requests must complete within 600ms under moderate ramp
    http_req_duration: ['p(95)<600'],
    http_req_failed: ['rate<0.02'],
    checks: ['rate>0.98']
  }
};

export default function () {
  // Rotate between different endpoints to simulate real user navigation
  const choice = Math.random();

  if (choice < 0.4) {
    // Spatial proximity query with random coordinate jitter
    const jitterLat = 12.823 + (Math.random() - 0.5) * 0.1;
    const jitterLon = 80.045 + (Math.random() - 0.5) * 0.1;
    const res = http.get(ENDPOINTS.nearbyIncidents(jitterLat, jitterLon, 25), { headers: COMMON_HEADERS });
    check(res, {
      'spatial query returns 200': (r) => r.status === 200
    });
  } else if (choice < 0.7) {
    // Filtered incident search
    const res = http.get(ENDPOINTS.filterByType('flood'), { headers: COMMON_HEADERS });
    check(res, {
      'filter query returns 200': (r) => r.status === 200
    });
  } else {
    // General incident list pagination
    const res = http.get(ENDPOINTS.listIncidents, { headers: COMMON_HEADERS });
    check(res, {
      'incident list returns 200': (r) => r.status === 200
    });
  }

  sleep(Math.random() * 0.5 + 0.2); // Random thinking time between 200ms and 700ms
}
