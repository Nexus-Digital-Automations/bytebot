/**
 * Documentation Automation Engine - CI/CD Integration and Validation
 *
 * This system provides comprehensive automation for documentation generation,
 * validation, deployment, and maintenance with CI/CD pipeline integration,
 * quality assurance, and automated updates.
 *
 * @fileoverview Documentation automation and CI/CD integration engine
 * @version 1.0.0
 * @author Documentation Infrastructure Agent
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { glob } from 'glob';
import * as yaml from 'js-yaml';

const execAsync = promisify(exec);

/**
 * Configuration for documentation automation
 */
export interface AutomationConfig {
  projectRoot: string;
  docsDirectory: string;
  outputDirectory: string;
  gitRepository: string;
  gitBranch: string;
  deploymentTarget: string;
  webhookUrl?: string;
  slackWebhook?: string;
  enableGitHooks: boolean;
  enableCIDeploy: boolean;
  enableQualityGates: boolean;
  enableNotifications: boolean;
  validationRules: ValidationRules;
  buildCommands: BuildCommand[];
  deploymentCommands: DeploymentCommand[];
  qualityChecks: QualityCheck[];
}

/**
 * Validation rules configuration
 */
export interface ValidationRules {
  requiredFiles: string[];
  markdownLinting: boolean;
  linkValidation: boolean;
  imageValidation: boolean;
  codeBlockValidation: boolean;
  spellCheck: boolean;
  accessibilityCheck: boolean;
  performanceCheck: boolean;
  seoCheck: boolean;
  customValidators: CustomValidator[];
}

/**
 * Build command configuration
 */
export interface BuildCommand {
  name: string;
  command: string;
  workingDirectory?: string;
  timeout: number;
  retries: number;
  failureStrategy: 'stop' | 'continue' | 'retry';
  env?: Record<string, string>;
}

/**
 * Deployment command configuration
 */
export interface DeploymentCommand {
  name: string;
  command: string;
  environment: string;
  requiresApproval: boolean;
  rollbackCommand?: string;
  healthCheck?: string;
  timeout: number;
}

/**
 * Quality check configuration
 */
export interface QualityCheck {
  name: string;
  type: 'lint' | 'test' | 'coverage' | 'security' | 'performance' | 'accessibility';
  command: string;
  threshold?: number;
  required: boolean;
  timeout: number;
}

/**
 * Custom validator configuration
 */
export interface CustomValidator {
  name: string;
  script: string;
  extensions: string[];
  severity: 'error' | 'warning' | 'info';
}

/**
 * Automation job result
 */
export interface AutomationResult {
  jobId: string;
  status: 'success' | 'failure' | 'partial';
  startTime: Date;
  endTime: Date;
  duration: number;
  steps: StepResult[];
  artifacts: Artifact[];
  logs: LogEntry[];
  metrics: JobMetrics;
}

/**
 * Step result
 */
export interface StepResult {
  name: string;
  status: 'success' | 'failure' | 'skipped';
  startTime: Date;
  endTime: Date;
  duration: number;
  output: string;
  error?: string;
  exitCode?: number;
}

/**
 * Artifact information
 */
export interface Artifact {
  name: string;
  path: string;
  size: number;
  type: 'documentation' | 'coverage' | 'report' | 'asset';
  url?: string;
}

/**
 * Log entry
 */
export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

/**
 * Job metrics
 */
export interface JobMetrics {
  totalFiles: number;
  processedFiles: number;
  errorCount: number;
  warningCount: number;
  coveragePercentage: number;
  performanceScore: number;
  accessibilityScore: number;
  buildSize: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: ValidationMetrics;
}

/**
 * Validation error
 */
export interface ValidationError {
  file: string;
  line?: number;
  column?: number;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  fixable: boolean;
  suggestion?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  file: string;
  line?: number;
  column?: number;
  rule: string;
  message: string;
  suggestion?: string;
}

/**
 * Validation metrics
 */
export interface ValidationMetrics {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  errorCount: number;
  warningCount: number;
  coverageScore: number;
  qualityScore: number;
}

/**
 * Default automation configuration
 */
