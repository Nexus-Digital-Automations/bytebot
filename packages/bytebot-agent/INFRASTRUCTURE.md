# Bytebot Agent Infrastructure & Configuration Management

## Overview

The Bytebot Agent platform implements enterprise-grade infrastructure and configuration management following the **Phase 1: Bytebot API Hardening** requirements. This implementation provides secure, scalable, and maintainable configuration management with comprehensive secrets handling, monitoring, and deployment automation.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Configuration Management Layer                │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│   Config        │    Secrets      │   Hot Reload    │  Schema   │
│   Service       │    Service      │    Service      │Validation │
├─────────────────┼─────────────────┼─────────────────┼───────────┤
│                 │                 │                 │           │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌───────┐ │
│ │Environment  │ │ │ K8s Secrets │ │ │File Watcher │ │ │Schema │ │
│ │Configs      │ │ │   Loader    │ │ │  Service    │ │ │Validator│ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │ └───────┘ │
│                 │                 │                 │           │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌───────┐ │
│ │Type Safety  │ │ │ Encryption  │ │ │Debounced    │ │ │Error  │ │
│ │  Layer      │ │ │   Service   │ │ │ Reloads     │ │ │Handler│ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │ └───────┘ │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Integration Layer                 │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│   ConfigMaps    │    Secrets      │   Deployments  │   RBAC    │
│                 │                 │                 │           │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌───────┐ │
│ │Application  │ │ │   JWT &     │ │ │Health Checks│ │ │Service│ │
│ │Configuration│ │ │ Encryption  │ │ │   Probes    │ │ │Account│ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │ └───────┘ │
│                 │                 │                 │           │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌───────┐ │
│ │Feature Flags│ │ │LLM API Keys │ │ │Volume Mounts│ │ │Cluster│ │
│ │& Settings   │ │ │& Credentials│ │ │& Security   │ │ │ Role  │ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │ └───────┘ │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
```

## 🔧 Implementation Components

### 1. Configuration Service (`src/config/configuration.ts`)
- **Type-safe configuration access** with comprehensive validation
- **Environment-specific defaults** (development, staging, production)
- **Performance monitoring** for configuration access patterns
- **Structured logging** with configuration summaries (secrets masked)

### 2. Enhanced Config Service (`src/config/config.service.ts`)
- **Multi-source secrets loading** (Kubernetes secrets, environment variables)
- **Secrets caching and performance optimization**
- **Configuration access metrics** for monitoring
- **Critical configuration validation** on startup

### 3. Secrets Management Service (`src/config/secrets.service.ts`)
- **Enterprise-grade secrets management** with rotation support
- **Encrypted secrets storage** with AES-256-GCM encryption
- **Hot-reloading capabilities** for secrets updates
- **Health monitoring** and expiry tracking
- **Multi-source fallback** (Kubernetes → Environment → External)

### 4. Configuration Schema Validation (`src/config/configuration.schema.ts`)
- **JSON Schema validation** with detailed error reporting
- **Environment-specific validation rules**
- **Production security enforcement** (64+ char secrets, etc.)
- **Configuration migration support** for version upgrades

### 5. Hot-Reload Service (`src/config/hot-reload.service.ts`)
- **Real-time configuration updates** without service restart
- **File system watching** for Kubernetes ConfigMaps and Secrets
- **Debounced reloading** to prevent rapid successive updates
- **Automatic rollback** on configuration failures
- **Configuration backup and history** management

### 6. Kubernetes Integration
- **Comprehensive Helm charts** with production-ready templates
- **ConfigMaps and Secrets management** with proper security
- **Health check probes** (liveness, readiness, startup)
- **RBAC configuration** with least-privilege access
- **Security contexts** with non-root user and read-only filesystem

## 📁 File Structure

```
src/config/
├── configuration.ts           # Main configuration loader and types
├── config.service.ts         # Enhanced configuration service
├── config.module.ts          # NestJS configuration module
├── secrets.service.ts        # Enterprise secrets management
├── hot-reload.service.ts     # Configuration hot-reloading
├── configuration.schema.ts   # JSON Schema validation
└── validation.schema.ts      # Joi validation schemas

