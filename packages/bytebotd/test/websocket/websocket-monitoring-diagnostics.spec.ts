/**
 * WebSocket Real-time Monitoring and Diagnostics Suite
 *
 * Comprehensive monitoring and diagnostic testing framework for WebSocket
 * infrastructure providing real-time insights into connection health,
 * performance metrics, and system behavior analysis.
 *
 * Monitoring Features:
 * - Real-time connection health monitoring
 * - Performance metrics collection and analysis
 * - Diagnostic reporting and alerting
 * - System behavior pattern analysis
 * - Resource utilization tracking
 * - Error detection and classification
 * - Connection lifecycle analytics
 *
 * Diagnostic Capabilities:
 * - Connection latency profiling
 * - Message throughput analysis
 * - Memory usage pattern detection
 * - CPU utilization monitoring
 * - Network performance assessment
 * - Error rate and recovery metrics
 * - System stability indicators
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

import {
  ConversationalWebSocketBridgeService,
  ConversationalMessage,
  ConversationalMessageType,
} from '../../src/common/websocket/conversational-websocket-bridge.service';
import { ParlantWebSocketIntegrationService } from '../../src/common/websocket/parlant-websocket-integration.service';

// ===== MONITORING FRAMEWORK =====

/**
 * Real-time performance metrics collector
 */
interface PerformanceMetrics {
  timestamp: number;
  connections: {
    active: number;
    total: number;
    failed: number;
    reconnections: number;
  };
  messages: {
    sent: number;
    received: number;
    queued: number;
    lost: number;
    rate: number; // messages per second
  };
  latency: {
    current: number;
    average: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  resources: {
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    cpu: {
      user: number;
      system: number;
      total: number;
    };
  };
  errors: {
    total: number;
    rate: number; // errors per minute
    categories: Record<string, number>;
  };
  health: {
    score: number; // 0-100
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
  };
}

/**
 * Diagnostic event types for analysis
 */
interface DiagnosticEvent {
  id: string;
  timestamp: number;
  type: 'connection' | 'message' | 'error' | 'performance' | 'resource';
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  data: Record<string, unknown>;
  metadata: {
    sessionId?: string;
    clientId?: string;
    operationId?: string;
    correlationId?: string;
  };
}

/**
 * Advanced monitoring client with telemetry
 */
class MonitoringWebSocketClient extends EventEmitter {
  private ws: WebSocket.WebSocket | null = null;
  private connected = false;
  private metrics: {
    connectionTime: number;
    messagesSent: number;
    messagesReceived: number;
    errors: number;
    latencies: number[];
    lastHeartbeat: number;
    connectionAttempts: number;
  };
  private diagnosticEvents: DiagnosticEvent[] = [];

  constructor(
    private url: string,
    private clientId: string,
    private enableDiagnostics = true,
  ) {
    super();
    this.metrics = {
      connectionTime: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      latencies: [],
      lastHeartbeat: 0,
      connectionAttempts: 0,
    };
  }

