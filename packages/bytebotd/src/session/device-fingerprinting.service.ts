/**
 * Device Fingerprinting Service - PARLANT Phase 1 Multi-Device Support
 *
 * Advanced device identification and tracking system supporting:
 * - Comprehensive device fingerprinting with hardware and software characteristics
 * - Multi-device session coordination and management
 * - Device reputation and trust scoring
 * - Anomaly detection for device spoofing and suspicious activity
 * - Privacy-compliant device tracking with user consent management
 * - Enterprise-grade device security validation
 *
 * @author PARLANT Device Fingerprinting Implementation Team
 * @version 1.0.0
 * @since PARLANT Phase 1 Integration
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { SecurityAuditService, AuditEventType, AuditSeverity } from '../security/security-audit.service';

// ===== DEVICE FINGERPRINTING ENUMS =====

/**
 * Device trust levels based on fingerprint analysis
 */
export enum DeviceTrustLevel {
  UNKNOWN = 0,
  UNTRUSTED = 1,
  LOW_TRUST = 2,
  MEDIUM_TRUST = 3,
  HIGH_TRUST = 4,
  VERIFIED = 5
}

/**
 * Device fingerprint validation status
 */
export enum FingerprintValidationStatus {
  VALID = 'VALID',
  SUSPICIOUS = 'SUSPICIOUS',
  INVALID = 'INVALID',
  SPOOFED = 'SPOOFED',
  BLOCKED = 'BLOCKED'
}

/**
 * Device activity patterns for behavioral analysis
 */
export enum DeviceActivityPattern {
  NORMAL = 'NORMAL',
  SUSPICIOUS = 'SUSPICIOUS',
  BOT_LIKE = 'BOT_LIKE',
  AUTOMATED = 'AUTOMATED',
  HUMAN_VERIFIED = 'HUMAN_VERIFIED'
}

// ===== DEVICE INTERFACES =====

/**
 * Comprehensive device characteristics for fingerprinting
 */
export interface DeviceCharacteristics {
  readonly deviceId: string;
  readonly userAgent: string;
  readonly screenResolution: string;
  readonly availableScreenResolution: string;
  readonly colorDepth: number;
  readonly pixelRatio: number;
  readonly timezone: string;
  readonly timezoneOffset: number;
  readonly language: string;
  readonly languages: string[];
  readonly platform: string;
  readonly hardwareConcurrency: number;
  readonly maxTouchPoints: number;
  readonly cookieEnabled: boolean;
  readonly doNotTrack: boolean;
  readonly webglVendor: string;
  readonly webglRenderer: string;
  readonly canvasFingerprint: string;
  readonly audioFingerprint: string;
  readonly fontList: string[];
  readonly plugins: PluginInfo[];
  readonly localStorage: boolean;
  readonly sessionStorage: boolean;
  readonly indexedDB: boolean;
  readonly webSQL: boolean;
  readonly cpuClass?: string;
  readonly oscpu?: string;
  readonly deviceMemory?: number;
  readonly connection?: NetworkConnection;
}

/**
 * Plugin information for fingerprinting
 */
export interface PluginInfo {
  readonly name: string;
  readonly filename: string;
  readonly description: string;
  readonly version: string;
}

/**
 * Network connection information
 */
export interface NetworkConnection {
  readonly effectiveType: string;
  readonly downlink: number;
  readonly rtt: number;
  readonly saveData: boolean;
}

/**
 * Device reputation score and history
 */
export interface DeviceReputation {
  readonly deviceId: string;
  readonly trustLevel: DeviceTrustLevel;
  readonly reputationScore: number;
  readonly firstSeen: Date;
  readonly lastSeen: Date;
  readonly totalSessions: number;
  readonly successfulLogins: number;
  readonly failedLogins: number;
  readonly suspiciousActivity: number;
  readonly securityViolations: number;
  readonly geoLocations: GeoLocation[];
  readonly userAgentHistory: string[];
  readonly fingerprintHistory: string[];
  readonly riskFactors: DeviceRiskFactor[];
  readonly validationStatus: FingerprintValidationStatus;
  readonly activityPattern: DeviceActivityPattern;
}

/**
 * Geographic location information
 */
