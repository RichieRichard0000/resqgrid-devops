# ==============================================================================
# EC2 Compute & k3s Host Configuration
# Project: ResQGrid — Real-Time Disaster Alert & Response Platform
# Principle: High resource density on t3.medium running lightweight k3s Kubernetes
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

# User Data script to bootstrap k3s Kubernetes cluster
locals {
  k3s_user_data = <<-EOF
    #!/bin/bash
    set -euo pipefail

    echo "=== Updating System Packages ==="
    apt-get update -y
    apt-get upgrade -y
    apt-get install -y curl apt-transport-https ca-certificates gnupg lsb-release unzip htop

    echo "=== Installing AWS CLI v2 ==="
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    ./aws/install
    rm -rf aws awscliv2.zip

    echo "=== Installing k3s Kubernetes Cluster ==="
    # k3s comes with built-in Traefik Ingress controller and Metrics-Server
    # K3S_KUBECONFIG_MODE="644" enables non-root kubectl access
    curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644" sh -

    echo "=== Waiting for k3s node to be Ready ==="
    until /usr/local/bin/kubectl get nodes | grep -w "Ready"; do
      sleep 3
    done

    echo "=== Creating ResQGrid Namespace ==="
    /usr/local/bin/kubectl create namespace resqgrid --dry-run=client -o yaml | /usr/local/bin/kubectl apply -f -

    echo "=== k3s Bootstrap Completed Successfully ==="
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
