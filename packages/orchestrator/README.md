# AIgent Orchestrator Package

Enterprise-grade orchestration package with comprehensive Parlant conversational AI integration for multi-service coordination, approval workflows, and performance optimization.

## 🚀 Features

- **🤖 Parlant Integration**: Conversational AI validation for all orchestration steps
- **🔄 Multi-Service Coordination**: Intelligent dependency management and service orchestration
- **✅ Approval Workflows**: Human-in-the-loop processes with real-time conversational approval
- **⚡ Performance Optimization**: Sub-500ms response time targets with intelligent caching
- **🔒 Enterprise Security**: Risk assessment, compliance auditing, and comprehensive logging
- **📊 Real-Time Monitoring**: Advanced performance metrics and alerting
- **🏗️ Scalable Architecture**: Handles 1000+ concurrent orchestrations with circuit breaker patterns

## 📦 Installation

```bash
# Install the orchestrator package
npm install @aiagent/orchestrator

# Or with yarn
yarn add @aiagent/orchestrator

# Or with pnpm
pnpm add @aiagent/orchestrator
```

## 🎯 Quick Start

### Basic Setup

```typescript
import { OrchestratorModule, ParlantOrchestratorService } from '@aiagent/orchestrator';

// In your NestJS app module
@Module({
  imports: [
    OrchestratorModule.register({
      configuration: {
        parlantIntegration: {
          enabled: true,
          apiEndpoint: 'https://your-parlant-endpoint.com',
          apiKey: process.env.PARLANT_API_KEY
        },
        performance: {
          defaultStepTimeoutMs: 30000,
          maxConcurrentExecutions: 100
        }
      },
      isGlobal: true
    })
  ]
})
export class AppModule {}
```

### Simple Orchestration Example

```typescript
import { Injectable } from '@nestjs/common';
import { 
  ParlantOrchestratorService, 
  OrchestrationTask,
  WorkflowStepType,
  OrchestrationPriority 
} from '@aiagent/orchestrator';

@Injectable()
export class MyService {
  constructor(
    private readonly orchestrator: ParlantOrchestratorService
  ) {}

  async executeBusinessProcess() {
    const task: OrchestrationTask = {
      taskId: 'business-process-001',
      name: 'Customer Onboarding Process',
      description: 'Complete customer onboarding with validation and approvals',
      priority: OrchestrationPriority.HIGH,
      services: [
        {
          serviceId: 'customer-service',
          serviceName: 'Customer Management',
          endpoints: ['/api/customers/create'],
          dependencyType: 'required',
          healthCheck: {
            endpoint: '/health',
            timeoutMs: 5000,
            expectedStatus: 200,
            intervalMs: 30000
          },
          fallbackStrategy: 'graceful_degradation'
        }
      ],
      workflow: [
        {
          stepId: 'validate-customer-data',
          name: 'Validate Customer Information',
          description: 'Validate customer data with Parlant approval',
          type: WorkflowStepType.VALIDATION,
          serviceId: 'customer-service',
          endpoint: '/api/customers/validate',
          parameters: {
            customerData: '{{input.customerData}}'
          },
          dependencies: [],
          retryConfig: {
            maxAttempts: 3,
            baseDelayMs: 1000,
            backoffMultiplier: 2,
            maxDelayMs: 10000,
            jitterMs: 100
          },
          timeout: {
            stepTimeoutMs: 30000,
            workflowTimeoutMs: 300000,
            gracePeriodMs: 5000
          },
          parlantValidation: {
            enabled: true,
            approvalLevel: 'human_review',
            riskAssessment: {
              maxRiskLevel: 'medium',
              requiredFactors: ['data_quality', 'compliance'],
              mitigationStrategies: ['manual_review']
            },
            conversationContext: {}
          }
        }
      ],
      performanceRequirements: {
        maxExecutionTimeMs: 300000,
        targetP95Ms: 500,
        targetP99Ms: 1000,
        maxMemoryMb: 256,
        maxCpuPercent: 80,
        minThroughput: 100,
        slaRequirements: {
          availabilityPercent: 99.95,
          maxErrorRate: 0.01,
          rtoMinutes: 5,
          rpoMinutes: 1
        }
      },
      complianceRequirements: {
        auditTrail: true,
        dataRetentionDays: 90,
        encryptionRequired: true,
        frameworks: [{
          name: 'SOC2',
          controls: ['access_control', 'audit_logging'],
          level: 'standard'
        }],
        accessControl: {
          requiredRoles: ['customer_manager'],
          requiredPermissions: ['customer:create'],
          mfaRequired: false
        }
      },
      metadata: {
        createdAt: new Date(),
        createdBy: 'system',
        version: '1.0.0',
        tags: ['customer', 'onboarding'],
        custom: {}
      }
    };

    const request = {
      task,
      userContext: {
        userId: 'user123',
        roles: ['customer_manager'],
        sessionId: 'session456',
        ipAddress: '192.168.1.1',
        metadata: {}
      },
      conversationContext: {
        conversationId: 'conv789',
        userId: 'user123'
      }
    };

    const result = await this.orchestrator.executeOrchestration(request);
    
    if (result.error) {
      console.error('Orchestration failed:', result.error);
      throw new Error(result.error.message);
    }

    console.log('Orchestration completed:', {
      executionId: result.executionContext.executionId,
      duration: result.performanceMetrics.totalExecutionTimeMs,
      stepsCompleted: result.executionContext.state.completedSteps.length
    });

    return result.result;
  }
}
```

