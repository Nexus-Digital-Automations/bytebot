/**
 * Defect Prediction Entity
 *
 * Database entity for AI-powered defect prediction and risk assessment
 * with machine learning models and predictive analytics.
 *
 * @fileoverview TypeORM entity for defect prediction management
 * @author Bytebot Team
 * @version 1.0.0
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('defect_predictions')
@Index(['predictionType', 'timestamp'])
@Index(['riskLevel', 'confidence'])
@Index(['componentId', 'timestamp'])
export class DefectPrediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  @Index()
  componentId: string;

  @Column({ length: 255 })
  componentName: string;

  @Column({ length: 100 })
  componentType: string;

  @Column({
    type: 'enum',
    enum: ['bug_likelihood', 'failure_probability', 'maintenance_need', 'performance_degradation', 'security_vulnerability'],
  })
  @Index()
  predictionType: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  })
  @Index()
  riskLevel: string;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  @Index()
  confidence: number;

  @Column({ type: 'decimal', precision: 8, scale: 4 })
  probability: number;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  @Column({ type: 'timestamp', nullable: true })
  predictedOccurrence: Date;

  @Column('json')
  factors: {
    codeComplexity: number;
    testCoverage: number;
    recentChanges: number;
    historicalDefects: number;
    teamExperience: number;
    dependencies: number;
    codeAge: number;
    changeFrequency: number;
  };

  @Column('json')
  features: {
    linesOfCode: number;
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    technicalDebt: number;
    codeSmells: number;
    duplicatedLines: number;
    testCoverage: number;
    branchCoverage: number;
    mutationScore: number;
  };

  @Column('json', { nullable: true })
  modelMetadata: {
    modelName: string;
    modelVersion: string;
    trainingData: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
  };

  @Column('json', { nullable: true })
  recommendations: {
    priority: 'low' | 'medium' | 'high' | 'critical';
    actions: string[];
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    timeline: string;
  }[];

  @Column('text', { nullable: true })
  description: string;

  @Column('json', { nullable: true })
  evidence: {
    type: string;
    value: any;
    weight: number;
    description: string;
  }[];

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isResolved: boolean;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ length: 255, nullable: true })
  resolvedBy: string;

  @Column('text', { nullable: true })
  resolutionNotes: string;

  @Column({ type: 'boolean', default: false })
  actualDefectOccurred: boolean;

  @Column({ type: 'timestamp', nullable: true })
  actualDefectDate: Date;

  @Column('text', { nullable: true })
  actualDefectDescription: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get isHighRisk(): boolean {
    return this.riskLevel === 'high' || this.riskLevel === 'critical';
  }

  get isReliable(): boolean {
    return this.confidence >= 0.8;
  }

  get riskScore(): number {
    const riskWeights = { low: 1, medium: 2, high: 3, critical: 4 };
    return riskWeights[this.riskLevel] * this.confidence;
  }

  get daysUntilPredictedOccurrence(): number {
    if (!this.predictedOccurrence) return -1;
    return Math.ceil((this.predictedOccurrence.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  get predictionAccuracy(): number | null {
    if (!this.isResolved) return null;

    // Simple accuracy calculation based on whether prediction was correct
    if (this.actualDefectOccurred && this.riskLevel !== 'low') {
      return this.confidence;
    } else if (!this.actualDefectOccurred && this.riskLevel === 'low') {
      return this.confidence;
    } else {
      return 1 - this.confidence;
    }
  }

  // Methods
  updateRiskLevel(): void {
    if (this.probability >= 0.8) {
      this.riskLevel = 'critical';
    } else if (this.probability >= 0.6) {
      this.riskLevel = 'high';
    } else if (this.probability >= 0.3) {
      this.riskLevel = 'medium';
    } else {
      this.riskLevel = 'low';
    }
  }

  addRecommendation(
    priority: 'low' | 'medium' | 'high' | 'critical',
    actions: string[],
    effort: 'low' | 'medium' | 'high',
    impact: 'low' | 'medium' | 'high',
    timeline: string
  ): void {
    if (!this.recommendations) {
      this.recommendations = [];
    }

    this.recommendations.push({
      priority,
      actions,
      effort,
      impact,
      timeline,
    });

    // Sort by priority
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    this.recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  addEvidence(type: string, value: any, weight: number, description: string): void {
    if (!this.evidence) {
      this.evidence = [];
    }

    this.evidence.push({
      type,
      value,
      weight,
      description,
    });
  }

  resolve(resolvedBy: string, notes?: string): void {
    this.isResolved = true;
    this.resolvedAt = new Date();
    this.resolvedBy = resolvedBy;
    this.resolutionNotes = notes;
  }

  recordActualDefect(description: string, date?: Date): void {
    this.actualDefectOccurred = true;
    this.actualDefectDate = date || new Date();
    this.actualDefectDescription = description;
  }

  calculateConfidence(): void {
    if (!this.modelMetadata) {
      this.confidence = 0.5; // Default confidence
      return;
    }

    // Calculate confidence based on model performance metrics
    const accuracy = this.modelMetadata.accuracy || 0.5;
    const precision = this.modelMetadata.precision || 0.5;
    const recall = this.modelMetadata.recall || 0.5;

    // Weighted average of metrics
    this.confidence = (accuracy * 0.4 + precision * 0.3 + recall * 0.3);
  }

  static createPrediction(
    componentId: string,
    componentName: string,
    predictionType: string,
    probability: number,
    factors: any,
    features: any,
    options: {
      componentType?: string;
      modelMetadata?: any;
      description?: string;
    } = {}
  ): DefectPrediction {
    const prediction = new DefectPrediction();

    prediction.componentId = componentId;
    prediction.componentName = componentName;
    prediction.componentType = options.componentType || 'unknown';
    prediction.predictionType = predictionType;
    prediction.probability = probability;
    prediction.factors = factors;
    prediction.features = features;
    prediction.modelMetadata = options.modelMetadata;
    prediction.description = options.description;
    prediction.timestamp = new Date();
    prediction.isActive = true;

    prediction.updateRiskLevel();
    prediction.calculateConfidence();

    return prediction;
  }
}