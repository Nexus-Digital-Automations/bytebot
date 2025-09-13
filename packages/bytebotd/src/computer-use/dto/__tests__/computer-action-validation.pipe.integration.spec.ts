/* eslint-env jest */

/**
 * Security Validation Pipeline Integration Tests
 * Tests the enhanced multi-stage security validation pipeline integration
 *
 * @version 1.0.0 - Integration Test Suite
 * @author Security Event Validation Pipeline Subagent
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { ComputerActionValidationPipe } from '../computer-action-validation.pipe';

/**
 * Interface for typed argument metadata used in tests
 */
interface TypedArgumentMetadata extends ArgumentMetadata {
  type: 'body' | 'query' | 'param' | 'custom';
  metatype?: new (...args: unknown[]) => unknown;
  data?: string;
}

/**
 * Helper to create typed argument metadata for tests
 */
function createArgumentMetadata(
  overrides: Partial<TypedArgumentMetadata> = {},
): TypedArgumentMetadata {
  return {
    type: 'body',
    metatype: Object,
    data: undefined,
    ...overrides,
  };
}

// Mock the security utils to avoid compilation issues
jest.mock('@bytebot/shared/utils/security.utils', () => ({
  detectXSS: jest.fn().mockReturnValue(false), // Legacy function for decorators
  detectSQLInjection: jest.fn().mockReturnValue({
    hasInjection: false,
    threats: [],
    riskScore: 0,
    severity: 'low',
    confidence: 100,
    detectionContext: [],
  }),
  detectAdvancedXSS: jest.fn().mockReturnValue({
    hasXSS: false,
    threats: [],
    riskScore: 0,
    severity: 'low',
    confidence: 100,
    detectionContext: [],
  }),
  detectCommandInjection: jest.fn().mockReturnValue({
    hasInjection: false,
    threats: [],
    riskScore: 0,
    severity: 'low',
    confidence: 100,
    detectionContext: [],
    attackVectors: [],
    platform: 'unix',
  }),
  detectMaliciousFileContent: jest.fn().mockReturnValue(false),
  validateFilePath: jest.fn().mockImplementation(() => ({
    isValid: true,
    errors: [],
    riskScore: 0,
    severity: 'low',
    detectionContext: [],
  })),
  validateCoordinates: jest.fn().mockImplementation(() => ({
    isValid: true,
    errors: [],
    riskScore: 0,
    severity: 'low',
    isOverflow: false,
    normalizedCoordinates: { x: 100, y: 200 },
  })),
  createSecurityEvent: jest.fn().mockReturnValue({
    eventId: 'test-event-id',
    type: 'suspicious_activity',
    timestamp: new Date(),
    riskScore: 0,
  }),
  SecurityEventType: {
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    VALIDATION_FAILED: 'validation_failed',
  },
}));

/**
 * Security validation error response interface
 */
interface SecurityValidationErrorResponse {
  message: string;
  operationId: string;
  threatTypes: string[];
  totalRiskScore: number;
  threatLevel: string;
  validationStages: string[];
  detectionCount: number;
  timestamp: string;
}

