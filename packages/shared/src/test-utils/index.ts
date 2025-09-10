/**
 * Bytebot Security Testing Suite
 * =============================
 *
 * Comprehensive automated security testing framework for Bytebot services
 * including penetration testing, network security scanning, and container security validation.
 *
 * Author: Security Testing Framework Architect
 * Version: 1.0.0
 */

// Export main penetration testing components
export {
  default as AutomatedPenetrationTestingSuite,
  PenetrationTestingCLI,
} from "./penetration-testing-suite";

export {
  default as NetworkSecurityScanner,
  NetworkScannerCLI,
} from "./network-security-scanner";

export {
  default as PenetrationTestingOrchestrator,
  OrchestratorCLI,
} from "./penetration-testing-orchestrator";

// Re-export existing test utilities
export * from "./mocks";

/**
 * Quick-start function for running comprehensive security testing
 */
export async function runSecuritySuite(
  targetUrl: string = "http://localhost:3000",
  options: {
    includeNetworkScanning?: boolean;
    includeContainerTesting?: boolean;
    outputPath?: string;
  } = {},
): Promise<void> {
  const { OrchestratorCLI } = await import(
    "./penetration-testing-orchestrator"
  );

  const args = [targetUrl];
  if (options.includeNetworkScanning !== false) {
    args.push("127.0.0.1", "localhost");
  }

  await OrchestratorCLI.run(args);
}

/**
 * Run basic penetration testing suite
 */
export async function runPenetrationTest(
  targetUrl: string = "http://localhost:3000",
  outputPath: string = "./penetration-test-reports",
): Promise<void> {
  const { PenetrationTestingCLI } = await import("./penetration-testing-suite");
  await PenetrationTestingCLI.run([targetUrl]);
}

/**
 * Run network security scanning
 */
export async function runNetworkScan(
  hosts: string[] = ["127.0.0.1"],
  outputPath: string = "./network-scan-reports",
): Promise<void> {
  const { NetworkScannerCLI } = await import("./network-security-scanner");
  await NetworkScannerCLI.run(hosts);
}

/**
 * Security testing configuration helpers
 */
export const SecurityTestingConfig = {
  /**
   * Default configuration for local development testing
   */
  local: {
    target: {
      url: "http://localhost:3000",
      hosts: ["127.0.0.1"],
      apiEndpoints: [
        "/api/auth/login",
        "/api/users",
        "/api/tasks",
        "/api/health",
        "/api/metrics",
      ],
    },
    tests: {
      penetrationTesting: true,
      networkScanning: true,
      containerSecurity: true,
      apiSecurity: true,
      infrastructureTesting: true,
    },
    execution: {
      maxConcurrent: 3,
      timeout: 30000,
      continueOnFailure: true,
    },
  },

  /**
   * Configuration for staging environment testing
   */
  staging: {
    target: {
      url: "https://staging.example.com",
      hosts: ["staging.example.com"],
      apiEndpoints: [
        "/api/v1/auth/login",
        "/api/v1/users",
        "/api/v1/tasks",
        "/api/v1/health",
        "/api/v1/metrics",
      ],
    },
    tests: {
      penetrationTesting: true,
      networkScanning: false, // Disable for external hosts
      containerSecurity: false,
      apiSecurity: true,
      infrastructureTesting: true,
    },
    execution: {
      maxConcurrent: 2,
      timeout: 60000,
      continueOnFailure: true,
    },
  },

  /**
   * Configuration for production security testing (limited scope)
   */
  production: {
    target: {
      url: "https://api.example.com",
      hosts: ["api.example.com"],
      apiEndpoints: ["/api/v1/health"], // Very limited for production
    },
    tests: {
      penetrationTesting: false, // Never run full pentest on production
      networkScanning: false,
      containerSecurity: false,
      apiSecurity: false,
      infrastructureTesting: true, // Only infrastructure checks
    },
    execution: {
      maxConcurrent: 1,
      timeout: 10000,
      continueOnFailure: true,
    },
  },
};

/**
 * Utility functions for security testing
 */
export const SecurityUtils = {
  /**
   * Validate target URL before testing
   */
  validateTarget(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  },

  /**
   * Check if target is safe for testing
   */
  isSafeForTesting(url: string): boolean {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // Allow localhost and local development
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("192.168.")
    ) {
      return true;
    }

    // Allow staging environments
    if (
      host.includes("staging") ||
      host.includes("test") ||
      host.includes("dev")
    ) {
      return true;
    }

    // Block production-looking domains
    const productionIndicators = [
      "prod",
      "production",
      "api.",
      "www.",
      ".com",
      ".org",
      ".net",
    ];

    return !productionIndicators.some((indicator) => host.includes(indicator));
  },

  /**
   * Generate safe test credentials
   */
  getTestCredentials() {
    return {
      username: "test-user",
      password: "test-password-123",
    };
  },
};

// Type definitions for external consumers
export interface SecurityTestResult {
  testId: string;
  timestamp: Date;
  vulnerabilities: Array<{
    severity: "critical" | "high" | "medium" | "low";
    type: string;
    description: string;
    remediation: string;
  }>;
  statistics: {
    totalTests: number;
    vulnerabilitiesFound: number;
    criticalIssues: number;
    highIssues: number;
  };
}

export interface SecuritySuiteOptions {
  targetUrl?: string;
  targetHosts?: string[];
  apiEndpoints?: string[];
  outputPath?: string;
  includeNetworkScanning?: boolean;
  includeContainerTesting?: boolean;
  includeInfrastructureTesting?: boolean;
  maxConcurrent?: number;
  timeout?: number;
}
