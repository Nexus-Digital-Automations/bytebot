/**
 * WebSocket Mock Services for Bytebot-Agent Testing
 *
 * Comprehensive mocking suite for WebSocket functionality including:
 * - Socket.IO server and client mocks with full event lifecycle
 * - Native WebSocket connection mocks with state management
 * - Real-time message broadcasting and room management
 * - Connection pooling and lifecycle management
 * - Event handling and error simulation
 * - Performance testing utilities
 *
 * Enterprise-grade testing patterns:
 * - TypeScript strict mode compliance
 * - Jest mock patterns with full type safety
 * - Comprehensive documentation and examples
 * - Production-ready error handling
 * - Performance monitoring capabilities
 *
 * @author Claude Code
 * @version 2.0.0
 * @requires jest
 * @requires socket.io
 * @requires socket.io-client
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPE DEFINITIONS AND INTERFACES
// ============================================================================

/**
 * WebSocket connection states for lifecycle management
 */
export enum WebSocketState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

/**
 * Mock WebSocket client connection interface
 */
export interface MockWebSocketClient {
  id: string;
  connected: boolean;
  state: WebSocketState;
  rooms: Set<string>;
  lastActivity: Date;
  emit: jest.MockedFunction<(event: string, ...args: any[]) => boolean>;
  on: jest.MockedFunction<
    (event: string, callback: (...args: any[]) => void) => any
  >;
  off: jest.MockedFunction<
    (event: string, callback?: (...args: any[]) => void) => any
  >;
  join: jest.MockedFunction<(room: string) => Promise<void>>;
  leave: jest.MockedFunction<(room: string) => Promise<void>>;
  disconnect: jest.MockedFunction<(close?: boolean) => void>;
}

/**
 * Mock WebSocket server interface
 */
export interface MockWebSocketServer {
  clients: Map<string, MockWebSocketClient>;
  rooms: Map<string, Set<string>>;
  eventHistory: Array<{
    timestamp: Date;
    event: string;
    clientId?: string;
    room?: string;
    data: any;
  }>;
  emit: jest.MockedFunction<(event: string, ...args: any[]) => boolean>;
  to: jest.MockedFunction<(room: string) => any>;
  in: jest.MockedFunction<(room: string) => any>;
  on: jest.MockedFunction<
    (event: string, callback: (...args: any[]) => void) => any
  >;
  off: jest.MockedFunction<
    (event: string, callback?: (...args: any[]) => void) => any
  >;
  close: jest.MockedFunction<() => void>;
}

/**
 * WebSocket mock configuration options
 */
export interface WebSocketMockConfig {
  enableLatencySimulation?: boolean;
  latencyMs?: number;
  enableErrorSimulation?: boolean;
  errorRate?: number;
  maxConnections?: number;
  enableRoomManagement?: boolean;
  enableEventHistory?: boolean;
  autoCleanup?: boolean;
  heartbeatInterval?: number;
}

/**
 * WebSocket event types for task management
 */
export interface TaskWebSocketEvents {
  // Client to Server events
  join_task: (taskId: string) => void;
  leave_task: (taskId: string) => void;
  task_update: (taskId: string, data: any) => void;
  add_message: (taskId: string, message: any) => void;

  // Server to Client events
  task_updated: (task: any) => void;
  new_message: (message: any) => void;
  task_created: (task: any) => void;
  task_deleted: (taskId: string) => void;
  connection_status: (status: 'connected' | 'disconnected' | 'error') => void;
}

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

/**
 * Mock Socket.IO Client Implementation
 * Provides comprehensive client-side WebSocket mocking with full event handling
 */
