# Integration Testing Framework

Enterprise-grade integration testing framework with automated test generation, cross-service validation, and continuous testing capabilities.

## Features

- **Automated Test Generation**: Generate tests from API specifications (OpenAPI, Swagger)
- **Cross-Service Testing**: Validate communication between microservices
- **Database Integration**: Test database transactions and data consistency
- **Performance Testing**: Load simulation and benchmarking
- **Security Testing**: Authentication, authorization, and vulnerability assessment
- **Contract Testing**: Ensure API contracts between services
- **Continuous Testing**: Automated test execution and monitoring
- **Comprehensive Reporting**: Detailed test results and analytics

## Installation

```bash
# Install in bytebot workspace
pnpm install @bytebot/integration-testing
```

## Quick Start

```typescript
import { IntegrationTestingFramework, TestConfiguration } from '@bytebot/integration-testing';

// Initialize the framework
const framework = new IntegrationTestingFramework();

const config: TestConfiguration = {
  environment: {
    name: 'development',
    baseUrl: 'http://localhost:3000',
    databaseUrl: 'postgresql://localhost:5432/test',
    services: {
      'user-service': { url: 'http://localhost:3001', port: 3001, protocol: 'http' }
    },
    variables: {}
  },
  database: {
    type: 'postgresql',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'test'
    },
    schema: {
      autoMigrate: true,
      seedData: true,
      cleanup: true
    }
  },
  services: [
    {
      name: 'user-service',
      type: 'api',
      endpoint: { url: 'localhost', port: 3001, protocol: 'http' },
      healthCheck: { endpoint: '/health', expectedStatus: 200, timeout: 5000, retries: 3, retryInterval: 1000 },
      authentication: { type: 'jwt', credentials: {} },
      contracts: []
    }
  ],
  security: {
    jwtSecret: 'test-secret',
    testUsers: [
      {
        id: 'test-user-1',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password',
        roles: ['user'],
        permissions: ['read', 'write']
      }
    ],
    testing: {
      penetrationTesting: true,
      vulnerabilityScanning: true,
      authenticationTesting: true,
      authorizationTesting: true
    }
  },
  performance: {
    loadTesting: {
      concurrentUsers: 100,
      duration: 300,
      rampUpTime: 60,
      requestRate: 10
    },
    thresholds: {
      maxResponseTime: 2000,
      minThroughput: 100,
      maxErrorRate: 5,
      maxMemoryUsage: 1024,
      maxCpuUsage: 80
    },
    benchmarks: {
      baseline: {
        responseTime: { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 },
        throughput: { requestsPerSecond: 0, bytesPerSecond: 0 },
        errors: { total: 0, rate: 0, types: {} },
        resources: { cpu: 0, memory: 0, network: 0 }
      },
      regressionTolerance: 10
    }
  },
  testData: {
    generation: {
      strategy: 'dynamic',
      seed: 12345,
      recordCount: 100
    },
    fixtures: {
      directory: './fixtures',
      format: 'json',
      autoLoad: true
    },
    cleanup: {
      enabled: true,
      strategy: 'truncate',
      preserve: ['system_config']
    }
  }
};

await framework.initialize(config);

// Create a test suite
const testSuite = {
  name: 'User API Tests',
  description: 'Integration tests for user service',
  configuration: config,
  testCases: [
    {
      id: 'test-user-creation',
      name: 'Create User Test',
      description: 'Test user creation endpoint',
      type: 'integration' as const,
      priority: 'high' as const,
      tags: ['user', 'creation'],
      steps: [
        {
          id: 'step-1',
          name: 'Create User',
          description: 'POST /users',
          action: {
            type: 'http_request' as const,
            target: '/users',
            method: 'POST' as const,
            headers: { 'Content-Type': 'application/json' },
            payload: { name: 'Test User', email: 'test@example.com' }
          },
          data: {},
          expectedResult: {
            statusCode: 201,
            responseBody: { id: 'user-id', name: 'Test User' },
            assertions: []
          },
          dependencies: []
        }
      ],
      expectedResult: {
        statusCode: 201,
        responseBody: {},
        assertions: []
      },
      timeout: 30000,
      retry: {
        enabled: true,
        maxAttempts: 3,
        backoffMultiplier: 2
      }
    }
  ],
  setup: [],
  teardown: [],
  metadata: {
    author: 'Test Engineer',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0',
    tags: ['integration'],
    requirements: []
  }
};

// Execute tests
const results = await framework.executeTestSuite(testSuite);

console.log('Test Results:', results);

// Generate report
const reportPath = await framework.generateReport(results, {
  format: 'html',
  outputDir: './reports',
  title: 'Integration Test Report',
  includePerformance: true,
  includeSecurity: true,
  includeArtifacts: true,
  customization: {}
});

console.log('Report generated:', reportPath);

// Cleanup
await framework.cleanup();
```

