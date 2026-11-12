# ResQGrid — AWS Cloud Deployment Architecture & Execution Plan

**Project:** ResQGrid — Real-Time Disaster Alert & Response Platform  
**Target Evaluation:** Faculty Presentation & Cloud DevOps Live Defense  
**Institution:** SRM Institute of Science and Technology, Kattankulathur  
**Region Evaluated:** `ap-south-1` (Mumbai)  
**Target Compute:** `c7i-flex.large` (2 vCPUs, 4 GiB RAM, x86_64 — Sapphire Rapids)  
**Status:** **AUDITED, VALIDATED & READY FOR PROVISIONING (ON APPROVAL)**

---

## 1. Cloud Architecture & Infrastructure Audit

The Terraform configuration under `infra/terraform/` defines a lean, production-grade cloud topology tailored for high compute performance and cost control.

```mermaid
flowchart TD
    subgraph AWSCloud["AWS Region: ap-south-1 (Mumbai)"]
        subgraph VPC["Custom VPC: 10.0.0.0/16"]
            subgraph PublicSubnet["Public Subnet: 10.0.1.0/24 (ap-south-1a)"]
                EIP["Elastic IP (Static Public IPv4)"]
                EC2["EC2 Instance: c7i-flex.large<br/>(2 vCPU, 4 GiB RAM, x86_64 Sapphire Rapids)<br/>OS: Ubuntu 22.04 LTS (Jammy)<br/>Storage: 30GB gp3 (Encrypted, 3000 IOPS)"]
                EIP --- EC2
                
                subgraph K3sCluster["k3s CNCF Kubernetes Engine (In-VM)"]
                    TRAEFIK["Traefik Ingress (Ports 80/443)"]
                    PODS["ResQGrid Cloud Workloads<br/>• Frontend (1 replica)<br/>• Backend Blue/Green (1 active / 1 candidate)<br/>• PostGIS 16-3.4 (In-cluster PVC)<br/>• Prometheus (Lean TSDB) & Alertmanager<br/>• Grafana Dashboard"]
                    METRICS["metrics-server (HPA Autoscaling)"]
                    TRAEFIK --> PODS
                end
                EC2 --- K3sCluster
            end
            
            subgraph PrivateSubnet["Private Subnet: 10.0.2.0/24 (ap-south-1a)"]
                DB_ISOLATION["Isolated Internal Route Table<br/>(No NAT Gateway - Saves $32.40/mo)"]
            end
            
            IGW["Internet Gateway"]
            PublicSubnet <--> IGW
        end
        
        subgraph ECR["Amazon ECR (Private Repositories)"]
            ECR_BE["resqgrid-backend (Immutable tags)"]
            ECR_FE["resqgrid-frontend (Immutable tags)"]
        end
        
        subgraph IAM["IAM Zero-Trust Perimeter"]
            ROLE["k3s Node Role"]
            POLICY_ECR["ECR Pull Policy (Least Privilege)"]
            POLICY_SSM["AmazonSSMManagedInstanceCore"]
            ROLE --- POLICY_ECR
            ROLE --- POLICY_SSM
        end
        
        IAM -.->|Instance Profile| EC2
        ECR -.->|Image Pulls| K3sCluster
    end
```

