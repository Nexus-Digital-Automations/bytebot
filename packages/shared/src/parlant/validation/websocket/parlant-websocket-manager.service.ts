/**
 * PARLANT WebSocket Manager Service
 *
 * Manages multiple WebSocket connections, connection pools, load balancing,
 * and high-availability features for PARLANT validation communication.
 * Provides connection lifecycle management, failover capabilities, and
 * performance optimization across multiple PARLANT servers.
 *
 * Features:
 * - Connection pool management with load balancing
 * - Automatic failover and health monitoring
 * - Session affinity and sticky connections
 * - Performance monitoring and optimization
 * - Circuit breaker pattern for resilience
 * - Comprehensive logging and metrics
 *
 * @module ParlantWebSocketManager
 * @version 1.0.0
 * @author AIgent Integration Team
 */

import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { ParlantWebSocketClient } from './parlant-websocket-client.service';
import {
  ValidationRequest,
  ValidationResponse,
  ValidationLayerError,
} from '../types/validation-layer.types';

// ===== MANAGER CONFIGURATION =====

interface WebSocketManagerConfig {
  /** Server endpoints for load balancing */
  servers: ServerEndpoint[];
  /** Connection pool configuration */
  connectionPool: ConnectionPoolConfig;
  /** Load balancing strategy */
  loadBalancingStrategy: LoadBalancingStrategy;
  /** Health check configuration */
  healthCheck: HealthCheckConfig;
  /** Failover configuration */
  failover: FailoverConfig;
  /** Session affinity settings */
  sessionAffinity: SessionAffinityConfig;
}

interface ServerEndpoint {
  /** Server URL */
  url: string;
  /** Server priority (lower = higher priority) */
  priority: number;
  /** Maximum connections per server */
  maxConnections: number;
  /** Health check endpoint */
  healthEndpoint?: string;
  /** Server region for affinity */
  region?: string;
}

interface ConnectionPoolConfig {
  /** Minimum pool size */
  minSize: number;
  /** Maximum pool size */
  maxSize: number;
  /** Connection idle timeout */
  idleTimeout: number;
  /** Pool growth strategy */
  growthStrategy: 'eager' | 'lazy' | 'adaptive';
}

enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  WEIGHTED_RANDOM = 'weighted_random',
  HEALTH_BASED = 'health_based',
  GEOGRAPHIC = 'geographic',
}

interface HealthCheckConfig {
  /** Health check interval in milliseconds */
  interval: number;
  /** Health check timeout */
  timeout: number;
  /** Failure threshold before marking unhealthy */
  failureThreshold: number;
  /** Recovery threshold before marking healthy */
  recoveryThreshold: number;
}

interface FailoverConfig {
  /** Enable automatic failover */
  enabled: boolean;
  /** Failover timeout in milliseconds */
  timeout: number;
  /** Maximum failover attempts */
  maxAttempts: number;
  /** Failover strategy */
  strategy: FailoverStrategy;
}

enum FailoverStrategy {
  IMMEDIATE = 'immediate',
  GRACEFUL = 'graceful',
  CIRCUIT_BREAKER = 'circuit_breaker',
}

interface SessionAffinityConfig {
  /** Enable session affinity */
  enabled: boolean;
  /** Affinity strategy */
  strategy: AffinityStrategy;
  /** Session timeout */
  sessionTimeout: number;
}

enum AffinityStrategy {
  USER_ID = 'user_id',
  SESSION_ID = 'session_id',
  IP_HASH = 'ip_hash',
  NONE = 'none',
}

// ===== CONNECTION MANAGEMENT =====

interface ManagedConnection {
  /** Connection identifier */
  id: string;
  /** WebSocket client instance */
  client: ParlantWebSocketClient;
  /** Server endpoint */
  server: ServerEndpoint;
  /** Connection status */
  status: ConnectionStatus;
  /** Active requests count */
  activeRequests: number;
  /** Connection creation time */
  createdAt: Date;
  /** Last activity time */
  lastActivity: Date;
  /** Session context */
  sessionContext?: SessionContext;
  /** Performance metrics */
  metrics: ConnectionMetrics;
}

enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  IDLE = 'idle',
}

interface SessionContext {
  sessionId: string;
  userId: string;
  conversationId?: string;
  authToken: string;
  affinityKey?: string;
}

interface ConnectionMetrics {
  /** Total requests processed */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Average response time */
  averageResponseTime: number;
  /** Current throughput (requests/second) */
  throughput: number;
  /** Error rate percentage */
  errorRate: number;
  /** Last updated timestamp */
  lastUpdated: Date;
}

// ===== WEBSOCKET MANAGER SERVICE =====

@Injectable()
export class ParlantWebSocketManager extends EventEmitter implements OnApplicationShutdown {
  private readonly logger = new Logger(ParlantWebSocketManager.name);
  private config: WebSocketManagerConfig;
  private connectionPool = new Map<string, ManagedConnection>();
  private serverHealth = new Map<string, ServerHealth>();
  private sessionAffinity = new Map<string, string>();
  private loadBalancerState = { lastUsedIndex: 0 };
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private poolMaintenanceTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {
    super();
    this.initializeConfiguration();
  }

  /**
   * Initialize WebSocket manager configuration
   */
  private initializeConfiguration(): void {
    const servers = this.parseServerEndpoints();

    this.config = {
      servers,
      connectionPool: {
        minSize: this.configService.get<number>('PARLANT_POOL_MIN_SIZE') || 2,
        maxSize: this.configService.get<number>('PARLANT_POOL_MAX_SIZE') || 10,
        idleTimeout: this.configService.get<number>('PARLANT_POOL_IDLE_TIMEOUT') || 300000, // 5 minutes
        growthStrategy: (this.configService.get<string>('PARLANT_POOL_GROWTH') as 'eager' | 'lazy' | 'adaptive') || 'adaptive',
      },
      loadBalancingStrategy: (this.configService.get<string>('PARLANT_LOAD_BALANCE') as LoadBalancingStrategy) || LoadBalancingStrategy.LEAST_CONNECTIONS,
      healthCheck: {
        interval: this.configService.get<number>('PARLANT_HEALTH_CHECK_INTERVAL') || 30000,
        timeout: this.configService.get<number>('PARLANT_HEALTH_CHECK_TIMEOUT') || 5000,
        failureThreshold: this.configService.get<number>('PARLANT_HEALTH_FAILURE_THRESHOLD') || 3,
        recoveryThreshold: this.configService.get<number>('PARLANT_HEALTH_RECOVERY_THRESHOLD') || 2,
      },
      failover: {
        enabled: this.configService.get<boolean>('PARLANT_FAILOVER_ENABLED') !== false,
        timeout: this.configService.get<number>('PARLANT_FAILOVER_TIMEOUT') || 5000,
        maxAttempts: this.configService.get<number>('PARLANT_FAILOVER_MAX_ATTEMPTS') || 3,
        strategy: (this.configService.get<string>('PARLANT_FAILOVER_STRATEGY') as FailoverStrategy) || FailoverStrategy.GRACEFUL,
      },
      sessionAffinity: {
        enabled: this.configService.get<boolean>('PARLANT_SESSION_AFFINITY') || true,
        strategy: (this.configService.get<string>('PARLANT_AFFINITY_STRATEGY') as AffinityStrategy) || AffinityStrategy.SESSION_ID,
        sessionTimeout: this.configService.get<number>('PARLANT_SESSION_TIMEOUT') || 3600000, // 1 hour
      },
    };

    this.logger.log('WebSocket manager configuration initialized', {
      serverCount: this.config.servers.length,
      poolSize: `${this.config.connectionPool.minSize}-${this.config.connectionPool.maxSize}`,
      loadBalancing: this.config.loadBalancingStrategy,
    });
  }

