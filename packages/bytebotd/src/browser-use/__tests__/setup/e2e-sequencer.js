/**
 * E2E Test Sequencer for Browser Automation Tests
 *
 * This custom test sequencer ensures that E2E tests are executed in an optimal order
 * to minimize resource conflicts, maximize test stability, and enable proper cleanup.
 *
 * Sequencing Strategy:
 * 1. Basic functionality tests first (session management, simple operations)
 * 2. Integration tests second (cross-service communication)
 * 3. Advanced scenarios third (complex workflows, edge cases)
 * 4. Performance and load tests fourth (resource-intensive operations)
 * 5. Security tests last (may leave system in altered state)
 *
 * This ordering helps ensure:
 * - Resource availability for critical tests
 * - Proper baseline establishment
 * - Minimal test interference
 * - Efficient resource utilization
 */

const { DefaultSequencer } = require('@jest/test-sequencer');

class BrowserAutomationE2ESequencer extends DefaultSequencer {
  sort(tests) {
    // Define test priority order
    const testPriorities = {
      // Highest priority - basic functionality
      'browser-automation.e2e.spec.ts': 1,

      // High priority - integration tests
      'browser-python-integration.e2e.spec.ts': 2,

      // Medium priority - advanced scenarios
      'browser-advanced-scenarios.e2e.spec.ts': 3,

      // Lower priority - performance tests (resource intensive)
      'browser-performance.e2e.spec.ts': 4,

      // Lowest priority - security tests (may alter system state)
      'browser-security.e2e.spec.ts': 5
    };

    // Sort tests by priority, then by filename for consistency
    const sortedTests = tests.sort((testA, testB) => {
      // Extract test file names
      const fileNameA = testA.path.split('/').pop();
      const fileNameB = testB.path.split('/').pop();

      // Get priorities (default to high priority if not specified)
      const priorityA = testPriorities[fileNameA] || 0;
      const priorityB = testPriorities[fileNameB] || 0;

      // Sort by priority first
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Then by filename for consistent ordering
      return fileNameA.localeCompare(fileNameB);
    });

    // Log test execution order for debugging
    console.log('\n📋 E2E Test Execution Order:');
    sortedTests.forEach((test, index) => {
      const fileName = test.path.split('/').pop();
      const priority = testPriorities[fileName] || 0;
      console.log(`   ${index + 1}. ${fileName} (priority: ${priority})`);
    });
    console.log('');

    return sortedTests;
  }
}

module.exports = BrowserAutomationE2ESequencer;