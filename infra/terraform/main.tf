# ==============================================================================
# Terraform Main Provider Configuration
# Project: ResQGrid — Real-Time Disaster Alert & Response Platform
# Academic Context: SRM Institute of Science and Technology (CSE Final Year)
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }

  # In production, use an S3 remote backend with DynamoDB state locking:
  # backend "s3" {
  #   bucket         = "resqgrid-terraform-state-srm"
  #   key            = "phase-2/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "resqgrid-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ResQGrid"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Institution = "SRMIST-CSE"
      Phase       = "Phase-2"
    }
  }
}
