/**
 * Browser Orchestration Security Decorators
 *
 * Comprehensive decorator collection for securing browser orchestration API endpoints
 * with advanced security controls, validation, and monitoring capabilities.
 *
 * Features:
 * - Orchestration-specific security level enforcement
 * - Multi-agent operation authorization
 * - Resource allocation and monitoring
 * - Advanced rate limiting for distributed operations
 * - Compliance and audit logging
 * - Emergency orchestration controls
 * - Cross-agent communication security
 *
 * Decorator Categories:
 * - Security Level Decorators: Define orchestration security requirements
 * - Resource Control Decorators: Manage resource allocation and limits
 * - Rate Limiting Decorators: Control orchestration operation frequency
 * - Compliance Decorators: Enforce regulatory compliance requirements
 * - Monitoring Decorators: Enable comprehensive operation monitoring
 * - Combined Security Decorators: Pre-configured security combinations
 *
 * @module OrchestrationSecurityDecorators
 * @version 1.0.0
 * @author Specialized API Security & Validation Agent
 * @since Browser Orchestration Security Implementation
 */

import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';import { ApiBearerAuth, ApiSecurity, ApiResponse, ApiOperation } from '@nestjs/swagger';import { UserRole, Permission } from '@bytebot/shared';// Import orchestration guard and typesimport { BrowserOrchestrationSecurityGuard } from '../guards/browser-orchestration-security.guard';import {OrchestrationSecurityLevel,
  OrchestrationRiskLevel,
  ResourceSecurityContext,
  OrchestrationRateLimit,
} from '../guards/browser-orchestration-security.guard';// Import existing browser security decorators for extensionimport {
  BrowserAuth,
  BrowserRoles,
  BrowserPermissions,
  BrowserValidation,
  BrowserAuditLog,
  BrowserSessionRequired,
} from '../../browser/decorators/security.decorators';/*** Orchestration operation types for security classification
 */
export enum OrchestrationOperationType {
  CREATE = 'create',COORDINATE = 'coordinate',MONITOR = 'monitor',SCALE = 'scale',TERMINATE = 'terminate',EMERGENCY = 'emergency',}/**
 * Orchestration compliance requirements
 */
export enum OrchestrationCompliance {
  SOC2 = 'soc2',GDPR = 'gdpr',HIPAA = 'hipaa',PCI_DSS = 'pci_dss',ISO_27001 = 'iso_27001',}/**
 * Resource allocation strategies
 */
export enum ResourceAllocationStrategy {
  CONSERVATIVE = 'conservative',BALANCED = 'balanced',AGGRESSIVE = 'aggressive',CUSTOM = 'custom',}/**
 * Monitoring levels for orchestration operations
 */
export enum OrchestrationMonitoringLevel {
  BASIC = 'basic',STANDARD = 'standard',ENHANCED = 'enhanced',COMPREHENSIVE = 'comprehensive',REAL_TIME = 'real_time',}/**
 * Resource limit configuration
 */
export interface OrchestrationResourceConfig {
  maxAgents: number;
  maxSessions: number;
  maxMemoryGB: number;
  maxCpuCores: number;
  maxNetworkMBps: number;
  maxStorageGB: number;
  maxExecutionTimeMs: number;
  allocationStrategy: ResourceAllocationStrategy;
  enforceHardLimits: boolean;
  escalationThreshold: number;
}

/**
 * Orchestration monitoring configuration
 */
export interface OrchestrationMonitoringConfig {
  level: OrchestrationMonitoringLevel;
  realTimeAlerts: boolean;
  performanceMetrics: boolean;
  securityEvents: boolean;
  resourceTracking: boolean;
  agentCoordination: boolean;
  complianceLogging: boolean;
  retentionPeriodDays: number;
}

/**
 * Emergency orchestration configuration
 */
export interface EmergencyOrchestrationConfig {
  enabled: boolean;
  allowBypass: boolean;
  maxEmergencyAgents: number;
  maxEmergencyDuration: number;
  approvalRequired: boolean;
  auditLevel: 'standard' | 'enhanced' | 'comprehensive';notificationChannels: string[];}

