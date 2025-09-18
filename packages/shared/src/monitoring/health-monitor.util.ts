/**
 * Unified Health Monitoring Utility
 *
 * Provides standardized health monitoring capabilities across all AIgent services.
 * Ensures consistent health check behavior, metrics collection, and alerting
 * for local monitoring deployment.
 *
 * Features:
 * - Standardized health check execution
 * - Automatic metrics recording
 * - Circuit breaker pattern for reliability
 * - Correlation ID tracking
 * - Performance monitoring
 * - Service-specific health validation
 *
 * @author Claude Code - Monitoring Integration Specialist
 * @version 1.0.0
 */

import { Logger } from "@nestjs/common";
import { MetricsService } from "./metrics.service";
import {
  HealthCheckResult,
  HealthStatus,
  ServiceHealthStatus,
  SystemResourceMetrics,
  CircuitBreakerStatus,
} from "./types";
import {
  getServiceMonitoringConfig,
  ServiceMonitoringConfig,
} from "./config/monitoring.config";

/**
 * Health check execution context
 */
export interface HealthCheckContext {
  serviceName: string;
  checkName: string;
  operationId: string;
  userId?: string;
  correlationId?: string;
  timeout?: number;
}

/**
 * Health check execution result
 */
export interface HealthCheckExecutionResult {
  success: boolean;
  result?: HealthCheckResult;
  error?: string;
  duration: number;
  timestamp: string;
  context: HealthCheckContext;
}

/**
 * Circuit breaker state for health checks
 */
interface CircuitBreakerState {
  state: "closed" | "open" | "half-open";
  failureCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
  successCount: number;
}

/**
 * Unified health monitoring utility class
 */
export class HealthMonitorUtil {
  private readonly logger = new Logger(HealthMonitorUtil.name);
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly executionHistory = new Map<
    string,
    HealthCheckExecutionResult[]
  >();

  constructor(
    private readonly metricsService: MetricsService,
    private readonly serviceName: string,
  ) {
    this.logger.log(`Health Monitor initialized for service: ${serviceName}`);
  }

  /**
   * Execute a health check with standardized monitoring
   */
  async executeHealthCheck(
    checkName: string,
    checkFunction: () => Promise<HealthCheckResult> | HealthCheckResult,
    context: Partial<HealthCheckContext> = {},
  ): Promise<HealthCheckExecutionResult> {
    const fullContext: HealthCheckContext = {
      serviceName: this.serviceName,
      checkName,
      operationId: context.operationId || this.generateOperationId(),
      userId: context.userId,
      correlationId: context.correlationId,
      timeout: context.timeout || 5000,
    };

    const startTime = Date.now();
    this.logger.debug(
      `[${fullContext.operationId}] Executing health check: ${checkName}`,
      {
        serviceName: fullContext.serviceName,
        checkName,
        operationId: fullContext.operationId,
      },
    );

    try {
      // Check circuit breaker
      if (!this.isCircuitBreakerClosed(checkName)) {
        const error = "Circuit breaker is open - health check skipped";
        this.logger.warn(`[${fullContext.operationId}] ${error}`, {
          checkName,
          circuitBreakerState: this.getCircuitBreakerState(checkName),
        });

        return this.createExecutionResult(
          fullContext,
          false,
          undefined,
          error,
          startTime,
        );
      }

      // Execute health check with timeout
      const result = await this.executeWithTimeout(
        checkFunction,
        fullContext.timeout ?? 5000,
      );
      const duration = Date.now() - startTime;

      // Update circuit breaker on success
      this.updateCircuitBreaker(checkName, true);

      // Record metrics
      this.recordHealthCheckMetrics(fullContext, result, duration, true);

      this.logger.debug(
        `[${fullContext.operationId}] Health check completed successfully`,
        {
          checkName,
          duration,
          isHealthy: result.isHealthy,
        },
      );

      const executionResult = this.createExecutionResult(
        fullContext,
        true,
        result,
        undefined,
        startTime,
      );
      this.storeExecutionHistory(checkName, executionResult);

      return executionResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Update circuit breaker on failure
      this.updateCircuitBreaker(checkName, false);

      // Record error metrics
      this.recordHealthCheckMetrics(
        fullContext,
        undefined,
        duration,
        false,
        errorMessage,
      );

      this.logger.error(
        `[${fullContext.operationId}] Health check failed: ${errorMessage}`,
        {
          checkName,
          duration,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
      );

      const executionResult = this.createExecutionResult(
        fullContext,
        false,
        undefined,
        errorMessage,
        startTime,
      );
      this.storeExecutionHistory(checkName, executionResult);

      return executionResult;
    }
  }

  /**
   * Get comprehensive health status for the service
   */
  async getServiceHealthStatus(): Promise<Record<string, unknown>> {
    const operationId = this.generateOperationId();
    this.logger.debug(
      `[${operationId}] Getting comprehensive service health status`,
    );

    const config = getServiceMonitoringConfig(this.serviceName);
    const executionHistory = this.getAllExecutionHistory();
    const circuitBreakers = this.getAllCircuitBreakerStates();

    // Calculate overall health based on recent checks
    const recentFailures = this.getRecentFailures(300000); // Last 5 minutes
    const totalChecks = this.getTotalChecks(300000);
    const errorRate =
      totalChecks > 0 ? (recentFailures / totalChecks) * 100 : 0;

    let overallStatus: HealthStatus = "healthy";
    if (errorRate > 20) {
      overallStatus = "unhealthy";
    } else if (errorRate > 10) {
      overallStatus = "degraded";
    }

    const healthStatus = {
      serviceName: this.serviceName,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: executionHistory,
      circuitBreakers: Object.fromEntries(circuitBreakers),
      metrics: {
        totalChecks,
        recentFailures,
        errorRate,
        averageResponseTime: this.getAverageResponseTime(),
      },
      configuration: config,
      operationId,
    };

    this.logger.debug(`[${operationId}] Service health status compiled`, {
      serviceName: this.serviceName,
      overallStatus,
      totalChecks,
      errorRate: errorRate.toFixed(2),
    });

    return healthStatus;
  }

  /**
   * Get system resource metrics
   */
  async getSystemResourceMetrics(): Promise<SystemResourceMetrics> {
    const operationId = this.generateOperationId();
    this.logger.debug(`[${operationId}] Collecting system resource metrics`);

    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = await this.calculateCpuUsage();

      const metrics: SystemResourceMetrics = {
        cpuUsagePercent: cpuUsage,
        memoryUsagePercent: (memoryUsage.rss / memoryUsage.heapTotal) * 100,
        diskUsagePercent: await this.getDiskUsage(),
        networkLatencyMs: 0, // Would implement actual network monitoring
        gcPauseTimeMs: 0, // Would implement actual GC monitoring
        threadPoolUtilization: 0, // Would implement actual thread monitoring
      };

      this.logger.debug(`[${operationId}] System resource metrics collected`, {
        cpuUsage: metrics.cpuUsagePercent.toFixed(2),
        memoryUtilization: metrics.memoryUsagePercent.toFixed(2),
      });

      return metrics;
    } catch (error) {
      this.logger.error(
        `[${operationId}] Failed to collect system resource metrics`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );

      // Return default metrics on error
      return {
        cpuUsagePercent: 0,
        memoryUsagePercent: 0,
        diskUsagePercent: 0,
        networkLatencyMs: 0,
        gcPauseTimeMs: 0,
        threadPoolUtilization: 0,
      };
    }
  }

