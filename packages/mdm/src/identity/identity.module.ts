/**
 * Identity Integration Module
 * Handles identity provider and directory service integration
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { IdentityProvider } from './entities/identity-provider.entity';
import { UserIdentity } from './entities/user-identity.entity';
import { IdentityMapping } from './entities/identity-mapping.entity';

// Controllers
import { IdentityController } from './controllers/identity.controller';
import { IdentityProviderController } from './controllers/identity-provider.controller';

// Services
import { IdentityService } from './services/identity.service';
import { IdentityProviderService } from './services/identity-provider.service';
import { DirectoryService } from './services/directory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IdentityProvider,
      UserIdentity,
      IdentityMapping
    ])
  ],
  controllers: [
    IdentityController,
    IdentityProviderController
  ],
  providers: [
    IdentityService,
    IdentityProviderService,
    DirectoryService
  ],
  exports: [
    IdentityService,
    IdentityProviderService,
    DirectoryService
  ]
})
export class IdentityModule {}