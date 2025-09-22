import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

// Entities
import { Asset } from './entities/asset.entity';
import { AssetTag } from './entities/asset-tag.entity';
import { AssetMetadata } from './entities/asset-metadata.entity';

// External modules
import { SecurityModule } from '../security/security.module';
import { SearchModule } from '../search/search.module';

/**
 * Asset Module - Core asset management functionality
 * Handles asset CRUD operations, file uploads, tagging, and metadata
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Asset,
      AssetTag,
      AssetMetadata,
    ]),

    // Import security and search modules
    SecurityModule,
    SearchModule,
  ],

  controllers: [],
  providers: [],
  exports: [],
})
export class AssetModule {}