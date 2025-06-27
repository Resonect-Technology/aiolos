#!/bin/bash
set -e
# Install latest Docker from official repo
apt-get update
apt-get install -y ca-certificates curl gnupg lsb-release
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \ 
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \ 
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
# (Optional) Add ubuntu user to docker group
usermod -aG docker ubuntu || true

# Manual steps recommended for pulling images and running containers.
# SSH into the instance and use AWS CLI to login to ECR, pull images, and run containers as needed.
# Example commands (to run after SSH):
# aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 590183887485.dkr.ecr.eu-central-1.amazonaws.com/aiolos-backend
# docker pull 590183887485.dkr.ecr.eu-central-1.amazonaws.com/aiolos-backend:latest
# docker run -d --restart unless-stopped -p 8080:8080 --env-file /etc/secrets/.env 590183887485.dkr.ecr.eu-central-1.amazonaws.com/aiolos-backend:latest
# aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 590183887485.dkr.ecr.eu-central-1.amazonaws.com/aiolos-frontend
# docker pull 590183887485.dkr.ecr.eu-central-1.amazonaws.com/aiolos-frontend:latest
# (run or extract static files as needed)
