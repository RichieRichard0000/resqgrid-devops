// ==============================================================================
// k6 Candidate Pre-Promotion Smoke Test Suite
// Project: ResQGrid — Real-Time Disaster Alert & Response Platform
// Principle: Verify candidate health, API integrity & release identity before traffic switch
// ==============================================================================

import http from 'k6/http';
import { check, fail } from 'k6';

const TARGET_URL = __ENV.TARGET_URL || 'http://localhost:4000';
const EXPECTED_COLOR = __ENV.EXPECTED_COLOR || ''; // 'blue' or 'green'
const EXPECTED_COMMIT = __ENV.EXPECTED_COMMIT || '';
const SIMULATE_FAILURE = __ENV.SIMULATE_FAILURE === 'true';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'], // 100% of candidate checks must pass
    http_req_failed: ['rate==0.0']
  }
};

export default function () {
  console.log(`[SmokeTest] Validating Candidate at ${TARGET_URL}`);
  if (EXPECTED_COLOR) {
    console.log(`[SmokeTest] Expecting Release Color: ${EXPECTED_COLOR}`);
  }

  // Failure simulation hook for controlled Scenario A/B testing
  if (SIMULATE_FAILURE) {
    console.error('[SmokeTest] SIMULATE_FAILURE trigger active: deliberately failing candidate verification!');
    check(false, {
      'candidate pre-promotion validation': () => false
    });
    return;
  }

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'ResQGrid-SmokeTest/3.0'
  };

  // 1. Candidate Liveness Probe
  const liveRes = http.get(`${TARGET_URL}/health/live`, { headers });
  const liveOk = check(liveRes, {
    'liveness returns 200': (r) => r.status === 200,
    'liveness status is ok': (r) => {
      try {
        return JSON.parse(r.body).status === 'ok';
      } catch {
        return false;
      }
    }
  });

  if (!liveOk) {
    fail('Candidate liveness probe failed!');
  }

  // 2. Candidate Readiness Probe
  const readyRes = http.get(`${TARGET_URL}/health/ready`, { headers });
  const readyOk = check(readyRes, {
    'readiness returns 200': (r) => r.status === 200,
    'database is connected': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.ready === true && body.database.isHealthy === true;
      } catch {
        return false;
      }
    }
  });

  if (!readyOk) {
    fail('Candidate readiness probe failed (database unreachable or unready)!');
  }

  // 3. Release Identity & Color Verification
  const versionRes = http.get(`${TARGET_URL}/health/version`, { headers });
  const versionOk = check(versionRes, {
    'version returns 200': (r) => r.status === 200,
    'color matches candidate': (r) => {
      if (!EXPECTED_COLOR) return true;
      try {
        const body = JSON.parse(r.body);
        const headerColor = r.headers['X-Release-Color'] || r.headers['x-release-color'];
        return body.color === EXPECTED_COLOR && headerColor === EXPECTED_COLOR;
      } catch {
        return false;
      }
    }
  });

  if (!versionOk) {
    fail(`Candidate release identity check failed! Expected: ${EXPECTED_COLOR}`);
  }

  // 4. Critical API Endpoint: Incident Query
  const incidentsRes = http.get(`${TARGET_URL}/api/v1/incidents?page=1&limit=5`, { headers });
  const incidentsOk = check(incidentsRes, {
    'incidents API returns 200': (r) => r.status === 200,
    'incidents has success flag': (r) => {
      try {
        return JSON.parse(r.body).success === true;
      } catch {
        return false;
      }
    }
  });

  if (!incidentsOk) {
    fail('Candidate incident API verification failed!');
  }

  // 5. PostGIS Proximity Endpoint
  const nearbyRes = http.get(`${TARGET_URL}/api/v1/incidents/nearby?latitude=12.823&longitude=80.045&radiusKm=50`, { headers });
  const nearbyOk = check(nearbyRes, {
    'nearby incidents returns 200': (r) => r.status === 200,
    'spatial query returns array': (r) => {
      try {
        const b = JSON.parse(r.body);
        return b.success === true && Array.isArray(b.data);
      } catch {
        return false;
      }
    }
  });

  if (!nearbyOk) {
    fail('Candidate PostGIS proximity spatial query failed!');
  }

  console.log('=== [SmokeTest] All Candidate Checks PASSED! Approved for Promotion. ===');
}
