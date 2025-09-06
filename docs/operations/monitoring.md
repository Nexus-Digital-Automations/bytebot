# Monitoring and Observability

## Overview

Bytebot implements comprehensive monitoring and observability to ensure high availability, performance optimization, and proactive issue detection in production environments.

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Observability Stack                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Prometheus    │  │     Grafana     │  │  Alertmanager   │ │
│  │   (Metrics)     │  │  (Dashboards)   │  │  (Alerting)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Log Aggregation                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │  Filebeat/   │  │ Elasticsearch│  │    Kibana    │    │ │
│  │  │   Fluentd    │  │   / Loki     │  │  / Grafana   │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Tracing System                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │    Jaeger    │  │    Zipkin    │  │   OpenTelemetry  │ │
│  │  │ (Distributed)│  │ (Alternative)│  │   (Collection)   │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Metrics Collection

### Application Metrics

Bytebot exposes comprehensive metrics at `/metrics` endpoint:

#### Core Business Metrics

```typescript
// Custom metrics defined in metrics.service.ts
export class MetricsService {
  private readonly taskCounter = new Counter({
    name: 'bytebot_tasks_total',
    help: 'Total number of tasks processed',
    labelNames: ['status', 'type', 'user_id']
  });

  private readonly taskDurationHistogram = new Histogram({
    name: 'bytebot_task_duration_seconds',
    help: 'Task processing duration in seconds',
    labelNames: ['type', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 300]
  });

  private readonly computerOperationsCounter = new Counter({
    name: 'bytebot_computer_operations_total',
    help: 'Total computer operations performed',
    labelNames: ['operation_type', 'status']
  });

  private readonly apiRequestsCounter = new Counter({
    name: 'bytebot_api_requests_total', 
    help: 'Total API requests',
    labelNames: ['method', 'endpoint', 'status_code']
  });

  private readonly websocketConnectionsGauge = new Gauge({
    name: 'bytebot_websocket_connections_active',
    help: 'Active WebSocket connections'
  });

  private readonly databaseConnectionsGauge = new Gauge({
    name: 'bytebot_database_connections_active',
    help: 'Active database connections'
  });

  private readonly aneProcessingDuration = new Histogram({
    name: 'bytebot_ane_processing_duration_seconds',
    help: 'Apple Neural Engine processing duration',
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5]
  });
}
```

#### System Performance Metrics

```prometheus
# CPU Usage
process_cpu_seconds_total
nodejs_heap_size_total_bytes
nodejs_heap_size_used_bytes
nodejs_external_memory_bytes

# Event Loop
nodejs_eventloop_lag_seconds
nodejs_eventloop_lag_min_seconds
nodejs_eventloop_lag_max_seconds
nodejs_eventloop_lag_mean_seconds
nodejs_eventloop_lag_stddev_seconds

# HTTP Requests
http_request_duration_ms
http_requests_total
http_request_size_bytes
http_response_size_bytes
```

### Health Checks

#### Liveness Probe
```http
GET /health/live
```

**Response (Healthy):**
```json
{
  "status": "ok",
  "timestamp": "2025-09-06T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "pid": 1
}
```

#### Readiness Probe
```http
GET /health/ready
```

**Response (Ready):**
```json
{
  "status": "ok",
  "timestamp": "2025-09-06T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": "12ms"
    },
    "redis": {
      "status": "ok", 
      "responseTime": "3ms"
    },
    "ane_service": {
      "status": "ok",
      "responseTime": "8ms"
    }
  }
}
```

#### Startup Probe
```http
GET /health/startup
```

**Response (Started):**
```json
{
  "status": "ok",
  "timestamp": "2025-09-06T10:30:00.000Z",
  "initialization": {
    "database_migrations": "completed",
    "ane_service_init": "completed", 
    "websocket_server": "listening",
    "job_queue": "connected"
  }
}
```

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 30s
  evaluation_interval: 30s

rule_files:
  - "/etc/prometheus/rules/*.yml"

scrape_configs:
  # Bytebot Application
  - job_name: 'bytebot-api'
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names: [bytebot-production]
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: bytebot-api
      - source_labels: [__meta_kubernetes_endpoint_port_name]
        action: keep
        regex: metrics

  # Bytebot Workers
  - job_name: 'bytebot-worker'
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names: [bytebot-production]
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: bytebot-worker
      - source_labels: [__meta_kubernetes_endpoint_port_name]
        action: keep
        regex: metrics

  # Node Exporter
  - job_name: 'node-exporter'
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)

  # cAdvisor
  - job_name: 'kubernetes-cadvisor'
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
      - target_label: __address__
        replacement: kubernetes.default.svc:443
      - source_labels: [__meta_kubernetes_node_name]
        regex: (.+)
        target_label: __metrics_path__
        replacement: /api/v1/nodes/${1}/proxy/metrics/cadvisor
