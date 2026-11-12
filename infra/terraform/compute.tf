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

# NOTE: Server configuration is managed purely by Ansible (ansible/playbooks/site.yml).
# Cloud-init user_data is intentionally removed to maintain strict separation of concerns:
# Terraform provisions bare AWS compute/networking; Ansible configures operating system and runtime.

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

  # Note: user_data removed. Server configuration is delegated to Ansible.

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
