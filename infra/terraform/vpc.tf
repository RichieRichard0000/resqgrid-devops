# ==============================================================================
# AWS VPC & Networking Configuration
# Project: ResQGrid — Real-Time Disaster Alert & Response Platform
#
# Architectural Note on Budget Optimization:
# AWS Managed NAT Gateways cost ~$32.40/month minimum plus $0.045/GB data processing.
# For a CSE Capstone evaluation budget, ResQGrid deploys k3s into the public subnet
# protected by strict Security Groups and AWS SSM. A dedicated private subnet is
# provisioned for isolated data persistence without incurring NAT Gateway charges.
# ==============================================================================

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "resqgrid-vpc-${var.environment}"
  }
}

# Internet Gateway for public Internet egress/ingress
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "resqgrid-igw-${var.environment}"
  }
}

# Public Subnet: Hosts k3s EC2 node, Ingress controller, and ALB if needed
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = true

  tags = {
    Name                     = "resqgrid-public-subnet-${var.environment}"
    "kubernetes.io/role/elb" = "1"
  }
}

# Private Subnet: For isolated database persistence or internal services
resource "aws_subnet" "private" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_subnet_cidr
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = false

  tags = {
    Name                              = "resqgrid-private-subnet-${var.environment}"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# Public Route Table: Routes 0.0.0.0/0 to the Internet Gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "resqgrid-public-rt-${var.environment}"
  }
}

# Associate Public Subnet with Public Route Table
resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Private Route Table: Isolated internal traffic only (No expensive NAT Gateway)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "resqgrid-private-rt-${var.environment}"
  }
}

# Associate Private Subnet with Private Route Table
resource "aws_route_table_association" "private_assoc" {
  subnet_id      = aws_subnet.private.id
  route_table_id = aws_route_table.private.id
}
