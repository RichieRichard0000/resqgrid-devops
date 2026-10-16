// ==============================================================================
// k6 Scenario 1: Baseline Steady-State Load
// Project: ResQGrid — Real-Time Disaster Alert & Response Platform
// Goal: Validate system performance at normal operational traffic (10 VUs)
// Expected Replica Count: Exactly 2 replicas (minReplicas)
// ==============================================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { ENDPOINTS, COMMON_HEADERS } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Warm up to 10 virtual users
    { duration: '2m',  target: 10 },  // Steady baseline load for 2 minutes
    { duration: '15s', target: 0 }    // Graceful wind down
  ],
  thresholds: {
    // 95% of requests must complete within 250ms
    http_req_duration: ['p(95)<250'],
    // Less than 1% failed requests allowed
    http_req_failed: ['rate<0.01'],
    // 99% of checks must pass
    checks: ['rate>0.99']
  }
};

export default function () {
  // 1. Health check
  const healthRes = http.get(ENDPOINTS.health, { headers: COMMON_HEADERS });
  check(healthRes, {
    'health returns 200': (r) => r.status === 200,
    'health status is ok': (r) => {
      try {
        return JSON.parse(r.body).status === 'ok';
      } catch (e) {
        return false;
      }
    }
  });

  sleep(0.5);

  // 2. Incident list query
  const listRes = http.get(ENDPOINTS.listIncidents, { headers: COMMON_HEADERS });
  check(listRes, {
    'list incidents returns 200': (r) => r.status === 200,
    'list contains success field': (r) => {
      try {
        return JSON.parse(r.body).success === true;
      } catch (e) {
        return false;
      }
    }
  });

  sleep(1);

  // 3. PostGIS Spatial proximity query
  const nearbyRes = http.get(ENDPOINTS.nearbyIncidents(), { headers: COMMON_HEADERS });
  check(nearbyRes, {
    'nearby incidents returns 200': (r) => r.status === 200,
    'nearby incidents has array data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    }
  });

  sleep(1);
}
