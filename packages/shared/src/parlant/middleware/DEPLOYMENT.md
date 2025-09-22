# Enhanced PARLANT Universal Middleware - Deployment Guide

## 🚀 Production Deployment Guide

This guide provides comprehensive instructions for deploying the Enhanced PARLANT Universal Middleware Framework v2.0.0 in production environments.

## 📋 Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher
- **TypeScript**: v5.0.0 or higher
- **NestJS**: v10.0.0 or higher
- **Memory**: Minimum 512MB RAM, Recommended 2GB+ for high-throughput
- **CPU**: Minimum 2 cores, Recommended 4+ cores for production

### Dependencies
```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/cache-manager": "^2.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/swagger": "^7.0.0",
    "cache-manager": "^5.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 🔧 Installation Steps

### 1. Install the Framework

```bash
# Navigate to your Bytebot project root
cd bytebot/packages/shared

# Install dependencies (if not already installed)
npm install

# Verify installation
npm run build
```

### 2. Import and Configure

```typescript
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import {
  EnhancedUniversalParlantMiddleware,
  ParlantRequestResponseInterceptor,
  DEFAULT_PERFORMANCE_CONFIG,
  DEFAULT_SECURITY_CONFIG,
} from '@bytebot/shared/parlant/middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env.production', '.env'],
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 300000, // 5 minutes default TTL
      max: 10000,  // Maximum cache entries
    }),
    // ... your other modules
  ],
  providers: [
    // Global interceptor registration
    {
      provide: 'APP_INTERCEPTOR',
      useClass: ParlantRequestResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply enhanced PARLANT middleware globally
    consumer
      .apply(EnhancedUniversalParlantMiddleware)
      .forRoutes('*');
  }
}
```

### 3. Environment Configuration

Create production environment file:

```bash
# .env.production
NODE_ENV=production

# PARLANT Configuration
PARLANT_ENABLED=true
PARLANT_SERVER_URL=https://parlant.your-domain.com
PARLANT_API_KEY=your-production-api-key
PARLANT_TIMEOUT=5000
PARLANT_MAX_RETRIES=3

# Performance Configuration
PARLANT_MAX_PROCESSING_TIME=1000
PARLANT_TARGET_CACHE_HIT_RATIO=0.95
PARLANT_MAX_MEMORY_USAGE=209715200  # 200MB
PARLANT_MAX_CONCURRENT_REQUESTS=10000
PARLANT_ERROR_RATE_THRESHOLD=0.001  # 0.1%

# Security Configuration
PARLANT_ENABLE_THREAT_DETECTION=true
PARLANT_ENABLE_SQL_INJECTION_DETECTION=true
PARLANT_ENABLE_XSS_DETECTION=true
PARLANT_ENABLE_CSRF_PROTECTION=true
PARLANT_ENABLE_SENSITIVE_DATA_DETECTION=true

# Monitoring Configuration
PARLANT_ENABLE_METRICS=true
PARLANT_ENABLE_PERFORMANCE_TRACKING=true
PARLANT_ENABLE_AUDIT_LOGGING=true
PARLANT_LOG_LEVEL=info

# Cache Configuration
PARLANT_CACHE_TTL=300000  # 5 minutes
PARLANT_CACHE_MAX_ENTRIES=10000
PARLANT_ENABLE_COMPRESSION=true
PARLANT_COMPRESSION_THRESHOLD=1024

# Database/Storage (for audit logs)
DATABASE_URL=postgresql://username:password@localhost:5432/bytebot_production
REDIS_URL=redis://localhost:6379  # For distributed caching

# Monitoring and Alerting
MONITORING_ENDPOINT=https://monitoring.your-domain.com/webhook
ALERT_EMAIL=alerts@your-domain.com
SECURITY_EMAIL=security@your-domain.com
```

## 🛠️ Production Configuration

### 1. Advanced Configuration Service

```typescript
// parlant-config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EnhancedMiddlewareConfig,
  PerformanceConfig,
  SecurityConfig,
  DEFAULT_PERFORMANCE_CONFIG,
  DEFAULT_SECURITY_CONFIG,
} from '@bytebot/shared/parlant/middleware';

