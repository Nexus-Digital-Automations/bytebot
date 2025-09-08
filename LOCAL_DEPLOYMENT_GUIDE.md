# Bytebot Local-Only Deployment Guide

## 🏠 100% Local Architecture Overview

This guide demonstrates how to deploy Bytebot with **zero cloud dependencies** (except AI services) using the new local-only architecture. All data, secrets, and services run locally on your machine using Docker Compose.

## ✅ Local-Only Components

- **Local Database**: PostgreSQL container (or SQLite for single-user)
- **Local Secrets Management**: Encrypted file-based storage with AES-256-GCM
- **Local Configuration**: File-based configuration with hot-reload
- **Local Monitoring**: Local Prometheus/Grafana (optional)
- **Local Networking**: Docker Compose internal networking
- **Local Storage**: Docker volumes and bind mounts

## ❌ No Cloud Dependencies

- ❌ No Kubernetes - Pure Docker Compose
- ❌ No cloud databases (RDS, Cloud SQL)
- ❌ No cloud secrets management (AWS Secrets Manager, Azure Key Vault)
- ❌ No cloud storage (S3, GCS)
- ❌ No cloud monitoring services
- ❌ No container registries for runtime dependencies

## 🚀 Quick Start - Local Deployment

### 1. Prerequisites

```bash
# Install Docker and Docker Compose
docker --version
docker compose --version

# Ensure you have at least:
# - Docker 20.10+
# - Docker Compose 2.0+
```

### 2. Clone and Setup

```bash
# Navigate to the Bytebot project
cd /path/to/bytebot

# Create local environment configuration
cp packages/bytebot-agent/.env.local.example .env.local

# Edit the configuration file with your settings
nano .env.local
```

### 3. Configure Local Secrets

**IMPORTANT**: Update the following in `.env.local`:

```bash
# Generate a strong encryption key (32+ characters)
LOCAL_SECRETS_ENCRYPTION_KEY="your-256-bit-encryption-key-change-in-production"

# Set a strong JWT secret (32+ characters)
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"

# Set encryption key for data protection
ENCRYPTION_KEY="your-encryption-key-for-data-protection-32-chars-minimum"

# Add your AI API keys
ANTHROPIC_API_KEY="sk-ant-your-key-here"
OPENAI_API_KEY="sk-your-key-here"
GEMINI_API_KEY="your-gemini-key-here"
```

### 4. Start Local Services

```bash
# Start all services with Docker Compose
docker compose -f docker/docker-compose.yml --env-file .env.local up -d

# Check that all services are running
docker compose -f docker/docker-compose.yml ps
```

### 5. Verify Local Deployment

```bash
# Check Bytebot Agent API
curl http://localhost:9991/health

# Check Bytebot Desktop
curl http://localhost:9990/health

# Check Bytebot UI
open http://localhost:9992

# Check local database
docker compose -f docker/docker-compose.yml exec postgres psql -U postgres -d bytebotdb -c "SELECT version();"
```

## 🔒 Local Secrets Management

The new local secrets management system provides enterprise-grade security using only local components:

### Encrypted File Storage

- **Location**: `./.env/secrets/` (configurable with `LOCAL_SECRETS_DIR`)
- **Encryption**: AES-256-GCM with authenticated encryption
- **Permissions**: Unix file permissions (600 for files, 700 for directories)
- **Structure**: JSON files encrypted with unique IVs per secret

### Secret Categories

```bash
# API Keys stored in encrypted local file
.env/secrets/api-keys.enc

# Authentication secrets
.env/secrets/auth.enc  

# Security configuration
.env/secrets/security.enc
```

### Secret Management Commands

The local secrets are managed automatically by the Bytebot Agent:

```typescript
// Secrets are automatically loaded from environment and stored encrypted locally
// during first startup. Access them through the ConfigService:

@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  async useSecret() {
    // Automatically loads from local encrypted storage with fallback to env vars
    const apiKey = this.configService.get<string>('llmApiKeys.anthropic');
    return apiKey;
  }
}
```

## 🐳 Docker Compose Architecture

### Service Network

```yaml
# All services communicate through local Docker network
networks:
  bytebot-network:
    driver: bridge

# No external dependencies except AI APIs
```

### Volume Management

```yaml
# Local data persistence
volumes:
  postgres_data:        # Database data
  bytebot_data:         # Application data  
  bytebot_secrets:      # Encrypted secrets storage
```

### Environment Integration

The Docker Compose configuration supports both:
- **Environment variables** (`.env.local` file)
- **Local encrypted file secrets** (automatic encryption/decryption)

## 📊 Local Monitoring (Optional)

### Prometheus + Grafana Stack

```bash
# Optional: Add monitoring stack to docker-compose.yml
docker compose -f docker/docker-compose.yml -f docker/docker-compose.monitoring.yml up -d

# Access local Grafana dashboard
open http://localhost:3000  # admin/admin

# Access local Prometheus
open http://localhost:9090
```