export class MockSocketIOClient
  extends EventEmitter
  implements MockWebSocketClient
{
  public id: string;
  public connected: boolean = false;
  public state: WebSocketState = WebSocketState.CLOSED;
  public rooms: Set<string> = new Set();
  public lastActivity: Date = new Date();

  // Mock functions with Jest typing
  public emit = jest.fn() as jest.MockedFunction<
    (event: string, ...args: any[]) => boolean
  >;
  public on = jest.fn() as jest.MockedFunction<
    (event: string, callback: (...args: any[]) => void) => this
  >;
  public off = jest.fn() as jest.MockedFunction<
    (event: string, callback?: (...args: any[]) => void) => this
  >;
  public join = jest.fn() as jest.MockedFunction<
    (room: string) => Promise<void>
  >;
  public leave = jest.fn() as jest.MockedFunction<
    (room: string) => Promise<void>
  >;
  public disconnect = jest.fn() as jest.MockedFunction<
    (close?: boolean) => void
  >;

  private eventListeners: Map<string, ((...args: any[]) => void)[]> = new Map();
  private config: WebSocketMockConfig;

  constructor(config: WebSocketMockConfig = {}) {
    super();
    this.id = `mock-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.config = {
      enableLatencySimulation: false,
      latencyMs: 50,
      enableErrorSimulation: false,
      errorRate: 0.01,
      enableRoomManagement: true,
      enableEventHistory: true,
      ...config,
    };

    this.setupMockBehavior();
  }

  /**
   * Process event with error simulation
   */
  private processEvent(event: string, args: any[]): void {
    if (
      this.config.enableErrorSimulation &&
      Math.random() < (this.config.errorRate || 0)
    ) {
      throw new Error(`Mock WebSocket error during emit: ${event}`);
    }

    // Trigger listeners for the event
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach((callback) => {
      try {
        callback(...(args as unknown[]));
      } catch (error) {
        console.warn(
          `Mock WebSocket listener error for event ${event}:`,
          error,
        );
      }
    });

    super.emit(event, ...(args as unknown[]));
  }

  /**
   * Setup mock behavior and event handling
   */
  private setupMockBehavior(): void {
    // Mock emit behavior with latency simulation
    this.emit.mockImplementation((event: string, ...args: any[]) => {
      this.lastActivity = new Date();

      if (this.config.enableLatencySimulation && this.config.latencyMs) {
        setTimeout(() => {
          this.processEvent(event, args);
        }, this.config.latencyMs);
      } else {
        this.processEvent(event, args);
      }
      return true;
    });

    // Mock on behavior for event registration
    this.on.mockImplementation(
      (event: string, callback: (...args: any[]) => void) => {
        if (!this.eventListeners.has(event)) {
          this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
        super.on(event, callback);
        return this;
      },
    );

    // Mock off behavior for event deregistration
    this.off.mockImplementation(
      (event: string, callback?: (...args: any[]) => void) => {
        if (callback) {
          const listeners = this.eventListeners.get(event) || [];
          const index = listeners.indexOf(callback);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        } else {
          this.eventListeners.delete(event);
        }
        super.off(event, callback as (...args: any[]) => void);
        return this;
      },
    );

    // Mock join room behavior
    this.join.mockImplementation((room: string) => {
      if (this.config.enableRoomManagement) {
        this.rooms.add(room);
        this.emit('room_joined', room);
      }
      return Promise.resolve();
    });

    // Mock leave room behavior
    this.leave.mockImplementation((room: string) => {
      if (this.config.enableRoomManagement) {
        this.rooms.delete(room);
        this.emit('room_left', room);
      }
      return Promise.resolve();
    });

    // Mock disconnect behavior
    this.disconnect.mockImplementation((close?: boolean) => {
      this.connected = false;
      this.state = WebSocketState.CLOSED;
      this.rooms.clear();
      this.emit(
        'disconnect',
        close ? 'client namespace disconnect' : 'transport close',
      );
    });
  }

  /**
   * Simulate connection establishment
   */
  public connect(): void {
    this.state = WebSocketState.CONNECTING;

    setTimeout(() => {
      this.connected = true;
      this.state = WebSocketState.OPEN;
      this.emit('connect');
    }, this.config.latencyMs || 10);
  }

  /**
   * Simulate connection error
   */
  public simulateError(errorMessage: string = 'Mock connection error'): void {
    const error = new Error(errorMessage);
    this.emit('error', error);
    this.connected = false;
    this.state = WebSocketState.CLOSED;
  }

  /**
   * Get current connection status
   */
  public getStatus(): {
    id: string;
    connected: boolean;
    state: string;
    roomCount: number;
    lastActivity: string;
  } {
    return {
      id: this.id,
      connected: this.connected,
      state: WebSocketState[this.state],
      roomCount: this.rooms.size,
      lastActivity: this.lastActivity.toISOString(),
    };
  }
}

/**
 * Mock Socket.IO Server Implementation
 * Provides comprehensive server-side WebSocket mocking with room management
 */
export class MockSocketIOServer implements MockWebSocketServer {
  public clients: Map<string, MockWebSocketClient> = new Map();
  public rooms: Map<string, Set<string>> = new Map();
  public eventHistory: Array<{
    timestamp: Date;
    event: string;
    clientId?: string;
    room?: string;
    data: any;
  }> = [];

  // Mock functions with Jest typing
  public emit = jest.fn() as jest.MockedFunction<
    (event: string, ...args: any[]) => boolean
  >;
  public to = jest.fn() as jest.MockedFunction<(room: string) => any>;
  public in = jest.fn() as jest.MockedFunction<(room: string) => any>;
  public on = jest.fn() as jest.MockedFunction<
    (event: string, callback: (...args: unknown[]) => void) => this
  >;
  public off = jest.fn() as jest.MockedFunction<
    (event: string, callback?: (...args: unknown[]) => void) => this
  >;
  public close = jest.fn() as jest.MockedFunction<() => void>;

  private config: WebSocketMockConfig;
  private eventListeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  constructor(config: WebSocketMockConfig = {}) {
    this.config = {
      enableLatencySimulation: false,
      latencyMs: 50,
      enableErrorSimulation: false,
      errorRate: 0.01,
      maxConnections: 1000,
      enableRoomManagement: true,
      enableEventHistory: true,
      autoCleanup: true,
      ...config,
    };

    this.setupMockBehavior();
  }

  /**
   * Setup mock server behavior
   */
  private setupMockBehavior(): void {
    // Mock global emit behavior
    this.emit.mockImplementation((event: string, ...args: any[]) => {
      if (this.config.enableEventHistory) {
        this.eventHistory.push({
          timestamp: new Date(),
          event,
          data: args,
        });
      }

      // Emit to all connected clients
      this.clients.forEach((client) => {
        if (client.connected) {
          client.emit(event, ...(args as unknown[]));
        }
      });

      return true;
    });

    // Mock room-based emit behavior
    const mockRoomEmitter = {
      emit: jest.fn((_event: string, ..._args: unknown[]) => {
        // Implementation handled by setupRoomBehavior
        return true;
      }),
    };

    this.to.mockImplementation((room: string) => {
      this.setupRoomBehavior(mockRoomEmitter, room);
      return mockRoomEmitter;
    });

    this.in.mockImplementation((room: string) => {
      this.setupRoomBehavior(mockRoomEmitter, room);
      return mockRoomEmitter;
    });

    // Mock event listener registration
    this.on.mockImplementation(
      (event: string, callback: (...args: any[]) => void) => {
        if (!this.eventListeners.has(event)) {
          this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
        return this;
      },
    );

    // Mock server close behavior
    this.close.mockImplementation(() => {
      this.clients.forEach((client) => client.disconnect(true));
      this.clients.clear();
      this.rooms.clear();
      if (this.config.enableEventHistory) {
        this.eventHistory.push({
          timestamp: new Date(),
          event: 'server_close',
          data: [],
        });
      }
    });
  }

  /**
   * Setup room-specific emit behavior
   */
  private setupRoomBehavior(
    roomEmitter: { emit: jest.MockedFunction<any> },
    room: string,
  ): void {
    (
      roomEmitter.emit as jest.MockedFunction<
        (event: string, ...args: unknown[]) => boolean
      >
    ).mockImplementation((event: string, ...args: unknown[]) => {
      if (this.config.enableEventHistory) {
        this.eventHistory.push({
          timestamp: new Date(),
          event,
          room,
          data: args,
        });
      }

      const roomClients = this.rooms.get(room);
      if (roomClients) {
        roomClients.forEach((clientId) => {
          const client = this.clients.get(clientId);
          if (client && client.connected) {
            client.emit(event, ...args);
          }
        });
      }

      return true;
    });
  }

  /**
   * Add a mock client to the server
   */
  public addClient(client: MockWebSocketClient): void {
    if (this.clients.size >= (this.config.maxConnections || 1000)) {
      throw new Error('Maximum connections reached');
    }

    this.clients.set(client.id, client);

    // Setup client room management
    if (this.config.enableRoomManagement) {
      client.join.mockImplementation((room: string) => {
        if (!this.rooms.has(room)) {
          this.rooms.set(room, new Set());
        }
        this.rooms.get(room).add(client.id);
        client.rooms.add(room);
        return Promise.resolve();
      });

      client.leave.mockImplementation((room: string) => {
        const roomClients = this.rooms.get(room);
        if (roomClients) {
          roomClients.delete(client.id);
          if (roomClients.size === 0) {
            this.rooms.delete(room);
          }
        }
        client.rooms.delete(room);
        return Promise.resolve();
      });
    }

    // Simulate connection event
    setTimeout(() => {
      const listeners = this.eventListeners.get('connection') || [];
      listeners.forEach((callback) => callback(client));
    }, this.config.latencyMs || 10);
  }

  /**
   * Remove a client from the server
   */
  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from all rooms
      client.rooms.forEach((room) => {
        const roomClients = this.rooms.get(room);
        if (roomClients) {
          roomClients.delete(clientId);
          if (roomClients.size === 0) {
            this.rooms.delete(room);
          }
        }
      });

      client.disconnect(true);
      this.clients.delete(clientId);

      // Simulate disconnect event
      const listeners = this.eventListeners.get('disconnect') || [];
      listeners.forEach((callback) => callback(client));
    }
  }

  /**
   * Get server statistics
   */
  public getStats(): {
    connectedClients: number;
    totalRooms: number;
    eventHistorySize: number;
    roomDetails: Array<{ name: string; clientCount: number }>;
  } {
    return {
      connectedClients: Array.from(this.clients.values()).filter(
        (c) => c.connected,
      ).length,
      totalRooms: this.rooms.size,
      eventHistorySize: this.eventHistory.length,
      roomDetails: Array.from(this.rooms.entries()).map(([name, clients]) => ({
        name,
        clientCount: clients.size,
      })),
    };
  }

  /**
   * Clear event history for testing
   */
  public clearEventHistory(): void {
    this.eventHistory = [];
  }
}

// ============================================================================
// NATIVE WEBSOCKET MOCKS
// ============================================================================

/**
 * Mock Native WebSocket Implementation
 * For testing native WebSocket connections (non-Socket.IO)
 */
export class MockNativeWebSocket extends EventEmitter {
  public url: string;
  public protocol: string;
  public readyState: WebSocketState = WebSocketState.CLOSED;
  public bufferedAmount: number = 0;
  public extensions: string = '';
  public binaryType: 'blob' | 'arraybuffer' = 'blob';

  // Mock methods
  public send = jest.fn();
  public close = jest.fn();
  public addEventListener = jest.fn();
  public removeEventListener = jest.fn();

  private config: WebSocketMockConfig;

  constructor(
    url: string,
    protocols?: string | string[],
    config: WebSocketMockConfig = {},
  ) {
    super();
    this.url = url;
    this.protocol = Array.isArray(protocols)
      ? protocols[0] || ''
      : protocols || '';
    this.config = {
      enableLatencySimulation: false,
      latencyMs: 50,
      enableErrorSimulation: false,
      errorRate: 0.01,
      ...config,
    };

    this.setupMockBehavior();
    this.simulateConnection();
  }

  /**
   * Setup mock WebSocket behavior
   */
  private setupMockBehavior(): void {
    this.send.mockImplementation((data: string | ArrayBuffer | Blob) => {
      if (this.readyState !== WebSocketState.OPEN) {
        throw new Error('WebSocket is not open');
      }

      if (
        this.config.enableErrorSimulation &&
        Math.random() < (this.config.errorRate || 0)
      ) {
        this.emit('error', new Error('Mock WebSocket send error'));
        return;
      }

      // Simulate message echo for testing
      setTimeout(() => {
        if (this.readyState === WebSocketState.OPEN) {
          this.emit('message', { data, type: 'message' });
        }
      }, this.config.latencyMs || 10);
    });

    this.close.mockImplementation((code?: number, reason?: string) => {
      this.readyState = WebSocketState.CLOSING;

      setTimeout(() => {
        this.readyState = WebSocketState.CLOSED;
        this.emit('close', {
          code: code || 1000,
          reason: reason || '',
          wasClean: true,
        });
      }, this.config.latencyMs || 10);
    });

    this.addEventListener.mockImplementation(
      (type: string, listener: (...args: any[]) => void) => {
        this.on(type, listener);
      },
    );

    this.removeEventListener.mockImplementation(
      (type: string, listener: (...args: any[]) => void) => {
        this.off(type, listener);
      },
    );
  }

  /**
   * Simulate WebSocket connection process
   */
  private simulateConnection(): void {
    this.readyState = WebSocketState.CONNECTING;

    setTimeout(() => {
      if (
        this.config.enableErrorSimulation &&
        Math.random() < (this.config.errorRate || 0)
      ) {
        this.emit('error', new Error('Mock WebSocket connection error'));
        this.readyState = WebSocketState.CLOSED;
        return;
      }

      this.readyState = WebSocketState.OPEN;
      this.emit('open', {});
    }, this.config.latencyMs || 100);
  }

  /**
   * Simulate incoming message
   */
  public simulateMessage(data: string | ArrayBuffer | Blob): void {
    if (this.readyState === WebSocketState.OPEN) {
      this.emit('message', { data, type: 'message' });
    }
  }

  /**
   * Simulate connection error
   */
  public simulateError(error: string = 'Mock WebSocket error'): void {
    this.emit('error', new Error(error));
  }
}

// ============================================================================
// FACTORY FUNCTIONS AND UTILITIES
// ============================================================================

/**
 * Create a mock Socket.IO server with configurable behavior
 */
export const createMockSocketIOServer = (
  config?: WebSocketMockConfig,
): MockSocketIOServer => {
  return new MockSocketIOServer(config);
};

/**
 * Create a mock Socket.IO client with configurable behavior
 */
export const createMockSocketIOClient = (
  config?: WebSocketMockConfig,
): MockSocketIOClient => {
  return new MockSocketIOClient(config);
};

/**
 * Create a mock native WebSocket with configurable behavior
 */
export const createMockNativeWebSocket = (
  url: string,
  protocols?: string | string[],
  config?: WebSocketMockConfig,
): MockNativeWebSocket => {
  return new MockNativeWebSocket(url, protocols, config);
};

/**
 * Create a full WebSocket testing environment
 */
export const createWebSocketTestEnvironment = (
  config?: WebSocketMockConfig,
) => {
  const server = createMockSocketIOServer(config);
  const clients: MockSocketIOClient[] = [];

  const addClient = (
    clientConfig?: WebSocketMockConfig,
  ): MockSocketIOClient => {
    const client = createMockSocketIOClient(clientConfig || config);
    clients.push(client);
    server.addClient(client);
    client.connect();
    return client;
  };

  const removeClient = (client: MockSocketIOClient): void => {
    server.removeClient(client.id);
    const index = clients.indexOf(client);
    if (index > -1) {
      clients.splice(index, 1);
    }
  };

  const cleanup = (): void => {
    clients.forEach((client) => client.disconnect(true));
    clients.length = 0;
    server.close();
  };

  return {
    server,
    clients,
    addClient,
    removeClient,
    cleanup,
    getStats: () => server.getStats(),
  };
};

// ============================================================================
// JEST MOCK SETUP AND UTILITIES
// ============================================================================

/**
 * Setup Jest mocks for Socket.IO
 * Call this in your test setup to automatically mock Socket.IO
 */
export const setupSocketIOMocks = (): void => {
  // Mock Socket.IO server
  jest.mock('socket.io', () => ({
    Server: jest.fn().mockImplementation(() => createMockSocketIOServer()),
  }));

  // Mock Socket.IO client
  jest.mock('socket.io-client', () => ({
    io: jest.fn().mockImplementation(() => createMockSocketIOClient()),
    Socket: jest.fn().mockImplementation(() => createMockSocketIOClient()),
  }));
};

/**
 * Setup Jest mocks for native WebSocket
 */
export const setupNativeWebSocketMocks = (): void => {
  // Mock global WebSocket
  const globalObj = global as Record<string, unknown>;
  globalObj.WebSocket = jest
    .fn()
    .mockImplementation((url: string, protocols?: string | string[]) =>
      createMockNativeWebSocket(url, protocols),
    );
};

/**
 * Reset all WebSocket mocks
 */
export const resetWebSocketMocks = (): void => {
  jest.clearAllMocks();
  jest.resetAllMocks();
};

// ============================================================================
// TESTING UTILITIES AND HELPERS
// ============================================================================

/**
 * Wait for WebSocket event with timeout
 */
export const waitForWebSocketEvent = (
  emitter: EventEmitter,
  event: string,
  timeout: number = 5000,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout waiting for WebSocket event: ${event}`));
    }, timeout);

    emitter.once(event, (data) => {
      clearTimeout(timeoutId);
      resolve(data);
    });
  });
};

