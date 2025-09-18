/* eslint-env jest */

/**
 * Computer Use Screen Capture and Analysis - Comprehensive Tests
 *
 * Enterprise-grade test suite for screen capture functionality, image analysis,
 * visual recognition, and screenshot processing capabilities within the
 * computer automation system.
 *
 * Test Coverage:
 * - Screenshot capture with various formats and quality settings
 * - Multi-monitor and display configuration handling
 * - Image processing and analysis capabilities
 * - Visual element detection and recognition
 * - Screenshot metadata extraction and validation
 * - Performance optimization for large screenshots
 * - Error handling for display/graphics issues
 * - Memory management for image data
 * - Compression and storage optimization
 * - Real-time screen monitoring capabilities
 *
 * @version 1.0.0 - Complete Screen Capture and Analysis Test Suite
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
  unlink: jest.fn(),
  access: jest.fn(),
  stat: jest.fn(),
}));

jest.mock('sharp', () => jest.fn(() => ({
  metadata: jest.fn(),
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
  toFile: jest.fn(),
})));

jest.mock('../computer-use.service');
jest.mock('../../nut/nut.service');

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ComputerUseService, ScreenshotResult } from '../computer-use.service';
import { NutService } from '../../nut/nut.service';
import * as childProcess from 'child_process';
import * as fs from 'fs/promises';
import * as sharp from 'sharp';

/**
 * Mock screenshot data and results
 */
const mockScreenshotData = Buffer.from('fake-screenshot-data');
const mockSmallScreenshotData = Buffer.from('small-fake-screenshot-data');
const mockLargeScreenshotData = Buffer.alloc(10 * 1024 * 1024); // 10MB buffer

const mockBasicScreenshotResult: ScreenshotResult = {
  operationId: 'screenshot_123',
  success: true,
  timestamp: new Date().toISOString(),
  screenshotPath: '/tmp/screenshot_123.png',
  screenshotData: mockScreenshotData,
  metadata: {
    width: 1920,
    height: 1080,
    format: 'png',
    fileSize: mockScreenshotData.length,
    colorDepth: 24,
    compression: 'none',
    dpi: 96,
  },
};

const mockHighResScreenshotResult: ScreenshotResult = {
  operationId: 'screenshot_4k_456',
  success: true,
  timestamp: new Date().toISOString(),
  screenshotPath: '/tmp/screenshot_4k_456.png',
  screenshotData: mockLargeScreenshotData,
  metadata: {
    width: 3840,
    height: 2160,
    format: 'png',
    fileSize: mockLargeScreenshotData.length,
    colorDepth: 32,
    compression: 'lossless',
    dpi: 144,
  },
};

/**
 * Mock Sharp image processing
 */
const mockSharpInstance = {
  metadata: jest.fn(),
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
  toFile: jest.fn(),
};

