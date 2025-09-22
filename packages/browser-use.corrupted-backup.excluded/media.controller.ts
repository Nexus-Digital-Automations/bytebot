import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';import {ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';import { MediaService } from './media.service';import {ScreenshotCaptureDto,
  BatchScreenshotCaptureDto,
  ScreenshotResultDto,
  BatchScreenshotResultDto,
  ScreenshotFormat,
  ScreenshotType,
} from './dto/screenshot.dto';/*** Media Controller
 *
 * Specialized REST API endpoints for media capture and management.
 * Focuses on screenshot handling, image processing, and media storage operations.
 *
 * Key Features:
 * - Advanced screenshot capture with multiple formats (PNG, JPEG, WebP)
 * - Element-specific and area-based screenshot targeting
 * - Batch screenshot operations for efficiency
 * - Media storage and retrieval with compression
 * - Image annotation and markup capabilities
 * - Temporary file cleanup and optimization
 * - Media metadata management
 *
 * Security Features:
 * - File size validation and limits
 * - Format validation and sanitization
 * - Secure temporary file handling
 * - Rate limiting for resource protection
 *
 * Performance Features:
 * - Asynchronous processing for large batches
 * - Image compression and optimization
 * - Efficient memory management
 * - Concurrent screenshot capture support
 */
@ApiTags('Media Management')@Controller('browser/media')export class MediaController {private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}

  /**
   * Capture full page screenshot
   *
   * Captures a screenshot of the entire page content, including areas
   * outside the current viewport. Supports various formats and quality settings.
   */
  @Post('screenshot/full-page')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Capture full page screenshot',description: 'Capture a screenshot of the entire page including content below the fold',})@ApiBody({ type: ScreenshotCaptureDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Full page screenshot captured successfully',type: ScreenshotResultDto,})
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid capture configuration',})@ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Browser session not found',
  })
  async captureFullPageScreenshot(
    @Body() captureDto: ScreenshotCaptureDto,
  ): Promise<ScreenshotResultDto> {
    this.logger.log(`Capturing full page screenshot for session: ${captureDto.sessionId}`, {sessionId: captureDto.sessionId,format: captureDto.format,
      quality: captureDto.quality,
    });

    try {
      // Override type to ensure full page capture
      const fullPageConfig = {
        ...captureDto,
        type: ScreenshotType.FULL_PAGE,
      };

      const result = await this.mediaService.captureScreenshot(fullPageConfig);

      this.logger.log(`Full page screenshot captured: ${result.screenshotId}`, {screenshotId: result.screenshotId,dimensions: result.dimensions,
        fileSize: result.fileSizeBytes,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Full page screenshot failed for session: ${captureDto.sessionId}`,
        error.stack,
      );
      throw new InternalServerErrorException({
        message: 'Full page screenshot capture failed',sessionId: captureDto.sessionId,});
    }
  }

  /**
   * Capture element-specific screenshot
   *
   * Captures a screenshot of a specific DOM element identified by CSS selector.
   * Includes options for padding, scroll positioning, and element visibility waiting.
   */
  @Post('screenshot/element')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Capture element screenshot',description: 'Capture a screenshot of a specific DOM element using CSS selector',})@ApiBody({ type: ScreenshotCaptureDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Element screenshot captured successfully',type: ScreenshotResultDto,})
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid element selector or configuration',})@ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Element or session not found',})async captureElementScreenshot(
    @Body() captureDto: ScreenshotCaptureDto,
  ): Promise<ScreenshotResultDto> {
    if (!captureDto.elementSelector?.selector) {
      throw new BadRequestException('Element selector is required for element screenshots');
    }

    this.logger.log(`Capturing element screenshot for session: ${captureDto.sessionId}`, {sessionId: captureDto.sessionId,selector: captureDto.elementSelector.selector,
      format: captureDto.format,
    });

    try {
      // Override type to ensure element capture
      const elementConfig = {
        ...captureDto,
        type: ScreenshotType.ELEMENT,
      };

      const result = await this.mediaService.captureScreenshot(elementConfig);

      this.logger.log(`Element screenshot captured: ${result.screenshotId}`, {screenshotId: result.screenshotId,selector: captureDto.elementSelector.selector,
        elementBounds: result.elementBounds,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Element screenshot failed for session: ${captureDto.sessionId}`,
        error.stack,
      );
      throw new InternalServerErrorException({
        message: 'Element screenshot capture failed',sessionId: captureDto.sessionId,selector: captureDto.elementSelector?.selector,
      });
    }
  }

  /**
   * Capture custom area screenshot
   *
   * Captures a screenshot of a specific rectangular area defined by coordinates.
   * Useful for capturing specific regions without relying on DOM elements.
   */
  @Post('screenshot/area')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Capture area screenshot',description: 'Capture a screenshot of a specific rectangular area by coordinates',})@ApiBody({ type: ScreenshotCaptureDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Area screenshot captured successfully',type: ScreenshotResultDto,})
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid area coordinates',})async captureAreaScreenshot(
    @Body() captureDto: ScreenshotCaptureDto,
  ): Promise<ScreenshotResultDto> {
    if (!captureDto.captureArea) {
      throw new BadRequestException('Capture area coordinates are required');}const { x, y, width, height } = captureDto.captureArea;
    if (x < 0 || y < 0 || width <= 0 || height <= 0) {
      throw new BadRequestException('Invalid area coordinates');
    }

    this.logger.log(`Capturing area screenshot for session: ${captureDto.sessionId}`, {sessionId: captureDto.sessionId,area: captureDto.captureArea,
      format: captureDto.format,
    });

    try {
      const result = await this.mediaService.captureAreaScreenshot(captureDto);

      this.logger.log(`Area screenshot captured: ${result.screenshotId}`, {screenshotId: result.screenshotId,area: captureDto.captureArea,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Area screenshot failed for session: ${captureDto.sessionId}`,
        error.stack,
      );
      throw new InternalServerErrorException({
        message: 'Area screenshot capture failed',sessionId: captureDto.sessionId,area: captureDto.captureArea,
      });
    }
  }

  /**
   * Batch screenshot capture
   *
   * Captures multiple screenshots with different configurations in a single operation.
   * Supports parallel processing and error handling for individual failures.
   */
  @Post('screenshot/batch')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Batch screenshot capture',description: 'Capture multiple screenshots with different configurations',})@ApiBody({ type: BatchScreenshotCaptureDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch screenshots captured',
    type: BatchScreenshotResultDto,
  })
  async batchCaptureScreenshots(
    @Body() batchDto: BatchScreenshotCaptureDto,
  ): Promise<BatchScreenshotResultDto> {
    this.logger.log(`Batch screenshot capture for session: ${batchDto.sessionId}`, {sessionId: batchDto.sessionId,screenshotCount: batchDto.screenshots.length,
      intervalMs: batchDto.intervalMs,
    });

    try {
      const result = await this.mediaService.batchCaptureScreenshots(batchDto);

      this.logger.log(`Batch screenshots completed: ${result.batchId}`, {batchId: result.batchId,totalRequested: result.totalRequested,
        successful: result.successfulCaptures,
        failed: result.failedCaptures,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Batch screenshot capture failed for session: ${batchDto.sessionId}`,
        error.stack,
      );
      throw new InternalServerErrorException({
        message: 'Batch screenshot capture failed',sessionId: batchDto.sessionId,});
    }
  }

  /**
   * Retrieve stored screenshot
   *
   * Retrieves a previously captured screenshot by its unique identifier.
   * Returns the image data along with metadata.
   */
  @Get('screenshot/:screenshotId')@ApiOperation({summary: 'Retrieve screenshot',description: 'Retrieve a previously captured screenshot by ID',})@ApiParam({
    name: 'screenshotId',description: 'Unique screenshot identifier',example: 'screenshot_xyz789',})@ApiResponse({
    status: HttpStatus.OK,
    description: 'Screenshot retrieved successfully',type: ScreenshotResultDto,})
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Screenshot not found',})async getScreenshot(
    @Param('screenshotId') screenshotId: string,
  ): Promise<ScreenshotResultDto> {
    this.logger.log(`Retrieving screenshot: ${screenshotId}`);try {const screenshot = await this.mediaService.getStoredScreenshot(screenshotId);

      if (!screenshot) {
        throw new NotFoundException(`Screenshot not found: ${screenshotId}`);}return screenshot;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to retrieve screenshot: ${screenshotId}`, error.stack);
      throw new InternalServerErrorException({
        message: 'Failed to retrieve screenshot',screenshotId,});
    }
  }

  /**
   * List stored screenshots
   *
   * Lists all stored screenshots with optional filtering by session or date range.
   * Supports pagination for large screenshot collections.
   */
  @Get('screenshots')@ApiOperation({summary: 'List screenshots',description: 'List stored screenshots with optional filtering',})@ApiQuery({
    name: 'sessionId',required: false,description: 'Filter by session ID',})@ApiQuery({
    name: 'format',required: false,enum: ScreenshotFormat,
    description: 'Filter by image format',})@ApiQuery({
    name: 'limit',required: false,type: Number,
    description: 'Maximum number of results',})@ApiQuery({
    name: 'offset',required: false,type: Number,
    description: 'Number of results to skip',})@ApiResponse({
    status: HttpStatus.OK,
    description: 'Screenshots listed successfully',schema: {type: 'object',properties: {screenshots: {
          type: 'array',items: { $ref: '#/components/schemas/ScreenshotResultDto' },},total: { type: 'number' },limit: { type: 'number' },offset: { type: 'number' },},},
  })
  async listScreenshots(
    @Query('sessionId') sessionId?: string,@Query('format') format?: ScreenshotFormat,@Query('limit') limit?: number,@Query('offset') offset?: number,) {this.logger.log('Listing screenshots', {sessionId,format,
      limit,
      offset,
    });

    try {
      const result = await this.mediaService.listStoredScreenshots({
        sessionId,
        format,
        limit: limit ?? 50,
        offset: offset ?? 0,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to list screenshots', error.stack);throw new InternalServerErrorException({message: 'Failed to list screenshots',});}
  }

  /**
   * Delete stored screenshot
   *
   * Deletes a stored screenshot and its associated files from the system.
   * This operation is irreversible.
   */
  @Delete('screenshot/:screenshotId')@HttpCode(HttpStatus.NO_CONTENT)@ApiOperation({
    summary: 'Delete screenshot',description: 'Delete a stored screenshot and its files',})@ApiParam({
    name: 'screenshotId',description: 'Unique screenshot identifier',})@ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Screenshot deleted successfully',})@ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Screenshot not found',})async deleteScreenshot(@Param('screenshotId') screenshotId: string): Promise<void> {
    this.logger.log(`Deleting screenshot: ${screenshotId}`);try {const deleted = await this.mediaService.deleteStoredScreenshot(screenshotId);

      if (!deleted) {
        throw new NotFoundException(`Screenshot not found: ${screenshotId}`);}this.logger.log(`Screenshot deleted: ${screenshotId}`);} catch (error) {if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to delete screenshot: ${screenshotId}`, error.stack);
      throw new InternalServerErrorException({
        message: 'Failed to delete screenshot',screenshotId,});
    }
  }

  /**
   * Cleanup temporary files
   *
   * Removes temporary screenshot files older than the specified age.
   * Helps maintain storage efficiency and system performance.
   */
  @Post('cleanup')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Cleanup temporary files',description: 'Remove old temporary screenshot files',})@ApiQuery({
    name: 'maxAgeHours',required: false,type: Number,
    description: 'Maximum age in hours for temporary files',})@ApiResponse({
    status: HttpStatus.OK,
    description: 'Cleanup completed successfully',schema: {type: 'object',properties: {filesRemoved: { type: 'number' },bytesFreed: { type: 'number' },cleanupDurationMs: { type: 'number' },},},
  })
  async cleanupTempFiles(@Query('maxAgeHours') maxAgeHours?: number) {
    const maxAge = maxAgeHours ?? 24; // Default to 24 hours

    this.logger.log(`Starting temporary file cleanup`, { maxAgeHours: maxAge });

    try {
      const result = await this.mediaService.cleanupTempFiles(maxAge);

      this.logger.log('Temporary file cleanup completed', {filesRemoved: result.filesRemoved,bytesFreed: result.bytesFreed,
        duration: result.cleanupDurationMs,
      });

      return result;
    } catch (error) {
      this.logger.error('Temporary file cleanup failed', error.stack);throw new InternalServerErrorException({message: 'Temporary file cleanup failed',});}
  }

  /**
   * Get media storage statistics
   *
   * Returns information about stored media files, storage usage,
   * and system performance metrics.
   */
  @Get('stats')@ApiOperation({summary: 'Get media statistics',description: 'Retrieve media storage and performance statistics',})@ApiResponse({
    status: HttpStatus.OK,
    description: 'Media statistics retrieved successfully',schema: {type: 'object',properties: {totalScreenshots: { type: 'number' },totalStorageBytes: { type: 'number' },averageFileSize: { type: 'number' },formatDistribution: {type: 'object',additionalProperties: { type: 'number' },},averageCaptureTime: { type: 'number' },lastCleanup: { type: 'string', format: 'date-time' },},},
  })
  async getMediaStats() {
    this.logger.log('Retrieving media statistics');try {const stats = await this.mediaService.getMediaStatistics();
      return stats;
    } catch (error) {
      this.logger.error('Failed to retrieve media statistics', error.stack);throw new InternalServerErrorException({message: 'Failed to retrieve media statistics',});}
  }

  /**
   * Optimize stored images
   *
   * Applies compression and optimization to stored images to reduce storage usage.
   * Can be run on specific screenshots or in batch mode.
   */
  @Post('optimize')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Optimize stored images',description: 'Apply compression and optimization to stored images',})@ApiQuery({
    name: 'screenshotId',required: false,description: 'Optimize specific screenshot (if not provided, optimizes all)',})@ApiQuery({
    name: 'quality',required: false,type: Number,
    description: 'Target quality level (0-100)',})@ApiResponse({
    status: HttpStatus.OK,
    description: 'Image optimization completed',schema: {type: 'object',properties: {optimizedCount: { type: 'number' },bytesFreed: { type: 'number' },optimizationDurationMs: { type: 'number' },},},
  })
  async optimizeImages(
    @Query('screenshotId') screenshotId?: string,@Query('quality') quality?: number,) {this.logger.log('Starting image optimization', { screenshotId, quality });try {const result = await this.mediaService.optimizeStoredImages({
        screenshotId,
        targetQuality: quality ?? 85,
      });

      this.logger.log('Image optimization completed', {optimizedCount: result.optimizedCount,bytesFreed: result.bytesFreed,
        duration: result.optimizationDurationMs,
      });

      return result;
    } catch (error) {
      this.logger.error('Image optimization failed', error.stack);throw new InternalServerErrorException({message: 'Image optimization failed',
      });
    }
  }
}