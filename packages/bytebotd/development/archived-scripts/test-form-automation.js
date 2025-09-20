/**
 * Simple Form Automation Test Script
 *
 * Tests the form automation endpoints to verify basic functionality
 * without relying on the full TypeScript compilation.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000'; // Assuming ByteBot runs on port 3000
const FORM_API_BASE = `${BASE_URL}/form-automation`;

// Test data
const testData = {
  sessionId: 'test-session-123',
  formSelector: '#testForm',
  fields: [
    {
      selector: '#email',
      type: 'email',
      value: 'test@example.com',
      label: 'Email Address',
      required: true
    },
    {
      selector: '#name',
      type: 'text',
      value: 'John Doe',
      label: 'Full Name',
      required: true
    },
    {
      selector: '#message',
      type: 'textarea',
      value: 'This is a test message for form automation.',
      label: 'Message',
      required: false
    }
  ],
  config: {
    timeout: 10000,
    captureScreenshots: true,
    fillDelay: 200,
    validateBeforeSubmit: true,
    maxRetries: 3
  }
};

/**
 * Test the form detection endpoint
 */
async function testFormDetection() {
  console.log('\n🔍 Testing Form Detection...');

  try {
    const response = await axios.post(`${FORM_API_BASE}/detect`, {
      action: 'detect_form',
      sessionId: testData.sessionId,
      url: 'https://example.com/contact-form',
      analyzeFields: true,
      config: testData.config
    });

    console.log('✅ Form Detection Response:', {
      status: response.status,
      formsDetected: response.data.formsDetected,
      formCount: response.data.formCount,
      processingTime: response.data.processingTimeMs + 'ms'
    });

    return response.data;
  } catch (error) {
    console.error('❌ Form Detection Failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      details: error.response?.data
    });
    return null;
  }
}

/**
 * Test the form filling endpoint
 */
async function testFormFilling() {
  console.log('\n✏️ Testing Form Filling...');

  try {
    const response = await axios.post(`${FORM_API_BASE}/fill`, {
      action: 'fill_form',
      sessionId: testData.sessionId,
      formSelector: testData.formSelector,
      fields: testData.fields,
      submitAfterFill: false,
      config: testData.config
    });

    console.log('✅ Form Filling Response:', {
      status: response.status,
      success: response.data.success,
      fieldsProcessed: response.data.fieldResults?.length || 0,
      processingTime: response.data.processingTimeMs + 'ms'
    });

    return response.data;
  } catch (error) {
    console.error('❌ Form Filling Failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      details: error.response?.data
    });
    return null;
  }
}

/**
 * Test the form validation endpoint
 */
async function testFormValidation() {
  console.log('\n✅ Testing Form Validation...');

  try {
    const response = await axios.post(`${FORM_API_BASE}/validate`, {
      action: 'validate_form',
      sessionId: testData.sessionId,
      formSelector: testData.formSelector,
      fields: testData.fields,
      validationRules: {
        '#email': '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
        '#name': '^[a-zA-Z\\s]{2,50}$'
      },
      config: testData.config
    });

    console.log('✅ Form Validation Response:', {
      status: response.status,
      success: response.data.success,
      validationResults: response.data.validationResults?.length || 0,
      processingTime: response.data.processingTimeMs + 'ms'
    });

    return response.data;
  } catch (error) {
    console.error('❌ Form Validation Failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      details: error.response?.data
    });
    return null;
  }
}

/**
 * Test the form submission endpoint
 */
async function testFormSubmission() {
  console.log('\n🚀 Testing Form Submission...');

  try {
    const response = await axios.post(`${FORM_API_BASE}/submit`, {
      action: 'submit_form',
      sessionId: testData.sessionId,
      formSelector: testData.formSelector,
      submitSelector: 'button[type="submit"]',
      expectedRedirect: 'https://example.com/success',
      config: {
        ...testData.config,
        waitForSubmission: true
      }
    });

    console.log('✅ Form Submission Response:', {
      status: response.status,
      submitted: response.data.submitted,
      redirectUrl: response.data.redirectUrl,
      submissionTime: response.data.submissionTimeMs + 'ms'
    });

    return response.data;
  } catch (error) {
    console.error('❌ Form Submission Failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      details: error.response?.data
    });
    return null;
  }
}

/**
 * Test the auto-complete endpoint
 */
async function testAutoComplete() {
  console.log('\n🤖 Testing Auto-Complete...');

  try {
    const response = await axios.post(`${FORM_API_BASE}/auto-complete`, {
      action: 'auto_complete',
      sessionId: testData.sessionId,
      formSelector: testData.formSelector,
      profileData: {
        name: 'Jane Smith',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+1-555-987-6543',
        address: '456 Oak Avenue, Springfield, IL 62701'
      },
      fieldMapping: {
        '#fullName': 'name',
        '#firstName': 'firstName',
        '#lastName': 'lastName',
        '#emailAddress': 'email',
        '#phoneNumber': 'phone',
        '#homeAddress': 'address'
      },
      config: testData.config
    });

    console.log('✅ Auto-Complete Response:', {
      status: response.status,
      success: response.data.success,
      fieldsCompleted: response.data.fieldsCompleted,
      totalFields: response.data.totalFields,
      completionTime: response.data.completionTimeMs + 'ms'
    });

    return response.data;
  } catch (error) {
    console.error('❌ Auto-Complete Failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      details: error.response?.data
    });
    return null;
  }
}

/**
 * Test the clear form endpoint
 */
async function testFormClear() {
  console.log('\n🧹 Testing Form Clear...');

  try {
    const response = await axios.post(`${FORM_API_BASE}/clear`, {
      formSelector: testData.formSelector,
      fieldSelectors: ['#email', '#name', '#message']
    });

    console.log('✅ Form Clear Response:', {
      status: response.status,
      success: response.data.success,
      fieldsCleared: response.data.fieldResults?.length || 0,
      processingTime: response.data.processingTimeMs + 'ms'
    });

    return response.data;
  } catch (error) {
    console.error('❌ Form Clear Failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      details: error.response?.data
    });
    return null;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting Form Automation API Tests...');
  console.log('='.repeat(50));

  const results = {
    detection: await testFormDetection(),
    filling: await testFormFilling(),
    validation: await testFormValidation(),
    submission: await testFormSubmission(),
    autoComplete: await testAutoComplete(),
    clear: await testFormClear()
  };

  console.log('\n📊 Test Summary:');
  console.log('='.repeat(50));

  Object.entries(results).forEach(([testName, result]) => {
    const status = result ? '✅ PASSED' : '❌ FAILED';
    console.log(`${testName.padEnd(15)}: ${status}`);
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 All form automation tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Check the ByteBot server logs for details.');
  }

  return results;
}

/**
 * Health check to verify the server is running
 */
async function checkServerHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ ByteBot server is running');
    return true;
  } catch (error) {
    console.error('❌ ByteBot server is not accessible:', error.message);
    console.log('Please ensure ByteBot is running on port 3000');
    return false;
  }
}

// Run tests if server is healthy
(async () => {
  const serverHealthy = await checkServerHealth();
  if (serverHealthy) {
    await runAllTests();
  }
})();