export interface GeoLocation {
  readonly country: string;
  readonly region: string;
  readonly city: string;
  readonly coordinates: [number, number];
  readonly accuracy: number;
  readonly timestamp: Date;
  readonly ipAddress: string;
  readonly isp: string;
  readonly organization: string;
  readonly vpnDetected: boolean;
  readonly proxyDetected: boolean;
  readonly torDetected: boolean;
}

/**
 * Device risk factors for security analysis
 */
export interface DeviceRiskFactor {
  readonly type: 'suspicious_location' | 'user_agent_change' | 'fingerprint_mismatch' | 'unusual_activity' | 'known_threat';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly detectedAt: Date;
  readonly evidence: Record<string, any>;
  readonly resolved: boolean;
  readonly resolvedAt?: Date;
}

/**
 * Device fingerprint analysis result
 */
export interface FingerprintAnalysis {
  readonly deviceId: string;
  readonly fingerprint: string;
  readonly trustLevel: DeviceTrustLevel;
  readonly confidence: number;
  readonly anomalies: FingerprintAnomaly[];
  readonly riskScore: number;
  readonly recommendation: 'allow' | 'challenge' | 'block';
  readonly reasoning: string[];
  readonly validationStatus: FingerprintValidationStatus;
  readonly processedAt: Date;
}

/**
 * Fingerprint anomaly detection
 */
export interface FingerprintAnomaly {
  readonly type: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly field: string;
  readonly expectedValue: any;
  readonly actualValue: any;
  readonly confidence: number;
  readonly description: string;
}

/**
 * Multi-device session coordination
 */
export interface MultiDeviceSession {
  readonly userId: string;
  readonly primaryDeviceId: string;
  readonly connectedDevices: DeviceSession[];
  readonly createdAt: Date;
  readonly lastActivity: Date;
  readonly syncEnabled: boolean;
  readonly contextSharing: boolean;
  readonly maxDevices: number;
  readonly sessionPolicy: 'exclusive' | 'concurrent' | 'limited';
}

/**
 * Individual device session within multi-device context
 */
export interface DeviceSession {
  readonly deviceId: string;
  readonly sessionId: string;
  readonly deviceType: string;
  readonly isPrimary: boolean;
  readonly connectedAt: Date;
  readonly lastActivity: Date;
  readonly syncStatus: 'active' | 'passive' | 'disconnected';
  readonly capabilities: string[];
  readonly restrictions: string[];
}

// ===== DEVICE FINGERPRINTING SERVICE =====

/**
 * Device Fingerprinting Service for PARLANT Phase 1
 *
 * Provides comprehensive device identification, tracking, and security validation
 * for multi-device session management and enterprise security.
 */
