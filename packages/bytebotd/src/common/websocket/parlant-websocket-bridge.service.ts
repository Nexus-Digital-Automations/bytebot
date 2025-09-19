/**
 * Parlant WebSocket Bridge Service
 * 
 * Demonstrates the solution for WebSocket VerifyClientCallback type incompatibilities
 * by using the safe WebSocket type utilities to bridge IncomingMessage and Record types.
 * 
 * This addresses the critical TypeScript error where callback signature was incompatible
 * with VerifyClientCallbackAsync/Sync, specifically the IncomingMessage vs Record<string, unknown>
 * incompatibility.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import {
  createSafeWebSocketServer,
  createSecureVerifyCallback,
  SafeWebSocketServerOptions,
  WebSocketVerificationInfo,
  EnhancedRequestInfo,
  convertIncomingMessageToRecord,
} from './websocket-types';

/**
 * Interface for Parlant WebSocket message
 */
interface ParlantWebSocketMessage {
  type: string;
  conversation_id?: string;
  session_id?: string;
  payload?: Record<string, unknown>;
  timestamp?: number;
}

/**
 * Client connection metadata
 */
interface ClientConnectionInfo {
  id: string;
  connectedAt: Date;
  origin?: string;
  userAgent?: string;
  remoteAddress?: string;
  conversationId?: string;
  sessionId?: string;
}

/**
 * Parlant WebSocket Bridge Service
 * 
 * This service demonstrates the correct implementation of WebSocket server
 * with type-safe VerifyClientCallback that resolves the type incompatibility
 * between IncomingMessage and Record<string, unknown>.
 */
@Injectable()
export class ParlantWebSocketBridgeService implements OnApplicationShutdown {
  private readonly logger = new Logger(ParlantWebSocketBridgeService.name);
  private webSocketServer: WebSocket.Server | null = null;
  private readonly clients = new Map<string, WebSocket.WebSocket>();
  private readonly clientInfo = new Map<string, ClientConnectionInfo>();
  private readonly messageQueue = new Map<string, ParlantWebSocketMessage[]>();
  
  // Performance metrics
  private connectionCount = 0;
  private messageCount = 0;
  private errorCount = 0;

  constructor(private readonly configService: ConfigService) {
    this.initializeWebSocketBridge();
  }

