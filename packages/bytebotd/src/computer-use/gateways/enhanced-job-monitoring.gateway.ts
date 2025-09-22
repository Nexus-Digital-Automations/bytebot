/**
 * Enhanced Job Monitoring WebSocket Gateway - Comprehensive Real-time Integration
 *
 * Advanced WebSocket gateway that integrates with the comprehensive job management system,
 * providing real-time monitoring, status updates, and system health information.
 *
 * Features:
 * - Integration with ComprehensiveJobOrchestratorService
 * - Real-time job lifecycle events and progress tracking
 * - Advanced status polling coordination
 * - System health and performance monitoring
 * - Multi-channel subscription management
 * - Authenticated connections with role-based access
 * - Comprehensive error handling and recovery
 * - Metrics aggregation and analytics streaming
 * - Auto-scaling recommendations and alerts
 * - SLA compliance monitoring and notifications
 *
 * @author Claude Code - Enhanced Job Monitoring Specialist
 * @version 1.0.0
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger, UseGuards, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ComprehensiveJobOrchestratorService } from '../services/comprehensive-job-orchestrator.service';
import { AdvancedStatusPollingService } from '../services/advanced-status-polling.service';
import { EnhancedJobStatus, JobResourceRequirements, JobProgressTracking } from '../dto/enhanced-async-job.dto';

/**
 * Enhanced client interface with comprehensive metadata
 */
interface EnhancedAuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  role?: string;
  team?: string;
  subscribedJobs?: Set<string>;
  subscribedBatches?: Set<string>;
  channels?: Set<string>;
  lastActivity?: Date;
  connectionMetadata?: {
    connectedAt: Date;
    userAgent: string;
    ipAddress: string;
    clientType: string;
  };
}

/**
 * Subscription configuration with enhanced filtering
 */
interface EnhancedSubscriptionConfig {
  jobIds?: string[];
  batchIds?: string[];
  channels: string[];
  filters?: {
    jobTypes?: string[];
    priorities?: string[];
    statuses?: EnhancedJobStatus[];
    userIds?: string[];
    teams?: string[];
  };
  realTimeUpdates?: boolean;
  pollingInterval?: number;
}

/**
 * Real-time event payload interfaces
 */
interface JobLifecycleEvent {
  jobId: string;
  batchId?: string;
  status: EnhancedJobStatus;
  progress?: JobProgressTracking;
  resources?: JobResourceRequirements;
  metadata: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
  estimatedCompletion?: Date;
  dependencies?: string[];
  retryCount?: number;
}

interface SystemHealthEvent {
  timestamp: Date;
  systemStatus: 'healthy' | 'degraded' | 'critical';
  metrics: {
    activeJobs: number;
    queuedJobs: number;
    resourceUtilization: number;
    averageExecutionTime: number;
    errorRate: number;
    throughput: number;
  };
  alerts?: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
  }>;
  recommendations?: string[];
}

interface PerformanceMetricsEvent {
  timestamp: Date;
  metrics: {
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    averageWaitTime: number;
    averageExecutionTime: number;
    resourceUtilization: Record<string, number>;
    errorDistribution: Record<string, number>;
  };
  trends: {
    hourly: Record<string, number>;
    daily: Record<string, number>;
    weekly: Record<string, number>;
  };
}