```

## Grafana Dashboards

### Main Application Dashboard

```json
{
  "dashboard": {
    "id": null,
    "title": "Bytebot - Application Overview",
    "description": "Main dashboard for Bytebot application monitoring",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(bytebot_api_requests_total[5m]))",
            "legendFormat": "Requests/sec"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps"
          }
        }
      },
      {
        "id": 2,
        "title": "Response Time Percentiles",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_ms_bucket[5m]))",
            "legendFormat": "50th percentile"
          },
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_ms_bucket[5m]))",
            "legendFormat": "99th percentile"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(bytebot_api_requests_total{status_code=~\"5..\"}[5m])) / sum(rate(bytebot_api_requests_total[5m])) * 100",
            "legendFormat": "Error %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "max": 10,
            "thresholds": {
              "steps": [
                {"color": "green", "value": 0},
                {"color": "yellow", "value": 2},
                {"color": "red", "value": 5}
              ]
            }
          }
        }
      }
    ]
  }
}
```

### Task Processing Dashboard

Key panels for task monitoring:

- **Task Throughput**: Rate of task creation and completion
- **Task Duration**: Processing time distribution
- **Task Success Rate**: Percentage of successful task completions
- **Queue Length**: Number of pending tasks in queue
- **Worker Utilization**: Active vs idle workers

### Computer-Use Operations Dashboard

Specialized dashboard for computer automation monitoring:

- **Mouse Operations**: Click, drag, scroll operations per second
- **Keyboard Operations**: Key presses, text input rate
- **Screen Capture Performance**: Screenshot capture latency and throughput  
- **OCR Processing**: Text detection accuracy and processing time
- **ANE Utilization**: Apple Neural Engine usage and performance

### System Performance Dashboard

Infrastructure and system-level metrics:

- **CPU Usage**: Per-pod and node-level CPU utilization
- **Memory Usage**: Heap usage, memory leaks detection
- **Database Performance**: Connection pool, query performance
- **Network I/O**: Ingress/egress traffic patterns
- **Storage I/O**: Disk usage and throughput

## Alert Rules

### Critical Alerts

```yaml
# alert-rules.yml
groups:
  - name: bytebot-critical
    rules:
      # Service Down
      - alert: BytebotServiceDown
        expr: up{job=~"bytebot-.*"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Bytebot service {{ $labels.job }} is down"
          description: "Service {{ $labels.job }} has been down for more than 2 minutes."
          runbook_url: "https://docs.bytebot.com/runbooks/service-down"

      # High Error Rate
      - alert: BytebotHighErrorRate
        expr: |
          (
            sum(rate(bytebot_api_requests_total{status_code=~"5.."}[5m])) /
            sum(rate(bytebot_api_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"
          runbook_url: "https://docs.bytebot.com/runbooks/high-error-rate"

      # Database Connection Issues
      - alert: BytebotDatabaseConnectionFailure
        expr: bytebot_database_connections_active == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failure"
          description: "No active database connections detected"
          runbook_url: "https://docs.bytebot.com/runbooks/database-issues"

      # Memory Usage Critical
      - alert: BytebotHighMemoryUsage
        expr: |
          (nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) > 0.95
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Critical memory usage in {{ $labels.instance }}"
          description: "Memory usage is {{ $value | humanizePercentage }}"
          runbook_url: "https://docs.bytebot.com/runbooks/memory-issues"
```

### Warning Alerts

```yaml
  - name: bytebot-warning
    rules:
      # High Response Time
      - alert: BytebotHighResponseTime
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_ms_bucket[5m])) by (le)
          ) > 2000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}ms"

      # Task Failure Rate
      - alert: BytebotHighTaskFailureRate
        expr: |
          (
            sum(rate(bytebot_tasks_total{status="failed"}[5m])) /
            sum(rate(bytebot_tasks_total[5m]))
          ) > 0.02
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High task failure rate"
          description: "Task failure rate is {{ $value | humanizePercentage }}"

      # Queue Backlog
      - alert: BytebotTaskQueueBacklog
        expr: bytebot_task_queue_length > 100
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Task queue backlog detected"
          description: "{{ $value }} tasks in queue for over 15 minutes"

      # Disk Space
      - alert: BytebotHighDiskUsage
        expr: |
          (
            node_filesystem_size_bytes{mountpoint="/"} - 
            node_filesystem_free_bytes{mountpoint="/"}
          ) / node_filesystem_size_bytes{mountpoint="/"} > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High disk usage on {{ $labels.instance }}"
          description: "Disk usage is {{ $value | humanizePercentage }}"
