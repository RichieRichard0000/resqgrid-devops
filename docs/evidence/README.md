# ResQGrid — Empirical Verification Evidence Index

This directory archives raw, unedited execution logs, metrics scrapes, and terminal outputs captured during integration audits.

---

## Evidence Manifest

| File | Type | Verification Scope | Measured Metric / Key Finding |
| :--- | :--- | :--- | :--- |
| **[`k6-live-benchmark.log`](file:///c:/Users/baran/Downloads/Devops_project/docs/evidence/k6-live-benchmark.log)** | Load Test Telemetry | Bounded load test against running Node.js backend | **2,387.08 req/s**, p95: **7.06 ms**, 0.00% error rate across 23,921 HTTP requests |
| **[`metrics-scrape.txt`](file:///c:/Users/baran/Downloads/Devops_project/docs/evidence/metrics-scrape.txt)** | Telemetry Scrape | Prometheus `/metrics` endpoint verification | Recorded exact `http_requests_total` counter of **23,921** matching k6 test volume |
| **[`trivy-security-gate.log`](file:///c:/Users/baran/Downloads/Devops_project/docs/evidence/trivy-security-gate.log)** | Security Pipeline | Aqua Trivy vulnerability scanner gate | Proved gate rejection on vulnerable `alpine:3.10` (**Exit code 1** on CVE-2021-36159) while passing clean repo |
| **[`cross-process-pubsub.log`](file:///c:/Users/baran/Downloads/Devops_project/docs/evidence/cross-process-pubsub.log)** | IPC Event Bus | Real PostgreSQL LISTEN/NOTIFY across 2 Node PIDs | Event published on Process A (PID 15952) delivered to client on Process B (PID 7728) |

---

## Reproducing Evidence Artifacts

### 1. Reproduce Load Benchmark & Scrape
```powershell
# In terminal 1: Start backend
$env:PORT="4000"; $env:RELEASE_COLOR="blue"; $env:RELEASE_COMMIT="eba8c1a"; node backend/dist/server.js

# In terminal 2: Execute benchmark
& "C:\Program Files\k6\k6.exe" run infra/load-tests/live-benchmark.js

# In terminal 2: Scrape Prometheus telemetry
curl.exe -s http://localhost:4000/metrics | Select-String "http_requests_total"
```

### 2. Reproduce Trivy Security Gate
```powershell
powershell -ExecutionPolicy Bypass -File tests/failure-drills/trivy-security-gate.ps1
```

### 3. Reproduce Cross-Process PostgreSQL LISTEN/NOTIFY
```powershell
# Requires resqgrid_db running on port 5433
node tests/verification/verify-cross-process-pubsub.mjs
```
