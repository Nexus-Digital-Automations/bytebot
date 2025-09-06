/**
 * Compression Interceptor - Response Compression for Performance
 *
 * Provides intelligent response compression with support for multiple
 * compression algorithms (gzip, brotli, deflate). Automatically selects
 * optimal compression based on content type, size, and client support.
 *
 * Features:
 * - Multi-algorithm support (gzip, brotli, deflate)
 * - Content-type specific compression rules
 * - Minimum size thresholds for efficiency
 * - Client capability detection
 * - Compression ratio metrics
 * - Performance impact monitoring
 * - Configurable compression levels
 *
 * @author Claude Code - Performance Optimization Specialist
 * @version 1.0.0
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request, Response } from 'express';
import { gzip, brotliCompress, deflate } from 'zlib';
import { promisify } from 'util';
import { MetricsService } from '../../metrics/metrics.service';

// Promisify compression functions
const gzipAsync = promisify(gzip);
const brotliCompressAsync = promisify(brotliCompress);
const deflateAsync = promisify(deflate);

/**
 * Compression algorithm types
 */
type CompressionAlgorithm = 'gzip' | 'brotli' | 'deflate' | 'identity';

/**
 * Compression configuration
 */
interface CompressionConfig {
  minSize: number; // Minimum response size to compress (bytes)
  level: number; // Compression level (1-9 for gzip/deflate, 1-11 for brotli)
  threshold: number; // Minimum compression ratio to use compression
  compressibleTypes: Set<string>; // Content types that should be compressed
  maxSize: number; // Maximum response size to compress (bytes)
}

/**
 * Compression statistics
 */
interface CompressionStats {
  totalRequests: number;
  compressedRequests: number;
  compressionRatio: number;
  bytesOriginal: number;
  bytesCompressed: number;
  averageCompressionTime: number;
  algorithmUsage: Record<CompressionAlgorithm, number>;
}

/**
 * Compression result for a single response
 */
interface CompressionResult {
  algorithm: CompressionAlgorithm;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  compressionTime: number;
  applied: boolean;
}

/**
 * Response compression interceptor
 */
