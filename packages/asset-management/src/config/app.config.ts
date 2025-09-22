export const appConfig = () => ({
  // Application settings
  app: {
    name: 'Digital Asset Management System',
    version: '1.0.0',
    port: parseInt(process.env.ASSET_MANAGEMENT_PORT || '3003', 10),
    environment: process.env.NODE_ENV || 'development',
  },

  // Authentication & Security
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'asset-management-jwt-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  // File storage configuration (local-only)
  storage: {
    basePath: process.env.STORAGE_PATH || './data/assets',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'application/pdf',
      'application/zip',
      'text/plain',
      'application/json',
    ],
    thumbnailSizes: [
      { width: 150, height: 150 },
      { width: 300, height: 300 },
      { width: 600, height: 600 },
    ],
  },

  // Search & AI configuration
  search: {
    indexPath: process.env.SEARCH_INDEX_PATH || './data/search-index',
    embeddingDimensions: 384,
    maxResults: parseInt(process.env.MAX_SEARCH_RESULTS || '50', 10),
  },

  // Collaboration settings
  collaboration: {
    maxConcurrentUsers: parseInt(process.env.MAX_CONCURRENT_USERS || '10', 10),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000', 10), // 1 hour
    autoSaveInterval: parseInt(process.env.AUTOSAVE_INTERVAL || '30000', 10), // 30 seconds
  },

  // Performance monitoring
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  // Rate limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10), // 1 minute
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requests per minute
  },
});