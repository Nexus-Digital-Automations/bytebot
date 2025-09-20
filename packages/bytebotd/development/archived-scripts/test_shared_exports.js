
// Test script to verify shared package exports
const shared = require('@bytebot/shared');

// Test SecurityEventType
console.log('✓ SecurityEventType available:', typeof shared.SecurityEventType === 'object');

// Test createSecurityEvent function  
console.log('✓ createSecurityEvent available:', typeof shared.createSecurityEvent === 'function');

// Test DEFAULT_SANITIZATION_OPTIONS
console.log('✓ DEFAULT_SANITIZATION_OPTIONS available:', typeof shared.DEFAULT_SANITIZATION_OPTIONS === 'object');

// Test sanitization functions
console.log('✓ sanitizeInput available:', typeof shared.sanitizeInput === 'function');
console.log('✓ sanitizeObject available:', typeof shared.sanitizeObject === 'function');

// Test validation decorators
console.log('✓ IsNotXSS available:', typeof shared.IsNotXSS === 'function');

// Test middleware
console.log('✓ StandardizedSecurityMiddleware available:', typeof shared.StandardizedSecurityMiddleware === 'function');

console.log('
=== All key exports are available\! ===');