@Injectable()
export class ParlantConfigService {
  constructor(private readonly configService: ConfigService) {}

  getMiddlewareConfig(): EnhancedMiddlewareConfig {
    return {
      performance: this.getPerformanceConfig(),
      security: this.getSecurityConfig(),
      validation: {
        defaultSecurityLevel: this.configService.get('PARLANT_DEFAULT_SECURITY_LEVEL', 'MEDIUM'),
        enableTypeValidation: this.configService.get('PARLANT_ENABLE_TYPE_VALIDATION', true),
        enableParameterSanitization: this.configService.get('PARLANT_ENABLE_SANITIZATION', true),
        maxPayloadSize: this.configService.get('PARLANT_MAX_PAYLOAD_SIZE', 10485760), // 10MB
      },
      caching: {
        enabled: this.configService.get('PARLANT_CACHE_ENABLED', true),
        ttl: this.configService.get('PARLANT_CACHE_TTL', 300000),
        maxEntries: this.configService.get('PARLANT_CACHE_MAX_ENTRIES', 10000),
        compression: {
          enabled: this.configService.get('PARLANT_ENABLE_COMPRESSION', true),
          threshold: this.configService.get('PARLANT_COMPRESSION_THRESHOLD', 1024),
        },
      },
      monitoring: {
        enabled: this.configService.get('PARLANT_ENABLE_METRICS', true),
        metricsRetentionPeriod: this.configService.get('PARLANT_METRICS_RETENTION', 86400000),
        performanceTracking: this.configService.get('PARLANT_ENABLE_PERFORMANCE_TRACKING', true),
        auditLogging: this.configService.get('PARLANT_ENABLE_AUDIT_LOGGING', true),
      },
      errorHandling: {
        enableConversationalErrors: this.configService.get('PARLANT_CONVERSATIONAL_ERRORS', true),
        escalationThresholds: {
          errorRate: this.configService.get('PARLANT_ERROR_RATE_THRESHOLD', 0.001),
          responseTime: this.configService.get('PARLANT_RESPONSE_TIME_THRESHOLD', 5000),
          memoryUsage: this.configService.get('PARLANT_MEMORY_THRESHOLD', 0.8),
        },
      },
      compliance: {
        enableGDPR: this.configService.get('PARLANT_ENABLE_GDPR', true),
        enableHIPAA: this.configService.get('PARLANT_ENABLE_HIPAA', false),
        enableSOX: this.configService.get('PARLANT_ENABLE_SOX', false),
        auditRetentionPeriod: this.configService.get('PARLANT_AUDIT_RETENTION', 2592000000), // 30 days
      },
    };
  }

  private getPerformanceConfig(): PerformanceConfig {
    return {
      ...DEFAULT_PERFORMANCE_CONFIG,
      maxProcessingTime: this.configService.get('PARLANT_MAX_PROCESSING_TIME', 1000),
      targetCacheHitRatio: this.configService.get('PARLANT_TARGET_CACHE_HIT_RATIO', 0.95),
      maxMemoryUsage: this.configService.get('PARLANT_MAX_MEMORY_USAGE', 209715200),
      maxConcurrentRequests: this.configService.get('PARLANT_MAX_CONCURRENT_REQUESTS', 10000),
      errorRateThreshold: this.configService.get('PARLANT_ERROR_RATE_THRESHOLD', 0.001),
    };
  }

