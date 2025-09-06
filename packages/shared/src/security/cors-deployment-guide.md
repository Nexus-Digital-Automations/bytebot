# CORS & Security Headers Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying production-grade CORS (Cross-Origin Resource Sharing) security configuration and standardized security headers across all Bytebot microservices.

## Architecture

### Services Covered
- **Bytebot-Agent**: API-focused CORS for task management and authentication
- **BytebotD**: Desktop service with VNC viewer and WebSocket support
- **Bytebot-UI**: Frontend security with asset loading and proxy configurations

### Security Features Implemented
- ✅ Environment-aware CORS policies with strict origin validation
- ✅ Production-grade Content Security Policy (CSP) headers
- ✅ HTTP Strict Transport Security (HSTS) with proper duration
- ✅ Comprehensive security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ WebSocket security configurations
- ✅ Rate limiting integration
- ✅ Security violation logging and monitoring

## Quick Start

### 1. Update Dependencies

Ensure all services have the required security dependencies:

```bash
# Install helmet for security headers
npm install helmet

# Install cors for CORS handling  
npm install cors

# Install types
npm install -D @types/helmet @types/cors
```

### 2. Import Shared Security Middleware

```typescript
import {
  createHelmetConfig,
  createCorsConfig, 
  createSecurityHeadersMiddleware,
  getSecurityConfig
} from '@bytebot/shared';
```

### 3. Apply Security Configuration

#### For Bytebot-Agent:
```typescript
import helmet from 'helmet';
import cors from 'cors';

const config = getSecurityConfig('Bytebot-Agent', process.env.NODE_ENV);
app.use(helmet(createHelmetConfig(config)));
app.use(cors(createCorsConfig(config)));
app.use(createSecurityHeadersMiddleware(config));
```

#### For BytebotD:
```typescript
const config = getSecurityConfig('BytebotD', process.env.NODE_ENV);
app.use(helmet(createHelmetConfig(config)));
app.use(cors(createCorsConfig(config)));
app.use(createSecurityHeadersMiddleware(config));
```

#### For Bytebot-UI:
```typescript
const config = getSecurityConfig('Bytebot-UI', process.env.NODE_ENV);
app.use(helmet(createHelmetConfig(config)));
app.use(cors(createCorsConfig(config)));
app.use(createSecurityHeadersMiddleware(config));
```

## Environment Configuration

### Development
- Relaxed CORS policies for localhost development
- CSP in report-only mode
- Swagger UI support enabled
- Detailed security event logging

```typescript
const devConfig = {
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:9990',
    'http://localhost:9991',
    'http://localhost:9992'
  ],
  security: {
    enforceHTTPS: false,
    enableHSTS: false,
    strictOriginValidation: false
  }
};
```

### Staging
- Moderate security policies
- HTTPS enforcement
- Limited localhost access for testing
- CSP enforcement enabled

```typescript
const stagingConfig = {
  allowedOrigins: [
    'https://staging.bytebot.ai',
    'https://staging-app.bytebot.ai'
  ],
  security: {
    enforceHTTPS: true,
    enableHSTS: true,
    strictOriginValidation: true
  }
};
```

### Production
- Strict security policies
- Full HSTS with preload
- CSP enforcement
- Comprehensive logging

```typescript
const productionConfig = {
  allowedOrigins: [
    'https://bytebot.ai',
    'https://app.bytebot.ai',
    'https://api.bytebot.ai'
  ],
  security: {
    enforceHTTPS: true,
    enableHSTS: true,
    strictOriginValidation: true
  }
};
```

## Security Headers Reference

### Content Security Policy (CSP)
```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' wss: https://api.bytebot.ai; object-src 'none'; media-src 'self' blob:; frame-src 'none'; base-uri 'self'; form-action 'self'
```

### HTTP Strict Transport Security (HSTS)
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Additional Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: cross-origin
```

## CORS Configuration

### Production Origins
```typescript
const allowedOrigins = [
  'https://bytebot.ai',           // Main domain
  'https://app.bytebot.ai',       // Application
  'https://api.bytebot.ai',       // API endpoint
  'https://dashboard.bytebot.ai', // Dashboard
  'https://docs.bytebot.ai'       // Documentation
];
```

### CORS Headers
```http
Access-Control-Allow-Origin: https://app.bytebot.ai
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-API-Key
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

## WebSocket Security

### Secure WebSocket Origins
```typescript
const websocketOrigins = [
  'wss://app.bytebot.ai',
  'wss://api.bytebot.ai'
];
```

