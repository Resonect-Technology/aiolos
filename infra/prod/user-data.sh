#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Docker using apt repository
apt-get install -y ca-certificates curl unzip
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker ubuntu
systemctl enable docker

# Install AWS CLI v2 (needed for ECR login + SSM parameter reads during deploys)
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
  AWS_CLI_ARCH="x86_64"
else
  AWS_CLI_ARCH="aarch64"
fi
curl -sSL "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_CLI_ARCH}.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install
rm -rf /tmp/aws /tmp/awscliv2.zip

# Install AWS SSM Agent for remote command execution (replaces SSH for CI/CD)
snap install amazon-ssm-agent --classic
systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent
systemctl start snap.amazon-ssm-agent.amazon-ssm-agent

# Create 1GB swap file as memory safety net (t4g.micro has 1GB RAM)
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# App directory (compose files, acme storage, SQLite data)
mkdir -p /opt/aiolos/data /opt/aiolos/acme
chown -R ubuntu:ubuntu /opt/aiolos

# Log completion
echo "Setup completed at $(date)" >> /var/log/user-data.log
