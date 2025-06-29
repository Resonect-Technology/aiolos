terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
  required_version = ">= 1.3.0"
}

provider "aws" {
  region = "eu-central-1"
}

# Use existing VPC and subnet resources
data "aws_vpc" "existing" {
  filter {
    name   = "cidr-block"
    values = ["10.1.0.0/16"] # Bastion VPC CIDR
  }
}

data "aws_subnet" "public" {
  vpc_id = data.aws_vpc.existing.id
  filter {
    name   = "map-public-ip-on-launch"
    values = ["true"]
  }
  filter {
    name   = "availability-zone"
    values = ["eu-central-1a"] # Specify a single AZ
  }
  # If there are still multiple subnets in the same AZ, you can add a tag filter
  # or use a specific subnet ID instead
}

data "aws_route_table" "public" {
  vpc_id = data.aws_vpc.existing.id
  filter {
    name   = "association.subnet-id"
    values = [data.aws_subnet.public.id]
  }
}

data "aws_internet_gateway" "existing" {
  filter {
    name   = "attachment.vpc-id"
    values = [data.aws_vpc.existing.id]
  }
}

data "aws_availability_zones" "available" {}

resource "aws_security_group" "aiolos_api" {
  name        = "aiolos-api-sg"
  description = "Allow HTTP, HTTPS, and SSH"
  vpc_id      = data.aws_vpc.existing.id

  tags = {
    Name    = "aiolos-api-sg"
    Project = "aiolos"
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH only from inside the VPC"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.existing.cidr_block] # Use the VPC CIDR dynamically
  }

  ingress {
    description = "ICMP (ping) from inside the VPC"
    from_port   = -1
    to_port     = -1
    protocol    = "icmp"
    cidr_blocks = [data.aws_vpc.existing.cidr_block] # Use the VPC CIDR dynamically
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_ecr_repository" "aiolos" {
  name = "aiolos-backend"
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = {
    Name    = "aiolos-backend"
    Project = "aiolos"
  }
}

resource "aws_ecr_repository" "aiolos_frontend" {
  name = "aiolos-frontend"
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = {
    Name    = "aiolos-frontend"
    Project = "aiolos"
  }
}

resource "aws_iam_role" "ec2_ecr_pull" {
  name = "aiolos-ec2-ecr-pull-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = {
    Name    = "aiolos-ec2-ecr-pull-role"
    Project = "aiolos"
  }
}

resource "aws_iam_role_policy_attachment" "ecr_pull" {
  role       = aws_iam_role.ec2_ecr_pull.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "ec2_ecr_pull" {
  name = "aiolos-ec2-ecr-pull-profile"
  role = aws_iam_role.ec2_ecr_pull.name
}

resource "aws_instance" "aiolos_api" {
  ami                    = "ami-0bb2f7cbe0aa41ffa"
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.aiolos_api.id]
  key_name               = var.key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2_ecr_pull.name

  user_data = file("${path.module}/user_data.sh")

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
    tags = {
      Name    = "aiolos-api-root-volume"
      Project = "aiolos"
    }
  }

  tags = {
    Name    = "aiolos-api"
    Project = "aiolos"
  }
}

resource "aws_eip" "aiolos_api" {
  instance   = aws_instance.aiolos_api.id
  depends_on = [data.aws_internet_gateway.existing]
  tags = {
    Name    = "aiolos-api-eip"
    Project = "aiolos"
  }
}

resource "aws_ecr_lifecycle_policy" "aiolos_backend_policy" {
  repository = aws_ecr_repository.aiolos.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1,
        description  = "Keep only the most recent buildcache tag",
        selection = {
          tagStatus     = "tagged",
          tagPrefixList = ["buildcache"],
          countType     = "imageCountMoreThan",
          countNumber   = 1
        },
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2,
        description  = "Keep only 3 most recent non-buildcache images",
        selection = {
          tagStatus     = "tagged",
          tagPrefixList = ["latest", "sha"],
          countType     = "imageCountMoreThan",
          countNumber   = 3
        },
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3,
        description  = "Keep only 3 most recent untagged images",
        selection = {
          tagStatus   = "untagged",
          countType   = "imageCountMoreThan",
          countNumber = 3
        },
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "aiolos_frontend_policy" {
  repository = aws_ecr_repository.aiolos_frontend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1,
        description  = "Keep only the most recent buildcache tag",
        selection = {
          tagStatus     = "tagged",
          tagPrefixList = ["buildcache"],
          countType     = "imageCountMoreThan",
          countNumber   = 1
        },
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2,
        description  = "Keep only 3 most recent non-buildcache images",
        selection = {
          tagStatus     = "tagged",
          tagPrefixList = ["latest", "sha"],
          countType     = "imageCountMoreThan",
          countNumber   = 3
        },
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3,
        description  = "Keep only 3 most recent untagged images",
        selection = {
          tagStatus   = "untagged",
          countType   = "imageCountMoreThan",
          countNumber = 3
        },
        action = {
          type = "expire"
        }
      }
    ]
  })
}

