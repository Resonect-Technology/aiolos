# GitHub Actions OIDC role for this repository.
#
# IMPORTANT: the OIDC *provider* for token.actions.githubusercontent.com is a
# per-account singleton and is owned by Hastr prod's Terraform in this account.
# We only look it up (data source) and create our own role.

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_role" "github_actions_oidc" {
  name = "${local.project_name}-${local.environment}-github-actions-oidc"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = data.aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:Resonect-Technology/aiolos:*"
        }
      }
    }]
  })

  tags = {
    Name    = "${local.project_name}-${local.environment}-github-actions-oidc-role"
    Project = local.project_name
  }
}

# Push images to ECR
resource "aws_iam_role_policy_attachment" "github_oidc_ecr" {
  role       = aws_iam_role.github_actions_oidc.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

# Read params, run deploy commands on the instance, upload configs to S3
resource "aws_iam_role_policy" "github_oidc_deploy" {
  name = "aiolos-deploy-policy"
  role = aws_iam_role.github_actions_oidc.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SSMReadParameters"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${local.aws_region}:${local.account_id}:parameter/aiolos/*"
      },
      {
        Sid    = "SSMSendCommand"
        Effect = "Allow"
        Action = [
          "ssm:SendCommand"
        ]
        Resource = [
          "arn:aws:ssm:${local.aws_region}::document/AWS-RunShellScript",
          aws_instance.aiolos_prod.arn
        ]
      },
      {
        # GetCommandInvocation does not support resource-level restrictions
        Sid    = "SSMGetCommandInvocation"
        Effect = "Allow"
        Action = [
          "ssm:GetCommandInvocation"
        ]
        Resource = "*"
      },
      {
        Sid    = "S3DeployConfig"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.deploy_config.arn,
          "${aws_s3_bucket.deploy_config.arn}/*"
        ]
      }
    ]
  })
}
