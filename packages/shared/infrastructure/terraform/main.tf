# PARLANT Database Function Wrapping System - Infrastructure as Code
# Enterprise-grade environment management supporting 1,520+ function deployments

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    postgresql = {
      source  = "cyrilgdn/postgresql"
      version = "~> 1.20"
    }
    vault = {
      source  = "hashicorp/vault"
      version = "~> 3.20"
    }
  }

  backend "s3" {
    # Environment-specific backend configuration via backend configs
    encrypt = true
    key     = "parlant-function-wrapping/terraform.tfstate"
  }
}

# Variables for environment configuration
variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  validation {
    condition = contains(["development", "staging", "production", "dr"], var.environment)
    error_message = "Environment must be one of: development, staging, production, dr"
  }
}

variable "region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "function_count" {
  description = "Expected number of PARLANT function deployments"
  type        = number
  default     = 1520
  validation {
    condition = var.function_count >= 100 && var.function_count <= 5000
    error_message = "Function count must be between 100 and 5000"
  }
}

variable "enable_disaster_recovery" {
  description = "Enable disaster recovery features"
  type        = bool
  default     = true
}

variable "compliance_level" {
  description = "Compliance level (basic, enterprise, regulated)"
  type        = string
  default     = "enterprise"
  validation {
    condition = contains(["basic", "enterprise", "regulated"], var.compliance_level)
    error_message = "Compliance level must be one of: basic, enterprise, regulated"
  }
}

# Local values for environment-specific configuration
locals {
  name_prefix = "parlant-${var.environment}"

  # Environment-specific scaling configuration
  scaling_config = {
    development = {
      min_capacity = 2
      max_capacity = 10
      target_cpu   = 70
      target_memory = 80
    }
    staging = {
      min_capacity = 3
      max_capacity = 20
      target_cpu   = 60
      target_memory = 70
    }
    production = {
      min_capacity = 5
      max_capacity = 100
      target_cpu   = 50
      target_memory = 60
    }
    dr = {
      min_capacity = 2
      max_capacity = 50
      target_cpu   = 70
      target_memory = 80
    }
  }

  # Database configuration per environment
  database_config = {
    development = {
      instance_class    = "db.t3.large"
      allocated_storage = 100
      max_connections  = 200
      backup_retention = 7
    }
    staging = {
      instance_class    = "db.r6g.xlarge"
      allocated_storage = 500
      max_connections  = 500
      backup_retention = 14
    }
    production = {
      instance_class    = "db.r6g.2xlarge"
      allocated_storage = 1000
      max_connections  = 1000
      backup_retention = 30
    }
    dr = {
      instance_class    = "db.r6g.xlarge"
      allocated_storage = 1000
      max_connections  = 500
      backup_retention = 30
    }
  }

  # Security configuration
  security_config = {
    basic = {
      enable_waf                = false
      enable_shield            = false
      enable_guardduty         = false
      encryption_at_rest       = true
      encryption_in_transit    = true
    }
    enterprise = {
      enable_waf                = true
      enable_shield            = false
      enable_guardduty         = true
      encryption_at_rest       = true
      encryption_in_transit    = true
    }
    regulated = {
      enable_waf                = true
      enable_shield            = true
      enable_guardduty         = true
      encryption_at_rest       = true
      encryption_in_transit    = true
    }
  }

  common_tags = {
    Environment = var.environment
    Project     = "PARLANT-Function-Wrapping"
    ManagedBy   = "Terraform"
    Component   = "Infrastructure"
    Owner       = "AIgent-Platform"
  }
}

# Data sources for existing infrastructure
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC Configuration
module "vpc" {
  source = "./modules/vpc"

  name_prefix        = local.name_prefix
  environment        = var.environment
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 3)

  # CIDR blocks for different environments
  cidr_block = var.environment == "production" ? "10.0.0.0/16" : "10.${var.environment == "staging" ? "1" : "2"}.0.0/16"

  enable_nat_gateway = true
  enable_vpn_gateway = var.compliance_level == "regulated"
  enable_flow_logs   = var.compliance_level != "basic"

  tags = local.common_tags
}