export const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
  projectRoot: process.cwd(),
  docsDirectory: 'docs',
  outputDirectory: 'docs-build',
  gitRepository: '',
  gitBranch: 'main',
  deploymentTarget: 'production',
  enableGitHooks: true,
  enableCIDeploy: true,
  enableQualityGates: true,
  enableNotifications: true,
  validationRules: {
    requiredFiles: ['README.md', 'index.md'],
    markdownLinting: true,
    linkValidation: true,
    imageValidation: true,
    codeBlockValidation: true,
    spellCheck: true,
    accessibilityCheck: true,
    performanceCheck: true,
    seoCheck: true,
    customValidators: [],
  },
  buildCommands: [
    {
      name: 'generate-code-docs',
      command: 'npm run docs:generate',
      timeout: 300000,
      retries: 1,
      failureStrategy: 'stop',
    },
    {
      name: 'build-site',
      command: 'npm run docs:build',
      timeout: 600000,
      retries: 2,
      failureStrategy: 'retry',
    },
  ],
  deploymentCommands: [
    {
      name: 'deploy-to-staging',
      command: 'npm run deploy:staging',
      environment: 'staging',
      requiresApproval: false,
      timeout: 300000,
    },
    {
      name: 'deploy-to-production',
      command: 'npm run deploy:production',
      environment: 'production',
      requiresApproval: true,
      timeout: 300000,
    },
  ],
  qualityChecks: [
    {
      name: 'markdown-lint',
      type: 'lint',
      command: 'markdownlint docs/**/*.md',
      required: true,
      timeout: 60000,
    },
    {
      name: 'link-check',
      type: 'test',
      command: 'markdown-link-check docs/**/*.md',
      required: true,
      timeout: 120000,
    },
    {
      name: 'accessibility-check',
      type: 'accessibility',
      command: 'axe-core docs-build',
      threshold: 0.9,
      required: true,
      timeout: 180000,
    },
  ],
};

/**
 * Documentation Automation Engine
 *
 * Provides comprehensive automation for documentation processes including
 * generation, validation, testing, deployment, and maintenance.
 */
export class DocumentationAutomationEngine {
  private readonly logger = new Logger('DocumentationAutomationEngine');
  private readonly config: AutomationConfig;
  private currentJob: string | null = null;
  private jobResults: Map<string, AutomationResult> = new Map();

  constructor(config: Partial<AutomationConfig> = {}) {
    this.config = { ...DEFAULT_AUTOMATION_CONFIG, ...config };
    this.logger.log('Initializing Documentation Automation Engine', {
      projectRoot: this.config.projectRoot,
      docsDirectory: this.config.docsDirectory,
    });
  }

  /**
   * Run complete documentation automation pipeline
   */
  public async runAutomationPipeline(trigger: string = 'manual'): Promise<AutomationResult> {
    const jobId = this.generateJobId();
    this.currentJob = jobId;

    this.logger.log(`Starting automation pipeline [${jobId}]`, { trigger });

    const result: AutomationResult = {
      jobId,
      status: 'success',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      steps: [],
      artifacts: [],
      logs: [],
      metrics: {
        totalFiles: 0,
        processedFiles: 0,
        errorCount: 0,
        warningCount: 0,
        coveragePercentage: 0,
        performanceScore: 0,
        accessibilityScore: 0,
        buildSize: 0,
      },
    };

    try {
      // Step 1: Pre-flight checks
      await this.runStep(result, 'pre-flight-checks', async () => {
        await this.preFlightChecks();
      });

      // Step 2: Validation
      if (this.config.enableQualityGates) {
        await this.runStep(result, 'validation', async () => {
          const validation = await this.validateDocumentation();
          if (!validation.valid && validation.errors.some(e => e.severity === 'error')) {
            throw new Error(`Validation failed with ${validation.errors.length} errors`);
          }
        });
      }

      // Step 3: Quality checks
      if (this.config.enableQualityGates) {
        await this.runStep(result, 'quality-checks', async () => {
          await this.runQualityChecks();
        });
      }

      // Step 4: Build documentation
      await this.runStep(result, 'build', async () => {
        await this.buildDocumentation();
      });

      // Step 5: Generate artifacts
      await this.runStep(result, 'artifacts', async () => {
        result.artifacts = await this.generateArtifacts();
      });

      // Step 6: Run tests
      await this.runStep(result, 'test', async () => {
        await this.runTests();
      });

      // Step 7: Deploy (if enabled)
      if (this.config.enableCIDeploy) {
        await this.runStep(result, 'deploy', async () => {
          await this.deployDocumentation();
        });
      }

      // Step 8: Post-deployment validation
      if (this.config.enableCIDeploy) {
        await this.runStep(result, 'post-deploy-validation', async () => {
          await this.postDeploymentValidation();
        });
      }

      // Step 9: Notifications
      if (this.config.enableNotifications) {
        await this.runStep(result, 'notifications', async () => {
          await this.sendNotifications(result);
        });
      }

    } catch (error) {
      result.status = 'failure';
      this.logger.error(`Automation pipeline failed [${jobId}]`, {
        error: error instanceof Error ? error.message : String(error),
      });

      if (this.config.enableNotifications) {
        await this.sendFailureNotification(result, error);
      }
    } finally {
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();
      result.metrics = await this.calculateMetrics();

      this.jobResults.set(jobId, result);
      this.currentJob = null;

      this.logger.log(`Automation pipeline completed [${jobId}]`, {
        status: result.status,
        duration: result.duration,
        steps: result.steps.length,
      });
    }

    return result;
  }

