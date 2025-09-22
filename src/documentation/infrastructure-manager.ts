/**
 * Documentation Infrastructure Manager - Performance and Optimization
 *
 * This system manages the complete documentation infrastructure including
 * CDN optimization, caching strategies, performance monitoring, scalability,
 * and infrastructure automation for the AIgent platform documentation.
 *
 * @fileoverview Documentation infrastructure and performance optimization
 * @version 1.0.0
 * @author Documentation Infrastructure Agent
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { promisify } from 'util';
import { exec } from 'child_process';
import { createHash } from 'crypto';

const execAsync = promisify(exec);

/**
 * Infrastructure configuration
 */
export interface InfrastructureConfig {
  projectRoot: string;
  buildDirectory: string;
  cdnEndpoint?: string;
  cacheDirectory: string;
  enableCompression: boolean;
  enableCDN: boolean;
  enableCaching: boolean;
  enableMinification: boolean;
  enableImageOptimization: boolean;
  enableServiceWorker: boolean;
  compressionLevel: number;
  cacheMaxAge: number;
  cdnPurgeUrl?: string;
  performanceTargets: PerformanceTargets;
  optimizationSettings: OptimizationSettings;
  monitoringConfig: MonitoringConfig;
}

/**
 * Performance targets
 */
export interface PerformanceTargets {
  lighthouse: LighthouseTargets;
  core_web_vitals: CoreWebVitalsTargets;
  resource_hints: ResourceHintTargets;
  bundle_size: BundleSizeTargets;
}

/**
 * Lighthouse performance targets
 */
export interface LighthouseTargets {
  performance: number;
  accessibility: number;
  best_practices: number;
  seo: number;
  pwa: number;
}

/**
 * Core Web Vitals targets
 */
export interface CoreWebVitalsTargets {
  largest_contentful_paint: number; // ms
  first_input_delay: number; // ms
  cumulative_layout_shift: number; // score
  first_contentful_paint: number; // ms
  time_to_interactive: number; // ms
}

/**
 * Resource hint targets
 */
export interface ResourceHintTargets {
  max_critical_requests: number;
  max_critical_kb: number;
  max_images_per_page: number;
  max_fonts_per_page: number;
}

/**
 * Bundle size targets
 */
export interface BundleSizeTargets {
  max_js_bundle_kb: number;
  max_css_bundle_kb: number;
  max_image_kb: number;
  max_total_page_kb: number;
}

/**
 * Optimization settings
 */
export interface OptimizationSettings {
  images: ImageOptimizationSettings;
  css: CSSOptimizationSettings;
  javascript: JavaScriptOptimizationSettings;
  html: HTMLOptimizationSettings;
  fonts: FontOptimizationSettings;
}

/**
 * Image optimization settings
 */
export interface ImageOptimizationSettings {
  formats: string[];
  quality: number;
  progressive: boolean;
  responsive: boolean;
  lazy_loading: boolean;
  webp_fallback: boolean;
  avif_support: boolean;
  max_width: number;
  compression_level: number;
}

/**
 * CSS optimization settings
 */
export interface CSSOptimizationSettings {
  minify: boolean;
  autoprefixer: boolean;
  purge_unused: boolean;
  critical_css: boolean;
  inline_critical: boolean;
  extract_media_queries: boolean;
}

/**
 * JavaScript optimization settings
 */
export interface JavaScriptOptimizationSettings {
  minify: boolean;
  tree_shaking: boolean;
  code_splitting: boolean;
  lazy_loading: boolean;
  preload_modules: boolean;
  source_maps: boolean;
}

/**
 * HTML optimization settings
 */
export interface HTMLOptimizationSettings {
  minify: boolean;
  inline_critical_css: boolean;
  preload_resources: boolean;
  optimize_images: boolean;
  remove_comments: boolean;
  collapse_whitespace: boolean;
}

/**
 * Font optimization settings
 */
export interface FontOptimizationSettings {
  preload: boolean;
  display_swap: boolean;
  subset: boolean;
  woff2_conversion: boolean;
  variable_fonts: boolean;
  font_face_observer: boolean;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enable_real_user_monitoring: boolean;
  enable_synthetic_monitoring: boolean;
  performance_budget: PerformanceBudget;
  alerting: AlertingConfig;
  analytics: AnalyticsConfig;
}

/**
 * Performance budget
 */
