/**
 * Orchestrator Package - Main Export Index
 *
 * Comprehensive Parlant-integrated orchestration package for AIgent ecosystem
 * with enterprise-grade multi-service coordination, approval workflows, and
 * performance optimization.
 *
 * @module @aiagent/orchestrator
 * @version 1.0.0
 * @author AIgent Orchestrator Team
 */

// ===== CORE MODULE =====
export { OrchestratorModule } from './modules/orchestrator.module';

// ===== CORE SERVICES =====
export { ParlantOrchestratorService } from './services/parlant-orchestrator.service';
export { OrchestratorCacheService } from './services/orchestrator-cache.service';
export { ServiceDiscoveryService } from './services/service-discovery.service';
export { ApprovalWorkflowService } from './services/approval-workflow.service';
export { RiskAssessmentService } from './services/risk-assessment.service';
export { ComplianceAuditService } from './services/compliance-audit.service';
export { PerformanceMonitoringService } from './services/performance-monitoring.service';

// ===== CONTROLLERS =====
export { OrchestratorController } from './controllers/orchestrator.controller';

// ===== TYPES AND INTERFACES =====
export * from './types/orchestrator.types';

// ===== SERVICE-SPECIFIC TYPES =====
export type {
  ParlantOrchestrationRequest,
  ParlantOrchestrationResult,
  OrchestrationUserContext,
  OrchestrationExecutionOptions,
  OrchestrationPerformanceMetrics,
  OrchestrationAuditEntry
} from './services/parlant-orchestrator.service';

// Note: ConversationSummary and ApprovalOutcome are exported from orchestrator.types

export type {
  ServiceEndpoint
} from './services/service-discovery.service';

export type {
  RiskAssessment,
  RiskFactor
} from './services/risk-assessment.service';

export type {
  ComplianceReport,
  ComplianceFinding
} from './services/compliance-audit.service';

export type {
  PerformanceMetrics,
  PerformanceAlert
} from './services/performance-monitoring.service';

// ===== UTILITY EXPORTS =====
export const ORCHESTRATOR_VERSION = '1.0.0';

export const ORCHESTRATOR_FEATURES = [
  'parlant-integration',
  'multi-service-coordination',
  'approval-workflows',
  'risk-assessment',
  'compliance-auditing',
  'performance-monitoring',
  'real-time-metrics',
  'enterprise-security'
] as const;

export type OrchestratorFeature = typeof ORCHESTRATOR_FEATURES[number];

// ===== CONFIGURATION HELPERS =====
export const createDefaultOrchestratorConfig = () => ({
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
    discoveryType: 'static' as const,
    healthCheckIntervalMs: 30000,
    serviceTimeoutMs: 5000
  },
  parlantIntegration: {
    enabled: true,
    apiEndpoint: 'http://localhost:8080',
    websocketEndpoint: 'ws://localhost:8080/ws',
    apiKey: 'test-key',
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
    provider: 'memory' as const,
    defaultTtlMs: 300000,
    sizeLimits: {
      maxEntries: 10000,
      maxMemoryMb: 256,
      evictionPolicy: 'lru' as const
    }
  },
  monitoring: {
    enabled: true,
    metricsIntervalMs: 60000,
    traceSamplingRate: 0.1,
    logLevel: 'info' as const,
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
      provider: 'jwt' as const,
      tokenExpirationMs: 3600000,
      refreshTokenEnabled: true,
      mfaEnabled: false
    },
    authorization: {
      model: 'rbac' as const,
      rbacEnabled: true,
      abacEnabled: false,
      policyEngine: 'custom' as const
    },
    audit: {
      enabled: true,
      retentionDays: 90,
      eventTypes: ['execution_start' as const, 'execution_end' as const],
      storage: {
        type: 'database' as const,
        encrypted: true,
        compressed: true
      }
    }
  }
});

// ===== PACKAGE METADATA =====
export const PACKAGE_INFO = {
  name: '@aiagent/orchestrator',
  version: ORCHESTRATOR_VERSION,
  description: 'Parlant-integrated orchestrator for enterprise multi-service coordination',
  keywords: [
    'orchestrator',
    'parlant',
    'aiagent',
    'coordination',
    'workflow',
    'validation',
    'enterprise'
  ],
  author: 'AIgent Development Team',
  license: 'MIT'
} as const;