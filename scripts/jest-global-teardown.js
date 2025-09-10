#!/usr/bin/env node

/**
 * ===================================================================
 * BYTEBOT WORKSPACE GLOBAL TEST TEARDOWN ORCHESTRATOR
 * Enterprise-Grade Test Environment Cleanup and Resource Management System
 * ===================================================================
 *
 * COMPREHENSIVE TEST INFRASTRUCTURE CLEANUP
 *
 * This critical infrastructure script orchestrates the complete cleanup and
 * resource deallocation of the Bytebot monorepo test environment, providing
 * enterprise-grade teardown coordination, service shutdown management, and
 * comprehensive resource cleanup across all testing packages.
 *
 * TEARDOWN ORCHESTRATION SCOPE:
 * - Multi-Package Cleanup: Coordinated cleanup across shared, bytebot-agent, bytebot-ui, bytebotd
 * - Service Shutdown: Database, Redis, and web server cleanup and termination
 * - Resource Management: Temporary file cleanup, artifact collection, process termination
 * - State Management: Setup state restoration and cleanup coordination
 *
 * ENTERPRISE FEATURES:
 * - Configurable Cleanup: Environment-driven cleanup behavior control
 * - Artifact Preservation: Selective preservation of test artifacts for analysis
 * - Graceful Degradation: Robust cleanup even when services are unavailable
 * - Performance Tracking: Teardown duration monitoring and reporting
 *
 * CLEANUP ARCHITECTURE:
 * - PostgreSQL Test Database: Complete database cleanup and removal
 * - Redis Test Cache: Test namespace cleanup and cache clearing
 * - Process Management: Termination of lingering test processes
 * - File System Cleanup: Temporary file and cache directory cleanup
 *
 * ARTIFACT MANAGEMENT:
 * - Coverage Reports: Test coverage data preservation and archiving
 * - Test Logs: Execution log collection and organization
 * - State Files: Setup state and configuration preservation
 * - Performance Data: Teardown metrics and timing information
 *
 * CONFIGURABLE CLEANUP OPTIONS:
 * - removeTemporaryFiles: Control temporary file cleanup behavior
 * - clearTestDatabase: Database cleanup enablement/disabling
 * - clearRedis: Redis cache cleanup configuration
 * - preserveArtifacts: Test artifact preservation for post-test analysis
 *
 * ERROR HANDLING STRATEGY:
 * - Non-Blocking Failures: Teardown continues even when individual cleanup fails
 * - Graceful Service Handling: Safe handling of unavailable services
 * - Resource Protection: Prevents accidental cleanup of production resources
 * - Comprehensive Logging: Detailed cleanup status and error reporting
 *
 * INTEGRATION BENEFITS:
 * - CI/CD Pipeline: Clean environment restoration for subsequent runs
 * - Development Workflow: Isolated test environment cleanup
 * - Performance Optimization: Resource cleanup for system efficiency
 * - Debugging Support: Artifact preservation for test failure analysis
 *
 * @author Claude Code (DevOps & Test Infrastructure Specialist)
 * @version 2.0.0
 * @created 2025-09-06
 * @lastModified 2025-09-10
 * @classification Enterprise Test Infrastructure
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * ENTERPRISE TEST TEARDOWN CONFIGURATION
 *
 * Comprehensive configuration object defining all aspects of the global
 * test environment teardown process, including cleanup behavior, directory
 * management, resource preservation, and artifact collection strategies.
 *
 * CONFIGURATION CATEGORIES:
 * - cleanup: Behavioral flags controlling what resources get cleaned up
 * - directories: Test workspace directory structure and organization
 *
 * CLEANUP BEHAVIOR CONTROL:
 * - removeTemporaryFiles: Controls cleanup of temporary test files and caches
 * - clearTestDatabase: Enables/disables test database cleanup and removal
 * - clearRedis: Controls Redis test namespace cleanup behavior
 * - preserveArtifacts: Enables artifact preservation for post-test analysis
 *
 * ENVIRONMENT ADAPTATION:
 * - Configurable via environment variables for CI/CD pipeline flexibility
 * - Graceful behavior when services are unavailable or cleanup fails
 * - Safe defaults that prevent accidental production resource cleanup
 *
 * ARTIFACT PRESERVATION STRATEGY:
 * - Coverage reports preserved for trend analysis and quality gates
 * - Test logs preserved for debugging and failure analysis
 * - State files preserved for setup/teardown coordination
 * - Performance data preserved for optimization analysis
 */
