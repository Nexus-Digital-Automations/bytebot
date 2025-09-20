# PARLANT Phase 1 Performance Monitoring System

Comprehensive performance monitoring, optimization, and alerting system for PARLANT database function wrapping with enterprise-grade performance analytics and sub-1000ms P95 response time targets.

## 🚀 Overview

The PARLANT Performance Monitoring System provides real-time monitoring, intelligent analytics, and automated optimization for database function wrapping operations. It ensures enterprise-grade performance while maintaining conversational validation quality.

### Key Features

- **Real-time Performance Monitoring**: Sub-100ms metric collection with comprehensive function execution tracking
- **Advanced Cache Analytics**: Multi-level cache performance analysis with 85%+ hit rate optimization
- **Intelligent Alerting**: Smart threshold management with correlation-based alert aggregation
- **Predictive Analytics**: Machine learning-powered trend analysis and performance forecasting
- **Regression Detection**: Statistical change point detection with automated rollback recommendations
- **Enterprise Integration**: CI/CD pipeline integration with performance gates and deployment tracking

### Performance Targets

- **P95 Response Times**: <1000ms for all wrapped functions
- **Cache Hit Rates**: >85% across all cache levels (L1/L2/L3)
- **Function Overhead**: <10ms per wrap operation
- **PARLANT Latency**: <200ms for validation communication
- **Throughput**: 5000+ operations per second
- **Memory Efficiency**: 40%+ resource optimization

## 📦 Components

### 1. Performance Monitor (`performance-monitor.ts`)

Core performance monitoring with real-time metrics collection and analysis.

```typescript
import { performanceMonitor, monitorPerformance } from './monitoring';

// Start monitoring
await performanceMonitor.startMonitoring();

// Record function execution
performanceMonitor.recordFunctionExecution({
  functionName: 'validateUser',
  startTime: performance.now(),
  endTime: performance.now() + 250,
  executionTime: 250,
  parlantTime: 45,
  overheadTime: 8,
  cached: true,
  cacheHit: true,
  success: true,
  parametersHash: 'user123',
  memoryDelta: 2.5,
  cpuUsage: 15.2
});

// Get current statistics
const stats = performanceMonitor.getCurrentStats();
console.log(`P95 Response Time: ${stats.p95}ms`);
```

**Decorator Usage:**
```typescript
class UserService {
  @monitorPerformance('UserService.validateUser')
  async validateUser(userId: string): Promise<boolean> {
    // Function implementation
    return true;
  }
}
```

### 2. Cache Analyzer (`cache-analyzer.ts`)

Advanced cache performance analysis with multi-level optimization.

```typescript
import { cacheAnalyzer } from './monitoring';

// Start cache analysis
await cacheAnalyzer.startAnalysis();

// Record cache operation
cacheAnalyzer.recordOperation({
  id: 'cache-op-123',
  level: 'L1',
  operation: 'GET',
  key: 'user:123:permissions',
  timestamp: new Date(),
  duration: 2.5,
  success: true,
  hit: true,
  dataSize: 1024,
  functionName: 'getUserPermissions'
});

// Get cache analytics
const analytics = cacheAnalyzer.getCacheAnalytics();
console.log(`L1 Cache Hit Rate: ${analytics.levels.L1.hitRate * 100}%`);

// Get optimization recommendations
const optimizations = cacheAnalyzer.getOptimizations();
optimizations.forEach(opt => {
  console.log(`${opt.type}: ${opt.description}`);
});
```

### 3. Alert Manager (`alert-manager.ts`)

Intelligent alerting with correlation and automated escalation.

