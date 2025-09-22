# Browser Automation API - Browser-Use Integration

## Overview

This module provides comprehensive browser automation capabilities by integrating the `browser-use` Python library with the Bytebot TypeScript infrastructure. It enables enterprise-grade browser automation through REST API endpoints with async job management, session lifecycle control, and comprehensive security validation.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Automation API                   │
├─────────────────────────────────────────────────────────────┤
│  BrowserAutomationController                               │
│  ├─── Session Management (Create/List/Close)               │
│  ├─── Navigation (URLs, Page Loading)                      │
│  ├─── Actions (Click, Type, Scroll, etc.)                  │
│  ├─── Screenshots (Visual Feedback)                        │
│  └─── Data Extraction (CSS, XPath, AI-powered)             │
├─────────────────────────────────────────────────────────────┤
│  BrowserAutomationService                                  │
│  ├─── Python Process Management                            │
│  ├─── Session State Tracking                               │
│  ├─── Communication Protocol (JSON over stdio)             │
│  └─── Resource Cleanup & Monitoring                        │
├─────────────────────────────────────────────────────────────┤
│  Python Bridge (bytebot_bridge.py)                         │
│  ├─── Browser-Use Library Interface                        │
│  ├─── Command Processing & Response                        │
│  ├─── Browser Session Management                           │
│  └─── Error Handling & Recovery                            │
├─────────────────────────────────────────────────────────────┤
│  Browser-Use Python Library                                │
│  ├─── Chrome/Chromium Control (CDP)                        │
│  ├─── DOM Interaction & Automation                         │
│  ├─── Screenshot & Visual Processing                       │
│  └─── Agent-Based AI Automation (Optional)                 │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 🚀 **Comprehensive Browser Automation**
- **Session Management**: Create, monitor, and close browser sessions with lifecycle control
- **Navigation**: URL navigation with wait conditions and timeout handling
- **DOM Interaction**: Click, type, scroll, hover, key presses, form automation
- **Data Extraction**: CSS selectors, XPath, AI-powered content analysis
- **Visual Feedback**: Screenshot capture with metadata and page state

### 🔒 **Enterprise Security**
- **Input Validation**: Comprehensive security validation for all parameters
- **URL Security**: Protocol validation, private network blocking, malicious content detection
- **Injection Prevention**: XSS, script injection, and path traversal protection
- **Authentication**: JWT-based authentication with role-based access control
- **Rate Limiting**: Suspicious activity detection and throttling

### ⚡ **Performance & Scalability**
- **Async Job Integration**: Leverages existing Bytebot async job infrastructure
- **Session Pooling**: Configurable session limits and resource management
- **Timeout Handling**: Granular timeout controls for all operations
- **Resource Cleanup**: Automatic cleanup of inactive sessions and processes
- **Monitoring**: Comprehensive logging and performance metrics

### 🔧 **Integration & Flexibility**
- **REST API**: Comprehensive REST endpoints for all automation operations
- **Modular Design**: Clean separation of concerns with dependency injection
- **Configuration**: Environment-based configuration for different deployment scenarios
- **Error Handling**: Structured error responses with detailed context
- **Documentation**: OpenAPI/Swagger documentation for all endpoints

## API Endpoints

### Session Management

#### `POST /browser-automation/sessions`
Creates a new browser automation session.

**Request Body:**
```typescript
{
  headless?: boolean;              // Run in headless mode (default: true)
  viewport?: {                     // Browser viewport configuration
    width: number;                 // Width in pixels (800-3840)
    height: number;                // Height in pixels (600-2160)
    devicePixelRatio?: number;     // Device pixel ratio (0.5-3)
  };
  userAgent?: string;              // Custom user agent string
  proxy?: {                        // Proxy configuration
    host: string;                  // Proxy server host
    port: number;                  // Proxy server port (1-65535)
    username?: string;             // Proxy authentication username
    password?: string;             // Proxy authentication password
  };
  timeout?: number;                // Session timeout in ms (5000-1800000)
  enableExtensions?: boolean;      // Enable browser extensions (default: false)
  extraArgs?: string[];            // Additional browser launch arguments
  metadata?: Record<string, any>;  // Session metadata for tracking
}
```

**Response:**
```typescript
{
  sessionId: string;               // Unique session identifier
  createdAt: string;               // ISO timestamp of creation
  status: "active" | "inactive" | "closed" | "error";
  processId: number;               // Browser process ID
  currentUrl?: string;             // Current page URL
  currentTitle?: string;           // Current page title
  configuration: {                 // Session configuration
    headless: boolean;
    viewport?: { width: number; height: number };
    userAgent?: string;
    timeout: number;
  };
  metadata?: Record<string, any>;  // Session metadata
}
```

