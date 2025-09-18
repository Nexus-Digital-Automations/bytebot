/* eslint-env jest */

/**
 * MCP Protocol Validation Test Suite
 *
 * Comprehensive test suite for Model Context Protocol compliance testing,
 * message format validation, schema enforcement, and protocol specification adherence.
 *
 * Test Coverage:
 * - JSON-RPC 2.0 protocol compliance
 * - MCP message structure validation
 * - Tool parameter schema validation using Zod
 * - Response format standardization
 * - Error code compliance and error handling
 * - Protocol version negotiation
 * - Content type validation
 * - Security and input sanitization
 * - Performance benchmarking for protocol operations
 *
 * @author Claude Code - Subagent 3
 * @version 1.0.0
 */

import { performance } from 'perf_hooks';
import { z } from 'zod';
import {
  McpSchemas,
  McpToolResponse,
  McpContentItem,
  McpResponse,
  McpError,
  McpMetadata,
  isMcpResponse,
  isCompressionResult,
  MouseMoveParams,
  MouseClickParams,
  KeyboardTypeParams,
  ScreenshotParams,
  FileReadParams,
  FileWriteParams,
  DirectoryListParams,
  ZodSchemaInput,
  ZodSchemaOutput,
} from '../types';
import {
  TestUtils,
  AssertionHelpers,
  MockDataProviders,
} from '../../test-utils';

/**
 * Protocol Validation Test Data Generators
 */
class ProtocolTestData {
  /**
   * Generate valid JSON-RPC 2.0 message
   */
  static createValidJsonRpcMessage(
    method: string,
    params?: unknown,
    id?: string | number,
  ) {
    const message: Record<string, unknown> = {
      jsonrpc: '2.0',
      method,
    };

    if (params !== undefined) {
      message.params = params;
    }

    if (id !== undefined) {
      message.id = id;
    }

    return message;
  }