  /**
   * Reset circuit breaker for a specific check
   */
  resetCircuitBreaker(checkName: string): void {
    this.circuitBreakers.set(checkName, {
      state: "closed",
      failureCount: 0,
      successCount: 0,
    });

    this.logger.log(`Circuit breaker reset for check: ${checkName}`);
  }

  /**
   * Get execution history for all checks
   */
  getExecutionHistory(checkName?: string): HealthCheckExecutionResult[] {
    if (checkName) {
      return this.executionHistory.get(checkName) || [];
    }

    const allHistory: HealthCheckExecutionResult[] = [];
    Array.from(this.executionHistory.values()).forEach((history) => {
      allHistory.push(...history);
    });

    return allHistory.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory(checkName?: string): void {
    if (checkName) {
      this.executionHistory.delete(checkName);
    } else {
      this.executionHistory.clear();
    }

    this.logger.log(
      `Execution history cleared${checkName ? ` for check: ${checkName}` : ""}`,
    );
  }

  // Private helper methods

  private executeWithTimeout<T>(
    fn: () => Promise<T> | T,
    timeout: number,
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Health check timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private isCircuitBreakerClosed(checkName: string): boolean {
    const breaker = this.getCircuitBreakerState(checkName);

    if (breaker.state === "closed") return true;
    if (breaker.state === "open") {
      // Check if we should transition to half-open
      if (breaker.nextAttemptTime && Date.now() >= breaker.nextAttemptTime) {
        breaker.state = "half-open";
        breaker.successCount = 0;
        return true;
      }
      return false;
    }
    if (breaker.state === "half-open") return true;

    return false;
  }

  private getCircuitBreakerState(checkName: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(checkName)) {
      this.circuitBreakers.set(checkName, {
        state: "closed",
        failureCount: 0,
        successCount: 0,
      });
    }
    return this.circuitBreakers.get(checkName)!;
  }

  private updateCircuitBreaker(checkName: string, success: boolean): void {
    const breaker = this.getCircuitBreakerState(checkName);

    if (success) {
      breaker.successCount++;
      if (breaker.state === "half-open" && breaker.successCount >= 3) {
        breaker.state = "closed";
        breaker.failureCount = 0;
      }
    } else {
      breaker.failureCount++;
      breaker.lastFailureTime = Date.now();

      if (breaker.failureCount >= 5) {
        breaker.state = "open";
        breaker.nextAttemptTime = Date.now() + 60000; // 1 minute
      }
    }
  }

  private recordHealthCheckMetrics(
    context: HealthCheckContext,
    result: HealthCheckResult | undefined,
    duration: number,
    success: boolean,
    error?: string,
  ): void {
    try {
      // Create a health check result for the standard method
      const healthCheckResult: HealthCheckResult = result || {
        isHealthy: success,
        details: { duration, error: error || undefined },
        timestamp: new Date().toISOString(),
        responseTime: duration,
      };

      // Record execution metrics using the standard interface
      this.metricsService.recordHealthCheck(
        context.serviceName,
        healthCheckResult,
      );

      // Record detailed metrics with proper labels parameter
      this.metricsService.incrementCounter("health_check_executions_total", 1, {
        service: context.serviceName,
        check_name: context.checkName,
        status: success ? "success" : "failure",
        user_id: context.userId || "system",
      });

      this.metricsService.observeHistogram(
        "health_check_duration_seconds",
        duration / 1000,
      );

      if (error) {
        this.metricsService.incrementCounter("health_check_errors_total", 1, {
          service: context.serviceName,
          check_name: context.checkName,
          error_type: error.includes("timeout") ? "timeout" : "execution_error",
        });
      }
    } catch (metricsError) {
      this.logger.warn("Failed to record health check metrics", {
        error:
          metricsError instanceof Error
            ? metricsError.message
            : String(metricsError),
      });
    }
  }

  private createExecutionResult(
    context: HealthCheckContext,
    success: boolean,
    result: HealthCheckResult | undefined,
    error: string | undefined,
    startTime: number,
  ): HealthCheckExecutionResult {
    return {
      success,
      result,
      error,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  private storeExecutionHistory(
    checkName: string,
    result: HealthCheckExecutionResult,
  ): void {
    if (!this.executionHistory.has(checkName)) {
      this.executionHistory.set(checkName, []);
    }

    const history = this.executionHistory.get(checkName)!;
    history.push(result);

    // Keep only last 100 executions
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  private getAllExecutionHistory(): Record<
    string,
    HealthCheckExecutionResult[]
  > {
    const allHistory: Record<string, HealthCheckExecutionResult[]> = {};

    Array.from(this.executionHistory.entries()).forEach(
      ([checkName, history]) => {
        allHistory[checkName] = [...history];
      },
    );

    return allHistory;
  }

  private getAllCircuitBreakerStates(): Map<string, CircuitBreakerStatus> {
    const states = new Map<string, CircuitBreakerStatus>();

    Array.from(this.circuitBreakers.entries()).forEach(
      ([checkName, breaker]) => {
        states.set(checkName, {
          state: breaker.state as "CLOSED" | "OPEN" | "HALF_OPEN",
          failureCount: breaker.failureCount,
          successCount: breaker.successCount,
          lastFailureTime: breaker.lastFailureTime
            ? new Date(breaker.lastFailureTime)
            : undefined,
          nextAttemptTime: breaker.nextAttemptTime
            ? new Date(breaker.nextAttemptTime)
            : undefined,
        });
      },
    );

    return states;
  }

  private getRecentFailures(timeWindow: number): number {
    const cutoff = Date.now() - timeWindow;
    let failures = 0;

    Array.from(this.executionHistory.values()).forEach((history) => {
      history.forEach((execution) => {
        if (
          new Date(execution.timestamp).getTime() >= cutoff &&
          !execution.success
        ) {
          failures++;
        }
      });
    });

    return failures;
  }

  private getTotalChecks(timeWindow: number): number {
    const cutoff = Date.now() - timeWindow;
    let total = 0;

    Array.from(this.executionHistory.values()).forEach((history) => {
      history.forEach((execution) => {
        if (new Date(execution.timestamp).getTime() >= cutoff) {
          total++;
        }
      });
    });

    return total;
  }

  private getAverageResponseTime(): number {
    let totalTime = 0;
    let count = 0;

    Array.from(this.executionHistory.values()).forEach((history) => {
      history.forEach((execution) => {
        totalTime += execution.duration;
        count++;
      });
    });

    return count > 0 ? totalTime / count : 0;
  }

  private async calculateCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startMeasure = process.cpuUsage();
      const startTime = Date.now();

      setTimeout(() => {
        const endMeasure = process.cpuUsage(startMeasure);
        const endTime = Date.now();
        const totalTime = (endTime - startTime) * 1000; // Convert to microseconds

        const totalCpu = endMeasure.user + endMeasure.system;
        const cpuPercent = (totalCpu / totalTime) * 100;

        resolve(Math.min(cpuPercent, 100)); // Cap at 100%
      }, 100);
    });
  }

  private getLoadAverage(): number[] {
    try {
      const os = require("os");
      return os.loadavg();
    } catch {
      return [0, 0, 0]; // Default if not available
    }
  }

  private async getDiskUsage(): Promise<number> {
    // Simplified disk usage - would implement actual monitoring
    return Math.random() * 50 + 10; // Simulate 10-60% usage
  }

  private getActiveConnections(): number {
    // Simplified connection count - would implement actual monitoring
    return Math.floor(Math.random() * 20) + 5; // Simulate 5-25 connections
  }

  private generateOperationId(): string {
    return `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