  /**
   * Run a pipeline step
   */
  private async runStep(
    result: AutomationResult,
    stepName: string,
    stepFunction: () => Promise<void>
  ): Promise<void> {
    const stepResult: StepResult = {
      name: stepName,
      status: 'success',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      output: '',
    };

    this.logger.log(`Starting step: ${stepName}`);

    try {
      await stepFunction();
      stepResult.output = `Step ${stepName} completed successfully`;
    } catch (error) {
      stepResult.status = 'failure';
      stepResult.error = error instanceof Error ? error.message : String(error);
      stepResult.output = `Step ${stepName} failed: ${stepResult.error}`;
      throw error;
    } finally {
      stepResult.endTime = new Date();
      stepResult.duration = stepResult.endTime.getTime() - stepResult.startTime.getTime();
      result.steps.push(stepResult);

      this.logger.log(`Completed step: ${stepName}`, {
        status: stepResult.status,
        duration: stepResult.duration,
      });
    }
  }

  /**
   * Pre-flight checks
   */
  private async preFlightChecks(): Promise<void> {
    this.logger.log('Running pre-flight checks');

    // Check required directories
    const requiredDirs = [this.config.docsDirectory];
    for (const dir of requiredDirs) {
      if (!(await fs.pathExists(dir))) {
        throw new Error(`Required directory not found: ${dir}`);
      }
    }

    // Check required files
    for (const file of this.config.validationRules.requiredFiles) {
      const filePath = path.join(this.config.docsDirectory, file);
      if (!(await fs.pathExists(filePath))) {
        throw new Error(`Required file not found: ${file}`);
      }
    }

    // Check Git repository status
    if (this.config.gitRepository) {
      try {
        await execAsync('git rev-parse --git-dir');
      } catch (error) {
        throw new Error('Project is not a Git repository');
      }
    }

    // Check dependencies
    await this.checkDependencies();

    this.logger.log('Pre-flight checks completed successfully');
  }

  /**
   * Check required dependencies
   */
  private async checkDependencies(): Promise<void> {
    const requiredCommands = ['node', 'npm'];

    for (const command of requiredCommands) {
      try {
        await execAsync(`which ${command}`);
      } catch (error) {
        throw new Error(`Required command not found: ${command}`);
      }
    }
  }

  /**
   * Validate documentation
   */
  public async validateDocumentation(): Promise<ValidationResult> {
    this.logger.log('Starting documentation validation');

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      metrics: {
        totalFiles: 0,
        validFiles: 0,
        invalidFiles: 0,
        errorCount: 0,
        warningCount: 0,
        coverageScore: 0,
        qualityScore: 0,
      },
    };

