# PARLANT Quality Gates Framework

A comprehensive quality gate system for PARLANT database function wrapping that provides automated validation, performance monitoring, security checks, rollback mechanisms, and approval workflows with enterprise-grade compliance and audit capabilities.

## Overview

The PARLANT Quality Gates Framework ensures the highest quality standards for database function wrapping by implementing multiple layers of automated validation and quality control. The framework is designed to meet enterprise requirements with zero tolerance for critical security vulnerabilities and sub-1000ms response time validation.

## Key Features

### 🎯 Quality Gate Types

- **Performance Gates**: Sub-1000ms response time validation, throughput monitoring, resource utilization checks
- **Security Gates**: Authentication/authorization validation, vulnerability scanning, compliance checking
- **Coverage Gates**: 95%+ test coverage requirements, code coverage analysis, integration test validation
- **Integrity Gates**: Function wrapper integrity validation, signature preservation, behavior validation

### 🔄 Rollback Mechanisms

- **Immediate Rollback**: Instant rollback on critical failures
- **Gradual Rollback**: Phased rollback with traffic shifting
- **Canary Rollback**: Subset rollback for risk mitigation
- **Blue-Green Rollback**: Environment switching for zero-downtime rollback
- **Manual Rollback**: Operator-controlled rollback procedures

### ✅ Approval Workflows

- **Single Approval**: Basic approval for development environments
- **Dual Approval**: Two-person approval for production deployments
- **Role-Based Approval**: Approval based on user roles and permissions
- **Auto-Approval**: Automated approval for low-risk changes
- **Escalation**: Automatic escalation for delayed approvals

### 🛡️ Enterprise Compliance

- **GDPR**: General Data Protection Regulation compliance
- **HIPAA**: Health Insurance Portability and Accountability Act
- **SOX**: Sarbanes-Oxley Act compliance
- **PCI DSS**: Payment Card Industry Data Security Standard
- **ISO 27001**: Information Security Management
- **NIST**: National Institute of Standards and Technology
- **SOC 2**: Service Organization Control 2

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Quality Gates Framework                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Performance │  │  Security   │  │  Coverage   │         │
│  │    Gates    │  │    Gates    │  │    Gates    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Integrity   │  │  Rollback   │  │  Approval   │         │
│  │    Gates    │  │   Engine    │  │  Workflow   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│               Pipeline Orchestration                        │
├─────────────────────────────────────────────────────────────┤
│             PARLANT Function Wrapper                        │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Installation

```typescript
import {
  QualityGateFrameworkService,
  PerformanceQualityGate,
  SecurityQualityGate,
  DefaultQualityGatesConfigFactory,
  Environment
} from '@bytebot/shared/parlant/quality-gates';
```

### Basic Usage

```typescript
// Initialize the framework
const framework = new QualityGateFrameworkService();

// Get default configuration for production
const config = DefaultQualityGatesConfigFactory.createFrameworkConfig();
const productionConfig = config.pipelines[Environment.PRODUCTION];

// Create a quality gate pipeline
const pipeline = framework.createPipeline(
  'production-pipeline',
  'Production Quality Gates',
  productionConfig
);

// Add performance gate
const performanceGate = new PerformanceQualityGate(
  'perf-gate-1',
  'Response Time Validation',
  'Validates sub-1000ms response time requirement',
  QualityGatePriority.CRITICAL,
  true,
  config.performanceGates[Environment.PRODUCTION],
  config.thresholds[Environment.PRODUCTION]
);

pipeline.addGate(performanceGate);

// Add security gate
const securityGate = new SecurityQualityGate(
  'sec-gate-1',
  'Security Validation',
  'Zero critical vulnerability validation',
  QualityGatePriority.CRITICAL,
  true,
  config.securityGates[Environment.PRODUCTION],
  config.thresholds[Environment.PRODUCTION]
);

pipeline.addGate(securityGate);

// Execute pipeline
const context = {
  sessionId: 'session-123',
  functionId: 'my-database-function',
  functionMetadata: {},
  environment: 'production',
  userContext: {
    userId: 'user-123',
    roles: ['developer'],
    permissions: ['deploy'],
    sessionInfo: {}
  },
  previousResults: [],
  timestamp: new Date(),
  additionalData: {}
};

const result = await framework.executePipeline('production-pipeline', context);

if (result.status === QualityGateStatus.PASSED) {
  console.log('Quality gates passed - deployment approved');
} else {
  console.log('Quality gates failed:', result.summary.criticalFailures);
}
```

## Configuration

### Environment-Specific Settings

The framework supports different configurations for each environment:

```typescript
const config = DefaultQualityGatesConfigFactory.createFrameworkConfig();

// Development: Relaxed thresholds for faster iteration
const devConfig = config.performanceGates[Environment.DEVELOPMENT];
// - Response time: 2000ms
// - Error rate: 5%
// - Coverage: 70%

// Staging: Stricter validation for pre-production testing
const stagingConfig = config.performanceGates[Environment.STAGING];
// - Response time: 1500ms
// - Error rate: 3%
// - Coverage: 85%

// Production: Strictest requirements for live systems
const prodConfig = config.performanceGates[Environment.PRODUCTION];
// - Response time: 1000ms (sub-1000ms requirement)
// - Error rate: 1%
// - Coverage: 95%
```

### Custom Configuration

```typescript
const customPerformanceConfig: PerformanceGateConfig = {
  timeout: 120000,
  retryAttempts: 3,
  retryDelay: 5000,
  parallelExecution: true,
  dependencies: [],
  customParams: {},
  environmentOverrides: {},
  responseTimeThreshold: 800, // Even stricter than default
  throughputThreshold: 500,
  memoryThreshold: 64 * 1024 * 1024, // 64MB
  cpuThreshold: 50, // 50%
  errorRateThreshold: 0.5, // 0.5%
  resourceThresholds: {
    dbConnectionPoolThreshold: 40,
    networkBandwidthThreshold: 300 * 1024 * 1024,
    diskIoThreshold: 200,
    cacheHitRateThreshold: 95
  },
  enableProfiling: true,
  profilingSampleRate: 1.0, // 100% sampling
  monitoringWindow: 180000 // 3 minutes
};
```

## Quality Gate Types

### Performance Gates

Validates performance metrics against configurable thresholds:

- **Response Time**: Must be ≤ 1000ms for production (sub-1000ms requirement)
- **Throughput**: Operations per second capacity
- **Memory Usage**: Memory consumption limits
- **CPU Usage**: CPU utilization thresholds
- **Error Rate**: Maximum allowed error percentage
- **Resource Utilization**: Database connections, cache hit rates, network bandwidth

```typescript
const performanceGate = new PerformanceQualityGate(
  'response-time-gate',
  'Sub-1000ms Response Time',
  'Ensures response time meets sub-1000ms requirement',
  QualityGatePriority.CRITICAL,
  true,
  performanceConfig,
  thresholds
);
```

### Security Gates

Validates security aspects with zero tolerance for critical vulnerabilities:

- **Vulnerability Scanning**: Static analysis, dependency scanning, container scanning
- **Authentication Validation**: JWT, OAuth2, API key validation
- **Authorization Validation**: RBAC, ABAC policy enforcement
- **Compliance Checking**: GDPR, HIPAA, SOX, PCI DSS compliance
- **Threat Detection**: Real-time threat pattern recognition

```typescript
const securityGate = new SecurityQualityGate(
  'zero-vuln-gate',
  'Zero Critical Vulnerabilities',
  'Ensures zero critical security vulnerabilities',
  QualityGatePriority.CRITICAL,
  true,
  securityConfig,
  thresholds
);
```

### Coverage Gates

Validates test coverage with 95%+ requirements for production:

- **Test Coverage**: Unit test coverage percentage
- **Code Coverage**: Line and branch coverage
- **Function Coverage**: Function-level coverage
- **Integration Coverage**: Integration test coverage

### Integrity Gates

Validates function wrapper integrity and behavior:

- **Signature Validation**: Function signature preservation
- **Type Validation**: TypeScript type safety
- **Behavior Validation**: Function behavior consistency
- **Performance Validation**: Performance regression detection

## Rollback System

The rollback engine provides automated recovery mechanisms:

### Rollback Strategies

1. **Immediate Rollback**
   ```typescript
   strategy: RollbackStrategy.IMMEDIATE
   ```
   - Instant rollback on failure
   - Best for critical failures
   - Minimal downtime

2. **Gradual Rollback**
   ```typescript
   strategy: RollbackStrategy.GRADUAL
   ```
   - Phased traffic reduction
   - Safer for large deployments
   - Controlled rollback process

3. **Canary Rollback**
   ```typescript
   strategy: RollbackStrategy.CANARY
   ```
   - Rollback subset of traffic
   - Risk mitigation
   - A/B testing support

4. **Blue-Green Rollback**
   ```typescript
   strategy: RollbackStrategy.BLUE_GREEN
   ```
   - Environment switching
   - Zero-downtime rollback
   - Complete environment isolation

### Rollback Triggers

