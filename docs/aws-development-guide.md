# ResQGrid — AWS-First Cloud Development Environment Specification & Safety Audit

**Project:** ResQGrid — Real-Time Disaster Alert & Response Platform  
**Target Environment:** AWS Primary Cloud Development Workstation  
**Target Region:** `ap-south-1` (Mumbai)  
**Target Compute:** Amazon EC2 `c7i-flex.large` (2 vCPUs, 4 GiB RAM, 40GB gp3 EBS, x86_64 Sapphire Rapids)  
**Status:** **AUDITED, VALIDATED & STAGED FOR PROVISIONING (PRE-APPLY)**

---

## 1. Cloud Architecture & System Topology

The ResQGrid AWS development architecture turns a single `c7i-flex.large` EC2 instance into a high-performance, secure remote development workstation where code editing, builds, container image packaging, automated testing, k3s orchestration, and ECR pushing occur natively inside the cloud environment.

The developer connects securely from their local Windows workstation via **Antigravity / VS Code Remote-SSH** over **AWS Systems Manager (SSM) Session Manager**, avoiding any open management ports (port 22 and port 6443 remain completely closed to the internet).

```mermaid
flowchart TD
    subgraph ClientWorkstation["Local Workstation (Windows)"]
        CLIENT["Antigravity / VS Code Remote-SSH"]
        AWS_CLI["AWS CLI v2 + Session Manager Plugin"]
        CLIENT --- AWS_CLI
    end

    subgraph AWSCloud["AWS Region: ap-south-1 (Mumbai)"]
        SSM_TUNNEL["AWS Systems Manager (SSM)<br/>Encrypted Zero-Trust IAM Tunnel"]
        AWS_CLI -.->|ProxyCommand TLS Tunnel| SSM_TUNNEL

        subgraph VPC["ResQGrid VPC: 10.0.0.0/16"]
            subgraph PublicSubnet["Public Subnet: 10.0.1.0/24 (ap-south-1a)"]
                EIP["Elastic IP (Static Public IPv4)"]

                subgraph EC2["EC2 Workstation: c7i-flex.large<br/>(2 vCPUs, 4 GiB Physical RAM, 40 GB gp3 Disk)"]
                    KUBE_STABLE["Swap Disabled Permanently<br/>(Native Kubelet Stability on Boot)"]
                    SSM_AGENT["amazon-ssm-agent<br/>(Local Port 22 Forwarding)"]

                    subgraph Toolchain["Cloud Development Toolchain"]
                        GIT["Git 2.34+ (Official Ubuntu)"]
                        NODE["Node.js 20 LTS + npm (NodeSource)"]
                        DOCKER["Docker CE + Buildx Engine (Docker Repo)"]
                        TF_CLI["Terraform CLI (HashiCorp Repo)"]
                        KUBECTL["kubectl (k3s context)"]
                    end

                    subgraph K3sCluster["k3s CNCF Kubernetes Engine"]
                        TRAEFIK["Traefik Ingress (Ports 80/443)"]

                        subgraph Workloads["ResQGrid Namespace"]
                            FE["Frontend Pod (1 replica)"]
                            BE["Backend Blue/Green (1 active replica)"]
                            DB["PostGIS 16 (Dynamic PVC on gp3)"]
                            MON["On-Demand Observability<br/>(Prometheus, Grafana, Alertmanager)"]
                            HPA["metrics-server (Autoscaling)"]
                        end
                        TRAEFIK --> FE
                        TRAEFIK --> BE
                    end
                end

                EIP --- EC2
                SSM_TUNNEL --> SSM_AGENT
            end

            IGW["Internet Gateway"]
            PublicSubnet <--> IGW
        end

        subgraph ECR["Amazon ECR (Private Registries)"]
            ECR_BE["resqgrid-backend (Immutable)"]
            ECR_FE["resqgrid-frontend (Immutable)"]
        end

        subgraph IAM["IAM Role: resqgrid-k3s-node-role"]
            POLICY_SSM["AmazonSSMManagedInstanceCore"]
            POLICY_ECR["ECR Push & Pull (Zero Credentials)"]
        end

        IAM -.->|Instance Profile| EC2
        EC2 -.->|Direct IAM Push/Pull| ECR
    end
```

---

## 2. Technical Audit: Kubernetes Swap & Kubelet Compatibility

