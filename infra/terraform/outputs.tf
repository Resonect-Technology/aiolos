output "instance_public_ip" {
  description = "The public IP address of the aiolos_api EC2 instance"
  value       = aws_instance.aiolos_api.public_ip
}

output "instance_id" {
  description = "The instance ID of the aiolos_api EC2 instance"
  value       = aws_instance.aiolos_api.id
}

output "ecr_repository_url" {
  description = "URL of the ECR repository for Aiolos backend Docker images"
  value       = aws_ecr_repository.aiolos.repository_url
}

output "ecr_frontend_repository_url" {
  description = "URL of the ECR repository for Aiolos frontend Docker images"
  value       = aws_ecr_repository.aiolos_frontend.repository_url
}
