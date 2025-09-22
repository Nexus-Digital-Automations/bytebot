/**
 * MDM Platform Configuration
 * Central configuration management for the MDM platform
 */

import { registerAs } from '@nestjs/config';

export default registerAs('mdm', () => ({
  // Application settings
  app: {
    name: 'MDM Platform',
    version: '1.0.0',
    port: parseInt(process.env.MDM_PORT, 10) || 3003,
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.MDM_LOG_LEVEL || 'info'
  },

  // Security settings
  security: {
    jwtSecret: process.env.MDM_JWT_SECRET || 'mdm-super-secret-key',
    jwtExpiresIn: process.env.MDM_JWT_EXPIRES_IN || '24h',
    bcryptRounds: parseInt(process.env.MDM_BCRYPT_ROUNDS, 10) || 12,
    corsOrigins: process.env.MDM_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    rateLimitWindow: parseInt(process.env.MDM_RATE_LIMIT_WINDOW, 10) || 900000, // 15 minutes
    rateLimitMax: parseInt(process.env.MDM_RATE_LIMIT_MAX, 10) || 1000
  },

  // Database settings
  database: {
    type: 'sqlite',
    path: process.env.MDM_DATABASE_PATH || './data/mdm.sqlite',
    logging: process.env.MDM_DATABASE_LOGGING === 'true',
    synchronize: process.env.NODE_ENV === 'development',
    migrationsRun: true
  },

  // Cache settings
  cache: {
    ttl: parseInt(process.env.MDM_CACHE_TTL, 10) || 300, // 5 minutes
    max: parseInt(process.env.MDM_CACHE_MAX, 10) || 1000
  },

  // Device management settings
  device: {
    enrollmentTimeout: parseInt(process.env.MDM_ENROLLMENT_TIMEOUT, 10) || 900000, // 15 minutes
    checkInFrequency: parseInt(process.env.MDM_CHECKIN_FREQUENCY, 10) || 3600000, // 1 hour
    maxDevicesPerUser: parseInt(process.env.MDM_MAX_DEVICES_PER_USER, 10) || 10,
    autoRetireInactiveDays: parseInt(process.env.MDM_AUTO_RETIRE_DAYS, 10) || 90
  },

  // Policy settings
  policy: {
    evaluationInterval: parseInt(process.env.MDM_POLICY_EVALUATION_INTERVAL, 10) || 3600000, // 1 hour
    complianceGracePeriod: parseInt(process.env.MDM_COMPLIANCE_GRACE_PERIOD, 10) || 86400000, // 24 hours
    maxPoliciesPerDevice: parseInt(process.env.MDM_MAX_POLICIES_PER_DEVICE, 10) || 50
  },

  // Application management settings
  application: {
    maxAppSize: parseInt(process.env.MDM_MAX_APP_SIZE, 10) || 1073741824, // 1GB
    allowedFileTypes: process.env.MDM_ALLOWED_FILE_TYPES?.split(',') || ['.ipa', '.apk', '.msi', '.dmg'],
    virusScanEnabled: process.env.MDM_VIRUS_SCAN_ENABLED === 'true',
    maxAppsPerDevice: parseInt(process.env.MDM_MAX_APPS_PER_DEVICE, 10) || 100
  },

  // Security settings
  securityModule: {
    threatDetectionEnabled: process.env.MDM_THREAT_DETECTION_ENABLED === 'true',
    remoteWipeConfirmationRequired: process.env.MDM_REMOTE_WIPE_CONFIRMATION === 'true',
    encryptionRequired: process.env.MDM_ENCRYPTION_REQUIRED === 'true',
    securityScanInterval: parseInt(process.env.MDM_SECURITY_SCAN_INTERVAL, 10) || 86400000 // 24 hours
  },

  // Asset management settings
  asset: {
    depreciationEnabled: process.env.MDM_DEPRECIATION_ENABLED === 'true',
    warrantyTrackingEnabled: process.env.MDM_WARRANTY_TRACKING_ENABLED === 'true',
    maintenanceSchedulingEnabled: process.env.MDM_MAINTENANCE_SCHEDULING_ENABLED === 'true',
    assetTagRequired: process.env.MDM_ASSET_TAG_REQUIRED === 'true'
  },

  // Compliance settings
  compliance: {
    auditLogRetentionDays: parseInt(process.env.MDM_AUDIT_LOG_RETENTION_DAYS, 10) || 2555, // 7 years
    complianceReportingEnabled: process.env.MDM_COMPLIANCE_REPORTING_ENABLED === 'true',
    regulatoryFrameworks: process.env.MDM_REGULATORY_FRAMEWORKS?.split(',') || [
      'GDPR',
      'HIPAA',
      'SOX',
      'ISO27001',
      'NIST'
    ],
    automatedComplianceChecks: process.env.MDM_AUTOMATED_COMPLIANCE_CHECKS === 'true'
  },

  // Notification settings
  notification: {
    emailEnabled: process.env.MDM_EMAIL_NOTIFICATIONS_ENABLED === 'true',
    smsEnabled: process.env.MDM_SMS_NOTIFICATIONS_ENABLED === 'true',
    pushEnabled: process.env.MDM_PUSH_NOTIFICATIONS_ENABLED === 'true',
    slackEnabled: process.env.MDM_SLACK_NOTIFICATIONS_ENABLED === 'true',
    retentionDays: parseInt(process.env.MDM_NOTIFICATION_RETENTION_DAYS, 10) || 90
  },

  // Integration settings
  integration: {
    parlantEnabled: process.env.MDM_PARLANT_ENABLED === 'true',
    parlantEndpoint: process.env.MDM_PARLANT_ENDPOINT || 'http://localhost:8000',
    parlantApiKey: process.env.MDM_PARLANT_API_KEY,
    parlantTimeout: parseInt(process.env.MDM_PARLANT_TIMEOUT, 10) || 10000, // 10 seconds
    identityProviders: process.env.MDM_IDENTITY_PROVIDERS?.split(',') || ['active-directory', 'okta', 'azure-ad']
  },

  // Performance settings
  performance: {
    enableMetrics: process.env.MDM_ENABLE_METRICS === 'true',
    metricsRetentionDays: parseInt(process.env.MDM_METRICS_RETENTION_DAYS, 10) || 30,
    performanceThresholds: {
      responseTime: parseInt(process.env.MDM_RESPONSE_TIME_THRESHOLD, 10) || 1000, // 1 second
      cpuUsage: parseInt(process.env.MDM_CPU_USAGE_THRESHOLD, 10) || 80, // 80%
      memoryUsage: parseInt(process.env.MDM_MEMORY_USAGE_THRESHOLD, 10) || 80, // 80%
      diskUsage: parseInt(process.env.MDM_DISK_USAGE_THRESHOLD, 10) || 85 // 85%
    }
  }
}));