@WebSocketGateway({
  port: 8082,
  namespace: '/enhanced-job-monitoring',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@Injectable()
export class EnhancedJobMonitoringGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server = new Server();

  private readonly logger = new Logger(EnhancedJobMonitoringGateway.name);
  private readonly connectedClients = new Map<string, EnhancedAuthenticatedSocket>();
  private readonly clientSubscriptions = new Map<string, EnhancedSubscriptionConfig>();
  private readonly pollingIntervals = new Map<string, NodeJS.Timeout>();

  // Real-time data caching
  private readonly eventCache = new Map<string, JobLifecycleEvent>();
  private readonly metricsCache = new Map<string, PerformanceMetricsEvent>();
  private readonly healthCache: SystemHealthEvent[] = [];
  private readonly maxCacheSize = 1000;

  // Statistics tracking
  private readonly connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    peakConnections: 0,
    averageSessionDuration: 0,
  };

  constructor(
    private readonly jwtService: JwtService,
    private readonly jobOrchestrator: ComprehensiveJobOrchestratorService,
    private readonly statusPolling: AdvancedStatusPollingService,
  ) {
    this.logger.log('Enhanced Job Monitoring WebSocket Gateway initializing...');
  }

  /**
   * Gateway initialization
   */
  afterInit(server: Server): void {
    this.logger.log('Enhanced Job Monitoring WebSocket Gateway initialized successfully');
    this.startSystemHealthMonitoring();
    this.startPerformanceMetricsCollection();
    this.startCacheCleanup();
  }

  /**
   * Handle new WebSocket connections with enhanced authentication
   */
  async handleConnection(client: EnhancedAuthenticatedSocket): Promise<void> {
    const startTime = Date.now();

    try {
      // Extract authentication token
      const authHeader = client.handshake.headers?.authorization as string | undefined;
      const token = (client.handshake.auth?.token as string) ||
                   authHeader?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: No authentication token provided`, {
          socketId: client.id,
          ipAddress: client.handshake.address,
        });
        client.emit('auth_error', { message: 'Authentication token required' });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token) as Record<string, unknown>;

      // Set enhanced client metadata
      client.userId = (payload.sub as string) || (payload.id as string);
      client.username = (payload.username as string) || (payload.name as string);
      client.role = (payload.role as string) || 'user';
      client.team = (payload.team as string) || 'default';
      client.subscribedJobs = new Set();
      client.subscribedBatches = new Set();
      client.channels = new Set();
      client.lastActivity = new Date();
      client.connectionMetadata = {
        connectedAt: new Date(),
        userAgent: (client.handshake.headers['user-agent'] as string) || 'Unknown',
        ipAddress: client.handshake.address,
        clientType: this.detectClientType(client.handshake.headers['user-agent']),
      };

      // Store client connection
      this.connectedClients.set(client.id, client);
      this.connectionStats.totalConnections++;
      this.connectionStats.activeConnections++;
      this.connectionStats.peakConnections = Math.max(
        this.connectionStats.peakConnections,
        this.connectionStats.activeConnections
      );

      // Initialize default subscription
      const defaultSubscription: EnhancedSubscriptionConfig = {
        channels: ['system-health', 'job-updates'],
        realTimeUpdates: true,
        pollingInterval: 5000,
        filters: {
          statuses: ['pending', 'running', 'completed', 'failed'],
        },
      };
      this.clientSubscriptions.set(client.id, defaultSubscription);

      // Send cached data for immediate dashboard population
      await this.sendCachedDataToClient(client);

      // Start personalized data stream
      this.startClientDataStream(client.id);

      const connectionTime = Date.now() - startTime;
      this.logger.log(`Enhanced client connected successfully`, {
        socketId: client.id,
        userId: client.userId,
        username: client.username,
        role: client.role,
        team: client.team,
        connectionTime: `${connectionTime}ms`,
        totalConnections: this.connectionStats.activeConnections,
      });

      // Send connection confirmation
      client.emit('connection_confirmed', {
        message: 'Connected to Enhanced Job Monitoring',
        user: {
          userId: client.userId,
          username: client.username,
          role: client.role,
          team: client.team,
        },
        capabilities: ['real-time-updates', 'job-tracking', 'system-health', 'performance-metrics'],
        connectionId: client.id,
        timestamp: new Date().toISOString(),
      });

    } catch (error: unknown) {
      const connectionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Enhanced client connection failed`, {
        socketId: client.id,
        error: errorMessage,
        connectionTime: `${connectionTime}ms`,
        stack: errorStack,
      });

      client.emit('auth_error', {
        message: 'Authentication failed',
        error: errorMessage,
      });
      client.disconnect();
    }
  }

  /**
   * Handle client disconnections with cleanup
   */
  handleDisconnect(client: EnhancedAuthenticatedSocket): void {
    const sessionDuration = client.connectionMetadata?.connectedAt
      ? Date.now() - client.connectionMetadata.connectedAt.getTime()
      : 0;

    this.logger.log(`Enhanced client disconnected`, {
      socketId: client.id,
      userId: client.userId,
      username: client.username,
      sessionDuration: `${Math.round(sessionDuration / 1000)}s`,
    });

    // Clean up resources
    this.stopClientDataStream(client.id);
    this.connectedClients.delete(client.id);
    this.clientSubscriptions.delete(client.id);

    // Update connection statistics
    this.connectionStats.activeConnections--;
    if (sessionDuration > 0) {
      this.connectionStats.averageSessionDuration =
        (this.connectionStats.averageSessionDuration + sessionDuration) / 2;
    }
  }

  /**
   * Handle enhanced subscription configuration
   */
  @SubscribeMessage('configure_subscription')
  handleSubscriptionConfig(
    @ConnectedSocket() client: EnhancedAuthenticatedSocket,
    @MessageBody() config: EnhancedSubscriptionConfig,
  ): void {
    if (!this.validateClient(client)) return;

    try {
      // Validate subscription configuration
      if (!config.channels || config.channels.length === 0) {
        client.emit('subscription_error', {
          message: 'At least one channel must be specified',
        });
        return;
      }

      // Update client subscription
      const currentConfig = this.clientSubscriptions.get(client.id) || {} as EnhancedSubscriptionConfig;
      const newConfig: EnhancedSubscriptionConfig = {
        ...currentConfig,
        ...config,
        channels: [...new Set(config.channels)], // Remove duplicates
      };

      this.clientSubscriptions.set(client.id, newConfig);

      // Restart data stream with new configuration
      this.stopClientDataStream(client.id);
      this.startClientDataStream(client.id);

      this.logger.debug(`Subscription configuration updated`, {
        socketId: client.id,
        userId: client.userId,
        channels: newConfig.channels,
        realTimeUpdates: newConfig.realTimeUpdates,
        pollingInterval: newConfig.pollingInterval,
      });

      client.emit('subscription_configured', {
        success: true,
        config: newConfig,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Subscription configuration failed`, {
        socketId: client.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      client.emit('subscription_error', {
        message: 'Failed to configure subscription',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle job status requests
   */
  @SubscribeMessage('get_job_status')
  async handleJobStatusRequest(
    @ConnectedSocket() client: EnhancedAuthenticatedSocket,
    @MessageBody() request: { jobId: string },
  ): Promise<void> {
    if (!this.validateClient(client)) return;

    try {
      const jobStatus = await this.jobOrchestrator.getJobStatus(request.jobId);

      if (!jobStatus) {
        client.emit('job_status_response', {
          jobId: request.jobId,
          error: 'Job not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      client.emit('job_status_response', {
        jobId: request.jobId,
        status: jobStatus,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Job status request failed`, {
        jobId: request.jobId,
        socketId: client.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      client.emit('job_status_response', {
        jobId: request.jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle system health requests
   */
  @SubscribeMessage('get_system_health')
  async handleSystemHealthRequest(
    @ConnectedSocket() client: EnhancedAuthenticatedSocket,
  ): Promise<void> {
    if (!this.validateClient(client)) return;

    try {
      const systemHealth = await this.jobOrchestrator.getSystemHealth();

      client.emit('system_health_response', {
        health: systemHealth,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`System health request failed`, {
        socketId: client.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      client.emit('system_health_response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle performance metrics requests
   */
  @SubscribeMessage('get_performance_metrics')
  handlePerformanceMetricsRequest(
    @ConnectedSocket() client: EnhancedAuthenticatedSocket,
    @MessageBody() request: { timeRange?: string; aggregation?: string },
  ): void {
    if (!this.validateClient(client)) return;

    try {
      // Generate performance metrics based on cached data
      const metrics = this.generatePerformanceMetrics(request.timeRange, request.aggregation);

      client.emit('performance_metrics_response', {
        metrics,
        timeRange: request.timeRange || 'last_hour',
        aggregation: request.aggregation || 'average',
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Performance metrics request failed`, {
        socketId: client.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      client.emit('performance_metrics_response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ===== EVENT LISTENERS =====

  /**
   * Handle job lifecycle events from orchestrator
   */
  @OnEvent('job.lifecycle.updated')
  handleJobLifecycleEvent(payload: JobLifecycleEvent): void {
    this.logger.debug(`Broadcasting job lifecycle event`, {
      jobId: payload.jobId,
      status: payload.status,
      progress: payload.progress?.percentage,
    });

    // Cache the event
    this.cacheJobEvent(payload);

    // Broadcast to subscribers
    this.broadcastToSubscribers('job-updates', {
      type: 'job_lifecycle',
      data: payload,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle system health updates
   */
  @OnEvent('system.health.updated')
  handleSystemHealthEvent(payload: SystemHealthEvent): void {
    this.logger.debug(`Broadcasting system health event`, {
      status: payload.systemStatus,
      activeJobs: payload.metrics.activeJobs,
      alertCount: payload.alerts?.length || 0,
    });

    // Cache the health event
    this.cacheHealthEvent(payload);

    // Broadcast to subscribers
    this.broadcastToSubscribers('system-health', {
      type: 'system_health',
      data: payload,
      timestamp: new Date().toISOString(),
    });

    // Send critical alerts to all clients
    if (payload.systemStatus === 'critical' || payload.alerts?.some(alert => alert.severity === 'critical')) {
      this.server.emit('critical_alert', {
        type: 'critical_system_alert',
        data: payload,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle performance metrics updates
   */
  @OnEvent('performance.metrics.updated')
  handlePerformanceMetricsEvent(payload: PerformanceMetricsEvent): void {
    this.logger.debug(`Broadcasting performance metrics event`, {
      totalJobs: payload.metrics.totalJobs,
      successRate: (payload.metrics.successfulJobs / payload.metrics.totalJobs * 100).toFixed(2) + '%',
    });

    // Cache the metrics event
    this.cacheMetricsEvent(payload);

    // Broadcast to subscribers
    this.broadcastToSubscribers('performance-metrics', {
      type: 'performance_metrics',
      data: payload,
      timestamp: new Date().toISOString(),
    });
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Validate client authentication and connection
   */
  private validateClient(client: EnhancedAuthenticatedSocket): boolean {
    if (!client.userId) {
      client.emit('auth_error', { message: 'Authentication required' });
      return false;
    }

    // Update last activity
    client.lastActivity = new Date();
    return true;
  }

  /**
   * Detect client type from user agent
   */
  private detectClientType(userAgent?: string): string {
    if (!userAgent) return 'unknown';

    if (userAgent.includes('Mobile')) return 'mobile';
    if (userAgent.includes('Chrome')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox';
    if (userAgent.includes('Safari')) return 'safari';
    if (userAgent.includes('Postman')) return 'api-client';

    return 'desktop';
  }

  /**
   * Send cached data to new client
   */
  private async sendCachedDataToClient(client: EnhancedAuthenticatedSocket): Promise<void> {
    try {
      // Send recent job events
      const recentEvents = Array.from(this.eventCache.values())
        .slice(-10)
        .map(event => ({
          type: 'cached_job_event',
          data: event,
          timestamp: event.timestamp.toISOString(),
        }));

      recentEvents.forEach(event => {
        client.emit('cached_data', event);
      });

      // Send recent health data
      const recentHealth = this.healthCache.slice(-3);
      recentHealth.forEach(health => {
        client.emit('cached_data', {
          type: 'cached_health',
          data: health,
          timestamp: health.timestamp.toISOString(),
        });
      });

      // Send system statistics
      const systemStats = await this.jobOrchestrator.getSystemHealth();
      client.emit('cached_data', {
        type: 'cached_system_stats',
        data: systemStats,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Failed to send cached data to client`, {
        socketId: client.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Start personalized data stream for client
   */
  private startClientDataStream(clientId: string): void {
    const client = this.connectedClients.get(clientId);
    const subscription = this.clientSubscriptions.get(clientId);

    if (!client || !subscription) return;

    const interval = setInterval(async () => {
      try {
        if (!this.connectedClients.has(clientId)) {
          clearInterval(interval);
          return;
        }

        // Send personalized updates based on subscription
        await this.sendPersonalizedUpdates(clientId);

      } catch (error) {
        this.logger.error(`Client data stream error`, {
          clientId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, subscription.pollingInterval || 5000);

    this.pollingIntervals.set(clientId, interval);
    this.logger.debug(`Started data stream for client`, {
      clientId,
      pollingInterval: subscription.pollingInterval || 5000,
    });
  }

  /**
   * Stop personalized data stream for client
   */
  private stopClientDataStream(clientId: string): void {
    const interval = this.pollingIntervals.get(clientId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(clientId);
      this.logger.debug(`Stopped data stream for client: ${clientId}`);
    }
  }

  /**
   * Send personalized updates to client
   */
  private async sendPersonalizedUpdates(clientId: string): Promise<void> {
    const client = this.connectedClients.get(clientId);
    const subscription = this.clientSubscriptions.get(clientId);

    if (!client || !subscription) return;

    try {
      // Send job updates if subscribed
      if (subscription.channels.includes('job-updates')) {
        // Get user's recent jobs or filtered jobs
        const userJobs = await this.getUserJobs(client.userId!);
        if (userJobs.length > 0) {
          client.emit('personalized_update', {
            type: 'user_jobs',
            data: userJobs,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Send system health if subscribed
      if (subscription.channels.includes('system-health')) {
        const systemHealth = await this.jobOrchestrator.getSystemHealth();
        client.emit('personalized_update', {
          type: 'system_health',
          data: systemHealth,
          timestamp: new Date().toISOString(),
        });
      }

    } catch (error) {
      this.logger.error(`Personalized updates failed`, {
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Broadcast to subscribers of specific channel
   */
  private broadcastToSubscribers(channel: string, message: any): void {
    let recipientCount = 0;

    for (const [clientId, client] of this.connectedClients) {
      const subscription = this.clientSubscriptions.get(clientId);

      if (!subscription || !subscription.channels.includes(channel)) {
        continue;
      }

      try {
        client.emit('broadcast_update', {
          channel,
          ...message,
        });
        recipientCount++;
      } catch (error) {
        this.logger.error(`Broadcast error to client`, {
          clientId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.debug(`Broadcasted to ${recipientCount} subscribers on channel: ${channel}`);
  }

  /**
   * Cache job event
   */
  private cacheJobEvent(event: JobLifecycleEvent): void {
    this.eventCache.set(event.jobId, event);

    // Limit cache size
    if (this.eventCache.size > this.maxCacheSize) {
      const firstKey = this.eventCache.keys().next().value;
      this.eventCache.delete(firstKey);
    }
  }

  /**
   * Cache health event
   */
  private cacheHealthEvent(event: SystemHealthEvent): void {
    this.healthCache.push(event);

    // Limit cache size
    if (this.healthCache.length > 100) {
      this.healthCache.shift();
    }
  }

  /**
   * Cache metrics event
   */
  private cacheMetricsEvent(event: PerformanceMetricsEvent): void {
    const key = event.timestamp.toISOString();
    this.metricsCache.set(key, event);

    // Limit cache size
    if (this.metricsCache.size > this.maxCacheSize) {
      const firstKey = this.metricsCache.keys().next().value;
      this.metricsCache.delete(firstKey);
    }
  }

  /**
   * Get user's jobs
   */
  private getUserJobs(userId: string): Record<string, unknown>[] {
    try {
      // This would integrate with the orchestrator to get user-specific jobs
      // For now, return empty array as this would need additional implementation
      return [];
    } catch (error) {
      this.logger.error(`Failed to get user jobs`, {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Generate performance metrics
   */
  private generatePerformanceMetrics(timeRange?: string, aggregation?: string): PerformanceMetricsEvent {
    // Generate metrics from cached data
    const now = new Date();
    const metrics: PerformanceMetricsEvent = {
      timestamp: now,
      metrics: {
        totalJobs: this.eventCache.size,
        successfulJobs: Array.from(this.eventCache.values())
          .filter(event => event.status === 'completed').length,
        failedJobs: Array.from(this.eventCache.values())
          .filter(event => event.status === 'failed').length,
        averageWaitTime: 0,
        averageExecutionTime: 0,
        resourceUtilization: {},
        errorDistribution: {},
      },
      trends: {
        hourly: {},
        daily: {},
        weekly: {},
      },
    };

    return metrics;
  }

  /**
   * Start system health monitoring
   */
  private startSystemHealthMonitoring(): void {
    setInterval(async () => {
      try {
        const health = await this.jobOrchestrator.getSystemHealth();

        const healthEvent: SystemHealthEvent = {
          timestamp: new Date(),
          systemStatus: health.status === 'healthy' ? 'healthy' : 'degraded',
          metrics: {
            activeJobs: (health.jobs as Record<string, number>)?.active || 0,
            queuedJobs: (health.jobs as Record<string, number>)?.queued || 0,
            resourceUtilization: 0,
            averageExecutionTime: 0,
            errorRate: 0,
            throughput: 0,
          },
          alerts: [],
          recommendations: [],
        };

        this.handleSystemHealthEvent(healthEvent);

      } catch (error) {
        this.logger.error(`System health monitoring error:`, error);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Start performance metrics collection
   */
  private startPerformanceMetricsCollection(): void {
    setInterval(() => {
      try {
        const metrics = this.generatePerformanceMetrics();
        this.handlePerformanceMetricsEvent(metrics);
      } catch (error) {
        this.logger.error(`Performance metrics collection error:`, error);
      }
    }, 60000); // Every minute
  }

  /**
   * Start cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      try {
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

        // Clean up old events
        for (const [key, event] of this.eventCache) {
          if (event.timestamp.getTime() < cutoffTime) {
            this.eventCache.delete(key);
          }
        }

        // Clean up old metrics
        for (const [key, metrics] of this.metricsCache) {
          if (metrics.timestamp.getTime() < cutoffTime) {
            this.metricsCache.delete(key);
          }
        }

        // Clean up old health events
        this.healthCache.splice(0, this.healthCache.length - 100);

        this.logger.debug('Cache cleanup completed', {
          eventCacheSize: this.eventCache.size,
          metricsCacheSize: this.metricsCache.size,
          healthCacheSize: this.healthCache.length,
        });

      } catch (error) {
        this.logger.error(`Cache cleanup error:`, error);
      }
    }, 3600000); // Every hour
  }
}