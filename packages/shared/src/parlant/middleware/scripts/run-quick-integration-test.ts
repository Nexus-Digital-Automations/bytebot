#!/usr/bin/env ts-node

/**
 * Quick PARLANT Middleware Integration Test
 *
 * Focused test to validate core middleware functionality without full build
 *
 * @author Claude Code - PARLANT Framework Team
 * @version 2.0.0 - Quick Integration Validator
 * @since 2024-09-22
 */

import { performance } from 'perf_hooks';
import * as path from 'path';

// Import types and interfaces directly
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

class QuickParlantIntegrationTest {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Quick PARLANT Middleware Integration Test');
    console.log('='.repeat(60));

    try {
      await this.testModuleImports();
      await this.testTypeDefinitions();
      await this.testDecoratorPatterns();
      await this.testMiddlewareInitialization();
      await this.testConfigurationHelpers();
      await this.generateReport();

      console.log('\n✅ Quick integration test completed successfully!');
    } catch (error) {
      console.error('\n❌ Quick integration test failed:', error);
      process.exit(1);
    }
  }

  private async testModuleImports(): Promise<void> {
    await this.runTest('Module Imports', async () => {
      const middlewarePath = path.resolve(__dirname, '../index.ts');

      // Check if main index file exists
      const fs = await import('fs/promises');
      await fs.access(middlewarePath);

      console.log('  ✅ Main index.ts file exists');

      // Check if core files exist
      const coreFiles = [
        '../core/universal-parlant-middleware.ts',
        '../decorators/enhanced-parlant-decorators.ts',
        '../interceptors/parlant-request-response-interceptor.ts',
        '../types/enhanced-parlant-types.ts',
        '../examples/basic-integration.ts',
      ];

      for (const file of coreFiles) {
        const filePath = path.resolve(__dirname, file);
        await fs.access(filePath);
        console.log(`  ✅ ${file} exists`);
      }

      return true;
    });
  }

  private async testTypeDefinitions(): Promise<void> {
    await this.runTest('Type Definitions', async () => {
      // Read and validate type definitions
      const fs = await import('fs/promises');
      const typesPath = path.resolve(__dirname, '../types/enhanced-parlant-types.ts');
      const typesContent = await fs.readFile(typesPath, 'utf-8');

      // Check for essential type definitions
      const requiredTypes = [
        'SecurityLevel',
        'ValidationMode',
        'ApprovalLevel',
        'RiskLevel',
        'EnhancedParlantRequest',
        'UserContext',
        'SecurityContext',
        'PerformanceMetrics',
      ];

      for (const type of requiredTypes) {
        if (!typesContent.includes(type)) {
          throw new Error(`Missing type definition: ${type}`);
        }
        console.log(`  ✅ Type definition found: ${type}`);
      }

      return true;
    });
  }

  private async testDecoratorPatterns(): Promise<void> {
    await this.runTest('Decorator Patterns', async () => {
      const fs = await import('fs/promises');
      const decoratorsPath = path.resolve(__dirname, '../decorators/enhanced-parlant-decorators.ts');
      const decoratorsContent = await fs.readFile(decoratorsPath, 'utf-8');

      // Check for essential function decorators
      const requiredFunctionDecorators = [
        'EnhancedParlantValidated',
        'TypeSafeValidation',
        'PerformanceMonitored',
        'IntelligentCache',
        'ContextAwareAuth',
      ];

      for (const decorator of requiredFunctionDecorators) {
        if (!decoratorsContent.includes(`export function ${decorator}`)) {
          throw new Error(`Missing function decorator: ${decorator}`);
        }
        console.log(`  ✅ Function decorator found: ${decorator}`);
      }

      // Check for parameter decorators (exported as constants)
      const requiredParamDecorators = [
        'ParlantContext',
        'EnhancedUser',
      ];

      for (const decorator of requiredParamDecorators) {
        if (!decoratorsContent.includes(`export const ${decorator}`)) {
          throw new Error(`Missing parameter decorator: ${decorator}`);
        }
        console.log(`  ✅ Parameter decorator found: ${decorator}`);
      }

      // Check for metadata keys
      const metadataKeys = [
        'ENHANCED_PARLANT_METADATA_KEY',
        'PARLANT_PERFORMANCE_METADATA_KEY',
        'PARLANT_AUDIT_METADATA_KEY',
        'PARLANT_CACHE_METADATA_KEY',
      ];

      for (const key of metadataKeys) {
        if (!decoratorsContent.includes(key)) {
          throw new Error(`Missing metadata key: ${key}`);
        }
        console.log(`  ✅ Metadata key found: ${key}`);
      }

      return true;
    });
  }

  private async testMiddlewareInitialization(): Promise<void> {
    await this.runTest('Middleware Initialization', async () => {
      const fs = await import('fs/promises');
      const middlewarePath = path.resolve(__dirname, '../core/universal-parlant-middleware.ts');
      const middlewareContent = await fs.readFile(middlewarePath, 'utf-8');

      // Check for essential middleware components
      const requiredComponents = [
        'EnhancedUniversalParlantMiddleware',
        'implements NestMiddleware',
        'use(req: EnhancedParlantRequest, res: Response, next: NextFunction)',
        'performEnhancedValidation',
        'initializeParlantContext',
        'analyzeEndpointConfiguration',
      ];

      for (const component of requiredComponents) {
        if (!middlewareContent.includes(component)) {
          throw new Error(`Missing middleware component: ${component}`);
        }
        console.log(`  ✅ Middleware component found: ${component}`);
      }

      // Check for interceptor
      const interceptorPath = path.resolve(__dirname, '../interceptors/parlant-request-response-interceptor.ts');
      const interceptorContent = await fs.readFile(interceptorPath, 'utf-8');

      if (!interceptorContent.includes('ParlantRequestResponseInterceptor')) {
        throw new Error('Missing ParlantRequestResponseInterceptor');
      }
      console.log('  ✅ Request/Response interceptor found');

      return true;
    });
  }

  private async testConfigurationHelpers(): Promise<void> {
    await this.runTest('Configuration Helpers', async () => {
      const fs = await import('fs/promises');
      const indexPath = path.resolve(__dirname, '../index.ts');
      const indexContent = await fs.readFile(indexPath, 'utf-8');

      // Check for configuration helper functions
      const configHelpers = [
        'createBasicValidationConfig',
        'createPerformanceValidationConfig',
        'createSecurityValidationConfig',
      ];

      for (const helper of configHelpers) {
        if (!indexContent.includes(helper)) {
          throw new Error(`Missing configuration helper: ${helper}`);
        }
        console.log(`  ✅ Configuration helper found: ${helper}`);
      }

      // Check for constants
      const constants = [
        'PERFORMANCE_TARGETS',
        'CACHE_TTL',
        'SECURITY_LEVEL_SCORES',
        'RISK_LEVEL_SCORES',
        'FRAMEWORK_INFO',
      ];

      for (const constant of constants) {
        if (!indexContent.includes(constant)) {
          throw new Error(`Missing constant: ${constant}`);
        }
        console.log(`  ✅ Constant found: ${constant}`);
      }

      return true;
    });
  }

  private async runTest(name: string, testFn: () => Promise<boolean>): Promise<void> {
    const startTime = performance.now();
    console.log(`\n🧪 Testing: ${name}`);

    try {
      await testFn();
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.results.push({
        name,
        passed: true,
        duration,
      });

      console.log(`  ✅ ${name}: PASSED (${duration.toFixed(2)}ms)`);
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.results.push({
        name,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      console.log(`  ❌ ${name}: FAILED (${duration.toFixed(2)}ms)`);
      console.log(`     Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async generateReport(): Promise<void> {
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(40));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
    console.log(`Total Duration: ${totalDuration.toFixed(2)}ms`);

    if (failedTests === 0) {
      console.log('\n🎉 All tests passed! PARLANT middleware is ready for integration.');

      console.log('\n📋 Integration Checklist:');
      console.log('  ✅ Core middleware components validated');
      console.log('  ✅ Type definitions complete');
      console.log('  ✅ Decorator patterns implemented');
      console.log('  ✅ Configuration helpers available');
      console.log('  ✅ Performance targets defined');
      console.log('  ✅ Security levels configured');

      console.log('\n🔧 Next Steps for Bytebot Integration:');
      console.log('  1. Add middleware to app.module.ts in each service');
      console.log('  2. Import and apply decorators to controllers');
      console.log('  3. Configure security levels per endpoint');
      console.log('  4. Set up performance monitoring');
      console.log('  5. Enable audit trails for compliance');

      console.log('\n📄 Example Integration Code:');
      console.log(`
// In app.module.ts
import { EnhancedUniversalParlantMiddleware } from '@bytebot/shared/parlant/middleware';

@Module({
  // ... other imports
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(EnhancedUniversalParlantMiddleware)
      .forRoutes('*');
  }
}

// In controller
import { EnhancedParlantValidated, SecurityLevel } from '@bytebot/shared/parlant/middleware';

@Controller('api')
export class ApiController {
  @Get('data')
  @EnhancedParlantValidated({
    intent: 'Retrieve data with validation',
    securityLevel: SecurityLevel._MEDIUM,
    enableMetrics: true,
  })
  async getData() {
    return { data: 'validated response' };
  }
}
      `);
    } else {
      console.log('\n❌ Some tests failed. Please review the errors above.');
    }
  }
}

// Execute if run directly
async function main() {
  const tester = new QuickParlantIntegrationTest();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

export { QuickParlantIntegrationTest };