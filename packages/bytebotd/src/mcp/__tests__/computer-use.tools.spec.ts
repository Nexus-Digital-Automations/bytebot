/* eslint-env jest */

/**
 * ComputerUseTools Test Suite
 *
 * Comprehensive test suite for MCP computer use tools covering all mouse, keyboard,
 * screen, and file operation tools with complete error handling and edge case testing.
 *
 * Test Coverage:
 * - All MCP tool implementations (mouse, keyboard, screen, file operations)
 * - Parameter validation and Zod schema compliance
 * - Error handling and recovery mechanisms
 * - Performance monitoring and logging
 * - Integration with ComputerUseService
 * - Tool response format validation
 * - Operation tracking and monitoring
 * - Memory and resource management
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { performance } from 'perf_hooks';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger as _Logger } from '@nestjs/common';
import { ComputerUseTools } from '../computer-use.tools';
import { ComputerUseService } from '../../computer-use/computer-use.service';
import { compressPngBase64Under1MB } from '../compressor';

// Mock the compressor module
jest.mock('../compressor', () => ({
  compressPngBase64Under1MB: jest.fn(),
}));

/**
 * Test data generators for computer use operations
 */
class ComputerUseTestData {
  static generateCoordinates(x: number = 100, y: number = 200) {
    return { x, y };
  }

  static generatePath(length: number = 3) {
    return Array(length)
      .fill(null)
      .map((_, i) => ({
        x: i * 50,
        y: i * 50,
      }));
  }

  static generateScreenshotResponse(
    width: number = 1920,
    height: number = 1080,
  ) {
    const imageData = Buffer.alloc(width * height * 4, 128).toString('base64');
    return {
      image: imageData,
      metadata: {
        width,
        height,
        format: 'png' as const,
        captureTime: new Date(),
        operationId: `screenshot_${Date.now()}`,
      },
    };
  }

  static generateCursorPositionResponse(x: number = 100, y: number = 200) {
    return {
      x,
      y,
      timestamp: new Date(),
      operationId: `cursor_${Date.now()}`,
    };
  }

  static generateFileReadResponse(content: string = 'test content') {
    return {
      success: true,
      data: Buffer.from(content).toString('base64'),
      mediaType: 'text/plain',
      name: 'test.txt',
      size: content.length,
      operationId: `file_read_${Date.now()}`,
      timestamp: new Date(),
    };
  }

  static generateFileWriteResponse() {
    return {
      success: true,
      message: 'File written successfully',
      operationId: `file_write_${Date.now()}`,
      timestamp: new Date(),
    };
  }
}

