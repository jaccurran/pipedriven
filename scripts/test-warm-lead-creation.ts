import { PrismaClient } from '@prisma/client';
import { PipedriveService } from '../src/server/services/pipedriveService';
import { PipedriveUserService } from '../src/server/services/pipedriveUserService';
import { PipedriveLabelService } from '../src/server/services/pipedriveLabelService';
import { PipedriveOrganizationService } from '../src/server/services/pipedriveOrganizationService';
import { WarmLeadService } from '../src/server/services/warmLeadService';
import { decryptApiKey } from '../src/lib/apiKeyEncryption';

const prisma = new PrismaClient();

async function testWarmLeadCreation() {
  try {
    // Get the first user with a Pipedrive API key
    const user = await prisma.user.findFirst({
      where: {
        pipedriveApiKey: {
          not: null
        }
      }
    });

    if (!user || !user.pipedriveApiKey) {
      console.error('No user with Pipedrive API key found');
      return;
    }

    console.log('Using API key for user:', user.email);
    
    // Decrypt the API key
    let decryptedApiKey: string;
    try {
      decryptedApiKey = await decryptApiKey(user.pipedriveApiKey);
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return;
    }
    
    const pipedriveService = new PipedriveService(decryptedApiKey);
    
    // Test connection first
    const connectionTest = await pipedriveService.testConnection();
    if (!connectionTest.success) {
      console.error('Failed to connect to Pipedrive:', connectionTest.error);
      return;
    }
    
    console.log('✅ Connected to Pipedrive successfully');
    
    // Test label service
    const labelService = new PipedriveLabelService(pipedriveService);
    
    console.log('\n🔍 Testing Label Service:');
    console.log('==========================');
    
    const labelFieldKey = await labelService.getLabelFieldKey();
    console.log('Label field key:', labelFieldKey);
    
    const warmLeadLabelId = await labelService.getWarmLeadLabelId();
    console.log('Warm lead label ID:', warmLeadLabelId);
    
    // Create a test contact
    console.log('\n👤 Creating test contact:');
    console.log('==========================');
    
    const testContact = await prisma.contact.create({
      data: {
        name: 'Test Warm Lead Contact',
        email: 'test.warm.lead@example.com',
        phone: '+1234567890',
        warmnessScore: 5,
        userId: user.id
      }
    });
    
    console.log('Created test contact:', testContact.id);
    
    // Test warm lead creation
    console.log('\n🔥 Testing Warm Lead Creation:');
    console.log('==============================');
    
    const userService = new PipedriveUserService(pipedriveService);
    const orgService = new PipedriveOrganizationService(pipedriveService);
    
    const warmLeadService = new WarmLeadService(
      pipedriveService,
      userService,
      labelService,
      orgService
    );
    
    const result = await warmLeadService.checkAndCreateWarmLead({
      contactId: testContact.id,
      userId: user.id,
      warmnessScore: 5
    });
    
    console.log('Warm lead creation result:', result);
    
    // Check the updated contact
    const updatedContact = await prisma.contact.findUnique({
      where: { id: testContact.id }
    });
    
    console.log('Updated contact:', {
      id: updatedContact?.id,
      name: updatedContact?.name,
      pipedrivePersonId: updatedContact?.pipedrivePersonId,
      warmnessScore: updatedContact?.warmnessScore
    });
    
  } catch (error) {
    console.error('Error testing warm lead creation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWarmLeadCreation(); 