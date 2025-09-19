# AIgent-Parlant Security Bridge Deployment Guide

## Enterprise JWT-to-Parlant Authentication Integration

This guide provides comprehensive deployment instructions for the AIgent-Parlant Security Bridge, enabling enterprise-grade JWT authentication with conversational validation through the Parlant system.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Security Classifications](#security-classifications)
4. [JWT Algorithm Support](#jwt-algorithm-support)
5. [Environment Configuration](#environment-configuration)
6. [Redis Clustering Setup](#redis-clustering-setup)
7. [Compliance Frameworks](#compliance-frameworks)
8. [Deployment Scenarios](#deployment-scenarios)
9. [Monitoring and Alerts](#monitoring-and-alerts)
10. [Troubleshooting](#troubleshooting)
11. [Security Best Practices](#security-best-practices)

## Overview

The AIgent-Parlant Security Bridge provides:

- **5-Tier Security Classification System**: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED, CLASSIFIED
- **Multi-Algorithm JWT Support**: HS256, RS256, ES256, EdDSA
- **Conversational Security Validation**: Real-time session validation through Parlant
- **Enterprise Compliance**: SOX, GDPR, HIPAA, PCI-DSS, ISO 27001 support
- **Redis Session Clustering**: High-availability session management
- **Emergency Override Capabilities**: Critical access with comprehensive audit trails
- **Comprehensive Audit Trails**: Full security event tracking and compliance reporting

## Architecture

```mermaid
graph TB
    Client[Client Application] --> JWT[JWT Token]
    JWT --> Strategy[Enhanced JWT Strategy]
    Strategy --> Bridge[AIgent-Parlant Security Bridge]
    Bridge --> Parlant[Parlant Integration Service]
    Bridge --> Redis[Redis Cluster]
    Bridge --> Audit[Security Audit Service]

    subgraph "Security Classifications"
        PUBLIC[PUBLIC]
        INTERNAL[INTERNAL]
        CONFIDENTIAL[CONFIDENTIAL]
        RESTRICTED[RESTRICTED]
        CLASSIFIED[CLASSIFIED]
    end

    subgraph "JWT Algorithms"
        HS256[HS256 - HMAC]
        RS256[RS256 - RSA]
        ES256[ES256 - ECDSA]
        EdDSA[EdDSA - Ed25519]
    end

    Bridge --> PUBLIC
    Bridge --> INTERNAL
    Bridge --> CONFIDENTIAL
    Bridge --> RESTRICTED
    Bridge --> CLASSIFIED
```

## Security Classifications

### 1. PUBLIC Classification
- **Access Level**: General public access
- **Authorized Roles**: GUEST, USER
- **Session Duration**: 30 minutes (GUEST), 1 hour (USER)
- **Audit Level**: MINIMAL
- **Use Cases**: Public content, general information

### 2. INTERNAL Classification
- **Access Level**: Internal employee access
- **Authorized Roles**: USER, VIEWER, OPERATOR
- **Session Duration**: 2 hours
- **Audit Level**: STANDARD
- **Use Cases**: Internal documentation, employee resources

### 3. CONFIDENTIAL Classification
- **Access Level**: Sensitive business information
- **Authorized Roles**: OPERATOR, ADMIN
- **Session Duration**: 4 hours
- **Audit Level**: STANDARD
- **Multi-Factor**: Required
- **Use Cases**: Business operations, customer data

### 4. RESTRICTED Classification
- **Access Level**: High-sensitivity data
- **Authorized Roles**: ADMIN, specialized roles
- **Session Duration**: 4 hours
- **Audit Level**: COMPREHENSIVE
- **Multi-Factor**: Required
- **Use Cases**: Financial data, executive information

### 5. CLASSIFIED Classification
- **Access Level**: Maximum security
- **Authorized Roles**: ADMIN only
- **Session Duration**: 8 hours
- **Audit Level**: COMPREHENSIVE
- **Multi-Factor**: Required
- **Additional Validation**: Real-time monitoring
- **Use Cases**: System administration, security management

## JWT Algorithm Support

### HS256 (HMAC with SHA-256)
```env
JWT_SECRET_HS256=your-secret-key-minimum-256-bits
JWT_ISSUER=aigent-bytebot-system
JWT_AUDIENCE=bytebotd-enterprise-control
```

### RS256 (RSA with SHA-256)
```env
JWT_PUBLIC_KEY_RS256=-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----

JWT_PRIVATE_KEY_RS256=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----

JWT_KEY_ID_RS256=rs256-key-1
```

### ES256 (ECDSA with SHA-256)
```env
JWT_PUBLIC_KEY_ES256=-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
-----END PUBLIC KEY-----

JWT_PRIVATE_KEY_ES256=-----BEGIN EC PRIVATE KEY-----
MHcCAQEEII...
-----END EC PRIVATE KEY-----

JWT_KEY_ID_ES256=es256-key-1
```

### EdDSA (Ed25519)
```env
JWT_PUBLIC_KEY_EdDSA=-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA...
-----END PUBLIC KEY-----

JWT_PRIVATE_KEY_EdDSA=-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEII...
-----END PRIVATE KEY-----

JWT_KEY_ID_EdDSA=eddsa-key-1
```

## Environment Configuration

### Core Bridge Configuration
```env
# Redis Clustering
REDIS_URL=redis://localhost:6379
BRIDGE_SESSION_CLUSTERING_ENABLED=true

# Session Management
BRIDGE_SESSION_TIMEOUT_MS=3600000
BRIDGE_MAX_CONCURRENT_SESSIONS=10000
BRIDGE_AUDIT_ALL_SESSIONS=true

# Emergency Overrides
BRIDGE_EMERGENCY_OVERRIDE_ENABLED=true

# JWT Configuration
JWT_DEFAULT_ALGORITHM=RS256
JWT_EXPIRES_IN=1h
JWT_MAX_AGE=24h

# Parlant Integration
PARLANT_SERVER_URL=http://localhost:8000
PARLANT_API_KEY=your-parlant-api-key
PARLANT_ENABLED=true
PARLANT_CACHE_ENABLED=true
PARLANT_AUDIT_ENABLED=true

# Security Audit
SECURITY_AUDIT_ENABLED=true
REAL_TIME_AUDITING_ENABLED=true
COMPLIANCE_TRACKING_ENABLED=true
AUDIT_RETENTION_YEARS=7
```

### Production Security Configuration
```env
# Production Security Settings
NODE_ENV=production
HELMET_ENABLED=true
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000

# Session Security
SESSION_TIMEOUT=3600000
MAX_FAILED_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=1800000

# Compliance
AUDIT_CONVERSATIONAL_VALIDATION=true
MAX_AUDIT_EVENTS_PER_HOUR=10000
```

## Redis Clustering Setup

### Single Node (Development)
```bash
# Install Redis
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Key configurations
bind 0.0.0.0
port 6379
requirepass your-redis-password
maxmemory 2gb
maxmemory-policy allkeys-lru

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Redis Cluster (Production)
```bash
# Install Redis on multiple nodes
sudo apt-get install redis-server

# Node 1 - redis.conf
port 7000
cluster-enabled yes
cluster-config-file nodes-7000.conf
cluster-node-timeout 5000
appendonly yes

# Node 2 - redis.conf
port 7001
cluster-enabled yes
cluster-config-file nodes-7001.conf
cluster-node-timeout 5000
appendonly yes

# Node 3 - redis.conf
port 7002
cluster-enabled yes
cluster-config-file nodes-7002.conf
cluster-node-timeout 5000
appendonly yes

# Create cluster
redis-cli --cluster create 127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 --cluster-replicas 0
```

### Redis Sentinel (High Availability)
```bash
# sentinel.conf
port 26379
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 30000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 180000

# Start Sentinel
redis-sentinel /path/to/sentinel.conf
```

## Compliance Frameworks

### SOX (Sarbanes-Oxley) Configuration
```typescript
// Required for financial operations
complianceRequirements: [ComplianceFramework.SOX, ComplianceFramework.PCI_DSS]
securityClassification: SecurityClassification.CLASSIFIED
auditLevel: 'COMPREHENSIVE'
```

### GDPR (General Data Protection Regulation) Configuration
```typescript
// Required for EU data processing
complianceRequirements: [ComplianceFramework.GDPR]
securityClassification: SecurityClassification.CONFIDENTIAL
dataProcessingPurpose: 'legitimate_interest'
```

### HIPAA (Health Insurance Portability and Accountability Act) Configuration
```typescript
// Required for healthcare data
complianceRequirements: [ComplianceFramework.HIPAA, ComplianceFramework.ISO_27001]
securityClassification: SecurityClassification.RESTRICTED
patientDataAccess: true
```

### PCI-DSS (Payment Card Industry Data Security Standard) Configuration
```typescript
// Required for payment processing
complianceRequirements: [ComplianceFramework.PCI_DSS]
securityClassification: SecurityClassification.CLASSIFIED
paymentDataAccess: true
```

## Deployment Scenarios

### Development Environment
```bash
# Clone repository
git clone https://github.com/your-org/aigent-bytebot.git
cd aigent-bytebot/packages/bytebotd

# Install dependencies
npm install

# Configure environment
cp .env.example .env.development
nano .env.development

# Start Redis
redis-server

# Start Parlant (if local)
cd ../parlant
python -m parlant.server

# Start ByteBotd
npm run start:dev
```

### Staging Environment
```bash
# Use Docker Compose
docker-compose -f docker-compose.staging.yml up -d

# Or manual deployment
npm run build
npm run start:prod

# Verify deployment
curl -H "Authorization: Bearer $JWT_TOKEN" http://staging.yourdomain.com/health
```

### Production Environment
```bash
# Build and deploy
npm run build
npm run start:prod

# With PM2 process manager
pm2 start dist/main.js --name "bytebotd-production"
pm2 startup
pm2 save

# With systemd service
sudo cp bytebotd.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bytebotd
sudo systemctl start bytebotd
```

### Kubernetes Deployment
```yaml
# bytebotd-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bytebotd-security-bridge
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bytebotd
  template:
    metadata:
      labels:
        app: bytebotd
    spec:
      containers:
      - name: bytebotd
        image: your-registry/bytebotd:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        - name: JWT_SECRET_HS256
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: hs256
        resources:
          limits:
            memory: "1Gi"
            cpu: "500m"
          requests:
            memory: "512Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Monitoring and Alerts

### Health Check Endpoints
```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed

# Security bridge metrics
curl -H "Authorization: Bearer $ADMIN_JWT" http://localhost:3000/security/metrics
```

### Prometheus Metrics
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'bytebotd-security-bridge'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "AIgent-Parlant Security Bridge",
    "panels": [
      {
        "title": "Active Sessions by Classification",
        "type": "graph",
        "targets": [
          {
            "expr": "bytebotd_active_sessions{classification=\"PUBLIC\"}"
          }
        ]
      },
      {
        "title": "JWT Validation Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(bytebotd_jwt_validations_total[5m])"
          }
        ]
      }
    ]
  }
}
```

### Alert Rules
```yaml
# alerting-rules.yml
groups:
  - name: bytebotd-security
    rules:
      - alert: HighFailedAuthAttempts
        expr: rate(bytebotd_failed_auth_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High failed authentication attempts detected"

      - alert: SecurityBridgeDown
        expr: up{job="bytebotd-security-bridge"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Security bridge service is down"

      - alert: EmergencyOverrideUsed
        expr: increase(bytebotd_emergency_overrides_total[5m]) > 0
        labels:
          severity: warning
        annotations:
          summary: "Emergency override has been used"
```

## Troubleshooting

### Common Issues

#### 1. JWT Validation Failures
```bash
# Check JWT token structure
echo $JWT_TOKEN | cut -d'.' -f2 | base64 -d | jq

# Verify algorithm support
curl -H "Authorization: Bearer $JWT_TOKEN" http://localhost:3000/auth/verify

# Check logs
docker logs bytebotd-container | grep "JWT validation"
```

#### 2. Redis Connection Issues
```bash
# Test Redis connection
redis-cli ping

# Check Redis logs
tail -f /var/log/redis/redis-server.log

# Verify Redis cluster status
redis-cli cluster nodes
```

#### 3. Parlant Integration Issues
```bash
# Test Parlant API
curl -X POST http://localhost:8000/api/validate \
  -H "Content-Type: application/json" \
  -d '{"intent": "test"}'

# Check Parlant logs
docker logs parlant-container
```

#### 4. Session Management Issues
```bash
# Check active sessions
curl -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/security/sessions

# Clear session cache
redis-cli FLUSHDB
```

### Debug Configuration
```env
# Enable debug logging
LOG_LEVEL=debug
DEBUG=bytebotd:security,bytebotd:parlant,bytebotd:audit

# Enable security trace logging
SECURITY_TRACE_ENABLED=true
PARLANT_DEBUG_ENABLED=true
```

### Performance Tuning
```env
# Optimize Redis
REDIS_MAX_MEMORY=2gb
REDIS_MAX_MEMORY_POLICY=allkeys-lru

# Optimize session caching
BRIDGE_VALIDATION_CACHE_SIZE=10000
BRIDGE_VALIDATION_CACHE_TTL=300000

# Optimize Parlant
PARLANT_CACHE_MAX_AGE_MS=300000
PARLANT_CONNECTION_POOL_SIZE=10
```

## Security Best Practices

### 1. Key Management
- Use hardware security modules (HSMs) for production keys
- Rotate JWT signing keys regularly (every 90 days)
- Store private keys encrypted at rest
- Use different keys for different environments

### 2. Network Security
- Use TLS 1.3 for all communications
- Implement certificate pinning
- Use VPN for internal service communication
- Enable Redis AUTH and TLS

### 3. Monitoring and Alerting
- Monitor all authentication events
- Alert on unusual patterns (geographic, time-based)
- Track emergency override usage
- Monitor compliance violations

### 4. Access Control
- Implement principle of least privilege
- Regular access reviews and audits
- Time-limited session tokens
- Multi-factor authentication for high-privilege roles

### 5. Incident Response
- Prepare incident response playbooks
- Regular security drills
- Automated threat detection
- Compliance reporting procedures

## Production Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] JWT keys generated and secured
- [ ] Redis cluster configured and tested
- [ ] Parlant integration tested
- [ ] SSL/TLS certificates installed
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested
- [ ] Security scanning completed
- [ ] Penetration testing performed
- [ ] Documentation updated

### Post-Deployment
- [ ] Health checks passing
- [ ] Metrics collection working
- [ ] Log aggregation configured
- [ ] Performance baseline established
- [ ] Security monitoring active
- [ ] Compliance reporting functional
- [ ] Incident response tested
- [ ] Staff training completed
- [ ] Change management procedures in place
- [ ] Regular maintenance scheduled

## Support and Maintenance

### Regular Maintenance Tasks
1. **Daily**: Monitor health checks and alerts
2. **Weekly**: Review security logs and metrics
3. **Monthly**: Performance optimization and capacity planning
4. **Quarterly**: Security reviews and compliance audits
5. **Annually**: Penetration testing and security assessment

### Version Updates
1. Test in development environment
2. Deploy to staging environment
3. Run integration tests
4. Deploy to production during maintenance window
5. Monitor for issues and rollback if necessary

### Emergency Procedures
1. **Security Incident**: Isolate affected systems, investigate, remediate
2. **Service Outage**: Activate failover procedures, restore service
3. **Data Breach**: Follow compliance notification procedures
4. **Emergency Override**: Document justification, time-limit access, audit

For additional support, contact the AIgent Security Team or create an issue in the project repository.