#### `GET /browser-automation/sessions`
Lists active browser sessions for the authenticated user.

**Response:**
```typescript
{
  sessions: Array<{
    sessionId: string;
    status: "active" | "inactive" | "closed" | "error";
    createdAt: string;
    lastActivityAt?: string;
    currentUrl?: string;
    currentTitle?: string;
    tabCount: number;
    memoryUsageMB: number;
    cpuUsagePercent: number;
  }>;
  totalCount: number;
  generatedAt: string;
}
```

#### `DELETE /browser-automation/sessions/{sessionId}`
Closes an active browser session and cleans up resources.

**Response:**
```typescript
{
  closed: boolean;
  message: string;
  sessionId: string;
}
```

### Navigation

#### `POST /browser-automation/sessions/{sessionId}/navigate`
Navigates the browser session to a specified URL (async operation).

**Request Body:**
```typescript
{
  url: string;                     // Target URL (must be valid HTTP/HTTPS)
  waitForLoad?: boolean;           // Wait for page load completion (default: true)
  timeout?: number;                // Navigation timeout in ms (1000-120000)
  waitForSelector?: string;        // CSS selector to wait for after navigation
  referer?: string;                // Referer header for the navigation request
}
```

**Response:**
```typescript
{
  jobId: string;                   // Async job identifier for tracking
  submittedAt: string;             // ISO timestamp of job submission
  sessionId: string;               // Browser session identifier
}
```

### Actions

#### `POST /browser-automation/sessions/{sessionId}/actions`
Executes browser automation actions (async operation).

**Request Body:**
```typescript
{
  action: "click" | "type" | "scroll" | "hover" | "submit_form" |
          "select_dropdown" | "upload_file" | "press_key" | "wait" |
          "focus" | "drag_and_drop";
  target?: {                       // Target element specification
    selector?: string;             // CSS selector
    xpath?: string;                // XPath expression
    text?: string;                 // Element text content to match
    coordinates?: { x: number; y: number }; // Direct coordinates
  };
  text?: string;                   // Text input for type actions
  keys?: string;                   // Key combination for press_key actions
  scrollDistance?: number;         // Scroll distance in pixels (-5000 to 5000)
  waitDuration?: number;           // Wait duration in ms (100-30000)
  filePath?: string;               // File path for upload_file actions
  optionValue?: string;            // Dropdown option value to select
  sourceCoordinates?: { x: number; y: number }; // Source for drag operations
  targetCoordinates?: { x: number; y: number }; // Target for drag operations
  timeout?: number;                // Action timeout in ms (1000-60000)
  metadata?: Record<string, any>;  // Additional action metadata
}
```

**Response:**
```typescript
{
  jobId: string;                   // Async job identifier for tracking
  submittedAt: string;             // ISO timestamp of job submission
  sessionId: string;               // Browser session identifier
  action: string;                  // Action type that was submitted
}
```

### Screenshots

#### `GET /browser-automation/sessions/{sessionId}/screenshot`
Captures a screenshot of the current browser session state.

**Response:**
```typescript
{
  image: string;                   // Base64 encoded screenshot image data
  success: boolean;                // Screenshot capture success status
  format: string;                  // Image format (e.g., "png")
  width: number;                   // Image width in pixels
  height: number;                  // Image height in pixels
  fileSizeBytes: number;           // Image file size in bytes
  capturedAt: string;              // Screenshot capture timestamp
  pageUrl?: string;                // Current page URL when screenshot was taken
  pageTitle?: string;              // Current page title when screenshot was taken
}
```

### Data Extraction

#### `POST /browser-automation/sessions/{sessionId}/extract`
Extracts structured data from the browser session (async operation).

**Request Body:**
```typescript
{
  extractionType: "css_selector" | "xpath" | "ai_powered" |
                  "text_content" | "attributes" | "structured_data";
  selector?: string;               // CSS selector for CSS_SELECTOR type
  xpath?: string;                  // XPath expression for XPATH type
  aiPrompt?: string;               // AI prompt for AI_POWERED type
  attributes?: string[];           // Target attributes to extract
  extractAll?: boolean;            // Extract data from all matching elements
  includeMetadata?: boolean;       // Include element metadata in results
  outputFormat?: "json" | "csv" | "xml"; // Output format (default: "json")
  maxElements?: number;            // Maximum number of elements to extract (1-1000)
  timeout?: number;                // Extraction timeout in ms (1000-120000)
}
```

