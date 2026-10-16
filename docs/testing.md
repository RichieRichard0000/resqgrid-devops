# ResQGrid Automated Testing Documentation (Phase 1)

This document describes the automated test architecture, coverage, mocking strategies, and commands used to verify Phase 1 of ResQGrid.

---

## 1. Testing Frameworks & Philosophy

- **Backend:** Vitest + Supertest
- **Frontend:** Vitest + React Testing Library (RTL) + jsdom
- **Mocking Policy:** External network dependencies (USGS GeoJSON feeds, Open-Meteo APIs) and database pools are completely mocked in automated test suites so tests run reliably, fast, and offline.
- **Independence:** Tests do not require external third-party services or live cloud infrastructure to pass.

---

## 2. Test Suites Summary

### Backend Suites (`backend/tests/`):
| Test File | Target Area | Tests | Key Validations |
|---|---|---|---|
| `unit/geo.test.ts` | Haversine & Geofencing | 9 | Distance calculations between coordinates, symmetry, inside vs outside radius boundary matching |
| `unit/validation.test.ts` | Zod Validation Schemas | 12 | Coordinate bounds (lat -90..90, lon -180..180), incident payloads, status enums, auth schemas |
| `unit/providers.test.ts` | Ingestion Providers | 11 | Offline simulated provider, USGS GeoJSON parsing, HTTP 500 resilience, AbortController timeouts, Open-Meteo fallbacks |
| `unit/migrations.test.ts` | Schema & Migrations | 6 | 001..004 SQL syntax, PostGIS extensions, GiST indexing, seed idempotence (`ON CONFLICT`) |
| `integration/health.test.ts` | Observability Endpoints | 4 | `/health/live` (process liveness), `/health/ready` (DB readiness and 503 error handling), `/metrics` (Prometheus) |
| `integration/api.test.ts` | REST API & RBAC | 13 | Login, JWT auth, 401 unauthenticated, 403 viewer role restriction, 201 responder creation, 404 handling, simulation trigger |
| `integration/socket.test.ts` | Socket.IO Real-Time | 4 | WebSocket connection, geofence subscription, inside-radius targeted alert delivery, outside-radius suppression |

**Total Backend Tests: 59 Passing**

### Frontend Suites (`frontend/tests/`):
| Test File | Target Component | Tests | Key Validations |
|---|---|---|---|
| `IncidentCard.test.tsx` | Incident Card | 6 | Title, severity badges, "Simulated Drill" vs "Official" badge distinction, distance formatting, click selection |
| `IncidentList.test.tsx` | Feed Container | 4 | Loading skeleton state, error retry state, empty feed state, card list rendering |
| `FilterBar.test.tsx` | Filter Toolbar | 4 | Hazard type pills (flood, earthquake, etc.), severity pills, official vs simulated toggle, search text filtering |
| `Header.test.tsx` | Header & Status | 5 | Application branding, real-time connection badge (connected, connecting, offline), simulation button callback |
| `LocationControl.test.tsx` | GPS Control | 3 | "Enable My Location" button, granted coordinates display, radius presets (10km..250km), permission denial handling |

**Total Frontend Tests: 22 Passing**

**Combined Total: 81 Automated Tests (100% Pass Rate)**

---

## 3. How to Run the Tests

### Run All Tests Across Entire Monorepo:
```bash
npm run test
```

### Run Backend Tests Only:
```bash
npm run test:backend
# or
cd backend && npm run test
```

### Run Frontend Tests Only:
```bash
npm run test:frontend
# or
cd frontend && npm run test
```

### Run TypeScript Linting & Type Checks:
```bash
npm run lint
```

---

## 4. Verification Results Log

```text
> resqgrid-backend@1.0.0 test
> vitest run

 RUN  v2.1.9 C:/Users/baran/Downloads/Devops_project/backend

 ✓ tests/unit/migrations.test.ts (6 tests)
 ✓ tests/unit/geo.test.ts (9 tests)
 ✓ tests/unit/validation.test.ts (12 tests)
 ✓ tests/unit/providers.test.ts (11 tests)
 ✓ tests/integration/health.test.ts (4 tests)
 ✓ tests/integration/socket.test.ts (4 tests)
 ✓ tests/integration/api.test.ts (13 tests)

 Test Files  7 passed (7)
      Tests  59 passed (59)

> resqgrid-frontend@1.0.0 test
> vitest run

 RUN  v2.1.9 C:/Users/baran/Downloads/Devops_project/frontend

 ✓ tests/IncidentCard.test.tsx (6 tests)
 ✓ tests/Header.test.tsx (5 tests)
 ✓ tests/LocationControl.test.tsx (3 tests)
 ✓ tests/FilterBar.test.tsx (4 tests)
 ✓ tests/IncidentList.test.tsx (4 tests)

 Test Files  5 passed (5)
      Tests  22 passed (22)
```
