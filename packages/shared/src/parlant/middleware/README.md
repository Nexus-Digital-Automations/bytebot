# Enhanced PARLANT Universal Middleware Framework v2.0.0

## Enterprise-Grade Conversational Validation for Bytebot Ecosystem

This comprehensive middleware framework provides enterprise-grade PARLANT conversational validation with sub-1000ms performance, complete TypeScript type safety, and intelligent caching strategies.

## 🚀 Features

### Core Capabilities
- **Universal Middleware Pipeline**: Automatic validation for ALL Bytebot API endpoints
- **Sub-500ms Performance**: Intelligent caching with >95% hit ratio target
- **Complete Type Safety**: Strict TypeScript typing with compile-time validation
- **Enterprise Security**: Advanced threat detection and mitigation
- **Intelligent Caching**: Content-aware caching strategies with automatic invalidation
- **Comprehensive Monitoring**: Real-time performance metrics and audit trails

### Enhanced Features v2.0.0
- **Decorator Patterns**: Type-safe method decoration with parameter validation
- **Request/Response Interception**: Intelligent transformation and sanitization
- **Performance Optimization**: Memory-efficient processing with zero-copy operations
- **Security Scanning**: SQL injection, XSS, and sensitive data detection
- **Audit Compliance**: GDPR, HIPAA, SOX, and custom compliance support

## 📁 Architecture Overview

```
parlant/middleware/
├── core/
│   └── universal-parlant-middleware.ts    # Main middleware implementation
├── decorators/
│   └── enhanced-parlant-decorators.ts     # TypeScript decorators
├── interceptors/
│   └── parlant-request-response-interceptor.ts  # Request/response processing
├── types/
│   └── enhanced-parlant-types.ts          # Comprehensive type definitions
├── utils/
│   └── performance-utils.ts               # Performance optimization utilities
└── examples/
    ├── basic-integration.ts               # Basic usage examples
    ├── advanced-configuration.ts          # Advanced configuration examples
    └── custom-decorators.ts               # Custom decorator examples
```

## 🛠️ Installation & Setup

### 1. Import the Middleware

```typescript
import {
  EnhancedUniversalParlantMiddleware,
  EnhancedParlantValidated,
  ParlantRequestResponseInterceptor
} from '@bytebot/shared/parlant/middleware';
```

### 2. Configure the Middleware

```typescript
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { EnhancedUniversalParlantMiddleware } from '@bytebot/shared/parlant/middleware';

@Module({
  // ... other module configuration
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(EnhancedUniversalParlantMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
```

### 3. Use Enhanced Decorators

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import {
  EnhancedParlantValidated,
  TypeSafeValidation,
  PerformanceMonitored,
  SecurityLevel
} from '@bytebot/shared/parlant/middleware';

@Controller('api/tasks')
export class TasksController {

  @Post()
  @EnhancedParlantValidated({
    intent: 'Create new task with enhanced validation',
    description: 'Endpoint for creating tasks with comprehensive security validation',
    securityLevel: SecurityLevel._HIGH,
    enableMetrics: true,
    enableAuditTrail: true,
    performanceTarget: 500, // 500ms target
    cachingStrategy: {
      enabled: false, // Don't cache creation operations
      ttl: 0,
      scope: 'user'
    },
    parameterValidation: {
      validateTypes: true,
      sanitizeInputs: true,
      maxSize: 10000
    }
  })
  @TypeSafeValidation({
    validateTypes: true,
    sanitizeInputs: true,
    maxDepth: 5
  })
  @PerformanceMonitored(500) // 500ms target
  async createTask(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    return await this.tasksService.create(createTaskDto);
  }