## 🏗️ Architecture Overview

### Core Components

1. **ParlantOrchestratorService**: Main orchestration engine with Parlant integration
2. **ServiceDiscoveryService**: Service registration and health monitoring
3. **ApprovalWorkflowService**: Human-in-the-loop approval processes
4. **RiskAssessmentService**: Automated risk analysis and mitigation
5. **ComplianceAuditService**: Regulatory compliance and audit trails
6. **PerformanceMonitoringService**: Real-time metrics and alerting
7. **OrchestratorCacheService**: Multi-level caching for performance

### Workflow Execution Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Orchestration │    │     Parlant     │    │    Service      │
│     Request     │───▶│   Validation    │───▶│   Discovery     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      Risk       │    │    Approval     │    │     Step        │
│   Assessment    │◀───│    Workflow     │───▶│   Execution     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Compliance    │    │   Performance   │    │     Result      │
│     Audit       │◀───│   Monitoring    │◀───│  Aggregation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Configuration

### Environment Variables

```bash
# Parlant Integration
PARLANT_API_ENDPOINT=https://parlant.example.com
PARLANT_WS_ENDPOINT=wss://parlant.example.com/ws
PARLANT_API_KEY=your-api-key-here

# Performance Settings
ORCHESTRATOR_MAX_CONCURRENT=100
ORCHESTRATOR_DEFAULT_TIMEOUT=30000

# Caching
ORCHESTRATOR_CACHE_PROVIDER=redis
REDIS_URL=redis://localhost:6379

# Monitoring
LOG_LEVEL=info
METRICS_EXPORT_INTERVAL=60000

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
```

### Advanced Configuration

```typescript
import { OrchestratorModule } from '@aiagent/orchestrator';

@Module({
  imports: [
    OrchestratorModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        configuration: {
          performance: {
            defaultStepTimeoutMs: configService.get('STEP_TIMEOUT', 30000),
            defaultWorkflowTimeoutMs: configService.get('WORKFLOW_TIMEOUT', 300000),
            maxConcurrentExecutions: configService.get('MAX_CONCURRENT', 100),
            threadPoolSize: configService.get('THREAD_POOL_SIZE', 10)
          },
          parlantIntegration: {
            enabled: configService.get('PARLANT_ENABLED', true),
            apiEndpoint: configService.get('PARLANT_API_ENDPOINT'),
            websocketEndpoint: configService.get('PARLANT_WS_ENDPOINT'),
            apiKey: configService.get('PARLANT_API_KEY'),
            connectionTimeoutMs: configService.get('PARLANT_TIMEOUT', 10000),
            requestTimeoutMs: configService.get('PARLANT_REQUEST_TIMEOUT', 5000)
          },
          caching: {
            enabled: configService.get('CACHE_ENABLED', true),
            provider: configService.get('CACHE_PROVIDER', 'memory'),
            defaultTtlMs: configService.get('CACHE_TTL', 300000)
          },
          monitoring: {
            enabled: configService.get('MONITORING_ENABLED', true),
            metricsIntervalMs: configService.get('METRICS_INTERVAL', 60000),
            logLevel: configService.get('LOG_LEVEL', 'info')
          }
        }
      }),
      inject: [ConfigService]
    })
  ]
})
export class AppModule {}
```

## 🎯 Performance Targets

