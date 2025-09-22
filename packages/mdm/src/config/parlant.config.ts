/**
 * PARLANT Integration Configuration
 * Configuration for conversational AI validation system
 */

import { registerAs } from '@nestjs/config';

export default registerAs('parlant', () => ({
  // PARLANT Service Configuration
  service: {
    enabled: process.env.MDM_PARLANT_ENABLED === 'true',
    endpoint: process.env.MDM_PARLANT_ENDPOINT || 'http://localhost:8000',
    apiKey: process.env.MDM_PARLANT_API_KEY,
    timeout: parseInt(process.env.MDM_PARLANT_TIMEOUT, 10) || 10000, // 10 seconds
    retryAttempts: parseInt(process.env.MDM_PARLANT_RETRY_ATTEMPTS, 10) || 3,
    retryDelay: parseInt(process.env.MDM_PARLANT_RETRY_DELAY, 10) || 1000
  },

  // Validation Configuration
  validation: {
    strictMode: process.env.MDM_PARLANT_STRICT_MODE === 'true',
    defaultApproval: process.env.MDM_PARLANT_DEFAULT_APPROVAL === 'true', // Fallback if service unavailable
    confidenceThreshold: parseFloat(process.env.MDM_PARLANT_CONFIDENCE_THRESHOLD) || 0.7,
    highRiskThreshold: parseFloat(process.env.MDM_PARLANT_HIGH_RISK_THRESHOLD) || 0.8,
    blockingOperations: process.env.MDM_PARLANT_BLOCKING_OPERATIONS?.split(',') || [
      'device_wipe',
      'remote_wipe_request',
      'policy_deletion',
      'security_policy_modification',
      'admin_privilege_escalation'
    ]
  },

  // Cache Configuration
  cache: {
    enabled: process.env.MDM_PARLANT_CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.MDM_PARLANT_CACHE_TTL, 10) || 300, // 5 minutes
    maxSize: parseInt(process.env.MDM_PARLANT_CACHE_MAX_SIZE, 10) || 1000,
    keyPrefix: 'parlant:validation:'
  },

  // Risk Assessment Configuration
  riskAssessment: {
    enableBehavioralAnalysis: process.env.MDM_PARLANT_BEHAVIORAL_ANALYSIS === 'true',
    enableContextAnalysis: process.env.MDM_PARLANT_CONTEXT_ANALYSIS === 'true',
    enablePatternDetection: process.env.MDM_PARLANT_PATTERN_DETECTION === 'true',
    riskFactors: {
      timeOfDay: {
        enabled: true,
        highRiskHours: [0, 1, 2, 3, 4, 5, 22, 23], // Night hours
        weight: 0.1
      },
      location: {
        enabled: process.env.MDM_PARLANT_LOCATION_RISK === 'true',
        allowedCountries: process.env.MDM_PARLANT_ALLOWED_COUNTRIES?.split(',') || [],
        weight: 0.2
      },
      deviceContext: {
        enabled: true,
        jailbrokenWeight: 0.3,
        unknownDeviceWeight: 0.2,
        multipleFailuresWeight: 0.15
      }
    }
  },

  // Conversation Context
  context: {
    enableConversationHistory: process.env.MDM_PARLANT_CONVERSATION_HISTORY === 'true',
    historyRetentionDays: parseInt(process.env.MDM_PARLANT_HISTORY_RETENTION, 10) || 30,
    maxContextLength: parseInt(process.env.MDM_PARLANT_MAX_CONTEXT_LENGTH, 10) || 10000,
    includeUserProfile: process.env.MDM_PARLANT_INCLUDE_USER_PROFILE === 'true',
    includeDeviceHistory: process.env.MDM_PARLANT_INCLUDE_DEVICE_HISTORY === 'true'
  },

  // Response Configuration
  response: {
    includeReasoning: process.env.MDM_PARLANT_INCLUDE_REASONING === 'true',
    includeRecommendations: process.env.MDM_PARLANT_INCLUDE_RECOMMENDATIONS === 'true',
    includeRiskAnalysis: process.env.MDM_PARLANT_INCLUDE_RISK_ANALYSIS === 'true',
    includeAlternatives: process.env.MDM_PARLANT_INCLUDE_ALTERNATIVES === 'true',
    maxRecommendations: parseInt(process.env.MDM_PARLANT_MAX_RECOMMENDATIONS, 10) || 5,
    maxAlternatives: parseInt(process.env.MDM_PARLANT_MAX_ALTERNATIVES, 10) || 3
  },

  // Learning and Adaptation
  learning: {
    enableFeedbackLearning: process.env.MDM_PARLANT_FEEDBACK_LEARNING === 'true',
    enablePatternLearning: process.env.MDM_PARLANT_PATTERN_LEARNING === 'true',
    feedbackWeight: parseFloat(process.env.MDM_PARLANT_FEEDBACK_WEIGHT) || 0.1,
    adaptationRate: parseFloat(process.env.MDM_PARLANT_ADAPTATION_RATE) || 0.05
  },

  // Monitoring and Metrics
  monitoring: {
    enableMetrics: process.env.MDM_PARLANT_ENABLE_METRICS === 'true',
    metricsRetentionDays: parseInt(process.env.MDM_PARLANT_METRICS_RETENTION, 10) || 90,
    trackResponseTimes: true,
    trackAccuracy: true,
    trackUserSatisfaction: process.env.MDM_PARLANT_TRACK_SATISFACTION === 'true'
  },

  // Integration Points
  integration: {
    webhookEndpoint: process.env.MDM_PARLANT_WEBHOOK_ENDPOINT,
    webhookSecret: process.env.MDM_PARLANT_WEBHOOK_SECRET,
    enableRealTimeUpdates: process.env.MDM_PARLANT_REAL_TIME_UPDATES === 'true',
    enableBidirectionalSync: process.env.MDM_PARLANT_BIDIRECTIONAL_SYNC === 'true'
  },

  // Security Settings
  security: {
    encryptCommunication: true,
    validateCertificates: process.env.NODE_ENV === 'production',
    apiKeyRotationDays: parseInt(process.env.MDM_PARLANT_KEY_ROTATION_DAYS, 10) || 90,
    enableAuditLogging: true,
    logSensitiveData: false
  },

  // Fallback Configuration
  fallback: {
    enableGracefulDegradation: true,
    fallbackToCache: true,
    fallbackToDefaults: true,
    emergencyBypass: process.env.MDM_PARLANT_EMERGENCY_BYPASS === 'true',
    bypassCode: process.env.MDM_PARLANT_BYPASS_CODE
  },

  // Performance Optimization
  performance: {
    enableBatching: process.env.MDM_PARLANT_ENABLE_BATCHING === 'true',
    batchSize: parseInt(process.env.MDM_PARLANT_BATCH_SIZE, 10) || 10,
    batchTimeout: parseInt(process.env.MDM_PARLANT_BATCH_TIMEOUT, 10) || 1000,
    enableCompression: true,
    connectionPooling: true,
    maxConnections: parseInt(process.env.MDM_PARLANT_MAX_CONNECTIONS, 10) || 10
  }
}));