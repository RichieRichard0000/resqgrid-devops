# ==============================================================================
# IAM Least-Privilege Roles & Policies
# Project: ResQGrid — Real-Time Disaster Alert & Response Platform
# Principle: Strict least privilege — grants ONLY ECR pull & SSM remote access
# ==============================================================================

# Trust relationship policy document for EC2 instances
data "aws_iam_policy_document" "ec2_trust_policy" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

# IAM Role assumed by the k3s EC2 instance
resource "aws_iam_role" "k3s_node_role" {
  name               = "resqgrid-k3s-node-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.ec2_trust_policy.json

  tags = {
    Name = "resqgrid-k3s-node-role-${var.environment}"
  }
}

# Least-privilege policy document for building, pushing, and pulling Docker images from Amazon ECR
data "aws_iam_policy_document" "ecr_policy" {
  statement {
    sid    = "ECRAuthToken"
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:DescribeRepositories"
    ]
    resources = ["*"]
  }

  statement {
    sid    = "ECRRepositoryAccess"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages"
    ]
    resources = [
      aws_ecr_repository.backend.arn,
      aws_ecr_repository.frontend.arn
    ]
  }
}

# IAM Policy for ECR image push/pull operations
resource "aws_iam_policy" "ecr_access" {
  name        = "resqgrid-ecr-access-policy-${var.environment}"
  description = "Allows k3s EC2 dev node to pull and push images to ResQGrid ECR repositories"
  policy      = data.aws_iam_policy_document.ecr_policy.json
}

# Attach ECR Policy to the k3s Node Role
resource "aws_iam_role_policy_attachment" "k3s_ecr_attach" {
  role       = aws_iam_role.k3s_node_role.name
  policy_arn = aws_iam_policy.ecr_access.arn
}

# Attach AWS SSM Managed Instance Core (allows zero-trust browser/CLI SSH without open port 22)
resource "aws_iam_role_policy_attachment" "k3s_ssm_attach" {
  role       = aws_iam_role.k3s_node_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# IAM Instance Profile to attach the role to the EC2 instance
resource "aws_iam_instance_profile" "k3s_profile" {
  name = "resqgrid-k3s-instance-profile-${var.environment}"
  role = aws_iam_role.k3s_node_role.name
}
