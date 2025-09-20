/**
 * Configuration Security Service - Enterprise-grade configuration security for Bytebot API Platform
 * Provides secure configuration validation, environment variable security, and configuration audit
 *
 * Features:
 * - Configuration validation and sanitization
 * - Environment variable security scanning
 * - Configuration audit logging
 * - Secrets exposure detection
 * - Configuration integrity verification
 * - Security policy enforcement
 *
 * @author Configuration Security Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * Configuration security violation interface
 */
interface SecurityViolation {
  type:
    | 'SECRET_EXPOSURE'
    | 'WEAK_CONFIGURATION'
    | 'INSECURE_DEFAULT'
    | 'VALIDATION_FAILURE';
  severity: 'low' | 'medium' | 'high' | 'critical';
  field: string;
  message: string;
  recommendation: string;
  detected: Date;
}

/**
 * Configuration security status
 */
interface SecurityStatus {
  secure: boolean;
  score: number; // 0-100 security score
  violations: SecurityViolation[];
  lastAudit: Date;
  recommendations: string[];
}

/**
 * Configuration audit entry
 */
interface ConfigurationAuditEntry {
  timestamp: Date;
  action: 'LOAD' | 'VALIDATE' | 'UPDATE' | 'ACCESS';
  source: string;
  field?: string;
  success: boolean;
  securityScore: number;
  violations: number;
}

/**
 * Secure configuration patterns
 */
interface SecureConfigurationPatterns {
  secretPatterns: RegExp[];
  weakValuePatterns: RegExp[];
  insecureProtocolPatterns: RegExp[];
  defaultPasswordPatterns: RegExp[];
}

/**
 * Configuration security service
 * Provides comprehensive security validation and monitoring for application configuration
 */
