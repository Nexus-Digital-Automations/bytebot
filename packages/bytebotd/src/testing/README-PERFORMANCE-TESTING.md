# Performance Testing Framework - Comprehensive Guide

## Overview

This comprehensive performance testing framework provides enterprise-grade performance validation, load testing, bottleneck analysis, and test execution optimization for the BytebotD package. It's designed to ensure optimal performance across all modules and testing scenarios.

## 🚀 Quick Start

### Basic Performance Testing

```typescript
import { performanceFramework } from './performance-framework';

// Start measuring a function
performanceFramework.startMeasurement('myFunction', 'myTestSuite');

// Your code here
await myFunction();

// End measurement
const metrics = performanceFramework.endMeasurement('myFunction', 'myTestSuite', true);
console.log(`Execution time: ${metrics.executionTime}ms`);
```

### Load Testing

```typescript
import { loadTestOrchestrator } from './load-testing-scenarios';
import { AppModule } from '../app.module';

// Initialize with your module
await loadTestOrchestrator.initialize(AppModule);

// Run a specific scenario
const result = await loadTestOrchestrator.executeLoadTestScenario('Health Monitoring Load Test');

// Generate comprehensive report
const report = loadTestOrchestrator.generateLoadTestReport(new Map([['test', result]]));
```

### Test Execution Optimization

```typescript
import { createTestExecutionOptimizer } from './test-execution-optimizer';

const optimizer = createTestExecutionOptimizer({
  enableCaching: true,
  enableParallelization: true,
  maxWorkers: 4
});

const testFiles = ['test1.spec.ts', 'test2.spec.ts'];
const plan = await optimizer.optimizeTestExecution(testFiles);
const metrics = await optimizer.executeOptimizedPlan(plan);
```

## 📊 Framework Components

### 1. Performance Framework (`performance-framework.ts`)

Core performance measurement and benchmarking system.

**Features:**
- Real-time performance measurement
- Automated benchmarking with statistical analysis
- Memory usage tracking
- Performance regression detection
- Comprehensive reporting

**Key Methods:**
- `startMeasurement(testName, testSuite)` - Begin performance tracking
- `endMeasurement(testName, testSuite, passed)` - Complete measurement
- `runBenchmark(testFunction, config)` - Execute performance benchmark
- `getPerformanceReport()` - Generate comprehensive performance report

**Usage Example:**
```typescript
const config = {
  name: 'API Response Time Benchmark',
  description: 'Tests API endpoint performance',
  maxExecutionTime: 500,
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  warmupIterations: 5,
  measurementIterations: 10,
  concurrencyLevel: 1,
  memoryLeakThreshold: 10
};

const benchmark = await performanceFramework.runBenchmark(testFunction, config);
```

### 2. Load Testing Scenarios (`load-testing-scenarios.ts`)

Comprehensive load testing system for all application modules.

**Pre-configured Scenarios:**
- Authentication Module Load Test
- Computer-Use Service Stress Test
- Input Tracking Realtime Load Test
- MCP Service Concurrent Test
- Health Monitoring Load Test
- Cache Performance Validation
- WebSocket Gateway Load Test
- Metrics Collection Load Test
- File Operations Stress Test
- Comprehensive System Load Test

**Usage Example:**
```typescript
// Execute all scenarios
const results = await loadTestOrchestrator.executeAllScenarios();

// Generate detailed report
const report = loadTestOrchestrator.generateLoadTestReport(results);
console.log(`Overall grade: ${report.summary.overallGrade}`);
```

### 3. Test Execution Validator (`test-execution-validator.ts`)

Validates test execution performance and reliability.

**Features:**
- Test execution time monitoring
- Memory usage analysis during tests
- Concurrent vs sequential execution comparison
- Test reliability scoring
- Performance bottleneck identification

**Usage Example:**
```typescript
const config = {
  testPattern: '**/*.spec.ts',
  maxWorkers: 4,
  timeout: 30000,
  coverage: true
};

const result = await testExecutionValidator.validateTestExecution(config);
console.log(`Performance grade: ${result.performanceGrade}`);
```

### 4. Performance Bottleneck Analyzer (`performance-bottleneck-analyzer.ts`)

Advanced bottleneck detection and analysis system.

**Features:**
- Real-time bottleneck detection
- CPU, memory, and I/O analysis
- Bottleneck categorization and prioritization
- Automated optimization recommendations
- Performance profiling sessions

**Usage Example:**
```typescript
// Start profiling session
const sessionId = performanceBottleneckAnalyzer.startProfiling();

// Your performance-critical code
await performanceCriticalFunction();

// Stop profiling and get analysis
const session = performanceBottleneckAnalyzer.stopProfiling();
const report = performanceBottleneckAnalyzer.generateBottleneckReport();
```

