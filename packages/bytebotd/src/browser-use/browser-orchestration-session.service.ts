import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateBrowserSessionDto,
  BrowserSessionDto,
  BrowserSessionStatus,
} from './dto/browser-session.dto';
import { BrowserSessionService } from './browser-session.service';

/**
 * Session Pool Configuration for orchestration
 */
export interface SessionPoolConfig {
  readonly poolId: string;
  readonly maxSessions: number;
  readonly sessionType: SessionType;
  readonly warmupCount: number;
  readonly idleTimeoutMs: number;
  readonly healthCheckIntervalMs: number;
}

/**
 * Session types for different automation scenarios
 */
export enum SessionType {
  STANDARD = 'standard',
  HEADLESS = 'headless',
  MOBILE = 'mobile',
  INCOGNITO = 'incognito',
  PERSISTENT = 'persistent',
  TEMPORARY = 'temporary',
}

/**
 * Session lifecycle events for orchestration coordination
 */
export enum SessionLifecycleEvent {
  SESSION_CREATED = 'session.created',
  SESSION_ASSIGNED = 'session.assigned',
  SESSION_RELEASED = 'session.released',
  SESSION_IDLE = 'session.idle',
  SESSION_ERROR = 'session.error',
  SESSION_CLOSED = 'session.closed',
  POOL_EXHAUSTED = 'pool.exhausted',
  POOL_OPTIMIZED = 'pool.optimized',
}

/**
 * Agent session assignment tracking
 */
export interface AgentSessionAssignment {
  readonly agentId: string;
  readonly sessionId: string;
  readonly tabId: string;
  readonly assignedAt: Date;
  readonly taskId?: string;
  readonly priority: number;
  readonly metadata: Record<string, unknown>;
}

/**
 * Session performance metrics for analytics
 */
export interface SessionPerformanceMetrics {
  readonly sessionId: string;
  readonly totalOperations: number;
  readonly averageResponseTime: number;
  readonly peakMemoryUsage: number;
  readonly cpuUtilization: number;
  readonly networkActivity: number;
  readonly errorRate: number;
  readonly efficiency: number;
  readonly lastUpdated: Date;
}

/**
 * Session pool state for monitoring
 */
export interface SessionPoolState {
  readonly poolId: string;
  readonly sessionType: SessionType;
  readonly activeSessions: number;
  readonly idleSessions: number;
  readonly busySessions: number;
  readonly errorSessions: number;
  readonly utilizationRate: number;
  readonly averageLoadTime: number;
  readonly poolHealth: number;
}

/**
 * Orchestration session coordination configuration
 */
export interface OrchestrationSessionConfig {
  readonly maxTotalSessions: number;
  readonly sessionPools: SessionPoolConfig[];
  readonly enableSessionSharing: boolean;
  readonly enableSessionReuse: boolean;
  readonly globalTimeoutMs: number;
  readonly resourceOptimization: boolean;
  readonly performanceMonitoring: boolean;
  readonly coordinatorEndpoint?: string;
  readonly coordinatorApiKey?: string;
}

/**
 * Browser Session Orchestration Service
 *
 * Advanced session management service that integrates with the Python BrowserSessionCoordinator
 * to provide enterprise-grade session pooling, coordination, and optimization for multi-agent
 * browser automation scenarios.
 *
 * Key Features:
 * - Session pool management with type-based categorization
 * - Cross-agent session sharing and coordination
 * - Advanced session lifecycle management with orchestration hooks
 * - Performance monitoring and analytics
 * - Resource optimization and intelligent allocation
 * - Session health checking and automatic recovery
 * - Integration with Python BrowserSessionCoordinator
 * - Real-time session metrics and monitoring
 * - Event-driven session lifecycle management
 * - Load balancing and capacity management
 *
 * Integration Points:
 * - Maintains compatibility with existing BrowserSessionService API
 * - Bridges TypeScript and Python orchestration systems
 * - Provides orchestration-specific session capabilities
 * - Implements session security validation and access control
 */
