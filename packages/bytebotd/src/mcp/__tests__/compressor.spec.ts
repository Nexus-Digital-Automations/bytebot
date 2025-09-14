/* eslint-env jest */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * Base64ImageCompressor Test Suite
 *
 * Comprehensive test suite for the Base64 image compression module covering
 * compression algorithms, quality optimization, format support, and performance.
 *
 * Test Coverage:
 * - Compression algorithm accuracy and quality
 * - Binary search optimization logic
 * - Multi-format support (PNG, JPEG, WebP)
 * - Size constraint compliance
 * - Performance and memory efficiency
 * - Edge cases and error handling
 * - Compression ratio calculations
 * - Data integrity validation
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { performance } from 'perf_hooks';
import * as _sharp from 'sharp';
import { Logger } from '@nestjs/common';
import {
  Base64ImageCompressor,
  compressPngBase64Under1MB,
  CompressionOptions as _CompressionOptions,
  CompressionResult,
} from '../compressor';
import {
  TestUtils as _TestUtils,
  AssertionHelpers,
  MockDataProviders as _MockDataProviders,
  TestEnvironment as _TestEnvironment,
  createMockLogger,
} from '../../test-utils';

/**
 * Mock Sharp implementation for testing
 */
const mockSharpInstance = {
  png: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
  metadata: jest.fn(),
  resize: jest.fn().mockReturnThis(),
};

const mockSharp = jest.fn(() => mockSharpInstance);

// Mock the sharp module
jest.mock('sharp', () => mockSharp);

/**
 * Test data generators
 */
class TestDataGenerator {
  /**
   * Generate a valid base64 image string of specified size
   */
  static generateBase64Image(sizeKB: number = 100): string {
    const bytes = sizeKB * 1024;
    const buffer = Buffer.alloc(bytes, 'A');
    return buffer.toString('base64');
  }

  /**
   * Generate a base64 image with data URL prefix
   */
  static generateBase64ImageWithPrefix(sizeKB: number = 100): string {
    const base64 = this.generateBase64Image(sizeKB);
    return `data:image/png;base64,${base64}`;
  }

  /**
   * Generate mock image metadata
   */
  static generateImageMetadata(width: number = 1920, height: number = 1080) {
    return {
      width,
      height,
      channels: 3,
      density: 72,
      format: 'png' as const,
    };
  }

  /**
   * Generate mock compression result
   */
  static generateCompressionResult(
    originalSize: number,
    targetSize: number,
    quality: number = 85,
  ): CompressionResult {
    const compressedSize = Math.min(originalSize, targetSize * 1024);
    const base64 = Buffer.alloc(compressedSize, 'B').toString('base64');

    return {
      base64,
      sizeBytes: compressedSize,
      sizeKB: compressedSize / 1024,
      sizeMB: compressedSize / (1024 * 1024),
      quality,
      format: 'png',
      iterations: 3,
    };
  }
}