  private getSecurityConfig(): SecurityConfig {
    return {
      ...DEFAULT_SECURITY_CONFIG,
      threatDetection: {
        enabled: this.configService.get('PARLANT_ENABLE_THREAT_DETECTION', true),
        sqlInjectionDetection: this.configService.get('PARLANT_ENABLE_SQL_INJECTION_DETECTION', true),
        xssDetection: this.configService.get('PARLANT_ENABLE_XSS_DETECTION', true),
        csrfProtection: this.configService.get('PARLANT_ENABLE_CSRF_PROTECTION', true),
        sensitiveDataDetection: this.configService.get('PARLANT_ENABLE_SENSITIVE_DATA_DETECTION', true),
        maliciousPayloadDetection: this.configService.get('PARLANT_ENABLE_MALICIOUS_PAYLOAD_DETECTION', true),
        customPatterns: [],
        responseActions: [],
      },
    };
  }
}
```

### 2. Health Check Integration

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  EnhancedUniversalParlantMiddleware,
  ParlantRequestResponseInterceptor,
  SecurityLevel,
} from '@bytebot/shared/parlant/middleware';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly parlantMiddleware: EnhancedUniversalParlantMiddleware,
    private readonly parlantInterceptor: ParlantRequestResponseInterceptor,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  async getHealth(): Promise<{ status: string; timestamp: Date }> {
    return {
      status: 'healthy',
      timestamp: new Date(),
    };
  }

  @Get('parlant')
  @ApiOperation({ summary: 'PARLANT middleware health check' })
  async getParlantHealth(): Promise<{
    status: string;
    metrics: any;
    performance: any;
    timestamp: Date;
  }> {
    const metrics = this.parlantMiddleware.getPerformanceMetrics();
    const interceptorMetrics = this.parlantInterceptor.getMetrics();

    const status = this.determineHealthStatus(metrics, interceptorMetrics);

    return {
      status,
      metrics: {
        middleware: metrics,
        interceptor: interceptorMetrics,
      },
      performance: {
        averageProcessingTime: metrics.global.averageProcessingTime,
        cacheHitRate: metrics.cacheStats.endpointConfigs > 0 ?
          metrics.global.cachedRequests / metrics.global.totalRequests : 0,
        currentConcurrentRequests: metrics.global.currentConcurrentRequests,
        memoryUsage: metrics.systemStats.memory.heapUsed,
      },
      timestamp: new Date(),
    };
  }

  private determineHealthStatus(middlewareMetrics: any, interceptorMetrics: any): string {
    // Check error rates
    const errorRate = middlewareMetrics.global.totalRequests > 0 ?
      middlewareMetrics.global.failedRequests / middlewareMetrics.global.totalRequests : 0;

    if (errorRate > 0.01) { // 1% error rate threshold
      return 'degraded';
    }

    // Check performance
    if (middlewareMetrics.global.averageProcessingTime > 2000) { // 2 second threshold
      return 'degraded';
    }

    // Check memory usage
    const memoryUsage = middlewareMetrics.systemStats.memory.heapUsed;
    const memoryThreshold = 500 * 1024 * 1024; // 500MB
    if (memoryUsage > memoryThreshold) {
      return 'degraded';
    }

    return 'healthy';
  }
}
```

## 📊 Monitoring and Observability

### 1. Metrics Dashboard Integration

