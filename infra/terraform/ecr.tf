# ==============================================================================
# Amazon ECR Repositories & Lifecycle Policies
# Project: ResQGrid — Real-Time Disaster Alert & Response Platform
# Principle: Tag Immutability for strict provenance & Lifecycle rules for cost control
# ==============================================================================

# Backend ECR Repository
resource "aws_ecr_repository" "backend" {
  name                 = var.backend_repo_name
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name      = "resqgrid-backend-ecr"
    Component = "Backend"
  }
}

# Frontend ECR Repository
resource "aws_ecr_repository" "frontend" {
  name                 = var.frontend_repo_name
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name      = "resqgrid-frontend-ecr"
    Component = "Frontend"
  }
}

# Lifecycle policy: retain the latest 15 tagged images and purge untagged images after 3 days
# Saves AWS storage costs ($0.10/GB/month) from unpruned CI/CD pipeline builds
locals {
  ecr_lifecycle_policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than 3 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 3
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep only last 15 tagged release images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["sha-", "v", "rel-"]
          countType     = "imageCountMoreThan"
          countNumber   = 15
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "backend_lifecycle" {
  repository = aws_ecr_repository.backend.name
  policy     = local.ecr_lifecycle_policy
}

resource "aws_ecr_lifecycle_policy" "frontend_lifecycle" {
  repository = aws_ecr_repository.frontend.name
  policy     = local.ecr_lifecycle_policy
}
