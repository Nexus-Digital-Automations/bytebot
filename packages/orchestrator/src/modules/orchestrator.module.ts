/**
 * Orchestrator Module - Enterprise NestJS Module Configuration
 *
 * Comprehensive NestJS module for Parlant-integrated orchestration with
 * dependency injection, configuration management, and service registration.
 *
 * @module OrchestratorModule
 * @version 1.0.0
 * @author AIgent Orchestrator Team
 */

import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Core services
import { ParlantOrchestratorService } from '../services/parlant-orchestrator.service';

// Controllers
import { OrchestratorController } from '../controllers/orchestrator.controller';

// Additional services
import { OrchestratorCacheService } from '../services/orchestrator-cache.service';
import { ServiceDiscoveryService } from '../services/service-discovery.service';
import { ApprovalWorkflowService } from '../services/approval-workflow.service';
import { RiskAssessmentService } from '../services/risk-assessment.service';
import { ComplianceAuditService } from '../services/compliance-audit.service';
import { PerformanceMonitoringService } from '../services/performance-monitoring.service';

// Configuration interfaces
import { 
  OrchestratorConfiguration, 
  LogLevel, 
  ServiceDiscoveryType,
  CacheProvider,
  EvictionPolicy,
  AuthProvider,
  AuthorizationModel,
  PolicyEngine,
  AuditEventType,
  AuditStorageType
} from '../types/orchestrator.types';

// Additional local types (none needed - using imported enums)

export interface OrchestratorModuleOptions {
  /** Global configuration */
  configuration?: Partial<OrchestratorConfiguration>;
  /** Enable global module registration */
  isGlobal?: boolean;
  /** Custom service implementations */
  customServices?: Provider[];
}

@Global()
@Module({})
export class OrchestratorModule {
  /**
   * Register orchestrator module with configuration
   */
  static register(options: OrchestratorModuleOptions = {}): DynamicModule {
    const providers = [
      // Core services
      ParlantOrchestratorService,
      OrchestratorCacheService,
      ServiceDiscoveryService,
      ApprovalWorkflowService,
      RiskAssessmentService,
      ComplianceAuditService,
      PerformanceMonitoringService,
      
      // Configuration provider
      {
        provide: 'ORCHESTRATOR_CONFIG',
        useFactory: (configService: ConfigService) => {
          const config = {
            // Default configuration
            performance: {
              defaultStepTimeoutMs: 30000,
              defaultWorkflowTimeoutMs: 300000,
              maxConcurrentExecutions: 100,
              threadPoolSize: 10,
              memoryLimits: {
                maxHeapSizeMb: 1024,
                contextCacheSizeMb: 256,
                resultCacheSizeMb: 512
              }
            },
            serviceRegistry: {
              discoveryType: ServiceDiscoveryType.STATIC,
              healthCheckIntervalMs: 30000,
              serviceTimeoutMs: 5000
            },
            parlantIntegration: {
              enabled: true,
              apiEndpoint: configService.get('PARLANT_API_ENDPOINT', 'http://localhost:8080'),
              websocketEndpoint: configService.get('PARLANT_WS_ENDPOINT', 'ws://localhost:8080/ws'),
              apiKey: configService.get('PARLANT_API_KEY', 'test-key'),
              connectionTimeoutMs: 10000,
              requestTimeoutMs: 5000,
              retryConfig: {
                maxAttempts: 3,
                baseDelayMs: 1000,
                backoffMultiplier: 2,
                maxDelayMs: 10000,
                jitterMs: 100
              }
            },
            caching: {
              enabled: true,
              provider: (configService.get('ORCHESTRATOR_CACHE_PROVIDER', 'memory') as string) === 'memory' ? CacheProvider.MEMORY : 
                       (configService.get('ORCHESTRATOR_CACHE_PROVIDER', 'memory') as string) === 'redis' ? CacheProvider.REDIS : CacheProvider.MEMORY,
              defaultTtlMs: 300000,
              sizeLimits: {
                maxEntries: 10000,
                maxMemoryMb: 256,
                evictionPolicy: EvictionPolicy.LRU
              }
            },
            monitoring: {
              enabled: true,
              metricsIntervalMs: 60000,
              traceSamplingRate: 0.1,
              logLevel: (configService.get('LOG_LEVEL', 'info') as string) === 'info' ? LogLevel.INFO : 
                       (configService.get('LOG_LEVEL', 'info') as string) === 'debug' ? LogLevel.DEBUG : 
                       (configService.get('LOG_LEVEL', 'info') as string) === 'warn' ? LogLevel.WARN : 
                       (configService.get('LOG_LEVEL', 'info') as string) === 'error' ? LogLevel.ERROR : LogLevel.INFO,
              exportConfig: {
                customHandlers: []
              }
            },
            security: {
              encryption: {
                algorithm: 'AES-256-GCM',
                keyRotationDays: 30,
                encryptAtRest: true,
                encryptInTransit: true
              },
              authentication: {
                provider: AuthProvider.JWT,
                tokenExpirationMs: 3600000,
                refreshTokenEnabled: true,
                mfaEnabled: false
              },
              authorization: {
                model: AuthorizationModel.RBAC,
                rbacEnabled: true,
                abacEnabled: false,
                policyEngine: PolicyEngine.CUSTOM
              },
              audit: {
                enabled: true,
                retentionDays: 90,
                eventTypes: [AuditEventType.EXECUTION_START, AuditEventType.EXECUTION_END],
                storage: {
                  type: AuditStorageType.DATABASE,
                  encrypted: true,
                  compressed: true
                }
              }
            },
            // Merge with provided options
            ...options.configuration
          };
          
          return config;
        },
        inject: [ConfigService]
      },
      
      // Add any custom services
      ...(options.customServices || [])
    ];

    return {
      module: OrchestratorModule,
      imports: [
        ConfigModule,
        EventEmitterModule.forRoot({
          // EventEmitter configuration
          wildcard: true,
          delimiter: '.',
          newListener: false,
          maxListeners: 20,
          verboseMemoryLeak: true,
          ignoreErrors: false
        })
      ],
      providers,
      controllers: [OrchestratorController],
      exports: [
        ParlantOrchestratorService,
        OrchestratorCacheService,
        ServiceDiscoveryService,
        ApprovalWorkflowService,
        RiskAssessmentService,
        ComplianceAuditService,
        PerformanceMonitoringService,
        'ORCHESTRATOR_CONFIG'
      ],
      global: options.isGlobal ?? true
    };
  }

