/**
 * Quality Metrics Entity
 *
 * Database entity for tracking quality metrics, trends, and KPIs
 * across the QA automation platform with advanced analytics support.
 *
 * @fileoverview TypeORM entity for quality metrics management
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

@Entity('quality_metrics')
@Index(['metricType', 'timestamp'])
@Index(['testCaseId', 'timestamp'])
@Index(['period', 'timestamp'])
export class QualityMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  testCaseId: string;

  @Column({
    type: 'enum',
    enum: [
      'test_coverage',
      'defect_density',
      'test_effectiveness',
      'automation_rate',
      'execution_time',
      'success_rate',
      'flakiness_index',
      'performance_score',
      'accessibility_score',
      'security_score',
      'maintainability_index',
      'code_quality_score'
    ]
  })
  @Index()
  metricType: string;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  value: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  previousValue: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  trend: number; // Percentage change from previous value

  @Column({
    type: 'enum',
    enum: ['excellent', 'good', 'fair', 'poor', 'critical'],
    default: 'fair'
  })
  qualityLevel: string;

  @Column({
    type: 'enum',
    enum: ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'daily'
  })
  @Index()
  period: string;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  @Column('json', { nullable: true })
  metadata: {
    source: string;
    calculationMethod: string;
    sampleSize: number;
    confidence: number;
    factors: Record<string, any>;
    breakdowns: Record<string, number>;
  };

  @Column('json', { nullable: true })
  thresholds: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
  };

  @Column('json', { nullable: true })
  context: {
    environment: string;
    version: string;
    branch: string;
    buildId: string;
    tags: string[];
    filters: Record<string, any>;
  };

  @Column('json', { nullable: true })
  breakdown: {
    byPlatform: Record<string, number>;
    byTestType: Record<string, number>;
    byPriority: Record<string, number>;
    byComponent: Record<string, number>;
    byTeam: Record<string, number>;
  };

  @Column({ type: 'boolean', default: false })
  isAlert: boolean;

  @Column({ type: 'text', nullable: true })
  alertReason: string;

  @Column({ type: 'int', default: 1 })
  dataPoints: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  standardDeviation: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  minimumValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  maximumValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  medianValue: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => TestCase, testCase => testCase.qualityMetrics, { nullable: true })
  @JoinColumn({ name: 'testCaseId' })
  testCase: TestCase;

  // Virtual properties
  get trendDirection(): 'up' | 'down' | 'stable' {
    if (!this.trend) return 'stable';
    if (this.trend > 5) return 'up';
    if (this.trend < -5) return 'down';
    return 'stable';
  }

  get isImproving(): boolean {
    return this.getTrendForMetric() > 0;
  }

  get isDegrading(): boolean {
    return this.getTrendForMetric() < 0;
  }

  get qualityScore(): number {
    switch (this.qualityLevel) {
      case 'excellent': return 95;
      case 'good': return 80;
      case 'fair': return 60;
      case 'poor': return 40;
      case 'critical': return 20;
      default: return 50;
    }
  }

  get alertSeverity(): 'info' | 'warning' | 'critical' {
    if (!this.isAlert) return 'info';
    if (this.qualityLevel === 'critical' || this.qualityLevel === 'poor') {
      return 'critical';
    }
    return 'warning';
  }

  // Methods
  private getTrendForMetric(): number {
    // Positive trends are good for most metrics
    const positiveTrendMetrics = [
      'test_coverage',
      'test_effectiveness',
      'automation_rate',
      'success_rate',
      'performance_score',
      'accessibility_score',
      'security_score',
      'maintainability_index',
      'code_quality_score'
    ];

    // Negative trends are good for these metrics
    const negativeTrendMetrics = [
      'defect_density',
      'execution_time',
      'flakiness_index'
    ];

    const trend = this.trend || 0;

    if (positiveTrendMetrics.includes(this.metricType)) {
      return trend;
    } else if (negativeTrendMetrics.includes(this.metricType)) {
      return -trend;
    }

    return trend;
  }

  updateQualityLevel(): void {
    if (!this.thresholds) {
      this.qualityLevel = 'fair';
      return;
    }

    const value = this.value;
    const thresholds = this.thresholds;

    if (value >= thresholds.excellent) {
      this.qualityLevel = 'excellent';
    } else if (value >= thresholds.good) {
      this.qualityLevel = 'good';
    } else if (value >= thresholds.fair) {
      this.qualityLevel = 'fair';
    } else if (value >= thresholds.poor) {
      this.qualityLevel = 'poor';
    } else {
      this.qualityLevel = 'critical';
    }
  }

  calculateTrend(previousValue: number): void {
    this.previousValue = previousValue;

    if (previousValue === 0) {
      this.trend = 0;
      return;
    }

    this.trend = ((this.value - previousValue) / previousValue) * 100;
  }

  setAlert(reason: string): void {
    this.isAlert = true;
    this.alertReason = reason;
  }

  clearAlert(): void {
    this.isAlert = false;
    this.alertReason = null;
  }

  addBreakdown(category: string, data: Record<string, number>): void {
    if (!this.breakdown) {
      this.breakdown = {
        byPlatform: {},
        byTestType: {},
        byPriority: {},
        byComponent: {},
        byTeam: {},
      };
    }

    if (category in this.breakdown) {
      this.breakdown[category] = { ...this.breakdown[category], ...data };
    }
  }

  setThresholds(thresholds: Partial<QualityMetrics['thresholds']>): void {
    this.thresholds = {
      excellent: 90,
      good: 75,
      fair: 60,
      poor: 40,
      critical: 20,
      ...thresholds,
    };
  }

  static getDefaultThresholds(metricType: string): QualityMetrics['thresholds'] {
    const thresholdMap: Record<string, QualityMetrics['thresholds']> = {
      test_coverage: { excellent: 90, good: 80, fair: 70, poor: 50, critical: 30 },
      defect_density: { excellent: 0.5, good: 1, fair: 2, poor: 5, critical: 10 },
      test_effectiveness: { excellent: 95, good: 85, fair: 75, poor: 60, critical: 40 },
      automation_rate: { excellent: 90, good: 75, fair: 50, poor: 25, critical: 10 },
      execution_time: { excellent: 60, good: 300, fair: 600, poor: 1800, critical: 3600 },
      success_rate: { excellent: 98, good: 95, fair: 90, poor: 80, critical: 70 },
      flakiness_index: { excellent: 1, good: 3, fair: 5, poor: 10, critical: 20 },
      performance_score: { excellent: 90, good: 75, fair: 60, poor: 40, critical: 20 },
      accessibility_score: { excellent: 95, good: 85, fair: 75, poor: 60, critical: 40 },
      security_score: { excellent: 95, good: 85, fair: 75, poor: 60, critical: 40 },
      maintainability_index: { excellent: 90, good: 75, fair: 60, poor: 40, critical: 20 },
      code_quality_score: { excellent: 90, good: 75, fair: 60, poor: 40, critical: 20 },
    };

    return thresholdMap[metricType] || { excellent: 90, good: 75, fair: 60, poor: 40, critical: 20 };
  }

  static createMetric(
    metricType: string,
    value: number,
    options: {
      testCaseId?: string;
      period?: string;
      timestamp?: Date;
      metadata?: any;
      context?: any;
    } = {}
  ): QualityMetrics {
    const metric = new QualityMetrics();
    metric.metricType = metricType;
    metric.value = value;
    metric.testCaseId = options.testCaseId;
    metric.period = options.period || 'daily';
    metric.timestamp = options.timestamp || new Date();
    metric.metadata = options.metadata;
    metric.context = options.context;
    metric.thresholds = QualityMetrics.getDefaultThresholds(metricType);
    metric.updateQualityLevel();

    return metric;
  }
}