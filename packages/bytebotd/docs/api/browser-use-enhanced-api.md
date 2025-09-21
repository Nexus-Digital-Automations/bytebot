# Enhanced Browser-Use API Documentation

## Overview

The Enhanced Browser-Use API provides comprehensive REST endpoints for advanced browser automation capabilities including performance monitoring, mobile emulation, extension management, and real-time WebSocket communication.

## Base URL

```
https://your-domain.com/browser-use/advanced
```

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```http
Authorization: Bearer <jwt-token>
```

## API Endpoints

### Performance Monitoring

#### Start Performance Monitoring

Start collecting performance metrics for a browser session including Core Web Vitals, resource timing, and memory usage.

```http
POST /performance/monitor/start/{sessionId}
```

**Parameters:**
- `sessionId` (path, required): Browser session identifier

**Response:**
```json
{
  "monitoringId": "mon_1234567890abcdef",
  "status": "started",
  "metricsCollected": [
    "navigationTiming",
    "resourceMetrics",
    "memoryUsage",
    "coreWebVitals",
    "networkLatency"
  ]
}
```

**Example:**
```bash
curl -X POST \
  "https://api.example.com/browser-use/advanced/performance/monitor/start/session123" \
  -H "Authorization: Bearer your-jwt-token"
```

#### Get Performance Metrics

Retrieve comprehensive performance metrics for a session.

```http
GET /performance/metrics/{sessionId}?timeRange={minutes}
```

**Parameters:**
- `sessionId` (path, required): Browser session identifier
- `timeRange` (query, optional): Time range in minutes for metrics aggregation

**Response:**
```json
{
  "sessionId": "session123",
  "timestamp": "2024-01-01T12:00:00Z",
  "navigationTiming": {
    "domContentLoaded": 1200,
    "loadComplete": 2500,
    "firstPaint": 800,
    "firstContentfulPaint": 1100,
    "largestContentfulPaint": 2200,
    "firstInputDelay": 75,
    "cumulativeLayoutShift": 0.05
  },
  "resourceMetrics": {
    "totalRequests": 35,
    "totalSize": 2500000,
    "jsSize": 800000,
    "cssSize": 150000,
    "imageSize": 1200000,
    "failedRequests": 2
  },
  "memoryUsage": {
    "jsHeapSizeLimit": 2147483648,
    "totalJSHeapSize": 75000000,
    "usedJSHeapSize": 45000000
  },
  "cpuUsage": 25.5,
  "networkLatency": 45
}
```

### Browser Profile Management

#### Create Browser Profile

Create a custom browser profile with specific configurations for user agent, viewport, geolocation, and extensions.

```http
POST /profiles
```

**Request Body:**
```json
{
  "profileName": "Mobile Testing Profile",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
  "viewport": {
    "width": 390,
    "height": 844,
    "deviceScaleFactor": 3,
    "isMobile": true,
    "hasTouch": true
  },
  "geolocation": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 10
  },
  "timezone": "America/Los_Angeles",
  "locale": "en-US",
  "permissions": ["geolocation", "notifications"],
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123",
      "domain": "example.com",
      "path": "/",
      "httpOnly": true,
      "secure": true,
      "sameSite": "Strict"
    }
  ],
  "localStorage": {
    "theme": "dark",
    "language": "en"
  },
  "extensions": ["extension-id-123"]
}
```

**Response:**
```json
{
  "profileId": "prof_1234567890abcdef",
  "status": "created",
  "configuration": {
    "profileName": "Mobile Testing Profile",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
    "viewport": {
      "width": 390,
      "height": 844,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true
    }
  }
}
```

#### Launch Session with Profile

Start a new browser session using a specific browser profile configuration.

```http
POST /profiles/{profileId}/launch
```

**Parameters:**
- `profileId` (path, required): Browser profile identifier

**Response:**
```json
{
  "sessionId": "sess_1234567890abcdef",
  "profileId": "prof_1234567890abcdef",
  "status": "launched",
  "configuration": {
    "profileName": "Mobile Testing Profile",
    "viewport": {
      "width": 390,
      "height": 844
    }
  }
}
```

### Mobile Device Emulation

#### Enable Mobile Emulation