The orchestrator is designed to meet enterprise performance requirements:

- **P95 Response Time**: < 500ms
- **P99 Response Time**: < 1000ms  
- **Throughput**: 1000+ orchestrations/second
- **Availability**: 99.99% uptime
- **Cache Hit Rate**: 85%+

### Performance Monitoring

```typescript
import { PerformanceMonitoringService } from '@aiagent/orchestrator';

@Injectable()
export class MonitoringService {
  constructor(
    private readonly performanceService: PerformanceMonitoringService
  ) {}

  async getPerformanceReport() {
    const metrics = await this.performanceService.getDetailedMetrics(
      24, // hours
      'hour', // granularity
      true // include breakdown
    );

    return {
      summary: metrics.summary,
      targetCompliance: metrics.targets,
      activeAlerts: metrics.alerts,
      recommendations: this.generateRecommendations(metrics)
    };
  }

  private generateRecommendations(metrics: any): string[] {
    const recommendations = [];

    if (metrics.targets.p95ResponseTime.complianceRate < 0.95) {
      recommendations.push('Consider increasing cache TTL to improve response times');
    }

    if (metrics.targets.errorRate.complianceRate < 0.95) {
      recommendations.push('Review error patterns and implement better error handling');
    }

    return recommendations;
  }
}
```

## 🔒 Security & Compliance

### Risk Assessment

```typescript
import { RiskAssessmentService } from '@aiagent/orchestrator';

@Injectable()
export class SecurityService {
  constructor(
    private readonly riskService: RiskAssessmentService
  ) {}

  async assessOrchestrationRisk(task: OrchestrationTask) {
    const assessment = await this.riskService.assessTaskRisk(task);

    console.log('Risk Assessment:', {
      taskId: task.taskId,
      riskLevel: assessment.riskLevel,
      score: assessment.riskScore,
      factors: assessment.riskFactors.length,
      mitigations: assessment.mitigationStrategies.length
    });

    // Require additional approvals for high-risk tasks
    if (assessment.riskLevel === 'high' || assessment.riskLevel === 'critical') {
      // Implement additional security measures
      await this.requireExecutiveApproval(task.taskId);
    }

    return assessment;
  }
}
```

### Compliance Auditing

```typescript
import { ComplianceAuditService } from '@aiagent/orchestrator';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly auditService: ComplianceAuditService
  ) {}

  async generateSOC2Report() {
    const framework = {
      name: 'SOC2',
      controls: [
        'access_control',
        'audit_logging',
        'data_protection',
        'incident_response'
      ],
      level: 'strict' as const
    };

    const report = await this.auditService.generateComplianceReport(
      framework,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      new Date()
    );

    return {
      compliance: report.compliance.status,
      score: report.compliance.score,
      findings: report.compliance.findings.length,
      recommendations: report.recommendations
    };
  }
}
```

## 🚨 Error Handling & Recovery

### Circuit Breaker Pattern

The orchestrator implements circuit breaker patterns for resilient service communication:

```typescript
// Automatic circuit breaker configuration
{
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    recoveryTimeoutMs: 30000
  },
  degradation: {
    strategy: 'GRACEFUL_DEGRADATION',
    fallbackTimeout: 1000
  }
}
```

### Recovery Strategies

1. **Retry with Exponential Backoff**: Automatic retry for transient failures
2. **Graceful Degradation**: Fallback to cached data or alternative services
3. **Circuit Breaker**: Prevent cascading failures across services
4. **Rollback Mechanisms**: Automatic rollback on critical failures

## 📊 Monitoring & Observability

### Real-Time Metrics

Access comprehensive metrics through the REST API:

```bash
# Get current performance metrics
GET /api/orchestrator/metrics/performance

# Get real-time metrics
GET /api/orchestrator/metrics/realtime

# Get health status
GET /api/orchestrator/health
```

### Alerting

Configure performance alerts:

```typescript
import { PerformanceMonitoringService } from '@aiagent/orchestrator';

// Create custom alert
await performanceService.createAlert({
  id: 'custom-latency-alert',
  severity: 'high',
  metric: 'P95 Response Time',
  threshold: 600,
  currentValue: 750,
  message: 'P95 response time exceeds 600ms threshold'
});
```

## 🔄 Integration Examples

