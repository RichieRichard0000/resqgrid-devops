// ==============================================================================
// Live Performance Benchmark & Metrics Verification
// Project: ResQGrid — Real-Time Disaster Alert & Response Platform
// ==============================================================================

import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(95)<100'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate==1.0']
  }
};

export default function () {
  const url = __ENV.TARGET_URL || 'http://localhost:4000/health/live';
  const res = http.get(url);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'color header is blue': (r) => r.headers['X-Release-Color'] === 'blue'
  });
}
