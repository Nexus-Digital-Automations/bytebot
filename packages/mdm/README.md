# Mobile Device Management (MDM) Platform

## Overview

The MDM Platform is an enterprise-grade mobile device management solution that provides comprehensive device policy enforcement, application distribution, security monitoring, and compliance reporting. Built with TypeScript and NestJS, it follows a local-only architecture with PARLANT conversational AI integration.

## Features

### 🔐 Device Management
- **Device Enrollment**: Automated device registration and provisioning
- **Lifecycle Management**: Complete device lifecycle from enrollment to retirement
- **Real-time Monitoring**: Device status, location, and health monitoring
- **Remote Operations**: Remote wipe, lock, and configuration commands

### 📋 Policy Management
- **Policy Templates**: Pre-built policy templates for common scenarios
- **Compliance Enforcement**: Automated policy compliance monitoring
- **Violation Handling**: Automated remediation and escalation
- **Custom Policies**: Flexible policy creation and management

### 📱 Application Management
- **Enterprise App Store**: Private app distribution and management
- **App Installation**: Remote app deployment and updates
- **License Management**: Application license tracking and compliance
- **Security Scanning**: Automated vulnerability assessment

### 🛡️ Security Management
- **Threat Detection**: Real-time security threat monitoring
- **Encryption Enforcement**: Device and data encryption policies
- **Remote Wipe**: Secure data removal capabilities
- **Security Auditing**: Comprehensive security event logging

### 📊 Asset Tracking
- **Inventory Management**: Complete device and asset inventory
- **Depreciation Tracking**: Asset valuation and lifecycle costing
- **Warranty Management**: Warranty tracking and maintenance scheduling
- **Reporting**: Comprehensive asset reporting and analytics

### 📈 Compliance & Reporting
- **Regulatory Compliance**: GDPR, HIPAA, SOX, ISO27001 compliance
- **Audit Trails**: Comprehensive audit logging and reporting
- **Compliance Dashboards**: Real-time compliance monitoring
- **Automated Reports**: Scheduled compliance and security reports

## Architecture

### Local-Only Design
- **SQLite Database**: High-performance local database with enterprise optimizations
- **No Cloud Dependencies**: 100% local deployment (except AI services)
- **Docker Compose**: Simple local deployment and scaling
- **File-based Storage**: Local asset and configuration storage

### Security-First Approach
- **JWT Authentication**: Secure token-based authentication
- **RBAC Authorization**: Role-based access control
- **API Security**: Rate limiting, validation, and audit logging
- **Encryption**: End-to-end encryption for sensitive data

### PARLANT Integration
- **Conversational Validation**: AI-powered operation validation
- **Risk Assessment**: Intelligent risk analysis and recommendations
- **Context-Aware Decisions**: Smart policy and security decisions
- **Learning System**: Adaptive AI that learns from usage patterns

## Installation

### Prerequisites
- Node.js 18+
- pnpm 8+
- Docker & Docker Compose (optional)

### Development Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run start:dev

# Run tests
pnpm run test

# Run tests with coverage
pnpm run test:cov

# Build for production
pnpm run build
```

### Production Deployment

```bash
# Build the application
pnpm run build

# Start production server
pnpm run start:prod
```

### Docker Deployment

```bash
# Build and start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f mdm

# Stop services
docker-compose down
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MDM_PORT` | Application port | `3003` |
| `MDM_DATABASE_PATH` | SQLite database path | `./data/mdm.sqlite` |
| `MDM_JWT_SECRET` | JWT secret key | `mdm-super-secret-key` |
| `MDM_PARLANT_ENABLED` | Enable PARLANT integration | `false` |
| `MDM_PARLANT_ENDPOINT` | PARLANT service endpoint | `http://localhost:8000` |

### Security Configuration

```env
# JWT Configuration
MDM_JWT_SECRET=your-super-secret-jwt-key
MDM_JWT_EXPIRES_IN=24h

# Security Policies
MDM_REQUIRE_DEVICE_ENCRYPTION=true
MDM_REQUIRE_DEVICE_PASSCODE=true
MDM_ALLOW_JAILBROKEN_DEVICES=false

# Rate Limiting
MDM_RATE_LIMIT_WINDOW=900000
MDM_RATE_LIMIT_MAX=1000
```

## API Documentation

### Swagger UI
Access interactive API documentation at: `http://localhost:3003/api/docs`

### Core Endpoints