```typescript
import { alertManager } from './monitoring';

// Start alert manager
await alertManager.start();

// Create threshold
alertManager.addThreshold({
  id: 'response-time-threshold',
  metricName: 'p95_response_time',
  type: 'STATIC',
  config: { value: 1000 },
  operator: 'GT',
  severity: 'WARNING',
  scope: {},
  evaluation: {
    minDuration: 30000,
    interval: 5000,
    consecutiveBreaches: 3
  },
  enabled: true,
  metadata: {
    description: 'P95 response time threshold',
    owner: 'performance-team',
    createdAt: new Date(),
    lastModified: new Date(),
    tags: ['response-time', 'critical']
  }
});

// Record metrics
alertManager.recordMetric('p95_response_time', 1250);

// Get active alerts
const activeAlerts = alertManager.getActiveAlerts();
activeAlerts.forEach(alert => {
  console.log(`Alert: ${alert.title} [${alert.severity}]`);
});
```

### 4. Analytics Engine (`analytics-engine.ts`)

Advanced analytics with trend analysis and forecasting.

```typescript
import { analyticsEngine } from './monitoring';

// Start analytics engine
await analyticsEngine.start();

// Record data points
analyticsEngine.recordDataPoint('response_time', 450, {
  functionName: 'validateUser',
  cached: true
});

// Get trend analysis
const trend = analyticsEngine.getTrendAnalysis('response_time');
if (trend) {
  console.log(`Trend Direction: ${trend.direction}`);
  console.log(`Trend Strength: ${trend.strength}`);
}

// Get performance forecast
const forecast = analyticsEngine.getForecast('response_time');
if (forecast) {
  console.log(`Forecast Model: ${forecast.model}`);
  console.log(`Next Hour Prediction: ${forecast.forecast[0]?.predictedValue}ms`);
}

// Get analytics dashboard
const dashboard = analyticsEngine.getAnalyticsDashboard();
console.log(`Performance Score: ${dashboard.summary.score}/100`);
```

### 5. Regression Detector (`regression-detector.ts`)

Statistical regression detection with automated prevention.

```typescript
import { regressionDetector } from './monitoring';

// Start regression detection
await regressionDetector.start();

// Create baseline
const data = [
  { value: 450, timestamp: new Date() },
  { value: 425, timestamp: new Date() },
  // ... more data points
];

const baseline = regressionDetector.createBaseline('response_time', data, {
  environment: 'production',
  version: 'v1.2.3'
});

// Register deployment
const deployment = regressionDetector.registerDeployment({
  timestamp: new Date(),
  version: 'v1.2.4',
  environment: 'production',
  component: 'user-service',
  type: 'ROLLING',
  metadata: {
    initiatedBy: 'deployment-system',
    changeDescription: 'Performance optimizations'
  },
  baselinePeriod: {
    start: new Date(Date.now() - 60 * 60 * 1000),
    end: new Date()
  }
});

// Record metrics for regression detection
regressionDetector.recordMetric('response_time', 850);

// Get active regressions
const regressions = regressionDetector.getActiveRegressions();
regressions.forEach(regression => {
  console.log(`Regression detected in ${regression.metric}: ${regression.change.percentageChange}% change`);
});
```

## 🔧 Integrated Usage

### Quick Start

```typescript
import { startParlantMonitoring, ParlantPerformanceMonitoring } from './monitoring';

// Start with default configuration
const monitoring = await startParlantMonitoring();

// Or with custom configuration
const monitoring = await startParlantMonitoring({
  performance: {
    alertThresholds: {
      p95ResponseTime: 800, // 800ms threshold
      cacheHitRate: 0.9     // 90% hit rate
    }
  },
  cache: {
    targets: {
      L1: { hitRate: 0.95, maxAccessTime: 3 },
      L2: { hitRate: 0.90, maxAccessTime: 10 },
      L3: { hitRate: 0.85, maxAccessTime: 30 }
    }
  },
  alerting: {
    enableAutomatedResponse: true,
    escalation: {
      enabled: true,
      levels: [
        { level: 1, delayMinutes: 5, actions: ['NOTIFY_ONCALL'], recipients: ['team@company.com'] }
      ]
    }
  }
});

// Record function execution
monitoring.recordFunctionExecution({
  functionName: 'processPayment',
  startTime: performance.now(),
  endTime: performance.now() + 320,
  executionTime: 320,
  parlantTime: 55,
  overheadTime: 12,
  cached: false,
  cacheHit: false,
  success: true,
  parametersHash: 'payment-abc123',
  memoryDelta: 3.2,
  cpuUsage: 22.1
});

// Get comprehensive dashboard
const dashboard = monitoring.getPerformanceDashboard();
console.log('Performance Summary:', dashboard.summary);
console.log('Cache Analytics:', dashboard.cache);
console.log('Active Alerts:', dashboard.alerts.length);
```

