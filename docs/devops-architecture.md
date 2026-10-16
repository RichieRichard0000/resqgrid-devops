# ResQGrid — DevOps & Cloud Deployment Architecture

**Academic Evaluation Context:** SRM Institute of Science and Technology — CSE Final Year Capstone Project  
**Phase:** 2 — Cloud Infrastructure, CI/CD, Containerization, Kubernetes, Autoscaling & Monitoring  

---

## 1. Executive Summary & Architecture Overview

ResQGrid is an event-driven, real-time disaster alert and response platform designed to provide rapid situational awareness and geospatial hazard notifications during emergencies. Phase 2 transitions ResQGrid from a local containerized application into a production-grade, highly observable, autoscaling cloud deployment on Amazon Web Services (AWS) using Infrastructure as Code (Terraform), Jenkins CI/CD with multi-layer security gates, Kubernetes (k3s), and Prometheus/Grafana observability.

### Core Architectural Principles
1. **Cost-Conscious Cloud Engineering:** Designed for high efficiency without wasteful expenditure. By leveraging a single-node/worker k3s cluster on an AWS `t3.medium` instance and avoiding managed AWS NAT Gateways ($32.40/mo) and managed EKS cluster control plane fees ($73.00/mo), the complete platform runs for under **$37.00/month**.
2. **Shift-Left Security & Provenance:** Every build must pass SonarQube quality gates (Zero bugs/vulnerabilities, >80% coverage), OWASP Dependency-Check (no CVSS ≥ 7.0), and Trivy container vulnerability scanning (zero CRITICAL/HIGH CVEs) before container images are pushed to Amazon ECR with immutable Git-SHA tags.
3. **Stateless Scalability with Native PostgreSQL Pub/Sub:** Real-time WebSockets scale horizontally across multiple backend pods without introducing heavy dependencies like Redis or Kafka, utilizing PostgreSQL `LISTEN/NOTIFY` cluster bus.
4. **End-to-End Observability:** Real application metrics instrumented with `prom-client` scraped every 15 seconds by Prometheus, visualized on Grafana with custom PromQL panels, and monitored by alerting rules.

---

## 2. End-to-End DevOps Architecture Diagram

