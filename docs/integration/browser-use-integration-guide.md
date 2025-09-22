# Browser-Use Framework Integration Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation & Setup](#installation--setup)
4. [Local Deployment](#local-deployment)
5. [Configuration](#configuration)
6. [Authentication Setup](#authentication-setup)
7. [Basic Integration](#basic-integration)
8. [Advanced Usage](#advanced-usage)
9. [Client SDKs](#client-sdks)
10. [Testing & Validation](#testing--validation)
11. [Production Deployment](#production-deployment)
12. [Monitoring & Observability](#monitoring--observability)

## Overview

The Bytebot Browser-Use API provides a comprehensive REST interface for browser automation using the browser-use Python framework. This guide covers complete integration from development to production deployment.

### Key Features

- **100% Local Deployment**: No cloud dependencies, Docker Compose ready
- **Enterprise Security**: JWT authentication, RBAC, rate limiting
- **Python Framework Integration**: Direct browser-use framework support
- **Real-time Monitoring**: Health checks, metrics, performance tracking
- **Comprehensive APIs**: Task management, session control, data extraction
- **Multi-format Export**: JSON, CSV, XLSX, PDF result formats

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │  Bytebot API    │    │ Browser-Use     │
│                 │────┤                 │────┤ Framework       │
│ - Web App       │    │ - REST API      │    │ - Python Agent  │
│ - Mobile App    │    │ - Authentication│    │ - Browser Control│
│ - CLI Tool      │    │ - Rate Limiting │    │ - AI Integration │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### System Requirements

- **Operating System**: Linux, macOS, or Windows (WSL2)
- **Node.js**: v18.0+ with npm/yarn
- **Python**: 3.9+ with pip
- **Docker**: Latest version with Docker Compose
- **Chrome/Chromium**: For browser automation
- **Memory**: 8GB+ RAM recommended
- **Storage**: 10GB+ free space

### Required Knowledge

- REST API concepts and authentication
- Basic Docker and containerization
- JavaScript/TypeScript or Python programming
- Understanding of browser automation concepts

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/bytebot.git
cd bytebot
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies for browser-use
pip install browser-use anthropic playwright

# Install Playwright browsers
playwright install chromium
```

### 3. Environment Configuration

Create `.env` file in the project root:

```env
# Database Configuration
DATABASE_URL="postgresql://bytebot:password@localhost:5432/bytebot_db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="24h"

# Browser-Use Configuration
PYTHON_PATH="/usr/bin/python3"
BROWSER_USE_PATH="/path/to/browser-use"
MAX_CONCURRENT_SESSIONS=5
SESSION_TIMEOUT=300000
TASK_TIMEOUT=60000
ENABLE_SCREENSHOTS=true

# API Configuration
PORT=3000
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL="info"

# Security
BCRYPT_ROUNDS=12
ENABLE_AUDIT_LOGGING=true
```

### 4. Database Setup

```bash
# Start PostgreSQL (using Docker)
docker run --name bytebot-postgres \
  -e POSTGRES_DB=bytebot_db \
  -e POSTGRES_USER=bytebot \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

## Local Deployment

### Option 1: Development Mode

```bash
# Start the API server
npm run dev

# In another terminal, start the worker processes
npm run worker:dev

# Access the API
curl http://localhost:3000/api/v1/health
```

### Option 2: Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: bytebot_db
      POSTGRES_USER: bytebot
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bytebot"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Bytebot API
  api:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: "postgresql://bytebot:password@postgres:5432/bytebot_db"
      JWT_SECRET: "your-jwt-secret-change-in-production"
      PYTHON_PATH: "/usr/bin/python3"
      BROWSER_USE_PATH: "/app/browser-use"
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./browser-use:/app/browser-use
      - screenshots:/app/screenshots
      - results:/app/results
    restart: unless-stopped

  # Browser Worker (for heavy automation tasks)
  browser-worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      DATABASE_URL: "postgresql://bytebot:password@postgres:5432/bytebot_db"
      WORKER_TYPE: "browser"
      HEADLESS: "true"
    depends_on:
      - postgres
    volumes:
      - ./browser-use:/app/browser-use
      - screenshots:/app/screenshots
    restart: unless-stopped
    deploy:
      replicas: 2

volumes:
  postgres_data:
  screenshots:
  results:
```

Deploy with Docker Compose:

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f api

# Scale browser workers
docker-compose up -d --scale browser-worker=3
```

## Configuration

### API Configuration

Configure the API in `config/api.config.ts`:

```typescript
export const apiConfig = {
  port: process.env.PORT || 3000,
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP',
  },
  security: {
    helmet: {
      contentSecurityPolicy: false, // Adjust based on your needs
    },
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  },
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    enableHealthChecks: true,
    enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING === 'true',
  },
};
```

### Browser-Use Configuration

Configure browser automation in `config/browser-use.config.ts`:

```typescript
export const browserUseConfig = {
  python: {
    path: process.env.PYTHON_PATH || 'python3',
    browserUsePath: process.env.BROWSER_USE_PATH || './browser-use',
  },
  sessions: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5'),
    timeout: parseInt(process.env.SESSION_TIMEOUT || '300000'),
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  },
  tasks: {
    timeout: parseInt(process.env.TASK_TIMEOUT || '60000'),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
    enableScreenshots: process.env.ENABLE_SCREENSHOTS !== 'false',
  },
  browser: {
    headless: process.env.HEADLESS !== 'false',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
    ],
  },
};
```

## Authentication Setup

### 1. Create User Management System

```typescript
// auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { CreateUserDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    const payload = { email: user.email, sub: user.id, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
```

### 2. Setup JWT Strategy

```typescript
// auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
```

### 3. Create Admin User

```bash
# Using CLI
npm run auth:create-admin --email=admin@example.com --password=secure-password

# Or via API
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "secure-password",
    "role": "admin",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

## Basic Integration

### 1. Client Authentication

```javascript
// JavaScript/Node.js client
class BytebotClient {
  constructor(baseUrl = 'http://localhost:3000', token = null) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async login(email, password) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    this.token = data.access_token;
    return data;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// Usage example
const client = new BytebotClient();
await client.login('user@example.com', 'password');
```

### 2. Create Browser Session

```javascript
// Create a new browser session
const session = await client.request('/api/v1/browser-use/sessions', {
  method: 'POST',
  body: JSON.stringify({
    name: 'My automation session',
    configuration: {
      viewport: { width: 1920, height: 1080 },
      headless: true,
    },
  }),
});

console.log('Session created:', session.sessionId);
```

### 3. Execute Browser Tasks

```javascript
// Create and execute a browser task
const task = await client.request('/api/v1/browser-use/tasks', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Extract product data',
    type: 'data_extraction',
    startUrl: 'https://example-store.com/products',
    steps: [
      {
        id: 'navigate',
        type: 'navigate',
        action: { url: 'https://example-store.com/products' },
      },
      {
        id: 'extract',
        type: 'extract',
        action: {
          rules: [
            {
              name: 'product_titles',
              selector: '.product-title',
              attribute: 'text',
              multiple: true,
            },
          ],
        },
      },
    ],
  }),
});

// Monitor task progress
const taskId = task.taskId;
let taskStatus;

do {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  taskStatus = await client.request(`/api/v1/browser-use/monitoring/tasks/${taskId}/status`);
  console.log(`Task status: ${taskStatus.status} (${taskStatus.progress.percentComplete}%)`);
} while (['pending', 'running'].includes(taskStatus.status));

console.log('Task completed:', taskStatus.status);
```

### 4. Retrieve Results

```javascript
// Get task results
const results = await client.request(`/api/v1/browser-use/results/${taskId}`);
console.log('Extracted data:', results.extractedData);

// Export results
const exportRequest = await client.request(`/api/v1/browser-use/results/${taskId}/export`, {
  method: 'POST',
  body: JSON.stringify({
    format: 'JSON',
    includeScreenshots: true,
  }),
});

console.log('Download URL:', exportRequest.exportInfo.downloadUrl);
```

## Advanced Usage

### 1. Custom Browser Interactions

```javascript
// Execute custom DOM interactions
const sessionId = session.sessionId;

// Navigate to a page
await client.request(`/api/v1/browser-use/sessions/${sessionId}/navigate`, {
  method: 'POST',
  body: JSON.stringify({
    url: 'https://example.com/login',
    waitForSelector: '#username',
  }),
});

// Fill and submit a form
await client.request(`/api/v1/browser-use/sessions/${sessionId}/forms/fill`, {
  method: 'POST',
  body: JSON.stringify({
    formSelector: '#login-form',
    fields: [
      { selector: '#username', value: 'user@example.com', type: 'text' },
      { selector: '#password', value: 'password', type: 'password' },
    ],
  }),
});

await client.request(`/api/v1/browser-use/sessions/${sessionId}/forms/submit`, {
  method: 'POST',
  body: JSON.stringify({
    formSelector: '#login-form',
    waitForNavigation: true,
  }),
});
```

### 2. Screenshot Capture

```javascript
// Capture screenshots during automation
const screenshot = await client.request(`/api/v1/browser-use/sessions/${sessionId}/screenshot`, {
  method: 'POST',
  body: JSON.stringify({
    fullPage: true,
    options: {
      quality: 90,
      format: 'png',
    },
  }),
});

// Save screenshot data
const fs = require('fs');
const imageData = screenshot.imageData.replace(/^data:image\/png;base64,/, '');
fs.writeFileSync('screenshot.png', imageData, 'base64');
```

### 3. Advanced Data Extraction

```javascript
// Complex data extraction with transformations
const extractionResult = await client.request(`/api/v1/browser-use/sessions/${sessionId}/extract`, {
  method: 'POST',
  body: JSON.stringify({
    rules: [
      {
        name: 'product_data',
        selector: '.product-item',
        multiple: true,
        fields: {
          title: { selector: '.title', attribute: 'text' },
          price: { selector: '.price', attribute: 'text', transform: 'parsePrice' },
          image: { selector: 'img', attribute: 'src' },
          link: { selector: 'a', attribute: 'href' },
          rating: { selector: '.rating', attribute: 'data-rating' },
        },
      },
      {
        name: 'pagination_info',
        selector: '.pagination',
        fields: {
          currentPage: { selector: '.current', attribute: 'text' },
          totalPages: { selector: '.total', attribute: 'text' },
        },
      },
    ],
    format: 'json',
  }),
});

console.log('Extracted products:', extractionResult.extractedData.product_data);
```

### 4. Error Handling and Retry Logic

```javascript
class BytebotClientWithRetry extends BytebotClient {
  async requestWithRetry(endpoint, options = {}, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.request(endpoint, options);
      } catch (error) {
        if (attempt === maxRetries) throw error;

        if (error.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = error.headers?.['retry-after'] || 60;
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        } else if (error.status >= 500) {
          // Server error - exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        } else {
          // Client error - don't retry
          throw error;
        }
      }
    }
  }

  async executeTaskWithErrorHandling(taskDefinition) {
    try {
      const task = await this.requestWithRetry('/api/v1/browser-use/tasks', {
        method: 'POST',
        body: JSON.stringify(taskDefinition),
      });

      return await this.monitorTaskCompletion(task.taskId);
    } catch (error) {
      console.error('Task execution failed:', error);
      throw error;
    }
  }

  async monitorTaskCompletion(taskId, timeoutMs = 300000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.requestWithRetry(`/api/v1/browser-use/monitoring/tasks/${taskId}/status`);

      if (status.status === 'completed') {
        return await this.requestWithRetry(`/api/v1/browser-use/results/${taskId}`);
      } else if (status.status === 'failed') {
        throw new Error(`Task failed: ${status.error?.message || 'Unknown error'}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Task execution timeout');
  }
}
```

## Client SDKs

### JavaScript/TypeScript SDK

```typescript
// @bytebot/client package
import { BytebotClient, BrowserTask, BrowserSession } from '@bytebot/client';

const client = new BytebotClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your-api-key',
});

// Type-safe API calls
const session: BrowserSession = await client.sessions.create({
  name: 'E-commerce automation',
  configuration: {
    viewport: { width: 1920, height: 1080 },
  },
});

const task: BrowserTask = await client.tasks.create({
  name: 'Product extraction',
  sessionId: session.sessionId,
  steps: [
    { type: 'navigate', action: { url: 'https://example.com' } },
    { type: 'extract', action: { selector: '.product' } },
  ],
});

const results = await client.tasks.waitForCompletion(task.taskId);
```

### Python SDK

```python
# bytebot-client package
from bytebot_client import BytebotClient
from bytebot_client.types import BrowserTask, TaskStep, ExtractionRule

client = BytebotClient(
    base_url="http://localhost:3000",
    api_key="your-api-key"
)

# Create session
session = client.sessions.create(
    name="Python automation session",
    configuration={
        "viewport": {"width": 1920, "height": 1080},
        "headless": True
    }
)

# Create and execute task
task = client.tasks.create(
    name="Extract product data",
    session_id=session.session_id,
    steps=[
        TaskStep(
            type="navigate",
            action={"url": "https://example-store.com"}
        ),
        TaskStep(
            type="extract",
            action={
                "rules": [
                    ExtractionRule(
                        name="products",
                        selector=".product-item",
                        multiple=True
                    )
                ]
            }
        )
    ]
)

# Wait for completion
results = client.tasks.wait_for_completion(task.task_id, timeout=300)
print(f"Extracted {len(results.extracted_data)} items")
```

### Command Line Interface

```bash
# Install CLI
npm install -g @bytebot/cli

# Configure
bytebot config set api-url http://localhost:3000
bytebot auth login user@example.com

# Create session
bytebot session create "My session" --headless

# Execute task from file
bytebot task run --file automation-task.json

# Monitor task
bytebot task status task_123456

# Export results
bytebot results export task_123456 --format json --output results.json
```

## Testing & Validation

### 1. Unit Tests

```typescript
// test/browser-use.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BrowserUseService } from '../src/browser-use/browser-use.service';

describe('BrowserUseService', () => {
  let service: BrowserUseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BrowserUseService],
    }).compile();

    service = module.get<BrowserUseService>(BrowserUseService);
  });

  it('should create a browser task', async () => {
    const taskDto = {
      name: 'Test task',
      type: 'navigation',
      sessionId: 'test-session',
      instruction: 'Navigate to Google',
    };

    const result = await service.createTask(taskDto);
    expect(result.success).toBe(true);
    expect(result.taskId).toBeDefined();
  });

  it('should handle task cancellation', async () => {
    // Create task
    const task = await service.createTask({
      name: 'Test task',
      type: 'navigation',
      sessionId: 'test-session',
      instruction: 'Navigate to Google',
    });

    // Cancel task
    const cancelResult = await service.cancelTask(task.taskId);
    expect(cancelResult.success).toBe(true);

    // Verify cancellation
    const taskStatus = await service.getTask(task.taskId);
    expect(taskStatus.data.status).toBe('cancelled');
  });
});
```

### 2. Integration Tests

```typescript
// test/e2e/browser-automation.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Browser Automation (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login and get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create and execute a browser task', async () => {
    // Create session
    const sessionResponse = await request(app.getHttpServer())
      .post('/api/v1/browser-use/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'E2E test session',
        configuration: { headless: true },
      })
      .expect(201);

    const sessionId = sessionResponse.body.sessionId;

    // Create task
    const taskResponse = await request(app.getHttpServer())
      .post('/api/v1/browser-use/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'E2E navigation test',
        type: 'navigation',
        startUrl: 'https://httpbin.org',
        steps: [
          {
            id: 'navigate',
            type: 'navigate',
            action: { url: 'https://httpbin.org' },
          },
        ],
      })
      .expect(201);

    expect(taskResponse.body.taskId).toBeDefined();
    expect(taskResponse.body.status).toBe('running');

    // Monitor task completion
    const taskId = taskResponse.body.taskId;
    let completed = false;
    let attempts = 0;

    while (!completed && attempts < 30) {
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/v1/browser-use/monitoring/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (['completed', 'failed'].includes(statusResponse.body.status)) {
        completed = true;
        expect(statusResponse.body.status).toBe('completed');
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    expect(completed).toBe(true);
  });
});
```

### 3. Performance Tests

```javascript
// test/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '1m', target: 0 },  // Ramp down
  ],
};

const BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'your-test-token';

export default function () {
  // Health check
  let response = http.get(`${BASE_URL}/api/v1/browser-use/monitoring/health`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });

  check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Create session
  response = http.post(
    `${BASE_URL}/api/v1/browser-use/sessions`,
    JSON.stringify({
      name: 'Load test session',
      configuration: { headless: true },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    }
  );

  check(response, {
    'session creation status is 201': (r) => r.status === 201,
    'session creation response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
```

## Production Deployment

### 1. Docker Production Build

```dockerfile
# Dockerfile.production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime

# Install system dependencies
RUN apk add --no-cache \
    chromium \
    python3 \
    py3-pip \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Install Python dependencies
RUN pip3 install browser-use anthropic playwright

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV CHROME_BIN=/usr/bin/chromium-browser

CMD ["node", "dist/main"]
```

### 2. Kubernetes Deployment

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bytebot

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bytebot-config
  namespace: bytebot
data:
  NODE_ENV: "production"
  PORT: "3000"
  HEADLESS: "true"
  MAX_CONCURRENT_SESSIONS: "10"
  ENABLE_METRICS: "true"

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bytebot-secrets
  namespace: bytebot
type: Opaque
stringData:
  JWT_SECRET: "your-production-jwt-secret"
  DATABASE_URL: "postgresql://user:pass@postgres:5432/bytebot"

---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bytebot-api
  namespace: bytebot
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bytebot-api
  template:
    metadata:
      labels:
        app: bytebot-api
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: api
        image: bytebot/api:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: bytebot-config
        - secretRef:
            name: bytebot-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: bytebot-api-service
  namespace: bytebot
spec:
  selector:
    app: bytebot-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bytebot-ingress
  namespace: bytebot
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.bytebot.yourdomain.com
    secretName: bytebot-tls
  rules:
  - host: api.bytebot.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bytebot-api-service
            port:
              number: 80
```

Deploy to Kubernetes:

```bash
# Apply configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n bytebot

# View logs
kubectl logs -f deployment/bytebot-api -n bytebot

# Scale deployment
kubectl scale deployment bytebot-api --replicas=5 -n bytebot
```

### 3. Production Configuration

```typescript
// config/production.config.ts
export const productionConfig = {
  api: {
    port: process.env.PORT || 3000,
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
      credentials: true,
    },
  },
  database: {
    url: process.env.DATABASE_URL,
    ssl: true,
    pool: {
      min: 5,
      max: 20,
    },
  },
  security: {
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: '1h',
    },
    bcrypt: {
      rounds: 12,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
    },
  },
  browserUse: {
    maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '10'),
    sessionTimeout: 10 * 60 * 1000, // 10 minutes
    taskTimeout: 5 * 60 * 1000, // 5 minutes
    retryAttempts: 3,
    headless: true,
  },
  monitoring: {
    enableMetrics: true,
    enableHealthChecks: true,
    enableAuditLogging: true,
    logLevel: 'info',
  },
};
```

## Monitoring & Observability

### 1. Health Checks

```typescript
// health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, DatabaseHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private database: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.database.pingCheck('database'),
      () => this.http.pingCheck('browser-use-service', 'http://localhost:3001/health'),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.database.pingCheck('database'),
      // Add more readiness checks as needed
    ]);
  }
}
```

### 2. Metrics Collection

```typescript
// metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private taskCounter = new Counter({
    name: 'browser_tasks_total',
    help: 'Total number of browser tasks',
    labelNames: ['status', 'type'],
  });

  private taskDuration = new Histogram({
    name: 'browser_task_duration_seconds',
    help: 'Duration of browser tasks in seconds',
    labelNames: ['type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  });

  private activeSessions = new Gauge({
    name: 'browser_sessions_active',
    help: 'Number of active browser sessions',
  });

  incrementTaskCounter(status: string, type: string) {
    this.taskCounter.inc({ status, type });
  }

  observeTaskDuration(duration: number, type: string) {
    this.taskDuration.observe({ type }, duration);
  }

  setActiveSessions(count: number) {
    this.activeSessions.set(count);
  }

  getMetrics() {
    return register.metrics();
  }
}
```

### 3. Logging Configuration

```typescript
// logging/logger.config.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig = WinstonModule.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bytebot-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});
```

### 4. Monitoring Stack (Prometheus + Grafana)

```yaml
# monitoring/docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources

volumes:
  prometheus_data:
  grafana_data:
```

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'bytebot-api'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

---

This comprehensive integration guide provides everything needed to successfully deploy and integrate the Bytebot Browser-Use API from development through production. For specific use cases and troubleshooting, refer to the additional documentation sections.