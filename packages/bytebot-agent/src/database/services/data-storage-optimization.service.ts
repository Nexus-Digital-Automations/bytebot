/**
 * Data Storage Optimization Service
 *
 * Enterprise-grade service for optimizing browser automation data storage with intelligent
 * compression, tiered storage, and automated archival strategies. Provides comprehensive
 * data lifecycle management with performance optimization and cost reduction.
 *
 * Features:
 * - Intelligent compression based on access patterns
 * - Tiered storage with automated transitions
 * - Deduplication and content similarity detection
 * - Performance-optimized data retrieval
 * - Automated cleanup and archival policies
 * - Storage analytics and reporting
 *
 * @service DataStorageOptimizationService
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  StorageTier,
  CompressionType,
  BrowserScreenshot,
  BrowserDomSnapshot,
  BrowserDataExtraction,
  AccessPattern,
  ContentAnalysis,
} from '../models/browser-automation.models';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';

// Compression utilities
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

export interface CompressionConfig {
  type: CompressionType;
  level: number;
  enabled: boolean;
}

export interface StorageTierConfig {
  name: StorageTier;
  compressionConfig: CompressionConfig;
  accessThreshold: number;
  ageThresholdDays: number;
  maxFileSize?: number;
  minFileSize?: number;
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  spaceSaved: number;
  compressionRatio: number;
  optimizationTimeMs: number;
  tier: StorageTier;
  compressionType: CompressionType;
}

export interface DeduplicationResult {
  duplicatesFound: number;
  spaceSaved: number;
  uniqueChecksums: Set<string>;
  duplicateGroups: Map<string, string[]>;
}

export interface ArchivalRecommendation {
  id: string;
  entityType: string;
  currentTier: StorageTier;
  recommendedTier: StorageTier;
  estimatedSavings: number;
  confidence: number;
  factors: {
    isRedundant: boolean;
    isLowQuality: boolean;
    isTestData: boolean;
    hasBusinessValue: boolean;
    accessFrequency: 'high' | 'medium' | 'low';
    ageInDays: number;
  };
  action: 'compress' | 'archive' | 'delete' | 'no-action';
}

export interface StorageAnalytics {
  totalStorageUsed: number;
  storageByTier: Map<StorageTier, number>;
  storageByType: Map<string, number>;
  compressionStats: {
    totalCompressed: number;
    totalUncompressed: number;
    averageCompressionRatio: number;
    spaceSavedByCompression: number;
  };
  accessPatterns: {
    hotDataPercentage: number;
    warmDataPercentage: number;
    coldDataPercentage: number;
    archivedDataPercentage: number;
  };
  duplicateStats: {
    totalDuplicates: number;
    duplicateStorageWaste: number;
    deduplicationPotential: number;
  };
}

@Injectable()
export class DataStorageOptimizationService {
  private readonly logger = new Logger(DataStorageOptimizationService.name);

  private readonly storageTierConfigs: Map<StorageTier, StorageTierConfig>;
  private readonly checksumCache = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    this.storageTierConfigs = this.initializeStorageTierConfigs();
    this.logger.log('Data Storage Optimization Service initialized');
  }

  /**
   * Initialize storage tier configurations
   */
  private initializeStorageTierConfigs(): Map<StorageTier, StorageTierConfig> {
    const configs = new Map<StorageTier, StorageTierConfig>();

    configs.set(StorageTier.HOT, {
      name: StorageTier.HOT,
      compressionConfig: {
        type: CompressionType.NONE,
        level: 0,
        enabled: false,
      },
      accessThreshold: 10, // 10+ accesses
      ageThresholdDays: 7, // Within last 7 days
      minFileSize: 0,
    });

    configs.set(StorageTier.WARM, {
      name: StorageTier.WARM,
      compressionConfig: {
        type: CompressionType.GZIP,
        level: 4,
        enabled: true,
      },
      accessThreshold: 3, // 3-10 accesses
      ageThresholdDays: 30, // 7-30 days old
      minFileSize: 1024, // 1KB minimum
    });

    configs.set(StorageTier.COLD, {
      name: StorageTier.COLD,
      compressionConfig: {
        type: CompressionType.BROTLI,
        level: 6,
        enabled: true,
      },
      accessThreshold: 1, // 1-3 accesses
      ageThresholdDays: 90, // 30-90 days old
      minFileSize: 512, // 512B minimum
    });

    configs.set(StorageTier.ARCHIVED, {
      name: StorageTier.ARCHIVED,
      compressionConfig: {
        type: CompressionType.BROTLI,
        level: 11,
        enabled: true,
      },
      accessThreshold: 0, // 0-1 accesses
      ageThresholdDays: 365, // 90+ days old
      minFileSize: 0,
    });

    return configs;
  }

  /**
   * Optimize screenshot storage based on access patterns and content analysis
   */
  async optimizeScreenshots(limit = 100): Promise<OptimizationResult[]> {
    this.logger.log(`Starting screenshot optimization (limit: ${limit})`);

    const screenshots = await this.prismaService.browserScreenshot.findMany({
      where: {
        // Note: storageTier field not available in current schema
        // storageTier: {
        //   in: [StorageTier.HOT, StorageTier.WARM],
        // },
      },
      orderBy: [{ timestamp: 'asc' }, { fileSize: 'desc' }], // Using timestamp instead of lastAccessed
      take: limit,
    });

    const results: OptimizationResult[] = [];

    for (const screenshot of screenshots) {
      try {
        const recommendation =
          await this.analyzeScreenshotForOptimization(screenshot);

        if (recommendation.action !== 'no-action') {
          const optimizationResult = await this.optimizeScreenshot(
            screenshot,
            recommendation.recommendedTier,
          );
          results.push(optimizationResult);
        }
      } catch (error) {
        this.logger.error(
          `Failed to optimize screenshot ${screenshot.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(`Optimized ${results.length} screenshots`);
    return results;
  }

  /**
   * Optimize DOM snapshots with intelligent compression
   */
  async optimizeDomSnapshots(limit = 50): Promise<OptimizationResult[]> {
    this.logger.log(`Starting DOM snapshot optimization (limit: ${limit})`);

    const domSnapshots = await this.prismaService.browserDomSnapshot.findMany({
      where: {
        // Note: compressionType field not available in current schema
        htmlContent: { not: null },
      },
      orderBy: [{ timestamp: 'asc' }, { fileSize: 'desc' }], // Using available fields instead of lastAccessed/originalSize
      take: limit,
    });

    const results: OptimizationResult[] = [];

    for (const domSnapshot of domSnapshots) {
      try {
        const recommendation =
          await this.analyzeDomSnapshotForOptimization(domSnapshot);

        if (recommendation.action !== 'no-action') {
          const optimizationResult = await this.optimizeDomSnapshot(
            domSnapshot,
            recommendation.recommendedTier,
          );
          results.push(optimizationResult);
        }
      } catch (error) {
        this.logger.error(
          `Failed to optimize DOM snapshot ${domSnapshot.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(`Optimized ${results.length} DOM snapshots`);
    return results;
  }

  /**
   * Perform deduplication analysis on screenshots
   */
  async deduplicateScreenshots(): Promise<DeduplicationResult> {
    this.logger.log('Starting screenshot deduplication analysis');

    const screenshots = await this.prismaService.browserScreenshot.findMany({
      select: {
        id: true,
        filePath: true,
        fileSize: true,
        checksum: true,
      },
    });

    const checksumGroups = new Map<string, string[]>();
    const processedChecksums = new Set<string>();
    let duplicatesFound = 0;
    let spaceSaved = 0;

    for (const screenshot of screenshots) {
      let checksum = screenshot.checksum;

      // Calculate checksum if not present
      if (!checksum) {
        try {
          checksum = await this.calculateFileChecksum(screenshot.filePath);

          // Update database with calculated checksum
          await this.prismaService.browserScreenshot.update({
            where: { id: screenshot.id },
            data: { checksum },
          });
        } catch (error) {
          this.logger.warn(
            `Failed to calculate checksum for screenshot ${screenshot.id}: ${error.message}`,
          );
          continue;
        }
      }

      if (!checksumGroups.has(checksum)) {
        checksumGroups.set(checksum, []);
      }

      checksumGroups.get(checksum).push(screenshot.id);

      // If this checksum has been seen before, it's a duplicate
      if (processedChecksums.has(checksum)) {
        duplicatesFound++;
        spaceSaved += screenshot.fileSize;
      } else {
        processedChecksums.add(checksum);
      }
    }

    // Filter to only groups with duplicates
    const duplicateGroups = new Map<string, string[]>();
    for (const [checksum, ids] of checksumGroups) {
      if (ids.length > 1) {
        duplicateGroups.set(checksum, ids);
      }
    }

    this.logger.log(
      `Deduplication analysis complete: ${duplicatesFound} duplicates found, ${spaceSaved} bytes of potential savings`,
    );

    return {
      duplicatesFound,
      spaceSaved,
      uniqueChecksums: processedChecksums,
      duplicateGroups,
    };
  }

  /**
   * Analyze access patterns for data entities
   */
  async analyzeAccessPatterns(
    entityType: 'screenshot' | 'domSnapshot',
    entityIds: string[],
  ): Promise<Map<string, AccessPattern>> {
    const patterns = new Map<string, AccessPattern>();

    for (const id of entityIds) {
      try {
        let entity: any;

        if (entityType === 'screenshot') {
          entity = await this.prismaService.browserScreenshot.findUnique({
            where: { id },
            select: {
              accessCount: true,
              lastAccessed: true,
              createdAt: true,
            },
          });
        } else {
          entity = await this.prismaService.browserDomSnapshot.findUnique({
            where: { id },
            select: {
              accessCount: true,
              lastAccessed: true,
              timestamp: true,
            },
          });
        }

        if (entity) {
          const ageInDays = this.calculateAgeInDays(
            entity.createdAt || entity.timestamp,
          );

          const averageAccessInterval =
            ageInDays > 0 ? ageInDays / Math.max(entity.accessCount, 1) : 0;

          let accessFrequency: 'high' | 'medium' | 'low' = 'low';
          if (entity.accessCount > 10 && averageAccessInterval < 1) {
            accessFrequency = 'high';
          } else if (entity.accessCount > 3 && averageAccessInterval < 7) {
            accessFrequency = 'medium';
          }

          patterns.set(id, {
            totalAccesses: entity.accessCount,
            lastAccessed: entity.lastAccessed,
            averageAccessInterval,
            accessFrequency,
          });
        }
      } catch (error) {
        this.logger.warn(
          `Failed to analyze access pattern for ${entityType} ${id}: ${error.message}`,
        );
      }
    }

    return patterns;
  }

  /**
   * Generate storage optimization recommendations
   */
  async generateOptimizationRecommendations(
    entityType: 'screenshot' | 'domSnapshot',
    limit = 100,
  ): Promise<ArchivalRecommendation[]> {
    this.logger.log(
      `Generating optimization recommendations for ${entityType}`,
    );

    const recommendations: ArchivalRecommendation[] = [];

    if (entityType === 'screenshot') {
      const screenshots = await this.prismaService.browserScreenshot.findMany({
        orderBy: [{ lastAccessed: 'asc' }, { fileSize: 'desc' }],
        take: limit,
      });

      for (const screenshot of screenshots) {
        const recommendation =
          await this.analyzeScreenshotForOptimization(screenshot);
        recommendations.push(recommendation);
      }
    } else {
      const domSnapshots = await this.prismaService.browserDomSnapshot.findMany(
        {
          orderBy: [{ lastAccessed: 'asc' }, { originalSize: 'desc' }],
          take: limit,
        },
      );

      for (const domSnapshot of domSnapshots) {
        const recommendation =
          await this.analyzeDomSnapshotForOptimization(domSnapshot);
        recommendations.push(recommendation);
      }
    }

    // Sort by potential savings (highest first)
    recommendations.sort((a, b) => b.estimatedSavings - a.estimatedSavings);

    this.logger.log(
      `Generated ${recommendations.length} optimization recommendations`,
    );
    return recommendations;
  }

  /**
   * Get comprehensive storage analytics
   */
  async getStorageAnalytics(): Promise<StorageAnalytics> {
    this.logger.log('Generating storage analytics');

    // Get screenshot statistics
    const screenshotStats =
      await this.prismaService.browserScreenshot.aggregate({
        _sum: {
          fileSize: true,
          compressedSize: true,
        },
        _count: {
          id: true,
        },
      });

    // Get DOM snapshot statistics
    const domSnapshotStats =
      await this.prismaService.browserDomSnapshot.aggregate({
        _sum: {
          originalSize: true,
          compressedSize: true,
        },
        _count: {
          id: true,
        },
      });

    // Get storage by tier
    const storageByTier = new Map<StorageTier, number>();
    for (const tier of Object.values(StorageTier)) {
      const screenshotTierStats =
        await this.prismaService.browserScreenshot.aggregate({
          where: { storageTier: tier },
          _sum: { fileSize: true },
        });

      const domSnapshotTierStats =
        await this.prismaService.browserDomSnapshot.aggregate({
          where: { storageTier: tier },
          _sum: { originalSize: true },
        });

      const tierTotal =
        (screenshotTierStats._sum.fileSize || 0) +
        (domSnapshotTierStats._sum.originalSize || 0);

      storageByTier.set(tier, tierTotal);
    }

    // Calculate totals
    const totalStorageUsed = Array.from(storageByTier.values()).reduce(
      (sum, size) => sum + size,
      0,
    );
    const totalCompressed =
      (screenshotStats._sum.compressedSize || 0) +
      (domSnapshotStats._sum.compressedSize || 0);
    const totalUncompressed =
      (screenshotStats._sum.fileSize || 0) +
      (domSnapshotStats._sum.originalSize || 0);

    const storageByType = new Map<string, number>();
    storageByType.set('screenshots', screenshotStats._sum.fileSize || 0);
    storageByType.set('dom_snapshots', domSnapshotStats._sum.originalSize || 0);

    // Calculate compression stats
    const averageCompressionRatio =
      totalUncompressed > 0 ? totalCompressed / totalUncompressed : 0;
    const spaceSavedByCompression = totalUncompressed - totalCompressed;

    // Calculate access pattern percentages
    const totalSize = totalStorageUsed;
    const hotDataPercentage =
      totalSize > 0
        ? ((storageByTier.get(StorageTier.HOT) || 0) / totalSize) * 100
        : 0;
    const warmDataPercentage =
      totalSize > 0
        ? ((storageByTier.get(StorageTier.WARM) || 0) / totalSize) * 100
        : 0;
    const coldDataPercentage =
      totalSize > 0
        ? ((storageByTier.get(StorageTier.COLD) || 0) / totalSize) * 100
        : 0;
    const archivedDataPercentage =
      totalSize > 0
        ? ((storageByTier.get(StorageTier.ARCHIVED) || 0) / totalSize) * 100
        : 0;

    // Get deduplication statistics
    const deduplicationResult = await this.deduplicateScreenshots();

    return {
      totalStorageUsed,
      storageByTier,
      storageByType,
      compressionStats: {
        totalCompressed,
        totalUncompressed,
        averageCompressionRatio,
        spaceSavedByCompression,
      },
      accessPatterns: {
        hotDataPercentage,
        warmDataPercentage,
        coldDataPercentage,
        archivedDataPercentage,
      },
      duplicateStats: {
        totalDuplicates: deduplicationResult.duplicatesFound,
        duplicateStorageWaste: deduplicationResult.spaceSaved,
        deduplicationPotential: deduplicationResult.spaceSaved,
      },
    };
  }

  /**
   * Execute automated storage optimization
   */
  async executeAutomatedOptimization(): Promise<{
    screenshotsOptimized: number;
    domSnapshotsOptimized: number;
    totalSpaceSaved: number;
    optimizationTimeMs: number;
  }> {
    const startTime = Date.now();
    this.logger.log('Starting automated storage optimization');

    // Optimize screenshots
    const screenshotResults = await this.optimizeScreenshots(200);

    // Optimize DOM snapshots
    const domSnapshotResults = await this.optimizeDomSnapshots(100);

    const totalSpaceSaved =
      screenshotResults.reduce((sum, result) => sum + result.spaceSaved, 0) +
      domSnapshotResults.reduce((sum, result) => sum + result.spaceSaved, 0);

    const optimizationTimeMs = Date.now() - startTime;

    this.logger.log(
      `Automated optimization complete: ${screenshotResults.length} screenshots, ` +
        `${domSnapshotResults.length} DOM snapshots, ${totalSpaceSaved} bytes saved in ${optimizationTimeMs}ms`,
    );

    return {
      screenshotsOptimized: screenshotResults.length,
      domSnapshotsOptimized: domSnapshotResults.length,
      totalSpaceSaved,
      optimizationTimeMs,
    };
  }

  // ===== PRIVATE METHODS =====

  private async analyzeScreenshotForOptimization(
    screenshot: BrowserScreenshot,
  ): Promise<ArchivalRecommendation> {
    const ageInDays = this.calculateAgeInDays(screenshot.timestamp);
    const accessPattern = await this.analyzeAccessPatterns('screenshot', [
      screenshot.id,
    ]);
    const pattern = accessPattern.get(screenshot.id);

    const contentAnalysis = await this.analyzeScreenshotContent(screenshot);

    let recommendedTier = screenshot.storageTier;
    let estimatedSavings = 0;
    let action: 'compress' | 'archive' | 'delete' | 'no-action' = 'no-action';

    // Determine optimal storage tier
    if (
      ageInDays > 90 &&
      (pattern?.accessFrequency === 'low' || screenshot.accessCount < 2)
    ) {
      recommendedTier = StorageTier.ARCHIVED;
      action = 'archive';
      estimatedSavings = screenshot.fileSize * 0.8; // ~80% compression
    } else if (
      ageInDays > 30 &&
      pattern?.accessFrequency !== 'high' &&
      screenshot.accessCount < 10
    ) {
      recommendedTier = StorageTier.COLD;
      action = 'compress';
      estimatedSavings = screenshot.fileSize * 0.6; // ~60% compression
    } else if (ageInDays > 7 && pattern?.accessFrequency !== 'high') {
      recommendedTier = StorageTier.WARM;
      action = 'compress';
      estimatedSavings = screenshot.fileSize * 0.3; // ~30% compression
    }

    // Adjust based on content analysis
    if (contentAnalysis.similarScreenshotsCount > 5) {
      estimatedSavings *= 1.2; // Increase savings estimate for similar content
    }

    if (contentAnalysis.qualityScore < 0.3) {
      recommendedTier = StorageTier.ARCHIVED;
      action = 'archive';
    }

    const factors = {
      isRedundant: contentAnalysis.similarScreenshotsCount > 3,
      isLowQuality: contentAnalysis.qualityScore < 0.5,
      isTestData: screenshot.metadata?.isTestData === true,
      hasBusinessValue: this.assessBusinessValue(screenshot),
      accessFrequency: pattern?.accessFrequency || 'low',
      ageInDays,
    };

    const confidence = this.calculateRecommendationConfidence(
      pattern,
      contentAnalysis,
      factors,
    );

    return {
      id: screenshot.id,
      entityType: 'screenshot',
      currentTier: screenshot.storageTier,
      recommendedTier,
      estimatedSavings,
      confidence,
      factors,
      action,
    };
  }

  private async analyzeDomSnapshotForOptimization(
    domSnapshot: BrowserDomSnapshot,
  ): Promise<ArchivalRecommendation> {
    const ageInDays = this.calculateAgeInDays(domSnapshot.timestamp);
    const accessPattern = await this.analyzeAccessPatterns('domSnapshot', [
      domSnapshot.id,
    ]);
    const pattern = accessPattern.get(domSnapshot.id);

    const contentSize =
      domSnapshot.originalSize || domSnapshot.htmlContent?.length || 0;

    let recommendedTier = domSnapshot.storageTier;
    let estimatedSavings = 0;
    let action: 'compress' | 'archive' | 'delete' | 'no-action' = 'no-action';

    // Determine optimal storage tier for DOM content
    if (ageInDays > 60 && pattern?.accessFrequency === 'low') {
      recommendedTier = StorageTier.ARCHIVED;
      action = 'archive';
      estimatedSavings = contentSize * 0.85; // ~85% compression for HTML
    } else if (ageInDays > 14 && pattern?.accessFrequency !== 'high') {
      recommendedTier = StorageTier.COLD;
      action = 'compress';
      estimatedSavings = contentSize * 0.7; // ~70% compression
    } else if (ageInDays > 3 && pattern?.accessFrequency !== 'high') {
      recommendedTier = StorageTier.WARM;
      action = 'compress';
      estimatedSavings = contentSize * 0.4; // ~40% compression
    }

    const factors = {
      isRedundant: domSnapshot.textContentHash
        ? await this.checkForSimilarDomContent(domSnapshot.textContentHash)
        : false,
      isLowQuality: contentSize < 1024, // Very small HTML content
      isTestData: domSnapshot.metadata?.isTestData === true,
      hasBusinessValue: this.assessDomBusinessValue(domSnapshot),
      accessFrequency: pattern?.accessFrequency || 'low',
      ageInDays,
    };

    const confidence = this.calculateRecommendationConfidence(
      pattern,
      null,
      factors,
    );

    return {
      id: domSnapshot.id,
      entityType: 'domSnapshot',
      currentTier: domSnapshot.storageTier,
      recommendedTier,
      estimatedSavings,
      confidence,
      factors,
      action,
    };
  }

  private async optimizeScreenshot(
    screenshot: BrowserScreenshot,
    targetTier: StorageTier,
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const originalSize = screenshot.fileSize;
    const tierConfig = this.storageTierConfigs.get(targetTier);

    let optimizedSize = originalSize;
    let newCompressionType = screenshot.compressionType;

    // Apply compression if enabled for target tier
    if (
      tierConfig.compressionConfig.enabled &&
      tierConfig.compressionConfig.type !== CompressionType.NONE
    ) {
      try {
        const compressedData = await this.compressFile(
          screenshot.filePath,
          tierConfig.compressionConfig.type,
          tierConfig.compressionConfig.level,
        );

        optimizedSize = compressedData.length;
        newCompressionType = tierConfig.compressionConfig.type;

        // Write compressed file
        const compressedPath = `${screenshot.filePath}.${tierConfig.compressionConfig.type}`;
        await fs.writeFile(compressedPath, compressedData);

        // Update database record
        await this.prismaService.browserScreenshot.update({
          where: { id: screenshot.id },
          data: {
            storageTier: targetTier,
            compressionType: newCompressionType,
            compressedSize: optimizedSize,
            filePath: compressedPath,
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to compress screenshot ${screenshot.id}: ${error.message}`,
        );
        throw error;
      }
    } else {
      // Just update storage tier without compression
      await this.prismaService.browserScreenshot.update({
        where: { id: screenshot.id },
        data: {
          storageTier: targetTier,
        },
      });
    }

    const optimizationTimeMs = Date.now() - startTime;
    const spaceSaved = originalSize - optimizedSize;
    const compressionRatio =
      originalSize > 0 ? optimizedSize / originalSize : 1;

    return {
      originalSize,
      optimizedSize,
      spaceSaved,
      compressionRatio,
      optimizationTimeMs,
      tier: targetTier,
      compressionType: newCompressionType,
    };
  }

  private async optimizeDomSnapshot(
    domSnapshot: BrowserDomSnapshot,
    targetTier: StorageTier,
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const originalSize =
      domSnapshot.originalSize || domSnapshot.htmlContent?.length || 0;
    const tierConfig = this.storageTierConfigs.get(targetTier);

    let optimizedSize = originalSize;
    let newCompressionType = domSnapshot.compressionType;

    // Apply compression to HTML content if available
    if (domSnapshot.htmlContent && tierConfig.compressionConfig.enabled) {
      try {
        const compressedData = await this.compressText(
          domSnapshot.htmlContent,
          tierConfig.compressionConfig.type,
        );

        optimizedSize = compressedData.length;
        newCompressionType = tierConfig.compressionConfig.type;

        // Update database record
        await this.prismaService.browserDomSnapshot.update({
          where: { id: domSnapshot.id },
          data: {
            storageTier: targetTier,
            compressionType: newCompressionType,
            htmlCompressed: compressedData,
            compressedSize: optimizedSize,
            htmlContent: null, // Clear uncompressed content to save space
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to compress DOM snapshot ${domSnapshot.id}: ${error.message}`,
        );
        throw error;
      }
    } else {
      // Just update storage tier
      await this.prismaService.browserDomSnapshot.update({
        where: { id: domSnapshot.id },
        data: {
          storageTier: targetTier,
        },
      });
    }

    const optimizationTimeMs = Date.now() - startTime;
    const spaceSaved = originalSize - optimizedSize;
    const compressionRatio =
      originalSize > 0 ? optimizedSize / originalSize : 1;

    return {
      originalSize,
      optimizedSize,
      spaceSaved,
      compressionRatio,
      optimizationTimeMs,
      tier: targetTier,
      compressionType: newCompressionType,
    };
  }

  private async analyzeScreenshotContent(
    screenshot: BrowserScreenshot,
  ): Promise<ContentAnalysis> {
    // Calculate content hash if not present
    let contentHash = '';
    if (!screenshot.checksum) {
      contentHash = await this.calculateFileChecksum(screenshot.filePath);
    } else {
      contentHash = screenshot.checksum;
    }

    // Find similar screenshots
    const similarScreenshots = await this.prismaService.browserScreenshot.count(
      {
        where: {
          checksum: contentHash,
          id: { not: screenshot.id },
        },
      },
    );

    // Assess quality based on file size and metadata
    const qualityScore = this.calculateImageQualityScore(screenshot);

    // Check for duplicate content
    const duplicateContent = similarScreenshots > 0;

    // Assess business value
    const businessValueScore = this.assessBusinessValue(screenshot) ? 0.8 : 0.3;

    return {
      similarScreenshotsCount: similarScreenshots,
      qualityScore,
      contentHash,
      duplicateContent,
      businessValueScore,
    };
  }

  private async compressFile(
    filePath: string,
    compressionType: CompressionType,
    level: number,
  ): Promise<Buffer> {
    const fileData = await fs.readFile(filePath);

    switch (compressionType) {
      case CompressionType.GZIP:
        return await gzip(fileData, { level });
      case CompressionType.BROTLI:
        return await brotliCompress(fileData, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: level,
          },
        });
      default:
        return fileData;
    }
  }

  private async compressText(
    text: string,
    compressionType: CompressionType,
  ): Promise<Buffer> {
    const textBuffer = Buffer.from(text, 'utf-8');

    switch (compressionType) {
      case CompressionType.GZIP:
        return await gzip(textBuffer);
      case CompressionType.BROTLI:
        return await brotliCompress(textBuffer);
      default:
        return textBuffer;
    }
  }

  private async calculateFileChecksum(filePath: string): Promise<string> {
    if (this.checksumCache.has(filePath)) {
      return this.checksumCache.get(filePath);
    }

    try {
      const fileData = await fs.readFile(filePath);
      const hash = crypto.createHash('sha256').update(fileData).digest('hex');
      this.checksumCache.set(filePath, hash);
      return hash;
    } catch (error) {
      this.logger.warn(
        `Failed to calculate checksum for ${filePath}: ${error.message}`,
      );
      throw error;
    }
  }

  private calculateAgeInDays(date: Date): number {
    const now = new Date();
    const ageMs = now.getTime() - date.getTime();
    return Math.floor(ageMs / (1000 * 60 * 60 * 24));
  }

  private calculateImageQualityScore(screenshot: BrowserScreenshot): number {
    // Base quality assessment on file size and dimensions
    const sizeScore = Math.min(screenshot.fileSize / (100 * 1024), 1.0); // Up to 100KB = 1.0

    let dimensionScore = 0.5;
    if (screenshot.metadata && typeof screenshot.metadata === 'object') {
      const metadata = screenshot.metadata as any;
      if (metadata.dimensions) {
        const { width, height } = metadata.dimensions;
        dimensionScore = Math.min((width * height) / (1920 * 1080), 1.0); // Up to 1080p = 1.0
      }
    }

    return (sizeScore + dimensionScore) / 2;
  }

  private assessBusinessValue(screenshot: BrowserScreenshot): boolean {
    // Assess business value based on metadata and context
    if (screenshot.metadata && typeof screenshot.metadata === 'object') {
      const metadata = screenshot.metadata as any;

      // High business value indicators
      if (
        metadata.isProductionData ||
        metadata.isBusinessCritical ||
        metadata.isUserData
      ) {
        return true;
      }

      // Low business value indicators
      if (metadata.isTestData || metadata.isDebugData || metadata.isTemporary) {
        return false;
      }
    }

    // Default to moderate business value
    return (
      screenshot.url?.includes('production') ||
      screenshot.url?.includes('app') ||
      false
    );
  }

  private assessDomBusinessValue(domSnapshot: BrowserDomSnapshot): boolean {
    // Assess DOM snapshot business value
    if (domSnapshot.metadata && typeof domSnapshot.metadata === 'object') {
      const metadata = domSnapshot.metadata as any;

      if (
        metadata.isProductionData ||
        metadata.containsUserData ||
        metadata.isBusinessCritical
      ) {
        return true;
      }

      if (metadata.isTestData || metadata.isDebugData) {
        return false;
      }
    }

    // Check URL patterns
    return (
      domSnapshot.url.includes('production') ||
      domSnapshot.url.includes('app') ||
      (domSnapshot.formCount && domSnapshot.formCount > 0)
    );
  }

  private async checkForSimilarDomContent(
    textContentHash: string,
  ): Promise<boolean> {
    const count = await this.prismaService.browserDomSnapshot.count({
      where: {
        textContentHash,
      },
    });

    return count > 1;
  }

  private calculateRecommendationConfidence(
    accessPattern: AccessPattern | undefined,
    contentAnalysis: ContentAnalysis | null,
    factors: any,
  ): number {
    let confidence = 0.5; // Base confidence

    // Access pattern confidence
    if (accessPattern) {
      if (accessPattern.accessFrequency === 'low' && factors.ageInDays > 30) {
        confidence += 0.3;
      } else if (accessPattern.accessFrequency === 'high') {
        confidence -= 0.2; // Less confident about archiving frequently accessed data
      }
    }

    // Content analysis confidence
    if (contentAnalysis) {
      if (contentAnalysis.duplicateContent) {
        confidence += 0.2;
      }
      if (contentAnalysis.qualityScore < 0.3) {
        confidence += 0.2;
      }
    }

    // Factor-based adjustments
    if (factors.isTestData) confidence += 0.2;
    if (factors.hasBusinessValue) confidence -= 0.1;
    if (factors.isRedundant) confidence += 0.3;

    return Math.max(0, Math.min(1, confidence));
  }
}
