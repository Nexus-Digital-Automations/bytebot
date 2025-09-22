/**
 * Interactive Documentation Platform - Modern Documentation Experience
 *
 * This system provides a comprehensive interactive documentation platform
 * with real-time search, advanced navigation, user feedback, analytics,
 * and collaborative features for the entire AIgent platform.
 *
 * @fileoverview Interactive documentation platform with search and navigation
 * @version 1.0.0
 * @author Documentation Infrastructure Agent
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { marked } from 'marked';
import MiniSearch from 'minisearch';

/**
 * Configuration for interactive documentation platform
 */
export interface InteractiveDocsConfig {
  contentDirectory: string;
  outputDirectory: string;
  templateDirectory: string;
  staticDirectory: string;
  enableSearch: boolean;
  enableAnalytics: boolean;
  enableComments: boolean;
  enableVersioning: boolean;
  searchIndexFields: string[];
  searchBoostFields: Record<string, number>;
  themeName: string;
  customCss: string;
  customJs: string;
}

/**
 * Default interactive documentation configuration
 */
export const DEFAULT_INTERACTIVE_CONFIG: InteractiveDocsConfig = {
  contentDirectory: 'docs',
  outputDirectory: 'docs-site',
  templateDirectory: 'docs/templates',
  staticDirectory: 'docs/static',
  enableSearch: true,
  enableAnalytics: true,
  enableComments: true,
  enableVersioning: true,
  searchIndexFields: ['title', 'content', 'tags', 'category'],
  searchBoostFields: { title: 2, heading: 1.5, content: 1 },
  themeName: 'modern',
  customCss: '',
  customJs: '',
};

/**
 * Documentation page structure
 */
export interface DocumentationPage {
  id: string;
  title: string;
  content: string;
  path: string;
  category: string;
  tags: string[];
  lastModified: Date;
  author: string;
  version: string;
  metadata: Record<string, any>;
  searchTerms: string[];
  parentPage?: string;
  childPages: string[];
  relatedPages: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
}

/**
 * Navigation structure
 */
export interface NavigationNode {
  id: string;
  title: string;
  path: string;
  icon?: string;
  badge?: string;
  children: NavigationNode[];
  order: number;
  hidden: boolean;
  external: boolean;
}

/**
 * Search result
 */
export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  path: string;
  category: string;
  score: number;
  highlights: SearchHighlight[];
  breadcrumb: string[];
}

/**
 * Search highlight
 */
export interface SearchHighlight {
  field: string;
  snippet: string;
  matches: Array<{ start: number; end: number }>;
}

/**
 * User feedback
 */
export interface UserFeedback {
  pageId: string;
  userId?: string;
  rating: number;
  feedback: string;
  helpful: boolean;
  suggestions: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
}

/**
 * Analytics data
 */
export interface AnalyticsData {
  pageId: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  event: 'view' | 'search' | 'feedback' | 'download' | 'external_link';
  data: Record<string, any>;
  ip: string;
  userAgent: string;
  referrer: string;
}

/**
 * Site configuration
 */
export interface SiteConfig {
  title: string;
  description: string;
  baseUrl: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  socialLinks: SocialLink[];
  footerLinks: FooterLink[];
  searchPlaceholder: string;
  language: string;
  gtmId?: string;
  feedbackEnabled: boolean;
  downloadEnabled: boolean;
}

/**
 * Social link
 */
export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

/**
 * Footer link
 */
export interface FooterLink {
  title: string;
  url: string;
  external: boolean;
}

/**
 * Interactive Documentation Platform
 *
 * Provides a modern, searchable, and interactive documentation experience
 * with analytics, user feedback, and collaborative features.
 */
export class InteractiveDocumentationPlatform {
  private readonly logger = new Logger('InteractiveDocumentationPlatform');
  private readonly config: InteractiveDocsConfig;
  private pages: Map<string, DocumentationPage> = new Map();
  private navigation: NavigationNode[] = [];
  private searchIndex: MiniSearch;
  private feedback: Map<string, UserFeedback[]> = new Map();
  private analytics: AnalyticsData[] = [];

  constructor(config: Partial<InteractiveDocsConfig> = {}) {
    this.config = { ...DEFAULT_INTERACTIVE_CONFIG, ...config };
    this.logger.log('Initializing Interactive Documentation Platform', {
      outputDirectory: this.config.outputDirectory,
      enableSearch: this.config.enableSearch,
    });

    // Initialize search index
    this.searchIndex = new MiniSearch({
      fields: this.config.searchIndexFields,
      storeFields: ['title', 'content', 'path', 'category', 'tags'],
      searchOptions: {
        boost: this.config.searchBoostFields,
        fuzzy: 0.2,
        prefix: true,
      },
    });
  }

