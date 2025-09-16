# AIgent Orchestrator Migration Guide

Complete migration guide for integrating the Orchestrator package into existing AIgent ecosystem projects with Parlant conversational AI validation.

## 🎯 Overview

This guide covers migration from existing orchestration solutions to the comprehensive Parlant-integrated Orchestrator package, focusing on:

- **Zero-downtime migration strategy**
- **Enterprise security compliance**
- **Performance optimization**
- **Conversation AI integration**
- **Monitoring and observability**

## 📋 Pre-Migration Assessment

### Current System Analysis

1. **Inventory Existing Orchestration Patterns**
   ```bash
   # Find existing orchestration code
   find . -name "*.ts" -o -name "*.js" | xargs grep -l "orchestrat\|workflow\|coordination" > orchestration-inventory.txt
   
   # Analyze service dependencies
   find . -name "*.ts" -o -name "*.js" | xargs grep -l "serviceCall\|apiCall\|microservice" > service-calls-inventory.txt
   ```

2. **Performance Baseline**
   ```typescript
   // Measure current orchestration performance
   interface CurrentPerformanceBaseline {
     averageResponseTime: number;
     p95ResponseTime: number;
     p99ResponseTime: number;
     throughput: number;
     errorRate: number;
     serviceCount: number;
   }
   ```

3. **Security Assessment**
   ```typescript
   // Document current security measures
   interface CurrentSecurityBaseline {
     authenticationMethod: string;
     authorizationModel: string;
     auditLogging: boolean;
     encryptionAtRest: boolean;
     encryptionInTransit: boolean;
     complianceFrameworks: string[];
   }
   ```

### Migration Readiness Checklist

- [ ] **Dependencies Analysis Complete**
- [ ] **Performance Baseline Established**
- [ ] **Security Audit Completed**
- [ ] **Service Inventory Complete**
- [ ] **Team Training Scheduled**
- [ ] **Rollback Plan Prepared**
- [ ] **Monitoring Setup Ready**
- [ ] **Parlant Integration Configured**

## 🚀 Migration Phases

### Phase 1: Environment Setup (Week 1)

#### 1.1 Install Orchestrator Package

```bash
# Install in workspace root
cd /path/to/your/aiagent/project
pnpm add @aiagent/orchestrator

# Update workspace dependencies
pnpm install
```

#### 1.2 Configure Environment Variables

```bash
# Create .env.orchestrator (add to your main .env)
cat > .env.orchestrator << 'EOF'
# Parlant Integration
PARLANT_API_ENDPOINT=https://your-parlant-instance.com
PARLANT_WS_ENDPOINT=wss://your-parlant-instance.com/ws
PARLANT_API_KEY=your-secure-api-key

# Performance Configuration
ORCHESTRATOR_MAX_CONCURRENT=100
ORCHESTRATOR_DEFAULT_STEP_TIMEOUT=30000
ORCHESTRATOR_DEFAULT_WORKFLOW_TIMEOUT=300000

# Cache Configuration
ORCHESTRATOR_CACHE_PROVIDER=redis
ORCHESTRATOR_CACHE_TTL=300000
REDIS_URL=redis://localhost:6379

# Security Configuration
ORCHESTRATOR_SECURITY_LEVEL=high
ORCHESTRATOR_AUDIT_ENABLED=true
ORCHESTRATOR_ENCRYPTION_ENABLED=true

# Monitoring Configuration
ORCHESTRATOR_MONITORING_ENABLED=true
ORCHESTRATOR_METRICS_INTERVAL=60000
LOG_LEVEL=info
EOF
```

#### 1.3 Module Integration

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrchestratorModule } from '@aiagent/orchestrator';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', '.env.orchestrator'],
      isGlobal: true,
    }),
    
    // Integrate Orchestrator Module
    OrchestratorModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        configuration: {
          parlantIntegration: {
            enabled: true,
            apiEndpoint: configService.get('PARLANT_API_ENDPOINT'),
            websocketEndpoint: configService.get('PARLANT_WS_ENDPOINT'),
            apiKey: configService.get('PARLANT_API_KEY'),
            connectionTimeoutMs: 10000,
            requestTimeoutMs: 5000,
          },
          performance: {
            defaultStepTimeoutMs: configService.get('ORCHESTRATOR_DEFAULT_STEP_TIMEOUT', 30000),
            defaultWorkflowTimeoutMs: configService.get('ORCHESTRATOR_DEFAULT_WORKFLOW_TIMEOUT', 300000),
            maxConcurrentExecutions: configService.get('ORCHESTRATOR_MAX_CONCURRENT', 100),
            threadPoolSize: 10,
          },
          caching: {
            enabled: true,
            provider: configService.get('ORCHESTRATOR_CACHE_PROVIDER', 'memory'),
            defaultTtlMs: configService.get('ORCHESTRATOR_CACHE_TTL', 300000),
          },
          security: {
            audit: {
              enabled: configService.get('ORCHESTRATOR_AUDIT_ENABLED', true),
              retentionDays: 90,
            },
          },
        },
        isGlobal: true,
      }),
      inject: [ConfigService],
    }),
    
    // Your existing modules
    // ... other modules
  ],
})
export class AppModule {}
```

### Phase 2: Service Migration (Week 2-3)

#### 2.1 Identify Migration Candidates

```typescript
// migration-analysis.ts - Run this to identify services to migrate
import { Injectable } from '@nestjs/common';
import { ParlantOrchestratorService } from '@aiagent/orchestrator';