// ===== METADATA KEYS =====

export const ORCHESTRATION_SECURITY_LEVEL_KEY = 'orchestration_security_level';export const ORCHESTRATION_RISK_LEVEL_KEY = 'orchestration_risk_level';export const ORCHESTRATION_OPERATION_TYPE_KEY = 'orchestration_operation_type';export const ORCHESTRATION_RESOURCE_CONFIG_KEY = 'orchestration_resource_config';export const ORCHESTRATION_RATE_LIMIT_KEY = 'orchestration_rate_limit';export const ORCHESTRATION_COMPLIANCE_KEY = 'orchestration_compliance';export const ORCHESTRATION_MONITORING_KEY = 'orchestration_monitoring';export const ORCHESTRATION_EMERGENCY_KEY = 'orchestration_emergency';export const ORCHESTRATION_AGENT_COORDINATION_KEY = 'orchestration_agent_coordination';export const ORCHESTRATION_RESOURCE_ISOLATION_KEY = 'orchestration_resource_isolation';// ===== SECURITY LEVEL DECORATORS =====/**
 * Set orchestration security level
 */
export const OrchestrationSecurityLevel = (level: OrchestrationSecurityLevel) => {
  return applyDecorators(
    SetMetadata(ORCHESTRATION_SECURITY_LEVEL_KEY, level),
    BrowserAuth(),
    UseGuards(BrowserOrchestrationSecurityGuard),
    ApiSecurity('orchestration-security'),
    ApiOperation({
      summary: `Orchestration operation (Security Level: ${level})`,}),ApiResponse({
      status: 403,
      description: `Forbidden - Operation requires ${level} security clearance`,}),);
};

/**
 * Set orchestration risk level
 */
export const OrchestrationRiskLevel = (level: OrchestrationRiskLevel) => {
  return applyDecorators(
    SetMetadata(ORCHESTRATION_RISK_LEVEL_KEY, level),
    ApiOperation({
      description: `Risk Level: ${level}`,}),);
};

/**
 * Define orchestration operation type
 */
export const OrchestrationOperationType = (type: OrchestrationOperationType) => {
  return applyDecorators(
    SetMetadata(ORCHESTRATION_OPERATION_TYPE_KEY, type),
    ApiOperation({
      tags: [`Orchestration-${type}`],}),);
};

// ===== RESOURCE CONTROL DECORATORS =====

/**
 * Configure orchestration resource limits
 */
export const OrchestrationResourceLimits = (config: OrchestrationResourceConfig) => {
  return applyDecorators(
    SetMetadata(ORCHESTRATION_RESOURCE_CONFIG_KEY, config),
    ApiOperation({
      description: `Max Agents: ${config.maxAgents}, Max Sessions: ${config.maxSessions}`,
    }),
    ApiResponse({
      status: 503,
      description: 'Service Unavailable - Resource limits exceeded',}),ApiResponse({
      status: 429,
      description: 'Too Many Requests - Resource allocation rate limit exceeded',}),);
};

/**
 * Conservative resource allocation for basic orchestration
 */
export const ConservativeResourceAllocation = () => {
  return OrchestrationResourceLimits({
    maxAgents: 5,
    maxSessions: 10,
    maxMemoryGB: 8,
    maxCpuCores: 4,
    maxNetworkMBps: 100,
    maxStorageGB: 20,
    maxExecutionTimeMs: 1800000, // 30 minutes
    allocationStrategy: ResourceAllocationStrategy.CONSERVATIVE,
    enforceHardLimits: true,
    escalationThreshold: 0.8,
  });
};

/**
 * Balanced resource allocation for standard orchestration
 */
export const BalancedResourceAllocation = () => {
  return OrchestrationResourceLimits({
    maxAgents: 15,
    maxSessions: 30,
    maxMemoryGB: 24,
    maxCpuCores: 8,
    maxNetworkMBps: 300,
    maxStorageGB: 50,
    maxExecutionTimeMs: 3600000, // 1 hour
    allocationStrategy: ResourceAllocationStrategy.BALANCED,
    enforceHardLimits: true,
    escalationThreshold: 0.85,
  });
};