```

## Log Management

### Structured Logging

```typescript
// logger.service.ts
import { Injectable } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            service: 'bytebot-api',
            version: process.env.APP_VERSION || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            correlationId: meta.correlationId || 'unknown',
            userId: meta.userId || null,
            ...meta
          });
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: '/var/log/bytebot/error.log', level: 'error' }),
        new winston.transports.File({ filename: '/var/log/bytebot/app.log' })
      ]
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  error(message: string, error?: Error, meta?: any): void {
    this.logger.error(message, { error: error?.stack, ...meta });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
}
```

### Log Correlation

```typescript
// correlation.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    req['correlationId'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}

// Usage in controller
@Controller('tasks')
export class TasksController {
  constructor(private logger: LoggerService) {}

  @Post()
  async createTask(@Body() dto: CreateTaskDto, @Req() req: Request) {
    this.logger.info('Creating new task', {
      correlationId: req['correlationId'],
      userId: req.user?.id,
      taskType: dto.type
    });
    
    try {
      const task = await this.tasksService.create(dto);
      
      this.logger.info('Task created successfully', {
        correlationId: req['correlationId'],
        taskId: task.id,
        userId: req.user?.id
      });
      
      return task;
    } catch (error) {
      this.logger.error('Task creation failed', error, {
        correlationId: req['correlationId'],
        userId: req.user?.id,
        taskType: dto.type
      });
      throw error;
    }
  }
}
```

### Log Aggregation Configuration

#### ELK Stack Configuration

```yaml
# filebeat.yml
filebeat.inputs:
- type: container
  paths:
    - '/var/log/containers/bytebot-*.log'
  processors:
  - add_kubernetes_metadata:
      host: ${NODE_NAME}
      matchers:
      - logs_path:
          logs_path: "/var/log/containers/"
  - decode_json_fields:
      fields: ["message"]
      target: ""
      overwrite_keys: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "bytebot-logs-%{+yyyy.MM.dd}"
  
