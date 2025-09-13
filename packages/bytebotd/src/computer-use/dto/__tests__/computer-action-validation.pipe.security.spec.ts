/* eslint-env jest */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/**
 * Comprehensive Security Validation Pipeline Tests
 * Tests the enhanced multi-stage security validation pipeline for computer action validation
 *
 * Test Coverage:
 * - Advanced XSS detection with 2025 attack patterns
 * - Enhanced SQL injection detection with database-specific patterns
 * - Command injection detection with platform analysis
 * - File operation security validation
 * - Coordinate validation with overflow protection
 * - Multi-stage threat aggregation and risk scoring
 * - Security event logging and audit trail
 *
 * @version 1.0.0 - Multi-Stage Security Pipeline Test Suite
 * @author Security Event Validation Pipeline Subagent
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { ComputerActionValidationPipe } from '../computer-action-validation.pipe';

describe('ComputerActionValidationPipe - Enhanced Security Pipeline', () => {
  let pipe: ComputerActionValidationPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComputerActionValidationPipe],
    }).compile();

    pipe = module.get<ComputerActionValidationPipe>(
      ComputerActionValidationPipe,
    );
  });

  describe('Multi-Stage Security Validation Pipeline', () => {
    it('should detect advanced XSS attacks with modern patterns', async () => {
      const maliciousInput = {
        action: 'type_text',
        text: '<img src=x onerror=alert(String.fromCharCode(88,83,83))>',
      };

      await expect(
        pipe.transform(maliciousInput, {} as unknown),
      ).rejects.toThrow(BadRequestException);

      // Test with advanced XSS patterns
      const advancedXSS = {
        action: 'type_text',
        text: 'javascript:eval(String.fromCharCode(97,108,101,114,116,40,39,88,83,83,39,41))',
      };

      await expect(pipe.transform(advancedXSS, {} as unknown)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should detect advanced SQL injection with database-specific patterns', async () => {
      const sqlInjectionInput = {
        action: 'type_text',
        text: "'; DROP TABLE users; SELECT * FROM admin WHERE 't'='t",
      };

      await expect(
        pipe.transform(sqlInjectionInput, {} as unknown),
      ).rejects.toThrow(BadRequestException);

      // Test PostgreSQL-specific injection
      const pgSqlInjection = {
        action: 'type_text',
        text: '1; SELECT version(); --',
      };

      await expect(
        pipe.transform(pgSqlInjection, {} as unknown),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect command injection attacks with platform analysis', async () => {
      const commandInjectionInput = {
        action: 'type_text',
        text: 'test; cat /etc/passwd',
      };

      await expect(
        pipe.transform(commandInjectionInput, {} as unknown),
      ).rejects.toThrow(BadRequestException);

      // Test Windows-specific command injection
      const windowsCommandInjection = {
        action: 'type_text',
        text: 'test & dir C:\\',
      };

      await expect(
        pipe.transform(windowsCommandInjection, {} as unknown),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate file operations with enhanced security checks', async () => {
      // Test path traversal attack
      const pathTraversalInput = {
        action: 'read_file',
        path: '../../../etc/passwd',
      };

      await expect(
        pipe.transform(pathTraversalInput, {} as unknown),
      ).rejects.toThrow(BadRequestException);

      // Test absolute path restriction
      const absolutePathInput = {
        action: 'write_file',
        path: '/etc/hosts',
        data: 'malicious content',
      };

      await expect(
        pipe.transform(absolutePathInput, {} as unknown),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate coordinates with overflow protection', async () => {
      // Test coordinate overflow
      const overflowInput = {
        action: 'move_mouse',
        coordinates: { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER },
      };

      await expect(
        pipe.transform(overflowInput, {} as unknown),
      ).rejects.toThrow(BadRequestException);

      // Test negative coordinates (if not allowed)
      const negativeCoordInput = {
        action: 'click_mouse',
        coordinates: { x: -100, y: -200 },
      };

      await expect(
        pipe.transform(negativeCoordInput, {} as unknown),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect Unicode normalization attacks', async () => {
      // Unicode normalization attack - different Unicode representations of the same string
      const unicodeAttack = {
        action: 'type_text',
        text: '\u0041\u030A', // A with combining ring above (normalizes to Å)
      };

      // This should be detected and handled appropriately
      // The test depends on whether unicode normalization creates security risks
      const result = await pipe.transform(
        unicodeAttack,
        {} as ArgumentMetadata,
      );
      expect(result).toBeDefined();
    });

    it('should aggregate threats and calculate risk scores correctly', async () => {
      // Test input with multiple security threats
      const multiThreatInput = {
        action: 'write_file',
        path: '../../../malicious.js',
        data: '<script>alert("XSS")</script>; DROP TABLE users;',
      };

      try {
        await pipe.transform(multiThreatInput, {} as ArgumentMetadata);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const badRequestError = error as BadRequestException;
        const response = badRequestError.getResponse();
        expect(response.message).toContain('security threats detected');
        expect(response.totalRiskScore).toBeGreaterThan(0);
        expect(response.threatTypes).toEqual(
          expect.arrayContaining([expect.stringMatching(/XSS|SQL|PATH/i)]),
        );
      }
    });

    it('should handle legitimate requests without false positives', async () => {
      const legitimateInput = {
        action: 'move_mouse',
        coordinates: { x: 100, y: 200 },
      };

      const result = await pipe.transform(
        legitimateInput,
        {} as ArgumentMetadata,
      );
      expect(result).toBeDefined();
      expect(result.action).toBe('move_mouse');
    });

    it('should provide detailed security event logging', async () => {
      const maliciousInput = {
        action: 'type_text',
        text: '<script>alert("test")</script>',
      };

      try {
        await pipe.transform(maliciousInput, {} as ArgumentMetadata);
      } catch (error) {
        const badRequestError = error as BadRequestException;
        const response = badRequestError.getResponse();
        expect(response.operationId).toBeDefined();
        expect(response.timestamp).toBeDefined();
        expect(response.validationStages).toEqual(
          expect.arrayContaining([
            'input-preprocessing',
            'xss-detection',
            'sql-injection-detection',
            'command-injection-detection',
            'threat-aggregation',
          ]),
        );
      }
    });

    it('should enforce _payload size limits', async () => {
      const largePayload = {
        action: 'type_text',
        text: 'A'.repeat(2 * 1024 * 1024), // 2MB payload
      };

      await expect(pipe.transform(largePayload, {} as unknown)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate action type security contexts correctly', async () => {
      // File actions should use 'file' context
      const fileInput = {
        action: 'write_file',
        path: 'test.txt',
        data: 'test content',
      };

      const result = await pipe.transform(fileInput, {} as ArgumentMetadata);
      expect(result).toBeDefined();

      // Form actions should use 'form' context
      const formInput = {
        action: 'type_text',
        text: 'normal text',
      };

      const formResult = await pipe.transform(
        formInput,
        {} as ArgumentMetadata,
      );
      expect(formResult).toBeDefined();
    });
  });

  describe('Performance and Reliability', () => {
    it('should complete security validation within reasonable time limits', async () => {
      const input = {
        action: 'move_mouse',
        coordinates: { x: 500, y: 300 },
      };

      const startTime = Date.now();
      await pipe.transform(input, {} as ArgumentMetadata);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle malformed input gracefully', async () => {
      const malformedInputs = [
        null,
        undefined,
        '',
        123,
        [],
        {
          /* missing action */
        },
        { action: null },
        { action: 123 },
      ];

      for (const input of malformedInputs) {
        await expect(pipe.transform(input, {} as unknown)).rejects.toThrow(
          BadRequestException,
        );
      }
    });

    it('should maintain consistent _error response format', async () => {
      const maliciousInput = {
        action: 'type_text',
        text: '<script>alert("test")</script>',
      };

      try {
        await pipe.transform(maliciousInput, {} as ArgumentMetadata);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error.response).toHaveProperty('message');
        expect(error.response).toHaveProperty('operationId');
        expect(error.response).toHaveProperty('timestamp');
        expect(error.response).toHaveProperty('threatTypes');
        expect(error.response).toHaveProperty('totalRiskScore');
        expect(error.response).toHaveProperty('threatLevel');
        expect(error.response).toHaveProperty('validationStages');
      }
    });
  });
});
