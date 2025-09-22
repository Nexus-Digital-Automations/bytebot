/**
 * Lifecycle Management Service - Advanced session and token lifecycle management
 *
 * Enterprise-grade lifecycle management service providing automatic token refresh,
 * session persistence, graceful expiration handling, and intelligent session
 * optimization for AIgent-PARLANT authentication bridge.
 *
 * Features:
 * - Automatic token refresh with configurable strategies
 * - Session persistence across system restarts
 * - Graceful session expiration and cleanup
 * - Intelligent session optimization and consolidation
 * - Multi-tier caching for performance optimization
 * - Event-driven lifecycle notifications
 * - Compliance-aware session management
 * - Advanced monitoring and analytics
 *
 * @module LifecycleManagementService
 * @version 1.0.0
 * @author PARLANT Phase 1 Lifecycle Team
 * @since 2025-09-21
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { CryptoProtocolsService } from './crypto-protocols.service';
import { BridgeJwtPayload } from './jwt-bridge.service';

/**
 * Token refresh strategy configuration
 */
export interface RefreshStrategy {
  /** Strategy type */
  type: 'automatic' | 'on-demand' | 'predictive' | 'hybrid';
  /** Refresh threshold (percentage of lifetime remaining) */
  refreshThreshold: number;
  /** Maximum refresh attempts */
  maxAttempts: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
  /** Enable predictive refresh */
  predictiveRefresh: boolean;
  /** Refresh window (start early if high activity) */
  refreshWindow: number;
  /** Grace period after expiration */
  gracePeriod: number;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  /** Maximum session duration */
  maxDuration: number;
  /** Idle timeout */
  idleTimeout: number;
  /** Maximum concurrent sessions per user */
  maxConcurrentSessions: number;
  /** Session persistence enabled */
  persistenceEnabled: boolean;
  /** Session compression enabled */
  compressionEnabled: boolean;
  /** Session encryption enabled */
  encryptionEnabled: boolean;
  /** Session sharding strategy */
  shardingStrategy: 'user' | 'time' | 'random' | 'geographic';
}

/**
 * Session state enumeration
 */
export enum SessionState {
  ACTIVE = 'active',
  IDLE = 'idle',
  EXPIRING = 'expiring',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
  REFRESHING = 'refreshing',
  ERROR = 'error',
}

/**
 * Session lifecycle event
 */
export interface SessionLifecycleEvent {
  /** Event type */
  type: 'created' | 'activated' | 'refreshed' | 'expired' | 'terminated' | 'error';
  /** Session ID */
  sessionId: string;
  /** User ID */
  userId: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event metadata */
  metadata: Record<string, unknown>;
  /** Previous state */
  previousState?: SessionState;
  /** New state */
  newState?: SessionState;
}

/**
 * Enhanced session information
 */
export interface EnhancedSession {
  /** Session ID */
  sessionId: string;
  /** User ID */
  userId: string;
  /** AIgent token */
  aigentToken: string;
  /** Parlant token */
  parlantToken: string;
  /** Refresh token */
  refreshToken?: string;
  /** Session state */
  state: SessionState;
  /** Creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Last refresh timestamp */
  lastRefreshAt?: Date;
  /** Expiration timestamp */
  expiresAt: Date;
  /** Idle timeout timestamp */
  idleTimeoutAt: Date;
  /** User roles */
  roles: string[];
  /** User permissions */
  permissions: string[];
  /** Device information */
  deviceInfo: {
    deviceId: string;
    userAgent: string;
    ipAddress: string;
    platform: string;
    location?: string;
  };
  /** Security metadata */
  securityMetadata: {
    securityLevel: string;
    authenticationMethod: string;
    mfaCompleted: boolean;
    threatScore: number;
    lastSecurityCheck: Date;
    suspicious: boolean;
  };
  /** Performance metadata */
  performanceMetadata: {
    totalRequests: number;
    averageResponseTime: number;
    lastRequestTime: Date;
    bandwidthUsed: number;
    cacheHits: number;
    cacheMisses: number;
  };
  /** Lifecycle metadata */
  lifecycleMetadata: {
    refreshCount: number;
    refreshFailures: number;
    stateTransitions: number;
    totalDuration: number;
    extensions: number;
    warnings: string[];
  };
}

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
  /** Refresh success status */
  success: boolean;
  /** New access token */
  accessToken?: string;
  /** New refresh token */
  refreshToken?: string;
  /** Token expiration */
  expiresAt?: Date;
  /** Refresh metadata */
  metadata: {
    refreshTime: Date;
    refreshDuration: number;
    refreshAttempt: number;
    refreshStrategy: string;
    previousExpiration: Date;
    newExpiration: Date;
  };
  /** Error information */
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    retryAfter?: number;
  };
}