```mermaid
flowchart TD
    subgraph DeveloperEnvironment["1. Collaborative Development (Git & GitHub)"]
        DEV1["DevOps Engineer\n(Baran - SRMIST)"]
        DEV2["Cloud/Frontend Engineer\n(Peer Member - SRMIST)"]
        GIT_REPO[("GitHub Repository\n(Branch Protection & PR Reviews)")]
        DEV1 -->|Feature Branch Push| GIT_REPO
        DEV2 -->|Feature Branch Push| GIT_REPO
    end

    subgraph CICDPipeline["2. Jenkins CI/CD Orchestration (11 Stages)"]
        WEBHOOK["GitHub Webhook\n(HMAC Secret Verified)"]
        JENKINS["Jenkins Controller\n(Pipeline Engine)"]
        
        GIT_REPO -->|push / PR trigger| WEBHOOK
        WEBHOOK --> JENKINS
        
        STAGE1["1. Checkout Commit"]
        STAGE2["2. Install Deps (npm ci)"]
        STAGE3["3. Lint & Type Check (tsc)"]
        STAGE4["4. Build Backend & Frontend"]
        STAGE5["5. Automated Tests (Vitest)"]
        STAGE6["6. Publish Test Results (JUnit)"]
        STAGE7{"7. SonarQube Quality Gate\n(Bugs, Vulnerabilities)"}
        STAGE8{"8. OWASP Dependency-Check\n(CVSS >= 7.0 Block)"}
        STAGE9["9. Docker Multi-stage Builds"]
        STAGE10{"10. Trivy Vulnerability Scan\n(CRITICAL/HIGH Block)"}
        STAGE11["11. Push Immutable Image (Git-SHA)"]

        JENKINS --> STAGE1 --> STAGE2 --> STAGE3 --> STAGE4 --> STAGE5 --> STAGE6 --> STAGE7
        STAGE7 -->|Pass| STAGE8
        STAGE7 -->|Fail| BLOCK1["Pipeline Failed\n(Release Aborted)"]
        STAGE8 -->|Pass| STAGE9 --> STAGE10
        STAGE8 -->|Fail| BLOCK1
        STAGE10 -->|Pass| STAGE11
        STAGE10 -->|Fail| BLOCK1
    end

    subgraph AWSCloud["3. AWS Infrastructure (Terraform Managed)"]
        ECR_BE[("Amazon ECR\nresqgrid-backend:sha-xxx")]
        ECR_FE[("Amazon ECR\nresqgrid-frontend:sha-xxx")]
        STAGE11 -->|Push Backend Image| ECR_BE
        STAGE11 -->|Push Frontend Image| ECR_FE

        subgraph VPC["AWS VPC (10.0.0.0/16) - ap-south-1"]
            IGW["Internet Gateway"]
            
            subgraph PublicSubnet["Public Subnet (10.0.1.0/24)"]
                EIP["Elastic IP\n(Static Public IPv4)"]
                K3S_NODE["k3s Host (EC2 t3.medium)\nUbuntu 22.04 LTS\nSecurity Group: 80, 443, 6443, 22"]
                EIP --> K3S_NODE
                IGW <--> EIP
            end

            subgraph PrivateSubnet["Private Subnet (10.0.2.0/24) - Isolated"]
                ISOLATED_NOTE["No NAT Gateway\n(Saves $32.40/mo)\nReserved for secure data"]
            end
        end
    end

    subgraph KubernetesCluster["4. Kubernetes Runtime (k3s on EC2)"]
        INGRESS["Ingress Controller (Traefik)\nPorts 80 / 443"]
        
        subgraph ResQGridNamespace["Namespace: resqgrid"]
            FE_SVC["Service: frontend-service (80)"]
            BE_SVC["Service: backend-service (4000)"]
            DB_SVC["Service: postgres-service (5432)"]

            FE_PODS["Frontend Pods (Nginx SPA)\nReplica Count: 2\nResource: 50m / 64Mi"]
            BE_PODS["Backend Pods (Node.js API & WS)\nReplica Count: 2 to 6 (HPA Scaled)\nUID: 10001 (Non-root)"]
            DB_POD["PostGIS 16-3.4 Database\nPVC: local-path (10Gi)"]

            HPA["Horizontal Pod Autoscaler (HPA)\nTarget: CPU 60%, RAM 70%\nMin: 2, Max: 6"]

            HPA -.->|Scale Out / In| BE_PODS
            BE_PODS <-->|Native LISTEN/NOTIFY Cluster Bus| DB_POD
        end

        K3S_NODE --> INGRESS
        INGRESS -->|/| FE_SVC --> FE_PODS
        INGRESS -->|/api, /socket.io, /health, /metrics| BE_SVC --> BE_PODS
        BE_SVC --> BE_PODS
        BE_PODS --> DB_SVC --> DB_POD
    end

    subgraph ObservabilitySuite["5. Monitoring & Load Testing"]
        PROM["Prometheus (Port 9090)\nScrapes /metrics every 15s"]
        GRAFANA["Grafana (Port 3001)\n8 Real PromQL Metric Panels"]
        K6["k6 Load Testing Suite\n(Baseline, Ramp, Stress, Recovery)"]

        BE_SVC -.->|Scrape /metrics| PROM
        PROM --> GRAFANA
        K6 -->|Stress Traffic > 60% CPU| INGRESS
    end
```

---

## 3. Technology Stack Reference & Responsibilities

