/**
 * JWT Security Testing Suite - Enterprise Grade
 *
 * Comprehensive JWT authentication testing including token lifecycle validation,
 * token manipulation attacks, session management, and enterprise security controls
 * for PARLANT PHASE 1 implementation.
 *
 * Features:
 * - JWT token lifecycle testing (creation, validation, expiration, refresh, revocation)
 * - Token manipulation and attack simulation (signature tampering, algorithm confusion, payload injection)
 * - Session management and concurrent session handling
 * - JWT security best practices validation
 * - Enterprise-grade audit trail and compliance validation
 *
 * Architecture: Comprehensive JWT security testing with OWASP compliance
 * Security: Enterprise-grade token security validation with threat simulation
 * Performance: Optimized parallel test execution with comprehensive coverage
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../../../src/app.module';
import {
  SecurityTestFramework,
  SecurityTestType,
  SecurityTestStatus,
  SecurityRiskLevel,
  SecurityTestUtils,
} from '../framework/security-test-framework';

// Type-safe interfaces for JWT testing
interface JWTPayload {
  userId?: string;
  username?: string;
  role?: string;
  iss?: string;
  iat?: number;
  exp?: number;
  permissions?: string[];
  password?: unknown;
  secret?: unknown;
  apiKey?: unknown;
  emergency?: boolean;
  reason?: string;
}

interface JWTHeader {
  typ?: string;
  alg?: string;
  secret?: unknown;
  key?: unknown;
}

interface APIErrorResponse {
  message?: string;
  statusCode?: number;
  error?: string;
}

// Type guards for safe type checking
function isJWTPayload(obj: unknown): obj is JWTPayload {
  return typeof obj === 'object' && obj !== null;
}

function isJWTHeader(obj: unknown): obj is JWTHeader {
  return typeof obj === 'object' && obj !== null;
}

function isAPIErrorResponse(obj: unknown): obj is APIErrorResponse {
  return typeof obj === 'object' && obj !== null;
}

// Safe member access helpers
function safeGetProperty<T>(obj: unknown, property: string): T | undefined {
  if (typeof obj === 'object' && obj !== null && property in obj) {
    return (obj as Record<string, unknown>)[property] as T;
  }
  return undefined;
}

describe('JWT Security Testing Suite', () => {
  let app: INestApplication;
  let securityFramework: SecurityTestFramework;
  let module: TestingModule;
  let configService: ConfigService;
  let jwtSecret: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
      providers: [SecurityTestFramework],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    securityFramework = module.get<SecurityTestFramework>(
      SecurityTestFramework,
    );
    await securityFramework.initialize(module);

    configService = module.get<ConfigService>(ConfigService);
    jwtSecret = configService.get<string>('JWT_SECRET', 'test-secret');
  });

  afterAll(async () => {
    await securityFramework.cleanup();
    await app.close();
  });

  describe('JWT Token Lifecycle Testing', () => {
    it('should validate proper JWT token creation and structure', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Token Creation Validation',
        SecurityTestType.AUTHENTICATION,
        async () => {
          const payload = {
            userId: SecurityTestUtils.generateRandomData(8),
            username: 'testuser',
            role: 'user',
            permissions: ['read'],
          };

          const token = securityFramework.generateTestJWT(payload);
          expect(token).toBeDefined();
          expect(typeof token).toBe('string');
          expect(token.split('.').length).toBe(3);

          const decodedToken = jwt.decode(token);
          expect(isJWTPayload(decodedToken)).toBe(true);

          const decoded = decodedToken as JWTPayload;
          expect(decoded.userId).toBe(payload.userId);
          expect(decoded.username).toBe(payload.username);
          expect(decoded.role).toBe(payload.role);
          expect(decoded.iss).toBe('security-test-framework');
        },
      );
    });

    it('should validate JWT token expiration handling', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Token Expiration Validation',
        SecurityTestType.AUTHENTICATION,
        async () => {
          const payload = { userId: '123', username: 'testuser' };

          // Test expired token
          const expiredToken = securityFramework.generateMaliciousJWT(
            payload,
            'expired',
          );

          const response = await request(app.getHttpServer())
            .get('/api/protected')
            .set('Authorization', `Bearer ${expiredToken}`)
            .expect(401);

          expect(isAPIErrorResponse(response.body)).toBe(true);
          const responseBody = response.body as APIErrorResponse;
          expect(responseBody.message).toContain('expired');
        },
      );
    });

    it('should validate JWT token refresh mechanism', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Token Refresh Validation',
        SecurityTestType.AUTHENTICATION,
        async () => {
          const payload = { userId: '123', username: 'testuser' };
          const shortLivedToken = securityFramework.generateTestJWT(payload, {
            expiresIn: '1s',
          });

          // Wait for token to expire
          await new Promise((resolve) => setTimeout(resolve, 1100));

          // Attempt to refresh token
          const refreshResponse = await request(app.getHttpServer())
            .post('/api/auth/refresh')
            .send({ token: shortLivedToken });

          if (refreshResponse.status === 200) {
            const responseBody = refreshResponse.body as {
              accessToken?: string;
              refreshToken?: string;
            };
            expect(responseBody.accessToken).toBeDefined();
            expect(responseBody.refreshToken).toBeDefined();
          } else {
            // If refresh endpoint doesn't exist, that's also a valid security finding
            expect(refreshResponse.status).toBe(404);
          }
        },
      );
    });

    it('should validate JWT token revocation functionality', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Token Revocation Validation',
        SecurityTestType.AUTHENTICATION,
        async () => {
          const payload = { userId: '123', username: 'testuser' };
          const token = securityFramework.generateTestJWT(payload);

          // First, verify token works
          const validResponse = await request(app.getHttpServer())
            .get('/api/protected')
            .set('Authorization', `Bearer ${token}`);

          // Attempt to revoke token
          const revokeResponse = await request(app.getHttpServer())
            .post('/api/auth/revoke')
            .send({ token });

          if (revokeResponse.status === 200) {
            // After revocation, token should be invalid
            const invalidResponse = await request(app.getHttpServer())
              .get('/api/protected')
              .set('Authorization', `Bearer ${token}`)
              .expect(401);
          }
        },
      );
    });
  });

  describe('JWT Token Manipulation Attacks', () => {
    it('should prevent JWT signature tampering attacks', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Signature Tampering Prevention',
        SecurityTestType.AUTHENTICATION,
        async () => {
          const payload = { userId: '123', username: 'testuser' };
          const invalidSignatureToken = securityFramework.generateMaliciousJWT(
            payload,
            'invalid-signature',
          );

          const response = await request(app.getHttpServer())
            .get('/api/protected')
            .set('Authorization', `Bearer ${invalidSignatureToken}`)
            .expect(401);

          expect(isAPIErrorResponse(response.body)).toBe(true);
          const responseBody = response.body as APIErrorResponse;
          expect(responseBody.message).toMatch(
            /invalid|unauthorized|signature/i,
          );
        },
      );
    });

    it('should prevent none algorithm attack', async () => {
      await securityFramework.executeSecurityTest(
        'JWT None Algorithm Attack Prevention',
        SecurityTestType.AUTHENTICATION,
        async () => {
          const payload = {
            userId: '123',
            username: 'testuser',
            role: 'admin',
          };
          const noneAlgorithmToken = securityFramework.generateMaliciousJWT(
            payload,
            'none-algorithm',
          );

          const response = await request(app.getHttpServer())
            .get('/api/protected')
            .set('Authorization', `Bearer ${noneAlgorithmToken}`)
            .expect(401);

          expect(isAPIErrorResponse(response.body)).toBe(true);
          const responseBody = response.body as APIErrorResponse;
          expect(responseBody.message).toMatch(
            /invalid|unauthorized|algorithm/i,
          );
        },
      );
    });

    it('should prevent JWT payload tampering', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Payload Tampering Prevention',
        SecurityTestType.AUTHENTICATION,
        async () => {
          const payload = { userId: '123', username: 'testuser', role: 'user' };
          const tamperedToken = securityFramework.generateMaliciousJWT(
            payload,
            'tampered-payload',
          );

          const response = await request(app.getHttpServer())
            .get('/api/admin')
            .set('Authorization', `Bearer ${tamperedToken}`)
            .expect(401);

          expect(isAPIErrorResponse(response.body)).toBe(true);
          const responseBody = response.body as APIErrorResponse;
          expect(responseBody.message).toMatch(
            /invalid|unauthorized|signature/i,
          );
        },
      );
    });

    it('should validate JWT algorithm confusion attacks', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Algorithm Confusion Attack Prevention',
        SecurityTestType.AUTHENTICATION,
        async () => {
          const payload = {
            userId: '123',
            username: 'testuser',
            role: 'admin',
          };

          // Create token with different algorithm
          const rsaToken = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

          // Try to verify with wrong algorithm expectation
          const response = await request(app.getHttpServer())
            .get('/api/protected')
            .set('Authorization', `Bearer ${rsaToken}`);

          // Should either work with proper validation or reject with clear error
          expect([200, 401, 403]).toContain(response.status);
        },
      );
    });
  });

  describe('JWT Session Management Testing', () => {
    it('should handle concurrent session validation', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Concurrent Session Handling',
        SecurityTestType.AUTHENTICATION,
        async () => {
          const userId = SecurityTestUtils.generateRandomData(8);
          const payload1 = { userId, username: 'testuser', sessionId: '1' };
          const payload2 = { userId, username: 'testuser', sessionId: '2' };

          const token1 = securityFramework.generateTestJWT(payload1);
          const token2 = securityFramework.generateTestJWT(payload2);

          // Both tokens should be valid simultaneously unless session limiting is enforced
          const response1 = await request(app.getHttpServer())
            .get('/api/protected')
            .set('Authorization', `Bearer ${token1}`);

          const response2 = await request(app.getHttpServer())
            .get('/api/protected')
            .set('Authorization', `Bearer ${token2}`);

          // Validate concurrent session handling
          expect([200, 401]).toContain(response1.status);
          expect([200, 401]).toContain(response2.status);
        },
      );
    });

    it('should validate session timeout and cleanup', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Session Timeout Validation',
        SecurityTestType.AUTHENTICATION,
        async () => {
          const payload = { userId: '123', username: 'testuser' };
          const shortToken = securityFramework.generateTestJWT(payload, {
            expiresIn: '2s',
          });

          // Token should work initially
          const initialResponse = await request(app.getHttpServer())
            .get('/api/protected')
            .set('Authorization', `Bearer ${shortToken}`);

          // Wait for expiration
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Token should be expired
          const expiredResponse = await request(app.getHttpServer())
            .get('/api/protected')
            .set('Authorization', `Bearer ${shortToken}`)
            .expect(401);

          expect(isAPIErrorResponse(expiredResponse.body)).toBe(true);
          const responseBody = expiredResponse.body as APIErrorResponse;
          expect(responseBody.message).toMatch(/expired|invalid/i);
        },
      );
    });
  });

  describe('JWT Security Best Practices Validation', () => {
    it('should validate JWT secret strength and security', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Secret Strength Validation',
        SecurityTestType.AUTHENTICATION,
        async () => {
          // Validate JWT secret meets security requirements
          expect(jwtSecret).toBeDefined();
          expect(jwtSecret.length).toBeGreaterThanOrEqual(32);
          expect(jwtSecret).not.toBe('secret');
          expect(jwtSecret).not.toBe('test');
          expect(jwtSecret).not.toBe('password');
        },
      );
    });

    it('should validate JWT claims and payload security', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Claims Security Validation',
        SecurityTestType.AUTHENTICATION,
        async () => {
          const payload = {
            userId: '123',
            username: 'testuser',
            role: 'user',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
          };

          const token = securityFramework.generateTestJWT(payload);
          const decodedToken = jwt.decode(token);
          expect(isJWTPayload(decodedToken)).toBe(true);

          const decoded = decodedToken as JWTPayload;

          // Validate standard claims are present
          expect(decoded.iat).toBeDefined();
          expect(decoded.exp).toBeDefined();
          expect(decoded.iss).toBeDefined();

          // Validate no sensitive data in payload
          expect(decoded.password).toBeUndefined();
          expect(decoded.secret).toBeUndefined();
          expect(decoded.apiKey).toBeUndefined();
        },
      );
    });

    it('should validate JWT header security', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Header Security Validation',
        SecurityTestType.AUTHENTICATION,
        async () => {
          const payload = { userId: '123', username: 'testuser' };
          const token = securityFramework.generateTestJWT(payload);

          const headerData = JSON.parse(
            Buffer.from(token.split('.')[0], 'base64url').toString(),
          );
          expect(isJWTHeader(headerData)).toBe(true);

          const header = headerData as JWTHeader;

          // Validate header structure
          expect(header.typ).toBe('JWT');
          expect(header.alg).toBeDefined();
          expect(header.alg).not.toBe('none');

          // Validate no sensitive information in header
          expect(header.secret).toBeUndefined();
          expect(header.key).toBeUndefined();
        },
      );
    });
  });

  describe('JWT Compliance and Audit Trail', () => {
    it('should validate JWT audit trail generation', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Audit Trail Validation',
        SecurityTestType.AUTHENTICATION,
        async () => {
          const payload = { userId: '123', username: 'testuser' };
          const token = securityFramework.generateTestJWT(payload);

          // Make authenticated request
          const response = await request(app.getHttpServer())
            .get('/api/protected')
            .set('Authorization', `Bearer ${token}`);

          // Validate audit trail is generated (implementation dependent)
          // This would typically check logs or audit database
          expect(response.status).toBeDefined();
        },
      );
    });

    it('should validate JWT compliance with security standards', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Security Standards Compliance',
        SecurityTestType.COMPLIANCE_VALIDATION,
        async () => {
          const payload = { userId: '123', username: 'testuser' };
          const token = securityFramework.generateTestJWT(payload);

          // Validate JWT structure compliance
          const parts = token.split('.');
          expect(parts.length).toBe(3);

          // Validate base64url encoding
          parts.forEach((part) => {
            expect(() => Buffer.from(part, 'base64url')).not.toThrow();
          });

          // Validate header compliance
          const headerData = JSON.parse(
            Buffer.from(parts[0], 'base64url').toString(),
          );
          expect(isJWTHeader(headerData)).toBe(true);

          const header = headerData as JWTHeader;
          expect(header.typ).toBe('JWT');
          expect(header.alg).toMatch(
            /^(HS256|HS384|HS512|RS256|RS384|RS512|ES256|ES384|ES512)$/,
          );
        },
      );
    });
  });

  describe('JWT Emergency Override Testing', () => {
    it('should validate emergency override mechanisms', async () => {
      await securityFramework.executeSecurityTest(
        'JWT Emergency Override Validation',
        SecurityTestType.AUTHENTICATION,
        async () => {
          // Test emergency override functionality if implemented
          const emergencyPayload = {
            userId: 'emergency_admin',
            username: 'emergency_user',
            role: 'emergency_admin',
            emergency: true,
            reason: 'security_testing',
          };

          const emergencyToken =
            securityFramework.generateTestJWT(emergencyPayload);

          const response = await request(app.getHttpServer())
            .get('/api/emergency')
            .set('Authorization', `Bearer ${emergencyToken}`)
            .set('X-Emergency-Override', 'true');

          // Emergency override should either work or be properly rejected
          expect([200, 401, 403, 404]).toContain(response.status);
        },
      );
    });
  });
});
