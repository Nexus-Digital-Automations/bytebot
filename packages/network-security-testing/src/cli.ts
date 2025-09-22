#!/usr/bin/env node

/**
 * Network Security Testing Framework CLI
 * Command-line interface for comprehensive network security testing
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { NetworkSecurityTestingFramework } from './index';
import { Logger } from './utils/Logger';
import {
  NetworkSecurityConfig,
  ScanType,
  ScanTiming,
  SSLProtocol,
  IDSSensitivity,
  LogLevel
} from './types';

const program = new Command();
const logger = new Logger('CLI');

// CLI version and description
program
  .name('network-security-testing')
  .description('Comprehensive Network Security Testing Framework')
  .version('1.0.0');

/**
 * Scan command - Network scanning and discovery
 */
program
  .command('scan')
  .description('Perform network scanning and discovery')
  .option('-t, --target <target>', 'Target IP, hostname, or CIDR range', '192.168.1.0/24')
  .option('-p, --ports <ports>', 'Port range to scan', '1-1000')
  .option('--type <type>', 'Scan type (ping_sweep|port_scan|service_scan|vulnerability_scan|comprehensive)', 'comprehensive')
  .option('--timing <timing>', 'Scan timing (paranoid|sneaky|polite|normal|aggressive|insane)', 'normal')
  .option('--stealth', 'Enable stealth mode')
  .option('--version-detection', 'Enable version detection')
  .option('--os-detection', 'Enable OS detection')
  .option('--script-scan', 'Enable script scanning')
  .option('--timeout <timeout>', 'Timeout in seconds', '30')
  .option('--threads <threads>', 'Number of concurrent threads', '10')
  .option('-o, --output <file>', 'Output file for results')
  .action(async (options) => {
    console.log(chalk.blue('🔍 Starting Network Scan...'));

    try {
      const config = createDefaultConfig();
      const framework = new NetworkSecurityTestingFramework(config);

      await framework.initialize();

      const scanConfig = {
        target: options.target,
        scan_type: options.type as ScanType,
        port_range: options.ports,
        timing: options.timing as ScanTiming,
        stealth_mode: options.stealth || false,
        version_detection: options.versionDetection || false,
        os_detection: options.osDetection || false,
        script_scan: options.scriptScan || false,
        timeout: parseInt(options.timeout),
        concurrent_threads: parseInt(options.threads)
      };

      const scanner = framework.getComponents().scanner;
      const scanId = await scanner.startScan(scanConfig);
      const result = scanner.getScanResult(scanId);

      if (result) {
        console.log(chalk.green('✅ Scan completed successfully!'));
        console.log(chalk.white(`📊 Results: ${result.devices.length} devices found`));
        console.log(chalk.white(`⏱️  Duration: ${result.duration}ms`));

        if (options.output) {
          fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
          console.log(chalk.blue(`💾 Results saved to ${options.output}`));
        } else {
          displayScanResults(result);
        }
      }

      await framework.shutdown();

    } catch (error) {
      console.error(chalk.red('❌ Scan failed:'), error);
      process.exit(1);
    }
  });

/**
 * Firewall command - Firewall testing
 */
program
  .command('firewall')
  .description('Test firewall rules and security')
  .option('-t, --target <target>', 'Target firewall IP', '192.168.1.1')
  .option('--test-suites <suites>', 'Test suites to run (basic|security|performance|compliance)', 'basic,security')
  .option('--evasion', 'Enable evasion technique testing')
  .option('--performance', 'Enable performance testing')
  .option('--compliance', 'Enable compliance testing')
  .option('-o, --output <file>', 'Output file for results')
  .action(async (options) => {
    console.log(chalk.blue('🛡️  Starting Firewall Testing...'));

    try {
      const config = createDefaultConfig();
      const framework = new NetworkSecurityTestingFramework(config);

      await framework.initialize();

      const firewallTester = framework.getComponents().firewallTester;

      const testConfig = {
        target_firewall: options.target,
        test_suites: [],
        evasion_techniques: options.evasion ? [] : [],
        performance_testing: options.performance || false,
        compliance_testing: options.compliance || false,
        timeout: 30000,
        max_concurrent_tests: 5
      };

      const results = await firewallTester.runFirewallTests(testConfig);

      console.log(chalk.green('✅ Firewall testing completed!'));
      console.log(chalk.white(`📊 Results: ${results.length} tests executed`));

      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(results, null, 2));
        console.log(chalk.blue(`💾 Results saved to ${options.output}`));
      } else {
        displayFirewallResults(results);
      }

      await framework.shutdown();

    } catch (error) {
      console.error(chalk.red('❌ Firewall testing failed:'), error);
      process.exit(1);
    }
  });

