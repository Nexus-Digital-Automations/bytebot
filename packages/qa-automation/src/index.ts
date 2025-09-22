/**
 * QA Automation Platform - Public API Exports
 *
 * Main entry point for the QA automation platform package,
 * providing comprehensive exports for all platform capabilities.
 *
 * @fileoverview Public API exports for QA automation platform
 * @author Bytebot Team
 * @version 1.0.0
 */

// Core platform
export { QAPlatformModule } from './core/qa-platform.module';
export { QAPlatformService, QAPlatformRequest, QAPlatformResult } from './services/qa-platform.service';
export { QAPlatformController } from './controllers/qa-platform.controller';

// Test generation
export { TestGenerationModule } from './test-generation/test-generation.module';
export {
  TestGenerationService,
  TestGenerationRequest,
  GeneratedTestSuite,
  TestType,
  TestFramework,
} from './test-generation/test-generation.service';

// Cross-platform testing
export { CrossPlatformModule } from './cross-platform/cross-platform.module';
export {
  CrossPlatformService,
  CrossPlatformTestRequest,
  TestPlatform,
  TestExecutionResult,
  ExecutionStatus,
} from './cross-platform/cross-platform.service';

// Visual regression testing
export { VisualRegressionModule } from './visual-regression/visual-regression.module';
export {
  VisualRegressionService,
  VisualTestRequest,
  VisualTestResult,
  ComparisonAlgorithm,
} from './visual-regression/visual-regression.service';

// Performance testing
export { PerformanceTestingModule } from './performance/performance-testing.module';
export {
  PerformanceTestingService,
  PerformanceTestRequest,
  PerformanceTestResult,
  LoadPattern,
  TargetType,
} from './performance/performance-testing.service';

// Database entities
export { TestCase } from './entities/test-case.entity';
export { TestExecution } from './entities/test-execution.entity';
export { QualityMetrics } from './entities/quality-metrics.entity';

// Type definitions
export interface QAConfiguration {
  database: {
    type: 'sqlite' | 'postgres';
    path?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    enableAuth: boolean;
  };
  testing: {
    defaultTimeout: number;
    maxRetries: number;
    parallelExecution: boolean;
    maxConcurrency: number;
  };
  monitoring: {
    metricsInterval: number;
    enablePerformanceTracking: boolean;
    enableAuditLogging: boolean;
  };
  artifacts: {
    screenshotsPath: string;
    reportsPath: string;
    logsPath: string;
    retentionDays: number;
  };
}

export interface QACapabilities {
  testGeneration: boolean;
  crossPlatformTesting: boolean;
  visualRegressionTesting: boolean;
  performanceTesting: boolean;
  accessibilityTesting: boolean;
  securityTesting: boolean;
  qualityMetrics: boolean;
  continuousMonitoring: boolean;
}

// Platform constants
export const QA_PLATFORM_VERSION = '1.0.0';
export const QA_PLATFORM_NAME = 'Bytebot QA Automation Platform';

export const DEFAULT_QA_CONFIGURATION: QAConfiguration = {
  database: {
    type: 'sqlite',
    path: './data/qa-platform.db',
  },
  security: {
    jwtSecret: 'qa-platform-secret-key',
    jwtExpiresIn: '24h',
    enableAuth: true,
  },
  testing: {
    defaultTimeout: 300000, // 5 minutes
    maxRetries: 3,
    parallelExecution: true,
    maxConcurrency: 4,
  },
  monitoring: {
    metricsInterval: 60000, // 1 minute
    enablePerformanceTracking: true,
    enableAuditLogging: true,
  },
  artifacts: {
    screenshotsPath: './data/screenshots',
    reportsPath: './data/reports',
    logsPath: './data/logs',
    retentionDays: 30,
  },
};