### Function Decorator

```typescript
import { monitorParlantPerformance } from './monitoring';

class PaymentService {
  @monitorParlantPerformance({
    functionName: 'PaymentService.processPayment',
    enableCacheMonitoring: true,
    enableRegressionDetection: true
  })
  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    // Implementation automatically monitored
    return await this.executePayment(paymentData);
  }
}
```

### Health Monitoring

```typescript
// Check system health
const health = await monitoring.healthCheck();
console.log(`System Status: ${health.status}`);
console.log(`Active Components: ${Object.keys(health.components).length}`);
console.log(`Errors: ${health.overall.errors}, Warnings: ${health.overall.warnings}`);

// Component-specific access
const components = monitoring.getComponents();
const cacheStats = components.cacheAnalyzer.getCacheStats();
const activeRegressions = components.regressionDetector.getActiveRegressions();
```

## 📊 Configuration

### Performance Monitor Configuration

```typescript
interface PerformanceMonitorConfig {
  collectInterval: number;          // 5000ms - Metrics collection interval
  retentionPeriod: number;         // 24h - Data retention period
  alertThresholds: {
    p95ResponseTime: number;       // 1000ms - P95 response time threshold
    p99ResponseTime: number;       // 2000ms - P99 response time threshold
    functionOverhead: number;      // 10ms - Function overhead threshold
    parlantLatency: number;        // 200ms - PARLANT communication threshold
    cacheHitRate: number;          // 0.85 - Cache hit rate threshold
    memoryUsage: number;           // 1024MB - Memory usage threshold
    throughput: number;            // 1000 ops/sec - Throughput threshold
    errorRate: number;             // 0.01 - Error rate threshold
    cpuUsage: number;              // 0.8 - CPU usage threshold
    concurrentOps: number;         // 100 - Concurrent operations threshold
  };
  enableDetailedMetrics: boolean;   // true - Enable detailed metrics collection
  enableCacheMonitoring: boolean;   // true - Enable cache performance monitoring
  enableRegressionDetection: boolean; // true - Enable regression detection
  enableAutoOptimization: boolean;  // true - Enable automatic optimization
  bufferSize: number;              // 10000 - Metrics buffer size
}
```

### Cache Analyzer Configuration

```typescript
interface CacheAnalyzerConfig {
  analysisInterval: number;        // 30000ms - Analysis interval
  minSampleSize: number;          // 100 - Minimum sample size for analysis
  targets: {
    L1: { hitRate: number; maxAccessTime: number; maxMemoryUsage: number };
    L2: { hitRate: number; maxAccessTime: number; maxMemoryUsage: number };
    L3: { hitRate: number; maxAccessTime: number; maxMemoryUsage: number };
    overall: { hitRate: number; maxTotalMemory: number };
  };
  enableCacheWarming: boolean;     // true - Enable cache warming recommendations
  enableTTLOptimization: boolean;  // true - Enable TTL optimization
  enableMemoryOptimization: boolean; // true - Enable memory optimization
  analysisWindow: number;          // 3600000ms - Analysis window (1 hour)
}
```

### Alert Manager Configuration

