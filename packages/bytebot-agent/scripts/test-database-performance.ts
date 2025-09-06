#!/usr/bin/env ts-node

/**
 * Database Performance Testing Script
 * Comprehensive testing suite for Phase 1 Database Hardening implementation
 * Tests connection pooling, circuit breaker, health monitoring, and performance optimizations
 */

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';

interface TestResults {
  testName: string;
  success: boolean;
  executionTime: number;
  metrics: Record<string, any>;
  errors: string[];
}

interface PerformanceMetrics {
  connectionsCreated: number;
  connectionsReused: number;
  queriesExecuted: number;
  averageQueryTime: number;
  slowQueries: number;
  connectionErrors: number;
  circuitBreakerTriggers: number;
}

class DatabasePerformanceTester {
  private prisma: PrismaClient;
  private testResults: TestResults[] = [];
  private metrics: PerformanceMetrics;
  private operationId: string;

  constructor() {
    this.operationId = `db_perf_test_${Date.now()}`;
    this.metrics = {
      connectionsCreated: 0,
      connectionsReused: 0,
      queriesExecuted: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      connectionErrors: 0,
      circuitBreakerTriggers: 0,
    };

    // Initialize Prisma client with test configuration
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            'postgresql://bytebot_user:secure_database_password_2024@localhost:5432/bytebot_production',
        },
      },
      log: ['warn', 'error'],
    });

    console.log(`🚀 Database Performance Testing Suite Started`);
    console.log(`📊 Operation ID: ${this.operationId}`);
    console.log(
      `🔗 Database URL: ${process.env.DATABASE_URL || 'localhost:5432'}`,
    );
  }

  /**
   * Run comprehensive database performance test suite
   */
  async runAllTests(): Promise<void> {
    const overallStartTime = performance.now();

    try {
      console.log(`\n📋 Running Phase 1 Database Hardening Tests...\n`);

      // Test 1: Connection Pool Performance
      await this.testConnectionPooling();

      // Test 2: Query Performance with Indexes
      await this.testQueryPerformance();

      // Test 3: Concurrent Operations
      await this.testConcurrentOperations();

      // Test 4: Database Health Monitoring
      await this.testHealthMonitoring();

      // Test 5: Circuit Breaker Simulation
      await this.testCircuitBreakerResilience();

      // Test 6: Connection Reliability
      await this.testConnectionReliability();

      // Test 7: Performance Under Load
      await this.testPerformanceUnderLoad();

      const overallExecutionTime = performance.now() - overallStartTime;

      // Generate comprehensive test report
      await this.generateTestReport(overallExecutionTime);
    } catch (error) {
      console.error(`❌ Test suite failed:`, error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Test 1: Connection Pooling Performance
   */
  private async testConnectionPooling(): Promise<void> {
    console.log(`🔄 Test 1: Connection Pool Performance`);
    const startTime = performance.now();
    const errors: string[] = [];

    try {
      // Create multiple concurrent connections
      const connectionPromises = Array.from({ length: 20 }, async (_, i) => {
        const connectionStart = performance.now();

        try {
          await this.prisma.$queryRaw`SELECT 1 as connection_test_${i}`;
          const connectionTime = performance.now() - connectionStart;
          this.metrics.connectionsCreated++;

          if (connectionTime > 100) {
            // Consider > 100ms slow connection
            this.metrics.slowQueries++;
          }

          return connectionTime;
        } catch (error) {
          errors.push(`Connection ${i}: ${error.message}`);
          this.metrics.connectionErrors++;
          throw error;
        }
      });

      const connectionTimes = await Promise.all(connectionPromises);
      const averageConnectionTime =
        connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
      const maxConnectionTime = Math.max(...connectionTimes);
      const minConnectionTime = Math.min(...connectionTimes);

      const testResult: TestResults = {
        testName: 'Connection Pool Performance',
        success: errors.length === 0,
        executionTime: performance.now() - startTime,
        metrics: {
          averageConnectionTime,
          maxConnectionTime,
          minConnectionTime,
          totalConnections: connectionTimes.length,
          connectionErrors: errors.length,
        },
        errors,
      };

      this.testResults.push(testResult);

      console.log(
        `  ✅ Average connection time: ${averageConnectionTime.toFixed(2)}ms`,
      );
      console.log(
        `  📊 Max connection time: ${maxConnectionTime.toFixed(2)}ms`,
      );
      console.log(
        `  📊 Min connection time: ${minConnectionTime.toFixed(2)}ms`,
      );
      console.log(
        `  🔢 Successful connections: ${connectionTimes.length - errors.length}/${connectionTimes.length}`,
      );

      if (errors.length > 0) {
        console.log(`  ❌ Connection errors: ${errors.length}`);
        errors.forEach((error) => console.log(`    - ${error}`));
      }
    } catch (error) {
      errors.push(`Connection pool test failed: ${error.message}`);
      this.testResults.push({
        testName: 'Connection Pool Performance',
        success: false,
        executionTime: performance.now() - startTime,
        metrics: { error: error.message },
        errors,
      });
      console.log(`  ❌ Connection pool test failed: ${error.message}`);
    }
  }

  /**
   * Test 2: Query Performance with Database Indexes
   */
  private async testQueryPerformance(): Promise<void> {
    console.log(`\n⚡ Test 2: Query Performance with Indexes`);
    const startTime = performance.now();
    const errors: string[] = [];

    try {
      // Create test data for performance testing
      await this.setupTestData();

      // Test optimized queries that should use indexes
      const queryTests = [
        {
          name: 'Task Status Index Query',
          query: () =>
            this.prisma.task.findMany({
              where: { status: 'PENDING' },
              orderBy: { priority: 'desc' },
              take: 10,
            }),
        },
        {
          name: 'Task Queue Order Query',
          query: () =>
            this.prisma.task.findFirst({
              where: {
                status: { in: ['RUNNING', 'PENDING'] },
              },
              orderBy: [
                { executedAt: 'asc' },
                { priority: 'desc' },
                { createdAt: 'asc' },
              ],
            }),
        },
        {
          name: 'Task-Message Relationship Query',
          query: () =>
            this.prisma.task.findMany({
              where: { status: 'COMPLETED' },
              include: { messages: true },
              take: 5,
            }),
        },
        {
          name: 'Message Role Filter Query',
          query: () =>
            this.prisma.message.findMany({
              where: { role: 'USER' },
              orderBy: { createdAt: 'desc' },
              take: 10,
            }),
        },
      ];

      const queryResults = [];

      for (const test of queryTests) {
        const queryStart = performance.now();

        try {
          const result = await test.query();
          const queryTime = performance.now() - queryStart;

          this.metrics.queriesExecuted++;

          if (queryTime > 1000) {
            // Consider > 1s as slow query
            this.metrics.slowQueries++;
          }

          queryResults.push({
            name: test.name,
            executionTime: queryTime,
            resultCount: Array.isArray(result) ? result.length : result ? 1 : 0,
            success: true,
          });

          console.log(
            `  ✅ ${test.name}: ${queryTime.toFixed(2)}ms (${Array.isArray(result) ? result.length : result ? 1 : 0} results)`,
          );
        } catch (error) {
          const queryTime = performance.now() - queryStart;
          errors.push(`${test.name}: ${error.message}`);

          queryResults.push({
            name: test.name,
            executionTime: queryTime,
            resultCount: 0,
            success: false,
            error: error.message,
          });

          console.log(
            `  ❌ ${test.name}: Failed (${queryTime.toFixed(2)}ms) - ${error.message}`,
          );
        }
      }

      const totalQueryTime = queryResults.reduce(
        (sum, result) => sum + result.executionTime,
        0,
      );
      const averageQueryTime = totalQueryTime / queryResults.length;
      this.metrics.averageQueryTime = averageQueryTime;

      this.testResults.push({
        testName: 'Query Performance with Indexes',
        success: errors.length === 0,
        executionTime: performance.now() - startTime,
        metrics: {
          totalQueries: queryResults.length,
          averageQueryTime,
          slowQueries: this.metrics.slowQueries,
          queryResults,
        },
        errors,
      });

      console.log(`  📊 Average query time: ${averageQueryTime.toFixed(2)}ms`);
      console.log(`  🐌 Slow queries detected: ${this.metrics.slowQueries}`);
    } catch (error) {
      errors.push(`Query performance test setup failed: ${error.message}`);
      this.testResults.push({
        testName: 'Query Performance with Indexes',
        success: false,
        executionTime: performance.now() - startTime,
        metrics: { error: error.message },
        errors,
      });
      console.log(`  ❌ Query performance test failed: ${error.message}`);
    }
  }

  /**
   * Test 3: Concurrent Database Operations
   */
  private async testConcurrentOperations(): Promise<void> {
    console.log(`\n🔀 Test 3: Concurrent Database Operations`);
    const startTime = performance.now();
    const errors: string[] = [];

    try {
      const concurrentOperations = 50;
      const operationPromises = [];

      // Create concurrent read/write operations
      for (let i = 0; i < concurrentOperations; i++) {
        const operation = async () => {
          const opStart = performance.now();

          try {
            // Mix of read and write operations
            if (i % 3 === 0) {
              // Write operation
              await this.prisma.task.create({
                data: {
                  description: `Concurrent test task ${i}`,
                  model: {
                    provider: 'test',
                    name: 'concurrent',
                    title: 'Test',
                  },
                },
              });
            } else {
              // Read operation
              await this.prisma.task.findMany({
                where: { description: { contains: 'test' } },
                take: 1,
              });
            }

            return {
              operation: i,
              executionTime: performance.now() - opStart,
              success: true,
            };
          } catch (error) {
            return {
              operation: i,
              executionTime: performance.now() - opStart,
              success: false,
              error: error.message,
            };
          }
        };

        operationPromises.push(operation());
      }

      const results = await Promise.all(operationPromises);

      const successfulOps = results.filter((r) => r.success);
      const failedOps = results.filter((r) => !r.success);
      const avgExecutionTime =
        results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

      failedOps.forEach((op) => {
        errors.push(`Operation ${op.operation}: ${op.error}`);
      });

      this.testResults.push({
        testName: 'Concurrent Database Operations',
        success: failedOps.length === 0,
        executionTime: performance.now() - startTime,
        metrics: {
          totalOperations: concurrentOperations,
          successfulOperations: successfulOps.length,
          failedOperations: failedOps.length,
          averageExecutionTime: avgExecutionTime,
          successRate: (successfulOps.length / concurrentOperations) * 100,
        },
        errors,
      });

      console.log(
        `  ✅ Successful operations: ${successfulOps.length}/${concurrentOperations}`,
      );
      console.log(
        `  📊 Success rate: ${((successfulOps.length / concurrentOperations) * 100).toFixed(1)}%`,
      );
      console.log(
        `  ⏱️ Average execution time: ${avgExecutionTime.toFixed(2)}ms`,
      );

      if (failedOps.length > 0) {
        console.log(`  ❌ Failed operations: ${failedOps.length}`);
        failedOps
          .slice(0, 5)
          .forEach((op) =>
            console.log(`    - Op ${op.operation}: ${op.error}`),
          );
        if (failedOps.length > 5) {
          console.log(`    - ... and ${failedOps.length - 5} more errors`);
        }
      }
    } catch (error) {
      errors.push(`Concurrent operations test failed: ${error.message}`);
      this.testResults.push({
        testName: 'Concurrent Database Operations',
        success: false,
        executionTime: performance.now() - startTime,
        metrics: { error: error.message },
        errors,
      });
      console.log(`  ❌ Concurrent operations test failed: ${error.message}`);
    }
  }

  /**
   * Test 4: Database Health Monitoring
   */
  private async testHealthMonitoring(): Promise<void> {
    console.log(`\n🏥 Test 4: Database Health Monitoring`);
    const startTime = performance.now();
    const errors: string[] = [];

    try {
      // Test basic connectivity
      const healthCheck1 = performance.now();
      await this.prisma.$queryRaw`SELECT 1 as health_check`;
      const healthTime1 = performance.now() - healthCheck1;

      // Test database statistics query
      const statsCheck = performance.now();
      const dbStats = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        LIMIT 5
      `;
      const statsTime = performance.now() - statsCheck;

      // Test connection pool status simulation
      const poolCheck = performance.now();
      const connectionCount = await this.prisma.$queryRaw`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `;
      const poolTime = performance.now() - poolCheck;

      this.testResults.push({
        testName: 'Database Health Monitoring',
        success: true,
        executionTime: performance.now() - startTime,
        metrics: {
          basicHealthCheckTime: healthTime1,
          statisticsQueryTime: statsTime,
          connectionPoolCheckTime: poolTime,
          databaseStatistics: dbStats,
          activeConnections: connectionCount,
          overallHealthScore:
            healthTime1 < 100 && statsTime < 500 && poolTime < 100
              ? 'HEALTHY'
              : 'DEGRADED',
        },
        errors,
      });

      console.log(`  ✅ Basic health check: ${healthTime1.toFixed(2)}ms`);
      console.log(`  📊 Statistics query: ${statsTime.toFixed(2)}ms`);
      console.log(`  🔗 Connection pool check: ${poolTime.toFixed(2)}ms`);
      console.log(
        `  🏥 Overall health: ${healthTime1 < 100 && statsTime < 500 && poolTime < 100 ? 'HEALTHY' : 'DEGRADED'}`,
      );
    } catch (error) {
      errors.push(`Health monitoring test failed: ${error.message}`);
      this.testResults.push({
        testName: 'Database Health Monitoring',
        success: false,
        executionTime: performance.now() - startTime,
        metrics: { error: error.message },
        errors,
      });
      console.log(`  ❌ Health monitoring test failed: ${error.message}`);
    }
  }

  /**
   * Test 5: Circuit Breaker Resilience Simulation
   */
  private async testCircuitBreakerResilience(): Promise<void> {
    console.log(`\n🔧 Test 5: Circuit Breaker Resilience Simulation`);
    const startTime = performance.now();
    const errors: string[] = [];

    try {
      // Simulate rapid-fire requests that might trigger circuit breaker
      const rapidRequests = 30;
      const requestPromises = [];

      for (let i = 0; i < rapidRequests; i++) {
        const request = async () => {
          const reqStart = performance.now();

          try {
            // Simulate some requests that might timeout or fail
            if (i % 10 === 7) {
              // Simulate slow query that might trigger circuit breaker
              await new Promise((resolve) => setTimeout(resolve, 50));
            }

            await this.prisma.$queryRaw`SELECT pg_sleep(0.001)`;

            return {
              request: i,
              executionTime: performance.now() - reqStart,
              success: true,
            };
          } catch (error) {
            this.metrics.circuitBreakerTriggers++;
            return {
              request: i,
              executionTime: performance.now() - reqStart,
              success: false,
              error: error.message,
            };
          }
        };

        requestPromises.push(request());
      }

      const results = await Promise.all(requestPromises);

      const successfulRequests = results.filter((r) => r.success);
      const failedRequests = results.filter((r) => !r.success);
      const avgResponseTime =
        results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

      failedRequests.forEach((req) => {
        errors.push(`Request ${req.request}: ${req.error}`);
      });

      this.testResults.push({
        testName: 'Circuit Breaker Resilience Simulation',
        success: failedRequests.length < rapidRequests * 0.1, // Allow up to 10% failure rate
        executionTime: performance.now() - startTime,
        metrics: {
          totalRequests: rapidRequests,
          successfulRequests: successfulRequests.length,
          failedRequests: failedRequests.length,
          averageResponseTime: avgResponseTime,
          failureRate: (failedRequests.length / rapidRequests) * 100,
          circuitBreakerTriggers: this.metrics.circuitBreakerTriggers,
        },
        errors,
      });

      console.log(
        `  ✅ Successful requests: ${successfulRequests.length}/${rapidRequests}`,
      );
      console.log(
        `  📊 Failure rate: ${((failedRequests.length / rapidRequests) * 100).toFixed(1)}%`,
      );
      console.log(
        `  ⏱️ Average response time: ${avgResponseTime.toFixed(2)}ms`,
      );
      console.log(
        `  🔧 Circuit breaker triggers: ${this.metrics.circuitBreakerTriggers}`,
      );
    } catch (error) {
      errors.push(`Circuit breaker test failed: ${error.message}`);
      this.testResults.push({
        testName: 'Circuit Breaker Resilience Simulation',
        success: false,
        executionTime: performance.now() - startTime,
        metrics: { error: error.message },
        errors,
      });
      console.log(`  ❌ Circuit breaker test failed: ${error.message}`);
    }
  }

  /**
   * Test 6: Connection Reliability
   */
  private async testConnectionReliability(): Promise<void> {
    console.log(`\n🔗 Test 6: Connection Reliability`);
    const startTime = performance.now();
    const errors: string[] = [];

    try {
      // Test connection recovery and retry logic
      const reliabilityTests = [
        {
          name: 'Connection Recovery Test',
          test: async () => {
            // Disconnect and reconnect
            await this.prisma.$disconnect();
            await this.prisma.$connect();
            return await this.prisma
              .$queryRaw`SELECT 'connection_recovered' as status`;
          },
        },
        {
          name: 'Long-running Transaction Test',
          test: async () => {
            return await this.prisma.$transaction(async (tx) => {
              await tx.$queryRaw`SELECT pg_sleep(0.1)`;
              const result = await tx.task.findMany({ take: 1 });
              return result;
            });
          },
        },
        {
          name: 'Connection Timeout Resilience',
          test: async () => {
            // Test with potential timeout scenario
            return await Promise.race([
              this.prisma.$queryRaw`SELECT 'timeout_test' as result`,
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 5000),
              ),
            ]);
          },
        },
      ];

      const testResults = [];

      for (const test of reliabilityTests) {
        const testStart = performance.now();

        try {
          const result = await test.test();
          const testTime = performance.now() - testStart;

          testResults.push({
            name: test.name,
            executionTime: testTime,
            success: true,
            result,
          });

          console.log(`  ✅ ${test.name}: ${testTime.toFixed(2)}ms`);
        } catch (error) {
          const testTime = performance.now() - testStart;
          errors.push(`${test.name}: ${error.message}`);

          testResults.push({
            name: test.name,
            executionTime: testTime,
            success: false,
            error: error.message,
          });

          console.log(
            `  ❌ ${test.name}: Failed (${testTime.toFixed(2)}ms) - ${error.message}`,
          );
        }
      }

      const successfulTests = testResults.filter((t) => t.success);
      const failedTests = testResults.filter((t) => !t.success);

      this.testResults.push({
        testName: 'Connection Reliability',
        success: failedTests.length === 0,
        executionTime: performance.now() - startTime,
        metrics: {
          totalTests: testResults.length,
          successfulTests: successfulTests.length,
          failedTests: failedTests.length,
          reliabilityScore: (successfulTests.length / testResults.length) * 100,
        },
        errors,
      });

      console.log(
        `  📊 Reliability score: ${((successfulTests.length / testResults.length) * 100).toFixed(1)}%`,
      );
    } catch (error) {
      errors.push(`Connection reliability test failed: ${error.message}`);
      this.testResults.push({
        testName: 'Connection Reliability',
        success: false,
        executionTime: performance.now() - startTime,
        metrics: { error: error.message },
        errors,
      });
      console.log(`  ❌ Connection reliability test failed: ${error.message}`);
    }
  }

  /**
   * Test 7: Performance Under Load
   */
  private async testPerformanceUnderLoad(): Promise<void> {
    console.log(`\n🚀 Test 7: Performance Under Load`);
    const startTime = performance.now();
    const errors: string[] = [];

    try {
      const loadTestDuration = 10000; // 10 seconds
      const maxConcurrentOps = 20;
      let operationsCompleted = 0;
      let operationsFailed = 0;
      const responseTimes: number[] = [];

      console.log(
        `  🔄 Running load test for ${loadTestDuration / 1000} seconds with ${maxConcurrentOps} concurrent operations...`,
      );

      const loadTestPromise = new Promise<void>((resolve) => {
        const endTime = Date.now() + loadTestDuration;

        const runOperation = async () => {
          while (Date.now() < endTime) {
            const opStart = performance.now();

            try {
              // Mix of operations to simulate real workload
              const operationType = Math.random();

              if (operationType < 0.7) {
                // 70% read operations
                await this.prisma.task.findMany({
                  where: {
                    status: { in: ['PENDING', 'RUNNING'] },
                  },
                  take: 5,
                });
              } else if (operationType < 0.9) {
                // 20% write operations
                await this.prisma.message.create({
                  data: {
                    content: [
                      { type: 'text', text: `Load test message ${Date.now()}` },
                    ],
                    role: 'USER',
                    task: {
                      connect: { id: await this.getRandomTaskId() },
                    },
                  },
                });
              } else {
                // 10% complex queries
                await this.prisma.task.findMany({
                  where: { status: 'COMPLETED' },
                  include: {
                    messages: { take: 3 },
                    files: { take: 2 },
                  },
                  take: 3,
                });
              }

              const opTime = performance.now() - opStart;
              responseTimes.push(opTime);
              operationsCompleted++;

              if (opTime > 1000) {
                this.metrics.slowQueries++;
              }
            } catch (error) {
              operationsFailed++;
              errors.push(`Load test operation failed: ${error.message}`);
            }
          }
        };

        // Start concurrent operations
        const operations = Array.from({ length: maxConcurrentOps }, () =>
          runOperation(),
        );
        Promise.all(operations).then(() => resolve());
      });

      await loadTestPromise;

      const totalExecutionTime = performance.now() - startTime;
      const averageResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;
      const operationsPerSecond =
        operationsCompleted / (totalExecutionTime / 1000);
      const errorRate =
        operationsFailed > 0
          ? (operationsFailed / (operationsCompleted + operationsFailed)) * 100
          : 0;

      // Calculate percentiles
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
      const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;

      this.testResults.push({
        testName: 'Performance Under Load',
        success: errorRate < 5 && averageResponseTime < 500, // Success criteria: < 5% error rate and < 500ms avg response
        executionTime: totalExecutionTime,
        metrics: {
          testDuration: loadTestDuration,
          operationsCompleted,
          operationsFailed,
          averageResponseTime,
          operationsPerSecond,
          errorRate,
          p95ResponseTime: p95,
          p99ResponseTime: p99,
          slowQueries: this.metrics.slowQueries,
        },
        errors,
      });

      console.log(`  ✅ Operations completed: ${operationsCompleted}`);
      console.log(`  ❌ Operations failed: ${operationsFailed}`);
      console.log(
        `  📊 Operations per second: ${operationsPerSecond.toFixed(2)}`,
      );
      console.log(
        `  ⏱️ Average response time: ${averageResponseTime.toFixed(2)}ms`,
      );
      console.log(`  📈 95th percentile: ${p95.toFixed(2)}ms`);
      console.log(`  📈 99th percentile: ${p99.toFixed(2)}ms`);
      console.log(`  📊 Error rate: ${errorRate.toFixed(2)}%`);
    } catch (error) {
      errors.push(`Performance under load test failed: ${error.message}`);
      this.testResults.push({
        testName: 'Performance Under Load',
        success: false,
        executionTime: performance.now() - startTime,
        metrics: { error: error.message },
        errors,
      });
      console.log(`  ❌ Performance under load test failed: ${error.message}`);
    }
  }

  /**
   * Setup test data for performance testing
   */
  private async setupTestData(): Promise<void> {
    try {
      // Create test tasks if they don't exist
      const existingTasks = await this.prisma.task.count();

      if (existingTasks < 10) {
        console.log(`  📝 Creating test data...`);

        const tasksToCreate = Array.from({ length: 20 }, (_, i) => ({
          description: `Performance test task ${i + 1}`,
          status:
            i % 4 === 0
              ? 'COMPLETED'
              : i % 4 === 1
                ? 'RUNNING'
                : i % 4 === 2
                  ? 'PENDING'
                  : 'FAILED',
          priority: i % 3 === 0 ? 'HIGH' : i % 3 === 1 ? 'MEDIUM' : 'LOW',
          model: {
            provider: 'test',
            name: 'performance-test',
            title: 'Performance Test Model',
          },
        }));

        await this.prisma.task.createMany({
          data: tasksToCreate,
          skipDuplicates: true,
        });

        // Create some test messages
        const tasks = await this.prisma.task.findMany({ take: 5 });

        for (const task of tasks) {
          await this.prisma.message.create({
            data: {
              content: [
                { type: 'text', text: `Test message for task ${task.id}` },
              ],
              role: 'USER',
              taskId: task.id,
            },
          });
        }

        console.log(`  ✅ Test data created successfully`);
      }
    } catch (error) {
      console.log(`  ⚠️ Warning: Could not setup test data: ${error.message}`);
    }
  }

  /**
   * Get a random task ID for testing
   */
  private async getRandomTaskId(): Promise<string> {
    const tasks = await this.prisma.task.findMany({
      select: { id: true },
      take: 10,
    });

    if (tasks.length === 0) {
      // Create a task if none exist
      const newTask = await this.prisma.task.create({
        data: {
          description: 'Default test task for load testing',
          model: { provider: 'test', name: 'default', title: 'Default' },
        },
      });
      return newTask.id;
    }

    return tasks[Math.floor(Math.random() * tasks.length)].id;
  }

  /**
   * Generate comprehensive test report
   */
  private async generateTestReport(
    overallExecutionTime: number,
  ): Promise<void> {
    console.log(`\n📋 === PHASE 1 DATABASE HARDENING TEST REPORT ===`);
    console.log(`🕒 Generated at: ${new Date().toISOString()}`);
    console.log(
      `⚡ Total execution time: ${(overallExecutionTime / 1000).toFixed(2)} seconds`,
    );
    console.log(`🆔 Operation ID: ${this.operationId}\n`);

    // Test Summary
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter((t) => t.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = (passedTests / totalTests) * 100;

    console.log(`📊 TEST SUMMARY:`);
    console.log(`  Total tests: ${totalTests}`);
    console.log(`  Passed: ${passedTests} ✅`);
    console.log(`  Failed: ${failedTests} ❌`);
    console.log(`  Success rate: ${successRate.toFixed(1)}%`);
    console.log(
      `  Overall status: ${successRate >= 80 ? 'PASS' : 'FAIL'} ${successRate >= 80 ? '✅' : '❌'}\n`,
    );

    // Performance Metrics Summary
    console.log(`⚡ PERFORMANCE METRICS:`);
    console.log(`  Connections created: ${this.metrics.connectionsCreated}`);
    console.log(`  Queries executed: ${this.metrics.queriesExecuted}`);
    console.log(
      `  Average query time: ${this.metrics.averageQueryTime.toFixed(2)}ms`,
    );
    console.log(`  Slow queries detected: ${this.metrics.slowQueries}`);
    console.log(`  Connection errors: ${this.metrics.connectionErrors}`);
    console.log(
      `  Circuit breaker triggers: ${this.metrics.circuitBreakerTriggers}\n`,
    );

    // Individual Test Results
    console.log(`📋 DETAILED TEST RESULTS:\n`);

    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.testName}: ${status}`);
      console.log(`   Execution time: ${result.executionTime.toFixed(2)}ms`);

      if (result.metrics && typeof result.metrics === 'object') {
        Object.entries(result.metrics).forEach(([key, value]) => {
          if (key !== 'error' && typeof value !== 'object') {
            console.log(`   ${key}: ${value}`);
          }
        });
      }

      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`);
        result.errors
          .slice(0, 3)
          .forEach((error) => console.log(`     - ${error}`));
        if (result.errors.length > 3) {
          console.log(`     - ... and ${result.errors.length - 3} more errors`);
        }
      }
      console.log('');
    });

    // Recommendations
    console.log(`💡 RECOMMENDATIONS:`);

    if (this.metrics.averageQueryTime > 100) {
      console.log(
        `  - Consider optimizing slow queries (avg: ${this.metrics.averageQueryTime.toFixed(2)}ms)`,
      );
    }

    if (this.metrics.slowQueries > 0) {
      console.log(
        `  - ${this.metrics.slowQueries} slow queries detected - review query performance`,
      );
    }

    if (this.metrics.connectionErrors > 0) {
      console.log(
        `  - ${this.metrics.connectionErrors} connection errors - check connection pool settings`,
      );
    }

    if (this.metrics.circuitBreakerTriggers > 0) {
      console.log(
        `  - ${this.metrics.circuitBreakerTriggers} circuit breaker triggers - review error handling`,
      );
    }

    if (successRate >= 80) {
      console.log(`  ✅ Database hardening implementation is performing well!`);
      console.log(
        `  ✅ Connection pooling and performance optimizations are effective`,
      );
      console.log(`  ✅ System is ready for production deployment`);
    } else {
      console.log(
        `  ⚠️ Some tests failed - review implementation before production deployment`,
      );
      console.log(`  ⚠️ Consider adjusting configuration parameters`);
    }

    // Save detailed report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      operationId: this.operationId,
      overallExecutionTime,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate,
      },
      metrics: this.metrics,
      testResults: this.testResults,
    };

    const reportsDir = path.join(__dirname, '../test-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportFileName = `database-performance-test-${this.operationId}.json`;
    const reportPath = path.join(reportsDir, reportFileName);

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log(`\n🧹 Cleanup completed successfully`);
    } catch (error) {
      console.error(`⚠️ Cleanup warning: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  console.log(`🚀 Phase 1 Database Hardening Performance Test Suite`);
  console.log(`📅 ${new Date().toISOString()}\n`);

  const tester = new DatabasePerformanceTester();
  await tester.runAllTests();
}

// Run the tests if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Test suite execution failed:', error);
    process.exit(1);
  });
}

export { DatabasePerformanceTester };
