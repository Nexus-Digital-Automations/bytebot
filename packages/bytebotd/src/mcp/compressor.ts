/**
 * Base64 Image Compressor Module - Intelligent Image Compression for MCP Integration
 *
 * This module provides sophisticated image compression capabilities optimized for
 * Model Context Protocol (MCP) data transmission. Features include intelligent
 * quality adjustment, multi-format support, and dimension-aware optimization.
 *
 * Key Features:
 * - Binary search quality optimization for target file sizes
 * - Multi-format support (PNG, JPEG, WebP)
 * - Progressive dimension reduction when quality alone isn't sufficient
 * - Comprehensive performance metrics and compression analytics
 * - Production-ready error handling and logging
 *
 * Dependencies:
 * - sharp: High-performance image processing library
 *
 * Usage:
 * - compressPngBase64Under1MB(): Quick compression for MCP screenshots
 * - Base64ImageCompressor.compressToSize(): Advanced compression with options
 * - Base64ImageCompressor.compressWithResize(): Includes dimension reduction
 *
 * @author ByteBot Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import * as sharp from 'sharp';
import { Logger } from '@nestjs/common';

// Initialize logger for compression operations
const logger = new Logger('Base64ImageCompressor');

// Type-safe sharp function call helper
const createSharp = (input: string | Buffer): sharp.Sharp => {
   
  return (sharp as any)(input);
};

/**
 * Configuration options for image compression operations
 */
interface CompressionOptions {
  /** Target file size in kilobytes (default: 1024KB = 1MB) */
  targetSizeKB?: number;
  /** Initial quality setting for compression (0-100, default: 95) */
  initialQuality?: number;
  /** Minimum acceptable quality (0-100, default: 10) */
  minQuality?: number;
  /** Output image format (default: 'png') */
  format?: 'png' | 'jpeg' | 'webp';
  /** Maximum optimization iterations (default: 10) */
  maxIterations?: number;
}

/**
 * Comprehensive result data from compression operations
 */
interface CompressionResult {
  /** Compressed image as base64 string */
  base64: string;
  /** Final file size in bytes */
  sizeBytes: number;
  /** Final file size in kilobytes */
  sizeKB: number;
  /** Final file size in megabytes */
  sizeMB: number;
  /** Final quality setting used */
  quality: number;
  /** Output format used */
  format: string;
  /** Number of optimization iterations performed */
  iterations: number;
}

/**
 * Advanced Base64 Image Compression Engine
 *
 * Implements intelligent compression algorithms with binary search optimization,
 * multi-format support, and comprehensive performance monitoring.
 */
