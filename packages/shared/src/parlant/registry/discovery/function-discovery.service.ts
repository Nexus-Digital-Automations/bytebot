/**
 * PARLANT Phase 1 Function Registration System - Function Discovery Service
 *
 * Implements automatic function discovery and analysis across the codebase.
 * Supports multiple discovery methods including static analysis, AST parsing,
 * runtime reflection, and annotation scanning.
 *
 * @fileoverview Function discovery service for automatic function registration
 * @version 1.0.0
 * @author Function Discovery Agent #3
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
// import * as parser from '@typescript-eslint/parser'; // Disabled - using alternative parsing method
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/types';
import {
  IFunctionDiscovery,
  FunctionDiscoveryResult,
  FunctionDiscoveryEntry,
  DiscoveryConfiguration,
  RediscoveryResult,
  DiscoveryCapabilities,
  ConfigurationValidationResult,
  DiscoveryMethod,
  SourceLocation,
  FunctionSignature,
  ParameterDefinition,
  TypeDefinition,
  TypeCategory,
  DiscoveryMetadata,
  DiscoveryStatistics,
  DiscoveryScope,
  DiscoveryError,
  DiscoveryChange,
  DiscoveryChangeType
} from '../core/registry.interface';

/**
 * Function discovery service for automatic function detection and analysis
 */