  /**
   * Initialize the WebSocket bridge with proper type-safe verification
   */
  private initializeWebSocketBridge(): void {
    const operationId = `parlant_ws_init_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    this.logger.log(`[${operationId}] Initializing Parlant WebSocket Bridge`, {
      operationId,
      port: this.getWebSocketPort(),
      securityEnabled: this.isSecurityEnabled(),
    });

    try {
      // Create WebSocket server options with type-safe verification callback
      const serverOptions: SafeWebSocketServerOptions = {
        port: this.getWebSocketPort(),
        perMessageDeflate: {
          zlibDeflateOptions: {
            chunkSize: 1024,
            windowBits: 13,
            level: 3,
          },
          threshold: 1024,
          concurrencyLimit: 10,
          clientMaxWindowBits: 13,
        },
        // TYPE-SAFE SOLUTION: Use our enhanced verification callback
        // This resolves the IncomingMessage vs Record<string, unknown> incompatibility
        verifyClient: this.createParlantVerificationCallback(),
      };

      // Create the WebSocket server using our type-safe factory
      this.webSocketServer = createSafeWebSocketServer(serverOptions);

      // Set up event handlers
      this.setupWebSocketEventHandlers();

      this.logger.log(`[${operationId}] Parlant WebSocket Bridge initialized successfully`, {
        operationId,
        port: this.getWebSocketPort(),
        verificationEnabled: true,
      });

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to initialize WebSocket bridge`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Creates a type-safe verification callback that properly handles the type conversion
   * 
   * This method demonstrates the SOLUTION to the WebSocket VerifyClientCallback
   * type incompatibility issue mentioned in the task.
   */
  private createParlantVerificationCallback() {
    const operationId = `parlant_verify_callback_${Date.now()}`;
    
    this.logger.log(`[${operationId}] Creating Parlant verification callback`, {
      operationId,
      securityEnabled: this.isSecurityEnabled(),
      allowedOrigins: this.getAllowedOrigins(),
    });

    // Create secure verification callback with enhanced type safety
    return createSecureVerifyCallback({
      allowedOrigins: this.getAllowedOrigins(),
      requireHttps: this.isHttpsRequired(),
      maxConnections: this.getMaxConnectionsPerIP(),
      rateLimitByIP: this.isRateLimitEnabled(),
    });
  }

  /**
   * Alternative demonstration of manual type conversion for verification
   * 
   * This shows how to manually handle the IncomingMessage to Record conversion
   * if you need more control over the verification process.
   */
  private createManualVerificationCallback() {
    return (info: WebSocketVerificationInfo): boolean => {
      const operationId = `manual_verify_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      try {
        // Convert IncomingMessage to Record<string, unknown> for compatibility
        const requestInfo: EnhancedRequestInfo = convertIncomingMessageToRecord(info.req);
        
        this.logger.debug(`[${operationId}] Verifying WebSocket connection`, {
          operationId,
          origin: info.origin,
          secure: info.secure,
          headers: Object.keys(requestInfo.headers),
          userAgent: requestInfo.userAgent,
          remoteAddress: requestInfo.remoteAddress,
        });

        // Perform verification logic using the converted request info
        const verification = this.performDetailedVerification(requestInfo, info);
        
        this.logger.log(`[${operationId}] WebSocket verification result: ${verification.allowed}`, {
          operationId,
          allowed: verification.allowed,
          reason: verification.reason,
          origin: info.origin,
        });

        return verification.allowed;

      } catch (error) {
        this.logger.error(`[${operationId}] WebSocket verification error`, {
          operationId,
          error: error instanceof Error ? error.message : String(error),
          origin: info.origin,
        });
        return false;
      }
    };
  }

  /**
   * Detailed verification logic that works with the converted request info
   */
  private performDetailedVerification(
    requestInfo: EnhancedRequestInfo,
    wsInfo: WebSocketVerificationInfo
  ): { allowed: boolean; reason?: string } {
    // Origin validation
    if (wsInfo.origin && this.getAllowedOrigins().length > 0) {
      if (!this.getAllowedOrigins().includes(wsInfo.origin)) {
        return { allowed: false, reason: `Origin ${wsInfo.origin} not in allowed list` };
      }
    }

    // HTTPS requirement
    if (this.isHttpsRequired() && !wsInfo.secure) {
      return { allowed: false, reason: 'HTTPS required for WebSocket connections' };
    }

    // User agent validation
    if (requestInfo.userAgent) {
      const userAgent = requestInfo.userAgent.toLowerCase();
      const blockedAgents = ['curl', 'wget', 'python-requests'];
      if (blockedAgents.some(blocked => userAgent.includes(blocked))) {
        return { allowed: false, reason: 'User agent not allowed' };
      }
    }

    // Header validation
    const requiredHeaders = ['sec-websocket-key', 'sec-websocket-version'];
    for (const header of requiredHeaders) {
      if (!requestInfo.headers[header]) {
        return { allowed: false, reason: `Missing required header: ${header}` };
      }
    }

    // Rate limiting check
    if (this.isRateLimitEnabled() && requestInfo.remoteAddress) {
      if (this.isRateLimited(requestInfo.remoteAddress)) {
        return { allowed: false, reason: 'Rate limit exceeded' };
      }
    }

    return { allowed: true };
  }

  /**
   * Set up WebSocket server event handlers
   */
  private setupWebSocketEventHandlers(): void {
    if (!this.webSocketServer) {
      return;
    }

    this.webSocketServer.on('connection', (ws: WebSocket.WebSocket, req) => {
      this.handleNewConnection(ws, convertIncomingMessageToRecord(req));
    });

    this.webSocketServer.on('error', (error: Error) => {
      this.errorCount++;
      this.logger.error('WebSocket server error', {
        error: error.message,
        stack: error.stack,
        errorCount: this.errorCount,
      });
    });

    this.webSocketServer.on('close', () => {
      this.logger.log('WebSocket server closed', {
        finalConnectionCount: this.connectionCount,
        finalMessageCount: this.messageCount,
        finalErrorCount: this.errorCount,
      });
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleNewConnection(ws: WebSocket.WebSocket, req: EnhancedRequestInfo): void {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const operationId = `connection_${clientId}`;
    
    this.connectionCount++;
    
    const clientInfo: ClientConnectionInfo = {
      id: clientId,
      connectedAt: new Date(),
      origin: req.headers?.origin ?? 'unknown',
      userAgent: req.headers?.['user-agent'] ?? 'unknown',
      remoteAddress: req.remoteAddress ?? 'unknown',
    };

    this.clients.set(clientId, ws);
    this.clientInfo.set(clientId, clientInfo);
    this.messageQueue.set(clientId, []);

    this.logger.log(`[${operationId}] New WebSocket connection established`, {
      operationId,
      clientId,
      totalConnections: this.connectionCount,
      origin: clientInfo.origin,
      userAgent: clientInfo.userAgent,
    });

    // Set up client event handlers
    ws.on('message', (data: WebSocket.RawData) => {
      this.handleClientMessage(clientId, data);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.handleClientDisconnection(clientId, code, reason);
    });

    ws.on('error', (error: Error) => {
      this.handleClientError(clientId, error);
    });

    // Send welcome message
    this.sendMessageToClient(clientId, {
      type: 'welcome',
      session_id: clientId,
      timestamp: Date.now(),
      payload: {
        clientId,
        serverVersion: '1.0.0',
        features: ['conversation', 'validation', 'streaming'],
      },
    });
  }

  /**
   * Handle incoming client message
   */
  private handleClientMessage(clientId: string, data: WebSocket.RawData): void {
    const operationId = `message_${clientId}_${Date.now()}`;
    
    try {
      const message = JSON.parse(Buffer.from(data as ArrayBuffer).toString('utf8')) as ParlantWebSocketMessage;
      this.messageCount++;
      
      this.logger.debug(`[${operationId}] Received message from client`, {
        operationId,
        clientId,
        messageType: message.type,
        conversationId: message.conversation_id,
        messageCount: this.messageCount,
      });

      // Add to message queue
      const queue = this.messageQueue.get(clientId) ?? [];
      queue.push(message);
      this.messageQueue.set(clientId, queue);

      // Process message based on type
      this.processClientMessage(clientId, message, operationId);

    } catch (error) {
      this.errorCount++;
      this.logger.error(`[${operationId}] Failed to process client message`, {
        operationId,
        clientId,
        error: error instanceof Error ? error.message : String(error),
        rawData: Buffer.from(data as ArrayBuffer).toString('utf8'),
      });

      this.sendErrorToClient(clientId, 'Invalid message format', operationId);
    }
  }

  /**
   * Process specific message types
   */
  private processClientMessage(
    clientId: string,
    message: ParlantWebSocketMessage,
    operationId: string
  ): void {
    switch (message.type) {
      case 'conversation_start':
        this.handleConversationStart(clientId, message, operationId);
        break;
      case 'validation_request':
        this.handleValidationRequest(clientId, message, operationId);
        break;
      case 'ping':
        this.handlePing(clientId, message, operationId);
        break;
      default:
        this.logger.warn(`[${operationId}] Unknown message type: ${message.type}`, {
          operationId,
          clientId,
          messageType: message.type,
        });
    }
  }

  /**
   * Send message to specific client
   */
  private sendMessageToClient(clientId: string, message: ParlantWebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        this.logger.error('Failed to send message to client', {
          clientId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Send error message to client
   */
  private sendErrorToClient(clientId: string, errorMessage: string, operationId?: string): void {
    this.sendMessageToClient(clientId, {
      type: 'error',
      timestamp: Date.now(),
      payload: {
        error: errorMessage,
        operationId,
      },
    });
  }

  // Message handlers
  private handleConversationStart(clientId: string, message: ParlantWebSocketMessage, operationId: string): void {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Update client info
    const clientInfo = this.clientInfo.get(clientId);
    if (clientInfo) {
      clientInfo.conversationId = conversationId;
      this.clientInfo.set(clientId, clientInfo);
    }

    this.sendMessageToClient(clientId, {
      type: 'conversation_started',
      conversation_id: conversationId,
      timestamp: Date.now(),
      payload: {
        operationId,
        status: 'ready',
      },
    });
  }

  private handleValidationRequest(clientId: string, message: ParlantWebSocketMessage, operationId: string): void {
    // Mock validation logic
    const validationResult = {
      approved: true,
      confidence: 0.95,
      reasoning: 'Request validated successfully',
    };

    this.sendMessageToClient(clientId, {
      type: 'validation_result',
      conversation_id: message.conversation_id,
      timestamp: Date.now(),
      payload: {
        operationId,
        ...validationResult,
      },
    });
  }

  private handlePing(clientId: string, message: ParlantWebSocketMessage, operationId: string): void {
    this.sendMessageToClient(clientId, {
      type: 'pong',
      timestamp: Date.now(),
      payload: {
        operationId,
        clientTime: message.payload?.timestamp,
        serverTime: Date.now(),
      },
    });
  }

  private handleClientDisconnection(clientId: string, code: number, reason: Buffer): void {
    this.logger.log(`Client disconnected: ${clientId}`, {
      clientId,
      code,
      reason: reason.toString(),
      remainingConnections: this.clients.size - 1,
    });

    this.clients.delete(clientId);
    this.clientInfo.delete(clientId);
    this.messageQueue.delete(clientId);
  }

  private handleClientError(clientId: string, error: Error): void {
    this.errorCount++;
    this.logger.error(`Client error: ${clientId}`, {
      clientId,
      error: error.message,
      stack: error.stack,
    });
  }

  // Configuration helpers
  private getWebSocketPort(): number {
    return this.configService.get<number>('PARLANT_WEBSOCKET_PORT', 8080);
  }

  private isSecurityEnabled(): boolean {
    return this.configService.get<boolean>('PARLANT_WEBSOCKET_SECURITY_ENABLED', true);
  }

  private getAllowedOrigins(): string[] {
    const origins = this.configService.get<string>('PARLANT_ALLOWED_ORIGINS', '');
    return origins ? origins.split(',').map(o => o.trim()) : [];
  }

  private isHttpsRequired(): boolean {
    return this.configService.get<boolean>('PARLANT_REQUIRE_HTTPS', false);
  }

  private getMaxConnectionsPerIP(): number {
    return this.configService.get<number>('PARLANT_MAX_CONNECTIONS_PER_IP', 10);
  }

  private isRateLimitEnabled(): boolean {
    return this.configService.get<boolean>('PARLANT_RATE_LIMIT_ENABLED', true);
  }

  private isRateLimited(_remoteAddress: string): boolean {
    // Simple rate limiting implementation
    return false; // Mock implementation
  }

  /**
   * Get server statistics
   */
  getServerStats() {
    return {
      connectionCount: this.connectionCount,
      activeConnections: this.clients.size,
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      uptime: process.uptime(),
    };
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastMessage(message: ParlantWebSocketMessage): void {
    this.clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.WebSocket.OPEN) {
        this.sendMessageToClient(clientId, message);
      }
    });
  }

  /**
   * Clean shutdown of WebSocket server
   */
  onApplicationShutdown(): void {
    this.logger.log('Shutting down Parlant WebSocket Bridge');

    if (this.webSocketServer) {
      // Close all client connections
      this.clients.forEach((client, _clientId) => {
        if (client.readyState === WebSocket.WebSocket.OPEN) {
          client.close(1000, 'Server shutting down');
        }
      });

      // Close the server
      this.webSocketServer.close(() => {
        this.logger.log('Parlant WebSocket Bridge shutdown complete');
      });
    }
  }
}