export interface PerformanceBudget {
  max_bundle_size: number;
  max_image_size: number;
  max_font_size: number;
  max_requests: number;
  max_load_time: number;
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  slack_webhook?: string;
  email_recipients: string[];
  alert_thresholds: AlertThresholds;
}

/**
 * Alert thresholds
 */
export interface AlertThresholds {
  performance_score: number;
  load_time: number;
  error_rate: number;
  availability: number;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  google_analytics_id?: string;
  google_tag_manager_id?: string;
  custom_analytics_endpoint?: string;
  track_page_views: boolean;
  track_user_interactions: boolean;
  track_performance_metrics: boolean;
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  optimizationId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'success' | 'failure' | 'partial';
  optimizations: OptimizationStep[];
  metrics: OptimizationMetrics;
  artifacts: OptimizedArtifact[];
}

/**
 * Optimization step
 */
export interface OptimizationStep {
  name: string;
  type: 'compression' | 'minification' | 'optimization' | 'caching';
  status: 'success' | 'failure' | 'skipped';
  duration: number;
  input_size: number;
  output_size: number;
  savings_bytes: number;
  savings_percentage: number;
}

/**
 * Optimization metrics
 */
export interface OptimizationMetrics {
  total_files: number;
  optimized_files: number;
  total_input_size: number;
  total_output_size: number;
  total_savings: number;
  compression_ratio: number;
  performance_score_improvement: number;
}

/**
 * Optimized artifact
 */
export interface OptimizedArtifact {
  original_path: string;
  optimized_path: string;
  type: 'image' | 'css' | 'js' | 'html' | 'font';
  original_size: number;
  optimized_size: number;
  savings: number;
  hash: string;
}

/**
 * Default infrastructure configuration
 */
export const DEFAULT_INFRASTRUCTURE_CONFIG: InfrastructureConfig = {
  projectRoot: process.cwd(),
  buildDirectory: 'docs-build',
  cacheDirectory: '.cache',
  enableCompression: true,
  enableCDN: true,
  enableCaching: true,
  enableMinification: true,
  enableImageOptimization: true,
  enableServiceWorker: true,
  compressionLevel: 6,
  cacheMaxAge: 86400, // 24 hours
  performanceTargets: {
    lighthouse: {
      performance: 90,
      accessibility: 95,
      best_practices: 90,
      seo: 95,
      pwa: 80,
    },
    core_web_vitals: {
      largest_contentful_paint: 2500,
      first_input_delay: 100,
      cumulative_layout_shift: 0.1,
      first_contentful_paint: 1800,
      time_to_interactive: 3800,
    },
    resource_hints: {
      max_critical_requests: 10,
      max_critical_kb: 150,
      max_images_per_page: 20,
      max_fonts_per_page: 3,
    },
    bundle_size: {
      max_js_bundle_kb: 250,
      max_css_bundle_kb: 50,
      max_image_kb: 500,
      max_total_page_kb: 1000,
    },
  },
  optimizationSettings: {
    images: {
      formats: ['webp', 'avif', 'jpg', 'png'],
      quality: 85,
      progressive: true,
      responsive: true,
      lazy_loading: true,
      webp_fallback: true,
      avif_support: true,
      max_width: 1920,
      compression_level: 7,
    },
    css: {
      minify: true,
      autoprefixer: true,
      purge_unused: true,
      critical_css: true,
      inline_critical: true,
      extract_media_queries: true,
    },
    javascript: {
      minify: true,
      tree_shaking: true,
      code_splitting: true,
      lazy_loading: true,
      preload_modules: true,
      source_maps: false,
    },
    html: {
      minify: true,
      inline_critical_css: true,
      preload_resources: true,
      optimize_images: true,
      remove_comments: true,
      collapse_whitespace: true,
    },
    fonts: {
      preload: true,
      display_swap: true,
      subset: true,
      woff2_conversion: true,
      variable_fonts: true,
      font_face_observer: true,
    },
  },
  monitoringConfig: {
    enable_real_user_monitoring: true,
    enable_synthetic_monitoring: true,
    performance_budget: {
      max_bundle_size: 300000, // 300KB
      max_image_size: 100000, // 100KB
      max_font_size: 50000, // 50KB
      max_requests: 50,
      max_load_time: 3000, // 3s
    },
    alerting: {
      email_recipients: [],
      alert_thresholds: {
        performance_score: 80,
        load_time: 5000,
        error_rate: 0.01,
        availability: 0.99,
      },
    },
    analytics: {
      track_page_views: true,
      track_user_interactions: true,
      track_performance_metrics: true,
    },
  },
};

