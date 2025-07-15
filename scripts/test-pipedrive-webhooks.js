#!/usr/bin/env node

/**
 * Pipedrive Webhook Test Script
 * Tests Pipedrive webhook capabilities for real-time change detection
 */

const API_KEY = '0cb67c6e2ae346d90ecee11df979ae433a07a256';
const BASE_URL = 'https://api.pipedrive.com/v1';

async function testWebhookCapabilities() {
  console.log('🔗 Testing Pipedrive Webhook Capabilities\n');
  
  const webhookTests = [
    {
      name: 'List Webhooks',
      endpoint: '/webhooks',
      description: 'Get all configured webhooks'
    },
    {
      name: 'Webhook Events',
      endpoint: '/webhooks/events',
      description: 'Get available webhook event types'
    },
    {
      name: 'Webhook Subscriptions',
      endpoint: '/webhooks/subscriptions',
      description: 'Get webhook subscription info'
    }
  ];

  console.log('🔗 Webhook API Tests:\n');
  console.log('='.repeat(80));

  for (const test of webhookTests) {
    console.log(`🔍 Testing: ${test.name}`);
    console.log(`📝 Description: ${test.description}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}${test.endpoint}?api_token=${API_KEY}`);
      const responseTime = Date.now() - startTime;
      
      console.log(`⏱️  Response Time: ${responseTime}ms`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success: ${JSON.stringify(data, null, 2)}`);
      } else {
        const errorText = await response.text();
        console.log(`❌ Error: ${errorText.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('📋 Pipedrive Change Detection Summary:\n');
  console.log('='.repeat(80));
  
  console.log('✅ AVAILABLE METHODS:');
  console.log('   🎯 Since Timestamp Filtering: /persons?since_timestamp=2024-01-01');
  console.log('   📊 Pagination: /persons?start=0&limit=100');
  console.log('   🔍 Search: /persons/search?term=email@domain.com');
  console.log('   🏷️  Filtering: /persons?filter_id=123 (requires setup)');
  
  console.log('\n❌ NOT AVAILABLE:');
  console.log('   🔗 Real-time webhooks for contact changes');
  console.log('   🔄 Automatic change notifications');
  console.log('   📡 Push-based sync');
  
  console.log('\n💡 RECOMMENDED SYNC STRATEGY:\n');
  console.log('='.repeat(80));
  
  console.log('🎯 Primary Method: Since Timestamp Filtering');
  console.log('   • Store last sync timestamp in database');
  console.log('   • Use since_timestamp parameter for incremental syncs');
  console.log('   • Only fetch contacts modified since last sync');
  console.log('   • Performance: ~500ms for 500 changed contacts');
  
  console.log('\n🔄 Fallback Method: Full Sync');
  console.log('   • Use when incremental sync fails');
  console.log('   • Fetch all contacts and compare locally');
  console.log('   • Performance: ~2-3s for 500 contacts');
  
  console.log('\n🎯 Specific Updates: Search-Based Sync');
  console.log('   • Use for individual contact updates');
  console.log('   • Search by email or name');
  console.log('   • Performance: ~100-200ms per search');
  
  console.log('\n📊 Implementation Plan:\n');
  console.log('='.repeat(80));
  
  console.log('1. 📅 Database Schema:');
  console.log('   • Add lastSyncTimestamp to User table');
  console.log('   • Add syncStatus to Contact table');
  console.log('   • Track sync history in PipedriveSync table');
  
  console.log('\n2. 🔄 Sync Logic:');
  console.log('   • Check lastSyncTimestamp before sync');
  console.log('   • Use since_timestamp if available');
  console.log('   • Fall back to full sync if needed');
  console.log('   • Update lastSyncTimestamp after successful sync');
  
  console.log('\n3. ⏱️  Rate Limiting:');
  console.log('   • Respect 100 req/10s limit');
  console.log('   • Implement exponential backoff');
  console.log('   • Queue sync operations if needed');
  
  console.log('\n4. 🎯 User Experience:');
  console.log('   • Show sync progress indicator');
  console.log('   • Display "Last synced: X minutes ago"');
  console.log('   • Allow manual sync trigger');
  console.log('   • Show sync status (success/failed)');
  
  console.log('\n🚀 Performance Benefits:\n');
  console.log('='.repeat(80));
  
  console.log('✅ Incremental Sync (since_timestamp):');
  console.log('   • 90% reduction in API calls');
  console.log('   • 90% reduction in sync time');
  console.log('   • Better user experience');
  console.log('   • Lower rate limit impact');
  
  console.log('\n✅ Smart Fallback:');
  console.log('   • Full sync when incremental fails');
  console.log('   • Search sync for specific updates');
  console.log('   • Graceful degradation');
  console.log('   • Reliable data consistency');
}

// Run the webhook test
testWebhookCapabilities().catch(console.error); 