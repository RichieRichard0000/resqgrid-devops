// ==============================================================================
// k6 Scenario 4: Recovery & Scale-Down Observation
// Project: ResQGrid — Real-Time Disaster Alert & Response Platform
// Goal: Validate graceful traffic decline and monitor HPA 300s scale-down stabilization
// Target Replica Progression: 6 -> 4 -> 2 replicas (Returning to baseline)
// ==============================================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { ENDPOINTS, COMMON_HEADERS } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 80 },  // Maintain moderate traffic
    { duration: '30s', target: 10 },  // Steep drop to near-idle load
    { duration: '6m',  target: 5 },   // Hold low traffic for 6 mins to observe the 300s (5m) HPA scale-down window
    { duration: '30s', target: 0 }    // Complete test
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99']
  }
};

export default function () {
  // Low-intensity requests to keep health and metrics active while pods scale down
  const res = http.get(ENDPOINTS.health, { headers: COMMON_HEADERS });

  check(res, {
    'recovery health check returns 200': (r) => r.status === 200
  });

  sleep(1);
}
