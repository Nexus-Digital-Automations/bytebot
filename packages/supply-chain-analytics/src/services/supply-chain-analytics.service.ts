/**
 * Supply Chain Analytics Service
 * Core analytics engine for supply chain operations
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import {
  SupplyChainNodeEntity,
  ProductEntity,
  InventoryItemEntity,
  DemandForecastEntity,
  SupplyChainEventEntity,
  OptimizationRecommendationEntity,
  PerformanceKPIEntity,
  ScenarioAnalysisEntity
} from '../models/supply-chain.entity';
import {
  GeographicLocation,
  SupplierPerformanceMetrics,
  RiskAssessment,
  OptimizationRecommendation,
  PerformanceKPI,
  ScenarioAnalysis,
  SupplyChainEvent,
  DemandForecast
} from '../interfaces/supply-chain.interface';
import { SupplyChainMappingService } from './supply-chain-mapping.service';
import { RiskAssessmentService } from './risk-assessment.service';
import { PerformanceAnalyticsService } from './performance-analytics.service';
import { OptimizationEngineService } from './optimization-engine.service';

/**
 * Analytics query parameters interface
 */
export interface AnalyticsQuery {
  nodeIds?: string[];
  productIds?: string[];
  startDate?: Date;
  endDate?: Date;
  tier?: number;
  nodeType?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  performanceThreshold?: number;
  includeInactive?: boolean;
}

/**
 * Analytics result interface
 */
export interface AnalyticsResult {
  totalNodes: number;
  totalProducts: number;
  totalInventoryValue: number;
  averagePerformanceScore: number;
  criticalRisks: number;
  optimizationOpportunities: number;
  sustainabilityScore: number;
  complianceRate: number;
  lastUpdated: Date;
}

/**
 * Supply chain visibility metrics
 */
export interface VisibilityMetrics {
  tier1Visibility: number; // percentage
  tier2Visibility: number;
  tier3Visibility: number;
  overallVisibility: number;
  mappingCompleteness: number;
  dataQuality: number;
  realTimeDataSources: number;
  manualDataSources: number;
}

/**
 * Performance benchmarking results
 */
export interface BenchmarkingResult {
  nodeId: string;
  nodeName: string;
  metrics: {
    [key: string]: {
      value: number;
      industryAverage: number;
      bestInClass: number;
      percentile: number;
      gap: number;
    };
  };
  overallScore: number;
  recommendations: string[];
}

@Injectable()
export class SupplyChainAnalyticsService {
  private readonly logger = new Logger(SupplyChainAnalyticsService.name);

  constructor(
    @InjectRepository(SupplyChainNodeEntity)
    private readonly nodeRepository: Repository<SupplyChainNodeEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(InventoryItemEntity)
    private readonly inventoryRepository: Repository<InventoryItemEntity>,
    @InjectRepository(DemandForecastEntity)
    private readonly forecastRepository: Repository<DemandForecastEntity>,
    @InjectRepository(SupplyChainEventEntity)
    private readonly eventRepository: Repository<SupplyChainEventEntity>,
    @InjectRepository(OptimizationRecommendationEntity)
    private readonly recommendationRepository: Repository<OptimizationRecommendationEntity>,
    @InjectRepository(PerformanceKPIEntity)
    private readonly kpiRepository: Repository<PerformanceKPIEntity>,
    @InjectRepository(ScenarioAnalysisEntity)
    private readonly scenarioRepository: Repository<ScenarioAnalysisEntity>,
    private readonly mappingService: SupplyChainMappingService,
    private readonly riskService: RiskAssessmentService,
    private readonly performanceService: PerformanceAnalyticsService,
    private readonly optimizationService: OptimizationEngineService,
  ) {}