```typescript
interface AlertManagerConfig {
  evaluationInterval: number;      // 5000ms - Alert evaluation interval
  aggregationWindow: number;       // 300000ms - Alert aggregation window
  maxAlertsPerWindow: number;      // 50 - Maximum alerts per window
  enableCorrelation: boolean;      // true - Enable alert correlation
  enablePredictive: boolean;       // false - Enable predictive alerting
  enableAutomatedResponse: boolean; // true - Enable automated responses
  retentionPeriod: number;         // 7 days - Alert retention period
  notifications: {
    email: { enabled: boolean; recipients: string[] };
    webhook: { enabled: boolean; endpoints: string[] };
    slack: { enabled: boolean; channels: Record<string, string> };
    sms: { enabled: boolean; recipients: string[] };
  };
  escalation: {
    enabled: boolean;
    levels: Array<{
      level: number;
      delayMinutes: number;
      actions: string[];
      recipients: string[];
    }>;
  };
}
```

## 🎯 Performance Targets and SLAs

### Response Time Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| P50 Response Time | <200ms | >300ms | >500ms |
| P95 Response Time | <1000ms | >1200ms | >1500ms |
| P99 Response Time | <2000ms | >2500ms | >3000ms |
| Function Overhead | <10ms | >15ms | >25ms |
| PARLANT Latency | <200ms | >300ms | >500ms |

### Cache Performance Targets

| Cache Level | Hit Rate Target | Access Time Target | Memory Efficiency |
|-------------|----------------|-------------------|-------------------|
| L1 (Memory) | >90% | <5ms | >0.8 hits/MB |
| L2 (Redis) | >85% | <15ms | >0.5 hits/MB |
| L3 (Database) | >80% | <50ms | >0.3 hits/MB |
| Overall | >85% | <20ms avg | >0.6 hits/MB |

### Throughput and Reliability Targets

| Metric | Target | Minimum Acceptable |
|--------|--------|--------------------|
| Operations/Second | 5000+ | 1000+ |
| Concurrent Operations | 100+ | 50+ |
| Error Rate | <1% | <2% |
| Availability | 99.95% | 99.9% |
| Recovery Time | <5 minutes | <15 minutes |

## 🔍 Monitoring Best Practices

### 1. Function Instrumentation

```typescript
// ✅ Good: Comprehensive monitoring
@monitorParlantPerformance({
  functionName: 'UserService.authenticateUser',
  enableCacheMonitoring: true,
  enableRegressionDetection: true
})
async authenticateUser(credentials: UserCredentials): Promise<AuthResult> {
  // Implementation
}

// ❌ Avoid: Missing context
async authenticateUser(credentials: UserCredentials): Promise<AuthResult> {
  // No monitoring
}
```

### 2. Cache Operation Tracking

```typescript
// ✅ Good: Detailed cache operation tracking
const cacheOperation: CacheOperation = {
  id: generateId(),
  level: 'L1',
  operation: 'GET',
  key: `user:${userId}:permissions`,
  timestamp: new Date(),
  duration: measureDuration(),
  success: true,
  hit: resultFound,
  dataSize: calculateSize(result),
  ttl: 300000,
  functionName: 'getUserPermissions',
  userId,
  sessionId: getCurrentSession(),
  context: { source: 'authentication' }
};

cacheAnalyzer.recordOperation(cacheOperation);
```

### 3. Baseline Management

```typescript
// ✅ Good: Regular baseline updates
// After deployment
const deployment = regressionDetector.registerDeployment({
  timestamp: new Date(),
  version: process.env.APP_VERSION,
  environment: process.env.NODE_ENV,
  component: 'user-service',
  type: 'ROLLING',
  metadata: {
    initiatedBy: 'ci-cd-system',
    changeDescription: 'Performance optimizations and bug fixes'
  },
  baselinePeriod: {
    start: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours before
    end: new Date()
  }
});

// Create post-deployment baseline
setTimeout(() => {
  // Allow system to stabilize
  const postData = collectRecentMetrics();
  regressionDetector.createBaseline('response_time', postData, {
    deployment: deployment.id,
    version: deployment.version
  });
}, 30 * 60 * 1000); // Wait 30 minutes
```

