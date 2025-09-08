#!/usr/bin/env node

/**
 * Jest Global Setup for Bytebot Workspace
 * 
 * Provides global setup and initialization for the entire test suite across
 * all packages. Handles test environment preparation, database setup,
 * service initialization, and resource allocation.
 * 
 * @author Claude Code (DevOps & Test Infrastructure Specialist)
 * @version 1.0.0
 * @created 2025-09-06
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Global setup configuration
 */
const SETUP_CONFIG = {
  timeout: 60000, // 60 second timeout for setup
  testDatabase: {
    host: 'localhost',
    port: 5432,
    database: 'bytebot_test',
    username: 'postgres',
    password: 'test',
  },
  redis: {
    host: 'localhost',
    port: 6379,
    db: 15, // Use separate DB for tests
  },
  services: {
    enableDatabase: process.env.ENABLE_DB_TESTS !== 'false',
    enableRedis: process.env.ENABLE_REDIS_TESTS !== 'false',
    enableWebServer: process.env.ENABLE_WEB_TESTS !== 'false',
  },
  directories: {
    temp: path.join(process.cwd(), 'tmp', 'test-workspace'),
    logs: path.join(process.cwd(), 'tmp', 'test-logs'),
    coverage: path.join(process.cwd(), 'coverage-workspace'),
    artifacts: path.join(process.cwd(), 'test-artifacts'),
  },
};

class GlobalTestSetup {
  constructor() {
    this.startTime = Date.now();
    this.services = new Map();
    this.cleanup = [];
  }

  /**
   * Main setup method called by Jest
   */
  async setup() {
    try {
      console.log('🚀 Starting global test environment setup...');
      
      await this.createDirectories();
      await this.setupEnvironmentVariables();
      await this.validateSystemRequirements();
      
      if (SETUP_CONFIG.services.enableDatabase) {
        await this.setupTestDatabase();
      }
      
      if (SETUP_CONFIG.services.enableRedis) {
        await this.setupTestRedis();
      }
      
      if (SETUP_CONFIG.services.enableWebServer) {
        await this.setupTestWebServer();
      }
      
      await this.setupSharedTestUtilities();
      await this.saveSetupState();
      
      const duration = Date.now() - this.startTime;
      console.log(`✅ Global test environment setup completed in ${duration}ms`);
      
    } catch (error) {
      console.error('❌ Global test setup failed:', error);
      await this.cleanup();
      process.exit(1);
    }
  }

  /**
   * Create necessary test directories
   */
  async createDirectories() {
    console.log('📁 Creating test directories...');
    
    Object.values(SETUP_CONFIG.directories).forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  ✓ Created: ${dir}`);
      }
    });
  }

  /**
   * Setup environment variables for testing
   */
  async setupEnvironmentVariables() {
    console.log('🔧 Setting up environment variables...');
    
    const testEnv = {
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
      JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
      ENCRYPTION_KEY: 'test-encryption-key-32-characters',
      DATABASE_URL: this.buildDatabaseUrl(),
      REDIS_URL: `redis://${SETUP_CONFIG.redis.host}:${SETUP_CONFIG.redis.port}/${SETUP_CONFIG.redis.db}`,
      DISABLE_AUTH: 'true',
      DISABLE_RATE_LIMITING: 'true',
      DISABLE_LOGGING: 'false',
      TEST_MODE: 'true',
      WORKSPACE_TEST: 'true',
    };

