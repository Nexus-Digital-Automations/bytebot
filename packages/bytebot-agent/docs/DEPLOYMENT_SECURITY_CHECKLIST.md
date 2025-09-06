# Bytebot Agent - Production Deployment Security Checklist

## Pre-Deployment Security Validation

### Critical Security Requirements ✅ / ❌

#### 1. Environment Configuration
- [ ] **JWT Secret**: Generated with `openssl rand -hex 64` (minimum 64 characters)
- [ ] **Encryption Key**: Generated with `openssl rand -hex 32` (32 bytes hex)
- [ ] **Database URL**: Uses SSL connection (`sslmode=require`)
- [ ] **No Default Credentials**: All passwords changed from defaults
- [ ] **Environment Variables**: No placeholder values (your-, change-this)

#### 2. Authentication & Authorization
- [ ] **Authentication Enabled**: `ENABLE_AUTHENTICATION=true`
- [ ] **JWT Expiration**: Short-lived tokens (15 minutes max)
- [ ] **Refresh Token Security**: 24 hours max in production
- [ ] **Role-Based Access**: RBAC implemented and tested
- [ ] **Session Management**: Proper session tracking and cleanup

#### 3. API Security
- [ ] **Rate Limiting Enabled**: `ENABLE_RATE_LIMITING=true`
- [ ] **CORS Configuration**: Specific origins only (no wildcards)
- [ ] **HTTPS Only**: No HTTP origins in production CORS
- [ ] **Security Headers**: Helmet.js properly configured
- [ ] **Input Validation**: All endpoints validate and sanitize input

#### 4. Network Security
- [ ] **TLS/SSL**: End-to-end encryption enabled
- [ ] **Security Headers**: HSTS, CSP, X-Frame-Options configured
- [ ] **Reverse Proxy**: Nginx/Load balancer with security headers
- [ ] **Network Isolation**: Private networks for internal communication

#### 5. Monitoring & Logging
- [ ] **Security Logging**: All auth events logged
- [ ] **Metrics Collection**: `ENABLE_METRICS_COLLECTION=true`
- [ ] **Health Checks**: `ENABLE_HEALTH_CHECKS=true`
- [ ] **Circuit Breaker**: `ENABLE_CIRCUIT_BREAKER=true`
- [ ] **Alert Configuration**: Security events trigger alerts

## Automated Security Validation

Run the security validation script to verify configuration:

```bash
# Validate current configuration
node scripts/validate-security-config.js production

# Expected output: Security score 90%+ with no critical issues
```

## Secret Management Setup

### Kubernetes Secrets (Recommended)
```bash
# Create namespace
kubectl create namespace bytebot-production

# Generate and store secrets
kubectl create secret generic bytebot-secrets \
  --namespace=bytebot-production \
  --from-literal=jwt-secret=$(openssl rand -hex 64) \
  --from-literal=encryption-key=$(openssl rand -hex 32) \
  --from-literal=database-url="postgresql://user:pass@host:5432/db?sslmode=require"

# Store API keys
kubectl create secret generic bytebot-api-keys \
  --namespace=bytebot-production \
  --from-literal=anthropic-api-key="YOUR_ANTHROPIC_KEY" \
  --from-literal=openai-api-key="YOUR_OPENAI_KEY" \
  --from-literal=gemini-api-key="YOUR_GEMINI_KEY"
```

### External Secret Managers
Choose one based on your infrastructure:

#### AWS Secrets Manager
```bash
# Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "bytebot/production/jwt-secret" \
  --secret-string "$(openssl rand -hex 64)"

aws secretsmanager create-secret \
  --name "bytebot/production/encryption-key" \
  --secret-string "$(openssl rand -hex 32)"
```

#### HashiCorp Vault
```bash
# Store secrets in Vault
vault kv put secret/bytebot/production \
  jwt_secret="$(openssl rand -hex 64)" \
  encryption_key="$(openssl rand -hex 32)"
```

## Database Security Configuration

### PostgreSQL Security Hardening
```sql
-- Create dedicated user with minimal privileges
CREATE USER bytebot_prod WITH PASSWORD 'STRONG_RANDOM_PASSWORD';

-- Create database
CREATE DATABASE bytebotdb OWNER bytebot_prod;

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE bytebotdb TO bytebot_prod;
GRANT USAGE ON SCHEMA public TO bytebot_prod;
GRANT CREATE ON SCHEMA public TO bytebot_prod;

-- Enable SSL
-- In postgresql.conf:
-- ssl = on
-- ssl_cert_file = 'server.crt'
-- ssl_key_file = 'server.key'
```

### Database Connection Security
```env
# Production database URL with SSL
DATABASE_URL=postgresql://bytebot_prod:SECURE_PASSWORD@prod-db-host.com:5432/bytebotdb?schema=public&sslmode=require&sslcert=client.crt&sslkey=client.key&sslrootcert=ca.crt
```

## Container Security Configuration

### Docker Security Best Practices
```dockerfile
# Use specific version tags, not 'latest'
FROM node:20.11.0-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bytebot -u 1001

# Set secure file permissions
COPY --chown=bytebot:nodejs . .

# Run as non-root user
USER bytebot

# Use security scanning
# Add to CI/CD pipeline: docker scan your-image:tag
```

### Kubernetes Security Context
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bytebot-agent
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: bytebot-agent
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        resources:
          limits:
            memory: "2Gi"
            cpu: "1000m"
          requests:
            memory: "1Gi"
            cpu: "500m"
```

## Network Security Configuration

### Nginx Reverse Proxy Security
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourcompany.com;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/api.yourcompany.com.crt;
    ssl_certificate_key /etc/ssl/private/api.yourcompany.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "same-origin" always;
    add_header Content-Security-Policy "default-src 'self'" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Hide server information
    server_tokens off;
    
    location / {
        proxy_pass http://bytebot-agent:9991;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Proxy timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 30s;
    }
}
```

