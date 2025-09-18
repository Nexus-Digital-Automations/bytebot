# BytebotD Testing Configuration

This document outlines the comprehensive Jest testing framework setup for the BytebotD package.

## 🚀 Overview

The BytebotD package now has a production-ready Jest testing framework with:

- **TypeScript Support**: Full ts-jest integration with proper compilation
- **NestJS Testing**: Comprehensive mocking utilities for NestJS applications
- **Coverage Reporting**: Detailed coverage reports with configurable thresholds
- **Performance Monitoring**: Test performance tracking and optimization
- **Custom Matchers**: Domain-specific assertion utilities
- **Mock Utilities**: Extensive mocking helpers for external dependencies

## 📁 File Structure

```
src/
├── test-utils/
│   ├── setup.ts                    # Main Jest setup with comprehensive mocks
│   ├── simple-setup.ts            # Lightweight setup for basic tests
│   ├── setupAfterEnv.ts           # Custom matchers and test utilities
│   ├── nestjs-mocks.ts            # NestJS-specific mocking utilities
│   └── index.ts                   # Centralized exports for test utilities
├── **/__tests__/                  # Test directories alongside source files
│   └── *.spec.ts                  # Test files
└── **/*.spec.ts                   # Standalone test files
jest.config.js                     # Main Jest configuration
package.json                       # Updated with comprehensive test scripts
```

## 🧪 Test Scripts

### Basic Testing
```bash
npm test                    # Run all tests with basic configuration
npm run test:watch         # Run tests in watch mode
npm run test:unit          # Run only unit tests (*.spec.ts)
npm run test:integration   # Run integration tests (*integration.spec.ts)
```

### Coverage Testing
```bash
npm run test:cov           # Run tests with coverage report
npm run test:ci            # Run tests for CI/CD environments
```

### Specialized Testing
```bash
npm run test:debug         # Run tests with debugging support
npm run test:perf          # Run performance tests with single worker
npm run test:e2e           # Run end-to-end tests
```

### Maintenance
```bash
npm run test:clear-cache   # Clear Jest cache
```

## 📊 Coverage Configuration

### Coverage Thresholds
- **Global Minimum**: 75% (statements, branches, functions, lines)
- **Critical Modules**: 80% (computer-use, cua-integration)

### Coverage Reports
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`
- **JSON**: `coverage/coverage-final.json`
- **Test Report**: `coverage/html-report/test-report.html`
- **JUnit XML**: `coverage/junit.xml`

## 🛠️ Configuration Features

### TypeScript Support
- **ts-jest Preset**: Modern TypeScript compilation
- **Path Mapping**: Support for `@/`, `@src/`, and `@bytebot/shared` imports
- **Proper Diagnostics**: Warning-only mode for faster test runs

### NestJS Integration
- **Decorator Mocking**: Automatic mocking of NestJS decorators
- **Module Testing**: Utilities for creating test modules
- **Dependency Injection**: Mock providers and services
- **WebSocket Support**: Mock WebSocket gateways and clients

### Performance Optimization
- **Parallel Execution**: 50% of available CPU cores
- **Caching**: Enabled with optimized cache directory
- **Transform Optimization**: Minimal transformation for faster runs
- **Memory Management**: Leak detection and cleanup utilities

## 🎯 Custom Matchers

### Operation Validation
```typescript
expect(operationId).toBeValidOperationId();
expect(coordinates).toBeValidCoordinates();
expect(result).toBeSuccessResult();
```

### Screenshot and File Operations
```typescript
expect(screenshot).toHaveValidScreenshotMetadata();
expect(fileResult).toBeValidFileResult();
expect(mockFunction).toHaveBeenCalledWithOperationId();
```

## 🧩 Mock Utilities

### Service Mocking
```typescript
import { createMockService, createMockRepository } from '@/test-utils';

const mockService = createMockService<MyService>(['method1', 'method2']);
const mockRepository = createMockRepository();
```

### NestJS Component Mocking
```typescript
import { 
  createMockWebSocketServer,
  createMockHttpContext,
  createMockExecutionContext 
} from '@/test-utils';

const mockServer = createMockWebSocketServer();
const mockContext = createMockHttpContext();
```

### Test Data Generation
```typescript
import { TestDataFactory } from '@/test-utils';

const mockAction = TestDataFactory.createComputerAction('screenshot');
const mockCoordinates = TestDataFactory.createCoordinates(100, 200);
const mockOcrResult = TestDataFactory.createOcrResult();
```

## 🔍 Debugging

### Test Debugging
```bash
# Run specific test with debugging
npm run test:debug -- --testNamePattern="specific test"

# Debug with Node.js inspector
node --inspect-brk node_modules/.bin/jest --config jest.config.js --runInBand
```

### Performance Analysis
- **Slow Test Detection**: Tests >5s are automatically flagged
- **Memory Leak Detection**: Automatic memory usage monitoring
- **Performance Metrics**: Built-in timing and resource tracking

## 📈 Best Practices

### Test Organization
1. **Co-location**: Keep tests near source files in `__tests__/` directories
2. **Naming**: Use descriptive test names with clear scenarios
3. **Grouping**: Organize tests by feature/method with `describe` blocks
4. **Setup/Teardown**: Use `beforeEach`/`afterEach` for consistent test isolation

### Mock Management
1. **Clean Mocks**: Use `clearMocks: true` to reset between tests
2. **Specific Mocking**: Mock only what's necessary for each test
3. **Type Safety**: Use properly typed mocks with `jest.Mocked<T>`
4. **Resource Cleanup**: Register cleanup functions for test resources

### Coverage Optimization
1. **Focus on Critical Code**: Higher thresholds for core modules
2. **Exclude Appropriate Files**: Don't test generated files or types
3. **Test Real Scenarios**: Focus on actual usage patterns
4. **Edge Case Coverage**: Include error handling and boundary conditions

## 🚨 Troubleshooting

### Common Issues

#### TypeScript Compilation Errors
- Check `tsconfig.json` compatibility with Jest configuration
- Ensure proper path mapping in `moduleNameMapper`
- Verify all required type dependencies are installed

#### Mock Setup Issues
- Clear Jest cache: `npm run test:clear-cache`
- Check mock file paths and imports
- Verify mock setup in `setupFiles` and `setupFilesAfterEnv`

#### Performance Issues
- Reduce `maxWorkers` for resource-constrained environments
- Use `--runInBand` for debugging
- Check for memory leaks in test code

### Getting Help
- Check Jest documentation: https://jestjs.io/docs/getting-started
- Review NestJS testing guide: https://docs.nestjs.com/fundamentals/testing
- Examine existing test files for patterns and examples

## ✅ Success Criteria

The Jest testing framework setup is complete when:

- [x] Jest configuration runs without errors
- [x] TypeScript compilation works for tests
- [x] Coverage reporting generates detailed reports
- [x] NestJS mocking utilities are functional
- [x] Custom matchers work correctly
- [x] Test scripts execute successfully
- [x] Performance monitoring is active
- [x] Documentation is comprehensive

## 📝 Next Steps

1. **Write Tests**: Create comprehensive test suites for all modules
2. **CI Integration**: Configure continuous integration with test automation
3. **Coverage Goals**: Achieve target coverage thresholds across all modules
4. **Performance Baseline**: Establish performance benchmarks for critical operations
5. **Test Maintenance**: Regular review and update of test utilities and configurations