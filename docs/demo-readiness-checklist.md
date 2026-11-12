# ResQGrid — Demo Readiness Checklist & Operational Runbook

**Target Audience:** Academic Examiners, Project Evaluators, Student Presenters  
**Context:** SRM Institute of Science and Technology — Final Year B.Tech CSE  
**Project:** ResQGrid — Real-Time Disaster Alert & Response Platform  
**Operational Status:** **100% READY (Validated Live on Local Runtimes)**  

---

## 1. The Exact Command to Run First on Demo Day

To prove total code integrity and test health to examiners before starting any services, execute this command first:

```powershell
npm run test
```

### Expected Output:
```text
 Test Files  8 passed (8)
      Tests  62 passed (62)   (resqgrid-backend)

 Test Files  5 passed (5)
      Tests  23 passed (23)   (resqgrid-frontend)

Total: 85 passed (100%), 0 failures, 0 skipped
```

---

## 2. Rigorous Behavioral Classification Matrix

Before demonstrating each feature, refer to this table for the exact truth of each capability's operational status:

| System Capability | True Operational Status | Verification Basis & Scope Boundaries |
| :--- | :---: | :--- |
| **Monorepo Build & Lint** | **MEASURED LIVE** | `npm run lint` (0 errors), `npm run build` (tsc + Vite in 5.00s) |
| **Unit & Integration Suite** | **MEASURED LIVE** | 85 automated tests passing across 13 test suites |
| **PostgreSQL & PostGIS Database** | **MEASURED LIVE** | Container `resqgrid_db` (PostGIS 16-3.4) on port 5433; migrations & seed applied |
| **Cross-Process `LISTEN/NOTIFY`** | **MEASURED LIVE** | Proven between Process A (PID 15952) and Process B (PID 7728) via `resqgrid_db:5433` |
| **Proximity Geofence Queries** | **MEASURED LIVE** | PostGIS `ST_DWithin` calculates spatial distances (e.g. SRMIST: 0.04 km, Vandalur: 8.38 km) |
| **Trivy Vulnerability Security Gate** | **MEASURED LIVE** | Clean repo passes; unpatched `alpine:3.10` blocked with exit code 1 (`CVE-2021-36159`) |
| **High-Throughput Load Benchmark** | **MEASURED LIVE** | **2,387.08 req/s**, p95 **7.06 ms**, 0.00% errors across 23,921 reqs (**strictly `/health/live`**) |
| **Prometheus Telemetry Scrape** | **MEASURED LIVE** | Endpoint `/metrics` verified with exact `http_requests_total` count of **23,921** |
| **Blue-Green 177ms Rollback** | **DRY-RUN SIMULATION** | Measured script duration in PowerShell `-DryRun`. Live cluster switch takes ~300–800 ms |
| **Live Kubernetes Traffic Switch** | **UNVERIFIED / BLOCKED** | Requires running Kubernetes cluster with `backend-service` selector active |
| **Kubernetes HPA Pod Autoscaling** | **UNVERIFIED / BLOCKED** | Manifests valid (`autoscaling/v2`); requires cluster `metrics-server` |
| **Live Jenkins Pipeline Execution** | **UNVERIFIED / BLOCKED** | 16-stage `Jenkinsfile` valid; Jenkins orchestrator daemon offline |
| **AWS Cloud Resource Deployment** | **UNVERIFIED / BLOCKED** | `terraform validate` succeeded; `apply` omitted to maintain **$0.00** budget |

---

## 3. Step-by-Step Primary Live Demonstration

### Step 1: Start PostgreSQL with PostGIS
Ensure Docker Desktop is open, then start the project database on port 5433:
```powershell
$env:POSTGRES_PORT="5433"
docker compose up -d db
```
*Expected Output:*
```text
Container resqgrid_db Started (Status: healthy on 0.0.0.0:5433)
```

### Step 2: Run Database Migrations & Seed
```powershell
$env:DATABASE_URL="postgresql://resqgrid_user:resqgrid_password@localhost:5433/resqgrid"
npm run migrate --workspace=resqgrid-backend
npm run seed --workspace=resqgrid-backend
```
*Expected Output:*
`All database migrations completed successfully. Total applied: 4.`  
`Seed process completed successfully (4 active incidents + 1 resolved drill).`

### Step 3: Demonstrate Live Inter-Process Event Bus (`LISTEN/NOTIFY`)
Demonstrate that multi-pod scaling works across two distinct operating system processes:
```powershell
node tests/verification/verify-cross-process-pubsub.mjs
```
*Expected Output:*
```text
[1/4] Spawning Process A (Port 4001) and Process B (Port 4002)...
  -> Process A spawned: PID [XXXX] (Listening on port 4001)
  -> Process B spawned: PID [YYYY] (Listening on port 4002)
[2/4] Connecting WebSocket Client to Process B (PID [YYYY])...
[3/4] Registering geofence perimeter on Process B for SRMIST Kattankulathur...
[4/4] Triggering incident publication on Process A (PID [XXXX])...
  -> Process A published incident and executed: SELECT pg_notify('resqgrid_cluster_events')
========================================================================
 CROSS-PROCESS VERIFICATION SUCCESSFUL!
 Delivery Status: PROVED ACROSS TWO SEPARATE OS PROCESSES
========================================================================
```