### Detailed Component Inventory
| Terraform File | AWS Resources Provisioned | Technical Configuration & Security Control |
|---|---|---|
| **`main.tf`** | Provider `aws` (`~> 5.40`) | Minimum Terraform version `>= 1.5.0`. Standard resource tags (`Project`, `Environment`, `ManagedBy`, `Institution: SRMIST-CSE`). |
| **`vpc.tf`** | `aws_vpc`, `aws_internet_gateway`, `aws_subnet` (public & private), `aws_route_table` (2) | Custom network (`10.0.0.0/16`) in `ap-south-1a`. Eliminates AWS Managed NAT Gateway by design to save \$32.40/mo. |
| **`security_groups.tf`** | `aws_security_group.k3s`, `aws_security_group.database` | Public ports 80/443 open for web traffic. Management ports (22 SSH, 6443 K8s API) use dynamic blocks: strictly **closed** when `admin_cidr_blocks = []` (zero-trust). Internal pod/node communication restricted via self-referencing rules. |
| **`compute.tf`** | `aws_instance.k3s_host`, `aws_eip.k3s_eip`, `data.aws_ami.ubuntu` | Canonical Ubuntu 22.04 LTS x86_64 AMI. User Data bootstraps k3s Kubernetes with non-root kubeconfig (`644`), waits for node `Ready`, and creates `resqgrid` namespace. Attached to 30GB encrypted gp3 root volume. |
| **`ecr.tf`** | `aws_ecr_repository` (backend & frontend), `aws_ecr_lifecycle_policy` | Private image registries with tag immutability, vulnerability scanning on push, and auto-purge policies (keeping last 15 release images, expiring untagged images after 3 days). |
| **`iam.tf`** | `aws_iam_role`, `aws_iam_policy` (ECR pull), `aws_iam_instance_profile` | Least-privilege IAM profile attached to EC2. Grants image pull permissions and AWS Systems Manager (`SSM`) remote terminal access without public SSH keys. |
| **`outputs.tf`** | VPC ID, Subnet IDs, Public EIP, Instance ID, ECR URLs, SSM command, cost estimate | Ready-to-use connection strings and verified pricing outputs. |

---

## 2. Target Instance Selection: `c7i-flex.large`

### Specifications & Hardware Architecture
- **Instance Type:** `c7i-flex.large` (Amazon EC2 Compute Optimized Flex)
- **Processor:** 4th Generation Intel Xeon Scalable processors (Sapphire Rapids) with 3.2 GHz base frequency
- **vCPUs:** 2
- **Memory:** 4,096 MiB (4.0 GiB)
- **Supported Architecture:** `x86_64` (fully compatible with `ubuntu-jammy-22.04-amd64-server-*`)
- **Network Performance:** Up to 12.5 Gbps
- **EBS-Optimized Throughput:** Up to 10 Gbps (EBS-optimized by default)
- **Regional Availability:** Verified available across all three AZs in Mumbai: `ap-south-1a`, `ap-south-1b`, `ap-south-1c`.

---

## 3. Workload Assessment & Memory Budget (4 GiB Capacity)

On a single-node host with **4,096 MiB RAM**, resource budgeting is critical to prevent out-of-memory (OOM) kernel kills or kubelet pod evictions.

### Base System & Control Plane Footprint
| Component | Estimated Memory Footprint |
|---|---|
| Ubuntu 22.04 LTS Kernel + systemd + daemons + SSM Agent | ~450 MiB |
| k3s server (control plane + containerd + kubelet + flannel CNI + traefik ingress) | ~550 MiB |
| **Total Base Overhead** | **~1,000 MiB (~1.0 GiB)** |
| **Available Headroom for Kubernetes Workloads** | **~3,096 MiB (~3.0 GiB)** |

### Pod Resource Limits vs Available Memory
| Workload Component | Replicas | CPU Request / Limit | Memory Request / Limit | Total Memory Limit |
|---|---|---|---|---|
| **backend-blue** (Active) | 2 | 100m / 500m | 128 MiB / 512 MiB | 1,024 MiB |
| **backend-green** (Candidate) | 2 | 100m / 500m | 128 MiB / 512 MiB | 1,024 MiB |
| **frontend** (React/Nginx) | 2 | 50m / 200m | 64 MiB / 256 MiB | 512 MiB |
| **postgres** (PostGIS 16) | 1 | 100m / 500m | 256 MiB / 512 MiB | 512 MiB |
| **prometheus** (TSDB Monitoring) | 1 | 100m / 500m | 128 MiB / 512 MiB | 512 MiB |
| **grafana** (Dashboards) | 1 | 100m / 500m | 128 MiB / 512 MiB | 512 MiB |
| **alertmanager** (Alerting) | 1 | 50m / 200m | 64 MiB / 256 MiB | 256 MiB |
| **metrics-server** (HPA Metrics) | 1 | 100m / 250m | 100 MiB / 200 MiB | 200 MiB |
| **Total Requests** | **11 Pods** | **850m CPU** | **1,216 MiB (~1.2 GiB)** | — |
| **Total Potential Limits** | **11 Pods** | **3,150m CPU** | — | **4,552 MiB (~4.45 GiB)** |