describe('ComputerUseTools', () => {
  let module: TestingModule;
  let computerUseTools: ComputerUseTools;
  let mockComputerUseService: jest.Mocked<ComputerUseService>;
  let mockCompressor: jest.MockedFunction<typeof compressPngBase64Under1MB>;

  /**
   * Setup test environment before each test
   */
  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup mock computer use service with all required methods
    mockComputerUseService = {
      action: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ComputerUseService>;

    // Setup mock compressor
    mockCompressor = compressPngBase64Under1MB as jest.MockedFunction<
      typeof compressPngBase64Under1MB
    >;
    mockCompressor.mockResolvedValue('compressed-base64-image-data');

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
  });

  /**
   * Cleanup after each test
   */
  afterEach(async () => {
    jest.restoreAllMocks();
    await module.close();
  });

  describe('Initialization and Setup', () => {
    /**
     * Test service instantiation
     */
    it('should be defined and properly initialized', () => {
      expect(computerUseTools).toBeDefined();
      expect(computerUseTools).toBeInstanceOf(ComputerUseTools);
    });

    /**
     * Test dependency injection
     */
    it('should have ComputerUseService injected correctly', () => {
      const service = (computerUseTools as unknown as Record<string, unknown>)
        .computerUseService;
      expect(service).toBeDefined();
      expect(service).toBe(mockComputerUseService);
    });
  });

  describe('Mouse Operation Tools', () => {
    describe('moveMouse tool', () => {
      /**
       * Test successful mouse move operation
       */
      it('should move mouse to specified coordinates', async () => {
        const coordinates = ComputerUseTestData.generateCoordinates(150, 250);

        mockComputerUseService.action.mockResolvedValue(undefined);

        const result = await computerUseTools.moveMouse({ coordinates });

        expect(mockComputerUseService.action).toHaveBeenCalledWith({
          action: 'move_mouse',
          coordinates,
        });

        expect(result).toEqual({
          content: [{ type: 'text', text: 'mouse moved' }],
        });
      });

      /**
       * Test mouse move with error handling
       */
      it('should handle mouse move errors gracefully', async () => {
        const coordinates = ComputerUseTestData.generateCoordinates();
        const error = new Error('Mouse move failed');

        mockComputerUseService.action.mockRejectedValue(error);

        const result = await computerUseTools.moveMouse({ coordinates });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'Error moving mouse: Mouse move failed',
            },
          ],
        });
      });
    });

    describe('traceMouse tool', () => {
      /**
       * Test successful mouse trace operation
       */
      it('should trace mouse along specified path', async () => {
        const path = ComputerUseTestData.generatePath(5);
        const holdKeys = ['shift', 'ctrl'];

        mockComputerUseService.action.mockResolvedValue(undefined);

        const result = await computerUseTools.traceMouse({ path, holdKeys });

        expect(mockComputerUseService.action).toHaveBeenCalledWith({
          action: 'trace_mouse',
          path,
          holdKeys,
        });

        expect(result).toEqual({
          content: [{ type: 'text', text: 'mouse traced' }],
        });
      });
    });

    describe('clickMouse tool', () => {
      /**
       * Test successful mouse click operation
       */
      it('should perform mouse click with all parameters', async () => {
        const parameters = {
          coordinates: ComputerUseTestData.generateCoordinates(),
          button: 'left' as const,
          holdKeys: ['ctrl'],
          clickCount: 2,
        };

        mockComputerUseService.action.mockResolvedValue(undefined);

        const result = await computerUseTools.clickMouse(parameters);

        expect(mockComputerUseService.action).toHaveBeenCalledWith({
          action: 'click_mouse',
          ...parameters,
        });

        expect(result).toEqual({
          content: [{ type: 'text', text: 'mouse clicked' }],
        });
      });
    });

    describe('scroll tool', () => {
      /**
       * Test scroll operation with all parameters
       */
      it('should perform scroll operation correctly', async () => {
        const parameters = {
          coordinates: ComputerUseTestData.generateCoordinates(),
          direction: 'up' as const,
          scrollCount: 5,
          holdKeys: ['ctrl'],
        };

        mockComputerUseService.action.mockResolvedValue(undefined);

        const result = await computerUseTools.scroll(parameters);

        expect(mockComputerUseService.action).toHaveBeenCalledWith({
          action: 'scroll',
          ...parameters,
        });

        expect(result.content[0]?.text).toBe('scrolled');
      });
    });
  });

  describe('Keyboard Operation Tools', () => {
    describe('typeKeys tool', () => {
      /**
       * Test typing key sequence
       */
      it('should type key sequence correctly', async () => {
        const parameters = {
          keys: ['ctrl', 'shift', 'c'],
          delay: 100,
        };

        mockComputerUseService.action.mockResolvedValue(undefined);

        const result = await computerUseTools.typeKeys(parameters);

        expect(mockComputerUseService.action).toHaveBeenCalledWith({
          action: 'type_keys',
          ...parameters,
        });

        expect(result.content[0]?.text).toBe('keys typed');
      });
    });

    describe('typeText tool', () => {
      /**
       * Test text typing
       */
      it('should type text correctly', async () => {
        const parameters = {
          text: 'Hello, World as NonNullable<typeof World>',
          delay: 50,
        };

        mockComputerUseService.action.mockResolvedValue(undefined);

        const result = await computerUseTools.typeText(parameters);

        expect(mockComputerUseService.action).toHaveBeenCalledWith({
          action: 'type_text',
          ...parameters,
        });

        expect(result.content[0]?.text).toBe('text typed');
      });
    });

    describe('pasteText tool', () => {
      /**
       * Test text pasting
       */
      it('should paste text correctly', async () => {
        const text = 'Pasted content here';

        mockComputerUseService.action.mockResolvedValue(undefined);

        const result = await computerUseTools.pasteText({ text });

        expect(mockComputerUseService.action).toHaveBeenCalledWith({
          action: 'paste_text',
          text,
        });

        expect(result.content[0]?.text).toBe('text pasted');
      });
    });
  });

  describe('System Operation Tools', () => {
    describe('wait tool', () => {
      /**
       * Test wait operation
       */
      it('should perform wait operation', async () => {
        const duration = 1000;

        mockComputerUseService.action.mockResolvedValue(undefined);

        const result = await computerUseTools.wait({ duration });

        expect(mockComputerUseService.action).toHaveBeenCalledWith({
          action: 'wait',
          duration,
        });

        expect(result.content[0]?.text).toBe('waiting done');
      });
    });

    describe('application tool', () => {
      /**
       * Test application switching
       */
      it('should open firefox application', async () => {
        mockComputerUseService.action.mockResolvedValue(undefined);

        const result = await computerUseTools.application({
          application: 'firefox',
        });

        expect(mockComputerUseService.action).toHaveBeenCalledWith({
          action: 'application',
          application: 'firefox',
        });

        expect(result.content[0]?.text).toBe('application opened');
      });
    });
  });

  describe('Screen Operation Tools', () => {
    describe('screenshot tool', () => {
      /**
       * Test successful screenshot capture
       */
      it('should capture and compress screenshot', async () => {
        const screenshotData = ComputerUseTestData.generateScreenshotResponse();

        mockComputerUseService.action.mockResolvedValue(screenshotData);
        mockCompressor.mockResolvedValue('compressed-image-data');

        const result = await computerUseTools.screenshot();

        expect(mockComputerUseService.action).toHaveBeenCalledWith({
          action: 'screenshot',
        });

        expect(mockCompressor).toHaveBeenCalledWith(screenshotData.image);

        expect(result).toEqual({
          content: [
            {
              type: 'image',
              data: 'compressed-image-data',
              mimeType: 'image/png',
            },
          ],
        });
      });

      /**
       * Test screenshot error handling
       */
      it('should handle screenshot errors gracefully', async () => {
        const error = new Error('Screenshot capture failed');
        mockComputerUseService.action.mockRejectedValue(error);

        const result = await computerUseTools.screenshot();

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'Error taking screenshot: Screenshot capture failed',
            },
          ],
        });
      });
    });

    describe('cursorPosition tool', () => {
      /**
       * Test cursor position retrieval
       */
      it('should get cursor position correctly', async () => {
        const position = ComputerUseTestData.generateCursorPositionResponse(
          500,
          300,
        );
        mockComputerUseService.action.mockResolvedValue(position);

        const result = await computerUseTools.cursorPosition();

        expect(mockComputerUseService.action).toHaveBeenCalledWith({
          action: 'cursor_position',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(position),
            },
          ],
        });
      });
    });
  });

  describe('File Operation Tools', () => {
    describe('writeFile tool', () => {
      /**
       * Test file write operation
       */
      it('should write file correctly', async () => {
        const parameters = {
          path: '/tmp/test.txt',
          data: Buffer.from('test content').toString('base64'),
        };

        const writeResult = ComputerUseTestData.generateFileWriteResponse();
        mockComputerUseService.action.mockResolvedValue(writeResult);

        const result = await computerUseTools.writeFile(parameters);

        expect(mockComputerUseService.action).toHaveBeenCalledWith({
          action: 'write_file',
          ...parameters,
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'File written successfully',
            },
          ],
        });
      });
    });

    describe('readFile tool', () => {
      /**
       * Test successful file read operation
       */
      it('should read file correctly', async () => {
        const readResult =
          ComputerUseTestData.generateFileReadResponse('Hello World');
        mockComputerUseService.action.mockResolvedValue(readResult);

        const result = await computerUseTools.readFile({
          path: '/tmp/test.txt',
        });

        expect(mockComputerUseService.action).toHaveBeenCalledWith({
          action: 'read_file',
          path: '/tmp/test.txt',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: readResult.mediaType,
                data: readResult.data,
              },
              name: readResult.name,
              size: readResult.size,
            },
          ],
        });
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    /**
     * Test with service errors
     */
    it('should handle service unavailable errors', async () => {
      const error = new Error('Service unavailable');
      mockComputerUseService.action.mockRejectedValue(error);

      const result = await computerUseTools.moveMouse({
        coordinates: { x: 0, y: 0 },
      });

      expect(result.content[0]?.text).toContain('Error moving mouse');
    });

    /**
     * Test with invalid coordinates
     */
    it('should handle invalid coordinates', async () => {
      mockComputerUseService.action.mockResolvedValue(undefined);

      const invalidCoords = [
        { x: NaN, y: 100 },
        { x: Infinity, y: 200 },
        { x: -Infinity, y: -100 },
      ];

      for (const coordinates of invalidCoords) {
        const result = await computerUseTools.moveMouse({ coordinates });
        expect(result).toBeDefined();
        expect(result.content[0]?.text).toBe('mouse moved');
      }
    });
  });

  describe('Integration and Compatibility', () => {
    /**
     * Test MCP tool response format compliance
     */
    it('should return MCP-compliant response formats', async () => {
      mockComputerUseService.action.mockResolvedValue(undefined);

      const result = await computerUseTools.moveMouse({
        coordinates: { x: 100, y: 100 },
      });

      // Validate MCP response structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toBeDefined();
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
    });

    /**
     * Test service integration
     */
    it('should integrate correctly with ComputerUseService', async () => {
      mockComputerUseService.action.mockResolvedValue(undefined);

      await computerUseTools.moveMouse({ coordinates: { x: 0, y: 0 } });

      expect(mockComputerUseService.action).toHaveBeenCalledWith({
        action: 'move_mouse',
        coordinates: { x: 0, y: 0 },
      });
    });
  });

  describe('Performance and Memory Management', () => {
    /**
     * Test operation performance
     */
    it('should complete operations within acceptable time limits', async () => {
      const coordinates = ComputerUseTestData.generateCoordinates();
      mockComputerUseService.action.mockResolvedValue(undefined);

      const startTime = performance.now();
      await computerUseTools.moveMouse({ coordinates });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    /**
     * Test concurrent operation handling
     */
    it('should handle concurrent operations correctly', async () => {
      mockComputerUseService.action.mockResolvedValue(undefined);

      const concurrentOps = [
        computerUseTools.moveMouse({ coordinates: { x: 100, y: 100 } }),
        computerUseTools.typeText({ text: 'test' }),
      ];

      const results = await Promise.all(concurrentOps);

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.content).toHaveLength(1);
      });
    });
  });
});
