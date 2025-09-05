#!/usr/bin/env node

/**
 * Test Runner Coordination Script
 *
 * Comprehensive test execution orchestrator for BytebotD package that coordinates
 * multiple test suites, aggregates coverage data, and provides detailed reporting.
 *
 * Features:
 * - Sequential execution of unit, integration, and E2E tests
 * - Coverage aggregation across all test suites
 * - Performance monitoring and test timing analysis
 * - Detailed HTML and console reporting
 * - CI/CD integration support
 * - Error isolation and debugging support
 *
 * @author Claude Code
 * @version 1.0.0
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CONFIG = {
  testSuites: [
    {
      name: 'Unit Tests',
      command: 'npm test -- --coverage --testPathIgnorePatterns=integration.spec.ts --testPathIgnorePatterns=e2e-spec.ts',
      coverageDir: 'coverage',
      timeout: 300000, // 5 minutes
      required: true,
    },
    {
      name: 'Integration Tests',
      command: 'npm test -- --testPathPattern=integration.spec.ts --coverage --coverageDirectory=../coverage-integration',
      coverageDir: 'coverage-integration',
      timeout: 600000, // 10 minutes
      required: true,
    },
    {
      name: 'E2E Tests',
      command: 'npm run test:e2e -- --coverage',
      coverageDir: 'coverage-e2e',
      timeout: 900000, // 15 minutes
      required: false, // Optional in case of environment issues
    },
  ],
  reporting: {
    outputDir: 'test-results',
    aggregatedCoverageDir: 'coverage-aggregated',
    htmlReportFile: 'test-report.html',
    jsonReportFile: 'test-results.json',
  },
  performance: {
    slowTestThreshold: 10000, // 10 seconds
    memoryLeakThreshold: 100 * 1024 * 1024, // 100MB
  },
};

// Test execution state
const testState = {
  startTime: Date.now(),
  results: [],
  coverage: {
    combined: null,
    suites: {},
  },
  performance: {
    slowTests: [],
    memoryUsage: [],
  },
  errors: [],
};

/**
 * Main test runner entry point
 */
async function main() {
  console.log('🚀 Starting BytebotD Test Runner...');
  console.log(`📊 Executing ${CONFIG.testSuites.length} test suites`);
  console.log('=' .repeat(80));

  try {
    // Setup test environment
    await setupTestEnvironment();

    // Execute test suites
    for (const suite of CONFIG.testSuites) {
      await executeTestSuite(suite);
    }

    // Aggregate results and coverage
    await aggregateResults();

    // Generate reports
    await generateReports();

    // Validate results
    const success = validateResults();

    // Cleanup
    await cleanup();

    console.log('=' .repeat(80));
    console.log(success ? '✅ All tests completed successfully!' : '❌ Some tests failed');
    console.log(`⏱️  Total execution time: ${formatDuration(Date.now() - testState.startTime)}`);

    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('💥 Test runner failed:', error);
    await cleanup();
    process.exit(1);
  }
}

/**
 * Setup test environment and prepare directories
 */
