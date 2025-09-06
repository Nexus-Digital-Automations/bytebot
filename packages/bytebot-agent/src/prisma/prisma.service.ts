/**
 * Enhanced Prisma Service - Enterprise Database Integration
 * Integrates with DatabaseService for optimized connection management,
 * performance monitoring, and circuit breaker protection
 */

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService?: DatabaseService,
  ) {
    // Initialize with basic configuration
    // The DatabaseService will provide the optimized client when available
    super();

    this.logger.log('Prisma service initialized');
  }

  async onModuleInit() {
    this.logger.log('Prisma service module initialization started');

    try {
      // If DatabaseService is available, use its optimized client
      if (this.databaseService) {
        this.logger.log(
          'Using enterprise database service for connection management',
        );
        // The DatabaseService handles connection optimization
      } else {
        // Fallback to basic connection
        this.logger.log(
          'Using basic Prisma connection (DatabaseService not available)',
        );
        await this.$connect();
      }

      this.logger.log('Prisma service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Prisma service', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Prisma service shutdown initiated');

    try {
      // Only disconnect if we're managing the connection directly
      if (!this.databaseService) {
        await this.$disconnect();
        this.logger.log('Prisma client disconnected successfully');
      }
      // If DatabaseService is managing connections, let it handle cleanup
    } catch (error) {
      this.logger.error('Error during Prisma service shutdown', error);
    }
  }

  /**
   * Get optimized Prisma client from DatabaseService if available
   * Falls back to this instance if DatabaseService is not available
   */
  getOptimizedClient(): PrismaClient {
    if (this.databaseService) {
      try {
        return this.databaseService.getPrismaClient();
      } catch (error) {
        this.logger.warn(
          'Failed to get optimized client from DatabaseService, falling back to basic client',
          error,
        );
        return this;
      }
    }

    return this;
  }

  /**
   * Execute query with automatic optimization routing
   */
  async executeQuery<T>(
    queryFn: (client: PrismaClient) => Promise<T>,
  ): Promise<T> {
    const client = this.getOptimizedClient();
    return await queryFn(client);
  }

  /**
   * Get database health status through DatabaseService if available
   */
  async getHealthStatus() {
    if (this.databaseService) {
      return await this.databaseService.getHealthStatus();
    }

    // Basic health check fallback
    try {
      await this.$queryRaw`SELECT 1`;
      return {
        isHealthy: true,
        lastHealthCheck: new Date(),
        uptime: 0,
        connectionStatus: 'connected',
      };
    } catch (error) {
      return {
        isHealthy: false,
        lastHealthCheck: new Date(),
        uptime: 0,
        connectionStatus: 'disconnected',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get database metrics through DatabaseService if available
   */
  async getDatabaseMetrics() {
    if (this.databaseService) {
      return await this.databaseService.getMetrics();
    }

    // Return basic metrics if DatabaseService not available
    return {
      connectionPool: { active: 1, idle: 0, waiting: 0, total: 1 },
      performance: {
        averageQueryTime: 0,
        slowQueries: 0,
        totalQueries: 0,
        queriesPerSecond: 0,
      },
      health: {
        isConnected: true,
        lastHealthCheck: new Date(),
        uptime: 0,
        errorRate: 0,
      },
    };
  }
}
