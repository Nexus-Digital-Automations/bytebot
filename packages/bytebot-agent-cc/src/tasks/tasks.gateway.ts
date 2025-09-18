import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { AgentTask } from '@bytebot/shared';

// Define message interface for WebSocket communication
interface TaskMessage {
  id: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'system' | 'agent';
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class TasksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server; // Definite assignment assertion - injected by @WebSocketServer() decorator

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_task')
  handleJoinTask(client: Socket, taskId: string) {
    void client.join(`task_${taskId}`);
    console.log(`Client ${client.id} joined task ${taskId}`);
  }

  @SubscribeMessage('leave_task')
  handleLeaveTask(client: Socket, taskId: string) {
    void client.leave(`task_${taskId}`);
    console.log(`Client ${client.id} left task ${taskId}`);
  }

  emitTaskUpdate(taskId: string, task: AgentTask) {
    this.server.to(`task_${taskId}`).emit('task_updated', task);
  }

  emitNewMessage(
    taskId: string,
    message: TaskMessage | Record<string, unknown>,
  ) {
    this.server.to(`task_${taskId}`).emit('new_message', message);
  }

  emitTaskCreated(task: AgentTask) {
    this.server.emit('task_created', task);
  }

  emitTaskDeleted(taskId: string) {
    this.server.emit('task_deleted', taskId);
  }
}
