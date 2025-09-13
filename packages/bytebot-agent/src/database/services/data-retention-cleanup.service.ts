/**
 * Data Retention and Cleanup Service
 *
 * Enterprise-grade service for automated data lifecycle management with intelligent retention
 * policies, automated cleanup, and compliance-focused data governance. Provides comprehensive
 * data retention strategies optimized for browser automation data with local-only architecture.
 *
 * Features:
 * - Automated retention policy enforcement
 * - Intelligent cleanup strategies based on business value
 * - Compliance-focused data governance
 * - Performance-optimized bulk operations
 * - Detailed audit trails and reporting
 * - Safe deletion with rollback capabilities
 *
 * @service DataRetentionCleanupService
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StorageTier } from '../models/browser-automation.models';
import { Prisma } from '@prisma/client';
import * as fs from 'fs/promises';

export interface RetentionPolicy {
  id: string;
  entityType: string;
  retentionPeriodDays: number;
  archivePeriodDays?: number;
  cleanupEnabled: boolean;
  compressionEnabled: boolean;
  policyConditions?: {
    minFileSize?: number;
    maxAccessCount?: number;
    statusFilter?: string[];
    priorityFilter?: string[];
    storageExcludeList?: StorageTier[];
    businessValueThreshold?: number;
    preserveProductionData?: boolean;
  };
  executionSchedule?: string; // Cron expression
  createdAt: Date;
  updatedAt: Date;
  lastExecuted?: Date;
}

export interface CleanupExecutionResult {
  policyId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  recordsProcessed: number;
  recordsArchived: number;
  recordsDeleted: number;
  bytesFreed: number;
  bytesArchived: number;
  errorsCount: number;
  errorDetails?: Array<{
    entityId: string;
    error: string;
    timestamp: Date;
  }>;
  executionStatus: 'running' | 'completed' | 'failed' | 'cancelled';
  performanceMetrics: {
    processingRatePerSecond: number;
    averageDeletionTimeMs: number;
    peakMemoryUsageMb: number;
  };
}

export interface EntityCleanupResult {
  recordsProcessed: number;
  recordsArchived: number;
  recordsDeleted: number;
  bytesFreed: number;
  bytesArchived: number;
  errors: Array<{
    entityId: string;
    error: string;
  }>;
}

export interface DataRetentionReport {
  reportId: string;
  generatedAt: Date;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  policyExecutions: CleanupExecutionResult[];
  totalRecordsProcessed: number;
  totalRecordsDeleted: number;
  totalRecordsArchived: number;
  totalBytesFreed: number;
  totalBytesArchived: number;
  complianceStatus: 'compliant' | 'non-compliant' | 'partial';
  recommendations: string[];
  storageOptimizationSavings: {
    beforeCleanup: number;
    afterCleanup: number;
    spaceSaved: number;
    percentageSaved: number;
  };
}

// Prisma type definitions for cleanup operations
type BrowserSessionWithIncludes = Prisma.BrowserSessionGetPayload<{
  include: {
    tasks: {
      select: { id: true };
    };
    screenshots: {
      select: { id: true; fileSize: true };
    };
  };
}>;

// Type-safe screenshot interface for file operations
interface SafeScreenshot {
  id: string;
  filePath: string;
  fileSize: number;
}

type BrowserSessionForDeletion = Prisma.BrowserSessionGetPayload<{
  include: {
    tasks: true;
    screenshots: {
      select: { id: true; fileSize: true; filePath: true };
    };
    domSnapshots: {
      select: { id: true; fileSize: true };
    };
  };
}>;

type BrowserTaskForDeletion = Prisma.BrowserTaskGetPayload<{
  include: {
    screenshots: {
      select: { id: true; fileSize: true; filePath: true };
    };
    domSnapshots: {
      select: { id: true; fileSize: true };
    };
    dataExtractions: {
      select: { id: true };
    };
  };
}>;

type BrowserScreenshotForDeletion = Prisma.BrowserScreenshotGetPayload<
  Record<string, never>
>;

type BrowserDomSnapshotForDeletion = Prisma.BrowserDomSnapshotGetPayload<
  Record<string, never>
>;

type BrowserDataExtractionForDeletion = Prisma.BrowserDataExtractionGetPayload<
  Record<string, never>
>;

// Interface for cleanup execution log data
interface CleanupExecutionLogData {
  id: string;
  policyId: string;
  executionStartedAt: Date;
  executionCompletedAt?: Date;
  recordsProcessed: number;
  recordsArchived: number;
  recordsDeleted: number;
  bytesFreed: number;
  errorsCount: number;
  errorDetails?: Array<{
    entityId: string;
    error: string;
    timestamp: Date;
  }>;
  executionStatus: 'running' | 'completed' | 'failed' | 'cancelled';
}

// Utility function to safely extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'Unknown error occurred';
}

// Utility function to safely extract error stack
function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }
  if (
    error &&
    typeof error === 'object' &&
    'stack' in error &&
    typeof (error as { stack: unknown }).stack === 'string'
  ) {
    return (error as { stack: string }).stack;
  }
  return undefined;
}

@Injectable()
export class DataRetentionCleanupService {
  private readonly logger = new Logger(DataRetentionCleanupService.name);

  private readonly defaultRetentionPolicies: Map<string, RetentionPolicy>;
  private readonly activeCleanupOperations = new Map<
    string,
    CleanupExecutionResult
  >();
  private isCleanupRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    this.defaultRetentionPolicies = this.initializeDefaultPolicies();
    this.logger.log('Data Retention and Cleanup Service initialized');
  }

  /**
   * Initialize default retention policies for browser automation entities
   */
  private initializeDefaultPolicies(): Map<string, RetentionPolicy> {
    const policies = new Map<string, RetentionPolicy>();

    // Browser sessions retention policy
    policies.set('browser_sessions', {
      id: 'browser_sessions_default',
      entityType: 'browser_sessions',
      retentionPeriodDays: 90, // 3 months
      archivePeriodDays: 30, // Archive after 1 month
      cleanupEnabled: true,
      compressionEnabled: true,
      policyConditions: {
        statusFilter: ['TERMINATED', 'ERROR'],
        preserveProductionData: true,
        businessValueThreshold: 0.5,
      },
      executionSchedule: '0 2 * * 0', // Weekly on Sunday at 2 AM
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Browser tasks retention policy
    policies.set('browser_tasks', {
      id: 'browser_tasks_default',
      entityType: 'browser_tasks',
      retentionPeriodDays: 60, // 2 months
      archivePeriodDays: 14, // Archive after 2 weeks
      cleanupEnabled: true,
      compressionEnabled: true,
      policyConditions: {
        statusFilter: ['COMPLETED', 'FAILED', 'CANCELLED'],
        preserveProductionData: true,
        businessValueThreshold: 0.3,
      },
      executionSchedule: '0 2 * * 0', // Weekly on Sunday at 2 AM
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Screenshots retention policy with tier-based approach
    policies.set('browser_screenshots', {
      id: 'browser_screenshots_default',
      entityType: 'browser_screenshots',
      retentionPeriodDays: 180, // 6 months
      archivePeriodDays: 7, // Archive after 1 week
      cleanupEnabled: true,
      compressionEnabled: true,
      policyConditions: {
        maxAccessCount: 5, // Archive if accessed less than 5 times
        minFileSize: 1024, // 1KB minimum for processing
        storageExcludeList: [StorageTier.HOT], // Don't clean HOT tier
        preserveProductionData: true,
      },
      executionSchedule: '0 3 * * */2', // Every 2 days at 3 AM
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // DOM snapshots retention policy
    policies.set('browser_dom_snapshots', {
      id: 'browser_dom_snapshots_default',
      entityType: 'browser_dom_snapshots',
      retentionPeriodDays: 60, // 2 months
      archivePeriodDays: 14, // Archive after 2 weeks
      cleanupEnabled: true,
      compressionEnabled: true,
      policyConditions: {
        minFileSize: 512, // 512B minimum
        maxAccessCount: 3,
        storageExcludeList: [StorageTier.HOT, StorageTier.WARM],
        preserveProductionData: true,
      },
      executionSchedule: '0 3 * * */2', // Every 2 days at 3 AM
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Data extractions retention policy
    policies.set('browser_data_extractions', {
      id: 'browser_data_extractions_default',
      entityType: 'browser_data_extractions',
      retentionPeriodDays: 30, // 1 month
      archivePeriodDays: 7, // Archive after 1 week
      cleanupEnabled: true,
      compressionEnabled: true,
      policyConditions: {
        preserveProductionData: true,
        businessValueThreshold: 0.4,
      },
      executionSchedule: '0 4 * * 0', // Weekly on Sunday at 4 AM
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return policies;
  }

  /**
   * Execute automated cleanup based on retention policies
   * Scheduled to run weekly
   */
  @Cron(CronExpression.EVERY_WEEK)
  async executeScheduledCleanup(): Promise<CleanupExecutionResult[]> {
    if (this.isCleanupRunning) {
      this.logger.warn(
        'Cleanup already in progress, skipping scheduled execution',
      );
      return [];
    }

    this.logger.log('Starting scheduled automated cleanup');
    this.isCleanupRunning = true;

    try {
      const results: CleanupExecutionResult[] = [];

      for (const [entityType, policy] of this.defaultRetentionPolicies) {
        try {
          const result = await this.executePolicyCleanup(policy);
          results.push(result);

          // Update last executed timestamp
          policy.lastExecuted = new Date();
        } catch (error) {
          this.logger.error(
            `Failed to execute cleanup for ${entityType}: ${getErrorMessage(error)}`,
            getErrorStack(error),
          );
        }
      }

      this.logger.log(
        `Scheduled cleanup completed. Processed ${results.length} policies.`,
      );

      return results;
    } finally {
      this.isCleanupRunning = false;
    }
  }

  /**
   * Execute cleanup for a specific retention policy
   */
  async executePolicyCleanup(
    policy: RetentionPolicy,
  ): Promise<CleanupExecutionResult> {
    const executionId = `cleanup_${policy.id}_${Date.now()}`;
    const startTime = new Date();

    this.logger.log(`Starting cleanup execution for policy: ${policy.id}`);

    const result: CleanupExecutionResult = {
      policyId: policy.id,
      executionId,
      startTime,
      recordsProcessed: 0,
      recordsArchived: 0,
      recordsDeleted: 0,
      bytesFreed: 0,
      bytesArchived: 0,
      errorsCount: 0,
      errorDetails: [],
      executionStatus: 'running',
      performanceMetrics: {
        processingRatePerSecond: 0,
        averageDeletionTimeMs: 0,
        peakMemoryUsageMb: 0,
      },
    };

    this.activeCleanupOperations.set(executionId, result);

    try {
      // Calculate dates based on policy
      const now = new Date();
      const archiveDate = new Date(
        now.getTime() - (policy.archivePeriodDays || 0) * 24 * 60 * 60 * 1000,
      );
      const deleteDate = new Date(
        now.getTime() - policy.retentionPeriodDays * 24 * 60 * 60 * 1000,
      );

      // Execute entity-specific cleanup
      let entityResult: EntityCleanupResult;

      switch (policy.entityType) {
        case 'browser_sessions':
          entityResult = await this.cleanupBrowserSessions(
            policy,
            archiveDate,
            deleteDate,
          );
          break;
        case 'browser_tasks':
          entityResult = await this.cleanupBrowserTasks(
            policy,
            archiveDate,
            deleteDate,
          );
          break;
        case 'browser_screenshots':
          entityResult = await this.cleanupBrowserScreenshots(
            policy,
            archiveDate,
            deleteDate,
          );
          break;
        case 'browser_dom_snapshots':
          entityResult = await this.cleanupBrowserDomSnapshots(
            policy,
            archiveDate,
            deleteDate,
          );
          break;
        case 'browser_data_extractions':
          entityResult = await this.cleanupBrowserDataExtractions(
            policy,
            archiveDate,
            deleteDate,
          );
          break;
        default:
          throw new Error(`Unsupported entity type: ${policy.entityType}`);
      }

      // Update result with entity cleanup results
      result.recordsProcessed = entityResult.recordsProcessed;
      result.recordsArchived = entityResult.recordsArchived;
      result.recordsDeleted = entityResult.recordsDeleted;
      result.bytesFreed = entityResult.bytesFreed;
      result.bytesArchived = entityResult.bytesArchived;
      result.errorsCount = entityResult.errors.length;
      result.errorDetails = entityResult.errors.map((error) => ({
        entityId: error.entityId,
        error: error.error,
        timestamp: new Date(),
      }));

      result.endTime = new Date();
      result.executionStatus = 'completed';

      // Calculate performance metrics
      const executionTimeMs =
        result.endTime.getTime() - result.startTime.getTime();
      result.performanceMetrics = {
        processingRatePerSecond:
          executionTimeMs > 0
            ? result.recordsProcessed / (executionTimeMs / 1000)
            : 0,
        averageDeletionTimeMs:
          result.recordsDeleted > 0
            ? executionTimeMs / result.recordsDeleted
            : 0,
        peakMemoryUsageMb: Math.round(
          process.memoryUsage().heapUsed / 1024 / 1024,
        ),
      };

      // Log execution summary
      this.logCleanupExecution(result);

      this.logger.log(
        `Cleanup execution completed for policy ${policy.id}: ` +
          `${result.recordsProcessed} processed, ${result.recordsDeleted} deleted, ` +
          `${result.recordsArchived} archived, ${result.bytesFreed} bytes freed`,
      );

      return result;
    } catch (error) {
      result.endTime = new Date();
      result.executionStatus = 'failed';
      result.errorsCount++;
      result.errorDetails?.push({
        entityId: 'policy_execution',
        error: getErrorMessage(error),
        timestamp: new Date(),
      });

      this.logger.error(
        `Cleanup execution failed for policy ${policy.id}: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );

      return result;
    } finally {
      this.activeCleanupOperations.delete(executionId);
    }
  }

  /**
   * Cleanup browser sessions based on retention policy
   */
  private async cleanupBrowserSessions(
    policy: RetentionPolicy,
    archiveDate: Date,
    deleteDate: Date,
  ): Promise<EntityCleanupResult> {
    const result: EntityCleanupResult = {
      recordsProcessed: 0,
      recordsArchived: 0,
      recordsDeleted: 0,
      bytesFreed: 0,
      bytesArchived: 0,
      errors: [],
    };

    // Find sessions to archive
    const sessionsToArchive = await this.prismaService.browserSession.findMany({
      where: {
        AND: [
          { updatedAt: { lt: archiveDate } },
          { updatedAt: { gte: deleteDate } },
          ...(policy.policyConditions?.statusFilter
            ? [
                {
                  status: {
                    in: policy.policyConditions.statusFilter,
                  },
                },
              ]
            : []),
        ],
      },
      include: {
        tasks: {
          select: { id: true },
        },
        screenshots: {
          select: { id: true, fileSize: true },
        },
      },
    });

    // Archive sessions if enabled
    if (policy.archivePeriodDays && policy.compressionEnabled) {
      for (const session of sessionsToArchive) {
        try {
          await this.archiveBrowserSession(session);
          result.recordsArchived++;
          result.bytesArchived += this.calculateSessionSize(session);
        } catch (error) {
          result.errors.push({
            entityId: session.id,
            error: getErrorMessage(error),
          });
        }
      }
    }

    // Find sessions to delete
    const sessionsToDelete = await this.prismaService.browserSession.findMany({
      where: {
        AND: [
          { updatedAt: { lt: deleteDate } },
          ...(policy.policyConditions?.statusFilter
            ? [
                {
                  status: {
                    in: policy.policyConditions.statusFilter,
                  },
                },
              ]
            : []),
          ...(policy.policyConditions?.preserveProductionData
            ? [
                {
                  OR: [
                    {
                      metadata: { path: ['isProductionData'], equals: false },
                    },
                    {
                      metadata: { path: ['isProductionData'], equals: null },
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      include: {
        tasks: true,
        screenshots: {
          select: { id: true, fileSize: true, filePath: true },
        },
        domSnapshots: {
          select: { id: true, fileSize: true },
        },
      },
    });

    // Delete sessions and cascade delete related data
    for (const session of sessionsToDelete) {
      try {
        // Calculate size before deletion
        const sessionSize = this.calculateSessionSize(session);

        // Delete associated files
        for (const screenshot of session.screenshots) {
          // Type guard to ensure screenshot has required properties
          if (this.isValidScreenshotForDeletion(screenshot)) {
            try {
              await fs.unlink(screenshot.filePath);
              result.bytesFreed += screenshot.fileSize;
            } catch (error) {
              this.logger.warn(
                `Failed to delete screenshot file ${screenshot.filePath}: ${getErrorMessage(error)}`,
              );
            }
          }
        }

        // Delete session (cascade delete handles related records)
        await this.prismaService.browserSession.delete({
          where: { id: session.id },
        });

        result.recordsDeleted++;
        result.bytesFreed += sessionSize;
      } catch (error) {
        result.errors.push({
          entityId: session.id,
          error: getErrorMessage(error),
        });
      }
    }

    result.recordsProcessed =
      sessionsToArchive.length + sessionsToDelete.length;
    return result;
  }

  /**
   * Cleanup browser tasks based on retention policy
   */
  private async cleanupBrowserTasks(
    policy: RetentionPolicy,
    archiveDate: Date,
    deleteDate: Date,
  ): Promise<EntityCleanupResult> {
    const result: EntityCleanupResult = {
      recordsProcessed: 0,
      recordsArchived: 0,
      recordsDeleted: 0,
      bytesFreed: 0,
      bytesArchived: 0,
      errors: [],
    };

    // Find tasks to delete
    const tasksToDelete = await this.prismaService.browserTask.findMany({
      where: {
        AND: [
          { updatedAt: { lt: deleteDate } },
          ...(policy.policyConditions?.statusFilter
            ? [
                {
                  status: {
                    in: policy.policyConditions.statusFilter,
                  },
                },
              ]
            : []),
          ...(policy.policyConditions?.preserveProductionData
            ? [
                {
                  OR: [
                    {
                      customData: {
                        path: ['isProductionData'],
                        equals: false,
                      },
                    },
                    {
                      customData: {
                        path: ['isProductionData'],
                        equals: null,
                      },
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      include: {
        screenshots: {
          select: { id: true, fileSize: true, filePath: true },
        },
        domSnapshots: {
          select: { id: true, fileSize: true },
        },
        dataExtractions: {
          select: { id: true },
        },
      },
    });

    // Delete tasks and associated data
    for (const task of tasksToDelete) {
      try {
        // Delete associated screenshot files
        for (const screenshot of task.screenshots) {
          // Type guard to ensure screenshot has required properties
          if (this.isValidScreenshotForDeletion(screenshot)) {
            try {
              await fs.unlink(screenshot.filePath);
              result.bytesFreed += screenshot.fileSize;
            } catch (error) {
              this.logger.warn(
                `Failed to delete task screenshot file ${screenshot.filePath}: ${getErrorMessage(error)}`,
              );
            }
          }
        }

        // Calculate task size
        const taskSize = this.calculateTaskSize(task);

        // Delete task (cascade delete handles related records)
        await this.prismaService.browserTask.delete({
          where: { id: task.id },
        });

        result.recordsDeleted++;
        result.bytesFreed += taskSize;
      } catch (error) {
        result.errors.push({
          entityId: task.id,
          error: getErrorMessage(error),
        });
      }
    }

    result.recordsProcessed = tasksToDelete.length;
    return result;
  }

  /**
   * Cleanup browser screenshots based on retention policy and storage tier
   */
  private async cleanupBrowserScreenshots(
    policy: RetentionPolicy,
    archiveDate: Date,
    deleteDate: Date,
  ): Promise<EntityCleanupResult> {
    const result: EntityCleanupResult = {
      recordsProcessed: 0,
      recordsArchived: 0,
      recordsDeleted: 0,
      bytesFreed: 0,
      bytesArchived: 0,
      errors: [],
    };

    // Build where conditions based on policy
    const whereConditions: Prisma.BrowserScreenshotWhereInput = {
      AND: [
        { timestamp: { lt: deleteDate } },
        ...(policy.policyConditions?.maxAccessCount
          ? [{ accessCount: { lte: policy.policyConditions.maxAccessCount } }]
          : []),
        ...(policy.policyConditions?.minFileSize
          ? [{ fileSize: { gte: policy.policyConditions.minFileSize } }]
          : []),
        ...(policy.policyConditions?.storageExcludeList
          ? [
              {
                storageTier: {
                  notIn: policy.policyConditions.storageExcludeList,
                },
              },
            ]
          : []),
        ...(policy.policyConditions?.preserveProductionData
          ? [
              {
                OR: [
                  { metadata: { path: ['isProductionData'], equals: false } },
                  { metadata: { path: ['isProductionData'], equals: null } },
                ],
              },
            ]
          : []),
      ],
    };

    // Find screenshots to delete
    const screenshotsToDelete: BrowserScreenshotForDeletion[] =
      await this.prismaService.browserScreenshot.findMany({
        where: whereConditions,
      });

    // Delete screenshots and files
    for (const screenshot of screenshotsToDelete) {
      try {
        // Delete file from disk
        try {
          await fs.unlink(screenshot.filePath);
        } catch (error) {
          this.logger.warn(
            `Failed to delete screenshot file ${screenshot.filePath}: ${getErrorMessage(error)}`,
          );
        }

        // Delete database record
        await this.prismaService.browserScreenshot.delete({
          where: { id: screenshot.id },
        });

        result.recordsDeleted++;
        result.bytesFreed += screenshot.fileSize;
      } catch (error) {
        result.errors.push({
          entityId: screenshot.id,
          error: getErrorMessage(error),
        });
      }
    }

    result.recordsProcessed = screenshotsToDelete.length;
    return result;
  }

  /**
   * Cleanup browser DOM snapshots based on retention policy
   */
  private async cleanupBrowserDomSnapshots(
    policy: RetentionPolicy,
    archiveDate: Date,
    deleteDate: Date,
  ): Promise<EntityCleanupResult> {
    const result: EntityCleanupResult = {
      recordsProcessed: 0,
      recordsArchived: 0,
      recordsDeleted: 0,
      bytesFreed: 0,
      bytesArchived: 0,
      errors: [],
    };

    // Find DOM snapshots to delete
    const domSnapshotsToDelete: BrowserDomSnapshotForDeletion[] =
      await this.prismaService.browserDomSnapshot.findMany({
        where: {
          AND: [
            { timestamp: { lt: deleteDate } },
            // Note: accessCount field not available in current schema
            // ...(policy.policyConditions?.maxAccessCount
            //   ? [
            //       {
            //         accessCount: {
            //           lte: policy.policyConditions.maxAccessCount,
            //         },
            //       },
            //     ]
            //   : []),
            ...(policy.policyConditions?.minFileSize
              ? [{ fileSize: { gte: policy.policyConditions.minFileSize } }]
              : []),
            // Note: storageTier field not available in current schema
            // ...(policy.policyConditions?.storageExcludeList
            //   ? [
            //       {
            //         storageTier: {
            //           notIn: policy.policyConditions.storageExcludeList,
            //         },
            //       },
            //     ]
            //   : []),
            ...(policy.policyConditions?.preserveProductionData
              ? [
                  {
                    OR: [
                      {
                        metadata: { path: ['isProductionData'], equals: false },
                      },
                      {
                        metadata: { path: ['isProductionData'], equals: null },
                      },
                    ],
                  },
                ]
              : []),
          ],
        },
      });

    // Delete DOM snapshots
    for (const domSnapshot of domSnapshotsToDelete) {
      try {
        const snapshotSize = domSnapshot.fileSize || 0; // Note: originalSize field not available in current schema

        // Delete database record
        await this.prismaService.browserDomSnapshot.delete({
          where: { id: domSnapshot.id },
        });

        result.recordsDeleted++;
        result.bytesFreed += snapshotSize;
      } catch (error) {
        result.errors.push({
          entityId: domSnapshot.id,
          error: getErrorMessage(error),
        });
      }
    }

    result.recordsProcessed = domSnapshotsToDelete.length;
    return result;
  }

  /**
   * Cleanup browser data extractions based on retention policy
   */
  private async cleanupBrowserDataExtractions(
    policy: RetentionPolicy,
    archiveDate: Date,
    deleteDate: Date,
  ): Promise<EntityCleanupResult> {
    const result: EntityCleanupResult = {
      recordsProcessed: 0,
      recordsArchived: 0,
      recordsDeleted: 0,
      bytesFreed: 0,
      bytesArchived: 0,
      errors: [],
    };

    // Find data extractions to delete
    const extractionsToDelete: BrowserDataExtractionForDeletion[] =
      await this.prismaService.browserDataExtraction.findMany({
        where: {
          AND: [
            { extractedAt: { lt: deleteDate } },
            ...(policy.policyConditions?.preserveProductionData
              ? [
                  {
                    OR: [
                      {
                        metadata: { path: ['isProductionData'], equals: false },
                      },
                      {
                        metadata: { path: ['isProductionData'], equals: null },
                      },
                      // Note: sensitivityLevel field not available in current schema
                      // { sensitivityLevel: { in: ['low', 'medium'] } },
                    ],
                  },
                ]
              : []),
          ],
        },
      });

    // Delete data extractions
    for (const extraction of extractionsToDelete) {
      try {
        // Calculate size based on extracted data
        const extractionSize = this.calculateExtractionSize(extraction);

        // Delete database record
        await this.prismaService.browserDataExtraction.delete({
          where: { id: extraction.id },
        });

        result.recordsDeleted++;
        result.bytesFreed += extractionSize;
      } catch (error) {
        result.errors.push({
          entityId: extraction.id,
          error: getErrorMessage(error),
        });
      }
    }

    result.recordsProcessed = extractionsToDelete.length;
    return result;
  }

  /**
   * Generate comprehensive data retention report
   */
  async generateRetentionReport(
    startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: Date = new Date(),
  ): Promise<DataRetentionReport> {
    this.logger.log(
      `Generating retention report for period ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    // Note: cleanupExecutionLog model not available in current schema
    // Get cleanup execution logs for the period (using empty array as fallback)
    const executionLogs: CleanupExecutionLogData[] = []; // await this.prismaService.cleanupExecutionLog.findMany({
    //   where: {
    //     executionStartedAt: {
    //       gte: startDate,
    //       lte: endDate,
    //     },
    //   },
    //   include: {
    //     policy: true,
    //   },
    //   orderBy: {
    //     executionStartedAt: 'desc',
    //   },
    // });

    // Transform logs to execution results
    const policyExecutions: CleanupExecutionResult[] = executionLogs.map(
      (log) => ({
        policyId: log.policyId,
        executionId: log.id,
        startTime: log.executionStartedAt,
        endTime: log.executionCompletedAt || undefined,
        recordsProcessed: log.recordsProcessed,
        recordsArchived: log.recordsArchived,
        recordsDeleted: log.recordsDeleted,
        bytesFreed: Number(log.bytesFreed),
        bytesArchived: 0, // Not tracked in legacy logs
        errorsCount: log.errorsCount,
        errorDetails: log.errorDetails,
        executionStatus: log.executionStatus,
        performanceMetrics: {
          processingRatePerSecond: 0,
          averageDeletionTimeMs: 0,
          peakMemoryUsageMb: 0,
        },
      }),
    );

    // Calculate aggregate statistics
    const totalRecordsProcessed = policyExecutions.reduce(
      (sum, exec) => sum + exec.recordsProcessed,
      0,
    );
    const totalRecordsDeleted = policyExecutions.reduce(
      (sum, exec) => sum + exec.recordsDeleted,
      0,
    );
    const totalRecordsArchived = policyExecutions.reduce(
      (sum, exec) => sum + exec.recordsArchived,
      0,
    );
    const totalBytesFreed = policyExecutions.reduce(
      (sum, exec) => sum + exec.bytesFreed,
      0,
    );
    const totalBytesArchived = policyExecutions.reduce(
      (sum, exec) => sum + exec.bytesArchived,
      0,
    );

    // Assess compliance status
    const failedExecutions = policyExecutions.filter(
      (exec) => exec.executionStatus === 'failed',
    );
    const complianceStatus =
      failedExecutions.length === 0
        ? 'compliant'
        : failedExecutions.length < policyExecutions.length / 2
          ? 'partial'
          : 'non-compliant';

    // Generate recommendations
    const recommendations: string[] = [];

    if (failedExecutions.length > 0) {
      recommendations.push(
        `${failedExecutions.length} cleanup executions failed. Review error logs and adjust policies.`,
      );
    }

    if (totalBytesFreed > 1024 * 1024 * 1024) {
      // > 1GB
      recommendations.push(
        'Consider implementing more aggressive compression policies to reduce storage usage.',
      );
    }

    if (totalRecordsProcessed === 0) {
      recommendations.push(
        'No records processed during retention period. Review policy schedules and conditions.',
      );
    }

    // Calculate storage optimization savings
    const beforeCleanup =
      totalBytesFreed +
      totalBytesArchived +
      (await this.getCurrentStorageUsage());
    const afterCleanup = await this.getCurrentStorageUsage();
    const spaceSaved = totalBytesFreed;
    const percentageSaved =
      beforeCleanup > 0 ? (spaceSaved / beforeCleanup) * 100 : 0;

    return {
      reportId: `retention_report_${Date.now()}`,
      generatedAt: new Date(),
      reportPeriod: {
        startDate,
        endDate,
      },
      policyExecutions,
      totalRecordsProcessed,
      totalRecordsDeleted,
      totalRecordsArchived,
      totalBytesFreed,
      totalBytesArchived,
      complianceStatus,
      recommendations,
      storageOptimizationSavings: {
        beforeCleanup,
        afterCleanup,
        spaceSaved,
        percentageSaved,
      },
    };
  }

  /**
   * Get current cleanup operation statuses
   */
  getActiveCleanupOperations(): CleanupExecutionResult[] {
    return Array.from(this.activeCleanupOperations.values());
  }

  /**
   * Cancel a running cleanup operation
   */
  cancelCleanupOperation(executionId: string): boolean {
    const operation = this.activeCleanupOperations.get(executionId);

    if (operation && operation.executionStatus === 'running') {
      operation.executionStatus = 'cancelled';
      operation.endTime = new Date();

      this.logger.log(`Cleanup operation ${executionId} cancelled`);
      return true;
    }

    return false;
  }

  // ===== PRIVATE HELPER METHODS =====

  private async archiveBrowserSession(
    session: BrowserSessionWithIncludes,
  ): Promise<void> {
    // In a full implementation, this would compress and archive the session data
    // For now, we'll just mark it as archived in metadata
    await this.prismaService.browserSession.update({
      where: { id: session.id },
      data: {
        metadata: {
          ...(session.metadata as object),
          archived: true,
          archivedAt: new Date(),
        },
      },
    });
  }

  private calculateSessionSize(
    session: BrowserSessionWithIncludes | BrowserSessionForDeletion,
  ): number {
    let size = 0;

    // Estimate base session size
    size += 1024; // Base session record

    // Add screenshot sizes
    if (session.screenshots) {
      for (const screenshot of session.screenshots) {
        size += screenshot.fileSize ?? 0;
      }
    }

    // Add DOM snapshot sizes
    if ('domSnapshots' in session && session.domSnapshots) {
      for (const snapshot of session.domSnapshots) {
        size += snapshot.fileSize ?? 0;
      }
    }

    return size;
  }

  private calculateTaskSize(task: BrowserTaskForDeletion): number {
    let size = 0;

    // Estimate base task size
    size += 2048; // Base task record with actions/configuration

    // Add screenshot sizes
    if (task.screenshots) {
      for (const screenshot of task.screenshots) {
        size += screenshot.fileSize ?? 0;
      }
    }

    // Add DOM snapshot sizes
    if (task.domSnapshots) {
      for (const snapshot of task.domSnapshots) {
        size += snapshot.fileSize ?? 0;
      }
    }

    // Add data extraction sizes
    if (task.dataExtractions) {
      size += task.dataExtractions.length * 512; // Estimate extraction size
    }

    return size;
  }

  private calculateExtractionSize(
    extraction: BrowserDataExtractionForDeletion,
  ): number {
    // Estimate size based on extracted data content
    let size = 512; // Base record size

    if (extraction.extractedData) {
      size += JSON.stringify(extraction.extractedData).length;
    }

    if (extraction.rawContent) {
      size += extraction.rawContent.length;
    }

    if (extraction.processedContent) {
      size += JSON.stringify(extraction.processedContent).length;
    }

    return size;
  }

  private async getCurrentStorageUsage(): Promise<number> {
    // Get total storage usage from all browser automation entities
    const screenshotStats =
      await this.prismaService.browserScreenshot.aggregate({
        _sum: { fileSize: true },
      });

    const domSnapshotStats =
      await this.prismaService.browserDomSnapshot.aggregate({
        _sum: { fileSize: true }, // Note: originalSize field not available in current schema
      });

    return (
      (screenshotStats._sum.fileSize || 0) +
      (domSnapshotStats._sum.fileSize || 0) // Using fileSize instead of originalSize
    );
  }

  private logCleanupExecution(_result: CleanupExecutionResult): void {
    try {
      // Note: cleanupExecutionLog model not available in current schema
      // await this.prismaService.cleanupExecutionLog.create({
      //   data: {
      //     policyId: result.policyId,
      //     executionStartedAt: result.startTime,
      //     executionCompletedAt: result.endTime,
      //     recordsProcessed: result.recordsProcessed,
      //     recordsArchived: result.recordsArchived,
      //     recordsDeleted: result.recordsDeleted,
      //     bytesFreed: BigInt(result.bytesFreed),
      //     errorsCount: result.errorsCount,
      //     errorDetails: result.errorDetails,
      //     executionStatus: result.executionStatus,
      //   },
      // });
    } catch (error) {
      this.logger.error(
        `Failed to log cleanup execution: ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Type guard to validate screenshot object has required properties for file deletion
   */
  private isValidScreenshotForDeletion(
    screenshot: unknown,
  ): screenshot is SafeScreenshot {
    return (
      typeof screenshot === 'object' &&
      screenshot !== null &&
      'id' in screenshot &&
      'filePath' in screenshot &&
      'fileSize' in screenshot &&
      typeof (screenshot as SafeScreenshot).id === 'string' &&
      typeof (screenshot as SafeScreenshot).filePath === 'string' &&
      typeof (screenshot as SafeScreenshot).fileSize === 'number'
    );
  }
}
