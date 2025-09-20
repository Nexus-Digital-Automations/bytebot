/**
 * PARLANT Quality Gates Framework - Main Export Index
 *
 * Comprehensive quality gate system for PARLANT database function wrapping.
 * Provides automated validation, monitoring, rollback, and approval workflows
 * with enterprise-grade compliance and audit capabilities.
 *
 * @fileoverview Main export index for quality gates framework
 * @version 1.0.0
 * @author Quality Gates Framework Agent
 * @created 2025-09-20
 */

// Core Types and Interfaces
export * from './core/quality-gate-types';
export * from './core/quality-gate-framework';

// Quality Gate Implementations
export * from './gates/performance-gate';
export * from './gates/security-gate';

// Rollback System
export * from './rollback/rollback-engine';

// Configuration System
export * from './config/quality-gates-config';

// Main Framework Service
export { QualityGateFrameworkService } from './core/quality-gate-framework';

// Gate Implementations
export { PerformanceQualityGate } from './gates/performance-gate';
export { SecurityQualityGate } from './gates/security-gate';

// Rollback Engine
export { RollbackEngine } from './rollback/rollback-engine';

// Configuration Factory
export { DefaultQualityGatesConfigFactory, ConfigurationValidator } from './config/quality-gates-config';

/**
 * Quality Gates Framework Version
 */
export const QUALITY_GATES_VERSION = '1.0.0';

/**
 * Quality Gates Framework Metadata
 */
export const QUALITY_GATES_METADATA = {
  name: 'PARLANT Quality Gates Framework',
  version: QUALITY_GATES_VERSION,
  description: 'Comprehensive quality gate system for PARLANT database function wrapping',
  author: 'Quality Gates Framework Agent',
  created: '2025-09-20',

  features: [
    'Performance validation with sub-1000ms response time requirements',
    'Security validation with zero critical vulnerability tolerance',
    'Test coverage validation with 95%+ requirements',
    'Function wrapper integrity validation',
    'Automated rollback mechanisms with multiple strategies',
    'Approval workflow automation for production deployments',
    'Enterprise compliance validation and audit systems',
    'Real-time monitoring and alerting',
    'Comprehensive configuration management',
    'Multi-environment support (dev, staging, production, test)'
  ],

  capabilities: {
    qualityGates: {
      performance: true,
      security: true,
      coverage: true,
      integrity: true,
      custom: true
    },

    rollback: {
      immediate: true,
      gradual: true,
      canary: true,
      blueGreen: true,
      manual: true
    },

    approval: {
      singleApproval: true,
      dualApproval: true,
      roleBasedApproval: true,
      autoApproval: true,
      escalation: true
    },

    compliance: {
      gdpr: true,
      hipaa: true,
      sox: true,
      pciDss: true,
      iso27001: true,
      nist: true,
      soc2: true
    },

    monitoring: {
      realTime: true,
      alerting: true,
      dashboards: true,
      auditTrails: true,
      reporting: true
    }
  },

  requirements: {
    node: '>=16.0.0',
    typescript: '>=4.5.0',
    nestjs: '>=8.0.0'
  },

  integrations: [
    'PARLANT Function Wrapper Framework',
    'Enterprise Authentication Systems',
    'CI/CD Pipelines',
    'Monitoring and Alerting Systems',
    'Compliance Management Tools'
  ]
} as const;

/**
 * Default Export - Framework Quick Access
 */
export default {
  // Core Services
  QualityGateFrameworkService,
  RollbackEngine,

  // Gate Implementations
  PerformanceQualityGate,
  SecurityQualityGate,

  // Configuration
  DefaultQualityGatesConfigFactory,
  ConfigurationValidator,

  // Metadata
  VERSION: QUALITY_GATES_VERSION,
  METADATA: QUALITY_GATES_METADATA
};