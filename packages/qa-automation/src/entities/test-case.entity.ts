/**
 * Test Case Entity
 *
 * Database entity representing test cases with comprehensive metadata,
 * execution history, and relationship management for the QA platform.
 *
 * @fileoverview TypeORM entity for test case management
 * @author Bytebot Team
 * @version 1.0.0
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  Index,
} from 'typeorm';
import { TestExecution } from './test-execution.entity';
import { QualityMetrics } from './quality-metrics.entity';

@Entity('test_cases')
@Index(['status', 'priority'])
@Index(['framework', 'testType'])
@Index(['createdAt'])
export class TestCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  @Index()
  name: string;

  @Column('text')
  description: string;

  @Column({ length: 100 })
  framework: string;

  @Column({
    type: 'enum',
    enum: ['unit', 'integration', 'e2e', 'performance', 'security', 'accessibility', 'visual-regression', 'api'],
  })
  testType: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'deprecated', 'draft'],
    default: 'active'
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  })
  priority: string;

  @Column('text')
  testCode: string;

  @Column('json', { nullable: true })
  configuration: any;

  @Column('json', { nullable: true })
  metadata: {
    tags: string[];
    author: string;
    estimatedDuration: number;
    complexity: number;
    dependencies: string[];
    requirements: string[];
    environment: string[];
  };

  @Column('json', { nullable: true })
  assertions: {
    type: string;
    expected: any;
    description: string;
  }[];

  @Column('json', { nullable: true })
  testData: any;

  @Column({ length: 255, nullable: true })
  category: string;

  @Column({ length: 255, nullable: true })
  suite: string;

  @Column({ type: 'int', default: 0 })
  executionCount: number;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  successRate: number;

  @Column({ type: 'int', nullable: true })
  lastExecutionDuration: number;

  @Column({ type: 'timestamp', nullable: true })
  lastExecutedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastPassedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastFailedAt: Date;

  @Column({ length: 255, nullable: true })
  version: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => TestExecution, execution => execution.testCase)
  executions: TestExecution[];

  @OneToMany(() => QualityMetrics, metrics => metrics.testCase)
  qualityMetrics: QualityMetrics[];

  // Virtual properties
  get isFlaky(): boolean {
    return this.executionCount > 5 && this.successRate < 0.8 && this.successRate > 0.2;
  }

  get reliability(): string {
    if (this.successRate >= 0.95) return 'excellent';
    if (this.successRate >= 0.85) return 'good';
    if (this.successRate >= 0.70) return 'fair';
    return 'poor';
  }

  get averageExecutionTime(): number {
    return this.lastExecutionDuration || 0;
  }

  // Methods
  updateExecutionStats(success: boolean, duration: number): void {
    this.executionCount++;
    this.lastExecutionDuration = duration;
    this.lastExecutedAt = new Date();

    if (success) {
      this.successCount++;
      this.lastPassedAt = new Date();
    } else {
      this.failureCount++;
      this.lastFailedAt = new Date();
    }

    this.successRate = this.executionCount > 0
      ? (this.successCount / this.executionCount) * 100
      : 0;
  }

  addTag(tag: string): void {
    if (!this.metadata) {
      this.metadata = { tags: [], author: '', estimatedDuration: 0, complexity: 1, dependencies: [], requirements: [], environment: [] };
    }
    if (!this.metadata.tags.includes(tag)) {
      this.metadata.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    if (this.metadata?.tags) {
      this.metadata.tags = this.metadata.tags.filter(t => t !== tag);
    }
  }

  setComplexity(complexity: number): void {
    if (!this.metadata) {
      this.metadata = { tags: [], author: '', estimatedDuration: 0, complexity: 1, dependencies: [], requirements: [], environment: [] };
    }
    this.metadata.complexity = Math.max(1, Math.min(10, complexity));
  }
}