  /**
   * Get comprehensive supply chain analytics overview
   */
  async getAnalyticsOverview(query: AnalyticsQuery = {}): Promise<AnalyticsResult> {
    this.logger.log('Generating analytics overview', { query });

    try {
      const startTime = Date.now();

      // Build query conditions
      const nodeConditions = this.buildNodeQueryConditions(query);
      const productConditions = this.buildProductQueryConditions(query);

      // Execute parallel queries for better performance
      const [
        totalNodes,
        totalProducts,
        inventoryItems,
        criticalEvents,
        activeRecommendations,
        performanceKPIs
      ] = await Promise.all([
        this.nodeRepository.count({ where: nodeConditions }),
        this.productRepository.count({ where: productConditions }),
        this.inventoryRepository.find({
          where: query.nodeIds ? { locationId: { $in: query.nodeIds } as any } : {},
          select: ['quantityOnHand', 'averageCost']
        }),
        this.eventRepository.count({
          where: {
            severity: 'critical',
            timestamp: query.startDate && query.endDate
              ? Between(query.startDate, query.endDate)
              : MoreThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
          }
        }),
        this.recommendationRepository.count({
          where: { status: 'pending' }
        }),
        this.kpiRepository.find({
          where: query.nodeIds ? { nodeId: { $in: query.nodeIds } as any } : {},
          select: ['value', 'target']
        })
      ]);

      // Calculate metrics
      const totalInventoryValue = inventoryItems.reduce(
        (sum, item) => sum + (item.quantityOnHand * item.averageCost),
        0
      );

      const averagePerformanceScore = performanceKPIs.length > 0
        ? performanceKPIs.reduce((sum, kpi) => sum + (kpi.value / kpi.target * 100), 0) / performanceKPIs.length
        : 0;

      // Get sustainability and compliance metrics
      const nodes = await this.nodeRepository.find({
        where: nodeConditions,
        select: ['sustainability', 'complianceStatus']
      });

      const sustainabilityScore = nodes.length > 0
        ? nodes.reduce((sum, node) => sum + node.sustainability.esgScore, 0) / nodes.length
        : 0;

      const complianceRate = nodes.length > 0
        ? nodes.filter(node => node.complianceStatus.overallStatus === 'compliant').length / nodes.length * 100
        : 100;

      const executionTime = Date.now() - startTime;
      this.logger.log(`Analytics overview generated in ${executionTime}ms`);

      return {
        totalNodes,
        totalProducts,
        totalInventoryValue,
        averagePerformanceScore,
        criticalRisks: criticalEvents,
        optimizationOpportunities: activeRecommendations,
        sustainabilityScore,
        complianceRate,
        lastUpdated: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to generate analytics overview', error);
      throw new BadRequestException('Failed to generate analytics overview');
    }
  }

  /**
   * Get supply chain visibility metrics
   */
  async getVisibilityMetrics(query: AnalyticsQuery = {}): Promise<VisibilityMetrics> {
    this.logger.log('Calculating visibility metrics', { query });

    try {
      const nodes = await this.nodeRepository.find({
        where: this.buildNodeQueryConditions(query),
        select: ['tier', 'location', 'contactInfo', 'performance']
      });

      const tier1Nodes = nodes.filter(node => node.tier === 1);
      const tier2Nodes = nodes.filter(node => node.tier === 2);
      const tier3Nodes = nodes.filter(node => node.tier === 3);

      // Calculate visibility based on data completeness
      const calculateTierVisibility = (tierNodes: any[]) => {
        if (tierNodes.length === 0) return 100;

        const visibilityScores = tierNodes.map(node => {
          let score = 0;

          // Location data completeness (25%)
          if (node.location && node.location.latitude && node.location.longitude) score += 25;

          // Contact information completeness (25%)
          if (node.contactInfo && node.contactInfo.primaryContact) score += 25;

          // Performance data recency (25%)
          if (node.performance && node.performance.lastAuditDate) {
            const daysSinceAudit = (Date.now() - new Date(node.performance.lastAuditDate).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceAudit <= 90) score += 25;
            else if (daysSinceAudit <= 180) score += 15;
            else if (daysSinceAudit <= 365) score += 10;
          }

          // Real-time data availability (25%)
          // This would be determined by checking for recent events or data updates
          score += 25; // Assume available for now

          return Math.min(score, 100);
        });

        return visibilityScores.reduce((sum, score) => sum + score, 0) / visibilityScores.length;
      };

      const tier1Visibility = calculateTierVisibility(tier1Nodes);
      const tier2Visibility = calculateTierVisibility(tier2Nodes);
      const tier3Visibility = calculateTierVisibility(tier3Nodes);

      const overallVisibility = (tier1Visibility * 0.5 + tier2Visibility * 0.3 + tier3Visibility * 0.2);

      // Calculate mapping completeness
      const totalExpectedNodes = await this.estimateExpectedNodes(tier1Nodes.length);
      const mappingCompleteness = Math.min((nodes.length / totalExpectedNodes) * 100, 100);

      // Calculate data quality score
      const dataQuality = await this.calculateDataQuality(nodes);

      // Count real-time vs manual data sources
      const recentEvents = await this.eventRepository.count({
        where: {
          timestamp: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        }
      });

      const realTimeDataSources = Math.min(recentEvents, nodes.length);
      const manualDataSources = nodes.length - realTimeDataSources;

      return {
        tier1Visibility,
        tier2Visibility,
        tier3Visibility,
        overallVisibility,
        mappingCompleteness,
        dataQuality,
        realTimeDataSources,
        manualDataSources
      };

    } catch (error) {
      this.logger.error('Failed to calculate visibility metrics', error);
      throw new BadRequestException('Failed to calculate visibility metrics');
    }
  }

  /**
   * Get performance benchmarking results
   */
  async getPerformanceBenchmarking(nodeIds?: string[]): Promise<BenchmarkingResult[]> {
    this.logger.log('Generating performance benchmarking', { nodeIds });

    try {
      const nodes = await this.nodeRepository.find({
        where: nodeIds ? { id: { $in: nodeIds } as any } : {},
        relations: ['kpis']
      });

      const benchmarkingResults: BenchmarkingResult[] = [];

      for (const node of nodes) {
        const metrics: { [key: string]: any } = {};
        let totalScore = 0;
        let metricCount = 0;

        // Benchmark key performance metrics
        const keyMetrics = [
          'onTimeDeliveryRate',
          'qualityScore',
          'costCompetitiveness',
          'responsiveness',
          'sustainabilityRating'
        ];

        for (const metricName of keyMetrics) {
          const value = this.extractMetricValue(node.performance, metricName);
          if (value !== null) {
            const benchmark = await this.getIndustryBenchmark(metricName, node.type);

            metrics[metricName] = {
              value,
              industryAverage: benchmark.average,
              bestInClass: benchmark.bestInClass,
              percentile: this.calculatePercentile(value, benchmark.distribution),
              gap: value - benchmark.average
            };

            totalScore += (value / benchmark.bestInClass) * 100;
            metricCount++;
          }
        }

        const overallScore = metricCount > 0 ? totalScore / metricCount : 0;

        const recommendations = await this.generateBenchmarkingRecommendations(node, metrics);

        benchmarkingResults.push({
          nodeId: node.id,
          nodeName: node.name,
          metrics,
          overallScore,
          recommendations
        });
      }

      return benchmarkingResults;

    } catch (error) {
      this.logger.error('Failed to generate performance benchmarking', error);
      throw new BadRequestException('Failed to generate performance benchmarking');
    }
  }

  /**
   * Get supply chain network analysis
   */
  async getNetworkAnalysis(query: AnalyticsQuery = {}): Promise<any> {
    this.logger.log('Performing network analysis', { query });

    try {
      const nodes = await this.nodeRepository.find({
        where: this.buildNodeQueryConditions(query),
        relations: ['suppliedProducts', 'inventoryItems']
      });

      // Build network graph
      const networkGraph = await this.buildNetworkGraph(nodes);

      // Calculate network metrics
      const networkMetrics = this.calculateNetworkMetrics(networkGraph);

      // Identify critical paths and bottlenecks
      const criticalPaths = this.identifyCriticalPaths(networkGraph);
      const bottlenecks = this.identifyBottlenecks(networkGraph);

      // Calculate resilience metrics
      const resilienceMetrics = this.calculateResilienceMetrics(networkGraph);

      return {
        networkGraph,
        metrics: networkMetrics,
        criticalPaths,
        bottlenecks,
        resilience: resilienceMetrics,
        generatedAt: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to perform network analysis', error);
      throw new BadRequestException('Failed to perform network analysis');
    }
  }

  /**
   * Generate cost analysis report
   */
  async getCostAnalysis(query: AnalyticsQuery = {}): Promise<any> {
    this.logger.log('Generating cost analysis', { query });

    try {
      const [nodes, inventory, events] = await Promise.all([
        this.nodeRepository.find({
          where: this.buildNodeQueryConditions(query),
          select: ['id', 'name', 'type', 'performance']
        }),
        this.inventoryRepository.find({
          where: query.nodeIds ? { locationId: { $in: query.nodeIds } as any } : {},
          relations: ['product']
        }),
        this.eventRepository.find({
          where: {
            type: 'cost-change',
            timestamp: query.startDate && query.endDate
              ? Between(query.startDate, query.endDate)
              : MoreThan(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
          }
        })
      ]);

      // Calculate total costs
      const inventoryCosts = inventory.reduce((sum, item) =>
        sum + (item.quantityOnHand * item.averageCost), 0
      );

      const procurementCosts = nodes.reduce((sum, node) =>
        sum + (node.performance?.totalTransactionValue || 0), 0
      );

      // Analyze cost trends from events
      const costTrends = this.analyzeCostTrends(events);

      // Calculate cost breakdown by category
      const costBreakdown = this.calculateCostBreakdown(nodes, inventory);

      // Identify cost optimization opportunities
      const optimizationOpportunities = await this.identifyCostOptimizations(nodes, inventory);

      return {
        totalCosts: inventoryCosts + procurementCosts,
        inventoryCosts,
        procurementCosts,
        costBreakdown,
        trends: costTrends,
        optimizationOpportunities,
        generatedAt: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to generate cost analysis', error);
      throw new BadRequestException('Failed to generate cost analysis');
    }
  }

  /**
   * Private helper methods
   */

  private buildNodeQueryConditions(query: AnalyticsQuery): any {
    const conditions: any = {};

    if (query.nodeIds?.length) {
      conditions.id = { $in: query.nodeIds };
    }

    if (query.nodeType) {
      conditions.type = query.nodeType;
    }

    if (query.tier) {
      conditions.tier = query.tier;
    }

    if (!query.includeInactive) {
      conditions.isActive = true;
    }

    return conditions;
  }

  private buildProductQueryConditions(query: AnalyticsQuery): any {
    const conditions: any = {};

    if (query.productIds?.length) {
      conditions.id = { $in: query.productIds };
    }

    if (!query.includeInactive) {
      conditions.isActive = true;
    }

    return conditions;
  }

  private async estimateExpectedNodes(tier1Count: number): Promise<number> {
    // Industry average: 1 tier-1 supplier has 3-5 tier-2 suppliers, each with 2-4 tier-3 suppliers
    const avgTier2PerTier1 = 4;
    const avgTier3PerTier2 = 3;

    const expectedTier2 = tier1Count * avgTier2PerTier1;
    const expectedTier3 = expectedTier2 * avgTier3PerTier2;

    return tier1Count + expectedTier2 + expectedTier3;
  }

  private async calculateDataQuality(nodes: any[]): Promise<number> {
    if (nodes.length === 0) return 100;

    const qualityScores = nodes.map(node => {
      let score = 0;
      let maxScore = 0;

      // Required fields
      const requiredFields = ['name', 'type', 'tier', 'location'];
      requiredFields.forEach(field => {
        maxScore += 20;
        if (node[field]) score += 20;
      });

      // Data recency
      maxScore += 20;
      if (node.updatedAt) {
        const daysSinceUpdate = (Date.now() - new Date(node.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate <= 7) score += 20;
        else if (daysSinceUpdate <= 30) score += 15;
        else if (daysSinceUpdate <= 90) score += 10;
      }

      return (score / maxScore) * 100;
    });

    return qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  }

  private extractMetricValue(performance: SupplierPerformanceMetrics, metricName: string): number | null {
    if (!performance || !(metricName in performance)) {
      return null;
    }
    return performance[metricName as keyof SupplierPerformanceMetrics] as number;
  }

  private async getIndustryBenchmark(metricName: string, nodeType: string): Promise<any> {
    // This would typically query an external benchmarking database
    // For now, return mock industry benchmarks
    const benchmarks: { [key: string]: any } = {
      onTimeDeliveryRate: {
        average: 85,
        bestInClass: 98,
        distribution: [70, 75, 80, 85, 90, 95, 98]
      },
      qualityScore: {
        average: 88,
        bestInClass: 99,
        distribution: [75, 80, 85, 88, 92, 96, 99]
      },
      costCompetitiveness: {
        average: 78,
        bestInClass: 95,
        distribution: [60, 70, 75, 78, 85, 90, 95]
      },
      responsiveness: {
        average: 82,
        bestInClass: 97,
        distribution: [65, 72, 78, 82, 88, 93, 97]
      },
      sustainabilityRating: {
        average: 71,
        bestInClass: 92,
        distribution: [50, 60, 68, 71, 78, 85, 92]
      }
    };

    return benchmarks[metricName] || {
      average: 75,
      bestInClass: 95,
      distribution: [50, 60, 70, 75, 80, 90, 95]
    };
  }

  private calculatePercentile(value: number, distribution: number[]): number {
    const sorted = [...distribution].sort((a, b) => a - b);
    let rank = 0;

    for (let i = 0; i < sorted.length; i++) {
      if (value >= sorted[i]) {
        rank = i + 1;
      }
    }

    return (rank / sorted.length) * 100;
  }

  private async generateBenchmarkingRecommendations(node: any, metrics: any): Promise<string[]> {
    const recommendations: string[] = [];

    Object.entries(metrics).forEach(([metricName, data]: [string, any]) => {
      if (data.gap < 0) {
        const gapPercentage = Math.abs(data.gap / data.industryAverage) * 100;

        if (gapPercentage > 10) {
          recommendations.push(
            `Improve ${metricName} by ${gapPercentage.toFixed(1)}% to reach industry average`
          );
        }

        if (data.percentile < 50) {
          recommendations.push(
            `${metricName} is below 50th percentile - prioritize improvement initiatives`
          );
        }
      }
    });

    return recommendations;
  }

  private async buildNetworkGraph(nodes: any[]): Promise<any> {
    // Build a graph representation of the supply chain network
    const graph = {
      nodes: nodes.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
        tier: node.tier,
        location: node.location,
        metrics: node.performance
      })),
      edges: []
    };

    // Build edges based on supplier-customer relationships
    // This would typically be based on actual transaction data
    for (const node of nodes) {
      if (node.suppliedProducts?.length > 0) {
        for (const product of node.suppliedProducts) {
          // Find downstream nodes that use this product
          const downstreamNodes = nodes.filter(n =>
            n.tier < node.tier &&
            n.inventoryItems?.some((item: any) => item.productId === product.id)
          );

          downstreamNodes.forEach(downstream => {
            graph.edges.push({
              source: node.id,
              target: downstream.id,
              productId: product.id,
              productName: product.name,
              weight: 1 // Could be based on transaction volume
            });
          });
        }
      }
    }

    return graph;
  }

  private calculateNetworkMetrics(graph: any): any {
    const nodeCount = graph.nodes.length;
    const edgeCount = graph.edges.length;
    const density = nodeCount > 1 ? (2 * edgeCount) / (nodeCount * (nodeCount - 1)) : 0;

    // Calculate degree centrality for each node
    const degrees = new Map<string, number>();
    graph.edges.forEach((edge: any) => {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    });

    const avgDegree = Array.from(degrees.values()).reduce((sum, deg) => sum + deg, 0) / nodeCount;
    const maxDegree = Math.max(...Array.from(degrees.values()));

    return {
      nodeCount,
      edgeCount,
      density,
      averageDegree: avgDegree,
      maxDegree,
      centralityMetrics: Object.fromEntries(degrees)
    };
  }

  private identifyCriticalPaths(graph: any): any[] {
    // Identify critical paths in the supply chain network
    // This is a simplified implementation - would use more sophisticated algorithms in production
    const criticalPaths: any[] = [];

    // Find longest paths from tier-3 to tier-1 suppliers
    const tier3Nodes = graph.nodes.filter((node: any) => node.tier === 3);
    const tier1Nodes = graph.nodes.filter((node: any) => node.tier === 1);

    tier3Nodes.forEach((startNode: any) => {
      tier1Nodes.forEach((endNode: any) => {
        const path = this.findPath(graph, startNode.id, endNode.id);
        if (path.length > 0) {
          criticalPaths.push({
            startNode: startNode.name,
            endNode: endNode.name,
            path,
            length: path.length,
            risk: this.calculatePathRisk(graph, path)
          });
        }
      });
    });

    return criticalPaths.sort((a, b) => b.risk - a.risk);
  }

  private identifyBottlenecks(graph: any): any[] {
    // Identify bottlenecks based on node centrality and capacity constraints
    const bottlenecks: any[] = [];

    graph.nodes.forEach((node: any) => {
      const incomingEdges = graph.edges.filter((edge: any) => edge.target === node.id);
      const outgoingEdges = graph.edges.filter((edge: any) => edge.source === node.id);

      const utilization = node.metrics?.capacity?.currentUtilization || 0;
      const centrality = (incomingEdges.length + outgoingEdges.length) / graph.edges.length;

      if (utilization > 85 && centrality > 0.1) {
        bottlenecks.push({
          nodeId: node.id,
          nodeName: node.name,
          utilization,
          centrality,
          riskScore: utilization * centrality * 100
        });
      }
    });

    return bottlenecks.sort((a, b) => b.riskScore - a.riskScore);
  }

  private calculateResilienceMetrics(graph: any): any {
    // Calculate network resilience metrics
    const totalNodes = graph.nodes.length;
    const totalEdges = graph.edges.length;

    // Redundancy: multiple paths between critical nodes
    const redundancy = this.calculateRedundancy(graph);

    // Diversity: variety of supplier types and locations
    const diversity = this.calculateDiversity(graph);

    // Flexibility: ability to reroute through alternative paths
    const flexibility = this.calculateFlexibility(graph);

    return {
      redundancy,
      diversity,
      flexibility,
      overallResilience: (redundancy + diversity + flexibility) / 3
    };
  }

  private analyzeCostTrends(events: any[]): any {
    // Analyze cost trends from supply chain events
    const monthlyTrends = new Map<string, { increases: number; decreases: number; netChange: number }>();

    events.forEach(event => {
      const month = new Date(event.timestamp).toISOString().slice(0, 7); // YYYY-MM format

      if (!monthlyTrends.has(month)) {
        monthlyTrends.set(month, { increases: 0, decreases: 0, netChange: 0 });
      }

      const trend = monthlyTrends.get(month)!;
      const costImpact = event.impact?.financial?.estimatedCost || 0;

      if (costImpact > 0) {
        trend.increases += costImpact;
        trend.netChange += costImpact;
      } else if (costImpact < 0) {
        trend.decreases += Math.abs(costImpact);
        trend.netChange += costImpact;
      }
    });

    return Array.from(monthlyTrends.entries()).map(([month, data]) => ({
      month,
      ...data
    }));
  }

  private calculateCostBreakdown(nodes: any[], inventory: any[]): any {
    const breakdown = {
      procurement: 0,
      inventory: 0,
      logistics: 0,
      quality: 0,
      compliance: 0
    };

    // Calculate procurement costs
    breakdown.procurement = nodes.reduce((sum, node) =>
      sum + (node.performance?.totalTransactionValue || 0), 0
    );

    // Calculate inventory holding costs
    breakdown.inventory = inventory.reduce((sum, item) =>
      sum + (item.quantityOnHand * item.averageCost * 0.25), 0 // 25% annual holding cost
    );

    // Estimate other costs based on industry averages
    const totalDirectCosts = breakdown.procurement + breakdown.inventory;
    breakdown.logistics = totalDirectCosts * 0.08; // 8% of direct costs
    breakdown.quality = totalDirectCosts * 0.03; // 3% of direct costs
    breakdown.compliance = totalDirectCosts * 0.02; // 2% of direct costs

    return breakdown;
  }

  private async identifyCostOptimizations(nodes: any[], inventory: any[]): Promise<any[]> {
    const opportunities: any[] = [];

    // Identify high-cost, low-performing suppliers
    nodes.forEach(node => {
      const costPerformanceRatio = (node.performance?.totalTransactionValue || 0) /
                                   (node.performance?.qualityScore || 1);

      if (costPerformanceRatio > 10000) { // Threshold for high cost-to-performance ratio
        opportunities.push({
          type: 'supplier-optimization',
          nodeId: node.id,
          nodeName: node.name,
          description: 'High cost relative to performance - consider renegotiation or alternative sourcing',
          potentialSavings: (node.performance?.totalTransactionValue || 0) * 0.15, // 15% potential savings
          confidence: 0.7
        });
      }
    });

    // Identify excess inventory
    inventory.forEach(item => {
      if (item.daysOnHand > 90 && item.quantityOnHand > item.safetyStock * 2) {
        opportunities.push({
          type: 'inventory-optimization',
          productId: item.productId,
          description: 'Excess inventory identified - consider demand planning optimization',
          potentialSavings: (item.quantityOnHand - item.safetyStock) * item.averageCost * 0.25,
          confidence: 0.8
        });
      }
    });

    return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  // Additional helper methods for network analysis

  private findPath(graph: any, startId: string, endId: string): string[] {
    // Simple BFS path finding - would use more sophisticated algorithms in production
    const visited = new Set<string>();
    const queue = [[startId]];

    while (queue.length > 0) {
      const path = queue.shift()!;
      const currentNode = path[path.length - 1];

      if (currentNode === endId) {
        return path;
      }

      if (!visited.has(currentNode)) {
        visited.add(currentNode);

        const neighbors = graph.edges
          .filter((edge: any) => edge.source === currentNode)
          .map((edge: any) => edge.target);

        neighbors.forEach((neighbor: string) => {
          if (!visited.has(neighbor)) {
            queue.push([...path, neighbor]);
          }
        });
      }
    }

    return [];
  }

  private calculatePathRisk(graph: any, path: string[]): number {
    // Calculate risk score for a path based on individual node risks
    let totalRisk = 0;

    path.forEach(nodeId => {
      const node = graph.nodes.find((n: any) => n.id === nodeId);
      if (node?.metrics?.riskScore) {
        totalRisk += node.metrics.riskScore;
      }
    });

    return totalRisk / path.length;
  }

  private calculateRedundancy(graph: any): number {
    // Calculate network redundancy based on alternative paths
    let redundantPaths = 0;
    let totalPaths = 0;

    graph.nodes.forEach((node: any) => {
      if (node.tier === 1) {
        const tier3Sources = graph.nodes.filter((n: any) => n.tier === 3);

        tier3Sources.forEach((source: any) => {
          const paths = this.findAllPaths(graph, source.id, node.id);
          totalPaths++;
          if (paths.length > 1) {
            redundantPaths++;
          }
        });
      }
    });

    return totalPaths > 0 ? redundantPaths / totalPaths : 0;
  }

  private calculateDiversity(graph: any): number {
    // Calculate supplier diversity based on geographic and type distribution
    const locations = new Set();
    const types = new Set();

    graph.nodes.forEach((node: any) => {
      if (node.location?.country) locations.add(node.location.country);
      if (node.type) types.add(node.type);
    });

    // Normalize based on maximum possible diversity
    const maxCountries = 50; // Reasonable maximum for global supply chains
    const maxTypes = 6; // Based on our defined node types

    const geographicDiversity = Math.min(locations.size / maxCountries, 1);
    const typeDiversity = Math.min(types.size / maxTypes, 1);

    return (geographicDiversity + typeDiversity) / 2;
  }

  private calculateFlexibility(graph: any): number {
    // Calculate flexibility based on average alternative options per node
    let totalAlternatives = 0;
    let nodeCount = 0;

    graph.nodes.forEach((node: any) => {
      const sameTypeNodes = graph.nodes.filter((n: any) =>
        n.type === node.type && n.id !== node.id
      );

      totalAlternatives += sameTypeNodes.length;
      nodeCount++;
    });

    const avgAlternatives = nodeCount > 0 ? totalAlternatives / nodeCount : 0;

    // Normalize to 0-1 scale (assuming max 10 alternatives per node is excellent)
    return Math.min(avgAlternatives / 10, 1);
  }

  private findAllPaths(graph: any, startId: string, endId: string, maxDepth: number = 5): string[][] {
    // Find all paths between two nodes (limited depth to prevent infinite loops)
    const allPaths: string[][] = [];

    const dfs = (currentPath: string[], visited: Set<string>, depth: number) => {
      const currentNode = currentPath[currentPath.length - 1];

      if (currentNode === endId) {
        allPaths.push([...currentPath]);
        return;
      }

      if (depth >= maxDepth) {
        return;
      }

      const neighbors = graph.edges
        .filter((edge: any) => edge.source === currentNode)
        .map((edge: any) => edge.target);

      neighbors.forEach((neighbor: string) => {
        if (!visited.has(neighbor)) {
          const newVisited = new Set(visited);
          newVisited.add(neighbor);
          dfs([...currentPath, neighbor], newVisited, depth + 1);
        }
      });
    };

    const initialVisited = new Set([startId]);
    dfs([startId], initialVisited, 0);

    return allPaths;
  }
}