## Monitoring and Alerting Setup

### Prometheus Security Metrics
```yaml
# prometheus-config.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'bytebot-agent'
    static_configs:
      - targets: ['bytebot-agent:9464']
    metrics_path: /metrics
    scrape_interval: 15s
```

### Essential Security Alerts
```yaml
# alerting-rules.yml
groups:
  - name: bytebot-security
    rules:
    - alert: HighFailedAuthRate
      expr: rate(auth_attempts_total{status="failure"}[5m]) > 0.1
      for: 1m
      labels:
        severity: warning
      annotations:
        summary: "High authentication failure rate detected"
        
    - alert: CORSViolations
      expr: rate(cors_violations_total[5m]) > 0.05
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "CORS violations detected"
        
    - alert: RateLimitExceeded
      expr: rate(rate_limit_exceeded_total[5m]) > 0.2
      for: 1m
      labels:
        severity: info
      annotations:
        summary: "Rate limits being exceeded frequently"
```

## Production Environment Configuration

### Required Environment Variables
```bash
# Application
NODE_ENV=production
PORT=9991

# Security (stored in secret manager)
JWT_SECRET=${SECRET_MANAGER_JWT_SECRET}
ENCRYPTION_KEY=${SECRET_MANAGER_ENCRYPTION_KEY}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=24h

# Database
DATABASE_URL=${SECRET_MANAGER_DATABASE_URL}
DATABASE_MAX_CONNECTIONS=50
DATABASE_CONNECTION_TIMEOUT=10000

# API Security
API_RATE_LIMIT_WINDOW=900000
API_RATE_LIMIT_MAX_REQUESTS=100
API_CORS_ORIGINS=https://app.yourcompany.com,https://admin.yourcompany.com
BODY_PARSER_LIMIT=10mb
REQUEST_TIMEOUT=30000

# Feature Flags (All enabled for production)
ENABLE_AUTHENTICATION=true
ENABLE_RATE_LIMITING=true
ENABLE_METRICS_COLLECTION=true
ENABLE_HEALTH_CHECKS=true
ENABLE_CIRCUIT_BREAKER=true
ENABLE_DISTRIBUTED_TRACING=true

# Monitoring
PROMETHEUS_METRICS_PORT=9464
LOG_LEVEL=warn
LOG_FORMAT=json
JAEGER_ENDPOINT=https://jaeger.monitoring.yourcompany.com/api/traces

# Production Settings
ENABLE_SWAGGER=false
DEBUG_MODE=false
GRACEFUL_SHUTDOWN_TIMEOUT=30000

# Kubernetes
KUBERNETES_NAMESPACE=bytebot-production
KUBERNETES_SERVICE_NAME=bytebot-agent
```

## Security Testing Procedures

### 1. Automated Security Scan
```bash
# Run security validation
npm run security:validate

# Expected: All checks pass, security score 90%+
```

### 2. Penetration Testing Checklist
- [ ] **Authentication bypass attempts**
- [ ] **SQL injection testing**
- [ ] **XSS vulnerability testing**
- [ ] **CORS policy testing**
- [ ] **Rate limiting effectiveness**
- [ ] **JWT token security**
- [ ] **Session management security**

### 3. Load Testing with Security Focus
```bash
# Test authentication under load
artillery run load-test-auth.yml

# Test rate limiting effectiveness
artillery run load-test-rate-limit.yml

# Monitor for security degradation under load
```

## Incident Response Preparation

### Security Monitoring Dashboard
- Authentication success/failure rates
- CORS violation trends
- Rate limiting effectiveness
- Active session counts
- Security event timeline

### Emergency Response Procedures
1. **Immediate Response Scripts**:
   ```bash
   # Revoke all sessions
   kubectl exec deployment/bytebot-agent -- npm run revoke-all-sessions
   
   # Block suspicious IPs
   kubectl patch configmap security-config --patch='{"data":{"blocked_ips":"192.168.1.100"}}'
   
   # Emergency secret rotation
   ./scripts/emergency-secret-rotation.sh
   ```

2. **Communication Plan**:
   - Security team notification
   - Incident commander assignment
   - Stakeholder communication template

### Post-Deployment Verification

Run these tests after deployment:

```bash
# 1. Health check
curl -f https://api.yourcompany.com/health

# 2. Authentication test
curl -X POST https://api.yourcompany.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"invalid"}' \
  # Should return 401

# 3. CORS test
curl -H "Origin: https://malicious.com" \
  https://api.yourcompany.com/api/tasks
  # Should be blocked

# 4. Rate limiting test
for i in {1..110}; do
  curl https://api.yourcompany.com/health
done
# Should get rate limited after 100 requests

# 5. Security headers test
curl -I https://api.yourcompany.com
# Should include security headers
```

## Final Deployment Approval

### Sign-off Checklist
- [ ] **Security Team Approval**: All security requirements met
- [ ] **Infrastructure Team**: Network and container security validated
- [ ] **DevOps Team**: Monitoring and alerting configured
- [ ] **Application Team**: Functionality tested with security enabled
- [ ] **Compliance Team**: Audit logging and data protection verified

### Deployment Go/No-Go Decision
✅ **GO**: All critical requirements met, security score 95%+  
❌ **NO-GO**: Critical security issues remain, score < 90%

---

**Remember**: Security is not a one-time setup. Regularly review and update security configurations, rotate secrets, and monitor for new threats.

**Emergency Contact**: security-team@yourcompany.com  
**On-Call**: +1-555-SECURITY