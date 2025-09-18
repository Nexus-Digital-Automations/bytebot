/**
 * Jest Test Results Processor
 * 
 * Processes Jest test results for custom analysis and reporting.
 * Provides enhanced test result information for CI/CD pipelines.
 *
 * @param {Object} results - Jest test results object
 * @returns {Object} - Processed test results
 */

const fs = require('fs');
const path = require('path');

module.exports = (results) => {
  try {
    // Process test results for enhanced reporting
    const processedResults = {
      success: results.success,
      numTotalTests: results.numTotalTests,
      numPassedTests: results.numPassedTests,
      numFailedTests: results.numFailedTests,
      numPendingTests: results.numPendingTests,
      numTotalTestSuites: results.numTotalTestSuites,
      numPassedTestSuites: results.numPassedTestSuites,
      numFailedTestSuites: results.numFailedTestSuites,
      numPendingTestSuites: results.numPendingTestSuites,
      testResults: results.testResults,
      startTime: results.startTime,
      endTime: new Date().getTime(),
      testDuration: new Date().getTime() - results.startTime
    };

    // Enhanced analysis
    const failureAnalysis = {
      testFailures: [],
      suiteFailures: [],
      coverage: results.coverageMap ? extractCoverageInfo(results.coverageMap) : null
    };

    // Extract failed test details
    if (results.testResults) {
      results.testResults.forEach(suite => {
        if (suite.numFailingTests > 0) {
          suite.assertionResults.forEach(test => {
            if (test.status === 'failed') {
              failureAnalysis.testFailures.push({
                suiteName: suite.testFilePath,
                testName: test.title,
                error: test.failureMessages?.[0] || 'Unknown error',
                duration: test.duration
              });
            }
          });
        }
      });
    }

    // Create comprehensive test report
    const enhancedResults = {
      ...processedResults,
      analysis: failureAnalysis,
      summary: {
        passRate: processedResults.numTotalTests > 0 
          ? ((processedResults.numPassedTests / processedResults.numTotalTests) * 100).toFixed(2) + '%'
          : '0%',
        suitePassRate: processedResults.numTotalTestSuites > 0
          ? ((processedResults.numPassedTestSuites / processedResults.numTotalTestSuites) * 100).toFixed(2) + '%'
          : '0%',
        totalDuration: processedResults.testDuration + 'ms'
      },
      timestamp: new Date().toISOString()
    };

    // Write test results to file for further analysis
    const resultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const resultsFile = path.join(resultsDir, `test-results-${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(enhancedResults, null, 2));

    // Console output for immediate feedback
    console.log(`\n📊 Test Results Summary:`);
    console.log(`✅ Passed: ${processedResults.numPassedTests}/${processedResults.numTotalTests} tests`);
    console.log(`❌ Failed: ${processedResults.numFailedTests} tests`);
    console.log(`⏸️  Pending: ${processedResults.numPendingTests} tests`);
    console.log(`📈 Pass Rate: ${enhancedResults.summary.passRate}`);
    console.log(`⏱️  Duration: ${enhancedResults.summary.totalDuration}`);
    
    if (processedResults.numFailedTests > 0) {
      console.log(`\n❌ Failed Tests:`);
      failureAnalysis.testFailures.slice(0, 5).forEach(failure => {
        console.log(`  • ${failure.testName} (${path.basename(failure.suiteName)})`);
      });
      if (failureAnalysis.testFailures.length > 5) {
        console.log(`  ... and ${failureAnalysis.testFailures.length - 5} more`);
      }
    }

    console.log(`\n📄 Detailed results saved to: ${resultsFile}`);

    return results; // Return original results for Jest compatibility
  } catch (error) {
    console.error('Error processing test results:', error);
    return results; // Return original results on error
  }
};

/**
 * Extract coverage information from Jest coverage map
 * @param {Object} coverageMap - Jest coverage map
 * @returns {Object} - Extracted coverage information
 */
function extractCoverageInfo(coverageMap) {
  try {
    if (!coverageMap || !coverageMap.toSummary) {
      return null;
    }

    const summary = coverageMap.toSummary();
    return {
      lines: {
        total: summary.lines.total,
        covered: summary.lines.covered,
        percentage: summary.lines.pct
      },
      statements: {
        total: summary.statements.total,
        covered: summary.statements.covered,
        percentage: summary.statements.pct
      },
      functions: {
        total: summary.functions.total,
        covered: summary.functions.covered,
        percentage: summary.functions.pct
      },
      branches: {
        total: summary.branches.total,
        covered: summary.branches.covered,
        percentage: summary.branches.pct
      }
    };
  } catch (error) {
    console.error('Error extracting coverage info:', error);
    return null;
  }
}