  /**
   * Generate interactive documentation site
   */
  public async generateDocumentationSite(): Promise<void> {
    this.logger.log('Starting interactive documentation site generation');

    try {
      // Prepare output directory
      await this.prepareOutputDirectory();

      // Discover and parse documentation content
      await this.discoverContent();

      // Build navigation structure
      this.buildNavigation();

      // Generate search index
      if (this.config.enableSearch) {
        this.generateSearchIndex();
      }

      // Generate HTML pages
      await this.generatePages();

      // Generate static assets
      await this.generateStaticAssets();

      // Generate API files
      await this.generateApiFiles();

      // Generate service worker for offline support
      await this.generateServiceWorker();

      this.logger.log('Interactive documentation site generation completed');

    } catch (error) {
      this.logger.error('Documentation site generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Prepare output directory
   */
  private async prepareOutputDirectory(): Promise<void> {
    await fs.ensureDir(this.config.outputDirectory);
    await fs.ensureDir(path.join(this.config.outputDirectory, 'assets'));
    await fs.ensureDir(path.join(this.config.outputDirectory, 'api'));
    await fs.ensureDir(path.join(this.config.outputDirectory, 'search'));
  }

  /**
   * Discover and parse documentation content
   */
  private async discoverContent(): Promise<void> {
    const markdownFiles = await this.findMarkdownFiles();

    for (const filePath of markdownFiles) {
      try {
        const page = await this.parseMarkdownFile(filePath);
        if (page) {
          this.pages.set(page.id, page);
        }
      } catch (error) {
        this.logger.warn(`Failed to parse documentation file: ${filePath}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.log(`Discovered ${this.pages.size} documentation pages`);
  }

  /**
   * Find all markdown files
   */
  private async findMarkdownFiles(): Promise<string[]> {
    const glob = await import('glob');
    return glob.glob(`${this.config.contentDirectory}/**/*.{md,mdx}`, {
      ignore: ['**/node_modules/**', '**/dist/**'],
    });
  }

  /**
   * Parse markdown file into documentation page
   */
  private async parseMarkdownFile(filePath: string): Promise<DocumentationPage | null> {
    const content = await fs.readFile(filePath, 'utf-8');
    const frontMatter = this.extractFrontMatter(content);
    const markdownContent = this.removeFrontMatter(content);

    if (!frontMatter.title) {
      return null;
    }

    const relativePath = path.relative(this.config.contentDirectory, filePath);
    const urlPath = this.convertToUrlPath(relativePath);

    const page: DocumentationPage = {
      id: this.generatePageId(relativePath),
      title: frontMatter.title,
      content: markdownContent,
      path: urlPath,
      category: frontMatter.category || 'General',
      tags: frontMatter.tags || [],
      lastModified: frontMatter.lastModified || (await fs.stat(filePath)).mtime,
      author: frontMatter.author || 'Unknown',
      version: frontMatter.version || '1.0.0',
      metadata: frontMatter.metadata || {},
      searchTerms: this.extractSearchTerms(frontMatter.title, markdownContent),
      parentPage: frontMatter.parent,
      childPages: [],
      relatedPages: frontMatter.related || [],
      difficulty: frontMatter.difficulty || 'beginner',
      estimatedReadTime: this.calculateReadTime(markdownContent),
    };

    return page;
  }

  /**
   * Extract front matter from markdown
   */
  private extractFrontMatter(content: string): Record<string, any> {
    const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!frontMatterMatch) {
      return {};
    }

    try {
      const yaml = await import('js-yaml');
      return yaml.load(frontMatterMatch[1]) as Record<string, any>;
    } catch {
      return {};
    }
  }

  /**
   * Remove front matter from markdown content
   */
  private removeFrontMatter(content: string): string {
    return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  }

  /**
   * Convert file path to URL path
   */
  private convertToUrlPath(filePath: string): string {
    return filePath
      .replace(/\.mdx?$/, '')
      .replace(/\\/g, '/')
      .replace(/\/index$/, '')
      .replace(/^\//, '');
  }

  /**
   * Generate unique page ID
   */
  private generatePageId(filePath: string): string {
    return filePath.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  /**
   * Extract search terms from content
   */
  private extractSearchTerms(title: string, content: string): string[] {
    const terms = new Set<string>();

    // Add title words
    title.split(/\s+/).forEach(word => {
      if (word.length > 2) {
        terms.add(word.toLowerCase());
      }
    });

    // Add content words (remove markdown syntax)
    const plainText = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]*`/g, '') // Remove inline code
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Extract link text
      .replace(/[#*_`]/g, '') // Remove markdown syntax
      .replace(/\s+/g, ' ');

    plainText.split(/\s+/).forEach(word => {
      if (word.length > 3) {
        terms.add(word.toLowerCase());
      }
    });

    return Array.from(terms);
  }

  /**
   * Calculate estimated reading time
   */
  private calculateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  /**
   * Build navigation structure
   */
  private buildNavigation(): void {
    const categories = new Map<string, DocumentationPage[]>();

    // Group pages by category
    for (const page of this.pages.values()) {
      const categoryPages = categories.get(page.category) || [];
      categoryPages.push(page);
      categories.set(page.category, categoryPages);
    }

    // Build navigation nodes
    this.navigation = Array.from(categories.entries()).map(([category, pages], index) => {
      const children = pages
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((page, pageIndex) => ({
          id: page.id,
          title: page.title,
          path: page.path,
          children: [],
          order: pageIndex,
          hidden: false,
          external: false,
        }));

      return {
        id: category.toLowerCase().replace(/\s+/g, '-'),
        title: category,
        path: '',
        children,
        order: index,
        hidden: false,
        external: false,
      };
    });

    this.logger.log(`Built navigation with ${this.navigation.length} categories`);
  }

  /**
   * Generate search index
   */
  private generateSearchIndex(): void {
    const documents = Array.from(this.pages.values()).map(page => ({
      id: page.id,
      title: page.title,
      content: page.content,
      path: page.path,
      category: page.category,
      tags: page.tags.join(' '),
    }));

    this.searchIndex.addAll(documents);
    this.logger.log(`Generated search index with ${documents.length} documents`);
  }

  /**
   * Generate HTML pages
   */
  private async generatePages(): Promise<void> {
    // Generate index page
    await this.generateIndexPage();

    // Generate individual documentation pages
    for (const page of this.pages.values()) {
      await this.generateDocumentationPage(page);
    }

    // Generate search page
    if (this.config.enableSearch) {
      await this.generateSearchPage();
    }

    // Generate category pages
    await this.generateCategoryPages();
  }

  /**
   * Generate index page
   */
  private async generateIndexPage(): Promise<void> {
    const template = await this.loadTemplate('index');
    const siteConfig = this.getSiteConfig();

    const html = this.renderTemplate(template, {
      ...siteConfig,
      navigation: this.navigation,
      featuredPages: this.getFeaturedPages(),
      recentPages: this.getRecentPages(),
      popularCategories: this.getPopularCategories(),
    });

    await fs.writeFile(path.join(this.config.outputDirectory, 'index.html'), html);
  }

  /**
   * Generate documentation page
   */
  private async generateDocumentationPage(page: DocumentationPage): Promise<void> {
    const template = await this.loadTemplate('page');
    const siteConfig = this.getSiteConfig();

    // Convert markdown to HTML
    const htmlContent = marked.parse(page.content);

    // Generate table of contents
    const tableOfContents = this.generateTableOfContents(page.content);

    // Get related pages
    const relatedPages = this.getRelatedPages(page);

    const html = this.renderTemplate(template, {
      ...siteConfig,
      page,
      content: htmlContent,
      navigation: this.navigation,
      tableOfContents,
      relatedPages,
      breadcrumb: this.generateBreadcrumb(page),
    });

    const outputPath = path.join(this.config.outputDirectory, page.path, 'index.html');
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, html);
  }

  /**
   * Generate search page
   */
  private async generateSearchPage(): Promise<void> {
    const template = await this.loadTemplate('search');
    const siteConfig = this.getSiteConfig();

    const html = this.renderTemplate(template, {
      ...siteConfig,
      navigation: this.navigation,
    });

    await fs.writeFile(path.join(this.config.outputDirectory, 'search', 'index.html'), html);
  }

  /**
   * Generate category pages
   */
  private async generateCategoryPages(): Promise<void> {
    const template = await this.loadTemplate('category');
    const siteConfig = this.getSiteConfig();

    for (const navNode of this.navigation) {
      const categoryPages = Array.from(this.pages.values()).filter(
        page => page.category === navNode.title
      );

      const html = this.renderTemplate(template, {
        ...siteConfig,
        category: navNode.title,
        pages: categoryPages,
        navigation: this.navigation,
      });

      const outputPath = path.join(this.config.outputDirectory, 'category', navNode.id, 'index.html');
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, html);
    }
  }

  /**
   * Load HTML template
   */
  private async loadTemplate(templateName: string): Promise<string> {
    const templatePath = path.join(this.config.templateDirectory, `${templateName}.html`);

    if (await fs.pathExists(templatePath)) {
      return fs.readFile(templatePath, 'utf-8');
    }

    // Return default template if custom not found
    return this.getDefaultTemplate(templateName);
  }

  /**
   * Get default HTML template
   */
  private getDefaultTemplate(templateName: string): string {
    const templates = {
      index: this.getDefaultIndexTemplate(),
      page: this.getDefaultPageTemplate(),
      search: this.getDefaultSearchTemplate(),
      category: this.getDefaultCategoryTemplate(),
    };

    return templates[templateName as keyof typeof templates] || templates.page;
  }

  /**
   * Get default index template
   */
  private getDefaultIndexTemplate(): string {
    return `<!DOCTYPE html>
<html lang="{{language}}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <meta name="description" content="{{description}}">
    <link rel="icon" href="{{faviconUrl}}">
    <link rel="stylesheet" href="/assets/css/style.css">
    <link rel="stylesheet" href="/assets/css/theme-{{themeName}}.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <img src="{{logoUrl}}" alt="{{title}}">
                    <h1>{{title}}</h1>
                </div>
                <nav class="main-nav">
                    {{#navigation}}
                    <div class="nav-item">
                        <a href="/category/{{id}}">{{title}}</a>
                    </div>
                    {{/navigation}}
                </nav>
                <div class="search-container">
                    <input type="search" id="search-input" placeholder="{{searchPlaceholder}}">
                    <div id="search-results" class="search-results"></div>
                </div>
            </div>
        </div>
    </header>

    <main class="main">
        <div class="container">
            <section class="hero">
                <h1>{{title}}</h1>
                <p>{{description}}</p>
                <div class="hero-actions">
                    <a href="/getting-started" class="btn btn-primary">Get Started</a>
                    <a href="/api-reference" class="btn btn-secondary">API Reference</a>
                </div>
            </section>

            <section class="featured-content">
                <h2>Featured Documentation</h2>
                <div class="cards-grid">
                    {{#featuredPages}}
                    <div class="card">
                        <h3><a href="/{{path}}">{{title}}</a></h3>
                        <p>{{description}}</p>
                        <div class="card-meta">
                            <span class="category">{{category}}</span>
                            <span class="read-time">{{estimatedReadTime}} min read</span>
                        </div>
                    </div>
                    {{/featuredPages}}
                </div>
            </section>

            <section class="categories">
                <h2>Browse by Category</h2>
                <div class="categories-grid">
                    {{#navigation}}
                    <div class="category-card">
                        <h3><a href="/category/{{id}}">{{title}}</a></h3>
                        <p>{{children.length}} articles</p>
                    </div>
                    {{/navigation}}
                </div>
            </section>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-links">
                    {{#footerLinks}}
                    <a href="{{url}}" {{#external}}target="_blank"{{/external}}>{{title}}</a>
                    {{/footerLinks}}
                </div>
                <div class="social-links">
                    {{#socialLinks}}
                    <a href="{{url}}" target="_blank">
                        <i class="icon-{{icon}}"></i>
                    </a>
                    {{/socialLinks}}
                </div>
            </div>
        </div>
    </footer>

    <script src="/assets/js/search.js"></script>
    <script src="/assets/js/analytics.js"></script>
    {{#gtmId}}
    <script async src="https://www.googletagmanager.com/gtag/js?id={{gtmId}}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '{{gtmId}}');
    </script>
    {{/gtmId}}
</body>
</html>`;
  }

  /**
   * Get default page template
   */
  private getDefaultPageTemplate(): string {
    return `<!DOCTYPE html>
<html lang="{{language}}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{page.title}} - {{title}}</title>
    <meta name="description" content="{{page.metadata.description}}">
    <link rel="icon" href="{{faviconUrl}}">
    <link rel="stylesheet" href="/assets/css/style.css">
    <link rel="stylesheet" href="/assets/css/theme-{{themeName}}.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <img src="{{logoUrl}}" alt="{{title}}">
                    <h1><a href="/">{{title}}</a></h1>
                </div>
                <div class="search-container">
                    <input type="search" id="search-input" placeholder="{{searchPlaceholder}}">
                    <div id="search-results" class="search-results"></div>
                </div>
            </div>
        </div>
    </header>

    <div class="layout">
        <aside class="sidebar">
            <nav class="sidebar-nav">
                {{#navigation}}
                <div class="nav-section">
                    <h3>{{title}}</h3>
                    <ul>
                        {{#children}}
                        <li><a href="/{{path}}" {{#current}}class="current"{{/current}}>{{title}}</a></li>
                        {{/children}}
                    </ul>
                </div>
                {{/navigation}}
            </nav>
        </aside>

        <main class="content">
            <div class="page-header">
                <nav class="breadcrumb">
                    {{#breadcrumb}}
                    <a href="{{path}}">{{title}}</a>
                    {{/breadcrumb}}
                </nav>
                <h1>{{page.title}}</h1>
                <div class="page-meta">
                    <span class="category">{{page.category}}</span>
                    <span class="difficulty difficulty-{{page.difficulty}}">{{page.difficulty}}</span>
                    <span class="read-time">{{page.estimatedReadTime}} min read</span>
                    <span class="last-updated">Updated {{page.lastModified}}</span>
                </div>
            </div>

            <div class="page-content">
                <div class="content-body">
                    {{{content}}}
                </div>

                {{#config.enableComments}}
                <div class="feedback-section">
                    <h3>Was this helpful?</h3>
                    <div class="feedback-buttons">
                        <button class="btn-feedback" data-helpful="true">👍 Yes</button>
                        <button class="btn-feedback" data-helpful="false">👎 No</button>
                    </div>
                    <div class="feedback-form" style="display: none;">
                        <textarea placeholder="How can we improve this page?"></textarea>
                        <button class="btn btn-primary">Submit Feedback</button>
                    </div>
                </div>
                {{/config.enableComments}}
            </div>

            {{#relatedPages}}
            <div class="related-pages">
                <h3>Related Pages</h3>
                <div class="related-grid">
                    {{#relatedPages}}
                    <div class="related-card">
                        <h4><a href="/{{path}}">{{title}}</a></h4>
                        <p>{{description}}</p>
                    </div>
                    {{/relatedPages}}
                </div>
            </div>
            {{/relatedPages}}
        </main>

        <aside class="toc">
            <div class="toc-content">
                <h3>On this page</h3>
                {{{tableOfContents}}}
            </div>
        </aside>
    </div>

    <script src="/assets/js/page.js"></script>
    <script src="/assets/js/search.js"></script>
    <script src="/assets/js/feedback.js"></script>
    <script src="/assets/js/analytics.js"></script>
</body>
</html>`;
  }

  /**
   * Get default search template
   */
  private getDefaultSearchTemplate(): string {
    return `<!DOCTYPE html>
<html lang="{{language}}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Search - {{title}}</title>
    <link rel="icon" href="{{faviconUrl}}">
    <link rel="stylesheet" href="/assets/css/style.css">
    <link rel="stylesheet" href="/assets/css/theme-{{themeName}}.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <img src="{{logoUrl}}" alt="{{title}}">
                    <h1><a href="/">{{title}}</a></h1>
                </div>
            </div>
        </div>
    </header>

    <main class="search-page">
        <div class="container">
            <div class="search-header">
                <h1>Search Documentation</h1>
                <div class="search-input-large">
                    <input type="search" id="search-input" placeholder="{{searchPlaceholder}}" autofocus>
                </div>
            </div>

            <div class="search-filters">
                <label>
                    <input type="checkbox" id="filter-api" checked> API Reference
                </label>
                <label>
                    <input type="checkbox" id="filter-guides" checked> Guides
                </label>
                <label>
                    <input type="checkbox" id="filter-tutorials" checked> Tutorials
                </label>
            </div>

            <div id="search-results" class="search-results-page">
                <div class="search-placeholder">
                    <p>Enter your search terms above to find relevant documentation.</p>
                </div>
            </div>
        </div>
    </main>

    <script src="/assets/js/search-page.js"></script>
    <script src="/assets/js/analytics.js"></script>
</body>
</html>`;
  }

  /**
   * Get default category template
   */
  private getDefaultCategoryTemplate(): string {
    return `<!DOCTYPE html>
<html lang="{{language}}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{category}} - {{title}}</title>
    <link rel="icon" href="{{faviconUrl}}">
    <link rel="stylesheet" href="/assets/css/style.css">
    <link rel="stylesheet" href="/assets/css/theme-{{themeName}}.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <img src="{{logoUrl}}" alt="{{title}}">
                    <h1><a href="/">{{title}}</a></h1>
                </div>
                <div class="search-container">
                    <input type="search" id="search-input" placeholder="{{searchPlaceholder}}">
                    <div id="search-results" class="search-results"></div>
                </div>
            </div>
        </div>
    </header>

    <main class="category-page">
        <div class="container">
            <div class="category-header">
                <h1>{{category}}</h1>
                <p>{{pages.length}} articles in this category</p>
            </div>

            <div class="pages-grid">
                {{#pages}}
                <div class="page-card">
                    <h3><a href="/{{path}}">{{title}}</a></h3>
                    <p>{{metadata.description}}</p>
                    <div class="page-meta">
                        <span class="difficulty difficulty-{{difficulty}}">{{difficulty}}</span>
                        <span class="read-time">{{estimatedReadTime}} min read</span>
                        <span class="last-updated">{{lastModified}}</span>
                    </div>
                    <div class="page-tags">
                        {{#tags}}
                        <span class="tag">{{.}}</span>
                        {{/tags}}
                    </div>
                </div>
                {{/pages}}
            </div>
        </div>
    </main>

    <script src="/assets/js/search.js"></script>
    <script src="/assets/js/analytics.js"></script>
</body>
</html>`;
  }

  /**
   * Render template with data
   */
  private renderTemplate(template: string, data: any): string {
    // Simple Mustache-like template rendering
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path.trim());
      return value !== undefined ? String(value) : '';
    });
  }

  /**
   * Get nested value from object by path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Generate static assets
   */
  private async generateStaticAssets(): Promise<void> {
    const assetsDir = path.join(this.config.outputDirectory, 'assets');

    // Generate CSS
    await this.generateCSS(path.join(assetsDir, 'css'));

    // Generate JavaScript
    await this.generateJavaScript(path.join(assetsDir, 'js'));

    // Copy static files
    if (await fs.pathExists(this.config.staticDirectory)) {
      await fs.copy(this.config.staticDirectory, assetsDir);
    }
  }

  /**
   * Generate CSS files
   */
  private async generateCSS(cssDir: string): Promise<void> {
    await fs.ensureDir(cssDir);

    const mainCSS = this.generateMainCSS();
    await fs.writeFile(path.join(cssDir, 'style.css'), mainCSS);

    const themeCSS = this.generateThemeCSS();
    await fs.writeFile(path.join(cssDir, `theme-${this.config.themeName}.css`), themeCSS);

    if (this.config.customCss) {
      await fs.writeFile(path.join(cssDir, 'custom.css'), this.config.customCss);
    }
  }

  /**
   * Generate main CSS
   */
  private generateMainCSS(): string {
    return `
/* Main Documentation Styles */
* {
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 0;
    color: var(--text-color);
    background-color: var(--bg-color);
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Header */
.header {
    background: var(--header-bg);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 0;
}

.logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.logo img {
    height: 32px;
}

.logo h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
}

.logo a {
    text-decoration: none;
    color: inherit;
}

/* Search */
.search-container {
    position: relative;
    width: 300px;
}

#search-input {
    width: 100%;
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--input-bg);
    color: var(--text-color);
}

.search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    max-height: 400px;
    overflow-y: auto;
    z-index: 1000;
    display: none;
}

.search-result {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
}

.search-result:hover {
    background: var(--hover-bg);
}

.search-result h4 {
    margin: 0 0 0.25rem 0;
    color: var(--primary-color);
}

.search-result p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

/* Layout */
.layout {
    display: grid;
    grid-template-columns: 250px 1fr 200px;
    gap: 2rem;
    min-height: calc(100vh - 80px);
}

/* Sidebar */
.sidebar {
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border-color);
    padding: 2rem 1rem;
}

.nav-section h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
}

.nav-section ul {
    list-style: none;
    margin: 0 0 2rem 0;
    padding: 0;
}

.nav-section li {
    margin: 0.25rem 0;
}

.nav-section a {
    display: block;
    padding: 0.25rem 0.5rem;
    color: var(--text-color);
    text-decoration: none;
    border-radius: 4px;
    font-size: 0.875rem;
}

.nav-section a:hover {
    background: var(--hover-bg);
}

.nav-section a.current {
    background: var(--primary-color);
    color: white;
}

/* Content */
.content {
    padding: 2rem 0;
    min-width: 0;
}

.page-header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
}

.breadcrumb {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
}

.breadcrumb a {
    color: var(--text-secondary);
    text-decoration: none;
}

.breadcrumb a:hover {
    color: var(--primary-color);
}

.breadcrumb a:not(:last-child)::after {
    content: " / ";
    margin-left: 0.5rem;
}

.page-meta {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.category, .difficulty, .tag {
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
}

.category {
    background: var(--primary-color);
    color: white;
}

.difficulty-beginner {
    background: #10b981;
    color: white;
}

.difficulty-intermediate {
    background: #f59e0b;
    color: white;
}

.difficulty-advanced {
    background: #ef4444;
    color: white;
}

.tag {
    background: var(--tag-bg);
    color: var(--text-color);
}

/* Table of Contents */
.toc {
    padding: 2rem 0;
}

.toc-content {
    position: sticky;
    top: 100px;
}

.toc h3 {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    font-weight: 600;
}

.toc ul {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.875rem;
}

.toc li {
    margin: 0.25rem 0;
}

.toc a {
    color: var(--text-secondary);
    text-decoration: none;
    display: block;
    padding: 0.125rem 0;
}

.toc a:hover {
    color: var(--primary-color);
}

/* Buttons */
.btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-primary {
    background: var(--primary-color);
    color: white;
}

.btn-primary:hover {
    background: var(--primary-hover);
}

.btn-secondary {
    background: transparent;
    color: var(--primary-color);
    border: 1px solid var(--primary-color);
}

.btn-secondary:hover {
    background: var(--primary-color);
    color: white;
}

/* Cards */
.cards-grid, .categories-grid, .pages-grid, .related-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
}

.card, .category-card, .page-card, .related-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    transition: box-shadow 0.2s;
}

.card:hover, .category-card:hover, .page-card:hover, .related-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card h3, .category-card h3, .page-card h3, .related-card h4 {
    margin: 0 0 0.5rem 0;
}

.card a, .category-card a, .page-card a, .related-card a {
    color: var(--primary-color);
    text-decoration: none;
}

.card a:hover, .category-card a:hover, .page-card a:hover, .related-card a:hover {
    text-decoration: underline;
}

/* Feedback */
.feedback-section {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border-color);
}

.feedback-buttons {
    display: flex;
    gap: 1rem;
    margin: 1rem 0;
}

.btn-feedback {
    background: none;
    border: 1px solid var(--border-color);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-feedback:hover {
    background: var(--hover-bg);
}

.feedback-form textarea {
    width: 100%;
    min-height: 100px;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    margin: 1rem 0;
    font-family: inherit;
    resize: vertical;
}

/* Footer */
.footer {
    background: var(--footer-bg);
    border-top: 1px solid var(--border-color);
    margin-top: auto;
    padding: 2rem 0;
}

.footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.footer-links {
    display: flex;
    gap: 2rem;
}

.footer-links a {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
}

.footer-links a:hover {
    color: var(--primary-color);
}

.social-links {
    display: flex;
    gap: 1rem;
}

.social-links a {
    color: var(--text-secondary);
    font-size: 1.25rem;
}

.social-links a:hover {
    color: var(--primary-color);
}

/* Responsive */
@media (max-width: 768px) {
    .layout {
        grid-template-columns: 1fr;
        gap: 0;
    }

    .sidebar {
        order: 2;
    }

    .toc {
        display: none;
    }

    .header-content {
        flex-direction: column;
        gap: 1rem;
    }

    .search-container {
        width: 100%;
    }
}
`;
  }

  /**
   * Generate theme CSS
   */
  private generateThemeCSS(): string {
    return `
/* Modern Theme Variables */
:root {
    --primary-color: #2563eb;
    --primary-hover: #1d4ed8;
    --text-color: #1f2937;
    --text-secondary: #6b7280;
    --bg-color: #ffffff;
    --header-bg: #ffffff;
    --sidebar-bg: #f9fafb;
    --card-bg: #ffffff;
    --footer-bg: #f9fafb;
    --border-color: #e5e7eb;
    --hover-bg: #f3f4f6;
    --input-bg: #ffffff;
    --tag-bg: #e5e7eb;
}

/* Dark theme */
@media (prefers-color-scheme: dark) {
    :root {
        --primary-color: #3b82f6;
        --primary-hover: #2563eb;
        --text-color: #f9fafb;
        --text-secondary: #9ca3af;
        --bg-color: #111827;
        --header-bg: #1f2937;
        --sidebar-bg: #1f2937;
        --card-bg: #1f2937;
        --footer-bg: #1f2937;
        --border-color: #374151;
        --hover-bg: #374151;
        --input-bg: #374151;
        --tag-bg: #374151;
    }
}

/* Custom scrollbar */
::-webkit-scrollbar {
    width: 6px;
}

::-webkit-scrollbar-track {
    background: var(--bg-color);
}

::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
}
`;
  }

  /**
   * Generate JavaScript files
   */
  private async generateJavaScript(jsDir: string): Promise<void> {
    await fs.ensureDir(jsDir);

    // Generate search functionality
    const searchJS = this.generateSearchJS();
    await fs.writeFile(path.join(jsDir, 'search.js'), searchJS);

    // Generate page functionality
    const pageJS = this.generatePageJS();
    await fs.writeFile(path.join(jsDir, 'page.js'), pageJS);

    // Generate feedback functionality
    const feedbackJS = this.generateFeedbackJS();
    await fs.writeFile(path.join(jsDir, 'feedback.js'), feedbackJS);

    // Generate analytics
    const analyticsJS = this.generateAnalyticsJS();
    await fs.writeFile(path.join(jsDir, 'analytics.js'), analyticsJS);

    if (this.config.customJs) {
      await fs.writeFile(path.join(jsDir, 'custom.js'), this.config.customJs);
    }
  }

  /**
   * Generate search JavaScript
   */
  private generateSearchJS(): string {
    return `
// Search functionality
class DocumentationSearch {
    constructor() {
        this.searchInput = document.getElementById('search-input');
        this.searchResults = document.getElementById('search-results');
        this.searchIndex = null;

        this.init();
    }

    async init() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.handleSearch.bind(this));
            this.searchInput.addEventListener('focus', this.showResults.bind(this));
            document.addEventListener('click', this.hideResults.bind(this));

            // Load search index
            await this.loadSearchIndex();
        }
    }

    async loadSearchIndex() {
        try {
            const response = await fetch('/api/search-index.json');
            this.searchIndex = await response.json();
        } catch (error) {
            console.error('Failed to load search index:', error);
        }
    }

    handleSearch(event) {
        const query = event.target.value.trim();

        if (query.length < 2) {
            this.hideResults();
            return;
        }

        const results = this.search(query);
        this.displayResults(results);
    }

    search(query) {
        if (!this.searchIndex) return [];

        const results = [];
        const queryLower = query.toLowerCase();

        for (const item of this.searchIndex.entries) {
            let score = 0;

            // Title match
            if (item.name.toLowerCase().includes(queryLower)) {
                score += 10;
            }

            // Content match
            if (item.searchTerms.includes(queryLower)) {
                score += 5;
            }

            // Partial matches
            for (const term of item.searchTerms.split(' ')) {
                if (term.includes(queryLower)) {
                    score += 1;
                }
            }

            if (score > 0) {
                results.push({
                    ...item,
                    score
                });
            }
        }

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
    }

    displayResults(results) {
        if (!this.searchResults) return;

        if (results.length === 0) {
            this.searchResults.innerHTML = '<div class="search-result"><p>No results found</p></div>';
        } else {
            const html = results.map(result => \`
                <div class="search-result" onclick="window.location.href='/\${result.path}'">
                    <h4>\${result.name}</h4>
                    <p>\${result.description || result.kind}</p>
                    <small>\${result.category}</small>
                </div>
            \`).join('');

            this.searchResults.innerHTML = html;
        }

        this.showResults();
    }

    showResults() {
        if (this.searchResults) {
            this.searchResults.style.display = 'block';
        }
    }

    hideResults(event) {
        if (this.searchResults &&
            !this.searchInput.contains(event?.target) &&
            !this.searchResults.contains(event?.target)) {
            this.searchResults.style.display = 'none';
        }
    }
}

// Initialize search when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DocumentationSearch();
});
`;
  }

  /**
   * Generate page JavaScript
   */
  private generatePageJS(): string {
    return `
// Page functionality
class DocumentationPage {
    constructor() {
        this.init();
    }

    init() {
        this.setupTableOfContents();
        this.setupCopyButtons();
        this.setupScrollSpy();
        this.setupThemeToggle();
    }

    setupTableOfContents() {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const toc = document.querySelector('.toc ul');

        if (!toc || headings.length === 0) return;

        headings.forEach(heading => {
            if (!heading.id) {
                heading.id = this.slugify(heading.textContent);
            }

            const li = document.createElement('li');
            li.innerHTML = \`<a href="#\${heading.id}">\${heading.textContent}</a>\`;
            toc.appendChild(li);
        });
    }

    setupCopyButtons() {
        const codeBlocks = document.querySelectorAll('pre code');

        codeBlocks.forEach(block => {
            const button = document.createElement('button');
            button.className = 'copy-button';
            button.textContent = 'Copy';
            button.onclick = () => this.copyCode(button, block);

            block.parentElement.style.position = 'relative';
            block.parentElement.appendChild(button);
        });
    }

    setupScrollSpy() {
        const tocLinks = document.querySelectorAll('.toc a');
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

        if (tocLinks.length === 0 || headings.length === 0) return;

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    tocLinks.forEach(link => link.classList.remove('active'));
                    const activeLink = document.querySelector(\`a[href="#\${entry.target.id}"]\`);
                    if (activeLink) {
                        activeLink.classList.add('active');
                    }
                }
            });
        }, { rootMargin: '-20% 0px -35% 0px' });

        headings.forEach(heading => observer.observe(heading));
    }

    setupThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        if (!themeToggle) return;

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme',
                document.body.classList.contains('dark-theme') ? 'dark' : 'light'
            );
        });

        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    }

    async copyCode(button, codeBlock) {
        try {
            await navigator.clipboard.writeText(codeBlock.textContent);
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = 'Copy';
            }, 2000);
        } catch (error) {
            console.error('Failed to copy code:', error);
        }
    }

    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
}

// Initialize page functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DocumentationPage();
});
`;
  }

  /**
   * Generate feedback JavaScript
   */
  private generateFeedbackJS(): string {
    return `
// Feedback functionality
class DocumentationFeedback {
    constructor() {
        this.init();
    }

    init() {
        this.setupFeedbackButtons();
    }

    setupFeedbackButtons() {
        const feedbackButtons = document.querySelectorAll('.btn-feedback');
        const feedbackForm = document.querySelector('.feedback-form');

        feedbackButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const helpful = event.target.dataset.helpful === 'true';
                this.submitFeedback(helpful);

                if (!helpful && feedbackForm) {
                    feedbackForm.style.display = 'block';
                }
            });
        });

        const submitButton = document.querySelector('.feedback-form .btn');
        if (submitButton) {
            submitButton.addEventListener('click', this.submitDetailedFeedback.bind(this));
        }
    }

    async submitFeedback(helpful) {
        const pageId = this.getPageId();

        try {
            await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pageId,
                    helpful,
                    timestamp: new Date().toISOString()
                })
            });

            this.showFeedbackThankYou(helpful);
        } catch (error) {
            console.error('Failed to submit feedback:', error);
        }
    }

    async submitDetailedFeedback() {
        const pageId = this.getPageId();
        const textarea = document.querySelector('.feedback-form textarea');
        const feedback = textarea?.value.trim();

        if (!feedback) return;

        try {
            await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pageId,
                    helpful: false,
                    feedback,
                    timestamp: new Date().toISOString()
                })
            });

            this.showFeedbackThankYou(false);
            textarea.value = '';
            document.querySelector('.feedback-form').style.display = 'none';
        } catch (error) {
            console.error('Failed to submit detailed feedback:', error);
        }
    }

    getPageId() {
        return document.querySelector('[data-page-id]')?.dataset.pageId ||
               window.location.pathname;
    }

    showFeedbackThankYou(helpful) {
        const message = helpful ?
            'Thank you for your feedback!' :
            'Thank you for helping us improve!';

        const existingMessage = document.querySelector('.feedback-thank-you');
        if (existingMessage) {
            existingMessage.remove();
        }

        const thankYou = document.createElement('div');
        thankYou.className = 'feedback-thank-you';
        thankYou.textContent = message;
        thankYou.style.cssText = \`
            background: #10b981;
            color: white;
            padding: 0.75rem 1rem;
            border-radius: 6px;
            margin-top: 1rem;
            animation: fadeInOut 3s ease-in-out;
        \`;

        const feedbackSection = document.querySelector('.feedback-section');
        if (feedbackSection) {
            feedbackSection.appendChild(thankYou);

            setTimeout(() => {
                thankYou.remove();
            }, 3000);
        }
    }
}

// Initialize feedback functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DocumentationFeedback();
});
`;
  }

  /**
   * Generate analytics JavaScript
   */
  private generateAnalyticsJS(): string {
    return `
// Analytics functionality
class DocumentationAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.init();
    }

    init() {
        this.trackPageView();
        this.setupEventTracking();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async trackEvent(event, data = {}) {
        try {
            await fetch('/api/analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    event,
                    data,
                    pageId: this.getPageId(),
                    sessionId: this.sessionId,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    referrer: document.referrer
                })
            });
        } catch (error) {
            console.error('Failed to track event:', error);
        }
    }

    trackPageView() {
        this.trackEvent('view', {
            title: document.title,
            path: window.location.pathname
        });
    }

    setupEventTracking() {
        // Track search usage
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (event) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (event.target.value.length > 2) {
                        this.trackEvent('search', {
                            query: event.target.value
                        });
                    }
                }, 500);
            });
        }

        // Track external links
        document.querySelectorAll('a[href^="http"]').forEach(link => {
            link.addEventListener('click', () => {
                this.trackEvent('external_link', {
                    url: link.href,
                    text: link.textContent
                });
            });
        });

        // Track downloads
        document.querySelectorAll('a[download]').forEach(link => {
            link.addEventListener('click', () => {
                this.trackEvent('download', {
                    file: link.href,
                    name: link.download
                });
            });
        });

        // Track scroll depth
        let maxScrollDepth = 0;
        window.addEventListener('scroll', () => {
            const scrollDepth = Math.round(
                (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
            );

            if (scrollDepth > maxScrollDepth && scrollDepth % 25 === 0) {
                maxScrollDepth = scrollDepth;
                this.trackEvent('scroll', {
                    depth: scrollDepth
                });
            }
        });
    }

    getPageId() {
        return document.querySelector('[data-page-id]')?.dataset.pageId ||
               window.location.pathname;
    }
}

// Initialize analytics when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DocumentationAnalytics();
});
`;
  }

  /**
   * Generate API files
   */
  private async generateApiFiles(): Promise<void> {
    const apiDir = path.join(this.config.outputDirectory, 'api');

    // Generate search index JSON
    if (this.config.enableSearch) {
      const searchIndexData = {
        entries: Array.from(this.pages.values()).map(page => ({
          id: page.id,
          name: page.title,
          description: page.metadata.description || '',
          path: page.path,
          category: page.category,
          kind: 'page',
          searchTerms: page.searchTerms.join(' '),
        })),
      };

      await fs.writeFile(
        path.join(apiDir, 'search-index.json'),
        JSON.stringify(searchIndexData, null, 2)
      );
    }

    // Generate navigation JSON
    await fs.writeFile(
      path.join(apiDir, 'navigation.json'),
      JSON.stringify(this.navigation, null, 2)
    );

    // Generate site metadata
    const metadata = {
      title: 'AIgent Documentation',
      description: 'Comprehensive documentation for the AIgent platform',
      generatedAt: new Date().toISOString(),
      pageCount: this.pages.size,
      categories: this.navigation.length,
    };

    await fs.writeFile(
      path.join(apiDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
  }

  /**
   * Generate service worker for offline support
   */
  private async generateServiceWorker(): Promise<void> {
    const serviceWorker = `
// Documentation Service Worker
const CACHE_NAME = 'docs-v1';
const CACHE_URLS = [
  '/',
  '/assets/css/style.css',
  '/assets/js/search.js',
  '/assets/js/page.js',
  '/api/search-index.json',
  '/api/navigation.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
`;

    await fs.writeFile(
      path.join(this.config.outputDirectory, 'sw.js'),
      serviceWorker
    );
  }

  /**
   * Get site configuration
   */
  private getSiteConfig(): SiteConfig {
    return {
      title: 'AIgent Documentation',
      description: 'Comprehensive documentation for the AIgent platform',
      baseUrl: 'https://docs.aigent.ai',
      logoUrl: '/assets/logo.svg',
      faviconUrl: '/assets/favicon.ico',
      primaryColor: '#2563eb',
      socialLinks: [
        { platform: 'github', url: 'https://github.com/aigent/aigent', icon: 'github' },
        { platform: 'discord', url: 'https://discord.gg/aigent', icon: 'discord' },
        { platform: 'twitter', url: 'https://twitter.com/aigent', icon: 'twitter' },
      ],
      footerLinks: [
        { title: 'Privacy Policy', url: '/privacy', external: false },
        { title: 'Terms of Service', url: '/terms', external: false },
        { title: 'Support', url: 'mailto:support@aigent.ai', external: true },
      ],
      searchPlaceholder: 'Search documentation...',
      language: 'en',
      feedbackEnabled: this.config.enableComments,
      downloadEnabled: true,
    };
  }

  /**
   * Get featured pages
   */
  private getFeaturedPages(): DocumentationPage[] {
    return Array.from(this.pages.values())
      .filter(page => page.metadata.featured === true)
      .slice(0, 6);
  }

  /**
   * Get recent pages
   */
  private getRecentPages(): DocumentationPage[] {
    return Array.from(this.pages.values())
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, 5);
  }

  /**
   * Get popular categories
   */
  private getPopularCategories(): Array<{ name: string; count: number }> {
    const categories = new Map<string, number>();

    for (const page of this.pages.values()) {
      categories.set(page.category, (categories.get(page.category) || 0) + 1);
    }

    return Array.from(categories.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(content: string): string {
    const headings = content.match(/^#{1,6}\s+.+$/gm) || [];

    if (headings.length === 0) {
      return '';
    }

    let html = '<ul>';

    for (const heading of headings) {
      const level = heading.match(/^#+/)?.[0].length || 0;
      const text = heading.replace(/^#+\s+/, '');
      const id = this.slugify(text);

      html += `<li><a href="#${id}">${text}</a></li>`;
    }

    html += '</ul>';
    return html;
  }

  /**
   * Get related pages
   */
  private getRelatedPages(page: DocumentationPage): DocumentationPage[] {
    const related = [];

    // Add explicitly related pages
    for (const relatedId of page.relatedPages) {
      const relatedPage = this.pages.get(relatedId);
      if (relatedPage) {
        related.push(relatedPage);
      }
    }

    // Add pages from same category
    if (related.length < 3) {
      const sameCategory = Array.from(this.pages.values())
        .filter(p => p.id !== page.id && p.category === page.category)
        .slice(0, 3 - related.length);
      related.push(...sameCategory);
    }

    return related;
  }

  /**
   * Generate breadcrumb
   */
  private generateBreadcrumb(page: DocumentationPage): Array<{ title: string; path: string }> {
    const breadcrumb = [
      { title: 'Home', path: '/' },
      { title: page.category, path: `/category/${page.category.toLowerCase()}` },
    ];

    if (page.parentPage) {
      const parent = this.pages.get(page.parentPage);
      if (parent) {
        breadcrumb.push({ title: parent.title, path: parent.path });
      }
    }

    return breadcrumb;
  }

  /**
   * Convert string to slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}

export default {
  InteractiveDocumentationPlatform,
  DEFAULT_INTERACTIVE_CONFIG,
};