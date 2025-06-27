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

resource "aws_vpc" "aiolos" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name    = "aiolos-vpc"
    Project = "aiolos"
  }
}

resource "aws_internet_gateway" "aiolos" {
  vpc_id = aws_vpc.aiolos.id
  tags = {
    Name    = "aiolos-igw"
    Project = "aiolos"
  }
}

resource "aws_subnet" "aiolos" {
  vpc_id                  = aws_vpc.aiolos.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = data.aws_availability_zones.available.names[0]
  tags = {
    Name    = "aiolos-subnet"
    Project = "aiolos"
  }
}

resource "aws_route_table" "aiolos" {
  vpc_id = aws_vpc.aiolos.id
  tags = {
    Name    = "aiolos-rt"
    Project = "aiolos"
  }
}

resource "aws_route" "internet_access" {
  route_table_id         = aws_route_table.aiolos.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.aiolos.id
}

resource "aws_route_table_association" "aiolos" {
  subnet_id      = aws_subnet.aiolos.id
  route_table_id = aws_route_table.aiolos.id
}

data "aws_availability_zones" "available" {}

resource "aws_security_group" "adonis_api" {
  name        = "adonis-api-sg"
  description = "Allow HTTP, HTTPS, and SSH"
  vpc_id      = aws_vpc.aiolos.id

  tags = {
    Name    = "adonis-api-sg"
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
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
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

resource "aws_instance" "adonis_api" {
  ami                    = "ami-0bb2f7cbe0aa41ffa"
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.aiolos.id
  vpc_security_group_ids = [aws_security_group.adonis_api.id]
  key_name               = var.key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2_ecr_pull.name

  user_data = file("${path.module}/user_data.sh")

  tags = {
    Name    = "adonis-api"
    Project = "aiolos"
  }
}
