# Bytebot Platform Security Middleware Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the standardized security middleware framework across all Bytebot microservices. The framework ensures consistent security posture with service-specific configurations.

## Security Levels by Service

### BytebotD (Computer Control Service)
- **Security Level**: MAXIMUM
- **Features**: VNC support, computer control operations
- **Rate Limits**: Very strict (3 auth attempts per 15 min)
- **Validation**: Maximum sanitization and threat detection

### Bytebot-Agent (Task Management API)
- **Security Level**: HIGH  
- **Features**: API endpoints, task management, Swagger docs
- **Rate Limits**: Moderate (5 auth attempts per 15 min)
- **Validation**: High security with API-friendly settings

### Bytebot-UI (Frontend Service)
- **Security Level**: STANDARD
- **Features**: Next.js optimization, UI interactions, real-time updates
- **Rate Limits**: Lenient (10 auth attempts per 15 min)
- **Validation**: Standard security with UI-friendly settings

## Deployment Steps

### 1. Update Service Main Files

#### BytebotD Main File (`packages/bytebotd/src/main.ts`)

```typescript
import { BytebotDSecurityDeployment } from './security/security-config.deployment';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Deploy BytebotD security middleware
  await BytebotDSecurityDeployment.applySecurityToApp(app, configService);

  // Validate security configuration
  const securityValidation = BytebotDSecurityDeployment.validateSecurityConfig(configService);
  
  if (!securityValidation.valid) {
    console.error('Security configuration errors:', securityValidation.errors);
    process.exit(1);
  }

  if (securityValidation.warnings.length > 0) {
    console.warn('Security configuration warnings:', securityValidation.warnings);
  }

  await app.listen(9990);
  console.log('BytebotD running with MAXIMUM security configuration');
}
```

#### Bytebot-Agent Main File (`packages/bytebot-agent/src/main.ts`)

```typescript
import { BytebotAgentSecurityDeployment } from './security/security-config.deployment';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Deploy Bytebot-Agent security middleware
  await BytebotAgentSecurityDeployment.applySecurityToApp(app, configService);

  // Configure Swagger with security settings
  const swaggerConfig = BytebotAgentSecurityDeployment.configureSwagger(app, configService);
  if (swaggerConfig) {
    // Setup Swagger documentation
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);
  }

  // Validate security configuration
  const securityValidation = BytebotAgentSecurityDeployment.validateSecurityConfig(configService);
  
  if (!securityValidation.valid) {
    console.error('Security configuration errors:', securityValidation.errors);
    process.exit(1);
  }

  await app.listen(9991);
  console.log('Bytebot-Agent running with HIGH security configuration');
}
```

#### Bytebot-UI Main File (`packages/bytebot-ui/server.ts`)

```typescript
import { BytebotUISecurityDeployment } from './src/security/security-config.deployment';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Deploy Bytebot-UI security middleware
  await BytebotUISecurityDeployment.applySecurityToApp(app, configService);

  // Configure Next.js security
  const nextSecurityConfig = BytebotUISecurityDeployment.configureNextJsSecurity(configService);
  
  // Apply Next.js security middleware
  app.use(helmet(nextSecurityConfig));

  // Validate security configuration
  const securityValidation = BytebotUISecurityDeployment.validateSecurityConfig(configService);
  
  if (!securityValidation.valid) {
    console.error('Security configuration errors:', securityValidation.errors);
    process.exit(1);
  }

  await app.listen(3000);
  console.log('Bytebot-UI running with STANDARD security configuration');
}
```

### 2. Update Service App Modules

#### BytebotD App Module

```typescript
import { BytebotDSecurityModule } from './security/security-config.deployment';

@Module({
  imports: [
    ConfigModule.forRoot(),
    BytebotDSecurityModule, // Import security module
    // ... other modules
  ],
  // ... rest of module configuration
})
export class AppModule {}
```

#### Bytebot-Agent App Module

```typescript
import { BytebotAgentSecurityModule } from './security/security-config.deployment';

@Module({
  imports: [
    ConfigModule.forRoot(),
    BytebotAgentSecurityModule, // Import security module
    // ... other modules
  ],
  // ... rest of module configuration
})
export class AppModule {}
```

#### Bytebot-UI App Module

```typescript
import { BytebotUISecurityModule } from './security/security-config.deployment';

@Module({
  imports: [
    ConfigModule.forRoot(),
    BytebotUISecurityModule, // Import security module
    // ... other modules
  ],
  // ... rest of module configuration
})
export class AppModule {}
```

### 3. Environment Configuration

#### Required Environment Variables

```bash
# Common security settings
NODE_ENV=production|development|staging
JWT_SECRET=your-jwt-secret-key
DATABASE_URL=your-database-connection-string
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# CORS settings
CORS_ORIGINS=https://app.bytebot.ai,https://bytebot.ai

# Service-specific settings
# BytebotD
BYTEBOT_DESKTOP_VNC_URL=vnc://localhost:5900

# Bytebot-Agent
API_PROXY_URL=http://localhost:9990

# Bytebot-UI
STATIC_FILES_PATH=./public
NEXT_CONFIG=./next.config.js
```

#### Redis Configuration for Rate Limiting