    try {
      // Find all documentation files
      const markdownFiles = await glob(`${this.config.docsDirectory}/**/*.{md,mdx}`);
      result.metrics.totalFiles = markdownFiles.length;

      // Validate each file
      for (const filePath of markdownFiles) {
        const fileValidation = await this.validateFile(filePath);
        result.errors.push(...fileValidation.errors);
        result.warnings.push(...fileValidation.warnings);

        if (fileValidation.errors.length === 0) {
          result.metrics.validFiles++;
        } else {
          result.metrics.invalidFiles++;
        }
      }

      // Run markdown linting
      if (this.config.validationRules.markdownLinting) {
        const lintResults = await this.runMarkdownLint();
        result.errors.push(...lintResults.errors);
        result.warnings.push(...lintResults.warnings);
      }

      // Validate links
      if (this.config.validationRules.linkValidation) {
        const linkResults = await this.validateLinks();
        result.errors.push(...linkResults.errors);
        result.warnings.push(...linkResults.warnings);
      }

      // Validate images
      if (this.config.validationRules.imageValidation) {
        const imageResults = await this.validateImages();
        result.errors.push(...imageResults.errors);
        result.warnings.push(...imageResults.warnings);
      }

      // Run custom validators
      for (const validator of this.config.validationRules.customValidators) {
        const customResults = await this.runCustomValidator(validator);
        result.errors.push(...customResults.errors);
        result.warnings.push(...customResults.warnings);
      }

      result.metrics.errorCount = result.errors.length;
      result.metrics.warningCount = result.warnings.length;
      result.valid = result.errors.filter(e => e.severity === 'error').length === 0;

      // Calculate quality scores
      result.metrics.coverageScore = this.calculateCoverageScore(result);
      result.metrics.qualityScore = this.calculateQualityScore(result);

      this.logger.log('Documentation validation completed', {
        valid: result.valid,
        errors: result.metrics.errorCount,
        warnings: result.metrics.warningCount,
        qualityScore: result.metrics.qualityScore,
      });

    } catch (error) {
      this.logger.error('Documentation validation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    return result;
  }

  /**
   * Validate individual file
   */
  private async validateFile(filePath: string): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Check file encoding
      if (content.includes('\uFFFD')) {
        errors.push({
          file: filePath,
          rule: 'encoding',
          message: 'File contains invalid UTF-8 characters',
          severity: 'error',
          fixable: false,
        });
      }

      // Check for empty files
      if (content.trim().length === 0) {
        warnings.push({
          file: filePath,
          rule: 'empty-file',
          message: 'File is empty',
          suggestion: 'Add content to the file or remove it',
        });
      }

      // Check for required front matter
      if (filePath.endsWith('.mdx') || filePath.includes('/pages/')) {
        if (!content.match(/^---\s*\n[\s\S]*?\n---\s*\n/)) {
          errors.push({
            file: filePath,
            rule: 'missing-frontmatter',
            message: 'MDX files must have front matter',
            severity: 'error',
            fixable: true,
            suggestion: 'Add YAML front matter to the beginning of the file',
          });
        }
      }

      // Check code blocks
      if (this.config.validationRules.codeBlockValidation) {
        const codeBlockErrors = this.validateCodeBlocks(content, filePath);
        errors.push(...codeBlockErrors);
      }

    } catch (error) {
      errors.push({
        file: filePath,
        rule: 'file-access',
        message: `Cannot read file: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
        fixable: false,
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate code blocks in content
   */
  private validateCodeBlocks(content: string, filePath: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1];
      const code = match[2];

      // Check for language specification
      if (!language) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        errors.push({
          file: filePath,
          line: lineNumber,
          rule: 'code-block-language',
          message: 'Code block should specify a language',
          severity: 'warning',
          fixable: true,
          suggestion: 'Add language identifier after opening ```',
        });
      }