helm/charts/bytebot-agent/
├── templates/
│   ├── configmap.yaml        # ConfigMap for non-sensitive config
│   ├── secret.yaml          # Comprehensive secrets management
│   ├── deployment.yaml      # Enhanced deployment with probes
│   ├── serviceaccount.yaml  # RBAC configuration
│   └── service.yaml         # Service definition
├── values.yaml              # Default configuration values
└── values-production.yaml   # Production-specific configuration

config/
├── development.yaml         # Development environment config
├── staging.yaml            # Staging environment config
└── production.yaml         # Production environment config
```

## 🚀 Deployment Guide

### Development Environment

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
export NODE_ENV=development
export DATABASE_URL="postgresql://user:password@localhost:5432/bytebot_dev"
export JWT_SECRET="your-development-jwt-secret-min-32-chars"
export ENCRYPTION_KEY="your-development-encryption-key-min-32-chars"

# 3. Start the application
npm run start:dev
```

### Production Kubernetes Deployment

```bash
# 1. Create namespace
kubectl create namespace bytebot-production

# 2. Create secrets (replace with actual values)
kubectl create secret generic bytebot-secrets \
  --from-literal=jwt-secret="your-production-jwt-secret-64-chars-minimum" \
  --from-literal=encryption-key="your-production-encryption-key-64-chars-minimum" \
  --from-literal=database-url="postgresql://user:password@db:5432/bytebot" \
  -n bytebot-production

# 3. Create LLM API secrets
kubectl create secret generic bytebot-llm-secrets \
  --from-literal=anthropic-api-key="sk-ant-your-key" \
  --from-literal=openai-api-key="sk-your-key" \
  --from-literal=gemini-api-key="your-gemini-key" \
  -n bytebot-production

# 4. Deploy using Helm
helm install bytebot-agent ./helm/charts/bytebot-agent \
  --namespace bytebot-production \
  --values ./helm/charts/bytebot-agent/values-production.yaml \
  --set global.environment=production \
  --set secrets.jwtSecret="" \
  --set secrets.encryptionKey="" \
  --set apiKeys.anthropic.useExisting=true \
  --set apiKeys.anthropic.secretName=bytebot-llm-secrets
```

## 🔐 Security Features

### 1. Secrets Management
- **Kubernetes Secrets integration** with automatic mounting
- **AES-256-GCM encryption** for sensitive data
- **Secrets rotation** with configurable intervals
- **Multi-source fallback** for high availability
- **Access logging and monitoring**

### 2. Configuration Validation
- **Schema-based validation** with detailed error messages
- **Environment-specific security rules**
- **Production hardening** (longer secret lengths, disabled debug features)
- **Input sanitization** and type safety

### 3. Security Contexts
```yaml
# Pod Security Context
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000

# Container Security Context  
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop: ["ALL"]
```

### 4. RBAC Configuration
- **Least-privilege access** to Kubernetes resources
- **Separate cluster and namespace roles**
- **Service account with minimal permissions**
- **Audit logging** for security operations

## 📊 Monitoring & Observability

### 1. Configuration Metrics
- **Access patterns** and frequency monitoring
- **Reload success/failure rates**
- **Configuration validation metrics**
- **Secrets health and expiry tracking**

### 2. Health Checks
```yaml
# Kubernetes Health Probes
livenessProbe:
  httpGet:
    path: /health/live
    port: 9991
  initialDelaySeconds: 30
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /health/ready
    port: 9991
  initialDelaySeconds: 10
  periodSeconds: 10

startupProbe:
  httpGet:
    path: /health/startup
    port: 9991
  failureThreshold: 30
  periodSeconds: 10
```

### 3. Structured Logging
```typescript
// Configuration access logging
this.logger.log('Configuration loaded successfully', {
  environment: config.nodeEnv,
  featuresEnabled: Object.entries(config.features)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature),
  loadTimeMs: Date.now() - startTime,
});
```

## 🔄 Hot-Reloading

### Configuration Hot-Reload Process
1. **File System Watching** - Monitor `/etc/config` and `/etc/secrets`
2. **Change Detection** - Debounced file change events
3. **Validation** - Validate new configuration before applying
4. **Backup Creation** - Create rollback point
5. **Application** - Apply new configuration
6. **Rollback** - Automatic rollback on failure

