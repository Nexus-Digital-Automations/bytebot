/**
 * Simple verification script for RBAC decorators
 * This tests the core functionality without Jest dependencies
 */

require('reflect-metadata');

// Import the compiled decorators
const {
  Role,
  Permission,
  RequireRole,
  RequirePermission,
  RequireAnyRole,
  RequireAllPermissions,
  validateTimeBasedAccess,
  ROLES_KEY,
  PERMISSIONS_KEY,
  ANY_ROLE_KEY,
  ALL_PERMISSIONS_KEY
} = require('../dist/decorators/rbac-authorization.decorators');

console.log('🔧 RBAC Decorators Verification Starting...\n');

// Test 1: Basic RequireRole decorator
console.log('📝 Test 1: Basic RequireRole decorator');
try {
  class TestController1 {
    @RequireRole([Role._ADMIN, Role._MODERATOR])
    testMethod() {}
  }

  const metadata = Reflect.getMetadata(ROLES_KEY, TestController1.prototype, 'testMethod');
  console.log('✅ Role metadata:', metadata);
  
  if (metadata && metadata.includes('admin') && metadata.includes('moderator')) {
    console.log('✅ RequireRole decorator working correctly\n');
  } else {
    console.log('❌ RequireRole decorator failed\n');
  }
} catch (error) {
  console.log('❌ RequireRole test failed:', error.message, '\n');
}

// Test 2: Basic RequirePermission decorator
console.log('📝 Test 2: Basic RequirePermission decorator');
try {
  class TestController2 {
    @RequirePermission([Permission._READ, Permission._WRITE])
    testMethod() {}
  }

  const metadata = Reflect.getMetadata(PERMISSIONS_KEY, TestController2.prototype, 'testMethod');
  console.log('✅ Permission metadata:', metadata);
  
  if (metadata && metadata.includes('read') && metadata.includes('write')) {
    console.log('✅ RequirePermission decorator working correctly\n');
  } else {
    console.log('❌ RequirePermission decorator failed\n');
  }
} catch (error) {
  console.log('❌ RequirePermission test failed:', error.message, '\n');
}

// Test 3: Multiple decorators
console.log('📝 Test 3: Multiple decorators');
try {
  class TestController3 {
    @RequireRole([Role._ADMIN])
    @RequireAnyRole([Role._USER, Role._MODERATOR])
    @RequirePermission([Permission._READ])
    testMethod() {}
  }

  const rolesMetadata = Reflect.getMetadata(ROLES_KEY, TestController3.prototype, 'testMethod');
  const anyRoleMetadata = Reflect.getMetadata(ANY_ROLE_KEY, TestController3.prototype, 'testMethod');
  const permissionsMetadata = Reflect.getMetadata(PERMISSIONS_KEY, TestController3.prototype, 'testMethod');
  
  console.log('✅ Roles metadata:', rolesMetadata);
  console.log('✅ Any role metadata:', anyRoleMetadata);
  console.log('✅ Permissions metadata:', permissionsMetadata);
  
  if (rolesMetadata && anyRoleMetadata && permissionsMetadata) {
    console.log('✅ Multiple decorators working correctly\n');
  } else {
    console.log('❌ Multiple decorators failed\n');
  }
} catch (error) {
  console.log('❌ Multiple decorators test failed:', error.message, '\n');
}

// Test 4: Time-based validation
console.log('📝 Test 4: Time-based validation');
try {
  const config = { allowedHours: [9, 10, 11, 12, 13, 14, 15, 16, 17] };
  const testTime1 = new Date("2024-01-15T10:00:00Z"); // 10 AM UTC
  const testTime2 = new Date("2024-01-15T20:00:00Z"); // 8 PM UTC
  
  const result1 = validateTimeBasedAccess(config, testTime1);
  const result2 = validateTimeBasedAccess(config, testTime2);
  
  console.log('✅ 10 AM UTC allowed:', result1);
  console.log('✅ 8 PM UTC allowed:', result2);
  
  if (result1 === true && result2 === false) {
    console.log('✅ Time-based validation working correctly\n');
  } else {
    console.log('❌ Time-based validation failed\n');
  }
} catch (error) {
  console.log('❌ Time-based validation test failed:', error.message, '\n');
}

console.log('🎉 RBAC Decorators Verification Complete!');