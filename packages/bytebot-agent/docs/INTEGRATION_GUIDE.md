# Browser-Use API Integration Guide

## Overview

This guide provides comprehensive instructions for integrating with the Browser-Use API, including setup, authentication, common patterns, and best practices for enterprise browser automation.

## Table of Contents

- [Quick Start](#quick-start)
- [Authentication Setup](#authentication-setup)
- [SDK and Client Libraries](#sdk-and-client-libraries)
- [Common Integration Patterns](#common-integration-patterns)
- [Advanced Usage](#advanced-usage)
- [Error Handling and Retry Logic](#error-handling-and-retry-logic)
- [Performance Optimization](#performance-optimization)
- [Testing and Development](#testing-and-development)
- [Production Deployment](#production-deployment)
- [Monitoring and Observability](#monitoring-and-observability)

## Quick Start

### 1. Environment Setup

First, ensure you have access to the Browser-Use API and obtain your authentication credentials.

```bash
# Environment variables
export BROWSER_USE_API_URL="https://api.bytebot.ai/v1/browser-use"
export BROWSER_USE_JWT_TOKEN="your-jwt-token-here"
export BROWSER_USE_API_KEY="your-api-key-here"
```

### 2. Basic Task Creation

```javascript
// Basic task creation example
const createTask = async () => {
  const response = await fetch(`${process.env.BROWSER_USE_API_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.BROWSER_USE_JWT_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Request-ID': generateRequestId()
    },
    body: JSON.stringify({
      name: "My First Automation Task",
      description: "Extract data from example website",
      startUrl: "https://example.com",
      constraints: {
        maxExecutionTime: 300,
        enableScreenshots: true
      },
      autoStart: true
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const task = await response.json();
  console.log('Task created:', task.id);
  return task;
};
```

### 3. Session Management

```javascript
// Create and manage browser session
const createSession = async () => {
  const response = await fetch(`${process.env.BROWSER_USE_API_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.BROWSER_USE_JWT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: "Data Collection Session",
      profile: {
        browserType: "chromium",
        headless: true,
        windowWidth: 1920,
        windowHeight: 1080
      },
      enableScreenshots: true,
      timeoutSeconds: 600
    })
  });

  const session = await response.json();
  return session;
};
```

## Authentication Setup

### JWT Token Authentication

The primary authentication method uses JWT Bearer tokens:

```javascript
class BrowserUseClient {
  constructor(apiUrl, jwtToken) {
    this.apiUrl = apiUrl;
    this.jwtToken = jwtToken;
    this.requestId = 0;
  }

  async makeRequest(endpoint, options = {}) {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.jwtToken}`,
        'Content-Type': 'application/json',
        'X-Request-ID': this.generateRequestId(),
        ...options.headers
      }
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    return response.json();
  }

  generateRequestId() {
    return `req_${Date.now()}_${++this.requestId}`;
  }

  async handleError(response) {
    const error = await response.json().catch(() => ({}));
    throw new BrowserUseError(response.status, error.error || {});
  }
}
```

### API Key Authentication (Service-to-Service)

```javascript
// For service-to-service authentication
const headers = {
  'X-API-Key': process.env.BROWSER_USE_API_KEY,
  'Content-Type': 'application/json'
};
```

### Token Refresh and Management

```javascript
class TokenManager {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }

  async getValidToken() {
    if (this.token && this.expiresAt > Date.now() + 60000) {
      return this.token;
    }

    return await this.refreshAuthToken();
  }

  async refreshAuthToken() {
    const response = await fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    const auth = await response.json();
    this.token = auth.accessToken;
    this.refreshToken = auth.refreshToken;
    this.expiresAt = Date.now() + (auth.expiresIn * 1000);

    return this.token;
  }
}
```

## SDK and Client Libraries

### JavaScript/TypeScript SDK

```typescript
// TypeScript SDK example
interface BrowserUseConfig {
  apiUrl: string;
  authToken: string;
  timeout?: number;
  retries?: number;
}

interface TaskConfig {
  name: string;
  description: string;
  startUrl?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  constraints?: TaskConstraints;
  autoStart?: boolean;
  tags?: string[];
}

class BrowserUseSDK {
  private client: BrowserUseClient;

  constructor(config: BrowserUseConfig) {
    this.client = new BrowserUseClient(config.apiUrl, config.authToken);
  }

  async createTask(config: TaskConfig): Promise<Task> {
    return this.client.makeRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async getTask(taskId: string): Promise<Task> {
    return this.client.makeRequest(`/tasks/${taskId}`);
  }

  async listTasks(filters?: TaskFilters): Promise<TaskList> {
    const queryString = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return this.client.makeRequest(`/tasks${queryString}`);
  }

  async createSession(config: SessionConfig): Promise<Session> {
    return this.client.makeRequest('/sessions', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async captureScreenshot(sessionId: string, config?: ScreenshotConfig): Promise<Screenshot> {
    return this.client.makeRequest(`/sessions/${sessionId}/screenshot`, {
      method: 'POST',
      body: JSON.stringify(config || {})
    });
  }
}

// Usage
const browserUse = new BrowserUseSDK({
  apiUrl: 'https://api.bytebot.ai/v1/browser-use',
  authToken: process.env.BROWSER_USE_JWT_TOKEN
});

const task = await browserUse.createTask({
  name: 'Product Data Extraction',
  description: 'Extract product information from e-commerce site',
  startUrl: 'https://store.example.com',
  autoStart: true
});
```

### Python Client Library

```python
import requests
import time
from typing import Optional, Dict, List
from dataclasses import dataclass

@dataclass
class BrowserUseConfig:
    api_url: str
    auth_token: str
    timeout: int = 30
    retries: int = 3

class BrowserUseClient:
    def __init__(self, config: BrowserUseConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {config.auth_token}',
            'Content-Type': 'application/json'
        })

    def _make_request(self, method: str, endpoint: str, **kwargs):
        url = f"{self.config.api_url}{endpoint}"
        
        for attempt in range(self.config.retries):
            try:
                response = self.session.request(
                    method, url, timeout=self.config.timeout, **kwargs
                )
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException as e:
                if attempt == self.config.retries - 1:
                    raise
                time.sleep(2 ** attempt)  # Exponential backoff

    def create_task(self, name: str, description: str, **kwargs) -> Dict:
        task_data = {
            'name': name,
            'description': description,
            **kwargs
        }
        return self._make_request('POST', '/tasks', json=task_data)

    def get_task(self, task_id: str) -> Dict:
        return self._make_request('GET', f'/tasks/{task_id}')

    def list_tasks(self, status: Optional[str] = None, page: int = 1, limit: int = 10) -> Dict:
        params = {'page': page, 'limit': limit}
        if status:
            params['status'] = status
        return self._make_request('GET', '/tasks', params=params)

    def create_session(self, name: str, **kwargs) -> Dict:
        session_data = {'name': name, **kwargs}
        return self._make_request('POST', '/sessions', json=session_data)

    def capture_screenshot(self, session_id: str, **kwargs) -> Dict:
        return self._make_request('POST', f'/sessions/{session_id}/screenshot', json=kwargs)

# Usage
client = BrowserUseClient(BrowserUseConfig(
    api_url='https://api.bytebot.ai/v1/browser-use',
    auth_token=os.environ['BROWSER_USE_JWT_TOKEN']
))

task = client.create_task(
    name='Product Data Extraction',
    description='Extract product information from e-commerce site',
    start_url='https://store.example.com',
    auto_start=True
)
```

## Common Integration Patterns

### 1. Task Queue Pattern

```javascript
// Task queue management for bulk operations
class TaskQueue {
  constructor(browserUseClient, options = {}) {
    this.client = browserUseClient;
    this.maxConcurrent = options.maxConcurrent || 5;
    this.queue = [];
    this.running = new Map();
    this.results = new Map();
  }

  async addTask(taskConfig) {
    return new Promise((resolve, reject) => {
      this.queue.push({ taskConfig, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      const { taskConfig, resolve, reject } = this.queue.shift();
      
      try {
        const task = await this.client.createTask(taskConfig);
        this.running.set(task.id, { task, resolve, reject });
        this.monitorTask(task.id);
      } catch (error) {
        reject(error);
      }
    }
  }

  async monitorTask(taskId) {
    const pollInterval = 2000; // 2 seconds
    
    const poll = async () => {
      try {
        const status = await this.client.getTaskStatus(taskId);
        
        if (status.status === 'completed') {
          const result = await this.client.getTaskResults(taskId);
          const { resolve } = this.running.get(taskId);
          this.running.delete(taskId);
          this.results.set(taskId, result);
          resolve(result);
          this.processQueue(); // Process next task
        } else if (status.status === 'failed') {
          const { reject } = this.running.get(taskId);
          this.running.delete(taskId);
          reject(new Error(`Task failed: ${status.error?.message}`));
          this.processQueue();
        } else {
          setTimeout(poll, pollInterval);
        }
      } catch (error) {
        const { reject } = this.running.get(taskId);
        this.running.delete(taskId);
        reject(error);
        this.processQueue();
      }
    };

    setTimeout(poll, pollInterval);
  }
}

// Usage
const taskQueue = new TaskQueue(browserUseClient, { maxConcurrent: 3 });

const tasks = [
  { name: 'Task 1', description: 'Extract data from page 1', startUrl: 'https://example.com/page1' },
  { name: 'Task 2', description: 'Extract data from page 2', startUrl: 'https://example.com/page2' },
  { name: 'Task 3', description: 'Extract data from page 3', startUrl: 'https://example.com/page3' }
];

const results = await Promise.all(tasks.map(task => taskQueue.addTask(task)));
```

### 2. Session Pool Pattern

```javascript
// Session pool for reusing browser sessions
class SessionPool {
  constructor(browserUseClient, options = {}) {
    this.client = browserUseClient;
    this.minSessions = options.minSessions || 2;
    this.maxSessions = options.maxSessions || 10;
    this.sessionTimeout = options.sessionTimeout || 600; // 10 minutes
    this.availableSessions = [];
    this.busySessions = new Map();
    this.sessionConfig = options.sessionConfig || {};
  }

  async initialize() {
    // Create initial sessions
    for (let i = 0; i < this.minSessions; i++) {
      await this.createSession();
    }
  }

  async createSession() {
    const session = await this.client.createSession({
      name: `Pool Session ${Date.now()}`,
      ...this.sessionConfig,
      timeoutSeconds: this.sessionTimeout
    });
    this.availableSessions.push(session);
    return session;
  }

  async acquireSession() {
    if (this.availableSessions.length === 0) {
      if (this.getTotalSessions() < this.maxSessions) {
        await this.createSession();
      } else {
        // Wait for session to become available
        await this.waitForAvailableSession();
      }
    }

    const session = this.availableSessions.pop();
    this.busySessions.set(session.id, session);
    return session;
  }

  async releaseSession(sessionId, closeSession = false) {
    const session = this.busySessions.get(sessionId);
    if (!session) return;

    this.busySessions.delete(sessionId);

    if (closeSession) {
      await this.client.closeSession(sessionId);
    } else {
      this.availableSessions.push(session);
    }
  }

  getTotalSessions() {
    return this.availableSessions.length + this.busySessions.size;
  }

  async waitForAvailableSession() {
    return new Promise((resolve) => {
      const check = () => {
        if (this.availableSessions.length > 0) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  async cleanup() {
    // Close all sessions
    const allSessions = [
      ...this.availableSessions,
      ...this.busySessions.values()
    ];

    await Promise.all(
      allSessions.map(session => 
        this.client.closeSession(session.id).catch(console.error)
      )
    );
  }
}

// Usage
const sessionPool = new SessionPool(browserUseClient, {
  minSessions: 3,
  maxSessions: 10,
  sessionConfig: {
    profile: { browserType: 'chromium', headless: true },
    enableScreenshots: true
  }
});

await sessionPool.initialize();

// Use session for automation
const session = await sessionPool.acquireSession();
try {
  await browserUseClient.navigate(session.id, 'https://example.com');
  const data = await browserUseClient.extractData(session.id, {
    selectors: { title: 'h1', content: '.main-content' }
  });
  console.log('Extracted data:', data);
} finally {
  await sessionPool.releaseSession(session.id);
}
```

### 3. Data Pipeline Pattern

```javascript
// Data extraction and processing pipeline
class DataPipeline {
  constructor(browserUseClient, options = {}) {
    this.client = browserUseClient;
    this.processors = [];
    this.validators = [];
    this.outputHandlers = [];
  }

  addProcessor(processor) {
    this.processors.push(processor);
    return this;
  }

  addValidator(validator) {
    this.validators.push(validator);
    return this;
  }

  addOutputHandler(handler) {
    this.outputHandlers.push(handler);
    return this;
  }

  async process(urls, extractionConfig) {
    const results = [];

    for (const url of urls) {
      try {
        const result = await this.processUrl(url, extractionConfig);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process ${url}:`, error);
        results.push({ url, error: error.message, data: null });
      }
    }

    return results;
  }

  async processUrl(url, extractionConfig) {
    // Create session
    const session = await this.client.createSession({
      name: `Pipeline Session - ${url}`,
      profile: { browserType: 'chromium', headless: true }
    });

    try {
      // Navigate to URL
      await this.client.navigate(session.id, url);

      // Extract raw data
      const rawData = await this.client.extractData(session.id, extractionConfig);

      // Process data through pipeline
      let processedData = rawData.data;
      for (const processor of this.processors) {
        processedData = await processor(processedData, url);
      }

      // Validate data
      for (const validator of this.validators) {
        const isValid = await validator(processedData, url);
        if (!isValid) {
          throw new Error(`Validation failed for ${url}`);
        }
      }

      // Handle output
      for (const handler of this.outputHandlers) {
        await handler(processedData, url);
      }

      return { url, data: processedData, success: true };

    } finally {
      await this.client.closeSession(session.id);
    }
  }
}

// Usage
const pipeline = new DataPipeline(browserUseClient)
  .addProcessor(async (data, url) => {
    // Clean and normalize data
    return {
      ...data,
      title: data.title?.trim(),
      price: parseFloat(data.price?.replace(/[^\d.]/g, '')),
      extractedAt: new Date().toISOString(),
      sourceUrl: url
    };
  })
  .addValidator(async (data, url) => {
    // Validate required fields
    return data.title && data.price && !isNaN(data.price);
  })
  .addOutputHandler(async (data, url) => {
    // Save to database
    await saveToDatabase(data);
  })
  .addOutputHandler(async (data, url) => {
    // Send to webhook
    await sendWebhook(data);
  });

const urls = [
  'https://store.example.com/product/1',
  'https://store.example.com/product/2',
  'https://store.example.com/product/3'
];

const results = await pipeline.process(urls, {
  selectors: {
    title: '.product-title',
    price: '.price-display',
    description: '.product-description'
  }
});
```

## Advanced Usage

### WebSocket Integration for Real-time Updates

```javascript
// WebSocket client for real-time task monitoring
class BrowserUseWebSocket {
  constructor(wsUrl, authToken) {
    this.wsUrl = wsUrl;
    this.authToken = authToken;
    this.ws = null;
    this.subscriptions = new Map();
    this.reconnectDelay = 1000;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectDelay = 1000;
        resolve();
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }

  reconnect() {
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect().catch(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
        this.reconnect();
      });
    }, this.reconnectDelay);
  }

  subscribe(channels, taskIds = [], sessionIds = []) {
    const subscription = {
      type: 'subscribe',
      channels,
      taskIds,
      sessionIds
    };
    this.ws.send(JSON.stringify(subscription));
  }

  onTaskUpdate(callback) {
    this.subscriptions.set('task_update', callback);
  }

  onSessionUpdate(callback) {
    this.subscriptions.set('session_update', callback);
  }

  onScreenshotCaptured(callback) {
    this.subscriptions.set('screenshot_captured', callback);
  }

  handleMessage(message) {
    const callback = this.subscriptions.get(message.type);
    if (callback) {
      callback(message.data);
    }
  }
}

// Usage
const ws = new BrowserUseWebSocket('wss://api.bytebot.ai/v1/browser-use/ws', authToken);
await ws.connect();

ws.onTaskUpdate((task) => {
  console.log(`Task ${task.id} status: ${task.status}, progress: ${task.progress}%`);
});

ws.subscribe(['tasks', 'sessions'], ['task_abc123'], ['session_xyz789']);
```

### Batch Operations with Progress Tracking

```javascript
// Batch processor with progress tracking
class BatchProcessor {
  constructor(browserUseClient, options = {}) {
    this.client = browserUseClient;
    this.batchSize = options.batchSize || 10;
    this.concurrency = options.concurrency || 3;
    this.onProgress = options.onProgress || (() => {});
    this.onError = options.onError || console.error;
  }

  async processBatch(items, processFunction) {
    const total = items.length;
    let completed = 0;
    let errors = 0;
    const results = [];

    // Process in batches
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      
      // Process batch with concurrency control
      const batchPromises = batch.map(async (item, index) => {
        try {
          const result = await this.processWithConcurrency(
            () => processFunction(item, i + index),
            i + index
          );
          completed++;
          this.onProgress({ completed, total, errors, item, result });
          return { item, result, success: true };
        } catch (error) {
          errors++;
          this.onError(error, item);
          this.onProgress({ completed, total, errors, item, error });
          return { item, error: error.message, success: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return {
      total,
      completed,
      errors,
      results,
      successRate: ((completed - errors) / completed * 100).toFixed(2)
    };
  }

  async processWithConcurrency(processFunction, index) {
    // Simple semaphore implementation for concurrency control
    await this.acquireSemaphore();
    try {
      return await processFunction();
    } finally {
      this.releaseSemaphore();
    }
  }

  async acquireSemaphore() {
    // Implementation would depend on specific concurrency requirements
    // This is a simplified version
  }

  releaseSemaphore() {
    // Release semaphore slot
  }
}

// Usage
const batchProcessor = new BatchProcessor(browserUseClient, {
  batchSize: 5,
  concurrency: 2,
  onProgress: ({ completed, total, errors }) => {
    console.log(`Progress: ${completed}/${total}, Errors: ${errors}`);
  }
});

const urls = Array.from({ length: 100 }, (_, i) => `https://example.com/page/${i + 1}`);

const results = await batchProcessor.processBatch(urls, async (url) => {
  const session = await browserUseClient.createSession({
    name: `Batch Session - ${url}`,
    profile: { browserType: 'chromium', headless: true }
  });

  try {
    await browserUseClient.navigate(session.id, url);
    return await browserUseClient.extractData(session.id, {
      selectors: { title: 'h1', content: '.main' }
    });
  } finally {
    await browserUseClient.closeSession(session.id);
  }
});

console.log(`Batch processing complete. Success rate: ${results.successRate}%`);
```

## Error Handling and Retry Logic

### Comprehensive Error Handler

```javascript
class BrowserUseError extends Error {
  constructor(status, errorData) {
    super(errorData.message || 'Browser-Use API Error');
    this.name = 'BrowserUseError';
    this.status = status;
    this.code = errorData.code;
    this.details = errorData.details;
    this.timestamp = errorData.timestamp;
    this.requestId = errorData.requestId;
    this.retryAfter = errorData.retryAfter;
  }

  isRetryable() {
    return this.status >= 500 || this.status === 429 || this.status === 408;
  }

  getRetryDelay() {
    if (this.retryAfter) {
      return this.retryAfter * 1000; // Convert to milliseconds
    }
    
    // Default exponential backoff
    return Math.min(1000 * Math.pow(2, this.attempt || 0), 30000);
  }
}

class RetryableClient {
  constructor(browserUseClient, options = {}) {
    this.client = browserUseClient;
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
  }

  async makeRequest(method, endpoint, options = {}, attempt = 0) {
    try {
      return await this.client.makeRequest(endpoint, {
        method,
        ...options
      });
    } catch (error) {
      if (!(error instanceof BrowserUseError)) {
        throw error;
      }

      if (attempt >= this.maxRetries || !error.isRetryable()) {
        throw error;
      }

      const delay = this.calculateDelay(error, attempt);
      console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
      
      await this.sleep(delay);
      return this.makeRequest(method, endpoint, options, attempt + 1);
    }
  }

  calculateDelay(error, attempt) {
    if (error.retryAfter) {
      return error.retryAfter * 1000;
    }

    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, this.maxDelay);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Circuit breaker pattern
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 10000;
    
    this.state = 'closed'; // closed, open, half-open
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextRetryTime = null;
  }

  async execute(operation) {
    if (this.state === 'open') {
      if (Date.now() < this.nextRetryTime) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'half-open';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
    this.nextRetryTime = null;
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      this.nextRetryTime = Date.now() + this.recoveryTimeout;
    }
  }
}

// Usage
const retryableClient = new RetryableClient(browserUseClient, {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000
});

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 60000
});

const robustRequest = async (endpoint, options) => {
  return circuitBreaker.execute(async () => {
    return retryableClient.makeRequest('POST', endpoint, options);
  });
};
```

## Performance Optimization

### Connection Pooling and Keep-Alive

```javascript
// HTTP client with connection pooling
class OptimizedBrowserUseClient {
  constructor(config) {
    this.config = config;
    this.agent = new (require('https').Agent)({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 30000
    });
  }

  async makeRequest(endpoint, options = {}) {
    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      agent: this.agent,
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`,
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=30',
        ...options.headers
      }
    });

    return response.json();
  }
}
```

### Request Batching

```javascript
// Batch multiple requests into single API calls
class RequestBatcher {
  constructor(client, options = {}) {
    this.client = client;
    this.batchSize = options.batchSize || 10;
    this.batchTimeout = options.batchTimeout || 100;
    this.pendingRequests = [];
    this.batchTimer = null;
  }

  async batchRequest(type, data) {
    return new Promise((resolve, reject) => {
      this.pendingRequests.push({ type, data, resolve, reject });

      if (this.pendingRequests.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.processBatch(), this.batchTimeout);
      }
    });
  }

  async processBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const batch = this.pendingRequests.splice(0, this.batchSize);
    if (batch.length === 0) return;

    try {
      // Group requests by type
      const groupedRequests = batch.reduce((acc, req) => {
        if (!acc[req.type]) acc[req.type] = [];
        acc[req.type].push(req);
        return acc;
      }, {});

      // Process each group
      for (const [type, requests] of Object.entries(groupedRequests)) {
        await this.processRequestGroup(type, requests);
      }
    } catch (error) {
      batch.forEach(req => req.reject(error));
    }
  }

  async processRequestGroup(type, requests) {
    switch (type) {
      case 'task_status':
        await this.batchTaskStatus(requests);
        break;
      case 'screenshot':
        await this.batchScreenshots(requests);
        break;
      default:
        // Process individually for unsupported batch operations
        for (const req of requests) {
          try {
            const result = await this.processSingleRequest(req);
            req.resolve(result);
          } catch (error) {
            req.reject(error);
          }
        }
    }
  }

  async batchTaskStatus(requests) {
    const taskIds = requests.map(req => req.data.taskId);
    
    // Make batched API call (assuming API supports batch status check)
    const results = await Promise.all(
      taskIds.map(id => this.client.makeRequest(`/monitoring/tasks/${id}/status`))
    );

    requests.forEach((req, index) => {
      req.resolve(results[index]);
    });
  }
}
```

### Caching Layer

```javascript
// Intelligent caching for API responses
class CachedBrowserUseClient {
  constructor(client, options = {}) {
    this.client = client;
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.cachableEndpoints = new Set([
      '/monitoring/health',
      '/health/detailed',
      '/metrics/performance'
    ]);
  }

  async makeRequest(endpoint, options = {}) {
    const cacheKey = this.getCacheKey(endpoint, options);
    
    // Check cache for GET requests to cachable endpoints
    if (options.method === 'GET' && this.isCachable(endpoint)) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
      }
    }

    // Make request
    const result = await this.client.makeRequest(endpoint, options);

    // Cache result if cachable
    if (options.method === 'GET' && this.isCachable(endpoint)) {
      this.cache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + this.getTTL(endpoint)
      });
    }

    return result;
  }

  getCacheKey(endpoint, options) {
    return `${endpoint}:${JSON.stringify(options.params || {})}`;
  }

  isCachable(endpoint) {
    return this.cachableEndpoints.has(endpoint);
  }

  getTTL(endpoint) {
    const ttlMap = {
      '/monitoring/health': 30000, // 30 seconds
      '/health/detailed': 60000,   // 1 minute
      '/metrics/performance': 120000 // 2 minutes
    };
    
    return ttlMap[endpoint] || this.defaultTTL;
  }

  clearCache(pattern) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
```

## Testing and Development

### Mock Client for Testing

```javascript
// Mock client for unit testing
class MockBrowserUseClient {
  constructor(options = {}) {
    this.responses = options.responses || {};
    this.delays = options.delays || {};
    this.errors = options.errors || {};
    this.callLog = [];
  }

  async makeRequest(endpoint, options = {}) {
    this.callLog.push({ endpoint, options, timestamp: Date.now() });

    // Simulate delay
    const delay = this.delays[endpoint] || 0;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Simulate error
    const error = this.errors[endpoint];
    if (error) {
      throw new BrowserUseError(error.status, error.data);
    }

    // Return mock response
    const response = this.responses[endpoint];
    if (typeof response === 'function') {
      return response(options);
    }

    return response || { success: true };
  }

  // Test utilities
  getCallLog() {
    return [...this.callLog];
  }

  getCallCount(endpoint) {
    return this.callLog.filter(call => call.endpoint === endpoint).length;
  }

  reset() {
    this.callLog = [];
  }

  setResponse(endpoint, response) {
    this.responses[endpoint] = response;
  }

  setError(endpoint, status, errorData) {
    this.errors[endpoint] = { status, data: errorData };
  }
}

// Test example
describe('Browser-Use Integration', () => {
  let mockClient;
  let browserUse;

  beforeEach(() => {
    mockClient = new MockBrowserUseClient();
    browserUse = new BrowserUseSDK({
      apiUrl: 'http://localhost:3000',
      authToken: 'test-token'
    });
    browserUse.client = mockClient; // Inject mock
  });

  test('should create task successfully', async () => {
    mockClient.setResponse('/tasks', {
      id: 'task_123',
      name: 'Test Task',
      status: 'pending'
    });

    const result = await browserUse.createTask({
      name: 'Test Task',
      description: 'Test description'
    });

    expect(result.id).toBe('task_123');
    expect(mockClient.getCallCount('/tasks')).toBe(1);
  });

  test('should handle API errors', async () => {
    mockClient.setError('/tasks', 400, {
      code: 'VALIDATION_ERROR',
      message: 'Invalid parameters'
    });

    await expect(browserUse.createTask({})).rejects.toThrow('Invalid parameters');
  });
});
```

### Integration Testing

```javascript
// Integration test helpers
class IntegrationTestHelper {
  constructor(config) {
    this.client = new BrowserUseSDK(config);
    this.createdResources = {
      tasks: [],
      sessions: []
    };
  }

  async createTestTask(overrides = {}) {
    const task = await this.client.createTask({
      name: 'Integration Test Task',
      description: 'Created by integration test',
      startUrl: 'https://httpbin.org/html',
      ...overrides
    });

    this.createdResources.tasks.push(task.id);
    return task;
  }

  async createTestSession(overrides = {}) {
    const session = await this.client.createSession({
      name: 'Integration Test Session',
      profile: { browserType: 'chromium', headless: true },
      ...overrides
    });

    this.createdResources.sessions.push(session.id);
    return session;
  }

  async waitForTaskCompletion(taskId, timeout = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.client.getTaskStatus(taskId);
      
      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Task ${taskId} did not complete within ${timeout}ms`);
  }

  async cleanup() {
    // Clean up created resources
    const cleanupPromises = [
      ...this.createdResources.tasks.map(id => 
        this.client.deleteTask(id).catch(console.error)
      ),
      ...this.createdResources.sessions.map(id => 
        this.client.closeSession(id).catch(console.error)
      )
    ];

    await Promise.all(cleanupPromises);
    
    this.createdResources = { tasks: [], sessions: [] };
  }
}

// Integration test example
describe('Browser-Use API Integration', () => {
  let testHelper;

  beforeAll(() => {
    testHelper = new IntegrationTestHelper({
      apiUrl: process.env.BROWSER_USE_API_URL,
      authToken: process.env.BROWSER_USE_JWT_TOKEN
    });
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  test('should complete end-to-end automation task', async () => {
    const task = await testHelper.createTestTask({
      autoStart: true,
      constraints: { maxExecutionTime: 60 }
    });

    const result = await testHelper.waitForTaskCompletion(task.id);
    expect(result.status).toBe('completed');

    const taskResults = await testHelper.client.getTaskResults(task.id);
    expect(taskResults.executionSteps.length).toBeGreaterThan(0);
  }, 90000);
});
```

## Production Deployment

### Environment Configuration

```javascript
// Production configuration
const createProductionConfig = () => {
  const requiredEnvVars = [
    'BROWSER_USE_API_URL',
    'BROWSER_USE_JWT_TOKEN',
    'BROWSER_USE_API_KEY'
  ];

  // Validate required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    apiUrl: process.env.BROWSER_USE_API_URL,
    authToken: process.env.BROWSER_USE_JWT_TOKEN,
    apiKey: process.env.BROWSER_USE_API_KEY,
    
    // Performance settings
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 10,
    
    // Circuit breaker settings
    circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD) || 5,
    circuitBreakerTimeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 60000,
    
    // Caching settings
    cacheEnabled: process.env.CACHE_ENABLED === 'true',
    cacheTTL: parseInt(process.env.CACHE_TTL) || 300000,
    
    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
    enableMetrics: process.env.ENABLE_METRICS === 'true'
  };
};
```

### Health Checks and Monitoring

```javascript
// Health check implementation
class HealthChecker {
  constructor(browserUseClient) {
    this.client = browserUseClient;
    this.lastHealthCheck = null;
    this.isHealthy = false;
  }

  async checkHealth() {
    try {
      const response = await this.client.makeRequest('/monitoring/health');
      this.isHealthy = response.serviceHealth.status === 'healthy';
      this.lastHealthCheck = Date.now();
      
      return {
        status: this.isHealthy ? 'healthy' : 'unhealthy',
        lastCheck: this.lastHealthCheck,
        details: response
      };
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = Date.now();
      
      return {
        status: 'unhealthy',
        lastCheck: this.lastHealthCheck,
        error: error.message
      };
    }
  }

  async startHealthChecks(interval = 30000) {
    setInterval(async () => {
      const health = await this.checkHealth();
      
      if (!health.status === 'healthy') {
        console.error('Browser-Use API health check failed:', health);
        // Trigger alerts, notifications, etc.
      }
    }, interval);
  }
}

// Metrics collection
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: { total: 0, success: 0, errors: 0 },
      latency: { sum: 0, count: 0, min: Infinity, max: 0 },
      tasks: { created: 0, completed: 0, failed: 0 },
      sessions: { created: 0, closed: 0, active: 0 }
    };
  }

  recordRequest(duration, success = true) {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }

    this.metrics.latency.sum += duration;
    this.metrics.latency.count++;
    this.metrics.latency.min = Math.min(this.metrics.latency.min, duration);
    this.metrics.latency.max = Math.max(this.metrics.latency.max, duration);
  }

  recordTask(event) {
    this.metrics.tasks[event]++;
  }

  recordSession(event) {
    this.metrics.sessions[event]++;
  }

  getMetrics() {
    const avgLatency = this.metrics.latency.count > 0 
      ? this.metrics.latency.sum / this.metrics.latency.count 
      : 0;

    return {
      ...this.metrics,
      latency: {
        ...this.metrics.latency,
        average: avgLatency
      },
      timestamp: Date.now()
    };
  }

  reset() {
    this.metrics = {
      requests: { total: 0, success: 0, errors: 0 },
      latency: { sum: 0, count: 0, min: Infinity, max: 0 },
      tasks: { created: 0, completed: 0, failed: 0 },
      sessions: { created: 0, closed: 0, active: 0 }
    };
  }
}
```

### Graceful Shutdown

```javascript
// Graceful shutdown handler
class GracefulShutdown {
  constructor(browserUseClient, options = {}) {
    this.client = browserUseClient;
    this.isShuttingDown = false;
    this.activeOperations = new Set();
    this.shutdownTimeout = options.shutdownTimeout || 30000;
  }

  async addOperation(operationPromise) {
    if (this.isShuttingDown) {
      throw new Error('System is shutting down, no new operations allowed');
    }

    this.activeOperations.add(operationPromise);
    
    try {
      const result = await operationPromise;
      return result;
    } finally {
      this.activeOperations.delete(operationPromise);
    }
  }

  async shutdown() {
    console.log('Initiating graceful shutdown...');
    this.isShuttingDown = true;

    // Wait for active operations to complete
    if (this.activeOperations.size > 0) {
      console.log(`Waiting for ${this.activeOperations.size} active operations to complete...`);
      
      const shutdownPromise = Promise.all(Array.from(this.activeOperations));
      const timeoutPromise = new Promise(resolve => 
        setTimeout(resolve, this.shutdownTimeout)
      );

      await Promise.race([shutdownPromise, timeoutPromise]);
    }

    // Close any active sessions
    try {
      await this.client.closeAllSessions();
    } catch (error) {
      console.error('Error closing sessions during shutdown:', error);
    }

    console.log('Graceful shutdown completed');
  }

  setupSignalHandlers() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`Received ${signal}, starting graceful shutdown...`);
        await this.shutdown();
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await this.shutdown();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      await this.shutdown();
      process.exit(1);
    });
  }
}

// Production setup
const setupProduction = () => {
  const config = createProductionConfig();
  const client = new OptimizedBrowserUseClient(config);
  const retryableClient = new RetryableClient(client, config);
  const cachedClient = new CachedBrowserUseClient(retryableClient, config);
  
  const browserUse = new BrowserUseSDK({ client: cachedClient });
  
  const healthChecker = new HealthChecker(browserUse);
  const metricsCollector = new MetricsCollector();
  const gracefulShutdown = new GracefulShutdown(browserUse);

  // Start health checks
  healthChecker.startHealthChecks();
  
  // Setup graceful shutdown
  gracefulShutdown.setupSignalHandlers();

  return {
    browserUse,
    healthChecker,
    metricsCollector,
    gracefulShutdown
  };
};

module.exports = {
  setupProduction,
  BrowserUseSDK,
  BrowserUseError
};
```

## Conclusion

This integration guide provides comprehensive patterns and best practices for integrating with the Browser-Use API. The examples cover everything from basic usage to production-ready implementations with proper error handling, monitoring, and performance optimization.

Key recommendations for production use:

1. **Authentication**: Implement proper token management and refresh logic
2. **Error Handling**: Use retry logic with exponential backoff and circuit breakers
3. **Performance**: Implement connection pooling, request batching, and caching
4. **Monitoring**: Add comprehensive health checks and metrics collection
5. **Graceful Shutdown**: Ensure proper cleanup of resources during shutdown
6. **Testing**: Use mock clients for unit tests and integration test helpers for end-to-end testing

For additional support or advanced integration scenarios, consult the API documentation or contact the support team.