/**
 * Network Security Testing Framework - Main Entry Point
 * Comprehensive network security testing and validation framework
 */

// Core Components
export { NetworkScanner } from './scanners/NetworkScanner';
export { VulnerabilityScanner } from './scanners/VulnerabilityScanner';
export { FirewallTester } from './firewall/FirewallTester';
export { IntrusionDetectionSystem } from './ids/IntrusionDetectionSystem';
export { SSLTester } from './ssl/SSLTester';
export { SecurityMonitor } from './monitoring/SecurityMonitor';

// Test Suite
export { SecurityTestSuite } from './tests/SecurityTestSuite';

// Utilities
export { Logger } from './utils/Logger';

// Types
export * from './types';

// Main Framework Class
import { NetworkScanner } from './scanners/NetworkScanner';
import { VulnerabilityScanner } from './scanners/VulnerabilityScanner';
import { FirewallTester } from './firewall/FirewallTester';
import { IntrusionDetectionSystem } from './ids/IntrusionDetectionSystem';
import { SSLTester } from './ssl/SSLTester';
import { SecurityMonitor } from './monitoring/SecurityMonitor';
import { SecurityTestSuite } from './tests/SecurityTestSuite';
import { Logger } from './utils/Logger';
import {
  NetworkSecurityConfig,
  ScanConfiguration,
  FirewallTestingConfig,
  SSLTestConfiguration,
  IDSConfiguration,
  MonitoringConfig,
  AlertingConfig,
  BaseResponse
} from './types';

/**
 * Main Network Security Testing Framework
 * Orchestrates all security testing components
 */
export class NetworkSecurityTestingFramework {
  private readonly logger: Logger;
  private components: {
    scanner: NetworkScanner;
    vulnerabilityScanner: VulnerabilityScanner;
    firewallTester: FirewallTester;
    ids: IntrusionDetectionSystem;
    sslTester: SSLTester;
    monitor: SecurityMonitor;
    testSuite: SecurityTestSuite;
  };

  private config: NetworkSecurityConfig;
  private isInitialized: boolean = false;

  constructor(config: NetworkSecurityConfig) {
    this.logger = new Logger('NetworkSecurityFramework');
    this.config = config;

    // Initialize components
    this.components = {
      scanner: new NetworkScanner(),
      vulnerabilityScanner: new VulnerabilityScanner(),
      firewallTester: new FirewallTester(),
      ids: new IntrusionDetectionSystem(config.intrusion_detection),
      sslTester: new SSLTester(),
      monitor: new SecurityMonitor(config.monitoring, config.alerting),
      testSuite: new SecurityTestSuite({
        target_network: '192.168.1.0/24',
        target_host: '192.168.1.1',
        target_ports: [80, 443, 22, 21, 23],
        firewall_host: '192.168.1.1',
        test_data_path: './test-data',
        cleanup_after_tests: true
      })
    };
  }

