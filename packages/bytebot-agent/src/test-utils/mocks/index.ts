/**
 * Test Mocks Index - Bytebot-Agent Package
 *
 * Centralized export for all mock services and utilities:
 * - NestJS module mocks
 * - Authentication and JWT mocks
 * - Agent processing mocks
 * - Database and Prisma mocks
 * - External API mocks (Anthropic, OpenAI, Google)
 * - WebSocket and real-time mocks
 *
 * @author Claude Code
 * @version 2.0.0
 */

// Export all mock services
export * from './nestjs.mock';
export * from './auth.mock';
export * from './agent.mock';
export * from './database.mock';
export * from './external-apis.mock';
export * from './websocket.mock';
export * from './config.mock';

// Mock service registry for easy access (using static imports instead of dynamic)
import * as NestJSMock from './nestjs.mock';
import * as AuthMock from './auth.mock';
import * as AgentMock from './agent.mock';
import * as DatabaseMock from './database.mock';
import * as ExternalAPIsMock from './external-apis.mock';
import * as WebSocketMock from './websocket.mock';
import * as ConfigMock from './config.mock';

export const MockRegistry = {
  NestJS: NestJSMock,
  Auth: AuthMock,
  Agent: AgentMock,
  Database: DatabaseMock,
  ExternalAPIs: ExternalAPIsMock,
  WebSocket: WebSocketMock,
  Config: ConfigMock,
};

// Mock configuration for consistent behavior across tests
export const MockConfig = {
  auth: {
    jwt: {
      secret: 'test-jwt-secret-for-testing-only',
      expiresIn: '1h',
      algorithm: 'HS256',
    },
    users: {
      enableTestUsers: true,
      defaultRole: 'user',
    },
  },
  agent: {
    processing: {
      defaultTimeout: 5000,
      maxRetries: 3,
      simulateLatency: false,
    },
    models: {
      defaultProvider: 'anthropic',
      enableMockResponses: true,
    },
  },
  database: {
    provider: 'sqlite',
    url: ':memory:',
    enableMigrations: false,
    resetBetweenTests: true,
  },
  externalAPIs: {
    anthropic: {
      apiKey: 'test-anthropic-key',
      baseURL: 'https://api.anthropic.com/v1',
      enableMock: true,
      enableLatencySimulation: false,
      enableErrorSimulation: false,
    },
    openai: {
      apiKey: 'test-openai-key',
      baseURL: 'https://api.openai.com/v1',
      enableMock: true,
      enableLatencySimulation: false,
      enableErrorSimulation: false,
    },
    google: {
      apiKey: 'test-google-key',
      baseURL: 'https://generativelanguage.googleapis.com/v1',
      enableMock: true,
      enableLatencySimulation: false,
      enableErrorSimulation: false,
    },
  },
  websocket: {
    enableRealTime: false,
    mockConnections: true,
    simulateLatency: false,
  },
};

// Utility function to reset all mocks
export const resetAllMocks = (): void => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.restoreAllMocks();
};

// Utility function to configure mock behavior
export const configureMocks = (config: Partial<typeof MockConfig>): void => {
  Object.assign(MockConfig, config);
};

// Helper to enable/disable specific mock features
export const toggleMockFeatures = (features: {
  auth?: boolean;
  database?: boolean;
  externalAPIs?: boolean;
  websocket?: boolean;
}) => {
  if (features.auth !== undefined) {
    MockConfig.auth.users.enableTestUsers = features.auth;
  }
  if (features.database !== undefined) {
    MockConfig.database.resetBetweenTests = features.database;
  }
  if (features.externalAPIs !== undefined) {
    MockConfig.externalAPIs.anthropic.enableMock = features.externalAPIs;
    MockConfig.externalAPIs.openai.enableMock = features.externalAPIs;
    MockConfig.externalAPIs.google.enableMock = features.externalAPIs;
  }
  if (features.websocket !== undefined) {
    MockConfig.websocket.mockConnections = features.websocket;
  }
};
