/**
 * Parlant Streaming Integration Module
 *
 * Comprehensive NestJS module for Parlant Phase 1 WebSocket streaming integration.
 * Orchestrates all components for enterprise-grade real-time conversational AI
 * validation workflows with complete dependency injection and configuration management.
 *
 * Features:
 * - Complete dependency injection setup for all streaming components
 * - Configuration management with environment-based settings
 * - Service integration and orchestration
 * - Health monitoring and metrics collection
 * - Security and authentication integration
 * - Performance optimization and caching
 * - Error handling and resilience patterns
 * - Comprehensive logging and audit trails
 *
 * @module ParlantStreamingIntegrationModule
 * @version 1.0.0
 * @author AIgent Integration Team
 */

import { Module, Logger } from '@nestjs/common';import { ConfigModule, ConfigService } from '@nestjs/config';import { JwtModule } from '@nestjs/jwt';import { CacheModule } from '@nestjs/cache-manager';import { HealthModule } from '@nestjs/terminus';import { ScheduleModule } from '@nestjs/schedule';import { EventEmitterModule } from '@nestjs/event-emitter';// WebSocket Infrastructure Servicesimport { ParlantWebSocketStreamingBridgeService } from '../common/websocket/parlant-websocket-streaming-bridge.service';import { ConversationalWebSocketBridgeService } from '../common/websocket/conversational-websocket-bridge.service';// Gateway and Controllersimport { ParlantStreamingValidationGateway } from './parlant-streaming-validation.gateway';// Core Parlant Services (assuming these exist)import { ParlantIntegrationService } from './parlant-integration.service';import { ParlantConfigurationService } from './parlant-configuration.service';// Health and Monitoring Servicesimport { ParlantStreamingHealthService } from './health/parlant-streaming-health.service';import { ParlantStreamingMetricsService } from './metrics/parlant-streaming-metrics.service';// Security and Authentication Servicesimport { ParlantStreamingAuthService } from './auth/parlant-streaming-auth.service';import { ParlantStreamingSecurityService } from './security/parlant-streaming-security.service';// Validation and Processing Servicesimport { ParlantValidationProcessorService } from './validation/parlant-validation-processor.service';import { ParlantStreamMultiplexingService } from './streaming/parlant-stream-multiplexing.service';// Utility and Helper Servicesimport { ParlantStreamingUtilsService } from './utils/parlant-streaming-utils.service';import { ParlantAuditTrailService } from './audit/parlant-audit-trail.service';/*** Configuration factory for Parlant streaming integration
 */
