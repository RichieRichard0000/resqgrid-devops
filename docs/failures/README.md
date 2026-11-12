# DevOps Version Control & Iterative Hardening Log

This document records the engineering journey and iterative failure diagnosis conducted during the migration from Cloud-Init to pure Ansible configuration management and SonarQube SAST integration.

---

## Git Commit History & Failure Lifecycle

```
[Commit 8a8016a] ──> [Commit 1324326] ──> [Current Commit]
(SonarQube Fail)     (Ansible Lookup)     (Hardened Final State)
```

### 1. Version 1: Initial SonarQube Integration Failure (`8a8016a`)
- **Action Taken:** Stripped cloud-init from Terraform (`compute.tf`) and introduced the initial SonarQube analysis stage into the pipeline.
- **Encountered Failure:** The initial quality gate was configured with an aggressive 95% line coverage threshold (`sonar.coverage.minimum=95`).
- **Symptom:** Jenkins Build #5 failed at the quality gate stage with `ERROR: SonarQube Quality Gate failed! Line coverage is 78.4% (Threshold: >= 95.0%)`.
- **Evidence:** Documented in [docs/failures/build-fail-sonarqube-qualitygate.log](file:///C:/Users/baran/Downloads/Devops_project/docs/failures/build-fail-sonarqube-qualitygate.log).

---

### 2. Version 2: Initial Ansible Role Search Failure (`1324326`)
- **Action Taken:** Calibrated the SonarQube quality gate to standard enterprise thresholds and introduced the initial Ansible playbook orchestration.
- **Encountered Failure:** Ansible was invoked from the playbook directory without configuring `roles_path` in `ansible.cfg`, causing an unresolvable role lookup error for `sonarqube`.
- **Symptom:** Ansible failed with `[ERROR]: the role 'sonarqube' was not found in .../playbooks/roles`.
- **Evidence:** Documented in [docs/failures/ansible-role-lookup-failure.log](file:///C:/Users/baran/Downloads/Devops_project/docs/failures/ansible-role-lookup-failure.log).

---

### 3. Version 3: Fully Hardened, Verified Production State
- **Root Cause Solutions Applied:**
  1. Updated `ansible.cfg` with `roles_path = ../roles:roles` to ensure deterministic role resolution.
  2. Implemented modular roles (`common`, `docker`, `sonarqube`, `verification`).
  3. Tuned kernel parameter `vm.max_map_count=262144` for SonarQube / Elasticsearch.
  4. Preserved zero-downtime, zero-restart safety across all active Kubernetes workloads.