/**
 * Aggressive resource allocation for high-performance orchestration
 */
export const AggressiveResourceAllocation = () => {
  return OrchestrationResourceLimits({
    maxAgents: 50,
    maxSessions: 100,
    maxMemoryGB: 64,
    maxCpuCores: 16,
    maxNetworkMBps: 1000,
    maxStorageGB: 200,
    maxExecutionTimeMs: 7200000, // 2 hours
    allocationStrategy: ResourceAllocationStrategy.AGGRESSIVE,
    enforceHardLimits: false,
    escalationThreshold: 0.9,
  });
};

/**
 * Enterprise resource allocation for critical orchestration
 */
export const EnterpriseResourceAllocation = () => {
  return OrchestrationResourceLimits({
    maxAgents: 100,
    maxSessions: 250,
    maxMemoryGB: 128,
    maxCpuCores: 32,
    maxNetworkMBps: 2000,
    maxStorageGB: 500,
    maxExecutionTimeMs: 14400000, // 4 hours
    allocationStrategy: ResourceAllocationStrategy.CUSTOM,
    enforceHardLimits: false,
    escalationThreshold: 0.95,
  });
};

// ===== RATE LIMITING DECORATORS =====

/**
 * Apply orchestration-specific rate limiting
 */
export const OrchestrationRateLimit = (config: OrchestrationRateLimit) => {
  return applyDecorators(
    SetMetadata(ORCHESTRATION_RATE_LIMIT_KEY, config),
    ApiResponse({
      status: 429,
      description: 'Too Many Requests - Orchestration rate limit exceeded',headers: {'X-Orchestration-RateLimit-Operations': {description: 'Operations limit per minute',schema: { type: 'integer' },},'X-Orchestration-RateLimit-Agents': {description: 'Agent allocation limit per hour',schema: { type: 'integer' },},'X-Orchestration-RateLimit-Reset': {description: 'Time when rate limit resets',schema: { type: 'integer' },
        },
      },
    }),
  );
};

/**
 * Standard rate limiting for regular orchestration operations
 */
export const StandardOrchestrationRateLimit = () => {
  return OrchestrationRateLimit({
    operationsPerMinute: 10,
    agentsPerHour: 100,
    resourcesPerDay: 2000,
    concurrentOperations: 5,
    burstAllowance: 3,
    cooldownPeriodMs: 120000, // 2 minutes
  });
};

/**
 * Strict rate limiting for high-risk orchestration operations
 */
export const StrictOrchestrationRateLimit = () => {
  return OrchestrationRateLimit({
    operationsPerMinute: 3,
    agentsPerHour: 50,
    resourcesPerDay: 500,
    concurrentOperations: 2,
    burstAllowance: 1,
    cooldownPeriodMs: 600000, // 10 minutes
  });
};

/**
 * Permissive rate limiting for admin orchestration operations
 */
export const PermissiveOrchestrationRateLimit = () => {
  return OrchestrationRateLimit({
    operationsPerMinute: 30,
    agentsPerHour: 500,
    resourcesPerDay: 10000,
    concurrentOperations: 15,
    burstAllowance: 10,
    cooldownPeriodMs: 60000, // 1 minute
  });
};

// ===== COMPLIANCE DECORATORS =====

/**
 * Enforce compliance requirements for orchestration
 */
export const OrchestrationCompliance = (...requirements: OrchestrationCompliance[]) => {
  return applyDecorators(
    SetMetadata(ORCHESTRATION_COMPLIANCE_KEY, requirements),
    ApiOperation({
      description: `Compliance: ${requirements.join(`, ')}',}),
    ApiResponse({
      status: 422,
      description: 'Unprocessable Entity - Compliance requirements not met',}),);
};

/**
 * SOC 2 compliance for orchestration operations
 */
export const SOC2OrchestrationCompliance = () => {
  return OrchestrationCompliance(OrchestrationCompliance.SOC2);
};

