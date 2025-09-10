#!/usr/bin/env node

/**
 * ESLint Progress Monitor
 * Tracks the progress of ESLint violation fixes in real-time
 */

const { execSync } = require("child_process");
const fs = require("fs");

class ESLintProgressMonitor {
  constructor() {
    this.baseline = 136;
    this.startTime = new Date();
    this.logFile = "/tmp/eslint-progress.log";
    this.previousCount = this.baseline;
  }

  runLintCheck() {
    try {
      const result = execSync("npm run lint 2>&1", {
        cwd: process.cwd(),
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });
      return result;
    } catch (error) {
      return error.stdout || error.message;
    }
  }

  parseViolationCount(output) {
    const match = output.match(
      /✖ (\d+) problems? \((\d+) errors?, (\d+) warnings?\)/,
    );
    if (match) {
      return {
        total: parseInt(match[1]),
        errors: parseInt(match[2]),
        warnings: parseInt(match[3]),
      };
    }
    return null;
  }

  getViolationBreakdown(output) {
    const breakdown = {
      "no-explicit-any": (
        output.match(/@typescript-eslint\/no-explicit-any/g) || []
      ).length,
      "no-case-declarations": (output.match(/no-case-declarations/g) || [])
        .length,
      "no-control-regex": (output.match(/no-control-regex/g) || []).length,
    };
    return breakdown;
  }

  generateReport() {
    const output = this.runLintCheck();
    const counts = this.parseViolationCount(output);
    const breakdown = this.getViolationBreakdown(output);
    const timestamp = new Date().toISOString();
    const elapsed = Math.round((new Date() - this.startTime) / 1000);

    const report = {
      timestamp,
      elapsed: `${elapsed}s`,
      current: counts,
      baseline: this.baseline,
      progress: {
        fixed: counts ? this.baseline - counts.total : 0,
        remaining: counts ? counts.total : 0,
        percentageComplete: counts
          ? Math.round(((this.baseline - counts.total) / this.baseline) * 100)
          : 0,
      },
      breakdown,
      changeFromLast: counts ? counts.total - this.previousCount : 0,
    };

    if (counts) {
      this.previousCount = counts.total;
    }

    return report;
  }

  logReport(report) {
    const logEntry = `${report.timestamp} | ${report.current?.total || "ERROR"} violations (${report.progress.percentageComplete}% complete) | Fixed: ${report.progress.fixed} | Change: ${report.changeFromLast}\n`;

    try {
      fs.appendFileSync(this.logFile, logEntry);
    } catch (err) {
      console.error("Failed to write log:", err.message);
    }

    // Console output
    console.log("\n=== ESLint Progress Report ===");
    console.log(`Time: ${report.timestamp}`);
    console.log(`Elapsed: ${report.elapsed}`);
    console.log(
      `Current Violations: ${report.current?.total || "ERROR"} (${report.current?.errors || 0} errors, ${report.current?.warnings || 0} warnings)`,
    );
    console.log(
      `Progress: ${report.progress.fixed}/${this.baseline} fixed (${report.progress.percentageComplete}% complete)`,
    );
    console.log(
      `Change from last check: ${report.changeFromLast > 0 ? "+" : ""}${report.changeFromLast}`,
    );
    console.log("\nBreakdown:");
    console.log(
      `  @typescript-eslint/no-explicit-any: ${report.breakdown["no-explicit-any"]}`,
    );
    console.log(
      `  no-case-declarations: ${report.breakdown["no-case-declarations"]}`,
    );
    console.log(`  no-control-regex: ${report.breakdown["no-control-regex"]}`);

    if (report.current?.total === 0) {
      console.log("\n🎉 SUCCESS: All ESLint violations have been resolved! 🎉");
      return true;
    }

    return false;
  }

  async monitor(intervalMs = 60000) {
    console.log("Starting ESLint progress monitoring...");
    console.log(`Baseline: ${this.baseline} violations`);
    console.log(`Check interval: ${intervalMs / 1000}s`);
    console.log(`Log file: ${this.logFile}`);

    // Initial report
    const initialReport = this.generateReport();
    const isComplete = this.logReport(initialReport);

    if (isComplete) {
      return;
    }

    // Continuous monitoring
    const interval = setInterval(() => {
      const report = this.generateReport();
      const complete = this.logReport(report);

      if (complete) {
        console.log("\nMonitoring complete - all violations resolved!");
        clearInterval(interval);
        process.exit(0);
      }
    }, intervalMs);

    // Keep process alive
    process.on("SIGINT", () => {
      console.log("\nMonitoring stopped by user");
      clearInterval(interval);
      process.exit(0);
    });
  }
}

// If run directly, start monitoring
if (require.main === module) {
  const monitor = new ESLintProgressMonitor();
  const intervalMs = parseInt(process.argv[2]) || 30000; // Default 30 seconds
  monitor.monitor(intervalMs);
}

module.exports = ESLintProgressMonitor;
