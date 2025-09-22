/**
 * Device Management Module
 * Handles device enrollment, registration, and lifecycle management
 *
 * Agent 3: Device Management Infrastructure & Enrollment System
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Device } from './entities/device.entity';
import { DeviceEnrollment } from './entities/device-enrollment.entity';
import { DeviceProfile } from './entities/device-profile.entity';
import { DeviceGroup } from './entities/device-group.entity';
import { DeviceActivity } from './entities/device-activity.entity';

// Controllers
import { DeviceController } from './controllers/device.controller';
import { DeviceEnrollmentController } from './controllers/device-enrollment.controller';
import { DeviceGroupController } from './controllers/device-group.controller';
import { DeviceMonitoringController } from './controllers/device-monitoring.controller';

// Services
import { DeviceService } from './services/device.service';
import { DeviceEnrollmentService } from './services/device-enrollment.service';
import { DeviceProfileService } from './services/device-profile.service';
import { DeviceGroupService } from './services/device-group.service';
import { DeviceMonitoringService } from './services/device-monitoring.service';
import { DeviceValidationService } from './services/device-validation.service';
import { DeviceProvisioningService } from './services/device-provisioning.service';

// Repositories
import { DeviceRepository } from './repositories/device.repository';
import { DeviceEnrollmentRepository } from './repositories/device-enrollment.repository';

// Guards and Interceptors
import { DeviceOwnershipGuard } from './guards/device-ownership.guard';
import { DeviceStatusGuard } from './guards/device-status.guard';
import { DeviceComplianceInterceptor } from './interceptors/device-compliance.interceptor';

/**
 * Device Management Module
 * Comprehensive device lifecycle management with enrollment, monitoring, and compliance
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Device,
      DeviceEnrollment,
      DeviceProfile,
      DeviceGroup,
      DeviceActivity
    ])
  ],
  controllers: [
    DeviceController,
    DeviceEnrollmentController,
    DeviceGroupController,
    DeviceMonitoringController
  ],
  providers: [
    // Core services
    DeviceService,
    DeviceEnrollmentService,
    DeviceProfileService,
    DeviceGroupService,
    DeviceMonitoringService,
    DeviceValidationService,
    DeviceProvisioningService,

    // Repositories
    DeviceRepository,
    DeviceEnrollmentRepository,

    // Security and compliance
    DeviceOwnershipGuard,
    DeviceStatusGuard,
    DeviceComplianceInterceptor
  ],
  exports: [
    DeviceService,
    DeviceEnrollmentService,
    DeviceProfileService,
    DeviceGroupService,
    DeviceMonitoringService
  ]
})
export class DeviceModule {}