```bash
# Redis setup for rate limiting backend
docker run -d \
  --name bytebot-redis \
  -p 6379:6379 \
  -e REDIS_PASSWORD=your-secure-password \
  redis:7-alpine \
  redis-server --requirepass your-secure-password
```

### 4. Service-Specific Rate Limiting Decorators

#### Usage in Controllers

```typescript
import { StandardizedRateLimit, RateLimitPreset, RateLimitServiceType } from '@bytebot/shared';

@Controller('auth')
export class AuthController {
  @Post('login')
  @StandardizedRateLimit(RateLimitPreset.AUTH, RateLimitServiceType.BYTEBOTD)
  async login(@Body() credentials: AuthCredentialsDto) {
    // Login implementation
  }

  @Post('computer-control')
  @StandardizedRateLimit(RateLimitPreset.COMPUTER_USE, RateLimitServiceType.BYTEBOTD)
  async executeComputerAction(@Body() action: ComputerActionDto) {
    // Computer control implementation
  }
}
```

### 5. Security Headers Validation

Each service will automatically include security-appropriate headers:

#### BytebotD Headers
```
X-Service: BytebotD
X-Security-Level: MAXIMUM
X-Computer-Control: true
X-VNC-Enabled: true
X-Frame-Options: SAMEORIGIN
```

#### Bytebot-Agent Headers
```
X-Service: Bytebot-Agent  
X-Security-Level: HIGH
X-API-Version: 2.0
X-Task-Management: true
X-Frame-Options: DENY
```

#### Bytebot-UI Headers
```
X-Service: Bytebot-UI
X-Security-Level: STANDARD
X-UI-Version: 2.0
X-Framework: Next.js
X-Frame-Options: SAMEORIGIN
```

### 6. Testing Security Configuration

#### Security Configuration Validation

```typescript
// Test security configuration
import { BytebotDSecurityDeployment } from './security/security-config.deployment';

describe('Security Configuration', () => {
  it('should validate BytebotD security config', () => {
    const configService = new ConfigService();
    const validation = BytebotDSecurityDeployment.validateSecurityConfig(configService);
    
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
```

#### Rate Limiting Tests

```typescript
describe('Rate Limiting', () => {
  it('should enforce strict authentication limits for BytebotD', async () => {
    // Make 4 requests (exceeds limit of 3)
    for (let i = 0; i < 4; i++) {
      const response = await request(app).post('/auth/login');
      if (i < 3) {
        expect(response.status).not.toBe(429);
      } else {
        expect(response.status).toBe(429);
        expect(response.headers['x-ratelimit-service']).toBe('bytebotd');
      }
    }
  });
});
```

## Monitoring and Logging

### Security Event Logging

All security events are automatically logged with structured data:

```json
{
  "eventId": "sec_1703123456789_abc123def",
  "type": "rate_limit.exceeded",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "serviceType": "bytebotd",
  "securityLevel": "strict",
  "userId": "user_123",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "endpoint": "/auth/login",
  "method": "POST",
  "success": false,
  "riskScore": 60,
  "metadata": {
    "limit": 3,
    "remaining": 0,
    "retryAfter": 900
  }
}
```

### Metrics Collection

Security metrics are available through standard endpoints:

- `/metrics/security` - Security event statistics
- `/metrics/rate-limiting` - Rate limiting statistics  
- `/health/security` - Security middleware health check

## Production Deployment Checklist

### Pre-Deployment
- [ ] Update all service main files with security deployment
- [ ] Configure environment variables for each service
- [ ] Set up Redis for rate limiting backend
- [ ] Test security configuration validation
- [ ] Run security-focused integration tests

### Deployment
- [ ] Deploy BytebotD with MAXIMUM security
- [ ] Deploy Bytebot-Agent with HIGH security  
- [ ] Deploy Bytebot-UI with STANDARD security
- [ ] Verify security headers in responses
- [ ] Test rate limiting across all services

### Post-Deployment
- [ ] Monitor security event logs
- [ ] Verify rate limiting enforcement
- [ ] Check CORS functionality
- [ ] Validate JWT authentication flow
- [ ] Confirm CSP policies are working

### Security Monitoring
- [ ] Set up alerts for security events
- [ ] Monitor rate limiting violations
- [ ] Track authentication failures
- [ ] Review security configuration quarterly
- [ ] Update security policies as needed

## Troubleshooting

### Common Issues

1. **Rate Limiting Too Strict**
   - Adjust service-specific limits in security config
   - Consider user authentication status for limit adjustments

2. **CORS Errors**  
   - Verify CORS_ORIGINS environment variable
   - Check service-specific CORS configurations

3. **CSP Violations**
   - Review Content Security Policy directives
   - Add necessary domains to allowlist

4. **Redis Connection Issues**
   - Verify Redis host/port configuration
   - Check Redis authentication credentials
   - Ensure Redis is running and accessible

### Debug Commands

```bash
# Test security headers
curl -I http://localhost:9990/health

# Test rate limiting
for i in {1..10}; do curl http://localhost:9990/auth/login; done

# Check Redis connection
redis-cli -h localhost -p 6379 ping

# View security logs
docker logs bytebot-app | grep "security"
```

This comprehensive deployment framework ensures consistent, enterprise-grade security across all Bytebot microservices while maintaining service-specific optimizations.