### With Existing NestJS Services

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly orchestrator: ParlantOrchestratorService,
    private readonly userRepository: UserRepository
  ) {}

  async createUserWithApproval(userData: CreateUserDto, requesterId: string) {
    const task = this.buildUserCreationTask(userData);
    
    const result = await this.orchestrator.executeOrchestration({
      task,
      userContext: {
        userId: requesterId,
        roles: ['user_admin'],
        sessionId: 'session123',
        ipAddress: '10.0.0.1',
        metadata: {}
      },
      conversationContext: {
        conversationId: `user-creation-${Date.now()}`
      }
    });

    if (result.error) {
      throw new BusinessLogicException(result.error.message);
    }

    return result.result;
  }

  private buildUserCreationTask(userData: CreateUserDto): OrchestrationTask {
    // Build orchestration task for user creation
    return {
      taskId: `create-user-${Date.now()}`,
      name: 'Create User Account',
      description: 'Create user account with validation and approval',
      priority: OrchestrationPriority.MEDIUM,
      // ... rest of task configuration
    };
  }
}
```

### With External Services

```typescript
@Injectable()
export class PaymentOrchestrationService {
  async processPaymentWithApprovals(paymentData: PaymentRequest) {
    const task: OrchestrationTask = {
      taskId: `payment-${paymentData.transactionId}`,
      name: 'Process Payment Transaction',
      description: 'Process payment with fraud detection and approval',
      priority: OrchestrationPriority.CRITICAL,
      services: [
        {
          serviceId: 'fraud-detection',
          serviceName: 'Fraud Detection Service',
          endpoints: ['/api/fraud/check'],
          dependencyType: 'required',
          healthCheck: {
            endpoint: '/health',
            timeoutMs: 3000,
            expectedStatus: 200,
            intervalMs: 15000
          },
          fallbackStrategy: 'fail_fast'
        },
        {
          serviceId: 'payment-processor',
          serviceName: 'Payment Processing Service',
          endpoints: ['/api/payments/process'],
          dependencyType: 'required',
          healthCheck: {
            endpoint: '/health',
            timeoutMs: 5000,
            expectedStatus: 200,
            intervalMs: 30000
          },
          fallbackStrategy: 'graceful_degradation'
        }
      ],
      workflow: [
        {
          stepId: 'fraud-check',
          name: 'Fraud Detection Check',
          description: 'Check payment for fraud indicators',
          type: WorkflowStepType.SERVICE_CALL,
          serviceId: 'fraud-detection',
          endpoint: '/api/fraud/check',
          parameters: {
            amount: paymentData.amount,
            merchantId: paymentData.merchantId,
            cardHash: paymentData.cardHash
          },
          dependencies: [],
          retryConfig: {
            maxAttempts: 2,
            baseDelayMs: 500,
            backoffMultiplier: 2,
            maxDelayMs: 2000,
            jitterMs: 100
          },
          timeout: {
            stepTimeoutMs: 10000,
            workflowTimeoutMs: 60000,
            gracePeriodMs: 2000
          },
          parlantValidation: {
            enabled: true,
            approvalLevel: 'automated',
            riskAssessment: {
              maxRiskLevel: 'high',
              requiredFactors: ['fraud_score', 'amount_threshold'],
              mitigationStrategies: ['human_review']
            },
            conversationContext: {}
          }
        },
        {
          stepId: 'payment-approval',
          name: 'Payment Approval',
          description: 'Get approval for high-value payment',
          type: WorkflowStepType.APPROVAL,
          serviceId: 'approval-service',
          endpoint: '/api/approvals/request',
          parameters: {
            amount: paymentData.amount,
            fraudScore: '{{fraud-check.result.score}}',
            riskLevel: '{{fraud-check.result.riskLevel}}'
          },
          dependencies: ['fraud-check'],
          condition: {
            expression: '{{fraud-check.result.score}} > 0.7 OR {{amount}} > 10000',
            variables: {
              amount: paymentData.amount
            },
            onTrue: 'require-approval',
            onFalse: 'auto-approve'
          },
          retryConfig: {
            maxAttempts: 1,
            baseDelayMs: 1000,
            backoffMultiplier: 1,
            maxDelayMs: 1000,
            jitterMs: 0
          },
          timeout: {
            stepTimeoutMs: 300000, // 5 minutes for human approval
            workflowTimeoutMs: 300000,
            gracePeriodMs: 5000
          },
          parlantValidation: {
            enabled: true,
            approvalLevel: 'human_review',
            riskAssessment: {
              maxRiskLevel: 'medium',
              requiredFactors: ['payment_amount', 'fraud_indicators'],
              mitigationStrategies: ['supervisor_approval']
            },
            conversationContext: {
              context: 'high-value-payment-approval'
            }
          }
        },
        {
          stepId: 'process-payment',
          name: 'Process Payment',
          description: 'Execute the payment transaction',
          type: WorkflowStepType.SERVICE_CALL,
          serviceId: 'payment-processor',
          endpoint: '/api/payments/process',
          parameters: {
            ...paymentData,
            approvalId: '{{payment-approval.result.approvalId}}',
            fraudCheckId: '{{fraud-check.result.checkId}}'
          },
          dependencies: ['fraud-check', 'payment-approval'],
          retryConfig: {
            maxAttempts: 3,
            baseDelayMs: 2000,
            backoffMultiplier: 2,
            maxDelayMs: 10000,
            jitterMs: 500
          },
          timeout: {
            stepTimeoutMs: 30000,
            workflowTimeoutMs: 300000,
            gracePeriodMs: 5000
          },
          parlantValidation: {
            enabled: false, // No validation needed for final processing
            approvalLevel: 'none',
            riskAssessment: {
              maxRiskLevel: 'low',
              requiredFactors: [],
              mitigationStrategies: []
            },
            conversationContext: {}
          }
        }
      ],
      performanceRequirements: {
        maxExecutionTimeMs: 300000, // 5 minutes max
        targetP95Ms: 2000,
        targetP99Ms: 5000,
        maxMemoryMb: 128,
        maxCpuPercent: 50,
        minThroughput: 50,
        slaRequirements: {
          availabilityPercent: 99.99,
          maxErrorRate: 0.001, // Very low error rate for payments
          rtoMinutes: 1,
          rpoMinutes: 0 // No data loss tolerance
        }
      },
      complianceRequirements: {
        auditTrail: true,
        dataRetentionDays: 2555, // 7 years for financial data
        encryptionRequired: true,
        frameworks: [
          {
            name: 'PCI-DSS',
            controls: ['data_encryption', 'access_control', 'audit_logging', 'secure_transmission'],
            level: 'strict'
          },
          {
            name: 'SOX',
            controls: ['financial_controls', 'audit_trail', 'segregation_of_duties'],
            level: 'strict'
          }
        ],
        accessControl: {
          requiredRoles: ['payment_processor', 'financial_approver'],
          requiredPermissions: ['payments:process', 'payments:approve'],
          mfaRequired: true,
          ipWhitelist: ['10.0.0.0/8', '172.16.0.0/12'] // Internal network only
        }
      },
      metadata: {
        createdAt: new Date(),
        createdBy: 'payment-service',
        version: '1.0.0',
        tags: ['payment', 'financial', 'high-value', 'critical'],
        custom: {
          merchantId: paymentData.merchantId,
          paymentMethod: paymentData.method,
          currency: paymentData.currency
        }
      }
    };

    const result = await this.orchestrator.executeOrchestration({
      task,
      userContext: {
        userId: paymentData.userId,
        roles: ['customer'],
        sessionId: paymentData.sessionId,
        ipAddress: paymentData.clientIp,
        metadata: {
          userAgent: paymentData.userAgent,
          deviceId: paymentData.deviceId
        }
      },
      conversationContext: {
        conversationId: `payment-${paymentData.transactionId}`,
        context: 'payment-processing'
      },
      options: {
        dryRun: false,
        skipValidation: false,
        priorityOverride: OrchestrationPriority.CRITICAL,
        tags: ['financial', 'critical']
      }
    });

    if (result.error) {
      // Log payment failure for compliance
      await this.logPaymentFailure(paymentData, result.error);
      throw new PaymentProcessingException(result.error.message);
    }

    // Log successful payment
    await this.logPaymentSuccess(paymentData, result);

    return {
      transactionId: result.result.transactionId,
      status: 'completed',
      approvals: result.conversationSummaries,
      auditTrail: result.auditTrail,
      performanceMetrics: result.performanceMetrics
    };
  }

