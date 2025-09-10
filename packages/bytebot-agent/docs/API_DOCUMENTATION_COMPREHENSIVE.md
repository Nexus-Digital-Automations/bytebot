# Browser-Use API Comprehensive Documentation

## Overview

The Browser-Use API provides enterprise-grade browser automation capabilities with comprehensive session management, task orchestration, and real-time monitoring. This API enables automated web interactions, data extraction, and screenshot capture through a local-only architecture ensuring security and privacy.

## Table of Contents

- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Integration Examples](#integration-examples)
- [Error Handling](#error-handling)
- [WebSocket Integration](#websocket-integration)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## API Overview

### Base URL
```
Production: https://api.bytebot.ai/v1/browser-use
Staging: https://api-staging.bytebot.ai/v1/browser-use  
Development: http://localhost:3000/api/v1/browser-use
```

### API Version
Current Version: `v1`
- Stable and production-ready
- Backward compatibility guaranteed
- Semantic versioning for updates

### Content Type
All requests and responses use `application/json` content type.

### Architecture
- **Local-Only Deployment**: 100% on-premises with no cloud dependencies
- **Docker Compose Compatible**: Easy deployment and scaling
- **Enterprise Security**: JWT authentication with role-based access control
- **Real-time Monitoring**: Comprehensive health checks and metrics
- **Circuit Breaker Patterns**: Built-in reliability and resilience

## Authentication

The Browser-Use API uses JWT Bearer token authentication with role-based access control.

### Authentication Methods

#### JWT Bearer Authentication (Primary)
```bash
curl -H "Authorization: Bearer <your-jwt-token>" \
  https://api.bytebot.ai/v1/browser-use/tasks
```

#### API Key Authentication (Service-to-Service)
```bash
curl -H "X-API-Key: <your-api-key>" \
  https://api.bytebot.ai/v1/browser-use/health/detailed
```

### User Roles and Permissions

| Role | Permissions | Browser-Use Access |
|------|-------------|-------------------|
| `ADMIN` | Full access to all operations | All endpoints |
| `OPERATOR` | Task creation, session management, execution | Most endpoints except delete operations |
| `VIEWER` | Read-only access to tasks and sessions | GET endpoints only |

### Security Headers

All requests should include these security headers:
- `Authorization: Bearer <token>` - JWT authentication
- `X-Request-ID: <uuid>` - Request tracing (optional)
- `X-Client-Version: <version>` - Client version (optional)

## Rate Limiting

The API implements comprehensive rate limiting based on user roles:

| Role | Requests/Minute | Burst Limit | Notes |
|------|-----------------|-------------|-------|
| ADMIN | 1000 | 200 | Administrative operations |
| OPERATOR | 500 | 100 | Standard automation tasks |
| VIEWER | 300 | 50 | Read-only operations |

### Rate Limit Headers
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Reset timestamp
- `Retry-After`: Retry delay when rate limited (HTTP 429)

## API Endpoints

### Browser Task Management

#### Create Browser Task
```http
POST /api/v1/browser-use/tasks
```

Creates and optionally starts a new browser automation task.

**Request Body:**
```json
{
  "name": "Website Data Extraction",
  "description": "Extract product information from e-commerce site",
  "startUrl": "https://example.com/products",
  "priority": "normal",
  "constraints": {
    "maxExecutionTime": 300,
    "maxActions": 50,
    "allowedDomains": ["example.com"],
    "enableScreenshots": true,
    "enableVideoRecording": false
  },
  "autoStart": false,
  "tags": ["data-extraction", "e-commerce"]
}
```

**Response:**
```json
{
  "id": "task_abc123",
  "name": "Website Data Extraction",
  "description": "Extract product information from e-commerce site",
  "status": "pending",
  "priority": "normal",
  "startUrl": "https://example.com/products",
  "progress": 0,
  "totalSteps": 0,
  "completedSteps": 0,
  "createdAt": "2024-01-01T10:00:00Z",
  "createdBy": "user_123"
}
```

#### List Browser Tasks
```http
GET /api/v1/browser-use/tasks?status=running&page=1&limit=10
```

**Query Parameters:**
- `status` (optional): Filter by task status (`pending`, `running`, `completed`, `failed`, `cancelled`)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response:**
```json
{
  "tasks": [...],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "hasNext": true,
  "hasPrevious": false
}
```

#### Get Task Details
```http
GET /api/v1/browser-use/tasks/{taskId}
```

#### Update Task
```http
PUT /api/v1/browser-use/tasks/{taskId}
```

#### Start Task Execution
```http
POST /api/v1/browser-use/tasks/{taskId}/start
```

#### Stop Task Execution
```http
POST /api/v1/browser-use/tasks/{taskId}/stop
```

#### Delete Task
```http
DELETE /api/v1/browser-use/tasks/{taskId}
```

### Session Management

#### Create Browser Session
```http
POST /api/v1/browser-use/sessions
```

Creates a new browser session with specified configuration.

**Request Body:**
```json
{
  "name": "Main Automation Session",
  "description": "Session for product data extraction",
  "profile": {
    "browserType": "chromium",
    "headless": true,
    "windowWidth": 1920,
    "windowHeight": 1080,
    "enableJavaScript": true,
    "enableImages": true,
    "userAgent": "Mozilla/5.0 (Custom Browser Automation)"
  },
  "timeoutSeconds": 600,
  "enableScreenshots": true,
  "enableVideoRecording": false,
  "enableNetworkLogging": true,
  "initialUrl": "https://example.com",
  "tags": ["automation", "data-extraction"]
}
```

**Response:**
```json
{
  "id": "session_xyz789",
  "name": "Main Automation Session",
  "status": "active",
  "success": true,
  "profile": {
    "browserType": "chromium",
    "headless": true,
    "windowWidth": 1920,
    "windowHeight": 1080
  },
  "currentUrl": "https://example.com",
  "currentTitle": "Example Website",
  "tabs": [
    {
      "id": "tab_1",
      "title": "Example Website",
      "url": "https://example.com",
      "active": true,
      "loadingStatus": "complete"
    }
  ],
  "createdAt": "2024-01-01T10:00:00Z",
  "expiresAt": "2024-01-01T10:10:00Z"
}
```

#### List Browser Sessions
```http
GET /api/v1/browser-use/sessions?active=true
```

#### Get Session Details
```http
GET /api/v1/browser-use/sessions/{sessionId}
```

#### Close Browser Session
```http
DELETE /api/v1/browser-use/sessions/{sessionId}
```

#### Close All Sessions
```http
DELETE /api/v1/browser-use/sessions
```

### Screenshot Operations

#### Capture Screenshot
```http
POST /api/v1/browser-use/sessions/{sessionId}/screenshot
```

**Request Body:**
```json
{
  "fullPage": true,
  "quality": 90,
  "format": "png",
  "clip": {
    "x": 0,
    "y": 0,
    "width": 1920,
    "height": 1080
  }
}
```

**Response:**
```json
{
  "id": "screenshot_def456",
  "sessionId": "session_xyz789",
  "format": "png",
  "width": 1920,
  "height": 1080,
  "size": 245760,
  "data": "iVBORw0KGgoAAAANSUhEUgAA...", // Base64 encoded
  "url": "/api/v1/browser-use/screenshots/screenshot_def456",
  "capturedAt": "2024-01-01T10:05:00Z"
}
```

#### Get Screenshot
```http
GET /api/v1/browser-use/screenshots/{screenshotId}
```

### DOM Interaction

#### Navigate to URL
```http
POST /api/v1/browser-use/sessions/{sessionId}/navigate
```

**Request Body:**
```json
{
  "url": "https://example.com/products",
  "waitForLoad": true,
  "timeout": 30000
}
```

#### Click Element
```http
POST /api/v1/browser-use/sessions/{sessionId}/click
```

**Request Body:**
```json
{
  "selector": "#add-to-cart-button",
  "waitForElement": true,
  "timeout": 10000
}
```

#### Type Text
```http
POST /api/v1/browser-use/sessions/{sessionId}/type
```

**Request Body:**
```json
{
  "selector": "#search-input",
  "text": "laptop computers",
  "clearFirst": true,
  "delay": 100
}
```

#### Scroll Page
```http
POST /api/v1/browser-use/sessions/{sessionId}/scroll
```

**Request Body:**
```json
{
  "direction": "down",
  "pixels": 500,
  "smooth": true
}
```

#### Get Browser State
```http
GET /api/v1/browser-use/sessions/{sessionId}/state?includeScreenshot=false
```

### Form Automation

#### Fill Form
```http
POST /api/v1/browser-use/sessions/{sessionId}/forms/fill
```

**Request Body:**
```json
{
  "formSelector": "#contact-form",
  "fields": {
    "#name": "John Doe",
    "#email": "john.doe@example.com",
    "#message": "Hello from automation"
  },
  "validateFields": true
}
```

#### Submit Form
```http
POST /api/v1/browser-use/sessions/{sessionId}/forms/submit
```

### Data Extraction

#### Extract Data
```http
POST /api/v1/browser-use/sessions/{sessionId}/extract
```

**Request Body:**
```json
{
  "selectors": {
    "title": "h1.product-title",
    "price": ".price-display",
    "description": ".product-description",
    "images": "img.product-image"
  },
  "extractMode": "structured",
  "waitForContent": true,
  "timeout": 15000
}
```

**Response:**
```json
{
  "sessionId": "session_xyz789",
  "extractedAt": "2024-01-01T10:10:00Z",
  "data": {
    "title": "Premium Laptop Computer",
    "price": "$1,299.99",
    "description": "High-performance laptop with advanced features",
    "images": [
      "https://example.com/laptop1.jpg",
      "https://example.com/laptop2.jpg"
    ]
  },
  "metadata": {
    "pageUrl": "https://example.com/product/laptop",
    "extractionTimeMs": 1250,
    "elementsFound": 4
  }
}
```

### Monitoring and Health

#### Service Health Check
```http
GET /api/v1/browser-use/monitoring/health
```

**Response:**
```json
{
  "serviceHealth": {
    "status": "healthy",
    "timestamp": "2024-01-01T10:15:00Z",
    "uptime": 86400,
    "version": "2.0.0"
  },
  "activeSessions": 3,
  "runningTasks": 2,
  "systemResources": {
    "memoryUsagePercent": 45,
    "cpuUsagePercent": 25,
    "diskUsagePercent": 60
  }
}
```

#### Task Status
```http
GET /api/v1/browser-use/monitoring/tasks/{taskId}/status
```

#### Detailed Health Check
```http
GET /api/v1/browser-use/health/detailed
```

#### Performance Metrics
```http
GET /api/v1/browser-use/metrics/performance?timeRange=24h
```

### Results and Export

#### Get Task Results
```http
GET /api/v1/browser-use/results/{taskId}
```

#### Export Results
```http
POST /api/v1/browser-use/results/{taskId}/export
```

**Request Body:**
```json
{
  "format": "json",
  "includeScreenshots": true,
  "includeLogs": true
}
```

## Data Models

### BrowserTaskStatus
- `pending` - Task created but not started
- `running` - Task currently executing
- `completed` - Task finished successfully
- `failed` - Task failed with errors
- `cancelled` - Task was cancelled by user

### BrowserTaskPriority
- `low` - Low priority task
- `normal` - Standard priority (default)
- `high` - High priority task
- `urgent` - Urgent priority task

### BrowserSessionStatus
- `initializing` - Session being created
- `active` - Session ready and active
- `idle` - Session inactive but alive
- `closing` - Session being terminated
- `closed` - Session terminated
- `error` - Session has errors

### BrowserType
- `chrome` - Google Chrome
- `chromium` - Chromium browser
- `firefox` - Mozilla Firefox
- `webkit` - Safari/WebKit

## Integration Examples

### Basic Task Creation and Execution

```javascript
// Create and start a browser automation task
async function createAndRunTask() {
  const taskData = {
    name: "E-commerce Data Extraction",
    description: "Extract product information from online store",
    startUrl: "https://store.example.com/products",
    constraints: {
      maxExecutionTime: 300,
      allowedDomains: ["store.example.com"],
      enableScreenshots: true
    },
    autoStart: true
  };

  try {
    const response = await fetch('/api/v1/browser-use/tasks', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + authToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    const task = await response.json();
    console.log('Task created:', task.id);
    
    // Monitor task progress
    const statusResponse = await fetch(`/api/v1/browser-use/monitoring/tasks/${task.id}/status`, {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    
    const status = await statusResponse.json();
    console.log('Task status:', status.status);
    
  } catch (error) {
    console.error('Error creating task:', error);
  }
}
```

### Session Management and Navigation

```javascript
// Create session and perform navigation
async function automateNavigation() {
  // Create browser session
  const sessionData = {
    name: "Navigation Session",
    profile: {
      browserType: "chromium",
      headless: true,
      windowWidth: 1920,
      windowHeight: 1080
    },
    enableScreenshots: true
  };

  const sessionResponse = await fetch('/api/v1/browser-use/sessions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + authToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(sessionData)
  });

  const session = await sessionResponse.json();
  const sessionId = session.id;

  try {
    // Navigate to URL
    await fetch(`/api/v1/browser-use/sessions/${sessionId}/navigate`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + authToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: "https://example.com/products",
        waitForLoad: true
      })
    });

    // Take screenshot
    const screenshotResponse = await fetch(`/api/v1/browser-use/sessions/${sessionId}/screenshot`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + authToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fullPage: true,
        format: "png"
      })
    });

    const screenshot = await screenshotResponse.json();
    console.log('Screenshot captured:', screenshot.id);

  } finally {
    // Clean up session
    await fetch(`/api/v1/browser-use/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
  }
}
```

### Data Extraction Workflow

```javascript
// Complete data extraction workflow
async function extractProductData() {
  // Create session
  const session = await createBrowserSession();
  const sessionId = session.id;

  try {
    // Navigate to product page
    await navigateToUrl(sessionId, "https://shop.example.com/product/123");

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract structured data
    const extractResponse = await fetch(`/api/v1/browser-use/sessions/${sessionId}/extract`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + authToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        selectors: {
          title: "h1.product-title",
          price: ".price-current",
          availability: ".stock-status",
          images: "img.product-image",
          description: ".product-description"
        },
        extractMode: "structured"
      })
    });

    const extractedData = await extractResponse.json();
    console.log('Extracted data:', extractedData.data);

    return extractedData.data;

  } finally {
    await closeBrowserSession(sessionId);
  }
}
```

### Error Handling and Retry Logic

```javascript
// Robust error handling with retry logic
async function robustTaskExecution(taskConfig, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const task = await createTask(taskConfig);
      const result = await waitForTaskCompletion(task.id);
      
      if (result.status === 'completed') {
        return result;
      } else if (result.status === 'failed') {
        lastError = new Error(`Task failed: ${result.error?.message}`);
      }
      
    } catch (error) {
      lastError = error;
      
      if (error.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = error.headers?.['retry-after'] || 60;
        console.log(`Rate limited, waiting ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      if (error.status >= 500) {
        // Server error - retry with exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Server error, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Client error - don't retry
      throw error;
    }
  }
  
  throw lastError;
}
```

## Error Handling

### HTTP Status Codes

| Status Code | Description | Action |
|-------------|-------------|--------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 204 | No Content | Resource deleted successfully |
| 400 | Bad Request | Check request parameters and format |
| 401 | Unauthorized | Provide valid authentication token |
| 403 | Forbidden | Check user permissions and role |
| 404 | Not Found | Verify resource exists and ID is correct |
| 409 | Conflict | Resource already exists or conflict |
| 422 | Unprocessable Entity | Validation errors in request data |
| 429 | Too Many Requests | Reduce request rate, check rate limits |
| 500 | Internal Server Error | Server error, contact support |
| 503 | Service Unavailable | Service temporarily down or circuit breaker open |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "startUrl",
      "reason": "URL must be valid HTTP/HTTPS URL"
    },
    "timestamp": "2024-01-01T10:20:00Z",
    "requestId": "req_abc123"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_ERROR` - Authentication required or invalid
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `RESOURCE_NOT_FOUND` - Requested resource does not exist
- `RESOURCE_CONFLICT` - Resource already exists or conflict
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SESSION_EXPIRED` - Browser session has expired
- `TASK_EXECUTION_ERROR` - Error during task execution
- `BROWSER_ERROR` - Browser automation error
- `NETWORK_ERROR` - Network connectivity issues
- `TIMEOUT_ERROR` - Operation timed out
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable

## WebSocket Integration

Real-time updates are available via WebSocket connections for monitoring task progress and session status.

### Connection

```javascript
const ws = new WebSocket('wss://api.bytebot.ai/v1/browser-use/ws', {
  headers: {
    'Authorization': 'Bearer ' + authToken
  }
});

ws.on('open', () => {
  console.log('WebSocket connected');
  
  // Subscribe to task updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['tasks', 'sessions'],
    taskIds: ['task_abc123'],
    sessionIds: ['session_xyz789']
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  switch (message.type) {
    case 'task_update':
      console.log('Task update:', message.data);
      break;
    case 'session_update':
      console.log('Session update:', message.data);
      break;
    case 'screenshot_captured':
      console.log('Screenshot available:', message.data);
      break;
  }
});
```

### Message Types

- `task_update` - Task status or progress changed
- `session_update` - Session status changed  
- `screenshot_captured` - New screenshot available
- `error_occurred` - Error in task or session
- `resource_usage` - System resource updates

## Security Considerations

### Local-Only Architecture
- **No Cloud Dependencies**: All processing happens on-premises
- **Data Privacy**: Sensitive data never leaves your infrastructure
- **Compliance Ready**: Meets strict data residency requirements

### Authentication Security
- **JWT Tokens**: Secure, stateless authentication
- **Token Expiration**: Configurable token lifetimes
- **Role-Based Access**: Granular permission control
- **API Keys**: Service-to-service authentication

### Input Validation
- **XSS Protection**: All input sanitized and validated
- **SQL Injection Prevention**: Parameterized queries only
- **CSRF Protection**: Cross-site request forgery prevention
- **Content Type Validation**: Strict content type checking

### Network Security
- **HTTPS Only**: All communications encrypted in transit
- **CORS Configuration**: Controlled cross-origin access
- **Security Headers**: Comprehensive security header implementation
- **Rate Limiting**: Protection against abuse and DoS

## Troubleshooting

### Common Issues

#### Task Fails to Start
**Symptoms:** Task status remains "pending"
**Solutions:**
1. Check browser session availability
2. Verify start URL accessibility
3. Check domain whitelist constraints
4. Review task configuration parameters

#### Session Creation Fails
**Symptoms:** Session creation returns error
**Solutions:**
1. Verify browser executable path
2. Check system resources (memory, CPU)
3. Ensure proper network configuration
4. Review browser profile settings

#### Screenshots Not Capturing
**Symptoms:** Screenshot requests fail or return empty
**Solutions:**
1. Ensure session has screenshot capability enabled
2. Check browser window dimensions
3. Verify page has loaded completely
4. Review clip coordinates (if specified)

#### Rate Limiting Issues
**Symptoms:** HTTP 429 responses
**Solutions:**
1. Implement exponential backoff
2. Check rate limit headers for guidance
3. Consider upgrading user tier
4. Distribute requests across time

#### Authentication Errors
**Symptoms:** HTTP 401/403 responses
**Solutions:**
1. Verify JWT token is valid and not expired
2. Check user role permissions
3. Ensure proper Authorization header format
4. Verify API endpoint requires correct role

### Debug Mode

Enable debug logging by including debug headers:

```bash
curl -H "X-Debug-Mode: true" \
     -H "X-Trace-Level: verbose" \
     -H "Authorization: Bearer <token>" \
     https://api.bytebot.ai/v1/browser-use/tasks
```

### Support Resources

- **Documentation**: [https://docs.bytebot.ai/browser-use](https://docs.bytebot.ai/browser-use)
- **Status Page**: [https://status.bytebot.ai](https://status.bytebot.ai)
- **Support Email**: [browser-use-support@bytebot.ai](mailto:browser-use-support@bytebot.ai)
- **Community Forum**: [https://community.bytebot.ai](https://community.bytebot.ai)

### Health Check Endpoints

Monitor API health using these endpoints:

```bash
# Basic health check
curl https://api.bytebot.ai/v1/browser-use/monitoring/health

# Detailed health with authentication
curl -H "Authorization: Bearer <token>" \
     https://api.bytebot.ai/v1/browser-use/health/detailed

# Performance metrics
curl -H "Authorization: Bearer <token>" \
     https://api.bytebot.ai/v1/browser-use/metrics/performance?timeRange=1h
```

## Conclusion

The Browser-Use API provides a comprehensive solution for browser automation with enterprise-grade security, monitoring, and reliability. The local-only architecture ensures data privacy while delivering powerful automation capabilities for web scraping, testing, and data extraction workflows.

For additional support or advanced integration requirements, please consult the detailed OpenAPI specification or contact our support team.