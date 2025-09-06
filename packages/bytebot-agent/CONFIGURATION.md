# Bytebot Agent Configuration Management

Enterprise-grade configuration management system for the Bytebot API Platform with secure secrets handling, environment separation, and deployment-ready features.

## Overview

The configuration system provides:

- **Type-safe configuration** with comprehensive validation
- **Secrets management** with Kubernetes integration
- **Environment-specific settings** for development, staging, and production
- **Feature flags** for gradual rollout and A/B testing
- **Performance monitoring** and access metrics
- **Hot-reloading capabilities** for development

## Quick Start

### Development Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Configure required settings:
   ```bash
   # Database (required)
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bytebotdb
   
   # Security (required)
   JWT_SECRET=your-secure-jwt-secret-at-least-32-characters-long
   ENCRYPTION_KEY=your-secure-encryption-key-at-least-32-chars
   
   # LLM API Keys (at least one required)
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   OPENAI_API_KEY=sk-your-key-here
   GEMINI_API_KEY=your-gemini-key-here
   ```

3. Start the application:
   ```bash
   npm run start:dev
   ```

## Configuration Structure

### Core Configuration

```typescript
interface AppConfig {
  nodeEnv: 'development' | 'staging' | 'production' | 'test';
  port: number;
  database: DatabaseConfig;
  api: ApiConfig;
  security: SecurityConfig;
  llmApiKeys: LlmApiKeysConfig;
  services: ServicesConfig;
  features: FeaturesConfig;
  monitoring: MonitoringConfig;
  // ... additional sections
}
```

### Environment-Specific Defaults

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| `LOG_LEVEL` | debug | info | warn |
| `LOG_FORMAT` | text | json | json |
| `ENABLE_SWAGGER` | true | true | false |
| `DEBUG_MODE` | true | false | false |
| `ENABLE_AUTHENTICATION` | false | true | true |
| `ENABLE_RATE_LIMITING` | false | true | true |
| `ENABLE_CIRCUIT_BREAKER` | false | false | true |
| `ENABLE_DISTRIBUTED_TRACING` | false | false | true |

## Configuration Sources

### 1. Environment Variables

Standard approach for local development and simple deployments:

```bash
export NODE_ENV=production
export DATABASE_URL=postgresql://user:pass@db:5432/bytebotdb
export JWT_SECRET=your-secure-jwt-secret
```

### 2. .env Files

For local development (automatically loaded):

- `.env.local` (highest priority)
- `.env.${NODE_ENV}` (environment-specific)  
- `.env` (default)

### 3. Kubernetes ConfigMaps and Secrets

For production deployments:

```yaml
# ConfigMap for non-sensitive data
apiVersion: v1
kind: ConfigMap
metadata:
  name: bytebot-agent-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "warn"
  ENABLE_METRICS_COLLECTION: "true"

# Secret for sensitive data  
apiVersion: v1
kind: Secret
metadata:
  name: bytebot-agent-secrets
type: Opaque
data:
  DATABASE_URL: <base64-encoded-url>
  JWT_SECRET: <base64-encoded-secret>
```

## Secrets Management

### Development
Secrets are loaded from environment variables or .env files.

### Production
Secrets are automatically loaded from:
1. **Kubernetes secrets** (mounted at `/etc/secrets/`)
2. **Environment variables** (fallback)

### Supported Secret Types

- **JWT_SECRET**: Token signing key (minimum 32 chars, 64+ for production)
- **ENCRYPTION_KEY**: Data encryption key (minimum 32 chars, 64+ for production)
- **LLM API Keys**: Anthropic, OpenAI, Gemini API keys
- **DATABASE_URL**: Complete database connection string

## Feature Flags

Control application features dynamically:

```typescript
// Check if a feature is enabled
if (configService.isFeatureEnabled('authentication')) {
  // Enable authentication middleware
}

// Get all feature states
const features = configService.getFeaturesConfig();
```

### Available Features

| Feature | Description | Default (Dev) | Default (Prod) |
|---------|-------------|---------------|----------------|
| `authentication` | JWT authentication system | false | true |
| `rateLimiting` | API rate limiting | false | true |
| `metricsCollection` | Prometheus metrics | false | true |
| `healthChecks` | Health check endpoints | true | true |
| `circuitBreaker` | Circuit breaker pattern | false | true |

## Validation

All configuration is validated on startup using Joi schemas:

### Validation Rules

- **Environment**: Must be development/staging/production/test
- **Port**: Valid port number (1-65535)  
- **URLs**: Valid URI format
- **Secrets**: Minimum length requirements
- **Feature Flags**: Boolean values
- **Numeric Values**: Range validation

### Production-Specific Rules

- JWT secrets must be 64+ characters
- Encryption keys must be 64+ characters  
- At least one LLM API key required
- Debug features disabled

## Configuration Service Usage

### Accessing Configuration