```typescript
// metrics.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  EnhancedParlantValidated,
  SecurityLevel,
  DecoratorUtils,
} from '@bytebot/shared/parlant/middleware';

@ApiTags('Metrics')
@Controller('admin/metrics')
@UseGuards(AdminAuthGuard) // Your admin authentication guard
@ApiBearerAuth()
export class MetricsController {

  @Get('parlant')
  @ApiOperation({ summary: 'Get comprehensive PARLANT metrics' })
  @EnhancedParlantValidated({
    intent: 'Retrieve PARLANT middleware performance metrics',
    description: 'Administrative endpoint for monitoring middleware performance',
    securityLevel: SecurityLevel._HIGH,
    contextRequirements: {
      requireAuthentication: true,
      requiredRoles: ['ADMIN', 'MONITORING'],
    },
  })
  async getParlantMetrics(): Promise<{
    framework: any;
    decorators: any;
    system: any;
    timestamp: Date;
  }> {
    return {
      framework: this.parlantMiddleware.getPerformanceMetrics(),
      decorators: DecoratorUtils.exportMetrics(),
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
      },
      timestamp: new Date(),
    };
  }

  @Get('parlant/performance')
  @ApiOperation({ summary: 'Get performance analysis' })
  @EnhancedParlantValidated({
    intent: 'Analyze PARLANT middleware performance trends',
    securityLevel: SecurityLevel._HIGH,
  })
  async getPerformanceAnalysis(): Promise<any> {
    const metrics = this.parlantMiddleware.getPerformanceMetrics();

    return {
      summary: {
        totalRequests: metrics.global.totalRequests,
        averageProcessingTime: metrics.global.averageProcessingTime,
        cacheHitRatio: metrics.global.cachedRequests / metrics.global.totalRequests,
        errorRate: metrics.global.failedRequests / metrics.global.totalRequests,
        currentLoad: metrics.global.currentConcurrentRequests,
      },
      performance: {
        targetsMet: {
          processingTime: metrics.global.averageProcessingTime < 1000,
          cacheHitRatio: (metrics.global.cachedRequests / metrics.global.totalRequests) > 0.95,
          errorRate: (metrics.global.failedRequests / metrics.global.totalRequests) < 0.001,
          memoryUsage: metrics.systemStats.memory.heapUsed < 200 * 1024 * 1024,
        },
      },
      recommendations: this.generatePerformanceRecommendations(metrics),
    };
  }

  private generatePerformanceRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.global.averageProcessingTime > 1000) {
      recommendations.push('Consider optimizing validation logic or increasing cache TTL');
    }

    const cacheHitRatio = metrics.global.cachedRequests / metrics.global.totalRequests;
    if (cacheHitRatio < 0.9) {
      recommendations.push('Review cache key generation and TTL settings to improve hit ratio');
    }

    const errorRate = metrics.global.failedRequests / metrics.global.totalRequests;
    if (errorRate > 0.001) {
      recommendations.push('Investigate error patterns and improve error handling');
    }

    if (metrics.systemStats.memory.heapUsed > 150 * 1024 * 1024) {
      recommendations.push('Monitor memory usage and consider cleanup of old metrics');
    }

    return recommendations;
  }
}
```

### 2. Logging Configuration

```typescript
// logging.config.ts
import { LogLevel } from '@nestjs/common';

export function getLogLevels(): LogLevel[] {
  const env = process.env.NODE_ENV;

  switch (env) {
    case 'production':
      return ['error', 'warn', 'log'];
    case 'staging':
      return ['error', 'warn', 'log', 'debug'];
    case 'development':
      return ['error', 'warn', 'log', 'debug', 'verbose'];
    default:
      return ['error', 'warn', 'log'];
  }
}

// Custom logger for PARLANT operations
export class ParlantLogger {
  private static instance: ParlantLogger;

  static getInstance(): ParlantLogger {
    if (!ParlantLogger.instance) {
      ParlantLogger.instance = new ParlantLogger();
    }
    return ParlantLogger.instance;
  }

  logValidation(operationId: string, data: any): void {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'PARLANT validation completed',
      operationId,
      data,
      service: 'parlant-middleware',
    }));
  }

  logPerformanceWarning(operationId: string, metrics: any): void {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'PARLANT performance warning',
      operationId,
      metrics,
      service: 'parlant-middleware',
    }));
  }

  logSecurityEvent(operationId: string, threat: any): void {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'PARLANT security threat detected',
      operationId,
      threat,
      service: 'parlant-middleware',
    }));
  }
}
```

## 🔒 Security Hardening

### 1. Production Security Configuration