**Response:**
```typescript
{
  jobId: string;                   // Async job identifier for tracking
  submittedAt: string;             // ISO timestamp of job submission
  sessionId: string;               // Browser session identifier
  extractionType: string;          // Extraction type that was submitted
}
```

## Job Status and Results

All async operations return a `jobId` that can be used with the existing Bytebot job management endpoints:

- `GET /jobs/{jobId}/status` - Get job execution status
- `GET /jobs/{jobId}/result` - Get job execution results
- `DELETE /jobs/{jobId}` - Cancel job execution

## Configuration

### Environment Variables

```bash
# Python Configuration
PYTHON_EXECUTABLE_PATH=/usr/bin/python3          # Python executable path
BROWSER_USE_PATH=../../../browser-use            # Path to browser-use library

# Session Management
MAX_BROWSER_SESSIONS=10                          # Maximum concurrent sessions
BROWSER_SESSION_TIMEOUT_MS=1800000               # Session timeout (30 minutes)
CLEANUP_INTERVAL_MS=60000                        # Cleanup interval (1 minute)

# Features
ENABLE_AI_FEATURES=false                         # Enable AI-powered features

# Default Settings
DEFAULT_VIEWPORT_WIDTH=1920                      # Default viewport width
DEFAULT_VIEWPORT_HEIGHT=1080                     # Default viewport height

# Security Settings
ALLOW_LOCAL_NETWORK=false                        # Allow local network access
MAX_URL_LENGTH=2048                              # Maximum URL length
MAX_SELECTOR_LENGTH=1000                         # Maximum CSS selector length
MAX_TEXT_INPUT_LENGTH=10000                      # Maximum text input length
ALLOWED_FILE_EXTENSIONS=".txt,.csv,.json,.xml,.pdf,.png,.jpg,.jpeg,.gif,.bmp,.svg,.doc,.docx,.xls,.xlsx"

# Performance Settings
COMMAND_TIMEOUT_MS=30000                         # Default command timeout
NAVIGATION_TIMEOUT_MS=30000                      # Default navigation timeout
ACTION_TIMEOUT_MS=10000                          # Default action timeout
EXTRACTION_TIMEOUT_MS=30000                      # Default extraction timeout
```

### Module Configuration

```typescript
// Custom module configuration
import { BrowserAutomationModuleFactory } from './browser-automation.module';

const CustomBrowserModule = BrowserAutomationModuleFactory.createWithConfig({
  maxSessions: 20,
  sessionTimeoutMs: 3600000, // 1 hour
  enableAIFeatures: true,
  securitySettings: {
    allowLocalNetwork: false,
    maxUrlLength: 4096,
  },
  performanceSettings: {
    commandTimeoutMs: 60000,
    navigationTimeoutMs: 45000,
  },
});
```

## Dependencies

### System Requirements
- **Node.js**: 16+ with TypeScript support
- **Python**: 3.11+ with pip package manager
- **Browser**: Chrome/Chromium 90+ or compatible browser
- **Operating System**: Linux, macOS, or Windows with WSL

### Python Dependencies
```bash
# Install browser-use library
pip install browser-use

# Optional: Install additional dependencies for AI features
pip install openai anthropic
```

### TypeScript Dependencies
```json
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/swagger": "^7.0.0",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.0"
}
```

## Security Considerations

### Input Validation
- **URL Security**: Validates protocols, blocks private networks, checks for malicious content
- **Injection Prevention**: Sanitizes CSS selectors, XPath expressions, and text inputs
- **File Path Security**: Validates file paths, prevents directory traversal attacks
- **Proxy Validation**: Validates proxy settings and prevents local network access

### Authentication & Authorization
- **JWT Authentication**: All endpoints require valid JWT tokens
- **Role-Based Access**: OPERATOR or ADMIN roles required for browser automation
- **User Isolation**: Sessions are isolated per user, no cross-user access

### Rate Limiting & Monitoring
- **Request Rate Limiting**: Prevents abuse and suspicious activity
- **Resource Monitoring**: Tracks session count, memory usage, CPU usage
- **Audit Logging**: Comprehensive logging of all operations and errors

## Error Handling

### Common Error Scenarios
1. **Session Not Found**: Invalid or expired session identifier
2. **Navigation Timeout**: Page failed to load within timeout period
3. **Element Not Found**: Target element not found or not interactable
4. **Security Violation**: Blocked URL, malicious content, or security policy violation
5. **Resource Limit**: Maximum sessions reached or insufficient resources
6. **Python Process Error**: Browser-use process crashed or communication failure

