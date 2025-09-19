# PARLANT Validation Integration Layer

## Overview

The PARLANT Validation Integration Layer provides a comprehensive conversational validation interface for database functions, enabling real-time approval and oversight of database operations through natural language interaction with PARLANT AI.

## Features

### 🚀 Core Capabilities
- **Real-time WebSocket Communication**: Bidirectional streaming with automatic reconnection and load balancing
- **Intelligent Conversation Context**: Natural language descriptions generated from function parameters
- **Multi-level Caching**: 85%+ hit rates with L1 (memory), L2 (Redis), L3 (database) tiers
- **Emergency Bypass Mechanisms**: Critical operation handling with comprehensive audit trails
- **Sub-1000ms Response Times**: Performance optimization with circuit breaker patterns

### 🏗️ Architecture Components

#### 1. WebSocket Communication Layer
- **ParlantWebSocketClient**: Enterprise-grade WebSocket client with automatic reconnection
- **ParlantWebSocketManager**: Connection pool management with load balancing and failover

#### 2. Conversation Context Builder
- **ConversationContextBuilder**: Transforms technical parameters into natural language
- **Risk Assessment Engine**: Intelligent risk analysis and mitigation strategy generation

#### 3. Validation Bridge
- **ParlantValidationBridge**: Main orchestration service coordinating all components
- **Circuit Breaker Pattern**: Resilience with automatic fallback mechanisms

#### 4. Intelligent Caching
- **Multi-tier Cache Strategy**: Memory, Redis, and database caching layers
- **Cache Hit Optimization**: Adaptive algorithms targeting 85%+ hit rates

#### 5. Emergency Bypass
- **Critical Operation Support**: Emergency protocols for time-sensitive operations
- **Comprehensive Audit Trail**: Full compliance and security logging

## Installation

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

## Configuration

### Environment Variables

```bash
# Core Settings
PARLANT_VALIDATION_ENABLED=true
PARLANT_DEFAULT_TIMEOUT=5000
PARLANT_WEBSOCKET_URL=ws://localhost:8080/parlant

# WebSocket Configuration
PARLANT_WEBSOCKET_SERVERS=ws://server1:8080/parlant,ws://server2:8080/parlant
PARLANT_POOL_MIN_SIZE=2
PARLANT_POOL_MAX_SIZE=10
PARLANT_LOAD_BALANCE=least_connections

# Caching Configuration
PARLANT_CACHE_ENABLED=true
PARLANT_CACHE_TYPE=hybrid
PARLANT_CACHE_HIT_TARGET=85
PARLANT_L1_CACHE_TTL=300000
PARLANT_L2_CACHE_TTL=3600000

# Performance Settings
PARLANT_P95_TARGET=1000
PARLANT_CIRCUIT_BREAKER_ENABLED=true
PARLANT_CB_FAILURE_THRESHOLD=5

# Security Settings
PARLANT_AUTH_TOKEN=your_parlant_auth_token
PARLANT_DEFAULT_SECURITY_LEVEL=medium
PARLANT_SANITIZE_PARAMS=true

# Bypass Configuration
PARLANT_BYPASS_ENABLED=true
PARLANT_BYPASS_MAX_DURATION=3600000
```

## Usage

### Basic Integration

```typescript
import { ParlantValidationModule } from '@shared/parlant/validation';

@Module({
  imports: [
    ParlantValidationModule.forRoot({
      global: true,
    }),
  ],
})
export class AppModule {}
```

### Service Usage

```typescript
import { ParlantValidationBridge } from '@shared/parlant/validation';

@Injectable()
export class DatabaseService {
  constructor(
    private readonly validationBridge: ParlantValidationBridge,
  ) {}

  async deleteUser(userId: string, userContext: UserValidationContext): Promise<void> {
    // Request validation from PARLANT
    const validation = await this.validationBridge.validateOperation(
      'deleteUser',
      'user-service',
      DatabaseOperationType.DELETE,
      { userId },
      userContext,
      SecurityLevel._HIGH,
      10000 // 10 second timeout
    );

    if (validation.decision === ValidationDecision.APPROVE) {
      // Execute the operation
      await this.userRepository.delete(userId);
    } else {
      throw new ValidationError(`Operation denied: ${validation.reasoning}`);
    }
  }
}
```

### Advanced Configuration

```typescript
import { ParlantValidationModuleFactory } from '@shared/parlant/validation';

@Module({
  imports: [
    ParlantValidationModuleFactory.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        global: true,
        configOverrides: {
          websocket: {
            serverUrls: configService.get('CUSTOM_PARLANT_SERVERS').split(','),
            pool: {
              minSize: 5,
              maxSize: 20,
            },
          },
          performance: {
            p95TargetMs: 500, // Stricter target
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class CustomAppModule {}
```

## API Reference

### ParlantValidationBridge

The main service for requesting validation from PARLANT.

#### Methods

##### `validateOperation()`

```typescript
async validateOperation(
  functionName: string,
  packageName: string,
  operationType: DatabaseOperationType,
  parameters: Record<string, unknown>,
  userContext: UserValidationContext,
  securityLevel?: SecurityLevel,
  timeoutMs?: number
): Promise<ValidationResponse>
```

