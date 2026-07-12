# Aiolos production infrastructure — hastr-staging-style single-box setup.
# One environment only (prod). Deployed into the shared resonect-prod account
# (590183887485) alongside Hastr prod, as separate resources.

terraform {
  required_version = ">= 1.0"

  backend "s3" {
    bucket                      = "resonect-terraform-state-211125605653"
    key                         = "projects/aiolos/terraform.tfstate"
    region                      = "eu-central-1"
    dynamodb_table              = "resonect-terraform-locks"
    encrypt                     = true
    profile                     = "resonect-master"
    skip_region_validation      = true
    skip_credentials_validation = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }
}

# AWS provider - hardcoded because it's needed before SSM can be accessed
provider "aws" {
  region  = "eu-central-1"
  profile = "resonect-prod"
}

# Cloudflare provider for the resonect.cz zone - token stored in SSM
provider "cloudflare" {
  api_token = aws_ssm_parameter.cloudflare_dns_api_token.value
}

locals {
  project_name = "aiolos"
  environment  = "prod"
  aws_region   = "eu-central-1"
  account_id   = "590183887485"
}
