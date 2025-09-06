# Bytebot Agent - Enterprise Secrets Management Guide

## Overview

This guide covers the comprehensive enterprise-grade secrets management system implemented for the Bytebot Agent platform. The system provides secure secrets loading, rotation, and management with support for multiple backends including Kubernetes secrets, HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, and Google Cloud Secret Manager.

## Architecture

### Core Components

1. **SecretsService** - Base secrets management service with Kubernetes integration
2. **EnhancedSecretsService** - Advanced secrets service with external provider support
3. **SecretsHealthController** - Health monitoring and metrics endpoints
4. **BytebotConfigService** - Enhanced configuration service with secrets integration

### Key Features

- 🔒 **Multi-source secret loading** with automatic fallback
- 🔄 **Automatic secret rotation** with configurable policies
- 📊 **Comprehensive monitoring** and health checks
- 🏗️ **Kubernetes-native** deployment with secrets mounting
- 🔧 **External provider support** for enterprise environments
- 📈 **Performance metrics** and audit logging
- 🛡️ **Security compliance** validation and reporting

## Quick Start

### Development Environment

1. **Create local secrets file**:
```bash
# Create development secrets directory
mkdir -p /etc/secrets

# Create basic secrets for development
echo "dev-jwt-secret-for-local-testing-use-secure-in-prod" > /etc/secrets/jwt-secret
echo "dev-encryption-key-for-local-testing-secure-in-prod" > /etc/secrets/encryption-key
echo "postgresql://dev:devpass@localhost:5432/bytebot_dev" > /etc/secrets/database-url
```

2. **Set environment variables**:
```bash
export NODE_ENV=development
export DATABASE_URL="postgresql://dev:devpass@localhost:5432/bytebot_dev"
export JWT_SECRET="dev-jwt-secret-for-local-testing"
export ENCRYPTION_KEY="dev-encryption-key-for-local-testing"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export OPENAI_API_KEY="your-openai-api-key"
export GEMINI_API_KEY="your-gemini-api-key"
```

3. **Start the application**:
```bash
npm run start:dev
```

4. **Verify secrets health**:
```bash
curl http://localhost:9991/api/secrets/health
```

### Production Deployment

1. **Create Kubernetes secrets**:
```bash
# Generate secure secrets
kubectl create secret generic bytebot-agent-secrets-v2 \
  --from-literal=jwt-secret="$(openssl rand -hex 32)" \
  --from-literal=encryption-key="$(openssl rand -hex 32)" \
  --from-literal=database-url="postgresql://user:pass@postgres:5432/bytebot" \
  --from-literal=anthropic-api-key="your-actual-api-key" \
  --from-literal=openai-api-key="your-actual-api-key" \
  --from-literal=gemini-api-key="your-actual-api-key" \
  --namespace bytebot-production
```

2. **Deploy the application**:
```bash
kubectl apply -f k8s/secrets-enhanced.yaml
kubectl apply -f k8s/deployment-enhanced.yaml
```

3. **Monitor secrets health**:
```bash
kubectl port-forward service/bytebot-agent-service 9991:9991
curl http://localhost:9991/api/secrets/health
```

## Configuration

### Basic Configuration

The secrets management system is configured through environment variables and application configuration:

```typescript
// Environment variables
NODE_ENV=production                     // Environment (development, staging, production)
SECRETS_ROTATION_ENABLED=true          // Enable automatic secret rotation
SECRETS_ROTATION_INTERVAL=604800000    // Rotation interval (7 days in ms)
SECRETS_MAX_AGE=604800000              // Maximum secret age (7 days in ms)
SECRETS_AUTO_ROTATE_ON_EXPIRY=true     // Auto-rotate on expiry
SECRETS_BACKUP_ON_ROTATION=true        // Backup secrets before rotation
SECRETS_VALIDATE_AFTER_ROTATION=true   // Validate secrets after rotation
```

### External Providers Configuration

#### HashiCorp Vault
```typescript
SECRETS_VAULT_ENABLED=true
SECRETS_VAULT_ADDRESS=https://vault.example.com:8200
SECRETS_VAULT_TOKEN=hvs.CAESI...
SECRETS_VAULT_MOUNT_PATH=secret
SECRETS_VAULT_NAMESPACE=bytebot
```

#### AWS Secrets Manager
```typescript
SECRETS_AWS_ENABLED=true
SECRETS_AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_SESSION_TOKEN=...  // Optional
```

#### Azure Key Vault
```typescript
SECRETS_AZURE_ENABLED=true
SECRETS_AZURE_VAULT_URL=https://bytebot.vault.azure.net/
SECRETS_AZURE_TENANT_ID=...
SECRETS_AZURE_CLIENT_ID=...
SECRETS_AZURE_CLIENT_SECRET=...
```

