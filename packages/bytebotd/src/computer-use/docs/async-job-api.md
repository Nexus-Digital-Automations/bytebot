# Bytebot Async Job API Documentation

## Overview

The Bytebot Async Job System provides comprehensive enterprise-grade asynchronous job processing capabilities with advanced monitoring, cancellation, and timeout management. This API enables robust, scalable automation workflows with real-time progress tracking and intelligent resource management.

## Core Features

- **Asynchronous Job Processing**: Non-blocking job execution with immediate jobId response
- **Priority-Based Queuing**: Intelligent job scheduling with priority levels
- **Real-Time Monitoring**: WebSocket-enabled progress tracking and status updates
- **Advanced Cancellation**: Multi-strategy job cancellation with cleanup procedures
- **Timeout Management**: Configurable timeout policies with escalation procedures
- **Batch Operations**: Bulk job submission and management with dependency resolution
- **Comprehensive Analytics**: Performance metrics and execution analytics
- **Enterprise Security**: Rate limiting, authentication, and audit trails

## API Endpoints

### 1. Basic Job Management

#### Submit Job
```http
POST /computer-use/action
Content-Type: application/json
Authorization: Bearer <token>

{
  "action": "screenshot",
  "coordinate": [100, 200],
  "text": "optional text",
  "metadata": {
    "priority": "high",
    "timeout": 30000,
    "useCache": true
  }
}
```

**Response:**
```json
{
  "jobId": "job1640995200000abc12345",
  "status": "pending",
  "submittedAt": "2023-12-31T12:00:00.000Z"
}
```

#### Get Job Status
```http
GET /computer-use/status/{jobId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "jobId": "job1640995200000abc12345",
  "status": "completed",
  "progress": 100,
  "submittedAt": "2023-12-31T12:00:00.000Z",
  "startedAt": "2023-12-31T12:00:01.000Z",
  "completedAt": "2023-12-31T12:00:05.000Z",
  "metadata": {
    "priority": "high",
    "executionTime": 4000
  }
}
```

#### Get Job Result
```http
GET /computer-use/result/{jobId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "jobId": "job1640995200000abc12345",
  "status": "completed",
  "result": {
    "screenshot": "base64_encoded_image_data",
    "coordinates": [100, 200],
    "timestamp": "2023-12-31T12:00:05.000Z"
  },
  "submittedAt": "2023-12-31T12:00:00.000Z",
  "completedAt": "2023-12-31T12:00:05.000Z",
  "executionTimeMs": 4000,
  "metadata": {
    "cacheUsed": true,
    "retryCount": 0
  }
}
```

### 2. Enhanced Job Monitoring

#### Enhanced Job Status
```http
GET /computer-use/enhanced/jobs/{jobId}/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "jobId": "job1640995200000abc12345",
  "status": "in_progress",
  "progress": 75,
  "estimatedCompletion": "2023-12-31T12:00:08.000Z",
  "performanceMetrics": {
    "executionTime": 3000,
    "memoryUsage": 1024,
    "cpuUsage": 45.2
  },
  "currentStep": "processing_screenshot",
  "stepsCompleted": ["validation", "initialization", "capture"],
  "metadata": {
    "priority": "high",
    "batchId": "batch_abc123"
  }
}
```

#### Bulk Job Status
```http
POST /computer-use/enhanced/jobs/bulk-status
Content-Type: application/json
Authorization: Bearer <token>

{
  "jobIds": ["job1", "job2", "job3"],
  "includeMetrics": true,
  "includeProgress": true
}
```

**Response:**
```json
{
  "requestId": "bulk_req_123",
  "jobs": [
    {
      "jobId": "job1",
      "status": "completed",
      "progress": 100
    },
    {
      "jobId": "job2",
      "status": "in_progress",
      "progress": 60
    }
  ],
  "summary": {
    "total": 3,
    "completed": 1,
    "inProgress": 1,
    "failed": 1
  }
}
```

