#!/usr/bin/env node

/**
 * Test Pipedrive Integration with Real API Key
 * Tests the updated integration using query parameter authentication
 */

const API_KEY = '0cb67c6e2ae346d90ecee11df979ae433a07a256';
const BASE_URL = 'https://api.pipedrive.com/v1';

async function testIntegration() {
  console.log('🚀 Testing Updated Pipedrive Integration\n');
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);
  
  const tests = [
    {
      name: 'User Information',
      url: `${BASE_URL}/users/me?api_token=${API_KEY}`,
      method: 'GET',
    },
    {
      name: 'Organizations',
      url: `${BASE_URL}/organizations?api_token=${API_KEY}&limit=5`,
      method: 'GET',
    },
    {
      name: 'Persons',
      url: `${BASE_URL}/persons?api_token=${API_KEY}&limit=5`,
      method: 'GET',
    },
    {
      name: 'Person Fields',
      url: `${BASE_URL}/personFields?api_token=${API_KEY}`,
      method: 'GET',
    },
  ];

  const results = [];

  for (const test of tests) {
    console.log(`📋 Testing: ${test.name}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(test.url, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const responseTime = Date.now() - startTime;
      
      console.log(`⏱️  Response Time: ${responseTime}ms`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      // Rate limiting info
      const rateLimit = {
        limit: response.headers.get('x-ratelimit-limit'),
        remaining: response.headers.get('x-ratelimit-remaining'),
        reset: response.headers.get('x-ratelimit-reset'),
      };
      
      if (rateLimit.limit) {
        console.log(`📈 Rate Limit: ${rateLimit.remaining}/${rateLimit.limit} remaining`);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Error: ${errorText}`);
        results.push({ name: test.name, success: false, error: errorText });
      } else {
        const data = await response.json();
        console.log(`✅ Success: ${data.success !== false ? 'Data retrieved' : 'API responded'}`);
        
        if (data.data) {
          if (Array.isArray(data.data)) {
            console.log(`📊 Items: ${data.data.length}`);
          } else if (data.data.id) {
            console.log(`📊 ID: ${data.data.id}`);
          }
        }
        
        results.push({ name: test.name, success: true, data });
      }
      
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`);
      results.push({ name: test.name, success: false, error: error.message });
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 Integration Test Summary:');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${status} - ${result.name}`);
  });
  
  console.log(`\n🎯 Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Integration is working correctly.');
    console.log('\n✅ Your Pipedrive API integration is ready to use!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
  
  return results;
}

// Run the integration test
testIntegration().catch(console.error); 