# Parlant Authentication & Authorization Usage Examples

**Implementation Guide for Parlant-Enhanced Authentication & Authorization**

This document provides comprehensive usage examples for the Parlant Authentication & Authorization integration, demonstrating how to implement conversational AI-powered security across different scenarios.

---

## Table of Contents

1. [Basic Module Setup](#basic-module-setup)
2. [Conversational Authentication Examples](#conversational-authentication-examples)
3. [Enhanced Authorization Examples](#enhanced-authorization-examples)
4. [Multi-Factor Authentication Examples](#multi-factor-authentication-examples)
5. [Risk-Based Security Examples](#risk-based-security-examples)
6. [Middleware Integration Examples](#middleware-integration-examples)
7. [Advanced Configuration Examples](#advanced-configuration-examples)

---

## Basic Module Setup

### 1. Simple Module Registration

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ParlantAuthModule } from '@bytebot/shared';

@Module({
  imports: [
    // Basic Parlant Auth integration
    ParlantAuthModule.forRoot({
      enableConversationalAuth: true,
      enableConversationalAuthz: true,
      enableConversationalMFA: true,
    }),
  ],
})
export class AppModule {}
```

### 2. Environment-Based Configuration

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  ParlantAuthModule, 
  createEnvironmentConfig 
} from '@bytebot/shared';

@Module({
  imports: [
    // Environment-based configuration
    ParlantAuthModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ...createEnvironmentConfig(),
        // Override specific settings
        riskAssessment: {
          enabled: true,
          thresholds: {
            low: configService.get<number>('RISK_LOW_THRESHOLD', 30),
            medium: configService.get<number>('RISK_MEDIUM_THRESHOLD', 60),
            high: configService.get<number>('RISK_HIGH_THRESHOLD', 80),
            critical: configService.get<number>('RISK_CRITICAL_THRESHOLD', 95),
          },
        },
        security: {
          jwtSecret: configService.get<string>('JWT_SECRET'),
          jwtExpiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
          auditLogging: configService.get<boolean>('ENABLE_AUDIT_LOGGING', true),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 3. Feature-Specific Module

```typescript
// auth.module.ts
import { Module } from '@nestjs/common';
import { ParlantAuthModule } from '@bytebot/shared';

@Module({
  imports: [
    // Only enable specific features
    ParlantAuthModule.forFeature({
      auth: true,        // Conversational authentication
      authz: true,       // Conversational authorization
      mfa: true,         // Conversational MFA
      riskAssessment: true, // Risk-based security
    }),
  ],
  // Re-export for other modules
  exports: [ParlantAuthModule],
})
export class AuthModule {}
```

---

## Conversational Authentication Examples

### 1. Basic Conversational Login

```typescript
// auth.controller.ts
import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { 
  ParlantEnhancedAuthService,
  ConversationalAuthContext,
  AuthenticationMethod,
} from '@bytebot/shared';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly parlantAuthService: ParlantEnhancedAuthService,
  ) {}

  @Post('login')
  async conversationalLogin(
    @Body() credentials: LoginCredentials,
    @Req() req: Request,
  ) {
    // Build authentication context
    const authContext: ConversationalAuthContext = {
      userId: credentials.email,
      authMethod: AuthenticationMethod.PASSWORD,
      riskAssessment: await this.assessLoginRisk(credentials, req),
      requestMetadata: {
        requestId: `login-${Date.now()}`,
        ipAddress: this.getClientIP(req),
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
      },
      securityContext: {
        isPrivilegedAccount: await this.isPrivilegedAccount(credentials.email),
        accountSecurityLevel: FunctionSecurityLevel.RESTRICTED,
        recentSecurityEvents: [],
        securityRestrictions: [],
        complianceRequirements: ['SOC2', 'GDPR'],
      },
    };

    // Perform conversational authentication
    const result = await this.parlantAuthService.validateConversationalAuthentication(
      credentials,
      authContext,
    );

    if (result.success) {
      return {
        success: true,
        tokens: result.tokens,
        conversationId: result.conversationContext?.conversationId,
        requiredActions: result.requiredActions,
      };
    } else {
      return {
        success: false,
        error: result.error,
        conversationId: result.conversationContext?.conversationId,
      };
    }
  }
}
```

### 2. High-Risk Authentication Flow

```typescript
// high-risk-auth.controller.ts
import { Controller, Post, UseGuards } from '@nestjs/common';
import { 
  ParlantEnhancedAuthService,
  ParlantValidation,
  SecurityClassification,
  ConversationContext,
} from '@bytebot/shared';

@Controller('admin/auth')
export class HighRiskAuthController {
  constructor(
    private readonly parlantAuthService: ParlantEnhancedAuthService,
  ) {}

  @Post('admin-login')
  @ParlantValidation({
    mode: ValidationMode.INTERACTIVE,
    approvalLevel: ApprovalLevel.DUAL_APPROVAL,
    timeout: 120000,
  })
  @SecurityClassification({
    securityLevel: FunctionSecurityLevel.SECRET,
    riskLevel: RiskLevel.CRITICAL,
  })
  @ConversationContext({
    topic: 'Administrator Authentication',
    priority: ConversationPriority.CRITICAL,
    requiredParticipants: [ParticipantRole.APPROVER, ParticipantRole.VALIDATOR],
  })
  async adminLogin(@Body() credentials: AdminCredentials) {
    const authContext: ConversationalAuthContext = {
      userId: credentials.email,
      authMethod: AuthenticationMethod.PASSWORD,
      riskAssessment: {
        overallRiskScore: 85, // High risk for admin accounts
        riskLevel: RiskLevel.CRITICAL,
        riskFactors: [
          {
            type: RiskFactorType.PRIVILEGE_ESCALATION,
            score: 40,
            description: 'Administrator account access',
            critical: true,
          },
        ],
        requiresConversation: true,
        assessedAt: new Date(),
      },
      requestMetadata: {
        requestId: `admin-login-${Date.now()}`,
        timestamp: new Date(),
      },
      securityContext: {
        isPrivilegedAccount: true,
        accountSecurityLevel: FunctionSecurityLevel.SECRET,
        recentSecurityEvents: [],
        securityRestrictions: [],
        complianceRequirements: ['SOC2', 'GDPR', 'HIPAA'],
      },
    };

    return this.parlantAuthService.validateHighRiskAuthentication(
      credentials,
      authContext,
    );
  }
}
```

---

## Enhanced Authorization Examples

### 1. Conversational RBAC Guard Usage

```typescript
// protected.controller.ts
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { 
  ParlantEnhancedRBACGuard,
  Roles,
  RequirePermissions,
  ParlantValidation,
  SecurityClassification,
} from '@bytebot/shared';

@Controller('protected')
@UseGuards(ParlantEnhancedRBACGuard)
export class ProtectedController {
  
  // Standard protected endpoint
  @Get('data')
  @Roles('user', 'admin')
  @RequirePermissions('read_data')
  async getData() {
    return { message: 'Protected data accessed successfully' };
  }

  // High-security operation requiring conversational approval
  @Post('sensitive-operation')
  @Roles('admin')
  @RequirePermissions('admin', 'sensitive_operations')
  @ParlantValidation({
    mode: ValidationMode.INTERACTIVE,
    approvalLevel: ApprovalLevel.SINGLE_APPROVAL,
    timeout: 45000,
  })
  @SecurityClassification({
    securityLevel: FunctionSecurityLevel.RESTRICTED,
    riskLevel: RiskLevel.HIGH,
  })
  async performSensitiveOperation(@Body() operationData: any) {
    // This endpoint requires real-time conversational approval
    return { 
      message: 'Sensitive operation completed',
      operationId: `op-${Date.now()}`,
    };
  }

  // Critical operation requiring dual approval
  @Post('critical-system-change')
  @Roles('super_admin')
  @RequirePermissions('system_admin', 'critical_operations')
  @ParlantValidation({
    mode: ValidationMode.INTERACTIVE,
    approvalLevel: ApprovalLevel.DUAL_APPROVAL,
    timeout: 300000, // 5 minutes for critical operations
  })
  @SecurityClassification({
    securityLevel: FunctionSecurityLevel.SECRET,
    riskLevel: RiskLevel.CRITICAL,
  })
  async performCriticalSystemChange(@Body() changeData: any) {
    // Requires dual conversational approval
    return {
      message: 'Critical system change authorized',
      changeId: `change-${Date.now()}`,
    };
  }
}
```

### 2. Custom Authorization Context

```typescript
// custom-auth.service.ts
import { Injectable } from '@nestjs/common';
import { 
  ParlantEnhancedRBACGuard,
  ConversationalAuthorizationContext,
} from '@bytebot/shared';

@Injectable()
export class CustomAuthService {
  constructor(
    private readonly parlantRBACGuard: ParlantEnhancedRBACGuard,
  ) {}

  async authorizeBusinessOperation(
    user: User,
    operation: BusinessOperation,
    context: RequestContext,
  ): Promise<boolean> {
    // Build custom authorization context
    const authzContext: ConversationalAuthorizationContext = {
      executionContext: context.executionContext,
      user,
      rbacMetadata: {
        roles: ['business_user'],
        permissions: ['business_operations'],
        adminOnly: false,
        auditAccess: true,
      },
      riskAssessment: {
        riskScore: this.calculateBusinessRisk(operation),
        riskFactors: [
          {
            type: AuthorizationRiskType.HIGH_VALUE_OPERATION,
            contribution: 35,
            description: `Business operation: ${operation.type}`,
            critical: operation.value > 10000,
          },
        ],
        riskLevel: operation.value > 10000 ? RiskLevel.HIGH : RiskLevel.MODERATE,
        requiresConversation: operation.value > 10000,
        assessedAt: new Date(),
      },
      securityContext: {
        isPrivilegedOperation: operation.requiresApproval,
        securityClassification: FunctionSecurityLevel.RESTRICTED,
        activePolicies: [],
        complianceRequirements: ['SOX', 'GDPR'],
        auditRequired: true,
      },
      performanceContext: {
        startTime: new Date(),
        targetResponseTime: 1000,
        cacheStrategy: CacheStrategy.INTELLIGENT,
        performanceRequirements: [],
      },
    };

    // Perform conversational authorization
    const result = await this.parlantRBACGuard.performConversationalAuthorization(
      authzContext,
      `auth-${Date.now()}`,
    );

    return result.granted;
  }
}
```

---

## Multi-Factor Authentication Examples

### 1. Basic MFA Setup

```typescript
// mfa.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { 
  ParlantMFAService,
  MFAMethod,
  MFASetupRequest,
} from '@bytebot/shared';

@Controller('auth/mfa')
export class MFAController {
  constructor(
    private readonly parlantMFAService: ParlantMFAService,
  ) {}

  @Post('setup')
  async setupMFA(@Body() setupData: SetupMFADto) {
    const setupRequest: MFASetupRequest = {
      userId: setupData.userId,
      method: setupData.method as MFAMethod,
      parameters: {
        phoneNumber: setupData.phoneNumber,
        email: setupData.email,
      },
      context: {
        clientInfo: {
          ipAddress: setupData.clientIP,
          userAgent: setupData.userAgent,
        },
        securityContext: {
          classification: FunctionSecurityLevel.INTERNAL,
          threatIndicators: [],
          activePolicies: [],
          complianceRequirements: ['SOC2'],
        },
      },
    };

    const result = await this.parlantMFAService.setupConversationalMFA(
      setupRequest,
    );

    return {
      success: result.success,
      setupId: result.setupId,
      setupData: result.setupData,
      nextSteps: result.nextSteps,
      conversationId: result.conversationContext?.conversationId,
    };
  }

  @Post('challenge')
  async createMFAChallenge(@Body() challengeData: CreateMFAChallengeDto) {
    const authContext = {
      sessionId: challengeData.sessionId,
      primaryAuthMethod: 'password',
      requestMetadata: {
        clientIp: challengeData.clientIP,
        userAgent: challengeData.userAgent,
      },
      securityContext: {
        classification: FunctionSecurityLevel.RESTRICTED,
        threatIndicators: [],
        activePolicies: [],
        complianceRequirements: ['SOC2'],
      },
    };

    const challenge = await this.parlantMFAService.createConversationalMFAChallenge(
      challengeData.userId,
      challengeData.method as MFAMethod,
      authContext,
    );

    return {
      challengeId: challenge.challengeId,
      method: challenge.method,
      expiresAt: challenge.expiresAt,
      conversationId: challenge.conversationId,
      riskScore: challenge.riskAssessment.riskScore,
    };
  }

  @Post('verify')
  async verifyMFA(@Body() verificationData: VerifyMFADto) {
    const validationRequest = {
      challengeId: verificationData.challengeId,
      response: verificationData.code,
      timestamp: new Date(),
      context: {
        clientInfo: {
          ipAddress: verificationData.clientIP,
          userAgent: verificationData.userAgent,
        },
      },
    };

    const result = await this.parlantMFAService.validateConversationalMFA(
      validationRequest,
    );

    return {
      valid: result.valid,
      remainingAttempts: result.remainingAttempts,
      error: result.error,
      conversationId: result.conversationId,
      requiredActions: result.requiredActions,
    };
  }
}
```

### 2. High-Risk MFA Flow

```typescript
// high-risk-mfa.service.ts
import { Injectable } from '@nestjs/common';
import { 
  ParlantMFAService,
  ParlantValidation,
  SecurityClassification,
  ConversationContext,
} from '@bytebot/shared';

@Injectable()
export class HighRiskMFAService {
  constructor(
    private readonly parlantMFAService: ParlantMFAService,
  ) {}

  @ParlantValidation({
    mode: ValidationMode.INTERACTIVE,
    approvalLevel: ApprovalLevel.DUAL_APPROVAL,
    timeout: 300000, // 5 minutes for high-risk MFA
  })
  @SecurityClassification({
    securityLevel: FunctionSecurityLevel.SECRET,
    riskLevel: RiskLevel.CRITICAL,
  })
  @ConversationContext({
    topic: 'High-Risk Transaction MFA',
    priority: ConversationPriority.CRITICAL,
    requiredParticipants: [
      ParticipantRole.APPROVER,
      ParticipantRole.VALIDATOR,
      ParticipantRole.MODERATOR,
    ],
  })
  async initiateHighRiskTransactionMFA(
    userId: string,
    transactionData: HighRiskTransaction,
  ) {
    const authContext = {
      sessionId: transactionData.sessionId,
      primaryAuthMethod: 'password',
      requestMetadata: {
        transactionAmount: transactionData.amount,
        transactionType: transactionData.type,
      },
      securityContext: {
        classification: FunctionSecurityLevel.SECRET,
        threatIndicators: this.assessTransactionThreats(transactionData),
        activePolicies: ['ANTI_FRAUD', 'HIGH_VALUE_TRANSACTION'],
        complianceRequirements: ['SOX', 'AML', 'KYC'],
      },
    };

    // Use high-risk MFA with enhanced security
    const challenge = await this.parlantMFAService.initiateHighRiskMFA(
      userId,
      authContext,
    );

    // Log high-risk transaction attempt
    await this.logHighRiskTransaction(userId, transactionData, challenge);

    return {
      challengeId: challenge.challengeId,
      method: challenge.method,
      riskLevel: challenge.riskAssessment.riskLevel,
      conversationId: challenge.conversationId,
      additionalSecurityMeasures: [
        'enhanced_monitoring',
        'transaction_hold',
        'compliance_review',
      ],
    };
  }

  private assessTransactionThreats(transaction: HighRiskTransaction) {
    const threats = [];
    
    if (transaction.amount > 50000) {
      threats.push({
        type: ThreatIndicatorType.HIGH_VALUE_TRANSACTION,
        severity: ThreatSeverity.HIGH,
        description: `High-value transaction: $${transaction.amount}`,
        detectedAt: new Date(),
      });
    }

    return threats;
  }
}
```

---

## Risk-Based Security Examples

### 1. Dynamic Risk Assessment

```typescript
// risk-assessment.service.ts
import { Injectable } from '@nestjs/common';
import { 
  ParlantEnhancedAuthService,
  RiskLevel,
  RiskFactorType,
} from '@bytebot/shared';

@Injectable()
export class RiskAssessmentService {
  constructor(
    private readonly parlantAuthService: ParlantEnhancedAuthService,
  ) {}

  async performDynamicRiskAssessment(
    userId: string,
    request: SecurityRequest,
  ) {
    // Collect risk signals
    const riskFactors = await this.collectRiskSignals(userId, request);
    
    // Calculate overall risk score
    const overallRisk = this.calculateRiskScore(riskFactors);
    
    // Determine risk level and required actions
    const riskLevel = this.determineRiskLevel(overallRisk);
    const requiredActions = this.determineRequiredActions(riskLevel, riskFactors);

    const riskAssessment = {
      overallRiskScore: overallRisk,
      riskFactors,
      riskLevel,
      requiresConversation: overallRisk >= 50, // Medium risk threshold
      assessedAt: new Date(),
    };

    // If high risk, initiate conversational validation
    if (riskLevel >= RiskLevel.HIGH) {
      const authContext = {
        userId,
        authMethod: AuthenticationMethod.CERTIFICATE,
        riskAssessment,
        requestMetadata: {
          requestId: `risk-${Date.now()}`,
          ipAddress: request.clientIP,
          timestamp: new Date(),
        },
        securityContext: {
          isPrivilegedAccount: await this.isPrivilegedUser(userId),
          accountSecurityLevel: FunctionSecurityLevel.RESTRICTED,
          recentSecurityEvents: await this.getRecentSecurityEvents(userId),
          securityRestrictions: [],
          complianceRequirements: ['SOC2', 'ISO27001'],
        },
      };

      // Trigger conversational validation for high-risk scenarios
      return this.parlantAuthService.validateConversationalAuthentication(
        { riskOverride: true },
        authContext,
      );
    }

    return {
      riskAssessment,
      requiredActions,
      conversationRequired: false,
    };
  }

  private async collectRiskSignals(userId: string, request: SecurityRequest) {
    const signals = [];

    // Geographic risk
    const locationRisk = await this.assessLocationRisk(userId, request.clientIP);
    if (locationRisk.score > 0) {
      signals.push({
        type: RiskFactorType.UNUSUAL_LOCATION,
        score: locationRisk.score,
        description: locationRisk.description,
        critical: locationRisk.score > 40,
      });
    }

    // Device risk
    const deviceRisk = await this.assessDeviceRisk(userId, request.deviceFingerprint);
    if (deviceRisk.score > 0) {
      signals.push({
        type: RiskFactorType.NEW_DEVICE,
        score: deviceRisk.score,
        description: deviceRisk.description,
        critical: deviceRisk.score > 30,
      });
    }

    // Behavioral risk
    const behavioralRisk = await this.assessBehavioralRisk(userId, request);
    if (behavioralRisk.score > 0) {
      signals.push({
        type: RiskFactorType.SUSPICIOUS_PATTERN,
        score: behavioralRisk.score,
        description: behavioralRisk.description,
        critical: behavioralRisk.score > 35,
      });
    }

    return signals;
  }
}
```

### 2. Adaptive Security Controls

```typescript
// adaptive-security.service.ts
import { Injectable } from '@nestjs/common';
import { 
  ParlantEnhancedAuthMiddleware,
  SecurityMeasureType,
  ThreatLevel,
} from '@bytebot/shared';

@Injectable()
export class AdaptiveSecurityService {
  constructor(
    private readonly parlantAuthMiddleware: ParlantEnhancedAuthMiddleware,
  ) {}

  async applyAdaptiveSecurityControls(
    request: SecurityRequest,
    riskAssessment: RiskAssessment,
  ) {
    const securityMeasures = [];

    // Apply measures based on risk level
    switch (riskAssessment.riskLevel) {
      case RiskLevel.CRITICAL:
        securityMeasures.push(
          {
            type: SecurityMeasureType.CONVERSATION_REQUIRED,
            parameters: {
              approvalLevel: ApprovalLevel.COMMITTEE_APPROVAL,
              timeout: 600000, // 10 minutes
            },
            appliedAt: new Date(),
          },
          {
            type: SecurityMeasureType.ENHANCED_LOGGING,
            parameters: {
              logLevel: 'TRACE',
              includeContext: true,
            },
            appliedAt: new Date(),
          },
          {
            type: SecurityMeasureType.SESSION_MONITORING,
            parameters: {
              monitoringLevel: 'INTENSIVE',
              alertThreshold: 'LOW',
            },
            appliedAt: new Date(),
          },
        );
        break;

      case RiskLevel.HIGH:
        securityMeasures.push(
          {
            type: SecurityMeasureType.MFA_REQUIRED,
            parameters: {
              methods: ['hardware_token', 'biometric'],
              timeout: 120000,
            },
            appliedAt: new Date(),
          },
          {
            type: SecurityMeasureType.RATE_LIMITING,
            parameters: {
              requestsPerMinute: 10,
              burstLimit: 20,
            },
            appliedAt: new Date(),
          },
        );
        break;

      case RiskLevel.MODERATE:
        securityMeasures.push(
          {
            type: SecurityMeasureType.MFA_REQUIRED,
            parameters: {
              methods: ['sms', 'email', 'totp'],
              timeout: 300000,
            },
            appliedAt: new Date(),
          },
        );
        break;
    }

    // Apply IP-based restrictions for suspicious locations
    const suspiciousLocationFactor = riskAssessment.riskFactors.find(
      f => f.type === RiskFactorType.UNUSUAL_LOCATION && f.critical,
    );

    if (suspiciousLocationFactor) {
      securityMeasures.push({
        type: SecurityMeasureType.IP_FILTERING,
        parameters: {
          allowedIPs: await this.getTrustedIPs(request.userId),
          blockSuspiciousRanges: true,
        },
        appliedAt: new Date(),
      });
    }

    // Store and apply security measures
    await this.storeSecurityMeasures(request.sessionId, securityMeasures);
    await this.applySecurityMeasures(request, securityMeasures);

    return {
      applied: securityMeasures,
      threatLevel: this.determineThreatLevel(riskAssessment),
      nextReview: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    };
  }

  private determineThreatLevel(riskAssessment: RiskAssessment): ThreatLevel {
    if (riskAssessment.riskLevel === RiskLevel.CRITICAL) return ThreatLevel.CRITICAL;
    if (riskAssessment.riskLevel === RiskLevel.HIGH) return ThreatLevel.HIGH;
    if (riskAssessment.riskLevel === RiskLevel.MODERATE) return ThreatLevel.MEDIUM;
    return ThreatLevel.LOW;
  }
}
```

---

## Middleware Integration Examples

### 1. Application-Wide Middleware Setup

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ParlantEnhancedAuthMiddleware } from '@bytebot/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Apply Parlant authentication middleware globally
  const parlantAuthMiddleware = app.get(ParlantEnhancedAuthMiddleware);
  app.use('/api', parlantAuthMiddleware.use.bind(parlantAuthMiddleware));
  
  // Apply to specific routes that require enhanced security
  app.use('/admin/*', parlantAuthMiddleware.use.bind(parlantAuthMiddleware));
  app.use('/api/sensitive/*', parlantAuthMiddleware.use.bind(parlantAuthMiddleware));
  
  await app.listen(3000);
}

bootstrap();
```

### 2. Selective Middleware Application

```typescript
// auth-routing.module.ts
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ParlantEnhancedAuthMiddleware } from '@bytebot/shared';
import { AuthController } from './auth.controller';
import { AdminController } from './admin.controller';

@Module({
  controllers: [AuthController, AdminController],
})
export class AuthRoutingModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ParlantEnhancedAuthMiddleware)
      .forRoutes(
        // Apply to all admin routes
        { path: 'admin/*', method: RequestMethod.ALL },
        
        // Apply to sensitive auth operations
        { path: 'auth/change-password', method: RequestMethod.POST },
        { path: 'auth/delete-account', method: RequestMethod.DELETE },
        
        // Apply to high-value operations
        { path: 'transactions/wire-transfer', method: RequestMethod.POST },
        { path: 'users/privilege-escalation', method: RequestMethod.PUT },
      );
  }
}
```

### 3. Conditional Middleware Application

```typescript
// conditional-auth.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { 
  ParlantEnhancedAuthMiddleware,
  ParlantAuthenticatedRequest,
} from '@bytebot/shared';

@Injectable()
export class ConditionalAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly parlantAuthMiddleware: ParlantEnhancedAuthMiddleware,
  ) {}

  async use(
    req: ParlantAuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    // Apply Parlant auth only for specific conditions
    const shouldApplyParlantAuth = this.shouldApplyEnhancedAuth(req);
    
    if (shouldApplyParlantAuth) {
      // Use Parlant enhanced authentication
      return this.parlantAuthMiddleware.use(req, res, next);
    } else {
      // Use standard authentication middleware
      return this.standardAuthMiddleware.use(req, res, next);
    }
  }

  private shouldApplyEnhancedAuth(req: ParlantAuthenticatedRequest): boolean {
    // Apply enhanced auth for:
    
    // 1. High-risk IP addresses
    const clientIP = this.getClientIP(req);
    if (this.isHighRiskIP(clientIP)) {
      return true;
    }

    // 2. Sensitive endpoints
    const sensitivePaths = [
      '/admin',
      '/api/users',
      '/api/transactions',
      '/api/system',
    ];
    if (sensitivePaths.some(path => req.url?.startsWith(path))) {
      return true;
    }

    // 3. Non-business hours
    const hour = new Date().getHours();
    if (hour < 6 || hour > 20) {
      return true;
    }

    // 4. High-frequency requests (potential abuse)
    if (this.isHighFrequencyRequest(req)) {
      return true;
    }

    return false;
  }
}
```

---

## Advanced Configuration Examples

### 1. Production Configuration

```typescript
// config/parlant-auth.config.ts
import { ParlantAuthModuleOptions } from '@bytebot/shared';

export const productionParlantAuthConfig: ParlantAuthModuleOptions = {
  // Enable all conversational features in production
  enableConversationalAuth: true,
  enableConversationalAuthz: true,
  enableConversationalMFA: true,

  // Strict risk assessment
  riskAssessment: {
    enabled: true,
    thresholds: {
      low: 20,      // More sensitive thresholds
      medium: 40,
      high: 70,
      critical: 85,
    },
  },

  // Enhanced MFA settings
  mfa: {
    challengeExpiry: 180000,    // 3 minutes (shorter for security)
    maxAttempts: 2,             // Fewer attempts allowed
    supportedMethods: [
      'hardware_token',         // Prefer hardware tokens
      'totp',
      'biometric',
      'sms',                    // SMS as fallback only
    ],
  },

  // Optimized conversation settings
  conversation: {
    timeout: 45000,             // 45 seconds for production
    cacheTTL: 180000,           // 3 minutes cache
  },

  // Performance optimization
  performance: {
    caching: true,
    cacheTTL: 300000,           // 5 minutes
    targetResponseTime: 300,    // Aggressive 300ms target
  },

  // Enhanced security
  security: {
    jwtSecret: process.env.JWT_SECRET_PRODUCTION,
    jwtExpiresIn: '10m',        // Shorter token lifetime
    auditLogging: true,
  },

  // Limited fallback in production
  fallback: {
    enabled: true,
    timeout: 2000,              // Quick fallback timeout
  },
};

// Development configuration
export const developmentParlantAuthConfig: ParlantAuthModuleOptions = {
  enableConversationalAuth: true,
  enableConversationalAuthz: false,   // Disabled in dev for faster iteration
  enableConversationalMFA: false,     // Disabled in dev

  riskAssessment: {
    enabled: false,                    // Disabled in dev
  },

  mfa: {
    challengeExpiry: 600000,           // 10 minutes (longer for dev)
    maxAttempts: 5,                    // More attempts in dev
    supportedMethods: ['email'],       // Simple method for dev
  },

  conversation: {
    timeout: 60000,                    // 1 minute for dev testing
    cacheTTL: 60000,                   // 1 minute cache
  },

  performance: {
    caching: false,                    // Disable caching in dev
    targetResponseTime: 1000,          // Relaxed timing
  },

  security: {
    jwtSecret: 'dev-secret-key',
    jwtExpiresIn: '1h',               // Longer tokens in dev
    auditLogging: false,              // Disabled in dev
  },

  fallback: {
    enabled: true,
    timeout: 10000,                   // Longer fallback in dev
  },
};
```

### 2. Environment-Specific Module Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  ParlantAuthModule,
  validateParlantAuthConfig,
} from '@bytebot/shared';
import {
  productionParlantAuthConfig,
  developmentParlantAuthConfig,
} from './config/parlant-auth.config';

@Module({
  imports: [
    ParlantAuthModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const environment = configService.get<string>('NODE_ENV', 'development');
        
        let config;
        switch (environment) {
          case 'production':
            config = {
              ...productionParlantAuthConfig,
              // Override with environment variables
              security: {
                ...productionParlantAuthConfig.security,
                jwtSecret: configService.get<string>('JWT_SECRET'),
              },
            };
            break;
            
          case 'staging':
            config = {
              ...productionParlantAuthConfig,
              // Staging-specific overrides
              conversation: {
                timeout: 60000,     // Longer timeout for staging testing
                cacheTTL: 600000,   // 10 minutes cache
              },
            };
            break;
            
          default:
            config = developmentParlantAuthConfig;
        }

        // Validate configuration
        try {
          validateParlantAuthConfig(config);
        } catch (error) {
          throw new Error(`Invalid Parlant Auth configuration: ${error.message}`);
        }

        return config;
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 3. Custom Risk Assessment Configuration

```typescript
// config/risk-assessment.config.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class CustomRiskAssessmentConfig {
  // Industry-specific risk factors
  getFinancialServicesRiskConfig() {
    return {
      riskAssessment: {
        enabled: true,
        thresholds: {
          low: 15,        // Very sensitive for financial services
          medium: 30,
          high: 60,
          critical: 80,
        },
        customFactors: [
          {
            name: 'transaction_amount',
            weight: 0.4,    // High weight for transaction amount
            thresholds: {
              low: 1000,
              medium: 10000,
              high: 50000,
              critical: 100000,
            },
          },
          {
            name: 'cross_border_transaction',
            weight: 0.3,
            triggers: ['different_country', 'sanctions_list'],
          },
          {
            name: 'unusual_time',
            weight: 0.2,
            parameters: {
              businessHoursStart: 9,
              businessHoursEnd: 17,
              weekendsHighRisk: true,
            },
          },
        ],
      },
    };
  }

  // Healthcare-specific configuration
  getHealthcareRiskConfig() {
    return {
      riskAssessment: {
        enabled: true,
        thresholds: {
          low: 25,
          medium: 45,
          high: 70,
          critical: 90,
        },
        customFactors: [
          {
            name: 'patient_data_access',
            weight: 0.5,    // High weight for patient data
            triggers: ['bulk_access', 'sensitive_conditions'],
          },
          {
            name: 'role_escalation',
            weight: 0.3,
            triggers: ['temp_privileges', 'emergency_access'],
          },
        ],
        complianceRequirements: ['HIPAA', 'HITECH'],
      },
    };
  }

  // E-commerce configuration
  getEcommerceRiskConfig() {
    return {
      riskAssessment: {
        enabled: true,
        thresholds: {
          low: 30,
          medium: 50,
          high: 75,
          critical: 90,
        },
        customFactors: [
          {
            name: 'order_value',
            weight: 0.3,
            thresholds: {
              low: 100,
              medium: 500,
              high: 2000,
              critical: 5000,
            },
          },
          {
            name: 'shipping_address',
            weight: 0.2,
            triggers: ['new_address', 'high_risk_country'],
          },
          {
            name: 'payment_method',
            weight: 0.2,
            triggers: ['new_card', 'gift_card', 'cryptocurrency'],
          },
        ],
      },
    };
  }
}
```

---

## Conclusion

These examples demonstrate the comprehensive capabilities of the Parlant Authentication & Authorization integration. The system provides:

1. **Flexible Configuration**: Environment-specific settings and industry-specific risk assessments
2. **Conversational Security**: AI-powered authentication and authorization decisions
3. **Risk-Based Controls**: Dynamic security measures based on real-time risk assessment
4. **Seamless Integration**: Easy integration with existing NestJS applications
5. **Performance Optimization**: Intelligent caching and fallback mechanisms
6. **Compliance Ready**: Built-in audit trails and compliance framework support

The implementation allows developers to gradually adopt conversational AI security features while maintaining backward compatibility with existing authentication systems. The risk-based approach ensures that security measures are applied proportionally to the assessed threat level, balancing security with user experience.

For production deployments, it's recommended to:
- Start with basic conversational authentication
- Gradually enable authorization and MFA features
- Monitor performance and adjust thresholds based on usage patterns
- Implement comprehensive audit logging for compliance requirements
- Use environment-specific configurations for different deployment stages

This comprehensive implementation establishes Bytebot as an industry leader in AI-powered security systems, providing unprecedented protection while maintaining excellent user experience through intelligent, conversational security controls.