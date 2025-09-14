#!/usr/bin/env node

/**
 * Performance Monitor - Workspace Performance Analysis Tool
 *
 * Measures build times, install times, memory usage, and other key metrics
 * for the bytebot workspace performance optimization analysis.
 */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

class PerformanceMonitor {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      system: this.getSystemInfo(),
      baseline: {},
      optimized: {},
      improvements: {},
    };
  }

  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      nodeVersion: process.version,
      pnpmVersion: this.getPnpmVersion(),
    };
  }

  getPnpmVersion() {
    try {
      return execSync("pnpm --version", { encoding: "utf8" }).trim();
    } catch (error) {
      return "not found";
    }
  }

  async measureCommand(command, description, runs = 3) {
    console.log(`\n📊 Measuring: ${description}`);
    console.log(`Command: ${command}`);

    const times = [];
    const memoryUsage = [];

    for (let i = 0; i < runs; i++) {
      console.log(`  Run ${i + 1}/${runs}...`);

      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      try {
        execSync(command, {
          stdio: ["inherit", "pipe", "pipe"],
          cwd: process.cwd(),
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        });

        const endTime = Date.now();
        const endMemory = process.memoryUsage();

        const duration = endTime - startTime;
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

        times.push(duration);
        memoryUsage.push(memoryDelta);

        console.log(
          `    Duration: ${duration}ms, Memory: ${Math.round(memoryDelta / 1024 / 1024)}MB`,
        );
      } catch (error) {
        console.error(`    Failed: ${error.message}`);
        times.push(null);
        memoryUsage.push(null);
      }
    }

    const validTimes = times.filter((t) => t !== null);
    const validMemory = memoryUsage.filter((m) => m !== null);

    if (validTimes.length === 0) {
      return {
        success: false,
        error: "All runs failed",
      };
    }

    return {
      success: true,
      times: validTimes,
      avgTime: Math.round(
        validTimes.reduce((a, b) => a + b, 0) / validTimes.length,
      ),
      minTime: Math.min(...validTimes),
      maxTime: Math.max(...validTimes),
      avgMemory:
        validMemory.length > 0
          ? Math.round(
              validMemory.reduce((a, b) => a + b, 0) /
                validMemory.length /
                1024 /
                1024,
            )
          : 0,
      successRate: (validTimes.length / runs) * 100,
    };
  }

  async measureBuildPerformance() {
    console.log("\n🔨 BUILD PERFORMANCE ANALYSIS");

    // Clean before measuring
    console.log("Cleaning workspace...");
    try {
      execSync("pnpm run clean", { stdio: "inherit" });
    } catch (error) {
      console.warn("Clean failed, continuing...");
    }

    // Measure shared package build (critical path)
    this.results.baseline.sharedBuild = await this.measureCommand(
      "cd packages/shared && pnpm run build",
      "Shared package build (critical path)",
    );

    // Measure full workspace build
    this.results.baseline.workspaceBuild = await this.measureCommand(
      "pnpm run build",
      "Full workspace build",
    );

    // Measure parallel vs sequential builds
    this.results.baseline.parallelBuild = await this.measureCommand(
      "pnpm run build:parallel",
      "Parallel package builds",
    );

    return this.results.baseline;
  }

  async measureInstallPerformance() {
    console.log("\n📦 INSTALL PERFORMANCE ANALYSIS");

    // Backup and remove node_modules
    console.log("Removing node_modules...");
    try {
      execSync("rm -rf node_modules packages/*/node_modules", {
        stdio: "inherit",
      });
    } catch (error) {
      console.warn("Node modules removal failed, continuing...");
    }

    // Measure fresh install
    this.results.baseline.freshInstall = await this.measureCommand(
      "pnpm install --frozen-lockfile",
      "Fresh install with frozen lockfile",
    );

    // Measure cached install (re-install)
    this.results.baseline.cachedInstall = await this.measureCommand(
      "rm -rf node_modules packages/*/node_modules && pnpm install --frozen-lockfile",
      "Install with cache (second run)",
    );

    return this.results.baseline;
  }

  async measureLintPerformance() {
    console.log("\n🔍 LINT PERFORMANCE ANALYSIS");

    // Measure workspace linting (parallel)
    this.results.baseline.workspaceLint = await this.measureCommand(
      "pnpm run lint",
      "Workspace linting (parallel)",
    );

    // Measure individual package linting
    const packages = ["shared", "bytebot-agent", "bytebot-ui", "bytebotd"];

    for (const pkg of packages) {
      this.results.baseline[`${pkg}Lint`] = await this.measureCommand(
        `cd packages/${pkg} && pnpm run lint`,
        `${pkg} package linting`,
      );
    }

    return this.results.baseline;
  }

  async measureTestPerformance() {
    console.log("\n🧪 TEST PERFORMANCE ANALYSIS");

    // Measure workspace testing
    this.results.baseline.workspaceTest = await this.measureCommand(
      "pnpm run test",
      "Workspace testing",
    );

    return this.results.baseline;
  }

  generateReport() {
    const reportPath = path.join(
      __dirname,
      `performance-report-${Date.now()}.json`,
    );

    // Add analysis
    this.results.analysis = this.analyzeResults();

    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

    console.log("\n📈 PERFORMANCE REPORT GENERATED");
    console.log(`Report saved to: ${reportPath}`);

    this.printSummary();

    return reportPath;
  }

  analyzeResults() {
    const analysis = {
      bottlenecks: [],
      recommendations: [],
      criticalPath: [],
      optimizationOpportunities: [],
    };

    // Analyze build performance
    if (
      this.results.baseline.sharedBuild &&
      this.results.baseline.workspaceBuild
    ) {
      const sharedTime = this.results.baseline.sharedBuild.avgTime;
      const totalTime = this.results.baseline.workspaceBuild.avgTime;
      const sharedPercentage = (sharedTime / totalTime) * 100;

      if (sharedPercentage > 30) {
        analysis.bottlenecks.push(
          `Shared package build takes ${sharedPercentage.toFixed(1)}% of total build time`,
        );
        analysis.recommendations.push(
          "Optimize shared package TypeScript compilation",
        );
      }
    }

    // Analyze memory usage
    const memoryUsage = Object.values(this.results.baseline)
      .filter((result) => result.success && result.avgMemory > 0)
      .map((result) => result.avgMemory);

    if (memoryUsage.length > 0) {
      const maxMemory = Math.max(...memoryUsage);
      if (maxMemory > 512) {
        analysis.bottlenecks.push(`High memory usage detected: ${maxMemory}MB`);
        analysis.recommendations.push(
          "Consider build process memory optimization",
        );
      }
    }

    return analysis;
  }

  printSummary() {
    console.log("\n📊 PERFORMANCE SUMMARY");
    console.log("=".repeat(50));

    const baseline = this.results.baseline;

    if (baseline.workspaceBuild && baseline.workspaceBuild.success) {
      console.log(
        `🔨 Full Build Time: ${baseline.workspaceBuild.avgTime}ms (${Math.round(baseline.workspaceBuild.avgTime / 1000)}s)`,
      );
    }

    if (baseline.freshInstall && baseline.freshInstall.success) {
      console.log(
        `📦 Fresh Install Time: ${baseline.freshInstall.avgTime}ms (${Math.round(baseline.freshInstall.avgTime / 1000)}s)`,
      );
    }

    if (baseline.workspaceLint && baseline.workspaceLint.success) {
      console.log(
        `🔍 Lint Time: ${baseline.workspaceLint.avgTime}ms (${Math.round(baseline.workspaceLint.avgTime / 1000)}s)`,
      );
    }

    console.log("\n📈 System Info:");
    console.log(`   CPUs: ${this.results.system.cpus}`);
    console.log(`   Memory: ${this.results.system.totalMemory}GB`);
    console.log(`   pnpm: ${this.results.system.pnpmVersion}`);

    if (this.results.analysis.bottlenecks.length > 0) {
      console.log("\n⚠️  Bottlenecks Identified:");
      this.results.analysis.bottlenecks.forEach((bottleneck) => {
        console.log(`   • ${bottleneck}`);
      });
    }

    if (this.results.analysis.recommendations.length > 0) {
      console.log("\n💡 Optimization Recommendations:");
      this.results.analysis.recommendations.forEach((rec) => {
        console.log(`   • ${rec}`);
      });
    }
  }

  async runFullAnalysis() {
    console.log("🚀 BYTEBOT WORKSPACE PERFORMANCE ANALYSIS");
    console.log("=".repeat(50));

    try {
      await this.measureInstallPerformance();
      await this.measureBuildPerformance();
      await this.measureLintPerformance();
      // Commented out tests as they may be broken during error cleanup
      // await this.measureTestPerformance();

      const reportPath = this.generateReport();
      return reportPath;
    } catch (error) {
      console.error("Performance analysis failed:", error);
      throw error;
    }
  }
}

// CLI usage
if (require.main === module) {
  const monitor = new PerformanceMonitor();

  const command = process.argv[2];

  if (command === "build") {
    monitor.measureBuildPerformance();
  } else if (command === "install") {
    monitor.measureInstallPerformance();
  } else if (command === "lint") {
    monitor.measureLintPerformance();
  } else if (command === "full") {
    monitor.runFullAnalysis();
  } else {
    console.log("Usage: node performance-monitor.js [build|install|lint|full]");
    process.exit(1);
  }
}

module.exports = PerformanceMonitor;
