# Staging Environment Configuration for PARLANT Function Wrapping System

environment = "staging"
region      = "us-east-1"

# Staging-specific function scaling (70% of production)
function_count = 1064

# Enterprise compliance level for staging
compliance_level = "enterprise"

# Enable disaster recovery testing
enable_disaster_recovery = true

# Staging-specific variables
enable_debug_logging = false
enable_profiling     = true
enable_hot_reload    = false

# Staging-specific resource limits (production-like)
max_cpu_per_function    = "2000m"
max_memory_per_function = "4Gi"

# Staging database configuration
database_config = {
  enable_query_logging     = false
  enable_slow_query_log   = true
  query_cache_size        = "128MB"
  innodb_buffer_pool_size = "4GB"
}

# Staging Redis configuration
redis_config = {
  maxmemory_policy = "allkeys-lru"
  maxmemory        = "2gb"
  save_frequency   = "300 10 60 10000"
}

# Staging monitoring (production-like)
monitoring_config = {
  metrics_retention_days = 30
  log_retention_days    = 30
  enable_detailed_monitoring = true
  alert_channels = ["email", "slack"]
}

# Staging networking (restricted access)
networking_config = {
  enable_public_access = false
  allowed_cidr_blocks = [
    "10.0.0.0/8",    # Internal networks
    "172.16.0.0/12", # Private networks
    "192.168.0.0/16" # Local networks
  ]
  enable_vpn = true
}

# Staging feature flags (production-like)
feature_flags = {
  enable_experimental_features = false
  enable_beta_apis            = true
  enable_debug_endpoints      = false
  enable_mock_services        = false
}

# Load testing configuration
load_testing_config = {
  enable_load_testing = true
  max_concurrent_users = 1000
  test_duration_minutes = 30
  ramp_up_minutes = 5
}

# Performance targets for staging validation
performance_targets = {
  max_response_time_ms = 1000
  min_throughput_rps   = 500
  max_error_rate       = 0.01
  min_availability     = 99.9
}