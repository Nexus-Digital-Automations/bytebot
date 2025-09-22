import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Asset } from '../asset/entities/asset.entity';
import { AssetVersion } from '../version/entities/asset-version.entity';
import { AssetTag } from '../asset/entities/asset-tag.entity';
import { AssetMetadata } from '../asset/entities/asset-metadata.entity';
import { CollaborationSession } from '../collaboration/entities/collaboration-session.entity';
import { User } from '../security/entities/user.entity';
import { Role } from '../security/entities/role.entity';
import { Permission } from '../security/entities/permission.entity';

/**
 * Database configuration for local-only architecture
 * Supports both SQLite (development) and PostgreSQL (production)
 */
export const databaseConfig: TypeOrmModuleOptions = {
  type: process.env.DATABASE_TYPE === 'postgres' ? 'postgres' : 'sqlite',

  // SQLite configuration (default for local development)
  database: process.env.DATABASE_TYPE === 'postgres'
    ? undefined
    : process.env.DATABASE_PATH || './data/asset-management.db',

  // PostgreSQL configuration (local production)
  host: process.env.DATABASE_TYPE === 'postgres' ? (process.env.DB_HOST || 'localhost') : undefined,
  port: process.env.DATABASE_TYPE === 'postgres' ? parseInt(process.env.DB_PORT || '5432', 10) : undefined,
  username: process.env.DATABASE_TYPE === 'postgres' ? process.env.DB_USERNAME : undefined,
  password: process.env.DATABASE_TYPE === 'postgres' ? process.env.DB_PASSWORD : undefined,
  database: process.env.DATABASE_TYPE === 'postgres' ? process.env.DB_NAME : undefined,

  // Entity registration
  entities: [
    Asset,
    AssetVersion,
    AssetTag,
    AssetMetadata,
    CollaborationSession,
    User,
    Role,
    Permission,
  ],

  // Development settings
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],

  // Performance settings
  cache: {
    duration: 30000, // 30 seconds
    type: 'database',
  },

  // Connection pool settings
  extra: {
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
  },

  // Migration settings
  migrations: ['dist/migrations/*.js'],
  migrationsRun: true,

  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' && process.env.DATABASE_TYPE === 'postgres'
    ? {
        rejectUnauthorized: false,
      }
    : false,
};