  /**
   * Initialize the framework
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing Network Security Testing Framework');

    try {
      if (this.isInitialized) {
        throw new Error('Framework is already initialized');
      }

      // Start monitoring
      await this.components.monitor.startMonitoring();

      // Start IDS
      await this.components.ids.start();

      this.isInitialized = true;

      this.logger.info('Network Security Testing Framework initialized successfully');

    } catch (error) {
      this.logger.error('Framework initialization failed', { error });
      throw error;
    }
  }

  /**
   * Shutdown the framework
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Network Security Testing Framework');

    try {
      if (!this.isInitialized) {
        return;
      }

      // Stop monitoring
      await this.components.monitor.stopMonitoring();

      // Stop IDS
      await this.components.ids.stop();

      this.isInitialized = false;

      this.logger.info('Network Security Testing Framework shutdown completed');

    } catch (error) {
      this.logger.error('Framework shutdown failed', { error });
      throw error;
    }
  }

  /**
   * Run comprehensive security assessment
   */
  public async runSecurityAssessment(targets: string[]): Promise<{
    scanResults: any[];
    vulnerabilities: any[];
    firewallResults: any[];
    sslResults: any[];
    summary: {
      totalTargets: number;
      vulnerabilitiesFound: number;
      securityScore: number;
      recommendations: string[];
    };
  }> {
    this.logger.info('Starting comprehensive security assessment', { targets });

    try {
      if (!this.isInitialized) {
        throw new Error('Framework must be initialized before running assessments');
      }

      const scanResults: any[] = [];
      const vulnerabilities: any[] = [];
      const firewallResults: any[] = [];
      const sslResults: any[] = [];

      for (const target of targets) {
        this.logger.info('Assessing target', { target });

        // Network scanning
        const scanId = await this.components.scanner.startScan({
          target,
          scan_type: this.config.scanning.scan_type,
          timing: this.config.scanning.timing,
          stealth_mode: this.config.scanning.stealth_mode,
          version_detection: this.config.scanning.version_detection,
          os_detection: this.config.scanning.os_detection,
          script_scan: this.config.scanning.script_scan,
          timeout: this.config.scanning.timeout,
          concurrent_threads: this.config.scanning.concurrent_threads
        });

        const scanResult = this.components.scanner.getScanResult(scanId);
        if (scanResult) {
          scanResults.push(scanResult);

          // Vulnerability scanning for discovered devices
          for (const device of scanResult.devices) {
            const deviceVulns = await this.components.vulnerabilityScanner.scanDevice(device);
            vulnerabilities.push(...deviceVulns);
          }
        }

        // SSL/TLS testing (if applicable)
        try {
          const sslResult = await this.components.sslTester.testSSLConfiguration({
            target,
            port: 443,
            protocols: this.config.ssl_testing.protocols,
            ciphers: this.config.ssl_testing.ciphers,
            certificate_validation: this.config.ssl_testing.certificate_validation,
            vulnerability_checks: this.config.ssl_testing.vulnerability_checks,
            timeout: this.config.ssl_testing.timeout
          });
          sslResults.push(sslResult);
        } catch (error) {
          this.logger.debug('SSL testing skipped for target', { target, error });
        }

        // Firewall testing (if configured)
        if (this.config.firewall_testing) {
          try {
            const fwResults = await this.components.firewallTester.runFirewallTests({
              target_firewall: target,
              test_suites: [],
              evasion_techniques: [],
              performance_testing: this.config.firewall_testing.performance_thresholds !== undefined,
              compliance_testing: false,
              timeout: 30000,
              max_concurrent_tests: 5
            });
            firewallResults.push(...fwResults);
          } catch (error) {
            this.logger.debug('Firewall testing failed for target', { target, error });
          }
        }
      }

      // Generate summary
      const summary = this.generateAssessmentSummary(
        targets,
        vulnerabilities,
        scanResults,
        sslResults
      );

      this.logger.info('Security assessment completed', {
        totalTargets: targets.length,
        vulnerabilitiesFound: vulnerabilities.length,
        securityScore: summary.securityScore
      });

      return {
        scanResults,
        vulnerabilities,
        firewallResults,
        sslResults,
        summary
      };

    } catch (error) {
      this.logger.error('Security assessment failed', { error });
      throw error;
    }
  }

  /**
   * Run framework test suite
   */
  public async runTestSuite(filters?: {
    categories?: string[];
    priorities?: string[];
    testIds?: string[];
  }): Promise<any> {
    this.logger.info('Running framework test suite', { filters });

    try {
      const results = await this.components.testSuite.runTestSuite(filters);

      this.logger.info('Test suite completed', {
        totalTests: results.totalTests,
        passed: results.passed,
        failed: results.failed,
        coverage: results.coverage
      });

      return results;

    } catch (error) {
      this.logger.error('Test suite execution failed', { error });
      throw error;
    }
  }

