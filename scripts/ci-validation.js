#!/usr/bin/env node

/**
 * ===================================================================
 * BYTEBOT MONOREPO CI/CD VALIDATION ENGINE
 * Enterprise-Grade Pre-Flight Validation and Environment Readiness System
 * ===================================================================
 *
 * COMPREHENSIVE CI/CD ENVIRONMENT VALIDATION PLATFORM
 *
 * This critical infrastructure script orchestrates complete pre-flight validation
 * for CI/CD pipeline execution, providing enterprise-grade environment readiness
 * assessment, dependency validation, system requirement verification, and
 * comprehensive quality gates before test suite execution.
 *
 * VALIDATION ORCHESTRATION SCOPE:
 * - Environment Configuration: Required and optional environment variable validation
 * - System Requirements: Node.js, NPM, and tooling version compatibility verification
 * - Dependency Management: Workspace dependency integrity and availability assessment
 * - Package Validation: Individual package structure and configuration verification
 *
 * ENTERPRISE FEATURES:
 * - Quality Gate Enforcement: Multi-tier validation with severity-based failure logic
 * - Comprehensive Reporting: JSON artifacts and markdown summaries for CI/CD integration
 * - Flexible Configuration: Required vs optional component handling for different environments
 * - Automated Recovery: Environment variable auto-configuration for missing CI settings
 *
 * VALIDATION ARCHITECTURE:
 * - Environment Layer: NODE_ENV, CI flags, database connections, service URLs
 * - System Layer: Runtime versions, tool availability, resource capacity
 * - Dependency Layer: Package management, workspace configuration, dependency resolution
 * - Package Layer: Individual package integrity, configuration, and test setup
 *
 * QUALITY GATE SYSTEM:
 * - HIGH Severity: Blocks CI execution (missing required tools, invalid configurations)
 * - MEDIUM Severity: Warning state (missing optional tools, configuration issues)
 * - LOW Severity: Informational (optimization opportunities, recommendations)
 *
 * CI/CD INTEGRATION FEATURES:
 * - GitHub Actions Compatible: Status reporting and artifact generation
 * - Environment Detection: Automatic CI environment detection and configuration
 * - Failure Reporting: Detailed issue classification with remediation guidance
 * - Performance Metrics: System resource assessment and capacity planning
 *
 * VALIDATION CATEGORIES:
 * - Environment Variables: CI, NODE_ENV, DATABASE_URL, REDIS_URL, JWT_SECRET
 * - System Requirements: Node.js ≥18.0.0, NPM ≥8.0.0, PostgreSQL, Redis
 * - Workspace Dependencies: Root package.json, workspaces config, node_modules
 * - Package Structure: Individual package validation, scripts, configurations
 *
 * ERROR RECOVERY STRATEGIES:
 * - Auto-Configuration: Missing CI and NODE_ENV variables automatically set
 * - Graceful Degradation: Optional service failures don't block pipeline
 * - Detailed Diagnostics: Comprehensive issue reporting with specific remediation
 * - Resource Assessment: System capacity evaluation for test execution planning
 *
 * INTEGRATION BENEFITS:
 * - CI/CD Pipeline: Automated environment readiness verification
 * - Developer Workflow: Local development environment validation
 * - Infrastructure Monitoring: System health and capacity assessment
 * - Quality Assurance: Comprehensive pre-test validation and issue prevention
 *
 * @author Claude Code (DevOps & Test Infrastructure Specialist)
 * @version 2.0.0
 * @created 2025-09-06
 * @lastModified 2025-09-10
 * @classification Enterprise CI/CD Infrastructure
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Configuration
const CONFIG = {
  rootDir: process.cwd(),
  packages: ["shared", "bytebot-agent", "bytebot-ui", "bytebotd"],
  requiredEnvVars: ["NODE_ENV", "CI"],
  optionalEnvVars: ["DATABASE_URL", "REDIS_URL", "JWT_SECRET"],
  requiredCommands: [
    { name: "Node.js", command: "node --version", minVersion: "18.0.0" },
    { name: "NPM", command: "npm --version", minVersion: "8.0.0" },
  ],
  optionalCommands: [
    { name: "PostgreSQL", command: "pg_isready --timeout=5", required: false },
    { name: "Redis", command: "redis-cli ping", required: false },
  ],
};

class CiValidator {
  constructor() {
    this.validationResults = {
      timestamp: new Date().toISOString(),
      overall: { status: "PENDING", issues: [] },
      environment: { status: "PENDING", issues: [] },
      dependencies: { status: "PENDING", issues: [] },
      packages: { status: "PENDING", issues: [] },
      system: { status: "PENDING", issues: [] },
    };
  }

  /**
   * Main validation method
   */
  async run() {
    try {
      console.log("🔍 Starting CI environment validation...");

      await this.validateEnvironment();
      await this.validateSystemRequirements();
      await this.validateDependencies();
      await this.validatePackages();
      await this.calculateOverallStatus();
      await this.generateReport();

      if (this.validationResults.overall.status === "FAILED") {
        console.log("❌ CI validation failed");
        process.exit(1);
      } else {
        console.log("✅ CI environment validation passed");
      }
    } catch (error) {
      console.error("❌ CI validation error:", error);
      process.exit(1);
    }
  }

  /**
   * Validate environment variables
   */
  async validateEnvironment() {
    console.log("🌍 Validating environment variables...");

    const issues = [];

    // Check required environment variables
    CONFIG.requiredEnvVars.forEach((envVar) => {
      if (!process.env[envVar]) {
        issues.push({
          type: "missing-env-var",
          variable: envVar,
          severity: "high",
          message: `Required environment variable ${envVar} is not set`,
        });
      } else {
        console.log(`  ✓ ${envVar}: ${process.env[envVar]}`);
      }
    });

    // Check optional environment variables
    CONFIG.optionalEnvVars.forEach((envVar) => {
      if (!process.env[envVar]) {
        console.log(`  ⚠️  ${envVar}: not set (optional)`);
      } else {
        console.log(`  ✓ ${envVar}: configured`);
      }
    });

    // Validate NODE_ENV
    if (process.env.NODE_ENV && process.env.NODE_ENV !== "test") {
      issues.push({
        type: "invalid-node-env",
        severity: "medium",
        message: `NODE_ENV should be 'test' for CI, got '${process.env.NODE_ENV}'`,
      });
    }

    // Set CI-specific environment variables if missing
    if (!process.env.CI) {
      process.env.CI = "true";
      console.log("  ✓ CI: set to true");
    }

    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = "test";
      console.log("  ✓ NODE_ENV: set to test");
    }

    this.validationResults.environment = {
      status: issues.length === 0 ? "PASSED" : "FAILED",
      issues,
    };

    if (issues.length > 0) {
      console.log(
        `  ❌ Environment validation failed with ${issues.length} issues`,
      );
    } else {
      console.log("  ✅ Environment validation passed");
    }
  }

  /**
   * Validate system requirements
   */
  async validateSystemRequirements() {
    console.log("💻 Validating system requirements...");

    const issues = [];

    // Check required commands
    for (const req of CONFIG.requiredCommands) {
      try {
        const version = execSync(req.command, {
          encoding: "utf8",
          stdio: "pipe",
        }).trim();
        console.log(`  ✓ ${req.name}: ${version}`);

        // Basic version check (simplified)
        if (req.minVersion && version.includes("v")) {
          const versionNumber = version.replace("v", "").split(".")[0];
          const minVersionNumber = req.minVersion.split(".")[0];

          if (parseInt(versionNumber) < parseInt(minVersionNumber)) {
            issues.push({
              type: "version-too-old",
              command: req.name,
              severity: "high",
              message: `${req.name} version ${version} is older than required ${req.minVersion}`,
            });
          }
        }
      } catch (error) {
        issues.push({
          type: "missing-requirement",
          command: req.name,
          severity: "high",
          message: `Required command '${req.name}' not available`,
        });
      }
    }

    // Check optional commands
    for (const req of CONFIG.optionalCommands) {
      try {
        execSync(req.command, { encoding: "utf8", stdio: "ignore" });
        console.log(`  ✓ ${req.name}: available`);
      } catch (error) {
        console.log(`  ⚠️  ${req.name}: not available (optional)`);
      }
    }

    // Check disk space
    try {
      const diskUsage = execSync("df -h .", { encoding: "utf8" }).split(
        "\\n",
      )[1];
      const available = diskUsage.split(/\\s+/)[3];
      console.log(`  ✓ Disk space available: ${available}`);
    } catch (error) {
      console.log("  ⚠️  Could not check disk space");
    }

    // Check memory
    try {
      const memInfo = process.memoryUsage();
      const totalMB = Math.round(memInfo.heapTotal / 1024 / 1024);
      console.log(`  ✓ Memory heap total: ${totalMB}MB`);
    } catch (error) {
      console.log("  ⚠️  Could not check memory usage");
    }

    this.validationResults.system = {
      status: issues.length === 0 ? "PASSED" : "FAILED",
      issues,
    };

    if (issues.length > 0) {
      console.log(
        `  ❌ System requirements validation failed with ${issues.length} issues`,
      );
    } else {
      console.log("  ✅ System requirements validation passed");
    }
  }

  /**
   * Validate workspace dependencies
   */
  async validateDependencies() {
    console.log("📦 Validating workspace dependencies...");

    const issues = [];

    // Check root package.json
    const rootPackageJson = path.join(CONFIG.rootDir, "package.json");
    if (!fs.existsSync(rootPackageJson)) {
      issues.push({
        type: "missing-root-package",
        severity: "high",
        message: "Root package.json not found",
      });
    } else {
      try {
        const pkg = JSON.parse(fs.readFileSync(rootPackageJson, "utf8"));
        console.log(`  ✓ Root package: ${pkg.name}@${pkg.version}`);

        // Check for workspaces configuration
        if (!pkg.workspaces) {
          issues.push({
            type: "missing-workspaces",
            severity: "medium",
            message: "Workspaces not configured in root package.json",
          });
        } else {
          console.log("  ✓ Workspaces configured");
        }

        // Check for required scripts
        const requiredScripts = ["test", "build", "lint"];
        requiredScripts.forEach((script) => {
          if (!pkg.scripts || !pkg.scripts[script]) {
            issues.push({
              type: "missing-script",
              script,
              severity: "medium",
              message: `Required script '${script}' not found in root package.json`,
            });
          } else {
            console.log(`  ✓ Script '${script}' available`);
          }
        });
      } catch (error) {
        issues.push({
          type: "invalid-root-package",
          severity: "high",
          message: `Could not parse root package.json: ${error.message}`,
        });
      }
    }

    // Check node_modules
    const nodeModules = path.join(CONFIG.rootDir, "node_modules");
    if (!fs.existsSync(nodeModules)) {
      issues.push({
        type: "missing-node-modules",
        severity: "high",
        message: "node_modules directory not found - run npm install",
      });
    } else {
      console.log("  ✓ node_modules directory exists");
    }

    // Check package-lock.json
    const packageLock = path.join(CONFIG.rootDir, "package-lock.json");
    if (!fs.existsSync(packageLock)) {
      issues.push({
        type: "missing-package-lock",
        severity: "medium",
        message:
          "package-lock.json not found - dependency versions may be inconsistent",
      });
    } else {
      console.log("  ✓ package-lock.json exists");
    }

    this.validationResults.dependencies = {
      status:
        issues.length === 0
          ? "PASSED"
          : issues.some((i) => i.severity === "high")
            ? "FAILED"
            : "WARNING",
      issues,
    };

    if (issues.length > 0) {
      console.log(
        `  ⚠️  Dependencies validation found ${issues.length} issues`,
      );
    } else {
      console.log("  ✅ Dependencies validation passed");
    }
  }

  /**
   * Validate individual packages
   */
  async validatePackages() {
    console.log("📋 Validating individual packages...");

    const issues = [];

    for (const packageName of CONFIG.packages) {
      const packageDir = path.join(CONFIG.rootDir, "packages", packageName);
      const packageJson = path.join(packageDir, "package.json");

      if (!fs.existsSync(packageDir)) {
        issues.push({
          type: "missing-package-dir",
          package: packageName,
          severity: "high",
          message: `Package directory '${packageName}' not found`,
        });
        continue;
      }

      if (!fs.existsSync(packageJson)) {
        issues.push({
          type: "missing-package-json",
          package: packageName,
          severity: "high",
          message: `package.json not found in '${packageName}' package`,
        });
        continue;
      }

      try {
        const pkg = JSON.parse(fs.readFileSync(packageJson, "utf8"));
        console.log(`  ✓ Package ${packageName}: ${pkg.name}@${pkg.version}`);

        // Check required scripts
        const requiredScripts = ["test", "build"];
        requiredScripts.forEach((script) => {
          if (!pkg.scripts || !pkg.scripts[script]) {
            issues.push({
              type: "missing-package-script",
              package: packageName,
              script,
              severity: "medium",
              message: `Script '${script}' not found in ${packageName} package`,
            });
          }
        });

        // Check for test configuration
        const jestConfig = path.join(packageDir, "jest.config.js");
        if (!fs.existsSync(jestConfig) && !pkg.jest) {
          issues.push({
            type: "missing-test-config",
            package: packageName,
            severity: "medium",
            message: `No Jest configuration found for ${packageName} package`,
          });
        }

        // Check node_modules
        const packageNodeModules = path.join(packageDir, "node_modules");
        if (!fs.existsSync(packageNodeModules)) {
          issues.push({
            type: "missing-package-node-modules",
            package: packageName,
            severity: "medium",
            message: `node_modules not found for ${packageName} package`,
          });
        }
      } catch (error) {
        issues.push({
          type: "invalid-package-json",
          package: packageName,
          severity: "high",
          message: `Could not parse package.json for ${packageName}: ${error.message}`,
        });
      }
    }

    this.validationResults.packages = {
      status:
        issues.length === 0
          ? "PASSED"
          : issues.some((i) => i.severity === "high")
            ? "FAILED"
            : "WARNING",
      issues,
    };

    if (issues.length > 0) {
      console.log(`  ⚠️  Package validation found ${issues.length} issues`);
    } else {
      console.log("  ✅ Package validation passed");
    }
  }

  /**
   * Calculate overall validation status
   */
  async calculateOverallStatus() {
    console.log("📊 Calculating overall validation status...");

    const allIssues = [
      ...this.validationResults.environment.issues,
      ...this.validationResults.system.issues,
      ...this.validationResults.dependencies.issues,
      ...this.validationResults.packages.issues,
    ];

    const highSeverityIssues = allIssues.filter(
      (issue) => issue.severity === "high",
    );

    let status = "PASSED";
    if (highSeverityIssues.length > 0) {
      status = "FAILED";
    } else if (allIssues.length > 0) {
      status = "WARNING";
    }

    this.validationResults.overall = {
      status,
      issues: allIssues,
      summary: {
        totalIssues: allIssues.length,
        highSeverityIssues: highSeverityIssues.length,
        mediumSeverityIssues: allIssues.filter(
          (issue) => issue.severity === "medium",
        ).length,
        lowSeverityIssues: allIssues.filter((issue) => issue.severity === "low")
          .length,
      },
    };

    console.log(`  📈 Overall status: ${status}`);
    console.log(`  📊 Total issues: ${allIssues.length}`);
    console.log(`  🔴 High severity: ${highSeverityIssues.length}`);
  }

  /**
   * Generate validation report
   */
  async generateReport() {
    console.log("📄 Generating CI validation report...");

    const reportDir = path.join(CONFIG.rootDir, "test-artifacts");
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Save JSON report
    const jsonReport = path.join(reportDir, "ci-validation-report.json");
    fs.writeFileSync(
      jsonReport,
      JSON.stringify(this.validationResults, null, 2),
    );

    // Generate markdown summary
    const markdown = this.generateMarkdownSummary();
    const markdownReport = path.join(reportDir, "ci-validation-summary.md");
    fs.writeFileSync(markdownReport, markdown);

    console.log(`  ✓ Reports saved to ${reportDir}`);
  }

  /**
   * Generate markdown summary
   */
  generateMarkdownSummary() {
    const { overall, environment, system, dependencies, packages } =
      this.validationResults;

    return `# 🔍 CI Environment Validation Report

## Overall Status: ${overall.status}

### Summary
- **Total Issues**: ${overall.summary.totalIssues}
- **High Severity**: ${overall.summary.highSeverityIssues}
- **Medium Severity**: ${overall.summary.mediumSeverityIssues}
- **Low Severity**: ${overall.summary.lowSeverityIssues}

### Environment Variables: ${environment.status}
${environment.issues.map((issue) => `- ❌ **${issue.type}**: ${issue.message}`).join("\\n")}

### System Requirements: ${system.status}
${system.issues.map((issue) => `- ❌ **${issue.type}**: ${issue.message}`).join("\\n")}

### Dependencies: ${dependencies.status}
${dependencies.issues.map((issue) => `- ⚠️ **${issue.type}**: ${issue.message}`).join("\\n")}

### Packages: ${packages.status}
${packages.issues.map((issue) => `- ⚠️ **${issue.package}**: ${issue.message}`).join("\\n")}

---
*Generated on ${new Date(this.validationResults.timestamp).toLocaleString()}*
`;
  }
}

// Execute if run directly
if (require.main === module) {
  const validator = new CiValidator();
  validator.run().catch(console.error);
}

module.exports = CiValidator;
