/**
 * Metrics Collection Service
 * Handles performance monitoring and analytics collection
 */

import { Injectable, Logger } from '@nestjs/common';
import { ProcessingMetrics } from '../types/document.types';

@Injectable()
export class MetricsCollector {
  private readonly logger = new Logger(MetricsCollector.name);
  private metrics: ProcessingMetrics[] = [];

  async recordDocumentGeneration(metrics: ProcessingMetrics): Promise<void> {
    this.logger.log(`Recording metrics: ${metrics.processingTimeMs}ms processing time`);
    this.metrics.push(metrics);
  }

  async getAggregatedMetrics(): Promise<any> {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        averageProcessingTime: 0,
        totalProcessingTime: 0
      };
    }

    const totalProcessingTime = this.metrics.reduce((sum, m) => sum + m.processingTimeMs, 0);
    const averageProcessingTime = totalProcessingTime / this.metrics.length;

    return {
      totalRequests: this.metrics.length,
      averageProcessingTime,
      totalProcessingTime,
      metrics: this.metrics.slice(-10) // Return last 10 metrics
    };
  }
}