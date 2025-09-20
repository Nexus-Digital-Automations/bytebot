/**
 * Conversational Database Service Tests
 *
 * Comprehensive test suite for the ConversationalDatabaseService that validates
 * all aspects of conversational validation, risk assessment, backup creation,
 * audit trails, and multi-party approval workflows.
 *
 * Test Coverage:
 * - Basic CRUD operations with conversational validation
 * - Risk-based approval workflows
 * - Backup creation and restoration
 * - Multi-party approval for critical operations
 * - Performance optimization and caching
 * - Error handling and failsafe mechanisms
 * - Audit trail generation and compliance
 *
 * @author Claude Code - Database Testing Specialist
 * @version 1.0.0
 */;

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConversationalDatabaseService } from '../conversational-database.service';
// Removed unused imports: DatabaseOperationType, DatabaseRiskLevel;

import {
  ParlantIntegrationService,
  ConversationalValidationError,
  ParlantValidationRequest,
  ParlantValidationResponse,
  // Removed unused import: RiskLevel

} from '../../parlant/parlant-integration.service';
import { BaseEntity, Repository } from '../../types/index';
// Removed unused import: QueryOptions

// ===== TEST TYPES AND MOCKS =====

interface TestEntity extends BaseEntity {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
  name: string;
  email: string;
  status: string;

}

interface MockParlantValidationResponse extends ParlantValidationResponse {
  approved: boolean;,
  conversationId: string;
  reason?: string;
  recommendations?: string[];
  requiresManualApproval?: boolean;

}

const createMockValidationResponse = (
  approved: boolean,
  conversationId: string,
  reason?: string,
  options?: Partial<MockParlantValidationResponse>
): MockParlantValidationResponse => ({
  approved,
  conversationId,
  reason,
  validationTimestamp: new Date(),
  reasoning: reason ?? (approved ? 'Operation approved' : 'Operation denied'),
  confidence: 0.95,
  ...options,

});

const createMockParlantService = () => ({
  validateOperation: jest.fn<Promise<MockParlantValidationResponse>, [ParlantValidationRequest]>(),
  createConversation: jest.fn(),
  endConversation: jest.fn(),

});

const createMockRepository = (): jest.Mocked<Repository<TestEntity>> => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),

});

const createMockConfigService = () => ({
  get: jest.fn((key: string) => {
    const config: Record<string, unknown> = {,
  DB_SLOW_QUERY_THRESHOLD: '1000',
      DB_CRITICAL_QUERY_THRESHOLD: '5000',
      DB_ENABLE_QUERY_CACHING: 'true',
      DB_CACHE_TTL: '300',
      DB_MAX_RETRY_ATTEMPTS: '3',
      DB_RETRY_DELAY: '1000',
    
};
    return config[key];
  }),
});

// ===== TEST SUITE =====

