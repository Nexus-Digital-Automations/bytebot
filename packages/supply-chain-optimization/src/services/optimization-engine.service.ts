/**
 * Optimization Engine Service
 * Advanced mathematical optimization algorithms for supply chain efficiency
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as math from 'mathjs';
import { Matrix } from 'ml-matrix';
import * as ss from 'simple-statistics';
import * as moment from 'moment';
import { Cron } from '@nestjs/schedule';
import {
  OptimizationRecommendationEntity,
  SupplyChainNodeEntity,
  InventoryItemEntity,
  DemandForecastEntity
} from '@bytebot/supply-chain-analytics/models/supply-chain.entity';
import { OptimizationRecommendation } from '@bytebot/supply-chain-analytics/interfaces/supply-chain.interface';

/**
 * Optimization objective types
 */
export type OptimizationObjective =
  | 'minimize-cost'
  | 'maximize-efficiency'
  | 'minimize-risk'
  | 'maximize-sustainability'
  | 'minimize-lead-time'
  | 'maximize-quality'
  | 'minimize-inventory'
  | 'maximize-throughput'
  | 'multi-objective';

/**
 * Optimization algorithm types
 */
export type OptimizationAlgorithm =
  | 'linear-programming'
  | 'integer-programming'
  | 'genetic-algorithm'
  | 'simulated-annealing'
  | 'particle-swarm'
  | 'tabu-search'
  | 'branch-and-bound'
  | 'dynamic-programming'
  | 'gradient-descent'
  | 'constraint-satisfaction';

/**
 * Optimization parameters
 */
export interface OptimizationParameters {
  objective: OptimizationObjective;
  algorithm: OptimizationAlgorithm;
  scope: {
    nodeIds?: string[];
    productIds?: string[];
    timeHorizon: number; // months
    includeConstraints: boolean;
  };
  constraints: OptimizationConstraint[];
  weights?: { [objective: string]: number }; // For multi-objective optimization
  tolerance?: number;
  maxIterations?: number;
  timeLimit?: number; // seconds
  populationSize?: number; // For evolutionary algorithms
  crossoverRate?: number;
  mutationRate?: number;
}

/**
 * Optimization constraints
 */
export interface OptimizationConstraint {
  type: 'capacity' | 'budget' | 'demand' | 'quality' | 'regulatory' | 'strategic';
  name: string;
  description: string;
  operator: '=' | '<=' | '>=' | '<' | '>';
  value: number;
  unit: string;
  priority: 'hard' | 'soft';
  penalty?: number; // For soft constraints
  variables: string[]; // Variables this constraint applies to
}

/**
 * Optimization variable
 */
export interface OptimizationVariable {
  name: string;
  type: 'continuous' | 'integer' | 'binary';
  lowerBound?: number;
  upperBound?: number;
  initialValue?: number;
  cost: number;
  description: string;
  category: 'procurement' | 'production' | 'inventory' | 'transportation' | 'capacity';
}

/**
 * Optimization solution
 */
export interface OptimizationSolution {
  id: string;
  objective: OptimizationObjective;
  algorithm: OptimizationAlgorithm;
  status: 'optimal' | 'feasible' | 'infeasible' | 'unbounded' | 'timeout' | 'error';
  objectiveValue: number;
  variables: { [name: string]: number };
  constraints: {
    satisfied: OptimizationConstraint[];
    violated: OptimizationConstraint[];
  };
  performance: {
    iterations: number;
    solutionTime: number; // milliseconds
    convergence: number; // 0-100%
    optimality: number; // 0-100%
  };
  sensitivity: SensitivityAnalysis;
  recommendations: OptimizationAction[];
  costBenefit: CostBenefitAnalysis;
  riskAssessment: OptimizationRiskAssessment;
  implementationPlan: ImplementationPlan;
  generatedDate: Date;
}

/**
 * Sensitivity analysis
 */
export interface SensitivityAnalysis {
  shadowPrices: { [constraint: string]: number };
  reducedCosts: { [variable: string]: number };
  ranges: {
    variables: { [name: string]: { min: number; max: number } };
    constraints: { [name: string]: { min: number; max: number } };
  };
  criticalFactors: {
    name: string;
    impact: number; // percentage change in objective
    confidence: number; // 0-100%
  }[];
}

/**
 * Optimization action
 */
