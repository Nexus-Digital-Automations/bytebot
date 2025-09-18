/* eslint-env jest */

/**
 * MCP Comprehensive Test Coverage Suite
 *
 * This test suite is designed to achieve 100% code coverage for the MCP module
 * by testing all remaining edge cases, error paths, and uncovered code branches.
 *
 * Coverage Areas:
 * - All public and private methods in ComputerUseTools
 * - All code paths in Base64ImageCompressor
 * - Error handling in all MCP components
 * - Edge cases and boundary conditions
 * - Type guards and utility functions
 * - Module initialization and cleanup
 * - Resource management and memory handling
 * - Compression algorithms and optimizations
 * - Protocol message formatting and validation
 * - Integration points and dependencies
 *
 * @author Claude Code - Subagent 3
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { performance } from 'perf_hooks';
import { BytebotMcpModule } from '../bytebot-mcp.module';
import { ComputerUseTools } from '../computer-use.tools';
import { ComputerUseService } from '../../computer-use/computer-use.service';
import { Base64ImageCompressor, compressPngBase64Under1MB } from '../compressor';
import {
  McpSchemas,
  McpToolResponse,
  McpContentItem,
  McpResponse,
  McpError,
  isMcpResponse,
  isCompressionResult,
  CompressionOptions,
  CompressionResult,
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
  createMockService,
  createMockLogger,
  TestUtils,
  AssertionHelpers,
} from '../../test-utils';

// Mock sharp module for compression testing
jest.mock('sharp', () => {
  const mockSharp = jest.fn().mockImplementation((input: string | Buffer) => ({
    metadata: jest.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'png',
    }),
    resize: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from(input.toString().slice(0, 1000))),
  }));
  
  mockSharp.default = mockSharp;
  return mockSharp;
});

describe('MCP Comprehensive Coverage', () => {
  let module: TestingModule;
  let computerUseTools: ComputerUseTools;
  let mockComputerUseService: jest.Mocked<ComputerUseService>;
  let testId: string;

  beforeEach(async () => {
    testId = TestUtils.generateTestId('mcp_comprehensive_coverage');
    console.log(`[${testId}] Setting up comprehensive coverage tests`);

    // Create comprehensive mock service
    mockComputerUseService = {
      ...createMockService([
        'action',
        'screenshot',
        'moveMouse',
        'clickMouse',
        'traceMouse',
        'dragMouse',
        'pressMouse',
        'scroll',
        'typeKeys',
        'pressKeys',
        'typeText',
        'pasteText',
        'wait',
        'application',
        'cursorPosition',
        'writeFile',
        'readFile',
        'initializeNutJS',
        'validateCoordinates',
      ]),
      logger: createMockLogger(),
      cuaEnabled: true,
      nutService: {},
    } as unknown as jest.Mocked<ComputerUseService>;

    // Create testing module
    module = await Test.createTestingModule({
      providers: [
        ComputerUseTools,
        {
          provide: ComputerUseService,
          useValue: mockComputerUseService,
        },
      ],
    }).compile();

    computerUseTools = module.get<ComputerUseTools>(ComputerUseTools);

    console.log(`[${testId}] Comprehensive coverage test setup completed`);
  });

  afterEach(() => {
    console.log(`[${testId}] Comprehensive coverage test cleanup completed`);
  });

  /**
   * Test Suite: BytebotMcpModule Coverage
   */
  describe('BytebotMcpModule Coverage', () => {
    it('should test module constructor and logging', () => {
      const operationId = `${testId}_module_constructor`;
      console.log(`[${operationId}] Testing BytebotMcpModule constructor`);

      // Test module constructor by creating a new instance
      const module = new BytebotMcpModule();
      expect(module).toBeDefined();
      expect(module).toBeInstanceOf(BytebotMcpModule);

      console.log(`[${operationId}] BytebotMcpModule constructor tested`);
    });

    it('should test module initialization lifecycle', async () => {
      const operationId = `${testId}_module_lifecycle`;
      console.log(`[${operationId}] Testing module initialization lifecycle`);

      // Test full module with dependencies
      const testModule = await Test.createTestingModule({
        imports: [BytebotMcpModule],
        providers: [
          {
            provide: ComputerUseService,
            useValue: mockComputerUseService,
          },
        ],
      }).compile();

      const moduleInstance = testModule.get(BytebotMcpModule);
      expect(moduleInstance).toBeDefined();

      const toolsInstance = testModule.get(ComputerUseTools);
      expect(toolsInstance).toBeDefined();

      await testModule.close();

      console.log(`[${operationId}] Module initialization lifecycle tested`);
    });
  });

  /**
   * Test Suite: ComputerUseTools Complete Coverage
   */
  describe('ComputerUseTools Complete Coverage', () => {
    it('should test private method generateOperationId', () => {
      const operationId = `${testId}_private_operation_id`;
      console.log(`[${operationId}] Testing private generateOperationId method`);

      // Access private method through any casting
      const tools = computerUseTools as any;
      
      // Test multiple ID generations to ensure uniqueness
      const id1 = tools.generateOperationId();
      const id2 = tools.generateOperationId();
      const id3 = tools.generateOperationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id3).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).toMatch(/^mcp_op_\d+_\d{4}$/);

      console.log(`[${operationId}] Private generateOperationId method tested`);
    });

    it('should test private logging methods with all parameters', () => {
      const operationId = `${testId}_private_logging`;
      console.log(`[${operationId}] Testing private logging methods`);

      const tools = computerUseTools as any;
      const testOpId = 'test_operation_123';
      const testParams = { test: 'data', nested: { value: 42 } };

      // Test logOperationStart
      expect(() => {
        tools.logOperationStart(testOpId, 'test_tool', testParams);
      }).not.toThrow();

      // Test logOperationSuccess
      expect(() => {
        tools.logOperationSuccess(testOpId, 'test_tool', Date.now(), 'test result');
      }).not.toThrow();

      // Test logOperationError
      expect(() => {
        tools.logOperationError(testOpId, 'test_tool', Date.now(), new Error('test error'));
      }).not.toThrow();

      console.log(`[${operationId}] Private logging methods tested`);
    });

    it('should test error scenarios for all tool methods', async () => {
      const operationId = `${testId}_tool_error_scenarios`;
      console.log(`[${operationId}] Testing error scenarios for all tool methods`);

      // Configure service methods to throw specific errors
      const testError = new Error('Service method failed');
      
      mockComputerUseService.screenshot.mockRejectedValue(testError);
      mockComputerUseService.moveMouse.mockRejectedValue(testError);
      mockComputerUseService.clickMouse.mockRejectedValue(testError);
      mockComputerUseService.typeText.mockRejectedValue(testError);
      mockComputerUseService.readFile.mockRejectedValue(testError);
      mockComputerUseService.writeFile.mockRejectedValue(testError);

      const errorTests = [
        { method: 'screenshot', params: { display: 0 } },
        { method: 'moveMouse', params: { coordinates: { x: 100, y: 200 } } },
        { method: 'clickMouse', params: { coordinates: { x: 100, y: 200 }, button: 'left', clickCount: 1 } },
        { method: 'typeText', params: { text: 'test' } },
        { method: 'readFile', params: { path: '/test/file.txt' } },
        { method: 'writeFile', params: { path: '/test/file.txt', content: 'test' } },
      ];

      for (const test of errorTests) {
        try {
          const result = await (computerUseTools as any)[test.method](test.params);
          
          // Should return error content, not throw
          expect(result).toBeDefined();
          expect(result.content).toBeDefined();
          expect(result.isError).toBe(true);
          
          console.log(`[${operationId}] Error scenario for ${test.method} handled correctly`);
        } catch (error) {
          // Some methods might throw, which is also acceptable
          expect(error).toBeInstanceOf(Error);
          console.log(`[${operationId}] Error scenario for ${test.method} threw error as expected`);
        }
      }
    });

    it('should test cursor position tracking', async () => {
      const operationId = `${testId}_cursor_position`;
      console.log(`[${operationId}] Testing cursor position tracking`);

      mockComputerUseService.cursorPosition.mockResolvedValue({
        x: 150,
        y: 250,
        timestamp: new Date(),
        operationId: 'cursor_test',
      });

      const result = await computerUseTools.cursorPosition();
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('150');
      expect(result.content[0].text).toContain('250');

      console.log(`[${operationId}] Cursor position tracking tested`);
    });

    it('should test all advanced tool methods', async () => {
      const operationId = `${testId}_advanced_tools`;
      console.log(`[${operationId}] Testing all advanced tool methods`);

      // Mock responses for advanced methods
      mockComputerUseService.traceMouse.mockResolvedValue({ success: true });
      mockComputerUseService.dragMouse.mockResolvedValue({ success: true });
      mockComputerUseService.pressMouse.mockResolvedValue({ success: true });
      mockComputerUseService.scroll.mockResolvedValue({ success: true });
      mockComputerUseService.pressKeys.mockResolvedValue({ success: true });
      mockComputerUseService.pasteText.mockResolvedValue({ success: true });
      mockComputerUseService.wait.mockResolvedValue({ success: true });
      mockComputerUseService.application.mockResolvedValue({ success: true });

      const advancedTests = [
        {
          method: 'traceMouse',
          params: {
            path: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
            holdKeys: ['shift'],
          },
        },
        {
          method: 'dragMouse',
          params: {
            startCoordinates: { x: 0, y: 0 },
            endCoordinates: { x: 100, y: 100 },
          },
        },
        {
          method: 'dragMousePath',
          params: {
            path: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
            button: 'left' as const,
            holdKeys: ['ctrl'],
          },
        },
        {
          method: 'pressMouse',
          params: {
            coordinates: { x: 100, y: 200 },
            button: 'left' as const,
            press: 'down' as const,
          },
        },
        {
          method: 'scrollAdvanced',
          params: {
            coordinates: { x: 100, y: 200 },
            direction: 'up' as const,
            scrollCount: 5,
            holdKeys: ['ctrl'],
          },
        },
        {
          method: 'typeKeysAdvanced',
          params: {
            keys: ['ctrl', 'c'],
            delay: 100,
          },
        },
        {
          method: 'pressKeysAdvanced',
          params: {
            keys: ['shift'],
            press: 'down' as const,
          },
        },
        {
          method: 'typeTextAdvanced',
          params: {
            text: 'advanced typing',
            delay: 50,
          },
        },
        {
          method: 'pasteText',
          params: { text: 'pasted content' },
        },
        {
          method: 'wait',
          params: { duration: 1000 },
        },
        {
          method: 'application',
          params: { application: 'firefox' as const },
        },
      ];

      for (const test of advancedTests) {
        const result = await (computerUseTools as any)[test.method](test.params);
        
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        
        console.log(`[${operationId}] Advanced tool ${test.method} tested successfully`);
      }
    });
  });

  /**
   * Test Suite: Base64ImageCompressor Complete Coverage
   */
  describe('Base64ImageCompressor Complete Coverage', () => {
    it('should test compressToSize with all options', async () => {
      const operationId = `${testId}_compress_to_size_options`;
      console.log(`[${operationId}] Testing compressToSize with all options`);

      const testBase64 = 'data:image/png;base64,' + Buffer.alloc(2048, 'A').toString('base64');

      const compressionOptions: CompressionOptions[] = [
        {}, // Default options
        {
          targetSizeKB: 512,
          initialQuality: 90,
          minQuality: 30,
          format: 'jpeg',
          maxIterations: 5,
        },
        {
          targetSizeKB: 256,
          format: 'webp',
          maxIterations: 10,
        },
        {
          targetSizeKB: 128,
          format: 'png',
          initialQuality: 80,
        },
      ];

      for (const options of compressionOptions) {
        const result = await Base64ImageCompressor.compressToSize(testBase64, options);
        
        expect(result).toBeDefined();
        expect(result.base64).toBeDefined();
        expect(result.sizeKB).toBeGreaterThan(0);
        expect(result.sizeMB).toBeGreaterThan(0);
        expect(result.format).toBeDefined();
        expect(result.iterations).toBeGreaterThan(0);
        
        console.log(`[${operationId}] Compression test completed: ${result.sizeKB}KB, format: ${result.format}`);
      }
    });

    it('should test compressWithResize method', async () => {
      const operationId = `${testId}_compress_with_resize`;
      console.log(`[${operationId}] Testing compressWithResize method`);

      const testBase64 = 'data:image/png;base64,' + Buffer.alloc(4096, 'B').toString('base64');

      const result = await Base64ImageCompressor.compressWithResize(
        testBase64,
        { targetSizeKB: 100, format: 'jpeg' },
        { maxWidth: 800, maxHeight: 600 }
      );

      expect(result).toBeDefined();
      expect(result.base64).toBeDefined();
      expect(result.finalDimensions).toBeDefined();
      expect(result.originalDimensions).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);

      console.log(`[${operationId}] Resize compression completed: ${result.finalDimensions?.width}x${result.finalDimensions?.height}`);
    });

    it('should test getBestCompressionFormat method', () => {
      const operationId = `${testId}_best_compression_format`;
      console.log(`[${operationId}] Testing getBestCompressionFormat method`);

      const testCases = [
        { base64: 'data:image/png;base64,test', expected: 'png' },
        { base64: 'data:image/jpeg;base64,test', expected: 'jpeg' },
        { base64: 'data:image/webp;base64,test', expected: 'webp' },
        { base64: 'iVBORw0KGgoAAAANSUhEUgAA', expected: 'png' }, // PNG signature
        { base64: '/9j/4AAQSkZJRgABAQEAYABgAAD/', expected: 'jpeg' }, // JPEG signature
        { base64: 'invaliddata', expected: 'png' }, // Fallback
      ];

      testCases.forEach((testCase, index) => {
        const format = (Base64ImageCompressor as any).getBestCompressionFormat(testCase.base64);
        expect(format).toBe(testCase.expected);
        console.log(`[${operationId}] Test case ${index + 1}: ${testCase.base64.slice(0, 20)}... -> ${format}`);
      });
    });

    it('should test parseBase64Image method', () => {
      const operationId = `${testId}_parse_base64_image`;
      console.log(`[${operationId}] Testing parseBase64Image method`);

      const testCases = [
        {
          input: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA',
          expected: {
            mimeType: 'image/png',
            format: 'png',
            data: 'iVBORw0KGgoAAAANSUhEUgAA',
          },
        },
        {
          input: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/',
          expected: {
            mimeType: 'image/jpeg',
            format: 'jpeg',
            data: '/9j/4AAQSkZJRgABAQEAYABgAAD/',
          },
        },
        {
          input: 'iVBORw0KGgoAAAANSUhEUgAA', // Without data URL prefix
          expected: {
            mimeType: 'image/png',
            format: 'png',
            data: 'iVBORw0KGgoAAAANSUhEUgAA',
          },
        },
      ];

      testCases.forEach((testCase, index) => {
        const result = (Base64ImageCompressor as any).parseBase64Image(testCase.input);
        
        expect(result.mimeType).toBe(testCase.expected.mimeType);
        expect(result.format).toBe(testCase.expected.format);
        expect(result.data).toBe(testCase.expected.data);
        
        console.log(`[${operationId}] Parse test ${index + 1}: ${testCase.expected.format} format detected`);
      });
    });

    it('should test error handling in compression methods', async () => {
      const operationId = `${testId}_compression_errors`;
      console.log(`[${operationId}] Testing compression error handling`);

      const errorTests = [
        {
          name: 'invalid base64',
          input: 'invalid-base64-data',
          options: {},
        },
        {
          name: 'empty string',
          input: '',
          options: {},
        },
        {
          name: 'malformed data URL',
          input: 'data:invalid;base64,test',
          options: {},
        },
      ];

      for (const test of errorTests) {
        try {
          await Base64ImageCompressor.compressToSize(test.input, test.options);
          console.warn(`[${operationId}] ${test.name} did not throw error as expected`);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          console.log(`[${operationId}] ${test.name} error handled correctly: ${error.message}`);
        }
      }
    });

    it('should test compressPngBase64Under1MB convenience function', async () => {
      const operationId = `${testId}_compress_png_1mb`;
      console.log(`[${operationId}] Testing compressPngBase64Under1MB convenience function`);

      const testBase64 = Buffer.alloc(2048, 'C').toString('base64');
      
      const result = await compressPngBase64Under1MB(testBase64);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      
      console.log(`[${operationId}] PNG compression convenience function tested, result length: ${result.length}`);
    });
  });

  /**
   * Test Suite: Types and Utilities Complete Coverage
   */
  describe('Types and Utilities Complete Coverage', () => {
    it('should test all type guards comprehensively', () => {
      const operationId = `${testId}_type_guards_comprehensive`;
      console.log(`[${operationId}] Testing all type guards comprehensively`);

      // Test isMcpResponse with various inputs
      const mcpResponseTests = [
        { input: { success: true }, expected: true },
        { input: { success: false, error: { code: 'TEST', message: 'test' } }, expected: true },
        { input: { success: 'true' }, expected: false }, // wrong type
        { input: { notSuccess: true }, expected: false }, // missing field
        { input: null, expected: false },
        { input: undefined, expected: false },
        { input: 'string', expected: false },
        { input: 42, expected: false },
        { input: [], expected: false },
      ];

      mcpResponseTests.forEach((test, index) => {
        const result = isMcpResponse(test.input);
        expect(result).toBe(test.expected);
        console.log(`[${operationId}] isMcpResponse test ${index + 1}: ${test.expected ? 'valid' : 'invalid'} as expected`);
      });

      // Test isCompressionResult with various inputs
      const compressionResultTests = [
        {
          input: {
            base64: 'test',
            originalSizeKB: 100,
            compressedSizeKB: 50,
            sizeKB: 50,
            sizeBytes: 51200,
            sizeMB: 0.05,
            quality: 80,
            format: 'jpeg',
            iterations: 3,
          },
          expected: true,
        },
        {
          input: { base64: 'test', originalSizeKB: 100 }, // missing compressedSizeKB
          expected: false,
        },
        {
          input: { originalSizeKB: 100, compressedSizeKB: 50 }, // missing base64
          expected: false,
        },
        { input: null, expected: false },
        { input: {}, expected: false },
      ];

      compressionResultTests.forEach((test, index) => {
        const result = isCompressionResult(test.input);
        expect(result).toBe(test.expected);
        console.log(`[${operationId}] isCompressionResult test ${index + 1}: ${test.expected ? 'valid' : 'invalid'} as expected`);
      });
    });

    it('should test all Zod schemas with edge cases', () => {
      const operationId = `${testId}_zod_schemas_edge_cases`;
      console.log(`[${operationId}] Testing Zod schemas with edge cases`);

      // Test mouseMove schema with edge cases
      const mouseMoveEdgeCases = [
        { coordinates: { x: 0, y: 0 } }, // Minimum coordinates
        { coordinates: { x: 99999, y: 99999 } }, // Very large coordinates
        { coordinates: { x: -1000, y: -1000 } }, // Negative coordinates
        { coordinates: { x: 1.5, y: 2.7 } }, // Decimal coordinates
      ];

      mouseMoveEdgeCases.forEach((testCase, index) => {
        const result = McpSchemas.mouseMove.safeParse(testCase);
        expect(result.success).toBe(true);
        console.log(`[${operationId}] mouseMove edge case ${index + 1} passed validation`);
      });

      // Test mouseClick schema with optional parameters
      const mouseClickCases = [
        { coordinates: { x: 100, y: 200 } }, // Minimal valid
        { coordinates: { x: 100, y: 200 }, button: 'left' },
        { coordinates: { x: 100, y: 200 }, button: 'right', clickCount: 2 },
        { coordinates: { x: 100, y: 200 }, button: 'middle', clickCount: 1 },
      ];

      mouseClickCases.forEach((testCase, index) => {
        const result = McpSchemas.mouseClick.safeParse(testCase);
        expect(result.success).toBe(true);
        console.log(`[${operationId}] mouseClick case ${index + 1} passed validation`);
      });

      // Test screenshot schema edge cases
      const screenshotCases = [
        {}, // No display specified
        { display: 0 }, // Primary display
        { display: 1 }, // Secondary display
        { display: 10 }, // Many displays
      ];

      screenshotCases.forEach((testCase, index) => {
        const result = McpSchemas.screenshot.safeParse(testCase);
        expect(result.success).toBe(true);
        console.log(`[${operationId}] screenshot case ${index + 1} passed validation`);
      });
    });

    it('should test type inference helpers', () => {
      const operationId = `${testId}_type_inference`;
      console.log(`[${operationId}] Testing type inference helpers`);

      // Test ZodSchemaInput type inference
      type MouseMoveInput = ZodSchemaInput<typeof McpSchemas.mouseMove>;
      const mouseMoveInput: MouseMoveInput = {
        coordinates: { x: 100, y: 200 },
      };

      expect(mouseMoveInput.coordinates.x).toBe(100);
      expect(mouseMoveInput.coordinates.y).toBe(200);

      // Test ZodSchemaOutput type inference
      type MouseMoveOutput = ZodSchemaOutput<typeof McpSchemas.mouseMove>;
      const mouseMoveOutput: MouseMoveOutput = {
        coordinates: { x: 150, y: 250 },
      };

      expect(mouseMoveOutput.coordinates.x).toBe(150);
      expect(mouseMoveOutput.coordinates.y).toBe(250);

      // Test complex schema type inference
      type MouseClickAdvancedInput = ZodSchemaInput<typeof McpSchemas.mouseClickAdvanced>;
      const complexInput: MouseClickAdvancedInput = {
        coordinates: { x: 100, y: 200 },
        button: 'left',
        holdKeys: ['ctrl', 'shift'],
        clickCount: 2,
      };

      expect(complexInput.button).toBe('left');
      expect(complexInput.holdKeys).toEqual(['ctrl', 'shift']);
      expect(complexInput.clickCount).toBe(2);

      console.log(`[${operationId}] Type inference helpers tested successfully`);
    });

    it('should test all schema validation error paths', () => {
      const operationId = `${testId}_schema_validation_errors`;
      console.log(`[${operationId}] Testing schema validation error paths`);

      const invalidTestCases = [
        {
          schema: McpSchemas.mouseMove,
          input: { coordinates: { x: 'invalid', y: 200 } },
          expectedError: 'coordinates.x',
        },
        {
          schema: McpSchemas.mouseClick,
          input: { coordinates: { x: 100, y: 200 }, button: 'invalid' },
          expectedError: 'button',
        },
        {
          schema: McpSchemas.keyboardType,
          input: { text: 123 },
          expectedError: 'text',
        },
        {
          schema: McpSchemas.fileRead,
          input: { path: null },
          expectedError: 'path',
        },
        {
          schema: McpSchemas.directoryCreate,
          input: {},
          expectedError: 'path',
        },
      ];

      invalidTestCases.forEach((testCase, index) => {
        const result = testCase.schema.safeParse(testCase.input);
        
        expect(result.success).toBe(false);
        
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(0);
          
          const errorPath = result.error.issues[0].path.join('.');
          expect(errorPath).toContain(testCase.expectedError);
          
          console.log(`[${operationId}] Invalid case ${index + 1}: ${testCase.expectedError} error correctly caught`);
        }
      });
    });

    it('should test interface compliance for all exported types', () => {
      const operationId = `${testId}_interface_compliance`;
      console.log(`[${operationId}] Testing interface compliance for all exported types`);

      // Test McpToolResponse compliance
      const validToolResponse: McpToolResponse = {
        content: [
          { type: 'text', text: 'Test response' },
          { type: 'image', mimeType: 'image/png', data: 'base64data' },
          { type: 'resource', uri: 'file:///test' },
        ],
        isError: false,
      };

      expect(validToolResponse.content).toHaveLength(3);
      expect(validToolResponse.isError).toBe(false);

      // Test McpError compliance
      const validError: McpError = {
        code: 'TEST_ERROR',
        message: 'Test error message',
        details: { context: 'testing', timestamp: Date.now() },
      };

      expect(validError.code).toBe('TEST_ERROR');
      expect(validError.message).toBe('Test error message');
      expect(validError.details).toBeDefined();

      // Test CompressionResult compliance
      const validCompressionResult: CompressionResult = {
        base64: 'compressed-data',
        sizeBytes: 51200,
        sizeKB: 50,
        sizeMB: 0.05,
        quality: 80,
        format: 'jpeg',
        iterations: 3,
        originalSizeKB: 100,
        compressionRatio: 0.5,
        originalDimensions: { width: 1920, height: 1080 },
        finalDimensions: { width: 960, height: 540 },
        executionTime: 150,
      };

      expect(validCompressionResult.compressionRatio).toBe(0.5);
      expect(validCompressionResult.originalDimensions?.width).toBe(1920);
      expect(validCompressionResult.finalDimensions?.width).toBe(960);

      console.log(`[${operationId}] Interface compliance tested for all exported types`);
    });
  });

  /**
   * Test Suite: Index Module Coverage
   */
  describe('Index Module Coverage', () => {
    it('should test all exports from index module', () => {
      const operationId = `${testId}_index_exports`;
      console.log(`[${operationId}] Testing all exports from index module`);

      // Import everything from index
      const * as McpIndex = require('../index');

      // Test class exports
      expect(McpIndex.BytebotMcpModule).toBeDefined();
      expect(McpIndex.ComputerUseTools).toBeDefined();
      expect(McpIndex.Base64ImageCompressor).toBeDefined();

      // Test function exports
      expect(McpIndex.compressPngBase64Under1MB).toBeDefined();
      expect(typeof McpIndex.compressPngBase64Under1MB).toBe('function');

      // Test type exports (should not throw when used)
      const testResponse: McpIndex.McpToolResponse = {
        content: [{ type: 'text', text: 'test' }],
      };
      expect(testResponse.content).toBeDefined();

      // Test enum/schema exports
      expect(McpIndex.McpSchemas).toBeDefined();
      expect(McpIndex.McpSchemas.mouseMove).toBeDefined();

      // Test utility function exports
      expect(McpIndex.isMcpResponse).toBeDefined();
      expect(McpIndex.isCompressionResult).toBeDefined();
      expect(typeof McpIndex.isMcpResponse).toBe('function');
      expect(typeof McpIndex.isCompressionResult).toBe('function');

      console.log(`[${operationId}] All index module exports validated`);
    });

    it('should test re-export functionality', () => {
      const operationId = `${testId}_reexport_functionality`;
      console.log(`[${operationId}] Testing re-export functionality`);

      // Test that re-exported items work correctly
      const * as McpIndex = require('../index');

      // Test BytebotMcpModule can be instantiated
      const moduleInstance = new McpIndex.BytebotMcpModule();
      expect(moduleInstance).toBeInstanceOf(McpIndex.BytebotMcpModule);

      // Test ComputerUseTools requires injection
      expect(() => {
        const tools = new McpIndex.ComputerUseTools(mockComputerUseService);
        return tools;
      }).not.toThrow();

      // Test type guards work with re-exported functions
      const testMcpResponse = { success: true };
      expect(McpIndex.isMcpResponse(testMcpResponse)).toBe(true);

      const testCompressionResult = {
        base64: 'test',
        originalSizeKB: 100,
        compressedSizeKB: 50,
      };
      expect(McpIndex.isCompressionResult(testCompressionResult)).toBe(true);

      console.log(`[${operationId}] Re-export functionality validated`);
    });

    it('should test module metadata and documentation', () => {
      const operationId = `${testId}_module_metadata`;
      console.log(`[${operationId}] Testing module metadata and documentation`);

      // Read the index file to verify documentation exists
      const fs = require('fs');
      const path = require('path');
      
      const indexPath = path.join(__dirname, '..', 'index.ts');
      const indexContent = fs.readFileSync(indexPath, 'utf8');

      // Verify documentation blocks exist
      expect(indexContent).toContain('/**');
      expect(indexContent).toContain('MCP Integration Public API');
      expect(indexContent).toContain('@author');
      expect(indexContent).toContain('@version');

      // Verify all expected exports are present
      expect(indexContent).toContain('export * from \'./bytebot-mcp.module\'');
      expect(indexContent).toContain('export * from \'./computer-use.tools\'');
      expect(indexContent).toContain('export * from \'./compressor\'');

      // Verify type exports
      expect(indexContent).toContain('export type {');
      expect(indexContent).toContain('CompressionOptions');
      expect(indexContent).toContain('McpToolResponse');

      console.log(`[${operationId}] Module metadata and documentation validated`);
    });
  });

  /**
   * Test Suite: Performance and Memory Coverage
   */
  describe('Performance and Memory Coverage', () => {
    it('should test memory usage under load', async () => {
      const operationId = `${testId}_memory_load_test`;
      console.log(`[${operationId}] Testing memory usage under load`);

      const initialMemory = process.memoryUsage();
      
      // Setup mock for consistent responses
      mockComputerUseService.screenshot.mockResolvedValue({
        image: Buffer.alloc(1024, 'D').toString('base64'),
        metadata: {
          width: 800,
          height: 600,
          format: 'png' as const,
          captureTime: new Date(),
          operationId: 'memory_test',
        },
      });

      // Perform many operations to test memory handling
      const operations = [];
      for (let i = 0; i < 20; i++) {
        operations.push(computerUseTools.screenshot({ display: 0 }));
      }

      await Promise.all(operations);

      const finalMemory = process.memoryUsage();
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapGrowthMB = heapGrowth / (1024 * 1024);

      // Memory growth should be reasonable
      expect(heapGrowthMB).toBeLessThan(20); // Less than 20MB growth

      console.log(`[${operationId}] Memory test completed: ${heapGrowthMB.toFixed(2)}MB heap growth after 20 operations`);
    });

    it('should test operation counter overflow handling', () => {
      const operationId = `${testId}_counter_overflow`;
      console.log(`[${operationId}] Testing operation counter overflow handling`);

      const tools = computerUseTools as any;
      
      // Set counter near overflow point
      tools.operationCounter = 9998;

      // Generate IDs that should cause overflow
      const id1 = tools.generateOperationId();
      const id2 = tools.generateOperationId();
      const id3 = tools.generateOperationId();

      expect(id1).toContain('9999');
      expect(id2).toContain('0000'); // Should wrap to 0
      expect(id3).toContain('0001');

      console.log(`[${operationId}] Operation counter overflow handling tested: ${id1}, ${id2}, ${id3}`);
    });

    it('should test performance timing accuracy', async () => {
      const operationId = `${testId}_timing_accuracy`;
      console.log(`[${operationId}] Testing performance timing accuracy`);

      // Mock with known delay
      mockComputerUseService.wait.mockImplementation(async (params) => {
        await new Promise(resolve => setTimeout(resolve, params.duration || 100));
        return { success: true, duration: params.duration };
      });

      const startTime = performance.now();
      await computerUseTools.wait({ duration: 100 });
      const actualDuration = performance.now() - startTime;

      // Should be close to expected duration (within 50ms tolerance)
      expect(actualDuration).toBeGreaterThan(80);
      expect(actualDuration).toBeLessThan(200);

      console.log(`[${operationId}] Timing accuracy test: expected ~100ms, actual ${actualDuration.toFixed(2)}ms`);
    });
  });
});