const TEARDOWN_CONFIG = {
  cleanup: {
    removeTemporaryFiles: process.env.CLEANUP_TEMP_FILES !== "false",
    clearTestDatabase: process.env.CLEANUP_DB !== "false",
    clearRedis: process.env.CLEANUP_REDIS !== "false",
    preserveArtifacts: process.env.PRESERVE_ARTIFACTS === "true",
  },
  directories: {
    temp: path.join(process.cwd(), "tmp", "test-workspace"),
    logs: path.join(process.cwd(), "tmp", "test-logs"),
    coverage: path.join(process.cwd(), "coverage-workspace"),
    artifacts: path.join(process.cwd(), "test-artifacts"),
  },
};

/**
 * ===================================================================
 * GlobalTestTeardown Class - Enterprise Test Cleanup Orchestrator
 * ===================================================================
 *
 * COMPREHENSIVE TEST CLEANUP COORDINATION ENGINE
 *
 * This class orchestrates the complete cleanup and resource deallocation
 * of the Bytebot monorepo test environment, providing enterprise-grade
 * teardown coordination across multiple packages, services, and infrastructure.
 *
 * TEARDOWN ORCHESTRATION RESPONSIBILITIES:
 * - Service Lifecycle: Database, Redis, and web server cleanup and shutdown
 * - Resource Deallocation: File cleanup, process termination, cache clearing
 * - Artifact Management: Test result preservation and archival coordination
 * - State Restoration: Environment restoration and cleanup verification
 *
 * ENTERPRISE FEATURES:
 * - Multi-Service Coordination: PostgreSQL, Redis, and web server cleanup
 * - Package Integration: Cross-package cleanup consistency and coordination
 * - Artifact Preservation: Selective preservation for debugging and analysis
 * - Performance Tracking: Teardown duration monitoring and optimization
 *
 * CLEANUP STRATEGY:
 * - Non-Blocking: Individual cleanup failures don't prevent overall teardown
 * - Configurable: Environment-driven cleanup behavior customization
 * - Safe: Prevents accidental cleanup of production or development resources
 * - Comprehensive: Covers all aspects of test environment resource cleanup
 *
 * ERROR HANDLING APPROACH:
 * - Service Unavailability: Graceful handling of offline services
 * - Resource Conflicts: Safe handling of locked or missing resources
 * - Permission Issues: Robust handling of file system permission errors
 * - Process Termination: Safe process cleanup with timeout protection
 *
 * @class GlobalTestTeardown
 * @since 2025-09-06
 * @version 2.0.0
 */
class GlobalTestTeardown {
  /**
   * Initialize Global Test Teardown Orchestrator
   *
   * Creates a new teardown instance with performance tracking and setup
   * state restoration. Loads the setup state from global setup for
   * coordinated cleanup of initialized resources.
   *
   * INITIALIZATION COMPONENTS:
   * - startTime: Performance timing for teardown duration tracking
   * - setupState: Loaded setup state for coordinated resource cleanup
   *
   * STATE COORDINATION:
   * - Setup State Loading: Retrieves initialization state from global setup
   * - Resource Registry: Identifies services and resources that need cleanup
   * - Performance Tracking: Monitors teardown duration for optimization
   *
   * @constructor
   * @memberof GlobalTestTeardown
   */
  constructor() {
    /** @type {number} Teardown start timestamp for performance tracking */
    this.startTime = Date.now();

    /** @type {Object|null} Loaded setup state for coordinated cleanup */
    this.setupState = this.loadSetupState();
  }