#### Google Cloud Secret Manager
```typescript
SECRETS_GCP_ENABLED=true
SECRETS_GCP_PROJECT_ID=bytebot-production
SECRETS_GCP_KEY_FILE_PATH=/etc/gcp/credentials.json
GOOGLE_APPLICATION_CREDENTIALS=/etc/gcp/credentials.json
```

## Usage

### Accessing Secrets in Services

```typescript
import { Injectable } from '@nestjs/common';
import { SecretsService } from '../config/secrets.service';

@Injectable()
export class ExampleService {
  constructor(private readonly secretsService: SecretsService) {}

  async initialize() {
    // Get JWT secret
    const jwtSecret = await this.secretsService.getSecret('jwt-secret', 'JWT_SECRET');
    
    // Get encrypted secret
    const encryptedData = await this.secretsService.getSecret('sensitive-data', 'ENCRYPTED_DATA', true);
    
    // Get API key with fallback
    const apiKey = await this.secretsService.getSecret('api-key', 'API_KEY') || 'default-key';
  }
}
```

### Configuration Service Integration

```typescript
import { Injectable } from '@nestjs/common';
import { BytebotConfigService } from '../config/config.service';

@Injectable()
export class ExampleService {
  constructor(private readonly configService: BytebotConfigService) {}

  async initialize() {
    // Get JWT secret securely
    const jwtSecret = await this.configService.getJwtSecret();
    
    // Get LLM API key
    const anthropicKey = await this.configService.getLlmApiKey('anthropic');
    
    // Check if feature is enabled
    const isEnabled = this.configService.isFeatureEnabled('authentication');
  }
}
```

## Monitoring and Health Checks

### Health Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/secrets/health` | Comprehensive secrets health status |
| `GET /api/secrets/metrics` | Detailed performance metrics |
| `GET /api/secrets/metrics/prometheus` | Prometheus-formatted metrics |

### Health Response Example

```json
{
  "status": "healthy",
  "timestamp": "2024-12-19T00:00:00.000Z",
  "uptime": 3600000,
  "summary": {
    "total": 6,
    "healthy": 6,
    "expiring": 0,
    "expired": 0,
    "successRate": 99.5
  },
  "performance": {
    "totalRequests": 1250,
    "cacheHitRate": 85.2,
    "averageResponseTime": 12.5,
    "errorCount": 2,
    "errorsLast24h": 1
  },
  "rotation": {
    "enabled": true,
    "lastRotation": "2024-12-18T02:00:00.000Z",
    "nextRotation": "2024-12-25T02:00:00.000Z"
  },
  "externalProviders": {
    "vault": { "enabled": false, "status": "disconnected" },
    "awsSecrets": { "enabled": false, "status": "disconnected" },
    "azureKeyVault": { "enabled": false, "status": "disconnected" },
    "gcpSecrets": { "enabled": false, "status": "disconnected" }
  },
  "compliance": {
    "encryptionCompliant": true,
    "rotationCompliant": true,
    "auditingEnabled": true,
    "backupEnabled": true
  },
  "warnings": [],
  "recommendations": [
    "Consider integrating with external secret providers for enhanced security"
  ]
}
```

### Prometheus Metrics

The system exposes metrics in Prometheus format:

```prometheus
# HELP bytebot_secrets_total Total number of secrets
# TYPE bytebot_secrets_total gauge
bytebot_secrets_total 6

# HELP bytebot_secrets_healthy Number of healthy secrets
# TYPE bytebot_secrets_healthy gauge
bytebot_secrets_healthy 6

# HELP bytebot_secrets_requests_total Total number of secret requests
# TYPE bytebot_secrets_requests_total counter
bytebot_secrets_requests_total 1250

# HELP bytebot_secrets_cache_hits_total Total number of cache hits
# TYPE bytebot_secrets_cache_hits_total counter
bytebot_secrets_cache_hits_total 1065

# HELP bytebot_secrets_success_rate Success rate percentage
# TYPE bytebot_secrets_success_rate gauge
bytebot_secrets_success_rate 99.5
```

## Secret Rotation

### Automatic Rotation

The system supports automatic secret rotation based on configurable policies:

1. **Time-based rotation**: Secrets are rotated after a specified interval
2. **Expiry-based rotation**: Secrets are rotated when they expire
3. **Manual rotation**: Secrets can be manually rotated via API or kubectl

### Rotation Process

1. **Pre-rotation validation**: Check current secret health
2. **Backup creation**: Create encrypted backup of current secrets (if enabled)
3. **New secret generation**: Generate new secure secrets
4. **Secret update**: Update secrets in all configured stores
5. **Application restart**: Trigger rolling update of application pods
6. **Post-rotation validation**: Verify new secrets work correctly
7. **Notification**: Send notifications to configured webhooks

### Manual Rotation