/**
 * SSL command - SSL/TLS testing
 */
program
  .command('ssl')
  .description('Test SSL/TLS configuration and security')
  .option('-t, --target <target>', 'Target hostname', 'localhost')
  .option('-p, --port <port>', 'Target port', '443')
  .option('--protocols <protocols>', 'SSL/TLS protocols to test', 'TLSv1.2,TLSv1.3')
  .option('--vulnerabilities', 'Check for SSL/TLS vulnerabilities')
  .option('--certificate', 'Validate certificate chain')
  .option('-o, --output <file>', 'Output file for results')
  .action(async (options) => {
    console.log(chalk.blue('🔒 Starting SSL/TLS Testing...'));

    try {
      const config = createDefaultConfig();
      const framework = new NetworkSecurityTestingFramework(config);

      await framework.initialize();

      const sslTester = framework.getComponents().sslTester;

      const sslConfig = {
        target: options.target,
        port: parseInt(options.port),
        protocols: options.protocols.split(',').map((p: string) => p.trim() as SSLProtocol),
        ciphers: [],
        certificate_validation: options.certificate || false,
        vulnerability_checks: options.vulnerabilities || false,
        timeout: 10000
      };

      const result = await sslTester.testSSLConfiguration(sslConfig);

      console.log(chalk.green('✅ SSL/TLS testing completed!'));
      console.log(chalk.white(`📊 Grade: ${result.grade}`));
      console.log(chalk.white(`🔐 Protocols: ${result.supported_protocols.join(', ')}`));
      console.log(chalk.white(`⚠️  Vulnerabilities: ${result.vulnerabilities.length}`));

      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
        console.log(chalk.blue(`💾 Results saved to ${options.output}`));
      } else {
        displaySSLResults(result);
      }

      await framework.shutdown();

    } catch (error) {
      console.error(chalk.red('❌ SSL/TLS testing failed:'), error);
      process.exit(1);
    }
  });

/**
 * Monitor command - Security monitoring
 */
program
  .command('monitor')
  .description('Start security monitoring and alerting')
  .option('-d, --duration <duration>', 'Monitoring duration in seconds', '60')
  .option('--interval <interval>', 'Collection interval in seconds', '5')
  .option('--dashboard', 'Show real-time dashboard')
  .option('-o, --output <file>', 'Output file for metrics')
  .action(async (options) => {
    console.log(chalk.blue('📊 Starting Security Monitoring...'));

    try {
      const config = createDefaultConfig();
      config.monitoring.collection_interval = parseInt(options.interval) * 1000;

      const framework = new NetworkSecurityTestingFramework(config);
      await framework.initialize();

      const monitor = framework.getComponents().monitor;
      const duration = parseInt(options.duration) * 1000;

      console.log(chalk.green(`✅ Monitoring started for ${options.duration} seconds`));

      if (options.dashboard) {
        await showDashboard(monitor, duration);
      } else {
        await new Promise(resolve => setTimeout(resolve, duration));
      }

      const metrics = await monitor.getCurrentMetrics();
      const status = monitor.getSecurityStatus();

      console.log(chalk.green('✅ Monitoring completed!'));
      console.log(chalk.white(`🛡️  Security Status: ${status.overall_status}`));
      console.log(chalk.white(`⚠️  Threat Level: ${status.threat_level}`));
      console.log(chalk.white(`📊 Security Score: ${status.security_score}`));

      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify({ metrics, status }, null, 2));
        console.log(chalk.blue(`💾 Results saved to ${options.output}`));
      }

      await framework.shutdown();

    } catch (error) {
      console.error(chalk.red('❌ Monitoring failed:'), error);
      process.exit(1);
    }
  });