class Base64ImageCompressor {
  /**
   * Compresses a base64 image string to meet specified size constraints
   *
   * Uses binary search algorithm to find optimal quality settings that achieve
   * target file size while maximizing visual quality. Supports multiple image
   * formats with format-specific optimization strategies.
   *
   * Algorithm:
   * 1. Parse and validate input base64 data
   * 2. Binary search for optimal quality setting
   * 3. Apply format-specific compression parameters
   * 4. Return comprehensive result metrics
   *
   * @param base64String Input image as base64 string (with or without data URL prefix)
   * @param options Compression configuration options
   * @returns Promise resolving to detailed compression results
   *
   * Performance: Typically 50-200ms for standard screenshots
   * Quality: Maintains visual fidelity while meeting size constraints
   */
  static async compressToSize(
    base64String: string,
    options: CompressionOptions = {},
  ): Promise<CompressionResult> {
    const operationId = `compress_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();

    logger.log(`[${operationId}] Starting image compression`, {
      operationId,
      inputSize: base64String.length,
      targetSizeKB: options.targetSizeKB || 1024,
      format: options.format || 'png',
    });
    const {
      targetSizeKB = 1024, // 1MB default
      initialQuality = 95,
      minQuality = 10,
      format = 'png',
      maxIterations = 10,
    } = options;

    try {
      // Extract base64 data (remove data URL prefix if present)
      const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
      const inputBuffer = Buffer.from(base64Data, 'base64');
      const inputSizeKB = inputBuffer.length / 1024;

      logger.debug(`[${operationId}] Input processing completed`, {
        operationId,
        inputSizeKB: inputSizeKB.toFixed(2),
        inputSizeMB: (inputSizeKB / 1024).toFixed(3),
        targetSizeKB,
        compressionNeeded: inputSizeKB > targetSizeKB,
      });

      // If already under target size, return with minimal processing
      if (inputSizeKB <= targetSizeKB) {
        logger.debug(
          `[${operationId}] Image already under target size, skipping compression`,
        );
        return {
          base64: base64Data,
          sizeBytes: inputBuffer.length,
          sizeKB: inputSizeKB,
          sizeMB: inputSizeKB / 1024,
          quality: initialQuality,
          format,
          iterations: 0,
        };
      }

      let quality = initialQuality;
      let outputBuffer: Buffer;
      let iterations = 0;
      const optimizationStartTime = Date.now();

      // Binary search for optimal quality
      let low = minQuality;
      let high = initialQuality;
      let bestResult: { buffer: Buffer; quality: number } | null = null;

      logger.debug(`[${operationId}] Starting binary search optimization`, {
        operationId,
        searchRange: `${minQuality}-${initialQuality}`,
        maxIterations,
      });

      while (low <= high && iterations < maxIterations) {
        quality = Math.floor((low + high) / 2);
        const iterationStartTime = Date.now();

        outputBuffer = await this.compressBuffer(inputBuffer, quality, format);
        const sizeKB = outputBuffer.length / 1024;
        const iterationTime = Date.now() - iterationStartTime;

        logger.debug(`[${operationId}] Iteration ${iterations + 1}`, {
          operationId,
          iteration: iterations + 1,
          quality,
          resultSizeKB: sizeKB.toFixed(2),
          targetSizeKB,
          withinTarget: sizeKB <= targetSizeKB,
          iterationTimeMs: iterationTime,
        });

        if (sizeKB <= targetSizeKB) {
          // Size is acceptable, try higher quality
          bestResult = { buffer: outputBuffer, quality };
          low = quality + 1;
        } else {
          // Size too large, reduce quality
          high = quality - 1;
        }

        iterations++;
      }

      const optimizationTime = Date.now() - optimizationStartTime;

      // If no result found under target size, use lowest quality
      if (!bestResult) {
        logger.warn(
          `[${operationId}] No solution found within iterations, using minimum quality`,
        );
        outputBuffer = await this.compressBuffer(
          inputBuffer,
          minQuality,
          format,
        );
        quality = minQuality;
      } else {
        outputBuffer = bestResult.buffer;
        quality = bestResult.quality;
      }

      // Convert back to base64 and calculate final metrics
      const outputBase64 = outputBuffer.toString('base64');
      const sizeBytes = outputBuffer.length;
      const finalSizeKB = sizeBytes / 1024;
      const finalSizeMB = sizeBytes / (1024 * 1024);
      const compressionRatio = sizeBytes / inputBuffer.length;
      const totalTime = Date.now() - startTime;

      const result = {
        base64: outputBase64,
        sizeBytes,
        sizeKB: finalSizeKB,
        sizeMB: finalSizeMB,
        quality,
        format,
        iterations,
      };

      logger.log(`[${operationId}] Compression completed successfully`, {
        operationId,
        finalSizeKB: finalSizeKB.toFixed(2),
        finalSizeMB: finalSizeMB.toFixed(3),
        compressionRatio: compressionRatio.toFixed(3),
        compressionPercentage: `${((1 - compressionRatio) * 100).toFixed(1)}%`,
        finalQuality: quality,
        iterations,
        optimizationTimeMs: optimizationTime,
        totalTimeMs: totalTime,
        targetAchieved: finalSizeKB <= targetSizeKB,
      });

      return result;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error(`[${operationId}] Compression failed`, {
        operationId,
        error: (error as Error).message,
        totalTimeMs: totalTime,
      });
      throw error;
    }
  }

  /**
   * Compress buffer with specified quality
   */
  private static async compressBuffer(
    inputBuffer: Buffer,
    quality: number,
    format: 'png' | 'jpeg' | 'webp',
  ): Promise<Buffer> {
    const sharpInstance = createSharp(inputBuffer);

    switch (format) {
      case 'png':
        return sharpInstance
          .png({
            quality,
            compressionLevel: 9,
            adaptiveFiltering: true,
            palette: true,
          })
          .toBuffer();

      case 'jpeg':
        return sharpInstance
          .jpeg({
            quality,
            progressive: true,
            mozjpeg: true,
            optimizeScans: true,
          })
          .toBuffer();

      case 'webp':
        return sharpInstance
          .webp({
            quality,
            alphaQuality: quality,
            lossless: false,
            nearLossless: false,
            smartSubsample: true,
          })
          .toBuffer();

      default: {
        const exhaustiveCheck: never = format;
        throw new Error(`Unsupported format: ${String(exhaustiveCheck)}`);
      }
    }
  }

  /**
   * Compress with dimension reduction if quality alone isn't enough
   */
  static async compressWithResize(
    base64String: string,
    options: CompressionOptions & {
      maxWidth?: number;
      maxHeight?: number;
    } = {},
  ): Promise<CompressionResult> {
    const {
      targetSizeKB = 1024,
      maxWidth = 2048,
      maxHeight = 2048,
      ...compressionOptions
    } = options;

    // First try compression without resizing
    let result = await this.compressToSize(base64String, compressionOptions);

    // If still too large, apply progressive resizing
    if (result.sizeKB > targetSizeKB) {
      const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
      const inputBuffer = Buffer.from(base64Data, 'base64');

      const metadata = await createSharp(inputBuffer).metadata();
      const originalWidth = metadata.width || maxWidth;
      const originalHeight = metadata.height || maxHeight;

      let scale = 0.9; // Start with 90% of original size

      while (result.sizeKB > targetSizeKB && scale > 0.3) {
        const newWidth = Math.floor(originalWidth * scale);
        const newHeight = Math.floor(originalHeight * scale);

        const resizedBuffer = await createSharp(inputBuffer)
          .resize(newWidth, newHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toBuffer();

        const resizedBase64 = resizedBuffer.toString('base64');

        result = await this.compressToSize(resizedBase64, compressionOptions);
        scale -= 0.1;
      }
    }

    return result;
  }

  /**
   * Get size information for a base64 string
   */
  static getBase64SizeInfo(base64String: string): {
    bytes: number;
    kb: number;
    mb: number;
    formatted: string;
  } {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    const bytes = Buffer.from(base64Data, 'base64').length;
    const kb = bytes / 1024;
    const mb = bytes / (1024 * 1024);

    let formatted: string;
    if (mb >= 1) {
      formatted = `${mb.toFixed(2)} MB`;
    } else if (kb >= 1) {
      formatted = `${kb.toFixed(2)} KB`;
    } else {
      formatted = `${bytes} bytes`;
    }

    return { bytes, kb, mb, formatted };
  }
}

// Utility function for quick compression
export async function compressPngBase64Under1MB(
  base64String: string,
): Promise<string> {
  const result = await Base64ImageCompressor.compressToSize(base64String, {
    targetSizeKB: 1024,
    format: 'png',
    initialQuality: 95,
    minQuality: 10,
  });

  return result.base64;
}

// Export the class for more control
export { Base64ImageCompressor, CompressionOptions, CompressionResult };