  /**
   * Parse server endpoints from configuration
   */
  private parseServerEndpoints(): ServerEndpoint[] {
    const serverUrls = this.configService.get<string>('PARLANT_WEBSOCKET_SERVERS') ||
                      this.configService.get<string>('PARLANT_WEBSOCKET_URL') ||
                      'ws://localhost:8080/parlant';

    const urls = serverUrls.split(',').map(url => url.trim());

    return urls.map((url, index) => ({
      url,
      priority: index,
      maxConnections: this.configService.get<number>(`PARLANT_SERVER_${index}_MAX_CONN`) || 5,
      healthEndpoint: this.configService.get<string>(`PARLANT_SERVER_${index}_HEALTH`),
      region: this.configService.get<string>(`PARLANT_SERVER_${index}_REGION`),
    }));
  }

  /**
   * Initialize connection pool and health monitoring
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('WebSocket manager already initialized');
      return;
    }

    try {
      // Initialize server health tracking
      for (const server of this.config.servers) {
        this.serverHealth.set(server.url, {
          url: server.url,
          status: ServerHealthStatus.UNKNOWN,
          consecutiveFailures: 0,
          consecutiveSuccesses: 0,
          lastCheck: new Date(),
          responseTime: 0,
        });
      }

      // Start health monitoring
      this.startHealthMonitoring();

      // Start pool maintenance
      this.startPoolMaintenance();

      // Create initial connections based on strategy
      await this.initializeConnectionPool();

      this.isInitialized = true;
      this.logger.log('WebSocket manager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize WebSocket manager', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Initialize connection pool with minimum connections
   */
  private async initializeConnectionPool(): Promise<void> {
    const healthyServers = this.getHealthyServers();
    if (healthyServers.length === 0) {
      this.logger.warn('No healthy servers available for initial pool');
      return;
    }

    const connectionsPerServer = Math.ceil(this.config.connectionPool.minSize / healthyServers.length);

    const connectionPromises: Promise<void>[] = [];

    for (const server of healthyServers) {
      for (let i = 0; i < connectionsPerServer && this.connectionPool.size < this.config.connectionPool.minSize; i++) {
        connectionPromises.push(this.createConnection(server));
      }
    }

    try {
      await Promise.allSettled(connectionPromises);
      this.logger.log(`Initial connection pool created with ${this.connectionPool.size} connections`);
    } catch (error) {
      this.logger.error('Failed to create initial connection pool', { error: (error as Error).message });
    }
  }

  /**
   * Send validation request with automatic connection selection
   */
  async sendValidationRequest(request: ValidationRequest, sessionContext: SessionContext): Promise<ValidationResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    let connection: ManagedConnection | null = null;
    let attempts = 0;
    const maxAttempts = this.config.failover.maxAttempts;

    while (attempts < maxAttempts) {
      try {
        // Select connection based on strategy
        connection = await this.selectConnection(sessionContext);

        if (!connection) {
          throw new ValidationLayerError(
            'No available connections',
            'NO_AVAILABLE_CONNECTIONS'
          );
        }

        // Update request tracking
        connection.activeRequests++;
        connection.lastActivity = new Date();

        // Send request
        const startTime = performance.now();
        const response = await connection.client.sendValidationRequest(request);

        // Update metrics
        const responseTime = performance.now() - startTime;
        this.updateConnectionMetrics(connection, responseTime, true);

        return response;

      } catch (error) {
        attempts++;

        if (connection) {
          connection.activeRequests = Math.max(0, connection.activeRequests - 1);
          this.updateConnectionMetrics(connection, 0, false);

          // Mark connection as unhealthy if error is connection-related
          if (this.isConnectionError(error as Error)) {
            await this.handleConnectionError(connection, error as Error);
          }
        }

        if (attempts >= maxAttempts) {
          throw new ValidationLayerError(
            `Validation request failed after ${maxAttempts} attempts: ${(error as Error).message}`,
            'MAX_ATTEMPTS_EXCEEDED',
            { originalError: error, attempts }
          );
        }

        // Wait before retry
        await this.delay(Math.pow(2, attempts) * 1000);
      }
    }