/**
 * Test command - Run test suite
 */
program
  .command('test')
  .description('Run comprehensive test suite')
  .option('--categories <categories>', 'Test categories to run', 'scanning,vulnerability,firewall,ssl,monitoring')
  .option('--priorities <priorities>', 'Test priorities to run', 'high,critical')
  .option('--verbose', 'Verbose output')
  .option('-o, --output <file>', 'Output file for test results')
  .action(async (options) => {
    console.log(chalk.blue('🧪 Starting Test Suite...'));

    try {
      const config = createDefaultConfig();
      const framework = new NetworkSecurityTestingFramework(config);

      const filters = {
        categories: options.categories ? options.categories.split(',').map((c: string) => c.trim()) : undefined,
        priorities: options.priorities ? options.priorities.split(',').map((p: string) => p.trim()) : undefined
      };

      const results = await framework.runTestSuite(filters);

      console.log(chalk.green('✅ Test suite completed!'));
      console.log(chalk.white(`📊 Tests: ${results.totalTests} total, ${results.passed} passed, ${results.failed} failed`));
      console.log(chalk.white(`📈 Coverage: ${results.coverage}%`));
      console.log(chalk.white(`⏱️  Duration: ${Math.round(results.duration / 1000)}s`));

      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(results, null, 2));
        console.log(chalk.blue(`💾 Results saved to ${options.output}`));
      }

      if (options.verbose) {
        displayTestResults(results);
      }

      if (results.failed > 0 || results.errors > 0) {
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('❌ Test suite failed:'), error);
      process.exit(1);
    }
  });

/**
 * Assessment command - Full security assessment
 */
program
  .command('assess')
  .description('Run comprehensive security assessment')
  .option('-t, --targets <targets>', 'Target IPs or hostnames (comma-separated)', '192.168.1.1')
  .option('--config <file>', 'Configuration file path')
  .option('-o, --output <file>', 'Output file for assessment report')
  .option('--format <format>', 'Output format (json|html|pdf)', 'json')
  .action(async (options) => {
    console.log(chalk.blue('🔍 Starting Comprehensive Security Assessment...'));

    try {
      let config = createDefaultConfig();

      if (options.config && fs.existsSync(options.config)) {
        const configFile = fs.readFileSync(options.config, 'utf8');
        config = JSON.parse(configFile);
      }

      const framework = new NetworkSecurityTestingFramework(config);
      await framework.initialize();

      const targets = options.targets.split(',').map((t: string) => t.trim());

      console.log(chalk.blue(`🎯 Assessing ${targets.length} target(s)...`));

      const assessment = await framework.runSecurityAssessment(targets);

      console.log(chalk.green('✅ Security assessment completed!'));
      console.log(chalk.white(`🎯 Targets: ${assessment.summary.totalTargets}`));
      console.log(chalk.white(`⚠️  Vulnerabilities: ${assessment.summary.vulnerabilitiesFound}`));
      console.log(chalk.white(`📊 Security Score: ${assessment.summary.securityScore}/100`));

      if (options.output) {
        if (options.format === 'json') {
          fs.writeFileSync(options.output, JSON.stringify(assessment, null, 2));
        } else {
          // For HTML/PDF, we would need additional formatting
          fs.writeFileSync(options.output, JSON.stringify(assessment, null, 2));
        }
        console.log(chalk.blue(`💾 Assessment report saved to ${options.output}`));
      } else {
        displayAssessmentResults(assessment);
      }

      await framework.shutdown();

    } catch (error) {
      console.error(chalk.red('❌ Security assessment failed:'), error);
      process.exit(1);
    }
  });

/**
 * Version command
 */
program
  .command('version')
  .description('Show version information')
  .action(() => {
    const packageJson = require('../package.json');
    console.log(chalk.blue(`Network Security Testing Framework v${packageJson.version}`));
    console.log(chalk.white('Comprehensive network security testing and validation'));
  });

