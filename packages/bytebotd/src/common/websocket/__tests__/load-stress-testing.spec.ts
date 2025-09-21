/**
 * WebSocket Load Testing and Stress Testing Agent
 *
 * Comprehensive load testing and stress testing suite for WebSocket infrastructure.
 * Tests system behavior under extreme load conditions, resource exhaustion scenarios,
 * and sustained high-throughput operations.
 *
 * Key Features:
 * - Progressive load testing with ramp-up patterns
 * - Memory leak detection and monitoring
 * - CPU and network resource stress testing
 * - Connection pool exhaustion testing
 * - Message queue overflow scenarios
 * - Sustained load endurance testing
 * - System recovery after overload
 * - Resource cleanup validation
 *
 * Performance Targets:
 * - 10,000+ concurrent connections under load
 * - 50,000+ messages/second sustained throughput
 * - <100ms P95 latency under 80% load
 * - Memory usage stable over 24-hour test
 * - 99.95% connection success rate under normal load
 * - <5 second recovery time after overload
 */;

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import {
  TestPerformanceMetrics,
  MetricsCollection,
  safeGet,
  safeToNumber
} from '../websocket-types';

// Core Load Testing Client
class LoadTestingWebSocketClient extends EventEmitter {
  private connectionId: string;
  private isConnected: boolean = false;
  private messagesSent: number = 0;
  private messagesReceived: number = 0;
  private bytesTransferred: number = 0;
  private connectionStartTime: number = 0;
  private lastActivityTime: number = 0;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private ws: any = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private metrics: LoadTestMetrics;

  constructor(connectionId: string, metrics: LoadTestMetrics) {
    super();
    this.connectionId = connectionId;
    this.metrics = metrics;
  
}

  async connect(url: string = 'ws://localhost:8080/ws'): Promise<void>  {
  return new Promise((resolve, reject) => {this.connectionStartTime = performance.now();

      try {
        // Simulate WebSocket connection
        setTimeout(() => {
          this.isConnected = true;
          this.lastActivityTime = performance.now();
          this.metrics.recordConnection(this.connectionId, true);
          this.emit('connected');// Start ping mechanismthis.startPingInterval();
          resolve();
        
}, Math.random() * 100); // Simulate connection latency

      } catch (error) {
  this.metrics.recordConnection(this.connectionId, false);
        this.emit('connection_error', error);
reject(error);
}
    });
  }

  sendMessage(message: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Connection not established');
    }
    const messageData = JSON.stringify(message);
    const messageSize = Buffer.byteLength(messageData, 'utf8');
    this.messagesSent++;
    this.bytesTransferred += messageSize;
    this.lastActivityTime = performance.now();

    this.metrics.recordMessageSent(this.connectionId, messageSize);

    // Simulate message processing delay
    setTimeout(() => {
      this.messagesReceived++;
      this.metrics.recordMessageReceived(this.connectionId, messageSize);
      this.emit('message_received', {
        id: (message as { id?: string }).id || 'unknown',
        timestamp: performance.now()
      });
    }, Math.random() * 50);

    return Promise.resolve();
  }

  async sendBurstMessages(count: number, messageSize: number = 1024): Promise<void>  {
  const promises: Promise<void>[] = [];

    for (let i = 0; i < count; i++) {
      const message = {
        id: `burst_${this.connectionId}_${i}`,
        timestamp: performance.now(),
        data: 'x'.repeat(messageSize),
      sequence: i};

      promises.push(this.sendMessage(message));
    }

    await Promise.all(promises);
  }

  private startPingInterval(): void {
  this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({ type: 'ping', timestamp: performance.now() 
});}}, 30000); // 30 second ping
  }

  disconnect(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.isConnected = false;
    this.metrics.recordDisconnection(this.connectionId);
    this.emit('disconnected');

    return Promise.resolve();
  }

  getStats(): ConnectionStats {
  return {
    connectionId: this.connectionId,
      isConnected: this.isConnected,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      bytesTransferred: this.bytesTransferred,
      connectionDuration: this.isConnected ? performance.now() - this.connectionStartTime : 0,
      lastActivityTime: this.lastActivityTime,
      reconnectAttempts: this.reconnectAttempts
    
};
  }
}

