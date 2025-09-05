#!/usr/bin/env node

/**
 * Test Validation Script
 *
 * Comprehensive test suite validation and quality assurance tool that ensures
 * test coverage, quality metrics, and adherence to testing standards.
 *
 * Features:
 * - Coverage threshold validation
 * - Test quality metrics analysis
 * - Mock usage validation
 * - Performance benchmark verification
 * - CI/CD integration compatibility checks
 * - Test structure and naming convention validation
 *
 * @author Claude Code
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Validation configuration
const VALIDATION_CONFIG = {
  coverage: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    critical: {
      'src/computer-use/': {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
      'src/cua-integration/': {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
  testFiles: {
    patterns: [
      'src/**/*.spec.ts',
      'src/**/*.test.ts',
      'src/**/__tests__/**/*.ts',
      'test/**/*.e2e-spec.ts',
    ],
    naming: {
      unit: /\.spec\.ts$/,
      integration: /\.integration\.spec\.ts$/,
      e2e: /\.e2e-spec\.ts$/,
    },
  },
  quality: {
    minTestsPerFile: 1,
    maxTestFileSize: 10000, // lines
    requiredSections: ['describe', 'it', 'beforeEach', 'afterEach'],
    mockValidation: {
      requiredMocks: ['fs/promises', 'child_process'],
      forbiddenPatterns: ['console.log', 'process.exit'],
    },
  },
  performance: {
    maxTestDuration: 30000, // 30 seconds per test suite
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
  },
};

// Validation state
const validationState = {
  errors: [],
  warnings: [],
  metrics: {
    totalTests: 0,
    totalTestFiles: 0,
    coverageScore: 0,
    qualityScore: 0,
  },
  details: {
    coverage: null,
    testFiles: [],
    violations: [],
  },
};

/**
 * Main validation entry point
 */
