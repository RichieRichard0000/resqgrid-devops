# ResQGrid — Autoscaling & k6 Load Testing Guide

**Academic Context:** SRM Institute of Science and Technology — CSE Final Year  
**Phase:** 2 — Horizontal Pod Autoscaling (HPA), Metrics-Server & Stress Testing  
**Autoscaler:** Kubernetes HPA (`autoscaling/v2`)  
**Load Testing Engine:** Grafana k6 v2.2+  
**Target Workload:** `backend-deployment` (ResQGrid API & WebSocket Gateway)  

---

## 1. Autoscaling Architecture & Mathematics

In cloud architectures, autoscaling ensures that when sudden traffic spikes occur (such as during a major regional earthquake or flood alert), the platform dynamically allocates compute capacity to maintain sub-second response times, and conversely deallocates redundant resources during idle periods to conserve costs.

```mermaid
flowchart TD
    K6["k6 Stress Test / Spike Traffic\n(180 Concurrent VUs)"] --> INGRESS["Ingress Controller"]
    INGRESS --> PODS["Current Replicas: 2 Pods"]
    PODS -->|High CPU Utilization (>60%)| CADVISOR["Kubelet / cAdvisor"]
    CADVISOR --> METRICS_SERVER["Kubernetes Metrics-Server"]
    METRICS_SERVER -->|Reports Current CPU%| HPA["HorizontalPodAutoscaler (HPA)"]

    subgraph HPAMath["HPA Scaling Algorithm"]
        CALC["desiredReplicas = ceil[ currentReplicas * ( currentMetric / targetMetric ) ]\nExample: ceil[ 2 * ( 120% / 60% ) ] = 4 Replicas"]
    end

    HPA --> HPAMath
    HPAMath -->|Scale Up Command| DEPLOYMENT["backend-deployment"]
    DEPLOYMENT -->|Spawns 2 New Pods| SCALE_OUT["Active Replicas: 4 Pods"]
    SCALE_OUT -->|Traffic Distributed| CPU_DROP["CPU Drops Back to ~60%"]
```

### The Kubernetes HPA Scaling Formula
The Kubernetes HPA controller evaluates resource consumption every 15 seconds against the configured target using the formula:
$$\text{desiredReplicas} = \left\lceil \text{currentReplicas} \times \left( \frac{\text{currentMetricValue}}{\text{desiredMetricValue}} \right) \right\rceil$$

### ResQGrid HPA Target Specifications
- **Target Deployment:** `backend-deployment` in namespace `resqgrid` ([infra/k8s/backend-hpa.yaml](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/backend-hpa.yaml))
- **Minimum Replicas (`minReplicas`):** `2` (Ensures high availability across availability zones or node processes)
- **Maximum Replicas (`maxReplicas`):** `6` (Realistic capacity ceiling for a `t3.medium` EC2 host)
- **Target CPU Utilization:** `60%`
- **Target Memory Utilization:** `70%`

### Scale-Up & Scale-Down Stabilization Policies
- **Scale-Up Policy:** `stabilizationWindowSeconds: 0`. Reaction is immediate upon detecting sustained load, adding either 100% capacity or 2 pods every 15 seconds.
- **Scale-Down Policy:** `stabilizationWindowSeconds: 300` (5 minutes). Flapping prevention algorithm: ensures pods are not abruptly terminated if traffic dips momentarily for 30 seconds before surging again.

---

## 2. k6 Load Testing Suite Execution Guide

