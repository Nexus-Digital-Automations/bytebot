/**
 * PARLANT Authentication Integration Test Suite
 *
 * Comprehensive test suite for PARLANT conversational authentication system
 * with enterprise-grade security scenarios, threat simulation, and validation
 * workflows for authentication, MFA, RBAC, session management, and JWT lifecycle.
 *
 * Features:
 * - Complete authentication flow testing with conversational validation
 * - Advanced security threat simulation and response validation
 * - Multi-factor authentication workflow testing
 * - Role-based access control and permission escalation testing
 * - Session security monitoring and anomaly detection testing
 * - JWT lifecycle management and token security testing
 * - Enterprise compliance and audit trail validation
 *
 * Security Test Categories:
 * - Authentication Security Tests
 * - MFA Workflow Tests
 * - RBAC and Authorization Tests
 * - Session Management Tests
 * - JWT Lifecycle Tests
 * - Security Threat Simulation Tests
 * - Compliance and Audit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ParlantEnhancedAuthService,
  ConversationalAuthContext,
  ConversationalAuthResult,
} from '../services/parlant-enhanced-auth.service';
import {
  ParlantMFAService,
  MFAFactorType,
  ConversationalMFASession,
  ConversationalMFAResult,
} from '../services/parlant-mfa.service';
import {
  ParlantRBACService,
  PermissionType,
  ConversationalAuthorizationResult,
  ConversationalPermissionRequest,
} from '../services/parlant-rbac.service';
import {
  ParlantSessionManagementService,
  SessionSecurityState,
  SessionAnomalyType,
  ConversationalSessionContext,
} from '../services/parlant-session-management.service';
import {
  ParlantJWTLifecycleService,
  TokenSecurityState,
  TokenAnomalyType,
  ConversationalTokenContext,
} from '../services/parlant-jwt-lifecycle.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ParlantIntegrationService,
  ParlantValidationResponse,
} from '@bytebot/shared/src/parlant/parlant-integration.service';
import { UserRole, SecurityLevel, RiskLevel } from '@bytebot/shared';
import { LoginDto, RegisterDto, ChangePasswordDto } from '../dto/login.dto';

// Mock data and utilities
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.USER,
  isActive: true,
  emailVerified: true,
  passwordHash: '$2a$12$hash',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
};

const mockAdminUser = {
  ...mockUser,
  id: 'admin-user-id',
  email: 'admin@example.com',
  username: 'admin',
  role: UserRole.ADMIN,
};

const mockAuthContext: ConversationalAuthContext = {
  sessionId: 'test-session-id',
  userId: 'test-user-id',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0 Test Browser',
  geolocation: {
    country: 'US',
    region: 'CA',
    city: 'San Francisco',
  },
  deviceFingerprint: 'test-device-fingerprint',
  previousLogins: [],
  securityClassification: 'CONFIDENTIAL',
  timestamp: new Date(),
};

const mockParlantApproval: ParlantValidationResponse = {
  approved: true,
  conversationId: 'conv-123',
  reasoning: 'Authentication approved after conversational validation',
  confidence: 0.95,
  suggestedAlternatives: [],
};

const mockParlantRejection: ParlantValidationResponse = {
  approved: false,
  conversationId: 'conv-456',
  reasoning: 'Authentication blocked due to security concerns',
  confidence: 0.9,
  suggestedAlternatives: [
    'Require additional verification',
    'Contact administrator',
  ],
};

describe('PARLANT Authentication Integration Test Suite', () => {
  let parlantAuthService: ParlantEnhancedAuthService;
  let parlantMFAService: ParlantMFAService;
  let parlantRBACService: ParlantRBACService;
  let parlantSessionService: ParlantSessionManagementService;
  let parlantJWTService: ParlantJWTLifecycleService;
  let prismaService: PrismaService;
  let parlantIntegrationService: ParlantIntegrationService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParlantEnhancedAuthService,
        ParlantMFAService,
        ParlantRBACService,
        ParlantSessionManagementService,
        ParlantJWTLifecycleService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            userSession: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: ParlantIntegrationService,
          useValue: {
            validateFunctionExecution: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              jwtExpiresIn: '15m',
              jwtRefreshExpiresIn: '7d',
            }),
          },
        },
      ],
    }).compile();

    parlantAuthService = module.get<ParlantEnhancedAuthService>(
      ParlantEnhancedAuthService,
    );
    parlantMFAService = module.get<ParlantMFAService>(ParlantMFAService);
    parlantRBACService = module.get<ParlantRBACService>(ParlantRBACService);
    parlantSessionService = module.get<ParlantSessionManagementService>(
      ParlantSessionManagementService,
    );
    parlantJWTService = module.get<ParlantJWTLifecycleService>(
      ParlantJWTLifecycleService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
    parlantIntegrationService = module.get<ParlantIntegrationService>(
      ParlantIntegrationService,
    );
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Authentication Security Tests', () => {
    describe('Conversational Login Tests', () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        rememberMe: false,
      };

      beforeEach(() => {
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (jwtService.signAsync as jest.Mock).mockResolvedValue('mock-jwt-token');
      });

      it('should successfully authenticate with low-risk profile', async () => {
        // Arrange
        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Act
        const result = await parlantAuthService.conversationalLogin(
          loginDto,
          mockAuthContext,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.tokens).toBeDefined();
        expect(result.conversationId).toBe('conv-123');
        expect(result.riskAssessment.riskLevel).toBe('LOW');
        expect(result.securityActions).toContain('STANDARD_VALIDATION');
        expect(result.sessionSecurityLevel).toBe('LOW');
      });

      it('should require conversational validation for high-risk login', async () => {
        // Arrange
        const highRiskContext = {
          ...mockAuthContext,
          ipAddress: '1.2.3.4', // Suspicious IP
          deviceFingerprint: 'unknown-device',
        };

        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Act
        const result = await parlantAuthService.conversationalLogin(
          loginDto,
          highRiskContext,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.riskAssessment.riskLevel).toBe('HIGH');
        expect(result.securityActions).toContain('CONVERSATION_APPROVED');
        expect(result.sessionSecurityLevel).toBe('HIGH');
        expect(
          parlantIntegrationService.validateFunctionExecution,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            riskLevel: 'CRITICAL',
          }),
        );
      });

      it('should block login when conversational validation rejects', async () => {
        // Arrange
        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantRejection);

        const suspiciousContext = {
          ...mockAuthContext,
          ipAddress: '10.0.0.1', // Internal IP from external
          previousLogins: [
            {
              timestamp: new Date(Date.now() - 60000),
              ipAddress: '1.2.3.4',
              userAgent: 'Different Browser',
              outcome: 'FAILURE' as const,
              riskScore: 0.9,
            },
          ],
        };

        // Act
        const result = await parlantAuthService.conversationalLogin(
          loginDto,
          suspiciousContext,
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.conversationId).toBe('conv-456');
        expect(result.securityActions).toContain('LOGIN_BLOCKED');
        expect(result.auditTrail[0].outcome).toBe('BLOCKED');
      });

      it('should handle admin login with enhanced security', async () => {
        // Arrange
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockAdminUser,
        );
        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        const adminLoginDto = { ...loginDto, email: 'admin@example.com' };

        // Act
        const result = await parlantAuthService.conversationalLogin(
          adminLoginDto,
          mockAuthContext,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.riskAssessment.riskLevel).toBe('HIGH');
        expect(result.securityActions).toContain('ENHANCED_MONITORING');
        expect(
          parlantIntegrationService.validateFunctionExecution,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            functionParams: expect.objectContaining({
              riskFactors: expect.arrayContaining([
                expect.objectContaining({ factor: 'ADMIN_LOGIN' }),
              ]),
            }),
          }),
        );
      });

      it('should detect and handle rapid login attempts', async () => {
        // Arrange
        const rapidAttemptsContext = {
          ...mockAuthContext,
          previousLogins: Array.from({ length: 5 }, (_, i) => ({
            timestamp: new Date(Date.now() - i * 10000), // 10 seconds apart
            ipAddress: mockAuthContext.ipAddress,
            userAgent: mockAuthContext.userAgent,
            outcome: 'FAILURE' as const,
            riskScore: 0.7,
          })),
        };

        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantRejection);

        // Act
        const result = await parlantAuthService.conversationalLogin(
          loginDto,
          rapidAttemptsContext,
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.riskAssessment.riskFactors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ factor: 'RECENT_FAILURES' }),
          ]),
        );
        expect(result.securityActions).toContain('LOGIN_BLOCKED');
      });
    });

    describe('Registration Security Tests', () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      };

      it('should successfully register with conversational validation', async () => {
        // Arrange
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prismaService.user.create as jest.Mock).mockResolvedValue({
          ...mockUser,
          id: 'new-user-id',
          email: registerDto.email,
          username: registerDto.username,
        });
        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Act
        const result = await parlantAuthService.conversationalRegister(
          registerDto,
          mockAuthContext,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
        expect(result.user!.email).toBe(registerDto.email);
        expect(result.conversationId).toBe('conv-123');
        expect(result.securityActions).toContain('EMAIL_VERIFICATION_REQUIRED');
      });

      it('should reject registration from suspicious context', async () => {
        // Arrange
        const suspiciousContext = {
          ...mockAuthContext,
          ipAddress: '192.168.1.1', // Local network IP
          deviceFingerprint: 'tor-browser-fingerprint',
        };

        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantRejection);

        // Act & Assert
        await expect(
          parlantAuthService.conversationalRegister(
            registerDto,
            suspiciousContext,
          ),
        ).rejects.toThrow('Conversational validation error');
      });

      it('should handle registration attempt with existing email', async () => {
        // Arrange
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );

        // Act & Assert
        await expect(
          parlantAuthService.conversationalRegister(
            registerDto,
            mockAuthContext,
          ),
        ).rejects.toThrow('Email already exists');
      });
    });

    describe('Password Change Security Tests', () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'CurrentPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!',
      };

      it('should successfully change password with conversational validation', async () => {
        // Arrange
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
        (prismaService.userSession.updateMany as jest.Mock).mockResolvedValue({
          count: 2,
        });
        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Mock bcrypt compare
        jest.doMock('bcryptjs', () => ({
          compare: jest.fn().mockResolvedValue(true),
          hash: jest.fn().mockResolvedValue('new-hash'),
        }));

        // Act
        const result = await parlantAuthService.conversationalChangePassword(
          mockUser.id,
          changePasswordDto,
          mockAuthContext,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.conversationId).toBe('conv-123');
        expect(result.securityActions).toContain('ALL_SESSIONS_REVOKED');
        expect(result.securityActions).toContain('RE_AUTHENTICATION_REQUIRED');
      });

      it('should reject password change with invalid current password', async () => {
        // Arrange
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );

        jest.doMock('bcryptjs', () => ({
          compare: jest.fn().mockResolvedValue(false),
        }));

        // Act & Assert
        await expect(
          parlantAuthService.conversationalChangePassword(
            mockUser.id,
            changePasswordDto,
            mockAuthContext,
          ),
        ).rejects.toThrow('Current password is incorrect');
      });
    });
  });

  describe('2. Multi-Factor Authentication Tests', () => {
    describe('MFA Workflow Tests', () => {
      it('should initiate MFA workflow for high-risk authentication', async () => {
        // Arrange
        const highRiskContext = {
          sessionId: 'high-risk-session',
          ipAddress: '1.2.3.4',
          userAgent: 'Unknown Browser',
          deviceFingerprint: 'unknown-device',
          conversationContext: {
            userId: mockUser.id,
            agentRole: 'USER',
            securityLevel: 'HIGH' as SecurityLevel,
            conversationHistory: [],
            metadata: {},
          },
        };

        // Act
        const mfaSession = await parlantMFAService.initiateConversationalMFA(
          mockUser.id,
          'HIGH' as RiskLevel,
          highRiskContext,
        );

        // Assert
        expect(mfaSession.workflowId).toBeDefined();
        expect(mfaSession.state).toBe('INITIATED');
        expect(mfaSession.riskAssessment.riskLevel).toBe('HIGH');
        expect(mfaSession.config.conversationalApprovalRequired).toBe(true);
      });

      it('should process TOTP factor selection and validation', async () => {
        // Arrange
        const workflowId = 'test-workflow-id';
        const totpFactorId = 'totp-factor-123';

        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Mock TOTP validation
        jest.doMock('speakeasy', () => ({
          totp: {
            verify: jest.fn().mockReturnValue(true),
          },
        }));

        // Act
        const factorResult =
          await parlantMFAService.processConversationalFactorSelection(
            workflowId,
            totpFactorId,
            {
              userId: mockUser.id,
              agentRole: 'USER',
              securityLevel: 'HIGH' as SecurityLevel,
              conversationHistory: [],
              metadata: {},
            },
          );

        // Assert
        expect(factorResult.success).toBe(true);
        expect(factorResult.conversationId).toBe('conv-123');
        expect(factorResult.securityActions).toContain('FACTOR_SELECTED');
        expect(factorResult.nextSteps).toHaveLength(1);
      });

      it('should handle MFA bypass attempt', async () => {
        // Arrange
        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantRejection);

        const workflowId = 'bypass-attempt-workflow';

        // Act
        const result =
          await parlantMFAService.processConversationalFactorSelection(
            workflowId,
            'invalid-factor',
            {
              userId: mockUser.id,
              agentRole: 'USER',
              securityLevel: 'HIGH' as SecurityLevel,
              conversationHistory: [],
              metadata: {},
            },
          );

        // Assert
        expect(result.success).toBe(false);
        expect(result.conversationId).toBe('conv-456');
      });

      it('should setup new TOTP factor through conversational workflow', async () => {
        // Arrange
        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Act
        const setupResult =
          await parlantMFAService.setupConversationalMFAFactor(
            mockUser.id,
            MFAFactorType.TOTP,
            {
              userId: mockUser.id,
              agentRole: 'USER',
              securityLevel: 'MEDIUM' as SecurityLevel,
              conversationHistory: [],
              metadata: {},
            },
          );

        // Assert
        expect(setupResult.factorId).toBeDefined();
        expect(setupResult.qrCode).toBeDefined();
        expect(setupResult.secret).toBeDefined();
        expect(setupResult.instructions).toHaveLength(3);
      });
    });
  });

  describe('3. RBAC and Authorization Tests', () => {
    describe('Permission Evaluation Tests', () => {
      it('should approve standard user permissions', async () => {
        // Arrange
        const rbacContext = {
          userId: mockUser.id,
          currentRoles: [UserRole.USER],
          currentPermissions: [
            PermissionType.DATA_READ,
            PermissionType.API_READ,
          ],
          requestedOperation: 'read_user_data',
          riskLevel: 'LOW' as RiskLevel,
          sessionId: 'test-session',
          ipAddress: '192.168.1.100',
          userAgent: 'Test Browser',
          deviceFingerprint: 'test-device',
          timestamp: new Date(),
        };

        // Act
        const result =
          await parlantRBACService.evaluateConversationalAuthorization(
            rbacContext,
            [PermissionType.DATA_READ],
          );

        // Assert
        expect(result.authorized).toBe(true);
        expect(result.permissions).toContain(PermissionType.DATA_READ);
        expect(result.reasoning).toContain('all required permissions');
        expect(result.monitoringRequired).toBe(false);
      });

      it('should initiate permission escalation workflow for insufficient permissions', async () => {
        // Arrange
        const rbacContext = {
          userId: mockUser.id,
          currentRoles: [UserRole.USER],
          currentPermissions: [PermissionType.API_READ],
          requestedOperation: 'delete_user_data',
          businessJustification: 'Need to clean up test data',
          riskLevel: 'MEDIUM' as RiskLevel,
          sessionId: 'test-session',
          ipAddress: '192.168.1.100',
          userAgent: 'Test Browser',
          deviceFingerprint: 'test-device',
          timestamp: new Date(),
        };

        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Act
        const result =
          await parlantRBACService.evaluateConversationalAuthorization(
            rbacContext,
            [PermissionType.DATA_DELETE],
          );

        // Assert
        expect(result.authorized).toBe(false);
        expect(result.escalationWorkflow).toBeDefined();
        expect(result.reasoning).toContain('escalation workflow initiated');
        expect(result.restrictions).toContain('ESCALATION_PENDING');
      });

      it('should require conversational validation for admin operations', async () => {
        // Arrange
        const adminContext = {
          userId: mockAdminUser.id,
          currentRoles: [UserRole.ADMIN],
          currentPermissions: [PermissionType.SYSTEM_ADMIN],
          requestedOperation: 'system_configuration_change',
          riskLevel: 'HIGH' as RiskLevel,
          sessionId: 'admin-session',
          ipAddress: '192.168.1.100',
          userAgent: 'Admin Browser',
          deviceFingerprint: 'admin-device',
          timestamp: new Date(),
        };

        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Act
        const result =
          await parlantRBACService.evaluateConversationalAuthorization(
            adminContext,
            [PermissionType.SYSTEM_CONFIG],
          );

        // Assert
        expect(result.authorized).toBe(true);
        expect(result.conversationId).toBe('conv-123');
        expect(result.restrictions).toContain('CONVERSATION_APPROVED');
        expect(result.monitoringRequired).toBe(true);
      });

      it('should handle permission escalation approval', async () => {
        // Arrange
        const workflowId = 'escalation-workflow-123';
        const approverId = 'admin-user-id';

        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Act
        const result =
          await parlantRBACService.processConversationalEscalationApproval(
            workflowId,
            approverId,
            true,
            'Approved for legitimate business need',
            {
              userId: approverId,
              agentRole: 'ADMIN',
              securityLevel: 'HIGH' as SecurityLevel,
              conversationHistory: [],
              metadata: {},
            },
          );

        // Assert
        expect(result.authorized).toBe(true);
        expect(result.conversationId).toBe('conv-123');
        expect(result.reasoning).toContain('approved');
        expect(result.restrictions).toContain('TEMPORARY_ACCESS');
      });
    });
  });

  describe('4. Session Management Tests', () => {
    describe('Session Security Monitoring Tests', () => {
      it('should initialize session monitoring with appropriate security level', async () => {
        // Arrange
        const sessionContext: ConversationalSessionContext = {
          sessionId: 'test-session-123',
          userId: mockUser.id,
          userRole: UserRole.USER,
          ipAddress: '192.168.1.100',
          userAgent: 'Test Browser',
          deviceFingerprint: 'test-device',
          createdAt: new Date(),
          lastActivity: new Date(),
          securityLevel: 'MEDIUM' as SecurityLevel,
          riskScore: 0.3,
        };

        const monitoringConfig = {
          userId: mockUser.id,
          securityLevel: 'MEDIUM' as SecurityLevel,
          monitoringEnabled: true,
          anomalyDetectionEnabled: true,
          conversationalValidationThreshold: 0.7,
          maxConcurrentSessions: 5,
          sessionTimeoutMinutes: 30,
          locationChangeAlerts: true,
          deviceChangeAlerts: true,
          behaviorAnalysisEnabled: true,
          realTimeMonitoring: true,
        };

        // Act
        const result =
          await parlantSessionService.initializeConversationalSessionMonitoring(
            sessionContext.sessionId,
            sessionContext,
            monitoringConfig,
          );

        // Assert
        expect(result.success).toBe(true);
        expect(result.newSecurityState).toBe(SessionSecurityState.ACTIVE);
        expect(result.monitoringEnhanced).toBe(true);
        expect(result.auditTrail).toHaveLength(1);
        expect(result.auditTrail[0].action).toBe(
          'SESSION_MONITORING_INITIALIZED',
        );
      });

      it('should detect location anomaly and trigger conversational validation', async () => {
        // Arrange
        const sessionId = 'test-session-123';
        const currentActivity = {
          ipAddress: '1.2.3.4', // Different from baseline
          userAgent: 'Test Browser',
          location: {
            country: 'RU',
            region: 'Moscow',
            city: 'Moscow',
            latitude: 55.7558,
            longitude: 37.6176,
          },
          deviceFingerprint: 'test-device',
          requestCount: 10,
          errorRate: 0.01,
          timestamp: new Date(),
        };

        // Act
        const anomalies =
          await parlantSessionService.performConversationalAnomalyDetection(
            sessionId,
            currentActivity,
          );

        // Assert
        expect(anomalies).toHaveLength(1);
        expect(anomalies[0].anomalyType).toBe(
          SessionAnomalyType.LOCATION_CHANGE,
        );
        expect(anomalies[0].severity).toBe('CRITICAL');
        expect(anomalies[0].conversationalValidationRequired).toBe(true);
      });

      it('should handle session termination with conversational confirmation', async () => {
        // Arrange
        const sessionId = 'suspicious-session-123';
        const terminationReason = 'Multiple security anomalies detected';

        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Act
        const result =
          await parlantSessionService.terminateConversationalSession(
            sessionId,
            terminationReason,
            'HIGH',
          );

        // Assert
        expect(result.success).toBe(true);
        expect(result.actionTaken).toBe('SESSION_TERMINATED');
        expect(result.newSecurityState).toBe(SessionSecurityState.TERMINATED);
        expect(result.conversationId).toBeDefined();
      });

      it('should detect rapid request anomaly', async () => {
        // Arrange
        const sessionId = 'rapid-request-session';
        const currentActivity = {
          ipAddress: '192.168.1.100',
          userAgent: 'Test Browser',
          deviceFingerprint: 'test-device',
          requestCount: 150, // Above threshold
          errorRate: 0.01,
          timestamp: new Date(),
        };

        // Act
        const anomalies =
          await parlantSessionService.performConversationalAnomalyDetection(
            sessionId,
            currentActivity,
          );

        // Assert
        expect(
          anomalies.some(
            (a) => a.anomalyType === SessionAnomalyType.RAPID_REQUESTS,
          ),
        ).toBe(true);
        const rapidRequestAnomaly = anomalies.find(
          (a) => a.anomalyType === SessionAnomalyType.RAPID_REQUESTS,
        );
        expect(rapidRequestAnomaly?.severity).toBe('HIGH');
        expect(rapidRequestAnomaly?.conversationalValidationRequired).toBe(
          true,
        );
      });
    });
  });

  describe('5. JWT Lifecycle Tests', () => {
    describe('Token Security Tests', () => {
      it('should generate JWT tokens with conversational validation for high-risk users', async () => {
        // Arrange
        const context = {
          sessionId: 'admin-session-123',
          ipAddress: '192.168.1.100',
          userAgent: 'Admin Browser',
          deviceFingerprint: 'admin-device',
          securityLevel: 'HIGH' as SecurityLevel,
        };

        const lifecycleConfig = {
          userId: mockAdminUser.id,
          securityLevel: 'HIGH' as SecurityLevel,
          monitoringEnabled: true,
          anomalyDetectionEnabled: true,
          conversationalValidationThreshold: 0.5,
          maxRefreshRate: 10,
          maxConcurrentTokens: 3,
          tokenLifetimeMinutes: 15,
          refreshTokenLifetimeDays: 7,
          revokeOnSuspicion: true,
          enhancedAuditingEnabled: true,
        };

        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        (jwtService.signAsync as jest.Mock).mockResolvedValue('mock-jwt-token');

        // Act
        const result = await parlantJWTService.generateConversationalJWTTokens(
          mockAdminUser,
          context,
          lifecycleConfig,
          false,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.tokens).toBeDefined();
        expect(result.newSecurityState).toBe(TokenSecurityState.ACTIVE);
        expect(result.restrictions).toContain('ENHANCED_MONITORING');
        expect(result.auditTrail[0].action).toBe('JWT_TOKENS_GENERATED');
      });

      it('should detect token refresh anomaly and require validation', async () => {
        // Arrange
        const refreshToken = 'mock-refresh-token';
        const context = {
          ipAddress: '1.2.3.4', // Different IP
          userAgent: 'Different Browser',
          deviceFingerprint: 'different-device',
        };

        (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
          sub: mockUser.id,
          type: 'refresh',
          sessionId: 'session-123',
        });

        (prismaService.userSession.findUnique as jest.Mock).mockResolvedValue({
          id: 'session-123',
          userId: mockUser.id,
          refreshToken,
          isRevoked: false,
          expiresAt: new Date(Date.now() + 86400000),
          user: mockUser,
        });

        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Act
        const result = await parlantJWTService.refreshConversationalJWTTokens(
          refreshToken,
          context,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.actionTaken).toBe('JWT_TOKENS_REFRESHED');
        expect(result.monitoringEnhanced).toBe(true);
        expect(
          parlantIntegrationService.validateFunctionExecution,
        ).toHaveBeenCalled();
      });

      it('should revoke token with conversational confirmation', async () => {
        // Arrange
        const tokenId = 'suspicious-token-123';
        const revocationReason = 'Token compromise suspected';

        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Act
        const result = await parlantJWTService.revokeConversationalJWTTokens(
          tokenId,
          revocationReason,
          'CRITICAL',
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.actionTaken).toBe('JWT_TOKENS_REVOKED');
        expect(result.newSecurityState).toBe(TokenSecurityState.REVOKED);
        expect(result.conversationId).toBeDefined();
      });

      it('should detect rapid refresh pattern anomaly', async () => {
        // Arrange
        const refreshToken = 'rapid-refresh-token';
        const context = {
          ipAddress: '192.168.1.100',
          userAgent: 'Test Browser',
          deviceFingerprint: 'test-device',
        };

        // Mock rapid refresh scenario
        (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
          sub: mockUser.id,
          type: 'refresh',
          sessionId: 'session-123',
        });

        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantRejection);

        // Act & Assert
        await expect(
          parlantJWTService.refreshConversationalJWTTokens(
            refreshToken,
            context,
          ),
        ).rejects.toThrow('Token refresh failed');
      });
    });
  });

  describe('6. Security Threat Simulation Tests', () => {
    describe('Advanced Threat Scenarios', () => {
      it('should detect and block credential stuffing attack', async () => {
        // Arrange
        const credentialStuffingContext = {
          ...mockAuthContext,
          ipAddress: '1.2.3.4',
          deviceFingerprint: 'automated-tool',
          previousLogins: Array.from({ length: 20 }, (_, i) => ({
            timestamp: new Date(Date.now() - i * 1000), // 1 second apart
            ipAddress: '1.2.3.4',
            userAgent: 'Automated Tool',
            outcome: 'FAILURE' as const,
            riskScore: 0.95,
          })),
        };

        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantRejection);

        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'CommonPassword123',
          rememberMe: false,
        };

        // Act
        const result = await parlantAuthService.conversationalLogin(
          loginDto,
          credentialStuffingContext,
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.riskAssessment.riskLevel).toBe('CRITICAL');
        expect(result.securityActions).toContain('LOGIN_BLOCKED');
        expect(result.riskAssessment.riskFactors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ factor: 'RECENT_FAILURES' }),
          ]),
        );
      });

      it('should detect session hijacking attempt', async () => {
        // Arrange
        const originalSession = 'original-session-123';
        const hijackingActivity = {
          ipAddress: '5.6.7.8', // Completely different geography
          userAgent: 'Malicious Browser',
          location: {
            country: 'CN',
            region: 'Beijing',
            city: 'Beijing',
          },
          deviceFingerprint: 'malicious-device',
          requestCount: 50,
          errorRate: 0.1,
          timestamp: new Date(),
        };

        // Act
        const anomalies =
          await parlantSessionService.performConversationalAnomalyDetection(
            originalSession,
            hijackingActivity,
          );

        // Assert
        expect(anomalies.length).toBeGreaterThan(0);
        expect(
          anomalies.some(
            (a) => a.anomalyType === SessionAnomalyType.LOCATION_CHANGE,
          ),
        ).toBe(true);
        expect(
          anomalies.some(
            (a) => a.anomalyType === SessionAnomalyType.DEVICE_CHANGE,
          ),
        ).toBe(true);
        expect(anomalies.some((a) => a.severity === 'CRITICAL')).toBe(true);
      });

      it('should detect privilege escalation attack', async () => {
        // Arrange
        const escalationContext = {
          userId: mockUser.id,
          currentRoles: [UserRole.USER],
          currentPermissions: [PermissionType.API_READ],
          requestedOperation: 'admin_system_access',
          businessJustification: 'Need admin access urgently', // Suspicious justification
          riskLevel: 'HIGH' as RiskLevel,
          sessionId: 'escalation-session',
          ipAddress: '192.168.1.100',
          userAgent: 'Test Browser',
          deviceFingerprint: 'test-device',
          timestamp: new Date(),
        };

        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantRejection);

        // Act
        const result =
          await parlantRBACService.evaluateConversationalAuthorization(
            escalationContext,
            [PermissionType.SYSTEM_ADMIN],
          );

        // Assert
        expect(result.authorized).toBe(false);
        expect(result.escalationWorkflow?.state).toBe('REJECTED');
        expect(result.reasoning).toContain('blocked');
      });

      it('should detect token replay attack', async () => {
        // Arrange
        const replayToken = 'replayed-token-123';
        const replayContext = {
          ipAddress: '9.10.11.12',
          userAgent: 'Replaying Browser',
          deviceFingerprint: 'replay-device',
          requestedOperation: 'sensitive_data_access',
        };

        // Mock blacklisted token
        (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
          sub: mockUser.id,
          type: 'access',
          sessionId: 'session-123',
        });

        // Act & Assert
        await expect(
          parlantJWTService.validateConversationalJWTToken(
            replayToken,
            replayContext,
          ),
        ).rejects.toThrow('Token not found in tracking system');
      });
    });
  });

  describe('7. Compliance and Audit Tests', () => {
    describe('Audit Trail Validation', () => {
      it('should maintain comprehensive audit trail for authentication flow', async () => {
        // Arrange
        const loginDto: LoginDto = {
          email: 'audit@example.com',
          password: 'AuditPassword123!',
          rememberMe: false,
        };

        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Act
        const result = await parlantAuthService.conversationalLogin(
          loginDto,
          mockAuthContext,
        );

        // Assert
        expect(result.auditTrail).toBeDefined();
        expect(result.auditTrail.length).toBeGreaterThan(0);
        expect(result.auditTrail[0]).toMatchObject({
          timestamp: expect.any(Date),
          action: expect.any(String),
          outcome: 'SUCCESS',
          details: expect.any(String),
          riskScore: expect.any(Number),
          securityLevel: expect.any(String),
        });
        expect(result.conversationId).toBeDefined();
      });

      it('should maintain audit trail across session lifecycle', async () => {
        // Arrange
        const sessionContext: ConversationalSessionContext = {
          sessionId: 'audit-session-123',
          userId: mockUser.id,
          userRole: UserRole.USER,
          ipAddress: '192.168.1.100',
          userAgent: 'Audit Browser',
          deviceFingerprint: 'audit-device',
          createdAt: new Date(),
          lastActivity: new Date(),
          securityLevel: 'MEDIUM' as SecurityLevel,
          riskScore: 0.2,
        };

        // Act
        const initResult =
          await parlantSessionService.initializeConversationalSessionMonitoring(
            sessionContext.sessionId,
            sessionContext,
            {
              userId: mockUser.id,
              securityLevel: 'MEDIUM' as SecurityLevel,
              monitoringEnabled: true,
              anomalyDetectionEnabled: true,
              conversationalValidationThreshold: 0.7,
              maxConcurrentSessions: 5,
              sessionTimeoutMinutes: 30,
              locationChangeAlerts: true,
              deviceChangeAlerts: true,
              behaviorAnalysisEnabled: true,
              realTimeMonitoring: true,
            },
          );

        const statusResult =
          await parlantSessionService.getSessionSecurityStatus(
            sessionContext.sessionId,
          );

        // Assert
        expect(initResult.auditTrail).toHaveLength(1);
        expect(statusResult?.auditTrail).toBeDefined();
        expect(statusResult?.auditTrail[0].action).toBe(
          'SESSION_MONITORING_INITIALIZED',
        );
        expect(statusResult?.conversationHistory).toBeDefined();
      });

      it('should ensure GDPR compliance for user data handling', async () => {
        // Arrange
        const registerDto: RegisterDto = {
          email: 'gdpr@example.com',
          username: 'gdpruser',
          firstName: 'GDPR',
          lastName: 'User',
          password: 'GDPRPassword123!',
          confirmPassword: 'GDPRPassword123!',
        };

        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prismaService.user.create as jest.Mock).mockResolvedValue({
          ...mockUser,
          email: registerDto.email,
          username: registerDto.username,
        });
        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Act
        const result = await parlantAuthService.conversationalRegister(
          registerDto,
          mockAuthContext,
        );

        // Assert
        expect(result.user).toBeDefined();
        expect(result.user?.passwordHash).toBeUndefined(); // Password not exposed
        expect(result.conversationId).toBeDefined(); // Conversation tracked for audit
        expect(result.auditTrail[0].details).toContain(
          'conversational validation',
        );
      });
    });

    describe('Security Compliance Tests', () => {
      it('should enforce SOC 2 Type II controls for authentication', async () => {
        // Arrange
        const soc2LoginDto: LoginDto = {
          email: 'soc2@example.com',
          password: 'SOC2Password123!',
          rememberMe: false,
        };

        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockAdminUser,
        );
        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        // Act
        const result = await parlantAuthService.conversationalLogin(
          soc2LoginDto,
          mockAuthContext,
        );

        // Assert
        // SOC 2 requires comprehensive logging and monitoring
        expect(result.auditTrail).toBeDefined();
        expect(result.riskAssessment).toBeDefined();
        expect(result.sessionSecurityLevel).toBeDefined();
        expect(result.conversationId).toBeDefined(); // AI decision tracking

        // Enhanced monitoring for admin users (SOC 2 control requirement)
        expect(result.securityActions).toContain('ENHANCED_MONITORING');
      });

      it('should implement NIST 800-63B session management requirements', async () => {
        // Arrange
        const nistSessionContext: ConversationalSessionContext = {
          sessionId: 'nist-session-123',
          userId: mockUser.id,
          userRole: UserRole.USER,
          ipAddress: '192.168.1.100',
          userAgent: 'NIST Compliant Browser',
          deviceFingerprint: 'nist-device',
          createdAt: new Date(),
          lastActivity: new Date(),
          securityLevel: 'HIGH' as SecurityLevel,
          riskScore: 0.1,
        };

        // Act
        const result =
          await parlantSessionService.initializeConversationalSessionMonitoring(
            nistSessionContext.sessionId,
            nistSessionContext,
            {
              userId: mockUser.id,
              securityLevel: 'HIGH' as SecurityLevel,
              monitoringEnabled: true,
              anomalyDetectionEnabled: true,
              conversationalValidationThreshold: 0.5,
              maxConcurrentSessions: 3, // NIST recommends limiting concurrent sessions
              sessionTimeoutMinutes: 30, // NIST requires session timeouts
              locationChangeAlerts: true,
              deviceChangeAlerts: true,
              behaviorAnalysisEnabled: true,
              realTimeMonitoring: true,
            },
          );

        // Assert
        // NIST 800-63B requires session binding and monitoring
        expect(result.newSecurityState).toBe(SessionSecurityState.ACTIVE);
        expect(result.monitoringEnhanced).toBe(true);
        expect(result.auditTrail[0].securityLevel).toBe('HIGH');
      });
    });
  });

  describe('8. Performance and Scalability Tests', () => {
    describe('High Load Scenarios', () => {
      it('should handle concurrent authentication requests efficiently', async () => {
        // Arrange
        const concurrentRequests = 10;
        const loginRequests = Array.from(
          { length: concurrentRequests },
          (_, i) => ({
            email: `user${i}@example.com`,
            password: 'ConcurrentPassword123!',
            rememberMe: false,
          }),
        );

        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        const startTime = Date.now();

        // Act
        const results = await Promise.all(
          loginRequests.map((loginDto) =>
            parlantAuthService.conversationalLogin(loginDto, mockAuthContext),
          ),
        );

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // Assert
        expect(results).toHaveLength(concurrentRequests);
        expect(results.every((r) => r.success)).toBe(true);
        expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
        expect(totalTime / concurrentRequests).toBeLessThan(500); // Average < 500ms per request
      });

      it('should maintain performance under anomaly detection load', async () => {
        // Arrange
        const sessionCount = 5;
        const anomalyDetectionTasks = Array.from(
          { length: sessionCount },
          (_, i) => {
            const sessionId = `perf-session-${i}`;
            const activity = {
              ipAddress: `192.168.1.${i + 100}`,
              userAgent: `Performance Test Browser ${i}`,
              deviceFingerprint: `perf-device-${i}`,
              requestCount: Math.floor(Math.random() * 50),
              errorRate: Math.random() * 0.1,
              timestamp: new Date(),
            };
            return { sessionId, activity };
          },
        );

        const startTime = Date.now();

        // Act
        const results = await Promise.all(
          anomalyDetectionTasks.map(({ sessionId, activity }) =>
            parlantSessionService.performConversationalAnomalyDetection(
              sessionId,
              activity,
            ),
          ),
        );

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // Assert
        expect(results).toHaveLength(sessionCount);
        expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
        expect(totalTime / sessionCount).toBeLessThan(400); // Average < 400ms per detection
      });
    });
  });

  describe('9. Integration Error Handling Tests', () => {
    describe('Resilience and Recovery', () => {
      it('should handle Parlant service unavailability gracefully', async () => {
        // Arrange
        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockRejectedValue(new Error('Parlant service unavailable'));

        const loginDto: LoginDto = {
          email: 'resilience@example.com',
          password: 'ResiliencePassword123!',
          rememberMe: false,
        };

        // Act & Assert
        await expect(
          parlantAuthService.conversationalLogin(loginDto, mockAuthContext),
        ).rejects.toThrow('Parlant service unavailable');
      });

      it('should handle database connection failures appropriately', async () => {
        // Arrange
        (prismaService.user.findUnique as jest.Mock).mockRejectedValue(
          new Error('Database connection failed'),
        );

        const loginDto: LoginDto = {
          email: 'database@example.com',
          password: 'DatabasePassword123!',
          rememberMe: false,
        };

        // Act & Assert
        await expect(
          parlantAuthService.conversationalLogin(loginDto, mockAuthContext),
        ).rejects.toThrow('Database connection failed');
      });

      it('should handle JWT service failures gracefully', async () => {
        // Arrange
        (jwtService.signAsync as jest.Mock).mockRejectedValue(
          new Error('JWT signing failed'),
        );

        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (
          parlantIntegrationService.validateFunctionExecution as jest.Mock
        ).mockResolvedValue(mockParlantApproval);

        const loginDto: LoginDto = {
          email: 'jwt@example.com',
          password: 'JWTPassword123!',
          rememberMe: false,
        };

        // Act & Assert
        await expect(
          parlantAuthService.conversationalLogin(loginDto, mockAuthContext),
        ).rejects.toThrow('JWT signing failed');
      });
    });
  });
});

/**
 * Test Suite Summary:
 *
 * This comprehensive test suite validates the complete PARLANT authentication
 * integration across all security components:
 *
 * 1. Authentication Security: Login, registration, password change with conversational validation
 * 2. MFA Workflows: Factor selection, setup, validation with conversational approval
 * 3. RBAC Authorization: Permission evaluation, escalation workflows, admin operations
 * 4. Session Management: Security monitoring, anomaly detection, threat response
 * 5. JWT Lifecycle: Token generation, refresh, revocation with security validation
 * 6. Threat Simulation: Advanced attack scenarios and defense validation
 * 7. Compliance: Audit trails, GDPR, SOC 2, NIST 800-63B requirements
 * 8. Performance: Concurrent load testing and scalability validation
 * 9. Error Handling: Resilience testing and failure recovery
 *
 * The test suite ensures enterprise-grade security, compliance, and performance
 * for the complete PARLANT conversational authentication system.
 */
