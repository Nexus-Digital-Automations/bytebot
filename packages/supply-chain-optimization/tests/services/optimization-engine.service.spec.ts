import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OptimizationEngineService } from '../../src/services/optimization-engine.service';
import { SupplyChainNodeEntity, ProductEntity, InventoryItemEntity } from '../../../supply-chain-analytics/src/models/supply-chain.entity';
import {
  OptimizationProblem,
  OptimizationResult,
  LinearProgrammingProblem,
  GeneticAlgorithmConfig,
  SimulatedAnnealingConfig,
  ParticleSwarmConfig,
  CostOptimizationResult,
  InventoryOptimizationResult,
  SupplierSelectionResult
} from '../../src/interfaces/optimization.interface';

describe('OptimizationEngineService', () => {
  let service: OptimizationEngineService;
  let supplyChainNodeRepository: jest.Mocked<Repository<SupplyChainNodeEntity>>;
  let productRepository: jest.Mocked<Repository<ProductEntity>>;
  let inventoryRepository: jest.Mocked<Repository<InventoryItemEntity>>;

  const createMockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByIds: jest.fn(),
    createQueryBuilder: jest.fn()
  });

  const createTestOptimizationProblem = (): OptimizationProblem => ({
    id: 'opt-123',
    type: 'cost_minimization',
    objective: 'minimize_total_cost',
    constraints: [
      { type: 'capacity', value: 10000, operator: '<=', penalty: 100 },
      { type: 'demand', value: 5000, operator: '>=', penalty: 200 }
    ],
    variables: [
      { name: 'production_quantity', type: 'continuous', lowerBound: 0, upperBound: 10000 },
      { name: 'supplier_selection', type: 'binary', lowerBound: 0, upperBound: 1 }
    ],
    parameters: {
      costPerUnit: 50,
      holdingCostRate: 0.25,
      setupCost: 1000
    }
  });

  const createTestSupplier = () => ({
    id: 'supplier-123',
    name: 'Test Supplier',
    capacity: 10000,
    unitCost: 45,
    qualityScore: 0.95,
    leadTime: 7,
    reliability: 0.98,
    minimumOrderQuantity: 100,
    location: { latitude: 40.7128, longitude: -74.0060 }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptimizationEngineService,
        {
          provide: getRepositoryToken(SupplyChainNodeEntity),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(InventoryItemEntity),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<OptimizationEngineService>(OptimizationEngineService);
    supplyChainNodeRepository = module.get(getRepositoryToken(SupplyChainNodeEntity));
    productRepository = module.get(getRepositoryToken(ProductEntity));
    inventoryRepository = module.get(getRepositoryToken(InventoryItemEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('solveLinearProgramming', () => {
    it('should solve linear programming problem for cost minimization', async () => {
      const problem: LinearProgrammingProblem = {
        objective: {
          type: 'minimize',
          coefficients: [50, 60, 40] // Cost per unit for suppliers
        },
        constraints: [
          {
            coefficients: [1, 1, 1],
            operator: '>=',
            value: 1000, // Minimum total quantity
            name: 'demand_constraint'
          },
          {
            coefficients: [500, 800, 600],
            operator: '<=',
            value: 50000, // Budget constraint
            name: 'budget_constraint'
          },
          {
            coefficients: [1, 0, 0],
            operator: '<=',
            value: 600, // Supplier 1 capacity
            name: 'supplier_1_capacity'
          }
        ],
        variables: [
          { name: 'supplier_1_quantity', lowerBound: 0, upperBound: 600 },
          { name: 'supplier_2_quantity', lowerBound: 0, upperBound: 800 },
          { name: 'supplier_3_quantity', lowerBound: 0, upperBound: 500 }
        ]
      };

      const result = await service.solveLinearProgramming(problem);

      expect(result).toBeDefined();
      expect(result.status).toBe('optimal');
      expect(result.objectiveValue).toBeGreaterThan(0);
      expect(result.solution).toBeDefined();
      expect(result.solution.length).toBe(3);
      expect(result.computationTime).toBeGreaterThan(0);

      // Check that constraints are satisfied
      const totalQuantity = result.solution.reduce((sum, val) => sum + val, 0);
      expect(totalQuantity).toBeGreaterThanOrEqual(1000);

      // Check that solution respects bounds
      result.solution.forEach((value, index) => {
        expect(value).toBeGreaterThanOrEqual(problem.variables[index].lowerBound);
        expect(value).toBeLessThanOrEqual(problem.variables[index].upperBound);
      });
    });

    it('should solve linear programming problem for profit maximization', async () => {
      const problem: LinearProgrammingProblem = {
        objective: {
          type: 'maximize',
          coefficients: [40, 50, 30] // Profit per unit for products
        },
        constraints: [
          {
            coefficients: [2, 3, 1],
            operator: '<=',
            value: 100, // Labor hours available
            name: 'labor_constraint'
          },
          {
            coefficients: [1, 2, 2],
            operator: '<=',
            value: 80, // Material available
            name: 'material_constraint'
          }
        ],
        variables: [
          { name: 'product_1_quantity', lowerBound: 0, upperBound: 50 },
          { name: 'product_2_quantity', lowerBound: 0, upperBound: 40 },
          { name: 'product_3_quantity', lowerBound: 0, upperBound: 60 }
        ]
      };

      const result = await service.solveLinearProgramming(problem);

      expect(result.status).toBe('optimal');
      expect(result.objectiveValue).toBeGreaterThan(0);

      // For maximization, verify we're getting a reasonable profit
      const calculatedObjective = result.solution.reduce(
        (sum, val, idx) => sum + val * problem.objective.coefficients[idx], 0
      );
      expect(calculatedObjective).toBeCloseTo(result.objectiveValue, 2);
    });

    it('should detect infeasible problems', async () => {
      const infeasibleProblem: LinearProgrammingProblem = {
        objective: {
          type: 'minimize',
          coefficients: [1, 1]
        },
        constraints: [
          {
            coefficients: [1, 1],
            operator: '>=',
            value: 10,
            name: 'min_constraint'
          },
          {
            coefficients: [1, 1],
            operator: '<=',
            value: 5, // Conflicting constraint
            name: 'max_constraint'
          }
        ],
        variables: [
          { name: 'x1', lowerBound: 0, upperBound: 100 },
          { name: 'x2', lowerBound: 0, upperBound: 100 }
        ]
      };

      const result = await service.solveLinearProgramming(infeasibleProblem);

      expect(result.status).toBe('infeasible');
      expect(result.objectiveValue).toBeNull();
      expect(result.solution).toBeNull();
    });

    it('should handle unbounded problems', async () => {
      const unboundedProblem: LinearProgrammingProblem = {
        objective: {
          type: 'maximize',
          coefficients: [1, 1]
        },
        constraints: [
          {
            coefficients: [-1, -1],
            operator: '<=',
            value: -1, // No effective upper bound
            name: 'ineffective_constraint'
          }
        ],
        variables: [
          { name: 'x1', lowerBound: 0, upperBound: Infinity },
          { name: 'x2', lowerBound: 0, upperBound: Infinity }
        ]
      };

      const result = await service.solveLinearProgramming(unboundedProblem);

      expect(['unbounded', 'optimal']).toContain(result.status);
      if (result.status === 'unbounded') {
        expect(result.objectiveValue).toBeNull();
      }
    });
  });

  describe('optimizeWithGeneticAlgorithm', () => {
    it('should optimize supplier selection using genetic algorithm', async () => {
      const suppliers = Array.from({ length: 10 }, (_, i) => ({
        ...createTestSupplier(),
        id: `supplier-${i}`,
        unitCost: 40 + Math.random() * 20,
        qualityScore: 0.8 + Math.random() * 0.2,
        capacity: 5000 + Math.random() * 5000
      }));

      supplyChainNodeRepository.find.mockResolvedValue(suppliers as any);

      const config: GeneticAlgorithmConfig = {
        populationSize: 50,
        generations: 100,
        mutationRate: 0.1,
        crossoverRate: 0.8,
        elitismRate: 0.1,
        fitnessFunction: 'weighted_multi_objective',
        constraints: {
          maxSuppliers: 5,
          minTotalCapacity: 20000,
          maxTotalCost: 1000000
        }
      };

      const result = await service.optimizeWithGeneticAlgorithm('supplier_selection', config);

      expect(result).toBeDefined();
      expect(result.algorithm).toBe('genetic_algorithm');
      expect(result.bestSolution).toBeDefined();
      expect(result.bestFitness).toBeGreaterThan(0);
      expect(result.generations).toBe(100);
      expect(result.convergenceGeneration).toBeLessThanOrEqual(100);
      expect(result.evolutionHistory).toBeDefined();
      expect(result.solutionDetails).toBeDefined();

      // Check constraint satisfaction
      const selectedSuppliers = result.bestSolution.filter(gene => gene > 0.5);
      expect(selectedSuppliers.length).toBeLessThanOrEqual(5);
    });

    it('should optimize production scheduling', async () => {
      const products = Array.from({ length: 5 }, (_, i) => ({
        id: `product-${i}`,
        demand: 1000 + Math.random() * 500,
        profit: 50 + Math.random() * 30,
        productionTime: 2 + Math.random() * 3,
        setupCost: 100 + Math.random() * 200
      }));

      productRepository.find.mockResolvedValue(products as any);

      const config: GeneticAlgorithmConfig = {
        populationSize: 30,
        generations: 50,
        mutationRate: 0.15,
        crossoverRate: 0.75,
        fitnessFunction: 'profit_maximization',
        constraints: {
          maxProductionTime: 100,
          maxSetupCost: 2000
        }
      };

      const result = await service.optimizeWithGeneticAlgorithm('production_scheduling', config);

      expect(result.bestSolution).toHaveLength(5);
      expect(result.constraintViolations).toBe(0);
    });

    it('should handle convergence detection', async () => {
      const config: GeneticAlgorithmConfig = {
        populationSize: 20,
        generations: 200,
        mutationRate: 0.1,
        crossoverRate: 0.8,
        convergenceCriteria: {
          maxGenerationsWithoutImprovement: 20,
          fitnessThreshold: 0.001
        }
      };

      supplyChainNodeRepository.find.mockResolvedValue([createTestSupplier()] as any);

      const result = await service.optimizeWithGeneticAlgorithm('supplier_selection', config);

      expect(result.converged).toBeTruthy();
      expect(result.convergenceGeneration).toBeLessThan(200);
    });
  });

  describe('optimizeWithSimulatedAnnealing', () => {
    it('should optimize routing problem using simulated annealing', async () => {
      const nodes = Array.from({ length: 8 }, (_, i) => ({
        id: `node-${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        demand: 100 + Math.random() * 200
      }));

      const config: SimulatedAnnealingConfig = {
        initialTemperature: 1000,
        finalTemperature: 0.1,
        coolingRate: 0.95,
        maxIterations: 10000,
        neighborsPerTemperature: 100,
        coolingSchedule: 'exponential'
      };

      const result = await service.optimizeWithSimulatedAnnealing('routing', config, { nodes });

      expect(result).toBeDefined();
      expect(result.algorithm).toBe('simulated_annealing');
      expect(result.bestSolution).toBeDefined();
      expect(result.bestCost).toBeGreaterThan(0);
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.finalTemperature).toBeCloseTo(0.1, 1);
      expect(result.acceptanceRate).toBeGreaterThan(0);
      expect(result.coolingHistory).toBeDefined();
    });

    it('should optimize inventory allocation using simulated annealing', async () => {
      const warehouses = Array.from({ length: 5 }, (_, i) => ({
        id: `warehouse-${i}`,
        capacity: 10000 + Math.random() * 5000,
        holdingCost: 2 + Math.random() * 3,
        location: { lat: 40 + Math.random() * 10, lng: -70 + Math.random() * 20 }
      }));

      const inventory = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        quantity: 500 + Math.random() * 1000,
        value: 100 + Math.random() * 400,
        demandVariability: 0.1 + Math.random() * 0.3
      }));

      inventoryRepository.find.mockResolvedValue(inventory as any);

      const config: SimulatedAnnealingConfig = {
        initialTemperature: 500,
        finalTemperature: 0.01,
        coolingRate: 0.98,
        maxIterations: 5000,
        neighborsPerTemperature: 50
      };

      const result = await service.optimizeWithSimulatedAnnealing('inventory_allocation', config, { warehouses });

      expect(result.bestSolution).toBeDefined();
      expect(result.convergenceIteration).toBeLessThanOrEqual(5000);
    });

    it('should use different cooling schedules', async () => {
      const linearConfig: SimulatedAnnealingConfig = {
        initialTemperature: 100,
        finalTemperature: 1,
        maxIterations: 1000,
        coolingSchedule: 'linear'
      };

      const logarithmicConfig: SimulatedAnnealingConfig = {
        initialTemperature: 100,
        finalTemperature: 1,
        maxIterations: 1000,
        coolingSchedule: 'logarithmic'
      };

      const linearResult = await service.optimizeWithSimulatedAnnealing('routing', linearConfig, {});
      const logResult = await service.optimizeWithSimulatedAnnealing('routing', logarithmicConfig, {});

      expect(linearResult.coolingSchedule).toBe('linear');
      expect(logResult.coolingSchedule).toBe('logarithmic');
      expect(linearResult.coolingHistory).not.toEqual(logResult.coolingHistory);
    });
  });

  describe('optimizeWithParticleSwarm', () => {
    it('should optimize supplier network using particle swarm optimization', async () => {
      const suppliers = Array.from({ length: 15 }, (_, i) => ({
        ...createTestSupplier(),
        id: `supplier-${i}`,
        location: {
          latitude: 30 + Math.random() * 20,
          longitude: -120 + Math.random() * 40
        },
        capacity: 5000 + Math.random() * 10000,
        unitCost: 30 + Math.random() * 25
      }));

      supplyChainNodeRepository.find.mockResolvedValue(suppliers as any);

      const config: ParticleSwarmConfig = {
        swarmSize: 30,
        maxIterations: 200,
        inertiaWeight: 0.7,
        cognitiveWeight: 2.0,
        socialWeight: 2.0,
        maxVelocity: 0.5,
        convergenceCriteria: {
          maxIterationsWithoutImprovement: 50,
          fitnessThreshold: 0.001
        }
      };

      const result = await service.optimizeWithParticleSwarm('supplier_network', config);

      expect(result).toBeDefined();
      expect(result.algorithm).toBe('particle_swarm');
      expect(result.bestSolution).toBeDefined();
      expect(result.bestFitness).toBeGreaterThan(0);
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.swarmSize).toBe(30);
      expect(result.convergenceIteration).toBeLessThanOrEqual(200);
      expect(result.fitnessHistory).toBeDefined();
      expect(result.diversityMetrics).toBeDefined();
    });

    it('should optimize resource allocation', async () => {
      const resources = Array.from({ length: 8 }, (_, i) => ({
        id: `resource-${i}`,
        capacity: 1000 + Math.random() * 2000,
        cost: 50 + Math.random() * 100,
        efficiency: 0.7 + Math.random() * 0.3,
        availability: 0.8 + Math.random() * 0.2
      }));

      const config: ParticleSwarmConfig = {
        swarmSize: 25,
        maxIterations: 150,
        inertiaWeight: 0.6,
        cognitiveWeight: 1.5,
        socialWeight: 1.8,
        adaptiveWeights: true
      };

      const result = await service.optimizeWithParticleSwarm('resource_allocation', config, { resources });

      expect(result.bestSolution).toHaveLength(8);
      expect(result.adaptiveWeightsUsed).toBeTruthy();
    });

    it('should handle swarm diversity and convergence', async () => {
      const config: ParticleSwarmConfig = {
        swarmSize: 20,
        maxIterations: 100,
        inertiaWeight: 0.8,
        cognitiveWeight: 2.0,
        socialWeight: 2.0,
        diversityThreshold: 0.1,
        restartOnStagnation: true
      };

      const result = await service.optimizeWithParticleSwarm('supplier_network', config);

      expect(result.diversityMetrics.finalDiversity).toBeDefined();
      expect(result.diversityMetrics.averageDiversity).toBeDefined();
      if (result.restartCount > 0) {
        expect(result.restartIterations).toBeDefined();
      }
    });
  });

  describe('optimizeCosts', () => {
    it('should optimize total supply chain costs', async () => {
      const suppliers = Array.from({ length: 6 }, (_, i) => ({
        ...createTestSupplier(),
        id: `supplier-${i}`,
        unitCost: 40 + i * 5,
        capacity: 8000 + i * 1000,
        qualityScore: 0.85 + i * 0.02,
        transportationCost: 5 + i * 2
      }));

      const products = Array.from({ length: 3 }, (_, i) => ({
        id: `product-${i}`,
        demand: 5000 + i * 2000,
        value: 100 + i * 50,
        holdingCostRate: 0.2 + i * 0.05
      }));

      supplyChainNodeRepository.find.mockResolvedValue(suppliers as any);
      productRepository.find.mockResolvedValue(products as any);

      const result = await service.optimizeCosts({
        objectives: ['minimize_procurement_cost', 'minimize_transportation_cost', 'minimize_holding_cost'],
        constraints: {
          maxTotalCost: 500000,
          minQualityScore: 0.9,
          maxSuppliers: 4
        },
        optimizationMethod: 'multi_objective_genetic'
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('cost_optimization');
      expect(result.totalCostSaving).toBeGreaterThan(0);
      expect(result.optimizedCosts.procurement).toBeGreaterThan(0);
      expect(result.optimizedCosts.transportation).toBeGreaterThan(0);
      expect(result.optimizedCosts.holding).toBeGreaterThan(0);
      expect(result.supplierRecommendations).toBeDefined();
      expect(result.costBreakdown).toBeDefined();
    });

    it('should optimize costs with risk considerations', async () => {
      const suppliers = [
        { ...createTestSupplier(), id: 'supplier-1', unitCost: 45, riskScore: 0.2 },
        { ...createTestSupplier(), id: 'supplier-2', unitCost: 50, riskScore: 0.1 },
        { ...createTestSupplier(), id: 'supplier-3', unitCost: 40, riskScore: 0.4 }
      ];

      supplyChainNodeRepository.find.mockResolvedValue(suppliers as any);
      productRepository.find.mockResolvedValue([{ id: 'prod-1', demand: 10000 }] as any);

      const result = await service.optimizeCosts({
        objectives: ['minimize_total_cost', 'minimize_risk'],
        riskWeighting: 0.3,
        constraints: { maxRiskScore: 0.25 }
      });

      expect(result.riskAdjustedCost).toBeDefined();
      expect(result.riskMetrics).toBeDefined();
      expect(result.riskMetrics.overallRisk).toBeLessThanOrEqual(0.25);
    });
  });

  describe('optimizeInventory', () => {
    it('should optimize inventory levels across warehouses', async () => {
      const inventoryItems = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        productId: `product-${i % 3}`,
        warehouseId: `warehouse-${i % 4}`,
        currentStock: 500 + Math.random() * 1000,
        reorderPoint: 200 + Math.random() * 100,
        maxStock: 2000 + Math.random() * 500,
        holdingCost: 2 + Math.random() * 3,
        stockoutCost: 50 + Math.random() * 100,
        averageDemand: 100 + Math.random() * 50
      }));

      inventoryRepository.find.mockResolvedValue(inventoryItems as any);

      const result = await service.optimizeInventory({
        objectives: ['minimize_holding_cost', 'minimize_stockout_cost', 'maximize_service_level'],
        constraints: {
          maxTotalInventoryValue: 1000000,
          minServiceLevel: 0.95,
          maxWarehouseUtilization: 0.9
        },
        optimizationHorizon: 365
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('inventory_optimization');
      expect(result.optimizedLevels).toBeDefined();
      expect(result.costSavings.holdingCostReduction).toBeGreaterThan(0);
      expect(result.serviceLevel).toBeGreaterThanOrEqual(0.95);
      expect(result.reorderPointAdjustments).toBeDefined();
      expect(result.safetyStockRecommendations).toBeDefined();
    });

    it('should optimize inventory with seasonal demand patterns', async () => {
      const seasonalItems = Array.from({ length: 5 }, (_, i) => ({
        id: `seasonal-item-${i}`,
        seasonalityFactor: [1.2, 0.8, 1.5, 0.9], // Quarterly factors
        demandVariability: 0.2 + i * 0.1,
        leadTime: 14 + i * 7,
        currentStock: 1000 + i * 500
      }));

      inventoryRepository.find.mockResolvedValue(seasonalItems as any);

      const result = await service.optimizeInventory({
        objectives: ['minimize_total_cost'],
        includeSeasonality: true,
        forecastHorizon: 52, // Weekly for a year
        constraints: { maxStockouts: 0.02 }
      });

      expect(result.seasonalAdjustments).toBeDefined();
      expect(result.forecastBasedLevels).toBeDefined();
      expect(result.seasonalRecommendations).toHaveLength(4); // Quarterly
    });
  });

  describe('optimizeSupplierSelection', () => {
    it('should optimize supplier selection with multiple criteria', async () => {
      const suppliers = Array.from({ length: 12 }, (_, i) => ({
        ...createTestSupplier(),
        id: `supplier-${i}`,
        unitCost: 35 + Math.random() * 30,
        qualityScore: 0.75 + Math.random() * 0.25,
        deliveryReliability: 0.8 + Math.random() * 0.2,
        sustainabilityScore: 0.6 + Math.random() * 0.4,
        capacity: 5000 + Math.random() * 10000,
        location: {
          region: ['North America', 'Europe', 'Asia'][i % 3],
          country: ['USA', 'Germany', 'China'][i % 3]
        }
      }));

      supplyChainNodeRepository.find.mockResolvedValue(suppliers as any);

      const result = await service.optimizeSupplierSelection({
        criteria: {
          cost: { weight: 0.3, direction: 'minimize' },
          quality: { weight: 0.25, direction: 'maximize' },
          reliability: { weight: 0.25, direction: 'maximize' },
          sustainability: { weight: 0.2, direction: 'maximize' }
        },
        constraints: {
          maxSuppliers: 5,
          minRegionalDiversity: 2,
          maxCostVariance: 0.2,
          minCapacity: 30000
        },
        optimizationMethod: 'weighted_sum'
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('supplier_selection');
      expect(result.selectedSuppliers).toHaveLength(5);
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.criteriaScores.cost).toBeDefined();
      expect(result.criteriaScores.quality).toBeDefined();
      expect(result.criteriaScores.reliability).toBeDefined();
      expect(result.criteriaScores.sustainability).toBeDefined();
      expect(result.diversityMetrics.regionalDiversity).toBeGreaterThanOrEqual(2);
    });

    it('should optimize supplier selection with risk analysis', async () => {
      const suppliers = [
        {
          ...createTestSupplier(),
          id: 'supplier-low-risk',
          riskScore: 0.1,
          geopoliticalRisk: 0.05,
          financialStability: 0.95
        },
        {
          ...createTestSupplier(),
          id: 'supplier-medium-risk',
          riskScore: 0.3,
          geopoliticalRisk: 0.2,
          financialStability: 0.8
        },
        {
          ...createTestSupplier(),
          id: 'supplier-high-risk',
          riskScore: 0.6,
          geopoliticalRisk: 0.5,
          financialStability: 0.6
        }
      ];

      supplyChainNodeRepository.find.mockResolvedValue(suppliers as any);

      const result = await service.optimizeSupplierSelection({
        criteria: {
          cost: { weight: 0.4, direction: 'minimize' },
          risk: { weight: 0.6, direction: 'minimize' }
        },
        riskAnalysis: {
          includeGeopoliticalRisk: true,
          includeFinancialRisk: true,
          riskTolerance: 0.25
        },
        constraints: { maxSuppliers: 2 }
      });

      expect(result.riskAnalysis).toBeDefined();
      expect(result.riskAnalysis.overallRisk).toBeLessThanOrEqual(0.25);
      expect(result.riskAnalysis.riskDistribution).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid optimization problems', async () => {
      const invalidProblem: LinearProgrammingProblem = {
        objective: {
          type: 'minimize',
          coefficients: [1, 2] // 2 coefficients
        },
        constraints: [],
        variables: [
          { name: 'x1', lowerBound: 0, upperBound: 100 }
          // Missing second variable
        ]
      };

      await expect(service.solveLinearProgramming(invalidProblem))
        .rejects.toThrow('Mismatch between objective coefficients and variables');
    });

    it('should handle repository errors gracefully', async () => {
      const error = new Error('Database connection failed');
      supplyChainNodeRepository.find.mockRejectedValue(error);

      await expect(service.optimizeCosts({ objectives: ['minimize_total_cost'] }))
        .rejects.toThrow('Database connection failed');
    });

    it('should validate optimization parameters', async () => {
      const invalidConfig: GeneticAlgorithmConfig = {
        populationSize: -10, // Invalid negative value
        generations: 0, // Invalid zero value
        mutationRate: 1.5, // Invalid rate > 1
        crossoverRate: -0.1 // Invalid negative rate
      };

      await expect(service.optimizeWithGeneticAlgorithm('supplier_selection', invalidConfig))
        .rejects.toThrow('Invalid optimization parameters');
    });

    it('should handle empty datasets', async () => {
      supplyChainNodeRepository.find.mockResolvedValue([]);
      productRepository.find.mockResolvedValue([]);

      const result = await service.optimizeCosts({ objectives: ['minimize_total_cost'] });

      expect(result.status).toBe('no_data');
      expect(result.totalCostSaving).toBe(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large optimization problems efficiently', async () => {
      const largeSupplierSet = Array.from({ length: 100 }, (_, i) => ({
        ...createTestSupplier(),
        id: `supplier-${i}`,
        unitCost: 30 + Math.random() * 40
      }));

      supplyChainNodeRepository.find.mockResolvedValue(largeSupplierSet as any);

      const startTime = Date.now();
      const result = await service.optimizeSupplierSelection({
        criteria: { cost: { weight: 1.0, direction: 'minimize' } },
        constraints: { maxSuppliers: 10 },
        optimizationMethod: 'genetic_algorithm'
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.selectedSuppliers).toHaveLength(10);
    });

    it('should handle concurrent optimization requests', async () => {
      const mockSuppliers = [createTestSupplier()];
      supplyChainNodeRepository.find.mockResolvedValue(mockSuppliers as any);

      const problems = ['cost_optimization', 'inventory_optimization', 'supplier_selection'];
      const promises = problems.map(problem => {
        switch (problem) {
          case 'cost_optimization':
            return service.optimizeCosts({ objectives: ['minimize_total_cost'] });
          case 'inventory_optimization':
            return service.optimizeInventory({ objectives: ['minimize_holding_cost'] });
          case 'supplier_selection':
            return service.optimizeSupplierSelection({
              criteria: { cost: { weight: 1.0, direction: 'minimize' } }
            });
          default:
            return Promise.resolve({});
        }
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results[0].type).toBe('cost_optimization');
      expect(results[1].type).toBe('inventory_optimization');
      expect(results[2].type).toBe('supplier_selection');
    });
  });
});