/**
 * Simulate network latency for testing
 */
export const simulateNetworkLatency = (ms: number = 100): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Create task-specific WebSocket test helpers
 */
export const createTaskWebSocketHelpers = (
  server: MockSocketIOServer,
  client: MockWebSocketClient,
) => {
  const joinTask = async (taskId: string): Promise<void> => {
    await client.join(`task_${taskId}`);
  };

  const leaveTask = async (taskId: string): Promise<void> => {
    await client.leave(`task_${taskId}`);
  };

  const emitTaskUpdate = (taskId: string, task: unknown): void => {
    const roomEmitter = server.to(`task_${taskId}`) as {
      emit: (event: string, ...args: unknown[]) => boolean;
    };
    roomEmitter.emit('task_updated', task);
  };

  const emitNewMessage = (taskId: string, message: unknown): void => {
    const roomEmitter = server.to(`task_${taskId}`) as {
      emit: (event: string, ...args: unknown[]) => boolean;
    };
    roomEmitter.emit('new_message', message);
  };

  const waitForTaskEvent = (
    event: string,
    timeout: number = 5000,
  ): Promise<any> => {
    // Create a compatible EventEmitter-like object for the client
    const emitterCompat = {
      once: (eventName: string, listener: (...args: any[]) => void) => {
        // Use the mock client's on method which should work with EventEmitter interface
        client.on(eventName, listener);
      },
    };
    return waitForWebSocketEvent(emitterCompat as EventEmitter, event, timeout);
  };

  return {
    joinTask,
    leaveTask,
    emitTaskUpdate,
    emitNewMessage,
    waitForTaskEvent,
  };
};

