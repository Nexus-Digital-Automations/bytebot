/**
 * Job Error Recovery Module - Enterprise-Grade Error Handling Integration
 *
 * Provides comprehensive module configuration for error recovery services
 * with proper dependency injection, configuration management, and monitoring.
 *
 * @author Error Handling & Recovery Specialist
 * @version 1.0.0
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {JobErrorRecoveryService,
  ErrorClassifier,
  RetryManager,
  FailureAnalyzer,
  RecoveryStrategyManager,
  DeadLetterQueueService,
} from './job-error-recovery.service';
import { JobStorage } from '../job-management.service';

/*** Error recovery configuration factory
 */
export const errorRecoveryConfig = () => ({
  errorRecovery: {
    maxRetries: parseInt(process.env.ERROR_RECOVERY_MAX_RETRIES || '3'),
  baseRetryDelay: parseInt(process.env.ERROR_RECOVERY_BASE_DELAY || '1000'),
  maxRetryDelay: parseInt(process.env.ERROR_RECOVERY_MAX_DELAY || '60000'),
  exponentialBackoffMultiplier: parseFloat(process.env.ERROR_RECOVERY_BACKOFF_MULTIPLIER || '2'),
  jitterMaxPercent: parseInt(process.env.ERROR_RECOVERY_JITTER_PERCENT || '10'),
  circuitBreakerFailureThreshold: parseInt(process.env.ERROR_RECOVERY_CIRCUIT_THRESHOLD || '5'),
  circuitBreakerRecoveryTimeout: parseInt(process.env.ERROR_RECOVERY_CIRCUIT_TIMEOUT || '60000'),
  deadLetterQueueMaxSize: parseInt(process.env.ERROR_RECOVERY_DLQ_MAX_SIZE || '1000'),
  errorPatternAnalysisWindow: parseInt(process.env.ERROR_RECOVERY_PATTERN_WINDOW || '3600000'),
  manualReviewEscalationTime: parseInt(process.env.ERROR_RECOVERY_ESCALATION_TIME || '1800000'),
  halfOpenMaxCalls: parseInt(process.env.ERROR_RECOVERY_HALF_OPEN_MAX_CALLS || '3'),// Feature flagsenableCircuitBreaker: process.env.ERROR_RECOVERY_ENABLE_CIRCUIT_BREAKER !== 'false',
  enableDeadLetterQueue: process.env.ERROR_RECOVERY_ENABLE_DLQ !== 'false',
  enablePatternAnalysis: process.env.ERROR_RECOVERY_ENABLE_PATTERN_ANALYSIS !== 'false',
  enableAutoRecovery: process.env.ERROR_RECOVERY_ENABLE_AUTO_RECOVERY !== 'false',// Monitoring and alertingenableMetrics: process.env.ERROR_RECOVERY_ENABLE_METRICS !== 'false',
  enableAlerting: process.env.ERROR_RECOVERY_ENABLE_ALERTING !== 'false',
  alertingWebhookUrl: process.env.ERROR_RECOVERY_ALERTING_WEBHOOK_URL,
  metricsRetentionDays: parseInt(process.env.ERROR_RECOVERY_METRICS_RETENTION_DAYS || '30'),},});

/**
 * Global error recovery module providing enterprise-grade error handling
 */
@Global()
@Module({
  imports: [
    ConfigModule.forFeature(errorRecoveryConfig),
  ],
  providers: [
    // Core error recovery services
    ErrorClassifier,
    RetryManager,
    FailureAnalyzer,
    RecoveryStrategyManager,
    DeadLetterQueueService,
    JobErrorRecoveryService,

    // Configuration providers
    {
      provide: 'ERROR_RECOVERY_CONFIG',
  useFactory: () => errorRecoveryConfig().errorRecovery,},

    // Health check provider
    {
      provide: 'ERROR_RECOVERY_HEALTH_INDICATOR',
  useFactory: (service: JobErrorRecoveryService) => ({isHealthy: () => {
          const health = service.getHealthStatus();
          return health.status === 'healthy';},
  getHealthDetails: () => service.getHealthStatus(),
      }),
      inject: [JobErrorRecoveryService],
    },
  ],
  exports: [
    // Export main service for use in other modules
    JobErrorRecoveryService,

    // Export individual components for fine-grained control
    ErrorClassifier,
    RetryManager,
    FailureAnalyzer,
    RecoveryStrategyManager,
    DeadLetterQueueService,

    // Export configuration and health indicator
    'ERROR_RECOVERY_CONFIG','ERROR_RECOVERY_HEALTH_INDICATOR',],})
export class JobErrorRecoveryModule {
  /**
   * Configure module with custom settings
   */
  static forRoot(options?: {
    maxRetries?: number;
    baseRetryDelay?: number;
    circuitBreakerThreshold?: number;
    enableFeatures?: {
      circuitBreaker?: boolean;
      deadLetterQueue?: boolean;
      patternAnalysis?: boolean;
      autoRecovery?: boolean;
    };
  }) {
    return {
      module: JobErrorRecoveryModule,
      providers: [
        {
          provide: 'ERROR_RECOVERY_CUSTOM_CONFIG',
  useValue: options || {},},
      ],
    };
  }

  /**
   * Configure module for specific environments
   */
  static forEnvironment(environment: 'development' | 'testing' | 'staging' | 'production') {
    const configs = {
      development: {
        maxRetries: 2,
        baseRetryDelay: 500,
        circuitBreakerThreshold: 3,
        enableFeatures: {
          circuitBreaker: true,
          deadLetterQueue: true,
          patternAnalysis: true,
          autoRecovery: true,
        },
      },
      testing: {
        maxRetries: 1,
        baseRetryDelay: 100,
        circuitBreakerThreshold: 2,
        enableFeatures: {
          circuitBreaker: false,
          deadLetterQueue: false,
          patternAnalysis: false,
          autoRecovery: true,
        },
      },
      staging: {
        maxRetries: 3,
        baseRetryDelay: 1000,
        circuitBreakerThreshold: 5,
        enableFeatures: {
          circuitBreaker: true,
          deadLetterQueue: true,
          patternAnalysis: true,
          autoRecovery: true,
        },
      },
      production: {
        maxRetries: 5,
        baseRetryDelay: 2000,
        circuitBreakerThreshold: 10,
        enableFeatures: {
          circuitBreaker: true,
          deadLetterQueue: true,
          patternAnalysis: true,
          autoRecovery: true,
        },
      },
    };

    return this.forRoot(configs[environment]);
  }
}