/**
 * GDPR compliance for orchestration operations
 */
export const GDPROrchestrationCompliance = () => {
  return OrchestrationCompliance(OrchestrationCompliance.GDPR);
};

/**
 * HIPAA compliance for orchestration operations
 */
export const HIPAAOrchestrationCompliance = () => {
  return OrchestrationCompliance(OrchestrationCompliance.HIPAA);
};

/**
 * Multi-compliance for critical orchestration operations
 */
export const CriticalOrchestrationCompliance = () => {
  return OrchestrationCompliance(
    OrchestrationCompliance.SOC2,
    OrchestrationCompliance.GDPR,
    OrchestrationCompliance.ISO_27001,
  );
};

// ===== MONITORING DECORATORS =====

/**
 * Configure orchestration monitoring
 */
export const OrchestrationMonitoring = (config: OrchestrationMonitoringConfig) => {
  return applyDecorators(
    SetMetadata(ORCHESTRATION_MONITORING_KEY, config),
    BrowserAuditLog({
      logLevel: config.level === OrchestrationMonitoringLevel.COMPREHENSIVE ? 'warn' : 'info',includeRequestBody: config.performanceMetrics,includeResponseBody: config.securityEvents,
    }),
  );
};

/**
 * Basic monitoring for simple orchestration operations
 */
export const BasicOrchestrationMonitoring = () => {
  return OrchestrationMonitoring({
    level: OrchestrationMonitoringLevel.BASIC,
    realTimeAlerts: false,
    performanceMetrics: true,
    securityEvents: true,
    resourceTracking: false,
    agentCoordination: false,
    complianceLogging: false,
    retentionPeriodDays: 30,
  });
};

/**
 * Enhanced monitoring for complex orchestration operations
 */
export const EnhancedOrchestrationMonitoring = () => {
  return OrchestrationMonitoring({
    level: OrchestrationMonitoringLevel.ENHANCED,
    realTimeAlerts: true,
    performanceMetrics: true,
    securityEvents: true,
    resourceTracking: true,
    agentCoordination: true,
    complianceLogging: true,
    retentionPeriodDays: 90,
  });
};

/**
 * Comprehensive monitoring for critical orchestration operations
 */
export const ComprehensiveOrchestrationMonitoring = () => {
  return OrchestrationMonitoring({
    level: OrchestrationMonitoringLevel.COMPREHENSIVE,
    realTimeAlerts: true,
    performanceMetrics: true,
    securityEvents: true,
    resourceTracking: true,
    agentCoordination: true,
    complianceLogging: true,
    retentionPeriodDays: 365,
  });
};

/**
 * Real-time monitoring for emergency orchestration operations
 */
export const RealTimeOrchestrationMonitoring = () => {
  return OrchestrationMonitoring({
    level: OrchestrationMonitoringLevel.REAL_TIME,
    realTimeAlerts: true,
    performanceMetrics: true,
    securityEvents: true,
    resourceTracking: true,
    agentCoordination: true,
    complianceLogging: true,
    retentionPeriodDays: 2555, // 7 years
  });
};

// ===== EMERGENCY ORCHESTRATION DECORATORS =====

/**
 * Configure emergency orchestration capabilities
 */
export const EmergencyOrchestration = (config: EmergencyOrchestrationConfig) => {
  return applyDecorators(
    SetMetadata(ORCHESTRATION_EMERGENCY_KEY, config),
    BrowserRoles(UserRole._ADMIN),
    BrowserPermissions(Permission.EMERGENCY_ORCHESTRATION),
    ApiOperation({
      summary: 'Emergency Orchestration Operation',description: 'High-priority orchestration with elevated privileges',}),ApiResponse({
      status: 403,
      description: 'Forbidden - Emergency orchestration privileges required',}),ApiResponse({
      status: 202,
      description: 'Accepted - Emergency orchestration initiated',}),);
};

/**
 * Standard emergency orchestration
 */