// Display functions
function displayScanResults(result: any): void {
  console.log(chalk.yellow('\n📋 Scan Results:'));

  for (const device of result.devices) {
    console.log(chalk.white(`\n🖥️  Device: ${device.ip}`));
    if (device.hostname) console.log(chalk.gray(`   Hostname: ${device.hostname}`));
    if (device.os) console.log(chalk.gray(`   OS: ${device.os}`));

    if (device.ports.length > 0) {
      console.log(chalk.gray('   Open Ports:'));
      for (const port of device.ports.filter((p: any) => p.state === 'open')) {
        console.log(chalk.gray(`     ${port.number}/${port.protocol} (${port.service || 'unknown'})`));
      }
    }

    if (device.vulnerabilities.length > 0) {
      console.log(chalk.red(`   ⚠️  Vulnerabilities: ${device.vulnerabilities.length}`));
    }

    console.log(chalk.green(`   🛡️  Security Score: ${device.security_score}/100`));
  }
}

function displayFirewallResults(results: any[]): void {
  console.log(chalk.yellow('\n🛡️  Firewall Test Results:'));

  for (const result of results) {
    const status = result.passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
    console.log(`${status} ${result.test_case.name}`);
    if (!result.passed && result.error) {
      console.log(chalk.gray(`     Error: ${result.error}`));
    }
    console.log(chalk.gray(`     Response Time: ${result.response_time}ms`));
  }
}

function displaySSLResults(result: any): void {
  console.log(chalk.yellow('\n🔒 SSL/TLS Test Results:'));

  console.log(chalk.white(`Target: ${result.target}`));
  console.log(chalk.white(`Grade: ${getGradeColor(result.grade)}${result.grade}${chalk.white('')}`));

  console.log(chalk.white('\nSupported Protocols:'));
  for (const protocol of result.supported_protocols) {
    console.log(chalk.gray(`  • ${protocol}`));
  }

  if (result.vulnerabilities.length > 0) {
    console.log(chalk.red('\n⚠️  Vulnerabilities:'));
    for (const vuln of result.vulnerabilities) {
      console.log(chalk.red(`  • ${vuln.name} (${vuln.severity})`));
    }
  }

  if (result.warnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  Warnings:'));
    for (const warning of result.warnings) {
      console.log(chalk.yellow(`  • ${warning}`));
    }
  }
}

function displayTestResults(results: any): void {
  console.log(chalk.yellow('\n🧪 Test Results:'));

  for (const result of results.results) {
    let status;
    switch (result.status) {
      case 'passed':
        status = chalk.green('✅ PASS');
        break;
      case 'failed':
        status = chalk.red('❌ FAIL');
        break;
      case 'skipped':
        status = chalk.yellow('⏭️  SKIP');
        break;
      case 'error':
        status = chalk.red('💥 ERROR');
        break;
    }

    console.log(`${status} ${result.name} (${result.duration}ms)`);

    if (result.message) {
      console.log(chalk.gray(`     ${result.message}`));
    }

    if (result.error) {
      console.log(chalk.red(`     Error: ${result.error.message}`));
    }
  }
}

function displayAssessmentResults(assessment: any): void {
  console.log(chalk.yellow('\n🔍 Security Assessment Results:'));

  console.log(chalk.white(`\n📊 Summary:`));
  console.log(chalk.white(`   Targets Assessed: ${assessment.summary.totalTargets}`));
  console.log(chalk.white(`   Vulnerabilities Found: ${assessment.summary.vulnerabilitiesFound}`));
  console.log(chalk.white(`   Security Score: ${getScoreColor(assessment.summary.securityScore)}${assessment.summary.securityScore}/100${chalk.white('')}`));

  if (assessment.summary.recommendations.length > 0) {
    console.log(chalk.yellow('\n💡 Recommendations:'));
    for (const rec of assessment.summary.recommendations) {
      console.log(chalk.yellow(`   • ${rec}`));
    }
  }
}