```typescript
import { BytebotConfigService } from './config/config.service';

@Injectable()
export class MyService {
  constructor(private readonly config: BytebotConfigService) {}

  async someMethod() {
    // Get database configuration
    const dbConfig = this.config.getDatabaseConfig();
    
    // Get JWT secret securely
    const jwtSecret = await this.config.getJwtSecret();
    
    // Check feature flag
    const isAuthEnabled = this.config.isFeatureEnabled('authentication');
    
    // Get LLM API key
    const anthropicKey = await this.config.getLlmApiKey('anthropic');
  }
}
```

### Available Methods

```typescript
// Configuration sections
getAppConfig(): AppConfig
getDatabaseConfig(): DatabaseConfig
getApiConfig(): ApiConfig
getSecurityConfig(): SecurityConfig (without secrets)
getFeaturesConfig(): FeaturesConfig
getMonitoringConfig(): MonitoringConfig

// Secure secret access
getJwtSecret(): Promise<string>
getEncryptionKey(): Promise<string>
getLlmApiKey(provider): Promise<string | null>

// Feature flags
isFeatureEnabled(featureName): boolean

// Monitoring
getConfigAccessMetrics(): Array<{key, count, lastAccess}>
```

## Kubernetes Deployment

### Prerequisites

1. Create namespace:
   ```bash
   kubectl create namespace bytebot-production
   ```

2. Apply configurations:
   ```bash
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/secrets.yaml
   kubectl apply -f k8s/deployment.yaml
   ```

### Environment-Specific Deployments

The system supports multiple environments:

```bash
# Production
kubectl apply -f k8s/configmap.yaml -n bytebot-production

# Staging  
kubectl apply -f k8s/configmap.yaml -n bytebot-staging
```

### Secret Generation

Use the included secret generator job:

```bash
kubectl apply -f k8s/secrets.yaml
kubectl wait --for=condition=complete job/bytebot-secret-generator
```

## Monitoring and Debugging

### Configuration Access Metrics

Monitor which configuration values are accessed:

```typescript
const metrics = configService.getConfigAccessMetrics();
// Returns: [{key: 'app.features.authentication', count: 45, lastAccess: Date}]
```

### Configuration Summary

View configuration status without exposing secrets:

```bash
# Check application logs for configuration summary
kubectl logs deployment/bytebot-agent | grep "Configuration Summary"
```

### Health Checks

The configuration system includes health validation:

- Database connectivity check
- Required secrets validation  
- Feature flag consistency
- Service dependency validation

## Security Best Practices

### Development
- Use different secrets than production
- Never commit .env files to version control
- Use minimum required secret lengths (32 chars)

### Staging
- Use production-like configuration
- Separate secrets from production
- Enable most security features for testing

### Production  
- Use Kubernetes secrets exclusively
- Enable all security features
- Use 64+ character secrets
- Disable debug features
- Enable distributed tracing and monitoring

## Troubleshooting

### Common Issues

1. **Configuration validation failed**
   - Check environment variable names and values
   - Ensure required secrets are present
   - Verify JWT_SECRET length (32+ chars, 64+ in production)

2. **Secrets not loading**  
   - Verify Kubernetes secret exists and is mounted
   - Check secret volume mount path (`/etc/secrets/`)
   - Ensure proper RBAC permissions

3. **Feature flags not working**
   - Check boolean string values ("true"/"false")
   - Verify environment-specific defaults
   - Clear configuration cache if needed

### Debug Logging

Enable debug logging to troubleshoot configuration issues:

```bash
export LOG_LEVEL=debug
export DEBUG_MODE=true
```

### Configuration Validation

Test configuration manually:

```typescript
import { validateConfig } from './config/validation.schema';

const result = validateConfig(process.env, 'production');
if (result.error) {
  console.error('Validation errors:', result.error.details);
}
```

## Migration Guide

### From Basic Environment Variables

1. Install Joi dependency:
   ```bash
   npm install joi @types/joi
   ```

2. Replace direct process.env usage:
   ```typescript
   // Before
   const port = process.env.PORT || 9991;
   
   // After  
   const port = configService.getAppConfig().port;
   ```

3. Add configuration module:
   ```typescript
   @Module({
     imports: [ConfigurationModule],
     // ...
   })
   ```

### Environment Variable Mapping

| Old Variable | New Variable | Notes |
|--------------|--------------|--------|
| `PORT` | `PORT` | Same |
| `DATABASE_URL` | `DATABASE_URL` | Same |
| `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` | Same |
| N/A | `JWT_SECRET` | New, required |
| N/A | `ENCRYPTION_KEY` | New, required |
| N/A | `ENABLE_*` | New feature flags |

## Contributing

When adding new configuration options:

1. Add to validation schema in `validation.schema.ts`
2. Add to TypeScript interface in `configuration.ts`  
3. Add to environment-specific defaults
4. Update documentation and examples
5. Add tests for new configuration options

## Support

For configuration-related issues:

1. Check the application logs for configuration validation errors
2. Verify environment variables and secrets
3. Test configuration in development environment first
4. Use debug logging for detailed troubleshooting
5. Check Kubernetes secret and configmap status