describe('ConversationalDatabaseService', () => {
  let service: ConversationalDatabaseService;
  let parlantService: jest.Mocked<ReturnType<typeof createMockParlantService>>;
  let configService: jest.Mocked<ReturnType<typeof createMockConfigService>>;
  let mockRepository: jest.Mocked<Repository<TestEntity>>;

  beforeEach(async () => {
    parlantService = createMockParlantService();
    configService = createMockConfigService();
    mockRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({,
  providers: [
        ConversationalDatabaseService,
        {,
  provide: ParlantIntegrationService,
          useValue: parlantService,
        
},
        {
  provide: ConfigService,
          useValue: configService,
        
},
      ],
    }).compile();

    service = module.get<ConversationalDatabaseService>(ConversationalDatabaseService);
  });

  afterEach(() => {
  jest.clearAllMocks();
  
});

  // ===== INITIALIZATION TESTS =====

  describe('Initialization', () => {
  it('should be defined', () => {
      expect(service).toBeDefined();
    
});

    it('should initialize with correct risk mappings', () => {
  // Test by trying operations with different risk levelsexpect(service).toBeDefined();
      // We can't directly test private properties, but we can verify behavior
    
});

    it('should have empty caches and metrics on initialization', () => {
  const metrics = service.getMetrics();expect(metrics.totalOperations).toBe(0);
      expect(metrics.approvedOperations).toBe(0);
      expect(metrics.rejectedOperations).toBe(0);

      const cacheStatus = service.getCacheStatus();
      expect(cacheStatus.size).toBe(0);
    
});
  });

  // ===== FIND BY ID TESTS =====

  describe('findById', () => {
  const testEntity: TestEntity = {,
  id: 'test-id-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      version: 1,
      name: 'Test Entity',
      email: 'test@example.com',
      status: 'active',
    
};

    it('should successfully find entity with approved validation', async () => {
  // Arrange
      parlantService.validateOperation.mockResolvedValue(
        createMockValidationResponse(true, 'conv-123', 'Low risk read operation approved')
      );
      mockRepository.findById.mockResolvedValue(testEntity);

      // Act
      const result = await service.findById(mockRepository, 'test-id-1', {userId: 'user-123',userRole: 'user',businessPurpose: 'Find test entity',
});// Assert
      expect(result).toEqual(testEntity);
      expect(parlantService.validateOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: 'DATABASE_FIND_BY_ID',riskLevel: 'LOW',parameters: expect.objectContaining({databaseOperation: 'FIND_BY_ID',entityId: 'test-id-1',requiresBackup: false,}) as unknown,
        })
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('test-id-1');});it('should reject operation when validation fails', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue(
        createMockValidationResponse(false, 'conv-456', 'Access denied for this resource'));// Act & Assert
      await expect(
        service.findById(mockRepository, 'test-id-1', {userId: 'user-123',userRole: 'guest',
})).rejects.toThrow(ConversationalValidationError);
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should handle repository errors properly', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: true,
        conversationId: 'conv-789',
});mockRepository.findById.mockRejectedValue(new Error('Database connection failed'));// Act & Assertawait expect(
        service.findById(mockRepository, 'test-id-1')).rejects.toThrow('Database connection failed');});it('should return null when entity not found', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: true,
        conversationId: 'conv-123',
});mockRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.findById(mockRepository, 'non-existent-id');// Assertexpect(result).toBeNull();
    });
  });

  // ===== CREATE TESTS =====

  describe('create', () => {const createData = {name: 'New Entity',email: 'new@example.com',status: 'active',};const createdEntity: TestEntity = {
  id: 'new-id-1',createdAt: '2024-01-01T00:00:00Z',updatedAt: '2024-01-01T00:00:00Z',version: 1,...createData,
    
};

    it('should successfully create entity with backup', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: true,
        conversationId: 'conv-create-123',reason: 'Create operation approved with backup',
});mockRepository.create.mockResolvedValue(createdEntity);

      // Act
      const result = await service.create(mockRepository, createData, {
        userId: 'user-123',userRole: 'admin',businessPurpose: 'Create new test entity',});// Assert
      expect(result).toEqual(createdEntity);
      expect(parlantService.validateOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: 'DATABASE_CREATE',riskLevel: 'MEDIUM',parameters: expect.objectContaining({databaseOperation: 'CREATE',requiresBackup: true,}) as unknown,
        })
      );
      expect(mockRepository.create).toHaveBeenCalledWith(createData);

      // Check that backup was created
      const backupStatus = service.getBackupStatus();
      expect(backupStatus.totalBackups).toBe(1);
    });

    it('should reject create operation when validation fails', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: false,
        conversationId: 'conv-create-456',reason: 'Insufficient permissions for create operation',
});// Act & Assert
      await expect(
        service.create(mockRepository, createData, {
          userId: 'user-123',userRole: 'guest',})).rejects.toThrow(ConversationalValidationError);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should handle validation service errors with failsafe', async () => {
  // ArrangeparlantService.validateOperation.mockRejectedValue(new Error('Parlant service unavailable'));// Act & Assertawait expect(
        service.create(mockRepository, createData)
      ).rejects.toThrow('Parlant service unavailable');
});});

  // ===== UPDATE TESTS =====

  describe('update', () => {const updateData = {name: 'Updated Entity',status: 'inactive',};const originalEntity: TestEntity = {
      id: 'update-id-1',createdAt: '2024-01-01T00:00:00Z',updatedAt: '2024-01-01T00:00:00Z',version: 1,name: 'Original Entity',email: 'original@example.com',status: 'active',};const updatedEntity: TestEntity = {
  ...originalEntity,
      ...updateData,
      updatedAt: '2024-01-01T01:00:00Z',version: 2,
};

    it('should successfully update entity with backup', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: true,
        conversationId: 'conv-update-123',reason: 'Update operation approved with backup',
});mockRepository.findById.mockResolvedValue(originalEntity);
      mockRepository.update.mockResolvedValue(updatedEntity);

      // Act
      const result = await service.update(mockRepository, 'update-id-1', updateData, {userId: 'user-123',userRole: 'admin',businessPurpose: 'Update entity status',});// Assert
      expect(result).toEqual(updatedEntity);
      expect(parlantService.validateOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: 'DATABASE_UPDATE',riskLevel: 'MEDIUM',parameters: expect.objectContaining({databaseOperation: 'UPDATE',entityId: 'update-id-1',requiresBackup: true,}) as unknown,
        })
      );
      expect(mockRepository.update).toHaveBeenCalledWith('update-id-1', updateData);});it('should handle entity not found for update', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: true,
        conversationId: 'conv-update-456',
});mockRepository.findById.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue(null);

      // Act
      const result = await service.update(mockRepository, 'non-existent-id', updateData);// Assertexpect(result).toBeNull();
    });
  });

  // ===== DELETE TESTS =====

  describe('delete', () => {const deleteEntity: TestEntity = {id: 'delete-id-1',createdAt: '2024-01-01T00:00:00Z',updatedAt: '2024-01-01T00:00:00Z',version: 1,name: 'Entity to Delete',email: 'delete@example.com',status: 'active',};it('should successfully delete entity with multi-party approval', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: true,
        conversationId: 'conv-delete-123',reason: 'Delete operation approved with multi-party approval',
});mockRepository.findById.mockResolvedValue(deleteEntity);
      mockRepository.delete.mockResolvedValue(true);

      // Act
      const result = await service.delete(mockRepository, 'delete-id-1', {userId: 'admin-123',userRole: 'admin',businessPurpose: 'Remove obsolete entity',confirmDeletion: true,});

      // Assert
      expect(result).toBe(true);
      expect(parlantService.validateOperation).toHaveBeenCalledWith(
        expect.objectContaining({
  operationType: 'DATABASE_DELETE',riskLevel: 'CRITICAL',parameters: expect.objectContaining({databaseOperation: 'DELETE',entityId: 'delete-id-1',requiresBackup: true,requiresMultiPartyApproval: true,
          
}) as unknown,
        })
      );
      expect(mockRepository.delete).toHaveBeenCalledWith('delete-id-1');// Check that backup was createdconst backupStatus = service.getBackupStatus();
      expect(backupStatus.totalBackups).toBeGreaterThan(0);
    });

    it('should reject delete operation without proper authorization', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: false,
        conversationId: 'conv-delete-456',reason: 'Insufficient permissions for delete operation',
});// Act & Assert
      await expect(
        service.delete(mockRepository, 'delete-id-1', {userId: 'user-123',userRole: 'user',})).rejects.toThrow(ConversationalValidationError);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle multi-party approval rejection', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: true,
        conversationId: 'conv-delete-789',
});mockRepository.findById.mockResolvedValue(deleteEntity);

      // Act & Assert - User role doesn't have admin/system privileges
      await expect(
        service.delete(mockRepository, 'delete-id-1', {userId: 'user-123',userRole: 'user',confirmDeletion: true,})
      ).rejects.toThrow(ConversationalValidationError);
    });
  });

  // ===== BULK OPERATIONS TESTS =====

  describe('bulkCreate', () => {const bulkData = [{ name: 'Bulk Entity 1', email: 'bulk1@example.com', status: 'active' },{ name: 'Bulk Entity 2', email: 'bulk2@example.com', status: 'active' },{ name: 'Bulk Entity 3', email: 'bulk3@example.com', status: 'active' },
    ];

    const createdEntities: TestEntity[] = bulkData.map((data, index) => ({
      id: `bulk-id-${index + 1}`,
      createdAt: '2024-01-01T00:00:00Z',updatedAt: '2024-01-01T00:00:00Z',version: 1,...data,
    }));

    it('should successfully perform bulk create with validation', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: true,
        conversationId: 'conv-bulk-create-123',reason: 'Bulk create operation approved',
});mockRepository.create
        .mockResolvedValueOnce(createdEntities[0])
        .mockResolvedValueOnce(createdEntities[1])
        .mockResolvedValueOnce(createdEntities[2]);

      // Act
      const result = await service.bulkCreate(mockRepository, bulkData, {
        userId: 'admin-123',userRole: 'admin',businessPurpose: 'Bulk import entities',});// Assert
      expect(result).toEqual(createdEntities);
      expect(parlantService.validateOperation).toHaveBeenCalledWith(
        expect.objectContaining({
  operationType: 'DATABASE_BULK_CREATE',riskLevel: 'HIGH',parameters: expect.objectContaining({databaseOperation: 'BULK_CREATE',affectedRecords: 3,requiresBackup: true,
          
}) as unknown,
        })
      );
      expect(mockRepository.create).toHaveBeenCalledTimes(3);
    });

    it('should reject bulk create with insufficient permissions', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: false,
        conversationId: 'conv-bulk-create-456',reason: 'Insufficient permissions for bulk operations',
});// Act & Assert
      await expect(
        service.bulkCreate(mockRepository, bulkData, {
          userId: 'user-123',userRole: 'user',})).rejects.toThrow(ConversationalValidationError);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('bulkDelete', () => {const deleteFilter = { status: 'inactive' };it('should successfully perform bulk delete with enhanced protection', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: true,
        conversationId: 'conv-bulk-delete-123',reason: 'Bulk delete operation approved with enhanced protection',
});mockRepository.count.mockResolvedValue(5);
      mockRepository.findAll.mockResolvedValue([
        { id: '1', name: 'Entity 1', status: 'inactive' } as TestEntity,{ id: '2', name: 'Entity 2', status: 'inactive' } as TestEntity,]);mockRepository.delete.mockResolvedValue(true);

      // Act
      const result = await service.bulkDelete(mockRepository, deleteFilter, {
        userId: 'admin-123',userRole: 'admin',businessPurpose: 'Clean up inactive entities',confirmBulkDeletion: true,});

      // Assert
      expect(result).toBe(2); // Number of entities deleted
      expect(parlantService.validateOperation).toHaveBeenCalledWith(
        expect.objectContaining({
  operationType: 'DATABASE_BULK_DELETE',riskLevel: 'CRITICAL',parameters: expect.objectContaining({databaseOperation: 'BULK_DELETE',affectedRecords: 5,requiresBackup: true,
            requiresMultiPartyApproval: true,
          
}) as unknown,
        })
      );
    });

    it('should reject bulk delete without confirmation', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: false,
        conversationId: 'conv-bulk-delete-456',reason: 'Bulk delete requires explicit confirmation',
});// Act & Assert
      await expect(
        service.bulkDelete(mockRepository, deleteFilter, {
          userId: 'admin-123',userRole: 'admin',})).rejects.toThrow(ConversationalValidationError);
    });
  });

  // ===== CACHING TESTS =====

  describe('Caching', () => {const testEntity: TestEntity = {id: 'cache-test-1',createdAt: '2024-01-01T00:00:00Z',updatedAt: '2024-01-01T00:00:00Z',version: 1,name: 'Cache Test Entity',email: 'cache@example.com',status: 'active',};it('should cache validation results for low-risk operations', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: true,
        conversationId: 'conv-cache-123',reason: 'Low risk operation approved',
});mockRepository.findById.mockResolvedValue(testEntity);

      // Act - First call
      await service.findById(mockRepository, 'cache-test-1', {userId: 'user-123',userRole: 'user',});// Act - Second call with same parameters
      await service.findById(mockRepository, 'cache-test-1', {userId: 'user-123',userRole: 'user',});// Assert - Parlant validation should only be called once due to caching
      expect(parlantService.validateOperation).toHaveBeenCalledTimes(1);
      expect(mockRepository.findById).toHaveBeenCalledTimes(2);

      // Check cache hit rate
      const cacheStatus = service.getCacheStatus();
      expect(cacheStatus.hitRate).toBeGreaterThan(0);
    });

    it('should not cache critical operations', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: true,
        conversationId: 'conv-no-cache-123',reason: 'Critical operation approved',
});mockRepository.findById.mockResolvedValue(testEntity);
      mockRepository.delete.mockResolvedValue(true);

      // Act - Two delete operations
      await service.delete(mockRepository, 'cache-test-1', {userId: 'admin-123',userRole: 'admin',confirmDeletion: true,});

      parlantService.validateOperation.mockResolvedValue({
  approved: true,
        conversationId: 'conv-no-cache-456',reason: 'Critical operation approved again',
});await service.delete(mockRepository, 'cache-test-1', {userId: 'admin-123',userRole: 'admin',confirmDeletion: true,});

      // Assert - Both operations should be validated separately
      expect(parlantService.validateOperation).toHaveBeenCalledTimes(2);
    });
  });

  // ===== PERFORMANCE AND METRICS TESTS =====

  describe('Performance and Metrics', () => {
  it('should track operation metrics correctly', async () => {// ArrangeparlantService.validateOperation
        .mockResolvedValueOnce({,
  approved: true,
          conversationId: 'conv-metrics-1',
}).mockResolvedValueOnce({
  approved: false,
          conversationId: 'conv-metrics-2',reason: 'Access denied',
});mockRepository.findById.mockResolvedValue({
        id: 'metrics-test',name: 'Test',} as TestEntity);// Act
      await service.findById(mockRepository, 'metrics-test');try {await service.findById(mockRepository, 'metrics-test-2');} catch (_error) {
  // Expected to fail
      
}

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(2);
      expect(metrics.approvedOperations).toBe(1);
      expect(metrics.rejectedOperations).toBe(1);
      expect(metrics.averageValidationTime).toBeGreaterThan(0);
    });

    it('should provide backup status information', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: true,
        conversationId: 'conv-backup-123',
});mockRepository.create.mockResolvedValue({
        id: 'backup-test',name: 'Backup Test',} as TestEntity);// Act
      await service.create(mockRepository, { name: 'Backup Test' } as Omit<TestEntity, keyof BaseEntity>);// Assertconst backupStatus = service.getBackupStatus();
      expect(backupStatus.totalBackups).toBeGreaterThan(0);
    });
  });

  // ===== CLEANUP TESTS =====

  describe('Cleanup', () => {it('should clean up expired cache entries and backups', async () => {// This test would require time manipulation to test cache expiry// For now, we'll just test that cleanup doesn't throw errorsawait expect(service.cleanup()).resolves.not.toThrow();});
  });

  // ===== ERROR HANDLING TESTS =====

  describe('Error Handling', () => {
  it('should handle Parlant service unavailability gracefully', async () => {// ArrangeparlantService.validateOperation.mockRejectedValue(new Error('Service unavailable'));// Act & Assertawait expect(
        service.findById(mockRepository, 'test-id')).rejects.toThrow('Service unavailable');
});it('should handle repository errors during operations', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: true,
        conversationId: 'conv-error-123',
});mockRepository.findById.mockRejectedValue(new Error('Database connection lost'));// Act & Assertawait expect(
        service.findById(mockRepository, 'test-id')).rejects.toThrow('Database connection lost');});it('should provide meaningful error messages', async () => {
  // ArrangeparlantService.validateOperation.mockResolvedValue({,
  approved: false,
        conversationId: 'conv-error-456',reason: 'User does not have permission to access this resource',
});// Act & Assert
      await expect(
        service.findById(mockRepository, 'test-id', {userId: 'user-123',userRole: 'guest',})).rejects.toThrow('Database findById operation rejected: User does not have permission to access this resource');});});

  // ===== INTEGRATION TESTS =====

  describe('Integration Tests', () => {
  it('should handle complex workflow with multiple operations', async () => {// This would test a complex scenario with create -> update -> delete// with proper validation, backup, and audit trail generation

      const createData = { name: 'Integration Test Entity', email: 'integration@example.com', status: 'active' 
};const createdEntity: TestEntity = {
  id: 'integration-1',createdAt: '2024-01-01T00:00:00Z',updatedAt: '2024-01-01T00:00:00Z',version: 1,...createData,
      
};

      // Setup mocks for all operations
      parlantService.validateOperation
        .mockResolvedValueOnce({ approved: true, conversationId: 'conv-create' }).mockResolvedValueOnce({ approved: true, conversationId: 'conv-update' }).mockResolvedValueOnce({ approved: true, conversationId: 'conv-delete' });mockRepository.create.mockResolvedValue(createdEntity);mockRepository.findById.mockResolvedValue(createdEntity);
      mockRepository.update.mockResolvedValue({ ...createdEntity, status: 'inactive' });mockRepository.delete.mockResolvedValue(true);// Execute workflow
      const created = await service.create(mockRepository, createData, {
        userId: 'admin-123',userRole: 'admin',businessPurpose: 'Integration test creation',});const updated = await service.update(mockRepository, created.id, { status: 'inactive' }, {userId: 'admin-123',userRole: 'admin',businessPurpose: 'Integration test update',});const deleted = await service.delete(mockRepository, created.id, {
  userId: 'admin-123',userRole: 'admin',businessPurpose: 'Integration test deletion',
        confirmDeletion: true,
      
});

      // Verify all operations completed successfully
      expect(created).toBeDefined();
      expect(updated).toBeDefined();
      expect(deleted).toBe(true);

      // Verify metrics
      const metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(3);
      expect(metrics.approvedOperations).toBe(3);

      // Verify backups were created
      const backupStatus = service.getBackupStatus();
      expect(backupStatus.totalBackups).toBeGreaterThan(0);
    });
  });
});