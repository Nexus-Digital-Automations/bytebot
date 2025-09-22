/**
 * Documentation Integration and Management System - Main Export Module
 *
 * This module provides the complete documentation infrastructure for the AIgent
 * platform, including code generation, deployment documentation, interactive
 * platforms, automation, infrastructure optimization, analytics, and quality
 * standards.
 *
 * @fileoverview Main export module for comprehensive documentation system
 * @version 1.0.0
 * @author Documentation Infrastructure Agent
 */

// Core Documentation Components
export { CodeDocumentationGenerator, DEFAULT_DOC_CONFIG } from './code-doc-generator';
export { DeploymentDocumentationManager, DEFAULT_DEPLOYMENT_CONFIG } from './deployment-doc-manager';
export { InteractiveDocumentationPlatform, DEFAULT_INTERACTIVE_CONFIG } from './interactive-docs-platform';

// Automation and Infrastructure
export { DocumentationAutomationEngine, DEFAULT_AUTOMATION_CONFIG } from './automation-engine';
export { DocumentationInfrastructureManager, DEFAULT_INFRASTRUCTURE_CONFIG } from './infrastructure-manager';

// Analytics and Quality
export { DocumentationAnalyticsMonitor, DEFAULT_ANALYTICS_CONFIG } from './analytics-monitor';
export { DocumentationQualityStandards, DEFAULT_QUALITY_STANDARDS } from './quality-standards';

// Central Orchestration
export { DocumentationOrchestrator, DEFAULT_ORCHESTRATOR_CONFIG } from './documentation-orchestrator';

// Type Definitions
export type {
  // Code Documentation Types
  DocumentationConfig,
  DocumentationEntry,
  DocumentationStats,

  // Deployment Documentation Types
  DeploymentDocConfig,
  EnvironmentDoc,
  RunbookEntry,
  TroubleshootingGuide,

  // Interactive Platform Types
  InteractiveDocsConfig,
  DocumentationPage,
  NavigationNode,
  SearchResult,
  UserFeedback,
  AnalyticsData,

  // Automation Types
  AutomationConfig,
  AutomationResult,
  ValidationResult,
  QualityCheck,

  // Infrastructure Types
  InfrastructureConfig,
  OptimizationResult,
  PerformanceTargets,
  OptimizationSettings,

  // Analytics Types
  AnalyticsConfig,
  AnalyticsEvent,
  PerformanceMetrics,
  SearchAnalytics,
  AnalyticsReport,

  // Quality Standards Types
  QualityStandardsConfig,
  QualityAssessment,
  QualityGate,
  ComplianceFramework,

  // Orchestrator Types
  OrchestratorConfig,
  OrchestrationResult,
  ComponentResult,
  OrchestrationMetrics,
} from './code-doc-generator';

/**
 * Documentation System Factory
 *
 * Factory class for creating and configuring the complete documentation system
 * with sensible defaults and easy configuration.
 */
export class DocumentationSystemFactory {
  /**
   * Create a complete documentation system with default configuration
   *
   * @param projectName - Name of the project
   * @param projectRoot - Root directory of the project
   * @returns Configured DocumentationOrchestrator instance
   */
  public static createDefault(projectName: string, projectRoot: string): DocumentationOrchestrator {
    return new DocumentationOrchestrator({
      projectName,
      projectRoot,
      integrationLevel: 'standard',
      enableCodeGeneration: true,
      enableDeploymentDocs: true,
      enableInteractivePlatform: true,
      enableAutomation: true,
      enableInfrastructure: true,
      enableAnalytics: true,
      enableQualityStandards: true,
    });
  }

  /**
   * Create a minimal documentation system for small projects
   *
   * @param projectName - Name of the project
   * @param projectRoot - Root directory of the project
   * @returns Configured DocumentationOrchestrator instance
   */
  public static createMinimal(projectName: string, projectRoot: string): DocumentationOrchestrator {
    return new DocumentationOrchestrator({
      projectName,
      projectRoot,
      integrationLevel: 'basic',
      enableCodeGeneration: true,
      enableDeploymentDocs: false,
      enableInteractivePlatform: true,
      enableAutomation: false,
      enableInfrastructure: false,
      enableAnalytics: false,
      enableQualityStandards: true,
    });
  }

