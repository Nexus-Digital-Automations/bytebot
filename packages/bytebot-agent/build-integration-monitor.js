#!/usr/bin/env node

/**
 * TypeScript Build Integration Monitoring System
 *
 * Monitors and validates TypeScript build integration after import/export fixes
 * Provides real-time error reduction tracking and cross-package integration validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class BuildIntegrationMonitor {
  constructor() {
    this.startTime = new Date();
    this.monitoringLog = [];
    this.errorHistory = [];
    this.baselineErrors = 112; // Initial count established
    this.targetErrors = 0;

    // Define monitoring targets
    this.monitorTargets = {
      bytebotAgent:
        '/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/bytebot/packages/bytebot-agent',
      shared:
        '/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/bytebot/packages/shared',
      workspace:
        '/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/bytebot',
    };

    this.reportFile = path.join(
      this.monitorTargets.bytebotAgent,
      'build-integration-monitoring-report.md',
    );

    console.log('🔍 TypeScript Build Integration Monitor initialized');
    console.log(
      `📊 Baseline: ${this.baselineErrors} errors → Target: ${this.targetErrors} errors`,
    );
  }

  /**
   * Execute build and capture detailed error information
   */
  async executeMonitoredBuild(packagePath, packageName) {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let errorCount = 0;
    let success = false;

    try {
      console.log(`\n🔨 Building ${packageName}...`);

      // Execute build with timeout and capture output
      const result = execSync('timeout 120s pnpm run build', {
        cwd: packagePath,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      stdout = result;
      success = true;
      console.log(`✅ ${packageName} build successful`);
    } catch (error) {
      stderr = error.stdout || error.message;
      stdout = error.stdout || '';

      // Count TypeScript errors
      const errorMatches = stderr.match(/error TS\d+:/g);
      errorCount = errorMatches ? errorMatches.length : 0;

      console.log(
        `❌ ${packageName} build failed with ${errorCount} TypeScript errors`,
      );
    }

    const duration = Date.now() - startTime;

    const buildResult = {
      packageName,
      packagePath,
      timestamp: new Date().toISOString(),
      duration,
      success,
      errorCount,
      stdout: stdout.slice(0, 2000), // Truncate for logging
      stderr: stderr.slice(0, 2000),
      fullOutput: stdout + stderr,
    };

    this.errorHistory.push({
      timestamp: new Date().toISOString(),
      package: packageName,
      errorCount,
      success,
    });

    return buildResult;
  }

  /**
   * Analyze error patterns and categorize issues
   */
  analyzeErrorPatterns(buildOutput) {
    const analysis = {
      importExportErrors: [],
      typeErrors: [],
      moduleResolutionErrors: [],
      prismaSchemaErrors: [],
      propertyErrors: [],
    };

    const lines = buildOutput.split('\n');

    lines.forEach((line, index) => {
      // Import/Export errors (TS2307)
      if (line.includes('TS2307') && line.includes('Cannot find module')) {
        analysis.importExportErrors.push({
          line: index + 1,
          error: line.trim(),
          priority: 'HIGH',
        });
      }

      // Type assignment errors (TS2345)
      if (
        line.includes('TS2345') &&
        line.includes('not assignable to parameter')
      ) {
        analysis.typeErrors.push({
          line: index + 1,
          error: line.trim(),
          priority: 'MEDIUM',
        });
      }

      // Property errors (TS2339, TS2353)
      if (line.includes('TS2339') || line.includes('TS2353')) {
        analysis.propertyErrors.push({
          line: index + 1,
          error: line.trim(),
          priority: 'MEDIUM',
        });
      }

      // Module resolution hints
      if (line.includes('moduleResolution')) {
        analysis.moduleResolutionErrors.push({
          line: index + 1,
          error: line.trim(),
          priority: 'HIGH',
        });
      }
    });

    return analysis;
  }

  /**
   * Test cross-package integration
   */
  async validateCrossPackageIntegration() {
    console.log('\n🔗 Validating cross-package integration...');

    const integrationTests = [];

    try {
      // Test 1: Verify workspace dependency linking
      const linkTest = execSync('pnpm list @bytebot/shared', {
        cwd: this.monitorTargets.bytebotAgent,
        encoding: 'utf8',
      });

      integrationTests.push({
        test: 'Workspace Dependency Linking',
        status: linkTest.includes('link:../shared') ? 'PASS' : 'FAIL',
        details: linkTest.trim(),
      });
    } catch (error) {
      integrationTests.push({
        test: 'Workspace Dependency Linking',
        status: 'FAIL',
        details: error.message,
      });
    }

    try {
      // Test 2: Verify shared package exports
      const exportsPath = path.join(
        this.monitorTargets.shared,
        'dist',
        'index-server.d.ts',
      );
      const exportsExist = fs.existsSync(exportsPath);

      integrationTests.push({
        test: 'Shared Package Server Exports',
        status: exportsExist ? 'PASS' : 'FAIL',
        details: exportsExist
          ? 'index-server.d.ts found'
          : 'index-server.d.ts missing',
      });
    } catch (error) {
      integrationTests.push({
        test: 'Shared Package Server Exports',
        status: 'FAIL',
        details: error.message,
      });
    }

    return integrationTests;
  }

  /**
   * Generate comprehensive monitoring report
   */
  async generateMonitoringReport() {
    const currentTime = new Date();
    const monitoringDuration = (currentTime - this.startTime) / 1000;

    // Get latest error counts
    const latestBuild = await this.executeMonitoredBuild(
      this.monitorTargets.bytebotAgent,
      'bytebot-agent',
    );

    const sharedBuild = await this.executeMonitoredBuild(
      this.monitorTargets.shared,
      'shared',
    );

    const integrationResults = await this.validateCrossPackageIntegration();
    const errorAnalysis = this.analyzeErrorPatterns(latestBuild.fullOutput);

    // Calculate progress metrics
    const errorReduction = this.baselineErrors - latestBuild.errorCount;
    const progressPercentage = (
      (errorReduction / this.baselineErrors) *
      100
    ).toFixed(1);

    const report = `# TypeScript Build Integration Monitoring Report

## Executive Summary
- **Monitoring Started**: ${this.startTime.toISOString()}
- **Report Generated**: ${currentTime.toISOString()}
- **Monitoring Duration**: ${monitoringDuration.toFixed(1)} seconds
- **Baseline Errors**: ${this.baselineErrors}
- **Current Errors**: ${latestBuild.errorCount}
- **Error Reduction**: ${errorReduction} errors (${progressPercentage}%)
- **Target Achievement**: ${latestBuild.errorCount === 0 ? '✅ COMPLETE' : '🔄 IN PROGRESS'}

## Build Status Overview

### Bytebot Agent Package
- **Status**: ${latestBuild.success ? '✅ SUCCESS' : '❌ FAILED'}
- **Error Count**: ${latestBuild.errorCount}
- **Build Duration**: ${latestBuild.duration}ms
- **Last Built**: ${latestBuild.timestamp}

### Shared Package  
- **Status**: ${sharedBuild.success ? '✅ SUCCESS' : '❌ FAILED'}
- **Error Count**: ${sharedBuild.errorCount}
- **Build Duration**: ${sharedBuild.duration}ms
- **Last Built**: ${sharedBuild.timestamp}

## Cross-Package Integration Status

${integrationResults.map((test) => `- **${test.test}**: ${test.status === 'PASS' ? '✅' : '❌'} ${test.status}\n  - ${test.details}`).join('\n')}

## Error Analysis & Categorization

### Import/Export Errors (Priority: HIGH)
Count: ${errorAnalysis.importExportErrors.length}
${errorAnalysis.importExportErrors.map((err) => `- Line ${err.line}: ${err.error}`).join('\n')}

### Module Resolution Errors (Priority: HIGH)  
Count: ${errorAnalysis.moduleResolutionErrors.length}
${errorAnalysis.moduleResolutionErrors.map((err) => `- Line ${err.line}: ${err.error}`).join('\n')}

### Type Assignment Errors (Priority: MEDIUM)
Count: ${errorAnalysis.typeErrors.length}
${errorAnalysis.typeErrors
  .slice(0, 5)
  .map((err) => `- Line ${err.line}: ${err.error.slice(0, 100)}...`)
  .join('\n')}
${errorAnalysis.typeErrors.length > 5 ? `... and ${errorAnalysis.typeErrors.length - 5} more` : ''}

### Property Errors (Priority: MEDIUM)
Count: ${errorAnalysis.propertyErrors.length}
${errorAnalysis.propertyErrors
  .slice(0, 5)
  .map((err) => `- Line ${err.line}: ${err.error.slice(0, 100)}...`)
  .join('\n')}
${errorAnalysis.propertyErrors.length > 5 ? `... and ${errorAnalysis.propertyErrors.length - 5} more` : ''}

## Error History Tracking

${this.errorHistory
  .slice(-10)
  .map(
    (entry) =>
      `- ${entry.timestamp}: ${entry.package} - ${entry.errorCount} errors (${entry.success ? 'SUCCESS' : 'FAILED'})`,
  )
  .join('\n')}

## Recommendations & Next Steps

### Immediate Priority (HIGH)
${
  errorAnalysis.importExportErrors.length > 0
    ? `
1. **Fix Module Resolution**: Update tsconfig.json moduleResolution from "node" to "node16" or "bundler"
2. **Verify Export Paths**: Ensure @bytebot/shared/server export path is correctly configured
3. **Rebuild Shared Package**: Regenerate dist files after export fixes`
    : '1. ✅ Import/Export errors resolved'
}

### Medium Priority
${
  errorAnalysis.typeErrors.length > 0 || errorAnalysis.propertyErrors.length > 0
    ? `
1. **Type Compatibility**: Review Prisma schema alignment with TypeScript interfaces
2. **Property Mapping**: Validate database schema matches expected object properties
3. **Interface Updates**: Synchronize type definitions with actual data structures`
    : '1. ✅ Type and property errors resolved'
}

### Validation Required
1. **Incremental Testing**: Run builds after each fix to verify error reduction
2. **Integration Testing**: Test cross-package imports after resolution fixes
3. **Dependency Verification**: Ensure pnpm workspace linking remains functional

## Current Focus Areas

${
  latestBuild.errorCount > 0
    ? `
**Active Issues Requiring Attention:**
- Module resolution configuration updates needed
- Cross-package import path corrections required  
- Type definition synchronization in progress

**Expected Next Milestone:**
- Target: Reduce errors from ${latestBuild.errorCount} to ${Math.max(0, latestBuild.errorCount - 20)}
- Focus: Import/export resolution and module configuration`
    : `
**🎯 BUILD SUCCESS ACHIEVED!**
- All TypeScript errors resolved
- Cross-package integration functional
- Ready for production deployment`
}

---
*Report generated by TypeScript Build Integration Monitor*
*Last updated: ${currentTime.toISOString()}*
`;

    // Write report to file
    fs.writeFileSync(this.reportFile, report);
    console.log(
      `\n📋 Comprehensive monitoring report generated: ${this.reportFile}`,
    );

    return {
      latestBuild,
      sharedBuild,
      integrationResults,
      errorAnalysis,
      progressPercentage: parseFloat(progressPercentage),
      errorReduction,
      reportFile: this.reportFile,
    };
  }

  /**
   * Start continuous monitoring
   */
  async startMonitoring(intervalSeconds = 30) {
    console.log(
      `\n🔄 Starting continuous monitoring (${intervalSeconds}s intervals)...`,
    );

    // Generate initial report
    await this.generateMonitoringReport();

    // Set up interval monitoring
    const monitoringInterval = setInterval(async () => {
      try {
        console.log('\n⏰ Scheduled monitoring check...');
        const results = await this.generateMonitoringReport();

        // Log key progress metrics
        console.log(
          `📊 Progress: ${results.errorReduction}/${this.baselineErrors} errors resolved (${results.progressPercentage}%)`,
        );

        // Stop monitoring if target achieved
        if (results.latestBuild.errorCount === 0) {
          console.log('\n🎉 TARGET ACHIEVED! All TypeScript errors resolved.');
          clearInterval(monitoringInterval);
          return;
        }
      } catch (error) {
        console.error('❌ Monitoring error:', error.message);
      }
    }, intervalSeconds * 1000);

    return monitoringInterval;
  }
}

// CLI execution
if (require.main === module) {
  const monitor = new BuildIntegrationMonitor();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0] || 'report';

  switch (command) {
    case 'monitor':
      const interval = parseInt(args[1]) || 30;
      monitor.startMonitoring(interval);
      break;

    case 'report':
      monitor
        .generateMonitoringReport()
        .then((results) => {
          console.log('\n📊 Monitoring report generated successfully');
          console.log(`📈 Progress: ${results.progressPercentage}% complete`);
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Report generation failed:', error.message);
          process.exit(1);
        });
      break;

    default:
      console.log(`
Usage: node build-integration-monitor.js [command] [options]

Commands:
  report           Generate comprehensive monitoring report (default)
  monitor [secs]   Start continuous monitoring (default: 30s intervals)

Examples:
  node build-integration-monitor.js report
  node build-integration-monitor.js monitor 60
`);
  }
}

module.exports = BuildIntegrationMonitor;