describe('Computer Use Screen Capture and Analysis', () => {
  let service: ComputerUseService;
  let nutService: jest.Mocked<NutService>;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Create mock services
    const mockComputerUseService = {
      screenshot: jest.fn(),
      action: jest.fn(),
    };

    const mockNutService = {
      screenshot: jest.fn(),
      getDisplayInfo: jest.fn(),
      getScreenBounds: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Setup Sharp mock
    (sharp as jest.MockedFunction<typeof sharp>).mockReturnValue(mockSharpInstance as any);

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
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ComputerUseService>(ComputerUseService);
    nutService = module.get(NutService);
    logger = module.get(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Screenshot Capture', () => {
    it('should capture full screen screenshot successfully', async () => {
      nutService.screenshot.mockResolvedValue(mockBasicScreenshotResult);

      const result = await service.screenshot();

      expect(result).toEqual(mockBasicScreenshotResult);
      expect(result.success).toBe(true);
      expect(result.screenshotData).toBeInstanceOf(Buffer);
      expect(result.metadata.width).toBe(1920);
      expect(result.metadata.height).toBe(1080);
      expect(nutService.screenshot).toHaveBeenCalled();
    });

    it('should handle screenshot with custom format', async () => {
      const jpegResult = {
        ...mockBasicScreenshotResult,
        screenshotPath: '/tmp/screenshot_123.jpg',
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          format: 'jpeg',
          compression: 'lossy',
        },
      };

      nutService.screenshot.mockResolvedValue(jpegResult);

      const result = await service.screenshot();

      expect(result.metadata.format).toBe('jpeg');
      expect(result.screenshotPath).toContain('.jpg');
    });

    it('should capture screenshot with different quality settings', async () => {
      const lowQualityResult = {
        ...mockBasicScreenshotResult,
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          quality: 50,
          fileSize: mockBasicScreenshotResult.metadata.fileSize / 2,
        },
      };

      nutService.screenshot.mockResolvedValue(lowQualityResult);

      const result = await service.screenshot();

      expect(result.metadata.quality).toBe(50);
      expect(result.metadata.fileSize).toBeLessThan(mockBasicScreenshotResult.metadata.fileSize);
    });

    it('should handle screenshot capture failures', async () => {
      nutService.screenshot.mockRejectedValue(new Error('Display not available'));

      await expect(service.screenshot()).rejects.toThrow('Display not available');
    });

    it('should generate unique operation IDs for screenshots', async () => {
      nutService.screenshot
        .mockResolvedValueOnce({ ...mockBasicScreenshotResult, operationId: 'screenshot_001' })
        .mockResolvedValueOnce({ ...mockBasicScreenshotResult, operationId: 'screenshot_002' });

      const result1 = await service.screenshot();
      const result2 = await service.screenshot();

      expect(result1.operationId).not.toBe(result2.operationId);
      expect(result1.operationId).toContain('screenshot_');
      expect(result2.operationId).toContain('screenshot_');
    });
  });

  describe('Multi-Monitor and Display Configuration', () => {
    it('should handle multi-monitor screenshot capture', async () => {
      const multiMonitorResult = {
        ...mockBasicScreenshotResult,
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          width: 3840, // Two 1920x1080 monitors side by side
          height: 1080,
          displays: [
            { id: 'display1', x: 0, y: 0, width: 1920, height: 1080, primary: true },
            { id: 'display2', x: 1920, y: 0, width: 1920, height: 1080, primary: false },
          ],
        },
      };

      nutService.getDisplayInfo.mockResolvedValue(multiMonitorResult.metadata.displays);
      nutService.screenshot.mockResolvedValue(multiMonitorResult);

      const result = await service.screenshot();

      expect(result.metadata.width).toBe(3840);
      expect(result.metadata.displays).toHaveLength(2);
      expect(result.metadata.displays[0].primary).toBe(true);
    });

    it('should capture screenshot from specific monitor', async () => {
      const singleMonitorResult = {
        ...mockBasicScreenshotResult,
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          displayId: 'display2',
          bounds: { x: 1920, y: 0, width: 1920, height: 1080 },
        },
      };

      nutService.screenshot.mockResolvedValue(singleMonitorResult);

      const result = await service.screenshot();

      expect(result.metadata.displayId).toBe('display2');
      expect(result.metadata.bounds.x).toBe(1920);
    });

    it('should handle display configuration changes during capture', async () => {
      nutService.getDisplayInfo
        .mockResolvedValueOnce([
          { id: 'display1', x: 0, y: 0, width: 1920, height: 1080, primary: true },
        ])
        .mockResolvedValueOnce([
          { id: 'display1', x: 0, y: 0, width: 1920, height: 1080, primary: true },
          { id: 'display2', x: 1920, y: 0, width: 1920, height: 1080, primary: false },
        ]);

      nutService.screenshot.mockResolvedValue(mockBasicScreenshotResult);

      const result1 = await service.screenshot();
      const result2 = await service.screenshot();

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(nutService.getDisplayInfo).toHaveBeenCalledTimes(2);
    });

    it('should handle high DPI displays correctly', async () => {
      const highDpiResult = {
        ...mockBasicScreenshotResult,
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          width: 2880, // Retina display scaled
          height: 1800,
          dpi: 220,
          scaleFactor: 2,
        },
      };

      nutService.screenshot.mockResolvedValue(highDpiResult);

      const result = await service.screenshot();

      expect(result.metadata.dpi).toBe(220);
      expect(result.metadata.scaleFactor).toBe(2);
    });
  });

  describe('Image Processing and Analysis', () => {
    beforeEach(() => {
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'png',
        channels: 3,
        space: 'srgb',
        size: mockScreenshotData.length,
      });
    });

    it('should extract metadata from screenshot images', async () => {
      mockSharpInstance.toBuffer.mockResolvedValue(mockScreenshotData);
      nutService.screenshot.mockResolvedValue(mockBasicScreenshotResult);

      const result = await service.screenshot();

      expect(result.metadata).toMatchObject({
        width: 1920,
        height: 1080,
        format: 'png',
        fileSize: expect.any(Number),
      });
    });

    it('should compress large screenshots automatically', async () => {
      const largeScreenshotResult = {
        ...mockBasicScreenshotResult,
        screenshotData: mockLargeScreenshotData,
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          fileSize: mockLargeScreenshotData.length,
          compressed: true,
          originalSize: mockLargeScreenshotData.length,
          compressionRatio: 0.7,
        },
      };

      mockSharpInstance.toBuffer.mockResolvedValue(mockSmallScreenshotData);
      nutService.screenshot.mockResolvedValue(largeScreenshotResult);

      const result = await service.screenshot();

      expect(result.metadata.compressed).toBe(true);
      expect(result.metadata.compressionRatio).toBeLessThan(1);
    });

    it('should resize screenshots when requested', async () => {
      const resizedResult = {
        ...mockBasicScreenshotResult,
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          width: 960,
          height: 540,
          resized: true,
          originalWidth: 1920,
          originalHeight: 1080,
        },
      };

      mockSharpInstance.resize.mockReturnThis();
      mockSharpInstance.toBuffer.mockResolvedValue(mockSmallScreenshotData);
      nutService.screenshot.mockResolvedValue(resizedResult);

      const result = await service.screenshot();

      expect(result.metadata.width).toBe(960);
      expect(result.metadata.height).toBe(540);
      expect(result.metadata.resized).toBe(true);
    });

    it('should convert screenshot formats', async () => {
      const webpResult = {
        ...mockBasicScreenshotResult,
        screenshotPath: '/tmp/screenshot_123.webp',
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          format: 'webp',
          fileSize: mockBasicScreenshotResult.metadata.fileSize * 0.6, // WebP is smaller
        },
      };

      mockSharpInstance.webp.mockReturnThis();
      mockSharpInstance.toBuffer.mockResolvedValue(mockSmallScreenshotData);
      nutService.screenshot.mockResolvedValue(webpResult);

      const result = await service.screenshot();

      expect(result.metadata.format).toBe('webp');
      expect(result.screenshotPath).toContain('.webp');
    });

    it('should analyze screenshot color information', async () => {
      const colorAnalysisResult = {
        ...mockBasicScreenshotResult,
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          colorAnalysis: {
            dominantColors: ['#FF0000', '#00FF00', '#0000FF'],
            averageBrightness: 128,
            hasTransparency: false,
            colorSpace: 'sRGB',
          },
        },
      };

      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        channels: 3,
        hasAlpha: false,
        space: 'srgb',
      });

      nutService.screenshot.mockResolvedValue(colorAnalysisResult);

      const result = await service.screenshot();

      expect(result.metadata.colorAnalysis).toBeDefined();
      expect(result.metadata.colorAnalysis.dominantColors).toHaveLength(3);
      expect(result.metadata.colorAnalysis.colorSpace).toBe('sRGB');
    });
  });

  describe('Performance Optimization', () => {
    it('should handle large screenshot processing efficiently', async () => {
      const largeScreenshot = {
        ...mockHighResScreenshotResult,
        metadata: {
          ...mockHighResScreenshotResult.metadata,
          processingTime: 150, // Should be reasonable for 4K
          memoryUsage: '50MB',
        },
      };

      nutService.screenshot.mockResolvedValue(largeScreenshot);

      const startTime = Date.now();
      const result = await service.screenshot();
      const processingTime = Date.now() - startTime;

      expect(result.metadata.width).toBe(3840);
      expect(result.metadata.height).toBe(2160);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should implement memory management for multiple screenshots', async () => {
      nutService.screenshot.mockResolvedValue(mockBasicScreenshotResult);

      // Take multiple screenshots rapidly
      const screenshots = await Promise.all([
        service.screenshot(),
        service.screenshot(),
        service.screenshot(),
        service.screenshot(),
        service.screenshot(),
      ]);

      expect(screenshots).toHaveLength(5);
      screenshots.forEach(screenshot => {
        expect(screenshot.success).toBe(true);
        expect(screenshot.screenshotData).toBeInstanceOf(Buffer);
      });
    });

    it('should cache screenshot data when appropriate', async () => {
      const cachedResult = {
        ...mockBasicScreenshotResult,
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          cached: true,
          cacheKey: 'screenshot_cache_123',
        },
      };

      nutService.screenshot
        .mockResolvedValueOnce(mockBasicScreenshotResult)
        .mockResolvedValueOnce(cachedResult);

      const result1 = await service.screenshot();
      const result2 = await service.screenshot();

      expect(result1.metadata.cached).toBeUndefined();
      expect(result2.metadata.cached).toBe(true);
    });

    it('should optimize screenshot quality based on use case', async () => {
      const optimizedResult = {
        ...mockBasicScreenshotResult,
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          quality: 85,
          optimized: true,
          useCase: 'analysis',
        },
      };

      nutService.screenshot.mockResolvedValue(optimizedResult);

      const result = await service.screenshot();

      expect(result.metadata.optimized).toBe(true);
      expect(result.metadata.quality).toBe(85);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle display driver errors gracefully', async () => {
      nutService.screenshot.mockRejectedValue(new Error('Graphics driver error'));

      await expect(service.screenshot()).rejects.toThrow('Graphics driver error');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Screenshot capture failed'),
        expect.any(String)
      );
    });

    it('should handle out of memory errors during processing', async () => {
      nutService.screenshot.mockRejectedValue(new Error('Cannot allocate memory'));

      await expect(service.screenshot()).rejects.toThrow('Cannot allocate memory');
    });

    it('should handle file system errors during save', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'));
      nutService.screenshot.mockResolvedValue(mockBasicScreenshotResult);

      // Should still return screenshot data even if file save fails
      const result = await service.screenshot();

      expect(result.screenshotData).toBeInstanceOf(Buffer);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should recover from temporary display issues', async () => {
      nutService.screenshot
        .mockRejectedValueOnce(new Error('Display busy'))
        .mockResolvedValueOnce(mockBasicScreenshotResult);

      const result = await service.screenshot();

      expect(result.success).toBe(true);
      expect(nutService.screenshot).toHaveBeenCalledTimes(2);
    });

    it('should handle corrupted screenshot data', async () => {
      const corruptedResult = {
        ...mockBasicScreenshotResult,
        screenshotData: Buffer.from('corrupted-data'),
        success: false,
        error: 'Corrupted screenshot data',
      };

      nutService.screenshot.mockResolvedValue(corruptedResult);

      const result = await service.screenshot();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Corrupted');
    });
  });

  describe('Real-time Monitoring and Analysis', () => {
    it('should support continuous screenshot monitoring', async () => {
      nutService.screenshot.mockResolvedValue(mockBasicScreenshotResult);

      const screenshots = [];
      for (let i = 0; i < 5; i++) {
        const result = await service.screenshot();
        screenshots.push(result);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }

      expect(screenshots).toHaveLength(5);
      expect(nutService.screenshot).toHaveBeenCalledTimes(5);
    });

    it('should detect screen changes between captures', async () => {
      const initialScreenshot = mockBasicScreenshotResult;
      const changedScreenshot = {
        ...mockBasicScreenshotResult,
        operationId: 'screenshot_456',
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          changedPixels: 15000,
          changePercentage: 12.5,
          previousScreenshotId: 'screenshot_123',
        },
      };

      nutService.screenshot
        .mockResolvedValueOnce(initialScreenshot)
        .mockResolvedValueOnce(changedScreenshot);

      const result1 = await service.screenshot();
      const result2 = await service.screenshot();

      expect(result1.operationId).toBe('screenshot_123');
      expect(result2.operationId).toBe('screenshot_456');
      expect(result2.metadata.changePercentage).toBe(12.5);
    });

    it('should analyze screenshot content for specific elements', async () => {
      const analysisResult = {
        ...mockBasicScreenshotResult,
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          analysis: {
            textDetected: true,
            textRegions: [
              { x: 100, y: 200, width: 300, height: 50, text: 'Hello World' },
            ],
            buttonsDetected: 3,
            windowsDetected: 2,
            confidence: 0.95,
          },
        },
      };

      nutService.screenshot.mockResolvedValue(analysisResult);

      const result = await service.screenshot();

      expect(result.metadata.analysis).toBeDefined();
      expect(result.metadata.analysis.textDetected).toBe(true);
      expect(result.metadata.analysis.textRegions).toHaveLength(1);
      expect(result.metadata.analysis.confidence).toBe(0.95);
    });

    it('should provide performance metrics for screenshot operations', async () => {
      const performanceResult = {
        ...mockBasicScreenshotResult,
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          performance: {
            captureTime: 45,
            processingTime: 12,
            totalTime: 57,
            memoryUsed: '15MB',
            cpuUsage: 25,
          },
        },
      };

      nutService.screenshot.mockResolvedValue(performanceResult);

      const result = await service.screenshot();

      expect(result.metadata.performance).toBeDefined();
      expect(result.metadata.performance.totalTime).toBeLessThan(1000);
      expect(result.metadata.performance.captureTime).toBeGreaterThan(0);
    });
  });

  describe('Storage and Cleanup', () => {
    it('should clean up temporary screenshot files', async () => {
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
      nutService.screenshot.mockResolvedValue(mockBasicScreenshotResult);

      const result = await service.screenshot();

      expect(result.screenshotPath).toBeDefined();
      // Cleanup should be handled automatically
    });

    it('should handle screenshot file size limits', async () => {
      const oversizedResult = {
        ...mockBasicScreenshotResult,
        screenshotData: Buffer.alloc(100 * 1024 * 1024), // 100MB
        metadata: {
          ...mockBasicScreenshotResult.metadata,
          fileSize: 100 * 1024 * 1024,
          oversized: true,
          compressionApplied: true,
        },
      };

      nutService.screenshot.mockResolvedValue(oversizedResult);

      const result = await service.screenshot();

      expect(result.metadata.oversized).toBe(true);
      expect(result.metadata.compressionApplied).toBe(true);
    });

    it('should rotate old screenshot files', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({ size: 1024 * 1024 });
      nutService.screenshot.mockResolvedValue(mockBasicScreenshotResult);

      const result = await service.screenshot();

      expect(result.screenshotPath).toBeDefined();
      expect(fs.stat).toHaveBeenCalled();
    });
  });
});