export const StandardEmergencyOrchestration = () => {
  return EmergencyOrchestration({
    enabled: true,
    allowBypass: false,
    maxEmergencyAgents: 25,
    maxEmergencyDuration: 3600000, // 1 hour
    approvalRequired: true,
    auditLevel: 'enhanced',notificationChannels: ['security', 'operations'],});};

/**
 * Critical emergency orchestration with bypass capabilities
 */
export const CriticalEmergencyOrchestration = () => {
  return EmergencyOrchestration({
    enabled: true,
    allowBypass: true,
    maxEmergencyAgents: 100,
    maxEmergencyDuration: 7200000, // 2 hours
    approvalRequired: false,
    auditLevel: 'comprehensive',notificationChannels: ['security', 'operations', 'executive'],});};

// ===== AGENT COORDINATION DECORATORS =====

/**
 * Require encrypted agent coordination
 */
export const EncryptedAgentCoordination = () => {
  return applyDecorators(
    SetMetadata(ORCHESTRATION_AGENT_COORDINATION_KEY, {
      encryptionRequired: true,
      protocol: 'TLS_1_3',certificateValidation: true,}),
    ApiSecurity('agent-coordination-encryption'),);};

/**
 * Require agent resource isolation
 */
export const AgentResourceIsolation = () => {
  return applyDecorators(
    SetMetadata(ORCHESTRATION_RESOURCE_ISOLATION_KEY, {
      isolationLevel: 'STRICT',crossAgentCommunication: 'RESTRICTED',sharedResourceAccess: 'DENIED',}),);
};

// ===== COMBINED SECURITY DECORATORS =====

/**
 * Basic orchestration security for simple operations
 */
export const BasicOrchestrationSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    BrowserRoles(UserRole._USER, UserRole._OPERATOR),
    BrowserPermissions(Permission.BROWSER_ORCHESTRATION),
    OrchestrationSecurityLevel(OrchestrationSecurityLevel.BASIC),
    OrchestrationRiskLevel(OrchestrationRiskLevel._MINIMAL),
    OrchestrationOperationType(OrchestrationOperationType.CREATE),
    ConservativeResourceAllocation(),
    StandardOrchestrationRateLimit(),
    BasicOrchestrationMonitoring(),
    BrowserValidation(),
  );
};

/**
 * Coordinated orchestration security for multi-agent operations
 */
export const CoordinatedOrchestrationSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    BrowserRoles(UserRole._OPERATOR, UserRole._ADMIN),
    BrowserPermissions(Permission.BROWSER_ORCHESTRATION, Permission.AGENT_COORDINATION),
    OrchestrationSecurityLevel(OrchestrationSecurityLevel.COORDINATED),
    OrchestrationRiskLevel(OrchestrationRiskLevel._MODERATE),
    OrchestrationOperationType(OrchestrationOperationType.COORDINATE),
    BalancedResourceAllocation(),
    StandardOrchestrationRateLimit(),
    EnhancedOrchestrationMonitoring(),
    EncryptedAgentCoordination(),
    BrowserValidation({
      validateInput: true,
      validateUrls: true,
      validateSelectors: true,
      logSecurityEvents: true,
    }),
  );
};

/**
 * Distributed orchestration security for complex operations
 */
export const DistributedOrchestrationSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    BrowserRoles(UserRole._ADMIN),
    BrowserPermissions(
      Permission.BROWSER_ORCHESTRATION_ADMIN,
      Permission.AGENT_COORDINATION,
      Permission.RESOURCE_MANAGEMENT,
    ),
    OrchestrationSecurityLevel(OrchestrationSecurityLevel.DISTRIBUTED),
    OrchestrationRiskLevel(OrchestrationRiskLevel.ELEVATED),
    OrchestrationOperationType(OrchestrationOperationType.COORDINATE),
    AggressiveResourceAllocation(),
    StrictOrchestrationRateLimit(),
    EnhancedOrchestrationMonitoring(),
    SOC2OrchestrationCompliance(),
    EncryptedAgentCoordination(),
    AgentResourceIsolation(),
    BrowserValidation({
      validateInput: true,
      validateUrls: true,
      validateSelectors: true,
      validateSession: true,
      logSecurityEvents: true,
      requireParentValidation: true,
    }),
  );
};