### 5. Test Execution Optimizer (`test-execution-optimizer.ts`)

Intelligent test execution optimization with caching and parallelization.

**Features:**
- Intelligent test scheduling
- Result caching with dependency tracking
- Parallel execution optimization
- Resource usage optimization
- Memory management

**Configuration Options:**
```typescript
const config = {
  enableCaching: true,
  enableParallelization: true,
  maxWorkers: 8,
  memoryThreshold: 512, // MB
  cacheDirectory: './cache',
  incrementalTesting: true,
  dependencyAnalysis: true,
  intelligentScheduling: true
};
```

### 6. CI Performance Validation (`ci-performance-validation.ts`)

Complete CI/CD pipeline integration for automated performance validation.

**Features:**
- Automated performance gates
- Regression detection
- Performance trend analysis
- Integration with GitHub, Slack, and monitoring tools
- Comprehensive reporting

**Usage in CI:**
```typescript
const ciValidator = createCIPerformanceValidator({
  enabled: true,
  runOnPullRequest: true,
  performanceThresholds: {
    testExecutionTime: { max: 30000, regressionThreshold: 20 },
    loadTestTargets: {
      responseTime: { p95: 500, p99: 1000 },
      throughput: { min: 100 },
      errorRate: { max: 5 }
    }
  }
});

const result = await ciValidator.runPerformanceValidation({
  buildId: 'build-123',
  branch: 'main',
  commitHash: 'abc123',
  triggerType: 'pull_request'
});
```

## 🎯 Performance Targets

### Test Execution Performance
- **Maximum test execution time**: 30 seconds for full suite
- **Memory usage**: < 512MB peak usage
- **Cache hit rate**: > 70%
- **Parallelization efficiency**: > 50%

### Load Testing Targets
- **Response time P95**: < 500ms
- **Response time P99**: < 1000ms
- **Throughput**: > 100 RPS
- **Error rate**: < 5%
- **Concurrent users**: Support 100+ concurrent users

### System Performance
- **Memory leak detection**: < 10MB increase over sustained load
- **CPU utilization**: < 80% during peak load
- **Resource cleanup**: 100% cleanup after test completion

## 📈 Performance Grades

The framework assigns performance grades based on multiple factors:

- **A**: Excellent performance (90-100%)
- **B**: Very good performance (80-89%)
- **C**: Good performance (70-79%)
- **D**: Fair performance (60-69%)
- **F**: Poor performance (< 60%)

## 🔧 Configuration

### Jest Integration

Add to your `jest.config.js`:

```javascript
module.exports = {
  // ... your existing config
  setupFilesAfterEnv: ['<rootDir>/src/testing/performance-setup.ts'],
  testTimeout: 60000, // Increased timeout for performance tests
  maxWorkers: '50%', // Optimize for performance testing
  
  // Performance test specific configuration
  projects: [
    {
      displayName: 'performance',
      testMatch: ['**/*.perf.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/testing/performance-setup.ts'],
      testTimeout: 120000
    }
  ]
};
```

### Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:perf": "jest --config jest.config.js --testPathPattern=perf.spec.ts",
    "test:load": "jest --config jest.config.js --testPathPattern=load-testing",
    "test:benchmark": "jest --config jest.config.js --testPathPattern=benchmark",
    "test:perf:ci": "node scripts/ci-performance-validation.js",
    "test:perf:report": "jest --config jest.config.js --testPathPattern=perf --coverage --coverageReporters=html"
  }
}
```

## 📋 Best Practices

### 1. Performance Test Organization

```typescript
// performance-tests/
//   ├── benchmarks/
//   │   ├── api-performance.perf.spec.ts
//   │   ├── database-performance.perf.spec.ts
//   │   └── compute-performance.perf.spec.ts
//   ├── load-tests/
//   │   ├── auth-load.spec.ts
//   │   ├── api-load.spec.ts
//   │   └── websocket-load.spec.ts
//   └── integration/
//       ├── end-to-end-performance.spec.ts
//       └── system-performance.spec.ts
```

### 2. Test Naming Conventions

```typescript
describe('Performance: API Endpoints', () => {
  it('should handle 1000 concurrent requests under 500ms P95', async () => {
    // Test implementation
  });
  
  it('should maintain memory usage under 100MB during sustained load', async () => {
    // Test implementation
  });
});
```

### 3. Performance Test Isolation

```typescript
beforeEach(() => {
  // Clear performance metrics
  performanceFramework.clearMetrics();
  
  // Reset system state
  if (global.gc) global.gc();
});

