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
  description = "EC2 instance type for k3s cluster (t3.medium: 2 vCPU, 4GB RAM - cost-efficient sweet spot)"
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "Optional EC2 Key Pair name for SSH access (AWS SSM Session Manager recommended instead)"
  type        = string
  default     = ""
}

variable "admin_cidr_blocks" {
  description = "CIDR blocks permitted to access management ports (SSH 22, Kube API 6443)"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Recommendation: Restrict to student/institution IP in production
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
  description = "EBS gp3 root volume size in GB"
  type        = number
  default     = 30
}
