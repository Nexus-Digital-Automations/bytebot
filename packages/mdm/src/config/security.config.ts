/**
 * Security Configuration
 * Enterprise-grade security settings for MDM platform
 */

import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  // JWT Configuration
  jwt: {
    secret: process.env.MDM_JWT_SECRET || 'mdm-super-secret-key-change-in-production',
    expiresIn: process.env.MDM_JWT_EXPIRES_IN || '24h',
    issuer: 'mdm-platform',
    audience: 'mdm-clients',
    algorithm: 'HS256'
  },

  // Password Security
  password: {
    bcryptRounds: parseInt(process.env.MDM_BCRYPT_ROUNDS, 10) || 12,
    minLength: parseInt(process.env.MDM_PASSWORD_MIN_LENGTH, 10) || 8,
    requireUppercase: process.env.MDM_PASSWORD_REQUIRE_UPPERCASE === 'true',
    requireLowercase: process.env.MDM_PASSWORD_REQUIRE_LOWERCASE === 'true',
    requireNumbers: process.env.MDM_PASSWORD_REQUIRE_NUMBERS === 'true',
    requireSpecialChars: process.env.MDM_PASSWORD_REQUIRE_SPECIAL === 'true'
  },

  // CORS Configuration
  cors: {
    origins: process.env.MDM_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-ID']
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.MDM_RATE_LIMIT_WINDOW, 10) || 900000, // 15 minutes
    max: parseInt(process.env.MDM_RATE_LIMIT_MAX, 10) || 1000,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false
  },

  // API Security
  api: {
    enableHelmet: true,
    enableCsrf: process.env.MDM_ENABLE_CSRF === 'true',
    enableHsts: true,
    enableNoSniff: true,
    enableXssFilter: true,
    enableFrameguard: true
  },

  // Session Security
  session: {
    maxAge: parseInt(process.env.MDM_SESSION_MAX_AGE, 10) || 86400000, // 24 hours
    rolling: true,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  },

  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    iterations: 100000,
    saltLength: 32,
    ivLength: 16
  },

  // Two-Factor Authentication
  twoFactor: {
    enabled: process.env.MDM_2FA_ENABLED === 'true',
    issuer: 'MDM Platform',
    window: 2, // Allow 2 time steps before/after current
    step: 30 // 30 second time step
  },

  // Device Certificate Management
  certificates: {
    autoGenerate: process.env.MDM_AUTO_GENERATE_CERTS === 'true',
    validity: parseInt(process.env.MDM_CERT_VALIDITY_DAYS, 10) || 365,
    keySize: parseInt(process.env.MDM_CERT_KEY_SIZE, 10) || 2048,
    algorithm: 'sha256'
  },

  // Security Policies
  policies: {
    maxLoginAttempts: parseInt(process.env.MDM_MAX_LOGIN_ATTEMPTS, 10) || 5,
    lockoutDuration: parseInt(process.env.MDM_LOCKOUT_DURATION, 10) || 1800000, // 30 minutes
    passwordExpiry: parseInt(process.env.MDM_PASSWORD_EXPIRY_DAYS, 10) || 90,
    sessionTimeout: parseInt(process.env.MDM_SESSION_TIMEOUT, 10) || 3600000, // 1 hour
    requireMfa: process.env.MDM_REQUIRE_MFA === 'true'
  },

  // Audit and Monitoring
  audit: {
    logAllRequests: process.env.MDM_LOG_ALL_REQUESTS === 'true',
    logSensitiveData: false,
    retentionDays: parseInt(process.env.MDM_AUDIT_RETENTION_DAYS, 10) || 2555, // 7 years
    enableTamperDetection: true
  },

  // Device Security Requirements
  device: {
    requirePasscode: process.env.MDM_REQUIRE_DEVICE_PASSCODE === 'true',
    requireEncryption: process.env.MDM_REQUIRE_DEVICE_ENCRYPTION === 'true',
    allowJailbroken: process.env.MDM_ALLOW_JAILBROKEN_DEVICES === 'false',
    requireBiometrics: process.env.MDM_REQUIRE_BIOMETRICS === 'true',
    minimumOsVersion: process.env.MDM_MINIMUM_OS_VERSION || '15.0'
  },

  // Network Security
  network: {
    enableTls: true,
    tlsVersion: '1.3',
    requireClientCertificates: process.env.MDM_REQUIRE_CLIENT_CERTS === 'true',
    allowedCipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256'
    ]
  },

  // Compliance Settings
  compliance: {
    gdprCompliant: true,
    hipaaCompliant: process.env.MDM_HIPAA_COMPLIANT === 'true',
    soxCompliant: process.env.MDM_SOX_COMPLIANT === 'true',
    iso27001Compliant: process.env.MDM_ISO27001_COMPLIANT === 'true',
    dataRetentionDays: parseInt(process.env.MDM_DATA_RETENTION_DAYS, 10) || 2555
  }
}));