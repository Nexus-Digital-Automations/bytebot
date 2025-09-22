/**
 * ===================================================================
 * PARLANT BYTEBOT MIDDLEWARE TESTING FRAMEWORK CONFIGURATION
 * Enterprise-Grade Testing Infrastructure for Zero-Defect Delivery
 * ===================================================================
 *
 * COMPREHENSIVE TESTING CONFIGURATION
 *
 * This configuration file establishes the enterprise-grade testing
 * infrastructure for PARLANT Bytebot middleware, providing comprehensive
 * validation across unit, integration, end-to-end, performance, security,
 * and compatibility testing domains.
 *
 * TESTING ARCHITECTURE:
 * - Multi-Layer Testing: Unit → Integration → E2E → Performance → Security
 * - Quality Gates: Automated validation checkpoints for CI/CD integration
 * - Performance Benchmarks: Enterprise-scale load and stress testing
 * - Security Validation: Comprehensive penetration testing and vulnerability scanning
 *
 * ENTERPRISE FEATURES:
 * - Zero-Defect Delivery: 95%+ code coverage with comprehensive test suites
 * - Performance Validation: <100ms response time, 1000+ concurrent user support
 * - Security Compliance: Automated security testing with zero critical vulnerabilities
 * - Backward Compatibility: 100% compatibility validation across all Bytebot versions
 *
 * @author Claude Code (Testing Framework Architect)
 * @version 1.0.0
 * @created 2025-09-22
 * @classification Enterprise Testing Infrastructure
 */

export interface TestingFrameworkConfig {
  // Global testing configuration
  global: {
    timeout: number;
    retries: number;
    parallelExecution: boolean;
    coverage: {
      enabled: boolean;
      threshold: number;
      reportFormats: string[];
    };
    reporting: {
      formats: string[];
      outputDir: string;
      realTimeUpdates: boolean;
    };
  };

  // Unit testing configuration
  unit: {
    framework: string;
    testMatch: string[];
    setupFiles: string[];
    coverageThreshold: number;
    mockStrategy: 'automatic' | 'manual' | 'hybrid';
    isolationLevel: 'strict' | 'relaxed';
  };

  // Integration testing configuration
  integration: {
    testEnvironment: string;
    databaseSetup: {
      enabled: boolean;
      resetBetweenTests: boolean;
      seedData: boolean;
    };
    networkTesting: {
      mockExternal: boolean;
      timeoutMs: number;
      retryAttempts: number;
    };
    crossComponentValidation: boolean;
  };

  // End-to-end testing configuration
  e2e: {
    browser: string;
    headless: boolean;
    viewport: {
      width: number;
      height: number;
    };
    scenarios: {
      userJourneys: string[];
      criticalPaths: string[];
      errorHandling: string[];
    };
    performance: {
      lighthouse: boolean;
      loadTimes: number;
      resourceLimits: object;
    };
  };

  // Performance testing configuration
  performance: {
    loadTesting: {
      maxConcurrentUsers: number;
      rampUpDuration: number;
      testDuration: number;
      targetResponseTime: number;
    };
    stressTesting: {
      enabled: boolean;
      breakingPointAnalysis: boolean;
      memoryLeakDetection: boolean;
    };
    benchmarking: {
      baseline: object;
      thresholds: object;
      regression: {
        enabled: boolean;
        tolerance: number;
      };
    };
  };

  // Security testing configuration
  security: {
    penetrationTesting: {
      enabled: boolean;
      automated: boolean;
      tools: string[];
    };
    vulnerabilityScanning: {
      enabled: boolean;
      frequency: string;
      reportCritical: boolean;
    };
    authenticationTesting: {
      scenarios: string[];
      bruteForceProtection: boolean;
      sessionManagement: boolean;
    };
    dataProtection: {
      encryptionValidation: boolean;
      dataLeakage: boolean;
      gdprCompliance: boolean;
    };
  };

  // Compatibility testing configuration
  compatibility: {
    backwardCompatibility: {
      versions: string[];
      apiCompatibility: boolean;
      configurationMigration: boolean;
    };
    forwardCompatibility: {
      enabled: boolean;
      previewVersions: string[];
    };
    crossPlatform: {
      operating_systems: string[];
      node_versions: string[];
      browsers: string[];
    };
  };

  // Quality gates configuration
  qualityGates: {
    enabled: boolean;
    gates: {
      coverage: {
        minimum: number;
        blocksDeployment: boolean;
      };
      performance: {
        responseTime: number;
        throughput: number;
        errorRate: number;
      };
      security: {
        vulnerabilities: {
          critical: number;
          high: number;
          medium: number;
        };
      };
      compatibility: {
        backwardCompatibility: boolean;
        apiBreakingChanges: boolean;
      };
    };
  };
}

