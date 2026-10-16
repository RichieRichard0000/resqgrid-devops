# ==============================================================================
# Security Groups Configuration
# Project: ResQGrid — Real-Time Disaster Alert & Response Platform
# Principle: Least Privilege & Strict Perimeter Isolation
# ==============================================================================

# Security Group for k3s Kubernetes Host & Ingress
resource "aws_security_group" "k3s" {
  name        = "resqgrid-k3s-sg-${var.environment}"
  description = "Security group for ResQGrid k3s cluster node and ingress traffic"
  vpc_id      = aws_vpc.main.id

  # Ingress: HTTP (Public access for web traffic)
  ingress {
    description = "HTTP Inbound"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Ingress: HTTPS (Public access for secure web & API traffic)
  ingress {
    description = "HTTPS Inbound"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Ingress: Kubernetes API (Restricted to Administrator IP range)
  ingress {
    description = "Kubernetes API endpoint (Restricted)"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr_blocks
  }

  # Ingress: SSH (Restricted to Administrator IP range)
  ingress {
    description = "SSH Admin Access (Restricted)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr_blocks
  }

  # Ingress: Intra-cluster pod/node communication (Self-referencing)
  ingress {
    description = "Intra-cluster communication"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  # Egress: Allow outbound internet access for image pulls, updates, and feeds
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "resqgrid-k3s-sg-${var.environment}"
  }
}

# Security Group for Database (PostgreSQL / PostGIS)
# STRICT RULE: No public ingress (0.0.0.0/0) allowed under any circumstance!
resource "aws_security_group" "database" {
  name        = "resqgrid-db-sg-${var.environment}"
  description = "Security group for ResQGrid isolated database (accessible ONLY from k3s pods)"
  vpc_id      = aws_vpc.main.id

  # Ingress: PostgreSQL port 5432 strictly restricted to the k3s security group
  ingress {
    description     = "PostgreSQL from k3s cluster only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.k3s.id]
  }

  # Egress: Restricted to VPC CIDR for updates/internal sync
  egress {
    description = "Internal egress within VPC"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = {
    Name = "resqgrid-db-sg-${var.environment}"
  }
}
