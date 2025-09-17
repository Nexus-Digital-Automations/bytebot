/**
 * Risk Assessment Service
 * 
 * Analyzes and evaluates risks for orchestration tasks with
 * integrated threat modeling and mitigation strategy recommendations.
 */

import { Injectable, Logger } from '@nestjs/common';
import { SecurityLevel } from '../types/parlant-shared.types';
import { OrchestrationTask } from '../types/orchestrator.types';

export interface RiskAssessment {
  taskId: string;
  riskLevel: SecurityLevel;
  riskScore: number;
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  assessmentDate: Date;
}

export interface RiskFactor {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  likelihood: number; // 0-1
  impact: number;     // 0-1
}

@Injectable()
export class RiskAssessmentService {
  private readonly logger = new Logger(RiskAssessmentService.name);

  async assessTaskRisk(task: OrchestrationTask): Promise<RiskAssessment> {
    this.logger.debug(`Assessing risk for task: ${task.taskId}`);

    // Analyze task characteristics
    const riskFactors = this.identifyRiskFactors(task);
    const riskScore = this.calculateRiskScore(riskFactors);
    const riskLevel = this.determineRiskLevel(riskScore);
    const mitigationStrategies = this.generateMitigationStrategies(riskFactors);

    const assessment: RiskAssessment = {
      taskId: task.taskId,
      riskLevel,
      riskScore,
      riskFactors,
      mitigationStrategies,
      assessmentDate: new Date()
    };

    this.logger.debug(`Risk assessment completed: ${task.taskId} - ${riskLevel} (${riskScore})`);

    return assessment;
  }

  private identifyRiskFactors(task: OrchestrationTask): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Analyze service dependencies
    if (task.services.length > 5) {
      factors.push({
        category: 'complexity',
        description: 'High number of service dependencies',
        severity: 'medium',
        likelihood: 0.7,
        impact: 0.6
      });
    }

    // Analyze priority level
    if (task.priority === 'critical') {
      factors.push({
        category: 'business_impact',
        description: 'Critical priority task with high business impact',
        severity: 'high',
        likelihood: 0.5,
        impact: 0.9
      });
    }

    // Analyze compliance requirements
    if (task.complianceRequirements.frameworks.length > 0) {
      factors.push({
        category: 'compliance',
        description: 'Regulatory compliance requirements present',
        severity: 'medium',
        likelihood: 0.4,
        impact: 0.8
      });
    }

    return factors;
  }

  private calculateRiskScore(factors: RiskFactor[]): number {
    if (factors.length === 0) {
      return 0;
    }

    const totalRisk = factors.reduce((sum, factor) => {
      const factorScore = factor.likelihood * factor.impact;
      return sum + factorScore;
    }, 0);

    return Math.min(totalRisk / factors.length, 1.0);
  }

  private determineRiskLevel(score: number): SecurityLevel {
    if (score >= 0.8) return SecurityLevel.CRITICAL;
    if (score >= 0.6) return SecurityLevel.HIGH;
    if (score >= 0.3) return SecurityLevel.MEDIUM;
    return SecurityLevel.LOW;
  }

  private generateMitigationStrategies(factors: RiskFactor[]): string[] {
    const strategies: string[] = [];

    for (const factor of factors) {
      switch (factor.category) {
        case 'complexity':
          strategies.push('Implement circuit breaker patterns for service dependencies');
          strategies.push('Add comprehensive monitoring and alerting');
          break;
        case 'business_impact':
          strategies.push('Require executive approval for execution');
          strategies.push('Implement rollback mechanisms');
          break;
        case 'compliance':
          strategies.push('Enable comprehensive audit logging');
          strategies.push('Implement data encryption and access controls');
          break;
      }
    }

    return [...new Set(strategies)]; // Remove duplicates
  }

  async getHistoricalRiskTrends(): Promise<{ averageRiskScore: number; riskTrend: string; commonRiskFactors: string[]; lastAnalyzed: Date }> {
    // Implementation would analyze historical risk assessments
    return {
      averageRiskScore: 0.4,
      riskTrend: 'stable',
      commonRiskFactors: ['complexity', 'business_impact'],
      lastAnalyzed: new Date()
    };
  }
}