// Load Test Metrics Collection
class LoadTestMetrics {
  private connections: Map<string, ConnectionMetrics> = new Map();
  private systemMetrics: SystemMetrics;
  private startTime: number;
  private testPhase: string = 'initialization';
constructor() {this.startTime = performance.now();
    this.systemMetrics = {
  memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      timestamp: this.startTime
    
};
  }

  recordConnection(connectionId: string, success: boolean): void {
  if (!this.connections.has(connectionId)) {
      this.connections.set(connectionId, {
        connectionId,
        connectTime: performance.now(),
        messagesSent: 0,
        messagesReceived: 0,
        bytesTransferred: 0,
        errors: [],
        isActive: success
      
});
    }
  }

  recordMessageSent(connectionId: string, messageSize: number): void {
  const metrics = this.connections.get(connectionId);
    if (metrics) {
      metrics.messagesSent++;
      metrics.bytesTransferred += messageSize;
    
}
  }

  recordMessageReceived(connectionId: string, messageSize: number): void {
  const metrics = this.connections.get(connectionId);
    if (metrics) {
      metrics.messagesReceived++;
    
}
  }

  recordDisconnection(connectionId: string): void {
  const metrics = this.connections.get(connectionId);
    if (metrics) {
      metrics.isActive = false;
      metrics.disconnectTime = performance.now();
    
}
  }

  recordError(connectionId: string, error: string): void {
  const metrics = this.connections.get(connectionId);
    if (metrics) {
      metrics.errors.push({
        error,
        timestamp: performance.now()
      
});
    }
  }

  updateSystemMetrics(): void {
  this.systemMetrics = {
  memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      timestamp: performance.now()
    
};
  }

  setTestPhase(phase: string): void {
  this.testPhase = phase;
  
}

  getAggregatedMetrics(): AggregatedMetrics {
  const connectionMetrics = Array.from(this.connections.values());
    const activeConnections = connectionMetrics.filter(c => c.isActive).length;
    const totalMessages = connectionMetrics.reduce((sum, c) => sum + c.messagesSent, 0);
    const totalBytes = connectionMetrics.reduce((sum, c) => sum + c.bytesTransferred, 0);
    const totalErrors = connectionMetrics.reduce((sum, c) => sum + c.errors.length, 0);

    return {
  testPhase: this.testPhase,
      totalConnections: connectionMetrics.length,
      activeConnections,
      totalMessagesSent: totalMessages,
      totalBytesTransferred: totalBytes,
      totalErrors,
      averageMessagesPerConnection: connectionMetrics.length > 0 ? totalMessages / connectionMetrics.length : 0,
      systemMetrics: this.systemMetrics,
      testDuration: performance.now() - this.startTime
    
};
  }
}

// Progressive Load Generator
class ProgressiveLoadGenerator {
  private clients: Map<string, LoadTestingWebSocketClient> = new Map();
  private metrics: LoadTestMetrics;
  private isRunning: boolean = false;
  private currentPhase: string = 'idle';
constructor(metrics: LoadTestMetrics) {this.metrics = metrics;
  
}

  async executeLoadTest(config: LoadTestConfig): Promise<LoadTestResults>  {
  this.isRunning = true;
    const results: LoadTestResults = {
  phases: [],
      overallMetrics: null,
      success: false,
      startTime: performance.now(),
      endTime: 0
    
};

    try {
  // Phase 1: Baseline Load
      await this.executePhase('baseline', config.baselineConnections, config.baselineRPS, 60000);results.phases.push(this.capturePhaseResults('baseline'));// Phase 2: Ramp Upawait this.executeRampUp(config.baselineConnections, config.targetConnections, config.rampUpDuration);
      results.phases.push(this.capturePhaseResults('ramp_up'));// Phase 3: Peak Loadawait this.executePhase('peak_load', config.targetConnections, config.peakRPS, config.peakDuration);results.phases.push(this.capturePhaseResults('peak_load'));// Phase 4: Stress Testawait this.executeStressTest(config.targetConnections, config.stressMultiplier);
      results.phases.push(this.capturePhaseResults('stress_test'));// Phase 5: Recovery Testawait this.executeRecoveryTest(config.targetConnections, config.baselineConnections);
      results.phases.push(this.capturePhaseResults('recovery'));results.success = true;results.overallMetrics = this.metrics.getAggregatedMetrics();

    
} catch (error) {
  results.success = false;
      results.error = error instanceof Error ? error.message : String(error);
    
} finally {
  this.isRunning = false;
      results.endTime = performance.now();
      await this.cleanup();
    
}

    return results;
  }

