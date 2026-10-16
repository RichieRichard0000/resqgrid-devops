// ==============================================================================
// k6 Scenario 3: Stress / Spike Load (HPA Trigger Test)
// Project: ResQGrid — Real-Time Disaster Alert & Response Platform
// Goal: Generate sustained CPU load (>60%) to trigger Kubernetes HPA scale-up
// Target Replica Progression: 2 -> 4 -> 6 replicas (Cluster Maximum)
// ==============================================================================

import http from 'k6/http';
import { check } from 'k6';
import { ENDPOINTS, COMMON_HEADERS } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Quick jump to 50 VUs
    { duration: '1m',  target: 150 }, // Aggressive surge to 150 VUs
    { duration: '3m',  target: 180 }, // Sustain peak stress to trigger HPA evaluation cycle
    { duration: '30s', target: 20 }   // Drop back down to observe stabilization
  ],
  thresholds: {
    // Under extreme spike conditions, maintain <5% failure rate
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95']
  }
};

export default function () {
  // Fire high-frequency PostGIS spatial queries across expanding radii
  // Calculating geographic ST_DWithin distances across thousands of polygons/points
  // drives realistic CPU consumption without artificial synthetic spin loops.
  const radii = [10, 25, 50, 100, 200];
  const radius = radii[Math.floor(Math.random() * radii.length)];
  const lat = 12.823 + (Math.random() - 0.5) * 0.2;
  const lon = 80.045 + (Math.random() - 0.5) * 0.2;

  const res = http.get(ENDPOINTS.nearbyIncidents(lat, lon, radius), {
    headers: COMMON_HEADERS,
    timeout: '5s'
  });

  check(res, {
    'spike query status is 200 or 429': (r) => r.status === 200 || r.status === 429
  });

  // Zero or minimal sleep to sustain high request pressure
}
