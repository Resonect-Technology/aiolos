output "instance_id" {
  description = "Instance ID of the aiolos prod box"
  value       = aws_instance.aiolos_prod.id
}

output "instance_public_ip" {
  description = "Elastic IP of the aiolos prod box (Cloudflare origin)"
  value       = aws_eip.aiolos_prod.public_ip
}

output "github_actions_oidc_role_arn" {
  description = "ARN of the IAM role assumed by GitHub Actions"
  value       = aws_iam_role.github_actions_oidc.arn
}

output "ecr_backend_repository_url" {
  description = "ECR repository for the backend image"
  value       = aws_ecr_repository.aiolos.repository_url
}

output "ecr_frontend_repository_url" {
  description = "ECR repository for the frontend image"
  value       = aws_ecr_repository.aiolos_frontend.repository_url
}

output "deploy_config_bucket" {
  description = "S3 bucket holding deploy configs"
  value       = aws_s3_bucket.deploy_config.id
}
