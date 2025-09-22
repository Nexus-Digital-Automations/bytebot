/**
 * Code Documentation Generator - Automated Documentation System
 *
 * This system provides comprehensive automated code documentation generation
 * with TypeScript analysis, JSDoc parsing, and interactive documentation
 * creation for the entire AIgent platform.
 *
 * @fileoverview Automated code documentation generation framework
 * @version 1.0.0
 * @author Documentation Infrastructure Agent
 */

import * as ts from 'typescript';
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { marked } from 'marked';
import { Logger } from '@nestjs/common';

/**
 * Configuration for code documentation generation
 */
export interface DocumentationConfig {
  sourceDirectories: string[];
  outputDirectory: string;
  includePrivate: boolean;
  includeInternal: boolean;
  generateMarkdown: boolean;
  generateJson: boolean;
  generateHtml: boolean;
  excludePatterns: string[];
  templateDirectory?: string;
  customTags: string[];
  crossReferenceGeneration: boolean;
  searchIndexGeneration: boolean;
}

/**
 * Default documentation configuration
 */
export const DEFAULT_DOC_CONFIG: DocumentationConfig = {
  sourceDirectories: ['src', 'packages'],
  outputDirectory: 'docs/generated',
  includePrivate: false,
  includeInternal: false,
  generateMarkdown: true,
  generateJson: true,
  generateHtml: true,
  excludePatterns: ['node_modules', 'dist', '*.test.ts', '*.spec.ts'],
  customTags: ['example', 'usage', 'performance', 'security'],
  crossReferenceGeneration: true,
  searchIndexGeneration: true,
};

/**
 * Documentation entry for a code symbol
 */
export interface DocumentationEntry {
  id: string;
  name: string;
  kind: ts.SyntaxKind;
  kindName: string;
  filePath: string;
  line: number;
  column: number;
  visibility: 'public' | 'private' | 'protected';
  description: string;
  examples: string[];
  parameters?: ParameterDoc[];
  returnType?: TypeDoc;
  decorators?: DecoratorDoc[];
  tags: Record<string, string>;
  crossReferences: string[];
  complexity?: number;
  coverage?: number;
}

/**
 * Parameter documentation
 */
export interface ParameterDoc {
  name: string;
  type: string;
  description: string;
  optional: boolean;
  defaultValue?: string;
}

/**
 * Type documentation
 */
export interface TypeDoc {
  type: string;
  description: string;
  examples?: string[];
}

/**
 * Decorator documentation
 */
export interface DecoratorDoc {
  name: string;
  arguments: string[];
  description: string;
}

/**
 * Documentation generation statistics
 */
export interface DocumentationStats {
  totalFiles: number;
  totalSymbols: number;
  documentedSymbols: number;
  undocumentedSymbols: number;
  coveragePercentage: number;
  generationTime: number;
  outputSize: number;
}

/**
 * Code Documentation Generator
 *
 * Provides automated generation of comprehensive documentation from TypeScript
 * source code with JSDoc parsing, cross-referencing, and multiple output formats.
 */
export class CodeDocumentationGenerator {
  private readonly logger = new Logger('CodeDocumentationGenerator');
  private readonly config: DocumentationConfig;
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private documentationEntries: Map<string, DocumentationEntry> = new Map();

  constructor(config: Partial<DocumentationConfig> = {}) {
    this.config = { ...DEFAULT_DOC_CONFIG, ...config };
    this.logger.log('Initializing Code Documentation Generator', {
      sourceDirectories: this.config.sourceDirectories,
      outputDirectory: this.config.outputDirectory,
    });
  }

