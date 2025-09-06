#!/usr/bin/env node

/**
 * Security Configuration Validation Script
 *
 * This script validates the security configuration of the Bytebot Agent
 * to ensure production readiness and compliance with security best practices.
 *
 * Usage:
 *   node scripts/validate-security-config.js [environment]
 *
 * Examples:
 *   node scripts/validate-security-config.js development
 *   node scripts/validate-security-config.js production
 *
 * @author Security Configuration Specialist
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

/**
 * Security validation results
 */
class ValidationResult {
  constructor() {
    this.passed = [];
    this.warnings = [];
    this.failures = [];
    this.critical = [];
  }

  addPass(message) {
    this.passed.push(message);
  }

  addWarning(message, recommendation = null) {
    this.warnings.push({ message, recommendation });
  }

  addFailure(message, recommendation = null) {
    this.failures.push({ message, recommendation });
  }

  addCritical(message, recommendation = null) {
    this.critical.push({ message, recommendation });
  }

  get hasErrors() {
    return this.failures.length > 0 || this.critical.length > 0;
  }

  get score() {
    const total =
      this.passed.length +
      this.warnings.length +
      this.failures.length +
      this.critical.length;
    if (total === 0) return 0;

    const weighted =
      this.passed.length * 1 +
      this.warnings.length * 0.7 +
      this.failures.length * 0.3 +
      this.critical.length * 0;
    return Math.round((weighted / total) * 100);
  }
}

/**
 * Security Configuration Validator
 */
class SecurityConfigValidator {
  constructor(environment = 'development') {
    this.environment = environment;
    this.config = {};
    this.result = new ValidationResult();

    console.log(
      `${colors.blue}${colors.bold}Bytebot Agent Security Configuration Validator${colors.reset}`,
    );
    console.log(`Environment: ${colors.yellow}${environment}${colors.reset}`);
    console.log('=' * 60);
  }

