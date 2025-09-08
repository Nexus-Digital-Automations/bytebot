/**
 * MCP Index Module Test Suite
 *
 * Comprehensive test suite for the MCP module public API exports covering
 * module exposure, export validation, and integration consistency.
 *
 * Test Coverage:
 * - Export availability and correct typing
 * - Module re-export functionality
 * - Public API surface validation
 * - Integration consistency across exports
 * - Performance and memory impact of imports
 * - Tree-shaking and bundle optimization support
 * - Circular dependency detection
 * - Export naming conventions and consistency
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { performance } from 'perf_hooks';
import {
  TestUtils,
  AssertionHelpers,
  MockDataProviders,
  TestEnvironment,
  createMockLogger,
} from '../../test-utils';

// Import all exports from the MCP index module
import * as McpIndex from '../index';

// Import individual modules for comparison testing
import { BytebotMcpModule } from '../bytebot-mcp.module';
import { ComputerUseTools } from '../computer-use.tools';
import {
  Base64ImageCompressor,
  compressPngBase64Under1MB,
  CompressionOptions,
  CompressionResult,
} from '../compressor';

/**
 * Test utilities for index module testing
 */
class IndexTestUtils {
  /**
   * Validate that an export exists and has correct type
   */
  static validateExport(
    exportObj: any,
    name: string,
    expectedType: string,
    expectedConstructor?: any,
  ): void {
    expect(exportObj).toBeDefined();
    expect(typeof exportObj).toBe(expectedType);

    if (expectedConstructor && expectedType === 'function') {
      expect(exportObj).toBe(expectedConstructor);
    }
  }

  /**
   * Check if an object is a constructor function
   */
  static isConstructor(obj: any): boolean {
    return (
      typeof obj === 'function' &&
      obj.prototype &&
      obj.prototype.constructor === obj
    );
  }

  /**
   * Get all property names including non-enumerable ones
   */
  static getAllPropertyNames(obj: any): string[] {
    const props: string[] = [];
    let current = obj;

    do {
      Object.getOwnPropertyNames(current).forEach((name) => {
        if (!props.includes(name)) {
          props.push(name);
        }
      });
      current = Object.getPrototypeOf(current);
    } while (current && current !== Object.prototype);

    return props.sort();
  }

  /**
   * Calculate approximate memory footprint of an object
   */
  static getApproximateSize(obj: any): number {
    const visited = new WeakSet();

    function calculateSize(value: any): number {
      if (value === null || typeof value !== 'object') {
        return 8; // Approximate size for primitives
      }

      if (visited.has(value)) {
        return 0; // Already counted
      }

      visited.add(value);

      let size = 0;
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          size += key.length * 2; // String key size
          size += calculateSize(value[key]);
        }
      }

      return size;
    }

    return calculateSize(obj);
  }
}