**Parameters:**
- `functionName`: Name of the function being validated
- `packageName`: Package/service name for context
- `operationType`: Type of database operation (READ, WRITE, DELETE, etc.)
- `parameters`: Function parameters for context building
- `userContext`: User context for authorization
- `securityLevel`: Required security level (optional, defaults to MEDIUM)
- `timeoutMs`: Request timeout (optional, uses default from config)

**Returns:**
- `ValidationResponse`: Contains decision, reasoning, confidence, and execution context

### ValidationResponse

```typescript
interface ValidationResponse {
  requestId: string;
  decision: ValidationDecision;
  conversationId: string;
  reasoning: string;
  confidence: number;
  executionContext?: ExecutionContext;
  timestamp: Date;
  processingTimeMs: number;
  cacheInfo: CacheMetadata;
  metadata: ValidationMetadata;
}
```

### ValidationDecision

```typescript
enum ValidationDecision {
  APPROVE = 'approve',
  DENY = 'deny',
  MODIFY = 'modify',
  REQUIRE_CONFIRMATION = 'require_confirmation',
  ESCALATE = 'escalate',
  BYPASS = 'bypass',
}
```

## Performance Metrics

### Target Performance
- **P95 Response Time**: < 1000ms
- **P99 Response Time**: < 2000ms
- **Cache Hit Rate**: > 85%
- **Error Rate**: < 5%
- **Uptime**: > 99.9%

### Monitoring

```typescript
// Get current metrics
const metrics = validationBridge.getValidationMetrics();

// Subscribe to metrics updates
validationBridge.on('metricsCollected', (metrics) => {
  console.log('Current metrics:', metrics);
});
```

## Error Handling

### Error Types

```typescript
// Base error for validation layer
ValidationLayerError

// Specific error types
ConversationContextError
CacheOptimizationError
BypassExecutionError
```

### Error Handling Patterns

```typescript
try {
  const validation = await validationBridge.validateOperation(/* ... */);
} catch (error) {
  if (error instanceof ValidationLayerError) {
    // Handle validation-specific errors
    if (error.code === 'CIRCUIT_BREAKER_OPEN') {
      // Use emergency bypass or retry later
    } else if (error.code === 'TIMEOUT_ERROR') {
      // Handle timeout with appropriate user feedback
    }
  }
  throw error;
}
```

## Health Checks

```typescript
import { ParlantValidationHealthIndicator } from '@shared/parlant/validation';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly parlantHealth: ParlantValidationHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.parlantHealth.isHealthy('parlant-validation'),
    ]);
  }
}
```

## Testing

### Unit Testing

```typescript
describe('ParlantValidationBridge', () => {
  let service: ParlantValidationBridge;
  let mockWebSocketManager: jest.Mocked<ParlantWebSocketManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParlantValidationBridge,
        {
          provide: ParlantWebSocketManager,
          useValue: mockWebSocketManager,
        },
      ],
    }).compile();

    service = module.get<ParlantValidationBridge>(ParlantValidationBridge);
  });

  it('should validate operations successfully', async () => {
    // Test implementation
  });
});
```

### Integration Testing

```typescript
describe('PARLANT Validation Integration', () => {
  let app: INestApplication;
  let validationBridge: ParlantValidationBridge;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ParlantValidationModule.forRoot({ global: true })],
    }).compile();

    app = moduleFixture.createNestApplication();
    validationBridge = moduleFixture.get<ParlantValidationBridge>(ParlantValidationBridge);
    await app.init();
  });

  it('should handle end-to-end validation workflow', async () => {
    const validation = await validationBridge.validateOperation(
      'testFunction',
      'test-package',
      DatabaseOperationType.READ,
      { testParam: 'value' },
      mockUserContext
    );

    expect(validation.decision).toBeDefined();
    expect(validation.processingTimeMs).toBeLessThan(1000);
  });
});
```

## Troubleshooting

### Common Issues

#### Connection Issues
```bash
# Check WebSocket connectivity
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" http://localhost:8080/parlant
```

#### Performance Issues
```typescript
// Enable detailed logging
PARLANT_DETAILED_LOGGING=true

// Monitor metrics
const status = validationBridge.getBridgeStatus();
console.log('Active workflows:', status.activeWorkflows);
console.log('Cache hit rate:', status.metrics.cacheHitRate);
```

#### Cache Issues
```bash
# Check cache configuration
PARLANT_CACHE_TYPE=memory  # For testing
PARLANT_L1_CACHE_ENABLED=true
```

### Debugging

```typescript
// Enable debug mode in development
const config = {
  monitoring: {
    detailedLogging: true,
  },
  security: {
    sanitization: {
      enableParameterSanitization: false, // For debugging
    },
  },
};
```

## Contributing

### Development Setup

```bash
# Clone and install
git clone <repository>
cd parlant-validation
npm install

# Run tests
npm test

# Run linting
npm run lint

# Build
npm run build
```

### Code Standards

- Follow TypeScript strict mode
- Comprehensive error handling
- Performance monitoring
- Security considerations
- Comprehensive testing

## Security Considerations

### Data Sanitization
- Automatic PII detection and redaction
- Configurable sensitive data patterns
- Parameter sanitization before transmission

### Authentication
- JWT token-based authentication
- Session management with configurable timeouts
- Role-based access control integration

### Audit Trail
- Comprehensive operation logging
- Compliance-ready audit trails
- Configurable retention policies

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting guide above
- Review configuration documentation

---

**Version**: 1.0.0
**Author**: AIgent Integration Team
**Last Updated**: September 19, 2025