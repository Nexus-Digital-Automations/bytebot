#!/usr/bin/env node
/**
 * Bytebot Security Testing CLI Runner
 * ===================================
 *
 * Command-line interface for running security tests against Bytebot services
 *
 * Usage:
 *   npm run security:test                          # Run all tests on localhost:3000
 *   npm run security:test -- --target http://localhost:8080
 *   npm run security:test -- --pentest-only
 *   npm run security:test -- --network-only
 *   npm run security:test -- --help
 */

import { Command } from "commander";
import {
  runSecuritySuite,
  runPenetrationTest,
  runNetworkScan,
  SecurityUtils,
  SecurityTestingConfig,
} from "./index";

const program = new Command();

program
  .name("bytebot-security-test")
  .description("Comprehensive security testing suite for Bytebot services")
  .version("1.0.0");

program
  .command("full")
  .description("Run comprehensive security testing suite (default)")
  .option("-t, --target <url>", "Target URL to test", "http://localhost:3000")
  .option("-h, --hosts <hosts...>", "Additional hosts to scan", ["127.0.0.1"])
  .option(
    "-o, --output <path>",
    "Output directory for reports",
    "./security-reports",
  )
  .option("--no-network", "Skip network scanning")
  .option("--no-container", "Skip container security testing")
  .option("--max-concurrent <num>", "Maximum concurrent tests", "5")
  .option("--timeout <ms>", "Test timeout in milliseconds", "300000")
  .option("--unsafe", "Allow testing on non-local targets (USE WITH CAUTION)")
  .action(async (options) => {
    console.log("🔒 Bytebot Comprehensive Security Testing Suite");
    console.log("================================================");

    // Safety check
    if (!options.unsafe && !SecurityUtils.isSafeForTesting(options.target)) {
      console.error(
        "❌ Target appears to be a production system. Use --unsafe flag to override.",
      );
      console.error(
        "⚠️  WARNING: Only run security tests on systems you own or have permission to test.",
      );
      process.exit(1);
    }

    if (!SecurityUtils.validateTarget(options.target)) {
      console.error("❌ Invalid target URL provided");
      process.exit(1);
    }

    console.log(`🎯 Target: ${options.target}`);
    console.log(`🌐 Hosts: ${options.hosts.join(", ")}`);
    console.log(`📁 Output: ${options.output}`);
    console.log();

    try {
      await runSecuritySuite(options.target, {
        includeNetworkScanning: options.network,
        includeContainerTesting: options.container,
        outputPath: options.output,
      });

      console.log("\n✅ Security testing completed successfully!");
      console.log(`📊 Check ${options.output} for detailed reports`);
    } catch (err) {
      console.error(
        "\n❌ Security testing failed:",
        err instanceof Error ? err.message : error,
      );
      process.exit(1);
    }
  });

program
  .command("pentest")
  .description("Run penetration testing only")
  .option("-t, --target <url>", "Target URL to test", "http://localhost:3000")
  .option(
    "-o, --output <path>",
    "Output directory for reports",
    "./penetration-test-reports",
  )
  .option("--unsafe", "Allow testing on non-local targets (USE WITH CAUTION)")
  .action(async (options) => {
    console.log("🔓 Bytebot Penetration Testing Suite");
    console.log("====================================");

    // Safety check
    if (!options.unsafe && !SecurityUtils.isSafeForTesting(options.target)) {
      console.error(
        "❌ Target appears to be a production system. Use --unsafe flag to override.",
      );
      console.error(
        "⚠️  WARNING: Only run penetration tests on systems you own or have permission to test.",
      );
      process.exit(1);
    }

    if (!SecurityUtils.validateTarget(options.target)) {
      console.error("❌ Invalid target URL provided");
      process.exit(1);
    }

    console.log(`🎯 Target: ${options.target}`);
    console.log(`📁 Output: ${options.output}`);
    console.log();

    try {
      await runPenetrationTest(options.target, options.output);

      console.log("\n✅ Penetration testing completed successfully!");
      console.log(`📊 Check ${options.output} for detailed reports`);
    } catch (err) {
      console.error(
        "\n❌ Penetration testing failed:",
        err instanceof Error ? err.message : error,
      );
      process.exit(1);
    }
  });

