/**
 * Test Executor - Handles actual test step execution
 * Provides specific execution logic for different types of test actions
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  TestStep,
  StepResult,
  TestCase,
  TestAction,
  ActionType,
  Assertion
} from '@/types';
import { TestContext } from './test-context';
import { TestLifecycle } from './test-lifecycle';
import { TestExecution } from './test-runner';
import { ComponentHealth } from './test-framework';
import axios, { AxiosResponse } from 'axios';
import * as WebSocket from 'ws';

/**
 * Test Executor for step-by-step test execution
 */
@Injectable()
export class TestExecutor {
  private readonly logger = new Logger(TestExecutor.name);

  private isInitialized = false;
  private httpClient = axios.create();
  private webSocketConnections = new Map<string, WebSocket>();

  constructor(
    private readonly testContext: TestContext,
    private readonly testLifecycle: TestLifecycle
  ) {}

  /**
   * Initialize test executor
   */
  async initialize(): Promise<void> {
    try {
      this.logger.log('Initializing Test Executor');

      // Configure HTTP client with defaults
      this.httpClient.defaults.timeout = 30000;
      this.httpClient.defaults.headers.common['User-Agent'] = 'Bytebot-Integration-Testing/1.0';

      // Setup request/response interceptors
      this.setupHttpInterceptors();

      this.isInitialized = true;
      this.logger.log('Test Executor initialized successfully');
    } catch (error) {
      this.logger.error('Test Executor initialization failed', error);
      throw error;
    }
  }

  /**
   * Execute a test step based on its action type
   */
  async executeStep(
    step: TestStep,
    testCase: TestCase,
    execution: TestExecution
  ): Promise<StepResult> {
    this.ensureInitialized();

    try {
      this.logger.debug(`Executing step: ${step.name} (${step.action.type})`);

      const startTime = Date.now();
      let result: StepResult;

      switch (step.action.type) {
        case 'http_request':
          result = await this.executeHttpRequest(step, testCase);
          break;
        case 'database_query':
          result = await this.executeDatabaseQuery(step, testCase);
          break;
        case 'websocket_message':
          result = await this.executeWebSocketMessage(step, testCase);
          break;
        case 'authentication':
          result = await this.executeAuthentication(step, testCase);
          break;
        case 'wait':
          result = await this.executeWait(step, testCase);
          break;
        case 'assertion':
          result = await this.executeAssertion(step, testCase);
          break;
        case 'data_setup':
          result = await this.executeDataSetup(step, testCase);
          break;
        case 'data_cleanup':
          result = await this.executeDataCleanup(step, testCase);
          break;
        default:
          throw new Error(`Unsupported action type: ${step.action.type}`);
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`Step completed in ${duration}ms: ${step.name}`);

      return result;

    } catch (error) {
      this.logger.error(`Step execution failed: ${step.name}`, error);
      throw error;
    }
  }

  /**
   * Execute HTTP request action
   */
  private async executeHttpRequest(step: TestStep, testCase: TestCase): Promise<StepResult> {
    const action = step.action;

    try {
      const config = {
        method: action.method || 'GET',
        url: this.resolveUrl(action.target),
        headers: action.headers || {},
        params: action.queryParams || {},
        data: action.payload || undefined,
        timeout: 30000
      };

      // Add authentication headers if configured
      const authHeaders = await this.getAuthHeaders(testCase);
      config.headers = { ...config.headers, ...authHeaders };

      this.logger.debug(`HTTP Request: ${config.method} ${config.url}`);

      const response: AxiosResponse = await this.httpClient.request(config);

      const result: StepResult = {
        statusCode: response.status,
        responseBody: response.data,
        responseHeaders: response.headers as Record<string, string>,
        assertions: []
      };

      // Validate against expected result
      if (step.expectedResult) {
        result.assertions = this.validateStepResult(result, step.expectedResult);
      }

      return result;

    } catch (error) {
      if (error.response) {
        // HTTP error response
        const result: StepResult = {
          statusCode: error.response.status,
          responseBody: error.response.data,
          responseHeaders: error.response.headers,
          assertions: [{
            type: 'equals',
            target: 'status',
            expected: step.expectedResult?.statusCode || 200,
            message: `HTTP request failed with status ${error.response.status}`
          }]
        };

        return result;
      } else {
        // Network or other error
        throw new Error(`HTTP request failed: ${error.message}`);
      }
    }
  }