#### System Health Check
```http
GET /computer-use/enhanced/health
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "healthy",
  "metrics": {
    "activeJobs": 5,
    "queueLength": 12,
    "averageExecutionTime": 2500,
    "successRate": 98.5,
    "systemLoad": {
      "cpu": 35.2,
      "memory": 2048,
      "disk": 15.6
    }
  },
  "timestamp": "2023-12-31T12:00:00.000Z"
}
```

### 3. Job Cancellation and Timeout Management

#### Cancel Single Job
```http
POST /computer-use/cancellation/{jobId}/cancel
Content-Type: application/json
Authorization: Bearer <token>

{
  "strategy": "graceful",
  "reason": "User requested cancellation",
  "gracePeriodMs": 5000,
  "cleanup": true,
  "notifyDependents": true
}
```

**Response:**
```json
{
  "jobId": "job1640995200000abc12345",
  "success": true,
  "strategy": "graceful",
  "actualStrategy": "graceful",
  "cancelledAt": "2023-12-31T12:00:03.000Z",
  "duration": 250,
  "reason": "User requested cancellation",
  "cleanup": {
    "resourcesReleased": ["memory_buffer", "file_handles"],
    "dependentsNotified": 2,
    "errors": []
  }
}
```

#### Bulk Job Cancellation
```http
POST /computer-use/cancellation/bulk-cancel
Content-Type: application/json
Authorization: Bearer <token>

{
  "criteria": {
    "batchId": "batch_abc123",
    "status": ["pending", "in_progress"],
    "olderThan": "2023-12-31T11:00:00.000Z",
    "longerThan": 300000
  },
  "strategy": "escalated",
  "reason": "Bulk cleanup operation",
  "maxJobs": 50,
  "dryRun": false,
  "cleanup": true
}
```

**Response:**
```json
{
  "requestId": "bulk_cancel_456",
  "criteria": {
    "batchId": "batch_abc123",
    "status": ["pending", "in_progress"]
  },
  "totalMatched": 25,
  "attempted": 25,
  "successful": 23,
  "failed": 2,
  "cancelled": [
    {
      "jobId": "job1",
      "success": true,
      "strategy": "graceful"
    }
  ],
  "failures": [
    {
      "jobId": "job2",
      "error": "Job not found"
    }
  ],
  "duration": 1500,
  "dryRun": false
}
```

#### Configure Job Timeout
```http
POST /computer-use/cancellation/{jobId}/timeout-config
Content-Type: application/json
Authorization: Bearer <token>

{
  "softTimeoutMs": 30000,
  "hardTimeoutMs": 60000,
  "escalationSteps": [
    {
      "delayMs": 25000,
      "action": "warning",
      "metadata": {
        "notificationLevel": "info"
      }
    },
    {
      "delayMs": 50000,
      "action": "graceful_cancel",
      "metadata": {
        "notificationLevel": "warning"
      }
    },
    {
      "delayMs": 55000,
      "action": "force_cancel",
      "metadata": {
        "notificationLevel": "critical"
      }
    }
  ]
}
```

**Response:**
```json
{
  "message": "Timeout configuration applied successfully",
  "jobId": "job1640995200000abc12345",
  "configured": true
}
```

#### Emergency Shutdown
```http
POST /computer-use/cancellation/emergency-shutdown
Content-Type: application/json
Authorization: Bearer <token>

{
  "reason": "System maintenance required",
  "confirmationCode": "EMERGENCY_SHUTDOWN_CONFIRMED"
}
```

**Response:**
```json
{
  "requestId": "emergency_789",
  "totalMatched": 45,
  "attempted": 45,
  "successful": 43,
  "failed": 2,
  "duration": 2500,
  "reason": "System maintenance required"
}
```

### 4. Batch Job Operations

