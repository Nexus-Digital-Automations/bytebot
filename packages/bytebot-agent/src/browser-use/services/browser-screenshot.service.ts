/**
 * Browser Screenshot Service
 *
 * Specialized service for capturing, processing, and managing screenshots
 * from browser automation tasks. Provides comprehensive screenshot functionality
 * with optimization, annotation, and comparison capabilities.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import {
  CaptureScreenshotDto,
  ScreenshotResponseDto,
  ScreenshotFormat,
  ScreenshotType,
} from '../dto/browser-screenshot.dto';
import { BrowserUseService } from '../browser-use.service';
import { BrowserSessionService } from './browser-session.service';

export interface ScreenshotMetadata {
  screenshotId: string;
  sessionId: string;
  taskId?: string;
  capturedAt: Date;
  url: string;
  title: string;
  dimensions: {
    width: number;
    height: number;
    viewportWidth: number;
    viewportHeight: number;
    devicePixelRatio: number;
  };
  fileInfo: {
    format: 'png' | 'jpeg' | 'webp';
    sizeBytes: number;
    path: string;
    hash: string;
  };
  options: {
    fullPage: boolean;
    quality?: number;
    clip?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    omitBackground: boolean;
  };
  annotations?: Array<{
    type: 'rectangle' | 'circle' | 'arrow' | 'text';
    coordinates: { x: number; y: number; width?: number; height?: number };
    style: { color: string; thickness: number; fill?: string };
    text?: string;
  }>;
  comparison?: {
    baseScreenshotId: string;
    differenceScore: number;
    differenceAreas: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      intensity: number;
    }>;
  };
}

@Injectable()
export class BrowserScreenshotService {
  private readonly logger = new Logger(BrowserScreenshotService.name);
  private readonly screenshotsCache = new Map<string, ScreenshotMetadata>();
  private readonly screenshotDirectory: string;
  private readonly maxCacheSize: number;
  private readonly compressionQuality: number;

  constructor(
    private readonly browserUseService: BrowserUseService,
    private readonly sessionService: BrowserSessionService,
    private readonly configService: ConfigService,
  ) {
    this.screenshotDirectory = this.configService.get<string>(
      'BROWSER_SCREENSHOT_DIR',
      path.join(process.cwd(), 'data', 'screenshots'),
    );
    this.maxCacheSize = this.configService.get<number>(
      'BROWSER_SCREENSHOT_CACHE_SIZE',
      1000,
    );
    this.compressionQuality = this.configService.get<number>(
      'BROWSER_SCREENSHOT_QUALITY',
      90,
    );

    this.initializeScreenshotDirectory();
  }

  /**
   * Capture a screenshot from browser session
   */
  async captureScreenshot(
    sessionId: string,
    captureDto: CaptureScreenshotDto,
    taskId?: string,
  ): Promise<ScreenshotResponseDto> {
    const screenshotId = this.generateScreenshotId();
    const timestamp = new Date();

    try {
      this.logger.debug(`Capturing screenshot for session: ${sessionId}`);

      // Validate session exists and is active
      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        return {
          id: screenshotId,
          data: '',
          format: ScreenshotFormat.PNG,
          type: ScreenshotType.FULLPAGE,
          sizeBytes: 0,
          dimensions: { width: 0, height: 0 },
          metadata: {
            capturedAt: timestamp,
            sessionId,
            url: 'unknown',
            title: 'Error',
            deviceScaleFactor: 1,
          },
          captureDurationMs: 0,
          success: false,
          timestamp,
          sessionId,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: `Browser session ${sessionId} not found`,
            timestamp,
          },
        };
      }

      // Get current page information
      const pageState = await this.browserUseService.getPageState({
        sessionId,
        includeScreenshot: false,
        includeDom: false,
      });

      if (!pageState.success) {
        return {
          id: screenshotId,
          data: '',
          format: ScreenshotFormat.PNG,
          type: ScreenshotType.FULLPAGE,
          sizeBytes: 0,
          dimensions: { width: 0, height: 0 },
          metadata: {
            capturedAt: timestamp,
            sessionId,
            url: 'unknown',
            title: 'Error',
            deviceScaleFactor: 1,
          },
          captureDurationMs: 0,
          success: false,
          timestamp,
          sessionId,
          error: {
            code: 'PAGE_STATE_ERROR',
            message: 'Could not retrieve page state for screenshot',
            timestamp,
          },
        };
      }

      // Capture screenshot using browser-use service
      const screenshotResult = await this.browserUseService.takeScreenshot({
        sessionId,
        fullPage: captureDto.fullPage ?? false,
        quality: captureDto.quality ?? this.compressionQuality,
        format: captureDto.format ?? 'png',
        clip: captureDto.clip,
        omitBackground: captureDto.omitBackground ?? false,
        delay: captureDto.delay,
        hideElements: captureDto.hideElements,
        scrollIntoView: captureDto.scrollIntoView,
      });

      if (!screenshotResult.success || !screenshotResult.screenshotData) {
        return {
          id: screenshotId,
          data: '',
          format: ScreenshotFormat.PNG,
          type: ScreenshotType.FULLPAGE,
          sizeBytes: 0,
          dimensions: { width: 0, height: 0 },
          metadata: {
            capturedAt: timestamp,
            sessionId,
            url: pageState.currentUrl ?? 'unknown',
            title: pageState.pageTitle ?? 'Error',
            deviceScaleFactor: 1,
          },
          captureDurationMs: 0,
          success: false,
          timestamp,
          sessionId,
          error: {
            code: 'CAPTURE_FAILED',
            message: screenshotResult.error ?? 'Screenshot capture failed',
            timestamp,
          },
        };
      }

      // Decode base64 screenshot data
      const screenshotBuffer = Buffer.from(
        screenshotResult.screenshotData,
        'base64',
      );

      // Calculate file hash
      const fileHash = createHash('sha256')
        .update(screenshotBuffer)
        .digest('hex');

      // Generate file path
      const fileName = `${screenshotId}.${captureDto.format ?? 'png'}`;
      const filePath = path.join(this.screenshotDirectory, fileName);

      // Save screenshot to disk
      await fs.writeFile(filePath, screenshotBuffer);

      // Create screenshot metadata
      const metadata: ScreenshotMetadata = {
        screenshotId,
        sessionId,
        taskId,
        capturedAt: timestamp,
        url: pageState.currentUrl ?? 'unknown',
        title: pageState.pageTitle ?? 'Untitled',
        dimensions: {
          width: screenshotResult.dimensions?.width ?? 1280,
          height: screenshotResult.dimensions?.height ?? 720,
          viewportWidth: screenshotResult.viewport?.width ?? 1280,
          viewportHeight: screenshotResult.viewport?.height ?? 720,
          devicePixelRatio: screenshotResult.devicePixelRatio ?? 1,
        },
        fileInfo: {
          format: (captureDto.format ?? 'png') as 'png' | 'jpeg' | 'webp',
          sizeBytes: screenshotBuffer.length,
          path: filePath,
          hash: fileHash,
        },
        options: {
          fullPage: captureDto.fullPage ?? false,
          quality: captureDto.quality,
          clip: captureDto.clip,
          omitBackground: captureDto.omitBackground ?? false,
        },
      };

      // Store in cache
      this.screenshotsCache.set(screenshotId, metadata);
      await this.manageCacheSize();

      // Apply annotations if requested
      if (captureDto.annotations && captureDto.annotations.length > 0) {
        await this.applyAnnotations(screenshotId, captureDto.annotations);
      }

      // Perform comparison if base screenshot provided
      let comparisonResult;
      if (captureDto.compareWith) {
        comparisonResult = await this.compareScreenshots(
          screenshotId,
          captureDto.compareWith,
        );
      }

      this.logger.log(`Screenshot captured successfully: ${screenshotId}`);

      return {
        id: screenshotId,
        data: screenshotResult.screenshotData,
        format: metadata.fileInfo.format as ScreenshotFormat,
        type: ScreenshotType.FULLPAGE,
        sizeBytes: metadata.fileInfo.sizeBytes,
        dimensions: {
          width: metadata.dimensions.width,
          height: metadata.dimensions.height,
        },
        metadata: {
          capturedAt: metadata.capturedAt,
          sessionId: metadata.sessionId,
          url: metadata.url,
          title: metadata.title,
          selector: captureDto.selector,
          quality: captureDto.quality,
          deviceScaleFactor: metadata.dimensions.devicePixelRatio,
        },
        filePath: captureDto.saveToDisk !== false ? filePath : undefined,
        captureDurationMs: 0, // Will be calculated in real implementation
        success: true,
        screenshotId,
        timestamp,
        sessionId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to capture screenshot: ${error.message}`,
        error.stack,
      );

      return {
        id: screenshotId,
        data: '',
        format: ScreenshotFormat.PNG,
        type: ScreenshotType.FULLPAGE,
        sizeBytes: 0,
        dimensions: { width: 0, height: 0 },
        metadata: {
          capturedAt: timestamp,
          sessionId,
          url: 'unknown',
          title: 'Error',
          deviceScaleFactor: 1,
        },
        captureDurationMs: 0,
        success: false,
        timestamp,
        sessionId,
        error: {
          code: 'CAPTURE_ERROR',
          message: error.message,
          details: { sessionId, options: captureDto },
          timestamp,
        },
      };
    }
  }

  /**
   * Retrieve screenshot with proper DTO format for controller endpoint
   */
  async getScreenshot(screenshotId: string): Promise<ScreenshotResponseDto> {
    try {
      const metadata = this.screenshotsCache.get(screenshotId);
      if (!metadata) {
        return {
          id: screenshotId,
          data: '',
          format: ScreenshotFormat.PNG,
          type: ScreenshotType.FULLPAGE,
          sizeBytes: 0,
          dimensions: { width: 0, height: 0 },
          metadata: {
            capturedAt: new Date(),
            sessionId: '',
            url: '',
            title: '',
            deviceScaleFactor: 1,
          },
          captureDurationMs: 0,
          success: false,
          error: {
            code: 'SCREENSHOT_NOT_FOUND',
            message: `Screenshot ${screenshotId} not found`,
          },
        };
      }

      let imageData = '';
      try {
        const buffer = await fs.readFile(metadata.fileInfo.path);
        imageData = buffer.toString('base64');
      } catch (error) {
        this.logger.error(
          `Failed to read screenshot file: ${metadata.fileInfo.path}`,
        );
        return {
          id: screenshotId,
          data: '',
          format: metadata.fileInfo.format as ScreenshotFormat,
          type: ScreenshotType.FULLPAGE,
          sizeBytes: metadata.fileInfo.sizeBytes,
          dimensions: {
            width: metadata.dimensions.width,
            height: metadata.dimensions.height,
          },
          metadata: {
            capturedAt: metadata.capturedAt,
            sessionId: metadata.sessionId,
            url: metadata.url,
            title: metadata.title,
            deviceScaleFactor: metadata.dimensions.devicePixelRatio,
          },
          filePath: metadata.fileInfo.path,
          captureDurationMs: 0,
          success: false,
          error: {
            code: 'FILE_READ_ERROR',
            message: 'Could not read screenshot file',
          },
        };
      }

      return {
        id: screenshotId,
        data: imageData,
        format: metadata.fileInfo.format as ScreenshotFormat,
        type: ScreenshotType.FULLPAGE,
        sizeBytes: metadata.fileInfo.sizeBytes,
        dimensions: {
          width: metadata.dimensions.width,
          height: metadata.dimensions.height,
        },
        metadata: {
          capturedAt: metadata.capturedAt,
          sessionId: metadata.sessionId,
          url: metadata.url,
          title: metadata.title,
          quality: metadata.options.quality,
          deviceScaleFactor: metadata.dimensions.devicePixelRatio,
        },
        filePath: metadata.fileInfo.path,
        captureDurationMs: 0, // Could be calculated from metadata if needed
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error retrieving screenshot: ${error.message}`);
      return {
        id: screenshotId,
        data: '',
        format: ScreenshotFormat.PNG,
        type: ScreenshotType.FULLPAGE,
        sizeBytes: 0,
        dimensions: { width: 0, height: 0 },
        metadata: {
          capturedAt: new Date(),
          sessionId: '',
          url: '',
          title: '',
          deviceScaleFactor: 1,
        },
        captureDurationMs: 0,
        success: false,
        error: {
          code: 'RETRIEVAL_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * Legacy method for internal use - retrieve screenshot metadata and optionally the image data
   */
  async getScreenshotInternal(
    screenshotId: string,
    options?: {
      includeImageData?: boolean;
      format?: 'base64' | 'buffer';
    },
  ): Promise<{
    success: boolean;
    metadata?: ScreenshotMetadata;
    imageData?: string | Buffer;
    error?: { code: string; message: string };
  }> {
    try {
      const metadata = this.screenshotsCache.get(screenshotId);
      if (!metadata) {
        return {
          success: false,
          error: {
            code: 'SCREENSHOT_NOT_FOUND',
            message: `Screenshot ${screenshotId} not found`,
          },
        };
      }

      let imageData: string | Buffer | undefined;

      if (options?.includeImageData) {
        try {
          const buffer = await fs.readFile(metadata.fileInfo.path);

          if (options.format === 'buffer') {
            imageData = buffer;
          } else {
            imageData = buffer.toString('base64');
          }
        } catch (error) {
          this.logger.error(
            `Failed to read screenshot file: ${metadata.fileInfo.path}`,
          );
          return {
            success: false,
            error: {
              code: 'FILE_READ_ERROR',
              message: 'Could not read screenshot file',
            },
          };
        }
      }

      return {
        success: true,
        metadata,
        imageData,
      };
    } catch (error) {
      this.logger.error(`Error retrieving screenshot: ${error.message}`);
      return {
        success: false,
        error: {
          code: 'RETRIEVAL_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * List screenshots with filtering options
   */
  async listScreenshots(filters?: {
    sessionId?: string;
    taskId?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): Promise<ScreenshotMetadata[]> {
    let screenshots = Array.from(this.screenshotsCache.values());

    if (filters) {
      screenshots = screenshots.filter((screenshot) => {
        if (filters.sessionId && screenshot.sessionId !== filters.sessionId) {
          return false;
        }
        if (filters.taskId && screenshot.taskId !== filters.taskId) {
          return false;
        }
        if (filters.fromDate && screenshot.capturedAt < filters.fromDate) {
          return false;
        }
        if (filters.toDate && screenshot.capturedAt > filters.toDate) {
          return false;
        }
        return true;
      });
    }

    // Sort by capture date (newest first)
    screenshots.sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());

    if (filters?.limit) {
      screenshots = screenshots.slice(0, filters.limit);
    }

    return screenshots;
  }

  /**
   * Compare two screenshots and identify differences
   */
  async compareScreenshots(
    screenshotId1: string,
    screenshotId2: string,
  ): Promise<{
    differenceScore: number;
    differenceAreas: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      intensity: number;
    }>;
    comparisonScreenshotId?: string;
  }> {
    try {
      // This is a simplified comparison - in production, you'd use a library like Pixelmatch
      const screenshot1 = await this.getScreenshotInternal(screenshotId1, {
        includeImageData: true,
        format: 'buffer',
      });

      const screenshot2 = await this.getScreenshotInternal(screenshotId2, {
        includeImageData: true,
        format: 'buffer',
      });

      if (!screenshot1.success || !screenshot2.success) {
        throw new Error('Could not load screenshots for comparison');
      }

      // Simplified comparison - calculate hash difference
      const hash1 = createHash('sha256')
        .update(screenshot1.imageData as Buffer)
        .digest('hex');
      const hash2 = createHash('sha256')
        .update(screenshot2.imageData as Buffer)
        .digest('hex');

      const differenceScore = hash1 === hash2 ? 0 : 0.5; // Simplified scoring

      // In a real implementation, you would use image processing libraries
      // to detect actual pixel differences and create difference areas
      const differenceAreas: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        intensity: number;
      }> = [];

      this.logger.debug(
        `Screenshot comparison completed: ${screenshotId1} vs ${screenshotId2} (score: ${differenceScore})`,
      );

      return {
        differenceScore,
        differenceAreas,
      };
    } catch (error) {
      this.logger.error(`Screenshot comparison failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply annotations to a screenshot
   */
  private async applyAnnotations(
    screenshotId: string,
    annotations: Array<{
      type: 'rectangle' | 'circle' | 'arrow' | 'text';
      coordinates: { x: number; y: number; width?: number; height?: number };
      style: { color: string; thickness: number; fill?: string };
      text?: string;
    }>,
  ): Promise<void> {
    const metadata = this.screenshotsCache.get(screenshotId);
    if (!metadata) {
      throw new Error(`Screenshot ${screenshotId} not found`);
    }

    // Store annotations in metadata
    metadata.annotations = annotations.map((annotation) => ({
      type: annotation.type,
      coordinates: annotation.coordinates,
      style: annotation.style,
      text: annotation.text,
    }));

    // In a production implementation, you would use an image processing library
    // to actually draw the annotations on the image file
    this.logger.debug(
      `Applied ${annotations.length} annotations to screenshot: ${screenshotId}`,
    );
  }

  /**
   * Delete a screenshot and its associated files
   */
  async deleteScreenshot(screenshotId: string): Promise<boolean> {
    try {
      const metadata = this.screenshotsCache.get(screenshotId);
      if (!metadata) {
        return false;
      }

      // Delete file from disk
      try {
        await fs.unlink(metadata.fileInfo.path);
      } catch (error) {
        this.logger.warn(
          `Could not delete screenshot file: ${metadata.fileInfo.path}`,
        );
      }

      // Remove from cache
      this.screenshotsCache.delete(screenshotId);

      this.logger.debug(`Screenshot deleted: ${screenshotId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete screenshot: ${error.message}`);
      return false;
    }
  }

  /**
   * Get screenshot service statistics
   */
  async getStatistics(): Promise<{
    totalScreenshots: number;
    totalSizeBytes: number;
    averageSizeBytes: number;
    formatDistribution: Record<string, number>;
    oldestScreenshot?: Date;
    newestScreenshot?: Date;
    diskUsage: {
      totalSizeBytes: number;
      totalFiles: number;
    };
  }> {
    const screenshots = Array.from(this.screenshotsCache.values());

    const totalSizeBytes = screenshots.reduce(
      (sum, s) => sum + s.fileInfo.sizeBytes,
      0,
    );
    const averageSizeBytes =
      screenshots.length > 0 ? totalSizeBytes / screenshots.length : 0;

    const formatDistribution: Record<string, number> = {};
    screenshots.forEach((s) => {
      formatDistribution[s.fileInfo.format] =
        (formatDistribution[s.fileInfo.format] || 0) + 1;
    });

    const dates = screenshots.map((s) => s.capturedAt).sort();
    const oldestScreenshot = dates.length > 0 ? dates[0] : undefined;
    const newestScreenshot =
      dates.length > 0 ? dates[dates.length - 1] : undefined;

    // Calculate disk usage
    let diskTotalSize = 0;
    let diskTotalFiles = 0;

    try {
      const files = await fs.readdir(this.screenshotDirectory);
      diskTotalFiles = files.length;

      for (const file of files) {
        try {
          const stats = await fs.stat(
            path.join(this.screenshotDirectory, file),
          );
          diskTotalSize += stats.size;
        } catch (error) {
          // Skip files that can't be read
        }
      }
    } catch (error) {
      this.logger.warn(`Could not read screenshot directory: ${error.message}`);
    }

    return {
      totalScreenshots: screenshots.length,
      totalSizeBytes,
      averageSizeBytes: Math.round(averageSizeBytes),
      formatDistribution,
      oldestScreenshot,
      newestScreenshot,
      diskUsage: {
        totalSizeBytes: diskTotalSize,
        totalFiles: diskTotalFiles,
      },
    };
  }

  /**
   * Private helper methods
   */
  private generateScreenshotId(): string {
    return `screenshot_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async initializeScreenshotDirectory(): Promise<void> {
    try {
      await fs.access(this.screenshotDirectory);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(this.screenshotDirectory, { recursive: true });
      this.logger.log(
        `Created screenshots directory: ${this.screenshotDirectory}`,
      );
    }
  }

  private async manageCacheSize(): Promise<void> {
    if (this.screenshotsCache.size <= this.maxCacheSize) {
      return;
    }

    // Remove oldest screenshots from cache (not from disk)
    const screenshots = Array.from(this.screenshotsCache.values());
    screenshots.sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());

    const toRemove = screenshots.slice(
      0,
      this.screenshotsCache.size - this.maxCacheSize,
    );
    toRemove.forEach((screenshot) => {
      this.screenshotsCache.delete(screenshot.screenshotId);
    });

    this.logger.debug(`Removed ${toRemove.length} screenshots from cache`);
  }

  /**
   * Cleanup on service destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Screenshot service cleanup completed');
  }
}