async function setupTestEnvironment() {
  console.log('🔧 Setting up test environment...');

  // Create output directories
  const dirs = [
    CONFIG.reporting.outputDir,
    CONFIG.reporting.aggregatedCoverageDir,
    ...CONFIG.testSuites.map(suite => suite.coverageDir),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.JEST_WORKER_ID = '1';

  console.log('✅ Test environment ready');
}

/**
 * Execute a single test suite
 */
async function executeTestSuite(suite) {
  console.log(`\n📋 Executing ${suite.name}...`);
  console.log(`💻 Command: ${suite.command}`);

  const suiteStart = Date.now();
  const initialMemory = process.memoryUsage();

  try {
    const result = await runCommand(suite.command, {
      timeout: suite.timeout,
      env: { ...process.env, FORCE_COLOR: 'true' },
    });

    const duration = Date.now() - suiteStart;
    const finalMemory = process.memoryUsage();

    const suiteResult = {
      name: suite.name,
      success: result.exitCode === 0,
      duration,
      memoryDelta: finalMemory.heapUsed - initialMemory.heapUsed,
      output: result.stdout,
      error: result.stderr,
      coverageDir: suite.coverageDir,
    };

    testState.results.push(suiteResult);

    // Performance monitoring
    if (duration > CONFIG.performance.slowTestThreshold) {
      testState.performance.slowTests.push({
        suite: suite.name,
        duration,
      });
    }

    if (suiteResult.memoryDelta > CONFIG.performance.memoryLeakThreshold) {
      console.warn(`⚠️ Potential memory leak in ${suite.name}: +${Math.round(suiteResult.memoryDelta / 1024 / 1024)}MB`);
    }

    // Load coverage data
    await loadSuiteCoverage(suite, suiteResult);

    console.log(suiteResult.success ? 
      `✅ ${suite.name} completed (${formatDuration(duration)})` : 
      `❌ ${suite.name} failed (${formatDuration(duration)})`
    );

    if (!suiteResult.success && suite.required) {
      throw new Error(`Required test suite "${suite.name}" failed`);
    }

  } catch (error) {
    console.error(`❌ ${suite.name} failed:`, error.message);
    
    testState.results.push({
      name: suite.name,
      success: false,
      duration: Date.now() - suiteStart,
      error: error.message,
      coverageDir: suite.coverageDir,
    });

    if (suite.required) {
      throw error;
    }
  }
}

/**
 * Run command with timeout and capture output
 */
function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const { timeout = 300000, env = process.env } = options;
    
    let stdout = '';
    let stderr = '';
    
    const child = spawn('sh', ['-c', command], {
      env,
      stdio: 'pipe',
    });

    const timeoutId = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
    }, timeout);

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });

    child.on('close', (exitCode) => {
      clearTimeout(timeoutId);
      resolve({ exitCode, stdout, stderr });
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}

/**
 * Load coverage data for a test suite
 */
async function loadSuiteCoverage(suite, result) {
  const coverageFile = path.join(suite.coverageDir, 'coverage-final.json');
  
  if (fs.existsSync(coverageFile)) {
    try {
      const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      testState.coverage.suites[suite.name] = coverageData;
      console.log(`📊 Loaded coverage data for ${suite.name}`);
    } catch (error) {
      console.warn(`⚠️ Failed to load coverage data for ${suite.name}:`, error.message);
    }
  }
}

/**
 * Aggregate test results and coverage data
 */
async function aggregateResults() {
  console.log('\n📊 Aggregating results and coverage...');

  // Aggregate coverage data
  const aggregatedCoverage = {};
  
  for (const [suiteName, coverage] of Object.entries(testState.coverage.suites)) {
    for (const [filePath, fileData] of Object.entries(coverage)) {
      if (!aggregatedCoverage[filePath]) {
        aggregatedCoverage[filePath] = { ...fileData };
      } else {
        // Merge coverage data (simple union for now)
        const existing = aggregatedCoverage[filePath];
        existing.s = { ...existing.s, ...fileData.s };
        existing.f = { ...existing.f, ...fileData.f };
        existing.b = { ...existing.b, ...fileData.b };
      }
    }
  }

  testState.coverage.combined = aggregatedCoverage;

  // Write aggregated coverage
  const aggregatedCoverageFile = path.join(CONFIG.reporting.aggregatedCoverageDir, 'coverage-final.json');
  fs.writeFileSync(aggregatedCoverageFile, JSON.stringify(aggregatedCoverage, null, 2));

  console.log('✅ Results aggregated');
}

/**
 * Generate comprehensive test reports
 */
async function generateReports() {
  console.log('\n📝 Generating test reports...');

  await Promise.all([
    generateHtmlReport(),
    generateJsonReport(),
    generateCoverageReport(),
    generatePerformanceReport(),
  ]);

  console.log('✅ Reports generated');
}

/**
 * Generate HTML test report
 */
async function generateHtmlReport() {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>BytebotD Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    .success { border-left: 5px solid #4CAF50; }
    .failure { border-left: 5px solid #f44336; }
    .performance { background: #fff3cd; padding: 10px; border-radius: 3px; margin: 10px 0; }
    .coverage { background: #d1ecf1; padding: 10px; border-radius: 3px; margin: 10px 0; }
    pre { background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <div class="header">
    <h1>BytebotD Test Report</h1>
    <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
    <p><strong>Total Duration:</strong> ${formatDuration(Date.now() - testState.startTime)}</p>
    <p><strong>Test Suites:</strong> ${testState.results.length}</p>
    <p><strong>Success Rate:</strong> ${Math.round((testState.results.filter(r => r.success).length / testState.results.length) * 100)}%</p>
  </div>

  <h2>Test Suite Results</h2>
  ${testState.results.map(result => `
    <div class="suite ${result.success ? 'success' : 'failure'}">
      <h3>${result.name} ${result.success ? '✅' : '❌'}</h3>
      <p><strong>Duration:</strong> ${formatDuration(result.duration)}</p>
      <p><strong>Memory Delta:</strong> ${result.memoryDelta ? `${Math.round(result.memoryDelta / 1024 / 1024)}MB` : 'N/A'}</p>
      ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
    </div>
  `).join('')}

  ${testState.performance.slowTests.length > 0 ? `
    <h2>Performance Analysis</h2>
    <div class="performance">
      <h3>Slow Tests (>${CONFIG.performance.slowTestThreshold}ms)</h3>
      <table>
        <tr><th>Suite</th><th>Duration</th></tr>
        ${testState.performance.slowTests.map(test => `
          <tr><td>${test.suite}</td><td>${formatDuration(test.duration)}</td></tr>
        `).join('')}
      </table>
    </div>
  ` : ''}

  <h2>Coverage Summary</h2>
  <div class="coverage">
    <p>Coverage data aggregated from ${Object.keys(testState.coverage.suites).length} test suites.</p>
    <p>Detailed coverage reports available in individual suite directories.</p>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(CONFIG.reporting.outputDir, CONFIG.reporting.htmlReportFile), htmlContent);
}

/**
 * Generate JSON test report
 */
async function generateJsonReport() {
  const jsonReport = {
    timestamp: new Date().toISOString(),
    totalDuration: Date.now() - testState.startTime,
    suites: testState.results,
    performance: testState.performance,
    coverage: {
      suitesCount: Object.keys(testState.coverage.suites).length,
      combinedAvailable: Boolean(testState.coverage.combined),
    },
    summary: {
      totalSuites: testState.results.length,
      successfulSuites: testState.results.filter(r => r.success).length,
      failedSuites: testState.results.filter(r => !r.success).length,
      successRate: Math.round((testState.results.filter(r => r.success).length / testState.results.length) * 100),
    },
  };

  fs.writeFileSync(
    path.join(CONFIG.reporting.outputDir, CONFIG.reporting.jsonReportFile),
    JSON.stringify(jsonReport, null, 2)
  );
}

/**
 * Generate aggregated coverage report
 */
async function generateCoverageReport() {
  if (!testState.coverage.combined) {
    console.warn('⚠️ No coverage data available for aggregated report');
    return;
  }

  try {
    // Generate HTML coverage report using nyc
    execSync(`npx nyc report --reporter=html --report-dir=${CONFIG.reporting.aggregatedCoverageDir}/html --temp-dir=${CONFIG.reporting.aggregatedCoverageDir}`, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  } catch (error) {
    console.warn('⚠️ Failed to generate aggregated coverage report:', error.message);
  }
}

/**
 * Generate performance analysis report
 */
async function generatePerformanceReport() {
  const performanceData = {
    timestamp: new Date().toISOString(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
    },
    tests: {
      slowTests: testState.performance.slowTests,
      totalDuration: Date.now() - testState.startTime,
      averageSuiteDuration: testState.results.length > 0 ? 
        testState.results.reduce((sum, r) => sum + r.duration, 0) / testState.results.length : 0,
    },
    thresholds: {
      slowTestThreshold: CONFIG.performance.slowTestThreshold,
      memoryLeakThreshold: CONFIG.performance.memoryLeakThreshold,
    },
  };

  fs.writeFileSync(
    path.join(CONFIG.reporting.outputDir, 'performance-report.json'),
    JSON.stringify(performanceData, null, 2)
  );
}

/**
 * Validate test results and determine overall success
 */
function validateResults() {
  const requiredSuites = CONFIG.testSuites.filter(suite => suite.required);
  const requiredResults = testState.results.filter(result => 
    requiredSuites.some(suite => suite.name === result.name)
  );

  const allRequiredPassed = requiredResults.every(result => result.success);
  const overallSuccess = allRequiredPassed && testState.results.length > 0;

  console.log(`\n📊 Test Validation Results:`);
  console.log(`  Required suites: ${requiredResults.length}`);
  console.log(`  Required passed: ${requiredResults.filter(r => r.success).length}`);
  console.log(`  Optional suites: ${testState.results.length - requiredResults.length}`);
  console.log(`  Overall success: ${overallSuccess ? 'YES' : 'NO'}`);

  return overallSuccess;
}

/**
 * Cleanup temporary files and resources
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up...');
  
  // Could add cleanup logic here if needed
  // For now, we keep all artifacts for inspection

  console.log('✅ Cleanup completed');
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  main,
  CONFIG,
  formatDuration,
};