    throw new ValidationLayerError(
      'Unexpected end of retry loop',
      'RETRY_LOOP_ERROR'
    );
  }

  /**
   * Select connection based on load balancing strategy
   */
  private async selectConnection(sessionContext: SessionContext): Promise<ManagedConnection | null> {
    // Check session affinity first
    if (this.config.sessionAffinity.enabled) {
      const affinityKey = this.getAffinityKey(sessionContext);
      const affinityConnectionId = this.sessionAffinity.get(affinityKey);

      if (affinityConnectionId) {
        const connection = this.connectionPool.get(affinityConnectionId);
        if (connection && connection.status === ConnectionStatus.CONNECTED) {
          return connection;
        } else {
          // Remove stale affinity mapping
          this.sessionAffinity.delete(affinityKey);
        }
      }
    }

    // Select connection based on load balancing strategy
    const availableConnections = Array.from(this.connectionPool.values())
      .filter(conn => conn.status === ConnectionStatus.CONNECTED);

    if (availableConnections.length === 0) {
      // Try to create new connection if pool is not at max
      if (this.connectionPool.size < this.config.connectionPool.maxSize) {
        const healthyServers = this.getHealthyServers();
        if (healthyServers.length > 0) {
          const server = this.selectServerForNewConnection(healthyServers);
          const connection = await this.createConnection(server, sessionContext);
          return connection;
        }
      }
      return null;
    }

    let selectedConnection: ManagedConnection;

    switch (this.config.loadBalancingStrategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        selectedConnection = this.selectRoundRobin(availableConnections);
        break;

      case LoadBalancingStrategy.LEAST_CONNECTIONS:
        selectedConnection = this.selectLeastConnections(availableConnections);
        break;

      case LoadBalancingStrategy.WEIGHTED_RANDOM:
        selectedConnection = this.selectWeightedRandom(availableConnections);
        break;

      case LoadBalancingStrategy.HEALTH_BASED:
        selectedConnection = this.selectHealthBased(availableConnections);
        break;

      case LoadBalancingStrategy.GEOGRAPHIC:
        selectedConnection = this.selectGeographic(availableConnections, sessionContext);
        break;

      default:
        selectedConnection = this.selectLeastConnections(availableConnections);
    }

    // Update session affinity
    if (this.config.sessionAffinity.enabled) {
      const affinityKey = this.getAffinityKey(sessionContext);
      this.sessionAffinity.set(affinityKey, selectedConnection.id);
    }

    return selectedConnection;
  }

  /**
   * Round robin connection selection
   */
  private selectRoundRobin(connections: ManagedConnection[]): ManagedConnection {
    const index = this.loadBalancerState.lastUsedIndex % connections.length;
    this.loadBalancerState.lastUsedIndex = (index + 1) % connections.length;
    return connections[index];
  }

  /**
   * Least connections selection
   */
  private selectLeastConnections(connections: ManagedConnection[]): ManagedConnection {
    return connections.reduce((least, current) =>
      current.activeRequests < least.activeRequests ? current : least
    );
  }

  /**
   * Weighted random selection based on server priority
   */
  private selectWeightedRandom(connections: ManagedConnection[]): ManagedConnection {
    const weights = connections.map(conn => 1 / (conn.server.priority + 1));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;

    let weightSum = 0;
    for (let i = 0; i < connections.length; i++) {
      weightSum += weights[i];
      if (random <= weightSum) {
        return connections[i];
      }
    }

    return connections[connections.length - 1];
  }

  /**
   * Health-based selection considering server health scores
   */
  private selectHealthBased(connections: ManagedConnection[]): ManagedConnection {
    return connections.reduce((best, current) => {
      const bestHealth = this.serverHealth.get(best.server.url);
      const currentHealth = this.serverHealth.get(current.server.url);

      if (!bestHealth || !currentHealth) return best;

      // Prefer connections with better health and lower load
      const bestScore = this.calculateHealthScore(bestHealth) - (best.activeRequests * 0.1);
      const currentScore = this.calculateHealthScore(currentHealth) - (current.activeRequests * 0.1);

      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Geographic selection based on server regions
   */
  private selectGeographic(connections: ManagedConnection[], sessionContext: SessionContext): ManagedConnection {
    // For now, fallback to least connections
    // Could be enhanced with IP geolocation or explicit region preferences
    return this.selectLeastConnections(connections);
  }

  /**
   * Calculate health score for a server
   */
  private calculateHealthScore(health: ServerHealth): number {
    if (health.status === ServerHealthStatus.HEALTHY) {
      return 1.0 - (health.responseTime / 10000); // Penalty for slow response
    } else if (health.status === ServerHealthStatus.DEGRADED) {
      return 0.5;
    } else {
      return 0.0;
    }
  }

  /**
   * Create new connection to specified server
   */
  private async createConnection(server: ServerEndpoint, sessionContext?: SessionContext): Promise<ManagedConnection> {
    const connectionId = this.generateConnectionId();
    const client = new ParlantWebSocketClient(this.configService);

    const connection: ManagedConnection = {
      id: connectionId,
      client,
      server,
      status: ConnectionStatus.CONNECTING,
      activeRequests: 0,
      createdAt: new Date(),
      lastActivity: new Date(),
      sessionContext,
      metrics: this.initializeConnectionMetrics(),
    };

    this.connectionPool.set(connectionId, connection);

    try {
      // Setup event handlers
      this.setupConnectionEventHandlers(connection);

      // Connect to server
      const connectSessionContext = sessionContext || {
        sessionId: `mgr_${connectionId}`,
        userId: 'system',
        authToken: this.configService.get<string>('PARLANT_AUTH_TOKEN') || '',
      };

      await client.connect(connectSessionContext);

      connection.status = ConnectionStatus.CONNECTED;
      connection.lastActivity = new Date();

      this.logger.debug('Connection created successfully', {
        connectionId,
        server: server.url,
        poolSize: this.connectionPool.size,
      });

      this.emit('connectionCreated', { connectionId, server });

      return connection;

    } catch (error) {
      connection.status = ConnectionStatus.ERROR;
      this.connectionPool.delete(connectionId);

      this.logger.error('Failed to create connection', {
        connectionId,
        server: server.url,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Setup event handlers for a connection
   */
  private setupConnectionEventHandlers(connection: ManagedConnection): void {
    const { client, id } = connection;

    client.on('connected', () => {
      connection.status = ConnectionStatus.CONNECTED;
      connection.lastActivity = new Date();
      this.logger.debug('Connection established', { connectionId: id });
    });

    client.on('disconnected', () => {
      connection.status = ConnectionStatus.DISCONNECTED;
      this.handleConnectionDisconnect(connection);
    });

    client.on('error', (error) => {
      this.handleConnectionError(connection, error);
    });

    client.on('statusUpdate', (status) => {
      this.emit('connectionStatusUpdate', { connectionId: id, status });
    });
  }

  /**
   * Handle connection disconnection
   */
  private handleConnectionDisconnect(connection: ManagedConnection): void {
    this.logger.warn('Connection disconnected', {
      connectionId: connection.id,
      server: connection.server.url,
    });

    connection.status = ConnectionStatus.DISCONNECTED;

    // Remove from affinity mappings
    this.removeFromAffinity(connection.id);

    // Schedule replacement if pool is below minimum
    if (this.getHealthyConnectionCount() < this.config.connectionPool.minSize) {
      this.scheduleConnectionReplacement(connection.server);
    }

    this.emit('connectionDisconnected', { connectionId: connection.id });
  }

  /**
   * Handle connection errors
   */
  private async handleConnectionError(connection: ManagedConnection, error: Error): Promise<void> {
    this.logger.error('Connection error', {
      connectionId: connection.id,
      server: connection.server.url,
      error: error.message,
    });

    connection.status = ConnectionStatus.ERROR;
    connection.activeRequests = 0;

    // Update server health
    const health = this.serverHealth.get(connection.server.url);
    if (health) {
      health.consecutiveFailures++;
      health.consecutiveSuccesses = 0;

      if (health.consecutiveFailures >= this.config.healthCheck.failureThreshold) {
        health.status = ServerHealthStatus.UNHEALTHY;
      }
    }

    // Remove connection from pool
    this.connectionPool.delete(connection.id);
    this.removeFromAffinity(connection.id);

    this.emit('connectionError', { connectionId: connection.id, error });
  }

  /**
   * Start health monitoring for all servers
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheck.interval);

    this.logger.debug('Health monitoring started', {
      interval: this.config.healthCheck.interval,
    });
  }

  /**
   * Perform health checks on all servers
   */
  private async performHealthChecks(): Promise<void> {
    const healthPromises = this.config.servers.map(server =>
      this.performServerHealthCheck(server)
    );

    await Promise.allSettled(healthPromises);
  }

  /**
   * Perform health check on a specific server
   */
  private async performServerHealthCheck(server: ServerEndpoint): Promise<void> {
    const health = this.serverHealth.get(server.url);
    if (!health) return;

    try {
      const startTime = performance.now();

      // Simple health check - attempt WebSocket connection
      await this.checkServerHealth(server);

      const responseTime = performance.now() - startTime;

      health.responseTime = responseTime;
      health.consecutiveSuccesses++;
      health.consecutiveFailures = 0;
      health.lastCheck = new Date();

      // Update status based on consecutive successes
      if (health.consecutiveSuccesses >= this.config.healthCheck.recoveryThreshold) {
        if (health.status !== ServerHealthStatus.HEALTHY) {
          health.status = ServerHealthStatus.HEALTHY;
          this.logger.log('Server recovered to healthy status', { server: server.url });
        }
      } else {
        health.status = ServerHealthStatus.DEGRADED;
      }

    } catch (error) {
      health.consecutiveFailures++;
      health.consecutiveSuccesses = 0;
      health.lastCheck = new Date();

      if (health.consecutiveFailures >= this.config.healthCheck.failureThreshold) {
        if (health.status !== ServerHealthStatus.UNHEALTHY) {
          health.status = ServerHealthStatus.UNHEALTHY;
          this.logger.warn('Server marked as unhealthy', {
            server: server.url,
            consecutiveFailures: health.consecutiveFailures,
          });
        }
      } else {
        health.status = ServerHealthStatus.DEGRADED;
      }
    }
  }

  /**
   * Check server health by attempting a quick connection
   */
  private async checkServerHealth(server: ServerEndpoint): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new (require('ws'))(server.url);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Health check timeout'));
      }, this.config.healthCheck.timeout);

      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      });

      ws.on('error', (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Start pool maintenance (cleanup idle connections, ensure minimum size)
   */
  private startPoolMaintenance(): void {
    this.poolMaintenanceTimer = setInterval(() => {
      this.performPoolMaintenance();
    }, 60000); // Every minute

    this.logger.debug('Pool maintenance started');
  }

  /**
   * Perform pool maintenance tasks
   */
  private performPoolMaintenance(): void {
    const now = Date.now();
    const idleConnections: string[] = [];

    // Identify idle connections
    for (const [id, connection] of this.connectionPool) {
      const idleTime = now - connection.lastActivity.getTime();

      if (idleTime > this.config.connectionPool.idleTimeout &&
          connection.activeRequests === 0 &&
          this.connectionPool.size > this.config.connectionPool.minSize) {
        idleConnections.push(id);
      }
    }

    // Remove idle connections
    for (const id of idleConnections) {
      this.removeConnection(id);
    }

    // Ensure minimum pool size
    const healthyCount = this.getHealthyConnectionCount();
    if (healthyCount < this.config.connectionPool.minSize) {
      const needed = this.config.connectionPool.minSize - healthyCount;
      this.createAdditionalConnections(needed);
    }

    // Clean up stale session affinity
    this.cleanupStaleAffinity();

    this.logger.debug('Pool maintenance completed', {
      removed: idleConnections.length,
      current: this.connectionPool.size,
      healthy: healthyCount,
    });
  }

  /**
   * Get healthy servers
   */
  private getHealthyServers(): ServerEndpoint[] {
    return this.config.servers.filter(server => {
      const health = this.serverHealth.get(server.url);
      return health && health.status !== ServerHealthStatus.UNHEALTHY;
    });
  }

  /**
   * Get count of healthy connections
   */
  private getHealthyConnectionCount(): number {
    return Array.from(this.connectionPool.values())
      .filter(conn => conn.status === ConnectionStatus.CONNECTED).length;
  }

  /**
   * Select server for new connection
   */
  private selectServerForNewConnection(servers: ServerEndpoint[]): ServerEndpoint {
    // Prefer servers with fewer existing connections
    const serverConnections = new Map<string, number>();

    for (const connection of this.connectionPool.values()) {
      const count = serverConnections.get(connection.server.url) || 0;
      serverConnections.set(connection.server.url, count + 1);
    }

    return servers.reduce((best, current) => {
      const bestCount = serverConnections.get(best.url) || 0;
      const currentCount = serverConnections.get(current.url) || 0;

      if (currentCount < currentCount) return current;
      if (currentCount > bestCount) return best;

      // If equal, prefer higher priority (lower number)
      return current.priority < best.priority ? current : best;
    });
  }

  /**
   * Create additional connections to meet minimum pool size
   */
  private async createAdditionalConnections(needed: number): Promise<void> {
    const healthyServers = this.getHealthyServers();
    if (healthyServers.length === 0) return;

    const promises: Promise<void>[] = [];

    for (let i = 0; i < needed && this.connectionPool.size < this.config.connectionPool.maxSize; i++) {
      const server = this.selectServerForNewConnection(healthyServers);
      promises.push(
        this.createConnection(server).catch(error => {
          this.logger.error('Failed to create additional connection', {
            server: server.url,
            error: error.message,
          });
        })
      );
    }

    await Promise.allSettled(promises);
  }

  /**
   * Schedule connection replacement for a failed server
   */
  private scheduleConnectionReplacement(failedServer: ServerEndpoint): void {
    setTimeout(async () => {
      const healthyServers = this.getHealthyServers().filter(s => s.url !== failedServer.url);
      if (healthyServers.length > 0) {
        const server = this.selectServerForNewConnection(healthyServers);
        try {
          await this.createConnection(server);
        } catch (error) {
          this.logger.error('Failed to create replacement connection', {
            failedServer: failedServer.url,
            replacementServer: server.url,
            error: (error as Error).message,
          });
        }
      }
    }, 5000); // Wait 5 seconds before replacement
  }

  /**
   * Remove connection from pool
   */
  private async removeConnection(connectionId: string): Promise<void> {
    const connection = this.connectionPool.get(connectionId);
    if (!connection) return;

    try {
      await connection.client.disconnect();
    } catch (error) {
      this.logger.error('Error disconnecting connection', {
        connectionId,
        error: (error as Error).message,
      });
    }

    this.connectionPool.delete(connectionId);
    this.removeFromAffinity(connectionId);

    this.logger.debug('Connection removed from pool', { connectionId });
  }

  /**
   * Remove connection from all affinity mappings
   */
  private removeFromAffinity(connectionId: string): void {
    for (const [key, value] of this.sessionAffinity) {
      if (value === connectionId) {
        this.sessionAffinity.delete(key);
      }
    }
  }

  /**
   * Clean up stale session affinity entries
   */
  private cleanupStaleAffinity(): void {
    const validConnectionIds = new Set(this.connectionPool.keys());

    for (const [key, connectionId] of this.sessionAffinity) {
      if (!validConnectionIds.has(connectionId)) {
        this.sessionAffinity.delete(key);
      }
    }
  }

  /**
   * Get affinity key for session context
   */
  private getAffinityKey(sessionContext: SessionContext): string {
    switch (this.config.sessionAffinity.strategy) {
      case AffinityStrategy.USER_ID:
        return `user:${sessionContext.userId}`;
      case AffinityStrategy.SESSION_ID:
        return `session:${sessionContext.sessionId}`;
      case AffinityStrategy.IP_HASH:
        // Would need IP from context
        return `session:${sessionContext.sessionId}`;
      default:
        return `session:${sessionContext.sessionId}`;
    }
  }

  /**
   * Initialize connection metrics
   */
  private initializeConnectionMetrics(): ConnectionMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      throughput: 0,
      errorRate: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Update connection metrics
   */
  private updateConnectionMetrics(connection: ManagedConnection, responseTime: number, success: boolean): void {
    const metrics = connection.metrics;

    metrics.totalRequests++;
    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    // Update average response time
    if (success && responseTime > 0) {
      const totalTime = metrics.averageResponseTime * (metrics.successfulRequests - 1) + responseTime;
      metrics.averageResponseTime = totalTime / metrics.successfulRequests;
    }

    // Update error rate
    metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;

    // Update throughput (requests per second over last minute)
    const timeWindow = 60000; // 1 minute
    const now = Date.now();
    const windowStart = now - timeWindow;

    // This is a simplified throughput calculation
    // In production, you'd want a more sophisticated sliding window
    if (now - metrics.lastUpdated.getTime() > timeWindow) {
      metrics.throughput = metrics.totalRequests / (timeWindow / 1000);
    }

    metrics.lastUpdated = new Date();

    connection.activeRequests = Math.max(0, connection.activeRequests - 1);
  }

  /**
   * Check if error is connection-related
   */
  private isConnectionError(error: Error): boolean {
    const connectionErrorCodes = ['CONNECTION_ERROR', 'CONNECTION_TIMEOUT', 'NOT_CONNECTED', 'CONNECTION_CLOSED'];
    return connectionErrorCodes.some(code => error.message.includes(code));
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get manager status and metrics
   */
  getStatus(): ManagerStatus {
    const connectionMetrics = Array.from(this.connectionPool.values()).map(conn => ({
      id: conn.id,
      server: conn.server.url,
      status: conn.status,
      activeRequests: conn.activeRequests,
      metrics: conn.metrics,
    }));

    const serverHealthMap: Record<string, ServerHealth> = {};
    for (const [url, health] of this.serverHealth) {
      serverHealthMap[url] = health;
    }

    return {
      initialized: this.isInitialized,
      poolSize: this.connectionPool.size,
      healthyConnections: this.getHealthyConnectionCount(),
      activeRequests: Array.from(this.connectionPool.values())
        .reduce((sum, conn) => sum + conn.activeRequests, 0),
      connectionMetrics,
      serverHealth: serverHealthMap,
      sessionAffinityEntries: this.sessionAffinity.size,
    };
  }

  /**
   * Application shutdown handler
   */
  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Shutting down WebSocket manager');

    // Stop timers
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.poolMaintenanceTimer) {
      clearInterval(this.poolMaintenanceTimer);
    }

    // Disconnect all connections
    const disconnectPromises = Array.from(this.connectionPool.values()).map(conn =>
      this.removeConnection(conn.id)
    );

    await Promise.allSettled(disconnectPromises);

    this.connectionPool.clear();
    this.sessionAffinity.clear();
    this.serverHealth.clear();

    this.logger.log('WebSocket manager shutdown complete');
  }
}

// ===== SUPPORTING INTERFACES =====

interface ServerHealth {
  url: string;
  status: ServerHealthStatus;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastCheck: Date;
  responseTime: number;
}

enum ServerHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

interface ManagerStatus {
  initialized: boolean;
  poolSize: number;
  healthyConnections: number;
  activeRequests: number;
  connectionMetrics: Array<{
    id: string;
    server: string;
    status: ConnectionStatus;
    activeRequests: number;
    metrics: ConnectionMetrics;
  }>;
  serverHealth: Record<string, ServerHealth>;
  sessionAffinityEntries: number;
}