# BytebotD Testing Guide

Comprehensive testing documentation for the BytebotD package, covering unit tests, integration tests, test coordination, and quality assurance.

## Table of Contents

1. [Overview](#overview)
2. [Test Suite Structure](#test-suite-structure)
3. [Running Tests](#running-tests)
4. [Test Coordination](#test-coordination)
5. [Coverage Requirements](#coverage-requirements)
6. [Quality Gates](#quality-gates)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

## Overview

The BytebotD testing framework provides comprehensive test coverage with multiple layers:

- **Unit Tests**: Individual component testing with mocks
- **Integration Tests**: Service integration and workflow testing
- **E2E Tests**: End-to-end system testing
- **Performance Tests**: Load and performance validation
- **Test Coordination**: Automated test orchestration and reporting

## Test Suite Structure

```
src/
├── computer-use/
│   ├── __tests__/
│   │   ├── computer-use.service.integration.spec.ts  # Integration tests
│   │   ├── computer-use.service.spec.ts              # Unit tests
│   │   ├── computer-use.service.files.spec.ts        # File operation tests
│   │   ├── computer-use.service.ocr.spec.ts          # OCR operation tests
│   │   └── computer-use.service.vision.spec.ts       # Vision service tests
│   └── computer-use.service.ts
├── test-utils/
│   ├── setup.ts                    # Global test setup
│   └── setupAfterEnv.ts           # Custom matchers and utilities
test/
├── jest-e2e.json                  # E2E test configuration
scripts/
├── test-runner.js                 # Test coordination script
└── validate-tests.js              # Test validation script
```

## Running Tests

### Basic Test Commands

```bash
# Run all unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run all tests with coordination
npm run test:all

# Run tests with coverage
npm run test:cov

# Run in watch mode
npm run test:watch

# CI-compatible test run
npm run test:ci
```

### Advanced Test Execution

```bash
# Run comprehensive test suite with validation
npm run test:report

# Run only tests for specific service
npm test -- --testPathPattern=computer-use

# Run with performance profiling
npm run test:perf

# Clear Jest cache
npm run test:clear-cache

# Debug specific test
npm run test:debug -- --testNamePattern="should perform OCR"
```

## Test Coordination

The test coordination system orchestrates multiple test suites and provides comprehensive reporting.

### Test Runner Features

- **Sequential Execution**: Unit → Integration → E2E tests
- **Coverage Aggregation**: Combines coverage from all suites
- **Performance Monitoring**: Tracks test execution times and memory usage
- **Error Isolation**: Continues execution even if individual suites fail
- **Comprehensive Reporting**: HTML and JSON reports with detailed metrics

### Using the Test Runner

```bash
# Run coordinated test suite
npm run test:all

# Run with specific configuration
node scripts/test-runner.js

# Environment variables
NODE_ENV=test LOG_LEVEL=error npm run test:all
```

### Test Validation

```bash
# Validate test quality and coverage
npm run test:validate

# Manual validation
node scripts/validate-tests.js
```

## Coverage Requirements

### Global Coverage Thresholds

- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Critical Module Thresholds

**ComputerUseService** and **CUA Integration**:
- **Statements**: 85%
- **Branches**: 85%
- **Functions**: 85%
- **Lines**: 85%

### Coverage Reports

Coverage reports are generated in multiple formats:

```
coverage/                    # Unit test coverage
coverage-integration/        # Integration test coverage  
coverage-e2e/               # E2E test coverage
coverage-aggregated/        # Combined coverage report
├── html/                   # HTML report
├── lcov.info              # LCOV format
├── coverage-final.json    # JSON format
└── coverage-summary.json  # Summary
```

## Quality Gates

### Automated Quality Checks

1. **Coverage Validation**: Ensures coverage thresholds are met
2. **Test File Quality**: Validates test structure and naming
3. **Mock Usage**: Validates proper mocking patterns
4. **Performance Benchmarks**: Ensures tests complete within time limits
5. **CI/CD Compatibility**: Validates configuration for continuous integration

### Quality Metrics

- **Test Quality Score**: Based on test structure, coverage, and best practices
- **Performance Score**: Based on execution time and memory usage
- **Coverage Score**: Aggregate coverage across all test suites

### Validation Report

```json
{
  "timestamp": "2024-12-20T10:30:00.000Z",
  "metrics": {
    "totalTests": 156,
    "totalTestFiles": 8,
    "coverageScore": 87,
    "qualityScore": 92
  },
  "validation": {
    "errors": [],
    "warnings": []
  },
  "details": {
    "coverage": {
      "statements": 87.5,
      "branches": 85.2,
      "functions": 89.1,
      "lines": 86.8
    }
  }
}
```

## CI/CD Integration

### GitHub Actions Workflow

The CI/CD pipeline provides comprehensive testing across multiple Node.js versions:

```yaml
# Matrix testing across Node.js versions
matrix:
  node-version: ["18", "20", "21"]

# Sequential test execution
jobs:
  - setup
  - unit-tests
  - integration-tests
  - e2e-tests (optional)
  - test-coordination
  - quality-gates
```

### Workflow Features

- **Dependency Caching**: Optimized builds with npm cache
- **Parallel Execution**: Unit tests run across multiple Node.js versions
- **Coverage Aggregation**: Combined coverage reports
- **Artifact Collection**: Test results, coverage reports, and logs
- **Quality Gates**: Automated pass/fail determination
- **PR Comments**: Coverage reports on pull requests

### Environment Variables

```bash
NODE_ENV=test              # Test environment
LOG_LEVEL=error           # Reduced logging noise
FORCE_COLOR=1            # Colored output in CI
DATABASE_URL=...         # Test database connection
```

## Custom Test Matchers

The testing framework includes custom Jest matchers for domain-specific assertions:

```typescript
// Operation ID validation
expect(result.operationId).toBeValidOperationId();

// Base64 validation
expect(result.image).toBeValidBase64();

// Execution time validation
expect(result).toHaveReasonableExecutionTime(5000);

// Screenshot result validation
expect(result).toBeValidScreenshotResult();

// File operation result validation
expect(result).toBeValidFileResult('write');

// OCR result validation
expect(result).toBeValidOcrResult();
```

## Test Data Factories

Use the TestDataFactory for consistent test data generation:

```typescript
import { TestDataFactory } from '../test-utils/setupAfterEnv';

// Create test data
const screenshotResult = TestDataFactory.createScreenshotResult();
const fileResult = TestDataFactory.createFileWriteResult(true);
const ocrResult = TestDataFactory.createOcrResult({ confidence: 0.95 });
```

## Troubleshooting

### Common Issues

#### Test Timeouts

```bash
# Increase timeout for slow tests
npm test -- --testTimeout=60000

# Run tests serially
npm test -- --runInBand
```

#### Memory Issues

```bash
# Limit Jest workers
npm test -- --maxWorkers=2

# Clear cache
npm run test:clear-cache
```

#### Coverage Issues

```bash
# Debug coverage collection
npm test -- --coverage --verbose

# Check coverage configuration
cat jest.config.js | grep -A 10 coverage
```

#### Mock Issues

```bash
# Clear all mocks
jest.clearAllMocks();

# Debug mock calls
console.log(mockService.method.mock.calls);
```

### Performance Debugging

Monitor test performance with built-in metrics:

```typescript
// Performance monitoring is automatic
// Check test-results/performance-report.json for details

// Manual performance tracking
const startTime = Date.now();
await service.action(action);
const duration = Date.now() - startTime;
expect(duration).toBeLessThan(5000);
```

### Debug Configuration

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--testPathPattern=computer-use.service.spec.ts"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Best Practices

### Test Organization

1. **Group Related Tests**: Use describe blocks to organize tests logically
2. **Clear Test Names**: Use descriptive test names that explain the scenario
3. **Setup/Teardown**: Use beforeEach/afterEach for consistent test state
4. **Async/Await**: Use async/await for better error handling
5. **Mock Isolation**: Clear mocks between tests to prevent interference

### Test Data Management

1. **Use Factories**: Leverage TestDataFactory for consistent data
2. **Realistic Data**: Use realistic test data that matches production scenarios
3. **Data Cleanup**: Clean up test data and temporary files
4. **Environment Isolation**: Use temporary directories for file operations

### Performance Considerations

1. **Parallel Execution**: Run tests in parallel when possible
2. **Resource Cleanup**: Properly clean up resources and connections
3. **Memory Management**: Monitor and limit memory usage
4. **Timeout Management**: Set appropriate timeouts for different test types

### CI/CD Integration

1. **Deterministic Tests**: Ensure tests produce consistent results
2. **Environment Compatibility**: Test across different environments
3. **Artifact Collection**: Collect and preserve test artifacts
4. **Quality Gates**: Implement automated quality thresholds

---

## Support

For testing issues or questions:

1. Check this guide for common solutions
2. Review test logs and error messages
3. Check the validation report for quality metrics
4. Use debug mode to isolate specific issues

**Remember**: The testing framework is designed to be comprehensive and reliable. When in doubt, run the full test suite with `npm run test:report` to get complete validation and reporting.