## Architecture

The framework consists of several core components:

### Core Components

- **TestFramework**: Main orchestration and management
- **TestRunner**: Individual test case execution
- **TestExecutor**: Step-by-step action execution
- **TestContext**: Environment and configuration management
- **TestLifecycle**: Setup, execution, and teardown phases
- **TestScheduler**: Parallel execution and prioritization
- **TestOrchestrator**: High-level coordination and reporting

### Test Types

- **Unit Tests**: Individual component testing
- **Integration Tests**: Service-to-service communication
- **End-to-End Tests**: Complete user workflows
- **API Tests**: REST/GraphQL endpoint validation
- **Database Tests**: Data persistence and transactions
- **Security Tests**: Authentication and authorization
- **Performance Tests**: Load and stress testing
- **Contract Tests**: API contract validation

### Execution Modes

- **Sequential**: One test at a time
- **Parallel**: Multiple tests concurrently
- **Continuous**: Automated recurring execution
- **On-Demand**: Manual trigger execution

## Configuration

### Test Configuration

```typescript
interface TestConfiguration {
  environment: TestEnvironment;
  database: DatabaseConfig;
  services: ServiceConfig[];
  security: SecurityConfig;
  performance: PerformanceConfig;
  testData: TestDataConfig;
}
```

### Test Suite Structure

```typescript
interface TestSuite {
  name: string;
  description: string;
  configuration: TestConfiguration;
  testCases: TestCase[];
  setup: TestHook[];
  teardown: TestHook[];
  metadata: TestSuiteMetadata;
}
```

### Test Case Definition

```typescript
interface TestCase {
  id: string;
  name: string;
  description: string;
  type: TestCaseType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  steps: TestStep[];
  expectedResult: TestResult;
  timeout: number;
  retry: RetryConfig;
}
```

## API Reference

### IntegrationTestingFramework

Main framework class for test orchestration.

#### Methods

- `initialize(config: TestConfiguration): Promise<void>`
- `executeTestSuite(testSuite: TestSuite): Promise<TestResult[]>`
- `executeTestSuites(testSuites: TestSuite[]): Promise<Map<string, TestResult[]>>`
- `validateTestSuite(testSuite: TestSuite): Promise<ValidationResult>`
- `generateReport(results: TestResult[], config: TestReportConfig): Promise<string>`
- `getFrameworkHealth(): Promise<FrameworkHealth>`
- `cleanup(): Promise<void>`

### TestRunner

Handles individual test case execution.

#### Methods

- `executeTestCase(testCase: TestCase): Promise<TestResult>`
- `executeTestCases(testCases: TestCase[], parallel?: boolean): Promise<TestResult[]>`
- `getExecutionStatus(executionId: string): TestExecution | null`
- `stopTestExecution(executionId: string): Promise<void>`

### TestContext

Manages test execution context and environment.

#### Methods