afterEach(async () => {
  // Cleanup resources
  await cleanupTestResources();
});
```

### 4. Assertions and Thresholds

```typescript
it('should meet performance requirements', async () => {
  const benchmark = await performanceFramework.runBenchmark(testFunction, config);
  
  // Assert performance requirements
  expect(benchmark.averageExecutionTime).toBeLessThan(100); // 100ms
  expect(benchmark.memoryLeakDetected).toBe(false);
  expect(benchmark.performanceGrade).toMatch(/[A-C]/); // A, B, or C grade
  expect(benchmark.passed).toBe(true);
});
```

## 🚨 Troubleshooting

### Common Issues

1. **High Memory Usage**
   ```typescript
   // Solution: Implement proper cleanup
   afterEach(async () => {
     await optimizer.optimizeMemoryUsage();
     if (global.gc) global.gc();
   });
   ```

2. **Slow Test Execution**
   ```typescript
   // Solution: Enable optimization
   const optimizer = createTestExecutionOptimizer({
     enableCaching: true,
     enableParallelization: true,
     maxWorkers: require('os').cpus().length
   });
   ```

3. **Flaky Performance Tests**
   ```typescript
   // Solution: Use statistical validation
   const config = {
     warmupIterations: 5,
     measurementIterations: 10,
     significanceThreshold: 0.05
   };
   ```

### Debug Mode

Enable detailed logging:

```typescript
process.env.PERFORMANCE_DEBUG = 'true';
process.env.PERFORMANCE_LOG_LEVEL = 'verbose';
```

## 📊 Reporting and Monitoring

### HTML Reports

The framework generates comprehensive HTML reports with:
- Performance metrics and trends
- Load testing results
- Bottleneck analysis
- Optimization recommendations
- Visual charts and graphs

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Performance Testing
on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:perf:ci
      - uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: artifacts/
```

### Slack Integration

```typescript
const ciValidator = createCIPerformanceValidator({
  integrations: {
    slack: {
      enabled: true,
      webhook: process.env.SLACK_WEBHOOK,
      channel: '#performance-alerts'
    }
  }
});
```

## 🎯 Advanced Usage

### Custom Performance Decorators

```typescript
import { performanceTest } from './performance-framework';

class MyService {
  @performanceTest({
    maxExecutionTime: 100,
    memoryLeakThreshold: 5
  })
  async criticalMethod() {
    // Implementation
  }
}
```

### Performance Monitoring in Production

```typescript
// Enable production monitoring
const monitor = new PerformanceMonitor({
  enabled: process.env.NODE_ENV === 'production',
  sampleRate: 0.1, // Sample 10% of requests
  thresholds: {
    responseTime: 1000,
    memoryUsage: 512 * 1024 * 1024
  }
});
```

### Custom Load Test Scenarios

```typescript
const customScenario = {
  name: 'Custom API Load Test',
  description: 'Tests custom API endpoints',
  module: 'custom',
  virtualUsers: 50,
  requestsPerUser: 100,
  rampUpTime: 30,
  sustainTime: 120,
  endpoints: ['/api/custom/endpoint'],
  expectedRps: 200,
  maxResponseTime: 300,
  maxErrorRate: 2,
  requiredResources: ['CustomService']
};

const result = await loadTestOrchestrator.executeLoadTestScenario(customScenario.name);
```

## 📚 API Reference

### Performance Framework API

```typescript
interface PerformanceFramework {
  startMeasurement(testName: string, testSuite: string): void;
  endMeasurement(testName: string, testSuite: string, passed: boolean): PerformanceMetrics;
  runBenchmark(testFunction: Function, config: PerformanceTestConfig): Promise<PerformanceBenchmark>;
  getPerformanceReport(): PerformanceReport;
  clearMetrics(): void;
}
```

### Load Test Orchestrator API

```typescript
interface LoadTestOrchestrator {
  initialize(moduleClass: any): Promise<void>;
  executeLoadTestScenario(scenarioName: string): Promise<LoadTestResult>;
  executeAllScenarios(): Promise<Map<string, LoadTestResult>>;
  generateLoadTestReport(results: Map<string, LoadTestResult>): LoadTestReport;
  cleanup(): Promise<void>;
}
```

## 🤝 Contributing

When contributing to the performance testing framework:

1. **Add comprehensive tests** for new features
2. **Update benchmarks** when adding new functionality
3. **Maintain performance targets** - don't regress existing performance
4. **Document performance characteristics** of new features
5. **Run full performance validation** before submitting PRs

## 📄 License

This performance testing framework is part of the BytebotD package and follows the same licensing terms.