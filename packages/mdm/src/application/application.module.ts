/**
 * Application Management Module
 * Handles enterprise app distribution, app store functionality, and application lifecycle
 *
 * Agent 5: Application Distribution & Enterprise App Store System
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Application } from './entities/application.entity';
import { ApplicationVersion } from './entities/application-version.entity';
import { ApplicationInstallation } from './entities/application-installation.entity';
import { ApplicationCategory } from './entities/application-category.entity';
import { ApplicationPermission } from './entities/application-permission.entity';
import { ApplicationReview } from './entities/application-review.entity';
import { ApplicationLicense } from './entities/application-license.entity';

// Controllers
import { ApplicationController } from './controllers/application.controller';
import { ApplicationStoreController } from './controllers/application-store.controller';
import { ApplicationInstallationController } from './controllers/application-installation.controller';
import { ApplicationCatalogController } from './controllers/application-catalog.controller';

// Services
import { ApplicationService } from './services/application.service';
import { ApplicationStoreService } from './services/application-store.service';
import { ApplicationInstallationService } from './services/application-installation.service';
import { ApplicationCatalogService } from './services/application-catalog.service';
import { ApplicationVersionService } from './services/application-version.service';
import { ApplicationValidationService } from './services/application-validation.service';
import { ApplicationSecurityService } from './services/application-security.service';
import { ApplicationLicenseService } from './services/application-license.service';
import { ApplicationDistributionService } from './services/application-distribution.service';

// Repositories
import { ApplicationRepository } from './repositories/application.repository';
import { ApplicationInstallationRepository } from './repositories/application-installation.repository';

// Guards and Interceptors
import { ApplicationAccessGuard } from './guards/application-access.guard';
import { ApplicationLicenseGuard } from './guards/application-license.guard';
import { ApplicationSecurityInterceptor } from './interceptors/application-security.interceptor';

// Event Handlers
import { ApplicationEventHandler } from './handlers/application-event.handler';
import { InstallationEventHandler } from './handlers/installation-event.handler';

/**
 * Application Management Module
 * Comprehensive enterprise application distribution and management system
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      ApplicationVersion,
      ApplicationInstallation,
      ApplicationCategory,
      ApplicationPermission,
      ApplicationReview,
      ApplicationLicense
    ])
  ],
  controllers: [
    ApplicationController,
    ApplicationStoreController,
    ApplicationInstallationController,
    ApplicationCatalogController
  ],
  providers: [
    // Core services
    ApplicationService,
    ApplicationStoreService,
    ApplicationInstallationService,
    ApplicationCatalogService,
    ApplicationVersionService,
    ApplicationValidationService,
    ApplicationSecurityService,
    ApplicationLicenseService,
    ApplicationDistributionService,

    // Repositories
    ApplicationRepository,
    ApplicationInstallationRepository,

    // Security and access control
    ApplicationAccessGuard,
    ApplicationLicenseGuard,
    ApplicationSecurityInterceptor,

    // Event handlers
    ApplicationEventHandler,
    InstallationEventHandler
  ],
  exports: [
    ApplicationService,
    ApplicationStoreService,
    ApplicationInstallationService,
    ApplicationSecurityService
  ]
})
export class ApplicationModule {}