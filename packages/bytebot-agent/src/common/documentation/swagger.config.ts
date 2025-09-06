/**
 * Swagger OpenAPI Configuration - Enterprise API Documentation
 *
 * This configuration provides comprehensive OpenAPI documentation for the
 * Bytebot API with security schema definitions, version management, and
 * enterprise-grade documentation standards.
 *
 * @fileoverview OpenAPI/Swagger configuration with security documentation
 * @version 1.0.0
 * @author API Versioning & Documentation Specialist
 */

import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SUPPORTED_API_VERSIONS } from '../versioning/api-version.decorator';

/**
 * Security scheme definitions for OpenAPI
 */
const SECURITY_SCHEMES = {
  BearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT Bearer token authentication',
  },
  ApiKey: {
    type: 'apiKey',
    in: 'header',
    name: 'X-API-Key',
    description: 'API key authentication for service-to-service calls',
  },
  OAuth2: {
    type: 'oauth2',
    description: 'OAuth 2.0 authentication flow',
    flows: {
      authorizationCode: {
        authorizationUrl: '/auth/oauth2/authorize',
        tokenUrl: '/auth/oauth2/token',
        scopes: {
          'read:tasks': 'Read task information',
          'write:tasks': 'Create and modify tasks',
          'delete:tasks': 'Delete tasks',
          'read:system': 'Read system information and metrics',
          'write:system': 'Modify system configuration',
          admin: 'Full administrative access',
        },
      },
    },
  },
} as const;

/**
 * Custom API documentation extensions
 */
const CUSTOM_EXTENSIONS = {
  'x-api-id': 'bytebot-api',
  'x-logo': {
    url: '/assets/logo.png',
    altText: 'Bytebot AI Platform',
  },
  'x-contact': {
    name: 'Bytebot API Team',
    email: 'api-support@bytebot.ai',
    url: 'https://docs.bytebot.ai',
  },
  'x-license': {
    name: 'Enterprise License',
    url: 'https://bytebot.ai/license',
  },
  'x-api-lifecycle': {
    maturity: 'production',
    stability: 'stable',
    deprecation: null,
  },
} as const;

/**
 * Rate limiting documentation
 */
const RATE_LIMITING_DOCS = {
  description: `
## Rate Limiting

The Bytebot API implements comprehensive rate limiting to ensure fair usage and system stability.

### Rate Limit Headers

All responses include rate limiting information in the following headers:

- \`X-RateLimit-Limit\`: Maximum requests allowed per window
- \`X-RateLimit-Remaining\`: Requests remaining in current window  
- \`X-RateLimit-Reset\`: Timestamp when rate limit window resets
- \`X-RateLimit-Policy\`: Rate limit policy applied (e.g., 'standard', 'premium')
- \`Retry-After\`: Seconds to wait before retrying (when rate limited)

### Rate Limit Tiers

Different rate limits apply based on authentication and user tier:

| Tier | Requests/Minute | Burst Limit | Notes |
|------|-----------------|-------------|-------|
| Anonymous | 60 | 10 | Unauthenticated requests |
| Authenticated | 300 | 50 | Standard authenticated users |
| Premium | 1000 | 100 | Premium tier users |
| Enterprise | 5000 | 500 | Enterprise customers |

### Exceeding Rate Limits

When rate limits are exceeded, the API returns:

- HTTP Status: \`429 Too Many Requests\`
- Error message with retry information
- \`Retry-After\` header indicating when to retry

### Best Practices

1. Implement exponential backoff when receiving 429 responses
2. Monitor rate limit headers to avoid hitting limits
3. Use authentication to access higher rate limits
4. Contact support for enterprise rate limit increases
  `,
};

/**
 * Security documentation
 */
const SECURITY_DOCS = {
  description: `
## Security

The Bytebot API implements enterprise-grade security measures to protect data and ensure secure access.

### Authentication Methods

#### JWT Bearer Authentication
Most API endpoints require JWT bearer authentication:

\`\`\`bash
curl -H "Authorization: Bearer <your-jwt-token>" https://api.bytebot.ai/v1/tasks
\`\`\`

#### API Key Authentication
Service-to-service authentication using API keys:

\`\`\`bash
curl -H "X-API-Key: <your-api-key>" https://api.bytebot.ai/v1/system/health
\`\`\`

#### OAuth 2.0
For third-party integrations using OAuth 2.0 flow:

1. Redirect users to authorization URL
2. Receive authorization code
3. Exchange code for access token
4. Use access token for API requests

### Security Headers

All API responses include security headers:

- \`X-Content-Type-Options: nosniff\`
- \`X-Frame-Options: DENY\`
- \`X-XSS-Protection: 1; mode=block\`
- \`Strict-Transport-Security: max-age=31536000\`

### Input Validation

All user input is validated and sanitized:

- XSS protection through content sanitization
- SQL injection prevention through parameterized queries
- Request size limits to prevent DoS attacks
- Content type validation for all endpoints

### CORS Configuration

Cross-Origin Resource Sharing is configured for web applications:

- Allowed origins are environment-specific
- Credentials can be included for authenticated requests
- Preflight requests are handled appropriately

### Data Privacy

- Sensitive data is encrypted at rest and in transit
- Personal information is handled according to privacy regulations
- Audit logs are maintained for all security events
  `,
};