setup.template.settings:
  index.number_of_shards: 1
  index.codec: best_compression

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0600
```

#### Loki Configuration (Alternative)

```yaml
# promtail.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_controller_name]
        regex: ([0-9a-z-.]+?)(-[0-9a-f]{8,10})?
        action: replace
        target_label: __tmp_controller_name
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: bytebot.*
      - source_labels: [__meta_kubernetes_pod_container_name]
        action: replace
        target_label: container_name
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: pod_name
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: namespace
      - replacement: /var/log/pods/*$1/*.log
        separator: /
        source_labels: [__meta_kubernetes_pod_uid, __meta_kubernetes_pod_container_name]
        target_label: __path__

pipeline_stages:
  - json:
      expressions:
        timestamp: timestamp
        level: level
        message: message
        correlationId: correlationId
        userId: userId
  - timestamp:
      source: timestamp
      format: RFC3339Nano
  - labels:
      level:
      correlationId:
      userId:
```

## Distributed Tracing

### OpenTelemetry Integration

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const jaegerExporter = new JaegerExporter({
  endpoint: 'http://jaeger-collector:14268/api/traces',
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'bytebot-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  traceExporter: jaegerExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

sdk.start();

export default sdk;
```

### Custom Spans

```typescript
// tracing.service.ts
import { Injectable } from '@nestjs/common';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

@Injectable()
export class TracingService {
  private tracer = trace.getTracer('bytebot-api', '1.0.0');

  async traceOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    attributes?: Record<string, string | number>
  ): Promise<T> {
    const span = this.tracer.startSpan(operationName);
    
    if (attributes) {
      span.setAttributes(attributes);
    }

    try {
      const result = await context.with(trace.setSpan(context.active(), span), operation);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}

// Usage in service
@Injectable()
export class TasksService {
  constructor(private tracing: TracingService) {}

  async processTask(taskId: string): Promise<TaskResult> {
    return this.tracing.traceOperation(
      'task.process',
      async () => {
        const task = await this.findById(taskId);
        const result = await this.executeTask(task);
        await this.updateTaskStatus(taskId, 'completed');
        return result;
      },
      {
        'task.id': taskId,
        'task.type': 'automation',
        'user.id': 'user123'
      }
    );
  }
}
```

## Performance Monitoring

### Application Performance Monitoring (APM)

Key performance metrics to monitor:

1. **Response Time Metrics**
   - Average response time
   - 95th and 99th percentile response times
   - Response time distribution by endpoint

2. **Throughput Metrics**
   - Requests per second
   - Tasks processed per minute
   - Concurrent user sessions

3. **Resource Utilization**
   - CPU usage per service
   - Memory consumption patterns
   - Database connection pool utilization

4. **Business Logic Performance**
   - Task execution duration
   - Computer operation latency
   - OCR processing speed

### Performance Baselines

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| API Response Time (95th percentile) | < 200ms | > 2000ms |
| Task Processing Time | < 5s | > 30s |
| Computer Operation Latency | < 100ms | > 500ms |
| Database Query Time | < 50ms | > 200ms |
| Memory Usage | < 80% | > 90% |
| CPU Usage | < 70% | > 85% |
| Error Rate | < 1% | > 5% |

### Performance Profiling

```typescript
// performance.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(private metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const endpoint = `${request.method} ${request.route?.path}`;

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - startTime;
        const statusCode = context.switchToHttp().getResponse().statusCode;

        // Record response time
        this.metrics.recordApiResponseTime(endpoint, duration);
        
        // Record request count
        this.metrics.incrementApiRequestCount(endpoint, statusCode);

        // Log slow requests
        if (duration > 1000) {
          console.warn(`Slow request detected: ${endpoint} took ${duration}ms`);
        }
      })
    );
  }
}
```

## Alerting and Notifications

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@bytebot.com'
  smtp_auth_username: 'alerts@bytebot.com'
  smtp_auth_password: 'app_password'

templates:
  - '/etc/alertmanager/templates/*.tmpl'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default-receiver'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 5s
      repeat_interval: 5m
    - match:
        severity: warning
      receiver: 'warning-alerts'
      group_wait: 30s
      repeat_interval: 30m

receivers:
  - name: 'default-receiver'
    email_configs:
      - to: 'ops-team@bytebot.com'
        subject: '[Bytebot] {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Runbook: {{ .Annotations.runbook_url }}
          Labels: {{ range .Labels.SortedPairs }}{{ .Name }}={{ .Value }} {{ end }}
          {{ end }}

  - name: 'critical-alerts'
    email_configs:
      - to: 'critical-alerts@bytebot.com'
        subject: '[CRITICAL] Bytebot Alert'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#critical-alerts'
        title: 'Critical Alert: {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        text: |
          {{ range .Alerts }}
          *Alert*: {{ .Annotations.summary }}
          *Description*: {{ .Annotations.description }}
          *Runbook*: <{{ .Annotations.runbook_url }}|View Runbook>
          *Labels*: {{ range .Labels.SortedPairs }}`{{ .Name }}`={{ .Value }} {{ end }}
          {{ end }}

  - name: 'warning-alerts'
    email_configs:
      - to: 'ops-team@bytebot.com'
        subject: '[WARNING] Bytebot Alert'
```

### Notification Channels

1. **Email Notifications**
   - Critical alerts: Immediate notification
   - Warning alerts: Digest every 30 minutes
   - Recovery notifications: When alerts resolve

2. **Slack Integration**
   - Real-time critical alerts
   - Alert escalation tracking
   - Runbook links for quick resolution

3. **PagerDuty Integration** (Optional)
   - On-call rotation management
   - Alert escalation policies
   - Incident response coordination

4. **SMS/Phone Alerts** (Critical Only)
   - Service downtime
   - Data loss incidents
   - Security breaches

## Monitoring Best Practices

### Development Guidelines

1. **Metrics Naming**: Use consistent naming conventions
   - Prefix: `bytebot_`
   - Use underscores, not hyphens
   - Include units in metric names when applicable

2. **Label Usage**: Be strategic with labels
   - Keep cardinality low (< 1000 per metric)
   - Use meaningful label values
   - Avoid user-specific labels in high-volume metrics

3. **Dashboard Design**: Create focused dashboards
   - One dashboard per service/team
   - Include SLI/SLO tracking
   - Use consistent time ranges and templates

4. **Alert Design**: Follow alert best practices
   - Alert on symptoms, not causes
   - Include runbook links
   - Set appropriate thresholds and timeouts
   - Test alert notifications regularly

### Operational Guidelines

1. **Regular Reviews**: Schedule monitoring health checks
   - Weekly dashboard review
   - Monthly alert effectiveness review
   - Quarterly SLO assessment

2. **Capacity Planning**: Use metrics for growth planning
   - Monitor trends and seasonal patterns
   - Plan infrastructure scaling
   - Optimize resource allocation

3. **Incident Response**: Use monitoring during incidents
   - Create incident-specific dashboards
   - Export metrics for post-incident analysis
   - Update runbooks based on lessons learned

---

**Last Updated**: September 6, 2025  
**Version**: 1.0.0  
**Next Review**: December 6, 2025