async function showDashboard(monitor: any, duration: number): Promise<void> {
  const startTime = Date.now();

  console.log(chalk.blue('\n📊 Real-time Security Dashboard'));
  console.log(chalk.gray('Press Ctrl+C to stop monitoring\n'));

  const interval = setInterval(async () => {
    const status = monitor.getSecurityStatus();
    const metrics = await monitor.getCurrentMetrics();

    // Clear screen and show dashboard
    console.clear();
    console.log(chalk.blue('📊 Security Monitoring Dashboard'));
    console.log(chalk.gray('=' .repeat(50)));

    console.log(chalk.white(`🛡️  Security Status: ${getStatusColor(status.overall_status)}${status.overall_status}${chalk.white('')}`));
    console.log(chalk.white(`⚠️  Threat Level: ${getThreatColor(status.threat_level)}${status.threat_level}${chalk.white('')}`));
    console.log(chalk.white(`📊 Security Score: ${getScoreColor(status.security_score)}${status.security_score}/100${chalk.white('')}`));
    console.log(chalk.white(`🚨 Active Alerts: ${status.active_alerts}`));

    console.log(chalk.white('\n📈 Network Metrics:'));
    console.log(chalk.gray(`   Bandwidth: ${metrics.bandwidth_utilization.total_mbps.toFixed(2)} Mbps`));
    console.log(chalk.gray(`   Connections: ${metrics.connection_stats.active_connections}`));
    console.log(chalk.gray(`   Latency: ${metrics.performance_stats.latency_ms.toFixed(2)}ms`));

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, duration - elapsed);
    console.log(chalk.gray(`\nTime remaining: ${Math.round(remaining / 1000)}s`));

    if (remaining <= 0) {
      clearInterval(interval);
    }
  }, 2000);

  setTimeout(() => {
    clearInterval(interval);
  }, duration);

  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
}

// Utility functions
function createDefaultConfig(): NetworkSecurityConfig {
  return {
    scanning: {
      target: '192.168.1.0/24',
      scan_type: ScanType.COMPREHENSIVE,
      timing: ScanTiming.NORMAL,
      stealth_mode: false,
      version_detection: true,
      os_detection: true,
      script_scan: true,
      timeout: 30,
      concurrent_threads: 10
    },
    firewall_testing: {
      test_interval: 300,
      test_suites: ['basic', 'security'],
      performance_thresholds: {
        max_response_time: 1000,
        max_packet_loss: 5,
        min_throughput: 100,
        max_latency: 100
      },
      evasion_techniques: []
    },
    ssl_testing: {
      target: 'localhost',
      port: 443,
      protocols: [SSLProtocol.TLSV1_2, SSLProtocol.TLSV1_3],
      ciphers: [],
      certificate_validation: true,
      vulnerability_checks: true,
      timeout: 10000
    },
    intrusion_detection: {
      rules: [],
      sensitivity: IDSSensitivity.MEDIUM,
      learning_mode: true,
      whitelist: [],
      blacklist: [],
      log_level: LogLevel.INFO
    },
    monitoring: {
      collection_interval: 5000,
      retention_period: 86400000,
      metrics_to_collect: ['bandwidth', 'connections', 'security', 'performance'],
      baseline_learning_period: 300000,
      anomaly_threshold: 0.8
    },
    alerting: {
      channels: [],
      escalation_rules: [],
      notification_throttling: {
        max_alerts_per_hour: 100,
        duplicate_suppression_window: 300,
        burst_threshold: 10
      }
    },
    reporting: {
      schedule: '0 0 * * *',
      recipients: [],
      format: 'json',
      include_charts: true,
      include_recommendations: true
    }
  };
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return chalk.green('');
    case 'A-':
    case 'B':
      return chalk.yellow('');
    case 'C':
    case 'D':
      return chalk.orange('');
    default:
      return chalk.red('');
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return chalk.green('');
  if (score >= 60) return chalk.yellow('');
  return chalk.red('');
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'secure':
      return chalk.green('');
    case 'warning':
      return chalk.yellow('');
    case 'critical':
      return chalk.red('');
    default:
      return chalk.white('');
  }
}

function getThreatColor(level: string): string {
  switch (level) {
    case 'low':
      return chalk.green('');
    case 'medium':
      return chalk.yellow('');
    case 'high':
      return chalk.orange('');
    case 'critical':
      return chalk.red('');
    default:
      return chalk.white('');
  }
}

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}