```typescript
// security.config.ts
export const PRODUCTION_SECURITY_CONFIG = {
  threatDetection: {
    enabled: true,
    sqlInjectionDetection: true,
    xssDetection: true,
    csrfProtection: true,
    sensitiveDataDetection: true,
    maliciousPayloadDetection: true,
    customPatterns: [
      {
        id: 'api-key-exposure',
        name: 'API Key Exposure',
        pattern: /\b[A-Za-z0-9_-]{32,}\b/g,
        threatType: 'SENSITIVE_DATA',
        severity: 'HIGH',
        confidence: 0.8,
      },
      {
        id: 'jwt-token-exposure',
        name: 'JWT Token Exposure',
        pattern: /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
        threatType: 'SENSITIVE_DATA',
        severity: 'CRITICAL',
        confidence: 0.95,
      },
    ],
    responseActions: [
      {
        threatType: 'SQL_INJECTION',
        severity: 'HIGH',
        action: 'BLOCK',
        notificationTargets: ['security@company.com'],
      },
      {
        threatType: 'XSS',
        severity: 'HIGH',
        action: 'SANITIZE',
        notificationTargets: ['security@company.com'],
      },
      {
        threatType: 'SENSITIVE_DATA',
        severity: 'CRITICAL',
        action: 'BLOCK',
        notificationTargets: ['security@company.com', 'admin@company.com'],
      },
    ],
  },
  authentication: {
    requireAuthentication: true,
    sessionTimeout: 3600000, // 1 hour
    maxFailedAttempts: 5,
    lockoutDuration: 900000, // 15 minutes
  },
  authorization: {
    defaultDenyAll: true,
    roleHierarchy: true,
    permissionInheritance: true,
  },
  dataProtection: {
    encryptSensitiveData: true,
    maskSensitiveFields: true,
    anonymizeAuditLogs: false, // Keep full audit for compliance
    dataRetentionPeriod: 2592000000, // 30 days
  },
  auditLogging: {
    enabled: true,
    logAllRequests: true,
    logFailedValidations: true,
    logSecurityEvents: true,
    logPerformanceIssues: true,
    compressionEnabled: true,
    encryptionEnabled: true,
  },
};
```

### 2. Rate Limiting Integration

```typescript
// rate-limiting.config.ts
import { ThrottlerModule } from '@nestjs/throttler';

export const RATE_LIMITING_CONFIG = ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1000,  // 1 second
    limit: 10,  // 10 requests per second
  },
  {
    name: 'medium',
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute
  },
  {
    name: 'long',
    ttl: 3600000, // 1 hour
    limit: 1000,  // 1000 requests per hour
  },
]);
```

## 🚀 Performance Optimization

### 1. Production Optimizations

```typescript
// performance.config.ts
export const PRODUCTION_PERFORMANCE_CONFIG = {
  // Memory management
  maxHeapSize: '2048m',
  maxOldSpaceSize: '1024m',

  // Garbage collection optimization
  gcSettings: [
    '--max-old-space-size=1024',
    '--max-new-space-size=256',
    '--optimize-for-size',
  ],

  // Clustering for multi-core utilization
  clustering: {
    enabled: true,
    workers: process.env.WEB_CONCURRENCY || require('os').cpus().length,
  },

  // Cache optimization
  cache: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      maxMemoryPolicy: 'allkeys-lru',
    },
  },

  // Request optimization
  compression: {
    enabled: true,
    threshold: 1024,
    level: 6,
  },

  // Connection pooling
  keepAlive: {
    enabled: true,
    keepAliveMsecs: 1000,
    maxSockets: 256,
    maxFreeSockets: 256,
  },
};
```

### 2. Clustering Setup

```typescript
// main.ts with clustering
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cluster from 'cluster';
import { cpus } from 'os';

async function bootstrap() {
  if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
    const numCPUs = cpus().length;
    console.log(`Master ${process.pid} is running`);
    console.log(`Forking ${numCPUs} workers`);

    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} died`);
      console.log('Forking a new worker');
      cluster.fork();
    });
  } else {
    const app = await NestFactory.create(AppModule, {
      logger: getLogLevels(),
    });

    // Production optimizations
    app.enable('trust proxy');
    app.use(compression());
    app.use(helmet());

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`Worker ${process.pid} started on port ${port}`);
  }
}