  /**
   * Create an enterprise documentation system with all features
   *
   * @param projectName - Name of the project
   * @param projectRoot - Root directory of the project
   * @returns Configured DocumentationOrchestrator instance
   */
  public static createEnterprise(projectName: string, projectRoot: string): DocumentationOrchestrator {
    return new DocumentationOrchestrator({
      projectName,
      projectRoot,
      integrationLevel: 'enterprise',
      enableCodeGeneration: true,
      enableDeploymentDocs: true,
      enableInteractivePlatform: true,
      enableAutomation: true,
      enableInfrastructure: true,
      enableAnalytics: true,
      enableQualityStandards: true,
    });
  }

  /**
   * Create a custom documentation system with specific configuration
   *
   * @param config - Custom orchestrator configuration
   * @returns Configured DocumentationOrchestrator instance
   */
  public static createCustom(config: Partial<OrchestratorConfig>): DocumentationOrchestrator {
    return new DocumentationOrchestrator(config);
  }
}

/**
 * Documentation System Utilities
 *
 * Utility functions for working with the documentation system.
 */
export class DocumentationUtils {
  /**
   * Validate project structure for documentation generation
   *
   * @param projectRoot - Root directory of the project
   * @returns Validation result with recommendations
   */
  public static async validateProjectStructure(projectRoot: string): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const fs = await import('fs-extra');
      const path = await import('path');

      // Check if project root exists
      if (!(await fs.pathExists(projectRoot))) {
        issues.push('Project root directory does not exist');
        return { valid: false, issues, recommendations };
      }

      // Check for source directories
      const commonSourceDirs = ['src', 'lib', 'packages', 'apps'];
      const hasSourceDir = await Promise.all(
        commonSourceDirs.map(dir => fs.pathExists(path.join(projectRoot, dir)))
      );

      if (!hasSourceDir.some(exists => exists)) {
        issues.push('No common source directories found (src, lib, packages, apps)');
        recommendations.push('Ensure your project has a standard source directory structure');
      }

      // Check for package.json
      const packageJsonPath = path.join(projectRoot, 'package.json');
      if (!(await fs.pathExists(packageJsonPath))) {
        issues.push('package.json not found');
        recommendations.push('Ensure package.json exists in the project root');
      }

      // Check for TypeScript configuration
      const tsConfigPath = path.join(projectRoot, 'tsconfig.json');
      if (!(await fs.pathExists(tsConfigPath))) {
        recommendations.push('Consider adding tsconfig.json for better TypeScript documentation');
      }

      // Check for existing documentation
      const docsDir = path.join(projectRoot, 'docs');
      if (!(await fs.pathExists(docsDir))) {
        recommendations.push('Consider creating a docs directory for additional documentation');
      }

