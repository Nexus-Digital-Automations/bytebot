import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DemandForecastingService } from '../../src/services/demand-forecasting.service';
import { DemandForecastEntity, ProductEntity, SupplyChainNodeEntity } from '../../../supply-chain-analytics/src/models/supply-chain.entity';
import {
  ForecastModel,
  DemandForecast,
  ForecastAccuracy,
  SeasonalityAnalysis,
  TrendAnalysis,
  ForecastConfidence
} from '../../src/interfaces/demand-forecasting.interface';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs-node', () => ({
  sequential: jest.fn(() => ({
    add: jest.fn(),
    compile: jest.fn(),
    fit: jest.fn(() => Promise.resolve({ history: { loss: [0.1, 0.05], val_loss: [0.12, 0.08] } })),
    predict: jest.fn(() => ({
      dataSync: jest.fn(() => [100, 105, 110, 108])
    })),
    save: jest.fn(() => Promise.resolve()),
    summary: jest.fn()
  })),
  layers: {
    dense: jest.fn(() => ({ name: 'dense' })),
    lstm: jest.fn(() => ({ name: 'lstm' })),
    dropout: jest.fn(() => ({ name: 'dropout' }))
  },
  tensor2d: jest.fn((data) => ({
    shape: [data.length, data[0]?.length || 1],
    dataSync: jest.fn(() => data.flat()),
    dispose: jest.fn()
  })),
  tensor1d: jest.fn((data) => ({
    shape: [data.length],
    dataSync: jest.fn(() => data),
    dispose: jest.fn()
  })),
  train: {
    adam: jest.fn(() => ({ name: 'adam' }))
  },
  losses: {
    meanSquaredError: 'meanSquaredError'
  },
  metrics: {
    meanAbsoluteError: 'meanAbsoluteError'
  }
}));

