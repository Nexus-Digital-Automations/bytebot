# Browser-Use API Troubleshooting Guide

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues & Solutions](#common-issues--solutions)
3. [Error Code Reference](#error-code-reference)
4. [Debugging Techniques](#debugging-techniques)
5. [Performance Issues](#performance-issues)
6. [Browser-Specific Problems](#browser-specific-problems)
7. [Network & Connectivity](#network--connectivity)
8. [Authentication & Authorization](#authentication--authorization)
9. [Python Environment Issues](#python-environment-issues)
10. [FAQ](#frequently-asked-questions)

## Quick Diagnostics

### Health Check Checklist

Before diving into specific issues, run these quick checks:

```bash
# 1. Check API health
curl http://localhost:3000/api/v1/browser-use/monitoring/health

# 2. Check detailed system health
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/v1/browser-use/health/detailed

# 3. Verify authentication
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 4. Test browser session creation
curl -X POST http://localhost:3000/api/v1/browser-use/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Health Check Session"}'
```

### System Requirements Verification

```bash
# Check Node.js version
node --version  # Should be 18.0+

# Check Python version
python3 --version  # Should be 3.9+

# Check browser-use installation
python3 -c "import browser_use; print('browser-use installed')"

# Check Chrome/Chromium
which chromium-browser || which google-chrome

# Check available memory
free -h

# Check disk space
df -h
```

## Common Issues & Solutions

### 1. "Session Creation Failed"

**Symptoms:**
- HTTP 500 error when creating browser sessions
- "Browser process failed to start" in logs
- Sessions stuck in "pending" status

**Common Causes & Solutions:**

#### A. Browser Binary Not Found
```bash
# Error: "Chrome binary not found"
# Solution: Install Chrome/Chromium
sudo apt-get update
sudo apt-get install chromium-browser

# Or specify custom Chrome path
export CHROME_BIN=/path/to/chrome
```

#### B. Insufficient Permissions
```bash
# Error: "Permission denied"
# Solution: Fix permissions for browser execution
sudo usermod -a -G video $USER
sudo usermod -a -G audio $USER

# For Docker environments
docker run --privileged your-image
# Or add capabilities
docker run --cap-add=SYS_ADMIN your-image
```

#### C. Missing Dependencies
```bash
# Install system dependencies
sudo apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libxss1 \
  libasound2
```

#### D. Memory/Resource Constraints
```javascript
// Reduce resource usage
const session = await client.sessions.create({
  name: 'Low Resource Session',
  configuration: {
    headless: true,
    disableImages: true,
    disablePlugins: true,
    viewport: { width: 1024, height: 768 }, // Smaller viewport
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--memory-pressure-off'
    ]
  }
});
```

### 2. "Task Execution Timeout"

**Symptoms:**
- Tasks never complete
- HTTP 504 timeout errors
- Tasks stuck in "running" status

**Solutions:**

#### A. Increase Timeouts
```javascript
// Increase task timeout
const task = await client.tasks.create({
  name: 'Long Running Task',
  timeout: 600000, // 10 minutes instead of default 5
  steps: [...]
});

// Increase step timeouts
{
  id: 'navigate',
  type: 'navigate',
  action: { url: 'https://slow-site.com' },
  timeout: 60000 // 1 minute for this step
}
```

#### B. Optimize Target Websites
```javascript
// Wait for specific elements instead of fixed delays
{
  id: 'wait_for_content',
  type: 'wait',
  action: {
    selector: '.content-loaded',
    timeout: 30000
  }
}

// Use efficient selectors
{
  id: 'extract_data',
  type: 'extract',
  action: {
    rules: [
      {
        name: 'products',
        selector: '[data-testid="product"]', // More reliable than CSS classes
        multiple: true
      }
    ]
  }
}
```

#### C. Handle Slow Networks
```javascript
// Add network condition handling
const session = await client.sessions.create({
  name: 'Network Optimized Session',
  configuration: {
    networkConditions: {
      downloadThroughput: 1000000, // 1Mbps
      uploadThroughput: 500000,    // 500kbps
      latency: 100                 // 100ms
    }
  }
});
```

### 3. "Element Not Found" Errors

**Symptoms:**
- "Element not found" in task logs
- Selectors not matching expected elements
- Extraction returning empty results

**Solutions:**

#### A. Improve Selector Strategy
```javascript
// Bad: Generic selectors
selector: '.button'

// Good: Specific selectors with fallbacks
selectors: [
  '[data-testid="submit-button"]',
  '#submit-btn',
  'button[type="submit"]',
  '.submit-button'
]
```

#### B. Wait for Dynamic Content
```javascript
// Wait for AJAX content to load
{
  id: 'wait_for_ajax',
  type: 'wait',
  action: {
    selector: '.ajax-content:not(.loading)',
    timeout: 15000
  }
}

// Wait for JavaScript frameworks to initialize
{
  id: 'wait_for_react',
  type: 'wait',
  action: {
    script: 'return window.React && window.ReactDOM',
    timeout: 10000
  }
}
```

#### C. Handle iframe Content
```javascript
// Switch to iframe before interaction
{
  id: 'switch_iframe',
  type: 'switchFrame',
  action: {
    selector: 'iframe[name="content"]'
  }
}

{
  id: 'click_in_iframe',
  type: 'click',
  action: {
    selector: '.iframe-button'
  }
}

{
  id: 'switch_back',
  type: 'switchFrame',
  action: {
    parent: true
  }
}
```

### 4. "Authentication Failed" Errors

**Symptoms:**
- HTTP 401 Unauthorized responses
- JWT token expired messages
- Permission denied errors

**Solutions:**

#### A. Token Management
```javascript
class TokenManager {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }

  async getValidToken() {
    if (!this.token || this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
    return this.token;
  }

  isTokenExpired() {
    return !this.expiresAt || new Date() >= this.expiresAt;
  }

  async refreshAccessToken() {
    const response = await fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    const data = await response.json();
    this.token = data.access_token;
    this.expiresAt = new Date(Date.now() + data.expires_in * 1000);
  }
}
```

#### B. Role-Based Access Issues
```javascript
// Check user permissions
const userInfo = await client.auth.getCurrentUser();
console.log('User role:', userInfo.role);
console.log('Permissions:', userInfo.permissions);

// Use appropriate role for operations
if (userInfo.role === 'viewer') {
  // Only read operations allowed
  const results = await client.tasks.getResults(taskId);
} else if (userInfo.role === 'operator') {
  // Can create and manage tasks
  const task = await client.tasks.create(taskDefinition);
}
```

### 5. "Python Process Failed" Errors

**Symptoms:**
- Python script execution errors
- browser-use framework import errors
- Process spawn failures

**Solutions:**

#### A. Environment Setup
```bash
# Create isolated Python environment
python3 -m venv browser-use-env
source browser-use-env/bin/activate

# Install dependencies
pip install browser-use anthropic playwright

# Install browser binaries
playwright install chromium

# Verify installation
python3 -c "
import browser_use
from anthropic import Anthropic
print('Dependencies installed successfully')
"
```

#### B. Path Configuration
```typescript
// Configure Python path in environment
export const config = {
  pythonPath: process.env.PYTHON_PATH || '/usr/bin/python3',
  browserUsePath: process.env.BROWSER_USE_PATH || './browser-use-env',
  pythonEnv: {
    PYTHONPATH: process.env.BROWSER_USE_PATH,
    PATH: `${process.env.BROWSER_USE_PATH}/bin:${process.env.PATH}`
  }
};
```

#### C. Dependency Conflicts
```bash
# Check for conflicting packages
pip list | grep playwright
pip list | grep browser

# Resolve conflicts
pip uninstall playwright browser-use -y
pip install browser-use==latest

# Verify browser installation
python3 -c "
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch()
    browser.close()
    print('Browser works!')
"
```

## Error Code Reference

### HTTP Status Codes

| Code | Meaning | Common Causes | Solutions |
|------|---------|---------------|-----------|
| 400 | Bad Request | Invalid JSON, missing required fields | Validate request body against API schema |
| 401 | Unauthorized | Missing/invalid JWT token | Re-authenticate, check token expiration |
| 403 | Forbidden | Insufficient permissions | Check user role and permissions |
| 404 | Not Found | Invalid task/session ID | Verify resource exists before operation |
| 409 | Conflict | Resource already exists/in use | Check resource state before creation |
| 422 | Unprocessable Entity | Business logic validation failed | Review domain restrictions, URL validation |
| 429 | Too Many Requests | Rate limit exceeded | Implement backoff strategy, reduce request rate |
| 500 | Internal Server Error | Server-side failure | Check logs, verify system health |
| 503 | Service Unavailable | Circuit breaker open, overload | Wait for service recovery, check health |

### Application Error Codes

#### Browser Errors
```javascript
const BROWSER_ERRORS = {
  'BROWSER_LAUNCH_FAILED': {
    description: 'Failed to start browser process',
    causes: ['Missing browser binary', 'Insufficient permissions', 'Resource constraints'],
    solutions: ['Install Chrome/Chromium', 'Check file permissions', 'Increase memory/CPU limits']
  },

  'BROWSER_CRASHED': {
    description: 'Browser process crashed during execution',
    causes: ['Memory exhaustion', 'Invalid page content', 'Browser bug'],
    solutions: ['Reduce concurrent sessions', 'Add error handling', 'Update browser version']
  },

  'PAGE_LOAD_TIMEOUT': {
    description: 'Page failed to load within timeout',
    causes: ['Slow network', 'Heavy JavaScript', 'Server issues'],
    solutions: ['Increase timeout', 'Optimize selectors', 'Check target site status']
  },

  'ELEMENT_NOT_FOUND': {
    description: 'Required element not found on page',
    causes: ['Incorrect selector', 'Dynamic content', 'Page structure changed'],
    solutions: ['Update selectors', 'Add wait conditions', 'Handle dynamic content']
  }
};
```

#### Authentication Errors
```javascript
const AUTH_ERRORS = {
  'INVALID_CREDENTIALS': {
    description: 'Username/password authentication failed',
    solutions: ['Verify credentials', 'Check account status', 'Reset password if needed']
  },

  'TOKEN_EXPIRED': {
    description: 'JWT token has expired',
    solutions: ['Refresh token', 'Re-authenticate', 'Implement automatic refresh']
  },

  'INSUFFICIENT_PERMISSIONS': {
    description: 'User lacks required permissions',
    solutions: ['Check user role', 'Request permission elevation', 'Use appropriate endpoints']
  }
};
```

## Debugging Techniques

### 1. Enable Debug Logging

```typescript
// Enable verbose logging
const config = {
  logLevel: 'debug',
  enableRequestLogging: true,
  enableResponseLogging: true
};

// Application logging
const logger = new Logger('BrowserUse');
logger.setLevel('debug');
```

### 2. Browser Developer Tools

```javascript
// Enable dev tools in non-headless mode
const session = await client.sessions.create({
  name: 'Debug Session',
  configuration: {
    headless: false,
    devtools: true, // Opens dev tools automatically
    slowMo: 1000    // Slow down actions for debugging
  }
});
```

### 3. Screenshot Debugging

```javascript
async function debugWithScreenshots(sessionId) {
  // Take screenshot before action
  await client.sessions.screenshot(sessionId, {
    filename: 'before-action.png'
  });

  // Perform action
  await client.sessions.click(sessionId, {
    selector: '.target-element'
  });

  // Take screenshot after action
  await client.sessions.screenshot(sessionId, {
    filename: 'after-action.png'
  });
}
```

### 4. Element Inspection

```javascript
// Get detailed element information
const elementInfo = await client.sessions.inspectElement(sessionId, {
  selector: '.problematic-element'
});

console.log('Element details:', {
  exists: elementInfo.exists,
  visible: elementInfo.visible,
  bounds: elementInfo.bounds,
  attributes: elementInfo.attributes,
  styles: elementInfo.computedStyles
});
```

### 5. Network Monitoring

```javascript
// Monitor network requests
const session = await client.sessions.create({
  name: 'Network Debug Session',
  configuration: {
    enableNetworkMonitoring: true,
    logNetworkRequests: true
  }
});

// Get network activity
const networkLog = await client.sessions.getNetworkLog(sessionId);
console.log('Network requests:', networkLog);
```

## Performance Issues

### 1. Slow Task Execution

**Diagnosis:**
```javascript
// Measure execution time
const startTime = Date.now();
const result = await client.tasks.execute(taskDefinition);
const duration = Date.now() - startTime;
console.log(`Task completed in ${duration}ms`);

// Check resource usage
const metrics = await client.monitoring.getPerformanceMetrics();
console.log('CPU usage:', metrics.cpuUsage);
console.log('Memory usage:', metrics.memoryUsage);
```

**Solutions:**

#### A. Optimize Browser Configuration
```javascript
const optimizedConfig = {
  headless: true,
  disableImages: true,
  disableCSS: false, // Keep for layout
  disablePlugins: true,
  disableJavaScript: false, // Only disable if not needed
  viewport: { width: 1280, height: 720 },
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding'
  ]
};
```

#### B. Connection Pooling
```javascript
class SessionPool {
  constructor(maxSessions = 5) {
    this.pool = [];
    this.maxSessions = maxSessions;
  }

  async getSession() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }

    if (this.activeCount < this.maxSessions) {
      return await this.createNewSession();
    }

    // Wait for available session
    return await this.waitForSession();
  }

  releaseSession(session) {
    if (this.pool.length < this.maxSessions) {
      this.pool.push(session);
    } else {
      session.close();
    }
  }
}
```

### 2. Memory Leaks

**Diagnosis:**
```javascript
// Monitor memory usage
setInterval(async () => {
  const usage = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB'
  });
}, 10000);
```

**Solutions:**

#### A. Proper Resource Cleanup
```javascript
async function performTaskWithCleanup(taskDefinition) {
  const session = await client.sessions.create(sessionConfig);

  try {
    return await client.tasks.execute(taskDefinition);
  } finally {
    // Always cleanup
    await client.sessions.close(session.sessionId);

    // Force garbage collection in development
    if (process.env.NODE_ENV === 'development' && global.gc) {
      global.gc();
    }
  }
}
```

#### B. Session Lifecycle Management
```javascript
class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Cleanup every minute
  }

  async createSession(config) {
    const session = await client.sessions.create(config);
    this.sessions.set(session.sessionId, {
      session,
      createdAt: Date.now(),
      lastUsed: Date.now()
    });
    return session;
  }

  async closeSession(sessionId) {
    const sessionInfo = this.sessions.get(sessionId);
    if (sessionInfo) {
      await client.sessions.close(sessionId);
      this.sessions.delete(sessionId);
    }
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, info] of this.sessions.entries()) {
      if (now - info.lastUsed > maxAge) {
        this.closeSession(sessionId);
      }
    }
  }
}
```

## Browser-Specific Problems

### 1. Chrome/Chromium Issues

#### A. Chrome Crashes
```bash
# Common Chrome crash solutions
export CHROME_FLAGS="
  --no-sandbox
  --disable-setuid-sandbox
  --disable-dev-shm-usage
  --disable-accelerated-2d-canvas
  --no-first-run
  --no-zygote
  --single-process
  --disable-gpu
"
```

#### B. Version Compatibility
```javascript
// Check Chrome version compatibility
const browserInfo = await client.sessions.getBrowserInfo(sessionId);
console.log('Browser version:', browserInfo.version);

// Use compatible features based on version
if (browserInfo.version >= '90.0') {
  // Use newer features
} else {
  // Use legacy approach
}
```

### 2. Headless vs Non-Headless Differences

```javascript
// Handle differences between modes
const isHeadless = config.headless;

const selectors = {
  // Some sites detect headless mode
  headlessSpecific: isHeadless ? '.headless-content' : '.normal-content',

  // Different behavior in headless
  viewport: isHeadless
    ? { width: 1920, height: 1080 }
    : { width: 1366, height: 768 }
};
```

## Network & Connectivity

### 1. Proxy Configuration

```javascript
// Configure proxy for browser sessions
const session = await client.sessions.create({
  name: 'Proxy Session',
  configuration: {
    proxy: {
      server: 'http://proxy.company.com:8080',
      username: 'proxy-user',
      password: 'proxy-pass'
    }
  }
});
```

### 2. SSL/TLS Issues

```javascript
// Handle SSL certificate errors
const session = await client.sessions.create({
  name: 'SSL Tolerant Session',
  configuration: {
    ignoreHTTPSErrors: true,
    args: [
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--ignore-certificate-errors-spki-list'
    ]
  }
});
```

### 3. Network Timeouts

```javascript
// Configure network timeouts
const session = await client.sessions.create({
  name: 'Network Optimized Session',
  configuration: {
    networkTimeout: 30000,
    navigationTimeout: 60000,
    args: [
      '--timeout=30000',
      '--load-timeout=60000'
    ]
  }
});
```

## Authentication & Authorization

### 1. JWT Token Issues

```javascript
// Robust token handling
class AuthManager {
  constructor(apiClient) {
    this.client = apiClient;
    this.tokenRefreshPromise = null;
  }

  async getValidToken() {
    const token = this.getCurrentToken();

    if (!token || this.isTokenExpired(token)) {
      return await this.refreshToken();
    }

    return token;
  }

  async refreshToken() {
    // Prevent multiple simultaneous refresh attempts
    if (this.tokenRefreshPromise) {
      return await this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this.performTokenRefresh();

    try {
      return await this.tokenRefreshPromise;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  async performTokenRefresh() {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.storeTokens(data.access_token, data.refresh_token);

    return data.access_token;
  }
}
```

### 2. Permission Errors

```javascript
// Handle permission-based errors
async function executeWithPermissionCheck(operation, requiredRole = 'operator') {
  try {
    return await operation();
  } catch (error) {
    if (error.status === 403) {
      const userInfo = await client.auth.getCurrentUser();

      if (!this.hasRequiredRole(userInfo.role, requiredRole)) {
        throw new Error(`Operation requires ${requiredRole} role, but user has ${userInfo.role}`);
      }
    }

    throw error;
  }
}

function hasRequiredRole(userRole, requiredRole) {
  const roleHierarchy = {
    'viewer': 1,
    'operator': 2,
    'admin': 3
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
```

## Python Environment Issues

### 1. Virtual Environment Problems

```bash
# Recreate virtual environment
rm -rf browser-use-env
python3 -m venv browser-use-env
source browser-use-env/bin/activate

# Install dependencies with specific versions
pip install browser-use==2.0.0
pip install anthropic==0.8.1
pip install playwright==1.40.0

# Verify installation
python3 -c "
import sys
print('Python path:', sys.executable)
import browser_use
print('browser-use version:', browser_use.__version__)
"
```

### 2. Package Conflicts

```bash
# Check for conflicts
pip check

# List all packages and versions
pip freeze > requirements.txt

# Clean install
pip uninstall -r requirements.txt -y
pip install -r requirements.txt
```

### 3. Import Errors

```python
# Debug Python imports
import sys
print("Python path:", sys.path)

try:
    import browser_use
    print("browser-use imported successfully")
except ImportError as e:
    print("browser-use import failed:", e)

try:
    from anthropic import Anthropic
    print("anthropic imported successfully")
except ImportError as e:
    print("anthropic import failed:", e)
```

## Frequently Asked Questions

### General Questions

**Q: How many concurrent browser sessions can I run?**

A: This depends on your system resources. Generally:
- **Development**: 2-5 sessions
- **Production (4GB RAM)**: 5-10 sessions
- **Production (8GB+ RAM)**: 10-20 sessions

Monitor resource usage and adjust the `maxConcurrentSessions` configuration.

**Q: Can I run this in a headless Linux server?**

A: Yes, but you need to install additional packages:
```bash
sudo apt-get update
sudo apt-get install -y \
  chromium-browser \
  xvfb \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libxss1 \
  libasound2
```

**Q: How do I handle websites that detect automation?**

A: Use these strategies:
- Randomize user agents and viewport sizes
- Add random delays between actions
- Use residential proxy servers
- Mimic human behavior patterns
- Rotate browser fingerprints

### Technical Questions

**Q: Why are my tasks timing out?**

A: Common causes:
1. **Heavy JavaScript sites**: Increase timeouts and wait for specific elements
2. **Slow network**: Configure network conditions or use faster connection
3. **Resource constraints**: Reduce concurrent sessions or increase server resources
4. **Complex selectors**: Simplify selectors and add fallbacks

**Q: How do I extract data from password-protected sites?**

A: Implement login automation:
```javascript
const steps = [
  {
    id: 'navigate_login',
    type: 'navigate',
    action: { url: 'https://site.com/login' }
  },
  {
    id: 'fill_credentials',
    type: 'form_fill',
    action: {
      formSelector: '#login-form',
      fields: [
        { selector: '#username', value: 'your-username' },
        { selector: '#password', value: 'your-password' }
      ]
    }
  },
  {
    id: 'submit_login',
    type: 'form_submit',
    action: { formSelector: '#login-form' }
  },
  {
    id: 'extract_data',
    type: 'extract',
    action: { /* extraction rules */ }
  }
];
```

**Q: How do I handle single-page applications (SPAs)?**

A: SPAs require special handling:
```javascript
// Wait for SPA to initialize
{
  id: 'wait_spa_ready',
  type: 'wait',
  action: {
    script: 'return window.app && window.app.initialized',
    timeout: 15000
  }
}

// Wait for route changes
{
  id: 'wait_route_change',
  type: 'wait',
  action: {
    url: /\/target-route/,
    timeout: 10000
  }
}
```

### Performance Questions

**Q: How can I speed up data extraction?**

A: Optimization techniques:
1. **Use headless mode**: 2-3x faster than non-headless
2. **Disable images**: Faster page loading
3. **Optimize selectors**: Use specific, efficient selectors
4. **Batch operations**: Combine multiple actions in single task
5. **Connection pooling**: Reuse browser sessions

**Q: My automation is using too much memory. How do I optimize?**

A: Memory optimization:
```javascript
const memoryOptimizedConfig = {
  headless: true,
  disableImages: true,
  disablePlugins: true,
  args: [
    '--memory-pressure-off',
    '--max_old_space_size=4096', // Limit Node.js memory
    '--disable-background-timer-throttling',
    '--disable-backgrounding-obliterated-windows',
    '--disable-renderer-backgrounding'
  ]
};
```

### Error Handling Questions

**Q: How do I handle intermittent failures?**

A: Implement robust retry logic:
```javascript
async function retryOperation(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

**Q: How do I debug failed automations?**

A: Use these debugging techniques:
1. **Enable debug logging**: Set log level to 'debug'
2. **Take screenshots**: Before and after each action
3. **Use non-headless mode**: See what's happening visually
4. **Check element existence**: Verify selectors match elements
5. **Monitor network requests**: Check for failed API calls

---

This troubleshooting guide covers the most common issues you'll encounter with the Browser-Use API. For issues not covered here, check the logs, take screenshots, and use the debugging techniques outlined above to identify the root cause.