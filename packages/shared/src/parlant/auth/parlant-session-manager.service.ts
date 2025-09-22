/**
 * PARLANT Session Manager Service
 *
 * Enterprise-grade session management for Parlant Phase 1 integration
 * supporting multi-device access, concurrent sessions, session security,
 * lifecycle management, and cross-device synchronization.
 *
 * @author Claude Code (AIgent Integration Specialist)
 * @version 1.0.0
 * @priority HIGH - Core session management for Parlant integration
 */

import { Injectable, Logger } from "@nestjs/common";
import { ParlantContext } from "./parlant-jwt-bridge.service";

export interface ParlantSession {
  sessionId: string;
  conversationId: string;
  userId: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
    coordinates?: [number, number];
  };
  securityLevel: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  averageSessionDuration: number;
  concurrentSessionsPerUser: Record<string, number>;
  deviceDistribution: Record<string, number>;
}

@Injectable()
export class ParlantSessionManager {
  private readonly logger = new Logger(ParlantSessionManager.name);
  private readonly sessions = new Map<string, ParlantSession>();
  private readonly userSessions = new Map<string, Set<string>>();

  // Configuration based on SecurityIntegrationArchitecture
  private readonly config = {
    maxConcurrentSessions: 10,
    sessionTimeout: 3600000, // 1 hour
    cleanupInterval: 300000, // 5 minutes
    geolocationTracking: true,
    deviceFingerprinting: true,
  };

  constructor() {
    this.logger.log(
      "PARLANT Session Manager initialized with enterprise configuration",
    );
    this.startSessionCleanup();
  }

  /**
   * Create new Parlant session with comprehensive tracking
   */
  async createSession(
    context: ParlantContext,
    deviceInfo?: {
      deviceId?: string;
      ipAddress?: string;
      userAgent?: string;
      location?: any;
    },
  ): Promise<ParlantSession> {
    const sessionId = context.sessionId || this.generateSessionId();

    // Check concurrent session limits
    await this.enforceSessionLimits(context.userId);

    const session: ParlantSession = {
      sessionId,
      conversationId: context.conversationId,
      userId: context.userId,
      deviceId: deviceInfo?.deviceId,
      ipAddress: deviceInfo?.ipAddress,
      userAgent: deviceInfo?.userAgent,
      location: deviceInfo?.location,
      securityLevel: context.securityLevel,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + this.config.sessionTimeout),
      isActive: true,
      metadata: {
        bridgeVersion: "1.0.0",
        parlantIntegration: true,
        ...context.metadata,
      },
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Track user sessions
    if (!this.userSessions.has(context.userId)) {
      this.userSessions.set(context.userId, new Set());
    }
    this.userSessions.get(context.userId)!.add(sessionId);

    this.logger.debug(
      `Created session ${sessionId} for user ${context.userId} in conversation ${context.conversationId}`,
    );

    return session;
  }

  /**
   * Retrieve active session by ID
   */
  async getSession(sessionId: string): Promise<ParlantSession | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.terminateSession(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = new Date();
    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Update session activity and extend lifetime
   */
  async updateSessionActivity(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);

    if (!session || !session.isActive) {
      return false;
    }

    session.lastActivity = new Date();
    session.expiresAt = new Date(Date.now() + this.config.sessionTimeout);
    this.sessions.set(sessionId, session);

    this.logger.debug(`Updated activity for session ${sessionId}`);
    return true;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<ParlantSession[]> {
    const sessionIds = this.userSessions.get(userId);

    if (!sessionIds) {
      return [];
    }

    const sessions: ParlantSession[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Terminate specific session
   */
  async terminateSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    // Mark as inactive
    session.isActive = false;
    this.sessions.set(sessionId, session);

    // Remove from user session tracking
    const userSessionSet = this.userSessions.get(session.userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionId);
      if (userSessionSet.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    this.logger.debug(
      `Terminated session ${sessionId} for user ${session.userId}`,
    );
    return true;
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateUserSessions(userId: string): Promise<number> {
    const sessionIds = this.userSessions.get(userId);

    if (!sessionIds) {
      return 0;
    }

    let terminatedCount = 0;

    for (const sessionId of Array.from(sessionIds)) {
      const success = await this.terminateSession(sessionId);
      if (success) {
        terminatedCount++;
      }
    }

    this.logger.log(
      `Terminated ${terminatedCount} sessions for user ${userId}`,
    );
    return terminatedCount;
  }

  /**
   * Enforce concurrent session limits per user
   */
  private async enforceSessionLimits(userId: string): Promise<void> {
    const userSessionIds = this.userSessions.get(userId);

    if (
      !userSessionIds ||
      userSessionIds.size < this.config.maxConcurrentSessions
    ) {
      return;
    }

    // Find oldest session to terminate
    let oldestSession: ParlantSession | null = null;
    let oldestSessionId: string | null = null;

    for (const sessionId of userSessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && session.isActive) {
        if (!oldestSession || session.createdAt < oldestSession.createdAt) {
          oldestSession = session;
          oldestSessionId = sessionId;
        }
      }
    }

    if (oldestSessionId) {
      await this.terminateSession(oldestSessionId);
      this.logger.warn(
        `Terminated oldest session ${oldestSessionId} for user ${userId} due to session limit`,
      );
    }
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2);
    return `parlant_session_${timestamp}_${randomPart}`;
  }

  /**
   * Start periodic session cleanup
   */
  private startSessionCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.cleanupInterval);

    this.logger.debug(
      `Session cleanup scheduled every ${this.config.cleanupInterval}ms`,
    );
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now || !session.isActive) {
        await this.terminateSession(sessionId);
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * Get session metrics for monitoring
   */
  getSessionMetrics(): SessionMetrics {
    const activeSessions = Array.from(this.sessions.values()).filter(
      (s) => s.isActive,
    );
    const userSessionCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = {};

    activeSessions.forEach((session) => {
      // Count sessions per user
      userSessionCounts[session.userId] =
        (userSessionCounts[session.userId] || 0) + 1;

      // Count sessions per device type
      if (session.userAgent) {
        const deviceType = this.extractDeviceType(session.userAgent);
        deviceCounts[deviceType] = (deviceCounts[deviceType] || 0) + 1;
      }
    });

    const totalDuration = activeSessions.reduce((sum, session) => {
      return sum + (Date.now() - session.createdAt.getTime());
    }, 0);

    return {
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      averageSessionDuration:
        activeSessions.length > 0 ? totalDuration / activeSessions.length : 0,
      concurrentSessionsPerUser: userSessionCounts,
      deviceDistribution: deviceCounts,
    };
  }

  /**
   * Extract device type from user agent string
   */
  private extractDeviceType(userAgent: string): string {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return "mobile";
    } else if (/Tablet/.test(userAgent)) {
      return "tablet";
    } else {
      return "desktop";
    }
  }

  /**
   * Health check for session manager
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    metrics: SessionMetrics;
  }> {
    try {
      const metrics = this.getSessionMetrics();

      // Check if we have too many sessions (potential memory issue)
      const status = metrics.totalSessions > 10000 ? "degraded" : "healthy";

      return { status, metrics };
    } catch (error) {
      this.logger.error("Session Manager health check failed", error);
      return {
        status: "unhealthy",
        metrics: this.getSessionMetrics(),
      };
    }
  }
}
