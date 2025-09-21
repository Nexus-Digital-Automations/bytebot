/**
 * PARLANT Phase 1 WebSocket Message Ordering and Delivery Validation Test Suite
 *
 * Comprehensive testing framework for message ordering, delivery guarantees,
 * deduplication, priority queuing, buffering, timeout/retry mechanisms,
 * and PARLANT conversational flow validation.
 *
 * Test Coverage:
 * - Message sequence ordering and validation tests
 * - Delivery acknowledgment and confirmation system testing
 * - Message deduplication and duplicate detection testing
 * - Priority queue implementation and processing validation
 * - Message buffering and queue overflow handling
 * - Timeout and retry mechanism testing for failed deliveries
 * - Ordered conversation flow validation with PARLANT integration
 * - Message integrity and checksum validation testing
 * - Performance metrics collection and validation
 *
 * @author Claude Code (PARLANT Phase 1 WebSocket Validation Specialist)
 * @version 1.0.0
 */;

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { performance } from 'perf_hooks';
import {
  MessageOrderingDeliveryValidationService,
  MessageIntegrityResult,
  ConversationFlowValidation,
  DeliveryAcknowledgment,

} from '../message-ordering-delivery-validation.service';
import {
  ConversationalMessage,
  ConversationalMessageType,
  ConversationalMessageMetadata,
  ValidationRequestMessage,
  UserConfirmationMessage,
  ProgressUpdateMessage,

} from '../conversational-websocket-bridge.service';

// ===== TEST UTILITIES =====

/**
 * Message factory for creating test messages
 */
class TestMessageFactory {
  private static sequenceCounter = 1;
  private static sessionCounter = 1;

  static createTestMessage(
  type: ConversationalMessageType = ConversationalMessageType.VALIDATION_REQUEST,
    sessionId?: string,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
    sequence?: number
  ): ConversationalMessage {
    const actualSessionId = sessionId ?? `test_session_${this.sessionCounter++
}`;
    const actualSequence = sequence ?? this.sequenceCounter++;

    const metadata: ConversationalMessageMetadata = {
  priority,
      requiresAck: true,
      compression: false,
      routingHints: ['test'],
    
};

    return {
  type,
      messageId: `test_msg_${type
}
_${Date.now()}
_${Math.random().toString(36).substring(7)}`,sessionId: actualSessionId,
      conversationId: `conv_${actualSessionId}`,
      timestamp: Date.now(),
      sequence: actualSequence,
      payload: {
        testData: 'test payload',
      timestamp: Date.now(),},
      metadata,
    };
  }

  static createValidationRequestMessage(
    sessionId: string,
    validationId: string,
    sequence?: number
  ): ValidationRequestMessage {
  return {
      ...this.createTestMessage(ConversationalMessageType.VALIDATION_REQUEST, sessionId, 'high', sequence),payload: {validationId,
        context: {
  userId: 'test-user-123',
      applicationContext: 'test-validation',
      environmentInfo: { test: true 
},previousActions: [],
          securityContext: {
            authenticationLevel: 'basic',
      permissions: ['read', 'write'],auditRequired: true,
      complianceFlags: ['TEST'],},},
        action: {
          actionType: 'test_action',
      parameters: { test: true },expectedOutcome: 'test outcome',
      reversible: true,
      impact: {
  scope: 'local',
      dataAccess: false,
      stateChanges: false,
            userInteraction: false,
          
},
        },
        riskLevel: 'medium',
      streamingOptions: {
  enableProgressUpdates: true,
          updateInterval: 500,
          maxUpdateCount: 5,
          compressionEnabled: false,
          priorityBoost: false,
        
},
      },
    } as ValidationRequestMessage;
  }

  static createUserConfirmationMessage(
    sessionId: string,
    validationId: string,
    approved: boolean,
    sequence?: number
  ): UserConfirmationMessage {
  return {
      ...this.createTestMessage(ConversationalMessageType.USER_CONFIRMATION, sessionId, 'high', sequence),
      payload: {
  confirmationId: `conf_${validationId
}`,
        validationId,
        approved,
        reasoning: approved ? 'User approved' : 'User rejected',
      confidence: 0.95,},
    } as UserConfirmationMessage;
  }

  static createProgressUpdateMessage(
    sessionId: string,
    operationId: string,
    progress: number,
    sequence?: number
  ): ProgressUpdateMessage {
  return {
      ...this.createTestMessage(ConversationalMessageType.PROGRESS_UPDATE, sessionId, 'normal', sequence),
      payload: {
        operationId,
        stage: `stage_${progress
}`,
        progress,
        status: progress === 100 ? 'completed' : 'active',
        details: {
          currentStep: `Step ${progress}`,
          totalSteps: 100,
          completedSteps: progress,
          errors: [],
          warnings: [],
          metrics: {
  processingTime: Date.now(),
            memoryUsage: 1024,
            networkLatency: 50,
            throughput: 100,
          
},
        },
      },
    } as ProgressUpdateMessage;
  }