  /**
   * Generate comprehensive documentation for the project
   * @returns Documentation generation statistics
   */
  public async generateDocumentation(): Promise<DocumentationStats> {
    const startTime = Date.now();

    this.logger.log('Starting documentation generation');

    try {
      // Initialize TypeScript compiler
      await this.initializeTypeScript();

      // Discover and analyze source files
      const sourceFiles = await this.discoverSourceFiles();
      this.logger.log(`Analyzing ${sourceFiles.length} source files`);

      // Extract documentation from each file
      for (const filePath of sourceFiles) {
        await this.extractDocumentationFromFile(filePath);
      }

      // Generate cross-references
      if (this.config.crossReferenceGeneration) {
        this.generateCrossReferences();
      }

      // Generate output in requested formats
      await this.generateOutputs();

      // Generate search index
      if (this.config.searchIndexGeneration) {
        await this.generateSearchIndex();
      }

      const stats = this.calculateStatistics(Date.now() - startTime);
      this.logger.log('Documentation generation completed', stats);

      return stats;
    } catch (error) {
      this.logger.error('Documentation generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize TypeScript compiler API
   */
  private async initializeTypeScript(): Promise<void> {
    const configPath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
    if (!configPath) {
      throw new Error('TypeScript configuration file not found');
    }

    const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
    const { options, fileNames } = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      path.dirname(configPath)
    );

    this.program = ts.createProgram(fileNames, options);
    this.checker = this.program.getTypeChecker();

    this.logger.log('TypeScript compiler initialized', {
      configPath,
      fileCount: fileNames.length,
    });
  }

  /**
   * Discover all source files to document
   */
  private async discoverSourceFiles(): Promise<string[]> {
    const patterns = this.config.sourceDirectories.map(dir => `${dir}/**/*.{ts,tsx}`);
    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        ignore: this.config.excludePatterns,
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  /**
   * Extract documentation from a single TypeScript file
   */
  private async extractDocumentationFromFile(filePath: string): Promise<void> {
    const sourceFile = this.program.getSourceFile(path.resolve(filePath));
    if (!sourceFile) {
      this.logger.warn(`Could not load source file: ${filePath}`);
      return;
    }

    this.logger.debug(`Extracting documentation from ${filePath}`);

    // Visit all nodes in the source file
    this.visitNode(sourceFile, sourceFile);
  }

  /**
   * Visit a TypeScript AST node and extract documentation
   */
  private visitNode(node: ts.Node, sourceFile: ts.SourceFile): void {
    // Check if this node should be documented
    if (this.shouldDocumentNode(node)) {
      const entry = this.createDocumentationEntry(node, sourceFile);
      if (entry) {
        this.documentationEntries.set(entry.id, entry);
      }
    }

    // Recursively visit child nodes
    ts.forEachChild(node, (child) => this.visitNode(child, sourceFile));
  }

  /**
   * Determine if a node should be documented
   */
  private shouldDocumentNode(node: ts.Node): boolean {
    return (
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isPropertyDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isModuleDeclaration(node)
    );
  }

  /**
   * Create documentation entry for a TypeScript node
   */
  private createDocumentationEntry(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): DocumentationEntry | null {
    const name = this.getNodeName(node);
    if (!name) return null;

    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const jsDocComment = this.getJSDocComment(node);

    const entry: DocumentationEntry = {
      id: this.generateId(name, sourceFile.fileName),
      name,
      kind: node.kind,
      kindName: ts.SyntaxKind[node.kind],
      filePath: path.relative(process.cwd(), sourceFile.fileName),
      line: line + 1,
      column: character + 1,
      visibility: this.getVisibility(node),
      description: jsDocComment?.description || '',
      examples: jsDocComment?.examples || [],
      tags: jsDocComment?.tags || {},
      crossReferences: [],
    };

    // Add function/method specific information
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      entry.parameters = this.extractParameters(node);
      entry.returnType = this.extractReturnType(node);
    }

    // Add decorator information
    if (node.decorators) {
      entry.decorators = this.extractDecorators(node);
    }

    // Calculate complexity metrics
    entry.complexity = this.calculateComplexity(node);

    return entry;
  }

  /**
   * Get the name of a TypeScript node
   */
  private getNodeName(node: ts.Node): string | null {
    if ('name' in node && node.name && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    return null;
  }

  /**
   * Generate unique ID for documentation entry
   */
  private generateId(name: string, filePath: string): string {
    const fileId = path.basename(filePath, path.extname(filePath));
    return `${fileId}_${name}`;
  }

  /**
   * Get visibility modifier for a node
   */
  private getVisibility(node: ts.Node): 'public' | 'private' | 'protected' {
    if (node.modifiers) {
      for (const modifier of node.modifiers) {
        if (modifier.kind === ts.SyntaxKind.PrivateKeyword) return 'private';
        if (modifier.kind === ts.SyntaxKind.ProtectedKeyword) return 'protected';
      }
    }
    return 'public';
  }

  /**
   * Extract JSDoc comment and tags from a node
   */
  private getJSDocComment(node: ts.Node): {
    description: string;
    examples: string[];
    tags: Record<string, string>;
  } | null {
    const jsDoc = ts.getJSDocCommentsAndTags(node);
    if (!jsDoc.length) return null;

    const result = {
      description: '',
      examples: [] as string[],
      tags: {} as Record<string, string>,
    };

    for (const doc of jsDoc) {
      if (ts.isJSDoc(doc)) {
        result.description = doc.comment?.toString() || '';

        if (doc.tags) {
          for (const tag of doc.tags) {
            const tagName = tag.tagName.escapedText.toString();
            const tagComment = tag.comment?.toString() || '';

            if (tagName === 'example') {
              result.examples.push(tagComment);
            } else {
              result.tags[tagName] = tagComment;
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Extract parameter information from function/method
   */
  private extractParameters(node: ts.FunctionDeclaration | ts.MethodDeclaration): ParameterDoc[] {
    if (!node.parameters) return [];

    return node.parameters.map(param => ({
      name: param.name.getText(),
      type: param.type ? param.type.getText() : 'any',
      description: this.getParameterDescription(param),
      optional: !!param.questionToken,
      defaultValue: param.initializer?.getText(),
    }));
  }

  /**
   * Get parameter description from JSDoc
   */
  private getParameterDescription(param: ts.ParameterDeclaration): string {
    // Extract from JSDoc @param tags
    // This is a simplified implementation
    return '';
  }

  /**
   * Extract return type information
   */
  private extractReturnType(node: ts.FunctionDeclaration | ts.MethodDeclaration): TypeDoc | null {
    if (!node.type) return null;

    return {
      type: node.type.getText(),
      description: '', // Could extract from @returns JSDoc tag
    };
  }

  /**
   * Extract decorator information
   */
  private extractDecorators(node: ts.Node): DecoratorDoc[] {
    if (!node.decorators) return [];

    return node.decorators.map(decorator => ({
      name: decorator.expression.getText(),
      arguments: [], // Could extract decorator arguments
      description: '', // Could extract from JSDoc
    }));
  }

  /**
   * Calculate cyclomatic complexity for a node
   */
  private calculateComplexity(node: ts.Node): number {
    let complexity = 1; // Base complexity

    const countComplexityNodes = (n: ts.Node) => {
      if (
        ts.isIfStatement(n) ||
        ts.isWhileStatement(n) ||
        ts.isForStatement(n) ||
        ts.isForInStatement(n) ||
        ts.isForOfStatement(n) ||
        ts.isSwitchStatement(n) ||
        ts.isConditionalExpression(n) ||
        ts.isCatchClause(n)
      ) {
        complexity++;
      }

      ts.forEachChild(n, countComplexityNodes);
    };

    countComplexityNodes(node);
    return complexity;
  }

  /**
   * Generate cross-references between documentation entries
   */
  private generateCrossReferences(): void {
    this.logger.log('Generating cross-references');

    for (const [id, entry] of this.documentationEntries) {
      const references: string[] = [];

      // Find references in description and examples
      const textToSearch = [
        entry.description,
        ...entry.examples,
        ...Object.values(entry.tags),
      ].join(' ');

      for (const [refId, refEntry] of this.documentationEntries) {
        if (refId !== id && textToSearch.includes(refEntry.name)) {
          references.push(refId);
        }
      }

      entry.crossReferences = references;
    }
  }

  /**
   * Generate documentation outputs in requested formats
   */
  private async generateOutputs(): Promise<void> {
    await fs.ensureDir(this.config.outputDirectory);

    if (this.config.generateJson) {
      await this.generateJsonOutput();
    }

    if (this.config.generateMarkdown) {
      await this.generateMarkdownOutput();
    }

    if (this.config.generateHtml) {
      await this.generateHtmlOutput();
    }
  }

  /**
   * Generate JSON documentation output
   */
  private async generateJsonOutput(): Promise<void> {
    const jsonPath = path.join(this.config.outputDirectory, 'documentation.json');
    const data = {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        generator: 'CodeDocumentationGenerator',
      },
      entries: Array.from(this.documentationEntries.values()),
    };

    await fs.writeJson(jsonPath, data, { spaces: 2 });
    this.logger.log(`Generated JSON documentation: ${jsonPath}`);
  }

  /**
   * Generate Markdown documentation output
   */
  private async generateMarkdownOutput(): Promise<void> {
    const markdownDir = path.join(this.config.outputDirectory, 'markdown');
    await fs.ensureDir(markdownDir);

    // Group entries by file
    const entriesByFile = new Map<string, DocumentationEntry[]>();
    for (const entry of this.documentationEntries.values()) {
      const fileEntries = entriesByFile.get(entry.filePath) || [];
      fileEntries.push(entry);
      entriesByFile.set(entry.filePath, fileEntries);
    }

    // Generate markdown for each file
    for (const [filePath, entries] of entriesByFile) {
      const markdown = this.generateMarkdownForFile(filePath, entries);
      const outputPath = path.join(markdownDir, `${path.basename(filePath, '.ts')}.md`);
      await fs.writeFile(outputPath, markdown);
    }

    // Generate index file
    const indexMarkdown = this.generateMarkdownIndex(entriesByFile);
    await fs.writeFile(path.join(markdownDir, 'index.md'), indexMarkdown);

    this.logger.log(`Generated Markdown documentation: ${markdownDir}`);
  }

  /**
   * Generate HTML documentation output
   */
  private async generateHtmlOutput(): Promise<void> {
    const htmlDir = path.join(this.config.outputDirectory, 'html');
    await fs.ensureDir(htmlDir);

    // Generate HTML files from markdown
    const markdownDir = path.join(this.config.outputDirectory, 'markdown');
    const markdownFiles = await glob(path.join(markdownDir, '*.md'));

    for (const mdFile of markdownFiles) {
      const markdown = await fs.readFile(mdFile, 'utf-8');
      const html = this.generateHtmlFromMarkdown(markdown);
      const htmlFile = path.join(htmlDir, path.basename(mdFile, '.md') + '.html');
      await fs.writeFile(htmlFile, html);
    }

    this.logger.log(`Generated HTML documentation: ${htmlDir}`);
  }

  /**
   * Generate markdown content for a single file
   */
  private generateMarkdownForFile(filePath: string, entries: DocumentationEntry[]): string {
    let markdown = `# ${path.basename(filePath)}\n\n`;
    markdown += `**File:** \`${filePath}\`\n\n`;

    // Group by kind
    const entriesByKind = new Map<string, DocumentationEntry[]>();
    for (const entry of entries) {
      const kindEntries = entriesByKind.get(entry.kindName) || [];
      kindEntries.push(entry);
      entriesByKind.set(entry.kindName, kindEntries);
    }

    for (const [kind, kindEntries] of entriesByKind) {
      markdown += `## ${kind}s\n\n`;

      for (const entry of kindEntries) {
        markdown += this.generateMarkdownForEntry(entry);
      }
    }

    return markdown;
  }

  /**
   * Generate markdown for a single documentation entry
   */
  private generateMarkdownForEntry(entry: DocumentationEntry): string {
    let markdown = `### ${entry.name}\n\n`;

    if (entry.description) {
      markdown += `${entry.description}\n\n`;
    }

    // Add parameters table
    if (entry.parameters && entry.parameters.length > 0) {
      markdown += `**Parameters:**\n\n`;
      markdown += `| Name | Type | Optional | Description |\n`;
      markdown += `|------|------|----------|-------------|\n`;

      for (const param of entry.parameters) {
        markdown += `| ${param.name} | \`${param.type}\` | ${param.optional ? 'Yes' : 'No'} | ${param.description} |\n`;
      }
      markdown += '\n';
    }

    // Add return type
    if (entry.returnType) {
      markdown += `**Returns:** \`${entry.returnType.type}\`\n\n`;
    }

    // Add examples
    if (entry.examples.length > 0) {
      markdown += `**Examples:**\n\n`;
      for (const example of entry.examples) {
        markdown += `\`\`\`typescript\n${example}\n\`\`\`\n\n`;
      }
    }

    // Add complexity metric
    if (entry.complexity !== undefined) {
      markdown += `**Complexity:** ${entry.complexity}\n\n`;
    }

    markdown += `**Location:** \`${entry.filePath}:${entry.line}:${entry.column}\`\n\n`;
    markdown += '---\n\n';

    return markdown;
  }

  /**
   * Generate markdown index file
   */
  private generateMarkdownIndex(entriesByFile: Map<string, DocumentationEntry[]>): string {
    let markdown = `# Code Documentation Index\n\n`;
    markdown += `Generated on ${new Date().toISOString()}\n\n`;

    markdown += `## Files\n\n`;
    for (const [filePath, entries] of entriesByFile) {
      const fileName = path.basename(filePath, '.ts');
      markdown += `- [${fileName}](./${fileName}.md) (${entries.length} entries)\n`;
    }

    markdown += `\n## Statistics\n\n`;
    markdown += `- Total Files: ${entriesByFile.size}\n`;
    markdown += `- Total Entries: ${Array.from(entriesByFile.values()).flat().length}\n`;

    return markdown;
  }

  /**
   * Convert markdown to HTML
   */
  private generateHtmlFromMarkdown(markdown: string): string {
    const html = marked.parse(markdown);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
        h1, h2, h3 { color: #333; }
        .complexity { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    ${html}
</body>
</html>
`;
  }

  /**
   * Generate search index for documentation
   */
  private async generateSearchIndex(): Promise<void> {
    const searchIndex = {
      entries: Array.from(this.documentationEntries.values()).map(entry => ({
        id: entry.id,
        name: entry.name,
        kind: entry.kindName,
        description: entry.description,
        filePath: entry.filePath,
        searchTerms: [
          entry.name,
          entry.kindName,
          entry.description,
          ...entry.examples,
          ...Object.values(entry.tags),
        ].filter(Boolean).join(' ').toLowerCase(),
      })),
    };

    const indexPath = path.join(this.config.outputDirectory, 'search-index.json');
    await fs.writeJson(indexPath, searchIndex, { spaces: 2 });

    this.logger.log(`Generated search index: ${indexPath}`);
  }

  /**
   * Calculate documentation generation statistics
   */
  private calculateStatistics(generationTime: number): DocumentationStats {
    const totalSymbols = this.documentationEntries.size;
    const documentedSymbols = Array.from(this.documentationEntries.values()).filter(
      entry => entry.description.length > 0
    ).length;

    return {
      totalFiles: new Set(Array.from(this.documentationEntries.values()).map(e => e.filePath)).size,
      totalSymbols,
      documentedSymbols,
      undocumentedSymbols: totalSymbols - documentedSymbols,
      coveragePercentage: totalSymbols > 0 ? (documentedSymbols / totalSymbols) * 100 : 0,
      generationTime,
      outputSize: 0, // Could calculate actual output size
    };
  }
}

/**
 * Documentation generation CLI interface
 */
export class DocumentationCLI {
  private readonly logger = new Logger('DocumentationCLI');

  /**
   * Run documentation generation from command line
   */
  public async run(args: string[]): Promise<void> {
    try {
      const config = this.parseCliArgs(args);
      const generator = new CodeDocumentationGenerator(config);
      const stats = await generator.generateDocumentation();

      this.logger.log('Documentation generation completed successfully', stats);

      console.log('\n📚 Documentation Generation Results:');
      console.log(`   📁 Total Files: ${stats.totalFiles}`);
      console.log(`   📝 Total Symbols: ${stats.totalSymbols}`);
      console.log(`   ✅ Documented: ${stats.documentedSymbols}`);
      console.log(`   ❌ Undocumented: ${stats.undocumentedSymbols}`);
      console.log(`   📊 Coverage: ${stats.coveragePercentage.toFixed(1)}%`);
      console.log(`   ⏱️  Generation Time: ${stats.generationTime}ms`);

    } catch (error) {
      this.logger.error('Documentation generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  }

  /**
   * Parse command line arguments
   */
  private parseCliArgs(args: string[]): Partial<DocumentationConfig> {
    const config: Partial<DocumentationConfig> = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--output':
        case '-o':
          config.outputDirectory = args[++i];
          break;
        case '--source':
        case '-s':
          config.sourceDirectories = args[++i].split(',');
          break;
        case '--include-private':
          config.includePrivate = true;
          break;
        case '--no-html':
          config.generateHtml = false;
          break;
        case '--no-markdown':
          config.generateMarkdown = false;
          break;
        case '--no-json':
          config.generateJson = false;
          break;
      }
    }

    return config;
  }
}

export default {
  CodeDocumentationGenerator,
  DocumentationCLI,
  DEFAULT_DOC_CONFIG,
};