Configure browser session to emulate specific mobile devices with custom viewport and network conditions.

```http
POST /mobile/emulate/{sessionId}
```

**Parameters:**
- `sessionId` (path, required): Browser session identifier

**Request Body:**
```json
{
  "deviceName": "iPhone 13 Pro",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
  "viewport": {
    "width": 390,
    "height": 844,
    "deviceScaleFactor": 3,
    "isMobile": true,
    "hasTouch": true,
    "isLandscape": false
  },
  "network": {
    "offline": false,
    "downloadThroughput": 1600000,
    "uploadThroughput": 750000,
    "latency": 40
  }
}
```

**Response:**
```json
{
  "sessionId": "session123",
  "deviceEmulated": "iPhone 13 Pro",
  "status": "enabled"
}
```

#### Get Mobile Device Configurations

Retrieve list of predefined mobile device configurations for emulation.

```http
GET /mobile/devices
```

**Response:**
```json
[
  {
    "deviceName": "iPhone 13 Pro",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
    "viewport": {
      "width": 390,
      "height": 844,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true
    }
  },
  {
    "deviceName": "Samsung Galaxy S21",
    "userAgent": "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36",
    "viewport": {
      "width": 360,
      "height": 800,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true
    }
  }
]
```

### Browser Extension Management

#### Install Browser Extension

Install a browser extension from the Chrome Web Store or local file in a browser session.

```http
POST /extensions/install/{sessionId}
Content-Type: multipart/form-data
```

**Parameters:**
- `sessionId` (path, required): Browser session identifier

**Form Data:**
- `extensionFile` (file, optional): Extension file for local installation
- `source` (string, required): Installation source ("chrome-web-store" or "local-file")
- `extensionId` (string, optional): Extension ID for web store installation

**Response:**
```json
{
  "extensionId": "ext_1234567890abcdef",
  "name": "Ad Blocker Pro",
  "version": "1.2.3",
  "enabled": true,
  "permissions": ["activeTab", "storage", "webRequest"],
  "source": "local-file",
  "installPath": "/path/to/extension.zip"
}
```

#### List Installed Extensions

Get list of all installed browser extensions in a session.

```http
GET /extensions/{sessionId}
```

**Parameters:**
- `sessionId` (path, required): Browser session identifier

**Response:**
```json
[
  {
    "extensionId": "ext_1234567890abcdef",
    "name": "Ad Blocker Pro",
    "version": "1.2.3",
    "enabled": true,
    "permissions": ["activeTab", "storage"],
    "source": "local-file"
  },
  {
    "extensionId": "ext_0987654321fedcba",
    "name": "Developer Tools",
    "version": "2.1.0",
    "enabled": true,
    "permissions": ["devtools"],
    "source": "chrome-web-store"
  }
]
```

### WebSocket Real-Time Communication

#### Start WebSocket Event Streaming

Begin real-time WebSocket streaming of browser events including DOM mutations, network requests, and performance metrics.

```http
POST /websocket/start/{sessionId}
```

**Parameters:**
- `sessionId` (path, required): Browser session identifier

**Request Body:**
```json
{
  "sessionId": "session123",
  "eventTypes": ["navigation", "dom-mutation", "network", "console", "performance"],
  "includeScreenshots": true,
  "throttleMs": 1000,
  "bufferSize": 100,
  "compression": true
}
```

**Response:**
```json
{
  "connectionId": "conn_1234567890abcdef",
  "wsUrl": "ws://localhost:3000/browser-use/advanced/websocket/conn_1234567890abcdef",
  "eventTypes": ["navigation", "dom-mutation", "network", "console", "performance"],
  "status": "started"
}
```

#### Real-Time Events Stream (SSE)

Server-Sent Events stream for real-time browser automation monitoring with live updates.

```http
GET /events/stream/{sessionId}?eventTypes={types}
Accept: text/event-stream
```

**Parameters:**
- `sessionId` (path, required): Browser session identifier
- `eventTypes` (query, optional): Comma-separated event types to stream

