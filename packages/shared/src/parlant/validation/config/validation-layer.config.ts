/**
 * PARLANT Validation Layer Configuration
 *
 * Centralized configuration for the PARLANT validation integration layer.
 * Provides environment-based configuration with sensible defaults for
 * development, testing, and production environments.
 *
 * @module ValidationLayerConfig
 * @version 1.0.0
 * @author AIgent Integration Team
 */

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// ===== CONFIGURATION INTERFACES =====

export interface ValidationLayerConfig {
  /** General validation settings */
  validation: ValidationConfig;
  /** WebSocket communication settings */
  websocket: WebSocketConfig;
  /** Caching configuration */
  cache: CacheConfig;
  /** Performance settings */
  performance: PerformanceConfig;
  /** Security configuration */
  security: SecurityConfig;
  /** Bypass settings */
  bypass: BypassConfig;
  /** Monitoring configuration */
  monitoring: MonitoringConfig;
}

interface ValidationConfig {
  /** Enable validation layer */
  enabled: boolean;
  /** Default timeout for validation requests */
  defaultTimeoutMs: number;
  /** Maximum concurrent validations */
  maxConcurrentValidations: number;
  /** Validation retry configuration */
  retry: RetryConfig;
}

interface WebSocketConfig {
  /** PARLANT WebSocket server URLs */
  serverUrls: string[];
  /** Connection pool settings */
  pool: PoolConfig;
  /** Load balancing strategy */
  loadBalancing: LoadBalancingConfig;
  /** Health check settings */
  healthCheck: HealthCheckConfig;
  /** Failover configuration */
  failover: FailoverConfig;
}

interface CacheConfig {
  /** Enable intelligent caching */
  enabled: boolean;
  /** Cache type selection */
  type: CacheType;
  /** L1 cache (memory) settings */
  l1: CacheTierConfig;
  /** L2 cache (Redis) settings */
  l2: CacheTierConfig;
  /** L3 cache (database) settings */
  l3: CacheTierConfig;
  /** Cache hit rate target */
  hitRateTarget: number;
}

interface PerformanceConfig {
  /** P95 response time target in milliseconds */
  p95TargetMs: number;
  /** P99 response time target in milliseconds */
  p99TargetMs: number;
  /** Circuit breaker settings */
  circuitBreaker: CircuitBreakerConfig;
  /** Batch processing settings */
  batching: BatchingConfig;
}

interface SecurityConfig {
  /** Default security level for operations */
  defaultSecurityLevel: string;
  /** Data sanitization settings */
  sanitization: SanitizationConfig;
  /** Audit configuration */
  audit: AuditConfig;
  /** Encryption settings */
  encryption: EncryptionConfig;
}

interface BypassConfig {
  /** Enable emergency bypass mechanisms */
  enabled: boolean;
  /** Bypass triggers */
  triggers: BypassTriggerConfig[];
  /** Maximum bypass duration */
  maxDurationMs: number;
  /** Required authorization levels */
  authorizationLevels: string[];
}

interface MonitoringConfig {
  /** Enable performance monitoring */
  enabled: boolean;
  /** Metrics collection interval */
  metricsIntervalMs: number;
  /** Enable detailed logging */
  detailedLogging: boolean;
  /** Alert thresholds */
  alerts: AlertConfig;
}

// ===== SUPPORTING INTERFACES =====

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface PoolConfig {
  minSize: number;
  maxSize: number;
  idleTimeoutMs: number;
  growthStrategy: "eager" | "lazy" | "adaptive";
}

interface LoadBalancingConfig {
  strategy:
    | "round_robin"
    | "least_connections"
    | "weighted_random"
    | "health_based";
  sessionAffinity: boolean;
  affinityStrategy: "user_id" | "session_id" | "ip_hash";
}

interface HealthCheckConfig {
  intervalMs: number;
  timeoutMs: number;
  failureThreshold: number;
  recoveryThreshold: number;
}

interface FailoverConfig {
  enabled: boolean;
  timeoutMs: number;
  maxAttempts: number;
  strategy: "immediate" | "graceful" | "circuit_breaker";
}

interface CacheTierConfig {
  enabled: boolean;
  maxSize: number;
  ttlMs: number;
  evictionPolicy: "lru" | "fifo" | "ttl";
}

interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
}

interface BatchingConfig {
  enabled: boolean;
  maxBatchSize: number;
  batchTimeoutMs: number;
  dynamicSizing: boolean;
}

interface SanitizationConfig {
  enableParameterSanitization: boolean;
  enableResponseSanitization: boolean;
  sensitiveDataPatterns: string[];
  redactionStrategy: "mask" | "remove" | "hash";
}

interface AuditConfig {
  enabled: boolean;
  level: "basic" | "detailed" | "comprehensive";
  retentionDays: number;
  complianceMode: boolean;
}

interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keyRotationDays: number;
}

interface BypassTriggerConfig {
  type: "timeout" | "connection_failure" | "critical_operation";
  condition: string;
  priority: number;
}

interface AlertConfig {
  errorRateThreshold: number;
  responseTimeThreshold: number;
  cacheHitRateThreshold: number;
  channels: string[];
}

enum CacheType {
  MEMORY = "memory",
  REDIS = "redis",
  HYBRID = "hybrid",
  DISABLED = "disabled",
}

// ===== CONFIGURATION SERVICE =====

@Injectable()
export class ValidationLayerConfigService {
  private readonly config: ValidationLayerConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadConfiguration();
  }

  /**
   * Load configuration from environment variables with defaults
   */
  private loadConfiguration(): ValidationLayerConfig {
    return {
      validation: this.loadValidationConfig(),
      websocket: this.loadWebSocketConfig(),
      cache: this.loadCacheConfig(),
      performance: this.loadPerformanceConfig(),
      security: this.loadSecurityConfig(),
      bypass: this.loadBypassConfig(),
      monitoring: this.loadMonitoringConfig(),
    };
  }

  /**
   * Load validation configuration
   */
  private loadValidationConfig(): ValidationConfig {
    return {
      enabled:
        this.configService.get<boolean>("PARLANT_VALIDATION_ENABLED") ?? true,
      defaultTimeoutMs:
        this.configService.get<number>("PARLANT_DEFAULT_TIMEOUT") ?? 5000,
      maxConcurrentValidations:
        this.configService.get<number>("PARLANT_MAX_CONCURRENT") ?? 100,
      retry: {
        maxAttempts:
          this.configService.get<number>("PARLANT_RETRY_MAX_ATTEMPTS") ?? 3,
        baseDelayMs:
          this.configService.get<number>("PARLANT_RETRY_BASE_DELAY") ?? 1000,
        maxDelayMs:
          this.configService.get<number>("PARLANT_RETRY_MAX_DELAY") ?? 10000,
        backoffMultiplier:
          this.configService.get<number>("PARLANT_RETRY_BACKOFF") ?? 2,
      },
    };
  }

  /**
   * Load WebSocket configuration
   */
  private loadWebSocketConfig(): WebSocketConfig {
    const serverUrlsString =
      this.configService.get<string>("PARLANT_WEBSOCKET_SERVERS") ??
      this.configService.get<string>("PARLANT_WEBSOCKET_URL") ??
      "ws://localhost:8080/parlant";

    return {
      serverUrls: serverUrlsString.split(",").map((url) => url.trim()),
      pool: {
        minSize: this.configService.get<number>("PARLANT_POOL_MIN_SIZE") ?? 2,
        maxSize: this.configService.get<number>("PARLANT_POOL_MAX_SIZE") ?? 10,
        idleTimeoutMs:
          this.configService.get<number>("PARLANT_POOL_IDLE_TIMEOUT") ?? 300000,
        growthStrategy:
          (this.configService.get<string>("PARLANT_POOL_GROWTH") as any) ??
          "adaptive",
      },
      loadBalancing: {
        strategy:
          (this.configService.get<string>("PARLANT_LOAD_BALANCE") as any) ??
          "least_connections",
        sessionAffinity:
          this.configService.get<boolean>("PARLANT_SESSION_AFFINITY") ?? true,
        affinityStrategy:
          (this.configService.get<string>(
            "PARLANT_AFFINITY_STRATEGY",
          ) as any) ?? "session_id",
      },
      healthCheck: {
        intervalMs:
          this.configService.get<number>("PARLANT_HEALTH_CHECK_INTERVAL") ??
          30000,
        timeoutMs:
          this.configService.get<number>("PARLANT_HEALTH_CHECK_TIMEOUT") ??
          5000,
        failureThreshold:
          this.configService.get<number>("PARLANT_HEALTH_FAILURE_THRESHOLD") ??
          3,
        recoveryThreshold:
          this.configService.get<number>("PARLANT_HEALTH_RECOVERY_THRESHOLD") ??
          2,
      },
      failover: {
        enabled:
          this.configService.get<boolean>("PARLANT_FAILOVER_ENABLED") ?? true,
        timeoutMs:
          this.configService.get<number>("PARLANT_FAILOVER_TIMEOUT") ?? 5000,
        maxAttempts:
          this.configService.get<number>("PARLANT_FAILOVER_MAX_ATTEMPTS") ?? 3,
        strategy:
          (this.configService.get<string>(
            "PARLANT_FAILOVER_STRATEGY",
          ) as any) ?? "graceful",
      },
    };
  }

  /**
   * Load cache configuration
   */
  private loadCacheConfig(): CacheConfig {
    return {
      enabled: this.configService.get<boolean>("PARLANT_CACHE_ENABLED") ?? true,
      type:
        (this.configService.get<string>("PARLANT_CACHE_TYPE") as CacheType) ??
        CacheType.HYBRID,
      l1: {
        enabled:
          this.configService.get<boolean>("PARLANT_L1_CACHE_ENABLED") ?? true,
        maxSize:
          this.configService.get<number>("PARLANT_L1_CACHE_MAX_SIZE") ?? 1000,
        ttlMs: this.configService.get<number>("PARLANT_L1_CACHE_TTL") ?? 300000, // 5 minutes
        evictionPolicy:
          (this.configService.get<string>(
            "PARLANT_L1_CACHE_EVICTION",
          ) as any) ?? "lru",
      },
      l2: {
        enabled:
          this.configService.get<boolean>("PARLANT_L2_CACHE_ENABLED") ?? true,
        maxSize:
          this.configService.get<number>("PARLANT_L2_CACHE_MAX_SIZE") ?? 10000,
        ttlMs:
          this.configService.get<number>("PARLANT_L2_CACHE_TTL") ?? 3600000, // 1 hour
        evictionPolicy:
          (this.configService.get<string>(
            "PARLANT_L2_CACHE_EVICTION",
          ) as any) ?? "lru",
      },
      l3: {
        enabled:
          this.configService.get<boolean>("PARLANT_L3_CACHE_ENABLED") ?? false,
        maxSize:
          this.configService.get<number>("PARLANT_L3_CACHE_MAX_SIZE") ?? 100000,
        ttlMs:
          this.configService.get<number>("PARLANT_L3_CACHE_TTL") ?? 86400000, // 24 hours
        evictionPolicy:
          (this.configService.get<string>(
            "PARLANT_L3_CACHE_EVICTION",
          ) as any) ?? "ttl",
      },
      hitRateTarget:
        this.configService.get<number>("PARLANT_CACHE_HIT_TARGET") ?? 85,
    };
  }

  /**
   * Load performance configuration
   */
  private loadPerformanceConfig(): PerformanceConfig {
    return {
      p95TargetMs: this.configService.get<number>("PARLANT_P95_TARGET") ?? 1000,
      p99TargetMs: this.configService.get<number>("PARLANT_P99_TARGET") ?? 2000,
      circuitBreaker: {
        enabled:
          this.configService.get<boolean>("PARLANT_CIRCUIT_BREAKER_ENABLED") ??
          true,
        failureThreshold:
          this.configService.get<number>("PARLANT_CB_FAILURE_THRESHOLD") ?? 5,
        successThreshold:
          this.configService.get<number>("PARLANT_CB_SUCCESS_THRESHOLD") ?? 3,
        timeoutMs:
          this.configService.get<number>("PARLANT_CB_TIMEOUT") ?? 60000,
      },
      batching: {
        enabled:
          this.configService.get<boolean>("PARLANT_BATCHING_ENABLED") ?? false,
        maxBatchSize:
          this.configService.get<number>("PARLANT_BATCH_MAX_SIZE") ?? 10,
        batchTimeoutMs:
          this.configService.get<number>("PARLANT_BATCH_TIMEOUT") ?? 100,
        dynamicSizing:
          this.configService.get<boolean>("PARLANT_BATCH_DYNAMIC") ?? true,
      },
    };
  }

  /**
   * Load security configuration
   */
  private loadSecurityConfig(): SecurityConfig {
    return {
      defaultSecurityLevel:
        this.configService.get<string>("PARLANT_DEFAULT_SECURITY_LEVEL") ??
        "medium",
      sanitization: {
        enableParameterSanitization:
          this.configService.get<boolean>("PARLANT_SANITIZE_PARAMS") ?? true,
        enableResponseSanitization:
          this.configService.get<boolean>("PARLANT_SANITIZE_RESPONSE") ?? true,
        sensitiveDataPatterns: this.loadSensitivePatterns(),
        redactionStrategy:
          (this.configService.get<string>(
            "PARLANT_REDACTION_STRATEGY",
          ) as any) ?? "mask",
      },
      audit: {
        enabled:
          this.configService.get<boolean>("PARLANT_AUDIT_ENABLED") ?? true,
        level:
          (this.configService.get<string>("PARLANT_AUDIT_LEVEL") as any) ??
          "detailed",
        retentionDays:
          this.configService.get<number>("PARLANT_AUDIT_RETENTION") ?? 90,
        complianceMode:
          this.configService.get<boolean>("PARLANT_COMPLIANCE_MODE") ?? false,
      },
      encryption: {
        enabled:
          this.configService.get<boolean>("PARLANT_ENCRYPTION_ENABLED") ?? true,
        algorithm:
          this.configService.get<string>("PARLANT_ENCRYPTION_ALGORITHM") ??
          "AES-256-GCM",
        keyRotationDays:
          this.configService.get<number>("PARLANT_KEY_ROTATION_DAYS") ?? 30,
      },
    };
  }

  /**
   * Load bypass configuration
   */
  private loadBypassConfig(): BypassConfig {
    return {
      enabled:
        this.configService.get<boolean>("PARLANT_BYPASS_ENABLED") ?? true,
      triggers: [
        {
          type: "timeout",
          condition: "validation_timeout > 10000",
          priority: 1,
        },
        {
          type: "connection_failure",
          condition: "connection_failures > 3",
          priority: 2,
        },
        {
          type: "critical_operation",
          condition: "security_level = critical AND operation_type = emergency",
          priority: 0,
        },
      ],
      maxDurationMs:
        this.configService.get<number>("PARLANT_BYPASS_MAX_DURATION") ??
        3600000, // 1 hour
      authorizationLevels: this.configService
        .get<string>("PARLANT_BYPASS_AUTH_LEVELS")
        ?.split(",") ?? ["admin", "super_admin"],
    };
  }

  /**
   * Load monitoring configuration
   */
  private loadMonitoringConfig(): MonitoringConfig {
    return {
      enabled:
        this.configService.get<boolean>("PARLANT_MONITORING_ENABLED") ?? true,
      metricsIntervalMs:
        this.configService.get<number>("PARLANT_METRICS_INTERVAL") ?? 60000,
      detailedLogging:
        this.configService.get<boolean>("PARLANT_DETAILED_LOGGING") ?? false,
      alerts: {
        errorRateThreshold:
          this.configService.get<number>("PARLANT_ALERT_ERROR_RATE") ?? 5.0,
        responseTimeThreshold:
          this.configService.get<number>("PARLANT_ALERT_RESPONSE_TIME") ?? 2000,
        cacheHitRateThreshold:
          this.configService.get<number>("PARLANT_ALERT_CACHE_HIT_RATE") ?? 80,
        channels: this.configService
          .get<string>("PARLANT_ALERT_CHANNELS")
          ?.split(",") ?? ["email", "slack"],
      },
    };
  }

  /**
   * Load sensitive data patterns
   */
  private loadSensitivePatterns(): string[] {
    const defaultPatterns = [
      "\\b\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}\\b", // Credit card numbers
      "\\b\\d{3}-\\d{2}-\\d{4}\\b", // SSN
      "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b", // Email addresses
      "\\b(?:\\+?1[-\.\\s]?)?\\(?[0-9]{3}\\)?[-\.\\s]?[0-9]{3}[-\.\\s]?[0-9]{4}\\b", // Phone numbers
      "\\b[A-Z0-9]{20,}\\b", // API keys or tokens
    ];

    const customPatterns = this.configService.get<string>(
      "PARLANT_SENSITIVE_PATTERNS",
    );
    if (customPatterns) {
      return [
        ...defaultPatterns,
        ...customPatterns.split(",").map((p) => p.trim()),
      ];
    }

    return defaultPatterns;
  }

  /**
   * Get complete configuration
   */
  getConfig(): ValidationLayerConfig {
    return this.config;
  }

  /**
   * Get validation configuration
   */
  getValidationConfig(): ValidationConfig {
    return this.config.validation;
  }

  /**
   * Get WebSocket configuration
   */
  getWebSocketConfig(): WebSocketConfig {
    return this.config.websocket;
  }

  /**
   * Get cache configuration
   */
  getCacheConfig(): CacheConfig {
    return this.config.cache;
  }

  /**
   * Get performance configuration
   */
  getPerformanceConfig(): PerformanceConfig {
    return this.config.performance;
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): SecurityConfig {
    return this.config.security;
  }

  /**
   * Get bypass configuration
   */
  getBypassConfig(): BypassConfig {
    return this.config.bypass;
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfig(): MonitoringConfig {
    return this.config.monitoring;
  }

  /**
   * Check if validation is enabled
   */
  isValidationEnabled(): boolean {
    return this.config.validation.enabled;
  }

  /**
   * Check if caching is enabled
   */
  isCachingEnabled(): boolean {
    return this.config.cache.enabled;
  }

  /**
   * Check if bypass is enabled
   */
  isBypassEnabled(): boolean {
    return this.config.bypass.enabled;
  }

  /**
   * Get environment-specific overrides
   */
  getEnvironmentOverrides(): Partial<ValidationLayerConfig> {
    const environment =
      this.configService.get<string>("NODE_ENV") ?? "development";

    switch (environment) {
      case "production":
        return {
          monitoring: {
            ...this.config.monitoring,
            detailedLogging: false,
            alerts: {
              ...this.config.monitoring.alerts,
              errorRateThreshold: 1.0, // Stricter in production
              responseTimeThreshold: 1000, // Stricter in production
            },
          },
          security: {
            ...this.config.security,
            audit: {
              ...this.config.security.audit,
              level: "comprehensive",
              complianceMode: true,
            },
          },
        };

      case "test":
        return {
          validation: {
            ...this.config.validation,
            defaultTimeoutMs: 1000, // Faster timeouts in tests
          },
          cache: {
            ...this.config.cache,
            enabled: false, // Disable caching in tests
          },
          monitoring: {
            ...this.config.monitoring,
            enabled: false, // Disable monitoring in tests
          },
        };

      case "development":
      default:
        return {
          monitoring: {
            ...this.config.monitoring,
            detailedLogging: true,
          },
          security: {
            ...this.config.security,
            sanitization: {
              ...this.config.security.sanitization,
              enableParameterSanitization: false, // Easier debugging
            },
          },
        };
    }
  }

  /**
   * Validate configuration
   */
  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate timeout values
    if (this.config.validation.defaultTimeoutMs <= 0) {
      errors.push("Default timeout must be greater than 0");
    }

    // Validate pool configuration
    if (
      this.config.websocket.pool.minSize > this.config.websocket.pool.maxSize
    ) {
      errors.push("Pool min size cannot be greater than max size");
    }

    // Validate cache configuration
    if (
      this.config.cache.hitRateTarget < 0 ||
      this.config.cache.hitRateTarget > 100
    ) {
      errors.push("Cache hit rate target must be between 0 and 100");
    }

    // Validate circuit breaker thresholds
    if (this.config.performance.circuitBreaker.failureThreshold <= 0) {
      errors.push("Circuit breaker failure threshold must be greater than 0");
    }

    // Validate WebSocket URLs
    for (const url of this.config.websocket.serverUrls) {
      if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
        errors.push(`Invalid WebSocket URL: ${url}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