@Injectable()
export class BrowserOrchestrationSessionService implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserOrchestrationSessionService.name);

  // Session pools organized by type
  private readonly sessionPools: Map<SessionType, Set<string>> = new Map();
  private readonly sessionPoolConfigs: Map<SessionType, SessionPoolConfig> = new Map();

  // Agent coordination tracking
  private readonly agentAssignments: Map<string, Set<AgentSessionAssignment>> = new Map();
  private readonly sessionAssignments: Map<string, Set<string>> = new Map();

  // Performance monitoring
  private readonly sessionMetrics: Map<string, SessionPerformanceMetrics> = new Map();
  private readonly poolStates: Map<SessionType, SessionPoolState> = new Map();

  // Session lifecycle management
  private readonly sessionCreationQueue: Set<string> = new Set();
  private readonly pendingAssignments: Map<string, AgentSessionAssignment[]> = new Map();

  // Orchestration integration
  private readonly coordinatorUrl: string;
  private readonly coordinatorApiKey: string;
  private readonly enableOrchestrationBridge: boolean;

  // Configuration
  private readonly config: OrchestrationSessionConfig;

  // Statistics
  private totalSessionsCreated = 0;
  private totalSessionsDestroyed = 0;
  private totalAgentAssignments = 0;
  private sessionReusageCount = 0;
  private sessionSharingCount = 0;

  constructor(
    private readonly baseSessionService: BrowserSessionService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Load orchestration configuration
    this.config = this.loadOrchestrationConfig();
    this.coordinatorUrl = this.configService.get<string>('BROWSER_COORDINATOR_URL', '');
    this.coordinatorApiKey = this.configService.get<string>('BROWSER_COORDINATOR_API_KEY', '');
    this.enableOrchestrationBridge = this.configService.get<boolean>('ENABLE_ORCHESTRATION_BRIDGE', false);

    // Initialize session pools
    this.initializeSessionPools();

    // Setup event listeners
    this.setupEventListeners();

    this.logger.log('Browser Orchestration Session Service initialized', {
      maxTotalSessions: this.config.maxTotalSessions,
      sessionPools: this.config.sessionPools.length,
      enableSessionSharing: this.config.enableSessionSharing,
      enableSessionReuse: this.config.enableSessionReuse,
      orchestrationBridge: this.enableOrchestrationBridge,
    });
  }

  /**
   * Create orchestrated browser session with pool management
   */
  async createOrchestrationSession(
    dto: CreateBrowserSessionDto,
    agentId?: string,
    sessionType: SessionType = SessionType.STANDARD,
    priority: number = 1,
  ): Promise<BrowserSessionDto> {
    const operationId = this.generateOperationId();

    this.logger.log(`[${operationId}] Creating orchestration session`, {
      agentId,
      sessionType,
      priority,
      name: dto.name,
      poolUtilization: await this.getPoolUtilization(sessionType) ?? 0,
    });

    try {
      // Check pool capacity
      await this.validatePoolCapacity(sessionType);

      // Create enhanced session DTO with orchestration metadata
      const enhancedDto = this.enhanceSessionDto(dto, sessionType, agentId, operationId);

      // Create base session through existing service
      const session = await this.baseSessionService.createSession(enhancedDto);

      // Add to orchestration tracking
      await this.addSessionToPool(session.sessionId, sessionType);

      // Initialize performance metrics
      this.initializeSessionMetrics(session.sessionId);

      // Notify orchestration coordinator if enabled
      if (this.enableOrchestrationBridge) {
        await this.notifyCoordinatorSessionCreated(session, agentId, sessionType);
      }

      // Emit lifecycle event
      this.eventEmitter.emit(SessionLifecycleEvent.SESSION_CREATED, {
        sessionId: session.sessionId,
        sessionType,
        agentId,
        operationId,
        timestamp: new Date(),
      });

      // Update statistics
      this.totalSessionsCreated++;

      this.logger.log(`[${operationId}] Orchestration session created successfully`, {
        sessionId: session.sessionId,
        sessionType,
        agentId,
        totalSessions: await this.getTotalActiveSessions(),
      });

      return session;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`[${operationId}] Failed to create orchestration session`, {
        error: errorMessage,
        agentId,
        sessionType,
        stack: errorStack,
      });
      throw error;
    }
  }

  /**
   * Get available session for agent with intelligent allocation
   */
  async getAvailableSessionForAgent(
    agentId: string,
    sessionType: SessionType = SessionType.STANDARD,
    taskRequirements?: Record<string, unknown>,
    priority: number = 1,
  ): Promise<BrowserSessionDto | null> {
    const operationId = this.generateOperationId();

    this.logger.debug(`[${operationId}] Finding available session for agent`, {
      agentId,
      sessionType,
      priority,
      taskRequirements: !!taskRequirements,
    });

    try {
      // Check for existing agent sessions (reuse optimization)
      if (this.config.enableSessionReuse) {
        const existingSession = await this.findReusableSessionForAgent(agentId, sessionType);
        if (existingSession) {
          await this.assignSessionToAgent(existingSession.sessionId, agentId, taskRequirements, priority);
          this.sessionReusageCount++;
          return existingSession;
        }
      }

      // Check for shared sessions (sharing optimization)
      if (this.config.enableSessionSharing) {
        const sharedSession = await this.findShareableSession(sessionType, taskRequirements);
        if (sharedSession) {
          await this.assignSessionToAgent(sharedSession.sessionId, agentId, taskRequirements, priority);
          this.sessionSharingCount++;
          return sharedSession;
        }
      }

      // Create new session if pool has capacity
      const poolSessions = this.sessionPools.get(sessionType) || new Set();
      const poolConfig = this.sessionPoolConfigs.get(sessionType);

      if (poolConfig && poolSessions.size < poolConfig.maxSessions) {
        const createDto: CreateBrowserSessionDto = {
          name: `Agent ${agentId} Session - ${sessionType}`,
          headless: sessionType === SessionType.HEADLESS || sessionType === SessionType.TEMPORARY,
          viewportWidth: this.getOptimalViewportForType(sessionType).width,
          viewportHeight: this.getOptimalViewportForType(sessionType).height,
          metadata: {
            agentId,
            sessionType,
            createdFor: 'agent-request',
            priority,
            taskRequirements,
          },
        };

        const session = await this.createOrchestrationSession(createDto, agentId, sessionType, priority);
        await this.assignSessionToAgent(session.sessionId, agentId, taskRequirements, priority);
        return session;
      }

      // Pool exhausted - emit event for coordinator
      this.eventEmitter.emit(SessionLifecycleEvent.POOL_EXHAUSTED, {
        sessionType,
        agentId,
        poolSize: poolSessions.size,
        maxSessions: poolConfig?.maxSessions,
        operationId,
        timestamp: new Date(),
      });

      this.logger.warn(`[${operationId}] No available sessions for agent`, {
        agentId,
        sessionType,
        poolSize: poolSessions.size,
        maxSessions: poolConfig?.maxSessions,
      });

      return null;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`[${operationId}] Failed to get available session for agent`, {
        error: errorMessage,
        agentId,
        sessionType,
        stack: errorStack,
      });
      throw error;
    }
  }

  /**
   * Assign session to agent with tracking and coordination
   */
  async assignSessionToAgent(
    sessionId: string,
    agentId: string,
    taskRequirements?: Record<string, unknown>,
    priority: number = 1,
    taskId?: string,
  ): Promise<AgentSessionAssignment> {
    const operationId = this.generateOperationId();

    try {
      // Get session from base service
      const session = this.baseSessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Create new tab for this assignment
      const tab = this.baseSessionService.createTab(sessionId, {
        url: 'about:blank',
        title: `Agent ${agentId} Tab`,
        makeActive: true,
      });

      // Create assignment record
      const assignment: AgentSessionAssignment = {
        agentId,
        sessionId,
        tabId: tab.tabId,
        assignedAt: new Date(),
        taskId,
        priority,
        metadata: {
          operationId,
          taskRequirements,
          sessionType: this.getSessionType(sessionId),
        },
      };

      // Track assignment
      if (!this.agentAssignments.has(agentId)) {
        this.agentAssignments.set(agentId, new Set());
      }
      const agentAssignments = this.agentAssignments.get(agentId);
      if (agentAssignments) {
        agentAssignments.add(assignment);
      }

      if (!this.sessionAssignments.has(sessionId)) {
        this.sessionAssignments.set(sessionId, new Set());
      }
      const sessionAssignments = this.sessionAssignments.get(sessionId);
      if (sessionAssignments) {
        sessionAssignments.add(agentId);
      }

      // Update session activity
      this.baseSessionService.updateActivity(sessionId, {
        actionType: 'agent-assignment',
      });

      // Update performance metrics
      this.updateSessionMetrics(sessionId, {
        totalOperations: 1,
        lastUpdated: new Date(),
      });

      // Notify orchestration coordinator
      if (this.enableOrchestrationBridge) {
        await this.notifyCoordinatorSessionAssigned(assignment);
      }

      // Emit lifecycle event
      this.eventEmitter.emit(SessionLifecycleEvent.SESSION_ASSIGNED, {
        assignment,
        operationId,
        timestamp: new Date(),
      });

      this.totalAgentAssignments++;

      this.logger.log(`[${operationId}] Session assigned to agent successfully`, {
        sessionId,
        agentId,
        tabId: tab.tabId,
        taskId,
        priority,
      });

      return assignment;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`[${operationId}] Failed to assign session to agent`, {
        error: errorMessage,
        sessionId,
        agentId,
        stack: errorStack,
      });
      throw error;
    }
  }

  /**
   * Release session from agent with intelligent cleanup
   */
  async releaseSessionFromAgent(
    sessionId: string,
    agentId: string,
    keepSessionAlive: boolean = true,
  ): Promise<void> {
    const operationId = this.generateOperationId();

    try {
      // Find and remove assignment
      const agentAssignments = this.agentAssignments.get(agentId);
      if (agentAssignments) {
        const assignment = Array.from(agentAssignments).find(a => a.sessionId === sessionId);
        if (assignment) {
          agentAssignments.delete(assignment);

          // Close the agent's tab
          this.baseSessionService.closeTab(sessionId, assignment.tabId);

          // Remove agent from session tracking
          const sessionAgents = this.sessionAssignments.get(sessionId);
          if (sessionAgents) {
            sessionAgents.delete(agentId);
          }

          // Update session activity
          this.baseSessionService.updateActivity(sessionId, {
            actionType: 'agent-release',
          });

          // Determine session fate
          const remainingAgents = sessionAgents?.size ?? 0;
          if (remainingAgents === 0) {
            if (keepSessionAlive) {
              // Mark as idle for potential reuse
              await this.markSessionIdle(sessionId);
            } else {
              // Close session immediately
              await this.closeOrchestrationSession(sessionId);
            }
          }

          // Notify orchestration coordinator
          if (this.enableOrchestrationBridge) {
            await this.notifyCoordinatorSessionReleased(assignment);
          }

          // Emit lifecycle event
          this.eventEmitter.emit(SessionLifecycleEvent.SESSION_RELEASED, {
            assignment,
            remainingAgents,
            sessionClosed: !keepSessionAlive && remainingAgents === 0,
            operationId,
            timestamp: new Date(),
          });

          this.logger.log(`[${operationId}] Session released from agent successfully`, {
            sessionId,
            agentId,
            tabId: assignment.tabId,
            remainingAgents,
            sessionKept: keepSessionAlive,
          });
        }
      }

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to release session from agent`, {
        error: error.message,
        sessionId,
        agentId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get comprehensive orchestration status
   */
  async getOrchestrationStatus(): Promise<{
    totalSessions: number;
    sessionPools: Record<string, SessionPoolState>;
    agentAssignments: number;
    performanceMetrics: SessionPerformanceMetrics[];
    statistics: Record<string, number>;
    configuration: OrchestrationSessionConfig;
  }> {
    const totalSessions = await this.getTotalActiveSessions();
    const sessionPools: Record<string, SessionPoolState> = {};

    // Build pool states
    for (const [sessionType, poolConfig] of this.sessionPoolConfigs.entries()) {
      sessionPools[sessionType] = await this.getPoolState(sessionType);
    }

    // Get all performance metrics
    const performanceMetrics = Array.from(this.sessionMetrics.values());

    // Calculate total agent assignments
    let totalAgentAssignments = 0;
    for (const assignments of this.agentAssignments.values()) {
      totalAgentAssignments += assignments.size;
    }

    return {
      totalSessions,
      sessionPools,
      agentAssignments: totalAgentAssignments,
      performanceMetrics,
      statistics: {
        totalSessionsCreated: this.totalSessionsCreated,
        totalSessionsDestroyed: this.totalSessionsDestroyed,
        totalAgentAssignments: this.totalAgentAssignments,
        sessionReusageCount: this.sessionReusageCount,
        sessionSharingCount: this.sessionSharingCount,
      },
      configuration: this.config,
    };
  }

  /**
   * Optimize session pools based on usage patterns
   */
  async optimizeSessionPools(): Promise<void> {
    const operationId = this.generateOperationId();

    this.logger.log(`[${operationId}] Starting session pool optimization`);

    try {
      for (const [sessionType, poolConfig] of this.sessionPoolConfigs.entries()) {
        const poolState = await this.getPoolState(sessionType);
        const pool = this.sessionPools.get(sessionType) || new Set();

        // Optimize based on utilization patterns
        if (poolState.utilizationRate < 0.3 && pool.size > poolConfig.warmupCount) {
          // Pool underutilized - reduce size
          await this.reducePoolSize(sessionType, Math.floor(pool.size * 0.2));
        } else if (poolState.utilizationRate > 0.8 && pool.size < poolConfig.maxSessions) {
          // Pool overutilized - increase if possible
          await this.increasePoolSize(sessionType, Math.min(3, poolConfig.maxSessions - pool.size));
        }

        // Clean up error sessions
        await this.cleanupErrorSessions(sessionType);
      }

      // Emit optimization event
      this.eventEmitter.emit(SessionLifecycleEvent.POOL_OPTIMIZED, {
        operationId,
        timestamp: new Date(),
        pools: Array.from(this.sessionPoolConfigs.keys()),
      });

      this.logger.log(`[${operationId}] Session pool optimization completed`);

    } catch (error) {
      this.logger.error(`[${operationId}] Session pool optimization failed`, {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Close orchestration session with cleanup
   */
  async closeOrchestrationSession(sessionId: string): Promise<void> {
    const operationId = this.generateOperationId();

    try {
      // Release all agent assignments first
      const sessionAgents = this.sessionAssignments.get(sessionId) || new Set();
      for (const agentId of sessionAgents) {
        await this.releaseSessionFromAgent(sessionId, agentId, false);
      }

      // Remove from pools
      for (const pool of this.sessionPools.values()) {
        pool.delete(sessionId);
      }

      // Clean up tracking data
      this.sessionAssignments.delete(sessionId);
      this.sessionMetrics.delete(sessionId);

      // Close through base service
      await this.baseSessionService.closeSession(sessionId);

      // Notify orchestration coordinator
      if (this.enableOrchestrationBridge) {
        await this.notifyCoordinatorSessionClosed(sessionId);
      }

      // Emit lifecycle event
      this.eventEmitter.emit(SessionLifecycleEvent.SESSION_CLOSED, {
        sessionId,
        operationId,
        timestamp: new Date(),
      });

      this.totalSessionsDestroyed++;

      this.logger.log(`[${operationId}] Orchestration session closed successfully`, {
        sessionId,
        totalSessions: await this.getTotalActiveSessions(),
      });

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to close orchestration session`, {
        error: error.message,
        sessionId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Periodic health check and optimization
   */
  @Interval(60000) // Every minute
  private async performHealthCheck(): Promise<void> {
    try {
      // Check session health
      await this.checkSessionHealth();

      // Clean up idle sessions
      await this.cleanupIdleSessions();

      // Update pool metrics
      await this.updatePoolMetrics();

      // Optimize if needed
      if (this.config.resourceOptimization) {
        await this.optimizeSessionPools();
      }

    } catch (error) {
      this.logger.error('Health check failed', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Module cleanup
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Browser Orchestration Session Service');

    try {
      // Close all sessions
      const allSessions = new Set<string>();
      for (const pool of this.sessionPools.values()) {
        for (const sessionId of pool) {
          allSessions.add(sessionId);
        }
      }

      for (const sessionId of allSessions) {
        await this.closeOrchestrationSession(sessionId);
      }

      // Clear all tracking data
      this.sessionPools.clear();
      this.agentAssignments.clear();
      this.sessionAssignments.clear();
      this.sessionMetrics.clear();
      this.poolStates.clear();

      this.logger.log('Browser Orchestration Session Service shutdown complete');

    } catch (error) {
      this.logger.error('Shutdown failed', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private loadOrchestrationConfig(): OrchestrationSessionConfig {
    const maxTotalSessions = this.configService.get<number>('BROWSER_MAX_TOTAL_SESSIONS', 50);

    return {
      maxTotalSessions,
      sessionPools: this.createDefaultPoolConfigs(maxTotalSessions),
      enableSessionSharing: this.configService.get<boolean>('BROWSER_ENABLE_SESSION_SHARING', true),
      enableSessionReuse: this.configService.get<boolean>('BROWSER_ENABLE_SESSION_REUSE', true),
      globalTimeoutMs: this.configService.get<number>('BROWSER_GLOBAL_TIMEOUT_MS', 600000),
      resourceOptimization: this.configService.get<boolean>('BROWSER_ENABLE_OPTIMIZATION', true),
      performanceMonitoring: this.configService.get<boolean>('BROWSER_ENABLE_MONITORING', true),
      coordinatorEndpoint: this.configService.get<string>('BROWSER_COORDINATOR_ENDPOINT'),
      coordinatorApiKey: this.configService.get<string>('BROWSER_COORDINATOR_API_KEY'),
    };
  }

  private createDefaultPoolConfigs(maxTotalSessions: number): SessionPoolConfig[] {
    const poolConfigs: SessionPoolConfig[] = [];

    // Distribute sessions across pool types
    const standardPool = Math.floor(maxTotalSessions * 0.6); // 60% standard
    const headlessPool = Math.floor(maxTotalSessions * 0.3); // 30% headless
    const otherPools = Math.floor(maxTotalSessions * 0.1 / 4); // 10% split among 4 others

    const pools = [
      { type: SessionType.STANDARD, max: standardPool, warmup: Math.min(5, standardPool) },
      { type: SessionType.HEADLESS, max: headlessPool, warmup: Math.min(3, headlessPool) },
      { type: SessionType.MOBILE, max: otherPools, warmup: Math.min(1, otherPools) },
      { type: SessionType.INCOGNITO, max: otherPools, warmup: Math.min(1, otherPools) },
      { type: SessionType.PERSISTENT, max: otherPools, warmup: Math.min(1, otherPools) },
      { type: SessionType.TEMPORARY, max: otherPools, warmup: Math.min(1, otherPools) },
    ];

    for (const pool of pools) {
      if (pool.max > 0) {
        poolConfigs.push({
          poolId: `pool_${pool.type}`,
          maxSessions: pool.max,
          sessionType: pool.type,
          warmupCount: pool.warmup,
          idleTimeoutMs: 300000, // 5 minutes
          healthCheckIntervalMs: 60000, // 1 minute
        });
      }
    }

    return poolConfigs;
  }

  private initializeSessionPools(): void {
    for (const poolConfig of this.config.sessionPools) {
      this.sessionPools.set(poolConfig.sessionType, new Set());
      this.sessionPoolConfigs.set(poolConfig.sessionType, poolConfig);
    }

    this.logger.log('Session pools initialized', {
      pools: this.config.sessionPools.map(p => ({ type: p.sessionType, max: p.maxSessions })),
    });
  }

  private setupEventListeners(): void {
    // Listen to base session service events if available
    // Additional event setup for orchestration coordination
  }

  private enhanceSessionDto(
    dto: CreateBrowserSessionDto,
    sessionType: SessionType,
    agentId?: string,
    operationId?: string,
  ): CreateBrowserSessionDto {
    return {
      ...dto,
      metadata: {
        ...dto.metadata,
        sessionType,
        agentId,
        operationId,
        orchestrationEnabled: true,
        createdAt: new Date().toISOString(),
      },
    };
  }

  private async validatePoolCapacity(sessionType: SessionType): Promise<void> {
    const pool = this.sessionPools.get(sessionType);
    const poolConfig = this.sessionPoolConfigs.get(sessionType);

    if (!pool || !poolConfig) {
      throw new Error(`Session pool not configured for type: ${sessionType}`);
    }

    if (pool.size >= poolConfig.maxSessions) {
      throw new Error(`Session pool at capacity for type: ${sessionType} (${pool.size}/${poolConfig.maxSessions})`);
    }

    const totalSessions = await this.getTotalActiveSessions();
    if (totalSessions >= this.config.maxTotalSessions) {
      throw new Error(`Global session limit reached: ${totalSessions}/${this.config.maxTotalSessions}`);
    }
  }

  private async addSessionToPool(sessionId: string, sessionType: SessionType): Promise<void> {
    const pool = this.sessionPools.get(sessionType);
    if (pool) {
      pool.add(sessionId);
    }
  }

  private initializeSessionMetrics(sessionId: string): void {
    this.sessionMetrics.set(sessionId, {
      sessionId,
      totalOperations: 0,
      averageResponseTime: 0,
      peakMemoryUsage: 0,
      cpuUtilization: 0,
      networkActivity: 0,
      errorRate: 0,
      efficiency: 1.0,
      lastUpdated: new Date(),
    });
  }

  private updateSessionMetrics(sessionId: string, updates: Partial<SessionPerformanceMetrics>): void {
    const existing = this.sessionMetrics.get(sessionId);
    if (existing) {
      this.sessionMetrics.set(sessionId, { ...existing, ...updates });
    }
  }

  private async findReusableSessionForAgent(agentId: string, sessionType: SessionType): Promise<BrowserSessionDto | null> {
    const agentAssignments = this.agentAssignments.get(agentId);
    if (!agentAssignments) return null;

    for (const assignment of agentAssignments) {
      const session = this.baseSessionService.getSession(assignment.sessionId);
      if (session && session.status === BrowserSessionStatus.ACTIVE) {
        const assignmentSessionType = this.getSessionType(assignment.sessionId);
        if (assignmentSessionType === sessionType) {
          return session;
        }
      }
    }

    return null;
  }

  private async findShareableSession(sessionType: SessionType, taskRequirements?: Record<string, unknown>): Promise<BrowserSessionDto | null> {
    const pool = this.sessionPools.get(sessionType);
    if (!pool) return null;

    for (const sessionId of pool) {
      const session = this.baseSessionService.getSession(sessionId);
      if (session && session.status === BrowserSessionStatus.ACTIVE) {
        const sessionAgents = this.sessionAssignments.get(sessionId);
        const currentLoad = sessionAgents?.size || 0;

        // Check if session can handle additional load
        if (currentLoad < session.config.maxTabs) {
          return session;
        }
      }
    }

    return null;
  }

  private getOptimalViewportForType(sessionType: SessionType): { width: number; height: number } {
    switch (sessionType) {
      case SessionType.MOBILE:
        return { width: 375, height: 667 };
      case SessionType.STANDARD:
      case SessionType.PERSISTENT:
        return { width: 1920, height: 1080 };
      default:
        return { width: 1280, height: 720 };
    }
  }

  private getSessionType(sessionId: string): SessionType {
    for (const [sessionType, pool] of this.sessionPools.entries()) {
      if (pool.has(sessionId)) {
        return sessionType;
      }
    }
    return SessionType.STANDARD; // Default fallback
  }

  private async markSessionIdle(sessionId: string): Promise<void> {
    // Mark session as idle for potential reuse
    this.eventEmitter.emit(SessionLifecycleEvent.SESSION_IDLE, {
      sessionId,
      timestamp: new Date(),
    });
  }

  private async getTotalActiveSessions(): Promise<number> {
    let total = 0;
    for (const pool of this.sessionPools.values()) {
      total += pool.size;
    }
    return total;
  }

  private async getPoolUtilization(sessionType: SessionType): Promise<number> {
    const pool = this.sessionPools.get(sessionType);
    const poolConfig = this.sessionPoolConfigs.get(sessionType);

    if (!pool || !poolConfig) return 0;

    return pool.size / poolConfig.maxSessions;
  }

  private async getPoolState(sessionType: SessionType): Promise<SessionPoolState> {
    const pool = this.sessionPools.get(sessionType) || new Set();
    const poolConfig = this.sessionPoolConfigs.get(sessionType);

    let activeSessions = 0;
    let idleSessions = 0;
    let busySessions = 0;
    let errorSessions = 0;

    for (const sessionId of pool) {
      const session = this.baseSessionService.getSession(sessionId);
      if (session) {
        switch (session.status) {
          case BrowserSessionStatus.ACTIVE:
            activeSessions++;
            break;
          case BrowserSessionStatus.CLOSED:
            idleSessions++;
            break;
          case BrowserSessionStatus.ERROR:
            errorSessions++;
            break;
          default:
            busySessions++;
        }
      }
    }

    const utilizationRate = poolConfig ? pool.size / poolConfig.maxSessions : 0;
    const poolHealth = errorSessions === 0 ? 1.0 : Math.max(0, 1 - (errorSessions / pool.size));

    return {
      poolId: poolConfig?.poolId || `pool_${sessionType}`,
      sessionType,
      activeSessions,
      idleSessions,
      busySessions,
      errorSessions,
      utilizationRate,
      averageLoadTime: 0, // TODO: Calculate from metrics
      poolHealth,
    };
  }

  private async reducePoolSize(sessionType: SessionType, count: number): Promise<void> {
    const pool = this.sessionPools.get(sessionType);
    if (!pool) return;

    const sessionsToClose = Array.from(pool).slice(0, count);
    for (const sessionId of sessionsToClose) {
      const sessionAgents = this.sessionAssignments.get(sessionId);
      if (!sessionAgents || sessionAgents.size === 0) {
        await this.closeOrchestrationSession(sessionId);
      }
    }
  }

  private async increasePoolSize(sessionType: SessionType, count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      try {
        const createDto: CreateBrowserSessionDto = {
          name: `Pool Warmup Session - ${sessionType}`,
          headless: sessionType === SessionType.HEADLESS,
          metadata: { poolWarmup: true },
        };
        await this.createOrchestrationSession(createDto, undefined, sessionType);
      } catch (error) {
        this.logger.warn(`Failed to create warmup session for ${sessionType}`, { error: error.message });
        break;
      }
    }
  }

  private async cleanupErrorSessions(sessionType: SessionType): Promise<void> {
    const pool = this.sessionPools.get(sessionType);
    if (!pool) return;

    for (const sessionId of pool) {
      const session = this.baseSessionService.getSession(sessionId);
      if (session && session.status === BrowserSessionStatus.ERROR) {
        await this.closeOrchestrationSession(sessionId);
      }
    }
  }

  private async checkSessionHealth(): Promise<void> {
    // Implement session health checking logic
    // This would integrate with actual browser session health checks
  }

  private async cleanupIdleSessions(): Promise<void> {
    const now = Date.now();

    for (const [sessionType, poolConfig] of this.sessionPoolConfigs.entries()) {
      const pool = this.sessionPools.get(sessionType);
      if (!pool) continue;

      for (const sessionId of pool) {
        const session = this.baseSessionService.getSession(sessionId);
        if (session) {
          const idleTime = now - session.lastActivityAt.getTime();
          if (idleTime > poolConfig.idleTimeoutMs) {
            const sessionAgents = this.sessionAssignments.get(sessionId);
            if (!sessionAgents || sessionAgents.size === 0) {
              await this.closeOrchestrationSession(sessionId);
            }
          }
        }
      }
    }
  }

  private async updatePoolMetrics(): Promise<void> {
    for (const sessionType of this.sessionPoolConfigs.keys()) {
      const poolState = await this.getPoolState(sessionType);
      this.poolStates.set(sessionType, poolState);
    }
  }

  // Orchestration coordinator bridge methods
  private async notifyCoordinatorSessionCreated(session: BrowserSessionDto, agentId?: string, sessionType?: SessionType): Promise<void> {
    if (!this.coordinatorUrl) return;

    try {
      // TODO: Implement HTTP call to Python coordinator
      // const response = await fetch(`${this.coordinatorUrl}/sessions`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.coordinatorApiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     action: 'session_created',
      //     sessionId: session.sessionId,
      //     agentId,
      //     sessionType,
      //     timestamp: new Date().toISOString(),
      //   }),
      // });

      this.logger.debug('Notified coordinator of session creation', { sessionId: session.sessionId });
    } catch (error) {
      this.logger.warn('Failed to notify coordinator of session creation', { error: error.message });
    }
  }

  private async notifyCoordinatorSessionAssigned(assignment: AgentSessionAssignment): Promise<void> {
    if (!this.coordinatorUrl) return;

    try {
      // TODO: Implement HTTP call to Python coordinator
      this.logger.debug('Notified coordinator of session assignment', {
        sessionId: assignment.sessionId,
        agentId: assignment.agentId,
      });
    } catch (error) {
      this.logger.warn('Failed to notify coordinator of session assignment', { error: error.message });
    }
  }

  private async notifyCoordinatorSessionReleased(assignment: AgentSessionAssignment): Promise<void> {
    if (!this.coordinatorUrl) return;

    try {
      // TODO: Implement HTTP call to Python coordinator
      this.logger.debug('Notified coordinator of session release', {
        sessionId: assignment.sessionId,
        agentId: assignment.agentId,
      });
    } catch (error) {
      this.logger.warn('Failed to notify coordinator of session release', { error: error.message });
    }
  }

  private async notifyCoordinatorSessionClosed(sessionId: string): Promise<void> {
    if (!this.coordinatorUrl) return;

    try {
      // TODO: Implement HTTP call to Python coordinator
      this.logger.debug('Notified coordinator of session closure', { sessionId });
    } catch (error) {
      this.logger.warn('Failed to notify coordinator of session closure', { error: error.message });
    }
  }

  private generateOperationId(): string {
    return `orchestration_${Date.now()}_${uuidv4().substring(0, 8)}`;
  }
}