# IAM role for the EC2 instance: pull from ECR, talk to SSM (agent + params),
# read deploy configs from S3. No SSH key pairs anywhere.

resource "aws_iam_role" "aiolos_ec2" {
  name = "${local.project_name}-${local.environment}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = {
    Name    = "${local.project_name}-${local.environment}-ec2-role"
    Project = local.project_name
  }
}

resource "aws_iam_instance_profile" "aiolos_ec2" {
  name = "${local.project_name}-${local.environment}-ec2-profile"
  role = aws_iam_role.aiolos_ec2.name
}

# Pull images from ECR
resource "aws_iam_role_policy_attachment" "aiolos_ecr_read" {
  role       = aws_iam_role.aiolos_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# SSM agent (Session Manager shell access + Run Command deploys)
resource "aws_iam_role_policy_attachment" "aiolos_ssm_managed" {
  role       = aws_iam_role.aiolos_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Read /aiolos/* parameters (the instance renders .env files from SSM at deploy)
resource "aws_iam_role_policy" "aiolos_ssm_read" {
  name = "ssm-read-aiolos-params"
  role = aws_iam_role.aiolos_ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ]
      Resource = "arn:aws:ssm:${local.aws_region}:${local.account_id}:parameter/aiolos/*"
    }]
  })
}

# Read deploy configs (compose/traefik files) uploaded by CI
resource "aws_iam_role_policy" "aiolos_deploy_config_read" {
  name = "deploy-config-s3-read"
  role = aws_iam_role.aiolos_ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:ListBucket"
      ]
      Resource = [
        aws_s3_bucket.deploy_config.arn,
        "${aws_s3_bucket.deploy_config.arn}/*"
      ]
    }]
  })
}