```typescript
const rollbackConfig: RollbackConfiguration = {
  enabled: true,
  strategy: RollbackStrategy.BLUE_GREEN,
  triggers: [
    {
      id: 'critical-failure',
      condition: RollbackCondition.CRITICAL_GATE_FAILURE,
      threshold: 0,
      evaluationWindow: 30000,
      enabled: true
    },
    {
      id: 'error-rate-spike',
      condition: RollbackCondition.ERROR_RATE_THRESHOLD,
      threshold: 1,
      evaluationWindow: 60000,
      enabled: true
    }
  ],
  // ... recovery procedures
};
```

## Approval Workflows

### Production Approval Requirements

```typescript
const approvalConfig: ApprovalConfiguration = {
  enabled: true,
  requirements: [
    {
      id: 'dual-approval',
      name: 'Dual Approval Required',
      approvers: [
        {
          type: ApproverType.ROLE,
          identifier: 'tech-lead',
          permissions: ['approve-production']
        },
        {
          type: ApproverType.ROLE,
          identifier: 'sre-lead',
          permissions: ['approve-production']
        }
      ],
      minApprovals: 2,
      conditions: [
        {
          id: 'production-deployment',
          type: ApprovalConditionType.PRODUCTION_DEPLOYMENT,
          parameters: { environment: 'production' },
          description: 'Production deployment requires dual approval'
        }
      ],
      priority: 1
    }
  ],
  timeout: 14400000, // 4 hours
  autoApprovalConditions: [], // No auto-approval for production
  notifications: {
    enabled: true,
    channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK],
    recipients: ['tech-leads@company.com', 'sre-team@company.com'],
    escalation: {
      enabled: true,
      delay: 1800000, // 30 minutes
      levels: [
        {
          level: 1,
          recipients: ['engineering-director@company.com'],
          messageTemplate: 'URGENT: Production approval needed',
          channels: [NotificationChannel.PAGER_DUTY]
        }
      ]
    }
  }
};
```

## Enterprise Compliance

### Compliance Framework Support

```typescript
const complianceFrameworks = [
  ComplianceFramework.GDPR,      // General Data Protection Regulation
  ComplianceFramework.HIPAA,     // Health Insurance Portability and Accountability Act
  ComplianceFramework.SOX,       // Sarbanes-Oxley Act
  ComplianceFramework.PCI_DSS,   // Payment Card Industry Data Security Standard
  ComplianceFramework.ISO_27001, // Information Security Management
  ComplianceFramework.NIST,      // National Institute of Standards and Technology
  ComplianceFramework.SOC2       // Service Organization Control 2
];

const securityConfig: SecurityGateConfig = {
  enableComplianceChecking: true,
  complianceFrameworks,
  minComplianceScore: 95,
  // ... other security settings
};
```

### Audit Trail

All quality gate executions are automatically logged with comprehensive audit trails:

```typescript
interface AuditTrail {
  startTime: Date;
  endTime: Date;
  functionCall: FunctionCall;
  userContext: UserContext;
  validationSteps: ValidationStep[];
  resultSummary: ResultSummary;
  auditMetadata: Record<string, any>;
}
```

## Monitoring and Alerting

### Real-time Monitoring

The framework provides real-time monitoring capabilities:

- **Performance Metrics**: Response time, throughput, resource usage
- **Security Metrics**: Vulnerability counts, threat alerts, compliance scores
- **Quality Metrics**: Test coverage, gate success rates, deployment frequency
- **System Health**: Gate execution times, error rates, availability

### Alerting

Configurable alerting through multiple channels:

```typescript
const notifications: RollbackNotificationSettings = {
  enabled: true,
  channels: [
    NotificationChannel.EMAIL,
    NotificationChannel.SLACK,
    NotificationChannel.SMS,
    NotificationChannel.WEBHOOK,
    NotificationChannel.PAGER_DUTY
  ],
  recipients: ['devops@company.com', 'sre@company.com'],
  templates: {
    rollback: 'Rollback executed: {rollbackId}',
    approval: 'Approval required: {deploymentId}',
    failure: 'Quality gate failure: {gateId}'
  }
};
```

## API Reference

### Core Classes

#### QualityGateFrameworkService

Main service for managing quality gates:

```typescript
class QualityGateFrameworkService {
  registerGate(gate: QualityGate): void
  createPipeline(id: string, name: string, config: QualityGatePipelineConfig): QualityGatePipeline
  executePipeline(pipelineId: string, context: QualityGateContext): Promise<QualityGatePipelineResult>
  getExecutionHistory(pipelineId: string, limit?: number): QualityGatePipelineResult[]
}
```

#### PerformanceQualityGate

Performance validation gate:

