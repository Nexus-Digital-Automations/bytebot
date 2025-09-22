/**
 * Database Configuration
 * SQLite configuration for local-only architecture compliance
 */

import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'sqlite',
  database: process.env.MDM_DATABASE_PATH || './data/mdm.sqlite',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: true,
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.MDM_DATABASE_LOGGING === 'true',
  autoLoadEntities: true,
  retryAttempts: 3,
  retryDelay: 3000,
  extra: {
    // SQLite-specific optimizations for enterprise use
    journal_mode: 'WAL', // Write-Ahead Logging for better concurrency
    synchronous: 'NORMAL', // Balance between safety and performance
    cache_size: -64000, // 64MB cache for better performance
    temp_store: 'MEMORY', // Store temporary tables in memory
    mmap_size: 268435456, // 256MB memory-mapped I/O
    busy_timeout: 30000, // 30 seconds timeout for busy database
    foreign_keys: 'ON', // Enable foreign key constraints
    wal_autocheckpoint: 1000, // Checkpoint WAL every 1000 pages
    optimize: true // Run PRAGMA optimize on startup
  }
}));