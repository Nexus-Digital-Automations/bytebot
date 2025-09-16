/**
 * Sanitization Pipe Test Suite - Input Sanitization and Security Validation
 *
 * Tests input sanitization, XSS prevention, injection attack prevention,
 * and data transformation security measures
 *
 * @author Claude Code
 * @version 1.0.0
 * @since Common Module Security Testing Phase
 */

import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { SanitizationPipe } from '../sanitization.pipe';

describe('SanitizationPipe', () => {
  let pipe: SanitizationPipe;

  beforeEach(() => {
    pipe = new SanitizationPipe();
  });

  describe('Basic Sanitization', () => {
    it('should be defined', () => {
      expect(pipe).toBeDefined();
    });

    it('should sanitize HTML tags from string input', async () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const metadata: ArgumentMetadata = { type: 'body' };

      const result = await pipe.transform(maliciousInput, metadata);

      expect(result).toBe('Hello World');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should sanitize SQL injection attempts', async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const metadata: ArgumentMetadata = { type: 'query' };

      const result = await pipe.transform(sqlInjection, metadata);

      expect(result).not.toContain('DROP TABLE');
      expect(result).not.toContain('--');
      expect(result).not.toContain(';');
    });

    it('should preserve safe content', async () => {
      const safeInput = 'This is a safe string with normal characters 123';
      const metadata: ArgumentMetadata = { type: 'body' };

      const result = await pipe.transform(safeInput, metadata);

      expect(result).toBe(safeInput);
    });
  });

  describe('XSS Prevention', () => {
    it('should remove script tags', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        '<SCRIPT>alert("xss")</SCRIPT>',
        '<script src="malicious.js"></script>',
        '<script>document.cookie</script>',
      ];

      for (const xss of xssAttempts) {
        const result = await pipe.transform(xss, { type: 'body' });
        expect(result).not.toContain('<script');
        expect(result).not.toContain('</script>');
        expect(result).not.toContain('alert');
      }
    });

    it('should remove dangerous event handlers', async () => {
      const dangerousInputs = [
        '<div onclick="alert(1)">Click me</div>',
        '<img src="x" onerror="alert(1)">',
        '<body onload="maliciousCode()">',
        '<input onfocus="steal_data()">',
      ];

      for (const input of dangerousInputs) {
        const result = await pipe.transform(input, { type: 'body' });
        expect(result).not.toContain('onclick');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onload');
        expect(result).not.toContain('onfocus');
      }
    });

    it('should handle javascript: URLs', async () => {
      const javascriptUrls = [
        '<a href="javascript:alert(1)">Link</a>',
        '<iframe src="javascript:alert(1)"></iframe>',
        'javascript:void(0)',
      ];

      for (const url of javascriptUrls) {
        const result = await pipe.transform(url, { type: 'body' });
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('alert');
      }
    });

    it('should sanitize data: URLs with dangerous content', async () => {
      const dataUrls = [
        'data:text/html,<script>alert(1)</script>',
        'data:application/javascript,alert(1)',
        '<img src="data:text/html,<script>alert(1)</script>">',
      ];

      for (const dataUrl of dataUrls) {
        const result = await pipe.transform(dataUrl, { type: 'body' });
        expect(result).not.toContain('data:text/html');
        expect(result).not.toContain('data:application/javascript');
        expect(result).not.toContain('<script>');
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should sanitize common SQL injection patterns', async () => {
      const sqlInjections = [
        "1' OR '1'='1",
        "admin'--",
        "'; DROP TABLE users; --",
        '1; DELETE FROM table WHERE 1=1;',
        'UNION SELECT * FROM users',
        "' OR 1=1#",
      ];

      for (const injection of sqlInjections) {
        const result = await pipe.transform(injection, { type: 'query' });
        expect(result).not.toContain('DROP TABLE');
        expect(result).not.toContain('DELETE FROM');
        expect(result).not.toContain('UNION SELECT');
        expect(result).not.toContain("OR '1'='1");
      }
    });

    it('should handle SQL comments', async () => {
      const sqlComments = [
        'admin/*comment*/password',
        'user--comment',
        'test#comment',
        'value/**/OR/**/1=1',
      ];

      for (const comment of sqlComments) {
        const result = await pipe.transform(comment, { type: 'query' });
        expect(result).not.toContain('/*');
        expect(result).not.toContain('*/');
        expect(result).not.toContain('--');
        expect(result).not.toContain('#');
      }
    });

    it('should sanitize SQL functions and keywords', async () => {
      const sqlKeywords = [
        'SELECT * FROM users',
        'INSERT INTO table',
        'UPDATE users SET',
        'DELETE FROM table',
        'CREATE TABLE test',
        'ALTER TABLE users',
        'DROP DATABASE',
      ];

      for (const keyword of sqlKeywords) {
        const result = await pipe.transform(keyword, { type: 'query' });
        expect(result).not.toContain('SELECT');
        expect(result).not.toContain('INSERT');
        expect(result).not.toContain('UPDATE');
        expect(result).not.toContain('DELETE');
        expect(result).not.toContain('CREATE');
        expect(result).not.toContain('DROP');
      }
    });
  });

  describe('Object and Array Sanitization', () => {
    it('should sanitize object properties', async () => {
      const maliciousObject = {
        name: 'John<script>alert(1)</script>',
        email: 'test@example.com',
        comment: "'; DROP TABLE users; --",
        description: '<img src="x" onerror="alert(1)">',
      };

      const result = await pipe.transform(maliciousObject, { type: 'body' });

      expect(result.name).toBe('John');
      expect(result.name).not.toContain('<script>');
      expect(result.email).toBe('test@example.com'); // Safe email preserved
      expect(result.comment).not.toContain('DROP TABLE');
      expect(result.description).not.toContain('onerror');
    });

    it('should sanitize nested objects', async () => {
      const nestedObject = {
        user: {
          profile: {
            bio: '<script>steal_cookies()</script>Normal bio text',
            settings: {
              theme: 'dark',
              notifications: "true'; DROP TABLE settings; --",
            },
          },
        },
        metadata: {
          source: '<iframe src="javascript:alert(1)"></iframe>',
        },
      };

      const result = await pipe.transform(nestedObject, { type: 'body' });

      expect(result.user.profile.bio).toBe('Normal bio text');
      expect(result.user.profile.bio).not.toContain('<script>');
      expect(result.user.profile.settings.notifications).not.toContain(
        'DROP TABLE',
      );
      expect(result.metadata.source).not.toContain('<iframe>');
      expect(result.metadata.source).not.toContain('javascript:');
    });

    it('should sanitize arrays of strings', async () => {
      const maliciousArray = [
        'safe string',
        '<script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        '<img src="x" onerror="alert(1)">',
      ];

      const result = await pipe.transform(maliciousArray, { type: 'body' });

      expect(result[0]).toBe('safe string'); // Safe content preserved
      expect(result[1]).not.toContain('<script>'); // XSS removed
      expect(result[2]).not.toContain('DROP TABLE'); // SQL injection removed
      expect(result[3]).not.toContain('onerror'); // Event handler removed
    });

    it('should sanitize arrays of objects', async () => {
      const objectArray = [
        { name: 'Safe User', role: 'user' },
        { name: '<script>alert(1)</script>Admin', role: 'admin' },
        { name: 'Test', comment: "'; DROP TABLE users; --" },
      ];

      const result = await pipe.transform(objectArray, { type: 'body' });

      expect(result[0].name).toBe('Safe User'); // Safe content preserved
      expect(result[1].name).toBe('Admin'); // XSS removed, safe part preserved
      expect(result[1].name).not.toContain('<script>');
      expect(result[2].comment).not.toContain('DROP TABLE'); // SQL injection removed
    });
  });

  describe('Special Characters and Encoding', () => {
    it('should handle Unicode and special characters safely', async () => {
      const unicodeInputs = [
        'Hello 世界',
        'Emoji test 🚀🎉',
        'Accented characters: café, naïve, résumé',
        'Mathematical symbols: ∑ ∆ ∞',
      ];

      for (const input of unicodeInputs) {
        const result = await pipe.transform(input, { type: 'body' });
        expect(result).toBe(input); // Unicode should be preserved
      }
    });

    it('should handle encoded malicious content', async () => {
      const encodedMalicious = [
        '%3Cscript%3Ealert(1)%3C/script%3E', // URL encoded script tag
        '&#60;script&#62;alert(1)&#60;/script&#62;', // HTML entity encoded
        '&lt;script&gt;alert(1)&lt;/script&gt;', // HTML entities
        '\u003cscript\u003ealert(1)\u003c/script\u003e', // Unicode escaped
      ];

      for (const encoded of encodedMalicious) {
        const result = await pipe.transform(encoded, { type: 'body' });
        expect(result).not.toContain('script');
        expect(result).not.toContain('alert');
      }
    });

    it('should preserve safe special characters', async () => {
      const safeSpecialChars = [
        'Price: $29.99',
        'Email: user@domain.com',
        'Math: (x + y) * z = result',
        'Percentage: 95% complete',
        'Date: 2024-01-01',
      ];

      for (const input of safeSpecialChars) {
        const result = await pipe.transform(input, { type: 'body' });
        expect(result).toBe(input);
      }
    });
  });

  describe('Type-Specific Sanitization', () => {
    it('should handle different argument types', async () => {
      const testValue = '<script>alert(1)</script>test';

      const bodyResult = await pipe.transform(testValue, { type: 'body' });
      const queryResult = await pipe.transform(testValue, { type: 'query' });
      const paramResult = await pipe.transform(testValue, { type: 'param' });

      expect(bodyResult).toBe('test');
      expect(queryResult).toBe('test');
      expect(paramResult).toBe('test');

      // All should remove the script tag
      expect(bodyResult).not.toContain('<script>');
      expect(queryResult).not.toContain('<script>');
      expect(paramResult).not.toContain('<script>');
    });

    it('should handle null and undefined values', async () => {
      const nullResult = await pipe.transform(null, { type: 'body' });
      const undefinedResult = await pipe.transform(undefined, { type: 'body' });

      expect(nullResult).toBeNull();
      expect(undefinedResult).toBeUndefined();
    });

    it('should handle non-string primitive types', async () => {
      const numberResult = await pipe.transform(123, { type: 'body' });
      const booleanResult = await pipe.transform(true, { type: 'body' });

      expect(numberResult).toBe(123);
      expect(booleanResult).toBe(true);
    });
  });

  describe('Configuration and Options', () => {
    it('should respect sanitization options', () => {
      const strictPipe = new SanitizationPipe({
        allowedTags: [],
        allowedAttributes: {},
        stripIgnoreTag: true,
      });

      expect(strictPipe).toBeDefined();
    });

    it('should handle custom allowed tags', async () => {
      const permissivePipe = new SanitizationPipe({
        allowedTags: ['b', 'i', 'em', 'strong'],
        allowedAttributes: {
          a: ['href'],
        },
      });

      const inputWithAllowedTags =
        '<b>Bold</b> and <i>italic</i> text with <script>alert(1)</script>';
      const result = await permissivePipe.transform(inputWithAllowedTags, {
        type: 'body',
      });

      expect(result).toContain('<b>Bold</b>');
      expect(result).toContain('<i>italic</i>');
      expect(result).not.toContain('<script>');
    });
  });

  describe('Error Handling', () => {
    it('should handle circular references in objects', async () => {
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      // Should not throw an error, should handle gracefully
      await expect(
        pipe.transform(circularObject, { type: 'body' }),
      ).resolves.toBeDefined();
    });

    it('should handle very large inputs', async () => {
      const largeInput =
        'a'.repeat(10000) + '<script>alert(1)</script>' + 'b'.repeat(10000);

      const result = await pipe.transform(largeInput, { type: 'body' });

      expect(result).not.toContain('<script>');
      expect(result.length).toBeLessThan(largeInput.length); // Script should be removed
    });

    it('should handle malformed HTML', async () => {
      const malformedInputs = [
        '<script<script>alert(1)</script>',
        '<scr<script>ipt>alert(1)</script>',
        '<<script>alert(1)<</script>',
        '<script>alert(1)<script>',
      ];

      for (const malformed of malformedInputs) {
        const result = await pipe.transform(malformed, { type: 'body' });
        expect(result).not.toContain('alert');
        expect(result).not.toContain('<script>');
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle high-volume sanitization efficiently', async () => {
      const inputs = Array.from(
        { length: 1000 },
        (_, i) => `<script>alert(${i})</script>Safe content ${i}`,
      );

      const startTime = Date.now();

      const results = await Promise.all(
        inputs.map((input) => pipe.transform(input, { type: 'body' })),
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(results).toHaveLength(1000);

      // Verify all scripts were removed
      results.forEach((result, index) => {
        expect(result).toBe(`Safe content ${index}`);
        expect(result).not.toContain('<script>');
      });
    });

    it('should handle deeply nested objects efficiently', async () => {
      let deepObject: any = { value: '<script>alert(1)</script>safe' };

      // Create 100 levels of nesting
      for (let i = 0; i < 100; i++) {
        deepObject = { nested: deepObject };
      }

      const result = await pipe.transform(deepObject, { type: 'body' });

      // Navigate to the deeply nested value
      let current = result;
      for (let i = 0; i < 100; i++) {
        current = current.nested;
      }

      expect(current.value).toBe('safe');
      expect(current.value).not.toContain('<script>');
    });

    it('should maintain referential integrity for safe objects', async () => {
      const sharedObject = { safe: 'content' };
      const container = {
        ref1: sharedObject,
        ref2: sharedObject,
      };

      const result = await pipe.transform(container, { type: 'body' });

      // Both references should point to the same sanitized object
      expect(result.ref1).toBe(result.ref2);
      expect(result.ref1.safe).toBe('content');
    });
  });
});
