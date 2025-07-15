#!/usr/bin/env node

/**
 * Detailed Pipedrive API Test Script
 * Tests the Pipedrive API connection with comprehensive diagnostics
 */

const API_KEY = '0cb67c6e2ae346d90ecee11df979ae433a07a256';
const BASE_URL = 'https://api.pipedrive.com/v1';

async function testWithRetry(url, options, description) {
  console.log(`\n🔍 Testing: ${description}`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(url, options);
    const responseTime = Date.now() - startTime;
    
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    // Log all headers for debugging
    console.log('📋 Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error Response: ${errorText}`);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.log('📝 Parsed Error:');
        console.log(JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('📝 Raw Error Text (not JSON):');
        console.log(errorText);
      }
      
      return { success: false, error: errorText };
    }
    
    const data = await response.json();
    console.log('✅ Success Response:');
    console.log(JSON.stringify(data, null, 2));
    
    return { success: true, data, responseTime };
    
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testPipedriveAPI() {
  console.log('🚀 Starting Comprehensive Pipedrive API Test\n');
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);
  
  const results = [];
  
  // Test 1: Basic user info with Bearer token
  results.push(await testWithRetry(
    `${BASE_URL}/users/me`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    },
    'User Info (Bearer Token)'
  ));
  
  // Test 2: Try with API key as query parameter (older method)
  results.push(await testWithRetry(
    `${BASE_URL}/users/me?api_token=${API_KEY}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
    'User Info (Query Parameter)'
  ));
  
  // Test 3: Test without authentication to see what happens
  results.push(await testWithRetry(
    `${BASE_URL}/users/me`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
    'User Info (No Auth)'
  ));
  
  // Test 4: Test a different endpoint
  results.push(await testWithRetry(
    `${BASE_URL}/organizations?limit=1`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    },
    'Organizations (Bearer Token)'
  ));
  
  // Test 5: Check if it's a rate limiting issue
  console.log('\n⏳ Waiting 2 seconds before next test...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  results.push(await testWithRetry(
    `${BASE_URL}/users/me`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    },
    'User Info (After Delay)'
  ));
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('='.repeat(50));
  
  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${status} - ${result.error || 'Success'}`);
  });
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  console.log('='.repeat(50));
  
  const allFailed = results.every(r => !r.success);
  const someFailed = results.some(r => !r.success);
  
  if (allFailed) {
    console.log('❌ All tests failed. Possible issues:');
    console.log('   1. API key is invalid or expired');
    console.log('   2. API key has insufficient permissions');
    console.log('   3. Account is suspended or inactive');
    console.log('   4. Network connectivity issues');
    console.log('\n🔧 Next steps:');
    console.log('   1. Verify API key at https://app.pipedrive.com/settings/api');
    console.log('   2. Check API key permissions');
    console.log('   3. Ensure account is active');
    console.log('   4. Try generating a new API key');
  } else if (someFailed) {
    console.log('⚠️  Some tests failed. Possible issues:');
    console.log('   1. Rate limiting');
    console.log('   2. Authentication method mismatch');
    console.log('   3. Endpoint-specific permissions');
  } else {
    console.log('✅ All tests passed! API key is working correctly.');
  }
  
  // Check for specific error patterns
  const errorMessages = results.filter(r => !r.success).map(r => r.error);
  const hasUnauthorized = errorMessages.some(msg => msg.includes('unauthorized') || msg.includes('401'));
  const hasRateLimit = errorMessages.some(msg => msg.includes('rate') || msg.includes('429'));
  
  if (hasUnauthorized) {
    console.log('\n🔐 Authentication Issues Detected:');
    console.log('   - Check if API key is correct');
    console.log('   - Verify API key hasn\'t expired');
    console.log('   - Ensure API key has proper permissions');
  }
  
  if (hasRateLimit) {
    console.log('\n⏱️  Rate Limiting Issues Detected:');
    console.log('   - Wait before making more requests');
    console.log('   - Check rate limit headers');
    console.log('   - Consider implementing retry logic');
  }
}

// Run the comprehensive test
testPipedriveAPI().catch(console.error); 