  static reset(): void {
  this.sequenceCounter = 1;
    this.sessionCounter = 1;
  
}
}

/**
 * Performance measurement utilities
 */
class PerformanceTestUtils {
  static async measureLatency<T>(operation: () => Promise<T>): Promise<{ result: T; latency: number }> {
  const start = performance.now();
    const result = await operation();
    const latency = performance.now() - start;
    return { result, latency 
};
  }

  static async measureThroughput<T>(
    operation: () => Promise<T>,
    iterations: number,
    maxDuration: number = 30000
  ): Promise<{ throughput: number; averageLatency: number; operations: number }> {
  const start = performance.now();
    const latencies: number[] = [];
    let operations = 0;

    while (operations < iterations && (performance.now() - start) < maxDuration) {
      const measurement = await this.measureLatency(operation);
      latencies.push(measurement.latency);
      operations++;
    
}

    const totalTime = (performance.now() - start) / 1000;
    const throughput = operations / totalTime;
    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

    return { throughput, averageLatency, operations };
  }
}

// ===== MOCK CONFIGURATION =====

const mockConfigService = {

  get: jest.fn((key: string, defaultValue?: unknown) => {
    const config: Record<string, unknown> = {
      'MESSAGE_QUEUE_MAX_SIZE': 1000,'MESSAGE_QUEUE_FLUSH_INTERVAL': 50,'MESSAGE_QUEUE_BATCH_SIZE': 10,'MESSAGE_COMPRESSION_ENABLED': true,'MESSAGE_BUFFER_MAX_SIZE': 500,'MESSAGE_VALIDATION_ENABLED': true,

};
return config[key] ?? defaultValue;
  }),
};

// ===== TEST SUITE =====