export interface OptimizationAction {
  type: 'increase' | 'decrease' | 'reallocate' | 'eliminate' | 'add' | 'modify';
  category: 'procurement' | 'production' | 'inventory' | 'transportation' | 'capacity';
  target: string; // Node ID, product ID, etc.
  currentValue: number;
  recommendedValue: number;
  expectedImpact: number; // Dollar value or percentage
  priority: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  effort: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  dependencies: string[];
  timeframe: number; // days to implement
}

/**
 * Cost-benefit analysis
 */
export interface CostBenefitAnalysis {
  totalCosts: {
    implementation: number;
    ongoing: number;
    opportunity: number;
    risk: number;
  };
  totalBenefits: {
    costSavings: number;
    revenueIncrease: number;
    efficiencyGains: number;
    riskReduction: number;
  };
  netPresentValue: number;
  returnOnInvestment: number; // percentage
  paybackPeriod: number; // months
  breakEvenPoint: Date;
  confidenceLevel: number; // 0-100%
}

/**
 * Optimization risk assessment
 */
export interface OptimizationRiskAssessment {
  implementationRisks: {
    technical: number; // 0-100 score
    operational: number;
    financial: number;
    regulatory: number;
  };
  mitigationStrategies: {
    risk: string;
    probability: number;
    impact: number;
    mitigation: string;
    contingency: string;
  }[];
  successProbability: number; // 0-100%
  worstCaseScenario: {
    outcome: string;
    probability: number;
    impact: number;
  };
  bestCaseScenario: {
    outcome: string;
    probability: number;
    impact: number;
  };
}

/**
 * Implementation plan
 */
export interface ImplementationPlan {
  phases: {
    phase: number;
    name: string;
    duration: number; // days
    actions: OptimizationAction[];
    prerequisites: string[];
    deliverables: string[];
    resources: {
      type: string;
      quantity: number;
      cost: number;
    }[];
    risks: string[];
    successCriteria: string[];
  }[];
  totalDuration: number; // days
  criticalPath: string[];
  resourceRequirements: {
    human: { role: string; hours: number; cost: number }[];
    technology: { type: string; quantity: number; cost: number }[];
    financial: { category: string; amount: number; timing: Date }[];
  };
  monitoring: {
    kpis: string[];
    checkpoints: Date[];
    reviewCriteria: string[];
  };
}

/**
 * Multi-objective optimization result
 */
export interface MultiObjectiveResult {
  paretoFront: {
    solution: OptimizationSolution;
    tradeoffs: { [objective: string]: number };
    dominance: number; // 0-100% how many solutions this dominates
  }[];
  recommendedSolution: OptimizationSolution;
  tradeoffAnalysis: {
    objectives: string[];
    correlations: number[][]; // correlation matrix
    conflictLevel: number; // 0-100%
    compromiseSolution: OptimizationSolution;
  };
}

@Injectable()
export class OptimizationEngineService {
  private readonly logger = new Logger(OptimizationEngineService.name);

  constructor(
    @InjectRepository(OptimizationRecommendationEntity)
    private readonly recommendationRepository: Repository<OptimizationRecommendationEntity>,
    @InjectRepository(SupplyChainNodeEntity)
    private readonly nodeRepository: Repository<SupplyChainNodeEntity>,
    @InjectRepository(InventoryItemEntity)
    private readonly inventoryRepository: Repository<InventoryItemEntity>,
    @InjectRepository(DemandForecastEntity)
    private readonly forecastRepository: Repository<DemandForecastEntity>,
  ) {}