  /**
   * Execute database query action
   */
  private async executeDatabaseQuery(step: TestStep, testCase: TestCase): Promise<StepResult> {
    try {
      const query = step.action.query;
      if (!query) {
        throw new Error('Database query not specified');
      }

      this.logger.debug(`Database Query: ${query}`);

      // Execute query through test context database connection
      const queryResult = await this.testContext.executeDatabaseQuery(query);

      const result: StepResult = {
        statusCode: 200,
        responseBody: queryResult,
        assertions: []
      };

      // Validate against expected result
      if (step.expectedResult) {
        result.assertions = this.validateStepResult(result, step.expectedResult);
      }

      return result;

    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  /**
   * Execute WebSocket message action
   */
  private async executeWebSocketMessage(step: TestStep, testCase: TestCase): Promise<StepResult> {
    try {
      const wsUrl = this.resolveWebSocketUrl(step.action.target);
      const message = step.action.message;

      this.logger.debug(`WebSocket Message: ${wsUrl}`);

      // Get or create WebSocket connection
      let ws = this.webSocketConnections.get(wsUrl);
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        ws = await this.createWebSocketConnection(wsUrl);
        this.webSocketConnections.set(wsUrl, ws);
      }

      // Send message and wait for response
      const response = await this.sendWebSocketMessage(ws, message);

      const result: StepResult = {
        statusCode: 200,
        responseBody: response,
        assertions: []
      };

      // Validate against expected result
      if (step.expectedResult) {
        result.assertions = this.validateStepResult(result, step.expectedResult);
      }

      return result;

    } catch (error) {
      throw new Error(`WebSocket message failed: ${error.message}`);
    }
  }

  /**
   * Execute authentication action
   */
  private async executeAuthentication(step: TestStep, testCase: TestCase): Promise<StepResult> {
    try {
      const authConfig = this.testContext.getAuthenticationConfig();
      const credentials = step.data;

      this.logger.debug('Executing authentication');

      let authResult: any;

      if (authConfig.type === 'jwt') {
        authResult = await this.executeJwtAuthentication(credentials);
      } else if (authConfig.type === 'basic') {
        authResult = await this.executeBasicAuthentication(credentials);
      } else if (authConfig.type === 'oauth') {
        authResult = await this.executeOAuthAuthentication(credentials);
      } else {
        throw new Error(`Unsupported authentication type: ${authConfig.type}`);
      }

      const result: StepResult = {
        statusCode: 200,
        responseBody: authResult,
        assertions: []
      };

      // Store authentication token in context
      if (authResult.token) {
        await this.testContext.setAuthToken(authResult.token);
      }

      return result;

    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Execute wait action
   */
  private async executeWait(step: TestStep, testCase: TestCase): Promise<StepResult> {
    const waitTime = (step.data.duration as number) || 1000;

    this.logger.debug(`Waiting for ${waitTime}ms`);

    await new Promise(resolve => setTimeout(resolve, waitTime));

    return {
      statusCode: 200,
      responseBody: { waited: waitTime },
      assertions: []
    };
  }

  /**
   * Execute assertion action
   */
  private async executeAssertion(step: TestStep, testCase: TestCase): Promise<StepResult> {
    try {
      const assertions = step.expectedResult?.assertions || [];
      const contextData = await this.testContext.getContextData();

      this.logger.debug(`Executing ${assertions.length} assertions`);

      const validatedAssertions = assertions.map(assertion => {
        const actualValue = this.extractValueFromContext(contextData, assertion.target);
        const isValid = this.validateAssertion(assertion, actualValue);

        return {
          ...assertion,
          message: isValid ? 'Assertion passed' : `Assertion failed: expected ${assertion.expected}, got ${actualValue}`
        };
      });

      return {
        statusCode: 200,
        responseBody: { assertionsChecked: validatedAssertions.length },
        assertions: validatedAssertions
      };

    } catch (error) {
      throw new Error(`Assertion execution failed: ${error.message}`);
    }
  }

  /**
   * Execute data setup action
   */
  private async executeDataSetup(step: TestStep, testCase: TestCase): Promise<StepResult> {
    try {
      const setupData = step.data;

      this.logger.debug('Executing data setup');

      // Use test lifecycle for data setup
      await this.testLifecycle.setupTestData(setupData);

      return {
        statusCode: 200,
        responseBody: { dataSetup: 'completed' },
        assertions: []
      };

    } catch (error) {
      throw new Error(`Data setup failed: ${error.message}`);
    }
  }

  /**
   * Execute data cleanup action
   */
  private async executeDataCleanup(step: TestStep, testCase: TestCase): Promise<StepResult> {
    try {
      const cleanupData = step.data;

      this.logger.debug('Executing data cleanup');

      // Use test lifecycle for data cleanup
      await this.testLifecycle.cleanupTestData(cleanupData);

      return {
        statusCode: 200,
        responseBody: { dataCleanup: 'completed' },
        assertions: []
      };

    } catch (error) {
      throw new Error(`Data cleanup failed: ${error.message}`);
    }
  }

  /**
   * Get test executor health
   */
  async getHealth(): Promise<ComponentHealth> {
    const wsConnections = this.webSocketConnections.size;
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

    return {
      status: this.isInitialized ? 'healthy' : 'not_initialized',
      message: `WebSocket connections: ${wsConnections}`,
      lastActivity: new Date(),
      metrics: {
        wsConnections,
        memoryUsage,
        httpClientTimeout: this.httpClient.defaults.timeout || 0
      }
    };
  }

  /**
   * Cleanup test executor resources
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.log('Starting Test Executor cleanup');

      // Close all WebSocket connections
      for (const [url, ws] of this.webSocketConnections) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
      this.webSocketConnections.clear();

      this.isInitialized = false;
      this.logger.log('Test Executor cleanup completed');
    } catch (error) {
      this.logger.error('Test Executor cleanup failed', error);
      throw error;
    }
  }

  /**
   * Setup HTTP client interceptors
   */
  private setupHttpInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      config => {
        this.logger.debug(`HTTP Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        this.logger.error('HTTP Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      response => {
        this.logger.debug(`HTTP Response: ${response.status} ${response.statusText}`);
        return response;
      },
      error => {
        this.logger.error('HTTP Response Error', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Resolve URL with base URL from context
   */
  private resolveUrl(target: string): string {
    const baseUrl = this.testContext.getBaseUrl();
    if (target.startsWith('http')) {
      return target;
    }
    return `${baseUrl}${target.startsWith('/') ? '' : '/'}${target}`;
  }

  /**
   * Resolve WebSocket URL
   */
  private resolveWebSocketUrl(target: string): string {
    const baseUrl = this.testContext.getBaseUrl();
    const wsUrl = baseUrl.replace('http', 'ws');
    if (target.startsWith('ws')) {
      return target;
    }
    return `${wsUrl}${target.startsWith('/') ? '' : '/'}${target}`;
  }

  /**
   * Get authentication headers for requests
   */
  private async getAuthHeaders(testCase: TestCase): Promise<Record<string, string>> {
    const authToken = await this.testContext.getAuthToken();
    if (authToken) {
      return { Authorization: `Bearer ${authToken}` };
    }
    return {};
  }

  /**
   * Create WebSocket connection
   */
  private async createWebSocketConnection(url: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);

      ws.on('open', () => {
        this.logger.debug(`WebSocket connection opened: ${url}`);
        resolve(ws);
      });

      ws.on('error', (error) => {
        this.logger.error(`WebSocket connection error: ${url}`, error);
        reject(error);
      });

      ws.on('close', () => {
        this.logger.debug(`WebSocket connection closed: ${url}`);
        this.webSocketConnections.delete(url);
      });
    });
  }

  /**
   * Send WebSocket message and wait for response
   */
  private async sendWebSocketMessage(ws: WebSocket, message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket message timeout'));
      }, 10000);

      ws.once('message', (data) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data.toString());
          resolve(response);
        } catch (error) {
          resolve(data.toString());
        }
      });

      ws.send(JSON.stringify(message));
    });
  }

  /**
   * Execute JWT authentication
   */
  private async executeJwtAuthentication(credentials: Record<string, unknown>): Promise<any> {
    const authUrl = this.testContext.getAuthUrl();
    const response = await this.httpClient.post(authUrl, credentials);
    return response.data;
  }

  /**
   * Execute basic authentication
   */
  private async executeBasicAuthentication(credentials: Record<string, unknown>): Promise<any> {
    const username = credentials.username as string;
    const password = credentials.password as string;
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    return { token: `Basic ${token}` };
  }

  /**
   * Execute OAuth authentication
   */
  private async executeOAuthAuthentication(credentials: Record<string, unknown>): Promise<any> {
    // Simplified OAuth implementation
    const authUrl = this.testContext.getAuthUrl();
    const response = await this.httpClient.post(authUrl, {
      grant_type: 'client_credentials',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret
    });
    return response.data;
  }

  /**
   * Validate step result against expected result
   */
  private validateStepResult(actual: StepResult, expected: StepResult): Assertion[] {
    const assertions: Assertion[] = [];

    // Validate status code
    if (expected.statusCode && actual.statusCode !== expected.statusCode) {
      assertions.push({
        type: 'equals',
        target: 'statusCode',
        expected: expected.statusCode,
        message: `Expected status ${expected.statusCode}, got ${actual.statusCode}`
      });
    }

    // Validate response body
    if (expected.responseBody) {
      const bodyAssertions = this.validateResponseBody(actual.responseBody, expected.responseBody);
      assertions.push(...bodyAssertions);
    }

    // Add custom assertions
    if (expected.assertions) {
      assertions.push(...expected.assertions);
    }

    return assertions;
  }

  /**
   * Validate response body
   */
  private validateResponseBody(actual: any, expected: any): Assertion[] {
    const assertions: Assertion[] = [];

    if (typeof expected === 'object' && expected !== null) {
      for (const [key, value] of Object.entries(expected)) {
        if (actual[key] !== value) {
          assertions.push({
            type: 'equals',
            target: `responseBody.${key}`,
            expected: value,
            message: `Expected ${key} to be ${value}, got ${actual[key]}`
          });
        }
      }
    } else if (actual !== expected) {
      assertions.push({
        type: 'equals',
        target: 'responseBody',
        expected,
        message: `Expected response body to be ${expected}, got ${actual}`
      });
    }

    return assertions;
  }

  /**
   * Extract value from context data
   */
  private extractValueFromContext(context: any, path: string): any {
    const parts = path.split('.');
    let value = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Validate assertion
   */
  private validateAssertion(assertion: Assertion, actualValue: any): boolean {
    switch (assertion.type) {
      case 'equals':
        return actualValue === assertion.expected;
      case 'contains':
        return typeof actualValue === 'string' && actualValue.includes(assertion.expected as string);
      case 'matches':
        return new RegExp(assertion.expected as string).test(actualValue);
      case 'exists':
        return actualValue !== undefined && actualValue !== null;
      case 'greater_than':
        return typeof actualValue === 'number' && actualValue > (assertion.expected as number);
      case 'less_than':
        return typeof actualValue === 'number' && actualValue < (assertion.expected as number);
      default:
        return false;
    }
  }

  /**
   * Ensure test executor is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Test Executor not initialized. Call initialize() first.');
    }
  }
}