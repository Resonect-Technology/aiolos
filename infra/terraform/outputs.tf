output "instance_public_ip" {
  description = "Public IP of the Adonis API EC2 instance"
  value       = aws_instance.adonis_api.public_ip
}

output "instance_id" {
  description = "ID of the Adonis API EC2 instance"
  value       = aws_instance.adonis_api.id
}

output "ecr_repository_url" {
  description = "URL of the ECR repository for Aiolos backend Docker images"
  value       = aws_ecr_repository.aiolos.repository_url
}

output "ecr_frontend_repository_url" {
  description = "URL of the ECR repository for Aiolos frontend Docker images"
  value       = aws_ecr_repository.aiolos_frontend.repository_url
}