/**
 * Versioning documentation
 */
const VERSIONING_DOCS = {
  description: `
## API Versioning

The Bytebot API uses semantic versioning to ensure backward compatibility and smooth transitions between versions.

### Current Versions

- **v1**: Stable, production-ready version (current)
- **v2**: Next generation API (in development)

### Version Specification Methods

#### 1. Accept-Version Header (Recommended)
\`\`\`bash
curl -H "Accept-Version: v1" https://api.bytebot.ai/tasks
\`\`\`

#### 2. URL Path Versioning
\`\`\`bash
curl https://api.bytebot.ai/v1/tasks
\`\`\`

#### 3. Query Parameter
\`\`\`bash
curl https://api.bytebot.ai/tasks?version=v1
\`\`\`

#### 4. Media Type Versioning
\`\`\`bash
curl -H "Accept: application/vnd.bytebot.v1+json" https://api.bytebot.ai/tasks
\`\`\`

### Version Response Headers

All responses include version information:

- \`API-Version\`: The version that processed the request
- \`API-Supported-Versions\`: All supported versions
- \`API-Version-Source\`: How version was determined

### Deprecation Policy

When versions are deprecated:

- \`Deprecation\`: Date when version was deprecated
- \`Sunset\`: Date when version will be removed  
- \`Warning\`: Human-readable deprecation warning
- \`API-Migration-Guide\`: Link to migration documentation

### Backward Compatibility

- Minor version updates maintain backward compatibility
- Major version updates may introduce breaking changes
- Deprecated versions are supported for minimum 12 months
  `,
};

/**
 * Create comprehensive OpenAPI configuration
 * @param configService - NestJS configuration service
 * @returns OpenAPI document builder
 */
export function createSwaggerConfig(
  configService: ConfigService,
): DocumentBuilder {
  const logger = new Logger('SwaggerConfig');

  const apiTitle = configService.get('api.title', 'Bytebot AI Platform API');
  const apiDescription = configService.get(
    'api.description',
    'Enterprise AI automation platform with computer use capabilities',
  );
  const apiVersion = configService.get('api.version', '1.0.0');
  const serverUrl = configService.get(
    'api.serverUrl',
    'https://api.bytebot.ai',
  );

  logger.log('Building OpenAPI configuration', {
    title: apiTitle,
    version: apiVersion,
    serverUrl,
  });

  const builder = new DocumentBuilder()
    .setTitle(apiTitle)
    .setDescription(
      `
${apiDescription}

${RATE_LIMITING_DOCS.description}

${SECURITY_DOCS.description}

${VERSIONING_DOCS.description}

## API Features

- **Computer Use**: Advanced screen interaction and automation
- **Task Management**: Intelligent task orchestration and execution
- **File Operations**: Secure file upload, processing, and management
- **Real-time Updates**: WebSocket connections for live updates
- **Batch Operations**: Efficient bulk data processing
- **Analytics**: Comprehensive usage and performance metrics

## Response Format

All API responses follow a consistent format:

\`\`\`json
{
  "success": true,
  "data": {...},
  "metadata": {
    "requestId": "req_abc123",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "v1",
    "processingTime": 123
  }
}
\`\`\`

## Error Handling

Error responses include detailed information:

\`\`\`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {...},
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_abc123"
  }
}
\`\`\`

## Support

- Documentation: [https://docs.bytebot.ai](https://docs.bytebot.ai)
- Status Page: [https://status.bytebot.ai](https://status.bytebot.ai)
- Support: [api-support@bytebot.ai](mailto:api-support@bytebot.ai)
    `,
    )
    .setVersion(apiVersion)
    .setContact(
      'Bytebot API Team',
      'https://docs.bytebot.ai',
      'api-support@bytebot.ai',
    )
    .setLicense('Enterprise License', 'https://bytebot.ai/license')
    .setTermsOfService('https://bytebot.ai/terms')
    .addServer(serverUrl, 'Production Server')
    .addServer(serverUrl.replace('api.', 'api-staging.'), 'Staging Server')
    .addServer('http://localhost:3000', 'Development Server');

  // Add security schemes
  builder
    .addBearerAuth(SECURITY_SCHEMES.BearerAuth, 'bearer')
    .addApiKey(SECURITY_SCHEMES.ApiKey, 'apikey')
    .addOAuth2(SECURITY_SCHEMES.OAuth2, 'oauth2');

  // Add global headers
  builder
    .addGlobalParameters({
      name: 'Accept-Version',
      in: 'header',
      description: 'API version preference',
      required: false,
      schema: {
        type: 'string',
        enum: Object.values(SUPPORTED_API_VERSIONS),
        default: SUPPORTED_API_VERSIONS.V1,
      },
    })
    .addGlobalParameters({
      name: 'X-Request-ID',
      in: 'header',
      description: 'Optional request ID for tracing',
      required: false,
      schema: {
        type: 'string',
        format: 'uuid',
      },
    })
    .addGlobalParameters({
      name: 'X-Client-Version',
      in: 'header',
      description: 'Client application version',
      required: false,
      schema: {
        type: 'string',
      },
    });

  // Add version-specific tags
  Object.values(SUPPORTED_API_VERSIONS).forEach((version) => {
    builder.addTag(
      `API ${version}`,
      `Endpoints available in API version ${version}`,
      {
        name: 'API Versions',
        url: `https://docs.bytebot.ai/versions/${version}`,
      },
    );
  });

  // Add feature tags
  builder
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Tasks', 'Task management and execution')
    .addTag('Computer Use', 'Screen interaction and automation')
    .addTag('Files', 'File upload and management')
    .addTag('System', 'System information and health checks')
    .addTag('Analytics', 'Usage analytics and metrics')
    .addTag('WebSockets', 'Real-time communication')
    .addTag('Admin', 'Administrative operations');

  return builder;
}