#### Submit Batch Jobs
```http
POST /computer-use/enhanced/batch
Content-Type: application/json
Authorization: Bearer <token>

{
  "executionMode": "parallel",
  "batchPriority": "high",
  "stopOnFirstFailure": false,
  "jobs": [
    {
      "jobKey": "screenshot_1",
      "action": {
        "action": "screenshot",
        "coordinate": [100, 200]
      },
      "priority": "high",
      "timeout": 30000,
      "dependencies": []
    },
    {
      "jobKey": "click_1",
      "action": {
        "action": "click",
        "coordinate": [150, 250]
      },
      "dependencies": [
        {
          "dependsOnJobId": "screenshot_1",
          "type": "completion"
        }
      ]
    }
  ],
  "metadata": {
    "workflow": "automation_sequence_1",
    "user": "admin"
  }
}
```

**Response:**
```json
{
  "batchId": "batch_def789",
  "jobIds": {
    "screenshot_1": "job1640995200000abc12345",
    "click_1": "job1640995200000def67890"
  },
  "submittedAt": "2023-12-31T12:00:00.000Z",
  "totalJobs": 2,
  "executionMode": "parallel"
}
```

## WebSocket Real-Time Updates

### Connection
```javascript
const socket = io('/job-events', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Event Subscriptions

#### Job Progress Updates
```javascript
socket.on('job.progress', (data) => {
  console.log('Job progress:', data);
  // {
  //   jobId: 'job1640995200000abc12345',
  //   progress: 75,
  //   currentStep: 'processing',
  //   estimatedCompletion: '2023-12-31T12:00:08.000Z'
  // }
});
```

#### Job Completion
```javascript
socket.on('job.completed', (data) => {
  console.log('Job completed:', data);
  // {
  //   jobId: 'job1640995200000abc12345',
  //   status: 'completed',
  //   result: { ... },
  //   executionTime: 4000
  // }
});
```

#### Job Cancellation
```javascript
socket.on('job.cancelled', (data) => {
  console.log('Job cancelled:', data);
  // {
  //   jobId: 'job1640995200000abc12345',
  //   reason: 'User requested',
  //   strategy: 'graceful'
  // }
});
```

#### System Health Updates
```javascript
socket.on('system.health', (data) => {
  console.log('System health:', data);
  // {
  //   status: 'healthy',
  //   activeJobs: 5,
  //   queueLength: 12,
  //   metrics: { ... }
  // }
});
```

## Job Status Values

- `pending`: Job submitted and waiting in queue
- `in_progress`: Job currently being executed
- `completed`: Job finished successfully
- `failed`: Job execution failed
- `cancelled`: Job was cancelled before completion

## Job Priority Values

- `urgent`: Highest priority, executed immediately
- `high`: High priority, executed before normal jobs
- `normal`: Default priority level
- `low`: Lower priority, executed when system has capacity

## Cancellation Strategies

- `graceful`: Allow current operations to complete naturally
- `immediate`: Stop execution as soon as possible
- `forced`: Terminate forcefully if needed, with resource cleanup
- `escalated`: Try graceful first, escalate to forced if needed

## Timeout Escalation Actions

- `warning`: Send notification about approaching timeout
- `graceful_cancel`: Attempt graceful job cancellation
- `force_cancel`: Force job cancellation
- `emergency_stop`: Trigger system-wide emergency shutdown

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid job ID format",
  "error": "Bad Request",
  "timestamp": "2023-12-31T12:00:00.000Z"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Job not found: job1640995200000abc12345",
  "error": "Not Found",
  "timestamp": "2023-12-31T12:00:00.000Z"
}
```

#### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded",
  "error": "Too Many Requests",
  "retryAfter": 60,
  "timestamp": "2023-12-31T12:00:00.000Z"
}
```

#### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Job execution failed due to system error",
  "error": "Internal Server Error",
  "timestamp": "2023-12-31T12:00:00.000Z"
}
```

## Rate Limiting

The API implements rate limiting to ensure system stability:

- **Standard endpoints**: 100 requests per minute per user
- **Bulk operations**: 10 requests per minute per user
- **Emergency operations**: 5 requests per minute per user
- **WebSocket connections**: 5 concurrent connections per user

