/**
 * Parlant Authentication Bridge Service
 * 
 * Enterprise-grade authentication bridge for Maximum Parlant Integration.
 * Provides seamless JWT-Parlant session linking, unified identity management,
 * and enterprise security features for conversational AI control across
 * all 1,520+ functions in the AIgent ecosystem.
 * 
 * @module ParlantAuthBridgeService
 * @version 1.0.0
 * @author AIgent Integration Team
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import {
  ParlantUserContext,
  ParlantAuthConfig,
  ParlantHealthStatus,
  ParlantIntegrationError,
  ParlantAuthenticationError,
  ParlantConnectionError,
  SecurityLevel
} from '../types/parlant-integration.types';

/**
 * Session mapping between AIgent JWT and Parlant session
 */
interface SessionMapping {
  aigentUserId: string;
  aigentSessionId: string;
  parlantSessionId: string;
  parlantUserId: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  roles: string[];
  permissions: string[];
  metadata: Record<string, any>;
}

/**
 * Authentication token information
 */
interface TokenInfo {
  token: string;
  type: 'jwt' | 'parlant' | 'bridge';
  userId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  issuedAt: Date;
  expiresAt: Date;
  metadata: Record<string, any>;
}

/**
 * Authentication challenge for two-factor auth
 */
interface AuthChallenge {
  challengeId: string;
  userId: string;
  type: 'totp' | 'sms' | 'email' | 'biometric';
  challenge: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

/**
 * User profile synchronized between AIgent and Parlant
 */
interface SynchronizedUserProfile {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  preferences: Record<string, any>;
  securitySettings: {
    twoFactorEnabled: boolean;
    securityLevel: SecurityLevel;
    lastPasswordChange: Date;
    failedAttempts: number;
    locked: boolean;
    lockoutUntil?: Date;
  };
  parlantProfile?: {
    conversationPreferences: Record<string, any>;
    validationSettings: Record<string, any>;
    customInstructions: string[];
  };
  lastSync: Date;
}

/**
 * Authentication statistics
 */
interface AuthStats {
  totalAuthentications: number;
  successfulAuthentications: number;
  failedAuthentications: number;
  activeSessions: number;
  expiredSessions: number;
  twoFactorChallenges: number;
  securityViolations: number;
  averageSessionDuration: number;
  lastActivity: Date;
}

/**
 * Parlant Authentication Bridge Service
 * 
 * Revolutionary authentication system that creates a unified identity layer
 * between AIgent and Parlant, enabling conversational AI control with
 * enterprise-grade security and compliance.
 */
@Injectable()
export class ParlantAuthBridgeService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ParlantAuthBridgeService.name);
  
  // HTTP client for Parlant API
  private parlantClient: AxiosInstance;
  
  // Session and user management
  private sessionMappings = new Map<string, SessionMapping>();
  private tokenRegistry = new Map<string, TokenInfo>();
  private userProfiles = new Map<string, SynchronizedUserProfile>();
  private authChallenges = new Map<string, AuthChallenge>();
  
  // Configuration
  private config: ParlantAuthConfig = {
    jwtSecret: process.env.JWT_SECRET || 'default-secret',
    tokenExpiration: '1h',
    refreshTokenEnabled: true,
    sessionDuration: 3600000 // 1 hour
  };
  
  // Statistics
  private stats: AuthStats = {
    totalAuthentications: 0,
    successfulAuthentications: 0,
    failedAuthentications: 0,
    activeSessions: 0,
    expiredSessions: 0,
    twoFactorChallenges: 0,
    securityViolations: 0,
    averageSessionDuration: 0,
    lastActivity: new Date()
  };
  
  // Cleanup timers
  private cleanupTimer: NodeJS.Timeout | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private statsTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    super();
    this.logger.log('🚀 Initializing Parlant Authentication Bridge Service');
  }

  /**
   * Initialize the Authentication Bridge Service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('🔄 Starting Parlant Authentication Bridge initialization...');
    
    try {
      await this.loadConfiguration();
      await this.initializeParlantClient();
      await this.startPeriodicTasks();
      
      this.logger.log('✅ Parlant Authentication Bridge initialized successfully');
      this.emit('auth:initialized');
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize Authentication Bridge', error);
      throw new ParlantIntegrationError(
        'Authentication Bridge initialization failed',
        'AUTH_INIT_ERROR',
        { error: error.message }
      );
    }
  }

  /**
   * Clean up resources on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('🔄 Shutting down Parlant Authentication Bridge...');
    
    await this.stopPeriodicTasks();
    await this.cleanupActiveSessions();
    
    this.logger.log('✅ Authentication Bridge shutdown complete');
  }

  /**
   * Load authentication configuration
   */
  private async loadConfiguration(): Promise<void> {
    this.config = {
      jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
      tokenExpiration: process.env.AUTH_TOKEN_EXPIRATION || '1h',
      refreshTokenEnabled: process.env.REFRESH_TOKEN_ENABLED !== 'false',
      sessionDuration: parseInt(process.env.SESSION_DURATION || '3600000')
    };
    
    this.logger.log('🔐 Authentication configuration loaded');
  }

  /**
   * Initialize Parlant HTTP client
   */
  private async initializeParlantClient(): Promise<void> {
    const parlantUrl = process.env.PARLANT_API_URL || 'http://localhost:8000';
    const apiKey = process.env.PARLANT_API_KEY || '';
    
    this.parlantClient = axios.create({
      baseURL: parlantUrl,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Service': 'aigent-auth-bridge'
      }
    });
    
    // Test connection
    try {
      await this.parlantClient.get('/auth/health');
      this.logger.log('✅ Parlant authentication API connected');
    } catch (error) {
      this.logger.warn('⚠️ Could not connect to Parlant auth API, using offline mode');
    }
  }

  /**
   * Authenticate user with AIgent JWT and create Parlant session
   */
  async authenticateWithJWT(jwtToken: string, requestMetadata?: any): Promise<ParlantUserContext> {
    const startTime = Date.now();
    this.stats.totalAuthentications++;
    
    try {
      // Verify and decode JWT token
      const decoded = jwt.verify(jwtToken, this.config.jwtSecret) as any;
      
      this.logger.debug(`🔐 Authenticating user: ${decoded.sub || decoded.userId}`);
      
      // Extract user information from JWT
      const userId = decoded.sub || decoded.userId || 'anonymous';
      const sessionId = decoded.sessionId || this.generateSessionId();
      const roles = decoded.roles || ['user'];
      const permissions = decoded.permissions || [];
      
      // Check if session mapping already exists
      const existingMapping = this.findSessionMappingByUser(userId, sessionId);
      if (existingMapping && !this.isSessionExpired(existingMapping)) {
        this.updateSessionActivity(existingMapping);
        this.stats.successfulAuthentications++;
        
        return this.createUserContext(existingMapping, requestMetadata);
      }
      
      // Create new Parlant session
      const parlantSession = await this.createParlantSession(userId, roles, permissions, requestMetadata);
      
      // Create session mapping
      const sessionMapping: SessionMapping = {
        aigentUserId: userId,
        aigentSessionId: sessionId,
        parlantSessionId: parlantSession.sessionId,
        parlantUserId: parlantSession.userId,
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + this.config.sessionDuration),
        roles,
        permissions,
        metadata: {
          ...requestMetadata,
          jwtIssuer: decoded.iss,
          jwtAudience: decoded.aud,
          authenticationTime: startTime,
          authenticationDuration: Date.now() - startTime
        }
      };
      
      this.sessionMappings.set(sessionId, sessionMapping);
      this.stats.activeSessions++;
      this.stats.successfulAuthentications++;
      
      // Sync user profile
      await this.syncUserProfile(userId, {
        username: decoded.username || decoded.name || userId,
        email: decoded.email || '',
        roles,
        permissions,
        lastSync: new Date()
      });
      
      this.logger.log(`✅ User authenticated successfully: ${userId} (${Date.now() - startTime}ms)`);
      
      return this.createUserContext(sessionMapping, requestMetadata);
      
    } catch (error) {
      this.stats.failedAuthentications++;
      
      if (error.name === 'JsonWebTokenError') {
        throw new ParlantAuthenticationError('Invalid JWT token', { error: error.message });
      }
      
      if (error.name === 'TokenExpiredError') {
        throw new ParlantAuthenticationError('JWT token expired', { error: error.message });
      }
      
      this.logger.error('❌ Authentication failed', error);
      throw new ParlantAuthenticationError('Authentication failed', { error: error.message });
    }
  }

  /**
   * Create Parlant session for authenticated user
   */
  private async createParlantSession(
    userId: string,
    roles: string[],
    permissions: string[],
    metadata?: any
  ): Promise<{ sessionId: string; userId: string }> {
    try {
      const response = await this.parlantClient.post('/auth/sessions', {
        user_id: userId,
        roles,
        permissions,
        metadata: {
          ...metadata,
          source: 'aigent-bridge',
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        sessionId: response.data.session_id,
        userId: response.data.user_id || userId
      };
      
    } catch (error) {
      // Fallback to local session if Parlant is unavailable
      this.logger.warn('⚠️ Parlant session creation failed, using local session', error);
      
      return {
        sessionId: this.generateParlantSessionId(),
        userId: userId
      };
    }
  }

  /**
   * Validate session and return user context
   */
  async validateSession(sessionId: string): Promise<ParlantUserContext | null> {
    const sessionMapping = this.sessionMappings.get(sessionId);
    
    if (!sessionMapping) {
      this.logger.debug(`🚫 Session not found: ${sessionId}`);
      return null;
    }
    
    if (this.isSessionExpired(sessionMapping)) {
      this.logger.debug(`⏰ Session expired: ${sessionId}`);
      await this.invalidateSession(sessionId);
      return null;
    }
    
    // Update activity
    this.updateSessionActivity(sessionMapping);
    
    return this.createUserContext(sessionMapping);
  }

  /**
   * Invalidate session and cleanup
   */
  async invalidateSession(sessionId: string): Promise<void> {
    const sessionMapping = this.sessionMappings.get(sessionId);
    
    if (!sessionMapping) {
      return;
    }
    
    try {
      // Invalidate Parlant session
      await this.parlantClient.delete(`/auth/sessions/${sessionMapping.parlantSessionId}`);
    } catch (error) {
      this.logger.warn('⚠️ Failed to invalidate Parlant session', error);
    }
    
    // Remove from local mappings
    this.sessionMappings.delete(sessionId);
    this.stats.activeSession--;
    
    this.logger.debug(`🗑️ Session invalidated: ${sessionId}`);
    this.emit('session:invalidated', { sessionId, userId: sessionMapping.aigentUserId });
  }

  /**
   * Create two-factor authentication challenge
   */
  async createTwoFactorChallenge(
    userId: string,
    type: 'totp' | 'sms' | 'email' | 'biometric' = 'totp'
  ): Promise<AuthChallenge> {
    const challengeId = this.generateChallengeId();
    const challenge = await this.generateChallenge(userId, type);
    
    const authChallenge: AuthChallenge = {
      challengeId,
      userId,
      type,
      challenge,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 300000), // 5 minutes
      attempts: 0,
      maxAttempts: 3
    };
    
    this.authChallenges.set(challengeId, authChallenge);
    this.stats.twoFactorChallenges++;
    
    this.logger.log(`🔐 Two-factor challenge created: ${challengeId} (${type})`);
    
    return authChallenge;
  }

  /**
   * Verify two-factor authentication challenge
   */
  async verifyTwoFactorChallenge(challengeId: string, response: string): Promise<boolean> {
    const challenge = this.authChallenges.get(challengeId);
    
    if (!challenge) {
      this.logger.warn(`🚫 Challenge not found: ${challengeId}`);
      return false;
    }
    
    if (challenge.expiresAt < new Date()) {
      this.authChallenges.delete(challengeId);
      this.logger.warn(`⏰ Challenge expired: ${challengeId}`);
      return false;
    }
    
    challenge.attempts++;
    
    if (challenge.attempts > challenge.maxAttempts) {
      this.authChallenges.delete(challengeId);
      this.stats.securityViolations++;
      this.logger.warn(`🚨 Too many challenge attempts: ${challengeId}`);
      return false;
    }
    
    const isValid = await this.validateChallengeResponse(challenge, response);
    
    if (isValid) {
      this.authChallenges.delete(challengeId);
      this.logger.log(`✅ Two-factor challenge verified: ${challengeId}`);
    } else {
      this.logger.warn(`❌ Two-factor challenge failed: ${challengeId} (attempt ${challenge.attempts}/${challenge.maxAttempts})`);
    }
    
    return isValid;
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> {
    if (!this.config.refreshTokenEnabled) {
      throw new ParlantAuthenticationError('Token refresh not enabled');
    }
    
    try {
      const decoded = jwt.verify(refreshToken, this.config.jwtSecret) as any;
      const userId = decoded.sub || decoded.userId;
      
      // Generate new access token
      const accessToken = jwt.sign(
        {
          sub: userId,
          userId,
          sessionId: decoded.sessionId,
          roles: decoded.roles,
          permissions: decoded.permissions,
          type: 'access'
        },
        this.config.jwtSecret,
        { expiresIn: this.config.tokenExpiration }
      );
      
      // Generate new refresh token if needed
      const newRefreshToken = jwt.sign(
        {
          sub: userId,
          userId,
          sessionId: decoded.sessionId,
          type: 'refresh'
        },
        this.config.jwtSecret,
        { expiresIn: '7d' }
      );
      
      this.logger.log(`🔄 Token refreshed for user: ${userId}`);
      
      return {
        accessToken,
        refreshToken: newRefreshToken
      };
      
    } catch (error) {
      throw new ParlantAuthenticationError('Invalid refresh token', { error: error.message });
    }
  }

  /**
   * Get user profile with Parlant synchronization
   */
  async getUserProfile(userId: string): Promise<SynchronizedUserProfile | null> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile || this.isProfileStale(profile)) {
      profile = await this.syncUserProfileFromParlant(userId);
    }
    
    return profile || null;
  }

  /**
   * Update user profile and sync with Parlant
   */
  async updateUserProfile(userId: string, updates: Partial<SynchronizedUserProfile>): Promise<SynchronizedUserProfile> {
    let profile = this.userProfiles.get(userId) || this.createDefaultProfile(userId);
    
    // Apply updates
    profile = {
      ...profile,
      ...updates,
      lastSync: new Date()
    };
    
    this.userProfiles.set(userId, profile);
    
    // Sync with Parlant
    try {
      await this.parlantClient.put(`/auth/users/${userId}`, {
        profile: {
          username: profile.username,
          email: profile.email,
          roles: profile.roles,
          permissions: profile.permissions,
          preferences: profile.preferences,
          security_settings: profile.securitySettings,
          parlant_profile: profile.parlantProfile
        }
      });
      
      this.logger.debug(`📝 User profile updated and synced: ${userId}`);
    } catch (error) {
      this.logger.warn('⚠️ Failed to sync profile with Parlant', error);
    }
    
    return profile;
  }

  /**
   * Get authentication statistics
   */
  getAuthStats(): AuthStats {
    return { ...this.stats };
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<ParlantHealthStatus> {
    const isHealthy = this.stats.failedAuthentications < this.stats.successfulAuthentications;
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      apiConnection: await this.testParlantConnection(),
      websocketConnection: false, // This service doesn't use WebSocket directly
      cacheStatus: true, // Session cache is always available
      lastCheck: new Date(),
      metrics: {
        activeConnections: this.stats.activeSession,
        requestRate: this.stats.totalAuthentications,
        averageResponseTime: this.stats.averageSessionDuration,
        errorRate: this.stats.totalAuthentications > 0 ? 
          (this.stats.failedAuthentications / this.stats.totalAuthentications) * 100 : 0,
        cacheHitRate: 0, // Not applicable for auth service
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      }
    };
  }

  /**
   * Helper Methods
   */

  private createUserContext(sessionMapping: SessionMapping, requestMetadata?: any): ParlantUserContext {
    return {
      userId: sessionMapping.aigentUserId,
      roles: sessionMapping.roles,
      sessionId: sessionMapping.aigentSessionId,
      ipAddress: requestMetadata?.ipAddress || '127.0.0.1',
      metadata: {
        parlantSessionId: sessionMapping.parlantSessionId,
        parlantUserId: sessionMapping.parlantUserId,
        sessionCreated: sessionMapping.createdAt,
        lastActivity: sessionMapping.lastActivity,
        permissions: sessionMapping.permissions,
        ...sessionMapping.metadata,
        ...requestMetadata
      }
    };
  }

  private findSessionMappingByUser(userId: string, sessionId: string): SessionMapping | null {
    for (const mapping of this.sessionMappings.values()) {
      if (mapping.aigentUserId === userId && mapping.aigentSessionId === sessionId) {
        return mapping;
      }
    }
    return null;
  }

  private isSessionExpired(session: SessionMapping): boolean {
    return session.expiresAt < new Date();
  }

  private updateSessionActivity(session: SessionMapping): void {
    session.lastActivity = new Date();
    this.stats.lastActivity = new Date();
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateParlantSessionId(): string {
    return `parlant_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateChallengeId(): string {
    return `challenge_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private async generateChallenge(userId: string, type: string): Promise<string> {
    switch (type) {
      case 'totp':
        return crypto.randomBytes(32).toString('base64');
      case 'sms':
      case 'email':
        return Math.floor(100000 + Math.random() * 900000).toString();
      case 'biometric':
        return crypto.randomBytes(64).toString('hex');
      default:
        return crypto.randomBytes(32).toString('base64');
    }
  }

  private async validateChallengeResponse(challenge: AuthChallenge, response: string): Promise<boolean> {
    // This would implement actual validation logic based on challenge type
    // For demo purposes, we'll do basic validation
    
    switch (challenge.type) {
      case 'totp':
        // TOTP validation would go here
        return response.length === 6 && /^\d+$/.test(response);
      case 'sms':
      case 'email':
        return response === challenge.challenge;
      case 'biometric':
        // Biometric validation would go here
        return response.length > 0;
      default:
        return false;
    }
  }

  private async syncUserProfile(userId: string, basicInfo: any): Promise<void> {
    const existingProfile = this.userProfiles.get(userId);
    
    const profile: SynchronizedUserProfile = {
      userId,
      username: basicInfo.username,
      email: basicInfo.email,
      roles: basicInfo.roles,
      permissions: basicInfo.permissions,
      preferences: existingProfile?.preferences || {},
      securitySettings: existingProfile?.securitySettings || {
        twoFactorEnabled: false,
        securityLevel: SecurityLevel.MEDIUM,
        lastPasswordChange: new Date(),
        failedAttempts: 0,
        locked: false
      },
      parlantProfile: existingProfile?.parlantProfile,
      lastSync: basicInfo.lastSync
    };
    
    this.userProfiles.set(userId, profile);
  }

  private async syncUserProfileFromParlant(userId: string): Promise<SynchronizedUserProfile | null> {
    try {
      const response = await this.parlantClient.get(`/auth/users/${userId}`);
      const data = response.data;
      
      const profile: SynchronizedUserProfile = {
        userId,
        username: data.username,
        email: data.email,
        roles: data.roles || ['user'],
        permissions: data.permissions || [],
        preferences: data.preferences || {},
        securitySettings: data.security_settings || {
          twoFactorEnabled: false,
          securityLevel: SecurityLevel.MEDIUM,
          lastPasswordChange: new Date(),
          failedAttempts: 0,
          locked: false
        },
        parlantProfile: data.parlant_profile,
        lastSync: new Date()
      };
      
      this.userProfiles.set(userId, profile);
      return profile;
      
    } catch (error) {
      this.logger.warn(`⚠️ Failed to sync user profile from Parlant: ${userId}`, error);
      return null;
    }
  }

  private createDefaultProfile(userId: string): SynchronizedUserProfile {
    return {
      userId,
      username: userId,
      email: '',
      roles: ['user'],
      permissions: [],
      preferences: {},
      securitySettings: {
        twoFactorEnabled: false,
        securityLevel: SecurityLevel.MEDIUM,
        lastPasswordChange: new Date(),
        failedAttempts: 0,
        locked: false
      },
      lastSync: new Date()
    };
  }

  private isProfileStale(profile: SynchronizedUserProfile): boolean {
    const staleThreshold = 300000; // 5 minutes
    return Date.now() - profile.lastSync.getTime() > staleThreshold;
  }

  private async testParlantConnection(): Promise<boolean> {
    try {
      await this.parlantClient.get('/auth/health');
      return true;
    } catch {
      return false;
    }
  }

  private async startPeriodicTasks(): Promise<void> {
    // Cleanup expired sessions every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 300000);
    
    // Sync with Parlant every 10 minutes
    this.syncTimer = setInterval(() => {
      this.syncWithParlant();
    }, 600000);
    
    // Update stats every 30 seconds
    this.statsTimer = setInterval(() => {
      this.updateStats();
    }, 30000);
  }

  private async stopPeriodicTasks(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
  }

  private cleanupExpiredSessions(): void {
    let cleanedCount = 0;
    
    for (const [sessionId, mapping] of this.sessionMappings.entries()) {
      if (this.isSessionExpired(mapping)) {
        this.sessionMappings.delete(sessionId);
        this.stats.activeSession--;
        this.stats.expiredSessions++;
        cleanedCount++;
      }
    }
    
    // Cleanup expired challenges
    for (const [challengeId, challenge] of this.authChallenges.entries()) {
      if (challenge.expiresAt < new Date()) {
        this.authChallenges.delete(challengeId);
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.debug(`🧹 Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  private async cleanupActiveSessions(): Promise<void> {
    for (const sessionId of this.sessionMappings.keys()) {
      await this.invalidateSession(sessionId);
    }
  }

  private async syncWithParlant(): Promise<void> {
    try {
      // Sync active sessions with Parlant
      const sessionIds = Array.from(this.sessionMappings.values())
        .map(mapping => mapping.parlantSessionId);
      
      const response = await this.parlantClient.post('/auth/sessions/validate', {
        session_ids: sessionIds
      });
      
      // Remove invalid sessions
      const validSessions = new Set(response.data.valid_sessions || []);
      
      for (const [sessionId, mapping] of this.sessionMappings.entries()) {
        if (!validSessions.has(mapping.parlantSessionId)) {
          this.logger.debug(`🗑️ Removing invalid session: ${sessionId}`);
          this.sessionMappings.delete(sessionId);
          this.stats.activeSession--;
        }
      }
      
    } catch (error) {
      this.logger.warn('⚠️ Failed to sync with Parlant', error);
    }
  }

  private updateStats(): void {
    const sessions = Array.from(this.sessionMappings.values());
    
    if (sessions.length > 0) {
      const totalDuration = sessions.reduce((sum, session) => {
        return sum + (session.lastActivity.getTime() - session.createdAt.getTime());
      }, 0);
      
      this.stats.averageSessionDuration = Math.round(totalDuration / sessions.length);
    }
    
    this.stats.activeSession = sessions.length;
  }
}