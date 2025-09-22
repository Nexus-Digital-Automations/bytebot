/**
 * PARLANT Test Result Aggregator
 *
 * Aggregates and analyzes test results from multiple test executions.
 * Provides comprehensive reporting, analytics, and trend analysis.
 *
 * @fileoverview Test result aggregation and analysis
 * @version 1.0.0
 * @author PARLANT Testing Framework Agent
 */

import { Injectable, Logger } from "@nestjs/common";
import { TestExecutionResult } from "./test-executor";

/**
 * Aggregated test results summary
 */
export interface TestResultSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errorTests: number;
  skippedTests: number;
  passRate: number;
  totalDuration: number;
  averageDuration: number;
  executionDate: Date;
}

/**
 * Test trend analysis data
 */
export interface TestTrendAnalysis {
  currentRun: TestResultSummary;
  previousRun?: TestResultSummary;
  passRateChange: number;
  durationChange: number;
  newFailures: string[];
  fixedTests: string[];
  trends: {
    improving: boolean;
    stable: boolean;
    degrading: boolean;
  };
}

/**
 * Test category breakdown
 */
export interface TestCategoryBreakdown {
  category: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  averageDuration: number;
}

/**
 * Comprehensive test report
 */
export interface ComprehensiveTestReport {
  summary: TestResultSummary;
  categoryBreakdown: TestCategoryBreakdown[];
  failureAnalysis: {
    mostCommonErrors: Array<{ error: string; count: number }>;
    slowestTests: TestExecutionResult[];
    flakyTests: string[];
  };
  recommendations: string[];
  metadata: {
    environment: string;
    timestamp: Date;
    version: string;
  };
}

/**
 * PARLANT Test Result Aggregator Service
 *
 * Collects, aggregates, and analyzes test execution results to provide
 * comprehensive reporting and trend analysis.
 */
@Injectable()
export class TestResultAggregator {
  private readonly logger = new Logger(TestResultAggregator.name);
  private readonly resultHistory: TestResultSummary[] = [];
  private readonly maxHistorySize = 100;

  constructor() {
    this.logger.log("PARLANT Test Result Aggregator initialized");
  }

  /**
   * Aggregate test results into summary
   */
  aggregateResults(results: TestExecutionResult[]): TestResultSummary {
    const summary: TestResultSummary = {
      totalTests: results.length,
      passedTests: results.filter((r) => r.status === "passed").length,
      failedTests: results.filter((r) => r.status === "failed").length,
      errorTests: results.filter((r) => r.status === "error").length,
      skippedTests: results.filter((r) => r.status === "skipped").length,
      passRate: 0,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      averageDuration: 0,
      executionDate: new Date(),
    };

    // Calculate pass rate
    if (summary.totalTests > 0) {
      summary.passRate = (summary.passedTests / summary.totalTests) * 100;
      summary.averageDuration = summary.totalDuration / summary.totalTests;
    }

    // Add to history
    this.addToHistory(summary);

    this.logger.debug(
      `Aggregated results: ${summary.passedTests}/${summary.totalTests} passed (${summary.passRate.toFixed(1)}%)`,
    );

    return summary;
  }

  /**
   * Generate comprehensive test report
   */
  generateComprehensiveReport(
    results: TestExecutionResult[],
    environment: string = "test",
    version: string = "1.0.0",
  ): ComprehensiveTestReport {
    const summary = this.aggregateResults(results);
    const categoryBreakdown = this.analyzeCategoryBreakdown(results);
    const failureAnalysis = this.analyzeFailures(results);

    const report: ComprehensiveTestReport = {
      summary,
      categoryBreakdown,
      failureAnalysis,
      recommendations: this.generateRecommendations(summary, failureAnalysis),
      metadata: {
        environment,
        timestamp: new Date(),
        version,
      },
    };

    this.logger.log(
      `Generated comprehensive test report: ${summary.totalTests} tests`,
    );
    return report;
  }

  /**
   * Analyze test trends
   */
  analyzeTrends(currentResults: TestExecutionResult[]): TestTrendAnalysis {
    const currentRun = this.aggregateResults(currentResults);
    const previousRun = this.getPreviousRun();

    const analysis: TestTrendAnalysis = {
      currentRun,
      previousRun,
      passRateChange: 0,
      durationChange: 0,
      newFailures: [],
      fixedTests: [],
      trends: {
        improving: false,
        stable: true,
        degrading: false,
      },
    };

    if (previousRun) {
      analysis.passRateChange = currentRun.passRate - previousRun.passRate;
      analysis.durationChange =
        currentRun.averageDuration - previousRun.averageDuration;

      // Determine trend
      if (analysis.passRateChange > 5) {
        analysis.trends.improving = true;
        analysis.trends.stable = false;
      } else if (analysis.passRateChange < -5) {
        analysis.trends.degrading = true;
        analysis.trends.stable = false;
      }
    }

    this.logger.debug(
      `Trend analysis: ${analysis.trends.improving ? "improving" : analysis.trends.degrading ? "degrading" : "stable"}`,
    );
    return analysis;
  }

