# Production Environment Configuration for PARLANT Function Wrapping System

environment = "production"
region      = "us-east-1"

# Full production function scaling
function_count = 1520

# Maximum compliance level for production
compliance_level = "regulated"

# Enable full disaster recovery
enable_disaster_recovery = true

# Production security settings
enable_debug_logging = false
enable_profiling     = false
enable_hot_reload    = false

# Production-specific resource limits
max_cpu_per_function    = "4000m"
max_memory_per_function = "8Gi"

# Production database configuration (high performance)
database_config = {
  enable_query_logging     = false
  enable_slow_query_log   = true
  query_cache_size        = "512MB"
  innodb_buffer_pool_size = "16GB"
  innodb_log_file_size   = "2GB"
  max_connections        = 1000
  read_buffer_size       = "2MB"
  sort_buffer_size       = "4MB"
}

# Production Redis configuration (high availability)
redis_config = {
  maxmemory_policy = "allkeys-lru"
  maxmemory        = "8gb"
  save_frequency   = "60 10000"
  cluster_mode     = "enabled"
  num_shards      = 3
  replica_count   = 2
}

# Production monitoring (comprehensive)
monitoring_config = {
  metrics_retention_days = 90
  log_retention_days    = 365
  enable_detailed_monitoring = true
  alert_channels = ["email", "slack", "pagerduty", "sms"]
  enable_anomaly_detection = true
  enable_predictive_scaling = true
}

# Production networking (maximum security)
networking_config = {
  enable_public_access = false
  allowed_cidr_blocks = [
    "10.0.0.0/16"  # Only internal VPC access
  ]
  enable_vpn = true
  enable_private_endpoints = true
  enable_nat_gateway_ha = true
}

# Production feature flags (stable only)
feature_flags = {
  enable_experimental_features = false
  enable_beta_apis            = false
  enable_debug_endpoints      = false
  enable_mock_services        = false
}

# Production backup configuration
backup_config = {
  database_backup_retention_days = 30
  point_in_time_recovery_days   = 7
  cross_region_backup_enabled   = true
  automated_snapshot_enabled    = true
  snapshot_frequency_hours      = 6
}

# Production security configuration
security_config = {
  enable_waf                 = true
  enable_ddos_protection    = true
  enable_security_headers   = true
  enable_rate_limiting      = true
  max_requests_per_minute   = 10000
  enable_ip_whitelisting    = true
  enable_geo_blocking       = true
  blocked_countries         = ["CN", "RU", "IR", "KP"]
}

# Production compliance configuration
compliance_config = {
  enable_encryption_at_rest    = true
  enable_encryption_in_transit = true
  enable_audit_logging         = true
  enable_compliance_monitoring = true
  data_retention_years         = 7
  enable_gdpr_compliance       = true
  enable_hipaa_compliance      = true
  enable_sox_compliance        = true
}

# Production performance targets
performance_targets = {
  max_response_time_ms = 500
  min_throughput_rps   = 5000
  max_error_rate       = 0.001
  min_availability     = 99.99
  max_memory_usage     = 80
  max_cpu_usage        = 70
}

# Production auto-scaling configuration
autoscaling_config = {
  scale_up_threshold_cpu      = 70
  scale_down_threshold_cpu    = 30
  scale_up_threshold_memory   = 80
  scale_down_threshold_memory = 40
  scale_up_cooldown_seconds   = 300
  scale_down_cooldown_seconds = 600
  max_surge_percentage        = 25
  max_unavailable_percentage  = 10
}

# Production disaster recovery configuration
disaster_recovery_config = {
  enable_cross_region_replication = true
  dr_region                      = "us-west-2"
  rto_minutes                    = 30
  rpo_minutes                    = 5
  automated_failover_enabled     = true
  manual_failover_testing        = true
  dr_testing_frequency_days      = 30
}