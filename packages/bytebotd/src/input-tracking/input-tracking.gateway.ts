import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket, DefaultEventsMap } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { ComputerAction } from '@bytebot/shared';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class InputTrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(InputTrackingGateway.name);

  @WebSocketServer()
  server!: Server<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap,
    unknown
  >;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitAction(action: ComputerAction) {
    this.server.emit('action', action);
  }

  emitScreenshotAndAction(
    screenshot: { image: string },
    action: ComputerAction,
  ) {
    this.server.emit('screenshotAndAction', screenshot, action);
  }

  /**
   * Broadcast input event to all connected clients
   * @param inputData - Input event data to broadcast
   */
  broadcastInputEvent(inputData: any) {
    this.server.emit('inputEvent', inputData);
  }

  /**
   * Broadcast action event to all connected clients
   * @param actionData - Action event data to broadcast
   */
  broadcastActionEvent(actionData: any) {
    this.server.emit('actionEvent', actionData);
  }

  /**
   * Get number of connected clients
   * @returns Number of connected clients
   */
  getConnectedClients(): number {
    return this.server.sockets.sockets.size;
  }

  /**
   * Broadcast message to a specific room
   * @param room - Room name
   * @param event - Event name
   * @param data - Data to broadcast
   */
  broadcastToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  /**
   * Join a client to a room
   * @param client - Socket client
   * @param room - Room name
   */
  joinRoom(client: Socket, room: string) {
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
  }

  /**
   * Remove a client from a room
   * @param client - Socket client
   * @param room - Room name
   */
  leaveRoom(client: Socket, room: string) {
    client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);
  }

  /**
   * Get rooms that a client is part of
   * @param client - Socket client
   * @returns Array of room names
   */
  getClientRooms(client: Socket): string[] {
    return Array.from(client.rooms);
  }
}