bootstrap();
```

## 🧪 Testing in Production

### 1. Smoke Tests

```typescript
// smoke-tests.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Production Smoke Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return healthy status', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
  });

  it('should validate PARLANT middleware is working', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/parlant')
      .expect(200);

    expect(response.body.status).toMatch(/healthy|degraded/);
    expect(response.headers['x-parlant-validated']).toBe('true');
  });

  it('should handle protected endpoints', async () => {
    await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ title: 'Test Task' })
      .expect(401); // Should require authentication
  });
});
```

### 2. Load Tests

```bash
# load-test.sh
#!/bin/bash

echo "Running PARLANT middleware load tests..."

# Install k6 if not present
if ! command -v k6 &> /dev/null; then
    echo "Installing k6..."
    wget https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz
    tar xzf k6-v0.47.0-linux-amd64.tar.gz
    sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/
fi

# Run load test
k6 run --vus 100 --duration 5m load-test.js

echo "Load test completed"
```

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100, // 100 virtual users
  duration: '5m', // 5 minutes
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
  },
};

export default function () {
  // Test health endpoint
  let healthResponse = http.get('http://localhost:3000/health');
  check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
    'parlant header present': (r) => r.headers['x-parlant-validated'] === 'true',
  });

  // Test PARLANT health endpoint
  let parlantHealthResponse = http.get('http://localhost:3000/health/parlant');
  check(parlantHealthResponse, {
    'parlant health status is 200': (r) => r.status === 200,
    'parlant processing time under 1s': (r) =>
      parseFloat(r.headers['x-parlant-processing-time']) < 1000,
  });

  sleep(1);
}
```

## 📈 Monitoring and Alerting

### 1. Prometheus Metrics

```typescript
// prometheus.service.ts
import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class PrometheusService {
  private readonly requestCounter = new Counter({
    name: 'parlant_requests_total',
    help: 'Total number of PARLANT requests',
    labelNames: ['method', 'status', 'validated'],
  });

  private readonly requestDuration = new Histogram({
    name: 'parlant_request_duration_seconds',
    help: 'Duration of PARLANT requests in seconds',
    labelNames: ['method', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5],
  });

  private readonly cacheHitRate = new Gauge({
    name: 'parlant_cache_hit_rate',
    help: 'PARLANT cache hit rate',
  });

  private readonly memoryUsage = new Gauge({
    name: 'parlant_memory_usage_bytes',
    help: 'PARLANT middleware memory usage',
  });

  incrementRequestCounter(method: string, status: string, validated: boolean): void {
    this.requestCounter.inc({ method, status, validated: validated.toString() });
  }

  recordRequestDuration(method: string, status: string, duration: number): void {
    this.requestDuration.observe({ method, status }, duration / 1000);
  }

  updateCacheHitRate(hitRate: number): void {
    this.cacheHitRate.set(hitRate);
  }

  updateMemoryUsage(bytes: number): void {
    this.memoryUsage.set(bytes);
  }

  getMetrics(): string {
    return register.metrics();
  }
}
```

### 2. Alert Configuration

```yaml
# alerts.yml (Prometheus AlertManager)
groups:
  - name: parlant_middleware
    rules:
      - alert: ParlantHighErrorRate
        expr: rate(parlant_requests_total{status!="200"}[5m]) > 0.01
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in PARLANT middleware"
          description: "Error rate is {{ $value }} which is above the threshold of 1%"

      - alert: ParlantSlowRequests
        expr: histogram_quantile(0.95, rate(parlant_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow PARLANT request processing"
          description: "95th percentile latency is {{ $value }}s which is above 1s threshold"

      - alert: ParlantLowCacheHitRate
        expr: parlant_cache_hit_rate < 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low PARLANT cache hit rate"
          description: "Cache hit rate is {{ $value }} which is below 90% threshold"

      - alert: ParlantHighMemoryUsage
        expr: parlant_memory_usage_bytes > 200000000  # 200MB
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High PARLANT memory usage"
          description: "Memory usage is {{ $value }} bytes which is above 200MB threshold"
```