# EKS Cluster for container orchestration
module "eks" {
  source = "./modules/eks"

  cluster_name    = "${local.name_prefix}-cluster"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Node group configuration for PARLANT function scaling
  node_groups = {
    parlant_functions = {
      instance_types = var.environment == "production" ? ["m6i.2xlarge", "m6i.4xlarge"] : ["m6i.large", "m6i.xlarge"]
      scaling_config = local.scaling_config[var.environment]
      disk_size      = 100

      labels = {
        role = "parlant-functions"
        environment = var.environment
      }

      taints = [{
        key    = "parlant.io/dedicated"
        value  = "function-execution"
        effect = "NO_SCHEDULE"
      }]
    }

    system_services = {
      instance_types = ["m6i.large"]
      scaling_config = {
        min_capacity = 2
        max_capacity = 5
        target_cpu   = 80
        target_memory = 80
      }
      disk_size = 50

      labels = {
        role = "system-services"
        environment = var.environment
      }
    }
  }

  # Cluster add-ons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  tags = local.common_tags
}

# RDS PostgreSQL for PARLANT function metadata and state
module "database" {
  source = "./modules/rds"

  identifier = "${local.name_prefix}-postgres"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = local.database_config[var.environment].instance_class

  allocated_storage     = local.database_config[var.environment].allocated_storage
  max_allocated_storage = local.database_config[var.environment].allocated_storage * 2

  db_name  = "parlant_functions"
  username = "parlant_admin"
  port     = 5432

  vpc_security_group_ids = [module.security.database_security_group_id]
  db_subnet_group_name   = module.vpc.database_subnet_group

  backup_retention_period = local.database_config[var.environment].backup_retention
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  # High availability for production
  multi_az = var.environment == "production"

  # Enhanced monitoring
  monitoring_interval = var.environment == "production" ? 60 : 0
  monitoring_role_arn = var.environment == "production" ? aws_iam_role.rds_enhanced_monitoring[0].arn : null

  # Performance Insights
  performance_insights_enabled = var.environment == "production"
  performance_insights_retention_period = var.environment == "production" ? 7 : null

  # Encryption
  storage_encrypted = true
  kms_key_id       = aws_kms_key.database.arn

  # Parameter group for optimized PARLANT function performance
  parameter_group_name = aws_db_parameter_group.parlant_functions.name

  # Read replicas for production
  create_read_replica = var.environment == "production"
  read_replica_config = var.environment == "production" ? {
    identifier = "${local.name_prefix}-postgres-read"
    instance_class = local.database_config[var.environment].instance_class
  } : null

  tags = local.common_tags
}

# ElastiCache Redis for caching and session management
module "redis" {
  source = "./modules/redis"

  cluster_id = "${local.name_prefix}-redis"

  node_type = var.environment == "production" ? "cache.r7g.xlarge" : "cache.r7g.large"

  # Cluster mode for production, single node for dev/staging
  cluster_mode_enabled = var.environment == "production"
  num_cache_clusters   = var.environment == "production" ? 3 : 1

  port = 6379

  subnet_group_name  = module.vpc.redis_subnet_group
  security_group_ids = [module.security.redis_security_group_id]

  # Backup configuration
  snapshot_retention_limit = var.environment == "production" ? 7 : 1
  snapshot_window         = "03:00-05:00"

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled        = true

  tags = local.common_tags
}

# Application Load Balancer for PARLANT function access
module "alb" {
  source = "./modules/alb"

  name = "${local.name_prefix}-alb"

  vpc_id  = module.vpc.vpc_id
  subnets = module.vpc.public_subnets

  security_group_ids = [module.security.alb_security_group_id]

  # SSL certificate
  certificate_arn = module.acm.certificate_arn

