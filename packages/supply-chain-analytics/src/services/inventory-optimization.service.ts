/**
 * Inventory Optimization Service
 * Advanced inventory management with just-in-time and safety stock optimization
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import * as math from 'mathjs';
import * as ss from 'simple-statistics';
import * as moment from 'moment';
import { Cron } from '@nestjs/schedule';
import {
  InventoryItemEntity,
  DemandForecastEntity,
  SupplyChainNodeEntity,
  ProductEntity
} from '../models/supply-chain.entity';
import {
  InventoryItem,
  DemandForecast,
  Product
} from '../interfaces/supply-chain.interface';

/**
 * Inventory optimization parameters
 */
export interface InventoryOptimizationParameters {
  scope: {
    locationIds?: string[];
    productIds?: string[];
    categories?: string[];
    abcClasses?: ('A' | 'B' | 'C')[];
  };
  serviceLevel: number; // 90, 95, 99, 99.9
  leadTimeBuffer: number; // Safety factor for lead time variability
  demandVariability: number; // Expected demand coefficient of variation
  costs: {
    holdingCostRate: number; // Annual percentage (e.g., 0.25 = 25%)
    orderingCost: number; // Fixed cost per order
    stockoutCost: number; // Cost per unit per day out of stock
    expediteCost?: number; // Cost premium for expedited orders
  };
  constraints: {
    maxInvestment?: number;
    storageCapacity?: { [locationId: string]: number };
    minimumTurnover?: number;
    maxCycleDays?: number;
    supplierMinimums?: { [supplierId: string]: number };
  };
  strategy: 'just-in-time' | 'safety-stock' | 'hybrid' | 'dynamic';
}

/**
 * Inventory policy recommendation
 */
export interface InventoryPolicy {
  productId: string;
  locationId: string;
  currentPolicy: {
    reorderPoint: number;
    orderQuantity: number;
    safetyStock: number;
    maximumStock: number;
    reviewPeriod: number; // days
  };
  optimizedPolicy: {
    reorderPoint: number;
    orderQuantity: number;
    safetyStock: number;
    maximumStock: number;
    reviewPeriod: number;
    serviceLevel: number;
  };
  improvementMetrics: {
    inventoryReduction: number; // dollar value
    serviceLevelImprovement: number; // percentage points
    turnoverImprovement: number; // ratio
    totalCostReduction: number; // annual dollar savings
    roiMonths: number; // months to return on investment
  };
  implementationPlan: {
    phase: 'immediate' | 'gradual' | 'seasonal';
    transitionPeriod: number; // days
    riskLevel: 'low' | 'medium' | 'high';
    prerequisites: string[];
    monitoring: string[];
  };
}

/**
 * Just-in-time analysis
 */
export interface JITAnalysis {
  productId: string;
  locationId: string;
  feasibility: {
    score: number; // 0-100
    factors: {
      demandStability: number;
      supplierReliability: number;
      leadTimeConsistency: number;
      qualityConsistency: number;
      transportationReliability: number;
    };
    barriers: string[];
    enablers: string[];
  };
  currentState: {
    inventoryTurns: number;
    daysOnHand: number;
    stockoutFrequency: number;
    excessInventory: number;
  };
  jitTargets: {
    targetTurns: number;
    targetDaysOnHand: number;
    maxAllowableStockouts: number;
    bufferReduction: number; // percentage
  };
  implementationRoadmap: {
    phases: {
      phase: number;
      name: string;
      duration: number; // days
      activities: string[];
      deliverables: string[];
      risks: string[];
      successCriteria: string[];
    }[];
    totalDuration: number;
    investmentRequired: number;
    expectedSavings: number;
  };
  riskMitigation: {
    primaryRisks: string[];
    mitigationStrategies: string[];
    contingencyPlans: string[];
    monitoring: string[];
  };
}

/**
 * Safety stock calculation
 */
