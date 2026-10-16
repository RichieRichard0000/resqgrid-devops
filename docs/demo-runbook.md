# ResQGrid — 5–8 Minute Academic Defense & Live Demonstration Script

**Academic Evaluation Context:** SRM Institute of Science and Technology — Final Year B.Tech CSE  
**Project Title:** ResQGrid — Real-Time Disaster Alert and Response Platform  
**Target Audience:** Project Guide, External Examiners, Department Evaluators  
**Total Allocated Duration:** 8 Minutes Max (6 Minutes Demo + 2 Minutes Q&A)  

---

## 1. Quick Presentation Checklist

Before inviting evaluators to observe the screen, verify that the following components are ready:

- [ ] Repository is on clean Git branch `main` at commit [`546cae7`](file:///c:/Users/baran/Downloads/Devops_project).
- [ ] Terminal 1: Ready to execute automated tests or release scripts.
- [ ] Terminal 2: Ready to execute k6 load testing or curl probes.
- [ ] Browser Tab 1: ResQGrid Interactive Dashboard ([http://localhost:3000](http://localhost:3000)).
- [ ] Browser Tab 2: Grafana Monitoring Dashboard ([http://localhost:3001](http://localhost:3001)).
- [ ] Browser Tab 3: Jenkins CI/CD Pipeline Dashboard (or terminal log).
- [ ] Clean test credentials noted: `admin@resqgrid.local` / `Admin123!`.

---

## 2. Chronological 8-Minute Demonstration Script

```mermaid
timeline
    title 8-Minute Examination Sequence
    0:00 - 1:00 : Architecture & Problem Statement
    1:00 - 2:30 : Live Geofencing & Real-Time Alerting
    2:30 - 3:45 : Shift-Left Security & Vulnerability Gates
    3:45 - 5:15 : Blue-Green Traffic Switch & UI Sync
    5:15 - 6:30 : Failure Scenario & 177ms Instant Rollback
    6:30 - 7:30 : k6 Stress Test, HPA & Grafana Dashboards
    7:30 - 8:00 : FinOps AWS Economics ($36.92/mo) & Q&A
```

### Minute 0:00 – 1:00 | Architecture & Problem Statement
- **Speaker:** Lead Engineer / Presenter
- **Action:** Present the master architecture diagram ([docs/final-architecture.md](file:///c:/Users/baran/Downloads/Devops_project/docs/final-architecture.md)).
- **Talking Points:**
  > *"Good morning respected evaluators. During regional disasters such as the Chennai floods or seismic events, sirens and television broadcasts fail to notify citizens based on their precise spatial hazard perimeter. ResQGrid is an event-driven disaster alert platform combining PostgreSQL PostGIS spatial queries with Socket.IO WebSockets.*  
  > *From a Cloud and DevOps perspective, our evaluation focuses on zero-trust CI/CD with Jenkins, container hardening, immutable Amazon ECR image distribution, Kubernetes k3s orchestration, HPA pod autoscaling, full white-box observability with Prometheus and Grafana, and atomic Blue-Green deployments with sub-second rollback."*

---

### Minute 1:00 – 2:30 | Live Geofencing & Real-Time Alerting
- **Action:** Open Dashboard in Browser Tab 1.
- **Demo Sequence:**
  1. Show the OpenStreetMap interface with disaster markers.
  2. Click **"Enable My Location"** — show that location access requires explicit user opt-in and is never tracked silently. Set location radius to **30 km** (SRMIST Kattankulathur: `12.823, 80.045`).
  3. Click **"Simulate Drill"** and dispatch an **"Urban Waterlogging Emergency"** located 12 km away in Tambaram.
  4. **Immediate Observation:** Within 50 milliseconds, a high-priority red alert banner pops up at the top of the browser **without refreshing the page**.
  5. Dispatch a second simulated drill located 250 km away in Bangalore.
  6. **Immediate Observation:** The incident appears in the general state feed, but **NO geofence alert banner** is triggered, proving server-side spatial filtering.

---

### Minute 2:30 – 3:45 | CI/CD Pipeline & Shift-Left Security Gates
- **Action:** Switch to Terminal 1.
- **Talking Points:**
  > *"Our Jenkins CI/CD pipeline enforces an 11-stage zero-trust quality gate. Code cannot be packaged into Docker images unless it passes three strict security layers."*
- **Demo Sequence:**
  1. Show unit test integrity:
     ```bash
     npm run test
     ```
     *Result:* 84 tests passing across all workspaces.
  2. Run the security failure drill script:
     ```powershell
     powershell -ExecutionPolicy Bypass -File tests/failure-drills/trivy-security-gate.ps1
     ```
  3. **Immediate Observation:**
     - Test 1 confirms the ResQGrid production codebase is **100% clean (0 HIGH/CRITICAL CVEs)**.
     - Test 2 demonstrates how Trivy intercepts an unpatched container image and **halts the pipeline with exit code 1**, preventing flawed artifacts from reaching Amazon ECR.

---

### Minute 3:45 – 5:15 | Kubernetes Blue-Green Deployment
- **Action:** Show the active header badge in the UI: **`Release: BLUE`**.
- **Talking Points:**
  > *"Rather than doing rolling in-place image updates, we maintain distinct BLUE and GREEN Kubernetes deployments. Candidate releases are tested in isolation using a dedicated candidate service before any production traffic is switched."*
- **Demo Sequence:**
  1. Run the Blue-Green release orchestrator:
     ```powershell
     powershell -ExecutionPolicy Bypass -File infra/k8s/deploy-candidate.ps1 -DryRun
     ```
  2. Walk the evaluators through the 6 stages in the console:
     - Detects active release is `BLUE`.
     - Deploys candidate image to `GREEN`.
     - Waits for rollout readiness.
     - Executes isolated pre-promotion smoke tests with k6.
     - Performs atomic `backend-service` selector flip to `GREEN`.
  3. Switch to the Browser: **The header badge dynamically flips to `Release: GREEN`!**

---

### Minute 5:15 – 6:30 | Post-Promotion Failure & 177ms Instant Rollback
- **Action:** Demonstrate disaster recovery under failure.
- **Talking Points:**
  > *"What if a candidate release experiences latency anomalies after promotion? We now trigger our emergency rollback engine."*
- **Demo Sequence:**
  1. Run the rollback script in Terminal 1:
     ```powershell
     powershell -ExecutionPolicy Bypass -File infra/k8s/rollback.ps1 -DryRun
     ```
  2. **Observation:**
     ```
     ========================================================================
      ROLLBACK COMPLETED SUCCESSFULLY
      Active Restored Release: blue
      Measured Rollback Time:  177 ms
      Service Status:          HEALTHY / TRAFFIC RESTORED
     ========================================================================
     ```
  3. Point to the screen: The active release was restored to `BLUE` in **177 milliseconds**! Because the BLUE pods were warm and running, zero cold-start delay occurred.

---

### Minute 6:30 – 7:30 | Load Testing, HPA Autoscaling & Observability
- **Action:** Open Grafana in Browser Tab 2.
- **Talking Points:**
  > *"Our backend natively exports Prometheus metrics via `/metrics`. In Grafana, we track 8 real PromQL panels matching our actual architecture."*
- **Demo Sequence:**
  1. Run the live k6 performance benchmark:
     ```powershell
     k6 run infra/load-tests/live-benchmark.js
     ```
  2. Show the real k6 summary:
     - **Throughput:** `2,026 req/sec`.
     - **p95 Latency:** `9.49 ms`.
     - **Error Rate:** `0.00%`.
  3. Tour the 8 Grafana panels:
     - Panel 1: HTTP RPS by method and route.
     - Panel 2: Latency quantiles (p50, p95, p99).
     - Panel 4: Active Socket.IO connections.
     - Panel 7: Process CPU Core Usage driving the HPA formula:
       $$\text{desiredReplicas} = \lceil 2 \times (\text{CPU} / 60\%) \rceil$$
     - Show HPA scaling backend from 2 up to 6 pods with anti-flapping 300s scale-down stabilization.

---

### Minute 7:30 – 8:00 | Cloud Economics (FinOps) & Conclusion
- **Action:** Display the cost management breakdown ([docs/cost-management.md](file:///c:/Users/baran/Downloads/Devops_project/docs/cost-management.md)).
- **Closing Statement:**
  > *"Finally, we evaluated Cloud Financial Operations. By hosting lightweight k3s on an AWS `t3.medium` instance in `ap-south-1` and eliminating the expensive AWS NAT Gateway ($32.40/mo) and AWS Managed EKS fee ($73.00/mo), the complete ResQGrid production architecture runs for **\$36.92/month** (~₹3,080/mo), representing an **81% cost reduction** compared to traditional enterprise EKS deployments.*  
  > *We are now open to questions from the panel."*
