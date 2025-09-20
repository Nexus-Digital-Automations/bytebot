/**
 * Job Events WebSocket Gateway - Real-time Job Progress Tracking
 *
 * Provides real-time WebSocket communication for job progress updates,
 * batch status changes, and performance monitoring events.
 *
 * Features:
 * - Real-time job progress updates
 * - Batch execution status broadcasting
 * - User-specific job filtering
 * - Authenticated WebSocket connections
 * - Automatic connection management
 * - Event-driven architecture integration
 *
 * @author Claude Code - Enterprise Controller Enhancement Specialist
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
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { JobProgressUpdateDto } from './dto/batch-job.dto';
import { JobStatus } from './dto/async-job.dto';

/**
 * WebSocket client interface with authentication
 */
interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  role?: string;
  subscribedJobs?: Set<string>;
  subscribedBatches?: Set<string>;
}

/**
 * Job event payload interfaces
 */
interface JobEventPayload {
  jobId: string;
  batchId?: string;
  progress?: number;
  status: JobStatus;
  currentStep?: string;
  estimatedCompletion?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface BatchEventPayload {
  batchId: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Subscription request DTOs
 */
interface JobSubscriptionRequest {
  jobIds?: string[];
  batchIds?: string[];
  allUserJobs?: boolean;
}

@WebSocketGateway(8081, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/job-events',
  transports: ['websocket', 'polling'],
})
export class JobEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server = new Server();

  private readonly logger = new Logger(JobEventsGateway.name);
  private readonly connectedClients = new Map<string, AuthenticatedSocket>();
  private readonly jobSubscriptions = new Map<string, Set<string>>(); // jobId -> Set<socketId>
  private readonly batchSubscriptions = new Map<string, Set<string>>(); // batchId -> Set<socketId>
  private readonly userSubscriptions = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(private readonly jwtService: JwtService) {
    this.logger.log('Job Events WebSocket Gateway initialized');
  }

  /**
   * Handle new WebSocket connections with authentication
   */
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization;

      if (!token) {
        this.logger.warn(`Connection rejected: No authentication token provided`);
        client.disconnect();
        return;
      }

      // Extract token from "Bearer <token>" format
      const cleanToken = token.replace('Bearer ', '');

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(cleanToken);

      // Set authenticated user info
      client.userId = payload.sub || payload.id;
      client.username = payload.username;
      client.role = payload.role;
      client.subscribedJobs = new Set();
      client.subscribedBatches = new Set();

      // Store client connection
      this.connectedClients.set(client.id, client);

      // Add to user subscriptions
      if (!this.userSubscriptions.has(client.userId)) {
        this.userSubscriptions.set(client.userId, new Set());
      }
      this.userSubscriptions.get(client.userId)!.add(client.id);

      this.logger.log(
        `Client connected: ${client.id} (user: ${client.username}, role: ${client.role})`,
        {
          socketId: client.id,
          userId: client.userId,
          username: client.username,
          role: client.role,
          totalConnections: this.connectedClients.size,
        },
      );