export interface SafetyStockCalculation {
  productId: string;
  locationId: string;
  currentSafetyStock: number;
  calculations: {
    method: 'statistical' | 'fixed-days' | 'percentage' | 'dynamic';
    inputs: {
      averageDemand: number;
      demandStdDev: number;
      leadTime: number;
      leadTimeStdDev: number;
      serviceLevel: number;
      zScore: number;
    };
    formula: string;
    result: number;
    confidence: number; // 0-100
  }[];
  recommendedSafetyStock: number;
  rationale: string;
  sensitivityAnalysis: {
    serviceLevelImpact: { level: number; safetyStock: number }[];
    demandVariabilityImpact: { variance: number; safetyStock: number }[];
    leadTimeImpact: { leadTime: number; safetyStock: number }[];
  };
  costImpact: {
    holdingCostIncrease: number;
    stockoutCostReduction: number;
    netCostChange: number;
  };
}

/**
 * ABC analysis result
 */
export interface ABCAnalysisResult {
  analysisDate: Date;
  analysisMethod: 'revenue' | 'volume' | 'profit' | 'hybrid';
  totalItems: number;
  classifications: {
    A: {
      count: number;
      percentage: number;
      valuePercentage: number;
      items: {
        productId: string;
        productName: string;
        annualValue: number;
        cumulativePercentage: number;
        currentClass: 'A' | 'B' | 'C';
        recommendedClass: 'A' | 'B' | 'C';
        changed: boolean;
      }[];
    };
    B: {
      count: number;
      percentage: number;
      valuePercentage: number;
      items: Array<{ productId: string; productName: string; annualValue: number; cumulativePercentage: number; currentClass: 'A' | 'B' | 'C'; recommendedClass: 'A' | 'B' | 'C'; changed: boolean }>;
    };
    C: {
      count: number;
      percentage: number;
      valuePercentage: number;
      items: Array<{ productId: string; productName: string; annualValue: number; cumulativePercentage: number; currentClass: 'A' | 'B' | 'C'; recommendedClass: 'A' | 'B' | 'C'; changed: boolean }>;
    };
  };
  recommendations: {
    class: 'A' | 'B' | 'C';
    managementApproach: string;
    reviewFrequency: string;
    inventoryPolicy: string;
    safetyStockGuideline: string;
  }[];
  impactAnalysis: {
    totalReclassifications: number;
    potentialSavings: number;
    implementationEffort: 'low' | 'medium' | 'high';
  };
}

/**
 * Inventory optimization result
 */
export interface InventoryOptimizationResult {
  optimizationId: string;
  scope: string;
  strategy: string;
  results: {
    totalItems: number;
    itemsOptimized: number;
    totalInvestmentReduction: number;
    averageServiceLevelImprovement: number;
    averageTurnoverImprovement: number;
    annualCostSavings: number;
    implementationTimeframe: number; // days
  };
  policies: InventoryPolicy[];
  jitOpportunities: JITAnalysis[];
  safetyStockRecommendations: SafetyStockCalculation[];
  abcReclassifications: ABCAnalysisResult;
  implementationPlan: {
    phases: {
      name: string;
      items: number;
      duration: number;
      investment: number;
      savings: number;
      risks: string[];
    }[];
    totalDuration: number;
    totalInvestment: number;
    totalSavings: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  monitoring: {
    kpis: string[];
    frequency: string;
    thresholds: { [kpi: string]: number };
    alerts: string[];
  };
  generatedAt: Date;
}

@Injectable()
export class InventoryOptimizationService {
  private readonly logger = new Logger(InventoryOptimizationService.name);

  constructor(
    @InjectRepository(InventoryItemEntity)
    private readonly inventoryRepository: Repository<InventoryItemEntity>,
    @InjectRepository(DemandForecastEntity)
    private readonly forecastRepository: Repository<DemandForecastEntity>,
    @InjectRepository(SupplyChainNodeEntity)
    private readonly nodeRepository: Repository<SupplyChainNodeEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
  ) {}