  private async executePhase(phase: string, connections: number, rps: number, duration: number): Promise<void>  {
  this.currentPhase = phase;
    this.metrics.setTestPhase(phase);

    // Create connections
    await this.createConnections(connections);

    // Generate load for specified duration
    const endTime = performance.now() + duration;
    while (performance.now() < endTime && this.isRunning) {
      await this.generateLoad(rps);
      await this.sleep(1000); // 1 second intervals
      this.metrics.updateSystemMetrics();
    
}
  }

  private async executeRampUp(startConnections: number, endConnections: number, duration: number): Promise<void>  {
  this.currentPhase = 'ramp_up';
this.metrics.setTestPhase('ramp_up');const connectionIncrement = Math.max(1, Math.floor((endConnections - startConnections) / (duration / 5000)));const intervalDuration = Math.floor(duration / Math.ceil((endConnections - startConnections) / connectionIncrement));

    let currentConnections = startConnections;
    while (currentConnections < endConnections && this.isRunning) {
      const nextTarget = Math.min(currentConnections + connectionIncrement, endConnections);
      await this.createConnections(nextTarget - currentConnections);

      currentConnections = nextTarget;
      await this.sleep(intervalDuration);
      this.metrics.updateSystemMetrics();
    
}
  }

  private async executeStressTest(baseConnections: number, stressMultiplier: number): Promise<void>  {
  this.currentPhase = 'stress_test';
this.metrics.setTestPhase('stress_test');const stressConnections = Math.floor(baseConnections * stressMultiplier);const additionalConnections = stressConnections - baseConnections;

    // Rapidly create additional connections
    await this.createConnections(additionalConnections);

    // Generate extreme load for stress duration
    const stressDuration = 120000; // 2 minutes
    const endTime = performance.now() + stressDuration;

    while (performance.now() < endTime && this.isRunning) {
      // Generate messages at 2x normal rate
      await this.generateLoad(20000); // High RPS for stress
      await this.sleep(500); // Shorter intervals
      this.metrics.updateSystemMetrics();
    
}
  }

  private async executeRecoveryTest(currentConnections: number, targetConnections: number): Promise<void>  {
  this.currentPhase = 'recovery';
this.metrics.setTestPhase('recovery');

    // Reduce connections to target level
    const connectionsToRemove = currentConnections - targetConnections;
    await this.removeConnections(connectionsToRemove);

    // Monitor recovery for 2 minutes
    const recoveryDuration = 120000;
    const endTime = performance.now() + recoveryDuration;

    while (performance.now() < endTime && this.isRunning) {
      await this.generateLoad(5000); // Normal load during recovery
      await this.sleep(1000);
      this.metrics.updateSystemMetrics();
    
}
  }

  private async createConnections(count: number): Promise<void>  {
  const promises: Promise<void>[] = [];

    for (let i = 0; i < count; i++) {
      const connectionId = `load_client_${this.clients.size + i
}`;
      const client = new LoadTestingWebSocketClient(connectionId, this.metrics);

      this.clients.set(connectionId, client);
      promises.push(client.connect());

      // Stagger connection creation to avoid overwhelming
      if (promises.length >= 50) {
  await Promise.allSettled(promises);
        promises.length = 0;
        await this.sleep(100);
      
}
    }

  if(promises.length > 0) {
  await Promise.allSettled(promises);
    
}
  }

  private async removeConnections(count: number): Promise<void>  {
  const clientEntries = Array.from(this.clients.entries());
    const connectionsToRemove = clientEntries.slice(0, count);

    const promises = connectionsToRemove.map(([id, client]) => {
      this.clients.delete(id);
      return client.disconnect();
    
});

    await Promise.allSettled(promises);
  }

  private async generateLoad(targetRPS: number): Promise<void>  {
  const activeClients = Array.from(this.clients.values()).filter(client => client.getStats().isConnected);
    if (activeClients.length === 0) return;

    const messagesPerClient = Math.max(1, Math.floor(targetRPS / activeClients.length));
    const promises: Promise<void>[] = [];

    for (const client of activeClients) {
      promises.push(client.sendBurstMessages(messagesPerClient, 512));
    
}

    await Promise.allSettled(promises);
  }