  private async logPaymentFailure(paymentData: PaymentRequest, error: any) {
    // Implement payment failure logging
    console.error('Payment processing failed:', {
      transactionId: paymentData.transactionId,
      amount: paymentData.amount,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  private async logPaymentSuccess(paymentData: PaymentRequest, result: any) {
    // Implement payment success logging
    console.log('Payment processed successfully:', {
      transactionId: paymentData.transactionId,
      amount: paymentData.amount,
      executionTime: result.performanceMetrics.totalExecutionTimeMs,
      timestamp: new Date().toISOString()
    });
  }
}
```

## 🧪 Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { ParlantOrchestratorService } from '@aiagent/orchestrator';

describe('ParlantOrchestratorService', () => {
  let service: ParlantOrchestratorService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ParlantOrchestratorService],
      imports: [
        OrchestratorModule.register({
          configuration: {
            parlantIntegration: { enabled: false }, // Disable for testing
            caching: { enabled: false }
          }
        })
      ]
    }).compile();

    service = module.get<ParlantOrchestratorService>(ParlantOrchestratorService);
  });

  it('should execute simple orchestration', async () => {
    const request = createMockOrchestrationRequest();
    const result = await service.executeOrchestration(request);

    expect(result).toBeDefined();
    expect(result.executionContext.state.status).toBe('completed');
  });
});
```

### Integration Testing

```typescript
describe('Orchestrator Integration', () => {
  it('should coordinate multiple services', async () => {
    const orchestrationRequest = {
      task: createMultiServiceTask(),
      userContext: createMockUserContext(),
      conversationContext: createMockConversationContext()
    };

    const result = await orchestratorService.executeOrchestration(orchestrationRequest);

    expect(result.executionContext.state.completedSteps).toHaveLength(3);
    expect(result.performanceMetrics.totalExecutionTimeMs).toBeLessThan(5000);
    expect(result.auditTrail.length).toBeGreaterThan(0);
  });
});
```

## 🔧 Migration Guide

### From Existing Orchestration Solutions

1. **Identify Current Workflows**: Map existing orchestration patterns
2. **Define Service Dependencies**: Document service relationships and health checks
3. **Configure Parlant Integration**: Set up conversational AI validation
4. **Implement Risk Assessment**: Define risk factors and mitigation strategies
5. **Set Up Monitoring**: Configure performance metrics and alerting
6. **Test and Validate**: Comprehensive testing of orchestration flows

### Migration Checklist

- [ ] Install and configure orchestrator package
- [ ] Set up Parlant API integration
- [ ] Define orchestration tasks and workflows
- [ ] Configure service discovery and health checks
- [ ] Set up approval workflows and risk assessment
- [ ] Configure compliance auditing and logging
- [ ] Set up performance monitoring and alerting
- [ ] Test orchestration flows end-to-end
- [ ] Deploy with gradual rollout strategy
- [ ] Monitor performance and optimize as needed

## 📚 API Reference

### REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orchestrator/execute` | POST | Execute orchestration task |
| `/api/orchestrator/execute/bulk` | POST | Execute multiple orchestrations |
| `/api/orchestrator/execute/:id/cancel` | POST | Cancel active orchestration |
| `/api/orchestrator/status/:id` | GET | Get orchestration status |
| `/api/orchestrator/result/:id` | GET | Get orchestration result |
| `/api/orchestrator/list` | GET | List orchestrations with filters |
| `/api/orchestrator/metrics/performance` | GET | Get performance metrics |
| `/api/orchestrator/metrics/realtime` | GET | Get real-time metrics |
| `/api/orchestrator/health` | GET | Health check endpoint |

### Service Methods

#### ParlantOrchestratorService

```typescript
// Execute single orchestration
executeOrchestration(request: ParlantOrchestrationRequest): Promise<ParlantOrchestrationResult>

// Execute multiple orchestrations in parallel
executeParallelOrchestrations(requests: ParlantOrchestrationRequest[]): Promise<ParlantOrchestrationResult[]>

// Get execution status
getExecutionStatus(executionId: string): OrchestrationState | null

// Get execution result
getExecutionResult(executionId: string): ParlantOrchestrationResult | null

// Cancel execution
cancelExecution(executionId: string): Promise<boolean>

// Get performance metrics
getPerformanceMetrics(): any
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 **Email**: support@aiagent.dev
- 💬 **Discord**: [AIgent Community](https://discord.gg/aiagent)
- 📖 **Documentation**: [docs.aiagent.dev](https://docs.aiagent.dev)
- 🐛 **Issues**: [GitHub Issues](https://github.com/aiagent/orchestrator/issues)

## 🙏 Acknowledgments

- Parlant team for conversational AI integration
- NestJS community for the excellent framework
- All contributors who have helped build this package

---

Built with ❤️ by the AIgent Development Team