export const createParlantStreamingConfig = () => ({
  // WebSocket Configuration
  websocket: {
    enabled: process.env.PARLANT_STREAMING_ENABLED !== 'false',port: parseInt(process.env.PARLANT_STREAMING_PORT || '8082', 10),namespace: process.env.PARLANT_STREAMING_NAMESPACE || '/parlant-streaming',cors: {origin: process.env.PARLANT_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],credentials: true,},
    compression: {
      enabled: process.env.PARLANT_COMPRESSION_ENABLED !== 'false',threshold: parseInt(process.env.PARLANT_COMPRESSION_THRESHOLD || '1024', 10),level: parseInt(process.env.PARLANT_COMPRESSION_LEVEL || '6', 10),},security: {
      requireAuth: process.env.PARLANT_REQUIRE_AUTH !== 'false',requireHttps: process.env.PARLANT_REQUIRE_HTTPS === 'true',encryptionEnabled: process.env.PARLANT_ENCRYPTION_ENABLED !== 'false',rateLimitEnabled: process.env.PARLANT_RATE_LIMIT_ENABLED !== 'false',},},

  // Performance Configuration
  performance: {
    maxConcurrentSessions: parseInt(process.env.PARLANT_MAX_CONCURRENT_SESSIONS || '1000', 10),maxStreamsPerSession: parseInt(process.env.PARLANT_MAX_STREAMS_PER_SESSION || '50', 10),targetMessageLatency: parseInt(process.env.PARLANT_TARGET_MESSAGE_LATENCY || '50', 10),targetValidationLatency: parseInt(process.env.PARLANT_TARGET_VALIDATION_LATENCY || '500', 10),heartbeatInterval: parseInt(process.env.PARLANT_HEARTBEAT_INTERVAL || '30000', 10),sessionTimeout: parseInt(process.env.PARLANT_SESSION_TIMEOUT || '900000', 10),streamTimeout: parseInt(process.env.PARLANT_STREAM_TIMEOUT || '300000', 10),},// Validation Configuration
  validation: {
    defaultTimeout: parseInt(process.env.PARLANT_VALIDATION_TIMEOUT || '30000', 10),maxRetries: parseInt(process.env.PARLANT_VALIDATION_MAX_RETRIES || '3', 10),requireUserConfirmation: process.env.PARLANT_REQUIRE_USER_CONFIRMATION === 'true',autoApprovalThreshold: parseInt(process.env.PARLANT_AUTO_APPROVAL_THRESHOLD || '25', 10),escalationThreshold: parseInt(process.env.PARLANT_ESCALATION_THRESHOLD || '75', 10),},// Security Configuration
  security: {
    authTokenExpiry: process.env.PARLANT_AUTH_TOKEN_EXPIRY || '24h',maxLoginAttempts: parseInt(process.env.PARLANT_MAX_LOGIN_ATTEMPTS || '5', 10),lockoutDuration: parseInt(process.env.PARLANT_LOCKOUT_DURATION || '900000', 10),auditEnabled: process.env.PARLANT_AUDIT_ENABLED !== 'false',auditLevel: process.env.PARLANT_AUDIT_LEVEL || 'standard',},// Monitoring Configuration
  monitoring: {
    metricsEnabled: process.env.PARLANT_METRICS_ENABLED !== 'false',metricsInterval: parseInt(process.env.PARLANT_METRICS_INTERVAL || '60000', 10),healthCheckEnabled: process.env.PARLANT_HEALTH_CHECK_ENABLED !== 'false',healthCheckInterval: parseInt(process.env.PARLANT_HEALTH_CHECK_INTERVAL || '30000', 10),alertingEnabled: process.env.PARLANT_ALERTING_ENABLED !== 'false',},// Integration Configuration
  integration: {
    parlantApiUrl: process.env.PARLANT_API_URL || 'http://localhost:8000',parlantApiKey: process.env.PARLANT_API_KEY || '',parlantWebSocketUrl: process.env.PARLANT_WS_URL || 'ws://localhost:8000/ws/aigent',maxApiRetries: parseInt(process.env.PARLANT_MAX_API_RETRIES || '3', 10),apiTimeout: parseInt(process.env.PARLANT_API_TIMEOUT || '10000', 10),},// Caching Configuration
  caching: {
    enabled: process.env.PARLANT_CACHING_ENABLED !== 'false',ttl: parseInt(process.env.PARLANT_CACHE_TTL || '300000', 10), // 5 minutesmaxSize: parseInt(process.env.PARLANT_CACHE_MAX_SIZE || '1000', 10),redisUrl: process.env.PARLANT_REDIS_URL,},
});

/**
 * Parlant Streaming Integration Module
 *
 * Complete module orchestrating all Parlant streaming components with
 * enterprise-grade configuration, security, and monitoring capabilities.
 */
