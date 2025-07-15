#!/usr/bin/env node

/**
 * Pipedrive Contacts Fetcher
 * Fetches and displays contacts from Pipedrive
 */

const API_KEY = '0cb67c6e2ae346d90ecee11df979ae433a07a256';
const BASE_URL = 'https://api.pipedrive.com/v1';

async function fetchContacts() {
  console.log('🔍 Fetching contacts from Pipedrive...\n');
  
  try {
    const startTime = Date.now();
    
    // Fetch contacts with query parameter authentication
    const response = await fetch(`${BASE_URL}/persons?api_token=${API_KEY}&limit=100`);
    const responseTime = Date.now() - startTime;
    
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText}`);
      return;
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      console.log('📭 No contacts found in Pipedrive');
      return;
    }
    
    console.log(`✅ Found ${data.data.length} contacts:\n`);
    console.log('='.repeat(80));
    
    data.data.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.name || 'No Name'}`);
      console.log(`   📧 Email: ${contact.email?.[0]?.value || 'No email'}`);
      console.log(`   🏢 Organization: ${contact.org_name || 'No organization'}`);
      console.log(`   📱 Phone: ${contact.phone?.[0]?.value || 'No phone'}`);
      console.log(`   🏷️  Labels: ${contact.label_ids?.join(', ') || 'No labels'}`);
      console.log(`   📅 Created: ${new Date(contact.add_time).toLocaleDateString()}`);
      console.log(`   🔄 Updated: ${new Date(contact.update_time).toLocaleDateString()}`);
      console.log(`   🆔 ID: ${contact.id}`);
      console.log('');
    });
    
    // Summary statistics
    console.log('📊 Summary:');
    console.log('='.repeat(50));
    console.log(`Total Contacts: ${data.data.length}`);
    
    const withEmail = data.data.filter(c => c.email && c.email.length > 0).length;
    const withPhone = data.data.filter(c => c.phone && c.phone.length > 0).length;
    const withOrg = data.data.filter(c => c.org_name).length;
    
    console.log(`Contacts with Email: ${withEmail}`);
    console.log(`Contacts with Phone: ${withPhone}`);
    console.log(`Contacts with Organization: ${withOrg}`);
    
    // Show organizations
    const organizations = [...new Set(data.data.map(c => c.org_name).filter(Boolean))];
    if (organizations.length > 0) {
      console.log(`\n🏢 Organizations (${organizations.length}):`);
      organizations.forEach(org => console.log(`   - ${org}`));
    }
    
    // Show labels
    const allLabels = data.data.flatMap(c => c.label_ids || []);
    const uniqueLabels = [...new Set(allLabels)];
    if (uniqueLabels.length > 0) {
      console.log(`\n🏷️  Labels used (${uniqueLabels.length}):`);
      uniqueLabels.forEach(label => console.log(`   - ${label}`));
    }
    
  } catch (error) {
    console.log(`❌ Error fetching contacts: ${error.message}`);
  }
}

// Run the script
fetchContacts().catch(console.error); 