  /**
   * Solve optimization problem using specified algorithm
   */
  async optimize(parameters: OptimizationParameters): Promise<OptimizationSolution> {
    this.logger.log('Starting optimization', {
      objective: parameters.objective,
      algorithm: parameters.algorithm
    });

    try {
      const startTime = Date.now();

      // Validate parameters
      this.validateOptimizationParameters(parameters);

      // Collect optimization data
      const optimizationData = await this.collectOptimizationData(parameters);

      // Formulate optimization problem
      const problem = await this.formulateOptimizationProblem(parameters, optimizationData);

      // Solve using specified algorithm
      let solution: OptimizationSolution;

      switch (parameters.algorithm) {
        case 'linear-programming':
          solution = await this.solveLinearProgramming(problem, parameters);
          break;
        case 'integer-programming':
          solution = await this.solveIntegerProgramming(problem, parameters);
          break;
        case 'genetic-algorithm':
          solution = await this.solveGeneticAlgorithm(problem, parameters);
          break;
        case 'simulated-annealing':
          solution = await this.solveSimulatedAnnealing(problem, parameters);
          break;
        case 'particle-swarm':
          solution = await this.solveParticleSwarm(problem, parameters);
          break;
        case 'tabu-search':
          solution = await this.solveTabuSearch(problem, parameters);
          break;
        case 'branch-and-bound':
          solution = await this.solveBranchAndBound(problem, parameters);
          break;
        case 'dynamic-programming':
          solution = await this.solveDynamicProgramming(problem, parameters);
          break;
        case 'gradient-descent':
          solution = await this.solveGradientDescent(problem, parameters);
          break;
        case 'constraint-satisfaction':
          solution = await this.solveConstraintSatisfaction(problem, parameters);
          break;
        default:
          throw new BadRequestException(`Unsupported algorithm: ${parameters.algorithm}`);
      }

      // Perform sensitivity analysis
      solution.sensitivity = await this.performSensitivityAnalysis(solution, problem);

      // Generate recommendations
      solution.recommendations = await this.generateOptimizationRecommendations(solution, optimizationData);

      // Perform cost-benefit analysis
      solution.costBenefit = await this.performCostBenefitAnalysis(solution, optimizationData);

      // Assess implementation risks
      solution.riskAssessment = await this.assessOptimizationRisks(solution);

      // Create implementation plan
      solution.implementationPlan = await this.createImplementationPlan(solution);

      const solutionTime = Date.now() - startTime;
      solution.performance.solutionTime = solutionTime;
      solution.generatedDate = new Date();

      this.logger.log(`Optimization completed in ${solutionTime}ms`, {
        status: solution.status,
        objectiveValue: solution.objectiveValue
      });

      // Store solution
      await this.storOptimizationSolution(solution);

      return solution;

    } catch (error) {
      this.logger.error('Optimization failed', error);
      throw new BadRequestException('Failed to solve optimization problem');
    }
  }

  /**
   * Solve multi-objective optimization problem
   */
  async optimizeMultiObjective(
    objectives: OptimizationObjective[],
    weights: { [objective: string]: number },
    parameters: Omit<OptimizationParameters, 'objective'>
  ): Promise<MultiObjectiveResult> {
    this.logger.log('Starting multi-objective optimization', { objectives, weights });

    try {
      const solutions: OptimizationSolution[] = [];

      // Generate Pareto front using multiple approaches
      for (const objective of objectives) {
        const objParams = { ...parameters, objective };
        const solution = await this.optimize(objParams);
        solutions.push(solution);
      }

      // Generate weighted combination solutions
      const weightedParams = {
        ...parameters,
        objective: 'multi-objective' as OptimizationObjective,
        weights
      };
      const weightedSolution = await this.optimize(weightedParams);
      solutions.push(weightedSolution);

      // Analyze Pareto front
      const paretoFront = this.analyzeParetoFront(solutions, objectives);

      // Perform tradeoff analysis
      const tradeoffAnalysis = this.analyzeTradeoffs(solutions, objectives);

      // Select recommended solution
      const recommendedSolution = this.selectRecommendedSolution(paretoFront, weights);

      return {
        paretoFront,
        recommendedSolution,
        tradeoffAnalysis
      };

    } catch (error) {
      this.logger.error('Multi-objective optimization failed', error);
      throw new BadRequestException('Failed to solve multi-objective optimization');
    }
  }

