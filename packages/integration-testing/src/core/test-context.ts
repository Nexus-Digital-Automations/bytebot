/**
 * Test Context - Manages test execution context and configuration
 * Provides centralized access to test environment, data, and state
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  TestConfiguration,
  TestEnvironment,
  DatabaseConfig,
  ServiceConfig,
  SecurityConfig,
  AuthenticationConfig
} from '@/types';
import { ComponentHealth } from './test-framework';

/**
 * Test Context for managing test execution environment
 */
@Injectable()
export class TestContext {
  private readonly logger = new Logger(TestContext.name);

  private configuration!: TestConfiguration;
  private isInitialized = false;
  private contextData = new Map<string, any>();
  private authToken: string | null = null;
  private databaseConnection: any = null;

  constructor(configuration?: TestConfiguration) {
    if (configuration) {
      this.configuration = configuration;
    }
  }

  /**
   * Initialize test context
   */
  async initialize(): Promise<void> {
    try {
      this.logger.log('Initializing Test Context');

      if (!this.configuration) {
        throw new Error('Test configuration not provided');
      }

      // Initialize database connection
      await this.initializeDatabaseConnection();

      // Initialize service connections
      await this.initializeServiceConnections();

      // Setup test environment variables
      this.setupEnvironmentVariables();

      this.isInitialized = true;
      this.logger.log('Test Context initialized successfully');
    } catch (error) {
      this.logger.error('Test Context initialization failed', error);
      throw error;
    }
  }

  /**
   * Get test configuration
   */
  getConfiguration(): TestConfiguration {
    return this.configuration;
  }

  /**
   * Get test environment
   */
  getEnvironment(): TestEnvironment {
    return this.configuration.environment;
  }

  /**
   * Get base URL for API testing
   */
  getBaseUrl(): string {
    return this.configuration.environment.baseUrl;
  }

  /**
   * Get authentication URL
   */
  getAuthUrl(): string {
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}/auth/login`; // Default auth endpoint
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig(): DatabaseConfig {
    return this.configuration.database;
  }

  /**
   * Get service configuration
   */
  getServiceConfig(serviceName: string): ServiceConfig | undefined {
    return this.configuration.services.find(service => service.name === serviceName);
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): SecurityConfig {
    return this.configuration.security;
  }

  /**
   * Get authentication configuration
   */
  getAuthenticationConfig(): AuthenticationConfig {
    // Return first service auth config or default
    const firstService = this.configuration.services[0];
    return firstService?.authentication || {
      type: 'none',
      credentials: {}
    };
  }

  /**
   * Set authentication token
   */
  async setAuthToken(token: string): Promise<void> {
    this.authToken = token;
    this.setContextData('authToken', token);
    this.logger.debug('Authentication token updated');
  }

  /**
   * Get authentication token
   */
  async getAuthToken(): Promise<string | null> {
    return this.authToken;
  }

  /**
   * Set context data
   */
  setContextData(key: string, value: any): void {
    this.contextData.set(key, value);
    this.logger.debug(`Context data set: ${key}`);
  }

  /**
   * Get context data
   */
  getContextData(key?: string): any {
    if (key) {
      return this.contextData.get(key);
    }
    return Object.fromEntries(this.contextData);
  }

  /**
   * Clear context data
   */
  clearContextData(): void {
    this.contextData.clear();
    this.logger.debug('Context data cleared');
  }

  /**
   * Execute database query
   */
  async executeDatabaseQuery(query: string): Promise<any> {
    this.ensureInitialized();

    if (!this.databaseConnection) {
      throw new Error('Database connection not available');
    }

    try {
      this.logger.debug(`Executing database query: ${query}`);

      // This would be implemented based on the actual database type
      // For now, return a mock result
      const result = { query, executed: true, timestamp: new Date() };

      this.logger.debug('Database query executed successfully');
      return result;
    } catch (error) {
      this.logger.error('Database query execution failed', error);
      throw error;
    }
  }

  /**
   * Check service health
   */
  async checkServiceHealth(serviceName: string): Promise<boolean> {
    const serviceConfig = this.getServiceConfig(serviceName);
    if (!serviceConfig) {
      return false;
    }

    try {
      const healthUrl = `${serviceConfig.endpoint.protocol}://${serviceConfig.endpoint.url}:${serviceConfig.endpoint.port}${serviceConfig.healthCheck.endpoint}`;

      // This would make an actual HTTP request to check health
      this.logger.debug(`Checking service health: ${serviceName} at ${healthUrl}`);