@Injectable()
export class ConfigurationSecurityService
  extends EventEmitter
  implements OnModuleInit
{
  private readonly logger = new Logger('ConfigurationSecurityService');
  private readonly auditLog: ConfigurationAuditEntry[] = [];
  private readonly maxAuditEntries = 1000;
  private securityPatterns!: SecureConfigurationPatterns;
  private lastSecurityAudit?: Date;
  private currentSecurityScore = 0;

  constructor(private readonly configService: ConfigService) {
    super();
    this.initializeSecurityPatterns();
  }

  /**
   * Initialize configuration security service
   */
  onModuleInit(): void {
    const startTime = Date.now();
    this.logger.log('Initializing Configuration Security Service...');

    try {
      // Perform initial security audit
      const securityStatus = this.performSecurityAudit();

      // Log audit results
      this.logAuditEntry({
        timestamp: new Date(),
        action: 'LOAD',
        source: 'startup',
        success: securityStatus.secure,
        securityScore: securityStatus.score,
        violations: securityStatus.violations.length,
      });

      // Emit security events for critical violations
      const criticalViolations = securityStatus.violations.filter(
        (v) => v.severity === 'critical',
      );
      if (criticalViolations.length > 0) {
        this.emit('criticalSecurityViolations', criticalViolations);
      }

      const initTime = Date.now() - startTime;
      this.logger.log('Configuration Security Service initialized', {
        initTimeMs: initTime,
        securityScore: securityStatus.score,
        violationsFound: securityStatus.violations.length,
        criticalViolations: criticalViolations.length,
      });
    } catch (error) {
      const initTime = Date.now() - startTime;
      this.logger.error(
        'Configuration Security Service initialization failed',
        {
          _error: error instanceof Error ? error.message : String(error),
          initTimeMs: initTime,
        },
      );
      throw error;
    }
  }

  /**
   * Perform comprehensive security audit of configuration
   *
   * @returns Security status with violations and recommendations
   */
  performSecurityAudit(): SecurityStatus {
    const operationId = `security-audit-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Starting configuration security audit...`,
    );

    const violations: SecurityViolation[] = [];
    let score = 100; // Start with perfect score and deduct points

    try {
      // Audit environment variables for secrets exposure
      const secretViolations = this.auditSecretsExposure();
      violations.push(...secretViolations);
      score -= secretViolations.length * 10; // -10 points per secret violation

      // Audit weak configurations
      const weakConfigViolations = this.auditWeakConfigurations();
      violations.push(...weakConfigViolations);
      score -= weakConfigViolations.length * 5; // -5 points per weak config

      // Audit insecure defaults
      const defaultViolations = this.auditInsecureDefaults();
      violations.push(...defaultViolations);
      score -= defaultViolations.length * 3; // -3 points per insecure default

      // Audit required security configurations
      const requiredViolations = this.auditRequiredSecurityConfigs();
      violations.push(...requiredViolations);
      score -= requiredViolations.length * 15; // -15 points per missing required config

      // Ensure score doesn't go below 0
      score = Math.max(0, score);

      const auditTime = Date.now() - startTime;
      const securityStatus: SecurityStatus = {
        secure:
          score >= 80 &&
          violations.filter((v) => v.severity === 'critical').length === 0,
        score,
        violations,
        lastAudit: new Date(),
        recommendations: this.generateSecurityRecommendations(violations),
      };

      this.lastSecurityAudit = securityStatus.lastAudit;
      this.currentSecurityScore = score;

      this.logger.log(`[${operationId}] Security audit completed`, {
        auditTimeMs: auditTime,
        securityScore: score,
        totalViolations: violations.length,
        criticalViolations: violations.filter((v) => v.severity === 'critical')
          .length,
        highViolations: violations.filter((v) => v.severity === 'high').length,
        secure: securityStatus.secure,
      });

      return securityStatus;
    } catch (error) {
      const auditTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Security audit failed`, {
        _error: error instanceof Error ? error.message : String(error),
        auditTimeMs: auditTime,
      });
      throw error;
    }
  }

  /**
   * Validate configuration field security
   *
   * @param field - Configuration field name
   * @param value - Configuration value
   * @returns Validation result with security status
   */
  validateConfigurationSecurity(
    field: string,
    value: unknown,
  ): {
    secure: boolean;
    violations: SecurityViolation[];
    recommendations: string[];
  } {
    const violations: SecurityViolation[] = [];
    const recommendations: string[] = [];

    if (typeof value !== 'string') {
      return { secure: true, violations, recommendations };
    }

    // Check for secret patterns
    for (const pattern of this.securityPatterns.secretPatterns) {
      if (pattern.test(value)) {
        violations.push({
          type: 'SECRET_EXPOSURE',
          severity: 'critical',
          field,
          message: 'Potential secret detected in configuration value',
          recommendation:
            'Use environment variables or secrets management system',
          detected: new Date(),
        });
      }
    }

    // Check for weak values
    for (const pattern of this.securityPatterns.weakValuePatterns) {
      if (pattern.test(value)) {
        violations.push({
          type: 'WEAK_CONFIGURATION',
          severity: 'high',
          field,
          message: 'Weak configuration value detected',
          recommendation: 'Use strong, randomly generated values',
          detected: new Date(),
        });
      }
    }

    // Check for insecure protocols
    for (const pattern of this.securityPatterns.insecureProtocolPatterns) {
      if (pattern.test(value)) {
        violations.push({
          type: 'INSECURE_DEFAULT',
          severity: 'medium',
          field,
          message: 'Insecure protocol detected',
          recommendation: 'Use secure protocols (HTTPS, TLS)',
          detected: new Date(),
        });
      }
    }

    // Check for default passwords
    for (const pattern of this.securityPatterns.defaultPasswordPatterns) {
      if (pattern.test(value)) {
        violations.push({
          type: 'WEAK_CONFIGURATION',
          severity: 'critical',
          field,
          message: 'Default password detected',
          recommendation: 'Change default passwords immediately',
          detected: new Date(),
        });
      }
    }

    const secure = violations.length === 0;
    if (!secure) {
      recommendations.push(...violations.map((v) => v.recommendation));
    }

    return { secure, violations, recommendations };
  }

  /**
   * Get current security status
   *
   * @returns Current security status
   */
  getCurrentSecurityStatus(): {
    score: number;
    lastAudit?: Date;
    requiresAudit: boolean;
  } {
    const now = Date.now();
    const lastAuditTime = this.lastSecurityAudit?.getTime() ?? 0;
    const auditAge = now - lastAuditTime;
    const requiresAudit = auditAge > 24 * 60 * 60 * 1000; // 24 hours

    return {
      score: this.currentSecurityScore,
      lastAudit: this.lastSecurityAudit,
      requiresAudit,
    };
  }

  /**
   * Get security audit history
   *
   * @param limit - Maximum number of entries to return
   * @returns Recent audit entries
   */
  getAuditHistory(limit = 100): ConfigurationAuditEntry[] {
    return this.auditLog
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Generate security hash for configuration integrity
   *
   * @param config - Configuration object
   * @returns Security hash
   */
  generateConfigurationHash(config: Record<string, unknown>): string {
    const configString = JSON.stringify(config, Object.keys(config).sort());
    return crypto.createHash('sha256').update(configString).digest('hex');
  }

  /**
   * Verify configuration integrity
   *
   * @param config - Configuration object
   * @param expectedHash - Expected hash value
   * @returns Integrity verification result
   */
  verifyConfigurationIntegrity(
    config: Record<string, unknown>,
    expectedHash: string,
  ): boolean {
    const currentHash = this.generateConfigurationHash(config);
    return currentHash === expectedHash;
  }

  /**
   * Initialize security patterns for configuration validation
   *
   * @private
   */
  private initializeSecurityPatterns(): void {
    this.securityPatterns = {
      // Patterns that might indicate secrets in configuration
      secretPatterns: [
        /[A-Za-z0-9]{20,}/g, // Long alphanumeric strings (API keys)
        /sk-[A-Za-z0-9]{48}/g, // OpenAI API key pattern
        /xoxb-[A-Za-z0-9-]+/g, // Slack bot token
        /ghp_[A-Za-z0-9]{36}/g, // GitHub personal access token
        /AKIA[A-Z0-9]{16}/g, // AWS access key
        /-----BEGIN [A-Z ]+-----/g, // PEM certificate/key
      ],

      // Patterns for weak configuration values
      weakValuePatterns: [
        /^(password|secret|key)$/i,
        /^(123456|password|admin|root)$/i,
        /^[a-z]{1,8}$/g, // Short lowercase strings
        /^[0-9]{1,8}$/g, // Short numeric strings
      ],

      // Patterns for insecure protocols
      insecureProtocolPatterns: [
        /^http:/i, // HTTP instead of HTTPS
        /^ftp:/i, // FTP instead of SFTP
        /^telnet:/i, // Telnet instead of SSH
      ],

      // Patterns for common default passwords
      defaultPasswordPatterns: [
        /^(admin|password|123456|qwerty|default)$/i,
        /^(changeme|temp|test)$/i,
        /^(root|guest|user)$/i,
      ],
    };
  }

  /**
   * Audit for secrets exposure in environment variables
   *
   * @private
   * @returns Array of secret exposure violations
   */
  private auditSecretsExposure(): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    const env = process.env;

    for (const [key, value] of Object.entries(env)) {
      if (!value) continue;

      // Skip known safe environment variables
      const safeEnvVars = [
        'NODE_ENV',
        'PORT',
        'PATH',
        'HOME',
        'USER',
        'PWD',
        'HOSTNAME',
        'LANG',
        'TZ',
        'SHELL',
      ];

      if (safeEnvVars.includes(key)) continue;

      const validation = this.validateConfigurationSecurity(key, value);
      violations.push(...validation.violations);
    }

    return violations;
  }

  /**
   * Audit for weak configurations
   *
   * @private
   * @returns Array of weak configuration violations
   */
  private auditWeakConfigurations(): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    try {
      // Check JWT secret strength
      const jwtSecret = this.configService.get<string>(
        'app.security.jwtSecret',
      );
      if (jwtSecret && jwtSecret.length < 32) {
        violations.push({
          type: 'WEAK_CONFIGURATION',
          severity: 'high',
          field: 'JWT_SECRET',
          message:
            'JWT secret is too short (minimum 32 characters recommended)',
          recommendation: 'Generate a longer, random JWT secret',
          detected: new Date(),
        });
      }

      // Check encryption key strength
      const encryptionKey = this.configService.get<string>(
        'app.security.encryptionKey',
      );
      if (encryptionKey && encryptionKey.length < 32) {
        violations.push({
          type: 'WEAK_CONFIGURATION',
          severity: 'high',
          field: 'ENCRYPTION_KEY',
          message:
            'Encryption key is too short (minimum 32 characters recommended)',
          recommendation: 'Generate a longer, random encryption key',
          detected: new Date(),
        });
      }

      // Check JWT expiration
      const jwtExpiresIn = this.configService.get<string>(
        'app.security.jwtExpiresIn',
      );
      if (jwtExpiresIn && (jwtExpiresIn === '1y' || jwtExpiresIn === '365d')) {
        violations.push({
          type: 'WEAK_CONFIGURATION',
          severity: 'medium',
          field: 'JWT_EXPIRES_IN',
          message: 'JWT expiration time is too long',
          recommendation: 'Use shorter JWT expiration times (1h-24h)',
          detected: new Date(),
        });
      }
    } catch (error) {
      this.logger.warn('Failed to audit weak configurations', {
        _error: error instanceof Error ? error.message : String(error),
      });
    }

    return violations;
  }

  /**
   * Audit for insecure defaults
   *
   * @private
   * @returns Array of insecure default violations
   */
  private auditInsecureDefaults(): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    try {
      // Check if authentication is disabled in production
      const nodeEnv = this.configService.get<string>('app.nodeEnv');
      const authEnabled = this.configService.get<boolean>(
        'app.features.authentication',
      );

      if (nodeEnv === 'production' && !authEnabled) {
        violations.push({
          type: 'INSECURE_DEFAULT',
          severity: 'critical',
          field: 'ENABLE_AUTHENTICATION',
          message: 'Authentication is disabled in production environment',
          recommendation: 'Enable authentication for production deployments',
          detected: new Date(),
        });
      }

      // Check if rate limiting is disabled in production
      const rateLimitEnabled = this.configService.get<boolean>(
        'app.features.rateLimiting',
      );
      if (nodeEnv === 'production' && !rateLimitEnabled) {
        violations.push({
          type: 'INSECURE_DEFAULT',
          severity: 'high',
          field: 'ENABLE_RATE_LIMITING',
          message: 'Rate limiting is disabled in production environment',
          recommendation: 'Enable rate limiting for production deployments',
          detected: new Date(),
        });
      }

      // Check if debug mode is enabled in production
      const debugMode = this.configService.get<boolean>(
        'app.development.debugMode',
      );
      if (nodeEnv === 'production' && debugMode) {
        violations.push({
          type: 'INSECURE_DEFAULT',
          severity: 'high',
          field: 'DEBUG_MODE',
          message: 'Debug mode is enabled in production environment',
          recommendation: 'Disable debug mode for production deployments',
          detected: new Date(),
        });
      }
    } catch (error) {
      this.logger.warn('Failed to audit insecure defaults', {
        _error: error instanceof Error ? error.message : String(error),
      });
    }

    return violations;
  }

  /**
   * Audit required security configurations
   *
   * @private
   * @returns Array of missing required configuration violations
   */
  private auditRequiredSecurityConfigs(): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    const requiredConfigs = [
      { key: 'app.security.jwtSecret', field: 'JWT_SECRET' },
      { key: 'app.security.encryptionKey', field: 'ENCRYPTION_KEY' },
      { key: 'app.database.url', field: 'DATABASE_URL' },
    ];

    for (const { key, field } of requiredConfigs) {
      try {
        const value = this.configService.get<string>(key);
        if (!value) {
          violations.push({
            type: 'VALIDATION_FAILURE',
            severity: 'critical',
            field,
            message: `Required security configuration ${field} is missing`,
            recommendation: `Set ${field} environment variable`,
            detected: new Date(),
          });
        }
      } catch {
        violations.push({
          type: 'VALIDATION_FAILURE',
          severity: 'critical',
          field,
          message: `Failed to validate required configuration ${field}`,
          recommendation: `Check configuration service and ${field} availability`,
          detected: new Date(),
        });
      }
    }

    return violations;
  }

  /**
   * Generate security recommendations based on violations
   *
   * @private
   * @param violations - Security violations found
   * @returns Array of recommendations
   */
  private generateSecurityRecommendations(
    violations: SecurityViolation[],
  ): string[] {
    const recommendations = new Set<string>();

    // Add specific recommendations based on violation types
    const criticalViolations = violations.filter(
      (v) => v.severity === 'critical',
    );
    const highViolations = violations.filter((v) => v.severity === 'high');

    if (criticalViolations.length > 0) {
      recommendations.add(
        'Address all critical security violations immediately',
      );
      recommendations.add(
        'Consider using Kubernetes secrets or external secret management',
      );
    }

    if (highViolations.length > 0) {
      recommendations.add('Review and strengthen weak configuration values');
      recommendations.add('Implement proper secrets rotation procedures');
    }

    if (violations.some((v) => v.type === 'SECRET_EXPOSURE')) {
      recommendations.add(
        'Move secrets from environment variables to secure secret stores',
      );
      recommendations.add('Implement secrets scanning in CI/CD pipeline');
    }

    if (violations.some((v) => v.type === 'WEAK_CONFIGURATION')) {
      recommendations.add(
        'Generate stronger, random values for security configurations',
      );
      recommendations.add('Review password and key policies');
    }

    if (violations.some((v) => v.type === 'INSECURE_DEFAULT')) {
      recommendations.add(
        'Enable all security features for production environments',
      );
      recommendations.add('Create environment-specific configuration profiles');
    }

    // Add general recommendations
    recommendations.add('Perform regular security configuration audits');
    recommendations.add('Implement configuration change monitoring');

    return Array.from(recommendations);
  }

  /**
   * Log audit entry
   *
   * @private
   * @param entry - Audit entry to log
   */
  private logAuditEntry(_entry: ConfigurationAuditEntry): void {
    this.auditLog.push(entry);

    // Trim audit log to prevent memory growth
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog.splice(0, this.auditLog.length - this.maxAuditEntries);
    }

    // Log significant events
    if (!entry.success || entry.violations > 0) {
      this.logger.warn('Configuration security event', {
        action: entry.action,
        source: entry.source,
        field: entry.field,
        success: entry.success,
        securityScore: entry.securityScore,
        violations: entry.violations,
      });
    }
  }

  /**
   * Cleanup resources on module destroy
   */
  onModuleDestroy(): void {
    this.auditLog.length = 0;
    this.removeAllListeners();
    this.logger.log('Configuration Security Service destroyed');
  }
}