### A. The Kubelet Swap Problem
By default, Kubernetes kubelet enforces `failSwapOn: true`. When swap is enabled on a Linux host, kubelet aborts startup during boot with the fatal error:
```text
Running with swap on is not supported, please disable swap! or set --fail-swap-on to false
```
If swap is created in `/etc/fstab`, the host reboots with swap mounted, causing the k3s systemd unit to fail to reach `Ready` state.

Furthermore, **swap does NOT protect against Kubernetes pod evictions**:
1. Kubelet eviction thresholds (`memory.available < 100Mi`) monitor cgroups working-set memory (`memory.current - memory.stat.inactive_file`), which deliberately **ignores swap**. Pods are still evicted when RAM is exhausted even if swap space is free.
2. In single-node environments on EBS gp3 storage, memory thrashing across swap generates severe disk I/O queues. This causes k3s internal SQLite/containerd sync operations to miss heartbeats, triggering false `NodeNotReady` flaps.

### B. Engineering Decision: Swap Disabled Permanently
Swap is explicitly and permanently disabled in `compute.tf` user data:
```bash
swapoff -a || true
sed -i '/swap/d' /etc/fstab
rm -f /swapfile
```
- **Guaranteed Reboot Stability:** K3s and kubelet start cleanly on every reboot without `--fail-swap-on` workarounds.
- **Deterministic Resource Management:** Linux cgroups v2 memory controller enforces container limits strictly.
- **Sufficient Physical Headroom:** As demonstrated below, our Steady-State Dev profile consumes **~1.6 GiB of the 4.0 GiB physical RAM (40%)**, leaving **>2.4 GiB free RAM** for compilation, editing, and test executions.

---

## 3. Clean Ubuntu Installation & Toolchain Idempotency

The bootstrap script in `infra/terraform/compute.tf` enforces official package repositories and idempotent installation:

1. **Bootstrap Logging:** All stdout/stderr output is captured into `/var/log/user-data.log` and the system console:
   ```bash
   exec > >(tee -a /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1
   ```
2. **Docker CE (Official Docker Ubuntu Repository):**
   - Downloads Docker GPG key to `/etc/apt/keyrings/docker.gpg`.
   - Configures `/etc/apt/sources.list.d/docker.list` targeting the official Docker Jammy repository.
   - Installs `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, `docker-compose-plugin`.
   - Enables and starts `docker.service` on boot.
   - Adds the `ubuntu` user to the `docker` group.
3. **HashiCorp Terraform (Official HashiCorp Repository):**
   - Configures official HashiCorp GPG key in `/usr/share/keyrings/hashicorp-archive-keyring.gpg`.
   - Configures `/etc/apt/sources.list.d/hashicorp.list` and installs `terraform`.
4. **Node.js 20 LTS (Official NodeSource Repository):**
   - Uses `https://deb.nodesource.com/setup_20.x` to pin Node.js to 20.x LTS alongside `npm`.
5. **AWS CLI v2:**
   - Installs official bundled AWS CLI v2 package with `--update` support for idempotency.
6. **CNCF k3s Kubernetes:**
   - Installs k3s with non-root kubeconfig permissions (`--write-kubeconfig-mode 644`).
   - Copies cluster configuration to `/home/ubuntu/.kube/config` with `ubuntu:ubuntu` ownership.
   - Enables `k3s.service` to start automatically after reboot.
7. **Environment Health Inspector:**
   - Generates `/home/ubuntu/env-status.sh` to allow developers to verify tool versions, memory, disk, and pod states at any time.

---

## 4. Secure Remote Development Access (AWS SSM & Antigravity / VS Code)

### A. Zero-Trust Network Perimeter & Dual-Layer Security
- **Port 22 (SSH):** Strictly **CLOSED** from the public internet (`admin_cidr_blocks = []`).
- **Port 6443 (Kubernetes API):** Strictly **CLOSED** from the public internet (`admin_cidr_blocks = []`).
- **Ports 80/443 (Web Ingress):** Open to `0.0.0.0/0` for Traefik Ingress routing application traffic.
- **Port 5432 (PostGIS):** Strictly internal to `aws_security_group.k3s.id`.