  /**
   * Optimize inventory levels across the supply chain
   */
  async optimizeInventory(parameters: {
    nodeIds?: string[];
    productIds?: string[];
    serviceLevel: number; // 95%, 99%, etc.
    leadTimeSafety: number; // multiplier for lead time variability
    carryingCostRate: number; // annual percentage
    stockoutCostRate: number; // cost per unit per day
    constraints?: {
      maxInvestment?: number;
      storageCapacity?: { [locationId: string]: number };
      minimumTurnover?: number;
    };
  }): Promise<OptimizationSolution> {
    this.logger.log('Optimizing inventory levels', { parameters });

    try {
      // Get current inventory data
      const inventoryData = await this.getInventoryData(parameters);

      // Get demand forecasts
      const demandForecasts = await this.getDemandForecasts(parameters);

      // Calculate optimal inventory levels using newsvendor model
      const optimalLevels = this.calculateOptimalInventoryLevels(
        inventoryData,
        demandForecasts,
        parameters
      );

      // Formulate as optimization problem
      const optimizationParams: OptimizationParameters = {
        objective: 'minimize-cost',
        algorithm: 'linear-programming',
        scope: {
          nodeIds: parameters.nodeIds,
          productIds: parameters.productIds,
          timeHorizon: 12,
          includeConstraints: true
        },
        constraints: this.formulateInventoryConstraints(parameters, inventoryData),
        tolerance: 0.01,
        maxIterations: 1000
      };

      // Solve optimization
      const solution = await this.optimize(optimizationParams);

      // Add inventory-specific metrics
      solution.recommendations = await this.generateInventoryRecommendations(
        solution,
        inventoryData,
        optimalLevels
      );

      return solution;

    } catch (error) {
      this.logger.error('Inventory optimization failed', error);
      throw new BadRequestException('Failed to optimize inventory levels');
    }
  }

  /**
   * Optimize supplier selection and allocation
   */
  async optimizeSupplierSelection(parameters: {
    productIds: string[];
    suppliers: {
      id: string;
      capacity: number;
      unitCost: number;
      qualityScore: number;
      leadTime: number;
      reliability: number;
      riskScore: number;
    }[];
    demand: { productId: string; quantity: number }[];
    constraints: {
      maxSuppliers?: number;
      minQualityScore?: number;
      maxRiskScore?: number;
      diversificationMin?: number; // minimum percentage per supplier
      diversificationMax?: number; // maximum percentage per supplier
    };
    objectives: {
      cost: number; // weight 0-1
      quality: number; // weight 0-1
      risk: number; // weight 0-1
      reliability: number; // weight 0-1
    };
  }): Promise<OptimizationSolution> {
    this.logger.log('Optimizing supplier selection', { parameters });

    try {
      // Formulate supplier selection as mixed-integer programming problem
      const problem = this.formulateSupplierSelectionProblem(parameters);

      // Solve using integer programming
      const optimizationParams: OptimizationParameters = {
        objective: 'multi-objective',
        algorithm: 'integer-programming',
        scope: {
          productIds: parameters.productIds,
          timeHorizon: 12,
          includeConstraints: true
        },
        constraints: problem.constraints,
        weights: parameters.objectives,
        tolerance: 0.01,
        maxIterations: 5000
      };

      const solution = await this.optimize(optimizationParams);

      // Generate supplier-specific recommendations
      solution.recommendations = await this.generateSupplierRecommendations(
        solution,
        parameters
      );

      return solution;

    } catch (error) {
      this.logger.error('Supplier selection optimization failed', error);
      throw new BadRequestException('Failed to optimize supplier selection');
    }
  }

  /**
   * Optimize production scheduling
   */
  async optimizeProduction(parameters: {
    facilities: {
      id: string;
      capacity: number;
      setupCost: number;
      operatingCost: number;
      efficiency: number;
    }[];
    products: {
      id: string;
      demand: { period: number; quantity: number }[];
      processingTime: { facilityId: string; time: number }[];
      inventory: { holding: number; shortage: number };
    }[];
    horizon: number; // planning periods
    constraints: {
      maxChangeOver?: number;
      minBatchSize?: { [productId: string]: number };
      maintenanceWindows?: { facilityId: string; periods: number[] }[];
    };
  }): Promise<OptimizationSolution> {
    this.logger.log('Optimizing production scheduling', { parameters });

    try {
      // Formulate production scheduling problem
      const problem = this.formulateProductionProblem(parameters);

      const optimizationParams: OptimizationParameters = {
        objective: 'minimize-cost',
        algorithm: 'integer-programming',
        scope: {
          timeHorizon: parameters.horizon,
          includeConstraints: true
        },
        constraints: problem.constraints,
        tolerance: 0.01,
        maxIterations: 10000
      };

      const solution = await this.optimize(optimizationParams);

      // Generate production-specific recommendations
      solution.recommendations = await this.generateProductionRecommendations(
        solution,
        parameters
      );

      return solution;

    } catch (error) {
      this.logger.error('Production optimization failed', error);
      throw new BadRequestException('Failed to optimize production scheduling');
    }
  }

