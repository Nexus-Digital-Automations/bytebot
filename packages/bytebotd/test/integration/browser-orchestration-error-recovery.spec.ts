/**
 * Browser Orchestration Error Handling and Recovery Tests
 *
 * Comprehensive tests for error handling, recovery mechanisms, fault tolerance,
 * and system resilience in browser orchestration scenarios. Tests various
 * failure modes, recovery strategies, and system stability under adverse conditions.
 *
 * @author Claude Code
 * @version 1.0.0
 * @date 2025-09-20
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { BrowserUseModule } from '../src/browser-use/browser-use.module';
import { SecurityModule } from '../src/common/security/security.module';
import { AuthModule } from '../src/auth/auth.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  CreateOrchestrationDto,
  OrchestrationStrategy,
  TaskPriority,
  OrchestrationStatus,
} from '../src/browser-use/dto/browser-orchestration.dto';

describe('Browser Orchestration Error Handling and Recovery', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;

  // Error scenarios configuration
  const errorScenarios = {
    network: {
      timeouts: [
        'https://httpbin.org/delay/30',
        'https://httpbin.org/delay/60',
      ],
      unreachable: ['https://invalid-domain-12345.nonexistent'],
      slowConnections: ['https://httpbin.org/drip?duration=30&numbytes=1'],
      redirectLoops: ['https://httpbin.org/redirect/10'],
      sslErrors: [
        'https://self-signed.badssl.com/',
        'https://expired.badssl.com/',
      ],
    },
    browser: {
      memoryExhaustion: 'memory_exhaustion_task',
      crashSimulation: 'browser_crash_task',
      resourceLimits: 'resource_limit_task',
      invalidCommands: 'invalid_command_task',
    },
    agent: {
      processFailure: 'agent_process_failure',
      communicationLoss: 'agent_comm_loss',
      resourceStarvation: 'agent_resource_starvation',
      unexpectedShutdown: 'agent_unexpected_shutdown',
    },
    orchestration: {
      taskDependencyFailure: 'dependency_failure',
      circulaeDependencies: 'circular_deps',
      resourceConflicts: 'resource_conflicts',
      coordinationFailure: 'coordination_failure',
    },
  };

  const testConfig = {
    testTimeout: 180000, // 3 minutes for error recovery tests
    maxRetryAttempts: 3,
    retryDelayMs: 2000,
    recoveryTimeoutMs: 30000,
    healthCheckIntervalMs: 1000,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        SecurityModule,
        AuthModule,
        BrowserUseModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    authToken = await getTestAuthToken(app);

    // Clean test environment
    await cleanupTestData();
  }, testConfig.testTimeout);

  afterAll(async () => {
    await cleanupTestData();
    await app?.close();
  }, testConfig.testTimeout);

  describe('Network Error Handling', () => {
    it(
      'should handle connection timeouts with exponential backoff retry',
      async () => {
        const timeoutTestDto: CreateOrchestrationDto = {
          name: 'Network Timeout Recovery Test',
          strategy: OrchestrationStrategy.FAULT_TOLERANT,
          retryFailedTasks: true,
          maxRetryAttempts: 3,
          retryStrategy: 'exponential_backoff',
          tasks: [
            {
              name: 'Timeout Task 1',
              type: 'navigation',
              url: errorScenarios.network.timeouts[0],
              instructions: 'Navigate to slow endpoint (30s delay)',
              priority: TaskPriority.HIGH,
              timeout: 10000, // 10 second timeout (should fail)
              retryCount: 3,
            },
            {
              name: 'Timeout Task 2',
              type: 'navigation',
              url: errorScenarios.network.timeouts[1],
              instructions: 'Navigate to very slow endpoint (60s delay)',
              priority: TaskPriority.NORMAL,
              timeout: 15000, // 15 second timeout (should fail)
              retryCount: 2,
            },
            {
              name: 'Recovery Task',
              type: 'navigation',
              url: 'https://httpbin.org/get',
              instructions: 'Navigate to fast endpoint for recovery validation',
              priority: TaskPriority.CRITICAL,
              dependencies: ['Timeout Task 1', 'Timeout Task 2'],
              executeAfterFailure: true,
            },
          ],
        };

        const recoveryMetrics = await executeErrorRecoveryTest(timeoutTestDto, {
          expectPartialSuccess: true,
          trackRetryAttempts: true,
          validateSystemStability: true,
          monitorRecoveryTime: true,
        });

        // Validate timeout handling and recovery
        expect(recoveryMetrics.finalStatus).toBeOneOf([
          OrchestrationStatus.COMPLETED,
          OrchestrationStatus.PARTIALLY_COMPLETED,
        ]);

        expect(recoveryMetrics.errorHandling.timeoutsDetected).toBeGreaterThan(
          0,
        );
        expect(recoveryMetrics.errorHandling.retryAttempts).toBeGreaterThan(0);
        expect(
          recoveryMetrics.recovery.systemStabilityAfterErrors,
        ).toBeGreaterThan(80);
        expect(
          recoveryMetrics.recovery.recoveryTasksSuccessful,
        ).toBeGreaterThan(0);
      },
      testConfig.testTimeout,
    );

    it(
      'should handle unreachable domains with fallback mechanisms',
      async () => {
        const unreachableTestDto: CreateOrchestrationDto = {
          name: 'Unreachable Domain Recovery Test',
          strategy: OrchestrationStrategy.ADAPTIVE,
          enableFallbackUrls: true,
          tasks: [
            {
              name: 'Unreachable Domain Task',
              type: 'navigation',
              url: errorScenarios.network.unreachable[0],
              instructions: 'Navigate to unreachable domain',
              priority: TaskPriority.HIGH,
              fallbackUrls: ['https://httpbin.org/get', 'https://example.com'],
              maxRetries: 2,
            },
            {
              name: 'Network Validation Task',
              type: 'data_extraction',
              url: 'https://httpbin.org/ip',
              instructions: 'Validate network connectivity',
              priority: TaskPriority.CRITICAL,
              dependencies: ['Unreachable Domain Task'],
              executeAfterFailure: true,
            },
          ],
          errorHandling: {
            enableFallback: true,
            fallbackStrategy: 'alternative_urls',
            isolateFailedTasks: true,
            continueOnFailure: true,
          },
        };

        const recoveryMetrics = await executeErrorRecoveryTest(
          unreachableTestDto,
          {
            expectPartialSuccess: true,
            trackFallbackUsage: true,
            validateErrorIsolation: true,
          },
        );

        // Validate unreachable domain handling
        expect(
          recoveryMetrics.errorHandling.unreachableDomainsDetected,
        ).toBeGreaterThan(0);
        expect(
          recoveryMetrics.errorHandling.fallbackActivations,
        ).toBeGreaterThan(0);
        expect(recoveryMetrics.errorHandling.errorIsolationSuccess).toBe(true);
        expect(recoveryMetrics.recovery.continuationAfterFailure).toBe(true);
      },
      testConfig.testTimeout,
    );

    it(
      'should handle SSL certificate errors gracefully',
      async () => {
        const sslErrorTestDto: CreateOrchestrationDto = {
          name: 'SSL Error Recovery Test',
          strategy: OrchestrationStrategy.FAULT_TOLERANT,
          tasks: [
            {
              name: 'Self-Signed SSL Task',
              type: 'navigation',
              url: errorScenarios.network.sslErrors[0],
              instructions: 'Navigate to self-signed SSL site',
              priority: TaskPriority.NORMAL,
              sslHandling: {
                acceptSelfSigned: false, // Should fail
                validateCertificates: true,
              },
            },
            {
              name: 'Expired SSL Task',
              type: 'navigation',
              url: errorScenarios.network.sslErrors[1],
              instructions: 'Navigate to expired SSL site',
              priority: TaskPriority.NORMAL,
              sslHandling: {
                acceptExpired: false, // Should fail
                validateCertificates: true,
              },
            },
            {
              name: 'Secure Recovery Task',
              type: 'navigation',
              url: 'https://httpbin.org/get',
              instructions: 'Navigate to secure site for recovery',
              priority: TaskPriority.HIGH,
              dependencies: ['Self-Signed SSL Task', 'Expired SSL Task'],
              executeAfterFailure: true,
            },
          ],
          securitySettings: {
            strictSSL: true,
            validateCertificates: true,
            rejectUnauthorized: true,
          },
        };

        const recoveryMetrics = await executeErrorRecoveryTest(
          sslErrorTestDto,
          {
            expectPartialSuccess: true,
            trackSecurityErrors: true,
            validateSecurityCompliance: true,
          },
        );

        // Validate SSL error handling
        expect(recoveryMetrics.errorHandling.sslErrorsDetected).toBeGreaterThan(
          0,
        );
        expect(recoveryMetrics.security.complianceMaintained).toBe(true);
        expect(recoveryMetrics.recovery.secureRecoverySuccess).toBe(true);
      },
      testConfig.testTimeout,
    );
  });

  describe('Browser Process Error Handling', () => {
    it(
      'should recover from browser process crashes',
      async () => {
        const browserCrashTestDto: CreateOrchestrationDto = {
          name: 'Browser Crash Recovery Test',
          strategy: OrchestrationStrategy.FAULT_TOLERANT,
          maxConcurrentAgents: 4,
          enableProcessRecovery: true,
          tasks: [
            {
              name: 'Stable Task 1',
              type: 'navigation',
              url: 'https://httpbin.org/get',
              instructions: 'Stable navigation before crash',
              priority: TaskPriority.HIGH,
            },
            {
              name: 'Memory Exhaustion Task',
              type: 'memory_intensive',
              url: 'https://httpbin.org/html',
              instructions:
                'Execute memory-intensive operation to trigger crash',
              priority: TaskPriority.NORMAL,
              memoryLimit: '32MB', // Artificially low to trigger failure
              expectedToFail: true,
            },
            {
              name: 'Browser Crash Simulation',
              type: 'process_failure_simulation',
              url: 'internal://crash-simulator',
              instructions: 'Simulate browser process crash',
              priority: TaskPriority.LOW,
              simulationConfig: {
                failureType: 'browser_crash',
                severity: 'process_termination',
              },
              expectedToFail: true,
            },
            {
              name: 'Recovery Validation Task',
              type: 'navigation',
              url: 'https://httpbin.org/json',
              instructions: 'Validate browser recovery after crash',
              priority: TaskPriority.CRITICAL,
              dependencies: ['Stable Task 1'],
              executeAfterFailure: true,
              requiresNewProcess: true,
            },
          ],
          processManagement: {
            enableCrashDetection: true,
            automaticRestart: true,
            maxRestartAttempts: 3,
            restartDelay: 5000,
            processHealthMonitoring: true,
          },
        };

        const recoveryMetrics = await executeErrorRecoveryTest(
          browserCrashTestDto,
          {
            expectPartialSuccess: true,
            trackProcessFailures: true,
            validateProcessRecovery: true,
            monitorResourceUsage: true,
          },
        );

        // Validate browser crash recovery
        expect(recoveryMetrics.processFailures.crashesDetected).toBeGreaterThan(
          0,
        );
        expect(
          recoveryMetrics.processFailures.automaticRestarts,
        ).toBeGreaterThan(0);
        expect(recoveryMetrics.recovery.processRecoverySuccess).toBe(true);
        expect(recoveryMetrics.recovery.newProcessCreation).toBe(true);
      },
      testConfig.testTimeout,
    );

    it(
      'should handle resource exhaustion scenarios',
      async () => {
        const resourceExhaustionDto: CreateOrchestrationDto = {
          name: 'Resource Exhaustion Recovery Test',
          strategy: OrchestrationStrategy.RESOURCE_AWARE,
          maxConcurrentAgents: 6,
          resourceLimits: {
            maxMemoryPerAgent: '512MB',
            maxCpuPercent: 80,
            maxOpenFiles: 100,
            maxBandwidth: '10MB/s',
          },
          tasks: [
            {
              name: 'Memory Intensive Task 1',
              type: 'large_data_processing',
              url: 'https://httpbin.org/json',
              instructions: 'Process large JSON data set',
              priority: TaskPriority.HIGH,
              resourceRequirements: {
                memory: '1GB', // Exceeds limit
                processingTime: '30s',
              },
              expectedToFail: true,
            },
            {
              name: 'CPU Intensive Task',
              type: 'computational',
              url: 'https://httpbin.org/html',
              instructions: 'Execute CPU-intensive computation',
              priority: TaskPriority.NORMAL,
              resourceRequirements: {
                cpu: '100%', // Exceeds limit
                duration: '60s',
              },
              expectedToFail: true,
            },
            {
              name: 'Bandwidth Intensive Task',
              type: 'large_download',
              url: 'https://httpbin.org/drip?duration=10&numbytes=50000000',
              instructions: 'Download large file',
              priority: TaskPriority.LOW,
              resourceRequirements: {
                bandwidth: '50MB/s', // Exceeds limit
              },
              expectedToFail: true,
            },
            {
              name: 'Resource-Aware Recovery Task',
              type: 'lightweight_operation',
              url: 'https://httpbin.org/status/200',
              instructions: 'Execute lightweight operation for recovery',
              priority: TaskPriority.CRITICAL,
              resourceRequirements: {
                memory: '64MB',
                cpu: '20%',
                bandwidth: '1MB/s',
              },
              executeAfterFailure: true,
            },
          ],
          resourceManagement: {
            enableLimits: true,
            enforceQuotas: true,
            gracefulDegradation: true,
            resourceMonitoring: true,
            alertThresholds: {
              memory: 85,
              cpu: 75,
              bandwidth: 80,
            },
          },
        };

        const recoveryMetrics = await executeErrorRecoveryTest(
          resourceExhaustionDto,
          {
            expectPartialSuccess: true,
            trackResourceUsage: true,
            validateResourceLimits: true,
            monitorResourceRecovery: true,
          },
        );

        // Validate resource exhaustion handling
        expect(
          recoveryMetrics.resourceUsage.limitViolationsDetected,
        ).toBeGreaterThan(0);
        expect(recoveryMetrics.resourceUsage.quotaEnforcement).toBe(true);
        expect(recoveryMetrics.recovery.resourceRecoverySuccess).toBe(true);
        expect(recoveryMetrics.recovery.gracefulDegradation).toBe(true);
      },
      testConfig.testTimeout,
    );
  });

  describe('Agent Coordination Error Handling', () => {
    it(
      'should handle agent communication failures',
      async () => {
        const commFailureDto: CreateOrchestrationDto = {
          name: 'Agent Communication Failure Test',
          strategy: OrchestrationStrategy.DISTRIBUTED,
          maxConcurrentAgents: 5,
          communicationSettings: {
            timeout: 5000,
            retryCount: 3,
            heartbeatInterval: 2000,
            reconnectAttempts: 5,
          },
          tasks: [
            {
              name: 'Normal Communication Task',
              type: 'coordination_test',
              url: 'https://httpbin.org/get',
              instructions: 'Test normal agent communication',
              priority: TaskPriority.HIGH,
              requiresCoordination: true,
            },
            {
              name: 'Communication Failure Simulation',
              type: 'communication_failure',
              url: 'internal://comm-failure-simulator',
              instructions: 'Simulate agent communication failure',
              priority: TaskPriority.NORMAL,
              simulationConfig: {
                failureType: 'network_partition',
                duration: 10000, // 10 seconds
                affectedAgents: 2,
              },
              expectedToFail: true,
            },
            {
              name: 'Communication Recovery Task',
              type: 'coordination_validation',
              url: 'https://httpbin.org/json',
              instructions: 'Validate communication recovery',
              priority: TaskPriority.CRITICAL,
              requiresCoordination: true,
              executeAfterFailure: true,
              waitForRecovery: true,
            },
          ],
          faultTolerance: {
            enablePartitioning: true,
            isolateFailedAgents: true,
            enableRecoveryMode: true,
            maxPartitionDuration: 30000,
          },
        };

        const recoveryMetrics = await executeErrorRecoveryTest(commFailureDto, {
          expectPartialSuccess: true,
          trackCommunicationFailures: true,
          validateCoordinationRecovery: true,
          monitorNetworkPartitions: true,
        });

        // Validate communication failure recovery
        expect(recoveryMetrics.communication.failuresDetected).toBeGreaterThan(
          0,
        );
        expect(recoveryMetrics.communication.partitionsHandled).toBeGreaterThan(
          0,
        );
        expect(recoveryMetrics.recovery.coordinationRecovery).toBe(true);
        expect(recoveryMetrics.recovery.agentIsolationSuccess).toBe(true);
      },
      testConfig.testTimeout,
    );

    it(
      'should handle agent load balancing failures',
      async () => {
        const loadBalancingFailureDto: CreateOrchestrationDto = {
          name: 'Load Balancing Failure Test',
          strategy: OrchestrationStrategy.LOAD_BALANCED,
          maxConcurrentAgents: 4,
          loadBalancing: {
            strategy: 'round_robin',
            healthChecks: true,
            failoverEnabled: true,
            rebalanceThreshold: 0.8,
          },
          tasks: [
            {
              name: 'Balanced Task 1',
              type: 'balanced_workload',
              url: 'https://httpbin.org/get?task=1',
              instructions: 'Execute balanced workload task 1',
              priority: TaskPriority.HIGH,
              loadWeight: 1.0,
            },
            {
              name: 'Agent Overload Simulation',
              type: 'agent_overload',
              url: 'internal://overload-simulator',
              instructions: 'Simulate agent overload',
              priority: TaskPriority.NORMAL,
              simulationConfig: {
                overloadType: 'cpu_spike',
                intensity: 100,
                duration: 15000,
                targetAgent: 'agent_2',
              },
              expectedToFail: true,
            },
            {
              name: 'Balanced Task 2',
              type: 'balanced_workload',
              url: 'https://httpbin.org/get?task=2',
              instructions: 'Execute balanced workload task 2',
              priority: TaskPriority.HIGH,
              loadWeight: 1.0,
              requiresLoadBalancing: true,
            },
            {
              name: 'Load Recovery Validation',
              type: 'load_validation',
              url: 'https://httpbin.org/json',
              instructions: 'Validate load balancing recovery',
              priority: TaskPriority.CRITICAL,
              dependencies: ['Balanced Task 1', 'Balanced Task 2'],
              executeAfterFailure: true,
            },
          ],
        };

        const recoveryMetrics = await executeErrorRecoveryTest(
          loadBalancingFailureDto,
          {
            expectPartialSuccess: true,
            trackLoadBalancing: true,
            validateFailover: true,
            monitorAgentHealth: true,
          },
        );

        // Validate load balancing failure recovery
        expect(recoveryMetrics.loadBalancing.overloadDetected).toBe(true);
        expect(recoveryMetrics.loadBalancing.failoverActivated).toBe(true);
        expect(recoveryMetrics.recovery.loadBalancingRecovery).toBe(true);
        expect(recoveryMetrics.recovery.agentHealthRestored).toBe(true);
      },
      testConfig.testTimeout,
    );
  });

  describe('Task Dependency Error Handling', () => {
    it(
      'should handle dependency chain failures with alternative paths',
      async () => {
        const dependencyFailureDto: CreateOrchestrationDto = {
          name: 'Dependency Chain Failure Test',
          strategy: OrchestrationStrategy.DEPENDENCY_AWARE,
          dependencyHandling: {
            enableAlternativePaths: true,
            skipFailedDependencies: false,
            maxDependencyDepth: 5,
            circularDependencyDetection: true,
          },
          tasks: [
            {
              name: 'Root Task',
              type: 'navigation',
              url: 'https://httpbin.org/get',
              instructions: 'Root task - foundation',
              priority: TaskPriority.CRITICAL,
              taskId: 'root_task',
            },
            {
              name: 'Dependency Task A',
              type: 'data_extraction',
              url: 'https://httpbin.org/json',
              instructions: 'Primary dependency task A',
              priority: TaskPriority.HIGH,
              dependencies: ['root_task'],
              taskId: 'dep_task_a',
            },
            {
              name: 'Failing Dependency Task B',
              type: 'navigation',
              url: errorScenarios.network.unreachable[0],
              instructions: 'Failing dependency task B',
              priority: TaskPriority.HIGH,
              dependencies: ['root_task'],
              taskId: 'failing_dep_task_b',
              expectedToFail: true,
            },
            {
              name: 'Alternative Task B',
              type: 'data_extraction',
              url: 'https://httpbin.org/ip',
              instructions: 'Alternative for failing task B',
              priority: TaskPriority.HIGH,
              dependencies: ['root_task'],
              taskId: 'alt_task_b',
              isAlternativeFor: 'failing_dep_task_b',
            },
            {
              name: 'Final Task',
              type: 'data_aggregation',
              url: 'internal://aggregator',
              instructions: 'Final task requiring all dependencies',
              priority: TaskPriority.CRITICAL,
              dependencies: ['dep_task_a', 'failing_dep_task_b'],
              alternativeDependencies: ['dep_task_a', 'alt_task_b'],
              taskId: 'final_task',
            },
          ],
        };

        const recoveryMetrics = await executeErrorRecoveryTest(
          dependencyFailureDto,
          {
            expectPartialSuccess: true,
            trackDependencyFailures: true,
            validateAlternativePaths: true,
            monitorTaskChains: true,
          },
        );

        // Validate dependency failure recovery
        expect(recoveryMetrics.dependencies.failuresDetected).toBeGreaterThan(
          0,
        );
        expect(
          recoveryMetrics.dependencies.alternativePathsUsed,
        ).toBeGreaterThan(0);
        expect(recoveryMetrics.recovery.dependencyChainRecovery).toBe(true);
        expect(recoveryMetrics.finalStatus).toBeOneOf([
          OrchestrationStatus.COMPLETED,
          OrchestrationStatus.PARTIALLY_COMPLETED,
        ]);
      },
      testConfig.testTimeout,
    );

    it(
      'should detect and handle circular dependencies',
      async () => {
        const circularDependencyDto: CreateOrchestrationDto = {
          name: 'Circular Dependency Detection Test',
          strategy: OrchestrationStrategy.DEPENDENCY_AWARE,
          dependencyHandling: {
            circularDependencyDetection: true,
            breakCircularDependencies: true,
            dependencyValidation: true,
          },
          tasks: [
            {
              name: 'Task A',
              type: 'navigation',
              url: 'https://httpbin.org/get?task=A',
              instructions: 'Task A - depends on C',
              priority: TaskPriority.HIGH,
              dependencies: ['task_c'],
              taskId: 'task_a',
            },
            {
              name: 'Task B',
              type: 'data_extraction',
              url: 'https://httpbin.org/json?task=B',
              instructions: 'Task B - depends on A',
              priority: TaskPriority.HIGH,
              dependencies: ['task_a'],
              taskId: 'task_b',
            },
            {
              name: 'Task C',
              type: 'data_processing',
              url: 'https://httpbin.org/html?task=C',
              instructions:
                'Task C - depends on B (creates circular dependency)',
              priority: TaskPriority.HIGH,
              dependencies: ['task_b'],
              taskId: 'task_c',
            },
            {
              name: 'Independent Task',
              type: 'navigation',
              url: 'https://httpbin.org/status/200',
              instructions: 'Independent task - no dependencies',
              priority: TaskPriority.NORMAL,
              taskId: 'independent_task',
            },
          ],
        };

        const recoveryMetrics = await executeErrorRecoveryTest(
          circularDependencyDto,
          {
            expectPartialSuccess: true,
            trackCircularDependencies: true,
            validateDependencyResolution: true,
            allowPartialExecution: true,
          },
        );

        // Validate circular dependency handling
        expect(
          recoveryMetrics.dependencies.circularDependenciesDetected,
        ).toBeGreaterThan(0);
        expect(
          recoveryMetrics.dependencies.circularDependenciesBroken,
        ).toBeGreaterThan(0);
        expect(
          recoveryMetrics.recovery.independentTasksCompleted,
        ).toBeGreaterThan(0);
        expect(recoveryMetrics.errorHandling.validationErrors).toBeGreaterThan(
          0,
        );
      },
      testConfig.testTimeout,
    );
  });

  describe('System-Level Error Recovery', () => {
    it(
      'should handle database connection failures with retry and recovery',
      async () => {
        const dbFailureDto: CreateOrchestrationDto = {
          name: 'Database Failure Recovery Test',
          strategy: OrchestrationStrategy.FAULT_TOLERANT,
          persistenceSettings: {
            enablePersistence: true,
            retryDatabaseOperations: true,
            maxDbRetries: 5,
            dbFailoverEnabled: true,
          },
          tasks: [
            {
              name: 'Database Write Task',
              type: 'data_persistence',
              url: 'https://httpbin.org/json',
              instructions: 'Write data to database',
              priority: TaskPriority.HIGH,
              persistenceRequired: true,
            },
            {
              name: 'Database Failure Simulation',
              type: 'db_failure_simulation',
              url: 'internal://db-failure-simulator',
              instructions: 'Simulate database connection failure',
              priority: TaskPriority.NORMAL,
              simulationConfig: {
                failureType: 'connection_loss',
                duration: 15000,
              },
              expectedToFail: true,
            },
            {
              name: 'Database Recovery Validation',
              type: 'data_persistence',
              url: 'https://httpbin.org/ip',
              instructions: 'Validate database recovery',
              priority: TaskPriority.CRITICAL,
              persistenceRequired: true,
              executeAfterFailure: true,
            },
          ],
        };

        const recoveryMetrics = await executeErrorRecoveryTest(dbFailureDto, {
          expectPartialSuccess: true,
          trackDatabaseFailures: true,
          validateDataIntegrity: true,
          monitorPersistence: true,
        });

        // Validate database failure recovery
        expect(recoveryMetrics.database.failuresDetected).toBeGreaterThan(0);
        expect(recoveryMetrics.database.retryAttempts).toBeGreaterThan(0);
        expect(recoveryMetrics.recovery.databaseRecovery).toBe(true);
        expect(recoveryMetrics.recovery.dataIntegrityMaintained).toBe(true);
      },
      testConfig.testTimeout,
    );

    it(
      'should maintain orchestration state consistency during failures',
      async () => {
        const stateConsistencyDto: CreateOrchestrationDto = {
          name: 'State Consistency During Failures Test',
          strategy: OrchestrationStrategy.STATE_CONSISTENT,
          stateManagement: {
            enableStateTracking: true,
            stateCheckpoints: true,
            rollbackOnFailure: true,
            consistencyValidation: true,
          },
          tasks: [
            {
              name: 'State Setup Task',
              type: 'state_initialization',
              url: 'https://httpbin.org/get',
              instructions: 'Initialize orchestration state',
              priority: TaskPriority.CRITICAL,
              stateOperations: {
                createCheckpoint: true,
                validateState: true,
              },
            },
            {
              name: 'State Modification Task 1',
              type: 'state_modification',
              url: 'https://httpbin.org/json',
              instructions: 'Modify orchestration state',
              priority: TaskPriority.HIGH,
              dependencies: ['State Setup Task'],
              stateOperations: {
                modifyState: true,
                createCheckpoint: true,
              },
            },
            {
              name: 'Failure Task',
              type: 'state_corruption',
              url: errorScenarios.network.unreachable[0],
              instructions: 'Task that corrupts state',
              priority: TaskPriority.NORMAL,
              dependencies: ['State Modification Task 1'],
              stateOperations: {
                corruptState: true,
              },
              expectedToFail: true,
            },
            {
              name: 'State Recovery Task',
              type: 'state_recovery',
              url: 'https://httpbin.org/status/200',
              instructions: 'Recover from state corruption',
              priority: TaskPriority.CRITICAL,
              dependencies: ['State Modification Task 1'],
              executeAfterFailure: true,
              stateOperations: {
                rollbackToCheckpoint: true,
                validateState: true,
                restoreConsistency: true,
              },
            },
          ],
        };

        const recoveryMetrics = await executeErrorRecoveryTest(
          stateConsistencyDto,
          {
            expectPartialSuccess: true,
            trackStateChanges: true,
            validateStateConsistency: true,
            monitorCheckpoints: true,
          },
        );

        // Validate state consistency during failures
        expect(
          recoveryMetrics.stateManagement.checkpointsCreated,
        ).toBeGreaterThan(0);
        expect(
          recoveryMetrics.stateManagement.rollbacksExecuted,
        ).toBeGreaterThan(0);
        expect(recoveryMetrics.recovery.stateConsistencyMaintained).toBe(true);
        expect(recoveryMetrics.recovery.stateRecoverySuccess).toBe(true);
      },
      testConfig.testTimeout,
    );
  });

  // Helper Functions
  async function executeErrorRecoveryTest(
    orchestrationDto: CreateOrchestrationDto,
    options: {
      expectPartialSuccess?: boolean;
      trackRetryAttempts?: boolean;
      trackFallbackUsage?: boolean;
      trackProcessFailures?: boolean;
      trackCommunicationFailures?: boolean;
      trackDependencyFailures?: boolean;
      trackCircularDependencies?: boolean;
      trackDatabaseFailures?: boolean;
      trackResourceUsage?: boolean;
      trackSecurityErrors?: boolean;
      trackStateChanges?: boolean;
      trackLoadBalancing?: boolean;
      validateSystemStability?: boolean;
      validateErrorIsolation?: boolean;
      validateProcessRecovery?: boolean;
      validateCoordinationRecovery?: boolean;
      validateAlternativePaths?: boolean;
      validateDependencyResolution?: boolean;
      validateDataIntegrity?: boolean;
      validateStateConsistency?: boolean;
      validateResourceLimits?: boolean;
      validateSecurityCompliance?: boolean;
      validateFailover?: boolean;
      monitorRecoveryTime?: boolean;
      monitorResourceUsage?: boolean;
      monitorNetworkPartitions?: boolean;
      monitorTaskChains?: boolean;
      monitorPersistence?: boolean;
      monitorCheckpoints?: boolean;
      monitorAgentHealth?: boolean;
      monitorResourceRecovery?: boolean;
      allowPartialExecution?: boolean;
    },
  ): Promise<any> {
    const metrics = {
      finalStatus: OrchestrationStatus.PENDING,
      errorHandling: {},
      recovery: {},
      processFailures: {},
      communication: {},
      dependencies: {},
      database: {},
      stateManagement: {},
      resourceUsage: {},
      security: {},
      loadBalancing: {},
    };

    const startTime = Date.now();

    try {
      // Create orchestration
      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orchestrationDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      // Execute orchestration
      await request(app.getHttpServer())
        .post(
          `/browser-orchestration/orchestrations/${orchestrationId}/execute`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // Monitor execution and collect metrics
      let status = OrchestrationStatus.RUNNING;
      let monitoringAttempts = 0;
      const maxMonitoringAttempts = Math.floor(
        testConfig.testTimeout / testConfig.healthCheckIntervalMs,
      );

      while (
        status === OrchestrationStatus.RUNNING &&
        monitoringAttempts < maxMonitoringAttempts
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, testConfig.healthCheckIntervalMs),
        );

        try {
          const statusResponse = await request(app.getHttpServer())
            .get(
              `/browser-orchestration/orchestrations/${orchestrationId}/status`,
            )
            .set('Authorization', `Bearer ${authToken}`);

          status = statusResponse.body.status;

          // Collect metrics based on options
          if (options.trackRetryAttempts) {
            metrics.errorHandling.retryAttempts =
              statusResponse.body.retryAttempts || 0;
          }

          if (options.trackProcessFailures) {
            metrics.processFailures.crashesDetected =
              statusResponse.body.processFailures?.crashes || 0;
            metrics.processFailures.automaticRestarts =
              statusResponse.body.processFailures?.restarts || 0;
          }

          if (options.trackResourceUsage) {
            metrics.resourceUsage.limitViolationsDetected =
              statusResponse.body.resourceViolations || 0;
          }

          // Add more metric collection based on options...
        } catch (error) {
          console.warn('Error monitoring orchestration:', error);
        }

        monitoringAttempts++;
      }

      metrics.finalStatus = status;

      // Post-execution validation and metric collection
      await collectPostExecutionMetrics(orchestrationId, metrics, options);
    } catch (error) {
      console.error('Error in executeErrorRecoveryTest:', error);
      throw error;
    }

    const endTime = Date.now();
    metrics.totalExecutionTime = endTime - startTime;

    return metrics;
  }

  async function collectPostExecutionMetrics(
    orchestrationId: string,
    metrics: any,
    options: any,
  ): Promise<void> {
    try {
      // Get final status and detailed metrics
      const finalStatusResponse = await request(app.getHttpServer())
        .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      // Get agent status
      const agentStatusResponse = await request(app.getHttpServer())
        .get('/browser-orchestration/agents/status')
        .set('Authorization', `Bearer ${authToken}`);

      // Collect specific metrics based on test options
      if (options.validateSystemStability) {
        metrics.recovery.systemStabilityAfterErrors = calculateSystemStability(
          finalStatusResponse.body,
          agentStatusResponse.body,
        );
      }

      if (options.validateErrorIsolation) {
        metrics.errorHandling.errorIsolationSuccess = validateErrorIsolation(
          finalStatusResponse.body,
        );
      }

      // Add more metric collection...
    } catch (error) {
      console.warn('Error collecting post-execution metrics:', error);
    }
  }

  function calculateSystemStability(
    orchestrationStatus: any,
    agentStatus: any,
  ): number {
    // Calculate system stability score based on various factors
    let stabilityScore = 100;

    // Deduct points for failures
    if (orchestrationStatus.progress?.failedTasks > 0) {
      stabilityScore -=
        (orchestrationStatus.progress.failedTasks /
          orchestrationStatus.progress.totalTasks) *
        30;
    }

    // Deduct points for agent issues
    if (agentStatus.unhealthyAgents > 0) {
      stabilityScore -=
        (agentStatus.unhealthyAgents / agentStatus.totalAgents) * 20;
    }

    return Math.max(0, stabilityScore);
  }

  function validateErrorIsolation(orchestrationStatus: any): boolean {
    // Validate that errors were properly isolated and didn't spread
    return orchestrationStatus.errorIsolation?.successful || false;
  }

  async function cleanupTestData(): Promise<void> {
    try {
      await prismaService.browserTask.deleteMany({
        where: { name: { contains: 'Test' } },
      });
      await prismaService.browserSession.deleteMany({
        where: { name: { contains: 'Test' } },
      });
      await prismaService.browserOrchestration.deleteMany({
        where: { name: { contains: 'Test' } },
      });
    } catch (error) {
      console.warn('Error cleaning test data:', error);
    }
  }

  async function getTestAuthToken(app: INestApplication): Promise<string> {
    try {
      const authResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: process.env.TEST_USERNAME || 'test-user',
          password: process.env.TEST_PASSWORD || 'test-password',
        });

      if (authResponse.body?.accessToken) {
        return authResponse.body.accessToken;
      }
    } catch (error) {
      // Use mock token for testing
    }

    return 'mock-error-recovery-test-token';
  }
});

// Custom Jest matcher
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(values: any[]): R;
    }
  }
}

expect.extend({
  toBeOneOf(received, argument) {
    const pass = argument.includes(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be one of ${argument}`
          : `expected ${received} to be one of ${argument}`,
      pass,
    };
  },
});