```typescript
class PerformanceQualityGate implements QualityGate {
  constructor(
    id: string,
    name: string,
    description: string,
    priority: QualityGatePriority,
    enabled: boolean,
    config: PerformanceGateConfig,
    thresholds: QualityGateThresholds
  )

  execute(context: QualityGateContext): Promise<QualityGateResult>
  validateConfig(): QualityGateConfigValidation
}
```

#### SecurityQualityGate

Security validation gate:

```typescript
class SecurityQualityGate implements QualityGate {
  constructor(
    id: string,
    name: string,
    description: string,
    priority: QualityGatePriority,
    enabled: boolean,
    config: SecurityGateConfig,
    thresholds: QualityGateThresholds
  )

  execute(context: QualityGateContext): Promise<QualityGateResult>
  validateConfig(): QualityGateConfigValidation
}
```

#### RollbackEngine

Automated rollback management:

```typescript
class RollbackEngine {
  evaluateRollbackTrigger(gateResults: readonly QualityGateResult[], config: RollbackConfiguration): boolean
  executeRollback(context: RollbackExecutionContext, config: RollbackConfiguration): Promise<RollbackInfo>
  getRollbackStatus(rollbackId: string): RollbackProgressTracker | undefined
  cancelRollback(rollbackId: string): Promise<boolean>
}
```

### Configuration Factory

#### DefaultQualityGatesConfigFactory

Creates default configurations:

```typescript
class DefaultQualityGatesConfigFactory {
  static createFrameworkConfig(): QualityGatesFrameworkConfig
  static createDevelopmentPipelineConfig(): QualityGatePipelineConfig
  static createStagingPipelineConfig(): QualityGatePipelineConfig
  static createProductionPipelineConfig(): QualityGatePipelineConfig
}
```

## Best Practices

### 1. Environment-Specific Configuration

Use different thresholds for different environments:

- **Development**: Relaxed for rapid iteration
- **Staging**: Moderate for pre-production validation
- **Production**: Strict for quality assurance

### 2. Progressive Quality Standards

Implement progressive quality standards:

```typescript
// Development: Basic validation
minTestCoverage: 70%
responseTimeThreshold: 2000ms
maxCriticalVulnerabilities: 2

// Staging: Enhanced validation
minTestCoverage: 85%
responseTimeThreshold: 1500ms
maxCriticalVulnerabilities: 0

// Production: Strictest validation
minTestCoverage: 95%
responseTimeThreshold: 1000ms // Sub-1000ms requirement
maxCriticalVulnerabilities: 0 // Zero tolerance
```

### 3. Fail-Fast Strategy

Configure critical gates to fail fast:

```typescript
const pipelineConfig: QualityGatePipelineConfig = {
  executionMode: PipelineExecutionMode.FAIL_FAST,
  failFast: true,
  continueOnFailure: false
};
```

### 4. Comprehensive Monitoring

Enable comprehensive monitoring and audit trails:

```typescript
const frameworkConfig: FrameworkConfig = {
  enableLogging: true,
  enableMetrics: true,
  enableAuditTrail: true
};
```

### 5. Automated Rollback

Configure automated rollback for production:

```typescript
const rollbackConfig: RollbackConfiguration = {
  enabled: true,
  strategy: RollbackStrategy.BLUE_GREEN,
  triggers: [
    {
      condition: RollbackCondition.CRITICAL_GATE_FAILURE,
      threshold: 0,
      enabled: true
    }
  ]
};
```

## Troubleshooting

### Common Issues

1. **Gate Timeout**
   - Increase gate timeout in configuration
   - Check system resources
   - Optimize validation logic

2. **False Positives**
   - Adjust threshold values
   - Review validation criteria
   - Enable profiling for detailed analysis

3. **Rollback Failures**
   - Verify recovery procedures
   - Check system dependencies
   - Review rollback configuration

### Debug Mode

Enable debug logging:

```typescript
const logger = new Logger('QualityGates');
logger.debug('Detailed execution information');
```

### Performance Analysis

Enable profiling for performance gates:

```typescript
const performanceConfig: PerformanceGateConfig = {
  enableProfiling: true,
  profilingSampleRate: 1.0, // 100% sampling for debugging
  monitoringWindow: 300000 // 5 minutes
};
```

## Contributing

See the main project CONTRIBUTING.md for guidelines on contributing to the PARLANT Quality Gates Framework.

## License

This project is licensed under the Enterprise License. See LICENSE file for details.

## Support

For support and questions:

- Documentation: `/docs/quality-gates/`
- Issues: Project issue tracker
- Team: Quality Gates Framework Team