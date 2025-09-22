/**
 * Test Execution Entity
 *
 * Database entity representing individual test execution records with
 * comprehensive execution details, results, and performance metrics.
 *
 * @fileoverview TypeORM entity for test execution tracking
 * @author Bytebot Team
 * @version 1.0.0
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TestCase } from './test-case.entity';

@Entity('test_executions')
@Index(['status', 'startedAt'])
@Index(['testCaseId', 'startedAt'])
@Index(['platform', 'environment'])
export class TestExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  testCaseId: string;

  @Column({ length: 255 })
  executionId: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'passed', 'failed', 'skipped', 'cancelled', 'timeout', 'error'],
    default: 'pending'
  })
  @Index()
  status: string;

  @Column({ type: 'timestamp' })
  @Index()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', nullable: true })
  duration: number;

  @Column({ length: 100, nullable: true })
  platform: string;

  @Column({ length: 100, nullable: true })
  environment: string;

  @Column({ length: 255, nullable: true })
  browser: string;

  @Column({ length: 100, nullable: true })
  version: string;

  @Column('json', { nullable: true })
  configuration: {
    timeout: number;
    retries: number;
    viewport: { width: number; height: number };
    userAgent: string;
    locale: string;
    timezone: string;
  };

  @Column('json', { nullable: true })
  results: {
    assertions: {
      description: string;
      passed: boolean;
      expected: any;
      actual: any;
      error?: string;
    }[];
    steps: {
      name: string;
      status: string;
      duration: number;
      error?: string;
    }[];
    metrics: {
      responseTime?: number;
      memoryUsage?: number;
      cpuUsage?: number;
      networkRequests?: number;
    };
  };

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column('text', { nullable: true })
  errorStack: string;

  @Column('json', { nullable: true })
  logs: {
    level: string;
    message: string;
    timestamp: string;
    source: string;
  }[];

  @Column('json', { nullable: true })
  artifacts: {
    screenshots: string[];
    videos: string[];
    logs: string[];
    reports: string[];
    traces: string[];
    coverage?: string;
  };

  @Column('json', { nullable: true })
  performanceMetrics: {
    startTime: number;
    endTime: number;
    totalTime: number;
    setupTime: number;
    executionTime: number;
    teardownTime: number;
    memoryPeak: number;
    memoryAverage: number;
    cpuPeak: number;
    cpuAverage: number;
  };

  @Column('json', { nullable: true })
  visualMetrics: {
    screenshotCount: number;
    baselineComparison?: {
      pixelDifference: number;
      percentageDifference: number;
      passed: boolean;
    };
    performanceTiming?: any;
  };

  @Column('json', { nullable: true })
  accessibilityMetrics: {
    violations: {
      level: string;
      rule: string;
      nodes: number;
      description: string;
    }[];
    score: number;
    wcagLevel: string;
  };

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'int', default: 1 })
  attemptNumber: number;

  @Column({ length: 255, nullable: true })
  triggeredBy: string;

  @Column({ length: 255, nullable: true })
  buildId: string;

  @Column({ length: 255, nullable: true })
  commitHash: string;

  @Column({ length: 255, nullable: true })
  branch: string;

  @Column('json', { nullable: true })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => TestCase, testCase => testCase.executions)
  @JoinColumn({ name: 'testCaseId' })
  testCase: TestCase;

  // Virtual properties
  get isPassed(): boolean {
    return this.status === 'passed';
  }

  get isFailed(): boolean {
    return this.status === 'failed';
  }

  get isCompleted(): boolean {
    return ['passed', 'failed', 'skipped', 'cancelled', 'timeout', 'error'].includes(this.status);
  }

  get isRunning(): boolean {
    return this.status === 'running';
  }

  get executionTime(): number {
    if (this.startedAt && this.completedAt) {
      return this.completedAt.getTime() - this.startedAt.getTime();
    }
    return this.duration || 0;
  }

  get assertionCount(): number {
    return this.results?.assertions?.length || 0;
  }

  get passedAssertions(): number {
    return this.results?.assertions?.filter(a => a.passed).length || 0;
  }

  get failedAssertions(): number {
    return this.results?.assertions?.filter(a => !a.passed).length || 0;
  }

  get assertionSuccessRate(): number {
    const total = this.assertionCount;
    if (total === 0) return 0;
    return (this.passedAssertions / total) * 100;
  }

  // Methods
  start(): void {
    this.status = 'running';
    this.startedAt = new Date();
  }

  complete(status: string, results?: any): void {
    this.status = status;
    this.completedAt = new Date();
    this.duration = this.executionTime;

    if (results) {
      this.results = results;
    }
  }

  fail(error: Error): void {
    this.status = 'failed';
    this.completedAt = new Date();
    this.duration = this.executionTime;
    this.errorMessage = error.message;
    this.errorStack = error.stack;
  }

  addLog(level: string, message: string, source: string = 'test'): void {
    if (!this.logs) {
      this.logs = [];
    }

    this.logs.push({
      level,
      message,
      timestamp: new Date().toISOString(),
      source,
    });
  }

  addScreenshot(path: string): void {
    if (!this.artifacts) {
      this.artifacts = { screenshots: [], videos: [], logs: [], reports: [], traces: [] };
    }

    this.artifacts.screenshots.push(path);
  }

  addArtifact(type: keyof TestExecution['artifacts'], path: string): void {
    if (!this.artifacts) {
      this.artifacts = { screenshots: [], videos: [], logs: [], reports: [], traces: [] };
    }

    if (Array.isArray(this.artifacts[type])) {
      (this.artifacts[type] as string[]).push(path);
    } else {
      this.artifacts[type] = path;
    }
  }

  setPerformanceMetrics(metrics: any): void {
    this.performanceMetrics = {
      startTime: metrics.startTime || this.startedAt?.getTime() || 0,
      endTime: metrics.endTime || this.completedAt?.getTime() || 0,
      totalTime: this.duration || 0,
      setupTime: metrics.setupTime || 0,
      executionTime: metrics.executionTime || 0,
      teardownTime: metrics.teardownTime || 0,
      memoryPeak: metrics.memoryPeak || 0,
      memoryAverage: metrics.memoryAverage || 0,
      cpuPeak: metrics.cpuPeak || 0,
      cpuAverage: metrics.cpuAverage || 0,
    };
  }

  setVisualMetrics(metrics: any): void {
    this.visualMetrics = {
      screenshotCount: this.artifacts?.screenshots?.length || 0,
      baselineComparison: metrics.baselineComparison,
      performanceTiming: metrics.performanceTiming,
    };
  }

  setAccessibilityMetrics(metrics: any): void {
    this.accessibilityMetrics = {
      violations: metrics.violations || [],
      score: metrics.score || 0,
      wcagLevel: metrics.wcagLevel || 'AA',
    };
  }

  retry(): void {
    this.retryCount++;
    this.attemptNumber++;
    this.status = 'pending';
    this.startedAt = new Date();
    this.completedAt = null;
    this.duration = null;
    this.errorMessage = null;
    this.errorStack = null;
  }
}