| Tier / Component | Technology | Version | Architectural Responsibility |
| :--- | :--- | :--- | :--- |
| **VCS** | Git / GitHub | v2.40+ | 2-member branch collaboration, PR templates, CODEOWNERS, commit linting |
| **CI/CD Orchestrator** | Jenkins | v2.440+ (LTS) | Sole pipeline engine; runs 11-stage declarative verification & image pushing |
| **Static Code Analysis** | SonarQube Scanner | v5.0+ | Enforces Quality Gate: 0 bugs, 0 vulnerabilities, 0 security hotspots |
| **SCA Dependency Scanner** | OWASP Dependency-Check | v9.0+ | Scans NPM dependencies; halts builds on any CVE with CVSS score ≥ 7.0 |
| **Container Engine** | Docker BuildKit | v25.0+ | Builds multi-stage non-root container images for frontend and backend |
| **Container Security** | Aqua Trivy | v0.50+ | Scans Docker images for OS and package vulnerabilities; halts on HIGH/CRITICAL |
| **Image Registry** | Amazon ECR | AWS Native | Stores immutable, AES256-encrypted container images tagged with Git commit SHAs |
| **IaC** | HashiCorp Terraform | v1.16+ | Provisons AWS VPC, Subnets, Route Tables, Security Groups, IAM Roles, and EC2 |
| **Cloud Provider** | Amazon Web Services (AWS) | ap-south-1 | Regional hosting in Mumbai for low latency to SRMIST Chennai |
| **Container Orchestration** | k3s (Lightweight Kubernetes) | v1.28+ | Manages Deployments, Services, ConfigMaps, Secrets, Ingress, and HPA |
| **Autoscaling** | Kubernetes HPA + Metrics-Server | v2 autoscaling | Dynamically scales backend pods between 2 and 6 replicas based on CPU & Memory |
| **Cluster Database** | PostgreSQL + PostGIS | 16-3.4 | Geospatial point/polygon storage and multi-pod WebSocket pub/sub bus |
| **Metrics Collection** | Prometheus | v2.50+ | Scrapes application runtime metrics and evaluates alert rules |
| **Dashboards** | Grafana | v10.3+ | Visualizes 8 custom PromQL panels for requests, latency, errors, and resources |
| **Load Testing** | Grafana k6 | v2.2+ | Executes controlled baseline, ramp-up, spike (HPA trigger), and recovery tests |

---

## 4. Multi-Replica State Synchronization (PostgreSQL LISTEN/NOTIFY)

In Phase 1, WebSockets were hosted in-process inside the backend instance. In Phase 2, Kubernetes runs 2 to 6 backend replicas simultaneously. If User A connects to Pod 1, and an incident is created or ingested on Pod 2, User A would not receive the alert without a cluster bus.

To solve this without adding costly Redis or Kafka microservices:
1. Every backend pod connects to PostgreSQL and issues `LISTEN resqgrid_cluster_events`.
2. When any pod creates or ingests an incident, it executes `SELECT pg_notify('resqgrid_cluster_events', payload)`.
3. All running backend pods instantly receive the PostgreSQL notification and broadcast the alert to their locally connected WebSocket clients.
4. If the database connection temporarily drops, pods log the disconnection and attempt exponential backoff reconnection.

---

## 5. Security & Isolation Model

- **Public Subnet:** Only the k3s host is placed in the public subnet, mapped to a static Elastic IP. Ingress ports 80 (HTTP) and 443 (HTTPS) are open to the internet.
- **Administrative Ports:** Port 22 (SSH) and 6443 (Kubernetes API) are restricted via Security Groups to authorized administrator IP addresses (`admin_cidr_blocks`). In addition, AWS SSM Session Manager is attached to the IAM role for zero-trust CLI access without requiring port 22 open.
- **Database Perimeter:** The database port 5432 is strictly bound to the private cluster network and accepts traffic exclusively from the k3s security group. No public IPv4 address or route exists to the database.
- **Container Hardening:** Backend pods run under dedicated non-root user `UID 10001` (`resqgroup`), with `allowPrivilegeEscalation: false`, dropped Linux capabilities (`drop: ["ALL"]`), and a `readOnlyRootFilesystem: true` backed by a temporary `emptyDir` mount for `/tmp`.
