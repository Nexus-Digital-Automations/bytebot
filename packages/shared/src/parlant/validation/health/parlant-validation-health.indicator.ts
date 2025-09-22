/**
 * PARLANT Validation Health Indicator
 *
 * Health check implementation for the PARLANT validation integration layer.
 * Monitors the health of all validation components including WebSocket connections,
 * cache systems, and performance metrics.
 *
 * @module ParlantValidationHealthIndicator
 * @version 1.0.0
 * @author AIgent Integration Team
 */

import { Injectable } from "@nestjs/common";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";
import { ParlantValidationBridge } from "../parlant-validation-bridge.service";
import { ParlantWebSocketManager } from "../websocket/parlant-websocket-manager.service";
import { ValidationLayerConfigService } from "../config/validation-layer.config";

@Injectable()
export class ParlantValidationHealthIndicator extends HealthIndicator {
  constructor(
    private readonly validationBridge: ParlantValidationBridge,
    private readonly webSocketManager: ParlantWebSocketManager,
    private readonly configService: ValidationLayerConfigService,
  ) {
    super();
  }

  /**
   * Check overall health of PARLANT validation layer
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = await this.checkHealth();
    const result = this.getStatus(key, isHealthy);

    if (isHealthy) {
      return result;
    }

    throw new HealthCheckError(
      "PARLANT validation health check failed",
      result,
    );
  }

  /**
   * Perform comprehensive health check
   */
  private async checkHealth(): Promise<boolean> {
    try {
      // Check if validation is enabled
      if (!this.configService.isValidationEnabled()) {
        return true; // Healthy if disabled
      }

      // Check bridge status
      const bridgeStatus = this.validationBridge.getBridgeStatus();
      if (!bridgeStatus.initialized) {
        return false;
      }

      // Check WebSocket manager status
      const wsStatus = this.webSocketManager.getStatus();
      if (wsStatus.healthyConnections === 0) {
        return false;
      }

      // Check performance metrics
      const metrics = this.validationBridge.getValidationMetrics();
      const performanceConfig = this.configService.getPerformanceConfig();

      // Check response time
      if (metrics.p95ResponseTimeMs > performanceConfig.p95TargetMs) {
        return false;
      }

      // Check error rate
      const errorRate =
        (metrics.failedValidations / metrics.totalRequests) * 100;
      if (errorRate > 10) {
        // 10% error rate threshold
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}