  /**
   * Optimize inventory across specified scope
   */
  async optimizeInventory(params: InventoryOptimizationParameters): Promise<InventoryOptimizationResult> {
    this.logger.log('Starting inventory optimization', {
      scope: params.scope,
      strategy: params.strategy
    });

    try {
      const startTime = Date.now();

      // Validate parameters
      this.validateOptimizationParameters(params);

      // Get inventory items in scope
      const inventoryItems = await this.getInventoryInScope(params.scope);

      // Get demand forecasts
      const demandForecasts = await this.getDemandForecasts(params.scope);

      // Perform ABC analysis
      const abcAnalysis = await this.performABCAnalysis(inventoryItems);

      // Generate inventory policies
      const policies = await this.generateInventoryPolicies(
        inventoryItems,
        demandForecasts,
        params
      );

      // Identify JIT opportunities
      const jitOpportunities = await this.identifyJITOpportunities(
        inventoryItems,
        demandForecasts,
        params
      );

      // Calculate safety stock recommendations
      const safetyStockRecommendations = await this.calculateSafetyStockRecommendations(
        inventoryItems,
        demandForecasts,
        params
      );

      // Aggregate results
      const results = this.aggregateOptimizationResults(
        policies,
        jitOpportunities,
        safetyStockRecommendations
      );

      // Create implementation plan
      const implementationPlan = this.createImplementationPlan(
        policies,
        jitOpportunities,
        params
      );

      // Define monitoring strategy
      const monitoring = this.defineMonitoringStrategy(params);

      const optimizationResult: InventoryOptimizationResult = {
        optimizationId: `inv_opt_${Date.now()}`,
        scope: this.describeScopeInText(params.scope),
        strategy: params.strategy,
        results,
        policies,
        jitOpportunities,
        safetyStockRecommendations,
        abcReclassifications: abcAnalysis,
        implementationPlan,
        monitoring,
        generatedAt: new Date()
      };

      const executionTime = Date.now() - startTime;
      this.logger.log(`Inventory optimization completed in ${executionTime}ms`, {
        itemsOptimized: results.itemsOptimized,
        potentialSavings: results.annualCostSavings
      });

      return optimizationResult;

    } catch (error) {
      this.logger.error('Failed to optimize inventory', error);
      throw new BadRequestException('Failed to optimize inventory');
    }
  }

  /**
   * Perform ABC analysis for inventory classification
   */
  async performABCAnalysis(
    inventoryItems: InventoryItem[],
    method: 'revenue' | 'volume' | 'profit' | 'hybrid' = 'revenue'
  ): Promise<ABCAnalysisResult> {
    this.logger.log('Performing ABC analysis', { method, itemCount: inventoryItems.length });

    try {
      // Calculate annual values for each item
      const itemValues = await Promise.all(
        inventoryItems.map(async item => {
          const annualValue = await this.calculateAnnualValue(item, method);
          return {
            productId: item.productId,
            productName: await this.getProductName(item.productId),
            annualValue,
            currentClass: item.abcClassification,
            item
          };
        })
      );

      // Sort by annual value descending
      itemValues.sort((a, b) => b.annualValue - a.annualValue);

      // Calculate cumulative percentages
      const totalValue = itemValues.reduce((sum, item) => sum + item.annualValue, 0);
      let cumulativeValue = 0;

      const itemsWithCumulative = itemValues.map(item => {
        cumulativeValue += item.annualValue;
        const cumulativePercentage = (cumulativeValue / totalValue) * 100;

        // Classify based on cumulative percentage
        let recommendedClass: 'A' | 'B' | 'C';
        if (cumulativePercentage <= 80) {
          recommendedClass = 'A';
        } else if (cumulativePercentage <= 95) {
          recommendedClass = 'B';
        } else {
          recommendedClass = 'C';
        }

        return {
          ...item,
          cumulativePercentage,
          recommendedClass,
          changed: item.currentClass !== recommendedClass
        };
      });

      // Group by classification
      const classifications = {
        A: {
          count: 0,
          percentage: 0,
          valuePercentage: 0,
          items: [] as any[]
        },
        B: {
          count: 0,
          percentage: 0,
          valuePercentage: 0,
          items: [] as any[]
        },
        C: {
          count: 0,
          percentage: 0,
          valuePercentage: 0,
          items: [] as any[]
        }
      };

      itemsWithCumulative.forEach(item => {
        const classification = classifications[item.recommendedClass];
        classification.items.push(item);
        classification.count++;
      });

      // Calculate percentages
      const totalItems = itemsWithCumulative.length;
      Object.values(classifications).forEach(classification => {
        classification.percentage = (classification.count / totalItems) * 100;
        classification.valuePercentage = (
          classification.items.reduce((sum, item) => sum + item.annualValue, 0) / totalValue
        ) * 100;
      });

      // Generate recommendations
      const recommendations = this.generateABCRecommendations();

      // Calculate impact
      const totalReclassifications = itemsWithCumulative.filter(item => item.changed).length;
      const potentialSavings = this.estimateABCReclassificationSavings(itemsWithCumulative);

      return {
        analysisDate: new Date(),
        analysisMethod: method,
        totalItems,
        classifications,
        recommendations,
        impactAnalysis: {
          totalReclassifications,
          potentialSavings,
          implementationEffort: totalReclassifications > totalItems * 0.2 ? 'high' :
                                totalReclassifications > totalItems * 0.1 ? 'medium' : 'low'
        }
      };

    } catch (error) {
      this.logger.error('Failed to perform ABC analysis', error);
      throw new BadRequestException('Failed to perform ABC analysis');
    }
  }

