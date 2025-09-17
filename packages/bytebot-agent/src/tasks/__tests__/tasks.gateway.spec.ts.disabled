/**
 * TasksGateway Unit Tests - Comprehensive WebSocket Gateway Testing
 *
 * Production-ready unit tests covering all TasksGateway functionality:
 * - WebSocket connection and disconnection handling
 * - Room management (join/leave task channels)
 * - Real-time event emission (task updates, messages, creation/deletion)
 * - Client communication and message broadcasting
 * - Event payload validation and formatting
 * - Connection lifecycle management
 * - Error handling for WebSocket operations
 * - Performance and scalability considerations
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TasksGateway } from '../tasks.gateway';
import { Server, Socket } from 'socket.io';
import {
  Task,
  TaskStatus,
  TaskType,
  TaskPriority,
  MessageRole,
  Message,
} from '@prisma/client';

// Mock Socket.IO classes
class MockSocket {
  id: string;
  rooms: Set<string> = new Set();
  callbacks: Map<string, ((...args: unknown[]) => unknown)[]> = new Map();

  constructor(id: string = 'mock-socket-id') {
    this.id = id;
  }

  async join(room: string): Promise<void> {
    this.rooms.add(room);
  }

  async leave(room: string): Promise<void> {
    this.rooms.delete(room);
  }

  on(event: string, callback: (...args: unknown[]) => unknown): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  emit(event: string, ...args: any[]): void {
    // Mock emit - in real tests we'd verify this was called
  }

  disconnect(close?: boolean): void {
    this.rooms.clear();
  }

  // Helper method to simulate receiving events
  simulateEvent(event: string, ...args: any[]): void {
    const callbacks = this.callbacks.get(event) || [];
    callbacks.forEach((callback) => callback(...args));
  }
}

class MockServer {
  clients: Map<string, MockSocket> = new Map();
  rooms: Map<string, Set<string>> = new Map();
  emittedEvents: Array<{ event: string; room?: string; data?: any }> = [];

  to(room: string) {
    return {
      emit: (event: string, data?: any) => {
        this.emittedEvents.push({ event, room, data });
      },
    };
  }

  emit(event: string, data?: any): void {
    this.emittedEvents.push({ event, data });
  }

  // Helper methods for testing
  addClient(socket: MockSocket): void {
    this.clients.set(socket.id, socket);
  }

  removeClient(socketId: string): void {
    this.clients.delete(socketId);
  }

  getEmittedEvents(): Array<{ event: string; room?: string; data?: any }> {
    return this.emittedEvents;
  }

  clearEmittedEvents(): void {
    this.emittedEvents = [];
  }
}

describe('TasksGateway', () => {
  let gateway: TasksGateway;
  let app: INestApplication;
  let mockServer: MockServer;
  let mockSocket: MockSocket;

  // Test data fixtures
  const mockTaskId = 'task-123';
  const mockClientId = 'client-456';

  const mockTask: Task = {
    id: mockTaskId,
    description: 'Test task for WebSocket',
    type: TaskType.IMMEDIATE,
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    control: MessageRole.ASSISTANT,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    createdBy: MessageRole.USER,
    userId: 'user-789',
    scheduledFor: null,
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    executedAt: null,
    completedAt: null,
    queuedAt: null,
    error: null,
    result: null,
    model: { provider: 'anthropic', name: 'claude-3-sonnet' },
  };

  const mockMessage: Message = {
    id: 'message-123',
    content: [{ type: 'text', text: 'Test WebSocket message' }],
    role: MessageRole.USER,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    taskId: mockTaskId,
    summaryId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksGateway],
    }).compile();

    app = module.createNestApplication();
    gateway = module.get<TasksGateway>(TasksGateway);

    // Set up mocks
    mockServer = new MockServer();
    mockSocket = new MockSocket(mockClientId);

    // Inject mock server into gateway using Object.defineProperty for proper WebSocket server injection
    Object.defineProperty(gateway, 'server', {
      value: mockServer as unknown as Server,
      writable: true,
      configurable: true,
    });

    await app.init();
  });

  afterEach(async () => {
    mockServer.clearEmittedEvents();
    await app.close();
  });

  describe('WebSocket Connection Management', () => {
    describe('handleConnection()', () => {
      let consoleSpy: jest.SpyInstance;

      beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      });

      afterEach(() => {
        consoleSpy.mockRestore();
      });

      it('should handle client connection successfully', () => {
        const socket = mockSocket as unknown as Socket;

        gateway.handleConnection(socket);

        expect(consoleSpy).toHaveBeenCalledWith(
          `Client connected: ${mockClientId}`,
        );
      });

      it('should handle multiple client connections', () => {
        const socket1 = new MockSocket('client-1') as unknown as Socket;
        const socket2 = new MockSocket('client-2') as unknown as Socket;

        gateway.handleConnection(socket1);
        gateway.handleConnection(socket2);

        expect(consoleSpy).toHaveBeenCalledTimes(2);
        expect(consoleSpy).toHaveBeenNthCalledWith(
          1,
          'Client connected: client-1',
        );
        expect(consoleSpy).toHaveBeenNthCalledWith(
          2,
          'Client connected: client-2',
        );
      });

      it('should handle connection with undefined socket ID gracefully', () => {
        const socket = { id: undefined } as unknown as Socket;

        expect(() => gateway.handleConnection(socket)).not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith('Client connected: undefined');
      });
    });

    describe('handleDisconnect()', () => {
      let consoleSpy: jest.SpyInstance;

      beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      });

      afterEach(() => {
        consoleSpy.mockRestore();
      });

      it('should handle client disconnection successfully', () => {
        const socket = mockSocket as unknown as Socket;

        gateway.handleDisconnect(socket);

        expect(consoleSpy).toHaveBeenCalledWith(
          `Client disconnected: ${mockClientId}`,
        );
      });

      it('should handle disconnection of non-existent client gracefully', () => {
        const socket = { id: 'non-existent' } as unknown as Socket;

        expect(() => gateway.handleDisconnect(socket)).not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith(
          'Client disconnected: non-existent',
        );
      });
    });
  });

  describe('Room Management', () => {
    describe('handleJoinTask()', () => {
      let consoleSpy: jest.SpyInstance;

      beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      });

      afterEach(() => {
        consoleSpy.mockRestore();
      });

      it('should allow client to join task room', async () => {
        const socket = mockSocket as unknown as Socket;
        const taskId = 'task-123';

        await gateway.handleJoinTask(socket, taskId);

        expect(mockSocket.rooms.has(`task_${taskId}`)).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith(
          `Client ${mockClientId} joined task ${taskId}`,
        );
      });

      it('should allow client to join multiple task rooms', async () => {
        const socket = mockSocket as unknown as Socket;
        const taskId1 = 'task-123';
        const taskId2 = 'task-456';

        await gateway.handleJoinTask(socket, taskId1);
        await gateway.handleJoinTask(socket, taskId2);

        expect(mockSocket.rooms.has(`task_${taskId1}`)).toBe(true);
        expect(mockSocket.rooms.has(`task_${taskId2}`)).toBe(true);
        expect(consoleSpy).toHaveBeenCalledTimes(2);
      });

      it('should handle joining the same room multiple times gracefully', async () => {
        const socket = mockSocket as unknown as Socket;
        const taskId = 'task-123';

        await gateway.handleJoinTask(socket, taskId);
        await gateway.handleJoinTask(socket, taskId);

        expect(mockSocket.rooms.has(`task_${taskId}`)).toBe(true);
        expect(consoleSpy).toHaveBeenCalledTimes(2);
      });

      it('should handle empty task ID gracefully', async () => {
        const socket = mockSocket as unknown as Socket;

        await gateway.handleJoinTask(socket, '');

        expect(mockSocket.rooms.has('task_')).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith(
          `Client ${mockClientId} joined task `,
        );
      });
    });

    describe('handleLeaveTask()', () => {
      let consoleSpy: jest.SpyInstance;

      beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      });

      afterEach(() => {
        consoleSpy.mockRestore();
      });

      it('should allow client to leave task room', async () => {
        const socket = mockSocket as unknown as Socket;
        const taskId = 'task-123';

        // First join the room
        await gateway.handleJoinTask(socket, taskId);
        expect(mockSocket.rooms.has(`task_${taskId}`)).toBe(true);

        // Then leave the room
        await gateway.handleLeaveTask(socket, taskId);

        expect(mockSocket.rooms.has(`task_${taskId}`)).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          `Client ${mockClientId} left task ${taskId}`,
        );
      });

      it('should handle leaving room that was not joined gracefully', async () => {
        const socket = mockSocket as unknown as Socket;
        const taskId = 'task-123';

        await gateway.handleLeaveTask(socket, taskId);

        expect(mockSocket.rooms.has(`task_${taskId}`)).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          `Client ${mockClientId} left task ${taskId}`,
        );
      });

      it('should handle leaving multiple rooms', async () => {
        const socket = mockSocket as unknown as Socket;
        const taskId1 = 'task-123';
        const taskId2 = 'task-456';

        // Join both rooms
        await gateway.handleJoinTask(socket, taskId1);
        await gateway.handleJoinTask(socket, taskId2);

        // Leave first room
        await gateway.handleLeaveTask(socket, taskId1);

        expect(mockSocket.rooms.has(`task_${taskId1}`)).toBe(false);
        expect(mockSocket.rooms.has(`task_${taskId2}`)).toBe(true);
      });
    });
  });

  describe('Event Emission', () => {
    beforeEach(() => {
      mockServer.clearEmittedEvents();
    });

    describe('emitTaskUpdate()', () => {
      it('should emit task update to specific task room', () => {
        const taskId = 'task-123';
        const updatedTask = { ...mockTask, status: TaskStatus.RUNNING };

        gateway.emitTaskUpdate(taskId, updatedTask);

        const events = mockServer.getEmittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toEqual({
          event: 'task_updated',
          room: `task_${taskId}`,
          data: updatedTask,
        });
      });

      it('should handle task update with minimal data', () => {
        const taskId = 'task-123';
        const minimalUpdate = { id: taskId, status: TaskStatus.COMPLETED };

        gateway.emitTaskUpdate(taskId, minimalUpdate);

        const events = mockServer.getEmittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toEqual({
          event: 'task_updated',
          room: `task_${taskId}`,
          data: minimalUpdate,
        });
      });

      it('should handle multiple task updates', () => {
        const taskId1 = 'task-123';
        const taskId2 = 'task-456';
        const update1 = {
          ...mockTask,
          id: taskId1,
          status: TaskStatus.RUNNING,
        };
        const update2 = {
          ...mockTask,
          id: taskId2,
          status: TaskStatus.COMPLETED,
        };

        gateway.emitTaskUpdate(taskId1, update1);
        gateway.emitTaskUpdate(taskId2, update2);

        const events = mockServer.getEmittedEvents();
        expect(events).toHaveLength(2);
        expect(events[0].room).toBe(`task_${taskId1}`);
        expect(events[1].room).toBe(`task_${taskId2}`);
      });

      it('should handle null/undefined task data gracefully', () => {
        const taskId = 'task-123';

        expect(() => {
          gateway.emitTaskUpdate(taskId, null);
          gateway.emitTaskUpdate(taskId, undefined);
        }).not.toThrow();

        const events = mockServer.getEmittedEvents();
        expect(events).toHaveLength(2);
        expect(events[0].data).toBeNull();
        expect(events[1].data).toBeUndefined();
      });
    });

    describe('emitNewMessage()', () => {
      it('should emit new message to specific task room', () => {
        const taskId = 'task-123';

        gateway.emitNewMessage(taskId, mockMessage);

        const events = mockServer.getEmittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toEqual({
          event: 'new_message',
          room: `task_${taskId}`,
          data: mockMessage,
        });
      });

      it('should handle message with complex content', () => {
        const taskId = 'task-123';
        const complexMessage = {
          ...mockMessage,
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'image', url: 'https://example.com/image.jpg' },
            { type: 'tool_result', result: { success: true, data: 'result' } },
          ],
        };

        gateway.emitNewMessage(taskId, complexMessage);

        const events = mockServer.getEmittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0].data.content).toHaveLength(3);
      });

      it('should handle multiple messages for same task', () => {
        const taskId = 'task-123';
        const message1 = {
          ...mockMessage,
          id: 'msg-1',
          content: [{ type: 'text', text: 'First' }],
        };
        const message2 = {
          ...mockMessage,
          id: 'msg-2',
          content: [{ type: 'text', text: 'Second' }],
        };

        gateway.emitNewMessage(taskId, message1);
        gateway.emitNewMessage(taskId, message2);

        const events = mockServer.getEmittedEvents();
        expect(events).toHaveLength(2);
        expect(events[0].room).toBe(`task_${taskId}`);
        expect(events[1].room).toBe(`task_${taskId}`);
        expect(events[0].data.id).toBe('msg-1');
        expect(events[1].data.id).toBe('msg-2');
      });
    });

    describe('emitTaskCreated()', () => {
      it('should emit task creation to all clients', () => {
        gateway.emitTaskCreated(mockTask);

        const events = mockServer.getEmittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toEqual({
          event: 'task_created',
          data: mockTask,
        });
      });

      it('should handle task creation with files', () => {
        const taskWithFiles = {
          ...mockTask,
          files: [
            { id: 'file-1', name: 'test.txt', type: 'text/plain', size: 1024 },
            { id: 'file-2', name: 'image.jpg', type: 'image/jpeg', size: 2048 },
          ],
        };

        gateway.emitTaskCreated(taskWithFiles);

        const events = mockServer.getEmittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0].data.files).toHaveLength(2);
      });

      it('should handle multiple task creations', () => {
        const task1 = { ...mockTask, id: 'task-1' };
        const task2 = { ...mockTask, id: 'task-2' };

        gateway.emitTaskCreated(task1);
        gateway.emitTaskCreated(task2);

        const events = mockServer.getEmittedEvents();
        expect(events).toHaveLength(2);
        expect(events[0].data.id).toBe('task-1');
        expect(events[1].data.id).toBe('task-2');
      });
    });

    describe('emitTaskDeleted()', () => {
      it('should emit task deletion to all clients', () => {
        const taskId = 'task-123';

        gateway.emitTaskDeleted(taskId);

        const events = mockServer.getEmittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toEqual({
          event: 'task_deleted',
          data: taskId,
        });
      });

      it('should handle multiple task deletions', () => {
        const taskId1 = 'task-123';
        const taskId2 = 'task-456';

        gateway.emitTaskDeleted(taskId1);
        gateway.emitTaskDeleted(taskId2);

        const events = mockServer.getEmittedEvents();
        expect(events).toHaveLength(2);
        expect(events[0].data).toBe(taskId1);
        expect(events[1].data).toBe(taskId2);
      });

      it('should handle empty or invalid task IDs', () => {
        expect(() => {
          gateway.emitTaskDeleted('');
          gateway.emitTaskDeleted(null as any);
          gateway.emitTaskDeleted(undefined as any);
        }).not.toThrow();

        const events = mockServer.getEmittedEvents();
        expect(events).toHaveLength(3);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle server not being initialized', () => {
      // Create gateway without server
      const gatewayWithoutServer = new TasksGateway();

      expect(() => {
        gatewayWithoutServer.emitTaskCreated(mockTask);
      }).toThrow();
    });

    it('should handle malformed socket objects gracefully', () => {
      const malformedSocket = {} as Socket;

      expect(() => {
        gateway.handleConnection(malformedSocket);
        gateway.handleDisconnect(malformedSocket);
      }).not.toThrow();
    });

    it('should handle concurrent room operations', async () => {
      const socket = mockSocket as unknown as Socket;
      const taskId = 'task-123';

      // Simulate concurrent join/leave operations
      const operations = [
        gateway.handleJoinTask(socket, taskId),
        gateway.handleLeaveTask(socket, taskId),
        gateway.handleJoinTask(socket, taskId),
        gateway.handleLeaveTask(socket, taskId),
      ];

      await Promise.all(operations);

      // Should handle all operations without throwing
      expect(operations).toHaveLength(4);
    });

    it('should handle rapid event emissions', () => {
      const taskId = 'task-123';

      // Emit many events rapidly
      for (let i = 0; i < 100; i++) {
        const task = { ...mockTask, id: `task-${i}` };
        gateway.emitTaskUpdate(taskId, task);
        gateway.emitNewMessage(taskId, { ...mockMessage, id: `msg-${i}` });
      }

      const events = mockServer.getEmittedEvents();
      expect(events).toHaveLength(200); // 100 updates + 100 messages
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large payloads efficiently', () => {
      const taskId = 'task-123';
      const largeTask = {
        ...mockTask,
        description: 'A'.repeat(10000), // 10KB description
        metadata: {
          largeProp: 'B'.repeat(50000), // 50KB metadata
          arrayProp: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            data: `item-${i}`,
          })),
        },
      };

      const startTime = Date.now();
      gateway.emitTaskUpdate(taskId, largeTask);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms

      const events = mockServer.getEmittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].data.description).toHaveLength(10000);
    });

    it('should handle many simultaneous client connections', () => {
      const clientCount = 1000;
      const sockets = Array.from(
        { length: clientCount },
        (_, i) => new MockSocket(`client-${i}`) as unknown as Socket,
      );

      // Connect all clients
      const startTime = Date.now();
      sockets.forEach((socket) => gateway.handleConnection(socket));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should handle 1000 connections within 1 second
    });

    it('should efficiently manage many task rooms', async () => {
      const socket = mockSocket as unknown as Socket;
      const roomCount = 100;

      // Join many rooms
      const startTime = Date.now();
      for (let i = 0; i < roomCount; i++) {
        await gateway.handleJoinTask(socket, `task-${i}`);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should handle 100 room joins within 1 second
      expect(mockSocket.rooms.size).toBe(roomCount);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete task lifecycle workflow', async () => {
      const socket = mockSocket as unknown as Socket;
      const taskId = 'task-lifecycle-123';

      // 1. Client connects
      gateway.handleConnection(socket);

      // 2. Client joins task room
      await gateway.handleJoinTask(socket, taskId);

      // 3. Task is created
      gateway.emitTaskCreated(mockTask);

      // 4. Task receives updates
      gateway.emitTaskUpdate(taskId, {
        ...mockTask,
        status: TaskStatus.RUNNING,
      });
      gateway.emitTaskUpdate(taskId, {
        ...mockTask,
        status: TaskStatus.COMPLETED,
      });

      // 5. Messages are added
      gateway.emitNewMessage(taskId, mockMessage);

      // 6. Client leaves task room
      await gateway.handleLeaveTask(socket, taskId);

      // 7. Task is deleted
      gateway.emitTaskDeleted(taskId);

      // 8. Client disconnects
      gateway.handleDisconnect(socket);

      const events = mockServer.getEmittedEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(mockSocket.rooms.has(`task_${taskId}`)).toBe(false);
    });

    it('should handle multi-client collaboration scenario', async () => {
      const socket1 = new MockSocket('client-1') as unknown as Socket;
      const socket2 = new MockSocket('client-2') as unknown as Socket;
      const taskId = 'collaboration-task-123';

      // Multiple clients connect and join same task
      gateway.handleConnection(socket1);
      gateway.handleConnection(socket2);

      await gateway.handleJoinTask(socket1, taskId);
      await gateway.handleJoinTask(socket2, taskId);

      // Emit updates that should reach both clients
      gateway.emitTaskUpdate(taskId, {
        ...mockTask,
        status: TaskStatus.RUNNING,
      });
      gateway.emitNewMessage(taskId, mockMessage);

      const events = mockServer.getEmittedEvents();
      const taskUpdates = events.filter((e) => e.event === 'task_updated');
      const newMessages = events.filter((e) => e.event === 'new_message');

      expect(taskUpdates).toHaveLength(1);
      expect(newMessages).toHaveLength(1);
      expect(taskUpdates[0].room).toBe(`task_${taskId}`);
      expect(newMessages[0].room).toBe(`task_${taskId}`);
    });
  });
});