### CSP WebSocket Support
```http
connect-src 'self' wss: https://api.bytebot.ai
```

## Service-Specific Configurations

### Bytebot-Agent
- API-focused security headers
- JWT token support in CORS
- Swagger documentation in development
- Rate limiting integration

### BytebotD
- VNC viewer support with relaxed frame policies
- WebSocket proxy security
- Desktop interaction monitoring
- Screen capture permissions

### Bytebot-UI
- Frontend asset loading policies
- Proxy configuration security
- Image and media handling
- Third-party script restrictions

## Monitoring & Logging

### Security Event Logging
```typescript
const securityEvent = {
  type: 'CORS_VIOLATION',
  timestamp: new Date().toISOString(),
  origin: 'http://malicious.com',
  blocked: true,
  riskScore: 85,
  service: 'Bytebot-Agent'
};
```

### CSP Violation Reporting
```typescript
// CSP violation endpoint
app.post('/csp-violation-report', (req, res) => {
  console.error('CSP Violation:', req.body);
  // Forward to monitoring system
});
```

### Rate Limiting Monitoring
```http
X-Rate-Limit-Remaining: 45
X-Rate-Limit-Reset: 1640995200
```

## Testing & Validation

### CORS Testing
```bash
# Test allowed origin
curl -H "Origin: https://app.bytebot.ai" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS https://api.bytebot.ai/api/tasks

# Test blocked origin  
curl -H "Origin: https://malicious.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS https://api.bytebot.ai/api/tasks
```

### Security Headers Validation
```bash
# Check security headers
curl -I https://api.bytebot.ai

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### CSP Testing
Use browser developer tools to verify CSP violations are properly blocked:
1. Open DevTools Console
2. Attempt to load unauthorized resources
3. Verify CSP violations are logged

## Troubleshooting

### Common Issues

#### 1. CORS Preflight Failures
```javascript
// Solution: Ensure OPTIONS method is allowed
app.options('*', cors(corsConfig)); // Enable preflight for all routes
```

#### 2. CSP Blocking Legitimate Resources
```javascript
// Solution: Add specific domains to CSP directives
'script-src': ["'self'", 'https://trusted-cdn.com']
```

#### 3. WebSocket Connection Failures
```javascript
// Solution: Update connect-src CSP directive
'connect-src': ["'self'", 'wss:', 'https://api.bytebot.ai']
```

#### 4. Development vs Production Configuration
```javascript
// Solution: Use environment-specific configs
const config = getSecurityConfig(serviceName, process.env.NODE_ENV);
```

### Debug Commands

```bash
# Test CORS policy
npm run test:cors

# Validate security headers
npm run test:security-headers

# Check CSP compliance
npm run test:csp

# Full security audit
npm run security:audit
```

## Deployment Checklist

### Pre-Deployment
- [ ] Security configurations tested in staging
- [ ] CORS policies validated for all origins
- [ ] CSP directives tested with all features
- [ ] WebSocket connections verified
- [ ] Rate limiting thresholds configured

### Production Deployment
- [ ] Environment variables set correctly
- [ ] HSTS preload list submission prepared
- [ ] Security monitoring alerts configured
- [ ] CSP violation reporting enabled
- [ ] Log aggregation configured

### Post-Deployment
- [ ] Security headers validation completed
- [ ] CORS functionality verified
- [ ] Performance impact assessed
- [ ] Security monitoring active
- [ ] Incident response procedures updated

## Security Best Practices

### 1. Origin Validation
- Always validate origins against explicit allowlists
- Never use wildcard (*) origins in production
- Implement subdomain validation for legitimate subdomains
- Log all CORS violations for security monitoring

### 2. Header Security
- Enable all security headers appropriate for your service
- Use strict CSP policies without unsafe-inline/unsafe-eval in production
- Implement HSTS with appropriate max-age values
- Configure proper referrer policies

### 3. Environment Separation
- Use different security policies per environment
- Never expose development origins in production
- Implement proper secrets management
- Maintain separate monitoring for each environment

### 4. Monitoring & Alerting
- Set up alerts for security violations
- Monitor CORS violation patterns
- Track CSP violation reports
- Implement security metrics dashboards

## Support & Maintenance

For questions or issues:
1. Check the troubleshooting section above
2. Review security logs for violation patterns
3. Consult the comprehensive test suite
4. Contact the security team for assistance

## Version History

- **v1.0.0**: Initial implementation with comprehensive CORS and security headers
- Environment-aware configurations
- Production-grade security policies
- Comprehensive monitoring and logging