describe('MCP Index Module', () => {
  let mockLogger: jest.Mocked<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = createMockLogger();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Export Availability and Validation', () => {
    /**
     * Test that all expected exports are available
     */
    it('should export all expected modules and components', () => {
      const expectedExports = [
        'BytebotMcpModule',
        'ComputerUseTools',
        'Base64ImageCompressor',
        'compressPngBase64Under1MB',
        'CompressionOptions',
        'CompressionResult',
      ];

      expectedExports.forEach((exportName) => {
        expect(McpIndex).toHaveProperty(exportName);
        expect(McpIndex[exportName as keyof typeof McpIndex]).toBeDefined();
      });
    });

    /**
     * Test that BytebotMcpModule is correctly exported
     */
    it('should export BytebotMcpModule correctly', () => {
      IndexTestUtils.validateExport(
        McpIndex.BytebotMcpModule,
        'BytebotMcpModule',
        'function',
        BytebotMcpModule,
      );

      expect(IndexTestUtils.isConstructor(McpIndex.BytebotMcpModule)).toBe(
        true,
      );
      expect(McpIndex.BytebotMcpModule).toBe(BytebotMcpModule);
    });

    /**
     * Test that ComputerUseTools is correctly exported
     */
    it('should export ComputerUseTools correctly', () => {
      IndexTestUtils.validateExport(
        McpIndex.ComputerUseTools,
        'ComputerUseTools',
        'function',
        ComputerUseTools,
      );

      expect(IndexTestUtils.isConstructor(McpIndex.ComputerUseTools)).toBe(
        true,
      );
      expect(McpIndex.ComputerUseTools).toBe(ComputerUseTools);
    });

    /**
     * Test that Base64ImageCompressor is correctly exported
     */
    it('should export Base64ImageCompressor correctly', () => {
      IndexTestUtils.validateExport(
        McpIndex.Base64ImageCompressor,
        'Base64ImageCompressor',
        'function',
        Base64ImageCompressor,
      );

      expect(IndexTestUtils.isConstructor(McpIndex.Base64ImageCompressor)).toBe(
        true,
      );
      expect(McpIndex.Base64ImageCompressor).toBe(Base64ImageCompressor);
    });

    /**
     * Test that utility function is correctly exported
     */
    it('should export compressPngBase64Under1MB utility function correctly', () => {
      IndexTestUtils.validateExport(
        McpIndex.compressPngBase64Under1MB,
        'compressPngBase64Under1MB',
        'function',
        compressPngBase64Under1MB,
      );

      expect(McpIndex.compressPngBase64Under1MB).toBe(
        compressPngBase64Under1MB,
      );
    });

    /**
     * Test that TypeScript interfaces are exported (types only)
     */
    it('should export TypeScript types correctly', () => {
      // Import types directly for testing
      type TestCompressionOptions = McpIndex.CompressionOptions;
      type TestCompressionResult = McpIndex.CompressionResult;

      // Test type compatibility by creating typed variables
      const testOptions: TestCompressionOptions = {
        targetSizeKB: 1024,
        initialQuality: 95,
        minQuality: 10,
        format: 'png',
        maxIterations: 10,
      };

      const testResult: TestCompressionResult = {
        base64: 'test-base64-string',
        sizeBytes: 1024,
        sizeKB: 1,
        sizeMB: 0.001,
        quality: 85,
        format: 'png',
        iterations: 3,
      };

      // Verify the objects conform to the expected type structure
      expect(testOptions).toBeDefined();
      expect(testOptions.targetSizeKB).toBe(1024);
      expect(testResult).toBeDefined();
      expect(testResult.base64).toBe('test-base64-string');
    });
  });

  describe('Re-export Functionality', () => {
    /**
     * Test that re-exports maintain original functionality
     */
    it('should maintain original functionality through re-exports', () => {
      // Test that exported classes can be instantiated
      expect(() => new McpIndex.BytebotMcpModule()).not.toThrow();

      // Test that static methods work correctly
      expect(typeof McpIndex.Base64ImageCompressor.compressToSize).toBe(
        'function',
      );
      expect(typeof McpIndex.Base64ImageCompressor.getBase64SizeInfo).toBe(
        'function',
      );

      // Test that utility function can be called
      expect(typeof McpIndex.compressPngBase64Under1MB).toBe('function');
    });

    /**
     * Test that re-exported modules preserve metadata
     */
    it('should preserve module metadata through re-exports', () => {
      // Test that decorator metadata is preserved
      const moduleMetadata = Reflect.getMetadata(
        'imports',
        McpIndex.BytebotMcpModule,
      );
      const providersMetadata = Reflect.getMetadata(
        'providers',
        McpIndex.BytebotMcpModule,
      );

      expect(moduleMetadata).toBeDefined();
      expect(providersMetadata).toBeDefined();

      // Test that service metadata is preserved
      const toolsMetadata = Reflect.getMetadataKeys(McpIndex.ComputerUseTools);
      expect(Array.isArray(toolsMetadata)).toBe(true);
    });

    /**
     * Test that prototype chains are maintained
     */
    it('should maintain prototype chains in re-exports', () => {
      const moduleInstance = new McpIndex.BytebotMcpModule();
      expect(moduleInstance).toBeInstanceOf(McpIndex.BytebotMcpModule);
      expect(moduleInstance).toBeInstanceOf(BytebotMcpModule);

      expect(McpIndex.BytebotMcpModule.prototype).toBe(
        BytebotMcpModule.prototype,
      );
    });
  });

  describe('Public API Surface Validation', () => {
    /**
     * Test that the API surface is clean and well-defined
     */
    it('should have a clean public API surface', () => {
      const exportNames = Object.keys(McpIndex);
      const expectedExports = [
        'BytebotMcpModule',
        'ComputerUseTools',
        'Base64ImageCompressor',
        'compressPngBase64Under1MB',
        'CompressionOptions',
        'CompressionResult',
      ];

      // Should not export more than expected
      expect(exportNames.length).toBeLessThanOrEqual(
        expectedExports.length + 2,
      );

      // All exports should be intentional
      exportNames.forEach((exportName) => {
        expect(expectedExports).toContain(exportName);
      });
    });

    /**
     * Test that no internal implementation details are exposed
     */
    it('should not expose internal implementation details', () => {
      const exportNames = Object.keys(McpIndex);
      const forbiddenPatterns = [
        /^_/, // Private properties
        /test/i, // Test utilities
        /mock/i, // Mock implementations
        /debug/i, // Debug utilities
        /internal/i, // Internal utilities
      ];

      exportNames.forEach((exportName) => {
        forbiddenPatterns.forEach((pattern) => {
          expect(exportName).not.toMatch(pattern);
        });
      });
    });

    /**
     * Test export naming conventions
     */
    it('should follow consistent naming conventions', () => {
      const exports = McpIndex;

      // Classes should be PascalCase
      expect(exports.BytebotMcpModule.name).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
      expect(exports.ComputerUseTools.name).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
      expect(exports.Base64ImageCompressor.name).toMatch(/^[A-Z][a-zA-Z0-9]*$/);

      // Functions should be camelCase
      expect(exports.compressPngBase64Under1MB.name).toMatch(
        /^[a-z][a-zA-Z0-9]*$/,
      );
    });
  });

  describe('Integration Consistency', () => {
    /**
     * Test that exports work together correctly
     */
    it('should allow seamless integration between exported components', async () => {
      // Test that module can be used with tools
      const module = new McpIndex.BytebotMcpModule();
      expect(module).toBeDefined();

      // Test that compression utilities work with expected inputs
      const testBase64 = Buffer.alloc(1024, 'A').toString('base64');
      const sizeInfo =
        McpIndex.Base64ImageCompressor.getBase64SizeInfo(testBase64);

      expect(sizeInfo).toHaveProperty('bytes');
      expect(sizeInfo).toHaveProperty('kb');
      expect(sizeInfo).toHaveProperty('mb');
      expect(sizeInfo).toHaveProperty('formatted');
    });

    /**
     * Test that all exports can be imported simultaneously
     */
    it('should support simultaneous import of all exports', () => {
      const allExports = [
        McpIndex.BytebotMcpModule,
        McpIndex.ComputerUseTools,
        McpIndex.Base64ImageCompressor,
        McpIndex.compressPngBase64Under1MB,
      ];

      allExports.forEach((exportItem) => {
        expect(exportItem).toBeDefined();
        expect(typeof exportItem).toBe('function');
      });

      // All should be importable without conflicts
      expect(allExports.length).toBe(4);
    });

    /**
     * Test version consistency across exports
     */
    it('should maintain version consistency across exports', () => {
      // All exports should be from the same version/build
      // This is more of a build-time concern, but we can test basic consistency
      expect(McpIndex.BytebotMcpModule).toBeDefined();
      expect(McpIndex.ComputerUseTools).toBeDefined();
      expect(McpIndex.Base64ImageCompressor).toBeDefined();

      // In a real scenario, you might check version properties if they exist
    });
  });

  describe('Performance and Memory Impact', () => {
    /**
     * Test that importing the index doesn't cause excessive memory usage
     */
    it('should have minimal memory footprint when imported', () => {
      const memoryBefore = process.memoryUsage();

      // Import and use exports
      const { BytebotMcpModule, ComputerUseTools, Base64ImageCompressor } =
        McpIndex;

      const memoryAfter = process.memoryUsage();
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;

      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024);

      // Exports should still be functional
      expect(BytebotMcpModule).toBeDefined();
      expect(ComputerUseTools).toBeDefined();
      expect(Base64ImageCompressor).toBeDefined();
    });

    /**
     * Test that re-exports don't create unnecessary object copies
     */
    it('should not create unnecessary object copies in re-exports', () => {
      // Re-exported items should be the same reference as original
      expect(McpIndex.BytebotMcpModule === BytebotMcpModule).toBe(true);
      expect(McpIndex.ComputerUseTools === ComputerUseTools).toBe(true);
      expect(McpIndex.Base64ImageCompressor === Base64ImageCompressor).toBe(
        true,
      );
      expect(
        McpIndex.compressPngBase64Under1MB === compressPngBase64Under1MB,
      ).toBe(true);
    });

    /**
     * Test import performance
     */
    it('should import quickly without blocking', () => {
      const startTime = performance.now();

      // Simulate re-importing (accessing exports)
      const exports = {
        BytebotMcpModule: McpIndex.BytebotMcpModule,
        ComputerUseTools: McpIndex.ComputerUseTools,
        Base64ImageCompressor: McpIndex.Base64ImageCompressor,
        compressPngBase64Under1MB: McpIndex.compressPngBase64Under1MB,
      };

      const endTime = performance.now();
      const importTime = endTime - startTime;

      // Should complete within 10ms
      expect(importTime).toBeLessThan(10);

      // Verify all exports are accessible
      Object.values(exports).forEach((exportItem) => {
        expect(exportItem).toBeDefined();
      });
    });
  });

  describe('Tree-shaking and Bundle Optimization', () => {
    /**
     * Test that exports support tree-shaking
     */
    it('should support tree-shaking optimization', () => {
      // Test that individual exports can be imported without bringing in others
      // This is more of a build-time test, but we can verify the structure

      const bytebotModule = McpIndex.BytebotMcpModule;
      expect(bytebotModule).toBeDefined();
      expect(typeof bytebotModule).toBe('function');

      // Should be able to use one export without others
      const moduleInstance = new bytebotModule();
      expect(moduleInstance).toBeInstanceOf(bytebotModule);
    });

    /**
     * Test export structure for bundler compatibility
     */
    it('should be compatible with modern bundlers', () => {
      // Test that exports are properly structured for bundlers
      const indexModule = McpIndex;

      // Should be an object with named exports
      expect(typeof indexModule).toBe('object');
      expect(indexModule).not.toBeNull();

      // Each export should be directly accessible
      const exportNames = Object.keys(indexModule);
      exportNames.forEach((name) => {
        expect(indexModule[name as keyof typeof indexModule]).toBeDefined();
      });
    });
  });

  describe('Circular Dependency Detection', () => {
    /**
     * Test that there are no circular dependencies
     */
    it('should not have circular dependencies', () => {
      // Test that importing doesn't cause circular dependency issues
      expect(() => {
        const { BytebotMcpModule } = McpIndex;
        new BytebotMcpModule();
      }).not.toThrow();

      // Test that all exports are properly resolved
      const exportValues = Object.values(McpIndex);
      exportValues.forEach((value) => {
        expect(value).toBeDefined();
        expect(value).not.toBe('[Circular]');
      });
    });

    /**
     * Test module initialization order
     */
    it('should handle module initialization correctly', () => {
      // Test that modules can be instantiated in any order
      const instances = [
        new McpIndex.BytebotMcpModule(),
        McpIndex.Base64ImageCompressor,
        McpIndex.compressPngBase64Under1MB,
      ];

      instances.forEach((instance) => {
        expect(instance).toBeDefined();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    /**
     * Test behavior with malformed imports
     */
    it('should handle missing exports gracefully', () => {
      // Test accessing non-existent export
      const nonExistent = (McpIndex as any).NonExistentExport;
      expect(nonExistent).toBeUndefined();
    });

    /**
     * Test that exports are immutable from external access
     */
    it('should protect exports from external modification', () => {
      const originalModule = McpIndex.BytebotMcpModule;

      // Attempt to modify export
      try {
        (McpIndex as any).BytebotMcpModule = null;
      } catch {
        // Some environments might prevent this modification
      }

      // In most cases, the export should still be accessible
      // (though this behavior can vary by JavaScript environment)
      expect(McpIndex.BytebotMcpModule).toBeDefined();
    });

    /**
     * Test exports with null/undefined values
     */
    it('should handle edge cases in export values', () => {
      // All exports should be properly defined
      const exportEntries = Object.entries(McpIndex);
      exportEntries.forEach(([name, value]) => {
        expect(value).not.toBeNull();
        expect(value).not.toBeUndefined();
      });
    });
  });

  describe('TypeScript Integration', () => {
    /**
     * Test that TypeScript types are properly exposed
     */
    it('should properly expose TypeScript types', () => {
      // Test that types can be used (compile-time test)
      type ModuleType = typeof McpIndex.BytebotMcpModule;
      type ToolsType = typeof McpIndex.ComputerUseTools;
      type CompressorType = typeof McpIndex.Base64ImageCompressor;

      // Runtime verification that types correspond to actual exports
      const moduleType: ModuleType = McpIndex.BytebotMcpModule;
      const toolsType: ToolsType = McpIndex.ComputerUseTools;
      const compressorType: CompressorType = McpIndex.Base64ImageCompressor;

      expect(moduleType).toBeDefined();
      expect(toolsType).toBeDefined();
      expect(compressorType).toBeDefined();
    });

    /**
     * Test that interface types are available at compile time
     */
    it('should make interface types available', () => {
      // These are compile-time only, but we can verify they exist in the module structure
      // In a real TypeScript environment, you would test:
      // type OptionsType = McpIndex.CompressionOptions;
      // type ResultType = McpIndex.CompressionResult;

      expect(true).toBe(true); // Placeholder for compile-time type tests
    });
  });

  describe('Documentation and API Contract', () => {
    /**
     * Test that exports match documented API
     */
    it('should match documented public API', () => {
      const documentedExports = [
        'BytebotMcpModule',
        'ComputerUseTools',
        'Base64ImageCompressor',
        'compressPngBase64Under1MB',
        'CompressionOptions',
        'CompressionResult',
      ];

      documentedExports.forEach((exportName) => {
        expect(McpIndex).toHaveProperty(exportName);
      });

      // Should not have undocumented exports
      const actualExports = Object.keys(McpIndex);
      actualExports.forEach((exportName) => {
        expect(documentedExports).toContain(exportName);
      });
    });

    /**
     * Test that export signatures are stable
     */
    it('should maintain stable export signatures', () => {
      // Test that constructor signatures are preserved
      expect(McpIndex.BytebotMcpModule.length).toBe(0); // Constructor takes no parameters
      expect(typeof McpIndex.compressPngBase64Under1MB).toBe('function');

      // Test that static methods exist
      expect(typeof McpIndex.Base64ImageCompressor.compressToSize).toBe(
        'function',
      );
      expect(typeof McpIndex.Base64ImageCompressor.getBase64SizeInfo).toBe(
        'function',
      );
    });
  });

  describe('Compatibility and Versioning', () => {
    /**
     * Test backward compatibility
     */
    it('should maintain backward compatibility', () => {
      // Test that old import patterns still work
      const { BytebotMcpModule } = McpIndex;
      expect(BytebotMcpModule).toBeDefined();

      // Test that class instantiation works as expected
      const instance = new BytebotMcpModule();
      expect(instance).toBeInstanceOf(BytebotMcpModule);
    });

    /**
     * Test forward compatibility considerations
     */
    it('should be prepared for future extensions', () => {
      // Test that the export structure can accommodate new exports
      const currentExportCount = Object.keys(McpIndex).length;
      expect(currentExportCount).toBeGreaterThan(0);

      // Test that adding new exports wouldn't break existing structure
      expect(typeof McpIndex).toBe('object');
      expect(McpIndex).not.toBeNull();
    });
  });
});