export const testingFrameworkConfig: TestingFrameworkConfig = {
  global: {
    timeout: 30000,
    retries: 3,
    parallelExecution: true,
    coverage: {
      enabled: true,
      threshold: 95,
      reportFormats: ['html', 'lcov', 'json', 'text']
    },
    reporting: {
      formats: ['junit', 'html', 'json', 'console'],
      outputDir: './test-results',
      realTimeUpdates: true
    }
  },

  unit: {
    framework: 'jest',
    testMatch: [
      '**/__tests__/**/*.test.ts',
      '**/*.spec.ts'
    ],
    setupFiles: [
      './testing/utils/test-setup.ts',
      './testing/mocks/global-mocks.ts'
    ],
    coverageThreshold: 95,
    mockStrategy: 'hybrid',
    isolationLevel: 'strict'
  },

  integration: {
    testEnvironment: 'node',
    databaseSetup: {
      enabled: true,
      resetBetweenTests: true,
      seedData: true
    },
    networkTesting: {
      mockExternal: true,
      timeoutMs: 10000,
      retryAttempts: 3
    },
    crossComponentValidation: true
  },

  e2e: {
    browser: 'chromium',
    headless: true,
    viewport: {
      width: 1920,
      height: 1080
    },
    scenarios: {
      userJourneys: [
        'authentication-flow',
        'api-interaction',
        'error-handling',
        'performance-validation'
      ],
      criticalPaths: [
        'user-registration',
        'data-processing',
        'security-validation'
      ],
      errorHandling: [
        'network-failures',
        'timeout-scenarios',
        'invalid-data'
      ]
    },
    performance: {
      lighthouse: true,
      loadTimes: 3000,
      resourceLimits: {
        memory: '512MB',
        cpu: '2 cores'
      }
    }
  },

  performance: {
    loadTesting: {
      maxConcurrentUsers: 1000,
      rampUpDuration: 300, // 5 minutes
      testDuration: 1800, // 30 minutes
      targetResponseTime: 100 // milliseconds
    },
    stressTesting: {
      enabled: true,
      breakingPointAnalysis: true,
      memoryLeakDetection: true
    },
    benchmarking: {
      baseline: {
        responseTime: 50,
        throughput: 1000,
        memoryUsage: 256,
        cpuUsage: 50
      },
      thresholds: {
        responseTimeMax: 100,
        throughputMin: 800,
        memoryUsageMax: 512,
        cpuUsageMax: 80
      },
      regression: {
        enabled: true,
        tolerance: 0.1 // 10% performance regression tolerance
      }
    }
  },

  security: {
    penetrationTesting: {
      enabled: true,
      automated: true,
      tools: ['owasp-zap', 'burp-suite', 'nmap', 'sqlmap']
    },
    vulnerabilityScanning: {
      enabled: true,
      frequency: 'daily',
      reportCritical: true
    },
    authenticationTesting: {
      scenarios: [
        'valid-credentials',
        'invalid-credentials',
        'brute-force-protection',
        'session-hijacking',
        'jwt-validation'
      ],
      bruteForceProtection: true,
      sessionManagement: true
    },
    dataProtection: {
      encryptionValidation: true,
      dataLeakage: true,
      gdprCompliance: true
    }
  },

  compatibility: {
    backwardCompatibility: {
      versions: ['1.0.0', '1.1.0', '1.2.0', '2.0.0'],
      apiCompatibility: true,
      configurationMigration: true
    },
    forwardCompatibility: {
      enabled: true,
      previewVersions: ['3.0.0-beta', '3.0.0-rc']
    },
    crossPlatform: {
      operating_systems: ['ubuntu-20.04', 'ubuntu-22.04', 'windows-2019', 'macos-11'],
      node_versions: ['18.x', '20.x', '22.x'],
      browsers: ['chrome', 'firefox', 'safari', 'edge']
    }
  },

  qualityGates: {
    enabled: true,
    gates: {
      coverage: {
        minimum: 95,
        blocksDeployment: true
      },
      performance: {
        responseTime: 100,
        throughput: 1000,
        errorRate: 0.01 // 1% error rate maximum
      },
      security: {
        vulnerabilities: {
          critical: 0,
          high: 0,
          medium: 5
        }
      },
      compatibility: {
        backwardCompatibility: true,
        apiBreakingChanges: false
      }
    }
  }
};

export default testingFrameworkConfig;