  /**
   * Get test execution history
   */
  getHistory(): TestResultSummary[] {
    return [...this.resultHistory];
  }

  /**
   * Clear test history
   */
  clearHistory(): void {
    this.resultHistory.length = 0;
    this.logger.debug("Test result history cleared");
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Add summary to history
   */
  private addToHistory(summary: TestResultSummary): void {
    this.resultHistory.push(summary);

    // Maintain max history size
    while (this.resultHistory.length > this.maxHistorySize) {
      this.resultHistory.shift();
    }
  }

  /**
   * Get previous test run
   */
  private getPreviousRun(): TestResultSummary | undefined {
    return this.resultHistory.length >= 2
      ? this.resultHistory[this.resultHistory.length - 2]
      : undefined;
  }

  /**
   * Analyze category breakdown
   */
  private analyzeCategoryBreakdown(
    results: TestExecutionResult[],
  ): TestCategoryBreakdown[] {
    const categories = new Map<string, TestExecutionResult[]>();

    // Group results by category (extracted from test name)
    results.forEach((result) => {
      const category = this.extractCategory(result.testName);
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(result);
    });

    // Convert to breakdown format
    return Array.from(categories.entries()).map(
      ([category, categoryResults]) => {
        const passed = categoryResults.filter(
          (r) => r.status === "passed",
        ).length;
        const total = categoryResults.length;

        return {
          category,
          total,
          passed,
          failed: total - passed,
          passRate: total > 0 ? (passed / total) * 100 : 0,
          averageDuration:
            total > 0
              ? categoryResults.reduce((sum, r) => sum + r.duration, 0) / total
              : 0,
        };
      },
    );
  }

  /**
   * Extract category from test name
   */
  private extractCategory(testName: string): string {
    // Simple category extraction logic
    if (testName.includes("unit")) return "Unit Tests";
    if (testName.includes("integration")) return "Integration Tests";
    if (testName.includes("performance")) return "Performance Tests";
    if (testName.includes("security")) return "Security Tests";
    if (testName.includes("e2e") || testName.includes("end-to-end"))
      return "E2E Tests";
    return "Other";
  }

  /**
   * Analyze test failures
   */
  private analyzeFailures(
    results: TestExecutionResult[],
  ): ComprehensiveTestReport["failureAnalysis"] {
    const failures = results.filter(
      (r) => r.status === "failed" || r.status === "error",
    );

    // Count error frequencies
    const errorCounts = new Map<string, number>();
    failures.forEach((failure) => {
      if (failure.error) {
        const errorKey = failure.error.split("\n")[0].trim(); // First line of error
        errorCounts.set(errorKey, (errorCounts.get(errorKey) || 0) + 1);
      }
    });

    // Get most common errors
    const mostCommonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get slowest tests
    const slowestTests = [...results]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      mostCommonErrors,
      slowestTests,
      flakyTests: [], // Would need historical data to identify flaky tests
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    summary: TestResultSummary,
    failureAnalysis: ComprehensiveTestReport["failureAnalysis"],
  ): string[] {
    const recommendations: string[] = [];

    // Pass rate recommendations
    if (summary.passRate < 90) {
      recommendations.push(
        "Focus on improving test stability - pass rate below 90%",
      );
    }

    // Performance recommendations
    if (summary.averageDuration > 5000) {
      recommendations.push(
        "Consider optimizing test performance - average duration over 5 seconds",
      );
    }

    // Failure pattern recommendations
    if (failureAnalysis.mostCommonErrors.length > 0) {
      const topError = failureAnalysis.mostCommonErrors[0];
      recommendations.push(
        `Address common error pattern: "${topError.error}" (${topError.count} occurrences)`,
      );
    }

    // General recommendations
    if (summary.failedTests > 0) {
      recommendations.push(
        "Investigate and fix failing tests to improve overall stability",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Test suite is performing well - continue current practices",
      );
    }

    return recommendations;
  }
}

/**
 * Default export
 */
export default TestResultAggregator;
