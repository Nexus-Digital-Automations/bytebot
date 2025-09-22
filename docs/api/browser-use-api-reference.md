# Browser-Use API Reference

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Task Management](#task-management)
4. [Session Management](#session-management)
5. [Screenshot Operations](#screenshot-operations)
6. [DOM Interactions](#dom-interactions)
7. [Form Automation](#form-automation)
8. [Data Extraction](#data-extraction)
9. [Monitoring & Health](#monitoring--health)
10. [Results & Export](#results--export)
11. [Error Handling](#error-handling)
12. [Rate Limiting](#rate-limiting)

## Quick Start

### Base URL
```
Local Development: http://localhost:3000
Local Production:  http://localhost:8080
```

### Basic Usage Example

```bash
# 1. Authenticate (get JWT token)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# 2. Create a browser session
curl -X POST http://localhost:3000/api/v1/browser-use/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My automation session"}'

# 3. Create and execute a task
curl -X POST http://localhost:3000/api/v1/browser-use/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Extract product data",
    "type": "data_extraction",
    "startUrl": "https://example.com",
    "steps": [
      {
        "id": "nav1",
        "type": "navigate",
        "action": {"url": "https://example.com/products"}
      }
    ]
  }'
```

## Authentication

All API endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Required Headers

```http
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
X-Request-ID: {UNIQUE_REQUEST_ID} (optional)
X-Client-Version: {CLIENT_VERSION} (optional)
```

## Task Management

### Create Browser Task

Create and execute a new browser automation task.

**Endpoint:** `POST /api/v1/browser-use/tasks`

**Request Body:**
```json
{
  "name": "E-commerce Product Extraction",
  "description": "Extract product information from multiple pages",
  "type": "data_extraction",
  "startUrl": "https://example-store.com/products",
  "timeout": 300000,
  "steps": [
    {
      "id": "navigate_to_products",
      "name": "Navigate to products page",
      "type": "navigate",
      "action": {
        "url": "https://example-store.com/products",
        "waitForSelector": ".product-grid"
      },
      "timeout": 30000
    },
    {
      "id": "extract_product_data",
      "name": "Extract product information",
      "type": "extract",
      "action": {
        "selector": ".product-item",
        "fields": {
          "title": ".product-title",
          "price": ".product-price",
          "image": ".product-image@src"
        }
      }
    },
    {
      "id": "capture_screenshot",
      "name": "Take screenshot of results",
      "type": "screenshot",
      "action": {
        "fullPage": true,
        "quality": 90
      }
    }
  ],
  "constraints": {
    "allowedDomains": ["example-store.com"],
    "maxExecutionTime": 600000,
    "maxMemoryUsage": 512,
    "headless": true
  },
  "configuration": {
    "browserSettings": {
      "viewport": {
        "width": 1920,
        "height": 1080
      },
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "headless": true,
      "disableImages": false
    },
    "screenshotOptions": {
      "fullPage": false,
      "quality": 80,
      "format": "png"
    }
  }
}
```

**Response:**
```json
{
  "taskId": "task_1234567890",
  "name": "E-commerce Product Extraction",
  "status": "running",
  "progress": {
    "currentStep": 1,
    "totalSteps": 3,
    "completedSteps": 0,
    "failedSteps": 0,
    "percentComplete": 0,
    "estimatedTimeRemaining": 180000
  },
  "startedAt": "2024-01-15T10:30:00Z",
  "executionTimeMs": 0,
  "sessionId": "session_abcd1234",
  "configuration": {
    "browserSettings": {
      "viewport": {"width": 1920, "height": 1080},
      "headless": true
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### List Tasks

Get a paginated list of all browser automation tasks.

**Endpoint:** `GET /api/v1/browser-use/tasks`

**Query Parameters:**
- `status` (optional): Filter by task status (`pending`, `running`, `completed`, `failed`, `cancelled`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 100)

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/browser-use/tasks?status=completed&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "tasks": [
    {
      "taskId": "task_1234567890",
      "name": "E-commerce Product Extraction",
      "status": "completed",
      "progress": {
        "currentStep": 3,
        "totalSteps": 3,
        "completedSteps": 3,
        "failedSteps": 0,
        "percentComplete": 100,
        "estimatedTimeRemaining": 0
      },
      "startedAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T10:33:45Z",
      "executionTimeMs": 225000,
      "sessionId": "session_abcd1234"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  },
  "filters": {
    "status": "completed"
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### Get Task Details

Retrieve detailed information about a specific task.

**Endpoint:** `GET /api/v1/browser-use/tasks/{taskId}`

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/browser-use/tasks/task_1234567890" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Task

Update task parameters or configuration.

**Endpoint:** `PUT /api/v1/browser-use/tasks/{taskId}`

**Request Body:**
```json
{
  "name": "Updated Task Name",
  "description": "Updated description",
  "configuration": {
    "browserSettings": {
      "viewport": {
        "width": 1366,
        "height": 768
      }
    }
  }
}
```

### Start/Stop Tasks

**Start Task:** `POST /api/v1/browser-use/tasks/{taskId}/start`
**Stop Task:** `POST /api/v1/browser-use/tasks/{taskId}/stop`

**Example:**
```bash
# Start task
curl -X POST "http://localhost:3000/api/v1/browser-use/tasks/task_1234567890/start" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Stop task
curl -X POST "http://localhost:3000/api/v1/browser-use/tasks/task_1234567890/stop" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Delete Task

**Endpoint:** `DELETE /api/v1/browser-use/tasks/{taskId}`

```bash
curl -X DELETE "http://localhost:3000/api/v1/browser-use/tasks/task_1234567890" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Session Management

### Create Browser Session

Create a new browser session with custom configuration.

**Endpoint:** `POST /api/v1/browser-use/sessions`

**Request Body:**
```json
{
  "name": "E-commerce Automation Session",
  "configuration": {
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "headless": true,
    "disableImages": false,
    "disableJavaScript": false
  },
  "persistent": false,
  "timeout": 1800000
}
```

**Response:**
```json
{
  "sessionId": "session_xyz789",
  "name": "E-commerce Automation Session",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z",
  "lastActivity": "2024-01-15T10:30:00Z",
  "configuration": {
    "viewport": {"width": 1920, "height": 1080},
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "headless": true
  },
  "currentUrl": "about:blank",
  "performance": {
    "memoryUsageMB": 45.2,
    "cpuUsagePercent": 2.1,
    "pageLoadTimeMs": 0,
    "activeConnections": 0
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### List Sessions

**Endpoint:** `GET /api/v1/browser-use/sessions`

**Query Parameters:**
- `active` (optional): Filter by active status (true/false)

**Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/browser-use/sessions?active=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "sessions": [
    {
      "sessionId": "session_xyz789",
      "name": "E-commerce Automation Session",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastActivity": "2024-01-15T10:35:00Z",
      "currentUrl": "https://example-store.com/products",
      "performance": {
        "memoryUsageMB": 67.8,
        "cpuUsagePercent": 5.3,
        "pageLoadTimeMs": 1250,
        "activeConnections": 3
      }
    }
  ],
  "timestamp": "2024-01-15T10:36:00Z"
}
```

### Get Session Details

**Endpoint:** `GET /api/v1/browser-use/sessions/{sessionId}`

### Close Session(s)

**Close Single Session:** `DELETE /api/v1/browser-use/sessions/{sessionId}`
**Close All Sessions:** `DELETE /api/v1/browser-use/sessions`

## Screenshot Operations

### Capture Screenshot

Capture a screenshot of the current browser state.

**Endpoint:** `POST /api/v1/browser-use/sessions/{sessionId}/screenshot`

**Request Body:**
```json
{
  "selector": ".product-grid",
  "fullPage": false,
  "options": {
    "quality": 90,
    "format": "png"
  }
}
```

**Response:**
```json
{
  "screenshotId": "screenshot_abc123",
  "sessionId": "session_xyz789",
  "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "png",
    "fileSize": 145789,
    "capturedAt": "2024-01-15T10:30:00Z",
    "url": "https://example-store.com/products"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get Screenshot

**Endpoint:** `GET /api/v1/browser-use/screenshots/{screenshotId}`

## DOM Interactions

### Navigate to URL

Navigate the browser to a specific URL.

**Endpoint:** `POST /api/v1/browser-use/sessions/{sessionId}/navigate`

**Request Body:**
```json
{
  "url": "https://example-store.com/products/category/electronics",
  "waitForSelector": ".product-list",
  "timeout": 30000
}
```

**Response:**
```json
{
  "currentUrl": "https://example-store.com/products/category/electronics",
  "title": "Electronics - Example Store",
  "readyState": "complete",
  "elements": [
    {
      "tagName": "div",
      "attributes": {"class": "product-list"},
      "text": "",
      "visible": true,
      "position": {"x": 100, "y": 200},
      "size": {"width": 800, "height": 600}
    }
  ],
  "performance": {
    "loadTime": 1250,
    "domContentLoaded": 800,
    "firstContentfulPaint": 950,
    "networkRequests": 15
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Click Element

Click on a DOM element.

**Endpoint:** `POST /api/v1/browser-use/sessions/{sessionId}/click`

**Request Body (by selector):**
```json
{
  "selector": ".add-to-cart-btn",
  "button": "left",
  "clickCount": 1,
  "delay": 0
}
```

**Request Body (by coordinates):**
```json
{
  "coordinates": {"x": 500, "y": 300},
  "button": "left",
  "clickCount": 1
}
```

**Response:**
```json
{
  "elementInfo": {
    "tagName": "button",
    "attributes": {
      "class": "add-to-cart-btn btn-primary",
      "id": "add-cart-12345"
    },
    "text": "Add to Cart",
    "visible": true,
    "position": {"x": 480, "y": 285},
    "size": {"width": 120, "height": 40}
  },
  "actionResult": {
    "clicked": true,
    "elementChanged": false,
    "pageNavigated": false
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Type Text

Type text into an input element.

**Endpoint:** `POST /api/v1/browser-use/sessions/{sessionId}/type`

**Request Body:**
```json
{
  "selector": "#search-input",
  "text": "wireless headphones",
  "delay": 50,
  "clear": true
}
```

### Scroll Page

Scroll the page or specific element.

**Endpoint:** `POST /api/v1/browser-use/sessions/{sessionId}/scroll`

**Request Body:**
```json
{
  "direction": "down",
  "amount": 500,
  "selector": ".scrollable-container"
}
```

### Get Browser State

Get current browser state and DOM information.

**Endpoint:** `GET /api/v1/browser-use/sessions/{sessionId}/state`

**Query Parameters:**
- `includeScreenshot` (optional): Include base64 screenshot data (default: false)

**Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/browser-use/sessions/session_xyz789/state?includeScreenshot=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Form Automation

### Fill Form

Automatically fill form fields.

**Endpoint:** `POST /api/v1/browser-use/sessions/{sessionId}/forms/fill`

**Request Body:**
```json
{
  "formSelector": "#contact-form",
  "fields": [
    {
      "selector": "#first-name",
      "value": "John",
      "type": "text"
    },
    {
      "selector": "#last-name",
      "value": "Doe",
      "type": "text"
    },
    {
      "selector": "#email",
      "value": "john.doe@example.com",
      "type": "email"
    },
    {
      "selector": "#country",
      "value": "United States",
      "type": "select"
    },
    {
      "selector": "#newsletter",
      "value": "true",
      "type": "checkbox"
    }
  ],
  "validateBefore": true
}
```

**Response:**
```json
{
  "formValid": true,
  "validationErrors": [],
  "fieldsProcessed": 5,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Submit Form

Submit a form after filling.

**Endpoint:** `POST /api/v1/browser-use/sessions/{sessionId}/forms/submit`

**Request Body:**
```json
{
  "formSelector": "#contact-form",
  "submitSelector": "#submit-btn",
  "waitForNavigation": true
}
```

## Data Extraction

### Extract Structured Data

Extract data from the current page using CSS selectors.

**Endpoint:** `POST /api/v1/browser-use/sessions/{sessionId}/extract`

**Request Body:**
```json
{
  "rules": [
    {
      "name": "product_titles",
      "selector": ".product-item h3",
      "attribute": "text",
      "multiple": true
    },
    {
      "name": "product_prices",
      "selector": ".product-item .price",
      "attribute": "text",
      "transform": "parsePrice",
      "multiple": true
    },
    {
      "name": "product_images",
      "selector": ".product-item img",
      "attribute": "src",
      "multiple": true
    },
    {
      "name": "product_links",
      "selector": ".product-item a",
      "attribute": "href",
      "multiple": true
    },
    {
      "name": "page_title",
      "selector": "h1",
      "attribute": "text",
      "multiple": false
    }
  ],
  "format": "json"
}
```

**Response:**
```json
{
  "extractedData": {
    "product_titles": [
      "Wireless Bluetooth Headphones",
      "Smart Watch Pro",
      "USB-C Fast Charger"
    ],
    "product_prices": [
      "$79.99",
      "$199.99",
      "$24.99"
    ],
    "product_images": [
      "https://example-store.com/images/headphones.jpg",
      "https://example-store.com/images/smartwatch.jpg",
      "https://example-store.com/images/charger.jpg"
    ],
    "product_links": [
      "https://example-store.com/products/headphones-123",
      "https://example-store.com/products/smartwatch-456",
      "https://example-store.com/products/charger-789"
    ],
    "page_title": "Electronics Category"
  },
  "metadata": {
    "rulesProcessed": 5,
    "dataPointsExtracted": 13,
    "extractionTime": 450,
    "sourceUrl": "https://example-store.com/products/category/electronics"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Monitoring & Health

### Service Health Check

Check the overall health of the browser-use service.

**Endpoint:** `GET /api/v1/browser-use/monitoring/health`

**Response:**
```json
{
  "serviceHealth": {
    "status": "healthy",
    "uptime": 86400,
    "version": "2.0.0"
  },
  "activeSessions": 3,
  "runningTasks": 1,
  "systemResources": {
    "memoryUsagePercent": 45.2,
    "cpuUsagePercent": 12.8,
    "diskUsagePercent": 67.3,
    "availableMemoryMB": 2048
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Detailed Health Information

Get comprehensive health information including local-only compliance.

**Endpoint:** `GET /api/v1/browser-use/health/detailed`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400,
  "version": "2.0.0",
  "localOnlyCompliance": {
    "verified": true,
    "cloudDependencies": [],
    "localDatabaseConnected": true,
    "workingDirectory": "/app/data"
  },
  "browserProcesses": {
    "total": 5,
    "active": 3,
    "idle": 2,
    "failed": 0,
    "memoryUsageMB": 456.7,
    "cpuUsagePercent": 8.2
  },
  "taskMetrics": {
    "totalTasks": 127,
    "activeTasks": 1,
    "queueLength": 0,
    "successRate": 94.5,
    "averageExecutionTime": 45000
  },
  "systemResources": {
    "memoryUsagePercent": 45.2,
    "diskUsagePercent": 67.3,
    "cpuUsagePercent": 12.8,
    "availableMemoryMB": 2048
  },
  "integrations": {
    "browserUseFramework": "online",
    "pythonRuntime": "online",
    "chromeDriver": "online",
    "localStorage": "online",
    "database": "online"
  }
}
```

### Performance Metrics

Get performance metrics and analytics.

**Endpoint:** `GET /api/v1/browser-use/metrics/performance`

**Query Parameters:**
- `timeRange` (optional): Time range for metrics (`1h`, `24h`, `7d`, `30d`)

**Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/browser-use/metrics/performance?timeRange=24h" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "timeRange": "24h",
  "timestamp": "2024-01-15T10:30:00Z",
  "taskPerformance": {
    "totalExecuted": 234,
    "successRate": 94.5,
    "averageExecutionTime": 67500,
    "failureReasons": {
      "timeout": 8,
      "selector_not_found": 3,
      "network_error": 2
    }
  },
  "resourceUtilization": {
    "avgMemoryUsageMB": 387.2,
    "peakMemoryUsageMB": 892.1,
    "avgCpuUsagePercent": 15.7,
    "peakCpuUsagePercent": 78.3
  },
  "browserMetrics": {
    "sessionsCreated": 89,
    "averageSessionDuration": 456000,
    "screenshotsCaptured": 567,
    "pagesVisited": 1234
  }
}
```

### Task Status

Get real-time status of a specific task.

**Endpoint:** `GET /api/v1/browser-use/monitoring/tasks/{taskId}/status`

**Response:**
```json
{
  "taskId": "task_1234567890",
  "status": "running",
  "progress": {
    "currentStep": 2,
    "totalSteps": 5,
    "completedSteps": 1,
    "failedSteps": 0,
    "percentComplete": 20,
    "estimatedTimeRemaining": 120000
  },
  "currentStep": "extract_product_data",
  "logs": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "level": "info",
      "message": "Task started successfully",
      "context": {"stepId": "navigate_to_products"}
    },
    {
      "timestamp": "2024-01-15T10:30:15Z",
      "level": "info",
      "message": "Navigation completed",
      "context": {"url": "https://example-store.com/products", "loadTime": 1250}
    },
    {
      "timestamp": "2024-01-15T10:30:30Z",
      "level": "info",
      "message": "Starting data extraction",
      "context": {"stepId": "extract_product_data", "elementsFound": 24}
    }
  ],
  "timestamp": "2024-01-15T10:30:45Z"
}
```

## Results & Export

### Get Task Results

Retrieve results from a completed task.

**Endpoint:** `GET /api/v1/browser-use/results/{taskId}`

**Response:**
```json
{
  "taskId": "task_1234567890",
  "status": "SUCCESS",
  "taskName": "E-commerce Product Extraction",
  "startedAt": "2024-01-15T10:30:00Z",
  "executionTimeMs": 225000,
  "executionSteps": [
    {
      "stepId": "navigate_to_products",
      "name": "Navigate to products page",
      "status": "completed",
      "executionTimeMs": 1250,
      "output": {
        "url": "https://example-store.com/products",
        "title": "Products - Example Store"
      }
    },
    {
      "stepId": "extract_product_data",
      "name": "Extract product information",
      "status": "completed",
      "executionTimeMs": 2100,
      "output": {
        "itemsFound": 24,
        "dataFields": ["title", "price", "image"]
      }
    }
  ],
  "extractedData": [
    {
      "title": "Wireless Bluetooth Headphones",
      "price": "$79.99",
      "image": "https://example-store.com/images/headphones.jpg"
    },
    {
      "title": "Smart Watch Pro",
      "price": "$199.99",
      "image": "https://example-store.com/images/smartwatch.jpg"
    }
  ],
  "screenshots": [
    {
      "screenshotId": "screenshot_abc123",
      "filename": "products_page.png",
      "capturedAt": "2024-01-15T10:33:45Z",
      "step": "capture_screenshot"
    }
  ],
  "performanceMetrics": {
    "totalExecutionTimeMs": 225000,
    "averageStepTimeMs": 75000,
    "sessionStartupTimeMs": 3200,
    "memoryUsage": {
      "peakMemoryMB": 234.5,
      "averageMemoryMB": 187.2
    },
    "cpuUsage": {
      "peakCpuPercent": 45.7,
      "averageCpuPercent": 23.4
    },
    "networkActivity": {
      "totalRequests": 28,
      "totalDataTransferred": 2456789
    }
  },
  "sessionInfo": {
    "sessionId": "session_xyz789",
    "browserType": "chromium",
    "browserVersion": "119.0.6045.105",
    "viewportSize": {"width": 1920, "height": 1080},
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "headless": true
  },
  "resultSummary": {
    "totalSteps": 3,
    "successfulSteps": 3,
    "failedSteps": 0,
    "skippedSteps": 0,
    "dataExtracted": 24,
    "screenshotsCaptured": 1,
    "errorsEncountered": 0,
    "warnings": []
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### Export Task Results

Export task results in various formats.

**Endpoint:** `POST /api/v1/browser-use/results/{taskId}/export`

**Request Body:**
```json
{
  "format": "JSON",
  "includeScreenshots": true,
  "includeLogs": true
}
```

**Response:**
```json
{
  "taskId": "task_1234567890",
  "status": "SUCCESS",
  "exportInfo": {
    "format": "JSON",
    "filename": "task_1234567890_results.json",
    "fileSize": 45678,
    "exportedAt": "2024-01-15T10:35:00Z",
    "downloadUrl": "http://localhost:3000/downloads/exports/task_1234567890_results.json"
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

## Error Handling

### Standard Error Response Format

All API errors follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "_error": "Required field 'name' is missing",
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/v1/browser-use/tasks",
  "correlationId": "corr_1705316100_abc123"
}
```

### Common Error Codes

| Status Code | Description | Example Scenarios |
|-------------|-------------|-------------------|
| 400 | Bad Request | Invalid request body, missing required fields |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions for operation |
| 404 | Not Found | Task, session, or resource not found |
| 409 | Conflict | Task already running, session already exists |
| 422 | Unprocessable Entity | Invalid configuration, domain restrictions |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Browser process crashed, database error |
| 503 | Service Unavailable | Circuit breaker open, system overloaded |

### Error Handling Examples

**Validation Error (400):**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "startUrl",
      "message": "Must be a valid URL",
      "value": "invalid-url"
    },
    {
      "field": "steps",
      "message": "Must contain at least one step",
      "value": []
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/v1/browser-use/tasks"
}
```

**Rate Limit Error (429):**
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded",
  "retryAfter": 60,
  "limit": 100,
  "remaining": 0,
  "resetTime": "2024-01-15T10:31:00Z",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Domain Restriction Error (422):**
```json
{
  "statusCode": 422,
  "message": "Invalid task configuration",
  "errors": [
    {
      "field": "startUrl",
      "message": "URL domain not in allowed domains list",
      "value": "restricted-site.com",
      "allowedDomains": ["example-store.com", "api.example-store.com"]
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Rate Limiting

### Rate Limit Headers

All responses include rate limiting information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705316160
X-RateLimit-Window: 3600
```

### Rate Limits by Endpoint

| Endpoint Category | Rate Limit | Window |
|-------------------|------------|--------|
| Authentication | 10 requests | 1 minute |
| Task Creation | 20 requests | 1 hour |
| Task Operations | 100 requests | 1 hour |
| Session Management | 50 requests | 1 hour |
| Screenshot Capture | 30 requests | 1 hour |
| DOM Interactions | 200 requests | 1 hour |
| Data Extraction | 50 requests | 1 hour |
| Monitoring | 1000 requests | 1 hour |
| Results/Export | 20 requests | 1 hour |

### Rate Limit Handling

When rate limits are exceeded:

1. **HTTP 429 Response**: Includes `retryAfter` header
2. **Exponential Backoff**: Implement client-side backoff
3. **Queue Requests**: Use request queuing for burst scenarios

**Example Client-Side Handling:**
```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '60');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}
```

### Best Practices

1. **Batch Operations**: Group related operations when possible
2. **Caching**: Cache session and task information to reduce API calls
3. **Monitoring**: Track rate limit usage in your application
4. **Error Handling**: Implement proper retry logic with exponential backoff
5. **Resource Cleanup**: Close sessions and clean up resources promptly

---

This API reference provides comprehensive documentation for integrating with the Bytebot Browser-Use API. For additional examples and advanced usage patterns, see the [Integration Guide](./browser-use-integration-guide.md).