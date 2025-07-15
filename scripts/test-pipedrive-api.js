#!/usr/bin/env node

/**
 * Quick Pipedrive API Test Script
 * Tests the Pipedrive API connection and shows detailed results
 */

const API_KEY = '0cb67c6e2ae346d90ecee11df979ae433a07a256';
const BASE_URL = 'https://api.pipedrive.com/v1';

async function testPipedriveConnection() {
  console.log('🔍 Testing Pipedrive API Connection...\n');
  
  const startTime = Date.now();
  
  try {
    // Test 1: Get user information
    console.log('📋 Test 1: Getting user information...');
    const userResponse = await fetch(`${BASE_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    const responseTime = Date.now() - startTime;
    
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`📊 Status Code: ${userResponse.status} ${userResponse.statusText}`);
    
    // Extract rate limiting info
    const rateLimitInfo = {
      limit: userResponse.headers.get('x-ratelimit-limit'),
      remaining: userResponse.headers.get('x-ratelimit-remaining'),
      reset: userResponse.headers.get('x-ratelimit-reset'),
    };
    
    console.log('📈 Rate Limiting Info:');
    console.log(`   Limit: ${rateLimitInfo.limit || 'N/A'}`);
    console.log(`   Remaining: ${rateLimitInfo.remaining || 'N/A'}`);
    if (rateLimitInfo.reset) {
      const resetTime = new Date(parseInt(rateLimitInfo.reset) * 1000);
      console.log(`   Reset Time: ${resetTime.toLocaleString()}`);
    }
    
    if (!userResponse.ok) {
      const errorData = await userResponse.json().catch(() => ({}));
      console.log('\n❌ Connection Failed!');
      console.log(`Error: ${errorData.error || 'Unknown error'}`);
      console.log(`Details: ${errorData.error_info || 'No additional details'}`);
      return;
    }
    
    const userData = await userResponse.json();
    
    console.log('\n✅ Connection Successful!');
    console.log('\n👤 User Information:');
    console.log(`   ID: ${userData.data.id}`);
    console.log(`   Name: ${userData.data.name}`);
    console.log(`   Email: ${userData.data.email}`);
    console.log(`   Company: ${userData.data.company_name || 'N/A'}`);
    
    // Test 2: Get some basic data to verify full access
    console.log('\n📋 Test 2: Testing data access...');
    
    // Get organizations
    const orgResponse = await fetch(`${BASE_URL}/organizations?limit=5`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (orgResponse.ok) {
      const orgData = await orgResponse.json();
      console.log(`✅ Organizations: Found ${orgData.data?.length || 0} organizations`);
    } else {
      console.log('⚠️  Organizations: Access denied or no organizations found');
    }
    
    // Get persons
    const personResponse = await fetch(`${BASE_URL}/persons?limit=5`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (personResponse.ok) {
      const personData = await personResponse.json();
      console.log(`✅ Persons: Found ${personData.data?.length || 0} persons`);
    } else {
      console.log('⚠️  Persons: Access denied or no persons found');
    }
    
    // Test 3: Check available fields
    console.log('\n📋 Test 3: Checking available fields...');
    
    const fieldsResponse = await fetch(`${BASE_URL}/personFields`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (fieldsResponse.ok) {
      const fieldsData = await fieldsResponse.json();
      console.log(`✅ Person Fields: Found ${fieldsData.data?.length || 0} custom fields`);
      
      // Show some example fields
      if (fieldsData.data && fieldsData.data.length > 0) {
        console.log('   Example fields:');
        fieldsData.data.slice(0, 3).forEach(field => {
          console.log(`   - ${field.name} (${field.field_type})`);
        });
      }
    } else {
      console.log('⚠️  Person Fields: Access denied');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   ✅ API Key: Valid`);
    console.log(`   ✅ User: ${userData.data.name} (${userData.data.email})`);
    console.log(`   ✅ Response Time: ${responseTime}ms`);
    console.log(`   ✅ Rate Limit: ${rateLimitInfo.remaining}/${rateLimitInfo.limit} remaining`);
    
  } catch (error) {
    console.log('\n❌ Connection Failed!');
    console.log(`Error: ${error.message}`);
    console.log(`Type: ${error.constructor.name}`);
  }
}

// Run the test
testPipedriveConnection().catch(console.error); 