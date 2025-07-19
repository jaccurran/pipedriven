import { prisma } from '../src/lib/prisma';
import { PipedriveService } from '../src/server/services/pipedriveService';
import { PipedriveOrganizationService } from '../src/server/services/pipedriveOrganizationService';
import { decryptApiKey } from '../src/lib/apiKeyEncryption';

async function fixOrganizationRelationships() {
  try {
    // Get all contacts that have an organisation string but no pipedriveOrgId
    const contacts = await prisma.contact.findMany({
      where: {
        organisation: { not: null },
        pipedriveOrgId: null,
        pipedrivePersonId: { not: null } // Only contacts that are already in Pipedrive
      },
      include: {
        user: true
      }
    });

    console.log(`Found ${contacts.length} contacts with organisation strings but no pipedriveOrgId`);

    for (const contact of contacts) {
      console.log(`\nProcessing contact: ${contact.name} (${contact.organisation})`);
      
      if (!contact.user?.pipedriveApiKey) {
        console.log('  Skipping - no Pipedrive API key');
        continue;
      }

      try {
        // Decrypt API key and create services
        const apiKey = await decryptApiKey(contact.user.pipedriveApiKey);
        const pipedriveService = new PipedriveService(apiKey);
        const orgService = new PipedriveOrganizationService(pipedriveService);

        // Check if organization exists in Pipedrive
        const existingOrg = await orgService.findOrganizationByName(contact.organisation!);
        
        let orgId: number;
        if (existingOrg) {
          orgId = existingOrg.id;
          console.log(`  Found existing organization: ${contact.organisation} (ID: ${orgId})`);
        } else {
          // Create new organization
          orgId = await orgService.createOrganization({
            name: contact.organisation!
          });
          console.log(`  Created new organization: ${contact.organisation} (ID: ${orgId})`);
        }

        // Update the contact with the organization ID
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            pipedriveOrgId: orgId.toString()
          }
        });

        console.log(`  Updated contact with pipedriveOrgId: ${orgId}`);

      } catch (error) {
        console.error(`  Error processing contact ${contact.name}:`, error);
      }
    }

    console.log('\nOrganization relationship fix completed');

  } catch (error) {
    console.error('Script error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrganizationRelationships(); 