### Triggering Manual Reload
```typescript
// Via service method
await configHotReloadService.triggerReload('manual');

// Via event emission
configHotReloadService.emit('configurationReloadRequired');
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Configuration Validation Failures
```bash
# Check configuration validation
kubectl logs deployment/bytebot-agent -n bytebot-production | grep "Configuration validation failed"

# Common fixes:
# - Ensure JWT_SECRET is at least 64 characters in production
# - Verify DATABASE_URL format is correct
# - Check that at least one LLM API key is configured
```

#### 2. Secrets Loading Issues
```bash
# Check secrets mounting
kubectl describe pod <pod-name> -n bytebot-production

# Verify secret exists
kubectl get secrets -n bytebot-production

# Check secret contents (base64 encoded)
kubectl get secret bytebot-secrets -o yaml -n bytebot-production
```

#### 3. Hot-Reload Not Working
```bash
# Check hot-reload service status
kubectl exec deployment/bytebot-agent -n bytebot-production -- \
  curl http://localhost:9991/health/config

# Verify file watchers
kubectl logs deployment/bytebot-agent -n bytebot-production | grep "Setup.*watcher"
```

### Debug Configuration

```typescript
// Enable debug logging
LOG_LEVEL=debug

// Enable configuration debugging
DEBUG_MODE=true
ENABLE_CONFIG_HOT_RELOAD=true
CONFIG_RELOAD_DEBOUNCE_MS=1000

// Check configuration access metrics
const metrics = configService.getConfigAccessMetrics();
console.log('Configuration access patterns:', metrics);
```

## 🔄 Configuration Updates

### Updating ConfigMaps
```bash
# Update ConfigMap
kubectl patch configmap bytebot-agent-config -n bytebot-production \
  --patch '{"data":{"LOG_LEVEL":"info"}}'

# Configuration will auto-reload within 5 seconds (default debounce)
```

### Updating Secrets
```bash
# Update secret
kubectl patch secret bytebot-secrets -n bytebot-production \
  --patch '{"data":{"jwt-secret":"'$(echo -n "new-secret" | base64)'"}}'

# Secrets will auto-reload and be re-encrypted
```

## 📈 Performance Considerations

### 1. Configuration Caching
- **Secrets caching** with configurable TTL
- **Configuration access metrics** for optimization
- **Lazy loading** of non-critical configuration

### 2. Resource Optimization
```yaml
resources:
  requests:
    memory: "2Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "2000m"
```

### 3. Scaling Configuration
```yaml
# Horizontal Pod Autoscaler
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

## 🧪 Testing

### Unit Tests
```bash
# Run configuration tests
npm run test -- --testPathPattern=config

# Test specific service
npm run test -- config.service.spec.ts
```

### Integration Tests
```bash
# Test Kubernetes integration
helm test bytebot-agent --namespace bytebot-production

# Test configuration hot-reload
kubectl exec deployment/bytebot-agent -n bytebot-production -- \
  node scripts/test-config-reload.js
```

## 📝 Migration Guide

### Upgrading from v1.0 to v1.1
1. **Update Helm chart** to include new ConfigMap templates
2. **Migrate environment variables** to ConfigMap structure
3. **Enable hot-reloading** in production configuration
4. **Update RBAC permissions** for enhanced secret access

### Configuration Schema Changes
The service automatically handles configuration migrations using the migration system in `configuration.schema.ts`.

---

## 🏆 Production Readiness Checklist

- ✅ **Secrets Management**: Kubernetes secrets integration with encryption
- ✅ **Configuration Validation**: Schema validation with environment-specific rules  
- ✅ **Hot-Reloading**: Real-time configuration updates without restart
- ✅ **Health Checks**: Comprehensive liveness, readiness, and startup probes
- ✅ **RBAC**: Least-privilege access with service accounts
- ✅ **Security Contexts**: Non-root user, read-only filesystem
- ✅ **Monitoring**: Structured logging and metrics collection
- ✅ **Backup & Recovery**: Configuration backup and rollback capabilities
- ✅ **Performance**: Optimized resource usage and auto-scaling
- ✅ **Documentation**: Comprehensive deployment and troubleshooting guides

This infrastructure implementation provides a solid foundation for enterprise-grade deployment with security, scalability, and maintainability as core design principles.