@Injectable()
export class DeviceFingerprintingService implements OnModuleInit {
  private readonly logger = new Logger(DeviceFingerprintingService.name);
  private readonly redisClient: Redis;
  private readonly deviceCache = new Map<string, DeviceReputation>();
  private readonly fingerprintCache = new Map<string, DeviceCharacteristics>();
  private readonly analysisCache = new Map<string, FingerprintAnalysis>();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: SecurityAuditService
  ) {
    // Initialize Redis client for device data persistence
    this.redisClient = new Redis(
      this.configService.get<string>('DEVICE_REDIS_URL', 'redis://localhost:6379'),
      {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000
      }
    );

    this.logger.log('Device Fingerprinting Service initialized');
  }

  /**
   * Module initialization
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.redisClient.connect();
      this.logger.log('Connected to Redis for device fingerprinting data');

      // Load existing device reputations
      await this.loadDeviceReputations();

      this.logger.log('Device Fingerprinting Service fully initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Device Fingerprinting Service', error);
      throw error;
    }
  }

  // ===== DEVICE FINGERPRINT GENERATION =====

  /**
   * Generate comprehensive device fingerprint
   */
  async generateDeviceFingerprint(characteristics: Partial<DeviceCharacteristics>): Promise<DeviceCharacteristics> {
    const startTime = Date.now();

    try {
      this.logger.debug('Generating device fingerprint');

      // Create complete device characteristics
      const deviceCharacteristics: DeviceCharacteristics = {
        deviceId: characteristics.deviceId || uuidv4(),
        userAgent: characteristics.userAgent || 'unknown',
        screenResolution: characteristics.screenResolution || 'unknown',
        availableScreenResolution: characteristics.availableScreenResolution || 'unknown',
        colorDepth: characteristics.colorDepth || 24,
        pixelRatio: characteristics.pixelRatio || 1,
        timezone: characteristics.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: characteristics.timezoneOffset || new Date().getTimezoneOffset(),
        language: characteristics.language || 'en-US',
        languages: characteristics.languages || ['en-US'],
        platform: characteristics.platform || 'unknown',
        hardwareConcurrency: characteristics.hardwareConcurrency || navigator.hardwareConcurrency || 0,
        maxTouchPoints: characteristics.maxTouchPoints || 0,
        cookieEnabled: characteristics.cookieEnabled ?? true,
        doNotTrack: characteristics.doNotTrack ?? false,
        webglVendor: characteristics.webglVendor || 'unknown',
        webglRenderer: characteristics.webglRenderer || 'unknown',
        canvasFingerprint: characteristics.canvasFingerprint || await this.generateCanvasFingerprint(),
        audioFingerprint: characteristics.audioFingerprint || await this.generateAudioFingerprint(),
        fontList: characteristics.fontList || [],
        plugins: characteristics.plugins || [],
        localStorage: characteristics.localStorage ?? true,
        sessionStorage: characteristics.sessionStorage ?? true,
        indexedDB: characteristics.indexedDB ?? true,
        webSQL: characteristics.webSQL ?? false,
        cpuClass: characteristics.cpuClass,
        oscpu: characteristics.oscpu,
        deviceMemory: characteristics.deviceMemory,
        connection: characteristics.connection
      };

      // Cache device characteristics
      this.fingerprintCache.set(deviceCharacteristics.deviceId, deviceCharacteristics);

      // Persist to Redis
      await this.redisClient.setex(
        `device_characteristics:${deviceCharacteristics.deviceId}`,
        86400, // 24 hours
        JSON.stringify(deviceCharacteristics)
      );

      // Audit fingerprint generation
      await this.auditService.logSecurityEvent({
        eventType: AuditEventType.DEVICE_REGISTRATION,
        severity: AuditSeverity.INFO,
        userId: 'system',
        details: {
          deviceId: deviceCharacteristics.deviceId,
          executionTime: Date.now() - startTime
        },
        metadata: { deviceCharacteristics }
      });

      this.logger.debug(`Device fingerprint generated: ${deviceCharacteristics.deviceId}`);
      return deviceCharacteristics;
    } catch (error) {
      this.logger.error('Failed to generate device fingerprint', error);
      throw error;
    }
  }

  /**
   * Analyze device fingerprint for security validation
   */
  async analyzeDeviceFingerprint(
    deviceCharacteristics: DeviceCharacteristics,
    geoLocation?: GeoLocation
  ): Promise<FingerprintAnalysis> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Analyzing device fingerprint: ${deviceCharacteristics.deviceId}`);

      // Get device reputation
      const reputation = await this.getDeviceReputation(deviceCharacteristics.deviceId);

      // Generate comprehensive fingerprint hash
      const fingerprint = this.generateComprehensiveFingerprint(deviceCharacteristics);

      // Detect anomalies
      const anomalies = await this.detectFingerprintAnomalies(deviceCharacteristics, reputation);

      // Calculate risk score
      const riskScore = this.calculateDeviceRiskScore(deviceCharacteristics, reputation, anomalies, geoLocation);

      // Determine trust level
      const trustLevel = this.calculateTrustLevel(reputation, riskScore, anomalies);

      // Validate fingerprint authenticity
      const validationStatus = this.validateFingerprintAuthenticity(deviceCharacteristics, anomalies, riskScore);

      // Generate recommendation
      const recommendation = this.generateSecurityRecommendation(trustLevel, riskScore, validationStatus);

      // Create analysis result
      const analysis: FingerprintAnalysis = {
        deviceId: deviceCharacteristics.deviceId,
        fingerprint,
        trustLevel,
        confidence: this.calculateConfidenceScore(deviceCharacteristics, reputation),
        anomalies,
        riskScore,
        recommendation,
        reasoning: this.generateReasoningExplanation(trustLevel, riskScore, anomalies, validationStatus),
        validationStatus,
        processedAt: new Date()
      };

      // Cache analysis
      this.analysisCache.set(deviceCharacteristics.deviceId, analysis);

      // Update device reputation
      await this.updateDeviceReputation(deviceCharacteristics.deviceId, analysis, geoLocation);

      // Emit analysis event
      this.eventEmitter.emit('device.analyzed', analysis);

      // Audit analysis
      await this.auditService.logSecurityEvent({
        eventType: AuditEventType.DEVICE_ANALYSIS,
        severity: this.getSeverityFromRiskScore(riskScore),
        userId: 'system',
        details: {
          deviceId: deviceCharacteristics.deviceId,
          trustLevel,
          riskScore,
          recommendation,
          anomalyCount: anomalies.length,
          executionTime: Date.now() - startTime
        },
        metadata: { analysis }
      });

      this.logger.debug(
        `Device fingerprint analysis completed: ${deviceCharacteristics.deviceId}, ` +
        `Trust: ${trustLevel}, Risk: ${riskScore}, Recommendation: ${recommendation}`
      );

      return analysis;
    } catch (error) {
      this.logger.error(`Failed to analyze device fingerprint: ${deviceCharacteristics.deviceId}`, error);
      throw error;
    }
  }

  // ===== DEVICE REPUTATION MANAGEMENT =====

  /**
   * Get device reputation and history
   */
  async getDeviceReputation(deviceId: string): Promise<DeviceReputation | null> {
    try {
      // Check cache first
      let reputation = this.deviceCache.get(deviceId);

      if (!reputation) {
        // Load from Redis
        const reputationData = await this.redisClient.get(`device_reputation:${deviceId}`);
        if (reputationData) {
          reputation = JSON.parse(reputationData);
          this.deviceCache.set(deviceId, reputation!);
        }
      }

      return reputation || null;
    } catch (error) {
      this.logger.error(`Failed to get device reputation: ${deviceId}`, error);
      return null;
    }
  }

  /**
   * Update device reputation based on analysis and activity
   */
  async updateDeviceReputation(
    deviceId: string,
    analysis: FingerprintAnalysis,
    geoLocation?: GeoLocation
  ): Promise<void> {
    try {
      let reputation = await this.getDeviceReputation(deviceId);

      if (!reputation) {
        // Create new reputation
        reputation = {
          deviceId,
          trustLevel: analysis.trustLevel,
          reputationScore: 50, // Start with neutral score
          firstSeen: new Date(),
          lastSeen: new Date(),
          totalSessions: 0,
          successfulLogins: 0,
          failedLogins: 0,
          suspiciousActivity: 0,
          securityViolations: 0,
          geoLocations: geoLocation ? [geoLocation] : [],
          userAgentHistory: [],
          fingerprintHistory: [analysis.fingerprint],
          riskFactors: [],
          validationStatus: analysis.validationStatus,
          activityPattern: DeviceActivityPattern.NORMAL
        };
      } else {
        // Update existing reputation
        reputation = {
          ...reputation,
          trustLevel: analysis.trustLevel,
          reputationScore: this.calculateUpdatedReputationScore(reputation, analysis),
          lastSeen: new Date(),
          validationStatus: analysis.validationStatus,
          fingerprintHistory: this.updateFingerprintHistory(reputation.fingerprintHistory, analysis.fingerprint)
        };

        // Add new geo location if provided
        if (geoLocation) {
          reputation.geoLocations = this.updateGeoLocationHistory(reputation.geoLocations, geoLocation);
        }

        // Update risk factors based on anomalies
        reputation.riskFactors = this.updateRiskFactors(reputation.riskFactors, analysis.anomalies);
      }

      // Cache and persist updated reputation
      this.deviceCache.set(deviceId, reputation);
      await this.redisClient.setex(
        `device_reputation:${deviceId}`,
        2592000, // 30 days
        JSON.stringify(reputation)
      );

      this.logger.debug(`Device reputation updated: ${deviceId}, Score: ${reputation.reputationScore}`);
    } catch (error) {
      this.logger.error(`Failed to update device reputation: ${deviceId}`, error);
    }
  }

  // ===== MULTI-DEVICE SESSION COORDINATION =====

  /**
   * Create multi-device session coordination
   */
  async createMultiDeviceSession(
    userId: string,
    primaryDeviceId: string,
    sessionPolicy: 'exclusive' | 'concurrent' | 'limited' = 'concurrent',
    maxDevices: number = 5
  ): Promise<MultiDeviceSession> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Creating multi-device session for user: ${userId}`);

      const multiDeviceSession: MultiDeviceSession = {
        userId,
        primaryDeviceId,
        connectedDevices: [],
        createdAt: new Date(),
        lastActivity: new Date(),
        syncEnabled: true,
        contextSharing: true,
        maxDevices,
        sessionPolicy
      };

      // Persist multi-device session
      await this.redisClient.setex(
        `multi_device_session:${userId}`,
        3600, // 1 hour
        JSON.stringify(multiDeviceSession)
      );

      // Audit multi-device session creation
      await this.auditService.logSecurityEvent({
        eventType: AuditEventType.SESSION_CREATED,
        severity: AuditSeverity.INFO,
        userId,
        details: {
          primaryDeviceId,
          sessionPolicy,
          maxDevices,
          executionTime: Date.now() - startTime
        },
        metadata: { multiDeviceSession }
      });

      this.logger.log(`Multi-device session created for user: ${userId}`);
      return multiDeviceSession;
    } catch (error) {
      this.logger.error(`Failed to create multi-device session for user: ${userId}`, error);
      throw error;
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Generate canvas fingerprint for enhanced device identification
   */
  private async generateCanvasFingerprint(): Promise<string> {
    // Placeholder implementation - would generate canvas-based fingerprint
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate audio fingerprint for enhanced device identification
   */
  private async generateAudioFingerprint(): Promise<string> {
    // Placeholder implementation - would generate audio-based fingerprint
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate comprehensive fingerprint hash
   */
  private generateComprehensiveFingerprint(characteristics: DeviceCharacteristics): string {
    const data = [
      characteristics.userAgent,
      characteristics.screenResolution,
      characteristics.timezone,
      characteristics.language,
      characteristics.platform,
      characteristics.hardwareConcurrency.toString(),
      characteristics.canvasFingerprint,
      characteristics.audioFingerprint,
      JSON.stringify(characteristics.plugins),
      JSON.stringify(characteristics.fontList)
    ].join('|');

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Detect fingerprint anomalies
   */
  private async detectFingerprintAnomalies(
    characteristics: DeviceCharacteristics,
    reputation: DeviceReputation | null
  ): Promise<FingerprintAnomaly[]> {
    const anomalies: FingerprintAnomaly[] = [];

    // Check for impossible combinations
    if (characteristics.hardwareConcurrency > 32) {
      anomalies.push({
        type: 'impossible_hardware',
        severity: 'high',
        field: 'hardwareConcurrency',
        expectedValue: '<=32',
        actualValue: characteristics.hardwareConcurrency,
        confidence: 0.9,
        description: 'Hardware concurrency value exceeds realistic limits'
      });
    }

    // Check for suspicious screen resolutions
    if (characteristics.screenResolution === '1x1' || characteristics.screenResolution === '0x0') {
      anomalies.push({
        type: 'suspicious_screen',
        severity: 'medium',
        field: 'screenResolution',
        expectedValue: 'valid resolution',
        actualValue: characteristics.screenResolution,
        confidence: 0.8,
        description: 'Screen resolution indicates potential automation or spoofing'
      });
    }

    // Check for user agent inconsistencies
    if (characteristics.platform && characteristics.userAgent) {
      const platformInUserAgent = characteristics.userAgent.toLowerCase().includes(characteristics.platform.toLowerCase());
      if (!platformInUserAgent && characteristics.platform !== 'unknown') {
        anomalies.push({
          type: 'platform_mismatch',
          severity: 'medium',
          field: 'platform',
          expectedValue: `platform matching user agent`,
          actualValue: characteristics.platform,
          confidence: 0.7,
          description: 'Platform does not match user agent information'
        });
      }
    }

    return anomalies;
  }

  /**
   * Calculate device risk score
   */
  private calculateDeviceRiskScore(
    characteristics: DeviceCharacteristics,
    reputation: DeviceReputation | null,
    anomalies: FingerprintAnomaly[],
    geoLocation?: GeoLocation
  ): number {
    let riskScore = 0;

    // Base risk from anomalies
    anomalies.forEach(anomaly => {
      switch (anomaly.severity) {
        case 'high':
          riskScore += 30 * anomaly.confidence;
          break;
        case 'medium':
          riskScore += 20 * anomaly.confidence;
          break;
        case 'low':
          riskScore += 10 * anomaly.confidence;
          break;
      }
    });

    // Risk from reputation
    if (reputation) {
      if (reputation.securityViolations > 0) {
        riskScore += reputation.securityViolations * 15;
      }
      if (reputation.suspiciousActivity > 3) {
        riskScore += (reputation.suspiciousActivity - 3) * 10;
      }
      if (reputation.failedLogins > reputation.successfulLogins * 0.5) {
        riskScore += 25;
      }
    }

    // Risk from geo location
    if (geoLocation) {
      if (geoLocation.vpnDetected) riskScore += 20;
      if (geoLocation.proxyDetected) riskScore += 15;
      if (geoLocation.torDetected) riskScore += 40;
    }

    // Normalize to 0-100 scale
    return Math.min(Math.max(riskScore, 0), 100);
  }

  /**
   * Calculate trust level based on reputation and risk score
   */
  private calculateTrustLevel(
    reputation: DeviceReputation | null,
    riskScore: number,
    anomalies: FingerprintAnomaly[]
  ): DeviceTrustLevel {
    if (riskScore >= 80 || anomalies.some(a => a.severity === 'high')) {
      return DeviceTrustLevel.UNTRUSTED;
    }

    if (riskScore >= 60) {
      return DeviceTrustLevel.LOW_TRUST;
    }

    if (riskScore >= 40) {
      return DeviceTrustLevel.MEDIUM_TRUST;
    }

    if (reputation && reputation.totalSessions > 10 && reputation.reputationScore > 80) {
      return DeviceTrustLevel.VERIFIED;
    }

    if (riskScore < 20) {
      return DeviceTrustLevel.HIGH_TRUST;
    }

    return DeviceTrustLevel.MEDIUM_TRUST;
  }

  /**
   * Validate fingerprint authenticity
   */
  private validateFingerprintAuthenticity(
    characteristics: DeviceCharacteristics,
    anomalies: FingerprintAnomaly[],
    riskScore: number
  ): FingerprintValidationStatus {
    if (anomalies.some(a => a.type === 'impossible_hardware' || a.type === 'spoofed_values')) {
      return FingerprintValidationStatus.SPOOFED;
    }

    if (riskScore >= 80) {
      return FingerprintValidationStatus.INVALID;
    }

    if (riskScore >= 60 || anomalies.some(a => a.severity === 'high')) {
      return FingerprintValidationStatus.SUSPICIOUS;
    }

    return FingerprintValidationStatus.VALID;
  }

  /**
   * Generate security recommendation
   */
  private generateSecurityRecommendation(
    trustLevel: DeviceTrustLevel,
    riskScore: number,
    validationStatus: FingerprintValidationStatus
  ): 'allow' | 'challenge' | 'block' {
    if (validationStatus === FingerprintValidationStatus.SPOOFED ||
        validationStatus === FingerprintValidationStatus.BLOCKED ||
        trustLevel === DeviceTrustLevel.UNTRUSTED) {
      return 'block';
    }

    if (riskScore >= 40 ||
        validationStatus === FingerprintValidationStatus.SUSPICIOUS ||
        trustLevel === DeviceTrustLevel.LOW_TRUST) {
      return 'challenge';
    }

    return 'allow';
  }

  /**
   * Calculate confidence score for fingerprint analysis
   */
  private calculateConfidenceScore(
    characteristics: DeviceCharacteristics,
    reputation: DeviceReputation | null
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on available data points
    if (characteristics.userAgent !== 'unknown') confidence += 0.1;
    if (characteristics.screenResolution !== 'unknown') confidence += 0.1;
    if (characteristics.canvasFingerprint) confidence += 0.1;
    if (characteristics.audioFingerprint) confidence += 0.1;
    if (characteristics.plugins.length > 0) confidence += 0.1;
    if (characteristics.fontList.length > 0) confidence += 0.1;

    // Increase confidence based on reputation history
    if (reputation && reputation.totalSessions > 5) confidence += 0.1;
    if (reputation && reputation.totalSessions > 20) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate reasoning explanation for analysis
   */
  private generateReasoningExplanation(
    trustLevel: DeviceTrustLevel,
    riskScore: number,
    anomalies: FingerprintAnomaly[],
    validationStatus: FingerprintValidationStatus
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Trust level: ${trustLevel} (Risk score: ${riskScore})`);
    reasoning.push(`Validation status: ${validationStatus}`);

    if (anomalies.length > 0) {
      reasoning.push(`${anomalies.length} anomalies detected:`);
      anomalies.forEach(anomaly => {
        reasoning.push(`  - ${anomaly.description} (${anomaly.severity} severity)`);
      });
    }

    return reasoning;
  }

  /**
   * Get audit severity from risk score
   */
  private getSeverityFromRiskScore(riskScore: number): AuditSeverity {
    if (riskScore >= 80) return AuditSeverity.CRITICAL;
    if (riskScore >= 60) return AuditSeverity.HIGH;
    if (riskScore >= 40) return AuditSeverity.MEDIUM;
    if (riskScore >= 20) return AuditSeverity.LOW;
    return AuditSeverity.INFO;
  }

  /**
   * Load device reputations from Redis
   */
  private async loadDeviceReputations(): Promise<void> {
    try {
      const reputationKeys = await this.redisClient.keys('device_reputation:*');
      let loadedCount = 0;

      for (const key of reputationKeys) {
        try {
          const reputationData = await this.redisClient.get(key);
          if (reputationData) {
            const reputation: DeviceReputation = JSON.parse(reputationData);
            this.deviceCache.set(reputation.deviceId, reputation);
            loadedCount++;
          }
        } catch (error) {
          this.logger.warn(`Failed to load device reputation from key: ${key}`, error);
        }
      }

      this.logger.log(`Loaded ${loadedCount} device reputations from Redis`);
    } catch (error) {
      this.logger.error('Failed to load device reputations', error);
    }
  }

  /**
   * Calculate updated reputation score
   */
  private calculateUpdatedReputationScore(
    reputation: DeviceReputation,
    analysis: FingerprintAnalysis
  ): number {
    let score = reputation.reputationScore;

    // Adjust based on analysis results
    if (analysis.recommendation === 'allow') {
      score += 2;
    } else if (analysis.recommendation === 'challenge') {
      score -= 1;
    } else if (analysis.recommendation === 'block') {
      score -= 10;
    }

    // Adjust based on anomalies
    analysis.anomalies.forEach(anomaly => {
      switch (anomaly.severity) {
        case 'high':
          score -= 5;
          break;
        case 'medium':
          score -= 3;
          break;
        case 'low':
          score -= 1;
          break;
      }
    });

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Update fingerprint history
   */
  private updateFingerprintHistory(history: string[], newFingerprint: string): string[] {
    const updatedHistory = [...history];

    if (!updatedHistory.includes(newFingerprint)) {
      updatedHistory.push(newFingerprint);
    }

    // Keep only last 10 fingerprints
    return updatedHistory.slice(-10);
  }

  /**
   * Update geo location history
   */
  private updateGeoLocationHistory(history: GeoLocation[], newLocation: GeoLocation): GeoLocation[] {
    const updatedHistory = [...history];

    // Check if this location is significantly different from recent ones
    const isDifferentLocation = !updatedHistory.slice(-5).some(loc =>
      loc.country === newLocation.country &&
      loc.region === newLocation.region &&
      loc.city === newLocation.city
    );

    if (isDifferentLocation) {
      updatedHistory.push(newLocation);
    }

    // Keep only last 20 locations
    return updatedHistory.slice(-20);
  }

  /**
   * Update risk factors based on anomalies
   */
  private updateRiskFactors(
    existingFactors: DeviceRiskFactor[],
    anomalies: FingerprintAnomaly[]
  ): DeviceRiskFactor[] {
    const updatedFactors = [...existingFactors];

    anomalies.forEach(anomaly => {
      const riskFactor: DeviceRiskFactor = {
        type: 'fingerprint_mismatch',
        severity: anomaly.severity,
        description: anomaly.description,
        detectedAt: new Date(),
        evidence: {
          field: anomaly.field,
          expectedValue: anomaly.expectedValue,
          actualValue: anomaly.actualValue,
          confidence: anomaly.confidence
        },
        resolved: false
      };

      updatedFactors.push(riskFactor);
    });

    // Keep only last 50 risk factors
    return updatedFactors.slice(-50);
  }
}