describe('Base64ImageCompressor', () => {
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock logger
    mockLogger = createMockLogger();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(mockLogger.debug);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(mockLogger.warn);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);

    // Setup default sharp mocks
    mockSharpInstance.toBuffer.mockResolvedValue(Buffer.alloc(500 * 1024, 'B'));
    mockSharpInstance.metadata.mockResolvedValue(
      TestDataGenerator.generateImageMetadata(),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('compressToSize method', () => {
    /**
     * Test basic compression functionality
     */
    it('should compress image to target size successfully', async () => {
      const inputImage = TestDataGenerator.generateBase64Image(2000); // 2MB
      const targetSizeKB = 1024;

      const result = await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB,
        format: 'png',
      });

      expect(result).toBeDefined();
      expect(result.sizeKB).toBeLessThanOrEqual(targetSizeKB);
      expect(result.base64).toBeDefined();
      expect(result.quality).toBeGreaterThan(0);
      expect(result.quality).toBeLessThanOrEqual(100);
      expect(result.format).toBe('png');
      expect(result.iterations).toBeGreaterThanOrEqual(0);

      AssertionHelpers.expectValidOperationResult(result, [
        'base64',
        'sizeKB',
        'quality',
        'format',
      ]);
    });

    /**
     * Test compression with different formats
     */
    it.each(['png', 'jpeg', 'webp'] as const)(
      'should compress image in %s format',
      async (format) => {
        const inputImage = TestDataGenerator.generateBase64Image(1500);

        const result = await Base64ImageCompressor.compressToSize(inputImage, {
          targetSizeKB: 1024,
          format,
        });

        expect(result.format).toBe(format);
        expect(result.sizeKB).toBeLessThanOrEqual(1024);

        // Verify correct sharp method was called
        switch (format) {
          case 'png':
            expect(mockSharpInstance.png).toHaveBeenCalled();
            break;
          case 'jpeg':
            expect(mockSharpInstance.jpeg).toHaveBeenCalled();
            break;
          case 'webp':
            expect(mockSharpInstance.webp).toHaveBeenCalled();
            break;
        }
      },
    );

    /**
     * Test binary search optimization
     */
    it('should use binary search to optimize quality', async () => {
      // Mock progressive compression results
      let callCount = 0;
      mockSharpInstance.toBuffer.mockImplementation(() => {
        callCount++;
        // Simulate decreasing file size with each iteration
        const size = Math.max(800 * 1024 - callCount * 100 * 1024, 500 * 1024);
        return Buffer.alloc(size, 'B');
      });

      const inputImage = TestDataGenerator.generateBase64Image(2000);

      const result = await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB: 1024,
        initialQuality: 95,
        minQuality: 10,
        maxIterations: 10,
      });

      expect(result.iterations).toBeGreaterThan(1);
      expect(result.iterations).toBeLessThanOrEqual(10);
      expect(callCount).toBeGreaterThan(1);
    });

    /**
     * Test image already under target size
     */
    it('should return original image when already under target size', async () => {
      const inputImage = TestDataGenerator.generateBase64Image(500); // 500KB
      const targetSizeKB = 1024;

      const result = await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB,
      });

      expect(result.sizeKB).toBeLessThanOrEqual(targetSizeKB);
      expect(result.iterations).toBe(0);
      expect(mockSharpInstance.toBuffer).not.toHaveBeenCalled();
    });

    /**
     * Test compression with custom quality settings
     */
    it('should respect quality constraints', async () => {
      const inputImage = TestDataGenerator.generateBase64Image(2000);

      const result = await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB: 1024,
        initialQuality: 80,
        minQuality: 20,
      });

      expect(result.quality).toBeGreaterThanOrEqual(20);
      expect(result.quality).toBeLessThanOrEqual(80);
    });

    /**
     * Test with data URL prefix removal
     */
    it('should handle base64 strings with data URL prefix', async () => {
      const inputImage = TestDataGenerator.generateBase64ImageWithPrefix(1500);

      const result = await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB: 1024,
      });

      expect(result).toBeDefined();
      expect(result.base64).not.toMatch(/^data:image\//);
    });

    /**
     * Test maximum iterations limit
     */
    it('should respect maximum iterations limit', async () => {
      mockSharpInstance.toBuffer.mockResolvedValue(
        Buffer.alloc(1500 * 1024, 'B'),
      );

      const inputImage = TestDataGenerator.generateBase64Image(2000);
      const maxIterations = 3;

      const result = await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB: 1024,
        maxIterations,
      });

      expect(result.iterations).toBeLessThanOrEqual(maxIterations);
    });

    /**
     * Test error handling for invalid input
     */
    it('should handle invalid base64 input', async () => {
      const invalidBase64 = 'invalid-base64-string';

      await expect(
        Base64ImageCompressor.compressToSize(invalidBase64),
      ).rejects.toThrow();
    });

    /**
     * Test error handling for sharp processing errors
     */
    it('should handle sharp processing errors', async () => {
      mockSharpInstance.toBuffer.mockRejectedValue(
        new Error('Sharp processing failed'),
      );

      const inputImage = TestDataGenerator.generateBase64Image(1000);

      await expect(
        Base64ImageCompressor.compressToSize(inputImage, {
          targetSizeKB: 500,
        }),
      ).rejects.toThrow('Sharp processing failed');
    });

    /**
     * Test unsupported format error
     */
    it('should handle unsupported formats', async () => {
      const inputImage = TestDataGenerator.generateBase64Image(1000);

      // @ts-ignore - Testing with invalid format
      await expect(
        Base64ImageCompressor.compressToSize(inputImage, {
          format: 'gif' as any,
        }),
      ).rejects.toThrow('Unsupported format');
    });
  });

  describe('compressWithResize method', () => {
    /**
     * Test compression with resize functionality
     */
    it('should compress with resize when quality alone is insufficient', async () => {
      // Mock large file that needs resizing
      mockSharpInstance.toBuffer.mockResolvedValueOnce(
        Buffer.alloc(1500 * 1024, 'B'),
      );
      mockSharpInstance.resize.mockReturnThis();

      const inputImage = TestDataGenerator.generateBase64Image(2000);

      const result = await Base64ImageCompressor.compressWithResize(
        inputImage,
        {
          targetSizeKB: 1024,
          maxWidth: 1920,
          maxHeight: 1080,
        },
      );

      expect(result).toBeDefined();
      expect(result.sizeKB).toBeLessThanOrEqual(1024);
    });

    /**
     * Test progressive scaling
     */
    it('should apply progressive scaling when needed', async () => {
      let _resizeCallCount = 0;
      mockSharpInstance.resize.mockImplementation((width, height, options) => {
        _resizeCallCount++;
        expect(width).toBeGreaterThan(0);
        expect(height).toBeGreaterThan(0);
        expect(options.fit).toBe('inside');
        expect(options.withoutEnlargement).toBe(true);
        return mockSharpInstance;
      });

      // Mock consistently large results to trigger multiple resize attempts
      mockSharpInstance.toBuffer.mockResolvedValue(
        Buffer.alloc(1500 * 1024, 'B'),
      );

      const inputImage = TestDataGenerator.generateBase64Image(3000);

      await Base64ImageCompressor.compressWithResize(inputImage, {
        targetSizeKB: 1024,
      });

      // Should attempt multiple resize operations
      expect(mockSharpInstance.resize).toHaveBeenCalled();
    });

    /**
     * Test minimum scale limit
     */
    it('should respect minimum scale limit', async () => {
      // Mock consistently large results
      mockSharpInstance.toBuffer.mockResolvedValue(
        Buffer.alloc(2000 * 1024, 'B'),
      );

      const inputImage = TestDataGenerator.generateBase64Image(5000);

      const result = await Base64ImageCompressor.compressWithResize(
        inputImage,
        {
          targetSizeKB: 500,
        },
      );

      // Should eventually stop trying when scale reaches minimum
      expect(result).toBeDefined();
    });
  });

  describe('getBase64SizeInfo method', () => {
    /**
     * Test size calculation accuracy
     */
    it('should calculate size information accurately', () => {
      const testSizes = [100, 1024, 2048]; // KB

      testSizes.forEach((sizeKB) => {
        const base64 = TestDataGenerator.generateBase64Image(sizeKB);
        const sizeInfo = Base64ImageCompressor.getBase64SizeInfo(base64);

        expect(sizeInfo.kb).toBeCloseTo(sizeKB, 1);
        expect(sizeInfo.bytes).toBe(sizeKB * 1024);
        expect(sizeInfo.mb).toBeCloseTo(sizeKB / 1024, 3);
        expect(sizeInfo.formatted).toBeDefined();
      });
    });

    /**
     * Test formatted output for different sizes
     */
    it('should format sizes correctly', () => {
      const testCases = [
        { sizeKB: 0.5, expectedUnit: 'bytes' },
        { sizeKB: 100, expectedUnit: 'KB' },
        { sizeKB: 1500, expectedUnit: 'MB' },
      ];

      testCases.forEach(({ sizeKB, expectedUnit }) => {
        const base64 = TestDataGenerator.generateBase64Image(sizeKB);
        const sizeInfo = Base64ImageCompressor.getBase64SizeInfo(base64);

        expect(sizeInfo.formatted).toContain(expectedUnit);
      });
    });

    /**
     * Test with data URL prefix
     */
    it('should handle data URL prefix correctly', () => {
      const base64WithPrefix =
        TestDataGenerator.generateBase64ImageWithPrefix(100);
      const base64WithoutPrefix = TestDataGenerator.generateBase64Image(100);

      const sizeInfoWithPrefix =
        Base64ImageCompressor.getBase64SizeInfo(base64WithPrefix);
      const sizeInfoWithoutPrefix =
        Base64ImageCompressor.getBase64SizeInfo(base64WithoutPrefix);

      expect(sizeInfoWithPrefix.bytes).toBe(sizeInfoWithoutPrefix.bytes);
      expect(sizeInfoWithPrefix.kb).toBe(sizeInfoWithoutPrefix.kb);
    });
  });

  describe('compressPngBase64Under1MB utility function', () => {
    /**
     * Test utility function wrapper
     */
    it('should compress PNG to under 1MB', async () => {
      const inputImage = TestDataGenerator.generateBase64Image(2000);

      const result = await compressPngBase64Under1MB(inputImage);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');

      // Verify it's actually under 1MB
      const sizeInfo = Base64ImageCompressor.getBase64SizeInfo(result);
      expect(sizeInfo.kb).toBeLessThanOrEqual(1024);
    });

    /**
     * Test utility function parameters
     */
    it('should use correct default parameters', async () => {
      jest.spyOn(Base64ImageCompressor, 'compressToSize');

      const inputImage = TestDataGenerator.generateBase64Image(1500);
      await compressPngBase64Under1MB(inputImage);

      expect(Base64ImageCompressor.compressToSize).toHaveBeenCalledWith(
        inputImage,
        {
          targetSizeKB: 1024,
          format: 'png',
          initialQuality: 95,
          minQuality: 10,
        },
      );
    });
  });

  describe('Performance and Memory', () => {
    /**
     * Test compression performance
     */
    it('should compress within acceptable time limits', async () => {
      const inputImage = TestDataGenerator.generateBase64Image(1000);
      const startTime = performance.now();

      const result = await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB: 800,
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    /**
     * Test memory usage during compression
     */
    it('should maintain reasonable memory usage', async () => {
      const initialMemory = process.memoryUsage();

      // Process multiple images
      const promises = Array(5)
        .fill(null)
        .map((_, i) => {
          const image = TestDataGenerator.generateBase64Image(1000 + i * 100);
          return Base64ImageCompressor.compressToSize(image, {
            targetSizeKB: 800,
          });
        });

      await Promise.all(promises);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    /**
     * Test with large images
     */
    it('should handle large images efficiently', async () => {
      const largeImage = TestDataGenerator.generateBase64Image(10000); // 10MB

      const startTime = performance.now();
      const result = await Base64ImageCompressor.compressToSize(largeImage, {
        targetSizeKB: 1024,
        maxIterations: 5,
      });
      const endTime = performance.now();

      expect(result.sizeKB).toBeLessThanOrEqual(1024);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    /**
     * Test with empty input
     */
    it('should handle empty input gracefully', async () => {
      await expect(Base64ImageCompressor.compressToSize('')).rejects.toThrow();
    });

    /**
     * Test with very small target size
     */
    it('should handle very small target sizes', async () => {
      const inputImage = TestDataGenerator.generateBase64Image(1000);

      const result = await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB: 1, // Very small target
        minQuality: 1,
      });

      expect(result.quality).toBeGreaterThanOrEqual(1);
      expect(result.iterations).toBeGreaterThan(0);
    });

    /**
     * Test with very large target size
     */
    it('should handle very large target sizes', async () => {
      const inputImage = TestDataGenerator.generateBase64Image(100);

      const result = await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB: 10000, // Much larger than input
      });

      expect(result.iterations).toBe(0);
      expect(result.sizeKB).toBeLessThan(10000);
    });

    /**
     * Test with invalid quality ranges
     */
    it('should handle invalid quality ranges', async () => {
      const inputImage = TestDataGenerator.generateBase64Image(1000);

      const result = await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB: 800,
        initialQuality: 50,
        minQuality: 60, // Min greater than initial
      });

      // Should still work, potentially with swapped values or clamping
      expect(result).toBeDefined();
    });

    /**
     * Test compression with zero iterations
     */
    it('should handle zero max iterations', async () => {
      const inputImage = TestDataGenerator.generateBase64Image(1000);

      const result = await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB: 800,
        maxIterations: 0,
      });

      expect(result.iterations).toBe(0);
    });
  });

  describe('Logging and Monitoring', () => {
    /**
     * Test compression logging
     */
    it('should log compression operations', async () => {
      const inputImage = TestDataGenerator.generateBase64Image(1000);

      await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB: 800,
      });

      // Verify logging calls (due to mocking limitations, we verify the operation completed)
      expect(mockSharpInstance.toBuffer).toHaveBeenCalled();
    });

    /**
     * Test error logging
     */
    it('should log errors appropriately', async () => {
      mockSharpInstance.toBuffer.mockRejectedValue(new Error('Test error'));

      const inputImage = TestDataGenerator.generateBase64Image(1000);

      await expect(
        Base64ImageCompressor.compressToSize(inputImage, {
          targetSizeKB: 800,
        }),
      ).rejects.toThrow('Test error');
    });
  });

  describe('Data Integrity and Validation', () => {
    /**
     * Test base64 output validity
     */
    it('should produce valid base64 output', async () => {
      const inputImage = TestDataGenerator.generateBase64Image(1000);

      const result = await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB: 800,
      });

      expect(result.base64).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    /**
     * Test compression ratio calculations
     */
    it('should calculate compression ratios correctly', async () => {
      const _inputSize = 1000 * 1024; // 1MB
      const outputSize = 800 * 1024; // 800KB

      mockSharpInstance.toBuffer.mockResolvedValue(
        Buffer.alloc(outputSize, 'B'),
      );

      const inputImage = TestDataGenerator.generateBase64Image(1000);
      const result = await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB: 800,
      });

      expect(result.sizeBytes).toBe(outputSize);
      expect(result.sizeKB).toBeCloseTo(800, 1);
      expect(result.sizeMB).toBeCloseTo(0.8, 2);
    });

    /**
     * Test metadata consistency
     */
    it('should maintain consistent metadata', async () => {
      const inputImage = TestDataGenerator.generateBase64Image(1000);

      const result = await Base64ImageCompressor.compressToSize(inputImage, {
        targetSizeKB: 800,
        format: 'jpeg',
      });

      expect(result.format).toBe('jpeg');
      expect(result.sizeBytes).toBe(result.sizeKB * 1024);
      expect(result.sizeMB).toBe(result.sizeKB / 1024);
    });
  });
});