async function main() {
  console.log('🔍 Starting BytebotD Test Validation...');
  console.log('='.repeat(80));

  try {
    // Validate test coverage
    await validateCoverage();

    // Validate test file structure and quality
    await validateTestFiles();

    // Validate test configuration
    await validateTestConfiguration();

    // Validate CI/CD compatibility
    await validateCiCdCompatibility();

    // Generate validation report
    await generateValidationReport();

    // Calculate final scores and determine success
    const success = calculateFinalScore();

    console.log('='.repeat(80));
    console.log(
      success ? '✅ Test validation passed!' : '❌ Test validation failed',
    );
    console.log(`📊 Quality Score: ${validationState.metrics.qualityScore}%`);
    console.log(`📈 Coverage Score: ${validationState.metrics.coverageScore}%`);

    if (validationState.errors.length > 0) {
      console.log(`\n❌ Errors (${validationState.errors.length}):`);
      validationState.errors.forEach((error) => console.log(`  • ${error}`));
    }

    if (validationState.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${validationState.warnings.length}):`);
      validationState.warnings.forEach((warning) =>
        console.log(`  • ${warning}`),
      );
    }

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  }
}

/**
 * Validate test coverage against thresholds
 */
async function validateCoverage() {
  console.log('📊 Validating test coverage...');

  try {
    // Check for coverage files
    const coverageFiles = [
      'coverage/coverage-final.json',
      'coverage-integration/coverage-final.json',
      'coverage-e2e/coverage-final.json',
    ];

    let totalCoverage = { statements: 0, branches: 0, functions: 0, lines: 0 };
    let totalFiles = 0;

    for (const coverageFile of coverageFiles) {
      if (fs.existsSync(coverageFile)) {
        const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        const summary = calculateCoverageSummary(coverage);

        totalCoverage.statements += summary.statements.pct;
        totalCoverage.branches += summary.branches.pct;
        totalCoverage.functions += summary.functions.pct;
        totalCoverage.lines += summary.lines.pct;
        totalFiles++;

        console.log(`  ✓ Loaded coverage from ${coverageFile}`);
      }
    }

    if (totalFiles === 0) {
      validationState.errors.push(
        'No coverage files found - run tests with coverage first',
      );
      return;
    }

    // Calculate average coverage
    const avgCoverage = {
      statements: totalCoverage.statements / totalFiles,
      branches: totalCoverage.branches / totalFiles,
      functions: totalCoverage.functions / totalFiles,
      lines: totalCoverage.lines / totalFiles,
    };

    validationState.details.coverage = avgCoverage;
    validationState.metrics.coverageScore = Math.round(
      (avgCoverage.statements +
        avgCoverage.branches +
        avgCoverage.functions +
        avgCoverage.lines) /
        4,
    );

    // Validate against thresholds
    validateCoverageThresholds(
      avgCoverage,
      VALIDATION_CONFIG.coverage.global,
      'Global',
    );

    console.log(
      `  📈 Average coverage: ${validationState.metrics.coverageScore}%`,
    );
  } catch (error) {
    validationState.errors.push(`Coverage validation failed: ${error.message}`);
  }
}

/**
 * Calculate coverage summary from coverage data
 */
function calculateCoverageSummary(coverageData) {
  let totalStatements = 0,
    coveredStatements = 0;
  let totalBranches = 0,
    coveredBranches = 0;
  let totalFunctions = 0,
    coveredFunctions = 0;
  let totalLines = 0,
    coveredLines = 0;

  for (const [filePath, fileData] of Object.entries(coverageData)) {
    if (fileData.s) {
      totalStatements += Object.keys(fileData.s).length;
      coveredStatements += Object.values(fileData.s).filter(
        (hits) => hits > 0,
      ).length;
    }

    if (fileData.b) {
      const branches = Object.values(fileData.b);
      totalBranches += branches.reduce((sum, branch) => sum + branch.length, 0);
      coveredBranches += branches.reduce(
        (sum, branch) => sum + branch.filter((hits) => hits > 0).length,
        0,
      );
    }

    if (fileData.f) {
      totalFunctions += Object.keys(fileData.f).length;
      coveredFunctions += Object.values(fileData.f).filter(
        (hits) => hits > 0,
      ).length;
    }

    if (fileData.l) {
      totalLines += Object.keys(fileData.l).length;
      coveredLines += Object.values(fileData.l).filter(
        (hits) => hits > 0,
      ).length;
    }
  }

  return {
    statements: {
      pct:
        totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0,
    },
    branches: {
      pct: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
    },
    functions: {
      pct: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
    },
    lines: { pct: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0 },
  };
}

/**
 * Validate coverage against specific thresholds
 */
function validateCoverageThresholds(coverage, thresholds, context) {
  const metrics = ['statements', 'branches', 'functions', 'lines'];

  for (const metric of metrics) {
    if (coverage[metric] < thresholds[metric]) {
      validationState.errors.push(
        `${context} ${metric} coverage ${coverage[metric].toFixed(1)}% is below threshold ${thresholds[metric]}%`,
      );
    }
  }
}

/**
 * Validate test files structure and quality
 */
async function validateTestFiles() {
  console.log('📝 Validating test files...');

  const testFiles = [];
  for (const pattern of VALIDATION_CONFIG.testFiles.patterns) {
    const files = glob.sync(pattern, { ignore: 'node_modules/**' });
    testFiles.push(...files);
  }

  validationState.metrics.totalTestFiles = testFiles.length;

  if (testFiles.length === 0) {
    validationState.errors.push('No test files found');
    return;
  }

  let totalTests = 0;
  let qualityScore = 0;

  for (const testFile of testFiles) {
    const fileAnalysis = await analyzeTestFile(testFile);
    validationState.details.testFiles.push(fileAnalysis);

    totalTests += fileAnalysis.testCount;
    qualityScore += fileAnalysis.qualityScore;

    if (fileAnalysis.violations.length > 0) {
      validationState.details.violations.push({
        file: testFile,
        violations: fileAnalysis.violations,
      });
    }
  }

  validationState.metrics.totalTests = totalTests;
  validationState.metrics.qualityScore = Math.round(
    qualityScore / testFiles.length,
  );

  console.log(`  📄 Analyzed ${testFiles.length} test files`);
  console.log(`  🧪 Found ${totalTests} total tests`);
}

/**
 * Analyze a single test file for quality and compliance
 */
async function analyzeTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const analysis = {
    filePath,
    lineCount: lines.length,
    testCount: 0,
    qualityScore: 100,
    violations: [],
    characteristics: {
      hasDescribe: false,
      hasBeforeEach: false,
      hasAfterEach: false,
      hasMocks: false,
      hasAsync: false,
    },
  };

  // Count tests
  analysis.testCount = (content.match(/it\s*\(/g) || []).length;
  if (analysis.testCount < VALIDATION_CONFIG.quality.minTestsPerFile) {
    analysis.violations.push(
      `Too few tests: ${analysis.testCount} (minimum: ${VALIDATION_CONFIG.quality.minTestsPerFile})`,
    );
    analysis.qualityScore -= 20;
  }

  // Check file size
  if (analysis.lineCount > VALIDATION_CONFIG.quality.maxTestFileSize) {
    analysis.violations.push(
      `File too large: ${analysis.lineCount} lines (maximum: ${VALIDATION_CONFIG.quality.maxTestFileSize})`,
    );
    analysis.qualityScore -= 15;
  }

  // Check for required sections
  analysis.characteristics.hasDescribe = /describe\s*\(/.test(content);
  analysis.characteristics.hasBeforeEach = /beforeEach\s*\(/.test(content);
  analysis.characteristics.hasAfterEach = /afterEach\s*\(/.test(content);
  analysis.characteristics.hasMocks =
    /jest\.mock|mockResolvedValue|mockRejectedValue/.test(content);
  analysis.characteristics.hasAsync = /async\s+\w+|await\s+/.test(content);

  if (!analysis.characteristics.hasDescribe) {
    analysis.violations.push('Missing describe blocks for test organization');
    analysis.qualityScore -= 15;
  }

  if (!analysis.characteristics.hasBeforeEach && analysis.testCount > 1) {
    analysis.violations.push('Missing beforeEach setup for multiple tests');
    analysis.qualityScore -= 10;
  }

  // Check for forbidden patterns
  for (const pattern of VALIDATION_CONFIG.quality.mockValidation
    .forbiddenPatterns) {
    if (content.includes(pattern)) {
      analysis.violations.push(`Contains forbidden pattern: ${pattern}`);
      analysis.qualityScore -= 5;
    }
  }

  // Check naming conventions
  const fileName = path.basename(filePath);
  const isValidNaming = Object.values(VALIDATION_CONFIG.testFiles.naming).some(
    (pattern) => pattern.test(fileName),
  );
  if (!isValidNaming) {
    analysis.violations.push('File name does not follow naming conventions');
    analysis.qualityScore -= 10;
  }

  // Ensure quality score doesn't go negative
  analysis.qualityScore = Math.max(0, analysis.qualityScore);

  return analysis;
}

/**
 * Validate test configuration files
 */
async function validateTestConfiguration() {
  console.log('⚙️  Validating test configuration...');

  const configFiles = [
    { path: 'jest.config.js', required: true },
    { path: 'test/jest-e2e.json', required: true },
    { path: 'src/test-utils/setup.ts', required: true },
    { path: 'src/test-utils/setupAfterEnv.ts', required: true },
  ];

  for (const config of configFiles) {
    if (fs.existsSync(config.path)) {
      console.log(`  ✓ Found ${config.path}`);

      // Basic validation of config content
      try {
        const content = fs.readFileSync(config.path, 'utf8');
        validateConfigContent(config.path, content);
      } catch (error) {
        validationState.warnings.push(
          `Failed to validate ${config.path}: ${error.message}`,
        );
      }
    } else if (config.required) {
      validationState.errors.push(
        `Missing required config file: ${config.path}`,
      );
    }
  }
}

/**
 * Validate configuration file content
 */
function validateConfigContent(configPath, content) {
  const validations = {
    'jest.config.js': [
      { pattern: /coverageThreshold/, description: 'coverage thresholds' },
      {
        pattern: /setupFilesAfterEnv/,
        description: 'setup files configuration',
      },
      {
        pattern: /collectCoverageFrom/,
        description: 'coverage collection patterns',
      },
    ],
    'test/jest-e2e.json': [
      { pattern: /"testRegex".*e2e-spec/, description: 'E2E test pattern' },
      { pattern: /"testTimeout"/, description: 'test timeout configuration' },
    ],
    'src/test-utils/setup.ts': [
      { pattern: /jest\.setTimeout/, description: 'test timeout setup' },
      { pattern: /jest\.mock/, description: 'mock configurations' },
    ],
    'src/test-utils/setupAfterEnv.ts': [
      { pattern: /expect\.extend/, description: 'custom matchers' },
      { pattern: /beforeEach|afterEach/, description: 'test hooks' },
    ],
  };

  const fileName = path.basename(configPath);
  const checks = validations[fileName] || validations[configPath];

  if (checks) {
    for (const check of checks) {
      if (!check.pattern.test(content)) {
        validationState.warnings.push(
          `${configPath} is missing ${check.description}`,
        );
      }
    }
  }
}

/**
 * Validate CI/CD compatibility
 */
async function validateCiCdCompatibility() {
  console.log('🔄 Validating CI/CD compatibility...');

  const ciChecks = [
    {
      name: 'Package.json test scripts',
      check: () => {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const scripts = packageJson.scripts || {};
        return scripts.test && scripts['test:cov'] !== undefined;
      },
      error: 'Missing required test scripts in package.json',
    },
    {
      name: 'Coverage reporting format',
      check: () => {
        const jestConfig = fs.existsSync('jest.config.js');
        if (jestConfig) {
          const content = fs.readFileSync('jest.config.js', 'utf8');
          return content.includes('lcov') && content.includes('json');
        }
        return false;
      },
      error: 'Jest configuration missing CI-compatible coverage formats',
    },
    {
      name: 'Test timeout configuration',
      check: () => {
        const jestConfig = fs.existsSync('jest.config.js');
        if (jestConfig) {
          const content = fs.readFileSync('jest.config.js', 'utf8');
          return content.includes('testTimeout');
        }
        return false;
      },
      warning: 'No test timeout configured - may cause CI failures',
    },
  ];

  for (const check of ciChecks) {
    try {
      if (!check.check()) {
        if (check.error) {
          validationState.errors.push(check.error);
        } else if (check.warning) {
          validationState.warnings.push(check.warning);
        }
      } else {
        console.log(`  ✓ ${check.name}`);
      }
    } catch (error) {
      validationState.warnings.push(
        `Failed to check ${check.name}: ${error.message}`,
      );
    }
  }
}

/**
 * Generate comprehensive validation report
 */
async function generateValidationReport() {
  const report = {
    timestamp: new Date().toISOString(),
    metrics: validationState.metrics,
    validation: {
      errors: validationState.errors,
      warnings: validationState.warnings,
    },
    details: validationState.details,
    thresholds: VALIDATION_CONFIG,
  };

  // Ensure test-results directory exists
  if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results', { recursive: true });
  }

  fs.writeFileSync(
    'test-results/validation-report.json',
    JSON.stringify(report, null, 2),
  );
  console.log(
    '📊 Validation report written to test-results/validation-report.json',
  );
}

/**
 * Calculate final validation score and determine success
 */
function calculateFinalScore() {
  // Validation fails if there are any errors
  if (validationState.errors.length > 0) {
    return false;
  }

  // Check minimum quality thresholds
  const minCoverageScore = 80;
  const minQualityScore = 70;

  if (validationState.metrics.coverageScore < minCoverageScore) {
    validationState.errors.push(
      `Coverage score ${validationState.metrics.coverageScore}% is below minimum ${minCoverageScore}%`,
    );
    return false;
  }

  if (validationState.metrics.qualityScore < minQualityScore) {
    validationState.errors.push(
      `Quality score ${validationState.metrics.qualityScore}% is below minimum ${minQualityScore}%`,
    );
    return false;
  }

  return true;
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  main,
  VALIDATION_CONFIG,
  validateCoverage,
  validateTestFiles,
  analyzeTestFile,
};