### Error Response Format
```typescript
{
  success: false,
  error: string,                   // Human-readable error message
  code?: string,                   // Error code for programmatic handling
  details?: {                      // Additional error context
    sessionId?: string,
    operation?: string,
    timestamp: string,
    stackTrace?: string
  }
}
```

## Monitoring & Observability

### Metrics
- **Session Metrics**: Active sessions, session duration, session success rate
- **Performance Metrics**: Operation response times, resource usage
- **Error Metrics**: Error rates by operation type, common failure patterns
- **Resource Metrics**: Memory usage, CPU usage, disk space

### Logging
- **Operation Logs**: All API calls with parameters and results
- **Error Logs**: Detailed error information with stack traces
- **Performance Logs**: Timing information for performance analysis
- **Security Logs**: Security violations and blocked requests

### Health Checks
```typescript
// Module health status
const health = BrowserAutomationModule.getHealthStatus();
// Returns: { status: 'healthy' | 'warning' | 'error', details: {...} }
```

## Development & Testing

### Local Development Setup
```bash
# 1. Install Python dependencies
cd browser-use
pip install -e .

# 2. Install Node.js dependencies
cd bytebot/packages/bytebotd
npm install

# 3. Set environment variables
export PYTHON_EXECUTABLE_PATH=/usr/bin/python3
export BROWSER_USE_PATH=../../../browser-use

# 4. Start the service
npm run start:dev
```

### Testing
```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:e2e

# Run browser automation specific tests
npm run test -- --testPathPattern=browser-automation
```

### Example Usage
```typescript
// Create a browser session
const sessionResponse = await fetch('/browser-automation/sessions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + jwt_token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    headless: false,
    viewport: { width: 1920, height: 1080 }
  })
});

const session = await sessionResponse.json();
console.log('Session created:', session.sessionId);

// Navigate to a URL
const navResponse = await fetch(`/browser-automation/sessions/${session.sessionId}/navigate`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + jwt_token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com',
    waitForLoad: true
  })
});

const navJob = await navResponse.json();
console.log('Navigation job:', navJob.jobId);

// Check job status
const statusResponse = await fetch(`/jobs/${navJob.jobId}/status`, {
  headers: { 'Authorization': 'Bearer ' + jwt_token }
});

const status = await statusResponse.json();
console.log('Job status:', status);
```

## Integration Guide

### Adding to Existing Bytebot Application

1. **Import the Module**:
```typescript
import { BrowserAutomationModule } from './browser-use/browser-automation.module';

@Module({
  imports: [
    BrowserAutomationModule,
    // ... other modules
  ],
})
export class AppModule {}
```

2. **Configure Routes**:
The controller automatically registers routes under `/browser-automation/*`.

3. **Set Environment Variables**:
Configure the required environment variables for your deployment.

4. **Update Authentication**:
Ensure JWT authentication and role-based access control are properly configured.

## Troubleshooting

### Common Issues

1. **Python Process Fails to Start**
   - Check Python executable path
   - Verify browser-use library installation
   - Check system dependencies (Chrome/Chromium)

2. **Session Creation Timeout**
   - Increase session timeout in configuration
   - Check available system resources
   - Verify browser executable availability

3. **Navigation Failures**
   - Check URL accessibility
   - Verify network connectivity
   - Review security settings and blocked domains

4. **Communication Errors**
   - Check Python bridge script permissions
   - Verify JSON communication protocol
   - Review process cleanup and resource management

### Debug Mode
```bash
# Enable debug logging
export BROWSER_USE_DEBUG=true
export LOG_LEVEL=debug

# Check Python bridge logs
tail -f /tmp/bytebot-browser-*/browser_bridge_*.log
```

## Future Enhancements

### Planned Features
- **AI-Powered Automation**: Enhanced integration with LLM-based automation
- **Visual Testing**: Screenshot comparison and visual regression testing
- **Performance Profiling**: Detailed performance metrics and optimization
- **Multi-Browser Support**: Firefox, Safari, and Edge browser support
- **Session Recording**: Record and replay automation sessions
- **Parallel Execution**: Multiple actions in parallel across different tabs

### Extension Points
- **Custom Actions**: Plugin system for custom automation actions
- **Data Processors**: Custom data extraction and processing pipelines
- **Monitoring Integrations**: Integration with external monitoring systems
- **Authentication Providers**: Support for additional authentication methods

This documentation provides a comprehensive guide to the Browser Automation API implementation. For additional support or questions, please refer to the inline code documentation or contact the development team.