  @Get()
  @EnhancedParlantValidated({
    intent: 'Retrieve task list with intelligent caching',
    description: 'High-performance endpoint for task retrieval',
    securityLevel: SecurityLevel._MEDIUM,
    cachingStrategy: {
      enabled: true,
      ttl: 300000, // 5 minutes
      scope: 'user',
      keyGenerator: (context, args) => `tasks:${context.user?.id}:${JSON.stringify(args)}`
    }
  })
  async getTasks(): Promise<Task[]> {
    return await this.tasksService.findAll();
  }
}
```

## ⚡ Performance Specifications

### Target Metrics
- **Processing Time**: <500ms average, <1000ms p99
- **Memory Usage**: <50MB baseline, <200MB peak
- **Cache Hit Ratio**: >95% for repeated requests
- **Concurrent Requests**: >10,000 requests/minute
- **Error Rate**: <0.1% under normal conditions

### Performance Features
```typescript
// Performance monitoring configuration
const performanceConfig = {
  maxProcessingTime: 500,        // Target processing time
  targetCacheHitRatio: 0.95,    // 95% cache hit ratio
  maxMemoryUsage: 200 * 1024 * 1024, // 200MB peak
  maxConcurrentRequests: 10000,  // 10k concurrent
  errorRateThreshold: 0.001,     // 0.1% error rate
  enableProfiling: true,
  enableMetrics: true,
  metricsRetentionPeriod: 86400000 // 24 hours
};
```

## 🔒 Security Features

### Threat Detection
```typescript
// Security configuration
const securityConfig = {
  threatDetection: {
    enabled: true,
    sqlInjectionDetection: true,
    xssDetection: true,
    csrfProtection: true,
    sensitiveDataDetection: true,
    maliciousPayloadDetection: true,
    customPatterns: [
      {
        id: 'custom-threat-1',
        name: 'Custom Malicious Pattern',
        pattern: /malicious-pattern/gi,
        threatType: 'CUSTOM',
        severity: 'HIGH',
        confidence: 0.9
      }
    ]
  }
};
```

### Authentication & Authorization
```typescript
@ContextAwareAuth({
  requireAuthentication: true,
  requiredRoles: ['ADMIN', 'POWER_USER'],
  requiredPermissions: ['TASK_CREATE'],
  minimumSecurityClearance: SecurityLevel._HIGH,
  organizationalConstraints: {
    allowedDepartments: ['ENGINEERING', 'PRODUCT'],
    timeBasedRestrictions: {
      allowedHours: [9, 17], // 9 AM to 5 PM
      allowedDaysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
      timezone: 'America/New_York'
    }
  }
})
async sensitiveOperation() {
  // Implementation
}
```

## 🎯 Advanced Configuration

### Custom Error Handling
```typescript
const errorHandlingConfig = {
  enableConversationalErrors: true,
  errorTransformationRules: [
    {
      errorType: 'ValidationError',
      pattern: /validation failed/i,
      transformation: (error, context) => ({
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        userFriendlyMessage: 'Please check your input and try again'
      }),
      conversationalExplanation: 'The system found some issues with your request that need to be addressed.',
      userFriendlyMessage: 'Please review your input data and ensure all required fields are properly formatted.',
      suggestedActions: [
        'Check all required fields are filled',
        'Verify data format matches expected patterns',
        'Contact support if the issue persists'
      ]
    }
  ],
  customErrorHandlers: [
    {
      name: 'DatabaseErrorHandler',
      condition: (error) => error.name === 'DatabaseError',
      handler: (error, context) => {
        // Custom database error handling
        return throwError(() => new HttpException(
          'Database temporarily unavailable. Please try again.',
          HttpStatus.SERVICE_UNAVAILABLE
        ));
      },
      priority: 100
    }
  ]
};
```

### Intelligent Caching
```typescript
@IntelligentCache({
  enabled: true,
  ttl: 300000, // 5 minutes
  scope: 'user',
  keyGenerator: (context, args) => {
    const user = context.switchToHttp().getRequest().user;
    const argsHash = crypto.createHash('md5')
      .update(JSON.stringify(args))
      .digest('hex');
    return `method:${context.getClass().name}:${context.getHandler().name}:${user?.id}:${argsHash}`;
  },
  invalidationTriggers: ['user:updated', 'data:modified'],
  compressionEnabled: true
})
async getCachedData(params: QueryParams): Promise<DataResult> {
  // This method's results will be intelligently cached
  return await this.dataService.query(params);
}
```

## 📊 Monitoring & Observability

### Performance Metrics
```typescript
// Get comprehensive performance metrics
const metrics = await middleware.getPerformanceMetrics();

console.log({
  global: metrics.global,
  performance: metrics.performance,
  cacheStats: metrics.cacheStats,
  systemStats: metrics.systemStats
});

// Example output:
{
  "global": {
    "totalRequests": 150000,
    "validatedRequests": 149850,
    "cachedRequests": 142575,
    "failedRequests": 150,
    "averageProcessingTime": 247.5,
    "memoryPeakUsage": 187653120,
    "currentConcurrentRequests": 45
  },
  "performance": {
    "maxProcessingTime": 500,
    "targetCacheHitRatio": 0.95,
    "actualCacheHitRatio": 0.967,
    "maxMemoryUsage": 209715200,
    "maxConcurrentRequests": 10000,
    "errorRateThreshold": 0.001,
    "actualErrorRate": 0.0001
  }
}
```

### Audit Trail Access
```typescript
// Access method-level audit trails
const auditTrail = DecoratorUtils.getAuditTrail('TasksController', 'createTask');

console.log('Recent audit events:', auditTrail?.slice(-10));

// Export comprehensive metrics
const exportedMetrics = DecoratorUtils.exportMetrics();
```

### Real-time Monitoring
```typescript
// Set up real-time monitoring
const eventEmitter = new TypedEventEmitter<MiddlewareEvents>();

eventEmitter.on('performance:warning', (operationId, metrics) => {
  console.warn(`Performance warning for ${operationId}:`, metrics);
  // Send alert to monitoring system
});