  /**
   * Load environment configuration
   */
  loadConfiguration() {
    try {
      // Try to load .env file
      const envFile = path.join(__dirname, '..', '.env');
      if (fs.existsSync(envFile)) {
        const envContent = fs.readFileSync(envFile, 'utf8');
        this.parseEnvFile(envContent);
        this.result.addPass('Environment file loaded successfully');
      } else {
        this.result.addWarning(
          '.env file not found',
          'Create .env file from .env.example',
        );
      }

      // Load from process.env (Kubernetes/Docker environment)
      Object.keys(process.env).forEach((key) => {
        if (
          key.startsWith('JWT_') ||
          key.startsWith('DATABASE_') ||
          key.startsWith('API_') ||
          key.startsWith('ENABLE_') ||
          key === 'NODE_ENV' ||
          key.endsWith('_API_KEY')
        ) {
          this.config[key] = process.env[key];
        }
      });
    } catch (error) {
      this.result.addCritical(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Parse .env file content
   */
  parseEnvFile(content) {
    const lines = content.split('\\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        this.config[key] = value;
      }
    }
  }

  /**
   * Validate JWT configuration
   */
  validateJWTConfiguration() {
    console.log('\\n🔐 Validating JWT Configuration...');

    const jwtSecret = this.config.JWT_SECRET;
    if (!jwtSecret) {
      this.result.addCritical(
        'JWT_SECRET is not configured',
        'Set JWT_SECRET environment variable',
      );
      return;
    }

    // Check JWT secret strength
    if (jwtSecret.includes('your-') || jwtSecret.includes('change-this')) {
      this.result.addCritical(
        'JWT_SECRET contains default placeholder values',
        'Generate secure random JWT secret',
      );
    } else if (jwtSecret.length < 32) {
      this.result.addCritical(
        'JWT_SECRET is too short (< 32 characters)',
        'Use at least 64 characters for JWT secret',
      );
    } else if (jwtSecret.length < 64) {
      this.result.addWarning(
        'JWT_SECRET should be at least 64 characters for optimal security',
        'Generate 64+ character JWT secret',
      );
    } else {
      this.result.addPass(
        `JWT_SECRET length is adequate (${jwtSecret.length} chars)`,
      );
    }

    // Check entropy
    const entropy = this.calculateEntropy(jwtSecret);
    if (entropy < 3.5) {
      this.result.addWarning(
        'JWT_SECRET has low entropy',
        'Use a cryptographically random secret',
      );
    } else {
      this.result.addPass(
        `JWT_SECRET has adequate entropy (${entropy.toFixed(2)})`,
      );
    }

    // Validate token expiration
    const expiresIn = this.config.JWT_EXPIRES_IN || '15m';
    const refreshExpiresIn = this.config.JWT_REFRESH_EXPIRES_IN || '7d';

    this.validateTokenExpiration('JWT_EXPIRES_IN', expiresIn, {
      min: '5m',
      max: '1h',
      recommended: '15m',
    });
    this.validateTokenExpiration('JWT_REFRESH_EXPIRES_IN', refreshExpiresIn, {
      min: '1h',
      max: this.environment === 'production' ? '7d' : '30d',
      recommended: this.environment === 'production' ? '24h' : '7d',
    });

    // Validate encryption key
    const encryptionKey = this.config.ENCRYPTION_KEY;
    if (!encryptionKey) {
      this.result.addCritical(
        'ENCRYPTION_KEY is not configured',
        'Set ENCRYPTION_KEY environment variable',
      );
    } else if (
      encryptionKey.includes('your-') ||
      encryptionKey.includes('change-this')
    ) {
      this.result.addCritical(
        'ENCRYPTION_KEY contains default values',
        'Generate secure random encryption key',
      );
    } else if (
      encryptionKey.length !== 64 ||
      !/^[0-9a-f]+$/i.test(encryptionKey)
    ) {
      this.result.addCritical(
        'ENCRYPTION_KEY must be 64 hex characters (32 bytes)',
        'Generate with: openssl rand -hex 32',
      );
    } else {
      this.result.addPass('ENCRYPTION_KEY format is valid');
    }
  }

  /**
   * Validate database configuration
   */
  validateDatabaseConfiguration() {
    console.log('\\n🗄️  Validating Database Configuration...');

    const databaseUrl = this.config.DATABASE_URL;
    if (!databaseUrl) {
      this.result.addCritical(
        'DATABASE_URL is not configured',
        'Set DATABASE_URL environment variable',
      );
      return;
    }

    // Check for SSL in production
    if (this.environment === 'production') {
      if (
        !databaseUrl.includes('sslmode=require') &&
        !databaseUrl.includes('ssl=true')
      ) {
        this.result.addCritical(
          'Production database should use SSL',
          'Add ?sslmode=require to DATABASE_URL',
        );
      } else {
        this.result.addPass('Database SSL configuration detected');
      }
    }

    // Check for default credentials
    if (
      databaseUrl.includes('postgres:postgres') ||
      databaseUrl.includes('user:password')
    ) {
      this.result.addCritical(
        'Database uses default credentials',
        'Use strong, unique database credentials',
      );
    } else {
      this.result.addPass('Database credentials appear to be customized');
    }

    // Validate connection pool settings
    const maxConnections = parseInt(this.config.DATABASE_MAX_CONNECTIONS) || 10;
    if (this.environment === 'production' && maxConnections < 20) {
      this.result.addWarning(
        'DATABASE_MAX_CONNECTIONS is low for production',
        'Consider increasing to 20-50 for production',
      );
    } else {
      this.result.addPass(`Database max connections: ${maxConnections}`);
    }
  }

  /**
   * Validate security features
   */
  validateSecurityFeatures() {
    console.log('\\n🛡️  Validating Security Features...');

    const securityFeatures = [
      {
        key: 'ENABLE_AUTHENTICATION',
        required: this.environment === 'production',
      },
      {
        key: 'ENABLE_RATE_LIMITING',
        required: this.environment === 'production',
      },
      {
        key: 'ENABLE_CIRCUIT_BREAKER',
        recommended: this.environment === 'production',
      },
      { key: 'ENABLE_HEALTH_CHECKS', required: true },
    ];

    securityFeatures.forEach(({ key, required, recommended }) => {
      const value = this.config[key];
      const isEnabled = value === 'true';

      if (required && !isEnabled) {
        this.result.addCritical(
          `${key} must be enabled for ${this.environment}`,
          `Set ${key}=true`,
        );
      } else if (
        recommended &&
        !isEnabled &&
        this.environment === 'production'
      ) {
        this.result.addWarning(
          `${key} is recommended for production`,
          `Consider setting ${key}=true`,
        );
      } else if (isEnabled) {
        this.result.addPass(`${key} is enabled`);
      }
    });

    // Validate CORS configuration
    this.validateCORSConfiguration();

    // Validate rate limiting
    this.validateRateLimiting();
  }

  /**
   * Validate CORS configuration
   */
  validateCORSConfiguration() {
    const corsOrigins = this.config.API_CORS_ORIGINS;

    if (!corsOrigins) {
      this.result.addWarning(
        'CORS origins not configured',
        'Set API_CORS_ORIGINS environment variable',
      );
      return;
    }

    if (corsOrigins === '*') {
      if (this.environment === 'production') {
        this.result.addCritical(
          'CORS allows all origins in production',
          'Specify explicit origins for production',
        );
      } else {
        this.result.addWarning(
          'CORS allows all origins',
          'Consider restricting origins',
        );
      }
    } else {
      const origins = corsOrigins.split(',').map((o) => o.trim());
      const hasHttpInProduction =
        this.environment === 'production' &&
        origins.some((o) => o.startsWith('http://'));

      if (hasHttpInProduction) {
        this.result.addCritical(
          'CORS allows HTTP origins in production',
          'Use HTTPS origins only in production',
        );
      } else {
        this.result.addPass(
          `CORS configured with ${origins.length} specific origins`,
        );
      }
    }
  }

  /**
   * Validate rate limiting configuration
   */
  validateRateLimiting() {
    const window = parseInt(this.config.API_RATE_LIMIT_WINDOW) || 900000;
    const maxRequests =
      parseInt(this.config.API_RATE_LIMIT_MAX_REQUESTS) || 100;

    const requestsPerMinute = maxRequests / (window / 60000);

    if (this.environment === 'production') {
      if (requestsPerMinute > 10) {
        this.result.addWarning(
          'Rate limit may be too permissive for production',
          'Consider stricter rate limiting',
        );
      } else {
        this.result.addPass(
          `Rate limiting: ${requestsPerMinute.toFixed(1)} requests/minute`,
        );
      }
    } else {
      this.result.addPass(
        `Rate limiting configured: ${maxRequests} requests per ${window / 1000}s`,
      );
    }
  }

  /**
   * Validate API keys and secrets
   */
  validateAPIKeys() {
    console.log('\\n🔑 Validating API Keys...');

    const apiKeys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY'];

    let configuredKeys = 0;
    apiKeys.forEach((key) => {
      const value = this.config[key];
      if (value && value !== 'your-' + key.toLowerCase().replace('_', '-')) {
        configuredKeys++;
        this.result.addPass(`${key} is configured`);
      } else if (value) {
        this.result.addWarning(
          `${key} uses placeholder value`,
          `Configure actual API key for ${key}`,
        );
      }
    });

    if (configuredKeys === 0) {
      this.result.addWarning(
        'No LLM API keys configured',
        'Configure at least one LLM provider API key',
      );
    }
  }

  /**
   * Validate production-specific settings
   */
  validateProductionSettings() {
    if (this.environment !== 'production') return;

    console.log('\\n🏭 Validating Production Settings...');

    const productionChecks = [
      {
        key: 'DEBUG_MODE',
        shouldBe: 'false',
        message: 'Debug mode should be disabled in production',
      },
      {
        key: 'ENABLE_SWAGGER',
        shouldBe: 'false',
        message: 'Swagger should be disabled in production',
      },
      {
        key: 'LOG_LEVEL',
        shouldBeOneOf: ['warn', 'error'],
        message: 'Log level should be warn or error in production',
      },
      {
        key: 'LOG_FORMAT',
        shouldBe: 'json',
        message: 'Log format should be JSON in production',
      },
    ];

    productionChecks.forEach(({ key, shouldBe, shouldBeOneOf, message }) => {
      const value = this.config[key];

      if (shouldBe && value !== shouldBe) {
        this.result.addWarning(message, `Set ${key}=${shouldBe}`);
      } else if (shouldBeOneOf && !shouldBeOneOf.includes(value)) {
        this.result.addWarning(
          message,
          `Set ${key} to one of: ${shouldBeOneOf.join(', ')}`,
        );
      } else if (
        value === shouldBe ||
        (shouldBeOneOf && shouldBeOneOf.includes(value))
      ) {
        this.result.addPass(`${key} properly configured for production`);
      }
    });
  }

  /**
   * Calculate string entropy
   */
  calculateEntropy(str) {
    const freq = {};
    for (let char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;

    for (let char in freq) {
      const p = freq[char] / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * Validate token expiration format and values
   */
  validateTokenExpiration(key, value, { min, max, recommended }) {
    const timeValue = this.parseTimeString(value);
    const minValue = this.parseTimeString(min);
    const maxValue = this.parseTimeString(max);
    const recommendedValue = this.parseTimeString(recommended);

    if (!timeValue) {
      this.result.addFailure(
        `${key} has invalid format: ${value}`,
        'Use format like 15m, 1h, 7d',
      );
      return;
    }

    if (timeValue < minValue) {
      this.result.addWarning(
        `${key} is too short (${value})`,
        `Minimum recommended: ${min}`,
      );
    } else if (timeValue > maxValue) {
      this.result.addWarning(
        `${key} is too long (${value})`,
        `Maximum recommended: ${max}`,
      );
    } else if (timeValue === recommendedValue) {
      this.result.addPass(`${key} uses recommended value (${value})`);
    } else {
      this.result.addPass(`${key} is within acceptable range (${value})`);
    }
  }

  /**
   * Parse time string to milliseconds
   */
  parseTimeString(timeStr) {
    const match = timeStr.match(/^(\\d+)([smhd])$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }

  /**
   * Generate security report
   */
  generateReport() {
    console.log('\\n' + '=' * 60);
    console.log(`${colors.bold}SECURITY VALIDATION REPORT${colors.reset}`);
    console.log('=' * 60);

    // Security Score
    const score = this.result.score;
    const scoreColor =
      score >= 90 ? colors.green : score >= 70 ? colors.yellow : colors.red;
    console.log(`Security Score: ${scoreColor}${score}%${colors.reset}`);

    // Summary
    console.log(`\\n${colors.bold}Summary:${colors.reset}`);
    console.log(
      `${colors.green}✓ Passed: ${this.result.passed.length}${colors.reset}`,
    );
    console.log(
      `${colors.yellow}⚠ Warnings: ${this.result.warnings.length}${colors.reset}`,
    );
    console.log(
      `${colors.red}✗ Failures: ${this.result.failures.length}${colors.reset}`,
    );
    console.log(
      `${colors.red}${colors.bold}🚨 Critical: ${this.result.critical.length}${colors.reset}`,
    );

    // Passed checks
    if (this.result.passed.length > 0) {
      console.log(
        `\\n${colors.green}${colors.bold}✓ PASSED CHECKS:${colors.reset}`,
      );
      this.result.passed.forEach((message) => {
        console.log(`  ${colors.green}✓${colors.reset} ${message}`);
      });
    }

    // Warnings
    if (this.result.warnings.length > 0) {
      console.log(
        `\\n${colors.yellow}${colors.bold}⚠ WARNINGS:${colors.reset}`,
      );
      this.result.warnings.forEach(({ message, recommendation }) => {
        console.log(`  ${colors.yellow}⚠${colors.reset} ${message}`);
        if (recommendation) {
          console.log(`    ${colors.yellow}→${colors.reset} ${recommendation}`);
        }
      });
    }

    // Failures
    if (this.result.failures.length > 0) {
      console.log(`\\n${colors.red}${colors.bold}✗ FAILURES:${colors.reset}`);
      this.result.failures.forEach(({ message, recommendation }) => {
        console.log(`  ${colors.red}✗${colors.reset} ${message}`);
        if (recommendation) {
          console.log(`    ${colors.red}→${colors.reset} ${recommendation}`);
        }
      });
    }

    // Critical issues
    if (this.result.critical.length > 0) {
      console.log(
        `\\n${colors.red}${colors.bold}🚨 CRITICAL ISSUES:${colors.reset}`,
      );
      this.result.critical.forEach(({ message, recommendation }) => {
        console.log(
          `  ${colors.red}${colors.bold}🚨${colors.reset} ${message}`,
        );
        if (recommendation) {
          console.log(
            `    ${colors.red}${colors.bold}→${colors.reset} ${recommendation}`,
          );
        }
      });
    }

    // Final recommendation
    console.log('\\n' + '=' * 60);
    if (this.result.critical.length > 0) {
      console.log(
        `${colors.red}${colors.bold}❌ CRITICAL ISSUES MUST BE RESOLVED BEFORE PRODUCTION DEPLOYMENT${colors.reset}`,
      );
    } else if (this.result.failures.length > 0) {
      console.log(
        `${colors.yellow}${colors.bold}⚠️  FAILURES SHOULD BE ADDRESSED BEFORE PRODUCTION DEPLOYMENT${colors.reset}`,
      );
    } else if (this.result.warnings.length > 0) {
      console.log(
        `${colors.yellow}🟡 REVIEW WARNINGS FOR OPTIMAL SECURITY${colors.reset}`,
      );
    } else {
      console.log(
        `${colors.green}${colors.bold}✅ SECURITY CONFIGURATION VALIDATION PASSED${colors.reset}`,
      );
    }

    return this.result.hasErrors ? 1 : 0;
  }

  /**
   * Run complete security validation
   */
  async run() {
    try {
      this.loadConfiguration();
      this.validateJWTConfiguration();
      this.validateDatabaseConfiguration();
      this.validateSecurityFeatures();
      this.validateAPIKeys();
      this.validateProductionSettings();

      return this.generateReport();
    } catch (error) {
      console.error(
        `${colors.red}Security validation failed: ${error.message}${colors.reset}`,
      );
      return 1;
    }
  }
}

// Main execution
if (require.main === module) {
  const environment = process.argv[2] || process.env.NODE_ENV || 'development';
  const validator = new SecurityConfigValidator(environment);

  validator.run().then((exitCode) => {
    process.exit(exitCode);
  });
}

module.exports = SecurityConfigValidator;