@Module({
  imports: [
    // Core NestJS modules
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [createParlantStreamingConfig],
    }),

    // JWT Authentication
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'parlant-streaming-secret',signOptions: {expiresIn: configService.get<string>('security.authTokenExpiry') || '24h',issuer: 'parlant-streaming-gateway',audience: 'parlant-clients',},verifyOptions: {
          issuer: 'parlant-streaming-gateway',audience: 'parlant-clients',},}),
      inject: [ConfigService],
    }),

    // Caching
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('caching.redisUrl');if (redisUrl) {// Redis cache configuration
          const redis = await import('cache-manager-redis-store');return {store: redis.redisStore,
            url: redisUrl,
            ttl: configService.get<number>('caching.ttl'),max: configService.get<number>('caching.maxSize'),};} else {
          // In-memory cache configuration
          return {
            ttl: configService.get<number>('caching.ttl'),max: configService.get<number>('caching.maxSize'),};}
      },
      inject: [ConfigService],
      isGlobal: true,
    }),

    // Health monitoring
    HealthModule,

    // Task scheduling
    ScheduleModule.forRoot(),

    // Event handling
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',newListener: false,removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],

  providers: [
    // Core WebSocket Infrastructure Services
    ParlantWebSocketStreamingBridgeService,
    ConversationalWebSocketBridgeService,

    // Core Parlant Services
    {
      provide: ParlantIntegrationService,
      useFactory: (configService: ConfigService) => {
        return new ParlantIntegrationService(configService);
      },
      inject: [ConfigService],
    },
    {
      provide: ParlantConfigurationService,
      useFactory: (configService: ConfigService) => {
        return new ParlantConfigurationService(configService);
      },
      inject: [ConfigService],
    },

    // Health and Monitoring Services
    {
      provide: ParlantStreamingHealthService,
      useFactory: (
        configService: ConfigService,
        bridgeService: ParlantWebSocketStreamingBridgeService,
      ) => {
        return new ParlantStreamingHealthService(configService, bridgeService);
      },
      inject: [ConfigService, ParlantWebSocketStreamingBridgeService],
    },
    {
      provide: ParlantStreamingMetricsService,
      useFactory: (
        configService: ConfigService,
        bridgeService: ParlantWebSocketStreamingBridgeService,
      ) => {
        return new ParlantStreamingMetricsService(configService, bridgeService);
      },
      inject: [ConfigService, ParlantWebSocketStreamingBridgeService],
    },

    // Security and Authentication Services
    {
      provide: ParlantStreamingAuthService,
      useFactory: (configService: ConfigService) => {
        return new ParlantStreamingAuthService(configService);
      },
      inject: [ConfigService],
    },
    {
      provide: ParlantStreamingSecurityService,
      useFactory: (configService: ConfigService) => {
        return new ParlantStreamingSecurityService(configService);
      },
      inject: [ConfigService],
    },

    // Validation and Processing Services
    {
      provide: ParlantValidationProcessorService,
      useFactory: (
        configService: ConfigService,
        integrationService: ParlantIntegrationService,
      ) => {
        return new ParlantValidationProcessorService(configService, integrationService);
      },
      inject: [ConfigService, ParlantIntegrationService],
    },
    {
      provide: ParlantStreamMultiplexingService,
      useFactory: (
        configService: ConfigService,
        bridgeService: ParlantWebSocketStreamingBridgeService,
      ) => {
        return new ParlantStreamMultiplexingService(configService, bridgeService);
      },
      inject: [ConfigService, ParlantWebSocketStreamingBridgeService],
    },

    // Utility and Helper Services
    {
      provide: ParlantStreamingUtilsService,
      useFactory: (configService: ConfigService) => {
        return new ParlantStreamingUtilsService(configService);
      },
      inject: [ConfigService],
    },
    {
      provide: ParlantAuditTrailService,
      useFactory: (configService: ConfigService) => {
        return new ParlantAuditTrailService(configService);
      },
      inject: [ConfigService],
    },

    // Logger for module-level logging
    {
      provide: 'ParlantStreamingLogger',useFactory: () => {return new Logger('ParlantStreamingIntegration');},},
  ],

  controllers: [
    // WebSocket Gateway
    ParlantStreamingValidationGateway,
  ],

  exports: [
    // Export core services for use in other modules
    ParlantWebSocketStreamingBridgeService,
    ConversationalWebSocketBridgeService,
    ParlantIntegrationService,
    ParlantConfigurationService,
    ParlantStreamingHealthService,
    ParlantStreamingMetricsService,
    ParlantValidationProcessorService,
    ParlantStreamMultiplexingService,
    ParlantStreamingUtilsService,
    ParlantAuditTrailService,

    // Export authentication and security services
    ParlantStreamingAuthService,
    ParlantStreamingSecurityService,
  ],
})
export class ParlantStreamingIntegrationModule {
  private readonly logger = new Logger(ParlantStreamingIntegrationModule.name);