  /**
   * Continuous optimization monitoring (scheduled)
   */
  @Cron('0 3 * * *') // Daily at 3 AM
  async scheduledOptimization(): Promise<void> {
    this.logger.log('Starting scheduled optimization analysis');

    try {
      // Identify optimization opportunities
      const opportunities = await this.identifyOptimizationOpportunities();

      for (const opportunity of opportunities) {
        if (opportunity.priority === 'high' && opportunity.automationApproved) {
          await this.runAutomaticOptimization(opportunity);
        }
      }

      this.logger.log(`Processed ${opportunities.length} optimization opportunities`);

    } catch (error) {
      this.logger.error('Scheduled optimization failed', error);
    }
  }

  /**
   * Private helper methods
   */

  private validateOptimizationParameters(params: OptimizationParameters): void {
    if (!params.objective || !params.algorithm) {
      throw new BadRequestException('Objective and algorithm are required');
    }

    if (params.scope.timeHorizon <= 0) {
      throw new BadRequestException('Time horizon must be positive');
    }

    if (params.weights && params.objective !== 'multi-objective') {
      throw new BadRequestException('Weights only applicable for multi-objective optimization');
    }
  }

  private async collectOptimizationData(params: OptimizationParameters): Promise<any> {
    // Collect all necessary data for optimization
    const nodes = await this.nodeRepository.find({
      where: params.scope.nodeIds ? { id: { $in: params.scope.nodeIds } as any } : { isActive: true }
    });

    const inventory = await this.inventoryRepository.find({
      where: {
        ...(params.scope.nodeIds && { locationId: { $in: params.scope.nodeIds } as any }),
        ...(params.scope.productIds && { productId: { $in: params.scope.productIds } as any })
      }
    });

    const forecasts = await this.forecastRepository.find({
      where: {
        ...(params.scope.productIds && { productId: { $in: params.scope.productIds } as any })
      }
    });

    return {
      nodes,
      inventory,
      forecasts,
      collectedAt: new Date()
    };
  }

  private async formulateOptimizationProblem(params: OptimizationParameters, data: any): Promise<any> {
    // Formulate optimization problem based on objective and data
    const variables = this.defineOptimizationVariables(params, data);
    const objectiveFunction = this.defineObjectiveFunction(params, variables);
    const constraints = this.formulateConstraints(params, variables, data);

    return {
      variables,
      objectiveFunction,
      constraints,
      bounds: this.defineVariableBounds(variables),
      problem: params
    };
  }

  // Algorithm implementations (simplified for demonstration)
  private async solveLinearProgramming(problem: any, params: OptimizationParameters): Promise<OptimizationSolution> {
    // Implementation would use OR-Tools or similar library
    return this.createMockSolution(problem, params, 'optimal', 1234.56);
  }

  private async solveIntegerProgramming(problem: any, params: OptimizationParameters): Promise<OptimizationSolution> {
    // Implementation would use OR-Tools or similar library
    return this.createMockSolution(problem, params, 'optimal', 1456.78);
  }

  private async solveGeneticAlgorithm(problem: any, params: OptimizationParameters): Promise<OptimizationSolution> {
    // Implementation of genetic algorithm
    return this.createMockSolution(problem, params, 'feasible', 1345.67);
  }

  private async solveSimulatedAnnealing(problem: any, params: OptimizationParameters): Promise<OptimizationSolution> {
    // Implementation of simulated annealing
    return this.createMockSolution(problem, params, 'feasible', 1387.45);
  }

  private async solveParticleSwarm(problem: any, params: OptimizationParameters): Promise<OptimizationSolution> {
    // Implementation of particle swarm optimization
    return this.createMockSolution(problem, params, 'feasible', 1298.34);
  }

  private async solveTabuSearch(problem: any, params: OptimizationParameters): Promise<OptimizationSolution> {
    // Implementation of tabu search
    return this.createMockSolution(problem, params, 'feasible', 1356.89);
  }

  private async solveBranchAndBound(problem: any, params: OptimizationParameters): Promise<OptimizationSolution> {
    // Implementation of branch and bound
    return this.createMockSolution(problem, params, 'optimal', 1245.67);
  }

