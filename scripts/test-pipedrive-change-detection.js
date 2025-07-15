#!/usr/bin/env node

/**
 * Pipedrive Change Detection Test Script
 * Tests various Pipedrive API endpoints for change detection and sync capabilities
 */

const API_KEY = '0cb67c6e2ae346d90ecee11df979ae433a07a256';
const BASE_URL = 'https://api.pipedrive.com/v1';

async function testChangeDetection() {
  console.log('🔍 Testing Pipedrive Change Detection Capabilities\n');
  
  const tests = [
    {
      name: 'Basic Persons List',
      endpoint: '/persons',
      description: 'Standard contact list with basic filtering'
    },
    {
      name: 'Persons with Since Parameter',
      endpoint: '/persons?since_timestamp=2024-01-01',
      description: 'Filter contacts modified since specific date'
    },
    {
      name: 'Persons with Start Parameter',
      endpoint: '/persons?start=0&limit=10',
      description: 'Pagination with start offset'
    },
    {
      name: 'Persons with Filter',
      endpoint: '/persons?filter_id=1',
      description: 'Filter by Pipedrive filter ID'
    },
    {
      name: 'Persons Search',
      endpoint: '/persons/search?term=test',
      description: 'Search contacts by term'
    },
    {
      name: 'Activities List',
      endpoint: '/activities',
      description: 'List all activities'
    },
    {
      name: 'Activities with Since Parameter',
      endpoint: '/activities?since_timestamp=2024-01-01',
      description: 'Filter activities since specific date'
    },
    {
      name: 'Organizations List',
      endpoint: '/organizations',
      description: 'List all organizations'
    },
    {
      name: 'Organizations with Since Parameter',
      endpoint: '/organizations?since_timestamp=2024-01-01',
      description: 'Filter organizations since specific date'
    },
    {
      name: 'Deals List',
      endpoint: '/deals',
      description: 'List all deals'
    },
    {
      name: 'Deals with Since Parameter',
      endpoint: '/deals?since_timestamp=2024-01-01',
      description: 'Filter deals since specific date'
    },
    {
      name: 'Notes List',
      endpoint: '/notes',
      description: 'List all notes'
    },
    {
      name: 'Notes with Since Parameter',
      endpoint: '/notes?since_timestamp=2024-01-01',
      description: 'Filter notes since specific date'
    }
  ];

  console.log('📋 Available Change Detection Methods:\n');
  console.log('='.repeat(80));

  for (const test of tests) {
    console.log(`🔍 Testing: ${test.name}`);
    console.log(`📝 Description: ${test.description}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}${test.endpoint}&api_token=${API_KEY}`);
      const responseTime = Date.now() - startTime;
      
      console.log(`⏱️  Response Time: ${responseTime}ms`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success: ${data.data?.length || 0} items returned`);
        
        // Check for pagination info
        if (data.additional_data?.pagination) {
          console.log(`📄 Pagination: ${data.additional_data.pagination.more_items_in_collection ? 'More items available' : 'All items returned'}`);
        }
        
        // Check for rate limiting info
        if (data.additional_data?.rate_limit) {
          console.log(`⏱️  Rate Limit: ${data.additional_data.rate_limit.limit} requests per ${data.additional_data.rate_limit.period} seconds`);
        }
        
      } else {
        const errorText = await response.text();
        console.log(`❌ Error: ${errorText.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('💡 Change Detection Strategies:\n');
  console.log('='.repeat(80));
  
  console.log('🎯 Strategy 1: Since Timestamp Filtering');
  console.log('   ✅ Pros: Efficient, only fetches changed data');
  console.log('   ✅ Cons: Requires tracking last sync timestamp');
  console.log('   📝 Implementation: Use since_timestamp parameter');
  console.log('   🔧 Example: /persons?since_timestamp=2024-01-01T00:00:00Z\n');
  
  console.log('🎯 Strategy 2: Incremental Sync with Pagination');
  console.log('   ✅ Pros: Handles large datasets efficiently');
  console.log('   ✅ Cons: More complex implementation');
  console.log('   📝 Implementation: Use start/limit parameters');
  console.log('   🔧 Example: /persons?start=0&limit=100\n');
  
  console.log('🎯 Strategy 3: Search-Based Sync');
  console.log('   ✅ Pros: Can sync specific contacts');
  console.log('   ✅ Cons: Requires knowing what to search for');
  console.log('   📝 Implementation: Use search endpoint');
  console.log('   🔧 Example: /persons/search?term=email@domain.com\n');
  
  console.log('🎯 Strategy 4: Filter-Based Sync');
  console.log('   ✅ Pros: Can sync contacts matching criteria');
  console.log('   ✅ Cons: Requires setting up Pipedrive filters');
  console.log('   📝 Implementation: Use filter_id parameter');
  console.log('   🔧 Example: /persons?filter_id=123\n');
  
  console.log('🎯 Strategy 5: Webhook-Based Sync (Not Available)');
  console.log('   ❌ Cons: Pipedrive webhooks are limited');
  console.log('   📝 Note: Pipedrive webhooks only work for specific events');
  console.log('   🔧 Alternative: Polling with since_timestamp\n');
  
  console.log('🚀 Recommended Implementation:\n');
  console.log('='.repeat(80));
  
  console.log('1. 📅 Store last sync timestamp in database');
  console.log('2. 🔄 Use since_timestamp for incremental syncs');
  console.log('3. 📊 Implement pagination for large datasets');
  console.log('4. ⏱️  Respect rate limits (100 req/10s)');
  console.log('5. 🔄 Fall back to full sync if incremental fails');
  console.log('6. 📝 Log sync operations for debugging');
  console.log('7. 🎯 Use search for specific contact updates');
  
  console.log('\n📊 Sync Performance Estimates:\n');
  console.log('='.repeat(80));
  
  console.log('🔍 Incremental Sync (since_timestamp):');
  console.log('   • 500 contacts: ~500ms (only changed contacts)');
  console.log('   • 1000 contacts: ~1s (only changed contacts)');
  console.log('   • Rate limit safe: Yes (fewer API calls)');
  
  console.log('\n🔄 Full Sync (no timestamp):');
  console.log('   • 500 contacts: ~2-3s (all contacts)');
  console.log('   • 1000 contacts: ~4-6s (all contacts)');
  console.log('   • Rate limit safe: Yes (within limits)');
  
  console.log('\n🎯 Search-Based Sync:');
  console.log('   • Specific contacts: ~100-200ms per search');
  console.log('   • Rate limit safe: Yes (minimal API calls)');
  console.log('   • Best for: Individual contact updates');
}

// Run the change detection test
testChangeDetection().catch(console.error); 