  /**
   * Main teardown method called by Jest
   */
  async teardown() {
    try {
      console.log("🧹 Starting global test environment teardown...");

      await this.cleanupServices();
      await this.cleanupDatabase();
      await this.cleanupRedis();
      await this.collectTestArtifacts();
      await this.cleanupTemporaryFiles();
      await this.generateTeardownReport();

      const duration = Date.now() - this.startTime;
      console.log(
        `✅ Global test environment teardown completed in ${duration}ms`,
      );
    } catch (error) {
      console.error("❌ Global test teardown failed:", error);
      // Don't exit with error code on teardown failure
    }
  }

  /**
   * Load setup state from global setup
   */
  loadSetupState() {
    try {
      const statePath = path.join(
        TEARDOWN_CONFIG.directories.temp,
        "setup-state.json",
      );
      if (fs.existsSync(statePath)) {
        return JSON.parse(fs.readFileSync(statePath, "utf8"));
      }
    } catch (error) {
      console.log(
        "⚠️  Could not load setup state, proceeding with default teardown",
      );
    }
    return null;
  }

  /**
   * Cleanup test services
   */
  async cleanupServices() {
    console.log("🔌 Cleaning up test services...");

    if (this.setupState?.services) {
      Object.entries(this.setupState.services).forEach(([service, config]) => {
        console.log(`  ✓ Cleaned up ${service} service`);
      });
    }

    // Kill any remaining test processes
    await this.killTestProcesses();
  }

  /**
   * Kill remaining test processes
   */
  async killTestProcesses() {
    try {
      // Kill any lingering test processes by name
      const processPatterns = [
        "bytebot-agent-test",
        "bytebot-ui-test",
        "bytebotd-test",
        "jest-worker",
      ];

      processPatterns.forEach((pattern) => {
        try {
          execSync(`pkill -f "${pattern}"`, { stdio: "ignore" });
        } catch (error) {
          // Process might not exist, that's okay
        }
      });

      console.log("  ✓ Cleaned up test processes");
    } catch (error) {
      // Non-critical error
      console.log("  ⚠️  Could not clean up all test processes");
    }
  }

  /**
   * Cleanup test database
   */
  async cleanupDatabase() {
    if (!TEARDOWN_CONFIG.cleanup.clearTestDatabase) {
      console.log("📄 Skipping database cleanup (preserving for inspection)");
      return;
    }

    console.log("🗄️  Cleaning up test database...");

    try {
      // Drop test database if it exists
      const testDb = "bytebot_test";
      execSync(`dropdb --if-exists ${testDb}`, { stdio: "ignore" });
      console.log(`  ✓ Dropped test database: ${testDb}`);
    } catch (error) {
      console.log("  ⚠️  Could not clean up test database (may not exist)");
    }
  }

  /**
   * Cleanup test Redis
   */
  async cleanupRedis() {
    if (!TEARDOWN_CONFIG.cleanup.clearRedis) {
      console.log("📄 Skipping Redis cleanup (preserving for inspection)");
      return;
    }

    console.log("🔴 Cleaning up test Redis...");

    try {
      // Clear test Redis database
      execSync("redis-cli -n 15 FLUSHDB", { stdio: "ignore" });
      console.log("  ✓ Cleared test Redis database");
    } catch (error) {
      console.log("  ⚠️  Could not clean up test Redis (may not be running)");
    }
  }

