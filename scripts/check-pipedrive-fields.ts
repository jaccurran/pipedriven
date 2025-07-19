import { PrismaClient } from '@prisma/client';
import { PipedriveService } from '../src/server/services/pipedriveService';
import { decryptApiKey } from '../src/lib/apiKeyEncryption';

const prisma = new PrismaClient();

async function checkPipedriveFields() {
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
    
    // Get person custom fields
    console.log('\n📋 Person Custom Fields:');
    const customFieldsResult = await pipedriveService.getPersonCustomFields();
    
    if (customFieldsResult.success && customFieldsResult.fields) {
      customFieldsResult.fields.forEach(field => {
        console.log(`  Field: ${field.name} (Key: ${field.key}, Type: ${field.field_type})`);
        if (field.options && field.options.length > 0) {
          console.log(`    Options: ${field.options.map(opt => `${opt.label} (ID: ${opt.id})`).join(', ')}`);
        }
      });
    } else {
      console.error('Failed to get custom fields:', customFieldsResult.error);
    }

    // Get organization custom fields
    console.log('\n🏢 Organization Custom Fields:');
    const orgCustomFieldsResult = await pipedriveService.getOrganizationCustomFields();
    
    if (orgCustomFieldsResult.success && orgCustomFieldsResult.fields) {
      orgCustomFieldsResult.fields.forEach(field => {
        console.log(`  Field: ${field.name} (Key: ${field.key}, Type: ${field.field_type})`);
        if (field.options && field.options.length > 0) {
          console.log(`    Options: ${field.options.map(opt => `${opt.label} (ID: ${opt.id})`).join(', ')}`);
        }
      });
    } else {
      console.error('Failed to get organization custom fields:', orgCustomFieldsResult.error);
    }

  } catch (error) {
    console.error('Error checking Pipedrive fields:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPipedriveFields(); 