## 🔄 Maintenance and Updates

### 1. Rolling Updates

```bash
#!/bin/bash
# rolling-update.sh

echo "Starting PARLANT middleware rolling update..."

# Health check function
health_check() {
    local url=$1
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url/health/parlant" > /dev/null; then
            echo "Health check passed"
            return 0
        fi
        echo "Health check attempt $attempt failed, retrying..."
        sleep 2
        ((attempt++))
    done

    echo "Health check failed after $max_attempts attempts"
    return 1
}

# Update worker nodes one by one
for worker in worker1 worker2 worker3; do
    echo "Updating $worker..."

    # Deploy new version
    kubectl set image deployment/parlant-middleware parlant-middleware=parlant:v2.0.0 --record

    # Wait for rollout
    kubectl rollout status deployment/parlant-middleware --timeout=300s

    # Health check
    if health_check "http://$worker.example.com"; then
        echo "$worker updated successfully"
    else
        echo "Update failed for $worker, rolling back..."
        kubectl rollout undo deployment/parlant-middleware
        exit 1
    fi
done

echo "Rolling update completed successfully"
```

### 2. Database Migrations

```typescript
// migration.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class MigrationService {
  async migrateAuditLogs(): Promise<void> {
    // Migrate audit log structure if needed
    console.log('Migrating audit logs...');

    // Example: Add new fields to audit events
    // This would be implemented based on your database setup

    console.log('Audit log migration completed');
  }

  async migrateCacheStructure(): Promise<void> {
    // Migrate cache key structure if needed
    console.log('Migrating cache structure...');

    // Clear old cache entries if structure changed
    // Update cache key generation logic

    console.log('Cache structure migration completed');
  }

  async migrateConfiguration(): Promise<void> {
    // Migrate configuration format if needed
    console.log('Migrating configuration...');

    // Update configuration schema
    // Validate new configuration

    console.log('Configuration migration completed');
  }
}
```

## 🚨 Troubleshooting

### Common Issues and Solutions

1. **High Memory Usage**
   ```bash
   # Check memory usage
   kubectl top pods | grep parlant

   # Solution: Reduce cache size or increase memory limits
   export PARLANT_CACHE_MAX_ENTRIES=5000
   export PARLANT_MAX_MEMORY_USAGE=104857600  # 100MB
   ```

2. **Low Cache Hit Rate**
   ```bash
   # Check cache configuration
   curl http://localhost:3000/admin/metrics/parlant/performance

   # Solution: Adjust cache TTL and key generation
   export PARLANT_CACHE_TTL=600000  # 10 minutes
   ```

3. **High Error Rate**
   ```bash
   # Check error logs
   kubectl logs deployment/parlant-middleware | grep ERROR

   # Check PARLANT service connectivity
   curl -f $PARLANT_SERVER_URL/health
   ```

4. **Slow Performance**
   ```bash
   # Check processing times
   curl http://localhost:3000/health/parlant

   # Solution: Optimize configuration
   export PARLANT_MAX_PROCESSING_TIME=500
   export PARLANT_ENABLE_COMPRESSION=true
   ```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database/Redis connections tested
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Load balancer configured
- [ ] Backup procedures in place

### Deployment
- [ ] Code deployed and built successfully
- [ ] Health checks passing
- [ ] PARLANT service connectivity verified
- [ ] Cache warming completed
- [ ] Monitoring dashboards updated

### Post-Deployment
- [ ] Smoke tests executed
- [ ] Load tests completed
- [ ] Performance metrics within targets
- [ ] Alert rules active
- [ ] Documentation updated
- [ ] Team notified

---

For additional support or questions about deployment, please refer to the [main documentation](./README.md) or contact the development team.