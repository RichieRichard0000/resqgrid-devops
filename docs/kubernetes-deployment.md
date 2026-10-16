# ResQGrid — Kubernetes (k3s) Deployment & Operations Guide

**Academic Context:** SRM Institute of Science and Technology — CSE Final Year  
**Phase:** 2 — Container Orchestration, Networking & Workload Management  
**Kubernetes Distribution:** Rancher k3s (Lightweight Kubernetes)  
**Target Cluster Namespace:** `resqgrid`  

---

## 1. Kubernetes Architecture & Why k3s

For ResQGrid's Phase 2 cloud infrastructure, **k3s** was selected over heavy distributions such as vanilla upstream Kubernetes or managed Amazon EKS for compelling technical and financial reasons:
1. **Low Memory Footprint:** k3s packages control-plane components (API server, controller manager, scheduler, CoreDNS, metrics-server, and local storage provider) into a single binary requiring less than 512 MB RAM, allowing the entire cluster to run smoothly on a single `t3.medium` EC2 instance (4 GiB RAM).
2. **Built-In Batteries:** Includes Traefik Ingress controller, local-path storage provisioner, and Kubernetes Metrics-Server out of the box without requiring external Helm charts or AWS ALB controllers.
3. **Massive Cost Savings:** Omits the **$73.00/month** AWS EKS control plane cluster fee, making the project exceptionally viable for academic budgets.

```mermaid
flowchart TD
    subgraph K3S_Host["EC2 Instance (t3.medium) - k3s Cluster"]
        INGRESS_CTRL["Traefik Ingress Controller\n(Port 80/443 -> Host Network)"]
        METRICS_SRV["Metrics-Server\n(Scrapes kubelet cAdvisor)"]
        LOCAL_PATH["Local-Path Storage Provisioner\n(/var/lib/rancher/k3s/storage)"]

        subgraph NamespaceResQGrid["Namespace: resqgrid"]
            subgraph FrontendWorkload["Frontend Service & Pods"]
                FE_SVC["Service: frontend-service:80"]
                FE_POD1["Pod: frontend-deployment-xxx-1"]
                FE_POD2["Pod: frontend-deployment-xxx-2"]
                FE_SVC --> FE_POD1 & FE_POD2
            end

            subgraph BackendWorkload["Backend Service, Pods & HPA"]
                BE_SVC["Service: backend-service:4000"]
                BE_POD1["Pod: backend-deployment-xxx-1"]
                BE_POD2["Pod: backend-deployment-xxx-2"]
                BE_PODN["Pod: backend-deployment-xxx-N (up to 6)"]
                HPA["HorizontalPodAutoscaler\n(CPU target: 60%, RAM target: 70%)"]
                
                BE_SVC --> BE_POD1 & BE_POD2 & BE_PODN
                HPA -.->|Scale Decision| BackendWorkload
                METRICS_SRV -.->|Resource Metrics| HPA
            end

            subgraph DatabaseWorkload["PostGIS Database & PVC"]
                DB_SVC["Service: postgres-service:5432"]
                DB_POD["Pod: postgres-deployment-xxx"]
                PVC["PVC: postgres-data-pvc (10Gi)"]
                DB_SVC --> DB_POD
                DB_POD --- PVC
                PVC --- LOCAL_PATH
            end
        end

        INGRESS_CTRL -->|/| FE_SVC
        INGRESS_CTRL -->|/api, /socket.io, /health, /metrics| BE_SVC
        BE_POD1 & BE_POD2 & BE_PODN --> DB_SVC
    end
```

---

## 2. Manifest Inventory & Structure

All manifests are organized under [infra/k8s/](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/) and unified with Kustomize:

| Manifest File | Kind | Description |
| :--- | :--- | :--- |
| [namespace.yaml](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/namespace.yaml) | `Namespace` | Defines the isolated `resqgrid` workspace |
| [configmap.yaml](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/configmap.yaml) | `ConfigMap` | Non-sensitive runtime variables (`PORT`, `DB_HOST`, `NODE_ENV`, feeds) |
| [secrets.yaml](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/secrets.yaml) | `Secret` | Sensitive credentials (`DB_USER`, `DB_PASSWORD`, `JWT_SECRET`) |
| [postgres-pvc.yaml](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/postgres-pvc.yaml) | `PersistentVolumeClaim` | 10Gi volume allocated via `local-path` provisioner |
| [postgres-deployment.yaml](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/postgres-deployment.yaml) | `Deployment` | Single-replica PostGIS 16-3.4 container with `pg_isready` probes |
| [postgres-service.yaml](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/postgres-service.yaml) | `Service` | ClusterIP internal network route on port 5432 |
| [backend-deployment.yaml](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/backend-deployment.yaml) | `Deployment` | Scalable Node.js API pods (UID 10001, dropped caps, `/health` probes) |
| [backend-service.yaml](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/backend-service.yaml) | `Service` | ClusterIP route for backend API and Prometheus metrics |
| [backend-hpa.yaml](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/backend-hpa.yaml) | `HorizontalPodAutoscaler` | Autoscales backend from 2 to 6 pods based on CPU/RAM |
| [frontend-deployment.yaml](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/frontend-deployment.yaml) | `Deployment` | High-availability Nginx static SPA pods (2 replicas) |
| [frontend-service.yaml](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/frontend-service.yaml) | `Service` | ClusterIP route on port 80 |
| [ingress.yaml](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/ingress.yaml) | `Ingress` | Unified ingress routing for SPA, REST API, WebSockets, and metrics |
| [kustomization.yaml](file:///c:/Users/baran/Downloads/Devops_project/infra/k8s/kustomization.yaml) | `Kustomization` | Bundles and labels all resources into an atomic deployment unit |

---

## 3. Resource Requests & Limits Allocation

To ensure strict predictability and prevent one rogue pod from exhausting host memory (OOM killer), each workload defines explicit resource requests and limits:

| Container | CPU Request | CPU Limit | Memory Request | Memory Limit | Allocation Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend Pod** (x2-6) | `100m` (0.1 core) | `500m` (0.5 core) | `128Mi` | `512Mi` | Node.js baseline ~70MB; limits accommodate spatial PostGIS query bursts. |
| **Frontend Pod** (x2) | `50m` (0.05 core) | `200m` (0.2 core) | `64Mi` | `256Mi` | Nginx lightweight static file serving requires negligible footprint. |
| **PostGIS Database** (x1) | `100m` (0.1 core) | `500m` (0.5 core) | `256Mi` | `512Mi` | PostGIS spatial indexing and buffer cache. |
| **Total Baseline Allocation** | **400m** | **1.90 Cores** | **640Mi** | **2.04 GiB** | Fits comfortably within `t3.medium` (2 vCPU, 4 GiB RAM), leaving headroom for k3s control plane and monitoring. |

---

## 4. Health & Readiness Probes

### Backend Probes
```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
livenessProbe:
  httpGet:
    path: /health
    port: 4000
  initialDelaySeconds: 20
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3
```
- **Readiness Probe:** Ensures that traffic is not routed to a newly spawned replica until the Node.js event loop and database connections are ready.
- **Liveness Probe:** Periodically checks if the server is responding; if the event loop is completely hung or deadlocked, Kubernetes restarts the pod automatically.

### PostGIS Database Probes
```yaml
readinessProbe:
  exec:
    command: ["/bin/sh", "-c", "exec pg_isready -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\""]
  initialDelaySeconds: 10
  periodSeconds: 10
```
- Uses PostgreSQL's native `pg_isready` utility to verify that the socket is accepting query transactions before allowing dependent backend pods to establish connection pools.

---

## 5. Step-by-Step Deployment Procedure

### Step 1: Cluster Validation
Verify connection to the k3s cluster:
```bash
kubectl cluster-info
kubectl get nodes -o wide
```

### Step 2: Deploy ResQGrid via Kustomize
Apply the full manifest stack with a single declarative command:
```bash
kubectl apply -k infra/k8s/
```

### Step 3: Verify Deployment Rollout
```bash
# Check all resources in the resqgrid namespace
kubectl get all -n resqgrid

# Verify PVC binding
kubectl get pvc -n resqgrid

# Verify HPA initialization
kubectl get hpa -n resqgrid

# Stream rollout status for backend pods
kubectl rollout status deployment/backend-deployment -n resqgrid
```

### Step 4: Validate Ingress Routing
```bash
# Verify ingress endpoints
kubectl get ingress -n resqgrid

# Test endpoints via curl
curl -i http://<K3S_NODE_IP>/health
curl -i http://<K3S_NODE_IP>/api/incidents
```