/**
 * Enterprise orchestration security for business-critical operations
 */
export const EnterpriseOrchestrationSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    BrowserRoles(UserRole._ADMIN),
    BrowserPermissions(
      Permission.BROWSER_ORCHESTRATION_ADMIN,
      Permission.ENTERPRISE_ORCHESTRATION,
      Permission.SYSTEM_ADMINISTRATION,
    ),
    OrchestrationSecurityLevel(OrchestrationSecurityLevel.ENTERPRISE),
    OrchestrationRiskLevel(OrchestrationRiskLevel._HIGH),
    EnterpriseResourceAllocation(),
    StrictOrchestrationRateLimit(),
    ComprehensiveOrchestrationMonitoring(),
    CriticalOrchestrationCompliance(),
    EncryptedAgentCoordination(),
    AgentResourceIsolation(),
    BrowserSessionRequired(),
    BrowserValidation({
      validateInput: true,
      validateUrls: true,
      validateSelectors: true,
      validateSession: true,
      logSecurityEvents: true,
      requireParentValidation: true,
    }),
  );
};

/**
 * Maximum orchestration security for critical operations
 */
export const CriticalOrchestrationSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    BrowserRoles(UserRole._ADMIN),
    BrowserPermissions(
      Permission.BROWSER_ORCHESTRATION_ADMIN,
      Permission.ENTERPRISE_ORCHESTRATION,
      Permission.CRITICAL_OPERATIONS,
      Permission.SYSTEM_ADMINISTRATION,
    ),
    OrchestrationSecurityLevel(OrchestrationSecurityLevel.CRITICAL),
    OrchestrationRiskLevel(OrchestrationRiskLevel._CRITICAL),
    EnterpriseResourceAllocation(),
    StrictOrchestrationRateLimit(),
    RealTimeOrchestrationMonitoring(),
    CriticalOrchestrationCompliance(),
    EncryptedAgentCoordination(),
    AgentResourceIsolation(),
    BrowserSessionRequired(),
    BrowserValidation({
      validateInput: true,
      validateUrls: true,
      validateSelectors: true,
      validateSession: true,
      logSecurityEvents: true,
      requireParentValidation: true,
    }),
    ApiResponse({
      status: 451,
      description: 'Unavailable For Legal Reasons - Operation requires additional clearance',}),);
};

// ===== OPERATION-SPECIFIC DECORATORS =====

/**
 * Security for orchestration creation operations
 */
export const OrchestrationCreationSecurity = () => {
  return applyDecorators(
    CoordinatedOrchestrationSecurity(),
    OrchestrationOperationType(OrchestrationOperationType.CREATE),
    ApiOperation({
      summary: 'Create Orchestration',description: 'Create new multi-agent browser orchestration',}),);
};

/**
 * Security for orchestration monitoring operations
 */
export const OrchestrationMonitoringSecurity = () => {
  return applyDecorators(
    BasicOrchestrationSecurity(),
    OrchestrationOperationType(OrchestrationOperationType.MONITOR),
    BrowserPermissions(Permission.ORCHESTRATION_MONITORING),
    ConservativeResourceAllocation(),
    PermissiveOrchestrationRateLimit(),
    ApiOperation({
      summary: 'Monitor Orchestration',description: 'Monitor active orchestration operations',}),);
};

/**
 * Security for orchestration scaling operations
 */
export const OrchestrationScalingSecurity = () => {
  return applyDecorators(
    DistributedOrchestrationSecurity(),
    OrchestrationOperationType(OrchestrationOperationType.SCALE),
    BrowserPermissions(
      Permission.BROWSER_ORCHESTRATION_ADMIN,
      Permission.RESOURCE_MANAGEMENT,
    ),
    ApiOperation({
      summary: 'Scale Orchestration',description: 'Scale orchestration resources and agents',}),);
};

/**
 * Security for orchestration termination operations
 */
