# ==============================================================================
# EC2 Compute & k3s Host Configuration
# Project: ResQGrid — Real-Time Disaster Alert & Response Platform
# Principle: High compute efficiency on c7i-flex.large running lightweight k3s Kubernetes
# ==============================================================================

# Dynamic AMI lookup for Ubuntu 22.04 LTS (Jammy) x86_64
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical official AWS account ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# User Data script to bootstrap AWS-first development workstation and k3s cluster
locals {
  k3s_user_data = <<-EOF
    #!/bin/bash
    set -euo pipefail

    # Capture all stdout and stderr into system log and console
    exec > >(tee -a /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

    echo "=== [1/9] Enforcing Swap Disabled for Native Kubernetes / Kubelet Stability ==="
    # Kubernetes officially requires swap disabled for predictable cgroup v2 QoS & eviction.
    # Disabling swap prevents kubelet startup crashes on reboot and avoids gp3 disk I/O thrashing.
    swapoff -a || true
    sed -i '/swap/d' /etc/fstab
    rm -f /swapfile

    echo "=== [2/9] Installing Core Dependencies and Security Packages ==="
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get upgrade -y
    apt-get install -y \
      curl wget git apt-transport-https ca-certificates gnupg \
      lsb-release unzip htop jq build-essential openssh-server
    systemctl enable --now ssh

    echo "=== [3/9] Ensuring AWS Systems Manager (SSM) Agent is Running ==="
    # Ubuntu 22.04 LTS AMIs include snap-based amazon-ssm-agent
    systemctl enable --now snap.amazon-ssm-agent.amazon-ssm-agent.service 2>/dev/null || \
      systemctl enable --now amazon-ssm-agent 2>/dev/null || true

    echo "=== [4/9] Installing AWS CLI v2 ==="
    if ! command -v aws &> /dev/null; then
      curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
      unzip -q -o awscliv2.zip
      ./aws/install --update
      rm -rf aws awscliv2.zip
    fi

    echo "=== [5/9] Installing Docker CE from Official Docker Ubuntu Repository ==="
    if ! command -v docker &> /dev/null; then
      install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
      chmod a+r /etc/apt/keyrings/docker.gpg
      echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
      apt-get update -y
      apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      systemctl enable docker
      systemctl start docker
      usermod -aG docker ubuntu
    fi

    echo "=== [6/9] Installing Node.js 20 LTS from Official NodeSource Repository ==="
    if ! command -v node &> /dev/null; then
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
      apt-get install -y nodejs
    fi

    echo "=== [7/9] Installing Terraform CLI from Official HashiCorp Repository ==="
    if ! command -v terraform &> /dev/null; then
      curl -fsSL https://apt.releases.hashicorp.com/gpg | gpg --dearmor --yes -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
      echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" > /etc/apt/sources.list.d/hashicorp.list
      apt-get update -y
      apt-get install -y terraform
    fi

    echo "=== [8/9] Installing and Enabling k3s Kubernetes Cluster ==="
    # k3s with built-in Traefik Ingress and Metrics-Server
    # K3S_KUBECONFIG_MODE="644" enables non-root kubectl access
    if ! command -v k3s &> /dev/null; then
      curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644" sh -
      systemctl enable k3s
    fi

    echo "=== Waiting for k3s node to be Ready ==="
    until /usr/local/bin/kubectl get nodes | grep -w "Ready"; do
      sleep 3
    done

    # Setup non-root kubeconfig for ubuntu user
    mkdir -p /home/ubuntu/.kube
    cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
    chown -R ubuntu:ubuntu /home/ubuntu/.kube
    chmod 600 /home/ubuntu/.kube/config
    echo 'export KUBECONFIG=/home/ubuntu/.kube/config' >> /home/ubuntu/.bashrc

    # Create ResQGrid namespace
    /usr/local/bin/kubectl create namespace resqgrid --dry-run=client -o yaml | /usr/local/bin/kubectl apply -f -

    echo "=== [9/9] Preparing Workspace and Environment Inspector ==="
    mkdir -p /home/ubuntu/workspace/resqgrid
    chown -R ubuntu:ubuntu /home/ubuntu/workspace

    cat <<'STATUS_EOF' > /home/ubuntu/env-status.sh
    #!/bin/bash
    TOKEN=$(curl -s -f -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60" 2>/dev/null || true)
    PUBLIC_IP=$(curl -s -f -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'N/A')
    INSTANCE_TYPE=$(curl -s -f -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-type 2>/dev/null || echo 'N/A')
    echo "=================================================="
    echo "  ResQGrid AWS Development Environment Status"
    echo "=================================================="
    echo "Host: $(hostname) ($PUBLIC_IP)"
    echo "Instance: $INSTANCE_TYPE"
    echo "Memory:"
    free -h
    echo "Disk:"
    df -h /
    echo "Tooling:"
    echo "  - Git:       $(git --version 2>/dev/null || echo 'Not installed')"
    echo "  - Node.js:   $(node --version 2>/dev/null || echo 'Not installed')"
    echo "  - npm:       $(npm --version 2>/dev/null || echo 'Not installed')"
    echo "  - Docker:    $(docker --version 2>/dev/null || echo 'Not installed')"
    echo "  - AWS CLI:   $(aws --version 2>/dev/null || echo 'Not installed')"
    echo "  - Terraform: $(terraform --version 2>/dev/null | head -n1 || echo 'Not installed')"
    echo "  - kubectl:   $(kubectl version --client 2>/dev/null | head -n1 || echo 'Not installed')"
    echo "Kubernetes Nodes:"
    kubectl get nodes -o wide 2>/dev/null || echo "k3s not ready yet"
    echo "ResQGrid Pods:"
    kubectl get pods -n resqgrid 2>/dev/null || echo "None running"
    echo "=================================================="
STATUS_EOF
    chmod +x /home/ubuntu/env-status.sh
    chown ubuntu:ubuntu /home/ubuntu/env-status.sh

    echo "=== ResQGrid AWS Dev Workstation Bootstrap Completed Successfully ==="
  EOF
}

# EC2 Instance hosting the k3s cluster
resource "aws_instance" "k3s_host" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.k3s.id]
  iam_instance_profile   = aws_iam_instance_profile.k3s_profile.name
  key_name               = var.key_name != "" ? var.key_name : null

  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = "gp3"
    iops                  = 3000
    throughput            = 125
    encrypted             = true
    delete_on_termination = true

    tags = {
      Name = "resqgrid-k3s-root-disk"
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required" # Enforce IMDSv2 (blocks unauthenticated IMDSv1 requests)
    http_put_response_hop_limit = 1          # Restrict IMDSv2 to host processes only; prevents K8s pods and Docker containers from assuming EC2 role
    instance_metadata_tags      = "enabled"
  }

  user_data = local.k3s_user_data

  tags = {
    Name        = "resqgrid-k3s-node-${var.environment}"
    Role        = "KubernetesControlPlaneAndWorker"
    Environment = var.environment
  }
}

# Allocate Elastic IP for static public access
resource "aws_eip" "k3s_eip" {
  instance = aws_instance.k3s_host.id
  domain   = "vpc"

  tags = {
    Name = "resqgrid-k3s-eip-${var.environment}"
  }
}
