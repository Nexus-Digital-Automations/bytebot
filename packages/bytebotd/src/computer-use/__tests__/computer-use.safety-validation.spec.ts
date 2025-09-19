/* eslint-env jest */

/**
 * Computer Use Safety and Validation - Comprehensive Security Tests
 *
 * Enterprise-grade security and safety test suite for computer automation,
 * ensuring safe operation, input validation, permission checking, and
 * protection against malicious usage patterns.
 *
 * Test Coverage:
 * - Input validation and sanitization
 * - Coordinate bounds checking and overflow protection
 * - File path validation and directory traversal prevention
 * - Command injection prevention
 * - Rate limiting and abuse prevention
 * - Safe operation boundaries
 * - Error handling security
 * - Resource consumption limits
 * - Permission and authorization validation
 * - Malicious payload detection
 *
 * @version 1.0.0 - Complete Safety and Validation Test Suite
 * @author Subagent 5 - Computer Use Test Coverage Enhancement
 */

// Mock dependencies before imports
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
  access: jest.fn(),
  stat: jest.fn(),
}));

jest.mock('../computer-use.service');
jest.mock('../../nut/nut.service');

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ComputerUseService } from '../computer-use.service';
import { NutService } from '../../nut/nut.service';
import { ComputerActionValidationPipe } from '../dto/computer-action-validation.pipe';
import {
  MoveMouseAction,
  ClickMouseAction,
  TypeTextAction,
  WriteFileAction,
  ReadFileAction,
  ApplicationAction,
} from '@bytebot/shared';
import * as childProcess from 'child_process';
import * as fs from 'fs/promises';

/**
 * Mock implementations
 */
const mockNutService = {
  moveMouse: jest.fn(),
  clickMouse: jest.fn(),
  typeText: jest.fn(),
  screenshot: jest.fn(),
};

const mockComputerUseService = {
  action: jest.fn(),
  screenshot: jest.fn(),
};

