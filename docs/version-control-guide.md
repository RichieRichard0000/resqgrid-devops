# Git Version Control Strategy & Release Lifecycle — ResQGrid

This document outlines the professional **Git Version Control Strategy** implemented for the **ResQGrid** disaster alert and response platform, following Semantic Versioning (SemVer 2.0), Trunk-Based Development, and automated Pull Request workflows.

---

## 1. Versioning Architecture Overview

```
[v1.0.0] ───────────────> [v1.1.0] ───────────────> [v1.2.0-rc1 (FAILED)] ──> [v2.0.0 (LATEST)]
Day-0 Infrastructure     Day-1 Configuration      Security Pipeline Gate       Full Observability
Terraform (VPC/EC2)      Ansible Playbooks        Quality Gate Threshold       Prometheus & Trivy
```

| Release Tag | Release Type | Focus Area | Architectural Milestones |
| :--- | :--- | :--- | :--- |
| **`v1.0.0`** | Major Release | **Infrastructure Config (Terraform)** | AWS VPC (`10.0.0.0/16`), Public/Private subnets, Internet Gateway, Security Groups, and EC2 instance provisioning. |
| **`v1.1.0`** | Minor Release | **Server Config (Ansible)** | Ansible configuration management (`roles/common`, `roles/docker`, `roles/verification`), stripped cloud-init. |
| **`v1.2.0-rc1`** | Release Candidate | **Pipeline Failure Drill** | Initial automated security gate integration. Simulated build failure due to strict coverage threshold (78.4% vs 95%). |
| **`v2.0.0`** | Major Release | **Security & Observability** | Prometheus v2.50.1, Grafana v10.3.3, Alertmanager SMTP email routing, Aqua Trivy 0.76.2 & OWASP Dependency-Check. |

---

## 2. Branching Strategy

ResQGrid utilizes a **Trunk-Based Development** model with short-lived feature branches:

```
main (Protected) ───────────●───────────────────────────●───────────● (v2.0.0)
                             \                         /
feature/security-monitoring   ●───────●───────●───────● (PR #1 Merged)
```

1. **`main` Branch:**
   - Represents production-ready, deployable code.
   - Protected against direct force-pushes.
   - All changes must arrive via verified Pull Requests.
2. **Feature Branches (`feature/*`, `fix/*`, `infra/*`):**
   - Created for specific tasks (e.g., `feature/security-and-monitoring`).
   - Subject to code review, automated testing, and security checks before merging.

---

## 3. Pull Request (PR) & Code Review Workflow

Every change merged into `main` adheres to our standardized Pull Request template ([.github/pull_request_template.md](file:///C:/Users/baran/Downloads/Devops_project/.github/pull_request_template.md)):
1. **Summary of Changes:** Clear description of the problem solved.
2. **Type of Change:** Semantic tags (`feat`, `fix`, `security`, `docs`).
3. **Verification Checklist:**
   - 110 automated Vitest unit/integration tests passing.
   - Strict TypeScript compiler verification (`tsc --noEmit`).
   - Security scanning passed (zero critical CVEs or hardcoded secrets).
   - Kubernetes manifests validated with zero resource leaks.

---

## 4. Release History & Changelog

### Version 1.0.0 — Initial Infrastructure Provisioning
- **Commit:** `546cae7`
- **Changelog:**
  - Provisioned AWS VPC (`10.0.0.0/16`) in `ap-south-1`.
  - Configured public subnet (`10.0.1.0/24`) and isolated private subnet (`10.0.2.0/24`).
  - Attached AWS Internet Gateway with route tables.
  - Hardened Security Groups with zero open management ports to WAN.

### Version 1.1.0 — Ansible Configuration Management
- **Commit:** `89f34c6`
- **Changelog:**
  - Introduced Ansible configuration management suite (`ansible/`).
  - Implemented modular roles: `common` (OS & baseline packages) and `docker` (daemon state).
  - Configured zero-trust SSH over AWS Systems Manager Session Manager.
  - Stripped cloud-init `user_data` from Terraform to enforce separation of concerns.

### Version 1.2.0-rc1 — Security Pipeline Integration [BUILD FAILED]
- **Commit:** `8a8016a`
- **Changelog / Failure Report:**
  - Integrated automated static code analysis into the Jenkins CI/CD pipeline.
  - Configured initial Quality Gate with strict 95% line coverage threshold.
  - **Pipeline Failure:** Jenkins Build #5 failed at the quality gate step (coverage was 78.4%).
  - Demonstrates automated security guardrails preventing non-compliant code from deploying.

### Version 2.0.0 — Production Observability, Security & Rollbacks
- **Commit:** Current `main`
- **Changelog:**
  - Deployed Prometheus v2.50.1 scraping application metrics from `/metrics`.
  - Provisioned Grafana v10.3.3 real-time dashboard visualizing p95 latency and error rate.
  - Deployed Alertmanager v0.27.0 with TLS-authenticated Gmail SMTP email routing.
  - Verified automated `[FIRING]` and `[RESOLVED]` email alerts received by operations team.
  - Integrated Aqua Trivy 0.76.2 filesystem CVE scanner and OWASP Dependency-Check 12.1.0.
  - Validated Blue-Green zero-downtime deployment engine with automated rollback in <2 seconds.
