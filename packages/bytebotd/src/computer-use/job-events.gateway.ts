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

/*** WebSocket client interface with authentication
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
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';progress: number;timestamp: string;
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
  credentials: true,},
  namespace: '/job-events',
  transports: ['websocket', 'polling'],})export class JobEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
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
      client.emit('connection_confirmed', {message: 'Connected to job events',
        userId: client.userId,
        username: client.username,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Authentication failed for client ${client.id}: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      client.emit('auth_error', {message: 'Authentication failed',
  error: error instanceof Error ? error.message : 'Unknown error',
      });
      client.disconnect();
    }
  }\n\n  /**
 * Handle client disconnections\n   */
  handleDisconnect(client: AuthenticatedSocket): void {
    this.logger.log(\n      `Client disconnected: ${client.id} (user: ${client.username})`,\n      {
        socketId: client.id,
        userId: client.userId,
        username: client.username,\n      },\n    );\n\n    // Clean up subscriptions
    if (client.subscribedJobs) {
      client.subscribedJobs.forEach((jobId) => {
        const subscribers = this.jobSubscriptions.get(jobId);
        if (subscribers) {
          subscribers.delete(client.id);
          if (subscribers.size === 0) {
            this.jobSubscriptions.delete(jobId);\n          }\n        }\n      });\n    }
  if (client.subscribedBatches) {
      client.subscribedBatches.forEach((batchId) => {
        const subscribers = this.batchSubscriptions.get(batchId);
        if (subscribers) {
          subscribers.delete(client.id);
          if (subscribers.size === 0) {
            this.batchSubscriptions.delete(batchId);\n          }\n        }\n      });\n    }
  if (client.userId) {
      const userSubs = this.userSubscriptions.get(client.userId);
      if (userSubs) {
        userSubs.delete(client.id);
        if (userSubs.size === 0) {
          this.userSubscriptions.delete(client.userId);\n        }\n      }\n    }\n\n    // Remove client connection
    this.connectedClients.delete(client.id);\n  }\n\n  /**
 * Subscribe to specific job progress updates\n   */\n  @SubscribeMessage('subscribe_jobs')handleJobSubscription(\n    @ConnectedSocket() client: AuthenticatedSocket,\n    @MessageBody() request: JobSubscriptionRequest,\n  ): void {if (!client.userId) {
      client.emit('subscription_error', {message: 'Authentication required for job subscriptions',\n      });
      return;\n    }
  try {
      let subscribedCount = 0;\n\n      // Subscribe to specific jobs
      if (request.jobIds) {
        request.jobIds.forEach((jobId) => {
          if (!this.jobSubscriptions.has(jobId)) {
            this.jobSubscriptions.set(jobId, new Set());\n          }
          this.jobSubscriptions.get(jobId)!.add(client.id);
          client.subscribedJobs!.add(jobId);
          subscribedCount++;\n        });\n      }\n\n      // Subscribe to specific batches
      if (request.batchIds) {
        request.batchIds.forEach((batchId) => {
          if (!this.batchSubscriptions.has(batchId)) {
            this.batchSubscriptions.set(batchId, new Set());\n          }
          this.batchSubscriptions.get(batchId)!.add(client.id);
          client.subscribedBatches!.add(batchId);
          subscribedCount++;\n        });\n      }
  this.logger.log(\n        `Client ${client.id} subscribed to ${subscribedCount} job/batch updates`,\n        {
          socketId: client.id,
          userId: client.userId,
          username: client.username,
          jobIds: request.jobIds,
          batchIds: request.batchIds,
          allUserJobs: request.allUserJobs,\n        },\n      );
  client.emit('subscription_confirmed', {
        message: `Subscribed to ${subscribedCount} job/batch updates`,
  jobIds: request.jobIds || [],
  batchIds: request.batchIds || [],
        allUserJobs: request.allUserJobs || false,
        timestamp: new Date().toISOString(),\n      });\n    } catch (error) {
      this.logger.error(\n        `Subscription error for client ${client.id}: ${error}`,
        error instanceof Error ? error.stack : undefined,\n      );
      client.emit('subscription_error', {message: 'Failed to process job subscription',
  error: error instanceof Error ? error.message : 'Unknown error',\n      });\n    }\n  }\n\n  /*** Unsubscribe from job progress updates\n   */\n  @SubscribeMessage('unsubscribe_jobs')
  handleJobUnsubscription(\n    @ConnectedSocket() client: AuthenticatedSocket,\n    @MessageBody() request: { jobIds?: string[]; batchIds?: string[] },\n  ): void {
    if (!client.userId) {
      return;\n    }
  let unsubscribedCount = 0;\n\n    // Unsubscribe from specific jobs
    if (request.jobIds) {
      request.jobIds.forEach((jobId) => {
        const subscribers = this.jobSubscriptions.get(jobId);
        if (subscribers) {
          subscribers.delete(client.id);
          if (subscribers.size === 0) {
            this.jobSubscriptions.delete(jobId);\n          }\n        }
        client.subscribedJobs!.delete(jobId);
        unsubscribedCount++;\n      });\n    }\n\n    // Unsubscribe from specific batches
    if (request.batchIds) {
      request.batchIds.forEach((batchId) => {
        const subscribers = this.batchSubscriptions.get(batchId);
        if (subscribers) {
          subscribers.delete(client.id);
          if (subscribers.size === 0) {
            this.batchSubscriptions.delete(batchId);\n          }\n        }
        client.subscribedBatches!.delete(batchId);
        unsubscribedCount++;\n      });\n    }
  this.logger.log(\n      `Client ${client.id} unsubscribed from ${unsubscribedCount} job/batch updates`,\n      {
        socketId: client.id,
        userId: client.userId,
        jobIds: request.jobIds,
        batchIds: request.batchIds,\n      },\n    );
  client.emit('unsubscription_confirmed', {
      message: `Unsubscribed from ${unsubscribedCount} job/batch updates`,
      timestamp: new Date().toISOString(),\n    });\n  }\n\n  /**
 * Get current connection and subscription status\n   */\n  @SubscribeMessage('get_status')handleGetStatus(@ConnectedSocket() client: AuthenticatedSocket): void {const status = {
      connected: true,
      userId: client.userId,
      username: client.username,
      role: client.role,
      subscribedJobs: Array.from(client.subscribedJobs || []),
      subscribedBatches: Array.from(client.subscribedBatches || []),
      totalConnections: this.connectedClients.size,
      timestamp: new Date().toISOString(),\n    };
  client.emit('status_response', status);\n  }\n\n  // ===== EVENT LISTENERS =====\n\n  /*** Handle job progress events from the enhanced async service\n   */\n  @OnEvent('job.progress')
  handleJobProgress(payload: JobEventPayload): void {
    this.logger.debug(`Broadcasting job progress: ${payload.jobId} - ${payload.progress}%`);\n\n    // Broadcast to job subscribers
    const jobSubscribers = this.jobSubscriptions.get(payload.jobId);
    if (jobSubscribers) {
      jobSubscribers.forEach((socketId) => {
        const client = this.connectedClients.get(socketId);
        if (client) {
          client.emit('job_progress', payload);\n        }\n      });\n    }\n\n    // Broadcast to batch subscribers if job is part of a batchif (payload.batchId) {const batchSubscribers = this.batchSubscriptions.get(payload.batchId);
      if (batchSubscribers) {
        batchSubscribers.forEach((socketId) => {
          const client = this.connectedClients.get(socketId);
          if (client) {
            client.emit('job_progress', payload);\n          }\n        });\n      }\n    }\n  }\n\n  /*** Handle job completion events\n   */\n  @OnEvent('job.completed')
  handleJobCompleted(payload: JobEventPayload): void {
    this.logger.debug(`Broadcasting job completion: ${payload.jobId}`);
    this.broadcastJobEvent('job_completed', payload);\n  }\n\n  /*** Handle job failure events\n   */\n  @OnEvent('job.failed')
  handleJobFailed(payload: JobEventPayload): void {
    this.logger.debug(`Broadcasting job failure: ${payload.jobId}`);
    this.broadcastJobEvent('job_failed', payload);\n  }\n\n  /*** Handle job cancellation events\n   */\n  @OnEvent('job.cancelled')
  handleJobCancelled(payload: JobEventPayload): void {
    this.logger.debug(`Broadcasting job cancellation: ${payload.jobId}`);
    this.broadcastJobEvent('job_cancelled', payload);\n  }\n\n  /*** Handle batch submission events\n   */\n  @OnEvent('batch.submitted')
  handleBatchSubmitted(payload: BatchEventPayload): void {
    this.logger.debug(`Broadcasting batch submission: ${payload.batchId}`);
    this.broadcastBatchEvent('batch_submitted', payload);\n  }\n\n  /*** Handle batch completion events\n   */\n  @OnEvent('batch.completed')
  handleBatchCompleted(payload: BatchEventPayload): void {
    this.logger.debug(`Broadcasting batch completion: ${payload.batchId}`);
    this.broadcastBatchEvent('batch_completed', payload);\n  }\n\n  /*** Handle batch failure events\n   */\n  @OnEvent('batch.failed')
  handleBatchFailed(payload: BatchEventPayload): void {
    this.logger.debug(`Broadcasting batch failure: ${payload.batchId}`);
    this.broadcastBatchEvent('batch_failed', payload);\n  }\n\n  // ===== PRIVATE HELPER METHODS =====\n\n  /**
 * Broadcast job event to relevant subscribers\n   */
  private broadcastJobEvent(eventName: string, payload: JobEventPayload): void {\n    // Broadcast to job subscribers
    const jobSubscribers = this.jobSubscriptions.get(payload.jobId);
    if (jobSubscribers) {
      jobSubscribers.forEach((socketId) => {
        const client = this.connectedClients.get(socketId);
        if (client) {
          client.emit(eventName, payload);\n        }\n      });\n    }\n\n    // Broadcast to batch subscribers if job is part of a batch
    if (payload.batchId) {
      const batchSubscribers = this.batchSubscriptions.get(payload.batchId);
      if (batchSubscribers) {
        batchSubscribers.forEach((socketId) => {
          const client = this.connectedClients.get(socketId);
          if (client) {
            client.emit(eventName, payload);\n          }\n        });\n      }\n    }\n  }\n\n  /**
 * Broadcast batch event to relevant subscribers\n   */
  private broadcastBatchEvent(eventName: string, payload: BatchEventPayload): void {
    const batchSubscribers = this.batchSubscriptions.get(payload.batchId);
    if (batchSubscribers) {
      batchSubscribers.forEach((socketId) => {
        const client = this.connectedClients.get(socketId);
        if (client) {
          client.emit(eventName, payload);\n        }\n      });\n    }\n  }\n\n  /**
 * Get current gateway statistics\n   */
  getStatistics(): {
    totalConnections: number;
    jobSubscriptions: number;
    batchSubscriptions: number;
    userSubscriptions: number;\n  } {
    return {
      totalConnections: this.connectedClients.size,
      jobSubscriptions: this.jobSubscriptions.size,
      batchSubscriptions: this.batchSubscriptions.size,
      userSubscriptions: this.userSubscriptions.size,\n    };\n  }\n}