### Memory Pressure Analysis
1. **The Overcommit Risk:** Summing all container memory limits yields **4,552 MiB**, which exceeds the physical 4,096 MiB RAM even before subtracting the 1,000 MiB OS overhead.
2. **Blue-Green Deployment Peak:** During a candidate rollout, having 2 Blue pods and 2 Green pods simultaneously running Node.js + TypeORM can consume over 900 MiB of active heap.
3. **Prometheus TSDB Compaction:** When scraping 11 targets under load, Prometheus memory can spike to 350–500 MiB during chunk flushing.
4. **PostGIS Spatial Queries:** Spatial queries with spatial index caching (`shared_buffers` + `work_mem`) consume 200–350 MiB.

### Recommended Profile Architecture
To ensure stability during academic evaluation while demonstrating all key DevOps concepts:

#### A. Lean AWS Demonstration Profile (Stable on `c7i-flex.large`)
- **Active Backend:** 1 replica (Blue) in steady state (request 128 MiB, limit 384 MiB).
- **Candidate Green:** 0 replicas in steady state; scaled to 1 replica during the live blue-green traffic switch demonstration.
- **Frontend:** 1 replica (static Nginx serves React bundle with <25 MiB memory).
- **PostGIS:** 1 replica with persistent volume (request 256 MiB, limit 384 MiB).
- **Prometheus:** Lean TSDB retention (`--storage.tsdb.retention.time=1d`, limit 384 MiB).
- **Grafana & Alertmanager:** 1 replica each with tuned limits.
- **Swap Safety Net:** 2 GiB swapfile enabled on the encrypted gp3 EBS volume to absorb any transient memory spikes during load drills.
- **Steady-State Footprint:** ~1,850 MiB total used (leaves >2,200 MiB free RAM, >50% safety margin).

#### B. Full Local Docker Desktop Profile (Available for High-Load Demonstrations)
- Run on workstation with 8–16 GiB allocated to Docker Desktop Kubernetes.
- Runs full 11 pods: 2 Blue + 2 Green + 2 Frontend + metrics-server + full Prometheus/Grafana.
- Executes full k6 stress tests driving HPA to scale from 2 to 6 backend replicas.

---

## 4. Zero-Trust Access & Security Posture

### Perimeter Controls
- **Public Ingress:** Ports 80 (HTTP) and 443 (HTTPS) are routed directly to Traefik Ingress.
- **SSH (Port 22) & Kubernetes API (Port 6443):**
  - Controlled by dynamic Terraform ingress blocks.
  - Default: `admin_cidr_blocks = []` (no ports opened to the public internet).
  - Administration is handled via **AWS Systems Manager Session Manager (SSM)**:
    ```powershell
    aws ssm start-session --target <INSTANCE_ID> --region ap-south-1
    ```
  - Eliminates the need to open port 22 or distribute fragile SSH `.pem` private keys.

---

## 5. In-Cluster Database Configuration (AWS Manifests)

The local development cluster routes database queries to `host.docker.internal:5433`. For AWS, dedicated manifests are staged under `infra/k8s/`:
- `infra/k8s/postgres-pvc.yaml`: 10 GiB dynamic PersistentVolumeClaim using k3s `local-path` storage class backed by the gp3 root disk.
- `infra/k8s/postgres-deployment.yaml`: Official `postgis/postgis:16-3.4` container.
- `infra/k8s/postgres-service.aws.yaml`: Internal `ClusterIP` Service exposing port 5432 targeting `app: postgres`.
- `infra/k8s/secrets.aws.yaml`: Sets `DATABASE_URL` to:
  ```
  postgresql://resqgrid_user:resqgrid_password@postgres-service:5432/resqgrid
  ```
- **Local Isolation Guarantee:** The existing local database (`resqgrid_db` on port 5433 with 234 incidents) is completely isolated and never modified by cloud manifests.

---

## 6. Exact Pricing Breakdown (`ap-south-1` Mumbai)

Verified directly against the official **AWS Pricing API** (`us-east-1` PriceList endpoint for `ap-south-1`):

