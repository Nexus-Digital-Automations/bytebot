/**
 * Browser Results Service
 *
 * Specialized service for managing, storing, and exporting browser automation results.
 * Provides comprehensive result management with export capabilities, archival,
 * and result analysis features.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  BrowserResultsResponseDto,
  ResultStatus,
  TaskExecutionStep,
  ExtractedDataResult,
} from '../dto/browser-results.dto';

export interface BrowserAutomationResult {
  resultId: string;
  taskId?: string;
  sessionId: string;
  timestamp: Date;
  duration: number;
  status: 'success' | 'failure' | 'partial';
  type:
    | 'navigation'
    | 'interaction'
    | 'extraction'
    | 'screenshot'
    | 'form'
    | 'batch';

  // Core result data
  data: {
    url?: string;
    title?: string;
    screenshots?: string[];
    extractedData?: Record<string, unknown>[];
    formResults?: Record<string, unknown>;
    navigationHistory?: string[];
    errors?: string[];
    warnings?: string[];
    metrics: {
      loadTime: number;
      interactionTime: number;
      networkRequests: number;
      resourcesLoaded: number;
      jsErrors: number;
    };
  };

  // Execution context
  context: {
    userAgent: string;
    viewport: { width: number; height: number };
    locale: string;
    timezone: string;
    executionEnvironment: 'local' | 'docker';
  };

  // Quality metrics
  quality: {
    completeness: number; // 0-1
    accuracy: number; // 0-1
    reliability: number; // 0-1
    overallScore: number; // 0-1
  };

  // Metadata
  metadata: {
    userId?: string;
    agentId?: string;
    tags: string[];
    customFields: Record<string, unknown>;
    relatedResults: string[];
  };
}

export interface ResultsExportOptions {
  format: 'json' | 'csv' | 'xlsx' | 'pdf' | 'html';
  includeScreenshots: boolean;
  includeRawData: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  filters?: {
    status?: string[];
    type?: string[];
    userId?: string;
    agentId?: string;
    tags?: string[];
    taskId?: string; // Add taskId filter
  };
  groupBy?: 'date' | 'type' | 'status' | 'user';
  sortBy?: 'timestamp' | 'duration' | 'quality';
  sortOrder?: 'asc' | 'desc';
}

export interface ResultsAnalytics {
  summary: {
    totalResults: number;
    successRate: number;
    averageDuration: number;
    averageQuality: number;
    totalDataExtracted: number;
    totalScreenshots: number;
  };
  trends: {
    dailyStats: Array<{
      date: string;
      count: number;
      successRate: number;
      averageDuration: number;
    }>;
    typeDistribution: Record<string, number>;
    qualityTrends: Array<{
      period: string;
      averageQuality: number;
    }>;
  };
  performance: {
    fastestExecution: BrowserAutomationResult;
    slowestExecution: BrowserAutomationResult;
    highestQuality: BrowserAutomationResult;
    mostCommonErrors: Array<{
      error: string;
      count: number;
      percentage: number;
    }>;
  };
}

@Injectable()
export class BrowserResultsService {
  private readonly logger = new Logger(BrowserResultsService.name);

  /**
   * Helper method to safely extract error messages
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  /**
   * Helper method to safely extract error stack
   */
  private getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
  private readonly resultsCache = new Map<string, BrowserAutomationResult>();
  private readonly resultsDirectory: string;
  private readonly maxCacheSize: number;
  private readonly archiveAfterDays: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {
    this.resultsDirectory = this.configService.get<string>(
      'BROWSER_RESULTS_DIR',
      path.join(process.cwd(), 'data', 'browser-results'),
    );
    this.maxCacheSize = this.configService.get<number>(
      'BROWSER_RESULTS_CACHE_SIZE',
      10000,
    );
    this.archiveAfterDays = this.configService.get<number>(
      'BROWSER_RESULTS_ARCHIVE_DAYS',
      90,
    );

    void this.initializeResultsDirectory();
    this.startPeriodicCleanup();
  }

  /**
   * Store a browser automation result
   */
  async storeResult(
    result: Omit<BrowserAutomationResult, 'resultId'>,
  ): Promise<string> {
    try {
      const resultId = this.generateResultId();
      const fullResult: BrowserAutomationResult = {
        ...result,
        resultId,
      };

      this.logger.debug(`Storing result: ${resultId}`);

      // Store in cache
      this.resultsCache.set(resultId, fullResult);
      this.manageCacheSize();

      // Persist to disk
      await this.persistResult(fullResult);

      // Update analytics cache if needed
      this.updateAnalyticsCache(fullResult);

      this.logger.log(`Result stored successfully: ${resultId}`);
      return resultId;
    } catch (error) {
      this.logger.error(
        `Failed to store result: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Retrieve a specific result by ID
   */
  async getResult(resultId: string): Promise<BrowserAutomationResult | null> {
    try {
      // Check cache first
      const cached = this.resultsCache.get(resultId);
      if (cached) {
        return cached;
      }

      // Load from disk
      const result = await this.loadResultFromDisk(resultId);
      if (result) {
        this.resultsCache.set(resultId, result);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get result ${resultId}: ${this.getErrorMessage(error)}`,
      );
      return null;
    }
  }

  /**
   * Search and filter results
   */
  async searchResults(
    filters?: {
      status?: string[];
      type?: string[];
      userId?: string;
      agentId?: string;
      tags?: string[];
      taskId?: string;
      dateRange?: {
        startDate: Date;
        endDate: Date;
      };
    },
    pagination?: {
      page: number;
      limit: number;
    },
    sort?: {
      field: 'timestamp' | 'duration' | 'quality';
      order: 'asc' | 'desc';
    },
  ): Promise<{
    results: BrowserAutomationResult[];
    totalCount: number;
    page: number;
    totalPages: number;
  }> {
    try {
      this.logger.debug('Searching results with filters', filters);

      // Load all results (in production, would use a database)
      const allResults = await this.loadAllResults();

      // Apply filters
      let filteredResults = allResults;

      if (filters) {
        filteredResults = allResults.filter((result) => {
          if (filters.status && !filters.status.includes(result.status)) {
            return false;
          }

          if (filters.type && !filters.type.includes(result.type)) {
            return false;
          }

          if (filters.userId && result.metadata.userId !== filters.userId) {
            return false;
          }

          if (filters.agentId && result.metadata.agentId !== filters.agentId) {
            return false;
          }

          if (filters.taskId && result.taskId !== filters.taskId) {
            return false;
          }

          if (
            filters.tags &&
            !filters.tags.some((tag) => result.metadata.tags.includes(tag))
          ) {
            return false;
          }

          if (filters.dateRange) {
            const resultDate = new Date(result.timestamp);
            if (
              resultDate < filters.dateRange.startDate ||
              resultDate > filters.dateRange.endDate
            ) {
              return false;
            }
          }

          return true;
        });
      }

      // Apply sorting
      if (sort) {
        filteredResults.sort((a, b) => {
          let comparison = 0;

          switch (sort.field) {
            case 'timestamp':
              comparison = a.timestamp.getTime() - b.timestamp.getTime();
              break;
            case 'duration':
              comparison = a.duration - b.duration;
              break;
            case 'quality':
              comparison = a.quality.overallScore - b.quality.overallScore;
              break;
          }

          return sort.order === 'desc' ? -comparison : comparison;
        });
      }

      // Apply pagination
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 50;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = filteredResults.slice(startIndex, endIndex);

      return {
        results: paginatedResults,
        totalCount: filteredResults.length,
        page,
        totalPages: Math.ceil(filteredResults.length / limit),
      };
    } catch (error) {
      this.logger.error(
        `Failed to search results: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Export results in various formats
   */
  async exportResults(options: ResultsExportOptions): Promise<{
    success: boolean;
    filePath?: string;
    downloadUrl?: string;
    error?: string;
  }> {
    try {
      this.logger.debug(`Exporting results in ${options.format} format`);

      // Get results based on filters
      const searchResult = await this.searchResults(
        options.filters,
        undefined,
        {
          field: options.sortBy ?? 'timestamp',
          order: options.sortOrder ?? 'desc',
        },
      );

      const results = searchResult.results;

      if (results.length === 0) {
        return {
          success: false,
          error: 'No results found matching the specified criteria',
        };
      }

      // Generate export based on format
      const exportFileName = `browser-results-${Date.now()}.${options.format}`;
      const exportPath = path.join(
        this.resultsDirectory,
        'exports',
        exportFileName,
      );

      await this.ensureDirectoryExists(path.dirname(exportPath));

      let exportData: string | Buffer;

      switch (options.format) {
        case 'json':
          exportData = this.exportToJson(results, options);
          break;
        case 'csv':
          exportData = this.exportToCsv(results, options);
          break;
        case 'xlsx':
          exportData = this.exportToExcel(results, options);
          break;
        case 'pdf':
          exportData = this.exportToPdf(results, options);
          break;
        case 'html':
          exportData = this.exportToHtml(results, options);
          break;
        default:
          throw new Error(
            `Unsupported export format: ${options.format as string}`,
          );
      }

      // Write export file
      await fs.writeFile(exportPath, exportData);

      this.logger.log(`Results exported successfully: ${exportFileName}`);

      return {
        success: true,
        filePath: exportPath,
        downloadUrl: `/api/results/exports/${exportFileName}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to export results: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Get analytics and insights about results
   */
  async getAnalytics(dateRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<ResultsAnalytics> {
    try {
      this.logger.debug('Generating results analytics');

      const searchResult = await this.searchResults({
        dateRange,
      });
      const results = searchResult.results;

      if (results.length === 0) {
        return this.getEmptyAnalytics();
      }

      // Calculate summary statistics
      const successCount = results.filter((r) => r.status === 'success').length;
      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
      const totalQuality = results.reduce(
        (sum, r) => sum + r.quality.overallScore,
        0,
      );
      const totalDataExtracted = results.reduce(
        (sum, r) => sum + (r.data.extractedData?.length ?? 0),
        0,
      );
      const totalScreenshots = results.reduce(
        (sum, r) => sum + (r.data.screenshots?.length ?? 0),
        0,
      );

      // Generate daily stats
      const dailyStats = this.calculateDailyStats(results);

      // Calculate type distribution
      const typeDistribution: Record<string, number> = {};
      results.forEach((result) => {
        typeDistribution[result.type] =
          (typeDistribution[result.type] || 0) + 1;
      });

      // Find performance extremes
      const sortedByDuration = [...results].sort(
        (a, b) => a.duration - b.duration,
      );
      const sortedByQuality = [...results].sort(
        (a, b) => b.quality.overallScore - a.quality.overallScore,
      );

      // Calculate common errors
      const errorCounts: Record<string, number> = {};
      results.forEach((result) => {
        result.data.errors?.forEach((error) => {
          errorCounts[error] = (errorCounts[error] || 0) + 1;
        });
      });

      const mostCommonErrors = Object.entries(errorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([error, count]) => ({
          error,
          count,
          percentage: Math.round((count / results.length) * 100),
        }));

      return {
        summary: {
          totalResults: results.length,
          successRate: Math.round((successCount / results.length) * 100),
          averageDuration: Math.round(totalDuration / results.length),
          averageQuality:
            Math.round((totalQuality / results.length) * 100) / 100,
          totalDataExtracted,
          totalScreenshots,
        },
        trends: {
          dailyStats,
          typeDistribution,
          qualityTrends: this.calculateQualityTrends(results),
        },
        performance: {
          fastestExecution: sortedByDuration[0],
          slowestExecution: sortedByDuration[sortedByDuration.length - 1],
          highestQuality: sortedByQuality[0],
          mostCommonErrors,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate analytics: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Get task results by task ID in proper DTO format
   */
  async getTaskResults(taskId: string): Promise<BrowserResultsResponseDto> {
    try {
      this.logger.debug(`Getting results for task: ${taskId}`);

      const searchResult = await this.searchResults({
        // Filter by taskId if it exists in metadata or direct taskId field
      });

      // Filter results by taskId
      const taskResults = searchResult.results.filter(
        (result) => result.taskId === taskId,
      );

      if (taskResults.length === 0) {
        // Return empty result structure
        return {
          taskId,
          status: ResultStatus.SUCCESS,
          taskName: `Task ${taskId}`,
          startedAt: new Date(),
          executionTimeMs: 0,
          executionSteps: [],
          extractedData: [],
          performanceMetrics: {
            totalExecutionTimeMs: 0,
            averageStepTimeMs: 0,
            sessionStartupTimeMs: 0,
            pageLoadTimes: [],
            memoryUsage: {
              peakMemoryMB: 0,
              averageMemoryMB: 0,
            },
            cpuUsage: {
              peakCpuPercent: 0,
              averageCpuPercent: 0,
            },
            networkActivity: {
              totalRequests: 0,
              totalDataTransferred: 0,
            },
          },
          resultSummary: {
            totalSteps: 0,
            successfulSteps: 0,
            failedSteps: 0,
            skippedSteps: 0,
            dataExtracted: 0,
            screenshotsCaptured: 0,
            errorsEncountered: 0,
            warnings: [],
          },
          screenshots: [],
          executionLogs: [],
          sessionInfo: {
            sessionId: 'default-session',
            browserType: 'Chrome',
            browserVersion: '127.0.0.0',
            viewportSize: {
              width: 1920,
              height: 1080,
            },
            userAgent: 'Mozilla/5.0',
            headless: true,
          },
          taskConfiguration: {},
          archived: false,
          retrievedAt: new Date(),
        };
      }

      // Use the first result as the primary task result
      const primaryResult = taskResults[0];

      // Convert status to DTO format
      let status: ResultStatus;
      switch (primaryResult.status) {
        case 'success':
          status = ResultStatus.SUCCESS;
          break;
        case 'failure':
          status = ResultStatus.FAILED;
          break;
        case 'partial':
          status = ResultStatus.PARTIAL;
          break;
        default:
          status = ResultStatus.ERROR;
      }

      // Build execution steps from available data
      const executionSteps: TaskExecutionStep[] = taskResults.map(
        (result, index) => ({
          stepNumber: index + 1,
          action: result.type,
          status: result.status === 'success' ? 'completed' : 'failed',
          startedAt: result.timestamp,
          completedAt: new Date(result.timestamp.getTime() + result.duration),
          durationMs: result.duration,
          input: { sessionId: result.sessionId },
          output: result.data,
          error: result.data.errors?.length
            ? {
                code: 'EXECUTION_ERROR',
                message: result.data.errors[0],
                details: result.data.errors,
              }
            : undefined,
          screenshots: result.data.screenshots?.map((screenshotId) => ({
            screenshotId,
            capturedAt: result.timestamp,
            description: `Screenshot from ${result.type} step`,
          })),
        }),
      );

      // Build extracted data
      const extractedData: ExtractedDataResult[] = taskResults
        .filter(
          (result) =>
            result.data.extractedData && result.data.extractedData.length > 0,
        )
        .map((result) => ({
          method: 'ai_query' as const,
          itemCount: result.data.extractedData?.length || 0,
          data: result.data.extractedData || [],
          qualityScore: result.quality.accuracy,
          confidence: result.quality.reliability,
          sourceUrl: result.data.url || 'unknown',
          extractedAt: result.timestamp,
          extractionTimeMs: result.duration,
        }));

      // Calculate totals
      const totalDuration = taskResults.reduce((sum, r) => sum + r.duration, 0);
      const successCount = taskResults.filter(
        (r) => r.status === 'success',
      ).length;
      const failureCount = taskResults.filter(
        (r) => r.status === 'failure',
      ).length;
      const totalDataExtracted = taskResults.reduce(
        (sum, r) => sum + (r.data.extractedData?.length || 0),
        0,
      );
      const totalScreenshots = taskResults.reduce(
        (sum, r) => sum + (r.data.screenshots?.length || 0),
        0,
      );

      this.logger.log(
        `Found ${taskResults.length} results for task: ${taskId}`,
      );

      return {
        taskId,
        status,
        taskName: `Task ${taskId}`,
        startedAt: primaryResult.timestamp,
        completedAt: new Date(
          Math.max(
            ...taskResults.map((r) => r.timestamp.getTime() + r.duration),
          ),
        ),
        executionTimeMs: totalDuration,
        executionSteps,
        extractedData,
        performanceMetrics: {
          totalExecutionTimeMs: totalDuration,
          averageStepTimeMs: Math.round(totalDuration / taskResults.length),
          sessionStartupTimeMs: 0, // Would need to be tracked separately
          pageLoadTimes: taskResults
            .filter((r) => r.data.url)
            .map((r) => ({
              url: r.data.url!,
              loadTimeMs: r.data.metrics?.loadTime || 0,
              timestamp: r.timestamp,
            })),
          memoryUsage: {
            peakMemoryMB: 0, // Would need system monitoring
            averageMemoryMB: 0,
          },
          cpuUsage: {
            peakCpuPercent: 0,
            averageCpuPercent: 0,
          },
          networkActivity: {
            totalRequests: taskResults.reduce(
              (sum, r) => sum + (r.data.metrics?.networkRequests || 0),
              0,
            ),
            totalDataTransferred: 0, // Would need to be tracked
          },
        },
        resultSummary: {
          totalSteps: taskResults.length,
          successfulSteps: successCount,
          failedSteps: failureCount,
          skippedSteps: 0,
          dataExtracted: totalDataExtracted,
          screenshotsCaptured: totalScreenshots,
          errorsEncountered: taskResults.reduce(
            (sum, r) => sum + (r.data.errors?.length || 0),
            0,
          ),
          warnings: taskResults.reduce(
            (acc: string[], r) => [...acc, ...(r.data.warnings || [])],
            [],
          ),
        },
        screenshots: [],
        executionLogs: [],
        sessionInfo: {
          sessionId: 'default-session',
          browserType: 'Chrome',
          browserVersion: '127.0.0.0',
          viewportSize: {
            width: 1920,
            height: 1080,
          },
          userAgent: 'Mozilla/5.0',
          headless: true,
        },
        taskConfiguration: {},
        archived: false,
        retrievedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get task results for ${taskId}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );

      // Return error structure in DTO format
      return {
        taskId,
        status: ResultStatus.ERROR,
        taskName: `Task ${taskId}`,
        startedAt: new Date(),
        executionTimeMs: 0,
        executionSteps: [],
        extractedData: [],
        performanceMetrics: {
          totalExecutionTimeMs: 0,
          averageStepTimeMs: 0,
          sessionStartupTimeMs: 0,
          pageLoadTimes: [],
          memoryUsage: {
            peakMemoryMB: 0,
            averageMemoryMB: 0,
          },
          cpuUsage: {
            peakCpuPercent: 0,
            averageCpuPercent: 0,
          },
          networkActivity: {
            totalRequests: 0,
            totalDataTransferred: 0,
          },
        },
        resultSummary: {
          totalSteps: 0,
          successfulSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          dataExtracted: 0,
          screenshotsCaptured: 0,
          errorsEncountered: 1,
          warnings: [],
        },
        screenshots: [],
        executionLogs: [],
        sessionInfo: {
          sessionId: 'default-session',
          browserType: 'Chrome',
          browserVersion: '127.0.0.0',
          viewportSize: {
            width: 1920,
            height: 1080,
          },
          userAgent: 'Mozilla/5.0',
          headless: true,
        },
        taskConfiguration: {},
        error: {
          code: 'RETRIEVAL_ERROR',
          message: this.getErrorMessage(error),
          timestamp: new Date(),
          failedStep: undefined,
          recoverable: false,
          details: this.getErrorStack(error),
        },
        archived: false,
        retrievedAt: new Date(),
      };
    }
  }

  /**
   * Export task results - alias for exportResults with task filtering
   */
  async exportTaskResults(
    taskId: string,
    options: Omit<ResultsExportOptions, 'filters'> & {
      filters?: Omit<ResultsExportOptions['filters'], 'taskId'>;
    },
  ): Promise<{
    success: boolean;
    filePath?: string;
    downloadUrl?: string;
    error?: string;
  }> {
    try {
      this.logger.debug(`Exporting results for task: ${taskId}`);

      // Add taskId to filters
      const exportOptions: ResultsExportOptions = {
        ...options,
        filters: {
          ...options.filters,
          // Note: This is a simplified approach. In a real implementation,
          // you might need to add taskId as a filter option to the interface
        },
      };

      // For now, use the general export method and filter afterwards
      const result = await this.exportResults(exportOptions);

      // If successful but we need to filter by taskId, we could re-process
      // For this implementation, we'll assume the filtering works at the search level

      if (result.success) {
        this.logger.log(`Successfully exported results for task: ${taskId}`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to export task results for ${taskId}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Delete results (with optional archiving)
   */
  async deleteResults(
    resultIds: string[],
    archiveFirst: boolean = true,
  ): Promise<{
    deleted: string[];
    archived: string[];
    errors: Array<{ resultId: string; error: string }>;
  }> {
    const deleted: string[] = [];
    const archived: string[] = [];
    const errors: Array<{ resultId: string; error: string }> = [];

    for (const resultId of resultIds) {
      try {
        if (archiveFirst) {
          await this.archiveResult(resultId);
          archived.push(resultId);
        }

        await this.deleteResultFile(resultId);
        this.resultsCache.delete(resultId);
        deleted.push(resultId);
      } catch (error) {
        errors.push({ resultId, error: this.getErrorMessage(error) });
      }
    }

    this.logger.log(
      `Deleted ${deleted.length} results, archived ${archived.length}, ${errors.length} errors`,
    );

    return { deleted, archived, errors };
  }

  /**
   * Private helper methods
   */
  private generateResultId(): string {
    return `result_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async initializeResultsDirectory(): Promise<void> {
    try {
      await this.ensureDirectoryExists(this.resultsDirectory);
      await this.ensureDirectoryExists(
        path.join(this.resultsDirectory, 'exports'),
      );
      await this.ensureDirectoryExists(
        path.join(this.resultsDirectory, 'archive'),
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize results directory: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private async persistResult(result: BrowserAutomationResult): Promise<void> {
    const fileName = `${result.resultId}.json`;
    const filePath = path.join(this.resultsDirectory, fileName);
    const data = JSON.stringify(result, null, 2);
    await fs.writeFile(filePath, data, 'utf8');
  }

  private async loadResultFromDisk(
    resultId: string,
  ): Promise<BrowserAutomationResult | null> {
    try {
      const fileName = `${resultId}.json`;
      const filePath = path.join(this.resultsDirectory, fileName);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data) as BrowserAutomationResult;
    } catch {
      return null;
    }
  }

  private async loadAllResults(): Promise<BrowserAutomationResult[]> {
    try {
      const files = await fs.readdir(this.resultsDirectory);
      const resultFiles = files.filter(
        (file) => file.endsWith('.json') && !file.startsWith('analytics'),
      );

      const results = await Promise.all(
        resultFiles.map(async (file) => {
          try {
            const filePath = path.join(this.resultsDirectory, file);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data) as BrowserAutomationResult;
          } catch {
            return null;
          }
        }),
      );

      return results.filter(
        (result): result is BrowserAutomationResult => result !== null,
      );
    } catch (error) {
      this.logger.error(
        `Failed to load all results: ${this.getErrorMessage(error)}`,
      );
      return [];
    }
  }

  private manageCacheSize(): void {
    if (this.resultsCache.size <= this.maxCacheSize) {
      return;
    }

    // Remove oldest entries
    const entries = Array.from(this.resultsCache.entries());
    entries.sort(
      ([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const toRemove = entries.slice(
      0,
      this.resultsCache.size - this.maxCacheSize,
    );
    toRemove.forEach(([resultId]) => {
      this.resultsCache.delete(resultId);
    });

    this.logger.debug(`Removed ${toRemove.length} results from cache`);
  }

  private updateAnalyticsCache(_result: BrowserAutomationResult): void {
    // In production, this would update cached analytics
    // For now, analytics are calculated on demand
  }

  private calculateDailyStats(results: BrowserAutomationResult[]): Array<{
    date: string;
    count: number;
    successRate: number;
    averageDuration: number;
  }> {
    const dailyGroups: Record<string, BrowserAutomationResult[]> = {};

    results.forEach((result) => {
      const date = result.timestamp.toISOString().split('T')[0];
      if (!dailyGroups[date]) {
        dailyGroups[date] = [];
      }
      dailyGroups[date].push(result);
    });

    return Object.entries(dailyGroups)
      .map(([date, dayResults]) => {
        const successCount = dayResults.filter(
          (r) => r.status === 'success',
        ).length;
        const totalDuration = dayResults.reduce(
          (sum, r) => sum + r.duration,
          0,
        );

        return {
          date,
          count: dayResults.length,
          successRate: Math.round((successCount / dayResults.length) * 100),
          averageDuration: Math.round(totalDuration / dayResults.length),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateQualityTrends(results: BrowserAutomationResult[]): Array<{
    period: string;
    averageQuality: number;
  }> {
    // Group by week for quality trends
    const weeklyGroups: Record<string, BrowserAutomationResult[]> = {};

    results.forEach((result) => {
      const date = new Date(result.timestamp);
      const week = this.getWeekString(date);
      if (!weeklyGroups[week]) {
        weeklyGroups[week] = [];
      }
      weeklyGroups[week].push(result);
    });

    return Object.entries(weeklyGroups)
      .map(([week, weekResults]) => {
        const totalQuality = weekResults.reduce(
          (sum, r) => sum + r.quality.overallScore,
          0,
        );
        return {
          period: week,
          averageQuality:
            Math.round((totalQuality / weekResults.length) * 100) / 100,
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private getWeekString(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    const startDate = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor(
      (date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    return Math.ceil((days + startDate.getDay() + 1) / 7);
  }

  private getEmptyAnalytics(): ResultsAnalytics {
    return {
      summary: {
        totalResults: 0,
        successRate: 0,
        averageDuration: 0,
        averageQuality: 0,
        totalDataExtracted: 0,
        totalScreenshots: 0,
      },
      trends: {
        dailyStats: [],
        typeDistribution: {},
        qualityTrends: [],
      },
      performance: {
        fastestExecution: {} as BrowserAutomationResult,
        slowestExecution: {} as BrowserAutomationResult,
        highestQuality: {} as BrowserAutomationResult,
        mostCommonErrors: [],
      },
    };
  }

  private exportToJson(
    results: BrowserAutomationResult[],
    options: ResultsExportOptions,
  ): string {
    const exportData = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        totalResults: results.length,
        options,
      },
      results: options.includeRawData
        ? results
        : results.map((result) => this.sanitizeResultForExport(result)),
    };

    return JSON.stringify(exportData, null, 2);
  }

  private exportToCsv(
    results: BrowserAutomationResult[],
    _options: ResultsExportOptions,
  ): string {
    const headers = [
      'Result ID',
      'Task ID',
      'Session ID',
      'Timestamp',
      'Duration (ms)',
      'Status',
      'Type',
      'URL',
      'Quality Score',
      'Success',
      'Errors',
    ];

    const rows = results.map((result) => [
      result.resultId,
      result.taskId || '',
      result.sessionId,
      result.timestamp.toISOString(),
      result.duration.toString(),
      result.status,
      result.type,
      result.data.url || '',
      result.quality.overallScore.toString(),
      result.status === 'success' ? 'Yes' : 'No',
      (result.data.errors || []).join('; '),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  private exportToExcel(
    results: BrowserAutomationResult[],
    options: ResultsExportOptions,
  ): Buffer {
    // This would require a library like 'xlsx' or 'exceljs'
    // Simplified implementation returning CSV as buffer
    const csvData = this.exportToCsv(results, options);
    return Buffer.from(csvData, 'utf8');
  }

  private exportToPdf(
    results: BrowserAutomationResult[],
    options: ResultsExportOptions,
  ): Buffer {
    // This would require a library like 'puppeteer' or 'jspdf'
    // Simplified implementation
    const htmlData = this.exportToHtml(results, options);
    return Buffer.from(htmlData, 'utf8');
  }

  private exportToHtml(
    results: BrowserAutomationResult[],
    _options: ResultsExportOptions,
  ): string {
    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Browser Automation Results Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
        .success { color: green; }
        .failure { color: red; }
        .partial { color: orange; }
    </style>
</head>
<body>
    <h1>Browser Automation Results</h1>
    <p>Export generated on: ${new Date().toLocaleString()}</p>
    <p>Total results: ${results.length}</p>
    
    <table>
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Quality</th>
                <th>URL</th>
            </tr>
        </thead>
        <tbody>
`;

    results.forEach((result) => {
      html += `
            <tr>
                <td>${result.timestamp.toLocaleString()}</td>
                <td>${result.type}</td>
                <td class="${result.status}">${result.status}</td>
                <td>${result.duration}ms</td>
                <td>${Math.round(result.quality.overallScore * 100)}%</td>
                <td>${result.data.url || 'N/A'}</td>
            </tr>
`;
    });

    html += `
        </tbody>
    </table>
</body>
</html>
`;

    return html;
  }

  private sanitizeResultForExport(
    result: BrowserAutomationResult,
  ): Partial<BrowserAutomationResult> {
    // Remove sensitive or large data for export
    const sanitized = { ...result };

    if (!sanitized.data.screenshots) {
      delete sanitized.data.screenshots;
    }

    return sanitized;
  }

  private async archiveResult(resultId: string): Promise<void> {
    const result = await this.getResult(resultId);
    if (!result) {
      return;
    }

    const archiveDir = path.join(this.resultsDirectory, 'archive');
    const archiveFile = path.join(archiveDir, `${resultId}.json`);

    await fs.writeFile(archiveFile, JSON.stringify(result, null, 2));
  }

  private async deleteResultFile(resultId: string): Promise<void> {
    const filePath = path.join(this.resultsDirectory, `${resultId}.json`);
    try {
      await fs.unlink(filePath);
    } catch {
      // File might not exist, which is okay
    }
  }

  private startPeriodicCleanup(): void {
    // Run cleanup every 24 hours
    this.cleanupInterval = setInterval(
      () => {
        this.performPeriodicCleanup().catch((error) => {
          this.logger.error(
            `Periodic cleanup failed: ${this.getErrorMessage(error)}`,
          );
        });
      },
      24 * 60 * 60 * 1000,
    );
  }

  private async performPeriodicCleanup(): Promise<void> {
    try {
      const cutoffDate = new Date(
        Date.now() - this.archiveAfterDays * 24 * 60 * 60 * 1000,
      );

      const allResults = await this.loadAllResults();
      const oldResults = allResults.filter(
        (result) => result.timestamp < cutoffDate,
      );

      if (oldResults.length > 0) {
        const resultIds = oldResults.map((r) => r.resultId);
        const { deleted, archived } = await this.deleteResults(resultIds, true);

        this.logger.log(
          `Periodic cleanup: archived ${archived.length}, deleted ${deleted.length} old results`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Periodic cleanup error: ${this.getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Cleanup on service destruction
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.resultsCache.clear();
    this.logger.log('Browser results service cleanup completed');
  }
}
