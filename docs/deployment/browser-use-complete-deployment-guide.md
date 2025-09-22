# Browser-Use Complete Integration Deployment Guide

## 🚀 Comprehensive Browser-Use Integration for Bytebot

This guide provides step-by-step instructions for deploying the complete Browser-Use integration in Bytebot with 100% local-only architecture compliance.

### 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [System Requirements](#system-requirements)
3. [Installation Process](#installation-process)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Docker Deployment](#docker-deployment)
7. [Testing & Validation](#testing--validation)
8. [Monitoring & Observability](#monitoring--observability)
9. [Troubleshooting](#troubleshooting)
10. [Production Considerations](#production-considerations)

---

## 🎯 Quick Start

For immediate deployment with default settings:

```bash
# Clone and setup
git clone <repository-url>
cd bytebot/packages/bytebot-agent

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start with Docker Compose (recommended)
docker-compose up -d

# Verify deployment
curl http://localhost:9991/health
curl http://localhost:8080/health
```

**✅ Expected Result**: All services healthy and responding

---

## 🔧 System Requirements

### Minimum Requirements
- **CPU**: 4 cores (8 recommended)
- **RAM**: 8GB (16GB recommended)
- **Storage**: 50GB free space
- **Network**: Local network access only

### Software Requirements
- **Node.js**: v18.0+ with npm
- **Python**: 3.9+ with pip
- **Docker**: 20.10+ with Docker Compose v2
- **PostgreSQL**: 13+ (if not using Docker)
- **Redis**: 6+ (if not using Docker)

### Operating System Support
- **Linux**: Ubuntu 20.04+, CentOS 8+, RHEL 8+
- **macOS**: 10.15+ (Catalina)
- **Windows**: WSL2 with Ubuntu 20.04+

---

## 📦 Installation Process

### Step 1: Environment Setup

```bash
# Create project directory
mkdir -p ~/bytebot-deployment
cd ~/bytebot-deployment

# Clone repository
git clone <repository-url> .
cd bytebot/packages/bytebot-agent

# Verify Node.js version
node --version  # Should be v18.0+
npm --version   # Should be 8.0+

# Verify Python version
python3 --version  # Should be 3.9+
pip3 --version     # Should be 21.0+

# Verify Docker
docker --version         # Should be 20.10+
docker-compose --version # Should be v2.0+
```

### Step 2: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (for browser-use service)
cd docker/browser-use
pip3 install -r requirements.txt
cd ../..

# Verify installation
npm run build  # Should complete without errors
```

### Step 3: Create Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Generate secure secrets
export JWT_SECRET=$(openssl rand -base64 32)
export ENCRYPTION_KEY=$(openssl rand -base64 32)
export POSTGRES_PASSWORD=$(openssl rand -base64 16)
export REDIS_PASSWORD=$(openssl rand -base64 16)
export BROWSER_USE_API_KEY=$(openssl rand -base64 16)

# Update .env file
cat > .env << EOF
# Core Configuration
NODE_ENV=production
PORT=9991

# Database Configuration (Local PostgreSQL)
DATABASE_URL=postgresql://bytebot_user:${POSTGRES_PASSWORD}@localhost:5432/bytebot_production
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Redis Configuration (Local Redis)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# Security Configuration
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Browser-Use Integration Configuration
BROWSER_USE_ENABLED=true
BROWSER_USE_SERVICE_URL=http://localhost:8080
BROWSER_USE_API_KEY=${BROWSER_USE_API_KEY}
BROWSER_USE_PYTHON_PATH=/usr/bin/python3
BROWSER_USE_WORKING_DIR=/app/data/browser-use
BROWSER_USE_HEADLESS=true
BROWSER_USE_SCREENSHOTS=true
BROWSER_USE_VIDEO_RECORDING=false
BROWSER_USE_MAX_SESSIONS=10
BROWSER_USE_SESSION_TIMEOUT=600000

# Chrome Configuration
CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome
BROWSER_USE_USER_DATA_DIR=/app/data/chrome-user-data

# API Configuration
API_RATE_LIMIT_WINDOW=900000
API_RATE_LIMIT_MAX_REQUESTS=100
API_CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Optional: AI Service API Keys (Only cloud dependency)
# ANTHROPIC_API_KEY=your_anthropic_key_here
# OPENAI_API_KEY=your_openai_key_here
# GEMINI_API_KEY=your_gemini_key_here
EOF
```

---

## 🗄️ Database Setup

### Option 1: Docker Deployment (Recommended)

The database setup is handled automatically by Docker Compose. Skip to [Docker Deployment](#docker-deployment).

### Option 2: Manual PostgreSQL Setup

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Or on macOS with Homebrew
brew install postgresql
brew services start postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE bytebot_production;
CREATE USER bytebot_user WITH ENCRYPTED PASSWORD '${POSTGRES_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE bytebot_production TO bytebot_user;
\q
EOF

# Run database migrations
npm run prisma:prod  # Runs migrate deploy + generate
```

### Database Schema Validation

```bash
# Verify database schema
npx prisma db pull
npx prisma validate

# Check tables are created
psql -h localhost -U bytebot_user -d bytebot_production -c "\dt"

# Expected tables:
# - users, user_sessions, role_permissions
# - Task, Message, Summary, File
# - browser_sessions, browser_tasks, browser_task_steps
# - browser_screenshots, browser_dom_snapshots
# - browser_form_data, browser_data_extractions
```

---

## 🐳 Docker Deployment

### Complete Stack Deployment

```bash
# Ensure Docker daemon is running
sudo systemctl start docker  # Linux
# brew services start docker  # macOS

# Create required directories
mkdir -p data/{postgres,redis,chrome-user-data,browser-use,screenshots,logs}

# Deploy complete stack
docker-compose up -d

# Verify all services are healthy
docker-compose ps

# Expected output:
# bytebot-agent         healthy
# browser-use-service   healthy
# bytebot-postgres      healthy
# bytebot-redis         healthy
# bytebot-pgbouncer     healthy
# bytebot-nginx         healthy
# bytebot-prometheus    healthy
# bytebot-grafana       healthy
```

### Individual Service Management

```bash
# Start specific services
docker-compose up -d postgres redis pgbouncer
docker-compose up -d browser-use
docker-compose up -d bytebot-agent

# View logs
docker-compose logs -f bytebot-agent
docker-compose logs -f browser-use

# Restart services
docker-compose restart bytebot-agent browser-use

# Scale browser-use service
docker-compose up -d --scale browser-use=3
```

### Service Health Monitoring

```bash
# Check service health endpoints
curl http://localhost:9991/health    # Bytebot Agent
curl http://localhost:8080/health    # Browser-Use Service
curl http://localhost:8081/health    # Browser-Use Health Check

# Database connectivity
curl http://localhost:9991/database/health

# Redis connectivity
redis-cli -h localhost -p 6379 ping

# Container resource usage
docker stats bytebot-agent browser-use-service
```

---

## 🧪 Testing & Validation

### Automated Test Suite

```bash
# Run comprehensive test suite
npm test                    # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests

# Browser-Use specific tests
npm test src/browser-use/__tests__/

# Test results should show:
# ✅ All unit tests passing
# ✅ All integration tests passing
# ✅ All API endpoints responding
# ✅ Database connectivity verified
# ✅ Browser automation functional
```

### Manual Validation Steps

```bash
# 1. API Health Check
curl -X GET http://localhost:9991/health \
  -H "Content-Type: application/json"
# Expected: {"status":"healthy","service":"bytebot-agent"}

# 2. Create Browser Session
curl -X POST http://localhost:9991/browser-use/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Session",
    "description": "Manual validation test",
    "profile": {
      "headless": true,
      "windowWidth": 1280,
      "windowHeight": 720
    }
  }'
# Expected: {"success":true,"sessionId":"uuid","processId":"number"}

# 3. Create Browser Task
curl -X POST http://localhost:9991/browser-use/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "navigation",
    "sessionId": "SESSION_ID_FROM_STEP_2",
    "startUrl": "https://example.com",
    "actions": [
      {
        "type": "navigate",
        "url": "https://example.com"
      },
      {
        "type": "screenshot",
        "filename": "test-screenshot.png"
      }
    ],
    "options": {
      "screenshots": true,
      "timeout": 30000
    }
  }'
# Expected: {"success":true,"taskId":"uuid","queuePosition":0}

# 4. Check Task Status
curl -X GET http://localhost:9991/browser-use/tasks/{TASK_ID}/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Expected: {"success":true,"status":"completed","progress":100}
```

### Performance Validation

```bash
# Load testing with Apache Bench
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_JWT_TOKEN" \
   http://localhost:9991/browser-use/health

# Expected results:
# - Requests per second: >50
# - Time per request: <200ms
# - Failed requests: 0

# Memory usage validation
docker stats --no-stream | grep bytebot
# Expected: Memory usage <2GB for agent, <1GB for browser-use
```

---

## 📊 Monitoring & Observability

### Prometheus Metrics

Access Prometheus at http://localhost:9090

**Key Metrics to Monitor:**
- `browser_use_active_sessions`
- `browser_use_task_execution_time`
- `browser_use_success_rate`
- `browser_use_memory_usage`
- `http_requests_total`
- `http_request_duration_seconds`

### Grafana Dashboards

Access Grafana at http://localhost:3001 (admin/secure_grafana_password)

**Pre-configured Dashboards:**
- Bytebot Agent Overview
- Browser-Use Performance
- Database Performance
- System Resources
- API Request Analytics

### Log Aggregation

```bash
# View centralized logs
docker-compose logs -f --tail=100

# Filter specific service logs
docker-compose logs -f bytebot-agent | grep ERROR
docker-compose logs -f browser-use | grep "session_created"

# Access log files
ls -la data/logs/
tail -f data/logs/bytebot-agent.log
tail -f data/logs/browser-use.log
```

### Health Check Endpoints

```bash
# Service health
curl http://localhost:9991/health
curl http://localhost:8080/health

# Detailed health with metrics
curl http://localhost:9991/health/detailed
curl http://localhost:8080/metrics

# Database health
curl http://localhost:9991/database/health

# Browser service status
curl http://localhost:8080/status
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Issue 1: Browser-Use Service Not Starting

```bash
# Check browser-use logs
docker-compose logs browser-use

# Common causes:
# 1. Chrome not installed in container
# 2. Insufficient memory
# 3. Missing dependencies

# Solution: Rebuild browser-use container
docker-compose down browser-use
docker-compose build --no-cache browser-use
docker-compose up -d browser-use
```

#### Issue 2: Database Connection Failures

```bash
# Check PostgreSQL status
docker-compose logs postgres

# Verify connection string
echo $DATABASE_URL

# Test connection manually
psql $DATABASE_URL -c "SELECT version();"

# Reset database (CAUTION: Data loss)
docker-compose down postgres
docker volume rm bytebot_postgres_data
docker-compose up -d postgres
npm run prisma:prod
```

#### Issue 3: Chrome Process Failures

```bash
# Check Chrome executable
docker exec -it browser-use-service which google-chrome

# Check Chrome version
docker exec -it browser-use-service google-chrome --version

# Test Chrome startup
docker exec -it browser-use-service google-chrome --headless --no-sandbox --dump-dom about:blank

# Fix permissions
docker-compose exec browser-use chmod +x /usr/bin/google-chrome
```

#### Issue 4: Memory Issues

```bash
# Check container memory usage
docker stats --no-stream

# Increase memory limits in docker-compose.yml
# For browser-use service:
deploy:
  resources:
    limits:
      memory: 4G  # Increase from 2G
    reservations:
      memory: 1G
```

#### Issue 5: Network Connectivity

```bash
# Test inter-service communication
docker exec -it bytebot-agent curl http://browser-use:8080/health
docker exec -it browser-use curl http://bytebot-agent:9991/health

# Check Docker network
docker network inspect bytebot_bytebot-network

# Restart networking
docker-compose down
docker-compose up -d
```

### Debug Mode

```bash
# Enable debug logging
export NODE_ENV=development
export LOG_LEVEL=debug
export BROWSER_USE_LOG_LEVEL=DEBUG

# Restart with debug logs
docker-compose down
docker-compose up -d

# View debug logs
docker-compose logs -f | grep DEBUG
```

---

## 🚀 Production Considerations

### Security Hardening

```bash
# 1. Update default passwords
# Generate new secure passwords
export NEW_POSTGRES_PASSWORD=$(openssl rand -base64 32)
export NEW_REDIS_PASSWORD=$(openssl rand -base64 32)

# 2. Enable HTTPS
# Update nginx configuration for SSL/TLS
# Place certificates in docker/nginx/ssl/

# 3. Firewall configuration
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 9991/tcp   # Block direct API access
sudo ufw deny 8080/tcp   # Block direct browser-use access
```

### Performance Optimization

```bash
# 1. Database optimization
# Edit docker/postgres/postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# 2. Browser-use scaling
# Scale browser-use service
docker-compose up -d --scale browser-use=5

# 3. Connection pooling
# PgBouncer is already configured
# Adjust pool sizes in docker-compose.yml if needed
```

### Backup Strategy

```bash
# 1. Database backup
docker exec bytebot-postgres pg_dump -U bytebot_user bytebot_production > backup_$(date +%Y%m%d).sql

# 2. Volume backup
docker run --rm -v bytebot_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data.tar.gz /data

# 3. Configuration backup
tar czf config_backup_$(date +%Y%m%d).tar.gz docker/ .env

# 4. Automated backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Database backup
docker exec bytebot-postgres pg_dump -U bytebot_user bytebot_production > $BACKUP_DIR/database.sql

# Volume backups
docker run --rm -v bytebot_postgres_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/postgres_data.tar.gz /data
docker run --rm -v bytebot_redis_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/redis_data.tar.gz /data

# Configuration backup
tar czf $BACKUP_DIR/config.tar.gz docker/ .env

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x backup.sh
# Run daily via cron: 0 2 * * * /path/to/backup.sh
```

### Monitoring in Production

```bash
# 1. Setup alerting rules in Prometheus
# Edit docker/prometheus/alert_rules.yml

# 2. Configure notification channels in Grafana
# Setup email/Slack notifications for critical alerts

# 3. Log rotation
# Configure logrotate for application logs
cat > /etc/logrotate.d/bytebot << EOF
/path/to/bytebot/data/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
```

---

## ✅ Deployment Verification Checklist

### Pre-deployment Checklist
- [ ] System requirements met
- [ ] All dependencies installed
- [ ] Environment configuration complete
- [ ] SSL certificates configured (production)
- [ ] Firewall rules configured
- [ ] Backup strategy implemented

### Post-deployment Checklist
- [ ] All services healthy
- [ ] API endpoints responding
- [ ] Database connectivity verified
- [ ] Browser automation functional
- [ ] Monitoring dashboards active
- [ ] Log aggregation working
- [ ] Performance metrics within limits
- [ ] Security hardening applied

### Ongoing Maintenance
- [ ] Regular backup verification
- [ ] Security updates applied
- [ ] Performance monitoring
- [ ] Log rotation configured
- [ ] Alert notifications tested
- [ ] Documentation updated

---

## 📚 Additional Resources

### Configuration References
- [Environment Variables Guide](../configuration/environment-variables.md)
- [Docker Compose Reference](../configuration/docker-compose-reference.md)
- [Database Schema Documentation](../database/schema-documentation.md)

### API Documentation
- [Browser-Use API Reference](../api/browser-use-api-reference.md)
- [Authentication Guide](../authentication/jwt-authentication.md)
- [Rate Limiting Configuration](../configuration/rate-limiting.md)

### Troubleshooting Resources
- [Browser-Use Troubleshooting](../troubleshooting/browser-use-troubleshooting.md)
- [Performance Optimization](../performance/browser-use-performance-optimization.md)
- [Security Best Practices](../security/security-best-practices.md)

---

## 🆘 Support and Community

### Getting Help
- **Documentation**: Check the comprehensive docs in `/docs`
- **Issues**: Report bugs via GitHub issues
- **Community**: Join our Discord community
- **Enterprise Support**: Contact for enterprise-grade support

### Contributing
- **Bug Reports**: Use GitHub issues with detailed reproduction steps
- **Feature Requests**: Discuss in community forums first
- **Pull Requests**: Follow contribution guidelines

---

**✅ Deployment Complete!**

Your Browser-Use integration is now fully deployed and operational. The system provides comprehensive browser automation capabilities with enterprise-grade security, monitoring, and local-only architecture compliance.

**Next Steps:**
1. Configure your first browser automation workflows
2. Set up monitoring alerts for your environment
3. Implement backup and disaster recovery procedures
4. Train your team on the API usage and best practices