describe('Computer Use Safety and Validation', () => {
  let service: ComputerUseService;
  let nutService: jest.Mocked<NutService>;
  let validationPipe: ComputerActionValidationPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ComputerUseService,
          useValue: mockComputerUseService,
        },
        {
          provide: NutService,
          useValue: mockNutService,
        },
        ComputerActionValidationPipe,
      ],
    }).compile();

    service = module.get<ComputerUseService>(ComputerUseService);
    nutService = module.get(NutService);
    validationPipe = module.get<ComputerActionValidationPipe>(ComputerActionValidationPipe);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Coordinate Validation and Bounds Checking', () => {
    it('should reject negative coordinates', async () => {
      const invalidAction: MoveMouseAction = {
        action: 'move_mouse',
        coordinates: { x: -100, y: 200 },
      };

      await expect(
        validationPipe.transform(invalidAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject coordinates exceeding maximum screen bounds', async () => {
      const invalidAction: MoveMouseAction = {
        action: 'move_mouse',
        coordinates: { x: 50000, y: 50000 },
      };

      await expect(
        validationPipe.transform(invalidAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject floating point coordinates with excessive precision', async () => {
      const invalidAction: MoveMouseAction = {
        action: 'move_mouse',
        coordinates: { x: 100.123456789, y: 200.987654321 },
      };

      await expect(
        validationPipe.transform(invalidAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid coordinates within bounds', async () => {
      const validAction: MoveMouseAction = {
        action: 'move_mouse',
        coordinates: { x: 100, y: 200 },
      };

      const result = await validationPipe.transform(validAction, { type: 'body' } as unknown);
      expect(result).toEqual(validAction);
    });

    it('should handle coordinate overflow attacks', async () => {
      const overflowAction: MoveMouseAction = {
        action: 'move_mouse',
        coordinates: { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER },
      };

      await expect(
        validationPipe.transform(overflowAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle NaN and Infinity coordinates', async () => {
      const nanAction: MoveMouseAction = {
        action: 'move_mouse',
        coordinates: { x: NaN, y: Infinity },
      };

      await expect(
        validationPipe.transform(nanAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Text Input Validation and Injection Prevention', () => {
    it('should sanitize text input to prevent command injection', async () => {
      const maliciousAction: TypeTextAction = {
        action: 'type_text',
        text: 'normal text && rm -rf / || echo "malicious"',
      };

      await expect(
        validationPipe.transform(maliciousAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject text with script injection attempts', async () => {
      const scriptInjection: TypeTextAction = {
        action: 'type_text',
        text: '<script>alert("xss")</script>',
      };

      await expect(
        validationPipe.transform(scriptInjection, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject text with SQL injection patterns', async () => {
      const sqlInjection: TypeTextAction = {
        action: 'type_text',
        text: "'; DROP TABLE users; --",
      };

      await expect(
        validationPipe.transform(sqlInjection, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should limit text length to prevent buffer overflow', async () => {
      const oversizedText: TypeTextAction = {
        action: 'type_text',
        text: 'A'.repeat(100000), // Very long text
      };

      await expect(
        validationPipe.transform(oversizedText, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject text with null bytes', async () => {
      const nullByteText: TypeTextAction = {
        action: 'type_text',
        text: 'normal text\x00malicious',
      };

      await expect(
        validationPipe.transform(nullByteText, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept safe text input', async () => {
      const safeAction: TypeTextAction = {
        action: 'type_text',
        text: 'Hello, this is safe text (input ?? "default")',
      };

      const result = await validationPipe.transform(safeAction, { type: 'body' } as unknown);
      expect(result).toEqual(safeAction);
    });
  });

  describe('File Path Validation and Security', () => {
    it('should reject file paths with directory traversal attempts', async () => {
      const traversalAction: WriteFileAction = {
        action: 'write_file',
        filePath: '../../../etc/passwd',
        content: 'malicious content',
      };

      await expect(
        validationPipe.transform(traversalAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject absolute paths to system directories', async () => {
      const systemPathAction: WriteFileAction = {
        action: 'write_file',
        filePath: '/etc/shadow',
        content: 'malicious content',
      };

      await expect(
        validationPipe.transform(systemPathAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject file paths with null bytes', async () => {
      const nullBytePathAction: WriteFileAction = {
        action: 'write_file',
        filePath: '/tmp/file\x00.txt',
        content: 'content',
      };

      await expect(
        validationPipe.transform(nullBytePathAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject file paths with dangerous characters', async () => {
      const dangerousPathAction: WriteFileAction = {
        action: 'write_file',
        filePath: '/tmp/file;rm -rf /',
        content: 'content',
      };

      await expect(
        validationPipe.transform(dangerousPathAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept safe file paths within allowed directories', async () => {
      const safeAction: WriteFileAction = {
        action: 'write_file',
        filePath: '/tmp/safe_file.txt',
        content: 'safe content',
      };

      const result = await validationPipe.transform(safeAction, { type: 'body' } as unknown);
      expect(result).toEqual(safeAction);
    });

    it('should validate file content for dangerous patterns', async () => {
      const dangerousContentAction: WriteFileAction = {
        action: 'write_file',
        filePath: '/tmp/script.sh',
        content: '#!/bin/bash\nrm -rf /',
      };

      await expect(
        validationPipe.transform(dangerousContentAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Application Control Security', () => {
    it('should reject application names with command injection', async () => {
      const maliciousAppAction: ApplicationAction = {
        action: 'application',
        applicationName: 'firefox; rm -rf /',
      };

      await expect(
        validationPipe.transform(maliciousAppAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should restrict application execution to whitelist', async () => {
      const unauthorizedAppAction: ApplicationAction = {
        action: 'application',
        applicationName: 'dangerous_app',
      };

      await expect(
        validationPipe.transform(unauthorizedAppAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept whitelisted applications', async () => {
      const safeAppAction: ApplicationAction = {
        action: 'application',
        applicationName: 'firefox',
      };

      const result = await validationPipe.transform(safeAppAction, { type: 'body' } as unknown);
      expect(result).toEqual(safeAppAction);
    });

    it('should validate application parameters for safety', async () => {
      const maliciousParamsAction: ApplicationAction = {
        action: 'application',
        applicationName: 'firefox',
        arguments: ['--user-data-dir=/tmp', '--disable-security'],
      };

      await expect(
        validationPipe.transform(maliciousParamsAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should detect and prevent rapid-fire mouse click attacks', async () => {
      const rapidClicks: ClickMouseAction[] = Array(1000).fill({
        action: 'click_mouse',
        coordinates: { x: 100, y: 200 },
        clickCount: 1,
        button: 'left',
      });

      // Simulate rapid consecutive clicks
      for (let i = 0; i < 10; i++) {
        await validationPipe.transform(rapidClicks[i], { type: 'body' } as unknown);
      }

      // 11th click should be rate limited
      await expect(
        validationPipe.transform(rapidClicks[10], { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect excessive typing patterns', async () => {
      const longText = 'A'.repeat(10000);
      const excessiveTypingAction: TypeTextAction = {
        action: 'type_text',
        text: longText,
      };

      await expect(
        validationPipe.transform(excessiveTypingAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should track and limit file operations per session', async () => {
      const fileActions: WriteFileAction[] = Array(100).fill({
        action: 'write_file',
        filePath: '/tmp/test.txt',
        content: 'test content',
      });

      // Should allow reasonable number of file operations
      for (let i = 0; i < 5; i++) {
        await validationPipe.transform(fileActions[i], { type: 'body' } as unknown);
      }

      // Excessive file operations should be blocked
      await expect(
        validationPipe.transform(fileActions[50], { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Resource Consumption Protection', () => {
    it('should prevent memory exhaustion attacks via large payloads', async () => {
      const largePayload: WriteFileAction = {
        action: 'write_file',
        filePath: '/tmp/large.txt',
        content: 'X'.repeat(100 * 1024 * 1024), // 100MB content
      };

      await expect(
        validationPipe.transform(largePayload, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should limit concurrent operation requests', async () => {
      const concurrentActions = Array(100).fill({
        action: 'screenshot',
      });

      // Should handle reasonable concurrent requests
      const results = await Promise.allSettled(
        concurrentActions.slice(0, 5).map(action =>
          validationPipe.transform(action, { type: 'body' } as unknown)
        )
      );

      // Some should succeed
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should timeout long-running operations', async () => {
      // Mock a long-running operation
      jest.spyOn(mockComputerUseService, 'action').mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 60000))
      );

      const timeoutAction = {
        action: 'screenshot',
      };

      await expect(
        _Promise.race([
          validationPipe.transform(timeoutAction, { type: 'body' } as unknown),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
        ])
      ).rejects.toThrow('Timeout');
    });
  });

  describe('Input Sanitization and Encoding', () => {
    it('should handle Unicode normalization attacks', async () => {
      const unicodeAttack: TypeTextAction = {
        action: 'type_text',
        text: 'café\u0301', // Using combining characters
      };

      const result = await validationPipe.transform(_unicodeAttack, { type: 'body' } as unknown);
      expect(result.text).toBe('café'); // Should be normalized
    });

    it('should sanitize control characters', async () => {
      const controlCharsAction: TypeTextAction = {
        action: 'type_text',
        text: 'normal\x08\x09\x0A\x0D\x1Btext', // Backspace, tab, newline, carriage return, escape
      };

      const result = await validationPipe.transform(_controlCharsAction, { type: 'body' } as unknown);
      expect(result.text).not.toContain('\x08');
      expect(result.text).not.toContain('\x1B');
    });

    it('should handle encoding attacks', async () => {
      const encodingAttack: TypeTextAction = {
        action: 'type_text',
        text: '%3Cscript%3Ealert%28%27xss%27%29%3C%2Fscript%3E', // URL encoded script
      };

      await expect(
        validationPipe.transform(encodingAttack, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Error Handling Security', () => {
    it('should not leak sensitive information in error messages', async () => {
      const invalidAction = {
        action: 'invalid_action',
        secretData: 'password123',
      };

      try {
        await validationPipe.transform(_invalidAction as unknown, { type: 'body' } as unknown);
      } catch (error) {
        expect(error.message).not.toContain('password123');
        expect(error.message).not.toContain('secretData');
      }
    });

    it('should handle stack trace information leakage', async () => {
      // Mock internal error that could leak stack traces
      jest.spyOn(mockComputerUseService, 'action').mockImplementation(() => {
        throw new Error('Internal database connection failed: mysql://user:password@localhost/db');
      });

      try {
        await service.action({ action: 'screenshot' } as unknown);
      } catch (error) {
        expect(error.message).not.toContain('password');
        expect(error.message).not.toContain('mysql://');
      }
    });

    it('should sanitize file system error messages', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValue(
        new Error('EACCES: permission denied, open \'/root/.ssh/id_rsa\'')
      );

      const fileAction: WriteFileAction = {
        action: 'write_file',
        filePath: '/tmp/test.txt',
        content: 'content',
      };

      try {
        await service.action(fileAction);
      } catch (error) {
        expect(error.message).not.toContain('/root/.ssh/id_rsa');
        expect(error.message).not.toContain('EACCES');
      }
    });
  });

  describe('Permission and Authorization Validation', () => {
    it('should validate user permissions for file operations', async () => {
      const restrictedFileAction: WriteFileAction = {
        action: 'write_file',
        filePath: '/etc/hosts',
        content: 'malicious hosts entry',
      };

      await expect(
        validationPipe.transform(restrictedFileAction, { type: 'body' } as unknown)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should check write permissions before file operations', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const fileAction: WriteFileAction = {
        action: 'write_file',
        filePath: '/tmp/readonly.txt',
        content: 'content',
      };

      await expect(
        service.action(fileAction)
      ).rejects.toThrow();
    });

    it('should validate application execution permissions', async () => {
      const systemAppAction: ApplicationAction = {
        action: 'application',
        applicationName: 'sudo',
      };

      await expect(
        validationPipe.transform(systemAppAction, { type: 'body' } as unknown)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Malicious Pattern Detection', () => {
    it('should detect keyboard shortcut attacks', async () => {
      const maliciousKeys: TypeTextAction = {
        action: 'type_text',
        text: 'ctrl+alt+del', // Dangerous key combination
      };

      await expect(
        validationPipe.transform(maliciousKeys, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect clipboard manipulation attempts', async () => {
      const clipboardAttack: TypeTextAction = {
        action: 'type_text',
        text: 'ctrl+c malicious_content ctrl+v',
      };

      await expect(
        validationPipe.transform(clipboardAttack, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect screen capture evasion attempts', async () => {
      const evasionAction = {
        action: 'screenshot',
        excludeRegions: [
          { x: 0, y: 0, width: 1920, height: 1080 }, // Hide entire screen
        ],
      };

      await expect(
        validationPipe.transform(evasionAction as unknown, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect automation detection evasion', async () => {
      const evasionClicks: ClickMouseAction = {
        action: 'click_mouse',
        coordinates: { x: 100, y: 200 },
        clickCount: 1,
        button: 'left',
        humanDelay: false, // Attempting to bypass human simulation
      };

      const result = await validationPipe.transform(_evasionClicks, { type: 'body' } as unknown);
      expect(result.humanDelay).toBe(true); // Should be forced to true for safety
    });
  });

  describe('System Resource Protection', () => {
    it('should prevent CPU exhaustion through complex operations', async () => {
      const complexAction = {
        action: 'move_mouse',
        coordinates: { x: 100, y: 200 },
        path: Array(10000).fill({ x: 100, y: 200 }), // Extremely complex path
      };

      await expect(
        validationPipe.transform(complexAction as unknown, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should limit screenshot resolution to prevent memory attacks', async () => {
      const highResScreenshot = {
        action: 'screenshot',
        resolution: { width: 32000, height: 32000 }, // Excessive resolution
      };

      await expect(
        validationPipe.transform(highResScreenshot as unknown, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent disk space exhaustion through file operations', async () => {
      const largFileAction: WriteFileAction = {
        action: 'write_file',
        filePath: '/tmp/huge.txt',
        content: 'X'.repeat(1024 * 1024 * 1024), // 1GB file
      };

      await expect(
        validationPipe.transform(largFileAction, { type: 'body' } as unknown)
      ).rejects.toThrow(BadRequestException);
    });
  });
});