**Event Stream:**
```
data: {"id":"evt_123","type":"navigation","sessionId":"session123","timestamp":"2024-01-01T12:00:00Z","data":{"url":"https://example.com","title":"Example Page"}}

data: {"id":"evt_124","type":"performance-metrics","sessionId":"session123","timestamp":"2024-01-01T12:00:01Z","data":{"loadTime":1200,"memoryUsage":45000000}}

data: {"id":"evt_125","type":"dom-mutation","sessionId":"session123","timestamp":"2024-01-01T12:00:02Z","data":{"mutationType":"childList","target":"div.content"}}
```

### Advanced Form Automation

#### Intelligent Form Automation

Automatically detect and fill form fields with intelligent field mapping and validation.

```http
POST /forms/auto-fill/{sessionId}
```

**Parameters:**
- `sessionId` (path, required): Browser session identifier

**Request Body:**
```json
{
  "sessionId": "session123",
  "formSelector": "form#checkout",
  "autoDetectFields": true,
  "fieldMappings": [
    {
      "selector": "input[name='email']",
      "fieldName": "email",
      "fieldType": "email",
      "value": "user@example.com",
      "validation": {
        "required": true,
        "pattern": "^[^@]+@[^@]+\\.[^@]+$"
      }
    },
    {
      "selector": "input[name='phone']",
      "fieldName": "phone",
      "fieldType": "tel",
      "value": "+1-555-123-4567",
      "validation": {
        "required": true,
        "pattern": "^\\+?[1-9]\\d{1,14}$"
      }
    }
  ],
  "submitButton": "button[type='submit']",
  "waitForSubmission": true,
  "captchaHandling": {
    "enabled": true,
    "service": "auto-detect"
  }
}
```

**Response:**
```json
{
  "sessionId": "session123",
  "fieldsProcessed": 2,
  "validationResults": {
    "validFields": 2,
    "invalidFields": 0,
    "warnings": []
  },
  "status": "completed"
}
```

### Automation Recording

#### Start Automation Recording

Begin recording browser interactions to generate automation scripts in various formats.

```http
POST /recording/start/{sessionId}
```

**Parameters:**
- `sessionId` (path, required): Browser session identifier

**Request Body:**
```json
{
  "sessionId": "session123",
  "recordingName": "User Registration Flow",
  "includeEvents": ["click", "type", "navigation", "form-submission"],
  "includeScreenshots": true,
  "maxDuration": 300000,
  "outputFormat": "puppeteer-script"
}
```

**Response:**
```json
{
  "recordingId": "rec_1234567890abcdef",
  "sessionId": "session123",
  "status": "started",
  "outputFormat": "puppeteer-script"
}
```

#### Stop Recording and Generate Script

Stop automation recording and generate executable script in the specified format.

```http
POST /recording/stop/{recordingId}
```

**Parameters:**
- `recordingId` (path, required): Recording identifier

**Response:**
```json
{
  "recordingId": "rec_1234567890abcdef",
  "script": "const puppeteer = require('puppeteer');\n\n(async () => {\n  const browser = await puppeteer.launch();\n  const page = await browser.newPage();\n  \n  await page.goto('https://example.com');\n  await page.click('#login-button');\n  await page.type('#email', 'user@example.com');\n  \n  await browser.close();\n})();",
  "format": "puppeteer-script",
  "statistics": {
    "duration": 45000,
    "eventsRecorded": 12,
    "outputFormat": "puppeteer-script"
  }
}
```

### System Information

#### Get Advanced Capabilities

Retrieve information about available advanced automation features and system capabilities.

```http
GET /capabilities
```

**Response:**
```json
{
  "performanceMonitoring": true,
  "mobileEmulation": true,
  "extensionManagement": true,
  "realtimeWebSocket": true,
  "formAutomation": true,
  "automationRecording": true,
  "supportedDevices": [
    "iPhone 13 Pro",
    "Samsung Galaxy S21",
    "iPad Pro 12.9",
    "Pixel 6"
  ],
  "supportedBrowsers": ["Chrome", "Chromium", "Edge"],
  "maxConcurrentSessions": 10
}
```

## WebSocket Events

### Event Types

The WebSocket connection supports the following event types:

- `navigation` - Page navigation events
- `dom-mutation` - DOM changes and mutations
- `network` - Network requests and responses
- `console` - Console logs and messages
- `performance` - Performance metrics updates
- `error` - JavaScript errors and exceptions
- `session-status` - Session lifecycle events
- `task-execution` - Task progress updates