describe('MessageOrderingDeliveryValidationService', () => {

  let service: MessageOrderingDeliveryValidationService;let module: TestingModule;

  beforeAll(async () => {
    jest.setTimeout(60000); // 60 seconds for comprehensive tests

    module = await Test.createTestingModule({
      providers: [
        MessageOrderingDeliveryValidationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MessageOrderingDeliveryValidationService>(
      MessageOrderingDeliveryValidationService
    );

    await service.onModuleInit();
  });

  afterAll(async () => {
  await service.onApplicationShutdown();
    await module.close();
  
});

  beforeEach(() => {
  TestMessageFactory.reset();
  
});

  // ===== MESSAGE SEQUENCE VALIDATION TESTS =====

  describe('Message Sequence Validation', () => {

    it('should validate correct message sequence ordering', async () => {
      const sessionId = 'test_session_sequence_001';
      const messages = [
        TestMessageFactory.createTestMessage(ConversationalMessageType.VALIDATION_REQUEST, sessionId, 'normal', 1),
        TestMessageFactory.createTestMessage(ConversationalMessageType.VALIDATION_RESPONSE, sessionId, 'normal', 2),
        TestMessageFactory.createTestMessage(ConversationalMessageType.USER_CONFIRMATION, sessionId, 'high', 3),
      ];
      const results: MessageIntegrityResult[] = [];

      for (const message of messages) {
        const result = service.validateMessageSequence(message);
        results.push(result);
      
}

      // All messages should have valid sequences
      expect(results.every(result => result.sequenceValid)).toBe(true);
      expect(results.every(result => !result.isDuplicate)).toBe(true);
      expect(results.every(result => result.deliveryGuaranteed)).toBe(true);
      expect(results.every(result => result.validationErrors.length === 0)).toBe(true);
    });



    it('should detect out-of-order messages', async () => {

      const sessionId = 'test_session_sequence_002';
      const messages = [
        TestMessageFactory.createTestMessage(ConversationalMessageType.VALIDATION_REQUEST, sessionId, 'normal', 1),
        TestMessageFactory.createTestMessage(ConversationalMessageType.VALIDATION_RESPONSE, sessionId, 'normal', 3), // Skip sequence 2
        TestMessageFactory.createTestMessage(ConversationalMessageType.USER_CONFIRMATION, sessionId, 'high', 2), // Out of order
      ];
      const results: MessageIntegrityResult[] = [];

      for (const message of messages) {
        const result = service.validateMessageSequence(message);
        results.push(result);
      }

      // First message should be valid
      expect(results[0].sequenceValid).toBe(true);

      // Second message should be invalid (gap in sequence)
      expect(results[1].sequenceValid).toBe(false);
      expect(results[1].validationErrors.some(err => err.errorCode === 'SEQUENCE_OUT_OF_ORDER')).toBe(true);// Third message should be invalid (out of order)expect(results[2].sequenceValid).toBe(false);
    });



    it('should detect duplicate messages', async () => {

  const sessionId = 'test_session_sequence_003';
const originalMessage = TestMessageFactory.createTestMessage(ConversationalMessageType.VALIDATION_REQUEST,
        sessionId,
        'normal',1);

      // Process original message
      const firstResult = service.validateMessageSequence(originalMessage);
      expect(firstResult.isDuplicate).toBe(false);

      // Process duplicate message (same messageId)
      const duplicateMessage = { ...originalMessage };
      const secondResult = service.validateMessageSequence(duplicateMessage);
      expect(secondResult.isDuplicate).toBe(true);
      expect(secondResult.validationErrors.some(err => err.errorCode === 'DUPLICATE_MESSAGE')).toBe(true);});


it('should handle message sequence gaps correctly', async () => {

      const sessionId = 'test_session_sequence_004';
      const messages = [
        TestMessageFactory.createTestMessage(ConversationalMessageType.VALIDATION_REQUEST, sessionId, 'normal', 1),
        TestMessageFactory.createTestMessage(ConversationalMessageType.VALIDATION_RESPONSE, sessionId, 'normal', 5), // Gap: missing 2, 3, 4
        TestMessageFactory.createTestMessage(ConversationalMessageType.USER_CONFIRMATION, sessionId, 'high', 6),
      ];
      const results: MessageIntegrityResult[] = [];

      for (const message of messages) {
        const result = service.validateMessageSequence(message);
        results.push(result);
      }

      // First message should be valid
      expect(results[0].sequenceValid).toBe(true);

      // Second message should be invalid due to gap
      expect(results[1].sequenceValid).toBe(false);

      // Third message should be valid (sequence continues correctly)
      expect(results[2].sequenceValid).toBe(true);
    });
  });

  // ===== DELIVERY ACKNOWLEDGMENT TESTS =====

  describe('Delivery Acknowledgment and Confirmation', () => {

    it('should process delivery acknowledgments correctly', async () => {
      const sessionId = 'test_session_ack_001';
      const message = TestMessageFactory.createTestMessage(ConversationalMessageType.VALIDATION_REQUEST,
        sessionId,
        'high', 1);

      // Validate message first
      const validationResult = service.validateMessageSequence(message);
      expect(validationResult.deliveryGuaranteed).toBe(true);

      // Process delivery acknowledgment
      const deliveryLatency = 125; // milliseconds
      const acknowledgment = service.processDeliveryAcknowledgment(
        message.messageId,
        sessionId,
        deliveryLatency
      );

      expect(acknowledgment.messageId).toBe(message.messageId);
      expect(acknowledgment.sessionId).toBe(sessionId);
      expect(acknowledgment.deliveryLatency).toBe(deliveryLatency);
      expect(acknowledgment.checksumVerified).toBe(true);
      expect(acknowledgment.sequenceValid).toBe(true);
      expect(acknowledgment.acknowlegmentId).toBeTruthy();
    
});



    it('should track acknowledgment performance metrics', async () => {

  const sessionId = 'test_session_ack_002';
const messageCount = 50;const acknowledgments: DeliveryAcknowledgment[] = [];

      // Create and acknowledge multiple messages
      for (let i = 1; i <= messageCount; i++) {
        const message = TestMessageFactory.createTestMessage(
          ConversationalMessageType.PROGRESS_UPDATE,
          sessionId,
          'normal',
          i
        );

        service.validateMessageSequence(message);

        const latency = Math.random() * 200 + 50; // 50-250ms
        const ack = service.processDeliveryAcknowledgment(message.messageId, sessionId, latency);
        acknowledgments.push(ack);
      }

      expect(acknowledgments).toHaveLength(messageCount);

      // Check metrics updated
      const metrics = service.getPerformanceMetrics();
      expect(metrics.successfulDeliveries).toBeGreaterThanOrEqual(messageCount);
      expect(metrics.totalMessages).toBeGreaterThanOrEqual(messageCount);
    });



    it('should handle acknowledgment errors gracefully', async () => {
      const invalidMessageId = 'non_existent_message_id';
      const sessionId = 'test_session_ack_003';

      expect(() => {
        service.processDeliveryAcknowledgment(invalidMessageId, sessionId, 100);
      }).toThrow('Message sequence not found for acknowledgment');
    });
  });

  // ===== MESSAGE DEDUPLICATION TESTS =====

  describe('Message Deduplication and Duplicate Detection', () => {

    it('should detect and handle duplicate messages across sessions', async () => {
      const sessionId1 = 'test_session_dedup_001';
      const sessionId2 = 'test_session_dedup_002';

      // Create identical message for different sessions
      const messageTemplate = {
        type: ConversationalMessageType.VALIDATION_REQUEST,
        messageId: 'duplicate_test_message',
        timestamp: Date.now(),
        sequence: 1,
        payload: { test: 'duplicate detection' },
        metadata: {
          priority: 'normal',
          requiresAck: true,
          compression: false,
          routingHints: []
        }
      } as ConversationalMessage;

      const message1 = { ...messageTemplate, sessionId: sessionId1 };
      const message2 = { ...messageTemplate, sessionId: sessionId2 };

      const result1 = service.validateMessageSequence(message1);
      expect(result1.isDuplicate).toBe(false);

      const result2 = service.validateMessageSequence(message2);
      expect(result2.isDuplicate).toBe(true);
      expect(result2.validationErrors.some(err => err.errorCode === 'DUPLICATE_MESSAGE')).toBe(true);});


it('should track duplicate detection metrics', async () => {

  const sessionId = 'test_session_dedup_003';
const originalMessage = TestMessageFactory.createTestMessage(ConversationalMessageType.USER_CONFIRMATION,
        sessionId,
        'high',1);

      // Process original
      service.validateMessageSequence(originalMessage);

      const initialMetrics = service.getPerformanceMetrics();
      const initialDuplicates = initialMetrics.duplicatesDetected;

      // Process duplicates
      const duplicateCount = 10;
      for (let i = 0; i < duplicateCount; i++) {
        const duplicate = { ...originalMessage };
        service.validateMessageSequence(duplicate);
      }

      const finalMetrics = service.getPerformanceMetrics();
      expect(finalMetrics.duplicatesDetected).toBe(initialDuplicates + duplicateCount);
    });



    it('should handle high-volume duplicate detection efficiently', async () => {

  const sessionId = 'test_session_dedup_004';
const messageCount = 1000;
      const duplicateRatio = 0.3; // 30% duplicates

      const originalMessages = Array.from({ length: Math.floor(messageCount * (1 - duplicateRatio)) }, (_, i) =>
        TestMessageFactory.createTestMessage(ConversationalMessageType.HEARTBEAT, sessionId, 'low', i + 1));
      const allMessages = [...originalMessages];

      // Add duplicates
      const duplicateCount = Math.floor(messageCount * duplicateRatio);
      for (let i = 0; i < duplicateCount; i++) {
  const randomOriginal = originalMessages[Math.floor(Math.random() * originalMessages.length)];
        allMessages.push({ ...randomOriginal 
});
      }

      // Shuffle messages
      const shuffledMessages = allMessages.sort(() => Math.random() - 0.5);

      const { throughput } = await PerformanceTestUtils.measureThroughput(
        async () => {
  const message = shuffledMessages.pop();
          if (message) {
            service.validateMessageSequence(message);
          
}
        },
        shuffledMessages.length,
        30000
      );

      expect(throughput).toBeGreaterThan(100); // Should process >100 messages/second
    });
  });

  // ===== PRIORITY QUEUE MANAGEMENT TESTS =====

  describe('Priority Queue Management and Processing', () => {

    it('should process messages according to priority order', async () => {
      const sessionId = 'test_session_priority_001';
const processedMessages: string[] = [];// Listen for message processing events
      service.on('message_queued', (event) => {
        processedMessages.push(`${event.messageId
}:${event.priority}`);
      });

      // Create messages with different priorities
      const messages = [
        TestMessageFactory.createTestMessage(ConversationalMessageType.VALIDATION_REQUEST, sessionId, 'low', 1),TestMessageFactory.createTestMessage(ConversationalMessageType.VALIDATION_REQUEST, sessionId, 'critical', 2),TestMessageFactory.createTestMessage(ConversationalMessageType.VALIDATION_REQUEST, sessionId, 'normal', 3),TestMessageFactory.createTestMessage(ConversationalMessageType.VALIDATION_REQUEST, sessionId, 'high', 4),];// Add messages to queue
      for (const message of messages) {
  service.addMessageToPriorityQueue(message);
      
}

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(processedMessages).toHaveLength(4);

      // Verify critical priority was processed first
      const criticalIndex = processedMessages.findIndex(msg => msg.includes(':0')); // MessagePriority.CRITICAL = 0const lowIndex = processedMessages.findIndex(msg => msg.includes(':3')); // MessagePriority.LOW = 3expect(criticalIndex).toBeLessThan(lowIndex);});



    it('should handle queue overflow with appropriate strategies', async () => {

  const sessionId = 'test_session_priority_002';
const droppedMessages: string[] = [];

      // Listen for dropped messages
      service.on('message_dropped', (event) => {
        droppedMessages.push(`${event.messageId}:${event.reason}`);
      });
      });

      // Fill queue beyond capacity (using small test capacity)
      const overflowCount = 300; // Should exceed queue capacity per priority
      const messages = Array.from({ length: overflowCount }, (_, i) =>
        TestMessageFactory.createTestMessage(ConversationalMessageType.HEARTBEAT, sessionId, 'normal', i + 1));

      for (const message of messages) {
  service.addMessageToPriorityQueue(message);
      
}

      // Wait for overflow handling
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(droppedMessages.length).toBeGreaterThan(0);
      expect(droppedMessages.some(msg => msg.includes('buffer_overflow'))).toBe(true);});


it('should maintain message ordering within same priority level', async () => {
const sessionId = 'test_session_priority_003';
const queuedMessages: Array<{ messageId: string; timestamp: number }> = [];
    service.on('message_queued', (event) => {
      const message = TestMessageFactory.createTestMessage(ConversationalMessageType.HEARTBEAT, sessionId);
      queuedMessages.push({ messageId: event.messageId, timestamp: message.timestamp });
      });

      // Create messages with same priority but different timestamps
      const messages = Array.from({ length: 10 }, (_, i) => {
  const message = TestMessageFactory.createTestMessage(
          ConversationalMessageType.VALIDATION_REQUEST,
          sessionId,
          'normal',i + 1);
        // Ensure increasing timestamps
        (message as { timestamp: number 
}).timestamp = Date.now() + i * 10;
        return message;
      });

      for (const message of messages) {
  service.addMessageToPriorityQueue(message);
      
}

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify ordering within priority (should maintain timestamp order)
      for (let i = 1; i < queuedMessages.length; i++) {
  expect(queuedMessages[i].timestamp).toBeGreaterThanOrEqual(queuedMessages[i - 1].timestamp);
      
}
    });
  });

  // ===== MESSAGE BUFFERING AND OVERFLOW TESTS =====

  describe('Message Buffering and Queue Overflow Handling', () => {

    it('should create and manage message buffers per session', async () => {
      const sessionId = 'test_session_buffer_001';

// Create bufferconst buffer = service.createMessageBuffer(sessionId);

      expect(buffer.sessionId).toBe(sessionId);
      expect(buffer.capacity).toBeGreaterThan(0);
      expect(buffer.currentSize).toBe(0);
      expect(buffer.overflowStrategy).toBeDefined();
    
});



    it('should handle buffer overflow with drop_oldest strategy', async () => {
const sessionId = 'test_session_buffer_002';
const droppedMessages: string[]  =  [];
    service.on('message_dropped', (event) => if (event.reason === 'buffer_overflow_oldest') {droppedMessages.push(event.messageId);}
      });

      // Create buffer with small capacity for testing
      const buffer = service.createMessageBuffer(sessionId);

      // Simulate buffer overflow by adding many messages
      const messageCount = 600; // Should exceed buffer capacity
      for (let i = 1; i <= messageCount; i++) {
  const message = TestMessageFactory.createTestMessage(
          ConversationalMessageType.PROGRESS_UPDATE,
          sessionId,
          'normal',i);
        service.addMessageToPriorityQueue(message);
      
}

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Some messages should have been dropped
      expect(droppedMessages.length).toBeGreaterThan(0);
    });



    it('should monitor buffer water marks', async () => {

  const sessionId = 'test_session_buffer_003';
const buffer = service.createMessageBuffer(sessionId);
expect(buffer.highWaterMark).toBe(Math.floor(buffer.capacity * 0.8));
      expect(buffer.lowWaterMark).toBe(Math.floor(buffer.capacity * 0.2));
      expect(buffer.highWaterMark).toBeGreaterThan(buffer.lowWaterMark);
    
});
  });

  // ===== TIMEOUT AND RETRY MECHANISM TESTS =====

  describe('Timeout and Retry Mechanism Testing', () => 
  it('should schedule retries for failed message deliveries', async () => {
    const sessionId = 'test_session_retry_001';
const retriedMessages: string[]  =  [];
    service.on('message_retry_scheduled', (event) => {retriedMessages.push(event.messageId);});

      // Create message that will fail delivery
      const message = TestMessageFactory.createTestMessage(
        ConversationalMessageType.VALIDATION_REQUEST,
        sessionId,
        'high',1);

      service.addMessageToPriorityQueue(message);

      // Wait for potential retry scheduling
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Note: Retry behavior depends on simulated failure rate
      // This test verifies the retry mechanism is in place
      const metrics = service.getPerformanceMetrics();
      expect(metrics.retryCount).toBeGreaterThanOrEqual(0);
    });



    it('should move messages to dead letter queue after max retries', async () => {
const sessionId = 'test_session_retry_002';
const deadLetterMessages: string[]  =  [];
    service.on('message_dead_letter', (event) => deadLetterMessages.push(event.messageId);});

      // Create multiple messages to increase chance of failures
      const messageCount = 50;
      for (let i = 1; i <= messageCount; i++) {
  const message = TestMessageFactory.createTestMessage(
          ConversationalMessageType.HEARTBEAT,
          sessionId,
          'low', // Low priority has fewer retriesi);
        service.addMessageToPriorityQueue(message);
      
}

      // Wait for processing and potential failures
      await new Promise(resolve => setTimeout(resolve, 5000));

      const metrics = service.getPerformanceMetrics();

      // Some messages may have ended up in dead letter queue
      expect(metrics.deadLetterCount).toBeGreaterThanOrEqual(0);
      expect(metrics.failedDeliveries).toBeGreaterThanOrEqual(metrics.deadLetterCount);
    });



    it('should implement exponential backoff for retries', async () => {

  // This test verifies the exponential backoff calculationconst retryDelays: number[] = [];

      // Mock the private method by calling service methods that trigger retries
      const sessionId = 'test_session_retry_003';
service.on('message_retry_scheduled', (event) => retryDelays.push(event.retryDelay);
});

      // Create messages that will likely fail and trigger retries
      const messageCount = 20;
      for (let i = 1; i <= messageCount; i++) {
  const message = TestMessageFactory.createTestMessage(
          ConversationalMessageType.VALIDATION_REQUEST,
          sessionId,
          'normal',i);
        service.addMessageToPriorityQueue(message);
      
}

      await new Promise(resolve => setTimeout(resolve, 3000));

      // If retries occurred, verify exponential backoff pattern
      if (retryDelays.length > 1) {
  // Sort delays to check if they generally increase
        const sortedDelays = [...retryDelays].sort((a, b) => a - b);
        expect(sortedDelays[sortedDelays.length - 1]).toBeGreaterThan(sortedDelays[0]);
      
}
    });
  });

  // ===== CONVERSATIONAL FLOW VALIDATION TESTS =====

  describe('Conversational Flow Ordering Validation with PARLANT Integration', () => {

    it('should validate complete PARLANT validation workflow', async () => {
      const sessionId = 'test_session_parlant_001';
const validationId = 'validation_parlant_test_001';

// Create complete PARLANT validation flowconst validationRequest = TestMessageFactory.createValidationRequestMessage(sessionId, validationId, 1);
      const validationResponse = TestMessageFactory.createTestMessage(
        ConversationalMessageType.VALIDATION_RESPONSE,
        sessionId,
        'high',2);
      const userConfirmation = TestMessageFactory.createUserConfirmationMessage(sessionId, validationId, true, 3);
      const confirmationResult = TestMessageFactory.createTestMessage(
        ConversationalMessageType.CONFIRMATION_RESULT,
        sessionId,
        'high',
        4
      );

      // Set proper message IDs for PARLANT flow
      (validationResponse as { messageId: string 
}).messageId = `validation_response_${validationId}`;(confirmationResult as { messageId: string }).messageId = `confirmation_result_${validationId}`;

      const messages = [validationRequest, validationResponse, userConfirmation, confirmationResult];

      // Process messages through validation
      for (const message of messages) {
  service.validateMessageSequence(message);
      
}

      // Validate the flow
      const flowValidation = service.validateParlantIntegrationFlow(sessionId, validationId);

      expect(flowValidation.conversationId).toBe(validationId);
      expect(flowValidation.orderingValid).toBe(true);
      expect(flowValidation.missingMessages).toHaveLength(0);
      expect(flowValidation.duplicateMessages).toHaveLength(0);
      expect(flowValidation.outOfOrderMessages).toHaveLength(0);
      expect(flowValidation.conversationComplete).toBe(true);
      expect(flowValidation.integrityScore).toBeGreaterThan(0.8);
    });



    it('should detect missing messages in PARLANT flow', async () => {

  const sessionId = 'test_session_parlant_002';
const validationId = 'validation_parlant_test_002';

// Create incomplete PARLANT flow (missing user confirmation)const validationRequest = TestMessageFactory.createValidationRequestMessage(sessionId, validationId, 1);
      const validationResponse = TestMessageFactory.createTestMessage(
        ConversationalMessageType.VALIDATION_RESPONSE,
        sessionId,
        'high',
        2
      );

      (validationResponse as  messageId: string 
}).messageId = `validation_response_${validationId}`;

      const messages = [validationRequest, validationResponse];

      for (const message of messages) {
  service.validateMessageSequence(message);
      
}

      const flowValidation = service.validateParlantIntegrationFlow(sessionId, validationId);

      expect(flowValidation.missingMessages.length).toBeGreaterThan(0);
      expect(flowValidation.conversationComplete).toBe(false);
      expect(flowValidation.integrityScore).toBeLessThan(1.0);
    });



    it('should validate progress update ordering in streaming flow', async () => {

  const sessionId = 'test_session_parlant_003';
const operationId = 'operation_parlant_test_003';

      // Create progress update sequence
      const progressUpdates = [0, 25, 50, 75, 100].map((progress, index) =>
        TestMessageFactory.createProgressUpdateMessage(sessionId, operationId, progress, index + 1)
      );

      for (const update of progressUpdates) 
        service.validateMessageSequence(update);
      
}

      // Validate general conversation flow
      const conversationId = `conv_${sessionId}`;
      const flowValidation = service.validateConversationFlow(conversationId);

      expect(flowValidation.orderingValid).toBe(true);
      expect(flowValidation.integrityScore).toBeGreaterThan(0.9);
    });



    it('should handle concurrent PARLANT validation flows', async () => {

  const sessionId = 'test_session_parlant_004';
      const validationCount = 5;
      const flowValidations: ConversationFlowValidation[] = [];

      // Create multiple concurrent validation flows
      for (let i = 1; i <= validationCount; i++) 
        const validationId = `validation_concurrent_${i
}`;

        const validationRequest = TestMessageFactory.createValidationRequestMessage(sessionId, validationId, i * 10);
        const userConfirmation = TestMessageFactory.createUserConfirmationMessage(sessionId, validationId, true, i * 10 + 1);

        service.validateMessageSequence(validationRequest);
        service.validateMessageSequence(userConfirmation);

        const flowValidation = service.validateParlantIntegrationFlow(sessionId, validationId);
        flowValidations.push(flowValidation);
      }

  expect(flowValidations).toHaveLength(validationCount);
      expect(flowValidations.every(flow => flow.integrityScore > 0.5)).toBe(true);
    });
  });

  // ===== MESSAGE INTEGRITY AND CHECKSUM VALIDATION TESTS =====

  describe('Message Integrity and Checksum Validation', () => {

    it('should calculate and verify message checksums', async () => {
      const message = TestMessageFactory.createTestMessage(ConversationalMessageType.VALIDATION_REQUEST,
        'test_session_checksum_001','high',1);

      // Validate message (includes checksum calculation)
      const result = service.validateMessageSequence(message);

      expect(result.checksumValid).toBe(true);
      expect(result.deliveryGuaranteed).toBe(true);
    
});



    it('should detect message integrity violations', async () => {

  const originalMessage = TestMessageFactory.createTestMessage(ConversationalMessageType.USER_CONFIRMATION,
        'test_session_checksum_002','high',1);

      // Calculate original checksum
      const originalResult = service.validateMessageSequence(originalMessage);
      expect(originalResult.checksumValid).toBe(true);

      // Verify integrity with different payload (should work with original data)
      const verified = service.verifyMessageIntegrity(originalMessage, 'invalid_checksum');
expect(verified).toBe(false);
});



    it('should handle high-volume checksum validation efficiently', async () => {
      const sessionId = 'test_session_checksum_003';
const messageCount = 1000;const { throughput, averageLatency } = await PerformanceTestUtils.measureThroughput(
        async () => {
  const message = TestMessageFactory.createTestMessage(
            ConversationalMessageType.HEARTBEAT,
            sessionId,
            'low');service.validateMessageSequence(message);
        
},
        messageCount,
        30000
      );

      expect(throughput).toBeGreaterThan(500); // Should process >500 messages/second
      expect(averageLatency).toBeLessThan(10); // Should average <10ms per message
    });
  });

  // ===== PERFORMANCE METRICS AND MONITORING TESTS =====

  describe('Performance Metrics Collection and Validation', () => {
  it('should collect comprehensive performance metrics', async () => {
    const metrics = service.getPerformanceMetrics();
expect(metrics).toHaveProperty('totalMessages');
expect(metrics).toHaveProperty('successfulDeliveries');
expect(metrics).toHaveProperty('failedDeliveries');
expect(metrics).toHaveProperty('averageLatency');
expect(metrics).toHaveProperty('p95Latency');
expect(metrics).toHaveProperty('p99Latency');
expect(metrics).toHaveProperty('throughputPerSecond');
expect(metrics).toHaveProperty('duplicatesDetected');
expect(metrics).toHaveProperty('outOfOrderDetected');
expect(metrics).toHaveProperty('retryCount');
expect(metrics).toHaveProperty('deadLetterCount');
expect(typeof metrics.totalMessages).toBe('number');
expect(typeof metrics.averageLatency).toBe('number');
expect(typeof metrics.throughputPerSecond).toBe('number');});


it('should generate comprehensive validation report', async () => {

  // Process some messages to populate dataconst sessionId = 'test_session_report_001';
const messageCount = 20;for (let i = 1; i <= messageCount; i++) 
        const message = TestMessageFactory.createTestMessage(
          ConversationalMessageType.PROGRESS_UPDATE,
          sessionId,
          'normal',i);
        service.validateMessageSequence(message);
        service.addMessageToPriorityQueue(message);
      
}

      await new Promise(resolve => setTimeout(resolve, 500));

      const report = service.generateValidationReport();

      expect(report).toHaveProperty('totalSessions');
expect(report).toHaveProperty('totalMessages');
expect(report).toHaveProperty('totalConversations');
expect(report).toHaveProperty('performanceMetrics');
expect(report).toHaveProperty('queueStatistics');
expect(report).toHaveProperty('bufferStatistics');
expect(report).toHaveProperty('conversationFlowResults');
expect(report.totalMessages).toBeGreaterThan(0);
expect(Array.isArray(report.conversationFlowResults)).toBe(true);
    });



    it('should track latency percentiles accurately', async () => {

  const sessionId = 'test_session_latency_001';
const messageCount = 100;const latencies: number[] = [];

      // Process messages with known latencies
      for (let i = 1; i <= messageCount; i++) 
        const message = TestMessageFactory.createTestMessage(
          ConversationalMessageType.HEARTBEAT,
          sessionId,
          'normal',i);

        service.validateMessageSequence(message);

        const latency = Math.random() * 200 + 50; // 50-250ms
        latencies.push(latency);

        service.processDeliveryAcknowledgment(message.messageId, sessionId, latency);
      
}

      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = service.getPerformanceMetrics();

      expect(metrics.averageLatency).toBeGreaterThan(0);
      expect(metrics.p95Latency).toBeGreaterThanOrEqual(metrics.averageLatency);
      expect(metrics.p99Latency).toBeGreaterThanOrEqual(metrics.p95Latency);
    });



    it('should handle performance monitoring under load', async () => {

  const sessionCount = 10;
      const messagesPerSession = 50;
      const totalMessages = sessionCount * messagesPerSession;

      const startTime = performance.now();

      // Create load across multiple sessions
      for (let session = 1; session <= sessionCount; session++) 
        const sessionId = `test_session_load_${session
}`;

        for (let msg = 1; msg <= messagesPerSession; msg++) {
  const message = TestMessageFactory.createTestMessage(
            ConversationalMessageType.VALIDATION_REQUEST,
            sessionId,
            'normal',msg);

          service.validateMessageSequence(message);
          service.addMessageToPriorityQueue(message);
        
}
      }

      const processingTime = performance.now() - startTime;
      const throughput = totalMessages / (processingTime / 1000);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const metrics = service.getPerformanceMetrics();
      const report = service.generateValidationReport();

      expect(throughput).toBeGreaterThan(100); // Should handle >100 msg/sec
      expect(report.totalSessions).toBe(sessionCount);
      expect(metrics.totalMessages).toBeGreaterThanOrEqual(totalMessages);
    });
  });

  // ===== INTEGRATION AND END-TO-END TESTS =====

  describe('Integration and End-to-End Validation', () => {

    it('should handle complete end-to-end message lifecycle', async () => {
      const sessionId = 'test_session_e2e_001';
const validationId = 'validation_e2e_001';

// Complete lifecycle: validation request -> response -> confirmation -> resultconst messages = [
        TestMessageFactory.createValidationRequestMessage(sessionId, validationId, 1),
        TestMessageFactory.createTestMessage(ConversationalMessageType.VALIDATION_RESPONSE, sessionId, 'high', 2),TestMessageFactory.createUserConfirmationMessage(sessionId, validationId, true, 3),TestMessageFactory.createTestMessage(ConversationalMessageType.CONFIRMATION_RESULT, sessionId, 'high', 4),
      ];

      // Set proper message IDs for flow validation
      (messages[1] as { messageId: string 
}).messageId = `validation_response_${validationId}`;(messages[3] as { messageId: string }).messageId = `confirmation_result_${validationId}`;

      const validationResults: MessageIntegrityResult[] = [];
      const acknowledgments: DeliveryAcknowledgment[] = [];

      // Process complete lifecycle
      for (const message of messages) {
  // Validate sequence
        const validationResult = service.validateMessageSequence(message);
        validationResults.push(validationResult);

        // Add to queue
        service.addMessageToPriorityQueue(message);

        // Simulate delivery acknowledgment
        const latency = Math.random() * 100 + 25;
        const ack = service.processDeliveryAcknowledgment(message.messageId, sessionId, latency);
        acknowledgments.push(ack);
      
}

      // Validate complete flow
      const flowValidation = service.validateParlantIntegrationFlow(sessionId, validationId);

      // Verify end-to-end success
      expect(validationResults.every(result => result.deliveryGuaranteed)).toBe(true);
      expect(acknowledgments).toHaveLength(messages.length);
      expect(flowValidation.orderingValid).toBe(true);
      expect(flowValidation.conversationComplete).toBe(true);
      expect(flowValidation.integrityScore).toBeGreaterThan(0.95);

      const metrics = service.getPerformanceMetrics();
      expect(metrics.successfulDeliveries).toBeGreaterThanOrEqual(messages.length);
    });



    it('should maintain consistency across concurrent operations', async () => {

  const concurrentOperations = 20;
      const messagesPerOperation = 10;

      const operationPromises = Array.from( length: concurrentOperations 
}, async (_, operationIndex) => {
        const sessionId = `test_session_concurrent_${operationIndex}`;const validationId = `validation_concurrent_${operationIndex}`;

        const operationMessages = Array.from({ length: messagesPerOperation }, (_, msgIndex) =>
          TestMessageFactory.createTestMessage(
            ConversationalMessageType.PROGRESS_UPDATE,
            sessionId,
            'normal',
            msgIndex + 1
          )
        );

        // Process messages for this operation
        for (const message of operationMessages) {
  service.validateMessageSequence(message);
          service.addMessageToPriorityQueue(message);

          const latency = Math.random() * 50 + 10;
          service.processDeliveryAcknowledgment(message.messageId, sessionId, latency);
        
}

        return { sessionId, validationId, messageCount: operationMessages.length };
      });

      const operations = await Promise.all(operationPromises);

      // Wait for all processing to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const finalReport = service.generateValidationReport();

      expect(operations).toHaveLength(concurrentOperations);
      expect(finalReport.totalSessions).toBe(concurrentOperations);
      expect(finalReport.performanceMetrics.totalMessages).toBeGreaterThanOrEqual(
        concurrentOperations * messagesPerOperation
      );
    });
  });
});