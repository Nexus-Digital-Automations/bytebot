# Development Environment Configuration for PARLANT Function Wrapping System

environment = "development"
region      = "us-east-1"

# Development-specific function scaling
function_count = 500

# Development compliance level
compliance_level = "basic"

# Disable disaster recovery for development
enable_disaster_recovery = false

# Additional development-specific variables
enable_debug_logging = true
enable_profiling     = true
enable_hot_reload    = true

# Development-specific resource limits
max_cpu_per_function    = "1000m"
max_memory_per_function = "2Gi"

# Development database configuration
database_config = {
  enable_query_logging     = true
  enable_slow_query_log   = true
  query_cache_size        = "32MB"
  innodb_buffer_pool_size = "1GB"
}

# Development Redis configuration
redis_config = {
  maxmemory_policy = "allkeys-lru"
  maxmemory        = "512mb"
  save_frequency   = "900 1 300 10 60 10000"
}

# Development monitoring
monitoring_config = {
  metrics_retention_days = 7
  log_retention_days    = 14
  enable_detailed_monitoring = false
  alert_channels = ["email"]
}

# Development networking
networking_config = {
  enable_public_access = true
  allowed_cidr_blocks = ["0.0.0.0/0"]  # Allow all for development
  enable_vpn          = false
}

# Development feature flags
feature_flags = {
  enable_experimental_features = true
  enable_beta_apis            = true
  enable_debug_endpoints      = true
  enable_mock_services        = true
}