  /**
   * Calculate optimal safety stock levels
   */
  async calculateSafetyStock(
    productId: string,
    locationId: string,
    serviceLevel: number,
    demandData?: any,
    leadTimeData?: any
  ): Promise<SafetyStockCalculation> {
    this.logger.log('Calculating safety stock', { productId, locationId, serviceLevel });

    try {
      // Get current safety stock
      const inventoryItem = await this.inventoryRepository.findOne({
        where: { productId, locationId }
      });

      if (!inventoryItem) {
        throw new BadRequestException(`Inventory item not found for ${productId} at ${locationId}`);
      }

      // Get demand and lead time data
      const demand = demandData || await this.getDemandStatistics(productId, locationId);
      const leadTime = leadTimeData || await this.getLeadTimeStatistics(productId, locationId);

      // Calculate using different methods
      const calculations = [
        await this.calculateStatisticalSafetyStock(demand, leadTime, serviceLevel),
        await this.calculateFixedDaysSafetyStock(demand, leadTime, 7), // 7 days coverage
        await this.calculatePercentageSafetyStock(demand, 0.15), // 15% of average demand
        await this.calculateDynamicSafetyStock(demand, leadTime, serviceLevel)
      ];

      // Select recommended method based on data quality and product characteristics
      const recommendedCalculation = this.selectBestSafetyStockMethod(calculations, inventoryItem);

      // Perform sensitivity analysis
      const sensitivityAnalysis = await this.performSafetyStockSensitivityAnalysis(
        demand,
        leadTime,
        recommendedCalculation.result
      );

      // Calculate cost impact
      const costImpact = await this.calculateSafetyStockCostImpact(
        inventoryItem,
        recommendedCalculation.result
      );

      return {
        productId,
        locationId,
        currentSafetyStock: inventoryItem.safetyStock,
        calculations,
        recommendedSafetyStock: recommendedCalculation.result,
        rationale: this.generateSafetyStockRationale(recommendedCalculation, inventoryItem),
        sensitivityAnalysis,
        costImpact
      };

    } catch (error) {
      this.logger.error('Failed to calculate safety stock', error);
      throw new BadRequestException('Failed to calculate safety stock');
    }
  }

