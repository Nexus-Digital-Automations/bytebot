/**
 * Browser Orchestration Controller Unit Tests
 *
 * Comprehensive unit tests for browser orchestration API endpoints.
 * Tests multi-agent coordination, session management, distributed workflows,
 * error recovery, and security validation for the browser orchestration system.
 *
 * @author Claude Code
 * @version 1.0.0
 * @date 2025-09-20
 */

import { Test, TestingModule } from '@nestjs/testing';import { HttpStatus, INestApplication } from '@nestjs/common';import { ConfigModule } from '@nestjs/config';import * as request from 'supertest';import { BrowserOrchestrationController } from './browser-orchestration.controller';import { BrowserOrchestrationService } from './browser-orchestration.service';import { BrowserSessionService } from './browser-session.service';import { BrowserTaskService } from './browser-task.service';import { SecurityModule } from '../common/security/security.module';import { AuthModule } from '../auth/auth.module';import { PrismaService } from '../database/prisma.service';import {CreateOrchestrationDto,
  OrchestrationStrategy,
  TaskPriority,
  OrchestrationStatus
} from './dto/browser-orchestration.dto';import {CreateBrowserSessionDto,
  BrowserSessionStatus
} from './dto/browser-session.dto';import {CreateBrowserTaskDto,
  BrowserTaskStatus
} from './dto/browser-task.dto';describe('BrowserOrchestrationController', () => {let app: INestApplication;let controller: BrowserOrchestrationController;
  let orchestrationService: BrowserOrchestrationService;
  let sessionService: BrowserSessionService;
  let taskService: BrowserTaskService;
  let prismaService: PrismaService;

  const mockOrchestrationService = {
    createOrchestration: jest.fn(),
    executeOrchestration: jest.fn(),
    getOrchestrationStatus: jest.fn(),
    cancelOrchestration: jest.fn(),
    getAllOrchestrations: jest.fn(),
    getOrchestrationMetrics: jest.fn(),
    getOrchestrationLogs: jest.fn(),
    updateOrchestrationStrategy: jest.fn(),
    getAgentPoolStatus: jest.fn(),
    scaleAgentPool: jest.fn(),
    distributeTask: jest.fn(),
    coordinateSessions: jest.fn(),
  };

  const mockSessionService = {
    createSession: jest.fn(),
    getSession: jest.fn(),
    getAllSessions: jest.fn(),
    closeSession: jest.fn(),
    getSessionMetrics: jest.fn(),
    updateSession: jest.fn(),
  };

  const mockTaskService = {
    createTask: jest.fn(),
    executeTask: jest.fn(),
    getTask: jest.fn(),
    getAllTasks: jest.fn(),
    cancelTask: jest.fn(),
    getTaskMetrics: jest.fn(),
    updateTaskPriority: jest.fn(),
  };

  const mockPrismaService = {
    browserOrchestration: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    browserSession: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    browserTask: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',}),SecurityModule,
        AuthModule,
      ],
      controllers: [BrowserOrchestrationController],
      providers: [
        {
          provide: BrowserOrchestrationService,
          useValue: mockOrchestrationService,
        },
        {
          provide: BrowserSessionService,
          useValue: mockSessionService,
        },
        {
          provide: BrowserTaskService,
          useValue: mockTaskService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<BrowserOrchestrationController>(BrowserOrchestrationController);
    orchestrationService = module.get<BrowserOrchestrationService>(BrowserOrchestrationService);
    sessionService = module.get<BrowserSessionService>(BrowserSessionService);
    taskService = module.get<BrowserTaskService>(BrowserTaskService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /browser-orchestration/orchestrations', () => {it('should create new orchestration successfully', async () => {const createOrchestrationDto: CreateOrchestrationDto = {name: 'Multi-Agent Data Extraction',strategy: OrchestrationStrategy.ADAPTIVE,maxConcurrentAgents: 5,
        maxConcurrentSessions: 10,
        timeoutSeconds: 300,
        tasks: [
          {
            name: 'Extract Product Data',type: 'data_extraction',url: 'https://example.com/products',instructions: 'Extract product names and prices',priority: TaskPriority.HIGH,},
          {
            name: 'Capture Screenshots',type: 'screenshot',url: 'https://example.com/gallery',instructions: 'Take full page screenshots',priority: TaskPriority.NORMAL,},
        ],
        sessionConfig: {
          headless: true,
          viewportWidth: 1920,
          viewportHeight: 1080,
        },
      };

      const mockOrchestration = {
        id: 'orch_12345',name: createOrchestrationDto.name,strategy: createOrchestrationDto.strategy,
        status: OrchestrationStatus.PENDING,
        totalTasks: 2,
        completedTasks: 0,
        failedTasks: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrchestrationService.createOrchestration.mockResolvedValue(mockOrchestration);

      const response = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations').send(createOrchestrationDto).expect(HttpStatus.CREATED);

      expect(response.body).toEqual(mockOrchestration);
      expect(mockOrchestrationService.createOrchestration).toHaveBeenCalledWith(
        createOrchestrationDto
      );
    });

    it('should validate orchestration input data', async () => {const invalidOrchestrationDto = {name: '', // Invalid: empty namestrategy: 'invalid_strategy', // Invalid: unknown strategymaxConcurrentAgents: -1, // Invalid: negative valuetasks: [], // Invalid: empty tasks array
      };

      await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations').send(invalidOrchestrationDto).expect(HttpStatus.BAD_REQUEST);
    });

    it('should handle service errors gracefully', async () => {const createOrchestrationDto: CreateOrchestrationDto = {name: 'Test Orchestration',strategy: OrchestrationStrategy.PARALLEL,maxConcurrentAgents: 3,
        tasks: [
          {
            name: 'Test Task',type: 'navigation',url: 'https://example.com',instructions: 'Navigate to homepage',priority: TaskPriority.NORMAL,},
        ],
      };

      mockOrchestrationService.createOrchestration.mockRejectedValue(
        new Error('Service unavailable'));await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations').send(createOrchestrationDto).expect(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('POST /browser-orchestration/orchestrations/:orchestrationId/execute', () => {it('should execute orchestration successfully', async () => {const orchestrationId = 'orch_12345';
      const mockExecutionResult = {
        orchestrationId,
        status: OrchestrationStatus.RUNNING,
        startedAt: new Date(),
        totalTasks: 3,
        completedTasks: 0,
        activeAgents: 2,
        estimatedDuration: 180,
      };

      mockOrchestrationService.executeOrchestration.mockResolvedValue(mockExecutionResult);

      const response = await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockExecutionResult);
      expect(mockOrchestrationService.executeOrchestration).toHaveBeenCalledWith(
        orchestrationId
      );
    });

    it('should handle non-existent orchestration', async () => {const orchestrationId = 'non_existent';mockOrchestrationService.executeOrchestration.mockRejectedValue(new Error('Orchestration not found')
      );

      await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should prevent execution of already running orchestration', async () => {const orchestrationId = 'orch_running';mockOrchestrationService.executeOrchestration.mockRejectedValue(new Error('Orchestration already running')
      );

      await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .expect(HttpStatus.CONFLICT);
    });
  });

  describe('GET /browser-orchestration/orchestrations/:orchestrationId/status', () => {it('should return orchestration status with detailed metrics', async () => {const orchestrationId = 'orch_12345';
      const mockStatus = {
        orchestrationId,
        status: OrchestrationStatus.RUNNING,
        progress: {
          totalTasks: 5,
          completedTasks: 3,
          failedTasks: 1,
          pendingTasks: 1,
          successRate: 75,
        },
        agents: {
          total: 3,
          active: 2,
          idle: 1,
          utilization: 66.7,
        },
        sessions: {
          total: 4,
          active: 3,
          closed: 1,
        },
        performance: {
          averageTaskDuration: 45.5,
          throughput: 0.8,
          errorRate: 20,
        },
        estimatedCompletion: new Date(Date.now() + 60000),
        lastUpdated: new Date(),
      };

      mockOrchestrationService.getOrchestrationStatus.mockResolvedValue(mockStatus);

      const response = await request(app.getHttpServer())
        .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockStatus);
      expect(mockOrchestrationService.getOrchestrationStatus).toHaveBeenCalledWith(
        orchestrationId
      );
    });

    it('should handle real-time status updates', async () => {const orchestrationId = 'orch_realtime';
      const mockStatus = {
        orchestrationId,
        status: OrchestrationStatus.RUNNING,
        progress: { completedTasks: 2, totalTasks: 5 },
        realTimeUpdates: true,
        lastUpdated: new Date(),
      };

      mockOrchestrationService.getOrchestrationStatus.mockResolvedValue(mockStatus);

      const response = await request(app.getHttpServer())
        .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
        .query({ realTime: 'true' }).expect(HttpStatus.OK);expect(response.body.realTimeUpdates).toBe(true);
    });
  });

  describe('POST /browser-orchestration/orchestrations/:orchestrationId/cancel', () => {it('should cancel orchestration and cleanup resources', async () => {const orchestrationId = 'orch_to_cancel';
      const mockCancellationResult = {
        orchestrationId,
        status: OrchestrationStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledTasks: 3,
        cleanupResult: {
          sessionsTerminated: 2,
          agentsReleased: 3,
          resourcesFreed: true,
        },
      };

      mockOrchestrationService.cancelOrchestration.mockResolvedValue(mockCancellationResult);

      const response = await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/cancel`)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockCancellationResult);
      expect(mockOrchestrationService.cancelOrchestration).toHaveBeenCalledWith(
        orchestrationId
      );
    });

    it('should handle graceful shutdown with timeout', async () => {const orchestrationId = 'orch_graceful';const shutdownOptions = {graceful: true,
        timeoutSeconds: 30,
      };

      const mockResult = {
        orchestrationId,
        status: OrchestrationStatus.CANCELLED,
        shutdownType: 'graceful',
        shutdownDuration: 25,
      };

      mockOrchestrationService.cancelOrchestration.mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/cancel`)
        .send(shutdownOptions)
        .expect(HttpStatus.OK);

      expect(response.body.shutdownType).toBe('graceful');});});

  describe('GET /browser-orchestration/orchestrations', () => {it('should return paginated orchestrations list', async () => {const mockOrchestrations = {data: [
          {
            id: 'orch_1',name: 'Orchestration 1',status: OrchestrationStatus.COMPLETED,totalTasks: 5,
            completedTasks: 5,
            createdAt: new Date(),
          },
          {
            id: 'orch_2',name: 'Orchestration 2',status: OrchestrationStatus.RUNNING,totalTasks: 3,
            completedTasks: 1,
            createdAt: new Date(),
          },
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockOrchestrationService.getAllOrchestrations.mockResolvedValue(mockOrchestrations);

      const response = await request(app.getHttpServer())
        .get('/browser-orchestration/orchestrations').query({ page: 1, limit: 10 }).expect(HttpStatus.OK);

      expect(response.body).toEqual(mockOrchestrations);
    });

    it('should filter orchestrations by status', async () => {const statusFilter = OrchestrationStatus.RUNNING;const mockFilteredOrchestrations = {
        data: [
          {
            id: 'orch_running',status: OrchestrationStatus.RUNNING,totalTasks: 3,
            completedTasks: 1,
          },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockOrchestrationService.getAllOrchestrations.mockResolvedValue(
        mockFilteredOrchestrations
      );

      const response = await request(app.getHttpServer())
        .get('/browser-orchestration/orchestrations').query({ status: statusFilter }).expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe(statusFilter);
    });

    it('should sort orchestrations by creation date', async () => {const mockSortedOrchestrations = {data: [
          {
            id: 'orch_latest',createdAt: new Date('2025-09-20T12:00:00Z'),},{
            id: 'orch_older',createdAt: new Date('2025-09-20T11:00:00Z'),},],
        pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
      };

      mockOrchestrationService.getAllOrchestrations.mockResolvedValue(
        mockSortedOrchestrations
      );

      const response = await request(app.getHttpServer())
        .get('/browser-orchestration/orchestrations').query({ sortBy: 'createdAt', sortOrder: 'desc' }).expect(HttpStatus.OK);expect(new Date(response.body.data[0].createdAt).getTime()).toBeGreaterThan(
        new Date(response.body.data[1].createdAt).getTime()
      );
    });
  });

  describe('GET /browser-orchestration/agents/status', () => {it('should return agent pool status with detailed metrics', async () => {const mockAgentStatus = {totalAgents: 5,
        activeAgents: 3,
        idleAgents: 2,
        utilization: 60,
        agentDetails: [
          {
            agentId: 'agent_1',status: 'active',currentTasks: 2,maxTasks: 3,
            capabilities: ['web_navigation', 'data_extraction'],performance: {tasksCompleted: 15,
              averageDuration: 45.2,
              successRate: 93.3,
            },
          },
          {
            agentId: 'agent_2',status: 'idle',currentTasks: 0,maxTasks: 3,
            capabilities: ['screenshot', 'form_interaction'],performance: {tasksCompleted: 8,
              averageDuration: 32.1,
              successRate: 100,
            },
          },
        ],
        performanceMetrics: {
          totalTasksExecuted: 50,
          averageResponseTime: 1.2,
          errorRate: 5.5,
          uptime: 99.8,
        },
      };

      mockOrchestrationService.getAgentPoolStatus.mockResolvedValue(mockAgentStatus);

      const response = await request(app.getHttpServer())
        .get('/browser-orchestration/agents/status').expect(HttpStatus.OK);expect(response.body).toEqual(mockAgentStatus);
      expect(response.body.agentDetails).toHaveLength(2);
    });

    it('should filter agent status by capability', async () => {const capability = 'data_extraction';const mockFilteredStatus = {totalAgents: 2,
        agentDetails: [
          {
            agentId: 'agent_1',capabilities: ['web_navigation', 'data_extraction'],},{
            agentId: 'agent_3',capabilities: ['data_extraction', 'screenshot'],},],
      };

      mockOrchestrationService.getAgentPoolStatus.mockResolvedValue(mockFilteredStatus);

      const response = await request(app.getHttpServer())
        .get('/browser-orchestration/agents/status').query({ capability }).expect(HttpStatus.OK);

      expect(response.body.agentDetails.every((agent: any) =>
        agent.capabilities.includes(capability)
      )).toBe(true);
    });
  });

  describe('POST /browser-orchestration/agents/scale', () => {it('should scale agent pool up successfully', async () => {const scaleRequest = {targetAgents: 8,
        strategy: 'gradual',timeoutSeconds: 60,};

      const mockScaleResult = {
        success: true,
        previousAgentCount: 5,
        targetAgentCount: 8,
        actualAgentCount: 8,
        scalingDuration: 45,
        newAgents: [
          { agentId: 'agent_6', status: 'initializing' },{ agentId: 'agent_7', status: 'initializing' },{ agentId: 'agent_8', status: 'ready' },],};

      mockOrchestrationService.scaleAgentPool.mockResolvedValue(mockScaleResult);

      const response = await request(app.getHttpServer())
        .post('/browser-orchestration/agents/scale').send(scaleRequest).expect(HttpStatus.OK);

      expect(response.body).toEqual(mockScaleResult);
      expect(response.body.newAgents).toHaveLength(3);
    });

    it('should scale agent pool down with graceful shutdown', async () => {const scaleRequest = {targetAgents: 3,
        strategy: 'graceful',waitForTaskCompletion: true,};

      const mockScaleResult = {
        success: true,
        previousAgentCount: 5,
        targetAgentCount: 3,
        actualAgentCount: 3,
        removedAgents: [
          { agentId: 'agent_4', shutdownDuration: 30 },{ agentId: 'agent_5', shutdownDuration: 25 },],};

      mockOrchestrationService.scaleAgentPool.mockResolvedValue(mockScaleResult);

      const response = await request(app.getHttpServer())
        .post('/browser-orchestration/agents/scale').send(scaleRequest).expect(HttpStatus.OK);

      expect(response.body.removedAgents).toHaveLength(2);
    });
  });

  describe('POST /browser-orchestration/tasks/distribute', () => {it('should distribute task to optimal agent', async () => {const taskDistributionRequest = {taskId: 'task_12345',taskType: 'data_extraction',priority: TaskPriority.HIGH,requirements: {
          capabilities: ['web_navigation', 'data_extraction'],minMemory: 512,preferredRegion: 'us-east',},selectionStrategy: 'optimal',};const mockDistributionResult = {
        success: true,
        taskId: 'task_12345',assignedAgent: {agentId: 'agent_3',capabilities: ['web_navigation', 'data_extraction', 'form_interaction'],currentLoad: 66.7,estimatedDuration: 45,
        },
        allocationTime: 1.2,
        selectionCriteria: {
          capabilityMatch: 100,
          loadBalance: 85,
          performanceScore: 92,
        },
      };

      mockOrchestrationService.distributeTask.mockResolvedValue(mockDistributionResult);

      const response = await request(app.getHttpServer())
        .post('/browser-orchestration/tasks/distribute').send(taskDistributionRequest).expect(HttpStatus.OK);

      expect(response.body).toEqual(mockDistributionResult);
      expect(response.body.assignedAgent.capabilities).toContain('data_extraction');});it('should handle no available agents scenario', async () => {const taskDistributionRequest = {taskId: 'task_no_agents',taskType: 'special_task',requirements: {capabilities: ['rare_capability'],},};

      mockOrchestrationService.distributeTask.mockRejectedValue(
        new Error('No agents available with required capabilities'));await request(app.getHttpServer())
        .post('/browser-orchestration/tasks/distribute').send(taskDistributionRequest).expect(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });

  describe('POST /browser-orchestration/sessions/coordinate', () => {it('should coordinate multiple browser sessions', async () => {const sessionCoordinationRequest = {orchestrationId: 'orch_12345',sessionRequests: [{
            sessionType: 'data_extraction',url: 'https://example.com',viewportSize: { width: 1920, height: 1080 },},
          {
            sessionType: 'screenshot',url: 'https://example.com/gallery',viewportSize: { width: 1280, height: 720 },},
        ],
        coordinationStrategy: 'load_balanced',reuseExistingSessions: true,};

      const mockCoordinationResult = {
        success: true,
        orchestrationId: 'orch_12345',coordinatedSessions: [{
            sessionId: 'session_1',agentId: 'agent_1',url: 'https://example.com',status: 'active',reuseType: 'new',},{
            sessionId: 'session_2',agentId: 'agent_2',url: 'https://example.com/gallery',status: 'active',reuseType: 'reused',},],
        coordinationTime: 2.3,
        resourceOptimization: {
          sessionsReused: 1,
          memoryOptimized: true,
          loadDistribution: 'balanced',},};

      mockOrchestrationService.coordinateSessions.mockResolvedValue(mockCoordinationResult);

      const response = await request(app.getHttpServer())
        .post('/browser-orchestration/sessions/coordinate').send(sessionCoordinationRequest).expect(HttpStatus.OK);

      expect(response.body).toEqual(mockCoordinationResult);
      expect(response.body.coordinatedSessions).toHaveLength(2);
    });
  });

  describe('GET /browser-orchestration/metrics/summary', () => {it('should return comprehensive orchestration metrics', async () => {const mockMetricsSummary = {period: {
          start: new Date('2025-09-20T00:00:00Z'),end: new Date('2025-09-20T23:59:59Z'),},orchestrations: {
          total: 25,
          successful: 22,
          failed: 2,
          cancelled: 1,
          successRate: 88,
        },
        tasks: {
          total: 125,
          successful: 110,
          failed: 12,
          cancelled: 3,
          averageDuration: 42.5,
          throughput: 2.3,
        },
        agents: {
          totalAgents: 5,
          averageUtilization: 75.2,
          peakUtilization: 95.5,
          tasksPerAgent: 25,
        },
        sessions: {
          totalSessions: 45,
          averageSessionDuration: 125.6,
          sessionsReused: 18,
          reuseRate: 40,
        },
        performance: {
          averageResponseTime: 1.8,
          errorRate: 9.6,
          resourceEfficiency: 82.3,
          systemUptime: 99.9,
        },
      };

      mockOrchestrationService.getOrchestrationMetrics.mockResolvedValue(mockMetricsSummary);

      const response = await request(app.getHttpServer())
        .get('/browser-orchestration/metrics/summary').query({startDate: '2025-09-20T00:00:00Z',endDate: '2025-09-20T23:59:59Z',}).expect(HttpStatus.OK);

      expect(response.body).toEqual(mockMetricsSummary);
      expect(response.body.orchestrations.successRate).toBe(88);
    });

    it('should filter metrics by orchestration strategy', async () => {const strategy = OrchestrationStrategy.ADAPTIVE;const mockStrategyMetrics = {
        strategy: OrchestrationStrategy.ADAPTIVE,
        orchestrations: {
          total: 15,
          successful: 14,
          successRate: 93.3,
        },
        performance: {
          averageResponseTime: 1.5,
          resourceEfficiency: 89.2,
        },
      };

      mockOrchestrationService.getOrchestrationMetrics.mockResolvedValue(mockStrategyMetrics);

      const response = await request(app.getHttpServer())
        .get('/browser-orchestration/metrics/summary').query({ strategy }).expect(HttpStatus.OK);

      expect(response.body.strategy).toBe(strategy);
      expect(response.body.orchestrations.successRate).toBe(93.3);
    });
  });

  describe('GET /browser-orchestration/health', () => {it('should return comprehensive health status', async () => {const mockHealthStatus = {status: 'healthy',service: 'Browser Orchestration Controller',version: '1.0.0',timestamp: new Date().toISOString(),components: {
          orchestrationService: {
            status: 'healthy',responseTime: 12,activeOrchestrations: 3,
          },
          agentPool: {
            status: 'healthy',totalAgents: 5,healthyAgents: 5,
            utilization: 65.2,
          },
          sessionCoordinator: {
            status: 'healthy',activeSessions: 8,maxSessions: 20,
            memoryUsage: 45.3,
          },
          database: {
            status: 'healthy',connectionPool: 'optimal',responseTime: 5,},
        },
        capabilities: {
          multiAgentCoordination: true,
          distributedTaskExecution: true,
          sessionManagement: true,
          realTimeMonitoring: true,
          autoScaling: true,
          errorRecovery: true,
        },
        limits: {
          maxConcurrentOrchestrations: 10,
          maxAgents: 20,
          maxSessions: 50,
          maxTasksPerOrchestration: 100,
        },
      };

      // Mock the health check method
      jest.spyOn(controller, 'getHealth').mockResolvedValue(mockHealthStatus);const response = await request(app.getHttpServer()).get('/browser-orchestration/health').expect(HttpStatus.OK);expect(response.body).toEqual(mockHealthStatus);
      expect(response.body.components.agentPool.status).toBe('healthy');});it('should detect unhealthy components', async () => {const mockUnhealthyStatus = {status: 'degraded',components: {orchestrationService: { status: 'healthy' },agentPool: { status: 'unhealthy', error: 'Agent connectivity issues' },sessionCoordinator: { status: 'healthy' },database: { status: 'healthy' },},};

      jest.spyOn(controller, 'getHealth').mockResolvedValue(mockUnhealthyStatus);const response = await request(app.getHttpServer()).get('/browser-orchestration/health').expect(HttpStatus.SERVICE_UNAVAILABLE);expect(response.body.status).toBe('degraded');expect(response.body.components.agentPool.status).toBe('unhealthy');});});

  describe('Error Handling and Edge Cases', () => {it('should handle database connection errors', async () => {mockOrchestrationService.createOrchestration.mockRejectedValue(new Error('Database connection failed'));const createOrchestrationDto: CreateOrchestrationDto = {
        name: 'Test Orchestration',strategy: OrchestrationStrategy.SEQUENTIAL,tasks: [
          {
            name: 'Test Task',type: 'navigation',url: 'https://example.com',instructions: 'Test navigation',priority: TaskPriority.NORMAL,},
        ],
      };

      await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations').send(createOrchestrationDto).expect(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should handle concurrent access to same orchestration', async () => {const orchestrationId = 'orch_concurrent';mockOrchestrationService.executeOrchestration.mockResolvedValueOnce({ status: OrchestrationStatus.RUNNING })
        .mockRejectedValueOnce(new Error('Orchestration already running'));

      // First request should succeed
      await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`).expect(HttpStatus.OK);// Second concurrent request should fail
      await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .expect(HttpStatus.CONFLICT);
    });

    it('should validate orchestration limits', async () => {const createOrchestrationDto: CreateOrchestrationDto = {name: 'Large Orchestration',
        strategy: OrchestrationStrategy.PARALLEL,
        maxConcurrentAgents: 1000, // Exceeds limit
        tasks: Array.from({ length: 1000 }, (_, i) => ({ // Exceeds task limit
          name: `Task ${i}`,
          type: 'navigation',url: 'https://example.com',instructions: 'Navigate',priority: TaskPriority.NORMAL,})),
      };

      await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations').send(createOrchestrationDto).expect(HttpStatus.BAD_REQUEST);
    });

    it('should handle agent pool exhaustion gracefully', async () => {mockOrchestrationService.executeOrchestration.mockRejectedValue(new Error('Insufficient agent capacity'));await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations/orch_12345/execute').expect(HttpStatus.SERVICE_UNAVAILABLE);});
  });

  describe('Performance and Load Testing', () => {it('should handle high-frequency status requests', async () => {const orchestrationId = 'orch_performance';
      const mockStatus = {
        orchestrationId,
        status: OrchestrationStatus.RUNNING,
        progress: { completedTasks: 1, totalTasks: 5 },
      };

      mockOrchestrationService.getOrchestrationStatus.mockResolvedValue(mockStatus);

      // Simulate 100 concurrent status requests
      const requests = Array.from({ length: 100 }, () =>
        request(app.getHttpServer())
          .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
      );

      const responses = await Promise.allSettled(requests);
      const successfulResponses = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === HttpStatus.OK);expect(successfulResponses.length).toBeGreaterThan(90); // 90% success rate
    });

    it('should maintain performance under load', async () => {const startTime = Date.now();// Execute multiple operations simultaneously
      const operations = [
        request(app.getHttpServer()).get('/browser-orchestration/orchestrations'),request(app.getHttpServer()).get('/browser-orchestration/agents/status'),request(app.getHttpServer()).get('/browser-orchestration/metrics/summary'),request(app.getHttpServer()).get('/browser-orchestration/health'),
      ];

      await Promise.all(operations);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // All operations complete within 5 seconds
    });
  });
});