      // Send connection confirmation
      client.emit('connection_confirmed', {
        message: 'Connected to job events',
        userId: client.userId,
        username: client.username,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Authentication failed for client ${client.id}: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      client.emit('auth_error', {
        message: 'Authentication failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      client.disconnect();
    }
  }\n\n  /**\n   * Handle client disconnections\n   */\n  handleDisconnect(client: AuthenticatedSocket): void {\n    this.logger.log(\n      `Client disconnected: ${client.id} (user: ${client.username})`,\n      {\n        socketId: client.id,\n        userId: client.userId,\n        username: client.username,\n      },\n    );\n\n    // Clean up subscriptions\n    if (client.subscribedJobs) {\n      client.subscribedJobs.forEach((jobId) => {\n        const subscribers = this.jobSubscriptions.get(jobId);\n        if (subscribers) {\n          subscribers.delete(client.id);\n          if (subscribers.size === 0) {\n            this.jobSubscriptions.delete(jobId);\n          }\n        }\n      });\n    }\n\n    if (client.subscribedBatches) {\n      client.subscribedBatches.forEach((batchId) => {\n        const subscribers = this.batchSubscriptions.get(batchId);\n        if (subscribers) {\n          subscribers.delete(client.id);\n          if (subscribers.size === 0) {\n            this.batchSubscriptions.delete(batchId);\n          }\n        }\n      });\n    }\n\n    if (client.userId) {\n      const userSubs = this.userSubscriptions.get(client.userId);\n      if (userSubs) {\n        userSubs.delete(client.id);\n        if (userSubs.size === 0) {\n          this.userSubscriptions.delete(client.userId);\n        }\n      }\n    }\n\n    // Remove client connection\n    this.connectedClients.delete(client.id);\n  }\n\n  /**\n   * Subscribe to specific job progress updates\n   */\n  @SubscribeMessage('subscribe_jobs')\n  handleJobSubscription(\n    @ConnectedSocket() client: AuthenticatedSocket,\n    @MessageBody() request: JobSubscriptionRequest,\n  ): void {\n    if (!client.userId) {\n      client.emit('subscription_error', {\n        message: 'Authentication required for job subscriptions',\n      });\n      return;\n    }\n\n    try {\n      let subscribedCount = 0;\n\n      // Subscribe to specific jobs\n      if (request.jobIds) {\n        request.jobIds.forEach((jobId) => {\n          if (!this.jobSubscriptions.has(jobId)) {\n            this.jobSubscriptions.set(jobId, new Set());\n          }\n          this.jobSubscriptions.get(jobId)!.add(client.id);\n          client.subscribedJobs!.add(jobId);\n          subscribedCount++;\n        });\n      }\n\n      // Subscribe to specific batches\n      if (request.batchIds) {\n        request.batchIds.forEach((batchId) => {\n          if (!this.batchSubscriptions.has(batchId)) {\n            this.batchSubscriptions.set(batchId, new Set());\n          }\n          this.batchSubscriptions.get(batchId)!.add(client.id);\n          client.subscribedBatches!.add(batchId);\n          subscribedCount++;\n        });\n      }\n\n      this.logger.log(\n        `Client ${client.id} subscribed to ${subscribedCount} job/batch updates`,\n        {\n          socketId: client.id,\n          userId: client.userId,\n          username: client.username,\n          jobIds: request.jobIds,\n          batchIds: request.batchIds,\n          allUserJobs: request.allUserJobs,\n        },\n      );\n\n      client.emit('subscription_confirmed', {\n        message: `Subscribed to ${subscribedCount} job/batch updates`,\n        jobIds: request.jobIds || [],\n        batchIds: request.batchIds || [],\n        allUserJobs: request.allUserJobs || false,\n        timestamp: new Date().toISOString(),\n      });\n    } catch (error) {\n      this.logger.error(\n        `Subscription error for client ${client.id}: ${error}`,\n        error instanceof Error ? error.stack : undefined,\n      );\n      client.emit('subscription_error', {\n        message: 'Failed to process job subscription',\n        error: error instanceof Error ? error.message : 'Unknown error',\n      });\n    }\n  }\n\n  /**\n   * Unsubscribe from job progress updates\n   */\n  @SubscribeMessage('unsubscribe_jobs')\n  handleJobUnsubscription(\n    @ConnectedSocket() client: AuthenticatedSocket,\n    @MessageBody() request: { jobIds?: string[]; batchIds?: string[] },\n  ): void {\n    if (!client.userId) {\n      return;\n    }\n\n    let unsubscribedCount = 0;\n\n    // Unsubscribe from specific jobs\n    if (request.jobIds) {\n      request.jobIds.forEach((jobId) => {\n        const subscribers = this.jobSubscriptions.get(jobId);\n        if (subscribers) {\n          subscribers.delete(client.id);\n          if (subscribers.size === 0) {\n            this.jobSubscriptions.delete(jobId);\n          }\n        }\n        client.subscribedJobs!.delete(jobId);\n        unsubscribedCount++;\n      });\n    }\n\n    // Unsubscribe from specific batches\n    if (request.batchIds) {\n      request.batchIds.forEach((batchId) => {\n        const subscribers = this.batchSubscriptions.get(batchId);\n        if (subscribers) {\n          subscribers.delete(client.id);\n          if (subscribers.size === 0) {\n            this.batchSubscriptions.delete(batchId);\n          }\n        }\n        client.subscribedBatches!.delete(batchId);\n        unsubscribedCount++;\n      });\n    }\n\n    this.logger.log(\n      `Client ${client.id} unsubscribed from ${unsubscribedCount} job/batch updates`,\n      {\n        socketId: client.id,\n        userId: client.userId,\n        jobIds: request.jobIds,\n        batchIds: request.batchIds,\n      },\n    );\n\n    client.emit('unsubscription_confirmed', {\n      message: `Unsubscribed from ${unsubscribedCount} job/batch updates`,\n      timestamp: new Date().toISOString(),\n    });\n  }\n\n  /**\n   * Get current connection and subscription status\n   */\n  @SubscribeMessage('get_status')\n  handleGetStatus(@ConnectedSocket() client: AuthenticatedSocket): void {\n    const status = {\n      connected: true,\n      userId: client.userId,\n      username: client.username,\n      role: client.role,\n      subscribedJobs: Array.from(client.subscribedJobs || []),\n      subscribedBatches: Array.from(client.subscribedBatches || []),\n      totalConnections: this.connectedClients.size,\n      timestamp: new Date().toISOString(),\n    };\n\n    client.emit('status_response', status);\n  }\n\n  // ===== EVENT LISTENERS =====\n\n  /**\n   * Handle job progress events from the enhanced async service\n   */\n  @OnEvent('job.progress')\n  handleJobProgress(payload: JobEventPayload): void {\n    this.logger.debug(`Broadcasting job progress: ${payload.jobId} - ${payload.progress}%`);\n\n    // Broadcast to job subscribers\n    const jobSubscribers = this.jobSubscriptions.get(payload.jobId);\n    if (jobSubscribers) {\n      jobSubscribers.forEach((socketId) => {\n        const client = this.connectedClients.get(socketId);\n        if (client) {\n          client.emit('job_progress', payload);\n        }\n      });\n    }\n\n    // Broadcast to batch subscribers if job is part of a batch\n    if (payload.batchId) {\n      const batchSubscribers = this.batchSubscriptions.get(payload.batchId);\n      if (batchSubscribers) {\n        batchSubscribers.forEach((socketId) => {\n          const client = this.connectedClients.get(socketId);\n          if (client) {\n            client.emit('job_progress', payload);\n          }\n        });\n      }\n    }\n  }\n\n  /**\n   * Handle job completion events\n   */\n  @OnEvent('job.completed')\n  handleJobCompleted(payload: JobEventPayload): void {\n    this.logger.debug(`Broadcasting job completion: ${payload.jobId}`);\n    this.broadcastJobEvent('job_completed', payload);\n  }\n\n  /**\n   * Handle job failure events\n   */\n  @OnEvent('job.failed')\n  handleJobFailed(payload: JobEventPayload): void {\n    this.logger.debug(`Broadcasting job failure: ${payload.jobId}`);\n    this.broadcastJobEvent('job_failed', payload);\n  }\n\n  /**\n   * Handle job cancellation events\n   */\n  @OnEvent('job.cancelled')\n  handleJobCancelled(payload: JobEventPayload): void {\n    this.logger.debug(`Broadcasting job cancellation: ${payload.jobId}`);\n    this.broadcastJobEvent('job_cancelled', payload);\n  }\n\n  /**\n   * Handle batch submission events\n   */\n  @OnEvent('batch.submitted')\n  handleBatchSubmitted(payload: BatchEventPayload): void {\n    this.logger.debug(`Broadcasting batch submission: ${payload.batchId}`);\n    this.broadcastBatchEvent('batch_submitted', payload);\n  }\n\n  /**\n   * Handle batch completion events\n   */\n  @OnEvent('batch.completed')\n  handleBatchCompleted(payload: BatchEventPayload): void {\n    this.logger.debug(`Broadcasting batch completion: ${payload.batchId}`);\n    this.broadcastBatchEvent('batch_completed', payload);\n  }\n\n  /**\n   * Handle batch failure events\n   */\n  @OnEvent('batch.failed')\n  handleBatchFailed(payload: BatchEventPayload): void {\n    this.logger.debug(`Broadcasting batch failure: ${payload.batchId}`);\n    this.broadcastBatchEvent('batch_failed', payload);\n  }\n\n  // ===== PRIVATE HELPER METHODS =====\n\n  /**\n   * Broadcast job event to relevant subscribers\n   */\n  private broadcastJobEvent(eventName: string, payload: JobEventPayload): void {\n    // Broadcast to job subscribers\n    const jobSubscribers = this.jobSubscriptions.get(payload.jobId);\n    if (jobSubscribers) {\n      jobSubscribers.forEach((socketId) => {\n        const client = this.connectedClients.get(socketId);\n        if (client) {\n          client.emit(eventName, payload);\n        }\n      });\n    }\n\n    // Broadcast to batch subscribers if job is part of a batch\n    if (payload.batchId) {\n      const batchSubscribers = this.batchSubscriptions.get(payload.batchId);\n      if (batchSubscribers) {\n        batchSubscribers.forEach((socketId) => {\n          const client = this.connectedClients.get(socketId);\n          if (client) {\n            client.emit(eventName, payload);\n          }\n        });\n      }\n    }\n  }\n\n  /**\n   * Broadcast batch event to relevant subscribers\n   */\n  private broadcastBatchEvent(eventName: string, payload: BatchEventPayload): void {\n    const batchSubscribers = this.batchSubscriptions.get(payload.batchId);\n    if (batchSubscribers) {\n      batchSubscribers.forEach((socketId) => {\n        const client = this.connectedClients.get(socketId);\n        if (client) {\n          client.emit(eventName, payload);\n        }\n      });\n    }\n  }\n\n  /**\n   * Get current gateway statistics\n   */\n  getStatistics(): {\n    totalConnections: number;\n    jobSubscriptions: number;\n    batchSubscriptions: number;\n    userSubscriptions: number;\n  } {\n    return {\n      totalConnections: this.connectedClients.size,\n      jobSubscriptions: this.jobSubscriptions.size,\n      batchSubscriptions: this.batchSubscriptions.size,\n      userSubscriptions: this.userSubscriptions.size,\n    };\n  }\n}