      return {
        valid: issues.length === 0,
        issues,
        recommendations,
      };

    } catch (error) {
      issues.push(`Error validating project structure: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, issues, recommendations };
    }
  }

  /**
   * Generate documentation configuration based on project analysis
   *
   * @param projectRoot - Root directory of the project
   * @returns Recommended orchestrator configuration
   */
  public static async generateRecommendedConfig(projectRoot: string): Promise<Partial<OrchestratorConfig>> {
    const fs = await import('fs-extra');
    const path = await import('path');

    const config: Partial<OrchestratorConfig> = {
      projectRoot,
      outputDirectory: 'docs-generated',
    };

    try {
      // Detect project type and name
      const packageJsonPath = path.join(projectRoot, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        config.projectName = packageJson.name || 'Unknown Project';
      }

      // Detect monorepo structure
      const workspacesConfig = await this.detectWorkspaces(projectRoot);
      if (workspacesConfig.isMonorepo) {
        config.integrationLevel = 'enterprise';
        config.enableDeploymentDocs = true;
      } else {
        config.integrationLevel = 'standard';
      }

      // Detect documentation complexity needs
      const codeComplexity = await this.analyzeCodeComplexity(projectRoot);
      if (codeComplexity.high) {
        config.enableQualityStandards = true;
        config.enableAnalytics = true;
      }

      // Detect CI/CD setup
      const hasCICD = await this.detectCICD(projectRoot);
      if (hasCICD) {
        config.enableAutomation = true;
      }

    } catch (error) {
      // Use defaults if analysis fails
    }

    return config;
  }

  /**
   * Detect workspace/monorepo configuration
   */
  private static async detectWorkspaces(projectRoot: string): Promise<{ isMonorepo: boolean; workspaces: string[] }> {
    const fs = await import('fs-extra');
    const path = await import('path');

    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        if (packageJson.workspaces) {
          return {
            isMonorepo: true,
            workspaces: Array.isArray(packageJson.workspaces) ? packageJson.workspaces : packageJson.workspaces.packages || [],
          };
        }
      }

      // Check for lerna.json
      const lernaJsonPath = path.join(projectRoot, 'lerna.json');
      if (await fs.pathExists(lernaJsonPath)) {
        const lernaJson = await fs.readJson(lernaJsonPath);
        return {
          isMonorepo: true,
          workspaces: lernaJson.packages || [],
        };
      }

      return { isMonorepo: false, workspaces: [] };

    } catch (error) {
      return { isMonorepo: false, workspaces: [] };
    }
  }

  /**
   * Analyze code complexity
   */
  private static async analyzeCodeComplexity(projectRoot: string): Promise<{ high: boolean; fileCount: number }> {
    try {
      const { glob } = await import('glob');
      const sourceFiles = await glob(`${projectRoot}/**/*.{ts,tsx,js,jsx}`, {
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      });

      return {
        high: sourceFiles.length > 100,
        fileCount: sourceFiles.length,
      };

    } catch (error) {
      return { high: false, fileCount: 0 };
    }
  }

  /**
   * Detect CI/CD configuration
   */
  private static async detectCICD(projectRoot: string): Promise<boolean> {
    const fs = await import('fs-extra');
    const path = await import('path');

    const cicdPaths = [
      '.github/workflows',
      '.gitlab-ci.yml',
      'Jenkinsfile',
      '.travis.yml',
      'azure-pipelines.yml',
      '.circleci/config.yml',
    ];

    for (const cicdPath of cicdPaths) {
      if (await fs.pathExists(path.join(projectRoot, cicdPath))) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Quick Start Documentation System
 *
 * Convenience class for quickly setting up and running documentation generation.
 */
export class QuickStartDocumentation {
  /**
   * Generate documentation with minimal setup
   *
   * @param projectName - Name of the project
   * @param projectRoot - Root directory of the project (optional, defaults to current directory)
   * @returns Promise that resolves when documentation is generated
   */
  public static async generate(projectName: string, projectRoot: string = process.cwd()): Promise<OrchestrationResult> {
    const orchestrator = DocumentationSystemFactory.createDefault(projectName, projectRoot);
    return orchestrator.generateComprehensiveDocumentation();
  }

  /**
   * Validate and generate documentation
   *
   * @param projectName - Name of the project
   * @param projectRoot - Root directory of the project (optional, defaults to current directory)
   * @returns Promise that resolves when documentation is generated
   */
  public static async validateAndGenerate(projectName: string, projectRoot: string = process.cwd()): Promise<OrchestrationResult> {
    // Validate project structure
    const validation = await DocumentationUtils.validateProjectStructure(projectRoot);

    if (!validation.valid) {
      throw new Error(`Project validation failed: ${validation.issues.join(', ')}`);
    }

    // Generate recommended configuration
    const config = await DocumentationUtils.generateRecommendedConfig(projectRoot);
    config.projectName = projectName;

    // Create and run orchestrator
    const orchestrator = DocumentationSystemFactory.createCustom(config);
    return orchestrator.generateComprehensiveDocumentation();
  }
}

// Default export for convenience
export default DocumentationOrchestrator;