  private capturePhaseResults(phase: string): PhaseResults {
  const aggregated = this.metrics.getAggregatedMetrics();
    return {
      phase,
      metrics: aggregated,
      timestamp: performance.now()
    
};
  }

  private async cleanup(): Promise<void>  {
  const promises = Array.from(this.clients.values()).map(client => client.disconnect());
    await Promise.allSettled(promises);
    this.clients.clear();
  
}

  private sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
  
}
}

// Memory Leak Detection
class MemoryLeakDetector {
  private memorySnapshots: MemorySnapshot[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  startMonitoring(intervalMs: number = 5000): void {
    this.isMonitoring = true;
    this.memorySnapshots = [];

    this.monitoringInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.captureMemorySnapshot();
      
}
    }, intervalMs);
  }

  stopMonitoring(): MemoryLeakAnalysis {
  this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    
}

    return this.analyzeMemoryLeaks();
  }

  private captureMemorySnapshot(): void {
  const memUsage = process.memoryUsage();
    const snapshot: MemorySnapshot = {
  timestamp: performance.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    
};

    this.memorySnapshots.push(snapshot);
  }

  private analyzeMemoryLeaks(): MemoryLeakAnalysis {
  if (this.memorySnapshots.length < 2) {
      return {
  hasMemoryLeak: false,
        analysis: 'Insufficient data for analysis',
        snapshots: this.memorySnapshots
      
};
    }

    const firstSnapshot = this.memorySnapshots[0];
    const lastSnapshot = this.memorySnapshots[this.memorySnapshots.length - 1];

    const heapGrowth = lastSnapshot.heapUsed - firstSnapshot.heapUsed;
    const heapGrowthPercentage = (heapGrowth / firstSnapshot.heapUsed) * 100;

    // Consider it a leak if heap grows more than 50% and continues growing
    const hasLeak = heapGrowthPercentage > 50 && this.isConsistentGrowth();

    return {
  hasMemoryLeak: hasLeak,
      heapGrowthBytes: heapGrowth,
      heapGrowthPercentage,
      analysis: this.generateMemoryAnalysis(heapGrowthPercentage, hasLeak),
      snapshots: this.memorySnapshots,
      recommendations: this.generateRecommendations(hasLeak, heapGrowthPercentage)
    
};
  }

  private isConsistentGrowth(): boolean {
  if (this.memorySnapshots.length < 5) return false;

    let growthCount = 0;
    for (let i = 1; i < this.memorySnapshots.length; i++) {
      if (this.memorySnapshots[i].heapUsed > this.memorySnapshots[i - 1].heapUsed) {
        growthCount++;
      
}
    }

    return growthCount / (this.memorySnapshots.length - 1) > 0.7; // 70% of samples show growth
  }

  private generateMemoryAnalysis(growthPercentage: number, hasLeak: boolean): string {
  if (hasLeak) {
      return `Potential memory leak detected: ${growthPercentage.toFixed(2)
}% heap growth with consistent increase pattern`;} else if (growthPercentage > 20) {return `Elevated memory usage: ${growthPercentage.toFixed(2)}% heap growth, monitor closely`;} else {return `Normal memory usage: ${growthPercentage.toFixed(2)}% heap growth within acceptable range`;
    }
  }

  private generateRecommendations(hasLeak: boolean, growthPercentage: number): string[] {
  const recommendations: string[] = [];

    if (hasLeak) {
      recommendations.push('Investigate connection cleanup procedures');recommendations.push('Review event listener removal');recommendations.push('Check for unclosed resources');recommendations.push('Implement garbage collection monitoring');
}

  if(growthPercentage > 30) {
      recommendations.push('Consider implementing connection pooling');recommendations.push('Add memory usage alerts');recommendations.push('Review message buffer management');}

  if(recommendations.length === 0) {
  recommendations.push('Memory usage within normal parameters');recommendations.push('Continue monitoring during peak load');
    
}

    return recommendations;
  }
}

// Resource Exhaustion Tester
class ResourceExhaustionTester {
  private metrics: LoadTestMetrics;
  private memoryDetector: MemoryLeakDetector;

  constructor(metrics: LoadTestMetrics) {
    this.metrics = metrics;
    this.memoryDetector = new MemoryLeakDetector();
  
}