// ============================================================================
// PERFORMANCE TESTING UTILITIES
// ============================================================================

/**
 * WebSocket performance testing utilities
 */
export const createPerformanceTestUtils = () => {
  const measurements: Array<{
    operation: string;
    startTime: number;
    endTime: number;
    duration: number;
  }> = [];

  const startMeasurement = (operation: string): number => {
    const startTime = performance.now();
    measurements.push({
      operation,
      startTime,
      endTime: 0,
      duration: 0,
    });
    return startTime;
  };

  const endMeasurement = (operation: string): number => {
    const endTime = performance.now();
    const measurement = measurements.find(
      (m) => m.operation === operation && m.endTime === 0,
    );
    if (measurement) {
      measurement.endTime = endTime;
      measurement.duration = endTime - measurement.startTime;
      return measurement.duration;
    }
    return 0;
  };

  const getPerformanceReport = () => {
    const completedMeasurements = measurements.filter((m) => m.endTime > 0);
    const totalOperations = completedMeasurements.length;
    const averageDuration =
      totalOperations > 0
        ? completedMeasurements.reduce((sum, m) => sum + m.duration, 0) /
          totalOperations
        : 0;
    const maxDuration = Math.max(
      ...completedMeasurements.map((m) => m.duration),
      0,
    );
    const minDuration = Math.min(
      ...completedMeasurements.map((m) => m.duration),
      0,
    );

    return {
      totalOperations,
      averageDuration,
      maxDuration,
      minDuration,
      measurements: completedMeasurements,
    };
  };

  const clearMeasurements = (): void => {
    measurements.length = 0;
  };

  return {
    startMeasurement,
    endMeasurement,
    getPerformanceReport,
    clearMeasurements,
  };
};

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

// Classes are already exported at declaration
// Additional type exports can be added here if needed