All test scripts reside in [infra/load-tests/](file:///c:/Users/baran/Downloads/Devops_project/infra/load-tests/).

### Scenario 1: Baseline Steady-State Test
- **File:** [baseline-load.js](file:///c:/Users/baran/Downloads/Devops_project/infra/load-tests/baseline-load.js)
- **Virtual Users (VUs):** 10 steady VUs for 2 minutes.
- **Expected Replica Count:** Steady at **2 replicas** (0% scale change).
- **Execution Command:**
  ```bash
  k6 run --env TARGET_URL=http://<TARGET_HOST> infra/load-tests/baseline-load.js
  ```
- **Evaluation Criteria:** p95 latency < 250ms; failure rate < 1%.

### Scenario 2: Moderate Traffic Ramp-Up
- **File:** [ramp-up.js](file:///c:/Users/baran/Downloads/Devops_project/infra/load-tests/ramp-up.js)
- **Virtual Users (VUs):** Smooth progression from 10 -> 20 -> 40 -> 60 VUs over 6 minutes.
- **Expected Replica Count:** Transitions from **2 -> 3 replicas**.
- **Execution Command:**
  ```bash
  k6 run --env TARGET_URL=http://<TARGET_HOST> infra/load-tests/ramp-up.js
  ```
- **Evaluation Criteria:** Validates linear response scaling as traffic builds up.

### Scenario 3: Stress / Spike Test (HPA Trigger Verification)
- **File:** [stress-spike.js](file:///c:/Users/baran/Downloads/Devops_project/infra/load-tests/stress-spike.js)
- **Virtual Users (VUs):** Rapid surge to 150 - 180 concurrent VUs issuing computationally intensive PostGIS proximity queries (`/api/incidents/nearby`).
- **Expected Replica Transition:** **2 -> 4 -> 6 replicas**.
- **Execution Command:**
  ```bash
  # In terminal 1: Run the stress test
  k6 run --env TARGET_URL=http://<TARGET_HOST> infra/load-tests/stress-spike.js

  # In terminal 2: Monitor live HPA scaling in real time
  kubectl get hpa backend-hpa -n resqgrid --watch
  ```
- **Evaluation Criteria:** Confirms that when CPU utilization crosses 60%, HPA triggers `ScalingActive` and issues replica scale-out events.

### Scenario 4: Recovery & Scale-Down Observation
- **File:** [recovery.js](file:///c:/Users/baran/Downloads/Devops_project/infra/load-tests/recovery.js)
- **Virtual Users (VUs):** Drops traffic from 80 VUs to 5 VUs, holding for 6 minutes.
- **Expected Replica Transition:** **6 -> 4 -> 2 replicas** after the 300s stabilization window expires.
- **Execution Command:**
  ```bash
  k6 run --env TARGET_URL=http://<TARGET_HOST> infra/load-tests/recovery.js
  ```

---

## 3. Differentiating Application Errors vs Infrastructure Limits

During load testing, evaluators frequently examine how engineers diagnose failure points. Below is the operational diagnostic matrix:

| Failure Symptom | Observed Error Code | Underlying Cause | Remediation Action |
| :--- | :--- | :--- | :--- |
| **Input Validation Rejection** | `400 Bad Request` | Zod schema caught invalid latitude (-999) or missing fields. | Fix client payload; application handled error correctly. |
| **Authentication Expiry** | `401 Unauthorized` | JWT token expired during long load test run. | Refresh test bearer token. |
| **Rate Limit Throttling** | `429 Too Many Requests` | Express rate-limiter middleware preventing DoS. | Working as designed; rate limits protect database from flooding. |
| **Database Pool Exhaustion** | `500 Database Query Timeout` | Node.js pg pool exhausted (`max: 20` reached). | Increase database connection pool size in `db.ts` or add Read Replicas. |
| **CPU Saturation & Starvation** | `504 Gateway Timeout` | Ingress timed out waiting for backend event loop. | Trigger HPA scale-up or increase CPU request allocation. |
| **Container OOMKill** | Exit Code `137` | Backend pod memory exceeded `512Mi` limit. | Inspect heap snapshot for memory leak or increase memory limit to `1Gi`. |
| **Node-Level Eviction** | Pod status `Evicted` | EC2 host ran out of disk or memory. | Node capacity limit reached; requires EC2 vertical resize or multi-node worker join. |