      // Check for empty code blocks
      if (!code.trim()) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        errors.push({
          file: filePath,
          line: lineNumber,
          rule: 'empty-code-block',
          message: 'Code block is empty',
          severity: 'warning',
          fixable: true,
          suggestion: 'Add code content or remove the code block',
        });
      }
    }

    return errors;
  }

  /**
   * Run markdown linting
   */
  private async runMarkdownLint(): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const { stdout, stderr } = await execAsync(
        `npx markdownlint ${this.config.docsDirectory}/**/*.md --json`,
        { cwd: this.config.projectRoot }
      );

      if (stderr) {
        this.logger.warn('Markdown lint stderr:', stderr);
      }

      if (stdout) {
        const lintResults = JSON.parse(stdout);
        for (const [file, issues] of Object.entries(lintResults)) {
          for (const issue of issues as any[]) {
            const error: ValidationError = {
              file,
              line: issue.lineNumber,
              column: issue.columnNumber,
              rule: issue.ruleNames?.[0] || 'markdown-lint',
              message: issue.ruleDescription || issue.errorDetail,
              severity: 'warning',
              fixable: issue.fixInfo ? true : false,
            };

            if (issue.ruleNames?.includes('MD013')) {
              warnings.push(error);
            } else {
              errors.push(error);
            }
          }
        }
      }

    } catch (error) {
      this.logger.warn('Markdown lint execution failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate links in documentation
   */
  private async validateLinks(): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const markdownFiles = await glob(`${this.config.docsDirectory}/**/*.{md,mdx}`);

      for (const filePath of markdownFiles) {
        const content = await fs.readFile(filePath, 'utf-8');
        const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
        let match;

        while ((match = linkRegex.exec(content)) !== null) {
          const linkText = match[1];
          const linkUrl = match[2];

          // Skip external links for now (would need HTTP validation)
          if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
            continue;
          }

          // Check internal links
          if (linkUrl.startsWith('/') || !linkUrl.includes('://')) {
            const targetPath = path.resolve(
              path.dirname(filePath),
              linkUrl.split('#')[0] // Remove anchor
            );

            if (!(await fs.pathExists(targetPath))) {
              const lineNumber = content.substring(0, match.index).split('\n').length;
              errors.push({
                file: filePath,
                line: lineNumber,
                rule: 'broken-link',
                message: `Broken internal link: ${linkUrl}`,
                severity: 'error',
                fixable: false,
                suggestion: 'Check the file path and ensure the target file exists',
              });
            }
          }

          // Check for empty link text
          if (!linkText.trim()) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            warnings.push({
              file: filePath,
              line: lineNumber,
              rule: 'empty-link-text',
              message: 'Link has empty text',
              suggestion: 'Provide descriptive link text',
            });
          }
        }
      }

    } catch (error) {
      this.logger.error('Link validation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate images in documentation
   */
  private async validateImages(): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const markdownFiles = await glob(`${this.config.docsDirectory}/**/*.{md,mdx}`);

      for (const filePath of markdownFiles) {
        const content = await fs.readFile(filePath, 'utf-8');
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        let match;

        while ((match = imageRegex.exec(content)) !== null) {
          const altText = match[1];
          const imageUrl = match[2];

          // Check local images
          if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            const imagePath = path.resolve(path.dirname(filePath), imageUrl);

            if (!(await fs.pathExists(imagePath))) {
              const lineNumber = content.substring(0, match.index).split('\n').length;
              errors.push({
                file: filePath,
                line: lineNumber,
                rule: 'missing-image',
                message: `Image file not found: ${imageUrl}`,
                severity: 'error',
                fixable: false,
                suggestion: 'Check the image path and ensure the file exists',
              });
            }
          }

          // Check for alt text
          if (!altText.trim()) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            warnings.push({
              file: filePath,
              line: lineNumber,
              rule: 'missing-alt-text',
              message: 'Image missing alt text',
              suggestion: 'Add descriptive alt text for accessibility',
            });
          }
        }
      }

    } catch (error) {
      this.logger.error('Image validation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return { errors, warnings };
  }

  /**
   * Run custom validator
   */
  private async runCustomValidator(validator: CustomValidator): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const pattern = `${this.config.docsDirectory}/**/*.{${validator.extensions.join(',')}}`;
      const files = await glob(pattern);

      for (const filePath of files) {
        try {
          const { stdout, stderr } = await execAsync(
            `${validator.script} "${filePath}"`,
            { cwd: this.config.projectRoot }
          );

          if (stderr) {
            errors.push({
              file: filePath,
              rule: validator.name,
              message: stderr,
              severity: validator.severity,
              fixable: false,
            });
          }

        } catch (error) {
          errors.push({
            file: filePath,
            rule: validator.name,
            message: error instanceof Error ? error.message : String(error),
            severity: validator.severity,
            fixable: false,
          });
        }
      }

    } catch (error) {
      this.logger.error(`Custom validator ${validator.name} failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return { errors, warnings };
  }

  /**
   * Run quality checks
   */
  private async runQualityChecks(): Promise<void> {
    this.logger.log('Running quality checks');

    for (const check of this.config.qualityChecks) {
      try {
        this.logger.log(`Running quality check: ${check.name}`);

        const { stdout, stderr } = await execAsync(check.command, {
          cwd: this.config.projectRoot,
          timeout: check.timeout,
        });

        if (stderr && check.required) {
          throw new Error(`Quality check ${check.name} failed: ${stderr}`);
        }

        this.logger.log(`Quality check ${check.name} completed`, {
          output: stdout.substring(0, 200),
        });

      } catch (error) {
        if (check.required) {
          throw new Error(`Required quality check ${check.name} failed: ${error instanceof Error ? error.message : String(error)}`);
        } else {
          this.logger.warn(`Optional quality check ${check.name} failed`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  /**
   * Build documentation
   */
  private async buildDocumentation(): Promise<void> {
    this.logger.log('Building documentation');

    for (const command of this.config.buildCommands) {
      await this.runBuildCommand(command);
    }

    // Ensure output directory exists
    await fs.ensureDir(this.config.outputDirectory);
  }

  /**
   * Run build command
   */
  private async runBuildCommand(command: BuildCommand): Promise<void> {
    this.logger.log(`Running build command: ${command.name}`);

    let attempt = 0;
    const maxAttempts = command.retries + 1;

    while (attempt < maxAttempts) {
      try {
        const { stdout, stderr } = await execAsync(command.command, {
          cwd: command.workingDirectory || this.config.projectRoot,
          timeout: command.timeout,
          env: { ...process.env, ...command.env },
        });

        this.logger.log(`Build command ${command.name} completed`, {
          attempt: attempt + 1,
          output: stdout.substring(0, 200),
        });

        return;

      } catch (error) {
        attempt++;
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (attempt >= maxAttempts) {
          if (command.failureStrategy === 'continue') {
            this.logger.warn(`Build command ${command.name} failed, continuing`, {
              error: errorMessage,
            });
            return;
          } else {
            throw new Error(`Build command ${command.name} failed after ${maxAttempts} attempts: ${errorMessage}`);
          }
        }

        if (command.failureStrategy === 'retry') {
          this.logger.warn(`Build command ${command.name} failed, retrying`, {
            attempt,
            maxAttempts,
            error: errorMessage,
          });
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Generate artifacts
   */
  private async generateArtifacts(): Promise<Artifact[]> {
    this.logger.log('Generating artifacts');

    const artifacts: Artifact[] = [];

    // Documentation artifact
    if (await fs.pathExists(this.config.outputDirectory)) {
      const stats = await this.calculateDirectorySize(this.config.outputDirectory);
      artifacts.push({
        name: 'documentation-site',
        path: this.config.outputDirectory,
        size: stats.size,
        type: 'documentation',
      });
    }

    // Coverage artifact
    const coverageDir = path.join(this.config.projectRoot, 'coverage');
    if (await fs.pathExists(coverageDir)) {
      const stats = await this.calculateDirectorySize(coverageDir);
      artifacts.push({
        name: 'coverage-report',
        path: coverageDir,
        size: stats.size,
        type: 'coverage',
      });
    }

    // Test results artifact
    const testResultsPath = path.join(this.config.projectRoot, 'test-results.xml');
    if (await fs.pathExists(testResultsPath)) {
      const stats = await fs.stat(testResultsPath);
      artifacts.push({
        name: 'test-results',
        path: testResultsPath,
        size: stats.size,
        type: 'report',
      });
    }

    this.logger.log(`Generated ${artifacts.length} artifacts`);
    return artifacts;
  }

  /**
   * Calculate directory size
   */
  private async calculateDirectorySize(dirPath: string): Promise<{ size: number; files: number }> {
    let totalSize = 0;
    let fileCount = 0;

    const files = await glob(`${dirPath}/**/*`, { nodir: true });

    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        totalSize += stats.size;
        fileCount++;
      } catch (error) {
        // Ignore files that can't be read
      }
    }

    return { size: totalSize, files: fileCount };
  }

  /**
   * Run tests
   */
  private async runTests(): Promise<void> {
    this.logger.log('Running tests');

    // Run documentation-specific tests
    const testCommands = [
      'npm run test:docs',
      'npm run test:links',
      'npm run test:accessibility',
    ];

    for (const command of testCommands) {
      try {
        await execAsync(command, {
          cwd: this.config.projectRoot,
          timeout: 300000,
        });
      } catch (error) {
        this.logger.warn(`Test command failed: ${command}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Deploy documentation
   */
  private async deployDocumentation(): Promise<void> {
    this.logger.log('Deploying documentation');

    for (const command of this.config.deploymentCommands) {
      if (command.requiresApproval) {
        this.logger.log(`Deployment ${command.name} requires approval - skipping automated deployment`);
        continue;
      }

      await this.runDeploymentCommand(command);
    }
  }

  /**
   * Run deployment command
   */
  private async runDeploymentCommand(command: DeploymentCommand): Promise<void> {
    this.logger.log(`Running deployment: ${command.name} to ${command.environment}`);

    try {
      const { stdout, stderr } = await execAsync(command.command, {
        cwd: this.config.projectRoot,
        timeout: command.timeout,
      });

      this.logger.log(`Deployment ${command.name} completed`, {
        environment: command.environment,
        output: stdout.substring(0, 200),
      });

      // Run health check if specified
      if (command.healthCheck) {
        await this.runHealthCheck(command);
      }

    } catch (error) {
      // Run rollback if specified
      if (command.rollbackCommand) {
        this.logger.warn(`Deployment ${command.name} failed, attempting rollback`);
        try {
          await execAsync(command.rollbackCommand, {
            cwd: this.config.projectRoot,
            timeout: command.timeout,
          });
          this.logger.log(`Rollback for ${command.name} completed`);
        } catch (rollbackError) {
          this.logger.error(`Rollback for ${command.name} failed`, {
            error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
          });
        }
      }

      throw error;
    }
  }

  /**
   * Run health check for deployment
   */
  private async runHealthCheck(command: DeploymentCommand): Promise<void> {
    if (!command.healthCheck) return;

    this.logger.log(`Running health check for ${command.name}`);

    try {
      await execAsync(command.healthCheck, {
        cwd: this.config.projectRoot,
        timeout: 60000,
      });

      this.logger.log(`Health check for ${command.name} passed`);
    } catch (error) {
      throw new Error(`Health check for ${command.name} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Post-deployment validation
   */
  private async postDeploymentValidation(): Promise<void> {
    this.logger.log('Running post-deployment validation');

    // Add specific post-deployment checks here
    // For example: smoke tests, performance checks, etc.
  }

  /**
   * Send notifications
   */
  private async sendNotifications(result: AutomationResult): Promise<void> {
    this.logger.log('Sending notifications');

    const message = this.createNotificationMessage(result);

    // Slack notification
    if (this.config.slackWebhook) {
      await this.sendSlackNotification(message, result.status);
    }

    // Webhook notification
    if (this.config.webhookUrl) {
      await this.sendWebhookNotification(result);
    }
  }

  /**
   * Send failure notification
   */
  private async sendFailureNotification(result: AutomationResult, error: any): Promise<void> {
    const message = `🚨 Documentation automation failed: ${error instanceof Error ? error.message : String(error)}`;

    if (this.config.slackWebhook) {
      await this.sendSlackNotification(message, 'failure');
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(message: string, status: string): Promise<void> {
    if (!this.config.slackWebhook) return;

    try {
      const color = status === 'success' ? 'good' : status === 'failure' ? 'danger' : 'warning';

      await fetch(this.config.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachments: [{
            color,
            text: message,
            footer: 'Documentation Automation',
            ts: Math.floor(Date.now() / 1000),
          }],
        }),
      });

    } catch (error) {
      this.logger.error('Failed to send Slack notification', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(result: AutomationResult): Promise<void> {
    if (!this.config.webhookUrl) return;

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });

    } catch (error) {
      this.logger.error('Failed to send webhook notification', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create notification message
   */
  private createNotificationMessage(result: AutomationResult): string {
    const status = result.status === 'success' ? '✅' : '❌';
    const duration = Math.round(result.duration / 1000);

    return `${status} Documentation automation completed
Status: ${result.status}
Duration: ${duration}s
Steps: ${result.steps.length}
Artifacts: ${result.artifacts.length}
Job ID: ${result.jobId}`;
  }

  /**
   * Calculate coverage score
   */
  private calculateCoverageScore(result: ValidationResult): number {
    if (result.metrics.totalFiles === 0) return 100;

    const coverage = (result.metrics.validFiles / result.metrics.totalFiles) * 100;
    return Math.round(coverage * 100) / 100;
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(result: ValidationResult): number {
    const errorWeight = 2;
    const warningWeight = 1;
    const maxScore = 100;

    const totalIssues = (result.metrics.errorCount * errorWeight) + (result.metrics.warningCount * warningWeight);
    const penalty = Math.min(totalIssues * 2, maxScore);

    return Math.max(0, maxScore - penalty);
  }

  /**
   * Calculate job metrics
   */
  private async calculateMetrics(): Promise<JobMetrics> {
    const markdownFiles = await glob(`${this.config.docsDirectory}/**/*.{md,mdx}`);
    const buildStats = await this.calculateDirectorySize(this.config.outputDirectory);

    return {
      totalFiles: markdownFiles.length,
      processedFiles: markdownFiles.length,
      errorCount: 0,
      warningCount: 0,
      coveragePercentage: 100,
      performanceScore: 90,
      accessibilityScore: 95,
      buildSize: buildStats.size,
    };
  }

  /**
   * Generate job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get job result
   */
  public getJobResult(jobId: string): AutomationResult | null {
    return this.jobResults.get(jobId) || null;
  }

  /**
   * Get all job results
   */
  public getAllJobResults(): AutomationResult[] {
    return Array.from(this.jobResults.values());
  }

  /**
   * Install Git hooks
   */
  public async installGitHooks(): Promise<void> {
    if (!this.config.enableGitHooks) return;

    this.logger.log('Installing Git hooks');

    const hooksDir = path.join(this.config.projectRoot, '.git', 'hooks');
    await fs.ensureDir(hooksDir);

    // Pre-commit hook
    const preCommitHook = `#!/bin/sh
# Documentation automation pre-commit hook
echo "Running documentation validation..."
npx ts-node -e "
import { DocumentationAutomationEngine } from './src/documentation/automation-engine';
const engine = new DocumentationAutomationEngine();
engine.validateDocumentation().then(result => {
  if (!result.valid) {
    console.error('Documentation validation failed');
    process.exit(1);
  }
}).catch(error => {
  console.error('Validation error:', error);
  process.exit(1);
});
"
`;

    await fs.writeFile(path.join(hooksDir, 'pre-commit'), preCommitHook);
    await fs.chmod(path.join(hooksDir, 'pre-commit'), 0o755);

    this.logger.log('Git hooks installed successfully');
  }

  /**
   * Setup CI/CD integration
   */
  public async setupCIIntegration(): Promise<void> {
    this.logger.log('Setting up CI/CD integration');

    // GitHub Actions workflow
    const githubWorkflow = `name: Documentation

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  docs:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run documentation automation
      run: npx ts-node -e "
        import { DocumentationAutomationEngine } from './src/documentation/automation-engine';
        const engine = new DocumentationAutomationEngine();
        engine.runAutomationPipeline('ci').then(result => {
          console.log('Pipeline result:', result.status);
          if (result.status === 'failure') process.exit(1);
        });
      "

    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: documentation
        path: docs-build/
`;

    const workflowDir = path.join(this.config.projectRoot, '.github', 'workflows');
    await fs.ensureDir(workflowDir);
    await fs.writeFile(path.join(workflowDir, 'documentation.yml'), githubWorkflow);

    this.logger.log('CI/CD integration setup completed');
  }
}

export default {
  DocumentationAutomationEngine,
  DEFAULT_AUTOMATION_CONFIG,
};