/**
 * Documentation Infrastructure Manager
 *
 * Manages documentation infrastructure with performance optimization,
 * CDN integration, caching, and monitoring capabilities.
 */
export class DocumentationInfrastructureManager {
  private readonly logger = new Logger('DocumentationInfrastructureManager');
  private readonly config: InfrastructureConfig;

  constructor(config: Partial<InfrastructureConfig> = {}) {
    this.config = { ...DEFAULT_INFRASTRUCTURE_CONFIG, ...config };
    this.logger.log('Initializing Documentation Infrastructure Manager', {
      buildDirectory: this.config.buildDirectory,
      enableOptimizations: this.config.enableMinification,
    });
  }

  /**
   * Optimize documentation build for production
   */
  public async optimizeDocumentation(): Promise<OptimizationResult> {
    const optimizationId = this.generateOptimizationId();
    this.logger.log(`Starting documentation optimization [${optimizationId}]`);

    const result: OptimizationResult = {
      optimizationId,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      status: 'success',
      optimizations: [],
      metrics: {
        total_files: 0,
        optimized_files: 0,
        total_input_size: 0,
        total_output_size: 0,
        total_savings: 0,
        compression_ratio: 0,
        performance_score_improvement: 0,
      },
      artifacts: [],
    };

    try {
      // Ensure cache directory exists
      await fs.ensureDir(this.config.cacheDirectory);

      // Step 1: Optimize images
      if (this.config.enableImageOptimization) {
        const imageOptimization = await this.optimizeImages();
        result.optimizations.push(imageOptimization);
        result.artifacts.push(...imageOptimization.artifacts || []);
      }

      // Step 2: Optimize CSS
      if (this.config.optimizationSettings.css.minify) {
        const cssOptimization = await this.optimizeCSS();
        result.optimizations.push(cssOptimization);
      }

      // Step 3: Optimize JavaScript
      if (this.config.optimizationSettings.javascript.minify) {
        const jsOptimization = await this.optimizeJavaScript();
        result.optimizations.push(jsOptimization);
      }

      // Step 4: Optimize HTML
      if (this.config.optimizationSettings.html.minify) {
        const htmlOptimization = await this.optimizeHTML();
        result.optimizations.push(htmlOptimization);
      }

      // Step 5: Optimize fonts
      if (this.config.optimizationSettings.fonts.woff2_conversion) {
        const fontOptimization = await this.optimizeFonts();
        result.optimizations.push(fontOptimization);
      }

      // Step 6: Enable compression
      if (this.config.enableCompression) {
        const compressionStep = await this.enableCompression();
        result.optimizations.push(compressionStep);
      }

      // Step 7: Setup caching
      if (this.config.enableCaching) {
        await this.setupCaching();
      }

      // Step 8: Generate service worker
      if (this.config.enableServiceWorker) {
        await this.generateServiceWorker();
      }

      // Step 9: Setup CDN
      if (this.config.enableCDN && this.config.cdnEndpoint) {
        await this.setupCDN();
      }

      // Calculate final metrics
      result.metrics = await this.calculateOptimizationMetrics(result.optimizations);

      this.logger.log(`Documentation optimization completed [${optimizationId}]`, {
        status: result.status,
        totalSavings: result.metrics.total_savings,
        compressionRatio: result.metrics.compression_ratio,
      });

    } catch (error) {
      result.status = 'failure';
      this.logger.error(`Documentation optimization failed [${optimizationId}]`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();
    }

    return result;
  }

  /**
   * Optimize images
   */
  private async optimizeImages(): Promise<OptimizationStep & { artifacts?: OptimizedArtifact[] }> {
    this.logger.log('Optimizing images');

    const step: OptimizationStep & { artifacts?: OptimizedArtifact[] } = {
      name: 'image-optimization',
      type: 'optimization',
      status: 'success',
      duration: 0,
      input_size: 0,
      output_size: 0,
      savings_bytes: 0,
      savings_percentage: 0,
      artifacts: [],
    };

    const startTime = Date.now();

    try {
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
      const imagePattern = `${this.config.buildDirectory}/**/*.{${imageExtensions.join(',')}}`;

      const { glob } = await import('glob');
      const imageFiles = await glob(imagePattern);

      for (const imagePath of imageFiles) {
        const artifact = await this.optimizeImage(imagePath);
        if (artifact) {
          step.artifacts!.push(artifact);
          step.input_size += artifact.original_size;
          step.output_size += artifact.optimized_size;
        }
      }

      step.savings_bytes = step.input_size - step.output_size;
      step.savings_percentage = step.input_size > 0 ? (step.savings_bytes / step.input_size) * 100 : 0;

    } catch (error) {
      step.status = 'failure';
      this.logger.error('Image optimization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      step.duration = Date.now() - startTime;
    }

    return step;
  }

  /**
   * Optimize individual image
   */
  private async optimizeImage(imagePath: string): Promise<OptimizedArtifact | null> {
    try {
      const originalStats = await fs.stat(imagePath);
      const originalSize = originalStats.size;

      // Skip if image is already optimized or too small
      if (originalSize < 1000) return null;

      const ext = path.extname(imagePath).toLowerCase();
      const optimizedPath = imagePath.replace(ext, `.optimized${ext}`);

      // Use sharp for image optimization if available
      try {
        const sharp = await import('sharp');

        let pipeline = sharp.default(imagePath);

        // Apply optimizations based on format
        if (ext === '.jpg' || ext === '.jpeg') {
          pipeline = pipeline.jpeg({
            quality: this.config.optimizationSettings.images.quality,
            progressive: this.config.optimizationSettings.images.progressive,
          });
        } else if (ext === '.png') {
          pipeline = pipeline.png({
            compressionLevel: this.config.optimizationSettings.images.compression_level,
            progressive: this.config.optimizationSettings.images.progressive,
          });
        } else if (ext === '.webp') {
          pipeline = pipeline.webp({
            quality: this.config.optimizationSettings.images.quality,
          });
        }

        // Resize if too large
        const metadata = await sharp.default(imagePath).metadata();
        if (metadata.width && metadata.width > this.config.optimizationSettings.images.max_width) {
          pipeline = pipeline.resize({
            width: this.config.optimizationSettings.images.max_width,
            withoutEnlargement: true,
          });
        }

        await pipeline.toFile(optimizedPath);

        // Replace original with optimized
        await fs.move(optimizedPath, imagePath, { overwrite: true });

        const optimizedStats = await fs.stat(imagePath);
        const optimizedSize = optimizedStats.size;

        return {
          original_path: imagePath,
          optimized_path: imagePath,
          type: 'image',
          original_size: originalSize,
          optimized_size: optimizedSize,
          savings: originalSize - optimizedSize,
          hash: this.calculateFileHash(imagePath),
        };

      } catch (sharpError) {
        this.logger.warn(`Sharp not available for image optimization: ${imagePath}`);
        return null;
      }

    } catch (error) {
      this.logger.warn(`Failed to optimize image: ${imagePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Optimize CSS files
   */
  private async optimizeCSS(): Promise<OptimizationStep> {
    this.logger.log('Optimizing CSS');

    const step: OptimizationStep = {
      name: 'css-optimization',
      type: 'minification',
      status: 'success',
      duration: 0,
      input_size: 0,
      output_size: 0,
      savings_bytes: 0,
      savings_percentage: 0,
    };

    const startTime = Date.now();

    try {
      const { glob } = await import('glob');
      const cssFiles = await glob(`${this.config.buildDirectory}/**/*.css`);

      for (const cssPath of cssFiles) {
        const originalStats = await fs.stat(cssPath);
        step.input_size += originalStats.size;

        // Read CSS content
        const cssContent = await fs.readFile(cssPath, 'utf-8');

        // Minify CSS
        let optimizedContent = cssContent;

        try {
          const CleanCSS = await import('clean-css');
          const cleanCSS = new CleanCSS.default({
            level: 2,
            returnPromise: true,
          });

          const result = await cleanCSS.minify(cssContent);
          optimizedContent = result.styles;

        } catch (cleanCSSError) {
          // Fallback to basic minification
          optimizedContent = this.basicCSSMinification(cssContent);
        }

        // Write optimized CSS
        await fs.writeFile(cssPath, optimizedContent);

        const optimizedStats = await fs.stat(cssPath);
        step.output_size += optimizedStats.size;
      }

      step.savings_bytes = step.input_size - step.output_size;
      step.savings_percentage = step.input_size > 0 ? (step.savings_bytes / step.input_size) * 100 : 0;

    } catch (error) {
      step.status = 'failure';
      this.logger.error('CSS optimization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      step.duration = Date.now() - startTime;
    }

    return step;
  }

  /**
   * Basic CSS minification fallback
   */
  private basicCSSMinification(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/\s*{\s*/g, '{') // Remove spaces around braces
      .replace(/;\s*/g, ';') // Remove spaces after semicolons
      .replace(/,\s*/g, ',') // Remove spaces after commas
      .trim();
  }

  /**
   * Optimize JavaScript files
   */
  private async optimizeJavaScript(): Promise<OptimizationStep> {
    this.logger.log('Optimizing JavaScript');

    const step: OptimizationStep = {
      name: 'javascript-optimization',
      type: 'minification',
      status: 'success',
      duration: 0,
      input_size: 0,
      output_size: 0,
      savings_bytes: 0,
      savings_percentage: 0,
    };

    const startTime = Date.now();

    try {
      const { glob } = await import('glob');
      const jsFiles = await glob(`${this.config.buildDirectory}/**/*.js`);

      for (const jsPath of jsFiles) {
        // Skip already minified files
        if (jsPath.includes('.min.js')) continue;

        const originalStats = await fs.stat(jsPath);
        step.input_size += originalStats.size;

        const jsContent = await fs.readFile(jsPath, 'utf-8');

        // Minify JavaScript
        let optimizedContent = jsContent;

        try {
          const terser = await import('terser');
          const result = await terser.minify(jsContent, {
            compress: {
              drop_console: true,
              drop_debugger: true,
            },
            mangle: true,
            format: {
              comments: false,
            },
          });

          if (result.code) {
            optimizedContent = result.code;
          }

        } catch (terserError) {
          // Fallback to basic minification
          optimizedContent = this.basicJSMinification(jsContent);
        }

        await fs.writeFile(jsPath, optimizedContent);

        const optimizedStats = await fs.stat(jsPath);
        step.output_size += optimizedStats.size;
      }

      step.savings_bytes = step.input_size - step.output_size;
      step.savings_percentage = step.input_size > 0 ? (step.savings_bytes / step.input_size) * 100 : 0;

    } catch (error) {
      step.status = 'failure';
      this.logger.error('JavaScript optimization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      step.duration = Date.now() - startTime;
    }

    return step;
  }

  /**
   * Basic JavaScript minification fallback
   */
  private basicJSMinification(js: string): string {
    return js
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/\s*([{}();,])\s*/g, '$1') // Remove spaces around operators
      .trim();
  }

  /**
   * Optimize HTML files
   */
  private async optimizeHTML(): Promise<OptimizationStep> {
    this.logger.log('Optimizing HTML');

    const step: OptimizationStep = {
      name: 'html-optimization',
      type: 'minification',
      status: 'success',
      duration: 0,
      input_size: 0,
      output_size: 0,
      savings_bytes: 0,
      savings_percentage: 0,
    };

    const startTime = Date.now();

    try {
      const { glob } = await import('glob');
      const htmlFiles = await glob(`${this.config.buildDirectory}/**/*.html`);

      for (const htmlPath of htmlFiles) {
        const originalStats = await fs.stat(htmlPath);
        step.input_size += originalStats.size;

        const htmlContent = await fs.readFile(htmlPath, 'utf-8');

        // Minify HTML
        let optimizedContent = htmlContent;

        try {
          const htmlMinifier = await import('html-minifier-terser');
          optimizedContent = await htmlMinifier.minify(htmlContent, {
            collapseWhitespace: this.config.optimizationSettings.html.collapse_whitespace,
            removeComments: this.config.optimizationSettings.html.remove_comments,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
            minifyCSS: true,
            minifyJS: true,
          });

        } catch (minifierError) {
          // Fallback to basic minification
          optimizedContent = this.basicHTMLMinification(htmlContent);
        }

        await fs.writeFile(htmlPath, optimizedContent);

        const optimizedStats = await fs.stat(htmlPath);
        step.output_size += optimizedStats.size;
      }

      step.savings_bytes = step.input_size - step.output_size;
      step.savings_percentage = step.input_size > 0 ? (step.savings_bytes / step.input_size) * 100 : 0;

    } catch (error) {
      step.status = 'failure';
      this.logger.error('HTML optimization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      step.duration = Date.now() - startTime;
    }

    return step;
  }

  /**
   * Basic HTML minification fallback
   */
  private basicHTMLMinification(html: string): string {
    return html
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .trim();
  }

  /**
   * Optimize fonts
   */
  private async optimizeFonts(): Promise<OptimizationStep> {
    this.logger.log('Optimizing fonts');

    const step: OptimizationStep = {
      name: 'font-optimization',
      type: 'optimization',
      status: 'success',
      duration: 0,
      input_size: 0,
      output_size: 0,
      savings_bytes: 0,
      savings_percentage: 0,
    };

    const startTime = Date.now();

    try {
      const { glob } = await import('glob');
      const fontFiles = await glob(`${this.config.buildDirectory}/**/*.{ttf,otf,woff}`);

      for (const fontPath of fontFiles) {
        const originalStats = await fs.stat(fontPath);
        step.input_size += originalStats.size;

        // Convert to WOFF2 if possible
        const ext = path.extname(fontPath);
        if (ext !== '.woff2') {
          try {
            // This would require a WOFF2 conversion library
            // For now, just copy the original size
            step.output_size += originalStats.size;
          } catch (conversionError) {
            step.output_size += originalStats.size;
          }
        } else {
          step.output_size += originalStats.size;
        }
      }

      step.savings_bytes = step.input_size - step.output_size;
      step.savings_percentage = step.input_size > 0 ? (step.savings_bytes / step.input_size) * 100 : 0;

    } catch (error) {
      step.status = 'failure';
      this.logger.error('Font optimization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      step.duration = Date.now() - startTime;
    }

    return step;
  }

  /**
   * Enable compression
   */
  private async enableCompression(): Promise<OptimizationStep> {
    this.logger.log('Enabling compression');

    const step: OptimizationStep = {
      name: 'compression',
      type: 'compression',
      status: 'success',
      duration: 0,
      input_size: 0,
      output_size: 0,
      savings_bytes: 0,
      savings_percentage: 0,
    };

    const startTime = Date.now();

    try {
      const { glob } = await import('glob');
      const compressibleFiles = await glob(`${this.config.buildDirectory}/**/*.{html,css,js,json,xml,svg}`);

      for (const filePath of compressibleFiles) {
        const originalStats = await fs.stat(filePath);
        step.input_size += originalStats.size;

        // Create gzipped version
        const gzipPath = `${filePath}.gz`;
        await this.compressFile(filePath, gzipPath, 'gzip');

        // Create brotli version
        const brotliPath = `${filePath}.br`;
        await this.compressFile(filePath, brotliPath, 'brotli');

        step.output_size += originalStats.size; // Original file size remains the same
      }

      // Note: Compression doesn't reduce the original file size,
      // but provides compressed alternatives for serving
      step.savings_bytes = 0;
      step.savings_percentage = 0;

    } catch (error) {
      step.status = 'failure';
      this.logger.error('Compression failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      step.duration = Date.now() - startTime;
    }

    return step;
  }

  /**
   * Compress file with specified algorithm
   */
  private async compressFile(inputPath: string, outputPath: string, algorithm: 'gzip' | 'brotli'): Promise<void> {
    try {
      if (algorithm === 'gzip') {
        await execAsync(`gzip -c -${this.config.compressionLevel} "${inputPath}" > "${outputPath}"`);
      } else if (algorithm === 'brotli') {
        await execAsync(`brotli -c -q ${this.config.compressionLevel} "${inputPath}" > "${outputPath}"`);
      }
    } catch (error) {
      this.logger.warn(`Failed to compress file with ${algorithm}: ${inputPath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Setup caching headers and strategies
   */
  private async setupCaching(): Promise<void> {
    this.logger.log('Setting up caching');

    // Generate cache manifest
    const cacheManifest = await this.generateCacheManifest();

    // Write cache configuration
    const cacheConfig = {
      version: Date.now(),
      cache_max_age: this.config.cacheMaxAge,
      static_assets: cacheManifest.static_assets,
      dynamic_content: cacheManifest.dynamic_content,
    };

    await fs.writeJson(path.join(this.config.buildDirectory, 'cache-config.json'), cacheConfig, { spaces: 2 });

    // Generate .htaccess for Apache
    const htaccess = this.generateHtaccessRules();
    await fs.writeFile(path.join(this.config.buildDirectory, '.htaccess'), htaccess);

    // Generate nginx configuration
    const nginxConfig = this.generateNginxConfig();
    await fs.writeFile(path.join(this.config.buildDirectory, 'nginx.conf'), nginxConfig);
  }

  /**
   * Generate cache manifest
   */
  private async generateCacheManifest(): Promise<{ static_assets: string[]; dynamic_content: string[] }> {
    const { glob } = await import('glob');

    const staticAssets = await glob(`${this.config.buildDirectory}/**/*.{css,js,png,jpg,jpeg,gif,svg,woff,woff2}`);
    const dynamicContent = await glob(`${this.config.buildDirectory}/**/*.{html,json}`);

    return {
      static_assets: staticAssets.map(file => path.relative(this.config.buildDirectory, file)),
      dynamic_content: dynamicContent.map(file => path.relative(this.config.buildDirectory, file)),
    };
  }

  /**
   * Generate Apache .htaccess rules
   */
  private generateHtaccessRules(): string {
    return `
# Documentation Cache Configuration
<IfModule mod_expires.c>
    ExpiresActive on

    # Static assets - 1 year
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"

    # HTML and JSON - 1 hour
    ExpiresByType text/html "access plus 1 hour"
    ExpiresByType application/json "access plus 1 hour"
</IfModule>

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json image/svg+xml
</IfModule>

# Enable Brotli compression if available
<IfModule mod_brotli.c>
    AddOutputFilterByType BROTLI_COMPRESS text/html text/plain text/xml text/css text/javascript application/javascript application/json image/svg+xml
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
`;
  }

  /**
   * Generate Nginx configuration
   */
  private generateNginxConfig(): string {
    return `
# Documentation Nginx Configuration
server {
    listen 80;
    server_name docs.example.com;
    root /var/www/docs;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/html text/css text/javascript application/javascript application/json image/svg+xml;

    # Brotli compression (if available)
    brotli on;
    brotli_comp_level 6;
    brotli_types text/html text/css text/javascript application/javascript application/json image/svg+xml;

    # Static assets - 1 year cache
    location ~* \\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }

    # HTML and JSON - 1 hour cache
    location ~* \\.(html|json)$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
        add_header Vary "Accept-Encoding";
    }

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
`;
  }

  /**
   * Generate service worker for offline support and caching
   */
  private async generateServiceWorker(): Promise<void> {
    this.logger.log('Generating service worker');

    const cacheManifest = await this.generateCacheManifest();

    const serviceWorker = `
// Documentation Service Worker v${Date.now()}
const CACHE_NAME = 'docs-v${Date.now()}';
const STATIC_CACHE_NAME = 'docs-static-v${Date.now()}';
const DYNAMIC_CACHE_NAME = 'docs-dynamic-v${Date.now()}';

// Static assets to cache immediately
const STATIC_ASSETS = ${JSON.stringify(cacheManifest.static_assets, null, 2)};

// Dynamic content to cache on demand
const DYNAMIC_CONTENT = ${JSON.stringify(cacheManifest.dynamic_content, null, 2)};

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME &&
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('docs-')) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request)
            .then(response => {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseClone);
                });
              return response;
            });
        })
    );
    return;
  }

  // Handle dynamic content
  if (isDynamicContent(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Default: network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Helper functions
function isStaticAsset(pathname) {
  return /\\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2)$/.test(pathname);
}

function isDynamicContent(pathname) {
  return /\\.(html|json)$/.test(pathname) || pathname === '/';
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Implement background sync logic here
  return Promise.resolve();
}

// Push notifications (if needed)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/assets/icon-192.png',
      badge: '/assets/badge-72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});
`;

    await fs.writeFile(path.join(this.config.buildDirectory, 'sw.js'), serviceWorker);

    // Generate service worker registration script
    const swRegistration = `
// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
`;

    await fs.writeFile(path.join(this.config.buildDirectory, 'sw-register.js'), swRegistration);
  }

  /**
   * Setup CDN integration
   */
  private async setupCDN(): Promise<void> {
    if (!this.config.cdnEndpoint) return;

    this.logger.log('Setting up CDN integration');

    // Update asset URLs to point to CDN
    await this.updateAssetURLs();

    // Generate CDN invalidation script
    const invalidationScript = this.generateCDNInvalidationScript();
    await fs.writeFile(path.join(this.config.buildDirectory, 'cdn-invalidate.sh'), invalidationScript);
    await fs.chmod(path.join(this.config.buildDirectory, 'cdn-invalidate.sh'), 0o755);
  }

  /**
   * Update asset URLs to use CDN
   */
  private async updateAssetURLs(): Promise<void> {
    const { glob } = await import('glob');
    const htmlFiles = await glob(`${this.config.buildDirectory}/**/*.html`);

    for (const htmlPath of htmlFiles) {
      let content = await fs.readFile(htmlPath, 'utf-8');

      // Replace asset URLs with CDN URLs
      content = content.replace(
        /(href|src)=["']\/assets\//g,
        `$1="${this.config.cdnEndpoint}/assets/`
      );

      await fs.writeFile(htmlPath, content);
    }
  }

  /**
   * Generate CDN invalidation script
   */
  private generateCDNInvalidationScript(): string {
    return `#!/bin/bash
# CDN Cache Invalidation Script

echo "Invalidating CDN cache..."

# AWS CloudFront example
if [ ! -z "$AWS_DISTRIBUTION_ID" ]; then
    aws cloudfront create-invalidation \\
        --distribution-id $AWS_DISTRIBUTION_ID \\
        --paths "/*"
fi

# Cloudflare example
if [ ! -z "$CLOUDFLARE_ZONE_ID" ] && [ ! -z "$CLOUDFLARE_API_TOKEN" ]; then
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \\
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \\
        -H "Content-Type: application/json" \\
        --data '{"purge_everything":true}'
fi

echo "CDN cache invalidation completed"
`;
  }

  /**
   * Calculate optimization metrics
   */
  private async calculateOptimizationMetrics(optimizations: OptimizationStep[]): Promise<OptimizationMetrics> {
    let totalFiles = 0;
    let optimizedFiles = 0;
    let totalInputSize = 0;
    let totalOutputSize = 0;

    for (const optimization of optimizations) {
      if (optimization.status === 'success') {
        optimizedFiles++;
        totalInputSize += optimization.input_size;
        totalOutputSize += optimization.output_size;
      }
      totalFiles++;
    }

    const totalSavings = totalInputSize - totalOutputSize;
    const compressionRatio = totalInputSize > 0 ? totalOutputSize / totalInputSize : 1;

    return {
      total_files: totalFiles,
      optimized_files: optimizedFiles,
      total_input_size: totalInputSize,
      total_output_size: totalOutputSize,
      total_savings: totalSavings,
      compression_ratio: compressionRatio,
      performance_score_improvement: 0, // Would be calculated by running Lighthouse
    };
  }

  /**
   * Calculate file hash
   */
  private calculateFileHash(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex').substring(0, 8);
  }

  /**
   * Generate optimization ID
   */
  private generateOptimizationId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Run performance audit
   */
  public async runPerformanceAudit(): Promise<any> {
    this.logger.log('Running performance audit');

    try {
      // Use Lighthouse to audit performance
      const lighthouse = await import('lighthouse');
      const chromeLauncher = await import('chrome-launcher');

      const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
      const options = { logLevel: 'info', output: 'json', port: chrome.port };
      const runnerResult = await lighthouse('http://localhost:3000', options);

      await chrome.kill();

      return JSON.parse(runnerResult.report);

    } catch (error) {
      this.logger.error('Performance audit failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Monitor infrastructure health
   */
  public async monitorInfrastructureHealth(): Promise<any> {
    this.logger.log('Monitoring infrastructure health');

    const health = {
      timestamp: new Date().toISOString(),
      build_directory: await fs.pathExists(this.config.buildDirectory),
      cache_directory: await fs.pathExists(this.config.cacheDirectory),
      service_worker: await fs.pathExists(path.join(this.config.buildDirectory, 'sw.js')),
      compression_enabled: this.config.enableCompression,
      cdn_configured: !!this.config.cdnEndpoint,
      optimization_targets: this.config.performanceTargets,
    };

    return health;
  }
}

export default {
  DocumentationInfrastructureManager,
  DEFAULT_INFRASTRUCTURE_CONFIG,
};