eventEmitter.on('security:threat', (operationId, threat) => {
  console.error(`Security threat detected for ${operationId}:`, threat);
  // Trigger security response
});

eventEmitter.on('request:error', (request, error) => {
  console.error(`Request error for ${request.requestId}:`, error);
  // Log error for analysis
});
```

## 🔧 Integration Examples

### Basic Integration
```typescript
// Basic controller with enhanced validation
@Controller('api/users')
export class UsersController {

  @Get(':id')
  @EnhancedParlantValidated({
    intent: 'Retrieve user information',
    description: 'Get user details by ID with security validation',
    securityLevel: SecurityLevel._MEDIUM
  })
  async getUser(@Param('id') id: string): Promise<User> {
    return await this.usersService.findById(id);
  }
}
```

### Advanced Integration
```typescript
// Advanced controller with comprehensive features
@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {

  @Post('system/config')
  @EnhancedParlantValidated({
    intent: 'Update critical system configuration',
    description: 'Administrative endpoint for system configuration updates',
    securityLevel: SecurityLevel._CRITICAL,
    validationMode: ValidationMode._SYNCHRONOUS,
    approvalLevel: ApprovalLevel._DUAL_APPROVAL,
    businessCategory: 'SYSTEM_ADMINISTRATION',
    complianceFlags: ['SOX_APPLICABLE', 'GDPR_APPLICABLE'],
    performanceTarget: 1000,
    enableMetrics: true,
    enableAuditTrail: true,
    enablePerformanceTracking: true,
    contextRequirements: {
      requireAuthentication: true,
      requiredRoles: ['SYSTEM_ADMIN'],
      requiredPermissions: ['SYSTEM_CONFIG_WRITE'],
      minimumSecurityClearance: SecurityLevel._CRITICAL
    },
    customErrorHandling: {
      escalationRules: [
        {
          condition: (error) => error.message.includes('critical'),
          escalationLevel: 'CRITICAL',
          notificationTargets: ['security-team@company.com'],
          requiresHumanIntervention: true
        }
      ]
    },
    fallbackStrategy: {
      enabled: true,
      strategy: 'MANUAL_APPROVAL'
    }
  })
  @TypeSafeValidation({
    validateTypes: true,
    sanitizeInputs: true,
    maxDepth: 10,
    customValidators: [
      {
        name: 'ConfigValidator',
        validate: (value) => validateConfigStructure(value),
        errorMessage: 'Invalid configuration structure'
      }
    ]
  })
  @PerformanceMonitored(1000)
  @ContextAwareAuth({
    requireAuthentication: true,
    requiredRoles: ['SYSTEM_ADMIN'],
    organizationalConstraints: {
      timeBasedRestrictions: {
        allowedHours: [9, 17],
        allowedDaysOfWeek: [1, 2, 3, 4, 5]
      }
    }
  })
  async updateSystemConfig(
    @Body() configUpdate: SystemConfigDto,
    @ParlantContext() parlantContext: ParlantRequestContext,
    @EnhancedUser() user: EnhancedUserContext
  ): Promise<SystemConfig> {

    // Log the operation with full context
    this.logger.log('System configuration update initiated', {
      operationId: parlantContext.operationId,
      userId: user.id,
      securityLevel: parlantContext.securityLevel,
      validationTime: parlantContext.processingTime
    });

    // Perform the update
    const result = await this.configService.updateConfig(configUpdate);

    // Add audit trail entry
    await this.auditService.recordConfigChange({
      operationId: parlantContext.operationId,
      userId: user.id,
      changes: configUpdate,
      result: result.id,
      timestamp: new Date()
    });

    return result;
  }
}
```

## 🧪 Testing

### Unit Testing with Mocks
```typescript
describe('Enhanced PARLANT Middleware', () => {
  let middleware: EnhancedUniversalParlantMiddleware;
  let mockParlantService: jest.Mocked<ParlantIntegrationService>;

  beforeEach(() => {
    mockParlantService = createMockParlantService();
    middleware = new EnhancedUniversalParlantMiddleware(
      mockConfigService,
      mockParlantService,
      mockCacheManager
    );
  });

  it('should process requests within performance targets', async () => {
    const mockRequest = createMockRequest();
    const mockResponse = createMockResponse();
    const mockNext = jest.fn();

    const startTime = performance.now();

    await middleware.use(mockRequest, mockResponse, mockNext);

    const processingTime = performance.now() - startTime;

    expect(processingTime).toBeLessThan(500); // Sub-500ms target
    expect(mockNext).toHaveBeenCalled();
    expect(mockRequest.parlant?.validated).toBe(true);
  });

  it('should handle high-risk requests appropriately', async () => {
    const highRiskRequest = createHighRiskRequest();
    const mockResponse = createMockResponse();
    const mockNext = jest.fn();

    mockParlantService.validateFunctionExecution.mockResolvedValue({
      approved: false,
      reason: 'High-risk operation requires additional approval'
    });

    await expect(
      middleware.use(highRiskRequest, mockResponse, mockNext)
    ).rejects.toThrow('Access denied');

    expect(highRiskRequest.parlant?.securityLevel).toBe(SecurityLevel._HIGH);
  });
});
```

### Integration Testing
```typescript
describe('PARLANT Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should validate requests end-to-end', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/tasks')
      .send({
        title: 'Test Task',
        description: 'Integration test task'
      })
      .expect(201);

    expect(response.headers['x-parlant-validated']).toBe('true');
    expect(response.headers['x-parlant-processing-time']).toBeDefined();
    expect(parseFloat(response.headers['x-parlant-processing-time'])).toBeLessThan(1000);
  });
});
```

## 📈 Performance Optimization

### Memory Management
```typescript
// Configure memory-efficient processing
const optimizedConfig = {
  performance: {
    maxProcessingTime: 500,
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    enableStreaming: true,
    bufferSize: 64 * 1024, // 64KB chunks
    enableProfiling: process.env.NODE_ENV === 'development'
  },
  caching: {
    maxEntries: 10000,
    compressionThreshold: 1024,
    enableCompression: true,
    evictionPolicy: 'LRU'
  }
};
```

### Concurrent Processing
```typescript
// Handle high concurrent loads
const concurrencyConfig = {
  maxConcurrentRequests: 10000,
  requestQueueSize: 50000,
  enableRequestPooling: true,
  workerThreads: require('os').cpus().length,
  enableClusterMode: true
};
```

## 🚨 Troubleshooting

### Common Issues

1. **High Processing Times**
   ```typescript
   // Check performance metrics
   const metrics = middleware.getPerformanceMetrics();
   if (metrics.global.averageProcessingTime > 1000) {
     // Investigate cache hit rates, memory usage, concurrent requests
     console.log('Performance investigation needed:', metrics);
   }
   ```

2. **Memory Leaks**
   ```typescript
   // Monitor memory usage
   setInterval(() => {
     const usage = process.memoryUsage();
     if (usage.heapUsed > 200 * 1024 * 1024) {
       console.warn('High memory usage detected:', usage);
       middleware.resetMetrics(); // Clean up old metrics
     }
   }, 60000);
   ```

3. **Cache Misses**
   ```typescript
   // Investigate cache performance
   const cacheMetrics = middleware.getMetrics().cacheStats;
   if (cacheMetrics.hitRate < 0.8) {
     console.warn('Low cache hit rate:', cacheMetrics);
     // Review cache key generation and TTL settings
   }
   ```

### Debug Mode
```typescript
// Enable debug logging
const debugConfig = {
  enableDetailedLogging: true,
  logLevel: 'debug',
  enablePerformanceTracking: true,
  enableSecurityAudit: true
};
```

## 📋 Migration Guide

### From v1.0.0 to v2.0.0

1. **Update Imports**
   ```typescript
   // Old
   import { ParlantValidated } from '@bytebot/shared';

   // New
   import { EnhancedParlantValidated } from '@bytebot/shared/parlant/middleware';
   ```

2. **Update Decorator Configuration**
   ```typescript
   // Old
   @ParlantValidated({
     intent: 'Create task',
     securityLevel: SecurityLevel._MEDIUM
   })

   // New
   @EnhancedParlantValidated({
     intent: 'Create task',
     description: 'Detailed description for better validation',
     securityLevel: SecurityLevel._MEDIUM,
     enableMetrics: true,
     enableAuditTrail: true
   })
   ```

3. **Update Middleware Registration**
   ```typescript
   // Old
   consumer.apply(ParlantUniversalMiddleware).forRoutes('*');

   // New
   consumer.apply(EnhancedUniversalParlantMiddleware).forRoutes('*');
   ```

## 🤝 Contributing

When contributing to the enhanced PARLANT middleware:

1. **Type Safety**: Ensure all new features maintain strict TypeScript typing
2. **Performance**: Profile new features to meet performance targets
3. **Testing**: Add comprehensive unit and integration tests
4. **Documentation**: Update documentation for any API changes
5. **Security**: Consider security implications of new features

## 📄 License

This enhanced PARLANT middleware framework is part of the Bytebot ecosystem and follows the same licensing terms as the main project.

---

## 🔗 Related Documentation

- [PARLANT Integration Guide](../../../docs/parlant-integration.md)
- [Bytebot Security Architecture](../../../docs/security-architecture.md)
- [Performance Optimization Guide](../../../docs/performance-guide.md)
- [TypeScript Best Practices](../../../docs/typescript-practices.md)

For questions or support, please refer to the [Bytebot Documentation](../../../README.md) or contact the development team.