  /**
   * Analyze JIT feasibility for products
   */
  async analyzeJITFeasibility(
    productId: string,
    locationId: string
  ): Promise<JITAnalysis> {
    this.logger.log('Analyzing JIT feasibility', { productId, locationId });

    try {
      // Get product and location data
      const inventoryItem = await this.inventoryRepository.findOne({
        where: { productId, locationId },
        relations: ['product', 'location', 'supplier']
      });

      if (!inventoryItem) {
        throw new BadRequestException(`Inventory item not found`);
      }

      // Analyze feasibility factors
      const feasibilityFactors = await this.analyzeFeasibilityFactors(inventoryItem);

      // Calculate feasibility score
      const feasibilityScore = this.calculateFeasibilityScore(feasibilityFactors);

      // Assess current state
      const currentState = await this.assessCurrentInventoryState(inventoryItem);

      // Define JIT targets
      const jitTargets = this.defineJITTargets(currentState, feasibilityScore);

      // Create implementation roadmap
      const implementationRoadmap = await this.createJITImplementationRoadmap(
        inventoryItem,
        feasibilityFactors,
        jitTargets
      );

      // Develop risk mitigation strategy
      const riskMitigation = this.developJITRiskMitigation(feasibilityFactors);

      return {
        productId,
        locationId,
        feasibility: {
          score: feasibilityScore,
          factors: feasibilityFactors,
          barriers: this.identifyJITBarriers(feasibilityFactors),
          enablers: this.identifyJITEnablers(feasibilityFactors)
        },
        currentState,
        jitTargets,
        implementationRoadmap,
        riskMitigation
      };

    } catch (error) {
      this.logger.error('Failed to analyze JIT feasibility', error);
      throw new BadRequestException('Failed to analyze JIT feasibility');
    }
  }

  /**
   * Continuous inventory optimization monitoring
   */
  @Cron('0 2 * * *') // Daily at 2 AM
  async scheduledInventoryOptimization(): Promise<void> {
    this.logger.log('Running scheduled inventory optimization monitoring');

    try {
      // Identify items requiring reoptimization
      const itemsToReoptimize = await this.identifyItemsForReoptimization();

      if (itemsToReoptimize.length > 0) {
        // Run optimization for flagged items
        const params: InventoryOptimizationParameters = {
          scope: {
            productIds: itemsToReoptimize.map(item => item.productId)
          },
          serviceLevel: 95,
          leadTimeBuffer: 1.5,
          demandVariability: 0.3,
          costs: {
            holdingCostRate: 0.25,
            orderingCost: 100,
            stockoutCost: 50
          },
          constraints: {},
          strategy: 'dynamic'
        };

        await this.optimizeInventory(params);
      }

      this.logger.log(`Processed ${itemsToReoptimize.length} items for reoptimization`);

    } catch (error) {
      this.logger.error('Scheduled inventory optimization failed', error);
    }
  }

  /**
   * Private helper methods
   */

  private validateOptimizationParameters(params: InventoryOptimizationParameters): void {
    if (params.serviceLevel < 50 || params.serviceLevel > 99.99) {
      throw new BadRequestException('Service level must be between 50% and 99.99%');
    }

    if (params.costs.holdingCostRate <= 0 || params.costs.holdingCostRate > 1) {
      throw new BadRequestException('Holding cost rate must be between 0 and 1');
    }

    if (params.costs.orderingCost <= 0) {
      throw new BadRequestException('Ordering cost must be positive');
    }
  }

  private async getInventoryInScope(scope: any): Promise<InventoryItem[]> {
    let query = this.inventoryRepository.createQueryBuilder('inventory');

    if (scope.locationIds?.length) {
      query = query.where('inventory.locationId IN (:...locationIds)', {
        locationIds: scope.locationIds
      });
    }

    if (scope.productIds?.length) {
      query = query.andWhere('inventory.productId IN (:...productIds)', {
        productIds: scope.productIds
      });
    }

    if (scope.abcClasses?.length) {
      query = query.andWhere('inventory.abcClassification IN (:...abcClasses)', {
        abcClasses: scope.abcClasses
      });
    }

    return await query.getMany();
  }

  private async getDemandForecasts(scope: any): Promise<DemandForecast[]> {
    let query = this.forecastRepository.createQueryBuilder('forecast');

    if (scope.productIds?.length) {
      query = query.where('forecast.productId IN (:...productIds)', {
        productIds: scope.productIds
      });
    }

    if (scope.locationIds?.length) {
      query = query.andWhere('forecast.locationId IN (:...locationIds)', {
        locationIds: scope.locationIds
      });
    }

    return await query.getMany();
  }

