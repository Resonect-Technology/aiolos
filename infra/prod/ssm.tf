# SSM Parameter Store - single source of truth for configuration and secrets.
#
# Hastr pattern: every parameter has a placeholder default and
# `ignore_changes = [value]`, so Terraform owns the resource but the VALUE is
# managed directly in the AWS console/CLI:
#   aws ssm put-parameter --overwrite --name /aiolos/prod/backend/app-key --value '...'
#
# The deploy workflow renders /opt/aiolos/.env.prod and .env.traefik from
# these on the instance — secrets never transit the GitHub runner.

# =============================================================================
# Infrastructure (Terraform provider inputs)
# =============================================================================

resource "aws_ssm_parameter" "cloudflare_resonect_api_token" {
  name        = "/aiolos/infrastructure/cloudflare-resonect-api-token"
  description = "Cloudflare API token with DNS edit on resonect.cz (Terraform + Traefik ACME)"
  type        = "SecureString"
  value       = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Project = local.project_name
  }
}

resource "aws_ssm_parameter" "cloudflare_resonect_zone_id" {
  name        = "/aiolos/config/cloudflare-resonect-zone-id"
  description = "Cloudflare zone ID for resonect.cz"
  type        = "String"
  value       = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Project = local.project_name
  }
}

# =============================================================================
# Backend secrets
# =============================================================================

resource "aws_ssm_parameter" "backend_app_key" {
  name        = "/aiolos/prod/backend/app-key"
  description = "AdonisJS APP_KEY (copy from the old box's .env at cutover)"
  type        = "SecureString"
  value       = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Project = local.project_name
  }
}

resource "aws_ssm_parameter" "backend_admin_api_key" {
  name        = "/aiolos/prod/backend/admin-api-key"
  description = "X-API-Key value for the config write endpoints"
  type        = "SecureString"
  value       = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Project = local.project_name
  }
}

# =============================================================================
# Backend config (non-secret)
# =============================================================================

resource "aws_ssm_parameter" "config_tz" {
  name  = "/aiolos/prod/config/tz"
  type  = "String"
  value = "UTC"

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Project = local.project_name
  }
}

resource "aws_ssm_parameter" "config_port" {
  name  = "/aiolos/prod/config/port"
  type  = "String"
  value = "8080"

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Project = local.project_name
  }
}

resource "aws_ssm_parameter" "config_host" {
  name  = "/aiolos/prod/config/host"
  type  = "String"
  value = "0.0.0.0"

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Project = local.project_name
  }
}

resource "aws_ssm_parameter" "config_log_level" {
  name  = "/aiolos/prod/config/log-level"
  type  = "String"
  value = "info"

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Project = local.project_name
  }
}

resource "aws_ssm_parameter" "config_node_env" {
  name  = "/aiolos/prod/config/node-env"
  type  = "String"
  value = "production"

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Project = local.project_name
  }
}

resource "aws_ssm_parameter" "config_database_url" {
  name        = "/aiolos/prod/config/database-url"
  description = "SQLite path inside the backend container (bind mount ./data:/data)"
  type        = "String"
  value       = "file:/data/db.sqlite3"

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Project = local.project_name
  }
}

# =============================================================================
# Traefik
# =============================================================================

resource "aws_ssm_parameter" "traefik_cf_dns_api_token" {
  name        = "/aiolos/prod/traefik/cf-dns-api-token"
  description = "Cloudflare DNS-edit token for Traefik ACME DNS-01 (may equal the infrastructure token)"
  type        = "SecureString"
  value       = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Project = local.project_name
  }
}

# =============================================================================
# Terraform-owned parameters (no ignore_changes — TF is the source of truth)
# =============================================================================

resource "aws_ssm_parameter" "ec2_instance_id" {
  name        = "/aiolos/prod/infrastructure/ec2-instance-id"
  description = "Instance ID targeted by the deploy workflow's SSM Run Command"
  type        = "String"
  value       = aws_instance.aiolos_prod.id

  tags = {
    Project = local.project_name
  }
}
