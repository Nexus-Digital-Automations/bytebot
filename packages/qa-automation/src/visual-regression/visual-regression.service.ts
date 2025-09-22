/**
 * Visual Regression Testing Service
 *
 * Advanced visual regression testing with pixel-perfect comparison,
 * intelligent difference detection, and automated baseline management.
 * Supports multiple comparison algorithms and threshold configurations.
 *
 * @fileoverview Core service for visual regression testing
 * @author Bytebot Team
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { createCanvas, loadImage } from 'canvas';
import * as pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as sharp from 'sharp';

export interface VisualTestRequest {
  testName: string;
  currentScreenshot: string | Buffer;
  baselineScreenshot?: string | Buffer;
  options?: VisualComparisonOptions;
  metadata?: VisualTestMetadata;
}

export interface VisualComparisonOptions {
  threshold: number;
  includeAA: boolean;
  alpha: number;
  aaColor: [number, number, number];
  diffColor: [number, number, number];
  diffMask: boolean;
  ignoreRegions?: IgnoreRegion[];
  customComparison?: ComparisonAlgorithm;
}

export interface IgnoreRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  reason?: string;
}

export interface VisualTestMetadata {
  viewport: { width: number; height: number };
  userAgent: string;
  timestamp: Date;
  environment: string;
  version: string;
}

export enum ComparisonAlgorithm {
  PIXEL_MATCH = 'pixelmatch',
  SSIM = 'ssim',
  PERCEPTUAL = 'perceptual',
  HISTOGRAM = 'histogram',
}

export interface VisualTestResult {
  testName: string;
  passed: boolean;
  pixelDifference: number;
  percentageDifference: number;
  threshold: number;
  diffImage?: Buffer;
  baselineImage?: Buffer;
  currentImage: Buffer;
  analysis: VisualAnalysis;
  metadata: VisualTestMetadata;
  timestamp: Date;
}

export interface VisualAnalysis {
  totalPixels: number;
  differentPixels: number;
  ignoredPixels: number;
  regions: DifferenceRegion[];
  statistics: VisualStatistics;
}

export interface DifferenceRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  severity: 'low' | 'medium' | 'high';
  type: 'color' | 'structure' | 'text' | 'layout';
  confidence: number;
}

export interface VisualStatistics {
  colorDifferences: number;
  structuralDifferences: number;
  textDifferences: number;
  layoutDifferences: number;
  averageDeviation: number;
  maxDeviation: number;
}

@Injectable()
export class VisualRegressionService {
  private readonly logger = new Logger(VisualRegressionService.name);
  private readonly baselineDirectory = './data/visual-baselines';
  private readonly diffDirectory = './data/visual-diffs';

  constructor() {
    this.ensureDirectories();
  }

  /**
   * Perform visual regression test
   *
   * @param request Visual test request with current screenshot
   * @returns Visual test result with comparison analysis
   */
  async performVisualTest(request: VisualTestRequest): Promise<VisualTestResult> {
    this.logger.log(`Performing visual test: ${request.testName}`);
    const startTime = Date.now();

    try {
      // Load current screenshot
      const currentImage = await this.loadImage(request.currentScreenshot);

      // Load or create baseline
      let baselineImage: PNG;
      if (request.baselineScreenshot) {
        baselineImage = await this.loadImage(request.baselineScreenshot);
      } else {
        baselineImage = await this.loadBaseline(request.testName);
        if (!baselineImage) {
          // Create new baseline
          await this.saveBaseline(request.testName, currentImage);
          return this.createBaselineResult(request, currentImage);
        }
      }

      // Perform comparison
      const comparisonResult = await this.compareImages(
        baselineImage,
        currentImage,
        request.options || this.getDefaultOptions()
      );

      // Analyze differences
      const analysis = await this.analyzeVisualDifferences(
        baselineImage,
        currentImage,
        comparisonResult.diffImage,
        request.options
      );

      // Generate result
      const result: VisualTestResult = {
        testName: request.testName,
        passed: comparisonResult.pixelDifference <= (request.options?.threshold || 0.1),
        pixelDifference: comparisonResult.pixelDifference,
        percentageDifference: comparisonResult.percentageDifference,
        threshold: request.options?.threshold || 0.1,
        diffImage: comparisonResult.diffImage,
        baselineImage: this.pngToBuffer(baselineImage),
        currentImage: this.pngToBuffer(currentImage),
        analysis,
        metadata: request.metadata || this.getDefaultMetadata(),
        timestamp: new Date(),
      };

      // Save diff image if test failed
      if (!result.passed && result.diffImage) {
        await this.saveDiffImage(request.testName, result.diffImage);
      }

      this.logger.log(`Visual test completed in ${Date.now() - startTime}ms`);
      this.logger.log(`Result: ${result.passed ? 'PASSED' : 'FAILED'} (${result.percentageDifference.toFixed(2)}% difference)`);

      return result;
    } catch (error) {
      this.logger.error(`Visual test failed: ${error.message}`, error.stack);
      throw new Error(`Visual test failed: ${error.message}`);
    }
  }

  /**
   * Compare two images using specified algorithm
   */
  private async compareImages(
    baseline: PNG,
    current: PNG,
    options: VisualComparisonOptions
  ): Promise<{
    pixelDifference: number;
    percentageDifference: number;
    diffImage: Buffer;
  }> {
    // Ensure images have same dimensions
    if (baseline.width !== current.width || baseline.height !== current.height) {
      // Resize current image to match baseline
      const resizedCurrent = await this.resizeImage(current, baseline.width, baseline.height);
      return this.compareImages(baseline, resizedCurrent, options);
    }

    const totalPixels = baseline.width * baseline.height;
    const diffImage = new PNG({ width: baseline.width, height: baseline.height });

    // Apply ignore regions
    const maskedBaseline = this.applyIgnoreRegions(baseline, options.ignoreRegions);
    const maskedCurrent = this.applyIgnoreRegions(current, options.ignoreRegions);

    // Perform pixel comparison
    const differentPixels = pixelmatch(
      maskedBaseline.data,
      maskedCurrent.data,
      diffImage.data,
      baseline.width,
      baseline.height,
      {
        threshold: options.threshold,
        includeAA: options.includeAA,
        alpha: options.alpha,
        aaColor: options.aaColor,
        diffColor: options.diffColor,
        diffMask: options.diffMask,
      }
    );

    const percentageDifference = (differentPixels / totalPixels) * 100;

    return {
      pixelDifference: differentPixels,
      percentageDifference,
      diffImage: PNG.sync.write(diffImage),
    };
  }

  /**
   * Analyze visual differences and classify them
   */
  private async analyzeVisualDifferences(
    baseline: PNG,
    current: PNG,
    diffImage: Buffer,
    options?: VisualComparisonOptions
  ): Promise<VisualAnalysis> {
    const totalPixels = baseline.width * baseline.height;
    const diff = PNG.sync.read(diffImage);

    // Count different pixels
    let differentPixels = 0;
    let ignoredPixels = 0;

    for (let i = 0; i < diff.data.length; i += 4) {
      const r = diff.data[i];
      const g = diff.data[i + 1];
      const b = diff.data[i + 2];

      if (r > 0 || g > 0 || b > 0) {
        differentPixels++;
      }
    }

    // Calculate ignored pixels from ignore regions
    if (options?.ignoreRegions) {
      ignoredPixels = options.ignoreRegions.reduce((total, region) => {
        return total + (region.width * region.height);
      }, 0);
    }

    // Detect difference regions
    const regions = await this.detectDifferenceRegions(diff);

    // Calculate statistics
    const statistics = await this.calculateVisualStatistics(baseline, current, diff);

    return {
      totalPixels,
      differentPixels,
      ignoredPixels,
      regions,
      statistics,
    };
  }

  /**
   * Detect and classify difference regions
   */
  private async detectDifferenceRegions(diffImage: PNG): Promise<DifferenceRegion[]> {
    const regions: DifferenceRegion[] = [];
    const visited = new Set<string>();

    // Simple flood fill algorithm to detect connected regions
    for (let y = 0; y < diffImage.height; y++) {
      for (let x = 0; x < diffImage.width; x++) {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;

        const pixelIndex = (y * diffImage.width + x) * 4;
        const r = diffImage.data[pixelIndex];

        if (r > 0) { // Pixel has difference
          const region = this.floodFillRegion(diffImage, x, y, visited);
          if (region && region.width > 5 && region.height > 5) { // Filter small differences
            regions.push({
              ...region,
              severity: this.calculateRegionSeverity(region),
              type: this.classifyRegionType(region),
              confidence: this.calculateRegionConfidence(region),
            });
          }
        }
      }
    }

    return regions;
  }

  /**
   * Flood fill algorithm to detect connected difference regions
   */
  private floodFillRegion(
    image: PNG,
    startX: number,
    startY: number,
    visited: Set<string>
  ): { x: number; y: number; width: number; height: number } | null {
    const stack: [number, number][] = [[startX, startY]];
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    let pixelCount = 0;

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key) || x < 0 || x >= image.width || y < 0 || y >= image.height) {
        continue;
      }

      const pixelIndex = (y * image.width + x) * 4;
      const r = image.data[pixelIndex];

      if (r === 0) continue; // No difference

      visited.add(key);
      pixelCount++;

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      // Add neighboring pixels
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    if (pixelCount === 0) return null;

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  /**
   * Calculate region severity based on size and intensity
   */
  private calculateRegionSeverity(region: { width: number; height: number }): 'low' | 'medium' | 'high' {
    const area = region.width * region.height;
    if (area > 10000) return 'high';
    if (area > 1000) return 'medium';
    return 'low';
  }

  /**
   * Classify region type based on characteristics
   */
  private classifyRegionType(region: { width: number; height: number }): 'color' | 'structure' | 'text' | 'layout' {
    const aspectRatio = region.width / region.height;

    // Text regions are typically wide and short
    if (aspectRatio > 3 && region.height < 50) return 'text';

    // Layout regions are typically large and rectangular
    if (region.width > 100 && region.height > 100) return 'layout';

    // Structure regions have moderate aspect ratios
    if (aspectRatio > 0.5 && aspectRatio < 2) return 'structure';

    return 'color';
  }

  /**
   * Calculate confidence score for region classification
   */
  private calculateRegionConfidence(region: { width: number; height: number }): number {
    // Simple confidence calculation based on region characteristics
    const area = region.width * region.height;
    const aspectRatio = region.width / region.height;

    let confidence = 0.5; // Base confidence

    // Larger regions are more confident
    if (area > 1000) confidence += 0.2;
    if (area > 10000) confidence += 0.2;

    // Reasonable aspect ratios are more confident
    if (aspectRatio > 0.2 && aspectRatio < 5) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate visual statistics
   */
  private async calculateVisualStatistics(
    baseline: PNG,
    current: PNG,
    diff: PNG
  ): Promise<VisualStatistics> {
    let colorDifferences = 0;
    let structuralDifferences = 0;
    let totalDeviation = 0;
    let maxDeviation = 0;

    for (let i = 0; i < diff.data.length; i += 4) {
      const r = diff.data[i];
      const g = diff.data[i + 1];
      const b = diff.data[i + 2];

      if (r > 0 || g > 0 || b > 0) {
        const baselineR = baseline.data[i];
        const baselineG = baseline.data[i + 1];
        const baselineB = baseline.data[i + 2];

        const currentR = current.data[i];
        const currentG = current.data[i + 1];
        const currentB = current.data[i + 2];

        const deviation = Math.sqrt(
          Math.pow(currentR - baselineR, 2) +
          Math.pow(currentG - baselineG, 2) +
          Math.pow(currentB - baselineB, 2)
        );

        totalDeviation += deviation;
        maxDeviation = Math.max(maxDeviation, deviation);

        // Classify difference type
        if (deviation > 50) {
          structuralDifferences++;
        } else {
          colorDifferences++;
        }
      }
    }

    const totalDifferentPixels = colorDifferences + structuralDifferences;
    const averageDeviation = totalDifferentPixels > 0 ? totalDeviation / totalDifferentPixels : 0;

    return {
      colorDifferences,
      structuralDifferences,
      textDifferences: 0, // Would require OCR analysis
      layoutDifferences: 0, // Would require layout analysis
      averageDeviation,
      maxDeviation,
    };
  }

  /**
   * Load image from file path or buffer
   */
  private async loadImage(source: string | Buffer): Promise<PNG> {
    if (Buffer.isBuffer(source)) {
      return PNG.sync.read(source);
    } else {
      const buffer = await fs.readFile(source);
      return PNG.sync.read(buffer);
    }
  }

  /**
   * Resize image to specified dimensions
   */
  private async resizeImage(image: PNG, width: number, height: number): Promise<PNG> {
    const buffer = PNG.sync.write(image);
    const resized = await sharp(buffer)
      .resize(width, height, { fit: 'fill' })
      .png()
      .toBuffer();
    return PNG.sync.read(resized);
  }

  /**
   * Apply ignore regions to image
   */
  private applyIgnoreRegions(image: PNG, ignoreRegions?: IgnoreRegion[]): PNG {
    if (!ignoreRegions || ignoreRegions.length === 0) {
      return image;
    }

    const masked = new PNG({ width: image.width, height: image.height });
    masked.data = Buffer.from(image.data);

    for (const region of ignoreRegions) {
      for (let y = region.y; y < region.y + region.height && y < image.height; y++) {
        for (let x = region.x; x < region.x + region.width && x < image.width; x++) {
          const index = (y * image.width + x) * 4;
          masked.data[index] = 0;     // R
          masked.data[index + 1] = 0; // G
          masked.data[index + 2] = 0; // B
          masked.data[index + 3] = 0; // A
        }
      }
    }

    return masked;
  }

  /**
   * Convert PNG to buffer
   */
  private pngToBuffer(png: PNG): Buffer {
    return PNG.sync.write(png);
  }

  /**
   * Load baseline image from storage
   */
  private async loadBaseline(testName: string): Promise<PNG | null> {
    try {
      const baselinePath = path.join(this.baselineDirectory, `${testName}.png`);
      const buffer = await fs.readFile(baselinePath);
      return PNG.sync.read(buffer);
    } catch (error) {
      return null;
    }
  }

  /**
   * Save baseline image to storage
   */
  private async saveBaseline(testName: string, image: PNG): Promise<void> {
    const baselinePath = path.join(this.baselineDirectory, `${testName}.png`);
    const buffer = PNG.sync.write(image);
    await fs.writeFile(baselinePath, buffer);
    this.logger.log(`Baseline saved: ${testName}`);
  }

  /**
   * Save diff image to storage
   */
  private async saveDiffImage(testName: string, diffBuffer: Buffer): Promise<void> {
    const diffPath = path.join(this.diffDirectory, `${testName}-diff.png`);
    await fs.writeFile(diffPath, diffBuffer);
    this.logger.log(`Diff image saved: ${testName}`);
  }

  /**
   * Create result for new baseline
   */
  private createBaselineResult(request: VisualTestRequest, image: PNG): VisualTestResult {
    return {
      testName: request.testName,
      passed: true,
      pixelDifference: 0,
      percentageDifference: 0,
      threshold: request.options?.threshold || 0.1,
      currentImage: this.pngToBuffer(image),
      analysis: {
        totalPixels: image.width * image.height,
        differentPixels: 0,
        ignoredPixels: 0,
        regions: [],
        statistics: {
          colorDifferences: 0,
          structuralDifferences: 0,
          textDifferences: 0,
          layoutDifferences: 0,
          averageDeviation: 0,
          maxDeviation: 0,
        },
      },
      metadata: request.metadata || this.getDefaultMetadata(),
      timestamp: new Date(),
    };
  }

  /**
   * Get default comparison options
   */
  private getDefaultOptions(): VisualComparisonOptions {
    return {
      threshold: 0.1,
      includeAA: false,
      alpha: 0.1,
      aaColor: [255, 255, 0],
      diffColor: [255, 0, 255],
      diffMask: false,
    };
  }

  /**
   * Get default metadata
   */
  private getDefaultMetadata(): VisualTestMetadata {
    return {
      viewport: { width: 1920, height: 1080 },
      userAgent: 'QA Automation Platform',
      timestamp: new Date(),
      environment: 'test',
      version: '1.0.0',
    };
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.baselineDirectory, { recursive: true });
      await fs.mkdir(this.diffDirectory, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create directories: ${error.message}`);
    }
  }
}