#### Device Management
- `POST /api/v1/devices` - Register new device
- `GET /api/v1/devices` - List all devices
- `GET /api/v1/devices/:id` - Get device details
- `PUT /api/v1/devices/:id` - Update device
- `DELETE /api/v1/devices/:id` - Remove device
- `POST /api/v1/devices/:id/wipe` - Remote wipe device

#### Policy Management
- `POST /api/v1/policies` - Create policy
- `GET /api/v1/policies` - List policies
- `PUT /api/v1/policies/:id` - Update policy
- `POST /api/v1/policies/:id/assign` - Assign policy to devices

#### Application Management
- `POST /api/v1/applications` - Upload application
- `GET /api/v1/applications` - List applications
- `POST /api/v1/applications/:id/install` - Install on devices
- `DELETE /api/v1/applications/:id` - Remove application

## Testing

### Unit Tests
```bash
# Run unit tests
pnpm run test:unit

# Run with coverage
pnpm run test:cov
```

### Integration Tests
```bash
# Run integration tests
pnpm run test:integration

# Run end-to-end tests
pnpm run test:e2e
```

### Performance Tests
```bash
# Run performance tests
pnpm run test:perf
```

## Performance

### Optimization Features
- **SQLite WAL Mode**: Write-Ahead Logging for better concurrency
- **Connection Pooling**: Efficient database connection management
- **Caching Layer**: Redis-compatible caching for improved performance
- **Compression**: Response compression for reduced bandwidth

### Performance Targets
- **Response Time**: < 100ms for device operations
- **Policy Updates**: < 30 seconds for policy distribution
- **Database Operations**: < 50ms for typical queries
- **Concurrent Users**: 1000+ simultaneous connections

## Security

### Authentication & Authorization
- **JWT Tokens**: Secure, stateless authentication
- **RBAC**: Fine-grained role-based access control
- **MFA Support**: Multi-factor authentication integration
- **Session Management**: Secure session handling

### Data Protection
- **Encryption at Rest**: SQLite database encryption
- **Encryption in Transit**: TLS 1.3 for all communications
- **Key Management**: Secure key rotation and storage
- **Audit Logging**: Comprehensive security event logging

### Compliance
- **GDPR**: Full GDPR compliance with data protection
- **HIPAA**: Healthcare data protection compliance
- **SOX**: Financial compliance and audit trails
- **ISO27001**: Information security management

## Monitoring & Observability

### Health Checks
- `GET /api/v1/health` - Overall system health
- `GET /api/v1/health/readiness` - Service readiness
- `GET /api/v1/health/liveness` - Service liveness

### Metrics
- **Performance Metrics**: Response times, throughput, errors
- **Business Metrics**: Device enrollment, policy compliance
- **Security Metrics**: Failed authentication, policy violations
- **System Metrics**: CPU, memory, disk usage

### Logging
- **Structured Logging**: JSON-formatted logs with context
- **Log Levels**: Configurable log levels (debug, info, warn, error)
- **Audit Logs**: Security and compliance audit trails
- **Performance Logs**: Operation timing and performance data

## Development

### Code Quality
- **TypeScript Strict Mode**: Full type safety
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks

### Testing Strategy
- **Unit Tests**: 90%+ code coverage requirement
- **Integration Tests**: Full API endpoint testing
- **E2E Tests**: Complete user workflow testing
- **Performance Tests**: Load and stress testing

### Contributing
1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Run quality checks: `pnpm run lint && pnpm run test`
5. Submit pull request

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database file permissions
ls -la ./data/mdm.sqlite

# Verify SQLite installation
sqlite3 --version

# Test database connection
sqlite3 ./data/mdm.sqlite "SELECT 1;"
```

#### Performance Issues
```bash
# Check system resources
htop

# Monitor database performance
sqlite3 ./data/mdm.sqlite "PRAGMA optimize;"

# Clear application cache
rm -rf node_modules/.cache
```

#### PARLANT Integration Issues
```bash
# Test PARLANT connectivity
curl -X GET http://localhost:8000/health

# Check PARLANT logs
docker-compose logs parlant

# Verify API key configuration
echo $MDM_PARLANT_API_KEY
```

## Support

### Documentation
- **API Reference**: Available at `/api/docs` when running
- **Architecture Guide**: See `docs/architecture.md`
- **Security Guide**: See `docs/security.md`
- **Deployment Guide**: See `docs/deployment.md`

### Community
- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Join community discussions
- **Documentation**: Contribute to documentation improvements

## License

Copyright (c) 2024 Bytebot. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.