| Billable Resource | AWS Pricing Rate (Mumbai) | 8-Hour Demo Cost | 24-Hour Test Cost | Continuous Monthly Baseline (730 hrs) |
|---|---|---|---|---|
| **EC2 `c7i-flex.large`** | \$0.08479 / hour | \$0.68 USD (~₹57 INR) | \$2.04 USD (~₹170 INR) | \$61.90 / month (~₹5,175 INR) |
| **EBS 30 GB gp3** | \$0.08 / GB-month | \$0.03 USD | \$0.08 USD | \$2.40 / month (~₹200 INR) |
| **Public IPv4 (Elastic IP)** | \$0.005 / hour | \$0.04 USD | \$0.12 USD | \$3.65 / month (~₹305 INR) |
| **Amazon ECR Storage** | \$0.10 / GB-month (~5 GB) | \$0.01 USD | \$0.02 USD | \$0.50 / month (~₹42 INR) |
| **NAT Gateway** | *Omitted by Design* | \$0.00 (Saves \$32.40/mo) | \$0.00 | \$0.00 |
| **Managed EKS Fee** | *Omitted by Design* | \$0.00 (Saves \$73.00/mo) | \$0.00 | \$0.00 |
| **TOTAL** | — | **~\$0.76 USD (~₹64 INR)** | **~\$2.26 USD (~₹189 INR)** | **~\$68.45 / month (~₹5,720 INR)** |

---

## 7. Pre-Provisioning Verification Results

The configuration has been rigorously verified with zero cloud modifications:
1. **Terraform Format Check:**
   ```powershell
   terraform -chdir=infra/terraform fmt -check
   # Output: Exit code 0 (clean formatting)
   ```
2. **Terraform Validation:**
   ```powershell
   terraform -chdir=infra/terraform validate
   # Output: Success! The configuration is valid.
   ```
3. **Terraform Read-Only Plan:**
   ```powershell
   terraform -chdir=infra/terraform plan
   # Output: Plan: 21 to add, 0 to change, 0 to destroy.
   # Instance planned: c7i-flex.large
   # Outputs planned: estimated_monthly_cost_usd reflects $61.90 compute / $68.45 total
   ```
4. **Git & Secret Cleanliness Audit:**
   - `.gitignore` rigorously excludes: `terraform.tfvars`, `*.tfvars`, `*.tfplan`, `*.plan`, `*.pem`, `*.key`, `*.jar`, `.kube/`.
   - No credentials, secrets, or state files are tracked or staged.
5. **Local Workload Health:**
   - Container `resqgrid_db` healthy on port 5433 with 234 live incidents.
   - Local backend `/metrics` and `/api/v1/incidents` responding with HTTP 200.

---

## 8. Deployment Execution Checklist (On Explicit Approval)

When you are ready to provision the cloud infrastructure:

```powershell
# 1. Export temporary AWS SSO session credentials to PowerShell session:
(& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" configure export-credentials --format powershell) | Invoke-Expression

# 2. Provision the cloud foundation:
terraform -chdir=infra/terraform apply -auto-approve

# 3. Authenticate Docker to Amazon ECR:
$account = (aws sts get-caller-identity --query "Account" --output text)
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin "$account.dkr.ecr.ap-south-1.amazonaws.com"

# 4. Build and push container images:
docker build -t "$account.dkr.ecr.ap-south-1.amazonaws.com/resqgrid-backend:latest" -f infra/docker/backend.Dockerfile .
docker push "$account.dkr.ecr.ap-south-1.amazonaws.com/resqgrid-backend:latest"

docker build -t "$account.dkr.ecr.ap-south-1.amazonaws.com/resqgrid-frontend:latest" -f infra/docker/frontend.Dockerfile .
docker push "$account.dkr.ecr.ap-south-1.amazonaws.com/resqgrid-frontend:latest"

# 5. Connect to k3s via AWS SSM:
$instId = (terraform -chdir=infra/terraform output -raw k3s_instance_id)
aws ssm start-session --target $instId --region ap-south-1

# 6. Apply AWS Kubernetes manifests inside k3s:
kubectl apply -f infra/k8s/postgres-pvc.yaml
kubectl apply -f infra/k8s/secrets.aws.yaml
kubectl apply -f infra/k8s/postgres-service.aws.yaml
kubectl apply -f infra/k8s/postgres-deployment.yaml
kubectl apply -k infra/k8s/

# 7. Teardown immediately after evaluation:
terraform -chdir=infra/terraform destroy -auto-approve
```

---
*Documentation maintained under ResQGrid SRE & Academic Evaluation Standards.*
