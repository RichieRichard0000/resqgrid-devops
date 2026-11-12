# ResQGrid: Complete DevOps Engineering & Mentor Defense Guide
**A Step-by-Step Mentor Presentation, File Reference, & Live Verification Manual**  
*Institution: SRM Institute of Science and Technology — Department of Computer Science & Engineering*  
*Repository:* [github.com/RichieRichard0000/resqgrid-devops](https://github.com/RichieRichard0000/resqgrid-devops) | *Latest Release:* `v2.0.0`

---

## System Quick Reference

| Component | Target Identifier | Access URL / Command | Role in Architecture |
| :--- | :--- | :--- | :--- |
| **Production Web App** | ResQGrid Frontend & API | `http://16.4.118.98` | Live disaster alert & incident response application |
| **CI/CD Pipeline Engine** | Jenkins LTS (Host Container) | `http://16.4.118.98:8080` | Multi-stage build, test, scan, and blue-green deploy |
| **Metrics Scraper & TSDB** | Prometheus v2.45+ (k3s Pod) | `http://16.4.118.98:9090` | Telemetry scraping, rule evaluation, target health |
| **Visualization UI** | Grafana v10.2 (k3s Pod) | `http://16.4.118.98:3000` | Real-time dashboards (CPU, RAM, HTTP latency) |
| **Alert Notification Router** | Alertmanager v0.27 (k3s Pod) | `http://16.4.118.98:9093` | Alert grouping, deduplication, Gmail SMTP dispatch |
| **Cluster Orchestration** | k3s v1.28+ (Lightweight k8s) | `kubectl -n resqgrid` | Pod management, service discovery, Traefik ingress |
| **Day-0 Infrastructure** | Terraform AWS Provider v5.x | `infra/terraform/` | VPC, Subnet, Security Groups, EC2 compute provisioning |
| **Day-1/Day-2 Config** | Ansible Core 2.16+ | `ansible/playbooks/site.yml` | Idempotent OS baseline, Docker runtime, verification |

---

## 1. Executive Presentation Roadmap (12-Minute Mentor Walkthrough)

Follow this exact chronological sequence during your evaluation. Each phase pairs a core DevOps discipline with the exact file to open in VS Code, URL to open in Chrome, or terminal command to execute:

| Time / Phase | DevOps Domain | What to Open / Show | Key Mentor Proof Point |
| :--- | :--- | :--- | :--- |
| **00:00 - 02:00** | **Git & Version Control** | GitHub Releases & PR #1<br/>`git log --graph --oneline` | 4-version lifecycle: IaC (`v1.0.0`) &rarr; Ansible (`v1.1.0`) &rarr; Failed Quality Gate (`v1.2.0-rc1`) &rarr; Observability (`v2.0.0`). |
| **02:00 - 04:00** | **Terraform (IaC Day-0)** | `infra/terraform/compute.tf`<br/>`infra/terraform/security_groups.tf` | Clean separation of concerns: Stripped 128 lines of monolithic cloud-init to prevent accidental EC2 destruction. |
| **04:00 - 06:00** | **Ansible (Config Mgmt)** | `ansible/playbooks/site.yml`<br/>`ansible -m ping all` | Modular idempotent roles (`common`, `docker`, `verification`). Automated OS baseline & runtime assertions. |
| **06:00 - 08:00** | **CI/CD Pipeline** | `Jenkinsfile` (15 stages)<br/>Jenkins UI: `http://16.4.118.98:8080` | Automated build, test, lint, container scanning, and Blue-Green release orchestration with automatic rollback. |
| **08:00 - 10:00** | **Docker & Kubernetes** | `kubectl get pods -n resqgrid`<br/>`kubectl get svc,ingress,hpa` | k3s lightweight cluster: 6 pods, 5 ClusterIP services, unified Traefik Ingress routing, and HPA auto-scaling. |
| **10:00 - 12:00** | **Observability & Security** | Prometheus (`:9090`), Grafana (`:3000`)<br/>Alertmanager email in Gmail | Live alert rules (5 prescribed rules), verified email dispatch to admin, and memory-safe DevSecOps (Trivy + OWASP). |

---

## 2. Git & Version Control Implementation

- **What is Used:** Git 2.40+, GitHub Public Repository (`RichieRichard0000/resqgrid-devops`), GitHub CLI (`gh`), Semantic Versioning (SemVer 2.0), Feature Branching (`feature/security-and-monitoring`), and Pull Request Reviews.
- **Why Used:** Provides immutable commit auditing, collaborative code reviews, automated CI triggers via webhooks, and explicit rollback checkpoints without manual backups.
- **Alternatives Considered:** GitLab (requires 4–8 GB RAM daemon if self-hosted), Bitbucket, SVN (centralized single point of failure). GitHub was chosen for zero host resource consumption, native PR ergonomics, and ubiquitous industry adoption.

### The 4 Semantic Releases

| Tag / Version | Commit SHA | Role in Project Evolution | Proof to Show Mentor |
| :--- | :--- | :--- | :--- |
| **v1.0.0** | `546cae7` | **Infrastructure as Code:** Baseline Terraform provisioning of AWS VPC, Subnets, and EC2 compute. | GitHub Release `v1.0.0`; `infra/terraform/` directory. |
| **v1.1.0** | `89f34c6` | **Configuration Management:** Stripped cloud-init, introduced modular Ansible roles and inventory. | GitHub Release `v1.1.0`; `ansible/` directory structure. |
| **v1.2.0-rc1** `[FAILED]` | `8a8016a` | **Simulated Pipeline Failure:** SonarQube quality gate threshold breached, blocking deployment. | File: `docs/failures/build-fail-sonarqube-qualitygate.log` and pre-release tag. |
| **v2.0.0** `[LATEST]` | `2c38190` | **Production Release:** PR #1 merged. Full observability (Prometheus/Grafana/Alertmanager) & memory-safe SAST. | GitHub Release `v2.0.0`; Merged PR #1 web page. |

> **PROOF TO SHOW MENTOR:**
> 1. **GitHub URL:** Open `https://github.com/RichieRichard0000/resqgrid-devops/releases` (show all 4 tags with release notes).
> 2. **Pull Request:** Open `https://github.com/RichieRichard0000/resqgrid-devops/pull/1` (show formal PR merge into `main`).
> 3. **Terminal Command:** Run `git log --graph --oneline --decorate -n 8` (show graphical branching & merging topology live).

---

## 3. CI/CD Automation (Jenkins Pipeline & Blue-Green Rollout)

- **What is Used:** Jenkins LTS running in Docker on host (Port 8080), Declarative Groovy `Jenkinsfile` containing 15 automated stages, JUnit XML reporter, Aqua Trivy container scanner, OWASP Dependency-Check plugin.
- **Why Used:** Executes repeatable multi-stage CI verification inside our private AWS VPC without exposing Kubernetes API tokens or database credentials to third-party public cloud runners.
- **Alternatives Considered:** GitHub Actions (would require exposing self-hosted runner or k8s cluster ingress to public webhooks), GitLab CI, ArgoCD (GitOps continuous delivery tool; Jenkins was selected for unified CI build + CD deployment pipeline).

### The 15 Declarative Pipeline Stages

| Stage Group | Stages Included | Execution Description & Security Checks |
| :--- | :--- | :--- |
| **Build & Verification** | 1. Checkout<br/>2. npm ci<br/>3. Lint & Type Check<br/>4. Build<br/>5. Vitest Tests | Enforces clean reproducible dependency installation, strict TypeScript static typing (`tsc --noEmit`), and automated unit/integration test suites publishing JUnit XML. |
| **Security Quality Gates** | 6. Publish Reports<br/>7. Sonar Quality Gate<br/>8. OWASP Scan<br/>9. Docker Build<br/>10. Trivy Scan | Scans dependencies for CVEs with OWASP (`--failOnCVSS 7.0`); builds immutable Docker images; scans container layers with Aqua Trivy for HIGH and CRITICAL vulnerabilities. |
| **Deployment & Rollback** | 11. ECR Push<br/>12. Blue-Green Deploy<br/>13. Smoke Tests<br/>14. Traffic Switch<br/>15. Post-Verification | Deploys Candidate (Green) workload; performs synthetic HTTP & WebSocket health checks; flips Kubernetes Service selector atomically; auto-rolls back if error rate spikes. |

> **PROOF TO SHOW MENTOR:**
> 1. **File in VS Code:** Open `Jenkinsfile` (highlight lines 33–250 showing declarative stages, timeout guards, and rollback blocks).
> 2. **Live Jenkins UI:** Open `http://16.4.118.98:8080` (or SSH tunnel `localhost:8080`) to show the pipeline stage view with green pass badges.

---

## 4. Terraform (Infrastructure as Code — Day-0)

- **What is Used:** HashiCorp Terraform AWS Provider v5.x, HCL, Local/S3 state backend.
- **Why Used:** Enables declarative, version-controlled cloud resource provisioning. Guarantees deterministic state reconciliation and eliminates manual AWS Console clicking.
- **Alternatives Considered:** AWS CloudFormation (AWS-locked, verbose JSON/YAML), Pulumi (imperative programming language, steeper learning curve), AWS CDK. Terraform is the industry-standard, vendor-agnostic IaC tool.
- **Key Architectural Change (Removal of Cloud-Init):** We explicitly removed 128 lines of monolithic `user_data` from `infra/terraform/compute.tf`. Cloud-init couples Day-0 hardware provisioning with Day-1 application configuration; updating a shell script in user_data forces Terraform to destroy and replace the EC2 instance, causing catastrophic database data loss.

### Provisioned Cloud Resources

| Resource Name | Terraform Identifier | Configuration Details & Security Posture |
| :--- | :--- | :--- |
| **Virtual Private Cloud** | `aws_vpc.main` | CIDR `10.0.0.0/16`; DNS hostnames & support enabled. Provides isolated private network perimeter. |
| **Public Subnet** | `aws_subnet.public` | CIDR `10.0.1.0/24` in `ap-south-1a`; mapped to Internet Gateway via route table for public ingress. |
| **k3s Node Security Group** | `aws_security_group.k3s_host` | Ingress 80/443 (HTTP/HTTPS) open to `0.0.0.0/0`; Port 6443 (Kube API) and Port 22 (SSH) strictly restricted to admin CIDRs. Self-referencing intra-cluster ingress. |
| **Database Security Group** | `aws_security_group.database` | Port 5432 (PostgreSQL) strictly restricted to `k3s_host.id`. **ZERO public internet ingress allowed.** |
| **Compute Host** | `aws_instance.k3s_host` | Instance type: `c7i-flex.large` (2 vCPU, 4 GiB RAM); 40 GB gp3 EBS root volume (3000 IOPS, 125 MB/s). |

> **PROOF TO SHOW MENTOR:**
> 1. **File in VS Code:** Open `infra/terraform/compute.tf` and show that `user_data` has been stripped.
> 2. **File in VS Code:** Open `infra/terraform/security_groups.tf` to demonstrate defense-in-depth DB network isolation.
> 3. **Git Diff Proof:** Run `git diff v1.0.0 v1.1.0 infra/terraform/compute.tf` to show exact deletion of cloud-init.

---

## 5. Ansible (Configuration Management — Day-1 & Day-2)

- **What is Used:** Ansible Core 2.16+, YAML Playbooks, modular role structure (`common`, `docker`, `verification`), inventory grouping, and automated assertion tasks.
- **Why Used:** Provides agentless, idempotent configuration management over SSH. Only applies mutations when configuration drift is detected, and records human-readable execution output.
- **Alternatives Considered:** Chef / Puppet (require persistent ruby/JVM agent daemons consuming 300–500 MB RAM on our single node), SaltStack, Raw Bash scripts (lack idempotency, state verification, and standardized error handling).

### Modular Ansible Roles

| Role Name | Key Playbook Tasks | Idempotent Action & Verification |
| :--- | :--- | :--- |
| **roles/common** | • OS Version Assertion<br/>• `apt` package cache update<br/>• Baseline utilities installation<br/>• Workspace directory setup | Asserts Ubuntu 22.04+; installs `curl, git, htop, jq, unzip, ca-certificates`; guarantees `/home/ubuntu/workspace/resqgrid` exists with `0755` permissions. |
| **roles/docker** | • Docker CLI verification<br/>• Systemd service assertion<br/>• Docker engine version check<br/>• Active container enumeration | Guarantees `docker.service` is active and enabled on boot; asserts non-root `ubuntu` user is in `docker` group; queries active containers via Go template formatting. |
| **roles/verification** | • `kubectl` binary assertion<br/>• `k3s` service status check<br/>• Kubernetes nodes ready check<br/>• Pod workload health assertion | Executes automated sanity checks post-provisioning; asserts all nodes report `Ready`; validates all 6 application and monitoring pods report `1/1 Running`. |

> **PROOF TO SHOW MENTOR:**
> 1. **Directory Layout:** Show `ansible/ansible.cfg`, `ansible/inventory/hosts.ini`, and `ansible/playbooks/site.yml`.
> 2. **SSH Connectivity:** Run `ansible -i ansible/inventory/hosts.ini all -m ping` (Returns `SUCCESS: "ping": "pong"`).
> 3. **Syntax Validation:** Run `ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/site.yml --syntax-check` (PASS).

---

## 6. Docker Containerization Architecture

- **What is Used:** Docker Engine 24+, Multi-stage Dockerfiles (`Node 22 Alpine` & `Nginx 1.27 Alpine`), Non-root security context (`USER node`), Docker Compose for local orchestration.
- **Why Used:** Guarantees process isolation, eliminates "works on my machine" drift, reduces container attack surface by omitting build tools (compilers, git, devDependencies) from runtime images, and achieves sub-second container startup.
- **Alternatives Considered:** Podman (daemonless rootless containers; Docker was retained for seamless Jenkins socket integration), containerd nerdctl, LXC (OS-level containers; lacks image registry packaging).

### Container Inventory (7 Total Containers)

| Container Identifier | Runtime Layer | Base Image & Ports | Purpose & Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **resqgrid-jenkins** | Host Docker | `jenkins/jenkins:lts`<br/>Port: 8080, 50000 | CI/CD pipeline controller. Manages build workspaces and communicates with host Docker socket. |
| **backend** | k3s containerd | `node:22-alpine` (multi)<br/>Port: 4000 (Internal) | Express REST API, real-time WebSocket hub, PostGIS query engine, and Prometheus metrics exporter. |
| **frontend** | k3s containerd | `nginx:1.27-alpine`<br/>Port: 80 (Internal) | Static single-page React SPA application server with client-side routing fallback and gzip compression. |
| **postgres** | k3s containerd | `postgres:16-alpine`<br/>Port: 5432 (Internal) | Relational database backing incident reports, citizen subscriptions, and audit logs. Attached to persistent volume. |
| **prometheus** | k3s containerd | `prom/prometheus:v2.45`<br/>Port: 9090 | Time-series metrics engine scraping backend endpoints, Kubernetes pods, and node metrics. |
| **grafana** | k3s containerd | `grafana/grafana:10.2`<br/>Port: 3000 | Telemetry dashboard rendering real-time graphs for CPU, memory, request rates, and WebSocket clients. |
| **alertmanager** | k3s containerd | `prom/alertmanager:v0.27`<br/>Port: 9093 | Alert deduplication, grouping, and notification engine routing critical infrastructure alerts to email. |

> **PROOF TO SHOW MENTOR:**
> 1. **File in VS Code:** Open `infra/docker/backend.Dockerfile` (show Stage 1 `builder` vs Stage 2 `runner` and `USER node`).
> 2. **File in VS Code:** Open `infra/docker/frontend.Dockerfile` (show Nginx multi-stage build and healthcheck).
> 3. **Terminal Command:** Run `docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"` on the EC2 host.

---

## 7. Kubernetes Orchestration (k3s Cluster Architecture)

- **What is Used:** k3s (Lightweight CNCF-certified Kubernetes v1.28+), Kustomize declarative manifests, Deployments, Services (ClusterIP), Traefik Ingress Controller, Horizontal Pod Autoscaler (HPA), ConfigMaps, and Secrets.
- **Why k3s Instead of Full EKS/kubeadm:** k3s packages Kubernetes into a single binary (<70 MB), replaces heavy etcd with embedded SQLite/kine, includes Traefik Ingress out of the box, and operates at **~550 MiB RAM overhead** compared to 2+ GiB for kubeadm/EKS. It also eliminates the $73/month AWS EKS managed control plane tax.
- **Cluster Resource Inventory:** 6 Pods (all 1/1 Running), 5 Services (ClusterIP), 1 Ingress Router, 1 HPA controller.

### Kubernetes Resources & Routing

| Kubernetes Resource | Kind & Namespace | Port / Routing Specification | High Availability & Operational Role |
| :--- | :--- | :--- | :--- |
| **backend-deployment** | Deployment<br/>`resqgrid` | TargetPort: 4000<br/>Service: `backend-service` | Managed by HPA (min 2, max 5 replicas based on 60% CPU target). Includes readiness & liveness probes. |
| **frontend-deployment** | Deployment<br/>`resqgrid` | TargetPort: 80<br/>Service: `frontend-service` | Serves static SPA web bundle. Managed via rolling update strategy (`maxSurge: 1, maxUnavailable: 0`). |
| **postgres-deployment** | Deployment<br/>`resqgrid` | TargetPort: 5432<br/>Service: `postgres-service` | Mounted to `local-path` PersistentVolumeClaim. Retains database records across pod restarts. |
| **resqgrid-ingress** | Ingress<br/>`resqgrid` | Host Ingress: 80 / 443<br/>Traefik Provider | Unified edge routing: `/api, /socket.io, /health, /metrics` routed to backend; `/` routed to frontend. |
| **resqgrid-backend-hpa** | HPA<br/>`resqgrid` | Target: `backend-deployment`<br/>Metric: CPU > 60% | Dynamically scales backend pod replicas up to 5 during emergency disaster report spikes. |

> **PROOF TO SHOW MENTOR:**
> 1. **File in VS Code:** Open `infra/k8s/ingress.yaml` (show unified routing rules) and `infra/k8s/deployment.yaml`.
> 2. **Live Workload Query:** Run `kubectl get pods -n resqgrid -o wide` (shows all 6 pods 1/1 Running with 0 restarts).
> 3. **Service & Ingress Query:** Run `kubectl get svc,ingress,hpa -n resqgrid` (validates ClusterIP bindings and Traefik routing).

---

## 8. Monitoring Tools & Observability Stack

- **What is Used:** Prometheus v2.45+ (Scraper & TSDB), Grafana v10.2 (Dashboard Visualization), Alertmanager v0.27.0 (Alert Dispatcher & Router), Gmail SMTP Relay.
- **Why Used:** Provides complete full-stack observability across physical node hardware, container runtimes, and application HTTP/WebSocket performance. Proactively routes critical alerts to email before users experience downtime.
- **Alternatives Considered:** Datadog / New Relic ($15–$30/host/month plus ingestion costs), AWS CloudWatch (high per-metric alarm cost, proprietary query language). Prometheus is the CNCF graduated gold standard.

### The 5 Prescribed Alert Rules

| Alert Rule Name | PromQL Expression | Threshold & Duration | Severity & Prescribed Action |
| :--- | :--- | :--- | :--- |
| **ResQGridBackendDown** | `up{job="resqgrid-backend-service"} == 0` | Target unreachable for **> 1 minute** | **CRITICAL**<br/>Immediate alert dispatch. Indicates pod crash or unhandled runtime termination. |
| **ResQGridHighErrorRate** | `sum(rate(http_requests_total{status_code=~"5.."}[2m])) / sum(rate(http_requests_total[2m])) * 100 > 5` | 5xx error rate **> 5%** over 2m window | **WARNING**<br/>Triggers notification when database connection pools or external upstream APIs fail. |
| **ResQGridHighRequestLatency** | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[2m])) by (le)) > 1.5` | p95 latency **> 1.5 seconds** for > 2m | **WARNING**<br/>Flags application thread starvation, slow spatial queries, or pending database locks. |
| **ResQGridEventLoopBlocked** | `nodejs_eventloop_lag_seconds > 0.2` | Event loop delay **> 200ms** for > 1m | **WARNING**<br/>Identifies synchronous blocking computations in Node.js event loop. |
| **ResQGridHighMemoryUsage** | `(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100 > 85` | Heap utilization **> 85%** for > 3m | **WARNING**<br/>Early warning of potential memory leaks before the Linux kernel triggers OOM-kill. |

> **PROOF TO SHOW MENTOR:**
> 1. **File in VS Code:** Open `infra/k8s/prometheus.yaml` (highlight lines 108–168 showing the 5 alert rules) and `infra/k8s/alertmanager.yaml`.
> 2. **Live Prometheus UI:** Navigate to `http://16.4.118.98:9090/alerts` (show active rules) and `http://16.4.118.98:9090/targets` (show green healthy endpoints).
> 3. **Live Grafana Dashboard:** Open `http://16.4.118.98:3000` to demonstrate CPU/RAM utilization and live request throughput charts.
> 4. **Email Routing Proof:** Show the live email notification received at `baranwaldevansh2004@gmail.com` with subject: `[ResQGrid Alert] FIRING: ResQGridAlertmanagerTestAlert (info)` and subsequent `RESOLVED` notification.

---

## 9. Security Tools & DevSecOps (Why SonarQube Was Replaced)

- **What is Used:** Aqua Trivy (Container layer CVE scanner), OWASP Dependency-Check (Software Composition Analysis), TypeScript strict mode (`tsc --noEmit`), AWS Security Groups defense-in-depth, Docker non-root users (`USER node`), and Kubernetes Secrets.
- **Why Used:** Enforces Shift-Left security across the entire development lifecycle, catching vulnerabilities before artifact compilation and isolating network ports at the hardware hypervisor boundary.
- **The SonarQube Memory Trade-Off (Why It Was Removed):**
  - SonarQube Community Edition requires a dedicated Java 17+ JVM and an embedded Elasticsearch cluster, mandating `vm.max_map_count >= 262144` and **3–4 GiB of dedicated heap RAM**.
  - Our single AWS EC2 instance (`c7i-flex.large`) possesses 4 GiB total RAM hosting k3s, Jenkins, PostgreSQL, and Prometheus. Running SonarQube pushes memory usage above 95%, triggering the Linux kernel Out-Of-Memory (OOM) killer, which terminates critical application pods.
  - **Strategic DevOps Solution:** We tested SonarQube in branch `feature/security-and-monitoring`, simulated a quality gate failure documented in release `v1.2.0-rc1` (see `docs/failures/build-fail-sonarqube-qualitygate.log`), and then strategically migrated to lightweight ephemeral security tools (Aqua Trivy + OWASP Dependency-Check + strict TypeScript compilation) in `v2.0.0`. These tools run ephemerally during CI builds with **< 250 MB peak memory**, achieving equivalent SAST/SCA security without destabilizing production workloads.

### Security Tool Comparison Matrix

| Tool Name | Security Domain | Memory Footprint | Enforcement Mechanism in Pipeline |
| :--- | :--- | :--- | :--- |
| **Aqua Trivy** | Container Image Scanning | < 150 MB (Ephemeral) | Scans container image OS packages & npm dependencies. Halts build on `HIGH` or `CRITICAL` CVEs. |
| **OWASP Dependency-Check** | Software Composition (SCA) | < 200 MB (Ephemeral) | Analyzes `package-lock.json` against the NVD database; fails pipeline if CVSS >= 7.0. |
| **Strict TypeScript Compiler** | Static Application Analysis (SAST) | < 120 MB (Ephemeral) | Enforces strict type safety (`noImplicitAny`, null checks); prevents null pointer dereference bugs. |
| **AWS Security Groups** | Network Boundary Defense | 0 MB (AWS Hypervisor) | Restricts DB port 5432 to k3s host; blocks public ingress to Kube API port 6443 and SSH port 22. |
| **SonarQube (Evaluated)** | Monolithic SAST & Quality Gate | **3.5–4.0 GiB (Resident)**<br/>*[Causes OOM Panic]* | Evaluated & documented in `v1.2.0-rc1`. Replaced by lightweight tooling to guarantee cluster uptime. |

> **PROOF TO SHOW MENTOR:**
> 1. **File in VS Code:** Open `docs/failures/build-fail-sonarqube-qualitygate.log` (show simulated SonarQube failure in build #5).
> 2. **File in VS Code:** Open `ansible/README.md` (section explaining memory trade-offs and lightweight security replacement).
> 3. **Release Tag:** Show GitHub Release `v1.2.0-rc1` where the failure was recorded as part of the version control journey.

---

## 10. Website Functionality: Location Service & Browser Security

> **Mentor Inquiry:** *"Why does the location service prompt for manual pins or show an HTTPS warning when accessing the website over `http://16.4.118.98`?"*

### Technical Defense
1. **W3C Secure Context Specification:** Modern web browsers (Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge) strictly prohibit hardware APIs—specifically `navigator.geolocation`—from executing over non-secure origins (plain HTTP public IP addresses). This is an RFC-standard browser sandbox security gate, not an application defect.
2. **Built-in Fallback Engineering:** Because our staging environment operates directly on a public IP address without an external domain name, we implemented a dual-mode strategy in the React frontend: client-side GPS detection with an automated fallback to campus test pins and manual coordinate injection.
3. **Production Ingress Posture:** In a production deployment with a domain name, TLS termination is handled at the Ingress layer (Traefik with cert-manager Let's Encrypt or an AWS Application Load Balancer with ACM), providing full HTTPS.

### 3 Demonstration Methods for Evaluators

| Demonstration Method | Exact Steps to Perform Live for Mentor | Outcome / Verification Displayed on Screen |
| :--- | :--- | :--- |
| **Method 1: 1-Click Campus Pin**<br/>*(Recommended — 0 Setup)* | 1. Open `http://16.4.118.98` in any browser.<br/>2. Note the yellow HTTPS explanation banner.<br/>3. Click the **"SRMIST Campus Pin (Manual)"** button. | Map instantly anchors to SRMIST coordinates (`12.8230°N, 80.0444°E`), draws the notification perimeter circle (10–250 km), and calculates live proximity to incidents. |
| **Method 2: Chrome Insecure Flag**<br/>*(10-Second Real GPS Demo)* | 1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.<br/>2. Enter: `http://16.4.118.98` and set to **Enabled**.<br/>3. Click **Relaunch** and reload site. | Chrome grants full GPS access over HTTP. Clicking **"Enable My Location"** prompts for device GPS and acquires your exact live coordinates. |
| **Method 3: Localhost Port Forward**<br/>*(Native Secure Context)* | 1. Run in PowerShell: `ssh -i key.pem -L 3000:localhost:80 ubuntu@16.4.118.98`.<br/>2. Open `http://localhost:3000` in your browser. | Browsers treat `localhost` as an intrinsically secure origin (`window.isSecureContext === true`). Device GPS activates without any flags. |

---

## 11. Mentor Viva Defense Sheet (Tough Questions & Authoritative Answers)

### Q1: Why did you separate Terraform from Ansible instead of using cloud-init for everything?
**Authoritative Answer:** Terraform is designed for Day-0 infrastructure provisioning (VPCs, subnets, hypervisors, security groups), while Ansible is designed for Day-1/Day-2 configuration management (packages, systemd services, users, verification). Putting 128 lines of bash in cloud-init makes the instance immutable in the wrong way: modifying a single script line forces Terraform to destroy and replace the running EC2 instance, causing catastrophic database data loss. Ansible provides agentless, idempotent configuration drift correction without re-creating virtual hardware.

### Q2: How does your architecture ensure zero downtime during software updates?
**Authoritative Answer:** In our Jenkinsfile and Kubernetes manifests, we implement Blue-Green deployments and Kubernetes rolling updates. When a new commit is merged, Jenkins builds the new container image and deploys Candidate pods alongside the active pods. Automated pre-promotion smoke tests verify health and WebSocket endpoints. Only after smoke tests pass does the Kubernetes Service selector switch traffic atomically. If smoke tests fail, the candidate is discarded and production traffic never drops a single packet.

### Q3: Why did you not keep SonarQube running inside your Kubernetes cluster?
**Authoritative Answer:** We conducted a thorough resource economics analysis on our single AWS EC2 instance (`c7i-flex.large`, 4 GiB RAM). SonarQube Community Edition requires a dedicated Java 17+ JVM and an embedded Elasticsearch cluster, requiring `vm.max_map_count >= 262144` and 3–4 GiB of dedicated heap memory. Running SonarQube pushes memory usage above 95%, triggering the Linux kernel Out-Of-Memory (OOM) killer, which terminates critical application pods. We solved this by implementing an ephemeral 3-tier DevSecOps gate: Aqua Trivy container scanning + OWASP Dependency-Check + strict TypeScript compilation. This achieves identical SAST/SCA security coverage with <250 MB peak RAM while maintaining 100% cluster stability.

### Q4: How do you prove that your monitoring stack actually detects outages and notifies engineers?
**Authoritative Answer:** We configured Prometheus scrape configs for all application pods and node metrics, paired with 5 prescribed alert rules (`ResQGridBackendDown`, `ResQGridHighErrorRate`, `ResQGridHighRequestLatency`, `ResQGridEventLoopBlocked`, `ResQGridHighMemoryUsage`). Alertmanager routes alerts via Gmail SMTP relay. We proved this by dispatching a synthetic test alert to `baranwaldevansh2004@gmail.com`; both the FIRING and RESOLVED notifications were received and confirmed in the inbox.

---

**Document Status:** Verified & Finalized for Academic Defense | **Institution:** SRM Institute of Science and Technology  
**Repository:** [github.com/RichieRichard0000/resqgrid-devops](https://github.com/RichieRichard0000/resqgrid-devops) | **Latest Release:** `v2.0.0`