  private async solveDynamicProgramming(problem: any, params: OptimizationParameters): Promise<OptimizationSolution> {
    // Implementation of dynamic programming
    return this.createMockSolution(problem, params, 'optimal', 1178.90);
  }

  private async solveGradientDescent(problem: any, params: OptimizationParameters): Promise<OptimizationSolution> {
    // Implementation of gradient descent
    return this.createMockSolution(problem, params, 'feasible', 1434.56);
  }

  private async solveConstraintSatisfaction(problem: any, params: OptimizationParameters): Promise<OptimizationSolution> {
    // Implementation of constraint satisfaction
    return this.createMockSolution(problem, params, 'feasible', 1267.89);
  }

  private createMockSolution(problem: any, params: OptimizationParameters, status: string, objectiveValue: number): OptimizationSolution {
    return {
      id: `opt_${Date.now()}`,
      objective: params.objective,
      algorithm: params.algorithm,
      status: status as any,
      objectiveValue,
      variables: {},
      constraints: { satisfied: [], violated: [] },
      performance: {
        iterations: 100,
        solutionTime: 0,
        convergence: 95,
        optimality: status === 'optimal' ? 100 : 85
      },
      sensitivity: {} as SensitivityAnalysis,
      recommendations: [],
      costBenefit: {} as CostBenefitAnalysis,
      riskAssessment: {} as OptimizationRiskAssessment,
      implementationPlan: {} as ImplementationPlan,
      generatedDate: new Date()
    };
  }

  // Additional placeholder methods...
  private defineOptimizationVariables(params: OptimizationParameters, data: any): OptimizationVariable[] { return []; }
  private defineObjectiveFunction(params: OptimizationParameters, variables: OptimizationVariable[]): any { return {}; }
  private formulateConstraints(params: OptimizationParameters, variables: OptimizationVariable[], data: any): OptimizationConstraint[] { return []; }
  private defineVariableBounds(variables: OptimizationVariable[]): any { return {}; }
  private async performSensitivityAnalysis(solution: OptimizationSolution, problem: any): Promise<SensitivityAnalysis> { return {} as SensitivityAnalysis; }
  private async generateOptimizationRecommendations(solution: OptimizationSolution, data: any): Promise<OptimizationAction[]> { return []; }
  private async performCostBenefitAnalysis(solution: OptimizationSolution, data: any): Promise<CostBenefitAnalysis> { return {} as CostBenefitAnalysis; }
  private async assessOptimizationRisks(solution: OptimizationSolution): Promise<OptimizationRiskAssessment> { return {} as OptimizationRiskAssessment; }
  private async createImplementationPlan(solution: OptimizationSolution): Promise<ImplementationPlan> { return {} as ImplementationPlan; }
  private async storOptimizationSolution(solution: OptimizationSolution): Promise<void> { return Promise.resolve(); }
  private analyzeParetoFront(solutions: OptimizationSolution[], objectives: OptimizationObjective[]): any[] { return []; }
  private analyzeTradeoffs(solutions: OptimizationSolution[], objectives: OptimizationObjective[]): any { return {}; }
  private selectRecommendedSolution(paretoFront: any[], weights: any): OptimizationSolution { return {} as OptimizationSolution; }
  private async getInventoryData(params: any): Promise<any> { return {}; }
  private async getDemandForecasts(params: any): Promise<any> { return {}; }
  private calculateOptimalInventoryLevels(inventory: any, forecasts: any, params: any): any { return {}; }
  private formulateInventoryConstraints(params: any, data: any): OptimizationConstraint[] { return []; }
  private async generateInventoryRecommendations(solution: OptimizationSolution, data: any, optimal: any): Promise<OptimizationAction[]> { return []; }
  private formulateSupplierSelectionProblem(params: any): any { return {}; }
  private async generateSupplierRecommendations(solution: OptimizationSolution, params: any): Promise<OptimizationAction[]> { return []; }
  private formulateProductionProblem(params: any): any { return {}; }
  private async generateProductionRecommendations(solution: OptimizationSolution, params: any): Promise<OptimizationAction[]> { return []; }
  private async identifyOptimizationOpportunities(): Promise<any[]> { return []; }
  private async runAutomaticOptimization(opportunity: any): Promise<void> { return Promise.resolve(); }
}