describe('ComputerActionValidationPipe - Integration Tests', () => {
  let pipe: ComputerActionValidationPipe;
  let mockDetectAdvancedXSS: jest.Mock;
  let mockDetectSQLInjection: jest.Mock;
  let mockDetectCommandInjection: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComputerActionValidationPipe],
    }).compile();

    pipe = module.get<ComputerActionValidationPipe>(
      ComputerActionValidationPipe,
    );

    // Get mocked functions
    const securityUtils = require('@bytebot/shared/utils/security.utils') as {
      detectAdvancedXSS: jest.Mock;
      detectSQLInjection: jest.Mock;
      detectCommandInjection: jest.Mock;
    };
    mockDetectAdvancedXSS = securityUtils.detectAdvancedXSS as jest.Mock;
    mockDetectSQLInjection = securityUtils.detectSQLInjection as jest.Mock;
    mockDetectCommandInjection =
      securityUtils.detectCommandInjection as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Enhanced Security Pipeline Integration', () => {
    it('should integrate all security functions in the validation pipeline', async () => {
      const validInput = {
        action: 'type_text',
        text: 'Hello World',
      };

      const result = await pipe.transform(validInput, {} as ArgumentMetadata);

      expect(result).toBeDefined();
      expect(result.action).toBe('type_text');

      // Verify that security functions were called
      expect(mockDetectAdvancedXSS).toHaveBeenCalled();
      expect(mockDetectSQLInjection).toHaveBeenCalled();
      expect(mockDetectCommandInjection).toHaveBeenCalledWith(
        expect.any(String),
        { strictMode: true, contextType: 'form' },
      );
    });

    it('should block requests when XSS threats are detected', async () => {
      // Mock XSS detection to return threat
      mockDetectAdvancedXSS.mockReturnValueOnce({
        hasXSS: true,
        threats: ['Script Injection'],
        riskScore: 85,
        severity: 'high',
        confidence: 95,
        detectionContext: ['html-injection'],
      });

      const maliciousInput = {
        action: 'type_text',
        text: '<script>alert("xss")</script>',
      };

      await expect(
        pipe.transform(maliciousInput, {
          type: 'body',
          metatype: Object,
          data: undefined,
        } as ArgumentMetadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block requests when SQL injection threats are detected', async () => {
      // Mock SQL injection detection to return threat
      mockDetectSQLInjection.mockReturnValueOnce({
        hasInjection: true,
        threats: ['Boolean Blind Injection'],
        riskScore: 90,
        severity: 'critical',
        confidence: 98,
        detectionContext: ['mysql-injection'],
        databaseType: 'mysql',
      });

      const maliciousInput = {
        action: 'type_text',
        text: "'; DROP TABLE users; --",
      };

      await expect(
        pipe.transform(maliciousInput, {
          type: 'body',
          metatype: Object,
          data: undefined,
        } as ArgumentMetadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block requests when command injection threats are detected', async () => {
      // Mock command injection detection to return threat
      mockDetectCommandInjection.mockReturnValueOnce({
        hasInjection: true,
        threats: ['Shell Command Separator'],
        riskScore: 95,
        severity: 'critical',
        confidence: 97,
        detectionContext: ['unix-commands'],
        attackVectors: ['shell-separator'],
        platform: 'unix',
      });

      const maliciousInput = {
        action: 'type_text',
        text: 'test; rm -rf /',
      };

      await expect(
        pipe.transform(maliciousInput, {
          type: 'body',
          metatype: Object,
          data: undefined,
        } as ArgumentMetadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use correct security context for different action types', async () => {
      const testCases = [
        { action: 'write_file', expectedContext: 'file' },
        { action: 'read_file', expectedContext: 'file' },
        { action: 'type_text', expectedContext: 'form' },
        { action: 'paste_text', expectedContext: 'form' },
        { action: 'application', expectedContext: 'url' },
        { action: 'move_mouse', expectedContext: 'api' },
      ];

      for (const testCase of testCases) {
        const input = { action: testCase.action };

        try {
          await pipe.transform(input, {} as ArgumentMetadata);
        } catch (_error) {
          // Ignore validation errors for incomplete inputs
        }

        expect(mockDetectCommandInjection).toHaveBeenCalledWith(
          expect.any(String),
          { strictMode: true, contextType: testCase.expectedContext },
        );

        jest.clearAllMocks();
      }
    });

    it('should aggregate multiple threats correctly', async () => {
      // Mock multiple threat detections
      mockDetectAdvancedXSS.mockReturnValueOnce({
        hasXSS: true,
        threats: ['Script Injection'],
        riskScore: 40,
        severity: 'medium',
        confidence: 90,
        detectionContext: ['html-injection'],
      });

      mockDetectSQLInjection.mockReturnValueOnce({
        hasInjection: true,
        threats: ['Union Injection'],
        riskScore: 50,
        severity: 'high',
        confidence: 95,
        detectionContext: ['union-based'],
        databaseType: 'postgresql',
      });

      const maliciousInput = {
        action: 'type_text',
        text: '<script>alert(1)</script> UNION SELECT * FROM users',
      };

      try {
        await pipe.transform(maliciousInput, {} as ArgumentMetadata);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const badRequestError = error as BadRequestException;
        const response = badRequestError.getResponse() as any;
        expect(response.message).toContain('security threats detected');
        expect(response.threatTypes).toContain('ADVANCED_XSS');
        expect(response.threatTypes).toContain('ADVANCED_SQL_INJECTION');
        expect(response.totalRiskScore).toBeGreaterThan(0);
      }
    });

    it('should provide comprehensive _error response structure', async () => {
      // Mock threat detection
      mockDetectAdvancedXSS.mockReturnValueOnce({
        hasXSS: true,
        threats: ['Script Injection'],
        riskScore: 75,
        severity: 'high',
        confidence: 93,
        detectionContext: ['html-injection'],
      });

      const maliciousInput = {
        action: 'type_text',
        text: '<script>malicious()</script>',
      };

      try {
        await pipe.transform(maliciousInput, {} as ArgumentMetadata);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        const badRequestError = error as BadRequestException;
        const response =
          badRequestError.getResponse() as SecurityValidationErrorResponse;
        expect(response).toHaveProperty('message');
        expect(response).toHaveProperty('operationId');
        expect(response).toHaveProperty('threatTypes');
        expect(response).toHaveProperty('totalRiskScore');
        expect(response).toHaveProperty('threatLevel');
        expect(response).toHaveProperty('validationStages');
        expect(response).toHaveProperty('detectionCount');
        expect(response).toHaveProperty('timestamp');

        const typedResponse = response as any;
        expect(Array.isArray(typedResponse.threatTypes)).toBe(true);
        expect(Array.isArray(typedResponse.validationStages)).toBe(true);
        expect(typeof typedResponse.totalRiskScore).toBe('number');
        expect(typedResponse.detectionCount).toBeGreaterThan(0);
      }
    });

    it('should handle valid inputs without false positives', async () => {
      // Reset all mocks to ensure clean state
      jest.clearAllMocks();

      const validInputs = [
        { action: 'type_text', text: 'Hello World' },
        { action: 'wait', duration: 1000 },
        { action: 'screenshot' },
      ];

      for (const input of validInputs) {
        const result = await pipe.transform(input, {} as ArgumentMetadata);
        expect(result).toBeDefined();
        expect(result.action).toBe(input.action);
      }
    });

    it('should enforce _payload size limits', async () => {
      const largePayload = {
        action: 'type_text',
        text: 'A'.repeat(2 * 1024 * 1024), // 2MB payload
      };

      await expect(
        pipe.transform(largePayload, {
          type: 'body',
          metatype: Object,
          data: undefined,
        })),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Security Pipeline Performance', () => {
    it('should complete security validation within reasonable time', async () => {
      const input = {
        action: 'screenshot',
      };

      const start = Date.now();
      await pipe.transform(input, {} as ArgumentMetadata);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });
  });
});