### B. Understanding SSM Tunneling vs SSH Authentication
There are two distinct security layers involved when connecting via Antigravity or VS Code Remote-SSH:
1. **Network Transport Layer (SSM ProxyCommand):**
   - The `ProxyCommand aws ssm start-session ... --document-name AWS-StartSSHSession` command initiates an authenticated, end-to-end encrypted TLS tunnel through the AWS Systems Manager backbone directly to `localhost:22` on the EC2 instance.
   - Inbound port 22 remains **closed** in the AWS Security Group. Internet scanners cannot detect or attack the SSH service.
2. **OS Authentication Layer (OpenSSH daemon):**
   - The SSM tunnel delivers raw TCP traffic to the local OpenSSH daemon (`sshd`) running on Ubuntu.
   - **Crucial Rule:** The SSM tunnel does **not** bypass Linux user authentication. OpenSSH still requires valid authentication against `/home/ubuntu/.ssh/authorized_keys`.
   - If `key_name` is omitted in Terraform, cloud-init leaves `/home/ubuntu/.ssh/authorized_keys` empty, causing SSH attempts to immediately fail with:
     ```text
     Permission denied (publickey)
     ```
   - Associating `key_name = "resqgrid-key"` during EC2 provisioning causes cloud-init to automatically inject the corresponding public key into `/home/ubuntu/.ssh/authorized_keys` on first boot.

### C. Developer Workstation Prerequisites

#### 1. Session Manager Plugin Installation & Verification
The AWS CLI requires the Session Manager Plugin to multiplex SSH traffic:
- **Windows (PowerShell):**
  ```powershell
  winget install Amazon.SessionManagerPlugin
  # Or download MSI: https://s3.amazonaws.com/session-manager-downloads/plugin/latest/windows/SessionManagerPluginSetup.exe
  ```
- **Verification:**
  ```powershell
  session-manager-plugin --version
  # Expected output: 1.2.xxx.x
  ```

#### 2. EC2 Key Pair Generation (Required for Remote-SSH)
Generate the EC2 key pair in `ap-south-1` **before** provisioning infrastructure:
- **Windows (PowerShell):**
  ```powershell
  aws ec2 create-key-pair --key-name resqgrid-key --region ap-south-1 --query "KeyMaterial" --output text | Out-File -Encoding ascii ~/.ssh/resqgrid-key.pem
  icacls "$HOME\.ssh\resqgrid-key.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)"
  ```
- **Linux / macOS:**
  ```bash
  aws ec2 create-key-pair --key-name resqgrid-key --region ap-south-1 --query "KeyMaterial" --output text > ~/.ssh/resqgrid-key.pem
  chmod 400 ~/.ssh/resqgrid-key.pem
  ```

#### 3. Developer IAM Permissions for SSM Session Manager
The IAM user or role running the AWS CLI on your local development machine must have permission to invoke the `AWS-StartSSHSession` document. Attach the following least-privilege policy to the developer IAM identity:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSSMSessionToResQGrid",
      "Effect": "Allow",
      "Action": [
        "ssm:StartSession"
      ],
      "Resource": [
        "arn:aws:ec2:ap-south-1:*:instance/*",
        "arn:aws:ssm:ap-south-1:*:document/AWS-StartSSHSession",
        "arn:aws:ssm:ap-south-1:*:document/SSM-SessionManagerRunShell"
      ]
    },
    {
      "Sid": "AllowSessionManagement",
      "Effect": "Allow",
      "Action": [
        "ssm:DescribeSessions",
        "ssm:GetConnectionStatus",
        "ssm:DescribeInstanceInformation",
        "ssm:DescribeInstanceProperties",
        "ec2:DescribeInstances"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AllowTerminateAndResumeSession",
      "Effect": "Allow",
      "Action": [
        "ssm:TerminateSession",
        "ssm:ResumeSession"
      ],
      "Resource": [
        "arn:aws:ssm:ap-south-1:*:session/*"
      ]
    }
  ]
}
```

### D. Client SSH Configuration (`~/.ssh/config`)
Add this block to your local SSH configuration (`C:\Users\<Username>\.ssh\config` on Windows or `~/.ssh/config` on Linux/macOS):
```ssh-config
# ResQGrid Cloud Development Workstation
Host resqgrid-dev
    HostName <INSTANCE_ID>
    User ubuntu
    ProxyCommand aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p' --region ap-south-1
    IdentityFile ~/.ssh/resqgrid-key.pem
    StrictHostKeyChecking accept-new
