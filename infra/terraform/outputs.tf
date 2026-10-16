# ==============================================================================
# Terraform Outputs
# Project: ResQGrid — Real-Time Disaster Alert & Response Platform
# ==============================================================================

output "vpc_id" {
  description = "The ID of the ResQGrid VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "The ID of the public subnet"
  value       = aws_subnet.public.id
}

output "private_subnet_id" {
  description = "The ID of the private subnet"
  value       = aws_subnet.private.id
}

output "k3s_public_ip" {
  description = "Static Elastic IP of the k3s cluster node"
  value       = aws_eip.k3s_eip.public_ip
}

output "k3s_instance_id" {
  description = "EC2 Instance ID of the k3s node"
  value       = aws_instance.k3s_host.id
}

output "ecr_backend_repository_url" {
  description = "Amazon ECR Repository URL for Backend container images"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  description = "Amazon ECR Repository URL for Frontend container images"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ssm_connect_command" {
  description = "AWS CLI command to connect to k3s instance securely without opening port 22"
  value       = "aws ssm start-session --target ${aws_instance.k3s_host.id} --region ${var.aws_region}"
}

output "kubeconfig_fetch_command" {
  description = "Command to extract k3s kubeconfig to local workstation"
  value       = "ssh -i <your-key.pem> ubuntu@${aws_eip.k3s_eip.public_ip} 'sudo cat /etc/rancher/k3s/k3s.yaml' | sed 's/127.0.0.1/${aws_eip.k3s_eip.public_ip}/g' > kubeconfig-resqgrid.yaml"
}

output "estimated_monthly_cost_usd" {
  description = "Estimated monthly baseline cost for ResQGrid infrastructure on AWS"
  value = {
    "EC2_t3_medium_on_demand" = "$30.37 / month (ap-south-1)",
    "EBS_gp3_30GB"            = "$2.40 / month",
    "Public_IPv4_Elastic_IP"  = "$3.65 / month ($0.005/hr)",
    "ECR_storage_15_images"   = "~$0.50 / month",
    "NAT_Gateway"             = "$0.00 (Avoided by design - saves $32.40/mo)",
    "Total_Estimated_Cost"    = "~$36.92 / month (~INR 3,080 / month)"
  }
}
