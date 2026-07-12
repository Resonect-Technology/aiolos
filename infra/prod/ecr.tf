# ECR repositories for the two images. Resource names kept from the original
# Terraform to avoid state moves.

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