@Injectable()
export class CompressionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CompressionInterceptor.name);
  private readonly stats: CompressionStats = {
    totalRequests: 0,
    compressedRequests: 0,
    compressionRatio: 0,
    bytesOriginal: 0,
    bytesCompressed: 0,
    averageCompressionTime: 0,
    algorithmUsage: {
      gzip: 0,
      brotli: 0,
      deflate: 0,
      identity: 0,
    },
  };

  // Compression configuration (configurable via environment variables)
  private readonly config: CompressionConfig = {
    minSize: parseInt(process.env.COMPRESSION_MIN_SIZE || '1024', 10), // 1KB
    level: parseInt(process.env.COMPRESSION_LEVEL || '6', 10), // Balanced compression
    threshold: parseFloat(process.env.COMPRESSION_THRESHOLD || '0.8'), // 20% minimum reduction
    maxSize: parseInt(process.env.COMPRESSION_MAX_SIZE || '10485760', 10), // 10MB
    compressibleTypes: new Set([
      'application/json',
      'application/javascript',
      'application/xml',
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'text/xml',
      'image/svg+xml',
    ]),
  };

  constructor(private readonly metricsService?: MetricsService) {
    this.logger.log('Compression Interceptor initialized');
    this.logger.log(
      `Config: minSize=${this.config.minSize}b, level=${this.config.level}, threshold=${this.config.threshold}`,
    );

    // Start periodic stats reporting
    this.startPeriodicReporting();
  }

  /**
   * Intercept HTTP responses to apply compression
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map(async (data) => {
        // Skip compression if already handled by middleware
        if (response.get('Content-Encoding')) {
          this.updateStats({
            algorithm: 'identity',
            originalSize: 0,
            compressedSize: 0,
            ratio: 1,
            compressionTime: 0,
            applied: false,
          });
          return data;
        }

        // Compress response if applicable
        const compressionResult = await this.compressResponse(
          data,
          request,
          response,
        );

        if (
          compressionResult.applied &&
          compressionResult.algorithm !== 'identity'
        ) {
          // Set compression headers
          response.set('Content-Encoding', compressionResult.algorithm);
          response.set('Vary', 'Accept-Encoding');

          this.logger.debug(
            `Response compressed: ${compressionResult.algorithm}, ` +
              `${compressionResult.originalSize}b → ${compressionResult.compressedSize}b ` +
              `(${(compressionResult.ratio * 100).toFixed(1)}% reduction)`,
          );
        }

        this.updateStats(compressionResult);
        return data;
      }),
    );
  }

  /**
   * Compress response data with optimal algorithm selection
   */
  private async compressResponse(
    data: any,
    request: Request,
    response: Response,
  ): Promise<CompressionResult> {
    const operationId =
      (request as any).operationId || `compress_${Date.now()}`;
    const startTime = Date.now();

    try {
      // Convert data to buffer for processing
      const responseBuffer = this.dataToBuffer(data);
      const originalSize = responseBuffer.length;

      // Check if compression should be applied
      if (!this.shouldCompress(responseBuffer, response)) {
        return {
          algorithm: 'identity',
          originalSize,
          compressedSize: originalSize,
          ratio: 1,
          compressionTime: 0,
          applied: false,
        };
      }

      // Determine best compression algorithm
      const algorithm = this.selectCompressionAlgorithm(request);

      // Apply compression
      const compressedData = await this.applyCompression(
        responseBuffer,
        algorithm,
      );
      const compressedSize = compressedData.length;
      const ratio = compressedSize / originalSize;

      // Check if compression is beneficial
      if (ratio > this.config.threshold) {
        // Compression not beneficial enough
        return {
          algorithm: 'identity',
          originalSize,
          compressedSize: originalSize,
          ratio: 1,
          compressionTime: Date.now() - startTime,
          applied: false,
        };
      }

      // Set compressed data as response
      response.send(compressedData);

      return {
        algorithm,
        originalSize,
        compressedSize,
        ratio,
        compressionTime: Date.now() - startTime,
        applied: true,
      };
    } catch (error) {
      const compressionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `[${operationId}] Compression failed: ${errorMessage} (${compressionTime}ms)`,
      );

      // Return uncompressed data on error
      return {
        algorithm: 'identity',
        originalSize: this.dataToBuffer(data).length,
        compressedSize: this.dataToBuffer(data).length,
        ratio: 1,
        compressionTime,
        applied: false,
      };
    }
  }

  /**
   * Determine if response should be compressed
   */
  private shouldCompress(data: Buffer, response: Response): boolean {
    // Check minimum size
    if (data.length < this.config.minSize) {
      return false;
    }

    // Check maximum size
    if (data.length > this.config.maxSize) {
      return false;
    }

    // Check content type
    const contentType = response.get('Content-Type') || '';
    const baseType = contentType.split(';')[0].toLowerCase();

    return this.config.compressibleTypes.has(baseType);
  }

  /**
   * Select optimal compression algorithm based on client support
   */
  private selectCompressionAlgorithm(request: Request): CompressionAlgorithm {
    const acceptEncoding = request.get('Accept-Encoding') || '';

    // Priority order: brotli (best compression) → gzip (widely supported) → deflate
    if (acceptEncoding.includes('br')) {
      return 'brotli';
    } else if (acceptEncoding.includes('gzip')) {
      return 'gzip';
    } else if (acceptEncoding.includes('deflate')) {
      return 'deflate';
    } else {
      return 'identity';
    }
  }

  /**
   * Apply compression using specified algorithm
   */
  private async applyCompression(
    data: Buffer,
    algorithm: CompressionAlgorithm,
  ): Promise<Buffer> {
    switch (algorithm) {
      case 'brotli':
        return await brotliCompressAsync(data, {
          params: {
            [require('zlib').constants.BROTLI_PARAM_QUALITY]: this.config.level,
          },
        });

      case 'gzip':
        return await gzipAsync(data, { level: this.config.level });

      case 'deflate':
        return await deflateAsync(data, { level: this.config.level });

      default:
        return data;
    }
  }

  /**
   * Convert response data to buffer
   */
  private dataToBuffer(data: any): Buffer {
    if (Buffer.isBuffer(data)) {
      return data;
    }

    if (typeof data === 'string') {
      return Buffer.from(data, 'utf8');
    }

    if (typeof data === 'object') {
      return Buffer.from(JSON.stringify(data), 'utf8');
    }

    return Buffer.from(String(data), 'utf8');
  }

  /**
   * Update compression statistics
   */
  private updateStats(result: CompressionResult): void {
    try {
      this.stats.totalRequests++;

      if (result.applied && result.algorithm !== 'identity') {
        this.stats.compressedRequests++;
        this.stats.bytesOriginal += result.originalSize;
        this.stats.bytesCompressed += result.compressedSize;

        // Update average compression time
        this.stats.averageCompressionTime =
          (this.stats.averageCompressionTime *
            (this.stats.compressedRequests - 1) +
            result.compressionTime) /
          this.stats.compressedRequests;
      } else {
        this.stats.bytesOriginal += result.originalSize;
        this.stats.bytesCompressed += result.originalSize; // No compression applied
      }

      // Update algorithm usage
      this.stats.algorithmUsage[result.algorithm]++;

      // Calculate overall compression ratio
      if (this.stats.bytesOriginal > 0) {
        this.stats.compressionRatio =
          (this.stats.bytesOriginal - this.stats.bytesCompressed) /
          this.stats.bytesOriginal;
      }

      // Record metrics
      if (this.metricsService) {
        this.metricsService.recordCompressionMetrics?.(
          result.algorithm,
          result.originalSize,
          result.compressedSize,
          result.compressionTime,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update compression statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get current compression statistics
   */
  getStats(): CompressionStats {
    return {
      ...this.stats,
      algorithmUsage: { ...this.stats.algorithmUsage },
    };
  }

  /**
   * Clear compression statistics
   */
  clearStats(): void {
    Object.assign(this.stats, {
      totalRequests: 0,
      compressedRequests: 0,
      compressionRatio: 0,
      bytesOriginal: 0,
      bytesCompressed: 0,
      averageCompressionTime: 0,
      algorithmUsage: {
        gzip: 0,
        brotli: 0,
        deflate: 0,
        identity: 0,
      },
    });

    this.logger.log('Compression statistics cleared');
  }

  /**
   * Start periodic statistics reporting
   */
  private startPeriodicReporting(): void {
    // Report compression stats every 10 minutes
    setInterval(() => {
      if (this.stats.totalRequests > 0) {
        this.logger.log('Compression Statistics Summary:', {
          totalRequests: this.stats.totalRequests,
          compressedRequests: this.stats.compressedRequests,
          compressionRate: `${((this.stats.compressedRequests / this.stats.totalRequests) * 100).toFixed(1)}%`,
          overallCompressionRatio: `${(this.stats.compressionRatio * 100).toFixed(1)}%`,
          bytesSaved: `${((this.stats.bytesOriginal - this.stats.bytesCompressed) / 1024 / 1024).toFixed(2)}MB`,
          averageCompressionTime: `${this.stats.averageCompressionTime.toFixed(2)}ms`,
          algorithmUsage: this.stats.algorithmUsage,
        });
      }
    }, 600000); // 10 minutes
  }
}
