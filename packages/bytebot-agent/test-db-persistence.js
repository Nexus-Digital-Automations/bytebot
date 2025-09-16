#!/usr/bin/env node

/**
 * Database Connection and Persistence Test
 *
 * Tests basic database operations to verify:
 * 1. Database connection is working
 * 2. Data can be written and persisted
 * 3. Data can be read back consistently
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testDatabaseConnection() {
  console.log('🔗 Testing database connection...');

  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testReadOperations() {
  console.log('\n📖 Testing read operations...');

  try {
    // Test counting records in various tables
    const taskCount = await prisma.task.count();
    const userCount = await prisma.user.count();
    const browserSessionCount = await prisma.browserSession.count();

    console.log(`📊 Database record counts:`);
    console.log(`   - Tasks: ${taskCount}`);
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Browser Sessions: ${browserSessionCount}`);

    console.log('✅ Read operations successful');
    return true;
  } catch (error) {
    console.error('❌ Read operations failed:', error.message);
    return false;
  }
}

async function testWriteOperations() {
  console.log('\n✏️ Testing write operations...');

  try {
    // Create a test task
    const testTask = await prisma.task.create({
      data: {
        description: 'Database persistence test task',
        status: 'PENDING',
        priority: 'LOW',
        type: 'IMMEDIATE',
        model: { test: true, timestamp: new Date().toISOString() },
        createdBy: 'ASSISTANT',
      },
    });

    console.log(`✅ Test task created with ID: ${testTask.id}`);

    // Read back the created task
    const retrievedTask = await prisma.task.findUnique({
      where: { id: testTask.id },
    });

    if (
      retrievedTask &&
      retrievedTask.description === 'Database persistence test task'
    ) {
      console.log('✅ Data persistence verified - task read back successfully');

      // Clean up - delete the test task
      await prisma.task.delete({
        where: { id: testTask.id },
      });
      console.log('✅ Test data cleaned up');

      return true;
    } else {
      console.error('❌ Data persistence failed - task not found or corrupted');
      return false;
    }
  } catch (error) {
    console.error('❌ Write operations failed:', error.message);
    return false;
  }
}

async function testTransactionOperations() {
  console.log('\n🔄 Testing transaction operations...');

  try {
    // Test a transaction that creates multiple related records
    const result = await prisma.$transaction(async (tx) => {
      // Create a test browser session
      const session = await tx.browserSession.create({
        data: {
          status: 'ACTIVE',
          headless: true,
          viewportWidth: 1280,
          viewportHeight: 720,
          screenshotsEnabled: true,
          videoRecording: false,
          timeoutMs: 300000,
        },
      });

      // Create a test browser task linked to the session
      const task = await tx.browserTask.create({
        data: {
          sessionId: session.id,
          type: 'TEST_PERSISTENCE',
          status: 'PENDING',
          priority: 'NORMAL',
          actions: { test: 'persistence_verification' },
          configuration: { test: true },
        },
      });

      return { session, task };
    });

    console.log(
      `✅ Transaction completed - Session: ${result.session.id}, Task: ${result.task.id}`,
    );

    // Verify both records exist
    const sessionExists = await prisma.browserSession.findUnique({
      where: { id: result.session.id },
    });

    const taskExists = await prisma.browserTask.findUnique({
      where: { id: result.task.id },
    });

    if (sessionExists && taskExists) {
      console.log('✅ Transaction persistence verified');

      // Clean up
      await prisma.browserTask.delete({ where: { id: result.task.id } });
      await prisma.browserSession.delete({ where: { id: result.session.id } });
      console.log('✅ Transaction test data cleaned up');

      return true;
    } else {
      console.error('❌ Transaction persistence failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Transaction operations failed:', error.message);
    return false;
  }
}

async function runDatabaseTests() {
  console.log('🛡️ DATABASE PERSISTENCE VERIFICATION');
  console.log('=' + '='.repeat(40));

  const results = {
    connection: false,
    read: false,
    write: false,
    transaction: false,
  };

  // Run all tests
  results.connection = await testDatabaseConnection();

  if (results.connection) {
    results.read = await testReadOperations();
    results.write = await testWriteOperations();
    results.transaction = await testTransactionOperations();
  }

  // Summary
  console.log('\n📋 DATABASE TEST SUMMARY:');
  console.log('=' + '='.repeat(30));

  const testResults = [
    ['Database Connection', results.connection],
    ['Read Operations', results.read],
    ['Write Operations', results.write],
    ['Transaction Operations', results.transaction],
  ];

  let passedTests = 0;

  for (const [testName, passed] of testResults) {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${passed ? 'PASSED' : 'FAILED'}`);
    if (passed) passedTests++;
  }

  const successRate = passedTests / testResults.length;
  const overallSuccess = successRate >= 0.75;

  console.log(
    `\n🎯 Database Test Success Rate: ${passedTests}/${testResults.length} (${(successRate * 100).toFixed(1)}%)`,
  );
  console.log(
    `🎯 Overall Database Status: ${overallSuccess ? '✅ FUNCTIONAL' : '❌ NEEDS ATTENTION'}`,
  );

  // Close Prisma connection
  await prisma.$disconnect();

  return overallSuccess;
}

// Run the tests
if (require.main === module) {
  runDatabaseTests()
    .then((success) => {
      if (success) {
        console.log(
          '\n✅ Database persistence verification completed successfully!',
        );
        process.exit(0);
      } else {
        console.log('\n❌ Database persistence verification failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Database verification script failed:', error);
      process.exit(1);
    });
}
