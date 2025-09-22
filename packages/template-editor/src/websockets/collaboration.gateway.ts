/**
 * Collaboration WebSocket Gateway
 * Real-time collaboration features for template editing
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TemplateEditorService } from '../core/template-editor.service';
import {
  CollaborationEvent,
  EditorSession,
  CursorPosition,
  TextSelection
} from '../types/template-editor.types';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  },
  namespace: '/template-collaboration'
})
export class CollaborationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CollaborationGateway.name);
  private readonly connectedClients = new Map<string, Socket>();
  private readonly clientSessions = new Map<string, string>(); // socketId -> sessionId

  constructor(private readonly templateEditorService: TemplateEditorService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized for template collaboration');
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // End editor session if exists
    const sessionId = this.clientSessions.get(client.id);
    if (sessionId) {
      await this.templateEditorService.endEditorSession(sessionId);
      this.clientSessions.delete(client.id);
    }

    this.connectedClients.delete(client.id);
  }

  /**
   * Join a template editing session for collaboration
   */
  @SubscribeMessage('join-template')
  async handleJoinTemplate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      templateId: string;
      versionId: string;
      userId: string;
      mode?: string;
    }
  ) {
    try {
      this.logger.log(`User ${data.userId} joining template ${data.templateId}`);

      // Create editor session
      const session = await this.templateEditorService.createEditorSession(
        data.templateId,
        data.versionId,
        data.userId,
        data.mode as any
      );

      // Associate socket with session
      this.clientSessions.set(client.id, session.id);

      // Join template room
      await client.join(`template-${data.templateId}`);

      // Get current collaborators
      const collaborators = this.templateEditorService.getActiveCollaborators(data.templateId);

      // Send session info to client
      client.emit('session-created', {
        sessionId: session.id,
        collaborators: collaborators.map(c => ({
          userId: c.userId,
          cursor: c.cursor,
          selection: c.selection,
          mode: c.mode
        }))
      });

      // Notify other collaborators of new user
      client.to(`template-${data.templateId}`).emit('user-joined', {
        userId: data.userId,
        sessionId: session.id,
        cursor: session.cursor
      });

    } catch (error) {
      this.logger.error(`Error joining template: ${error.message}`);
      client.emit('error', { message: 'Failed to join template editing session' });
    }
  }

  /**
   * Leave a template editing session
   */
  @SubscribeMessage('leave-template')
  async handleLeaveTemplate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { templateId: string }
  ) {
    try {
      const sessionId = this.clientSessions.get(client.id);
      if (!sessionId) {
        return;
      }

      // End session
      await this.templateEditorService.endEditorSession(sessionId);
      this.clientSessions.delete(client.id);

      // Leave template room
      await client.leave(`template-${data.templateId}`);

      // Notify other collaborators
      client.to(`template-${data.templateId}`).emit('user-left', {
        sessionId
      });

      this.logger.log(`User left template ${data.templateId}`);

    } catch (error) {
      this.logger.error(`Error leaving template: ${error.message}`);
    }
  }

  /**
   * Handle cursor position updates for real-time collaboration
   */
  @SubscribeMessage('cursor-update')
  async handleCursorUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      templateId: string;
      cursor: CursorPosition;
      selection?: TextSelection;
    }
  ) {
    try {
      const sessionId = this.clientSessions.get(client.id);
      if (!sessionId) {
        return;
      }

      // Update cursor position in session
      await this.templateEditorService.updateCursorPosition(
        sessionId,
        data.cursor,
        data.selection
      );

      // Broadcast to other collaborators
      client.to(`template-${data.templateId}`).emit('cursor-moved', {
        sessionId,
        cursor: data.cursor,
        selection: data.selection
      });

    } catch (error) {
      this.logger.error(`Error updating cursor: ${error.message}`);
    }
  }

  /**
   * Handle text changes for collaborative editing
   */
  @SubscribeMessage('text-change')
  async handleTextChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      templateId: string;
      change: {
        type: 'insert' | 'delete';
        position: CursorPosition;
        text?: string;
        length?: number;
      };
      content: string;
    }
  ) {
    try {
      const sessionId = this.clientSessions.get(client.id);
      if (!sessionId) {
        return;
      }

      // Handle text change
      await this.templateEditorService.handleTextChange(
        sessionId,
        data.change,
        data.content
      );

      // Broadcast change to other collaborators
      client.to(`template-${data.templateId}`).emit('text-changed', {
        sessionId,
        change: data.change,
        content: data.content
      });

    } catch (error) {
      this.logger.error(`Error handling text change: ${error.message}`);
    }
  }

  /**
   * Handle template validation requests
   */
  @SubscribeMessage('validate-template')
  async handleValidateTemplate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      content: string;
      format?: string;
    }
  ) {
    try {
      const validationResult = await this.templateEditorService.validateTemplate(
        data.content,
        data.format
      );

      client.emit('validation-result', validationResult);

    } catch (error) {
      this.logger.error(`Error validating template: ${error.message}`);
      client.emit('validation-error', { message: 'Template validation failed' });
    }
  }

  /**
   * Handle template preview generation
   */
  @SubscribeMessage('generate-preview')
  async handleGeneratePreview(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      templateId: string;
      versionId: string;
      sampleData: Record<string, any>;
    }
  ) {
    try {
      const preview = await this.templateEditorService.generatePreview(
        data.templateId,
        data.versionId,
        data.sampleData
      );

      client.emit('preview-generated', preview);

    } catch (error) {
      this.logger.error(`Error generating preview: ${error.message}`);
      client.emit('preview-error', { message: 'Preview generation failed' });
    }
  }

  /**
   * Handle template snapshot creation
   */
  @SubscribeMessage('create-snapshot')
  async handleCreateSnapshot(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      templateId: string;
      versionId: string;
      content: string;
    }
  ) {
    try {
      const snapshot = await this.templateEditorService.createTemplateSnapshot(
        data.templateId,
        data.versionId,
        data.content,
        'manual'
      );

      client.emit('snapshot-created', snapshot);

    } catch (error) {
      this.logger.error(`Error creating snapshot: ${error.message}`);
      client.emit('snapshot-error', { message: 'Snapshot creation failed' });
    }
  }

  /**
   * Handle version diff generation
   */
  @SubscribeMessage('generate-diff')
  async handleGenerateDiff(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      sourceVersionId: string;
      targetVersionId: string;
    }
  ) {
    try {
      const diff = await this.templateEditorService.createVersionDiff(
        data.sourceVersionId,
        data.targetVersionId
      );

      client.emit('diff-generated', diff);

    } catch (error) {
      this.logger.error(`Error generating diff: ${error.message}`);
      client.emit('diff-error', { message: 'Diff generation failed' });
    }
  }

  /**
   * Handle typing indicators for collaboration awareness
   */
  @SubscribeMessage('typing-start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { templateId: string; userId: string }
  ) {
    client.to(`template-${data.templateId}`).emit('user-typing', {
      userId: data.userId,
      isTyping: true
    });
  }

  @SubscribeMessage('typing-stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { templateId: string; userId: string }
  ) {
    client.to(`template-${data.templateId}`).emit('user-typing', {
      userId: data.userId,
      isTyping: false
    });
  }

  /**
   * Broadcast collaboration event to template room
   */
  broadcastToTemplate(templateId: string, event: string, data: any) {
    this.server.to(`template-${templateId}`).emit(event, data);
  }

  /**
   * Send event to specific session
   */
  sendToSession(sessionId: string, event: string, data: any) {
    // Find socket by session
    for (const [socketId, socketSessionId] of this.clientSessions.entries()) {
      if (socketSessionId === sessionId) {
        const socket = this.connectedClients.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
        break;
      }
    }
  }
}