/**
 * Setup comprehensive API documentation
 * @param app - NestJS application instance
 * @param configService - Configuration service
 * @returns OpenAPI document
 */
export function setupApiDocumentation(
  app: INestApplication,
  configService: ConfigService,
): OpenAPIObject {
  const logger = new Logger('ApiDocumentation');
  const operationId = `swagger-setup-${Date.now()}`;

  logger.log(`[${operationId}] Setting up API documentation`);

  const builder = createSwaggerConfig(configService);
  const document = SwaggerModule.createDocument(app, builder.build(), {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
    ignoreGlobalPrefix: false,
    include: [], // Include all modules
    extraModels: [], // Additional models to include
  });

  // Add custom extensions to document
  Object.assign(document.info, CUSTOM_EXTENSIONS);

  // Enhance document with additional metadata
  document.info.version = configService.get('api.version', '1.0.0');
  document.info['x-api-build'] = process.env.BUILD_NUMBER || 'dev';
  document.info['x-api-commit'] = process.env.GIT_COMMIT || 'unknown';
  document.info['x-generation-date'] = new Date().toISOString();

  // Add security requirements globally
  if (!document.security) {
    document.security = [];
  }

  document.security.push(
    { bearer: [] },
    { apikey: [] },
    { oauth2: ['read:tasks', 'write:tasks'] },
  );

  // Setup multiple documentation endpoints
  const docsPath = configService.get('api.docsPath', '/api/docs');
  const jsonPath = configService.get('api.jsonPath', '/api/docs-json');
  const yamlPath = configService.get('api.yamlPath', '/api/docs-yaml');

  // Setup Swagger UI
  SwaggerModule.setup(docsPath, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      defaultModelExpandDepth: 2,
      defaultModelsExpandDepth: 1,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      tryItOutEnabled: true,
      requestInterceptor: (req: any) => {
        // Add custom request interceptor for debugging
        req.headers['X-Documentation-Request'] = 'true';
        return req;
      },
    },
    customSiteTitle: 'Bytebot API Documentation',
    customfavIcon: '/assets/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .scheme-container { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { color: #2c3e50; }
    `,
    customJs: ['/assets/swagger-custom.js'],
  });

  // Add JSON endpoint
  app.getHttpAdapter().get(jsonPath, (req, res) => {
    res.json(document);
  });

  // Add YAML endpoint (if yaml library is available)
  try {
    const yaml = require('yaml');
    app.getHttpAdapter().get(yamlPath, (req, res) => {
      res.set('Content-Type', 'application/yaml');
      res.send(yaml.stringify(document));
    });
  } catch (error) {
    logger.warn('YAML support not available for API documentation');
  }

  logger.log(`[${operationId}] API documentation setup completed`, {
    operationId,
    docsUrl: docsPath,
    jsonUrl: jsonPath,
    yamlUrl: yamlPath,
    securitySchemes: Object.keys(SECURITY_SCHEMES),
    tagsCount: document.tags?.length || 0,
    pathsCount: Object.keys(document.paths || {}).length,
  });

  return document;
}

/**
 * Generate API documentation metadata for external tools
 * @param document - OpenAPI document
 * @returns Documentation metadata
 */
export function generateDocumentationMetadata(document: OpenAPIObject) {
  return {
    info: document.info,
    servers: document.servers,
    security: document.security,
    tags: document.tags,
    pathCount: Object.keys(document.paths || {}).length,
    schemaCount: Object.keys(document.components?.schemas || {}).length,
    securitySchemeCount: Object.keys(document.components?.securitySchemes || {})
      .length,
    generatedAt: new Date().toISOString(),
    version: document.info.version,
    apiId: CUSTOM_EXTENSIONS['x-api-id'],
  };
}

export default {
  createSwaggerConfig,
  setupApiDocumentation,
  generateDocumentationMetadata,
  SECURITY_SCHEMES,
  CUSTOM_EXTENSIONS,
};