describe('DemandForecastingService', () => {
  let service: DemandForecastingService;
  let demandForecastRepository: jest.Mocked<Repository<DemandForecastEntity>>;
  let productRepository: jest.Mocked<Repository<ProductEntity>>;
  let supplyChainNodeRepository: jest.Mocked<Repository<SupplyChainNodeEntity>>;

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

  const createTestDemandData = () => ({
    id: 'demand-123',
    productId: 'prod-123',
    date: new Date('2024-01-01'),
    actualDemand: 100,
    forecastedDemand: 95,
    season: 'Q1',
    region: 'North America',
    channel: 'retail'
  });

  const createTestProduct = () => ({
    id: 'prod-123',
    name: 'Test Product',
    category: 'electronics',
    seasonalityFactor: 1.2,
    trendFactor: 1.05,
    baselineDemand: 1000
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemandForecastingService,
        {
          provide: getRepositoryToken(DemandForecastEntity),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(SupplyChainNodeEntity),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<DemandForecastingService>(DemandForecastingService);
    demandForecastRepository = module.get(getRepositoryToken(DemandForecastEntity));
    productRepository = module.get(getRepositoryToken(ProductEntity));
    supplyChainNodeRepository = module.get(getRepositoryToken(SupplyChainNodeEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateForecast', () => {
    it('should generate demand forecast using LSTM model', async () => {
      const productId = 'prod-123';
      const forecastHorizon = 12; // 12 periods
      const mockHistoricalData = Array.from({ length: 52 }, (_, i) => ({
        ...createTestDemandData(),
        date: new Date(2023, 0, i * 7), // Weekly data
        actualDemand: 100 + Math.sin(i * 0.1) * 20 + Math.random() * 10
      }));

      const mockProduct = createTestProduct();

      demandForecastRepository.find.mockResolvedValue(mockHistoricalData as any);
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.generateForecast(productId, {
        model: 'lstm',
        horizon: forecastHorizon,
        includeConfidenceIntervals: true,
        includeSeasonality: true
      });

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.model).toBe('lstm');
      expect(result.horizon).toBe(forecastHorizon);
      expect(result.forecasts).toHaveLength(forecastHorizon);
      expect(result.accuracy).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.seasonalityDetected).toBeTruthy();
      expect(result.trendDetected).toBeTruthy();
      expect(result.generatedAt).toBeInstanceOf(Date);

      // Check forecast structure
      result.forecasts.forEach(forecast => {
        expect(forecast.period).toBeDefined();
        expect(forecast.predictedDemand).toBeGreaterThan(0);
        expect(forecast.lowerBound).toBeDefined();
        expect(forecast.upperBound).toBeDefined();
        expect(forecast.confidence).toBeGreaterThan(0);
        expect(forecast.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should generate forecast using ARIMA model', async () => {
      const productId = 'prod-123';
      const mockHistoricalData = Array.from({ length: 100 }, (_, i) => ({
        ...createTestDemandData(),
        date: new Date(2023, 0, i),
        actualDemand: 100 + i * 0.5 + Math.sin(i * 0.05) * 10 // Trend + seasonality
      }));

      demandForecastRepository.find.mockResolvedValue(mockHistoricalData as any);
      productRepository.findOne.mockResolvedValue(createTestProduct() as any);

      const result = await service.generateForecast(productId, {
        model: 'arima',
        horizon: 30,
        arimaParams: { p: 2, d: 1, q: 2 }
      });

      expect(result.model).toBe('arima');
      expect(result.modelParams.arimaParams).toEqual({ p: 2, d: 1, q: 2 });
      expect(result.forecasts).toHaveLength(30);
    });

    it('should generate forecast using exponential smoothing', async () => {
      const productId = 'prod-123';
      const mockHistoricalData = Array.from({ length: 50 }, (_, i) => ({
        ...createTestDemandData(),
        actualDemand: 100 + Math.random() * 20
      }));

      demandForecastRepository.find.mockResolvedValue(mockHistoricalData as any);
      productRepository.findOne.mockResolvedValue(createTestProduct() as any);

      const result = await service.generateForecast(productId, {
        model: 'exponential_smoothing',
        horizon: 10,
        alpha: 0.3,
        beta: 0.1,
        gamma: 0.05
      });

      expect(result.model).toBe('exponential_smoothing');
      expect(result.modelParams.alpha).toBe(0.3);
      expect(result.modelParams.beta).toBe(0.1);
      expect(result.modelParams.gamma).toBe(0.05);
    });

    it('should handle ensemble forecasting', async () => {
      const productId = 'prod-123';
      const mockHistoricalData = Array.from({ length: 100 }, (_, i) => ({
        ...createTestDemandData(),
        actualDemand: 100 + Math.random() * 30
      }));

      demandForecastRepository.find.mockResolvedValue(mockHistoricalData as any);
      productRepository.findOne.mockResolvedValue(createTestProduct() as any);

      const result = await service.generateForecast(productId, {
        model: 'ensemble',
        horizon: 15,
        ensembleModels: ['lstm', 'arima', 'exponential_smoothing'],
        ensembleWeights: [0.5, 0.3, 0.2]
      });

      expect(result.model).toBe('ensemble');
      expect(result.ensembleDetails).toBeDefined();
      expect(result.ensembleDetails?.models).toContain('lstm');
      expect(result.ensembleDetails?.models).toContain('arima');
      expect(result.ensembleDetails?.models).toContain('exponential_smoothing');
    });

    it('should detect and handle seasonality patterns', async () => {
      const productId = 'prod-123';
      // Create data with strong weekly seasonality
      const mockHistoricalData = Array.from({ length: 84 }, (_, i) => ({
        ...createTestDemandData(),
        date: new Date(2023, 0, i),
        actualDemand: 100 + Math.sin((i % 7) * Math.PI / 3.5) * 30 // Weekly pattern
      }));

      demandForecastRepository.find.mockResolvedValue(mockHistoricalData as any);
      productRepository.findOne.mockResolvedValue(createTestProduct() as any);

      const result = await service.generateForecast(productId, {
        model: 'lstm',
        horizon: 14,
        includeSeasonality: true
      });

      expect(result.seasonalityDetected).toBeTruthy();
      expect(result.seasonalityPattern).toBeDefined();
      expect(result.seasonalityPattern?.period).toBe(7); // Weekly pattern
      expect(result.seasonalityPattern?.strength).toBeGreaterThan(0.5);
    });

    it('should handle insufficient historical data', async () => {
      const productId = 'prod-123';
      const mockHistoricalData = Array.from({ length: 5 }, (_, i) => ({
        ...createTestDemandData(),
        actualDemand: 100 + i
      })); // Very limited data

      demandForecastRepository.find.mockResolvedValue(mockHistoricalData as any);
      productRepository.findOne.mockResolvedValue(createTestProduct() as any);

      const result = await service.generateForecast(productId, {
        model: 'lstm',
        horizon: 10
      });

      expect(result.dataQuality.sufficientData).toBeFalsy();
      expect(result.confidence.overall).toBeLessThan(0.5); // Low confidence
      expect(result.warnings).toContain('Insufficient historical data');
    });
  });

  describe('trainModel', () => {
    it('should train LSTM model with proper architecture', async () => {
      const productId = 'prod-123';
      const mockTrainingData = Array.from({ length: 200 }, (_, i) => ({
        ...createTestDemandData(),
        actualDemand: 100 + Math.sin(i * 0.1) * 20 + Math.random() * 10
      }));

      demandForecastRepository.find.mockResolvedValue(mockTrainingData as any);

      const result = await service.trainModel(productId, {
        model: 'lstm',
        epochs: 50,
        batchSize: 16,
        validationSplit: 0.2,
        lookbackWindow: 10
      });

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.model).toBe('lstm');
      expect(result.trainingAccuracy).toBeGreaterThan(0);
      expect(result.validationAccuracy).toBeGreaterThan(0);
      expect(result.trainingHistory).toBeDefined();
      expect(result.modelParameters).toBeDefined();
      expect(result.trainedAt).toBeInstanceOf(Date);
    });

    it('should handle model overfitting detection', async () => {
      const productId = 'prod-123';
      const mockTrainingData = Array.from({ length: 50 }, (_, i) => ({
        ...createTestDemandData(),
        actualDemand: 100 + Math.random() * 5 // Low variance data
      }));

      demandForecastRepository.find.mockResolvedValue(mockTrainingData as any);

      const result = await service.trainModel(productId, {
        model: 'lstm',
        epochs: 100,
        earlyStoppingPatience: 10,
        monitorOverfitting: true
      });

      expect(result.overfittingDetected).toBeDefined();
      expect(result.stoppedEarly).toBeDefined();
      if (result.overfittingDetected) {
        expect(result.warnings).toContain('overfitting');
      }
    });

    it('should optimize hyperparameters automatically', async () => {
      const productId = 'prod-123';
      const mockTrainingData = Array.from({ length: 100 }, (_, i) => ({
        ...createTestDemandData(),
        actualDemand: 100 + Math.random() * 20
      }));

      demandForecastRepository.find.mockResolvedValue(mockTrainingData as any);

      const result = await service.trainModel(productId, {
        model: 'lstm',
        optimizeHyperparameters: true,
        hyperparameterSearch: {
          lstmUnits: [32, 64, 128],
          learningRates: [0.001, 0.01, 0.1],
          dropoutRates: [0.1, 0.2, 0.3]
        }
      });

      expect(result.hyperparameterOptimization).toBeDefined();
      expect(result.hyperparameterOptimization?.bestParams).toBeDefined();
      expect(result.hyperparameterOptimization?.searchResults).toBeDefined();
    });
  });

  describe('evaluateAccuracy', () => {
    it('should evaluate forecast accuracy with multiple metrics', async () => {
      const productId = 'prod-123';
      const testPeriod = { startDate: new Date('2024-01-01'), endDate: new Date('2024-03-31') };

      const mockActualData = Array.from({ length: 90 }, (_, i) => ({
        ...createTestDemandData(),
        date: new Date(2024, 0, i + 1),
        actualDemand: 100 + Math.sin(i * 0.1) * 20 + Math.random() * 10
      }));

      const mockForecastData = mockActualData.map(actual => ({
        ...actual,
        forecastedDemand: actual.actualDemand + (Math.random() - 0.5) * 20 // Add forecast error
      }));

      demandForecastRepository.find
        .mockResolvedValueOnce(mockActualData as any) // Actual data
        .mockResolvedValueOnce(mockForecastData as any); // Forecast data

      const result = await service.evaluateAccuracy(productId, testPeriod);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.evaluationPeriod).toEqual(testPeriod);
      expect(result.metrics.mae).toBeGreaterThan(0); // Mean Absolute Error
      expect(result.metrics.mape).toBeGreaterThan(0); // Mean Absolute Percentage Error
      expect(result.metrics.rmse).toBeGreaterThan(0); // Root Mean Square Error
      expect(result.metrics.r2).toBeGreaterThan(-1); // R-squared
      expect(result.metrics.r2).toBeLessThanOrEqual(1);
      expect(result.overallAccuracy).toBeGreaterThan(0);
      expect(result.overallAccuracy).toBeLessThanOrEqual(1);
    });

    it('should analyze accuracy by time segments', async () => {
      const productId = 'prod-123';
      const testPeriod = { startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31') };

      const mockData = Array.from({ length: 365 }, (_, i) => ({
        ...createTestDemandData(),
        date: new Date(2024, 0, i + 1),
        actualDemand: 100 + (i % 30) * 2, // Monthly pattern
        forecastedDemand: 100 + (i % 30) * 2 + (Math.random() - 0.5) * 10
      }));

      demandForecastRepository.find.mockResolvedValue(mockData as any);

      const result = await service.evaluateAccuracy(productId, testPeriod, {
        segmentBy: ['month', 'quarter', 'season']
      });

      expect(result.segmentedAccuracy).toBeDefined();
      expect(result.segmentedAccuracy?.month).toBeDefined();
      expect(result.segmentedAccuracy?.quarter).toBeDefined();
      expect(result.segmentedAccuracy?.season).toBeDefined();
      expect(Object.keys(result.segmentedAccuracy.month)).toHaveLength(12);
    });

    it('should identify forecast bias and patterns', async () => {
      const productId = 'prod-123';
      const testPeriod = { startDate: new Date('2024-01-01'), endDate: new Date('2024-03-31') };

      // Create biased forecast data (consistently over-forecasting)
      const mockData = Array.from({ length: 90 }, (_, i) => ({
        ...createTestDemandData(),
        actualDemand: 100,
        forecastedDemand: 110 // 10% over-forecast bias
      }));

      demandForecastRepository.find.mockResolvedValue(mockData as any);

      const result = await service.evaluateAccuracy(productId, testPeriod);

      expect(result.bias).toBeDefined();
      expect(result.bias.direction).toBe('over_forecast');
      expect(result.bias.magnitude).toBeCloseTo(0.1, 1); // 10% bias
      expect(result.patterns.consistentBias).toBeTruthy();
    });

    it('should handle missing or incomplete data', async () => {
      const productId = 'prod-123';
      const testPeriod = { startDate: new Date('2024-01-01'), endDate: new Date('2024-03-31') };

      const mockData = Array.from({ length: 45 }, (_, i) => ({
        ...createTestDemandData(),
        date: new Date(2024, 0, i * 2 + 1), // Missing every other day
        actualDemand: 100,
        forecastedDemand: 95
      }));

      demandForecastRepository.find.mockResolvedValue(mockData as any);

      const result = await service.evaluateAccuracy(productId, testPeriod);

      expect(result.dataCompleteness).toBeLessThan(1); // Incomplete data
      expect(result.warnings).toContain('incomplete data');
      expect(result.adjustedMetrics).toBeDefined(); // Metrics adjusted for missing data
    });
  });

  describe('analyzeSeasonality', () => {
    it('should detect and analyze seasonal patterns', async () => {
      const productId = 'prod-123';
      // Create data with quarterly seasonality
      const mockData = Array.from({ length: 104 }, (_, i) => ({
        ...createTestDemandData(),
        date: new Date(2022, 0, i * 7), // Weekly data for 2 years
        actualDemand: 100 + Math.sin((i % 13) * Math.PI / 6.5) * 40 // Quarterly pattern
      }));

      demandForecastRepository.find.mockResolvedValue(mockData as any);

      const result = await service.analyzeSeasonality(productId);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.seasonalityDetected).toBeTruthy();
      expect(result.dominantPeriod).toBe(13); // Quarterly pattern in weeks
      expect(result.seasonalStrength).toBeGreaterThan(0.5);
      expect(result.seasonalIndices).toBeDefined();
      expect(result.peakSeasons).toBeDefined();
      expect(result.lowSeasons).toBeDefined();
    });

    it('should detect multiple seasonal patterns', async () => {
      const productId = 'prod-123';
      // Create data with both weekly and annual patterns
      const mockData = Array.from({ length: 365 }, (_, i) => ({
        ...createTestDemandData(),
        date: new Date(2023, 0, i + 1),
        actualDemand: 100 +
          Math.sin((i % 7) * Math.PI / 3.5) * 20 + // Weekly pattern
          Math.sin((i % 365) * Math.PI / 182.5) * 30 // Annual pattern
      }));

      demandForecastRepository.find.mockResolvedValue(mockData as any);

      const result = await service.analyzeSeasonality(productId);

      expect(result.multipleSeasonalities).toBeTruthy();
      expect(result.seasonalPeriods).toContain(7); // Weekly
      expect(result.seasonalPeriods).toContain(365); // Annual
    });

    it('should handle non-seasonal data', async () => {
      const productId = 'prod-123';
      // Create random data with no seasonal pattern
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        ...createTestDemandData(),
        actualDemand: 100 + Math.random() * 20
      }));

      demandForecastRepository.find.mockResolvedValue(mockData as any);

      const result = await service.analyzeSeasonality(productId);

      expect(result.seasonalityDetected).toBeFalsy();
      expect(result.seasonalStrength).toBeLessThan(0.3);
      expect(result.dominantPeriod).toBeNull();
    });
  });

  describe('detectTrends', () => {
    it('should detect upward trends', async () => {
      const productId = 'prod-123';
      const mockData = Array.from({ length: 52 }, (_, i) => ({
        ...createTestDemandData(),
        date: new Date(2023, 0, i * 7),
        actualDemand: 100 + i * 2 + Math.random() * 10 // Clear upward trend
      }));

      demandForecastRepository.find.mockResolvedValue(mockData as any);

      const result = await service.detectTrends(productId);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.trendDetected).toBeTruthy();
      expect(result.trendDirection).toBe('increasing');
      expect(result.trendStrength).toBeGreaterThan(0.5);
      expect(result.trendSlope).toBeGreaterThan(0);
      expect(result.changePoints).toBeDefined();
    });

    it('should detect downward trends', async () => {
      const productId = 'prod-123';
      const mockData = Array.from({ length: 52 }, (_, i) => ({
        ...createTestDemandData(),
        actualDemand: 200 - i * 1.5 + Math.random() * 5 // Downward trend
      }));

      demandForecastRepository.find.mockResolvedValue(mockData as any);

      const result = await service.detectTrends(productId);

      expect(result.trendDirection).toBe('decreasing');
      expect(result.trendSlope).toBeLessThan(0);
    });

    it('should detect trend change points', async () => {
      const productId = 'prod-123';
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        ...createTestDemandData(),
        actualDemand: i < 50 ? 100 + i : 150 - (i - 50) * 0.5 // Trend changes at midpoint
      }));

      demandForecastRepository.find.mockResolvedValue(mockData as any);

      const result = await service.detectTrends(productId);

      expect(result.changePoints).toHaveLength(1);
      expect(result.changePoints[0].index).toBeCloseTo(50, 5);
      expect(result.changePoints[0].significance).toBeGreaterThan(0.5);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      const error = new Error('Database connection failed');
      demandForecastRepository.find.mockRejectedValue(error);

      await expect(service.generateForecast('prod-123', { model: 'lstm', horizon: 10 }))
        .rejects.toThrow('Database connection failed');
    });

    it('should validate input parameters', async () => {
      await expect(service.generateForecast('', { model: 'lstm', horizon: 10 }))
        .rejects.toThrow();
      await expect(service.generateForecast('prod-123', { model: 'lstm', horizon: 0 }))
        .rejects.toThrow();
    });

    it('should handle missing product data', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.generateForecast('non-existent', { model: 'lstm', horizon: 10 }))
        .rejects.toThrow('Product not found');
    });

    it('should handle invalid model parameters', async () => {
      const mockData = [createTestDemandData()];
      demandForecastRepository.find.mockResolvedValue(mockData as any);
      productRepository.findOne.mockResolvedValue(createTestProduct() as any);

      const result = await service.generateForecast('prod-123', {
        model: 'arima',
        horizon: 10,
        arimaParams: { p: -1, d: 0, q: 0 } // Invalid parameters
      });

      expect(result.warnings).toContain('Invalid model parameters');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      const productId = 'prod-large';
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...createTestDemandData(),
        actualDemand: 100 + Math.random() * 50
      }));

      demandForecastRepository.find.mockResolvedValue(largeDataset as any);
      productRepository.findOne.mockResolvedValue(createTestProduct() as any);

      const startTime = Date.now();
      const result = await service.analyzeSeasonality(productId);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.productId).toBe(productId);
    });

    it('should handle concurrent forecast requests', async () => {
      const productIds = ['prod-1', 'prod-2', 'prod-3'];
      const mockData = [createTestDemandData()];

      demandForecastRepository.find.mockResolvedValue(mockData as any);
      productRepository.findOne.mockResolvedValue(createTestProduct() as any);

      const promises = productIds.map(id =>
        service.generateForecast(id, { model: 'exponential_smoothing', horizon: 5 })
      );
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.productId).toBe(productIds[index]);
      });
    });
  });
});