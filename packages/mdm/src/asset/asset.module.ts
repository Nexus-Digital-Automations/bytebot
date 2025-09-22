/**
 * Asset Management Module
 * Handles device inventory, asset tracking, and lifecycle management
 *
 * Agent 7: Asset Tracking & Inventory Management System
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Asset } from './entities/asset.entity';
import { AssetCategory } from './entities/asset-category.entity';
import { AssetAssignment } from './entities/asset-assignment.entity';
import { AssetLifecycle } from './entities/asset-lifecycle.entity';
import { AssetMaintenance } from './entities/asset-maintenance.entity';
import { AssetWarranty } from './entities/asset-warranty.entity';
import { AssetDepreciation } from './entities/asset-depreciation.entity';

// Controllers
import { AssetController } from './controllers/asset.controller';
import { AssetInventoryController } from './controllers/asset-inventory.controller';
import { AssetLifecycleController } from './controllers/asset-lifecycle.controller';
import { AssetMaintenanceController } from './controllers/asset-maintenance.controller';
import { AssetReportingController } from './controllers/asset-reporting.controller';

// Services
import { AssetService } from './services/asset.service';
import { AssetInventoryService } from './services/asset-inventory.service';
import { AssetLifecycleService } from './services/asset-lifecycle.service';
import { AssetMaintenanceService } from './services/asset-maintenance.service';
import { AssetTrackingService } from './services/asset-tracking.service';
import { AssetReportingService } from './services/asset-reporting.service';
import { AssetValuationService } from './services/asset-valuation.service';
import { AssetComplianceService } from './services/asset-compliance.service';

// Repositories
import { AssetRepository } from './repositories/asset.repository';
import { AssetLifecycleRepository } from './repositories/asset-lifecycle.repository';

// Guards and Interceptors
import { AssetOwnershipGuard } from './guards/asset-ownership.guard';
import { AssetAccessGuard } from './guards/asset-access.guard';
import { AssetTrackingInterceptor } from './interceptors/asset-tracking.interceptor';

// Event Handlers
import { AssetEventHandler } from './handlers/asset-event.handler';
import { LifecycleEventHandler } from './handlers/lifecycle-event.handler';

/**
 * Asset Management Module
 * Comprehensive asset tracking and inventory management system
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Asset,
      AssetCategory,
      AssetAssignment,
      AssetLifecycle,
      AssetMaintenance,
      AssetWarranty,
      AssetDepreciation
    ])
  ],
  controllers: [
    AssetController,
    AssetInventoryController,
    AssetLifecycleController,
    AssetMaintenanceController,
    AssetReportingController
  ],
  providers: [
    // Core services
    AssetService,
    AssetInventoryService,
    AssetLifecycleService,
    AssetMaintenanceService,
    AssetTrackingService,
    AssetReportingService,
    AssetValuationService,
    AssetComplianceService,

    // Repositories
    AssetRepository,
    AssetLifecycleRepository,

    // Access control and tracking
    AssetOwnershipGuard,
    AssetAccessGuard,
    AssetTrackingInterceptor,

    // Event handlers
    AssetEventHandler,
    LifecycleEventHandler
  ],
  exports: [
    AssetService,
    AssetInventoryService,
    AssetLifecycleService,
    AssetTrackingService,
    AssetReportingService
  ]
})
export class AssetModule {}