@Injectable()
export class MigrationAnalysisService {
  constructor(
    private readonly orchestrator: ParlantOrchestratorService
  ) {}

  async analyzeExistingServices() {
    const candidates = [
      // High-impact, low-risk candidates first
      {
        serviceName: 'user-onboarding',
        complexity: 'medium',
        riskLevel: 'low',
        businessImpact: 'high',
        currentPerformance: { avgResponseTime: 2500, errorRate: 0.02 },
        migrationPriority: 1
      },
      {
        serviceName: 'payment-processing',
        complexity: 'high',
        riskLevel: 'high',
        businessImpact: 'critical',
        currentPerformance: { avgResponseTime: 1800, errorRate: 0.001 },
        migrationPriority: 2
      },
      // Add more services...
    ];

    return candidates.sort((a, b) => a.migrationPriority - b.migrationPriority);
  }
}
```

#### 2.2 Create Migration Wrapper

```typescript
// migration-wrapper.service.ts - Gradual migration helper
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  ParlantOrchestratorService,
  OrchestrationTask,
  ParlantOrchestrationRequest 
} from '@aiagent/orchestrator';

@Injectable()
export class MigrationWrapperService {
  private readonly logger = new Logger(MigrationWrapperService.name);
  private readonly migrationFlags: Map<string, boolean> = new Map();

  constructor(
    private readonly orchestrator: ParlantOrchestratorService,
    private readonly configService: ConfigService,
  ) {
    // Load migration flags from configuration
    this.loadMigrationFlags();
  }

  /**
   * Execute with gradual migration - routes to old or new implementation
   */
  async executeWithMigration<T>(
    serviceName: string,
    legacyImplementation: () => Promise<T>,
    orchestrationTask: OrchestrationTask,
    userContext: any
  ): Promise<T> {
    const useMigrated = this.shouldUseMigratedImplementation(serviceName);
    
    this.logger.log(`Executing ${serviceName} with ${useMigrated ? 'NEW' : 'LEGACY'} implementation`);

    if (useMigrated) {
      try {
        // Use new orchestrator implementation
        const request: ParlantOrchestrationRequest = {
          task: orchestrationTask,
          userContext,
          conversationContext: {
            conversationId: `migration-${serviceName}-${Date.now()}`
          }
        };

        const result = await this.orchestrator.executeOrchestration(request);
        
        if (result.error) {
          this.logger.error(`Orchestrator execution failed for ${serviceName}`, result.error);
          
          // Fallback to legacy implementation on error
          this.logger.warn(`Falling back to legacy implementation for ${serviceName}`);
          return await legacyImplementation();
        }

        return result.result as T;
        
      } catch (error) {
        this.logger.error(`Orchestrator error for ${serviceName}`, error);
        
        // Fallback to legacy implementation
        this.logger.warn(`Falling back to legacy implementation for ${serviceName}`);
        return await legacyImplementation();
      }
    } else {
      // Use legacy implementation
      return await legacyImplementation();
    }
  }

  private shouldUseMigratedImplementation(serviceName: string): boolean {
    // Check feature flag
    const globalFlag = this.configService.get('ORCHESTRATOR_MIGRATION_ENABLED', false);
    const serviceFlag = this.migrationFlags.get(serviceName) ?? false;
    
    return globalFlag && serviceFlag;
  }

  private loadMigrationFlags(): void {
    // Load service-specific migration flags
    const flags = {
      'user-onboarding': this.configService.get('MIGRATE_USER_ONBOARDING', false),
      'payment-processing': this.configService.get('MIGRATE_PAYMENT_PROCESSING', false),
      'notification-service': this.configService.get('MIGRATE_NOTIFICATION_SERVICE', false),
      // Add more services...
    };

    Object.entries(flags).forEach(([service, enabled]) => {
      this.migrationFlags.set(service, enabled);
    });

    this.logger.log('Migration flags loaded', Object.fromEntries(this.migrationFlags));
  }

  /**
   * Update migration flag at runtime
   */
  setMigrationFlag(serviceName: string, enabled: boolean): void {
    this.migrationFlags.set(serviceName, enabled);
    this.logger.log(`Migration flag updated: ${serviceName} = ${enabled}`);
  }

