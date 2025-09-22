import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AssetProcessor, ProcessingOptions, ProcessingResult } from '../interfaces/processor.interface';

/**
 * Image Processing Service using Sharp
 * Handles image transformation, optimization, and thumbnail generation
 */
@Injectable()
export class ImageProcessorService implements AssetProcessor {
  private readonly logger = new Logger(ImageProcessorService.name);

  private readonly supportedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/tiff',
    'image/bmp',
  ];

  canProcess(mimeType: string): boolean {
    return this.supportedMimeTypes.includes(mimeType);
  }

  async process(inputPath: string, outputPath: string, options: ProcessingOptions = {}): Promise<ProcessingResult> {
    const startTime = Date.now();
    this.logger.log(`Starting image processing: ${inputPath} -> ${outputPath}`);

    try {
      // Validate input file exists
      await fs.access(inputPath);

      // Create output directory if it doesn't exist
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      let sharpInstance = sharp(inputPath);

      // Apply transformations
      if (options.resize) {
        sharpInstance = sharpInstance.resize({
          width: options.resize.width,
          height: options.resize.height,
          fit: options.resize.fit || 'inside',
          withoutEnlargement: true,
        });
      }

      if (options.crop) {
        sharpInstance = sharpInstance.extract({
          left: options.crop.x,
          top: options.crop.y,
          width: options.crop.width,
          height: options.crop.height,
        });
      }

      // Apply quality and format
      if (options.format) {
        switch (options.format.toLowerCase()) {
          case 'jpeg':
          case 'jpg':
            sharpInstance = sharpInstance.jpeg({ quality: options.quality || 80 });
            break;
          case 'png':
            sharpInstance = sharpInstance.png({ quality: options.quality || 80 });
            break;
          case 'webp':
            sharpInstance = sharpInstance.webp({ quality: options.quality || 80 });
            break;
        }
      }

      // Handle metadata
      if (options.metadata?.preserve === false) {
        sharpInstance = sharpInstance.withMetadata(false);
      }

      // Write output file
      await sharpInstance.toFile(outputPath);

      // Get output file stats
      const outputStats = await fs.stat(outputPath);
      const processingTime = Date.now() - startTime;

      // Extract metadata if requested
      let metadata: Record<string, any> = {};
      if (options.metadata?.preserve !== false) {
        metadata = await this.extractMetadata(inputPath);
      }

      this.logger.log(`Image processing completed in ${processingTime}ms`);

      return {
        success: true,
        outputPath,
        outputSize: outputStats.size,
        processingTime,
        metadata,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Image processing failed: ${error.message}`);

      return {
        success: false,
        processingTime,
        error: error.message,
      };
    }
  }

  async generateThumbnails(
    inputPath: string,
    outputDir: string,
    sizes: Array<{width: number, height: number}>
  ): Promise<string[]> {
    this.logger.log(`Generating ${sizes.length} thumbnails for: ${inputPath}`);

    try {
      await fs.mkdir(outputDir, { recursive: true });
      const thumbnails: string[] = [];

      for (const size of sizes) {
        const thumbnailPath = path.join(
          outputDir,
          `thumb_${size.width}x${size.height}_${path.basename(inputPath, path.extname(inputPath))}.webp`
        );

        await sharp(inputPath)
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: 85 })
          .toFile(thumbnailPath);

        thumbnails.push(thumbnailPath);
      }

      this.logger.log(`Generated ${thumbnails.length} thumbnails`);
      return thumbnails;

    } catch (error) {
      this.logger.error(`Thumbnail generation failed: ${error.message}`);
      throw error;
    }
  }

  async extractMetadata(inputPath: string): Promise<Record<string, any>> {
    try {
      const sharpInstance = sharp(inputPath);
      const metadata = await sharpInstance.metadata();

      // Extract EXIF data if available
      let exifData = {};
      if (metadata.exif) {
        try {
          // Parse EXIF data (would need exifr package for full parsing)
          exifData = { hasExif: true };
        } catch {
          exifData = { hasExif: false };
        }
      }

      return {
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasProfile: metadata.hasProfile,
        hasAlpha: metadata.hasAlpha,
        format: metadata.format,
        size: metadata.size,
        space: metadata.space,
        exif: exifData,
      };

    } catch (error) {
      this.logger.error(`Metadata extraction failed: ${error.message}`);
      return {};
    }
  }

  async validate(inputPath: string): Promise<{isValid: boolean, errors: string[]}> {
    const errors: string[] = [];

    try {
      // Check if file exists
      await fs.access(inputPath);

      // Try to load with Sharp
      const sharpInstance = sharp(inputPath);
      const metadata = await sharpInstance.metadata();

      // Basic validation
      if (!metadata.width || !metadata.height) {
        errors.push('Invalid image dimensions');
      }

      if (!metadata.format) {
        errors.push('Unknown image format');
      }

      // Size validation (max 100MB)
      const stats = await fs.stat(inputPath);
      if (stats.size > 100 * 1024 * 1024) {
        errors.push('Image file too large (max 100MB)');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };

    } catch (error) {
      errors.push(`Validation failed: ${error.message}`);
      return {
        isValid: false,
        errors,
      };
    }
  }

  /**
   * Apply watermark to image
   */
  async applyWatermark(
    inputPath: string,
    outputPath: string,
    watermarkPath: string,
    position: string = 'bottom-right',
    opacity: number = 0.5
  ): Promise<void> {
    try {
      const watermarkBuffer = await sharp(watermarkPath)
        .resize(200, null, { withoutEnlargement: true })
        .composite([{
          input: Buffer.from([255, 255, 255, Math.round(opacity * 255)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in'
        }])
        .toBuffer();

      let gravity: any;
      switch (position) {
        case 'top-left': gravity = 'northwest'; break;
        case 'top-right': gravity = 'northeast'; break;
        case 'bottom-left': gravity = 'southwest'; break;
        case 'bottom-right': gravity = 'southeast'; break;
        case 'center': gravity = 'center'; break;
        default: gravity = 'southeast';
      }

      await sharp(inputPath)
        .composite([{
          input: watermarkBuffer,
          gravity,
        }])
        .toFile(outputPath);

    } catch (error) {
      this.logger.error(`Watermark application failed: ${error.message}`);
      throw error;
    }
  }
}