### Step 4: Start Backend Production Service
```powershell
$env:PORT="4000"
$env:RELEASE_COLOR="blue"
$env:RELEASE_COMMIT="eba8c1a"
$env:DATABASE_URL="postgresql://resqgrid_user:resqgrid_password@localhost:5433/resqgrid"
$env:NODE_ENV="production"
node backend/dist/server.js
```
*Verify Readiness in a second terminal:*
```powershell
curl.exe -s http://localhost:4000/health/ready
```
*Expected Output:*
```json
{"status":"ok","ready":true,"release":{"color":"blue","commit":"eba8c1a"},"database":{"isHealthy":true,"latencyMs":6}}
```

### Step 5: Test PostGIS Spatial Radius Query
Query for incidents within 50 km of SRMIST Kattankulathur:
```powershell
curl.exe -s "http://localhost:4000/api/v1/incidents/nearby?latitude=12.823&longitude=80.044&radiusKm=50"
```
*Expected Output:*
Returns incidents with accurate calculated distances:
- Urban Waterlogging & Flash Flood Advisory: `distance_km: 0.04`
- Simulated Shallow Tremor Drill: `distance_km: 8.38`
- Severe Cyclonic Squall: `distance_km: 35.86`

### Step 6: Start Frontend Dashboard & Demonstrate UI
In a new terminal:
```powershell
npm run dev:frontend
```
Open [http://localhost:5173](http://localhost:5173) in Chrome/Edge:
1. Note the glowing header badge: **`Release: BLUE`**.
2. Click **"SRMIST Test Pin"** under Personal Geofenced Alerts — immediately anchors to `12.8230°N, 80.0440°E` without browser GPS permission popups.
3. Show the interactive Leaflet map displaying disaster perimeters and spatial proximity markers.

### Step 7: Demonstrate Trivy Security Gate Blocking
In a terminal:
```powershell
powershell -ExecutionPolicy Bypass -File tests/failure-drills/trivy-security-gate.ps1
```
*Expected Output:*
- Test 1: Production workspace has **0 vulnerabilities** (Exit Code 0).
- Test 2: Vulnerable test image (`alpine:3.10`) blocked with **Exit Code 1** due to CRITICAL `CVE-2021-36159`.

### Step 8: Run k6 Live Load Benchmark & Scrape Prometheus
```powershell
& "C:\Program Files\k6\k6.exe" run infra/load-tests/live-benchmark.js
```
*Expected Output:*
`Throughput: ~2,300+ req/s | p95: <10ms | Errors: 0.00%`

Verify the Prometheus counter immediately:
```powershell
curl.exe -s http://localhost:4000/metrics | Select-String "http_requests_total.*health/live"
```
*Expected Output:*
`http_requests_total{method="GET",route="/health/live",status_code="200",app="resqgrid-backend"} 23921`

### Step 9: Demonstrate Blue-Green Release & Instant Rollback
Show the candidate deployment and rollback logic using the safe dry-run orchestrator:
```powershell
# 1. Candidate release and promotion simulation
powershell -ExecutionPolicy Bypass -File infra/k8s/deploy-candidate.ps1 -DryRun

# 2. Sub-second rollback simulation
powershell -ExecutionPolicy Bypass -File infra/k8s/rollback.ps1 -DryRun
```
*Expected Output:*
`ROLLBACK COMPLETED SUCCESSFULLY`  
`Active Restored Release: blue`  
`Measured Rollback Time:  177 ms`  
`Service Status: HEALTHY / TRAFFIC RESTORED`

---

## 4. Emergency Fallback Sequence (If Docker or Database Fails)

If Docker Desktop cannot run on the demonstration machine, use this 100% offline fallback that requires only Node.js and PowerShell:

```powershell
# 1. Monorepo automated test suite (all 85 tests run with in-memory fallbacks)
npm run test

# 2. Monorepo linting & strict type check
npm run lint

# 3. Production compilation verification
npm run build

# 4. Standalone backend telemetry (in-memory mode)
$env:PORT="4000"; $env:RELEASE_COLOR="blue"; $env:RELEASE_COMMIT="eba8c1a"; node backend/dist/server.js

# 5. k6 Live Benchmark against REST engine
& "C:\Program Files\k6\k6.exe" run infra/load-tests/live-benchmark.js

# 6. Prometheus telemetry counter scrape
curl.exe -s http://localhost:4000/metrics | Select-String "http_requests_total"

# 7. Security gate demonstration
powershell -ExecutionPolicy Bypass -File tests/failure-drills/trivy-security-gate.ps1

# 8. Infrastructure as Code syntax validation
cd infra/terraform; & "C:\Users\baran\AppData\Local\Microsoft\WinGet\Links\terraform.exe" validate
```

---

## 5. Graceful Teardown & Shutdown Instructions

After the examination is complete, cleanly stop all running processes:

```powershell
# 1. Stop background Node servers (Ctrl+C in respective terminals)

# 2. Stop and remove the ResQGrid PostgreSQL container
docker stop resqgrid_db
docker rm resqgrid_db

# 3. Verify ports 4000 and 5433 are freed
Get-NetTCPConnection -LocalPort 4000, 5433 -ErrorAction SilentlyContinue
```