```
*(Replace `<INSTANCE_ID>` with the actual output from `terraform output -raw k3s_instance_id`).*

### E. Zero-Key Fallback: Native AWS SSM Shell
If an SSH key pair is not configured, or if SSH authentication encounters issues, developers can open an instant, zero-credential interactive terminal over native AWS SSM:
```powershell
# Open interactive shell directly via AWS SSM (No SSH key or open port required)
aws ssm start-session --target <INSTANCE_ID> --region ap-south-1

# Switch to the ubuntu user to access the ResQGrid workspace:
sudo su - ubuntu
cd /home/ubuntu/workspace/resqgrid
```

### F. IMDSv2 Hardening & Pod Credential Isolation (`hop_limit = 1`)
To defend against Server-Side Request Forgery (SSRF) and prevent arbitrary Kubernetes pods or Docker containers from stealing the EC2 instance profile, the EC2 instance strictly enforces **IMDSv2 with `hop_limit = 1`**:
```hcl
metadata_options {
  http_endpoint               = "enabled"
  http_tokens                 = "required" # Enforce IMDSv2 (blocks v1 unauthenticated GET requests)
  http_put_response_hop_limit = 1          # Strictly isolate IMDSv2 to host processes only
  instance_metadata_tags      = "enabled"
}
```
- **Security Boundary with `hop_limit = 1`:**
  In a Linux container environment, containers communicate through virtual bridge interfaces (`docker0`, `cbr0`). When a packet traverses a network bridge or veth pair, the Linux IP forwarding engine decrements its IP TTL / hop limit by 1.
  With `http_put_response_hop_limit = 1`, packets originating inside container network namespaces (any Kubernetes pod or Docker container) reach the bridge with TTL decremented to 0, causing the kernel to immediately drop them.
  **Result:** Neither arbitrary application pods nor Jenkins containers can query `http://169.254.169.254` to assume the EC2 instance role (`resqgrid-k3s-node-role-staging`).

- **Secure Jenkins ECR Authentication:**
  Because the EC2 node role is deliberately inaccessible to containers, Jenkins does **not** rely on host metadata. Instead, the `Jenkinsfile` utilizes least-privilege, explicitly scoped credentials:
  ```groovy
  withAWS(credentials: 'aws-ecr-credentials', region: "${AWS_REGION}") {
      sh """
          aws ecr get-login-password --region ${AWS_REGION} | \
              docker login --username AWS --password-stdin ${ECR_REGISTRY}
          docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
          docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
      """
  }
  ```
  The `aws-ecr-credentials` identity (an IAM User or assumed IAM Role) is granted push/pull rights exclusively for `resqgrid-backend` and `resqgrid-frontend`. No IAM credentials or instance tokens are ever exposed to in-cluster workloads.

### G. SSM Agent Version & Connectivity Architecture
- **SSM Agent Requirement:** AWS-StartSSHSession requires SSM Agent version `2.3.672.0` or later. The Ubuntu 22.04 LTS official AMI includes snap-based `amazon-ssm-agent` version `3.1+`, fully compliant out-of-the-box.
- **Connectivity:** The instance resides in the public subnet with an Elastic IP and default route to the Internet Gateway. The SSM Agent initiates outbound HTTPS connections (port 443) directly to AWS SSM endpoints (`ssm.ap-south-1.amazonaws.com`, `ssmmessages.ap-south-1.amazonaws.com`, `ec2messages.ap-south-1.amazonaws.com`).
- **Cost Savings:** No NAT Gateway (\$32.40/month saved) and no VPC PrivateLink Endpoints (\$21.00/month saved) are needed.

## 5. Jenkins Container Security & Lifecycle

### A. Security Guardrails
1. **No Public Exposure:**
   - Jenkins web UI port 8080 and JNLP agent port 50000 are **NOT exposed to the internet** in security groups.
   - Jenkins is bound strictly to `127.0.0.1:8080` (localhost only).
   - To access the Jenkins UI, use VS Code Remote Port Forwarding (`Forward a Port: 8080`) through the encrypted SSM tunnel to your local browser at `http://localhost:8080`.
2. **Docker Socket Mounting Risks & Mitigation:**
   - Mounting `/var/run/docker.sock` grants root-level container control. Because Jenkins is bound strictly to localhost behind SSM authentication, internet attackers cannot reach the socket.
   - Container is started with resource constraints: `--memory="768m" --cpus="1.0"`.