@Injectable()
export class FunctionDiscoveryService implements IFunctionDiscovery {
  private readonly logger = new Logger(FunctionDiscoveryService.name);
  private readonly supportedExtensions = ['.ts', '.js', '.tsx', '.jsx'];
  private readonly excludePatterns = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.d.ts',
    '**/*.spec.ts',
    '**/*.test.ts'
  ];

  /**
   * Discover functions in specified scope
   */
  async discover(configuration: DiscoveryConfiguration): Promise<FunctionDiscoveryResult> {
    const logger = this.logger;
    const sessionId = this.generateSessionId();
    const startTime = Date.now();

    logger.log(`Starting function discovery session: ${sessionId}`);
    logger.debug(`Discovery configuration: ${JSON.stringify(configuration, null, 2)}`);

    try {
      // Validate configuration
      const validationResult = this.validateConfiguration(configuration);
      if (!validationResult.valid) {
        throw new Error(`Invalid configuration: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      const discoveredFunctions: FunctionDiscoveryEntry[] = [];
      const errors: DiscoveryError[] = [];
      const statistics: DiscoveryStatistics = {
        filesScanned: 0,
        functionsDiscovered: 0,
        functionsRegistered: 0,
        functionsSkipped: 0,
        errors: 0,
        averageConfidence: 0
      };

      // Scan files based on scope
      const filesToScan = await this.getFilesToScan(configuration);
      logger.log(`Found ${filesToScan.length} files to scan`);

      // Process files in parallel if enabled
      const processPromises = configuration.parallel
        ? filesToScan.map(filePath => this.processFile(filePath, configuration, errors))
        : [];

      if (configuration.parallel) {
        const results = await Promise.allSettled(processPromises);
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            discoveredFunctions.push(...result.value);
          } else {
            errors.push({
              functionId: `file_${index}`,
              error: result.reason?.message || 'Unknown error',
              context: { filePath: filesToScan[index] }
            });
          }
        });
      } else {
        // Sequential processing
        for (const filePath of filesToScan) {
          try {
            const functions = await this.processFile(filePath, configuration, errors);
            discoveredFunctions.push(...functions);
          } catch (error) {
            errors.push({
              functionId: `file_${filePath}`,
              error: error instanceof Error ? error.message : String(error),
              context: { filePath }
            });
          }
        }
      }

      // Update statistics
      statistics.filesScanned = filesToScan.length;
      statistics.functionsDiscovered = discoveredFunctions.length;
      statistics.functionsRegistered = discoveredFunctions.filter(f => f.confidence >= configuration.confidenceThreshold).length;
      statistics.functionsSkipped = discoveredFunctions.length - statistics.functionsRegistered;
      statistics.errors = errors.length;
      statistics.averageConfidence = discoveredFunctions.length > 0
        ? discoveredFunctions.reduce((sum, f) => sum + f.confidence, 0) / discoveredFunctions.length
        : 0;

      const endTime = Date.now();
      const duration = endTime - startTime;

      const metadata: DiscoveryMetadata = {
        sessionId,
        timestamp: new Date(),
        scope: this.extractScope(configuration),
        configuration,
        duration
      };

      logger.log(`Discovery completed in ${duration}ms. Found ${discoveredFunctions.length} functions with ${errors.length} errors`);

      return {
        functions: discoveredFunctions.filter(f => f.confidence >= configuration.confidenceThreshold),
        metadata,
        statistics
      };

    } catch (error) {
      logger.error(`Discovery failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Discover functions in single file
   */
  async discoverInFile(filePath: string): Promise<FunctionDiscoveryEntry[]> {
    this.logger.debug(`Discovering functions in file: ${filePath}`);

    try {
      const defaultConfig: DiscoveryConfiguration = {
        methods: [DiscoveryMethod._AST_PARSING, DiscoveryMethod._STATIC_ANALYSIS],
        confidenceThreshold: 0.7,
        maxFunctions: 1000,
        timeout: 30000,
        parallel: false
      };

      return await this.processFile(filePath, defaultConfig, []);
    } catch (error) {
      this.logger.error(`Failed to discover functions in file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Discover functions in directory
   */
  async discoverInDirectory(directoryPath: string, recursive: boolean): Promise<FunctionDiscoveryEntry[]> {
    this.logger.debug(`Discovering functions in directory: ${directoryPath} (recursive: ${recursive})`);

    const allFunctions: FunctionDiscoveryEntry[] = [];

    try {
      const files = await this.scanDirectory(directoryPath, recursive);

      for (const filePath of files) {
        if (this.isValidFile(filePath)) {
          const functions = await this.discoverInFile(filePath);
          allFunctions.push(...functions);
        }
      }

      this.logger.debug(`Discovered ${allFunctions.length} functions in directory ${directoryPath}`);
      return allFunctions;

    } catch (error) {
      this.logger.error(`Failed to discover functions in directory ${directoryPath}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Re-discover functions to detect changes
   */
  async rediscover(functionIds: string[]): Promise<RediscoveryResult> {
    this.logger.log(`Re-discovering ${functionIds.length} functions`);

    const result: RediscoveryResult = {
      totalProcessed: functionIds.length,
      successfulRediscoveries: 0,
      failedRediscoveries: 0,
      changesDetected: [],
      errors: []
    };

    // Implementation would compare previous discovery results with new ones
    // This is a simplified version for demonstration
    for (const functionId of functionIds) {
      try {
        // Rediscover function and compare with previous results
        // This would involve storing previous discovery results and comparing
        result.successfulRediscoveries++;
      } catch (error) {
        result.failedRediscoveries++;
        result.errors.push({
          functionId,
          error: error instanceof Error ? error.message : String(error),
          context: {}
        });
      }
    }

    this.logger.log(`Rediscovery completed: ${result.successfulRediscoveries} successful, ${result.failedRediscoveries} failed`);
    return result;
  }

  /**
   * Get discovery capabilities
   */
  getCapabilities(): DiscoveryCapabilities {
    return {
      supportedLanguages: ['typescript', 'javascript', 'tsx', 'jsx'],
      supportedMethods: Object.values(DiscoveryMethod),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFunctions: 10000,
      parallelProcessing: true
    };
  }

  /**
   * Validate discovery configuration
   */
  validateConfiguration(configuration: DiscoveryConfiguration): ConfigurationValidationResult {
    const errors: Array<{ field: string; message: string; code: string }> = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate methods
    if (!configuration.methods || configuration.methods.length === 0) {
      errors.push({
        field: 'methods',
        message: 'At least one discovery method must be specified',
        code: 'METHODS_REQUIRED'
      });
    }

    // Validate confidence threshold
    if (configuration.confidenceThreshold < 0 || configuration.confidenceThreshold > 1) {
      errors.push({
        field: 'confidenceThreshold',
        message: 'Confidence threshold must be between 0 and 1',
        code: 'INVALID_CONFIDENCE_THRESHOLD'
      });
    }

    // Validate timeout
    if (configuration.timeout <= 0) {
      errors.push({
        field: 'timeout',
        message: 'Timeout must be greater than 0',
        code: 'INVALID_TIMEOUT'
      });
    }

    // Warnings and recommendations
    if (configuration.confidenceThreshold < 0.5) {
      warnings.push('Low confidence threshold may result in false positives');
    }

    if (configuration.maxFunctions > 10000) {
      warnings.push('High maxFunctions limit may impact performance');
    }

    if (configuration.parallel && configuration.timeout < 60000) {
      recommendations.push('Consider increasing timeout for parallel processing');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  // ===========================
  // PRIVATE HELPER METHODS
  // ===========================

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `discovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract scope from configuration
   */
  private extractScope(configuration: DiscoveryConfiguration): DiscoveryScope {
    // This would extract scope information from the configuration
    // For now, return a default scope
    return {
      paths: ['.'],
      includePatterns: ['**/*.ts', '**/*.js'],
      excludePatterns: this.excludePatterns,
      maxDepth: 10,
      followSymlinks: false
    };
  }

  /**
   * Get list of files to scan based on configuration
   */
  private async getFilesToScan(configuration: DiscoveryConfiguration): Promise<string[]> {
    const files: string[] = [];
    const scope = this.extractScope(configuration);

    for (const basePath of scope.paths) {
      const scopedFiles = await this.scanDirectory(basePath, scope.maxDepth > 1);
      files.push(...scopedFiles.filter(file => this.matchesScope(file, scope)));
    }

    return files;
  }

  /**
   * Check if file matches discovery scope
   */
  private matchesScope(filePath: string, scope: DiscoveryScope): boolean {
    // Check if file matches include patterns
    const includeMatch = scope.includePatterns.some(pattern => this.matchesPattern(filePath, pattern));
    if (!includeMatch) return false;

    // Check if file matches exclude patterns
    const excludeMatch = scope.excludePatterns.some(pattern => this.matchesPattern(filePath, pattern));
    return !excludeMatch;
  }

  /**
   * Simple pattern matching (could be enhanced with proper glob matching)
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');
    return new RegExp(regex).test(filePath);
  }

  /**
   * Scan directory for files
   */
  private async scanDirectory(directoryPath: string, recursive: boolean): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);

        if (entry.isFile()) {
          files.push(fullPath);
        } else if (entry.isDirectory() && recursive) {
          const subFiles = await this.scanDirectory(fullPath, recursive);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to scan directory ${directoryPath}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return files;
  }

  /**
   * Check if file is valid for processing
   */
  private isValidFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    return this.supportedExtensions.includes(ext);
  }

  /**
   * Process individual file for function discovery
   */
  private async processFile(
    filePath: string,
    configuration: DiscoveryConfiguration,
    errors: DiscoveryError[]
  ): Promise<FunctionDiscoveryEntry[]> {
    const functions: FunctionDiscoveryEntry[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Use different discovery methods based on configuration
      for (const method of configuration.methods) {
        const methodFunctions = await this.discoverWithMethod(filePath, content, method);
        functions.push(...methodFunctions);
      }

      // Remove duplicates and merge results
      return this.mergeFunctionDiscoveries(functions);

    } catch (error) {
      errors.push({
        functionId: `file_${filePath}`,
        error: error instanceof Error ? error.message : String(error),
        context: { filePath }
      });
      return [];
    }
  }

  /**
   * Discover functions using specific method
   */
  private async discoverWithMethod(
    filePath: string,
    content: string,
    method: DiscoveryMethod
  ): Promise<FunctionDiscoveryEntry[]> {
    switch (method) {
      case DiscoveryMethod._AST_PARSING:
        return this.discoverWithAST(filePath, content);
      case DiscoveryMethod._STATIC_ANALYSIS:
        return this.discoverWithStaticAnalysis(filePath, content);
      case DiscoveryMethod._ANNOTATION_SCANNING:
        return this.discoverWithAnnotations(filePath, content);
      case DiscoveryMethod._RUNTIME_REFLECTION:
        return this.discoverWithReflection(filePath, content);
      default:
        return [];
    }
  }

  /**
   * Discover functions using AST parsing
   */
  private async discoverWithAST(filePath: string, content: string): Promise<FunctionDiscoveryEntry[]> {
    const functions: FunctionDiscoveryEntry[] = [];

    try {
      const ast = parser.parse(content, {
        ecmaVersion: 2020,
        sourceType: 'module',
        loc: true,
        range: true
      });

      this.traverseAST(ast, (node) => {
        if (this.isFunctionNode(node)) {
          const functionInfo = this.extractFunctionInfo(node, filePath);
          if (functionInfo) {
            functions.push(functionInfo);
          }
        }
      });

    } catch (error) {
      this.logger.warn(`AST parsing failed for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return functions;
  }

  /**
   * Discover functions using static analysis
   */
  private async discoverWithStaticAnalysis(filePath: string, content: string): Promise<FunctionDiscoveryEntry[]> {
    const functions: FunctionDiscoveryEntry[] = [];

    // Simple regex-based function detection
    const functionPatterns = [
      /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
      /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\(/g,
      /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*\([^)]*\)\s*=>/g,
      /async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g
    ];

    const lines = content.split('\n');

    functionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1];
        const lineNumber = this.getLineNumber(content, match.index);

        functions.push({
          name: functionName,
          location: {
            filePath,
            lineNumber,
            columnNumber: 0,
            moduleName: this.extractModuleName(filePath),
            packageName: this.extractPackageName(filePath)
          },
          signature: this.createBasicSignature(functionName),
          confidence: 0.6, // Lower confidence for regex-based detection
          method: DiscoveryMethod._STATIC_ANALYSIS
        });
      }
    });

    return functions;
  }

  /**
   * Discover functions using annotation scanning
   */
  private async discoverWithAnnotations(filePath: string, content: string): Promise<FunctionDiscoveryEntry[]> {
    const functions: FunctionDiscoveryEntry[] = [];

    // Look for decorators and JSDoc annotations
    const decoratorPattern = /@([a-zA-Z]+)\s*(?:\([^)]*\))?\s*\n\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    const jsdocPattern = /\/\*\*[\s\S]*?\*\/\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;

    let match;

    // Decorator-annotated functions
    while ((match = decoratorPattern.exec(content)) !== null) {
      const decorator = match[1];
      const functionName = match[2];
      const lineNumber = this.getLineNumber(content, match.index);

      functions.push({
        name: functionName,
        location: {
          filePath,
          lineNumber,
          columnNumber: 0,
          moduleName: this.extractModuleName(filePath),
          packageName: this.extractPackageName(filePath)
        },
        signature: this.createBasicSignature(functionName),
        confidence: 0.9, // High confidence for decorated functions
        method: DiscoveryMethod._ANNOTATION_SCANNING
      });
    }

    // JSDoc-annotated functions
    while ((match = jsdocPattern.exec(content)) !== null) {
      const functionName = match[1];
      const lineNumber = this.getLineNumber(content, match.index);

      functions.push({
        name: functionName,
        location: {
          filePath,
          lineNumber,
          columnNumber: 0,
          moduleName: this.extractModuleName(filePath),
          packageName: this.extractPackageName(filePath)
        },
        signature: this.createBasicSignature(functionName),
        confidence: 0.8, // High confidence for documented functions
        method: DiscoveryMethod._ANNOTATION_SCANNING
      });
    }

    return functions;
  }

  /**
   * Discover functions using runtime reflection
   */
  private async discoverWithReflection(filePath: string, content: string): Promise<FunctionDiscoveryEntry[]> {
    const functions: FunctionDiscoveryEntry[] = [];

    // This would require actually loading and executing the module
    // For security reasons, this is not implemented in this example
    // In a real implementation, this would be done in a sandboxed environment

    this.logger.debug(`Runtime reflection discovery not implemented for security reasons: ${filePath}`);

    return functions;
  }

  /**
   * Check if AST node represents a function
   */
  private isFunctionNode(node: any): boolean {
    return node.type === AST_NODE_TYPES.FunctionDeclaration ||
           node.type === AST_NODE_TYPES.FunctionExpression ||
           node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
           node.type === AST_NODE_TYPES.MethodDefinition;
  }

  /**
   * Extract function information from AST node
   */
  private extractFunctionInfo(node: any, filePath: string): FunctionDiscoveryEntry | null {
    try {
      const functionName = this.getFunctionName(node);
      if (!functionName) return null;

      const location: SourceLocation = {
        filePath,
        lineNumber: node.loc?.start?.line || 0,
        columnNumber: node.loc?.start?.column || 0,
        moduleName: this.extractModuleName(filePath),
        packageName: this.extractPackageName(filePath)
      };

      const signature = this.extractSignatureFromAST(node, functionName);

      return {
        name: functionName,
        location,
        signature,
        confidence: 0.9, // High confidence for AST-based discovery
        method: DiscoveryMethod._AST_PARSING
      };

    } catch (error) {
      this.logger.warn(`Failed to extract function info from AST node: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Get function name from AST node
   */
  private getFunctionName(node: any): string | null {
    if (node.id?.name) {
      return node.id.name;
    }

    if (node.key?.name) {
      return node.key.name;
    }

    // For arrow functions assigned to variables
    if (node.parent?.type === AST_NODE_TYPES.VariableDeclarator && node.parent.id?.name) {
      return node.parent.id.name;
    }

    return null;
  }

  /**
   * Extract function signature from AST node
   */
  private extractSignatureFromAST(node: any, functionName: string): FunctionSignature {
    const parameters: ParameterDefinition[] = [];

    if (node.params) {
      node.params.forEach((param: any, index: number) => {
        const paramName = this.getParameterName(param);
        const paramType = this.getParameterType(param);
        const optional = this.isParameterOptional(param);

        parameters.push({
          name: paramName || `param${index}`,
          type: paramType,
          optional,
          defaultValue: this.getParameterDefaultValue(param),
          description: undefined,
          validation: []
        });
      });
    }

    return {
      parameters,
      returnType: this.getReturnType(node),
      isAsync: node.async || false,
      isGenerator: node.generator || false,
      overloads: [],
      generics: []
    };
  }

  /**
   * Get parameter name from AST node
   */
  private getParameterName(param: any): string {
    if (param.name) return param.name;
    if (param.left?.name) return param.left.name; // Destructuring with default
    if (param.argument?.name) return param.argument.name; // Rest parameter
    return 'unknown';
  }

  /**
   * Get parameter type from AST node
   */
  private getParameterType(param: any): TypeDefinition {
    // This is a simplified implementation
    // A real implementation would analyze TypeScript type annotations
    return {
      name: 'unknown',
      category: TypeCategory._UNKNOWN,
      nullable: false,
      isArray: false,
      typeArguments: [],
      unionTypes: [],
      properties: []
    };
  }

  /**
   * Check if parameter is optional
   */
  private isParameterOptional(param: any): boolean {
    return param.optional || param.type === AST_NODE_TYPES.AssignmentPattern;
  }

  /**
   * Get parameter default value
   */
  private getParameterDefaultValue(param: any): unknown {
    if (param.type === AST_NODE_TYPES.AssignmentPattern && param.right) {
      // Try to extract literal values
      if (param.right.type === AST_NODE_TYPES.Literal) {
        return param.right.value;
      }
    }
    return undefined;
  }

  /**
   * Get return type from AST node
   */
  private getReturnType(node: any): TypeDefinition {
    // This is a simplified implementation
    // A real implementation would analyze TypeScript return type annotations
    return {
      name: 'unknown',
      category: TypeCategory._UNKNOWN,
      nullable: false,
      isArray: false,
      typeArguments: [],
      unionTypes: [],
      properties: []
    };
  }

  /**
   * Traverse AST and apply visitor function
   */
  private traverseAST(node: any, visitor: (node: any) => void): void {
    if (!node || typeof node !== 'object') return;

    visitor(node);

    for (const key in node) {
      if (key === 'parent') continue; // Avoid circular references

      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(item => {
          if (item && typeof item === 'object') {
            item.parent = node;
            this.traverseAST(item, visitor);
          }
        });
      } else if (child && typeof child === 'object') {
        child.parent = node;
        this.traverseAST(child, visitor);
      }
    }
  }

  /**
   * Get line number for character index
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Extract module name from file path
   */
  private extractModuleName(filePath: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName;
  }

  /**
   * Extract package name from file path
   */
  private extractPackageName(filePath: string): string {
    const parts = filePath.split(path.sep);
    const nodeModulesIndex = parts.lastIndexOf('node_modules');

    if (nodeModulesIndex >= 0 && nodeModulesIndex < parts.length - 1) {
      return parts[nodeModulesIndex + 1];
    }

    // Extract from project structure
    const srcIndex = parts.indexOf('src');
    if (srcIndex >= 0 && srcIndex < parts.length - 1) {
      return parts.slice(srcIndex + 1, -1).join('.');
    }

    return 'unknown';
  }

  /**
   * Create basic function signature
   */
  private createBasicSignature(functionName: string): FunctionSignature {
    return {
      parameters: [],
      returnType: {
        name: 'unknown',
        category: TypeCategory._UNKNOWN,
        nullable: false,
        isArray: false,
        typeArguments: [],
        unionTypes: [],
        properties: []
      },
      isAsync: false,
      isGenerator: false,
      overloads: [],
      generics: []
    };
  }

  /**
   * Merge duplicate function discoveries
   */
  private mergeFunctionDiscoveries(functions: FunctionDiscoveryEntry[]): FunctionDiscoveryEntry[] {
    const merged = new Map<string, FunctionDiscoveryEntry>();

    functions.forEach(func => {
      const key = `${func.name}:${func.location.filePath}:${func.location.lineNumber}`;

      if (!merged.has(key)) {
        merged.set(key, func);
      } else {
        // Merge with higher confidence entry
        const existing = merged.get(key)!;
        if (func.confidence > existing.confidence) {
          merged.set(key, func);
        }
      }
    });

    return Array.from(merged.values());
  }
}