  /**
   * Register async orchestrator module with factory
   */
  static registerAsync(options: {
    imports?: unknown[];
    useFactory?: (...args: unknown[]) => Promise<OrchestratorModuleOptions> | OrchestratorModuleOptions;
    inject?: unknown[];
    isGlobal?: boolean;
  }): DynamicModule {
    return {
      module: OrchestratorModule,
      imports: [
        ConfigModule,
        EventEmitterModule.forRoot({
          wildcard: true,
          delimiter: '.',
          newListener: false,
          maxListeners: 20,
          verboseMemoryLeak: true,
          ignoreErrors: false
        }),
        ...(options.imports as any[] || [])
      ],
      providers: [
        // Async configuration provider
        {
          provide: 'ORCHESTRATOR_CONFIG',
          useFactory: async (...args: unknown[]) => {
            if (options.useFactory) {
              const moduleOptions = await options.useFactory(...args);
              return this.buildConfiguration(moduleOptions);
            }
            return this.buildConfiguration({});
          },
          inject: (options.inject as any[]) || []
        },
        
        // Core services
        ParlantOrchestratorService,
        OrchestratorCacheService,
        ServiceDiscoveryService,
        ApprovalWorkflowService,
        RiskAssessmentService,
        ComplianceAuditService,
        PerformanceMonitoringService
      ],
      controllers: [OrchestratorController],
      exports: [
        ParlantOrchestratorService,
        OrchestratorCacheService,
        ServiceDiscoveryService,
        ApprovalWorkflowService,
        RiskAssessmentService,
        ComplianceAuditService,
        PerformanceMonitoringService,
        'ORCHESTRATOR_CONFIG'
      ],
      global: options.isGlobal ?? true
    };
  }

  private static buildConfiguration(options: OrchestratorModuleOptions): OrchestratorConfiguration {
    return {
      performance: {
        defaultStepTimeoutMs: 30000,
        defaultWorkflowTimeoutMs: 300000,
        maxConcurrentExecutions: 100,
        threadPoolSize: 10,
        memoryLimits: {
          maxHeapSizeMb: 1024,
          contextCacheSizeMb: 256,
          resultCacheSizeMb: 512
        }
      },
      serviceRegistry: {
        discoveryType: ServiceDiscoveryType.STATIC,
        healthCheckIntervalMs: 30000,
        serviceTimeoutMs: 5000
      },
      parlantIntegration: {
        enabled: true,
        apiEndpoint: process.env.PARLANT_API_ENDPOINT || 'http://localhost:8080',
        websocketEndpoint: process.env.PARLANT_WS_ENDPOINT || 'ws://localhost:8080/ws',
        apiKey: process.env.PARLANT_API_KEY || 'test-key',
        connectionTimeoutMs: 10000,
        requestTimeoutMs: 5000,
        retryConfig: {
          maxAttempts: 3,
          baseDelayMs: 1000,
          backoffMultiplier: 2,
          maxDelayMs: 10000,
          jitterMs: 100
        }
      },
      caching: {
        enabled: true,
        provider: process.env.ORCHESTRATOR_CACHE_PROVIDER === 'redis' ? CacheProvider.REDIS : CacheProvider.MEMORY,
        defaultTtlMs: 300000,
        sizeLimits: {
          maxEntries: 10000,
          maxMemoryMb: 256,
          evictionPolicy: EvictionPolicy.LRU
        }
      },
      monitoring: {
        enabled: true,
        metricsIntervalMs: 60000,
        traceSamplingRate: 0.1,
        logLevel: process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : 
                 process.env.LOG_LEVEL === 'warn' ? LogLevel.WARN : 
                 process.env.LOG_LEVEL === 'error' ? LogLevel.ERROR : LogLevel.INFO,
        exportConfig: {
          customHandlers: []
        }
      },
      security: {
        encryption: {
          algorithm: 'AES-256-GCM',
          keyRotationDays: 30,
          encryptAtRest: true,
          encryptInTransit: true
        },
        authentication: {
          provider: AuthProvider.JWT,
          tokenExpirationMs: 3600000,
          refreshTokenEnabled: true,
          mfaEnabled: false
        },
        authorization: {
          model: AuthorizationModel.RBAC,
          rbacEnabled: true,
          abacEnabled: false,
          policyEngine: PolicyEngine.CUSTOM
        },
        audit: {
          enabled: true,
          retentionDays: 90,
          eventTypes: [AuditEventType.EXECUTION_START, AuditEventType.EXECUTION_END],
          storage: {
            type: AuditStorageType.DATABASE,
            encrypted: true,
            compressed: true
          }
        }
      },
      // Merge with provided options
      ...options.configuration
    };
  }
}