### 4. Alert Configuration

```typescript
// ✅ Good: Graduated alert thresholds
alertManager.addThreshold({
  id: 'response-time-warning',
  metricName: 'p95_response_time',
  type: 'STATIC',
  config: { value: 800 },
  operator: 'GT',
  severity: 'WARNING',
  evaluation: {
    minDuration: 60000,    // 1 minute
    interval: 15000,       // Check every 15 seconds
    consecutiveBreaches: 4  // 4 consecutive breaches
  },
  enabled: true
});

alertManager.addThreshold({
  id: 'response-time-critical',
  metricName: 'p95_response_time',
  type: 'STATIC',
  config: { value: 1200 },
  operator: 'GT',
  severity: 'CRITICAL',
  evaluation: {
    minDuration: 30000,    // 30 seconds
    interval: 5000,        // Check every 5 seconds
    consecutiveBreaches: 2  // 2 consecutive breaches
  },
  enabled: true
});
```

## 📈 Dashboard and Reporting

### Real-time Dashboard

```typescript
// Get comprehensive dashboard data
const dashboard = monitoring.getPerformanceDashboard();

// Performance Summary
console.log(`
Performance Summary:
- P95 Response Time: ${dashboard.summary?.p95}ms
- Throughput: ${dashboard.summary?.throughput} ops/sec
- Error Rate: ${(dashboard.summary?.errorRate * 100).toFixed(2)}%
- Cache Hit Rate: ${(dashboard.cache.overall.hitRate * 100).toFixed(1)}%
`);

// Active Issues
console.log(`
Active Issues:
- Critical Alerts: ${dashboard.alerts.filter(a => a.severity === 'CRITICAL').length}
- Active Regressions: ${dashboard.regressions.length}
- Cache Optimizations: ${dashboard.cache.optimizations.length}
`);
```

### Performance Reports

```typescript
// Generate performance report
const report = analyticsEngine.generateReport(24 * 60 * 60 * 1000); // Last 24 hours

console.log(`
Performance Report (Last 24 Hours):
- Total Operations: ${report.summary?.sampleCount}
- Average Response Time: ${report.summary?.mean}ms
- P95 Response Time: ${report.summary?.p95}ms
- Error Rate: ${(report.summary?.errorRate * 100).toFixed(2)}%
- Cache Efficiency: ${Object.values(report.cacheStats).map(s => (s.hitRate * 100).toFixed(1)).join('%, ')}%
- Recommendations: ${report.recommendations.length} items
`);
```

## 🚨 Troubleshooting

### Common Issues

#### 1. High Response Times

```typescript
// Check for performance regressions
const regressions = monitoring.getComponents().regressionDetector.getActiveRegressions();
const responseTimeRegressions = regressions.filter(r => r.metric.includes('response_time'));

if (responseTimeRegressions.length > 0) {
  console.log('Response time regressions detected:');
  responseTimeRegressions.forEach(regression => {
    console.log(`- ${regression.metric}: ${regression.change.percentageChange}% change`);
    console.log(`  Likely causes: ${regression.rootCause.likelyCauses.join(', ')}`);
  });
}

// Check cache performance
const cacheAnalytics = monitoring.getComponents().cacheAnalyzer.getCacheAnalytics();
if (cacheAnalytics.overall.hitRate < 0.8) {
  console.log('Low cache hit rate detected, checking optimizations...');
  const optimizations = monitoring.getComponents().cacheAnalyzer.getOptimizations();
  optimizations.forEach(opt => {
    console.log(`- ${opt.type}: ${opt.description}`);
  });
}
```

#### 2. Memory Issues