## Authentication

All API endpoints require JWT authentication via the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Best Practices

### 1. Job Submission
- Use appropriate priority levels based on urgency
- Set reasonable timeout values based on expected execution time
- Include meaningful metadata for tracking and debugging
- Use caching for repetitive operations

### 2. Status Monitoring
- Use WebSocket connections for real-time updates
- Implement exponential backoff for polling
- Handle job failures gracefully with retry logic
- Monitor system health regularly

### 3. Cancellation Management
- Use graceful cancellation when possible
- Provide clear reasons for cancellations
- Clean up resources after cancellation
- Notify dependent jobs appropriately

### 4. Batch Operations
- Group related jobs into batches
- Use dependencies to control execution order
- Monitor batch progress and handle partial failures
- Implement proper error handling for batch operations

### 5. Performance Optimization
- Use appropriate concurrency limits
- Monitor system resources
- Implement circuit breakers for external dependencies
- Cache frequently accessed results

## Example Workflows

### 1. Simple Screenshot Automation
```javascript
// 1. Submit screenshot job
const response = await fetch('/computer-use/action', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    action: 'screenshot',
    coordinate: [100, 200],
    metadata: { priority: 'normal' }
  })
});

const { jobId } = await response.json();

// 2. Monitor progress via WebSocket
socket.on('job.completed', (data) => {
  if (data.jobId === jobId) {
    console.log('Screenshot completed:', data.result);
  }
});

// 3. Get final result
const result = await fetch(`/computer-use/result/${jobId}`);
const screenshotData = await result.json();
```

### 2. Batch Automation Workflow
```javascript
// 1. Submit batch with dependencies
const batchResponse = await fetch('/computer-use/enhanced/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    executionMode: 'sequential',
    jobs: [
      {
        jobKey: 'login',
        action: { action: 'click', coordinate: [100, 50] }
      },
      {
        jobKey: 'navigate',
        action: { action: 'key', text: 'Enter' },
        dependencies: [{ dependsOnJobId: 'login', type: 'completion' }]
      },
      {
        jobKey: 'capture',
        action: { action: 'screenshot' },
        dependencies: [{ dependsOnJobId: 'navigate', type: 'completion' }]
      }
    ]
  })
});

const { batchId, jobIds } = await batchResponse.json();

// 2. Monitor batch progress
socket.on('batch.progress', (data) => {
  if (data.batchId === batchId) {
    console.log(`Batch progress: ${data.completedJobs}/${data.totalJobs}`);
  }
});
```

### 3. Emergency Job Management
```javascript
// 1. Monitor system health
socket.on('system.health', (data) => {
  if (data.status === 'degraded') {
    console.warn('System performance degraded');

    // 2. Cancel long-running jobs
    fetch('/computer-use/cancellation/bulk-cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        criteria: {
          status: ['in_progress'],
          longerThan: 300000 // 5 minutes
        },
        strategy: 'graceful',
        reason: 'System performance optimization'
      })
    });
  }
});

// 3. Emergency shutdown if critical
if (systemCritical) {
  await fetch('/computer-use/cancellation/emergency-shutdown', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      reason: 'Critical system error detected',
      confirmationCode: 'EMERGENCY_SHUTDOWN_CONFIRMED'
    })
  });
}
```

## Troubleshooting

### Common Issues

1. **Job Stuck in Pending State**
   - Check system health endpoint
   - Verify queue length and worker availability
   - Review job priority and system load

2. **Job Cancellation Fails**
   - Verify job is in cancellable state
   - Check for resource locks or dependencies
   - Try escalated cancellation strategy

3. **Timeout Errors**
   - Review timeout configuration
   - Check system performance metrics
   - Consider adjusting timeout values

4. **WebSocket Connection Issues**
   - Verify authentication token
   - Check network connectivity
   - Review rate limiting status

### Support

For additional support and advanced configuration options, please refer to the Bytebot system administration documentation or contact the development team.