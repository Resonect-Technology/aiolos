# Single ARM EC2 box running Docker Compose (Traefik + API + frontend).

variable "instance_type" {
  description = "EC2 instance type for the prod box"
  type        = string
  default     = "t4g.micro"
}

# Get default VPC (hastr-staging style; replaces the old shared-bastion-VPC lookup)
data "aws_vpc" "default" {
  default = true
}

resource "aws_instance" "aiolos_prod" {
  # Ubuntu 24.04 LTS arm64 (Noble) in eu-central-1 — same AMI hastr staging uses.
  # Verify with: aws ec2 describe-images --image-ids ami-0cf445cd7f85869e0
  ami           = "ami-0cf445cd7f85869e0"
  instance_type = var.instance_type

  # No key_name: access is SSM Session Manager only, no SSH anywhere
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.aiolos_ec2.name
  vpc_security_group_ids      = [aws_security_group.aiolos_prod.id]

  user_data_base64 = base64encode(file("${path.module}/user-data.sh"))

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name    = "${local.project_name}-${local.environment}"
    Project = local.project_name
  }
}

resource "aws_security_group" "aiolos_prod" {
  name_prefix = "${local.project_name}-${local.environment}-"
  description = "Aiolos prod: HTTP/HTTPS only, no SSH (SSM access)"
  vpc_id      = data.aws_vpc.default.id

  # HTTP — ESP32 stations POST plain HTTP through the Cloudflare proxy
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS — browsers via Cloudflare
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${local.project_name}-${local.environment}-sg"
    Project = local.project_name
  }
}

resource "aws_eip" "aiolos_prod" {
  domain = "vpc"

  tags = {
    Name    = "${local.project_name}-${local.environment}-eip"
    Project = local.project_name
  }
}

resource "aws_eip_association" "aiolos_prod" {
  instance_id   = aws_instance.aiolos_prod.id
  allocation_id = aws_eip.aiolos_prod.id
}