export const OrchestrationTerminationSecurity = () => {
  return applyDecorators(
    EnterpriseOrchestrationSecurity(),
    OrchestrationOperationType(OrchestrationOperationType.TERMINATE),
    BrowserPermissions(
      Permission.BROWSER_ORCHESTRATION_ADMIN,
      Permission.ORCHESTRATION_TERMINATION,
    ),
    ApiOperation({
      summary: 'Terminate Orchestration',description: 'Terminate active orchestration operations',}),ApiResponse({
      status: 202,
      description: 'Accepted - Orchestration termination initiated',}),);
};

/**
 * Security for emergency orchestration operations
 */
export const EmergencyOrchestrationSecurity = () => {
  return applyDecorators(
    CriticalOrchestrationSecurity(),
    OrchestrationOperationType(OrchestrationOperationType.EMERGENCY),
    StandardEmergencyOrchestration(),
    BrowserPermissions(
      Permission.EMERGENCY_ORCHESTRATION,
      Permission.CRITICAL_OPERATIONS,
    ),
    ApiOperation({
      summary: 'Emergency Orchestration',description: 'Emergency orchestration with elevated privileges',}),);
};

// ===== UTILITY DECORATORS =====

/**
 * Development-only orchestration endpoints
 */
export const DevOrchestrationOnly = () => {
  return applyDecorators(
    BasicOrchestrationSecurity(),
    SetMetadata('development_only', true),ApiResponse({status: 503,
      description: 'Service Unavailable - Development endpoint not available in production',}),);
};

/**
 * Testing orchestration with relaxed security
 */
export const TestingOrchestrationSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    BrowserRoles(UserRole._ADMIN),
    OrchestrationSecurityLevel(OrchestrationSecurityLevel.BASIC),
    ConservativeResourceAllocation(),
    PermissiveOrchestrationRateLimit(),
    BasicOrchestrationMonitoring(),
    SetMetadata('testing_only', true),
  );
};

// ===== EXPORT ALL DECORATORS =====

export {
  // Security Level Decorators
  OrchestrationSecurityLevel as SetOrchestrationSecurityLevel,
  OrchestrationRiskLevel as SetOrchestrationRiskLevel,
  OrchestrationOperationType as SetOrchestrationOperationType,

  // Resource Control Decorators
  OrchestrationResourceLimits,
  ConservativeResourceAllocation,
  BalancedResourceAllocation,
  AggressiveResourceAllocation,
  EnterpriseResourceAllocation,

  // Rate Limiting Decorators
  OrchestrationRateLimit,
  StandardOrchestrationRateLimit,
  StrictOrchestrationRateLimit,
  PermissiveOrchestrationRateLimit,

  // Compliance Decorators
  OrchestrationCompliance,
  SOC2OrchestrationCompliance,
  GDPROrchestrationCompliance,
  HIPAAOrchestrationCompliance,
  CriticalOrchestrationCompliance,

  // Monitoring Decorators
  OrchestrationMonitoring,
  BasicOrchestrationMonitoring,
  EnhancedOrchestrationMonitoring,
  ComprehensiveOrchestrationMonitoring,
  RealTimeOrchestrationMonitoring,

  // Emergency Decorators
  EmergencyOrchestration,
  StandardEmergencyOrchestration,
  CriticalEmergencyOrchestration,

  // Coordination Decorators
  EncryptedAgentCoordination,
  AgentResourceIsolation,

  // Combined Security Decorators
  BasicOrchestrationSecurity,
  CoordinatedOrchestrationSecurity,
  DistributedOrchestrationSecurity,
  EnterpriseOrchestrationSecurity,
  CriticalOrchestrationSecurity,

  // Operation-Specific Decorators
  OrchestrationCreationSecurity,
  OrchestrationMonitoringSecurity,
  OrchestrationScalingSecurity,
  OrchestrationTerminationSecurity,
  EmergencyOrchestrationSecurity,

  // Utility Decorators
  DevOrchestrationOnly,
  TestingOrchestrationSecurity,
};