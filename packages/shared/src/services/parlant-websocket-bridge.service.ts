/**
 * Parlant WebSocket Bridge Service
 *
 * Real-time communication bridge service for Maximum Parlant Integration.
 * Enables bidirectional WebSocket communication between AIgent and Parlant
 * for real-time function validation monitoring, status updates, and
 * conversational AI control across all 1,520+ functions.
 *
 * @module ParlantWebSocketBridgeService
 * @version 1.0.0
 * @author AIgent Integration Team
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { EventEmitter } from "events";
import * as WebSocket from "ws";
import * as jwt from "jsonwebtoken";
import {
  ParlantWebSocketMessage,
  ParlantMessageType,
  ParlantValidationRequest,
  ParlantValidationResponse,
  ParlantUserContext,
  ParlantHealthStatus,
  ParlantWebSocketConfig,
  ParlantConnectionError,
  ParlantAuthenticationError,
  ParlantIntegrationError,
} from "../types/parlant-integration.types";

/**
 * WebSocket Message Queue Entry
 */
interface QueuedMessage {
  id: string;
  message: ParlantWebSocketMessage;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  resolve: (_value: unknown) => void;
  reject: (_error: Error | unknown) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Pending Validation Entry for response routing
 */
interface PendingValidation {
  clientWs: WebSocket.WebSocket;
  timestamp: Date;
  request: ParlantWebSocketMessage;
}

/**
 * Pending Direct Validation Entry for API requests
 */
interface PendingDirectValidation {
  resolve: (response: ParlantValidationResponse) => void;
  reject: (error: Error) => void;
  timestamp: Date;
}

/**
 * Connection Statistics
 */
interface ConnectionStats {
  totalMessages: number;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  reconnects: number;
  uptime: number;
  lastMessageTime: Date;
  averageLatency: number;
}

/**
 * Parlant WebSocket Bridge Service
 *
 * High-performance, enterprise-grade WebSocket bridge that enables
 * real-time conversational AI control over all AIgent functions.
 */
@Injectable()
export class ParlantWebSocketBridgeService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ParlantWebSocketBridgeService.name);

  // WebSocket connections
  private clientWs: WebSocket.WebSocket | null = null;
  private serverWs: WebSocket.Server | null = null;

  // Connection state
  private isConnected = false;
  private isReconnecting = false;
  private connectionStartTime: Date | null = null;

  // Message handling
  private messageQueue = new Map<string, QueuedMessage>();
  private pendingValidations = new Map<string, PendingValidation>();
  private pendingDirectValidations = new Map<string, PendingDirectValidation>();

  // Configuration
  private config: ParlantWebSocketConfig = {
    enabled: true,
    reconnectAttempts: 5,
    heartbeatInterval: 30000,
    connectionTimeout: 10000,
  };

  // Statistics and monitoring
  private stats: ConnectionStats = {
    totalMessages: 0,
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
    reconnects: 0,
    uptime: 0,
    lastMessageTime: new Date(),
    averageLatency: 0,
  };

  // Timers
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private statsTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger.log("🚀 Initializing Parlant WebSocket Bridge Service");
  }

  /**
   * Initialize the WebSocket Bridge Service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("🔄 Starting Parlant WebSocket Bridge initialization...");

    try {
      await this.loadConfiguration();

      if (this.config.enabled) {
        await this.initializeClientConnection();
        await this.initializeServerConnection();
        this.startMonitoring();
      }

      this.logger.log("✅ Parlant WebSocket Bridge initialized successfully");
      this.emit("bridge:initialized");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("❌ Failed to initialize WebSocket Bridge", error);
      throw new ParlantIntegrationError(
        "WebSocket Bridge initialization failed",
        "WEBSOCKET_INIT_ERROR",
        { error: errorMessage },
      );
    }
  }

  /**
   * Clean up resources on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("🔄 Shutting down Parlant WebSocket Bridge...");

    await this.closeConnections();
    this.stopMonitoring();

    this.logger.log("✅ WebSocket Bridge shutdown complete");
  }

  /**
   * Load WebSocket configuration
   */
  private async loadConfiguration(): Promise<void> {
    this.config = {
      enabled: process.env.PARLANT_WS_ENABLED !== "false",
      reconnectAttempts: parseInt(
        process.env.PARLANT_WS_RECONNECT_ATTEMPTS || "5",
      ),
      heartbeatInterval: parseInt(
        process.env.PARLANT_WS_HEARTBEAT_INTERVAL || "30000",
      ),
      connectionTimeout: parseInt(
        process.env.PARLANT_WS_CONNECTION_TIMEOUT || "10000",
      ),
    };

    this.logger.log("📋 WebSocket Bridge configuration loaded", this.config);
  }

  /**
   * Initialize client WebSocket connection to Parlant
   */
  private async initializeClientConnection(): Promise<void> {
    const parlantWsUrl =
      process.env.PARLANT_WS_URL || "ws://localhost:8000/ws/aigent";
    const apiKey = process.env.PARLANT_API_KEY || "";

    this.logger.log(`📡 Connecting to Parlant WebSocket: ${parlantWsUrl}`);

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket.WebSocket(parlantWsUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "X-Service": "aigent",
          "X-Version": "1.0.0",
        },
      });

      const timeout = setTimeout(() => {
        ws.terminate();
        reject(
          new ParlantConnectionError("Client WebSocket connection timeout"),
        );
      }, this.config.connectionTimeout);

      ws.on("open", () => {
        clearTimeout(timeout);
        this.clientWs = ws;
        this.isConnected = true;
        this.connectionStartTime = new Date();

        this.logger.log("✅ Client WebSocket connection established");
        this.startHeartbeat();
        this.processQueuedMessages();
        resolve();
      });

      ws.on("message", (data: WebSocket.Data) => {
        this.handleIncomingMessage(data);
      });

      ws.on("close", (code: number, reason: string) => {
        clearTimeout(timeout);
        this.logger.warn(`⚠️ Client WebSocket closed: ${code} - ${reason}`);
        this.handleConnectionClose();
      });

      ws.on("error", (error: Error) => {
        clearTimeout(timeout);
        this.logger.error("❌ Client WebSocket error", error);
        this.stats.errors++;
        reject(
          new ParlantConnectionError("Client WebSocket connection failed", {
            message: error.message,
            name: error.name,
            stack: error.stack,
          }),
        );
      });

      ws.on("pong", () => {
        this.handlePong();
      });
    });
  }

  /**
   * Initialize server WebSocket for AIgent components
   */
  private async initializeServerConnection(): Promise<void> {
    const port = parseInt(process.env.PARLANT_BRIDGE_PORT || "8080");

    this.logger.log(`🖥️ Starting WebSocket server on port ${port}`);

    this.serverWs = new WebSocket.Server({
      port,
      verifyClient: (info: { req: any; origin?: string; secure?: boolean }) => {
        // Verify JWT token from AIgent components
        const token = info.req.headers.authorization?.replace("Bearer ", "");
        if (!token) return false;

        try {
          jwt.verify(token, process.env.JWT_SECRET || "default-secret");
          return true;
        } catch {
          return false;
        }
      },
    });

    this.serverWs.on(
      "connection",
      (ws: WebSocket, request: Record<string, unknown>) => {
        this.handleClientConnection(ws, request);
      },
    );

    this.serverWs.on("error", (error: Error) => {
      this.logger.error("❌ WebSocket server error", error);
      this.stats.errors++;
    });

    this.logger.log(`✅ WebSocket server started on port ${port}`);
  }

  /**
   * Handle new client connections to the bridge server
   */
  private handleClientConnection(
    ws: WebSocket,
    _request: Record<string, unknown>,
  ): void {
    const clientId = this.generateClientId();
    this.logger.log(`🤝 New client connected: ${clientId}`);

    // Set up client message handling
    ws.on("message", (data: WebSocket.Data) => {
      this.handleClientMessage(ws, clientId, data);
    });

    ws.on("close", () => {
      this.logger.log(`👋 Client disconnected: ${clientId}`);
    });

    ws.on("error", (error: Error) => {
      this.logger.error(`❌ Client error: ${clientId}`, error);
      this.stats.errors++;
    });

    // Send welcome message
    this.sendToClient(ws, {
      type: ParlantMessageType._STATUS_UPDATE,
      payload: {
        status: "connected",
        clientId,
        bridgeStatus: this.isConnected ? "connected" : "disconnected",
      },
      messageId: `welcome_${Date.now()}`,
      timestamp: new Date(),
    });
  }

  /**
   * Handle messages from AIgent components
   */
  private handleClientMessage(
    ws: WebSocket,
    clientId: string,
    data: WebSocket.Data,
  ): void {
    try {
      const message: ParlantWebSocketMessage = JSON.parse(data.toString());
      this.logger.debug(
        `📨 Received message from client ${clientId}: ${message.type}`,
      );

      this.stats.messagesReceived++;
      this.stats.totalMessages++;
      this.stats.lastMessageTime = new Date();

      // Forward to Parlant based on message type
      switch (message.type) {
        case ParlantMessageType._VALIDATION_REQUEST:
          this.forwardValidationRequest(message, ws);
          break;

        case ParlantMessageType._STATUS_UPDATE:
          this.forwardStatusUpdate(message);
          break;

        case ParlantMessageType._HEARTBEAT:
          this.handleClientHeartbeat(ws, message);
          break;

        default:
          this.logger.warn(
            `🚫 Unknown message type from client: ${message.type}`,
          );
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to parse client message from ${clientId}`,
        error,
      );
      this.stats.errors++;
    }
  }

  /**
   * Handle messages from Parlant
   */
  private handleIncomingMessage(data: WebSocket.Data): void {
    try {
      const message: ParlantWebSocketMessage = JSON.parse(data.toString());
      this.logger.debug(`📨 Received message from Parlant: ${message.type}`);

      this.stats.messagesReceived++;
      this.stats.totalMessages++;
      this.stats.lastMessageTime = new Date();

      // Handle message based on type
      switch (message.type) {
        case ParlantMessageType._VALIDATION_RESPONSE:
          this.handleValidationResponse(message);
          break;

        case ParlantMessageType._STATUS_UPDATE:
          this.handleParlantStatusUpdate(message);
          break;

        case ParlantMessageType._AUTH_CHALLENGE:
          this.handleAuthChallenge(message);
          break;

        case ParlantMessageType._ERROR:
          this.handleParlantError(message);
          break;

        case ParlantMessageType._HEARTBEAT:
          this.handleParlantHeartbeat(message);
          break;

        default:
          this.logger.warn(
            `🚫 Unknown message type from Parlant: ${message.type}`,
          );
      }

      // Emit event for other services
      this.emit("message:received", message);
    } catch (error) {
      this.logger.error("❌ Failed to parse Parlant message", error);
      this.stats.errors++;
    }
  }

  /**
   * Forward validation request to Parlant
   */
  private async forwardValidationRequest(
    message: ParlantWebSocketMessage,
    clientWs: WebSocket.WebSocket,
  ): Promise<void> {
    if (!this.isConnected || !this.clientWs) {
      this.sendToClient(clientWs, {
        type: ParlantMessageType._ERROR,
        payload: {
          error: "Parlant connection not available",
          originalMessageId: message.messageId,
        },
        messageId: `error_${Date.now()}`,
        timestamp: new Date(),
      });
      return;
    }

    // Store pending validation for response routing
    this.pendingValidations.set(message.messageId, {
      clientWs,
      timestamp: new Date(),
      request: message,
    });

    // Forward to Parlant
    await this.sendToParlant(message);

    // Set timeout for validation
    setTimeout(() => {
      if (this.pendingValidations.has(message.messageId)) {
        this.pendingValidations.delete(message.messageId);
        this.sendToClient(clientWs, {
          type: ParlantMessageType._ERROR,
          payload: {
            error: "Validation timeout",
            originalMessageId: message.messageId,
          },
          messageId: `timeout_${Date.now()}`,
          timestamp: new Date(),
        });
      }
    }, 30000); // 30 second timeout
  }

  /**
   * Handle validation response from Parlant
   */
  private handleValidationResponse(message: ParlantWebSocketMessage): void {
    const originalMessageId = message.payload.originalMessageId;
    if (typeof originalMessageId !== "string") {
      this.logger.warn(
        `⚠️ Invalid originalMessageId type: ${typeof originalMessageId}`,
      );
      return;
    }
    const pending = this.pendingValidations.get(originalMessageId);
    const pendingDirect = this.pendingDirectValidations.get(originalMessageId);

    if (!pending && !pendingDirect) {
      this.logger.warn(
        `⚠️ No pending validation found for message: ${originalMessageId}`,
      );
      return;
    }

    if (pending) {
      // Handle bridge validation (client WebSocket)
      const latency = Date.now() - pending.timestamp.getTime();
      this.updateAverageLatency(latency);

      // Forward response to client
      this.sendToClient(pending.clientWs, message);

      // Clean up pending validation
      this.pendingValidations.delete(originalMessageId);

      this.logger.debug(
        `✅ Validation response forwarded (${latency}ms): ${originalMessageId}`,
      );
    }

    if (pendingDirect) {
      // Handle direct validation (Promise resolution)
      const latency = Date.now() - pendingDirect.timestamp.getTime();
      this.updateAverageLatency(latency);

      // Resolve the promise with the response
      const response = message.payload as unknown as ParlantValidationResponse;
      pendingDirect.resolve(response);

      // Clean up pending validation
      this.pendingDirectValidations.delete(originalMessageId);

      this.logger.debug(
        `✅ Direct validation resolved (${latency}ms): ${originalMessageId}`,
      );
    }
  }

  /**
   * Send message to Parlant
   */
  private async sendToParlant(message: ParlantWebSocketMessage): Promise<void> {
    if (!this.isConnected || !this.clientWs) {
      throw new ParlantConnectionError("Parlant connection not available");
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Send timeout"));
      }, 5000);

      try {
        this.clientWs!.send(JSON.stringify(message), (error?: Error) => {
          clearTimeout(timeout);

          if (error) {
            this.logger.error("❌ Failed to send message to Parlant", error);
            this.stats.errors++;
            reject(error);
          } else {
            this.stats.messagesSent++;
            this.stats.totalMessages++;
            resolve();
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        this.logger.error("❌ Send error", error);
        this.stats.errors++;
        reject(error);
      }
    });
  }

  /**
   * Send message to client
   */
  private sendToClient(
    ws: WebSocket.WebSocket,
    message: ParlantWebSocketMessage,
  ): void {
    if (ws.readyState !== WebSocket.WebSocket.OPEN) {
      this.logger.warn("⚠️ Cannot send message to closed client connection");
      return;
    }

    try {
      ws.send(JSON.stringify(message));
      this.stats.messagesSent++;
      this.stats.totalMessages++;
    } catch (error) {
      this.logger.error("❌ Failed to send message to client", error);
      this.stats.errors++;
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcastToClients(message: ParlantWebSocketMessage): void {
    if (!this.serverWs) return;

    this.serverWs.clients.forEach((client: WebSocket.WebSocket) => {
      if (client.readyState === WebSocket.WebSocket.OPEN) {
        this.sendToClient(client, message);
      }
    });
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(): void {
    this.isConnected = false;
    this.clientWs = null;
    this.stopHeartbeat();

    // Notify all clients of disconnection
    this.broadcastToClients({
      type: ParlantMessageType._STATUS_UPDATE,
      payload: {
        status: "parlant_disconnected",
        timestamp: Date.now(),
      },
      messageId: `disconnect_${Date.now()}`,
      timestamp: new Date(),
    });

    // Attempt reconnection
    this.attemptReconnection();
  }

  /**
   * Attempt to reconnect to Parlant
   */
  private async attemptReconnection(): Promise<void> {
    if (this.isReconnecting || !this.config.enabled) {
      return;
    }

    this.isReconnecting = true;
    let attempts = 0;

    while (attempts < this.config.reconnectAttempts && !this.isConnected) {
      attempts++;
      this.stats.reconnects++;

      this.logger.log(
        `🔄 Attempting Parlant reconnection (${attempts}/${this.config.reconnectAttempts})`,
      );

      try {
        await this.initializeClientConnection();
        this.logger.log("✅ Parlant reconnection successful");

        // Notify clients of reconnection
        this.broadcastToClients({
          type: ParlantMessageType._STATUS_UPDATE,
          payload: {
            status: "parlant_reconnected",
            timestamp: Date.now(),
            attempts,
          },
          messageId: `reconnect_${Date.now()}`,
          timestamp: new Date(),
        });

        break;
      } catch (error) {
        this.logger.warn(`⚠️ Reconnection attempt ${attempts} failed`, error);

        if (attempts < this.config.reconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.isReconnecting = false;

    if (!this.isConnected) {
      this.logger.error(
        "❌ Failed to reconnect to Parlant after maximum attempts",
      );
      this.emit("reconnection:failed");
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.clientWs) {
        this.clientWs.ping();

        // Send heartbeat message
        const heartbeat: ParlantWebSocketMessage = {
          type: ParlantMessageType._HEARTBEAT,
          payload: {
            timestamp: Date.now(),
            stats: this.getBasicStats(),
          },
          messageId: `heartbeat_${Date.now()}`,
          timestamp: new Date(),
        };

        this.sendToParlant(heartbeat).catch((error) => {
          this.logger.warn("⚠️ Heartbeat failed", error);
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Handle pong response
   */
  private handlePong(): void {
    this.logger.debug("🏓 Received pong from Parlant");
  }

  /**
   * Handle client heartbeat
   */
  private handleClientHeartbeat(
    ws: WebSocket,
    _message: ParlantWebSocketMessage,
  ): void {
    this.sendToClient(ws, {
      type: ParlantMessageType._HEARTBEAT,
      payload: {
        timestamp: Date.now(),
        bridgeStats: this.getBasicStats(),
      },
      messageId: `heartbeat_response_${Date.now()}`,
      timestamp: new Date(),
    });
  }

  /**
   * Handle Parlant heartbeat
   */
  private handleParlantHeartbeat(_message: ParlantWebSocketMessage): void {
    // Respond to Parlant heartbeat
    const response: ParlantWebSocketMessage = {
      type: ParlantMessageType._HEARTBEAT,
      payload: {
        timestamp: Date.now(),
        stats: this.getBasicStats(),
      },
      messageId: `heartbeat_response_${Date.now()}`,
      timestamp: new Date(),
    };

    this.sendToParlant(response).catch((error) => {
      this.logger.warn("⚠️ Heartbeat response failed", error);
    });
  }

  /**
   * Handle authentication challenge from Parlant
   */
  private handleAuthChallenge(message: ParlantWebSocketMessage): void {
    this.logger.debug("🔐 Received auth challenge from Parlant");

    const token = jwt.sign(
      {
        service: "aigent-bridge",
        timestamp: Date.now(),
        version: "1.0.0",
      },
      process.env.JWT_SECRET || "default-secret",
      { expiresIn: "1h" },
    );

    const response: ParlantWebSocketMessage = {
      type: ParlantMessageType._AUTH_RESPONSE,
      payload: { token },
      messageId: message.messageId,
      timestamp: new Date(),
    };

    this.sendToParlant(response).catch((error) => {
      this.logger.error("❌ Auth response failed", error);
    });
  }

  /**
   * Handle status update from Parlant
   */
  private handleParlantStatusUpdate(message: ParlantWebSocketMessage): void {
    this.logger.debug(
      "📊 Received status update from Parlant",
      message.payload,
    );

    // Broadcast to all clients
    this.broadcastToClients(message);

    this.emit("parlant:status", message.payload);
  }

  /**
   * Handle error from Parlant
   */
  private handleParlantError(message: ParlantWebSocketMessage): void {
    this.logger.error("❌ Received error from Parlant", message.payload);

    this.stats.errors++;
    this.emit("parlant:error", message.payload);

    // Broadcast error to clients
    this.broadcastToClients(message);
  }

  /**
   * Forward status update to Parlant
   */
  private forwardStatusUpdate(message: ParlantWebSocketMessage): void {
    this.sendToParlant(message).catch((error) => {
      this.logger.error("❌ Failed to forward status update", error);
    });
  }

  /**
   * Process queued messages after reconnection
   */
  private processQueuedMessages(): void {
    for (const [id, queuedMessage] of this.messageQueue.entries()) {
      this.sendToParlant(queuedMessage.message)
        .then(() => {
          clearTimeout(queuedMessage.timeout);
          queuedMessage.resolve(true);
          this.messageQueue.delete(id);
        })
        .catch((error) => {
          queuedMessage.reject(error);
          this.messageQueue.delete(id);
        });
    }
  }

  /**
   * Close all connections
   */
  private async closeConnections(): Promise<void> {
    // Close client connection
    if (this.clientWs) {
      this.clientWs.close();
      this.clientWs = null;
    }

    // Close server
    if (this.serverWs) {
      this.serverWs.close();
      this.serverWs = null;
    }

    this.isConnected = false;
    this.stopHeartbeat();
  }

  /**
   * Start monitoring and statistics collection
   */
  private startMonitoring(): void {
    // Update stats every 10 seconds
    this.statsTimer = setInterval(() => {
      this.updateStats();
    }, 10000);

    this.logger.log("📊 WebSocket Bridge monitoring started");
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring(): void {
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }

    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Update connection statistics
   */
  private updateStats(): void {
    if (this.connectionStartTime) {
      this.stats.uptime = Date.now() - this.connectionStartTime.getTime();
    }

    // Log periodic stats
    this.logger.debug("📊 WebSocket Bridge Stats", this.getBasicStats());
  }

  /**
   * Update average latency
   */
  private updateAverageLatency(latency: number): void {
    const alpha = 0.1; // Exponential moving average factor
    this.stats.averageLatency =
      this.stats.averageLatency * (1 - alpha) + latency * alpha;
  }

  /**
   * Get basic statistics
   */
  private getBasicStats(): Record<string, unknown> {
    return {
      connected: this.isConnected,
      uptime: this.stats.uptime,
      totalMessages: this.stats.totalMessages,
      messagesSent: this.stats.messagesSent,
      messagesReceived: this.stats.messagesReceived,
      errors: this.stats.errors,
      reconnects: this.stats.reconnects,
      averageLatency: Math.round(this.stats.averageLatency),
      pendingValidations: this.pendingValidations.size,
      queuedMessages: this.messageQueue.size,
    };
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current health status
   */
  getHealthStatus(): ParlantHealthStatus {
    return {
      status: this.isConnected ? "healthy" : "unhealthy",
      apiConnection: false, // This service doesn't use HTTP API
      websocketConnection: this.isConnected,
      cacheStatus: true, // Always true for message queue
      lastCheck: new Date(),
      metrics: {
        activeConnections: this.isConnected ? 1 : 0,
        requestRate: this.stats.totalMessages,
        averageResponseTime: this.stats.averageLatency,
        errorRate:
          this.stats.totalMessages > 0
            ? (this.stats.errors / this.stats.totalMessages) * 100
            : 0,
        cacheHitRate: 0, // Not applicable for WebSocket bridge
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };
  }

  /**
   * Get detailed connection statistics
   */
  getConnectionStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Send validation request to Parlant (public interface)
   */
  async sendValidationRequest(
    request: ParlantValidationRequest,
  ): Promise<ParlantValidationResponse> {
    const message: ParlantWebSocketMessage = {
      type: ParlantMessageType._VALIDATION_REQUEST,
      payload: request as unknown as Record<string, unknown>,
      messageId: `validation_${request.operationId}`,
      timestamp: new Date(),
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingDirectValidations.delete(message.messageId);
        reject(new Error("Validation request timeout"));
      }, 30000);

      this.pendingDirectValidations.set(message.messageId, {
        resolve: (response: ParlantValidationResponse) => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timestamp: new Date(),
      });

      this.sendToParlant(message).catch(reject);
    });
  }
}