```typescript
// Check system metrics
const healthCheck = await monitoring.healthCheck();
const memoryIssues = healthCheck.components.performanceMonitor.metrics;

if (memoryIssues && memoryIssues.systemMetrics.memoryUsage > 80) {
  console.log('High memory usage detected');

  // Check for memory optimizations
  const cacheMemory = monitoring.getComponents().cacheAnalyzer.getCacheAnalytics();
  console.log(`Cache memory usage: ${cacheMemory.overall.totalMemory}MB`);

  // Get memory optimization recommendations
  const optimizations = cacheMemory.optimizations.filter(opt =>
    opt.type === 'MEMORY_OPTIMIZATION'
  );

  optimizations.forEach(opt => {
    console.log(`Memory optimization: ${opt.description}`);
  });
}
```

#### 3. Alert Fatigue

```typescript
// Check alert statistics
const alertStats = monitoring.getComponents().alertManager.getAlertStatistics();

if (alertStats.total > 100) { // Too many alerts in time window
  console.log('High alert volume detected, checking for correlation...');

  // Look for correlated alerts
  const activeAlerts = monitoring.getComponents().alertManager.getActiveAlerts();
  const correlatedAlerts = activeAlerts.filter(alert =>
    alert.correlation.relatedAlerts.length > 0
  );

  if (correlatedAlerts.length > 0) {
    console.log('Correlated alerts found - consider root cause analysis');
  }

  // Suggest suppression rules
  console.log('Consider implementing alert suppression rules for recurring patterns');
}
```

## 🔧 Advanced Configuration

### Custom Metrics

```typescript
// Add custom metric tracking
class CustomMetrics {
  @monitorParlantPerformance()
  async businessOperation(): Promise<void> {
    // Custom metric recording
    monitoring.getComponents().analyticsEngine.recordDataPoint(
      'business_metric',
      calculateBusinessValue(),
      { operation: 'revenue_calculation', timestamp: new Date() }
    );
  }
}
```

### Integration with External Systems

```typescript
// Prometheus integration
const monitoring = new ParlantPerformanceMonitoring({
  analytics: {
    // Enable external system integration
    enableExternalIntegration: true
  },
  alerting: {
    notifications: {
      webhook: {
        enabled: true,
        endpoints: [{
          url: 'https://prometheus-alertmanager/api/v1/alerts',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          severities: ['ERROR', 'CRITICAL']
        }]
      }
    }
  }
});
```

### Performance Budgets

```typescript
// Create performance budget
const budget = monitoring.getComponents().regressionDetector.createBudget({
  name: 'API Response Time Budget',
  metrics: {
    'p95_response_time': {
      target: 800,
      tolerance: 100,
      unit: 'ms',
      priority: 'HIGH'
    },
    'cache_hit_rate': {
      target: 0.9,
      tolerance: 0.05,
      unit: '%',
      priority: 'MEDIUM'
    }
  },
  scope: {
    environment: 'production',
    component: 'api-gateway'
  },
  enforcement: {
    enabled: true,
    blockOnViolation: false,
    warningThreshold: 0.8,
    criticalThreshold: 1.2
  },
  metadata: {
    owner: 'platform-team',
    description: 'API performance budget for production'
  }
});
```

## 📚 API Reference

For detailed API documentation, see the individual component files:

- [`performance-monitor.ts`](./performance-monitor.ts) - Core performance monitoring
- [`cache-analyzer.ts`](./cache-analyzer.ts) - Cache performance analysis
- [`alert-manager.ts`](./alert-manager.ts) - Alerting and notifications
- [`analytics-engine.ts`](./analytics-engine.ts) - Analytics and forecasting
- [`regression-detector.ts`](./regression-detector.ts) - Regression detection
- [`index.ts`](./index.ts) - Integrated monitoring system

## 🤝 Contributing

When extending the monitoring system:

1. Follow the established patterns for metric collection
2. Ensure proper error handling and logging
3. Add comprehensive tests for new features
4. Update documentation and examples
5. Consider performance impact of monitoring overhead
6. Follow the enterprise coding standards

## 📄 License

This monitoring system is part of the PARLANT Phase 1 implementation and follows the project's licensing terms.