# S3 bucket for deploy configuration files: docker-compose.prod.yml,
# traefik.yml and the SSM run-command scripts uploaded by CI.

resource "aws_s3_bucket" "deploy_config" {
  bucket = "${local.project_name}-${local.environment}-deploy-config"

  tags = {
    Name    = "${local.project_name}-${local.environment}-deploy-config"
    Project = local.project_name
    Purpose = "Deploy configuration files for CI/CD"
  }
}

resource "aws_s3_bucket_versioning" "deploy_config" {
  bucket = aws_s3_bucket.deploy_config.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "deploy_config" {
  bucket = aws_s3_bucket.deploy_config.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "deploy_config" {
  bucket = aws_s3_bucket.deploy_config.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Expire old config/script versions after 30 days
resource "aws_s3_bucket_lifecycle_configuration" "deploy_config" {
  bucket = aws_s3_bucket.deploy_config.id

  rule {
    id     = "expire-noncurrent"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}
