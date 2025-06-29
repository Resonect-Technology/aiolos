# Aiolos Project Terraform

This directory contains Terraform code for deploying all Aiolos-specific AWS resources (VPC, subnet, EC2, security groups, etc.).

## What this module does
- Creates a dedicated VPC, public subnet, internet gateway, and route table for Aiolos
- Provisions a security group for HTTP, HTTPS, and SSH
- Launches a t4g.nano EC2 instance (default) with Docker and your AdonisJS app
- Tags all resources with `Project = "aiolos"`
- **Automatically installs Docker (official guide) and AWS CLI v2 (official guide) on every new EC2 instance via `user_data.sh`**
  - The script runs only on first boot of a new instance (not on reboot)
  - Docker and AWS CLI v2 are installed for both x86_64 and ARM (aarch64) architectures

## Usage
1. Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in your real values (including any secrets like key_name).
2. (Optional) Set a different instance type if desired.
3. Authenticate with AWS SSO using the `resonect-prod` profile:
   ```bash
   aws sso login --profile resonect-prod
   ```
4. Run Terraform with the correct profile:
   ```bash
   AWS_PROFILE=resonect-prod terraform init
   AWS_PROFILE=resonect-prod terraform apply
   ```
5. Build and push your Docker images to the ECR repositories (see Terraform output for the URLs):
   ```bash
   # Backend
   aws ecr get-login-password --region eu-central-1 --profile resonect-prod | \
     docker login --username AWS --password-stdin 590183887485.dkr.ecr.eu-central-1.amazonaws.com/aiolos-backend
   docker build -t 590183887485.dkr.ecr.eu-central-1.amazonaws.com/aiolos-backend:latest ../apps/adonis-api
   docker push 590183887485.dkr.ecr.eu-central-1.amazonaws.com/aiolos-backend:latest

   # Frontend
   aws ecr get-login-password --region eu-central-1 --profile resonect-prod | \
     docker login --username AWS --password-stdin 590183887485.dkr.ecr.eu-central-1.amazonaws.com/aiolos-frontend
   docker build -t 590183887485.dkr.ecr.eu-central-1.amazonaws.com/aiolos-frontend:latest ../apps/react-frontend
   docker push 590183887485.dkr.ecr.eu-central-1.amazonaws.com/aiolos-frontend:latest
   ```
6. SSH into your EC2 instance and use Docker Compose for deployment:
   ```bash
   # On the EC2 instance
   cd /path/to/infra
   aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 590183887485.dkr.ecr.eu-central-1.amazonaws.com
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

> **Note:** Caddy's `/data` directory is persisted using a named volume to avoid Let's Encrypt rate limiting.
> `terraform.tfvars` is in `.gitignore` and should never be committed. Only commit `terraform.tfvars.example`.

## Outputs
- Public IP and instance ID of the deployed EC2 instance

## Notes
- No need to provide VPC or subnet IDs; this module creates and manages its own network resources.
- All resources are tagged for easy identification.
- For production, ensure your SSH key exists in the AWS region.
- AWS SSO with the `resonect-prod` profile is recommended for authentication and access control.
- **The `user_data.sh` script is run automatically on every new EC2 instance. It installs Docker and AWS CLI v2 using the official guides.**

---

For questions or changes, see the Terraform files in this directory.