  # Target groups for different service types
  target_groups = {
    parlant_api = {
      port     = 8080
      protocol = "HTTP"
      health_check = {
        path                = "/health"
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout             = 5
        interval            = 30
        matcher             = "200"
      }
    }

    parlant_websocket = {
      port     = 8081
      protocol = "HTTP"
      health_check = {
        path                = "/ws/health"
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout             = 5
        interval            = 30
        matcher             = "200"
      }
    }
  }

  # WAF association for security
  enable_waf = local.security_config[var.compliance_level].enable_waf

  tags = local.common_tags
}

# Security groups and IAM roles
module "security" {
  source = "./modules/security"

  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id

  compliance_level = var.compliance_level
  security_config  = local.security_config[var.compliance_level]

  tags = local.common_tags
}

# ACM certificate for HTTPS
module "acm" {
  source = "./modules/acm"

  domain_name = var.environment == "production" ? "parlant.aigent.app" : "${var.environment}.parlant.aigent.app"

  subject_alternative_names = [
    "*.${var.environment == "production" ? "parlant.aigent.app" : "${var.environment}.parlant.aigent.app"}"
  ]

  tags = local.common_tags
}

# Secrets Manager for configuration management
resource "aws_secretsmanager_secret" "parlant_config" {
  name                    = "${local.name_prefix}/config"
  description             = "PARLANT function wrapping system configuration"
  recovery_window_in_days = var.environment == "production" ? 30 : 7

  replica {
    region = var.region == "us-east-1" ? "us-west-2" : "us-east-1"
  }

  tags = local.common_tags
}

# KMS keys for encryption
resource "aws_kms_key" "database" {
  description             = "KMS key for PARLANT database encryption"
  deletion_window_in_days = var.environment == "production" ? 30 : 7

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-database-key"
  })
}

resource "aws_kms_alias" "database" {
  name          = "alias/${local.name_prefix}-database"
  target_key_id = aws_kms_key.database.key_id
}

# Enhanced monitoring IAM role
resource "aws_iam_role" "rds_enhanced_monitoring" {
  count = var.environment == "production" ? 1 : 0

  name = "${local.name_prefix}-rds-enhanced-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  count = var.environment == "production" ? 1 : 0

  role       = aws_iam_role.rds_enhanced_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Database parameter group optimized for PARLANT functions
resource "aws_db_parameter_group" "parlant_functions" {
  name   = "${local.name_prefix}-postgres"
  family = "postgres15"

  # Optimizations for high-concurrency function execution
  parameter {
    name  = "max_connections"
    value = local.database_config[var.environment].max_connections
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,auto_explain"
  }

  parameter {
    name  = "log_statement"
    value = var.environment == "production" ? "mod" : "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "work_mem"
    value = "16MB"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "256MB"
  }

  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }

  parameter {
    name  = "wal_buffers"
    value = "16MB"
  }

  tags = local.common_tags
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "parlant_application" {
  name              = "/aws/parlant/${var.environment}/application"
  retention_in_days = var.environment == "production" ? 30 : 14

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "parlant_audit" {
  name              = "/aws/parlant/${var.environment}/audit"
  retention_in_days = var.environment == "production" ? 365 : 90

  tags = local.common_tags
}

# Disaster Recovery Resources (conditional)
module "disaster_recovery" {
  source = "./modules/disaster-recovery"
  count  = var.enable_disaster_recovery && var.environment == "production" ? 1 : 0

  name_prefix     = local.name_prefix
  primary_region  = var.region
  dr_region      = var.region == "us-east-1" ? "us-west-2" : "us-east-1"

  database_config = local.database_config[var.environment]

  tags = local.common_tags
}

# Output values for use by other modules
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = module.database.db_instance_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.redis.primary_endpoint
  sensitive   = true
}

output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = module.alb.dns_name
}

output "certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = module.acm.certificate_arn
}

output "secrets_manager_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.parlant_config.arn
}