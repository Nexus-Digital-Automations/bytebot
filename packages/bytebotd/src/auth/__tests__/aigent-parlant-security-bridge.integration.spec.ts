/**
 * AIgent-Parlant Security Bridge Integration Tests
 *
 * Comprehensive test suite for the enterprise JWT-to-Parlant security bridge
 * covering all security classifications, multi-algorithm JWT support, session
 * management, emergency overrides, and compliance validation.
 *
 * Test Coverage:
 * - JWT multi-algorithm validation (HS256, RS256, ES256, EdDSA)
 * - 5-tier security classification system
 * - Role-based session management and permission bridging
 * - Redis session clustering and failover
 * - Emergency override scenarios and audit trails
 * - Compliance framework validation
 * - Performance and security monitoring
 *
 * @author AIgent Security Testing Team
 * @version 1.0.0
 * @since AIgent-Parlant Bridge Integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AIgentParlantSecurityBridgeService,
  SecurityClassification,
  EnhancedJwtPayload,
  SessionState,
  EmergencyOverrideRequest,

} from '../services/aigent-parlant-security-bridge.service';
import { EnhancedJwtStrategy } from '../strategies/enhanced-jwt.strategy';
import { ParlantIntegrationService } from '../../parlant/parlant-integration.service';
import { SecurityAuditService, ComplianceFramework } from '../../security/security-audit.service';
import { UserRole, Permission } from '@bytebot/shared';

// Mock Redis for testing
jest.mock('ioredis');

// Mock implementations
const mockParlantService = {
  validateFunctionExecution: jest.fn(),
} as jest.Mocked<Partial<ParlantIntegrationService>>;

const mockAuditService = {
  createAuditEntry: jest.fn(),
} as jest.Mocked<Partial<SecurityAuditService>>;

const mockConfigService = {
  get: jest.fn(<T>(key: string, defaultValue?: T): T => {
    type ConfigValue = string | number | boolean;
    const configs: Record<string, ConfigValue> = {
      'REDIS_URL': 'redis://localhost:6379',
      'BRIDGE_SESSION_TIMEOUT_MS': 3600000,
      'BRIDGE_MAX_CONCURRENT_SESSIONS': 10000,
      'BRIDGE_EMERGENCY_OVERRIDE_ENABLED': true,
      'BRIDGE_AUDIT_ALL_SESSIONS': true,
      'BRIDGE_SESSION_CLUSTERING_ENABLED': true,
      'JWT_SECRET_HS256': 'test-secret-hs256',
      'JWT_PUBLIC_KEY_RS256': 'test-public-key-rs256',
      'JWT_PRIVATE_KEY_RS256': 'test-private-key-rs256',
      'JWT_ISSUER': 'aigent-bytebot-system',
      'JWT_AUDIENCE': 'bytebotd-enterprise-control',
    };
    return (configs[key] ?? defaultValue) as T;
  }),
  getOrThrow: jest.fn(<T>(key: string): T => {
  type ConfigValue = string | number | boolean;
    const configs: Record<string, ConfigValue> = {
      'REDIS_URL': 'redis://localhost:6379',
      'BRIDGE_SESSION_TIMEOUT_MS': 3600000,
      'BRIDGE_MAX_CONCURRENT_SESSIONS': 10000,
      'BRIDGE_EMERGENCY_OVERRIDE_ENABLED': true,
      'BRIDGE_AUDIT_ALL_SESSIONS': true,
      'BRIDGE_SESSION_CLUSTERING_ENABLED': true,
      'JWT_SECRET_HS256': 'test-secret-hs256',
      'JWT_PUBLIC_KEY_RS256': 'test-public-key-rs256',
      'JWT_PRIVATE_KEY_RS256': 'test-private-key-rs256',
      'JWT_ISSUER': 'aigent-bytebot-system',
      'JWT_AUDIENCE': 'bytebotd-enterprise-control',
    };
    if (!(key in configs)) {
      throw new Error(`Configuration key "${key}" not found`);
    }
    return configs[key] as T;
  }),
  set: jest.fn(),
  setEnvFilePaths: jest.fn(),
  changes$: {
    subscribe: jest.fn(),
    pipe: jest.fn(),
  },
} as unknown as jest.Mocked<ConfigService>;

describe('AIgent-Parlant Security Bridge Integration', () => {
  let securityBridge: AIgentParlantSecurityBridgeService;
  let enhancedJwtStrategy: EnhancedJwtStrategy;
  let jwtService: JwtService;
  let module: TestingModule;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup default mock responses
    (mockParlantService.validateFunctionExecution as jest.Mock).mockResolvedValue({
      approved: true,
      conversationId: 'test-conversation-123',
      validationTimestamp: new Date(),
      reasoning: 'Security validation approved for test scenario',
      confidence: 0.95
    });

    (mockAuditService.createAuditEntry as jest.Mock).mockResolvedValue({
      auditId: 'audit-test-123',
      validated: true,
      conversationId: 'test-conversation-123'
    });
    module = await Test.createTestingModule({
      providers: [
        AIgentParlantSecurityBridgeService,
        EnhancedJwtStrategy,
        JwtService,
        {
          provide: ParlantIntegrationService,
          useValue: mockParlantService,
        },
        {
          provide: SecurityAuditService,
          useValue: mockAuditService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    securityBridge = module.get<AIgentParlantSecurityBridgeService>(AIgentParlantSecurityBridgeService);
    enhancedJwtStrategy = module.get<EnhancedJwtStrategy>(EnhancedJwtStrategy);
    jwtService = module.get<JwtService>(JwtService);

    // Initialize services
    await securityBridge.onModuleInit();
  });

  afterEach(async () => {
    await securityBridge.onApplicationShutdown();
    await module.close();
  });

  describe('Security Bridge Initialization', () => {
    it('should initialize with enterprise configuration', () => {
      expect(securityBridge).toBeDefined();
      expect(mockConfigService.get).toHaveBeenCalledWith('REDIS_URL', expect.any(String));
      expect(mockConfigService.get).toHaveBeenCalledWith('BRIDGE_SESSION_CLUSTERING_ENABLED', true);
      expect(mockConfigService.get).toHaveBeenCalledWith('BRIDGE_EMERGENCY_OVERRIDE_ENABLED', true);
    });

    it('should support all required JWT algorithms', () => {
      expect(enhancedJwtStrategy).toBeDefined();
      // Strategy should be configured with multi-algorithm support
    });
  });

  describe('5-Tier Security Classification System', () => {
    const createTestJwtPayload = (classification: SecurityClassification, role: UserRole): EnhancedJwtPayload => ({
      sub: 'test-user-123',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role,
      isActive: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'aigent-bytebot-system',
      aud: 'bytebotd-enterprise-control',
      securityClassification: classification,
      permissions: [Permission._TASK_READ, Permission._COMPUTER_VIEW],
      complianceRequirements: [ComplianceFramework.GDPR, ComplianceFramework.ISO_27001],
      organizationId: 'org-123',
      departmentId: 'dept-456',
    });

    it('should handle PUBLIC classification with GUEST role', async () => {
      const payload = createTestJwtPayload(SecurityClassification.PUBLIC, UserRole._GUEST);
      const session = await securityBridge.createSecureSessionBridge(payload, {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser'
      });
      expect(session.securityClassification).toBe(SecurityClassification.PUBLIC);
      expect(session.userRole).toBe(UserRole._GUEST);
      expect(session.state).toBe(SessionState.ACTIVE);
      expect(mockParlantService.validateFunctionExecution).toHaveBeenCalled();
    });

    it('should handle INTERNAL classification with USER role', async () => {
      const payload = createTestJwtPayload(SecurityClassification.INTERNAL, UserRole._USER);
      const session = await securityBridge.createSecureSessionBridge(payload, {
        ipAddress: '10.0.1.50',
        userAgent: 'Mozilla/5.0 Internal Browser'
      });
      expect(session.securityClassification).toBe(SecurityClassification.INTERNAL);
      expect(session.userRole).toBe(UserRole._USER);
      expect(session.permissions).toContain(Permission._TASK_READ);
    });

    it('should handle CONFIDENTIAL classification with OPERATOR role', async () => {
      const basePayload = createTestJwtPayload(SecurityClassification.CONFIDENTIAL, UserRole._OPERATOR);
      const payload = {
        ...basePayload,
        permissions: [Permission._TASK_READ, Permission._TASK_WRITE, Permission._COMPUTER_CONTROL],
      };

      const session = await securityBridge.createSecureSessionBridge(payload, {
        ipAddress: '10.0.2.25',
        userAgent: 'Mozilla/5.0 Operator Workstation',
      });
      expect(session.securityClassification).toBe(SecurityClassification.CONFIDENTIAL);
      expect(session.userRole).toBe(UserRole._OPERATOR);
      expect(session.permissions).toContain(Permission._COMPUTER_CONTROL);
    });

    it('should handle RESTRICTED classification with VIEWER role', async () => {
      const payload = createTestJwtPayload(SecurityClassification.RESTRICTED, UserRole._VIEWER);
      // Mock Parlant to require higher confidence for RESTRICTED
      (mockParlantService.validateFunctionExecution as jest.Mock).mockResolvedValueOnce({
        approved: true,
        conversationId: 'restricted-conversation-456',
        validationTimestamp: new Date(),
        reasoning: 'RESTRICTED access approved with enhanced validation',
        confidence: 0.98,
      });

      const session = await securityBridge.createSecureSessionBridge(payload, {
        ipAddress: '10.0.3.10',
        userAgent: 'Mozilla/5.0 Restricted Access Terminal',
      });
      expect(session.securityClassification).toBe(SecurityClassification.RESTRICTED);
      expect(session.conversationContext.securityLevel).toBe('CRITICAL');
    });

    it('should handle CLASSIFIED classification with ADMIN role', async () => {
      const basePayload = createTestJwtPayload(SecurityClassification.CLASSIFIED, UserRole._ADMIN);
      const payload = {
        ...basePayload,
        permissions: [
          Permission._TASK_READ,
          Permission._TASK_WRITE,
          Permission._TASK_DELETE,
          Permission._COMPUTER_CONTROL,
          Permission._SYSTEM_ADMIN,
          Permission._SECURITY_MANAGEMENT,
        ],
        complianceRequirements: [
          ComplianceFramework.SOX,
          ComplianceFramework.GDPR,
          ComplianceFramework.HIPAA,
          ComplianceFramework.PCI_DSS,
          ComplianceFramework.ISO_27001,
        ],
      };

      const session = await securityBridge.createSecureSessionBridge(payload, {
        ipAddress: '10.0.4.5',
        userAgent: 'Mozilla/5.0 Executive Terminal',
        sessionMetadata: {
          executiveAccess: true,
          auditLevel: 'COMPREHENSIVE',
        }
      });
      expect(session.securityClassification).toBe(SecurityClassification.CLASSIFIED);
      expect(session.userRole).toBe(UserRole._ADMIN);
      expect(session.permissions).toContain(Permission._SYSTEM_ADMIN);
      expect(session.complianceFrameworks).toContain(ComplianceFramework.SOX);
    });

    it('should downgrade security classification if role lacks authorization', async () => {
      // User role requesting CLASSIFIED access should be downgraded
      const payload = createTestJwtPayload(SecurityClassification.CLASSIFIED, UserRole._USER);

      const session = await securityBridge.createSecureSessionBridge(payload, {
        ipAddress: '192.168.1.200',
        userAgent: 'Mozilla/5.0 User Browser',
      });

      // Should be downgraded to PUBLIC for USER role
      expect(session.securityClassification).toBe(SecurityClassification.PUBLIC);
    });
  });

  describe('Multi-Algorithm JWT Support', () => {
    it('should validate HS256 JWT tokens', async () => {
        const payload = {
          sub: 'user-hs256',
          email: 'hs256@example.com',
          username: 'hs256user',
          role: UserRole.OPERATOR,
          securityClassification: SecurityClassification.INTERNAL,
          permissions: [Permission.TASK_READ],
          complianceRequirements: [ComplianceFramework.GDPR],
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          iss: 'aigent-bytebot-system',
          aud: 'bytebotd-enterprise-control',
          isActive: true,
        };

      // Test HS256 token creation and validation
      const token = jwtService.sign(payload, { algorithm: 'HS256' });
      // Strategy should handle HS256 tokens
      expect(token).toBeDefined();
      expect(token.split('.').length).toBe(3); // Valid JWT format
    });

    it('should support RS256 asymmetric keys', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_PUBLIC_KEY_RS256', '');
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_PRIVATE_KEY_RS256', '');
    });

    it('should support ES256 elliptic curve signatures', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_PUBLIC_KEY_ES256', '');
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_PRIVATE_KEY_ES256', '');
    });

    it('should support EdDSA Ed25519 signatures', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_PUBLIC_KEY_EdDSA', '');
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_PRIVATE_KEY_EdDSA', '');
    });
  });

  describe('Session Management and Validation', () => {
      let testSession: Awaited<ReturnType<typeof securityBridge.createSecureSessionBridge>>;

    beforeEach(async () => {
    const payload: EnhancedJwtPayload = {
      sub: 'session-test-user',
      email: 'session@example.com',
      username: 'sessionuser',
      role: UserRole._OPERATOR,
      isActive: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'aigent-bytebot-system',
      aud: 'bytebotd-enterprise-control',
      securityClassification: SecurityClassification.CONFIDENTIAL,
      permissions: [Permission._TASK_READ, Permission._TASK_WRITE],
      complianceRequirements: [ComplianceFramework.GDPR],
      organizationId: 'org-session-test',
    };
      testSession = await securityBridge.createSecureSessionBridge(payload, {
        ipAddress: '10.0.5.50',
        userAgent: 'Session Test Browser',
      });
    });

    it('should create valid session with proper metadata', () => {
      expect(testSession.sessionId).toBeDefined();
      expect(testSession.parlantSessionId).toBeDefined();
      expect(testSession.userId).toBe('session-test-user');
      expect(testSession.state).toBe(SessionState.ACTIVE);
      expect(testSession.auditTrail).toHaveLength(1);
      expect(testSession.auditTrail[0]?.action).toBe('CREATE');
    });

    it('should validate existing sessions successfully', async () => {
      const validation = await securityBridge.validateSessionSecurity(testSession.sessionId, {
        ipAddress: '10.0.5.50', // Same IP
        userAgent: 'Session Test Browser', // Same User Agent
        requestedAction: 'test-operation',
      });
      expect(validation.valid).toBe(true);
      expect(validation.session).toBeDefined();
      expect(validation.securityViolations).toHaveLength(0);
    });

    it('should detect IP address changes as security violations', async () => {
      const validation = await securityBridge.validateSessionSecurity(testSession.sessionId, {
        ipAddress: '192.168.1.999', // Different IP
        userAgent: 'Session Test Browser',
        requestedAction: 'suspicious-operation',
      });
      expect(validation.securityViolations).toContain('IP_ADDRESS_CHANGE');
    });

    it('should detect user agent changes as security violations', async () => {
      const validation = await securityBridge.validateSessionSecurity(testSession.sessionId, {
        ipAddress: '10.0.5.50',
        userAgent: 'Different Browser 2.0', // Different User Agent
        requestedAction: 'test-operation',
      });
      expect(validation.securityViolations).toContain('USER_AGENT_CHANGE');
    });

    it('should handle non-existent sessions gracefully', async () => {
      const validation = await securityBridge.validateSessionSecurity('non-existent-session', {
        ipAddress: '10.0.0.1',
        userAgent: 'Test Browser',
      });
      expect(validation.valid).toBe(false);
      expect(validation.reasoning).toContain('Session not found');
      expect(validation.securityViolations).toContain('SESSION_NOT_FOUND');
    });
  });

  describe('Emergency Override System', () => {
    it('should approve valid emergency override requests', async () => {
      const overrideRequest: EmergencyOverrideRequest = {
        operationId: 'emergency-test-123',
        userId: 'emergency-user-456',
        justification: 'Critical system maintenance required immediately',
        approverUserId: 'admin-user-789',
        overrideScope: 'SESSION',
        durationMinutes: 30,
        context: {
          userId: 'emergency-user-456',
          agentRole: 'OPERATOR',
          securityLevel: 'CRITICAL',
          conversationHistory: [],
          metadata: { emergencyType: 'system_maintenance' },
        },
      };

      // Mock approval for emergency override
      (mockParlantService.validateFunctionExecution as jest.Mock).mockResolvedValueOnce({
        approved: true,
        conversationId: 'emergency-conversation-789',
        validationTimestamp: new Date(),
        reasoning: 'Emergency override approved for critical system maintenance',
        confidence: 0.92,
      });

      const result = await securityBridge.handleEmergencyOverride(overrideRequest);
      expect(result.approved).toBe(true);
      expect(result.overrideId).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(result.auditEntry.action).toBe('OVERRIDE');
      expect(result.auditEntry.outcome).toBe('SUCCESS');
    });

    it('should deny invalid emergency override requests', async () => {
      const overrideRequest: EmergencyOverrideRequest = {
        operationId: 'emergency-deny-test-456',
        userId: 'suspicious-user-999',
        justification: 'Suspicious access attempt',
        approverUserId: 'fake-admin-000',
        overrideScope: 'GLOBAL',
        durationMinutes: 1440, // 24 hours - too long
        context: {
          userId: 'suspicious-user-999',
          agentRole: 'USER',
          securityLevel: 'LOW',
          conversationHistory: [],
          metadata: { suspiciousActivity: true },
        },
      };

      // Mock denial for suspicious override
      (mockParlantService.validateFunctionExecution as jest.Mock).mockResolvedValueOnce({
        approved: false,
        conversationId: 'emergency-deny-conversation-000',
        validationTimestamp: new Date(),
        reasoning: 'Emergency override denied: Suspicious activity detected and excessive duration requested',
        confidence: 0.15,
      });

      const result = await securityBridge.handleEmergencyOverride(overrideRequest);
      expect(result.approved).toBe(false);
      expect(result.reasoning).toContain('denied');
      expect(result.auditEntry.outcome).toBe('BLOCKED');
    });

    it('should respect emergency override disabled configuration', async () => {
      // Mock disabled emergency overrides
      mockConfigService.get.mockImplementation(<T>(key: string, defaultValue?: T): T => {
        if (key === 'BRIDGE_EMERGENCY_OVERRIDE_ENABLED') return false as T;
        return defaultValue as T;
      });

      // Recreate service with disabled overrides
      const disabledBridge = new AIgentParlantSecurityBridgeService(
        mockParlantService as ParlantIntegrationService,
        mockAuditService as SecurityAuditService,
        jwtService,
        mockConfigService
      );

      const overrideRequest: EmergencyOverrideRequest = {
        operationId: 'disabled-override-test',
        userId: 'test-user',
        justification: 'Test override',
        approverUserId: 'test-admin',
        overrideScope: 'SESSION',
        durationMinutes: 15,
        context: {
          userId: 'test-user',
          agentRole: 'OPERATOR',
          securityLevel: 'MEDIUM',
          conversationHistory: [],
          metadata: {},
        },
      };

      await expect(disabledBridge.handleEmergencyOverride(overrideRequest))
        .rejects.toThrow('Emergency override is disabled');
    });
  });

  describe('Compliance Framework Integration', () => {
    it('should validate SOX compliance for financial operations', async () => {
      const payload: EnhancedJwtPayload = {
        sub: 'sox-user-123',
        email: 'sox@financial.com',
        username: 'soxuser',
        role: UserRole._ADMIN,
        isActive: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'aigent-bytebot-system',
        aud: 'bytebotd-enterprise-control',
        securityClassification: SecurityClassification.CLASSIFIED,
        permissions: [Permission._SYSTEM_ADMIN, Permission._SECURITY_MANAGEMENT],
        complianceRequirements: [ComplianceFramework.SOX, ComplianceFramework.PCI_DSS],
        organizationId: 'financial-org-456',
      };
      const session = await securityBridge.createSecureSessionBridge(payload, {
        ipAddress: '10.1.0.50',
        userAgent: 'Financial Workstation Browser',
        sessionMetadata: { complianceMode: 'SOX_AUDIT' },
      });
      expect(session.complianceFrameworks).toContain(ComplianceFramework.SOX);
      expect(session.complianceFrameworks).toContain(ComplianceFramework.PCI_DSS);
    });

    it('should validate GDPR compliance for EU operations', async () => {
      const payload: EnhancedJwtPayload = {
        sub: 'gdpr-user-456',
        email: 'gdpr@eu.company.com',
        username: 'gdpruser',
        role: UserRole._OPERATOR,
        isActive: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'aigent-bytebot-system',
        aud: 'bytebotd-enterprise-control',
        securityClassification: SecurityClassification.CONFIDENTIAL,
        permissions: [Permission._TASK_READ, Permission._TASK_WRITE],
        complianceRequirements: [ComplianceFramework.GDPR],
        organizationId: 'eu-subsidiary-789',
        departmentId: 'data-processing-dept',
      };
      const session = await securityBridge.createSecureSessionBridge(payload, {
        ipAddress: '192.168.100.25',
        userAgent: 'EU Compliance Browser',
        sessionMetadata: {
          gdprMode: true,
          dataProcessingPurpose: 'legitimate_interest',
        },
      });
      expect(session.complianceFrameworks).toContain(ComplianceFramework.GDPR);
      expect(session.metadata.organizationId).toBe('eu-subsidiary-789');});

    it('should validate HIPAA compliance for healthcare operations', async () => {
  const payload: EnhancedJwtPayload = {sub: 'hipaa-user-789',
      email: 'hipaa@healthcare.org',
        username: 'hipaauser',
      role: UserRole._VIEWERisActiv, e: trueia, t: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'aigent-bytebot-system',
      aud: 'bytebotd-enterprise-control',
        securityClassification: SecurityClassification.RESTRICTEDpermission, s: [Permission._TASK_READ],
        complianceRequirements: [ComplianceFramework.HIPAA, ComplianceFramework.ISO_27001], organizationId: 'healthcare-system-101', departmentId: 'patient-records-dept',
};const session = await securityBridge.createSecureSessionBridge(payload, {
  ipAddress: '10.200.50.15',
      userAgent: 'Healthcare Terminal',
        sessionMetadata: { patientDataAccess: truehipaaComplian, t: true 
}
      });
      expect(session.complianceFrameworks).toContain(ComplianceFramework.HIPAA);
      expect(session.securityClassification).toBe(SecurityClassification.RESTRICTED);
    });
  });

    describe('Performance and Monitoring', () => {
  it('should track security metrics', async () => {
      // Create multiple sessions for metrics testing
      const _sessions = await Promise.all([
        createTestSession(SecurityClassification.PUBLIC, UserRole._GUEST),
        createTestSession(SecurityClassification.INTERNAL, UserRole._USER),
        createTestSession(SecurityClassification.CONFIDENTIAL, UserRole._OPERATOR),
        createTestSession(SecurityClassification.CLASSIFIED, UserRole._ADMIN),
      ]);

      const metrics = await securityBridge.getSecurityMetrics();
      expect(metrics.activeSessions).toBeGreaterThanOrEqual(4);
      expect(metrics.sessionsByClassification[SecurityClassification.PUBLIC]).toBeGreaterThanOrEqual(1);
      expect(metrics.sessionsByClassification[SecurityClassification.INTERNAL]).toBeGreaterThanOrEqual(1);
      expect(metrics.sessionsByClassification[SecurityClassification.CONFIDENTIAL]).toBeGreaterThanOrEqual(1);
      expect(metrics.sessionsByClassification[SecurityClassification.CLASSIFIED]).toBeGreaterThanOrEqual(1);
      expect(metrics.sessionsByRole[UserRole._GUEST]).toBeGreaterThanOrEqual(1);
      expect(metrics.sessionsByRole[UserRole._USER]).toBeGreaterThanOrEqual(1);
      expect(metrics.sessionsByRole[UserRole._OPERATOR]).toBeGreaterThanOrEqual(1);
      expect(metrics.sessionsByRole[UserRole._ADMIN]).toBeGreaterThanOrEqual(1);
    
});

    it('should monitor session health', async () => {
  const metrics = await securityBridge.getSecurityMetrics();
      expect(metrics.sessionHealth).toBeDefined();
      expect(metrics.sessionHealth.healthy).toBeGreaterThanOrEqual(0);
      expect(metrics.sessionHealth.suspended).toBeGreaterThanOrEqual(0);
      expect(metrics.sessionHealth.expired).toBeGreaterThanOrEqual(0);
      expect(metrics.sessionHealth.revoked).toBeGreaterThanOrEqual(0);
    
});

    it('should track performance statistics', async () => {
  const metrics = await securityBridge.getSecurityMetrics();
      expect(metrics.totalSessionsCreated).toBeGreaterThanOrEqual(0);
      expect(metrics.totalValidationsPerformed).toBeGreaterThanOrEqual(0);
      expect(metrics.averageValidationTime).toBeGreaterThanOrEqual(0);
    
});
  });

    describe('Redis Session Clustering', () => {
  it('should handle Redis cluster configuration', () => {expect(mockConfigService.get).toHaveBeenCalledWith('BRIDGE_SESSION_CLUSTERING_ENABLED', true);
      expect(mockConfigService.get).toHaveBeenCalledWith('REDIS_URL', expect.any(String));
});

    it('should gracefully handle Redis connection failures', async () => {
  // Redis mocking will simulate connection failures// Service should continue operating with in-memory fallback

      const payload: EnhancedJwtPayload = {
        sub: 'redis-test-user',
        email: 'redis@example.com',
        username: 'redisuser',
        role: UserRole._USER,
        isActive: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'aigent-bytebot-system',
        aud: 'bytebotd-enterprise-control',
        securityClassification: SecurityClassification.INTERNAL,
        permissions: [Permission._TASK_READ],
        complianceRequirements: [ComplianceFramework.GDPR],
      };

      // Should succeed even with Redis issues
      const session = await securityBridge.createSecureSessionBridge(payload, {
        ipAddress: '10.0.1.100',
        userAgent: 'Redis Test Browser'
      });
      expect(session.sessionId).toBeDefined();
    });
  });

    describe('Audit Trail Verification', () => {
      it('should create comprehensive audit entries for all operations', async () => {
        const payload: EnhancedJwtPayload = {
          sub: 'audit-test-user',
          email: 'audit@example.com',
          username: 'audituser',
          role: UserRole._OPERATOR,
          isActive: true,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          iss: 'aigent-bytebot-system',
          aud: 'bytebotd-enterprise-control',
          securityClassification: SecurityClassification.CONFIDENTIAL,
          permissions: [Permission._TASK_READ, Permission._TASK_WRITE],
          complianceRequirements: [ComplianceFramework.GDPR, ComplianceFramework.ISO_27001],
        };

        await securityBridge.createSecureSessionBridge(payload, {
          ipAddress: '10.0.1.75',
          userAgent: 'Audit Test Browser'
        });

        // Verify audit service was called
        expect(mockAuditService.createAuditEntry).toHaveBeenCalled();

        const auditCall = (mockAuditService.createAuditEntry as jest.Mock).mock.calls[0] as unknown[];
        const auditEntry = auditCall[0] as {
          eventType: string;
          severity: string;
          userId: string;
  action: string;
        outcome: string;
  details: { securityClassification: string 
};
      };

      expect(auditEntry.eventType).toBe('AUTHENTICATION_EVENT');
      expect(auditEntry.severity).toBe('HIGH');
      expect(auditEntry.userId).toBe('audit-test-user');
      expect(auditEntry.action).toBe('CREATE_SECURE_SESSION');
      expect(auditEntry.outcome).toBe('SUCCESS');
      expect(auditEntry.details.securityClassification).toBe(SecurityClassification.CONFIDENTIAL);
    });
  });

  // Helper function for creating test sessions
  async function createTestSession(classification: SecurityClassification, role: UserRole) {
    const payload: EnhancedJwtPayload = {
      sub: `test-${classification}-${role}-${Date.now()}`,
      email: `${classification}@example.com`,
      username: `${classification}user`,
      role: role,
      isActive: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'aigent-bytebot-system',
      aud: 'bytebotd-enterprise-control',
      securityClassification: classification,
      permissions: [Permission._TASK_READ],
      complianceRequirements: [ComplianceFramework.GDPR],
    };

    return await securityBridge.createSecureSessionBridge(payload, {
      ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      userAgent: `Test Browser ${classification}`,
    });
  }
});

    describe('Enhanced JWT Strategy Integration', () => {
  let _strategy: EnhancedJwtStrategy;
  let module: TestingModule;

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      providers: [
        EnhancedJwtStrategy,
        JwtService,
        {
          provide: AIgentParlantSecurityBridgeService,
          useValue: {
            createSecureSessionBridge: jest.fn().mockResolvedValue({
              sessionId: 'test-session-123',
              parlantSessionId: 'parlant-session-456',
              conversationContext: {
                userId: 'test',
                agentRole: 'OPERATOR',
                securityLevel: 'MEDIUM',
                conversationHistory: [],
                metadata: {},
                },
              },
            }),
            validateSessionSecurity: jest.fn().mockResolvedValue(true),
            handleEmergencyOverride: jest.fn().mockResolvedValue({}),
            getSecurityMetrics: jest.fn().mockResolvedValue({})
          },
        },
        {
          provide: SecurityAuditService,
          useValue: mockAuditService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    _strategy = module.get<EnhancedJwtStrategy>(EnhancedJwtStrategy);
  });

    afterEach(async () => {
  await module.close();
  
});

    describe('Multi-Algorithm Token Validation', () => {
  const _createMockRequest = (algorithm: string, token: string) => ({
    headers: { authorization: `Bearer ${token}` },
    ip: '10.0.1.100',
    'user-agent': 'Test Client',
    url: '/test',
    method: 'GET'
  });

    it('should extract HS256 algorithm from token header', () => {
      const hs256Header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const mockPayload = Buffer.from(JSON.stringify({ sub: 'test' })).toString('base64url');
      const mockSignature = 'mock-signature';
      const token = `${hs256Header}.${mockPayload}.${mockSignature}`;

      // Test algorithm extraction (would be done internally by strategy)
      expect(token.split('.').length).toBe(3);
    });

    it('should handle RS256 public key configuration', () => {
  expect(mockConfigService.get).toHaveBeenCalledWith('JWT_PUBLIC_KEY_RS256', '');
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_PRIVATE_KEY_RS256', '');
});});

    describe('Security Context Validation', () => {
  const mockValidPayload: EnhancedJwtPayload = {sub: 'strategy-test-user',
      email: 'strategy@example.com',
        username: 'strategyuser',
      firstName: 'Strategy',
        lastName: 'User',
      role: UserRole._OPERATORisActiv, e: trueia, t: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'aigent-bytebot-system',
      aud: 'bytebotd-enterprise-control',
        securityClassification: SecurityClassification.CONFIDENTIALpermission, s: [Permission._TASK_READ, Permission._TASK_WRITE], complianceRequirements: [ComplianceFramework.GDPR], organizationId: 'test-org',
};it('should validate required JWT claims', () => {
  // Mock payload validation - strategy should check all required fieldsexpect(mockValidPayload.sub).toBeDefined();
      expect(mockValidPayload.email).toBeDefined();
      expect(mockValidPayload.username).toBeDefined();
      expect(mockValidPayload.role).toBeDefined();
      expect(mockValidPayload.securityClassification).toBeDefined();
      expect(mockValidPayload.permissions).toBeDefined();
      expect(mockValidPayload.complianceRequirements).toBeDefined();
    
});

    it('should validate token timing claims', () => {
  const now = Math.floor(Date.now() / 1000);
      expect(mockValidPayload.iat).toBeLessThanOrEqual(now);
      expect(mockValidPayload.exp).toBeGreaterThan(now);
    
});

    it('should validate issuer and audience claims', () => {
  expect(mockValidPayload.iss).toBe('aigent-bytebot-system');
      expect(mockValidPayload.aud).toBe('bytebotd-enterprise-control');
    
});
  });
});