### Local Metrics Collection

- **Prometheus metrics**: Collected locally on port 9464
- **Application logs**: Stored locally with log rotation
- **Health checks**: Local endpoints for all services
- **Performance monitoring**: Local dashboard with no cloud dependencies

## 🔄 Configuration Hot-Reload

The system supports hot-reloading of configuration changes:

```bash
# Configuration files watched for changes:
# - .env.local (environment variables)
# - .env/secrets/*.enc (encrypted secrets)
# - config/*.json (application config)

# Changes are automatically detected and applied without restart
```

## 🛡️ Security Features

### Local File Permissions

```bash
# Secrets directory permissions
chmod 700 .env/secrets/

# Individual secret files  
chmod 600 .env/secrets/*.enc
```

### Encryption Standards

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: scrypt with salt
- **Initialization Vectors**: Unique per encryption operation
- **Authentication**: Built-in tamper detection

### Network Security

- **Internal networking**: Docker Compose internal network only
- **No external exposure**: Only necessary ports exposed to localhost
- **TLS/HTTPS**: Local SSL certificate generation and rotation

## 🚨 Troubleshooting

### Common Issues

1. **Secrets directory permission denied**:
   ```bash
   chmod 700 .env/secrets/
   sudo chown $(whoami):$(whoami) .env/secrets/
   ```

2. **Database connection failed**:
   ```bash
   # Check if PostgreSQL container is running
   docker compose -f docker/docker-compose.yml logs postgres
   ```

3. **Port conflicts**:
   ```bash
   # Check which ports are in use
   lsof -i :9990,9991,9992,5432
   
   # Modify ports in docker-compose.yml if needed
   ```

4. **Encryption key issues**:
   ```bash
   # Generate a new encryption key
   openssl rand -base64 32
   ```

### Debug Mode

```bash
# Enable debug logging
echo "DEBUG_MODE=true" >> .env.local
echo "LOG_LEVEL=debug" >> .env.local

# Restart services
docker compose -f docker/docker-compose.yml restart
```

### Clean Reset

```bash
# Complete clean reset (WARNING: destroys all local data)
docker compose -f docker/docker-compose.yml down -v
rm -rf .env/secrets/
rm -rf data/
docker system prune -f
```

## 🔧 Advanced Configuration

### SQLite Single-User Mode

For lightweight single-user deployments:

```bash
# In .env.local, change DATABASE_URL to:
DATABASE_URL=sqlite:./data/bytebot.db

# Remove PostgreSQL from docker-compose.yml or use override:
docker compose -f docker/docker-compose.yml -f docker/docker-compose.sqlite.yml up -d
```

### Custom Secrets Directory

```bash
# Use custom secrets location
LOCAL_SECRETS_DIR=/secure/location/secrets

# Ensure proper permissions
mkdir -p /secure/location/secrets
chmod 700 /secure/location/secrets
```

### Local SSL/TLS

```bash
# Generate local SSL certificates
mkdir -p .ssl/
openssl req -x509 -newkey rsa:4096 -keyout .ssl/key.pem -out .ssl/cert.pem -days 365 -nodes

# Configure HTTPS in environment
ENABLE_HTTPS=true
SSL_KEY_PATH=.ssl/key.pem
SSL_CERT_PATH=.ssl/cert.pem
```

## ✅ Production Readiness

### Security Checklist

- [ ] Change all default secrets/keys
- [ ] Use strong encryption keys (32+ characters)
- [ ] Set proper file permissions (700/600)
- [ ] Enable authentication (`ENABLE_AUTHENTICATION=true`)
- [ ] Enable rate limiting (`ENABLE_RATE_LIMITING=true`)
- [ ] Disable debug mode (`DEBUG_MODE=false`)
- [ ] Disable Swagger in production (`ENABLE_SWAGGER=false`)
- [ ] Configure log rotation
- [ ] Set up regular backups

### Performance Checklist

- [ ] Configure appropriate connection pools
- [ ] Enable circuit breakers for resilience
- [ ] Set up monitoring and alerting
- [ ] Configure proper resource limits
- [ ] Enable compression for API responses
- [ ] Optimize database configuration

### Backup Strategy

```bash
# Database backup
docker compose -f docker/docker-compose.yml exec postgres pg_dump -U postgres bytebotdb > backup_$(date +%Y%m%d).sql

# Secrets backup (encrypted files)
tar -czf secrets_backup_$(date +%Y%m%d).tar.gz .env/secrets/

# Configuration backup
cp .env.local config_backup_$(date +%Y%m%d).env
```

## 📞 Support

For issues with local deployment:

1. **Check logs**: `docker compose -f docker/docker-compose.yml logs`
2. **Verify configuration**: Ensure all required environment variables are set
3. **Test connectivity**: Use `curl` commands to verify service health
4. **Review permissions**: Check file and directory permissions for secrets

This local-only architecture provides enterprise-grade functionality while maintaining complete control over your data and deployment environment.