### Event Format

All WebSocket events follow this format:

```json
{
  "id": "evt_1234567890abcdef",
  "type": "navigation",
  "sessionId": "session123",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "url": "https://example.com",
    "title": "Example Page",
    "loadTime": 1200
  },
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "viewport": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

### WebSocket Connection Example

```javascript
const ws = new WebSocket('ws://localhost:3000/browser-automation');

ws.onopen = () => {
  // Subscribe to events
  ws.send(JSON.stringify({
    type: 'subscribe:events',
    data: {
      sessionId: 'session123',
      eventTypes: ['navigation', 'performance'],
      includeScreenshots: true,
      throttleMs: 1000
    }
  }));
};

ws.onmessage = (event) => {
  const browserEvent = JSON.parse(event.data);
  console.log('Browser event:', browserEvent);
};
```

## Error Responses

All endpoints return standard HTTP status codes and error responses:

```json
{
  "statusCode": 400,
  "message": "Invalid session ID provided",
  "error": "Bad Request",
  "timestamp": "2024-01-01T12:00:00Z",
  "path": "/browser-use/advanced/performance/monitor/start/invalid-session"
}
```

### Common Error Codes

- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing or invalid JWT token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (session or resource not found)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (server error)

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- Performance monitoring: 60 requests per minute
- WebSocket connections: 10 concurrent connections per user
- Extension management: 5 installations per minute
- Recording operations: 3 concurrent recordings per user

## Security

All API endpoints implement comprehensive security measures:

- JWT authentication required
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention
- XSS attack prevention
- CSRF protection
- Rate limiting and throttling
- Comprehensive audit logging

## SDK Examples

### Node.js SDK

```javascript
const { BrowserUseAdvancedClient } = require('@bytebot/browser-use-sdk');

const client = new BrowserUseAdvancedClient({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key'
});

// Start performance monitoring
const monitoring = await client.performance.startMonitoring('session123');

// Enable mobile emulation
await client.mobile.emulate('session123', {
  deviceName: 'iPhone 13 Pro'
});

// Install extension
const extension = await client.extensions.install('session123', {
  source: 'chrome-web-store',
  extensionId: 'extension-id-123'
});

// Start WebSocket streaming
const stream = client.websocket.stream('session123', {
  eventTypes: ['navigation', 'performance'],
  includeScreenshots: true
});

stream.on('event', (event) => {
  console.log('Browser event:', event);
});
```

### Python SDK

```python
from bytebot_sdk import BrowserUseAdvancedClient

client = BrowserUseAdvancedClient(
    base_url='https://api.example.com',
    api_key='your-api-key'
)

# Start performance monitoring
monitoring = await client.performance.start_monitoring('session123')

# Enable mobile emulation
await client.mobile.emulate('session123', {
    'device_name': 'iPhone 13 Pro'
})

# Install extension
extension = await client.extensions.install('session123', {
    'source': 'chrome-web-store',
    'extension_id': 'extension-id-123'
})

# Start WebSocket streaming
async for event in client.websocket.stream('session123'):
    print(f'Browser event: {event}')
```

## Best Practices

1. **Performance Monitoring**: Start monitoring before executing automation tasks for comprehensive metrics
2. **Mobile Emulation**: Use predefined device configurations for consistent testing
3. **Extension Management**: Validate extensions before installation for security
4. **WebSocket Streaming**: Implement proper throttling to prevent overwhelming clients
5. **Form Automation**: Use field validation to ensure data integrity
6. **Recording**: Limit recording duration to prevent excessive resource usage
7. **Error Handling**: Implement comprehensive error handling for all API calls
8. **Authentication**: Regularly rotate JWT tokens for security
9. **Rate Limiting**: Respect rate limits to ensure consistent API availability
10. **Resource Cleanup**: Always clean up sessions and recordings when done

## Support

For API support and questions:
- Documentation: https://docs.bytebot.ai/browser-use-advanced
- Support Email: support@bytebot.ai
- GitHub Issues: https://github.com/bytebot/browser-use/issues
- Community Forum: https://community.bytebot.ai