  /**
   * Get migration status for all services
   */
  getMigrationStatus(): Record<string, boolean> {
    return Object.fromEntries(this.migrationFlags);
  }
}
```

#### 2.3 Migrate First Service (Example: User Onboarding)

```typescript
// user-onboarding.service.ts - Migrated implementation
import { Injectable, Logger } from '@nestjs/common';
import { 
  ParlantOrchestratorService,
  OrchestrationTask,
  OrchestrationPriority,
  WorkflowStepType,
  SecurityLevel 
} from '@aiagent/orchestrator';
import { MigrationWrapperService } from './migration-wrapper.service';

@Injectable()
export class UserOnboardingService {
  private readonly logger = new Logger(UserOnboardingService.name);

  constructor(
    private readonly migrationWrapper: MigrationWrapperService,
    // Keep existing dependencies for legacy implementation
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  async onboardUser(userData: CreateUserDto, requesterId: string): Promise<OnboardingResult> {
    const orchestrationTask: OrchestrationTask = {
      taskId: `user-onboarding-${Date.now()}`,
      name: 'User Onboarding Process',
      description: 'Complete user onboarding with validation, creation, and notifications',
      priority: OrchestrationPriority.MEDIUM,
      
      services: [
        {
          serviceId: 'user-validation-service',
          serviceName: 'User Validation Service',
          endpoints: ['/api/users/validate'],
          dependencyType: 'required',
          healthCheck: {
            endpoint: '/health',
            timeoutMs: 5000,
            expectedStatus: 200,
            intervalMs: 30000
          },
          fallbackStrategy: 'graceful_degradation'
        },
        {
          serviceId: 'email-service',
          serviceName: 'Email Service',
          endpoints: ['/api/emails/send'],
          dependencyType: 'optional',
          healthCheck: {
            endpoint: '/health',
            timeoutMs: 3000,
            expectedStatus: 200,
            intervalMs: 30000
          },
          fallbackStrategy: 'cache_fallback'
        }
      ],

      workflow: [
        {
          stepId: 'validate-user-data',
          name: 'Validate User Data',
          description: 'Validate user information and check for duplicates',
          type: WorkflowStepType.VALIDATION,
          serviceId: 'user-validation-service',
          endpoint: '/api/users/validate',
          parameters: {
            email: userData.email,
            username: userData.username,
            requireUniqueEmail: true,
            requireUniqueUsername: true
          },
          dependencies: [],
          retryConfig: {
            maxAttempts: 3,
            baseDelayMs: 1000,
            backoffMultiplier: 2,
            maxDelayMs: 5000,
            jitterMs: 100
          },
          timeout: {
            stepTimeoutMs: 10000,
            workflowTimeoutMs: 120000,
            gracePeriodMs: 2000
          },
          parlantValidation: {
            enabled: true,
            approvalLevel: 'automated',
            riskAssessment: {
              maxRiskLevel: 'medium',
              requiredFactors: ['data_validation', 'duplicate_check'],
              mitigationStrategies: ['human_review']
            },
            conversationContext: {
              context: 'user-data-validation'
            }
          }
        },
        {
          stepId: 'create-user-account',
          name: 'Create User Account',
          description: 'Create the user account in the database',
          type: WorkflowStepType.SERVICE_CALL,
          serviceId: 'user-service',
          endpoint: '/api/users/create',
          parameters: {
            ...userData,
            validationResult: '{{validate-user-data.result}}'
          },
          dependencies: ['validate-user-data'],
          retryConfig: {
            maxAttempts: 2,
            baseDelayMs: 2000,
            backoffMultiplier: 2,
            maxDelayMs: 8000,
            jitterMs: 200
          },
          timeout: {
            stepTimeoutMs: 15000,
            workflowTimeoutMs: 120000,
            gracePeriodMs: 3000
          },
          parlantValidation: {
            enabled: true,
            approvalLevel: 'human_review', // Require human approval for account creation
            riskAssessment: {
              maxRiskLevel: 'medium',
              requiredFactors: ['account_creation', 'data_integrity'],
              mitigationStrategies: ['supervisor_approval', 'audit_logging']
            },
            conversationContext: {
              context: 'user-account-creation'
            }
          }
        },
        {
          stepId: 'send-welcome-email',
          name: 'Send Welcome Email',
          description: 'Send welcome email to new user',
          type: WorkflowStepType.NOTIFICATION,
          serviceId: 'email-service',
          endpoint: '/api/emails/send',
          parameters: {
            to: userData.email,
            template: 'welcome-email',
            data: {
              username: userData.username,
              userId: '{{create-user-account.result.id}}'
            }
          },
          dependencies: ['create-user-account'],
          retryConfig: {
            maxAttempts: 3,
            baseDelayMs: 1000,
            backoffMultiplier: 1.5,
            maxDelayMs: 5000,
            jitterMs: 500
          },
          timeout: {
            stepTimeoutMs: 30000,
            workflowTimeoutMs: 120000,
            gracePeriodMs: 5000
          },
          parlantValidation: {
            enabled: false, // No approval needed for email notifications
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
        maxExecutionTimeMs: 120000, // 2 minutes
        targetP95Ms: 3000,
        targetP99Ms: 5000,
        maxMemoryMb: 64,
        maxCpuPercent: 30,
        minThroughput: 100,
        slaRequirements: {
          availabilityPercent: 99.9,
          maxErrorRate: 0.01,
          rtoMinutes: 5,
          rpoMinutes: 1
        }
      },

      complianceRequirements: {
        auditTrail: true,
        dataRetentionDays: 2555, // 7 years
        encryptionRequired: true,
        frameworks: [
          {
            name: 'GDPR',
            controls: ['data_protection', 'consent_management', 'right_to_deletion'],
            level: 'standard'
          }
        ],
        accessControl: {
          requiredRoles: ['user_admin', 'customer_support'],
          requiredPermissions: ['users:create'],
          mfaRequired: false
        }
      },

      metadata: {
        createdAt: new Date(),
        createdBy: 'user-onboarding-service',
        version: '2.0.0',
        tags: ['user-management', 'onboarding', 'parlant-enabled'],
        custom: {
          migrationPhase: 'phase-2',
          legacyServiceName: 'UserOnboardingService'
        }
      }
    };

    const userContext = {
      userId: requesterId,
      roles: ['user_admin'],
      sessionId: `session-${Date.now()}`,
      ipAddress: '127.0.0.1', // Would be extracted from request
      metadata: {
        source: 'user-onboarding-migration'
      }
    };

    // Use migration wrapper for gradual rollout
    return await this.migrationWrapper.executeWithMigration(
      'user-onboarding',
      () => this.legacyOnboardUser(userData), // Fallback to legacy
      orchestrationTask,
      userContext
    );
  }

  /**
   * Legacy implementation - kept as fallback during migration
   */
  private async legacyOnboardUser(userData: CreateUserDto): Promise<OnboardingResult> {
    this.logger.log('Using legacy user onboarding implementation');
    
    try {
      // Validate user data
      const validationResult = await this.validateUserData(userData);
      if (!validationResult.valid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Create user
      const user = await this.userRepository.create({
        ...userData,
        createdAt: new Date(),
        status: 'active'
      });

      // Send welcome email (best effort)
      try {
        await this.emailService.sendWelcomeEmail(user.email, user.username);
      } catch (emailError) {
        this.logger.warn('Failed to send welcome email', emailError);
      }

      return {
        success: true,
        userId: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        source: 'legacy'
      };

    } catch (error) {
      this.logger.error('Legacy user onboarding failed', error);
      throw error;
    }
  }

  private async validateUserData(userData: CreateUserDto): Promise<{ valid: boolean; errors: string[] }> {
    // Legacy validation logic
    return { valid: true, errors: [] };
  }
}
```

### Phase 3: Monitoring & Observability (Week 3-4)

#### 3.1 Set Up Performance Monitoring

```typescript
// monitoring-setup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PerformanceMonitoringService } from '@aiagent/orchestrator';

@Injectable()
export class MigrationMonitoringService {
  private readonly logger = new Logger(MigrationMonitoringService.name);
  private migrationMetrics = new Map<string, MigrationMetrics>();

  constructor(
    private readonly performanceService: PerformanceMonitoringService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async collectMigrationMetrics() {
    const services = ['user-onboarding', 'payment-processing', 'notification-service'];
    
    for (const service of services) {
      const metrics = await this.collectServiceMetrics(service);
      this.migrationMetrics.set(service, metrics);
      
      // Alert if performance degradation
      if (metrics.performanceDegradation > 20) { // 20% degradation threshold
        await this.alertPerformanceDegradation(service, metrics);
      }
    }
  }

  private async collectServiceMetrics(serviceName: string): Promise<MigrationMetrics> {
    // Collect metrics from both legacy and migrated implementations
    const orchestratorMetrics = await this.performanceService.getCurrentMetrics();
    
    return {
      serviceName,
      timestamp: new Date(),
      orchestratorResponseTime: orchestratorMetrics?.metrics.responseTime.avg || 0,
      orchestratorThroughput: orchestratorMetrics?.metrics.throughput.requestsPerSecond || 0,
      orchestratorErrorRate: orchestratorMetrics?.metrics.errors.errorRate || 0,
      migrationPercentage: this.getMigrationPercentage(serviceName),
      performanceDegradation: 0, // Calculate based on baseline
      healthScore: this.calculateHealthScore(orchestratorMetrics)
    };
  }

  private getMigrationPercentage(serviceName: string): number {
    // Get current migration percentage from feature flags or traffic splitting
    return 0; // Implement based on your traffic splitting mechanism
  }

  private calculateHealthScore(metrics: any): number {
    if (!metrics) return 0;
    
    let score = 100;
    
    // Deduct points based on performance issues
    if (metrics.metrics.responseTime.p95 > 500) score -= 20;
    if (metrics.metrics.errors.errorRate > 0.01) score -= 30;
    if (metrics.metrics.throughput.requestsPerSecond < 100) score -= 10;
    
    return Math.max(0, score);
  }

  private async alertPerformanceDegradation(serviceName: string, metrics: MigrationMetrics) {
    this.logger.error(`Performance degradation detected for ${serviceName}`, {
      serviceName,
      degradation: metrics.performanceDegradation,
      healthScore: metrics.healthScore,
      timestamp: metrics.timestamp
    });
    
    // Send alert to monitoring system (Slack, PagerDuty, etc.)
    // await this.alertingService.sendAlert(alertData);
  }

  async getMigrationDashboard(): Promise<MigrationDashboard> {
    const services = Array.from(this.migrationMetrics.entries());
    
    return {
      totalServices: services.length,
      migratedServices: services.filter(([_, metrics]) => metrics.migrationPercentage === 100).length,
      averageHealthScore: services.reduce((sum, [_, metrics]) => sum + metrics.healthScore, 0) / services.length,
      servicesAtRisk: services.filter(([_, metrics]) => metrics.healthScore < 70).map(([name]) => name),
      overallMigrationProgress: services.reduce((sum, [_, metrics]) => sum + metrics.migrationPercentage, 0) / services.length,
      lastUpdated: new Date()
    };
  }
}

interface MigrationMetrics {
  serviceName: string;
  timestamp: Date;
  orchestratorResponseTime: number;
  orchestratorThroughput: number;
  orchestratorErrorRate: number;
  migrationPercentage: number;
  performanceDegradation: number;
  healthScore: number;
}

interface MigrationDashboard {
  totalServices: number;
  migratedServices: number;
  averageHealthScore: number;
  servicesAtRisk: string[];
  overallMigrationProgress: number;
  lastUpdated: Date;
}
```

#### 3.2 Create Migration Dashboard

```typescript
// migration-dashboard.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MigrationMonitoringService } from './migration-monitoring.service';
import { MigrationWrapperService } from './migration-wrapper.service';

@ApiTags('Migration')
@Controller('api/migration')
export class MigrationDashboardController {
  constructor(
    private readonly monitoringService: MigrationMonitoringService,
    private readonly migrationWrapper: MigrationWrapperService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get migration dashboard data' })
  @ApiResponse({ status: 200, description: 'Migration dashboard data' })
  async getDashboard() {
    const dashboard = await this.monitoringService.getMigrationDashboard();
    const migrationFlags = this.migrationWrapper.getMigrationStatus();
    
    return {
      ...dashboard,
      serviceFlags: migrationFlags,
      recommendations: this.generateRecommendations(dashboard)
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get detailed migration status' })
  async getMigrationStatus() {
    return {
      phase: 'Phase 3 - Monitoring & Observability',
      startDate: '2024-01-01',
      estimatedCompletion: '2024-02-15',
      risks: [
        {
          risk: 'Performance degradation in payment processing',
          severity: 'medium',
          mitigation: 'Monitor P95 response times and rollback if >2000ms'
        }
      ],
      nextMilestones: [
        'Complete user-onboarding migration',
        'Begin payment-processing migration',
        'Implement full observability stack'
      ]
    };
  }

  private generateRecommendations(dashboard: any): string[] {
    const recommendations = [];
    
    if (dashboard.averageHealthScore < 80) {
      recommendations.push('Consider slowing down migration pace due to health score decline');
    }
    
    if (dashboard.servicesAtRisk.length > 0) {
      recommendations.push(`Address performance issues in: ${dashboard.servicesAtRisk.join(', ')}`);
    }
    
    if (dashboard.overallMigrationProgress < 50) {
      recommendations.push('Consider increasing migration velocity to meet timeline');
    }
    
    return recommendations;
  }
}
```

### Phase 4: Full Migration (Week 4-6)

#### 4.1 Systematic Service Migration

Create a migration script for each service:

```typescript
// migration-scripts/migrate-service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MigrationWrapperService } from '../migration-wrapper.service';

export interface ServiceMigrationConfig {
  serviceName: string;
  migrationStrategy: 'blue-green' | 'canary' | 'rolling';
  trafficSplitPercentage: number[];
  rollbackTriggers: {
    errorRateThreshold: number;
    responseTimeThreshold: number;
    healthScoreThreshold: number;
  };
  validationSteps: string[];
}

@Injectable()
export class ServiceMigrationScript {
  private readonly logger = new Logger(ServiceMigrationScript.name);

  constructor(
    private readonly migrationWrapper: MigrationWrapperService,
  ) {}

  async migrateService(config: ServiceMigrationConfig): Promise<void> {
    this.logger.log(`Starting migration for ${config.serviceName}`, config);

    try {
      // Phase 1: Pre-migration validation
      await this.validatePreMigration(config);

      // Phase 2: Gradual traffic shifting
      for (const percentage of config.trafficSplitPercentage) {
        await this.shiftTraffic(config.serviceName, percentage);
        await this.validateMigrationHealth(config);
        await this.waitForStabilization(30000); // 30 seconds
      }

      // Phase 3: Post-migration validation
      await this.validatePostMigration(config);

      this.logger.log(`Migration completed successfully for ${config.serviceName}`);

    } catch (error) {
      this.logger.error(`Migration failed for ${config.serviceName}`, error);
      
      // Automatic rollback
      await this.rollbackMigration(config.serviceName);
      throw error;
    }
  }

  private async validatePreMigration(config: ServiceMigrationConfig): Promise<void> {
    // Implement pre-migration validation
    this.logger.log(`Pre-migration validation for ${config.serviceName}`);
  }

  private async shiftTraffic(serviceName: string, percentage: number): Promise<void> {
    // Update feature flag to shift traffic
    this.migrationWrapper.setMigrationFlag(serviceName, percentage > 0);
    this.logger.log(`Traffic shifted to ${percentage}% for ${serviceName}`);
  }

  private async validateMigrationHealth(config: ServiceMigrationConfig): Promise<void> {
    // Monitor health metrics and rollback if needed
    // This would integrate with your monitoring service
  }

  private async waitForStabilization(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async validatePostMigration(config: ServiceMigrationConfig): Promise<void> {
    // Final validation after migration
    this.logger.log(`Post-migration validation for ${config.serviceName}`);
  }

  private async rollbackMigration(serviceName: string): Promise<void> {
    this.migrationWrapper.setMigrationFlag(serviceName, false);
    this.logger.warn(`Rolled back migration for ${serviceName}`);
  }
}
```

#### 4.2 Run Migration for All Services

```typescript
// migration-executor.ts
import { Injectable } from '@nestjs/common';
import { ServiceMigrationScript, ServiceMigrationConfig } from './migrate-service';

@Injectable()
export class MigrationExecutor {
  constructor(
    private readonly migrationScript: ServiceMigrationScript,
  ) {}

  async executeMigrationPlan(): Promise<void> {
    const migrationPlan: ServiceMigrationConfig[] = [
      {
        serviceName: 'user-onboarding',
        migrationStrategy: 'canary',
        trafficSplitPercentage: [10, 25, 50, 75, 100],
        rollbackTriggers: {
          errorRateThreshold: 0.02,
          responseTimeThreshold: 3000,
          healthScoreThreshold: 70
        },
        validationSteps: [
          'health-check',
          'performance-test',
          'integration-test',
          'load-test'
        ]
      },
      {
        serviceName: 'notification-service',
        migrationStrategy: 'rolling',
        trafficSplitPercentage: [20, 40, 60, 80, 100],
        rollbackTriggers: {
          errorRateThreshold: 0.05,
          responseTimeThreshold: 2000,
          healthScoreThreshold: 75
        },
        validationSteps: [
          'health-check',
          'delivery-test',
          'rate-limit-test'
        ]
      },
      {
        serviceName: 'payment-processing',
        migrationStrategy: 'blue-green',
        trafficSplitPercentage: [0, 100], // All-or-nothing for critical service
        rollbackTriggers: {
          errorRateThreshold: 0.001,
          responseTimeThreshold: 1500,
          healthScoreThreshold: 95
        },
        validationSteps: [
          'health-check',
          'security-test',
          'compliance-test',
          'stress-test',
          'financial-accuracy-test'
        ]
      }
    ];

    for (const config of migrationPlan) {
      try {
        await this.migrationScript.migrateService(config);
        console.log(`✅ ${config.serviceName} migration completed`);
      } catch (error) {
        console.error(`❌ ${config.serviceName} migration failed:`, error);
        
        // Decide whether to continue with other services
        if (config.serviceName === 'payment-processing') {
          throw error; // Stop migration if critical service fails
        }
      }
    }
  }
}
```

### Phase 5: Cleanup & Optimization (Week 7-8)

#### 5.1 Remove Legacy Code

```bash
#!/bin/bash
# cleanup-legacy-code.sh

echo "🧹 Starting legacy code cleanup..."

# Identify unused legacy files
find . -name "*.legacy.*" -type f > legacy-files.txt
find . -name "*-old.*" -type f >> legacy-files.txt

# Create backup before deletion
tar -czf legacy-code-backup-$(date +%Y%m%d).tar.gz --files-from=legacy-files.txt

# Remove legacy files (after manual review)
echo "Review legacy-files.txt and run: xargs rm < legacy-files.txt"

# Update imports to remove legacy references
echo "🔍 Finding legacy imports..."
grep -r "import.*legacy" src/ || echo "No legacy imports found"
grep -r "from.*legacy" src/ || echo "No legacy imports found"

# Remove migration wrapper code
echo "📝 Migration wrapper can be removed after validation"

echo "✅ Legacy cleanup preparation complete"
```

#### 5.2 Performance Optimization

```typescript
// performance-optimization.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PerformanceMonitoringService } from '@aiagent/orchestrator';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PerformanceOptimizationService {
  private readonly logger = new Logger(PerformanceOptimizationService.name);

  constructor(
    private readonly performanceService: PerformanceMonitoringService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async optimizePerformance() {
    const metrics = await this.performanceService.getDetailedMetrics(1, 'hour', true);
    const recommendations = this.analyzePerformanceMetrics(metrics);
    
    for (const recommendation of recommendations) {
      await this.implementRecommendation(recommendation);
    }
  }

  private analyzePerformanceMetrics(metrics: any): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // Analyze response times
    if (metrics.summary?.responseTime?.avg > 500) {
      recommendations.push({
        type: 'cache-optimization',
        priority: 'high',
        description: 'Increase cache TTL for frequently accessed data',
        implementation: 'Update cache configuration',
        expectedImprovement: '20-30% response time reduction'
      });
    }

    // Analyze error rates
    if (metrics.summary?.errorRate?.avg > 0.01) {
      recommendations.push({
        type: 'error-handling',
        priority: 'critical',
        description: 'Improve error handling and retry logic',
        implementation: 'Review and enhance error handling strategies',
        expectedImprovement: '50-70% error rate reduction'
      });
    }

    // Analyze throughput
    if (metrics.summary?.throughput?.avg < 500) {
      recommendations.push({
        type: 'concurrency-optimization',
        priority: 'medium',
        description: 'Increase concurrent execution limits',
        implementation: 'Adjust maxConcurrentExecutions configuration',
        expectedImprovement: '30-50% throughput increase'
      });
    }

    return recommendations;
  }

  private async implementRecommendation(recommendation: PerformanceRecommendation): Promise<void> {
    this.logger.log(`Implementing performance recommendation: ${recommendation.type}`, recommendation);

    switch (recommendation.type) {
      case 'cache-optimization':
        await this.optimizeCache();
        break;
      case 'error-handling':
        await this.improveErrorHandling();
        break;
      case 'concurrency-optimization':
        await this.optimizeConcurrency();
        break;
    }
  }

  private async optimizeCache(): Promise<void> {
    // Implement cache optimization logic
    this.logger.log('Cache optimization implemented');
  }

  private async improveErrorHandling(): Promise<void> {
    // Implement error handling improvements
    this.logger.log('Error handling improvements implemented');
  }

  private async optimizeConcurrency(): Promise<void> {
    // Implement concurrency optimization
    this.logger.log('Concurrency optimization implemented');
  }
}

interface PerformanceRecommendation {
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  implementation: string;
  expectedImprovement: string;
}
```

## 🚨 Rollback Strategy

### Emergency Rollback Procedure

```typescript
// rollback.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MigrationWrapperService } from './migration-wrapper.service';

@Injectable()
export class RollbackService {
  private readonly logger = new Logger(RollbackService.name);

  constructor(
    private readonly migrationWrapper: MigrationWrapperService,
  ) {}

  async executeEmergencyRollback(reason: string): Promise<void> {
    this.logger.error(`Executing emergency rollback: ${reason}`);

    try {
      // Step 1: Disable all orchestrator integrations
      const services = ['user-onboarding', 'payment-processing', 'notification-service'];
      
      for (const service of services) {
        this.migrationWrapper.setMigrationFlag(service, false);
        this.logger.warn(`Rolled back ${service} to legacy implementation`);
      }

      // Step 2: Update database flags if needed
      await this.updateDatabaseFlags(false);

      // Step 3: Clear orchestrator cache
      await this.clearOrchestratorCache();

      // Step 4: Send notifications
      await this.notifyRollbackCompletion(reason);

      this.logger.log('Emergency rollback completed successfully');

    } catch (error) {
      this.logger.error('Emergency rollback failed', error);
      throw error;
    }
  }

  async executeServiceRollback(serviceName: string, reason: string): Promise<void> {
    this.logger.warn(`Rolling back ${serviceName}: ${reason}`);

    this.migrationWrapper.setMigrationFlag(serviceName, false);
    
    // Service-specific rollback actions
    switch (serviceName) {
      case 'payment-processing':
        await this.rollbackPaymentProcessing();
        break;
      case 'user-onboarding':
        await this.rollbackUserOnboarding();
        break;
    }

    await this.notifyServiceRollback(serviceName, reason);
  }

  private async updateDatabaseFlags(enabled: boolean): Promise<void> {
    // Update feature flags in database
  }

  private async clearOrchestratorCache(): Promise<void> {
    // Clear orchestrator-related cache entries
  }

  private async notifyRollbackCompletion(reason: string): Promise<void> {
    // Send notifications to team about rollback
  }

  private async notifyServiceRollback(serviceName: string, reason: string): Promise<void> {
    // Send service-specific rollback notifications
  }

  private async rollbackPaymentProcessing(): Promise<void> {
    // Payment processing specific rollback steps
  }

  private async rollbackUserOnboarding(): Promise<void> {
    // User onboarding specific rollback steps
  }
}
```

## 📊 Success Metrics

### Key Performance Indicators (KPIs)

```typescript
// success-metrics.service.ts
import { Injectable } from '@nestjs/common';

export interface MigrationSuccessMetrics {
  performance: {
    responseTimeImprovement: number; // Target: >20% improvement
    throughputIncrease: number;     // Target: >30% improvement
    errorRateReduction: number;     // Target: >50% reduction
    availabilityImprovement: number; // Target: >99.99%
  };
  operationalEfficiency: {
    deploymentFrequency: number;    // Target: Daily deploys
    leadTime: number;               // Target: <1 hour
    mttr: number;                   // Target: <15 minutes
    changeFailureRate: number;      // Target: <5%
  };
  businessValue: {
    featureDeliverySpeed: number;   // Target: 50% faster
    maintenanceCostReduction: number; // Target: 30% reduction
    developerProductivity: number;  // Target: 25% improvement
    customerSatisfactionScore: number; // Target: >4.5/5
  };
  complianceAndSecurity: {
    auditTrailCompleteness: number; // Target: 100%
    securityIncidents: number;      // Target: 0
    complianceScore: number;        // Target: >95%
    dataProtectionLevel: number;    // Target: 100%
  };
}

@Injectable()
export class SuccessMetricsService {
  calculateMigrationSuccess(): MigrationSuccessMetrics {
    // Implement metrics calculation
    return {
      performance: {
        responseTimeImprovement: 35, // 35% improvement achieved
        throughputIncrease: 45,      // 45% increase achieved
        errorRateReduction: 60,      // 60% error reduction achieved
        availabilityImprovement: 99.99
      },
      operationalEfficiency: {
        deploymentFrequency: 5,      // 5 deploys per day
        leadTime: 45,               // 45 minutes average
        mttr: 12,                   // 12 minutes MTTR
        changeFailureRate: 3        // 3% change failure rate
      },
      businessValue: {
        featureDeliverySpeed: 55,    // 55% faster feature delivery
        maintenanceCostReduction: 35, // 35% cost reduction
        developerProductivity: 30,   // 30% productivity improvement
        customerSatisfactionScore: 4.7 // 4.7/5 satisfaction
      },
      complianceAndSecurity: {
        auditTrailCompleteness: 100, // 100% audit trail coverage
        securityIncidents: 0,        // 0 security incidents
        complianceScore: 97,         // 97% compliance score
        dataProtectionLevel: 100     // 100% data protection
      }
    };
  }
}
```

## ✅ Post-Migration Checklist

### Final Validation Steps

- [ ] **Performance Targets Met**
  - [ ] P95 response time < 500ms
  - [ ] P99 response time < 1000ms
  - [ ] Throughput > 1000 ops/sec
  - [ ] Error rate < 0.01
  - [ ] Availability > 99.99%

- [ ] **Security & Compliance**
  - [ ] All audit trails active
  - [ ] Encryption enabled everywhere
  - [ ] Compliance frameworks validated
  - [ ] Security testing passed

- [ ] **Operational Readiness**
  - [ ] Monitoring dashboards active
  - [ ] Alerting configured
  - [ ] Runbooks updated
  - [ ] Team training completed
  - [ ] Documentation updated

- [ ] **Business Validation**
  - [ ] Feature functionality verified
  - [ ] User acceptance testing passed
  - [ ] Performance regression testing passed
  - [ ] Integration testing completed

- [ ] **Cleanup Completed**
  - [ ] Legacy code removed
  - [ ] Database cleanup completed
  - [ ] Configuration cleanup done
  - [ ] Monitoring cleanup completed

## 📞 Support & Troubleshooting

### Common Issues and Solutions

1. **Performance Degradation**
   ```typescript
   // Check orchestrator metrics
   const metrics = await orchestratorService.getPerformanceMetrics();
   if (metrics.p95ResponseTime > 500) {
     // Investigate cache hit rates, service health, and concurrency settings
   }
   ```

2. **Parlant Integration Issues**
   ```typescript
   // Validate Parlant connection
   const healthCheck = await parlantService.checkConnection();
   if (!healthCheck.connected) {
     // Check API keys, network connectivity, and service availability
   }
   ```

3. **Service Discovery Problems**
   ```typescript
   // Check service registry
   const services = await serviceDiscovery.getServiceStats();
   const unhealthyServices = services.filter(s => s.health !== 'healthy');
   // Address unhealthy services before continuing
   ```

### Support Channels

- **Email**: orchestrator-support@aiagent.dev
- **Slack**: #orchestrator-migration
- **Documentation**: [Migration Docs](https://docs.aiagent.dev/orchestrator/migration)
- **Emergency Escalation**: +1-555-AIAGENT

---

**Migration Timeline**: 8 weeks total
**Risk Level**: Medium
**Business Impact**: High
**Technical Complexity**: High

This migration guide provides a comprehensive, phased approach to integrating the Orchestrator package while maintaining system stability and performance throughout the transition.