#!/usr/bin/env node
/**
 * @fileoverview CLI for Application Security Testing Framework
 * @description Command-line interface for SAST, DAST, IAST, and OWASP Top 10 testing
 * @version 1.0.0
 * @author ByteBot Security Team
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import ByteBotApplicationSecurityTesting from './index';
import { SecurityTestConfig } from './config/SecurityTestConfig';
import { SecurityLogger } from './utils/SecurityLogger';
import { SecurityReporter } from './reports/SecurityReporter';

const program = new Command();
const logger = new SecurityLogger('SecurityTestingCLI');

// Package information
program
  .name('ast-scan')
  .description('ByteBot Application Security Testing Framework - Comprehensive SAST, DAST, IAST, and OWASP Top 10 testing')
  .version('1.0.0');

// Global options
program
  .option('-c, --config <file>', 'Configuration file path', './security-config.json')
  .option('-o, --output <directory>', 'Output directory for reports', './security-reports')
  .option('-f, --format <format>', 'Report format (json|html|pdf|xml)', 'json')
  .option('-v, --verbose', 'Verbose output', false)
  .option('--timeout <ms>', 'Test timeout in milliseconds', '600000')
  .option('--parallel', 'Enable parallel execution', false)
  .option('--max-concurrent <number>', 'Maximum concurrent tests', '5');

// SAST command
program
  .command('sast')
  .description('Run Static Application Security Testing (SAST)')
  .argument('<codebase-path>', 'Path to the codebase to scan')
  .option('--include-tests', 'Include test files in scan', false)
  .option('--include-deps', 'Include dependency scanning', true)
  .option('--max-file-size <bytes>', 'Maximum file size to scan', '10485760')
  .option('--languages <langs>', 'Comma-separated list of languages to scan')
  .option('--rules <file>', 'Custom security rules file')
  .option('--exclude <patterns>', 'Comma-separated exclude patterns')
  .option('--deep-analysis', 'Enable deep code analysis', false)
  .option('--performance-mode', 'Enable performance optimizations', false)
  .action(async (codebasePath, options) => {
    try {
      console.log(chalk.blue('\n🔍 Starting SAST (Static Application Security Testing)...\n'));
      
      const config = await loadConfig(program.opts().config);
      const securityFramework = ByteBotApplicationSecurityTesting.getInstance();
      
      await securityFramework.initialize(config);
      
      const sastOptions = {
        includeTests: options.includeTests,
        includeDependencies: options.includeDeps,
        maxFileSize: parseInt(options.maxFileSize),
        timeout: parseInt(program.opts().timeout),
        parallel: program.opts().parallel,
        maxParallelJobs: parseInt(program.opts().maxConcurrent),
        deepAnalysis: options.deepAnalysis,
        performanceMode: options.performanceMode,
        excludePatterns: options.exclude ? options.exclude.split(',') : [],
        customRules: options.rules ? await loadCustomRules(options.rules) : []
      };
      
      const result = await securityFramework.runSASTScan(codebasePath, sastOptions);
      
      await generateReport(result, 'sast', program.opts());
      
      printSummary(result, 'SAST');
      
      process.exit(result.vulnerabilities.length > 0 ? 1 : 0);
      
    } catch (error) {
      console.error(chalk.red('❌ SAST scan failed:'), error);
      process.exit(1);
    }
  });

// DAST command
program
  .command('dast')
  .description('Run Dynamic Application Security Testing (DAST)')
  .argument('<target-url>', 'Target application URL to scan')
  .option('--max-depth <number>', 'Maximum crawl depth', '5')
  .option('--max-requests <number>', 'Maximum number of requests', '1000')
  .option('--user-agent <agent>', 'Custom user agent string')
  .option('--auth-type <type>', 'Authentication type (basic|form|oauth|jwt)')
  .option('--auth-credentials <creds>', 'Authentication credentials (JSON)')
  .option('--include-apis', 'Include API endpoint testing', true)
  .option('--include-business-logic', 'Include business logic testing', true)
  .option('--crawl-delay <ms>', 'Delay between requests in milliseconds', '100')
  .option('--scope <patterns>', 'Comma-separated scope patterns')
  .option('--exclude-paths <paths>', 'Comma-separated paths to exclude')
  .action(async (targetUrl, options) => {
    try {
      console.log(chalk.blue('\n🌐 Starting DAST (Dynamic Application Security Testing)...\n'));
      
      const config = await loadConfig(program.opts().config);
      const securityFramework = ByteBotApplicationSecurityTesting.getInstance();
      
      await securityFramework.initialize(config);
      
      const dastOptions = {
        maxDepth: parseInt(options.maxDepth),
        maxRequests: parseInt(options.maxRequests),
        timeout: parseInt(program.opts().timeout),
        testAPIs: options.includeApis,
        testBusinessLogic: options.includeBusinessLogic,
        delay: parseInt(options.crawlDelay),
        userAgent: options.userAgent,
        scope: options.scope ? options.scope.split(',') : ['same-origin'],
        excludePaths: options.excludePaths ? options.excludePaths.split(',') : [],
        authentication: options.authType ? {
          type: options.authType,
          credentials: options.authCredentials ? JSON.parse(options.authCredentials) : {}
        } : null
      };
      
      const result = await securityFramework.runDASTScan(targetUrl, dastOptions);
      
      await generateReport(result, 'dast', program.opts());
      
      printSummary(result, 'DAST');
      
      process.exit(result.vulnerabilities.length > 0 ? 1 : 0);
      
    } catch (error) {
      console.error(chalk.red('❌ DAST scan failed:'), error);
      process.exit(1);
    }
  });

// IAST command
program
  .command('iast')
  .description('Run Interactive Application Security Testing (IAST)')
  .argument('<app-endpoint>', 'Application endpoint for runtime monitoring')
  .option('--monitoring-depth <depth>', 'Monitoring depth (shallow|medium|deep)', 'medium')
  .option('--instrumentation <level>', 'Instrumentation level (passive|active|aggressive)', 'active')
  .option('--performance-threshold <percent>', 'Max performance impact threshold', '10')
  .option('--data-flow-tracking', 'Enable data flow tracking', true)
  .option('--real-time-monitoring', 'Enable real-time monitoring', true)
  .option('--feedback-enabled', 'Enable security feedback loop', true)
  .option('--event-buffer-size <size>', 'Runtime event buffer size', '10000')
  .option('--analysis-interval <ms>', 'Analysis interval in milliseconds', '5000')
  .action(async (appEndpoint, options) => {
    try {
      console.log(chalk.blue('\n⚡ Starting IAST (Interactive Application Security Testing)...\n'));
      
      const config = await loadConfig(program.opts().config);
      const securityFramework = ByteBotApplicationSecurityTesting.getInstance();
      
      await securityFramework.initialize(config);
      
      const iastOptions = {
        timeout: parseInt(program.opts().timeout),
        monitoringDepth: options.monitoringDepth,
        instrumentationLevel: options.instrumentation,
        performanceImpactThreshold: parseInt(options.performanceThreshold),
        dataFlowTracking: options.dataFlowTracking,
        realTimeMonitoring: options.realTimeMonitoring,
        feedbackEnabled: options.feedbackEnabled,
        eventBufferSize: parseInt(options.eventBufferSize),
        analysisInterval: parseInt(options.analysisInterval)
      };
      
      const result = await securityFramework.runIASTScan(appEndpoint, iastOptions);
      
      await generateReport(result, 'iast', program.opts());
      
      printSummary(result, 'IAST');
      
      process.exit(result.vulnerabilities.length > 0 ? 1 : 0);
      
    } catch (error) {
      console.error(chalk.red('❌ IAST scan failed:'), error);
      process.exit(1);
    }
  });

// OWASP Top 10 command
program
  .command('owasp')
  .description('Run OWASP Top 10 security testing')
  .argument('<target>', 'Target application or codebase to test')
  .option('--categories <categories>', 'Comma-separated OWASP categories to test')
  .option('--thoroughness <level>', 'Test thoroughness (basic|standard|comprehensive)', 'standard')
  .option('--skip-low-severity', 'Skip low severity vulnerabilities', false)
  .option('--include-experimental', 'Include experimental tests', false)
  .option('--test-depth <depth>', 'Test depth (shallow|medium|deep)', 'medium')
  .option('--custom-payloads <file>', 'File containing custom test payloads')
  .action(async (target, options) => {
    try {
      console.log(chalk.blue('\n🛡️  Starting OWASP Top 10 Security Testing...\n'));
      
      const config = await loadConfig(program.opts().config);
      const securityFramework = ByteBotApplicationSecurityTesting.getInstance();
      
      await securityFramework.initialize(config);
      
      const owaspOptions = {
        timeout: parseInt(program.opts().timeout),
        enabledCategories: options.categories ? options.categories.split(',') : undefined,
        thoroughness: options.thoroughness,
        parallelExecution: program.opts().parallel,
        maxParallelTests: parseInt(program.opts().maxConcurrent),
        skipLowSeverity: options.skipLowSeverity,
        includeExperimental: options.includeExperimental,
        testDepth: options.testDepth,
        customPayloads: options.customPayloads ? await loadCustomPayloads(options.customPayloads) : []
      };
      
      const result = await securityFramework.runOWASPTop10Test(target, owaspOptions);
      
      await generateReport(result, 'owasp', program.opts());
      
      printSummary(result, 'OWASP Top 10');
      
      process.exit(result.vulnerabilities.length > 0 ? 1 : 0);
      
    } catch (error) {
      console.error(chalk.red('❌ OWASP Top 10 test failed:'), error);
      process.exit(1);
    }
  });

// Comprehensive scan command
program
  .command('scan')
  .description('Run comprehensive security testing (SAST + DAST + IAST + OWASP)')
  .argument('<target>', 'Target application or codebase')
  .option('--sast-path <path>', 'Path for SAST scan (if different from target)')
  .option('--dast-url <url>', 'URL for DAST scan (if different from target)')
  .option('--iast-endpoint <endpoint>', 'Endpoint for IAST scan (if different from target)')
  .option('--skip-sast', 'Skip SAST scanning', false)
  .option('--skip-dast', 'Skip DAST scanning', false)
  .option('--skip-iast', 'Skip IAST scanning', false)
  .option('--skip-owasp', 'Skip OWASP Top 10 testing', false)
  .option('--sequential', 'Run tests sequentially instead of parallel', false)
  .action(async (target, options) => {
    try {
      console.log(chalk.blue('\n🔒 Starting Comprehensive Security Testing...\n'));
      
      const config = await loadConfig(program.opts().config);
      const securityFramework = ByteBotApplicationSecurityTesting.getInstance();
      
      await securityFramework.initialize(config);
      
      const comprehensiveOptions = {
        timeout: parseInt(program.opts().timeout),
        parallel: !options.sequential,
        maxConcurrency: parseInt(program.opts().maxConcurrent),
        skipSAST: options.skipSast,
        skipDAST: options.skipDast,
        skipIAST: options.skipIast,
        skipOWASP: options.skipOwasp,
        sastPath: options.sastPath || target,
        dastUrl: options.dastUrl || target,
        iastEndpoint: options.iastEndpoint || target
      };
      
      const result = await securityFramework.runComprehensiveSecurityTest(target, comprehensiveOptions);
      
      await generateReport(result, 'comprehensive', program.opts());
      
      printComprehensiveSummary(result);
      
      const hasVulnerabilities = result.results?.some((r: any) => r.vulnerabilities?.length > 0);
      process.exit(hasVulnerabilities ? 1 : 0);
      
    } catch (error) {
      console.error(chalk.red('❌ Comprehensive security test failed:'), error);
      process.exit(1);
    }
  });

// Report command
program
  .command('report')
  .description('Generate security reports from previous test results')
  .option('--input <file>', 'Input test results file')
  .option('--template <file>', 'Report template file')
  .option('--merge <files>', 'Comma-separated files to merge into report')
  .action(async (options) => {
    try {
      console.log(chalk.blue('\n📊 Generating Security Report...\n'));
      
      const reporter = new SecurityReporter();
      
      if (options.merge) {
        const files = options.merge.split(',');
        const results = await Promise.all(files.map(file => loadTestResults(file)));
        const mergedResults = reporter.mergeResults(results);
        await generateReport(mergedResults, 'merged', program.opts());
      } else if (options.input) {
        const results = await loadTestResults(options.input);
        await generateReport(results, 'custom', program.opts());
      } else {
        console.error(chalk.red('❌ Either --input or --merge option is required'));
        process.exit(1);
      }
      
      console.log(chalk.green('✅ Report generated successfully'));
      
    } catch (error) {
      console.error(chalk.red('❌ Report generation failed:'), error);
      process.exit(1);
    }
  });

// Dashboard command
program
  .command('dashboard')
  .description('Launch security testing dashboard')
  .option('--port <port>', 'Dashboard port', '8080')
  .option('--host <host>', 'Dashboard host', 'localhost')
  .option('--auth', 'Enable authentication', false)
  .action(async (options) => {
    try {
      console.log(chalk.blue('\n📈 Launching Security Testing Dashboard...\n'));
      
      const { SecurityDashboard } = await import('./reports/SecurityDashboard');
      const dashboard = new SecurityDashboard();
      
      await dashboard.start({
        port: parseInt(options.port),
        host: options.host,
        auth: options.auth
      });
      
      console.log(chalk.green(`✅ Dashboard running at http://${options.host}:${options.port}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Dashboard launch failed:'), error);
      process.exit(1);
    }
  });

// Helper functions

async function loadConfig(configPath: string): Promise<SecurityTestConfig> {
  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    logger.warn(`Config file not found: ${configPath}, using defaults`);
    return new SecurityTestConfig();
  }
}

async function loadCustomRules(rulesPath: string): Promise<any[]> {
  try {
    const rulesContent = await fs.readFile(rulesPath, 'utf-8');
    return JSON.parse(rulesContent);
  } catch (error) {
    logger.warn(`Custom rules file not found: ${rulesPath}`);
    return [];
  }
}

async function loadCustomPayloads(payloadsPath: string): Promise<string[]> {
  try {
    const payloadsContent = await fs.readFile(payloadsPath, 'utf-8');
    return payloadsContent.split('\n').filter(line => line.trim());
  } catch (error) {
    logger.warn(`Custom payloads file not found: ${payloadsPath}`);
    return [];
  }
}

async function loadTestResults(filePath: string): Promise<any> {
  try {
    const resultsContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(resultsContent);
  } catch (error) {
    throw new Error(`Failed to load test results from: ${filePath}`);
  }
}

async function generateReport(result: any, testType: string, options: any): Promise<void> {
  try {
    const reporter = new SecurityReporter();
    const outputDir = options.output;
    const format = options.format;
    
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    const reportPath = path.join(outputDir, `security-report-${testType}-${Date.now()}.${format}`);
    
    switch (format) {
      case 'json':
        await reporter.generateJSONReport(result, reportPath);
        break;
      case 'html':
        await reporter.generateHTMLReport(result, reportPath);
        break;
      case 'pdf':
        await reporter.generatePDFReport(result, reportPath);
        break;
      case 'xml':
        await reporter.generateXMLReport(result, reportPath);
        break;
      default:
        await reporter.generateJSONReport(result, reportPath);
    }
    
    console.log(chalk.green(`📄 Report saved to: ${reportPath}`));
    
  } catch (error) {
    logger.error('Failed to generate report', error);
  }
}

function printSummary(result: any, testType: string): void {
  console.log(chalk.yellow(`\n📋 ${testType} Test Summary:`));
  console.log(chalk.yellow('═'.repeat(50)));
  
  const vulnCount = result.vulnerabilities?.length || 0;
  const duration = result.metrics?.scanDuration || 0;
  
  console.log(`${chalk.cyan('Duration:')} ${Math.round(duration / 1000)}s`);
  console.log(`${chalk.cyan('Vulnerabilities found:')} ${vulnCount}`);
  
  if (result.summary?.severityBreakdown) {
    console.log('\n🎯 Severity Breakdown:');
    Object.entries(result.summary.severityBreakdown).forEach(([severity, count]) => {
      const color = getSeverityColor(severity);
      console.log(`  ${color(`${severity.toUpperCase()}:`)} ${count}`);
    });
  }
  
  if (vulnCount > 0) {
    console.log('\n⚠️  Top Vulnerabilities:');
    result.vulnerabilities.slice(0, 5).forEach((vuln: any, index: number) => {
      const color = getSeverityColor(vuln.severity);
      console.log(`  ${index + 1}. ${color(vuln.title)} (${vuln.severity})`);
    });
  }
  
  console.log('\n' + chalk.yellow('═'.repeat(50)));
}

function printComprehensiveSummary(result: any): void {
  console.log(chalk.yellow('\n📋 Comprehensive Security Test Summary:'));
  console.log(chalk.yellow('═'.repeat(60)));
  
  if (result.results) {
    result.results.forEach((testResult: any) => {
      const testType = testResult.type?.toUpperCase() || 'UNKNOWN';
      const vulnCount = testResult.vulnerabilities?.length || 0;
      const status = testResult.status === 'completed' ? '✅' : '❌';
      
      console.log(`${status} ${chalk.cyan(testType)}: ${vulnCount} vulnerabilities`);
    });
  }
  
  const totalVulns = result.results?.reduce((sum: number, r: any) => sum + (r.vulnerabilities?.length || 0), 0) || 0;
  console.log(`\n${chalk.cyan('Total vulnerabilities:')} ${totalVulns}`);
  console.log('\n' + chalk.yellow('═'.repeat(60)));
}

function getSeverityColor(severity: string): (text: string) => string {
  switch (severity.toLowerCase()) {
    case 'critical':
      return chalk.red.bold;
    case 'high':
      return chalk.red;
    case 'medium':
      return chalk.yellow;
    case 'low':
      return chalk.blue;
    default:
      return chalk.gray;
  }
}

// Parse command line arguments
program.parse();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('💥 Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('💥 Unhandled Rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});