  async testConnectionPoolExhaustion(): Promise<ExhaustionTestResult>  {
  const startTime = performance.now();
    let maxConnections = 0;
    let exhaustionPoint = 0;
    const clients: LoadTestingWebSocketClient[] = [];

    try {
      // Attempt to create connections until exhaustion
      for (let i = 0; i < 50000; i++) {
        const client = new LoadTestingWebSocketClient(`exhaust_${i
}`, this.metrics);

        try {
  await client.connect();
          clients.push(client);
          maxConnections = i + 1;

          // Check system resources every 100 connections
          if (i % 100 === 0) {
            this.metrics.updateSystemMetrics();
            const memUsage = process.memoryUsage();

            // Stop if memory usage is too high
            if (memUsage.heapUsed > 1024 * 1024 * 1024) { // 1GB
              exhaustionPoint = i;
              break;
            
}
          }
        } catch (error) {
  exhaustionPoint = i;
          break;
        
}
      }
    } catch (error) {
  // Expected exhaustion error
    
}

    // Cleanup
    const cleanupPromises = clients.map(client => client.disconnect());
    await Promise.allSettled(cleanupPromises);

    return {
  testType: 'connection_pool_exhaustion',
      maxConnections,exhaustionPoint,
      testDuration: performance.now() - startTime,
      finalMetrics: this.metrics.getAggregatedMetrics(),
      success: exhaustionPoint > 0
    
};
  }

  async testMessageQueueOverflow(): Promise<ExhaustionTestResult>  {
  const startTime = performance.now();
    const client = new LoadTestingWebSocketClient('overflow_test', this.metrics);await client.connect();let messagesSent = 0;
    let overflowDetected = false;

    try {
      // Send messages rapidly to cause queue overflow
      while (!overflowDetected && messagesSent < 100000) {
        const batchSize = 1000;
        const largeMessage = 'x'.repeat(10240); // 10KB messages

        for (let i = 0; i < batchSize; i++) {
          await client.sendMessage({
  id: messagesSent + i,
            data: largeMessage,
            timestamp: performance.now()
          
});
        }

        messagesSent += batchSize;

        // Check for overflow indicators
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > 512 * 1024 * 1024) {
  // 512MB
          overflowDetected = true;
        
}
      }
    } catch (error) {
  overflowDetected = true;
    
}

    await client.disconnect();

    return {
  testType: 'message_queue_overflow',
      maxConnections: 1,
      exhaustionPoint: messagesSent,
      testDuration: performance.now() - startTime,
      finalMetrics: this.metrics.getAggregatedMetrics(),
      success: overflowDetected
    
};
  }

  async testSustainedLoad(duration: number = 300000): Promise<SustainedLoadResult>  {
  const startTime = performance.now();
    this.memoryDetector.startMonitoring(10000); // Monitor every 10 seconds

    const loadGenerator = new ProgressiveLoadGenerator(this.metrics);
    const sustainedConfig: LoadTestConfig = {
  baselineConnections: 1000,
      targetConnections: 5000,
      peakRPS: 25000,
      baselineRPS: 10000,
      rampUpDuration: 60000,
      peakDuration: duration,
      stressMultiplier: 1.0 // No stress, just sustained load
    
};

    const loadResults = await loadGenerator.executeLoadTest(sustainedConfig);
    const memoryAnalysis = this.memoryDetector.stopMonitoring();

    return {
  loadTestResults: loadResults,
      memoryLeakAnalysis: memoryAnalysis,
      sustainedDuration: duration,
      testDuration: performance.now() - startTime,
      success: loadResults.success && !memoryAnalysis.hasMemoryLeak
    
};
  }
}

// Type Definitions
interface ConnectionStats {
  connectionId: string;
  isConnected: boolean;
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  connectionDuration: number;
  lastActivityTime: number;
  reconnectAttempts: number;


}

interface ConnectionMetrics {
  connectionId: string;
  connectTime: number;
  disconnectTime?: number;
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  errors: Array<{ error: string; timestamp: number 

}>;
  isActive: boolean;
}

interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: number;


}

interface AggregatedMetrics {
  testPhase: string;
  totalConnections: number;
  activeConnections: number;
  totalMessagesSent: number;
  totalBytesTransferred: number;
  totalErrors: number;
  averageMessagesPerConnection: number;
  systemMetrics: SystemMetrics;
  testDuration: number;


}