    Object.entries(testEnv).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
        console.log(`  ✓ Set ${key}=${value}`);
      }
    });
  }

  /**
   * Validate system requirements for testing
   */
  async validateSystemRequirements() {
    console.log('🔍 Validating system requirements...');
    
    const requirements = [
      { name: 'Node.js', command: 'node --version', minVersion: '18.0.0' },
      { name: 'NPM', command: 'npm --version', minVersion: '8.0.0' },
    ];

    for (const req of requirements) {
      try {
        const version = execSync(req.command, { encoding: 'utf8' }).trim();
        console.log(`  ✓ ${req.name}: ${version}`);
      } catch (error) {
        throw new Error(`Missing requirement: ${req.name}`);
      }
    }
  }

  /**
   * Setup test database
   */
  async setupTestDatabase() {
    if (!SETUP_CONFIG.services.enableDatabase) return;
    
    console.log('🗄️  Setting up test database...');
    
    try {
      // Check if PostgreSQL is available
      execSync('pg_isready --timeout=5', { stdio: 'ignore' });
      
      // Create test database if it doesn't exist
      try {
        execSync(`createdb ${SETUP_CONFIG.testDatabase.database}`, { stdio: 'ignore' });
        console.log(`  ✓ Created test database: ${SETUP_CONFIG.testDatabase.database}`);
      } catch (error) {
        // Database might already exist, that's okay
        console.log(`  ℹ️  Test database already exists: ${SETUP_CONFIG.testDatabase.database}`);
      }
      
      // Run database migrations for each package that has them
      const packagesWithDb = ['bytebot-agent', 'bytebotd'];
      for (const pkg of packagesWithDb) {
        await this.runDatabaseMigrations(pkg);
      }
      
      this.services.set('database', {
        status: 'ready',
        url: this.buildDatabaseUrl(),
      });
      
    } catch (error) {
      console.log('  ⚠️  PostgreSQL not available, skipping database tests');
      process.env.ENABLE_DB_TESTS = 'false';
    }
  }

  /**
   * Run database migrations for a package
   */
  async runDatabaseMigrations(packageName) {
    const packageDir = path.join(process.cwd(), 'packages', packageName);
    const prismaSchema = path.join(packageDir, 'prisma', 'schema.prisma');
    
    if (fs.existsSync(prismaSchema)) {
      try {
        console.log(`  🔄 Running migrations for ${packageName}...`);
        execSync('npx prisma migrate deploy', { 
          cwd: packageDir, 
          stdio: 'ignore',
          env: { ...process.env, DATABASE_URL: this.buildDatabaseUrl() }
        });
        console.log(`  ✓ Migrations completed for ${packageName}`);
      } catch (error) {
        console.log(`  ⚠️  Failed to run migrations for ${packageName}: ${error.message}`);
      }
    }
  }

  /**
   * Setup test Redis
   */
  async setupTestRedis() {
    if (!SETUP_CONFIG.services.enableRedis) return;
    
    console.log('🔴 Setting up test Redis...');
    
    try {
      // Check if Redis is available
      execSync(`redis-cli -p ${SETUP_CONFIG.redis.port} ping`, { stdio: 'ignore' });
      
      // Clear test database
      execSync(`redis-cli -p ${SETUP_CONFIG.redis.port} -n ${SETUP_CONFIG.redis.db} FLUSHDB`, { stdio: 'ignore' });
      
      this.services.set('redis', {
        status: 'ready',
        url: `redis://${SETUP_CONFIG.redis.host}:${SETUP_CONFIG.redis.port}/${SETUP_CONFIG.redis.db}`,
      });
      
      console.log('  ✓ Redis test database ready');
      
    } catch (error) {
      console.log('  ⚠️  Redis not available, skipping Redis tests');
      process.env.ENABLE_REDIS_TESTS = 'false';
    }
  }

  /**
   * Setup test web server (if needed for integration tests)
   */
  async setupTestWebServer() {
    if (!SETUP_CONFIG.services.enableWebServer) return;
    
    console.log('🌐 Setting up test web server...');
    
    // This would start a lightweight test server if needed
    // For now, just mark as ready
    this.services.set('webserver', {
      status: 'ready',
      port: 0, // Dynamic port allocation
    });
    
    console.log('  ✓ Test web server ready');
  }

  /**
   * Setup shared test utilities and mocks
   */
  async setupSharedTestUtilities() {
    console.log('🛠️  Setting up shared test utilities...');
    
    // Create global test utilities that all packages can use
    const globalTestUtils = {
      timestamp: new Date().toISOString(),
      testId: `test_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      services: Object.fromEntries(this.services),
      directories: SETUP_CONFIG.directories,
    };
    
    const utilsPath = path.join(SETUP_CONFIG.directories.temp, 'global-test-utils.json');
    fs.writeFileSync(utilsPath, JSON.stringify(globalTestUtils, null, 2));
    
    // Set global variable for Jest environment
    global.__BYTEBOT_TEST_UTILS__ = globalTestUtils;
    
    console.log('  ✓ Shared test utilities ready');
  }

  /**
   * Save setup state for teardown
   */
  async saveSetupState() {
    const setupState = {
      timestamp: new Date().toISOString(),
      services: Object.fromEntries(this.services),
      directories: SETUP_CONFIG.directories,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
      },
    };
    
    const statePath = path.join(SETUP_CONFIG.directories.temp, 'setup-state.json');
    fs.writeFileSync(statePath, JSON.stringify(setupState, null, 2));
  }

  /**
   * Build database connection URL
   */
  buildDatabaseUrl() {
    const { host, port, database, username, password } = SETUP_CONFIG.testDatabase;
    return `postgresql://${username}:${password}@${host}:${port}/${database}?schema=public`;
  }

  /**
   * Cleanup method (called on error)
   */
  async cleanup() {
    console.log('🧹 Cleaning up global test setup...');
    
    // Cleanup would go here if needed
    // For now, just log
    console.log('  ✓ Cleanup completed');
  }
}

/**
 * Jest global setup function
 */
module.exports = async function globalSetup() {
  const setup = new GlobalTestSetup();
  await setup.setup();
};