// ==============================================================================
// k6 Load Test Configuration & Helpers
// Project: ResQGrid — Real-Time Disaster Alert & Response Platform
// ==============================================================================

export const BASE_URL = __ENV.TARGET_URL || 'http://localhost:4000';

// Realistic geographic coordinates centered around SRMIST Kattankulathur
export const SRMIST_COORDS = {
  latitude: 12.823,
  longitude: 80.045,
  radiusKm: 30
};

export const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'ResQGrid-k6-LoadTest/2.0'
};

export const ENDPOINTS = {
  health: `${BASE_URL}/health`,
  metrics: `${BASE_URL}/metrics`,
  listIncidents: `${BASE_URL}/api/incidents?page=1&limit=20`,
  nearbyIncidents: (lat = SRMIST_COORDS.latitude, lon = SRMIST_COORDS.longitude, r = SRMIST_COORDS.radiusKm) =>
    `${BASE_URL}/api/incidents/nearby?latitude=${lat}&longitude=${lon}&radiusKm=${r}`,
  filterByType: (type = 'earthquake') => `${BASE_URL}/api/incidents?type=${type}&page=1&limit=20`
};