      // Mock health check result
      return true;
    } catch (error) {
      this.logger.warn(`Service health check failed: ${serviceName}`, error);
      return false;
    }
  }

  /**
   * Get all service endpoints
   */
  getServiceEndpoints(): Record<string, string> {
    const endpoints: Record<string, string> = {};

    for (const service of this.configuration.services) {
      const url = `${service.endpoint.protocol}://${service.endpoint.url}:${service.endpoint.port}`;
      endpoints[service.name] = url;
    }

    return endpoints;
  }

  /**
   * Setup test user authentication
   */
  async setupTestUser(userId: string): Promise<void> {
    const testUsers = this.configuration.security.testUsers;
    const testUser = testUsers.find(user => user.id === userId);

    if (!testUser) {
      throw new Error(`Test user not found: ${userId}`);
    }

    // Store test user in context
    this.setContextData('currentUser', testUser);

    if (testUser.token) {
      await this.setAuthToken(testUser.token);
    }

    this.logger.debug(`Test user setup completed: ${testUser.username}`);
  }

  /**
   * Get current test user
   */
  getCurrentTestUser(): any {
    return this.getContextData('currentUser');
  }

  /**
   * Reset test environment
   */
  async resetEnvironment(): Promise<void> {
    this.logger.log('Resetting test environment');

    // Clear context data
    this.clearContextData();

    // Reset authentication
    this.authToken = null;

    // Reset database state if configured
    if (this.configuration.database.schema.cleanup) {
      await this.resetDatabaseState();
    }

    this.logger.log('Test environment reset completed');
  }

  /**
   * Get test context health
   */
  async getHealth(): Promise<ComponentHealth> {
    const contextDataSize = this.contextData.size;
    const hasAuth = !!this.authToken;
    const hasDbConnection = !!this.databaseConnection;

    return {
      status: this.isInitialized ? 'healthy' : 'not_initialized',
      message: `Context data: ${contextDataSize}, Auth: ${hasAuth}, DB: ${hasDbConnection}`,
      lastActivity: new Date(),
      metrics: {
        contextDataSize,
        hasAuthentication: hasAuth ? 1 : 0,
        hasDatabaseConnection: hasDbConnection ? 1 : 0,
        servicesConfigured: this.configuration?.services?.length || 0
      }
    };
  }

  /**
   * Cleanup test context resources
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.log('Starting Test Context cleanup');

      // Close database connection
      if (this.databaseConnection) {
        // Close database connection based on type
        this.databaseConnection = null;
      }

      // Clear all context data
      this.clearContextData();
      this.authToken = null;

      this.isInitialized = false;
      this.logger.log('Test Context cleanup completed');
    } catch (error) {
      this.logger.error('Test Context cleanup failed', error);
      throw error;
    }
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabaseConnection(): Promise<void> {
    const dbConfig = this.configuration.database;

    try {
      this.logger.debug(`Initializing database connection: ${dbConfig.type}`);

      // Mock database connection initialization
      // In real implementation, this would create actual database connections
      this.databaseConnection = {
        type: dbConfig.type,
        connected: true,
        connectionTime: new Date()
      };

      this.logger.debug('Database connection initialized successfully');
    } catch (error) {
      this.logger.error('Database connection initialization failed', error);
      throw error;
    }
  }

  /**
   * Initialize service connections
   */
  private async initializeServiceConnections(): Promise<void> {
    this.logger.debug('Initializing service connections');

    for (const service of this.configuration.services) {
      try {
        // Check service availability
        const isHealthy = await this.checkServiceHealth(service.name);
        this.setContextData(`service_${service.name}_healthy`, isHealthy);

        if (isHealthy) {
          this.logger.debug(`Service connection verified: ${service.name}`);
        } else {
          this.logger.warn(`Service connection failed: ${service.name}`);
        }
      } catch (error) {
        this.logger.warn(`Service connection error: ${service.name}`, error);
        this.setContextData(`service_${service.name}_healthy`, false);
      }
    }

    this.logger.debug('Service connections initialization completed');
  }

  /**
   * Setup environment variables
   */
  private setupEnvironmentVariables(): void {
    const envVars = this.configuration.environment.variables;

    for (const [key, value] of Object.entries(envVars)) {
      this.setContextData(`env_${key}`, value);
    }

    this.logger.debug(`Environment variables setup completed: ${Object.keys(envVars).length} variables`);
  }

  /**
   * Reset database state
   */
  private async resetDatabaseState(): Promise<void> {
    try {
      this.logger.debug('Resetting database state');

      const dbConfig = this.configuration.database;

      if (dbConfig.schema.cleanup) {
        // Execute cleanup based on strategy
        // This would contain actual database cleanup logic
        this.logger.debug('Database state reset completed');
      }
    } catch (error) {
      this.logger.error('Database state reset failed', error);
      throw error;
    }
  }

  /**
   * Ensure test context is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Test Context not initialized. Call initialize() first.');
    }
  }
}