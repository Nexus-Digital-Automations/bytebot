import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SustainabilityMetricsService } from '../../src/services/sustainability-metrics.service';
import { SupplyChainNodeEntity, ProductEntity } from '../../src/models/supply-chain.entity';
import { createMockRepository, createTestSupplyChainNode, createTestProduct } from '../setup';
import {
  CarbonFootprint,
  WaterFootprint,
  WasteFootprint,
  ESGScore,
  SustainabilityReport,
  CircularityMetrics
} from '../../src/interfaces/supply-chain.interface';

describe('SustainabilityMetricsService', () => {
  let service: SustainabilityMetricsService;
  let supplyChainNodeRepository: jest.Mocked<Repository<SupplyChainNodeEntity>>;
  let productRepository: jest.Mocked<Repository<ProductEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SustainabilityMetricsService,
        {
          provide: getRepositoryToken(SupplyChainNodeEntity),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<SustainabilityMetricsService>(SustainabilityMetricsService);
    supplyChainNodeRepository = module.get(getRepositoryToken(SupplyChainNodeEntity));
    productRepository = module.get(getRepositoryToken(ProductEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCarbonFootprint', () => {
    it('should calculate comprehensive carbon footprint', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          id: 'node-1',
          energyConsumption: 1000, // kWh
          electricityEmissionFactor: 0.5, // kg CO2/kWh
          fuelConsumption: 500, // liters
          fuelEmissionFactor: 2.3, // kg CO2/liter
          processEmissions: 200, // kg CO2
          transportationDistance: 1000, // km
          transportationMode: 'truck',
          transportationEmissionFactor: 0.1 // kg CO2/km
        },
        {
          ...createTestSupplyChainNode(),
          id: 'node-2',
          energyConsumption: 800,
          electricityEmissionFactor: 0.3,
          fuelConsumption: 300,
          fuelEmissionFactor: 2.3,
          processEmissions: 150,
          transportationDistance: 500,
          transportationMode: 'ship',
          transportationEmissionFactor: 0.02
        }
      ];

      const mockProduct = {
        ...createTestProduct(),
        id: productId,
        weight: 10, // kg
        productionVolume: 1000 // units per year
      };

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateCarbonFootprint(productId);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.totalEmissions).toBeGreaterThan(0);
      expect(result.emissionsPerUnit).toBeGreaterThan(0);

      // Node 1: 1000*0.5 + 500*2.3 + 200 + 1000*0.1 = 500 + 1150 + 200 + 100 = 1950
      // Node 2: 800*0.3 + 300*2.3 + 150 + 500*0.02 = 240 + 690 + 150 + 10 = 1090
      // Total: 1950 + 1090 = 3040 kg CO2
      expect(result.totalEmissions).toBeCloseTo(3040, 0);
      expect(result.emissionsPerUnit).toBeCloseTo(3.04, 2); // 3040/1000 units

      expect(result.breakdown.energy).toBeCloseTo(1430, 0); // 500+240+1150+690
      expect(result.breakdown.transportation).toBeCloseTo(110, 0); // 100+10
      expect(result.breakdown.process).toBeCloseTo(350, 0); // 200+150

      expect(result.nodeContributions).toHaveLength(2);
      expect(result.calculationDate).toBeInstanceOf(Date);
    });

    it('should handle different transportation modes correctly', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          transportationDistance: 1000,
          transportationMode: 'air',
          transportationEmissionFactor: 0.5 // Higher emissions for air transport
        },
        {
          ...createTestSupplyChainNode(),
          transportationDistance: 1000,
          transportationMode: 'ship',
          transportationEmissionFactor: 0.02 // Lower emissions for ship transport
        }
      ];

      const mockProduct = { ...createTestProduct(), productionVolume: 1000 };

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateCarbonFootprint(productId);

      expect(result.breakdown.transportation).toBeCloseTo(520, 0); // 500 + 20
      expect(result.transportationBreakdown.air).toBeCloseTo(500, 0);
      expect(result.transportationBreakdown.ship).toBeCloseTo(20, 0);
    });

    it('should calculate emissions reduction opportunities', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          energyConsumption: 1000,
          electricityEmissionFactor: 0.8, // High emission factor
          renewableEnergyPercentage: 0.2, // 20% renewable
          energyEfficiencyScore: 0.6 // Medium efficiency
        }
      ];

      const mockProduct = { ...createTestProduct(), productionVolume: 1000 };

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateCarbonFootprint(productId);

      expect(result.reductionOpportunities).toBeDefined();
      expect(result.reductionOpportunities.renewableEnergy).toBeGreaterThan(0);
      expect(result.reductionOpportunities.energyEfficiency).toBeGreaterThan(0);
      expect(result.reductionOpportunities.total).toBeGreaterThan(0);
    });

    it('should handle missing emission factors with defaults', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          energyConsumption: 1000,
          electricityEmissionFactor: undefined, // Missing factor
          fuelConsumption: 500,
          fuelEmissionFactor: undefined // Missing factor
        }
      ];

      const mockProduct = { ...createTestProduct(), productionVolume: 1000 };

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateCarbonFootprint(productId);

      expect(result.totalEmissions).toBeGreaterThan(0); // Should use default factors
      expect(result.dataQuality.missingEmissionFactors).toBeGreaterThan(0);
      expect(result.dataQuality.overall).toBeLessThan(1); // Lower quality due to missing data
    });
  });

  describe('calculateWaterFootprint', () => {
    it('should calculate comprehensive water footprint', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          id: 'node-1',
          waterConsumption: {
            blue: 1000, // liters
            green: 2000,
            grey: 500
          },
          waterStressIndex: 0.7,
          waterRecyclingRate: 0.3
        },
        {
          ...createTestSupplyChainNode(),
          id: 'node-2',
          waterConsumption: {
            blue: 800,
            green: 1500,
            grey: 300
          },
          waterStressIndex: 0.4,
          waterRecyclingRate: 0.5
        }
      ];

      const mockProduct = { ...createTestProduct(), productionVolume: 1000 };

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateWaterFootprint(productId);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.totalWaterFootprint).toBeCloseTo(6100, 0); // 3500 + 2600
      expect(result.waterFootprintPerUnit).toBeCloseTo(6.1, 1); // 6100/1000

      expect(result.breakdown.blueWater).toBeCloseTo(1800, 0); // 1000 + 800
      expect(result.breakdown.greenWater).toBeCloseTo(3500, 0); // 2000 + 1500
      expect(result.breakdown.greyWater).toBeCloseTo(800, 0); // 500 + 300

      expect(result.waterStressImpact).toBeGreaterThan(0);
      expect(result.nodeContributions).toHaveLength(2);
      expect(result.calculationDate).toBeInstanceOf(Date);
    });

    it('should calculate water stress weighted footprint', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          waterConsumption: { blue: 1000, green: 0, grey: 0 },
          waterStressIndex: 0.9 // High water stress
        },
        {
          ...createTestSupplyChainNode(),
          waterConsumption: { blue: 1000, green: 0, grey: 0 },
          waterStressIndex: 0.1 // Low water stress
        }
      ];

      const mockProduct = { ...createTestProduct(), productionVolume: 1000 };

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateWaterFootprint(productId);

      // Node with high water stress should have higher weighted impact
      expect(result.waterStressImpact).toBeGreaterThan(result.totalWaterFootprint * 0.5);
      expect(result.stressWeightedFootprint).toBeGreaterThan(result.totalWaterFootprint);
    });

    it('should identify water conservation opportunities', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          waterConsumption: { blue: 1000, green: 500, grey: 300 },
          waterRecyclingRate: 0.2, // Low recycling rate
          waterEfficiencyScore: 0.6, // Medium efficiency
          waterStressIndex: 0.8
        }
      ];

      const mockProduct = { ...createTestProduct(), productionVolume: 1000 };

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateWaterFootprint(productId);

      expect(result.conservationOpportunities).toBeDefined();
      expect(result.conservationOpportunities.recyclingImprovement).toBeGreaterThan(0);
      expect(result.conservationOpportunities.efficiencyImprovement).toBeGreaterThan(0);
      expect(result.conservationOpportunities.total).toBeGreaterThan(0);
    });

    it('should handle regions with different water availability', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          location: { region: 'Arid Region' },
          waterConsumption: { blue: 1000, green: 0, grey: 0 },
          waterStressIndex: 0.95,
          waterAvailability: 'scarce'
        },
        {
          ...createTestSupplyChainNode(),
          location: { region: 'Water Rich Region' },
          waterConsumption: { blue: 1000, green: 0, grey: 0 },
          waterStressIndex: 0.1,
          waterAvailability: 'abundant'
        }
      ];

      const mockProduct = { ...createTestProduct(), productionVolume: 1000 };

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateWaterFootprint(productId);

      expect(result.regionalAnalysis).toBeDefined();
      expect(result.regionalAnalysis['Arid Region'].riskLevel).toBe('high');
      expect(result.regionalAnalysis['Water Rich Region'].riskLevel).toBe('low');
    });
  });

  describe('calculateWasteFootprint', () => {
    it('should calculate comprehensive waste footprint', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          id: 'node-1',
          wasteGeneration: {
            hazardous: 100, // kg
            nonHazardous: 500,
            recyclable: 300,
            organic: 200
          },
          wasteRecyclingRate: 0.6,
          wasteDiversionRate: 0.8
        },
        {
          ...createTestSupplyChainNode(),
          id: 'node-2',
          wasteGeneration: {
            hazardous: 50,
            nonHazardous: 300,
            recyclable: 200,
            organic: 100
          },
          wasteRecyclingRate: 0.4,
          wasteDiversionRate: 0.6
        }
      ];

      const mockProduct = { ...createTestProduct(), productionVolume: 1000 };

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateWasteFootprint(productId);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.totalWasteGenerated).toBeCloseTo(1250, 0); // 1100 + 650
      expect(result.wastePerUnit).toBeCloseTo(1.25, 2); // 1250/1000

      expect(result.breakdown.hazardous).toBeCloseTo(150, 0); // 100 + 50
      expect(result.breakdown.nonHazardous).toBeCloseTo(800, 0); // 500 + 300
      expect(result.breakdown.recyclable).toBeCloseTo(500, 0); // 300 + 200
      expect(result.breakdown.organic).toBeCloseTo(300, 0); // 200 + 100

      expect(result.circularityMetrics.overallRecyclingRate).toBeGreaterThan(0);
      expect(result.circularityMetrics.diversionFromLandfill).toBeGreaterThan(0);
      expect(result.calculationDate).toBeInstanceOf(Date);
    });

    it('should calculate waste reduction opportunities', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          wasteGeneration: {
            hazardous: 100,
            nonHazardous: 500,
            recyclable: 300,
            organic: 200
          },
          wasteRecyclingRate: 0.3, // Low recycling rate
          wasteDiversionRate: 0.5, // Low diversion rate
          wasteReductionPotential: 0.25
        }
      ];

      const mockProduct = { ...createTestProduct(), productionVolume: 1000 };

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateWasteFootprint(productId);

      expect(result.reductionOpportunities).toBeDefined();
      expect(result.reductionOpportunities.recyclingImprovement).toBeGreaterThan(0);
      expect(result.reductionOpportunities.wasteMinimization).toBeGreaterThan(0);
      expect(result.reductionOpportunities.circularityEnhancement).toBeGreaterThan(0);
    });

    it('should assess environmental impact of waste', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          wasteGeneration: {
            hazardous: 200, // High hazardous waste
            nonHazardous: 100,
            recyclable: 50,
            organic: 50
          },
          wasteDisposalMethod: {
            landfill: 0.6,
            incineration: 0.2,
            recycling: 0.1,
            composting: 0.1
          }
        }
      ];

      const mockProduct = { ...createTestProduct(), productionVolume: 1000 };

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateWasteFootprint(productId);

      expect(result.environmentalImpact).toBeDefined();
      expect(result.environmentalImpact.toxicityScore).toBeGreaterThan(0.5); // High due to hazardous waste
      expect(result.environmentalImpact.landfillImpact).toBeGreaterThan(0);
      expect(result.environmentalImpact.emissionsFromWaste).toBeGreaterThan(0);
    });
  });

  describe('calculateESGScore', () => {
    it('should calculate comprehensive ESG score', async () => {
      const supplierId = 'supplier-123';
      const mockSupplier = {
        ...createTestSupplyChainNode(),
        id: supplierId,
        // Environmental metrics
        carbonIntensity: 0.3,
        renewableEnergyUsage: 0.7,
        wasteRecyclingRate: 0.8,
        waterEfficiency: 0.85,
        // Social metrics
        employeeSatisfaction: 0.82,
        safetyScore: 0.9,
        diversityIndex: 0.75,
        communityEngagement: 0.7,
        laborStandards: 0.95,
        // Governance metrics
        boardIndependence: 0.6,
        executiveCompensation: 0.8,
        auditQuality: 0.9,
        riskManagement: 0.85,
        transparency: 0.88,
        certifications: ['ISO14001', 'SA8000', 'OHSAS18001']
      };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const result = await service.calculateESGScore(supplierId);

      expect(result).toBeDefined();
      expect(result.supplierId).toBe(supplierId);
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);

      expect(result.environmentalScore).toBeGreaterThan(0);
      expect(result.socialScore).toBeGreaterThan(0);
      expect(result.governanceScore).toBeGreaterThan(0);

      expect(result.breakdown.environmental.carbonManagement).toBeDefined();
      expect(result.breakdown.environmental.resourceEfficiency).toBeDefined();
      expect(result.breakdown.social.employeeWelfare).toBeDefined();
      expect(result.breakdown.social.communityImpact).toBeDefined();
      expect(result.breakdown.governance.boardStructure).toBeDefined();
      expect(result.breakdown.governance.riskManagement).toBeDefined();

      expect(result.certifications).toContain('ISO14001');
      expect(result.calculationDate).toBeInstanceOf(Date);
    });

    it('should weight ESG components correctly', async () => {
      const supplierId = 'supplier-123';
      const mockSupplier = {
        ...createTestSupplyChainNode(),
        // Perfect environmental scores
        carbonIntensity: 0,
        renewableEnergyUsage: 1,
        wasteRecyclingRate: 1,
        waterEfficiency: 1,
        // Poor social scores
        employeeSatisfaction: 0.3,
        safetyScore: 0.4,
        diversityIndex: 0.2,
        // Average governance scores
        boardIndependence: 0.5,
        auditQuality: 0.6,
        riskManagement: 0.5
      };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const result = await service.calculateESGScore(supplierId);

      // Environmental should be high, social low, governance medium
      expect(result.environmentalScore).toBeGreaterThan(80);
      expect(result.socialScore).toBeLessThan(50);
      expect(result.governanceScore).toBeGreaterThan(40);
      expect(result.governanceScore).toBeLessThan(70);
    });

    it('should identify improvement areas', async () => {
      const supplierId = 'supplier-123';
      const mockSupplier = {
        ...createTestSupplyChainNode(),
        carbonIntensity: 0.8, // Poor
        renewableEnergyUsage: 0.2, // Poor
        employeeSatisfaction: 0.4, // Poor
        safetyScore: 0.95, // Excellent
        boardIndependence: 0.3, // Poor
        transparency: 0.9 // Excellent
      };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const result = await service.calculateESGScore(supplierId);

      expect(result.improvementAreas).toContain('carbon_management');
      expect(result.improvementAreas).toContain('renewable_energy');
      expect(result.improvementAreas).toContain('employee_satisfaction');
      expect(result.improvementAreas).toContain('board_independence');

      expect(result.strengths).toContain('safety_management');
      expect(result.strengths).toContain('transparency');
    });

    it('should handle missing ESG data gracefully', async () => {
      const supplierId = 'supplier-123';
      const mockSupplier = {
        ...createTestSupplyChainNode(),
        // Only partial data available
        carbonIntensity: 0.5,
        safetyScore: 0.8,
        auditQuality: 0.7
        // Missing most other metrics
      };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const result = await service.calculateESGScore(supplierId);

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.dataCompleteness).toBeLessThan(1); // Incomplete data
      expect(result.confidence).toBeLessThan(0.8); // Lower confidence due to missing data
    });
  });

  describe('generateSustainabilityReport', () => {
    it('should generate comprehensive sustainability report', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          carbonFootprint: 1000,
          waterFootprint: 5000,
          wasteGeneration: { total: 500 },
          sustainabilityScore: 0.7
        }
      ];

      const mockProduct = {
        ...createTestProduct(),
        id: productId,
        sustainabilityTargets: {
          carbonReduction: 0.25, // 25% reduction target
          waterReduction: 0.15,
          wasteReduction: 0.30
        }
      };

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.generateSustainabilityReport(productId);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.executiveSummary).toBeDefined();
      expect(result.carbonFootprint).toBeDefined();
      expect(result.waterFootprint).toBeDefined();
      expect(result.wasteFootprint).toBeDefined();
      expect(result.esgAssessment).toBeDefined();
      expect(result.complianceStatus).toBeDefined();
      expect(result.improvementRoadmap).toBeDefined();
      expect(result.reportGenerated).toBeInstanceOf(Date);
    });

    it('should track progress against sustainability targets', async () => {
      const productId = 'prod-123';
      const mockNodes = [{ ...createTestSupplyChainNode(), carbonFootprint: 750 }];
      const mockProduct = {
        ...createTestProduct(),
        sustainabilityTargets: { carbonReduction: 0.25 },
        baselineMetrics: { carbonFootprint: 1000 }, // 25% reduction achieved
        targetYear: 2025
      };

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.generateSustainabilityReport(productId);

      expect(result.targetProgress.carbonReduction.achieved).toBeCloseTo(0.25, 2);
      expect(result.targetProgress.carbonReduction.onTrack).toBe(true);
    });

    it('should assess regulatory compliance', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          location: { country: 'EU', region: 'Europe' },
          regulations: ['EU_ETS', 'REACH', 'RoHS'],
          complianceStatus: {
            'EU_ETS': 'compliant',
            'REACH': 'non_compliant',
            'RoHS': 'pending'
          }
        }
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(createTestProduct() as any);

      const result = await service.generateSustainabilityReport(productId);

      expect(result.complianceStatus.overallCompliance).toBeLessThan(1);
      expect(result.complianceStatus.nonCompliantRegulations).toContain('REACH');
      expect(result.complianceStatus.pendingRegulations).toContain('RoHS');
    });

    it('should provide improvement roadmap with timeline', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          sustainabilityScore: 0.6, // Moderate score - room for improvement
          improvementPotential: {
            carbon: 0.3,
            water: 0.2,
            waste: 0.4
          }
        }
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(createTestProduct() as any);

      const result = await service.generateSustainabilityReport(productId);

      expect(result.improvementRoadmap).toBeDefined();
      expect(result.improvementRoadmap.shortTerm).toBeInstanceOf(Array);
      expect(result.improvementRoadmap.mediumTerm).toBeInstanceOf(Array);
      expect(result.improvementRoadmap.longTerm).toBeInstanceOf(Array);

      expect(result.improvementRoadmap.shortTerm.length).toBeGreaterThan(0);
      result.improvementRoadmap.shortTerm.forEach(action => {
        expect(action.timeline).toBeDefined();
        expect(action.expectedImpact).toBeDefined();
        expect(action.investmentRequired).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      const error = new Error('Database connection failed');
      supplyChainNodeRepository.find.mockRejectedValue(error);

      await expect(service.calculateCarbonFootprint('prod-123')).rejects.toThrow('Database connection failed');
      await expect(service.calculateWaterFootprint('prod-123')).rejects.toThrow('Database connection failed');
      await expect(service.calculateWasteFootprint('prod-123')).rejects.toThrow('Database connection failed');
    });

    it('should validate input parameters', async () => {
      await expect(service.calculateCarbonFootprint('')).rejects.toThrow();
      await expect(service.calculateESGScore(null as any)).rejects.toThrow();
      await expect(service.generateSustainabilityReport('')).rejects.toThrow();
    });

    it('should handle missing product data', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.calculateCarbonFootprint('non-existent'))
        .rejects.toThrow('Product not found');
      await expect(service.generateSustainabilityReport('non-existent'))
        .rejects.toThrow('Product not found');
    });

    it('should handle missing supplier data for ESG', async () => {
      supplyChainNodeRepository.findOne.mockResolvedValue(null);

      await expect(service.calculateESGScore('non-existent'))
        .rejects.toThrow('Supplier not found');
    });

    it('should handle invalid metric values', async () => {
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          energyConsumption: -100, // Invalid negative value
          waterConsumption: { blue: 'invalid' }, // Invalid data type
          wasteRecyclingRate: 1.5 // Invalid rate > 1
        }
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(createTestProduct() as any);

      const carbonResult = await service.calculateCarbonFootprint('prod-123');
      const waterResult = await service.calculateWaterFootprint('prod-123');

      // Service should handle invalid data gracefully
      expect(carbonResult.totalEmissions).toBeGreaterThanOrEqual(0);
      expect(waterResult.totalWaterFootprint).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large supply chain sustainability analysis efficiently', async () => {
      const productId = 'prod-large';
      const largeNodeSet = Array.from({ length: 200 }, (_, i) => ({
        ...createTestSupplyChainNode(),
        id: `node-${i}`,
        energyConsumption: Math.random() * 1000,
        waterConsumption: {
          blue: Math.random() * 500,
          green: Math.random() * 1000,
          grey: Math.random() * 200
        },
        wasteGeneration: {
          hazardous: Math.random() * 50,
          nonHazardous: Math.random() * 300,
          recyclable: Math.random() * 200,
          organic: Math.random() * 100
        }
      }));

      supplyChainNodeRepository.find.mockResolvedValue(largeNodeSet as any);
      productRepository.findOne.mockResolvedValue(createTestProduct() as any);

      const startTime = Date.now();
      const carbonResult = await service.calculateCarbonFootprint(productId);
      const waterResult = await service.calculateWaterFootprint(productId);
      const wasteResult = await service.calculateWasteFootprint(productId);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(carbonResult.nodeContributions).toHaveLength(200);
      expect(waterResult.nodeContributions).toHaveLength(200);
      expect(wasteResult.nodeContributions).toHaveLength(200);
    });

    it('should handle concurrent sustainability calculations', async () => {
      const productIds = ['prod-1', 'prod-2', 'prod-3'];
      const mockNodes = [{ ...createTestSupplyChainNode() }];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);
      productRepository.findOne.mockResolvedValue(createTestProduct() as any);

      const promises = productIds.map(id => service.generateSustainabilityReport(id));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.productId).toBe(productIds[index]);
      });
    });
  });
});