  constructor(private readonly configService: ConfigService) {
    this.logger.log('🚀 Parlant Streaming Integration Module initialized');this.logModuleConfiguration();}

  /**
   * Log module configuration on startup
   */
  private logModuleConfiguration(): void {
    const config = this.configService.get('parlantStreamingConfig') || createParlantStreamingConfig();this.logger.log('📋 Parlant Streaming Configuration:', {websocketEnabled: config.websocket?.enabled,websocketPort: config.websocket?.port,
      maxConcurrentSessions: config.performance?.maxConcurrentSessions,
      compressionEnabled: config.websocket?.compression?.enabled,
      securityEnabled: config.websocket?.security?.requireAuth,
      monitoringEnabled: config.monitoring?.metricsEnabled,
      cachingEnabled: config.caching?.enabled,
    });

    // Log security status
    if (config.websocket?.security?.requireAuth) {
      this.logger.log('🔐 Security features enabled:', {authentication: config.websocket.security.requireAuth,httpsRequired: config.websocket.security.requireHttps,
        encryption: config.websocket.security.encryptionEnabled,
        rateLimit: config.websocket.security.rateLimitEnabled,
        auditTrail: config.security?.auditEnabled,
      });
    }

    // Log performance targets
    this.logger.log('🎯 Performance targets configured:', {
      messageLatency: `${config.performance?.targetMessageLatency}ms`,validationLatency: `${config.performance?.targetValidationLatency}ms`,maxSessions: config.performance?.maxConcurrentSessions,maxStreamsPerSession: config.performance?.maxStreamsPerSession,
      heartbeatInterval: `${config.performance?.heartbeatInterval}ms`,
    });

    // Log integration endpoints
    if (config.integration?.parlantApiUrl) {
      this.logger.log('🔗 Parlant integration configured:', {
        apiUrl: config.integration.parlantApiUrl,
        websocketUrl: config.integration.parlantWebSocketUrl,
        apiTimeout: `${config.integration.apiTimeout}ms`,
        maxRetries: config.integration.maxApiRetries,
      });
    }

    // Log monitoring configuration
    if (config.monitoring?.metricsEnabled) {
      this.logger.log('📊 Monitoring features enabled:', {
        metrics: config.monitoring.metricsEnabled,
        metricsInterval: `${config.monitoring.metricsInterval}ms`,
        healthChecks: config.monitoring.healthCheckEnabled,
        alerting: config.monitoring.alertingEnabled,
      });
    }

    this.logger.log('✅ Parlant Streaming Integration Module ready for connections');}/**
   * Called when the module is being destroyed
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('🔄 Parlant Streaming Integration Module shutting down...');// Cleanup logic will be handled by individual servicesthis.logger.log('✅ Parlant Streaming Integration Module shutdown complete');
  }
}

/**
 * Helper function to create a dynamic module with custom configuration
 */
export function createParlantStreamingModule(customConfig?: Partial<ReturnType<typeof createParlantStreamingConfig>>) {
  return {
    module: ParlantStreamingIntegrationModule,
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        cache: true,
        expandVariables: true,
        load: [() => ({ ...createParlantStreamingConfig(), ...customConfig })],
      }),
    ],
  };
}

/**
 * Export configuration factory for external use
 */
export { createParlantStreamingConfig };

/**
 * Export the module as default
 */
export default ParlantStreamingIntegrationModule;