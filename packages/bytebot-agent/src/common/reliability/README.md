# Reliability & Resilience Framework

## Overview

This module provides comprehensive reliability and resilience patterns for the Bytebot API, implementing enterprise-grade patterns according to the research report specifications:

- **Circuit Breaker**: 50% failure threshold, 60s timeout, 30s reset
- **Retry Logic**: 3 max attempts, 2x backoff multiplier, 1-30s delay range  
- **Graceful Shutdown**: 30s drain, 60s force, 10s grace period
- **Database Reliability**: Connection pooling and circuit breaker protection

## Components

### CircuitBreakerService

Provides fail-fast behavior for external dependencies with automatic recovery.

```typescript
import { CircuitBreakerService } from './services/circuit-breaker.service';

@Injectable()
export class MyService {
  constructor(private circuitBreaker: CircuitBreakerService) {}

  async callExternalService() {
    return this.circuitBreaker.execute(
      'external-api',
      () => this.httpClient.get('/api/data'),
      () => this.getCachedData() // Fallback function
    );
  }
}
```

### RetryService

Implements exponential backoff retry logic with jitter.

```typescript
import { RetryService } from './services/retry.service';

@Injectable() 
export class MyService {
  constructor(private retry: RetryService) {}

  async unreliableOperation() {
    return this.retry.executeWithRetry(
      () => this.makeApiCall(),
      RetryService.PresetConfigs.HTTP
    );
  }
}
```

### ResilienceInterceptor

Combines circuit breaker, retry, and timeout patterns for API endpoints.

```typescript
import { UseResilience } from './interceptors/resilience.interceptor';

@Controller('api')
export class MyController {
  
  @UseResilience({
    enableCircuitBreaker: true,
    enableRetry: true,
    timeoutMs: 10000,
    enableFallback: true,
    fallbackResponse: { message: 'Service temporarily unavailable' }
  })
  @Get('/data')
  async getData() {
    return this.dataService.fetchData();
  }
}
```

### ShutdownService

Manages graceful application shutdown with configurable timeouts.

```typescript
import { ShutdownService } from './services/shutdown.service';

@Injectable()
export class MyService implements OnModuleDestroy {
  constructor(private shutdown: ShutdownService) {
    // Register cleanup tasks
    this.shutdown.registerCleanupTask('cleanup-connections', async () => {
      await this.closeConnections();
    });
  }

  async onModuleDestroy() {
    // Shutdown service handles this automatically
  }
}
```

## Configuration

All services support configuration via environment variables:

```env
# Circuit Breaker Configuration
CIRCUIT_BREAKER_FAILURE_THRESHOLD=0.5
CIRCUIT_BREAKER_TIMEOUT=60000
CIRCUIT_BREAKER_RESET_TIMEOUT=30000

# Retry Configuration  
RETRY_MAX_ATTEMPTS=3
RETRY_BASE_DELAY=1000
RETRY_MAX_DELAY=30000
RETRY_BACKOFF_MULTIPLIER=2

# Shutdown Configuration
SHUTDOWN_DRAIN_TIMEOUT=30000
SHUTDOWN_FORCE_TIMEOUT=60000
SHUTDOWN_HEALTH_GRACE_PERIOD=10000
```

## Preset Configurations

### RetryService Presets

```typescript
// Fast retry for lightweight operations
RetryService.PresetConfigs.FAST

// Standard retry (research report default)
RetryService.PresetConfigs.STANDARD  

// Database operations
RetryService.PresetConfigs.DATABASE

// HTTP requests
RetryService.PresetConfigs.HTTP

// Slow/heavy operations  
RetryService.PresetConfigs.SLOW
```

## Monitoring & Metrics

All services provide comprehensive metrics:

```typescript
// Circuit breaker metrics
const metrics = circuitBreakerService.getAllCircuitMetrics();

// Retry metrics
const retryMetrics = retryService.getAllRetryMetrics();

// Resilience metrics  
const resilienceMetrics = resilienceInterceptor.getAllResilienceMetrics();

// Shutdown metrics
const shutdownMetrics = shutdownService.getShutdownMetrics();
```

## Database Reliability

Enhanced database service with reliability patterns:

```typescript
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MyService {
  constructor(private db: DatabaseService) {}

  async reliableQuery() {
    // Full reliability (circuit breaker + retry)
    return this.db.executeWithReliability(
      () => this.db.getPrismaClient().user.findMany()
    );

    // Circuit breaker only
    return this.db.executeWithCircuitBreaker(
      () => this.db.getPrismaClient().user.findMany(),
      'user-queries'
    );

    // Retry only
    return this.db.executeWithRetry(
      () => this.db.getPrismaClient().user.findMany()
    );
  }
}
```

## Integration with Application

The ReliabilityModule is automatically imported globally in AppModule, making all services available throughout the application.

## Best Practices

1. **Circuit Breaker Names**: Use descriptive, unique names for different external dependencies
2. **Fallback Functions**: Always provide meaningful fallbacks for circuit breakers
3. **Retry Conditions**: Customize retry conditions for specific error types
4. **Cleanup Tasks**: Register all resources that need cleanup during shutdown
5. **Monitoring**: Use the provided metrics for comprehensive observability

## Production Considerations

- All patterns are optimized for container environments
- Kubernetes integration for proper health checks
- Comprehensive logging and metrics collection
- Memory-efficient with automatic cleanup
- Thread-safe implementations
- Zero-downtime deployment support