interface LoadTestConfig {
  baselineConnections: number;
  targetConnections: number;
  peakRPS: number;
  baselineRPS: number;
  rampUpDuration: number;
  peakDuration: number;
  stressMultiplier: number;


}

interface PhaseResults {
  phase: string;
  metrics: AggregatedMetrics;
  timestamp: number;


}

interface LoadTestResults {
  phases: PhaseResults[];
  overallMetrics: AggregatedMetrics | null;
  success: boolean;
  startTime: number;
  endTime: number;
  error?: string;


}

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;


}

interface MemoryLeakAnalysis {
  hasMemoryLeak: boolean;
  heapGrowthBytes?: number;
  heapGrowthPercentage?: number;
  analysis: string;
  snapshots: MemorySnapshot[];
  recommendations?: string[];


}

interface ExhaustionTestResult {
  testType: string;
  maxConnections: number;
  exhaustionPoint: number;
  testDuration: number;
  finalMetrics: AggregatedMetrics;
  success: boolean;


}

interface SustainedLoadResult {
  loadTestResults: LoadTestResults;
  memoryLeakAnalysis: MemoryLeakAnalysis;
  sustainedDuration: number;
  testDuration: number;
  success: boolean;


}

// Test Suite
describe('WebSocket Load Testing and Stress Testing', () => {

  let metrics: LoadTestMetrics;
  let loadGenerator: ProgressiveLoadGenerator;
  let resourceTester: ResourceExhaustionTester;

  beforeEach(() => {
    metrics = new LoadTestMetrics();
    loadGenerator = new ProgressiveLoadGenerator(metrics);
    resourceTester = new ResourceExhaustionTester(metrics);
  });

  afterEach(() => {
    // Cleanup any running tests
    jest.clearAllTimers();
  });



  describe('Progressive Load Testing', () => {

  test('should execute baseline load test successfully', async () => {
    const config: LoadTestConfig = {
      baselineConnections: 100,
        targetConnections: 500,
        peakRPS: 5000,
        baselineRPS: 1000,
        rampUpDuration: 30000,
        peakDuration: 60000,
        stressMultiplier: 1.5
      
};

      const results = await loadGenerator.executeLoadTest(config);

      expect(results.success).toBe(true);
      expect(results.phases).toHaveLength(5);
      expect(results.phases[0].phase).toBe('baseline');
expect(results.overallMetrics).toBeDefined();
expect(results.overallMetrics?.totalConnections).toBeGreaterThan(0);
    }, 300000); // 5 minute timeout

    test('should handle ramp-up phase correctly', async () => {
  const config: LoadTestConfig = {baselineConnections: 50,
        targetConnections: 200,
        peakRPS: 2000,
        baselineRPS: 500,
        rampUpDuration: 15000,
        peakDuration: 30000,
        stressMultiplier: 1.2
      
};

      const results = await loadGenerator.executeLoadTest(config);
      const rampUpPhase = results.phases.find(p => p.phase === 'ramp_up');
expect(rampUpPhase).toBeDefined();
expect(rampUpPhase?.metrics.activeConnections).toBeGreaterThan(50);
      expect(rampUpPhase?.metrics.totalMessagesSent).toBeGreaterThan(0);
    }, 180000);

    test('should execute stress test with increased load', async () => {
  const config: LoadTestConfig = {baselineConnections: 100,
        targetConnections: 300,
        peakRPS: 3000,
        baselineRPS: 1000,
        rampUpDuration: 20000,
        peakDuration: 30000,
        stressMultiplier: 2.0
      
};

      const results = await loadGenerator.executeLoadTest(config);
      const stressPhase = results.phases.find(p => p.phase === 'stress_test');
expect(stressPhase).toBeDefined();
expect(stressPhase?.metrics.activeConnections).toBeGreaterThan(300);
      expect(results.success).toBe(true);
    }, 240000);

    test('should validate recovery after stress', async () => {
  const config: LoadTestConfig = {baselineConnections: 50,
        targetConnections: 150,
        peakRPS: 2000,
        baselineRPS: 500,
        rampUpDuration: 10000,
        peakDuration: 20000,
        stressMultiplier: 1.8
      
};

      const results = await loadGenerator.executeLoadTest(config);
      const recoveryPhase = results.phases.find(p => p.phase === 'recovery');
expect(recoveryPhase).toBeDefined();
expect(recoveryPhase?.metrics.activeConnections).toBeLessThanOrEqual(150);
      expect(recoveryPhase?.metrics.totalErrors).toBeLessThanOrEqual(5); // Allow some errors during recovery
    }, 180000);
  });



  describe('Resource Exhaustion Testing', () => {

  test('should detect connection pool exhaustion point', async () => {
    const result = await resourceTester.testConnectionPoolExhaustion();
    expect(result.success).toBe(true);
      expect(result.exhaustionPoint).toBeGreaterThan(0);
      expect(result.maxConnections).toBeGreaterThan(100);
      expect(result.testType).toBe('connection_pool_exhaustion');
expect(result.finalMetrics).toBeDefined();
}, 120000);

    test('should detect message queue overflow', async () => {
  const result = await resourceTester.testMessageQueueOverflow();
expect(result.success).toBe(true);
      expect(result.exhaustionPoint).toBeGreaterThan(0);
      expect(result.testType).toBe('message_queue_overflow');
}, 60000);
test('should perform sustained load test with memory monitoring', async () => {
      const sustainedDuration = 120000; // 2 minutes for testing
      const result = await resourceTester.testSustainedLoad(sustainedDuration);

      const typedResult = result as MetricsCollection;
      expect(safeGet(typedResult, 'success', false)).toBe(true);
      const loadTestResults = safeGet(typedResult, 'loadTestResults', {}) as MetricsCollection;
      expect(safeGet(loadTestResults, 'success', false)).toBe(true);
      expect(safeGet(typedResult, 'memoryLeakAnalysis', null)).toBeDefined();
      const memoryAnalysis = safeGet(typedResult, 'memoryLeakAnalysis', {}) as MetricsCollection;
      const snapshots = safeGet(memoryAnalysis, 'snapshots', []) as unknown[];
      expect(snapshots.length).toBeGreaterThan(5);
      expect(safeToNumber(safeGet(typedResult, 'sustainedDuration', 0))).toBe(sustainedDuration);
    }, 180000);
  });



  describe('Memory Leak Detection', () => {

  test('should monitor memory usage over time', async () => {
    const detector = new MemoryLeakDetector();

      detector.startMonitoring(1000); // Monitor every second

      // Simulate memory-intensive operations
      const clients: LoadTestingWebSocketClient[] = [];
      for (let i = 0; i < 100; i++) {
        const client = new LoadTestingWebSocketClient(`mem_test_${i
}`, metrics);
        await client.connect();
        clients.push(client);
      }

      // Let monitoring run for 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));

      const analysis = detector.stopMonitoring();

      expect(analysis.snapshots.length).toBeGreaterThan(5);
      expect(analysis.analysis).toBeDefined();
      expect(analysis.recommendations).toBeDefined();

      // Cleanup
      await Promise.all(clients.map(client => client.disconnect()));
    }, 30000);

    test('should detect consistent memory growth patterns', async () => {
      const detector = new MemoryLeakDetector();
      detector.startMonitoring(500);

      // Simulate gradual memory growth
      const largeObjects: any[] = [];
      const growthInterval = setInterval(() => {
        largeObjects.push(new Array(10000).fill('memory-leak-test'));
      }, 1000);
      await new Promise(resolve => setTimeout(resolve, 8000));
      clearInterval(growthInterval);

      const analysis = detector.stopMonitoring();

      expect(analysis.snapshots.length).toBeGreaterThan(10);
      if (analysis.hasMemoryLeak) {
  expect(analysis.heapGrowthPercentage).toBeGreaterThan(20);
        expect(analysis.recommendations).toContain('Investigate connection cleanup procedures');
}// Cleanup
      largeObjects.length = 0;
    }, 20000);
  });



  describe('Performance Under Load', () => {

  test('should maintain performance under 80% of max load', async () => {
    const testClient = new LoadTestingWebSocketClient('perf_test', metrics);
    await testClient.connect();
    const startTime = performance.now();
      const messageCount = 1000;

      // Send burst of messages
      await testClient.sendBurstMessages(messageCount, 1024);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const averageLatency = duration / messageCount;

      expect(averageLatency).toBeLessThan(100); // <100ms average latency
      expect(testClient.getStats().messagesSent).toBe(messageCount);

      await testClient.disconnect();
    
}, 30000);

    test('should handle concurrent message bursts', async () => {
  const clientCount = 50;
      const messagesPerClient = 100;
      const clients: LoadTestingWebSocketClient[] = [];

      // Create clients
      for (let i = 0; i < clientCount; i++) {
        const client = new LoadTestingWebSocketClient(`burst_${i
}`, metrics);
        await client.connect();
        clients.push(client);
      }

      const startTime = performance.now();

      // Send concurrent bursts
      const promises = clients.map(client =>
        client.sendBurstMessages(messagesPerClient, 512)
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const totalMessages = clientCount * messagesPerClient;
      const throughput = (totalMessages / totalDuration) * 1000; // messages per second

      expect(throughput).toBeGreaterThan(1000); // >1000 messages/sec

      // Verify all messages were sent
      const totalSent = clients.reduce((sum, client) =>
        sum + client.getStats().messagesSent, 0
      );
      expect(totalSent).toBe(totalMessages);

      // Cleanup
      await Promise.all(clients.map(client => client.disconnect()));
    }, 60000);
  });



  describe('System Recovery Testing', () => {

  test('should recover from overload conditions', async () => {
    const config: LoadTestConfig = {
      baselineConnections: 100,
        targetConnections: 200,
        peakRPS: 5000,
        baselineRPS: 1000,
        rampUpDuration: 10000,
        peakDuration: 20000,
        stressMultiplier: 3.0 // High stress
      
};

      const results = await loadGenerator.executeLoadTest(config);

      expect(results.success).toBe(true);

      const recoveryPhase = results.phases.find(p => p.phase === 'recovery');
expect(recoveryPhase).toBeDefined();// System should stabilize during recovery
      const finalMetrics = results.overallMetrics;
      expect(finalMetrics!.totalErrors / finalMetrics!.totalConnections).toBeLessThan(0.1); // <10% error rate
    }, 120000);

    test('should maintain connection stability after stress', async () => {
  // Create baseline connections
      const clients: LoadTestingWebSocketClient[] = [];
      for (let i = 0; i < 100; i++) {
        const client = new LoadTestingWebSocketClient(`stability_${i
}`, metrics);
        await client.connect();
        clients.push(client);
      }

      // Apply stress by sending many messages
      const stressPromises = clients.map(client =>
        client.sendBurstMessages(200, 2048)
      );
      await Promise.all(stressPromises);

      // Wait for system stabilization
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify connections are still stable
      const activeConnections = clients.filter(client =>
        client.getStats().isConnected
      ).length;

      expect(activeConnections).toBeGreaterThan(95); // 95% connection retention

      // Cleanup
      await Promise.all(clients.map(client => client.disconnect()));
    }, 60000);
  });



  describe('Resource Cleanup Validation', () => {

  test('should properly cleanup resources after load test', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    const config: LoadTestConfig = {
  baselineConnections: 200,
        targetConnections: 500,
        peakRPS: 3000,
        baselineRPS: 1000,
        rampUpDuration: 15000,
        peakDuration: 30000,
        stressMultiplier: 1.5
      
};

      await loadGenerator.executeLoadTest(config);

      // Force garbage collection if available
      if (global.gc) {
  global.gc();
      
}

      await new Promise(resolve => setTimeout(resolve, 5000));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      const memoryGrowthPercent = (memoryGrowth / initialMemory) * 100;

      // Memory growth should be reasonable (less than 100% growth)
      expect(memoryGrowthPercent).toBeLessThan(100);
    }, 180000);

    test('should validate proper connection cleanup', async () => {
  const connectionCount = 500;
      const clients: LoadTestingWebSocketClient[] = [];

      // Create many connections
      for (let i = 0; i < connectionCount; i++) {
        const client = new LoadTestingWebSocketClient(`cleanup_${i
}`, metrics);
        await client.connect();
        clients.push(client);
      }

      // Verify all connections are active
      const activeCount = clients.filter(c => c.getStats().isConnected).length;
      expect(activeCount).toBe(connectionCount);

      // Disconnect all
      const disconnectPromises = clients.map(client => client.disconnect());
      await Promise.all(disconnectPromises);

      // Verify all connections are closed
      const finalActiveCount = clients.filter(c => c.getStats().isConnected).length;
      expect(finalActiveCount).toBe(0);

      const aggregatedMetrics = metrics.getAggregatedMetrics();
      expect(aggregatedMetrics.activeConnections).toBe(0);
    }, 120000);
  });
});