- `getConfiguration(): TestConfiguration`
- `getBaseUrl(): string`
- `setAuthToken(token: string): Promise<void>`
- `getAuthToken(): Promise<string | null>`
- `executeDatabaseQuery(query: string): Promise<any>`
- `checkServiceHealth(serviceName: string): Promise<boolean>`

## Examples

### Basic API Test

```typescript
const apiTest: TestCase = {
  id: 'api-health-check',
  name: 'API Health Check',
  description: 'Verify API is responding',
  type: 'smoke',
  priority: 'critical',
  tags: ['health', 'api'],
  steps: [
    {
      id: 'health-request',
      name: 'GET /health',
      description: 'Call health endpoint',
      action: {
        type: 'http_request',
        target: '/health',
        method: 'GET'
      },
      data: {},
      expectedResult: {
        statusCode: 200,
        responseBody: { status: 'healthy' }
      },
      dependencies: []
    }
  ],
  expectedResult: { statusCode: 200 },
  timeout: 10000,
  retry: { enabled: false, maxAttempts: 1, backoffMultiplier: 1 }
};
```

### Database Integration Test

```typescript
const dbTest: TestCase = {
  id: 'user-persistence',
  name: 'User Data Persistence',
  description: 'Test user data is persisted correctly',
  type: 'integration',
  priority: 'high',
  tags: ['database', 'user'],
  steps: [
    {
      id: 'create-user-db',
      name: 'Insert User Record',
      description: 'Insert user into database',
      action: {
        type: 'database_query',
        target: 'users',
        query: "INSERT INTO users (name, email) VALUES ('Test User', 'test@example.com') RETURNING id"
      },
      data: {},
      expectedResult: {
        databaseState: { rowsAffected: 1 }
      },
      dependencies: []
    },
    {
      id: 'verify-user-db',
      name: 'Verify User Record',
      description: 'Query user from database',
      action: {
        type: 'database_query',
        target: 'users',
        query: "SELECT * FROM users WHERE email = 'test@example.com'"
      },
      data: {},
      expectedResult: {
        responseBody: { name: 'Test User', email: 'test@example.com' }
      },
      dependencies: ['create-user-db']
    }
  ],
  expectedResult: { statusCode: 200 },
  timeout: 15000,
  retry: { enabled: true, maxAttempts: 2, backoffMultiplier: 1.5 }
};
```

### Authentication Test

```typescript
const authTest: TestCase = {
  id: 'jwt-authentication',
  name: 'JWT Authentication',
  description: 'Test JWT token authentication flow',
  type: 'security',
  priority: 'high',
  tags: ['auth', 'jwt', 'security'],
  steps: [
    {
      id: 'login-request',
      name: 'User Login',
      description: 'Authenticate user and get token',
      action: {
        type: 'authentication',
        target: '/auth/login',
        method: 'POST',
        payload: {
          username: 'testuser',
          password: 'password'
        }
      },
      data: {},
      expectedResult: {
        statusCode: 200,
        responseBody: { token: 'jwt-token' }
      },
      dependencies: []
    },
    {
      id: 'protected-request',
      name: 'Access Protected Endpoint',
      description: 'Call protected endpoint with token',
      action: {
        type: 'http_request',
        target: '/protected',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer {{token}}'
        }
      },
      data: {},
      expectedResult: {
        statusCode: 200
      },
      dependencies: ['login-request']
    }
  ],
  expectedResult: { statusCode: 200 },
  timeout: 20000,
  retry: { enabled: true, maxAttempts: 3, backoffMultiplier: 2 }
};
```

## Testing

```bash
# Run unit tests
pnpm test

# Run integration tests
pnpm test:integration

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch
```

## Building

```bash
# Build the package
pnpm build

# Build in watch mode
pnpm dev
```

## Contributing

1. Follow TypeScript strict mode requirements
2. Maintain 90%+ test coverage
3. Use ESLint and Prettier for code formatting
4. Write comprehensive documentation
5. Follow enterprise-grade security practices

## License

UNLICENSED - Internal Bytebot use only