# API Authentication

## Overview

Bytebot API implements enterprise-grade JWT-based authentication with support for multiple authentication providers and secure token lifecycle management.

## Authentication Flow

### JWT Token-Based Authentication

The API uses JSON Web Tokens (JWT) for stateless authentication with the following characteristics:

- **Access Token Lifetime**: 15 minutes
- **Refresh Token Lifetime**: 7 days
- **Token Storage**: httpOnly cookies with secure headers
- **Token Rotation**: Automated rotation policy

```typescript
interface TokenConfiguration {
  accessToken: {
    lifetime: "15 minutes";
    algorithm: "RS256";
    issuer: "bytebot-api";
    audience: "bytebot-clients";
  };
  refreshToken: {
    lifetime: "7 days";
    storage: "secure httpOnly cookie";
    rotation: "automatic on use";
  };
}
```

### Authentication Providers

Bytebot supports multiple authentication providers:

1. **Internal Authentication**: Username/password with bcrypt hashing
2. **LDAP Integration**: Enterprise directory integration
3. **OAuth2/OIDC**: Third-party identity providers (Google, Microsoft, etc.)

## API Endpoints

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "user@example.com",
    "roles": ["operator"],
    "permissions": ["task:read", "task:write", "computer:view"]
  }
}
```

### Token Refresh

```http
POST /api/v1/auth/refresh
Content-Type: application/json
Cookie: refresh_token=eyJhbGciOiJSUzI1NiIs...

{
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Authentication Headers

All authenticated requests must include the Authorization header:

```http
Authorization: Bearer <access_token>
```

## Token Validation

The API validates tokens using the following criteria:

1. **Signature Verification**: RSA public key validation
2. **Expiration Check**: Token not expired
3. **Issuer Validation**: Correct issuer claim
4. **Audience Validation**: Correct audience claim
5. **Revocation Check**: Token not in revocation list

## Security Features

### Password Requirements

- Minimum 12 characters
- Must include uppercase, lowercase, numbers, and special characters
- Password history: Cannot reuse last 12 passwords
- Account lockout: 5 failed attempts triggers 15-minute lockout

### Token Security

- **Secure Storage**: Tokens stored in httpOnly cookies with Secure and SameSite flags
- **Token Rotation**: Automatic refresh token rotation on each use
- **Revocation Support**: Immediate token revocation for logout/security events
- **Rate Limiting**: Login endpoint limited to 5 attempts per minute per IP

## Integration Examples

### JavaScript/TypeScript

```typescript
class BytebotAuthClient {
  private accessToken?: string;
  private refreshToken?: string;

  async login(username: string, password: string): Promise<void> {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      
      // Store refresh token in secure cookie (handled by server)
      // Access token stored in memory for security
    } else {
      throw new Error('Authentication failed');
    }
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (response.status === 401) {
      // Token expired, attempt refresh
      await this.refreshAccessToken();
      return this.makeAuthenticatedRequest(url, options);
    }

    return response;
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include' // Include refresh token cookie
    });

    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.access_token;
    } else {
      // Refresh failed, redirect to login
      throw new Error('Session expired');
    }
  }
}
```

### cURL Examples

```bash
# Login
curl -X POST "https://api.bytebot.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "secure_password"
  }'

# Authenticated API call
curl -X GET "https://api.bytebot.com/api/v1/tasks" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# Refresh token
curl -X POST "https://api.bytebot.com/api/v1/auth/refresh" \
  -H "Cookie: refresh_token=eyJhbGciOiJSUzI1NiIs..." \
  -H "Content-Type: application/json"
```

## Error Handling

### Authentication Errors

| Status Code | Error Code | Description | Action |
|-------------|------------|-------------|---------|
| 401 | `INVALID_CREDENTIALS` | Username or password incorrect | Verify credentials |
| 401 | `ACCOUNT_LOCKED` | Account temporarily locked | Wait for unlock period |
| 401 | `TOKEN_EXPIRED` | Access token has expired | Refresh token |
| 401 | `TOKEN_INVALID` | Token signature or format invalid | Re-authenticate |
| 403 | `INSUFFICIENT_PERMISSIONS` | User lacks required permissions | Check role assignments |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many authentication attempts | Wait before retrying |

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password",
    "details": {
      "attempts_remaining": 4,
      "lockout_duration": "15 minutes"
    }
  }
}
```

## Security Best Practices

### For Developers

1. **Never store tokens in localStorage** - Use memory storage for access tokens
2. **Implement proper token refresh logic** - Handle 401 responses gracefully
3. **Use HTTPS only** - Never send tokens over unencrypted connections
4. **Implement logout functionality** - Always call logout endpoint
5. **Handle network errors** - Implement retry logic with exponential backoff

### For Administrators

1. **Regular token rotation** - Configure appropriate token lifetimes
2. **Monitor authentication logs** - Watch for unusual login patterns
3. **Configure rate limiting** - Protect against brute force attacks
4. **Regular security audits** - Review user permissions and access patterns
5. **Emergency revocation** - Implement procedures for compromised tokens

## Troubleshooting

### Common Issues

**Issue**: Token refresh fails continuously
**Solution**: Check refresh token expiration and cookie settings

**Issue**: 403 errors after successful authentication
**Solution**: Verify user role assignments and permissions

**Issue**: CORS errors in web applications
**Solution**: Configure proper CORS settings for authentication endpoints

**Issue**: High authentication latency
**Solution**: Check database connection pool and consider caching strategies

### Debug Mode

Enable debug logging for authentication issues:

```bash
# Set environment variable
export LOG_LEVEL=debug
export AUTH_DEBUG=true

# Check authentication logs
tail -f /var/log/bytebot/auth.log
```

## Monitoring and Metrics

Key authentication metrics to monitor:

- **Login Success Rate**: Target > 95%
- **Token Refresh Success Rate**: Target > 99%
- **Authentication Latency**: Target < 100ms p95
- **Failed Login Attempts**: Alert on > 10 per minute
- **Token Revocations**: Monitor for security incidents

## Compliance

Bytebot authentication system supports:

- **SOC 2 Type II** compliance requirements
- **GDPR** data protection regulations
- **HIPAA** healthcare data security (with additional configuration)
- **ISO 27001** information security standards

---

**Last Updated**: September 6, 2025  
**Version**: 1.0.0  
**Next Review**: December 6, 2025