```bash
# Rotate specific secret
kubectl exec -it deployment/bytebot-agent-enhanced -- curl -X POST http://localhost:8080/api/secrets/rotate?secret=jwt-secret

# Trigger rotation job manually
kubectl create job --from=cronjob/bytebot-secret-rotator manual-rotation-$(date +%s) -n bytebot-production
```

## Security Considerations

### Best Practices

1. **Use strong encryption keys**: Minimum 32 characters for production
2. **Enable secret rotation**: Regularly rotate secrets to minimize exposure
3. **Audit access**: Monitor and log all secret access operations
4. **Principle of least privilege**: Grant minimal necessary permissions
5. **Secure transport**: Always use TLS for secret transmission
6. **Environment separation**: Use separate secrets for different environments

### Security Features

- **Encryption at rest**: All cached secrets are encrypted using AES-256-GCM
- **Secure transmission**: TLS encryption for all network communications  
- **Access logging**: Comprehensive audit logs for all secret operations
- **Permission controls**: RBAC-based access control in Kubernetes
- **Secret validation**: Automated validation of secret formats and lengths
- **Backup encryption**: Encrypted backups for disaster recovery

## Troubleshooting

### Common Issues

1. **Secret not found**:
   - Check if secret exists in Kubernetes: `kubectl get secret bytebot-agent-secrets-v2`
   - Verify environment variables are set correctly
   - Check application logs for detailed error messages

2. **Permission denied**:
   - Verify service account has proper RBAC permissions
   - Check if secret is mounted correctly in pod
   - Ensure namespace is correct

3. **Rotation failures**:
   - Check rotation job logs: `kubectl logs job/bytebot-secret-rotator`
   - Verify rotation service account permissions
   - Check external provider connectivity

4. **Performance issues**:
   - Monitor cache hit rates via metrics endpoint
   - Check for excessive secret reloading
   - Verify network connectivity to external providers

### Debug Commands

```bash
# Check secret health
kubectl exec -it deployment/bytebot-agent-enhanced -- curl http://localhost:8080/api/secrets/health

# View detailed metrics
kubectl exec -it deployment/bytebot-agent-enhanced -- curl http://localhost:8080/api/secrets/metrics

# Check rotation status
kubectl get cronjob bytebot-secret-rotator -o yaml

# View application logs
kubectl logs deployment/bytebot-agent-enhanced -f

# Check secret validation
kubectl exec -it deployment/bytebot-agent-enhanced -- ls -la /etc/secrets/
```

## Migration Guide

### From Basic to Enhanced Secrets Management

1. **Update configuration**:
   ```bash
   # Enable enhanced features
   export SECRETS_ROTATION_ENABLED=true
   export SECRETS_BACKUP_ON_ROTATION=true
   ```

2. **Deploy new secrets**:
   ```bash
   kubectl apply -f k8s/secrets-enhanced.yaml
   ```

3. **Update application**:
   ```bash
   kubectl apply -f k8s/deployment-enhanced.yaml
   ```

4. **Verify migration**:
   ```bash
   curl http://localhost:9991/api/secrets/health
   ```

### External Provider Integration

1. **Configure provider settings** (see Configuration section)
2. **Test connectivity** using health endpoint
3. **Migrate secrets** to external provider
4. **Update application configuration**
5. **Verify functionality** through monitoring

## API Reference

### SecretsService Methods

```typescript
class SecretsService {
  // Get secret value with automatic fallback
  async getSecret(secretName: string, key?: string, encrypted?: boolean): Promise<string | null>
  
  // Set secret value (for testing/development)
  async setSecret(secretName: string, value: string, key?: string, encrypted?: boolean): Promise<void>
  
  // Rotate secret
  async rotateSecret(secretName: string, key?: string): Promise<void>
  
  // Get secrets health status
  getSecretsHealth(): SecretsHealthStatus
  
  // Get secrets metadata
  getSecretsMetadata(): SecretMetadata[]
}
```

### Configuration Methods

```typescript
class BytebotConfigService {
  // Get JWT secret securely
  async getJwtSecret(): Promise<string>
  
  // Get encryption key securely
  async getEncryptionKey(): Promise<string>
  
  // Get LLM API key
  async getLlmApiKey(provider: 'anthropic' | 'openai' | 'gemini'): Promise<string | null>
  
  // Check if feature is enabled
  isFeatureEnabled(feature: string): boolean
  
  // Get complete configuration
  getAppConfig(): AppConfig
}
```

## Support

For issues, questions, or feature requests related to the secrets management system:

1. **Check the logs**: Application and Kubernetes logs provide detailed information
2. **Review health endpoints**: Use monitoring endpoints to identify issues
3. **Consult documentation**: This guide covers most common scenarios
4. **File an issue**: Report bugs or request features through the project repository

---

*This guide is part of the Bytebot Agent enterprise documentation. For the latest updates, please refer to the project repository.*