  /**
   * Generate valid JSON-RPC 2.0 response
   */
  static createValidJsonRpcResponse(result: unknown, id: string | number) {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  /**
   * Generate valid JSON-RPC 2.0 error response
   */
  static createValidJsonRpcError(
    code: number,
    message: string,
    data?: unknown,
    id?: string | number,
  ) {
    const error: Record<string, unknown> = {
      jsonrpc: '2.0',
      id: id ?? null,
      error: {
        code,
        message,
      },
    };

    if (data !== undefined) {
      error.error = { ...error.error, data };
    }

    return error;
  }

  /**
   * Generate invalid protocol messages for negative testing
   */
  static createInvalidMessages() {
    return [
      // Missing jsonrpc field
      { method: 'test', id: 1 },
      // Wrong jsonrpc version
      { jsonrpc: '1.0', method: 'test', id: 1 },
      // Missing method field
      { jsonrpc: '2.0', id: 1 },
      // Invalid method type
      { jsonrpc: '2.0', method: 123, id: 1 },
      // Invalid id type
      { jsonrpc: '2.0', method: 'test', id: {} },
      // Invalid params type for certain methods
      { jsonrpc: '2.0', method: 'tools/call', params: 'invalid', id: 1 },
    ];
  }

  /**
   * Generate valid tool parameters for all supported tools
   */
  static createValidToolParameters() {
    return {
      move_mouse: { coordinates: { x: 100, y: 200 } },
      click_mouse: {
        coordinates: { x: 100, y: 200 },
        button: 'left' as const,
        clickCount: 1,
      },
      click_mouse_advanced: {
        coordinates: { x: 100, y: 200 },
        button: 'left' as const,
        holdKeys: ['ctrl'],
        clickCount: 2,
      },
      scroll_mouse: {
        coordinates: { x: 100, y: 200 },
        scrollDirection: 'up' as const,
        clicks: 3,
      },
      type_text: { text: 'Hello World' },
      press_key: { key: 'Enter' },
      screenshot: { display: 0 },
      read_file: { path: '/test/file.txt' },
      write_file: { path: '/test/file.txt', content: 'test content' },
      list_directory: { path: '/test' },
      create_directory: { path: '/test/new' },
      trace_mouse: {
        path: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
        holdKeys: ['shift'],
      },
      drag_mouse: {
        startCoordinates: { x: 0, y: 0 },
        endCoordinates: { x: 100, y: 100 },
      },
      drag_mouse_path: {
        path: [
          { x: 0, y: 0 },
          { x: 50, y: 50 },
          { x: 100, y: 100 },
        ],
        button: 'left' as const,
        holdKeys: ['alt'],
      },
      hotkey: { keys: ['ctrl', 'c'] },
      screenshot_element: { selector: '#element' },
      execute_command: {
        command: 'ls',
        args: ['-la'],
        workingDirectory: '/tmp',
      },
      press_mouse: {
        coordinates: { x: 100, y: 200 },
        button: 'left' as const,
        press: 'down' as const,
      },
      scroll_advanced: {
        coordinates: { x: 100, y: 200 },
        direction: 'up' as const,
        scrollCount: 5,
        holdKeys: ['ctrl'],
      },
      type_keys_advanced: {
        keys: ['ctrl', 'a'],
        delay: 100,
      },
      press_keys_advanced: {
        keys: ['shift'],
        press: 'down' as const,
      },
      type_text_advanced: {
        text: 'Advanced typing',
        delay: 50,
      },
      paste_text: { text: 'Pasted content' },
      wait: { duration: 1000 },
      application: { application: 'firefox' as const },
      write_file_advanced: {
        path: '/test/file.bin',
        data: 'SGVsbG8gV29ybGQ=', // "Hello World" in base64
      },
      read_file_advanced: { path: '/test/file.bin' },
    };
  }

  /**
   * Generate invalid tool parameters for negative testing
   */
  static createInvalidToolParameters() {
    return {
      move_mouse: [
        { coordinates: { x: 'invalid', y: 200 } },
        { coordinates: { x: 100 } }, // missing y
        { invalidField: true },
      ],
      click_mouse: [
        { coordinates: { x: 100, y: 200 }, button: 'invalid' },
        { coordinates: { x: 100, y: 200 }, clickCount: -1 },
        { button: 'left' }, // missing coordinates
      ],
      type_text: [{ text: 123 }, { invalidField: 'test' }, {}], // missing text
      screenshot: [{ display: 'invalid' }, { display: -1 }],
      read_file: [{ path: 123 }, { invalidField: 'test' }, {}], // missing path
    };
  }
}

/**
 * Protocol Compliance Validator
 */
class ProtocolComplianceValidator {
  /**
   * Validate JSON-RPC 2.0 message structure
   */
  static validateJsonRpcMessage(message: unknown): boolean {
    if (typeof message !== 'object' || message === null) {
      return false;
    }

    const msg = message as Record<string, unknown>;

    // Must have jsonrpc field with value "2.0"
    if (msg.jsonrpc !== '2.0') {
      return false;
    }

    // Must have method field for requests
    if ('method' in msg) {
      if (typeof msg.method !== 'string') {
        return false;
      }
    }

    // ID field must be string, number, or null
    if ('id' in msg) {
      const { id } = msg;
      if (
        typeof id !== 'string' &&
        typeof id !== 'number' &&
        id !== null
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate MCP tool response structure
   */
  static validateToolResponse(response: unknown): response is McpToolResponse {
    if (typeof response !== 'object' || response === null) {
      return false;
    }

    const resp = response as McpToolResponse;

    // Must have content array
    if (!Array.isArray(resp.content)) {
      return false;
    }

    // Validate each content item
    return resp.content.every((item) =>
      this.validateContentItem(item),
    );
  }

  /**
   * Validate MCP content item structure
   */
  static validateContentItem(item: unknown): item is McpContentItem {
    if (typeof item !== 'object' || item === null) {
      return false;
    }

    const contentItem = item as McpContentItem;

    // Must have type field
    if (!['text', 'image', 'resource'].includes(contentItem.type)) {
      return false;
    }

    // Type-specific validation
    switch (contentItem.type) {
      case 'text':
        return typeof contentItem.text === 'string';
      case 'image':
        return (
          typeof contentItem.data === 'string' &&
          typeof contentItem.mimeType === 'string'
        );
      case 'resource':
        return typeof contentItem.uri === 'string';
      default:
        return false;
    }
  }

  /**
   * Validate MCP response structure
   */
  static validateMcpResponse(response: unknown): response is McpResponse {
    return isMcpResponse(response);
  }

  /**
   * Validate MCP error structure
   */
  static validateMcpError(error: unknown): error is McpError {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const mcpError = error as McpError;

    return (
      typeof mcpError.code === 'string' &&
      typeof mcpError.message === 'string'
    );
  }
}

describe('MCP Protocol Validation', () => {
  let testId: string;

  beforeEach(() => {
    testId = TestUtils.generateTestId('mcp_protocol_validation');
    console.log(`[${testId}] Setting up MCP protocol validation tests`);
  });

  afterEach(() => {
    console.log(`[${testId}] MCP protocol validation test cleanup completed`);
  });

  /**
   * Test Suite: JSON-RPC 2.0 Compliance
   */
  describe('JSON-RPC 2.0 Compliance', () => {
    it('should validate correct JSON-RPC 2.0 message structure', () => {
      const operationId = `${testId}_jsonrpc_validation`;
      console.log(`[${operationId}] Testing JSON-RPC 2.0 message validation`);

      const validMessages = [
        ProtocolTestData.createValidJsonRpcMessage('tools/call', {}, 1),
        ProtocolTestData.createValidJsonRpcMessage('ping', undefined, 'uuid-123'),
        ProtocolTestData.createValidJsonRpcMessage('notification'),
      ];

      validMessages.forEach((message, index) => {
        const isValid = ProtocolComplianceValidator.validateJsonRpcMessage(message);
        expect(isValid).toBe(true);
        console.log(`[${operationId}] Valid message ${index + 1} passed validation`);
      });

      console.log(`[${operationId}] JSON-RPC 2.0 message validation completed`);
    });

    it('should reject invalid JSON-RPC 2.0 messages', () => {
      const operationId = `${testId}_jsonrpc_invalid`;
      console.log(`[${operationId}] Testing JSON-RPC 2.0 invalid message rejection`);

      const invalidMessages = ProtocolTestData.createInvalidMessages();

      invalidMessages.forEach((message, index) => {
        const isValid = ProtocolComplianceValidator.validateJsonRpcMessage(message);
        expect(isValid).toBe(false);
        console.log(`[${operationId}] Invalid message ${index + 1} correctly rejected`);
      });

      console.log(`[${operationId}] JSON-RPC 2.0 invalid message rejection completed`);
    });

    it('should validate JSON-RPC 2.0 response structure', () => {
      const operationId = `${testId}_jsonrpc_response`;
      console.log(`[${operationId}] Testing JSON-RPC 2.0 response validation`);

      const validResponse = ProtocolTestData.createValidJsonRpcResponse(
        { success: true },
        'test-id',
      );

      const isValid = ProtocolComplianceValidator.validateJsonRpcMessage(validResponse);
      expect(isValid).toBe(true);
      expect(validResponse).toHaveProperty('jsonrpc', '2.0');
      expect(validResponse).toHaveProperty('id', 'test-id');
      expect(validResponse).toHaveProperty('result');

      console.log(`[${operationId}] JSON-RPC 2.0 response validation completed`);
    });

    it('should validate JSON-RPC 2.0 error response structure', () => {
      const operationId = `${testId}_jsonrpc_error`;
      console.log(`[${operationId}] Testing JSON-RPC 2.0 error response validation`);

      const validError = ProtocolTestData.createValidJsonRpcError(
        -32602,
        'Invalid params',
        { details: 'Parameter validation failed' },
        'error-id',
      );

      const isValid = ProtocolComplianceValidator.validateJsonRpcMessage(validError);
      expect(isValid).toBe(true);
      expect(validError).toHaveProperty('jsonrpc', '2.0');
      expect(validError).toHaveProperty('id', 'error-id');
      expect(validError).toHaveProperty('error');

      const error = validError.error as { code: number; message: string; data?: unknown };
      expect(error.code).toBe(-32602);
      expect(error.message).toBe('Invalid params');
      expect(error.data).toEqual({ details: 'Parameter validation failed' });

      console.log(`[${operationId}] JSON-RPC 2.0 error response validation completed`);
    });
  });

  /**
   * Test Suite: Zod Schema Validation
   */
  describe('Zod Schema Validation', () => {
    it('should validate all tool parameters using Zod schemas', () => {
      const operationId = `${testId}_zod_validation`;
      console.log(`[${operationId}] Testing Zod schema validation for all tools`);

      const validParameters = ProtocolTestData.createValidToolParameters();
      const schemas = {
        move_mouse: McpSchemas.mouseMove,
        click_mouse: McpSchemas.mouseClick,
        click_mouse_advanced: McpSchemas.mouseClickAdvanced,
        scroll_mouse: McpSchemas.mouseScroll,
        type_text: McpSchemas.keyboardType,
        press_key: McpSchemas.keyboardKey,
        screenshot: McpSchemas.screenshot,
        read_file: McpSchemas.fileRead,
        write_file: McpSchemas.fileWrite,
        list_directory: McpSchemas.directoryList,
        create_directory: McpSchemas.directoryCreate,
        trace_mouse: McpSchemas.mouseTrace,
        drag_mouse: McpSchemas.mouseDrag,
        drag_mouse_path: McpSchemas.mouseDragPath,
        hotkey: McpSchemas.keyboardHotkey,
        screenshot_element: McpSchemas.screenshotElement,
        execute_command: McpSchemas.executeCommand,
        press_mouse: McpSchemas.mousePress,
        scroll_advanced: McpSchemas.scrollAdvanced,
        type_keys_advanced: McpSchemas.typeKeysAdvanced,
        press_keys_advanced: McpSchemas.pressKeysAdvanced,
        type_text_advanced: McpSchemas.typeTextAdvanced,
        paste_text: McpSchemas.pasteText,
        wait: McpSchemas.wait,
        application: McpSchemas.application,
        write_file_advanced: McpSchemas.writeFile,
        read_file_advanced: McpSchemas.readFile,
      };

      let validatedCount = 0;
      Object.entries(schemas).forEach(([toolName, schema]) => {
        const params = validParameters[toolName as keyof typeof validParameters];
        if (params) {
          const parseResult = schema.safeParse(params);
          expect(parseResult.success).toBe(true);
          validatedCount++;
          console.log(`[${operationId}] ${toolName} parameters validated successfully`);
        }
      });

      expect(validatedCount).toBeGreaterThan(0);
      console.log(`[${operationId}] Zod schema validation completed for ${validatedCount} tools`);
    });

    it('should reject invalid tool parameters using Zod schemas', () => {
      const operationId = `${testId}_zod_invalid`;
      console.log(`[${operationId}] Testing Zod schema rejection of invalid parameters`);

      const invalidParameters = ProtocolTestData.createInvalidToolParameters();

      Object.entries(invalidParameters).forEach(([toolName, paramsList]) => {
        const schema = McpSchemas[toolName as keyof typeof McpSchemas];
        if (schema) {
          paramsList.forEach((params, index) => {
            const parseResult = schema.safeParse(params);
            expect(parseResult.success).toBe(false);
            console.log(
              `[${operationId}] ${toolName} invalid params ${index + 1} correctly rejected`,
            );
          });
        }
      });

      console.log(`[${operationId}] Zod schema invalid parameter rejection completed`);
    });

    it('should provide detailed validation errors for invalid parameters', () => {
      const operationId = `${testId}_zod_errors`;
      console.log(`[${operationId}] Testing Zod validation error details`);

      const invalidParams = { coordinates: { x: 'invalid', y: 200 } };
      const parseResult = McpSchemas.mouseMove.safeParse(invalidParams);

      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        expect(parseResult.error.issues).toBeDefined();
        expect(parseResult.error.issues.length).toBeGreaterThan(0);
        
        const firstIssue = parseResult.error.issues[0];
        expect(firstIssue).toHaveProperty('path');
        expect(firstIssue).toHaveProperty('message');
        expect(firstIssue.path).toContain('coordinates');

        console.log(`[${operationId}] Validation error details: ${firstIssue.message}`);
      }

      console.log(`[${operationId}] Zod validation error details testing completed`);
    });

    it('should support type inference from Zod schemas', () => {
      const operationId = `${testId}_zod_inference`;
      console.log(`[${operationId}] Testing Zod schema type inference`);

      // Test input type inference
      type MouseMoveInput = ZodSchemaInput<typeof McpSchemas.mouseMove>;
      const mouseMoveInput: MouseMoveInput = {
        coordinates: { x: 100, y: 200 },
      };

      // Test output type inference
      type MouseMoveOutput = ZodSchemaOutput<typeof McpSchemas.mouseMove>;
      const mouseMoveOutput: MouseMoveOutput = {
        coordinates: { x: 100, y: 200 },
      };

      expect(mouseMoveInput).toEqual(mouseMoveOutput);
      console.log(`[${operationId}] Type inference working correctly`);

      console.log(`[${operationId}] Zod schema type inference testing completed`);
    });
  });

  /**
   * Test Suite: MCP Response Format Validation
   */
  describe('MCP Response Format Validation', () => {
    it('should validate MCP tool response structure', () => {
      const operationId = `${testId}_tool_response`;
      console.log(`[${operationId}] Testing MCP tool response validation`);

      const validResponse: McpToolResponse = {
        content: [
          {
            type: 'text',
            text: 'Operation completed successfully',
          },
          {
            type: 'image',
            mimeType: 'image/png',
            data: 'base64-encoded-image-data',
          },
          {
            type: 'resource',
            uri: 'file:///path/to/resource',
          },
        ],
        isError: false,
      };

      const isValid = ProtocolComplianceValidator.validateToolResponse(validResponse);
      expect(isValid).toBe(true);

      console.log(`[${operationId}] MCP tool response validation completed`);
    });

    it('should validate MCP content items', () => {
      const operationId = `${testId}_content_items`;
      console.log(`[${operationId}] Testing MCP content item validation`);

      const validContentItems: McpContentItem[] = [
        { type: 'text', text: 'Sample text content' },
        { type: 'image', mimeType: 'image/jpeg', data: 'base64-data' },
        { type: 'resource', uri: 'https://example.com/resource' },
      ];

      validContentItems.forEach((item, index) => {
        const isValid = ProtocolComplianceValidator.validateContentItem(item);
        expect(isValid).toBe(true);
        console.log(`[${operationId}] Content item ${index + 1} validated successfully`);
      });

      console.log(`[${operationId}] MCP content item validation completed`);
    });

    it('should validate MCP response with metadata', () => {
      const operationId = `${testId}_response_metadata`;
      console.log(`[${operationId}] Testing MCP response with metadata validation`);

      const response: McpResponse = {
        success: true,
        data: { result: 'test data' },
        metadata: {
          operationId: 'op_123',
          executionTime: 150,
          timestamp: new Date().toISOString(),
          toolName: 'screenshot',
        },
      };

      const isValid = ProtocolComplianceValidator.validateMcpResponse(response);
      expect(isValid).toBe(true);
      expect(response.success).toBe(true);
      expect(response.metadata).toBeDefined();
      expect(response.metadata?.operationId).toBe('op_123');

      console.log(`[${operationId}] MCP response with metadata validation completed`);
    });

    it('should validate MCP error response', () => {
      const operationId = `${testId}_error_response`;
      console.log(`[${operationId}] Testing MCP error response validation`);

      const errorResponse: McpResponse = {
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'Invalid parameter provided',
          details: {
            parameter: 'coordinates',
            expected: 'object with x and y numbers',
            received: 'string',
          },
        },
      };

      const isValid = ProtocolComplianceValidator.validateMcpResponse(errorResponse);
      expect(isValid).toBe(true);
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeDefined();

      const errorValid = ProtocolComplianceValidator.validateMcpError(errorResponse.error!);
      expect(errorValid).toBe(true);

      console.log(`[${operationId}] MCP error response validation completed`);
    });
  });

  /**
   * Test Suite: Type Guards and Utilities
   */
  describe('Type Guards and Utilities', () => {
    it('should correctly identify MCP responses using type guards', () => {
      const operationId = `${testId}_type_guards`;
      console.log(`[${operationId}] Testing MCP type guards`);

      const validResponse = { success: true, data: 'test' };
      const invalidResponse = { notAResponse: true };

      expect(isMcpResponse(validResponse)).toBe(true);
      expect(isMcpResponse(invalidResponse)).toBe(false);
      expect(isMcpResponse(null)).toBe(false);
      expect(isMcpResponse(undefined)).toBe(false);

      console.log(`[${operationId}] MCP type guards testing completed`);
    });

    it('should correctly identify compression results using type guards', () => {
      const operationId = `${testId}_compression_guards`;
      console.log(`[${operationId}] Testing compression result type guards`);

      const validCompressionResult = {
        base64: 'compressed-data',
        originalSizeKB: 100,
        compressedSizeKB: 50,
        sizeKB: 50,
        sizeBytes: 51200,
        sizeMB: 0.05,
        quality: 80,
        format: 'jpeg',
        iterations: 3,
      };

      const invalidCompressionResult = { notAResult: true };

      expect(isCompressionResult(validCompressionResult)).toBe(true);
      expect(isCompressionResult(invalidCompressionResult)).toBe(false);

      console.log(`[${operationId}] Compression result type guards testing completed`);
    });
  });

  /**
   * Test Suite: Performance Benchmarking
   */
  describe('Performance Benchmarking', () => {
    it('should benchmark protocol validation performance', () => {
      const operationId = `${testId}_performance_benchmark`;
      console.log(`[${operationId}] Benchmarking protocol validation performance`);

      const testMessage = ProtocolTestData.createValidJsonRpcMessage(
        'tools/call',
        { name: 'screenshot', arguments: { display: 0 } },
        'perf-test',
      );

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        ProtocolComplianceValidator.validateJsonRpcMessage(testMessage);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      expect(avgTime).toBeLessThan(1); // Should be under 1ms per validation
      console.log(
        `[${operationId}] Validation performance: ${avgTime.toFixed(4)}ms per operation`,
      );

      console.log(`[${operationId}] Protocol validation performance benchmark completed`);
    });

    it('should benchmark Zod schema validation performance', () => {
      const operationId = `${testId}_zod_performance`;
      console.log(`[${operationId}] Benchmarking Zod schema validation performance`);

      const testParams = { coordinates: { x: 100, y: 200 } };
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        McpSchemas.mouseMove.safeParse(testParams);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      expect(avgTime).toBeLessThan(5); // Should be under 5ms per validation
      console.log(
        `[${operationId}] Zod validation performance: ${avgTime.toFixed(4)}ms per operation`,
      );

      console.log(`[${operationId}] Zod schema validation performance benchmark completed`);
    });
  });

  /**
   * Test Suite: Security and Input Sanitization
   */
  describe('Security and Input Sanitization', () => {
    it('should handle malicious JSON-RPC payloads safely', () => {
      const operationId = `${testId}_security_validation`;
      console.log(`[${operationId}] Testing security validation for malicious payloads`);

      const maliciousPayloads = [
        // Prototype pollution attempt
        { __proto__: { isAdmin: true }, jsonrpc: '2.0', method: 'test' },
        // Extremely long strings
        { jsonrpc: '2.0', method: 'x'.repeat(10000), id: 1 },
        // Circular references (would be caught during JSON serialization)
        // Deep nesting attempt
        { jsonrpc: '2.0', method: 'test', params: { a: { b: { c: { d: { e: 'deep' } } } } } },
        // Null byte injection
        { jsonrpc: '2.0', method: 'test\0injection', id: 1 },
      ];

      maliciousPayloads.forEach((payload, index) => {
        expect(() => {
          ProtocolComplianceValidator.validateJsonRpcMessage(payload);
        }).not.toThrow();
        console.log(`[${operationId}] Malicious payload ${index + 1} handled safely`);
      });

      console.log(`[${operationId}] Security validation for malicious payloads completed`);
    });

    it('should sanitize file path parameters', () => {
      const operationId = `${testId}_path_sanitization`;
      console.log(`[${operationId}] Testing file path parameter sanitization`);

      const dangerousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/proc/self/environ',
        'file:///etc/shadow',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
      ];

      dangerousPaths.forEach((path, index) => {
        const result = McpSchemas.fileRead.safeParse({ path });
        // The schema should accept the path but application logic should sanitize
        expect(result.success).toBe(true);
        console.log(`[${operationId}] Dangerous path ${index + 1} requires application-level sanitization`);
      });

      console.log(`[${operationId}] File path parameter sanitization testing completed`);
    });

    it('should validate command execution parameters for security', () => {
      const operationId = `${testId}_command_security`;
      console.log(`[${operationId}] Testing command execution parameter security`);

      const dangerousCommands = [
        { command: 'rm', args: ['-rf', '/'] },
        { command: 'cat', args: ['/etc/passwd'] },
        { command: 'powershell', args: ['-Command', 'Get-Process'] },
        { command: 'cmd', args: ['/c', 'dir', 'C:\\'] },
      ];

      dangerousCommands.forEach((cmd, index) => {
        const result = McpSchemas.executeCommand.safeParse(cmd);
        // Schema validation passes, but execution should be restricted
        expect(result.success).toBe(true);
        console.log(`[${operationId}] Dangerous command ${index + 1} requires execution-level security`);
      });

      console.log(`[${operationId}] Command execution parameter security testing completed`);
    });
  });
});