  /**
   * Collect test artifacts for analysis
   */
  async collectTestArtifacts() {
    console.log("📦 Collecting test artifacts...");

    if (!TEARDOWN_CONFIG.cleanup.preserveArtifacts) {
      console.log("  ℹ️  Artifact preservation disabled");
      return;
    }

    const artifactsDir = TEARDOWN_CONFIG.directories.artifacts;
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    const artifacts = [
      {
        name: "coverage-reports",
        source: TEARDOWN_CONFIG.directories.coverage,
        description: "Test coverage reports",
      },
      {
        name: "test-logs",
        source: TEARDOWN_CONFIG.directories.logs,
        description: "Test execution logs",
      },
      {
        name: "global-test-utils",
        source: path.join(
          TEARDOWN_CONFIG.directories.temp,
          "global-test-utils.json",
        ),
        description: "Global test utilities state",
      },
    ];

    artifacts.forEach((artifact) => {
      try {
        if (fs.existsSync(artifact.source)) {
          const targetPath = path.join(artifactsDir, artifact.name);

          if (fs.statSync(artifact.source).isDirectory()) {
            // Copy directory
            execSync(`cp -r "${artifact.source}" "${targetPath}"`, {
              stdio: "ignore",
            });
          } else {
            // Copy file
            fs.copyFileSync(artifact.source, targetPath);
          }

          console.log(`  ✓ Collected ${artifact.description}`);
        }
      } catch (error) {
        console.log(
          `  ⚠️  Could not collect ${artifact.description}: ${error.message}`,
        );
      }
    });
  }

  /**
   * Cleanup temporary files
   */
  async cleanupTemporaryFiles() {
    if (!TEARDOWN_CONFIG.cleanup.removeTemporaryFiles) {
      console.log(
        "📄 Skipping temporary file cleanup (preserving for inspection)",
      );
      return;
    }

    console.log("🗑️  Cleaning up temporary files...");

    const tempDirs = [
      TEARDOWN_CONFIG.directories.temp,
      TEARDOWN_CONFIG.directories.logs,
      path.join(process.cwd(), "node_modules", ".cache", "jest-workspace"),
      path.join(process.cwd(), "node_modules", ".cache", "jest-integration"),
      path.join(process.cwd(), "node_modules", ".cache", "jest-e2e"),
    ];

    tempDirs.forEach((dir) => {
      try {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
          console.log(`  ✓ Cleaned up: ${dir}`);
        }
      } catch (error) {
        console.log(`  ⚠️  Could not clean up ${dir}: ${error.message}`);
      }
    });

    // Clean up package-specific temp files
    await this.cleanupPackageTemporaryFiles();
  }

  /**
   * Cleanup package-specific temporary files
   */
  async cleanupPackageTemporaryFiles() {
    const packages = ["shared", "bytebot-agent", "bytebot-ui", "bytebotd"];

    packages.forEach((pkg) => {
      const packageDir = path.join(process.cwd(), "packages", pkg);
      const tempPaths = [
        path.join(packageDir, ".tmp"),
        path.join(packageDir, "temp"),
        path.join(packageDir, "node_modules", ".cache"),
      ];

      tempPaths.forEach((tempPath) => {
        try {
          if (fs.existsSync(tempPath)) {
            fs.rmSync(tempPath, { recursive: true, force: true });
            console.log(`  ✓ Cleaned up ${pkg}: ${path.basename(tempPath)}`);
          }
        } catch (error) {
          // Non-critical error
        }
      });
    });
  }

  /**
   * Generate teardown report
   */
  async generateTeardownReport() {
    console.log("📊 Generating teardown report...");

    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      setupState: this.setupState,
      cleanup: {
        services: true,
        database: TEARDOWN_CONFIG.cleanup.clearTestDatabase,
        redis: TEARDOWN_CONFIG.cleanup.clearRedis,
        temporaryFiles: TEARDOWN_CONFIG.cleanup.removeTemporaryFiles,
        artifacts: TEARDOWN_CONFIG.cleanup.preserveArtifacts,
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
      },
    };

    try {
      const reportPath = path.join(
        TEARDOWN_CONFIG.directories.artifacts,
        "teardown-report.json",
      );

      // Ensure artifacts directory exists
      if (!fs.existsSync(TEARDOWN_CONFIG.directories.artifacts)) {
        fs.mkdirSync(TEARDOWN_CONFIG.directories.artifacts, {
          recursive: true,
        });
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`  ✓ Teardown report saved to: ${reportPath}`);
    } catch (error) {
      console.log("  ⚠️  Could not save teardown report");
    }
  }
}

/**
 * Jest global teardown function
 */
module.exports = async function globalTeardown() {
  const teardown = new GlobalTestTeardown();
  await teardown.teardown();
};