program
  .command("network")
  .description("Run network security scanning only")
  .option("-h, --hosts <hosts...>", "Hosts to scan", ["127.0.0.1"])
  .option(
    "-o, --output <path>",
    "Output directory for reports",
    "./network-scan-reports",
  )
  .action(async (options) => {
    console.log("🌐 Bytebot Network Security Scanner");
    console.log("===================================");

    console.log(`🎯 Hosts: ${options.hosts.join(", ")}`);
    console.log(`📁 Output: ${options.output}`);
    console.log();

    try {
      await runNetworkScan(options.hosts, options.output);

      console.log("\n✅ Network scanning completed successfully!");
      console.log(`📊 Check ${options.output} for detailed reports`);
    } catch (err) {
      console.error(
        "\n❌ Network scanning failed:",
        err instanceof Error ? err.message : error,
      );
      process.exit(1);
    }
  });

program
  .command("config")
  .description("Show available security testing configurations")
  .action(() => {
    console.log("🔧 Available Security Testing Configurations");
    console.log("============================================");

    console.log("\n📍 Local Development (default):");
    console.log(`   Target: ${SecurityTestingConfig.local.target.url}`);
    console.log(
      `   Hosts: ${SecurityTestingConfig.local.target.hosts.join(", ")}`,
    );
    console.log(
      `   API Endpoints: ${SecurityTestingConfig.local.target.apiEndpoints.length} endpoints`,
    );
    console.log(`   Tests: All security tests enabled`);

    console.log("\n📍 Staging Environment:");
    console.log(`   Target: ${SecurityTestingConfig.staging.target.url}`);
    console.log(
      `   Hosts: ${SecurityTestingConfig.staging.target.hosts.join(", ")}`,
    );
    console.log(`   Tests: Penetration testing and API security only`);

    console.log("\n📍 Production (Limited):");
    console.log(`   Target: ${SecurityTestingConfig.production.target.url}`);
    console.log(`   Tests: Infrastructure testing only (READ-ONLY)`);

    console.log("\n⚠️  Security Reminders:");
    console.log(
      "   • Only test systems you own or have explicit permission to test",
    );
    console.log("   • Never run full penetration tests on production systems");
    console.log("   • Use staging environments for comprehensive testing");
    console.log("   • Review security test results before sharing");
  });

program
  .command("validate")
  .description("Validate target URL before testing")
  .argument("<url>", "URL to validate")
  .action((url) => {
    console.log("🔍 Target Validation");
    console.log("===================");

    console.log(`🎯 Target: ${url}`);

    const isValid = SecurityUtils.validateTarget(url);
    const isSafe = SecurityUtils.isSafeForTesting(url);

    console.log(`✅ Valid URL: ${isValid ? "Yes" : "No"}`);
    console.log(`🛡️  Safe for Testing: ${isSafe ? "Yes" : "No"}`);

    if (!isValid) {
      console.log(
        "❌ Invalid URL format. Please provide a valid HTTP or HTTPS URL.",
      );
    }

    if (!isSafe) {
      console.log(
        "⚠️  WARNING: This target appears to be a production system.",
      );
      console.log(
        "   Only proceed if you have explicit permission to test this system.",
      );
      console.log("   Use the --unsafe flag to override this safety check.");
    }

    if (isValid && isSafe) {
      console.log("✅ Target is ready for security testing!");
    }
  });

// Set default command to 'full'
if (process.argv.length === 2) {
  process.argv.push("full");
}

// Enhanced error handling
process.on("uncaughtException", (error) => {
  console.error("\n💥 Uncaught Exception:", err.message);
  console.error("Stack:", err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("\n💥 Unhandled Rejection at:", promise);
  console.error("Reason:", reason);
  process.exit(1);
});

// Add help information
program.addHelpText(
  "after",
  `
Examples:
  $ npm run security:test                              # Full security test on localhost:3000
  $ npm run security:test -- --target http://localhost:8080
  $ npm run security:test -- pentest --target http://staging.example.com --unsafe
  $ npm run security:test -- network --hosts 192.168.1.1 192.168.1.10
  $ npm run security:test -- validate https://api.example.com
  $ npm run security:test -- config

Safety Features:
  • Automatic production system detection
  • Safe target validation
  • Permission checks and warnings
  • Non-destructive testing methodology

Report Formats:
  • JSON (machine-readable results)
  • HTML (executive summary and detailed findings)
  • CSV (statistical summaries)

For more information, visit: https://github.com/bytebot/security-testing
`,
);

program.parse(process.argv);
