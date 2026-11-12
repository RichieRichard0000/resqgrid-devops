# ==============================================================================
# Terraform Variables
# Project: ResQGrid — Real-Time Disaster Alert & Response Platform
# ==============================================================================

variable "aws_region" {
  description = "AWS region for deployment (default: ap-south-1 Mumbai for SRMIST latency & cost)"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Target deployment environment (staging, production, dev)"
  type        = string
  default     = "staging"
}

variable "vpc_cidr" {
  description = "CIDR block for the ResQGrid VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet (hosting Ingress & k3s single-node/worker)"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR block for the private subnet (hosting isolated database & internal resources)"
  type        = string
  default     = "10.0.2.0/24"
}

variable "availability_zone" {
  description = "AWS Availability Zone for subnets"
  type        = string
  default     = "ap-south-1a"
}

variable "instance_type" {
  description = "EC2 instance type for k3s cluster (c7i-flex.large: 2 vCPU, 4 GiB RAM - 4th Gen Intel Xeon Scalable Sapphire Rapids compute optimized)"
  type        = string
  default     = "c7i-flex.large"
}

variable "key_name" {
  description = "EC2 Key Pair name for SSH public key authentication over AWS SSM ProxyCommand (e.g. 'resqgrid-key'). Cloud-init installs this key into ~ubuntu/.ssh/authorized_keys. If left empty, native SSM Session Manager (aws ssm start-session) provides passwordless shell access without SSH keys."
  type        = string
  default     = ""
}

variable "admin_cidr_blocks" {
  description = "Optional CIDR blocks permitted to access management ports (SSH 22, Kube API 6443). Defaults to empty list for zero-trust AWS SSM Session Manager access without open management ports."
  type        = list(string)
  default     = []
}

variable "backend_repo_name" {
  description = "ECR repository name for the ResQGrid backend"
  type        = string
  default     = "resqgrid-backend"
}

variable "frontend_repo_name" {
  description = "ECR repository name for the ResQGrid frontend"
  type        = string
  default     = "resqgrid-frontend"
}

variable "root_volume_size" {
  description = "EBS gp3 root volume size in GB (40 GB provides ample headroom for Docker images, k3s, dev tools, and 4GB swap)"
  type        = number
  default     = 40
}