  /**
   * Get real-time security metrics
   */
  public async getSecurityMetrics(): Promise<any> {
    try {
      if (!this.isInitialized) {
        throw new Error('Framework must be initialized to get metrics');
      }

      const metrics = await this.components.monitor.getCurrentMetrics();
      const status = this.components.monitor.getSecurityStatus();
      const idsStats = this.components.ids.getStatistics();

      return {
        network_metrics: metrics,
        security_status: status,
        ids_statistics: idsStats,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to get security metrics', { error });
      throw error;
    }
  }

  /**
   * Get framework status
   */
  public getFrameworkStatus(): {
    initialized: boolean;
    components: Record<string, boolean>;
    configuration: NetworkSecurityConfig;
  } {
    return {
      initialized: this.isInitialized,
      components: {
        scanner: true,
        vulnerabilityScanner: true,
        firewallTester: true,
        ids: this.components.ids ? true : false,
        sslTester: true,
        monitor: this.components.monitor ? true : false,
        testSuite: true
      },
      configuration: this.config
    };
  }

  /**
   * Update framework configuration
   */
  public async updateConfiguration(newConfig: Partial<NetworkSecurityConfig>): Promise<void> {
    this.logger.info('Updating framework configuration');

    try {
      this.config = { ...this.config, ...newConfig };

      // Update component configurations
      if (newConfig.intrusion_detection) {
        this.components.ids.updateConfiguration(newConfig.intrusion_detection);
      }

      if (newConfig.monitoring || newConfig.alerting) {
        // Monitor configuration update would require restart
        this.logger.warn('Monitor configuration update requires framework restart');
      }

      this.logger.info('Framework configuration updated successfully');

    } catch (error) {
      this.logger.error('Failed to update framework configuration', { error });
      throw error;
    }
  }

  /**
   * Get individual component instances
   */
  public getComponents(): {
    scanner: NetworkScanner;
    vulnerabilityScanner: VulnerabilityScanner;
    firewallTester: FirewallTester;
    ids: IntrusionDetectionSystem;
    sslTester: SSLTester;
    monitor: SecurityMonitor;
    testSuite: SecurityTestSuite;
  } {
    return this.components;
  }

  /**
   * Generate assessment summary
   */
  private generateAssessmentSummary(
    targets: string[],
    vulnerabilities: any[],
    scanResults: any[],
    sslResults: any[]
  ): {
    totalTargets: number;
    vulnerabilitiesFound: number;
    securityScore: number;
    recommendations: string[];
  } {
    const totalTargets = targets.length;
    const vulnerabilitiesFound = vulnerabilities.length;

    // Calculate security score (100 = perfect, 0 = terrible)
    let securityScore = 100;

    // Deduct for vulnerabilities
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulns = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumVulns = vulnerabilities.filter(v => v.severity === 'medium').length;

    securityScore -= (criticalVulns * 25) + (highVulns * 15) + (mediumVulns * 5);

    // Deduct for SSL issues
    const sslIssues = sslResults.filter(r => r.grade === 'F' || r.grade === 'E').length;
    securityScore -= sslIssues * 10;

    securityScore = Math.max(0, securityScore);

    // Generate recommendations
    const recommendations: string[] = [];

    if (criticalVulns > 0) {
      recommendations.push(`Address ${criticalVulns} critical vulnerabilities immediately`);
    }

    if (highVulns > 0) {
      recommendations.push(`Remediate ${highVulns} high-severity vulnerabilities`);
    }

    if (sslIssues > 0) {
      recommendations.push('Improve SSL/TLS configuration and update certificates');
    }

    if (securityScore < 70) {
      recommendations.push('Implement comprehensive security monitoring and incident response');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current security posture with regular assessments');
    }

    return {
      totalTargets,
      vulnerabilitiesFound,
      securityScore,
      recommendations
    };
  }
}

// Default export
export default NetworkSecurityTestingFramework;