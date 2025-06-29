# Aiolos Project Terraform

This directory contains Terraform code for deploying all Aiolos-specific AWS resources within the main Resonect infrastructure VPC.

## What this module does
- Uses the existing Resonect main VPC (10.1.0.0/16) and public subnet infrastructure
- Provisions a security group for HTTP, HTTPS, and SSH (SSH access limited to within the VPC)
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
6. Access your EC2 instance via the bastion host:
   ```bash
   # First, connect to the bastion host
   ssh -i /path/to/your-key.pem ubuntu@BASTION_PUBLIC_IP
   
   # Then, from the bastion, connect to your Aiolos instance
   ssh -i /path/to/your-key.pem ubuntu@AIOLOS_PRIVATE_IP
   
   # Alternatively, if using Tailscale on the bastion host:
   # Access directly via Tailscale network
   ```

7. On the EC2 instance, use Docker Compose for deployment:
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
- This module leverages the existing Resonect infrastructure VPC (10.1.0.0/16) defined in the Resonect Infra repo.
- The EC2 instance is placed in the same VPC as the bastion host for simplified access and management.
- SSH access is restricted to connections from within the VPC (use the bastion host as a jump server).
- For security, direct SSH from the internet is disabled - always access through the bastion host.
- All resources are tagged for easy identification.
- For production, ensure your SSH key exists in the AWS region.
- AWS SSO with the `resonect-prod` profile is recommended for authentication and access control.
- **The `user_data.sh` script is run automatically on every new EC2 instance. It installs Docker and AWS CLI v2 using the official guides.**

---

For questions or changes, see the Terraform files in this directory.