  async connect(): Promise<void> {
    const connectionStart = performance.now();
    this.metrics.connectionAttempts++;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket.WebSocket(this.url, {
          headers: {
            'User-Agent': 'Monitoring-Client/1.0',
            'X-Client-ID': this.clientId,
            'X-Enable-Diagnostics': this.enableDiagnostics.toString(),
          },
        });

        this.ws.on('open', () => {
          this.connected = true;
          this.metrics.connectionTime = performance.now() - connectionStart;

          this.logDiagnosticEvent({
            type: 'connection',
            severity: 'info',
            source: 'client',
            data: {
              action: 'connected',
              connectionTime: this.metrics.connectionTime,
              attempt: this.metrics.connectionAttempts,
            },
          });

          this.emit('connected', {
            clientId: this.clientId,
            connectionTime: this.metrics.connectionTime,
          });
          resolve();
        });

        this.ws.on('message', (data: WebSocket.RawData) => {
          this.handleMonitoringMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          this.metrics.errors++;
          this.logDiagnosticEvent({
            type: 'error',
            severity: 'error',
            source: 'client',
            data: {
              error: error.message,
              stack: error.stack,
              connected: this.connected,
            },
          });

          this.emit('error', { clientId: this.clientId, error });
          if (!this.connected) {
            reject(error);
          }
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          this.connected = false;
          this.logDiagnosticEvent({
            type: 'connection',
            severity: 'info',
            source: 'client',
            data: {
              action: 'disconnected',
              code,
              reason: reason.toString(),
              metrics: this.getMetricsSummary(),
            },
          });

          this.emit('disconnected', {
            clientId: this.clientId,
            code,
            reason: reason.toString(),
          });
        });

        this.ws.on('ping', () => {
          this.metrics.lastHeartbeat = Date.now();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMonitoringMessage(data: WebSocket.RawData): void {
    const messageStart = performance.now();

    try {
      const rawMessage = Buffer.from(data as ArrayBuffer).toString('utf8');
      const message = JSON.parse(rawMessage) as ConversationalMessage;

      this.metrics.messagesReceived++;
      const latency = performance.now() - messageStart;
      this.metrics.latencies.push(latency);

      // Keep only last 1000 latency measurements
      if (this.metrics.latencies.length > 1000) {
        this.metrics.latencies = this.metrics.latencies.slice(-1000);
      }

      this.logDiagnosticEvent({
        type: 'message',
        severity: 'info',
        source: 'client',
        data: {
          action: 'received',
          messageType: message.type,
          latency,
          messageId: message.messageId,
          sequence: message.sequence,
        },
        metadata: {
          sessionId: message.sessionId,
          operationId: message.messageId,
        },
      });

      // Monitor specific message types
      if (message.type === ConversationalMessageType.HEARTBEAT) {
        this.metrics.lastHeartbeat = Date.now();
      }

      this.emit('messageReceived', {
        clientId: this.clientId,
        message,
        latency,
        totalReceived: this.metrics.messagesReceived,
      });
    } catch (error) {
      this.metrics.errors++;
      this.logDiagnosticEvent({
        type: 'error',
        severity: 'error',
        source: 'client',
        data: {
          action: 'message_parse_failed',
          error: error instanceof Error ? error.message : String(error),
          rawDataLength: Buffer.from(data as ArrayBuffer).length,
        },
      });
    }
  }

  async sendMonitoringMessage(
    type: ConversationalMessageType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!this.connected || !this.ws) {
      throw new Error(`Client ${this.clientId} not connected`);
    }

    const message: ConversationalMessage = {
      type,
      messageId: `monitor_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      sessionId: `monitor_session_${this.clientId}`,
      timestamp: Date.now(),
      sequence: this.metrics.messagesSent + 1,
      payload,
      metadata: {
        priority: 'normal',
        requiresAck: false,
        compression: false,
        routingHints: ['monitoring'],
      },
    };

    const sendStart = performance.now();

    return new Promise((resolve, reject) => {
      const serialized = JSON.stringify(message);

      this.ws!.send(serialized, (error) => {
        if (error) {
          this.metrics.errors++;
          this.logDiagnosticEvent({
            type: 'error',
            severity: 'error',
            source: 'client',
            data: {
              action: 'send_failed',
              error: error.message,
              messageType: type,
            },
          });
          reject(error);
        } else {
          this.metrics.messagesSent++;
          const sendTime = performance.now() - sendStart;

          this.logDiagnosticEvent({
            type: 'message',
            severity: 'info',
            source: 'client',
            data: {
              action: 'sent',
              messageType: type,
              sendTime,
              messageId: message.messageId,
            },
          });

          resolve();
        }
      });
    });
  }

  private logDiagnosticEvent(
    event: Omit<DiagnosticEvent, 'id' | 'timestamp' | 'metadata'> & {
      metadata?: Partial<DiagnosticEvent['metadata']>;
    },
  ): void {
    if (!this.enableDiagnostics) return;

    const diagnosticEvent: DiagnosticEvent = {
      id: `diag_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
      metadata: {
        clientId: this.clientId,
        ...event.metadata,
      },
      ...event,
    };

    this.diagnosticEvents.push(diagnosticEvent);

    // Keep only last 10000 events
    if (this.diagnosticEvents.length > 10000) {
      this.diagnosticEvents = this.diagnosticEvents.slice(-10000);
    }

    this.emit('diagnosticEvent', diagnosticEvent);
  }

  getMetricsSummary(): {
    connectionTime: number;
    messagesSent: number;
    messagesReceived: number;
    errors: number;
    averageLatency: number;
    latencyP95: number;
    lastHeartbeat: number;
  } {
    const sortedLatencies = [...this.metrics.latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);

    return {
      connectionTime: this.metrics.connectionTime,
      messagesSent: this.metrics.messagesSent,
      messagesReceived: this.metrics.messagesReceived,
      errors: this.metrics.errors,
      averageLatency:
        this.metrics.latencies.length > 0
          ? this.metrics.latencies.reduce((sum, lat) => sum + lat, 0) /
            this.metrics.latencies.length
          : 0,
      latencyP95: sortedLatencies[p95Index] || 0,
      lastHeartbeat: this.metrics.lastHeartbeat,
    };
  }

  getDiagnosticEvents(): DiagnosticEvent[] {
    return [...this.diagnosticEvents];
  }

  async disconnect(): Promise<void> {
    if (this.ws && this.connected) {
      return new Promise((resolve) => {
        this.ws!.close(1000, 'Monitoring completed');
        this.ws!.on('close', () => {
          this.connected = false;
          resolve();
        });
      });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Real-time system monitor for WebSocket infrastructure
 */
class WebSocketSystemMonitor extends EventEmitter {
  private clients: Map<string, MonitoringWebSocketClient> = new Map();
  private metricsHistory: PerformanceMetrics[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertThresholds = {
    latencyMs: 100,
    errorRatePercent: 5,
    memoryMB: 500,
    connectionFailurePercent: 10,
  };

  constructor(private baseUrl: string) {
    super();
  }

  async startMonitoring(clientCount = 10, intervalMs = 1000): Promise<void> {
    // Create monitoring clients
    for (let i = 0; i < clientCount; i++) {
      const clientId = `monitor_${i.toString().padStart(3, '0')}`;
      const client = new MonitoringWebSocketClient(
        this.baseUrl,
        clientId,
        true,
      );

      client.on('diagnosticEvent', (event: DiagnosticEvent) => {
        this.emit('diagnosticEvent', event);
      });

      this.clients.set(clientId, client);
      await client.connect();
    }

    // Start periodic metrics collection
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    this.emit('monitoringStarted', {
      clients: clientCount,
      interval: intervalMs,
    });
  }

  private collectMetrics(): void {
    const timestamp = Date.now();
    const allClients = Array.from(this.clients.values());
    const connectedClients = allClients.filter((client) =>
      client.isConnected(),
    );

    // Collect client metrics
    const clientMetrics = allClients.map((client) =>
      client.getMetricsSummary(),
    );

    // Calculate aggregate latency statistics
    const allLatencies = clientMetrics
      .flatMap((m) => [m.averageLatency])
      .filter((lat) => lat > 0);
    allLatencies.sort((a, b) => a - b);

    const p50Index = Math.floor(allLatencies.length * 0.5);
    const p95Index = Math.floor(allLatencies.length * 0.95);
    const p99Index = Math.floor(allLatencies.length * 0.99);

    // Collect system resources
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Calculate health score
    const healthMetrics = this.calculateHealthScore(
      clientMetrics,
      allLatencies,
    );

    const metrics: PerformanceMetrics = {
      timestamp,
      connections: {
        active: connectedClients.length,
        total: allClients.length,
        failed: allClients.length - connectedClients.length,
        reconnections: 0, // Would need to track this separately
      },
      messages: {
        sent: clientMetrics.reduce((sum, m) => sum + m.messagesSent, 0),
        received: clientMetrics.reduce((sum, m) => sum + m.messagesReceived, 0),
        queued: 0, // Would need server-side metric
        lost: 0, // Calculate from sent - received
        rate: this.calculateMessageRate(),
      },
      latency: {
        current: allLatencies[allLatencies.length - 1] || 0,
        average:
          allLatencies.length > 0
            ? allLatencies.reduce((sum, lat) => sum + lat, 0) /
              allLatencies.length
            : 0,
        p50: allLatencies[p50Index] || 0,
        p95: allLatencies[p95Index] || 0,
        p99: allLatencies[p99Index] || 0,
        max: Math.max(...allLatencies) || 0,
      },
      resources: {
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
          total: cpuUsage.user + cpuUsage.system,
        },
      },
      errors: {
        total: clientMetrics.reduce((sum, m) => sum + m.errors, 0),
        rate: this.calculateErrorRate(),
        categories: this.categorizeErrors(),
      },
      health: healthMetrics,
    };

    // Store metrics
    this.metricsHistory.push(metrics);

    // Keep only last hour of metrics (assuming 1-second intervals)
    if (this.metricsHistory.length > 3600) {
      this.metricsHistory = this.metricsHistory.slice(-3600);
    }

    // Check for alerts
    this.checkAlerts(metrics);

    this.emit('metricsCollected', metrics);
  }

  private calculateHealthScore(
    clientMetrics: any[],
    latencies: number[],
  ): PerformanceMetrics['health'] {
    let score = 100;
    const issues: string[] = [];

    // Latency check
    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
        : 0;

    if (avgLatency > this.alertThresholds.latencyMs) {
      const penalty = Math.min(
        30,
        (avgLatency - this.alertThresholds.latencyMs) / 10,
      );
      score -= penalty;
      issues.push(`High latency: ${avgLatency.toFixed(2)}ms`);
    }

    // Error rate check
    const totalErrors = clientMetrics.reduce((sum, m) => sum + m.errors, 0);
    const totalMessages = clientMetrics.reduce(
      (sum, m) => sum + m.messagesSent + m.messagesReceived,
      0,
    );
    const errorRate =
      totalMessages > 0 ? (totalErrors / totalMessages) * 100 : 0;

    if (errorRate > this.alertThresholds.errorRatePercent) {
      score -= Math.min(40, errorRate * 2);
      issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
    }

    // Memory check
    const memoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
    if (memoryMB > this.alertThresholds.memoryMB) {
      score -= Math.min(20, (memoryMB - this.alertThresholds.memoryMB) / 50);
      issues.push(`High memory usage: ${memoryMB.toFixed(2)}MB`);
    }

    // Connection failure check
    const connectedCount = clientMetrics.filter(
      (m) => m.messagesSent > 0 || m.messagesReceived > 0,
    ).length;
    const connectionFailureRate =
      ((clientMetrics.length - connectedCount) / clientMetrics.length) * 100;

    if (connectionFailureRate > this.alertThresholds.connectionFailurePercent) {
      score -= Math.min(30, connectionFailureRate);
      issues.push(
        `High connection failure rate: ${connectionFailureRate.toFixed(2)}%`,
      );
    }

    score = Math.max(0, Math.min(100, score));

    const status: PerformanceMetrics['health']['status'] =
      score >= 80 ? 'healthy' : score >= 60 ? 'degraded' : 'critical';

    return { score, status, issues };
  }

  private calculateMessageRate(): number {
    if (this.metricsHistory.length < 2) return 0;

    const recent = this.metricsHistory[this.metricsHistory.length - 1];
    const previous = this.metricsHistory[this.metricsHistory.length - 2];

    const timeDiff = (recent.timestamp - previous.timestamp) / 1000;
    const messageDiff =
      recent.messages.sent +
      recent.messages.received -
      (previous.messages.sent + previous.messages.received);

    return timeDiff > 0 ? messageDiff / timeDiff : 0;
  }

  private calculateErrorRate(): number {
    if (this.metricsHistory.length < 10) return 0;

    const recentMetrics = this.metricsHistory.slice(-10);
    const totalErrors = recentMetrics.reduce(
      (sum, m) => sum + m.errors.total,
      0,
    );
    const timeSpan =
      (recentMetrics[recentMetrics.length - 1].timestamp -
        recentMetrics[0].timestamp) /
      1000 /
      60;

    return timeSpan > 0 ? totalErrors / timeSpan : 0;
  }

  private categorizeErrors(): Record<string, number> {
    const categories: Record<string, number> = {
      connection: 0,
      message: 0,
      performance: 0,
      resource: 0,
      other: 0,
    };

    // This would need actual error categorization logic
    // For now, return empty categories
    return categories;
  }

  private checkAlerts(metrics: PerformanceMetrics): void {
    if (metrics.health.status === 'critical') {
      this.emit('alert', {
        level: 'critical',
        message: 'System health is critical',
        metrics: metrics.health,
        timestamp: metrics.timestamp,
      });
    }

    if (metrics.latency.p95 > this.alertThresholds.latencyMs) {
      this.emit('alert', {
        level: 'warning',
        message: `High P95 latency: ${metrics.latency.p95.toFixed(2)}ms`,
        metrics: { latency: metrics.latency },
        timestamp: metrics.timestamp,
      });
    }

    if (metrics.errors.rate > this.alertThresholds.errorRatePercent) {
      this.emit('alert', {
        level: 'warning',
        message: `High error rate: ${metrics.errors.rate.toFixed(2)} errors/min`,
        metrics: { errors: metrics.errors },
        timestamp: metrics.timestamp,
      });
    }
  }

  async generateDiagnosticReport(): Promise<string> {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: this.getSystemSummary(),
      metrics: this.metricsHistory.slice(-100), // Last 100 data points
      alerts: this.getRecentAlerts(),
      clients: this.getClientDiagnostics(),
    };

    const reportPath = path.join(
      process.cwd(),
      'development',
      'reports',
      `websocket-diagnostic-${Date.now()}.json`,
    );

    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    return reportPath;
  }

  private getSystemSummary() {
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    if (!latestMetrics) return null;

    return {
      health: latestMetrics.health,
      performance: {
        latency: latestMetrics.latency,
        throughput: latestMetrics.messages.rate,
        connections: latestMetrics.connections,
      },
      resources: latestMetrics.resources,
      uptime: process.uptime(),
    };
  }

  private getRecentAlerts() {
    // Would need to store alerts separately
    return [];
  }

  private getClientDiagnostics() {
    return Array.from(this.clients.values()).map((client) => ({
      clientId: client['clientId'],
      connected: client.isConnected(),
      metrics: client.getMetricsSummary(),
      diagnosticEvents: client.getDiagnosticEvents().slice(-10), // Last 10 events
    }));
  }

  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    const disconnectPromises = Array.from(this.clients.values())
      .filter((client) => client.isConnected())
      .map((client) => client.disconnect());

    await Promise.allSettled(disconnectPromises);
    this.clients.clear();

    this.emit('monitoringStopped');
  }
}

// ===== MOCK CONFIGURATION =====

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: unknown) => {
    const config: Record<string, unknown> = {
      CONVERSATIONAL_WEBSOCKET_PORT: 8081,
      PARLANT_WEBSOCKET_PORT: 8080,
      CONVERSATIONAL_ALLOWED_ORIGINS: 'http://localhost:3000',
      PARLANT_ALLOWED_ORIGINS: 'http://localhost:3000',
      CONVERSATIONAL_REQUIRE_HTTPS: false,
      PARLANT_REQUIRE_HTTPS: false,
    };
    return config[key] ?? defaultValue;
  }),
};

// ===== MONITORING TEST SUITE =====

describe('WebSocket Monitoring and Diagnostics Suite', () => {
  let conversationalService: ConversationalWebSocketBridgeService;
  let integrationService: ParlantWebSocketIntegrationService;
  let module: TestingModule;
  let systemMonitor: WebSocketSystemMonitor;

  const TEST_PORT = 8081;
  const TEST_URL = `ws://localhost:${TEST_PORT}`;

  beforeAll(async () => {
    jest.setTimeout(120000); // 2 minutes for monitoring tests

    module = await Test.createTestingModule({
      providers: [
        ConversationalWebSocketBridgeService,
        ParlantWebSocketIntegrationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    conversationalService = module.get<ConversationalWebSocketBridgeService>(
      ConversationalWebSocketBridgeService,
    );
    integrationService = module.get<ParlantWebSocketIntegrationService>(
      ParlantWebSocketIntegrationService,
    );

    await integrationService.onModuleInit();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    systemMonitor = new WebSocketSystemMonitor(TEST_URL);
  });

  afterAll(async () => {
    if (systemMonitor) {
      await systemMonitor.stopMonitoring();
    }

    await integrationService.onApplicationShutdown();
    await conversationalService.onApplicationShutdown();
    await module.close();
  });

  describe('Real-time Monitoring', () => {
    it('should collect comprehensive performance metrics', async () => {
      let metricsCollected = 0;
      const collectedMetrics: PerformanceMetrics[] = [];

      systemMonitor.on('metricsCollected', (metrics: PerformanceMetrics) => {
        metricsCollected++;
        collectedMetrics.push(metrics);
      });

      await systemMonitor.startMonitoring(5, 1000); // 5 clients, 1-second intervals

      // Wait for several metrics collections
      await new Promise((resolve) => setTimeout(resolve, 5000));

      expect(metricsCollected).toBeGreaterThan(3);
      expect(collectedMetrics.length).toBeGreaterThan(3);

      // Verify metrics structure
      const latestMetrics = collectedMetrics[collectedMetrics.length - 1];
      expect(latestMetrics).toHaveProperty('timestamp');
      expect(latestMetrics).toHaveProperty('connections');
      expect(latestMetrics).toHaveProperty('messages');
      expect(latestMetrics).toHaveProperty('latency');
      expect(latestMetrics).toHaveProperty('resources');
      expect(latestMetrics).toHaveProperty('errors');
      expect(latestMetrics).toHaveProperty('health');

      // Verify health score calculation
      expect(latestMetrics.health.score).toBeGreaterThanOrEqual(0);
      expect(latestMetrics.health.score).toBeLessThanOrEqual(100);
      expect(['healthy', 'degraded', 'critical']).toContain(
        latestMetrics.health.status,
      );

      console.log('Real-time Monitoring Results:', {
        metricsCollected,
        latestHealth: {
          score: latestMetrics.health.score,
          status: latestMetrics.health.status,
          issues: latestMetrics.health.issues,
        },
        performance: {
          connections: latestMetrics.connections.active,
          averageLatency: `${latestMetrics.latency.average.toFixed(2)}ms`,
          messageRate: `${latestMetrics.messages.rate.toFixed(2)} msg/sec`,
        },
      });
    });

    it('should detect and report diagnostic events', async () => {
      const diagnosticEvents: DiagnosticEvent[] = [];

      systemMonitor.on('diagnosticEvent', (event: DiagnosticEvent) => {
        diagnosticEvents.push(event);
      });

      await systemMonitor.startMonitoring(3, 2000);

      // Generate some activity
      const testClients = Array.from(systemMonitor['clients'].values());
      for (const client of testClients) {
        await client.sendMonitoringMessage(
          ConversationalMessageType.HEARTBEAT,
          { test: true },
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));

      expect(diagnosticEvents.length).toBeGreaterThan(0);

      // Verify event structure
      const event = diagnosticEvents[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('severity');
      expect(event).toHaveProperty('source');
      expect(event).toHaveProperty('data');
      expect(event).toHaveProperty('metadata');

      console.log('Diagnostic Events Summary:', {
        totalEvents: diagnosticEvents.length,
        eventTypes: [...new Set(diagnosticEvents.map((e) => e.type))],
        severityLevels: [...new Set(diagnosticEvents.map((e) => e.severity))],
      });
    });

    it('should generate performance alerts when thresholds are exceeded', async () => {
      const alerts: any[] = [];

      systemMonitor.on('alert', (alert) => {
        alerts.push(alert);
      });

      // Set very low thresholds to trigger alerts
      systemMonitor['alertThresholds'] = {
        latencyMs: 1, // Very low to trigger
        errorRatePercent: 0.1,
        memoryMB: 10, // Very low to trigger
        connectionFailurePercent: 1,
      };

      await systemMonitor.startMonitoring(3, 1000);

      // Wait for potential alerts
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // We expect some alerts due to low thresholds
      expect(alerts.length).toBeGreaterThan(0);

      console.log('Alert System Results:', {
        alertsGenerated: alerts.length,
        alertLevels: [...new Set(alerts.map((a) => a.level))],
        sampleAlert: alerts[0],
      });
    });
  });

  describe('System Health Analytics', () => {
    it('should track connection health over time', async () => {
      await systemMonitor.startMonitoring(10, 500); // More frequent monitoring

      // Run for a period to collect data
      await new Promise((resolve) => setTimeout(resolve, 10000));

      const metricsHistory = systemMonitor.getMetricsHistory();

      expect(metricsHistory.length).toBeGreaterThan(15); // Should have many data points

      // Analyze connection stability
      const connectionCounts = metricsHistory.map((m) => m.connections.active);
      const connectionStability =
        connectionCounts.filter((count) => count > 0).length /
        connectionCounts.length;

      expect(connectionStability).toBeGreaterThan(0.8); // 80% stability

      // Analyze latency trends
      const latencies = metricsHistory
        .map((m) => m.latency.average)
        .filter((lat) => lat > 0);
      const averageLatency =
        latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

      expect(averageLatency).toBeLessThan(50); // Target <50ms

      console.log('Connection Health Analytics:', {
        dataPoints: metricsHistory.length,
        connectionStability: `${(connectionStability * 100).toFixed(1)}%`,
        averageLatency: `${averageLatency.toFixed(2)}ms`,
        latencyTrend: latencies.length > 10 ? 'tracked' : 'insufficient_data',
      });
    });

    it('should monitor resource utilization patterns', async () => {
      await systemMonitor.startMonitoring(8, 1000);

      const initialMemory = process.memoryUsage().heapUsed;

      // Run monitoring for a period
      await new Promise((resolve) => setTimeout(resolve, 8000));

      const metricsHistory = systemMonitor.getMetricsHistory();
      const memoryUsages = metricsHistory.map(
        (m) => m.resources.memory.heapUsed,
      );
      const cpuUsages = metricsHistory.map((m) => m.resources.cpu.total);

      // Analyze memory patterns
      const maxMemory = Math.max(...memoryUsages);
      const memoryGrowth = (maxMemory - initialMemory) / initialMemory;

      expect(memoryGrowth).toBeLessThan(2); // Less than 2x growth

      // Analyze CPU patterns
      const averageCpu =
        cpuUsages.reduce((sum, cpu) => sum + cpu, 0) / cpuUsages.length;

      console.log('Resource Utilization Analysis:', {
        memoryGrowth: `${(memoryGrowth * 100).toFixed(1)}%`,
        maxMemoryMB: `${(maxMemory / 1024 / 1024).toFixed(2)}MB`,
        averageCpuUsage: averageCpu,
        resourceSamples: metricsHistory.length,
      });
    });
  });

  describe('Diagnostic Reporting', () => {
    it('should generate comprehensive diagnostic reports', async () => {
      await systemMonitor.startMonitoring(5, 1000);

      // Run system for a period to collect data
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const reportPath = await systemMonitor.generateDiagnosticReport();

      expect(fs.existsSync(reportPath)).toBe(true);

      const reportContent = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

      expect(reportContent).toHaveProperty('timestamp');
      expect(reportContent).toHaveProperty('summary');
      expect(reportContent).toHaveProperty('metrics');
      expect(reportContent).toHaveProperty('clients');

      // Verify report structure
      expect(reportContent.summary).toHaveProperty('health');
      expect(reportContent.summary).toHaveProperty('performance');
      expect(reportContent.summary).toHaveProperty('resources');

      expect(Array.isArray(reportContent.metrics)).toBe(true);
      expect(Array.isArray(reportContent.clients)).toBe(true);

      console.log('Diagnostic Report Generated:', {
        reportPath,
        reportSize: `${fs.statSync(reportPath).size} bytes`,
        metricsIncluded: reportContent.metrics.length,
        clientsMonitored: reportContent.clients.length,
        systemHealth: reportContent.summary.health,
      });

      // Clean up report file
      fs.unlinkSync(reportPath);
    });
  });
});
