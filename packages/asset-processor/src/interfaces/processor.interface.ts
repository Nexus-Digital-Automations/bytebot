/**
 * Core interfaces for Asset Processing Engine
 * Defines contracts for transformation, validation, and processing operations
 */

export interface ProcessingOptions {
  quality?: number; // 1-100 for compression
  format?: string; // Target format
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  watermark?: {
    path: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
  };
  metadata?: {
    preserve?: boolean;
    strip?: string[]; // Fields to remove
    add?: Record<string, any>; // Fields to add
  };
}

export interface ProcessingResult {
  success: boolean;
  outputPath?: string;
  outputSize?: number;
  processingTime: number;
  metadata?: Record<string, any>;
  thumbnails?: string[];
  error?: string;
  warnings?: string[];
}

export interface AssetProcessor {
  /**
   * Check if processor can handle the given mime type
   */
  canProcess(mimeType: string): boolean;

  /**
   * Process the asset with given options
   */
  process(inputPath: string, outputPath: string, options?: ProcessingOptions): Promise<ProcessingResult>;

  /**
   * Generate thumbnails for the asset
   */
  generateThumbnails(inputPath: string, outputDir: string, sizes: Array<{width: number, height: number}>): Promise<string[]>;

  /**
   * Extract metadata from the asset
   */
  extractMetadata(inputPath: string): Promise<Record<string, any>>;

  /**
   * Validate asset integrity and format
   */
  validate(inputPath: string): Promise<{isValid: boolean, errors: string[]}>;
}

export interface TransformationPipeline {
  /**
   * Add a processing step to the pipeline
   */
  addStep(step: ProcessingStep): void;

  /**
   * Execute the entire pipeline
   */
  execute(inputPath: string, outputPath: string): Promise<ProcessingResult>;

  /**
   * Get pipeline configuration
   */
  getConfiguration(): PipelineConfig;
}

export interface ProcessingStep {
  name: string;
  processor: AssetProcessor;
  options: ProcessingOptions;
  condition?: (metadata: Record<string, any>) => boolean;
}

export interface PipelineConfig {
  steps: ProcessingStep[];
  parallelExecution?: boolean;
  errorHandling?: 'stop' | 'continue' | 'retry';
  retryAttempts?: number;
  timeout?: number;
}

export interface ProcessingJob {
  id: string;
  assetId: string;
  inputPath: string;
  outputPath: string;
  pipeline: PipelineConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  startedAt?: Date;
  completedAt?: Date;
  result?: ProcessingResult;
  error?: string;
}

export interface ProcessingQueue {
  /**
   * Add job to processing queue
   */
  enqueue(job: ProcessingJob): Promise<void>;

  /**
   * Get job status
   */
  getJobStatus(jobId: string): Promise<ProcessingJob | null>;

  /**
   * Cancel a pending or running job
   */
  cancelJob(jobId: string): Promise<boolean>;

  /**
   * Get queue statistics
   */
  getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }>;
}