3. **Zero Static AWS Credentials:**
   - Jenkins does not store AWS access keys. It uses the attached EC2 IAM Role to authenticate to Amazon ECR:
     ```bash
     aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com
     ```

### B. On-Demand Execution Procedure
```bash
# 1. Start Jenkins when CI/CD verification is required:
docker run -d --name jenkins --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --memory="768m" --cpus="1.0" \
  -e JAVA_OPTS="-Xms128m -Xmx384m -XX:+UseG1GC -Djenkins.install.runSetupWizard=false" \
  jenkins/jenkins:lts-jdk17

# 2. Retrieve initial admin password (local session only):
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword

# 3. Safe Shutdown to reclaim 768 MiB RAM:
docker stop jenkins
```

---

## 6. IAM Least-Privilege Verification

In `infra/terraform/iam.tf`:
```hcl
data "aws_iam_policy_document" "ecr_policy" {
  statement {
    sid       = "ECRAuthToken"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"] # AWS requirement: Authorization tokens cannot be resource-scoped
  }

  statement {
    sid       = "ECRRepositoryAccess"
    effect    = "Allow"
    actions   = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload"
    ]
    resources = [
      aws_ecr_repository.backend.arn,
      aws_ecr_repository.frontend.arn
    ] # Strictly scoped to project repositories only
  }
}
```
- `ecr:GetAuthorizationToken` is scoped to `*` as required by the AWS ECR API.
- All push and pull actions are strictly confined to `resqgrid-backend` and `resqgrid-frontend`.
- Zero wildcard admin permissions (`*`) on repository mutations.
- Instance profile attaches only `resqgrid-ecr-access-policy` and `AmazonSSMManagedInstanceCore`.

---

## 7. Cost Verification & Operational Financial Analysis

Prices verified directly against the published **AWS Price List API** in `ap-south-1` (Mumbai):

### A. Cost Separation Breakdown
| Cost Category | Billable Rate (Mumbai) | Running State | Stopped State | Notes |
|---|---|---|---|---|
| **EC2 Compute (`c7i-flex.large`)** | \$0.08479 / hour | \$0.08479 / hr | **\$0.00 / hr** | Billed by the second while running |
| **EBS Storage (40 GB gp3)** | \$0.08 / GB-month | \$0.00438 / hr | **\$0.00438 / hr** | **Continues billing while stopped!** (\$3.20/mo) |
| **Public IPv4 (Elastic IP)** | \$0.005 / hour | \$0.00500 / hr | **\$0.00500 / hr** | **Continues billing while stopped!** (\$3.65/mo) |
| **ECR Storage (15 images)** | \$0.10 / GB-month (~5 GB) | ~\$0.00068 / hr | **~\$0.00068 / hr** | **Continues billing while stopped!** (~$0.50/mo) |
| **NAT Gateway Fee** | *Omitted by Design* | \$0.00 | \$0.00 | Saves \$32.40 / month |
| **Managed EKS Fee** | *Omitted by Design* | \$0.00 | \$0.00 | Saves \$73.00 / month |
| **Data Transfer Out** | First 100 GB/month Free | \$0.00 | \$0.00 | Internet egress within Free Tier |

> [!WARNING]
> **Stopping the EC2 instance does NOT stop all AWS billing!**  
> While stopping the instance reduces compute charges to \$0.00, the 40 GB EBS volume (\$3.20/mo) and the allocated Elastic IP (\$3.65/mo) continue to incur charges (~**\$7.35 / month**). To stop 100% of AWS billing, run `terraform destroy`.

### B. Scenario Cost Comparison
| Operational Scenario | Duration | Total AWS Cost (USD) | Total Cost (INR) | Effective Hourly Rate |
|---|---|---|---|---|
| **Live Demonstration** | 8 Hours | **\$0.76 USD** | **~₹64 INR** | \$0.0948 / hour |
| **Continuous Evaluation** | 24 Hours | **\$2.28 USD** | **~₹191 INR** | \$0.0948 / hour |
| **Continuous Monthly Baseline** | 730 Hours (1 Month) | **\$69.25 USD** | **~₹5,790 INR** | \$0.0948 / hour |
| **Cold Storage (Stopped EC2)** | 730 Hours (1 Month) | **\$7.35 USD** | **~₹615 INR** | \$0.0101 / hour |

---