  // Additional helper method implementations would continue here...
  // Due to length constraints, I'm showing the core structure

  private async calculateAnnualValue(item: InventoryItem, method: string): Promise<number> {
    // Implementation for calculating annual value based on method
    return item.quantityOnHand * item.averageCost * 12; // Mock calculation
  }

  private async getProductName(productId: string): Promise<string> {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    return product?.name || 'Unknown Product';
  }

  private generateABCRecommendations(): any[] {
    return [
      {
        class: 'A',
        managementApproach: 'Tight control with frequent review',
        reviewFrequency: 'Daily',
        inventoryPolicy: 'Low safety stock, frequent orders',
        safetyStockGuideline: '5-10 days'
      },
      {
        class: 'B',
        managementApproach: 'Moderate control with periodic review',
        reviewFrequency: 'Weekly',
        inventoryPolicy: 'Moderate safety stock, regular orders',
        safetyStockGuideline: '10-20 days'
      },
      {
        class: 'C',
        managementApproach: 'Simple control with basic monitoring',
        reviewFrequency: 'Monthly',
        inventoryPolicy: 'Higher safety stock, bulk orders',
        safetyStockGuideline: '30-60 days'
      }
    ];
  }

  private estimateABCReclassificationSavings(items: any[]): number {
    // Implementation for estimating savings from reclassification
    return items.filter(item => item.changed).length * 1000; // Mock calculation
  }

  // Additional placeholder methods...
  private async generateInventoryPolicies(items: any[], forecasts: any[], params: any): Promise<InventoryPolicy[]> { return []; }
  private async identifyJITOpportunities(items: any[], forecasts: any[], params: any): Promise<JITAnalysis[]> { return []; }
  private async calculateSafetyStockRecommendations(items: any[], forecasts: any[], params: any): Promise<SafetyStockCalculation[]> { return []; }
  private aggregateOptimizationResults(policies: any[], jit: any[], safety: any[]): any { return {}; }
  private createImplementationPlan(policies: any[], jit: any[], params: any): any { return {}; }
  private defineMonitoringStrategy(params: any): any { return {}; }
  private describeScopeInText(scope: any): string { return 'All locations and products'; }
  private async getDemandStatistics(productId: string, locationId: string): Promise<any> { return {}; }
  private async getLeadTimeStatistics(productId: string, locationId: string): Promise<any> { return {}; }
  private async calculateStatisticalSafetyStock(demand: any, leadTime: any, serviceLevel: number): Promise<any> { return {}; }
  private async calculateFixedDaysSafetyStock(demand: any, leadTime: any, days: number): Promise<any> { return {}; }
  private async calculatePercentageSafetyStock(demand: any, percentage: number): Promise<any> { return {}; }
  private async calculateDynamicSafetyStock(demand: any, leadTime: any, serviceLevel: number): Promise<any> { return {}; }
  private selectBestSafetyStockMethod(calculations: any[], item: any): any { return calculations[0]; }
  private async performSafetyStockSensitivityAnalysis(demand: any, leadTime: any, safetyStock: number): Promise<any> { return {}; }
  private async calculateSafetyStockCostImpact(item: any, newSafetyStock: number): Promise<any> { return {}; }
  private generateSafetyStockRationale(calculation: any, item: any): string { return 'Statistical method recommended'; }
  private async analyzeFeasibilityFactors(item: any): Promise<any> { return {}; }
  private calculateFeasibilityScore(factors: any): number { return 75; }
  private async assessCurrentInventoryState(item: any): Promise<any> { return {}; }
  private defineJITTargets(currentState: any, feasibilityScore: number): any { return {}; }
  private async createJITImplementationRoadmap(item: any, factors: any, targets: any): Promise<any> { return {}; }
  private developJITRiskMitigation(factors: any): any { return {}; }
  private identifyJITBarriers(factors: any): string[] { return []; }
  private identifyJITEnablers(factors: any): string[] { return []; }
  private async identifyItemsForReoptimization(): Promise<any[]> { return []; }
}