export const DEFAULT_QA_CAPABILITIES: QACapabilities = {
  testGeneration: true,
  crossPlatformTesting: true,
  visualRegressionTesting: true,
  performanceTesting: true,
  accessibilityTesting: true,
  securityTesting: true,
  qualityMetrics: true,
  continuousMonitoring: true,
};

// Utility functions
export function createQAConfiguration(overrides: Partial<QAConfiguration> = {}): QAConfiguration {
  return {
    ...DEFAULT_QA_CONFIGURATION,
    ...overrides,
    database: {
      ...DEFAULT_QA_CONFIGURATION.database,
      ...overrides.database,
    },
    security: {
      ...DEFAULT_QA_CONFIGURATION.security,
      ...overrides.security,
    },
    testing: {
      ...DEFAULT_QA_CONFIGURATION.testing,
      ...overrides.testing,
    },
    monitoring: {
      ...DEFAULT_QA_CONFIGURATION.monitoring,
      ...overrides.monitoring,
    },
    artifacts: {
      ...DEFAULT_QA_CONFIGURATION.artifacts,
      ...overrides.artifacts,
    },
  };
}

export function validateQAConfiguration(config: QAConfiguration): string[] {
  const errors: string[] = [];

  // Database validation
  if (config.database.type === 'postgres') {
    if (!config.database.host) errors.push('PostgreSQL host is required');
    if (!config.database.username) errors.push('PostgreSQL username is required');
    if (!config.database.database) errors.push('PostgreSQL database name is required');
  }

  // Security validation
  if (config.security.enableAuth && !config.security.jwtSecret) {
    errors.push('JWT secret is required when authentication is enabled');
  }

  // Testing validation
  if (config.testing.defaultTimeout < 1000) {
    errors.push('Default timeout must be at least 1000ms');
  }

  if (config.testing.maxConcurrency < 1) {
    errors.push('Max concurrency must be at least 1');
  }

  // Monitoring validation
  if (config.monitoring.metricsInterval < 10000) {
    errors.push('Metrics interval must be at least 10 seconds');
  }

  return errors;
}

// Platform information
export const QA_PLATFORM_INFO = {
  name: QA_PLATFORM_NAME,
  version: QA_PLATFORM_VERSION,
  description: 'Enterprise-grade QA automation platform with comprehensive testing capabilities',
  author: 'Bytebot Team',
  license: 'MIT',
  repository: 'https://github.com/bytebot/qa-automation-platform',
  documentation: 'https://docs.bytebot.ai/qa-automation',
  support: 'https://support.bytebot.ai/qa-automation',
  features: [
    'Intelligent Test Generation from User Stories',
    'Cross-Platform Test Execution (Web, Mobile, Desktop, API)',
    'Visual Regression Testing with Pixel-Perfect Comparison',
    'Performance Testing with Load Simulation',
    'Accessibility Testing with WCAG Compliance',
    'Security Testing and Vulnerability Assessment',
    'Real-Time Quality Metrics and Analytics',
    'Continuous Quality Monitoring and Alerting',
    'Comprehensive Reporting and Dashboards',
    '100% Local-Only Architecture',
    'Enterprise Security and Compliance',
    'REST API with OpenAPI Documentation',
  ],
  capabilities: DEFAULT_QA_CAPABILITIES,
  architecture: {
    deployment: 'local-only',
    database: ['SQLite', 'PostgreSQL'],
    platforms: ['Web', 'Mobile', 'Desktop', 'API'],
    frameworks: ['Jest', 'Mocha', 'Cypress', 'Playwright', 'Selenium', 'Puppeteer'],
    languages: ['TypeScript', 'JavaScript', 'Python'],
    protocols: ['HTTP/HTTPS', 'WebSocket', 'REST', 'GraphQL'],
  },
  requirements: {
    node: '>=18.0.0',
    memory: '4GB RAM minimum, 8GB recommended',
    storage: '10GB minimum for artifacts and data',
    os: ['Windows', 'macOS', 'Linux'],
  },
};