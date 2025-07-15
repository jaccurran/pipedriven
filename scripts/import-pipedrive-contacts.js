#!/usr/bin/env node

/**
 * Pipedrive Contacts Import Test Script
 * Tests importing contacts from Pipedrive into the local database
 */

const API_KEY = '0cb67c6e2ae346d90ecee11df979ae433a07a256';
const BASE_URL = 'https://api.pipedrive.com/v1';

async function importContactsFromPipedrive() {
  console.log('🔍 Importing contacts from Pipedrive...\n');
  
  try {
    const startTime = Date.now();
    
    // Fetch contacts from Pipedrive
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
    
    console.log(`✅ Found ${data.data.length} contacts in Pipedrive:\n`);
    
    // Simulate the import process
    const importResults = data.data.map((pipedriveContact, index) => {
      // Extract contact data from Pipedrive format
      const contactData = {
        name: pipedriveContact.name || 'Unknown Contact',
        email: pipedriveContact.email?.[0]?.value || null,
        phone: pipedriveContact.phone?.[0]?.value || null,
        organisation: pipedriveContact.org_name || null,
        pipedrivePersonId: pipedriveContact.id.toString(),
        pipedriveOrgId: pipedriveContact.org_id?.toString() || null,
        // Default values for new contacts
        warmnessScore: 0, // Cold by default
        lastContacted: null,
        addedToCampaign: false,
        userId: 'user-123', // Would be actual user ID in real app
        createdAt: new Date(pipedriveContact.add_time),
        updatedAt: new Date(pipedriveContact.update_time)
      };
      
      console.log(`${index + 1}. ${contactData.name}`);
      console.log(`   📧 Email: ${contactData.email || 'No email'}`);
      console.log(`   🏢 Organization: ${contactData.organisation || 'No organization'}`);
      console.log(`   📱 Phone: ${contactData.phone || 'No phone'}`);
      console.log(`   🏷️  Pipedrive ID: ${contactData.pipedrivePersonId}`);
      console.log(`   🌡️  Warmness Score: ${contactData.warmnessScore} (Cold)`);
      console.log(`   📅 Last Contacted: ${contactData.lastContacted ? 'Never' : 'Never'}`);
      console.log(`   🎯 Campaign Status: ${contactData.addedToCampaign ? 'Added' : 'Not Added'}`);
      console.log('');
      
      return {
        success: true,
        contact: contactData,
        pipedriveId: pipedriveContact.id
      };
    });
    
    // Calculate priority order based on the sorting algorithm
    const sortedContacts = importResults
      .map(result => result.contact)
      .sort((a, b) => {
        // First priority: Existing customers (addedToCampaign = true)
        if (a.addedToCampaign && !b.addedToCampaign) return -1;
        if (!a.addedToCampaign && b.addedToCampaign) return 1;

        // Second priority: Warmness score (ASC - lower scores first)
        if (a.warmnessScore !== b.warmnessScore) {
          return a.warmnessScore - b.warmnessScore;
        }

        // Third priority: Last contacted date (ASC - older dates first, null first)
        const aDate = a.lastContacted;
        const bDate = b.lastContacted;
        
        if (aDate === null && bDate === null) return 0;
        if (aDate === null) return -1;
        if (bDate === null) return 1;
        
        return aDate.getTime() - bDate.getTime();
      });
    
    console.log('📊 Import Summary:');
    console.log('='.repeat(50));
    console.log(`Total Contacts: ${importResults.length}`);
    
    const withEmail = importResults.filter(r => r.contact.email).length;
    const withPhone = importResults.filter(r => r.contact.phone).length;
    const withOrg = importResults.filter(r => r.contact.organisation).length;
    
    console.log(`Contacts with Email: ${withEmail}`);
    console.log(`Contacts with Phone: ${withPhone}`);
    console.log(`Contacts with Organization: ${withOrg}`);
    
    console.log('\n🎯 Priority Order (My 500 View):');
    console.log('='.repeat(50));
    sortedContacts.forEach((contact, index) => {
      const priority = contact.addedToCampaign ? 'HIGH' : 
                      contact.warmnessScore >= 3 ? 'MEDIUM' : 'LOW';
      console.log(`${index + 1}. ${contact.name} (${priority} priority)`);
    });
    
    console.log('\n💡 Import Strategy:');
    console.log('='.repeat(50));
    console.log('1. ✅ Fetch all contacts from Pipedrive API');
    console.log('2. ✅ Map Pipedrive data to local contact format');
    console.log('3. ✅ Set default warmness score (0 = Cold)');
    console.log('4. ✅ Preserve Pipedrive IDs for future sync');
    console.log('5. ✅ Apply priority sorting algorithm');
    console.log('6. ⏳ Store in local database (simulated)');
    console.log('7. ⏳ Update My 500 view with imported contacts');
    
    console.log('\n🔄 Sync Considerations:');
    console.log('='.repeat(50));
    console.log('• All contacts start as "Cold" (warmness score 0)');
    console.log('• Priority order: Campaign contacts > Warmness score > Last contacted');
    console.log('• Pipedrive IDs preserved for bidirectional sync');
    console.log('• Activities will be synced separately');
    console.log('• Manual sync trigger needed for updates');
    
  } catch (error) {
    console.log(`❌ Error importing contacts: ${error.message}`);
  }
}

// Run the import test
importContactsFromPipedrive().catch(console.error); 