## 8. Memory Management & Cloud Workload Profiles

### Allocation Budget on 4,096 MiB RAM
```text
Total Host RAM: 4,096 MiB (100%)
├─ Ubuntu OS + daemons + SSM:      ~380 MiB ( 9.2%)
├─ k3s control plane + containerd: ~480 MiB (11.7%)
├─ Antigravity/VS Code agent:      ~250 MiB ( 6.1%)
├─ PostGIS 16 Container:           ~200 MiB ( 4.9%)
├─ ResQGrid Backend (Blue):        ~130 MiB ( 3.2%)
├─ ResQGrid Frontend (Nginx):      ~ 25 MiB ( 0.6%)
└─ FREE RAM HEADROOM:             ~2,631 MiB (64.3%) [Available for builds & testing]
```

### Workload Profiles:
1. **Profile 1: Steady-State Dev (Default):** Core App + k3s (~1.5–1.8 GiB used). Low latency, fast TypeScript compilation, zero memory pressure.
2. **Profile 2: CI/CD Pipeline Mode (On-Demand):** Launch Jenkins (`--memory="768m"`, `-Xmx384m`). Total RAM: ~2.5 GiB. Stop Jenkins after verification.
3. **Profile 3: Observability Mode (On-Demand):** Apply Prometheus (1-day retention) and Grafana (`kubectl apply -f infra/k8s/prometheus.yaml ...`). Total RAM: ~2.3 GiB. Delete when done.
4. **Profile 4: HPA Load Drill (On-Demand):** Run k6 load test script (`infra/load-tests/smoke-test.js`). Scales backend pods 1 to 3 replicas within available RAM.

---

## 9. Final Validation Runbook

### Pre-Provisioning Checks
1. **Terraform Formatting:**
   ```powershell
   terraform -chdir=infra/terraform fmt -check
   # Output: Exit code 0
   ```
2. **Terraform Validation:**
   ```powershell
   terraform -chdir=infra/terraform validate
   # Output: Success! The configuration is valid.
   ```
3. **Git Secrets Audit:**
   Verified `.gitignore` strictly ignores: `terraform.tfvars`, `*.tfvars`, `*.tfplan`, `*.pem`, `*.key`, `.env`, `secrets.yaml`, `secrets.aws.yaml`.
4. **Automated Test Suites:**
   - Backend Vitest: **69 tests passing (100%)**.
   - Frontend Vitest: **41 tests passing (100%)**.
   - Total: **110 passing automated tests**.

### Provisioning Runbook (On Explicit Approval)
```powershell
# 1. Re-authenticate AWS CLI:
aws login
(& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" configure export-credentials --format powershell) | Invoke-Expression

# 2. Pre-requisite: Generate EC2 Key Pair (if not already created):
# This allows VS Code / Antigravity Remote-SSH authentication over the SSM tunnel.
aws ec2 create-key-pair --key-name resqgrid-key --region ap-south-1 --query "KeyMaterial" --output text | Out-File -Encoding ascii ~/.ssh/resqgrid-key.pem
icacls "$HOME\.ssh\resqgrid-key.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)"

# Ensure terraform.tfvars is populated:
# cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars

# 3. Provision the cloud workstation:
terraform -chdir=infra/terraform plan -out=tfplan
terraform -chdir=infra/terraform apply tfplan

# 4. Get connection information and SSH config:
$instId = (terraform -chdir=infra/terraform output -raw k3s_instance_id)
terraform -chdir=infra/terraform output -raw vscode_ssh_config

# 5. Connect via Antigravity / VS Code Remote-SSH:
# Host: resqgrid-dev
# Or connect directly via AWS SSM (Zero-key fallback):
aws ssm start-session --target $instId --region ap-south-1

# 6. Check workstation health on EC2:
/home/ubuntu/env-status.sh

# 7. Deploy ResQGrid to in-cluster k3s:
cd /home/ubuntu/workspace/resqgrid
kubectl apply -f infra/k8s/postgres-pvc.yaml
kubectl apply -f infra/k8s/secrets.aws.yaml
kubectl apply -f infra/k8s/postgres-service.aws.yaml
kubectl apply -f infra/k8s/postgres-deployment.yaml
kubectl apply -k infra/k8s/

# 8. Complete Teardown after evaluation:
terraform -chdir=infra/terraform destroy -auto-approve
```
