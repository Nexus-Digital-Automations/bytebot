# Browser-Use API Troubleshooting & FAQ

## Table of Contents

- [Common Issues](#common-issues)
- [Authentication Problems](#authentication-problems)
- [Task Execution Issues](#task-execution-issues)
- [Session Management Problems](#session-management-problems)
- [Performance Issues](#performance-issues)
- [Error Codes Reference](#error-codes-reference)
- [Browser Automation Troubleshooting](#browser-automation-troubleshooting)
- [Network and Connectivity](#network-and-connectivity)
- [FAQ](#frequently-asked-questions)
- [Advanced Debugging](#advanced-debugging)

## Common Issues

### Issue: API Returns 401 Unauthorized

**Symptoms:**
- All API requests return HTTP 401
- Error message: "Authentication required"

**Causes & Solutions:**

1. **Missing or Invalid JWT Token**
   ```bash
   # Check if token is set
   echo $BROWSER_USE_JWT_TOKEN
   
   # If empty, set your token
   export BROWSER_USE_JWT_TOKEN="your-actual-jwt-token"
   ```

2. **Expired Token**
   ```javascript
   // Check token expiration
   const jwt = require('jsonwebtoken');
   const decoded = jwt.decode(process.env.BROWSER_USE_JWT_TOKEN);
   console.log('Token expires:', new Date(decoded.exp * 1000));
   ```

3. **Incorrect Authorization Header**
   ```javascript
   // Correct format
   headers: {
     'Authorization': 'Bearer your-jwt-token'
   }
   
   // Common mistakes to avoid:
   // 'Authorization': 'your-jwt-token'           // Missing 'Bearer'
   // 'Authorization': 'bearer your-jwt-token'   // Lowercase 'bearer'
   ```

### Issue: Tasks Stuck in "Pending" Status

**Symptoms:**
- Tasks created but never start execution
- Status remains "pending" indefinitely

**Diagnostic Steps:**

1. **Check Service Health**
   ```bash
   curl -H "Authorization: Bearer $BROWSER_USE_JWT_TOKEN" \
        "$BROWSER_USE_API_URL/monitoring/health"
   ```

2. **Check Browser Process Availability**
   ```bash
   curl -H "Authorization: Bearer $BROWSER_USE_JWT_TOKEN" \
        "$BROWSER_USE_API_URL/health/detailed"
   ```

3. **Verify Task Configuration**
   ```javascript
   const task = await client.getTask(taskId);
   console.log('Task constraints:', task.constraints);
   console.log('Start URL:', task.startUrl);
   ```

**Common Solutions:**

- **Resource Exhaustion**: Wait for existing tasks to complete
- **Invalid Start URL**: Verify URL is accessible
- **Browser Service Down**: Contact support or restart services
- **Domain Restrictions**: Check allowedDomains constraints

### Issue: Screenshots Return Empty or Corrupted Images

**Symptoms:**
- Screenshot API returns success but image is empty
- Base64 data is corrupted or invalid

**Solutions:**

1. **Check Session Status**
   ```javascript
   const session = await client.getSession(sessionId);
   if (session.status !== 'active') {
     console.error('Session is not active:', session.status);
   }
   ```

2. **Ensure Page is Loaded**
   ```javascript
   // Wait for page load before screenshot
   await client.navigate(sessionId, url);
   
   // Get page state to verify load
   const state = await client.getBrowserState(sessionId);
   if (state.loadingStatus !== 'complete') {
     console.log('Page still loading, waiting...');
     await new Promise(resolve => setTimeout(resolve, 2000));
   }
   ```

3. **Check Screenshot Parameters**
   ```javascript
   // Correct screenshot request
   const screenshot = await client.captureScreenshot(sessionId, {
     fullPage: true,
     format: 'png',
     quality: 90
   });
   ```

### Issue: High Memory Usage

**Symptoms:**
- Browser sessions consuming excessive memory
- System becomes slow or unresponsive
- Out of memory errors

**Solutions:**

1. **Close Unused Sessions**
   ```javascript
   // List all sessions
   const sessions = await client.listSessions();
   
   // Close idle sessions
   for (const session of sessions.sessions) {
     if (session.status === 'idle') {
       await client.closeSession(session.id);
     }
   }
   ```

2. **Use Headless Mode**
   ```javascript
   const session = await client.createSession({
     name: 'Memory Efficient Session',
     profile: {
       browserType: 'chromium',
       headless: true, // Reduces memory usage
       windowWidth: 1280, // Smaller viewport
       windowHeight: 720
     }
   });
   ```

3. **Limit Concurrent Sessions**
   ```javascript
   class SessionManager {
     constructor(maxSessions = 5) {
       this.maxSessions = maxSessions;
       this.activeSessions = new Set();
     }

     async createSession(config) {
       if (this.activeSessions.size >= this.maxSessions) {
         throw new Error(`Maximum sessions (${this.maxSessions}) reached`);
       }

       const session = await client.createSession(config);
       this.activeSessions.add(session.id);
       return session;
     }

     async closeSession(sessionId) {
       await client.closeSession(sessionId);
       this.activeSessions.delete(sessionId);
     }
   }
   ```

## Authentication Problems

### JWT Token Issues

**Problem**: Token validation fails
**Debug Steps:**
```javascript
// Decode and inspect JWT token
const jwt = require('jsonwebtoken');

try {
  const decoded = jwt.decode(token, { complete: true });
  console.log('Header:', decoded.header);
  console.log('Payload:', decoded.payload);
  console.log('Expires:', new Date(decoded.payload.exp * 1000));
} catch (error) {
  console.error('Invalid JWT format:', error.message);
}
```

### Role Permission Issues

**Problem**: Getting 403 Forbidden errors
**Solution:**
```javascript
// Check user roles in JWT payload
const payload = jwt.decode(token);
console.log('User roles:', payload.roles);
console.log('User ID:', payload.sub);

// Verify required permissions for endpoint
const requiredRoles = {
  'POST /tasks': ['ADMIN', 'OPERATOR'],
  'DELETE /tasks': ['ADMIN'],
  'GET /tasks': ['ADMIN', 'OPERATOR', 'VIEWER']
};
```

## Task Execution Issues

### Task Fails Immediately

**Diagnostic Script:**
```javascript
const diagnoseTaskFailure = async (taskId) => {
  try {
    // Get task details
    const task = await client.getTask(taskId);
    console.log('Task Status:', task.status);
    console.log('Task Error:', task.error);
    
    // Check constraints
    if (task.constraints) {
      console.log('Max Execution Time:', task.constraints.maxExecutionTime);
      console.log('Allowed Domains:', task.constraints.allowedDomains);
    }
    
    // Verify start URL accessibility
    if (task.startUrl) {
      try {
        const response = await fetch(task.startUrl, { method: 'HEAD' });
        console.log('Start URL accessible:', response.ok);
        console.log('Response status:', response.status);
      } catch (error) {
        console.error('Start URL not accessible:', error.message);
      }
    }
    
    // Check service capacity
    const health = await client.getDetailedHealth();
    console.log('Active tasks:', health.taskMetrics.activeTasks);
    console.log('Queue length:', health.taskMetrics.queueLength);
    
  } catch (error) {
    console.error('Diagnosis failed:', error.message);
  }
};
```

### Task Timeout Issues

**Solutions:**
1. **Increase Timeout**
   ```javascript
   const task = await client.createTask({
     name: 'Long Running Task',
     description: 'Task that needs more time',
     constraints: {
       maxExecutionTime: 1800, // 30 minutes
       maxActions: 200
     }
   });
   ```

2. **Break Into Smaller Tasks**
   ```javascript
   const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];
   const batchSize = 2;
   
   for (let i = 0; i < urls.length; i += batchSize) {
     const batch = urls.slice(i, i + batchSize);
     const task = await client.createTask({
       name: `Batch ${i / batchSize + 1}`,
       // Process smaller batch
     });
   }
   ```

## Session Management Problems

### Sessions Not Starting

**Debugging Steps:**
```javascript
const debugSessionCreation = async (sessionConfig) => {
  try {
    console.log('Creating session with config:', sessionConfig);
    
    // Check browser availability
    const health = await client.getDetailedHealth();
    console.log('Browser processes available:', health.browserProcesses);
    
    // Try minimal session first
    const minimalSession = await client.createSession({
      name: 'Debug Session',
      profile: { browserType: 'chromium', headless: true }
    });
    
    console.log('Minimal session created:', minimalSession.id);
    
    // Test navigation
    await client.navigate(minimalSession.id, 'https://httpbin.org/html');
    console.log('Navigation successful');
    
    // Clean up
    await client.closeSession(minimalSession.id);
    
  } catch (error) {
    console.error('Session debug failed:', error.message);
    
    if (error.message.includes('browser')) {
      console.log('Browser service might be down. Check system resources.');
    }
  }
};
```

### Session Expires Unexpectedly

**Prevention:**
```javascript
class SessionKeepAlive {
  constructor(client, sessionId, interval = 300000) { // 5 minutes
    this.client = client;
    this.sessionId = sessionId;
    this.interval = interval;
    this.keepAliveTimer = null;
  }

  start() {
    this.keepAliveTimer = setInterval(async () => {
      try {
        // Perform lightweight operation to keep session alive
        await this.client.getBrowserState(this.sessionId);
        console.log(`Session ${this.sessionId} keep-alive successful`);
      } catch (error) {
        console.error(`Session ${this.sessionId} keep-alive failed:`, error.message);
        this.stop();
      }
    }, this.interval);
  }

  stop() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }
}

// Usage
const session = await client.createSession(config);
const keepAlive = new SessionKeepAlive(client, session.id);
keepAlive.start();

// Don't forget to stop when done
keepAlive.stop();
await client.closeSession(session.id);
```

## Performance Issues

### Slow API Responses

**Optimization Techniques:**

1. **Connection Pooling**
   ```javascript
   const https = require('https');
   const agent = new https.Agent({
     keepAlive: true,
     maxSockets: 50
   });

   // Use agent in requests
   const response = await fetch(url, { agent });
   ```

2. **Request Batching**
   ```javascript
   // Instead of individual status checks
   const statuses = await Promise.all([
     client.getTaskStatus('task1'),
     client.getTaskStatus('task2'),
     client.getTaskStatus('task3')
   ]);
   ```

3. **Caching**
   ```javascript
   const cache = new Map();
   
   const getCachedHealth = async () => {
     const cacheKey = 'health';
     const cached = cache.get(cacheKey);
     
     if (cached && Date.now() - cached.timestamp < 30000) {
       return cached.data;
     }
     
     const health = await client.healthCheck();
     cache.set(cacheKey, { data: health, timestamp: Date.now() });
     return health;
   };
   ```

### High Resource Usage

**Memory Optimization:**
```javascript
// Monitor memory usage
const monitorMemory = () => {
  const used = process.memoryUsage();
  console.log('Memory usage:');
  for (let key in used) {
    console.log(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }
};

// Clean up resources periodically
setInterval(() => {
  global.gc && global.gc(); // Force garbage collection if available
  monitorMemory();
}, 300000); // Every 5 minutes
```

## Error Codes Reference

### HTTP Status Codes

| Code | Meaning | Common Causes | Solutions |
|------|---------|---------------|-----------|
| 400 | Bad Request | Invalid JSON, missing required fields | Validate request format and required parameters |
| 401 | Unauthorized | Missing/invalid JWT token | Check authentication token and expiration |
| 403 | Forbidden | Insufficient role permissions | Verify user role has required permissions |
| 404 | Not Found | Invalid task/session ID | Verify resource exists and ID is correct |
| 409 | Conflict | Task already running, resource conflict | Check resource state before operation |
| 422 | Validation Error | Invalid parameter values | Review API documentation for valid parameter formats |
| 429 | Rate Limited | Too many requests | Implement backoff strategy and reduce request rate |
| 500 | Server Error | Internal service issue | Retry with backoff, contact support if persistent |
| 503 | Service Unavailable | Circuit breaker open, maintenance | Wait and retry, check service status page |

### Application Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `TASK_EXECUTION_ERROR` | Error during task execution | Check task logs and constraints |
| `BROWSER_STARTUP_FAILED` | Browser failed to start | Check system resources and browser installation |
| `SESSION_EXPIRED` | Browser session has expired | Create new session |
| `NAVIGATION_FAILED` | Failed to navigate to URL | Verify URL accessibility and network connectivity |
| `ELEMENT_NOT_FOUND` | DOM element not found | Verify CSS selector and wait for page load |
| `SCREENSHOT_FAILED` | Screenshot capture failed | Check session state and page load status |
| `DATA_EXTRACTION_ERROR` | Failed to extract data | Verify selectors and page structure |
| `FORM_SUBMISSION_ERROR` | Form submission failed | Check form fields and validation requirements |

## Browser Automation Troubleshooting

### Element Selection Issues

**Problem**: Elements not found with CSS selectors

**Debug Techniques:**
```javascript
const debugElementSelection = async (sessionId, selector) => {
  try {
    // Get page state to see available elements
    const state = await client.getBrowserState(sessionId);
    console.log('Page loaded:', state.loadingStatus === 'complete');
    console.log('Current URL:', state.currentUrl);
    
    // Try extracting with the selector
    const result = await client.extractData(sessionId, {
      target: selector
    });
    
    if (result.data.target) {
      console.log('Element found:', result.data.target);
    } else {
      console.log('Element not found. Available elements:');
      
      // Get all elements for debugging
      const allElements = await client.extractData(sessionId, {
        all: '*'
      });
      
      // Show first 10 elements
      console.log(allElements.data.all.slice(0, 10));
    }
    
  } catch (error) {
    console.error('Debug failed:', error.message);
  }
};
```

### Timing Issues

**Problem**: Actions fail due to timing

**Solutions:**
```javascript
const reliableClick = async (sessionId, selector) => {
  let retries = 3;
  
  while (retries > 0) {
    try {
      // Wait for element to be present
      const state = await client.getBrowserState(sessionId);
      
      if (state.loadingStatus !== 'complete') {
        console.log('Page still loading, waiting...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      // Try to click
      await client.request(`/sessions/${sessionId}/click`, {
        method: 'POST',
        body: JSON.stringify({
          selector,
          waitForElement: true,
          timeout: 10000
        })
      });
      
      console.log('Click successful');
      return;
      
    } catch (error) {
      retries--;
      console.log(`Click failed, ${retries} retries left:`, error.message);
      
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }
  }
};
```

### Page Load Issues

**Problem**: Pages not loading completely

**Solutions:**
```javascript
const waitForPageLoad = async (sessionId, timeout = 30000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const state = await client.getBrowserState(sessionId);
    
    if (state.loadingStatus === 'complete') {
      // Additional wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error('Page load timeout');
};

// Usage
await client.navigate(sessionId, url);
await waitForPageLoad(sessionId);
```

## Network and Connectivity

### Connection Issues

**Diagnostic Commands:**
```bash
# Test API connectivity
curl -I "$BROWSER_USE_API_URL/monitoring/health"

# Test with authentication
curl -H "Authorization: Bearer $BROWSER_USE_JWT_TOKEN" \
     "$BROWSER_USE_API_URL/monitoring/health"

# Check DNS resolution
nslookup api.bytebot.ai

# Test network latency
ping api.bytebot.ai
```

### Firewall and Proxy Issues

**Common Solutions:**
```javascript
// Configure proxy if needed
const session = await client.createSession({
  name: 'Proxy Session',
  profile: {
    browserType: 'chromium',
    headless: true,
    proxy: {
      server: 'http://proxy.company.com:8080',
      username: 'user',
      password: 'pass'
    }
  }
});
```

### SSL/TLS Issues

**Problem**: SSL certificate errors

**Solutions:**
```javascript
// For development/testing environments only
const session = await client.createSession({
  name: 'Dev Session',
  profile: {
    browserType: 'chromium',
    headless: true,
    additionalArgs: [
      '--ignore-ssl-errors',
      '--ignore-certificate-errors',
      '--disable-web-security' // Use cautiously
    ]
  }
});
```

## Frequently Asked Questions

### General Questions

**Q: What's the difference between tasks and sessions?**

A: Tasks are high-level automation workflows with specific goals, while sessions are individual browser instances. A task can use one or more sessions to accomplish its objectives. Sessions can also be used independently for direct browser automation.

**Q: Can I run multiple tasks simultaneously?**

A: Yes, the API supports concurrent task execution. The number of simultaneous tasks depends on your system resources and API limits. Use the health check endpoint to monitor system capacity.

**Q: How long can a browser session stay active?**

A: Sessions have a configurable timeout (default 10 minutes). You can extend this up to 1 hour when creating the session. Inactive sessions are automatically closed to preserve resources.

### Technical Questions

**Q: Why do my screenshots appear blank?**

A: Common causes include:
- Page not fully loaded when screenshot was taken
- Session in inactive state
- Browser rendering issues with the specific content
- Viewport size issues

Try waiting for page load completion and checking session status before taking screenshots.

**Q: How do I handle dynamic content that loads with JavaScript?**

A: Use explicit waits and check page state:

```javascript
// Wait for specific content to load
const waitForContent = async (sessionId, selector) => {
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds total
  
  while (attempts < maxAttempts) {
    const data = await client.extractData(sessionId, { content: selector });
    
    if (data.data.content) {
      return data.data.content;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  throw new Error('Content did not load within timeout');
};
```

**Q: How do I handle CAPTCHA or anti-bot measures?**

A: The Browser-Use API uses legitimate browser instances, which helps with most anti-bot measures. For CAPTCHAs:
- Design workflows to avoid CAPTCHA-protected pages when possible
- Use proper delays and human-like behavior patterns
- Consider using authenticated sessions where applicable

**Q: Can I use custom browser extensions?**

A: Currently, custom browser extensions are not supported. The API provides built-in functionality for most common automation needs.

### Performance Questions

**Q: How can I optimize performance for large-scale automation?**

A: Key optimization strategies:
- Use session pooling for repeated operations
- Implement connection pooling for API requests
- Use headless mode to reduce resource usage
- Batch similar operations together
- Cache frequently accessed data
- Monitor and limit concurrent sessions

**Q: What are the rate limits?**

A: Rate limits vary by user role:
- ADMIN: 1000 requests/minute
- OPERATOR: 500 requests/minute  
- VIEWER: 300 requests/minute

The API returns rate limit headers with each response.

### Security Questions

**Q: Is my data secure with the local-only architecture?**

A: Yes, the local-only architecture ensures that:
- All processing happens on your infrastructure
- No data is transmitted to external cloud services
- You maintain complete control over your data
- Compliance with data residency requirements is guaranteed

**Q: How should I store and manage JWT tokens?**

A: Best practices for token management:
- Store tokens in secure environment variables
- Implement token refresh logic for long-running applications
- Use separate tokens for different environments
- Monitor token expiration and renewal

### Troubleshooting Questions

**Q: My task is stuck in "pending" status. What should I do?**

A: Check these common causes:
1. System resource availability (CPU, memory)
2. Browser service status
3. Task queue length
4. Invalid start URL or constraints

Use the detailed health endpoint to diagnose system status.

**Q: How do I debug failed tasks?**

A: Follow this debugging process:
1. Check task error details: `GET /tasks/{taskId}`
2. Review execution steps and logs
3. Verify task constraints and configuration
4. Test the start URL accessibility
5. Check system resources and capacity

## Advanced Debugging

### Logging and Tracing

**Enable Debug Logging:**
```javascript
const client = new BrowserUseClient();

// Add request/response logging
const originalRequest = client.request;
client.request = async function(endpoint, options = {}) {
  const requestId = options.headers?.['X-Request-ID'] || `req_${Date.now()}`;
  
  console.log(`[${requestId}] --> ${options.method || 'GET'} ${endpoint}`);
  console.log(`[${requestId}] Request:`, options.body ? JSON.parse(options.body) : 'No body');
  
  try {
    const result = await originalRequest.call(this, endpoint, options);
    console.log(`[${requestId}] <-- Success`);
    console.log(`[${requestId}] Response:`, result);
    return result;
  } catch (error) {
    console.error(`[${requestId}] <-- Error:`, error.message);
    throw error;
  }
};
```

### Performance Profiling

**Measure API Call Performance:**
```javascript
class PerformanceProfiler {
  constructor() {
    this.metrics = new Map();
  }

  async profile(name, operation) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await operation();
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;

      this.recordMetric(name, {
        duration: endTime - startTime,
        memoryDelta: endMemory - startMemory,
        success: true,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      
      this.recordMetric(name, {
        duration: endTime - startTime,
        memoryDelta: 0,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  recordMetric(name, data) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push(data);
  }

  getReport() {
    const report = {};
    
    for (const [name, metrics] of this.metrics) {
      const successful = metrics.filter(m => m.success);
      const failed = metrics.filter(m => !m.success);
      
      report[name] = {
        total: metrics.length,
        successful: successful.length,
        failed: failed.length,
        avgDuration: successful.length > 0 ? 
          successful.reduce((sum, m) => sum + m.duration, 0) / successful.length : 0,
        maxDuration: successful.length > 0 ? 
          Math.max(...successful.map(m => m.duration)) : 0,
        minDuration: successful.length > 0 ? 
          Math.min(...successful.map(m => m.duration)) : 0
      };
    }
    
    return report;
  }
}

// Usage
const profiler = new PerformanceProfiler();

const task = await profiler.profile('createTask', async () => {
  return client.createTask(taskData);
});

const results = await profiler.profile('getResults', async () => {
  return client.getTaskResults(task.id);
});

console.log(profiler.getReport());
```

### Health Monitoring

**Comprehensive Health Check:**
```javascript
const comprehensiveHealthCheck = async () => {
  const checks = {
    apiConnectivity: false,
    authentication: false,
    serviceHealth: false,
    browserProcesses: false,
    systemResources: false
  };

  try {
    // Test basic connectivity
    await fetch(process.env.BROWSER_USE_API_URL, { method: 'HEAD' });
    checks.apiConnectivity = true;
  } catch (error) {
    console.error('API connectivity failed:', error.message);
  }

  try {
    // Test authentication
    const health = await client.healthCheck();
    checks.authentication = true;
    checks.serviceHealth = health.serviceHealth.status === 'healthy';
  } catch (error) {
    console.error('Authentication or health check failed:', error.message);
  }

  try {
    // Test detailed health
    const detailed = await client.getDetailedHealth();
    checks.browserProcesses = detailed.browserProcesses.total > 0;
    checks.systemResources = detailed.systemResources.memoryUsagePercent < 90;
  } catch (error) {
    console.error('Detailed health check failed:', error.message);
  }

  return checks;
};

// Run comprehensive health check
comprehensiveHealthCheck().then(checks => {
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  
  console.log(`Health Check Results: ${passed}/${total} passed`);
  
  for (const [check, status] of Object.entries(checks)) {
    console.log(`${status ? '✅' : '❌'} ${check}`);
  }
  
  if (passed === total) {
    console.log('🎉 All health checks passed!');
  } else {
    console.log('⚠️  Some health checks failed. Review the issues above.');
  }
});
```

---

## Getting Help

If you're still experiencing issues after following this troubleshooting guide:

1. **Check the Status Page**: [https://status.bytebot.ai](https://status.bytebot.ai)
2. **Review the API Documentation**: [API Documentation](./API_DOCUMENTATION_COMPREHENSIVE.md)
3. **Contact Support**: [browser-use-support@bytebot.ai](mailto:browser-use-support@bytebot.ai)
4. **Community Forum**: [https://community.bytebot.ai](https://community.bytebot.ai)

When contacting support, please include:
- Your API endpoint URL
- Request/response details (with sensitive data redacted)
- Error messages and codes
- Steps to reproduce the issue
- System environment details (OS, Node.js/Python version, etc.)

The more information you provide, the faster we can help resolve your issue!