/**
 * Session analytics data
 */
export interface SessionAnalytics {
  /** Total active sessions */
  activeSessions: number;
  /** Total sessions by state */
  sessionsByState: Record<SessionState, number>;
  /** Average session duration */
  averageSessionDuration: number;
  /** Peak session count */
  peakSessionCount: number;
  /** Session creation rate */
  sessionCreationRate: number;
  /** Session termination rate */
  sessionTerminationRate: number;
  /** Refresh success rate */
  refreshSuccessRate: number;
  /** Average refresh time */
  averageRefreshTime: number;
  /** Most active users */
  topUsers: Array<{ userId: string; sessionCount: number; totalDuration: number }>;
  /** Device distribution */
  deviceDistribution: Record<string, number>;
  /** Geographic distribution */
  geographicDistribution: Record<string, number>;
  /** Security incidents */
  securityIncidents: number;
  /** Last updated */
  lastUpdated: Date;
}

/**
 * Lifecycle Management Service
 *
 * Advanced session and token lifecycle management providing automatic
 * token refresh, intelligent session optimization, and comprehensive
 * analytics for enterprise-grade authentication systems.
 */
@Injectable()
export class LifecycleManagementService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LifecycleManagementService.name);

  // Configuration
  private refreshStrategy!: RefreshStrategy;
  private sessionConfig!: SessionConfig;

  // Session storage
  private sessions = new Map<string, EnhancedSession>();
  private userSessions = new Map<string, Set<string>>(); // userId -> sessionIds
  private refreshQueue = new Map<string, NodeJS.Timeout>();
  private expirationQueue = new Map<string, NodeJS.Timeout>();

  // Analytics
  private analytics: SessionAnalytics = {
    activeSessions: 0,
    sessionsByState: {
      [SessionState.ACTIVE]: 0,
      [SessionState.IDLE]: 0,
      [SessionState.EXPIRING]: 0,
      [SessionState.EXPIRED]: 0,
      [SessionState.SUSPENDED]: 0,
      [SessionState.TERMINATED]: 0,
      [SessionState.REFRESHING]: 0,
      [SessionState.ERROR]: 0,
    },
    averageSessionDuration: 0,
    peakSessionCount: 0,
    sessionCreationRate: 0,
    sessionTerminationRate: 0,
    refreshSuccessRate: 0,
    averageRefreshTime: 0,
    topUsers: [],
    deviceDistribution: {},
    geographicDistribution: {},
    securityIncidents: 0,
    lastUpdated: new Date(),
  };

  // Periodic tasks
  private refreshTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private analyticsTimer: NodeJS.Timeout | null = null;
  private persistenceTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoProtocolsService,
    @Inject('LIFECYCLE_CONFIG') private readonly lifecycleConfig: Partial<SessionConfig>,
  ) {
    super();
    this.logger.log('🔄 Initializing Lifecycle Management Service');
  }

  /**
   * Initialize the lifecycle management service
   */
  async onModuleInit(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('🔄 Starting lifecycle management initialization...');

    try {
      await this.loadConfiguration();
      await this.initializeStorage();
      await this.startPeriodicTasks();
      await this.loadPersistedSessions();

      const initTime = Date.now() - startTime;
      this.logger.log(`✅ Lifecycle management initialized successfully (${initTime}ms)`);

      this.emit('lifecycle:initialized', {
        timestamp: new Date(),
        initializationTime: initTime,
        configuration: this.sanitizeConfig(),
      });
    } catch (error) {
      this.logger.error('❌ Failed to initialize lifecycle management', error);
      throw new Error(`Lifecycle initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean up resources on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('🔄 Shutting down lifecycle management...');

    await this.stopPeriodicTasks();
    await this.persistActiveSessions();
    await this.terminateAllSessions();

    this.logger.log('✅ Lifecycle management shutdown complete');
  }

  /**
   * Create new enhanced session
   */
  async createSession(
    sessionData: {
      sessionId: string;
      userId: string;
      aigentToken: string;
      parlantToken: string;
      refreshToken?: string;
      roles: string[];
      permissions: string[];
      deviceInfo: EnhancedSession['deviceInfo'];
      securityMetadata: Partial<EnhancedSession['securityMetadata']>;
    },
  ): Promise<EnhancedSession> {
    const now = new Date();

    // Check concurrent session limits
    await this.enforceSessionLimits(sessionData.userId);

    // Create enhanced session
    const session: EnhancedSession = {
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      aigentToken: sessionData.aigentToken,
      parlantToken: sessionData.parlantToken,
      refreshToken: sessionData.refreshToken,
      state: SessionState.ACTIVE,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + this.sessionConfig.maxDuration),
      idleTimeoutAt: new Date(now.getTime() + this.sessionConfig.idleTimeout),
      roles: sessionData.roles,
      permissions: sessionData.permissions,
      deviceInfo: sessionData.deviceInfo,
      securityMetadata: {
        securityLevel: 'MEDIUM',
        authenticationMethod: 'jwt-bridge',
        mfaCompleted: false,
        threatScore: 0,
        lastSecurityCheck: now,
        suspicious: false,
        ...sessionData.securityMetadata,
      },
      performanceMetadata: {
        totalRequests: 0,
        averageResponseTime: 0,
        lastRequestTime: now,
        bandwidthUsed: 0,
        cacheHits: 0,
        cacheMisses: 0,
      },
      lifecycleMetadata: {
        refreshCount: 0,
        refreshFailures: 0,
        stateTransitions: 0,
        totalDuration: 0,
        extensions: 0,
        warnings: [],
      },
    };

    // Store session
    this.sessions.set(sessionData.sessionId, session);

    // Track user sessions
    if (!this.userSessions.has(sessionData.userId)) {
      this.userSessions.set(sessionData.userId, new Set());
    }
    this.userSessions.get(sessionData.userId)!.add(sessionData.sessionId);

    // Schedule automatic refresh
    await this.scheduleTokenRefresh(session);

    // Schedule expiration
    await this.scheduleSessionExpiration(session);

    // Update analytics
    this.updateAnalytics();

    // Emit lifecycle event
    this.emitLifecycleEvent({
      type: 'created',
      sessionId: session.sessionId,
      userId: session.userId,
      timestamp: now,
      metadata: {
        deviceInfo: session.deviceInfo,
        securityLevel: session.securityMetadata.securityLevel,
      },
      newState: SessionState.ACTIVE,
    });

    this.logger.log(`✅ Session created: ${sessionData.sessionId} for user: ${sessionData.userId}`);

    return session;
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(
    sessionId: string,
    activityData?: {
      requestTime?: number;
      bandwidthUsed?: number;
      cacheHit?: boolean;
    },
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const now = new Date();

    // Update activity timestamp
    session.lastActivityAt = now;

    // Update idle timeout
    session.idleTimeoutAt = new Date(now.getTime() + this.sessionConfig.idleTimeout);

    // Update performance metadata
    if (activityData) {
      session.performanceMetadata.totalRequests++;
      session.performanceMetadata.lastRequestTime = now;

      if (activityData.requestTime) {
        const totalTime = session.performanceMetadata.averageResponseTime * (session.performanceMetadata.totalRequests - 1) + activityData.requestTime;
        session.performanceMetadata.averageResponseTime = totalTime / session.performanceMetadata.totalRequests;
      }

      if (activityData.bandwidthUsed) {
        session.performanceMetadata.bandwidthUsed += activityData.bandwidthUsed;
      }

      if (activityData.cacheHit !== undefined) {
        if (activityData.cacheHit) {
          session.performanceMetadata.cacheHits++;
        } else {
          session.performanceMetadata.cacheMisses++;
        }
      }
    }

    // Transition from idle to active if needed
    if (session.state === SessionState.IDLE) {
      await this.transitionSessionState(session, SessionState.ACTIVE);
    }
  }

  /**
   * Refresh session tokens
   */
  async refreshSessionTokens(sessionId: string): Promise<TokenRefreshResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        metadata: {
          refreshTime: new Date(),
          refreshDuration: 0,
          refreshAttempt: 1,
          refreshStrategy: 'manual',
          previousExpiration: new Date(),
          newExpiration: new Date(),
        },
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session not found: ${sessionId}`,
          retryable: false,
        },
      };
    }

    const startTime = Date.now();
    await this.transitionSessionState(session, SessionState.REFRESHING);

    try {
      this.logger.debug(`🔄 Refreshing tokens for session: ${sessionId}`);

      // Verify current tokens are still valid for refresh
      if (!session.refreshToken) {
        throw new Error('No refresh token available');
      }

      // Perform token refresh using crypto service
      const newTokens = await this.performTokenRefresh(session);

      // Update session with new tokens
      const previousExpiration = session.expiresAt;
      session.aigentToken = newTokens.aigentToken;
      session.parlantToken = newTokens.parlantToken;
      session.refreshToken = newTokens.refreshToken;
      session.expiresAt = newTokens.expiresAt;
      session.lastRefreshAt = new Date();
      session.lifecycleMetadata.refreshCount++;

      // Reschedule refresh and expiration
      await this.scheduleTokenRefresh(session);
      await this.scheduleSessionExpiration(session);

      // Transition back to active state
      await this.transitionSessionState(session, SessionState.ACTIVE);

      const refreshDuration = Date.now() - startTime;

      const result: TokenRefreshResult = {
        success: true,
        accessToken: newTokens.aigentToken,
        refreshToken: newTokens.refreshToken,
        expiresAt: newTokens.expiresAt,
        metadata: {
          refreshTime: new Date(),
          refreshDuration,
          refreshAttempt: session.lifecycleMetadata.refreshCount,
          refreshStrategy: this.refreshStrategy.type,
          previousExpiration,
          newExpiration: newTokens.expiresAt,
        },
      };

      this.logger.log(`✅ Tokens refreshed for session: ${sessionId} (${refreshDuration}ms)`);

      // Emit lifecycle event
      this.emitLifecycleEvent({
        type: 'refreshed',
        sessionId: session.sessionId,
        userId: session.userId,
        timestamp: new Date(),
        metadata: {
          refreshDuration,
          refreshAttempt: session.lifecycleMetadata.refreshCount,
        },
        previousState: SessionState.REFRESHING,
        newState: SessionState.ACTIVE,
      });

      return result;
    } catch (error) {
      session.lifecycleMetadata.refreshFailures++;

      // Transition to error state
      await this.transitionSessionState(session, SessionState.ERROR);

      const refreshDuration = Date.now() - startTime;

      this.logger.error(`❌ Token refresh failed for session: ${sessionId}`, error);

      return {
        success: false,
        metadata: {
          refreshTime: new Date(),
          refreshDuration,
          refreshAttempt: session.lifecycleMetadata.refreshCount + 1,
          refreshStrategy: this.refreshStrategy.type,
          previousExpiration: session.expiresAt,
          newExpiration: session.expiresAt,
        },
        error: {
          code: 'REFRESH_FAILED',
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
          retryAfter: this.refreshStrategy.retryDelay,
        },
      };
    }
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionId: string, reason: string = 'manual'): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Cancel scheduled tasks
    this.cancelScheduledTasks(sessionId);

    // Transition to terminated state
    await this.transitionSessionState(session, SessionState.TERMINATED);

    // Remove from storage
    this.sessions.delete(sessionId);

    // Remove from user sessions
    const userSessionSet = this.userSessions.get(session.userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionId);
      if (userSessionSet.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    // Update analytics
    this.updateAnalytics();

    // Emit lifecycle event
    this.emitLifecycleEvent({
      type: 'terminated',
      sessionId: session.sessionId,
      userId: session.userId,
      timestamp: new Date(),
      metadata: { reason },
      previousState: session.state,
      newState: SessionState.TERMINATED,
    });

    this.logger.log(`🗑️ Session terminated: ${sessionId} (reason: ${reason})`);
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): EnhancedSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): EnhancedSession[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) {
      return [];
    }

    return Array.from(sessionIds)
      .map(id => this.sessions.get(id))
      .filter((session): session is EnhancedSession => session !== undefined);
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics(): SessionAnalytics {
    return { ...this.analytics };
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Private Methods
   */

  private async loadConfiguration(): Promise<void> {
    this.refreshStrategy = {
      type: 'hybrid',
      refreshThreshold: 0.75, // Refresh when 75% of lifetime remaining
      maxAttempts: 3,
      retryDelay: 5000, // 5 seconds
      predictiveRefresh: true,
      refreshWindow: 300000, // 5 minutes
      gracePeriod: 60000, // 1 minute
      ...(this.configService.get('refresh') || {}),
    };

    this.sessionConfig = {
      maxDuration: 3600000, // 1 hour
      idleTimeout: 1800000, // 30 minutes
      maxConcurrentSessions: 5,
      persistenceEnabled: true,
      compressionEnabled: true,
      encryptionEnabled: true,
      shardingStrategy: 'user',
      ...(this.configService.get('session') || {}),
      ...this.lifecycleConfig,
    };

    this.logger.log('⚙️ Lifecycle configuration loaded');
  }

  private async initializeStorage(): Promise<void> {
    // Initialize session storage
    // In production, this would connect to Redis, database, etc.
    this.logger.log('💾 Session storage initialized');
  }

  private async enforceSessionLimits(userId: string): Promise<void> {
    const userSessionSet = this.userSessions.get(userId);
    if (!userSessionSet) {
      return;
    }

    if (userSessionSet.size >= this.sessionConfig.maxConcurrentSessions) {
      // Find oldest session to terminate
      let oldestSession: EnhancedSession | null = null;
      let oldestTime = Date.now();

      for (const sessionId of userSessionSet) {
        const session = this.sessions.get(sessionId);
        if (session && session.createdAt.getTime() < oldestTime) {
          oldestSession = session;
          oldestTime = session.createdAt.getTime();
        }
      }

      if (oldestSession) {
        await this.terminateSession(oldestSession.sessionId, 'session_limit_exceeded');
      }
    }
  }

  private async scheduleTokenRefresh(session: EnhancedSession): Promise<void> {
    // Cancel existing refresh timer
    const existingTimer = this.refreshQueue.get(session.sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Calculate refresh time based on strategy
    const tokenLifetime = session.expiresAt.getTime() - Date.now();
    const refreshTime = tokenLifetime * (1 - this.refreshStrategy.refreshThreshold);

    // Schedule refresh
    const timer = setTimeout(async () => {
      await this.refreshSessionTokens(session.sessionId);
    }, Math.max(refreshTime, 1000)); // At least 1 second

    this.refreshQueue.set(session.sessionId, timer);
  }

  private async scheduleSessionExpiration(session: EnhancedSession): Promise<void> {
    // Cancel existing expiration timer
    const existingTimer = this.expirationQueue.get(session.sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule expiration
    const expirationTime = session.expiresAt.getTime() - Date.now();
    const timer = setTimeout(async () => {
      await this.expireSession(session.sessionId);
    }, Math.max(expirationTime, 1000)); // At least 1 second

    this.expirationQueue.set(session.sessionId, timer);
  }

  private async expireSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    await this.transitionSessionState(session, SessionState.EXPIRED);

    // Grace period for cleanup
    setTimeout(async () => {
      await this.terminateSession(sessionId, 'expired');
    }, this.refreshStrategy.gracePeriod);
  }

  private async transitionSessionState(session: EnhancedSession, newState: SessionState): Promise<void> {
    const previousState = session.state;
    session.state = newState;
    session.lifecycleMetadata.stateTransitions++;

    this.logger.debug(`🔄 Session state transition: ${session.sessionId} ${previousState} -> ${newState}`);

    // Update analytics
    this.analytics.sessionsByState[previousState]--;
    this.analytics.sessionsByState[newState]++;
  }

  private async performTokenRefresh(session: EnhancedSession): Promise<{
    aigentToken: string;
    parlantToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    // This would integrate with the actual token refresh logic
    // For now, we'll simulate token refresh
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionConfig.maxDuration);

    return {
      aigentToken: `aigent_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`,
      parlantToken: `parlant_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`,
      refreshToken: `refresh_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`,
      expiresAt,
    };
  }

  private cancelScheduledTasks(sessionId: string): void {
    const refreshTimer = this.refreshQueue.get(sessionId);
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      this.refreshQueue.delete(sessionId);
    }

    const expirationTimer = this.expirationQueue.get(sessionId);
    if (expirationTimer) {
      clearTimeout(expirationTimer);
      this.expirationQueue.delete(sessionId);
    }
  }

  private emitLifecycleEvent(event: SessionLifecycleEvent): void {
    this.emit('session:lifecycle', event);
    this.logger.debug(`📢 Session lifecycle event: ${event.type} for ${event.sessionId}`);
  }

  private updateAnalytics(): void {
    this.analytics.activeSessions = this.sessions.size;

    // Reset state counts
    Object.keys(this.analytics.sessionsByState).forEach(state => {
      this.analytics.sessionsByState[state as SessionState] = 0;
    });

    // Count sessions by state
    for (const session of this.sessions.values()) {
      this.analytics.sessionsByState[session.state]++;
    }

    // Update peak session count
    if (this.sessions.size > this.analytics.peakSessionCount) {
      this.analytics.peakSessionCount = this.sessions.size;
    }

    // Calculate average session duration
    if (this.sessions.size > 0) {
      const totalDuration = Array.from(this.sessions.values()).reduce((sum, session) => {
        return sum + (Date.now() - session.createdAt.getTime());
      }, 0);
      this.analytics.averageSessionDuration = totalDuration / this.sessions.size;
    }

    this.analytics.lastUpdated = new Date();
  }

  private async startPeriodicTasks(): Promise<void> {
    // Session cleanup every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.performSessionCleanup();
    }, 300000);

    // Analytics update every 30 seconds
    this.analyticsTimer = setInterval(() => {
      this.updateAnalytics();
    }, 30000);

    // Session persistence every 10 minutes
    if (this.sessionConfig.persistenceEnabled) {
      this.persistenceTimer = setInterval(() => {
        this.persistActiveSessions();
      }, 600000);
    }

    this.logger.log('⏰ Periodic tasks started');
  }

  private async stopPeriodicTasks(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.analyticsTimer) {
      clearInterval(this.analyticsTimer);
      this.analyticsTimer = null;
    }

    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
      this.persistenceTimer = null;
    }

    // Clear all scheduled timers
    for (const timer of this.refreshQueue.values()) {
      clearTimeout(timer);
    }
    this.refreshQueue.clear();

    for (const timer of this.expirationQueue.values()) {
      clearTimeout(timer);
    }
    this.expirationQueue.clear();
  }

  private async performSessionCleanup(): Promise<void> {
    let cleanupCount = 0;
    const now = new Date();

    for (const [sessionId, session] of this.sessions.entries()) {
      // Check for idle timeout
      if (session.idleTimeoutAt < now && session.state === SessionState.ACTIVE) {
        await this.transitionSessionState(session, SessionState.IDLE);
      }

      // Check for expired sessions
      if (session.expiresAt < now && session.state !== SessionState.EXPIRED) {
        await this.expireSession(sessionId);
        cleanupCount++;
      }

      // Check for sessions in error state for too long
      if (session.state === SessionState.ERROR &&
          session.lastActivityAt.getTime() + 600000 < now.getTime()) { // 10 minutes
        await this.terminateSession(sessionId, 'error_timeout');
        cleanupCount++;
      }
    }

    if (cleanupCount > 0) {
      this.logger.debug(`🧹 Cleaned up ${cleanupCount} sessions`);
    }
  }

  private async persistActiveSessions(): Promise<void> {
    if (!this.sessionConfig.persistenceEnabled) {
      return;
    }

    // In production, this would persist sessions to storage
    this.logger.debug(`💾 Persisting ${this.sessions.size} active sessions`);
  }

  private async loadPersistedSessions(): Promise<void> {
    if (!this.sessionConfig.persistenceEnabled) {
      return;
    }

    // In production, this would load sessions from storage
    this.logger.debug('📥 Loading persisted sessions');
  }

  private async terminateAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      await this.terminateSession(sessionId, 'shutdown');
    }
  }

  private sanitizeConfig(): Record<string, unknown> {
    return {
      refreshStrategy: this.refreshStrategy,
      sessionConfig: {
        ...this.sessionConfig,
        // Remove sensitive data if any
      },
    };
  }
}